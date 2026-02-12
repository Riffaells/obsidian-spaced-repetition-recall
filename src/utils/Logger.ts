/**
 * Logger utility for structured logging with levels and context.
 * 
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Contextual logging with prefixes
 * - Conditional logging based on settings
 * - Performance-friendly (no-op in production when disabled)
 * 
 * @example
 * ```typescript
 * const logger = Logger.create('MyComponent');
 * logger.info('Component initialized');
 * logger.debug('Processing item', { id: 123 });
 * logger.error('Failed to save', error);
 * ```
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4,
}

export interface LoggerConfig {
    level: LogLevel;
    prefix?: string;
    timestamp?: boolean;
}

export class Logger {
    private static globalLevel: LogLevel = LogLevel.INFO;
    private static globalPrefix: string = "SR";

    private context: string;
    private config: LoggerConfig;

    private constructor(context: string, config?: Partial<LoggerConfig>) {
        this.context = context;
        this.config = {
            level: config?.level ?? Logger.globalLevel,
            prefix: config?.prefix ?? Logger.globalPrefix,
            timestamp: config?.timestamp ?? false,
        };
    }

    /**
     * Create a new logger instance with context.
     */
    static create(context: string, config?: Partial<LoggerConfig>): Logger {
        return new Logger(context, config);
    }

    /**
     * Set global log level for all loggers.
     */
    static setGlobalLevel(level: LogLevel): void {
        Logger.globalLevel = level;
    }

    /**
     * Set global prefix for all loggers.
     */
    static setGlobalPrefix(prefix: string): void {
        Logger.globalPrefix = prefix;
    }

    /**
     * Get current global log level.
     */
    static getGlobalLevel(): LogLevel {
        return Logger.globalLevel;
    }

    /**
     * Check if a log level is enabled.
     */
    private isLevelEnabled(level: LogLevel): boolean {
        return level >= this.config.level;
    }

    /**
     * Format log message with context and timestamp.
     */
    private formatMessage(level: string, message: string): string {
        const parts: string[] = [];

        if (this.config.prefix) {
            parts.push(`[${this.config.prefix}]`);
        }

        if (this.context) {
            parts.push(`[${this.context}]`);
        }

        if (this.config.timestamp) {
            parts.push(`[${new Date().toISOString()}]`);
        }

        parts.push(`${level}:`);
        parts.push(message);

        return parts.join(" ");
    }

    /**
     * Log debug message (lowest priority).
     */
    debug(message: string, ...args: any[]): void {
        if (this.isLevelEnabled(LogLevel.DEBUG)) {
            console.debug(this.formatMessage("DEBUG", message), ...args);
        }
    }

    /**
     * Log info message.
     */
    info(message: string, ...args: any[]): void {
        if (this.isLevelEnabled(LogLevel.INFO)) {
            console.log(this.formatMessage("INFO", message), ...args);
        }
    }

    /**
     * Log warning message.
     */
    warn(message: string, ...args: any[]): void {
        if (this.isLevelEnabled(LogLevel.WARN)) {
            console.warn(this.formatMessage("WARN", message), ...args);
        }
    }

    /**
     * Log error message (highest priority).
     */
    error(message: string, error?: Error | unknown, ...args: any[]): void {
        if (this.isLevelEnabled(LogLevel.ERROR)) {
            if (error instanceof Error) {
                console.error(this.formatMessage("ERROR", message), error.message, error.stack, ...args);
            } else if (error) {
                console.error(this.formatMessage("ERROR", message), error, ...args);
            } else {
                console.error(this.formatMessage("ERROR", message), ...args);
            }
        }
    }

    /**
     * Log object/data for debugging.
     */
    debugObject(label: string, obj: any): void {
        if (this.isLevelEnabled(LogLevel.DEBUG)) {
            console.debug(this.formatMessage("DEBUG", label));
            console.debug(obj);
        }
    }

    /**
     * Log table for debugging (useful for arrays of objects).
     */
    debugTable(label: string, data: any[]): void {
        if (this.isLevelEnabled(LogLevel.DEBUG)) {
            console.debug(this.formatMessage("DEBUG", label));
            console.table(data);
        }
    }

    /**
     * Create a child logger with additional context.
     */
    child(subContext: string): Logger {
        return new Logger(`${this.context}:${subContext}`, this.config);
    }

    /**
     * Measure execution time of a function.
     */
    async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
        if (!this.isLevelEnabled(LogLevel.DEBUG)) {
            return fn();
        }

        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.debug(`${label} completed in ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`${label} failed after ${duration.toFixed(2)}ms`, error);
            throw error;
        }
    }

    /**
     * Measure execution time of a synchronous function.
     */
    measure<T>(label: string, fn: () => T): T {
        if (!this.isLevelEnabled(LogLevel.DEBUG)) {
            return fn();
        }

        const start = performance.now();
        try {
            const result = fn();
            const duration = performance.now() - start;
            this.debug(`${label} completed in ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`${label} failed after ${duration.toFixed(2)}ms`, error);
            throw error;
        }
    }
}

/**
 * Create a logger instance (convenience function).
 */
export function createLogger(context: string, config?: Partial<LoggerConfig>): Logger {
    return Logger.create(context, config);
}

/**
 * Default logger instance for quick usage.
 */
export const logger = Logger.create("SR");
