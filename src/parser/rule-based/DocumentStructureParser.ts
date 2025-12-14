/**
 * DocumentStructureParser
 *
 * Parses markdown documents to extract structural information including:
 * - Heading hierarchy
 * - Code block ranges
 * - HTML comment ranges
 * - Obsidian tags
 *
 * @module parser/rule-based/DocumentStructureParser
 */

import { DocumentStructure, HeadingNode, Range } from "src/parser";

/**
 * Parses a markdown document and extracts its structural elements
 */
export class DocumentStructureParser {
    /**
     * Parse a markdown document and return its structure
     *
     * @param text - The markdown text to parse
     * @returns DocumentStructure containing headings, tags, code blocks, and HTML comments
     */
    static parse(text: string): DocumentStructure {
        const lines = text.split("\n");

        // Extract structural elements
        const codeBlocks = DocumentStructureParser.extractCodeBlocks(lines);
        const htmlComments = DocumentStructureParser.extractHtmlComments(lines);
        const tags = DocumentStructureParser.extractTags(text);
        const flatHeadings = DocumentStructureParser.extractHeadings(
            lines,
            codeBlocks,
            htmlComments,
        );
        const headings = DocumentStructureParser.buildHeadingTree(flatHeadings);

        return {
            headings,
            flatHeadings,
            tags,
            codeBlocks,
            htmlComments,
        };
    }

