import { NoteQuestionParser } from "src/parser/NoteQuestionParser";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { TopicPath } from "src/TopicPath";
import { TextDirection } from "src/util/TextDirection";
import { UnitTestSRFile } from "../helpers/UnitTestSRFile";
import { CardType } from "src/Question";

/**
 * Integration tests for NoteQuestionParser
 * 
 * These tests verify that:
 * 1. Header-based cards appear in deck
 * 2. Existing formats still work
 * 3. All formats work together
 * 4. Context display works correctly
 * 
 * Requirements: 11 (Compatibility with existing formats)
 */
describe("NoteQuestionParser Integration Tests", () => {
    let settings: SRSettings;
    let parser: NoteQuestionParser;

    beforeEach(() => {
        settings = {
            ...DEFAULT_SETTINGS,
            enableHeaderBasedCards: true,
            headerCardBaseConfig: {
                headingLevels: [2],
                mode: "qa",
                nestingMode: "nested",
            },
            headerCardCustomTags: {},
            headerCardShowContext: true,
        };
        parser = new NoteQuestionParser(settings);
    });

    describe("Header-based cards appear in deck", () => {
        test("Simple header-based cards are parsed and added to question list", async () => {
            const noteText = `#flashcards

## What is React?
React is a JavaScript library for building user interfaces.

## Why use React?
React makes it easy to create interactive UIs.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].isHeaderBased).toBe(true);
            expect(questionList[1].isHeaderBased).toBe(true);
            expect(questionList[0].cards[0].front).toContain("What is React?");
            expect(questionList[1].cards[0].front).toContain("Why use React?");
        });

        test("Header-based cards with nested content", async () => {
            const noteText = `#flashcards

## What is TypeScript?
TypeScript is a typed superset of JavaScript.

### Key Features
- Static typing
- Better IDE support

### Benefits
- Catch errors early
- Improved code quality
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            const card = questionList[0].cards[0];
            expect(card.front).toContain("What is TypeScript?");
            // In nested mode, should include subheadings
            expect(card.back).toContain("TypeScript is a typed superset");
            expect(card.back).toContain("Key Features");
            expect(card.back).toContain("Benefits");
        });

        test("Header-based cards with flat mode", async () => {
            settings.headerCardBaseConfig.nestingMode = "flat";
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

## What is Vue?
Vue is a progressive JavaScript framework.

### This should not be included
More content here.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            const card = questionList[0].cards[0];
            expect(card.back).toContain("Vue is a progressive");
            expect(card.back).not.toContain("This should not be included");
        });

        test("Header-based cards with 'all' mode", async () => {
            settings.headerCardBaseConfig.mode = "all";
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

## React Basics
Content about React.

## Vue Framework
Content about Vue.

## Angular Platform
Content about Angular.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // All headings should create cards (no "?" required)
            expect(questionList.length).toBe(3);
            expect(questionList[0].questionText.actualQuestion).toContain("React Basics");
            expect(questionList[1].questionText.actualQuestion).toContain("Vue Framework");
            expect(questionList[2].questionText.actualQuestion).toContain("Angular Platform");
        });
    });

    describe("Existing formats still work", () => {
        test("Inline cards (single line basic) work correctly", async () => {
            const noteText = `#flashcards

Question 1::Answer 1
Question 2::Answer 2
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].questionType).toBe(CardType.SingleLineBasic);
            expect(questionList[1].questionType).toBe(CardType.SingleLineBasic);
            expect(questionList[0].isHeaderBased).toBe(false);
            expect(questionList[1].isHeaderBased).toBe(false);
        });

        test("Inline reversed cards work correctly", async () => {
            const noteText = `#flashcards

Front:::Back
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].questionType).toBe(CardType.SingleLineReversed);
            expect(questionList[0].isHeaderBased).toBe(false);
        });

        test("Multiline cards work correctly", async () => {
            const noteText = `#flashcards

What is JavaScript?
?
JavaScript is a programming language.

What is Python?
?
Python is a high-level programming language.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].questionType).toBe(CardType.MultiLineBasic);
            expect(questionList[1].questionType).toBe(CardType.MultiLineBasic);
            expect(questionList[0].isHeaderBased).toBe(false);
            expect(questionList[1].isHeaderBased).toBe(false);
        });

        test("Multiline reversed cards work correctly", async () => {
            const noteText = `#flashcards

Front content
??
Back content
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].questionType).toBe(CardType.MultiLineReversed);
            expect(questionList[0].isHeaderBased).toBe(false);
        });

        test("Cloze cards work correctly", async () => {
            const noteText = `#flashcards

JavaScript was created by ==Brendan Eich==.
Python was created by **Guido van Rossum**.
Ruby was created by {{Yukihiro Matsumoto}}.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(3);
            expect(questionList[0].questionType).toBe(CardType.Cloze);
            expect(questionList[1].questionType).toBe(CardType.Cloze);
            expect(questionList[2].questionType).toBe(CardType.Cloze);
            expect(questionList[0].isHeaderBased).toBe(false);
            expect(questionList[1].isHeaderBased).toBe(false);
            expect(questionList[2].isHeaderBased).toBe(false);
        });
    });

    describe("All formats work together", () => {
        test("Header-based + inline cards", async () => {
            const noteText = `#flashcards

## What is React?
React is a JavaScript library.

Inline question::Inline answer
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            
            const headerCard = questionList.find((q: Question) => q.isHeaderBased);
            const inlineCard = questionList.find((q: Question) => !q.isHeaderBased && q.questionType === CardType.SingleLineBasic);
            
            expect(headerCard).toBeDefined();
            expect(inlineCard).toBeDefined();
            expect(headerCard.cards[0].front).toContain("What is React?");
            expect(inlineCard.cards[0].front).toContain("Inline question");
        });

        test("Header-based + multiline cards", async () => {
            const noteText = `#flashcards

## What is TypeScript?
TypeScript is a typed superset of JavaScript.

What is JavaScript?
?
JavaScript is a programming language.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            
            const headerCard = questionList.find((q: Question) => q.isHeaderBased);
            const multilineCard = questionList.find((q: Question) => !q.isHeaderBased && q.questionType === CardType.MultiLineBasic);
            
            expect(headerCard).toBeDefined();
            expect(multilineCard).toBeDefined();
        });

        test("Header-based + cloze cards", async () => {
            const noteText = `#flashcards

## What is Vue?
Vue is a progressive framework.

JavaScript was created by ==Brendan Eich==.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            
            const headerCard = questionList.find((q: Question) => q.isHeaderBased);
            const clozeCard = questionList.find((q: Question) => !q.isHeaderBased && q.questionType === CardType.Cloze);
            
            expect(headerCard).toBeDefined();
            expect(clozeCard).toBeDefined();
        });

        test("All formats in one note", async () => {
            const noteText = `#flashcards

## What is React?
React is a JavaScript library for building user interfaces.

Inline card::Inline answer

Reversed inline:::Reversed answer

Multiline question
?
Multiline answer

Reversed multiline
??
Reversed answer

Cloze with ==highlight==.
Cloze with **bold**.
Cloze with {{curly}}.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // 1 header-based + 2 inline + 2 multiline + 3 cloze = 8 cards
            expect(questionList.length).toBe(8);
            
            const headerCards = questionList.filter((q: Question) => q.isHeaderBased);
            const inlineBasic = questionList.filter((q: Question) => q.questionType === CardType.SingleLineBasic);
            const inlineReversed = questionList.filter((q: Question) => q.questionType === CardType.SingleLineReversed);
            const multilineBasic = questionList.filter((q: Question) => q.questionType === CardType.MultiLineBasic);
            const multilineReversed = questionList.filter((q: Question) => q.questionType === CardType.MultiLineReversed);
            const cloze = questionList.filter((q: Question) => q.questionType === CardType.Cloze);
            
            expect(headerCards.length).toBe(1);
            expect(inlineBasic.length).toBe(1);
            expect(inlineReversed.length).toBe(1);
            expect(multilineBasic.length).toBe(1);
            expect(multilineReversed.length).toBe(1);
            expect(cloze.length).toBe(3);
        });

        test("Inline card inside header-based answer", async () => {
            const noteText = `#flashcards

## What is React?
React is a library.

Nested inline::Nested answer
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Both cards should be created independently
            expect(questionList.length).toBe(2);
            expect(questionList.filter((q: Question) => q.isHeaderBased).length).toBe(1);
            expect(questionList.filter((q: Question) => q.questionType === CardType.SingleLineBasic).length).toBe(1);
        });

        test("Cloze card inside header-based answer", async () => {
            const noteText = `#flashcards

## What is JavaScript?
JavaScript was created by ==Brendan Eich== in 1995.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Both cards should be created
            expect(questionList.length).toBe(2);
            expect(questionList.filter((q: Question) => q.isHeaderBased).length).toBe(1);
            expect(questionList.filter((q: Question) => q.questionType === CardType.Cloze).length).toBe(1);
        });
    });

    describe("Context display in cards", () => {
        test("Single level context", async () => {
            settings.headerCardBaseConfig.headingLevels = [3];
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

# Programming

## JavaScript

### What is React?
React is a library.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            const question = questionList[0];
            expect(question.isHeaderBased).toBe(true);
            expect(question.headingContext).toEqual(["Programming", "JavaScript"]);
            expect(question.getDisplayContext()).toBe("Programming > JavaScript");
        });

        test("Multiple level context", async () => {
            settings.headerCardBaseConfig.headingLevels = [4];
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

# Computer Science

## Programming Languages

### JavaScript

#### What is React?
React is a library.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            const question = questionList[0];
            expect(question.headingContext).toEqual(["Computer Science", "Programming Languages", "JavaScript"]);
            expect(question.getDisplayContext()).toBe("Computer Science > Programming Languages > JavaScript");
        });

        test("No context for top-level headings", async () => {
            settings.headerCardBaseConfig.headingLevels = [1];
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

# What is Programming?
Programming is writing code.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            const question = questionList[0];
            expect(question.headingContext).toEqual([]);
            expect(question.getDisplayContext()).toBe("");
        });

        test("Context display disabled", async () => {
            settings.headerCardShowContext = false;
            settings.headerCardBaseConfig.headingLevels = [3];
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

# Programming

## JavaScript

### What is React?
React is a library.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            const question = questionList[0];
            // Context should still be captured but not displayed
            expect(question.headingContext).toEqual(["Programming", "JavaScript"]);
        });

        test("Traditional cards have no context", async () => {
            const noteText = `#flashcards

# Programming

## JavaScript

Traditional card::Answer
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            const question = questionList[0];
            expect(question.isHeaderBased).toBe(false);
            expect(question.headingContext).toBeUndefined();
            expect(question.getDisplayContext()).toBe("");
        });
    });

    describe("Edge cases and special scenarios", () => {
        test("Empty note with flashcard tag", async () => {
            const noteText = `#flashcards

`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(0);
        });

        test("Note without flashcard tag", async () => {
            const noteText = `
## What is React?
React is a library.

Question::Answer
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(0);
        });

        test("Header-based cards disabled", async () => {
            settings.enableHeaderBasedCards = false;
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

## What is React?
React is a library.

Traditional::Answer
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Only traditional card should be parsed
            expect(questionList.length).toBe(1);
            expect(questionList[0].isHeaderBased).toBe(false);
            expect(questionList[0].questionType).toBe(CardType.SingleLineBasic);
        });

        test("Multiple heading levels", async () => {
            settings.headerCardBaseConfig.headingLevels = [2, 3];
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

## What is React?
React is a library.

### What is Vue?
Vue is a framework.

#### This should not create a card
Content here.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is React?");
            expect(questionList[1].cards[0].front).toContain("What is Vue?");
        });

        test("QA format with extended syntax", async () => {
            const noteText = `#flashcards

## JavaScript

What is a closure?

A closure is a function that has access to variables from an outer scope.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            const question = questionList[0];
            expect(question.isQAFormat).toBe(true);
            expect(question.cards[0].front).toContain("What is a closure?");
            expect(question.cards[0].back).toContain("A closure is a function");
        });
    });
});
