import { debounce, ItemView, Menu, Notice, TFile, WorkspaceLeaf } from "obsidian";

import type SRPlugin from "src/main";
import { t } from "src/lang/helpers";
import { DeckComponent } from "./sidebar/DeckComponent";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarStats } from "./sidebar/SidebarStats";
import { ReviewDeck, SchedNote } from "src/ReviewDeck";
import {
    FilterType,
    NoteSortType,
    SidebarStats as Stats,
    SidebarViewMode,
    SortType,
} from "./sidebar/types";
import {
    calculateActiveNotesCount,
    calculateDaysUntilDue,
    calculateSidebarStats,
    createGroupKey,
    getGroupTitle,
} from "./sidebar/utils";
import { FlashcardDeckComponent } from "./sidebar/FlashcardDeckComponent";
import { Deck } from "src/Deck";

export const REVIEW_QUEUE_VIEW_TYPE = "review-queue-list-view";

export class ReviewQueueListView extends ItemView {
    private readonly plugin: SRPlugin;
    private readonly debouncedRedraw: () => void;
    
    // Sidebar state
    private currentFilter: FilterType = FilterType.ALL;
    private currentSort: SortType = SortType.DATE_ASC;
    private currentNoteSort: NoteSortType = NoteSortType.DEFAULT;
    private currentViewMode: SidebarViewMode = SidebarViewMode.Notes;
    private expandedDecks: Set<string> = new Set();
    private expandedGroups: Set<string> = new Set();
    
    // UI components
    private header: SidebarHeader | null = null;
    private stats: SidebarStats | null = null;
    private deckComponents: Map<string, DeckComponent> = new Map();
    private flashcardDeckComponents: Map<string, FlashcardDeckComponent> = new Map();
    private mainContainer: HTMLElement | null = null;
    private decksContainer: HTMLElement | null = null;
    
    // Cache and state tracking
    private cachedStats: Stats | null = null;
    private lastActiveFilePath: string | null = null;
    private sortedDecks: ReviewDeck[] = [];
    private justRecalculated = false;
    private scrollFrameId: number | null = null;
    private scrollTimeout: number | null = null;
    private deckStatsCache = new Map<
        string,
        { minDate: number; maxDate: number; count: number; timestamp: number }
    >();

    constructor(leaf: WorkspaceLeaf, plugin: SRPlugin) {
        super(leaf);

        this.plugin = plugin;
        this.currentSort = this.plugin.data.settings.sidebarSortOrder;
        this.currentNoteSort = this.plugin.data.settings.sidebarNoteSortOrder;
        this.currentViewMode = this.plugin.data.settings.sidebarViewMode || SidebarViewMode.Notes;

        // debounce to prevent frequent repaints
        this.debouncedRedraw = debounce(() => this.redraw(), 150, true);

        this.registerEvent(this.app.workspace.on("file-open", () => this.debouncedRedraw()));
        this.registerEvent(this.app.vault.on("rename", () => this.debouncedRedraw()));
    }

    public getViewType(): string {
        return REVIEW_QUEUE_VIEW_TYPE;
    }

    public getDisplayText(): string {
        return t("NOTES_REVIEW_QUEUE");
    }

    public getIcon(): string {
        return "SpacedRepIcon";
    }

    public onHeaderMenu(menu: Menu): void {
        menu.addItem((item) => {
            item.setTitle(t("CLOSE"))
                .setIcon("cross")
                .onClick(() => {
                    this.app.workspace.detachLeavesOfType(REVIEW_QUEUE_VIEW_TYPE);
                });
        });
    }

    public redraw(): void {
        if (!this.plugin?.data) {
            return;
        }

        const activeFile: TFile | null = this.app.workspace.getActiveFile();

        if (!this.mainContainer) {
            this.initializeStructure();
        }
        
        const currentPath = activeFile?.path || null;
        const shouldScroll = currentPath !== this.lastActiveFilePath;
        const shouldResort = this.sortedDecks.length === 0;
        this.update(activeFile, shouldResort, shouldScroll);
    }

