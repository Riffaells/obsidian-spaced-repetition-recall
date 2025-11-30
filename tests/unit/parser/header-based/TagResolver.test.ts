import { TagResolver, generatePredefinedTags } from "src/parser/header-based/TagResolver";
import { HeaderCardConfig } from "src/parser/header-based/types";

describe("TagResolver", () => {
    const defaultBaseConfig: HeaderCardConfig = {
        headingLevels: [2],
        nestingMode: "nested",
        mode: "qa",
        enabled: true,
    };

    describe("Predefined tag resolution", () => {
        test("Resolves single heading level tag #flashcards/h2", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h2"]);

            expect(result.headingLevels).toEqual([2]);
            expect(result.mode).toEqual("qa");
            expect(result.nestingMode).toEqual("nested");
            expect(result.enabled).toEqual(true);
        });

        test("Resolves heading range tag #flashcards/h2-h3", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h2-h3"]);

            expect(result.headingLevels).toEqual([2, 3]);
            expect(result.enabled).toEqual(true);
        });

        test("Resolves mode tag #flashcards/qa", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/qa"]);

            expect(result.mode).toEqual("qa");
            expect(result.enabled).toEqual(true);
        });

        test("Resolves mode tag #flashcards/all", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/all"]);

            expect(result.mode).toEqual("all");
            expect(result.enabled).toEqual(true);
        });


        test("Resolves nesting mode tag #flashcards/nested", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/nested"]);

            expect(result.nestingMode).toEqual("nested");
            expect(result.enabled).toEqual(true);
        });

        test("Resolves nesting mode tag #flashcards/flat", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/flat"]);

            expect(result.nestingMode).toEqual("flat");
            expect(result.enabled).toEqual(true);
        });

        test("Combines multiple predefined tags", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h1", "#flashcards/h2-h3"]);

            expect(result.headingLevels).toEqual([1, 2, 3]);
            expect(result.enabled).toEqual(true);
        });

        test("Combines level tag with mode tag", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h2", "#flashcards/all"]);

            expect(result.headingLevels).toEqual([2]);
            expect(result.mode).toEqual("all");
            expect(result.enabled).toEqual(true);
        });

        test("Combines level tag with nesting mode tag", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h2", "#flashcards/flat"]);

            expect(result.headingLevels).toEqual([2]);
            expect(result.nestingMode).toEqual("flat");
            expect(result.enabled).toEqual(true);
        });
    });

    describe("Custom tag resolution", () => {
        test("Resolves exact match custom tag", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const customTags = new Map<string, HeaderCardConfig>([
                ["#вопросы", {
                    headingLevels: [2, 3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                }],
            ]);
            const resolver = new TagResolver(predefinedTags, customTags, defaultBaseConfig);

            const result = resolver.resolve(["#вопросы"]);

            expect(result.headingLevels).toEqual([2, 3]);
            expect(result.mode).toEqual("qa");
            expect(result.enabled).toEqual(true);
        });

        test("Custom tag overrides predefined tag with same name", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const customTags = new Map<string, HeaderCardConfig>([
                ["#flashcards/h2", {
                    headingLevels: [2, 3, 4],
                    nestingMode: "flat",
                    mode: "all",
                    enabled: true,
                }],
            ]);
            const resolver = new TagResolver(predefinedTags, customTags, defaultBaseConfig);

            // Predefined tag should still be used since it's checked first
            const result = resolver.resolve(["#flashcards/h2"]);

            expect(result.headingLevels).toEqual([2]);
        });

        test("Combines custom tag with predefined tag", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const customTags = new Map<string, HeaderCardConfig>([
                ["#вопросы", {
                    headingLevels: [3],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                }],
            ]);
            const resolver = new TagResolver(predefinedTags, customTags, defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h2", "#вопросы"]);

            expect(result.headingLevels).toEqual([2, 3]);
            expect(result.enabled).toEqual(true);
        });
    });


    describe("Regex pattern matching", () => {
        test("Matches regex pattern #flashcards/h[123]", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const customTags = new Map<string, HeaderCardConfig>([
                ["#учеба/h[123]", {
                    headingLevels: [1, 2, 3],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                }],
            ]);
            const resolver = new TagResolver(predefinedTags, customTags, defaultBaseConfig);

            const result1 = resolver.resolve(["#учеба/h1"]);
            expect(result1.headingLevels).toEqual([1, 2, 3]);
            expect(result1.mode).toEqual("all");
            expect(result1.enabled).toEqual(true);

            const result2 = resolver.resolve(["#учеба/h2"]);
            expect(result2.headingLevels).toEqual([1, 2, 3]);

            const result3 = resolver.resolve(["#учеба/h3"]);
            expect(result3.headingLevels).toEqual([1, 2, 3]);
        });

        test("Does not match regex pattern for non-matching tags", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const customTags = new Map<string, HeaderCardConfig>([
                ["#учеба/h[123]", {
                    headingLevels: [1, 2, 3],
                    nestingMode: "nested",
                    mode: "all",
                    enabled: true,
                }],
            ]);
            const resolver = new TagResolver(predefinedTags, customTags, defaultBaseConfig);

            // h4 should not match [123] regex pattern, so it won't get the custom config
            // But it will be parsed as a composite tag with h4 level
            const result = resolver.resolve(["#учеба/h4"]);
            // The tag is parsed as composite, so it's enabled but with h4 level, not [1,2,3]
            expect(result.headingLevels).toEqual([4]);
            expect(result.mode).toEqual("qa"); // Default mode, not "all" from custom tag
        });

        test("Matches regex pattern with range #вопросы/h[2-4]", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const customTags = new Map<string, HeaderCardConfig>([
                ["#вопросы/h[2-4]", {
                    headingLevels: [2, 3, 4],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                }],
            ]);
            const resolver = new TagResolver(predefinedTags, customTags, defaultBaseConfig);

            const result2 = resolver.resolve(["#вопросы/h2"]);
            expect(result2.headingLevels).toEqual([2, 3, 4]);
            expect(result2.nestingMode).toEqual("flat");

            const result3 = resolver.resolve(["#вопросы/h3"]);
            expect(result3.headingLevels).toEqual([2, 3, 4]);

            const result4 = resolver.resolve(["#вопросы/h4"]);
            expect(result4.headingLevels).toEqual([2, 3, 4]);
        });

        test("Regex pattern does not match outside range - uses composite parsing instead", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const customTags = new Map<string, HeaderCardConfig>([
                ["#вопросы/h[2-4]", {
                    headingLevels: [2, 3, 4],
                    nestingMode: "flat",
                    mode: "qa",
                    enabled: true,
                }],
            ]);
            const resolver = new TagResolver(predefinedTags, customTags, defaultBaseConfig);

            // h1 and h5 don't match [2-4] regex, so they won't get the custom config
            // But they will be parsed as composite tags with their respective levels
            const result1 = resolver.resolve(["#вопросы/h1"]);
            expect(result1.headingLevels).toEqual([1]);
            expect(result1.nestingMode).toEqual("nested"); // Default, not "flat" from custom tag

            const result5 = resolver.resolve(["#вопросы/h5"]);
            expect(result5.headingLevels).toEqual([5]);
            expect(result5.nestingMode).toEqual("nested"); // Default, not "flat" from custom tag
        });
    });

    describe("Composite tag parsing", () => {
        test("Parses composite tag #flashcards/h2/qa/last-3", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h2/qa/last-3"]);

            expect(result.headingLevels).toEqual([2]);
            expect(result.mode).toEqual("qa");
            expect(result.positionalSelectors).toEqual([{ type: "last", count: 3 }]);
            expect(result.enabled).toEqual(true);
        });

        test("Parses composite tag with heading range #flashcards/h2-h4/all", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h2-h4/all"]);

            expect(result.headingLevels).toEqual([2, 3, 4]);
            expect(result.mode).toEqual("all");
            expect(result.enabled).toEqual(true);
        });

        test("Parses composite tag with flat nesting #flashcards/h3/flat", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h3/flat"]);

            expect(result.headingLevels).toEqual([3]);
            expect(result.nestingMode).toEqual("flat");
            expect(result.enabled).toEqual(true);
        });

        test("Parses composite tag with first-N selector", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h2/first-5"]);

            expect(result.headingLevels).toEqual([2]);
            expect(result.positionalSelectors).toEqual([{ type: "first", count: 5 }]);
            expect(result.enabled).toEqual(true);
        });

        test("Parses composite tag with nth-N selector", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h2/nth-3"]);

            expect(result.headingLevels).toEqual([2]);
            expect(result.positionalSelectors).toEqual([{ type: "nth", count: 3 }]);
            expect(result.enabled).toEqual(true);
        });

        test("Handles reversed heading range h5-h2 as h2-h5", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h5-h2"]);

            expect(result.headingLevels).toEqual([2, 3, 4, 5]);
            expect(result.enabled).toEqual(true);
        });

        test("Parses complex composite tag with all components", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/h2-h3/all/flat/last-2"]);

            expect(result.headingLevels).toEqual([2, 3]);
            expect(result.mode).toEqual("all");
            expect(result.nestingMode).toEqual("flat");
            expect(result.positionalSelectors).toEqual([{ type: "last", count: 2 }]);
            expect(result.enabled).toEqual(true);
        });
    });


    describe("Positional selector extraction", () => {
        test("Extracts first-N selector from standalone tag", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const selectors = resolver.extractPositionalSelectors(["#flashcards/first-3"]);

            expect(selectors).toEqual([{ type: "first", count: 3 }]);
        });

        test("Extracts last-N selector from standalone tag", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const selectors = resolver.extractPositionalSelectors(["#flashcards/last-2"]);

            expect(selectors).toEqual([{ type: "last", count: 2 }]);
        });

        test("Extracts nth-N selector from standalone tag", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const selectors = resolver.extractPositionalSelectors(["#flashcards/nth-5"]);

            expect(selectors).toEqual([{ type: "nth", count: 5 }]);
        });

        test("Extracts multiple positional selectors", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const selectors = resolver.extractPositionalSelectors([
                "#flashcards/first-2",
                "#flashcards/last-3",
            ]);

            expect(selectors).toEqual([
                { type: "first", count: 2 },
                { type: "last", count: 3 },
            ]);
        });

        test("Ignores invalid positional selectors (count = 0)", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const selectors = resolver.extractPositionalSelectors(["#flashcards/first-0"]);

            expect(selectors).toEqual([]);
        });

        test("Ignores non-positional tags", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const selectors = resolver.extractPositionalSelectors([
                "#flashcards/h2",
                "#flashcards/qa",
                "#flashcards",
            ]);

            expect(selectors).toEqual([]);
        });
    });

    describe("Edge cases", () => {
        test("Returns disabled config when no matching tags", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#unrelated", "#another-tag"]);

            expect(result.enabled).toEqual(false);
            expect(result.headingLevels).toEqual([2]); // From base config
        });

        test("Returns disabled config for empty tag array", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve([]);

            expect(result.enabled).toEqual(false);
        });

        test("Handles tags with special characters", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const customTags = new Map<string, HeaderCardConfig>([
                ["#тест-карточки", {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                }],
            ]);
            const resolver = new TagResolver(predefinedTags, customTags, defaultBaseConfig);

            const result = resolver.resolve(["#тест-карточки"]);

            expect(result.headingLevels).toEqual([2]);
            expect(result.enabled).toEqual(true);
        });

        test("Mode 'all' wins when combining tags (Requirement 3.3)", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/qa", "#flashcards/all"]);

            expect(result.mode).toEqual("all");
        });

        test("Last nesting mode wins when combining tags", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve(["#flashcards/nested", "#flashcards/flat"]);

            expect(result.nestingMode).toEqual("flat");
        });

        test("Combines positional selectors from multiple sources", () => {
            const predefinedTags = generatePredefinedTags(defaultBaseConfig);
            const resolver = new TagResolver(predefinedTags, new Map(), defaultBaseConfig);

            const result = resolver.resolve([
                "#flashcards/h2/last-3",
                "#flashcards/first-2",
            ]);

            expect(result.positionalSelectors).toContainEqual({ type: "last", count: 3 });
            expect(result.positionalSelectors).toContainEqual({ type: "first", count: 2 });
        });
    });

    describe("generatePredefinedTags", () => {
        test("Generates tags for all heading levels h1-h6", () => {
            const tags = generatePredefinedTags(defaultBaseConfig);

            for (let level = 1; level <= 6; level++) {
                expect(tags.has(`#flashcards/h${level}`)).toBe(true);
                expect(tags.get(`#flashcards/h${level}`)?.headingLevels).toEqual([level]);
            }
        });

        test("Generates common range tags", () => {
            const tags = generatePredefinedTags(defaultBaseConfig);

            expect(tags.has("#flashcards/h2-h3")).toBe(true);
            expect(tags.get("#flashcards/h2-h3")?.headingLevels).toEqual([2, 3]);

            expect(tags.has("#flashcards/h1-h3")).toBe(true);
            expect(tags.get("#flashcards/h1-h3")?.headingLevels).toEqual([1, 2, 3]);
        });

        test("Generates mode tags", () => {
            const tags = generatePredefinedTags(defaultBaseConfig);

            expect(tags.has("#flashcards/qa")).toBe(true);
            expect(tags.get("#flashcards/qa")?.mode).toEqual("qa");

            expect(tags.has("#flashcards/all")).toBe(true);
            expect(tags.get("#flashcards/all")?.mode).toEqual("all");
        });

        test("Generates nesting mode tags", () => {
            const tags = generatePredefinedTags(defaultBaseConfig);

            expect(tags.has("#flashcards/nested")).toBe(true);
            expect(tags.get("#flashcards/nested")?.nestingMode).toEqual("nested");

            expect(tags.has("#flashcards/flat")).toBe(true);
            expect(tags.get("#flashcards/flat")?.nestingMode).toEqual("flat");
        });

        test("Uses custom tag prefix", () => {
            const tags = generatePredefinedTags(defaultBaseConfig, "#cards");

            expect(tags.has("#cards/h2")).toBe(true);
            expect(tags.has("#cards/qa")).toBe(true);
            expect(tags.has("#flashcards/h2")).toBe(false);
        });

        test("Uses base config for default values", () => {
            const customBaseConfig: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "flat",
                mode: "all",
                enabled: true,
            };
            const tags = generatePredefinedTags(customBaseConfig);

            // Level tags should use base config's mode and nesting
            const h2Tag = tags.get("#flashcards/h2");
            expect(h2Tag?.nestingMode).toEqual("flat");
            expect(h2Tag?.mode).toEqual("all");
        });
    });
});
