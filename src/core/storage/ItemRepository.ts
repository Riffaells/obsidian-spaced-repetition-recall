import { RepetitionItem } from "../../dataStore/repetitionItem";
import { SrsData, DEFAULT_SRS_DATA } from "../../dataStore/interfaces";
import { IItemRepository } from "./IItemRepository";
import { IStorage } from "./IStorage";
import { EventBus } from "../infrastructure/EventBus";
import { Result, createOk, createErr, Err } from "../infrastructure/Result";
import { RepositoryError } from "../infrastructure/errors";

/**
 * Repository implementation for RepetitionItem entities.
 * Maintains in-memory indexes for fast lookups and caching.
 */
export class ItemRepository implements IItemRepository {
    // Indexes for fast lookups
    private byId: Map<number, RepetitionItem> = new Map();
    private byFileIndex: Map<number, Set<number>> = new Map();
    private dueItems: Set<number> = new Set();
    private newItems: Set<number> = new Set();

    constructor(
        private storage: IStorage<SrsData>,
        private eventBus: EventBus,
    ) {}

    /**
     * Load data from storage and build indexes.
     * @returns A Result indicating success or failure
     */
    async load(): Promise<Result<void, RepositoryError>> {
        const result = await this.storage.read();

        if (result.isOk) {
            const data = result.value;

            // Build indexes
            this.byId.clear();
            this.byFileIndex.clear();
            this.dueItems.clear();
            this.newItems.clear();

            data.items.forEach((item: RepetitionItem) => {
                this.byId.set(item.ID, item);

                // Index by fileIndex
                if (!this.byFileIndex.has(item.fileIndex)) {
                    this.byFileIndex.set(item.fileIndex, new Set());
                }
                this.byFileIndex.get(item.fileIndex)!.add(item.ID);

                // Index due items
                if (item.isDue) {
                    this.dueItems.add(item.ID);
                }

                // Index new items
                if (item.isNew) {
                    this.newItems.add(item.ID);
                }
            });

            return createOk(undefined);
        } else {
            const err = result as Err<any>;
            if (err.error.name === "FileNotFoundError") {
                this.byId.clear();
                this.byFileIndex.clear();
                this.dueItems.clear();
                this.newItems.clear();
                return createOk(undefined);
            }
            return createErr(new RepositoryError("Failed to load data", err.error));
        }
    }

    /**
     * Find a RepetitionItem by its ID.
     * Uses cache for O(1) lookup.
     * @param id - The item ID
     * @returns The item if found, null otherwise
     */
    async findById(id: number): Promise<RepetitionItem | null> {
        return this.byId.get(id) || null;
    }

    /**
     * Find all RepetitionItem entities with a specific fileIndex.
     * Uses index for fast lookup.
     * @param fileIndex - The file index to search for
     * @returns Array of items with the specified fileIndex
     */
    async findByFileIndex(fileIndex: number): Promise<RepetitionItem[]> {
        const ids = this.byFileIndex.get(fileIndex);
        if (!ids) return [];

        return Array.from(ids)
            .map((id) => this.byId.get(id)!)
            .filter((item) => item !== undefined);
    }

    /**
     * Find all due RepetitionItem entities.
     * Uses index for O(1) lookup.
     * @returns Array of due items
     */
    async findDue(): Promise<RepetitionItem[]> {
        return Array.from(this.dueItems)
            .map((id) => this.byId.get(id)!)
            .filter((item) => item !== undefined && item.isDue);
    }

    /**
     * Find all new RepetitionItem entities.
     * Uses index for fast lookup.
     * @returns Array of new items
     */
    async findNew(): Promise<RepetitionItem[]> {
        return Array.from(this.newItems)
            .map((id) => this.byId.get(id)!)
            .filter((item) => item !== undefined && item.isNew);
    }

