import { ParsedQuestionInfo } from "../types";
import { CardType } from "../../Question";
import { HeadingExtractor } from "./HeadingExtractor";
import { HeadingMatcher } from "./HeadingMatcher";
import { ContentBoundaryDetector } from "./ContentBoundaryDetector";
import { QAFormatParser } from "./QAFormatParser";
import { PositionalSelectorUtil } from "./PositionalSelector";
import { TagResolver, generatePredefinedTags } from "./TagResolver";
import { 
    HeaderCardConfig,
    HeadingInfo, 
    ContentBoundary, 
    ResolvedTagConfig,
    QAContent 
} from "./types";

/**
 * Options for HeaderBasedCardParser
 */
export interface HeaderBasedCardParserOptions {
    /** Whether header-based cards are enabled globally */
    enableHeaderCards: boolean;
    
    /** Map of predefined tag names to their configurations */
    predefinedTags?: Map<string, HeaderCardConfig>;
    
    /** Custom tag configurations (tag -> config) */
    customTags: Map<string, HeaderCardConfig>;
    
    /** Whether to show heading context in cards */
    showContext?: boolean;
    
    /** Default configuration when no tags are present (legacy support) */
    defaultConfig?: HeaderCardConfig;
}

/**
 * Default base configuration used when no specific configuration is provided
 */
const DEFAULT_BASE_CONFIG: HeaderCardConfig = {
    headingLevels: [2],
    nestingMode: "nested",
    mode: "qa",
    enabled: true,
};

/**
 * Parses header-based flashcards from markdown notes.
 * 
 * Header-based flashcards use markdown headings as questions and the content
 * below them as answers. Configuration is determined by tags in the note.
 * 
 * This parser integrates:
 * - TagResolver: Parses and resolves tags from notes
 * - HeadingExtractor: Extracts markdown headings
 * - HeadingMatcher: Filters headings based on configuration
 * - PositionalSelector: Applies positional selectors (first-N, last-N, nth-N)
 * - ContentBoundaryDetector: Determines answer boundaries
 * - QAFormatParser: Parses extended QA format under headings
 * 
 * @module parser/header-based/HeaderBasedCardParser
 */
export class HeaderBasedCardParser {
    private options: HeaderBasedCardParserOptions;
    private tagResolver: TagResolver;
    private headingExtractor: HeadingExtractor;
    private headingMatcher: HeadingMatcher;
    private contentBoundaryDetector: ContentBoundaryDetector;
    private qaFormatParser: QAFormatParser;
    private baseConfig: HeaderCardConfig;
    
    constructor(options: HeaderBasedCardParserOptions) {
        this.options = options;
        
        // Determine base configuration
        this.baseConfig = options.defaultConfig || DEFAULT_BASE_CONFIG;
        
        // Generate predefined tags if not provided
        const predefinedTags = options.predefinedTags || generatePredefinedTags(this.baseConfig);
        
        // Initialize TagResolver
        this.tagResolver = new TagResolver(
            predefinedTags,
            options.customTags,
            this.baseConfig
        );
        
        // Initialize other components
        this.headingExtractor = new HeadingExtractor();
        this.headingMatcher = new HeadingMatcher();
        this.contentBoundaryDetector = new ContentBoundaryDetector();
        this.qaFormatParser = new QAFormatParser();
    }
    
    /**
     * Parses a note and returns header-based flashcards.
     * 
     * @param noteText - The full text of the note
     * @param noteTags - Array of tags present in the note (e.g., ["#flashcards/h2", "#flashcards/nested"])
     * @param noteLines - Array of lines from the note
     * @returns Array of ParsedQuestionInfo objects representing header-based cards
     */
    parse(
        noteText: string,
        noteTags: string[],
        noteLines: string[]
    ): ParsedQuestionInfo[] {
        // If header cards are disabled globally, return empty array
        if (!this.options.enableHeaderCards) {
            return [];
        }
        
        // Resolve configuration based on note tags using TagResolver
        let resolvedConfig = this.tagResolver.resolve(noteTags);
        
        // Check if any tags were actually matched by the resolver
        // If no tags matched (headingLevels is from baseConfig and enabled is false),
        // use the base config as fallback for backward compatibility
        const noTagsMatched = !resolvedConfig.enabled && 
            resolvedConfig.headingLevels.length === this.baseConfig.headingLevels.length &&
            resolvedConfig.headingLevels.every((level, i) => level === this.baseConfig.headingLevels[i]) &&
            resolvedConfig.positionalSelectors.length === 0;
        
        if (noTagsMatched && this.baseConfig.enabled) {
            resolvedConfig = {
                headingLevels: this.baseConfig.headingLevels,
                mode: this.baseConfig.mode,
                nestingMode: this.baseConfig.nestingMode,
                positionalSelectors: [],
                enabled: true,
            };
        }
        
        // If config is still disabled, return empty array
        if (!resolvedConfig.enabled) {
            return [];
        }
        
        // Extract all headings from the note
        const allHeadings = this.headingExtractor.extractHeadings(noteLines, true, true);
        
        // Create a HeaderCardConfig from ResolvedTagConfig for HeadingMatcher
        const matcherConfig: HeaderCardConfig = {
            headingLevels: resolvedConfig.headingLevels,
            nestingMode: resolvedConfig.nestingMode,
            mode: resolvedConfig.mode,
            enabled: resolvedConfig.enabled,
        };
        
        // Filter headings based on configuration
        let matchedHeadings = this.headingMatcher.matchHeadings(allHeadings, matcherConfig);
        
        // Apply positional selectors if any
        if (resolvedConfig.positionalSelectors.length > 0) {
            matchedHeadings = PositionalSelectorUtil.applySelectors(
                matchedHeadings,
                resolvedConfig.positionalSelectors
            );
        }
        
        // Convert each matched heading to a ParsedQuestionInfo
        const result: ParsedQuestionInfo[] = [];
        for (const heading of matchedHeadings) {
            const parsedQuestion = this.createCardFromHeading(
                heading,
                allHeadings,
                noteLines,
                resolvedConfig
            );
            
            if (parsedQuestion) {
                result.push(parsedQuestion);
            }
        }
        
        return result;
    }
    
