import { DEFAULT_SETTINGS, SRSettings, upgradeSettings } from "src/settings";

describe("Header Card Settings Integration", () => {
    test("DEFAULT_SETTINGS should include header card settings", () => {
        expect(DEFAULT_SETTINGS.enableHeaderBasedCards).toBeDefined();
        expect(DEFAULT_SETTINGS.headerCardBaseConfig).toBeDefined();
        expect(DEFAULT_SETTINGS.headerCardCustomTags).toBeDefined();
        expect(DEFAULT_SETTINGS.headerCardShowContext).toBeDefined();
    });

    test("header card settings should have correct default values", () => {
        expect(DEFAULT_SETTINGS.enableHeaderBasedCards).toBe(false);
        expect(DEFAULT_SETTINGS.headerCardBaseConfig.headingLevels).toEqual([2]);
        expect(DEFAULT_SETTINGS.headerCardBaseConfig.nestingMode).toBe("nested");
        expect(DEFAULT_SETTINGS.headerCardBaseConfig.mode).toBe("qa");
        expect(DEFAULT_SETTINGS.headerCardShowContext).toBe(true);
    });

    test("custom tags should be empty by default", () => {
        expect(DEFAULT_SETTINGS.headerCardCustomTags).toEqual({});
        expect(Object.keys(DEFAULT_SETTINGS.headerCardCustomTags).length).toBe(0);
    });

    test("upgradeSettings should add header card settings to old settings", () => {
        const oldSettings = {
            flashcardTags: ["#flashcards"],
            // Missing header card settings
        } as Partial<SRSettings>;

        upgradeSettings(oldSettings as SRSettings);

        expect(oldSettings.enableHeaderBasedCards).toBe(false);
        expect(oldSettings.headerCardBaseConfig).toEqual({
            headingLevels: [2],
            mode: "qa",
            nestingMode: "nested",
        });
        expect(oldSettings.headerCardCustomTags).toEqual({});
        expect(oldSettings.headerCardShowContext).toBe(true);
    });

    test("upgradeSettings should migrate v1 headerCardDefaultConfig to v2 headerCardBaseConfig", () => {
        const existingSettings = {
            flashcardTags: ["#flashcards"],
            enableHeaderBasedCards: true,
            headerCardDefaultConfig: {
                headingLevels: [2, 3],
                nestingMode: "flat",
                mode: "all",
                enabled: true,
            },
            headerCardCustomTags: {
                "#custom": {
                    headingLevels: [1],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            },
            headerCardShowContext: false,
        } as unknown as SRSettings;

        upgradeSettings(existingSettings as SRSettings);

        expect(existingSettings.enableHeaderBasedCards).toBe(true);
        // Should be migrated to new format (without enabled field)
        expect(existingSettings.headerCardBaseConfig.headingLevels).toEqual([2, 3]);
        expect(existingSettings.headerCardBaseConfig.nestingMode).toBe("flat");
        expect(existingSettings.headerCardBaseConfig.mode).toBe("all");
        expect(existingSettings.headerCardCustomTags["#custom"]).toBeDefined();
        expect(existingSettings.headerCardShowContext).toBe(false);
        // Old property should be removed
        expect((existingSettings as any).headerCardDefaultConfig).toBeUndefined();
    });

    test("upgradeSettings should preserve existing v2 headerCardBaseConfig", () => {
        const existingSettings = {
            flashcardTags: ["#flashcards"],
            enableHeaderBasedCards: true,
            headerCardBaseConfig: {
                headingLevels: [2, 3],
                mode: "all",
                nestingMode: "flat",
            },
            headerCardCustomTags: {
                "#custom": {
                    headingLevels: [1],
                    nestingMode: "nested",
                    mode: "qa",
                    enabled: true,
                },
            },
            headerCardShowContext: false,
        } as Partial<SRSettings>;

        upgradeSettings(existingSettings as SRSettings);

        expect(existingSettings.enableHeaderBasedCards).toBe(true);
        expect(existingSettings.headerCardBaseConfig!.headingLevels).toEqual([2, 3]);
        expect(existingSettings.headerCardBaseConfig!.nestingMode).toBe("flat");
        expect(existingSettings.headerCardBaseConfig!.mode).toBe("all");
        expect(existingSettings.headerCardCustomTags!["#custom"]).toBeDefined();
        expect(existingSettings.headerCardShowContext).toBe(false);
    });

    test("SRSettings interface should include header card fields", () => {
        const settings: SRSettings = {
            ...DEFAULT_SETTINGS,
            enableHeaderBasedCards: true,
            headerCardBaseConfig: {
                headingLevels: [1, 2, 3],
                mode: "qa",
                nestingMode: "nested",
            },
            headerCardCustomTags: {
                "#test": {
                    headingLevels: [2],
                    nestingMode: "flat",
                    mode: "all",
                    enabled: false,
                },
            },
            headerCardShowContext: false,
        };

        // TypeScript compilation will fail if these fields don't exist
        expect(settings.enableHeaderBasedCards).toBe(true);
        expect(settings.headerCardBaseConfig.headingLevels).toEqual([1, 2, 3]);
        expect(settings.headerCardCustomTags["#test"]).toBeDefined();
        expect(settings.headerCardShowContext).toBe(false);
    });
});
