import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { SchedNote } from "src/core/models/ReviewDeck";
import { DataLocation } from "src/dataStore/dataLocation";
import { globalDateProvider } from "src/utils/DateProvider";
import { SidebarStats } from "./types";
import { moment } from "obsidian";
import { DEFAULT_SETTINGS } from "src/settings/settings";

/**
 * Calculates the number of days until the note is repeated
 */
export function calculateDaysUntilDue(dueUnix: number, plugin: SRPlugin): number {
    const now =
        plugin.data.settings.dataLocation === DataLocation.SaveOnNoteFile
            ? Date.now()
            : globalDateProvider.endOfToday.valueOf();

    return Math.ceil((dueUnix - now) / (24 * 3600 * 1000));
}

/**
 * Gets the group header based on the number of days
 */
export function getGroupTitle(nDays: number, dueUnix: number, plugin: SRPlugin): string {
    const showRelativeDays = plugin.data.settings.sidebarShowRelativeDays;

    if (nDays === -1) {
        return t("YESTERDAY");
    } else if (nDays === 0) {
        return t("TODAY");
    } else if (nDays === 1) {
        return t("TOMORROW");
    } else if (showRelativeDays && nDays < -1) {
        return t("OVERDUE_BY_DAYS", { count: Math.abs(nDays) });
    } else if (showRelativeDays && nDays > 1) {
        return t("IN_DAYS", { count: nDays });
    } else {
        const format = plugin.data.settings.sidebarDateFormat || DEFAULT_SETTINGS.sidebarDateFormat;
        return moment(dueUnix).format(format);
    }
}

/**
 * Calculates statistics for all decks
 */
export function calculateSidebarStats(plugin: SRPlugin): SidebarStats {
    let totalDue = 0;
    let totalNew = 0;

    const maxDaysToRender = plugin.data.settings.maxNDaysNotesReviewQueue;

    for (const deckKey in plugin.reviewDecks) {
        const deck = plugin.reviewDecks[deckKey];
        totalNew += deck.newNotes?.length || 0;

        if (deck.scheduledNotes) {
            for (const sNote of deck.scheduledNotes) {
                const nDays = calculateDaysUntilDue(sNote.dueUnix, plugin);

                if (nDays <= 0 && nDays > -maxDaysToRender) {
                    totalDue++;
                }
            }
        }
    }

    return { totalDue, totalNew };
}

/**
 * Calculates the number of active notes
 * new + expired + today
 */
export function calculateActiveNotesCount(plugin: SRPlugin): number {
    let activeCount = 0;

    for (const deckKey in plugin.reviewDecks) {
        const deck = plugin.reviewDecks[deckKey];

        activeCount += deck.newNotes?.length || 0;

        if (deck.scheduledNotes) {
            for (const sNote of deck.scheduledNotes) {
                const nDays = calculateDaysUntilDue(sNote.dueUnix, plugin);
                if (nDays <= 0) {
                    activeCount++;
                }
            }
        }
    }

    return activeCount;
}

/**
 * Calculates the number of active flashcards
 * new + due
 */
export function calculateActiveFlashcardsCount(plugin: SRPlugin): number {
    let activeCount = 0;

    if (!plugin.deckTree) {
        return 0;
    }

    const allDecks = plugin.deckTree.toDeckArray();

    for (const deck of allDecks) {
        activeCount += deck.newFlashcards?.length || 0;

        if (deck.dueFlashcards) {
            for (const card of deck.dueFlashcards) {
                if (card.isDue) {
                    activeCount++;
                }
            }
        }
    }

    return activeCount;
}

/**
 * Creates a unique key for a group of notes
 */
export function createGroupKey(deckName: string, groupTitle: string): string {
    return `${deckName}::${groupTitle}`;
}

/**
 * Checks if a note is active (due or overdue)
 */
export function isNoteActive(note: SchedNote, plugin: SRPlugin): boolean {
    const nDays = calculateDaysUntilDue(note.dueUnix, plugin);
    return nDays <= 0;
}

/**
 * Filters active notes from a list
 */
export function filterActiveNotes(notes: SchedNote[], plugin: SRPlugin): SchedNote[] {
    return notes.filter((note) => isNoteActive(note, plugin));
}
