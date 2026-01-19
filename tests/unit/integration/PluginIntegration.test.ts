import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { setupServices } from "../../../src/core/storage/setupServices";
import { ServiceContainer } from "../../../src/core/infrastructure/ServiceContainer";
import { ItemService } from "../../../src/core/services/ItemService";
import { FileTrackService } from "../../../src/core/services/FileTrackService";
import { IItemRepository } from "../../../src/core/storage/IItemRepository";
import { IFileRepository } from "../../../src/core/storage/IFileRepository";
import { EventBus } from "../../../src/core/infrastructure/EventBus";
import { RPITEMTYPE } from "../../../src/dataStore/repetitionItem";
import { DefaultAlgorithm } from "../../../src/algorithms/scheduling_default";
import { DEFAULT_SETTINGS } from "../../../src/core/settings/DefaultSettings";

/**
 * End-to-end integration tests for the new architecture.
 * Tests complete flows from service layer through repository to storage.
 *
 * Requirements: 17.3
 */
describe("Plugin Integration - End-to-End Tests", () => {
    let container: ServiceContainer;
    let itemService: ItemService;
    let fileTrackService: FileTrackService;
    let itemRepo: IItemRepository;
    let fileRepo: IFileRepository;
    let eventBus: EventBus;
    let mockAdapter: any;
    let mockVault: any;
    let testDataPath: string;

    beforeEach(async () => {
        // Create mock adapter
        const storage = new Map<string, string>();
        mockAdapter = {
            exists: async (path: string) => storage.has(path),
            read: async (path: string) => storage.get(path) || "",
            write: async (path: string, data: string) => {
                storage.set(path, data);
            },
            remove: async (path: string) => {
                storage.delete(path);
            },
            list: async (path: string) => ({ files: [], folders: [] }),
        };

        // Create mock vault
        const mockFiles = new Map<string, any>();
        mockVault = {
            adapter: mockAdapter,
            getAbstractFileByPath: (path: string) => {
                if (mockFiles.has(path)) {
                    return mockFiles.get(path);
                }
                // Create a mock TFile
                const file = {
                    path,
                    name: path.split("/").pop(),
                    extension: "md",
                    basename: path.split("/").pop()?.replace(".md", ""),
                };
                mockFiles.set(path, file);
                return file;
            },
        };

        // Setup services
        testDataPath = "test-data.json";
        const settings = { ...DEFAULT_SETTINGS };
        const algorithm = new DefaultAlgorithm();

        container = setupServices(mockAdapter, mockVault, settings, "", algorithm);

        // Get services
        itemService = container.get("itemService");
        fileTrackService = container.get("fileTrackService");
        itemRepo = container.get("itemRepository");
        fileRepo = container.get("fileRepository");
        eventBus = container.get("eventBus");

        // Initialize with empty data
        await mockAdapter.write(
            testDataPath,
            JSON.stringify({
                version: 2,
                items: [],
                trackedFiles: [],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: Date.now(),
            }),
        );

        // Load repositories
        await itemRepo.load();
        await fileRepo.load();
    });

    afterEach(async () => {
        // Cleanup
        if (mockAdapter && testDataPath) {
            await mockAdapter.remove(testDataPath);
        }
    });

    describe("Complete Review Flow", () => {
        test("should track file, review item, and persist changes", async () => {
            // Arrange
            const testFilePath = "test-note.md";
            let itemUpdatedEventFired = false;

            eventBus.on("item:updated", () => {
                itemUpdatedEventFired = true;
            });

            // Act 1: Track a file
            const trackResult = await fileTrackService.trackFile(
                testFilePath,
                RPITEMTYPE.NOTE,
                "default",
            );

            // Assert 1: Track succeeded
            expect(trackResult.isOk).toBe(true);
            if (trackResult.isOk) {
                expect(trackResult.value.added).toBe(1);
                expect(trackResult.value.removed).toBe(0);
            }

            // Assert 2: File is tracked
            const trackedFile = await fileRepo.findByPath(testFilePath);
            expect(trackedFile).not.toBeNull();
            expect(trackedFile?.path).toBe(testFilePath);

            // Assert 3: Item was created
            const items = await itemRepo.findByFileIndex(trackedFile!.index);
            expect(items.length).toBe(1);
            const item = items[0];
            expect(item).not.toBeNull();
            expect(item.fileIndex).toBe(trackedFile!.index);

            // Act 2: Review the item
            const initialInterval = item.interval;
            const reviewResult = await itemService.reviewItem(item.ID, "easy");

            // Assert 4: Review succeeded
            expect(reviewResult.isOk).toBe(true);

            // Assert 5: Events were fired
            expect(itemUpdatedEventFired).toBe(true);

            // Assert 6: Item was updated
            const updatedItem = await itemRepo.findById(item.ID);
            expect(updatedItem).not.toBeNull();
            expect(updatedItem!.interval).toBeGreaterThan(initialInterval);
        });

        test("should handle review of non-existent item", async () => {
            // Act
            const result = await itemService.reviewItem(99999, "good");

            // Assert
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("ItemNotFoundError");
            }
        });
    });

    describe("Complete Track/Untrack Flow", () => {
        test("should track and untrack file successfully", async () => {
            // Arrange
            const testFilePath = "test-note-2.md";
            let fileUpdatedCount = 0;
            let fileDeletedCount = 0;

            eventBus.on("file:updated", () => {
                fileUpdatedCount++;
            });
            eventBus.on("file:deleted", () => {
                fileDeletedCount++;
            });

            // Act 1: Track file
            const trackResult = await fileTrackService.trackFile(
                testFilePath,
                RPITEMTYPE.NOTE,
                "default",
            );

            // Assert 1: Track succeeded
            expect(trackResult.isOk).toBe(true);

            // Assert 2: File is tracked
            const trackedFile = await fileRepo.findByPath(testFilePath);
            expect(trackedFile).not.toBeNull();

            // Assert 3: Items were created
            const items = await itemRepo.findByFileIndex(trackedFile!.index);
            expect(items.length).toBeGreaterThan(0);
            const itemIds = items.map((i) => i.ID);

            // Act 2: Untrack file
            const untrackResult = await fileTrackService.untrackFile(testFilePath);

            // Assert 4: Untrack succeeded
            expect(untrackResult.isOk).toBe(true);
            if (untrackResult.isOk) {
                expect(untrackResult.value.removed).toBe(items.length);
            }

            // Assert 5: File is no longer tracked
            const untrackedFile = await fileRepo.findByPath(testFilePath);
            expect(untrackedFile).toBeNull();

            // Assert 6: Items were deleted
            for (const itemId of itemIds) {
                const item = await itemRepo.findById(itemId);
                expect(item).toBeNull();
            }

            // Assert 7: Events were fired
            expect(fileUpdatedCount).toBeGreaterThan(0);
            expect(fileDeletedCount).toBeGreaterThan(0);
        });

        test("should handle tracking non-existent file", async () => {
            // Arrange
            const nonExistentPath = "non-existent.md";
            mockVault.getAbstractFileByPath = () => null;

            // Act
            const result = await fileTrackService.trackFile(
                nonExistentPath,
                RPITEMTYPE.NOTE,
                "default",
            );

            // Assert
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("FileNotFoundError");
            }
        });

        test("should handle untracking non-tracked file", async () => {
            // Act
            const result = await fileTrackService.untrackFile("not-tracked.md");

            // Assert
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("FileNotFoundError");
            }
        });
    });

    describe("Error Scenarios", () => {
        test("should handle tracking already-tracked file", async () => {
            // Arrange
            const testFilePath = "test-note-3.md";

            // Track once
            await fileTrackService.trackFile(testFilePath, RPITEMTYPE.NOTE, "default");

            // Act: Try to track again
            const result = await fileTrackService.trackFile(
                testFilePath,
                RPITEMTYPE.NOTE,
                "default",
            );

            // Assert
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("FileAlreadyTrackedError");
            }
        });

        test("should handle reviewing untracked item", async () => {
            // Arrange: Create an item but mark it as untracked
            const testFilePath = "test-note-4.md";
            await fileTrackService.trackFile(testFilePath, RPITEMTYPE.NOTE, "default");

            const trackedFile = await fileRepo.findByPath(testFilePath);
            const items = await itemRepo.findByFileIndex(trackedFile!.index);
            const item = items[0];

            // Untrack the file
            await fileTrackService.untrackFile(testFilePath);

            // Act: Try to review the item
            const result = await itemService.reviewItem(item.ID, "good");

            // Assert
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("ItemNotFoundError");
            }
        });
    });

    describe("Service Container Integration", () => {
        test("should retrieve all services from container", () => {
            // Act & Assert
            expect(container.get("eventBus")).toBeDefined();
            expect(container.get("validator")).toBeDefined();
            expect(container.get("migrator")).toBeDefined();
            expect(container.get("backupManager")).toBeDefined();
            expect(container.get("storage")).toBeDefined();
            expect(container.get("itemRepository")).toBeDefined();
            expect(container.get("fileRepository")).toBeDefined();
            expect(container.get("itemService")).toBeDefined();
            expect(container.get("fileTrackService")).toBeDefined();
        });

        test("should return same instance for multiple gets (singleton)", () => {
            // Act
            const eventBus1 = container.get("eventBus");
            const eventBus2 = container.get("eventBus");

            // Assert
            expect(eventBus1).toBe(eventBus2);
        });
    });
});
