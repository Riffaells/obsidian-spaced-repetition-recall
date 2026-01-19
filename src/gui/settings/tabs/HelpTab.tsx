import { Setting } from "obsidian";
import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { setDebugParser } from "src/parser";
import { buildDonation } from "../../settings-views/donation";

export class HelpTab {
    static async render(containerEl: HTMLElement, plugin: SRPlugin): Promise<void> {
        containerEl.createEl("h3", { text: `${t("HELP")}` });

        containerEl.createEl("p").insertAdjacentHTML(
            "beforeend",
            t("CHECK_WIKI", {
                wikiUrl: "https://riffaells.github.io/obsidian-spaced-repetition-flow/",
            }),
        );

        containerEl.createEl("p").insertAdjacentHTML(
            "beforeend",
            t("GITHUB_DISCUSSIONS", {
                discussionsUrl:
                    "https://github.com/Riffaells/obsidian-spaced-repetition-flow/discussions/",
            }),
        );

        containerEl.createEl("p").insertAdjacentHTML(
            "beforeend",
            t("GITHUB_ISSUES", {
                issuesUrl: "https://github.com/Riffaells/obsidian-spaced-repetition-flow/issues/",
            }),
        );

        containerEl.createEl("h3", { text: `${t("LOGGING")}` });

        new Setting(containerEl).setName(t("DISPLAY_SCHEDULING_DEBUG_INFO")).addToggle((toggle) =>
            toggle
                .setValue(plugin.data.settings.showSchedulingDebugMessages)
                .onChange(async (value) => {
                    plugin.data.settings.showSchedulingDebugMessages = value;
                    await plugin.savePluginData();
                }),
        );

        new Setting(containerEl).setName(t("DISPLAY_PARSER_DEBUG_INFO")).addToggle((toggle) =>
            toggle
                .setValue(plugin.data.settings.showParserDebugMessages)
                .onChange(async (value) => {
                    plugin.data.settings.showParserDebugMessages = value;
                    setDebugParser(plugin.data.settings.showParserDebugMessages);
                    await plugin.savePluginData();
                }),
        );

        containerEl.createEl("h3", { text: t("GROUP_CONTRIBUTING") });

        containerEl.createEl("p").insertAdjacentHTML(
            "beforeend",
            t("GITHUB_SOURCE_CODE", {
                githubProjectUrl: "https://github.com/Riffaells/obsidian-spaced-repetition-flow",
            }),
        );

        containerEl.createEl("p").insertAdjacentHTML(
            "beforeend",
            t("CODE_CONTRIBUTION_INFO", {
                codeContributionUrl:
                    "https://riffaells.github.io/obsidian-spaced-repetition-flow/contributing/#code",
            }),
        );

        containerEl.createEl("p").insertAdjacentHTML(
            "beforeend",
            t("TRANSLATION_CONTRIBUTION_INFO", {
                translationContributionUrl:
                    "https://riffaells.github.io/obsidian-spaced-repetition-flow/contributing/#translating",
            }),
        );

        const issue_url = "https://github.com/Riffaells/obsidian-spaced-repetition-flow/issues";
        containerEl.createEl("p").insertAdjacentHTML(
            "beforeend",
            t("GITHUB_ISSUES_MODIFIED_PLUGIN", {
                issuesUrl: issue_url,
            }),
        );

        buildDonation(containerEl);
    }
}
