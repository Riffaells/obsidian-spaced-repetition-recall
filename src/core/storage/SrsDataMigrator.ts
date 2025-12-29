import { IMigrator } from "./IMigrator";
import { MigrationError } from "../infrastructure/errors";
import { SrsData } from "../../dataStore/interfaces";

/**
 * Handles schema version upgrades for SrsData.
 * Applies sequential transformations to upgrade data from older schema versions
 * to the current version.
 */
export class SrsDataMigrator implements IMigrator<SrsData> {
    private migrations: Map<number, (data: any) => any> = new Map();
    private readonly CURRENT_VERSION = 2;

    constructor() {
        // Register migrations
        this.migrations.set(1, this.migrateV0ToV1.bind(this));
        this.migrations.set(2, this.migrateV1ToV2.bind(this));
    }

    /**
     * Get the current schema version.
     * @returns The current version number
     */
    getCurrentVersion(): number {
        return this.CURRENT_VERSION;
    }

    /**
     * Migrate data from its current version to the latest version.
     * Applies all necessary migrations in sequential order.
     * @param data - The data to migrate
     * @returns A promise resolving to the migrated data
     * @throws {MigrationError} If migration fails
     */
    async migrate(data: any): Promise<SrsData> {
        const dataVersion = data.version || 0;

        // Already at current version
        if (dataVersion === this.getCurrentVersion()) {
            return data as SrsData;
        }

        // Version is newer than current (shouldn't happen)
        if (dataVersion > this.getCurrentVersion()) {
            throw new MigrationError(
                dataVersion,
                this.getCurrentVersion(),
                `Data version ${dataVersion} is newer than current version ${this.getCurrentVersion()}`,
            );
        }

        let migrated = data;

        try {
            // Apply migrations sequentially from data version to current
            for (let v = dataVersion + 1; v <= this.getCurrentVersion(); v++) {
                const migration = this.migrations.get(v);
                if (migration) {
                    migrated = migration(migrated);
                } else {
                    console.warn(`[SrsDataMigrator] No migration found for version ${v}`);
                }
            }

            // Set version to current
            migrated.version = this.getCurrentVersion();

            return migrated as SrsData;
        } catch (error) {
            throw new MigrationError(
                dataVersion,
                this.getCurrentVersion(),
                `Migration failed: ${error.message}`,
            );
        }
    }

    /**
     * Migration from version 0 to version 1.
     * Adds itemType field to all items if missing.
     * @param data - Data at version 0
     * @returns Data at version 1
     */
    private migrateV0ToV1(data: any): any {
        return {
            ...data,
            items: (data.items || []).map((item: any) => ({
                ...item,
                itemType: item.itemType || "note",
            })),
        };
    }

    /**
     * Migration from version 1 to version 2.
     * Ensures deckName field exists on all items.
     * Renames 'deck' field to 'deckName' if present.
     * @param data - Data at version 1
     * @returns Data at version 2
     */
    private migrateV1ToV2(data: any): any {
        return {
            ...data,
            items: (data.items || []).map((item: any) => {
                const deckName = item.deckName || item.deck || "default";
                const { deck, ...rest } = item; // Remove old 'deck' field if present
                return {
                    ...rest,
                    deckName,
                };
            }),
        };
    }
}
