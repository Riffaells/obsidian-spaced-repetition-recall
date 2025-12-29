import { TrackedFile } from "../../dataStore/trackedFile";
import { Result } from "../infrastructure/Result";
import { RepositoryError } from "../infrastructure/errors";

/**
 * Repository interface for TrackedFile entities.
 * Provides CRUD operations and data access abstractions over the Storage Layer.
 */
export interface IFileRepository {
    /**
     * Find a TrackedFile by its file path.
     * @param path - The file path
     * @returns The tracked file if found, null otherwise
     */
    findByPath(path: string): Promise<TrackedFile | null>;

    /**
     * Find a TrackedFile by its index.
     * @param index - The file index
     * @returns The tracked file if found, null otherwise
     */
    findByIndex(index: number): Promise<TrackedFile | null>;

    /**
     * List all TrackedFile entities.
     * @returns Array of all tracked files
     */
    list(): Promise<TrackedFile[]>;

    /**
     * Save a TrackedFile.
     * @param file - The tracked file to save
     * @returns A Result indicating success or failure
     */
    save(file: TrackedFile): Promise<Result<void, RepositoryError>>;

    /**
     * Delete a TrackedFile by path.
     * @param path - The file path to delete
     * @returns A Result indicating success or failure
     */
    delete(path: string): Promise<Result<void, RepositoryError>>;

    /**
     * Load data from storage and build indexes.
     * @returns A Result indicating success or failure
     */
    load(): Promise<Result<void, RepositoryError>>;
}
