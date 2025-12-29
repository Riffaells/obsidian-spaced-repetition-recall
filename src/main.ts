import {
    FrontMatterCache,
    getAllTags,
    Notice,
    Plugin,
    TAbstractFile,
    TFile,
    WorkspaceLeaf,
} from "obsidian";
import * as graph from "pagerank.js";

import { DEFAULT_SETTINGS, SRSettings } from "src/settings/settings";
import { TagService } from "src/core/services/TagService";
import { TrackedFile } from "./dataStore/trackedFile";
import { RepetitionItem } from "./dataStore/repetitionItem";
import { EventBus } from "./core/infrastructure/EventBus";
import { FlashcardModal } from "./gui/modals/FlashcardModal";
import { StatsModal } from "./gui/modals/StatsModal";
import { REVIEW_QUEUE_VIEW_TYPE, ReviewQueueListView } from "src/gui/sidebar/Sidebar";
import { ReviewResponse, schedule } from "src/core/scheduling/scheduling";
import { SCHEDULING_INFO_REGEX, YAML_FRONT_MATTER_REGEX } from "src/constants";
import { ReviewDeck, SchedNote } from "src/core/models/ReviewDeck";
import { t } from "src/lang/helpers";
import { appIcon } from "src/icons/appicon";
import { TopicPath } from "./core/services/TopicPath";
import { CardListType, Deck, DeckTreeFilter } from "./core/models/Deck";
import { Stats } from "./core/services/stats";
import {
    FlashcardReviewMode,
    FlashcardReviewSequencer as FlashcardReviewSequencer,
    IFlashcardReviewSequencer as IFlashcardReviewSequencer,
} from "./core/scheduling/FlashcardReviewSequencer";
import {
    CardOrder,
    DeckOrder,
    DeckTreeIterator,
    IDeckTreeIterator,
    IIteratorOrder,
} from "./core/scheduling/DeckTreeIterator";
import { CardScheduleCalculator } from "./core/scheduling/CardSchedule";
import { Note } from "./core/models/Note";
import { NoteFileLoader } from "./core/services/NoteFileLoader";
import { ISRFile, SrTFile as SrTFile } from "./core/services/SRFile";
import { NoteEaseCalculator } from "./core/scheduling/NoteEaseCalculator";
import { DeckTreeStatsCalculator } from "./core/scheduling/DeckTreeStatsCalculator";
import { NoteEaseList } from "./core/scheduling/NoteEaseList";
import { QuestionPostponementList } from "./core/scheduling/QuestionPostponementList";
import { TextDirection } from "./utils/TextDirection";
import { convertToStringOrEmpty } from "./utils/utils";
import { getObsidianRtlSetting } from "./utils/obsidian-hacks";
import { setDebugParser } from "src/parser";

// https://github.com/martin-jw/obsidian-recall
import { DataStore } from "./dataStore/data";
import CommandManager from "./managers/CommandManager";
import { ReviewManager } from "src/managers/ReviewManager";
import { SrsAlgorithm } from "src/algorithms/algorithms";
import { setupServices } from "./core/storage/setupServices";
import { ServiceContainer } from "./core/infrastructure/ServiceContainer";
import { DataStoreAdapter } from "./dataStore/DataStoreAdapter";

import { reviewResponseModal } from "./gui/modals/reviewresponse-modal";
import { isVersionNewerThanOther } from "./utils/utils_recall";
import { ReleaseNotes } from "./gui/modals/ReleaseNotes";

import { algorithms } from "src/algorithms/algorithms_switch";
import { DataLocation } from "./dataStore/dataLocation";
import { addFileMenuEvt, registerTrackFileEvents } from "src/events/trackFileEvents";
import { ItemTrans } from "./dataStore/itemTrans";
import { LinkRank } from "src/algorithms/priorities/linkPageranks";
import { Queue } from "./dataStore/queue";
import { setDueDates } from "./algorithms/balance/balance";
import { IReviewNote } from "./reviewNote/review-note";
import { ReviewView } from "././gui/views/reviewView";
import { MixQueSet } from "./dataStore/mixQueSet";
import { IAdapter } from "./dataStore/adapter";
import TabViewManager from "./gui/views/TabViewManager";
import { TabView } from "./gui/views/TabView";
import { SRSettingTab } from "src/gui/settings/SettingsTab";
import { NoteReviewButtonsManager } from "src/gui/components/NoteReviewButtons";
import { SettingsMigration } from "src/core/settings/SettingsMigration";

