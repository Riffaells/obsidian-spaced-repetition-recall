import { TFile } from "obsidian";
import type SRPlugin from "src/main";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarStats } from "./sidebar/SidebarStats";
import { DeckComponent } from "./sidebar/DeckComponent";
import { FilterType, SidebarStats as Stats, SortType } from "./sidebar/types";
import { calculateActiveNotesCount, calculateSidebarStats, createGroupKey } from "./sidebar/utils";

export class SidebarNewDesign {
    private readonly plugin: SRPlugin;
    private containerEl: HTMLElement;
    private currentFilter: FilterType = FilterType.ALL;
    private currentSort: SortType = SortType.DATE_ASC;
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

    constructor(plugin: SRPlugin, containerEl: HTMLElement) {
        this.plugin = plugin;
        this.containerEl = containerEl;
    }

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
        );
        this.header.render();

        // Statictics
        const statsContainer = this.mainContainer.createDiv();
        this.cachedStats = calculateSidebarStats(this.plugin);
        this.stats = new SidebarStats(statsContainer, this.cachedStats);
        this.stats.render();

        this.decksContainer = this.mainContainer.createDiv("sr-new-sidebar-decks");
    }

    private update(activeFile: TFile | null): void {
        if (!this.decksContainer) return;

        this.destroyDeckComponents();

        this.cachedStats = calculateSidebarStats(this.plugin);
        if (this.stats && this.cachedStats) {
            this.stats.updateStats(this.cachedStats);
        }

        if (this.header) {
            this.header.setFilter(this.currentFilter);
            const activeCount = calculateActiveNotesCount(this.plugin);
            this.header.setActiveCount(activeCount);
            this.header.render();
        }

        this.decksContainer.empty();

        this.renderDecks(activeFile);
    }

    private renderDecks(activeFile: TFile | null): void {
        if (!this.decksContainer) return;

        const currentPath = activeFile?.path || null;
        const shouldAutoExpand = currentPath !== this.lastActiveFilePath && !this.isFilterChange;
        this.lastActiveFilePath = currentPath;

        const decks = Object.values(this.plugin.reviewDecks);
        const sortedDecks = this.sortDecks(decks);

        for (const deck of sortedDecks) {
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
            );
            deckComponent.render();
            this.deckComponents.push(deckComponent);
        }

        this.isFilterChange = false;
    }

    private sortDecks(decks: any[]): any[] {
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
        }

        return sorted;
    }

    private getMinDueDate(deck: any): number {
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

    private getMaxDueDate(deck: any): number {
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

    private getDeckNotesCount(deck: any): number {
        let count = 0;

        if (this.currentFilter === FilterType.ALL) {
            count = deck.dueNotesCount + deck.newNotes.length;
        } else if (this.currentFilter === FilterType.ACTIVE) {
            count =
                deck.scheduledNotes.filter((note: any) => {
                    const file = this.plugin.app.vault.getAbstractFileByPath(note.note.filePath);
                    return file instanceof TFile;
                }).length + deck.newNotes.length;
        } else if (this.currentFilter === FilterType.REVIEWED) {
            count = deck.scheduledNotes.filter((note: any) => {
                const file = this.plugin.app.vault.getAbstractFileByPath(note.note.filePath);
                return !(file instanceof TFile);
            }).length;
        }

        return count;
    }

    private toggleDeck(deckName: string, activeFile: TFile | null): void {
        if (this.expandedDecks.has(deckName)) {
            this.expandedDecks.delete(deckName);
        } else {
            this.expandedDecks.add(deckName);
        }
        this.update(activeFile);
    }

    private toggleGroup(groupKey: string, activeFile: TFile | null): void {
        if (this.expandedGroups.has(groupKey)) {
            this.expandedGroups.delete(groupKey);
        } else {
            this.expandedGroups.add(groupKey);
        }
        this.update(activeFile);
    }

    private collapseAll(): void {
        this.expandedDecks.clear();
        this.expandedGroups.clear();
        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile);
    }

    private expandAll(): void {
        for (const deckKey in this.plugin.reviewDecks) {
            this.expandedDecks.add(this.plugin.reviewDecks[deckKey].deckName);
        }

        const groupHeaders = this.containerEl.querySelectorAll(".sr-new-note-group-header");
        groupHeaders.forEach((header) => {
            const groupEl = header.closest(".sr-new-note-group");
            if (groupEl) {
                const headerText = header.textContent || "";
                const match = headerText.match(/^(.+?)\s*\(/);
                if (match) {
                    const title = match[1].trim();
                    const deckEl = groupEl.closest(".sr-new-deck");
                    if (deckEl) {
                        const deckTitle = deckEl.querySelector(".sr-new-deck-title")?.textContent;
                        if (deckTitle) {
                            const groupKey = createGroupKey(deckTitle, title);
                            this.expandedGroups.add(groupKey);
                        }
                    }
                }
            }
        });

        const currentFile = this.plugin.app.workspace.getActiveFile();
        this.update(currentFile);
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
