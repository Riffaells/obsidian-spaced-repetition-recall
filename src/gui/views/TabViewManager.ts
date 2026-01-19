import { PaneType, TFile, ViewCreator, WorkspaceLeaf } from "obsidian";

import { SR_TAB_VIEW } from "src/constants";
import SRPlugin from "src/main";
import { FlashcardReviewMode } from "src/core/scheduling/FlashcardReviewMode";
import { Deck } from "src/core/models/Deck";
import { TabView } from "./TabView";

export type TabViewType = { type: string; viewCreator: ViewCreator };

/**
 * Manages tab views for the Spaced Repetition plugin, allowing for the opening and closing
 * of tabbed views within the application. Handles the registration of different tab view types
 * and facilitates the creation of new tab views based on the specified review mode and optional
 * single note. Ensures that tab views are properly initialized and revealed within the workspace.
 *
 * @property {SRPlugin} plugin - The main plugin instance.
 *
 * @method openSRTabView - Opens a new tab view for the specified review mode and optional single note.
 * @method closeAllTabViews - Closes all tab views.
 */
export default class TabViewManager {
    private plugin: SRPlugin;
    private isRegistered: boolean = false;

    // Add any new other tab view types to this, then they'll be automatically registered
    private tabViewTypes: TabViewType[] = [
        {
            type: SR_TAB_VIEW,
            viewCreator: (leaf) => new TabView(leaf, this.plugin),
        },
    ];

    constructor(plugin: SRPlugin) {
        this.plugin = plugin;
    }

    /**
     * Opens the Spaced Repetition tab view in the application.
     *
     * @param reviewMode - The mode of flashcard review.
     * @param singleNote - Optional parameter specifying a single note to review.
     * @param startDeck - Optional parameter specifying the deck to start with.
     *
     * @returns {Promise<void>} - A promise that resolves when the tab view is opened.
     */
    public async openSRTabView(
        reviewMode: FlashcardReviewMode,
        singleNote?: TFile,
        startDeck?: Deck,
    ): Promise<void> {
        const state: any = {
            reviewMode,
            singleNotePath: singleNote?.path,
        };

        if (startDeck) {
            state.startDeckPath = startDeck.getTopicPath().path;
        }

        await this.openTabView(SR_TAB_VIEW, true, state);
    }

    /**
     * Closes all open tab views in the application.
     *
     * This method iterates over all registered tab view types and detaches
     * their corresponding leaves from the workspace, effectively closing them.
     */
    public closeAllTabViews() {
        this.forEachTabViewType((viewType) => {
            this.plugin.app.workspace.detachLeavesOfType(viewType.type);
        });
    }

    public forEachTabViewType(callback: (type: TabViewType) => void) {
        this.tabViewTypes.forEach((type) => callback(type));
    }

    public registerAllTabViews() {
        if (this.isRegistered) {
            console.log("SR: Tab views already registered, skipping");
            return;
        }

        this.forEachTabViewType((viewType) => {
            try {
                this.plugin.registerView(viewType.type, viewType.viewCreator);
            } catch (error) {
                // View already registered - this happens during hot reload, ignore it
                console.log(`SR: View type ${viewType.type} registration skipped (already exists)`);
            }
        });
        this.isRegistered = true;
    }

    public unregisterAllTabViews() {
        if (!this.isRegistered) {
            return;
        }

        // Simply detach all leaves of our view types
        // This is the safe, public API way to clean up views
        this.forEachTabViewType((viewType) => {
            this.plugin.app.workspace.detachLeavesOfType(viewType.type);
        });

        this.isRegistered = false;
    }

    public async openTabView(type: string, newLeaf?: PaneType | boolean, state?: any) {
        const { workspace } = this.plugin.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(type);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
            // Update the view state with new parameters
            if (leaf !== null && state) {
                await leaf.setViewState({ type: type, active: true, state });
            }
        } else {
            // Our view could not be found in the workspace, create a new leaf as a tab
            leaf = workspace.getLeaf(newLeaf);
            if (leaf !== null) {
                await leaf.setViewState({ type: type, active: true, state });
            }
        }

        // "Reveal" the leaf in case it is in a collapsed sidebar
        if (leaf !== null) {
            workspace.revealLeaf(leaf);
        }
    }
}
