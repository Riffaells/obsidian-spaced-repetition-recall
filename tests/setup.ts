import { mock } from "bun:test";

// Mock obsidian module
mock.module("obsidian", () => ({
    App: class {},
    Plugin: class {},
    Notice: class {},
    TFile: class {},
    TAbstractFile: class {},
    Platform: {
        isDesktop: true,
        isMobile: false,
        isWin: false,
        isMacOS: false,
        isLinux: false,
    },
    moment: {
        locale: () => "en",
    },
}));

// Mock helpers
mock.module("src/lang/helpers", () => ({
    t: (str: string) => str,
}));

// Mock DataStore
mock.module("src/dataStore/data", () => ({
    DataStore: {
        getInstance: (): any => ({
            isInTrackedFiles: () => false,
            getTrackedFile: (): null => null,
        }),
    },
}));
