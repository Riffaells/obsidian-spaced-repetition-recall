// /**
//  * Unit tests for InlineExtractor
//  *
//  * Tests inline flashcard extraction with various configurations
//  */

// import { InlineExtractor } from "../../../../src/parser/rule-based/InlineExtractor";
// import { InlineConfig, ExtractionContext, Range } from "../../../../src/parser/rule-based/types";

// describe("InlineExtractor", () => {
//     let extractor: InlineExtractor;

//     beforeEach(() => {
//         extractor = new InlineExtractor();
//     });

//     describe("Basic separator splitting", () => {
//         it("should extract a card from a line with :: separator", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 startOfLineOnly: false,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 0,
//                 headersPath: [],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             const text = "Question :: Answer";
//             const cards = extractor.extract(text, config, context, []);

//             expect(cards).toHaveLength(1);
//             expect(cards[0].front).toBe("Question");
//             expect(cards[0].back).toBe("Answer");
//             expect(cards[0].lineNumber).toBe(0);
//         });

//         it("should use first separator occurrence when multiple separators exist", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 startOfLineOnly: false,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 0,
//                 headersPath: [],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             const text = "Question :: Answer :: Extra";
//             const cards = extractor.extract(text, config, context, []);

//             expect(cards).toHaveLength(1);
//             expect(cards[0].front).toBe("Question");
//             expect(cards[0].back).toBe("Answer :: Extra");
//         });

//         it("should skip lines with empty front or back", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 startOfLineOnly: false,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 0,
//                 headersPath: [],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             const text = ":: Answer\nQuestion ::\n:: ";
//             const cards = extractor.extract(text, config, context, []);

//             expect(cards).toHaveLength(0);
//         });
//     });

//     describe("Bidirectional cards", () => {
//         it("should create two cards when separatorReverse is defined", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 separatorReverse: ":::",
//                 startOfLineOnly: false,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 0,
//                 headersPath: [],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             const text = "Front ::: Back";
//             const cards = extractor.extract(text, config, context, []);

//             expect(cards).toHaveLength(2);
//             expect(cards[0].front).toBe("Front");
//             expect(cards[0].back).toBe("Back");
//             expect(cards[1].front).toBe("Back");
//             expect(cards[1].back).toBe("Front");
//         });

//         it("should prioritize separatorReverse over regular separator", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 separatorReverse: ":::",
//                 startOfLineOnly: false,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 0,
//                 headersPath: [],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             const text = "Front ::: Back";
//             const cards = extractor.extract(text, config, context, []);

//             // Should use ::: and create bidirectional cards
//             expect(cards).toHaveLength(2);
//         });
//     });

//     describe("startOfLineOnly constraint", () => {
//         it("should match separator anywhere when startOfLineOnly is false", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 startOfLineOnly: false,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 0,
//                 headersPath: [],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             const text = "Some text before :: Answer";
//             const cards = extractor.extract(text, config, context, []);

//             expect(cards).toHaveLength(1);
//             expect(cards[0].front).toBe("Some text before");
//             expect(cards[0].back).toBe("Answer");
//         });

//         it("should only match separator at line start when startOfLineOnly is true", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 startOfLineOnly: true,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 0,
//                 headersPath: [],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             // When startOfLineOnly is true, only lines starting with :: should match
//             // "Some text before :: Answer" - separator not at start, should NOT match
//             // "Q :: A" - separator not at start, should NOT match
//             const text = "Some text before :: Answer\nQ :: A";
//             const cards = extractor.extract(text, config, context, []);

//             // No cards should be extracted because separator is not at line start
//             expect(cards).toHaveLength(0);
//         });

//         it("should match separator at line start with leading whitespace when startOfLineOnly is true", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 startOfLineOnly: true,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 0,
//                 headersPath: [],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             // Line starts with :: after whitespace, but front would be empty, so no card
//             const text = "  :: Q :: A";
//             const cards = extractor.extract(text, config, context, []);

//             // No card because front is empty
//             expect(cards).toHaveLength(0);
//         });
//     });

//     describe("Code block skipping", () => {
//         it("should skip separators inside code blocks", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 startOfLineOnly: false,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 0,
//                 headersPath: [],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             const codeBlocks: Range[] = [{ start: 1, end: 2 }];

//             const text = "Valid :: Card\nCode :: Block\nMore :: Code\nAnother :: Valid";
//             const cards = extractor.extract(text, config, context, codeBlocks);

//             expect(cards).toHaveLength(2);
//             expect(cards[0].front).toBe("Valid");
//             expect(cards[0].back).toBe("Card");
//             expect(cards[0].lineNumber).toBe(0);
//             expect(cards[1].front).toBe("Another");
//             expect(cards[1].back).toBe("Valid");
//             expect(cards[1].lineNumber).toBe(3);
//         });

//         it("should not skip code blocks when skipCodeBlocks is false", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 startOfLineOnly: false,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 0,
//                 headersPath: [],
//                 skipCodeBlocks: false,
//                 skipHtmlComments: true,
//             };

//             const codeBlocks: Range[] = [{ start: 1, end: 2 }];

//             const text = "Valid :: Card\nCode :: Block\nMore :: Code";
//             const cards = extractor.extract(text, config, context, codeBlocks);

//             // Should extract all cards including those in code blocks
//             expect(cards).toHaveLength(3);
//         });
//     });

//     describe("Context propagation", () => {
//         it("should include headersPath in extracted cards", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 startOfLineOnly: false,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 10,
//                 headersPath: ["Chapter 1", "Section A"],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             const text = "Question :: Answer";
//             const cards = extractor.extract(text, config, context, []);

//             expect(cards).toHaveLength(1);
//             expect(cards[0].headersPath).toEqual(["Chapter 1", "Section A"]);
//             expect(cards[0].lineNumber).toBe(10);
//         });

//         it("should calculate absolute line numbers with lineOffset", () => {
//             const config: InlineConfig = {
//                 separator: "::",
//                 startOfLineOnly: false,
//             };

//             const context: ExtractionContext = {
//                 lineOffset: 100,
//                 headersPath: [],
//                 skipCodeBlocks: true,
//                 skipHtmlComments: true,
//             };

//             const text = "Line 1\nQ1 :: A1\nLine 3\nQ2 :: A2";
//             const cards = extractor.extract(text, config, context, []);

//             expect(cards).toHaveLength(2);
//             expect(cards[0].lineNumber).toBe(101); // 100 + 1
//             expect(cards[1].lineNumber).toBe(103); // 100 + 3
//         });
//     });
// });
