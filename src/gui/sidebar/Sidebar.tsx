import { debounce, ItemView, Menu, Notice, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import type SRPlugin from "src/main";
import { t } from "src/lang/helpers";
import { DeckComponent } from "./DeckComponent";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarStats } from "./SidebarStats";
import { ReviewDeck } from "src/core/models/ReviewDeck";
import {
    FilterType,
    NoteSortType,
    SidebarStats as Stats,
    SidebarViewMode,
    SortType,
} from "./types";
import {
    calculateActiveNotesCount,
    calculateActiveFlashcardsCount,
    calculateSidebarStats,
    createGroupKey,
    getGroupTitle,
    calculateDaysUntilDue,
} from "./utils";
import { FlashcardDeckComponent } from "./FlashcardDeckComponent";
import { Deck } from "src/core/models/Deck";
import { DeckReconciler } from "./services/DeckReconciler";
import { DeckSorter } from "./services/DeckSorter";
import { RandomReviewService } from "./services/RandomReviewService";

export const REVIEW_QUEUE_VIEW_TYPE = "review-queue-list-view";

export class ReviewQueueListView extends ItemView {
    private readonly plugin: SRPlugin;
    private readonly debouncedRedraw: () => void;

    // Services
    private deckReconciler: DeckReconciler | null = null;
    private deckSorter: DeckSorter;
    private randomReviewService: RandomReviewService;

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

    // State tracking
    private cachedStats: Stats | null = null;
    private lastActiveFilePath: string | null = null;
    private sortedDecks: ReviewDeck[] = [];
    private justRecalculated = false;
    private scrollFrameId: number | null = null;
    private scrollTimeout: number | null = null;
    private cachedActiveNotesCount: number = 0;
    private cachedActiveCardsCount: number = 0;
    private needsCountRecalculation = true;

