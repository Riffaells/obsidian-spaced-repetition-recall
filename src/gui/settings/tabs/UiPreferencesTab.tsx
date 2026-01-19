import { App, Setting } from "obsidian";
import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { DEFAULT_SETTINGS } from "src/settings/settings";
import { addResponseButtonTextSetting } from "../../settings-views/algorithmSetting";

export class UiPreferencesTab {
    static async render(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        app: App,
        settingsTab: any,
    ): Promise<void> {
        containerEl.createEl("h3", { text: t("OBSIDIAN_INTEGRATION") });

        new Setting(containerEl)
            .setName(t("OPEN_IN_TAB"))
            .setDesc(t("OPEN_IN_TAB_DESC"))
            .addToggle((toggle) =>
                toggle.setValue(plugin.data.settings.openViewInNewTab).onChange(async (value) => {
                    if (value) {
                        plugin.registerSRFocusListener();
                    } else {
                        plugin.tabViewManager.closeAllTabViews();
                        plugin.removeSRFocusListener();
                    }
                    plugin.data.settings.openViewInNewTab = value;
                    await plugin.savePluginData();
                }),
            );

        new Setting(containerEl)
            .setName(t("ENABLE_FILE_MENU_REVIEW_OPTIONS"))
            .setDesc(t("ENABLE_FILE_MENU_REVIEW_OPTIONS_DESC"))
            .addToggle((toggle) =>
                toggle
                    .setValue(!plugin.data.settings.disableFileMenuReviewOptions)
                    .onChange(async (value) => {
                        plugin.data.settings.disableFileMenuReviewOptions = !value;
                        await plugin.savePluginData();
                    }),
            );

        containerEl.createEl("h3", { text: t("FLASHCARDS") });

        this.addFlashcardUiSettings(containerEl, plugin, settingsTab);

        containerEl.createEl("h3", { text: t("GROUP_FLASHCARDS_NOTES") });
        addResponseButtonTextSetting(containerEl, plugin);

        containerEl.createEl("h3", { text: t("EXPERIMENTAL") });
        this.addExperimentalSettings(containerEl, plugin, app, settingsTab);
    }

