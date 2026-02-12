import { Notice, TFile, WorkspaceLeaf } from "obsidian";
import { REVIEW_QUEUE_VIEW_TYPE, ReviewQueueListView } from "src/gui/sidebar/Sidebar";
import { reviewResponseModal } from "src/gui/modals/reviewresponse-modal";
import { NoteReviewButtonsManager } from "src/gui/components/NoteReviewButtons";
import { SRSettingTab } from "src/gui/settings/SettingsTab";
import { FlashcardReviewMode } from "src/core/scheduling/FlashcardReviewMode";
import { CardListType } from "src/core/models/CardListType";
import { t } from "src/lang/helpers";
import { Logger } from "src/utils/Logger";
import type SRPlugin from "src/main";

const logger = Logger.create("UIManager");

export class UIManager {
    private statusBar: HTMLElement;
    public reviewFloatBar: reviewResponseModal;
    public noteReviewManager: NoteReviewButtonsManager;
    public settingTab: SRSettingTab;

    constructor(private plugin: SRPlugin) {}

    async initialize(): Promise<void> {
        await this.setupStatusBar();
        await this.setupRibbonIcon();
        await this.setupReviewFloatBar();
        await this.setupNoteReviewButtons();
        await this.setupSettingsTab();
        await this.setupSidebarView();
        this.setupFocusListener();
    }

    private async setupStatusBar(): Promise<void> {
        const plugin = this.plugin;
        this.statusBar = plugin.addStatusBarItem();
        this.statusBar.classList.add("mod-clickable");
        this.statusBar.setAttribute("aria-label", t("OPEN_NOTE_FOR_REVIEW"));
        this.statusBar.setAttribute("aria-label-position", "top");
        this.statusBar.addEventListener("click", async () => {
            if (!plugin.syncLock) {
                await plugin.sync();
                await plugin.reviewManager.reviewNextNoteModal();
            }
        });
    }

    private async setupRibbonIcon(): Promise<void> {
        const plugin = this.plugin;
        plugin.addRibbonIcon("SpacedRepIcon", t("REVIEW_CARDS"), async () => {
            if (!plugin.syncLock) {
                await plugin.sync();
                if (plugin.data.settings.openViewInNewTab) {
                    await plugin.tabViewManager.openSRTabView(FlashcardReviewMode.Review);
                } else {
                    plugin.openFlashcardModal(
                        plugin.deckTree,
                        plugin.remainingDeckTree,
                        FlashcardReviewMode.Review,
                    );
                }
            }
        });
    }

    private async setupReviewFloatBar(): Promise<void> {
        const plugin = this.plugin;
        const settings = plugin.data.settings;

        this.reviewFloatBar = new reviewResponseModal(plugin, settings);
        this.reviewFloatBar.submitCallback = (resp) => {
            const openFile: TFile | null = plugin.app.workspace.getActiveFile();
            if (openFile && openFile.extension === "md") {
                plugin.reviewManager.saveReviewResponse(openFile, resp);
            }
        };
        this.reviewFloatBar.openNextNoteCB = () => {
            if (!plugin.lastSelectedReviewDeck) {
                const reviewDeckKeys: string[] = Object.values(plugin.reviewDecks)
                    .filter((deck) => {
                        return deck.dueNotesCount + deck.newNotes.length > 0;
                    })
                    .map((deck) => {
                        return deck.deckName;
                    });
                if (reviewDeckKeys.length > 0) plugin.lastSelectedReviewDeck = reviewDeckKeys[0];
                else {
                    new Notice(t("ALL_CAUGHT_UP"));
                    return;
                }
            }
            plugin.reviewManager.reviewNextNote(plugin.lastSelectedReviewDeck);
        };
    }

    private async setupNoteReviewButtons(): Promise<void> {
        this.noteReviewManager = new NoteReviewButtonsManager(this.plugin);
    }

    private async setupSettingsTab(): Promise<void> {
        this.settingTab = new SRSettingTab(this.plugin.app, this.plugin);
        this.plugin.addSettingTab(this.settingTab);
    }

    private async setupSidebarView(): Promise<void> {
        const plugin = this.plugin;
        plugin.registerView(REVIEW_QUEUE_VIEW_TYPE, (leaf) => new ReviewQueueListView(leaf, plugin));

        plugin.app.workspace.onLayoutReady(async () => {
            await this.initReviewQueueView();
        });
    }

    private setupFocusListener(): void {
        this.plugin.registerSRFocusListener();
    }

    updateStatusBar(): void {
        const plugin = this.plugin;
        this.statusBar.setText(
            t("STATUS_BAR", {
                dueNotesCount: plugin.reviewManager.noteStats.onDueCount,
                dueFlashcardsCount: plugin.remainingDeckTree.getDistinctCardCount(
                    CardListType.All,
                    true,
                ),
            }),
        );
    }

    private async initReviewQueueView(): Promise<void> {
        const plugin = this.plugin;
        if (
            plugin.data.settings.enableNoteReviewPaneOnStartup &&
            this.getActiveLeaf(REVIEW_QUEUE_VIEW_TYPE) == null
        ) {
            await this.activateReviewQueueViewPanel();
        }
    }

    private async activateReviewQueueViewPanel(): Promise<void> {
        const plugin = this.plugin;
        const leaf = plugin.app.workspace.getRightLeaf(false);
        await leaf.setViewState({
            type: REVIEW_QUEUE_VIEW_TYPE,
            active: false,
        });
        if (leaf) {
            plugin.app.workspace.revealLeaf(leaf);
        }
    }

    async openReviewQueueView(): Promise<void> {
        const plugin = this.plugin;
        let reviewQueueLeaf = this.getActiveLeaf(REVIEW_QUEUE_VIEW_TYPE);
        if (reviewQueueLeaf == null) {
            await this.activateReviewQueueViewPanel();
            reviewQueueLeaf = this.getActiveLeaf(REVIEW_QUEUE_VIEW_TYPE);
        }

        if (reviewQueueLeaf !== null) {
            plugin.app.workspace.revealLeaf(reviewQueueLeaf);
            plugin.reviewManager.updateAndSortDueNotes();
        }
    }

    private getActiveLeaf(type: string): WorkspaceLeaf | null {
        const leaves = this.plugin.app.workspace.getLeavesOfType(type);
        if (leaves.length == 0) {
            return null;
        }
        return leaves[0];
    }

    cleanup(): void {
        if (this.reviewFloatBar) {
            this.reviewFloatBar.close();
        }

        if (this.noteReviewManager) {
            this.noteReviewManager.destroy();
        }
    }
}
