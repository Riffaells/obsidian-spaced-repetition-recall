/**
 * Central export point for all rule-based parser types
 *
 * @module parser/rule-based/types
 */

// Primitives
export type { RuleId, TagVarValue } from "./primitives";

// Flashcard output
export type { ParsedFlashcard } from "./flashcard";

// Cloze configuration
export type { ClozePattern, ClozeSettings } from "./cloze";

// Selection strategies
export type { LimitCount, LimitRange, LimitRandom, HeaderLimit } from "./selection-strategies";

// Extraction configs
export type { HeaderConfig, InlineConfig, MultilineConfig } from "./configs";

// Rules
export type { RuleMeta, HeaderRule, InlineRule, MultilineRule, FlashcardRule } from "./rules";

// Document structure
export type {
    HeadingNode,
    Range,
    DocumentStructure,
    ExtractionContext,
} from "./document-structure";

// Extracted card
export type { ExtractedCard } from "./extracted-card";
