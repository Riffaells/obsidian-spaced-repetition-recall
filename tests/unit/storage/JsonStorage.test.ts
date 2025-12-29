import { describe, it, expect, beforeEach } from "bun:test";
import { JsonStorage } from "../../../src/core/storage/JsonStorage";
import { SrsDataValidator } from "../../../src/core/storage/SrsDataValidator";
import { SrsDataMigrator } from "../../../src/core/storage/SrsDataMigrator";
import { BackupManager } from "../../../src/core/storage/BackupManager";
import { SrsData } from "../../../src/dataStore/interfaces";

/**
 * Mock DataAdapter for testing JsonStorage.
 * Simulates file system operations in memory.
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
        const folders: string[] = [];

        for (const path of this.files.keys()) {
            // Check if file is in the specified directory
            const dir = this.getDirectoryPath(path);
            if (dir === dirPath || (dirPath === "" && !path.includes("/"))) {
                files.push(path);
            }
        }

        return { files, folders };
    }

    private getDirectoryPath(path: string): string {
        const lastSlash = Math.max(
            path.lastIndexOf("/"),
            path.lastIndexOf("\\"),
        );
        return lastSlash >= 0 ? path.substring(0, lastSlash) : "";
    }

    // Helper methods for tests
    getFileCount(): number {
        return this.files.size;
    }

    getAllFiles(): string[] {
        return Array.from(this.files.keys());
    }

    clear(): void {
        this.files.clear();
    }
}

describe("JsonStorage", () => {
    let adapter: MockDataAdapter;
    let validator: SrsDataValidator;
    let migrator: SrsDataMigrator;
    let backupManager: BackupManager;
    let storage: JsonStorage<SrsData>;
    const testPath = "data.json";

    beforeEach(() => {
        adapter = new MockDataAdapter();
        validator = new SrsDataValidator();
        migrator = new SrsDataMigrator();
        backupManager = new BackupManager(adapter as any, 5);
        storage = new JsonStorage<SrsData>(
            adapter as any,
            testPath,
            validator,
            migrator,
            backupManager,
        );
    });

    describe("read", () => {
        it("should read and parse valid JSON data", async () => {
            // Setup: create valid data file
            const validData: SrsData = {
                items: [],
                trackedFiles: [],
                queues: {} as any,
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };
            await adapter.write(testPath, JSON.stringify(validData));

            // Execute: read data
            const result = await storage.read();

            // Verify: success
            expect(result.isOk).toBe(true);
            if (result.isOk) {
                expect(result.value.items).toEqual([]);
                expect(result.value.trackedFiles).toEqual([]);
            }
        });

        it("should return FileNotFoundError when file does not exist", async () => {
            // Execute: read non-existent file
            const result = await storage.read();

            // Verify: error
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("FileNotFoundError");
                expect(result.error.message).toContain(testPath);
            }
        });

        it("should return ParseError for invalid JSON", async () => {
            // Setup: create file with invalid JSON
            await adapter.write(testPath, "{invalid json}");

            // Execute: read data
            const result = await storage.read();

            // Verify: parse error
            expect(result.isErr).toBe(true);
            if (result.isErr) {
                expect(result.error.name).toBe("ParseError");
                expect(result.error.message).toContain("Failed to parse JSON");
            }
        });

        it("should auto-fix validation errors", async () => {
            // Setup: create data with validation errors
            const invalidData = {
                items: [
                    {
                        ID: 1,
                        fileIndex: 999, // Invalid: out of bounds
                        nextReview: Date.now() + 20 * 365 * 24 * 60 * 60 * 1000, // Invalid: too far in future
                    },
                ],
                trackedFiles: [],
            };
            await adapter.write(testPath, JSON.stringify(invalidData));

            // Execute: read data
            const result = await storage.read();

            // Verify: success with auto-fixed data
            expect(result.isOk).toBe(true);
            if (result.isOk) {
                // fileIndex should be set to -1 (untracked)
                expect(result.value.items[0].fileIndex).toBe(-1);
                // nextReview should be reset to reasonable value
                expect(result.value.items[0].nextReview).toBeLessThan(
                    Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
                );
            }
        });

        it("should create corrupted backup when validation fails", async () => {
            // Setup: create data with validation errors
            const invalidData = {
                items: [{ ID: 1, fileIndex: 999, nextReview: Date.now() + 20 * 365 * 24 * 60 * 60 * 1000 }],
                trackedFiles: [],
            };
            await adapter.write(testPath, JSON.stringify(invalidData));

            // Execute: read data
            await storage.read();

            // Verify: corrupted backup was created
            const files = adapter.getAllFiles();
            const corruptedBackups = files.filter((f) =>
                f.includes(".corrupted."),
            );
            expect(corruptedBackups.length).toBeGreaterThan(0);
        });

        it("should apply migrations to old data", async () => {
            // Setup: create data with old schema version
            const oldData = {
                version: 0,
                items: [{ ID: 1, fileIndex: 0 }], // Missing itemType field
                trackedFiles: [{ path: "test.md" }],
            };
            await adapter.write(testPath, JSON.stringify(oldData));

            // Execute: read data
            const result = await storage.read();

            // Verify: migration applied
            expect(result.isOk).toBe(true);
            if (result.isOk) {
                expect(result.value.version).toBe(2); // Current version
                expect(result.value.items[0].itemType).toBeDefined();
            }
        });
    });

    describe("write", () => {
        it("should write data as formatted JSON", async () => {
            // Setup: create data
            const data: SrsData = {
                items: [{ ID: 1 } as any],
                trackedFiles: [],
                queues: {} as any,
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            // Execute: write data
            const result = await storage.write(data);

            // Verify: success
            expect(result.isOk).toBe(true);

            // Verify: file exists and contains formatted JSON
            const fileExists = await adapter.exists(testPath);
            expect(fileExists).toBe(true);

            const written = await adapter.read(testPath);
            expect(written).toContain("\n"); // Formatted with newlines
            const parsed = JSON.parse(written);
            expect(parsed.items.length).toBe(1);
        });

        it("should create backup before writing to existing file", async () => {
            // Setup: create initial file
            const initialData: SrsData = {
                items: [],
                trackedFiles: [],
                queues: {} as any,
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };
            await adapter.write(testPath, JSON.stringify(initialData));

            // Execute: write new data
            const newData: SrsData = {
                ...initialData,
                items: [{ ID: 1 } as any],
            };
            const result = await storage.write(newData);

            // Verify: success
            expect(result.isOk).toBe(true);

            // Verify: backup was created
            const files = adapter.getAllFiles();
            const backupFiles = files.filter((f) => f.includes(".backup."));
            expect(backupFiles.length).toBeGreaterThan(0);
        });

        it("should not create backup for new file", async () => {
            // Setup: no existing file
            const data: SrsData = {
                items: [],
                trackedFiles: [],
                queues: {} as any,
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            // Execute: write data
            const result = await storage.write(data);

            // Verify: success
            expect(result.isOk).toBe(true);

            // Verify: no backup was created
            const files = adapter.getAllFiles();
            const backupFiles = files.filter((f) => f.includes(".backup."));
            expect(backupFiles.length).toBe(0);
        });
    });

    describe("exists", () => {
        it("should return true when file exists", async () => {
            // Setup: create file
            await adapter.write(testPath, "{}");

            // Execute: check existence
            const exists = await storage.exists();

            // Verify: true
            expect(exists).toBe(true);
        });

        it("should return false when file does not exist", async () => {
            // Execute: check existence
            const exists = await storage.exists();

            // Verify: false
            expect(exists).toBe(false);
        });
    });

    // Property-Based Tests
    // Feature: data-storage-improvements
    describe("Property-Based Tests", () => {
        /**
         * Property 2: File existence check accuracy
         * For any file path, calling exists() should return true if and only if
         * the file actually exists in the storage system.
         * Validates: Requirements 1.4
         */
        describe("Property 2: File existence check accuracy", () => {
            it("should accurately report file existence across all scenarios", async () => {
                // Run property test with 100 iterations
                for (let i = 0; i < 100; i++) {
                    const adapter = new MockDataAdapter();
                    const storage = new JsonStorage<SrsData>(
                        adapter as any,
                        `test-${i}.json`,
                        validator,
                        migrator,
                        new BackupManager(adapter as any, 5),
                    );

                    // Test 1: File does not exist initially
                    const existsBefore = await storage.exists();
                    const actuallyExistsBefore = await adapter.exists(`test-${i}.json`);
                    expect(existsBefore).toBe(actuallyExistsBefore);
                    expect(existsBefore).toBe(false);

                    // Test 2: Create file
                    const randomData = generateRandomSrsData();
                    await adapter.write(`test-${i}.json`, JSON.stringify(randomData));

                    // Test 3: File exists after creation
                    const existsAfter = await storage.exists();
                    const actuallyExistsAfter = await adapter.exists(`test-${i}.json`);
                    expect(existsAfter).toBe(actuallyExistsAfter);
                    expect(existsAfter).toBe(true);

                    // Test 4: Remove file
                    await adapter.remove(`test-${i}.json`);

                    // Test 5: File does not exist after removal
                    const existsAfterRemoval = await storage.exists();
                    const actuallyExistsAfterRemoval = await adapter.exists(`test-${i}.json`);
                    expect(existsAfterRemoval).toBe(actuallyExistsAfterRemoval);
                    expect(existsAfterRemoval).toBe(false);
                }
            });
        });

        /**
         * Property 3: JSON parsing error handling
         * For any invalid JSON string, attempting to parse it should return an Err result
         * with a ParseError, not crash or throw an exception.
         * Validates: Requirements 1.5
         */
        describe("Property 3: JSON parsing error handling", () => {
            it("should handle all invalid JSON gracefully without throwing", async () => {
                // Run property test with 100 iterations
                for (let i = 0; i < 100; i++) {
                    const adapter = new MockDataAdapter();
                    const storage = new JsonStorage<SrsData>(
                        adapter as any,
                        `test-${i}.json`,
                        validator,
                        migrator,
                        new BackupManager(adapter as any, 5),
                    );

                    // Generate various types of invalid JSON
                    const invalidJSON = generateInvalidJSON(i);

                    // Setup: write invalid JSON to file
                    await adapter.write(`test-${i}.json`, invalidJSON);

                    // Execute: attempt to read
                    let result;
                    let threwException = false;
                    try {
                        result = await storage.read();
                    } catch (error) {
                        threwException = true;
                    }

                    // Verify: should not throw exception
                    expect(threwException).toBe(false);

                    // Verify: should return Err result
                    expect(result).toBeDefined();
                    expect(result!.isErr).toBe(true);

                    // Verify: error should be ParseError
                    if (result!.isErr) {
                        expect(result.error.name).toBe("ParseError");
                        expect(result.error.message).toContain("Failed to parse JSON");
                    }
                }
            });
        });
    });
});

