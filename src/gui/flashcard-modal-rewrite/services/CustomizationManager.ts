import { SRSettings } from "src/core/settings/SRSettings";

/**
 * CustomizationManager handles applying user customization settings to the modal.
 *
 * This includes:
 * - Modal size configuration (width/height percentages)
 * - Theme and custom CSS classes
 * - Custom button labels
 * - Context visibility toggle
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */
export class CustomizationManager {
    private settings: SRSettings;
    private modalElement: HTMLElement | null = null;

    constructor(settings: SRSettings) {
        this.settings = settings;
    }

    /**
     * Set the modal element to apply customizations to
     *
     * @param element The modal container element
     */
    setModalElement(element: HTMLElement): void {
        this.modalElement = element;
    }

    /**
     * Apply modal size configuration from settings
     * Requirements: 15.1
     *
     * Applies width and height percentages to the modal element.
     */
    applyModalSize(): void {
        if (!this.modalElement) {
            console.warn("CustomizationManager: Cannot apply modal size - modal element not set");
            return;
        }

        const widthPercentage = this.settings.flashcardWidthPercentage;
        const heightPercentage = this.settings.flashcardHeightPercentage;

        this.modalElement.style.width = `${widthPercentage}%`;
        this.modalElement.style.height = `${heightPercentage}%`;
        this.modalElement.style.maxWidth = `${widthPercentage}%`;
        this.modalElement.style.maxHeight = `${heightPercentage}%`;
    }

    /**
     * Apply theme CSS classes to the modal
     * Requirements: 15.2
     *
     * Applies theme-specific CSS classes based on Obsidian's current theme.
     */
    applyTheme(): void {
        if (!this.modalElement) {
            console.warn("CustomizationManager: Cannot apply theme - modal element not set");
            return;
        }

        // Get the current theme from document body
        const isDarkTheme = document.body.classList.contains("theme-dark");
        const isLightTheme = document.body.classList.contains("theme-light");

        // Apply theme classes
        if (isDarkTheme) {
            this.modalElement.classList.add("sr-modal-theme-dark");
            this.modalElement.classList.remove("sr-modal-theme-light");
        } else if (isLightTheme) {
            this.modalElement.classList.add("sr-modal-theme-light");
            this.modalElement.classList.remove("sr-modal-theme-dark");
        }
    }

    /**
     * Apply custom CSS classes to the modal
     * Requirements: 15.5
     *
     * @param customClasses Array of custom CSS class names to apply
     */
    applyCustomCSSClasses(customClasses: string[]): void {
        if (!this.modalElement) {
            console.warn(
                "CustomizationManager: Cannot apply custom CSS classes - modal element not set",
            );
            return;
        }

        // Remove any previously applied custom classes (those starting with 'sr-custom-')
        const existingCustomClasses = Array.from(this.modalElement.classList).filter((cls) =>
            cls.startsWith("sr-custom-"),
        );
        existingCustomClasses.forEach((cls) => this.modalElement!.classList.remove(cls));

        // Apply new custom classes
        customClasses.forEach((cls) => {
            if (cls && cls.trim()) {
                this.modalElement!.classList.add(cls.trim());
            }
        });
    }

    /**
     * Get custom button labels from settings
     * Requirements: 15.3
     *
     * @returns Object containing custom labels for review buttons
     */
    getCustomButtonLabels(): {
        easy: string;
        good: string;
        hard: string;
    } {
        return {
            easy: this.settings.flashcardEasyText || "Easy",
            good: this.settings.flashcardGoodText || "Good",
            hard: this.settings.flashcardHardText || "Hard",
        };
    }

    /**
     * Check if context should be shown in cards
     * Requirements: 15.4
     *
     * @returns true if context should be visible, false otherwise
     */
    shouldShowContext(): boolean {
        return this.settings.showContextInCards;
    }

    /**
     * Check if intervals should be shown in review buttons
     *
     * @returns true if intervals should be visible, false otherwise
     */
    shouldShowIntervals(): boolean {
        return this.settings.showIntervalInReviewButtons;
    }

    /**
     * Apply all customizations to the modal
     *
     * This is a convenience method that applies all customization settings at once.
     * Call this after the modal element is set and whenever settings change.
     *
     * @param customClasses Optional array of custom CSS classes
     */
    applyAllCustomizations(customClasses: string[] = []): void {
        this.applyModalSize();
        this.applyTheme();
        this.applyCustomCSSClasses(customClasses);
    }

    /**
     * Update settings reference
     *
     * Call this when settings are updated to ensure the manager uses the latest values.
     *
     * @param settings Updated settings object
     */
    updateSettings(settings: SRSettings): void {
        this.settings = settings;
    }
}
