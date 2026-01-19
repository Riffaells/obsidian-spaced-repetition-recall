// import { describe, it, expect, beforeEach } from "bun:test";
// import { JsonStorage } from "../../../src/core/storage/JsonStorage";
// import { SrsDataValidator } from "../../../src/core/storage/SrsDataValidator";
// import { SrsDataMigrator } from "../../../src/core/storage/SrsDataMigrator";
// import { BackupManager } from "../../../src/core/storage/BackupManager";
// import { SrsData } from "../../../src/dataStore/interfaces";
// import { RPITEMTYPE } from "../../../src/dataStore/repetitionItem";

// /**
//  * Mock DataAdapter for testing backward compatibility.
//  * Simulates file system operations in memory.
//  */
// class MockDataAdapter {
//     private files: Map<string, string> = new Map();

//     async read(path: string): Promise<string> {
//         const data = this.files.get(path);
//         if (data === undefined) {
//             throw new Error(`File not found: ${path}`);
//         }
//         return data;
//     }

//     async write(path: string, data: string): Promise<void> {
//         this.files.set(path, data);
//     }

//     async exists(path: string): Promise<boolean> {
//         return this.files.has(path);
//     }

//     async remove(path: string): Promise<void> {
//         this.files.delete(path);
//     }

//     async list(dirPath: string): Promise<{ files: string[]; folders: string[] }> {
//         const files: string[] = [];
//         const folders: string[] = [];

//         for (const path of this.files.keys()) {
//             const dir = this.getDirectoryPath(path);
//             if (dir === dirPath || (dirPath === "" && !path.includes("/"))) {
//                 files.push(path);
//             }
//         }

//         return { files, folders };
//     }

//     private getDirectoryPath(path: string): string {
//         const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
//         return lastSlash >= 0 ? path.substring(0, lastSlash) : "";
//     }

//     clear(): void {
//         this.files.clear();
//     }
// }

// describe("Backward Compatibility - Old DataStore Format", () => {
//     let adapter: MockDataAdapter;
//     let validator: SrsDataValidator;
//     let migrator: SrsDataMigrator;
//     let backupManager: BackupManager;
//     let storage: JsonStorage<SrsData>;
//     const testPath = "data.json";

//     beforeEach(() => {
//         adapter = new MockDataAdapter();
//         validator = new SrsDataValidator();
//         migrator = new SrsDataMigrator();
//         backupManager = new BackupManager(adapter as any, 5);
//         storage = new JsonStorage<SrsData>(
//             adapter as any,
//             testPath,
//             validator,
//             migrator,
//             backupManager,
//         );
//     });

//     describe("Reading old DataStore format", () => {
//         it("should read old format with no version field", async () => {
//             // Setup: Create data in old format (no version field)
//             const oldFormatData = {
//                 queues: {
//                     newQueue: [],
//                     dueQueue: [],
//                     repeatQueue: [],
//                 },
//                 reviewedCounts: {},
//                 reviewedCardCounts: {},
//                 items: [
//                     {
//                         ID: 1,
//                         fileIndex: 0,
//                         nextReview: Date.now() + 24 * 60 * 60 * 1000,
//                         timesReviewed: 5,
//                         timesCorrect: 4,
//                         errorStreak: 0,
//                         deckName: "default",
//                         data: {
//                             ease: 250,
//                             lastInterval: 3,
//                         },
//                     },
//                 ],
//                 trackedFiles: [
//                     {
//                         path: "test-note.md",
//                         items: { file: 1 },
//                         tags: ["note", "default"],
//                     },
//                 ],
//                 mtime: Date.now(),
//             };

//             await adapter.write(testPath, JSON.stringify(oldFormatData));

//             // Execute: Read data with new system
//             const result = await storage.read();

//             // Verify: Successfully read and migrated
//             expect(result.isOk).toBe(true);
//             if (result.isOk) {
//                 const data = result.value;

//                 // Verify version was added
//                 expect(data.version).toBe(2);

//                 // Verify items were preserved
//                 expect(data.items.length).toBe(1);
//                 expect(data.items[0].ID).toBe(1);
//                 expect(data.items[0].fileIndex).toBe(0);
//                 expect(data.items[0].timesReviewed).toBe(5);
//                 expect(data.items[0].deckName).toBe("default");

