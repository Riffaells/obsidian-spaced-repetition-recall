import { Question } from "src/Question";
import { NoteQuestionParser } from "src/parser/NoteQuestionParser";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { TopicPath } from "src/TopicPath";
import { TextDirection } from "src/util/TextDirection";
import { UnitTestSRFile } from "../../helpers/UnitTestSRFile";

describe("Header-Based Flashcards - Simple Regex Patterns", () => {
    let settings: SRSettings;
    let parser: NoteQuestionParser;

    beforeEach(() => {
        settings = {
            ...DEFAULT_SETTINGS,
            flashcardTagRules: [],
        };
        parser = new NoteQuestionParser(settings);
    });

    test("Simple regex #flashcards/h[123] matches h1, h2, h3", async () => {
        settings.flashcardTagRules = [
            {
                id: "test-rule-1",
                name: "Test Rule for #flashcard/h[123]",
                tagPattern: "^#flashcard/h[123]$",
                patternFlags: "",
                enabled: true,
                priority: 0,
                source: "header",
                headerRules: {
                    headingLevels: [1, 2, 3],
                    nestingMode: "nested",
                    selectors: [],
                    includeParents: 1,
                    cardMode: "qa",
                    qaSeparator: "?",
                },
            }
        ];
        parser = new NoteQuestionParser(settings);

        const noteText = `#flashcard/h2

# What is h1?
H1 answer.

## What is h2?
H2 answer.

### What is h3?
H3 answer.

#### What is h4?
H4 should not match.
`;
        const noteFile = new UnitTestSRFile(noteText);
        const questionList = await parser.createQuestionList(
            noteFile,
            TextDirection.Ltr,
            TopicPath.emptyPath,
            true,
        );

        expect(questionList.length).toBe(3);
        expect(questionList[0].cards[0].front).toContain("What is h1?");
        expect(questionList[1].cards[0].front).toContain("What is h2?");
        expect(questionList[2].cards[0].front).toContain("What is h3?");
    });

    test("Simple regex #flashcards/h[456] matches h4, h5, h6", async () => {
        settings.flashcardTagRules.push(
            {
                id: "test-rule-2",
                name: "Test Rule for #flashcard/h[456]",
                tagPattern: "^#flashcard/h[456]$",
                patternFlags: "",
                enabled: true,
                priority: 0,
                source: "header",
                headerRules: {
                    headingLevels: [4, 5, 6],
                    nestingMode: "nested",
                    selectors: [],
                    includeParents: 1,
                    cardMode: "qa",
                    qaSeparator: "?",
                },
            }
        );
        parser = new NoteQuestionParser(settings);

        const noteText = `#flashcard/h4 #flashcard/h5 #flashcard/h6

## What is h2?
Should not match.

### What is h3?
Should not match.

#### What is h4?
H4 answer.

##### What is h5?
H5 answer.

###### What is h6?
H6 answer.
`;
        const noteFile = new UnitTestSRFile(noteText);
        const questionList = await parser.createQuestionList(
            noteFile,
            TextDirection.Ltr,
            TopicPath.emptyPath,
            true,
        );

        expect(questionList.length).toBe(3);
        expect(questionList[0].cards[0].front).toContain("What is h4?");
        expect(questionList[1].cards[0].front).toContain("What is h5?");
        expect(questionList[2].cards[0].front).toContain("What is h6?");
    });

    test("Simple regex with all mode #flashcards/h[23] in all mode", async () => {
        settings.flashcardTagRules.push(
            {
                id: "test-rule-3",
                name: "Test Rule for #flashcard/h[23]",
                tagPattern: "^#flashcard/h[23]$",
                patternFlags: "",
                enabled: true,
                priority: 0,
                source: "header",
                headerRules: {
                    headingLevels: [2, 3],
                    nestingMode: "nested",
                    selectors: [],
                    includeParents: 1,
                    cardMode: "all",
                    qaSeparator: "?",
                },
            }
        );
        parser = new NoteQuestionParser(settings);

        const noteText = `#flashcard/h2 #flashcard/h3

## React Basics
Not a question, but should create card (all mode).

## What is React?
React is a library.

### Components
Also creates card (all mode).

### What are props?
Props are data.
`;
        const noteFile = new UnitTestSRFile(noteText);
        const questionList = await parser.createQuestionList(
            noteFile,
            TextDirection.Ltr,
            TopicPath.emptyPath,
            true,
        );

        expect(questionList.length).toBe(4);
    });
});
