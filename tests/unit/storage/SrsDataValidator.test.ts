import { describe, it, expect } from "bun:test";
import { SrsDataValidator } from "../../../src/core/storage/SrsDataValidator";

describe("SrsDataValidator", () => {
    const validator = new SrsDataValidator();

    describe("validate", () => {
        it("should validate valid data successfully", () => {
            const validData = {
                items: [
                    {
                        ID: 1,
                        fileIndex: 0,
                        nextReview: Date.now(),
                        itemType: "note",
                        deckName: "default",
                        timesReviewed: 0,
                        timesCorrect: 0,
                        errorStreak: 0,
                        data: {},
                    },
                ],
                trackedFiles: [
                    {
                        path: "test.md",
                        items: {},
                        tags: ["note", "default"],
                    },
                ],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const result = validator.validate(validData);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it("should detect missing items array", () => {
            const invalidData = {
                trackedFiles: [],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const result = validator.validate(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].field).toBe("items");
            expect(result.errors[0].message).toContain("Missing or invalid items array");
        });

        it("should detect missing trackedFiles array", () => {
            const invalidData = {
                items: [],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const result = validator.validate(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].field).toBe("trackedFiles");
            expect(result.errors[0].message).toContain(
                "Missing or invalid trackedFiles array",
            );
        });

        it("should detect invalid nextReview timestamp (too far in future)", () => {
            const farFutureTimestamp = Date.now() + 20 * 365 * 24 * 60 * 60 * 1000; // 20 years

            const invalidData = {
                items: [
                    {
                        ID: 1,
                        fileIndex: 0,
                        nextReview: farFutureTimestamp,
                        itemType: "note",
                        deckName: "default",
                        timesReviewed: 0,
                        timesCorrect: 0,
                        errorStreak: 0,
                        data: {},
                    },
                ],
                trackedFiles: [
                    {
                        path: "test.md",
                        items: {},
                        tags: ["note", "default"],
                    },
                ],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const result = validator.validate(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].field).toBe("items[0].nextReview");
            expect(result.errors[0].message).toContain("too far in future");
        });

        it("should detect invalid fileIndex reference", () => {
            const invalidData = {
                items: [
                    {
                        ID: 1,
                        fileIndex: 5, // Out of bounds
                        nextReview: Date.now(),
                        itemType: "note",
                        deckName: "default",
                        timesReviewed: 0,
                        timesCorrect: 0,
                        errorStreak: 0,
                        data: {},
                    },
                ],
                trackedFiles: [
                    {
                        path: "test.md",
                        items: {},
                        tags: ["note", "default"],
                    },
                ],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const result = validator.validate(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].field).toBe("items[0].fileIndex");
            expect(result.errors[0].message).toContain("out of bounds");
        });

        it("should detect invalid FSRS due date", () => {
            const farFutureTimestamp = Date.now() + 20 * 365 * 24 * 60 * 60 * 1000;

            const invalidData = {
                items: [
                    {
                        ID: 1,
                        fileIndex: 0,
                        nextReview: Date.now(),
                        itemType: "note",
                        deckName: "default",
                        timesReviewed: 0,
                        timesCorrect: 0,
                        errorStreak: 0,
                        data: {
                            state: 2, // FSRS indicator
                            due: new Date(farFutureTimestamp),
                            last_review: new Date(),
                        },
                    },
                ],
                trackedFiles: [
                    {
                        path: "test.md",
                        items: {},
                        tags: ["note", "default"],
                    },
                ],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const result = validator.validate(invalidData);

            expect(result.valid).toBe(false);
            const fsrsError = result.errors.find((e) => e.field.includes("data.due"));
            expect(fsrsError).toBeDefined();
            expect(fsrsError?.message).toContain("too far in future");
        });
    });

    describe("autoFix", () => {
        it("should fix invalid nextReview timestamp", () => {
            const farFutureTimestamp = Date.now() + 20 * 365 * 24 * 60 * 60 * 1000;

            const invalidData = {
                items: [
                    {
                        ID: 1,
                        fileIndex: 0,
                        nextReview: farFutureTimestamp,
                        itemType: "note",
                        deckName: "default",
                        timesReviewed: 0,
                        timesCorrect: 0,
                        errorStreak: 0,
                        data: {},
                    },
                ],
                trackedFiles: [
                    {
                        path: "test.md",
                        items: {},
                        tags: ["note", "default"],
                    },
                ],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const validation = validator.validate(invalidData);
            const fixed = validator.autoFix(invalidData, validation.errors);

            expect(fixed.items[0].nextReview).toBeLessThan(farFutureTimestamp);
            expect(fixed.items[0].nextReview).toBeGreaterThan(Date.now() - 1000);
        });

        it("should fix invalid fileIndex by marking as untracked", () => {
            const invalidData = {
                items: [
                    {
                        ID: 1,
                        fileIndex: 5,
                        nextReview: Date.now(),
                        itemType: "note",
                        deckName: "default",
                        timesReviewed: 0,
                        timesCorrect: 0,
                        errorStreak: 0,
                        data: {},
                    },
                ],
                trackedFiles: [
                    {
                        path: "test.md",
                        items: {},
                        tags: ["note", "default"],
                    },
                ],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const validation = validator.validate(invalidData);
            const fixed = validator.autoFix(invalidData, validation.errors);

            expect(fixed.items[0].fileIndex).toBe(-1);
        });

        it("should ensure required fields exist when missing", () => {
            const invalidData = {
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const validation = validator.validate(invalidData);
            const fixed = validator.autoFix(invalidData, validation.errors);

            expect(Array.isArray(fixed.items)).toBe(true);
            expect(Array.isArray(fixed.trackedFiles)).toBe(true);
        });

        it("should not mutate original data", () => {
            const farFutureTimestamp = Date.now() + 20 * 365 * 24 * 60 * 60 * 1000;

            const invalidData = {
                items: [
                    {
                        ID: 1,
                        fileIndex: 0,
                        nextReview: farFutureTimestamp,
                        itemType: "note",
                        deckName: "default",
                        timesReviewed: 0,
                        timesCorrect: 0,
                        errorStreak: 0,
                        data: {},
                    },
                ],
                trackedFiles: [
                    {
                        path: "test.md",
                        items: {},
                        tags: ["note", "default"],
                    },
                ],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const originalNextReview = invalidData.items[0].nextReview;
            const validation = validator.validate(invalidData);
            validator.autoFix(invalidData, validation.errors);

            // Original data should remain unchanged
            expect(invalidData.items[0].nextReview).toBe(originalNextReview);
        });

        it("should fix invalid FSRS due date", () => {
            const farFutureTimestamp = Date.now() + 20 * 365 * 24 * 60 * 60 * 1000;

            const invalidData = {
                items: [
                    {
                        ID: 1,
                        fileIndex: 0,
                        nextReview: Date.now(),
                        itemType: "note",
                        deckName: "default",
                        timesReviewed: 0,
                        timesCorrect: 0,
                        errorStreak: 0,
                        data: {
                            state: 2,
                            due: new Date(farFutureTimestamp),
                            last_review: new Date(),
                        },
                    },
                ],
                trackedFiles: [
                    {
                        path: "test.md",
                        items: {},
                        tags: ["note", "default"],
                    },
                ],
                queues: {},
                reviewedCounts: {},
                reviewedCardCounts: {},
                mtime: 0,
            };

            const validation = validator.validate(invalidData);
            const fixed = validator.autoFix(invalidData, validation.errors);

            const fixedDue = (fixed.items[0].data as any).due;
            expect(fixedDue.valueOf()).toBeLessThan(farFutureTimestamp);
            expect(fixedDue.valueOf()).toBeGreaterThan(Date.now() - 1000);
        });
    });
});
