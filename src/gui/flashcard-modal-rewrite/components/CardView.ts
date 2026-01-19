import { App, setIcon } from "obsidian";
import { Card } from "src/core/models/Card";
import { ReviewResponse } from "src/core/scheduling/scheduling";
import { TopicPath } from "src/core/services/TopicPath";
import { t } from "src/lang/helpers";
import { IMarkdownRenderer } from "../types";
import { TextDirection } from "src/utils/TextDirection";

export interface ICardView {
    renderFront(card: Card): Promise<void>;
    renderBack(card: Card): Promise<void>;
    show(): void;
    hide(): void;
    showReviewButtons(intervals: number[]): void;
    setButtonLabels(labels: { easy: string; good: string; hard: string }): void;
    setContextVisibility(visible: boolean): void;
    renderBreadcrumb(deckPath: TopicPath): void;
    updateNavigationControls(hasPrev: boolean, hasNext: boolean): void;
    updateDeckInfo(deckName: string, deckPath: TopicPath): void;
    updateStats(reviewed: number, total: number): void;
    onShowAnswer(callback: () => void): void;
    onReviewSubmit(callback: (response: ReviewResponse) => void): void;
    onSkip(callback: () => void): void;
    onEdit(callback: () => void): void;
    onOpenSource(callback: () => void): void;
    onDeckNavigate(callback: (direction: "prev" | "next") => void): void;
    onBreadcrumbClick(callback: (deckPath: TopicPath) => void): void;
    onFullscreenToggle(callback: () => void): void;
    onInfo(callback: () => void): void;
    onBack(callback: () => void): void;
    getFullscreenButton(): HTMLButtonElement;
    destroy(): void;
}

export class CardView implements ICardView {
    private app: App;
    private contentEl: HTMLElement;
    private markdownRenderer: IMarkdownRenderer;

    // DOM elements
    private view: HTMLDivElement;
    private header: HTMLDivElement;
    private title: HTMLDivElement;
    private controls: HTMLDivElement;
    private breadcrumbContainer: HTMLDivElement;
    private navigationControls: HTMLDivElement;
    private deckInfo: HTMLDivElement;
    private context: HTMLDivElement;
    private content: HTMLDivElement;
    private responseContainer: HTMLDivElement;
    private reviewButtonsContainer: HTMLDivElement;
    private liveRegion: HTMLDivElement;

    // Control buttons
    private backButton: HTMLButtonElement;
    private editButton: HTMLButtonElement;
    private infoButton: HTMLButtonElement;
    private openSourceButton: HTMLButtonElement;
    private skipButton: HTMLButtonElement;
    private fullscreenButton: HTMLButtonElement;

    // Navigation buttons
    private prevDeckButton: HTMLButtonElement;
    private nextDeckButton: HTMLButtonElement;

    // Response buttons
    private showAnswerButton: HTMLButtonElement;
    private resetButton: HTMLButtonElement;
    private hardButton: HTMLButtonElement;
    private goodButton: HTMLButtonElement;
    private easyButton: HTMLButtonElement;

    // Callbacks
    private showAnswerCallback: () => void;
    private reviewSubmitCallback: (response: ReviewResponse) => void;
    private skipCallback: () => void;
    private editCallback: () => void;
    private openSourceCallback: () => void;
    private deckNavigateCallback: (direction: "prev" | "next") => void;
    private breadcrumbClickCallback: (deckPath: TopicPath) => void;
    private fullscreenToggleCallback: () => void;
    private infoCallback: () => void;
    private backCallback: () => void;

    // State
    private currentCard: Card;
    private buttonLabels: { easy: string; good: string; hard: string } = {
        easy: "Easy",
        good: "Good",
        hard: "Hard",
    };
    private currentDeckName: string = "";

    constructor(app: App, contentEl: HTMLElement, markdownRenderer: IMarkdownRenderer) {
        this.app = app;
        this.contentEl = contentEl;
        this.markdownRenderer = markdownRenderer;
        this.init();
    }

    private init(): void {
        this.view = this.contentEl.createDiv();
        this.view.addClasses(["sr-card-view", "sr-is-hidden"]);
        this.view.setAttribute("role", "region");
        this.view.setAttribute("aria-label", "Flashcard Review");

        this.createHeader();

        this.context = this.view.createDiv();
        this.context.addClass("sr-context");
        this.context.addClass("sr-hidden");

        this.content = this.view.createDiv();
        this.content.addClasses(["sr-content", "markdown-rendered", "markdown-preview-view"]);

        this.createResponseControls();

        this.liveRegion = this.view.createDiv({
            cls: "sr-aria-live",
            attr: { "aria-live": "polite", role: "status" },
        });

        this.breadcrumbContainer = this.view.createDiv();
        this.breadcrumbContainer.addClass("sr-breadcrumb-container");

        this.deckInfo = this.view.createDiv();
        this.deckInfo.addClass("sr-deck-info");
    }

