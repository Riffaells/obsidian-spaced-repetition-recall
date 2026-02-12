import { App } from "obsidian";
import {
    IModalController,
    ModalState,
    ModalOpenOptions,
    SessionStats,
    CardMixingStrategy,
} from "./types";
import { ReviewResponse } from "src/core/scheduling/scheduling";
import { StateMachine } from "./utils/StateMachine";
import { EventBus } from "./utils/EventBus";
import { ServiceContainer } from "./services/ServiceContainer";
import { TopicPath } from "src/core/services/TopicPath";
import { IFlashcardReviewSequencer } from "src/core/scheduling/FlashcardReviewSequencer";
import { KeyboardHandler, KeyboardAction } from "./services/KeyboardHandler";
import { Card } from "src/core/models/Card";
import { CardListType } from "src/core/models/CardListType";
import { MultiDeckManager } from "./services/MultiDeckManager";
import { Deck } from "src/core/models/Deck";
import { ErrorLogger, ErrorSeverity } from "./services/ErrorLogger";
import { GestureHandler, SwipeDirection } from "./services/GestureHandler";
import { ResponsiveLayout } from "./utils/ResponsiveLayout";
import { SourceNoteNavigator } from "./services/SourceNoteNavigator";
import { FullscreenToggle, IFullscreenToggle } from "./components/FullscreenToggle";
import { CustomizationManager } from "./services/CustomizationManager";
import { SRSettings } from "src/core/settings/SRSettings";

export class ModalController implements IModalController {
    private app: App;
    private stateMachine: StateMachine;
    private eventBus: EventBus;
    private services: ServiceContainer;
    private keyboardHandler: KeyboardHandler;
    private gestureHandler: GestureHandler | null = null;
    private responsiveLayout: ResponsiveLayout;
    private sourceNoteNavigator: SourceNoteNavigator;
    private fullscreenToggle: IFullscreenToggle | null = null;
    private customizationManager: CustomizationManager;

    private reviewSequencer: IFlashcardReviewSequencer;

    // Session state
    private sessionStartTime: number;
    private cardsReviewedCount: number;
    private sessionResponses: Record<ReviewResponse, number>;

    // Multi-deck state
    private selectedDeckPaths: TopicPath[];
    private cardMixingStrategy: CardMixingStrategy;
    private isMultiDeckSession: boolean;

    // Per-deck statistics tracking (Requirements 7.2, 7.5)
    private perDeckStats: Map<
        string,
        {
            deckPath: TopicPath;
            deckName: string;
            cardsReviewed: number;
            responses: Record<ReviewResponse, number>;
        }
    >;

    // Error handling
    private lastRetryAction: (() => void) | null = null;

    // History for navigation
    private sessionHistory: Card[] = [];

    constructor(app: App, eventBus: EventBus, services: ServiceContainer) {
        this.app = app;
        this.eventBus = eventBus;
        this.services = services;
        this.stateMachine = new StateMachine(eventBus);
        this.keyboardHandler = new KeyboardHandler();
        this.responsiveLayout = new ResponsiveLayout();
        this.sourceNoteNavigator = new SourceNoteNavigator(app);

        // Initialize customization manager with settings
        const settings = this.services.get<SRSettings>("settings");
        this.customizationManager = new CustomizationManager(settings);

        // Initialize session state
        this.resetSessionStats();

        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Listen to state changes to update keyboard handler
        this.eventBus.on(
            "state-changed",
            (data: { from: ModalState; to: ModalState; context?: unknown }) => {
                this.keyboardHandler.setState(data.to);
            },
        );
    }

    private initializeDependencies(): void {
        this.reviewSequencer = this.services.get<IFlashcardReviewSequencer>("reviewSequencer");
    }

    private resetSessionStats(): void {
        this.sessionStartTime = Date.now();
        this.cardsReviewedCount = 0;
        this.sessionResponses = {
            [ReviewResponse.Easy]: 0,
            [ReviewResponse.Good]: 0,
            [ReviewResponse.Hard]: 0,
            [ReviewResponse.Reset]: 0,
        };
        this.selectedDeckPaths = [];
        this.isMultiDeckSession = false;
        this.cardMixingStrategy = CardMixingStrategy.Sequential;
        this.perDeckStats = new Map();
        this.sessionHistory = [];
    }

