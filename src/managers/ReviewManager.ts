import { TFile, Notice } from "obsidian";
import SRPlugin from "../main";
import { ReviewResponse } from "../core/scheduling/scheduling";
import { algorithmNames } from "../algorithms/algorithms";
import { SchedNote, ReviewDeck } from "../core/models/ReviewDeck";
import { Stats } from "../core/services/stats";
import { setDueDates } from "../algorithms/balance/balance";
import { t } from "../lang/helpers";
import { SettingsUtil } from "../settings/settings";
import { IReviewNote } from "../reviewNote/review-note";
import { ReviewDeckSelectionModal } from "../gui/modals/reviewDeckSelectionModal";
import { MixQueSet } from "../dataStore/mixQueSet";
import { RepetitionItem } from "../dataStore/repetitionItem";
import { DataLocation } from "../dataStore/dataLocation";
import { debug } from "../utils/utils_recall";

export class ReviewManager {
    private plugin: SRPlugin;
    public dueNotesCount = 0;
    public dueDatesNotes: Record<number, number> = {};
    public noteStats: Stats;

    constructor(plugin: SRPlugin) {
        this.plugin = plugin;
        this.noteStats = new Stats();
    }

    async saveReviewResponse(note: TFile, response: ReviewResponse): Promise<void> {
        const settings = this.plugin.data.settings;
        if (SettingsUtil.isPathInNoteIgnoreFolder(settings, note.path)) {
            new Notice(t("NOTE_IN_IGNORED_FOLDER"));
            return;
        }
        const revnote = IReviewNote.getInstance();
        if (!revnote.tagCheck(note)) {
            return;
        }

        let ease: number;
        if (revnote.isNew && settings.algorithm !== algorithmNames.Fsrs) {
            ease = this.plugin.linkRank.getContribution(note, this.plugin.easeByPath).ease;
        }
        const result = await revnote.responseProcess(note, response, ease);
        if (settings.burySiblingCardsByNoteReview) {
            this.plugin.data.buryList.push(...result.buryList);
            await this.plugin.savePluginData();
        }

        // Update note's properties to update our due notes.
        await this.postponeResponse(note, result.sNote);
    }

    async postponeResponse(note: TFile, sNote: SchedNote) {
        const settings = this.plugin.data.settings;

        Object.values(this.plugin.reviewDecks).forEach((reviewDeck: ReviewDeck) => {
            let wasDueInDeck = false;
            reviewDeck.scheduledNotes.findIndex((newNote, ind) => {
                if (newNote.note.path === note.path) {
                    reviewDeck.scheduledNotes[ind] = sNote;
                    wasDueInDeck = true;
                    return true;
                }
            });

            // It was a new note, remove it from the new notes and schedule it.
            if (!wasDueInDeck) {
                const newidx = reviewDeck.newNotes.findIndex(
                    (newNote) => newNote.note.path === note.path,
                );
                if (newidx >= 0) {
                    reviewDeck.newNotes.splice(newidx, 1);
                    reviewDeck.scheduledNotes.push(sNote);
                }
            }
        });

        this.updateAndSortDueNotes();
        this.plugin.app.workspace.trigger("sr:note-reviewed", note);

        if (!this.plugin.data.settings.reviewResponseFloatBar) {
            new Notice(t("RESPONSE_RECEIVED"));
        }

        // if (MixQueSet.isCard() && this.plugin.reviewFloatBar.openNextCardCB) {
        //     return;
        // }

        if (settings.autoNextNote) {
            if (!this.plugin.lastSelectedReviewDeck) {
                const reviewDeckKeys: string[] = Object.values(this.plugin.reviewDecks)
                    .filter((deck) => {
                        return deck.dueNotesCount + deck.newNotes.length > 0;
                    })
                    .map((deck) => {
                        return deck.deckName;
                    });
                if (reviewDeckKeys.length > 0)
                    this.plugin.lastSelectedReviewDeck = reviewDeckKeys[0];
                else {
                    new Notice(t("ALL_CAUGHT_UP"));
                    return;
                }
            }
            await this.reviewNextNote(this.plugin.lastSelectedReviewDeck);
        }
    }

    public updateAndSortDueNotes() {
        this.dueNotesCount = 0;
        this.dueDatesNotes = {};
        this.noteStats = new Stats();

        const now = window.moment(Date.now());
        Object.values(this.plugin.reviewDecks).forEach((reviewDeck: ReviewDeck) => {
            this.dueNotesCount += reviewDeck.dueNotesCount;
            this.noteStats.newCount += reviewDeck.newNotes.length;
            reviewDeck.scheduledNotes.forEach((scheduledNote: SchedNote) => {
                const nDays: number = Math.ceil(
                    (scheduledNote.dueUnix - now.valueOf()) / (24 * 3600 * 1000),
                );
                if (!Object.prototype.hasOwnProperty.call(this.dueDatesNotes, nDays)) {
                    this.dueDatesNotes[nDays] = 0;
                }
                this.dueDatesNotes[nDays]++;
                this.noteStats.update(nDays, scheduledNote.interval, scheduledNote.ease);
            });

            reviewDeck.sortNotes(this.plugin.linkRank.pageranks);
        });

        setDueDates(this.noteStats.delayedDays.dict, this.plugin.cardStats.delayedDays.dict);

        this.plugin.updateStatusBar();
        this.plugin.app.workspace.trigger("sr:stats-updated");
    }

