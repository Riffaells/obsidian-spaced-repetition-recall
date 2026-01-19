import type { TFile } from "obsidian";
import type SRPlugin from "src/main";
import { DeckComponent } from "../DeckComponent";
import { FlashcardDeckComponent } from "../FlashcardDeckComponent";
import { ReviewDeck } from "src/core/models/ReviewDeck";
import { Deck } from "src/core/models/Deck";
import { CardSortType, FilterType, NoteSortType } from "../types";
import { t } from "src/lang/helpers";

/**
 * Handles reconciliation (create/update/destroy) of deck components
 */
export class DeckReconciler {
    private readonly plugin: SRPlugin;
    private readonly decksContainer: HTMLElement;
    private readonly expandedDecks: Set<string>;
    private readonly expandedGroups: Set<string>;
    private readonly deckComponents: Map<string, DeckComponent>;
    private readonly flashcardDeckComponents: Map<string, FlashcardDeckComponent>;
    private cardSort: CardSortType = CardSortType.DEFAULT;

    constructor(
        plugin: SRPlugin,
        decksContainer: HTMLElement,
        expandedDecks: Set<string>,
        expandedGroups: Set<string>,
        deckComponents: Map<string, DeckComponent>,
        flashcardDeckComponents: Map<string, FlashcardDeckComponent>,
        cardSort: CardSortType = CardSortType.DEFAULT,
    ) {
        this.plugin = plugin;
        this.decksContainer = decksContainer;
        this.expandedDecks = expandedDecks;
        this.expandedGroups = expandedGroups;
        this.deckComponents = deckComponents;
        this.flashcardDeckComponents = flashcardDeckComponents;
        this.cardSort = cardSort;
    }

    public reconcileNoteDecks(
        activeFile: TFile | null,
        sortedDecks: ReviewDeck[],
        currentFilter: FilterType,
        currentNoteSort: NoteSortType,
        shouldAutoExpand: boolean,
        onToggleDeck: (deckName: string) => void,
        onToggleGroup: (groupKey: string) => void,
    ): void {
        this.removeEmptyMessage();
        this.cleanupStaleComponents(this.deckComponents, sortedDecks);

        for (const deck of sortedDecks) {
            const component = this.deckComponents.get(deck.deckName);

            if (component) {
                component.update(
                    activeFile,
                    currentFilter,
                    shouldAutoExpand,
                    currentNoteSort,
                    deck,
                );
            } else {
                this.createNoteComponent(
                    deck,
                    activeFile,
                    currentFilter,
                    currentNoteSort,
                    shouldAutoExpand,
                    onToggleDeck,
                    onToggleGroup,
                );
            }
        }

        this.cleanupFlashcardComponents();
    }

    public reconcileFlashcardDecks(
        activeFile: TFile | null,
        sortedFlashcardDecks: Deck[],
        currentFilter: FilterType,
        onToggleDeck: (deckName: string) => void,
        onToggleGroup: (groupKey: string) => void,
    ): string | null {
        if (sortedFlashcardDecks.length === 0) {
            this.handleEmptyFlashcardDecks();
            return null;
        }

        this.removeEmptyMessage();

        const activeDeckName = this.findDeckContainingFile(activeFile, sortedFlashcardDecks);
        this.autoExpandActiveDeck(activeDeckName);

        this.cleanupStaleComponents(this.flashcardDeckComponents, sortedFlashcardDecks);

        for (const deck of sortedFlashcardDecks) {
            const component = this.flashcardDeckComponents.get(deck.deckName);

            if (component) {
                component.update(currentFilter, deck);
            } else {
                this.createFlashcardComponent(deck, currentFilter, onToggleDeck, onToggleGroup);
            }

            this.markActiveDeck(deck.deckName, activeDeckName);
        }

        this.cleanupNoteComponents();
        return activeDeckName;
    }

    private handleEmptyFlashcardDecks(): void {
        this.cleanupFlashcardComponents();
        this.cleanupNoteComponents();
        this.showEmptyMessage();
    }

    private autoExpandActiveDeck(deckName: string | null): void {
        if (deckName && !this.expandedDecks.has(deckName)) {
            this.expandedDecks.add(deckName);
        }
    }

    private cleanupStaleComponents<T extends { destroy(): void }>(
        components: Map<string, T>,
        currentDecks: Array<{ deckName: string }>,
    ): void {
        const currentDeckNames = new Set(currentDecks.map((d) => d.deckName));
        for (const [name, component] of components) {
            if (!currentDeckNames.has(name)) {
                component.destroy();
                components.delete(name);
            }
        }
    }

    private createNoteComponent(
        deck: ReviewDeck,
        activeFile: TFile | null,
        currentFilter: FilterType,
        currentNoteSort: NoteSortType,
        shouldAutoExpand: boolean,
        onToggleDeck: (deckName: string) => void,
        onToggleGroup: (groupKey: string) => void,
    ): void {
        const component = new DeckComponent(
            this.plugin,
            deck,
            this.decksContainer,
            activeFile,
            currentFilter,
            this.expandedDecks,
            this.expandedGroups,
            shouldAutoExpand,
            onToggleDeck,
            onToggleGroup,
            currentNoteSort,
        );

        this.deckComponents.set(deck.deckName, component);
        const el = component.render();
        if (el) {
            this.decksContainer.appendChild(el);
        }
    }

    private createFlashcardComponent(
        deck: Deck,
        currentFilter: FilterType,
        onToggleDeck: (deckName: string) => void,
        onToggleGroup: (groupKey: string) => void,
    ): void {
        const component = new FlashcardDeckComponent(
            this.plugin,
            deck,
            this.decksContainer,
            currentFilter,
            this.expandedDecks,
            this.expandedGroups,
            onToggleDeck,
            onToggleGroup,
            this.cardSort,
        );

        this.flashcardDeckComponents.set(deck.deckName, component);
        const el = component.render();
        if (el) {
            this.decksContainer.appendChild(el);
        }
    }

    private markActiveDeck(deckName: string, activeDeckName: string | null): void {
        const el = this.flashcardDeckComponents.get(deckName)?.render();
        if (!el) return;

        if (deckName === activeDeckName) {
            el.addClass("sr-deck-active");
        } else {
            el.removeClass("sr-deck-active");
        }
    }

    private findDeckContainingFile(activeFile: TFile | null, decks: Deck[]): string | null {
        if (!activeFile) return null;

        const activePath = activeFile.path;

        for (const deck of decks) {
            if (
                deck.newFlashcards.some((card) => card.question?.note?.filePath === activePath) ||
                deck.dueFlashcards.some((card) => card.question?.note?.filePath === activePath)
            ) {
                return deck.deckName;
            }
        }

        return null;
    }

    public cleanupNoteComponents(): void {
        for (const component of this.deckComponents.values()) {
            component.destroy();
        }
        this.deckComponents.clear();
    }

    public cleanupFlashcardComponents(): void {
        for (const component of this.flashcardDeckComponents.values()) {
            component.destroy();
        }
        this.flashcardDeckComponents.clear();
    }

    private removeEmptyMessage(): void {
        this.decksContainer?.querySelector(".sr-empty-message")?.remove();
    }

    private showEmptyMessage(): void {
        this.decksContainer.empty();
        const emptyMessage = this.decksContainer.createDiv("sr-empty-message");
        emptyMessage.setText(t("NO_FLASHCARD_DECKS_FOUND"));
    }

    public setCardSort(sort: CardSortType): void {
        this.cardSort = sort;

        // Update all flashcard deck components with new sort
        for (const component of this.flashcardDeckComponents.values()) {
            component.setCardSort(sort);
        }
    }
}
