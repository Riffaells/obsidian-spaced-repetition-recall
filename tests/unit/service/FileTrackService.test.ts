import { describe, it, expect, beforeEach } from "bun:test";
import { FileTrackService } from "../../../src/core/services/FileTrackService";
import { ItemRepository } from "../../../src/core/storage/ItemRepository";
import { FileRepository } from "../../../src/core/storage/FileRepository";
import { EventBus } from "../../../src/core/infrastructure/EventBus";
import { RepetitionItem, RPITEMTYPE } from "../../../src/dataStore/repetitionItem";
import { TrackedFile } from "../../../src/dataStore/trackedFile";
import { SrsData } from "../../../src/dataStore/interfaces";
import { IStorage } from "../../../src/core/storage/IStorage";
import { Result, createOk } from "../../../src/core/infrastructure/Result";
import { StorageError } from "../../../src/core/infrastructure/errors";
import { SrsAlgorithm } from "../../../src/algorithms/algorithms";
import { setDueDates } from "../../../src/algorithms/balance/balance";
import { TFile, TFolder, Vault } from "obsidian";

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
 * Mock Vault for testing
 */
class MockVault {
    private files: Set<string> = new Set();

    addFile(path: string): void {
        this.files.add(path);
    }

    removeFile(path: string): void {
        this.files.delete(path);
    }

    getAbstractFileByPath(path: string): TFile | null {
        if (this.files.has(path)) {
            return { path } as TFile;
        }
        return null;
    }

    clear(): void {
        this.files.clear();
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
        const intervals: Record<string, number> = {
            easy: 7 * 24 * 60 * 60 * 1000,
            good: 3 * 24 * 60 * 60 * 1000,
            hard: 1 * 24 * 60 * 60 * 1000,
            again: 10 * 60 * 1000,
        };

        const interval = intervals[option] || intervals.good;
        const correct = option !== "again";

        return {
            correct,
            nextReview: interval,
        };
    }

    calcAllOptsIntervals(item: RepetitionItem): number[] {
        return [10, 1440, 4320, 10080];
    }

    srsOptions(): string[] {
        return ["again", "hard", "good", "easy"];
    }

    importer(fromAlgo: any, items: RepetitionItem[]): void {}

    displaySettings(
        containerEl: HTMLElement,
        update: (settings: unknown, refresh?: boolean) => void,
    ): void {}
}

