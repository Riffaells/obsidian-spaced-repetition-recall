import { t } from "src/lang/helpers";
import { SidebarStats as Stats } from "./types";

export class SidebarStats {
    private containerEl: HTMLElement;
    private stats: Stats;

    constructor(containerEl: HTMLElement, stats: Stats) {
        this.containerEl = containerEl;
        this.stats = stats;
    }

    public render(): void {
        this.containerEl.empty();
        this.containerEl.addClass("sr-new-sidebar-stats");

        this.createStatCard("sr-stat-due", this.stats.totalDue, t("DUE_CARDS"));
        this.createStatCard("sr-stat-new", this.stats.totalNew, t("NEW_CARDS"));
    }

    public updateStats(stats: Stats): void {
        this.stats = stats;
        this.render();
    }

    private createStatCard(className: string, value: number, label: string): void {
        const card = this.containerEl.createDiv(`sr-stat-card ${className}`);
        card.createDiv("sr-stat-number").setText(value.toString());
        card.createDiv("sr-stat-label").setText(label);
    }
}
