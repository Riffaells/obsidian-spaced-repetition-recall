import { t } from "src/lang/helpers";
import { FilterType } from "./types";
import { setIcon } from "obsidian";

export class SidebarHeader {
    private containerEl: HTMLElement;
    private readonly onFilterChange: (filter: FilterType) => void;
    private readonly onCollapseAll: () => void;
    private readonly onExpandAll: () => void;
    private currentFilter: FilterType = FilterType.ALL;
    private activeCount: number = 0;

    constructor(
        containerEl: HTMLElement,
        onFilterChange: (filter: FilterType) => void,
        onCollapseAll: () => void,
        onExpandAll: () => void
    ) {
        this.containerEl = containerEl;
        this.onFilterChange = onFilterChange;
        this.onCollapseAll = onCollapseAll;
        this.onExpandAll = onExpandAll;
    }

    public render(): void {
        this.containerEl.empty();
        this.containerEl.addClass("sr-new-sidebar-header");

        const filterContainer = this.containerEl.createDiv("sr-filter-buttons");

        this.createFilterButton(filterContainer, FilterType.ALL, t("FILTER_ALL"), null);
        this.createFilterButton(
            filterContainer,
            FilterType.ACTIVE,
            t("FILTER_ACTIVE"),
            this.activeCount
        );
        this.createFilterButton(filterContainer, FilterType.REVIEWED, t("FILTER_REVIEWED"), null);

        const controlsContainer = this.containerEl.createDiv("sr-controls-buttons");
        this.createControlButton(controlsContainer, "collapse", t("COLLAPSE_ALL"), this.onCollapseAll);
        this.createControlButton(controlsContainer, "expand", t("EXPAND_ALL"), this.onExpandAll);
    }

    private createControlButton(
        container: HTMLElement,
        type: "collapse" | "expand",
        label: string,
        onClick: () => void
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
        count: number | null
    ): void {
        const button = container.createEl("button", {
            cls: "sr-filter-btn",
        });

        button.createSpan({ text: label });

        if (count !== null && count > 0) {
            button.createSpan({
                text: count.toString(),
                cls: "sr-filter-chip",
            });
        }

        if (this.currentFilter === filter) {
            button.addClass("sr-filter-active");
        }

        button.addEventListener("click", () => {
            this.currentFilter = filter;
            this.onFilterChange(filter);
            this.updateActiveButton(container, button);
        });
    }

    private updateActiveButton(container: HTMLElement, activeButton: HTMLElement): void {
        container.querySelectorAll(".sr-filter-btn").forEach(btn => {
            btn.removeClass("sr-filter-active");
        });
        activeButton.addClass("sr-filter-active");
    }
}
