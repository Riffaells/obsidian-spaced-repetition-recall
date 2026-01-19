// import { describe, it, expect } from "bun:test";
// import { SrsDataMigrator } from "../../../src/core/storage/SrsDataMigrator";
// import { MigrationError } from "../../../src/core/infrastructure/errors";

// /**
//  * Property-based tests for SrsDataMigrator
//  * Feature: data-storage-improvements
//  */
// describe("SrsDataMigrator", () => {
//     const migrator = new SrsDataMigrator();

//     describe("getCurrentVersion", () => {
//         it("should return the current schema version", () => {
//             const version = migrator.getCurrentVersion();
//             expect(version).toBe(2);
//             expect(typeof version).toBe("number");
//         });
//     });

//     describe("Property 8: Schema migration application", () => {
//         /**
//          * Feature: data-storage-improvements, Property 8: Schema migration application
//          * For any data with schema version less than current version,
//          * loading the data should apply all migrations from the data's version
//          * to the current version in sequential order.
//          * Validates: Requirements 3.2, 3.3
//          */

//         it("should not migrate data already at current version", async () => {
//             const currentData = {
//                 version: 2,
//                 items: [
//                     {
//                         ID: 1,
//                         fileIndex: 0,
//                         itemType: "note",
//                         deckName: "default",
//                     },
//                 ],
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(currentData);

//             expect(migrated.version).toBe(2);
//             expect(migrated.items[0].itemType).toBe("note");
//             expect(migrated.items[0].deckName).toBe("default");
//         });

//         it("should migrate from version 0 to current version", async () => {
//             const v0Data = {
//                 version: 0,
//                 items: [
//                     {
//                         ID: 1,
//                         fileIndex: 0,
//                         // No itemType field
//                         deck: "custom", // Old field name
//                     },
//                     {
//                         ID: 2,
//                         fileIndex: 1,
//                         // No itemType field
//                         // No deck/deckName field
//                     },
//                 ],
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(v0Data);

//             // Should be at current version
//             expect(migrated.version).toBe(2);

//             // v0->v1: Should add itemType
//             expect(migrated.items[0].itemType).toBe("note");
//             expect(migrated.items[1].itemType).toBe("note");

//             // v1->v2: Should normalize deckName
//             expect(migrated.items[0].deckName).toBe("custom");
//             expect(migrated.items[1].deckName).toBe("default");

//             // v1->v2: Should remove old 'deck' field
//             expect(migrated.items[0]).not.toHaveProperty("deck");
//         });

//         it("should migrate from version 1 to current version", async () => {
//             const v1Data = {
//                 version: 1,
//                 items: [
//                     {
//                         ID: 1,
//                         fileIndex: 0,
//                         itemType: "note",
//                         deck: "custom", // Old field name
//                     },
//                     {
//                         ID: 2,
//                         fileIndex: 1,
//                         itemType: "card",
//                         deckName: "existing", // Already has deckName
//                     },
//                 ],
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(v1Data);

//             // Should be at current version
//             expect(migrated.version).toBe(2);

//             // v1->v2: Should normalize deckName
//             expect(migrated.items[0].deckName).toBe("custom");
//             expect(migrated.items[1].deckName).toBe("existing");

//             // v1->v2: Should remove old 'deck' field
//             expect(migrated.items[0]).not.toHaveProperty("deck");
//         });

//         it("should apply migrations sequentially in order", async () => {
//             const v0Data = {
//                 version: 0,
//                 items: [
//                     {
//                         ID: 1,
//                         fileIndex: 0,
//                         // Missing itemType (added in v1)
//                         deck: "test", // Renamed in v2
//                     },
//                 ],
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(v0Data);

//             // Both migrations should have been applied
//             expect(migrated.items[0].itemType).toBe("note"); // From v0->v1
//             expect(migrated.items[0].deckName).toBe("test"); // From v1->v2
//             expect(migrated.items[0]).not.toHaveProperty("deck"); // Cleaned up in v1->v2
//         });

//         it("should handle data with no version field (defaults to 0)", async () => {
//             const unversionedData = {
//                 // No version field
//                 items: [
//                     {
//                         ID: 1,
//                         fileIndex: 0,
//                     },
//                 ],
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(unversionedData);

