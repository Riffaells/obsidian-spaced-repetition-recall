import { describe, it, expect, beforeEach } from "bun:test";
import { DataStoreAdapter } from "../../../src/dataStore/DataStoreAdapter";
import { ItemService } from "../../../src/core/services/ItemService";
import { FileTrackService } from "../../../src/core/services/FileTrackService";
import { ItemRepository } from "../../../src/core/storage/ItemRepository";
import { FileRepository } from "../../../src/core/storage/FileRepository";
import { JsonStorage } from "../../../src/core/storage/JsonStorage";
import { SrsDataValidator } from "../../../src/core/storage/SrsDataValidator";
import { SrsDataMigrator } from "../../../src/core/storage/SrsDataMigrator";
import { BackupManager } from "../../../src/core/storage/BackupManager";
import { EventBus } from "../../../src/core/infrastructure/EventBus";
import { SrsData, DEFAULT_SRS_DATA } from "../../../src/dataStore/interfaces";
import { RepetitionItem, RPITEMTYPE } from "../../../src/dataStore/repetitionItem";
import { TrackedFile } from "../../../src/dataStore/trackedFile";
import { SrsAlgorithm } from "../../../src/algorithms/algorithms";
import { SRSettings } from "../../../src/settings/settings";

// DEFAULT_SRS_DATA is now imported from interfaces.ts

/**
 * Mock DataAdapter for testing.
 */
class MockDataAdapter {
    private files: Map<string, string> = new Map();

    async read(path: string): Promise<string> {
        const data = this.files.get(path);
        if (data === undefined) {
            throw new Error(`File not found: ${path}`);
        }
        return data;
    }

    async write(path: string, data: string): Promise<void> {
        this.files.set(path, data);
    }

    async exists(path: string): Promise<boolean> {
        return this.files.has(path);
    }

    async remove(path: string): Promise<void> {
        this.files.delete(path);
    }

    async list(dirPath: string): Promise<{ files: string[]; folders: string[] }> {
        const files: string[] = [];
        for (const path of this.files.keys()) {
            files.push(path);
        }
        return { files, folders: [] };
    }

    clear(): void {
        this.files.clear();
    }
}

/**
 * Mock Vault for testing.
 */
class MockVault {
    private files: Map<string, any> = new Map();

    getAbstractFileByPath(path: string): any {
        return this.files.get(path) || null;
    }

    getMarkdownFiles(): any[] {
        return Array.from(this.files.values()).filter((f) => f.extension === "md");
    }

    addFile(path: string, file: any): void {
        this.files.set(path, file);
    }

    clear(): void {
        this.files.clear();
    }
}

/**
 * Mock MetadataCache for testing.
 */
class MockMetadataCache {
    private cache: Map<any, any> = new Map();

    getFileCache(file: any): any {
        return this.cache.get(file) || {};
    }

    setFileCache(file: any, cache: any): void {
        this.cache.set(file, cache);
    }

    clear(): void {
        this.cache.clear();
    }
}

/**
 * Mock SrsAlgorithm for testing.
 */
class MockSrsAlgorithm extends SrsAlgorithm {
    defaultSettings(): unknown {
        return {};
    }

    defaultData(): unknown {
        return {
            interval: 1,
            ease: 2.5,
        };
    }

    onSelection(item: RepetitionItem, option: string, repeat: boolean): any {
        return {
            correct: option === "good" || option === "easy",
            interval: 1,
            ease: 2.5,
        };
    }

    calcAllOptsIntervals(item: RepetitionItem): number[] {
        return [1, 2, 3, 4];
    }

    srsOptions(): string[] {
        return ["again", "hard", "good", "easy"];
    }

    importer(fromAlgo: any, items: RepetitionItem[]): void {
        // No-op for testing
    }

    displaySettings(
        containerEl: HTMLElement,
        update: (settings: unknown, refresh?: boolean) => void,
    ): void {
        // No-op for testing
    }
}