//                 // Verify itemType was added by migration
//                 expect(data.items[0].itemType).toBeDefined();

//                 // Verify tracked files were preserved
//                 expect(data.trackedFiles.length).toBe(1);
//                 expect(data.trackedFiles[0].path).toBe("test-note.md");

//                 // Verify queues were preserved
//                 expect(data.queues).toBeDefined();
//             }
//         });

//         it("should read old format with FSRS data", async () => {
//             // Setup: Create data with FSRS algorithm data
//             const oldFormatFsrsData = {
//                 queues: {
//                     newQueue: [],
//                     dueQueue: [2],
//                     repeatQueue: [],
//                 },
//                 reviewedCounts: {},
//                 reviewedCardCounts: {},
//                 items: [
//                     {
//                         ID: 2,
//                         fileIndex: 0,
//                         nextReview: Date.now() + 48 * 60 * 60 * 1000,
//                         timesReviewed: 3,
//                         timesCorrect: 3,
//                         errorStreak: 0,
//                         deckName: "math",
//                         data: {
//                             state: 2, // FSRS state
//                             difficulty: 5.5,
//                             stability: 10.2,
//                             scheduled_days: 2,
//                             due: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
//                             last_review: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
//                         },
//                     },
//                 ],
//                 trackedFiles: [
//                     {
//                         path: "math/algebra.md",
//                         items: { file: 2 },
//                         tags: ["note", "math"],
//                     },
//                 ],
//                 mtime: Date.now(),
//             };

//             await adapter.write(testPath, JSON.stringify(oldFormatFsrsData));

//             // Execute: Read data
//             const result = await storage.read();

//             // Verify: Successfully read FSRS data
//             expect(result.isOk).toBe(true);
//             if (result.isOk) {
//                 const data = result.value;

//                 expect(data.items.length).toBe(1);
//                 expect(data.items[0].ID).toBe(2);
//                 expect(data.items[0].deckName).toBe("math");

//                 // Verify FSRS data structure
//                 const fsrsData = data.items[0].data as any;
//                 expect(fsrsData.state).toBe(2);
//                 expect(fsrsData.difficulty).toBe(5.5);
//                 expect(fsrsData.stability).toBe(10.2);
//                 expect(fsrsData.scheduled_days).toBe(2);
//             }
//         });

//         it("should read old format with flashcard data", async () => {
//             // Setup: Create data with flashcards
//             const oldFormatCardData = {
//                 queues: {
//                     newQueue: [3, 4],
//                     dueQueue: [],
//                     repeatQueue: [],
//                 },
//                 reviewedCounts: {},
//                 reviewedCardCounts: {},
//                 items: [
//                     {
//                         ID: 3,
//                         fileIndex: 0,
//                         itemType: RPITEMTYPE.CARD,
//                         nextReview: 0,
//                         timesReviewed: 0,
//                         timesCorrect: 0,
//                         errorStreak: 0,
//                         deckName: "vocabulary",
//                         data: {
//                             ease: 250,
//                             lastInterval: 0,
//                         },
//                     },
//                     {
//                         ID: 4,
//                         fileIndex: 0,
//                         itemType: RPITEMTYPE.CARD,
//                         nextReview: 0,
//                         timesReviewed: 0,
//                         timesCorrect: 0,
//                         errorStreak: 0,
//                         deckName: "vocabulary",
//                         data: {
//                             ease: 250,
//                             lastInterval: 0,
//                         },
//                     },
//                 ],
//                 trackedFiles: [
//                     {
//                         path: "vocabulary/words.md",
//                         items: { file: -1 },
//                         cardItems: [
//                             {
//                                 lineNo: 10,
//                                 cardTextHash: "hash1",
//                                 itemIds: [3],
//                             },
//                             {
//                                 lineNo: 15,
//                                 cardTextHash: "hash2",
//                                 itemIds: [4],
//                             },
//                         ],
//                         tags: ["card"],
//                     },
//                 ],
//                 mtime: Date.now(),
//             };

