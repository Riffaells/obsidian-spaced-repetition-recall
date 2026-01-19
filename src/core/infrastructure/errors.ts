/**
 * Base error class for storage-related failures.
 */
export class StorageError extends Error {
    constructor(
        message: string,
        public cause?: Error,
    ) {
        super(message);
        this.name = "StorageError";
    }
}

/**
 * Error thrown when data validation fails.
 */
export class ValidationError extends Error {
    constructor(
        public field: string,
        message: string,
    ) {
        super(message);
        this.name = "ValidationError";
    }
}

/**
 * Error thrown when JSON parsing fails.
 */
export class ParseError extends StorageError {
    constructor(message: string) {
        super(message);
        this.name = "ParseError";
    }
}

/**
 * Error thrown when writing to storage fails.
 */
export class WriteError extends StorageError {
    constructor(message: string) {
        super(message);
        this.name = "WriteError";
    }
}

/**
 * Error thrown when a file is not found in storage.
 */
export class FileNotFoundError extends StorageError {
    constructor(public path: string) {
        super(`File not found: ${path}`);
        this.name = "FileNotFoundError";
    }
}

/**
 * Base error class for repository-related failures.
 */
export class RepositoryError extends Error {
    constructor(
        message: string,
        public cause?: Error,
    ) {
        super(message);
        this.name = "RepositoryError";
    }
}

/**
 * Error thrown when an item is not found in the repository.
 */
export class ItemNotFoundError extends Error {
    constructor(public itemId: number) {
        super(`Item not found: ${itemId}`);
        this.name = "ItemNotFoundError";
    }
}

/**
 * Error thrown when attempting to review an untracked item.
 */
export class ItemNotTrackedError extends Error {
    constructor(public itemId: number) {
        super(`Item not tracked: ${itemId}`);
        this.name = "ItemNotTrackedError";
    }
}

/**
 * Error thrown when attempting to track a file that is already tracked.
 */
export class FileAlreadyTrackedError extends Error {
    constructor(public path: string) {
        super(`File already tracked: ${path}`);
        this.name = "FileAlreadyTrackedError";
    }
}

/**
 * Error thrown when a file is not tracked.
 */
export class FileNotTrackedError extends Error {
    constructor(public path: string) {
        super(`File not tracked: ${path}`);
        this.name = "FileNotTrackedError";
    }
}

/**
 * Error thrown when reviewing an item fails.
 */
export class ReviewError extends Error {
    constructor(
        message: string,
        public cause?: Error,
    ) {
        super(message);
        this.name = "ReviewError";
    }
}

/**
 * Error thrown when tracking or untracking a file fails.
 */
export class TrackError extends Error {
    constructor(
        message: string,
        public cause?: Error,
    ) {
        super(message);
        this.name = "TrackError";
    }
}

/**
 * Error thrown when data migration fails.
 */
export class MigrationError extends Error {
    constructor(
        public fromVersion: number,
        public toVersion: number,
        message: string,
    ) {
        super(message);
        this.name = "MigrationError";
    }
}
