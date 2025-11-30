import { HeaderBasedCardParser, HeaderBasedCardParserOptions } from "src/parser/header-based/HeaderBasedCardParser";
import { HeaderCardConfig } from "src/parser/header-based/types";
import { CardType } from "src/Question";

describe("HeaderBasedCardParser", () => {
    let parser: HeaderBasedCardParser;
    let defaultConfig: HeaderCardConfig;
    let options: HeaderBasedCardParserOptions;

    beforeEach(() => {
        defaultConfig = {
            headingLevels: [2],
            nestingMode: "nested",
            mode: "qa",
            enabled: true,
        };

        options = {
            enableHeaderCards: true,
            defaultConfig: defaultConfig,
            customTags: new Map(),
        };

        parser = new HeaderBasedCardParser(options);
    });

    describe("parse - basic functionality", () => {
        test("Returns empty array when header cards are disabled", () => {
            const disabledOptions: HeaderBasedCardParserOptions = {
                ...options,
                enableHeaderCards: false,
            };
            const disabledParser = new HeaderBasedCardParser(disabledOptions);

            const noteText = "## What is React?\nReact is a library.";
            const noteLines = noteText.split("\n");
            const result = disabledParser.parse(noteText, [], noteLines);

            expect(result).toEqual([]);
        });

        test("Parses simple h2 heading with question mark", () => {
            const noteText = `## What is React?
React is a JavaScript library.`;
            const noteLines = noteText.split("\n");
            const result = parser.parse(noteText, [], noteLines);

            expect(result).toHaveLength(1);
            expect(result[0].cardType).toBe(CardType.MultiLineBasic);
            expect(result[0].text).toContain("What is React?");
            expect(result[0].text).toContain("React is a JavaScript library.");
            expect(result[0].firstLineNum).toBe(0);
        });

        test("Ignores headings without question mark in qa mode", () => {
            const noteText = `## React Basics
This is not a question.

## What is React?
React is a library.`;
            const noteLines = noteText.split("\n");
            const result = parser.parse(noteText, [], noteLines);

            expect(result).toHaveLength(1);
            expect(result[0].text).toContain("What is React?");
        });

        test("Includes all headings in all mode", () => {
            const allModeConfig: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "all",
                enabled: true,
            };

            const allModeOptions: HeaderBasedCardParserOptions = {
                enableHeaderCards: true,
                defaultConfig: allModeConfig,
                customTags: new Map(),
            };

            const allModeParser = new HeaderBasedCardParser(allModeOptions);

            const noteText = `## React Basics
This is content.

## What is React?
React is a library.`;
            const noteLines = noteText.split("\n");
            const result = allModeParser.parse(noteText, [], noteLines);

            expect(result).toHaveLength(2);
        });
    });

    describe("resolveConfig - tag-based configuration", () => {
        test("Uses default config when no tags match", () => {
            const noteText = "## What is React?\nReact is a library.";
            const noteLines = noteText.split("\n");
            const result = parser.parse(noteText, ["#unrelated"], noteLines);

            // Should use default config (h2, qa mode)
            expect(result).toHaveLength(1);
        });

        test("Uses custom tag config when tag matches", () => {
            const customConfig: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "flat",
                mode: "all",
                enabled: true,
            };

            const customOptions: HeaderBasedCardParserOptions = {
                enableHeaderCards: true,
                defaultConfig: defaultConfig,
                customTags: new Map([["#flashcard/h3", customConfig]]),
            };

            const customParser = new HeaderBasedCardParser(customOptions);

            const noteText = `### React Component
This is a component.`;
            const noteLines = noteText.split("\n");
            const result = customParser.parse(noteText, ["#flashcard/h3"], noteLines);

            expect(result).toHaveLength(1);
            expect(result[0].text).toContain("React Component");
        });
    });

    describe("convertHeadingToQuestion - content extraction", () => {
        test("Extracts content until next same-level heading in nested mode", () => {
            const noteText = `## What is React?
React is a library.

### Features
- Component-based
- Virtual DOM

## What is Vue?
Vue is a framework.`;
            const noteLines = noteText.split("\n");
            const result = parser.parse(noteText, [], noteLines);

            expect(result).toHaveLength(2);
            expect(result[0].text).toContain("Features");
            expect(result[0].text).toContain("Virtual DOM");
            expect(result[0].text).not.toContain("What is Vue?");
        });

        test("Stops at first subheading in flat mode", () => {
            const flatConfig: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "flat",
                mode: "qa",
                enabled: true,
            };

            const flatOptions: HeaderBasedCardParserOptions = {
                enableHeaderCards: true,
                defaultConfig: flatConfig,
                customTags: new Map(),
            };

            const flatParser = new HeaderBasedCardParser(flatOptions);

            const noteText = `## What is React?
React is a library.

### Features
This should not be included.`;
            const noteLines = noteText.split("\n");
            const result = flatParser.parse(noteText, [], noteLines);

            expect(result).toHaveLength(1);
            expect(result[0].text).toContain("React is a library.");
            expect(result[0].text).not.toContain("Features");
        });
    });

    describe("Integration Tests", () => {
        describe("Simple note with h2 headings", () => {
            test("Parses multiple h2 questions in a simple note", () => {
                const noteText = `# JavaScript Basics

## What is React?
React is a JavaScript library for building user interfaces.

## Why is React popular?
React is popular due to its component-based approach and virtual DOM.

## Components
This is not a question, so it should be skipped.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is React?");
                expect(result[0].text).toContain("JavaScript library");
                expect(result[1].text).toContain("Why is React popular?");
                expect(result[1].text).toContain("component-based approach");
            });

            test("Handles empty answers gracefully", () => {
                const noteText = `## What is TypeScript?

## What is Vue?
Vue is a progressive framework.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is TypeScript?");
                expect(result[1].text).toContain("What is Vue?");
            });

            test("Handles whitespace between heading and answer", () => {
                const noteText = `## What is Node.js?


Node.js is a JavaScript runtime.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("What is Node.js?");
                expect(result[0].text).toContain("Node.js is a JavaScript runtime.");
            });
        });

        describe("Nested structure", () => {
            test("Includes all subheadings in nested mode", () => {
                const noteText = `## What is TypeScript?
TypeScript is a superset of JavaScript with static typing.

### Main advantages
- Static typing
- Better IDE support
- Early error detection

### Disadvantages
- Additional compilation step
- Learning curve

## What is Vue?
Vue is a progressive framework.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is TypeScript?");
                expect(result[0].text).toContain("Main advantages");
                expect(result[0].text).toContain("Static typing");
                expect(result[0].text).toContain("Disadvantages");
                expect(result[0].text).toContain("Learning curve");
                expect(result[0].text).not.toContain("What is Vue?");
            });

            test("Handles deeply nested headings", () => {
                const noteText = `## What is programming?
Programming is writing instructions for computers.

### Languages
Different programming languages exist.

#### JavaScript
Used for web development.

##### Frameworks
React, Vue, Angular.

## What is debugging?
Finding and fixing errors.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("Languages");
                expect(result[0].text).toContain("JavaScript");
                expect(result[0].text).toContain("Frameworks");
                expect(result[0].text).toContain("React, Vue, Angular");
                expect(result[0].text).not.toContain("What is debugging?");
            });

            test("Stops at same-level heading in nested mode", () => {
                const noteText = `## What is a variable?
A variable is a named memory location.

### Types of variables
- let
- const
- var

### Scope
Variables have block scope.

## What is a function?
A function is a block of code.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("Types of variables");
                expect(result[0].text).toContain("Scope");
                expect(result[0].text).not.toContain("What is a function?");
            });
        });

        describe("Flat mode", () => {
            test("Stops at first subheading in flat mode", () => {
                const flatConfig: HeaderCardConfig = {
                    headingLevels: [2],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                };

                const flatOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: flatConfig,
                    customTags: new Map(),
                };

                const flatParser = new HeaderBasedCardParser(flatOptions);

                const noteText = `## What is TypeScript?
TypeScript is a superset of JavaScript.

### Main advantages
This should not be included.`;
                const noteLines = noteText.split("\n");
                const result = flatParser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("TypeScript is a superset");
                expect(result[0].text).not.toContain("Main advantages");
            });

            test("Includes content until first subheading in flat mode", () => {
                const flatConfig: HeaderCardConfig = {
                    headingLevels: [2],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                };

                const flatOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: flatConfig,
                    customTags: new Map(),
                };

                const flatParser = new HeaderBasedCardParser(flatOptions);

                const noteText = `## What is React?
React is a library.
It's used for building UIs.

### Features
Not included.`;
                const noteLines = noteText.split("\n");
                const result = flatParser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("React is a library.");
                expect(result[0].text).toContain("It's used for building UIs.");
                expect(result[0].text).not.toContain("Features");
            });

            test("Works with multiple questions in flat mode", () => {
                const flatConfig: HeaderCardConfig = {
                    headingLevels: [2],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                };

                const flatOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: flatConfig,
                    customTags: new Map(),
                };

                const flatParser = new HeaderBasedCardParser(flatOptions);

                const noteText = `## What is Vue?
Vue is a framework.

### Details
Not included.

## What is Angular?
Angular is a platform.

### More info
Also not included.`;
                const noteLines = noteText.split("\n");
                const result = flatParser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("Vue is a framework.");
                expect(result[0].text).not.toContain("Details");
                expect(result[1].text).toContain("Angular is a platform.");
                expect(result[1].text).not.toContain("More info");
            });
        });

        describe("Mixed formats (headers + multiline + inline)", () => {
            test("Creates cards from both header and inline formats", () => {
                const noteText = `## What is Vue?
Vue is a progressive JavaScript framework.

Inline card: Author of Vue::Evan You

## Why is Vue simple?
Vue has a simple API and good documentation.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                // Should only get header-based cards (2)
                // The inline card would be parsed by the main parser, not HeaderBasedCardParser
                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is Vue?");
                expect(result[0].text).toContain("progressive JavaScript framework");
                expect(result[1].text).toContain("Why is Vue simple?");
            });

            test("Creates cards from both header and multiline formats", () => {
                const noteText = `## What is Vue?
Vue is a progressive framework.

How to install Vue?
?
npm install vue

## Why is Vue popular?
Vue is easy to learn.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                // Should get 2 header-based cards
                // The multiline card would be parsed by the main parser
                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is Vue?");
                expect(result[1].text).toContain("Why is Vue popular?");
            });

            test("Header-based cards work alongside existing formats in nested content", () => {
                const noteText = `## What is React?
React is a library.

### Installation
Install with: Package manager::npm

### Usage
Create components.

## What is JSX?
JSX is a syntax extension.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is React?");
                expect(result[0].text).toContain("Installation");
                expect(result[0].text).toContain("Package manager::npm");
                expect(result[1].text).toContain("What is JSX?");
            });
        });

        describe("Custom tags", () => {
            test("Uses custom tag configuration for h3 headings", () => {
                const customConfig: HeaderCardConfig = {
                    headingLevels: [3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                };

                const customOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: defaultConfig,
                    customTags: new Map([["#flashcard/h3", customConfig]]),
                };

                const customParser = new HeaderBasedCardParser(customOptions);

                const noteText = `## React Basics

### What is JSX?
JSX is a syntax extension.

### What are props?
Props are component inputs.`;
                const noteLines = noteText.split("\n");
                const result = customParser.parse(noteText, ["#flashcard/h3"], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is JSX?");
                expect(result[1].text).toContain("What are props?");
            });

            test("Uses custom tag with flat mode", () => {
                const customConfig: HeaderCardConfig = {
                    headingLevels: [2],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                };

                const customOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: defaultConfig,
                    customTags: new Map([["#flashcard/h2/flat", customConfig]]),
                };

                const customParser = new HeaderBasedCardParser(customOptions);

                const noteText = `## What is React?
React is a library.

### Details
Not included.`;
                const noteLines = noteText.split("\n");
                const result = customParser.parse(noteText, ["#flashcard/h2/flat"], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("React is a library.");
                expect(result[0].text).not.toContain("Details");
            });

            test("Uses custom tag with 'all' mode", () => {
                const customConfig: HeaderCardConfig = {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                };

                const customOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: defaultConfig,
                    customTags: new Map([["#questions", customConfig]]),
                };

                const customParser = new HeaderBasedCardParser(customOptions);

                const noteText = `## React Basics
This is not a question but should be included.

## What is React?
React is a library.`;
                const noteLines = noteText.split("\n");
                const result = customParser.parse(noteText, ["#questions"], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("React Basics");
                expect(result[1].text).toContain("What is React?");
            });

            test("Merges multiple custom tags", () => {
                const h2Config: HeaderCardConfig = {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                };

                const h3Config: HeaderCardConfig = {
                    headingLevels: [3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                };

                const customOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: defaultConfig,
                    customTags: new Map([
                        ["#flashcard/h2", h2Config],
                        ["#flashcard/h3", h3Config],
                    ]),
                };

                const customParser = new HeaderBasedCardParser(customOptions);

                const noteText = `## What is React?
React is a library.

### What is JSX?
JSX is a syntax extension.`;
                const noteLines = noteText.split("\n");
                const result = customParser.parse(
                    noteText,
                    ["#flashcard/h2", "#flashcard/h3"],
                    noteLines,
                );

                // Should get both h2 and h3 questions
                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is React?");
                expect(result[1].text).toContain("What is JSX?");
            });

            test("Respects disabled tag configuration", () => {
                const disabledConfig: HeaderCardConfig = {
                    headingLevels: [],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: false,
                };

                const customOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: defaultConfig,
                    customTags: new Map([["#flashcard/disable", disabledConfig]]),
                };

                const customParser = new HeaderBasedCardParser(customOptions);

                const noteText = `## What is React?
React is a library.`;
                const noteLines = noteText.split("\n");
                const result = customParser.parse(noteText, ["#flashcard/disable"], noteLines);

                expect(result).toHaveLength(0);
            });
        });

        describe("Edge cases and special scenarios", () => {
            test("Handles note with only h1 heading", () => {
                const noteText = `# What is JavaScript?
JavaScript is a programming language.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                // Default config is h2, so h1 should not match
                expect(result).toHaveLength(0);
            });

            test("Handles last heading in note", () => {
                const noteText = `## What is the last question?
This is the answer to the last question.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("What is the last question?");
                expect(result[0].text).toContain("This is the answer");
            });

            test("Handles heading with special markdown characters", () => {
                const noteText = `## What is \`code\` in markdown?
Code is marked with backticks.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("What is `code` in markdown?");
            });

            test("Handles multiple heading levels in configuration", () => {
                const multiLevelConfig: HeaderCardConfig = {
                    headingLevels: [2, 3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                };

                const multiLevelOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: multiLevelConfig,
                    customTags: new Map(),
                };

                const multiLevelParser = new HeaderBasedCardParser(multiLevelOptions);

                const noteText = `## What is React?
React is a library.

### What is JSX?
JSX is a syntax extension.

#### What are fragments?
Fragments group elements.`;
                const noteLines = noteText.split("\n");
                const result = multiLevelParser.parse(noteText, [], noteLines);

                // Should get h2 and h3, but not h4
                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is React?");
                expect(result[1].text).toContain("What is JSX?");
            });
        });

        describe("QA format", () => {
            test("Parses QA format under heading (question text after heading)", () => {
                const allModeConfig: HeaderCardConfig = {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                };

                const qaOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: allModeConfig,
                    customTags: new Map(),
                };

                const qaParser = new HeaderBasedCardParser(qaOptions);

                const noteText = `## JavaScript

What is a closure?

A closure is a function that has access to variables from its outer scope.`;
                const noteLines = noteText.split("\n");
                const result = qaParser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("What is a closure?");
                expect(result[0].text).toContain("A closure is a function");
            });

            test("QA format ignores empty lines after heading", () => {
                const allModeConfig: HeaderCardConfig = {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                };

                const qaOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: allModeConfig,
                    customTags: new Map(),
                };

                const qaParser = new HeaderBasedCardParser(qaOptions);

                const noteText = `## JavaScript


What is a promise?

A promise is an object for async operations.`;
                const noteLines = noteText.split("\n");
                const result = qaParser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("What is a promise?");
                expect(result[0].text).toContain("A promise is an object");
            });

            test("Standard format used when heading ends with ?", () => {
                const noteText = `## What is React?
React is a JavaScript library.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, [], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("What is React?");
                expect(result[0].text).toContain("React is a JavaScript library.");
            });
        });

        describe("Positional selectors", () => {
            test("first-N selector selects first N headings", () => {
                const noteText = `## What is React?
React is a library.

## What is Vue?
Vue is a framework.

## What is Angular?
Angular is a platform.`;
                const noteLines = noteText.split("\n");
                // Using composite tag with first-2 selector
                const result = parser.parse(noteText, ["#flashcards/h2/qa/first-2"], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is React?");
                expect(result[1].text).toContain("What is Vue?");
            });

            test("last-N selector selects last N headings", () => {
                const noteText = `## What is React?
React is a library.

## What is Vue?
Vue is a framework.

## What is Angular?
Angular is a platform.`;
                const noteLines = noteText.split("\n");
                // Using composite tag with last-2 selector
                const result = parser.parse(noteText, ["#flashcards/h2/qa/last-2"], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is Vue?");
                expect(result[1].text).toContain("What is Angular?");
            });

            test("nth-N selector selects Nth heading", () => {
                const noteText = `## What is React?
React is a library.

## What is Vue?
Vue is a framework.

## What is Angular?
Angular is a platform.`;
                const noteLines = noteText.split("\n");
                // Using composite tag with nth-2 selector (2nd heading)
                const result = parser.parse(noteText, ["#flashcards/h2/qa/nth-2"], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("What is Vue?");
            });

            test("Positional selector with more items than available returns all", () => {
                const noteText = `## What is React?
React is a library.

## What is Vue?
Vue is a framework.`;
                const noteLines = noteText.split("\n");
                // Using composite tag with first-10 selector (only 2 available)
                const result = parser.parse(noteText, ["#flashcards/h2/qa/first-10"], noteLines);

                expect(result).toHaveLength(2);
            });
        });

        describe("Composite tags", () => {
            test("Parses composite tag with heading level", () => {
                const noteText = `# Main Title

## What is React?
React is a library.

### What is JSX?
JSX is syntax.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, ["#flashcards/h2/qa"], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("What is React?");
            });

            test("Parses composite tag with heading range", () => {
                const noteText = `## What is React?
React is a library.

### What is JSX?
JSX is syntax.

#### What is a component?
A component is a building block.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, ["#flashcards/h2-h3/qa"], noteLines);

                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("What is React?");
                expect(result[1].text).toContain("What is JSX?");
            });

            test("Parses composite tag with mode", () => {
                const noteText = `## React Basics
Content about React.

## Vue Framework
Content about Vue.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, ["#flashcards/h2/all"], noteLines);

                // Both headings should be included (no "?" required in "all" mode)
                expect(result).toHaveLength(2);
            });

            test("Parses composite tag with nesting mode", () => {
                const noteText = `## What is React?
React is a library.

### Features
Virtual DOM.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, ["#flashcards/h2/qa/flat"], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("React is a library.");
                expect(result[0].text).not.toContain("Features");
            });

            test("Parses composite tag with multiple components", () => {
                const noteText = `## What is React?
React is a library.

### Features
Virtual DOM.

## What is Vue?
Vue is a framework.

### Reactivity
Data binding.`;
                const noteLines = noteText.split("\n");
                const result = parser.parse(noteText, ["#flashcards/h2/qa/flat/first-1"], noteLines);

                expect(result).toHaveLength(1);
                expect(result[0].text).toContain("What is React?");
                expect(result[0].text).not.toContain("Features");
            });
        });

        describe("Regex patterns", () => {
            test("Custom tag with regex pattern matches multiple tags", () => {
                // This test verifies that a regex pattern in custom tags
                // correctly matches note tags and applies the config
                // Using a custom tag prefix to avoid predefined tag conflicts
                const regexConfig: HeaderCardConfig = {
                    headingLevels: [2, 3],
                    nestingMode: "flat",
                    mode: "all",
                    enabled: true,
                };

                const regexOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: defaultConfig,
                    customTags: new Map([["#myflash/h[23]", regexConfig]]),
                };

                const regexParser = new HeaderBasedCardParser(regexOptions);

                // Note with h2 and h3 headings
                const noteText = `## React Basics
React is a library.

### JSX Syntax
JSX is syntax.`;
                const noteLines = noteText.split("\n");
                
                // Tag #myflash/h2 should match the regex pattern #myflash/h[23]
                // The config has headingLevels: [2, 3], so both h2 and h3 should be matched
                // In "all" mode, all headings are matched (no "?" required)
                // In "flat" mode, h2 answer should stop at h3, and h3 should be a separate card
                const result = regexParser.parse(noteText, ["#myflash/h2"], noteLines);

                // Should get 2 cards: one for h2 and one for h3
                expect(result).toHaveLength(2);
                expect(result[0].text).toContain("React Basics");
                expect(result[0].text).not.toContain("JSX Syntax"); // h3 should not be in h2 answer
                expect(result[1].text).toContain("JSX Syntax");
            });

            test("Custom tag with range regex pattern", () => {
                const regexConfig: HeaderCardConfig = {
                    headingLevels: [2, 3, 4],
                    nestingMode: "flat",
                    mode: "all",
                    enabled: true,
                };

                const regexOptions: HeaderBasedCardParserOptions = {
                    enableHeaderCards: true,
                    defaultConfig: defaultConfig,
                    customTags: new Map([["#questions/h[2-4]", regexConfig]]),
                };

                const regexParser = new HeaderBasedCardParser(regexOptions);

                const noteText = `## React Basics
React is a library.

### JSX Syntax
JSX is syntax.

#### Hooks
A hook is a function.`;
                const noteLines = noteText.split("\n");
                // Tag #questions/h3 should match the regex pattern #questions/h[2-4]
                // All headings should be matched (using "all" mode)
                const result = regexParser.parse(noteText, ["#questions/h3"], noteLines);

                expect(result).toHaveLength(3);
                expect(result[0].text).toContain("React Basics");
                expect(result[1].text).toContain("JSX Syntax");
                expect(result[2].text).toContain("Hooks");
            });
        });
    });
});
