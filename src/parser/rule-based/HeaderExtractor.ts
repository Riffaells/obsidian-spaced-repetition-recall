/**
 * HeaderExtractor
 *
 * Extracts flashcards from markdown headings based on HeaderConfig rules.
 * Implements heading level filtering, priority logic, limit strategies,
 * content scope extraction, and formatting options.
 *
 * @module parser/rule-based/HeaderExtractor
 */

import { HeaderConfig, HeadingNode, ExtractedCard, ExtractionContext, HeaderLimit } from "./types";

/**
 * Extracts flashcards from document headings
 */
export class HeaderExtractor {
    /**
     * Extract flashcards from headings based on configuration
     *
     * @param headings - Flat list of all headings in the document
     * @param config - Header extraction configuration
     * @param context - Extraction context with metadata
     * @returns Array of extracted flashcards
     */
    extract(
        headings: HeadingNode[],
        config: HeaderConfig,
        context: ExtractionContext,
    ): ExtractedCard[] {
        // Step 1: Filter headings by level
        let filteredHeadings = this.filterByLevel(headings, config.selection.levels);

        // Step 2: Apply strict priority if enabled
        if (config.selection.strictPriority) {
            filteredHeadings = this.applyStrictPriority(filteredHeadings);
        }

        // Step 3: Apply limit strategy if specified
        if (config.selection.limit) {
            filteredHeadings = this.applyLimit(filteredHeadings, config.selection.limit);
        }

        // Step 4: Extract cards from selected headings
        const cards: ExtractedCard[] = [];
        for (const heading of filteredHeadings) {
            const card = this.extractCardFromHeading(heading, config, context);
            if (card) {
                cards.push(card);
            }
        }

        return cards;
    }

    /**
     * Filter headings by specified levels
     *
     * @param headings - All headings
     * @param levels - Allowed heading levels (1-6)
     * @returns Filtered headings
     */
    private filterByLevel(headings: HeadingNode[], levels: number[]): HeadingNode[] {
        return headings.filter((heading) => levels.includes(heading.level));
    }

    /**
     * Apply strict priority logic: only keep headings at the highest level present
     *
     * Example: If H1 exists, ignore H2 and H3. If no H1, look for H2.
     *
     * @param headings - Filtered headings
     * @returns Headings at the highest level only
     */
    private applyStrictPriority(headings: HeadingNode[]): HeadingNode[] {
        if (headings.length === 0) {
            return [];
        }

        // Find the minimum level (highest priority)
        const minLevel = Math.min(...headings.map((h) => h.level));

        // Return only headings at that level
        return headings.filter((h) => h.level === minLevel);
    }

    /**
     * Apply limit strategy to select a subset of headings
     *
     * @param headings - Filtered headings
     * @param limit - Limit strategy configuration
     * @returns Limited selection of headings
     */
    private applyLimit(headings: HeadingNode[], limit: HeaderLimit): HeadingNode[] {
        if (headings.length === 0) {
            return [];
        }

        switch (limit.type) {
            case "count":
                return this.applyCountLimit(headings, limit.mode, limit.count);

            case "range":
                return this.applyRangeLimit(headings, limit.start, limit.end);

            case "random":
                return this.applyRandomLimit(headings, limit.count);

            default:
                // TypeScript exhaustiveness check
                const _exhaustive: never = limit;
                return headings;
        }
    }

    /**
     * Apply count limit (first N or last N)
     *
     * @param headings - Headings to limit
     * @param mode - "first" or "last"
     * @param count - Number of headings to select
     * @returns Limited headings
     */
    private applyCountLimit(
        headings: HeadingNode[],
        mode: "first" | "last",
        count: number,
    ): HeadingNode[] {
        if (mode === "first") {
            return headings.slice(0, count);
        } else {
            return headings.slice(-count);
        }
    }

    /**
     * Apply range limit (positions start to end, 1-indexed)
     *
     * @param headings - Headings to limit
     * @param start - Start position (1-indexed, inclusive)
     * @param end - End position (1-indexed, inclusive)
     * @returns Headings in the specified range
     */
    private applyRangeLimit(headings: HeadingNode[], start: number, end: number): HeadingNode[] {
        // Convert 1-indexed to 0-indexed
        const startIdx = Math.max(0, start - 1);
        const endIdx = Math.min(headings.length, end);

        return headings.slice(startIdx, endIdx);
    }

