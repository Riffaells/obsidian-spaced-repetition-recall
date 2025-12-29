import { IValidator, ValidationResult } from "./IValidator";
import { ValidationError } from "../infrastructure/errors";
import { SrsData } from "../../dataStore/interfaces";
import { RepetitionItem } from "../../dataStore/repetitionItem";
import { FsrsData } from "../../algorithms/fsrs";
import deepcopy from "deepcopy";

/**
 * Validator for SrsData structure.
 * Validates data integrity and automatically fixes common corruption issues.
 */
export class SrsDataValidator implements IValidator<SrsData> {
    private readonly MAX_FUTURE_YEARS = 10;

    /**
     * Validate SrsData structure against schema.
     * @param data - The data to validate
     * @returns ValidationResult indicating whether data is valid and any errors found
     */
    validate(data: any): ValidationResult {
        const errors: ValidationError[] = [];

        // Check required fields
        if (!data.items || !Array.isArray(data.items)) {
            errors.push(
                new ValidationError("items", "Missing or invalid items array"),
            );
        }

        if (!data.trackedFiles || !Array.isArray(data.trackedFiles)) {
            errors.push(
                new ValidationError(
                    "trackedFiles",
                    "Missing or invalid trackedFiles array",
                ),
            );
        }

        // If required fields are missing, return early
        if (errors.length > 0) {
            return {
                valid: false,
                errors,
            };
        }

        const now = Date.now();
        const maxFutureTimestamp =
            now + this.MAX_FUTURE_YEARS * 365 * 24 * 60 * 60 * 1000;

        // Validate each item
        data.items.forEach((item: any, index: number) => {
            if (!item) return;

            // Validate nextReview timestamp (not too far in future)
            if (item.nextReview > maxFutureTimestamp) {
                errors.push(
                    new ValidationError(
                        `items[${index}].nextReview`,
                        `Invalid timestamp: ${item.nextReview} (too far in future)`,
                    ),
                );
            }

            // Validate fileIndex references valid tracked file
            if (item.fileIndex >= data.trackedFiles.length) {
                errors.push(
                    new ValidationError(
                        `items[${index}].fileIndex`,
                        `Invalid fileIndex: ${item.fileIndex} (out of bounds)`,
                    ),
                );
            }

            // Validate FSRS-specific dates if present
            if (item.data && typeof item.data === "object") {
                // Check if this is FSRS data (has 'state' property)
                if ("state" in item.data) {
                    const fsrsData = item.data as FsrsData;

                    // Validate due date
                    if (fsrsData.due) {
                        const dueValue =
                            fsrsData.due instanceof Date
                                ? fsrsData.due.valueOf()
                                : new Date(fsrsData.due).valueOf();

                        if (dueValue > maxFutureTimestamp) {
                            errors.push(
                                new ValidationError(
                                    `items[${index}].data.due`,
                                    `Invalid FSRS due date: ${dueValue} (too far in future)`,
                                ),
                            );
                        }
                    }

                    // Validate last_review date
                    if (fsrsData.last_review) {
                        const lastReviewValue =
                            fsrsData.last_review instanceof Date
                                ? fsrsData.last_review.valueOf()
                                : new Date(fsrsData.last_review).valueOf();

                        if (lastReviewValue > maxFutureTimestamp) {
                            errors.push(
                                new ValidationError(
                                    `items[${index}].data.last_review`,
                                    `Invalid FSRS last_review date: ${lastReviewValue} (too far in future)`,
                                ),
                            );
                        }
                    }
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Attempt to automatically fix validation errors.
     * @param data - The data to fix
     * @param errors - The validation errors to fix
     * @returns The fixed data
     */
    autoFix(data: any, errors: ValidationError[]): SrsData {
        // Deep copy to avoid mutating original data
        const fixed = deepcopy(data);
        const now = Date.now();

        // Ensure required fields exist
        if (!fixed.items) {
            fixed.items = [];
        }
        if (!fixed.trackedFiles) {
            fixed.trackedFiles = [];
        }

        errors.forEach((error) => {
            const field = error.field;

            // Fix invalid nextReview timestamps
            if (field.includes("nextReview")) {
                const match = field.match(/items\[(\d+)\]/);
                if (match) {
                    const index = parseInt(match[1]);
                    if (fixed.items[index]) {
                        fixed.items[index].nextReview = now;
                        console.warn(
                            `[SrsDataValidator] Auto-fixed invalid nextReview for item ${fixed.items[index].ID}: reset to ${now}`,
                        );
                    }
                }
            }

            // Fix invalid fileIndex references
            if (field.includes("fileIndex")) {
                const match = field.match(/items\[(\d+)\]/);
                if (match) {
                    const index = parseInt(match[1]);
                    if (fixed.items[index]) {
                        // Mark item as untracked
                        fixed.items[index].fileIndex = -1;
                        console.warn(
                            `[SrsDataValidator] Auto-fixed invalid fileIndex for item ${fixed.items[index].ID}: set to -1 (untracked)`,
                        );
                    }
                }
            }

            // Fix invalid FSRS due dates
            if (field.includes("data.due")) {
                const match = field.match(/items\[(\d+)\]/);
                if (match) {
                    const index = parseInt(match[1]);
                    if (fixed.items[index] && fixed.items[index].data) {
                        const fsrsData = fixed.items[index].data as FsrsData;
                        fsrsData.due = new Date(now);
                        console.warn(
                            `[SrsDataValidator] Auto-fixed invalid FSRS due date for item ${fixed.items[index].ID}: reset to ${now}`,
                        );
                    }
                }
            }

            // Fix invalid FSRS last_review dates
            if (field.includes("data.last_review")) {
                const match = field.match(/items\[(\d+)\]/);
                if (match) {
                    const index = parseInt(match[1]);
                    if (fixed.items[index] && fixed.items[index].data) {
                        const fsrsData = fixed.items[index].data as FsrsData;
                        fsrsData.last_review = new Date(now);
                        console.warn(
                            `[SrsDataValidator] Auto-fixed invalid FSRS last_review date for item ${fixed.items[index].ID}: reset to ${now}`,
                        );
                    }
                }
            }
        });

        return fixed as SrsData;
    }
}
