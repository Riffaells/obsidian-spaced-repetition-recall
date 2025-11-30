import { generatePredefinedTags } from "src/parser/header-based/utils";
import { HeaderCardConfig } from "src/parser/header-based/types";

describe("generatePredefinedTags", () => {
    describe("Level tags generation (h1-h6)", () => {
        test("Generates all individual level tags from h1 to h6", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            // Should have tags for all 6 heading levels
            expect(tags.has("#flashcards/h1")).toBe(true);
            expect(tags.has("#flashcards/h2")).toBe(true);
            expect(tags.has("#flashcards/h3")).toBe(true);
            expect(tags.has("#flashcards/h4")).toBe(true);
            expect(tags.has("#flashcards/h5")).toBe(true);
            expect(tags.has("#flashcards/h6")).toBe(true);
        });

        test("Each level tag has correct heading level", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/h1")?.headingLevels).toEqual([1]);
            expect(tags.get("#flashcards/h2")?.headingLevels).toEqual([2]);
            expect(tags.get("#flashcards/h3")?.headingLevels).toEqual([3]);
            expect(tags.get("#flashcards/h4")?.headingLevels).toEqual([4]);
            expect(tags.get("#flashcards/h5")?.headingLevels).toEqual([5]);
            expect(tags.get("#flashcards/h6")?.headingLevels).toEqual([6]);
        });

        test("Level tags inherit mode from base config", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "all" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/h1")?.mode).toBe("all");
            expect(tags.get("#flashcards/h2")?.mode).toBe("all");
            expect(tags.get("#flashcards/h3")?.mode).toBe("all");
        });

        test("Level tags inherit nestingMode from base config", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "flat" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/h1")?.nestingMode).toBe("flat");
            expect(tags.get("#flashcards/h2")?.nestingMode).toBe("flat");
            expect(tags.get("#flashcards/h3")?.nestingMode).toBe("flat");
        });

        test("All level tags are enabled by default", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            for (let level = 1; level <= 6; level++) {
                expect(tags.get(`#flashcards/h${level}`)?.enabled).toBe(true);
            }
        });
    });

    describe("Range tags generation", () => {
        test("Generates common range tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.has("#flashcards/h2-h3")).toBe(true);
            expect(tags.has("#flashcards/h1-h3")).toBe(true);
            expect(tags.has("#flashcards/h3-h5")).toBe(true);
        });

        test("Range tag h2-h3 includes levels 2 and 3", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/h2-h3")?.headingLevels).toEqual([2, 3]);
        });

        test("Range tag h1-h3 includes levels 1, 2, and 3", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/h1-h3")?.headingLevels).toEqual([1, 2, 3]);
        });

        test("Range tag h3-h5 includes levels 3, 4, and 5", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/h3-h5")?.headingLevels).toEqual([3, 4, 5]);
        });

        test("Range tags inherit mode from base config", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "all" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/h2-h3")?.mode).toBe("all");
            expect(tags.get("#flashcards/h1-h3")?.mode).toBe("all");
            expect(tags.get("#flashcards/h3-h5")?.mode).toBe("all");
        });

        test("Range tags inherit nestingMode from base config", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "flat" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/h2-h3")?.nestingMode).toBe("flat");
            expect(tags.get("#flashcards/h1-h3")?.nestingMode).toBe("flat");
            expect(tags.get("#flashcards/h3-h5")?.nestingMode).toBe("flat");
        });

        test("All range tags are enabled by default", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/h2-h3")?.enabled).toBe(true);
            expect(tags.get("#flashcards/h1-h3")?.enabled).toBe(true);
            expect(tags.get("#flashcards/h3-h5")?.enabled).toBe(true);
        });
    });

    describe("Mode tags generation (qa, all)", () => {
        test("Generates qa and all mode tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.has("#flashcards/qa")).toBe(true);
            expect(tags.has("#flashcards/all")).toBe(true);
        });

        test("qa tag has mode set to 'qa'", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "all" as const,  // Base config has "all", but qa tag should override
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/qa")?.mode).toBe("qa");
        });

        test("all tag has mode set to 'all'", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,  // Base config has "qa", but all tag should override
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/all")?.mode).toBe("all");
        });

        test("Mode tags inherit headingLevels from base config", () => {
            const baseConfig = {
                headingLevels: [2, 3, 4],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/qa")?.headingLevels).toEqual([2, 3, 4]);
            expect(tags.get("#flashcards/all")?.headingLevels).toEqual([2, 3, 4]);
        });

        test("Mode tags inherit nestingMode from base config", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "flat" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/qa")?.nestingMode).toBe("flat");
            expect(tags.get("#flashcards/all")?.nestingMode).toBe("flat");
        });

        test("Mode tags are enabled by default", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/qa")?.enabled).toBe(true);
            expect(tags.get("#flashcards/all")?.enabled).toBe(true);
        });
    });

    describe("Nesting mode tags generation (nested, flat)", () => {
        test("Generates nested and flat nesting mode tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.has("#flashcards/nested")).toBe(true);
            expect(tags.has("#flashcards/flat")).toBe(true);
        });

        test("nested tag has nestingMode set to 'nested'", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "flat" as const,  // Base config has "flat", but nested tag should override
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/nested")?.nestingMode).toBe("nested");
        });

        test("flat tag has nestingMode set to 'flat'", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,  // Base config has "nested", but flat tag should override
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/flat")?.nestingMode).toBe("flat");
        });

        test("Nesting mode tags inherit headingLevels from base config", () => {
            const baseConfig = {
                headingLevels: [1, 2, 3],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/nested")?.headingLevels).toEqual([1, 2, 3]);
            expect(tags.get("#flashcards/flat")?.headingLevels).toEqual([1, 2, 3]);
        });

        test("Nesting mode tags inherit mode from base config", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "all" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/nested")?.mode).toBe("all");
            expect(tags.get("#flashcards/flat")?.mode).toBe("all");
        });

        test("Nesting mode tags are enabled by default", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags.get("#flashcards/nested")?.enabled).toBe(true);
            expect(tags.get("#flashcards/flat")?.enabled).toBe(true);
        });
    });

    describe("Complete tag set", () => {
        test("Generates correct total number of tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            // 6 level tags + 3 range tags + 2 mode tags + 2 nesting mode tags = 13 total
            expect(tags.size).toBe(13);
        });

        test("All tags are unique", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);
            const tagNames = Array.from(tags.keys());
            const uniqueTagNames = new Set(tagNames);

            expect(tagNames.length).toBe(uniqueTagNames.size);
        });

        test("Returns a Map instance", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            expect(tags).toBeInstanceOf(Map);
        });
    });

    describe("Different base configurations", () => {
        test("Works with empty headingLevels in base config", () => {
            const baseConfig = {
                headingLevels: [] as number[],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            // Level tags should still be generated with their own levels
            expect(tags.get("#flashcards/h2")?.headingLevels).toEqual([2]);
            
            // Mode tags should have empty headingLevels from base config
            expect(tags.get("#flashcards/qa")?.headingLevels).toEqual([]);
            expect(tags.get("#flashcards/all")?.headingLevels).toEqual([]);
        });

        test("Works with multiple headingLevels in base config", () => {
            const baseConfig = {
                headingLevels: [1, 2, 3, 4, 5, 6],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            // Mode tags should inherit all levels
            expect(tags.get("#flashcards/qa")?.headingLevels).toEqual([1, 2, 3, 4, 5, 6]);
            expect(tags.get("#flashcards/all")?.headingLevels).toEqual([1, 2, 3, 4, 5, 6]);
        });

        test("Works with mode='all' in base config", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "all" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            // Level tags should inherit "all" mode
            expect(tags.get("#flashcards/h2")?.mode).toBe("all");
            
            // But qa tag should still be "qa"
            expect(tags.get("#flashcards/qa")?.mode).toBe("qa");
        });

        test("Works with nestingMode='flat' in base config", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "flat" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            // Level tags should inherit "flat" nestingMode
            expect(tags.get("#flashcards/h2")?.nestingMode).toBe("flat");
            
            // But nested tag should still be "nested"
            expect(tags.get("#flashcards/nested")?.nestingMode).toBe("nested");
        });
    });

    describe("Tag configuration structure", () => {
        test("Each tag has all required properties", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            for (const [tagName, config] of tags.entries()) {
                expect(config).toHaveProperty("headingLevels");
                expect(config).toHaveProperty("nestingMode");
                expect(config).toHaveProperty("mode");
                expect(config).toHaveProperty("enabled");
                
                expect(Array.isArray(config.headingLevels)).toBe(true);
                expect(["nested", "flat"]).toContain(config.nestingMode);
                expect(["qa", "all"]).toContain(config.mode);
                expect(typeof config.enabled).toBe("boolean");
            }
        });
    });
});
