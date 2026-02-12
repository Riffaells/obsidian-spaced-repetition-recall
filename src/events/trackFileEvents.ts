import { Menu, TAbstractFile, TFile, TFolder, getAllTags } from "obsidian";
import { DataLocation } from "src/dataStore/dataLocation";
import SRPlugin from "src/main";
import { t } from "src/lang/helpers";

export function registerTrackFileEvents(plugin: SRPlugin) {
    const settings = plugin.data.settings;
    
    plugin.registerEvent(
        plugin.app.vault.on("rename", async (file, old) => {
            const trackFile = plugin.store.getTrackedFile(old);
            if (trackFile != null) {
                trackFile.rename(file.path);
                await plugin.store.save();
            }
        }),
    );

    plugin.registerEvent(
        plugin.app.vault.on("delete", async (file) => {
            plugin.store.untrackFile(file.path);
            await plugin.store.save();
        }),
    );

    
    plugin.registerEvent(
        plugin.app.vault.on("modify", async (file: TFile) => {
            // Only process markdown files
            if (file.extension !== "md") {
                return;
            }

            // Skip if using in-note storage or block IDs are enabled
            if (settings.dataLocation === DataLocation.SaveOnNoteFile || settings.cardBlockID) {
                return;
            }

            // Only sync if this is a tracked card file
            if (!plugin.store.isTrackedCardfile(file.path)) {
                return;
            }

            try {
                const trackFile = plugin.store.getTrackedFile(file.path);
                const fileText = await plugin.app.vault.read(file);
                
                // Get tags from Obsidian's metadata cache
                const fileCachedData = plugin.app.metadataCache.getFileCache(file) || {};
                const tags = getAllTags(fileCachedData) || [];
                
                trackFile.syncNoteCardsIndex(
                    fileText,
                    file.path,
                    settings,
                    undefined,
                    tags,
                );
            } catch (error) {
                console.error(`Failed to sync note cards for ${file.path}:`, error);
            }
        }),
    );
}

export function addFileMenuEvt(plugin: SRPlugin, menu: Menu, fileish: TAbstractFile) {
    const store = plugin.store;
    if (plugin.data.settings.dataLocation === DataLocation.SaveOnNoteFile) {
        return;
    }
    if (fileish instanceof TFolder) {
        const folder = fileish as TFolder;

        menu.addItem((item) => {
            item.setIcon("plus-with-circle");
            item.setTitle(t("MENU_TRACK_ALL_NOTES"));
            item.onClick(async (_evt) => {
                store.trackFilesInFolder(folder);
                await store.save();
                plugin.sync();
            });
        });

        menu.addItem((item) => {
            item.setIcon("minus-with-circle");
            item.setTitle(t("MENU_UNTRACK_ALL_NOTES"));
            item.onClick(async (_evt) => {
                store.untrackFilesInFolder(folder);
                await store.save();
                plugin.sync();
            });
        });
    } else if (fileish instanceof TFile) {
        if (store.getTrackedFile(fileish.path)?.isTrackedNote) {
            menu.addItem((item) => {
                item.setIcon("minus-with-circle");
                item.setTitle(t("MENU_UNTRACK_NOTE"));
                item.onClick(async (_evt) => {
                    store.untrackFile(fileish.path, true);
                    await store.save();
                    if (plugin.reviewFloatBar.isDisplay() && plugin.data.settings.autoNextNote) {
                        plugin.reviewNextNote(plugin.lastSelectedReviewDeck);
                    }
                    await plugin.sync();
                });
            });
        } else {
            menu.addItem((item) => {
                item.setIcon("plus-with-circle");
                item.setTitle(t("MENU_TRACK_NOTE"));
                item.onClick(async (_evt) => {
                    store.trackFile(fileish.path, undefined, true);
                    await store.save();
                    plugin.sync();
                });
            });
        }
    }
}
