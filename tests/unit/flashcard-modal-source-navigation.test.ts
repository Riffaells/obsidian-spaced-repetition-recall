/**
 * Property-Based Tests for Source Note Navigation
 *
 * Feature: flashcard-modal-rewrite
 *
 * These tests validate the correctness properties for source note navigation:
 * - Property 50: Source Note Scrolling Precision
 * - Property 51: Collapsed Section Expansion
 * - Property 52: Card Text Highlighting
 * - Property 53: Dual Mode Scrolling Support
 * - Property 36: Source Note Navigation
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 13.2
 */

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { SourceNoteNavigator } from "src/gui/flashcard-modal-rewrite/services/SourceNoteNavigator";
import { Card } from "src/core/models/Card";
import { SrTFile } from "src/core/services/SRFile";
import { App, TFile, MarkdownView, WorkspaceLeaf, EditorPosition } from "obsidian";

// Mock Obsidian types
class MockTFile {
    path: string;
    basename: string;

    constructor(path: string) {
        this.path = path;
        this.basename = path.split("/").pop() || "";
    }
}

class MockEditor {
    private lines: string[] = [];
    private cursorPosition: EditorPosition = { line: 0, ch: 0 };
    private selection: { from: EditorPosition; to: EditorPosition } | null = null;

    constructor(content: string) {
        this.lines = content.split("\n");
    }

    getLine(lineNumber: number): string {
        return this.lines[lineNumber] || "";
    }

    setCursor(position: EditorPosition): void {
        this.cursorPosition = position;
    }

    getCursor(): EditorPosition {
        return this.cursorPosition;
    }

    setSelection(from: EditorPosition, to: EditorPosition): void {
        this.selection = { from, to };
    }

    getSelection(): { from: EditorPosition; to: EditorPosition } | null {
        return this.selection;
    }

    scrollIntoView(range: any, center: boolean): void {
        // Mock scroll behavior
    }
}

// Make MockMarkdownView extend the actual MarkdownView to pass instanceof checks
class MockMarkdownView extends MarkdownView {
    editor: MockEditor | null;

    constructor(editor: MockEditor | null = null) {
        // Call super with minimal required args (will be mocked anyway)
        super(null as any, null as any);
        this.editor = editor;
    }
}

class MockWorkspaceLeaf {
    view: MockMarkdownView;

    constructor(view: MockMarkdownView) {
        this.view = view;
    }

    async openFile(file: TFile): Promise<void> {
        // Mock file opening
    }
}

class MockWorkspace {
    private leaves: MockWorkspaceLeaf[] = [];
    private activeView: MockMarkdownView | null = null;

    getLeaf(newLeaf: boolean): MockWorkspaceLeaf {
        if (this.leaves.length === 0 || newLeaf) {
            const leaf = new MockWorkspaceLeaf(new MockMarkdownView());
            this.leaves.push(leaf);
            return leaf;
        }
        return this.leaves[0];
    }

    getActiveViewOfType(type: any): MockMarkdownView | null {
        return this.activeView;
    }

    setActiveView(view: MockMarkdownView): void {
        this.activeView = view;
    }
}

class MockVault {
    private files: Map<string, MockTFile> = new Map();

    addFile(path: string): MockTFile {
        const file = new MockTFile(path);
        this.files.set(path, file);
        return file;
    }

    getAbstractFileByPath(path: string): MockTFile | null {
        return this.files.get(path) || null;
    }
}

class MockApp {
    workspace: MockWorkspace;
    vault: MockVault;

    constructor() {
        this.workspace = new MockWorkspace();
        this.vault = new MockVault();
    }
}

// Helper function to create a test card
function createTestCard(filePath: string, lineNumber: number, content: string): Card {
    const mockFile = new MockTFile(filePath);

    // Create a proper SrTFile with all required parameters
    const mockVault = {} as any;
    const mockMetadataCache = {} as any;
    const srFile = new SrTFile(mockVault, mockMetadataCache, mockFile as any);

    // Create a mock card with the necessary structure
    const card = {
        front: content,
        back: "Answer",
        question: {
            note: {
                file: srFile,
                filePath: filePath,
            },
            lineNo: lineNumber,
            questionText: {
                original: content,
                actualQuestion: content,
                textDirection: 0, // Unspecified
            },
            questionType: 1, // SingleLineBasic
            topicPathList: { list: [] },
            hasEditLaterTag: false,
        },
    } as any as Card;

    return card;
}