    /**
     * Set up keyboard shortcuts and connect them to controller actions
     * Requirements: 5.1, 5.4
     */
    private setupKeyboardShortcuts(): void {
        // Show answer
        this.keyboardHandler.registerAction(KeyboardAction.SHOW_ANSWER, () => {
            this.showAnswer();
            this.provideVisualFeedback("answer-shown");
        });

        // Skip card
        this.keyboardHandler.registerAction(KeyboardAction.SKIP_CARD, () => {
            this.skipCard();
            this.provideVisualFeedback("card-skipped");
        });

        // Review responses
        this.keyboardHandler.registerAction(KeyboardAction.REVIEW_EASY, () => {
            this.submitReview(ReviewResponse.Easy);
            this.provideVisualFeedback("review-easy");
        });

        this.keyboardHandler.registerAction(KeyboardAction.REVIEW_GOOD, () => {
            this.submitReview(ReviewResponse.Good);
            this.provideVisualFeedback("review-good");
        });

        this.keyboardHandler.registerAction(KeyboardAction.REVIEW_HARD, () => {
            this.submitReview(ReviewResponse.Hard);
            this.provideVisualFeedback("review-hard");
        });

        this.keyboardHandler.registerAction(KeyboardAction.REVIEW_RESET, () => {
            this.submitReview(ReviewResponse.Reset);
            this.provideVisualFeedback("review-reset");
        });

        // Modal navigation
        this.keyboardHandler.registerAction(KeyboardAction.CLOSE_MODAL, () => {
            this.close();
        });

        this.keyboardHandler.registerAction(KeyboardAction.RETURN_TO_DECK_LIST, () => {
            this.returnToDeckList();
            this.provideVisualFeedback("returned-to-deck-list");
        });

        // Card actions
        this.keyboardHandler.registerAction(KeyboardAction.EDIT_CARD, () => {
            this.editCard();
        });

        this.keyboardHandler.registerAction(KeyboardAction.OPEN_SOURCE, () => {
            this.openSourceNote();
        });

        // Deck navigation
        this.keyboardHandler.registerAction(KeyboardAction.NAVIGATE_PREV_DECK, () => {
            this.navigateToDeck("prev");
            this.provideVisualFeedback("navigated-prev-deck");
        });

        this.keyboardHandler.registerAction(KeyboardAction.NAVIGATE_NEXT_DECK, () => {
            this.navigateToDeck("next");
            this.provideVisualFeedback("navigated-next-deck");
        });

        // Display modes
        this.keyboardHandler.registerAction(KeyboardAction.TOGGLE_FULLSCREEN, () => {
            this.toggleFullscreen();
            this.provideVisualFeedback("fullscreen-toggled");
        });
    }

    /**
     * Provide visual feedback for keyboard actions
     * Requirements: 5.4
     */
    private provideVisualFeedback(action: string): void {
        // Emit event for UI components to handle visual feedback
        this.eventBus.emit("keyboard-action", { action, timestamp: Date.now() });
    }

    /**
     * Set up gesture handlers for mobile swipe navigation
     * Requirements: 9.4, 12.3
     */
    setupGestureHandlers(element: HTMLElement): void {
        // Only enable gestures on mobile/touch devices
        if (!this.responsiveLayout.isMobile() && !this.responsiveLayout.isTouchDevice()) {
            return;
        }

        // Clean up existing gesture handler
        if (this.gestureHandler) {
            this.gestureHandler.deactivate();
            this.gestureHandler.clearCallbacks();
        }

        // Create new gesture handler
        this.gestureHandler = new GestureHandler(element);

        // Swipe right: Show answer (when on front) or go to previous card (when on back)
        this.gestureHandler.onSwipe(SwipeDirection.RIGHT, () => {
            if (this.getCurrentState() === ModalState.CARD_FRONT) {
                this.showAnswer();
                this.provideVisualFeedback("swipe-show-answer");
            } else if (this.getCurrentState() === ModalState.CARD_BACK) {
                // Could navigate to previous card if implemented
                this.provideVisualFeedback("swipe-right");
            }
        });

        // Swipe left: Skip card or navigate to next
        this.gestureHandler.onSwipe(SwipeDirection.LEFT, () => {
            if (
                this.getCurrentState() === ModalState.CARD_FRONT ||
                this.getCurrentState() === ModalState.CARD_BACK
            ) {
                this.skipCard();
                this.provideVisualFeedback("swipe-skip-card");
            }
        });

        // Swipe up: Mark as Good (when answer is shown)
        this.gestureHandler.onSwipe(SwipeDirection.UP, () => {
            if (this.getCurrentState() === ModalState.CARD_BACK) {
                this.submitReview(ReviewResponse.Good);
                this.provideVisualFeedback("swipe-good");
            }
        });

        // Swipe down: Mark as Hard (when answer is shown)
        this.gestureHandler.onSwipe(SwipeDirection.DOWN, () => {
            if (this.getCurrentState() === ModalState.CARD_BACK) {
                this.submitReview(ReviewResponse.Hard);
                this.provideVisualFeedback("swipe-hard");
            }
        });

        // Activate gesture handler
        this.gestureHandler.activate();
    }

