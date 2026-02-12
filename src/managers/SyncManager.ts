import { FrontMatterCache, getAllTags, TFile } from "obsidian";
import * as graph from "pagerank.js";
import { Deck, DeckTreeFilter } from "src/core/models/Deck";
import { NoteEaseList } from "src/core/scheduling/NoteEaseList";
import { LinkRank } from "src/algorithms/priorities/linkPageranks";
import { FlashcardReviewMode } from "src/core/scheduling/FlashcardReviewMode";
import { TagService } from "src/core/services/TagService";
import { NoteFileLoader } from "src/core/services/NoteFileLoader";
import { TopicPath } from "src/core/services/TopicPath";
import { ItemTrans } from "src/dataStore/itemTrans";
import { NoteEaseCalculator } from "src/core/scheduling/NoteEaseCalculator";
import { DeckTreeStatsCalculator } from "src/core/scheduling/DeckTreeStatsCalculator";
import { setDueDates } from "src/algorithms/balance/balance";
import { IReviewNote } from "src/reviewNote/review-note";
import { CardListType } from "src/core/models/CardListType";
import { ReviewDeck } from "src/core/models/ReviewDeck";
import { t } from "src/lang/helpers";
import { Logger } from "src/utils/Logger";
import { cyrb53 } from "src/utils/utils";
import type SRPlugin from "src/main";
import type { Note } from "src/core/models/Note";

const logger = Logger.create("SyncManager");

export class SyncManager {
    constructor(private plugin: SRPlugin) {}

    async sync(reviewMode = FlashcardReviewMode.Review): Promise<void> {
        const plugin = this.plugin;
        const settings = plugin.data.settings;

        if (plugin.syncLock) {
            return;
        }
        plugin.syncLock = true;

        try {
            // Reset state
            this.resetState();

            // Handle bury list
            this.handleBuryList();

            // Check settings hash and invalidate cache if needed
            this.checkSettingsCache();

            // Build tag cache
            TagService.buildTagCache(plugin.app, settings);

            // Get and filter notes
            const notes = this.getFilteredNotes();

            // Process notes
            await this.processNotes(notes);

            // Sync note reviews
            await IReviewNote.getInstance().sync(notes, plugin.reviewDecks, plugin.easeByPath);

            // Filter and sort decks
            this.processDeckTree(reviewMode);

            // Calculate stats
            this.calculateStats();

            // Update UI
            this.updateUI();

            // Debug info
            if (settings.showSchedulingDebugMessages) {
                plugin.showSyncInfo();
                logger.debug("Sync completed", {
                    timeTaken: Date.now() - window.moment(Date.now()).valueOf(),
                });
            }
        } finally {
            plugin.syncLock = false;
        }
    }

    private resetState(): void {
        const plugin = this.plugin;
        graph.reset();
        plugin.easeByPath = new NoteEaseList(plugin.data.settings);
        plugin.linkRank = new LinkRank(plugin.data.settings, plugin.app.metadataCache);
        plugin.reviewDecks = {};
    }

    private handleBuryList(): void {
        const plugin = this.plugin;
        const now = window.moment(Date.now());
        const todayDate: string = now.format("YYYY-MM-DD");

        if (todayDate !== plugin.data.buryListDate) {
            plugin.data.buryListDate = todayDate;
            plugin.data.buryList = [];
            plugin.questionPostponementList.clear();
        }
    }

    private checkSettingsCache(): void {
        const plugin = this.plugin;
        const currentHash = this.computeSettingsHash();
        const settingsChanged = plugin.store.data.settingsHash !== currentHash;

        if (settingsChanged) {
            logger.info("Settings changed, invalidating note cache");
            plugin.store.data.trackedFiles.forEach((tf) => {
                tf.scanMtime = 0;
                tf.cachedFlashcards = undefined;
            });
            plugin.store.data.settingsHash = currentHash;
        }
    }

    private getFilteredNotes(): TFile[] {
        const plugin = this.plugin;
        let notes: TFile[] = plugin.app.vault.getMarkdownFiles();

        notes = notes.filter((noteFile) => {
            const fileCachedData = plugin.app.metadataCache.getFileCache(noteFile) || {};
            const tags = getAllTags(fileCachedData) || [];
            const isIgnoredTags = plugin.data.settings.tagsToIgnore.some((igntag) =>
                tags.some((notetag) => notetag.startsWith(igntag)),
            );
            return (
                !TagService.isPathInNoteIgnoreFolder(plugin.data.settings, noteFile.path) &&
                !isIgnoredTags
            );
        });

        return notes;
    }

    private async processNotes(notes: TFile[]): Promise<void> {
        const plugin = this.plugin;
        const fullDeckTree = new Deck("root", null);

        plugin.linkRank.readLinks(notes);

        await Promise.all(
            notes.map(async (noteFile) => {
                const trackedFile = plugin.store.getTrackedFile(noteFile.path);
                let note: Note;

                // Check cache: mtime must match and we must have cached flashcards
                if (
                    trackedFile &&
                    trackedFile.scanMtime === noteFile.stat.mtime &&
                    trackedFile.cachedFlashcards
                ) {
                    note = this.loadNoteFromCache(noteFile, trackedFile);
                } else {
                    note = await plugin.loadNote(noteFile);

                    // Skip if note failed to load
                    if (!note) {
                        return;
                    }

                    // Update cache
                    if (trackedFile && note.parsedFlashcards) {
                        trackedFile.scanMtime = noteFile.stat.mtime;
                        trackedFile.cachedFlashcards = note.parsedFlashcards;
                    }
                }

                if (note.questionList.length > 0) {
                    const flashcardsInNoteAvgEase: number = NoteEaseCalculator.Calculate(
                        note,
                        plugin.data.settings,
                    );
                    note.appendCardsToDeck(fullDeckTree);

                    if (flashcardsInNoteAvgEase > 0) {
                        plugin.easeByPath.setEaseForPath(note.filePath, flashcardsInNoteAvgEase);
                    }
                }
            }),
        );

        plugin.deckTree = fullDeckTree;
    }

