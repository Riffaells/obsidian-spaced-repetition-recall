/**
 * Safe wrapper for localStorage/sessionStorage with error handling and type safety.
 * Handles quota exceeded errors and provides fallback mechanisms.
 * 
 * @example
 * ```typescript
 * const storage = new SafeStorage('localStorage', 'sr-plugin');
 * 
 * storage.set('settings', { theme: 'dark' });
 * const settings = storage.get('settings', { theme: 'light' });
 * ```
 */
export class SafeStorage {
    private storage: Storage | null = null;
    private prefix: string;
    private fallbackCache: Map<string, string> = new Map();

    constructor(
        storageType: "localStorage" | "sessionStorage" = "localStorage",
        prefix: string = "",
    ) {
        this.prefix = prefix;
        try {
            this.storage =
                storageType === "localStorage"
                    ? window.localStorage
                    : window.sessionStorage;
            // Test if storage is available
            const testKey = `__test_${Date.now()}__`;
            this.storage.setItem(testKey, "test");
            this.storage.removeItem(testKey);
        } catch (e) {
            console.warn("Storage not available, using in-memory fallback", e);
            this.storage = null;
        }
    }

    /**
     * Gets the full key with prefix.
     */
    private getKey(key: string): string {
        return this.prefix ? `${this.prefix}:${key}` : key;
    }

    /**
     * Sets a value in storage.
     * 
     * @param key - Storage key
     * @param value - Value to store (will be JSON stringified)
     * @returns true if successful, false otherwise
     */
    set<T>(key: string, value: T): boolean {
        const fullKey = this.getKey(key);
        try {
            const serialized = JSON.stringify(value);
            if (this.storage) {
                this.storage.setItem(fullKey, serialized);
            } else {
                this.fallbackCache.set(fullKey, serialized);
            }
            return true;
        } catch (e) {
            if (e instanceof Error && e.name === "QuotaExceededError") {
                console.warn("Storage quota exceeded", e);
                // Try to clear old items
                this.clearOldest(5);
                // Retry once
                try {
                    const serialized = JSON.stringify(value);
                    if (this.storage) {
                        this.storage.setItem(fullKey, serialized);
                    } else {
                        this.fallbackCache.set(fullKey, serialized);
                    }
                    return true;
                } catch (retryError) {
                    console.error("Failed to store after clearing old items", retryError);
                }
            } else {
                console.error("Failed to store value", e);
            }
            return false;
        }
    }

    /**
     * Gets a value from storage.
     * 
     * @param key - Storage key
     * @param defaultValue - Default value if key doesn't exist
     * @returns The stored value or default value
     */
    get<T>(key: string, defaultValue?: T): T | undefined {
        const fullKey = this.getKey(key);
        try {
            let serialized: string | null = null;
            if (this.storage) {
                serialized = this.storage.getItem(fullKey);
            } else {
                serialized = this.fallbackCache.get(fullKey) || null;
            }

            if (serialized === null) {
                return defaultValue;
            }

            return JSON.parse(serialized) as T;
        } catch (e) {
            console.error("Failed to retrieve value", e);
            return defaultValue;
        }
    }

    /**
     * Removes a value from storage.
     */
    remove(key: string): void {
        const fullKey = this.getKey(key);
        try {
            if (this.storage) {
                this.storage.removeItem(fullKey);
            } else {
                this.fallbackCache.delete(fullKey);
            }
        } catch (e) {
            console.error("Failed to remove value", e);
        }
    }

    /**
     * Checks if a key exists in storage.
     */
    has(key: string): boolean {
        const fullKey = this.getKey(key);
        try {
            if (this.storage) {
                return this.storage.getItem(fullKey) !== null;
            } else {
                return this.fallbackCache.has(fullKey);
            }
        } catch (e) {
            console.error("Failed to check key existence", e);
            return false;
        }
    }

    /**
     * Clears all items with the current prefix.
     */
    clear(): void {
        try {
            if (this.storage) {
                const keysToRemove: string[] = [];
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach((key) => this.storage!.removeItem(key));
            } else {
                const keysToRemove: string[] = [];
                for (const key of this.fallbackCache.keys()) {
                    if (key.startsWith(this.prefix)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach((key) => this.fallbackCache.delete(key));
            }
        } catch (e) {
            console.error("Failed to clear storage", e);
        }
    }

    /**
     * Gets all keys with the current prefix.
     */
    keys(): string[] {
        const keys: string[] = [];
        try {
            if (this.storage) {
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        keys.push(key.substring(this.prefix.length + 1));
                    }
                }
            } else {
                for (const key of this.fallbackCache.keys()) {
                    if (key.startsWith(this.prefix)) {
                        keys.push(key.substring(this.prefix.length + 1));
                    }
                }
            }
        } catch (e) {
            console.error("Failed to get keys", e);
        }
        return keys;
    }

    /**
     * Gets the approximate size of stored data in bytes.
     */
    getSize(): number {
        let size = 0;
        try {
            if (this.storage) {
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        const value = this.storage.getItem(key);
                        if (value) {
                            size += key.length + value.length;
                        }
                    }
                }
            } else {
                for (const [key, value] of this.fallbackCache.entries()) {
                    if (key.startsWith(this.prefix)) {
                        size += key.length + value.length;
                    }
                }
            }
        } catch (e) {
            console.error("Failed to calculate size", e);
        }
        return size * 2; // Approximate bytes (UTF-16)
    }

    /**
     * Clears the oldest N items to free up space.
     */
    private clearOldest(count: number): void {
        const keys = this.keys();
        const toRemove = keys.slice(0, Math.min(count, keys.length));
        toRemove.forEach((key) => this.remove(key));
    }

    /**
     * Checks if storage is available.
     */
    isAvailable(): boolean {
        return this.storage !== null;
    }
}
