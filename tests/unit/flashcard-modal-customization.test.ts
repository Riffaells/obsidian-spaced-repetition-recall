import { CustomizationManager } from "src/gui/flashcard-modal-rewrite/services/CustomizationManager";
import { SRSettings } from "src/core/settings/SRSettings";
import { DEFAULT_SETTINGS } from "src/core/settings/DefaultSettings";
import * as fc from "fast-check";
import { JSDOM } from "jsdom";

// Set up DOM environment for tests
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
(global as any).document = dom.window.document;
(global as any).HTMLElement = dom.window.HTMLElement;

describe("CustomizationManager", () => {
    let mockSettings: SRSettings;
    let modalElement: HTMLElement;

    beforeEach(() => {
        // Create a fresh mock settings object for each test
        mockSettings = { ...DEFAULT_SETTINGS };

        // Create a fresh modal element for each test
        modalElement = document.createElement("div");
        modalElement.className = "sr-modal";
    });

    // Feature: flashcard-modal-rewrite, Property 43: Modal Size Configuration
    test("modal size configuration applies width and height percentages", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 10, max: 100 }), // width percentage
                fc.integer({ min: 10, max: 100 }), // height percentage
                (widthPercentage, heightPercentage) => {
                    // Set up settings with custom dimensions
                    mockSettings.flashcardWidthPercentage = widthPercentage;
                    mockSettings.flashcardHeightPercentage = heightPercentage;

                    const manager = new CustomizationManager(mockSettings);
                    manager.setModalElement(modalElement);
                    manager.applyModalSize();

                    // Verify dimensions are applied correctly
                    expect(modalElement.style.width).toBe(`${widthPercentage}%`);
                    expect(modalElement.style.height).toBe(`${heightPercentage}%`);
                    expect(modalElement.style.maxWidth).toBe(`${widthPercentage}%`);
                    expect(modalElement.style.maxHeight).toBe(`${heightPercentage}%`);
                },
            ),
            { numRuns: 100 },
        );
    });

    // Feature: flashcard-modal-rewrite, Property 44: Theme Application
    test("theme application adds correct CSS classes based on document theme", () => {
        fc.assert(
            fc.property(
                fc.boolean(), // isDarkTheme
                (isDarkTheme) => {
                    // Set up document body theme
                    document.body.className = "";
                    if (isDarkTheme) {
                        document.body.classList.add("theme-dark");
                    } else {
                        document.body.classList.add("theme-light");
                    }

                    const manager = new CustomizationManager(mockSettings);
                    manager.setModalElement(modalElement);
                    manager.applyTheme();

                    // Verify correct theme class is applied
                    if (isDarkTheme) {
                        expect(modalElement.classList.contains("sr-modal-theme-dark")).toBe(true);
                        expect(modalElement.classList.contains("sr-modal-theme-light")).toBe(false);
                    } else {
                        expect(modalElement.classList.contains("sr-modal-theme-light")).toBe(true);
                        expect(modalElement.classList.contains("sr-modal-theme-dark")).toBe(false);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    // Feature: flashcard-modal-rewrite, Property 45: Custom Button Labels
    test("custom button labels are returned from settings", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }), // easy label
                fc.string({ minLength: 1, maxLength: 20 }), // good label
                fc.string({ minLength: 1, maxLength: 20 }), // hard label
                (easyLabel, goodLabel, hardLabel) => {
                    // Set up settings with custom labels
                    mockSettings.flashcardEasyText = easyLabel;
                    mockSettings.flashcardGoodText = goodLabel;
                    mockSettings.flashcardHardText = hardLabel;

                    const manager = new CustomizationManager(mockSettings);
                    const labels = manager.getCustomButtonLabels();

                    // Verify labels match settings
                    expect(labels.easy).toBe(easyLabel);
                    expect(labels.good).toBe(goodLabel);
                    expect(labels.hard).toBe(hardLabel);
                },
            ),
            { numRuns: 100 },
        );
    });

    // Feature: flashcard-modal-rewrite, Property 46: Context Visibility Toggle
    test("context visibility setting is correctly returned", () => {
        fc.assert(
            fc.property(
                fc.boolean(), // showContextInCards
                (showContext) => {
                    // Set up settings with context visibility preference
                    mockSettings.showContextInCards = showContext;

                    const manager = new CustomizationManager(mockSettings);
                    const shouldShow = manager.shouldShowContext();

                    // Verify visibility setting matches
                    expect(shouldShow).toBe(showContext);
                },
            ),
            { numRuns: 100 },
        );
    });

    // Feature: flashcard-modal-rewrite, Property 47: Custom CSS Class Support
    test("custom CSS classes are applied to modal element", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]*$/), // valid CSS class names
                    { minLength: 0, maxLength: 10 },
                ),
                (customClasses) => {
                    const manager = new CustomizationManager(mockSettings);
                    manager.setModalElement(modalElement);

                    // Apply custom classes
                    manager.applyCustomCSSClasses(customClasses);

                    // Verify all custom classes are applied
                    for (const cls of customClasses) {
                        if (cls && cls.trim()) {
                            expect(modalElement.classList.contains(cls.trim())).toBe(true);
                        }
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    // Additional test: Custom CSS classes replace previous custom classes
    test("applying new custom CSS classes removes previous custom classes", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]*$/), // valid CSS class names
                    { minLength: 1, maxLength: 5 },
                ),
                fc.array(
                    fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]*$/), // valid CSS class names
                    { minLength: 1, maxLength: 5 },
                ),
                (firstClasses, secondClasses) => {
                    const manager = new CustomizationManager(mockSettings);
                    manager.setModalElement(modalElement);

                    // Apply first set of classes (with sr-custom- prefix to test removal)
                    const firstCustomClasses = firstClasses.map((cls) => `sr-custom-${cls}`);
                    manager.applyCustomCSSClasses(firstCustomClasses);

                    // Apply second set of classes
                    const secondCustomClasses = secondClasses.map((cls) => `sr-custom-${cls}`);
                    manager.applyCustomCSSClasses(secondCustomClasses);

                    // Verify first set is removed and second set is applied
                    for (const cls of firstCustomClasses) {
                        if (!secondCustomClasses.includes(cls)) {
                            expect(modalElement.classList.contains(cls)).toBe(false);
                        }
                    }

                    for (const cls of secondCustomClasses) {
                        if (cls && cls.trim()) {
                            expect(modalElement.classList.contains(cls.trim())).toBe(true);
                        }
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    // Test: applyAllCustomizations applies all settings at once
    test("applyAllCustomizations applies size, theme, and custom classes", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 10, max: 100 }), // width
                fc.integer({ min: 10, max: 100 }), // height
                fc.boolean(), // isDarkTheme
                fc.array(
                    fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]*$/), // valid CSS class names
                    { minLength: 0, maxLength: 5 },
                ),
                (width, height, isDarkTheme, customClasses) => {
                    // Set up settings
                    mockSettings.flashcardWidthPercentage = width;
                    mockSettings.flashcardHeightPercentage = height;

                    // Set up document theme
                    document.body.className = "";
                    if (isDarkTheme) {
                        document.body.classList.add("theme-dark");
                    } else {
                        document.body.classList.add("theme-light");
                    }

                    const manager = new CustomizationManager(mockSettings);
                    manager.setModalElement(modalElement);
                    manager.applyAllCustomizations(customClasses);

                    // Verify all customizations are applied
                    expect(modalElement.style.width).toBe(`${width}%`);
                    expect(modalElement.style.height).toBe(`${height}%`);

                    if (isDarkTheme) {
                        expect(modalElement.classList.contains("sr-modal-theme-dark")).toBe(true);
                    } else {
                        expect(modalElement.classList.contains("sr-modal-theme-light")).toBe(true);
                    }

                    for (const cls of customClasses) {
                        if (cls && cls.trim()) {
                            expect(modalElement.classList.contains(cls.trim())).toBe(true);
                        }
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    // Test: updateSettings refreshes the settings reference
    test("updateSettings allows settings to be updated", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }), // initial easy label
                fc.string({ minLength: 1, maxLength: 20 }), // updated easy label
                (initialLabel, updatedLabel) => {
                    // Assume labels are different for meaningful test
                    fc.pre(initialLabel !== updatedLabel);

                    mockSettings.flashcardEasyText = initialLabel;
                    const manager = new CustomizationManager(mockSettings);

                    // Get initial label
                    let labels = manager.getCustomButtonLabels();
                    expect(labels.easy).toBe(initialLabel);

                    // Update settings
                    const newSettings = { ...mockSettings };
                    newSettings.flashcardEasyText = updatedLabel;
                    manager.updateSettings(newSettings);

                    // Get updated label
                    labels = manager.getCustomButtonLabels();
                    expect(labels.easy).toBe(updatedLabel);
                },
            ),
            { numRuns: 100 },
        );
    });
});