    getCurrentState(): ModalState {
        return this.stateMachine.getCurrentState();
    }

    transitionTo(state: ModalState, context?: unknown): void {
        this.stateMachine.transitionTo(state, context);
    }

    private handleError(
        error: unknown,
        context: Record<string, unknown>,
        retryAction?: () => void,
    ): void {
        const err = error instanceof Error ? error : new Error(String(error));
        ErrorLogger.getInstance().log(err.message, ErrorSeverity.ERROR, context, err);
        this.lastRetryAction = retryAction || null;
        this.transitionTo(ModalState.ERROR, { error: err });
    }

    retry(): void {
        if (this.lastRetryAction) {
            // Attempt to recover by executing the last action
            const action = this.lastRetryAction;
            this.lastRetryAction = null; // Clear it to prevent loops if it fails again immediately
            try {
                action();
            } catch (e) {
                this.handleError(e, { action: "retry" }, action);
            }
        } else {
            // Default recovery: clear state and return to deck list
            this.returnToDeckList();
        }
    }

    open(options?: ModalOpenOptions): void {
        try {
            this.initializeDependencies();

            // Property 30: Fresh State on Reopen
            this.resetSessionStats();

            // Property 28: Resource Initialization (handled by initializeDependencies)

            // Activate keyboard handler
            this.keyboardHandler.activate();

            // First transition to DECK_SELECTION from CLOSED
            this.transitionTo(ModalState.DECK_SELECTION);

            // Handle multi-deck or single deck selection
            if (options?.deckPaths && options.deckPaths.length > 0) {
                // Multi-deck selection (Requirements 7.1)
                this.startMultiDeckReview(
                    options.deckPaths,
                    options.cardMixingStrategy || CardMixingStrategy.Sequential,
                );
            } else if (options?.deckPath) {
                // Single deck selection
                this.startReview(options.deckPath);
            } else {
                // No deck specified, check if sequencer has cards
                if (this.reviewSequencer && this.reviewSequencer.hasCurrentCard) {
                    this.transitionTo(ModalState.CARD_FRONT);
                }
            }
        } catch (error) {
            this.handleError(error, { action: "open", options }, () => this.open(options));
        }
    }

    close(): void {
        // Emit modal close event for sidebar synchronization (Requirements 3.4, 3.5)
        this.emitModalCloseEvent();

        // Deactivate keyboard handler
        this.keyboardHandler.deactivate();

        // Deactivate gesture handler
        if (this.gestureHandler) {
            this.gestureHandler.deactivate();
            this.gestureHandler.clearCallbacks();
        }

        // Cleanup fullscreen toggle
        if (this.fullscreenToggle) {
            this.fullscreenToggle.destroy();
            this.fullscreenToggle = null;
        }

        // Cleanup source note navigator
        this.sourceNoteNavigator.cleanup();

        // Property 29: Lifecycle Cleanup
        this.eventBus.clear();
        this.transitionTo(ModalState.CLOSED);
    }

    startReview(deckPath: TopicPath): void {
        try {
            this.initializeDependencies();
            this.selectedDeckPaths = [deckPath];
            this.isMultiDeckSession = false;
            this.reviewSequencer.setCurrentDeck(deckPath);

            if (this.reviewSequencer.hasCurrentCard) {
                this.transitionTo(ModalState.CARD_FRONT);
            } else {
                this.transitionTo(ModalState.SESSION_COMPLETE);
            }
        } catch (error) {
            this.handleError(error, { action: "startReview", deckPath }, () =>
                this.startReview(deckPath),
            );
        }
    }