//             await adapter.write(testPath, JSON.stringify(oldFormatCardData));

//             // Execute: Read data
//             const result = await storage.read();

//             // Verify: Successfully read card data
//             expect(result.isOk).toBe(true);
//             if (result.isOk) {
//                 const data = result.value;

//                 expect(data.items.length).toBe(2);
//                 expect(data.items[0].itemType).toBe(RPITEMTYPE.CARD);
//                 expect(data.items[1].itemType).toBe(RPITEMTYPE.CARD);

//                 // Verify tracked file has card items
//                 expect(data.trackedFiles[0].cardItems).toBeDefined();
//                 expect(data.trackedFiles[0].cardItems!.length).toBe(2);
//                 expect(data.trackedFiles[0].cardItems![0].lineNo).toBe(10);
//                 expect(data.trackedFiles[0].cardItems![1].lineNo).toBe(15);
//             }
//         });

//         it("should read old format with multiple tracked files", async () => {
//             // Setup: Create data with multiple files
//             const oldFormatMultiFile = {
//                 queues: {
//                     newQueue: [],
//                     dueQueue: [5, 6, 7],
//                     repeatQueue: [],
//                 },
//                 reviewedCounts: {
//                     "2024-01-15": { new: 5, due: 10 },
//                     "2024-01-16": { new: 3, due: 8 },
//                 },
//                 reviewedCardCounts: {
//                     "2024-01-15": { new: 2, due: 5 },
//                 },
//                 items: [
//                     {
//                         ID: 5,
//                         fileIndex: 0,
//                         itemType: RPITEMTYPE.NOTE,
//                         nextReview: Date.now() - 1000,
//                         timesReviewed: 10,
//                         timesCorrect: 8,
//                         errorStreak: 0,
//                         deckName: "history",
//                         data: { ease: 270, lastInterval: 7 },
//                     },
//                     {
//                         ID: 6,
//                         fileIndex: 1,
//                         itemType: RPITEMTYPE.NOTE,
//                         nextReview: Date.now() - 2000,
//                         timesReviewed: 5,
//                         timesCorrect: 4,
//                         errorStreak: 1,
//                         deckName: "science",
//                         data: { ease: 240, lastInterval: 3 },
//                     },
//                     {
//                         ID: 7,
//                         fileIndex: 2,
//                         itemType: RPITEMTYPE.NOTE,
//                         nextReview: Date.now() - 3000,
//                         timesReviewed: 15,
//                         timesCorrect: 14,
//                         errorStreak: 0,
//                         deckName: "literature",
//                         data: { ease: 290, lastInterval: 14 },
//                     },
//                 ],
//                 trackedFiles: [
//                     {
//                         path: "history/world-war-2.md",
//                         items: { file: 5 },
//                         tags: ["note", "history"],
//                     },
//                     {
//                         path: "science/physics.md",
//                         items: { file: 6 },
//                         tags: ["note", "science"],
//                     },
//                     {
//                         path: "literature/shakespeare.md",
//                         items: { file: 7 },
//                         tags: ["note", "literature"],
//                     },
//                 ],
//                 mtime: Date.now(),
//             };

//             await adapter.write(testPath, JSON.stringify(oldFormatMultiFile));

//             // Execute: Read data
//             const result = await storage.read();

//             // Verify: Successfully read all files
//             expect(result.isOk).toBe(true);
//             if (result.isOk) {
//                 const data = result.value;

//                 expect(data.items.length).toBe(3);
//                 expect(data.trackedFiles.length).toBe(3);

//                 // Verify all items have correct file indices
//                 expect(data.items[0].fileIndex).toBe(0);
//                 expect(data.items[1].fileIndex).toBe(1);
//                 expect(data.items[2].fileIndex).toBe(2);

//                 // Verify deck names
//                 expect(data.items[0].deckName).toBe("history");
//                 expect(data.items[1].deckName).toBe("science");
//                 expect(data.items[2].deckName).toBe("literature");

//                 // Verify reviewed counts preserved
//                 expect(data.reviewedCounts["2024-01-15"]).toBeDefined();
//                 expect(data.reviewedCounts["2024-01-15"].new).toBe(5);
//                 expect(data.reviewedCounts["2024-01-15"].due).toBe(10);
//             }
//         });

