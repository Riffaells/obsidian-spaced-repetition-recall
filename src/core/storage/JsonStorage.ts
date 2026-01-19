import { DataAdapter } from "obsidian";
import { IStorage } from "./IStorage";
import { IValidator } from "./IValidator";
import { IMigrator } from "./IMigrator";
import { BackupManager } from "./BackupManager";
import { Result, createOk, createErr } from "../infrastructure/Result";
import { StorageError, FileNotFoundError, ParseError, WriteError } from "../infrastructure/errors";

/**
 * JSON-based storage implementation.
 * Handles reading and writing typed data to JSON files with validation,
 * migration, and backup support.
 *
 * @template T - The type of data being stored
 */
export class JsonStorage<T> implements IStorage<T> {
    /**
     * Creates a new JsonStorage instance.
     * @param adapter - The Obsidian DataAdapter for file operations
     * @param path - Path to the JSON file
     * @param validator - Validator for data integrity checks
     * @param migrator - Migrator for schema version upgrades
     * @param backupManager - Manager for backup operations
     */
    constructor(
        private adapter: DataAdapter,
        private path: string,
        private validator: IValidator<T>,
        private migrator: IMigrator<T>,
        private backupManager: BackupManager,
    ) {}

    /**
     * Read data from storage.
     * Performs validation, auto-fix if needed, and applies migrations.
     * @returns A Result containing either the data or a StorageError
     */
    async read(): Promise<Result<T, StorageError>> {
        try {
            // 1. Check if file exists
            if (!(await this.adapter.exists(this.path))) {
                return createErr(new FileNotFoundError(this.path));
            }

            // 2. Read raw data
            const raw = await this.adapter.read(this.path);

            // 3. Parse JSON
            let parsed: any;
            try {
                parsed = JSON.parse(raw);
            } catch (error) {
                return createErr(
                    new ParseError(`Failed to parse JSON from ${this.path}: ${error.message}`),
                );
            }

            // 4. Validate schema
            const validation = this.validator.validate(parsed);
            if (!validation.valid) {
                console.warn(
                    `[JsonStorage] Data validation failed with ${validation.errors.length} error(s)`,
                );
                validation.errors.forEach((error) => {
                    console.warn(`  - ${error.field}: ${error.message}`);
                });

                // Create backup of corrupted data
                try {
                    await this.backupManager.createCorruptedBackup(this.path);
                } catch (backupError) {
                    console.error(
                        `[JsonStorage] Failed to create corrupted backup: ${backupError.message}`,
                    );
                }

                // Attempt auto-fix
                parsed = this.validator.autoFix(parsed, validation.errors);
                console.log("[JsonStorage] Auto-fixed validation errors");
            }

            // 5. Apply migrations if needed
            try {
                const migrated = await this.migrator.migrate(parsed);
                return createOk(migrated);
            } catch (migrationError) {
                return createErr(
                    new StorageError(`Migration failed: ${migrationError.message}`, migrationError),
                );
            }
        } catch (error) {
            return createErr(
                new StorageError(`Failed to read from ${this.path}: ${error.message}`, error),
            );
        }
    }

    /**
     * Write data to storage.
     * Creates a backup before writing if the file already exists.
     * @param data - The data to write
     * @returns A Result indicating success or failure
     */
    async write(data: T): Promise<Result<void, StorageError>> {
        try {
            // 1. Create backup before writing (if file exists)
            if (await this.adapter.exists(this.path)) {
                try {
                    await this.backupManager.createBackup(this.path);
                } catch (backupError) {
                    console.error(`[JsonStorage] Failed to create backup: ${backupError.message}`);
                    // Continue with write even if backup fails
                }
            }

            // 2. Serialize to JSON
            const json = JSON.stringify(data, null, 2);

            // 3. Write to file
            await this.adapter.write(this.path, json);

            return createOk(undefined);
        } catch (error) {
            return createErr(new WriteError(`Failed to write to ${this.path}: ${error.message}`));
        }
    }

    /**
     * Check if storage exists.
     * @returns True if the storage file exists, false otherwise
     */
    async exists(): Promise<boolean> {
        try {
            return await this.adapter.exists(this.path);
        } catch (error) {
            console.error(
                `[JsonStorage] Error checking existence of ${this.path}: ${error.message}`,
            );
            return false;
        }
    }
}
