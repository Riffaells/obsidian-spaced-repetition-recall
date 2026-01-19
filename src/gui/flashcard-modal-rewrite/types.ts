import { Deck } from "src/core/models/Deck";
import { Card } from "src/core/models/Card";
import { TopicPath } from "src/core/services/TopicPath";
import { FlashcardReviewMode } from "src/core/scheduling/FlashcardReviewMode";

export enum ModalState {
    CLOSED = "CLOSED",
    DECK_SELECTION = "DECK_SELECTION",
    CARD_FRONT = "CARD_FRONT",
    CARD_BACK = "CARD_BACK",
    SESSION_COMPLETE = "SESSION_COMPLETE",
    ERROR = "ERROR",
}

import { ReviewResponse } from "src/core/scheduling/scheduling";
export { ReviewResponse };

export interface ModalOpenOptions {
    deckPath?: TopicPath;
    deckPaths?: TopicPath[]; // For multi-deck selection
    cardId?: string;
    mode?: FlashcardReviewMode;
    autoStart?: boolean;
    cardMixingStrategy?: CardMixingStrategy; // For multi-deck card mixing
}

export enum CardMixingStrategy {
    Sequential = "sequential",
    Random = "random",
    Interleaved = "interleaved",
}

export interface SessionStats {
    cardsReviewed: number;
    timeSpent: number;
    responses: Record<ReviewResponse, number>;
    deckName: string;
    deckPath: TopicPath;
    remainingCards: number;
    // Multi-deck statistics (Requirements 7.2, 7.5)
    perDeckStats?: Map<string, PerDeckStats>;
}

export interface PerDeckStats {
    deckPath: TopicPath;
    deckName: string;
    cardsReviewed: number;
    dueCount: number;
    newCount: number;
    totalCount: number;
    responses: Record<ReviewResponse, number>;
}

export interface IModalController {
    getCurrentState(): ModalState;
    transitionTo(state: ModalState, context?: any): void;
    open(options?: ModalOpenOptions): void;
    close(): void;
    startReview(deckPath: TopicPath): void;
    showAnswer(): void;
    submitReview(response: ReviewResponse): Promise<void>;
    skipCard(): void;
    returnToDeckList(): void;
    openSourceNote(): void;
    editCard(): Promise<void>;
    navigateToDeck(direction: "prev" | "next"): void;
    navigateToBreadcrumb(deckPath: TopicPath): void;
    retry(): void; // Error recovery
    toggleFullscreen(): void;
    isFullscreen(): boolean;
    // Multi-deck support (Requirements 7.2)
    isMultiDeck(): boolean;
    getCurrentCardDeckPath(): TopicPath | null;
    getCurrentCardDeckName(): string | null;
    getSelectedDeckPaths(): TopicPath[];
}

export interface DeckStats {
    dueCount: number;
    newCount: number;
    totalCount: number;
}

export interface IMarkdownRenderer {
    render(content: string, container: HTMLElement, direction: string): Promise<void>;
    setNotePath?(path: string): void;
}

export interface ObsidianEditorWithCm {
    cm?: {
        state: {
            doc: {
                line: (n: number) => { from: number; to: number };
            };
            field: (field: any, defaultVal: any) => any;
        };
        dispatch: (transaction: any) => void;
        foldState?: any;
        unfoldEffect?: { of: (spec: any) => any };
    };
}
