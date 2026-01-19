import { App } from "obsidian";
import { IMarkdownRenderer } from "../types";
import { RenderMarkdownWrapper } from "src/utils/RenderMarkdownWrapper";
import { TextDirection } from "src/utils/TextDirection";
import SRPlugin from "src/main";

export class MarkdownRendererService implements IMarkdownRenderer {
    private app: App;
    private plugin: SRPlugin;
    private notePath: string;

    constructor(app: App, plugin: SRPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    async render(content: string, container: HTMLElement, direction: string): Promise<void> {
        // Convert direction string to TextDirection enum
        let textDirection: TextDirection;
        if (direction === "rtl") {
            textDirection = TextDirection.Rtl;
        } else if (direction === "ltr") {
            textDirection = TextDirection.Ltr;
        } else {
            textDirection = TextDirection.Unspecified;
        }

        // Get the note path from the current context if available
        // For now, we'll use empty string and update it when we have the card context
        const notePath = this.notePath || "";

        const wrapper = new RenderMarkdownWrapper(this.app, this.plugin, notePath);
        await wrapper.renderMarkdownWrapper(content, container, textDirection);
    }

    setNotePath(path: string): void {
        this.notePath = path;
    }
}