describe("Source Note Navigation - Property Tests", () => {
    let mockApp: MockApp;
    let navigator: SourceNoteNavigator;

    beforeEach(() => {
        mockApp = new MockApp();
        navigator = new SourceNoteNavigator(mockApp as any);
    });

    afterEach(() => {
        navigator.cleanup();
    });

    /**
     * Feature: flashcard-modal-rewrite, Property 50: Source Note Scrolling Precision
     *
     * For any card, when opening the source note, the system SHALL scroll to the exact
     * line number where the card is defined and position it in the center of the viewport.
     *
     * Validates: Requirements 17.1, 17.4
     */
    test("Property 50: Source Note Scrolling Precision - scrolls to exact line number", async () => {
        // Test with various line numbers
        const testCases = [
            { lineNumber: 0, description: "first line" },
            { lineNumber: 10, description: "middle line" },
            { lineNumber: 50, description: "later line" },
            { lineNumber: 100, description: "far line" },
        ];

        for (const testCase of testCases) {
            const filePath = `test-note-${testCase.lineNumber}.md`;
            const card = createTestCard(filePath, testCase.lineNumber, "Test question");

            // Add file to mock vault
            const mockFile = mockApp.vault.addFile(filePath);

            // Create mock editor with content
            const content = Array(testCase.lineNumber + 10)
                .fill("Line content")
                .join("\n");
            const mockEditor = new MockEditor(content);
            const mockView = new MockMarkdownView(mockEditor);

            // Set up workspace to return our mock view
            const leaf = mockApp.workspace.getLeaf(false);
            leaf.view = mockView;
            mockApp.workspace.setActiveView(mockView);

            // Open and scroll to card
            await navigator.openAndScrollToCard(card);

            // Verify cursor was set to the correct line
            const cursor = mockEditor.getCursor();
            expect(cursor.line).toBe(testCase.lineNumber);
            expect(cursor.ch).toBe(0);
        }
    });

    /**
     * Feature: flashcard-modal-rewrite, Property 51: Collapsed Section Expansion
     *
     * For any card in a collapsed section, when opening the source note, the system
     * SHALL expand all parent sections before scrolling to the card location.
     *
     * Validates: Requirements 17.2
     *
     * Note: This property is difficult to test in isolation without full CodeMirror
     * integration. We verify that the expandCollapsedSections method is called.
     */
    test("Property 51: Collapsed Section Expansion - expands sections before scrolling", async () => {
        const filePath = "test-note-collapsed.md";
        const lineNumber = 25;
        const card = createTestCard(filePath, lineNumber, "Test question in collapsed section");

        // Add file to mock vault
        mockApp.vault.addFile(filePath);

        // Create mock editor
        const content = Array(50).fill("Line content").join("\n");
        const mockEditor = new MockEditor(content);
        const mockView = new MockMarkdownView(mockEditor);

        // Set up workspace
        const leaf = mockApp.workspace.getLeaf(false);
        leaf.view = mockView;
        mockApp.workspace.setActiveView(mockView);

        // Spy on expandCollapsedSections
        const expandSpy = mock(() => {});
        navigator.expandCollapsedSections = expandSpy as any;

        // Open and scroll to card
        await navigator.openAndScrollToCard(card);

        // Verify expandCollapsedSections was called with the correct line number
        expect(expandSpy).toHaveBeenCalledWith(lineNumber);
    });

    /**
     * Feature: flashcard-modal-rewrite, Property 52: Card Text Highlighting
     *
     * For any card, when opening the source note, the system SHALL highlight the card
     * text with a temporary background color for exactly 2 seconds.
     *
     * Validates: Requirements 17.3
     */
    test("Property 52: Card Text Highlighting - highlights text for 2 seconds", async () => {
        const testCases = [
            { lineNumber: 5, content: "Short question" },
            { lineNumber: 15, content: "This is a longer question with more text" },
            { lineNumber: 25, content: "Question with special characters: #tag @mention" },
        ];

        for (const testCase of testCases) {
            const filePath = `test-note-highlight-${testCase.lineNumber}.md`;
            const card = createTestCard(filePath, testCase.lineNumber, testCase.content);

            // Add file to mock vault
            mockApp.vault.addFile(filePath);

            // Create mock editor with the test content at the specified line
            const lines = Array(50).fill("Other content");
            lines[testCase.lineNumber] = testCase.content;
            const content = lines.join("\n");
            const mockEditor = new MockEditor(content);
            const mockView = new MockMarkdownView(mockEditor);

            // Set up workspace
            const leaf = mockApp.workspace.getLeaf(false);
            leaf.view = mockView;
            mockApp.workspace.setActiveView(mockView);

            // Open and scroll to card
            await navigator.openAndScrollToCard(card);

            // Verify selection was set (highlighting mechanism)
            const selection = mockEditor.getSelection();
            expect(selection).not.toBeNull();

            if (selection) {
                expect(selection.from.line).toBe(testCase.lineNumber);
                expect(selection.from.ch).toBe(0);
                expect(selection.to.line).toBe(testCase.lineNumber);
                expect(selection.to.ch).toBe(testCase.content.length);
            }

            // Wait for highlight duration (2 seconds) plus a small buffer
            await new Promise((resolve) => setTimeout(resolve, 2100));

            // Verify selection was cleared (cursor moved to start of line)
            const cursorAfter = mockEditor.getCursor();
            expect(cursorAfter.line).toBe(testCase.lineNumber);
            expect(cursorAfter.ch).toBe(0);
        }
    }, 10000); // Increase timeout for this test

    /**
     * Feature: flashcard-modal-rewrite, Property 53: Dual Mode Scrolling Support
     *
     * For any card, the source note scrolling SHALL work correctly in both edit mode
     * and preview mode.
     *
     * Validates: Requirements 17.5
     */
    test("Property 53: Dual Mode Scrolling Support - works in edit and preview modes", async () => {
        const filePath = "test-note-dual-mode.md";
        const lineNumber = 20;
        const card = createTestCard(filePath, lineNumber, "Test question");

        // Add file to mock vault
        mockApp.vault.addFile(filePath);

        // Test 1: Edit mode (editor is available)
        const content = Array(50).fill("Line content").join("\n");
        const mockEditor = new MockEditor(content);
        const mockViewEdit = new MockMarkdownView(mockEditor);

        const leafEdit = mockApp.workspace.getLeaf(false);
        leafEdit.view = mockViewEdit;
        mockApp.workspace.setActiveView(mockViewEdit);

        await navigator.openAndScrollToCard(card);

        // Verify scrolling worked in edit mode
        const cursorEdit = mockEditor.getCursor();
        expect(cursorEdit.line).toBe(lineNumber);

        // Test 2: Preview mode (editor is null)
        const mockViewPreview = new MockMarkdownView(null);
        const leafPreview = mockApp.workspace.getLeaf(false);
        leafPreview.view = mockViewPreview;
        mockApp.workspace.setActiveView(mockViewPreview);

        // Should not throw error in preview mode - just returns without doing anything
        const result = await navigator.openAndScrollToCard(card);
        expect(result).toBeUndefined();
    });
});

