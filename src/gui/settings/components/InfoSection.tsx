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

    // Header with icon and title
    const headerContainer = section.createDiv({ cls: "sr-info-section-header" });

    if (props.icon) {
        const iconEl = headerContainer.createSpan({ cls: "sr-info-section-icon" });
        setIcon(iconEl, props.icon);
    }

    const title = headerContainer.createEl("h3", { cls: "sr-info-section-title" });
    title.textContent = props.title;

    // Description
    const desc = section.createDiv({ cls: "sr-info-section-description" });
    desc.innerHTML = props.description;

    // Items list
    if (props.items && props.items.length > 0) {
        const list = section.createEl("ul", { cls: "sr-info-section-items" });
        for (const item of props.items) {
            list.createEl("li").innerHTML = item;
        }
    }

    // Tip
    if (props.tip) {
        const tipContainer = section.createDiv({ cls: "sr-info-section-tip" });
        tipContainer.textContent = `💡 ${props.tip}`;
    }

    return section;
}
