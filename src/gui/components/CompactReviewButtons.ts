/**
 * Compact Review Buttons Component
 *
 * Displays compact icon-based buttons for quick note review.
 */

import { setIcon } from "obsidian";
import { t } from "src/lang/helpers";
import { ReviewResponse } from "src/core/scheduling/scheduling";

export interface CompactReviewButtonsOptions {
    onReview: (response: ReviewResponse) => void;
    onToggle?: (collapsed: boolean) => void;
    initialCollapsed?: boolean;
    intervals?: { hard: string; good: string; easy: string }; // Preview intervals
    icons?: { hard: string; good: string; easy: string }; // Custom icons
}

// Configuration for review buttons, now with i18n keys and hotkey characters
const getButtonConfig = (icons?: { hard: string; good: string; easy: string }) =>
    ({
        [ReviewResponse.Hard]: {
            icon: icons?.hard || "x",
            labelKey: "REVIEW_HARD",
            className: "sr-compact-btn-hard",
        },
        [ReviewResponse.Good]: {
            icon: icons?.good || "minus",
            labelKey: "REVIEW_GOOD",
            className: "sr-compact-btn-good",
        },
        [ReviewResponse.Easy]: {
            icon: icons?.easy || "check",
            labelKey: "REVIEW_EASY",
            className: "sr-compact-btn-easy",
        },
    }) as const;

export class CompactReviewButtons {
    private containerEl: HTMLElement;
    private buttonsContainer!: HTMLElement;
    private toggleButton!: HTMLElement;
    private isCollapsed: boolean;
    private options: CompactReviewButtonsOptions;

    constructor(containerEl: HTMLElement, options: CompactReviewButtonsOptions) {
        this.containerEl = containerEl;
        this.options = options;
        this.isCollapsed = options.initialCollapsed ?? false;

        this.render();
    }

    private render(): void {
        if (!this.containerEl.isConnected) {
            console.warn("CompactReviewButtons: Container not in DOM, skipping render");
            return;
        }

        this.containerEl.empty();
        this.containerEl.addClass("sr-compact-review-container");

        this.toggleButton = this.containerEl.createDiv("sr-compact-review-toggle");
        this.toggleButton.addEventListener("click", () => this.toggle());
        this.updateToggleButton();

        this.buttonsContainer = this.containerEl.createDiv("sr-compact-review-buttons");
        if (this.isCollapsed) {
            this.buttonsContainer.addClass("sr-collapsed");
        }

        // Create buttons in order: Hard, Good, Easy
        const responses = [ReviewResponse.Hard, ReviewResponse.Good, ReviewResponse.Easy] as const;
        for (const response of responses) {
            const btn = this.createButton(response);
            this.buttonsContainer.appendChild(btn);
        }
    }

    private createButton(
        response: ReviewResponse.Hard | ReviewResponse.Good | ReviewResponse.Easy,
    ): HTMLButtonElement {
        const buttonConfig = getButtonConfig(this.options.icons);
        const config = buttonConfig[response];
        const button = document.createElement("button");
        button.addClass("sr-compact-btn", config.className);

        const label = t(config.labelKey);
        // const hotkey = config.hotkey;

        let tooltip: string;
        const intervalKey =
            response === ReviewResponse.Hard
                ? "hard"
                : response === ReviewResponse.Good
                  ? "good"
                  : "easy";
        const interval = this.options.intervals?.[intervalKey];

        if (interval) {
            tooltip = t("REVIEW_BUTTON_TOOLTIP_WITH_INTERVAL", { label, interval });
        } else {
            tooltip = t("REVIEW_BUTTON_TOOLTIP", { label });
        }

        button.setAttribute("aria-label", tooltip);
        button.setAttribute("title", tooltip);

        // Icon using Obsidian's setIcon
        const iconSpan = button.createSpan("sr-compact-btn-icon");
        setIcon(iconSpan, config.icon);

        // Click handler
        button.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleReview(response);
        });

        return button;
    }

    private updateToggleButton(): void {
        this.toggleButton.empty();

        const icon = this.toggleButton.createSpan("sr-compact-toggle-icon");
        if (this.isCollapsed) {
            setIcon(icon, "chevron-right");
            this.toggleButton.setAttribute("aria-label", t("SHOW_REVIEW_BUTTONS"));
        } else {
            setIcon(icon, "chevron-left");
            this.toggleButton.setAttribute("aria-label", t("HIDE_REVIEW_BUTTONS"));
        }
    }

    private toggle(): void {
        this.isCollapsed = !this.isCollapsed;

        if (this.isCollapsed) {
            this.buttonsContainer.addClass("sr-collapsed");
        } else {
            this.buttonsContainer.removeClass("sr-collapsed");
        }

        this.updateToggleButton();

        if (this.options.onToggle) {
            this.options.onToggle(this.isCollapsed);
        }
    }

    private handleReview(response: ReviewResponse): void {
        if (response === ReviewResponse.Reset) return;

        // Add visual feedback
        const buttonConfig = getButtonConfig(this.options.icons);
        const config =
            buttonConfig[
                response as ReviewResponse.Hard | ReviewResponse.Good | ReviewResponse.Easy
            ];
        if (!config) return;

        const button = this.buttonsContainer.querySelector<HTMLButtonElement>(
            `.${config.className}`,
        );

        if (button) {
            button.addClass("sr-compact-btn-clicked");
            // Animation duration is 300ms in CSS
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    button.removeClass("sr-compact-btn-clicked");
                });
            });
        }

        // Call the review handler
        this.options.onReview(response);
    }

    public show(): void {
        this.containerEl.removeClass("sr-hidden");
    }

    public hide(): void {
        this.containerEl.addClass("sr-hidden");
    }

    public setCollapsed(collapsed: boolean): void {
        if (this.isCollapsed !== collapsed) {
            this.toggle();
        }
    }

    public destroy(): void {
        this.containerEl.empty();
    }
}