    /**
     * Start a multi-deck review session
     * Requirements: 7.1, 7.3
     *
     * @param deckPaths Array of deck paths to review
     * @param mixingStrategy Strategy for mixing cards from different decks
     */
    startMultiDeckReview(
        deckPaths: TopicPath[],
        mixingStrategy: CardMixingStrategy = CardMixingStrategy.Sequential,
    ): void {
        try {
            this.initializeDependencies();

            if (!deckPaths || deckPaths.length === 0) {
                console.error("No deck paths provided for multi-deck review");
                return;
            }

            // Store multi-deck session state
            this.selectedDeckPaths = deckPaths;
            this.isMultiDeckSession = deckPaths.length > 1;
            this.cardMixingStrategy = mixingStrategy;

            // Get the original deck tree from the sequencer
            const originalDeckTree = this.reviewSequencer.originalDeckTree;

            if (!originalDeckTree) {
                throw new Error("Original deck tree not available");
            }

            // Combine decks using MultiDeckManager (Requirements 7.1)
            const combinedDeck = MultiDeckManager.combineDecks(
                originalDeckTree,
                deckPaths,
                mixingStrategy,
            );

            // Set the combined deck as the current deck
            this.reviewSequencer.setCurrentDeck(deckPaths[0]);

            if (this.reviewSequencer.hasCurrentCard) {
                this.transitionTo(ModalState.CARD_FRONT);
            } else {
                this.transitionTo(ModalState.SESSION_COMPLETE);
            }
        } catch (error) {
            this.handleError(error, { action: "startMultiDeckReview", deckPaths }, () =>
                this.startMultiDeckReview(deckPaths, mixingStrategy),
            );
        }
    }

    showAnswer(): void {
        if (this.getCurrentState() !== ModalState.CARD_FRONT) {
            console.warn("Attempted to show answer when not in CARD_FRONT state");
            return;
        }
        this.transitionTo(ModalState.CARD_BACK);
    }

    async submitReview(response: ReviewResponse): Promise<void> {
        if (this.getCurrentState() !== ModalState.CARD_BACK) {
            console.warn("Attempted to submit review when not in CARD_BACK state");
            return;
        }

        try {
            const currentCard = this.reviewSequencer.currentCard;
            if (currentCard) {
                this.sessionHistory.push(currentCard);
            }

            // Process review in background to avoid blocking UI
            await this.reviewSequencer.processReview(response);

            // Update overall stats (Property 9)
            this.cardsReviewedCount++;
            this.sessionResponses[response] = (this.sessionResponses[response] || 0) + 1;

            // Update per-deck statistics for multi-deck sessions (Requirements 7.2, 7.5)
            if (this.isMultiDeckSession && currentCard) {
                this.updatePerDeckStats(currentCard, response);
            }

            // Emit card review event for sidebar synchronization (Requirements 3.1)
            this.emitCardReviewedEvent(currentCard, response);

            // Check if there are more cards to review
            if (this.reviewSequencer.hasCurrentCard) {
                this.transitionTo(ModalState.CARD_FRONT);
            } else {
                // Emit deck completion event (Requirements 3.2)
                this.emitDeckCompletionEvent();
                this.transitionTo(ModalState.SESSION_COMPLETE, this.getSessionStats());
            }
        } catch (error) {
            this.handleError(error, { action: "submitReview", response }, () =>
                this.submitReview(response),
            );
        }
    }

    skipCard(): void {
        const currentCard = this.reviewSequencer.currentCard;
        if (currentCard) {
            this.sessionHistory.push(currentCard);
        }
        this.reviewSequencer.skipCurrentCard();

        if (this.reviewSequencer.hasCurrentCard) {
            // If we were in FRONT or BACK, we usually go back to FRONT of next card
            this.transitionTo(ModalState.CARD_FRONT);
        } else {
            this.transitionTo(ModalState.SESSION_COMPLETE, this.getSessionStats());
        }
    }

