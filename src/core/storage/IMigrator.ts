/**
 * Interface for handling schema version upgrades.
 * Migrators apply sequential transformations to upgrade data from older schema versions
 * to the current version.
 *
 * @template T - The type of data being migrated
 */
export interface IMigrator<T> {
    /**
     * Get the current schema version.
     * @returns The current version number
     */
    getCurrentVersion(): number;

    /**
     * Migrate data from its current version to the latest version.
     * Applies all necessary migrations in sequential order.
     * @param data - The data to migrate
     * @returns A promise resolving to the migrated data
     */
    migrate(data: any): Promise<T>;
}
