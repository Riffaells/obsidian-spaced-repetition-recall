import { describe, test, expect, mock } from "bun:test";
import { NoteFileLoader } from "src/core/services/NoteFileLoader";
import { SRSettings } from "src/settings/settings";
import { ISRFile } from "src/core/services/SRFile";
import { TopicPath } from "src/core/services/TopicPath";
import { TextDirection } from "src/utils/TextDirection";
import { FlashcardRule } from "src/parser/rule-based/types";

// Mock obsidian
mock.module("obsidian", () => ({
    App: class {},
    Plugin: class {},
    Notice: class {},
    TFile: class {},
    TAbstractFile: class {},
}));

// Mock helpers
mock.module("src/lang/helpers", () => ({
    t: (str: string) => str,
}));

// Mock DataStore
mock.module("src/dataStore/data", () => ({
    DataStore: {
        getInstance: () => ({
            isInTrackedFiles: () => false,
            getTrackedFile: () => null,
        }),
    },
}));

// Mock ISRFile
class MockSRFile implements ISRFile {
    path: string;
    basename: string;
    content: string;

    constructor(path: string, content: string) {
        this.path = path;
        this.basename = path.split("/").pop()?.replace(".md", "") || "";
        this.content = content;
    }

    getQuestionContext(cardLine: number): string[] {
        return [];
    }
    getAllTagsFromCache(): string[] {
        return this.content.match(/#[^\s#]+/g) || [];
    }
    getAllTagsFromText(): any[] {
        return [];
    }
    getTextDirection(): TextDirection {
        return TextDirection.Ltr;
    }
    async read(): Promise<string> {
        return this.content;
    }
    async write(content: string): Promise<void> {
        this.content = content;
    }
}

// Minimal mock settings
const MOCK_SETTINGS: Partial<SRSettings> = {
    convertFoldersToDecks: true,
    flashcardRules: [],
    editLaterTag: "#edit-later",
    cardCommentOnSameLine: false,
    dataLocation: "NOTES" as any,
    baseEase: 250,
};

describe("NoteFileLoader - Convert Folders to Decks", () => {
    test("should assign folder deck when convertFoldersToDecks is enabled", async () => {
        const settings = { ...MOCK_SETTINGS } as SRSettings;
        settings.convertFoldersToDecks = true;

        const defaultRule: FlashcardRule = {
            id: "default-inline",
            name: "Default Inline",
            type: "inline",
            enabled: true,
            priority: 0,
            tagPattern: "^#flashcards$",
            config: {
                separator: "::",
                separatorReverse: ":::",
                startOfLineOnly: false,
            },
        };
        settings.flashcardRules = [defaultRule];

        const loader = new NoteFileLoader(settings);
        const noteContent = "#flashcards Question::Answer";
        const noteFile = new MockSRFile("Folder/Subfolder/Note.md", noteContent);

        const folderTopicPath = TopicPath.getFolderPathFromFilename(noteFile, settings);

        const note = await loader.load(noteFile, TextDirection.Ltr, folderTopicPath);

        expect(note).not.toBeNull();
        expect(note!.questionList.length).toBe(1);

        const question = note!.questionList[0];
        expect(question.topicPathList.list.length).toBe(1);
        expect(question.topicPathList.list[0].path).toEqual(["Folder", "Subfolder"]);
    });

    test("should NOT assign folder deck when convertFoldersToDecks is disabled", async () => {
        const settings = { ...MOCK_SETTINGS } as SRSettings;
        settings.convertFoldersToDecks = false;

        const defaultRule: FlashcardRule = {
            id: "default-inline",
            name: "Default Inline",
            type: "inline",
            enabled: true,
            priority: 0,
            tagPattern: "^#flashcards$",
            config: {
                separator: "::",
                separatorReverse: ":::",
                startOfLineOnly: false,
            },
        };
        settings.flashcardRules = [defaultRule];

        const loader = new NoteFileLoader(settings);
        const noteContent = "Question::Answer";
        const noteFile = new MockSRFile("Folder/Subfolder/Note.md", noteContent);

        const folderTopicPath = TopicPath.getFolderPathFromFilename(noteFile, settings);

        const note = await loader.load(noteFile, TextDirection.Ltr, folderTopicPath);

        expect(note).not.toBeNull();
        expect(note!.questionList.length).toBe(0);
    });

    test("should prioritize folder deck over tag when convertFoldersToDecks is enabled", async () => {
        const settings = { ...MOCK_SETTINGS } as SRSettings;
        settings.convertFoldersToDecks = true;

        const defaultRule: FlashcardRule = {
            id: "default-inline",
            name: "Default Inline",
            type: "inline",
            enabled: true,
            priority: 0,
            tagPattern: "^#flashcards$",
            config: {
                separator: "::",
                separatorReverse: ":::",
                startOfLineOnly: false,
            },
        };
        settings.flashcardRules = [defaultRule];

        const loader = new NoteFileLoader(settings);
        // Card has a tag #mytag, but folder path should take priority
        const noteContent = "#flashcards Question::Answer #mytag";
        const noteFile = new MockSRFile("Folder/Subfolder/Note.md", noteContent);

        const folderTopicPath = TopicPath.getFolderPathFromFilename(noteFile, settings);

        const note = await loader.load(noteFile, TextDirection.Ltr, folderTopicPath);

        expect(note).not.toBeNull();
        expect(note!.questionList.length).toBe(1);

        const question = note!.questionList[0];
        // Should have only 1 topic path: folder path takes priority over tags
        expect(question.topicPathList.list.length).toBe(1);
        expect(question.topicPathList.list[0].formatAsTag()).toBe("#Folder/Subfolder");
    });
});
