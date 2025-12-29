import { RepetitionItem } from "../../dataStore/repetitionItem";
import { Result } from "../infrastructure/Result";
import { RepositoryError } from "../infrastructure/errors";

/**
 * Repository interface for RepetitionItem entities.
 * Provides CRUD operations and data access abstractions over the Storage Layer.
 */
export interface IItemRepository {
    /**
     * Find a RepetitionItem by its ID.
     * @param id - The item ID
     * @returns The item if found, null otherwise
     */
    findById(id: number): Promise<RepetitionItem | null>;

    /**
     * Find all RepetitionItem entities with a specific fileIndex.
     * @param fileIndex - The file index to search for
     * @returns Array of items with the specified fileIndex
     */
    findByFileIndex(fileIndex: number): Promise<RepetitionItem[]>;

    /**
     * Find all due RepetitionItem entities.
     * @returns Array of due items
     */
    findDue(): Promise<RepetitionItem[]>;

    /**
     * Find all new RepetitionItem entities.
     * @returns Array of new items
     */
    findNew(): Promise<RepetitionItem[]>;

    /**
     * Save a single RepetitionItem.
     * @param item - The item to save
     * @returns A Result indicating success or failure
     */
    save(item: RepetitionItem): Promise<Result<void, RepositoryError>>;

    /**
     * Delete a RepetitionItem by ID.
     * @param id - The item ID to delete
     * @returns A Result indicating success or failure
     */
    delete(id: number): Promise<Result<void, RepositoryError>>;

    /**
     * Save multiple RepetitionItem entities in a batch.
     * @param items - The items to save
     * @returns A Result indicating success or failure
     */
    saveAll(items: RepetitionItem[]): Promise<Result<void, RepositoryError>>;

    /**
     * Load data from storage and build indexes.
     * @returns A Result indicating success or failure
     */
    load(): Promise<Result<void, RepositoryError>>;
}
