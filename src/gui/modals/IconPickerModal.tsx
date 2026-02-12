/**
 * Modal for selecting an icon from all available Obsidian icons
 * Uses getIconIds() to get all icons including custom ones from plugins like Iconize
 * Implements virtual scrolling for performance with large icon sets
 */

import { App, Modal, setIcon, getIconIds } from "obsidian";
import { t } from "src/lang/helpers";

const ICONS_PER_ROW = 8;
const ICON_SIZE = 40;
const ICON_GAP = 4;
const ROW_HEIGHT = ICON_SIZE + ICON_GAP;
const BUFFER_ROWS = 3; // Render extra rows above/below viewport

export class IconPickerModal extends Modal {
    private onSelect: (iconId: string | null) => void;
    private searchInput: HTMLInputElement | null = null;
    private iconGrid: HTMLElement | null = null;
    private scrollContainer: HTMLElement | null = null;
    private allIcons: string[] = [];
    private filteredIcons: string[] = [];
    private selectedIcon: string | null;
    private renderedRows: Map<number, HTMLElement> = new Map();
    private lastScrollTop = 0;
    private scrollTimeout: number | null = null;

    constructor(
        app: App,
        selectedIcon: string | null,
        onSelect: (iconId: string | null) => void,
    ) {
        super(app);
        this.selectedIcon = selectedIcon;
        this.onSelect = onSelect;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("sr-icon-picker-modal");

        // Title
        contentEl.createEl("h3", { text: t("SELECT_ICON") });

        // Search input
        const searchContainer = contentEl.createDiv("sr-icon-search-container");
        this.searchInput = searchContainer.createEl("input", {
            type: "text",
            placeholder: t("SEARCH_ICONS"),
            cls: "sr-icon-search-input",
        });
        this.searchInput.addEventListener("input", () => this.filterIcons());

        // Clear selection button
        const clearBtn = contentEl.createEl("button", {
            text: t("CLEAR_ICON"),
            cls: "sr-icon-clear-btn",
        });
        clearBtn.addEventListener("click", () => {
            this.onSelect(null);
            this.close();
        });

        // Scroll container with virtual scrolling
        this.scrollContainer = contentEl.createDiv("sr-icon-picker-scroll");
        this.iconGrid = this.scrollContainer.createDiv("sr-icon-picker-grid");

        // Setup scroll listener
        this.scrollContainer.addEventListener("scroll", () => this.onScroll());

        // Load all icons
        this.loadIcons();
    }

    private loadIcons(): void {
        // Get all available icons from Obsidian (includes custom icons from plugins)
        try {
            this.allIcons = getIconIds();
        } catch {
            // Fallback if getIconIds is not available
            this.allIcons = [];
        }

        this.filteredIcons = this.allIcons;
        this.setupVirtualScroll();
        this.renderVisibleIcons();
    }

    private filterIcons(): void {
        const query = this.searchInput?.value.toLowerCase() || "";
        
        if (!query) {
            this.filteredIcons = this.allIcons;
        } else {
            this.filteredIcons = this.allIcons.filter((icon) =>
                icon.toLowerCase().includes(query)
            );
        }

        // Clear rendered rows and reset scroll
        this.renderedRows.clear();
        if (this.scrollContainer) {
            this.scrollContainer.scrollTop = 0;
        }
        
        this.setupVirtualScroll();
        this.renderVisibleIcons();
    }

    private setupVirtualScroll(): void {
        if (!this.iconGrid) return;

        const totalRows = Math.ceil(this.filteredIcons.length / ICONS_PER_ROW);
        const totalHeight = totalRows * ROW_HEIGHT;

        // Set grid height to create scrollable area
        this.iconGrid.style.height = `${totalHeight}px`;
        this.iconGrid.style.position = "relative";
    }

    private onScroll(): void {
        // Debounce scroll events
        if (this.scrollTimeout !== null) {
            window.clearTimeout(this.scrollTimeout);
        }

        this.scrollTimeout = window.setTimeout(() => {
            this.renderVisibleIcons();
            this.scrollTimeout = null;
        }, 16); // ~60fps
    }

    private renderVisibleIcons(): void {
        if (!this.iconGrid || !this.scrollContainer) return;

        const scrollTop = this.scrollContainer.scrollTop;
        const containerHeight = this.scrollContainer.clientHeight;

        // Calculate visible row range
        const firstVisibleRow = Math.floor(scrollTop / ROW_HEIGHT);
        const lastVisibleRow = Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT);

        // Add buffer rows
        const startRow = Math.max(0, firstVisibleRow - BUFFER_ROWS);
        const endRow = Math.min(
            Math.ceil(this.filteredIcons.length / ICONS_PER_ROW),
            lastVisibleRow + BUFFER_ROWS
        );

        // Remove rows outside visible range
        for (const [rowIndex, rowEl] of this.renderedRows) {
            if (rowIndex < startRow || rowIndex >= endRow) {
                rowEl.remove();
                this.renderedRows.delete(rowIndex);
            }
        }

        // Render visible rows
        for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
            if (!this.renderedRows.has(rowIndex)) {
                this.renderRow(rowIndex);
            }
        }

        this.lastScrollTop = scrollTop;
    }

    private renderRow(rowIndex: number): void {
        if (!this.iconGrid) return;

        const startIdx = rowIndex * ICONS_PER_ROW;
        const endIdx = Math.min(startIdx + ICONS_PER_ROW, this.filteredIcons.length);
        const icons = this.filteredIcons.slice(startIdx, endIdx);

        if (icons.length === 0) return;

        const row = document.createElement("div");
        row.addClass("sr-icon-picker-row");
        row.style.position = "absolute";
        row.style.top = `${rowIndex * ROW_HEIGHT}px`;
        row.style.left = "0";
        row.style.right = "0";
        row.style.height = `${ICON_SIZE}px`;
        row.style.display = "flex";
        row.style.gap = `${ICON_GAP}px`;

        for (const iconId of icons) {
            const btn = row.createDiv("sr-icon-picker-btn");
            btn.setAttribute("aria-label", iconId);
            btn.setAttribute("title", iconId);

            // Lazy load icon
            this.loadIcon(btn, iconId);

            if (this.selectedIcon === iconId) {
                btn.addClass("sr-selected");
            }

            btn.addEventListener("click", () => {
                this.onSelect(iconId);
                this.close();
            });
        }

        this.iconGrid.appendChild(row);
        this.renderedRows.set(rowIndex, row);
    }

    private loadIcon(element: HTMLElement, iconId: string): void {
        // Use requestIdleCallback for non-blocking icon rendering
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.renderIcon(element, iconId);
            });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
                this.renderIcon(element, iconId);
            }, 0);
        }
    }

    private renderIcon(element: HTMLElement, iconId: string): void {
        try {
            setIcon(element, iconId);
        } catch {
            // Skip icons that fail to render
            element.style.display = "none";
        }
    }

    onClose(): void {
        const { contentEl } = this;
        
        // Cleanup
        if (this.scrollTimeout !== null) {
            window.clearTimeout(this.scrollTimeout);
        }
        this.renderedRows.clear();
        
        contentEl.empty();
    }
}