describe("DataStoreAdapter", () => {
    let adapter: DataStoreAdapter;
    let mockDataAdapter: MockDataAdapter;
    let mockVault: MockVault;
    let mockMetadataCache: MockMetadataCache;
    let storage: JsonStorage<SrsData>;
    let itemRepo: ItemRepository;
    let fileRepo: FileRepository;
    let itemService: ItemService;
    let fileTrackService: FileTrackService;
    let eventBus: EventBus;
    let settings: SRSettings;
    const testPath = "data.json";

    beforeEach(async () => {
        // Create mocks
        mockDataAdapter = new MockDataAdapter();
        mockVault = new MockVault();
        mockMetadataCache = new MockMetadataCache();

        // Initialize mock algorithm
        const mockAlgorithm = new MockSrsAlgorithm();
        mockAlgorithm.updateSettings({});

        // Create settings
        settings = {
            flashcardRules: [],
            tagsToReview: [],
            trackedNoteToDecks: false,
            untrackWithReviewTag: false,
            repeatItems: false,
        } as SRSettings;

        // Create infrastructure
        eventBus = new EventBus();

        // Create storage layer
        const validator = new SrsDataValidator();
        const migrator = new SrsDataMigrator();
        const backupManager = new BackupManager(mockDataAdapter as any, 5);
        storage = new JsonStorage<SrsData>(
            mockDataAdapter as any,
            testPath,
            validator,
            migrator,
            backupManager,
        );

        // Create repository layer
        itemRepo = new ItemRepository(storage, eventBus);
        fileRepo = new FileRepository(storage, eventBus);

        // Create service layer
        const algorithm = SrsAlgorithm.getInstance();
        itemService = new ItemService(itemRepo, fileRepo, algorithm, eventBus);
        fileTrackService = new FileTrackService(itemRepo, fileRepo, mockVault as any, algorithm);

        // Create adapter
        adapter = new DataStoreAdapter(
            settings,
            "",
            itemService,
            fileTrackService,
            itemRepo,
            fileRepo,
            storage,
            eventBus,
            mockVault as any,
            mockMetadataCache as any,
        );

        // Initialize with default data
        await mockDataAdapter.write(testPath, JSON.stringify(DEFAULT_SRS_DATA));
        await adapter.load();
    });

    describe("load and save", () => {
        it("should load data from storage", async () => {
            const testData: SrsData = {
                ...DEFAULT_SRS_DATA,
                items: [new RepetitionItem(1, 0, RPITEMTYPE.NOTE, "default", {})],
                trackedFiles: [new TrackedFile("test.md", RPITEMTYPE.NOTE, "default")],
            };

            await mockDataAdapter.write(testPath, JSON.stringify(testData));
            await adapter.load();

            expect(adapter.data.items.length).toBe(1);
            expect(adapter.data.trackedFiles.length).toBe(1);
        });

        it("should save data to storage", async () => {
            adapter.data.items.push(new RepetitionItem(1, 0, RPITEMTYPE.NOTE, "default", {}));

            await adapter.save();

            const savedData = await mockDataAdapter.read(testPath);
            const parsed = JSON.parse(savedData);
            expect(parsed.items.length).toBe(1);
        });

        it("should handle missing file on load", async () => {
            mockDataAdapter.clear();
            await adapter.load();

            expect(adapter.data.items.length).toBe(0);
            expect(adapter.data.trackedFiles.length).toBe(0);
        });
    });

    describe("item operations", () => {
        it("should get item by ID", () => {
            const item = new RepetitionItem(1, 0, RPITEMTYPE.NOTE, "default", {});
            adapter.data.items.push(item);

            const retrieved = adapter.getItembyID(1);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.ID).toBe(1);
        });

        it("should return null for non-existent item", () => {
            const retrieved = adapter.getItembyID(999);
            expect(retrieved).toBeUndefined();
        });

        it("should get items by file", () => {
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            file.items = { file: 1 };
            adapter.data.trackedFiles.push(file);

            const item = new RepetitionItem(1, 0, RPITEMTYPE.NOTE, "default", {});
            adapter.data.items.push(item);

            const items = adapter.getItemsOfFile("test.md");
            expect(items.length).toBe(1);
            expect(items[0].ID).toBe(1);
        });

        it("should return empty array for untracked file", () => {
            const items = adapter.getItemsOfFile("nonexistent.md");
            expect(items.length).toBe(0);
        });
    });

    describe("file operations", () => {
        it("should get file index", () => {
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            adapter.data.trackedFiles.push(file);

            const index = adapter.getFileIndex("test.md");
            expect(index).toBe(0);
        });

        it("should return -1 for non-existent file", () => {
            const index = adapter.getFileIndex("nonexistent.md");
            expect(index).toBe(-1);
        });

        it("should get tracked file", () => {
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            adapter.data.trackedFiles.push(file);

            const retrieved = adapter.getTrackedFile("test.md");
            expect(retrieved).not.toBeNull();
            expect(retrieved?.path).toBe("test.md");
        });

        it("should check if file is tracked", () => {
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            adapter.data.trackedFiles.push(file);

            expect(adapter.isInTrackedFiles("test.md")).toBe(true);
            expect(adapter.isInTrackedFiles("other.md")).toBe(false);
        });
    });

    describe("track and untrack", () => {
        it("should track a new file", () => {
            mockVault.addFile("test.md", {
                path: "test.md",
                extension: "md",
                basename: "test",
            });

            const result = adapter.trackFile("test.md", RPITEMTYPE.NOTE, false);

            expect(result).not.toBeNull();
            expect(result?.added).toBeGreaterThan(0);
            expect(adapter.isInTrackedFiles("test.md")).toBe(true);
        });

        it("should untrack a file", () => {
            // Setup: track a file first
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            file.items = { file: 1 };
            adapter.data.trackedFiles.push(file);

            const item = new RepetitionItem(1, 0, RPITEMTYPE.NOTE, "default", {});
            adapter.data.items.push(item);

            mockVault.addFile("test.md", {
                path: "test.md",
                extension: "md",
                basename: "test",
            });

            const removed = adapter.untrackFile("test.md", false);

            expect(removed).toBeGreaterThan(0);
            const trackedFile = adapter.getTrackedFile("test.md");
            expect(trackedFile?.isTracked).toBe(false);
        });

        it("should return 0 when untracking non-existent file", () => {
            const removed = adapter.untrackFile("nonexistent.md", false);
            expect(removed).toBe(0);
        });
    });

    describe("review operations", () => {
        it("should review an item", () => {
            const item = new RepetitionItem(
                1,
                0,
                RPITEMTYPE.NOTE,
                "default",
                SrsAlgorithm.getInstance().defaultData(),
            );
            adapter.data.items.push(item);

            const initialReviews = item.timesReviewed;
            adapter.reviewId(1, "good");

            const reviewed = adapter.getItembyID(1);
            expect(reviewed?.timesReviewed).toBeGreaterThan(initialReviews);
        });

        it("should return -1 for non-existent item review", () => {
            const result = adapter.reviewId(999, "good");
            expect(result).toBe(-1);
        });
    });

    describe("utility methods", () => {
        it("should get max item ID", () => {
            adapter.data.items.push(new RepetitionItem(1, 0, RPITEMTYPE.NOTE, "default", {}));
            adapter.data.items.push(new RepetitionItem(5, 0, RPITEMTYPE.NOTE, "default", {}));
            adapter.data.items.push(new RepetitionItem(3, 0, RPITEMTYPE.NOTE, "default", {}));

            expect(adapter.maxItemId).toBe(5);
        });

        it("should get item size", () => {
            adapter.data.items.push(new RepetitionItem(1, 0, RPITEMTYPE.NOTE, "default", {}));
            adapter.data.items.push(new RepetitionItem(2, 0, RPITEMTYPE.NOTE, "default", {}));

            expect(adapter.itemSize).toBe(2);
        });

        it("should get file path for item", () => {
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "default");
            adapter.data.trackedFiles.push(file);

            const item = new RepetitionItem(1, 0, RPITEMTYPE.NOTE, "default", {});
            adapter.data.items.push(item);

            const path = adapter.getFilePath(item);
            expect(path).toBe("test.md");
        });

        it("should reset data", () => {
            adapter.data.items.push(new RepetitionItem(1, 0, RPITEMTYPE.NOTE, "default", {}));
            adapter.data.trackedFiles.push(new TrackedFile("test.md", RPITEMTYPE.NOTE, "default"));

            adapter.resetData();

            expect(adapter.data.items.length).toBe(0);
            expect(adapter.data.trackedFiles.length).toBe(0);
        });
    });

    describe("singleton pattern", () => {
        it("should maintain singleton instance", () => {
            const instance1 = DataStoreAdapter.getInstance();
            const instance2 = DataStoreAdapter.getInstance();

            expect(instance1).toBe(instance2);
            expect(instance1).toBe(adapter);
        });
    });

    describe("error handling", () => {
        it("should handle save errors gracefully", async () => {
            // Force an error by making the adapter throw
            const originalWrite = mockDataAdapter.write.bind(mockDataAdapter);
            mockDataAdapter.write = async (path: string, data: string) => {
                throw new Error("Write failed");
            };

            // Save should not throw, just log error
            await adapter.save();

            // Verify error was handled (data should still be in memory)
            expect(adapter.data).toBeDefined();

            // Restore original write
            mockDataAdapter.write = originalWrite;
        });

        it("should handle load errors gracefully", async () => {
            mockDataAdapter.clear();

            await adapter.load();

            // Should create default data instead of throwing
            expect(adapter.data).toBeDefined();
            expect(adapter.data.items).toBeDefined();
            expect(adapter.data.trackedFiles).toBeDefined();
        });
    });
});