    private loadNoteFromCache(noteFile: TFile, trackedFile: any): Note {
        const plugin = this.plugin;
        const loader = new NoteFileLoader(plugin.data.settings);
        const srFile = plugin.createSrTFile(noteFile);
        const folderTopicPath = TopicPath.getFolderPathFromFilename(
            srFile,
            plugin.data.settings,
        );
        const note = loader.reconstituteNote(
            srFile,
            trackedFile.cachedFlashcards,
            plugin.getObsidianRtlSetting(),
            folderTopicPath,
        );

        ItemTrans.updateCardsSchedbyItems(note, folderTopicPath);
        note.createMultiCloze(plugin.data.settings);
        return note;
    }

    private processDeckTree(reviewMode: FlashcardReviewMode): void {
        const plugin = this.plugin;

        // Reviewable cards are all except those with the "edit later" tag
        plugin.deckTree = DeckTreeFilter.filterForReviewableCards(plugin.deckTree);

        // Sort the deck names
        plugin.deckTree.sortSubdecksList();

        // Sort flashcards by line number to maintain question order
        plugin.deckTree.sortFlashcardsByLineNumber();

        plugin.remainingDeckTree = DeckTreeFilter.filterForRemainingCards(
            plugin.questionPostponementList,
            plugin.deckTree,
            reviewMode,
        );
    }

    private calculateStats(): void {
        const plugin = this.plugin;
        const calc: DeckTreeStatsCalculator = new DeckTreeStatsCalculator();
        plugin.cardStats = calc.calculate(plugin.deckTree);
        setDueDates(plugin.cardStats.delayedDays.dict, plugin.cardStats.delayedDays.dict);
    }

    private updateUI(): void {
        const plugin = this.plugin;
        plugin.reviewManager.updateAndSortDueNotes();

        const fbar = plugin.reviewFloatBar;
        fbar.cardtotalCB = () => {
            return plugin.remainingDeckTree.getCardCount(CardListType.All, true);
        };
        fbar.notetotalCB = () => {
            return plugin.reviewManager.noteStats.getTotalCount();
        };
    }

    syncNotes(notes: TFile[]): void {
        const plugin = this.plugin;

        notes.forEach((noteFile) => {
            const fileCachedData = plugin.app.metadataCache.getFileCache(noteFile) || {};
            const frontmatter: FrontMatterCache | Record<string, unknown> =
                fileCachedData.frontmatter || {};
            const tags = getAllTags(fileCachedData) || [];

            let shouldIgnore = true;
            const matchedNoteTags = [];

            for (const tagToReview of plugin.data.settings.tagsToReview) {
                if (tags.some((tag) => tag === tagToReview || tag.startsWith(tagToReview + "/"))) {
                    if (!Object.prototype.hasOwnProperty.call(plugin.reviewDecks, tagToReview)) {
                        plugin.reviewDecks[tagToReview] = new ReviewDeck(tagToReview);
                    }
                    matchedNoteTags.push(tagToReview);
                    shouldIgnore = false;
                    break;
                }
            }

            if (shouldIgnore) {
                return;
            }

            // File has no scheduling information
            if (
                !(
                    Object.prototype.hasOwnProperty.call(frontmatter, "sr-due") &&
                    Object.prototype.hasOwnProperty.call(frontmatter, "sr-interval") &&
                    Object.prototype.hasOwnProperty.call(frontmatter, "sr-ease")
                )
            ) {
                for (const matchedNoteTag of matchedNoteTags) {
                    plugin.reviewDecks[matchedNoteTag].newNotes.push({ note: noteFile });
                }
                return;
            }

            const dueUnix: number = window
                .moment(frontmatter["sr-due"], ["YYYY-MM-DD", "DD-MM-YYYY", "ddd MMM DD YYYY"])
                .valueOf();

            const ease: number = frontmatter["sr-ease"];
            plugin.easeByPath.setEaseForPath(noteFile.path, ease);

            const interval = Number(frontmatter["sr-interval"]);

            for (const matchedNoteTag of matchedNoteTags) {
                plugin.reviewDecks[matchedNoteTag].scheduledNotes.push({
                    note: noteFile,
                    dueUnix,
                    interval,
                    ease,
                });
            }
        });
    }

    private computeSettingsHash(): string {
        const plugin = this.plugin;
        const settingsToHash = {
            rules: plugin.data.settings.flashcardRules,
            multiCloze: plugin.data.settings.multiClozeCard,
            highlights: plugin.data.settings.convertHighlightsToClozes,
            bold: plugin.data.settings.convertBoldTextToClozes,
            curly: plugin.data.settings.convertCurlyBracketsToClozes,
            clozePatterns: plugin.data.settings.clozePatterns,
            separators: [
                plugin.data.settings.singleLineCardSeparator,
                plugin.data.settings.singleLineReversedCardSeparator,
                plugin.data.settings.multilineCardSeparator,
                plugin.data.settings.multilineReversedCardSeparator,
                plugin.data.settings.multilineCardEndMarker,
            ],
            foldersToDecks: plugin.data.settings.convertFoldersToDecks,
        };
        return cyrb53(JSON.stringify(settingsToHash)).toString();
    }
}
