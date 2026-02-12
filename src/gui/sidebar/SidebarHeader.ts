import { t } from "src/lang/helpers";
import { CardSortType, FilterType, NoteSortType, SidebarViewMode, SortType } from "./types";
import { Menu, setIcon } from "obsidian";

export class SidebarHeader {
    private readonly containerEl: HTMLElement;
    private readonly onFilterChange: (filter: FilterType) => void;
    private readonly onCollapseAll: () => void;
    private readonly onExpandAll: () => void;
    private readonly onExpandFullBranch: () => void;
    private readonly onSortChange: (sort: SortType) => void;
    private readonly onNoteSortChange: (sort: NoteSortType) => void;
    private readonly onCardSortChange: (sort: CardSortType) => void;
    private readonly onRecalculate: () => void;
    private readonly onViewModeChange: (mode: SidebarViewMode) => void;

    private currentFilter: FilterType = FilterType.ALL;
    private currentSort: SortType = SortType.DATE_ASC;
    private currentNoteSort: NoteSortType = NoteSortType.DEFAULT;
    private currentCardSort: CardSortType = CardSortType.DEFAULT;
    private currentViewMode: SidebarViewMode = SidebarViewMode.Notes;
    private activeNotesCount: number = 0;
    private activeCardsCount: number = 0;

    private isRendered = false;
    private readonly filterButtons: Map<FilterType, HTMLElement> = new Map();
    private readonly viewModeButtons: Map<SidebarViewMode, HTMLElement> = new Map();
    private activeCountChip: HTMLElement | null = null;
    private sortButton: HTMLElement | null = null;
    private abortController: AbortController | null = null;

    constructor(
        containerEl: HTMLElement,
        onFilterChange: (filter: FilterType) => void,
        onCollapseAll: () => void,
        onExpandAll: () => void,
        onExpandFullBranch: () => void,
        onSortChange: (sort: SortType) => void,
        onNoteSortChange: (sort: NoteSortType) => void,
        onCardSortChange: (sort: CardSortType) => void,
        onRecalculate: () => void,
        onViewModeChange: (mode: SidebarViewMode) => void,
    ) {
        this.containerEl = containerEl;
        this.onFilterChange = onFilterChange;
        this.onCollapseAll = onCollapseAll;
        this.onExpandAll = onExpandAll;
        this.onExpandFullBranch = onExpandFullBranch;
        this.onSortChange = onSortChange;
        this.onNoteSortChange = onNoteSortChange;
        this.onCardSortChange = onCardSortChange;
        this.onRecalculate = onRecalculate;
        this.onViewModeChange = onViewModeChange;
    }

    public render(): void {
        if (!this.isRendered) {
            this.createView();
            this.isRendered = true;
        }
        this.updateView();
    }

    public destroy(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        this.filterButtons.clear();
        this.viewModeButtons.clear();
        this.activeCountChip = null;
        this.sortButton = null;
        this.isRendered = false;
    }

    private createView(): void {
        this.abortController = new AbortController();

        this.containerEl.empty();
        this.containerEl.addClass("sr-new-sidebar-header");

        this.filterButtons.clear();
        this.viewModeButtons.clear();

        this.createViewModeToggle(this.containerEl);

        const filterContainer = this.containerEl.createDiv("sr-filter-buttons");
        this.createFilterButton(filterContainer, FilterType.ALL, t("FILTER_ALL"));
        this.createFilterButton(filterContainer, FilterType.ACTIVE, t("FILTER_ACTIVE"), true);
        this.createFilterButton(filterContainer, FilterType.REVIEWED, t("FILTER_REVIEWED"));

        const controlsContainer = this.containerEl.createDiv("sr-controls-buttons");
        this.createIconButton(
            controlsContainer,
            "chevrons-down-up",
            t("COLLAPSE_ALL"),
            this.onCollapseAll,
        );
        this.createIconButton(
            controlsContainer,
            "chevrons-up-down",
            t("EXPAND_ALL"),
            this.onExpandAll,
        );

        this.createUnifiedSortButton(controlsContainer);
        this.createIconButton(
            controlsContainer,
            "refresh-cw",
            t("RECALCULATE_NOTES"),
            this.onRecalculate,
        );
    }

    private createViewModeToggle(container: HTMLElement): void {
        const toggleContainer = container.createDiv("sr-view-mode-toggle");

        const notesButton = this.createButton(toggleContainer, {
            cls: "sr-view-mode-button",
            text: t("NOTES"),
            onClick: () => this.setViewMode(SidebarViewMode.Notes),
        });
        this.viewModeButtons.set(SidebarViewMode.Notes, notesButton);

        const flashcardsButton = this.createButton(toggleContainer, {
            cls: "sr-view-mode-button",
            text: t("FLASHCARDS"),
            onClick: () => this.setViewMode(SidebarViewMode.FlashCards),
        });
        this.viewModeButtons.set(SidebarViewMode.FlashCards, flashcardsButton);
    }

