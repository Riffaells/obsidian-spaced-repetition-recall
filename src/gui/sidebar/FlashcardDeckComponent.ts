import type SRPlugin from "src/main";
import { Deck } from "src/Deck";
import { FilterType } from "./types";
import { FlashcardReviewMode } from "src/FlashcardReviewSequencer";
import { t } from "src/lang/helpers";
import { CardGroupComponent } from "./CardGroupComponent";

export interface FlashcardDeckStats {
    deckName: string;
    newCount: number;
    dueCount: number;
    reviewedCount: number;
    totalCount: number;
}

export class FlashcardDeckComponent {
    private readonly plugin: SRPlugin;
    private deck: Deck;
    private readonly containerEl: HTMLElement;
    private filter: FilterType;
    private readonly expandedDecks: Set<string>;
    private readonly expandedGroups: Set<string>;
    private readonly onToggleDeck: (deckName: string) => void;
    private readonly onToggleGroup: (groupKey: string) => void;
    private readonly groupComponents: Map<string, CardGroupComponent> = new Map();
    private deckEl: HTMLElement | null = null;
    private abortController: AbortController | null = null;
    private cachedStats: FlashcardDeckStats | null = null;

    constructor(
        plugin: SRPlugin,
        deck: Deck,
        containerEl: HTMLElement,
        filter: FilterType,
        expandedDecks: Set<string>,
        expandedGroups: Set<string>,
        onToggleDeck: (deckName: string) => void,
        onToggleGroup: (groupKey: string) => void,
    ) {
        this.plugin = plugin;
        this.deck = deck;
        this.containerEl = containerEl;
        this.filter = filter;
        this.expandedDecks = expandedDecks;
        this.expandedGroups = expandedGroups;
        this.onToggleDeck = onToggleDeck;
        this.onToggleGroup = onToggleGroup;
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

    private shouldRender(): boolean {
        if (!this.deck || (this.deck.newFlashcards.length === 0 && this.deck.dueFlashcards.length === 0)) {
            return false;
        }

        if (this.filter === FilterType.ACTIVE && !this.hasActiveCards()) {
            return false;
        }

        if (this.filter === FilterType.REVIEWED && !this.hasReviewedCards()) {
            return false;
        }

        return true;
    }

    private createDeckElement(): void {
        this.abortController = new AbortController();
        this.deckEl = this.containerEl.createDiv("sr-flashcard-deck");

        const isExpanded = this.expandedDecks.has(this.deck.deckName);
        const header = this.renderHeader(isExpanded);
        const content = this.deckEl.createDiv("sr-flashcard-deck-content");

        if (!isExpanded) {
            content.style.display = "none";
        }

        this.attachEventListeners(header);
        this.reconcileGroups(content);
    }

    private attachEventListeners(header: HTMLElement): void {
        if (!this.abortController) return;

        // Expand/collapse handler on header
        header.addEventListener(
            "click",
            () => this.onToggleDeck(this.deck.deckName),
            { signal: this.abortController.signal }
        );

        // Deck review handler on title
        const title = header.querySelector(".sr-flashcard-deck-title");
        if (title) {
            title.addEventListener(
                "click",
                (e: Event) => {
                    e.stopPropagation();
                    this.openDeckReview();
                },
                { signal: this.abortController.signal }
            );
        }
    }

    private removeElement(): void {
        if (this.deckEl) {
            this.deckEl.remove();
            this.deckEl = null;
        }
        
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    public update(filter: FilterType, deck?: Deck): void {
        this.filter = filter;

        if (deck) {
            this.deck = deck;
            this.cachedStats = null; // Invalidate cache
        }

        if (!this.deckEl) return;

        this.updateHeader();
        this.updateContent();
    }

    private updateHeader(): void {
        if (!this.deckEl) return;

        const header = this.deckEl.querySelector(".sr-flashcard-deck-header");
        if (!header) return;

        const deckStats = this.getStats();
        const stats = header.querySelector(".sr-flashcard-deck-stats");
        
        if (stats) {
            this.updateStatsElement(stats, deckStats);
        }

        if (this.expandedDecks.has(this.deck.deckName)) {
            header.addClass("sr-deck-expanded");
        } else {
            header.removeClass("sr-deck-expanded");
        }
    }

    private updateContent(): void {
        if (!this.deckEl) return;

        const content = this.deckEl.querySelector(".sr-flashcard-deck-content") as HTMLElement;
        if (!content) return;

        const isExpanded = this.expandedDecks.has(this.deck.deckName);
        content.style.display = isExpanded ? "block" : "none";

        this.reconcileGroups(content);
    }

    public destroy(): void {
        for (const group of this.groupComponents.values()) {
            group.destroy();
        }
        this.groupComponents.clear();

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        if (this.deckEl) {
            this.deckEl.remove();
            this.deckEl = null;
        }

        this.cachedStats = null;
    }

    private renderHeader(isExpanded: boolean): HTMLElement {
        if (!this.deckEl) {
            throw new Error("Cannot render header without deckEl");
        }

        const header = this.deckEl.createDiv("sr-flashcard-deck-header");

        const title = header.createDiv("sr-flashcard-deck-title");
        title.setText(this.deck.deckName);

        const stats = header.createDiv("sr-flashcard-deck-stats");
        const deckStats = this.getStats();
        this.updateStatsElement(stats, deckStats);

        if (isExpanded) {
            header.addClass("sr-deck-expanded");
        }

        return header;
    }

    private updateStatsElement(statsEl: Element, deckStats: FlashcardDeckStats): void {
        statsEl.setText(
            `${deckStats.newCount} / ${deckStats.dueCount} / ${deckStats.reviewedCount}`
        );
        statsEl.setAttribute(
            "aria-label",
            `${t("NEW_CARDS")}: ${deckStats.newCount}, ${t("DUE_CARDS")}: ${deckStats.dueCount}, Reviewed: ${deckStats.reviewedCount}`
        );
    }

    private getStats(): FlashcardDeckStats {
        if (this.cachedStats) {
            return this.cachedStats;
        }

        const newCount = this.deck.newFlashcards?.length || 0;
        let dueCount = 0;
        let reviewedCount = 0;

        if (this.deck.dueFlashcards) {
            for (const card of this.deck.dueFlashcards) {
                if (card.isDue) {
                    dueCount++;
                } else {
                    reviewedCount++;
                }
            }
        }

        const totalCount = newCount + dueCount + reviewedCount;

        this.cachedStats = {
            deckName: this.deck.deckName,
            newCount,
            dueCount,
            reviewedCount,
            totalCount,
        };

        return this.cachedStats;
    }

    private reconcileGroups(content: HTMLElement): void {
        const groupsData = this.buildGroupsData();
        const newGroupKeys = new Set(groupsData.map((g) => g.key));

        // Remove groups that don't exist anymore
        for (const [key, component] of this.groupComponents) {
            if (!newGroupKeys.has(key)) {
                component.destroy();
                this.groupComponents.delete(key);
            }
        }

        // Create or update groups
        for (const data of groupsData) {
            let component = this.groupComponents.get(data.key);
            if (component) {
                component.update(data.cards);
            } else {
                component = new CardGroupComponent(
                    this.plugin,
                    data.title,
                    data.cards,
                    this.deck,
                    content,
                    data.key,
                    this.expandedGroups,
                    this.onToggleGroup,
                );
                this.groupComponents.set(data.key, component);
                component.render();
            }
        }
    }

    private buildGroupsData(): Array<{ title: string; cards: any[]; key: string }> {
        const groupsData: Array<{ title: string; cards: any[]; key: string }> = [];

        // Group new cards
        if (
            this.filter !== FilterType.REVIEWED &&
            this.deck.newFlashcards &&
            this.deck.newFlashcards.length > 0
        ) {
            const groupKey = this.createGroupKey(t("NEW_CARDS"));
            groupsData.push({
                title: t("NEW_CARDS"),
                cards: this.deck.newFlashcards,
                key: groupKey,
            });
        }

        // Group due cards
        if (this.deck.dueFlashcards && this.deck.dueFlashcards.length > 0) {
            const groupedCards = this.groupDueCards();

            for (const [title, cards] of Object.entries(groupedCards)) {
                if (cards && cards.length > 0) {
                    const groupKey = this.createGroupKey(title);
                    groupsData.push({ title, cards, key: groupKey });
                }
            }
        }

        return groupsData;
    }

    private groupDueCards(): Record<string, any[]> {
        const groupedCards: Record<string, any[]> = {};

        for (const card of this.deck.dueFlashcards) {
            if (this.filter === FilterType.ACTIVE && !card.isDue) {
                continue;
            }
            if (this.filter === FilterType.REVIEWED && card.isDue) {
                continue;
            }

            const groupTitle = card.isDue ? t("DUE_CARDS") : "Reviewed";

            if (!groupedCards[groupTitle]) {
                groupedCards[groupTitle] = [];
            }
            groupedCards[groupTitle].push(card);
        }

        return groupedCards;
    }

    private createGroupKey(groupTitle: string): string {
        return `${this.deck.deckName}::${groupTitle}`;
    }

    private hasActiveCards(): boolean {
        if (this.deck.newFlashcards && this.deck.newFlashcards.length > 0) {
            return true;
        }

        if (this.deck.dueFlashcards && this.deck.dueFlashcards.length > 0) {
            return this.deck.dueFlashcards.some(card => card.isDue);
        }

        return false;
    }

    private hasReviewedCards(): boolean {
        if (this.deck.dueFlashcards && this.deck.dueFlashcards.length > 0) {
            return this.deck.dueFlashcards.some(card => !card.isDue);
        }

        return false;
    }

    private async openDeckReview(): Promise<void> {
        await this.plugin.sync();
        
        // Open the review interface - the plugin will handle deck selection
        this.plugin.tabViewManager.openSRTabView(FlashcardReviewMode.Review);
    }
}
