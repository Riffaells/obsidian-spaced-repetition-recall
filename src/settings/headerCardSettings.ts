import { Notice, Setting, setIcon } from "obsidian";
import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { HeaderCardConfig } from "src/parser/header-based/types";
import { HeaderCardTagConfigModal } from "src/gui/modals/HeaderCardTagConfigModal";
import { generatePredefinedTags } from "src/parser/header-based/utils";

/**
 * Creates the settings section for header-based flashcards
 */
export function createHeaderCardSettings(
    containerEl: HTMLElement,
    plugin: SRPlugin,
): void {
    containerEl.createEl("h3", { text: "Header-Based Flashcards" });

    // Enable/disable header-based cards
    new Setting(containerEl)
        .setName("Enable Header-Based Flashcards")
        .setDesc(
            "Allow creating flashcards from markdown headings. Headings become questions and content below becomes answers.",
        )
        .addToggle((toggle) =>
            toggle
                .setValue(plugin.data.settings.enableHeaderBasedCards)
                .onChange(async (value) => {
                    plugin.data.settings.enableHeaderBasedCards = value;
                    await plugin.savePluginData();
                }),
        );

    // Default heading levels
    new Setting(containerEl)
        .setName("Default Heading Levels")
        .setDesc(
            "Which heading levels to convert to flashcards by default (e.g., h2, h3). Select multiple levels.",
        )
        .addDropdown((dropdown) => {
            const currentLevels = plugin.data.settings.headerCardBaseConfig.headingLevels;
            
            // Create a display value showing selected levels
            const displayValue = currentLevels.length > 0 
                ? currentLevels.map(l => `h${l}`).join(", ")
                : "None selected";
            
            dropdown
                .addOption("configure", displayValue)
                .setValue("configure")
                .onChange(async () => {
                    // This will be handled by the multi-select UI below
                });
            
            dropdown.selectEl.disabled = true;
            dropdown.selectEl.style.cursor = "default";
        });

    // Add checkboxes for each heading level
    const headingLevelsContainer = containerEl.createDiv({ cls: "setting-item-description" });
    headingLevelsContainer.style.marginTop = "8px";
    headingLevelsContainer.style.marginLeft = "0px";
    
    const checkboxContainer = headingLevelsContainer.createDiv();
    checkboxContainer.style.display = "flex";
    checkboxContainer.style.gap = "12px";
    checkboxContainer.style.flexWrap = "wrap";

    for (let level = 1; level <= 6; level++) {
        const label = checkboxContainer.createEl("label");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "4px";
        label.style.cursor = "pointer";

        const checkbox = label.createEl("input", { type: "checkbox" });
        checkbox.checked = plugin.data.settings.headerCardBaseConfig.headingLevels.includes(level);
        
        checkbox.addEventListener("change", async () => {
            const currentLevels = plugin.data.settings.headerCardBaseConfig.headingLevels;
            if (checkbox.checked) {
                if (!currentLevels.includes(level)) {
                    plugin.data.settings.headerCardBaseConfig.headingLevels = [
                        ...currentLevels,
                        level,
                    ].sort((a, b) => a - b);
                }
            } else {
                plugin.data.settings.headerCardBaseConfig.headingLevels = currentLevels.filter(
                    (l) => l !== level,
                );
            }
            await plugin.savePluginData();
        });

        label.createSpan({ text: `H${level}` });
    }

    // Nesting mode
    new Setting(containerEl)
        .setName("Default Nesting Mode")
        .setDesc(
            "Nested: Include all subheadings in the answer. Flat: Stop at the first subheading.",
        )
        .addDropdown((dropdown) =>
            dropdown
                .addOption("nested", "Nested (include subheadings)")
                .addOption("flat", "Flat (stop at subheadings)")
                .setValue(plugin.data.settings.headerCardBaseConfig.nestingMode)
                .onChange(async (value: "nested" | "flat") => {
                    plugin.data.settings.headerCardBaseConfig.nestingMode = value;
                    await plugin.savePluginData();
                }),
        );

    // Recognition mode
    new Setting(containerEl)
        .setName("Default Recognition Mode")
        .setDesc(
            'QA: Only headings ending with "?" become cards. All: All headings of specified levels become cards.',
        )
        .addDropdown((dropdown) =>
            dropdown
                .addOption("qa", 'QA (only headings with "?")')
                .addOption("all", "All (all specified headings)")
                .setValue(plugin.data.settings.headerCardBaseConfig.mode)
                .onChange(async (value: "qa" | "all") => {
                    plugin.data.settings.headerCardBaseConfig.mode = value;
                    await plugin.savePluginData();
                }),
        );

    // Show context toggle
    new Setting(containerEl)
        .setName("Show Heading Context")
        .setDesc(
            "Display the hierarchy of parent headings above the question (e.g., 'JavaScript > React > What are hooks?').",
        )
        .addToggle((toggle) =>
            toggle
                .setValue(plugin.data.settings.headerCardShowContext)
                .onChange(async (value) => {
                    plugin.data.settings.headerCardShowContext = value;
                    await plugin.savePluginData();
                }),
        );

    // Predefined tags section
    displayPredefinedTags(containerEl, plugin);

    // Custom tags section
    containerEl.createEl("h4", { text: "Custom Tags", cls: "setting-item-heading" });
    containerEl.createDiv({
        text: "Create custom tags with specific configurations for header-based flashcards.",
        cls: "setting-item-description",
    });

    createCustomTagsManager(containerEl, plugin);
}

