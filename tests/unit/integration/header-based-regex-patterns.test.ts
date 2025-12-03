import { Question } from "src/Question";
import { NoteQuestionParser } from "src/parser/NoteQuestionParser";
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



    describe("Range regex patterns", () => {
        test("Range regex #вопросы/h[2-4] matches h2, h3, h4", async () => {
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-4",
                    name: "Test Rule for #вопросы/h[2-4]",
                    tagPattern: "^#вопросы/h[2-4]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [2, 3, 4],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-5",
                    name: "Test Rule for #study/h[1-3]",
                    tagPattern: "^#study/h[1-3]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [1, 2, 3],
                        nestingMode: "flat",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-6",
                    name: "Test Rule for #questions/h[3-5]",
                    tagPattern: "^#questions/h[3-5]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [3, 4, 5],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "all",
                        qaSeparator: "?",
                    },
                }
            );
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-7",
                    name: "Test Rule for #учеба/h[12]",
                    tagPattern: "^#учеба/h[12]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [1, 2],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "all",
                        qaSeparator: "?",
                    },
                }
            );
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-8",
                    name: "Test Rule for #notes/h[2-3]",
                    tagPattern: "^#notes/h[2-3]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [2, 3],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
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

            settings.flashcardTagRules.push(
                {
                    id: "test-rule-9a",
                    name: "Test Rule for #study/h[12]",
                    tagPattern: "^#study/h[12]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [1, 2],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "all",
                        qaSeparator: "?",
                    },
                },
                {
                    id: "test-rule-9b",
                    name: "Test Rule for #review/h[34]",
                    tagPattern: "^#review/h[34]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [3, 4],
                        nestingMode: "flat",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
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
            
            const h2Cards = questionList.filter((q: Question) => 
                q.questionText.actualQuestion.includes("React Basics") ||
                q.questionText.actualQuestion.includes("Vue Framework")
            );
            expect(h2Cards.length).toBe(2);
            
            const h3Cards = questionList.filter((q: Question) => 
                q.cards[0].front.includes("What is React?") ||
                q.cards[0].front.includes("What is Vue?")
            );
            expect(h3Cards.length).toBe(2);
            
            // Verify flat mode for h3
            const reactCard = h3Cards.find((q: Question) => q.cards[0].front.includes("What is React?"));
            expect(reactCard!.cards[0].back).not.toContain("Details");
        });
    });

    describe("Regex with composite tags", () => {
        test("Regex pattern with composite tag structure", async () => {
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-10",
                    name: "Test Rule for #study/h[23]",
                    tagPattern: "^#study/h[23]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [2, 3],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-11a",
                    name: "Test Rule for #learn/h[12]",
                    tagPattern: "^#learn/h[12]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [1, 2],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                },
                {
                    id: "test-rule-11b",
                    name: "Test Rule for #learn/all",
                    tagPattern: "^#learn/all$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "all",
                        qaSeparator: "?",
                    },
                }
            );
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-12a",
                    name: "Test Rule for #test/h[23]",
                    tagPattern: "^#test/h[23]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [2, 3],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                },
                {
                    id: "test-rule-12b",
                    name: "Test Rule for #test/flat",
                    tagPattern: "^#test/flat$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [],
                        nestingMode: "flat",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-13a",
                    name: "Test Rule for #study/h[123]",
                    tagPattern: "^#study/h[123]$",
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
            );
            // This test has a tag that doesn't match the regex, so it should fallback to composite parsing
            // However, the tag needs to be included in flashcardTagRules for SettingsUtil.isFlashcardTag to return true
            // if we are testing a non-matching tag. In this case, #study/h5.
            settings.flashcardTagRules.push({
                id: "test-rule-13b",
                name: "Test Rule for #study/h5",
                tagExact: "#study/h5",
                enabled: true,
                priority: 0,
                source: "tag", // This needs to be a "tag" source to avoid header rules conflict.
            });
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-14a",
                    name: "Test Rule for #test/h[12]",
                    tagPattern: "^#test/h[12]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [1, 2],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                },
                {
                    id: "test-rule-14b",
                    name: "Test Rule for #test/h[23]",
                    tagPattern: "^#test/h[23]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [2, 3],
                        nestingMode: "flat",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "all",
                        qaSeparator: "?",
                    },
                }
            );
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-15a",
                    name: "Test Rule for #test-notes/h[12]",
                    tagPattern: "^#test-notes/h[12]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [1, 2],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
            // Include the specific tag for the parser to pick up
            settings.flashcardTagRules.push({
                id: "test-rule-15b",
                name: "Test Rule for #test-notes/h2",
                tagExact: "#test-notes/h2",
                enabled: true,
                priority: 0,
                source: "tag",
            });
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-16a",
                    name: "Test Rule for #вопросы/h[12]",
                    tagPattern: "^#вопросы/h[12]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [1, 2],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
            // Include the specific tag for the parser to pick up
            settings.flashcardTagRules.push({
                id: "test-rule-16b",
                name: "Test Rule for #вопросы/h2",
                tagExact: "#вопросы/h2",
                enabled: true,
                priority: 0,
                source: "tag",
            });
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-17",
                    name: "Test Rule for #disabled/h[12]",
                    tagPattern: "^#disabled/h[12]$",
                    patternFlags: "",
                    enabled: false, // This rule is explicitly disabled
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [1, 2],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
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
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-18a",
                    name: "Test Rule for #study/h[12]",
                    tagPattern: "^#study/h[12]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [1, 2],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "all",
                        qaSeparator: "?",
                    },
                },
                {
                    id: "test-rule-18b",
                    name: "Test Rule for #review/h[34]",
                    tagPattern: "^#review/h[34]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [3, 4],
                        nestingMode: "flat",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
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
            
            const h2Cards = questionList.filter((q: Question) => 
                q.questionText.actualQuestion.includes("JavaScript Basics") ||
                q.questionText.actualQuestion.includes("TypeScript")
            );
            expect(h2Cards.length).toBe(2);
            
            const h3Cards = questionList.filter((q: Question) => 
                q.cards[0].front.includes("What is a variable?") ||
                q.cards[0].front.includes("What is a type?")
            );
            expect(h3Cards.length).toBe(2);
        });

        test("Regex pattern with all heading levels", async () => {
            settings.flashcardTagRules.push(
                {
                    id: "test-rule-19",
                    name: "Test Rule for #all/h[1-6]",
                    tagPattern: "^#all/h[1-6]$",
                    patternFlags: "",
                    enabled: true,
                    priority: 0,
                    source: "header",
                    headerRules: {
                        headingLevels: [1, 2, 3, 4, 5, 6],
                        nestingMode: "nested",
                        selectors: [],
                        includeParents: 1,
                        cardMode: "qa",
                        qaSeparator: "?",
                    },
                }
            );
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
