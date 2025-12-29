import { groupNotes } from "./grouping";
import { calculateDaysUntilDue, createGroupKey, getGroupTitle, isNoteActive } from "./utils";
import SRPlugin from "src/main";
import { ReviewDeck, SchedNote } from "src/core/models/ReviewDeck";
import { TFile } from "obsidian";
import { FilterType, NoteSortType } from "src/gui/sidebar/types";
import { NoteGroupComponent } from "src/gui/sidebar/NoteGroupComponent";
import { t } from "src/lang/helpers";

export class DeckComponent {
    private readonly plugin: SRPlugin;
    private deck: ReviewDeck;
    private containerEl: HTMLElement;
    private activeFile: TFile | null;
    private filter: FilterType;
    private expandedDecks: Set<string>;
    private expandedGroups: Set<string>;
    private shouldAutoExpand: boolean;
    private onToggleDeck: (deckName: string) => void;
    private onToggleGroup: (groupKey: string) => void;
    private groupComponents: Map<string, NoteGroupComponent> = new Map();
    private deckEl: HTMLElement | null = null;
    private headerClickHandler: (() => void) | null = null;
    private noteSort: NoteSortType;
    private abortController = new AbortController();
    private showAllGroups: boolean = false;
    private showMoreButton: HTMLElement | null = null;
    private currentGroupsLimit: number = 0;

    constructor(
        plugin: SRPlugin,
        deck: ReviewDeck,
        containerEl: HTMLElement,
        activeFile: TFile | null,
        filter: FilterType,
        expandedDecks: Set<string>,
        expandedGroups: Set<string>,
        shouldAutoExpand: boolean,
        onToggleDeck: (deckName: string) => void,
        onToggleGroup: (groupKey: string) => void,
        noteSort: NoteSortType,
    ) {
        this.plugin = plugin;
        this.deck = deck;
        this.containerEl = containerEl;
        this.activeFile = activeFile;
        this.filter = filter;
        this.expandedDecks = expandedDecks;
        this.expandedGroups = expandedGroups;
        this.shouldAutoExpand = shouldAutoExpand;
        this.onToggleDeck = onToggleDeck;
        this.onToggleGroup = onToggleGroup;
        this.noteSort = noteSort;
    }

    public render(): HTMLElement | null {
        if (!this.shouldRender()) {
            this.removeElement();
            return null;
        }

        if (!this.deckEl) {
            this.createDeckElement();
        }

        return this.deckEl;
    }

    private createDeckElement(): void {
        this.deckEl = this.containerEl.createDiv("sr-new-deck");

        // Auto-expand if contains active file
        if (this.shouldAutoExpand) {
            const hasActiveFile = this.checkIfDeckContainsActiveFile();
            if (hasActiveFile) {
                this.expandedDecks.add(this.deck.deckName);
            }
        }

        const isExpanded = this.expandedDecks.has(this.deck.deckName);
        const header = this.renderHeader(this.deckEl, isExpanded);
        const content = this.deckEl.createDiv("sr-new-deck-content");

        if (!isExpanded) {
            content.addClass("sr-hidden");
        }

        this.attachEventListeners(header);
        this.reconcileGroups(content);
    }

    private attachEventListeners(header: HTMLElement): void {
        this.headerClickHandler = () => {
            this.onToggleDeck(this.deck.deckName);
        };

        header.addEventListener("click", this.headerClickHandler, {
            signal: this.abortController.signal,
        });
    }

    private removeElement(): void {
        if (this.deckEl) {
            this.deckEl.remove();
            this.deckEl = null;
        }
        this.headerClickHandler = null;
    }

    public update(
        activeFile: TFile | null,
        filter: FilterType,
        shouldAutoExpand: boolean,
        noteSort: NoteSortType,
        deck?: ReviewDeck,
    ): void {
        this.activeFile = activeFile;
        this.filter = filter;
        this.shouldAutoExpand = shouldAutoExpand;
        this.noteSort = noteSort;

        // Update deck reference if provided
        if (deck) {
            this.deck = deck;
        }

        // Check if component should be rendered
        if (!this.shouldRender()) {
            this.removeElement();
            return;
        }

        // If element doesn't exist, render it
        if (!this.deckEl) {
            this.render();
            return;
        }

        // Update existing element
        this.updateHeader();
        this.updateContent();
    }