interface PluginData {
    settings: SRSettings;
    buryDate: string;
    // hashes of card texts
    // should work as long as user doesn't modify card's text
    // which covers most of the cases
    buryList: string[];
    historyDeck: string | null;
}

const DEFAULT_DATA: PluginData = {
    settings: DEFAULT_SETTINGS,
    buryDate: "",
    buryList: [],
    historyDeck: null,
};


export default class SRPlugin extends Plugin {
    private isSRInFocus: boolean = false;
    private statusBar: HTMLElement;
    public data: PluginData;
    public tabViewManager: TabViewManager;
    public syncLock = false;

    public reviewDecks: { [deckKey: string]: ReviewDeck } = {};
    public lastSelectedReviewDeck: string;

    public easeByPath: NoteEaseList;
    private questionPostponementList: QuestionPostponementList;
    public linkRank: LinkRank;

    public deckTree: Deck = new Deck("root", null);
    public remainingDeckTree: Deck;
    public cardStats: Stats;

    // https://github.com/martin-jw/obsidian-recall/blob/main/src/main.ts
    public store: DataStore;
    public commands: CommandManager;
    public algorithm: SrsAlgorithm;
    public reviewFloatBar: reviewResponseModal;
    public settingTab: SRSettingTab;
    public noteReviewManager: NoteReviewButtonsManager;
    public reviewManager: ReviewManager;

    // New architecture components
    public serviceContainer: ServiceContainer;

    public clock_start: number;
    private static _instance: SRPlugin;
    static getInstance() {
        return SRPlugin._instance;
    }