    async reviewNextNoteModal(): Promise<void> {
        const reviewDeckNames: string[] = Object.keys(this.plugin.reviewDecks);
        if (reviewDeckNames.length === 1) {
            this.reviewNextNote(reviewDeckNames[0]);
        } else if (this.plugin.data.settings.reviewingNoteDirectly) {
            const rdname =
                this.plugin.lastSelectedReviewDeck ??
                IReviewNote.getDeckNameForReviewDirectly(this.plugin.reviewDecks) ??
                reviewDeckNames[0];
            this.reviewNextNote(rdname);
        } else {
            const deckSelectionModal = new ReviewDeckSelectionModal(
                this.plugin.app,
                reviewDeckNames,
            );
            deckSelectionModal.submitCallback = (deckKey: string) => this.reviewNextNote(deckKey);
            deckSelectionModal.open();
        }
    }

    async reviewNextNote(deckKey: string): Promise<void> {
        if (!Object.prototype.hasOwnProperty.call(this.plugin.reviewDecks, deckKey)) {
            new Notice(t("NO_DECK_EXISTS", { deckName: deckKey }));
            return;
        }

        this.plugin.lastSelectedReviewDeck = deckKey;
        const deck = this.plugin.reviewDecks[deckKey];
        const queue = this.plugin.store.data.queues;
        const mqs = MixQueSet.getInstance();
        let show = false;
        let item;
        let index = -1;

        MixQueSet.calcNext(deck.dueNotesCount, deck.newNotes.length);

        const isPreviewUndueNote = (item: RepetitionItem) => {
            return item.nextReview > Date.now() && !item.isDue;
        };
        const fShowItemInfo = (item: RepetitionItem, msg: string) => {
            if (this.plugin.data.settings.dataLocation !== DataLocation.SaveOnNoteFile) {
                if (isPreviewUndueNote(item)) {
                    const calcDueCnt = deck.scheduledNotes.filter(
                        (snote) => snote.dueUnix < Date.now(),
                    ).length;
                    if (calcDueCnt !== deck.dueNotesCount) {
                        debug(
                            "check cnt",
                            0,
                            msg,
                            `${deck.deckName} due cnt error: calc ${calcDueCnt}, dnc: ${deck.dueNotesCount}`,
                        );
                        console.debug("schedNotes:", deck.scheduledNotes);
                    }
                    const id = "obsidian-spaced-repetition-recall:view-item-info";
                    // eslint-disable-next-line
                    // @ts-ignore
                    this.plugin.app.commands.executeCommandById(id);
                }
            }
        };

        if (MixQueSet.isDue() && deck.dueNotesCount > 0) {
            index = IReviewNote.getNextNoteIndex(
                deck.dueNotesCount,
                this.plugin.data.settings.openRandomNote,
            );
            await this.plugin.app.workspace.getLeaf().openFile(deck.scheduledNotes[index].note);
            item = deck.scheduledNotes[index].item;
            fShowItemInfo(item, "scheduledNoes index: " + index);
            show = true;
            // return;
        } else if (MixQueSet.isDue() && queue.queueSize(deckKey) > 0) {
            item = this.plugin.store.getNext(deckKey);
            fShowItemInfo(item, "queue");
            const path = this.plugin.store.getFilePath(item);
            const note = this.plugin.app.vault.getAbstractFileByPath(path) as TFile;
            if (item != null && item.isTracked && path != null && note instanceof TFile) {
                await this.plugin.app.workspace.getLeaf().openFile(note);
                show = true;
            } else {
                // error
                console.error("reviewNextNote: item or path is null");
            }
        } else if (deck.newNotes.length > 0) {
            index = IReviewNote.getNextNoteIndex(
                deck.newNotes.length,
                this.plugin.data.settings.openRandomNote,
            );
            await this.plugin.app.workspace.getLeaf().openFile(deck.newNotes[index].note);
            show = true;
            // return;
        }

        if (show) {
            // this.plugin.reviewFloatBar.openNextCardCB = false;
            return;
        }

        if (this.plugin.data.settings.reviewResponseFloatBar) {
            // this.plugin.reviewFloatBar.openNextCardCB = true;
            new Notice(t("ALL_CAUGHT_UP"));
            return;
        }

        new Notice(t("ALL_CAUGHT_UP"));
    }
}
