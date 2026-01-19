import { RepetitionItem, ReviewResult } from "../../dataStore/repetitionItem";
import { SrsAlgorithm } from "../../algorithms/algorithms";
import { IItemRepository } from "../storage/IItemRepository";
import { IFileRepository } from "../storage/IFileRepository";
import { Result, createOk, createErr } from "../infrastructure/Result";
import { ItemNotFoundError, ItemNotTrackedError, ReviewError } from "../infrastructure/errors";
import { EventBus } from "../infrastructure/EventBus";

/**
 * Service containing business logic for reviewing items and managing review queues.
 * Orchestrates operations between repositories and the spaced repetition algorithm.
 */
export class ItemService {
    constructor(
        private itemRepo: IItemRepository,
        private fileRepo: IFileRepository,
        private algorithm: SrsAlgorithm,
        private eventBus: EventBus,
    ) {}

    /**
     * Review an item with a given response.
     * Applies the spaced repetition algorithm and persists the updated item.
     *
     * @param itemId - The ID of the item to review
     * @param response - The user's response (e.g., "easy", "good", "hard", "again")
     * @returns A Result containing the ReviewResult or an error
     */
    async reviewItem(
        itemId: number,
        response: string,
    ): Promise<Result<ReviewResult, ReviewError | ItemNotFoundError | ItemNotTrackedError>> {
        // Get item
        const item = await this.itemRepo.findById(itemId);
        if (!item) {
            return createErr(new ItemNotFoundError(itemId));
        }

        // Check if item can be reviewed
        if (!item.isTracked) {
            return createErr(new ItemNotTrackedError(itemId));
        }

        // Apply algorithm
        const result = this.algorithm.onSelection(item, response, false);

        // Update item
        item.reviewUpdate(result);

        // Save
        const saveResult = await this.itemRepo.save(item);
        if (saveResult.isErr) {
            return createErr(new ReviewError("Failed to save item", saveResult.error));
        }

        // Emit event
        this.eventBus.emit("item:reviewed", { item, result });

        return createOk(result);
    }

    /**
     * Get the next due item, optionally filtered by deck.
     *
     * @param deckName - Optional deck name to filter by
     * @returns The next due item, or null if no items are due
     */
    async getNextDueItem(deckName?: string): Promise<RepetitionItem | null> {
        const dueItems = await this.itemRepo.findDue();

        let filteredItems = dueItems;
        if (deckName) {
            filteredItems = dueItems.filter((i) => i.deckName === deckName);
        }

        // Return item with earliest nextReview
        if (filteredItems.length === 0) {
            return null;
        }

        return filteredItems.reduce((earliest, current) =>
            current.nextReview < earliest.nextReview ? current : earliest,
        );
    }

    /**
     * Get an item by its ID.
     *
     * @param id - The item ID
     * @returns A Result containing the item or an error
     */
    async getItemById(id: number): Promise<Result<RepetitionItem, ItemNotFoundError>> {
        const item = await this.itemRepo.findById(id);
        if (!item) {
            return createErr(new ItemNotFoundError(id));
        }
        return createOk(item);
    }

    /**
     * Get all items associated with a file.
     *
     * @param path - The file path
     * @returns Array of items for the file, or empty array if file not found
     */
    async getItemsByFile(path: string): Promise<RepetitionItem[]> {
        const file = await this.fileRepo.findByPath(path);
        if (!file) {
            return [];
        }

        // Find the file's index in the trackedFiles array
        const allFiles = await this.fileRepo.list();
        const fileIndex = allFiles.findIndex((f) => f.path === path);

        if (fileIndex < 0) {
            return [];
        }

        return await this.itemRepo.findByFileIndex(fileIndex);
    }
}
