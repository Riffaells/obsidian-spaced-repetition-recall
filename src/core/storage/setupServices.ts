import { DataAdapter, Vault } from "obsidian";
import { SRSettings } from "../settings/SRSettings";
import { ServiceContainer } from "../infrastructure/ServiceContainer";
import { EventBus } from "../infrastructure/EventBus";
import { SrsDataValidator } from "./SrsDataValidator";
import { SrsDataMigrator } from "./SrsDataMigrator";
import { BackupManager } from "./BackupManager";
import { JsonStorage } from "./JsonStorage";
import { ItemRepository } from "./ItemRepository";
import { FileRepository } from "./FileRepository";
import { ItemService } from "../services/ItemService";
import { FileTrackService } from "../services/FileTrackService";
import { SrsData } from "../../dataStore/interfaces";
import { getStorePath } from "../../dataStore/dataLocation";
import { SrsAlgorithm } from "../../algorithms/algorithms";

/**
 * Setup and configure all services for dependency injection.
 * Registers infrastructure, storage, repository, and service layer components.
 *
 * @param adapter - The Obsidian DataAdapter for file operations
 * @param vault - The Obsidian Vault instance
 * @param settings - The plugin settings
 * @param manifestDir - The plugin manifest directory
 * @param algorithm - Optional SrsAlgorithm instance (defaults to getInstance())
 * @returns A configured ServiceContainer with all services registered
 */
export function setupServices(
    adapter: DataAdapter,
    vault: Vault,
    settings: SRSettings,
    manifestDir: string,
    algorithm?: SrsAlgorithm,
): ServiceContainer {
    const container = new ServiceContainer();

    // Infrastructure Layer
    container.register("eventBus", () => new EventBus());

    // Storage Layer
    const dataPath = getStorePath(manifestDir, settings);

    container.register("validator", () => new SrsDataValidator());
    container.register("migrator", () => new SrsDataMigrator());
    container.register(
        "backupManager",
        () => new BackupManager(adapter, 5), // Keep last 5 backups
    );

    container.register(
        "storage",
        () =>
            new JsonStorage<SrsData>(
                adapter,
                dataPath,
                container.get("validator"),
                container.get("migrator"),
                container.get("backupManager"),
            ),
    );

    // Repository Layer
    container.register("itemRepository", () => {
        const repo = new ItemRepository(container.get("storage"), container.get("eventBus"));
        // Load data on creation (async operation, but we don't await here)
        // The repository will be ready after load() completes
        repo.load().catch((error) => {
            console.error("[setupServices] Failed to load ItemRepository:", error);
        });
        return repo;
    });

    container.register("fileRepository", () => {
        const repo = new FileRepository(container.get("storage"), container.get("eventBus"));
        // Load data on creation (async operation, but we don't await here)
        repo.load().catch((error) => {
            console.error("[setupServices] Failed to load FileRepository:", error);
        });
        return repo;
    });

    // Get algorithm instance (use provided or get singleton)
    const algorithmInstance = algorithm || SrsAlgorithm.getInstance();
    algorithmInstance.updateSettings(settings);

    // Service Layer
    container.register(
        "itemService",
        () =>
            new ItemService(
                container.get("itemRepository"),
                container.get("fileRepository"),
                algorithmInstance,
                container.get("eventBus"),
            ),
    );

    container.register(
        "fileTrackService",
        () =>
            new FileTrackService(
                container.get("itemRepository"),
                container.get("fileRepository"),
                vault,
                algorithmInstance,
            ),
    );

    return container;
}
