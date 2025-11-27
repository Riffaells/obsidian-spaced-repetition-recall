import { Menu, TFile } from "obsidian";
import type SRPlugin from "src/main";
import { ReviewDeck, SchedNote } from "src/ReviewDeck";
import { DataLocation } from "src/dataStore/dataLocation";
import { NoteSortType } from "./types";

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
                notesList.style.display = "none";
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

    public update(
        activeFile: TFile | null,
        notes: SchedNote[],
        shouldAutoScroll: boolean
    ): void {
        this.activeFile = activeFile;
        this.notes = notes;
        this.shouldAutoScroll = shouldAutoScroll;

        if (!this.groupEl) return;

        // Update header
        const header = this.groupEl.querySelector(".sr-new-note-group-header");
        if (header) {
            header.setText(`${this.title} (${this.notes.length})`);
            if (this.expandedGroups.has(this.groupKey)) {
                header.addClass("sr-group-expanded");
            } else {
                header.removeClass("sr-group-expanded");
            }
        }

        const notesList = this.groupEl.querySelector(".sr-new-notes-list") as HTMLElement;
        if (notesList) {
            if (this.expandedGroups.has(this.groupKey)) {
                notesList.style.display = "block";
            } else {
                notesList.style.display = "none";
            }

            notesList.empty();
            
            // Abort previous notes listeners
            this.notesAbortController.abort();
            this.notesAbortController = new AbortController();

            this.renderNotes(notesList);
        }
    }

    private renderNotes(container: HTMLElement): void {
        const sortedNotes = this.sortNotes(this.notes);
        for (const note of sortedNotes) {
            if (note && note.note) {
                this.renderNote(container, note);
            }
        }
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
                null
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

        if (this.groupEl) {
            this.groupEl.remove();
            this.groupEl = null;
        }
    }
}