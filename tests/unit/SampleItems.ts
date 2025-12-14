import { Deck } from "src/core/models/Deck";
import { Note } from "src/core/models/Note";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings/settings";
import { TopicPath } from "src/core/services/TopicPath";
import { TextDirection } from "src/utils/TextDirection";
import { UnitTestSRFile } from "./helpers/UnitTestSRFile";
import { CardOrder, DeckOrder, DeckTreeIterator } from "src/core/scheduling/DeckTreeIterator";
import { NoteFileLoader } from "src/core/services/NoteFileLoader";
export const test_RefDate_20230906: Date = new Date(2023, 8, 6);

export class SampleItemDecks {
    static async createSingleLevelTree_NewCards(): Promise<Deck> {
        const text: string = `
Q1::A1
Q2::A2
Q3::A3`;
        return await SampleItemDecks.createDeckFromText(text, new TopicPath(["flashcards"]));
    }

    static createScienceTree(): Deck {
        const deck: Deck = new Deck("Root", null);
        deck.getOrCreateDeck(new TopicPath(["Science", "Physics", "Electromagnetism"]));
        deck.getOrCreateDeck(new TopicPath(["Science", "Physics", "Light"]));
        deck.getOrCreateDeck(new TopicPath(["Science", "Physics", "Fluids"]));
        deck.getOrCreateDeck(new TopicPath(["Math", "Geometry"]));
        deck.getOrCreateDeck(new TopicPath(["Math", "Algebra", "Polynomials"]));
        return deck;
    }

    static async createDeckFromText(
        text: string,
        folderTopicPath: TopicPath = TopicPath.emptyPath,
    ): Promise<Deck> {
        const file: UnitTestSRFile = new UnitTestSRFile(text);
        return await this.createDeckFromFile(file, folderTopicPath);
    }

    static async createDeckAndIteratorFromText(
        text: string,
        folderTopicPath: TopicPath,
        cardOrder: CardOrder,
        deckOrder: DeckOrder,
    ): Promise<[Deck, DeckTreeIterator]> {
        const deck: Deck = await SampleItemDecks.createDeckFromText(text, folderTopicPath);
        const iterator: DeckTreeIterator = new DeckTreeIterator(
            {
                cardOrder,
                deckOrder,
            },
            deck,
        );
        return [deck, iterator];
    }

    static async createDeckFromFile(
        file: UnitTestSRFile,
        folderTopicPath: TopicPath = TopicPath.emptyPath,
    ): Promise<Deck> {
        const deck: Deck = new Deck("Root", null);
        const noteFileLoader: NoteFileLoader = new NoteFileLoader(DEFAULT_SETTINGS);
        const note: Note = await noteFileLoader.load(file, TextDirection.Ltr, folderTopicPath);
        if (note) {
            note.appendCardsToDeck(deck);
        }
        return deck;
    }
}
