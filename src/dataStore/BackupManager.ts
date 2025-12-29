import { IAdapter } from "./adapter";
import { TFile } from "obsidian";

export interface BackupInfo {
    path: string;
    timestamp: number;
    size: number;
}

/**
 * BackupManager - handles automatic backups of data files
 */
export class BackupManager {
    private readonly maxBackups = 5;
    private readonly backupDir: string;

    constructor(dataPath: string) {
        const dir = dataPath.substring(0, dataPath.lastIndexOf("/"));
        this.backupDir = `${dir}/backups`;
    }

    /**
     * Create a backup of the source file
     */
    async createBackup(sourcePath: string): Promise<string> {
        const adapter = IAdapter.instance.adapter;

        // Create backups directory if it doesn't exist
        if (!(await adapter.exists(this.backupDir))) {
            await adapter.mkdir(this.backupDir);
        }

        // Generate backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = `${this.backupDir}/tracked_files_${timestamp}.json`;

        // Copy file to backup location
        const data = await adapter.read(sourcePath);
        await adapter.write(backupPath, data);

        // Clean up old backups
        await this.cleanOldBackups();

        console.log(`[BackupManager] Created backup: ${backupPath}`);
        return backupPath;
    }

    /**
     * Remove old backups, keeping only the most recent ones
     */
    async cleanOldBackups(): Promise<void> {
        try {
            const backups = await this.listBackups();

            // Remove old backups beyond the limit
            if (backups.length > this.maxBackups) {
                const adapter = IAdapter.instance.adapter;
                for (let i = this.maxBackups; i < backups.length; i++) {
                    await adapter.remove(backups[i].path);
                    console.log(`[BackupManager] Removed old backup: ${backups[i].path}`);
                }
            }
        } catch (error) {
            console.warn(`[BackupManager] Failed to clean old backups:`, error);
        }
    }

    /**
     * List all available backups
     */
    async listBackups(): Promise<BackupInfo[]> {
        try {
            const adapter = IAdapter.instance.adapter;
            
            if (!(await adapter.exists(this.backupDir))) {
                return [];
            }

            // Get all files in the vault
            const allFiles = IAdapter.instance.vault.getAllLoadedFiles();
            
            // Filter for backup files in our backup directory
            const backupFiles = allFiles.filter((file) => {
                if (!(file instanceof TFile)) return false;
                const filePath = file.path;
                return (
                    filePath.startsWith(this.backupDir) &&
                    filePath.includes("tracked_files_") &&
                    filePath.endsWith(".json")
                );
            }) as TFile[];

            // Map to BackupInfo and sort by modification time (newest first)
            const backups = backupFiles.map((file) => ({
                path: file.path,
                timestamp: file.stat.mtime,
                size: file.stat.size,
            }));

            backups.sort((a, b) => b.timestamp - a.timestamp);

            return backups;
        } catch (error) {
            console.warn(`[BackupManager] Failed to list backups:`, error);
            return [];
        }
    }

    /**
     * Restore data from a backup file
     */
    async restore(backupPath: string, targetPath: string): Promise<void> {
        const adapter = IAdapter.instance.adapter;
        const data = await adapter.read(backupPath);
        await adapter.write(targetPath, data);
        console.log(`[BackupManager] Restored from backup: ${backupPath}`);
    }

    /**
     * Create a special backup for corrupted data
     */
    async createCorruptedBackup(sourcePath: string): Promise<string> {
        const adapter = IAdapter.instance.adapter;

        if (!(await adapter.exists(this.backupDir))) {
            await adapter.mkdir(this.backupDir);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = `${this.backupDir}/corrupted_${timestamp}.json`;

        const data = await adapter.read(sourcePath);
        await adapter.write(backupPath, data);

        console.warn(`[BackupManager] Created corrupted data backup: ${backupPath}`);
        return backupPath;
    }
}
