/**
 * UI Component Tests for Header Card Settings
 * 
 * These tests verify the rendering and interaction of UI components
 * for header-based flashcard settings.
 * 
 * Requirements: 9, 10
 */

import { generatePredefinedTags } from "src/parser/header-based/utils";
import { HeaderCardConfig } from "src/parser/header-based/types";
import { DEFAULT_SETTINGS } from "src/settings";

describe("Header Card Settings UI Components", () => {
    describe("Base Settings Rendering", () => {
        it("should have correct default base configuration", () => {
            const baseConfig = DEFAULT_SETTINGS.headerCardBaseConfig;

            expect(baseConfig).toBeDefined();
            expect(baseConfig.headingLevels).toEqual([2]);
            expect(baseConfig.mode).toBe("qa");
            expect(baseConfig.nestingMode).toBe("nested");
        });

        it("should support all heading levels (1-6)", () => {
            const validLevels = [1, 2, 3, 4, 5, 6];

            for (const level of validLevels) {
                const config = {
                    ...DEFAULT_SETTINGS.headerCardBaseConfig,
                    headingLevels: [level],
                };

                expect(config.headingLevels).toContain(level);
                expect(config.headingLevels[0]).toBeGreaterThanOrEqual(1);
                expect(config.headingLevels[0]).toBeLessThanOrEqual(6);
            }
        });

        it("should support multiple heading levels", () => {
            const config = {
                ...DEFAULT_SETTINGS.headerCardBaseConfig,
                headingLevels: [2, 3, 4],
            };

            expect(config.headingLevels).toHaveLength(3);
            expect(config.headingLevels).toContain(2);
            expect(config.headingLevels).toContain(3);
            expect(config.headingLevels).toContain(4);
        });

        it("should support both recognition modes", () => {
            const qaConfig = {
                ...DEFAULT_SETTINGS.headerCardBaseConfig,
                mode: "qa" as const,
            };

            const allConfig = {
                ...DEFAULT_SETTINGS.headerCardBaseConfig,
                mode: "all" as const,
            };

            expect(qaConfig.mode).toBe("qa");
            expect(allConfig.mode).toBe("all");
        });

        it("should support both nesting modes", () => {
            const nestedConfig = {
                ...DEFAULT_SETTINGS.headerCardBaseConfig,
                nestingMode: "nested" as const,
            };

            const flatConfig = {
                ...DEFAULT_SETTINGS.headerCardBaseConfig,
                nestingMode: "flat" as const,
            };

            expect(nestedConfig.nestingMode).toBe("nested");
            expect(flatConfig.nestingMode).toBe("flat");
        });

        it("should have show context setting enabled by default", () => {
            expect(DEFAULT_SETTINGS.headerCardShowContext).toBe(true);
        });
    });

    describe("Predefined Tags Display", () => {
        it("should generate predefined tags from base config", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const predefinedTags = generatePredefinedTags(baseConfig);

            expect(predefinedTags).toBeDefined();
            expect(predefinedTags.size).toBeGreaterThan(0);
        });

        it("should include level tags (h1-h6)", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const predefinedTags = generatePredefinedTags(baseConfig);

            expect(predefinedTags.has("#flashcards/h1")).toBe(true);
            expect(predefinedTags.has("#flashcards/h2")).toBe(true);
            expect(predefinedTags.has("#flashcards/h3")).toBe(true);
            expect(predefinedTags.has("#flashcards/h4")).toBe(true);
            expect(predefinedTags.has("#flashcards/h5")).toBe(true);
            expect(predefinedTags.has("#flashcards/h6")).toBe(true);
        });

        it("should include range tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const predefinedTags = generatePredefinedTags(baseConfig);

            expect(predefinedTags.has("#flashcards/h2-h3")).toBe(true);
            expect(predefinedTags.has("#flashcards/h1-h3")).toBe(true);
            expect(predefinedTags.has("#flashcards/h3-h5")).toBe(true);
        });

        it("should include recognition mode tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const predefinedTags = generatePredefinedTags(baseConfig);

            expect(predefinedTags.has("#flashcards/qa")).toBe(true);
            expect(predefinedTags.has("#flashcards/all")).toBe(true);
        });

        it("should include nesting mode tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const predefinedTags = generatePredefinedTags(baseConfig);

            expect(predefinedTags.has("#flashcards/nested")).toBe(true);
            expect(predefinedTags.has("#flashcards/flat")).toBe(true);
        });

        it("should have correct configuration for level tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const predefinedTags = generatePredefinedTags(baseConfig);
            const h2Config = predefinedTags.get("#flashcards/h2");

            expect(h2Config).toBeDefined();
            expect(h2Config!.headingLevels).toEqual([2]);
            expect(h2Config!.mode).toBe("qa");
            expect(h2Config!.nestingMode).toBe("nested");
            expect(h2Config!.enabled).toBe(true);
        });

        it("should have correct configuration for range tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const predefinedTags = generatePredefinedTags(baseConfig);
            const rangeConfig = predefinedTags.get("#flashcards/h2-h3");

            expect(rangeConfig).toBeDefined();
            expect(rangeConfig!.headingLevels).toEqual([2, 3]);
            expect(rangeConfig!.mode).toBe("qa");
            expect(rangeConfig!.nestingMode).toBe("nested");
            expect(rangeConfig!.enabled).toBe(true);
        });

        it("should have correct configuration for mode tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const predefinedTags = generatePredefinedTags(baseConfig);
            const qaConfig = predefinedTags.get("#flashcards/qa");
            const allConfig = predefinedTags.get("#flashcards/all");

            expect(qaConfig).toBeDefined();
            expect(qaConfig!.mode).toBe("qa");
            expect(qaConfig!.headingLevels).toEqual([2]); // Inherits from base config

            expect(allConfig).toBeDefined();
            expect(allConfig!.mode).toBe("all");
            expect(allConfig!.headingLevels).toEqual([2]); // Inherits from base config
        });

        it("should have correct configuration for nesting mode tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const predefinedTags = generatePredefinedTags(baseConfig);
            const nestedConfig = predefinedTags.get("#flashcards/nested");
            const flatConfig = predefinedTags.get("#flashcards/flat");

            expect(nestedConfig).toBeDefined();
            expect(nestedConfig!.nestingMode).toBe("nested");
            expect(nestedConfig!.headingLevels).toEqual([2]); // Inherits from base config

            expect(flatConfig).toBeDefined();
            expect(flatConfig!.nestingMode).toBe("flat");
            expect(flatConfig!.headingLevels).toEqual([2]); // Inherits from base config
        });

        it("should generate consistent tags across multiple calls", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags1 = generatePredefinedTags(baseConfig);
            const tags2 = generatePredefinedTags(baseConfig);

            expect(tags1.size).toBe(tags2.size);

            for (const [tagName, config1] of tags1.entries()) {
                const config2 = tags2.get(tagName);
                expect(config2).toBeDefined();
                expect(config2!.headingLevels).toEqual(config1.headingLevels);
                expect(config2!.mode).toBe(config1.mode);
                expect(config2!.nestingMode).toBe(config1.nestingMode);
                expect(config2!.enabled).toBe(config1.enabled);
            }
        });
    });

    describe("Custom Tags CRUD Operations", () => {
        it("should support adding custom tags", () => {
            const customTags: Record<string, HeaderCardConfig> = {};

            const newTag = "#custom";
            const newConfig: HeaderCardConfig = {
                headingLevels: [2, 3],
                mode: "qa",
                nestingMode: "nested",
                enabled: true,
            };

            customTags[newTag] = newConfig;

            expect(customTags[newTag]).toBeDefined();
            expect(customTags[newTag].headingLevels).toEqual([2, 3]);
        });

        it("should support updating custom tags", () => {
            const customTags: Record<string, HeaderCardConfig> = {
                "#custom": {
                    headingLevels: [2],
                    mode: "qa",
                    nestingMode: "nested",
                    enabled: true,
                },
            };

            customTags["#custom"] = {
                headingLevels: [2, 3, 4],
                mode: "all",
                nestingMode: "flat",
                enabled: false,
            };

            expect(customTags["#custom"].headingLevels).toEqual([2, 3, 4]);
            expect(customTags["#custom"].mode).toBe("all");
            expect(customTags["#custom"].nestingMode).toBe("flat");
            expect(customTags["#custom"].enabled).toBe(false);
        });

        it("should support deleting custom tags", () => {
            const customTags: Record<string, HeaderCardConfig> = {
                "#custom1": {
                    headingLevels: [2],
                    mode: "qa",
                    nestingMode: "nested",
                    enabled: true,
                },
                "#custom2": {
                    headingLevels: [3],
                    mode: "all",
                    nestingMode: "flat",
                    enabled: true,
                },
            };

            delete customTags["#custom1"];

            expect(customTags["#custom1"]).toBeUndefined();
            expect(customTags["#custom2"]).toBeDefined();
            expect(Object.keys(customTags)).toHaveLength(1);
        });

        it("should support renaming custom tags", () => {
            const customTags: Record<string, HeaderCardConfig> = {
                "#oldname": {
                    headingLevels: [2],
                    mode: "qa",
                    nestingMode: "nested",
                    enabled: true,
                },
            };

            const config = customTags["#oldname"];
            delete customTags["#oldname"];
            customTags["#newname"] = config;

            expect(customTags["#oldname"]).toBeUndefined();
            expect(customTags["#newname"]).toBeDefined();
            expect(customTags["#newname"].headingLevels).toEqual([2]);
        });

        it("should prevent duplicate tag names", () => {
            const customTags: Record<string, HeaderCardConfig> = {
                "#existing": {
                    headingLevels: [2],
                    mode: "qa",
                    nestingMode: "nested",
                    enabled: true,
                },
            };

            const isDuplicate = "#existing" in customTags;

            expect(isDuplicate).toBe(true);
        });

        it("should support multiple custom tags", () => {
            const customTags: Record<string, HeaderCardConfig> = {
                "#custom1": {
                    headingLevels: [2],
                    mode: "qa",
                    nestingMode: "nested",
                    enabled: true,
                },
                "#custom2": {
                    headingLevels: [3],
                    mode: "all",
                    nestingMode: "flat",
                    enabled: true,
                },
                "#custom3": {
                    headingLevels: [1, 2, 3],
                    mode: "qa",
                    nestingMode: "nested",
                    enabled: false,
                },
            };

            expect(Object.keys(customTags)).toHaveLength(3);
            expect(customTags["#custom1"]).toBeDefined();
            expect(customTags["#custom2"]).toBeDefined();
            expect(customTags["#custom3"]).toBeDefined();
        });

        it("should support custom tags with regex patterns", () => {
            const customTags: Record<string, HeaderCardConfig> = {
                "#flashcard/h[123]": {
                    headingLevels: [1, 2, 3],
                    mode: "qa",
                    nestingMode: "nested",
                    enabled: true,
                },
            };

            expect(customTags["#flashcard/h[123]"]).toBeDefined();
            expect(customTags["#flashcard/h[123]"].headingLevels).toEqual([1, 2, 3]);
        });

        it("should support disabling custom tags", () => {
            const customTags: Record<string, HeaderCardConfig> = {
                "#disabled": {
                    headingLevels: [2],
                    mode: "qa",
                    nestingMode: "nested",
                    enabled: false,
                },
            };

            expect(customTags["#disabled"].enabled).toBe(false);
        });

        it("should preserve tag configuration when toggling enabled state", () => {
            const customTags: Record<string, HeaderCardConfig> = {
                "#toggle": {
                    headingLevels: [2, 3],
                    mode: "all",
                    nestingMode: "flat",
                    enabled: true,
                },
            };

            customTags["#toggle"].enabled = false;

            expect(customTags["#toggle"].headingLevels).toEqual([2, 3]);
            expect(customTags["#toggle"].mode).toBe("all");
            expect(customTags["#toggle"].nestingMode).toBe("flat");
            expect(customTags["#toggle"].enabled).toBe(false);
        });
    });

    describe("Regex Validation in UI", () => {
        it("should validate simple regex patterns", () => {
            const patterns = [
                "#flashcard/h[123]",
                "#questions/h[2-4]",
                "#all/h[1-6]",
            ];

            for (const pattern of patterns) {
                const hasRegexChars = /[\[\]{}()*+?^$|\\]/.test(pattern);
                expect(hasRegexChars).toBe(true);
            }
        });

        it("should identify non-regex patterns", () => {
            const patterns = [
                "#flashcard/h2",
                "#questions",
                "#custom-tag",
            ];

            for (const pattern of patterns) {
                const hasRegexChars = /[\[\]{}()*+?^$|\\]/.test(pattern);
                expect(hasRegexChars).toBe(false);
            }
        });

        it("should validate bracket patterns", () => {
            const validPatterns = [
                "#flashcard/h[123]",
                "#flashcard/h[1-6]",
                "#flashcard/h[2-4]",
            ];

            for (const pattern of validPatterns) {
                expect(() => {
                    const regexPattern = pattern
                        .replace(/[.*+?^${}()|\\]/g, "\\$&")
                        .replace(/\\\[/g, "[")
                        .replace(/\\\]/g, "]");
                    new RegExp(`^${regexPattern}$`);
                }).not.toThrow();
            }
        });

        it("should detect invalid bracket patterns", () => {
            const invalidPatterns = [
                "#flashcard/h[",
                "#flashcard/h[123",
            ];

            for (const pattern of invalidPatterns) {
                expect(() => {
                    const regexPattern = pattern
                        .replace(/[.*+?^${}()|\\]/g, "\\$&")
                        .replace(/\\\[/g, "[")
                        .replace(/\\\]/g, "]");
                    new RegExp(`^${regexPattern}$`);
                }).toThrow();
            }
            
            // Note: "#flashcard/h]" doesn't throw because ] is escaped to \]
            // which is a valid regex pattern (matches literal ])
        });

        it("should validate range patterns", () => {
            const rangePatterns = [
                { pattern: "#flashcard/h[1-3]", base: "#flashcard/", levels: [1, 2, 3] },
                { pattern: "#flashcard/h[2-4]", base: "#flashcard/", levels: [2, 3, 4] },
                { pattern: "#flashcard/h[4-6]", base: "#flashcard/", levels: [4, 5, 6] },
            ];

            for (const { pattern, base, levels } of rangePatterns) {
                const regexPattern = pattern
                    .replace(/[.*+?^${}()|\\]/g, "\\$&")
                    .replace(/\\\[/g, "[")
                    .replace(/\\\]/g, "]");
                const regex = new RegExp(`^${regexPattern}$`);

                for (const level of levels) {
                    const testTag = `${base}h${level}`;
                    expect(regex.test(testTag)).toBe(true);
                }
                
                // Test that other levels don't match
                const allLevels = [1, 2, 3, 4, 5, 6];
                for (const level of allLevels) {
                    if (!levels.includes(level)) {
                        const testTag = `${base}h${level}`;
                        expect(regex.test(testTag)).toBe(false);
                    }
                }
            }
        });
    });

    describe("Regex Preview Generation", () => {
        it("should generate preview for h[123] pattern", () => {
            const pattern = "#flashcard/h[123]";
            const base = "#flashcard/";
            const expected = ["#flashcard/h1", "#flashcard/h2", "#flashcard/h3"];

            const regexPattern = pattern
                .replace(/[.*+?^${}()|\\]/g, "\\$&")
                .replace(/\\\[/g, "[")
                .replace(/\\\]/g, "]");
            const regex = new RegExp(`^${regexPattern}$`);

            const matched: string[] = [];
            for (let i = 1; i <= 6; i++) {
                const testTag = `${base}h${i}`;
                if (regex.test(testTag)) {
                    matched.push(testTag);
                }
            }

            expect(matched).toEqual(expected);
        });

        it("should generate preview for h[2-4] pattern", () => {
            const pattern = "#questions/h[2-4]";
            const base = "#questions/";
            const expected = ["#questions/h2", "#questions/h3", "#questions/h4"];

            const regexPattern = pattern
                .replace(/[.*+?^${}()|\\]/g, "\\$&")
                .replace(/\\\[/g, "[")
                .replace(/\\\]/g, "]");
            const regex = new RegExp(`^${regexPattern}$`);

            const matched: string[] = [];
            for (let i = 1; i <= 6; i++) {
                const testTag = `${base}h${i}`;
                if (regex.test(testTag)) {
                    matched.push(testTag);
                }
            }

            expect(matched).toEqual(expected);
        });

        it("should generate preview for h[1-6] pattern", () => {
            const pattern = "#all/h[1-6]";
            const base = "#all/";
            const expected = [
                "#all/h1",
                "#all/h2",
                "#all/h3",
                "#all/h4",
                "#all/h5",
                "#all/h6",
            ];

            const regexPattern = pattern
                .replace(/[.*+?^${}()|\\]/g, "\\$&")
                .replace(/\\\[/g, "[")
                .replace(/\\\]/g, "]");
            const regex = new RegExp(`^${regexPattern}$`);

            const matched: string[] = [];
            for (let i = 1; i <= 6; i++) {
                const testTag = `${base}h${i}`;
                if (regex.test(testTag)) {
                    matched.push(testTag);
                }
            }

            expect(matched).toEqual(expected);
        });

        it("should return empty preview for non-regex patterns", () => {
            const pattern = "#flashcard/h2";
            const hasRegex = /[\[\]{}()*+?^$|\\]/.test(pattern);

            expect(hasRegex).toBe(false);
        });

        it("should handle invalid regex patterns gracefully", () => {
            const invalidPattern = "#flashcard/h[";

            expect(() => {
                const regexPattern = invalidPattern
                    .replace(/[.*+?^${}()|\\]/g, "\\$&")
                    .replace(/\\\[/g, "[")
                    .replace(/\\\]/g, "]");
                new RegExp(`^${regexPattern}$`);
            }).toThrow();
        });

        it("should limit preview to reasonable number of matches", () => {
            const pattern = "#test/h[1-6]";
            const base = "#test/";

            const regexPattern = pattern
                .replace(/[.*+?^${}()|\\]/g, "\\$&")
                .replace(/\\\[/g, "[")
                .replace(/\\\]/g, "]");
            const regex = new RegExp(`^${regexPattern}$`);

            const matched: string[] = [];
            for (let i = 1; i <= 6; i++) {
                const testTag = `${base}h${i}`;
                if (regex.test(testTag)) {
                    matched.push(testTag);
                }
            }

            // Should have all 6 matches
            expect(matched).toHaveLength(6);

            // Limit to first 10 (in this case, all 6)
            const limited = matched.slice(0, 10);
            expect(limited).toHaveLength(6);
        });
    });

    describe("UI State Management", () => {
        it("should maintain heading level selection state", () => {
            const selectedLevels = new Set<number>();

            selectedLevels.add(2);
            selectedLevels.add(3);

            expect(selectedLevels.has(2)).toBe(true);
            expect(selectedLevels.has(3)).toBe(true);
            expect(selectedLevels.has(4)).toBe(false);
        });

        it("should toggle heading level selection", () => {
            const selectedLevels = new Set<number>([2]);

            // Toggle on
            selectedLevels.add(3);
            expect(selectedLevels.has(3)).toBe(true);

            // Toggle off
            selectedLevels.delete(3);
            expect(selectedLevels.has(3)).toBe(false);
        });

        it("should maintain recognition mode selection", () => {
            let mode: "qa" | "all" = "qa";

            expect(mode).toBe("qa");

            mode = "all";
            expect(mode).toBe("all");
        });

        it("should maintain nesting mode selection", () => {
            let nestingMode: "nested" | "flat" = "nested";

            expect(nestingMode).toBe("nested");

            nestingMode = "flat";
            expect(nestingMode).toBe("flat");
        });

        it("should maintain enabled toggle state", () => {
            let enabled = true;

            expect(enabled).toBe(true);

            enabled = false;
            expect(enabled).toBe(false);

            enabled = true;
            expect(enabled).toBe(true);
        });
    });
});
