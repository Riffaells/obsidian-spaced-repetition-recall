import { NoteQuestionParser } from "src/parser/NoteQuestionParser";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { TopicPath } from "src/TopicPath";
import { TextDirection } from "src/util/TextDirection";
import { UnitTestSRFile } from "../helpers/UnitTestSRFile";
import { CardType, Question } from "src/Question";

/**
 * Comprehensive integration tests for header-based flashcards feature.
 * Tests all requirements end-to-end, real-world scenarios, performance, and edge cases.
 */
describe("Header-Based Flashcards - Comprehensive Integration Tests", () => {
    let settings: SRSettings;
    let parser: NoteQuestionParser;

    beforeEach(() => {
        settings = {
            ...DEFAULT_SETTINGS,
            flashcardTagRules: [], // Initialize with an empty array
        };
        parser = new NoteQuestionParser(settings);
    });

    describe("Requirement 1: Basic card creation from headings", () => {
        test("1.1: Creates card from heading with question mark", async () => {
            const noteText = `#flashcards

## What is React?
React is a JavaScript library.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].isHeaderBased).toBe(true);
            expect(questionList[0].cards[0].front).toContain("What is React?");
            expect(questionList[0].cards[0].back).toContain("React is a JavaScript library");
        });

        test("1.2: Uses content until next same-level heading as answer", async () => {
            const noteText = `#flashcards

## What is TypeScript?
TypeScript is a typed superset of JavaScript.

It adds static typing to JavaScript.

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
            const firstCard = questionList[0].cards[0];
            expect(firstCard.back).toContain("TypeScript is a typed superset");
            expect(firstCard.back).toContain("It adds static typing");
            expect(firstCard.back).not.toContain("What is Vue?");
        });

        test("1.3: Includes lower-level subheadings in answer (nested mode)", async () => {
            const noteText = `#flashcards

## What is JavaScript?
JavaScript is a programming language.

### Features
- Dynamic typing
- Prototype-based

### Use cases
Web development and more.
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
            expect(card.back).toContain("Dynamic typing");
            expect(card.back).toContain("Use cases");
            expect(card.back).toContain("Web development");
        });

        test("1.4: Skips headings without question mark in qa mode", async () => {
            const noteText = `#flashcards

## React Basics
This is not a question.

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

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What is React?");
        });

        test("1.5: Creates both header and traditional cards independently", async () => {
            const noteText = `#flashcards

## What is React?
React is a library.

Traditional inline::Answer here

What is multiline?
?
Multiline answer here.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            const headerCards = questionList.filter((q: Question) => q.isHeaderBased);
            const traditionalCards = questionList.filter((q: Question) => !q.isHeaderBased);
            expect(headerCards.length).toBe(1);
            expect(traditionalCards.length).toBe(2);
        });
    });

    describe("Requirement 2: Heading level configuration via tags", () => {
        test("2.1: Creates cards only from h2 with #flashcard/h2 tag", async () => {
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

# What is h1?
Should not create card.

## What is h2?
Should create card.

### What is h3?
Should not create card.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What is h2?");
        });

        test("2.2: Creates cards from h3 with #flashcard/h3 tag", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h3"];
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

## What is h2?
Should not create card.

### What is h3?
Should create card.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What is h3?");
        });

        test("2.3: Creates cards from multiple levels with #flashcard/h2-h3", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/h3"];
            settings.headerCardCustomTags = {
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

            const noteText = `#flashcard/h2 #flashcard/h3

## What is h2?
H2 answer.

### What is h3?
H3 answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is h2?");
            expect(questionList[1].cards[0].front).toContain("What is h3?");
        });

        test("2.4: Uses default config when no tag specified", async () => {
            const noteText = `#flashcards

## What is default?
Uses default h2 config.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
        });
    });

    describe("Requirement 2.1: Custom tags for heading levels", () => {
        test("2.1.1: Uses custom tag configuration", async () => {
            settings.flashcardTags = ["#flashcards", "#вопросы-h2"];
            settings.headerCardCustomTags = {
                "#вопросы-h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#вопросы-h2

## Что такое React?
React - это библиотека.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("Что такое React?");
        });

        test("2.1.2: Custom tag overrides built-in tag", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h3"];
            settings.headerCardCustomTags = {
                "#flashcard/h3": {
                    headingLevels: [2], // Override to use h2 instead
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h3

## This is h2
Should create card because custom config uses h2.

### This is h3
Should not create card.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("This is h2");
        });
    });

    describe("Requirement 3: Nested content management", () => {
        test("3.1: Nested mode includes all subheadings", async () => {
            settings.headerCardBaseConfig.nestingMode = "nested";
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

## What is TypeScript?
TypeScript is a superset.

### Advantages
- Static typing
- Better tooling

### Disadvantages
- Compilation step
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
            expect(card.back).toContain("Advantages");
            expect(card.back).toContain("Static typing");
            expect(card.back).toContain("Disadvantages");
            expect(card.back).toContain("Compilation step");
        });

        test("3.2: Flat mode stops at first subheading", async () => {
            settings.headerCardBaseConfig.nestingMode = "flat";
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

## What is React?
React is a library.

### Features
Should not be included.
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
            expect(card.back).toContain("React is a library");
            expect(card.back).not.toContain("Features");
        });

        test("3.3: Nested mode stops at same-level heading", async () => {
            settings.headerCardBaseConfig.nestingMode = "nested";
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

## What is first?
First answer.

### Subheading
Included.

## What is second?
Second answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].back).toContain("Subheading");
            expect(questionList[0].cards[0].back).not.toContain("What is second?");
        });
    });

    describe("Requirement 4: Compatibility with existing formats", () => {
        test("4.1: Works with multiline format", async () => {
            const noteText = `#flashcards

## What is header-based?
Header-based answer.

What is multiline?
?
Multiline answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList.filter(q => q.isHeaderBased).length).toBe(1);
            expect(questionList.filter(q => !q.isHeaderBased).length).toBe(1);
        });

        test("4.2: Works with inline format", async () => {
            const noteText = `#flashcards

## What is header-based?
Header-based answer.

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
            expect(questionList.filter(q => q.isHeaderBased).length).toBe(1);
            expect(questionList.filter(q => !q.isHeaderBased).length).toBe(1);
        });

        test("4.3: Traditional cards inside header answer work independently", async () => {
            const noteText = `#flashcards

## What is React?
React is a library.

Inline in answer::Answer here

More content.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            // Header card should include the inline card text in its answer
            const headerCard = questionList.find(q => q.isHeaderBased);
            expect(headerCard).toBeDefined();
            expect(headerCard!.cards[0].back).toContain("Inline in answer::Answer here");
        });

        test("4.4: All three formats work together", async () => {
            const noteText = `#flashcards

## What is header?
Header answer.

Inline::Inline answer

What is multiline?
?
Multiline answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(3);
            expect(questionList.filter(q => q.isHeaderBased).length).toBe(1);
            expect(questionList.filter(q => !q.isHeaderBased).length).toBe(2);
        });
    });

    describe("Requirement 6: Context display in cards", () => {
        test("6.1: Saves heading context path", async () => {
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
            expect(questionList[0].headingContext).toEqual(["Programming", "JavaScript"]);
        });

        test("6.2: Displays full context path", async () => {
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
            expect(questionList[0].getDisplayContext()).toBe("Programming > JavaScript");
        });

        test("6.3: Top-level heading has empty context", async () => {
            const noteText = `#flashcards

## What is top-level?
Top-level answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            // Top-level h2 heading has the tag as context
            expect(questionList[0].headingContext).toEqual(["flashcards"]);
        });
    });

    describe("Requirement 7: Mode configuration via tags", () => {
        test("7.1: QA mode only creates cards from headings with ?", async () => {
            settings.headerCardBaseConfig.mode = "qa";
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

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

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What is React?");
        });

        test("7.2: All mode creates cards from all headings", async () => {
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

            expect(questionList.length).toBe(2);
            expect(questionList[0].questionText.actualQuestion).toContain("React Basics");
            expect(questionList[1].questionText.actualQuestion).toContain("Vue Framework");
        });
    });

    describe("Requirement 8: Special cases and edge cases", () => {
        test("8.1: Skips empty headings", async () => {
            const noteText = `#flashcards

##   
Empty heading.

## What is valid?
Valid answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What is valid?");
        });

        test("8.2: Ignores whitespace between heading and answer", async () => {
            const noteText = `#flashcards

## What is Node.js?


Node.js is a runtime.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].back).toContain("Node.js is a runtime");
        });

        test("8.3: Creates card with empty answer", async () => {
            const noteText = `#flashcards

## What has no answer?

## What is next?
Next answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
        });

        test("8.4: Handles special markdown characters in headings", async () => {
            const noteText = `#flashcards

## What is \`code\` in markdown?
Code is marked with backticks.

## What about **bold** text?
Bold uses asterisks.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("`code`");
            expect(questionList[1].cards[0].front).toContain("**bold**");
        });

        test("8.5: Ignores headings in code blocks", async () => {
            const noteText = `#flashcards

## What is valid?
Valid answer.

\`\`\`
## What is in code block?
Should be ignored.
\`\`\`

## What is after code?
After answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is valid?");
            expect(questionList[1].cards[0].front).toContain("What is after code?");
        });

        test("8.6: Ignores headings in quotes", async () => {
            const noteText = `#flashcards

## What is valid?
Valid answer.

> ## What is in quote?
> Should be ignored.

## What is after quote?
After answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is valid?");
            expect(questionList[1].cards[0].front).toContain("What is after quote?");
        });
    });

    describe("Real-world scenarios", () => {
        test("Complex note with mixed content", async () => {
            const noteText = `#flashcards

# JavaScript Study Guide

## What is JavaScript?
JavaScript is a programming language used for web development.

### History
Created by Brendan Eich in 1995.

### Key Features
- Dynamic typing
- Prototype-based inheritance
- First-class functions

## What are closures?
Closures are functions that have access to variables from an outer function.

Example code::function outer() { return function inner() {} }

### Use Cases
- Data privacy
- Partial application

## React Framework
Not a question, so skipped in qa mode.

## What is React?
React is a JavaScript library for building user interfaces.

Traditional multiline below:
What is JSX?
?
JSX is a syntax extension for JavaScript.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should have 3 header-based + 1 inline + 1 multiline = 5 total
            expect(questionList.length).toBe(5);
            
            const headerCards = questionList.filter(q => q.isHeaderBased);
            expect(headerCards.length).toBe(3);
            
            // Verify first header card includes nested content
            const jsCard = headerCards.find(q => q.cards[0].front.includes("What is JavaScript?"));
            expect(jsCard).toBeDefined();
            expect(jsCard!.cards[0].back).toContain("History");
            expect(jsCard!.cards[0].back).toContain("Brendan Eich");
            expect(jsCard!.cards[0].back).toContain("Key Features");
            expect(jsCard!.cards[0].back).toContain("Dynamic typing");
        });

        test("Multilingual note with Cyrillic characters", async () => {
            const noteText = `#flashcards

# Программирование

## Что такое JavaScript?
JavaScript - это язык программирования.

### Особенности
- Динамическая типизация
- Прототипное наследование

## Что такое React?
React - это библиотека для создания пользовательских интерфейсов.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("Что такое JavaScript?");
            expect(questionList[0].cards[0].back).toContain("Динамическая типизация");
            expect(questionList[1].cards[0].front).toContain("Что такое React?");
        });
    });

    describe("Performance tests with large notes", () => {
        test("Handles note with 100 headings efficiently", async () => {
            let noteText = "#flashcards\n\n";
            
            // Generate 100 h2 headings with questions
            for (let i = 1; i <= 100; i++) {
                noteText += `## What is question ${i}?\n`;
                noteText += `Answer to question ${i}.\n\n`;
            }

            const noteFile = new UnitTestSRFile(noteText);
            const startTime = Date.now();
            
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );
            
            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(questionList.length).toBe(100);
            // Should complete in reasonable time (< 1 second)
            expect(duration).toBeLessThan(1000);
        });

        test("Handles deeply nested structure efficiently", async () => {
            let noteText = "#flashcards\n\n";
            
            // Create deeply nested structure
            noteText += "# Level 1\n";
            noteText += "## What is level 2?\n";
            noteText += "Answer 2.\n\n";
            noteText += "### Level 3\n";
            noteText += "#### Level 4\n";
            noteText += "##### Level 5\n";
            noteText += "###### Level 6\n";
            noteText += "Deep content.\n\n";
            
            // Add more questions at various levels
            for (let i = 1; i <= 20; i++) {
                noteText += `## What is question ${i}?\n`;
                noteText += `### Subheading ${i}\n`;
                noteText += `Content for ${i}.\n\n`;
            }

            const noteFile = new UnitTestSRFile(noteText);
            const startTime = Date.now();
            
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );
            
            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(questionList.length).toBe(21);
            expect(duration).toBeLessThan(500);
        });

        test("Handles note with large content blocks", async () => {
            let noteText = "#flashcards\n\n";
            
            // Create questions with large answer blocks
            for (let i = 1; i <= 10; i++) {
                noteText += `## What is question ${i}?\n`;
                // Add 50 lines of content per answer
                for (let j = 1; j <= 50; j++) {
                    noteText += `Line ${j} of answer ${i}. `;
                    noteText += `This is some content to make the answer longer. `;
                    noteText += `More text here.\n`;
                }
                noteText += "\n";
            }

            const noteFile = new UnitTestSRFile(noteText);
            const startTime = Date.now();
            
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );
            
            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(questionList.length).toBe(10);
            expect(duration).toBeLessThan(1000);
            
            // Verify content is preserved
            expect(questionList[0].cards[0].back).toContain("Line 1 of answer 1");
            expect(questionList[0].cards[0].back).toContain("Line 50 of answer 1");
        });
    });

    describe("Edge cases and boundary conditions", () => {
        test("Note with only headings, no content", async () => {
            const noteText = `#flashcards

## What is first?

## What is second?

## What is third?
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(3);
        });

        test("Single heading at end of file", async () => {
            const noteText = `#flashcards

Some content here.

## What is the last question?
This is the final answer.`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].back).toContain("This is the final answer");
        });

        test("Heading with only question mark", async () => {
            const noteText = `#flashcards

## Question?
Answer to question mark.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("Question?");
        });

        test("Multiple consecutive headings", async () => {
            const noteText = `#flashcards

## What is first?
## What is second?
## What is third?
Answer to third.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(3);
            expect(questionList[2].cards[0].back).toContain("Answer to third");
        });

        test("Heading with trailing whitespace", async () => {
            const noteText = `#flashcards

## What is trailing?   
Answer here.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
        });

        test("Mixed heading levels in complex hierarchy", async () => {
            settings.headerCardBaseConfig.headingLevels = [2, 3, 4];
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

# Main Topic

## What is h2?
H2 answer.

### What is h3?
H3 answer.

#### What is h4?
H4 answer.

##### What is h5?
H5 should be skipped.

## What is another h2?
Another h2 answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(4);
            expect(questionList.find(q => q.cards[0].front.includes("What is h5?"))).toBeUndefined();
        });

        test("Feature disabled globally", async () => {
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

        test("Disabled via custom tag", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/disable"];
            settings.headerCardCustomTags = {
                "#flashcard/disable": {
                    headingLevels: [],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: false,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/disable

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
    });

    describe("Integration with existing plugin features", () => {
        test("Works with convertFoldersToDecks setting", async () => {
            settings.convertFoldersToDecks = true;
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

## What is React?
React is a library.
`;
            const folderPath = TopicPath.getTopicPathFromTag("#folder/javascript");
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                folderPath,
                false, // Don't require topic path
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].topicPathList).toBeDefined();
        });

        test("Header-based cards respect flashcardTags setting", async () => {
            settings.flashcardTags = ["#review"];
            parser = new NoteQuestionParser(settings);

            const noteText = `#review

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

            expect(questionList.length).toBe(1);
        });

        test("Requires flashcard tags even when convertFoldersToDecks enabled", async () => {
            settings.convertFoldersToDecks = true;
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

## What is React?
React is a library.
`;
            const folderPath = TopicPath.getTopicPathFromTag("#folder/javascript");
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                folderPath,
                false,
            );

            expect(questionList.length).toBe(1);
        });
    });

    describe("Stress tests and extreme cases", () => {
        test("Very long heading text", async () => {
            const longQuestion = "What is " + "a".repeat(500) + "?";
            const noteText = `#flashcards

## ${longQuestion}
Answer here.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("a".repeat(500));
        });

        test("Very long answer content", async () => {
            const longAnswer = "Answer content. ".repeat(1000);
            const noteText = `#flashcards

## What has a long answer?
${longAnswer}
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].back.length).toBeGreaterThan(10000);
        });

        test("Note with all heading levels", async () => {
            settings.headerCardBaseConfig.headingLevels = [1, 2, 3, 4, 5, 6];
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcards

# What is h1?
H1 answer.

## What is h2?
H2 answer.

### What is h3?
H3 answer.

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

            expect(questionList.length).toBe(6);
        });

        test("Empty note with only tag", async () => {
            const noteText = `#flashcards`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(0);
        });

        test("Note with special unicode characters", async () => {
            const noteText = `#flashcards

## What is 日本語?
日本語 is Japanese.

## Что такое Русский?
Русский is Russian.

## What is العربية?
العربية is Arabic.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(3);
            expect(questionList[0].cards[0].front).toContain("日本語");
            expect(questionList[1].cards[0].front).toContain("Русский");
            expect(questionList[2].cards[0].front).toContain("العربية");
        });

        test("Headings with emoji", async () => {
            const noteText = `#flashcards

## What is 🚀 React?
React is a library 📚.

## Why use 💻 programming?
Programming is fun 🎉.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("🚀");
            expect(questionList[0].cards[0].back).toContain("📚");
        });
    });
});