    getSessionStats(): SessionStats {
        // Calculate remaining cards from the remaining deck tree
        const remainingCards = this.reviewSequencer.originalDeckTree
            ? this.reviewSequencer.originalDeckTree.getDistinctCardCount(CardListType.All, true) -
              this.cardsReviewedCount
            : 0;

        const stats: SessionStats = {
            cardsReviewed: this.cardsReviewedCount,
            timeSpent: Date.now() - this.sessionStartTime,
            responses: { ...this.sessionResponses }, // clone
            deckName: this.reviewSequencer.currentDeck?.deckName ?? "Unknown",
            deckPath: this.reviewSequencer.currentDeck?.getTopicPath() ?? TopicPath.emptyPath,
            remainingCards: Math.max(0, remainingCards),
        };

        // Add per-deck statistics for multi-deck sessions (Requirements 7.5)
        if (this.isMultiDeckSession) {
            const perDeckStatsMap = new Map<string, import("./types").PerDeckStats>();
            const originalDeckTree = this.reviewSequencer.originalDeckTree;

            // Include stats for all selected decks, even if no cards reviewed yet
            for (const deckPath of this.selectedDeckPaths) {
                const deckPathStr = deckPath.path.join("/");
                const existingStats = this.perDeckStats.get(deckPathStr);

                // Get current deck counts from the original deck tree
                let dueCount = 0;
                let newCount = 0;
                let totalCount = 0;
                let deckName = "Unknown";

                if (originalDeckTree) {
                    const deck = originalDeckTree.getDeck(deckPath);
                    if (deck) {
                        deckName = deck.deckName;
                        dueCount = deck.getDistinctCardCount(CardListType.DueCard, true);
                        newCount = deck.getDistinctCardCount(CardListType.NewCard, true);
                        totalCount = deck.getDistinctCardCount(CardListType.All, true);
                    }
                }

                perDeckStatsMap.set(deckPathStr, {
                    deckPath: deckPath,
                    deckName: deckName,
                    cardsReviewed: existingStats?.cardsReviewed ?? 0,
                    dueCount,
                    newCount,
                    totalCount,
                    responses: existingStats?.responses ?? {
                        [ReviewResponse.Easy]: 0,
                        [ReviewResponse.Good]: 0,
                        [ReviewResponse.Hard]: 0,
                        [ReviewResponse.Reset]: 0,
                    },
                });
            }

            stats.perDeckStats = perDeckStatsMap;
        }

        return stats;
    }

    /**
     * Update per-deck statistics when a card is reviewed
     * Requirements: 7.2, 7.5
     */
    private updatePerDeckStats(card: Card, response: ReviewResponse): void {
        const cardDeckPath = MultiDeckManager.getCardDeckPath(card, this.selectedDeckPaths);

        if (!cardDeckPath) {
            console.warn("Could not determine deck path for card in multi-deck session");
            return;
        }

        const deckPathStr = cardDeckPath.path.join("/");

        // Initialize stats for this deck if not exists
        if (!this.perDeckStats.has(deckPathStr)) {
            const originalDeckTree = this.reviewSequencer.originalDeckTree;
            let deckName = "Unknown";

            if (originalDeckTree) {
                const deck = originalDeckTree.getDeck(cardDeckPath);
                if (deck) {
                    deckName = deck.deckName;
                }
            }

            this.perDeckStats.set(deckPathStr, {
                deckPath: cardDeckPath,
                deckName,
                cardsReviewed: 0,
                responses: {
                    [ReviewResponse.Easy]: 0,
                    [ReviewResponse.Good]: 0,
                    [ReviewResponse.Hard]: 0,
                    [ReviewResponse.Reset]: 0,
                },
            });
        }

        // Update stats for this deck
        const deckStats = this.perDeckStats.get(deckPathStr)!;
        deckStats.cardsReviewed++;
        deckStats.responses[response] = (deckStats.responses[response] || 0) + 1;
    }

    /**
     * Get the deck path for the current card in a multi-deck session
     * Requirements: 7.2
     */
    getCurrentCardDeckPath(): TopicPath | null {
        if (!this.isMultiDeckSession || !this.reviewSequencer.hasCurrentCard) {
            return null;
        }

        const currentCard = this.reviewSequencer.currentCard;
        return MultiDeckManager.getCardDeckPath(currentCard, this.selectedDeckPaths);
    }

    /**
     * Get the deck name for the current card in a multi-deck session
     * Requirements: 7.2
     */
    getCurrentCardDeckName(): string | null {
        const deckPath = this.getCurrentCardDeckPath();
        if (!deckPath) {
            return null;
        }

        const originalDeckTree = this.reviewSequencer.originalDeckTree;
        if (!originalDeckTree) {
            return null;
        }

        const deck = originalDeckTree.getDeck(deckPath);
        return deck ? deck.deckName : null;
    }

    /**
     * Get statistics for all decks in a multi-deck session
     * Requirements: 7.2, 7.5
     */
    getMultiDeckStats(): Map<
        string,
        { dueCount: number; newCount: number; totalCount: number }
    > | null {
        if (!this.isMultiDeckSession) {
            return null;
        }

        const originalDeckTree = this.reviewSequencer.originalDeckTree;
        if (!originalDeckTree) {
            return null;
        }

        return MultiDeckManager.getMultiDeckStats(originalDeckTree, this.selectedDeckPaths);
    }

    /**
     * Check if the current session is a multi-deck session
     */
    isMultiDeck(): boolean {
        return this.isMultiDeckSession;
    }

    /**
     * Get the selected deck paths for the current session
     */
    getSelectedDeckPaths(): TopicPath[] {
        return [...this.selectedDeckPaths];
    }

