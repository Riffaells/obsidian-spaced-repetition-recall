import { TrackedFile } from "../../dataStore/trackedFile";
import { SrsData, DEFAULT_SRS_DATA } from "../../dataStore/interfaces";
import { IFileRepository } from "./IFileRepository";
import { IStorage } from "./IStorage";
import { EventBus } from "../infrastructure/EventBus";
import { Result, createOk, createErr, Err } from "../infrastructure/Result";
import { RepositoryError } from "../infrastructure/errors";

/**
 * Repository implementation for TrackedFile entities.
 * Maintains in-memory indexes for fast lookups by path and index.
 */
export class FileRepository implements IFileRepository {
    // Indexes for fast lookups
    private byPath: Map<string, TrackedFile> = new Map();
    private byIndex: Map<number, TrackedFile> = new Map();

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
            this.byPath.clear();
            this.byIndex.clear();

            data.trackedFiles.forEach((file: TrackedFile, index: number) => {
                file.index = index;
                this.byPath.set(file.path, file);
                this.byIndex.set(index, file);
            });

            return createOk(undefined);
        } else {
            const err = result as Err<any>;
            // If file doesn't exist, that's fine, we start with an empty state
            if (err.error.name === "FileNotFoundError") {
                this.byPath.clear();
                this.byIndex.clear();
                return createOk(undefined);
            }
            return createErr(new RepositoryError("Failed to load data", err.error));
        }
    }

    /**
     * Find a TrackedFile by its file path.
     * Uses cache for O(1) lookup.
     * @param path - The file path
     * @returns The tracked file if found, null otherwise
     */
    async findByPath(path: string): Promise<TrackedFile | null> {
        return this.byPath.get(path) || null;
    }

    /**
     * Find a TrackedFile by its index.
     * Uses index for O(1) lookup.
     * @param index - The file index
     * @returns The tracked file if found, null otherwise
     */
    async findByIndex(index: number): Promise<TrackedFile | null> {
        return this.byIndex.get(index) || null;
    }

    /**
     * List all TrackedFile entities.
     * @returns Array of all tracked files
     */
    async list(): Promise<TrackedFile[]> {
        return Array.from(this.byPath.values());
    }

    /**
     * Save a TrackedFile.
     * Updates cache and indexes, then persists to storage.
     * Emits 'file:updated' event on success.
     * @param file - The tracked file to save
     * @returns A Result indicating success or failure
     */
    async save(file: TrackedFile): Promise<Result<void, RepositoryError>> {
        // Load all data
        const readResult = await this.storage.read();
        let data: SrsData;

        if (readResult.isOk) {
            data = readResult.value;
        } else {
            const err = readResult as Err<any>;
            if (err.error.name === "FileNotFoundError") {
                // If the data file doesn't exist, start with a fresh one
                data = { ...DEFAULT_SRS_DATA, trackedFiles: [] };
            } else {
                // For other errors, bubble them up
                return createErr(new RepositoryError("Failed to read data for saving", err.error));
            }
        }
        
        const index = data.trackedFiles.findIndex((f) => f.path === file.path);

        if (index >= 0) {
            // Update existing file
            file.index = index;
            data.trackedFiles[index] = file;
            this.byIndex.set(index, file);
        } else {
            // Add new file
            file.index = data.trackedFiles.length;
            data.trackedFiles.push(file);
            this.byIndex.set(data.trackedFiles.length - 1, file);
        }

        // Update path index
        this.byPath.set(file.path, file);

        // Save
        const writeResult = await this.storage.write(data);
        if (writeResult.isErr) {
            return createErr(
                new RepositoryError("Failed to write data", writeResult.error),
            );
        }

        // Emit event
        this.eventBus.emit("file:updated", file);

        return createOk(undefined);
    }

    /**
     * Delete a TrackedFile by path.
     * Removes from cache and indexes, then persists to storage.
     * Emits 'file:deleted' event on success.
     * @param path - The file path to delete
     * @returns A Result indicating success or failure
     */
    async delete(path: string): Promise<Result<void, RepositoryError>> {
        const file = this.byPath.get(path);
        if (!file) {
            return createOk(undefined); // Already deleted
        }

        // Remove from cache
        this.byPath.delete(path);

        // Load all data
        const readResult = await this.storage.read();
        if (readResult.isOk) {
            const data = readResult.value;
            data.trackedFiles = data.trackedFiles.filter((f: TrackedFile) => f.path !== path);

            // Rebuild index
            this.byIndex.clear();
            data.trackedFiles.forEach((f: TrackedFile, index: number) => {
                this.byIndex.set(index, f);
            });

            // Save
            const writeResult = await this.storage.write(data);
            if (writeResult.isErr) {
                return createErr(new RepositoryError("Failed to write data", writeResult.error));
            }

            // Emit event
            this.eventBus.emit("file:deleted", path);

            return createOk(undefined);
        } else {
            return createErr(new RepositoryError("Failed to read data", (readResult as Err<any>).error));
        }
    }
}
