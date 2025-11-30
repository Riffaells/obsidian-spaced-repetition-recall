import { DEFAULT_SETTINGS, upgradeSettings, SRSettings } from "src/settings";
import { generatePredefinedTags } from "src/parser/header-based/utils";
import { HeaderCardConfig } from "src/parser/header-based/types";

describe("Header Card Settings Integration", () => {
    describe("Settings Initialization", () => {
        it("should have default header card settings", () => {
            const settings = { ...DEFAULT_SETTINGS };
            
            expect(settings.enableHeaderBasedCards).toBe(false);
            expect(settings.headerCardBaseConfig).toEqual({
                headingLevels: [2],
                mode: "qa",
                nestingMode: "nested",
            });
            expect(settings.headerCardCustomTags).toEqual({});
            expect(settings.headerCardShowContext).toBe(true);
        });
    });

    describe("Settings Persistence", () => {
        it("should preserve header card settings after upgrade", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                enableHeaderBasedCards: true,
                headerCardBaseConfig: {
                    headingLevels: [2, 3],
                    mode: "all",
                    nestingMode: "flat",
                },
                headerCardCustomTags: {
                    "#custom": {
                        headingLevels: [1],
                        mode: "qa",
                        nestingMode: "nested",
                        enabled: true,
                    },
                },
                headerCardShowContext: false,
            };

            upgradeSettings(settings);

            expect(settings.enableHeaderBasedCards).toBe(true);
            expect(settings.headerCardBaseConfig).toEqual({
                headingLevels: [2, 3],
                mode: "all",
                nestingMode: "flat",
            });
            expect(settings.headerCardCustomTags["#custom"]).toEqual({
                headingLevels: [1],
                mode: "qa",
                nestingMode: "nested",
                enabled: true,
            });
            expect(settings.headerCardShowContext).toBe(false);
        });

        it("should migrate from v1 headerCardDefaultConfig to v2 headerCardBaseConfig", () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const settings: any = {
                ...DEFAULT_SETTINGS,
                headerCardDefaultConfig: {
                    headingLevels: [3, 4],
                    mode: "all",
                    nestingMode: "flat",
                },
            };
            delete settings.headerCardBaseConfig;

            upgradeSettings(settings);

            expect(settings.headerCardBaseConfig).toEqual({
                headingLevels: [3, 4],
                mode: "all",
                nestingMode: "flat",
            });
            expect(settings.headerCardDefaultConfig).toBeUndefined();
        });
    });

    describe("Predefined Tags Generation", () => {
        it("should generate predefined tags from base config", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);

            // Check individual level tags
            expect(tags.has("#flashcards/h1")).toBe(true);
            expect(tags.has("#flashcards/h2")).toBe(true);
            expect(tags.has("#flashcards/h3")).toBe(true);
            expect(tags.has("#flashcards/h4")).toBe(true);
            expect(tags.has("#flashcards/h5")).toBe(true);
            expect(tags.has("#flashcards/h6")).toBe(true);

            // Check range tags
            expect(tags.has("#flashcards/h2-h3")).toBe(true);
            expect(tags.has("#flashcards/h1-h3")).toBe(true);
            expect(tags.has("#flashcards/h3-h5")).toBe(true);

            // Check mode tags
            expect(tags.has("#flashcards/qa")).toBe(true);
            expect(tags.has("#flashcards/all")).toBe(true);

            // Check nesting mode tags
            expect(tags.has("#flashcards/nested")).toBe(true);
            expect(tags.has("#flashcards/flat")).toBe(true);
        });

        it("should generate correct configurations for level tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);
            const h2Config = tags.get("#flashcards/h2");

            expect(h2Config).toEqual({
                headingLevels: [2],
                mode: "qa",
                nestingMode: "nested",
                enabled: true,
            });
        });

        it("should generate correct configurations for range tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);
            const rangeConfig = tags.get("#flashcards/h2-h3");

            expect(rangeConfig).toEqual({
                headingLevels: [2, 3],
                mode: "qa",
                nestingMode: "nested",
                enabled: true,
            });
        });

        it("should generate correct configurations for mode tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);
            
            const qaConfig = tags.get("#flashcards/qa");
            expect(qaConfig?.mode).toBe("qa");
            
            const allConfig = tags.get("#flashcards/all");
            expect(allConfig?.mode).toBe("all");
        });

        it("should generate correct configurations for nesting mode tags", () => {
            const baseConfig = {
                headingLevels: [2],
                mode: "qa" as const,
                nestingMode: "nested" as const,
            };

            const tags = generatePredefinedTags(baseConfig);
            
            const nestedConfig = tags.get("#flashcards/nested");
            expect(nestedConfig?.nestingMode).toBe("nested");
            
            const flatConfig = tags.get("#flashcards/flat");
            expect(flatConfig?.nestingMode).toBe("flat");
        });
    });

    describe("Custom Tags Management", () => {
        it("should allow adding custom tags", () => {
            const settings: SRSettings = { ...DEFAULT_SETTINGS };
            
            settings.headerCardCustomTags["#custom"] = {
                headingLevels: [1, 2],
                mode: "all",
                nestingMode: "flat",
                enabled: true,
            };

            expect(settings.headerCardCustomTags["#custom"]).toBeDefined();
            expect(settings.headerCardCustomTags["#custom"].headingLevels).toEqual([1, 2]);
        });

        it("should allow removing custom tags", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardCustomTags: {
                    "#custom": {
                        headingLevels: [1],
                        mode: "qa",
                        nestingMode: "nested",
                        enabled: true,
                    },
                },
            };

            delete settings.headerCardCustomTags["#custom"];

            expect(settings.headerCardCustomTags["#custom"]).toBeUndefined();
        });

        it("should allow updating custom tags", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardCustomTags: {
                    "#custom": {
                        headingLevels: [1],
                        mode: "qa",
                        nestingMode: "nested",
                        enabled: true,
                    },
                },
            };

            settings.headerCardCustomTags["#custom"] = {
                headingLevels: [2, 3],
                mode: "all",
                nestingMode: "flat",
                enabled: false,
            };

            expect(settings.headerCardCustomTags["#custom"]).toEqual({
                headingLevels: [2, 3],
                mode: "all",
                nestingMode: "flat",
                enabled: false,
            });
        });

        it("should support regex patterns in custom tags", () => {
            const settings: SRSettings = {
                ...DEFAULT_SETTINGS,
                headerCardCustomTags: {
                    "#flashcards/h[123]": {
                        headingLevels: [1, 2, 3],
                        mode: "qa",
                        nestingMode: "nested",
                        enabled: true,
                    },
                },
            };

            expect(settings.headerCardCustomTags["#flashcards/h[123]"]).toBeDefined();
            expect(settings.headerCardCustomTags["#flashcards/h[123]"].headingLevels).toEqual([
                1, 2, 3,
            ]);
        });
    });

    describe("Base Config Updates", () => {
        it("should allow updating heading levels", () => {
            const settings: SRSettings = { ...DEFAULT_SETTINGS };
            
            settings.headerCardBaseConfig.headingLevels = [1, 2, 3];

            expect(settings.headerCardBaseConfig.headingLevels).toEqual([1, 2, 3]);
        });

        it("should allow updating recognition mode", () => {
            const settings: SRSettings = { ...DEFAULT_SETTINGS };
            
            settings.headerCardBaseConfig.mode = "all";

            expect(settings.headerCardBaseConfig.mode).toBe("all");
        });

        it("should allow updating nesting mode", () => {
            const settings: SRSettings = { ...DEFAULT_SETTINGS };
            
            settings.headerCardBaseConfig.nestingMode = "flat";

            expect(settings.headerCardBaseConfig.nestingMode).toBe("flat");
        });

        it("should allow toggling show context", () => {
            const settings: SRSettings = { ...DEFAULT_SETTINGS };
            
            settings.headerCardShowContext = false;

            expect(settings.headerCardShowContext).toBe(false);
        });

        it("should allow toggling enable header cards", () => {
            const settings: SRSettings = { ...DEFAULT_SETTINGS };
            
            settings.enableHeaderBasedCards = true;

            expect(settings.enableHeaderBasedCards).toBe(true);
        });
    });
});
