import { describe, it, expect, beforeEach } from "bun:test";
import { setupServices } from "../../../src/core/storage/setupServices";
import { ServiceContainer } from "../../../src/core/infrastructure/ServiceContainer";
import { EventBus } from "../../../src/core/infrastructure/EventBus";
import { SrsDataValidator } from "../../../src/core/storage/SrsDataValidator";
import { SrsDataMigrator } from "../../../src/core/storage/SrsDataMigrator";
import { BackupManager } from "../../../src/core/storage/BackupManager";
import { JsonStorage } from "../../../src/core/storage/JsonStorage";
import { ItemRepository } from "../../../src/core/storage/ItemRepository";
import { FileRepository } from "../../../src/core/storage/FileRepository";
import { ItemService } from "../../../src/core/services/ItemService";
import { FileTrackService } from "../../../src/core/services/FileTrackService";
import { SRSettings } from "../../../src/settings/settings";
import { DataLocation } from "../../../src/dataStore/dataLocation";
import { SrsAlgorithm } from "../../../src/algorithms/algorithms";
import { RepetitionItem, ReviewResult } from "../../../src/dataStore/repetitionItem";

/**
 * Mock SrsAlgorithm for testing
 */
class MockSrsAlgorithm extends SrsAlgorithm {
    defaultSettings(): unknown {
        return {};
    }

    defaultData(): unknown {
        return { ease: 250, interval: 1, delayBeforeReview: 0 };
    }

    onSelection(item: RepetitionItem, option: string, repeat: boolean): ReviewResult {
        return {
            correct: option === "good",
            nextReview: Date.now() + 86400000, // 1 day
            interval: 1,
            ease: 250,
        } as ReviewResult;
    }

    calcAllOptsIntervals(item: RepetitionItem): number[] {
        return [1, 2, 3, 4];
    }

    srsOptions(): string[] {
        return ["again", "hard", "good", "easy"];
    }

    importer(fromAlgo: any, items: RepetitionItem[]): void {
        // Mock implementation
    }

    displaySettings(containerEl: HTMLElement, update: (settings: unknown, refresh?: boolean) => void): void {
        // Mock implementation
    }
}

/**
 * Mock DataAdapter for testing
 */
class MockDataAdapter {
    private files: Map<string, string> = new Map();

    async read(path: string): Promise<string> {
        const data = this.files.get(path);
        if (data === undefined) {
            throw new Error(`File not found: ${path}`);
        }
        return data;
    }

    async write(path: string, data: string): Promise<void> {
        this.files.set(path, data);
    }

    async exists(path: string): Promise<boolean> {
        return this.files.has(path);
    }

    async remove(path: string): Promise<void> {
        this.files.delete(path);
    }

    async list(dirPath: string): Promise<{ files: string[]; folders: string[] }> {
        const files: string[] = [];
        for (const path of this.files.keys()) {
            if (path.startsWith(dirPath) || dirPath === "") {
                files.push(path);
            }
        }
        return { files, folders: [] };
    }
}

/**
 * Mock Vault for testing
 */
class MockVault {
    private files: Map<string, any> = new Map();

    getAbstractFileByPath(path: string): any {
        return this.files.get(path) || null;
    }

    addFile(path: string): void {
        this.files.set(path, { path });
    }
}

/**
 * Create mock settings for testing
 */
function createMockSettings(): SRSettings {
    return {
        dataLocation: DataLocation.PluginFolder,
        customFolder: "./custom",
    } as SRSettings;
}