    private createHeader(): void {
        this.header = this.view.createDiv();
        this.header.addClass("sr-header");

        // Back button (left side)
        this.backButton = this.header.createEl("button");
        this.backButton.addClass("sr-back-button");
        setIcon(this.backButton, "arrow-left");
        this.backButton.setAttribute("aria-label", t("BACK") || "Back");
        this.backButton.addEventListener("click", () => {
            if (this.backCallback) this.backCallback();
        });

        this.title = this.header.createDiv();
        this.title.addClass("sr-title");

        this.controls = this.header.createDiv();
        this.controls.addClass("sr-controls");

        this.infoButton = this.controls.createEl("button");
        setIcon(this.infoButton, "info");
        this.infoButton.setAttribute("aria-label", "Card Info");
        this.infoButton.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.infoCallback) this.infoCallback();
        });

        this.editButton = this.controls.createEl("button");
        setIcon(this.editButton, "edit");
        this.editButton.setAttribute("aria-label", t("EDIT_CARD") || "Edit Card");
        this.editButton.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.editCallback) this.editCallback();
        });

        this.openSourceButton = this.controls.createEl("button");
        setIcon(this.openSourceButton, "file-edit");
        this.openSourceButton.setAttribute("aria-label", t("OPEN_NOTE") || "Open Note");
        this.openSourceButton.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.openSourceCallback) this.openSourceCallback();
        });

        this.skipButton = this.controls.createEl("button");
        setIcon(this.skipButton, "skip-forward");
        this.skipButton.setAttribute("aria-label", "Skip Card");
        this.skipButton.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.skipCallback) this.skipCallback();
        });

        this.fullscreenButton = this.controls.createEl("button");
        setIcon(this.fullscreenButton, "maximize");
        this.fullscreenButton.setAttribute("aria-label", "Toggle Fullscreen");
        this.fullscreenButton.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.fullscreenToggleCallback) this.fullscreenToggleCallback();
        });

        // Navigation controls for multi-deck (initially hidden)
        this.navigationControls = this.header.createDiv();
        this.navigationControls.addClasses(["sr-navigation-controls", "sr-is-hidden"]);

        this.prevDeckButton = this.navigationControls.createEl("button");
        setIcon(this.prevDeckButton, "chevron-left");
        this.prevDeckButton.setAttribute("aria-label", t("PREVIOUS_CARD") || "Previous Card");
        this.prevDeckButton.disabled = true;
        this.prevDeckButton.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.deckNavigateCallback) this.deckNavigateCallback("prev");
        });

        this.nextDeckButton = this.navigationControls.createEl("button");
        setIcon(this.nextDeckButton, "chevron-right");
        this.nextDeckButton.setAttribute("aria-label", t("NEXT_CARD") || "Next Card");
        this.nextDeckButton.disabled = true;
        this.nextDeckButton.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.deckNavigateCallback) this.deckNavigateCallback("next");
        });
    }

    private createResponseControls(): void {
        this.responseContainer = this.view.createDiv();
        this.responseContainer.addClass("sr-response-container");

        this.showAnswerButton = this.responseContainer.createEl("button");
        this.showAnswerButton.addClass("sr-show-answer-btn");
        this.showAnswerButton.setText(t("SHOW_ANSWER") || "Show Answer");
        this.showAnswerButton.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.showAnswerCallback) this.showAnswerCallback();
        });

        this.reviewButtonsContainer = this.responseContainer.createDiv();
        this.reviewButtonsContainer.addClasses(["sr-review-buttons", "sr-is-hidden"]);

        this.hardButton = this.createReviewButton(
            this.reviewButtonsContainer,
            "sr-hard",
            this.buttonLabels.hard,
            ReviewResponse.Hard,
        );
        this.goodButton = this.createReviewButton(
            this.reviewButtonsContainer,
            "sr-good",
            this.buttonLabels.good,
            ReviewResponse.Good,
        );
        this.easyButton = this.createReviewButton(
            this.reviewButtonsContainer,
            "sr-easy",
            this.buttonLabels.easy,
            ReviewResponse.Easy,
        );

        this.resetButton = this.responseContainer.createEl("button");
        this.resetButton.addClasses(["sr-skip-btn", "sr-is-hidden"]);
        this.resetButton.setText(t("RESET_CARD_PROGRESS") || "Reset Progress");
        this.resetButton.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.reviewSubmitCallback) this.reviewSubmitCallback(ReviewResponse.Reset);
        });
    }

    private createReviewButton(
        container: HTMLElement,
        cls: string,
        text: string,
        response: ReviewResponse,
    ): HTMLButtonElement {
        const btn = container.createEl("button");
        btn.addClasses(["sr-review-btn", cls]);
        const label = btn.createDiv("sr-review-btn-label");
        label.setText(text);
        btn.createDiv("sr-review-btn-interval"); // Placeholder for interval
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.reviewSubmitCallback) this.reviewSubmitCallback(response);
        });
        return btn;
    }

    async renderFront(card: Card): Promise<void> {
        this.currentCard = card;
        this.content.empty();

        if (this.markdownRenderer.setNotePath) {
            this.markdownRenderer.setNotePath(card.question?.note?.filePath || "");
        }

        const textDirection = this.getTextDirection(card);
        const frontContent = this.getFrontContent(card);
        await this.markdownRenderer.render(frontContent, this.content, textDirection);

        this.content.scrollTop = 0;

        this.showAnswerButton.removeClass("sr-is-hidden");
        this.reviewButtonsContainer.addClass("sr-is-hidden");
        this.resetButton.addClass("sr-is-hidden");

        this.updateContext(card);
        this.announce("New flashcard question: " + card.front);
    }

    async renderBack(card: Card): Promise<void> {
        this.currentCard = card;
        if (this.markdownRenderer.setNotePath) {
            this.markdownRenderer.setNotePath(card.question?.note?.filePath || "");
        }

        if (card.question.questionType !== 0) {
            // 0 is Cloze
            this.content.createEl("hr").addClass("sr-card-divide");
        } else {
            this.content.empty();
        }

        const textDirection = this.getTextDirection(card);
        await this.markdownRenderer.render(card.back, this.content, textDirection);

        this.showAnswerButton.addClass("sr-is-hidden");
        this.reviewButtonsContainer.removeClass("sr-is-hidden");
        this.resetButton.removeClass("sr-is-hidden");

        this.announce("Answer: " + card.back, "assertive");
    }

    show(): void {
        this.view.removeClass("sr-is-hidden");
    }

    hide(): void {
        this.view.addClass("sr-is-hidden");
    }

    showReviewButtons(intervals: number[]): void {
        const setBtnText = (btn: HTMLButtonElement, label: string, intervalIdx: number) => {
            const labelEl = btn.querySelector(".sr-review-btn-label");
            const intervalEl = btn.querySelector(".sr-review-btn-interval");
            if (labelEl) labelEl.setText(label);
            if (intervalEl && intervals && intervals.length > intervalIdx) {
                intervalEl.setText(this.formatInterval(intervals[intervalIdx]));
            } else if (intervalEl) {
                intervalEl.setText("");
            }
        };

        setBtnText(this.hardButton, this.buttonLabels.hard, 1);
        setBtnText(this.goodButton, this.buttonLabels.good, 2);
        setBtnText(this.easyButton, this.buttonLabels.easy, 3);
    }

    setButtonLabels(labels: { easy: string; good: string; hard: string }): void {
        this.buttonLabels = labels;
        // Buttons will update on next render or showReviewButtons call
        // But if visible, update now (without intervals if we don't have them handy,
        // usually showReviewButtons is called right after renderBack)
        const updateLabel = (btn: HTMLButtonElement, text: string) => {
            const labelEl = btn.querySelector(".sr-review-btn-label");
            if (labelEl) labelEl.setText(text);
        };
        updateLabel(this.hardButton, labels.hard);
        updateLabel(this.goodButton, labels.good);
        updateLabel(this.easyButton, labels.easy);
    }

    setContextVisibility(visible: boolean): void {
        if (visible && this.context.textContent) {
            this.context.removeClass("sr-is-hidden");
        } else {
            this.context.addClass("sr-is-hidden");
        }
    }

    renderBreadcrumb(deckPath: TopicPath): void {
        this.breadcrumbContainer.empty();
        if (!deckPath || deckPath.path.length === 0) return;

        deckPath.path.forEach((segment, i) => {
            if (i > 0) this.breadcrumbContainer.createSpan().setText(" > ");
            const link = this.breadcrumbContainer.createEl("a");
            link.setText(segment);
            link.style.cursor = "pointer";
            link.addEventListener("click", (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (this.breadcrumbClickCallback) {
                    this.breadcrumbClickCallback(new TopicPath(deckPath.path.slice(0, i + 1)));
                }
            });
        });
    }

    updateNavigationControls(hasPrev: boolean, hasNext: boolean): void {
        this.prevDeckButton.disabled = !hasPrev;
        this.nextDeckButton.disabled = !hasNext;
        this.navigationControls.removeClass("sr-is-hidden");
    }

    updateDeckInfo(deckName: string, deckPath: TopicPath): void {
        this.currentDeckName = deckName;
        // Keep title updated with just name for now, updateStats will add numbers
        this.title.setText(deckName);

        this.deckInfo.empty();
        if (!deckName) {
            this.deckInfo.addClass("sr-is-hidden");
            return;
        }
        this.deckInfo.removeClass("sr-is-hidden");
        const badge = this.deckInfo.createDiv("sr-deck-badge");
        setIcon(badge.createSpan("sr-deck-icon"), "folder");
        badge.createSpan("sr-deck-label").setText(deckName);
    }

    updateStats(reviewed: number, total: number): void {
        if (this.currentDeckName) {
            this.title.setText(`${this.currentDeckName}: ${total} (${reviewed} reviewed)`);
        }
    }

    onShowAnswer(callback: () => void): void {
        this.showAnswerCallback = callback;
    }
    onReviewSubmit(callback: (response: ReviewResponse) => void): void {
        this.reviewSubmitCallback = callback;
    }
    onSkip(callback: () => void): void {
        this.skipCallback = callback;
    }
    onEdit(callback: () => void): void {
        this.editCallback = callback;
    }
    onOpenSource(callback: () => void): void {
        this.openSourceCallback = callback;
    }
    onDeckNavigate(callback: (direction: "prev" | "next") => void): void {
        this.deckNavigateCallback = callback;
    }
    onBreadcrumbClick(callback: (deckPath: TopicPath) => void): void {
        this.breadcrumbClickCallback = callback;
    }
    onFullscreenToggle(callback: () => void): void {
        this.fullscreenToggleCallback = callback;
    }
    onInfo(callback: () => void): void {
        this.infoCallback = callback;
    }
    onBack(callback: () => void): void {
        this.backCallback = callback;
    }

    getFullscreenButton(): HTMLButtonElement {
        return this.fullscreenButton;
    }

    destroy(): void {
        this.view.remove();
    }

    private getFrontContent(card: Card): string {
        let frontContent = card.front;
        if (card.question.isHeaderBased) {
            let level = card.question.parsedFlashcard?.metadata?.headingLevel as number;

            // Fallback for legacy data: try to extract level from original question text
            if (!level && card.question.questionText?.original) {
                const match = card.question.questionText.original.match(/^(#{1,6})\s+/);
                if (match) {
                    level = match[1].length;
                }
            }

            // Final fallback
            level = level || 1;

            frontContent = `${"#".repeat(level)} ${frontContent}`;
        }
        return frontContent;
    }

    private announce(text: string, priority: "polite" | "assertive" = "polite"): void {
        if (this.liveRegion) {
            this.liveRegion.setAttribute("aria-live", priority);
            this.liveRegion.setText(text);
        }
    }

    private getTextDirection(card: Card): string {
        const direction = card.question?.questionText?.textDirection;
        if (direction === TextDirection.Rtl) return "rtl";
        if (direction === TextDirection.Ltr) return "ltr";
        return "auto";
    }

    private updateContext(card: Card): void {
        this.context.empty();
        const question = card.question;
        const note = question.note;
        let contextText = note?.file?.basename || "";

        if (question.isHeaderBased) {
            const ctx = question.getDisplayContext();
            if (ctx) contextText += " > " + ctx;
        }

        if (question.questionContext && question.questionContext.length > 0) {
            question.questionContext.forEach((ctx) => {
                let clean = ctx;
                if (clean.startsWith("[[") && clean.endsWith("]]")) {
                    clean = clean.slice(2, -2).split("|")[1] || clean.slice(2, -2);
                }
                contextText += " > " + clean;
            });
        }

        if (contextText) {
            this.context.setText(contextText);
        }
    }

    private formatInterval(days: number): string {
        if (days < 1) return "< 1d";
        if (days < 30) return `${Math.round(days)}d`;
        if (days < 365) return `${Math.round(days / 30)}mo`;
        return `${Math.round(days / 365)}yr`;
    }
}