    private createFilterButton(
        container: HTMLElement,
        filter: FilterType,
        label: string,
        hasChip: boolean = false,
    ): void {
        const button = this.createButton(container, {
            cls: "sr-filter-btn",
            onClick: () => {
                this.currentFilter = filter;
                this.updateView();
                this.onFilterChange(filter);
            },
        });

        button.createSpan({ text: label });

        if (hasChip) {
            this.activeCountChip = button.createSpan({
                text: "0",
                cls: "sr-filter-chip sr-hidden",
            });
        }

        this.filterButtons.set(filter, button);
    }

    private createIconButton(
        container: HTMLElement,
        icon: string,
        label: string,
        onClick: () => void,
    ): HTMLElement {
        const button = this.createButton(container, {
            cls: "sr-control-btn",
            ariaLabel: label,
            onClick,
        });

        setIcon(button, icon);
        return button;
    }

    private createButton(
        container: HTMLElement,
        options: {
            cls: string;
            text?: string;
            ariaLabel?: string;
            onClick: () => void;
        },
    ): HTMLElement {
        if (!this.abortController) {
            throw new Error("AbortController not initialized");
        }

        const button = container.createEl("button", {
            cls: options.cls,
            text: options.text,
            attr: options.ariaLabel ? { "aria-label": options.ariaLabel } : undefined,
        });

        button.addEventListener("click", options.onClick, {
            signal: this.abortController.signal,
        });

        return button;
    }

    private createUnifiedSortButton(container: HTMLElement): void {
        if (!this.abortController) return;

        this.sortButton = container.createEl("button", {
            cls: "sr-control-btn",
            attr: { "aria-label": t("SORT") },
        });

        // Initial icon based on current sort
        this.updateSortButtonIcon();

        this.sortButton.addEventListener(
            "click",
            (e) => {
                e.stopPropagation();
                this.showUnifiedSortMenu(e as MouseEvent);
            },
            { signal: this.abortController.signal },
        );
    }

    private showUnifiedSortMenu(e: MouseEvent): void {
        const menu = new Menu();

        // Deck Sort Section
        menu.addItem((item) => {
            item.setTitle(t("SORT_DECKS"))
                .setIcon("folder")
                .setDisabled(true);
        });

        const deckSortOptions = [
            { type: SortType.DATE_ASC, label: t("SORT_DATE_ASC"), icon: "calendar-arrow-up" },
            { type: SortType.DATE_DESC, label: t("SORT_DATE_DESC"), icon: "calendar-arrow-down" },
            {
                type: SortType.COUNT_DESC,
                label: t("SORT_COUNT_DESC"),
                icon: "arrow-down-wide-narrow",
            },
            { type: SortType.COUNT_ASC, label: t("SORT_COUNT_ASC"), icon: "arrow-up-narrow-wide" },
            { type: SortType.NAME_ASC, label: t("SORT_NAME_ASC"), icon: "sort-asc" },
            { type: SortType.NAME_DESC, label: t("SORT_NAME_DESC"), icon: "sort-desc" },
        ];

        deckSortOptions.forEach((option) => {
            menu.addItem((item) => {
                item.setTitle(option.label)
                    .setIcon(option.icon)
                    .setChecked(this.currentSort === option.type)
                    .onClick(() => {
                        this.currentSort = option.type;
                        this.onSortChange(option.type);
                        this.updateSortButtonIcon();
                    });
            });
        });

        menu.addSeparator();

        // Note Sort Section
        menu.addItem((item) => {
            item.setTitle(t("SORT_NOTES"))
                .setIcon("file-text")
                .setDisabled(true);
        });

        const noteSortOptions = [
            { type: NoteSortType.DEFAULT, label: t("DEFAULT"), icon: "arrow-up-down" },
            { type: NoteSortType.NAME_ASC, label: t("SORT_NAME_ASC"), icon: "sort-asc" },
            { type: NoteSortType.NAME_DESC, label: t("SORT_NAME_DESC"), icon: "sort-desc" },
            { type: NoteSortType.PATH_ASC, label: t("SORT_PATH_ASC"), icon: "folder" },
            { type: NoteSortType.PATH_DESC, label: t("SORT_PATH_DESC"), icon: "folder" },
        ];

        noteSortOptions.forEach((option) => {
            menu.addItem((item) => {
                item.setTitle(option.label)
                    .setIcon(option.icon)
                    .setChecked(this.currentNoteSort === option.type)
                    .onClick(() => {
                        this.currentNoteSort = option.type;
                        this.onNoteSortChange(option.type);
                    });
            });
        });

        menu.addSeparator();

        // Card Sort Section
        menu.addItem((item) => {
            item.setTitle(t("SORT_CARDS"))
                .setIcon("layers")
                .setDisabled(true);
        });

        const cardSortOptions = [
            { type: CardSortType.DEFAULT, label: t("DEFAULT"), icon: "arrow-up-down" },
            { type: CardSortType.FRONT_ASC, label: t("SORT_FRONT_ASC"), icon: "sort-asc" },
            { type: CardSortType.FRONT_DESC, label: t("SORT_FRONT_DESC"), icon: "sort-desc" },
            { type: CardSortType.PATH_ASC, label: t("SORT_PATH_ASC"), icon: "folder" },
            { type: CardSortType.PATH_DESC, label: t("SORT_PATH_DESC"), icon: "folder" },
            { type: CardSortType.DUE_DATE_ASC, label: t("SORT_DUE_DATE_ASC"), icon: "calendar" },
            { type: CardSortType.DUE_DATE_DESC, label: t("SORT_DUE_DATE_DESC"), icon: "calendar" },
        ];

        cardSortOptions.forEach((option) => {
            menu.addItem((item) => {
                item.setTitle(option.label)
                    .setIcon(option.icon)
                    .setChecked(this.currentCardSort === option.type)
                    .onClick(() => {
                        this.currentCardSort = option.type;
                        this.onCardSortChange(option.type);
                    });
            });
        });

        menu.showAtMouseEvent(e);
    }

