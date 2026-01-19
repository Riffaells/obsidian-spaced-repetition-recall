import { SessionStats } from "../types";
import { ReviewResponse } from "src/core/scheduling/scheduling";

import { TopicPath } from "src/core/services/TopicPath";

/**
 * SessionView component for displaying session progress and statistics
 * Requirements: 14.2, 14.4
 */

export interface SessionViewConfig {
    showProgressBar?: boolean;
    showStatistics?: boolean;
    showScheduleInfo?: boolean;
    showCompletionSummary?: boolean;
    animateProgress?: boolean;
}

export const DEFAULT_SESSION_VIEW_CONFIG: SessionViewConfig = {
    showProgressBar: true,
    showStatistics: true,
    showScheduleInfo: true,
    showCompletionSummary: true,
    animateProgress: true,
};

export class SessionView {
    private viewContainer: HTMLElement;
    private container: HTMLElement;
    private config: SessionViewConfig;
    private stats: SessionStats;

    // UI Elements
    private progressBarContainer: HTMLElement | null = null;
    private progressBar: HTMLElement | null = null;
    private progressText: HTMLElement | null = null;
    private statisticsContainer: HTMLElement | null = null;
    private completionContainer: HTMLElement | null = null;

    constructor(
        viewContainer: HTMLElement,
        eventBus: any,
        services: any,
        config: SessionViewConfig = DEFAULT_SESSION_VIEW_CONFIG,
    ) {
        this.viewContainer = viewContainer;
        this.container = viewContainer.createDiv("sr-session-view-wrapper sr-is-hidden");
        this.stats = {
            cardsReviewed: 0,
            timeSpent: 0,
            responses: {
                [ReviewResponse.Easy]: 0,
                [ReviewResponse.Good]: 0,
                [ReviewResponse.Hard]: 0,
                [ReviewResponse.Reset]: 0,
            },
            deckName: "",
            deckPath: TopicPath.emptyPath,
            remainingCards: 0,
        };
        this.config = { ...DEFAULT_SESSION_VIEW_CONFIG, ...config };
    }

    show(): void {
        this.container.removeClass("sr-is-hidden");
    }

    hide(): void {
        this.container.addClass("sr-is-hidden");
    }

    displayStats(stats: SessionStats): void {
        this.stats = stats;
        this.render();
    }

    destroy(): void {
        this.container.remove();
    }

    /**
     * Render the session view
     * Requirements: 14.2
     */
    render(): void {
        this.container.empty();
        this.container.addClass("sr-session-view");

        if (this.config.showProgressBar) {
            this.renderProgressBar();
        }

        if (this.config.showStatistics) {
            this.renderStatistics();
        }

        if (this.config.showScheduleInfo) {
            this.renderScheduleInfo();
        }

        if (this.config.showCompletionSummary && this.isSessionComplete()) {
            this.renderCompletionSummary();
        }
    }

    /**
     * Render progress bar
     * Requirements: 14.2 - Property 39: Session Progress Visualization
     */
    private renderProgressBar(): void {
        this.progressBarContainer = this.container.createDiv("sr-progress-container");

        // Progress bar
        const progressBarWrapper = this.progressBarContainer.createDiv("sr-progress-bar-wrapper");
        this.progressBar = progressBarWrapper.createDiv("sr-progress-bar");

        // Calculate progress percentage
        const totalCards = this.stats.cardsReviewed + this.stats.remainingCards;
        const progressPercent = totalCards > 0 ? (this.stats.cardsReviewed / totalCards) * 100 : 0;

        // Ensure progress is a valid number
        const safeProgress = isNaN(progressPercent) ? 0 : progressPercent;
        this.progressBar.style.width = `${safeProgress}%`;

        if (this.config.animateProgress) {
            this.progressBar.addClass("sr-progress-animated");
        }

        // Progress text
        this.progressText = this.progressBarContainer.createDiv("sr-progress-text");
        this.progressText.setText(
            `${this.stats.cardsReviewed} / ${totalCards} cards reviewed (${Math.round(safeProgress)}%)`,
        );
    }

