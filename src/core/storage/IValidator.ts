import { ValidationError } from "../infrastructure/errors";

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
    /**
     * Whether the data is valid.
     */
    valid: boolean;

    /**
     * List of validation errors found.
     */
    errors: ValidationError[];
}

/**
 * Interface for validating data structures and automatically fixing common issues.
 *
 * @template T - The type of data being validated
 */
export interface IValidator<T> {
    /**
     * Validate data against a schema.
     * @param data - The data to validate
     * @returns A ValidationResult indicating whether the data is valid and any errors found
     */
    validate(data: any): ValidationResult;

    /**
     * Attempt to automatically fix validation errors.
     * @param data - The data to fix
     * @param errors - The validation errors to fix
     * @returns The fixed data
     */
    autoFix(data: any, errors: ValidationError[]): T;
}