describe("Source Note Navigation - Integration Tests", () => {
    let mockApp: MockApp;
    let navigator: SourceNoteNavigator;

    beforeEach(() => {
        mockApp = new MockApp();
        navigator = new SourceNoteNavigator(mockApp as any);
    });

    afterEach(() => {
        navigator.cleanup();
    });

    /**
     * Feature: flashcard-modal-rewrite, Property 36: Source Note Navigation
     *
     * For any card, when the user clicks the context link, the system SHALL open the
     * source note file at the exact line where the card is defined.
     *
     * Validates: Requirements 13.2
     */
    test("Property 36: Source Note Navigation - opens note at correct location", async () => {
        const testCases = [
            { filePath: "notes/math.md", lineNumber: 10, content: "What is 2+2?" },
            { filePath: "notes/history.md", lineNumber: 25, content: "When was WWI?" },
            { filePath: "notes/science.md", lineNumber: 5, content: "What is H2O?" },
        ];

        for (const testCase of testCases) {
            const card = createTestCard(testCase.filePath, testCase.lineNumber, testCase.content);

            // Add file to mock vault
            const mockFile = mockApp.vault.addFile(testCase.filePath);

            // Create mock editor
            const lines = Array(50).fill("Other content");
            lines[testCase.lineNumber] = testCase.content;
            const content = lines.join("\n");
            const mockEditor = new MockEditor(content);
            const mockView = new MockMarkdownView(mockEditor);

            // Set up workspace
            const leaf = mockApp.workspace.getLeaf(false);
            leaf.view = mockView;
            mockApp.workspace.setActiveView(mockView);

            // Track if openFile was called
            let fileOpened = false;
            let openedFilePath = "";
            leaf.openFile = async (file: TFile) => {
                fileOpened = true;
                openedFilePath = file.path;
            };

            // Open source note
            await navigator.openAndScrollToCard(card);

            // Verify file was opened with correct path
            expect(fileOpened).toBe(true);
            expect(openedFilePath).toBe(testCase.filePath);

            // Verify cursor is at correct location
            const cursor = mockEditor.getCursor();
            expect(cursor.line).toBe(testCase.lineNumber);
            expect(cursor.ch).toBe(0);
        }
    });

    /**
     * Test error handling when card information is missing
     */
    test("handles missing card information gracefully", async () => {
        // Test with null card - should return without throwing
        const result1 = await navigator.openAndScrollToCard(null as any);
        expect(result1).toBeUndefined();

        // Test with card missing question
        const cardNoQuestion = { front: "Test", back: "Answer" } as any as Card;
        const result2 = await navigator.openAndScrollToCard(cardNoQuestion);
        expect(result2).toBeUndefined();

        // Test with card missing note
        const cardNoNote = {
            front: "Test",
            back: "Answer",
            question: {
                lineNo: 10,
                questionText: { original: "Test", actualQuestion: "Test" },
            },
        } as any as Card;
        const result3 = await navigator.openAndScrollToCard(cardNoNote);
        expect(result3).toBeUndefined();
    });

    /**
     * Test cleanup functionality
     */
    test("cleanup clears active highlights", () => {
        // Set up a mock timeout
        const mockTimeout = setTimeout(() => {}, 2000);
        (navigator as any).currentHighlightTimeout = mockTimeout;

        // Call cleanup
        navigator.cleanup();

        // Verify timeout was cleared
        expect((navigator as any).currentHighlightTimeout).toBeNull();
    });
});
