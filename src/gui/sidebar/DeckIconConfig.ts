/**
 * Configuration for deck/tag icons and colors in the sidebar.
 * Allows users to customize the appearance of decks with icons, colors, and backgrounds.
 */

import { setIcon } from "obsidian";

// ============================================================================
// Types
// ============================================================================

export interface DeckIconStyle {
    /** Lucide icon name (e.g., "folder", "book", "star") */
    icon?: string;
    /** Icon color (CSS color value) */
    iconColor?: string;
    /** Text color for deck title */
    textColor?: string;
    /** Background color for deck header */
    backgroundColor?: string;
    /** Border color for deck */
    borderColor?: string;
}

export interface DeckIconConfig {
    /** Map of deck/tag name to style configuration */
    styles: Record<string, DeckIconStyle>;
    /** Default style for decks without specific configuration */
    defaultStyle?: DeckIconStyle;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_DECK_ICON_CONFIG: DeckIconConfig = {
    styles: {},
    defaultStyle: {
        icon: "folder",
        iconColor: "var(--text-muted)",
    },
};

// ============================================================================
// Preset Colors (for programmatic use)
// ============================================================================

export const PRESET_COLORS = {
    // Basic colors
    red: "#e74c3c",
    orange: "#e67e22",
    yellow: "#f1c40f",
    green: "#2ecc71",
    teal: "#1abc9c",
    blue: "#3498db",
    purple: "#9b59b6",
    pink: "#e91e63",
    
    // Muted colors
    mutedRed: "#c0392b",
    mutedOrange: "#d35400",
    mutedYellow: "#f39c12",
    mutedGreen: "#27ae60",
    mutedTeal: "#16a085",
    mutedBlue: "#2980b9",
    mutedPurple: "#8e44ad",
    mutedPink: "#c2185b",
    
    // Pastel colors
    pastelRed: "#ffcdd2",
    pastelOrange: "#ffe0b2",
    pastelYellow: "#fff9c4",
    pastelGreen: "#c8e6c9",
    pastelTeal: "#b2dfdb",
    pastelBlue: "#bbdefb",
    pastelPurple: "#e1bee7",
    pastelPink: "#f8bbd9",
    
    // Neutral
    gray: "#95a5a6",
    darkGray: "#7f8c8d",
    lightGray: "#bdc3c7",
} as const;

export type PresetColor = keyof typeof PRESET_COLORS;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the style configuration for a specific deck
 */
export function getDeckStyle(
    config: DeckIconConfig,
    deckName: string,
): DeckIconStyle {
    // Check for exact match
    if (config.styles[deckName]) {
        return { ...config.defaultStyle, ...config.styles[deckName] };
    }
    
    // Check for pattern match (e.g., "flashcards/*" matches "flashcards/math")
    for (const [pattern, style] of Object.entries(config.styles)) {
        if (pattern.endsWith("/*")) {
            const prefix = pattern.slice(0, -2);
            if (deckName.startsWith(prefix + "/") || deckName === prefix) {
                return { ...config.defaultStyle, ...style };
            }
        }
        // Check for tag pattern (e.g., "#flashcards" matches deck "flashcards")
        if (pattern.startsWith("#") && deckName === pattern.slice(1)) {
            return { ...config.defaultStyle, ...style };
        }
    }
    
    return config.defaultStyle || {};
}

/**
 * Applies deck style to a header element
 */
export function applyDeckStyle(
    headerEl: HTMLElement,
    titleEl: HTMLElement,
    style: DeckIconStyle,
): HTMLElement | null {
    let iconEl: HTMLElement | null = null;
    
    // Apply background color
    if (style.backgroundColor) {
        headerEl.style.setProperty("--deck-bg-color", style.backgroundColor);
        headerEl.addClass("sr-deck-custom-bg");
    }
    
    // Apply border color
    if (style.borderColor) {
        const deckEl = headerEl.parentElement;
        if (deckEl) {
            deckEl.style.setProperty("--deck-border-color", style.borderColor);
            deckEl.addClass("sr-deck-custom-border");
        }
    }
    
    // Apply text color
    if (style.textColor) {
        titleEl.style.setProperty("color", style.textColor);
    }
    
    // Add icon
    if (style.icon) {
        iconEl = createLucideIcon(titleEl, style.icon, style.iconColor);
    }
    
    return iconEl;
}

/**
 * Creates a Lucide icon element
 */
function createLucideIcon(
    titleEl: HTMLElement,
    iconName: string,
    iconColor?: string,
): HTMLElement {
    const iconEl = document.createElement("span");
    iconEl.addClass("sr-deck-icon", "sr-deck-lucide-icon");
    
    try {
        setIcon(iconEl, iconName);
    } catch {
        // Fallback to folder icon if specified icon doesn't exist
        setIcon(iconEl, "folder");
    }
    
    if (iconColor) {
        iconEl.style.setProperty("color", iconColor);
    }
    
    titleEl.prepend(iconEl);
    return iconEl;
}

/**
 * Removes deck style from elements
 */
export function removeDeckStyle(
    headerEl: HTMLElement,
    titleEl: HTMLElement,
): void {
    // Remove custom classes
    headerEl.removeClass("sr-deck-custom-bg");
    headerEl.style.removeProperty("--deck-bg-color");
    
    const deckEl = headerEl.parentElement;
    if (deckEl) {
        deckEl.removeClass("sr-deck-custom-border");
        deckEl.style.removeProperty("--deck-border-color");
    }
    
    titleEl.style.removeProperty("color");
    
    // Remove icon
    const iconEl = titleEl.querySelector(".sr-deck-icon");
    if (iconEl) {
        iconEl.remove();
    }
}

/**
 * Parses a color value - supports preset names and CSS values
 */
export function parseColor(color: string): string {
    // Check if it's a preset color name
    if (color in PRESET_COLORS) {
        return PRESET_COLORS[color as PresetColor];
    }
    // Return as-is (CSS color value)
    return color;
}

/**
 * Creates a style object from simple parameters
 */
export function createDeckStyle(
    icon?: string,
    iconColor?: string,
    textColor?: string,
    backgroundColor?: string,
    borderColor?: string,
): DeckIconStyle {
    const style: DeckIconStyle = {};
    
    if (icon) style.icon = icon;
    if (iconColor) style.iconColor = parseColor(iconColor);
    if (textColor) style.textColor = parseColor(textColor);
    if (backgroundColor) style.backgroundColor = parseColor(backgroundColor);
    if (borderColor) style.borderColor = parseColor(borderColor);
    
    return style;
}
