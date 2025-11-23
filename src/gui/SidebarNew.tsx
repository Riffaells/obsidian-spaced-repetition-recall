import { Notice, TFile } from "obsidian";
import type SRPlugin from "src/main";
import { DeckComponent } from "./sidebar/DeckComponent";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarStats } from "./sidebar/SidebarStats";
import { ReviewDeck, SchedNote } from "src/ReviewDeck";
import { t } from "src/lang/helpers";
import { FilterType, NoteSortType, SidebarStats as Stats, SortType, } from "./sidebar/types";
import {
    calculateActiveNotesCount,
    calculateDaysUntilDue,
    calculateSidebarStats,
    createGroupKey,
    getGroupTitle,
} from "./sidebar/utils";

export class SidebarNewDesign {
    private readonly plugin: SRPlugin;
    private containerEl: HTMLElement;
    private currentFilter: FilterType = FilterType.ALL;
    private currentSort: SortType = SortType.DATE_ASC;
    private currentNoteSort: NoteSortType = NoteSortType.DEFAULT;
    private expandedDecks: Set<string> = new Set();
    private expandedGroups: Set<string> = new Set();
    private header: SidebarHeader | null = null;
    private stats: SidebarStats | null = null;
    private deckComponents: Map<string, DeckComponent> = new Map();
    private mainContainer: HTMLElement | null = null;
    private decksContainer: HTMLElement | null = null;
    private cachedStats: Stats | null = null;
    private lastActiveFilePath: string | null = null;
    private isFilterChange: boolean = false;
    private sortedDecks: ReviewDeck[] = [];
    private justRecalculated = false;
    private scrollTimeout: number | null = null;

    constructor(plugin: SRPlugin, containerEl: HTMLElement) {
        this.plugin = plugin;
        this.containerEl = containerEl;
        this.currentSort = this.plugin.data.settings.sidebarSortOrder;
        this.currentNoteSort = this.plugin.data.settings.sidebarNoteSortOrder;
    }

