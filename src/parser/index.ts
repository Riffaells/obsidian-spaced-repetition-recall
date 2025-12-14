/**
 * Flashcard parser module
 *
 * This module provides functionality to parse markdown text and extract flashcards
 * in various formats: inline (::), multiline (?), reversed, and cloze deletions.
 *
 * @module parser
 */

// Re-export utilities
export { setDebugParser } from "./utils";

// Re-export rule-based parser
export { RuleBasedParser, type NoteContext } from "./rule-based/RuleBasedParser";
export * from "./rule-based";
