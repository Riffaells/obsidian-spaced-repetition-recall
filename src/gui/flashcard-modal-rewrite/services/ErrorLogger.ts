export enum ErrorSeverity {
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR",
    CRITICAL = "CRITICAL",
}

export interface ErrorContext {
    component?: string;
    action?: string;
    card?: any;
    deck?: any;
    [key: string]: any;
}

export interface LogEntry {
    timestamp: number;
    severity: ErrorSeverity;
    message: string;
    context?: ErrorContext;
    error?: Error;
}

/**
 * Service for logging errors and events in the flashcard modal
 * Requirements: 10.4
 */
export class ErrorLogger {
    private static instance: ErrorLogger;
    private logs: LogEntry[] = [];

    private constructor() {}

    static getInstance(): ErrorLogger {
        if (!ErrorLogger.instance) {
            ErrorLogger.instance = new ErrorLogger();
        }
        return ErrorLogger.instance;
    }

    log(
        message: string,
        severity: ErrorSeverity = ErrorSeverity.INFO,
        context?: ErrorContext,
        error?: Error,
    ): void {
        const entry: LogEntry = {
            timestamp: Date.now(),
            severity,
            message,
            context,
            error,
        };

        this.logs.push(entry);

        // Console output
        const prefix = `[SR-Plugin][${severity}]`;
        if (severity === ErrorSeverity.ERROR || severity === ErrorSeverity.CRITICAL) {
            console.error(prefix, message, context, error);
        } else if (severity === ErrorSeverity.WARNING) {
            console.warn(prefix, message, context);
        } else {
            console.log(prefix, message, context);
        }
    }

    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    clearLogs(): void {
        this.logs = [];
    }
}