    private handleRecalculate = async () => {
        new Notice(t("RECALCULATING_NOTES_NOTICE_START"));

        const decksBefore = Object.values(this.plugin.reviewDecks);
        let notesBefore = 0;
        for (const deck of decksBefore) {
            notesBefore += (deck.newNotes?.length || 0) + (deck.scheduledNotes?.length || 0);
        }

        this.justRecalculated = true;
        await this.plugin.sync();

        const decksAfter = Object.values(this.plugin.reviewDecks);
        let notesAfter = 0;
        for (const deck of decksAfter) {
            notesAfter += (deck.newNotes?.length || 0) + (deck.scheduledNotes?.length || 0);
        }

        const notesAdded = notesAfter - notesBefore;

        if (notesAdded > 0) {
            new Notice(t("RECALCULATING_NOTES_NOTICE_DONE_ADDED", { count: notesAdded }));
        } else {
            new Notice(t("RECALCULATING_NOTES_NOTICE_DONE_NONE"));
        }

        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile);
    };

    private handleNoteSortChange = async (sort: NoteSortType) => {
        this.currentNoteSort = sort;
        this.plugin.data.settings.sidebarNoteSortOrder = sort;
        await this.plugin.saveData(this.plugin.data);
        this.update(this.plugin.app.workspace.getActiveFile(), false); // don't resort decks
    };

    public render(activeFile: TFile | null): void {
        if (!this.mainContainer) {
            this.initializeStructure();
        }
        this.update(activeFile);
    }

    private initializeStructure(): void {
        this.containerEl.empty();
        this.containerEl.addClass("sr-sidebar-new-design");

        this.mainContainer = this.containerEl.createDiv("sr-new-sidebar-container");

        const headerContainer = this.mainContainer.createDiv();
        this.header = new SidebarHeader(
            headerContainer,
            (filter) => {
                this.currentFilter = filter;
                this.isFilterChange = true;
                const currentFile = this.plugin.app.workspace.getActiveFile();
                this.update(currentFile);
            },
            () => this.collapseAll(),
            () => this.expandAll(),
            (sort) => {
                this.currentSort = sort;
                this.plugin.data.settings.sidebarSortOrder = sort;
                void this.plugin.saveData(this.plugin.data);
                const currentFile = this.plugin.app.workspace.getActiveFile();
                this.update(currentFile);
            },
            this.handleNoteSortChange,
            () => this.handleRecalculate(),
        );
        this.header.render();

        // Statictics
        const statsContainer = this.mainContainer.createDiv();
        this.cachedStats = calculateSidebarStats(this.plugin);
        this.stats = new SidebarStats(statsContainer, this.cachedStats);
        this.stats.render();

        this.decksContainer = this.mainContainer.createDiv("sr-new-sidebar-decks");
    }

    private update(activeFile: TFile | null, resort = true): void {
        if (!this.decksContainer) return;

        // Note: We no longer destroy all components here.
        // We reconcile them in renderDecks.

        this.cachedStats = calculateSidebarStats(this.plugin);
        if (this.stats && this.cachedStats) {
            this.stats.updateStats(this.cachedStats);
        }

        if (this.header) {
            this.header.setFilter(this.currentFilter);
            this.header.setSort(this.currentSort);
            this.header.setNoteSort(this.currentNoteSort);
            const activeCount = calculateActiveNotesCount(this.plugin);
            this.header.setActiveCount(activeCount);
            this.header.render();
        }

        this.reconcileDecks(activeFile, resort);
        
        this.scrollToActiveItem();
    }

    private reconcileDecks(activeFile: TFile | null, resort = true): void {
        if (!this.decksContainer) return;

        const currentPath = activeFile?.path || null;
        let shouldAutoExpand = currentPath !== this.lastActiveFilePath && !this.isFilterChange;
        if (this.justRecalculated) {
            shouldAutoExpand = true;
            this.justRecalculated = false; // reset the flag
        }
        this.lastActiveFilePath = currentPath;

        if (resort) {
            const decks = Object.values(this.plugin.reviewDecks);
            this.sortedDecks = this.sortDecks(decks);
        }

        const newDeckNames = new Set(this.sortedDecks.map(d => d.deckName));

        // Remove decks that don't exist anymore
        for (const [name, component] of this.deckComponents) {
            if (!newDeckNames.has(name)) {
                component.destroy();
                this.deckComponents.delete(name);
            }
        }

        for (const deck of this.sortedDecks) {
            let component = this.deckComponents.get(deck.deckName);
            if (component) {
                component.update(activeFile, this.currentFilter, shouldAutoExpand, this.currentNoteSort);
                const el = component.render();
                if (el) {
                    this.decksContainer.appendChild(el);
                }
            } else {
                component = new DeckComponent(
                    this.plugin,
                    deck,
                    this.decksContainer,
                    activeFile,
                    this.currentFilter,
                    this.expandedDecks,
                    this.expandedGroups,
                    shouldAutoExpand,
                    (deckName) => this.toggleDeck(deckName, activeFile),
                    (groupKey) => this.toggleGroup(groupKey, activeFile),
                    this.currentNoteSort,
                );
                const rendered = component.render();
                if (rendered) {
                    this.deckComponents.set(deck.deckName, component);
                }
            }
        }

        this.isFilterChange = false;
    }

    private scrollToActiveItem(): void {
        if (this.scrollTimeout) {
            window.clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }

        this.scrollTimeout = window.setTimeout(() => {
            const activeItem = this.containerEl.querySelector(".sr-new-note-item.is-active");
            if (activeItem) {
                activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }, 100);
    }

    private sortDecks(decks: ReviewDeck[]): ReviewDeck[] {
        const sorted = [...decks];

        switch (this.currentSort) {
            case SortType.DATE_ASC:
                sorted.sort((a, b) => {
                    const minDateA = this.getMinDueDate(a);
                    const minDateB = this.getMinDueDate(b);
                    return minDateA - minDateB;
                });
                break;

            case SortType.DATE_DESC:
                sorted.sort((a, b) => {
                    const maxDateA = this.getMaxDueDate(a);
                    const maxDateB = this.getMaxDueDate(b);
                    return maxDateB - maxDateA;
                });
                break;

            case SortType.COUNT_DESC:
                sorted.sort((a, b) => {
                    const countA = this.getDeckNotesCount(a);
                    const countB = this.getDeckNotesCount(b);
                    return countB - countA;
                });
                break;

            case SortType.COUNT_ASC:
                sorted.sort((a, b) => {
                    const countA = this.getDeckNotesCount(a);
                    const countB = this.getDeckNotesCount(b);
                    return countA - countB;
                });
                break;

            case SortType.NAME_ASC:
                sorted.sort((a, b) => a.deckName.localeCompare(b.deckName));
                break;

            case SortType.NAME_DESC:
                sorted.sort((a, b) => b.deckName.localeCompare(a.deckName));
                break;
        }

        return sorted;
    }

    private getMinDueDate(deck: ReviewDeck): number {
        let minDate = Infinity;

        if (deck.dueNotesCount > 0 && deck.scheduledNotes.length > 0) {
            for (const note of deck.scheduledNotes) {
                if (note.dueUnix && note.dueUnix < minDate) {
                    minDate = note.dueUnix;
                }
            }
        }

        return minDate === Infinity ? Date.now() : minDate;
    }

    private getMaxDueDate(deck: ReviewDeck): number {
        let maxDate = 0;

        if (deck.dueNotesCount > 0 && deck.scheduledNotes.length > 0) {
            for (const note of deck.scheduledNotes) {
                if (note.dueUnix && note.dueUnix > maxDate) {
                    maxDate = note.dueUnix;
                }
            }
        }

        return maxDate === 0 ? Date.now() : maxDate;
    }

    private getDeckNotesCount(deck: ReviewDeck): number {
        const newNotesCount = deck.newNotes?.length || 0;

        if (!deck.scheduledNotes) {
            return this.currentFilter === FilterType.REVIEWED ? 0 : newNotesCount;
        }

        switch (this.currentFilter) {
            case FilterType.ALL:
                return newNotesCount + (deck.scheduledNotes?.length || 0);

            case FilterType.ACTIVE: {
                const dueCount = deck.scheduledNotes.filter(
                    (note: SchedNote) => calculateDaysUntilDue(note.dueUnix, this.plugin) <= 0,
                ).length;
                return newNotesCount + dueCount;
            }
            case FilterType.REVIEWED: {
                return deck.scheduledNotes.filter(
                    (note: SchedNote) => calculateDaysUntilDue(note.dueUnix, this.plugin) > 0,
                ).length;
            }
        }

        return 0;
    }

    private toggleDeck(deckName: string, activeFile: TFile | null): void {
        if (this.expandedDecks.has(deckName)) {
            this.expandedDecks.delete(deckName);
        } else {
            this.expandedDecks.add(deckName);
        }
        this.update(activeFile, false);
    }

    private toggleGroup(groupKey: string, activeFile: TFile | null): void {
        if (this.expandedGroups.has(groupKey)) {
            this.expandedGroups.delete(groupKey);
        } else {
            this.expandedGroups.add(groupKey);
        }
        this.update(activeFile, false);
    }

    private collapseAll(): void {
        this.expandedDecks.clear();
        this.expandedGroups.clear();
        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile, false);
    }

    private expandAll(): void {
        Object.values(this.plugin.reviewDecks).forEach((deck) => {
            this.expandedDecks.add(deck.deckName);
        });

        const allGroupKeys = new Set<string>();
        for (const deck of Object.values(this.plugin.reviewDecks)) {
            if (deck.newNotes?.length > 0) {
                allGroupKeys.add(createGroupKey(deck.deckName, t("NEW")));
            }
            if (deck.scheduledNotes) {
                const uniqueGroupTitles = new Set<string>();
                for (const sNote of deck.scheduledNotes) {
                    const nDays = calculateDaysUntilDue(sNote.dueUnix, this.plugin);
                    const groupTitle = getGroupTitle(nDays, sNote.dueUnix, this.plugin);
                    uniqueGroupTitles.add(groupTitle);
                }
                uniqueGroupTitles.forEach((title) => {
                    allGroupKeys.add(createGroupKey(deck.deckName, title));
                });
            }
        }
        this.expandedGroups = allGroupKeys;

        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile, false);
    }

    public destroy(): void {
        for (const component of this.deckComponents.values()) {
            component.destroy();
        }
        this.deckComponents.clear();

        this.header = null;
        this.stats = null;
        this.mainContainer = null;
        this.decksContainer = null;
        this.cachedStats = null;

        if (this.scrollTimeout) {
            window.clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }

        this.containerEl.empty();
        this.containerEl.removeClass("sr-sidebar-new-design");
    }
}
