import { TFile } from "obsidian";
import { t } from "src/lang/helpers";
import { FlashcardReviewMode } from "src/core/scheduling/FlashcardReviewMode";
import type SRPlugin from "src/main";

export class PluginCommands {
    constructor(private plugin: SRPlugin) {}

    registerAllCommands(): void {
        this.registerNoteReviewCommands();
        this.registerFlashcardCommands();
        this.registerUtilityCommands();
    }

    private registerNoteReviewCommands(): void {
        const plugin = this.plugin;

        // Open note for review
        plugin.addCommand({
            id: "srs-note-review-open-note",
            name: t("OPEN_NOTE_FOR_REVIEW"),
            callback: async () => {
                if (!plugin.syncLock) {
                    await plugin.sync();
                    await plugin.reviewManager.reviewNextNoteModal();
                }
            },
        });

        // Review note with different difficulties
        const options = plugin.algorithm.srsOptions();
        const algo = plugin.data.settings.algorithm;
        const showtext = plugin.data.settings.responseOptionBtnsText;
        
        options.forEach((option, i) => {
            plugin.addCommand({
                id: "srs-note-review-" + option.toLowerCase(),
                name: t("REVIEW_NOTE_DIFFICULTY_CMD", {
                    difficulty: showtext[algo][i],
                }),
                callback: () => {
                    const openFile: TFile | null = plugin.app.workspace.getActiveFile();
                    if (openFile && openFile.extension === "md") {
                        plugin.reviewManager.saveReviewResponse(openFile, i);
                    }
                },
            });
        });
    }

    private registerFlashcardCommands(): void {
        const plugin = this.plugin;

        // Review all flashcards
        plugin.addCommand({
            id: "srs-review-flashcards",
            name: t("REVIEW_ALL_CARDS"),
            callback: async () => {
                if (plugin.syncLock) {
                    return;
                }

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
            },
        });

        // Cram all flashcards
        plugin.addCommand({
            id: "srs-cram-flashcards",
            name: t("CRAM_ALL_CARDS"),
            callback: async () => {
                await plugin.sync(FlashcardReviewMode.Cram);
                if (plugin.data.settings.openViewInNewTab) {
                    await plugin.tabViewManager.openSRTabView(FlashcardReviewMode.Cram);
                } else {
                    plugin.openFlashcardModal(
                        plugin.deckTree,
                        plugin.remainingDeckTree,
                        FlashcardReviewMode.Cram,
                    );
                }
            },
        });

        // Review flashcards in current note
        plugin.addCommand({
            id: "srs-review-flashcards-in-note",
            name: t("REVIEW_CARDS_IN_NOTE"),
            callback: async () => {
                const openFile: TFile | null = plugin.app.workspace.getActiveFile();
                if (!openFile || openFile.extension !== "md") {
                    return;
                }

                if (plugin.data.settings.openViewInNewTab) {
                    await plugin.tabViewManager.openSRTabView(FlashcardReviewMode.Review, openFile);
                } else {
                    await plugin.openFlashcardModalForSingleNote(
                        openFile,
                        FlashcardReviewMode.Review,
                    );
                }
            },
        });

        // Cram flashcards in current note
        plugin.addCommand({
            id: "srs-cram-flashcards-in-note",
            name: t("CRAM_CARDS_IN_NOTE"),
            callback: async () => {
                const openFile: TFile | null = plugin.app.workspace.getActiveFile();
                if (!openFile || openFile.extension !== "md") {
                    return;
                }

                if (plugin.data.settings.openViewInNewTab) {
                    await plugin.tabViewManager.openSRTabView(FlashcardReviewMode.Cram, openFile);
                } else {
                    await plugin.openFlashcardModalForSingleNote(openFile, FlashcardReviewMode.Cram);
                }
            },
        });
    }

    private registerUtilityCommands(): void {
        const plugin = this.plugin;

        // View statistics
        plugin.addCommand({
            id: "srs-view-stats",
            name: t("VIEW_STATS"),
            callback: async () => {
                if (!plugin.syncLock) {
                    await plugin.sync();
                    const { StatsModal } = await import("src/gui/modals/StatsModal");
                    new StatsModal(plugin.app, plugin).open();
                }
            },
        });

        // Open review queue view
        plugin.addCommand({
            id: "srs-open-review-queue-view",
            name: t("OPEN_REVIEW_QUEUE_VIEW"),
            callback: async () => {
                await plugin.openReviewQueueView();
            },
        });
    }
}
