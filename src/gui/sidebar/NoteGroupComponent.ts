import { Menu, TFile } from "obsidian";
import type SRPlugin from "src/main";
import { ReviewDeck, SchedNote } from "src/core/models/ReviewDeck";
import { DataLocation } from "src/dataStore/dataLocation";
import { NoteSortType } from "./types";
import { t } from "src/lang/helpers";

export class NoteGroupComponent {
    private plugin: SRPlugin;
    private title: string;
    private notes: SchedNote[];
    private activeFile: TFile | null;
    private deck: ReviewDeck;
    private containerEl: HTMLElement;
    private groupKey: string;
    private expandedGroups: Set<string>;
    private shouldAutoScroll: boolean;
    private onToggleGroup: (groupKey: string) => void;
    private groupEl: HTMLElement | null = null;
    private timeoutId: number | null = null;
    private abortController = new AbortController();
    private notesAbortController = new AbortController();
    private noteSort: NoteSortType;
    private showAllNotes: boolean = false;
    private showMoreButton: HTMLElement | null = null;

    constructor(
        plugin: SRPlugin,
        title: string,
        notes: SchedNote[],
        activeFile: TFile | null,
        deck: ReviewDeck,
        containerEl: HTMLElement,
        groupKey: string,
        expandedGroups: Set<string>,
        shouldAutoScroll: boolean,
        onToggleGroup: (groupKey: string) => void,
        noteSort: NoteSortType,
    ) {
        this.plugin = plugin;
        this.title = title;
        this.notes = notes || [];
        this.activeFile = activeFile;
        this.deck = deck;
        this.containerEl = containerEl;
        this.groupKey = groupKey;
        this.expandedGroups = expandedGroups;
        this.shouldAutoScroll = shouldAutoScroll;
        this.onToggleGroup = onToggleGroup;
        this.noteSort = noteSort;
    }

    private sortNotes(notes: SchedNote[]): SchedNote[] {
        if (this.noteSort === NoteSortType.DEFAULT) {
            return notes;
        }
        const sorted = [...notes];
        if (this.noteSort === NoteSortType.NAME_ASC) {
            sorted.sort((a, b) => a.note.basename.localeCompare(b.note.basename));
        } else if (this.noteSort === NoteSortType.NAME_DESC) {
            sorted.sort((a, b) => b.note.basename.localeCompare(a.note.basename));
        } else if (this.noteSort === NoteSortType.PATH_ASC) {
            sorted.sort((a, b) => a.note.path.localeCompare(b.note.path));
        } else if (this.noteSort === NoteSortType.PATH_DESC) {
            sorted.sort((a, b) => b.note.path.localeCompare(a.note.path));
        }
        return sorted;
    }

    public render(): HTMLElement | null {
        if (!this.notes || this.notes.length === 0) {
            this.removeElement();
            return null;
        }

        if (!this.groupEl) {
            this.groupEl = this.containerEl.createDiv("sr-new-note-group");

            const isExpanded = this.expandedGroups.has(this.groupKey);
            const groupHeader = this.groupEl.createDiv("sr-new-note-group-header");
            groupHeader.setText(`${this.title} (${this.notes.length})`);

            if (isExpanded) {
                groupHeader.addClass("sr-group-expanded");
            }

            const notesList = this.groupEl.createDiv("sr-new-notes-list");
            if (!isExpanded) {
                notesList.addClass("sr-hidden");
            }

            const headerClickHandler = () => {
                this.onToggleGroup(this.groupKey);
            };

            groupHeader.addEventListener("click", headerClickHandler, {
                signal: this.abortController.signal,
            });

            this.renderNotes(notesList);
        }

        return this.groupEl;
    }

    private removeElement(): void {
        if (this.groupEl) {
            this.groupEl.remove();
            this.groupEl = null;
        }
    }