    private initializeStructure(): void {
        this.contentEl.empty();
        this.contentEl.addClass("sr-sidebar-new-design");

        this.mainContainer = this.contentEl.createDiv("sr-new-sidebar-container");

        const headerContainer = this.mainContainer.createDiv();
        this.header = new SidebarHeader(
            headerContainer,
            (filter) => {
                this.currentFilter = filter;
                const currentFile = this.plugin.app.workspace.getActiveFile();
                this.update(currentFile, true, false);
            },
            () => this.collapseAll(),
            () => this.expandAll(),
            (sort) => {
                this.currentSort = sort;
                this.plugin.data.settings.sidebarSortOrder = sort;
                this.saveSettingsDebounced();
                const currentFile = this.plugin.app.workspace.getActiveFile();
                this.update(currentFile, true, false);
            },
            this.handleNoteSortChange,
            () => this.handleRecalculate(),
            (mode) => this.handleViewModeChange(mode),
        );
        this.header.render();

        const statsContainer = this.mainContainer.createDiv();
        this.cachedStats = calculateSidebarStats(this.plugin);
        this.stats = new SidebarStats(statsContainer, this.cachedStats);
        this.stats.render();

        this.decksContainer = this.mainContainer.createDiv("sr-new-sidebar-decks");
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
        this.saveSettingsDebounced();
        this.update(this.plugin.app.workspace.getActiveFile(), false, false);
    };

    private handleViewModeChange = debounce(
        (mode: SidebarViewMode) => {
            this.currentViewMode = mode;
            this.plugin.data.settings.sidebarViewMode = mode;
            this.saveSettingsDebounced();
            const currentFile = this.plugin.app.workspace.getActiveFile();
            this.update(currentFile);
        },
        150,
        true,
    );

    private saveSettingsDebounced = debounce(
        async () => {
            await this.plugin.saveData(this.plugin.data);
        },
        500,
        true,
    );

    private update(activeFile: TFile | null, resort = true, shouldScroll = true): void {
        if (!this.decksContainer) return;

        if (this.scrollTimeout) {
            window.clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }

        if (this.currentViewMode === SidebarViewMode.FlashCards) {
            this.cachedStats = this.calculateFlashcardStats();
        } else {
            this.cachedStats = calculateSidebarStats(this.plugin);
        }

        if (this.stats && this.cachedStats) {
            this.stats.updateStats(this.cachedStats);
        }

        if (this.header) {
            this.header.setFilter(this.currentFilter);
            this.header.setSort(this.currentSort);
            this.header.setNoteSort(this.currentNoteSort);
            this.header.setViewMode(this.currentViewMode);
            const activeCount = calculateActiveNotesCount(this.plugin);
            this.header.setActiveCount(activeCount);
            this.header.render();
        }

        // Determine if we should auto-expand based on file change
        const shouldAutoExpand = shouldScroll;
        this.reconcileDecks(activeFile, resort, shouldAutoExpand);

        if (shouldScroll) {
            this.scrollToActiveItem();
        }
    }

