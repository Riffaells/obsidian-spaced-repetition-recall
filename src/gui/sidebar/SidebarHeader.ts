import { t } from "src/lang/helpers";
import { FilterType, NoteSortType, SortType } from "./types";
import { setIcon, Menu } from "obsidian";

export class SidebarHeader {
    private containerEl: HTMLElement;
    private readonly onFilterChange: (filter: FilterType) => void;
    private readonly onCollapseAll: () => void;
    private readonly onExpandAll: () => void;
    private readonly onSortChange: (sort: SortType) => void;
    private readonly onNoteSortChange: (sort: NoteSortType) => void;
    private readonly onRecalculate: () => void;
    private currentFilter: FilterType = FilterType.ALL;
    private currentSort: SortType = SortType.DATE_ASC;
    private currentNoteSort: NoteSortType = NoteSortType.DEFAULT;
    private activeCount: number = 0;



    private isRendered = false;
    private filterButtons: Map<FilterType, HTMLElement> = new Map();
    private activeCountChip: HTMLElement | null = null;

    constructor(
        containerEl: HTMLElement,
        onFilterChange: (filter: FilterType) => void,
        onCollapseAll: () => void,
        onExpandAll: () => void,
        onSortChange: (sort: SortType) => void,
        onNoteSortChange: (sort: NoteSortType) => void,
        onRecalculate: () => void,
    ) {
        this.containerEl = containerEl;
        this.onFilterChange = onFilterChange;
        this.onCollapseAll = onCollapseAll;
        this.onExpandAll = onExpandAll;
        this.onSortChange = onSortChange;
        this.onNoteSortChange = onNoteSortChange;
        this.onRecalculate = onRecalculate;
    }

    public render(): void {
        if (!this.isRendered) {
            this.createView();
            this.isRendered = true;
        }
        this.updateView();
    }

    private createView(): void {
        this.containerEl.empty();
        this.containerEl.addClass("sr-new-sidebar-header");

        const filterContainer = this.containerEl.createDiv("sr-filter-buttons");

        this.createFilterButton(filterContainer, FilterType.ALL, t("FILTER_ALL"));
        this.createFilterButton(
            filterContainer,
            FilterType.ACTIVE,
            t("FILTER_ACTIVE"),
            true
        );
        this.createFilterButton(filterContainer, FilterType.REVIEWED, t("FILTER_REVIEWED"));

        const controlsContainer = this.containerEl.createDiv("sr-controls-buttons");
        this.createControlButton(
            controlsContainer,
            "collapse",
            t("COLLAPSE_ALL"),
            this.onCollapseAll,
        );
        this.createControlButton(controlsContainer, "expand", t("EXPAND_ALL"), this.onExpandAll);
        this.createSortButton(controlsContainer);
        this.createNoteSortButton(controlsContainer);
        this.createRecalculateButton(controlsContainer);
    }

    private updateView(): void {
        // Update Filter Buttons
        for (const [filter, btn] of this.filterButtons) {
            if (this.currentFilter === filter) {
                btn.addClass("sr-filter-active");
            } else {
                btn.removeClass("sr-filter-active");
            }
        }

        // Update Active Count
        if (this.activeCountChip) {
            if (this.activeCount > 0) {
                this.activeCountChip.setText(this.activeCount.toString());
                this.activeCountChip.style.display = "inline-block";
            } else {
                this.activeCountChip.style.display = "none";
            }
        }
    }

    private createRecalculateButton(container: HTMLElement): void {
        const recalculateButton = container.createEl("button", {
            cls: "sr-control-btn",
            attr: {
                "aria-label": t("RECALCULATE_NOTES"),
            },
        });

        setIcon(recalculateButton, "refresh-cw");

        recalculateButton.addEventListener("click", () => {
            this.onRecalculate();
        });
    }