    public update(activeFile: TFile | null, notes: SchedNote[], shouldAutoScroll: boolean): void {
        this.activeFile = activeFile;
        this.notes = notes;
        this.shouldAutoScroll = shouldAutoScroll;

        // If group becomes empty, remove it
        if (!this.notes || this.notes.length === 0) {
            this.removeElement();
            return;
        }

        if (!this.groupEl) return;

        // Update header
        const header = this.groupEl.querySelector(".sr-new-note-group-header");
        if (header) {
            const newText = `${this.title} (${this.notes.length})`;
            if (header.textContent !== newText) {
                header.setText(newText);
            }
            if (this.expandedGroups.has(this.groupKey)) {
                header.addClass("sr-group-expanded");
            } else {
                header.removeClass("sr-group-expanded");
            }
        }

        const notesList = this.groupEl.querySelector(".sr-new-notes-list") as HTMLElement;
        if (notesList) {
            const isExpanded = this.expandedGroups.has(this.groupKey);
            notesList.toggleClass("sr-hidden", !isExpanded);

            // Only re-render if expanded
            if (isExpanded) {
                this.updateNotesList(notesList);
            }
        }
    }

    private updateNotesList(container: HTMLElement): void {
        const sortedNotes = this.sortNotes(this.notes);
        const existingItems = Array.from(container.querySelectorAll(".sr-new-note-item"));
        
        // Quick check: if only active state changed, just update classes
        if (existingItems.length === sortedNotes.length) {
            let onlyActiveChanged = true;
            for (let i = 0; i < sortedNotes.length; i++) {
                const noteEl = existingItems[i] as HTMLElement;
                const note = sortedNotes[i];
                const titleEl = noteEl.querySelector(".sr-new-note-title");
                if (!titleEl || titleEl.textContent !== note.note.basename) {
                    onlyActiveChanged = false;
                    break;
                }
            }
            
            if (onlyActiveChanged) {
                // Just update active states
                for (let i = 0; i < sortedNotes.length; i++) {
                    const noteEl = existingItems[i] as HTMLElement;
                    const note = sortedNotes[i];
                    const fileIsOpen = this.activeFile && note.note.path === this.activeFile.path;
                    if (fileIsOpen) {
                        noteEl.addClass("is-active");
                    } else {
                        noteEl.removeClass("is-active");
                    }
                }
                return;
            }
        }

        // Full re-render needed
        // Remove only note items, keep the button
        const noteItems = container.querySelectorAll(".sr-new-note-item");
        noteItems.forEach(item => item.remove());
        
        this.notesAbortController.abort();
        this.notesAbortController = new AbortController();
        this.renderNotes(container);
    }

    private renderNotes(container: HTMLElement): void {
        const sortedNotes = this.sortNotes(this.notes);
        const notesLimit = this.plugin.data.settings.sidebarInitialNotesLimit;
        
        // Check if active file is in the notes
        const activeNoteIndex = this.activeFile 
            ? sortedNotes.findIndex(note => note.note.path === this.activeFile!.path)
            : -1;
        
        // Determine which notes to show
        let notesToShow: SchedNote[];
        let shouldLimitNotes = false;
        
        if (!this.showAllNotes && sortedNotes.length > notesLimit) {
            shouldLimitNotes = true;
            
            // If active note is beyond the limit, include it
            if (activeNoteIndex >= notesLimit) {
                notesToShow = [
                    ...sortedNotes.slice(0, notesLimit - 1),
                    sortedNotes[activeNoteIndex]
                ];
            } else {
                notesToShow = sortedNotes.slice(0, notesLimit);
            }
        } else {
            notesToShow = sortedNotes;
        }
        
        // Remove existing button if it exists
        if (this.showMoreButton && this.showMoreButton.parentElement) {
            this.showMoreButton.remove();
            this.showMoreButton = null;
        }
        
        // Render notes
        for (const note of notesToShow) {
            if (note && note.note) {
                this.renderNote(container, note);
            }
        }
        
        // Show/hide "Show more" buttons
        if (shouldLimitNotes) {
            this.createShowMoreButtons(container, sortedNotes.length, notesLimit);
        }
    }