    /**
     * Creates a flashcard from a heading.
     * 
     * This method determines whether to use standard format or QA format
     * based on the content under the heading.
     * 
     * @param heading - The heading to convert
     * @param allHeadings - All headings in the note (for boundary detection)
     * @param noteLines - All lines in the note
     * @param config - The resolved configuration
     * @returns ParsedQuestionInfo or null if the heading cannot be converted
     */
    private createCardFromHeading(
        heading: HeadingInfo,
        allHeadings: HeadingInfo[],
        noteLines: string[],
        config: ResolvedTagConfig
    ): ParsedQuestionInfo | null {
        // Detect content boundaries for the answer
        const boundary = this.contentBoundaryDetector.detectBoundary(
            heading,
            allHeadings,
            noteLines,
            config.nestingMode
        );
        
        // Standard format: heading is the question, content below is the answer
        return this.createStandardCard(heading, boundary, noteLines);
    }
    
    /**
     * Creates a standard header-based flashcard.
     * 
     * Standard format: heading text is the question, content below is the answer.
     * 
     * @param heading - The heading to convert
     * @param boundary - Content boundary for the answer
     * @param noteLines - All lines in the note
     * @returns ParsedQuestionInfo
     */
    private createStandardCard(
        heading: HeadingInfo,
        boundary: ContentBoundary,
        noteLines: string[]
    ): ParsedQuestionInfo {
        // Build the card text in the format: "question\n?\nanswer"
        // This matches the MultiLineBasic format used by the existing parser
        const questionText = heading.text;
        const answerLines = noteLines.slice(boundary.startLine, boundary.endLine + 1);
        const answerText = answerLines.join("\n").trim();
        
        // Format as multiline card: question, separator, answer
        const cardText = `${questionText}\n?\n${answerText}`;
        
        // Create ParsedQuestionInfo
        // firstLineNum is the heading line, lastLineNum is the end of the answer
        const parsedQuestion = new ParsedQuestionInfo(
            CardType.MultiLineBasic,
            cardText,
            heading.lineNumber,
            boundary.endLine
        );
        
        // Mark as header-based and add context
        parsedQuestion.isHeaderBased = true;
        parsedQuestion.headingContext = heading.context;
        
        return parsedQuestion;
    }
    
    /**
     * Creates a QA format flashcard.
     * 
     * QA format: question text (ending with "?") is under the heading,
     * followed by the answer text.
     * 
     * @param heading - The heading containing the card
     * @param qaContent - Parsed QA content
     * @param noteLines - All lines in the note
     * @returns ParsedQuestionInfo
     */
    private createQAFormatCard(
        heading: HeadingInfo,
        qaContent: QAContent,
        noteLines: string[]
    ): ParsedQuestionInfo {
        // Format as multiline card: question, separator, answer
        const cardText = `${qaContent.question}\n?\n${qaContent.answer}`;
        
        // Create ParsedQuestionInfo
        // firstLineNum is the question line, lastLineNum is the end of the answer
        const parsedQuestion = new ParsedQuestionInfo(
            CardType.MultiLineBasic,
            cardText,
            qaContent.questionLineStart,
            qaContent.answerLineEnd
        );
        
        // Mark as header-based and add context
        // For QA format, include the heading text in the context
        parsedQuestion.isHeaderBased = true;
        parsedQuestion.headingContext = [...heading.context, heading.text];
        
        return parsedQuestion;
    }
}
