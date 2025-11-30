/**
 * Flashcard parser module
 * 
 * This module provides functionality to parse markdown text and extract flashcards
 * in various formats: inline (::), multiline (?), reversed, and cloze deletions.
 * 
 * This file re-exports from the new modular parser structure in src/parser/
 * for backward compatibility.
 * 
 * @module parser
 */

// Re-export everything from the new parser module structure
export {
    // Types
    ParsedQuestionInfo,
    ParserOptions,
    
    // Utilities
    debugParser,
    setDebugParser,
    
    // Main parse function
    parse,
} from "./parser/index";