//         it("should handle old format with missing optional fields", async () => {
//             // Setup: Create minimal old format data (missing queues, reviewedCounts, etc.)
//             const minimalOldFormat = {
//                 items: [
//                     {
//                         ID: 8,
//                         fileIndex: 0,
//                         nextReview: Date.now(),
//                         timesReviewed: 1,
//                         data: {},
//                     },
//                 ],
//                 trackedFiles: [
//                     {
//                         path: "minimal.md",
//                         items: { file: 8 },
//                     },
//                 ],
//             };

//             await adapter.write(testPath, JSON.stringify(minimalOldFormat));

//             // Execute: Read data
//             const result = await storage.read();

//             // Verify: Successfully read
//             expect(result.isOk).toBe(true);
//             if (result.isOk) {
//                 const data = result.value;

//                 expect(data.items.length).toBe(1);
//                 expect(data.items[0].ID).toBe(8);

//                 // Note: The storage layer doesn't add default fields for missing optional fields
//                 // That's the responsibility of the application layer when using the data
//                 // The migration only handles schema version upgrades

//                 // Verify migration added missing required fields
//                 expect(data.items[0].itemType).toBeDefined();
//                 expect(data.items[0].deckName).toBeDefined();

//                 // Verify core data is intact
//                 expect(data.items[0].fileIndex).toBe(0);
//                 expect(data.items[0].timesReviewed).toBe(1);
//                 expect(data.trackedFiles[0].path).toBe("minimal.md");
//             }
//         });

//         it("should handle old format with corrupted data and auto-fix", async () => {
//             // Setup: Create old format with corrupted data
//             const corruptedOldFormat = {
//                 items: [
//                     {
//                         ID: 9,
//                         fileIndex: 999, // Invalid: out of bounds
//                         nextReview: Date.now() + 50 * 365 * 24 * 60 * 60 * 1000, // Invalid: too far in future
//                         timesReviewed: 2,
//                         deckName: "test",
//                         data: {},
//                     },
//                 ],
//                 trackedFiles: [
//                     {
//                         path: "test.md",
//                         items: { file: 9 },
//                         tags: ["note", "test"],
//                     },
//                 ],
//             };

//             await adapter.write(testPath, JSON.stringify(corruptedOldFormat));

//             // Execute: Read data
//             const result = await storage.read();

//             // Verify: Successfully read and auto-fixed
//             expect(result.isOk).toBe(true);
//             if (result.isOk) {
//                 const data = result.value;

//                 expect(data.items.length).toBe(1);

//                 // Verify auto-fix was applied
//                 expect(data.items[0].fileIndex).toBe(-1); // Fixed to untracked
//                 expect(data.items[0].nextReview).toBeLessThan(
//                     Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
//                 ); // Fixed to reasonable value
//             }
//         });

//         it("should preserve all data fields during migration", async () => {
//             // Setup: Create comprehensive old format data
//             const comprehensiveOldFormat = {
//                 queues: {
//                     newQueue: [10],
//                     dueQueue: [11],
//                     repeatQueue: [12],
//                 },
//                 reviewedCounts: {
//                     "2024-01-20": { new: 1, due: 2 },
//                 },
//                 reviewedCardCounts: {
//                     "2024-01-20": { new: 0, due: 1 },
//                 },
//                 items: [
//                     {
//                         ID: 10,
//                         fileIndex: 0,
//                         itemType: RPITEMTYPE.NOTE,
//                         nextReview: 0,
//                         timesReviewed: 0,
//                         timesCorrect: 0,
//                         errorStreak: 0,
//                         deckName: "comprehensive",
//                         data: { ease: 250, lastInterval: 0 },
//                     },
//                     {
//                         ID: 11,
//                         fileIndex: 0,
//                         itemType: RPITEMTYPE.CARD,
//                         nextReview: Date.now() - 1000,
//                         timesReviewed: 5,
//                         timesCorrect: 4,
//                         errorStreak: 1,
//                         deckName: "comprehensive",
//                         data: { ease: 260, lastInterval: 2 },
//                     },
//                     {
//                         ID: 12,
//                         fileIndex: 0,
//                         itemType: RPITEMTYPE.CARD,
//                         nextReview: Date.now() + 1000,
//                         timesReviewed: 3,
//                         timesCorrect: 2,
//                         errorStreak: 1,
//                         deckName: "comprehensive",
//                         data: { ease: 230, lastInterval: 1 },
//                     },
//                 ],
//                 trackedFiles: [
//                     {
//                         path: "comprehensive/test.md",
//                         items: { file: 10 },
//                         cardItems: [
//                             {
//                                 lineNo: 5,
//                                 cardTextHash: "hash_a",
//                                 blockID: "^block1",
//                                 itemIds: [11],
//                             },
//                             {
//                                 lineNo: 10,
//                                 cardTextHash: "hash_b",
//                                 itemIds: [12],
//                             },
//                         ],
//                         tags: ["note", "comprehensive"],
//                     },
//                 ],
//                 mtime: Date.now() - 5000,
//             };

