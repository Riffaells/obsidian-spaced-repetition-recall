import { DataAdapter } from "obsidian";

/**
 * Manages backup creation, rotation, and restoration for data files.
 * Creates timestamped backups before save operations and maintains
 * a configurable number of recent backups.
 */
export class BackupManager {
    /**
     * Creates a new BackupManager instance.
     * @param adapter - The Obsidian DataAdapter for file operations
     * @param maxBackups - Maximum number of backups to retain (default: 5)
     */
    constructor(
        private adapter: DataAdapter,
        private maxBackups: number = 5,
    ) {}

    /**
     * Creates a backup of the specified file with a timestamp in the filename.
     * The backup is created in the same directory as the original file.
     *
     * @param path - Path to the file to backup
     * @returns Promise that resolves when backup is created
     * @throws Error if the file doesn't exist or backup creation fails
     */
    async createBackup(path: string): Promise<void> {
        // Check if file exists
        if (!(await this.adapter.exists(path))) {
            throw new Error(`Cannot create backup: file not found at ${path}`);
        }

        // Read the current file data
        const data = await this.adapter.read(path);

        // Create backup path with timestamp
        const timestamp = Date.now();
        const backupPath = `${path}.backup.${timestamp}`;

        // Write backup
        await this.adapter.write(backupPath, data);

        // Clean old backups
        await this.cleanOldBackups(path);
    }

    /**
     * Creates a backup of corrupted data for debugging purposes.
     * Uses a different naming convention (.corrupted) to distinguish
     * from regular backups.
     *
     * @param path - Path to the corrupted file
     * @returns Promise that resolves when corrupted backup is created
     * @throws Error if backup creation fails
     */
    async createCorruptedBackup(path: string): Promise<void> {
        // Check if file exists
        if (!(await this.adapter.exists(path))) {
            throw new Error(
                `Cannot create corrupted backup: file not found at ${path}`,
            );
        }

        // Read the corrupted file data
        const data = await this.adapter.read(path);

        // Create corrupted backup path with timestamp
        const timestamp = Date.now();
        const backupPath = `${path}.corrupted.${timestamp}`;

        // Write corrupted backup
        await this.adapter.write(backupPath, data);
    }

    /**
     * Restores data from a backup file to the original location.
     *
     * @param path - Path to the original file location
     * @param backupPath - Path to the backup file to restore from
     * @returns Promise that resolves when restoration is complete
     * @throws Error if backup file doesn't exist or restoration fails
     */
    async restore(path: string, backupPath: string): Promise<void> {
        // Check if backup exists
        if (!(await this.adapter.exists(backupPath))) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }

        // Read backup data
        const data = await this.adapter.read(backupPath);

        // Write to original location
        await this.adapter.write(path, data);
    }

    /**
     * Removes old backup files, keeping only the most recent N backups.
     * Backups are identified by the .backup.{timestamp} pattern.
     *
     * @param path - Path to the original file
     * @returns Promise that resolves when cleanup is complete
     */
    private async cleanOldBackups(path: string): Promise<void> {
        try {
            // Get the directory containing the file
            const dirPath = this.getDirectoryPath(path);
            const fileName = this.getFileName(path);

            // List all files in the directory
            const files = await this.adapter.list(dirPath);

            // Filter for backup files matching this file
            const backupPattern = `${fileName}.backup.`;
            const backupFiles = files.files
                .filter((file) => file.includes(backupPattern))
                .map((file) => {
                    // Extract timestamp from filename
                    const match = file.match(/\.backup\.(\d+)$/);
                    if (match) {
                        return {
                            path: file,
                            timestamp: parseInt(match[1], 10),
                        };
                    }
                    return null;
                })
                .filter((item) => item !== null) as Array<{
                path: string;
                timestamp: number;
            }>;

            // Sort by timestamp (newest first)
            backupFiles.sort((a, b) => b.timestamp - a.timestamp);

            // Delete backups beyond maxBackups
            const backupsToDelete = backupFiles.slice(this.maxBackups);
            for (const backup of backupsToDelete) {
                await this.adapter.remove(backup.path);
            }
        } catch (error) {
            // Log error but don't fail the backup operation
            console.error(`Error cleaning old backups for ${path}:`, error);
        }
    }

    /**
     * Extracts the directory path from a full file path.
     * @param path - Full file path
     * @returns Directory path
     */
    private getDirectoryPath(path: string): string {
        const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
        return lastSlash >= 0 ? path.substring(0, lastSlash) : "";
    }

    /**
     * Extracts the file name from a full file path.
     * @param path - Full file path
     * @returns File name
     */
    private getFileName(path: string): string {
        const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
        return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
    }
}
