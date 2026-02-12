/**
 * Validation utilities for type checking and data validation.
 */

/**
 * Validation result type.
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Creates a successful validation result.
 */
export function validResult(): ValidationResult {
    return { valid: true, errors: [] };
}

/**
 * Creates a failed validation result.
 */
export function invalidResult(...errors: string[]): ValidationResult {
    return { valid: false, errors };
}

/**
 * Type guards
 */

export function isString(value: unknown): value is string {
    return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
    return typeof value === "number" && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}

export function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFunction(value: unknown): value is Function {
    return typeof value === "function";
}

export function isNull(value: unknown): value is null {
    return value === null;
}

export function isUndefined(value: unknown): value is undefined {
    return value === undefined;
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
    return value === null || value === undefined;
}

export function isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

export function isDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
}

export function isRegExp(value: unknown): value is RegExp {
    return value instanceof RegExp;
}

export function isError(value: unknown): value is Error {
    return value instanceof Error;
}

export function isPromise(value: unknown): value is Promise<unknown> {
    return value instanceof Promise || (isObject(value) && isFunction((value as any).then));
}

/**
 * String validators
 */

export function isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
}

export function isUrl(value: string): boolean {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

export function isUuid(value: string): boolean {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

export function isHexColor(value: string): boolean {
    const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
    return hexColorRegex.test(value);
}

export function isAlphanumeric(value: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(value);
}

export function isAlpha(value: string): boolean {
    return /^[a-zA-Z]+$/.test(value);
}

export function isNumeric(value: string): boolean {
    return /^[0-9]+$/.test(value);
}

/**
 * Number validators
 */

export function isInteger(value: number): boolean {
    return Number.isInteger(value);
}

export function isPositive(value: number): boolean {
    return value > 0;
}

export function isNegative(value: number): boolean {
    return value < 0;
}

export function isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}

export function isEven(value: number): boolean {
    return value % 2 === 0;
}

export function isOdd(value: number): boolean {
    return value % 2 !== 0;
}

/**
 * Array validators
 */

export function isEmpty(value: unknown[] | string | Record<string, unknown>): boolean {
    if (isArray(value) || isString(value)) {
        return value.length === 0;
    }
    if (isObject(value)) {
        return Object.keys(value).length === 0;
    }
    return false;
}

export function isNotEmpty(value: unknown[] | string | Record<string, unknown>): boolean {
    return !isEmpty(value);
}

export function hasLength(value: unknown[] | string, length: number): boolean {
    return (isArray(value) || isString(value)) && value.length === length;
}

export function hasMinLength(value: unknown[] | string, minLength: number): boolean {
    return (isArray(value) || isString(value)) && value.length >= minLength;
}

export function hasMaxLength(value: unknown[] | string, maxLength: number): boolean {
    return (isArray(value) || isString(value)) && value.length <= maxLength;
}

/**
 * Object validators
 */

export function hasProperty<T extends Record<string, unknown>>(
    obj: T,
    key: string | number | symbol,
): key is keyof T {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

export function hasProperties<T extends Record<string, unknown>>(
    obj: T,
    keys: string[],
): boolean {
    return keys.every((key) => hasProperty(obj, key));
}

/**
 * Composite validators
 */

export function isArrayOf<T>(
    value: unknown,
    validator: (item: unknown) => item is T,
): value is T[] {
    return isArray(value) && value.every(validator);
}

export function isOneOf<T>(value: unknown, options: T[]): value is T {
    return options.includes(value as T);
}

export function matches(value: string, pattern: RegExp): boolean {
    return pattern.test(value);
}

/**
 * Validation builder for complex validations
 */
export class Validator<T> {
    private validators: Array<(value: T) => ValidationResult> = [];

    /**
     * Adds a custom validation rule.
     */
    rule(validator: (value: T) => boolean, errorMessage: string): this {
        this.validators.push((value) => {
            return validator(value) ? validResult() : invalidResult(errorMessage);
        });
        return this;
    }

    /**
     * Validates that value is defined.
     */
    required(errorMessage: string = "Value is required"): this {
        return this.rule((value) => isDefined(value), errorMessage);
    }

    /**
     * Validates string length.
     */
    minLength(min: number, errorMessage?: string): this {
        return this.rule(
            (value) => isString(value) && value.length >= min,
            errorMessage || `Minimum length is ${min}`,
        );
    }

    maxLength(max: number, errorMessage?: string): this {
        return this.rule(
            (value) => isString(value) && value.length <= max,
            errorMessage || `Maximum length is ${max}`,
        );
    }

    /**
     * Validates number range.
     */
    min(min: number, errorMessage?: string): this {
        return this.rule(
            (value) => isNumber(value) && value >= min,
            errorMessage || `Minimum value is ${min}`,
        );
    }

    max(max: number, errorMessage?: string): this {
        return this.rule(
            (value) => isNumber(value) && value <= max,
            errorMessage || `Maximum value is ${max}`,
        );
    }

    /**
     * Validates using regex pattern.
     */
    pattern(pattern: RegExp, errorMessage: string = "Invalid format"): this {
        return this.rule((value) => isString(value) && pattern.test(value), errorMessage);
    }

    /**
     * Validates email format.
     */
    email(errorMessage: string = "Invalid email format"): this {
        return this.rule((value) => isString(value) && isEmail(value), errorMessage);
    }

    /**
     * Validates URL format.
     */
    url(errorMessage: string = "Invalid URL format"): this {
        return this.rule((value) => isString(value) && isUrl(value), errorMessage);
    }

    /**
     * Validates that value is one of the options.
     */
    oneOf(options: T[], errorMessage?: string): this {
        return this.rule(
            (value) => options.includes(value),
            errorMessage || `Value must be one of: ${options.join(", ")}`,
        );
    }

    /**
     * Runs all validations and returns result.
     */
    validate(value: T): ValidationResult {
        const errors: string[] = [];

        for (const validator of this.validators) {
            const result = validator(value);
            if (!result.valid) {
                errors.push(...result.errors);
            }
        }

        return errors.length === 0 ? validResult() : { valid: false, errors };
    }

    /**
     * Validates and throws error if invalid.
     */
    validateOrThrow(value: T): void {
        const result = this.validate(value);
        if (!result.valid) {
            throw new Error(`Validation failed: ${result.errors.join(", ")}`);
        }
    }
}

/**
 * Creates a new validator instance.
 */
export function validator<T>(): Validator<T> {
    return new Validator<T>();
}