    async onload(): Promise<void> {
        // Initialize tab view manager
        this.tabViewManager = new TabViewManager(this);

        // Clean up any existing views first (in case of hot reload)
        this.tabViewManager.closeAllTabViews();

        // Register views
        this.tabViewManager.registerAllTabViews();

        SRPlugin._instance = this;
        IAdapter.create(this.app);
        await this.loadPluginData();
        this.easeByPath = new NoteEaseList(this.data.settings);
        this.questionPostponementList = new QuestionPostponementList(
            this,
            this.data.settings,
            this.data.buryList,
        );

        appIcon();

        const PLUGIN_VERSION = this.manifest.version;
        const obsidianJustInstalled = this.data.settings.previousRelease === "0.0.0";
        if (isVersionNewerThanOther(PLUGIN_VERSION, this.data.settings.previousRelease)) {
            new ReleaseNotes(this.app, this, obsidianJustInstalled ? null : PLUGIN_VERSION).open();
        }

        const settings = this.data.settings;
        
        // Migrate settings if needed
        if (SettingsMigration.migrate(settings)) {
            await this.savePluginData();
            console.log("SR: Settings migrated to new format");
        }

        this.algorithm = algorithms[settings.algorithm];
        this.algorithm.updateSettings(settings.algorithmSettings[settings.algorithm]);
        settings.algorithmSettings[settings.algorithm] = this.algorithm.settings;
        await this.savePluginData();

        // Initialize new architecture services
        console.log("SR: Initializing new architecture services...");
        this.serviceContainer = setupServices(
            this.app.vault.adapter,
            this.app.vault,
            settings,
            this.manifest.dir,
            this.algorithm
        );

        // Subscribe to events from the new architecture
        const eventBus = this.serviceContainer.get<EventBus>("eventBus");
        eventBus.on("item:updated", (item: RepetitionItem) => {
            console.log("SR: Item updated event:", item.ID);
        });
        eventBus.on("item:reviewed", (item: RepetitionItem) => {
            console.log("SR: Item reviewed event:", item.ID);
        });
        eventBus.on("file:updated", (file: TrackedFile) => {
            console.log("SR: File updated event:", file.path);
        });
        console.log("SR: New architecture services initialized successfully");

        IReviewNote.create(
            settings,
            this.sync_onNote.bind(this),
            this.tagCheck.bind(this),
            this.noteIsNew.bind(this),
            this.saveReviewResponse_onNote.bind(this),
        );
        ReviewView.create(this, this.data.settings);
        MixQueSet.create(settings.mixDue, settings.mixNew, settings.mixCard, settings.mixNote);
        this.commands = new CommandManager(this);
        this.commands.addCommands();
        if (this.data.settings.showSchedulingDebugMessages) {
            this.commands.addDebugCommands();
        }

        this.reviewFloatBar = new reviewResponseModal(this, settings);
        this.reviewFloatBar.submitCallback = (resp) => {
            const openFile: TFile | null = this.app.workspace.getActiveFile();
            if (openFile && openFile.extension === "md") {
                this.reviewManager.saveReviewResponse(openFile, resp);
            }
        };
        this.reviewFloatBar.openNextNoteCB = () => {
            if (!this.lastSelectedReviewDeck) {
                const reviewDeckKeys: string[] = Object.values(this.reviewDecks)
                    .filter((deck) => {
                        return deck.dueNotesCount + deck.newNotes.length > 0;
                    })
                    .map((deck) => {
                        return deck.deckName;
                    });
                if (reviewDeckKeys.length > 0) this.lastSelectedReviewDeck = reviewDeckKeys[0];
                else {
                    new Notice(t("ALL_CAUGHT_UP"));
                    return;
                }
            }
            this.reviewManager.reviewNextNote(this.lastSelectedReviewDeck);
        };

        registerTrackFileEvents(this);

        // Initialize compact review buttons manager
        this.noteReviewManager = new NoteReviewButtonsManager(this);
        this.reviewManager = new ReviewManager(this);

        if (this.data.settings.dataLocation !== DataLocation.SaveOnNoteFile) {
            this.registerInterval(
                window.setInterval(
                    async () => {
                        await this.sync();
                        // this.store.save();
                    },
                    30 * 60 * 1000,
                ),
            );
        }

        this.statusBar = this.addStatusBarItem();
        this.statusBar.classList.add("mod-clickable");
        this.statusBar.setAttribute("aria-label", t("OPEN_NOTE_FOR_REVIEW"));
        this.statusBar.setAttribute("aria-label-position", "top");
        this.statusBar.addEventListener("click", async () => {
            if (!this.syncLock) {
                await this.sync();
                await this.reviewManager.reviewNextNoteModal();
            }
        });

        this.addRibbonIcon("SpacedRepIcon", t("REVIEW_CARDS"), async () => {
            if (!this.syncLock) {
                await this.sync();
                if (this.data.settings.openViewInNewTab) {
                    await this.tabViewManager.openSRTabView(FlashcardReviewMode.Review);
                } else {
                    this.openFlashcardModal(
                        this.deckTree,
                        this.remainingDeckTree,
                        FlashcardReviewMode.Review,
                    );
                }
            }
        });

        if (!this.data.settings.disableFileMenuReviewOptions) {
            this.registerEvent(
                this.app.workspace.on("file-menu", (menu, fileish: TAbstractFile) => {
                    if (fileish instanceof TFile && fileish.extension === "md") {
                        const options = this.algorithm.srsOptions();
                        const algo = this.data.settings.algorithm;
                        const showtext = this.data.settings.responseOptionBtnsText;
                        for (let i = 1; i < options.length; i++) {
                            menu.addItem((item) => {
                                // item.setTitle(t("REVIEW_EASY_FILE_MENU"))
                                item.setTitle(
                                    t("REVIEW_DIFFICULTY_FILE_MENU", {
                                        difficulty: showtext[algo][i],
                                    }),
                                )
                                    .setIcon("SpacedRepIcon")
                                    .onClick(() => {
                                        this.reviewManager.saveReviewResponse(fileish, i);
                                    });
                            });
                        }
                    }

                    addFileMenuEvt(this, menu, fileish);
                }),
            );
        }

        this.addCommand({
            id: "srs-note-review-open-note",
            name: t("OPEN_NOTE_FOR_REVIEW"),
            callback: async () => {
                if (!this.syncLock) {
                    await this.sync();
                    await this.reviewManager.reviewNextNoteModal();
                }
            },
        });

        const options = this.algorithm.srsOptions();
        const algo = this.data.settings.algorithm;
        const showtext = this.data.settings.responseOptionBtnsText;
        options.map((option, i) => {
            this.addCommand({
                id: "srs-note-review-" + option.toLowerCase(),
                name: t("REVIEW_NOTE_DIFFICULTY_CMD", {
                    difficulty: showtext[algo][i],
                }),
                callback: () => {
                    const openFile: TFile | null = this.app.workspace.getActiveFile();
                    if (openFile && openFile.extension === "md") {
                        this.reviewManager.saveReviewResponse(openFile, i);
                    }
                },
            });
        });

        this.addCommand({
            id: "srs-review-flashcards",
            name: t("REVIEW_ALL_CARDS"),
            callback: async () => {
                if (this.syncLock) {
                    return;
                }

                await this.sync();

                if (this.data.settings.openViewInNewTab) {
                    await this.tabViewManager.openSRTabView(FlashcardReviewMode.Review);
                } else {
                    this.openFlashcardModal(
                        this.deckTree,
                        this.remainingDeckTree,
                        FlashcardReviewMode.Review,
                    );
                }
            },
        });

        this.addCommand({
            id: "srs-cram-flashcards",
            name: t("CRAM_ALL_CARDS"),
            callback: async () => {
                await this.sync(FlashcardReviewMode.Cram);
                if (this.data.settings.openViewInNewTab) {
                    await this.tabViewManager.openSRTabView(FlashcardReviewMode.Cram);
                } else {
                    this.openFlashcardModal(
                        this.deckTree,
                        this.remainingDeckTree,
                        FlashcardReviewMode.Cram,
                    );
                }
            },
        });

        this.addCommand({
            id: "srs-review-flashcards-in-note",
            name: t("REVIEW_CARDS_IN_NOTE"),
            callback: async () => {
                const openFile: TFile | null = this.app.workspace.getActiveFile();
                if (!openFile || openFile.extension !== "md") {
                    return;
                }

                if (this.data.settings.openViewInNewTab) {
                    await this.tabViewManager.openSRTabView(FlashcardReviewMode.Review, openFile);
                } else {
                    await this.openFlashcardModalForSingleNote(
                        openFile,
                        FlashcardReviewMode.Review,
                    );
                }
            },
        });

        this.addCommand({
            id: "srs-cram-flashcards-in-note",
            name: t("CRAM_CARDS_IN_NOTE"),
            callback: async () => {
                const openFile: TFile | null = this.app.workspace.getActiveFile();
                if (!openFile || openFile.extension !== "md") {
                    return;
                }

                if (this.data.settings.openViewInNewTab) {
                    await this.tabViewManager.openSRTabView(FlashcardReviewMode.Cram, openFile);
                } else {
                    await this.openFlashcardModalForSingleNote(openFile, FlashcardReviewMode.Cram);
                }
            },
        });

        this.addCommand({
            id: "srs-view-stats",
            name: t("VIEW_STATS"),
            callback: async () => {
                if (!this.syncLock) {
                    await this.sync();
                    new StatsModal(this.app, this).open();
                }
            },
        });

        this.addCommand({
            id: "srs-open-review-queue-view",
            name: t("OPEN_REVIEW_QUEUE_VIEW"),
            callback: async () => {
                await this.openReviewQueueView();
            },
        });

        this.settingTab = new SRSettingTab(this.app, this);
        this.addSettingTab(this.settingTab);

        this.app.workspace.onLayoutReady(async () => {
            await this.initReviewQueueView();
            // Sync after layout is ready
            if (!this.syncLock) {
                await this.sync();
            }
        });

        this.registerSRFocusListener();
    }