    private shouldRender(): boolean {
        if (!this.deck || (!this.deck.newNotes?.length && !this.deck.scheduledNotes?.length)) {
            return false;
        }

        if (this.filter === FilterType.ACTIVE && !this.checkIfDeckHasActiveNotes()) {
            return false;
        }

        if (this.filter === FilterType.REVIEWED && !this.checkIfDeckHasReviewedNotes()) {
            return false;
        }

        return true;
    }

    private updateHeader(): void {
        if (!this.deckEl) return;

        // Auto-expand deck if it contains the active file
        if (this.shouldAutoExpand) {
            const hasActiveFile = this.checkIfDeckContainsActiveFile();
            if (hasActiveFile) {
                this.expandedDecks.add(this.deck.deckName);
            }
        }

        const header = this.deckEl.querySelector(".sr-new-deck-header");
        if (!header) return;

        const detailedStats = this.calculateDetailedStats();
        const stats = header.querySelector(".sr-new-deck-stats");
        if (stats) {
            stats.setText(
                `${detailedStats.newCount} / ${detailedStats.dueCount} / ${detailedStats.reviewedCount}`,
            );
            stats.setAttribute(
                "aria-label",
                `${t("NEW")}: ${detailedStats.newCount}, ${t("DUE_CARDS")}: ${detailedStats.dueCount}, ${t("REVIEWED")}: ${detailedStats.reviewedCount}`,
            );
        }

        if (this.expandedDecks.has(this.deck.deckName)) {
            header.addClass("sr-deck-expanded");
        } else {
            header.removeClass("sr-deck-expanded");
        }
    }

    private updateContent(): void {
        if (!this.deckEl) return;

        const content = this.deckEl.querySelector(".sr-new-deck-content") as HTMLElement;
        if (!content) return;

        const isExpanded = this.expandedDecks.has(this.deck.deckName);
        content.toggleClass("sr-hidden", !isExpanded);

        this.reconcileGroups(content);
    }
    private checkIfDeckHasActiveNotes(): boolean {
        if (this.deck.newNotes?.length > 0) {
            return true;
        }

        if (this.deck.scheduledNotes?.length > 0) {
            return this.deck.scheduledNotes.some((sNote) => isNoteActive(sNote, this.plugin));
        }

        return false;
    }

    private checkIfDeckHasReviewedNotes(): boolean {
        if (this.deck.scheduledNotes?.length > 0) {
            return this.deck.scheduledNotes.some((sNote) => !isNoteActive(sNote, this.plugin));
        }

        return false;
    }

    private checkIfDeckContainsActiveFile(): boolean {
        if (!this.activeFile) return false;

        const activePath = this.activeFile.path;

        if (this.deck.newNotes?.some((note) => note.note.path === activePath)) {
            return true;
        }

        if (this.deck.scheduledNotes?.some((note) => note.note.path === activePath)) {
            return true;
        }

        return false;
    }

    private renderHeader(deckEl: HTMLElement, isExpanded: boolean): HTMLElement {
        const header = deckEl.createDiv("sr-new-deck-header");

        const title = header.createDiv("sr-new-deck-title");
        title.setText(this.deck.deckName);

        const stats = header.createDiv("sr-new-deck-stats");

        const detailedStats = this.calculateDetailedStats();
        stats.setText(
            `${detailedStats.newCount} / ${detailedStats.dueCount} / ${detailedStats.reviewedCount}`,
        );
        stats.setAttribute(
            "aria-label",
            `${t("NEW")}: ${detailedStats.newCount}, ${t("DUE_CARDS")}: ${detailedStats.dueCount}, ${t("REVIEWED")}: ${detailedStats.reviewedCount}`,
        );

        if (isExpanded) {
            header.addClass("sr-deck-expanded");
        }

        return header;
    }

    private calculateDetailedStats(): {
        newCount: number;
        dueCount: number;
        reviewedCount: number;
    } {
        const newCount = this.deck.newNotes?.length || 0;
        let dueCount = 0;
        let reviewedCount = 0;

        if (this.deck.scheduledNotes?.length > 0) {
            for (const sNote of this.deck.scheduledNotes) {
                if (isNoteActive(sNote, this.plugin)) {
                    dueCount++;
                } else {
                    reviewedCount++;
                }
            }
        }

        return { newCount, dueCount, reviewedCount };
    }

