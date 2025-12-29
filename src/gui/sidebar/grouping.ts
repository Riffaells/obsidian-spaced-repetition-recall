import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { Card } from "src/core/models/Card";
import { SchedNote } from "src/core/models/ReviewDeck";
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
    const maxDaysToRender = plugin.data.settings.maxNDaysNotesReviewQueue;

    // Pre-filter and group in one pass
    const filteredNotes: Array<{ note: SchedNote; nDays: number; groupTitle: string }> = [];

    for (const sNote of notes) {
        const nDays = calculateDaysUntilDue(sNote.dueUnix, plugin);

        if (nDays > maxDaysToRender) {
            continue;
        }

        const isDue = nDays <= 0;
        if (filter === FilterType.ACTIVE && !isDue) {
            continue;
        }
        if (filter === FilterType.REVIEWED && isDue) {
            continue;
        }

        const groupTitle = getGroupTitle(nDays, sNote.dueUnix, plugin);
        filteredNotes.push({ note: sNote, nDays, groupTitle });
    }

    // Sort filtered notes by due date
    filteredNotes.sort((a, b) =>
        filter === FilterType.REVIEWED ? b.note.dueUnix - a.note.dueUnix : a.note.dueUnix - b.note.dueUnix
    );

    // Group sorted notes with nDays for later sorting
    const groupsWithDays: Map<string, { notes: SchedNote[]; minDays: number }> = new Map();
    
    for (const item of filteredNotes) {
        const existing = groupsWithDays.get(item.groupTitle);
        if (existing) {
            existing.notes.push(item.note);
            existing.minDays = Math.min(existing.minDays, item.nDays);
        } else {
            groupsWithDays.set(item.groupTitle, { notes: [item.note], minDays: item.nDays });
        }
    }

    // Sort groups by minDays (overdue first, then today, then future)
    const sortedGroups = Array.from(groupsWithDays.entries()).sort((a, b) => {
        return a[1].minDays - b[1].minDays;
    });

    // Convert back to Record
    const groupedNotes: Record<string, SchedNote[]> = {};
    for (const [title, data] of sortedGroups) {
        groupedNotes[title] = data.notes;
    }

    return groupedNotes;
}
