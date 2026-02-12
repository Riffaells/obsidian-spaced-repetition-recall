import { TFile } from "obsidian";
import { Deck, DeckTreeFilter } from "src/core/models/Deck";
import { FlashcardReviewMode } from "src/core/scheduling/FlashcardReviewMode";
import { FlashcardModal } from "src/gui/modals/FlashcardModal";
import { CardListType } from "src/core/models/CardListType";
import {
    FlashcardReviewSequencer,
    IFlashcardReviewSequencer,
} from "src/core/scheduling/FlashcardReviewSequencer";
import {
    CardOrder,
    DeckOrder,
    DeckTreeIterator,
    IDeckTreeIterator,
    IIteratorOrder,
} from "src/core/scheduling/DeckTreeIterator";
import { CardScheduleCalculator } from "src/core/scheduling/CardSchedule";
import { reviewResponseModal } from "src/gui/modals/reviewresponse-modal";
import { SRSettings } from "src/settings/settings";
import type SRPlugin from "src/main";

export class FlashcardOperations {
    private flashcardModalInstance: FlashcardModal | null = null;

    constructor(private plugin: SRPlugin) {}

    async openFlashcardModalForSingleNote(
        noteFile: TFile,
        reviewMode: FlashcardReviewMode,
    ): Promise<void> {
        const singleNoteDeckData = await this.getPreparedDecksForSingleNoteReview(
            noteFile,
            reviewMode,
        );
        this.openFlashcardModal(
            singleNoteDeckData.deckTree,
            singleNoteDeckData.remainingDeckTree,
            reviewMode,
        );
    }

    openFlashcardModal(
        fullDeckTree: Deck,
        remainingDeckTree: Deck,
        reviewMode: FlashcardReviewMode,
        startDeck?: Deck,
    ): void {
        const plugin = this.plugin;
        const deckIterator = FlashcardOperations.createDeckTreeIterator(
            plugin.data.settings,
            remainingDeckTree,
        );
        const cardScheduleCalculator = new CardScheduleCalculator(
            plugin.data.settings,
            plugin.easeByPath,
        );
        const reviewSequencer: IFlashcardReviewSequencer = new FlashcardReviewSequencer(
            reviewMode,
            deckIterator,
            plugin.data.settings,
            cardScheduleCalculator,
            plugin.questionPostponementList,
        );

        reviewSequencer.setDeckTree(fullDeckTree, remainingDeckTree);
        if (startDeck) {
            reviewSequencer.setCurrentDeck(startDeck.getTopicPath());
        }
        reviewResponseModal.getInstance().cardtotalCB = () => {
            return remainingDeckTree.getCardCount(CardListType.All, true);
        };

        // Optimization: reuse modal instance instead of creating new one each time
        if (!this.flashcardModalInstance) {
            this.flashcardModalInstance = new FlashcardModal(
                plugin.app,
                plugin,
                plugin.data.settings,
                reviewSequencer,
                reviewMode,
            );
        } else {
            // Update the sequencer and mode for existing modal
            this.flashcardModalInstance.updateReviewSession(reviewSequencer, reviewMode);
        }

        this.flashcardModalInstance.open();
    }

    async getPreparedDecksForSingleNoteReview(
        file: TFile,
        mode: FlashcardReviewMode,
    ): Promise<{ deckTree: Deck; remainingDeckTree: Deck; mode: FlashcardReviewMode }> {
        const plugin = this.plugin;
        const note = await plugin.loadNote(file);

        const deckTree = new Deck("root", null);
        note.appendCardsToDeck(deckTree);
        const remainingDeckTree = DeckTreeFilter.filterForRemainingCards(
            plugin.questionPostponementList,
            deckTree,
            mode,
        );

        return { deckTree, remainingDeckTree, mode };
    }

    getPreparedReviewSequencer(
        fullDeckTree: Deck,
        remainingDeckTree: Deck,
        reviewMode: FlashcardReviewMode,
    ): { reviewSequencer: IFlashcardReviewSequencer; mode: FlashcardReviewMode } {
        const plugin = this.plugin;
        const deckIterator: IDeckTreeIterator = FlashcardOperations.createDeckTreeIterator(
            plugin.data.settings,
            remainingDeckTree,
        );

        const cardScheduleCalculator = new CardScheduleCalculator(
            plugin.data.settings,
            plugin.easeByPath,
        );
        const reviewSequencer: IFlashcardReviewSequencer = new FlashcardReviewSequencer(
            reviewMode,
            deckIterator,
            plugin.data.settings,
            cardScheduleCalculator,
            plugin.questionPostponementList,
        );

        reviewSequencer.setDeckTree(fullDeckTree, remainingDeckTree);
        return { reviewSequencer, mode: reviewMode };
    }

    static createDeckTreeIterator(settings: SRSettings, baseDeck: Deck): IDeckTreeIterator {
        let cardOrder: CardOrder = CardOrder[settings.flashcardCardOrder as keyof typeof CardOrder];
        if (cardOrder === undefined) cardOrder = CardOrder.DueFirstSequential;
        let deckOrder: DeckOrder = DeckOrder[settings.flashcardDeckOrder as keyof typeof DeckOrder];
        if (deckOrder === undefined) deckOrder = DeckOrder.PrevDeckComplete_Sequential;

        const iteratorOrder: IIteratorOrder = {
            deckOrder,
            cardOrder,
        };
        return new DeckTreeIterator(iteratorOrder, baseDeck);
    }
}