//             await adapter.write(testPath, JSON.stringify(comprehensiveOldFormat));

//             // Execute: Read data
//             const result = await storage.read();

//             // Verify: All data preserved
//             expect(result.isOk).toBe(true);
//             if (result.isOk) {
//                 const data = result.value;

//                 // Verify items
//                 expect(data.items.length).toBe(3);
//                 expect(data.items[0].ID).toBe(10);
//                 expect(data.items[1].ID).toBe(11);
//                 expect(data.items[2].ID).toBe(12);

//                 // Verify item details
//                 expect(data.items[0].timesReviewed).toBe(0);
//                 expect(data.items[1].timesReviewed).toBe(5);
//                 expect(data.items[2].timesReviewed).toBe(3);

//                 expect(data.items[0].timesCorrect).toBe(0);
//                 expect(data.items[1].timesCorrect).toBe(4);
//                 expect(data.items[2].timesCorrect).toBe(2);

//                 expect(data.items[0].errorStreak).toBe(0);
//                 expect(data.items[1].errorStreak).toBe(1);
//                 expect(data.items[2].errorStreak).toBe(1);

//                 // Verify queues
//                 expect(data.queues.newQueue).toContain(10);
//                 expect(data.queues.dueQueue).toContain(11);
//                 expect(data.queues.repeatQueue).toContain(12);

//                 // Verify reviewed counts
//                 expect(data.reviewedCounts["2024-01-20"].new).toBe(1);
//                 expect(data.reviewedCounts["2024-01-20"].due).toBe(2);
//                 expect(data.reviewedCardCounts["2024-01-20"].due).toBe(1);

//                 // Verify tracked file details
//                 expect(data.trackedFiles[0].cardItems).toBeDefined();
//                 expect(data.trackedFiles[0].cardItems!.length).toBe(2);
//                 expect(data.trackedFiles[0].cardItems![0].blockID).toBe("^block1");
//             }
//         });
//     });

//     describe("Property-Based Tests for Backward Compatibility", () => {
//         /**
//          * Property 36: Read old DataStore format
//          * For any data in the old DataStore format (without version field),
//          * the new system should successfully read and migrate it.
//          * Validates: Requirements 16.1
//          */
//         describe("Property 36: Read old DataStore format", () => {
//             it("should read any valid old format data", async () => {
//                 // Run property test with 100 iterations
//                 for (let i = 0; i < 100; i++) {
//                     const adapter = new MockDataAdapter();
//                     const storage = new JsonStorage<SrsData>(
//                         adapter as any,
//                         `test-${i}.json`,
//                         validator,
//                         migrator,
//                         new BackupManager(adapter as any, 5),
//                     );

//                     // Generate random old format data (no version field)
//                     const oldFormatData = generateRandomOldFormatData(i);

//                     // Write old format data
//                     await adapter.write(`test-${i}.json`, JSON.stringify(oldFormatData));

//                     // Execute: Read with new system
//                     const result = await storage.read();

//                     // Verify: Successfully read
//                     expect(result.isOk).toBe(true);
//                     if (result.isOk) {
//                         const data = result.value;

