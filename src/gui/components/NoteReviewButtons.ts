/**
 * Note Review Buttons Integration
 *
 * Adds compact review buttons to notes that are due for review.
 * This manager handles the entire lifecycle of the buttons, including
 * creation, event handling, and cleanup.
 */

import { MarkdownView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import type SRPlugin from "src/main";
import { ReviewResponse } from "src/scheduling";
import { CompactReviewButtons } from "./CompactReviewButtons";
import { IReviewNote } from "src/reviewNote/review-note";
import { DataStore } from "src/dataStore/data";
import { t } from "src/lang/helpers";
import { Debouncer } from "src/util/Debouncer";

interface UndoState {
    file: TFile;
    response: ReviewResponse;
    timestamp: number;
}

interface ButtonInstance {
    buttons: CompactReviewButtons;
    container: HTMLElement;
    abortController: AbortController; // For cleaning up listeners
    timers: {
        autoHide?: ReturnType<typeof setTimeout>;
        undo?: ReturnType<typeof setTimeout>;
    };
    undoState?: UndoState;
}

export class NoteReviewButtonsManager {
    private plugin: SRPlugin;
    private instances: Map<string, ButtonInstance> = new Map();
    private managerAbortController = new AbortController();
    private saveDebouncer = new Debouncer(500);
    private pendingOperation: Symbol | null = null;

    constructor(plugin: SRPlugin) {
        this.plugin = plugin;
        this.registerEventHandlers();
    }


    private registerEventHandlers(): void {
        const workspace = this.plugin.app.workspace;

        this.plugin.registerEvent(
            workspace.on("layout-change", () => this.cleanupZombies()),
        );

        this.plugin.registerEvent(
            workspace.on("active-leaf-change", (leaf) => this.handleLeafChange(leaf)),
        );
    }

    /**
     * Cleanup instances for files that are no longer visible in the workspace.
     * This is necessary because Obsidian doesn't always fire proper cleanup events.
     */
    private cleanupZombies = (): void => {
        const validPaths = new Set(
            this.plugin.app.workspace
                .getLeavesOfType("markdown")
                .filter((leaf) => leaf.view instanceof MarkdownView && leaf.view.file)
                .map((leaf) => (leaf.view as MarkdownView).file!.path),
        );

        for (const path of Array.from(this.instances.keys())) {
            if (!validPaths.has(path)) {
                this.destroyInstance(path);
            }
        }

        // Also cleanup any orphaned DOM elements in all markdown views
        this.plugin.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
            if (leaf.view instanceof MarkdownView) {
                const container = this.findContainer(leaf.view as MarkdownView);
                if (container) {
                    const orphanedBanners = container.querySelectorAll('.sr-note-review-banner');
                    orphanedBanners.forEach((banner) => {
                        const filePath = banner.getAttribute('data-file-path');
                        if (filePath && !validPaths.has(filePath)) {
                            banner.remove();
                        }
                    });
                }
            }
        });
    }

    private handleLeafChange = (leaf: WorkspaceLeaf | null): void => {
        if (!leaf?.view) return;
        if (leaf.view instanceof MarkdownView && leaf.view.file) {
            this.createButtonsForNote(leaf.view.file);
        }
    };

    private isNoteDueForReview(file: TFile): boolean {
        try {
            const store = DataStore.getInstance();
            const trackedFile = store.getTrackedFile(file.path);
            if (!trackedFile?.isTrackedNote) return false;

            const noteItem = store.getNoteItem(file.path);
            return noteItem?.isDue ?? false;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    private getRemainingCount(): { due: number; new: number } {
        let due = 0,
            newCount = 0;
        for (const deck of Object.values(this.plugin.reviewDecks)) {
            due += deck.dueNotesCount ?? 0;
            newCount += deck.newNotes?.length ?? 0;
        }
        return { due, new: newCount };
    }

    private getPositionClass(): string {
        const pos = this.plugin.data.settings.compactReviewButtonsPosition || "top-right";
        return `sr-position-${pos}`;
    }

    private findContainer(leaf: MarkdownView): HTMLElement | null {
        // Use the view's content container which wraps the entire note view
        // This ensures buttons are positioned relative to the note, not the entire app
        const contentEl = leaf.contentEl;
        if (contentEl) return contentEl;

        // Fallback to preview container
        const previewView = leaf.previewMode?.containerEl;
        if (previewView) return previewView;

        return null;
    }

    public createButtonsForNote = async (file: TFile): Promise<void> => {
        const operationId = Symbol("create-buttons");
        this.pendingOperation = operationId;

        // If an instance already exists, do nothing. Cleanup is handled by workspace events.
        if (this.instances.has(file.path)) {
            return;
        }

        // Check if note is due for review (synchronous check first)
        if (!this.isNoteDueForReview(file)) {
            return;
        }

        // Verify we're still the active operation after sync check
        if (this.pendingOperation !== operationId) return;

        const leaf = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!leaf || leaf.file?.path !== file.path) return;

        const targetContainer = this.findContainer(leaf);
        if (!targetContainer) return;

        // Ensure target container has position: relative for absolute positioning
        if (!targetContainer.style.position || targetContainer.style.position === 'static') {
            targetContainer.style.position = 'relative';
        }

        // Remove any existing banners for this file (cleanup orphaned elements)
        const existingBanners = targetContainer.querySelectorAll(
            `.sr-note-review-banner[data-file-path="${file.path}"]`
        );
        existingBanners.forEach((banner) => banner.remove());

        const container = document.createElement("div");
        container.addClass("sr-note-review-banner", this.getPositionClass());
        container.setAttribute("data-file-path", file.path);
        
        // Add to the target container (not body)
        targetContainer.appendChild(container);

        // Wait for next frame to ensure DOM is ready
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Final check: verify operation is still valid and container is in DOM
        if (this.pendingOperation !== operationId || !container.isConnected) {
            if (!container.isConnected) {
                console.warn("SR: Container removed from DOM during initialization");
            }
            return;
        }

        const remaining = this.getRemainingCount();
        const counter = container.createDiv("sr-remaining-counter");
        counter.setText(`${remaining.due + remaining.new}`);
        counter.setAttribute(
            "title",
            `Due: ${remaining.due}, New: ${remaining.new}`,
        );

        const buttons = new CompactReviewButtons(container, {
            onReview: (response) => this.handleReview(file, response),
            initialCollapsed: this.plugin.data.settings.compactReviewButtonsCollapsed ?? false,
            onToggle: (collapsed) => this.saveCollapsed(collapsed),
            icons: this.plugin.data.settings.compactReviewButtonIcons,
        });

        console.log(`SR: Created review buttons for ${file.path}`, {
            containerInDOM: container.isConnected,
            position: this.getPositionClass(),
            remaining,
        });

        const instance: ButtonInstance = {
            buttons,
            container,
            abortController: new AbortController(),
            timers: {},
        };
        this.instances.set(file.path, instance);

        if (this.plugin.data.settings.compactReviewButtonsAutoHide) {
            this.setupAutoHideListeners(instance);
        }
    }

    private setupAutoHideListeners(instance: ButtonInstance): void {
        const delay = (this.plugin.data.settings.compactReviewButtonsAutoHideDelay || 5) * 1000;
        const { signal } = instance.abortController;

        const startTimer = () => {
            if (instance.timers.autoHide) clearTimeout(instance.timers.autoHide);
            instance.timers.autoHide = setTimeout(() => {
                instance.container.addClass("sr-auto-hidden");
            }, delay);
        };

        const stopTimer = () => {
            if (instance.timers.autoHide) {
                clearTimeout(instance.timers.autoHide);
                instance.timers.autoHide = undefined;
            }
            instance.container.removeClass("sr-auto-hidden");
        };

        instance.container.addEventListener("mouseenter", stopTimer, { signal });
        instance.container.addEventListener("mouseleave", startTimer, { signal });

        startTimer();
    }

    private saveCollapsed(collapsed: boolean): void {
        this.plugin.data.settings.compactReviewButtonsCollapsed = collapsed;
        this.saveDebouncer.run(() => this.plugin.savePluginData());
    }

    private destroyInstance(filePath: string): void {
        const instance = this.instances.get(filePath);
        if (!instance) return;

        Object.values(instance.timers).forEach((timer) => {
            if (timer) clearTimeout(timer);
        });

        instance.abortController.abort();
        instance.buttons.destroy();
        instance.container.remove();
        this.instances.delete(filePath);
    }

    private async handleReview(file: TFile, response: ReviewResponse): Promise<void> {
        const instance = this.instances.get(file.path);
        if (!instance) return;

        try {
            const store = DataStore.getInstance();
            const noteItem = store.getNoteItem(file.path);
            
            // Get ease from algorithm data, with proper type checking
            let currentEase = this.plugin.data.settings.baseEase;
            if (noteItem?.data && typeof noteItem.data === 'object') {
                const data = noteItem.data as Record<string, unknown>;
                if ('ease' in data && typeof data.ease === 'number') {
                    currentEase = data.ease;
                }
            }

            // Set undo state on the instance
            if (instance.timers.undo) clearTimeout(instance.timers.undo);
            instance.undoState = { file, response, timestamp: Date.now() };
            const undoTimeout = 5000; // TODO: Make this a setting
            instance.timers.undo = setTimeout(() => {
                instance.undoState = undefined;
            }, undoTimeout);

            // Process review
            const reviewNote = IReviewNote.getInstance();
            await reviewNote.responseProcess(file, response, currentEase);

            const responseText = ReviewResponse[response];
            new Notice(`Note reviewed: ${responseText}`);

            // Force sync to update deck data
            await this.plugin.sync();
            
            // Trigger event for sidebar update
            this.plugin.app.workspace.trigger("sr:note-reviewed", file);
        } catch (error) {
            console.error("Error reviewing note:", error);
            new Notice("Error reviewing note");
        } finally {
            this.destroyInstance(file.path);
        }
    }

    private reviewCurrent(response: ReviewResponse): void {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (!activeFile || !this.instances.has(activeFile.path)) {
            // It's better to show no notice if the command is not applicable
            return;
        }
        this.handleReview(activeFile, response);
    }

    private async undoLastReview(): Promise<void> {
        let targetInstance: ButtonInstance | undefined;
        let latestTime = 0;

        // Find the most recent undo state across all instances
        for (const instance of this.instances.values()) {
            if (instance.undoState && instance.undoState.timestamp > latestTime) {
                latestTime = instance.undoState.timestamp;
                targetInstance = instance;
            }
        }

        if (!targetInstance?.undoState) {
            new Notice("Nothing to undo");
            return;
        }

        const undoTimeout = 5000; // TODO: Make this a setting
        const elapsed = Date.now() - targetInstance.undoState.timestamp;
        if (elapsed > undoTimeout) {
            new Notice("Undo timeout expired");
            targetInstance.undoState = undefined;
            return;
        }

        // TODO: Implement actual undo logic
        // This would require storing the previous state and reverting it.
        new Notice("Undo not yet implemented");

        // Clear the undo state after using it
        targetInstance.undoState = undefined;
        if (targetInstance.timers.undo) {
            clearTimeout(targetInstance.timers.undo);
            targetInstance.timers.undo = undefined;
        }
    }

    public destroy(): void {
        this.managerAbortController.abort();
        this.saveDebouncer.cancel();
        for (const path of Array.from(this.instances.keys())) {
            this.destroyInstance(path);
        }
    }
}