    constructor(leaf: WorkspaceLeaf, plugin: SRPlugin) {
        super(leaf);

        this.plugin = plugin;
        this.currentSort = this.plugin.data.settings.sidebarSortOrder;
        this.currentNoteSort = this.plugin.data.settings.sidebarNoteSortOrder;
        this.currentViewMode = this.plugin.data.settings.sidebarViewMode || SidebarViewMode.Notes;

        // Initialize services
        this.deckSorter = new DeckSorter(plugin);
        this.randomReviewService = new RandomReviewService(plugin);

        this.debouncedRedraw = debounce(() => this.redraw(), 150, true);

        this.registerEvent(this.app.workspace.on("file-open", () => this.debouncedRedraw()));
        this.registerEvent(this.app.vault.on("rename", () => this.debouncedRedraw()));
        this.registerEvent(
            this.app.workspace.on("sr:note-reviewed" as any, () => {
                this.needsCountRecalculation = true;
                this.debouncedRedraw();
            }),
        );
        this.registerEvent(
            this.app.workspace.on("sr:stats-updated" as any, () => {
                this.needsCountRecalculation = true;
                this.debouncedRedraw();
            }),
        );

        this.registerDomEvent(this.contentEl, "scroll", this.handleScroll);
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
        if (!this.plugin?.data) return;

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

        // Header
        const headerContainer = this.mainContainer.createDiv();
        this.header = new SidebarHeader(
            headerContainer,
            (filter) => this.handleFilterChange(filter),
            () => this.collapseAll(),
            () => this.expandAll(),
            (sort) => this.handleSortChange(sort),
            (sort) => this.handleNoteSortChange(sort),
            () => this.handleRecalculate(),
            (mode) => this.handleViewModeChange(mode),
        );
        this.header.render();

        // Stats
        const statsContainer = this.mainContainer.createDiv();
        this.cachedStats = calculateSidebarStats(this.plugin);
        this.stats = new SidebarStats(
            statsContainer,
            this.cachedStats,
            () => this.openRandomNew(),
            () => this.openRandomDue(),
        );
        this.stats.render();

        // Decks container
        this.decksContainer = this.mainContainer.createDiv("sr-new-sidebar-decks");

        // Initialize reconciler
        this.deckReconciler = new DeckReconciler(
            this.plugin,
            this.decksContainer,
            this.expandedDecks,
            this.expandedGroups,
            this.deckComponents,
            this.flashcardDeckComponents,
        );

        // Scroll to top button
        const scrollToTopBtn = this.contentEl.createDiv("sr-scroll-to-top");
        setIcon(scrollToTopBtn, "arrow-up");
        scrollToTopBtn.ariaLabel = "Scroll to Top";
        scrollToTopBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.contentEl.scrollTo({ top: 0, behavior: "smooth" });
        };
    }

    private handleScroll = () => {
        const scrollToTopBtn = this.contentEl.querySelector(".sr-scroll-to-top");
        if (scrollToTopBtn) {
            if (this.contentEl.scrollTop > 1000) {
                scrollToTopBtn.addClass("visible");
            } else {
                scrollToTopBtn.removeClass("visible");
            }
        }
    };

    private handleFilterChange(filter: FilterType): void {
        this.currentFilter = filter;
        this.deckSorter.setFilter(filter);
        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile, true, false);
    }

    private handleSortChange(sort: SortType): void {
        this.currentSort = sort;
        this.plugin.data.settings.sidebarSortOrder = sort;
        this.saveSettingsDebounced();
        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile, true, false);
    }

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
            this.needsCountRecalculation = true;
            const currentFile = this.plugin.app.workspace.getActiveFile();
            this.update(currentFile);
        },
        150,
        true,
    );

    private handleRecalculate = async () => {
        new Notice(t("RECALCULATING_NOTES_NOTICE_START"));

        const notesBefore = this.countAllNotes();
        this.justRecalculated = true;
        this.needsCountRecalculation = true;
        await this.plugin.sync();
        const notesAfter = this.countAllNotes();
        const notesAdded = notesAfter - notesBefore;

        if (notesAdded > 0) {
            new Notice(t("RECALCULATING_NOTES_NOTICE_DONE_ADDED", { count: notesAdded }));
        } else {
            new Notice(t("RECALCULATING_NOTES_NOTICE_DONE_NONE"));
        }

        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile);
    };

    private countAllNotes(): number {
        let count = 0;
        for (const deck of Object.values(this.plugin.reviewDecks)) {
            count += (deck.newNotes?.length || 0) + (deck.scheduledNotes?.length || 0);
        }
        return count;
    }

    private saveSettingsDebounced = debounce(
        async () => {
            await this.plugin.saveData(this.plugin.data);
        },
        500,
        true,
    );

    private update(activeFile: TFile | null, resort = true, shouldScroll = true): void {
        if (!this.decksContainer || !this.deckReconciler) return;

        this.clearScrollTimeout();
        this.updateStats();
        this.updateHeader();
        this.reconcileDecks(activeFile, resort, shouldScroll);

        if (shouldScroll) {
            this.scrollToActiveItem();
        }
    }

    private clearScrollTimeout(): void {
        if (this.scrollTimeout) {
            window.clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }
    }

    private updateStats(): void {
        if (this.needsCountRecalculation || !this.cachedStats) {
            this.cachedStats =
                this.currentViewMode === SidebarViewMode.FlashCards
                    ? this.calculateFlashcardStats()
                    : calculateSidebarStats(this.plugin);
        }

        this.stats?.updateStats(this.cachedStats);
    }

    private updateHeader(): void {
        if (!this.header) return;

        this.header.setFilter(this.currentFilter);
        this.header.setSort(this.currentSort);
        this.header.setNoteSort(this.currentNoteSort);
        this.header.setViewMode(this.currentViewMode);

        if (this.needsCountRecalculation) {
            this.cachedActiveNotesCount = calculateActiveNotesCount(this.plugin);
            this.cachedActiveCardsCount = calculateActiveFlashcardsCount(this.plugin);
            this.needsCountRecalculation = false;
        }

        this.header.setActiveCount(this.cachedActiveNotesCount, this.cachedActiveCardsCount);
        this.header.render();
    }

    private reconcileDecks(
        activeFile: TFile | null,
        resort = true,
        shouldAutoExpand = false,
    ): void {
        if (!this.deckReconciler) return;

        this.lastActiveFilePath = activeFile?.path || null;
        shouldAutoExpand = this.shouldAutoExpandDecks(shouldAutoExpand);

        if (this.currentViewMode === SidebarViewMode.FlashCards) {
            const sortedFlashcardDecks = this.getFlashcardDecks();
            const activeDeckName = this.deckReconciler.reconcileFlashcardDecks(
                activeFile,
                sortedFlashcardDecks,
                this.currentFilter,
                (deckName) => this.toggleDeck(deckName),
                (groupKey) => this.toggleGroup(groupKey),
            );

            if (activeDeckName) {
                this.scrollToActiveDeck(activeDeckName);
            }
        } else {
            if (resort) {
                this.deckSorter.setFilter(this.currentFilter);
                this.sortedDecks = this.deckSorter.sortNoteDecks(
                    Object.values(this.plugin.reviewDecks),
                    this.currentSort,
                );
            }

            this.deckReconciler.reconcileNoteDecks(
                activeFile,
                this.sortedDecks,
                this.currentFilter,
                this.currentNoteSort,
                shouldAutoExpand,
                (deckName) => this.toggleDeck(deckName),
                (groupKey) => this.toggleGroup(groupKey),
            );
        }
    }

    private shouldAutoExpandDecks(shouldAutoExpand: boolean): boolean {
        if (this.justRecalculated) {
            this.justRecalculated = false;
            return true;
        }
        return shouldAutoExpand;
    }

    private getFlashcardDecks(): Deck[] {
        if (!this.plugin.deckTree) return [];

        const allDecks = this.plugin.deckTree.toDeckArray();
        const flashcardDecks = allDecks.filter(
            (deck) =>
                !deck.isRootDeck &&
                (deck.newFlashcards.length > 0 || deck.dueFlashcards.length > 0),
        );

        return this.deckSorter.sortFlashcardDecks(flashcardDecks, this.currentSort);
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

    private scrollToActiveDeck(deckName: string): void {
        this.cancelPendingScroll();

        this.scrollFrameId = window.requestAnimationFrame(() => {
            const activeDeck = this.contentEl.querySelector(".sr-flashcard-deck.sr-deck-active");
            if (activeDeck) {
                activeDeck.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            this.scrollFrameId = null;
        });
    }

    private scrollToActiveItem(): void {
        this.cancelPendingScroll();

        this.scrollFrameId = window.requestAnimationFrame(() => {
            const activeItem = this.contentEl.querySelector(".sr-new-note-item.is-active");
            if (activeItem) {
                activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            this.scrollFrameId = null;
        });
    }

    private cancelPendingScroll(): void {
        if (this.scrollFrameId) {
            window.cancelAnimationFrame(this.scrollFrameId);
            this.scrollFrameId = null;
        }
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
            this.expandAllFlashcardDecks();
        } else {
            this.expandAllNoteDecks();
        }

        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile, false, false);
    }

    private expandAllFlashcardDecks(): void {
        if (!this.plugin.deckTree) return;

        const allDecks = this.plugin.deckTree.toDeckArray();
        allDecks.forEach((deck) => {
            if (!deck.isRootDeck) {
                this.expandedDecks.add(deck.deckName);
            }
        });

        const allGroupKeys = new Set<string>();
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
        this.expandedGroups = allGroupKeys;
    }

    private expandAllNoteDecks(): void {
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

    private openRandomNew = async (): Promise<void> => {
        if (this.currentViewMode === SidebarViewMode.FlashCards) {
            await this.randomReviewService.openRandomNewCard();
        } else {
            await this.randomReviewService.openRandomNewNote();
        }
    };

    private openRandomDue = async (): Promise<void> => {
        if (this.currentViewMode === SidebarViewMode.FlashCards) {
            await this.randomReviewService.openRandomDueCard();
        } else {
            await this.randomReviewService.openRandomDueNote();
        }
    };

    public onunload(): void {
        this.deckReconciler?.cleanupNoteComponents();
        this.deckReconciler?.cleanupFlashcardComponents();
        this.stats?.destroy();

        this.header = null;
        this.stats = null;
        this.mainContainer = null;
        this.decksContainer = null;
        this.cachedStats = null;
        this.lastActiveFilePath = null;
        this.deckReconciler = null;

        if (this.scrollTimeout) {
            window.clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }

        this.contentEl.empty();
        this.contentEl.removeClass("sr-sidebar-new-design");
    }
}
