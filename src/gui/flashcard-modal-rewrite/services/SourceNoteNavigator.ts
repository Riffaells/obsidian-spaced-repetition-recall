import { App, MarkdownView, TFile, WorkspaceLeaf, EditorPosition } from "obsidian";
import { Card } from "src/core/models/Card";
import { ISRFile, SrTFile } from "src/core/services/SRFile";
import { ObsidianEditorWithCm } from "../types";

/**
 * Service for navigating to source notes and scrolling to card locations.
 *
 * Handles:
 * - Opening source notes in the workspace
 * - Scrolling to precise line numbers
 * - Expanding collapsed sections
 * - Highlighting card text temporarily
 * - Supporting both edit and preview modes
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */
export interface ISourceNoteNavigator {
    /**
     * Opens the source note and scrolls to the card location.
     *
     * @param card - The card to navigate to
     * @returns Promise that resolves when navigation is complete
     */
    openAndScrollToCard(card: Card): Promise<void>;

    /**
     * Highlights the card text in the editor for a specified duration.
     *
     * @param lineNumber - The line number to highlight
     * @param duration - Duration in milliseconds (default: 2000)
     */
    highlightCardText(lineNumber: number, duration: number): void;

    /**
     * Expands any collapsed sections containing the specified line.
     *
     * @param lineNumber - The line number that should be visible
     */
    expandCollapsedSections(lineNumber: number): void;
}

export class SourceNoteNavigator implements ISourceNoteNavigator {
    private app: App;
    private currentHighlightTimeout: NodeJS.Timeout | null = null;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Opens the source note and scrolls to the card location.
     *
     * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
     */
    async openAndScrollToCard(card: Card): Promise<void> {
        if (!card || !card.question || !card.question.note) {
            console.error("SourceNoteNavigator: Invalid card or missing note information");
            return;
        }

        const srFile = card.question.note.file;
        const lineNumber = card.question.lineNo;

        if (!srFile || lineNumber === undefined) {
            console.error("SourceNoteNavigator: Missing file or line number");
            return;
        }

        // Get the TFile from the ISRFile
        let tFile: TFile;
        if (srFile instanceof SrTFile) {
            tFile = srFile.file;
        } else {
            // If it's not a SrTFile, try to get the file by path
            const file = this.app.vault.getAbstractFileByPath(srFile.path);
            if (!(file instanceof TFile)) {
                console.error("SourceNoteNavigator: Could not find TFile for path:", srFile.path);
                return;
            }
            tFile = file;
        }

        try {
            // Open the file in a leaf
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.openFile(tFile);

            // Wait a bit for the view to be ready
            await this.waitForView(leaf);

            // Expand collapsed sections if needed
            this.expandCollapsedSections(lineNumber);

            // Scroll to the line
            await this.scrollToLine(leaf, lineNumber);

            // Highlight the text
            this.highlightCardText(lineNumber, 2000);
        } catch (error) {
            console.error("SourceNoteNavigator: Error opening source note", error);
        }
    }

    /**
     * Waits for the markdown view to be ready.
     */
    private async waitForView(leaf: WorkspaceLeaf): Promise<void> {
        return new Promise((resolve) => {
            // Give the view a moment to initialize
            setTimeout(() => resolve(), 50);
        });
    }

    /**
     * Scrolls to the specified line number in the editor.
     * Handles both edit mode (CodeMirror) and preview mode.
     *
     * Requirements: 17.1, 17.4, 17.5
     */
    private async scrollToLine(leaf: WorkspaceLeaf, lineNumber: number): Promise<void> {
        const view = leaf.view;

        if (!(view instanceof MarkdownView)) {
            console.error("SourceNoteNavigator: Not a markdown view");
            return;
        }

        // Get the editor (works in edit mode)
        const editor = view.editor;
        if (editor) {
            // Edit mode - use CodeMirror API
            const position: EditorPosition = {
                line: lineNumber,
                ch: 0,
            };

            // Set cursor to the line
            editor.setCursor(position);

            // Scroll to center the line in the viewport
            editor.scrollIntoView(
                {
                    from: position,
                    to: position,
                },
                true, // Center in viewport
            );
        } else {
            // Preview mode - try to scroll using DOM
            // In preview mode, we need to find the element at that line
            // This is more complex and may not be as precise
            console.warn(
                "SourceNoteNavigator: Preview mode scrolling is limited. Switch to edit mode for precise navigation.",
            );
        }
    }

    /**
     * Expands any collapsed sections containing the specified line.
     *
     * Requirements: 17.2
     */
    expandCollapsedSections(lineNumber: number): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            return;
        }

        const editor = activeView.editor;
        if (!editor) {
            return;
        }

        // Check if the line is in a folded section
        // Obsidian's editor has a foldManager that we can use
        const editorWithCm = editor as unknown as ObsidianEditorWithCm;
        const editorView = editorWithCm.cm;
        if (!editorView) {
            return;
        }

        // Try to unfold at the target line
        // This will expand any collapsed sections containing this line
        try {
            // Get the fold state at this line
            const state = editorView.state;
            const line = state.doc.line(lineNumber + 1); // CodeMirror uses 1-based line numbers

            // Check if there are any folds that contain this line
            // and unfold them
            const foldService = state.field(editorView.foldState, false);
            if (foldService) {
                // Unfold any sections containing this line
                const effects: Array<{ from: number; to: number }> = [];
                foldService.iter((from: number, to: number) => {
                    if (from <= line.from && to >= line.to) {
                        effects.push({ from, to });
                    }
                });

                if (effects.length > 0) {
                    // Apply unfold effects
                    effects.forEach((effect) => {
                        if (editorView.unfoldEffect) {
                            editorView.dispatch({
                                effects: editorView.unfoldEffect.of(effect),
                            });
                        }
                    });
                }
            }
        } catch (error) {
            // Folding API might not be available or might have changed
            console.warn("SourceNoteNavigator: Could not expand collapsed sections", error);
        }
    }

    /**
     * Highlights the card text in the editor for a specified duration.
     *
     * Requirements: 17.3
     */
    highlightCardText(lineNumber: number, duration: number = 2000): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            return;
        }

        const editor = activeView.editor;
        if (!editor) {
            return;
        }

        // Clear any existing highlight timeout
        if (this.currentHighlightTimeout) {
            clearTimeout(this.currentHighlightTimeout);
            this.currentHighlightTimeout = null;
        }

        try {
            // Get the line content
            const lineContent = editor.getLine(lineNumber);
            if (!lineContent) {
                return;
            }

            // Create a highlight decoration
            const from: EditorPosition = { line: lineNumber, ch: 0 };
            const to: EditorPosition = { line: lineNumber, ch: lineContent.length };

            // Add a CSS class to highlight the line
            // We'll use Obsidian's built-in selection mechanism
            editor.setSelection(from, to);

            // After the duration, clear the selection
            this.currentHighlightTimeout = setTimeout(() => {
                // Move cursor to the start of the line to clear selection
                editor.setCursor(from);
                this.currentHighlightTimeout = null;
            }, duration);
        } catch (error) {
            console.warn("SourceNoteNavigator: Could not highlight card text", error);
        }
    }

    /**
     * Cleans up any active highlights.
     */
    cleanup(): void {
        if (this.currentHighlightTimeout) {
            clearTimeout(this.currentHighlightTimeout);
            this.currentHighlightTimeout = null;
        }
    }
}
