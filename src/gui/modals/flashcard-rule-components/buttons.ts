import { ButtonComponent } from "obsidian";

export function renderButtons(
    containerEl: HTMLElement,
    onSave: () => void,
    onCancel: () => void
): void {
    const buttonsDiv = containerEl.createDiv("modal-button-container");
    buttonsDiv.style.display = "flex";
    buttonsDiv.style.justifyContent = "flex-end";
    buttonsDiv.style.gap = "8px";
    buttonsDiv.style.marginTop = "20px";

    new ButtonComponent(buttonsDiv)
        .setButtonText("Cancel")
        .onClick(onCancel);

    new ButtonComponent(buttonsDiv)
        .setButtonText("Create Rule")
        .setCta()
        .onClick(onSave);
}
