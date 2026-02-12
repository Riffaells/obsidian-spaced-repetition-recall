/**
 * Error handling utilities for consistent error management.
 * 
 * Features:
 * - Typed error handling with Result pattern
 * - Retry logic with exponential backoff
 * - Error recovery strategies
 * - User-friendly error messages
 * 
 * @example
 * ```typescript
 * const result = await tryAsync(() => loadFile(path));
 * if (result.isErr) {
 *   handleError(result.error, 'Failed to load file');
 * }
 * ```
 */

import { Notice } from "obsidian";
import { Logger } from "./Logger";

const logger = Logger.create("ErrorHandler");

/**
 * Custom error types for better error handling.
 */
export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly cause?: Error,
    ) {
        super(message);
        this.name = "AppError";
    }
}

export class ValidationError extends AppError {
    constructor(message: string, cause?: Error) {
        super(message, "VALIDATION_ERROR", cause);
        this.name = "ValidationError";
    }
}

export class StorageError extends AppError {
    constructor(message: string, cause?: Error) {
        super(message, "STORAGE_ERROR", cause);
        this.name = "StorageError";
    }
}

export class NetworkError extends AppError {
    constructor(message: string, cause?: Error) {
        super(message, "NETWORK_ERROR", cause);
        this.name = "NetworkError";
    }
}

export class ParseError extends AppError {
    constructor(message: string, cause?: Error) {
        super(message, "PARSE_ERROR", cause);
        this.name = "ParseError";
    }
}

/**
 * Try to execute a function and return Result.
 */
export function trySync<T>(fn: () => T): { ok: true; value: T } | { ok: false; error: Error } {
    try {
        return { ok: true, value: fn() };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
}

/**
 * Try to execute an async function and return Result.
 */
export async function tryAsync<T>(
    fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: Error }> {
    try {
        return { ok: true, value: await fn() };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
}

/**
 * Handle error with logging and optional user notification.
 */
export function handleError(
    error: Error | unknown,
    context: string,
    options?: {
        notify?: boolean;
        notifyMessage?: string;
        logLevel?: "error" | "warn";
    },
): void {
    const { notify = false, notifyMessage, logLevel = "error" } = options || {};

    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = `${context}: ${errorMessage}`;

    if (logLevel === "error") {
        logger.error(fullMessage, error);
    } else {
        logger.warn(fullMessage, error);
    }

    if (notify) {
        new Notice(notifyMessage || context);
    }
}

/**
 * Retry options for retry logic.
 */
export interface RetryOptions {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry an async operation with exponential backoff.
 */
export async function retryAsync<T>(
    fn: () => Promise<T>,
    options?: RetryOptions,
): Promise<T> {
    const {
        maxAttempts = 3,
        delayMs = 1000,
        backoffMultiplier = 2,
        onRetry,
    } = options || {};

    let lastError: Error;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < maxAttempts) {
                onRetry?.(attempt, lastError);
                logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${currentDelay}ms`, lastError);
                await sleep(currentDelay);
                currentDelay *= backoffMultiplier;
            }
        }
    }

    throw lastError!;
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap a function with error handling.
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
    fn: T,
    context: string,
    options?: {
        notify?: boolean;
        notifyMessage?: string;
        fallback?: ReturnType<T>;
    },
): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
        try {
            const result = fn(...args);
            if (result instanceof Promise) {
                return result.catch((error) => {
                    handleError(error, context, options);
                    return options?.fallback;
                }) as ReturnType<T>;
            }
            return result;
        } catch (error) {
            handleError(error, context, options);
            return options?.fallback as ReturnType<T>;
        }
    }) as T;
}

/**
 * Assert a condition and throw if false.
 */
export function assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
        throw new AppError(message, "ASSERTION_ERROR");
    }
}

/**
 * Assert value is not null/undefined.
 */
export function assertDefined<T>(
    value: T | null | undefined,
    message: string = "Value is null or undefined",
): asserts value is T {
    if (value === null || value === undefined) {
        throw new AppError(message, "ASSERTION_ERROR");
    }
}

/**
 * Get user-friendly error message.
 */
export function getUserFriendlyMessage(error: Error | unknown): string {
    if (error instanceof AppError) {
        return error.message;
    }

    if (error instanceof Error) {
        // Map common error types to user-friendly messages
        if (error.message.includes("ENOENT")) {
            return "File not found";
        }
        if (error.message.includes("EACCES")) {
            return "Permission denied";
        }
        if (error.message.includes("QuotaExceededError")) {
            return "Storage quota exceeded";
        }
        return error.message;
    }

    return "An unknown error occurred";
}

/**
 * Create error boundary for React-like components.
 */
export function createErrorBoundary<T>(
    fn: () => T,
    fallback: T,
    onError?: (error: Error) => void,
): T {
    try {
        return fn();
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        logger.error("Error boundary caught error", err);
        return fallback;
    }
}
