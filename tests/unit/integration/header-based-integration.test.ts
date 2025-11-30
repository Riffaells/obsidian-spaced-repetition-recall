import { NoteQuestionParser } from "src/NoteQuestionParser";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { TopicPath } from "src/TopicPath";
import { TextDirection } from "src/util/TextDirection";
import { UnitTestSRFile } from "../helpers/UnitTestSRFile";
import { CardType } from "src/Question";

describe("Header-Based Flashcards Integration", () => {
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

    test("Header-based cards appear in deck alongside traditional cards", async () => {
        const noteText = `#flashcards

## What is React?
React is a JavaScript library for building user interfaces.

Traditional card::Answer

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

        // Should have 3 cards: 2 header-based + 1 traditional
        expect(questionList.length).toBe(3);

        // Check header-based cards
        const headerCards = questionList.filter((q) => q.isHeaderBased);
        expect(headerCards.length).toBe(2);
        expect(headerCards[0].cards[0].front).toContain("What is React?");
        expect(headerCards[1].cards[0].front).toContain("Why use React?");

        // Check traditional card
        const traditionalCards = questionList.filter((q) => !q.isHeaderBased);
        expect(traditionalCards.length).toBe(1);
        expect(traditionalCards[0].questionType).toBe(CardType.SingleLineBasic);
    });

    test("Header-based cards work with existing formats (multiline)", async () => {
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
        expect(questionList.filter((q) => q.isHeaderBased).length).toBe(1);
        expect(questionList.filter((q) => !q.isHeaderBased).length).toBe(1);
        // Both are MultiLineBasic type, but one is header-based
        expect(questionList.filter((q) => q.questionType === CardType.MultiLineBasic).length).toBe(
            2,
        );
    });

    test("Context display works for header-based cards", async () => {
        // Use h3 level for the question
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

    test("Header-based cards disabled when setting is off", async () => {
        settings.enableHeaderBasedCards = false;
        parser = new NoteQuestionParser(settings);

        const noteText = `#flashcards

## What is React?
React is a library.
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

    test("Custom tags work correctly", async () => {
        settings.flashcardTags = ["#flashcards", "#flashcard/h3"]; // Add custom tag to flashcard tags
        settings.headerCardCustomTags = {
            "#flashcard/h3": {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            },
        };
        parser = new NoteQuestionParser(settings);

        const noteText = `#flashcard/h3

## This should not create a card
Content here.

### What is Vue?
Vue is a framework.
`;
        const noteFile = new UnitTestSRFile(noteText);
        const questionList = await parser.createQuestionList(
            noteFile,
            TextDirection.Ltr,
            TopicPath.emptyPath,
            true,
        );

        expect(questionList.length).toBe(1);
        expect(questionList[0].cards[0].front).toContain("What is Vue?");
    });

    test("Flat mode stops at first subheading", async () => {
        settings.headerCardBaseConfig.nestingMode = "flat";
        parser = new NoteQuestionParser(settings);

        const noteText = `#flashcards

## What is TypeScript?
TypeScript is a typed superset.

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
        expect(card.back).not.toContain("This should not be included");
        expect(card.back).toContain("TypeScript is a typed superset");
    });

    test("All mode creates cards from all headings", async () => {
        settings.headerCardBaseConfig.mode = "all";
        parser = new NoteQuestionParser(settings);

        const noteText = `#flashcards

## React Basics
Content about React.

## Vue Framework
Content about Vue.
`;
        const noteFile = new UnitTestSRFile(noteText);
        const questionList = await parser.createQuestionList(
            noteFile,
            TextDirection.Ltr,
            TopicPath.emptyPath,
            true,
        );

        // Both headings should create cards (no "?" required in "all" mode)
        expect(questionList.length).toBe(2);
        expect(questionList[0].questionText.actualQuestion).toContain("React Basics");
        expect(questionList[1].questionText.actualQuestion).toContain("Vue Framework");
    });
});