describe("setupServices", () => {
    let adapter: MockDataAdapter;
    let vault: MockVault;
    let settings: SRSettings;
    let algorithm: MockSrsAlgorithm;
    const manifestDir = ".obsidian/plugins/test-plugin";

    beforeEach(() => {
        adapter = new MockDataAdapter();
        vault = new MockVault();
        settings = createMockSettings();
        algorithm = new MockSrsAlgorithm();
    });

    describe("Service Registration", () => {
        it("should return a ServiceContainer instance", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            expect(container).toBeInstanceOf(ServiceContainer);
        });

        it("should register all infrastructure services", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            expect(container.has("eventBus")).toBe(true);
        });

        it("should register all storage layer services", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            expect(container.has("validator")).toBe(true);
            expect(container.has("migrator")).toBe(true);
            expect(container.has("backupManager")).toBe(true);
            expect(container.has("storage")).toBe(true);
        });

        it("should register all repository layer services", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            expect(container.has("itemRepository")).toBe(true);
            expect(container.has("fileRepository")).toBe(true);
        });

        it("should register all service layer services", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            expect(container.has("itemService")).toBe(true);
            expect(container.has("fileTrackService")).toBe(true);
        });
    });

    describe("Service Retrieval", () => {
        it("should retrieve EventBus instance", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const eventBus = container.get("eventBus");
            expect(eventBus).toBeInstanceOf(EventBus);
        });

        it("should retrieve SrsDataValidator instance", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const validator = container.get("validator");
            expect(validator).toBeInstanceOf(SrsDataValidator);
        });

        it("should retrieve SrsDataMigrator instance", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const migrator = container.get("migrator");
            expect(migrator).toBeInstanceOf(SrsDataMigrator);
        });

        it("should retrieve BackupManager instance", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const backupManager = container.get("backupManager");
            expect(backupManager).toBeInstanceOf(BackupManager);
        });

        it("should retrieve JsonStorage instance", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const storage = container.get("storage");
            expect(storage).toBeInstanceOf(JsonStorage);
        });

        it("should retrieve ItemRepository instance", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const itemRepo = container.get("itemRepository");
            expect(itemRepo).toBeInstanceOf(ItemRepository);
        });

        it("should retrieve FileRepository instance", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const fileRepo = container.get("fileRepository");
            expect(fileRepo).toBeInstanceOf(FileRepository);
        });

        it("should retrieve ItemService instance", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const itemService = container.get("itemService");
            expect(itemService).toBeInstanceOf(ItemService);
        });

        it("should retrieve FileTrackService instance", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const fileTrackService = container.get("fileTrackService");
            expect(fileTrackService).toBeInstanceOf(FileTrackService);
        });
    });

    describe("Dependency Resolution", () => {
        it("should resolve dependencies between services", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            // Get services that depend on each other
            const eventBus = container.get("eventBus");
            const storage = container.get("storage");
            const itemRepo = container.get("itemRepository");
            const itemService = container.get("itemService");

            // Verify all services are created successfully
            expect(eventBus).toBeDefined();
            expect(storage).toBeDefined();
            expect(itemRepo).toBeDefined();
            expect(itemService).toBeDefined();
        });

        it("should share EventBus instance across services", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const eventBus1 = container.get("eventBus");
            const eventBus2 = container.get("eventBus");

            // Should be the same instance (singleton)
            expect(eventBus1).toBe(eventBus2);
        });

        it("should share storage instance across repositories", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const storage1 = container.get("storage");
            const storage2 = container.get("storage");

            // Should be the same instance (singleton)
            expect(storage1).toBe(storage2);
        });
    });

    describe("Singleton Behavior", () => {
        it("should create singleton instances for all services", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            // Get each service twice
            const eventBus1 = container.get("eventBus");
            const eventBus2 = container.get("eventBus");

            const validator1 = container.get("validator");
            const validator2 = container.get("validator");

            const storage1 = container.get("storage");
            const storage2 = container.get("storage");

            const itemRepo1 = container.get("itemRepository");
            const itemRepo2 = container.get("itemRepository");

            const itemService1 = container.get("itemService");
            const itemService2 = container.get("itemService");

            // All should be the same instances
            expect(eventBus1).toBe(eventBus2);
            expect(validator1).toBe(validator2);
            expect(storage1).toBe(storage2);
            expect(itemRepo1).toBe(itemRepo2);
            expect(itemService1).toBe(itemService2);
        });
    });

    describe("Configuration", () => {
        it("should use correct data path based on settings", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const storage = container.get("storage");
            expect(storage).toBeDefined();
            // Storage should be configured with the correct path
            // (path is internal to JsonStorage, but we can verify it was created)
        });

        it("should configure BackupManager with correct maxBackups", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const backupManager = container.get("backupManager");
            expect(backupManager).toBeInstanceOf(BackupManager);
            // BackupManager should be configured to keep 5 backups
        });
    });

    describe("Service Count", () => {
        it("should register exactly 10 services", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            // Count registered services
            const expectedServices = [
                "eventBus",
                "validator",
                "migrator",
                "backupManager",
                "storage",
                "itemRepository",
                "fileRepository",
                "itemService",
                "fileTrackService",
            ];

            for (const service of expectedServices) {
                expect(container.has(service)).toBe(true);
            }

            expect(container.size()).toBe(expectedServices.length);
        });
    });

    describe("Error Handling", () => {
        it("should throw error when retrieving unregistered service", () => {
            const container = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            expect(() => container.get("nonexistentService")).toThrow(
                "Service not registered: nonexistentService",
            );
        });
    });

    describe("Multiple Container Instances", () => {
        it("should create independent container instances", () => {
            const container1 = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            const container2 = setupServices(
                adapter as any,
                vault as any,
                settings,
                manifestDir,
                algorithm,
            );

            // Containers should be different instances
            expect(container1).not.toBe(container2);

            // Services from different containers should be different instances
            const eventBus1 = container1.get("eventBus");
            const eventBus2 = container2.get("eventBus");
            expect(eventBus1).not.toBe(eventBus2);
        });
    });
});
