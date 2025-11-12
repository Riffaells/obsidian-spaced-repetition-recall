import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { DataLocation } from "src/dataStore/dataLocation";
import { globalDateProvider } from "src/util/DateProvider";
import { SidebarStats } from "./types";
import { moment } from "obsidian";
import { DEFAULT_SETTINGS } from "src/settings";

/**
 * Calculates the number of days until the note is repeated
 */
export function calculateDaysUntilDue(dueUnix: number, plugin: SRPlugin): number {
    const now =
        plugin.data.settings.dataLocation === DataLocation.SaveOnNoteFile
            ? Date.now()
            : globalDateProvider.endofToday.valueOf();

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
 * Creates a unique key for a group of notes
 */
export function createGroupKey(deckName: string, groupTitle: string): string {
    return `${deckName}::${groupTitle}`;
}