// Helper functions for property-based testing

/**
 * Generates random SrsData for testing
 */
function generateRandomSrsData(): SrsData {
    const numItems = Math.floor(Math.random() * 10);
    const numFiles = Math.floor(Math.random() * 5);

    return {
        items: Array.from({ length: numItems }, (_, i) => ({
            ID: i,
            fileIndex: Math.floor(Math.random() * numFiles),
            nextReview: Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000,
            timesReviewed: Math.floor(Math.random() * 10),
            itemType: "note",
            deckName: "default",
            data: {},
        })) as any,
        trackedFiles: Array.from({ length: numFiles }, (_, i) => ({
            path: `file-${i}.md`,
            tracked: true,
        })) as any,
        queues: {} as any,
        reviewedCounts: {},
        reviewedCardCounts: {},
        mtime: Date.now(),
    };
}

/**
 * Generates various types of invalid JSON for testing
 */
function generateInvalidJSON(seed: number): string {
    const invalidTypes = [
        // Missing closing brace
        '{"items": [',
        // Missing opening brace
        '"items": []}',
        // Trailing comma
        '{"items": [],}',
        // Single quotes instead of double
        "{'items': []}",
        // Unquoted keys
        "{items: []}",
        // Missing quotes on string value
        '{"items": test}',
        // Extra closing brace
        '{"items": []}}}',
        // Missing colon
        '{"items" []}',
        // Invalid escape sequence
        '{"items": "\\x"}',
        // Incomplete string
        '{"items": "test',
        // Invalid number
        '{"value": 123.456.789}',
        // Invalid boolean
        '{"flag": tru}',
        // Invalid null
        '{"value": nul}',
        // Mixed brackets
        '{"items": [}',
        // Empty
        "",
        // Just text
        "not json at all",
        // Partial JSON
        '{"items":',
        // Invalid unicode
        '{"text": "\\u"}',
        // Multiple root objects
        '{"a": 1}{"b": 2}',
    ];

    return invalidTypes[seed % invalidTypes.length];
}
