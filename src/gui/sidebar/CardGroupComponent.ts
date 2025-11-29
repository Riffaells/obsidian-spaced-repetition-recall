import type SRPlugin from "src/main";
import { Card } from "src/Card";
import { Deck } from "src/Deck";
import { FlashcardReviewMode } from "src/FlashcardReviewSequencer";

export class CardGroupComponent {
    private plugin: SRPlugin;
    private title: string;
    private cards: Card[];
    private deck: Deck;
    private containerEl: HTMLElement;
    private groupKey: string;
    private expandedGroups: Set<string>;
    private onToggleGroup: (groupKey: string) => void;
    private groupEl: HTMLElement | null = null;
    private groupHeader: HTMLElement | null = null;
    private cardsList: HTMLElement | null = null;
    private abortController = new AbortController();

    constructor(
        plugin: SRPlugin,
        title: string,
        cards: Card[],
        deck: Deck,
        containerEl: HTMLElement,
        groupKey: string,
        expandedGroups: Set<string>,
        onToggleGroup: (groupKey: string) => void,
    ) {
        this.plugin = plugin;
        this.title = title;
        this.cards = cards || [];
        this.deck = deck;
        this.containerEl = containerEl;
        this.groupKey = groupKey;
        this.expandedGroups = expandedGroups;
        this.onToggleGroup = onToggleGroup;
    }

    public render(): HTMLElement | null {
        if (!this.cards || this.cards.length === 0) {
            this.removeElement();
            return null;
        }

        if (!this.groupEl) {
            this.groupEl = this.containerEl.createDiv("sr-card-group");

            const isExpanded = this.expandedGroups.has(this.groupKey);
            this.groupHeader = this.groupEl.createDiv("sr-card-group-header");
            this.groupHeader.setText(`${this.title} (${this.cards.length})`);

            if (isExpanded) {
                this.groupHeader.addClass("sr-group-expanded");
            }

            this.cardsList = this.groupEl.createDiv("sr-cards-list");
            if (!isExpanded) {
                this.cardsList.style.display = "none";
            }

            const headerClickHandler = () => {
                this.onToggleGroup(this.groupKey);
            };

            this.groupHeader.addEventListener("click", headerClickHandler, {
                signal: this.abortController.signal,
            });

            this.renderCards(this.cardsList);
        }

        return this.groupEl;
    }

    private removeElement(): void {
        if (this.groupEl) {
            this.groupEl.remove();
            this.groupEl = null;
            this.groupHeader = null;
            this.cardsList = null;
        }
    }

    public update(cards: Card[]): void {
        this.cards = cards;

        // If group becomes empty, remove it
        if (!this.cards || this.cards.length === 0) {
            this.removeElement();
            return;
        }

        if (!this.groupEl || !this.groupHeader || !this.cardsList) return;

        // Update header
        this.groupHeader.setText(`${this.title} (${this.cards.length})`);
        if (this.expandedGroups.has(this.groupKey)) {
            this.groupHeader.addClass("sr-group-expanded");
        } else {
            this.groupHeader.removeClass("sr-group-expanded");
        }

        // Update cards list visibility and content
        if (this.expandedGroups.has(this.groupKey)) {
            this.cardsList.style.display = "block";
        } else {
            this.cardsList.style.display = "none";
        }

        this.cardsList.empty();
        this.renderCards(this.cardsList);
    }

    private renderCards(container: HTMLElement): void {
        // Render all cards
        for (const card of this.cards) {
            if (card) {
                this.renderCard(container, card);
            }
        }
    }

    private renderCard(container: HTMLElement, card: Card): HTMLElement {
        const cardEl = container.createDiv("sr-card-item");

        // Card icon
        const cardIcon = cardEl.createDiv("sr-card-icon");
        cardIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`;

        // Card content
        const cardContent = cardEl.createDiv("sr-card-content-wrapper");
        const cardFront = cardContent.createDiv("sr-card-front");
        const frontText = this.extractPlainText(card.front);
        cardFront.setText(frontText);

        // Card status indicator
        if (card.isDue) {
            const statusIndicator = cardEl.createDiv("sr-card-status sr-card-due");
            statusIndicator.setAttribute("aria-label", "Due");
        } else if (card.scheduleInfo) {
            const statusIndicator = cardEl.createDiv("sr-card-status sr-card-scheduled");
            statusIndicator.setAttribute("aria-label", "Scheduled");
        }

        const clickHandler: EventListener = async (event: Event) => {
            event.preventDefault();
            await this.openCardReview(card);
        };

        cardEl.addEventListener("click", clickHandler, {
            signal: this.abortController.signal,
        });

        return cardEl;
    }

    private extractPlainText(html: string): string {
        // Remove HTML tags using regex
        const text = html.replace(/<[^>]*>/g, "").trim();

        // Truncate if too long
        const maxLength = 100;
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    }

    private async openCardReview(card: Card): Promise<void> {
        await this.plugin.sync();

        const tempDeck = this.createSingleCardDeck(card);
        const rootDeck = new Deck(this.deck.deckName, null);
        rootDeck.subdecks.push(tempDeck);

        if (this.plugin.data.settings.openViewInNewTab) {
            await this.plugin.tabViewManager.openSRTabView(FlashcardReviewMode.Review);
        } else {
            // Use the plugin's method to open flashcard modal
            (this.plugin as any).openFlashcardModal(
                rootDeck,
                rootDeck,
                FlashcardReviewMode.Review,
            );
        }
    }

    private createSingleCardDeck(card: Card): Deck {
        const tempDeck = new Deck(this.deck.deckName, null);
        
        // Add card to appropriate list based on status
        if (card.isDue || card.scheduleInfo) {
            tempDeck.dueFlashcards.push(card);
        } else {
            tempDeck.newFlashcards.push(card);
        }

        return tempDeck;
    }

    public destroy(): void {
        this.abortController.abort();

        if (this.groupEl) {
            this.groupEl.remove();
            this.groupEl = null;
            this.groupHeader = null;
            this.cardsList = null;
        }
    }
}
