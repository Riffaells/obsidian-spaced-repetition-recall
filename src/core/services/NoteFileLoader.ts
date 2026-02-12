import { ISRFile } from "./SRFile";
import { Note } from "../models/Note";
import { Question, CardType } from "../models/Question";
import { Card } from "../models/Card";
import { TopicPath } from "./TopicPath";
import { SRSettings } from "../../settings/settings";
import { TextDirection } from "../../utils/TextDirection";
import { RuleBasedParser, NoteContext } from "../../parser/rule-based/RuleBasedParser";
import { ParsedFlashcard, FlashcardRule, RuleId } from "../../parser/rule-based/types";
import { deriveCardType } from "../../parser/ParserUtils";
import { Logger } from "../../utils/Logger";
import { handleError } from "../../utils/ErrorHandler";

const logger = Logger.create("NoteFileLoader");

export class NoteFileLoader {
    fileText: string;
    fixesMade: boolean;
    noteTopicPath: TopicPath;
    noteFile: ISRFile;
    settings: SRSettings;

    constructor(settings: SRSettings) {
        this.settings = settings;
    }

    /**
     * Find a flashcard rule by its ID.
     *
     * @param ruleId - The ID of the rule to find
     * @returns The matching rule or null if not found
     *
     * Requirements: 3.1
     */
    private findRuleById(ruleId: RuleId): FlashcardRule | null {
        const rule = this.settings.flashcardRules.find((r) => r.id === ruleId);
        if (!rule) {
            logger.warn("Rule not found", { ruleId });
        }
        return rule || null;
    }

    /**
     * Convert parsed flashcards to Question objects.
     *
     * @param flashcards - Array of parsed flashcards from RuleBasedParser
     * @param noteFile - The note file containing these flashcards
     * @param textDirection - Text direction (LTR or RTL)
     * @param folderTopicPath - Topic path from folder structure
     * @param onlyKeepQuestionsWithTopicPath - Whether to filter by topic path
     * @returns Array of Question objects
     *
     * Requirements: 3.2, 3.3, 3.4
     */
    private createQuestionListFromFlashcards(
        flashcards: ParsedFlashcard[],
        noteFile: ISRFile,
        textDirection: TextDirection,
        folderTopicPath: TopicPath,
        onlyKeepQuestionsWithTopicPath: boolean,
    ): Question[] {
        const questions: Question[] = [];

        for (const flashcard of flashcards) {
            // Filter by topic path if needed
            // Note: Cards with only #flashcards tag are now allowed and will go to default deck
            if (onlyKeepQuestionsWithTopicPath) {
                const hasSubdeckTag = flashcard.tags.some(
                    (tag) => tag.startsWith("#") && tag !== "#flashcards",
                );
                const hasFlashcardsTag = flashcard.tags.some((tag) => tag === "#flashcards");
                const hasFolderPath = folderTopicPath && folderTopicPath.hasPath;
                
                // Skip only if there's no way to assign a deck:
                // - No subdeck tags (like #flashcards/math)
                // - No base #flashcards tag
                // - No folder-based deck
                if (!hasSubdeckTag && !hasFlashcardsTag && !hasFolderPath) {
                    continue;
                }
            }

            // Find the rule that created this flashcard
            const rule = this.findRuleById(flashcard.ruleId);
            if (!rule) {
                logger.warn("Rule not found for flashcard", {
                    ruleId: flashcard.ruleId,
                    lineNumber: flashcard.context.lineNumber,
                    filePath: noteFile.path,
                });
                continue;
            }

            // Derive card type
            const cardType = deriveCardType(flashcard, rule);

            // Create Question
            const question = Question.Create(
                this.settings,
                flashcard,
                cardType,
                rule,
                noteFile,
                textDirection,
                folderTopicPath,
            );

            // Create cards based on card type
            const cards: Card[] = [];

            // For now, we assume standard card creation logic.
            // This logic should ideally be centralized, but for fixing the runtime error:

            if (cardType === CardType.Cloze) {
                // For cloze, we need to determine how many clozes there are.
                // The ParsedFlashcard metadata might have this info, or we need to parse the text.
                // ParsedFlashcard has metadata.clozeIndex, but that's for a specific cloze card if split?
                // Actually, ParsedFlashcard represents a single flashcard (front/back).
                // But for Cloze, a single line might generate multiple cards.
                // However, the parser returns ParsedFlashcard[], so maybe each cloze is already a separate ParsedFlashcard?
                // If so, we just create one Card per ParsedFlashcard.

                // Let's assume 1-to-1 mapping for now as a safe default to prevent empty cards.
                const card = new Card({
                    question: question,
                    cardIdx: 0,
                    front: flashcard.front,
                    back: flashcard.back,
                });
                cards.push(card);
            } else if (
                cardType === CardType.SingleLineReversed ||
                cardType === CardType.MultiLineReversed
            ) {
                // Reversed cards create two cards: Front->Back and Back->Front
                const card1 = new Card({
                    question: question,
                    cardIdx: 0,
                    front: flashcard.front,
                    back: flashcard.back,
                });
                cards.push(card1);

                const card2 = new Card({
                    question: question,
                    cardIdx: 1,
                    front: flashcard.back,
                    back: flashcard.front,
                });
                cards.push(card2);
            } else {
                // Basic cards
                const card = new Card({
                    question: question,
                    cardIdx: 0,
                    front: flashcard.front,
                    back: flashcard.back,
                });
                cards.push(card);
            }

            // Set the cards on the question
            question.setCardList(cards);

            questions.push(question);
        }

        return questions;
    }

