import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";

import { DEFAULT_SETTINGS, SRSettings } from "src/settings/settings";
import { Deck } from "./core/models/Deck";
import { Stats } from "./core/services/stats";
import { FlashcardReviewMode } from "./core/scheduling/FlashcardReviewMode";
import { NoteEaseList } from "./core/scheduling/NoteEaseList";
import { QuestionPostponementList } from "./core/scheduling/QuestionPostponementList";
import { DataStore } from "./dataStore/data";
import CommandManager from "./managers/CommandManager";
import { ReviewManager } from "src/managers/ReviewManager";
import { SrsAlgorithm } from "src/algorithms/algorithms";
import { ServiceContainer } from "./core/infrastructure/ServiceContainer";
import { LinkRank } from "src/algorithms/priorities/linkPageranks";
import { ReviewDeck } from "src/core/models/ReviewDeck";
import TabViewManager from "./gui/views/TabViewManager";
import { TabView } from "./gui/views/TabView";
import { DataLocation } from "./dataStore/dataLocation";
import { setDebugParser } from "src/parser";
import { TagService } from "src/core/services/TagService";
import { Logger } from "src/utils/Logger";
import { ISRFile, SrTFile } from "./core/services/SRFile";
import { TextDirection } from "./utils/TextDirection";
import { getObsidianRtlSetting } from "./utils/obsidian-hacks";
import { t } from "src/lang/helpers";
import { CardListType } from "./core/models/CardListType";

// New modular managers
import { PluginLifecycle } from "./managers/PluginLifecycle";
import { PluginCommands } from "./managers/PluginCommands";
import { PluginEventHandlers } from "./managers/PluginEventHandlers";
import { FlashcardOperations } from "./managers/FlashcardOperations";
import { NoteOperations } from "./managers/NoteOperations";
import { SyncManager } from "./managers/SyncManager";
import { UIManager } from "./managers/UIManager";

const logger = Logger.create("SRPlugin");

interface PluginData {
    settings: SRSettings;
    buryList: string[];
    buryListDate?: string;
    historyDeck: string | null;
}

const DEFAULT_DATA: PluginData = {
    settings: DEFAULT_SETTINGS,
    buryList: [],
    historyDeck: null,
};

export default class SRPlugin extends Plugin {
    // State
    private isSRInFocus: boolean = false;
    public data: PluginData;
    public syncLock = false;

    // Core data structures
    public reviewDecks: { [deckKey: string]: ReviewDeck } = {};
    public lastSelectedReviewDeck: string;
    public easeByPath: NoteEaseList;
    public questionPostponementList: QuestionPostponementList;
    public linkRank: LinkRank;
    public deckTree: Deck = new Deck("root", null);
    public remainingDeckTree: Deck;
    public cardStats: Stats;

    // Legacy data store
    public store: DataStore;

    // Managers
    public tabViewManager: TabViewManager;
    public commands: CommandManager;
    public reviewManager: ReviewManager;

    // Algorithm
    public algorithm: SrsAlgorithm;

    // New architecture
    public serviceContainer: ServiceContainer;

    // Modular managers
    private lifecycle: PluginLifecycle;
    private commandsManager: PluginCommands;
    private eventHandlers: PluginEventHandlers;
    private flashcardOps: FlashcardOperations;
    private noteOps: NoteOperations;
    public syncManager: SyncManager;
    private uiManager: UIManager;

    // Singleton
    private static _instance: SRPlugin;
    static getInstance() {
        return SRPlugin._instance;
    }

    async onload(): Promise<void> {
        SRPlugin._instance = this;

        // Initialize tab view manager first
        this.tabViewManager = new TabViewManager(this);
        this.tabViewManager.registerAllTabViews();

        // Initialize modular managers
        this.lifecycle = new PluginLifecycle(this);
        this.commandsManager = new PluginCommands(this);
        this.eventHandlers = new PluginEventHandlers(this);
        this.flashcardOps = new FlashcardOperations(this);
        this.noteOps = new NoteOperations(this);
        this.syncManager = new SyncManager(this);
        this.uiManager = new UIManager(this);

        // Initialize plugin
        await this.lifecycle.initialize();

        // Initialize managers
        this.commands = new CommandManager(this);
        this.commands.addCommands();
        if (this.data.settings.showSchedulingDebugMessages) {
            this.commands.addDebugCommands();
        }

        // Initialize review manager
        this.reviewManager = new ReviewManager(this);

        // Setup UI
        await this.uiManager.initialize();

        // Register commands
        this.commandsManager.registerAllCommands();

        // Register event handlers
        this.eventHandlers.registerAllEventHandlers();

        // Initial sync after layout is ready
        this.app.workspace.onLayoutReady(async () => {
            if (!this.syncLock) {
                await this.sync();
            }
        });
    }

    onunload(): void {
        this.lifecycle.cleanup();
        this.uiManager.cleanup();
    }

