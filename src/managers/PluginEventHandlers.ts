import { TAbstractFile, TFile, getAllTags } from "obsidian";
import { t } from "src/lang/helpers";
import { registerTrackFileEvents, addFileMenuEvt } from "src/events/trackFileEvents";
import { DataLocation } from "src/dataStore/dataLocation";
import type SRPlugin from "src/main";

export class PluginEventHandlers {
    private metadataChangeTimeout: NodeJS.Timeout | null = null;
    private metadataChangeCache = new Map<string, string[]>();

    constructor(private plugin: SRPlugin) {}

    registerAllEventHandlers(): void {
        this.registerFileTrackingEvents();
        this.registerMetadataChangeHandler();
        this.registerFileMenuHandler();
        this.registerPeriodicSync();
    }

    private registerFileTrackingEvents(): void {
        registerTrackFileEvents(this.plugin);
    }

    private registerMetadataChangeHandler(): void {
        const plugin = this.plugin;

        plugin.registerEvent(
            plugin.app.metadataCache.on("changed", (file: TFile) => {
                // Only process markdown files
                if (file.extension !== "md") {
                    return;
                }

                // Get current tags
                const fileCachedData = plugin.app.metadataCache.getFileCache(file) || {};
                const currentTags = getAllTags(fileCachedData) || [];

                // Get previous tags from cache
                const previousTags = this.metadataChangeCache.get(file.path) || [];

                // Check if tags actually changed
                const tagsChanged =
                    currentTags.length !== previousTags.length ||
                    !currentTags.every((tag, index) => tag === previousTags[index]);

                if (tagsChanged) {
                    // Update cache
                    this.metadataChangeCache.set(file.path, currentTags);

                    // Debounce sync to avoid too frequent updates
                    if (this.metadataChangeTimeout) {
                        clearTimeout(this.metadataChangeTimeout);
                    }

                    this.metadataChangeTimeout = setTimeout(async () => {
                        if (!plugin.syncLock) {
                            await plugin.sync();
                            plugin.app.workspace.trigger("sr:stats-updated");
                        }
                        this.metadataChangeTimeout = null;
                    }, 1000); // 1 second debounce
                }
            }),
        );
    }

    private registerFileMenuHandler(): void {
        const plugin = this.plugin;

        if (plugin.data.settings.disableFileMenuReviewOptions) {
            return;
        }

        plugin.registerEvent(
            plugin.app.workspace.on("file-menu", (menu, fileish: TAbstractFile) => {
                if (fileish instanceof TFile && fileish.extension === "md") {
                    const options = plugin.algorithm.srsOptions();
                    const algo = plugin.data.settings.algorithm;
                    const showtext = plugin.data.settings.responseOptionBtnsText;

                    for (let i = 1; i < options.length; i++) {
                        menu.addItem((item) => {
                            item.setTitle(
                                t("REVIEW_DIFFICULTY_FILE_MENU", {
                                    difficulty: showtext[algo][i],
                                }),
                            )
                                .setIcon("SpacedRepIcon")
                                .onClick(() => {
                                    plugin.reviewManager.saveReviewResponse(fileish, i);
                                });
                        });
                    }
                }

                addFileMenuEvt(plugin, menu, fileish);
            }),
        );
    }

    private registerPeriodicSync(): void {
        const plugin = this.plugin;

        if (plugin.data.settings.dataLocation !== DataLocation.SaveOnNoteFile) {
            plugin.registerInterval(
                window.setInterval(
                    async () => {
                        await plugin.sync();
                    },
                    30 * 60 * 1000, // 30 minutes
                ),
            );
        }
    }
}