    /**
     * Load a note using the RuleBasedParser.
     *
     * @param noteFile - The note file to load
     * @param defaultTextDirection - Default text direction (LTR or RTL)
     * @param folderTopicPath - Topic path from folder structure
     * @returns A Note object or null if loading fails
     *
     * Requirements: 3.1, 3.2, 3.3
     */
    async load(
        noteFile: ISRFile,
        defaultTextDirection: TextDirection,
        folderTopicPath: TopicPath,
    ): Promise<Note | null> {
        try {
            // Create RuleBasedParser with settings.flashcardRules
            const parser = new RuleBasedParser(this.settings.flashcardRules);

            // Read note text from file
            const noteText = await noteFile.read();

            // Extract tags from Obsidian's metadata cache (more reliable than regex)
            const tags = noteFile.getAllTagsFromCache();

            // Create NoteContext
            const noteContext: NoteContext = {
                filePath: noteFile.path || "",
                fileName: noteFile.basename || "",
                text: noteText,
                tags: tags,
                folderPath: (noteFile.path || "").split("/").slice(0, -1).join("/"),
            };

            // Call parser.parse(noteContext) to get ParsedFlashcard[]
            const flashcards = parser.parse(noteContext);

            logger.debug("Parsed flashcards from note", {
                filePath: noteFile.path,
                flashcardCount: flashcards.length,
            });

            // Call createQuestionListFromFlashcards() to convert to Question[]
            const onlyKeepQuestionsWithTopicPath = true;
            const questionList = this.createQuestionListFromFlashcards(
                flashcards,
                noteFile,
                defaultTextDirection,
                folderTopicPath,
                onlyKeepQuestionsWithTopicPath,
            );

            // Return new Note(noteFile, questionList)
            const note = new Note(noteFile, questionList);
            note.parsedFlashcards = flashcards;
            return note;
        } catch (error) {
            handleError(error, `Failed to load note with new parser: ${noteFile.path}`, {
                logLevel: "error",
            });
            return null;
        }
    }

    /**
     * Reconstitute a Note from cached flashcards.
     *
     * @param noteFile - The note file
     * @param flashcards - Array of cached flashcards
     * @param defaultTextDirection - Default text direction
     * @param folderTopicPath - Topic path from folder structure
     * @returns A Note object
     */
    reconstituteNote(
        noteFile: ISRFile,
        flashcards: ParsedFlashcard[],
        defaultTextDirection: TextDirection,
        folderTopicPath: TopicPath,
    ): Note {
        const onlyKeepQuestionsWithTopicPath = true;
        const questionList = this.createQuestionListFromFlashcards(
            flashcards,
            noteFile,
            defaultTextDirection,
            folderTopicPath,
            onlyKeepQuestionsWithTopicPath,
        );

        const note = new Note(noteFile, questionList);
        note.parsedFlashcards = flashcards;
        return note;
    }
}