    public setCardSort(sort: CardSortType): void {
        this.currentCardSort = sort;
    }

    private updateView(): void {
        this.updateViewModeButtons();
        this.updateFilterButtons();
        this.updateActiveCount();
    }

    private updateViewModeButtons(): void {
        for (const [mode, btn] of this.viewModeButtons) {
            if (this.currentViewMode === mode) {
                btn.addClass("sr-view-mode-active");
            } else {
                btn.removeClass("sr-view-mode-active");
            }
        }
    }

    private updateFilterButtons(): void {
        for (const [filter, btn] of this.filterButtons) {
            if (this.currentFilter === filter) {
                btn.addClass("sr-filter-active");
            } else {
                btn.removeClass("sr-filter-active");
            }
        }
    }

    private updateActiveCount(): void {
        if (!this.activeCountChip) return;

        const count =
            this.currentViewMode === SidebarViewMode.FlashCards
                ? this.activeCardsCount
                : this.activeNotesCount;

        const countStr = count.toString();
        if (this.activeCountChip.textContent !== countStr) {
            this.activeCountChip.setText(countStr);
        }

        this.activeCountChip.toggleClass("sr-hidden", count === 0);
    }

    public setFilter(filter: FilterType): void {
        if (this.currentFilter !== filter) {
            this.currentFilter = filter;
            this.updateFilterButtons();
        }
    }

    public setSort(sort: SortType): void {
        this.currentSort = sort;
    }

    public setNoteSort(sort: NoteSortType): void {
        this.currentNoteSort = sort;
    }

    public setViewMode(mode: SidebarViewMode): void {
        if (this.currentViewMode !== mode) {
            this.currentViewMode = mode;
            this.updateViewModeButtons();
            this.onViewModeChange(mode);
        }
    }

    public setActiveCount(notesCount: number, cardsCount: number = 0): void {
        const relevantCount =
            this.currentViewMode === SidebarViewMode.FlashCards ? cardsCount : notesCount;
        const currentRelevantCount =
            this.currentViewMode === SidebarViewMode.FlashCards
                ? this.activeCardsCount
                : this.activeNotesCount;

        this.activeNotesCount = notesCount;
        this.activeCardsCount = cardsCount;

        if (relevantCount !== currentRelevantCount) {
            this.updateActiveCount();
        }
    }

    private updateSortButtonIcon(): void {
        if (!this.sortButton) return;

        const sortIconMap: Record<SortType, string> = {
            [SortType.DATE_ASC]: "calendar-arrow-up",
            [SortType.DATE_DESC]: "calendar-arrow-down",
            [SortType.COUNT_DESC]: "arrow-down-wide-narrow",
            [SortType.COUNT_ASC]: "arrow-up-narrow-wide",
            [SortType.NAME_ASC]: "sort-asc",
            [SortType.NAME_DESC]: "sort-desc",
        };

        const icon = sortIconMap[this.currentSort] || "arrow-up-down";
        setIcon(this.sortButton, icon);
    }
}