    private reconcileDecks(activeFile: TFile | null, resort = true, shouldAutoExpand = false): void {
        if (!this.decksContainer) return;

        const currentPath = activeFile?.path || null;
        if (this.justRecalculated) {
            shouldAutoExpand = true;
            this.justRecalculated = false;
        }
        this.lastActiveFilePath = currentPath;

        if (this.currentViewMode === SidebarViewMode.FlashCards) {
            this.reconcileFlashcardDecks(activeFile);
            for (const component of this.deckComponents.values()) {
                component.destroy();
            }
            this.deckComponents.clear();
        } else {
            if (resort) {
                const decks = Object.values(this.plugin.reviewDecks);
                this.sortedDecks = this.sortDecks(decks);
            }

            const newDeckNames = new Set(this.sortedDecks.map((d) => d.deckName));

            for (const [name, component] of this.deckComponents) {
                if (!newDeckNames.has(name)) {
                    component.destroy();
                    this.deckComponents.delete(name);
                }
            }
            
            for (let i = 0; i < this.sortedDecks.length; i++) {
                const deck = this.sortedDecks[i];
                let component = this.deckComponents.get(deck.deckName);

                if (component) {
                    component.update(
                        activeFile,
                        this.currentFilter,
                        shouldAutoExpand,
                        this.currentNoteSort,
                        deck,
                    );
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
                        (deckName) => this.toggleDeck(deckName),
                        (groupKey) => this.toggleGroup(groupKey),
                        this.currentNoteSort,
                    );
                    this.deckComponents.set(deck.deckName, component);
                    const el = component.render();
                    if (el) {
                        this.decksContainer.appendChild(el);
                    }
                }
            }

            for (const component of this.flashcardDeckComponents.values()) {
                component.destroy();
            }
            this.flashcardDeckComponents.clear();
        }
    }

    private reconcileFlashcardDecks(activeFile: TFile | null): void {
        if (!this.decksContainer) return;

        if (!this.plugin.deckTree) {
            for (const component of this.flashcardDeckComponents.values()) {
                component.destroy();
            }
            this.flashcardDeckComponents.clear();

            this.decksContainer.empty();
            const emptyMessage = this.decksContainer.createDiv("sr-empty-message");
            emptyMessage.setText(t("NO_FLASHCARD_DECKS_FOUND"));
            return;
        }

        const allDecks = this.plugin.deckTree.toDeckArray();
        const flashcardDecks = allDecks.filter(
            (deck) =>
                !deck.isRootDeck &&
                (deck.newFlashcards.length > 0 || deck.dueFlashcards.length > 0),
        );

        const sortedFlashcardDecks = this.sortFlashcardDecks(flashcardDecks);

        if (sortedFlashcardDecks.length === 0) {
            for (const component of this.flashcardDeckComponents.values()) {
                component.destroy();
            }
            this.flashcardDeckComponents.clear();

            this.decksContainer.empty();
            const emptyMessage = this.decksContainer.createDiv("sr-empty-message");
            emptyMessage.setText(t("NO_FLASHCARD_DECKS_FOUND"));
            return;
        }

        const activeDeckName = this.findDeckContainingFile(activeFile, sortedFlashcardDecks);

        if (activeDeckName && !this.expandedDecks.has(activeDeckName)) {
            this.expandedDecks.add(activeDeckName);
        }

        const newDeckNames = new Set(sortedFlashcardDecks.map((d) => d.deckName));

        for (const [name, component] of this.flashcardDeckComponents) {
            if (!newDeckNames.has(name)) {
                component.destroy();
                this.flashcardDeckComponents.delete(name);
            }
        }

        for (let i = 0; i < sortedFlashcardDecks.length; i++) {
            const deck = sortedFlashcardDecks[i];
            let component = this.flashcardDeckComponents.get(deck.deckName);

            if (component) {
                component.update(this.currentFilter, deck);
            } else {
                component = new FlashcardDeckComponent(
                    this.plugin,
                    deck,
                    this.decksContainer,
                    this.currentFilter,
                    this.expandedDecks,
                    this.expandedGroups,
                    (deckName) => this.toggleDeck(deckName),
                    (groupKey) => this.toggleGroup(groupKey),
                );
                this.flashcardDeckComponents.set(deck.deckName, component);
                const el = component.render();
                if (el) {
                    this.decksContainer.appendChild(el);
                }
            }

            const el = this.flashcardDeckComponents.get(deck.deckName)?.render();
            if (el) {
                if (deck.deckName === activeDeckName) {
                    el.addClass("sr-deck-active");
                } else {
                    el.removeClass("sr-deck-active");
                }
            }
        }

        if (activeDeckName) {
            this.scrollToActiveDeck(activeDeckName);
        }
    }

    private findDeckContainingFile(activeFile: TFile | null, decks: Deck[]): string | null {
        if (!activeFile) return null;

        for (const deck of decks) {
            for (const card of deck.newFlashcards) {
                if (card.question?.note?.filePath === activeFile.path) {
                    return deck.deckName;
                }
            }

            for (const card of deck.dueFlashcards) {
                if (card.question?.note?.filePath === activeFile.path) {
                    return deck.deckName;
                }
            }
        }

        return null;
    }

    private scrollToActiveDeck(deckName: string): void {
        if (this.scrollFrameId) {
            window.cancelAnimationFrame(this.scrollFrameId);
            this.scrollFrameId = null;
        }

        this.scrollFrameId = window.requestAnimationFrame(() => {
            const activeDeck = this.contentEl.querySelector(`.sr-flashcard-deck.sr-deck-active`);
            if (activeDeck) {
                activeDeck.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            this.scrollFrameId = null;
        });
    }

    private scrollToActiveItem(): void {
        if (this.scrollFrameId) {
            window.cancelAnimationFrame(this.scrollFrameId);
            this.scrollFrameId = null;
        }

        this.scrollFrameId = window.requestAnimationFrame(() => {
            const activeItem = this.contentEl.querySelector(".sr-new-note-item.is-active");
            if (activeItem) {
                activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            this.scrollFrameId = null;
        });
    }

    private getDeckStats(deck: ReviewDeck): { minDate: number; maxDate: number; count: number } {
        const cached = this.deckStatsCache.get(deck.deckName);
        if (cached) {
            return cached;
        }

        const minDate = this.calculateMinDueDate(deck);
        const maxDate = this.calculateMaxDueDate(deck);
        const count = this.calculateDeckNotesCount(deck);

        const stats = { minDate, maxDate, count, timestamp: Date.now() };
        this.deckStatsCache.set(deck.deckName, stats);
        return stats;
    }

    private calculateMinDueDate(deck: ReviewDeck): number {
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

    private calculateMaxDueDate(deck: ReviewDeck): number {
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

    private calculateDeckNotesCount(deck: ReviewDeck): number {
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

    private calculateFlashcardStats(): Stats {
        let totalDue = 0;
        let totalNew = 0;

        if (!this.plugin.deckTree) {
            return { totalDue: 0, totalNew: 0 };
        }

        const allDecks = this.plugin.deckTree.toDeckArray();

        for (const deck of allDecks) {
            totalNew += deck.newFlashcards?.length || 0;

            if (deck.dueFlashcards) {
                for (const card of deck.dueFlashcards) {
                    if (card.isDue) {
                        totalDue++;
                    }
                }
            }
        }

        return { totalDue, totalNew };
    }

    private sortDecks(decks: ReviewDeck[]): ReviewDeck[] {
        this.deckStatsCache.clear();

        const sorted = [...decks];

        switch (this.currentSort) {
            case SortType.DATE_ASC:
                sorted.sort((a, b) => this.getDeckStats(a).minDate - this.getDeckStats(b).minDate);
                break;
            case SortType.DATE_DESC:
                sorted.sort((a, b) => this.getDeckStats(b).maxDate - this.getDeckStats(a).maxDate);
                break;
            case SortType.COUNT_DESC:
                sorted.sort((a, b) => this.getDeckStats(b).count - this.getDeckStats(a).count);
                break;
            case SortType.COUNT_ASC:
                sorted.sort((a, b) => this.getDeckStats(a).count - this.getDeckStats(b).count);
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

    private sortFlashcardDecks(decks: Deck[]): Deck[] {
        const sorted = [...decks];

        switch (this.currentSort) {
            case SortType.DATE_ASC:
                sorted.sort((a, b) => {
                    const aMinDate = this.getFlashcardDeckMinDueDate(a);
                    const bMinDate = this.getFlashcardDeckMinDueDate(b);
                    return aMinDate - bMinDate;
                });
                break;
            case SortType.DATE_DESC:
                sorted.sort((a, b) => {
                    const aMaxDate = this.getFlashcardDeckMaxDueDate(a);
                    const bMaxDate = this.getFlashcardDeckMaxDueDate(b);
                    return bMaxDate - aMaxDate;
                });
                break;
            case SortType.COUNT_DESC:
                sorted.sort((a, b) => {
                    const aCount = (a.newFlashcards?.length || 0) + (a.dueFlashcards?.length || 0);
                    const bCount = (b.newFlashcards?.length || 0) + (b.dueFlashcards?.length || 0);
                    return bCount - aCount;
                });
                break;
            case SortType.COUNT_ASC:
                sorted.sort((a, b) => {
                    const aCount = (a.newFlashcards?.length || 0) + (a.dueFlashcards?.length || 0);
                    const bCount = (b.newFlashcards?.length || 0) + (b.dueFlashcards?.length || 0);
                    return aCount - bCount;
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

    private getFlashcardDeckMinDueDate(deck: Deck): number {
        let minDate = Infinity;

        if (deck.dueFlashcards && deck.dueFlashcards.length > 0) {
            for (const card of deck.dueFlashcards) {
                if (card.isDue && card.scheduleInfo?.dueDate) {
                    const dueUnix = card.scheduleInfo.dueDate.valueOf();
                    if (dueUnix < minDate) {
                        minDate = dueUnix;
                    }
                }
            }
        }

        return minDate === Infinity ? Date.now() : minDate;
    }

    private getFlashcardDeckMaxDueDate(deck: Deck): number {
        let maxDate = 0;

        if (deck.dueFlashcards && deck.dueFlashcards.length > 0) {
            for (const card of deck.dueFlashcards) {
                if (card.scheduleInfo?.dueDate) {
                    const dueUnix = card.scheduleInfo.dueDate.valueOf();
                    if (dueUnix > maxDate) {
                        maxDate = dueUnix;
                    }
                }
            }
        }

        return maxDate === 0 ? Date.now() : maxDate;
    }

    private toggleDeck(deckName: string): void {
        if (this.expandedDecks.has(deckName)) {
            this.expandedDecks.delete(deckName);
        } else {
            this.expandedDecks.add(deckName);
        }
        const activeFile = this.plugin.app.workspace.getActiveFile();
        this.update(activeFile, false, false);
    }

    private toggleGroup(groupKey: string): void {
        if (this.expandedGroups.has(groupKey)) {
            this.expandedGroups.delete(groupKey);
        } else {
            this.expandedGroups.add(groupKey);
        }
        const activeFile = this.plugin.app.workspace.getActiveFile();
        this.update(activeFile, false, false);
    }

    private collapseAll(): void {
        this.expandedDecks.clear();
        this.expandedGroups.clear();
        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile, false, false);
    }

    private expandAll(): void {
        if (this.currentViewMode === SidebarViewMode.FlashCards) {
            if (this.plugin.deckTree) {
                const allDecks = this.plugin.deckTree.toDeckArray();
                allDecks.forEach((deck) => {
                    if (!deck.isRootDeck) {
                        this.expandedDecks.add(deck.deckName);
                    }
                });
            }

            const allGroupKeys = new Set<string>();
            if (this.plugin.deckTree) {
                const allDecks = this.plugin.deckTree.toDeckArray();
                for (const deck of allDecks) {
                    if (deck.isRootDeck) continue;

                    if (deck.newFlashcards?.length > 0) {
                        allGroupKeys.add(`${deck.deckName}::${t("NEW_CARDS")}`);
                    }
                    if (deck.dueFlashcards?.length > 0) {
                        allGroupKeys.add(`${deck.deckName}::${t("DUE_CARDS")}`);
                        allGroupKeys.add(`${deck.deckName}::Reviewed`);
                    }
                }
            }
            this.expandedGroups = allGroupKeys;
        } else {
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
        }

        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile, false, false);
    }

    public onunload(): void {
        for (const component of this.deckComponents.values()) {
            component.destroy();
        }
        this.deckComponents.clear();

        for (const component of this.flashcardDeckComponents.values()) {
            component.destroy();
        }
        this.flashcardDeckComponents.clear();

        this.header = null;
        this.stats = null;
        this.mainContainer = null;
        this.decksContainer = null;
        this.cachedStats = null;
        this.lastActiveFilePath = null;

        if (this.scrollTimeout) {
            window.clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }

        this.contentEl.empty();
        this.contentEl.removeClass("sr-sidebar-new-design");
    }
}
