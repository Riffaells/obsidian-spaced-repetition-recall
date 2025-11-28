import { App, Setting, TextComponent, Notice, getAllTags, TFolder, setIcon } from "obsidian";
import type SRPlugin from "src/main";
import { TextInputSuggest } from "src/suggesters/suggest";

interface TagsManagerProps {
    containerEl: HTMLElement;
    plugin: SRPlugin;
    app: App;
    title: string;
    description: string;
    tags: string[];
    onTagsChange: (tags: string[]) => Promise<void>;
    requireHashtag?: boolean; // Для тегов нужен #, для папок - нет
    placeholder?: string;
}

class TagSuggest extends TextInputSuggest<string> {
    private availableItems: string[];
    private requireHashtag: boolean;

    constructor(
        inputEl: HTMLInputElement,
        availableItems: string[],
        requireHashtag: boolean,
    ) {
        super(inputEl);
        this.availableItems = availableItems;
        this.requireHashtag = requireHashtag;
    }

    getSuggestions(inputStr: string): string[] {
        const searchStr = inputStr.toLowerCase();
        return this.availableItems.filter((item) =>
            item.toLowerCase().includes(searchStr)
        ).slice(0, 10); // Limit to 10 suggestions
    }

    renderSuggestion(item: string, el: HTMLElement): void {
        el.setText(item);
    }

    selectSuggestion(item: string): void {
        this.inputEl.value = item;
        this.inputEl.trigger("input");
        this.close();
    }
}

export class TagsManager {
    private containerEl: HTMLElement;
    private plugin: SRPlugin;
    private app: App;
    private title: string;
    private description: string;
    private tags: string[];
    private onTagsChange: (tags: string[]) => Promise<void>;
    private tagsListEl: HTMLElement;
    private inputComponent: TextComponent;
    private requireHashtag: boolean;
    private placeholder: string;
    private editingTag: string | null = null;
    private allAvailableTags: string[] = [];
    private suggester: TagSuggest | null = null;
    private addButton: HTMLButtonElement | null = null;

    constructor(props: TagsManagerProps) {
        this.containerEl = props.containerEl;
        this.plugin = props.plugin;
        this.app = props.app;
        this.title = props.title;
        this.description = props.description;
        this.tags = [...props.tags];
        this.onTagsChange = props.onTagsChange;
        this.requireHashtag = props.requireHashtag ?? true;
        this.placeholder = props.placeholder ?? (this.requireHashtag ? "#tag" : "folder/path");
        
        // Загружаем автодополнение
        if (this.requireHashtag) {
            this.loadAvailableTags();
        } else {
            this.loadAvailableFolders();
        }
    }

    private loadAvailableTags(): void {
        // Асинхронная загрузка тегов для больших хранилищ
        setTimeout(() => {
            const metadataCache = this.app.metadataCache;
            const allTags = new Set<string>();
            
            this.app.vault.getMarkdownFiles().forEach(file => {
                const cache = metadataCache.getFileCache(file);
                if (cache) {
                    const fileTags = getAllTags(cache);
                    if (fileTags) {
                        fileTags.forEach(tag => allTags.add(tag));
                    }
                }
            });
            
            this.allAvailableTags = Array.from(allTags).sort();
            
            // Обновляем suggester если он уже создан
            if (this.suggester && this.inputComponent) {
                this.suggester = new TagSuggest(
                    this.inputComponent.inputEl,
                    this.allAvailableTags,
                    this.requireHashtag
                );
            }
        }, 0);
    }

    private loadAvailableFolders(): void {
        setTimeout(() => {
            const folders = this.app.vault.getAllLoadedFiles()
                .filter(f => f instanceof TFolder) as TFolder[];
            this.allAvailableTags = folders
                .map(folder => folder.path)
                .filter(path => path !== "")
                .sort();
            
            // Обновляем suggester если он уже создан
            if (this.suggester && this.inputComponent) {
                this.suggester = new TagSuggest(
                    this.inputComponent.inputEl,
                    this.allAvailableTags,
                    this.requireHashtag
                );
            }
        }, 0);
    }

