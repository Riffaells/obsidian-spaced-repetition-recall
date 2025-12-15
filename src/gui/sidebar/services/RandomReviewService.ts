import type SRPlugin from "src/main";
import { SchedNote } from "src/core/models/ReviewDeck";
import { Deck } from "src/core/models/Deck";
import { Card } from "src/core/models/Card";
import { FlashcardReviewMode } from "src/core/scheduling/FlashcardReviewSequencer";

/**
 * Handles opening random notes and flashcards for review
 */
export class RandomReviewService {
    private readonly plugin: SRPlugin;

    constructor(plugin: SRPlugin) {
        this.plugin = plugin;
    }

    public async openRandomNewNote(): Promise<void> {
        const allNewNotes = this.collectAllNewNotes();
        if (allNewNotes.length === 0) return;

        const randomNote = this.selectRandom(allNewNotes);
        await this.openNoteForReview(randomNote);
    }

    public async openRandomDueNote(): Promise<void> {
        const allDueNotes = this.collectAllDueNotes();
        if (allDueNotes.length === 0) return;

        const randomNote = this.selectRandom(allDueNotes);
        await this.openNoteForReview(randomNote);
    }

    public async openRandomNewCard(): Promise<void> {
        if (!this.plugin.deckTree) return;

        const allNewCards = this.collectAllNewCards();
        if (allNewCards.length === 0) return;

        const { card, deck } = this.selectRandom(allNewCards);
        await this.openFlashcardReview(card, deck, true);
    }

    public async openRandomDueCard(): Promise<void> {
        if (!this.plugin.deckTree) return;

        const allDueCards = this.collectAllDueCards();
        if (allDueCards.length === 0) return;

        const { card, deck } = this.selectRandom(allDueCards);
        await this.openFlashcardReview(card, deck, false);
    }

    private collectAllNewNotes(): SchedNote[] {
        const allNewNotes: SchedNote[] = [];

        for (const deck of Object.values(this.plugin.reviewDecks)) {
            if (deck.newNotes?.length > 0) {
                allNewNotes.push(...deck.newNotes);
            }
        }

        return allNewNotes;
    }

    private collectAllDueNotes(): SchedNote[] {
        const allDueNotes: SchedNote[] = [];
        const now = Date.now();

        for (const deck of Object.values(this.plugin.reviewDecks)) {
            if (deck.scheduledNotes?.length > 0) {
                for (const note of deck.scheduledNotes) {
                    if (note.dueUnix <= now) {
                        allDueNotes.push(note);
                    }
                }
            }
        }

        return allDueNotes;
    }

    private collectAllNewCards(): Array<{ card: Card; deck: Deck }> {
        const allDecks = this.plugin.deckTree.toDeckArray();
        const allNewCards: Array<{ card: Card; deck: Deck }> = [];

        for (const deck of allDecks) {
            if (deck.newFlashcards?.length > 0) {
                for (const card of deck.newFlashcards) {
                    allNewCards.push({ card, deck });
                }
            }
        }

        return allNewCards;
    }

    private collectAllDueCards(): Array<{ card: Card; deck: Deck }> {
        const allDecks = this.plugin.deckTree.toDeckArray();
        const allDueCards: Array<{ card: Card; deck: Deck }> = [];

        for (const deck of allDecks) {
            if (deck.dueFlashcards?.length > 0) {
                for (const card of deck.dueFlashcards) {
                    if (card.isDue) {
                        allDueCards.push({ card, deck });
                    }
                }
            }
        }

        return allDueCards;
    }

    private selectRandom<T>(items: T[]): T {
        const randomIndex = Math.floor(Math.random() * items.length);
        return items[randomIndex];
    }

    private async openNoteForReview(note: SchedNote): Promise<void> {
        this.plugin.lastSelectedReviewDeck = note.note.path;
        await this.plugin.app.workspace.getLeaf().openFile(note.note);

        const { DataLocation } = await import("src/dataStore/dataLocation");
        if (this.plugin.data.settings.dataLocation !== DataLocation.SaveOnNoteFile) {
            this.plugin.reviewFloatBar.display(note.item);
        }
    }

    private async openFlashcardReview(card: Card, deck: Deck, isNew: boolean): Promise<void> {
        await this.plugin.sync();

        const tempDeck = new Deck(deck.deckName, null);
        if (isNew) {
            tempDeck.newFlashcards.push(card);
        } else {
            tempDeck.dueFlashcards.push(card);
        }

        const rootDeck = new Deck(deck.deckName, null);
        rootDeck.subdecks.push(tempDeck);

        if (this.plugin.data.settings.openViewInNewTab) {
            await this.plugin.tabViewManager.openSRTabView(FlashcardReviewMode.Review);
        } else {
            this.plugin.openFlashcardModal(rootDeck, rootDeck, FlashcardReviewMode.Review);
        }
    }
}
