import { describe, it, expect, beforeEach } from "bun:test";
import { BackupManager } from "../../../src/core/storage/BackupManager";

/**
 * Mock DataAdapter for testing BackupManager.
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

    // Helper method for tests
    getFileCount(): number {
        return this.files.size;
    }

    // Helper method for tests
    getAllFiles(): string[] {
        return Array.from(this.files.keys());
    }
}

describe("BackupManager", () => {
    let adapter: MockDataAdapter;
    let backupManager: BackupManager;
    const testPath = "data.json";
    const testData = '{"items": [], "trackedFiles": []}';

    beforeEach(() => {
        adapter = new MockDataAdapter();
        backupManager = new BackupManager(adapter as any, 3); // Keep 3 backups
    });

    describe("createBackup", () => {
        it("should create a backup with timestamp in filename", async () => {
            // Setup: create original file
            await adapter.write(testPath, testData);

            // Execute: create backup
            await backupManager.createBackup(testPath);

            // Verify: backup file exists with timestamp pattern
            const files = await adapter.list("");
            const backupFiles = files.files.filter((f) =>
                f.includes(".backup."),
            );

            expect(backupFiles.length).toBe(1);
            expect(backupFiles[0]).toMatch(/data\.json\.backup\.\d+/);
        });

        it("should preserve original file content in backup", async () => {
            // Setup: create original file
            await adapter.write(testPath, testData);

            // Execute: create backup
            await backupManager.createBackup(testPath);

            // Verify: backup contains same data
            const files = await adapter.list("");
            const backupFile = files.files.find((f) => f.includes(".backup."));
            expect(backupFile).toBeDefined();

            const backupData = await adapter.read(backupFile!);
            expect(backupData).toBe(testData);
        });

        it("should throw error if file does not exist", async () => {
            // Execute & Verify: should throw error
            await expect(
                backupManager.createBackup("nonexistent.json"),
            ).rejects.toThrow("Cannot create backup: file not found");
        });

        it("should clean old backups when exceeding maxBackups", async () => {
            // Setup: create original file
            await adapter.write(testPath, testData);

            // Execute: create 5 backups (maxBackups is 3)
            for (let i = 0; i < 5; i++) {
                await backupManager.createBackup(testPath);
                // Small delay to ensure different timestamps
                await new Promise((resolve) => setTimeout(resolve, 2));
            }

            // Verify: only 3 most recent backups remain
            const files = await adapter.list("");
            const backupFiles = files.files.filter((f) =>
                f.includes(".backup."),
            );

            expect(backupFiles.length).toBe(3);
        });
    });

    describe("createCorruptedBackup", () => {
        it("should create a corrupted backup with .corrupted extension", async () => {
            // Setup: create corrupted file
            const corruptedData = '{"items": [invalid json}';
            await adapter.write(testPath, corruptedData);

            // Execute: create corrupted backup
            await backupManager.createCorruptedBackup(testPath);

            // Verify: corrupted backup exists
            const files = await adapter.list("");
            const corruptedFiles = files.files.filter((f) =>
                f.includes(".corrupted."),
            );

            expect(corruptedFiles.length).toBe(1);
            expect(corruptedFiles[0]).toMatch(/data\.json\.corrupted\.\d+/);
        });

        it("should preserve corrupted data in backup", async () => {
            // Setup: create corrupted file
            const corruptedData = '{"items": [invalid json}';
            await adapter.write(testPath, corruptedData);

            // Execute: create corrupted backup
            await backupManager.createCorruptedBackup(testPath);

            // Verify: corrupted backup contains same data
            const files = await adapter.list("");
            const corruptedFile = files.files.find((f) =>
                f.includes(".corrupted."),
            );
            expect(corruptedFile).toBeDefined();

            const backupData = await adapter.read(corruptedFile!);
            expect(backupData).toBe(corruptedData);
        });

        it("should throw error if file does not exist", async () => {
            // Execute & Verify: should throw error
            await expect(
                backupManager.createCorruptedBackup("nonexistent.json"),
            ).rejects.toThrow("Cannot create corrupted backup: file not found");
        });
    });

    describe("restore", () => {
        it("should restore data from backup to original location", async () => {
            // Setup: create original file and backup
            await adapter.write(testPath, testData);
            await backupManager.createBackup(testPath);

            // Modify original file
            const modifiedData = '{"items": [1, 2, 3]}';
            await adapter.write(testPath, modifiedData);

            // Get backup path
            const files = await adapter.list("");
            const backupFile = files.files.find((f) => f.includes(".backup."));
            expect(backupFile).toBeDefined();

            // Execute: restore from backup
            await backupManager.restore(testPath, backupFile!);

            // Verify: original file has backup data
            const restoredData = await adapter.read(testPath);
            expect(restoredData).toBe(testData);
        });

        it("should throw error if backup file does not exist", async () => {
            // Execute & Verify: should throw error
            await expect(
                backupManager.restore(testPath, "nonexistent.backup"),
            ).rejects.toThrow("Backup file not found");
        });

        it("should handle round-trip backup and restore", async () => {
            // Setup: create original file
            const originalData = '{"test": "data", "value": 123}';
            await adapter.write(testPath, originalData);

            // Execute: backup, modify, restore
            await backupManager.createBackup(testPath);
            await adapter.write(testPath, '{"modified": true}');

            const files = await adapter.list("");
            const backupFile = files.files.find((f) => f.includes(".backup."));
            await backupManager.restore(testPath, backupFile!);

            // Verify: data matches original
            const restoredData = await adapter.read(testPath);
            expect(restoredData).toBe(originalData);
        });
    });

    describe("backup rotation", () => {
        it("should keep only the most recent N backups", async () => {
            // Setup: create original file
            await adapter.write(testPath, testData);

            // Execute: create multiple backups
            const timestamps: number[] = [];
            for (let i = 0; i < 5; i++) {
                await backupManager.createBackup(testPath);
                // Extract timestamp from created backup
                const files = await adapter.list("");
                const backupFiles = files.files.filter((f) =>
                    f.includes(".backup."),
                );
                const latestBackup = backupFiles[backupFiles.length - 1];
                const match = latestBackup.match(/\.backup\.(\d+)$/);
                if (match) {
                    timestamps.push(parseInt(match[1], 10));
                }
                await new Promise((resolve) => setTimeout(resolve, 2));
            }

            // Verify: only 3 most recent backups exist
            const files = await adapter.list("");
            const backupFiles = files.files.filter((f) =>
                f.includes(".backup."),
            );
            expect(backupFiles.length).toBe(3);

            // Verify: the 3 most recent timestamps are present
            const recentTimestamps = timestamps.slice(-3);
            for (const ts of recentTimestamps) {
                const backupExists = backupFiles.some((f) =>
                    f.includes(`.backup.${ts}`),
                );
                expect(backupExists).toBe(true);
            }
        });

        it("should not delete backups if under maxBackups limit", async () => {
            // Setup: create original file
            await adapter.write(testPath, testData);

            // Execute: create 2 backups (maxBackups is 3)
            await backupManager.createBackup(testPath);
            await new Promise((resolve) => setTimeout(resolve, 2));
            await backupManager.createBackup(testPath);

            // Verify: both backups exist
            const files = await adapter.list("");
            const backupFiles = files.files.filter((f) =>
                f.includes(".backup."),
            );
            expect(backupFiles.length).toBe(2);
        });
    });

    describe("edge cases", () => {
        it("should handle files in subdirectories", async () => {
            // Setup: create file in subdirectory
            const subPath = "subdir/data.json";
            await adapter.write(subPath, testData);

            // Execute: create backup
            await backupManager.createBackup(subPath);

            // Verify: backup created in same directory
            const files = await adapter.list("subdir");
            const backupFiles = files.files.filter((f) =>
                f.includes(".backup."),
            );
            expect(backupFiles.length).toBe(1);
        });

        it("should handle empty file content", async () => {
            // Setup: create empty file
            await adapter.write(testPath, "");

            // Execute: create backup
            await backupManager.createBackup(testPath);

            // Verify: backup created with empty content
            const files = await adapter.list("");
            const backupFile = files.files.find((f) => f.includes(".backup."));
            expect(backupFile).toBeDefined();

            const backupData = await adapter.read(backupFile!);
            expect(backupData).toBe("");
        });

        it("should handle large file content", async () => {
            // Setup: create large file
            const largeData = JSON.stringify({
                items: Array(1000).fill({ id: 1, data: "test" }),
            });
            await adapter.write(testPath, largeData);

            // Execute: create backup
            await backupManager.createBackup(testPath);

            // Verify: backup contains all data
            const files = await adapter.list("");
            const backupFile = files.files.find((f) => f.includes(".backup."));
            const backupData = await adapter.read(backupFile!);
            expect(backupData).toBe(largeData);
        });
    });

    // Property-Based Tests
    // Feature: data-storage-improvements
    describe("Property-Based Tests", () => {
        /**
         * Property 11: Backup creation before save
         * For any save operation when the file already exists, a backup should be created before writing the new data.
         * Validates: Requirements 19.1
         */
        describe("Property 11: Backup creation before save", () => {
            it("should create backup before any save operation on existing file", async () => {
                // Run property test with 20 iterations (reduced for performance)
                for (let i = 0; i < 20; i++) {
                    // Generate random file data
                    const randomData = generateRandomData();
                    const filePath = `test-${i}.json`;

                    // Setup: create initial file
                    await adapter.write(filePath, randomData);

                    // Get initial file count
                    const initialFiles = adapter.getAllFiles();
                    const initialCount = initialFiles.length;

                    // Execute: create backup (simulates save operation)
                    await backupManager.createBackup(filePath);

                    // Verify: backup was created (file count increased)
                    const afterFiles = adapter.getAllFiles();
                    const afterCount = afterFiles.length;
                    expect(afterCount).toBeGreaterThan(initialCount);

                    // Verify: backup file exists
                    const backupFiles = afterFiles.filter((f) =>
                        f.includes(`${filePath}.backup.`),
                    );
                    expect(backupFiles.length).toBeGreaterThan(0);

                    // Cleanup
                    await adapter.remove(filePath);
                    for (const backup of backupFiles) {
                        await adapter.remove(backup);
                    }
                }
            });
        });

        /**
         * Property 12: Backup rotation and naming
         * For any sequence of save operations, only the last N backups should exist,
         * and each backup filename should contain a timestamp.
         * Validates: Requirements 19.2, 19.3
         */
        describe("Property 12: Backup rotation and naming", () => {
            it("should maintain only N most recent backups with timestamps", async () => {
                // Run property test with 20 iterations (reduced for performance)
                for (let i = 0; i < 20; i++) {
                    const adapter = new MockDataAdapter();
                    const maxBackups = Math.floor(Math.random() * 3) + 2; // Random between 2-4
                    const backupManager = new BackupManager(
                        adapter as any,
                        maxBackups,
                    );
                    const filePath = `test-rotation-${i}.json`;
                    const randomData = generateRandomData();

                    // Setup: create initial file
                    await adapter.write(filePath, randomData);

                    // Execute: create more backups than maxBackups
                    const numBackups = maxBackups + Math.floor(Math.random() * 3) + 1;
                    for (let j = 0; j < numBackups; j++) {
                        await backupManager.createBackup(filePath);
                        // Small delay to ensure different timestamps
                        await new Promise((resolve) => setTimeout(resolve, 1));
                    }

                    // Verify: only maxBackups exist
                    const files = adapter.getAllFiles();
                    const backupFiles = files.filter((f) =>
                        f.includes(`${filePath}.backup.`),
                    );
                    expect(backupFiles.length).toBe(maxBackups);

                    // Verify: all backup files have timestamp in name
                    for (const backupFile of backupFiles) {
                        expect(backupFile).toMatch(/\.backup\.\d+$/);
                        // Extract and verify timestamp is a valid number
                        const match = backupFile.match(/\.backup\.(\d+)$/);
                        expect(match).toBeDefined();
                        const timestamp = parseInt(match![1], 10);
                        expect(timestamp).toBeGreaterThan(0);
                    }
                }
            });
        });

        /**
         * Property 13: Backup preservation on save failure
         * For any save operation that fails, any backup created before the save should still exist and be valid.
         * Validates: Requirements 19.4
         */
        describe("Property 13: Backup preservation on save failure", () => {
            it("should preserve backup when subsequent operations fail", async () => {
                // Run property test with 20 iterations (reduced for performance)
                for (let i = 0; i < 20; i++) {
                    const adapter = new MockDataAdapter();
                    const backupManager = new BackupManager(adapter as any, 5);
                    const filePath = `test-preserve-${i}.json`;
                    const originalData = generateRandomData();

                    // Setup: create initial file
                    await adapter.write(filePath, originalData);

                    // Execute: create backup
                    await backupManager.createBackup(filePath);

                    // Get backup file
                    const files = adapter.getAllFiles();
                    const backupFiles = files.filter((f) =>
                        f.includes(`${filePath}.backup.`),
                    );
                    expect(backupFiles.length).toBe(1);
                    const backupFile = backupFiles[0];

                    // Simulate a failed save by corrupting the original file
                    await adapter.write(filePath, "corrupted data");

                    // Verify: backup still exists
                    const backupExists = await adapter.exists(backupFile);
                    expect(backupExists).toBe(true);

                    // Verify: backup contains original data
                    const backupData = await adapter.read(backupFile);
                    expect(backupData).toBe(originalData);

                    // Verify: backup is valid and can be read
                    expect(backupData.length).toBeGreaterThan(0);
                }
            });
        });

        /**
         * Property 14: Backup restoration round-trip
         * For any valid backup file, restoring from the backup should produce data
         * equivalent to the data that was backed up.
         * Validates: Requirements 19.5
         */
        describe("Property 14: Backup restoration round-trip", () => {
            it("should restore exact data from backup (round-trip)", async () => {
                // Run property test with 20 iterations (reduced for performance)
                for (let i = 0; i < 20; i++) {
                    const adapter = new MockDataAdapter();
                    const backupManager = new BackupManager(adapter as any, 5);
                    const filePath = `test-roundtrip-${i}.json`;
                    const originalData = generateRandomData();

                    // Setup: create initial file with original data
                    await adapter.write(filePath, originalData);

                    // Execute: create backup
                    await backupManager.createBackup(filePath);

                    // Get backup file
                    const files = adapter.getAllFiles();
                    const backupFiles = files.filter((f) =>
                        f.includes(`${filePath}.backup.`),
                    );
                    expect(backupFiles.length).toBe(1);
                    const backupFile = backupFiles[0];

                    // Modify original file
                    const modifiedData = generateRandomData();
                    await adapter.write(filePath, modifiedData);

                    // Execute: restore from backup
                    await backupManager.restore(filePath, backupFile);

                    // Verify: restored data equals original data (round-trip)
                    const restoredData = await adapter.read(filePath);
                    expect(restoredData).toBe(originalData);

                    // Verify: data integrity - if original was valid JSON, restored should be too
                    if (isValidJSON(originalData)) {
                        expect(isValidJSON(restoredData)).toBe(true);
                        const originalParsed = JSON.parse(originalData);
                        const restoredParsed = JSON.parse(restoredData);
                        expect(JSON.stringify(restoredParsed)).toBe(
                            JSON.stringify(originalParsed),
                        );
                    }
                }
            });
        });
    });
});