    private static addFlashcardUiSettings(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        settingsTab: any,
    ): void {
        new Setting(containerEl)
            .setName(t("INITIALLY_EXPAND_SUBDECKS_IN_TREE"))
            .setDesc(t("INITIALLY_EXPAND_SUBDECKS_IN_TREE_DESC"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.data.settings.initiallyExpandAllSubdecksInTree)
                    .onChange(async (value) => {
                        plugin.data.settings.initiallyExpandAllSubdecksInTree = value;
                        await plugin.savePluginData();
                    }),
            );

        new Setting(containerEl)
            .setName(t("SHOW_CARD_CONTEXT"))
            .setDesc(t("SHOW_CARD_CONTEXT_DESC"))
            .addToggle((toggle) =>
                toggle.setValue(plugin.data.settings.showContextInCards).onChange(async (value) => {
                    plugin.data.settings.showContextInCards = value;
                    await plugin.savePluginData();
                }),
            );

        new Setting(containerEl)
            .setName(t("SHOW_INTERVAL_IN_REVIEW_BUTTONS"))
            .setDesc(t("SHOW_INTERVAL_IN_REVIEW_BUTTONS_DESC"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.data.settings.showIntervalInReviewButtons)
                    .onChange(async (value) => {
                        plugin.data.settings.showIntervalInReviewButtons = value;
                        await plugin.savePluginData();
                    }),
            );

        new Setting(containerEl)
            .setName(t("CARD_MODAL_HEIGHT_PERCENT"))
            .setDesc(t("CARD_MODAL_SIZE_PERCENT_DESC"))
            .addSlider((slider) =>
                slider
                    .setLimits(10, 100, 5)
                    .setValue(plugin.data.settings.flashcardHeightPercentage)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        plugin.data.settings.flashcardHeightPercentage = value;
                        await plugin.savePluginData();
                    }),
            )
            .addExtraButton((button) => {
                button
                    .setIcon("reset")
                    .setTooltip(t("RESET_DEFAULT"))
                    .onClick(async () => {
                        plugin.data.settings.flashcardHeightPercentage =
                            DEFAULT_SETTINGS.flashcardHeightPercentage;
                        await plugin.savePluginData();
                        settingsTab.redisplay();
                    });
            });

        new Setting(containerEl)
            .setName(t("CARD_MODAL_WIDTH_PERCENT"))
            .setDesc(t("CARD_MODAL_SIZE_PERCENT_DESC"))
            .addSlider((slider) =>
                slider
                    .setLimits(10, 100, 5)
                    .setValue(plugin.data.settings.flashcardWidthPercentage)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        plugin.data.settings.flashcardWidthPercentage = value;
                        await plugin.savePluginData();
                    }),
            )
            .addExtraButton((button) => {
                button
                    .setIcon("reset")
                    .setTooltip(t("RESET_DEFAULT"))
                    .onClick(async () => {
                        plugin.data.settings.flashcardWidthPercentage =
                            DEFAULT_SETTINGS.flashcardWidthPercentage;
                        await plugin.savePluginData();
                        settingsTab.redisplay();
                    });
            });
    }

    private static addExperimentalSettings(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        app: App,
        settingsTab: any,
    ): void {
        const dateFormatSetting = new Setting(containerEl)
            .setName(t("SIDEBAR_DATE_FORMAT"))
            .setDesc(t("SIDEBAR_DATE_FORMAT_DESC"))
            .addText((text) =>
                text
                    .setPlaceholder(DEFAULT_SETTINGS.sidebarDateFormat)
                    .setValue(plugin.data.settings.sidebarDateFormat)
                    .onChange(async (value) => {
                        plugin.data.settings.sidebarDateFormat =
                            value || DEFAULT_SETTINGS.sidebarDateFormat;
                        await plugin.savePluginData();
                        this.updateDateFormatPreview(dateFormatSetting.descEl, value);
                        const leaves = app.workspace.getLeavesOfType("review-queue-list-view");
                        leaves.forEach((leaf) => {
                            if (leaf.view && "redraw" in leaf.view) {
                                (leaf.view as { redraw: () => void }).redraw();
                            }
                        });
                    }),
            )
            .addExtraButton((button) => {
                button
                    .setIcon("reset")
                    .setTooltip(t("RESET_DEFAULT"))
                    .onClick(async () => {
                        plugin.data.settings.sidebarDateFormat = DEFAULT_SETTINGS.sidebarDateFormat;
                        await plugin.savePluginData();
                        settingsTab.redisplay();
                    });
            });

        this.updateDateFormatPreview(
            dateFormatSetting.descEl,
            plugin.data.settings.sidebarDateFormat,
        );

        new Setting(containerEl)
            .setName(t("SIDEBAR_SHOW_RELATIVE_DAYS"))
            .setDesc(t("SIDEBAR_SHOW_RELATIVE_DAYS_DESC"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.data.settings.sidebarShowRelativeDays)
                    .onChange(async (value) => {
                        plugin.data.settings.sidebarShowRelativeDays = value;
                        await plugin.savePluginData();
                        const leaves = app.workspace.getLeavesOfType("review-queue-list-view");
                        leaves.forEach((leaf) => {
                            if (leaf.view && "redraw" in leaf.view) {
                                (leaf.view as { redraw: () => void }).redraw();
                            }
                        });
                    }),
            );

        new Setting(containerEl)
            .setName(t("SIDEBAR_INITIAL_GROUPS_LIMIT"))
            .setDesc(t("SIDEBAR_INITIAL_GROUPS_LIMIT_DESC"))
            .addSlider((slider) =>
                slider
                    .setLimits(5, 100, 5)
                    .setValue(plugin.data.settings.sidebarInitialGroupsLimit)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        plugin.data.settings.sidebarInitialGroupsLimit = value;
                        await plugin.savePluginData();
                        const leaves = app.workspace.getLeavesOfType("review-queue-list-view");
                        leaves.forEach((leaf) => {
                            if (leaf.view && "redraw" in leaf.view) {
                                (leaf.view as { redraw: () => void }).redraw();
                            }
                        });
                    }),
            )
            .addExtraButton((button) => {
                button
                    .setIcon("reset")
                    .setTooltip(t("RESET_DEFAULT"))
                    .onClick(async () => {
                        plugin.data.settings.sidebarInitialGroupsLimit =
                            DEFAULT_SETTINGS.sidebarInitialGroupsLimit;
                        await plugin.savePluginData();
                        settingsTab.redisplay();
                    });
            });

        new Setting(containerEl)
            .setName(t("SIDEBAR_INITIAL_NOTES_LIMIT"))
            .setDesc(t("SIDEBAR_INITIAL_NOTES_LIMIT_DESC"))
            .addSlider((slider) =>
                slider
                    .setLimits(5, 50, 5)
                    .setValue(plugin.data.settings.sidebarInitialNotesLimit)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        plugin.data.settings.sidebarInitialNotesLimit = value;
                        await plugin.savePluginData();
                        const leaves = app.workspace.getLeavesOfType("review-queue-list-view");
                        leaves.forEach((leaf) => {
                            if (leaf.view && "redraw" in leaf.view) {
                                (leaf.view as { redraw: () => void }).redraw();
                            }
                        });
                    }),
            )
            .addExtraButton((button) => {
                button
                    .setIcon("reset")
                    .setTooltip(t("RESET_DEFAULT"))
                    .onClick(async () => {
                        plugin.data.settings.sidebarInitialNotesLimit =
                            DEFAULT_SETTINGS.sidebarInitialNotesLimit;
                        await plugin.savePluginData();
                        settingsTab.redisplay();
                    });
            });
    }

    private static updateDateFormatPreview(descEl: HTMLElement, format: string): void {
        const oldPreview = descEl.querySelector(".sr-date-preview");
        if (oldPreview) {
            oldPreview.remove();
        }

        const previewEl = descEl.createDiv("sr-date-preview");
        previewEl.style.marginTop = "8px";
        previewEl.style.fontSize = "0.9em";
        previewEl.style.color = "var(--text-muted)";

        try {
            const exampleDate = window.moment().add(3, "days");
            const formatted = exampleDate.format(format || "ddd MMM DD.YY");
            previewEl.setText(`${t("SIDEBAR_DATE_FORMAT_PREVIEW")} ${formatted}`);
        } catch (e) {
            previewEl.setText(`${t("SIDEBAR_DATE_FORMAT_PREVIEW")} Invalid format`);
            previewEl.style.color = "var(--text-error)";
        }
    }
}