describe("FileTrackService", () => {
    let storage: MockStorage;
    let eventBus: EventBus;
    let itemRepo: ItemRepository;
    let fileRepo: FileRepository;
    let vault: MockVault;
    let algorithm: MockAlgorithm;
    let fileTrackService: FileTrackService;

    beforeEach(async () => {
        storage = new MockStorage();
        eventBus = new EventBus();
        itemRepo = new ItemRepository(storage, eventBus);
        fileRepo = new FileRepository(storage, eventBus);
        vault = new MockVault();
        algorithm = new MockAlgorithm();
        fileTrackService = new FileTrackService(
            itemRepo,
            fileRepo,
            vault as any as Vault,
            algorithm,
        );

        setDueDates({}, {});
        await itemRepo.load();
        await fileRepo.load();
    });

    describe("trackFile", () => {
        it("should track a file and create entities", async () => {
            vault.addFile("test.md");
            const result = await fileTrackService.trackFile("test.md", RPITEMTYPE.NOTE, "default");
            expect(result.isOk).toBe(true);
            if (result.isOk) {
                expect(result.value.added).toBe(1);
                expect(result.value.removed).toBe(0);
            }
            const trackedFile = await fileRepo.findByPath("test.md");
            expect(trackedFile).not.toBeNull();
            expect(trackedFile!.isTracked).toBe(true);
            const allFiles = await fileRepo.list();
            const fileIndex = allFiles.findIndex((f) => f.path === "test.md");
            const items = await itemRepo.findByFileIndex(fileIndex);
            expect(items.length).toBe(1);
            expect(items[0].fileIndex).toBe(fileIndex);
        });

        it("should return error for non-existent file", async () => {
            const result = await fileTrackService.trackFile(
                "nonexistent.md",
                RPITEMTYPE.NOTE,
                "default",
            );
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("FileNotFoundError");
                expect((result.error as any).path).toBe("nonexistent.md");
            }
        });

        it("should return error for already tracked file", async () => {
            vault.addFile("test.md");
            const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            storage.setData({ items: [], trackedFiles: [trackedFile] });
            await fileRepo.load();
            const result = await fileTrackService.trackFile("test.md", RPITEMTYPE.NOTE, "default");
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("FileAlreadyTrackedError");
                expect((result.error as any).path).toBe("test.md");
            }
        });
    });

    describe("untrackFile", () => {
        it("should untrack a file and remove all entities", async () => {
            const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
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
            storage.setData({ items: [item1, item2], trackedFiles: [trackedFile] });
            await itemRepo.load();
            await fileRepo.load();
            const result = await fileTrackService.untrackFile("test.md");
            expect(result.isOk).toBe(true);
            if (result.isOk) {
                expect(result.value.added).toBe(0);
                expect(result.value.removed).toBe(2);
            }
            const trackedFileAfter = await fileRepo.findByPath("test.md");
            expect(trackedFileAfter).toBeNull();
            const item1After = await itemRepo.findById(1);
            const item2After = await itemRepo.findById(2);
            expect(item1After).toBeNull();
            expect(item2After).toBeNull();
        });

        it("should return error for non-existent file", async () => {
            const result = await fileTrackService.untrackFile("nonexistent.md");
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("FileNotFoundError");
            }
        });

        it("should return error for non-tracked file", async () => {
            const trackedFile = new TrackedFile("test.md", RPITEMTYPE.NOTE);
            trackedFile.setUnTracked();
            storage.setData({ items: [], trackedFiles: [trackedFile] });
            await fileRepo.load();
            const result = await fileTrackService.untrackFile("test.md");
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("FileNotTrackedError");
            }
        });
    });

    // Property-Based Tests
    // Feature: data-storage-improvements
    describe("Property-Based Tests", () => {
        describe("Property 26: Track non-existent file returns error", () => {
            it("should return FileNotFoundError for any non-existent file", async () => {
                for (let i = 0; i < 100; i++) {
                    const randomPath = `nonexistent-${Math.random()}-${i}.md`;
                    vault.removeFile(randomPath);
                    const result = await fileTrackService.trackFile(
                        randomPath,
                        RPITEMTYPE.NOTE,
                        "default",
                    );
                    expect(result.isErr).toBe(true);
                    if (result.isErr) {
                        expect(result.error.name).toBe("FileNotFoundError");
                        expect((result.error as any).path).toBe(randomPath);
                    }
                }
            });
        });

        describe("Property 27: Track already-tracked file returns error", () => {
            it("should return FileAlreadyTrackedError for any already-tracked file", async () => {
                for (let i = 0; i < 100; i++) {
                    const filePath = `test-${i}.md`;
                    const deckName = `deck-${Math.random()}`;
                    vault.addFile(filePath);
                    const trackedFile = new TrackedFile(filePath, RPITEMTYPE.NOTE, deckName);
                    storage.setData({ items: [], trackedFiles: [trackedFile] });
                    await fileRepo.load();
                    const result = await fileTrackService.trackFile(
                        filePath,
                        RPITEMTYPE.NOTE,
                        deckName,
                    );
                    expect(result.isErr).toBe(true);
                    if (result.isErr) {
                        expect(result.error.name).toBe("FileAlreadyTrackedError");
                        expect((result.error as any).path).toBe(filePath);
                    }
                    vault.removeFile(filePath);
                }
            });
        });

        describe("Property 28: Track file creates entities (round-trip)", () => {
            it("should create and retrieve entities for any valid file", async () => {
                for (let i = 0; i < 100; i++) {
                    const filePath = `test-${i}-${Math.random()}.md`;
                    const itemType = Math.random() > 0.5 ? RPITEMTYPE.NOTE : RPITEMTYPE.CARD;
                    const deckName = `deck-${Math.floor(Math.random() * 10)}`;
                    vault.addFile(filePath);
                    storage.setData({ items: [], trackedFiles: [] });
                    await itemRepo.load();
                    await fileRepo.load();
                    const trackResult = await fileTrackService.trackFile(
                        filePath,
                        itemType,
                        deckName,
                    );
                    expect(trackResult.isOk).toBe(true);
                    const trackedFile = await fileRepo.findByPath(filePath);
                    expect(trackedFile).not.toBeNull();
                    expect(trackedFile!.path).toBe(filePath);
                    expect(trackedFile!.isTracked).toBe(true);
                    const allFiles = await fileRepo.list();
                    const fileIndex = allFiles.findIndex((f) => f.path === filePath);
                    expect(fileIndex).toBeGreaterThanOrEqual(0);
                    const items = await itemRepo.findByFileIndex(fileIndex);
                    expect(items.length).toBe(1);
                    expect(items[0].fileIndex).toBe(fileIndex);
                    expect(items[0].itemType).toBe(itemType);
                    expect(items[0].deckName).toBe(deckName);
                    vault.removeFile(filePath);
                }
            });
        });

        describe("Property 29: Track returns Result type", () => {
            it("should always return Result type for any track operation", async () => {
                for (let i = 0; i < 100; i++) {
                    const filePath = `test-${i}-${Math.random()}.md`;
                    const shouldExist = Math.random() > 0.3;
                    const shouldBeTracked = Math.random() > 0.3;
                    if (shouldExist) {
                        vault.addFile(filePath);
                        if (shouldBeTracked) {
                            const trackedFile = new TrackedFile(
                                filePath,
                                RPITEMTYPE.NOTE,
                                "default",
                            );
                            storage.setData({ items: [], trackedFiles: [trackedFile] });
                            await fileRepo.load();
                        } else {
                            storage.setData({ items: [], trackedFiles: [] });
                            await fileRepo.load();
                        }
                    } else {
                        vault.removeFile(filePath);
                    }
                    let result: any;
                    let threwException = false;
                    try {
                        result = await fileTrackService.trackFile(
                            filePath,
                            RPITEMTYPE.NOTE,
                            "default",
                        );
                    } catch (error) {
                        threwException = true;
                    }
                    expect(threwException).toBe(false);
                    expect(result).toBeDefined();
                    expect(typeof result.isOk).toBe("boolean");
                    expect(typeof result.isErr).toBe("boolean");
                    expect(result.isOk || result.isErr).toBe(true);
                    vault.removeFile(filePath);
                }
            });
        });

        describe("Property 30: Untrack non-tracked file returns error", () => {
            it("should return error for any non-tracked file", async () => {
                for (let i = 0; i < 100; i++) {
                    const filePath = `test-${i}-${Math.random()}.md`;
                    const fileExists = Math.random() > 0.5;
                    if (fileExists) {
                        const trackedFile = new TrackedFile(filePath, RPITEMTYPE.NOTE);
                        trackedFile.setUnTracked();
                        storage.setData({ items: [], trackedFiles: [trackedFile] });
                        await fileRepo.load();
                    } else {
                        storage.setData({ items: [], trackedFiles: [] });
                        await fileRepo.load();
                    }
                    const result = await fileTrackService.untrackFile(filePath);
                    expect(result.isErr).toBe(true);
                    if (result.isErr) {
                        const errorName = result.error.name;
                        expect(
                            errorName === "FileNotFoundError" ||
                                errorName === "FileNotTrackedError",
                        ).toBe(true);
                    }
                }
            });
        });

        describe("Property 31: Untrack removes all entities", () => {
            it("should remove all entities for any tracked file", async () => {
                for (let i = 0; i < 100; i++) {
                    const filePath = `test-${i}.md`;
                    const numItems = Math.floor(Math.random() * 5) + 1;
                    const deckName = `deck-${Math.floor(Math.random() * 10)}`;
                    const trackedFile = new TrackedFile(filePath, RPITEMTYPE.NOTE, deckName);
                    const items: RepetitionItem[] = [];
                    for (let j = 0; j < numItems; j++) {
                        const item = new RepetitionItem(
                            i * 100 + j,
                            0,
                            Math.random() > 0.5 ? RPITEMTYPE.NOTE : RPITEMTYPE.CARD,
                            deckName,
                            algorithm.defaultData(),
                        );
                        items.push(item);
                    }
                    storage.setData({ items: items, trackedFiles: [trackedFile] });
                    await itemRepo.load();
                    await fileRepo.load();
                    const fileBeforeUntrack = await fileRepo.findByPath(filePath);
                    expect(fileBeforeUntrack).not.toBeNull();
                    const itemsBeforeUntrack = await itemRepo.findByFileIndex(0);
                    expect(itemsBeforeUntrack.length).toBe(numItems);
                    const result = await fileTrackService.untrackFile(filePath);
                    expect(result.isOk).toBe(true);
                    if (result.isOk) {
                        expect(result.value.removed).toBe(numItems);
                    }
                    const fileAfterUntrack = await fileRepo.findByPath(filePath);
                    expect(fileAfterUntrack).toBeNull();
                    for (const item of items) {
                        const itemAfterUntrack = await itemRepo.findById(item.ID);
                        expect(itemAfterUntrack).toBeNull();
                    }
                    const itemsAfterUntrack = await itemRepo.findByFileIndex(0);
                    expect(itemsAfterUntrack.length).toBe(0);
                }
            });
        });

        describe("Property 32: Untrack returns Result type", () => {
            it("should always return Result type for any untrack operation", async () => {
                for (let i = 0; i < 100; i++) {
                    const filePath = `test-${i}-${Math.random()}.md`;
                    const fileExists = Math.random() > 0.3;
                    const isTracked = Math.random() > 0.3;
                    if (fileExists) {
                        const trackedFile = new TrackedFile(filePath, RPITEMTYPE.NOTE, "default");
                        if (!isTracked) {
                            trackedFile.setUnTracked();
                        }
                        const item = new RepetitionItem(
                            i,
                            0,
                            RPITEMTYPE.NOTE,
                            "default",
                            algorithm.defaultData(),
                        );
                        storage.setData({
                            items: isTracked ? [item] : [],
                            trackedFiles: [trackedFile],
                        });
                        await itemRepo.load();
                        await fileRepo.load();
                    } else {
                        storage.setData({ items: [], trackedFiles: [] });
                        await itemRepo.load();
                        await fileRepo.load();
                    }
                    let result: any;
                    let threwException = false;
                    try {
                        result = await fileTrackService.untrackFile(filePath);
                    } catch (error) {
                        threwException = true;
                    }
                    expect(threwException).toBe(false);
                    expect(result).toBeDefined();
                    expect(typeof result.isOk).toBe("boolean");
                    expect(typeof result.isErr).toBe("boolean");
                    expect(result.isOk || result.isErr).toBe(true);
                }
            });
        });
    });
});
