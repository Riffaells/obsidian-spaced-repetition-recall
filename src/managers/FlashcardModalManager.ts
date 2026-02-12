import { TFile } from "obsidian";
import SRPlugin from "../main";
import { FlashcardModal } from "../gui/modals/FlashcardModal";
import { FlashcardReviewMode } from "../core/scheduling/FlashcardReviewMode";
import { Deck, DeckTreeFilter } from "../core/models/Deck";
import { IFlashcardReviewSequencer, FlashcardReviewSequencer } from "../core/scheduling/FlashcardReviewSequencer";
import { CardScheduleCalculator } from "../core/scheduling/CardSchedule";
import { CardOrder, DeckOrder, DeckTreeIterator, IDeckTreeIterator, IIteratorOrder } from "../core/scheduling/DeckTreeIterator";
import { CardListType } from "../core/models/CardListType";
import { reviewResponseModal } from "../gui/modals/reviewresponse-modal";
import { SRSettings } from "../settings/settings";

export class FlashcardModalManager {
    private plugin: SRPlugin;
    private flashcardModalInstance: FlashcardModal | null = null;

    constructor(plugin: SRPlugin) {
        this.plugin = plugin;
    }

    public async openFlashcardModalForSingleNote(
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

    public openFlashcardModal(
        fullDeckTree: Deck,
        remainingDeckTree: Deck,
        reviewMode: FlashcardReviewMode,
        startDeck?: Deck,
    ): void {
        const deckIterator = FlashcardModalManager.createDeckTreeIterator(this.plugin.data.settings, remainingDeckTree);
        const cardScheduleCalculator = new CardScheduleCalculator(
            this.plugin.data.settings,
            this.plugin.easeByPath,
        );
        const reviewSequencer: IFlashcardReviewSequencer = new FlashcardReviewSequencer(
            reviewMode,
            deckIterator,
            this.plugin.data.settings,
            cardScheduleCalculator,
            (this.plugin as any).questionPostponementList, // Accessing public property (after modification)
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
                this.plugin.app,
                this.plugin,
                this.plugin.data.settings,
                reviewSequencer,
                reviewMode,
            );
        } else {
            // Update the sequencer and mode for existing modal
            this.flashcardModalInstance.updateReviewSession(reviewSequencer, reviewMode);
        }
        
        this.flashcardModalInstance.open();
    }

    public async getPreparedDecksForSingleNoteReview(
        file: TFile,
        mode: FlashcardReviewMode,
    ): Promise<{ deckTree: Deck; remainingDeckTree: Deck; mode: FlashcardReviewMode }> {
        const note = await this.plugin.loadNote(file);

        const deckTree = new Deck("root", null);
        if (note) {
            note.appendCardsToDeck(deckTree);
        }
        
        const remainingDeckTree = DeckTreeFilter.filterForRemainingCards(
            (this.plugin as any).questionPostponementList,
            deckTree,
            mode,
        );

        return { deckTree, remainingDeckTree, mode };
    }

    private static createDeckTreeIterator(settings: SRSettings, baseDeck: Deck): IDeckTreeIterator {
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
