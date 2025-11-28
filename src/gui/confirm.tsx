import { ButtonComponent, MarkdownRenderer, Modal } from "obsidian";
import SRPlugin from "src/main";

type ConfirmCallback = (confirmed: boolean) => void;

export default class ConfirmModal {
    private plugin: SRPlugin;
    message: string;
    callback: ConfirmCallback;
    modal: Modal;

    constructor(plugin: SRPlugin, message: string, callback: ConfirmCallback) {
        this.plugin = plugin;
        this.message = message;
        this.modal = new Modal(plugin.app);
        this.callback = callback;
    }

    open() {
        const { contentEl } = this.modal;
        MarkdownRenderer.render(this.plugin.app, this.message, contentEl, "", this.plugin);
        // contentEl.createEl("p").setText(this.message);

        const buttonDiv = contentEl.createDiv("srs-flex-row");
        // buttonDiv.setAttribute("justify-content", "space-evenly");

        new ButtonComponent(buttonDiv)
            .setButtonText("Confirm")
            .onClick(() => {
                this.callback(true);
                this.close();
            })
            .setCta();

        new ButtonComponent(buttonDiv).setButtonText("Cancel").onClick(() => {
            this.callback(false);
            this.close();
        });
        this.modal.open();
    }

    close() {
        this.modal.close();
    }
}
