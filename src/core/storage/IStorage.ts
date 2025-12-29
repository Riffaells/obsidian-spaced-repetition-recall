import { Result } from "../infrastructure/Result";
import { StorageError } from "../infrastructure/errors";

/**
 * Generic interface for reading and writing typed data to persistent storage.
 * Implementations handle format-specific details (JSON parsing, CSV formatting, etc.).
 *
 * @template T - The type of data being stored
 */
export interface IStorage<T> {
    /**
     * Read data from storage.
     * @returns A Result containing either the data or a StorageError
     */
    read(): Promise<Result<T, StorageError>>;

    /**
     * Write data to storage.
     * @param data - The data to write
     * @returns A Result indicating success or failure
     */
    write(data: T): Promise<Result<void, StorageError>>;

    /**
     * Check if storage exists.
     * @returns True if the storage exists, false otherwise
     */
    exists(): Promise<boolean>;
}