    /**
     * Navigate to the previous or next deck in the deck tree
     * Requirements: 16.1, 16.2, 16.3, 16.4
     *
     * @param direction Direction to navigate ('prev' or 'next')
     */
    navigateToDeck(direction: "prev" | "next"): void {
        try {
            if (direction === "next" && this.reviewSequencer.hasCurrentCard) {
                this.skipCard();
                this.provideVisualFeedback("card-skipped");
                return;
            }

            const originalDeckTree = this.reviewSequencer.originalDeckTree;
            if (!originalDeckTree) {
                console.warn("Cannot navigate decks: original deck tree not available");
                return;
            }

            // Get current deck path
            const currentDeckPath = this.reviewSequencer.currentDeck?.getTopicPath();
            if (!currentDeckPath) {
                console.warn("Cannot navigate decks: no current deck");
                return;
            }

            // Get all available decks in order (flattened deck tree)
            const allDecks = this.getAllDecksInOrder(originalDeckTree);

            // Find current deck index
            const currentIndex = allDecks.findIndex(
                (deck) => deck.getTopicPath().path.join("/") === currentDeckPath.path.join("/"),
            );

            if (currentIndex === -1) {
                console.warn("Cannot navigate decks: current deck not found in tree");
                return;
            }

            // Calculate target index
            let targetIndex: number;
            if (direction === "prev") {
                targetIndex = currentIndex - 1;
            } else {
                targetIndex = currentIndex + 1;
            }

            // Check bounds (Requirements 16.5)
            if (targetIndex < 0 || targetIndex >= allDecks.length) {
                console.log(
                    `Cannot navigate ${direction}: at ${direction === "prev" ? "first" : "last"} deck`,
                );
                return;
            }

            // Get target deck
            const targetDeck = allDecks[targetIndex];
            const targetDeckPath = targetDeck.getTopicPath();

            // Preserve current card position (Requirements 16.4)
            // We'll start the review from the beginning of the new deck
            this.startReview(targetDeckPath);

            // Emit navigation event for UI updates
            this.eventBus.emit("deck-navigated", {
                direction,
                fromDeck: currentDeckPath,
                toDeck: targetDeckPath,
                timestamp: Date.now(),
            });
        } catch (error) {
            this.handleError(error, { action: "navigateToDeck", direction });
        }
    }

    /**
     * Navigate to a specific deck from breadcrumb navigation
     * Requirements: 19.2
     *
     * @param deckPath The deck path to navigate to
     */
    navigateToBreadcrumb(deckPath: TopicPath): void {
        try {
            // Start review of the selected deck
            this.startReview(deckPath);

            // Emit breadcrumb navigation event
            this.eventBus.emit("breadcrumb-navigated", {
                deckPath,
                timestamp: Date.now(),
            });
        } catch (error) {
            this.handleError(error, { action: "navigateToBreadcrumb", deckPath });
        }
    }

    /**
     * Get all decks in order (depth-first traversal)
     * This provides the order for deck navigation
     *
     * @param rootDeck The root deck to traverse
     * @returns Array of decks in traversal order
     */
    private getAllDecksInOrder(rootDeck: Deck): Deck[] {
        const result: Deck[] = [];

        const traverse = (deck: Deck) => {
            // Only include decks that have cards to review (Due or New)
            // Requirements: 16.5 - Only navigate to decks with active cards
            const hasNewCards = deck.getCardCount(CardListType.NewCard, false) > 0;
            const hasDueCards = deck.getCardCount(CardListType.DueCard, false) > 0;
            const hasReviewableCards = hasNewCards || hasDueCards;

            if (hasReviewableCards && !deck.isRootDeck) {
                result.push(deck);
            }

            // Traverse subdecks
            for (const subdeck of deck.subdecks) {
                traverse(subdeck);
            }
        };

        traverse(rootDeck);
        return result;
    }

    /**
     * Check if navigation to previous deck is available
     * Requirements: 16.5
     */
    canNavigatePrevDeck(): boolean {
        const originalDeckTree = this.reviewSequencer.originalDeckTree;
        if (!originalDeckTree) return false;

        const currentDeckPath = this.reviewSequencer.currentDeck?.getTopicPath();
        if (!currentDeckPath) return false;

        const allDecks = this.getAllDecksInOrder(originalDeckTree);
        const currentIndex = allDecks.findIndex(
            (deck) => deck.getTopicPath().path.join("/") === currentDeckPath.path.join("/"),
        );

        return currentIndex > 0;
    }