    private createShowMoreButtons(container: HTMLElement, totalCount: number, currentLimit: number): void {
        const remainingCount = totalCount - currentLimit;
        const batchSize = this.plugin.data.settings.sidebarInitialNotesLimit;
        
        const buttonsContainer = container.createDiv("sr-show-more-buttons");
        
        // If remaining is less than or equal to batch size, show only "Show all" button
        if (remainingCount <= batchSize) {
            const showAllButton = buttonsContainer.createDiv("sr-show-more-notes sr-show-all sr-single-button");
            showAllButton.setText(t("SHOW_ALL_NOTES", { count: remainingCount }));
            showAllButton.addEventListener("click", () => {
                this.showAllNotes = true;
                const notesList = this.groupEl?.querySelector(".sr-new-notes-list") as HTMLElement;
                if (notesList) {
                    this.updateNotesList(notesList);
                }
            });
        } else {
            // Show both buttons
            // Button 1: Show next batch
            const showBatchButton = buttonsContainer.createDiv("sr-show-more-notes sr-show-batch");
            const nextBatchCount = Math.min(batchSize, remainingCount);
            showBatchButton.setText(t("SHOW_MORE_NOTES_BATCH", { count: nextBatchCount }));
            showBatchButton.addEventListener("click", () => {
                // Increase limit by batch size
                const notesList = this.groupEl?.querySelector(".sr-new-notes-list") as HTMLElement;
                if (notesList) {
                    // Remove buttons
                    buttonsContainer.remove();
                    
                    // Show next batch
                    const sortedNotes = this.sortNotes(this.notes);
                    const newLimit = currentLimit + batchSize;
                    const notesToAdd = sortedNotes.slice(currentLimit, Math.min(newLimit, totalCount));
                    
                    for (const note of notesToAdd) {
                        if (note && note.note) {
                            this.renderNote(notesList, note);
                        }
                    }
                    
                    // Re-create buttons if there are still more notes
                    if (newLimit < totalCount) {
                        this.createShowMoreButtons(notesList, totalCount, newLimit);
                    } else {
                        this.showAllNotes = true;
                    }
                }
            });
            
            // Button 2: Show all remaining
            const showAllButton = buttonsContainer.createDiv("sr-show-more-notes sr-show-all");
            showAllButton.setText(t("SHOW_ALL_NOTES", { count: remainingCount }));
            showAllButton.addEventListener("click", () => {
                this.showAllNotes = true;
                const notesList = this.groupEl?.querySelector(".sr-new-notes-list") as HTMLElement;
                if (notesList) {
                    this.updateNotesList(notesList);
                }
            });
        }
        
        this.showMoreButton = buttonsContainer;
    }

    private renderNote(container: HTMLElement, note: SchedNote): HTMLElement {
        const noteEl = container.createDiv("sr-new-note-item");

        const fileIsOpen = this.activeFile && note.note.path === this.activeFile.path;
        if (fileIsOpen) {
            noteEl.addClass("is-active");
        }

        const noteTitle = noteEl.createDiv("sr-new-note-title");
        noteTitle.setText(note.note.basename);

        const clickHandler: EventListener = async (event: Event) => {
            event.preventDefault();
            this.plugin.lastSelectedReviewDeck = this.deck.deckName;
            await this.plugin.app.workspace.getLeaf().openFile(note.note);
            if (this.plugin.data.settings.dataLocation !== DataLocation.SaveOnNoteFile) {
                this.plugin.reviewFloatBar.display(note.item);
            }
        };

        noteEl.addEventListener("click", clickHandler, {
            signal: this.notesAbortController.signal,
        });

        const contextHandler: EventListener = (event: Event) => {
            event.preventDefault();
            const mouseEvent = event as MouseEvent;

            const fileMenu = new Menu();

            this.plugin.app.workspace.trigger(
                "file-menu",
                fileMenu,
                note.note,
                "link-context-menu",
                null,
            );

            fileMenu.showAtPosition({
                x: mouseEvent.pageX,
                y: mouseEvent.pageY,
            });
        };

        noteEl.addEventListener("contextmenu", contextHandler, {
            signal: this.notesAbortController.signal,
        });

        return noteEl;
    }

    public destroy(): void {
        if (this.timeoutId) {
            cancelAnimationFrame(this.timeoutId);
            this.timeoutId = null;
        }

        this.abortController.abort();
        this.notesAbortController.abort();

        if (this.showMoreButton) {
            this.showMoreButton.remove();
            this.showMoreButton = null;
        }

        if (this.groupEl) {
            this.groupEl.remove();
            this.groupEl = null;
        }
    }

    public resetShowAllNotes(): void {
        this.showAllNotes = false;
    }

    public showAll(): void {
        this.showAllNotes = true;
    }

    public getElement(): HTMLElement | null {
        return this.groupEl;
    }
}
