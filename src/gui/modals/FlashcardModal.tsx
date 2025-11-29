import { App, Modal } from "obsidian";

import type SRPlugin from "src/main";
import { SRSettings } from "src/settings";

import { Deck } from "src/Deck";
import { Question } from "src/Question";
import {
    FlashcardReviewMode,
    IFlashcardReviewSequencer as IFlashcardReviewSequencer,
} from "src/FlashcardReviewSequencer";
import { FlashcardEditModal } from "./EditModal";
import { DeckUI } from "../components/DeckUI";
import { CardUI } from "../components/CardUI";

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
    private deckView: DeckUI;
    private flashcardView: CardUI;

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

        this.deckView = new DeckUI(
            this.plugin,
            this.settings,
            this.reviewSequencer,
            this.contentEl,
            this.startReviewOfDeck,
        );

        this.flashcardView = new CardUI(
            this.app,
            this.plugin,
            this.settings,
            this.reviewSequencer,
            this.reviewMode,
            this.contentEl,
            this.modalEl,
            this.showDecksList,
            this.doEditQuestionText,
            this.closeModal,
        );
    }

    private setupModalStyles(): void {
        const heightPercent = `${this.settings.flashcardHeightPercentage}%`;
        const widthPercent = `${this.settings.flashcardWidthPercentage}%`;

        this.modalEl.style.height = heightPercent;
        this.modalEl.style.maxHeight = heightPercent;
        this.modalEl.style.width = widthPercent;
        this.modalEl.style.maxWidth = widthPercent;
        this.modalEl.setAttribute("id", "sr-modal");

        this.contentEl.addClass("sr-modal-content");
    }

    onOpen(): void {
        if (this.reviewSequencer.hasCurrentCard) {
            this.showFlashcard();
        } else {
            this.showDecksList();
        }
    }

    onClose(): void {
        this.plugin.setSRViewInFocus(false);
        this.deckView.close();
        this.flashcardView.close();
    }

    private showDecksList = (): void => {
        this.hideFlashcard();
        this.deckView.show();
    };

    public closeModal = (): void => {
        this.close();
    };

    private hideDecksList(): void {
        this.deckView.hide();
    }

    private showFlashcard(): void {
        this.plugin.setSRViewInFocus(true);
        this.hideDecksList();
        this.flashcardView.show();
    }

    private hideFlashcard(): void {
        this.flashcardView.hide();
    }

    private startReviewOfDeck = (deck: Deck): void => {
        this.reviewSequencer.setCurrentDeck(deck.getTopicPath());
        if (this.reviewSequencer.hasCurrentCard) {
            this.showFlashcard();
        } else {
            this.showDecksList();
        }
    };

    private doEditQuestionText = async (): Promise<void> => {
        const currentQ: Question = this.reviewSequencer.currentQuestion;
        const textPrompt = currentQ.questionText.actualQuestion;

        try {
            const modifiedCardText = await FlashcardEditModal.Prompt(
                this.app,
                textPrompt,
                currentQ.questionText.textDirection,
            );
            this.reviewSequencer.updateCurrentQuestionText(modifiedCardText);
        } catch (error) {
            // User cancelled the edit modal
            if (error !== undefined) {
                console.error("Failed to edit question text:", error);
            }
        }
    };
}