    private reconcileGroups(content: HTMLElement): void {
        const groupsData: { title: string; notes: SchedNote[]; key: string }[] = [];

        if (
            this.filter !== FilterType.REVIEWED &&
            this.deck.newNotes &&
            this.deck.newNotes.length > 0
        ) {
            const groupKey = createGroupKey(this.deck.deckName, t("NEW"));
            if (this.shouldAutoExpand && this.checkIfGroupContainsActiveFile(this.deck.newNotes)) {
                this.expandedGroups.add(groupKey);
            }
            groupsData.push({
                title: t("NEW"),
                notes: this.deck.newNotes,
                key: groupKey,
            });
        }

        if (this.deck.scheduledNotes && this.deck.scheduledNotes.length > 0) {
            const groupedNotes = groupNotes(this.deck.scheduledNotes, this.plugin, this.filter);

            for (const [title, notes] of Object.entries(groupedNotes)) {
                if (!notes || notes.length === 0) continue;
                const groupKey = createGroupKey(this.deck.deckName, title);
                if (this.shouldAutoExpand && this.checkIfGroupContainsActiveFile(notes)) {
                    this.expandedGroups.add(groupKey);
                }
                groupsData.push({
                    title: title,
                    notes: notes,
                    key: groupKey,
                });
            }
        }

        // Determine how many groups to show
        const groupsLimit = this.plugin.data.settings.sidebarInitialGroupsLimit;
        
        // Calculate current limit based on state
        if (this.showAllGroups) {
            this.currentGroupsLimit = groupsData.length;
        } else if (this.currentGroupsLimit === 0) {
            this.currentGroupsLimit = groupsLimit;
        }
        
        const shouldLimitGroups = !this.showAllGroups && groupsData.length > this.currentGroupsLimit;
        const groupsToShow = shouldLimitGroups ? groupsData.slice(0, this.currentGroupsLimit) : groupsData;

        // 3. Reconcile
        const newGroupKeys = new Set(groupsToShow.map((g) => g.key));

        // Remove groups that dont exist anymore or became empty
        for (const [key, component] of this.groupComponents) {
            if (!newGroupKeys.has(key)) {
                component.destroy();
                this.groupComponents.delete(key);
            }
        }

        // Reset showAllNotes for collapsed groups
        for (const [key, component] of this.groupComponents) {
            if (!this.expandedGroups.has(key)) {
                component.resetShowAllNotes();
            }
        }

        // Create or Update groups in correct order
        for (let i = 0; i < groupsToShow.length; i++) {
            const data = groupsToShow[i];
            let component = this.groupComponents.get(data.key);
            
            if (component) {
                // Update existing component
                component.update(this.activeFile, data.notes, this.shouldAutoExpand);
                
                // Ensure component is in correct position
                const componentEl = component.getElement();
                if (componentEl) {
                    const currentIndex = Array.from(content.children).indexOf(componentEl);
                    if (currentIndex !== i) {
                        // Move to correct position
                        if (i === 0) {
                            content.prepend(componentEl);
                        } else {
                            const previousGroup = groupsToShow[i - 1];
                            const previousComponent = this.groupComponents.get(previousGroup.key);
                            const previousEl = previousComponent?.getElement();
                            if (previousEl) {
                                previousEl.after(componentEl);
                            }
                        }
                    }
                }
            } else {
                // Only create new groups if they have notes
                if (data.notes && data.notes.length > 0) {
                    component = new NoteGroupComponent(
                        this.plugin,
                        data.title,
                        data.notes,
                        this.activeFile,
                        this.deck,
                        content,
                        data.key,
                        this.expandedGroups,
                        this.shouldAutoExpand,
                        this.onToggleGroup,
                        this.noteSort,
                    );
                    const rendered = component.render();
                    if (rendered) {
                        this.groupComponents.set(data.key, component);
                        
                        // Insert in correct position
                        if (i === 0) {
                            content.prepend(rendered);
                        } else {
                            const previousGroup = groupsToShow[i - 1];
                            const previousComponent = this.groupComponents.get(previousGroup.key);
                            const previousEl = previousComponent?.getElement();
                            if (previousEl) {
                                previousEl.after(rendered);
                            } else {
                                content.appendChild(rendered);
                            }
                        }
                    }
                }
            }
        }

        // Show/hide "Show more" buttons
        this.updateShowMoreButtons(content, shouldLimitGroups, groupsData.length, this.currentGroupsLimit);
    }

