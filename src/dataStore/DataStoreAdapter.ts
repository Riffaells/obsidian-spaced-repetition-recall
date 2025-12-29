import { SRSettings } from "../settings/settings";
import { TFile, TFolder, Vault, getAllTags, MetadataCache } from "obsidian";
import { SrsAlgorithm } from "../algorithms/algorithms";
import { TrackedFile, CardInfo } from "./trackedFile";
import { RepetitionItem, RPITEMTYPE } from "./repetitionItem";
import { Queue } from "./queue";
import { SrsData, ReviewedCounts, DEFAULT_SRS_DATA } from "./interfaces";
import { ItemService } from "../core/services/ItemService";
import { FileTrackService } from "../core/services/FileTrackService";
import { IItemRepository } from "../core/storage/IItemRepository";
import { IFileRepository } from "../core/storage/IFileRepository";
import { IStorage } from "../core/storage/IStorage";
import { EventBus } from "../core/infrastructure/EventBus";
import { t } from "../lang/helpers";
import { MiscUtils } from "../utils/utils_recall";
import { Tags } from "../utils/tags";

/**
 * DataStoreAdapter - Adapter layer for gradual migration from old DataStore to new architecture.
 * 
 * This class implements the same interface as the old DataStore class but delegates
 * operations to the new service layer internally. This allows for gradual migration
 * of calling code while maintaining backward compatibility.
 * 
 * Requirements: 16.1-16.5, 17.1-17.5
 */
export class DataStoreAdapter {
    static instance: DataStoreAdapter;

    /**
     * @type {SrsData}
     */
    data: SrsData;
    
    settings: SRSettings;
    dataPath: string;

    // New architecture services
    private itemService: ItemService;
    private fileTrackService: FileTrackService;
    private itemRepo: IItemRepository;
    private fileRepo: IFileRepository;
    private storage: IStorage<SrsData>;
    private eventBus: EventBus;
    private vault: Vault;
    private metadataCache: MetadataCache;

    public static getInstance(): DataStoreAdapter {
        if (!DataStoreAdapter.instance) {
            throw Error("there is not DataStoreAdapter instance.");
        }
        return DataStoreAdapter.instance;
    }

    constructor(
        settings: SRSettings,
        manifestDir: string,
        itemService: ItemService,
        fileTrackService: FileTrackService,
        itemRepo: IItemRepository,
        fileRepo: IFileRepository,
        storage: IStorage<SrsData>,
        eventBus: EventBus,
        vault: Vault,
        metadataCache: MetadataCache,
    ) {
        this.settings = settings;
        this.dataPath = ""; // Will be set by storage
        this.itemService = itemService;
        this.fileTrackService = fileTrackService;
        this.itemRepo = itemRepo;
        this.fileRepo = fileRepo;
        this.storage = storage;
        this.eventBus = eventBus;
        this.vault = vault;
        this.metadataCache = metadataCache;
        
        // Initialize with default data
        this.data = Object.assign({}, DEFAULT_SRS_DATA);
        
        DataStoreAdapter.instance = this;
    }

    /**
     * Convert plain objects to class instances.
     * Maintains compatibility with old DataStore behavior.
     */
    toInstances() {
        this.data.trackedFiles = this.data.trackedFiles.map(TrackedFile.create);
        this.data.items = this.data.items.map(RepetitionItem.create);
        this.data.queues = Queue.create(this.data.queues);
    }

    /**
     * Load data from storage.
     * Delegates to new storage layer.
     */
    async load(path?: string) {
        try {
            // Load data through new storage layer
            const result = await this.storage.read();
            
            if (result.isOk) {
                // console.log("Reading tracked files...");
                this.data = result.value;
                this.data.mtime = Date.now(); // Set current time
            } else {
                console.log("Unable to read SRS data!");
                this.data = Object.assign({}, DEFAULT_SRS_DATA);
                await this.save();
            }
        } catch (error) {
            console.log(error + " Tracked files not found! Creating new file...");
            this.data = Object.assign({}, DEFAULT_SRS_DATA);
            await this.save();
        }
        
        this.toInstances();
    }

    /**
     * Reload if data has been updated by another device.
     */
    async reLoad() {
        // For now, just reload unconditionally
        await this.load();
    }

