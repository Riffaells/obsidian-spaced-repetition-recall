import { Notice, Setting, App } from "obsidian";
import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { SRSettingTab } from "src/gui/settings/SettingsTab";
import { addMultiClozeSetting } from "src/settings/multiClozeSetting";
import { addburySiblingSetting } from "src/settings/burySiblingSetting";
import { addcardBlockIDSetting } from "src/settings/cardBlockIDSetting";
import { addIntervalShowHideSetting } from "src/settings/intervalShowHideSetting";
import { applySettingsUpdate } from "../utils";
import { createFoldersToIgnoreSetting } from "../components/FoldersToIgnoreSetting";
import { createFlashcardRulesManager } from "../components/FlashcardRulesManager";

export class FlashcardsTab {
    static async render(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        settingsTab: SRSettingTab,
    ): Promise<void> {
        containerEl.createEl("h3", { text: t("GROUP_TAGS_FOLDERS") });

        // Unified flashcard rules manager
        createFlashcardRulesManager(containerEl, plugin);

        new Setting(containerEl)
            .setName(t("CONVERT_FOLDERS_TO_DECKS"))
            .setDesc(t("CONVERT_FOLDERS_TO_DECKS_DESC"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.data.settings.convertFoldersToDecks)
                    .onChange(async (value) => {
                        plugin.data.settings.convertFoldersToDecks = value;
                        await plugin.savePluginData();
                    }),
            );

        createFoldersToIgnoreSetting(containerEl, plugin, settingsTab);

        containerEl.createEl("h3", { text: t("GROUP_FLASHCARD_REVIEW") });
        addMultiClozeSetting(containerEl, plugin);
        addburySiblingSetting(containerEl, plugin);
        addcardBlockIDSetting(containerEl, plugin);

        new Setting(containerEl)
            .setName(t("BURY_SIBLINGS_TILL_NEXT_DAY"))
            .setDesc(t("BURY_SIBLINGS_TILL_NEXT_DAY_DESC"))
            .addToggle((toggle) =>
                toggle.setValue(plugin.data.settings.burySiblingCards).onChange(async (value) => {
                    plugin.data.settings.burySiblingCards = value;
                    await plugin.savePluginData();
                }),
            );

        this.addCardOrderSettings(containerEl, plugin, settingsTab);
        addIntervalShowHideSetting(containerEl, plugin);

        containerEl.createEl("h3", { text: t("CLOZE_SETTINGS_TITLE") });
        this.addClozeSettings(containerEl, plugin, settingsTab);

        const separatorsDetails = containerEl.createEl("details");
        separatorsDetails.createEl("summary", { text: t("DEFAULT_CARD_SEPARATORS_ADVANCED_TITLE") });
        this.addCardSeparators(separatorsDetails, plugin, settingsTab);
    }

    private static addClozeSettings(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        settingsTab: SRSettingTab,
    ): void {
        this.addClozePatternToggles(containerEl, plugin, settingsTab);
        this.addClozePatternsTextArea(containerEl, plugin);
    }

    private static addCardOrderSettings(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        settingsTab: SRSettingTab,
    ): void {
        new Setting(containerEl)
            .setName(t("REVIEW_CARD_ORDER_WITHIN_DECK"))
            .addDropdown((dropdown) =>
                dropdown
                    .addOptions({
                        NewFirstSequential: t("REVIEW_CARD_ORDER_NEW_FIRST_SEQUENTIAL"),
                        DueFirstSequential: t("REVIEW_CARD_ORDER_DUE_FIRST_SEQUENTIAL"),
                        NewFirstRandom: t("REVIEW_CARD_ORDER_NEW_FIRST_RANDOM"),
                        DueFirstRandom: t("REVIEW_CARD_ORDER_DUE_FIRST_RANDOM"),
                        EveryCardRandomDeckAndCard: t("REVIEW_CARD_ORDER_RANDOM_DECK_AND_CARD"),
                    })
                    .setValue(plugin.data.settings.flashcardCardOrder)
                    .onChange(async (value) => {
                        plugin.data.settings.flashcardCardOrder = value;
                        await plugin.savePluginData();
                        settingsTab.redisplay();
                    }),
            );

        const deckOrderEnabled: boolean =
            plugin.data.settings.flashcardCardOrder != "EveryCardRandomDeckAndCard";

        new Setting(containerEl).setName(t("REVIEW_DECK_ORDER")).addDropdown((dropdown) =>
            dropdown
                .addOptions(
                    deckOrderEnabled
                        ? {
                              PrevDeckComplete_Sequential: t(
                                  "REVIEW_DECK_ORDER_PREV_DECK_COMPLETE_SEQUENTIAL",
                              ),
                              PrevDeckComplete_Random: t(
                                  "REVIEW_DECK_ORDER_PREV_DECK_COMPLETE_RANDOM",
                              ),
                          }
                        : {
                              EveryCardRandomDeckAndCard: t(
                                  "REVIEW_DECK_ORDER_RANDOM_DECK_AND_CARD",
                              ),
                          },
                )
                .setValue(
                    deckOrderEnabled
                        ? plugin.data.settings.flashcardDeckOrder
                        : "EveryCardRandomDeckAndCard",
                )
                .setDisabled(!deckOrderEnabled)
                .onChange(async (value) => {
                    plugin.data.settings.flashcardDeckOrder = value;
                    await plugin.savePluginData();
                }),
        );
    }

