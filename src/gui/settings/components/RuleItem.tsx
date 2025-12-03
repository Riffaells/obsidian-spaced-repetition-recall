/**
 * Reusable rule item component
 */

import { setIcon } from "obsidian";
import { FlashcardTagRule } from "src/parser/header-based/types";

interface RuleItemProps {
    rule: FlashcardTagRule;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: (enabled: boolean) => void;
}

/**
 * Create a rule item element
 */
export function createRuleItem(containerEl: HTMLElement, props: RuleItemProps): HTMLElement {
    const { rule, onEdit, onDelete, onToggle } = props;

    const itemEl = containerEl.createDiv("flashcard-rule-item");
    if (!rule.enabled) {
        itemEl.setAttribute("data-enabled", "false");
    }

    // Toggle checkbox
    const toggleEl = itemEl.createDiv({ cls: "rule-toggle" });
    const checkbox = toggleEl.createEl("input", { type: "checkbox" });
    checkbox.checked = rule.enabled;
    checkbox.addEventListener("change", () => onToggle(checkbox.checked));

    // Rule info
    const infoEl = itemEl.createDiv({ cls: "rule-info" });

    // Header with name and tag
    const headerEl = infoEl.createDiv({ cls: "rule-header" });
    
    const nameEl = headerEl.createSpan({ cls: "rule-name" });
    nameEl.textContent = rule.name;

    const tagEl = headerEl.createSpan({ cls: "rule-tag" });
    tagEl.textContent = rule.tagExact || rule.tagPattern || "";

    // Details
    const detailsEl = infoEl.createDiv({ cls: "rule-details" });

    // Source badge
    let sourceType = "inline";
    if (rule.headerRules) sourceType = "header";
    else if (rule.multilineRules) sourceType = "multiline";
    else if (rule.clozeRules) sourceType = "cloze";

    const sourceBadge = detailsEl.createSpan({ cls: `rule-badge rule-badge-${sourceType}` });
    sourceBadge.textContent = sourceType.toUpperCase();

    // Priority badge (if > 0)
    if (rule.priority > 0) {
        const priorityBadge = detailsEl.createSpan({ cls: "rule-badge rule-badge-priority" });
        priorityBadge.textContent = `Priority: ${rule.priority}`;
    }

    // Configuration details
    const configText = getConfigurationText(rule);
    if (configText) {
        const configEl = detailsEl.createSpan({ cls: "rule-config" });
        configEl.textContent = configText;
    }

    // Actions
    const actionsEl = itemEl.createDiv({ cls: "rule-actions" });

    const editBtn = actionsEl.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": `Edit ${rule.name}` },
    });
    setIcon(editBtn, "pencil");
    editBtn.addEventListener("click", onEdit);

    const deleteBtn = actionsEl.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": `Delete ${rule.name}` },
    });
    setIcon(deleteBtn, "trash");
    deleteBtn.addEventListener("click", onDelete);

    return itemEl;
}

/**
 * Get human-readable configuration text
 */
function getConfigurationText(rule: FlashcardTagRule): string {
    const details: string[] = [];

    if (rule.headerRules) {
        const hr = rule.headerRules;
        details.push(`Levels: ${hr.headingLevels.map((l) => `h${l}`).join(", ")}`);
        details.push(`Mode: ${hr.cardMode}`);
        details.push(`Nesting: ${hr.nestingMode}`);
        if (hr.selectors.length > 0) {
            details.push(`Selectors: ${hr.selectors.length}`);
        }
        if (hr.includeParents > 0) {
            details.push(`Context: ${hr.includeParents} parent(s)`);
        }
    } else if (rule.inlineRules) {
        details.push(`Separator: "${rule.inlineRules.separator}"`);
    } else if (rule.multilineRules) {
        details.push(`Separator: "${rule.multilineRules.separator}"`);
        if (rule.multilineRules.endMarker) {
            details.push(`End: "${rule.multilineRules.endMarker}"`);
        }
    } else if (rule.clozeRules) {
        details.push(`Patterns: ${rule.clozeRules.patterns.length}`);
    }

    return details.join(" • ");
}
