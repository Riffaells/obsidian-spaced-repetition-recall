/**
 * Performance monitoring utility for tracking operation durations and identifying bottlenecks.
 * 
 * @example
 * ```typescript
 * const monitor = PerformanceMonitor.getInstance();
 * 
 * // Measure a synchronous operation
 * monitor.measure('parseNote', () => {
 *   // expensive parsing logic
 * });
 * 
 * // Measure an async operation
 * await monitor.measureAsync('loadFile', async () => {
 *   return await vault.read(file);
 * });
 * 
 * // Get statistics
 * console.log(monitor.getStats('parseNote'));
 * ```
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private measurements: Map<string, number[]> = new Map();
    private enabled: boolean = false;

    private constructor() {}

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Enables performance monitoring.
     */
    enable(): void {
        this.enabled = true;
    }

    /**
     * Disables performance monitoring.
     */
    disable(): void {
        this.enabled = false;
    }

    /**
     * Checks if monitoring is enabled.
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Measures the execution time of a synchronous function.
     * 
     * @param label - Label for this measurement
     * @param fn - Function to measure
     * @returns The result of the function
     */
    measure<T>(label: string, fn: () => T): T {
        if (!this.enabled) return fn();

        const start = performance.now();
        try {
            return fn();
        } finally {
            const duration = performance.now() - start;
            this.recordMeasurement(label, duration);
        }
    }

    /**
     * Measures the execution time of an async function.
     * 
     * @param label - Label for this measurement
     * @param fn - Async function to measure
     * @returns Promise resolving to the function result
     */
    async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
        if (!this.enabled) return fn();

        const start = performance.now();
        try {
            return await fn();
        } finally {
            const duration = performance.now() - start;
            this.recordMeasurement(label, duration);
        }
    }

    /**
     * Starts a manual measurement.
     * 
     * @param label - Label for this measurement
     * @returns A function to call when the measurement is complete
     */
    start(label: string): () => void {
        if (!this.enabled) return () => {};

        const start = performance.now();
        return () => {
            const duration = performance.now() - start;
            this.recordMeasurement(label, duration);
        };
    }

    /**
     * Records a measurement duration.
     */
    private recordMeasurement(label: string, duration: number): void {
        if (!this.measurements.has(label)) {
            this.measurements.set(label, []);
        }
        this.measurements.get(label)!.push(duration);
    }

    /**
     * Gets statistics for a specific measurement label.
     */
    getStats(label: string): PerformanceStats | null {
        const durations = this.measurements.get(label);
        if (!durations || durations.length === 0) return null;

        const sorted = [...durations].sort((a, b) => a - b);
        const sum = durations.reduce((a, b) => a + b, 0);
        const count = durations.length;
        const avg = sum / count;
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const median = sorted[Math.floor(count / 2)];
        const p95 = sorted[Math.floor(count * 0.95)];
        const p99 = sorted[Math.floor(count * 0.99)];

        return {
            label,
            count,
            total: sum,
            avg,
            min,
            max,
            median,
            p95,
            p99,
        };
    }

    /**
     * Gets all recorded statistics.
     */
    getAllStats(): PerformanceStats[] {
        const stats: PerformanceStats[] = [];
        for (const label of this.measurements.keys()) {
            const stat = this.getStats(label);
            if (stat) stats.push(stat);
        }
        return stats.sort((a, b) => b.total - a.total);
    }

    /**
     * Clears all measurements.
     */
    clear(): void {
        this.measurements.clear();
    }

    /**
     * Clears measurements for a specific label.
     */
    clearLabel(label: string): void {
        this.measurements.delete(label);
    }

    /**
     * Prints a formatted report of all statistics to console.
     */
    printReport(): void {
        const stats = this.getAllStats();
        if (stats.length === 0) {
            console.log("No performance measurements recorded");
            return;
        }

        console.log("\n=== Performance Report ===\n");
        console.table(
            stats.map((s) => ({
                Label: s.label,
                Count: s.count,
                "Total (ms)": s.total.toFixed(2),
                "Avg (ms)": s.avg.toFixed(2),
                "Min (ms)": s.min.toFixed(2),
                "Max (ms)": s.max.toFixed(2),
                "Median (ms)": s.median.toFixed(2),
                "P95 (ms)": s.p95.toFixed(2),
                "P99 (ms)": s.p99.toFixed(2),
            })),
        );
    }
}

export interface PerformanceStats {
    label: string;
    count: number;
    total: number;
    avg: number;
    min: number;
    max: number;
    median: number;
    p95: number;
    p99: number;
}

/**
 * Decorator for measuring method execution time.
 * 
 * @example
 * ```typescript
 * class MyClass {
 *   @measurePerformance('myMethod')
 *   myMethod() {
 *     // method implementation
 *   }
 * }
 * ```
 */
export function measurePerformance(label?: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ): PropertyDescriptor {
        const originalMethod = descriptor.value;
        const measureLabel = label || `${target.constructor.name}.${propertyKey}`;

        descriptor.value = function (...args: any[]) {
            const monitor = PerformanceMonitor.getInstance();
            return monitor.measure(measureLabel, () => originalMethod.apply(this, args));
        };

        return descriptor;
    };
}

/**
 * Decorator for measuring async method execution time.
 */
export function measurePerformanceAsync(label?: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ): PropertyDescriptor {
        const originalMethod = descriptor.value;
        const measureLabel = label || `${target.constructor.name}.${propertyKey}`;

        descriptor.value = async function (...args: any[]) {
            const monitor = PerformanceMonitor.getInstance();
            return monitor.measureAsync(measureLabel, () => originalMethod.apply(this, args));
        };

        return descriptor;
    };
}
