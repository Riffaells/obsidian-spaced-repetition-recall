/**
 * Factory function type for creating service instances.
 */
export type Factory<T> = () => T;

/**
 * ServiceContainer provides dependency injection for managing service
 * instantiation and dependencies.
 */
export class ServiceContainer {
    private services: Map<string, Factory<any>> = new Map();
    private instances: Map<string, any> = new Map();
    private singletons: Set<string> = new Set();

    /**
     * Register a service with a factory function.
     * @param name - The service name
     * @param factory - The factory function to create the service
     * @param singleton - Whether to create a singleton instance (default: true)
     */
    register<T>(name: string, factory: Factory<T>, singleton: boolean = true): void {
        this.services.set(name, factory);
        if (singleton) {
            this.singletons.add(name);
        } else {
            this.singletons.delete(name);
            this.instances.delete(name);
        }
    }

    /**
     * Retrieve a service by name.
     * If the service is registered as a singleton and has been created,
     * returns the existing instance. Otherwise, creates a new instance.
     * @param name - The service name
     * @returns The service instance
     * @throws Error if the service is not registered
     */
    get<T>(name: string): T {
        // Check if singleton instance exists
        if (this.singletons.has(name) && this.instances.has(name)) {
            return this.instances.get(name);
        }

        // Get factory
        const factory = this.services.get(name);
        if (!factory) {
            throw new Error(`Service not registered: ${name}`);
        }

        // Create instance
        const instance = factory();

        // Store singleton instance
        if (this.singletons.has(name)) {
            this.instances.set(name, instance);
        }

        return instance;
    }

    /**
     * Check if a service is registered.
     * @param name - The service name
     * @returns True if the service is registered
     */
    has(name: string): boolean {
        return this.services.has(name);
    }

    /**
     * Clear all registered services and instances.
     */
    clear(): void {
        this.services.clear();
        this.instances.clear();
        this.singletons.clear();
    }

    /**
     * Get the number of registered services.
     * @returns The number of services
     */
    size(): number {
        return this.services.size;
    }
}
