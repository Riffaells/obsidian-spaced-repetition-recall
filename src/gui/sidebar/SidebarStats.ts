import { t } from "src/lang/helpers";
import { SidebarStats as Stats } from "./types";

export class SidebarStats {
    private containerEl: HTMLElement;
    private stats: Stats;
    private onOpenRandomNew: (() => void) | null = null;
    private onOpenRandomDue: (() => void) | null = null;
    private abortController: AbortController | null = null;

    constructor(
        containerEl: HTMLElement,
        stats: Stats,
        onOpenRandomNew?: () => void,
        onOpenRandomDue?: () => void,
    ) {
        this.containerEl = containerEl;
        this.stats = stats;
        this.onOpenRandomNew = onOpenRandomNew || null;
        this.onOpenRandomDue = onOpenRandomDue || null;
    }

    public render(): void {
        this.containerEl.empty();
        this.containerEl.addClass("sr-new-sidebar-stats");

        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        this.createStatCard(
            "sr-stat-due",
            this.stats.totalDue,
            t("DUE_CARDS"),
            this.onOpenRandomDue,
        );
        this.createStatCard(
            "sr-stat-new",
            this.stats.totalNew,
            t("NEW_CARDS"),
            this.onOpenRandomNew,
        );
    }

    public updateStats(stats: Stats): void {
        this.stats = stats;
        this.render();
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
