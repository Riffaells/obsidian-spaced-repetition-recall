import { Notice, Setting, App } from "obsidian";
import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { DEFAULT_SETTINGS } from "src/settings";
import { addmixQueueSetting } from "src/settings/mixQueueSetting";
import { addTrackedNoteToDecksSetting, addUntrackSetting } from "src/settings/trackSetting";
import { addResponseFloatBarSetting } from "src/settings/responseBarSetting";
import { addReviewNoteDirectlySetting } from "src/settings/reviewNoteDirectlySetting";
import { applySettingsUpdate } from "../utils";
import { createFoldersToIgnoreSetting } from "../components/FoldersToIgnoreSetting";
import { createTagsManager } from "../components/TagsManager";

export class NotesTab {
    static async render(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        settingsTab: any,
    ): Promise<void> {
        containerEl.createEl("h3", { text: t("GROUP_TAGS_FOLDERS") });

        createTagsManager(
            containerEl,
            plugin,
            plugin.app,
            t("TAGS_TO_REVIEW"),
            t("TAGS_TO_REVIEW_DESC"),
            plugin.data.settings.tagsToReview,
            async (tags: string[]) => {
                plugin.data.settings.tagsToReview = tags;
                await plugin.savePluginData();
            },
        );

        createFoldersToIgnoreSetting(containerEl, plugin, settingsTab);

        containerEl.createEl("h3", { text: t("NOTES_REVIEW_QUEUE") });

        addmixQueueSetting(containerEl, plugin);
        addTrackedNoteToDecksSetting(containerEl, plugin);
        addUntrackSetting(containerEl, plugin);
        addResponseFloatBarSetting(containerEl, plugin);
        addReviewNoteDirectlySetting(containerEl, plugin);

        new Setting(containerEl).setName(t("AUTO_NEXT_NOTE")).addToggle((toggle) =>
            toggle.setValue(plugin.data.settings.autoNextNote).onChange(async (value) => {
                plugin.data.settings.autoNextNote = value;
                await plugin.savePluginData();
            }),
        );

        new Setting(containerEl)
            .setName(t("OPEN_RANDOM_NOTE"))
            .setDesc(t("OPEN_RANDOM_NOTE_DESC"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.data.settings.openRandomNote)
                    .onChange(async (value) => {
                        plugin.data.settings.openRandomNote = value;
                        await plugin.savePluginData();
                    }),
            );

        new Setting(containerEl).setName(t("REVIEW_PANE_ON_STARTUP")).addToggle((toggle) =>
            toggle
                .setValue(plugin.data.settings.enableNoteReviewPaneOnStartup)
                .onChange(async (value) => {
                    plugin.data.settings.enableNoteReviewPaneOnStartup = value;
                    await plugin.savePluginData();
                }),
        );

        new Setting(containerEl)
            .setName(t("MAX_N_DAYS_REVIEW_QUEUE"))
            .addText((text) =>
                text
                    .setValue(plugin.data.settings.maxNDaysNotesReviewQueue.toString())
                    .onChange((value) => {
                        applySettingsUpdate(async () => {
                            const numValue: number = Number.parseInt(value);
                            if (!isNaN(numValue)) {
                                if (numValue < 1) {
                                    new Notice(t("MIN_ONE_DAY"));
                                    text.setValue(
                                        plugin.data.settings.maxNDaysNotesReviewQueue.toString(),
                                    );
                                    return;
                                }
                                plugin.data.settings.maxNDaysNotesReviewQueue = numValue;
                                await plugin.savePluginData();
                            } else {
                                new Notice(t("VALID_NUMBER_WARNING"));
                            }
                        });
                    }),
            )
            .addExtraButton((button) => {
                button
                    .setIcon("reset")
                    .setTooltip(t("RESET_DEFAULT"))
                    .onClick(async () => {
                        plugin.data.settings.maxNDaysNotesReviewQueue =
                            DEFAULT_SETTINGS.maxNDaysNotesReviewQueue;
                        await plugin.savePluginData();
                        settingsTab.redisplay();
                    });
            });
    }
}