    /**
     * Check if navigation to next deck is available
     * Requirements: 16.5
     */
    canNavigateNextDeck(): boolean {
        // Always allow navigating forward if there are more cards (it will act as skip)
        if (this.reviewSequencer.hasCurrentCard) {
            return true;
        }

        const originalDeckTree = this.reviewSequencer.originalDeckTree;
        if (!originalDeckTree) return false;

        const currentDeckPath = this.reviewSequencer.currentDeck?.getTopicPath();
        if (!currentDeckPath) return false;

        const allDecks = this.getAllDecksInOrder(originalDeckTree);
        const currentIndex = allDecks.findIndex(
            (deck) => deck.getTopicPath().path.join("/") === currentDeckPath.path.join("/"),
        );

        return currentIndex >= 0 && currentIndex < allDecks.length - 1;
    }

    /**
     * Return to deck list view
     * This transitions the modal back to deck selection state
     */
    returnToDeckList(): void {
        this.transitionTo(ModalState.DECK_SELECTION);
    }

    /**
     * Opens the source note and scrolls to the current card's location.
     *
     * This method is called when the user clicks the "Open Source" button in CardView.
     * It uses the SourceNoteNavigator service to:
     * - Open the source note file
     * - Expand any collapsed sections
     * - Scroll to the exact line where the card is defined
     * - Highlight the card text for 2 seconds
     *
     * Integration with CardView (Requirements 13.2, 17.5):
     * When CardView is instantiated, connect this method to the onOpenSource callback:
     *
     *   cardView.onOpenSource(() => {
     *       this.openSourceNote();
     *   });
     *
     * Requirements: 13.2, 17.1, 17.2, 17.3, 17.4, 17.5
     */
    openSourceNote(): void {
        const currentCard = this.reviewSequencer.currentCard;
        if (!currentCard) {
            console.warn("ModalController: No current card to open source note for");
            return;
        }

        // Use the SourceNoteNavigator to open and scroll to the card
        this.sourceNoteNavigator.openAndScrollToCard(currentCard).catch((error) => {
            console.error("ModalController: Error opening source note", error);

            // Log the error
            const errorLogger = this.services.get<ErrorLogger>("errorLogger");
            if (errorLogger) {
                errorLogger.log(
                    `Failed to open source note: ${error.message}`,
                    ErrorSeverity.ERROR,
                    {
                        component: "ModalController",
                        action: "openSourceNote",
                        cardId: currentCard.question?.parsedFlashcard?.id,
                    },
                    error,
                );
            }
        });
    }

    /**
     * Opens the card edit modal and updates the source note after editing
     * Requirements: 13.3, 13.4
     */
    async editCard(): Promise<void> {
        // Ensure dependencies are initialized
        if (!this.reviewSequencer) {
            this.initializeDependencies();
        }

        const currentCard = this.reviewSequencer.currentCard;
        if (!currentCard || !currentCard.question) {
            console.warn("ModalController: No current card to edit");
            return;
        }

        // Import FlashcardEditModal dynamically to avoid circular dependencies
        const { FlashcardEditModal, EDIT_CANCELLED } = await import("../modals/EditModal");

        try {
            const questionText = currentCard.question.questionText;
            const textPrompt = questionText.actualQuestion;
            const textDirection = questionText.textDirection;

            // Open edit modal
            const editModal = FlashcardEditModal.Prompt(this.app, textPrompt, textDirection);

            // Wait for user to save or cancel
            const modifiedCardText = await editModal;

            // Update the card text in the source note (Requirements 13.4)
            await this.reviewSequencer.updateCurrentQuestionText(modifiedCardText);

            // Emit event for UI to refresh card display (Requirements 13.4)
            this.eventBus.emit("card-edited", {
                cardId: currentCard.question.parsedFlashcard?.id,
                newText: modifiedCardText,
                timestamp: Date.now(),
            });

            // Provide visual feedback
            this.provideVisualFeedback("card-edited");
        } catch (error) {
            // User cancelled or error occurred
            if (error !== EDIT_CANCELLED) {
                console.error("ModalController: Error editing card", error);
                this.handleError(error, { action: "editCard" });
            }
        }
    }

    /**
     * Initialize the fullscreen toggle component
     * This should be called after the modal DOM is created
     * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
     *
     * @param modalElement The modal container element
     * @param buttonElement The fullscreen toggle button element
     */
    initializeFullscreenToggle(modalElement: HTMLElement, buttonElement: HTMLButtonElement): void {
        // Clean up existing fullscreen toggle if any
        if (this.fullscreenToggle) {
            this.fullscreenToggle.destroy();
        }

        // Create new fullscreen toggle
        this.fullscreenToggle = new FullscreenToggle(modalElement, buttonElement);

        // Listen to fullscreen changes
        this.fullscreenToggle.onFullscreenChange((isFullscreen) => {
            // Emit event for UI updates
            this.eventBus.emit("fullscreen-changed", {
                isFullscreen,
                timestamp: Date.now(),
            });
        });
    }