    // Delegation methods for flashcard operations
    public async openFlashcardModalForSingleNote(
        noteFile: TFile,
        reviewMode: FlashcardReviewMode,
    ): Promise<void> {
        return this.flashcardOps.openFlashcardModalForSingleNote(noteFile, reviewMode);
    }

    public openFlashcardModal(
        fullDeckTree: Deck,
        remainingDeckTree: Deck,
        reviewMode: FlashcardReviewMode,
        startDeck?: Deck,
    ): void {
        return this.flashcardOps.openFlashcardModal(
            fullDeckTree,
            remainingDeckTree,
            reviewMode,
            startDeck,
        );
    }

    public async getPreparedDecksForSingleNoteReview(
        file: TFile,
        mode: FlashcardReviewMode,
    ): Promise<{ deckTree: Deck; remainingDeckTree: Deck; mode: FlashcardReviewMode }> {
        return this.flashcardOps.getPreparedDecksForSingleNoteReview(file, mode);
    }

    public getPreparedReviewSequencer(
        fullDeckTree: Deck,
        remainingDeckTree: Deck,
        reviewMode: FlashcardReviewMode,
    ) {
        return this.flashcardOps.getPreparedReviewSequencer(
            fullDeckTree,
            remainingDeckTree,
            reviewMode,
        );
    }

    // Delegation methods for note operations
    public async loadNote(noteFile: TFile) {
        return this.noteOps.loadNote(noteFile);
    }

    public createSrTFile(note: TFile): SrTFile {
        return this.noteOps.createSrTFile(note);
    }

    public tagCheck(note: TFile): boolean {
        return this.noteOps.tagCheck(note);
    }

    public noteIsNew(note: TFile): boolean {
        return this.noteOps.noteIsNew(note);
    }

    public async saveReviewResponse_onNote(note: TFile, response: number, ease: number) {
        return this.noteOps.saveReviewResponse(note, response, ease);
    }

    // Delegation methods for sync
    public async sync(reviewMode = FlashcardReviewMode.Review): Promise<void> {
        return this.syncManager.sync(reviewMode);
    }

    public sync_onNote(notes: TFile[]): void {
        return this.syncManager.syncNotes(notes);
    }

    // Delegation methods for UI
    public updateStatusBar(): void {
        return this.uiManager.updateStatusBar();
    }

    public async openReviewQueueView(): Promise<void> {
        return this.uiManager.openReviewQueueView();
    }

    // Utility methods
    public getObsidianRtlSetting(): TextDirection {
        return getObsidianRtlSetting(this.app);
    }

    public async reviewNextNoteModal(): Promise<void> {
        return this.reviewManager.reviewNextNoteModal();
    }

    public async reviewNextNote(deckKey: string): Promise<void> {
        new Notice(t("ALL_CAUGHT_UP"));
    }

    public showSyncInfo(): void {
        logger.debug("Sync info", {
            eases: this.easeByPath,
            deckTree: this.deckTree,
            reviewDecks: this.reviewDecks,
            cardStats: this.cardStats,
            noteStats: this.reviewManager.noteStats,
            dueDatesNotes: this.reviewManager.dueDatesNotes,
        });
    }

    // Focus management
    public registerSRFocusListener(): void {
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", this.handleFocusChange.bind(this)),
        );
    }

    public removeSRFocusListener(): void {
        this.setSRViewInFocus(false);
        this.app.workspace.off("active-leaf-change", this.handleFocusChange.bind(this));
    }

    public handleFocusChange(leaf: WorkspaceLeaf | null): void {
        this.setSRViewInFocus(leaf !== null && leaf.view instanceof TabView);
    }

    public setSRViewInFocus(value: boolean): void {
        this.isSRInFocus = value;
    }

    public getSRInFocusState(): boolean {
        return this.isSRInFocus;
    }

    // Data management
    public async loadPluginData(): Promise<void> {
        const loadedData: PluginData = await this.loadData();
        this.data = Object.assign({}, DEFAULT_DATA, loadedData);
        this.data.settings = Object.assign({}, DEFAULT_SETTINGS, this.data.settings);

        // Migration: Remove deprecated buryDate field if it exists
        if ("buryDate" in this.data) {
            delete (this.data as any).buryDate;
        }

        this.store = new DataStore(this.data.settings, this.manifest.dir);
        await this.store.load();

        // Schedule a backup 5 minutes after plugin startup (only if using separate storage)
        if (this.data.settings.dataLocation !== DataLocation.SaveOnNoteFile) {
            this.store.scheduleStartupBackup();
        }

        setDebugParser(this.data.settings.showParserDebugMessages);
    }

    public async savePluginData(): Promise<void> {
        TagService.clearPatternCache();
        await this.saveData(this.data);
    }

    // Expose managers for backward compatibility
    get reviewFloatBar() {
        return this.uiManager.reviewFloatBar;
    }

    get noteReviewManager() {
        return this.uiManager.noteReviewManager;
    }

    get settingTab() {
        return this.uiManager.settingTab;
    }
}