    private createNoteSortButton(container: HTMLElement): void {
        const noteSortButton = container.createEl("button", {
            cls: "sr-control-btn",
            attr: {
                "aria-label": t("SORT_NOTES"),
            },
        });

        setIcon(noteSortButton, "list-ordered");

        noteSortButton.addEventListener("click", (e) => {
            e.stopPropagation();
            const menu = new Menu();

            const sortOptions = [
                { type: NoteSortType.DEFAULT, label: t("DEFAULT"), icon: "arrow-up-down" },
                { type: NoteSortType.NAME_ASC, label: t("SORT_NAME_ASC"), icon: "sort-asc" },
                { type: NoteSortType.NAME_DESC, label: t("SORT_NAME_DESC"), icon: "sort-desc" },
                { type: NoteSortType.PATH_ASC, label: t("SORT_PATH_ASC"), icon: "sort-asc" },
                { type: NoteSortType.PATH_DESC, label: t("SORT_PATH_DESC"), icon: "sort-desc" },
            ];

            sortOptions.forEach((option) => {
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

            menu.showAtMouseEvent(e as MouseEvent);
        });
    }

    public setNoteSort(sort: NoteSortType): void {
        this.currentNoteSort = sort;
    }

    private createSortButton(container: HTMLElement): void {
        const sortButton = container.createEl("button", {
            cls: "sr-control-btn",
            attr: {
                "aria-label": t("SORT"),
            },
        });

        setIcon(sortButton, "arrow-up-down");

        sortButton.addEventListener("click", (e) => {
            e.stopPropagation();
            const menu = new Menu();

            const sortOptions = [
                {
                    type: SortType.DATE_ASC,
                    label: t("SORT_DATE_ASC"),
                    icon: "calendar-arrow-up",
                },
                {
                    type: SortType.DATE_DESC,
                    label: t("SORT_DATE_DESC"),
                    icon: "calendar-arrow-down",
                },
                {
                    type: SortType.COUNT_DESC,
                    label: t("SORT_COUNT_DESC"),
                    icon: "arrow-down-wide-narrow",
                },
                {
                    type: SortType.COUNT_ASC,
                    label: t("SORT_COUNT_ASC"),
                    icon: "arrow-up-narrow-wide",
                },
                {
                    type: SortType.NAME_ASC,
                    label: t("SORT_NAME_ASC"),
                    icon: "sort-asc",
                },
                {
                    type: SortType.NAME_DESC,
                    label: t("SORT_NAME_DESC"),
                    icon: "sort-desc",
                },
            ];

            sortOptions.forEach((option) => {
                menu.addItem((item) => {
                    item.setTitle(option.label)
                        .setIcon(option.icon)
                        .setChecked(this.currentSort === option.type)
                        .onClick(() => {
                            this.currentSort = option.type;
                            this.onSortChange(option.type);
                        });
                });
            });

            menu.showAtMouseEvent(e as MouseEvent);
        });
    }

    public setSort(sort: SortType): void {
        this.currentSort = sort;
    }

    private createControlButton(
        container: HTMLElement,
        type: "collapse" | "expand",
        label: string,
        onClick: () => void,
    ): void {
        const button = container.createEl("button", {
            cls: "sr-control-btn",
            attr: {
                "aria-label": label,
            },
        });

        const iconName = type === "collapse" ? "chevrons-down-up" : "chevrons-up-down";
        setIcon(button, iconName);

        button.addEventListener("click", onClick);
    }

    public setFilter(filter: FilterType): void {
        this.currentFilter = filter;
    }

    public setActiveCount(count: number): void {
        this.activeCount = count;
    }

    private createFilterButton(
        container: HTMLElement,
        filter: FilterType,
        label: string,
        hasChip: boolean = false,
    ): void {
        const button = container.createEl("button", {
            cls: "sr-filter-btn",
        });

        button.createSpan({ text: label });

        if (hasChip) {
            this.activeCountChip = button.createSpan({
                text: "0",
                cls: "sr-filter-chip",
            });
            this.activeCountChip.style.display = "none";
        }

        button.addEventListener("click", () => {
            this.onFilterChange(filter);
        });

        this.filterButtons.set(filter, button);
    }
}
