/**
 * Flashcard parser module
 * 
 * This module provides functionality to parse markdown text and extract flashcards
 * in various formats: inline (::), multiline (?), reversed, and cloze deletions.
 * 
 * @module parser
 */

// Re-export types
export { ParsedQuestionInfo, ParserOptions } from "./types";

// Re-export utilities
export { debugParser, setDebugParser, markerInsideCodeBlock, hasInlineMarker } from "./utils";

// Re-export main parse function
export { parse } from "./parse";

// Re-export individual parsers for direct use
export { InlineCardParser } from "./inline/InlineCardParser";
export { MultilineCardParser } from "./multiline/MultilineCardParser";
export { ClozeCardParser } from "./cloze/ClozeCardParser";

// Re-export header-based parser
export { HeaderBasedCardParser, HeaderBasedCardParserOptions } from "./header-based/HeaderBasedCardParser";
export { HeadingExtractor } from "./header-based/HeadingExtractor";
export { HeadingMatcher } from "./header-based/HeadingMatcher";
export { ContentBoundaryDetector } from "./header-based/ContentBoundaryDetector";
export { mergeConfigs } from "./header-based/config";
export { HeaderCardConfig, HeadingInfo, ContentBoundary } from "./header-based/types";