    onunload(): void {
        console.log("Unloading Obsidian spaced repetition Recall. ...");
        this.app.workspace.getLeavesOfType(REVIEW_QUEUE_VIEW_TYPE).forEach((leaf) => leaf.detach());

        if (this.tabViewManager) {
            this.tabViewManager.closeAllTabViews();
            this.tabViewManager.unregisterAllTabViews();
        }

        if (this.reviewFloatBar) {
            this.reviewFloatBar.close();
        }

        // Clean up note review buttons
        if (this.noteReviewManager) {
            this.noteReviewManager.destroy();
        }
    }

    private async openFlashcardModalForSingleNote(
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
    ): void {
        const deckIterator = SRPlugin.createDeckTreeIterator(this.data.settings, remainingDeckTree);
        const cardScheduleCalculator = new CardScheduleCalculator(
            this.data.settings,
            this.easeByPath,
        );
        const reviewSequencer: IFlashcardReviewSequencer = new FlashcardReviewSequencer(
            reviewMode,
            deckIterator,
            this.data.settings,
            cardScheduleCalculator,
            this.questionPostponementList,
        );

        reviewSequencer.setDeckTree(fullDeckTree, remainingDeckTree);
        reviewResponseModal.getInstance().cardtotalCB = () => {
            return remainingDeckTree.getCardCount(CardListType.All, true);
        };
        new FlashcardModal(this.app, this, this.data.settings, reviewSequencer, reviewMode).open();
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

    // @logExecutionTime()
    async sync(reviewMode = FlashcardReviewMode.Review): Promise<void> {
        // this.clock_start = Date.now();
        const settings = this.data.settings;

        if (this.syncLock) {
            return;
        }
        this.syncLock = true;

        // reset notes stuff
        graph.reset();
        this.easeByPath = new NoteEaseList(this.data.settings);
        this.linkRank = new LinkRank(this.data.settings, this.app.metadataCache);
        this.reviewDecks = {};

        // reset flashcards stuff
        const fullDeckTree = new Deck("root", null);

        const now = window.moment(Date.now());
        const todayDate: string = now.format("YYYY-MM-DD");
        // clear bury list if we've changed dates
        if (todayDate !== this.data.buryDate) {
            this.data.buryDate = todayDate;
            this.questionPostponementList.clear();

            // The following isn't needed for plug-in functionality; but can aid during debugging
            await this.savePluginData();
        }

        // Build tag cache for optimization
        TagService.buildTagCache(this.app, this.data.settings);

        let notes: TFile[] = this.app.vault.getMarkdownFiles();
        notes = notes.filter((noteFile) => {
            const fileCachedData = this.app.metadataCache.getFileCache(noteFile) || {};
            const tags = getAllTags(fileCachedData) || [];
            const isIgnoredTags = this.data.settings.tagsToIgnore.some((igntag) =>
                tags.some((notetag) => notetag.startsWith(igntag)),
            );
            return (
                !TagService.isPathInNoteIgnoreFolder(this.data.settings, noteFile.path) &&
                !isIgnoredTags
            );
        });
        this.linkRank.readLinks(notes);
        await Promise.all(
            notes.map(async (noteFile) => {
                const note: Note = await this.loadNote(noteFile);
                if (note.questionList.length > 0) {
                    const flashcardsInNoteAvgEase: number = NoteEaseCalculator.Calculate(
                        note,
                        this.data.settings,
                    );
                    note.appendCardsToDeck(fullDeckTree);

                    if (flashcardsInNoteAvgEase > 0) {
                        this.easeByPath.setEaseForPath(note.filePath, flashcardsInNoteAvgEase);
                    }
                }
            }),
        );
        await IReviewNote.getInstance().sync(notes, this.reviewDecks, this.easeByPath);

        // Reviewable cards are all except those with the "edit later" tag
        this.deckTree = DeckTreeFilter.filterForReviewableCards(fullDeckTree);

        // sort the deck names
        this.deckTree.sortSubdecksList();
        // sort flashcards by line number to maintain question order
        this.deckTree.sortFlashcardsByLineNumber();
        this.remainingDeckTree = DeckTreeFilter.filterForRemainingCards(
            this.questionPostponementList,
            this.deckTree,
            reviewMode,
        );
        const calc: DeckTreeStatsCalculator = new DeckTreeStatsCalculator();
        this.cardStats = calc.calculate(this.deckTree);
        setDueDates(this.cardStats.delayedDays.dict, this.cardStats.delayedDays.dict);

        if (this.data.settings.showSchedulingDebugMessages) {
            this.showSyncInfo();
        }

        if (this.data.settings.showSchedulingDebugMessages) {
            console.log(
                "SR: " +
                    t("SYNC_TIME_TAKEN", {
                        t: Date.now() - now.valueOf(),
                    }),
            );
        }

        this.reviewManager.updateAndSortDueNotes();
        const fbar = this.reviewFloatBar;
        fbar.cardtotalCB = () => {
            return this.remainingDeckTree.getCardCount(CardListType.All, true);
        };
        fbar.notetotalCB = () => {
            return this.reviewManager.noteStats.getTotalCount();
        };
        this.syncLock = false;
    }

    private sync_onNote(notes: TFile[]) {
        notes.map((noteFile) => {
            const fileCachedData = this.app.metadataCache.getFileCache(noteFile) || {};

            const frontmatter: FrontMatterCache | Record<string, unknown> =
                fileCachedData.frontmatter || {};
            const tags = getAllTags(fileCachedData) || [];

            let shouldIgnore = true;
            const matchedNoteTags = [];

            for (const tagToReview of this.data.settings.tagsToReview) {
                if (tags.some((tag) => tag === tagToReview || tag.startsWith(tagToReview + "/"))) {
                    if (!Object.prototype.hasOwnProperty.call(this.reviewDecks, tagToReview)) {
                        this.reviewDecks[tagToReview] = new ReviewDeck(tagToReview);
                    }
                    matchedNoteTags.push(tagToReview);
                    shouldIgnore = false;
                    break;
                }
            }
            if (shouldIgnore) {
                return;
            }

            // file has no scheduling information
            if (
                !(
                    Object.prototype.hasOwnProperty.call(frontmatter, "sr-due") &&
                    Object.prototype.hasOwnProperty.call(frontmatter, "sr-interval") &&
                    Object.prototype.hasOwnProperty.call(frontmatter, "sr-ease")
                )
            ) {
                for (const matchedNoteTag of matchedNoteTags) {
                    this.reviewDecks[matchedNoteTag].newNotes.push({ note: noteFile });
                }
                return;
            }

            const dueUnix: number = window
                .moment(frontmatter["sr-due"], ["YYYY-MM-DD", "DD-MM-YYYY", "ddd MMM DD YYYY"])
                .valueOf();

            const ease: number = frontmatter["sr-ease"];
            this.easeByPath.setEaseForPath(noteFile.path, ease);

            const interval = Number(frontmatter["sr-interval"]);

            for (const matchedNoteTag of matchedNoteTags) {
                this.reviewDecks[matchedNoteTag].scheduledNotes.push({
                    note: noteFile,
                    dueUnix,
                    interval,
                    ease,
                });
            }
        });
    }

    async loadNote(noteFile: TFile): Promise<Note> {
        const loader: NoteFileLoader = new NoteFileLoader(this.data.settings);
        const srFile: ISRFile = this.createSrTFile(noteFile);
        const folderTopicPath: TopicPath = TopicPath.getFolderPathFromFilename(
            srFile,
            this.data.settings,
        );

        const note: Note = await loader.load(
            this.createSrTFile(noteFile),
            this.getObsidianRtlSetting(),
            folderTopicPath,
        );
        ItemTrans.updateCardsSchedbyItems(note, folderTopicPath);
        note.createMultiCloze(this.data.settings);
        if (note.hasChanged) {
            await note.writeNoteFile(this.data.settings);
        }
        return note;
    }

    private getObsidianRtlSetting(): TextDirection {
        return getObsidianRtlSetting(this.app);
    }

    // return false if is ignored
    tagCheck(note: TFile) {
        const fileCachedData = this.app.metadataCache.getFileCache(note) || {};

        const tags = getAllTags(fileCachedData) || [];
        let shouldIgnore = true;
        if (TagService.isPathInNoteIgnoreFolder(this.data.settings, note.path)) {
            new Notice(t("NOTE_IN_IGNORED_FOLDER"));
            return false;
        }
        // if (
        //     this.data.settings.tagsToIgnore.some((igntag) =>
        //         tags.some((notetag) => notetag.startsWith(igntag)),
        //     )
        // ) {
        //     new Notice(t("NOTE_IN_IGNORED_TAGS"));
        //     return false;
        // }

        for (const tag of tags) {
            if (
                this.data.settings.tagsToReview.some(
                    (tagToReview) => tag === tagToReview || tag.startsWith(tagToReview + "/"),
                )
            ) {
                shouldIgnore = false;
                break;
            }
        }

        if (shouldIgnore) {
            new Notice(t("PLEASE_TAG_NOTE"));
            return false;
        }
        return true;
    }

    noteIsNew(note: TFile): boolean {
        const fileCachedData = this.app.metadataCache.getFileCache(note) || {};
        const frontmatter: FrontMatterCache | Record<string, unknown> =
            fileCachedData.frontmatter || {};
        return !(
            Object.prototype.hasOwnProperty.call(frontmatter, "sr-due") &&
            Object.prototype.hasOwnProperty.call(frontmatter, "sr-interval") &&
            Object.prototype.hasOwnProperty.call(frontmatter, "sr-ease")
        );
    }
    async saveReviewResponse_onNote(note: TFile, response: ReviewResponse, ease: number) {
        const fileCachedData = this.app.metadataCache.getFileCache(note) || {};
        const frontmatter: FrontMatterCache | Record<string, unknown> =
            fileCachedData.frontmatter || {};

        let fileText: string = await this.app.vault.read(note);
        let interval: number, delayBeforeReview: number;
        const now: number = Date.now();
        // new note
        if (this.noteIsNew(note)) {
            ease = this.linkRank.getContribution(note, this.easeByPath).ease;
            ease = Math.round(ease);
            interval = 1.0;
            delayBeforeReview = 0;
        } else {
            interval = frontmatter["sr-interval"];
            ease = frontmatter["sr-ease"];
            delayBeforeReview =
                now -
                window
                    .moment(frontmatter["sr-due"], ["YYYY-MM-DD", "DD-MM-YYYY", "ddd MMM DD YYYY"])
                    .valueOf();
        }

        const schedObj: Record<string, number> = schedule(
            response,
            interval,
            ease,
            delayBeforeReview,
            this.data.settings,
            this.reviewManager.dueDatesNotes,
        );
        interval = schedObj.interval;
        ease = schedObj.ease;

        const due = window.moment(now + interval * 24 * 3600 * 1000);
        const dueString: string = due.format("YYYY-MM-DD");

        // check if scheduling info exists
        if (SCHEDULING_INFO_REGEX.test(fileText)) {
            const schedulingInfo = SCHEDULING_INFO_REGEX.exec(fileText);
            fileText = fileText.replace(
                SCHEDULING_INFO_REGEX,
                `---\n${schedulingInfo[1]}sr-due: ${dueString}\n` +
                    `sr-interval: ${interval}\nsr-ease: ${ease}\n` +
                    `${schedulingInfo[5]}---\n`,
            );
        } else if (YAML_FRONT_MATTER_REGEX.test(fileText)) {
            // new note with existing YAML front matter
            const existingYaml = YAML_FRONT_MATTER_REGEX.exec(fileText);
            fileText = fileText.replace(
                YAML_FRONT_MATTER_REGEX,
                `---\n${existingYaml[1]}sr-due: ${dueString}\n` +
                    `sr-interval: ${interval}\nsr-ease: ${ease}\n---`,
            );
        } else {
            fileText =
                `---\nsr-due: ${dueString}\nsr-interval: ${interval}\n` +
                `sr-ease: ${ease}\n---\n\n${fileText}`;
        }

        await this.app.vault.modify(note, fileText);

        const buryList: string[] = [];
        if (this.data.settings.burySiblingCardsByNoteReview) {
            const noteX: Note = await this.loadNote(note);
            for (const question of noteX.questionList) {
                buryList.push(question.questionText.textHash);
            }
            await this.savePluginData();
        }
        const snote: SchedNote = { note, dueUnix: due.valueOf() };
        return { sNote: snote, buryList };
    }

    async reviewNextNoteModal(): Promise<void> {
        return this.reviewManager.reviewNextNoteModal();
    }

    async reviewNextNote(deckKey: string): Promise<void> {
        ReviewView.nextReviewNotice(IReviewNote.minNextView, Queue.getInstance().laterSize);

        this.reviewFloatBar.close();
        this.reviewFloatBar.close();
        this.app.workspace.trigger("sr:stats-updated");
        new Notice(t("ALL_CAUGHT_UP"));
        new Notice(t("ALL_CAUGHT_UP"));
    }

    createSrTFile(note: TFile): SrTFile {
        return new SrTFile(this.app.vault, this.app.metadataCache, note);
    }

    async loadPluginData(): Promise<void> {
        const loadedData: PluginData = await this.loadData();
        this.data = Object.assign({}, DEFAULT_DATA, loadedData);
        this.data.settings = Object.assign({}, DEFAULT_SETTINGS, this.data.settings);
        this.store = new DataStore(this.data.settings, this.manifest.dir);
        await this.store.load();
        setDebugParser(this.data.settings.showParserDebugMessages);
    }

    async savePluginData(): Promise<void> {
        // Clear pattern cache when settings change
        TagService.clearPatternCache();
        await this.saveData(this.data);
    }

    private getActiveLeaf(type: string): WorkspaceLeaf | null {
        const leaves = this.app.workspace.getLeavesOfType(type);
        if (leaves.length == 0) {
            return null;
        }

        return leaves[0];
    }

    private async initReviewQueueView() {
        // Unregister existing view first to prevent duplicates
        this.app.workspace.detachLeavesOfType(REVIEW_QUEUE_VIEW_TYPE);

        this.registerView(REVIEW_QUEUE_VIEW_TYPE, (leaf) => new ReviewQueueListView(leaf, this));

        if (
            this.data.settings.enableNoteReviewPaneOnStartup &&
            this.getActiveLeaf(REVIEW_QUEUE_VIEW_TYPE) == null
        ) {
            await this.activateReviewQueueViewPanel();
        }
    }

    private async activateReviewQueueViewPanel() {
        await this.app.workspace.getRightLeaf(false).setViewState({
            type: REVIEW_QUEUE_VIEW_TYPE,
            active: true,
        });
    }

    private async openReviewQueueView() {
        let reviewQueueLeaf = this.getActiveLeaf(REVIEW_QUEUE_VIEW_TYPE);
        if (reviewQueueLeaf == null) {
            await this.activateReviewQueueViewPanel();
            reviewQueueLeaf = this.getActiveLeaf(REVIEW_QUEUE_VIEW_TYPE);
        }

        if (reviewQueueLeaf !== null) {
            this.app.workspace.revealLeaf(reviewQueueLeaf);
            this.reviewManager.updateAndSortDueNotes();
        }
    }

    showSyncInfo() {
        console.log(`SR: ${t("EASES")}`, this.easeByPath);
        console.log(`SR: ${t("DECKS")}`, this.deckTree);
        console.log(`SR: NOTE ${t("DECKS")}`, this.reviewDecks);
        console.log("SR: cardStats ", this.cardStats);
        console.log("SR: noteStats ", this.reviewManager.noteStats);
        console.log("SR: this.dueDatesNotes", this.reviewManager.dueDatesNotes);
    }

    updateStatusBar() {
        this.statusBar.setText(
            t("STATUS_BAR", {
                dueNotesCount: this.reviewManager.noteStats.onDueCount, // this.dueNotesCount, + this.store.data.queues.todaylatterSize()
                dueFlashcardsCount: this.remainingDeckTree.getDistinctCardCount(
                    CardListType.All,
                    true,
                ),
            }),
        );
    }

    public registerSRFocusListener() {
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", this.handleFocusChange.bind(this)),
        );
    }