    private updateShowMoreButtons(
        content: HTMLElement,
        shouldShow: boolean,
        totalCount: number,
        currentLimit: number,
    ): void {
        if (shouldShow) {
            const remainingCount = totalCount - currentLimit;
            const batchSize = this.plugin.data.settings.sidebarInitialGroupsLimit;
            
            if (!this.showMoreButton) {
                const buttonsContainer = content.createDiv("sr-show-more-buttons");
                
                // If remaining is less than or equal to batch size, show only "Show all" button
                if (remainingCount <= batchSize) {
                    const showAllButton = buttonsContainer.createDiv("sr-show-more-groups sr-show-all sr-single-button");
                    showAllButton.setText(t("SHOW_ALL_GROUPS", { count: remainingCount }));
                    showAllButton.addEventListener("click", () => {
                        this.showAllGroups = true;
                        const currentFile = this.plugin.app.workspace.getActiveFile();
                        this.update(currentFile, this.filter, false, this.noteSort);
                    });
                } else {
                    // Show both buttons
                    // Button 1: Show next batch
                    const showBatchButton = buttonsContainer.createDiv("sr-show-more-groups sr-show-batch");
                    const nextBatchCount = Math.min(batchSize, remainingCount);
                    showBatchButton.setText(t("SHOW_MORE_GROUPS_BATCH", { count: nextBatchCount }));
                    showBatchButton.addEventListener("click", () => {
                        // Increase limit by batch size
                        this.currentGroupsLimit += batchSize;
                        const currentFile = this.plugin.app.workspace.getActiveFile();
                        this.update(currentFile, this.filter, false, this.noteSort);
                    });
                    
                    // Button 2: Show all remaining
                    const showAllButton = buttonsContainer.createDiv("sr-show-more-groups sr-show-all");
                    showAllButton.setText(t("SHOW_ALL_GROUPS", { count: remainingCount }));
                    showAllButton.addEventListener("click", () => {
                        this.showAllGroups = true;
                        const currentFile = this.plugin.app.workspace.getActiveFile();
                        this.update(currentFile, this.filter, false, this.noteSort);
                    });
                }
                
                this.showMoreButton = buttonsContainer;
            } else {
                // Update button texts and visibility
                const batchButton = this.showMoreButton.querySelector(".sr-show-batch");
                const allButton = this.showMoreButton.querySelector(".sr-show-all");
                
                if (remainingCount <= batchSize) {
                    // Hide batch button, show only all button
                    if (batchButton) batchButton.addClass("sr-hidden");
                    if (allButton) {
                        allButton.removeClass("sr-hidden");
                        allButton.addClass("sr-single-button");
                        allButton.setText(t("SHOW_ALL_GROUPS", { count: remainingCount }));
                    }
                } else {
                    // Show both buttons
                    if (batchButton) {
                        batchButton.removeClass("sr-hidden");
                        const nextBatchCount = Math.min(batchSize, remainingCount);
                        batchButton.setText(t("SHOW_MORE_GROUPS_BATCH", { count: nextBatchCount }));
                    }
                    if (allButton) {
                        allButton.removeClass("sr-hidden");
                        allButton.removeClass("sr-single-button");
                        allButton.setText(t("SHOW_ALL_GROUPS", { count: remainingCount }));
                    }
                }
                
                this.showMoreButton.removeClass("sr-hidden");
            }
        } else {
            if (this.showMoreButton) {
                this.showMoreButton.addClass("sr-hidden");
            }
        }
    }

    private checkIfGroupContainsActiveFile(notes: SchedNote[]): boolean {
        if (!this.activeFile || !notes) return false;

        const activePath = this.activeFile.path;
        return notes.some((note) => note.note?.path === activePath);
    }

    public destroy(): void {
        for (const group of this.groupComponents.values()) {
            group.destroy();
        }
        this.groupComponents.clear();

        this.abortController.abort();
        this.headerClickHandler = null;

        if (this.showMoreButton) {
            this.showMoreButton.remove();
            this.showMoreButton = null;
        }

        if (this.deckEl) {
            this.deckEl.remove();
            this.deckEl = null;
        }
    }

    public resetShowAllGroups(): void {
        this.showAllGroups = false;
        this.currentGroupsLimit = 0;
    }

    public expandAllGroups(): void {
        this.showAllGroups = true;
        for (const component of this.groupComponents.values()) {
            component.showAll();
        }
    }
}
