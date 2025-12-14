import { ButtonComponent } from "obsidian";
import { t } from "src/lang/helpers";

export function renderButtons(
    containerEl: HTMLElement,
    onSave: () => void,
    onCancel: () => void,
    isEditMode: boolean = true,
): void {
    const buttonsDiv = containerEl.createDiv("modal-button-container");
    buttonsDiv.style.display = "flex";
    buttonsDiv.style.justifyContent = "flex-end";
    buttonsDiv.style.gap = "8px";
    buttonsDiv.style.marginTop = "20px";

    new ButtonComponent(buttonsDiv).setButtonText(t("CANCEL")).onClick(onCancel);

    new ButtonComponent(buttonsDiv)
        .setButtonText(isEditMode ? t("SAVE") : t("CREATE"))
        .setCta()
        .onClick(onSave);
}