    /**
     * Toggle fullscreen mode
     * Requirements: 18.1, 18.2
     */
    toggleFullscreen(): void {
        if (!this.fullscreenToggle) {
            console.warn("ModalController: Fullscreen toggle not initialized");
            return;
        }

        this.fullscreenToggle.toggleFullscreen();
    }

    /**
     * Check if modal is in fullscreen mode
     * Requirements: 18.1
     */
    isFullscreen(): boolean {
        if (!this.fullscreenToggle) {
            return false;
        }

        return this.fullscreenToggle.isFullscreen();
    }

    /**
     * Initialize customization for the modal element
     * This should be called after the modal DOM is created
     * Requirements: 15.1, 15.2, 15.5
     *
     * @param modalElement The modal container element
     * @param customClasses Optional array of custom CSS classes to apply
     */
    initializeCustomization(modalElement: HTMLElement, customClasses: string[] = []): void {
        this.customizationManager.setModalElement(modalElement);
        this.customizationManager.applyAllCustomizations(customClasses);
    }

    /**
     * Get custom button labels from settings
     * Requirements: 15.3
     *
     * @returns Object containing custom labels for review buttons
     */
    getCustomButtonLabels(): { easy: string; good: string; hard: string } {
        return this.customizationManager.getCustomButtonLabels();
    }

    /**
     * Check if context should be shown in cards
     * Requirements: 15.4
     *
     * @returns true if context should be visible, false otherwise
     */
    shouldShowContext(): boolean {
        return this.customizationManager.shouldShowContext();
    }

    /**
     * Check if intervals should be shown in review buttons
     *
     * @returns true if intervals should be visible, false otherwise
     */
    shouldShowIntervals(): boolean {
        return this.customizationManager.shouldShowIntervals();
    }

    /**
     * Update customization settings
     * Call this when settings are updated to refresh customizations
     *
     * @param settings Updated settings object
     */
    updateCustomizationSettings(settings: SRSettings): void {
        this.customizationManager.updateSettings(settings);
        this.customizationManager.applyAllCustomizations();
    }

    /**
     * Emit card reviewed event for sidebar synchronization
     * Requirements: 3.1
     */
    private emitCardReviewedEvent(card: Card | null, response: ReviewResponse): void {
        if (!card) return;

        // Emit to internal EventBus for modal components
        this.eventBus.emit("card-reviewed", {
            card,
            response,
            timestamp: Date.now(),
            deckPath: this.reviewSequencer.currentDeck?.getTopicPath(),
        });

        // Emit to Obsidian workspace for sidebar synchronization
        // This follows the same pattern as ReviewManager
        this.app.workspace.trigger("sr:card-reviewed", {
            card,
            response,
            deckPath: this.reviewSequencer.currentDeck?.getTopicPath(),
        });
    }

    /**
     * Emit deck completion event for sidebar synchronization
     * Requirements: 3.2
     */
    private emitDeckCompletionEvent(): void {
        const stats = this.getSessionStats();

        // Emit to internal EventBus
        this.eventBus.emit("deck-completed", {
            deckName: stats.deckName,
            deckPath: stats.deckPath,
            stats,
            timestamp: Date.now(),
        });

        // Emit to Obsidian workspace for sidebar synchronization
        this.app.workspace.trigger("sr:deck-completed", {
            deckName: stats.deckName,
            deckPath: stats.deckPath,
            stats,
        });

        // Also trigger stats-updated for sidebar refresh
        this.app.workspace.trigger("sr:stats-updated");
    }

    /**
     * Emit modal close event for sidebar synchronization
     * Requirements: 3.4, 3.5
     */
    private emitModalCloseEvent(): void {
        // Emit to internal EventBus
        this.eventBus.emit("modal-closed", {
            timestamp: Date.now(),
            sessionStats: this.getSessionStats(),
        });

        // Emit to Obsidian workspace for sidebar synchronization
        this.app.workspace.trigger("sr:modal-closed", {
            sessionStats: this.getSessionStats(),
        });

        // Trigger stats-updated to ensure sidebar refreshes
        this.app.workspace.trigger("sr:stats-updated");
    }
}
