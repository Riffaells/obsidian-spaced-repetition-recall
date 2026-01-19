import { setIcon } from "obsidian";

/**
 * FullscreenToggle component manages fullscreen mode for the modal.
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 *
 * Features:
 * - Toggle button in modal header
 * - Fullscreen CSS class application
 * - Session storage persistence
 * - Size restoration on exit
 */
export interface IFullscreenToggle {
    enterFullscreen(): void;
    exitFullscreen(): void;
    toggleFullscreen(): void;
    isFullscreen(): boolean;
    onFullscreenChange(callback: (isFullscreen: boolean) => void): void;
    destroy(): void;
}

export class FullscreenToggle implements IFullscreenToggle {
    private modalElement: HTMLElement;
    private buttonElement: HTMLButtonElement;
    private fullscreenState: boolean = false;
    private fullscreenChangeCallback: ((isFullscreen: boolean) => void) | null = null;

    // Store original size configuration for restoration (Requirements 18.5)
    private originalWidth: string = "";
    private originalHeight: string = "";
    private originalMaxWidth: string = "";
    private originalMaxHeight: string = "";

    // Session storage key for persistence (Requirements 18.4)
    private static readonly STORAGE_KEY = "sr-modal-fullscreen-preference";

    constructor(modalElement: HTMLElement, buttonElement: HTMLButtonElement) {
        this.modalElement = modalElement;
        this.buttonElement = buttonElement;

        // Store original dimensions BEFORE restoring preference
        this.storeOriginalDimensions();

        // Restore fullscreen preference from session storage (Requirements 18.4)
        // This must happen AFTER storing original dimensions
        const wasRestored = this.restoreFullscreenPreference();

        // If no preference was restored, save the initial state (false)
        if (!wasRestored) {
            this.saveFullscreenPreference();
        }

        // Update button icon based on initial state
        this.updateButtonIcon();
    }

    /**
     * Store the original modal dimensions for restoration
     * Requirements: 18.5
     */
    private storeOriginalDimensions(): void {
        const computedStyle = window.getComputedStyle(this.modalElement);
        this.originalWidth = this.modalElement.style.width || computedStyle.width;
        this.originalHeight = this.modalElement.style.height || computedStyle.height;
        this.originalMaxWidth = this.modalElement.style.maxWidth || computedStyle.maxWidth;
        this.originalMaxHeight = this.modalElement.style.maxHeight || computedStyle.maxHeight;
    }

    /**
     * Restore fullscreen preference from session storage
     * Requirements: 18.4
     * @returns true if a preference was restored, false otherwise
     *
     * NOTE: This method only reads the preference but does NOT automatically
     * apply fullscreen mode. This prevents unexpected fullscreen behavior on modal open.
     */
    private restoreFullscreenPreference(): boolean {
        try {
            const stored = sessionStorage.getItem(FullscreenToggle.STORAGE_KEY);
            if (stored === "true" || stored === "false") {
                // Preference exists - just acknowledge it, don't apply
                // User can manually toggle fullscreen if they want
                return true;
            }
            return false; // No preference found
        } catch (error) {
            console.warn("Failed to restore fullscreen preference:", error);
            return false;
        }
    }

    /**
     * Save fullscreen preference to session storage
     * Requirements: 18.4
     */
    private saveFullscreenPreference(): void {
        try {
            sessionStorage.setItem(FullscreenToggle.STORAGE_KEY, this.fullscreenState.toString());
        } catch (error) {
            console.warn("Failed to save fullscreen preference:", error);
        }
    }

    /**
     * Update the button icon based on fullscreen state
     * Requirements: 18.3
     */
    private updateButtonIcon(): void {
        // Clear existing icon
        this.buttonElement.empty();

        // Set appropriate icon
        if (this.fullscreenState) {
            setIcon(this.buttonElement, "minimize");
            this.buttonElement.setAttribute("aria-label", "Exit Fullscreen");
        } else {
            setIcon(this.buttonElement, "maximize");
            this.buttonElement.setAttribute("aria-label", "Enter Fullscreen");
        }
    }

