import { Deck } from "../../../core/models/Deck";
import { CardListType } from "../../../core/models/CardListType";
import { Card } from "../../../core/models/Card";
import { TopicPath } from "../../../core/services/TopicPath";
import { CardMixingStrategy } from "../types";
import { globalRandomNumberProvider } from "../../../utils/RandomNumberProvider";

/**
 * Manages multi-deck selection and card combination
 * Requirements: 7.1, 7.3
 */
export class MultiDeckManager {
    /**
     * Combines cards from multiple decks into a single deck
     * Requirements: 7.1
     *
     * @param baseDeck The root deck containing all decks
     * @param deckPaths Array of deck paths to combine
     * @param strategy Card mixing strategy to use
     * @returns A new deck containing combined cards
     */
    static combineDecks(
        baseDeck: Deck,
        deckPaths: TopicPath[],
        strategy: CardMixingStrategy = CardMixingStrategy.Sequential,
    ): Deck {
        if (!deckPaths || deckPaths.length === 0) {
            throw new Error("At least one deck path must be provided");
        }

        // Create a new root deck to hold combined cards
        const combinedDeck = new Deck("Combined", null);

        // Collect all cards from selected decks
        const allNewCards: Card[] = [];
        const allDueCards: Card[] = [];

        for (const deckPath of deckPaths) {
            const deck = baseDeck.getDeck(deckPath);
            if (!deck) {
                console.warn(`Deck not found: ${deckPath.path}`);
                continue;
            }

            // Get all cards from this deck and its subdecks
            const newCards = deck.getFlattenedCardArray(CardListType.NewCard, true);
            const dueCards = deck.getFlattenedCardArray(CardListType.DueCard, true);

            allNewCards.push(...newCards);
            allDueCards.push(...dueCards);
        }

        // Remove duplicates (same card object in multiple decks)
        const uniqueNewCards = Array.from(new Set(allNewCards));
        const uniqueDueCards = Array.from(new Set(allDueCards));

        // Apply mixing strategy
        const mixedNewCards = this.applyMixingStrategy(uniqueNewCards, strategy);
        const mixedDueCards = this.applyMixingStrategy(uniqueDueCards, strategy);

        // Add cards to combined deck
        combinedDeck.newFlashcards = mixedNewCards;
        combinedDeck.dueFlashcards = mixedDueCards;

        return combinedDeck;
    }

    /**
     * Applies the specified card mixing strategy
     * Requirements: 7.3
     *
     * @param cards Array of cards to mix
     * @param strategy Mixing strategy to apply
     * @returns Mixed array of cards
     */
    private static applyMixingStrategy(cards: Card[], strategy: CardMixingStrategy): Card[] {
        switch (strategy) {
            case CardMixingStrategy.Sequential:
                // Keep cards in their original order (by deck, then by line number)
                return [...cards];

            case CardMixingStrategy.Random:
                // Shuffle cards randomly
                return this.shuffleArray([...cards]);

            case CardMixingStrategy.Interleaved:
                // Interleave cards from different decks
                return this.interleaveCards(cards);

            default:
                return [...cards];
        }
    }

    /**
     * Shuffles an array using Fisher-Yates algorithm
     * Requirements: 7.3
     */
    private static shuffleArray<T>(array: T[]): T[] {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = globalRandomNumberProvider.getInteger(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Interleaves cards from different decks
     * Requirements: 7.3
     *
     * Groups cards by their deck, then takes one card from each deck in rotation
     */
    private static interleaveCards(cards: Card[]): Card[] {
        if (cards.length === 0) return [];

        // Group cards by their deck path
        const cardsByDeck = new Map<string, Card[]>();

        for (const card of cards) {
            const topicPath = card.question.topicPathList.list[0];
            const deckPath = topicPath ? topicPath.path.join("/") : "default";
            if (!cardsByDeck.has(deckPath)) {
                cardsByDeck.set(deckPath, []);
            }
            cardsByDeck.get(deckPath)!.push(card);
        }

        // Interleave cards from different decks
        const result: Card[] = [];
        const deckArrays = Array.from(cardsByDeck.values());
        const maxLength = Math.max(...deckArrays.map((arr) => arr.length));

        for (let i = 0; i < maxLength; i++) {
            for (const deckCards of deckArrays) {
                if (i < deckCards.length) {
                    result.push(deckCards[i]);
                }
            }
        }

        return result;
    }

    /**
     * Gets statistics for multiple decks
     * Requirements: 7.2, 7.5
     *
     * @param baseDeck The root deck
     * @param deckPaths Array of deck paths
     * @returns Map of deck path to statistics
     */
    static getMultiDeckStats(
        baseDeck: Deck,
        deckPaths: TopicPath[],
    ): Map<string, { dueCount: number; newCount: number; totalCount: number }> {
        const stats = new Map<string, { dueCount: number; newCount: number; totalCount: number }>();

        for (const deckPath of deckPaths) {
            const deck = baseDeck.getDeck(deckPath);
            if (!deck) continue;

            const dueCount = deck.getDistinctCardCount(CardListType.DueCard, true);
            const newCount = deck.getDistinctCardCount(CardListType.NewCard, true);
            const totalCount = deck.getDistinctCardCount(CardListType.All, true);

            stats.set(deckPath.path.join("/"), { dueCount, newCount, totalCount });
        }

        return stats;
    }

    /**
     * Determines which deck a card belongs to from a list of selected decks
     * Requirements: 7.2
     *
     * @param card The card to check
     * @param deckPaths Array of selected deck paths
     * @returns The deck path the card belongs to, or null if not found
     */
    static getCardDeckPath(card: Card, deckPaths: TopicPath[]): TopicPath | null {
        const cardTopicPaths = card.question.topicPathList.list;

        // Find the first matching deck path
        for (const deckPath of deckPaths) {
            for (const cardTopicPath of cardTopicPaths) {
                if (this.isPathMatch(cardTopicPath, deckPath)) {
                    return deckPath;
                }
            }
        }

        return null;
    }

    /**
     * Checks if a card's topic path matches or is a child of a deck path
     */
    private static isPathMatch(cardPath: TopicPath, deckPath: TopicPath): boolean {
        const cardPathStr = cardPath.path.join("/");
        const deckPathStr = deckPath.path.join("/");

        // Exact match or card is in a subdeck
        return cardPathStr === deckPathStr || cardPathStr.startsWith(deckPathStr + "/");
    }
}