    /**
     * Render session statistics
     * Requirements: 14.2 - Display session statistics
     */
    private renderStatistics(): void {
        this.statisticsContainer = this.container.createDiv("sr-statistics-container");

        // Time spent
        const timeSpent = this.formatTime(this.stats.timeSpent);
        const timeEl = this.statisticsContainer.createDiv("sr-stat-item");
        timeEl.createSpan({ cls: "sr-stat-label", text: "Time spent: " });
        timeEl.createSpan({ cls: "sr-stat-value", text: timeSpent });

        // Cards reviewed
        const cardsEl = this.statisticsContainer.createDiv("sr-stat-item");
        cardsEl.createSpan({ cls: "sr-stat-label", text: "Cards reviewed: " });
        cardsEl.createSpan({ cls: "sr-stat-value", text: this.stats.cardsReviewed.toString() });

        // Remaining cards
        const remainingEl = this.statisticsContainer.createDiv("sr-stat-item");
        remainingEl.createSpan({ cls: "sr-stat-label", text: "Remaining: " });
        remainingEl.createSpan({
            cls: "sr-stat-value",
            text: this.stats.remainingCards.toString(),
        });

        // Response breakdown
        this.renderResponseBreakdown();
    }

    /**
     * Render response breakdown
     * Requirements: 14.2 - Show response distribution
     */
    private renderResponseBreakdown(): void {
        if (!this.statisticsContainer) return;

        const breakdownContainer = this.statisticsContainer.createDiv("sr-response-breakdown");
        breakdownContainer.createEl("h4", { text: "Response Distribution" });

        const responses = [
            { type: ReviewResponse.Easy, label: "Easy", class: "sr-response-easy" },
            { type: ReviewResponse.Good, label: "Good", class: "sr-response-good" },
            { type: ReviewResponse.Hard, label: "Hard", class: "sr-response-hard" },
            { type: ReviewResponse.Reset, label: "Reset", class: "sr-response-reset" },
        ];

        responses.forEach(({ type, label, class: className }) => {
            const count = this.stats.responses[type] || 0;
            if (count > 0) {
                const item = breakdownContainer.createDiv("sr-response-item");
                item.addClass(className);
                item.createSpan({ cls: "sr-response-label", text: `${label}: ` });
                item.createSpan({ cls: "sr-response-count", text: count.toString() });
            }
        });
    }

    /**
     * Render schedule information
     * Requirements: 14.3 - Property 40: Card Schedule Information Display
     */
    private renderScheduleInfo(): void {
        const scheduleContainer = this.container.createDiv("sr-schedule-info");
        scheduleContainer.createEl("h4", { text: "Next Review Schedule" });

        // Calculate average response
        const totalResponses = Object.values(this.stats.responses).reduce((a, b) => a + b, 0);
        if (totalResponses > 0) {
            const easyCount = this.stats.responses[ReviewResponse.Easy] || 0;
            const goodCount = this.stats.responses[ReviewResponse.Good] || 0;
            const hardCount = this.stats.responses[ReviewResponse.Hard] || 0;

            const avgQuality = (easyCount * 3 + goodCount * 2 + hardCount * 1) / totalResponses;

            let scheduleText = "";
            if (avgQuality >= 2.5) {
                scheduleText = "Most cards scheduled for review in 3-7 days";
            } else if (avgQuality >= 1.5) {
                scheduleText = "Most cards scheduled for review in 1-3 days";
            } else {
                scheduleText = "Most cards scheduled for review within 1 day";
            }

            scheduleContainer.createDiv("sr-schedule-text").setText(scheduleText);
        } else {
            // Handle case with no responses - still show schedule info
            scheduleContainer.createDiv("sr-schedule-text").setText("No reviews completed yet");
        }
    }

