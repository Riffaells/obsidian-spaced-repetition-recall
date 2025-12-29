import { describe, it, expect, beforeEach } from "bun:test";
import { FileRepository } from "../../../src/core/storage/FileRepository";
import { TrackedFile } from "../../../src/dataStore/trackedFile";
import { SrsData } from "../../../src/dataStore/interfaces";
import { EventBus } from "../../../src/core/infrastructure/EventBus";
import { IStorage } from "../../../src/core/storage/IStorage";
import { createOk, createErr } from "../../../src/core/infrastructure/Result";
import { StorageError } from "../../../src/core/infrastructure/errors";
import { RPITEMTYPE } from "../../../src/dataStore/repetitionItem";

/**
 * Mock Storage for testing FileRepository.
 * Simulates storage operations in memory.
 */
class MockStorage implements IStorage<SrsData> {
    private data: SrsData = {
        items: [],
        trackedFiles: [],
        version: 1,
    };

    async read() {
        return createOk(this.data);
    }

    async write(data: SrsData) {
        this.data = data;
        return createOk(undefined);
    }

    async exists() {
        return true;
    }

    // Helper for tests
    setData(data: SrsData) {
        this.data = data;
    }

    getData(): SrsData {
        return this.data;
    }
}

describe("FileRepository", () => {
    let storage: MockStorage;
    let eventBus: EventBus;
    let repository: FileRepository;

    beforeEach(() => {
        storage = new MockStorage();
        eventBus = new EventBus();
        repository = new FileRepository(storage, eventBus);
    });

    describe("load", () => {
        it("should load data from storage and build indexes", async () => {
            // Setup: create test data
            const file1 = new TrackedFile("file1.md", RPITEMTYPE.NOTE, "deck1");
            const file2 = new TrackedFile("file2.md", RPITEMTYPE.CARD, "deck2");
            storage.setData({
                items: [],
                trackedFiles: [file1, file2],
                version: 1,
            });

            // Execute: load data
            const result = await repository.load();

            // Verify: load succeeded
            expect(result.isOk).toBe(true);

            // Verify: can find files by path
            const found1 = await repository.findByPath("file1.md");
            expect(found1).not.toBeNull();
            expect(found1?.path).toBe("file1.md");

            const found2 = await repository.findByPath("file2.md");
            expect(found2).not.toBeNull();
            expect(found2?.path).toBe("file2.md");
        });

        it("should build index by file index", async () => {
            // Setup: create test data
            const file1 = new TrackedFile("file1.md", RPITEMTYPE.NOTE, "deck1");
            const file2 = new TrackedFile("file2.md", RPITEMTYPE.CARD, "deck2");
            storage.setData({
                items: [],
                trackedFiles: [file1, file2],
                version: 1,
            });

            // Execute: load data
            await repository.load();

            // Verify: can find files by index
            const found1 = await repository.findByIndex(0);
            expect(found1).not.toBeNull();
            expect(found1?.path).toBe("file1.md");

            const found2 = await repository.findByIndex(1);
            expect(found2).not.toBeNull();
            expect(found2?.path).toBe("file2.md");
        });

        it("should return error if storage read fails", async () => {
            // Setup: mock storage to fail
            const failingStorage = {
                read: async () => createErr(new StorageError("Read failed")),
                write: async () => createOk(undefined),
                exists: async () => true,
            };
            const repo = new FileRepository(failingStorage as any, eventBus);

            // Execute: load data
            const result = await repo.load();

            // Verify: load failed
            expect(result.isErr).toBe(true);
            expect(result.error.message).toContain("Failed to load data");
        });

        it("should clear existing indexes before loading", async () => {
            // Setup: load initial data
            const file1 = new TrackedFile("file1.md", RPITEMTYPE.NOTE, "deck1");
            storage.setData({
                items: [],
                trackedFiles: [file1],
                version: 1,
            });
            await repository.load();

            // Setup: change data
            const file2 = new TrackedFile("file2.md", RPITEMTYPE.CARD, "deck2");
            storage.setData({
                items: [],
                trackedFiles: [file2],
                version: 1,
            });

            // Execute: reload data
            await repository.load();

            // Verify: old file not found
            const found1 = await repository.findByPath("file1.md");
            expect(found1).toBeNull();

            // Verify: new file found
            const found2 = await repository.findByPath("file2.md");
            expect(found2).not.toBeNull();
        });
    });

    describe("findByPath", () => {
        it("should return file if found", async () => {
            // Setup: load data
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            storage.setData({
                items: [],
                trackedFiles: [file],
                version: 1,
            });
            await repository.load();

            // Execute: find by path
            const found = await repository.findByPath("test.md");

            // Verify: file found
            expect(found).not.toBeNull();
            expect(found?.path).toBe("test.md");
        });

        it("should return null if not found", async () => {
            // Setup: load empty data
            await repository.load();

            // Execute: find non-existent file
            const found = await repository.findByPath("nonexistent.md");

            // Verify: not found
            expect(found).toBeNull();
        });

        it("should use cache for O(1) lookup", async () => {
            // Setup: load data
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            storage.setData({
                items: [],
                trackedFiles: [file],
                version: 1,
            });
            await repository.load();

            // Execute: find multiple times
            const found1 = await repository.findByPath("test.md");
            const found2 = await repository.findByPath("test.md");

            // Verify: same object returned (from cache)
            expect(found1).toBe(found2);
        });
    });

    describe("findByIndex", () => {
        it("should return file if found", async () => {
            // Setup: load data
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            storage.setData({
                items: [],
                trackedFiles: [file],
                version: 1,
            });
            await repository.load();

            // Execute: find by index
            const found = await repository.findByIndex(0);

            // Verify: file found
            expect(found).not.toBeNull();
            expect(found?.path).toBe("test.md");
        });

        it("should return null if index not found", async () => {
            // Setup: load empty data
            await repository.load();

            // Execute: find non-existent index
            const found = await repository.findByIndex(999);

            // Verify: not found
            expect(found).toBeNull();
        });
    });

    describe("list", () => {
        it("should return all tracked files", async () => {
            // Setup: load data
            const file1 = new TrackedFile("file1.md", RPITEMTYPE.NOTE, "deck1");
            const file2 = new TrackedFile("file2.md", RPITEMTYPE.CARD, "deck2");
            const file3 = new TrackedFile("file3.md", RPITEMTYPE.NOTE, "deck3");
            storage.setData({
                items: [],
                trackedFiles: [file1, file2, file3],
                version: 1,
            });
            await repository.load();

            // Execute: list all files
            const files = await repository.list();

            // Verify: all files returned
            expect(files.length).toBe(3);
            expect(files.map((f) => f.path)).toContain("file1.md");
            expect(files.map((f) => f.path)).toContain("file2.md");
            expect(files.map((f) => f.path)).toContain("file3.md");
        });

        it("should return empty array if no files", async () => {
            // Setup: load empty data
            await repository.load();

            // Execute: list all files
            const files = await repository.list();

            // Verify: empty array
            expect(files.length).toBe(0);
        });
    });

    describe("save", () => {
        it("should save new file and update indexes", async () => {
            // Setup: load empty data
            await repository.load();

            // Execute: save new file
            const file = new TrackedFile("new.md", RPITEMTYPE.NOTE, "deck1");
            const result = await repository.save(file);

            // Verify: save succeeded
            expect(result.isOk).toBe(true);

            // Verify: file can be found by path
            const found = await repository.findByPath("new.md");
            expect(found).not.toBeNull();
            expect(found?.path).toBe("new.md");

            // Verify: file can be found by index
            const foundByIndex = await repository.findByIndex(0);
            expect(foundByIndex).not.toBeNull();
            expect(foundByIndex?.path).toBe("new.md");
        });

        it("should update existing file", async () => {
            // Setup: load data with existing file
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            storage.setData({
                items: [],
                trackedFiles: [file],
                version: 1,
            });
            await repository.load();

            // Execute: update file (modify tags directly)
            file.tags.push("deck2");
            const result = await repository.save(file);

            // Verify: save succeeded
            expect(result.isOk).toBe(true);

            // Verify: file updated
            const found = await repository.findByPath("test.md");
            expect(found).not.toBeNull();
            expect(found?.tags.length).toBeGreaterThan(1);
        });

        it("should emit file:updated event on save", async () => {
            // Setup: load empty data and listen for event
            await repository.load();
            let eventEmitted = false;
            let eventData: any = null;
            eventBus.on("file:updated", (data) => {
                eventEmitted = true;
                eventData = data;
            });

            // Execute: save file
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            await repository.save(file);

            // Verify: event emitted
            expect(eventEmitted).toBe(true);
            expect(eventData).not.toBeNull();
            expect(eventData.path).toBe("test.md");
        });

        it("should return error if storage write fails", async () => {
            // Setup: mock storage to fail on write
            const failingStorage = {
                read: async () =>
                    createOk({ items: [], trackedFiles: [], version: 1 }),
                write: async () => createErr(new StorageError("Write failed")),
                exists: async () => true,
            };
            const repo = new FileRepository(failingStorage as any, eventBus);
            await repo.load();

            // Execute: save file
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            const result = await repo.save(file);

            // Verify: save failed
            expect(result.isErr).toBe(true);
            expect(result.error.message).toContain("Failed to write data");
        });

        it("should persist file to storage", async () => {
            // Setup: load empty data
            await repository.load();

            // Execute: save file
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            await repository.save(file);

            // Verify: file persisted to storage
            const data = storage.getData();
            expect(data.trackedFiles.length).toBe(1);
            expect(data.trackedFiles[0].path).toBe("test.md");
        });
    });

    describe("delete", () => {
        it("should delete file and update indexes", async () => {
            // Setup: load data with file
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            storage.setData({
                items: [],
                trackedFiles: [file],
                version: 1,
            });
            await repository.load();

            // Execute: delete file
            const result = await repository.delete("test.md");

            // Verify: delete succeeded
            expect(result.isOk).toBe(true);

            // Verify: file not found by path
            const found = await repository.findByPath("test.md");
            expect(found).toBeNull();

            // Verify: file not found by index
            const foundByIndex = await repository.findByIndex(0);
            expect(foundByIndex).toBeNull();
        });

        it("should emit file:deleted event on delete", async () => {
            // Setup: load data and listen for event
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            storage.setData({
                items: [],
                trackedFiles: [file],
                version: 1,
            });
            await repository.load();

            let eventEmitted = false;
            let eventData: any = null;
            eventBus.on("file:deleted", (data) => {
                eventEmitted = true;
                eventData = data;
            });

            // Execute: delete file
            await repository.delete("test.md");

            // Verify: event emitted
            expect(eventEmitted).toBe(true);
            expect(eventData).toBe("test.md");
        });

        it("should return success if file already deleted", async () => {
            // Setup: load empty data
            await repository.load();

            // Execute: delete non-existent file
            const result = await repository.delete("nonexistent.md");

            // Verify: returns success (idempotent)
            expect(result.isOk).toBe(true);
        });

        it("should rebuild index after delete", async () => {
            // Setup: load data with multiple files
            const file1 = new TrackedFile("file1.md", RPITEMTYPE.NOTE, "deck1");
            const file2 = new TrackedFile("file2.md", RPITEMTYPE.CARD, "deck2");
            const file3 = new TrackedFile("file3.md", RPITEMTYPE.NOTE, "deck3");
            storage.setData({
                items: [],
                trackedFiles: [file1, file2, file3],
                version: 1,
            });
            await repository.load();

            // Execute: delete middle file
            await repository.delete("file2.md");

            // Verify: remaining files have correct indexes
            const found1 = await repository.findByIndex(0);
            expect(found1?.path).toBe("file1.md");

            const found3 = await repository.findByIndex(1);
            expect(found3?.path).toBe("file3.md");

            // Verify: old index 2 is empty
            const found2 = await repository.findByIndex(2);
            expect(found2).toBeNull();
        });

        it("should persist deletion to storage", async () => {
            // Setup: load data with file
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            storage.setData({
                items: [],
                trackedFiles: [file],
                version: 1,
            });
            await repository.load();

            // Execute: delete file
            await repository.delete("test.md");

            // Verify: file removed from storage
            const data = storage.getData();
            expect(data.trackedFiles.length).toBe(0);
        });

        it("should return error if storage write fails", async () => {
            // Setup: load data with file
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            storage.setData({
                items: [],
                trackedFiles: [file],
                version: 1,
            });
            await repository.load();

            // Mock storage to fail on write
            const failingStorage = {
                read: async () =>
                    createOk({ items: [], trackedFiles: [file], version: 1 }),
                write: async () => createErr(new StorageError("Write failed")),
                exists: async () => true,
            };
            const repo = new FileRepository(failingStorage as any, eventBus);
            await repo.load();

            // Execute: delete file
            const result = await repo.delete("test.md");

            // Verify: delete failed
            expect(result.isErr).toBe(true);
            expect(result.error.message).toContain("Failed to write data");
        });
    });

    describe("CRUD operations", () => {
        it("should handle complete CRUD lifecycle", async () => {
            // Setup: load empty data
            await repository.load();

            // Create: save new file
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            await repository.save(file);

            // Read: find file
            let found = await repository.findByPath("test.md");
            expect(found).not.toBeNull();
            expect(found?.path).toBe("test.md");

            // Update: modify and save
            file.tags.push("deck2");
            await repository.save(file);
            found = await repository.findByPath("test.md");
            expect(found?.tags.length).toBeGreaterThan(1);

            // Delete: remove file
            await repository.delete("test.md");
            found = await repository.findByPath("test.md");
            expect(found).toBeNull();
        });
    });

    describe("index maintenance", () => {
        it("should maintain consistent indexes across operations", async () => {
            // Setup: load empty data
            await repository.load();

            // Add files
            const file1 = new TrackedFile("file1.md", RPITEMTYPE.NOTE, "deck1");
            const file2 = new TrackedFile("file2.md", RPITEMTYPE.CARD, "deck2");
            await repository.save(file1);
            await repository.save(file2);

            // Verify: both indexes work
            expect(await repository.findByPath("file1.md")).not.toBeNull();
            expect(await repository.findByIndex(0)).not.toBeNull();
            expect(await repository.findByPath("file2.md")).not.toBeNull();
            expect(await repository.findByIndex(1)).not.toBeNull();

            // Delete first file
            await repository.delete("file1.md");

            // Verify: indexes updated correctly
            expect(await repository.findByPath("file1.md")).toBeNull();
            expect(await repository.findByPath("file2.md")).not.toBeNull();
            expect(await repository.findByIndex(0)).not.toBeNull();
            expect((await repository.findByIndex(0))?.path).toBe("file2.md");
        });
    });

    describe("event emission", () => {
        it("should emit events for all operations", async () => {
            // Setup: load empty data
            await repository.load();

            const events: string[] = [];
            eventBus.on("file:updated", () => events.push("updated"));
            eventBus.on("file:deleted", () => events.push("deleted"));

            // Execute: perform operations
            const file = new TrackedFile("test.md", RPITEMTYPE.NOTE, "deck1");
            await repository.save(file);
            await repository.save(file); // Update
            await repository.delete("test.md");

            // Verify: all events emitted
            expect(events).toContain("updated");
            expect(events).toContain("deleted");
            expect(events.length).toBe(3); // 2 saves + 1 delete
        });
    });
});
