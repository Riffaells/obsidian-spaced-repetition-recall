import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { Question, QuestionText } from "src/Question";
import { TextDirection } from "src/util/TextDirection";

const settings_cardCommentOnSameLine: SRSettings = { ...DEFAULT_SETTINGS };
settings_cardCommentOnSameLine.cardCommentOnSameLine = true;

describe("Question", () => {
    describe("getHtmlCommentSeparator", () => {
        test("Ends with a code block", async () => {
            const text: string =
                "How do you ... Python?\n?\n" +
                "```\nprint('Hello World!')\nprint('Howdy?')\nlambda x: x[0]\n```";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
            });

            expect(question.getHtmlCommentSeparator(DEFAULT_SETTINGS)).toEqual("\n");
            expect(question.getHtmlCommentSeparator(settings_cardCommentOnSameLine)).toEqual("\n");
        });

        test("Doesn't end with a code block", async () => {
            const text: string = "Q1::A1";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
            });

            expect(question.getHtmlCommentSeparator(DEFAULT_SETTINGS)).toEqual("\n");
            expect(question.getHtmlCommentSeparator(settings_cardCommentOnSameLine)).toEqual(" ");
        });
    });

    describe("getDisplayContext", () => {
        test("Returns empty string for non-header-based flashcard", () => {
            const text: string = "Q1::A1";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
                isHeaderBased: false,
            });

            expect(question.getDisplayContext()).toEqual("");
        });

        test("Returns empty string when isHeaderBased is true but no headingContext", () => {
            const text: string = "Q1::A1";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: undefined,
            });

            expect(question.getDisplayContext()).toEqual("");
        });

        test("Returns empty string when headingContext is empty array", () => {
            const text: string = "Q1::A1";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: [],
            });

            expect(question.getDisplayContext()).toEqual("");
        });

        test("Returns formatted context for header-based flashcard with single level", () => {
            const text: string = "What is React?";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: ["JavaScript Basics"],
            });

            expect(question.getDisplayContext()).toEqual("JavaScript Basics");
        });

        test("Returns formatted context for header-based flashcard with multiple levels", () => {
            const text: string = "What are hooks?";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: ["JavaScript", "React", "Что такое хуки?"],
            });

            expect(question.getDisplayContext()).toEqual("JavaScript > React > Что такое хуки?");
        });

        test("Returns formatted context with special characters", () => {
            const text: string = "Answer";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: ["Level 1: Introduction", "Level 2 & Details", "Level 3 (Advanced)"],
            });

            expect(question.getDisplayContext()).toEqual("Level 1: Introduction > Level 2 & Details > Level 3 (Advanced)");
        });

        test("Returns formatted context for QA format flashcard", () => {
            const text: string = "What is closure?";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
                isHeaderBased: true,
                isQAFormat: true,
                headingContext: ["JavaScript", "Advanced Concepts"],
            });

            expect(question.getDisplayContext()).toEqual("JavaScript > Advanced Concepts");
        });
    });

    describe("isQAFormat field", () => {
        test("isQAFormat defaults to false for regular flashcards", () => {
            const text: string = "Q1::A1";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
                isHeaderBased: false,
                isQAFormat: false,
            });

            expect(question.isQAFormat).toBe(false);
        });

        test("isQAFormat can be set to true for QA format flashcards", () => {
            const text: string = "What is React?";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
                isHeaderBased: true,
                isQAFormat: true,
            });

            expect(question.isQAFormat).toBe(true);
        });

        test("isQAFormat is independent of isHeaderBased", () => {
            const text: string = "Q1::A1";

            const question: Question = new Question({
                questionText: new QuestionText(text, null, text, TextDirection.Ltr, null),
                isHeaderBased: false,
                isQAFormat: true,
            });

            expect(question.isHeaderBased).toBe(false);
            expect(question.isQAFormat).toBe(true);
        });
    });
});
