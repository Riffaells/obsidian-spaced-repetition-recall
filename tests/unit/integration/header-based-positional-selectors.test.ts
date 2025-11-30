import { NoteQuestionParser } from "src/NoteQuestionParser";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { TopicPath } from "src/TopicPath";
import { TextDirection } from "src/util/TextDirection";
import { UnitTestSRFile } from "../helpers/UnitTestSRFile";

/**
 * Integration tests for positional selectors (Requirement 12)
 * Tests first-N, last-N, nth-N selectors with different heading levels
 * and real-world scenarios like lecture notes
 */
describe("Header-Based Flashcards - Positional Selectors (Requirement 12)", () => {
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

    describe("12.1: first-N selector", () => {
        test("Creates cards from first 2 h2 headings", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/first-2"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/first-2

## What is the first question?
First answer.

## What is the second question?
Second answer.

## What is the third question?
Third answer should not create card.

## What is the fourth question?
Fourth answer should not create card.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from first 2 h2 headings only
            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is the first question?");
            expect(questionList[1].cards[0].front).toContain("What is the second question?");
        });

        test("first-N with N greater than available headings returns all", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/first-10"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/first-10

## What is question 1?
Answer 1.

## What is question 2?
Answer 2.

## What is question 3?
Answer 3.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from all 3 headings
            expect(questionList.length).toBe(3);
        });

        test("first-1 selector creates card from only the first heading", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/first-1"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/first-1

## What is the only question?
Only answer.

## What is the second question?
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
            expect(questionList[0].cards[0].front).toContain("What is the only question?");
        });
    });

    describe("12.2: last-N selector", () => {
        test("Creates cards from last 2 h2 headings", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/last-2"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/last-2

## What is the first question?
First answer should not create card.

## What is the second question?
Second answer should not create card.

## What is the third question?
Third answer.

## What is the fourth question?
Fourth answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from last 2 h2 headings only
            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is the third question?");
            expect(questionList[1].cards[0].front).toContain("What is the fourth question?");
        });

        test("last-N with N greater than available headings returns all", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/last-10"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/last-10

## What is question 1?
Answer 1.

## What is question 2?
Answer 2.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from all 2 headings
            expect(questionList.length).toBe(2);
        });

        test("last-1 selector creates card from only the last heading", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/last-1"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/last-1

## What is the first question?
Should not create card.

## What is the last question?
Last answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What is the last question?");
        });
    });

    describe("12.3: nth-N selector", () => {
        test("Creates card from the 3rd h2 heading", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/nth-3"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/nth-3

## What is question 1?
Answer 1 should not create card.

## What is question 2?
Answer 2 should not create card.

## What is question 3?
Answer 3.

## What is question 4?
Answer 4 should not create card.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create card from 3rd heading only
            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What is question 3?");
        });

        test("nth-1 selector creates card from the first heading", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/nth-1"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/nth-1

## What is the first question?
First answer.

## What is the second question?
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
            expect(questionList[0].cards[0].front).toContain("What is the first question?");
        });

        test("nth-N with N greater than available headings creates no cards", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/nth-10"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/nth-10

## What is question 1?
Answer 1.

## What is question 2?
Answer 2.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create no cards
            expect(questionList.length).toBe(0);
        });
    });

    describe("12.4: Selectors with different heading levels", () => {
        test("first-N selector works with h3 headings", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h3", "#flashcard/first-2"];
            settings.headerCardCustomTags = {
                "#flashcard/h3": {
                    headingLevels: [3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h3 #flashcard/first-2

## Section

### What is the first h3 question?
First h3 answer.

### What is the second h3 question?
Second h3 answer.

### What is the third h3 question?
Should not create card.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is the first h3 question?");
            expect(questionList[1].cards[0].front).toContain("What is the second h3 question?");
        });

        test("last-N selector works with h1 headings", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h1", "#flashcard/last-1"];
            settings.headerCardCustomTags = {
                "#flashcard/h1": {
                    headingLevels: [1],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h1 #flashcard/last-1

# What is the first h1 question?
Should not create card.

# What is the second h1 question?
Should not create card.

# What is the last h1 question?
Last h1 answer.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What is the last h1 question?");
        });

        test("Selector applies to all matched heading levels globally", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/h3", "#flashcard/first-1"];
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

            const noteText = `#flashcard/h2 #flashcard/h3 #flashcard/first-1

## What is the first h2 question?
First h2 answer.

## What is the second h2 question?
Should not create card.

### What is the first h3 question?
First h3 answer.

### What is the second h3 question?
Should not create card.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create only the first heading overall (first h2)
            // Positional selectors apply globally to all matched headings
            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What is the first h2 question?");
        });
    });

    describe("12.5: Real-world scenario - Lecture notes", () => {
        test("Lecture notes with last-3 selector for review questions", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h3", "#flashcard/last-3"];
            settings.headerCardCustomTags = {
                "#flashcard/h3": {
                    headingLevels: [3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h3 #flashcard/last-3

# JavaScript Lecture - Week 5

## Introduction
Overview of today's topics.

## Core Concepts
Detailed explanation of closures and scope.

## Examples
Code examples demonstrating the concepts.

## Practice Problems
Hands-on exercises for students.

## Review Questions

### What is a closure?
A closure is a function that has access to variables from an outer scope.

### Why are closures useful?
Closures allow for data privacy and function factories.

### How do you create a closure?
By defining a function inside another function and returning it.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from last 3 h3 headings (all the review questions)
            expect(questionList.length).toBe(3);
            
            // Check that we got cards from the review questions section
            const fronts = questionList.map(q => q.cards[0].front);
            expect(fronts.some(f => f.includes("What is a closure?"))).toBe(true);
            expect(fronts.some(f => f.includes("Why are closures useful?"))).toBe(true);
            expect(fronts.some(f => f.includes("How do you create a closure?"))).toBe(true);
        });

        test("Study guide with first-5 selector for key concepts", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h3", "#flashcard/first-5"];
            settings.headerCardCustomTags = {
                "#flashcard/h3": {
                    headingLevels: [3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h3 #flashcard/first-5

# Computer Science Study Guide

## Fundamentals

### What is an algorithm?
A step-by-step procedure for solving a problem.

### What is Big O notation?
A way to describe the performance of an algorithm.

### What is recursion?
A function that calls itself.

### What is a data structure?
A way to organize and store data.

### What is abstraction?
Hiding complex details behind a simple interface.

### What is encapsulation?
Bundling data and methods that operate on that data.

### What is polymorphism?
The ability to take many forms.

### What is inheritance?
A mechanism for creating new classes based on existing ones.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from first 5 h3 headings only
            expect(questionList.length).toBe(5);
            expect(questionList[0].cards[0].front).toContain("What is an algorithm?");
            expect(questionList[1].cards[0].front).toContain("What is Big O notation?");
            expect(questionList[2].cards[0].front).toContain("What is recursion?");
            expect(questionList[3].cards[0].front).toContain("What is a data structure?");
            expect(questionList[4].cards[0].front).toContain("What is abstraction?");
        });

        test("Meeting notes with nth-2 selector for action items", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/nth-2"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/nth-2

# Team Meeting - 2024-01-15

## What was discussed in the agenda?
Topics to discuss today.

## What are the action items from last meeting?
Review and complete assigned tasks.

## What were the main discussion points?
Various topics discussed.

## What are the next steps?
Planning for next sprint.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create card from 2nd h2 heading with "?" only
            expect(questionList.length).toBe(1);
            expect(questionList[0].cards[0].front).toContain("What are the action items from last meeting?");
        });

        test("Book notes with last-5 selector for chapter summaries", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2", "#flashcard/last-5"];
            settings.headerCardCustomTags = {
                "#flashcard/h2": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            };
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2 #flashcard/last-5

# Book: Clean Code

## Chapter 1: Clean Code
Introduction to clean code principles.

## Chapter 2: Meaningful Names
How to choose good names.

## Chapter 3: Functions
Writing clean functions.

## Chapter 4: Comments
When and how to comment.

## Chapter 5: Formatting
Code formatting best practices.

## What is the main takeaway from Chapter 3?
Functions should be small and do one thing.

## What is the main takeaway from Chapter 4?
Comments should explain why, not what.

## What is the main takeaway from Chapter 5?
Consistent formatting improves readability.

## What is the key principle of clean code?
Code should be readable and maintainable.

## What is the most important lesson?
Always leave code better than you found it.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from last 5 h2 headings with questions
            expect(questionList.length).toBe(5);
            const fronts = questionList.map(q => q.cards[0].front);
            expect(fronts.some(f => f.includes("What is the main takeaway from Chapter 3?"))).toBe(true);
            expect(fronts.some(f => f.includes("What is the main takeaway from Chapter 4?"))).toBe(true);
            expect(fronts.some(f => f.includes("What is the main takeaway from Chapter 5?"))).toBe(true);
            expect(fronts.some(f => f.includes("What is the key principle of clean code?"))).toBe(true);
            expect(fronts.some(f => f.includes("What is the most important lesson?"))).toBe(true);
        });
    });

    describe("12.6: Composite tags with positional selectors (Requirement 12.6)", () => {
        test("Composite tag #flashcards/h2/qa/last-2 applies all rules", async () => {
            settings.flashcardTags = ["#flashcards", "#flashcard/h2/qa/last-2"];
            settings.headerCardCustomTags = {};
            parser = new NoteQuestionParser(settings);

            const noteText = `#flashcard/h2/qa/last-2

# Lecture Notes

## Introduction
Not a question, should not create card.

## What is the first concept?
First concept explanation.

## Examples
Not a question, should not create card.

## What is the second concept?
Second concept explanation.

## What is the third concept?
Third concept explanation.
`;
            const noteFile = new UnitTestSRFile(noteText);
            const questionList = await parser.createQuestionList(
                noteFile,
                TextDirection.Ltr,
                TopicPath.emptyPath,
                true,
            );

            // Should create cards from last 2 h2 headings with "?" (qa mode)
            expect(questionList.length).toBe(2);
            expect(questionList[0].cards[0].front).toContain("What is the second concept?");
            expect(questionList[1].cards[0].front).toContain("What is the third concept?");
        });
    });
});
