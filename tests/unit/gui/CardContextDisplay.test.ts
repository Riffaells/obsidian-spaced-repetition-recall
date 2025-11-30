import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { Question, QuestionText } from "src/Question";
import { TextDirection } from "src/util/TextDirection";
import { Note } from "src/Note";
import { SrTFile } from "src/SRFile";

describe("Card Context Display", () => {
    let mockNote: Note;
    let mockFile: SrTFile;

    beforeEach(() => {
        // Create a mock file
        mockFile = {
            basename: "TestNote",
            path: "test/TestNote.md",
        } as SrTFile;

        // Create a mock note with all required properties
        mockNote = {
            file: mockFile,
            questionList: [],
            hasChanged: false,
            filePath: "test/TestNote.md",
            appendCardsToDeck: jest.fn(),
            createMultiCloze: jest.fn(),
            debugLogToConsole: jest.fn(),
            writeNoteFile: jest.fn(),
        } as unknown as Note;
    });

    describe("Header-based flashcard context display", () => {
        test("Shows context for header-based card when setting is enabled", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardShowContext: true,
            };

            const question: Question = new Question({
                questionText: new QuestionText("What is React?", null, "What is React?", TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: ["JavaScript", "React"],
                note: mockNote,
            });

            const expectedContext = "TestNote > JavaScript > React";
            const actualContext = formatContextForHeaderCard(question, settings, mockNote);

            expect(actualContext).toEqual(expectedContext);
        });

        test("Shows context with single level heading", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardShowContext: true,
            };

            const question: Question = new Question({
                questionText: new QuestionText("What is TypeScript?", null, "What is TypeScript?", TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: ["Programming Languages"],
                note: mockNote,
            });

            const expectedContext = "TestNote > Programming Languages";
            const actualContext = formatContextForHeaderCard(question, settings, mockNote);

            expect(actualContext).toEqual(expectedContext);
        });

        test("Shows context with multiple level headings", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardShowContext: true,
            };

            const question: Question = new Question({
                questionText: new QuestionText("What are hooks?", null, "What are hooks?", TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: ["JavaScript", "React", "Advanced Topics", "Hooks"],
                note: mockNote,
            });

            const expectedContext = "TestNote > JavaScript > React > Advanced Topics > Hooks";
            const actualContext = formatContextForHeaderCard(question, settings, mockNote);

            expect(actualContext).toEqual(expectedContext);
        });

        test("Hides context when headerCardShowContext setting is disabled", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardShowContext: false,
            };

            const question: Question = new Question({
                questionText: new QuestionText("What is React?", null, "What is React?", TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: ["JavaScript", "React"],
                note: mockNote,
            });

            const actualContext = formatContextForHeaderCard(question, settings, mockNote);

            expect(actualContext).toEqual("");
        });

        test("Returns empty string when headingContext is empty", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardShowContext: true,
            };

            const question: Question = new Question({
                questionText: new QuestionText("What is React?", null, "What is React?", TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: [],
                note: mockNote,
            });

            const actualContext = formatContextForHeaderCard(question, settings, mockNote);

            expect(actualContext).toEqual("");
        });

        test("Returns empty string when headingContext is undefined", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardShowContext: true,
            };

            const question: Question = new Question({
                questionText: new QuestionText("What is React?", null, "What is React?", TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: undefined,
                note: mockNote,
            });

            const actualContext = formatContextForHeaderCard(question, settings, mockNote);

            expect(actualContext).toEqual("");
        });

        test("Handles special characters in heading context", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardShowContext: true,
            };

            const question: Question = new Question({
                questionText: new QuestionText("Answer", null, "Answer", TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: ["Level 1: Introduction", "Level 2 & Details", "Level 3 (Advanced)"],
                note: mockNote,
            });

            const expectedContext = "TestNote > Level 1: Introduction > Level 2 & Details > Level 3 (Advanced)";
            const actualContext = formatContextForHeaderCard(question, settings, mockNote);

            expect(actualContext).toEqual(expectedContext);
        });
    });

    describe("Non-header-based flashcard context display", () => {
        test("Does not show header context for non-header-based card", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardShowContext: true,
            };

            const question: Question = new Question({
                questionText: new QuestionText("Q1::A1", null, "Q1::A1", TextDirection.Ltr, null),
                isHeaderBased: false,
                headingContext: undefined,
                note: mockNote,
            });

            const actualContext = formatContextForHeaderCard(question, settings, mockNote);

            expect(actualContext).toEqual("");
        });

        test("Shows regular question context when showContextInCards is enabled", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                showContextInCards: true,
                headerCardShowContext: false,
            };

            const question: Question = new Question({
                questionText: new QuestionText("Q1::A1", null, "Q1::A1", TextDirection.Ltr, null),
                isHeaderBased: false,
                questionContext: ["Context 1", "Context 2"],
                note: mockNote,
            });

            const expectedContext = "TestNote > Context 1 > Context 2 > ...";
            const actualContext = formatContextForRegularCard(question, settings, mockNote);

            expect(actualContext).toEqual(expectedContext);
        });

        test("Hides regular question context when showContextInCards is disabled", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                showContextInCards: false,
            };

            const question: Question = new Question({
                questionText: new QuestionText("Q1::A1", null, "Q1::A1", TextDirection.Ltr, null),
                isHeaderBased: false,
                questionContext: ["Context 1", "Context 2"],
                note: mockNote,
            });

            const actualContext = formatContextForRegularCard(question, settings, mockNote);

            expect(actualContext).toEqual("");
        });

        test("Returns empty string when questionContext is empty", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                showContextInCards: true,
            };

            const question: Question = new Question({
                questionText: new QuestionText("Q1::A1", null, "Q1::A1", TextDirection.Ltr, null),
                isHeaderBased: false,
                questionContext: [],
                note: mockNote,
            });

            const actualContext = formatContextForRegularCard(question, settings, mockNote);

            expect(actualContext).toEqual("");
        });

        test("Handles links in question context", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                showContextInCards: true,
            };

            const question: Question = new Question({
                questionText: new QuestionText("Q1::A1", null, "Q1::A1", TextDirection.Ltr, null),
                isHeaderBased: false,
                questionContext: ["[[LinkedNote]]", "[[AnotherNote|Display Text]]"],
                note: mockNote,
            });

            const expectedContext = "TestNote > LinkedNote > Display Text > ...";
            const actualContext = formatContextForRegularCard(question, settings, mockNote);

            expect(actualContext).toEqual(expectedContext);
        });
    });

    describe("Combined context display logic", () => {
        test("Prioritizes header context over regular context for header-based cards", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardShowContext: true,
                showContextInCards: true,
            };

            const question: Question = new Question({
                questionText: new QuestionText("What is React?", null, "What is React?", TextDirection.Ltr, null),
                isHeaderBased: true,
                headingContext: ["JavaScript", "React"],
                questionContext: ["Should not show"],
                note: mockNote,
            });

            const actualContext = getContextText(question, settings, mockNote);

            // Should show header context, not question context
            expect(actualContext).toEqual("TestNote > JavaScript > React");
            expect(actualContext).not.toContain("Should not show");
        });

        test("Returns empty string when both settings are disabled", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardShowContext: false,
                showContextInCards: false,
            };

            const question: Question = new Question({
                questionText: new QuestionText("Q1::A1", null, "Q1::A1", TextDirection.Ltr, null),
                isHeaderBased: false,
                questionContext: ["Context"],
                note: mockNote,
            });

            const actualContext = getContextText(question, settings, mockNote);

            expect(actualContext).toEqual("");
        });
    });
});

