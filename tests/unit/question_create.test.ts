import { describe, test, expect, mock } from "bun:test";
import { Question, CardType } from "src/core/models/Question";
import { TopicPath } from "src/core/services/TopicPath";
import { TextDirection } from "src/utils/TextDirection";
import { FlashcardRule, ParsedFlashcard } from "src/parser/rule-based/types";
import { SRSettings } from "src/settings/settings";
import { ISRFile } from "src/core/services/SRFile";

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
    constructor(path: string) {
        this.path = path;
        this.basename = "";
        this.content = "";
    }
    getQuestionContext() {
        return [];
    }
    getAllTagsFromCache() {
        return [];
    }
    getAllTagsFromText() {
        return [];
    }
    getTextDirection() {
        return TextDirection.Ltr;
    }
    async read() {
        return "";
    }
    async write() {}
}

describe("Question.Create", () => {
    test("should include folder deck when convertFoldersToDecks is true", () => {
        const settings = { convertFoldersToDecks: true, editLaterTag: "#edit-later" } as SRSettings;
        const flashcard: ParsedFlashcard = {
            id: "1",
            front: "Q",
            back: "A",
            tags: ["#flashcards"],
            ruleId: "rule1",
            context: {
                lineNumber: 1,
                text: "Q::A",
                filePath: "Folder/Note.md",
                fileName: "Note.md",
                folderPath: "Folder",
                tags: [],
            },
        };
        const rule: FlashcardRule = {
            id: "rule1",
            name: "Rule",
            type: "inline",
            enabled: true,
            priority: 0,
            tagPattern: "",
            config: {},
        };
        const noteFile = new MockSRFile("Folder/Note.md");
        const folderTopicPath = new TopicPath(["Folder"]);

        const question = Question.Create(
            settings,
            flashcard,
            CardType.SingleLineBasic,
            rule,
            noteFile,
            TextDirection.Ltr,
            folderTopicPath,
        );

        expect(question.topicPathList.list.length).toBe(1);
        expect(question.topicPathList.list[0].formatAsTag()).toBe("#Folder");
    });

    test("should prioritize folder deck over tag", () => {
        const settings = { convertFoldersToDecks: true, editLaterTag: "#edit-later" } as SRSettings;
        const flashcard: ParsedFlashcard = {
            id: "1",
            front: "Q",
            back: "A",
            tags: ["#flashcards", "#mytag"],
            ruleId: "rule1",
            context: {
                lineNumber: 1,
                text: "Q::A",
                filePath: "Folder/Note.md",
                fileName: "Note.md",
                folderPath: "Folder",
                tags: [],
            },
        };
        const rule: FlashcardRule = {
            id: "rule1",
            name: "Rule",
            type: "inline",
            enabled: true,
            priority: 0,
            tagPattern: "",
            config: {},
        };
        const noteFile = new MockSRFile("Folder/Note.md");
        const folderTopicPath = new TopicPath(["Folder"]);

        const question = Question.Create(
            settings,
            flashcard,
            CardType.SingleLineBasic,
            rule,
            noteFile,
            TextDirection.Ltr,
            folderTopicPath,
        );

        // Should have only 1 topic path: folder path takes priority over tags
        expect(question.topicPathList.list.length).toBe(1);
        expect(question.topicPathList.list[0].formatAsTag()).toBe("#Folder");
    });

    test("should assign default deck for cards with only #flashcards tag", () => {
        const settings = { convertFoldersToDecks: false, editLaterTag: "#edit-later" } as SRSettings;
        const flashcard: ParsedFlashcard = {
            id: "1",
            front: "Q",
            back: "A",
            tags: ["#flashcards"],
            ruleId: "rule1",
            context: {
                lineNumber: 1,
                text: "Q::A",
                filePath: "Note.md",
                fileName: "Note.md",
                folderPath: "",
                tags: [],
            },
        };
        const rule: FlashcardRule = {
            id: "rule1",
            name: "Rule",
            type: "inline",
            enabled: true,
            priority: 0,
            tagPattern: "",
            config: {},
        };
        const noteFile = new MockSRFile("Note.md");
        const folderTopicPath = TopicPath.emptyPath;

        const question = Question.Create(
            settings,
            flashcard,
            CardType.SingleLineBasic,
            rule,
            noteFile,
            TextDirection.Ltr,
            folderTopicPath,
        );

        // Should have default deck assigned
        expect(question.topicPathList.list.length).toBe(1);
        expect(question.topicPathList.list[0].path).toEqual(["default_name"]);
    });

    test("should prefer subdeck tag over default deck", () => {
        const settings = { convertFoldersToDecks: false, editLaterTag: "#edit-later" } as SRSettings;
        const flashcard: ParsedFlashcard = {
            id: "1",
            front: "Q",
            back: "A",
            tags: ["#flashcards", "#flashcards/math"],
            ruleId: "rule1",
            context: {
                lineNumber: 1,
                text: "Q::A",
                filePath: "Note.md",
                fileName: "Note.md",
                folderPath: "",
                tags: [],
            },
        };
        const rule: FlashcardRule = {
            id: "rule1",
            name: "Rule",
            type: "inline",
            enabled: true,
            priority: 0,
            tagPattern: "",
            config: {},
        };
        const noteFile = new MockSRFile("Note.md");
        const folderTopicPath = TopicPath.emptyPath;

        const question = Question.Create(
            settings,
            flashcard,
            CardType.SingleLineBasic,
            rule,
            noteFile,
            TextDirection.Ltr,
            folderTopicPath,
        );

        // Should use subdeck tag, not default deck
        expect(question.topicPathList.list.length).toBe(1);
        expect(question.topicPathList.list[0].formatAsTag()).toBe("#flashcards/math");
    });
});
