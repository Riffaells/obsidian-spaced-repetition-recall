import { TFile } from "obsidian";
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
    private deckComponents: DeckComponent[] = [];
    private mainContainer: HTMLElement | null = null;
    private decksContainer: HTMLElement | null = null;
    private cachedStats: Stats | null = null;
    private lastActiveFilePath: string | null = null;
    private isFilterChange: boolean = false;
    private sortedDecks: ReviewDeck[] = [];

    constructor(plugin: SRPlugin, containerEl: HTMLElement) {
        this.plugin = plugin;
        this.containerEl = containerEl;
    }

    private handleNoteSortChange = (sort: NoteSortType) => {
        this.currentNoteSort = sort;
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
                const currentFile = this.plugin.app.workspace.getActiveFile();
                this.update(currentFile);
            },
            this.handleNoteSortChange,
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

        this.destroyDeckComponents();

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

        this.decksContainer.empty();

        this.renderDecks(activeFile, resort);
    }

    private renderDecks(activeFile: TFile | null, resort = true): void {
        if (!this.decksContainer) return;

        const currentPath = activeFile?.path || null;
        const shouldAutoExpand = currentPath !== this.lastActiveFilePath && !this.isFilterChange;
        this.lastActiveFilePath = currentPath;

        if (resort) {
            const decks = Object.values(this.plugin.reviewDecks);
            this.sortedDecks = this.sortDecks(decks);
        }

        for (const deck of this.sortedDecks) {
            const deckComponent = new DeckComponent(
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
            deckComponent.render();
            this.deckComponents.push(deckComponent);
        }

        this.isFilterChange = false;
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

    private destroyDeckComponents(): void {
        for (const component of this.deckComponents) {
            component.destroy();
        }
        this.deckComponents = [];
    }

    public destroy(): void {
        this.destroyDeckComponents();

        this.header = null;
        this.stats = null;
        this.mainContainer = null;
        this.decksContainer = null;
        this.cachedStats = null;

        this.containerEl.empty();
        this.containerEl.removeClass("sr-sidebar-new-design");
    }
}
