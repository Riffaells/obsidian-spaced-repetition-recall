/**
 * Modal for configuring deck icon and color styles
 */

import { App, Modal, Setting, setIcon } from "obsidian";
import { t } from "src/lang/helpers";
import {
    DeckIconStyle,
    applyDeckStyle,
    removeDeckStyle,
} from "src/gui/sidebar/DeckIconConfig";
import { IconPickerModal } from "./IconPickerModal";

export class DeckIconModal extends Modal {
    private deckName: string;
    private currentStyle: DeckIconStyle;
    private onSave: (style: DeckIconStyle | null) => void;
    private previewEl: HTMLElement | null = null;
    private iconButtonEl: HTMLElement | null = null;

    constructor(
        app: App,
        deckName: string,
        currentStyle: DeckIconStyle | null,
        onSave: (style: DeckIconStyle | null) => void,
    ) {
        super(app);
        this.deckName = deckName;
        this.currentStyle = currentStyle ? { ...currentStyle } : {};
        this.onSave = onSave;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("sr-deck-icon-modal");

        // Title
        contentEl.createEl("h3", { text: t("DECK_ICON_SETTINGS") });
        contentEl.createEl("p", {
            text: this.deckName,
            cls: "sr-deck-icon-modal-deck-name",
        });

        // Preview section
        this.renderPreview(contentEl);

        // Icon section
        this.renderIconSection(contentEl);

        // Appearance section (text, background, border colors)
        this.renderAppearanceSection(contentEl);

        // Buttons
        this.renderButtons(contentEl);
    }

    private renderPreview(container: HTMLElement): void {
        const previewSection = container.createDiv("sr-deck-icon-preview-section");
        previewSection.createEl("h4", { text: t("PREVIEW") });

        this.previewEl = previewSection.createDiv("sr-deck-icon-preview");
        this.updatePreview();
    }

    private updatePreview(): void {
        if (!this.previewEl) return;
        this.previewEl.empty();

        const header = this.previewEl.createDiv("sr-deck-icon-preview-header");
        const title = header.createDiv("sr-deck-icon-preview-title");

        // Remove any existing styles first
        removeDeckStyle(header, title);

        // Apply current style
        if (Object.keys(this.currentStyle).length > 0) {
            applyDeckStyle(header, title, this.currentStyle);
        }

        // Add deck name
        const nameEl = title.createSpan("sr-deck-name");
        nameEl.setText(this.deckName);
        if (this.currentStyle.textColor) {
            nameEl.style.color = this.currentStyle.textColor;
        }
    }

    private renderIconSection(container: HTMLElement): void {
        const section = container.createDiv("sr-deck-icon-section");
        section.createEl("h4", { text: t("ICON") });

        // Icon picker button
        const iconSetting = new Setting(section)
            .setName(t("SELECT_ICON"))
            .setDesc(t("SELECT_ICON_DESC"));

        // Create icon button
        this.iconButtonEl = iconSetting.controlEl.createDiv("sr-icon-select-btn");
        this.updateIconButton();

        this.iconButtonEl.addEventListener("click", () => {
            new IconPickerModal(
                this.app,
                this.currentStyle.icon || null,
                (iconId) => {
                    this.currentStyle.icon = iconId || undefined;
                    this.updateIconButton();
                    this.updatePreview();
                },
            ).open();
        });

        // Icon color picker
        new Setting(section)
            .setName(t("ICON_COLOR"))
            .addColorPicker((color) => {
                color
                    .setValue(this.currentStyle.iconColor || "#7f8c8d")
                    .onChange((value) => {
                        this.currentStyle.iconColor = value;
                        this.updatePreview();
                    });
            })
            .addExtraButton((btn) => {
                btn.setIcon("reset")
                    .setTooltip(t("RESET_DEFAULT"))
                    .onClick(() => {
                        this.currentStyle.iconColor = undefined;
                        this.updatePreview();
                    });
            });
    }