    /**
     * Enter fullscreen mode
     * Requirements: 18.1, 18.2, 18.3
     */
    enterFullscreen(): void {
        if (this.fullscreenState) {
            return; // Already in fullscreen
        }

        // Apply fullscreen CSS class (Requirements 18.3)
        this.modalElement.addClass("sr-modal-fullscreen");

        // Set fullscreen dimensions (Requirements 18.2)
        this.modalElement.style.setProperty("width", "100vw", "important");
        this.modalElement.style.setProperty("height", "100vh", "important");
        this.modalElement.style.setProperty("max-width", "100vw", "important");
        this.modalElement.style.setProperty("max-height", "100vh", "important");
        this.modalElement.style.setProperty("top", "0", "important");
        this.modalElement.style.setProperty("left", "0", "important");
        this.modalElement.style.setProperty("transform", "none", "important");

        // Update state
        this.fullscreenState = true;

        // Update button icon
        this.updateButtonIcon();

        // Save preference (Requirements 18.4)
        this.saveFullscreenPreference();

        // Notify callback
        if (this.fullscreenChangeCallback) {
            this.fullscreenChangeCallback(true);
        }
    }

    /**
     * Exit fullscreen mode and restore previous size
     * Requirements: 18.3, 18.5
     */
    exitFullscreen(): void {
        if (!this.fullscreenState) {
            return; // Not in fullscreen
        }

        // Remove fullscreen CSS class (Requirements 18.3)
        this.modalElement.removeClass("sr-modal-fullscreen");

        // Restore original dimensions (Requirements 18.5)
        this.modalElement.style.setProperty("width", this.originalWidth, "important");
        this.modalElement.style.setProperty("height", this.originalHeight, "important");
        this.modalElement.style.setProperty("max-width", this.originalMaxWidth, "important");
        this.modalElement.style.setProperty("max-height", this.originalMaxHeight, "important");
        this.modalElement.style.setProperty("top", "", "");
        this.modalElement.style.setProperty("left", "", "");
        this.modalElement.style.setProperty("transform", "", "");

        // Update state
        this.fullscreenState = false;

        // Update button icon
        this.updateButtonIcon();

        // Save preference (Requirements 18.4)
        this.saveFullscreenPreference();

        // Notify callback
        if (this.fullscreenChangeCallback) {
            this.fullscreenChangeCallback(false);
        }
    }

    /**
     * Toggle between fullscreen and normal mode
     * Requirements: 18.1, 18.2
     */
    toggleFullscreen(): void {
        if (this.fullscreenState) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    /**
     * Check if currently in fullscreen mode
     * Requirements: 18.1
     */
    isFullscreen(): boolean {
        return this.fullscreenState;
    }

    /**
     * Register callback for fullscreen state changes
     */
    onFullscreenChange(callback: (isFullscreen: boolean) => void): void {
        this.fullscreenChangeCallback = callback;
    }

    /**
     * Clean up resources
     * Note: Does NOT change session storage preference - that persists across modal reopens
     */
    destroy(): void {
        // Exit fullscreen if active (but don't save preference)
        if (this.fullscreenState) {
            // Remove fullscreen CSS class
            this.modalElement.removeClass("sr-modal-fullscreen");

            // Restore original dimensions
            this.modalElement.style.width = this.originalWidth;
            this.modalElement.style.height = this.originalHeight;
            this.modalElement.style.maxWidth = this.originalMaxWidth;
            this.modalElement.style.maxHeight = this.originalMaxHeight;
            this.modalElement.style.top = "";
            this.modalElement.style.left = "";
            this.modalElement.style.transform = "";

            // Update state (but don't save to session storage)
            this.fullscreenState = false;
        }

        // Clear callback
        this.fullscreenChangeCallback = null;
    }
}
