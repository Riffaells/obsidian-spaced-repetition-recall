import { App, PluginSettingTab } from "obsidian";
import { createTabs, TabStructure } from "../components/tabs";
import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { FlashcardsTab } from "./tabs/FlashcardsTab";
import { NotesTab } from "./tabs/NotesTab";
import { SchedulingTab } from "./tabs/SchedulingTab";
import { UiPreferencesTab } from "./tabs/UiPreferencesTab";
import { HelpTab } from "./tabs/HelpTab";

export class SRSettingTab extends PluginSettingTab {
    private readonly plugin: SRPlugin;
    private tabStructure: TabStructure;

    constructor(app: App, plugin: SRPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        const header = containerEl.createEl("h4", {
            text: `${t("SETTINGS_HEADER")}`,
        });
        header.addClass("sr-centered");

        this.tabStructure = createTabs(
            containerEl,
            {
                "main-flashcards": {
                    title: t("FLASHCARDS"),
                    icon: "SpacedRepIcon",
                    contentGenerator: (containerElement: HTMLElement) =>
                        FlashcardsTab.render(containerElement, this.plugin, this),
                },
                "main-notes": {
                    title: t("NOTES"),
                    icon: "book-text",
                    contentGenerator: (containerElement: HTMLElement) =>
                        NotesTab.render(containerElement, this.plugin, this),
                },
                "main-algorithm": {
                    title: t("SCHEDULING"),
                    icon: "calendar",
                    contentGenerator: (containerElement: HTMLElement) =>
                        SchedulingTab.render(containerElement, this.plugin),
                },
                "main-ui-preferences": {
                    title: t("UI"),
                    icon: "presentation",
                    contentGenerator: (containerElement: HTMLElement) =>
                        UiPreferencesTab.render(containerElement, this.plugin, this.app, this),
                },
                "main-help": {
                    title: t("HELP"),
                    icon: "badge-help",
                    contentGenerator: (containerElement: HTMLElement) =>
                        HelpTab.render(containerElement, this.plugin),
                },
            },
            this.lastPosition.tabName,
        );

        this.tabStructure.contentGeneratorPromises[this.tabStructure.activeTabId].then(() => {
            this.rememberLastPosition(containerEl);
        });
    }

    hide(): void {
        this.containerEl.empty();
    }

    private lastPosition: {
        scrollPosition: number;
        tabName: string;
    } = {
        scrollPosition: 0,
        tabName: "main-flashcards",
    };

    private rememberLastPosition(containerElement: HTMLElement) {
        const lastPosition = this.lastPosition;

        this.tabStructure.buttons[lastPosition.tabName].click();
        containerElement.scrollTo({
            top: this.lastPosition.scrollPosition,
            behavior: "auto",
        });

        containerElement.addEventListener("scroll", (_) => {
            this.lastPosition.scrollPosition = containerElement.scrollTop;
        });

        for (const tabName in this.tabStructure.buttons) {
            const button = this.tabStructure.buttons[tabName];
            button.onClickEvent((_: MouseEvent) => {
                lastPosition.tabName = tabName;
            });
        }
    }

    redisplay(): void {
        this.display();
    }
}
