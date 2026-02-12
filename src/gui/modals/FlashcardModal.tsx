import { App, Modal, Notice } from "obsidian";
import type SRPlugin from "src/main";
import { SRSettings } from "src/settings/settings";
import { FlashcardReviewMode } from "src/core/scheduling/FlashcardReviewMode";
import { IFlashcardReviewSequencer } from "src/core/scheduling/FlashcardReviewSequencer";
import { RenderMarkdownWrapper } from "src/utils/RenderMarkdownWrapper";
import { ItemInfoModal } from "../utils/info";
import { SrTFile } from "src/core/services/SRFile";
import { t } from "src/lang/helpers";
import { textInterval } from "src/core/scheduling/scheduling";
import { TextDirection } from "src/utils/TextDirection";

// New Rewrite Imports
import { ModalController } from "../flashcard-modal-rewrite/ModalController";
import { EventBus } from "../flashcard-modal-rewrite/utils/EventBus";
import { ServiceContainer } from "../flashcard-modal-rewrite/services/ServiceContainer";
import { CardView } from "../flashcard-modal-rewrite/components/CardView";
import { DeckView } from "../flashcard-modal-rewrite/components/DeckView";
import { SessionView } from "../flashcard-modal-rewrite/components/SessionView";
import { ModalState, IMarkdownRenderer, ReviewResponse } from "../flashcard-modal-rewrite/types";
import { ErrorLogger } from "../flashcard-modal-rewrite/services/ErrorLogger";

export enum FlashcardMode {
    Deck,
    Front,
    Back,
    Closed,
}

export class FlashcardModal extends Modal {
    public plugin: SRPlugin;
    private reviewSequencer: IFlashcardReviewSequencer;
    private settings: SRSettings;
    private reviewMode: FlashcardReviewMode;

    // Rewrite Components
    private controller: ModalController;
    private eventBus: EventBus;
    private services: ServiceContainer;
    private cardView: CardView;
    private deckView: DeckView;
    private sessionView: SessionView;
    
    // Optimization: track if views are initialized
    private viewsInitialized: boolean = false;

    constructor(
        app: App,
        plugin: SRPlugin,
        settings: SRSettings,
        reviewSequencer: IFlashcardReviewSequencer,
        reviewMode: FlashcardReviewMode,
    ) {
        super(app);
        this.plugin = plugin;
        this.settings = settings;
        this.reviewSequencer = reviewSequencer;
        this.reviewMode = reviewMode;

        this.setupModalStyles();
    }

    private setupModalStyles(): void {
        const heightPercent = `${this.settings.flashcardHeightPercentage}%`;
        const widthPercent = `${this.settings.flashcardWidthPercentage}%`;

        // Use setProperty with 'important' to override Obsidian's default modal styles
        this.modalEl.style.setProperty("height", heightPercent, "important");
        this.modalEl.style.setProperty("max-height", heightPercent, "important");
        this.modalEl.style.setProperty("width", widthPercent, "important");
        this.modalEl.style.setProperty("max-width", widthPercent, "important");
        this.modalEl.setAttribute("id", "sr-modal");
        this.modalEl.addClass("sr-flashcard-modal");
        this.contentEl.addClass("sr-modal-content");
    }

    /**
     * Update review session parameters for modal reuse
     * Optimization: allows reusing the same modal instance with different review sessions
     */
    updateReviewSession(
        reviewSequencer: IFlashcardReviewSequencer,
        reviewMode: FlashcardReviewMode,
    ): void {
        this.reviewSequencer = reviewSequencer;
        this.reviewMode = reviewMode;
        
        // Update services if already initialized
        if (this.viewsInitialized && this.services) {
            this.services.register("reviewSequencer", reviewSequencer);
        }
    }

    onOpen(): void {
        // Optimization: only initialize views once, reuse on subsequent opens
        if (!this.viewsInitialized) {
            this.initializeSystem();
            this.setupViews();
            this.bindEvents();
            this.viewsInitialized = true;
        } else {
            // Just update the sequencer and reopen
            this.services.register("reviewSequencer", this.reviewSequencer);
        }

        const options: any = { mode: this.reviewMode };
        if (this.reviewSequencer.currentDeck) {
            options.deckPath = this.reviewSequencer.currentDeck.getTopicPath();
        }

        this.controller.open(options);
        this.plugin.setSRViewInFocus(true);
    }

    onClose(): void {
        this.plugin.setSRViewInFocus(false);
        if (this.controller) {
            this.controller.close();
        }
        // Optimization: don't destroy views, just hide them for reuse
        // Views will be destroyed when modal is completely disposed
    }

    private initializeSystem(): void {
        this.eventBus = new EventBus();
        this.services = new ServiceContainer();

        this.services.register("reviewSequencer", this.reviewSequencer);
        this.services.register("settings", this.settings);
        this.services.register("plugin", this.plugin);
        this.services.register("errorLogger", ErrorLogger.getInstance());

        this.controller = new ModalController(this.app, this.eventBus, this.services);
        this.plugin.setSRViewInFocus(true);
    }

    private setupViews(): void {
        // Optimization: only clear and create views if not already initialized
        if (!this.deckView) {
            this.contentEl.empty();

            this.deckView = new DeckView(this.contentEl);

            const rendererAdapter = new MarkdownRendererAdapter(this.app, this.plugin);
            this.cardView = new CardView(this.app, this.contentEl, rendererAdapter);

            this.sessionView = new SessionView(this.contentEl, this.eventBus, this.services);
        }

        this.controller.initializeFullscreenToggle(
            this.modalEl,
            this.cardView.getFullscreenButton(),
        );
        this.controller.initializeCustomization(this.modalEl);
        const labels = this.controller.getCustomButtonLabels();
        this.cardView.setButtonLabels(labels);
        this.cardView.setContextVisibility(this.controller.shouldShowContext());
    }