// Helper functions that mirror the logic in CardUI._getContextText()
function getContextText(question: Question, settings: SRSettings, note: Note): string {
    // For header-based flashcards, show heading context if enabled
    if (question.isHeaderBased && settings.headerCardShowContext) {
        const headingContext = question.getDisplayContext();
        if (headingContext) {
            return note.file.basename + " > " + headingContext;
        }
    }
    
    // For regular flashcards, show question context if enabled
    if (settings.showContextInCards && question.questionContext?.length > 0) {
        return formatQuestionContextText(question.questionContext, note);
    }
    
    return "";
}

function formatContextForHeaderCard(question: Question, settings: SRSettings, note: Note): string {
    if (!question.isHeaderBased || !settings.headerCardShowContext) {
        return "";
    }
    
    const headingContext = question.getDisplayContext();
    if (!headingContext) {
        return "";
    }
    
    return note.file.basename + " > " + headingContext;
}

function formatContextForRegularCard(question: Question, settings: SRSettings, note: Note): string {
    if (!settings.showContextInCards || !question.questionContext || question.questionContext.length === 0) {
        return "";
    }
    
    return formatQuestionContextText(question.questionContext, note);
}

function formatQuestionContextText(questionContext: string[], note: Note): string {
    const separator: string = " > ";
    let result = note.file.basename;
    questionContext.forEach((context) => {
        // Check for links trim [[ ]]
        if (context.startsWith("[[") && context.endsWith("]]")) {
            context = context.replace("[[", "").replace("]]", "");
            // Use replacement text if any
            if (context.includes("|")) {
                context = context.split("|")[1];
            }
        }
        result += separator + context;
    });
    return result + separator + "...";
}
