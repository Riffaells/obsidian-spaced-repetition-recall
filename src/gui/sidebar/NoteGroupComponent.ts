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
    private eventListeners: Array<{ element: HTMLElement; type: string; handler: EventListener }> =
        [];
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
            return null;
        }

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

        groupHeader.addEventListener("click", headerClickHandler);
        this.eventListeners.push({
            element: groupHeader,
            type: "click",
            handler: headerClickHandler,
        });

        let activeNoteEl: HTMLElement | null = null;
        const sortedNotes = this.sortNotes(this.notes);
        for (const note of sortedNotes) {
            if (note && note.note) {
                const noteEl = this.renderNote(notesList, note);
                // Запоминаем элемент активной заметки
                if (this.activeFile && note.note.path === this.activeFile.path) {
                    activeNoteEl = noteEl;
                }
            }
        }

        if (activeNoteEl && isExpanded && this.shouldAutoScroll) {
            this.timeoutId = requestAnimationFrame(() => {
                activeNoteEl?.scrollIntoView({ behavior: "smooth", block: "center" });
                this.timeoutId = null;
            });
        }

        return this.groupEl;
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

        noteEl.addEventListener("click", clickHandler);
        this.eventListeners.push({
            element: noteEl,
            type: "click",
            handler: clickHandler,
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

        noteEl.addEventListener("contextmenu", contextHandler);
        this.eventListeners.push({
            element: noteEl,
            type: "contextmenu",
            handler: contextHandler,
        });

        return noteEl;
    }

    public destroy(): void {
        if (this.timeoutId) {
            cancelAnimationFrame(this.timeoutId);
            this.timeoutId = null;
        }
        for (const { element, type, handler } of this.eventListeners) {
            element.removeEventListener(type, handler);
        }
        this.eventListeners = [];

        if (this.groupEl) {
            this.groupEl.remove();
            this.groupEl = null;
        }
    }
}