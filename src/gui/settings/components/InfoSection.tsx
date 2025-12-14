/**
 * Reusable info section component for settings
 */

import { setIcon } from "obsidian";

interface InfoSectionProps {
    title: string;
    icon?: string; // Obsidian icon name
    description: string;
    items?: string[];
    tip?: string;
}

/**
 * Create an info section with title, description, and optional items
 */
export function createInfoSection(containerEl: HTMLElement, props: InfoSectionProps): HTMLElement {
    const section = containerEl.createDiv("sr-info-section");

    // Title with icon
    const titleContainer = section.createDiv({ cls: "sr-info-title-container" });

    if (props.icon) {
        const iconEl = titleContainer.createSpan({ cls: "sr-info-icon" });
        setIcon(iconEl, props.icon);
    }

    const title = titleContainer.createEl("h3", { cls: "sr-info-title" });
    title.textContent = props.title;

    // Description
    const desc = section.createDiv({ cls: "sr-info-description" });
    desc.innerHTML = `<p>${props.description}</p>`;

    // Items list
    if (props.items && props.items.length > 0) {
        const list = desc.createEl("ul");
        for (const item of props.items) {
            list.createEl("li").innerHTML = item;
        }
    }

    // Tip with lightbulb icon
    if (props.tip) {
        const tipContainer = desc.createDiv({ cls: "sr-info-tip" });
        const tipIcon = tipContainer.createSpan({ cls: "sr-info-tip-icon" });
        setIcon(tipIcon, "lightbulb");
        const tipText = tipContainer.createSpan();
        tipText.textContent = props.tip;
    }

    return section;
}