    /**
     * Save data to storage.
     * Delegates to new storage layer.
     */
    async save() {
        try {
            const result = await this.storage.write(this.data);
            if (result.isErr) {
                console.error("Failed to save data:", result.error);
            }
        } catch (error) {
            console.error("Error saving data:", error);
        }
    }

    /**
     * Get item by ID.
     */
    getItembyID(id: number): RepetitionItem {
        return this.data.items.find(item => item?.ID === id);
    }

    /**
     * Get items for a file.
     */
    getItemsOfFile(path: string): RepetitionItem[] {
        const file = this.getTrackedFile(path);
        if (!file || !file.isTracked) {
            return [];
        }
        return file.itemIDs.map(id => this.getItembyID(id)).filter(item => item != null);
    }

    /**
     * Get file index by path.
     */
    getFileIndex(path: string): number {
        return this.data.trackedFiles.findIndex(file => file?.path === path);
    }

    /**
     * Get tracked file by path.
     */
    getTrackedFile(path: string): TrackedFile {
        const index = this.getFileIndex(path);
        return index >= 0 ? this.data.trackedFiles[index] : null;
    }

    /**
     * Check if file is tracked.
     */
    isInTrackedFiles(path: string): boolean {
        return this.getFileIndex(path) >= 0;
    }

    /**
     * Track a file.
     */
    trackFile(path: string, type: RPITEMTYPE, notice: boolean = true): { added: number; removed: number } | null {
        const file = this.vault.getAbstractFileByPath(path);
        if (!file) {
            console.error(`File not found: ${path}`);
            return null;
        }

        const index = this.getFileIndex(path);
        let trackedFile: TrackedFile;
        
        if (index < 0) {
            // New file
            trackedFile = new TrackedFile(path, type, "default");
            this.data.trackedFiles.push(trackedFile);
        } else {
            // Existing file
            trackedFile = this.data.trackedFiles[index];
            if (!trackedFile.isTracked) {
                trackedFile.setTracked(type, "default");
            }
        }

        // Create item for the file
        const fileIndex = this.getFileIndex(path);
        const itemId = this.maxItemId + 1;
        const algorithm = SrsAlgorithm.getInstance();
        const item = new RepetitionItem(itemId, fileIndex, type, "default", algorithm.defaultData());
        
        this.data.items.push(item);
        trackedFile.items = { file: itemId };

        return { added: 1, removed: 0 };
    }

    /**
     * Untrack a file.
     */
    untrackFile(path: string, notice: boolean = true): number {
        const index = this.getFileIndex(path);
        if (index < 0) {
            return 0;
        }

        const trackedFile = this.data.trackedFiles[index];
        if (!trackedFile || !trackedFile.isTracked) {
            return 0;
        }

        // Remove all items for this file
        const itemIds = trackedFile.itemIDs;
        let removed = 0;
        
        itemIds.forEach(id => {
            const itemIndex = this.data.items.findIndex(item => item?.ID === id);
            if (itemIndex >= 0) {
                this.data.items.splice(itemIndex, 1);
                removed++;
            }
        });

        // Mark file as untracked
        trackedFile.setUnTracked();

        return removed;
    }

    /**
     * Review an item.
     */
    reviewId(itemId: number, option: string | number): number {
        const item = this.getItembyID(itemId);
        if (!item) {
            return -1;
        }

        const algorithm = SrsAlgorithm.getInstance();
        if (typeof option === "number") {
            option = algorithm.srsOptions()[option] as string;
        }

        const result = algorithm.onSelection(item, option, false);
        item.reviewUpdate(result);

        return 0;
    }

    /**
     * Get max item ID.
     */
    get maxItemId(): number {
        return Math.max(
            ...this.data.items.map(item => item?.ID ?? 0),
            0
        );
    }

    /**
     * Get total number of items.
     */
    get itemSize(): number {
        return this.data.items.length;
    }

    /**
     * Get file path for an item.
     */
    getFilePath(item: RepetitionItem): string | null {
        const trackedFile = this.data.trackedFiles[item.fileIndex];
        return trackedFile?.path ?? null;
    }

    /**
     * Reset all data.
     */
    resetData(): void {
        this.data = Object.assign({}, DEFAULT_SRS_DATA);
    }

}
