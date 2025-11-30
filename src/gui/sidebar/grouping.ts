import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { Card } from "src/Card";
import { SchedNote } from "src/ReviewDeck";
import { calculateDaysUntilDue, getGroupTitle } from "./utils";
import { FilterType } from "./types";

export function groupFlashcards(
    cards: Card[],
    plugin: SRPlugin,
    filter: FilterType,
): Record<string, Card[]> {
    const groupedCards: Record<string, Card[]> = {};

    for (const card of cards) {
        if (filter === FilterType.ACTIVE && !card.isDue) {
            continue;
        }
        if (filter === FilterType.REVIEWED && card.isDue) {
            continue;
        }

        let groupTitle: string;
        if (card.isDue) {
            groupTitle = t("DUE_CARDS");
        } else if (card.scheduleInfo?.dueDate) {
            const dueUnix = card.scheduleInfo.dueDate.valueOf();
            const nDays = calculateDaysUntilDue(dueUnix, plugin);
            groupTitle = getGroupTitle(nDays, dueUnix, plugin);
        } else {
            // Fallback for cards that are not due but have no schedule info
            groupTitle = t("REVIEWED");
        }

        if (!groupedCards[groupTitle]) {
            groupedCards[groupTitle] = [];
        }
        groupedCards[groupTitle].push(card);
    }

    return groupedCards;
}

export function groupNotes(
    notes: SchedNote[],
    plugin: SRPlugin,
    filter: FilterType,
): Record<string, SchedNote[]> {
    const groupedNotes: Record<string, SchedNote[]> = {};
    const maxDaysToRender = plugin.data.settings.maxNDaysNotesReviewQueue;

    const sortedNotes =
        filter === FilterType.REVIEWED
            ? [...notes].sort((a, b) => b.dueUnix - a.dueUnix)
            : [...notes].sort((a, b) => a.dueUnix - b.dueUnix);

    for (const sNote of sortedNotes) {
        const nDays = calculateDaysUntilDue(sNote.dueUnix, plugin);
        const isDue = nDays <= 0;

        if (nDays > maxDaysToRender) {
            continue;
        }
        if (filter === FilterType.ACTIVE && !isDue) {
            continue;
        }
        if (filter === FilterType.REVIEWED && isDue) {
            continue;
        }

        const groupTitle = getGroupTitle(nDays, sNote.dueUnix, plugin);
        if (!groupedNotes[groupTitle]) {
            groupedNotes[groupTitle] = [];
        }
        groupedNotes[groupTitle].push(sNote);
    }
    return groupedNotes;
}
