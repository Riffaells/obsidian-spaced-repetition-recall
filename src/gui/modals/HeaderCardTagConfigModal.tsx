import { App, Modal, Setting } from "obsidian";
import { HeaderCardConfig } from "src/parser/header-based/types";

export class HeaderCardTagConfigModal extends Modal {
    private tagName: string;
    private config: HeaderCardConfig;
    private onSave: (tagName: string, config: HeaderCardConfig) => void;
    private onCancel: () => void;
    private isEditMode: boolean;
    private originalTagName: string;
    private regexPreviewEl: HTMLElement | null = null;
    private regexErrorEl: HTMLElement | null = null;

    constructor(
        app: App,
        tagName: string,
        config: HeaderCardConfig,
        onSave: (tagName: string, config: HeaderCardConfig) => void,
        onCancel: () => void,
        isEditMode: boolean = false,
    ) {
        super(app);
        this.tagName = tagName;
        this.originalTagName = tagName;
        this.config = { ...config };
        this.onSave = onSave;
        this.onCancel = onCancel;
        this.isEditMode = isEditMode;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("header-card-tag-config-modal");

        contentEl.createEl("h2", {
            text: this.isEditMode ? "Edit Custom Tag" : "Add Custom Tag",
        });

        // Tag name input
        new Setting(contentEl)
            .setName("Tag Name")
            .setDesc(
                'Enter the tag name (e.g., "#flashcard/h2" or "#questions"). Supports regex patterns like "#flashcard/h[123]" or "#questions/h[2-4]".',
            )
            .addText((text) =>
                text
                    .setPlaceholder("#flashcard/h2")
                    .setValue(this.tagName)
                    .onChange((value) => {
                        this.tagName = value.trim();
                        this.updateRegexPreview();
                    }),
            );

        // Regex preview container
        const previewContainer = contentEl.createDiv();
        previewContainer.style.marginBottom = "16px";

        this.regexErrorEl = previewContainer.createDiv();
        this.regexErrorEl.style.color = "var(--text-error)";
        this.regexErrorEl.style.fontSize = "0.9em";
        this.regexErrorEl.style.marginBottom = "8px";
        this.regexErrorEl.style.display = "none";

        this.regexPreviewEl = previewContainer.createDiv();
        this.regexPreviewEl.style.padding = "8px";
        this.regexPreviewEl.style.backgroundColor = "var(--background-secondary)";
        this.regexPreviewEl.style.borderRadius = "4px";
        this.regexPreviewEl.style.fontSize = "0.9em";
        this.regexPreviewEl.style.display = "none";

        // Initial preview update
        this.updateRegexPreview();

        // Heading levels checkboxes
        const headingLevelsSetting = new Setting(contentEl)
            .setName("Heading Levels")
            .setDesc("Select which heading levels to convert to flashcards");

        const checkboxContainer = headingLevelsSetting.controlEl.createDiv();
        checkboxContainer.style.display = "flex";
        checkboxContainer.style.gap = "12px";
        checkboxContainer.style.flexWrap = "wrap";
        checkboxContainer.style.marginTop = "8px";

        for (let level = 1; level <= 6; level++) {
            const label = checkboxContainer.createEl("label");
            label.style.display = "flex";
            label.style.alignItems = "center";
            label.style.gap = "4px";
            label.style.cursor = "pointer";

            const checkbox = label.createEl("input", { type: "checkbox" });
            checkbox.checked = this.config.headingLevels.includes(level);

            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    if (!this.config.headingLevels.includes(level)) {
                        this.config.headingLevels = [...this.config.headingLevels, level].sort(
                            (a, b) => a - b,
                        );
                    }
                } else {
                    this.config.headingLevels = this.config.headingLevels.filter(
                        (l) => l !== level,
                    );
                }
            });

            label.createSpan({ text: `H${level}` });
        }

        // Nesting mode radio buttons
        const nestingModeSetting = new Setting(contentEl)
            .setName("Nesting Mode")
            .setDesc(
                "Nested: Include all subheadings in the answer. Flat: Stop at the first subheading.",
            );

        const nestingContainer = nestingModeSetting.controlEl.createDiv();
        nestingContainer.style.display = "flex";
        nestingContainer.style.flexDirection = "column";
        nestingContainer.style.gap = "8px";
        nestingContainer.style.marginTop = "8px";

        const nestedLabel = nestingContainer.createEl("label");
        nestedLabel.style.display = "flex";
        nestedLabel.style.alignItems = "center";
        nestedLabel.style.gap = "8px";
        nestedLabel.style.cursor = "pointer";

        const nestedRadio = nestedLabel.createEl("input", {
            type: "radio",
            attr: { name: "nestingMode", value: "nested" },
        });
        nestedRadio.checked = this.config.nestingMode === "nested";
        nestedRadio.addEventListener("change", () => {
            if (nestedRadio.checked) {
                this.config.nestingMode = "nested";
            }
        });
        nestedLabel.createSpan({ text: "Nested (include subheadings)" });

        const flatLabel = nestingContainer.createEl("label");
        flatLabel.style.display = "flex";
        flatLabel.style.alignItems = "center";
        flatLabel.style.gap = "8px";
        flatLabel.style.cursor = "pointer";

        const flatRadio = flatLabel.createEl("input", {
            type: "radio",
            attr: { name: "nestingMode", value: "flat" },
        });
        flatRadio.checked = this.config.nestingMode === "flat";
        flatRadio.addEventListener("change", () => {
            if (flatRadio.checked) {
                this.config.nestingMode = "flat";
            }
        });
        flatLabel.createSpan({ text: "Flat (stop at subheadings)" });

        // Recognition mode radio buttons
        const recognitionModeSetting = new Setting(contentEl)
            .setName("Recognition Mode")
            .setDesc(
                'QA: Only headings ending with "?" become cards. All: All headings of specified levels become cards.',
            );

        const recognitionContainer = recognitionModeSetting.controlEl.createDiv();
        recognitionContainer.style.display = "flex";
        recognitionContainer.style.flexDirection = "column";
        recognitionContainer.style.gap = "8px";
        recognitionContainer.style.marginTop = "8px";

        const qaLabel = recognitionContainer.createEl("label");
        qaLabel.style.display = "flex";
        qaLabel.style.alignItems = "center";
        qaLabel.style.gap = "8px";
        qaLabel.style.cursor = "pointer";

        const qaRadio = qaLabel.createEl("input", {
            type: "radio",
            attr: { name: "recognitionMode", value: "qa" },
        });
        qaRadio.checked = this.config.mode === "qa";
        qaRadio.addEventListener("change", () => {
            if (qaRadio.checked) {
                this.config.mode = "qa";
            }
        });
        qaLabel.createSpan({ text: 'QA (only headings with "?")' });

        const allLabel = recognitionContainer.createEl("label");
        allLabel.style.display = "flex";
        allLabel.style.alignItems = "center";
        allLabel.style.gap = "8px";
        allLabel.style.cursor = "pointer";

        const allRadio = allLabel.createEl("input", {
            type: "radio",
            attr: { name: "recognitionMode", value: "all" },
        });
        allRadio.checked = this.config.mode === "all";
        allRadio.addEventListener("change", () => {
            if (allRadio.checked) {
                this.config.mode = "all";
            }
        });
        allLabel.createSpan({ text: "All (all specified headings)" });

        // Enabled toggle
        new Setting(contentEl)
            .setName("Enabled")
            .setDesc("Enable or disable this custom tag configuration")
            .addToggle((toggle) =>
                toggle.setValue(this.config.enabled).onChange((value) => {
                    this.config.enabled = value;
                }),
            );

        // Buttons
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "flex-end";
        buttonContainer.style.gap = "8px";
        buttonContainer.style.marginTop = "20px";

        const cancelButton = buttonContainer.createEl("button");
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", () => {
            this.onCancel();
            this.close();
        });

        const saveButton = buttonContainer.createEl("button");
        saveButton.textContent = "Save";
        saveButton.addClass("mod-cta");
        saveButton.addEventListener("click", () => {
            this.save();
        });
    }

    private save() {
        // Validate tag name
        if (!this.tagName) {
            this.showError("Tag name is required");
            return;
        }

        // Ensure tag starts with #
        if (!this.tagName.startsWith("#")) {
            this.tagName = "#" + this.tagName;
        }

        // Validate regex pattern if it contains regex characters
        if (this.isRegexPattern(this.tagName)) {
            const validation = this.validateRegexPattern(this.tagName);
            if (!validation.valid) {
                this.showError(validation.error || "Invalid regex pattern");
                return;
            }
        }

        // Validate at least one heading level is selected
        if (this.config.headingLevels.length === 0) {
            this.showError("At least one heading level must be selected");
            return;
        }

        this.onSave(this.tagName, this.config);
        this.close();
    }

    private showError(message: string) {
        if (this.regexErrorEl) {
            this.regexErrorEl.textContent = message;
            this.regexErrorEl.style.display = "block";
        }
    }

    private hideError() {
        if (this.regexErrorEl) {
            this.regexErrorEl.style.display = "none";
        }
    }

    private isRegexPattern(tag: string): boolean {
        // Check if tag contains regex special characters
        return /[\[\]{}()*+?^$|\\]/.test(tag);
    }

    private validateRegexPattern(tag: string): { valid: boolean; error?: string } {
        try {
            // Try to convert the tag pattern to a regex
            const pattern = this.tagToRegexPattern(tag);
            new RegExp(pattern);
            return { valid: true };
        } catch (e) {
            return {
                valid: false,
                error: `Invalid regex pattern: ${e.message}`,
            };
        }
    }

    private tagToRegexPattern(tag: string): string {
        // Escape special regex characters except for [] which we want to keep
        // This converts #flashcard/h[123] to a valid regex pattern
        let pattern = tag
            .replace(/[.*+?^${}()|\\]/g, "\\$&")
            .replace(/\\\[/g, "[")
            .replace(/\\\]/g, "]");

        return `^${pattern}$`;
    }

    private updateRegexPreview() {
        this.hideError();

        if (!this.tagName || !this.regexPreviewEl) {
            if (this.regexPreviewEl) {
                this.regexPreviewEl.style.display = "none";
            }
            return;
        }

        // Check if this is a regex pattern
        if (!this.isRegexPattern(this.tagName)) {
            this.regexPreviewEl.style.display = "none";
            return;
        }

        // Validate the regex
        const validation = this.validateRegexPattern(this.tagName);
        if (!validation.valid) {
            this.regexPreviewEl.style.display = "none";
            this.showError(validation.error || "Invalid regex pattern");
            return;
        }

        // Generate preview of matched tags
        const matchedTags = this.generateMatchedTags(this.tagName);

        if (matchedTags.length > 0) {
            this.regexPreviewEl.style.display = "block";
            this.regexPreviewEl.innerHTML = "";

            const title = this.regexPreviewEl.createEl("div");
            title.style.fontWeight = "bold";
            title.style.marginBottom = "4px";
            title.textContent = "Preview - This pattern matches:";

            const tagList = this.regexPreviewEl.createEl("div");
            tagList.style.marginLeft = "8px";
            tagList.textContent = matchedTags.join(", ");
        } else {
            this.regexPreviewEl.style.display = "none";
        }
    }

    private generateMatchedTags(pattern: string): string[] {
        const matched: string[] = [];

        try {
            const regexPattern = this.tagToRegexPattern(pattern);
            const regex = new RegExp(regexPattern);

            // Generate common tag variations to test against
            const testTags: string[] = [];

            // Extract base tag (everything before the regex part)
            const baseMatch = pattern.match(/^([^[\]]+)/);
            if (!baseMatch) return [];

            const base = baseMatch[1];

            // If pattern contains [123] or [1-6], generate h1-h6 variations
            if (/h\[/.test(pattern)) {
                for (let i = 1; i <= 6; i++) {
                    testTags.push(`${base}h${i}`);
                }
            }

            // Test each generated tag against the regex
            for (const tag of testTags) {
                if (regex.test(tag)) {
                    matched.push(tag);
                }
            }

            // Limit to first 10 matches for display
            return matched.slice(0, 10);
        } catch (e) {
            return [];
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
