import { Vault } from "obsidian";
import { RepetitionItem, RPITEMTYPE } from "../../dataStore/repetitionItem";
import { TrackedFile } from "../../dataStore/trackedFile";
import { SrsAlgorithm } from "../../algorithms/algorithms";
import { IItemRepository } from "../storage/IItemRepository";
import { IFileRepository } from "../storage/IFileRepository";
import { Result, createOk, createErr } from "../infrastructure/Result";
import {
    FileNotFoundError,
    FileAlreadyTrackedError,
    FileNotTrackedError,
    TrackError,
} from "../infrastructure/errors";

/**
 * Result type for tracking operations.
 */
export interface TrackResult {
    added: number;
    removed: number;
}

/**
 * Result type for untracking operations.
 */
export interface UntrackResult {
    added: number;
    removed: number;
}

/**
 * Service containing business logic for tracking and untracking files.
 * Orchestrates operations between repositories and manages file tracking lifecycle.
 */
export class FileTrackService {
    constructor(
        private itemRepo: IItemRepository,
        private fileRepo: IFileRepository,
        private vault: Vault,
        private algorithm: SrsAlgorithm,
    ) {}

    /**
     * Track a file for spaced repetition.
     * Creates a TrackedFile entity and a corresponding RepetitionItem.
     *
     * @param path - The file path to track
     * @param type - The item type (NOTE or CARD)
     * @param deckName - The deck name (defaults to "default")
     * @returns A Result containing the TrackResult or an error
     */
    async trackFile(
        path: string,
        type: RPITEMTYPE,
        deckName: string = "default",
    ): Promise<Result<TrackResult, FileNotFoundError | FileAlreadyTrackedError | TrackError>> {
        // Check if file exists
        const file = this.vault.getAbstractFileByPath(path);
        if (!file) {
            return createErr(new FileNotFoundError(path));
        }

        // Check if already tracked
        const existing = await this.fileRepo.findByPath(path);
        if (existing?.isTracked) {
            return createErr(new FileAlreadyTrackedError(path));
        }

        // Create or update TrackedFile
        const trackedFile = existing || new TrackedFile(path, type, deckName);
        if (!existing) {
            trackedFile.setTracked(type, deckName);
        }

        const saveFileResult = await this.fileRepo.save(trackedFile);
        if (saveFileResult.isErr) {
            return createErr(new TrackError("Failed to save tracked file", saveFileResult.error));
        }

        // Get file index
        const allFiles = await this.fileRepo.list();
        const fileIndex = allFiles.findIndex((f) => f.path === path);

        if (fileIndex < 0) {
            return createErr(new TrackError("Failed to find tracked file after save"));
        }

        // Create RepetitionItem
        const itemId = await this.generateItemId();
        const item = new RepetitionItem(
            itemId,
            fileIndex,
            type,
            deckName,
            this.algorithm.defaultData(),
        );

        const saveItemResult = await this.itemRepo.save(item);
        if (saveItemResult.isErr) {
            return createErr(new TrackError("Failed to save item", saveItemResult.error));
        }

        return createOk({ added: 1, removed: 0 });
    }

    /**
     * Untrack a file from spaced repetition.
     * Removes the TrackedFile and all associated RepetitionItem entities.
     *
     * @param path - The file path to untrack
     * @returns A Result containing the UntrackResult or an error
     */
    async untrackFile(
        path: string,
    ): Promise<Result<UntrackResult, FileNotFoundError | FileNotTrackedError | TrackError>> {
        // Find tracked file
        const trackedFile = await this.fileRepo.findByPath(path);
        if (!trackedFile) {
            return createErr(new FileNotFoundError(path));
        }

        if (!trackedFile.isTracked) {
            return createErr(new FileNotTrackedError(path));
        }

        // Find the file's index in the trackedFiles array
        const allFiles = await this.fileRepo.list();
        const fileIndex = allFiles.findIndex((f) => f.path === path);

        if (fileIndex < 0) {
            return createErr(new TrackError("Failed to find file index for untracking"));
        }

        // Find all items for this file
        const items = await this.itemRepo.findByFileIndex(fileIndex);

        // Delete all items
        let removed = 0;
        for (const item of items) {
            const deleteResult = await this.itemRepo.delete(item.ID);
            if (deleteResult.isOk) {
                removed++;
            }
        }

        // Delete tracked file
        const deleteFileResult = await this.fileRepo.delete(path);
        if (deleteFileResult.isErr) {
            return createErr(
                new TrackError("Failed to delete tracked file", deleteFileResult.error),
            );
        }

        return createOk({ added: 0, removed });
    }

    /**
     * Generate a unique item ID.
     * Finds the maximum existing ID and returns the next available ID.
     *
     * @returns A unique item ID
     */
    private async generateItemId(): Promise<number> {
        // Get all items to find max ID
        const dueItems = await this.itemRepo.findDue();
        const newItems = await this.itemRepo.findNew();
        const allItems = [...dueItems, ...newItems];

        if (allItems.length === 0) {
            return 1;
        }

        const maxId = Math.max(...allItems.map((i) => i.ID));
        return maxId + 1;
    }
}
