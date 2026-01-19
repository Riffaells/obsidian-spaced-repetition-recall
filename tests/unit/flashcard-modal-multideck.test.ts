import { describe, test, expect, beforeEach } from "bun:test";
import { MultiDeckManager } from "../../src/gui/flashcard-modal-rewrite/services/MultiDeckManager";
import { CardMixingStrategy } from "../../src/gui/flashcard-modal-rewrite/types";
import { Deck } from "../../src/core/models/Deck";
import { CardListType } from "../../src/core/models/CardListType";
import { TopicPath } from "../../src/core/services/TopicPath";
import { SampleItemDecks } from "./SampleItems";
import { Card } from "../../src/core/models/Card";

describe("MultiDeckManager", () => {
    let baseDeck: Deck;

    beforeEach(() => {
        baseDeck = new Deck("Root", null);
    });

    test("combineDecks throws error for empty deck paths", () => {
        expect(() => {
            MultiDeckManager.combineDecks(baseDeck, [], CardMixingStrategy.Sequential);
        }).toThrow("At least one deck path must be provided");
    });

    test("combineDecks handles non-existent decks gracefully", () => {
        const deckPaths = [TopicPath.getTopicPathFromTag("#flashcards/nonexistent")];

        const combinedDeck = MultiDeckManager.combineDecks(
            baseDeck,
            deckPaths,
            CardMixingStrategy.Sequential,
        );

        // Should return empty deck
        expect(combinedDeck.newFlashcards.length).toBe(0);
        expect(combinedDeck.dueFlashcards.length).toBe(0);
    });

    test("getMultiDeckStats returns empty map for non-existent decks", () => {
        const deckPaths = [TopicPath.getTopicPathFromTag("#flashcards/nonexistent")];

        const stats = MultiDeckManager.getMultiDeckStats(baseDeck, deckPaths);

        // Should return empty stats
        expect(stats.size).toBe(0);
    });

    test("combineDecks creates a combined deck with correct name", () => {
        // Create a deck with some structure
        baseDeck.getOrCreateDeck(TopicPath.getTopicPathFromTag("#flashcards/deck1"));

        const deckPaths = [TopicPath.getTopicPathFromTag("#flashcards/deck1")];

        const combinedDeck = MultiDeckManager.combineDecks(
            baseDeck,
            deckPaths,
            CardMixingStrategy.Sequential,
        );

        // Verify combined deck structure
        expect(combinedDeck.deckName).toBe("Combined");
        expect(combinedDeck.parent).toBeNull();
    });

    test("getMultiDeckStats returns correct structure", () => {
        // Create decks
        baseDeck.getOrCreateDeck(TopicPath.getTopicPathFromTag("#flashcards/deck1"));
        baseDeck.getOrCreateDeck(TopicPath.getTopicPathFromTag("#flashcards/deck2"));

        const deckPaths = [
            TopicPath.getTopicPathFromTag("#flashcards/deck1"),
            TopicPath.getTopicPathFromTag("#flashcards/deck2"),
        ];

        const stats = MultiDeckManager.getMultiDeckStats(baseDeck, deckPaths);

        // Verify stats structure
        expect(stats.size).toBe(2);
        expect(stats.has("flashcards/deck1")).toBe(true);
        expect(stats.has("flashcards/deck2")).toBe(true);

        const deck1Stats = stats.get("flashcards/deck1");
        expect(deck1Stats).toBeDefined();
        if (deck1Stats) {
            expect(deck1Stats).toHaveProperty("dueCount");
            expect(deck1Stats).toHaveProperty("newCount");
            expect(deck1Stats).toHaveProperty("totalCount");
        }
    });

    // Property 10: Multi-Deck Card Combination
    test("combineDecks combines cards from multiple decks", () => {
        // Setup scenarios: Deck1 has [A, B], Deck2 has [C, D]
        const deck1 = new Deck("deck1", null);
        const cardA = createMockCard("A", "deck1");
        const cardB = createMockCard("B", "deck1");
        deck1.newFlashcards = [cardA, cardB];

        const deck2 = new Deck("deck2", null);
        const cardC = createMockCard("C", "deck2");
        const cardD = createMockCard("D", "deck2");
        deck2.newFlashcards = [cardC, cardD];

        const flashcardsDeck = new Deck("flashcards", null);
        flashcardsDeck.subdecks.push(deck1, deck2);
        baseDeck.subdecks.push(flashcardsDeck);

        const deckPaths = [
            new TopicPath(["flashcards", "deck1"]),
            new TopicPath(["flashcards", "deck2"]),
        ];

        const combinedDeck = MultiDeckManager.combineDecks(
            baseDeck,
            deckPaths,
            CardMixingStrategy.Sequential,
        );

        // Total 2 cards from deck1 + 2 cards from deck2 = 4 cards
        expect(combinedDeck.newFlashcards.length).toBe(4);
    });

    // Property 12: Card Mixing Strategy - Sequential
    test("combineDecks respects Sequential mixing strategy", () => {
        // Setup scenarios: Deck1 has [A, B], Deck2 has [C, D]
        const deck1 = new Deck("deck1", null);
        const cardA = createMockCard("A", "deck1");
        const cardB = createMockCard("B", "deck1");
        deck1.newFlashcards = [cardA, cardB];

        const deck2 = new Deck("deck2", null);
        const cardC = createMockCard("C", "deck2");
        const cardD = createMockCard("D", "deck2");
        deck2.newFlashcards = [cardC, cardD];

        const flashcardsDeck = new Deck("flashcards", null);
        flashcardsDeck.subdecks.push(deck1, deck2);
        baseDeck.subdecks.push(flashcardsDeck);

        const deckPaths = [
            new TopicPath(["flashcards", "deck1"]),
            new TopicPath(["flashcards", "deck2"]),
        ];

        const combinedDeck = MultiDeckManager.combineDecks(
            baseDeck,
            deckPaths,
            CardMixingStrategy.Sequential,
        );

        // Expect: A, B, C, D (order of decks in list, then order of cards)
        const cards = combinedDeck.newFlashcards;
        expect(cards).toHaveLength(4);
        expect(cards[0]).toBe(cardA);
        expect(cards[1]).toBe(cardB);
        expect(cards[2]).toBe(cardC);
        expect(cards[3]).toBe(cardD);
    });

    // Property 12: Card Mixing Strategy - Interleaved
    test("combineDecks respects Interleaved mixing strategy", () => {
        // Setup: Deck1 [A, B, C], Deck2 [X, Y]
        // Interleaved should probably be: A, X, B, Y, C

        const deck1 = new Deck("deck1", null);
        const cardA = createMockCard("A", "deck1");
        const cardB = createMockCard("B", "deck1");
        const cardC = createMockCard("C", "deck1");
        deck1.newFlashcards = [cardA, cardB, cardC];

        const deck2 = new Deck("deck2", null);
        const cardX = createMockCard("X", "deck2");
        const cardY = createMockCard("Y", "deck2");
        deck2.newFlashcards = [cardX, cardY];

        const flashcardsDeck = new Deck("flashcards", null);
        flashcardsDeck.subdecks.push(deck1, deck2);
        baseDeck.subdecks.push(flashcardsDeck);

        const deckPaths = [
            new TopicPath(["flashcards", "deck1"]),
            new TopicPath(["flashcards", "deck2"]),
        ];

        const combinedDeck = MultiDeckManager.combineDecks(
            baseDeck,
            deckPaths,
            CardMixingStrategy.Interleaved,
        );

        const cards = combinedDeck.newFlashcards;
        expect(cards).toHaveLength(5);
        expect(cards[0]).toBe(cardA);
        expect(cards[1]).toBe(cardX);
        expect(cards[2]).toBe(cardB);
        expect(cards[3]).toBe(cardY);
        expect(cards[4]).toBe(cardC);
    });

    // Property 11: Multi-Deck Context Display (Deck Identification)
    test("getCardDeckPath correctly identifies card's deck", () => {
        const path1 = new TopicPath(["flashcards", "deck1"]);
        const path2 = new TopicPath(["flashcards", "deck2"]);

        const card1 = createMockCard("1", "deck1");
        const card2 = createMockCard("2", "deck2");
        const card3 = createMockCard("3", "deck1", "sub"); // subdeck of deck1

        // Mock paths in creating MockCard helper
        (card1.question.topicPathList.list[0] as any) = path1;
        (card2.question.topicPathList.list[0] as any) = path2;
        (card3.question.topicPathList.list[0] as any) = new TopicPath([
            "flashcards",
            "deck1",
            "sub",
        ]);

        const selectedPaths = [path1, path2];

        expect(MultiDeckManager.getCardDeckPath(card1, selectedPaths)).toEqual(path1);
        expect(MultiDeckManager.getCardDeckPath(card2, selectedPaths)).toEqual(path2);
        expect(MultiDeckManager.getCardDeckPath(card3, selectedPaths)).toEqual(path1); // Matches parent deck1
    });

    // Property 13: Multi-Deck Continuation (Stats tracking)
    test("getMultiDeckStats tracks stats correctly", () => {
        const deck1 = new Deck("deck1", null);
        const cardA = createMockCard("A", "deck1");
        deck1.newFlashcards = [cardA];

        const deck2 = new Deck("deck2", null);
        const cardB = createMockCard("B", "deck2");
        const cardC = createMockCard("C", "deck2");
        deck2.newFlashcards = [cardB, cardC];

        const flashcardsDeck = new Deck("flashcards", null);
        flashcardsDeck.subdecks.push(deck1, deck2);
        baseDeck.subdecks.push(flashcardsDeck);

        const deckPaths = [
            new TopicPath(["flashcards", "deck1"]),
            new TopicPath(["flashcards", "deck2"]),
        ];

        const stats = MultiDeckManager.getMultiDeckStats(baseDeck, deckPaths);

        const s1 = stats.get("flashcards/deck1");
        const s2 = stats.get("flashcards/deck2");

        expect(s1).toBeDefined();
        expect(s2).toBeDefined();
        if (s1 && s2) {
            expect(s1.totalCount).toBe(1);
            expect(s2.totalCount).toBe(2);
        }
    });
});

function createMockCard(front: string, ...deckParts: string[]): Card {
    return new Card({
        front: front,
        back: "Back",
        question: {
            topicPathList: {
                list: [new TopicPath(["flashcards", ...deckParts])],
            },
        } as any,
    });
}