    private updateIconButton(): void {
        if (!this.iconButtonEl) return;
        this.iconButtonEl.empty();

        if (this.currentStyle.icon) {
            try {
                setIcon(this.iconButtonEl, this.currentStyle.icon);
            } catch {
                this.iconButtonEl.setText(t("SELECT_ICON"));
            }
            this.iconButtonEl.setAttribute("title", this.currentStyle.icon);
        } else {
            this.iconButtonEl.setText(t("SELECT_ICON"));
            this.iconButtonEl.removeAttribute("title");
        }
    }

    private renderAppearanceSection(container: HTMLElement): void {
        const section = container.createDiv("sr-deck-icon-section");
        section.createEl("h4", { text: t("APPEARANCE") });

        // Text color
        new Setting(section)
            .setName(t("TEXT_COLOR"))
            .addColorPicker((color) => {
                color
                    .setValue(this.currentStyle.textColor || "#000000")
                    .onChange((value) => {
                        this.currentStyle.textColor = value;
                        this.updatePreview();
                    });
            })
            .addExtraButton((btn) => {
                btn.setIcon("reset")
                    .setTooltip(t("RESET_DEFAULT"))
                    .onClick(() => {
                        this.currentStyle.textColor = undefined;
                        this.updatePreview();
                    });
            });

        // Background color
        new Setting(section)
            .setName(t("BACKGROUND_COLOR"))
            .addColorPicker((color) => {
                color
                    .setValue(this.currentStyle.backgroundColor || "#ffffff")
                    .onChange((value) => {
                        this.currentStyle.backgroundColor = value;
                        this.updatePreview();
                    });
            })
            .addExtraButton((btn) => {
                btn.setIcon("reset")
                    .setTooltip(t("RESET_DEFAULT"))
                    .onClick(() => {
                        this.currentStyle.backgroundColor = undefined;
                        this.updatePreview();
                    });
            });

        // Border color
        new Setting(section)
            .setName(t("BORDER_COLOR"))
            .addColorPicker((color) => {
                color
                    .setValue(this.currentStyle.borderColor || "#cccccc")
                    .onChange((value) => {
                        this.currentStyle.borderColor = value;
                        this.updatePreview();
                    });
            })
            .addExtraButton((btn) => {
                btn.setIcon("reset")
                    .setTooltip(t("RESET_DEFAULT"))
                    .onClick(() => {
                        this.currentStyle.borderColor = undefined;
                        this.updatePreview();
                    });
            });
    }

    private renderButtons(container: HTMLElement): void {
        const buttonRow = container.createDiv("sr-deck-icon-buttons");

        // Clear button
        const clearBtn = buttonRow.createEl("button", { text: t("CLEAR_STYLE") });
        clearBtn.addEventListener("click", () => {
            this.onSave(null);
            this.close();
        });

        // Cancel button
        const cancelBtn = buttonRow.createEl("button", { text: t("CANCEL") });
        cancelBtn.addEventListener("click", () => {
            this.close();
        });

        // Save button
        const saveBtn = buttonRow.createEl("button", {
            text: t("SAVE"),
            cls: "mod-cta",
        });
        saveBtn.addEventListener("click", () => {
            // Clean up empty values before saving
            const cleanStyle: DeckIconStyle = {};
            if (this.currentStyle.icon) cleanStyle.icon = this.currentStyle.icon;
            if (this.currentStyle.iconColor) cleanStyle.iconColor = this.currentStyle.iconColor;
            if (this.currentStyle.textColor) cleanStyle.textColor = this.currentStyle.textColor;
            if (this.currentStyle.backgroundColor) cleanStyle.backgroundColor = this.currentStyle.backgroundColor;
            if (this.currentStyle.borderColor) cleanStyle.borderColor = this.currentStyle.borderColor;

            this.onSave(Object.keys(cleanStyle).length > 0 ? cleanStyle : null);
            this.close();
        });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