//             expect(migrated.version).toBe(2);
//             expect(migrated.items[0].itemType).toBe("note");
//             expect(migrated.items[0].deckName).toBe("default");
//         });

//         it("should handle empty items array", async () => {
//             const emptyData = {
//                 version: 0,
//                 items: [],
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(emptyData);

//             expect(migrated.version).toBe(2);
//             expect(migrated.items).toEqual([]);
//         });

//         it("should handle missing items array", async () => {
//             const noItemsData = {
//                 version: 0,
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(noItemsData);

//             expect(migrated.version).toBe(2);
//             expect(migrated.items).toEqual([]);
//         });

//         it("should preserve other fields during migration", async () => {
//             const dataWithExtraFields = {
//                 version: 0,
//                 items: [
//                     {
//                         ID: 1,
//                         fileIndex: 0,
//                         nextReview: 123456789,
//                         timesReviewed: 5,
//                         data: { some: "data" },
//                     },
//                 ],
//                 trackedFiles: [{ path: "test.md" }],
//                 queues: { some: "queue" },
//                 reviewedCounts: { "2024-01-01": { new: 1, due: 2 } },
//                 mtime: 999999,
//             };

//             const migrated = await migrator.migrate(dataWithExtraFields);

//             // Original fields should be preserved
//             expect(migrated.items[0].ID).toBe(1);
//             expect(migrated.items[0].fileIndex).toBe(0);
//             expect(migrated.items[0].nextReview).toBe(123456789);
//             expect(migrated.items[0].timesReviewed).toBe(5);
//             expect(migrated.items[0].data).toEqual({ some: "data" });
//             expect(migrated.trackedFiles).toEqual([{ path: "test.md" }]);
//             expect(migrated.queues).toEqual({ some: "queue" });
//             expect(migrated.reviewedCounts).toEqual({ "2024-01-01": { new: 1, due: 2 } });
//             expect(migrated.mtime).toBe(999999);
//         });
//     });

//     describe("Property 9: Migration failure safety", () => {
//         /**
//          * Feature: data-storage-improvements, Property 9: Migration failure safety
//          * For any migration that fails, the original data should remain unchanged
//          * and an error should be returned.
//          * Validates: Requirements 3.4
//          */

//         it("should throw MigrationError when data version is newer than current", async () => {
//             const futureData = {
//                 version: 999,
//                 items: [],
//                 trackedFiles: [],
//             };

//             await expect(migrator.migrate(futureData)).rejects.toThrow(MigrationError);
//             await expect(migrator.migrate(futureData)).rejects.toThrow(
//                 "Data version 999 is newer than current version 2",
//             );
//         });

//         it("should include version information in MigrationError", async () => {
//             const futureData = {
//                 version: 10,
//                 items: [],
//                 trackedFiles: [],
//             };

//             try {
//                 await migrator.migrate(futureData);
//                 expect(true).toBe(false); // Should not reach here
//             } catch (error) {
//                 expect(error).toBeInstanceOf(MigrationError);
//                 expect((error as MigrationError).fromVersion).toBe(10);
//                 expect((error as MigrationError).toVersion).toBe(2);
//             }
//         });

//         it("should not mutate original data on successful migration", async () => {
//             const originalData = {
//                 version: 0,
//                 items: [
//                     {
//                         ID: 1,
//                         fileIndex: 0,
//                         deck: "test",
//                     },
//                 ],
//                 trackedFiles: [],
//             };

//             // Deep clone to compare later
//             const originalDataCopy = JSON.parse(JSON.stringify(originalData));

//             await migrator.migrate(originalData);

//             // Original data should remain unchanged
//             expect(originalData).toEqual(originalDataCopy);
//         });

//         it("should handle migration errors gracefully", async () => {
//             // Create data that might cause issues during migration
//             const problematicData = {
//                 version: 0,
//                 items: null, // This could cause issues
//                 trackedFiles: [],
//             };

//             try {
//                 await migrator.migrate(problematicData);
//                 // If it doesn't throw, it should handle gracefully
//                 expect(true).toBe(true);
//             } catch (error) {
//                 // If it throws, it should be a MigrationError
//                 expect(error).toBeInstanceOf(MigrationError);
//             }
//         });
//     });