    /**
     * Save a single RepetitionItem.
     * Updates cache and indexes, then persists to storage.
     * Emits 'item:updated' event on success.
     * @param item - The item to save
     * @returns A Result indicating success or failure
     */
    async save(item: RepetitionItem): Promise<Result<void, RepositoryError>> {
        // Update cache
        this.byId.set(item.ID, item);

        // Update indexes
        this.updateIndexes(item);

        // Load all data
        const readResult = await this.storage.read();
        let data: SrsData;
        if (readResult.isOk) {
            data = readResult.value;
        } else {
            const err = readResult as Err<any>;
            if (err.error.name === "FileNotFoundError") {
                data = { ...DEFAULT_SRS_DATA, items: [] };
            } else {
                return createErr(new RepositoryError("Failed to read data", err.error));
            }
        }


        const index = data.items.findIndex((i) => i.ID === item.ID);

        if (index >= 0) {
            data.items[index] = item;
        } else {
            data.items.push(item);
        }

        // Save
        const writeResult = await this.storage.write(data);
        if (writeResult.isErr) {
            return createErr(
                new RepositoryError("Failed to write data", writeResult.error),
            );
        }

        // Emit event
        this.eventBus.emit("item:updated", item);

        return createOk(undefined);
    }

    /**
     * Delete a RepetitionItem by ID.
     * Removes from cache and indexes, then persists to storage.
     * Emits 'item:deleted' event on success.
     * @param id - The item ID to delete
     * @returns A Result indicating success or failure
     */
    async delete(id: number): Promise<Result<void, RepositoryError>> {
        const item = this.byId.get(id);
        if (!item) {
            return createOk(undefined); // Already deleted
        }

        // Remove from cache and indexes
        this.byId.delete(id);
        this.removeFromIndexes(item);

        // Load all data
        const readResult = await this.storage.read();
        if (readResult.isOk) {
            const data = readResult.value;
            data.items = data.items.filter((i: RepetitionItem) => i.ID !== id);

            // Save
            const writeResult = await this.storage.write(data);
            if (writeResult.isErr) {
                return createErr(new RepositoryError("Failed to write data", writeResult.error));
            }

            // Emit event
            this.eventBus.emit("item:deleted", id);

            return createOk(undefined);
        } else {
            const err = readResult as Err<any>;
            // If file doesn't exist, there's nothing to delete from.
            if (err.error.name === "FileNotFoundError") {
                return createOk(undefined);
            }
            return createErr(new RepositoryError("Failed to read data", err.error));
        }
    }

    /**
     * Save multiple RepetitionItem entities in a batch.
     * Updates cache and indexes for all items, then persists to storage.
     * @param items - The items to save
     * @returns A Result indicating success or failure
     */
    async saveAll(
        items: RepetitionItem[],
    ): Promise<Result<void, RepositoryError>> {
        // Update cache and indexes
        items.forEach((item) => {
            this.byId.set(item.ID, item);
            this.updateIndexes(item);
        });

        const readResult = await this.storage.read();
        let data: SrsData;
        if (readResult.isOk) {
            data = readResult.value;
        } else {
            const err = readResult as Err<any>;
            if (err.error.name === "FileNotFoundError") {
                data = { ...DEFAULT_SRS_DATA, items: [] };
            } else {
                return createErr(new RepositoryError("Failed to read data", err.error));
            }
        }

        // Update or add items
        items.forEach((item) => {
            const index = data.items.findIndex((i) => i.ID === item.ID);
            if (index >= 0) {
                data.items[index] = item;
            } else {
                data.items.push(item);
            }
        });

        // Save
        const writeResult = await this.storage.write(data);
        if (writeResult.isErr) {
            return createErr(
                new RepositoryError("Failed to write data", writeResult.error),
            );
        }

        return createOk(undefined);
    }

    /**
     * Update indexes for an item.
     * Maintains fileIndex, due, and new item indexes.
     * @param item - The item to update indexes for
     */
    private updateIndexes(item: RepetitionItem): void {
        // Update fileIndex index
        if (!this.byFileIndex.has(item.fileIndex)) {
            this.byFileIndex.set(item.fileIndex, new Set());
        }
        this.byFileIndex.get(item.fileIndex)!.add(item.ID);

        // Update due/new indexes
        if (item.isDue) {
            this.dueItems.add(item.ID);
            this.newItems.delete(item.ID);
        } else if (item.isNew) {
            this.newItems.add(item.ID);
            this.dueItems.delete(item.ID);
        } else {
            this.dueItems.delete(item.ID);
            this.newItems.delete(item.ID);
        }
    }

    /**
     * Remove an item from all indexes.
     * @param item - The item to remove from indexes
     */
    private removeFromIndexes(item: RepetitionItem): void {
        const fileIndexSet = this.byFileIndex.get(item.fileIndex);
        if (fileIndexSet) {
            fileIndexSet.delete(item.ID);
        }

        this.dueItems.delete(item.ID);
        this.newItems.delete(item.ID);
    }
}
