/**
 * PluginLifecycle - Plugin lifecycle management
 * 
 * Responsibilities:
 * - Plugin initialization on load
 * - Setup of all components and services
 * - Settings migration
 * - Resource cleanup on unload
 * 
 * This class isolates initialization logic from the main plugin class,
 * making the code more modular and testable.
 */

import { Plugin, TFile } from "obsidian";
import { SRSettings } from "src/settings/settings";
import { NoteEaseList } from "src/core/scheduling/NoteEaseList";
import { QuestionPostponementList } from "src/core/scheduling/QuestionPostponementList";
import { EventBus } from "src/core/infrastructure/EventBus";
import { RepetitionItem } from "src/dataStore/repetitionItem";
import { TrackedFile } from "src/dataStore/trackedFile";
import { setupServices } from "src/core/storage/setupServices";
import { ServiceContainer } from "src/core/infrastructure/ServiceContainer";
import { algorithms } from "src/algorithms/algorithms_switch";
import { SrsAlgorithm } from "src/algorithms/algorithms";
import { DataStore } from "src/dataStore/data";
import { IAdapter } from "src/dataStore/adapter";
import { IReviewNote } from "src/reviewNote/review-note";
import { ReviewView } from "src/gui/views/reviewView";
import { MixQueSet } from "src/dataStore/mixQueSet";
import { SettingsMigration } from "src/core/settings/SettingsMigration";
import { Logger, LogLevel } from "src/utils/Logger";
import { isVersionNewerThanOther } from "src/utils/utils_recall";
import { ReleaseNotes } from "src/gui/modals/ReleaseNotes";
import { appIcon } from "src/icons/appicon";
import { setDebugParser } from "src/parser";
import type SRPlugin from "src/main";

const logger = Logger.create("PluginLifecycle");

export class PluginLifecycle {
    constructor(private plugin: SRPlugin) {}

    /**
     * Главный метод инициализации плагина
     * Вызывается при загрузке плагина в Obsidian
     */

    /**
     * Main plugin initialization method
     * Called when the plugin loads in Obsidian
     */
    async initialize(): Promise<void> {
        const plugin = this.plugin;
        
        // Initialize singleton instance
        IAdapter.create(plugin.app);
        
        // Load plugin data
        await plugin.loadPluginData();
        
        // Initialize core components
        plugin.easeByPath = new NoteEaseList(plugin.data.settings);
        plugin.questionPostponementList = new QuestionPostponementList(
            plugin,
            plugin.data.settings,
            plugin.data.buryList,
        );

        // Setup icon
        appIcon();

        // Handle release notes
        await this.handleReleaseNotes();

        const settings = plugin.data.settings;

        // Configure logging
        this.configureLogging(settings);

        // Migrate settings if needed
        await this.migrateSettings(settings);

        // Initialize algorithm
        await this.initializeAlgorithm(settings);

        // Initialize new architecture services
        await this.initializeServices(settings);

        // Initialize legacy components
        this.initializeLegacyComponents(settings);
    }

    /**
     * Показывает release notes если версия плагина обновилась
     */

    /**
     * Shows release notes if plugin version has been updated
     */
    private async handleReleaseNotes(): Promise<void> {
        const plugin = this.plugin;
        const PLUGIN_VERSION = plugin.manifest.version;
        const obsidianJustInstalled = plugin.data.settings.previousRelease === "0.0.0";
        
        if (isVersionNewerThanOther(PLUGIN_VERSION, plugin.data.settings.previousRelease)) {
            new ReleaseNotes(
                plugin.app,
                plugin,
                obsidianJustInstalled ? null : PLUGIN_VERSION
            ).open();
        }
    }

    /**
     * Configures logging level based on settings
     */
    private configureLogging(settings: SRSettings): void {
        if (settings.showSchedulingDebugMessages) {
            Logger.setGlobalLevel(LogLevel.DEBUG);
        } else {
            Logger.setGlobalLevel(LogLevel.INFO);
        }
    }

    /**
     * Performs settings migration if required
     */
    private async migrateSettings(settings: SRSettings): Promise<void> {
        if (SettingsMigration.migrate(settings)) {
            await this.plugin.savePluginData();
            logger.info("Settings migrated to new format");
        }
    }

    /**
     * Initializes spaced repetition algorithm (FSRS, Anki, etc.)
     */
    private async initializeAlgorithm(settings: SRSettings): Promise<void> {
        const plugin = this.plugin;
        plugin.algorithm = algorithms[settings.algorithm];
        plugin.algorithm.updateSettings(settings.algorithmSettings[settings.algorithm]);
        settings.algorithmSettings[settings.algorithm] = plugin.algorithm.settings;
        await plugin.savePluginData();
    }

    /**
     * Initializes new architecture services (ServiceContainer, EventBus)
     */
    private async initializeServices(settings: SRSettings): Promise<void> {
        const plugin = this.plugin;
        logger.info("Initializing new architecture services...");
        
        plugin.serviceContainer = setupServices(
            plugin.app.vault.adapter,
            plugin.app.vault,
            settings,
            plugin.manifest.dir,
            plugin.algorithm,
        );

        // Subscribe to events
        const eventBus = plugin.serviceContainer.get<EventBus>("eventBus");
        eventBus.on("item:updated", (item: RepetitionItem) => {
            logger.debug("Item updated event", { itemId: item.ID });
        });
        eventBus.on("item:reviewed", (item: RepetitionItem) => {
            logger.debug("Item reviewed event", { itemId: item.ID });
        });
        eventBus.on("file:updated", (file: TrackedFile) => {
            logger.debug("File updated event", { path: file.path });
        });
        
        logger.info("New architecture services initialized successfully");
    }

    /**
     * Initializes legacy components for backward compatibility
     */
    private initializeLegacyComponents(settings: SRSettings): void {
        const plugin = this.plugin;
        
        IReviewNote.create(
            settings,
            plugin.sync_onNote.bind(plugin),
            plugin.tagCheck.bind(plugin),
            plugin.noteIsNew.bind(plugin),
            plugin.saveReviewResponse_onNote.bind(plugin),
        );
        
        ReviewView.create(plugin, settings);
        
        MixQueSet.create(
            settings.mixDue,
            settings.mixNew,
            settings.mixCard,
            settings.mixNote
        );
        
        setDebugParser(settings.showParserDebugMessages);
    }

    /**
     * Cleans up resources on plugin unload
     */

    cleanup(): void {
        const plugin = this.plugin;
        logger.info("Unloading Obsidian spaced repetition Flow...");

        if (plugin.tabViewManager) {
            plugin.tabViewManager.closeAllTabViews();
            plugin.tabViewManager.unregisterAllTabViews();
        }

        if (plugin.reviewFloatBar) {
            plugin.reviewFloatBar.close();
        }

        if (plugin.noteReviewManager) {
            plugin.noteReviewManager.destroy();
        }
    }
}
