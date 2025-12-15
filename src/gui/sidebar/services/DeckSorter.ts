import type SRPlugin from "src/main";
import { ReviewDeck, SchedNote } from "src/core/models/ReviewDeck";
import { Deck } from "src/core/models/Deck";
import { SortType, FilterType } from "../types";
import { calculateDaysUntilDue } from "../utils";

interface DeckStats {
    minDate: number;
    maxDate: number;
    count: number;
}

/**
 * Handles sorting logic for both note decks and flashcard decks
 */
export class DeckSorter {
    private readonly plugin: SRPlugin;
    private readonly statsCache = new Map<string, DeckStats>();
    private currentFilter: FilterType = FilterType.ALL;

    constructor(plugin: SRPlugin) {
        this.plugin = plugin;
    }

    public setFilter(filter: FilterType): void {
        this.currentFilter = filter;
    }

    public sortNoteDecks(decks: ReviewDeck[], sortType: SortType): ReviewDeck[] {
        this.statsCache.clear();
        const sorted = [...decks];

        switch (sortType) {
            case SortType.DATE_ASC:
                sorted.sort((a, b) => this.getStats(a).minDate - this.getStats(b).minDate);
                break;
            case SortType.DATE_DESC:
                sorted.sort((a, b) => this.getStats(b).maxDate - this.getStats(a).maxDate);
                break;
            case SortType.COUNT_DESC:
                sorted.sort((a, b) => this.getStats(b).count - this.getStats(a).count);
                break;
            case SortType.COUNT_ASC:
                sorted.sort((a, b) => this.getStats(a).count - this.getStats(b).count);
                break;
            case SortType.NAME_ASC:
                sorted.sort((a, b) => a.deckName.localeCompare(b.deckName));
                break;
            case SortType.NAME_DESC:
                sorted.sort((a, b) => b.deckName.localeCompare(a.deckName));
                break;
        }

        return sorted;
    }

    public sortFlashcardDecks(decks: Deck[], sortType: SortType): Deck[] {
        const sorted = [...decks];
        const getCardCount = (deck: Deck) =>
            (deck.newFlashcards?.length || 0) + (deck.dueFlashcards?.length || 0);

        switch (sortType) {
            case SortType.DATE_ASC:
                sorted.sort((a, b) => this.getMinDueDate(a) - this.getMinDueDate(b));
                break;
            case SortType.DATE_DESC:
                sorted.sort((a, b) => this.getMaxDueDate(b) - this.getMaxDueDate(a));
                break;
            case SortType.COUNT_DESC:
                sorted.sort((a, b) => getCardCount(b) - getCardCount(a));
                break;
            case SortType.COUNT_ASC:
                sorted.sort((a, b) => getCardCount(a) - getCardCount(b));
                break;
            case SortType.NAME_ASC:
                sorted.sort((a, b) => a.deckName.localeCompare(b.deckName));
                break;
            case SortType.NAME_DESC:
                sorted.sort((a, b) => b.deckName.localeCompare(a.deckName));
                break;
        }

        return sorted;
    }

    private getStats(deck: ReviewDeck): DeckStats {
        const cached = this.statsCache.get(deck.deckName);
        if (cached) return cached;

        const stats: DeckStats = {
            minDate: this.calculateMinDueDate(deck),
            maxDate: this.calculateMaxDueDate(deck),
            count: this.calculateNotesCount(deck),
        };

        this.statsCache.set(deck.deckName, stats);
        return stats;
    }

    private calculateMinDueDate(deck: ReviewDeck): number {
        if (!deck.dueNotesCount || !deck.scheduledNotes?.length) {
            return Date.now();
        }

        let minDate = Infinity;
        for (const note of deck.scheduledNotes) {
            if (note.dueUnix && note.dueUnix < minDate) {
                minDate = note.dueUnix;
            }
        }

        return minDate === Infinity ? Date.now() : minDate;
    }

    private calculateMaxDueDate(deck: ReviewDeck): number {
        if (!deck.dueNotesCount || !deck.scheduledNotes?.length) {
            return Date.now();
        }

        let maxDate = 0;
        for (const note of deck.scheduledNotes) {
            if (note.dueUnix && note.dueUnix > maxDate) {
                maxDate = note.dueUnix;
            }
        }

        return maxDate === 0 ? Date.now() : maxDate;
    }

    private calculateNotesCount(deck: ReviewDeck): number {
        const newNotesCount = deck.newNotes?.length || 0;

        if (!deck.scheduledNotes) {
            return this.currentFilter === FilterType.REVIEWED ? 0 : newNotesCount;
        }

        switch (this.currentFilter) {
            case FilterType.ALL:
                return newNotesCount + deck.scheduledNotes.length;

            case FilterType.ACTIVE: {
                const dueCount = deck.scheduledNotes.filter(
                    (note: SchedNote) => calculateDaysUntilDue(note.dueUnix, this.plugin) <= 0,
                ).length;
                return newNotesCount + dueCount;
            }

            case FilterType.REVIEWED:
                return deck.scheduledNotes.filter(
                    (note: SchedNote) => calculateDaysUntilDue(note.dueUnix, this.plugin) > 0,
                ).length;

            default:
                return 0;
        }
    }

    private getMinDueDate(deck: Deck): number {
        if (!deck.dueFlashcards?.length) {
            return Date.now();
        }

        let minDate = Infinity;
        for (const card of deck.dueFlashcards) {
            if (card.isDue && card.scheduleInfo?.dueDate) {
                const dueUnix = card.scheduleInfo.dueDate.valueOf();
                if (dueUnix < minDate) {
                    minDate = dueUnix;
                }
            }
        }

        return minDate === Infinity ? Date.now() : minDate;
    }

    private getMaxDueDate(deck: Deck): number {
        if (!deck.dueFlashcards?.length) {
            return Date.now();
        }

        let maxDate = 0;
        for (const card of deck.dueFlashcards) {
            if (card.scheduleInfo?.dueDate) {
                const dueUnix = card.scheduleInfo.dueDate.valueOf();
                if (dueUnix > maxDate) {
                    maxDate = dueUnix;
                }
            }
        }

        return maxDate === 0 ? Date.now() : maxDate;
    }
}