    public removeSRFocusListener() {
        this.setSRViewInFocus(false);
        this.app.workspace.off("active-leaf-change", this.handleFocusChange.bind(this));
    }

    public async getPreparedDecksForSingleNoteReview(
        file: TFile,
        mode: FlashcardReviewMode,
    ): Promise<{ deckTree: Deck; remainingDeckTree: Deck; mode: FlashcardReviewMode }> {
        const note: Note = await this.loadNote(file);

        const deckTree = new Deck("root", null);
        note.appendCardsToDeck(deckTree);
        const remainingDeckTree = DeckTreeFilter.filterForRemainingCards(
            this.questionPostponementList,
            deckTree,
            mode,
        );

        return { deckTree, remainingDeckTree, mode };
    }

    public getPreparedReviewSequencer(
        fullDeckTree: Deck,
        remainingDeckTree: Deck,
        reviewMode: FlashcardReviewMode,
    ): { reviewSequencer: IFlashcardReviewSequencer; mode: FlashcardReviewMode } {
        const deckIterator: IDeckTreeIterator = SRPlugin.createDeckTreeIterator(
            this.data.settings,
            remainingDeckTree,
        );

        const cardScheduleCalculator = new CardScheduleCalculator(
            this.data.settings,
            this.easeByPath,
        );
        const reviewSequencer: IFlashcardReviewSequencer = new FlashcardReviewSequencer(
            reviewMode,
            deckIterator,
            this.data.settings,
            cardScheduleCalculator,
            this.questionPostponementList,
        );

        reviewSequencer.setDeckTree(fullDeckTree, remainingDeckTree);
        return { reviewSequencer, mode: reviewMode };
    }

    public handleFocusChange(leaf: WorkspaceLeaf | null) {
        this.setSRViewInFocus(leaf !== null && leaf.view instanceof TabView);
    }

    public setSRViewInFocus(value: boolean) {
        this.isSRInFocus = value;
    }

    public getSRInFocusState(): boolean {
        return this.isSRInFocus;
    }
}
