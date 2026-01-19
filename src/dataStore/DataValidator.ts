import { SrsData } from "./data";
import { RepetitionItem } from "./repetitionItem";
import { FsrsData } from "src/algorithms/fsrs";
import deepcopy from "deepcopy";

export enum ValidationErrorType {
    INVALID_DATE = "INVALID_DATE",
    INVALID_FSRS_DATE = "INVALID_FSRS_DATE",
    INVALID_REFERENCE = "INVALID_REFERENCE",
}

export interface ValidationError {
    type: ValidationErrorType;
    itemId: number;
    field: string;
    value: unknown;
    message: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

/**
 * DataValidator - validates SRS data integrity and detects corruption
 */
export class DataValidator {
    private readonly MAX_FUTURE_YEARS = 10;
    private readonly MAX_PAST_YEARS = 10;

    /**
     * Validate entire SrsData structure
     */
    validateSrsData(data: SrsData): ValidationResult {
        const errors: ValidationError[] = [];

        const now = Date.now();
        const maxFuture = now + this.MAX_FUTURE_YEARS * 365 * 24 * 3600 * 1000;
        const minPast = now - this.MAX_PAST_YEARS * 365 * 24 * 3600 * 1000;

        // Validate each item
        data.items.forEach((item) => {
            if (!item) return;

            // Validate nextReview timestamp
            if (item.nextReview > 0) {
                if (item.nextReview > maxFuture || item.nextReview < minPast) {
                    errors.push({
                        type: ValidationErrorType.INVALID_DATE,
                        itemId: item.ID,
                        field: "nextReview",
                        value: item.nextReview,
                        message: `Invalid nextReview date: ${new Date(item.nextReview).toISOString()} (ID: ${item.ID})`,
                    });
                }
            }

            // Validate fileIndex reference
            if (item.fileIndex >= data.trackedFiles.length) {
                errors.push({
                    type: ValidationErrorType.INVALID_REFERENCE,
                    itemId: item.ID,
                    field: "fileIndex",
                    value: item.fileIndex,
                    message: `fileIndex ${item.fileIndex} out of bounds (max: ${data.trackedFiles.length - 1}, ID: ${item.ID})`,
                });
            }

            // Validate FSRS-specific data
            if (item.isFsrs && item.data) {
                const fsrsData = item.data as FsrsData;

                if (fsrsData.due) {
                    const dueValue = fsrsData.due.valueOf();
                    if (dueValue > maxFuture || dueValue < minPast) {
                        errors.push({
                            type: ValidationErrorType.INVALID_FSRS_DATE,
                            itemId: item.ID,
                            field: "data.due",
                            value: dueValue,
                            message: `Invalid FSRS due date: ${new Date(dueValue).toISOString()} (ID: ${item.ID})`,
                        });
                    }
                }

                if (fsrsData.last_review) {
                    const lastReviewValue = fsrsData.last_review.valueOf();
                    if (lastReviewValue > maxFuture || lastReviewValue < minPast) {
                        errors.push({
                            type: ValidationErrorType.INVALID_FSRS_DATE,
                            itemId: item.ID,
                            field: "data.last_review",
                            value: lastReviewValue,
                            message: `Invalid FSRS last_review date: ${new Date(lastReviewValue).toISOString()} (ID: ${item.ID})`,
                        });
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
     * Automatically fix corrupted data
     */
    autoFix(data: SrsData, errors: ValidationError[]): SrsData {
        const fixed = deepcopy(data);
        const now = Date.now();

        errors.forEach((error) => {
            const item = fixed.items.find((i) => i && i.ID === error.itemId);
            if (!item) return;

            switch (error.type) {
                case ValidationErrorType.INVALID_DATE:
                    // Reset to current time
                    item.nextReview = now;
                    console.warn(
                        `[DataValidator] Auto-fixed invalid nextReview for item ${item.ID}: ${error.value} -> ${now}`,
                    );
                    break;

                case ValidationErrorType.INVALID_FSRS_DATE:
                    if (item.isFsrs) {
                        const fsrsData = item.data as FsrsData;

                        if (error.field === "data.due") {
                            // Create a NEW Date object to avoid reference issues
                            fsrsData.due = new Date(now);
                            console.warn(
                                `[DataValidator] Auto-fixed invalid FSRS due for item ${item.ID}`,
                            );
                        }

                        if (error.field === "data.last_review") {
                            // Create a NEW Date object to avoid reference issues
                            fsrsData.last_review = new Date(now);
                            console.warn(
                                `[DataValidator] Auto-fixed invalid FSRS last_review for item ${item.ID}`,
                            );
                        }
                    }
                    break;

                case ValidationErrorType.INVALID_REFERENCE:
                    // Mark as untracked
                    item.fileIndex = -1;
                    console.warn(
                        `[DataValidator] Auto-fixed invalid fileIndex for item ${item.ID}: ${error.value} -> -1`,
                    );
                    break;
            }
        });

        return fixed;
    }
}
