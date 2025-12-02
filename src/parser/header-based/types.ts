/**
 * Type definitions for header-based flashcard parsing
 * 
 * @module parser/header-based/types
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Уникальный идентификатор правила.
 */
export type RuleId = string;

/**
 * Типы селекторов для позиционирования.
 * Убираем неоднозначность строк типа "last-2".
 */
export type PositionalSelector =
    | { type: "first"; count: number }          // Первые N (напр. first: 3)
    | { type: "last"; count: number }           // Последние N (напр. last: 2)
    | { type: "nth"; index: number }            // Конкретный по порядку (1-based)
    | { type: "nthFromEnd"; offset: number };   // Конкретный с конца (0 = последний)

/**
 * Основное правило конфигурации (то, что храним в data.json).
 * Полностью сериализуемо (никаких RegExp объектов).
 */
export interface FlashcardTagRule {
    id: RuleId;
    name: string;               // Для отображения в UI (напр. "Exam Mode")
    enabled: boolean;
    priority: number;           // 0 - default, 100 - override. Для разрешения конфликтов.

    // --- Matching Strategy ---
    // Либо точное совпадение тега, либо Regex-строка
    tagExact?: string;          // Напр: "#flashcards/exam"
    tagPattern?: string;        // Напр: "^#flashcards/.*" (храним как строку!)
    patternFlags?: string;      // Напр: "i"

    // --- Content Extraction Rules ---
    source: "header" | "inline" | "multiline";

    // Настройки для header-based карточек
    headerRules?: {
        headingLevels: number[];       // [1, 2]
        nestingMode: "nested" | "flat";
        
        // Селекторы: какие именно заголовки брать
        selectors: PositionalSelector[];
        
        // Контекст
        includeParents: number;        // 0 = нет, 1 = родитель, -1 = все родители
        
        // Режим генерации
        cardMode: "qa" | "all" | "cloze" | "visual";
        qaSeparator?: string;          // Разделитель вопроса/ответа
    };

    // Настройки для inline (опционально, на будущее)
    inlineRules?: {
        separator: string; // "::"
    };
}

/**
 * Итоговый конфиг для конкретного заголовка в рантайме.
 * Получается после слияния всех подходящих правил.
 */
export interface ResolvedHeaderConfig {
    ruleIds: RuleId[];               // Какие правила применились (для отладки)
    nestingMode: "nested" | "flat";
    cardMode: "qa" | "all" | "cloze" | "visual";
    includeParents: number;
    qaSeparator: string;
    // headingLevels и selectors здесь уже не нужны, так как мы уже нашли заголовок
}

// ============================================================================
// Parsing Types (AST-based)
// ============================================================================

/**
 * Information about a heading found in the note (from AST)
 */
export interface HeadingInfo {
    /** Heading level (1-6 for h1-h6) */
    level: number;
    
    /** Text content of the heading (without # symbols) */
    text: string;
    
    /** Line number in the note (0-based) */
    lineNumber: number;
    
    /** Whether the heading ends with "?" (legacy field, not used for matching) */
    isQuestion: boolean;
    
    /** Path of parent headings for context */
    context: string[];
    
    /** Index among all headings in document (0-based) */
    index: number;
    
    /** Index among headings of the same level (0-based) */
    indexInLevel: number;
}

/**
 * Defines the boundaries of content for a flashcard answer
 */
export interface ContentBoundary {
    /** Line number where the answer starts (after the heading) */
    startLine: number;
    
    /** Line number where the answer ends (before next heading) */
    endLine: number;
    
    /** Whether the answer includes subheadings */
    includesSubheadings: boolean;
}

/**
 * Parsed QA format content from under a heading
 * Used for the extended QA format where question and answer are separate paragraphs
 */
export interface QAContent {
    /** The question text (first non-empty line ending with "?") */
    question: string;
    
    /** The answer text (first paragraph after the question) */
    answer: string;
    
    /** Line number where the question starts (0-based) */
    questionLineStart: number;
    
    /** Line number where the answer starts (0-based) */
    answerLineStart: number;
    
    /** Line number where the answer ends (0-based) */
    answerLineEnd: number;
}

// ============================================================================
// Legacy Types (For Migration)
// ============================================================================

/**
 * Legacy configuration for header-based flashcard parsing
 * @deprecated Use FlashcardTagRule instead
 */
export interface HeaderCardConfig {
    /** Array of heading levels to process (1-6 for h1-h6) */
    headingLevels: number[];
    
    /** How to handle nested content under headings */
    nestingMode: "nested" | "flat";
    
    /** Card creation mode (legacy field, both modes now work the same - all headings become cards) */
    mode: "qa" | "all";
    
    /** Whether this configuration is enabled */
    enabled: boolean;
}

/**
 * Legacy options for the HeaderBasedCardParser
 * @deprecated Use new rule-based system
 */
export interface HeaderBasedCardParserOptions {
    /** Whether header-based card parsing is enabled */
    enableHeaderCards: boolean;
    
    /** Map of predefined tag names to their configurations */
    predefinedTags: Map<string, HeaderCardConfig>;
    
    /** Map of custom tag names/patterns to their configurations */
    customTags: Map<string, HeaderCardConfig>;
    
    /** Whether to show heading context in cards */
    showContext: boolean;
}

/**
 * Resolved configuration after merging multiple tags (legacy)
 * @deprecated Use ResolvedHeaderConfig instead
 */
export interface ResolvedTagConfig {
    /** Combined heading levels from all matching tags (union) */
    headingLevels: number[];
    
    /** Recognition mode (legacy field, both modes now work the same - all headings become cards) */
    mode: "qa" | "all";
    
    /** Nesting mode: "nested" includes subheadings, "flat" stops at first subheading */
    nestingMode: "nested" | "flat";
    
    /** Positional selectors to filter headings by position */
    positionalSelectors: PositionalSelector[];
    
    /** Whether this configuration is active */
    enabled: boolean;
}

/**
 * Tag pattern for regex-based tag matching (legacy)
 * @deprecated Use FlashcardTagRule with tagPattern instead
 */
export interface TagPattern {
    /** Compiled regex pattern for matching tags */
    pattern: RegExp;
    
    /** Configuration to apply when the pattern matches */
    config: HeaderCardConfig;
}
