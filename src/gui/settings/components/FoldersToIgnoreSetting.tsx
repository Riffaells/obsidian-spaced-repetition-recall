import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { createTagsManager } from "./TagsManager";

export function createFoldersToIgnoreSetting(
    containerEl: HTMLElement,
    plugin: SRPlugin,
    settingsTab: any,
): void {
    createTagsManager(
        containerEl,
        plugin,
        plugin.app,
        t("FOLDERS_TO_IGNORE"),
        t("FOLDERS_TO_IGNORE_DESC"),
        plugin.data.settings.noteFoldersToIgnore,
        async (folders: string[]) => {
            plugin.data.settings.noteFoldersToIgnore = folders;
            await plugin.savePluginData();
        },
        false, // не требуется #
        "folder/path or **/*.pattern",
    );
}