//                         // Verify version was added
//                         expect(data.version).toBe(2);

//                         // Verify items were preserved
//                         expect(data.items.length).toBe(oldFormatData.items.length);

//                         // Verify all items have required fields after migration
//                         data.items.forEach((item) => {
//                             expect(item.itemType).toBeDefined();
//                             expect(item.deckName).toBeDefined();
//                         });

//                         // Verify tracked files were preserved
//                         expect(data.trackedFiles.length).toBe(oldFormatData.trackedFiles.length);
//                     }
//                 }
//             });
//         });

//         /**
//          * Property 37: Write compatible format
//          * For any SrsData, writing it should produce a format that can be read back
//          * by both the new system and (during migration phase) the old system.
//          * Validates: Requirements 16.2
//          */
//         describe("Property 37: Write compatible format", () => {
//             it("should write data that can be read back", async () => {
//                 // Run property test with 100 iterations
//                 for (let i = 0; i < 100; i++) {
//                     const adapter = new MockDataAdapter();
//                     const storage = new JsonStorage<SrsData>(
//                         adapter as any,
//                         `test-${i}.json`,
//                         validator,
//                         migrator,
//                         new BackupManager(adapter as any, 5),
//                     );

//                     // Generate random data
//                     const originalData = generateRandomSrsData(i);

//                     // Write data
//                     const writeResult = await storage.write(originalData);
//                     expect(writeResult.isOk).toBe(true);

//                     // Read it back
//                     const readResult = await storage.read();
//                     expect(readResult.isOk).toBe(true);

//                     if (readResult.isOk) {
//                         const readData = readResult.value;

//                         // Verify core data is preserved
//                         expect(readData.items.length).toBe(originalData.items.length);
//                         expect(readData.trackedFiles.length).toBe(originalData.trackedFiles.length);

//                         // Verify item IDs match
//                         readData.items.forEach((item, index) => {
//                             expect(item.ID).toBe(originalData.items[index].ID);
//                             expect(item.fileIndex).toBe(originalData.items[index].fileIndex);
//                             expect(item.deckName).toBe(originalData.items[index].deckName);
//                         });

//                         // Verify file paths match
//                         readData.trackedFiles.forEach((file, index) => {
//                             expect(file.path).toBe(originalData.trackedFiles[index].path);
//                         });
//                     }
//                 }
//             });
//         });

//         /**
//          * Property 38: Migration preserves data
//          * For any old format data, migrating it should preserve all user data
//          * (items, tracked files, review history) while only updating schema fields.
//          * Validates: Requirements 16.5
//          */
//         describe("Property 38: Migration preserves data", () => {
//             it("should preserve all user data during migration", async () => {
//                 // Run property test with 100 iterations
//                 for (let i = 0; i < 100; i++) {
//                     const adapter = new MockDataAdapter();
//                     const storage = new JsonStorage<SrsData>(
//                         adapter as any,
//                         `test-${i}.json`,
//                         validator,
//                         migrator,
//                         new BackupManager(adapter as any, 5),
//                     );

//                     // Generate random old format data
//                     const oldData = generateRandomOldFormatData(i);

//                     // Store original values for comparison
//                     const originalItemCount = oldData.items.length;
//                     const originalFileCount = oldData.trackedFiles.length;
//                     const originalItemIds = oldData.items.map((item: any) => item.ID);
//                     const originalFilePaths = oldData.trackedFiles.map((file: any) => file.path);
//                     const originalReviewCounts = oldData.items.map(
//                         (item: any) => item.timesReviewed,
//                     );

//                     // Write old format data
//                     await adapter.write(`test-${i}.json`, JSON.stringify(oldData));

//                     // Read and migrate
//                     const result = await storage.read();
//                     expect(result.isOk).toBe(true);

//                     if (result.isOk) {
//                         const migratedData = result.value;

//                         // Verify counts preserved
//                         expect(migratedData.items.length).toBe(originalItemCount);
//                         expect(migratedData.trackedFiles.length).toBe(originalFileCount);

//                         // Verify item IDs preserved
//                         const migratedItemIds = migratedData.items.map((item) => item.ID);
//                         expect(migratedItemIds).toEqual(originalItemIds);

