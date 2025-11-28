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
    private abortController = new AbortController();
    private cardsAbortController = new AbortController();

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
            const groupHeader = this.groupEl.createDiv("sr-card-group-header");
            groupHeader.setText(`${this.title} (${this.cards.length})`);

            if (isExpanded) {
                groupHeader.addClass("sr-group-expanded");
            }

            const cardsList = this.groupEl.createDiv("sr-cards-list");
            if (!isExpanded) {
                cardsList.style.display = "none";
            }

            const headerClickHandler = () => {
                this.onToggleGroup(this.groupKey);
            };

            groupHeader.addEventListener("click", headerClickHandler, {
                signal: this.abortController.signal,
            });

            this.renderCards(cardsList);
        }

        return this.groupEl;
    }

    private removeElement(): void {
        if (this.groupEl) {
            this.groupEl.remove();
            this.groupEl = null;
        }
    }

    public update(cards: Card[]): void {
        this.cards = cards;

        if (!this.groupEl) return;

        // Update header
        const header = this.groupEl.querySelector(".sr-card-group-header");
        if (header) {
            header.setText(`${this.title} (${this.cards.length})`);
            if (this.expandedGroups.has(this.groupKey)) {
                header.addClass("sr-group-expanded");
            } else {
                header.removeClass("sr-group-expanded");
            }
        }

        const cardsList = this.groupEl.querySelector(".sr-cards-list") as HTMLElement;
        if (cardsList) {
            if (this.expandedGroups.has(this.groupKey)) {
                cardsList.style.display = "block";
            } else {
                cardsList.style.display = "none";
            }

            cardsList.empty();

            // Abort previous card listeners
            this.cardsAbortController.abort();
            this.cardsAbortController = new AbortController();

            this.renderCards(cardsList);
        }
    }

    private renderCards(container: HTMLElement): void {
        // Limit to first 10 cards for performance
        const cardsToRender = this.cards.slice(0, 10);

        for (const card of cardsToRender) {
            if (card) {
                this.renderCard(container, card);
            }
        }

        // Show indicator if there are more cards
        if (this.cards.length > 10) {
            const moreIndicator = container.createDiv("sr-card-item sr-card-more");
            moreIndicator.setText(`... and ${this.cards.length - 10} more`);
        }
    }

    private renderCard(container: HTMLElement, card: Card): HTMLElement {
        const cardEl = container.createDiv("sr-card-item");

        const cardFront = cardEl.createDiv("sr-card-front");
        // Extract plain text from card front (remove HTML tags if present)
        const frontText = this.extractPlainText(card.front);
        cardFront.setText(frontText);

        const clickHandler: EventListener = async (event: Event) => {
            event.preventDefault();
            await this.openCardReview(card);
        };

        cardEl.addEventListener("click", clickHandler, {
            signal: this.cardsAbortController.signal,
        });

        return cardEl;
    }

    private extractPlainText(html: string): string {
        // Simple HTML tag removal - create a temporary element to parse HTML
        const temp = document.createElement("div");
        temp.innerHTML = html;
        const text = temp.textContent || temp.innerText || "";

        // Truncate if too long
        const maxLength = 100;
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + "...";
        }
        return text;
    }

    private async openCardReview(card: Card): Promise<void> {
        // Create a root deck containing just this deck
        const rootDeck = new Deck("Root", null);
        rootDeck.subdecks.push(this.deck);

        // Sync before opening modal
        await this.plugin.sync();

        // Open the flashcard modal with this specific deck
        if (this.plugin.data.settings.openViewInNewTab) {
            this.plugin.tabViewManager.openSRTabView(FlashcardReviewMode.Review);
        } else {
            // Access the private method through type assertion
            // This is the same pattern used in FlashcardDeckComponent
            (this.plugin as any).openFlashcardModal(rootDeck, rootDeck, FlashcardReviewMode.Review);
        }
    }

    public destroy(): void {
        this.abortController.abort();
        this.cardsAbortController.abort();

        if (this.groupEl) {
            this.groupEl.remove();
            this.groupEl = null;
        }
    }
}
