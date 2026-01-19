/**
 * Event handler function type.
 */
export type EventHandler = (data: any) => void;

/**
 * EventBus provides a publish-subscribe mechanism for decoupled communication
 * between components.
 */
export class EventBus {
    private listeners: Map<string, Set<EventHandler>> = new Map();

    /**
     * Register an event handler for a specific event type.
     * @param event - The event type to listen for
     * @param handler - The function to call when the event is emitted
     */
    on(event: string, handler: EventHandler): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
    }

    /**
     * Unregister an event handler for a specific event type.
     * @param event - The event type
     * @param handler - The handler to remove
     */
    off(event: string, handler: EventHandler): void {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    /**
     * Emit an event with associated data.
     * All registered handlers for this event type will be invoked.
     * @param event - The event type to emit
     * @param data - The data to pass to event handlers
     */
    emit(event: string, data: any): void {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Clear all event listeners.
     */
    clear(): void {
        this.listeners.clear();
    }

    /**
     * Get the number of handlers registered for an event.
     * @param event - The event type
     * @returns The number of handlers
     */
    handlerCount(event: string): number {
        return this.listeners.get(event)?.size || 0;
    }
}