    // Removed addSeparatorSettings as it is split now

    private static addClozePatternToggles(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        settingsTab: SRSettingTab,
    ): void {
        const patterns: Record<string, { key: keyof SRSettings; pattern: string; name: string; desc: string }> = {
            highlights: {
                key: "convertHighlightsToClozes",
                pattern: "==[123;;]answer[;;hint]==",
                name: "CONVERT_HIGHLIGHTS_TO_CLOZES",
                desc: "CONVERT_HIGHLIGHTS_TO_CLOZES_DESC",
            },
            bold: {
                key: "convertBoldTextToClozes",
                pattern: "**[123;;]answer[;;hint]**",
                name: "CONVERT_BOLD_TEXT_TO_CLOZES",
                desc: "CONVERT_BOLD_TEXT_TO_CLOZES_DESC",
            },
            curly: {
                key: "convertCurlyBracketsToClozes",
                pattern: "{{[123;;]answer[;;hint]}}",
                name: "CONVERT_CURLY_BRACKETS_TO_CLOZES",
                desc: "CONVERT_CURLY_BRACKETS_TO_CLOZES_DESC",
            },
        };

        for (const config of Object.values(patterns)) {
            const setting = new Setting(containerEl).setName(t(config.name as any));
            setting.descEl.insertAdjacentHTML(
                "beforeend",
                t(config.desc as any, { defaultPattern: config.pattern }),
            );
            setting.addToggle((toggle) =>
                toggle
                    .setValue(
                        plugin.data.settings[
                            config.key as keyof typeof plugin.data.settings
                        ] as boolean,
                    )
                    .onChange(async (value) => {
                        const clozePatternSet = new Set(plugin.data.settings.clozePatterns);
                        value
                            ? clozePatternSet.add(config.pattern)
                            : clozePatternSet.delete(config.pattern);
                        plugin.data.settings.clozePatterns = [...clozePatternSet];
                        (plugin.data.settings as any)[config.key] = value;
                        await plugin.savePluginData();
                        settingsTab.redisplay();
                    }),
            );
        }
    }

    private static addClozePatternsTextArea(containerEl: HTMLElement, plugin: SRPlugin): void {
        const clozePatternsEl = new Setting(containerEl).setName(t("CLOZE_PATTERNS"));
        clozePatternsEl.descEl.insertAdjacentHTML(
            "beforeend",
            t("CLOZE_PATTERNS_DESC", {
                docsUrl:
                    "https://www.stephenmwangi.com/obsidian-spaced-repetition/flashcards/cloze-cards/#cloze-types",
            }),
        );
        clozePatternsEl.addTextArea((text) =>
            text
                .setPlaceholder(t("CLOZE_PATTERNS_PLACEHOLDER"))
                .setValue(plugin.data.settings.clozePatterns.join("\n"))
                .onChange((value) => {
                    applySettingsUpdate(async () => {
                        const clozePatternSet = new Set(
                            value
                                .split(/\n+/)
                                .map((v) => v.trim())
                                .filter((v) => v),
                        );

                        plugin.data.settings.convertHighlightsToClozes = clozePatternSet.has(
                            "==[123;;]answer[;;hint]==",
                        );
                        plugin.data.settings.convertBoldTextToClozes = clozePatternSet.has(
                            "**[123;;]answer[;;hint]**",
                        );
                        plugin.data.settings.convertCurlyBracketsToClozes = clozePatternSet.has(
                            "{{[123;;]answer[;;hint]}}",
                        );

                        plugin.data.settings.clozePatterns = [...clozePatternSet];
                        await plugin.savePluginData();
                    });
                }),
        );
    }

    private static addCardSeparators(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        settingsTab: SRSettingTab,
    ): void {
        const separators: { key: keyof SRSettings; name: string }[] = [
            { key: "singleLineCardSeparator", name: "INLINE_CARDS_SEPARATOR" },
            { key: "singleLineReversedCardSeparator", name: "INLINE_REVERSED_CARDS_SEPARATOR" },
            { key: "multilineCardSeparator", name: "MULTILINE_CARDS_SEPARATOR" },
            { key: "multilineReversedCardSeparator", name: "MULTILINE_REVERSED_CARDS_SEPARATOR" },
            { key: "multilineCardEndMarker", name: "MULTILINE_CARDS_END_MARKER" },
        ];

        for (const sep of separators) {
            new Setting(containerEl)
                .setName(t(sep.name as any))
                .setDesc(t("FIX_SEPARATORS_MANUALLY_WARNING"))
                .addText((text) =>
                    text
                        .setValue(
                            plugin.data.settings[sep.key] as string,
                        )
                        .onChange((value) => {
                            applySettingsUpdate(async () => {
                                (plugin.data.settings as any)[sep.key] = value;
                                await plugin.savePluginData();
                            });
                        }),
                )
                .addExtraButton((button) => {
                    button
                        .setIcon("reset")
                        .setTooltip(t("RESET_DEFAULT"))
                        .onClick(async () => {
                            (plugin.data.settings as any)[sep.key] = (DEFAULT_SETTINGS as any)[
                                sep.key
                            ];
                            await plugin.savePluginData();
                            settingsTab.redisplay();
                        });
                });
        }
    }
}
