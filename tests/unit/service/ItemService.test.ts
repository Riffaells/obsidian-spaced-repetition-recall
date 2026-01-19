import { describe, it, expect, beforeEach } from "bun:test";
import { ItemService } from "../../../src/core/services/ItemService";
import { ItemRepository } from "../../../src/core/storage/ItemRepository";
import { FileRepository } from "../../../src/core/storage/FileRepository";
import { EventBus } from "../../../src/core/infrastructure/EventBus";
import { RepetitionItem, RPITEMTYPE } from "../../../src/dataStore/repetitionItem";
import { TrackedFile } from "../../../src/dataStore/trackedFile";
import { SrsData } from "../../../src/dataStore/interfaces";
import { IStorage } from "../../../src/core/storage/IStorage";
import { Result, createOk, createErr } from "../../../src/core/infrastructure/Result";
import { StorageError } from "../../../src/core/infrastructure/errors";
import { SrsAlgorithm } from "../../../src/algorithms/algorithms";
import { setDueDates } from "../../../src/algorithms/balance/balance";

/**
 * Mock Storage for testing
 */
class MockStorage implements IStorage<SrsData> {
    private data: SrsData = {
        items: [],
        trackedFiles: [],
        queues: {} as any,
        reviewedCounts: {},
        reviewedCardCounts: {},
        mtime: 0,
    };

    async read(): Promise<Result<SrsData, StorageError>> {
        return createOk({ ...this.data });
    }

    async write(data: SrsData): Promise<Result<void, StorageError>> {
        this.data = { ...data };
        return createOk(undefined);
    }

    async exists(): Promise<boolean> {
        return true;
    }

    // Helper for tests
    setData(data: Partial<SrsData>): void {
        this.data = {
            items: data.items || [],
            trackedFiles: data.trackedFiles || [],
            queues: data.queues || ({} as any),
            reviewedCounts: data.reviewedCounts || {},
            reviewedCardCounts: data.reviewedCardCounts || {},
            mtime: data.mtime || 0,
        };
    }

    getData(): SrsData {
        return { ...this.data };
    }
}

/**
 * Mock Algorithm for testing
 */
class MockAlgorithm extends SrsAlgorithm {
    defaultSettings(): unknown {
        return {};
    }

    defaultData(): unknown {
        return { ease: 2.5, lastInterval: 0 };
    }

    onSelection(item: RepetitionItem, option: string, repeat: boolean): any {
        // Simple mock: return next review time based on response
        const intervals: Record<string, number> = {
            easy: 7 * 24 * 60 * 60 * 1000, // 7 days
            good: 3 * 24 * 60 * 60 * 1000, // 3 days
            hard: 1 * 24 * 60 * 60 * 1000, // 1 day
            again: 10 * 60 * 1000, // 10 minutes
        };

        const interval = intervals[option] || intervals.good;
        const correct = option !== "again";

        return {
            correct,
            nextReview: interval,
        };
    }

    calcAllOptsIntervals(item: RepetitionItem): number[] {
        return [10, 1440, 4320, 10080]; // minutes
    }

    srsOptions(): string[] {
        return ["again", "hard", "good", "easy"];
    }

    importer(fromAlgo: any, items: RepetitionItem[]): void {
        // Mock implementation
    }

    displaySettings(
        containerEl: HTMLElement,
        update: (settings: unknown, refresh?: boolean) => void,
    ): void {
        // Mock implementation
    }
}

