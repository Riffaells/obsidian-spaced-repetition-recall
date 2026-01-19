import { describe, it, expect, beforeEach, mock } from "bun:test";
import { RandomReviewService } from "../../../src/gui/sidebar/services/RandomReviewService";
import { FlashcardReviewMode } from "../../../src/core/scheduling/FlashcardReviewMode";

// Mock dependencies
const mockSync = mock(() => Promise.resolve());
const mockOpenSRTabView = mock(() => Promise.resolve());
const mockOpenFlashcardModal = mock(() => {});

class MockPlugin {
    data = {
        settings: {
            openViewInNewTab: false,
            dataLocation: "SaveOnNoteFile",
        },
    };
    deckTree = {
        toDeckArray: () => [],
    };
    remainingDeckTree = {};
    reviewDecks = {};
    sync = mockSync;
    tabViewManager = {
        openSRTabView: mockOpenSRTabView,
    };
    openFlashcardModal = mockOpenFlashcardModal;
    app = {
        workspace: {
            getLeaf: () => ({
                openFile: mock(() => Promise.resolve()),
            }),
        },
    };
    lastSelectedReviewDeck = null;
    reviewFloatBar = {
        display: mock(() => {}),
    };
}

describe("RandomReviewService", () => {
    let service: RandomReviewService;
    let plugin: MockPlugin;

    beforeEach(() => {
        plugin = new MockPlugin();
        service = new RandomReviewService(plugin as any);
        mockSync.mockClear();
        mockOpenSRTabView.mockClear();
        mockOpenFlashcardModal.mockClear();
    });

    describe("openRandomDueCard", () => {
        it("should NOT call sync() when openViewInNewTab is false (Modal mode)", async () => {
            // Setup
            plugin.data.settings.openViewInNewTab = false;
            plugin.deckTree = {
                toDeckArray: () => [
                    {
                        dueFlashcards: [{ isDue: true }],
                        isRootDeck: false,
                    },
                ],
            } as any;
            plugin.remainingDeckTree = {} as any;

            // Execute
            await service.openRandomDueCard();

            // Verify
            expect(mockSync).not.toHaveBeenCalled();
            expect(mockOpenFlashcardModal).toHaveBeenCalled();
            expect(mockOpenFlashcardModal).toHaveBeenCalledWith(
                plugin.deckTree,
                plugin.remainingDeckTree,
                FlashcardReviewMode.Review,
                expect.anything(),
            );
        });

        it("should call sync() when openViewInNewTab is true", async () => {
            // Setup
            plugin.data.settings.openViewInNewTab = true;
            plugin.deckTree = {
                toDeckArray: () => [
                    {
                        dueFlashcards: [{ isDue: true }],
                        isRootDeck: false,
                    },
                ],
            } as any;

            // Execute
            await service.openRandomDueCard();

            // Verify
            expect(mockSync).toHaveBeenCalled();
            expect(mockOpenSRTabView).toHaveBeenCalledWith(FlashcardReviewMode.Review);
            expect(mockOpenFlashcardModal).not.toHaveBeenCalled();
        });

        it("should do nothing if no due cards", async () => {
            // Setup
            plugin.data.settings.openViewInNewTab = false;
            plugin.deckTree = {
                toDeckArray: () => [
                    {
                        dueFlashcards: [], // Empty
                        isRootDeck: false,
                    },
                ],
            } as any;

            // Execute
            await service.openRandomDueCard();

            // Verify
            expect(mockSync).not.toHaveBeenCalled();
            expect(mockOpenFlashcardModal).not.toHaveBeenCalled();
        });
    });

    describe("openRandomNewCard", () => {
        it("should NOT call sync() when openViewInNewTab is false (Modal mode)", async () => {
            // Setup
            plugin.data.settings.openViewInNewTab = false;
            plugin.deckTree = {
                toDeckArray: () => [
                    {
                        newFlashcards: [{ isNew: true }],
                        isRootDeck: false,
                    },
                ],
            } as any;
            plugin.remainingDeckTree = {} as any;

            // Execute
            await service.openRandomNewCard();

            // Verify
            expect(mockSync).not.toHaveBeenCalled();
            expect(mockOpenFlashcardModal).toHaveBeenCalled();
            expect(mockOpenFlashcardModal).toHaveBeenCalledWith(
                plugin.deckTree,
                plugin.remainingDeckTree,
                FlashcardReviewMode.Review, // RandomReviewService uses Review mode even for new cards if not specified otherwise in implementation (checked source: yes, uses Review mode and boolean isNew argument passed to internal method, but modal is opened with Review mode)
                expect.anything(),
            );
        });

        it("should call sync() when openViewInNewTab is true", async () => {
            // Setup
            plugin.data.settings.openViewInNewTab = true;
            plugin.deckTree = {
                toDeckArray: () => [
                    {
                        newFlashcards: [{ isNew: true }],
                        isRootDeck: false,
                    },
                ],
            } as any;

            // Execute
            await service.openRandomNewCard();

            // Verify
            expect(mockSync).toHaveBeenCalled();
            expect(mockOpenSRTabView).toHaveBeenCalledWith(FlashcardReviewMode.Review);
        });
    });
});