    render(): void {
        const setting = new Setting(this.containerEl)
            .setName(this.title)
            .setDesc(this.description);

        const controlsContainer = setting.controlEl.createDiv("tags-manager-controls");

        const inputRow = controlsContainer.createDiv("tags-input-row");

        const inputWrapper = inputRow.createDiv("tags-input-wrapper");

        this.inputComponent = new TextComponent(inputWrapper);
        this.inputComponent.setPlaceholder(this.placeholder);
        this.inputComponent.inputEl.setAttribute("aria-label", this.requireHashtag ? "Add tag" : "Add folder");
        
        // Создаем suggester (будет обновлен после загрузки данных)
        this.suggester = new TagSuggest(
            this.inputComponent.inputEl,
            this.allAvailableTags,
            this.requireHashtag
        );
        
        this.inputComponent.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (this.editingTag) {
                    this.saveEdit();
                } else {
                    this.addTag();
                }
            } else if (e.key === "Escape" && this.editingTag) {
                this.cancelEdit();
            }
        });

        // Add/Save button
        this.addButton = inputRow.createEl("button");
        this.addButton.addClass("mod-cta");
        this.addButton.addEventListener("click", () => {
            if (this.editingTag) {
                this.saveEdit();
            } else {
                this.addTag();
            }
        });
        this.updateButtonText();

        // Tags list
        this.tagsListEl = controlsContainer.createDiv("tags-list");
        this.renderTagsList();
    }

    private updateButtonText(): void {
        if (this.addButton) {
            this.addButton.textContent = this.editingTag ? "Save" : "Add";
        }
    }

    public destroy(): void {
        if (this.suggester) {
            this.suggester.close();
            this.suggester = null;
        }
    }

    private renderTagsList(): void {
        this.tagsListEl.empty();

        if (this.tags.length === 0) {
            const emptyMsg = this.tagsListEl.createDiv("tags-empty-message");
            emptyMsg.textContent = this.requireHashtag ? "No tags added yet" : "No folders added yet";
            return;
        }

        for (const tag of this.tags) {
            const tagEl = this.tagsListEl.createDiv("tag-item");
            
            const tagText = tagEl.createSpan({ text: tag });
            tagText.addClass("tag-text");
            
            // Edit button
            const editBtn = tagEl.createEl("button", { 
                cls: "tag-action-btn",
                attr: { "aria-label": `Edit ${tag}` }
            });
            setIcon(editBtn, "pencil");
            editBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.startEdit(tag);
            });

            // Remove button
            const removeBtn = tagEl.createEl("button", { 
                cls: "tag-action-btn tag-remove-btn",
                attr: { "aria-label": `Remove ${tag}` }
            });
            removeBtn.textContent = "×";
            removeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.removeTag(tag);
            });
        }
    }

    private startEdit(tag: string): void {
        this.editingTag = tag;
        this.inputComponent.setValue(tag);
        this.inputComponent.inputEl.focus();
        this.inputComponent.inputEl.select();
        this.updateButtonText();
    }

    private cancelEdit(): void {
        this.editingTag = null;
        this.inputComponent.setValue("");
        this.updateButtonText();
    }

    private async saveEdit(): Promise<void> {
        if (!this.editingTag) return;

        let newValue = this.inputComponent.getValue().trim();
        if (!newValue) {
            new Notice("Value cannot be empty");
            return;
        }

        newValue = this.normalizeValue(newValue);

        if (newValue === this.editingTag) {
            this.cancelEdit();
            return;
        }

        // Валидация для папок
        if (!this.requireHashtag) {
            const folderExists = this.app.vault.getAbstractFileByPath(newValue) instanceof TFolder;
            if (!folderExists && !newValue.includes("*")) {
                new Notice(`Folder "${newValue}" does not exist`);
                return;
            }
        }

        if (this.tags.includes(newValue)) {
            new Notice("This item already exists");
            return;
        }

        const index = this.tags.indexOf(this.editingTag);
        if (index !== -1) {
            this.tags[index] = newValue;
            await this.onTagsChange(this.tags);
            this.renderTagsList();
        }

        this.cancelEdit();
    }

    private normalizeValue(value: string): string {
        if (this.requireHashtag && !value.startsWith("#")) {
            return "#" + value;
        }
        return value;
    }

    private async addTag(): Promise<void> {
        let tag = this.inputComponent.getValue().trim();
        if (!tag) return;

        tag = this.normalizeValue(tag);

        // Валидация для папок
        if (!this.requireHashtag) {
            const folderExists = this.app.vault.getAbstractFileByPath(tag) instanceof TFolder;
            if (!folderExists && !tag.includes("*")) {
                new Notice(`Folder "${tag}" does not exist`);
                return;
            }
        }

        if (this.tags.includes(tag)) {
            new Notice("This item already exists");
            this.inputComponent.setValue("");
            return;
        }

        this.tags.push(tag);
        this.inputComponent.setValue("");
        await this.onTagsChange(this.tags);
        this.renderTagsList();
    }

    private async removeTag(tag: string): Promise<void> {
        this.tags = this.tags.filter((t) => t !== tag);
        await this.onTagsChange(this.tags);
        this.renderTagsList();
    }
}

export function createTagsManager(
    containerEl: HTMLElement,
    plugin: SRPlugin,
    app: App,
    title: string,
    description: string,
    tags: string[],
    onTagsChange: (tags: string[]) => Promise<void>,
    requireHashtag: boolean = true,
    placeholder?: string,
): void {
    const manager = new TagsManager({
        containerEl,
        plugin,
        app,
        title,
        description,
        tags,
        onTagsChange,
        requireHashtag,
        placeholder,
    });
    manager.render();
}