    private bindEvents(): void {
        this.deckView.onDeckSelected((deck) => {
            this.controller.startReview(deck.getTopicPath());
        });

        this.cardView.onShowAnswer(() => this.controller.showAnswer());
        this.cardView.onReviewSubmit((response) => this.controller.submitReview(response));
        this.cardView.onSkip(() => this.controller.skipCard());
        this.cardView.onEdit(() => this.controller.editCard());
        this.cardView.onOpenSource(() => this.controller.openSourceNote());
        this.cardView.onDeckNavigate((dir) => this.controller.navigateToDeck(dir));
        this.cardView.onBreadcrumbClick((path) => this.controller.navigateToBreadcrumb(path));
        this.cardView.onFullscreenToggle(() => this.controller.toggleFullscreen());
        this.cardView.onBack(() => this.controller.returnToDeckList());
        this.cardView.onInfo(() => this.showCardInfo());

        this.eventBus.on(
            "state-changed",
            (data: { from: ModalState; to: ModalState; context?: any }) => {
                this.handleStateChange(data.to, data.context);
            },
        );

        this.eventBus.on("card-reviewed", (data: any) => {
            const stats = this.controller.getSessionStats();
            this.cardView.updateStats(
                stats.cardsReviewed,
                stats.cardsReviewed + stats.remainingCards,
            );
            this.sessionView.updateStats(stats);
        });

        this.eventBus.on("deck-navigated", () => {
            this.refreshCardView();
        });

        this.eventBus.on("card-edited", () => {
            this.refreshCardView();
        });

        this.eventBus.on("fullscreen-changed", (data: { isFullscreen: boolean }) => {});
    }

    private handleStateChange(state: ModalState, context?: any): void {
        this.deckView.hide();
        this.cardView.hide();
        this.sessionView.hide();

        switch (state) {
            case ModalState.DECK_SELECTION:
                this.deckView.show();
                if (this.reviewSequencer.originalDeckTree) {
                    this.deckView.render([this.reviewSequencer.originalDeckTree], (deck) => {
                        const s = this.reviewSequencer.getDeckStats(deck.getTopicPath());
                        return {
                            dueCount: s.dueCount,
                            newCount: s.newCount,
                            totalCount: s.totalCount,
                        };
                    });
                }
                break;

            case ModalState.CARD_FRONT:
                this.cardView.show();
                this.refreshCardView();
                this.cardView.renderFront(this.reviewSequencer.currentCard);
                break;

            case ModalState.CARD_BACK:
                this.cardView.show();
                this.cardView.renderBack(this.reviewSequencer.currentCard);
                this.updateCardIntervals();
                break;

            case ModalState.SESSION_COMPLETE:
                this.sessionView.show();
                this.sessionView.displayStats(this.controller.getSessionStats());
                break;

            case ModalState.CLOSED:
                this.close();
                break;
        }
    }

    private refreshCardView(): void {
        const card = this.reviewSequencer.currentCard;
        const deck = this.reviewSequencer.currentDeck;
        if (deck) {
            this.cardView.updateDeckInfo(deck.deckName, deck.getTopicPath());
            this.cardView.renderBreadcrumb(deck.getTopicPath());
        }

        this.cardView.updateNavigationControls(
            this.controller.canNavigatePrevDeck(),
            this.controller.canNavigateNextDeck(),
        );

        const stats = this.controller.getSessionStats();
        this.cardView.updateStats(stats.cardsReviewed, stats.cardsReviewed + stats.remainingCards);
    }

    private updateCardIntervals(): void {
        try {
            const card = this.reviewSequencer.currentCard;
            if (!card) return;
            const cardItem = this.plugin.store.getItembyID(card.Id);
            if (cardItem) {
                const intervals = this.plugin.algorithm.calcAllOptsIntervals(cardItem);
                this.cardView.showReviewButtons(intervals);
            }
        } catch (e) {
            console.error("Error calculating intervals", e);
        }
    }

    private showCardInfo(): void {
        const card = this.reviewSequencer.currentCard;
        if (!card) return;

        const schedule = card.scheduleInfo;
        const currentEaseStr = t("CURRENT_EASE_HELP_TEXT") + (schedule?.ease ?? t("NEW"));
        const currentIntervalStr =
            t("CURRENT_INTERVAL_HELP_TEXT") + textInterval(schedule?.interval, false);
        const generatedFromStr = t("CARD_GENERATED_FROM", {
            notePath: card.question.note.filePath,
        });

        new Notice(currentEaseStr + "\n" + currentIntervalStr + "\n" + generatedFromStr);

        const srfile = card.question.note.file as SrTFile;
        const store = this.plugin.store;
        const id = card.Id;
        const infoM = new ItemInfoModal(this.plugin, srfile.file, store.getItembyID(id));
        infoM.open();
    }
}

class MarkdownRendererAdapter implements IMarkdownRenderer {
    private notePath: string = "";

    constructor(
        private app: App,
        private plugin: SRPlugin,
    ) {}

    setNotePath(path: string): void {
        this.notePath = path;
    }

    async render(content: string, container: HTMLElement, direction: string): Promise<void> {
        const wrapper = new RenderMarkdownWrapper(this.app, this.plugin, this.notePath);
        await wrapper.renderMarkdownWrapper(
            content,
            container,
            direction as unknown as TextDirection,
        );
    }
}