    /**
     * Render completion summary
     * Requirements: 14.4 - Property 41: Session Completion Summary
     */
    private renderCompletionSummary(): void {
        this.completionContainer = this.container.createDiv("sr-completion-summary");
        this.completionContainer.addClass("sr-completion-animated");

        // Completion icon
        this.completionContainer.createDiv("sr-completion-icon").setText("✓");

        // Completion message
        const message = this.completionContainer.createEl("h2", {
            text: "Session Complete!",
            cls: "sr-completion-title",
        });

        // Summary stats
        const summaryStats = this.completionContainer.createDiv("sr-completion-stats");

        summaryStats
            .createDiv("sr-completion-stat")
            .setText(
                `Reviewed ${this.stats.cardsReviewed} cards in ${this.formatTime(this.stats.timeSpent)}`,
            );

        // Accuracy/performance indicator
        const totalResponses = Object.values(this.stats.responses).reduce((a, b) => a + b, 0);
        if (totalResponses > 0) {
            const easyCount = this.stats.responses[ReviewResponse.Easy] || 0;
            const goodCount = this.stats.responses[ReviewResponse.Good] || 0;
            const successRate = ((easyCount + goodCount) / totalResponses) * 100;

            summaryStats
                .createDiv("sr-completion-stat")
                .setText(`Success rate: ${Math.round(successRate)}%`);
        }

        // Link to statistics (Requirement 14.5 - Property 42)
        this.renderStatisticsLink();
    }

    /**
     * Render link to full statistics
     * Requirements: 14.5 - Property 42: Statistics Link Provision
     */
    private renderStatisticsLink(): void {
        if (!this.completionContainer) return;

        const linkContainer = this.completionContainer.createDiv("sr-stats-link-container");
        const link = linkContainer.createEl("a", {
            text: "View detailed statistics →",
            cls: "sr-stats-link",
            attr: { href: "#" },
        });

        link.addEventListener("click", (e) => {
            e.preventDefault();
            this.onStatisticsLinkClick();
        });
    }

    /**
     * Handle statistics link click
     * This should be overridden or connected to actual statistics view
     */
    private onStatisticsLinkClick(): void {
        // Emit event for parent to handle
        this.container.dispatchEvent(
            new CustomEvent("sr-view-statistics", {
                detail: { stats: this.stats },
                bubbles: true,
            }),
        );
    }

    /**
     * Update session statistics
     * Requirements: 14.2 - Update display when stats change
     */
    updateStats(stats: SessionStats): void {
        this.stats = stats;
        this.render();
    }

    /**
     * Update progress bar only (for performance)
     */
    updateProgress(): void {
        if (!this.progressBar || !this.progressText) return;

        const totalCards = this.stats.cardsReviewed + this.stats.remainingCards;
        const progressPercent = totalCards > 0 ? (this.stats.cardsReviewed / totalCards) * 100 : 0;

        // Ensure progress is a valid number
        const safeProgress = isNaN(progressPercent) ? 0 : progressPercent;
        this.progressBar.style.width = `${safeProgress}%`;
        this.progressText.setText(
            `${this.stats.cardsReviewed} / ${totalCards} cards reviewed (${Math.round(safeProgress)}%)`,
        );
    }

    /**
     * Check if session is complete
     */
    private isSessionComplete(): boolean {
        return this.stats.remainingCards === 0 && this.stats.cardsReviewed > 0;
    }

    /**
     * Format time in milliseconds to human-readable string
     */
    private formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else if (seconds > 0) {
            return `${seconds}s`;
        } else {
            return "0s"; // Handle 0 time explicitly
        }
    }

    /**
     * Clear the session view
     */
    clear(): void {
        this.container.empty();
        this.progressBarContainer = null;
        this.progressBar = null;
        this.progressText = null;
        this.statisticsContainer = null;
        this.completionContainer = null;
    }

    /**
     * Get current configuration
     */
    getConfig(): SessionViewConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<SessionViewConfig>): void {
        this.config = { ...this.config, ...config };
        this.render();
    }
}
