import { t } from "src/lang/helpers";
import { SidebarStats as Stats, SidebarViewMode } from "./types";

export class SidebarStats {
    private containerEl: HTMLElement;
    private stats: Stats;
    private viewMode: SidebarViewMode;
    private onOpenRandomNew: (() => void) | null = null;
    private onOpenRandomDue: (() => void) | null = null;
    private abortController: AbortController | null = null;

    constructor(
        containerEl: HTMLElement,
        stats: Stats,
        viewMode: SidebarViewMode,
        onOpenRandomNew?: () => void,
        onOpenRandomDue?: () => void,
    ) {
        this.containerEl = containerEl;
        this.stats = stats;
        this.viewMode = viewMode;
        this.onOpenRandomNew = onOpenRandomNew || null;
        this.onOpenRandomDue = onOpenRandomDue || null;
    }

    public render(): void {
        // Abort old listeners before clearing container
        if (this.abortController) {
            this.abortController.abort();
        }

        this.containerEl.empty();
        this.containerEl.addClass("sr-new-sidebar-stats");

        // Create new abort controller after aborting old one
        this.abortController = new AbortController();

        const dueLabel =
            this.viewMode === SidebarViewMode.FlashCards ? t("DUE_CARDS") : t("DUE_NOTES");
        const newLabel =
            this.viewMode === SidebarViewMode.FlashCards ? t("NEW_CARDS") : t("NEW_NOTES");

        this.createStatCard("sr-stat-due", this.stats.totalDue, dueLabel, this.onOpenRandomDue);
        this.createStatCard("sr-stat-new", this.stats.totalNew, newLabel, this.onOpenRandomNew);
    }

    public updateStats(stats: Stats, viewMode: SidebarViewMode): void {
        this.stats = stats;
        this.viewMode = viewMode;
        this.render();
    }

    public updateCallbacks(onOpenRandomNew?: () => void, onOpenRandomDue?: () => void): void {
        this.onOpenRandomNew = onOpenRandomNew || null;
        this.onOpenRandomDue = onOpenRandomDue || null;
    }

    public destroy(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    private createStatCard(
        className: string,
        value: number,
        label: string,
        onClick?: (() => void) | null,
    ): void {
        const card = this.containerEl.createDiv(`sr-stat-card ${className}`);

        // Make card clickable if onClick is provided and value > 0
        if (onClick && value > 0) {
            card.addClass("sr-stat-card-clickable");
            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");
            card.setAttribute("aria-label", `${label}: ${value}. Click to open random.`);

            if (this.abortController) {
                card.addEventListener("click", onClick, {
                    signal: this.abortController.signal,
                });

                // Add keyboard support
                card.addEventListener(
                    "keydown",
                    (e: KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onClick();
                        }
                    },
                    { signal: this.abortController.signal },
                );
            }
        }

        card.createDiv("sr-stat-number").setText(value.toString());
        card.createDiv("sr-stat-label").setText(label);
    }
}
