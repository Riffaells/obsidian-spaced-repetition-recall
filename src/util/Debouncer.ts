export class Debouncer {
    private timeout: ReturnType<typeof setTimeout> | null = null;

    constructor(private delay: number) {}

    run(fn: () => void): void {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            fn();
            this.timeout = null;
        }, this.delay);
    }

    cancel(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
}