//                         // Verify file paths preserved
//                         const migratedFilePaths = migratedData.trackedFiles.map(
//                             (file) => file.path,
//                         );
//                         expect(migratedFilePaths).toEqual(originalFilePaths);

//                         // Verify review history preserved
//                         const migratedReviewCounts = migratedData.items.map(
//                             (item) => item.timesReviewed,
//                         );
//                         expect(migratedReviewCounts).toEqual(originalReviewCounts);

//                         // Verify all items have required fields after migration
//                         migratedData.items.forEach((item, index) => {
//                             // Original data preserved
//                             expect(item.ID).toBe(oldData.items[index].ID);
//                             expect(item.fileIndex).toBe(oldData.items[index].fileIndex);
//                             expect(item.timesReviewed).toBe(oldData.items[index].timesReviewed);
//                             expect(item.timesCorrect).toBe(oldData.items[index].timesCorrect || 0);
//                             expect(item.errorStreak).toBe(oldData.items[index].errorStreak || 0);

//                             // Schema fields added
//                             expect(item.itemType).toBeDefined();
//                             expect(item.deckName).toBeDefined();
//                         });
//                     }
//                 }
//             });
//         });
//     });
// });

// // Helper functions for property-based testing

// /**
//  * Generates random old format SrsData (without version field)
//  */
// function generateRandomOldFormatData(seed: number): any {
//     const numItems = Math.floor((seed % 10) + 1);
//     const numFiles = Math.floor((seed % 5) + 1);

//     return {
//         // No version field (old format)
//         queues: {
//             newQueue: [],
//             dueQueue: [],
//             repeatQueue: [],
//         },
//         reviewedCounts: {},
//         reviewedCardCounts: {},
//         items: Array.from({ length: numItems }, (_, i) => ({
//             ID: seed * 100 + i,
//             fileIndex: i % numFiles,
//             nextReview: Date.now() + (seed % 30) * 24 * 60 * 60 * 1000,
//             timesReviewed: seed % 10,
//             timesCorrect: Math.floor((seed % 10) * 0.8),
//             errorStreak: seed % 3,
//             // Old format might have 'deck' instead of 'deckName'
//             deck: seed % 2 === 0 ? "deck-" + (seed % 5) : undefined,
//             deckName: seed % 2 === 1 ? "deck-" + (seed % 5) : undefined,
//             data: {
//                 ease: 250,
//                 lastInterval: seed % 7,
//             },
//         })),
//         trackedFiles: Array.from({ length: numFiles }, (_, i) => ({
//             path: `file-${seed}-${i}.md`,
//             items: { file: seed * 100 + i },
//             tags: ["note", "deck-" + (seed % 5)],
//         })),
//         mtime: Date.now(),
//     };
// }

// /**
//  * Generates random SrsData with current schema
//  */
// function generateRandomSrsData(seed: number): SrsData {
//     const numItems = Math.floor((seed % 10) + 1);
//     const numFiles = Math.floor((seed % 5) + 1);

//     return {
//         version: 2,
//         queues: {
//             newQueue: [],
//             dueQueue: [],
//             repeatQueue: [],
//         } as any,
//         reviewedCounts: {},
//         reviewedCardCounts: {},
//         items: Array.from({ length: numItems }, (_, i) => ({
//             ID: seed * 100 + i,
//             fileIndex: i % numFiles,
//             itemType: RPITEMTYPE.NOTE,
//             nextReview: Date.now() + (seed % 30) * 24 * 60 * 60 * 1000,
//             timesReviewed: seed % 10,
//             timesCorrect: Math.floor((seed % 10) * 0.8),
//             errorStreak: seed % 3,
//             deckName: "deck-" + (seed % 5),
//             data: {
//                 ease: 250,
//                 lastInterval: seed % 7,
//             },
//         })) as any,
//         trackedFiles: Array.from({ length: numFiles }, (_, i) => ({
//             path: `file-${seed}-${i}.md`,
//             items: { file: seed * 100 + i },
//             tags: ["note", "deck-" + (seed % 5)],
//         })) as any,
//         mtime: Date.now(),
//     };
// }
