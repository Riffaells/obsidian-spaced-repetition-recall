import { NoteQuestionParser } from "src/NoteQuestionParser";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { TopicPath } from "src/TopicPath";
import { TextDirection } from "src/util/TextDirection";
import { UnitTestSRFile } from "../helpers/UnitTestSRFile";

/**
 * Integration tests for regex patterns (Requirements 9, 14)
 * Tests regex pattern matching in custom tags
 */
describe("Header-Based Flashcards - Regex Patterns (Requirements 9, 14)", () => {
    let settings: SRSettings;
    let parser: NoteQuestionParser;

    beforeEach(() => {
        settings = {
            ...DEFAULT_SETTINGS,
            flashcardTagRules: [], // Initialize with an empty array
        };
        parser = new NoteQuestionParser(settings);
    });

    describe("Simple regex patterns", () => {
        test("Simple regex #flashcards/h[123] matches h1, h2, h3", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard"];
            settings.headerCardCustomTags = {
                "#flashcard/h[123]": {
                    headingLevels: [1, 2, 3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
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

            // Tag #flashcard/h2 should match the regex pattern #flashcard/h[123]
            // The regex config has headingLevels: [1, 2, 3], so all h1, h2, h3 with "?" should create cards
            expect(questionList.length).toBe(3);
            expect(questionList[0].cards[0].front).toContain("What is h1?");
            expect(questionList[1].cards[0].front).toContain("What is h2?");
            expect(questionList[2].cards[0].front).toContain("What is h3?");
        });

        test("Simple regex #flashcards/h[456] matches h4, h5, h6", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard"];
            settings.headerCardCustomTags = {
                "#flashcard/h[456]": {
                    headingLevels: [4, 5, 6],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
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

            // Tags #flashcard/h4, #flashcard/h5, #flashcard/h6 should all match the regex pattern
            // The regex config has headingLevels: [4, 5, 6], so all h4, h5, h6 with "?" should create cards
            expect(questionList.length).toBe(3);
            expect(questionList[0].cards[0].front).toContain("What is h4?");
            expect(questionList[1].cards[0].front).toContain("What is h5?");
            expect(questionList[2].cards[0].front).toContain("What is h6?");
        });

        test("Simple regex with all mode #flashcards/h[23] in all mode", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#flashcard/h[23]": {
                    headingLevels: [2, 3],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
            };
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

            // All h2 and h3 headings should create cards (all mode)
            expect(questionList.length).toBe(4);
        });
    });

    describe("Range regex patterns", () => {
        test("Range regex #вопросы/h[2-4] matches h2, h3, h4", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#вопросы/h[2-4]": {
                    headingLevels: [2, 3, 4],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#вопросы/h2 #вопросы/h3 #вопросы/h4

# What is h1?
Should not match.

## Что такое h2?
H2 ответ.

### Что такое h3?
H3 ответ.

#### Что такое h4?
H4 ответ.

##### What is h5?
Should not match.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Tags should match the regex pattern #вопросы/h[2-4]
            expect(questionList.length).toBe(3);
            expect(questionList[0].cards[0].front).toContain("Что такое h2?");
            expect(questionList[1].cards[0].front).toContain("Что такое h3?");
            expect(questionList[2].cards[0].front).toContain("Что такое h4?");
        });

        test("Range regex #study/h[1-3] with flat mode", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#study/h[1-3]": {
                    headingLevels: [1, 2, 3],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#study/h1 #study/h2

# What is h1?
H1 answer.

## Subheading
Should not be included (flat mode).

## What is h2?
H2 answer.

### Another subheading
Should not be included.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is h1?");
            expect(questionList[1].cards[0].front).toContain("What is h2?");
            
            // Verify flat mode - no subheadings
            expect(questionList[0].cards[0].back).not.toContain("Subheading");
            expect(questionList[1].cards[0].back).not.toContain("Another subheading");
        });

        test("Range regex #questions/h[3-5] with all mode", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#questions/h[3-5]": {
                    headingLevels: [3, 4, 5],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#questions/h3 #questions/h4 #questions/h5

## Section

### First h3
First content.

#### First h4
H4 content.

##### First h5
H5 content.

### Second h3
Second content.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // All h3, h4, h5 headings should create cards (all mode)
            expect(questionList.length).toBe(4);
        });
    });

    describe("Custom regex patterns", () => {
        test("Custom prefix with regex #учеба/h[12]", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#учеба/h[12]": {
                    headingLevels: [1, 2],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#учеба/h1 #учеба/h2

# JavaScript
JS content.

## Переменные
Variables content.

### Детали
Details content.

## Функции
Functions content.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // All h1 and h2 headings should create cards (all mode)
            // h3 "Детали" is nested under h2 "Переменные", so it's included in that card's answer
            expect(questionList.length).toBe(3);
            expect(questionList[0].questionText.actualQuestion).toContain("JavaScript");
            expect(questionList[1].questionText.actualQuestion).toContain("Переменные");
            expect(questionList[2].questionText.actualQuestion).toContain("Функции");
        });

        test("Custom prefix with range #notes/h[2-3]", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#notes/h[2-3]": {
                    headingLevels: [2, 3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#notes/h2 #notes/h3

## What is React?
React is a library.

### What is JSX?
JSX is a syntax extension.

## Vue Framework
Not a question, skipped.

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

            // Only headings with "?" should create cards (qa mode)
            expect(questionList.length).toBe(3);
            expect(questionList[0].cards[0].front).toContain("What is React?");
            expect(questionList[1].cards[0].front).toContain("What is JSX?");
            expect(questionList[2].cards[0].front).toContain("What is Vue Router?");
        });

        test("Multiple custom regex patterns in same note", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#study/h[12]": {
                    headingLevels: [1, 2],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
                "#review/h[34]": {
                    headingLevels: [3, 4],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#study/h2 #review/h3

## React Basics
H2 content (all mode).

### What is React?
H3 content (qa mode).

#### Details
Should not be included (flat mode for h3).

## Vue Framework
H2 content (all mode).

### What is Vue?
H3 content (qa mode).
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create:
            // - 2 h2 cards (all mode from #study/h[12])
            // - 2 h3 cards (qa mode from #review/h[34])
            // - 2 h4 cards (nested under h3, but also matching #review/h[34] which includes h4)
            // Actually, h4 "Details" doesn't have "?" so it won't create a card in qa mode
            expect(questionList.length).toBe(4);
            
            const h2Cards = questionList.filter(q => 
                q.questionText.actualQuestion.includes("React Basics") ||
                q.questionText.actualQuestion.includes("Vue Framework")
            );
            expect(h2Cards.length).toBe(2);
            
            const h3Cards = questionList.filter(q => 
                q.cards[0].front.includes("What is React?") ||
                q.cards[0].front.includes("What is Vue?")
            );
            expect(h3Cards.length).toBe(2);
            
            // Verify flat mode for h3
            const reactCard = h3Cards.find(q => q.cards[0].front.includes("What is React?"));
            expect(reactCard!.cards[0].back).not.toContain("Details");
        });
    });

    describe("Regex with composite tags", () => {
        test("Regex pattern with composite tag structure", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#study/h[23]": {
                    headingLevels: [2, 3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#study/h2

## What is first?
First answer.

### What is nested?
Nested answer.

#### Deep content
Should be included (nested mode).

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

            // Tag #study/h2 should match regex #study/h[23]
            // The regex config has headingLevels: [2, 3], so both h2 and h3 with "?" should create cards
            expect(questionList.length).toBe(3);
            expect(questionList[0].cards[0].front).toContain("What is first?");
            expect(questionList[1].cards[0].front).toContain("What is nested?");
            expect(questionList[2].cards[0].front).toContain("What is second?");
            
            // Verify nested mode includes subheadings
            expect(questionList[1].cards[0].back).toContain("Deep content");
        });

        test("Regex pattern combined with mode override", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#learn/h[12]": {
                    headingLevels: [1, 2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#learn/all": {
                    headingLevels: [],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#learn/h2 #learn/all

## React Basics
Not a question, but creates card (all mode wins).

## What is React?
React is a library.

## Vue Framework
Also creates card (all mode).

### Nested content
Also creates card (base config h2, but all mode applies to all levels).
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // All h2 headings should create cards (all mode wins)
            // The #learn/all tag has empty headingLevels, so it uses base config [2]
            // But all mode means all h2 headings create cards
            expect(questionList.length).toBe(4);
        });

        test("Regex pattern with flat mode override", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#test/h[23]": {
                    headingLevels: [2, 3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#test/flat": {
                    headingLevels: [],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#test/h2 #test/flat

## What is first?
First answer.

### Subheading
Should not be included (flat mode wins).

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
            expect(questionList[0].cards[0].back).not.toContain("Subheading");
        });
    });

    describe("Edge cases with regex patterns", () => {
        test("Regex pattern that matches no tags in note", async () => {
            settings.flashcardTags = ["#flashcards", "#study/h5"];
            settings.headerCardCustomTags = {
                "#study/h[123]": {
                    headingLevels: [1, 2, 3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#study/h5

## What is h2?
Should not match (h5 doesn't match [123]).

##### What is h5?
H5 answer, but h5 not in regex pattern.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Tag #study/h5 doesn't match #study/h[123], so it will be parsed as composite tag
            // with h5 level, but base config only has h2, so no cards should be created
            // unless the composite parsing adds h5 to the levels
            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What is h5?");
        });

        test("Multiple regex patterns matching same tag", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#test/h[12]": {
                    headingLevels: [1, 2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
                "#test/h[23]": {
                    headingLevels: [2, 3],
                    nestingMode: "flat",
                    mode: "all",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#test/h2

## React Basics
Not a question, but creates card (all mode from second pattern).

### Subheading
Should not be included (flat mode from second pattern).
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // The tag #test/h2 matches the first regex pattern #test/h[12] and stops there
            // So it uses qa mode and nested mode from the first pattern
            // Only h2 headings with "?" should create cards
            expect(questionList.length).toBe(0);
        });

        test("Regex pattern with special characters in prefix", async () => {
            settings.flashcardTags = ["#flashcards", "#test-notes/h2"];
            settings.headerCardCustomTags = {
                "#test-notes/h[12]": {
                    headingLevels: [1, 2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#test-notes/h2

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

        test("Regex pattern with unicode characters", async () => {
            settings.flashcardTags = ["#flashcards", "#вопросы/h2"];
            settings.headerCardCustomTags = {
                "#вопросы/h[12]": {
                    headingLevels: [1, 2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#вопросы/h2

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

        test("Regex pattern with disabled config", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#disabled/h[12]": {
                    headingLevels: [1, 2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: false,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#disabled/h2

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

            // Disabled config should not create cards
            expect(questionList.length).toBe(0);
        });
    });

    describe("Complex regex scenarios", () => {
        test("Combining multiple regex patterns with different modes", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#study/h[12]": {
                    headingLevels: [1, 2],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                },
                "#review/h[34]": {
                    headingLevels: [3, 4],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#study/h2 #review/h3

## JavaScript Basics
H2 content (all mode).

### What is a variable?
H3 content (qa mode).

#### Details
Should not be included (flat mode).

## TypeScript
H2 content (all mode).

### What is a type?
H3 content (qa mode).

### Interfaces
Not a question, skipped (qa mode).
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create:
            // - 2 h2 cards (all mode from #study/h[12])
            // - 2 h3 cards with "?" (qa mode from #review/h[34])
            expect(questionList.length).toBe(4);
            
            const h2Cards = questionList.filter(q => 
                q.questionText.actualQuestion.includes("JavaScript Basics") ||
                q.questionText.actualQuestion.includes("TypeScript")
            );
            expect(h2Cards.length).toBe(2);
            
            const h3Cards = questionList.filter(q => 
                q.cards[0].front.includes("What is a variable?") ||
                q.cards[0].front.includes("What is a type?")
            );
            expect(h3Cards.length).toBe(2);
        });

        test("Regex pattern with all heading levels", async () => {
            settings.flashcardTags = ["#flashcards"];
            settings.headerCardCustomTags = {
                "#all/h[1-6]": {
                    headingLevels: [1, 2, 3, 4, 5, 6],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#all/h1 #all/h2 #all/h3 #all/h4 #all/h5 #all/h6

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

            // All heading levels should create cards
            expect(questionList.length).toBe(6);
        });
    });
});
