/**
 * Common settings component for all rule types
 * Renders: name, enabled, priority, tag pattern, scope settings
 */

import { Setting } from "obsidian";
import { FlashcardRule } from "src/parser/rule-based/types";
import { t } from "src/lang/helpers";

/**
 * Render common settings shared by all rule types
 */
export function renderCommonSettings(containerEl: HTMLElement, rule: FlashcardRule): void {
    // Name
    new Setting(containerEl)
        .setName(t("RULE_NAME"))
        .setDesc(t("RULE_NAME_DESC"))
        .addText((text) =>
            text
                .setPlaceholder(t("RULE_NAME_PLACEHOLDER"))
                .setValue(rule.name)
                .onChange((value) => {
                    rule.name = value;
                }),
        );

    // Enabled
    new Setting(containerEl)
        .setName(t("RULE_ENABLED"))
        .setDesc(t("RULE_ENABLED_DESC"))
        .addToggle((toggle) =>
            toggle.setValue(rule.enabled).onChange((value) => {
                rule.enabled = value;
            }),
        );

    // Priority
    new Setting(containerEl)
        .setName(t("RULE_PRIORITY"))
        .setDesc(t("RULE_PRIORITY_DESC"))
        .addText((text) =>
            text
                .setPlaceholder("0")
                .setValue(String(rule.priority))
                .onChange((value) => {
                    const num = parseInt(value);
                    rule.priority = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
                }),
        );

    // Tag Pattern
    renderTagPatternSetting(containerEl, rule);

    // Scope Settings
    renderScopeSettings(containerEl, rule);
}

/**
 * Render tag pattern setting with exact/regex mode
 */
function renderTagPatternSetting(containerEl: HTMLElement, rule: FlashcardRule): void {
    const isPattern = hasRegexMetachars(rule.tagPattern);

    const setting = new Setting(containerEl)
        .setName(t("TAG_PATTERN"))
        .setDesc(t("TAG_PATTERN_DESC"));

    // Mode dropdown
    setting.addDropdown((dropdown) => {
        dropdown
            .addOption("exact", t("EXACT_TAG"))
            .addOption("pattern", t("REGEX_PATTERN"))
            .setValue(isPattern ? "pattern" : "exact")
            .onChange((value) => {
                if (value === "exact" && isPattern) {
                    // Convert regex to exact tag
                    rule.tagPattern = rule.tagPattern.replace(/[\^$]/g, "");
                } else if (value === "pattern" && !isPattern) {
                    // Convert exact tag to regex
                    rule.tagPattern = `^${escapeRegex(rule.tagPattern)}$`;
                }
                updateInput();
            });
    });

    // Tag input
    let inputEl: HTMLInputElement;
    setting.addText((text) => {
        inputEl = text.inputEl;
        text.setValue(rule.tagPattern).onChange((value) => {
            rule.tagPattern = value;
        });
        if (isPattern) {
            text.inputEl.addClass("sr-monospace");
        }
    });

    const updateInput = () => {
        const newIsPattern = hasRegexMetachars(rule.tagPattern);
        inputEl.value = rule.tagPattern;
        if (newIsPattern) {
            inputEl.addClass("sr-monospace");
        } else {
            inputEl.removeClass("sr-monospace");
        }
    };
}

/**
 * Render scope settings (collapsible)
 */
function renderScopeSettings(containerEl: HTMLElement, rule: FlashcardRule): void {
    const scopeContainer = containerEl.createDiv("sr-scope-settings");

    // Collapsible header
    const header = scopeContainer.createDiv("sr-scope-header");
    const arrow = header.createSpan({ cls: "sr-scope-arrow" });
    arrow.textContent = "▶";
    header.createSpan({ text: t("SCOPE_SETTINGS") });

    const content = scopeContainer.createDiv("sr-scope-content sr-hidden");

    let isExpanded = false;
    header.addEventListener("click", () => {
        isExpanded = !isExpanded;
        content.toggleClass("sr-hidden", !isExpanded);
        arrow.textContent = isExpanded ? "▼" : "▶";
    });

    // Ancestor header pattern
    new Setting(content)
        .setName(t("ANCESTOR_HEADER_PATTERN"))
        .setDesc(t("ANCESTOR_HEADER_PATTERN_DESC"))
        .addText((text) =>
            text
                .setPlaceholder(t("ANCESTOR_HEADER_PLACEHOLDER"))
                .setValue(rule.scope?.ancestorHeader || "")
                .onChange((value) => {
                    if (!rule.scope) rule.scope = {};
                    if (value.trim()) {
                        rule.scope.ancestorHeader = value;
                    } else {
                        delete rule.scope.ancestorHeader;
                        if (Object.keys(rule.scope).length === 0) {
                            delete rule.scope;
                        }
                    }
                }),
        )
        .then((setting) => {
            setting.controlEl.querySelector("input")?.addClass("sr-monospace");
        });

    // Folder path pattern
    new Setting(content)
        .setName(t("FOLDER_PATH_PATTERN"))
        .setDesc(t("FOLDER_PATH_PATTERN_DESC"))
        .addText((text) =>
            text
                .setPlaceholder(t("FOLDER_PATH_PLACEHOLDER"))
                .setValue(rule.scope?.folderPath || "")
                .onChange((value) => {
                    if (!rule.scope) rule.scope = {};
                    if (value.trim()) {
                        rule.scope.folderPath = value;
                    } else {
                        delete rule.scope.folderPath;
                        if (Object.keys(rule.scope).length === 0) {
                            delete rule.scope;
                        }
                    }
                }),
        )
        .then((setting) => {
            setting.controlEl.querySelector("input")?.addClass("sr-monospace");
        });
}

/**
 * Check if string contains regex metacharacters
 */
function hasRegexMetachars(str: string): boolean {
    return /[\[\]().*+?^$|\\]/.test(str);
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