    /**
     * Apply random limit (select N random headings)
     *
     * @param headings - Headings to limit
     * @param count - Number of random headings to select
     * @returns Randomly selected headings
     */
    private applyRandomLimit(headings: HeadingNode[], count: number): HeadingNode[] {
        if (count >= headings.length) {
            return [...headings];
        }

        // Fisher-Yates shuffle to select random subset
        const shuffled = [...headings];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Return first N items, but maintain original order
        const selected = shuffled.slice(0, count);
        return selected.sort((a, b) => a.lineNumber - b.lineNumber);
    }

    /**
     * Extract a flashcard from a single heading
     *
     * @param heading - The heading to extract from
     * @param config - Header extraction configuration
     * @param context - Extraction context
     * @returns Extracted card or null if no content
     */
    private extractCardFromHeading(
        heading: HeadingNode,
        config: HeaderConfig,
        context: ExtractionContext,
    ): ExtractedCard | null {
        // Extract content based on scope
        let content = this.extractContent(heading, config);

        // Skip if no content
        if (!content || content.trim().length === 0) {
            return null;
        }

        // Apply formatting options
        if (config.content.stripTags) {
            content = this.stripTags(content);
        }

        // Build headers path
        const headersPath = [...context.headersPath, heading.text];

        return {
            front: heading.text,
            back: content,
            lineNumber: heading.lineNumber,
            headersPath,
        };
    }

    /**
     * Extract content from a heading based on scope configuration
     *
     * @param heading - The heading to extract content from
     * @param config - Header extraction configuration
     * @returns Extracted content
     */
    private extractContent(heading: HeadingNode, config: HeaderConfig): string {
        let content = heading.content;

        if (config.content.scope === "first-paragraph") {
            // Extract only until the first blank line
            content = this.extractFirstParagraph(content);
        }

        // Handle subheaders
        if (!config.content.includeSubheaders) {
            // Remove subheadings from content
            content = this.removeSubheaders(content);
        }

        return content;
    }

    /**
     * Extract content until the first blank line
     *
     * @param content - Full content text
     * @returns Content up to first blank line
     */
    private extractFirstParagraph(content: string): string {
        const lines = content.split("\n");
        const paragraphLines: string[] = [];

        for (const line of lines) {
            if (line.trim() === "") {
                break;
            }
            paragraphLines.push(line);
        }

        return paragraphLines.join("\n");
    }

    /**
     * Remove subheadings from content
     *
     * @param content - Content that may contain subheadings
     * @returns Content with subheadings removed
     */
    private removeSubheaders(content: string): string {
        const lines = content.split("\n");
        const filteredLines: string[] = [];

        for (const line of lines) {
            // Skip lines that are headings
            if (line.match(/^#{1,6}\s+/)) {
                continue;
            }
            filteredLines.push(line);
        }

        return filteredLines.join("\n");
    }

    /**
     * Strip HTML and Markdown formatting from text
     *
     * Removes:
     * - HTML tags: <tag>content</tag>
     * - Bold: **text** or __text__
     * - Italic: *text* or _text_
     * - Code: `code`
     * - Links: [text](url)
     * - Images: ![alt](url)
     *
     * @param text - Text with formatting
     * @returns Plain text
     */
    private stripTags(text: string): string {
        let result = text;

        // Remove HTML tags
        result = result.replace(/<[^>]+>/g, "");

        // Remove images: ![alt](url)
        result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

        // Remove links: [text](url) -> text
        result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

        // Remove bold: **text** or __text__
        result = result.replace(/\*\*([^*]+)\*\*/g, "$1");
        result = result.replace(/__([^_]+)__/g, "$1");

        // Remove italic: *text* or _text_
        result = result.replace(/\*([^*]+)\*/g, "$1");
        result = result.replace(/_([^_]+)_/g, "$1");

        // Remove inline code: `code`
        result = result.replace(/`([^`]+)`/g, "$1");

        return result;
    }
}
