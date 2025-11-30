import { NoteQuestionParser } from "src/NoteQuestionParser";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { TopicPath } from "src/TopicPath";
import { TextDirection } from "src/util/TextDirection";
import { UnitTestSRFile } from "../helpers/UnitTestSRFile";

/**
 * Integration tests for tag combinations (Requirement 5)
 * Tests combining multiple tags to create flexible configurations
 */
describe("Header-Based Flashcards - Tag Combinations (Requirement 5)", () => {
    let settings: SRSettings;
    let parser: NoteQuestionParser;

    beforeEach(() => {
        settings = {
            ...DEFAULT_SETTINGS,
            enableHeaderBasedCards: true,
            headerCardBaseConfig: {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
            },
            headerCardCustomTags: {},
            headerCardShowContext: true,
        };
        parser = new NoteQuestionParser(settings);
    });

    describe("5.1: Multiple level tags (#flashcards/h1 + #flashcards/h2-h3)", () => {
        test("Combines h1 and h2-h3 tags to create cards from h1, h2, and h3", async () => {
            // Configure custom tags for h1 and h2-h3
            settings.flashcardTags = ["#flashcards", "#flashcard/h1", "#flashcard/h2", "#flashcard/h3"];
            settings.headerCardCustomTags = {
                "#flashcard/h1": {
                    headingLevels: [1],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#flashcard/h3": {
                    headingLevels: [3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h1 #flashcard/h2 #flashcard/h3

# What is h1?
H1 answer.

## What is h2?
H2 answer.

### What is h3?
H3 answer.

#### What is h4?
H4 should not create card.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from h1, h2, and h3 only
            expect(questionList.length).toBe(3);
            expect(questionList[0].cards[0].front).toContain("What is h1?");
            expect(questionList[1].cards[0].front).toContain("What is h2?");
            expect(questionList[2].cards[0].front).toContain("What is h3?");
        });

        test("Union of heading levels from multiple tags", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h1", "#flashcard/h4"];
            settings.headerCardCustomTags = {
                "#flashcard/h1": {
                    headingLevels: [1],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#flashcard/h4": {
                    headingLevels: [4],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h1 #flashcard/h4

# What is h1?
H1 answer.

## What is h2?
H2 should not create card.

### What is h3?
H3 should not create card.

#### What is h4?
H4 answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from h1 and h4 only
            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is h1?");
            expect(questionList[1].cards[0].front).toContain("What is h4?");
        });
    });

    describe("5.2: Level + mode tags (#flashcards/h2 + #flashcards/qa)", () => {
        test("Combines h2 level with qa mode to filter only questions", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2

## React Basics
Not a question, should be skipped.

## What is React?
React is a library.

## Vue Framework
Also not a question.

## What is Vue?
Vue is a framework.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards only from h2 headings with "?"
            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is React?");
            expect(questionList[1].cards[0].front).toContain("What is Vue?");
        });

        test("Combines h2 level with all mode to include all headings", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2

## React Basics
Content about React.

## What is React?
React is a library.

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

            // Should create cards from all h2 headings
            expect(questionList.length).toBe(3);
            expect(questionList[0].questionText.actualQuestion).toContain("React Basics");
            expect(questionList[1].cards[0].front).toContain("What is React?");
            expect(questionList[2].questionText.actualQuestion).toContain("Vue Framework");
        });

        test("Mode 'all' wins when both qa and all tags are present", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2-qa", "#flashcard/h2-all"];
            settings.headerCardCustomTags = {
                "#flashcard/h2-qa": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#flashcard/h2-all": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2-qa #flashcard/h2-all

## React Basics
Not a question.

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

            // Should create cards from all h2 headings (all mode wins)
            expect(questionList.length).toBe(2);
        });
    });

    describe("5.3: Level + nesting tags (#flashcards/h2 + #flashcards/flat)", () => {
        test("Combines h2 level with flat nesting mode", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2

## What is React?
React is a library.

### Features
Should not be included in flat mode.

### Use Cases
Also not included.

## What is Vue?
Vue is a framework.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            const reactCard = questionList[0].cards[0];
            expect(reactCard.front).toContain("What is React?");
            expect(reactCard.back).toContain("React is a library");
            expect(reactCard.back).not.toContain("Features");
            expect(reactCard.back).not.toContain("Use Cases");
        });

        test("Combines h2 level with nested nesting mode", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2

## What is React?
React is a library.

### Features
- Component-based
- Virtual DOM

### Use Cases
Web applications.
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
            expect(card.back).toContain("Features");
            expect(card.back).toContain("Component-based");
            expect(card.back).toContain("Use Cases");
            expect(card.back).toContain("Web applications");
        });

        test("Last nesting mode tag wins when multiple are present", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/nested", "#flashcard/flat"];
            settings.headerCardCustomTags = {
                "#flashcard/nested": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#flashcard/flat": {
                    headingLevels: [2],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/nested #flashcard/flat

## What is React?
React is a library.

### Features
Should not be included (flat wins).
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
            expect(card.back).not.toContain("Features");
        });
    });

    describe("5.4: Composite tags (#flashcards/h2/qa/last-3)", () => {
        test("Composite tag with level and mode (positional selectors tested separately)", async () => {
            // Note: Positional selectors are tested in task 24 (Test positional selectors)
            // Here we test the combination of level + mode in a composite tag format
            settings.flashcardTags = ["#flashcards", "#flashcard/h2-qa"];
            settings.headerCardCustomTags = {
                "#flashcard/h2-qa": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2-qa

## React Basics
Not a question, skipped.

## What is React?
React is a library.

## What is Vue?
Vue is a framework.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from h2 headings with "?" only
            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is React?");
            expect(questionList[1].cards[0].front).toContain("What is Vue?");
        });

        test("Composite tag with h3, all mode, and nested", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h3-all"];
            settings.headerCardCustomTags = {
                "#flashcard/h3-all": {
                    headingLevels: [3],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h3-all

## Section

### First h3
First content.

#### Nested content
Should be included.

### Second h3
Second content.

### Third h3
Third content.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from all h3 headings (all mode, no "?" required)
            expect(questionList.length).toBe(3);
            expect(questionList[0].questionText.actualQuestion).toContain("First h3");
            expect(questionList[1].questionText.actualQuestion).toContain("Second h3");
            expect(questionList[2].questionText.actualQuestion).toContain("Third h3");
            
            // Verify nested mode includes subheadings
            expect(questionList[0].cards[0].back).toContain("Nested content");
        });

        test("Composite tag with flat nesting mode", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2-flat"];
            settings.headerCardCustomTags = {
                "#flashcard/h2-flat": {
                    headingLevels: [2],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2-flat

## What is first?
First answer.

### Subheading
Should not be included (flat mode).

## What is second?
Second answer.

## What is third?
Third answer.

### Another subheading
Also not included.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from all h2 headings with "?"
            expect(questionList.length).toBe(3);
            expect(questionList[0].cards[0].front).toContain("What is first?");
            expect(questionList[1].cards[0].front).toContain("What is second?");
            expect(questionList[2].cards[0].front).toContain("What is third?");
            
            // Verify flat mode - no subheadings
            expect(questionList[0].cards[0].back).not.toContain("Subheading");
            expect(questionList[2].cards[0].back).not.toContain("Another subheading");
        });
    });

    describe("5.5: Complex combinations", () => {
        test("Three tags: level + mode + nesting", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/h3"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "flat",
                    mode: "all",
                    enabled: true,
                },
                "#flashcard/h3": {
                    headingLevels: [3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/h3

## React Basics
Content about React.

### What is JSX?
JSX is a syntax extension.

#### Details
More details about JSX.

## Vue Framework
Content about Vue.

### What is Vue Router?
Vue Router is for routing.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from:
            // - h2 headings (all mode, flat nesting)
            // - h3 headings with "?" (qa mode, nested)
            expect(questionList.length).toBe(4);
            
            // Check h2 cards (all mode)
            const h2Cards = questionList.filter(q => 
                q.questionText.actualQuestion.includes("React Basics") ||
                q.questionText.actualQuestion.includes("Vue Framework")
            );
            expect(h2Cards.length).toBe(2);
            
            // Check h3 cards (qa mode)
            const h3Cards = questionList.filter(q => 
                q.cards[0].front.includes("What is JSX?") ||
                q.cards[0].front.includes("What is Vue Router?")
            );
            expect(h3Cards.length).toBe(2);
            
            // Verify h3 card includes nested content
            const jsxCard = h3Cards.find(q => q.cards[0].front.includes("What is JSX?"));
            expect(jsxCard!.cards[0].back).toContain("Details");
        });

        test("Multiple level tags with different modes", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2-qa", "#flashcard/h3-all"];
            settings.headerCardCustomTags = {
                "#flashcard/h2-qa": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#flashcard/h3-all": {
                    headingLevels: [3],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2-qa #flashcard/h3-all

## React Basics
Not a question, skipped.

## What is React?
React is a library.

### Components
All h3 headings create cards.

### Props
Data passed to components.

## Vue Framework
Also not a question.

## What is Vue?
Vue is a framework.

### Directives
Vue directives.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create:
            // - 2 h2 cards (only with "?")
            // - 3 h3 cards (all h3 headings)
            expect(questionList.length).toBe(5);
            
            const h2Cards = questionList.filter(q => 
                q.cards[0].front.includes("What is React?") ||
                q.cards[0].front.includes("What is Vue?")
            );
            expect(h2Cards.length).toBe(2);
            
            const h3Cards = questionList.filter(q => 
                q.questionText.actualQuestion.includes("Components") ||
                q.questionText.actualQuestion.includes("Props") ||
                q.questionText.actualQuestion.includes("Directives")
            );
            expect(h3Cards.length).toBe(3);
        });

        test("Combining custom tags with different configurations", async () => {
            settings.flashcardTags = ["#flashcards", "#вопросы", "#учеба"];
            settings.headerCardCustomTags = {
                "#вопросы": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#учеба": {
                    headingLevels: [3],
                    nestingMode: "flat",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#вопросы #учеба

## Что такое React?
React - это библиотека.

### Компоненты
Основа React.

#### Детали
Не включается (flat mode для h3).

## JavaScript
Не вопрос, пропускается.

### Переменные
Создается карточка (all mode для h3).
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create:
            // - 1 h2 card (qa mode, with "?")
            // - 2 h3 cards (all mode)
            expect(questionList.length).toBe(3);
            
            const h2Card = questionList.find(q => q.cards[0].front.includes("Что такое React?"));
            expect(h2Card).toBeDefined();
            
            const h3Cards = questionList.filter(q => 
                q.questionText.actualQuestion.includes("Компоненты") ||
                q.questionText.actualQuestion.includes("Переменные")
            );
            expect(h3Cards.length).toBe(2);
            
            // Verify flat mode for h3
            const componentsCard = h3Cards.find(q => q.questionText.actualQuestion.includes("Компоненты"));
            expect(componentsCard!.cards[0].back).not.toContain("Детали");
        });
    });

    describe("5.6: Edge cases in tag combinations", () => {
        test("Empty heading levels array with mode tag", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/qa-only"];
            settings.headerCardCustomTags = {
                "#flashcard/qa-only": {
                    headingLevels: [],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/qa-only

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

            // Should use default heading levels from base config
            expect(questionList.length).toBe(1);
        });

        test("Disabled tag combined with enabled tag", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/disabled", "#flashcard/enabled"];
            settings.headerCardCustomTags = {
                "#flashcard/disabled": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: false,
                },
                "#flashcard/enabled": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/disabled #flashcard/enabled

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

            // Enabled tag should win
            expect(questionList.length).toBe(1);
        });

        test("Same level specified multiple times", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2-a", "#flashcard/h2-b"];
            settings.headerCardCustomTags = {
                "#flashcard/h2-a": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#flashcard/h2-b": {
                    headingLevels: [2],
                    nestingMode: "flat",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2-a #flashcard/h2-b

## React Basics
Content about React.

### Features
Subheading content.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create card (all mode wins, flat mode wins)
            expect(questionList.length).toBe(1);
            expect(questionList[0].questionText.actualQuestion).toContain("React Basics");
            // Flat mode should win (last tag)
            expect(questionList[0].cards[0].back).not.toContain("Features");
        });
    });
});
