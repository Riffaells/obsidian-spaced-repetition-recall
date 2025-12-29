import { mock } from "bun:test";

// Mock obsidian module with all commonly used exports
mock.module("obsidian", () => ({
    App: class {},
    Plugin: class {},
    Notice: class {},
    TFile: class {},
    TAbstractFile: class {},
    TFolder: class {},
    Vault: class {},
    DataAdapter: class {},
    MetadataCache: class {},
    Setting: class {},
    PluginSettingTab: class {},
    Modal: class {},
    MarkdownView: class {},
    WorkspaceLeaf: class {},
    FrontMatterCache: class {},
    ButtonComponent: class {
        setButtonText() { return this; }
        onClick() { return this; }
        setClass() { return this; }
        setTooltip() { return this; }
    },
    MarkdownRenderer: {
        renderMarkdown: () => Promise.resolve(),
    },
    Platform: {
        isDesktop: true,
        isMobile: false,
        isWin: false,
        isMacOS: false,
        isLinux: false,
    },
    moment: {
        locale: () => "en",
        format: () => "2024-01-01",
    },
    getAllTags: () => [],
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
