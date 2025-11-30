import { parse, ParserOptions } from "../../src/parser";

describe("Parser validation - avoiding false positives", () => {
    const defaultOptions: ParserOptions = {
        singleLineCardSeparator: "::",
        singleLineReversedCardSeparator: ":::",
        multilineCardSeparator: "?",
        multilineReversedCardSeparator: "??",
        multilineCardEndMarker: "",
        clozePatterns: ["==[123;;]answer[;;hint]=="],
    };

    describe("URL detection", () => {
        test("should not treat URLs as flashcards", () => {
            const text = "Check out this link: http://example.com for more info";
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(0);
        });

        test("should not treat HTTPS URLs as flashcards", () => {
            const text = "Visit https://github.com for the source code";
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(0);
        });

        test("should not treat FTP URLs as flashcards", () => {
            const text = "Download from ftp://files.example.com";
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(0);
        });
    });

    describe("Time format detection", () => {
        test("should not treat time as flashcards", () => {
            const text = "Meeting at 10:30 tomorrow";
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(0);
        });

        test("should not treat multiple times as flashcards", () => {
            const text = "Schedule: 9:00, 10:30, 14:45";
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(0);
        });
    });

    describe("Valid flashcards should still work", () => {
        test("should detect valid inline flashcards", () => {
            const text = "Question::Answer";
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(1);
            expect(result[0].text).toBe("Question::Answer");
        });

        test("should detect flashcards with spaces", () => {
            const text = "What is TypeScript?::A superset of JavaScript";
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(1);
        });

        test("should detect flashcards in mixed content", () => {
            const text = `Some text here
Question::Answer
More text with http://example.com
Another question::Another answer`;
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(2);
        });
    });

    describe("Edge cases", () => {
        test("should not treat empty separator as flashcard", () => {
            const text = "::";
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(0);
        });

        test("should not treat separator with only whitespace as flashcard", () => {
            const text = "   ::   ";
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(0);
        });

        test("should handle C# programming language mentions", () => {
            const text = "I love programming in C# and F#";
            const result = parse(text, defaultOptions);
            expect(result.length).toBe(0);
        });
    });
});