    /**
     * Extract code block ranges from the document
     * Handles both ``` and ~~~ delimiters
     *
     * @param lines - Array of text lines
     * @returns Array of Range objects representing code blocks
     */
    private static extractCodeBlocks(lines: string[]): Range[] {
        const codeBlocks: Range[] = [];
        let inCodeBlock = false;
        let blockStart = -1;
        let delimiter = "";

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!inCodeBlock) {
                // Check for code block start
                if (line.startsWith("```") || line.startsWith("~~~")) {
                    inCodeBlock = true;
                    blockStart = i;
                    delimiter = line.startsWith("```") ? "```" : "~~~";
                }
            } else {
                // Check for code block end (must match the opening delimiter)
                if (line.startsWith(delimiter)) {
                    codeBlocks.push({ start: blockStart, end: i });
                    inCodeBlock = false;
                    blockStart = -1;
                    delimiter = "";
                }
            }
        }

        // Handle unclosed code block (extends to end of document)
        if (inCodeBlock && blockStart !== -1) {
            codeBlocks.push({ start: blockStart, end: lines.length - 1 });
        }

        return codeBlocks;
    }

    /**
     * Extract HTML comment ranges from the document
     * Excludes <!--SR: scheduling comments
     *
     * @param lines - Array of text lines
     * @returns Array of Range objects representing HTML comments
     */
    private static extractHtmlComments(lines: string[]): Range[] {
        const comments: Range[] = [];
        let inComment = false;
        let commentStart = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (!inComment) {
                // Check for comment start
                const commentStartMatch = line.match(/<!--/);
                if (commentStartMatch) {
                    // Skip SR scheduling comments
                    if (line.includes("<!--SR:")) {
                        continue;
                    }

                    inComment = true;
                    commentStart = i;

                    // Check if comment closes on the same line
                    if (line.includes("-->")) {
                        comments.push({ start: commentStart, end: i });
                        inComment = false;
                        commentStart = -1;
                    }
                }
            } else {
                // Check for comment end
                if (line.includes("-->")) {
                    comments.push({ start: commentStart, end: i });
                    inComment = false;
                    commentStart = -1;
                }
            }
        }

        // Handle unclosed comment (extends to end of document)
        if (inComment && commentStart !== -1) {
            comments.push({ start: commentStart, end: lines.length - 1 });
        }

        return comments;
    }

    /**
     * Extract Obsidian tags from the document
     * Tags are in the format #tag or #tag/subtag
     *
     * @param text - The full document text
     * @returns Array of unique tags found in the document
     */
    private static extractTags(text: string): string[] {
        const tagSet = new Set<string>();

        // Regex to match Obsidian tags: #word or #word/word/word
        // Tags can contain letters, numbers, underscores, hyphens, and forward slashes
        const tagRegex = /#[\w\-]+(?:\/[\w\-]+)*/g;

        const matches = text.matchAll(tagRegex);
        for (const match of matches) {
            tagSet.add(match[0]);
        }

        return Array.from(tagSet);
    }

    /**
     * Extract headings from the document
     * Skips headings inside code blocks and HTML comments
     *
     * @param lines - Array of text lines
     * @param codeBlocks - Code block ranges to skip
     * @param htmlComments - HTML comment ranges to skip
     * @returns Array of HeadingNode objects (flat list)
     */
    private static extractHeadings(
        lines: string[],
        codeBlocks: Range[],
        htmlComments: Range[],
    ): HeadingNode[] {
        const headings: HeadingNode[] = [];

        for (let i = 0; i < lines.length; i++) {
            // Skip if line is inside a code block or HTML comment
            if (
                DocumentStructureParser.isLineInRange(i, codeBlocks) ||
                DocumentStructureParser.isLineInRange(i, htmlComments)
            ) {
                continue;
            }

            const line = lines[i];
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

            if (headingMatch) {
                const level = headingMatch[1].length;
                const text = headingMatch[2].trim();

                // Extract content for this heading (until next heading of equal or higher level)
                const content = DocumentStructureParser.extractHeadingContent(
                    lines,
                    i + 1,
                    level,
                    codeBlocks,
                    htmlComments,
                );

                headings.push({
                    level,
                    text,
                    lineNumber: i,
                    children: [],
                    content,
                });
            }
        }

        return headings;
    }

    /**
     * Extract content under a heading until the next heading of equal or higher level
     *
     * @param lines - Array of text lines
     * @param startLine - Line to start extracting from
     * @param headingLevel - Level of the parent heading
     * @param codeBlocks - Code block ranges (content is still included, just not parsed)
     * @param htmlComments - HTML comment ranges (content is excluded)
     * @returns The content text
     */
    private static extractHeadingContent(
        lines: string[],
        startLine: number,
        headingLevel: number,
        codeBlocks: Range[],
        htmlComments: Range[],
    ): string {
        const contentLines: string[] = [];

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];

            // Check if we've hit another heading of equal or higher level
            // (but not if it's inside a code block or comment)
            if (
                !DocumentStructureParser.isLineInRange(i, codeBlocks) &&
                !DocumentStructureParser.isLineInRange(i, htmlComments)
            ) {
                const headingMatch = line.match(/^(#{1,6})\s+/);
                if (headingMatch && headingMatch[1].length <= headingLevel) {
                    break;
                }
            }

            // Skip lines inside HTML comments
            if (DocumentStructureParser.isLineInRange(i, htmlComments)) {
                continue;
            }

            contentLines.push(line);
        }

        return contentLines.join("\n").trim();
    }

    /**
     * Check if a line number falls within any of the given ranges
     *
     * @param lineNumber - The line number to check
     * @param ranges - Array of ranges to check against
     * @returns True if the line is within any range
     */
    private static isLineInRange(lineNumber: number, ranges: Range[]): boolean {
        return ranges.some((range) => lineNumber >= range.start && lineNumber <= range.end);
    }

    /**
     * Build a hierarchical tree of headings from a flat list
     *
     * @param flatHeadings - Flat array of HeadingNode objects
     * @returns Hierarchical array of HeadingNode objects
     */
    private static buildHeadingTree(flatHeadings: HeadingNode[]): HeadingNode[] {
        if (flatHeadings.length === 0) {
            return [];
        }

        const root: HeadingNode[] = [];
        const stack: HeadingNode[] = [];

        for (const heading of flatHeadings) {
            // Pop from stack until we find a heading with lower level (parent)
            while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
                stack.pop();
            }

            if (stack.length === 0) {
                // This is a top-level heading
                root.push(heading);
            } else {
                // Add as child to the last heading in stack
                stack[stack.length - 1].children.push(heading);
            }

            // Add current heading to stack
            stack.push(heading);
        }

        return root;
    }
}
