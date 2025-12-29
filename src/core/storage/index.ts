/**
 * Storage Layer interfaces for the refactored data storage architecture.
 * This module provides abstractions for reading/writing data, validation,
 * and schema migration.
 */

export type { IStorage } from "./IStorage";
export type { IValidator, ValidationResult } from "./IValidator";
export type { IMigrator } from "./IMigrator";
export type { IItemRepository } from "./IItemRepository";
export type { IFileRepository } from "./IFileRepository";
export { SrsDataValidator } from "./SrsDataValidator";
export { SrsDataMigrator } from "./SrsDataMigrator";
export { BackupManager } from "./BackupManager";
export { JsonStorage } from "./JsonStorage";
export { ItemRepository } from "./ItemRepository";
export { FileRepository } from "./FileRepository";
export { setupServices } from "./setupServices";
