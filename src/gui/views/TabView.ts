import { ItemView, TFile, WorkspaceLeaf } from "obsidian";

import { SR_TAB_VIEW } from "src/constants";
import { Deck } from "src/Deck";
import { CardUI } from "../components/CardUI";
import { DeckUI } from "../components/DeckUI";
import SRPlugin from "src/main";
import { Question } from "src/Question";
import { SRSettings } from "src/settings";
import { FlashcardEditModal } from "../modals/EditModal";
import { FlashcardReviewMode, IFlashcardReviewSequencer } from "src/FlashcardReviewSequencer";

/**
 * Represents a tab view for spaced repetition plugin.
 *
 * This class extends the ItemView and is used to display the deck and flashcard uis.
 */
export class TabView extends ItemView {
    private plugin: SRPlugin;
    private reviewMode: FlashcardReviewMode;
    private singleNotePath?: string;
    private viewContainerEl: HTMLElement;
    private viewContentEl: HTMLElement;
    private reviewSequencer: IFlashcardReviewSequencer;
    private settings: SRSettings;
    private deckView: DeckUI;
    private flashcardView: CardUI;
    private isInitialized: boolean = false;

    constructor(leaf: WorkspaceLeaf, plugin: SRPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.settings = plugin.data.settings;

        const viewContent = this.containerEl.getElementsByClassName("view-content");
        if (viewContent.length > 0) {
            this.viewContainerEl = viewContent[0] as HTMLElement;
            this.viewContainerEl.addClass("sr-tab-view");

            this.viewContentEl = this.viewContainerEl.createDiv("sr-tab-view-content");

            this.viewContentEl.style.height = this.settings.flashcardHeightPercentage + "%";
            this.viewContentEl.style.maxHeight = this.settings.flashcardHeightPercentage + "%";
            this.viewContentEl.style.width = this.settings.flashcardWidthPercentage + "%";
            this.viewContentEl.style.maxWidth = this.settings.flashcardWidthPercentage + "%";

            this.viewContainerEl.appendChild(this.viewContentEl);
        }
    }

    /**
     * Returns the view type identifier for the SRTabView.
     *
     * @returns {string} The view type identifier.
     */
    getViewType() {
        return SR_TAB_VIEW;
    }

    /**
     * Retrieves the icon identifier for the SRTabView.
     *
     * @returns {string} The tab icon identifier.
     */
    getIcon() {
        return "SpacedRepIcon";
    }

    /**
     * Returns the display text for the SRTabView.
     *
     * @returns {string} The display text for the SRTabView.
     */
    getDisplayText() {
        return "Spaced Repetition";
    }

    async setState(state: any, result: any): Promise<void> {
        // Extract our custom state if it exists
        if (state && typeof state === 'object') {
            this.reviewMode = state.reviewMode ?? FlashcardReviewMode.Review;
            this.singleNotePath = state.singleNotePath;
        }
        // Don't call super.setState as it expects different parameters
    }

    getState(): any {
        return {
            type: this.getViewType(),
            reviewMode: this.reviewMode,
            singleNotePath: this.singleNotePath,
        };
    }

    /**
     * Initializes the SRTabView when opened by loading the review sequencer data
     * and setting up the deck and flashcard views if they are not already initialized.
     */
    async onOpen() {
        try {
            // Check if plugin is fully loaded
            if (!this.plugin.deckTree) {
                console.log("SR: Plugin not fully initialized yet, deferring view initialization");
                return;
            }

            await this.loadReviewData();

            if (!this.isInitialized) {
                // Init static elements in views
                this.deckView = new DeckUI(
                    this.plugin,
                    this.settings,
                    this.reviewSequencer,
                    this.viewContentEl,
                    this._startReviewOfDeck.bind(this),
                );

                this.flashcardView = new CardUI(
                    this.app,
                    this.plugin,
                    this.settings,
                    this.reviewSequencer,
                    this.reviewMode,
                    this.viewContentEl,
                    this.viewContainerEl,
                    this._showDecksList.bind(this),
                    this._doEditQuestionText.bind(this),
                );

                this.isInitialized = true;
            }

            this._showDecksList();
        } catch (e) {
            console.error("SR: Error initializing tab view:", e);
        }
    }

    private async loadReviewData(): Promise<void> {
        if (this.singleNotePath) {
            const abstractFile = this.app.vault.getAbstractFileByPath(this.singleNotePath);
            if (abstractFile instanceof TFile) {
                const singleNoteDeckData = await this.plugin.getPreparedDecksForSingleNoteReview(
                    abstractFile,
                    this.reviewMode,
                );

                const result = this.plugin.getPreparedReviewSequencer(
                    singleNoteDeckData.deckTree,
                    singleNoteDeckData.remainingDeckTree,
                    singleNoteDeckData.mode,
                );

                this.reviewSequencer = result.reviewSequencer;
                this.reviewMode = result.mode;
            }
        } else {
            const fullDeckTree: Deck = this.plugin.deckTree;
            const remainingDeckTree: Deck =
                this.reviewMode === FlashcardReviewMode.Cram
                    ? this.plugin.deckTree
                    : this.plugin.remainingDeckTree;

            const result = this.plugin.getPreparedReviewSequencer(
                fullDeckTree,
                remainingDeckTree,
                this.reviewMode,
            );

            this.reviewSequencer = result.reviewSequencer;
            this.reviewMode = result.mode;
        }
    }

    /**
     * Closes the SRTabView by shutting down any active deck or flashcard views.
     * Ensures that resources associated with these views are properly released.
     */
    async onClose() {
        if (this.deckView) this.deckView.close();
        if (this.flashcardView) this.flashcardView.close();
    }

    private _showDecksList(): void {
        this._hideFlashcard();
        this.deckView.show();
    }

    private _hideDecksList(): void {
        this.deckView.hide();
    }

    private _showFlashcard(deck: Deck): void {
        this._hideDecksList();
        this.flashcardView.show();
    }

    private _hideFlashcard(): void {
        this.flashcardView.hide();
    }

    private _startReviewOfDeck(deck: Deck) {
        this.reviewSequencer.setCurrentDeck(deck.getTopicPath());
        if (this.reviewSequencer.hasCurrentCard) {
            this._showFlashcard(deck);
        } else {
            this._showDecksList();
        }
    }

    private async _doEditQuestionText(): Promise<void> {
        const currentQ: Question = this.reviewSequencer.currentQuestion;

        // Just the question/answer text; without any preceding topic tag
        const textPrompt = currentQ.questionText.actualQuestion;

        const editModal = FlashcardEditModal.Prompt(
            this.app,
            textPrompt,
            currentQ.questionText.textDirection,
        );
        editModal
            .then(async (modifiedCardText) => {
                this.reviewSequencer.updateCurrentQuestionText(modifiedCardText);
            })
            .catch((reason) => console.log(reason));
    }
}
