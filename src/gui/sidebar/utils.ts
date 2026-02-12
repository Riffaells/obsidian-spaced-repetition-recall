import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { SchedNote } from "src/core/models/ReviewDeck";
import { globalDateProvider } from "src/utils/DateProvider";
import { SidebarStats } from "./types";
import { DEFAULT_SETTINGS } from "src/settings/settings";

/**
 * Calculates the number of days until the note is repeated
 * Always uses end of today for consistent grouping regardless of storage mode
 */
export function calculateDaysUntilDue(dueUnix: number, plugin: SRPlugin): number {
    const endOfToday = globalDateProvider.endOfToday.valueOf();
    return Math.ceil((dueUnix - endOfToday) / (24 * 3600 * 1000));
}

/**
 * Gets the group header based on the number of days
 */
export function getGroupTitle(nDays: number, dueUnix: number, plugin: SRPlugin): string {
    const showRelativeDays = plugin.data.settings.sidebarShowRelativeDays;
    const smartGroups = plugin.data.settings.sidebarSmartGroups;

    if (smartGroups && showRelativeDays) {
        return getSmartGroupTitle(nDays);
    }

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
        return window.moment(dueUnix).format(format);
    }
}

/**
 * Gets smart group title based on time ranges
 */
export function getSmartGroupTitle(nDays: number): string {
    // Overdue
    if (nDays < -30) {
        return t("OVERDUE_MORE_THAN_MONTH");
    } else if (nDays < -14) {
        return t("OVERDUE_MORE_THAN_2_WEEKS");
    } else if (nDays < -7) {
        return t("OVERDUE_MORE_THAN_WEEK");
    } else if (nDays < -1) {
        return t("OVERDUE_BY_DAYS", { count: Math.abs(nDays) });
    } else if (nDays === -1) {
        return t("YESTERDAY");
    }

    // Today
    if (nDays === 0) {
        return t("TODAY");
    }

    // Tomorrow
    if (nDays === 1) {
        return t("TOMORROW");
    }

    // Future - within a week
    if (nDays <= 7) {
        return t("IN_DAYS", { count: nDays });
    }

    // Future - within 2 weeks
    if (nDays <= 14) {
        return t("IN_ABOUT_WEEK");
    }

    // Future - within a month
    if (nDays <= 30) {
        return t("IN_ABOUT_MONTH");
    }

    // Future - within 2 months
    if (nDays <= 60) {
        return t("IN_ABOUT_2_MONTHS");
    }

    // Future - within 3 months
    if (nDays <= 90) {
        return t("IN_ABOUT_3_MONTHS");
    }

    // Future - more than 3 months
    return t("IN_MORE_THAN_3_MONTHS");
}

/**
 * Gets the group title for flashcards with time information
 * For cards due today but later, shows time remaining
 */
export function getFlashcardGroupTitle(dueUnix: number, isDue: boolean, plugin: SRPlugin): string {
    const now = Date.now();
    const showRelativeDays = plugin.data.settings.sidebarShowRelativeDays;

    // Calculate days until due
    const endOfToday = globalDateProvider.endOfToday.valueOf();
    const nDays = Math.ceil((dueUnix - endOfToday) / (24 * 3600 * 1000));

    // If card is due now
    if (isDue) {
        return t("DUE_CARDS");
    }

    // If card is due today but later (within the same day)
    if (dueUnix > now && dueUnix <= endOfToday) {
        const hoursUntilDue = Math.floor((dueUnix - now) / (3600 * 1000));
        const minutesUntilDue = Math.ceil((dueUnix - now) / (60 * 1000));

        if (hoursUntilDue >= 1) {
            return t("TODAY_LATER_HOURS", { hours: hoursUntilDue });
        } else if (minutesUntilDue > 0) {
            return t("TODAY_LATER_MINUTES", { minutes: minutesUntilDue });
        } else {
            return t("TODAY");
        }
    }

    // For future dates, use the standard logic
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
        return window.moment(dueUnix).format(format);
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
