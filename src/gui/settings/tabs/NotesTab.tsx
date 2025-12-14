import { Notice, Setting, App } from "obsidian";
import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { DEFAULT_SETTINGS } from "src/settings/settings";
import { SRSettingTab } from "src/gui/settings/SettingsTab";
import { addmixQueueSetting } from "../../settings-views/mixQueueSetting";
import { addTrackedNoteToDecksSetting, addUntrackSetting } from "../../settings-views/trackSetting";
import { addResponseFloatBarSetting } from "../../settings-views/responseBarSetting";
import { addReviewNoteDirectlySetting } from "../../settings-views/reviewNoteDirectlySetting";
import { applySettingsUpdate } from "../utils";
import { createFoldersToIgnoreSetting } from "../components/FoldersToIgnoreSetting";
import { createTagsManager } from "../components/TagsManager";

export class NotesTab {
    static async render(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        settingsTab: SRSettingTab,
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
                toggle.setValue(plugin.data.settings.openRandomNote).onChange(async (value) => {
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
            .setName("Show Compact Review Buttons" as any)
            .setDesc(
                "Show compact fruit-themed review buttons (🍎 Hard, 🍌 Good, 🍒 Easy) in notes that are due for review" as any,
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.data.settings.showCompactReviewButtons)
                    .onChange(async (value) => {
                        plugin.data.settings.showCompactReviewButtons = value;
                        await plugin.savePluginData();

                        // Refresh buttons immediately
                        if (value) {
                            await plugin.noteReviewManager.refreshAllButtons();
                        } else {
                            plugin.noteReviewManager.destroy();
                        }
                    }),
            );

        if (plugin.data.settings.showCompactReviewButtons) {
            new Setting(containerEl)
                .setName("Collapse Buttons by Default" as any)
                .setDesc(
                    "Start with review buttons collapsed (can be expanded with chevron)" as any,
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.data.settings.compactReviewButtonsCollapsed ?? false)
                        .onChange(async (value) => {
                            plugin.data.settings.compactReviewButtonsCollapsed = value;
                            await plugin.savePluginData();
                        }),
                );

            new Setting(containerEl)
                .setName("Button Position" as any)
                .setDesc("Where to show the review buttons" as any)
                .addDropdown((dropdown) =>
                    dropdown
                        .addOption("top-right", "Top Right")
                        .addOption("top-left", "Top Left")
                        .addOption("bottom-right", "Bottom Right")
                        .addOption("bottom-left", "Bottom Left")
                        .setValue(plugin.data.settings.compactReviewButtonsPosition || "top-right")
                        .onChange(async (value) => {
                            plugin.data.settings.compactReviewButtonsPosition = value as
                                | "top-right"
                                | "top-left"
                                | "bottom-right"
                                | "bottom-left";
                            await plugin.savePluginData();
                            await plugin.noteReviewManager.refreshAllButtons();
                        }),
                );

            new Setting(containerEl)
                .setName("Auto-hide Buttons" as any)
                .setDesc("Automatically fade buttons after inactivity" as any)
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.data.settings.compactReviewButtonsAutoHide ?? false)
                        .onChange(async (value) => {
                            plugin.data.settings.compactReviewButtonsAutoHide = value;
                            await plugin.savePluginData();
                            settingsTab.redisplay();
                        }),
                );

            if (plugin.data.settings.compactReviewButtonsAutoHide) {
                new Setting(containerEl)
                    .setName("Auto-hide Delay (seconds)" as any)
                    .setDesc("Time before buttons fade out" as any)
                    .addSlider((slider) =>
                        slider
                            .setLimits(2, 30, 1)
                            .setValue(plugin.data.settings.compactReviewButtonsAutoHideDelay || 5)
                            .setDynamicTooltip()
                            .onChange(async (value) => {
                                plugin.data.settings.compactReviewButtonsAutoHideDelay = value;
                                await plugin.savePluginData();
                            }),
                    );
            }
        }

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
