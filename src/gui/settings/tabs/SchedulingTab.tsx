import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { addDataLocationSettings } from "../../settings-views/locationSetting";
import {
    addAlgorithmSetting,
    addAlgorithmSpecificDisplaySetting,
} from "../../settings-views/algorithmSetting";

export class SchedulingTab {
    static async render(containerEl: HTMLElement, plugin: SRPlugin): Promise<void> {
        containerEl.createEl("h3", { text: t("ALGORITHM") });

        const issue_url =
            "https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall/issues";
        containerEl.createEl("p").innerHTML = t("POST_ISSUE_MODIFIED_PLUGIN", {
            issue_url,
        });

        addDataLocationSettings(containerEl, plugin);
        addAlgorithmSetting(containerEl, plugin);
        addAlgorithmSpecificDisplaySetting(containerEl, plugin);
    }
}
