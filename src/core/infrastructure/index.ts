/**
 * Infrastructure components for the refactored data storage architecture.
 * This module provides type-safe error handling, event-driven communication,
 * and dependency injection.
 */

export { Result, Ok, Err, createOk, createErr } from "./Result";
export type { Ok as OkClass, Err as ErrClass } from "./Result";

export {
    StorageError,
    ValidationError,
    ParseError,
    WriteError,
    FileNotFoundError,
    RepositoryError,
    ItemNotFoundError,
    ItemNotTrackedError,
    FileAlreadyTrackedError,
    FileNotTrackedError,
    ReviewError,
    TrackError,
    MigrationError,
} from "./errors";

export { EventBus } from "./EventBus";
export type { EventHandler } from "./EventBus";

export { ServiceContainer } from "./ServiceContainer";
export type { Factory } from "./ServiceContainer";