describe("ItemService", () => {
    let storage: MockStorage;
    let eventBus: EventBus;
    let itemRepo: ItemRepository;
    let fileRepo: FileRepository;
    let algorithm: MockAlgorithm;
    let itemService: ItemService;

    beforeEach(async () => {
        storage = new MockStorage();
        eventBus = new EventBus();
        itemRepo = new ItemRepository(storage, eventBus);
        fileRepo = new FileRepository(storage, eventBus);
        algorithm = new MockAlgorithm();
        itemService = new ItemService(itemRepo, fileRepo, algorithm, eventBus);

        // Initialize dueDatesDict for balance function
        setDueDates({}, {});

        // Initialize repositories
        await itemRepo.load();
        await fileRepo.load();
    });

    describe("reviewItem", () => {
        it("should review an item and update its state", async () => {
            // Setup: create a tracked item
            const item = new RepetitionItem(
                1,
                0,
                RPITEMTYPE.NOTE,
                "default",
                algorithm.defaultData(),
            );
            item.nextReview = Date.now() - 1000; // Due now

            const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            storage.setData({
                items: [item],
                trackedFiles: [trackedFile],
            });
            await itemRepo.load();
            await fileRepo.load();

            // Execute: review the item
            const result = await itemService.reviewItem(1, "good");

            // Verify: result is Ok
            expect(result.isOk).toBe(true);
            if (result.isOk) {
                expect(result.value.correct).toBe(true);
            }

            // Verify: item was updated
            const updatedItem = await itemRepo.findById(1);
            expect(updatedItem).not.toBeNull();
            expect(updatedItem!.timesReviewed).toBe(1);
            expect(updatedItem!.timesCorrect).toBe(1);
        });

        it("should return error for non-existent item", async () => {
            // Execute: try to review non-existent item
            const result = await itemService.reviewItem(999, "good");

            // Verify: result is Err with ItemNotFoundError
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("ItemNotFoundError");
                expect((result.error as any).itemId).toBe(999);
            }
        });

        it("should return error for untracked item", async () => {
            // Setup: create an untracked item (fileIndex = -1)
            const item = new RepetitionItem(
                1,
                -1,
                RPITEMTYPE.NOTE,
                "default",
                algorithm.defaultData(),
            );

            storage.setData({
                items: [item],
                trackedFiles: [],
            });
            await itemRepo.load();

            // Execute: try to review untracked item
            const result = await itemService.reviewItem(1, "good");

            // Verify: result is Err with ItemNotTrackedError
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("ItemNotTrackedError");
            }
        });

        it("should emit item:reviewed event on successful review", async () => {
            // Setup: create a tracked item
            const item = new RepetitionItem(
                1,
                0,
                RPITEMTYPE.NOTE,
                "default",
                algorithm.defaultData(),
            );
            item.nextReview = Date.now() - 1000;

            const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            storage.setData({
                items: [item],
                trackedFiles: [trackedFile],
            });
            await itemRepo.load();
            await fileRepo.load();

            // Setup: event listener
            let eventEmitted = false;
            let eventData: any = null;
            eventBus.on("item:reviewed", (data) => {
                eventEmitted = true;
                eventData = data;
            });

            // Execute: review the item
            await itemService.reviewItem(1, "good");

            // Verify: event was emitted
            expect(eventEmitted).toBe(true);
            expect(eventData).not.toBeNull();
            expect(eventData.item).toBeDefined();
            expect(eventData.result).toBeDefined();
        });
    });

    describe("getNextDueItem", () => {
        it("should return the item with earliest nextReview", async () => {
            // Setup: create multiple due items
            const now = Date.now();
            const item1 = new RepetitionItem(
                1,
                0,
                RPITEMTYPE.NOTE,
                "default",
                algorithm.defaultData(),
            );
            item1.nextReview = now - 3000; // Due 3 seconds ago
            item1.timesReviewed = 1;

            const item2 = new RepetitionItem(
                2,
                0,
                RPITEMTYPE.NOTE,
                "default",
                algorithm.defaultData(),
            );
            item2.nextReview = now - 1000; // Due 1 second ago (more recent)
            item2.timesReviewed = 1;

            const item3 = new RepetitionItem(
                3,
                0,
                RPITEMTYPE.NOTE,
                "default",
                algorithm.defaultData(),
            );
            item3.nextReview = now - 5000; // Due 5 seconds ago (earliest)
            item3.timesReviewed = 1;

            const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            storage.setData({
                items: [item1, item2, item3],
                trackedFiles: [trackedFile],
            });
            await itemRepo.load();
            await fileRepo.load();

            // Execute: get next due item
            const nextItem = await itemService.getNextDueItem();

            // Verify: returns item with earliest nextReview
            expect(nextItem).not.toBeNull();
            expect(nextItem!.ID).toBe(3);
        });

        it("should filter by deck name when specified", async () => {
            // Setup: create items in different decks
            const now = Date.now();
            const item1 = new RepetitionItem(
                1,
                0,
                RPITEMTYPE.NOTE,
                "deck1",
                algorithm.defaultData(),
            );
            item1.nextReview = now - 3000;
            item1.timesReviewed = 1;

            const item2 = new RepetitionItem(
                2,
                0,
                RPITEMTYPE.NOTE,
                "deck2",
                algorithm.defaultData(),
            );
            item2.nextReview = now - 5000; // Earlier, but different deck
            item2.timesReviewed = 1;

            const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            storage.setData({
                items: [item1, item2],
                trackedFiles: [trackedFile],
            });
            await itemRepo.load();
            await fileRepo.load();

            // Execute: get next due item for deck1
            const nextItem = await itemService.getNextDueItem("deck1");

            // Verify: returns item from deck1
            expect(nextItem).not.toBeNull();
            expect(nextItem!.ID).toBe(1);
            expect(nextItem!.deckName).toBe("deck1");
        });

        it("should return null when no items are due", async () => {
            // Setup: create items that are not due
            const future = Date.now() + 100000;
            const item = new RepetitionItem(
                1,
                0,
                RPITEMTYPE.NOTE,
                "default",
                algorithm.defaultData(),
            );
            item.nextReview = future;
            item.timesReviewed = 1;

            const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            storage.setData({
                items: [item],
                trackedFiles: [trackedFile],
            });
            await itemRepo.load();
            await fileRepo.load();

            // Execute: get next due item
            const nextItem = await itemService.getNextDueItem();

            // Verify: returns null
            expect(nextItem).toBeNull();
        });
    });

    describe("getItemById", () => {
        it("should return item when it exists", async () => {
            // Setup: create an item
            const item = new RepetitionItem(
                1,
                0,
                RPITEMTYPE.NOTE,
                "default",
                algorithm.defaultData(),
            );

            storage.setData({
                items: [item],
                trackedFiles: [],
            });
            await itemRepo.load();

            // Execute: get item by ID
            const result = await itemService.getItemById(1);

            // Verify: result is Ok with the item
            expect(result.isOk).toBe(true);
            if (result.isOk) {
                expect(result.value.ID).toBe(1);
            }
        });

        it("should return error when item does not exist", async () => {
            // Execute: get non-existent item
            const result = await itemService.getItemById(999);

            // Verify: result is Err
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("ItemNotFoundError");
            }
        });
    });

    describe("getItemsByFile", () => {
        it("should return all items for a file", async () => {
            // Setup: create items for a file
            const item1 = new RepetitionItem(
                1,
                0,
                RPITEMTYPE.NOTE,
                "default",
                algorithm.defaultData(),
            );
            const item2 = new RepetitionItem(
                2,
                0,
                RPITEMTYPE.CARD,
                "default",
                algorithm.defaultData(),
            );
            const item3 = new RepetitionItem(
                3,
                1,
                RPITEMTYPE.NOTE,
                "default",
                algorithm.defaultData(),
            );

            const trackedFile1 = new TrackedFile("test1.md", RPITEMTYPE.NOTE, "default");
            const trackedFile2 = new TrackedFile("test2.md", RPITEMTYPE.NOTE, "default");

            storage.setData({
                items: [item1, item2, item3],
                trackedFiles: [trackedFile1, trackedFile2],
            });
            await itemRepo.load();
            await fileRepo.load();

            // Execute: get items for test1.md
            const items = await itemService.getItemsByFile("test1.md");

            // Verify: returns items with fileIndex 0
            expect(items.length).toBe(2);
            expect(items.every((i) => i.fileIndex === 0)).toBe(true);
        });

        it("should return empty array for non-existent file", async () => {
            // Execute: get items for non-existent file
            const items = await itemService.getItemsByFile("nonexistent.md");

            // Verify: returns empty array
            expect(items.length).toBe(0);
        });
    });

    // Property-Based Tests
    // Feature: data-storage-improvements
    describe("Property-Based Tests", () => {
        /**
         * Property 19: Review non-existent item returns error
         * For any item ID that doesn't exist, attempting to review it should return an Err result with ItemNotFoundError.
         * Validates: Requirements 7.3
         */
        describe("Property 19: Review non-existent item returns error", () => {
            it("should return ItemNotFoundError for any non-existent item ID", async () => {
                // Run property test with 100 iterations
                for (let i = 0; i < 100; i++) {
                    // Generate random non-existent item ID
                    const nonExistentId = Math.floor(Math.random() * 10000) + 1000;

                    // Execute: try to review non-existent item
                    const result = await itemService.reviewItem(nonExistentId, "good");

                    // Verify: result is Err with ItemNotFoundError
                    expect(result.isErr).toBe(true);
                    if (result.isErr) {
                        expect(result.error.name).toBe("ItemNotFoundError");
                        expect((result.error as any).itemId).toBe(nonExistentId);
                    }
                }
            });
        });

        /**
         * Property 20: Review untracked item returns error
         * For any item with fileIndex = -1 (untracked), attempting to review it should return an Err result with ItemNotTrackedError.
         * Validates: Requirements 7.4
         */
        describe("Property 20: Review untracked item returns error", () => {
            it("should return ItemNotTrackedError for any untracked item", async () => {
                // Run property test with 100 iterations
                for (let i = 0; i < 100; i++) {
                    // Generate random untracked item
                    const itemId = i + 1;
                    const item = new RepetitionItem(
                        itemId,
                        -1, // Untracked
                        RPITEMTYPE.NOTE,
                        `deck-${Math.random()}`,
                        algorithm.defaultData(),
                    );

                    storage.setData({
                        items: [item],
                        trackedFiles: [],
                    });
                    await itemRepo.load();

                    // Execute: try to review untracked item
                    const result = await itemService.reviewItem(itemId, "good");

                    // Verify: result is Err with ItemNotTrackedError
                    expect(result.isErr).toBe(true);
                    if (result.isErr) {
                        expect(result.error.name).toBe("ItemNotTrackedError");
                        expect((result.error as any).itemId).toBe(itemId);
                    }
                }
            });
        });

        /**
         * Property 21: Review updates item state
         * For any valid item and response, reviewing the item should update its nextReview, timesReviewed, and timesCorrect/errorStreak fields.
         * Validates: Requirements 7.5, 7.6
         */
        describe("Property 21: Review updates item state", () => {
            it("should update item state for any valid review", async () => {
                // Run property test with 100 iterations
                for (let i = 0; i < 100; i++) {
                    // Generate random item
                    const itemId = i + 1;
                    const initialTimesReviewed = Math.floor(Math.random() * 10);
                    const initialTimesCorrect = Math.floor(Math.random() * initialTimesReviewed);
                    const item = new RepetitionItem(
                        itemId,
                        0,
                        RPITEMTYPE.NOTE,
                        "default",
                        algorithm.defaultData(),
                    );
                    item.nextReview = Date.now() - 1000;
                    item.timesReviewed = initialTimesReviewed;
                    item.timesCorrect = initialTimesCorrect;

                    const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
                    storage.setData({
                        items: [item],
                        trackedFiles: [trackedFile],
                    });
                    await itemRepo.load();
                    await fileRepo.load();

                    // Generate random response
                    const responses = ["easy", "good", "hard", "again"];
                    const response = responses[Math.floor(Math.random() * responses.length)];

                    // Execute: review the item
                    const result = await itemService.reviewItem(itemId, response);

                    // Verify: result is Ok
                    expect(result.isOk).toBe(true);

                    // Verify: item state was updated
                    const updatedItem = await itemRepo.findById(itemId);
                    expect(updatedItem).not.toBeNull();
                    expect(updatedItem!.timesReviewed).toBe(initialTimesReviewed + 1);

                    if (response === "again") {
                        // Incorrect response
                        expect(updatedItem!.timesCorrect).toBe(initialTimesCorrect);
                        expect(updatedItem!.errorStreak).toBeGreaterThan(0);
                    } else {
                        // Correct response
                        expect(updatedItem!.timesCorrect).toBe(initialTimesCorrect + 1);
                        expect(updatedItem!.errorStreak).toBe(0);
                    }

                    // Verify: nextReview was updated
                    expect(updatedItem!.nextReview).toBeGreaterThan(Date.now());
                }
            });
        });

        /**
         * Property 22: Review persists changes (round-trip)
         * For any valid item and response, reviewing the item and then retrieving it from the repository should show the updated review statistics.
         * Validates: Requirements 7.7
         */
        describe("Property 22: Review persists changes (round-trip)", () => {
            it("should persist review changes for any valid review", async () => {
                // Run property test with 100 iterations
                for (let i = 0; i < 100; i++) {
                    // Generate random item
                    const itemId = i + 1;
                    const item = new RepetitionItem(
                        itemId,
                        0,
                        RPITEMTYPE.NOTE,
                        "default",
                        algorithm.defaultData(),
                    );
                    item.nextReview = Date.now() - 1000;

                    const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
                    storage.setData({
                        items: [item],
                        trackedFiles: [trackedFile],
                    });
                    await itemRepo.load();
                    await fileRepo.load();

                    // Get initial state
                    const initialItem = await itemRepo.findById(itemId);
                    const initialTimesReviewed = initialItem!.timesReviewed;
                    const initialTimesCorrect = initialItem!.timesCorrect;

                    // Execute: review the item
                    const response = "good";
                    await itemService.reviewItem(itemId, response);

                    // Execute: retrieve the item again (round-trip)
                    const retrievedItem = await itemRepo.findById(itemId);

                    // Verify: changes persisted
                    expect(retrievedItem).not.toBeNull();
                    expect(retrievedItem!.timesReviewed).toBe(initialTimesReviewed + 1);
                    expect(retrievedItem!.timesCorrect).toBe(initialTimesCorrect + 1); // "good" is correct

                    // Verify: data is consistent in storage
                    const storageData = storage.getData();
                    const storedItem = storageData.items.find((i) => i.ID === itemId);
                    expect(storedItem).toBeDefined();
                    expect(storedItem!.timesReviewed).toBe(retrievedItem!.timesReviewed);
                }
            });
        });

        /**
         * Property 23: Review returns Result type
         * For any review operation (successful or failed), the return value should be a Result type, never throwing an exception.
         * Validates: Requirements 7.9
         */
        describe("Property 23: Review returns Result type", () => {
            it("should always return Result type for any review operation", async () => {
                // Run property test with 100 iterations
                for (let i = 0; i < 100; i++) {
                    // Generate random scenario
                    const itemId = Math.floor(Math.random() * 1000) + 1;
                    const shouldExist = Math.random() > 0.3;
                    const shouldBeTracked = Math.random() > 0.3;

                    if (shouldExist) {
                        const item = new RepetitionItem(
                            itemId,
                            shouldBeTracked ? 0 : -1,
                            RPITEMTYPE.NOTE,
                            "default",
                            algorithm.defaultData(),
                        );
                        item.nextReview = Date.now() - 1000;

                        const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
                        storage.setData({
                            items: [item],
                            trackedFiles: shouldBeTracked ? [trackedFile] : [],
                        });
                        await itemRepo.load();
                        await fileRepo.load();
                    } else {
                        storage.setData({
                            items: [],
                            trackedFiles: [],
                        });
                        await itemRepo.load();
                        await fileRepo.load();
                    }

                    // Execute: review the item (should not throw)
                    let result: any;
                    let threwException = false;
                    try {
                        result = await itemService.reviewItem(itemId, "good");
                    } catch (error) {
                        threwException = true;
                    }

                    // Verify: no exception was thrown
                    expect(threwException).toBe(false);

                    // Verify: result is a Result type
                    expect(result).toBeDefined();
                    expect(typeof result.isOk).toBe("boolean");
                    expect(typeof result.isErr).toBe("boolean");
                    expect(result.isOk || result.isErr).toBe(true);
                }
            });
        });

        /**
         * Property 35: Item review emits event
         * For any successful item review, an 'item:reviewed' event should be emitted with the review result as data.
         * Validates: Requirements 12.6
         */
        describe("Property 35: Item review emits event", () => {
            it("should emit item:reviewed event for any successful review", async () => {
                // Run property test with 100 iterations
                for (let i = 0; i < 100; i++) {
                    // Setup: fresh event bus for each iteration
                    const testEventBus = new EventBus();
                    const testItemRepo = new ItemRepository(storage, testEventBus);
                    const testFileRepo = new FileRepository(storage, testEventBus);
                    const testItemService = new ItemService(
                        testItemRepo,
                        testFileRepo,
                        algorithm,
                        testEventBus,
                    );

                    // Generate random item
                    const itemId = i + 1;
                    const item = new RepetitionItem(
                        itemId,
                        0,
                        RPITEMTYPE.NOTE,
                        "default",
                        algorithm.defaultData(),
                    );
                    item.nextReview = Date.now() - 1000;

                    const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
                    storage.setData({
                        items: [item],
                        trackedFiles: [trackedFile],
                    });
                    await testItemRepo.load();
                    await testFileRepo.load();

                    // Setup: event listener
                    let eventEmitted = false;
                    let eventData: any = null;
                    testEventBus.on("item:reviewed", (data) => {
                        eventEmitted = true;
                        eventData = data;
                    });

                    // Execute: review the item
                    const result = await testItemService.reviewItem(itemId, "good");

                    // Verify: event was emitted only if review was successful
                    if (result.isOk) {
                        expect(eventEmitted).toBe(true);
                        expect(eventData).not.toBeNull();
                        expect(eventData.item).toBeDefined();
                        expect(eventData.result).toBeDefined();
                        expect(eventData.item.ID).toBe(itemId);
                    }
                }
            });
        });

        /**
         * Property 24: Get next item filters by deck
         * For any deck name, calling getNextDueItem with that deck name should return only items from that deck or null.
         * Validates: Requirements 8.3
         */
        describe("Property 24: Get next item filters by deck", () => {
            it("should return only items from specified deck for any deck name", async () => {
                // Run property test with 100 iterations
                for (let i = 0; i < 100; i++) {
                    // Generate random deck names
                    const deckNames = ["deck-A", "deck-B", "deck-C", "deck-D", "deck-E"];
                    const targetDeck = deckNames[Math.floor(Math.random() * deckNames.length)];

                    // Generate random items across different decks
                    const numItems = Math.floor(Math.random() * 10) + 5; // 5-14 items
                    const items: RepetitionItem[] = [];
                    const now = Date.now();

                    for (let j = 0; j < numItems; j++) {
                        const itemId = i * 100 + j + 1;
                        const deckName = deckNames[Math.floor(Math.random() * deckNames.length)];
                        const item = new RepetitionItem(
                            itemId,
                            0,
                            RPITEMTYPE.NOTE,
                            deckName,
                            algorithm.defaultData(),
                        );
                        // Make item due (random time in the past)
                        item.nextReview = now - Math.floor(Math.random() * 10000) - 1000;
                        item.timesReviewed = 1; // Mark as reviewed so it's considered due
                        items.push(item);
                    }

                    const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
                    storage.setData({
                        items,
                        trackedFiles: [trackedFile],
                    });
                    await itemRepo.load();
                    await fileRepo.load();

                    // Execute: get next due item for target deck
                    const nextItem = await itemService.getNextDueItem(targetDeck);

                    // Verify: if an item is returned, it must be from the target deck
                    if (nextItem !== null) {
                        expect(nextItem.deckName).toBe(targetDeck);

                        // Verify: it's one of the due items from that deck
                        const targetDeckItems = items.filter(
                            (item) => item.deckName === targetDeck && item.nextReview < now,
                        );
                        expect(targetDeckItems.length).toBeGreaterThan(0);
                        expect(targetDeckItems.some((item) => item.ID === nextItem.ID)).toBe(true);
                    } else {
                        // Verify: if null, there should be no due items in that deck
                        const targetDeckDueItems = items.filter(
                            (item) => item.deckName === targetDeck && item.nextReview < now,
                        );
                        expect(targetDeckDueItems.length).toBe(0);
                    }
                }
            });
        });

        /**
         * Property 25: Get next item returns earliest
         * For any set of due items, getNextDueItem should return the item with the smallest nextReview timestamp.
         * Validates: Requirements 8.5
         */
        describe("Property 25: Get next item returns earliest", () => {
            it("should return item with earliest nextReview for any set of due items", async () => {
                // Run property test with 100 iterations
                for (let i = 0; i < 100; i++) {
                    // Generate random number of due items
                    const numItems = Math.floor(Math.random() * 15) + 2; // 2-16 items
                    const items: RepetitionItem[] = [];
                    const now = Date.now();
                    let earliestTime = now;
                    let earliestId = -1;

                    for (let j = 0; j < numItems; j++) {
                        const itemId = i * 100 + j + 1;
                        const item = new RepetitionItem(
                            itemId,
                            0,
                            RPITEMTYPE.NOTE,
                            "default",
                            algorithm.defaultData(),
                        );
                        // Make item due with random past timestamp
                        const dueTime = now - Math.floor(Math.random() * 100000) - 1000;
                        item.nextReview = dueTime;
                        item.timesReviewed = 1; // Mark as reviewed so it's considered due

                        // Track the earliest item
                        if (dueTime < earliestTime) {
                            earliestTime = dueTime;
                            earliestId = itemId;
                        }

                        items.push(item);
                    }

                    const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
                    storage.setData({
                        items,
                        trackedFiles: [trackedFile],
                    });
                    await itemRepo.load();
                    await fileRepo.load();

                    // Execute: get next due item
                    const nextItem = await itemService.getNextDueItem();

                    // Verify: returns the item with earliest nextReview
                    expect(nextItem).not.toBeNull();
                    expect(nextItem!.ID).toBe(earliestId);
                    expect(nextItem!.nextReview).toBe(earliestTime);

                    // Verify: no other item has an earlier nextReview
                    for (const item of items) {
                        expect(item.nextReview).toBeGreaterThanOrEqual(nextItem!.nextReview);
                    }
                }
            });
        });
    });
});