/**
 * Displays the predefined tags section (read-only)
 * 
 * This function generates and displays all predefined tags based on the current base configuration.
 * The tags are organized into categories:
 * - Level Tags: Individual heading levels (h1-h6)
 * - Range Tags: Common heading level ranges (h2-h3, h1-h3, h3-h5)
 * - Recognition Mode Tags: qa and all modes
 * - Nesting Mode Tags: nested and flat modes
 * 
 * The tags are displayed in a read-only format with:
 * - Grayed out appearance (opacity: 0.8)
 * - No edit/delete buttons
 * - Default cursor (not clickable)
 * - Configuration details shown inline
 * 
 * Requirements: 10
 */
function displayPredefinedTags(containerEl: HTMLElement, plugin: SRPlugin): void {
    containerEl.createEl("h4", { text: "Predefined Tags (Read-Only)", cls: "setting-item-heading" });
    
    const descriptionEl = containerEl.createDiv({
        cls: "setting-item-description",
    });
    descriptionEl.style.marginBottom = "12px";
    descriptionEl.textContent = 
        "These tags are automatically generated based on your base settings above. " +
        "They cannot be edited directly - modify the base settings to change their behavior.";

    // Generate predefined tags based on current base config
    const predefinedTags = generatePredefinedTags(plugin.data.settings.headerCardBaseConfig);

    // Container for predefined tags list
    const tagsListContainer = containerEl.createDiv("predefined-tags-list");
    tagsListContainer.style.marginTop = "8px";
    tagsListContainer.style.marginBottom = "16px";

    // Group tags by category for better organization
    const levelTags: [string, HeaderCardConfig][] = [];
    const rangeTags: [string, HeaderCardConfig][] = [];
    const modeTags: [string, HeaderCardConfig][] = [];
    const nestingTags: [string, HeaderCardConfig][] = [];

    for (const [tagName, config] of predefinedTags.entries()) {
        if (tagName.match(/#flashcards\/h\d$/)) {
            // Individual level tags (h1, h2, etc.)
            levelTags.push([tagName, config]);
        } else if (tagName.match(/#flashcards\/h\d-h\d$/)) {
            // Range tags (h2-h3, etc.)
            rangeTags.push([tagName, config]);
        } else if (tagName === "#flashcards/qa" || tagName === "#flashcards/all") {
            // Mode tags
            modeTags.push([tagName, config]);
        } else if (tagName === "#flashcards/nested" || tagName === "#flashcards/flat") {
            // Nesting mode tags
            nestingTags.push([tagName, config]);
        }
    }

    // Render each category
    if (levelTags.length > 0) {
        renderPredefinedTagCategory(tagsListContainer, "Level Tags", levelTags);
    }
    if (rangeTags.length > 0) {
        renderPredefinedTagCategory(tagsListContainer, "Range Tags", rangeTags);
    }
    if (modeTags.length > 0) {
        renderPredefinedTagCategory(tagsListContainer, "Recognition Mode Tags", modeTags);
    }
    if (nestingTags.length > 0) {
        renderPredefinedTagCategory(tagsListContainer, "Nesting Mode Tags", nestingTags);
    }
}

/**
 * Renders a category of predefined tags
 */
function renderPredefinedTagCategory(
    containerEl: HTMLElement,
    categoryName: string,
    tags: [string, HeaderCardConfig][],
): void {
    const categoryEl = containerEl.createDiv("predefined-tag-category");
    categoryEl.style.marginBottom = "12px";

    const categoryTitleEl = categoryEl.createDiv("predefined-tag-category-title");
    categoryTitleEl.textContent = categoryName;
    categoryTitleEl.style.fontSize = "0.9em";
    categoryTitleEl.style.fontWeight = "600";
    categoryTitleEl.style.color = "var(--text-muted)";
    categoryTitleEl.style.marginBottom = "6px";

    const tagsContainer = categoryEl.createDiv("predefined-tag-items");

    for (const [tagName, config] of tags) {
        const tagItemEl = tagsContainer.createDiv("predefined-tag-item");
        tagItemEl.style.display = "flex";
        tagItemEl.style.alignItems = "center";
        tagItemEl.style.justifyContent = "space-between";
        tagItemEl.style.padding = "6px 12px";
        tagItemEl.style.marginBottom = "3px";
        tagItemEl.style.border = "1px solid var(--background-modifier-border)";
        tagItemEl.style.borderRadius = "4px";
        tagItemEl.style.backgroundColor = "var(--background-primary-alt)";
        tagItemEl.style.opacity = "0.8";
        tagItemEl.style.cursor = "default";

        // Tag name
        const tagNameEl = tagItemEl.createDiv("predefined-tag-name");
        tagNameEl.textContent = tagName;
        tagNameEl.style.fontFamily = "var(--font-monospace)";
        tagNameEl.style.fontSize = "0.95em";
        tagNameEl.style.fontWeight = "500";
        tagNameEl.style.color = "var(--text-normal)";
        tagNameEl.style.flex = "0 0 auto";
        tagNameEl.style.minWidth = "180px";

        // Tag configuration details
        const tagDetailsEl = tagItemEl.createDiv("predefined-tag-details");
        tagDetailsEl.style.fontSize = "0.85em";
        tagDetailsEl.style.color = "var(--text-muted)";
        tagDetailsEl.style.flex = "1";
        tagDetailsEl.style.textAlign = "right";

        const details: string[] = [];
        
        // Only show non-empty heading levels
        if (config.headingLevels.length > 0) {
            details.push(`Levels: ${config.headingLevels.map((l) => `h${l}`).join(", ")}`);
        }
        
        details.push(`Mode: ${config.mode}`);
        details.push(`Nesting: ${config.nestingMode}`);

        tagDetailsEl.textContent = details.join(" • ");
    }
}

/**
 * Creates the custom tags management UI
 */
function createCustomTagsManager(containerEl: HTMLElement, plugin: SRPlugin): void {
    const customTagsContainer = containerEl.createDiv("custom-tags-container");

    // Add custom tag button
    const addButtonContainer = customTagsContainer.createDiv("custom-tags-add-button-container");
    addButtonContainer.style.marginBottom = "12px";

    const addButton = addButtonContainer.createEl("button");
    addButton.textContent = "Add Custom Tag";
    addButton.addClass("mod-cta");
    addButton.addEventListener("click", () => {
        openCustomTagModal(plugin, "", null, false, () => {
            renderCustomTagsList(customTagsListEl, plugin);
        });
    });

    // Custom tags list
    const customTagsListEl = customTagsContainer.createDiv("custom-tags-list");
    renderCustomTagsList(customTagsListEl, plugin);
}

/**
 * Renders the list of custom tags
 */
function renderCustomTagsList(containerEl: HTMLElement, plugin: SRPlugin): void {
    containerEl.empty();

    const customTags = plugin.data.settings.headerCardCustomTags;
    const tagNames = Object.keys(customTags);

    if (tagNames.length === 0) {
        const emptyMsg = containerEl.createDiv("custom-tags-empty-message");
        emptyMsg.textContent = "No custom tags configured yet";
        emptyMsg.style.color = "var(--text-muted)";
        emptyMsg.style.fontStyle = "italic";
        emptyMsg.style.padding = "8px 0";
        return;
    }

    for (const tagName of tagNames) {
        const config = customTags[tagName];
        const tagItemEl = containerEl.createDiv("custom-tag-item");
        tagItemEl.style.display = "flex";
        tagItemEl.style.alignItems = "center";
        tagItemEl.style.justifyContent = "space-between";
        tagItemEl.style.padding = "8px 12px";
        tagItemEl.style.marginBottom = "4px";
        tagItemEl.style.border = "1px solid var(--background-modifier-border)";
        tagItemEl.style.borderRadius = "4px";
        tagItemEl.style.backgroundColor = "var(--background-secondary)";

        // Tag info
        const tagInfoEl = tagItemEl.createDiv("custom-tag-info");
        tagInfoEl.style.flex = "1";

        const tagNameEl = tagInfoEl.createDiv("custom-tag-name");
        tagNameEl.textContent = tagName;
        tagNameEl.style.fontWeight = "500";
        tagNameEl.style.marginBottom = "4px";

        const tagDetailsEl = tagInfoEl.createDiv("custom-tag-details");
        tagDetailsEl.style.fontSize = "0.9em";
        tagDetailsEl.style.color = "var(--text-muted)";

        const details: string[] = [];
        details.push(`Levels: ${config.headingLevels.map((l) => `h${l}`).join(", ")}`);
        details.push(`Mode: ${config.mode}`);
        details.push(`Nesting: ${config.nestingMode}`);
        details.push(`Enabled: ${config.enabled ? "Yes" : "No"}`);

        tagDetailsEl.textContent = details.join(" • ");

        // Action buttons
        const actionsEl = tagItemEl.createDiv("custom-tag-actions");
        actionsEl.style.display = "flex";
        actionsEl.style.gap = "4px";

        // Edit button
        const editBtn = actionsEl.createEl("button", {
            cls: "clickable-icon",
            attr: { "aria-label": `Edit ${tagName}` },
        });
        setIcon(editBtn, "pencil");
        editBtn.addEventListener("click", () => {
            openCustomTagModal(plugin, tagName, config, true, () => {
                renderCustomTagsList(containerEl, plugin);
            });
        });

        // Delete button
        const deleteBtn = actionsEl.createEl("button", {
            cls: "clickable-icon",
            attr: { "aria-label": `Delete ${tagName}` },
        });
        setIcon(deleteBtn, "trash");
        deleteBtn.addEventListener("click", async () => {
            const confirmed = confirm(
                `Are you sure you want to delete the custom tag "${tagName}"?`,
            );
            if (confirmed) {
                delete plugin.data.settings.headerCardCustomTags[tagName];
                await plugin.savePluginData();
                renderCustomTagsList(containerEl, plugin);
                new Notice(`Custom tag "${tagName}" deleted`);
            }
        });
    }
}

/**
 * Opens the custom tag configuration modal
 */
function openCustomTagModal(
    plugin: SRPlugin,
    tagName: string,
    config: HeaderCardConfig | null,
    isEditMode: boolean,
    onComplete: () => void,
): void {
    const defaultConfig: HeaderCardConfig = {
        headingLevels: [2],
        nestingMode: "nested",
        mode: "qa",
        enabled: true,
    };

    const modal = new HeaderCardTagConfigModal(
        plugin.app,
        tagName,
        config || defaultConfig,
        async (newTagName: string, newConfig: HeaderCardConfig) => {
            // Check if tag name changed and new name already exists
            if (isEditMode && newTagName !== tagName) {
                if (plugin.data.settings.headerCardCustomTags[newTagName]) {
                    new Notice(`Tag "${newTagName}" already exists`);
                    return;
                }
                // Delete old tag
                delete plugin.data.settings.headerCardCustomTags[tagName];
            } else if (!isEditMode && plugin.data.settings.headerCardCustomTags[newTagName]) {
                new Notice(`Tag "${newTagName}" already exists`);
                return;
            }

            // Save new/updated tag
            plugin.data.settings.headerCardCustomTags[newTagName] = newConfig;
            await plugin.savePluginData();

            new Notice(
                isEditMode
                    ? `Custom tag "${newTagName}" updated`
                    : `Custom tag "${newTagName}" added`,
            );
            onComplete();
        },
        () => {
            // Cancel callback - do nothing
        },
        isEditMode,
    );

    modal.open();
}
