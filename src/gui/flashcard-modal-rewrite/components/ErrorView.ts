export interface ErrorViewProps {
    error: Error | string;
    onRetry?: () => void;
    onClose?: () => void;
}

/**
 * Component for displaying error states in the modal
 * Requirements: 10.2
 */
export class ErrorView {
    private viewContainer: HTMLElement;
    private container: HTMLElement;
    private eventBus: any;
    private controller: any;
    private currentError: Error | string | null = null;

    constructor(viewContainer: HTMLElement, eventBus: any, controller: any) {
        this.viewContainer = viewContainer;
        this.container = viewContainer.createDiv("sr-error-view-wrapper sr-is-hidden");
        this.eventBus = eventBus;
        this.controller = controller;
    }

    show(): void {
        this.container.removeClass("sr-is-hidden");
    }

    hide(): void {
        this.container.addClass("sr-is-hidden");
    }

    displayError(error: Error | string): void {
        this.currentError = error;
        this.render();
    }

    destroy(): void {
        this.container.remove();
    }

    render(): void {
        this.container.empty();
        const errorContainer = this.container.createDiv("sr-modal-error");

        errorContainer.createEl("div", {
            cls: "sr-error-icon",
            text: "⚠️",
        });

        errorContainer.createEl("h2", { text: "An error occurred" });

        const message =
            typeof this.currentError === "string"
                ? this.currentError
                : this.currentError?.message || "Unknown error";

        errorContainer.createEl("p", {
            text: message,
            cls: "sr-error-message",
        });

        const controls = errorContainer.createDiv("sr-error-controls");

        const retryBtn = controls.createEl("button", {
            text: "Retry",
            cls: "mod-cta",
        });
        retryBtn.onclick = () => {
            this.eventBus.emit("retry-action");
        };

        const closeBtn = controls.createEl("button", { text: "Close" });
        closeBtn.onclick = () => {
            this.eventBus.emit("close-modal");
        };
    }
}
