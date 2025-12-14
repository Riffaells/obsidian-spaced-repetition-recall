/**
 * Internal data structures for document parsing
 *
 * @module parser/rule-based/types/document-structure
 */

/**
 * Represents a heading in the document with its metadata
 */
export interface HeadingNode {
    /** Heading level (1-6) */
    level: number;

    /** The text content of the heading (without # markers) */
    text: string;

    /** Line number where this heading appears (0-indexed) */
    lineNumber: number;

    /** Child headings nested under this heading */
    children: HeadingNode[];

    /** Text content under this heading (until next heading of equal or higher level) */
    content: string;
}

/**
 * Represents a range in the document (for code blocks, comments, etc.)
 */
export interface Range {
    /** Starting line number (0-indexed, inclusive) */
    start: number;

    /** Ending line number (0-indexed, inclusive) */
    end: number;
}

/**
 * Represents the hierarchical structure of a document
 */
export interface DocumentStructure {
    /** Hierarchical tree of headings */
    headings: HeadingNode[];

    /** Flattened list of all headings for easy iteration */
    flatHeadings: HeadingNode[];

    /**
     * All Obsidian tags found in the document using regex parsing.
     * @deprecated Prefer using Obsidian's metadataCache.getFileCache() and getAllTags()
     * for more reliable tag extraction (includes frontmatter tags).
     */
    tags: string[];

    /** Ranges of code blocks (``` and ~~~) that should be skipped during parsing */
    codeBlocks: Range[];

    /** Ranges of HTML comments (<!-- -->) that should be skipped (except <!--SR: comments) */
    htmlComments: Range[];
}

/**
 * Context information passed to extractors during parsing
 */
export interface ExtractionContext {
    /** Line number offset for calculating absolute line numbers */
    lineOffset: number;

    /** Hierarchical path of parent headings */
    headersPath: string[];

    /** Whether to skip content inside code blocks */
    skipCodeBlocks: boolean;

    /** Whether to skip content inside HTML comments */
    skipHtmlComments: boolean;
}
