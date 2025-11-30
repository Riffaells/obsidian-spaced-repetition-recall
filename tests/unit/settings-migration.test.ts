import { upgradeSettings, DEFAULT_SETTINGS, SRSettings } from "src/settings";

describe("Settings Migration - Header-Based Flashcards", () => {
    describe("upgradeSettings", () => {
        it("should add enableHeaderBasedCards when missing", () => {
            const settings = {} as SRSettings;
            upgradeSettings(settings);
            expect(settings.enableHeaderBasedCards).toBe(false);
        });

        it("should add headerCardBaseConfig when missing", () => {
            const settings = {} as SRSettings;
            upgradeSettings(settings);
            expect(settings.headerCardBaseConfig).toEqual({
                headingLevels: [2],
                mode: "qa",
                nestingMode: "nested",
            });
        });

        it("should add headerCardCustomTags when missing", () => {
            const settings = {} as SRSettings;
            upgradeSettings(settings);
            expect(settings.headerCardCustomTags).toEqual({});
        });

        it("should add headerCardShowContext when missing", () => {
            const settings = {} as SRSettings;
            upgradeSettings(settings);
            expect(settings.headerCardShowContext).toBe(true);
        });

        it("should not overwrite existing header-based settings", () => {
            const customConfig = {
                headingLevels: [3, 4],
                mode: "all" as const,
                nestingMode: "flat" as const,
            };
            const customTags = {
                "#custom": {
                    headingLevels: [2],
                    nestingMode: "nested" as const,
                    mode: "qa" as const,
                    enabled: true,
                },
            };

            const settings = {
                enableHeaderBasedCards: true,
                headerCardBaseConfig: customConfig,
                headerCardCustomTags: customTags,
                headerCardShowContext: false,
            } as Partial<SRSettings> as SRSettings;

            upgradeSettings(settings);

            expect(settings.enableHeaderBasedCards).toBe(true);
            expect(settings.headerCardBaseConfig).toEqual(customConfig);
            expect(settings.headerCardCustomTags).toEqual(customTags);
            expect(settings.headerCardShowContext).toBe(false);
        });

        it("should handle partial migration (some fields present, some missing)", () => {
            const settings = {
                enableHeaderBasedCards: true,
                // headerCardBaseConfig is missing
                headerCardCustomTags: { "#test": {
                    headingLevels: [2],
                    nestingMode: "nested" as const,
                    mode: "qa" as const,
                    enabled: true,
                }},
                // headerCardShowContext is missing
            } as Partial<SRSettings> as SRSettings;

            upgradeSettings(settings);

            expect(settings.enableHeaderBasedCards).toBe(true);
            expect(settings.headerCardBaseConfig).toEqual(
                DEFAULT_SETTINGS.headerCardBaseConfig,
            );
            expect(settings.headerCardCustomTags).toEqual({
                "#test": {
                    headingLevels: [2],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            });
            expect(settings.headerCardShowContext).toBe(true);
        });

        it("should migrate from v1 headerCardDefaultConfig to v2 headerCardBaseConfig", () => {
            // Simulate old v1 settings with headerCardDefaultConfig
            const oldSettings = {
                flashcardTags: ["#flashcards"],
                enableHeaderBasedCards: true,
                headerCardDefaultConfig: {
                    headingLevels: [2, 3],
                    nestingMode: "flat",
                    mode: "all",
                    enabled: true,
                },
                headerCardCustomTags: {},
                headerCardShowContext: true,
                flashcardTagRules: [], // Added this line
            } as unknown as SRSettings;

            upgradeSettings(oldSettings);

            // Should migrate to new format
            expect(oldSettings.headerCardBaseConfig).toEqual({
                headingLevels: [2, 3],
                mode: "all",
                nestingMode: "flat",
            });
            // Old property should be removed
            expect((oldSettings as any).headerCardDefaultConfig).toBeUndefined();
        });

        it("should maintain backward compatibility with existing settings", () => {
            // Simulate an old settings object without header-based fields
            const oldSettings = {
                flashcardTags: ["#flashcards"],
                convertFoldersToDecks: false,
                burySiblingCards: false,
                // ... other old settings
            } as Partial<SRSettings> as SRSettings;

            upgradeSettings(oldSettings);

            // Should add new fields with defaults
            expect(oldSettings.enableHeaderBasedCards).toBe(false);
            expect(oldSettings.headerCardBaseConfig).toBeDefined();
            expect(oldSettings.headerCardCustomTags).toBeDefined();
            expect(oldSettings.headerCardShowContext).toBe(true);

            // Should not affect existing settings
            expect(oldSettings.flashcardTags).toEqual(["#flashcards"]);
            expect(oldSettings.convertFoldersToDecks).toBe(false);
            expect(oldSettings.burySiblingCards).toBe(false);
        });

        it("should migrate v1 headerCardDefaultConfig with partial data", () => {
            // Simulate v1 settings with only some fields in headerCardDefaultConfig
            const oldSettings = {
                enableHeaderBasedCards: true,
                headerCardDefaultConfig: {
                    headingLevels: [3],
                    // mode and nestingMode are missing
                },
            } as unknown as SRSettings;

            upgradeSettings(oldSettings);

            expect(oldSettings.headerCardBaseConfig).toEqual({
                headingLevels: [3],
                mode: "qa",
                nestingMode: "nested",
            });
            expect((oldSettings as any).headerCardDefaultConfig).toBeUndefined();
        });

        it("should not migrate if headerCardBaseConfig already exists", () => {
            // Simulate settings where both old and new config exist
            const settings = {
                enableHeaderBasedCards: true,
                headerCardDefaultConfig: {
                    headingLevels: [4],
                    mode: "all",
                    nestingMode: "flat",
                },
                headerCardBaseConfig: {
                    headingLevels: [2],
                    mode: "qa",
                    nestingMode: "nested",
                },
            } as unknown as SRSettings;

            upgradeSettings(settings);

            // Should keep existing headerCardBaseConfig, not overwrite
            expect(settings.headerCardBaseConfig).toEqual({
                headingLevels: [2],
                mode: "qa",
                nestingMode: "nested",
            });
        });

        it("should use default values when v1 headerCardDefaultConfig has empty headingLevels", () => {
            const oldSettings = {
                enableHeaderBasedCards: true,
                headerCardDefaultConfig: {
                    headingLevels: [],
                    mode: "all",
                    nestingMode: "flat",
                },
            } as unknown as SRSettings;

            upgradeSettings(oldSettings);

            // Empty array should be preserved (not replaced with default)
            expect(oldSettings.headerCardBaseConfig).toEqual({
                headingLevels: [],
                mode: "all",
                nestingMode: "flat",
            });
        });
    });
});
