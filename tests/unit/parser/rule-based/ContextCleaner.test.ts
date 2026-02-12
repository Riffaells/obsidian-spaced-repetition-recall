/**
 * Unit tests for ContextCleaner
 *
 * Tests context detection and cleaning for lists, callouts, and quotes
 */

import { describe, test, expect } from "bun:test";
import { ContextCleaner, LineContext } from "src/parser/rule-based/ContextCleaner";

describe("ContextCleaner", () => {
    describe("detectContext", () => {
        test("should detect normal line", () => {
            const context = ContextCleaner.detectContext("Normal text");
            expect(context.type).toBe(LineContext.Normal);
            expect(context.prefix).toBe("");
            expect(context.indentLevel).toBe(0);
        });

        test("should detect unordered list with dash", () => {
            const context = ContextCleaner.detectContext("- List item");
            expect(context.type).toBe(LineContext.List);
            expect(context.prefix).toBe("- ");
            expect(context.indentLevel).toBe(0);
        });

        test("should detect unordered list with asterisk", () => {
            const context = ContextCleaner.detectContext("* List item");
            expect(context.type).toBe(LineContext.List);
            expect(context.prefix).toBe("* ");
        });

        test("should detect unordered list with plus", () => {
            const context = ContextCleaner.detectContext("+ List item");
            expect(context.type).toBe(LineContext.List);
            expect(context.prefix).toBe("+ ");
        });

        test("should detect ordered list", () => {
            const context = ContextCleaner.detectContext("1. List item");
            expect(context.type).toBe(LineContext.List);
            expect(context.prefix).toBe("1. ");
        });

        test("should detect nested list with 2-space indent", () => {
            const context = ContextCleaner.detectContext("  - Nested item");
            expect(context.type).toBe(LineContext.List);
            expect(context.prefix).toBe("  - ");
            expect(context.indentLevel).toBe(1);
        });

        test("should detect nested list with 4-space indent", () => {
            const context = ContextCleaner.detectContext("    - Double nested");
            expect(context.type).toBe(LineContext.List);
            expect(context.prefix).toBe("    - ");
            expect(context.indentLevel).toBe(2);
        });

        test("should detect callout", () => {
            const context = ContextCleaner.detectContext("> Callout text");
            expect(context.type).toBe(LineContext.Callout);
            expect(context.prefix).toBe("> ");
        });

        test("should detect quote with multiple >", () => {
            const context = ContextCleaner.detectContext(">> Nested quote");
            expect(context.type).toBe(LineContext.Quote);
            expect(context.prefix).toBe(">> ");
        });

        test("should detect callout with leading spaces", () => {
            const context = ContextCleaner.detectContext("  > Indented callout");
            expect(context.type).toBe(LineContext.Callout);
            expect(context.prefix).toBe("  > ");
        });
    });

    describe("cleanLine", () => {
        test("should clean normal line", () => {
            const cleaned = ContextCleaner.cleanLine("  Normal text  ");
            expect(cleaned).toBe("Normal text");
        });

        test("should remove list marker", () => {
            const cleaned = ContextCleaner.cleanLine("- List item");
            expect(cleaned).toBe("List item");
        });

        test("should remove callout marker", () => {
            const cleaned = ContextCleaner.cleanLine("> Callout text");
            expect(cleaned).toBe("Callout text");
        });

        test("should preserve bold markdown", () => {
            const cleaned = ContextCleaner.cleanLine("- **Bold** text");
            expect(cleaned).toBe("**Bold** text");
        });

        test("should preserve italic markdown", () => {
            const cleaned = ContextCleaner.cleanLine("- *Italic* text");
            expect(cleaned).toBe("*Italic* text");
        });

        test("should preserve highlight markdown", () => {
            const cleaned = ContextCleaner.cleanLine("- ==Highlighted== text");
            expect(cleaned).toBe("==Highlighted== text");
        });

        test("should preserve mixed rich markdown", () => {
            const cleaned = ContextCleaner.cleanLine("- **Bold** and *italic* and ==highlight==");
            expect(cleaned).toBe("**Bold** and *italic* and ==highlight==");
        });

        test("should handle nested list", () => {
            const cleaned = ContextCleaner.cleanLine("  - Nested item");
            expect(cleaned).toBe("Nested item");
        });
    });

    describe("cleanFlashcard", () => {
        test("should clean normal flashcard", () => {
            const result = ContextCleaner.cleanFlashcard("  Front  ", "  Back  ", "Front::Back");
            expect(result.front).toBe("Front");
            expect(result.back).toBe("Back");
        });

        test("should clean list flashcard", () => {
            const result = ContextCleaner.cleanFlashcard("Question", "Answer", "- Question::Answer");
            expect(result.front).toBe("Question");
            expect(result.back).toBe("Answer");
        });

        test("should clean callout flashcard", () => {
            const result = ContextCleaner.cleanFlashcard("Q", "A", "> Q::A");
            expect(result.front).toBe("Q");
            expect(result.back).toBe("A");
        });

        test("should preserve rich markdown in flashcard", () => {
            const result = ContextCleaner.cleanFlashcard(
                "**Bold** question",
                "*Italic* answer",
                "- **Bold** question::*Italic* answer",
            );
            expect(result.front).toBe("**Bold** question");
            expect(result.back).toBe("*Italic* answer");
        });
    });

    describe("hasContext", () => {
        test("should return false for normal line", () => {
            expect(ContextCleaner.hasContext("Normal text")).toBe(false);
        });

        test("should return true for list", () => {
            expect(ContextCleaner.hasContext("- List item")).toBe(true);
        });

        test("should return true for callout", () => {
            expect(ContextCleaner.hasContext("> Callout")).toBe(true);
        });

        test("should return true for nested list", () => {
            expect(ContextCleaner.hasContext("  - Nested")).toBe(true);
        });
    });
});