// Helper functions for property-based testing

/**
 * Generates random JSON data for testing
 */
function generateRandomData(): string {
    const types = ["simple", "nested", "array", "mixed"];
    const type = types[Math.floor(Math.random() * types.length)];

    switch (type) {
        case "simple":
            return JSON.stringify({
                id: Math.floor(Math.random() * 10000),
                name: `test-${Math.random().toString(36).substring(7)}`,
                value: Math.random() * 1000,
            });
        case "nested":
            return JSON.stringify({
                items: [
                    { id: Math.floor(Math.random() * 100), data: "test" },
                    { id: Math.floor(Math.random() * 100), data: "test2" },
                ],
                trackedFiles: [
                    { path: `file-${Math.random()}.md`, tracked: true },
                ],
                metadata: {
                    version: Math.floor(Math.random() * 10),
                    timestamp: Date.now(),
                },
            });
        case "array":
            return JSON.stringify(
                Array.from({ length: Math.floor(Math.random() * 50) + 1 }, () => ({
                    id: Math.floor(Math.random() * 1000),
                    value: Math.random(),
                })),
            );
        case "mixed":
            return JSON.stringify({
                string: Math.random().toString(36),
                number: Math.random() * 1000,
                boolean: Math.random() > 0.5,
                null: null,
                array: [1, 2, 3, Math.random()],
                object: { nested: true, value: Math.random() },
            });
        default:
            return JSON.stringify({ test: "data" });
    }
}

/**
 * Checks if a string is valid JSON
 */
function isValidJSON(str: string): boolean {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}