//     describe("Property 10: Schema version persistence", () => {
//         /**
//          * Feature: data-storage-improvements, Property 10: Schema version persistence
//          * For any data saved to storage, the saved data should contain a version field
//          * set to the current schema version.
//          * Validates: Requirements 3.5
//          */

//         it("should set version field to current version after migration", async () => {
//             const v0Data = {
//                 version: 0,
//                 items: [],
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(v0Data);

//             expect(migrated.version).toBe(migrator.getCurrentVersion());
//             expect(migrated.version).toBe(2);
//         });

//         it("should update version field even if already present", async () => {
//             const v1Data = {
//                 version: 1,
//                 items: [],
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(v1Data);

//             expect(migrated.version).toBe(2);
//         });

//         it("should add version field if missing", async () => {
//             const unversionedData = {
//                 items: [],
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(unversionedData);

//             expect(migrated).toHaveProperty("version");
//             expect(migrated.version).toBe(2);
//         });

//         it("should maintain version field across multiple migrations", async () => {
//             const v0Data = {
//                 version: 0,
//                 items: [{ ID: 1, fileIndex: 0 }],
//                 trackedFiles: [],
//             };

//             const migrated = await migrator.migrate(v0Data);

//             // Version should be set after all migrations
//             expect(migrated.version).toBe(2);

//             // Migrating again should keep the version
//             const migratedAgain = await migrator.migrate(migrated);
//             expect(migratedAgain.version).toBe(2);
//         });
//     });

//     describe("Migration specifics", () => {
//         describe("v0 -> v1: Add itemType field", () => {
//             it("should add itemType='note' to items without itemType", async () => {
//                 const v0Data = {
//                     version: 0,
//                     items: [
//                         { ID: 1, fileIndex: 0 },
//                         { ID: 2, fileIndex: 1 },
//                     ],
//                     trackedFiles: [],
//                 };

//                 const migrated = await migrator.migrate(v0Data);

//                 expect(migrated.items[0].itemType).toBe("note");
//                 expect(migrated.items[1].itemType).toBe("note");
//             });

//             it("should preserve existing itemType if present", async () => {
//                 const v0Data = {
//                     version: 0,
//                     items: [
//                         { ID: 1, fileIndex: 0, itemType: "card" },
//                         { ID: 2, fileIndex: 1 },
//                     ],
//                     trackedFiles: [],
//                 };

//                 const migrated = await migrator.migrate(v0Data);

//                 expect(migrated.items[0].itemType).toBe("card");
//                 expect(migrated.items[1].itemType).toBe("note");
//             });
//         });

//         describe("v1 -> v2: Normalize deckName field", () => {
//             it("should rename 'deck' field to 'deckName'", async () => {
//                 const v1Data = {
//                     version: 1,
//                     items: [{ ID: 1, fileIndex: 0, itemType: "note", deck: "custom" }],
//                     trackedFiles: [],
//                 };

//                 const migrated = await migrator.migrate(v1Data);

//                 expect(migrated.items[0].deckName).toBe("custom");
//                 expect(migrated.items[0]).not.toHaveProperty("deck");
//             });

//             it("should use 'default' if neither deck nor deckName exists", async () => {
//                 const v1Data = {
//                     version: 1,
//                     items: [{ ID: 1, fileIndex: 0, itemType: "note" }],
//                     trackedFiles: [],
//                 };

//                 const migrated = await migrator.migrate(v1Data);

//                 expect(migrated.items[0].deckName).toBe("default");
//             });

//             it("should preserve existing deckName over deck field", async () => {
//                 const v1Data = {
//                     version: 1,
//                     items: [
//                         {
//                             ID: 1,
//                             fileIndex: 0,
//                             itemType: "note",
//                             deck: "old",
//                             deckName: "new",
//                         },
//                     ],
//                     trackedFiles: [],
//                 };

//                 const migrated = await migrator.migrate(v1Data);

//                 expect(migrated.items[0].deckName).toBe("new");
//                 expect(migrated.items[0]).not.toHaveProperty("deck");
//             });
//         });
//     });
// });
