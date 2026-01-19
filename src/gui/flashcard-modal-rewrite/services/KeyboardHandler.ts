import { ModalState } from "../types";

/**
 * Keyboard shortcut action types
 */
export enum KeyboardAction {
    SHOW_ANSWER = "SHOW_ANSWER",
    SKIP_CARD = "SKIP_CARD",
    REVIEW_EASY = "REVIEW_EASY",
    REVIEW_GOOD = "REVIEW_GOOD",
    REVIEW_HARD = "REVIEW_HARD",
    REVIEW_RESET = "REVIEW_RESET",
    CLOSE_MODAL = "CLOSE_MODAL",
    RETURN_TO_DECK_LIST = "RETURN_TO_DECK_LIST",
    EDIT_CARD = "EDIT_CARD",
    OPEN_SOURCE = "OPEN_SOURCE",
    NAVIGATE_PREV_DECK = "NAVIGATE_PREV_DECK",
    NAVIGATE_NEXT_DECK = "NAVIGATE_NEXT_DECK",
    TOGGLE_FULLSCREEN = "TOGGLE_FULLSCREEN",
}

/**
 * Keyboard shortcut mapping configuration
 */
export interface KeyboardShortcut {
    key: string;
    action: KeyboardAction;
    validStates: ModalState[];
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
}

/**
 * Default keyboard shortcuts for the flashcard modal
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
    // Show answer (Space or Enter when on front)
    { key: "Space", action: KeyboardAction.SHOW_ANSWER, validStates: [ModalState.CARD_FRONT] },
    { key: "Enter", action: KeyboardAction.SHOW_ANSWER, validStates: [ModalState.CARD_FRONT] },

    // Review responses (when on back)
    { key: "Space", action: KeyboardAction.REVIEW_GOOD, validStates: [ModalState.CARD_BACK] },
    { key: "1", action: KeyboardAction.REVIEW_HARD, validStates: [ModalState.CARD_BACK] },
    { key: "2", action: KeyboardAction.REVIEW_GOOD, validStates: [ModalState.CARD_BACK] },
    { key: "3", action: KeyboardAction.REVIEW_EASY, validStates: [ModalState.CARD_BACK] },
    { key: "0", action: KeyboardAction.REVIEW_RESET, validStates: [ModalState.CARD_BACK] },

    // Navigation
    {
        key: "s",
        action: KeyboardAction.SKIP_CARD,
        validStates: [ModalState.CARD_FRONT, ModalState.CARD_BACK],
    },
    {
        key: "Escape",
        action: KeyboardAction.CLOSE_MODAL,
        validStates: [
            ModalState.DECK_SELECTION,
            ModalState.CARD_FRONT,
            ModalState.CARD_BACK,
            ModalState.SESSION_COMPLETE,
        ],
    },
    {
        key: "b",
        action: KeyboardAction.RETURN_TO_DECK_LIST,
        validStates: [ModalState.CARD_FRONT, ModalState.CARD_BACK, ModalState.SESSION_COMPLETE],
    },

    // Card actions
    {
        key: "e",
        action: KeyboardAction.EDIT_CARD,
        validStates: [ModalState.CARD_FRONT, ModalState.CARD_BACK],
    },
    {
        key: "o",
        action: KeyboardAction.OPEN_SOURCE,
        validStates: [ModalState.CARD_FRONT, ModalState.CARD_BACK],
    },

    // Deck navigation
    {
        key: "ArrowLeft",
        action: KeyboardAction.NAVIGATE_PREV_DECK,
        validStates: [ModalState.CARD_FRONT, ModalState.CARD_BACK],
        ctrlKey: true,
    },
    {
        key: "ArrowRight",
        action: KeyboardAction.NAVIGATE_NEXT_DECK,
        validStates: [ModalState.CARD_FRONT, ModalState.CARD_BACK],
        ctrlKey: true,
    },

    {
        key: "ArrowLeft",
        action: KeyboardAction.NAVIGATE_PREV_DECK,
        validStates: [ModalState.CARD_FRONT, ModalState.CARD_BACK],
    },
    {
        key: "ArrowRight",
        action: KeyboardAction.SKIP_CARD,
        validStates: [ModalState.CARD_FRONT, ModalState.CARD_BACK],
    },

    // Display modes
    {
        key: "f",
        action: KeyboardAction.TOGGLE_FULLSCREEN,
        validStates: [ModalState.DECK_SELECTION, ModalState.CARD_FRONT, ModalState.CARD_BACK],
    },
];

/**
 * Service for handling keyboard shortcuts in the flashcard modal
 *
 * Responsibilities:
 * - Define keyboard shortcut mappings
 * - Capture keyboard events
 * - Prevent event propagation for handled shortcuts
 * - Execute callbacks for keyboard actions
 * - Validate shortcuts against current modal state
 */
export class KeyboardHandler {
    private shortcuts: KeyboardShortcut[];
    private currentState: ModalState;
    private actionCallbacks: Map<KeyboardAction, () => void>;
    private keydownHandler: (e: KeyboardEvent) => void;
    private isActive: boolean;

    constructor(shortcuts: KeyboardShortcut[] = DEFAULT_SHORTCUTS) {
        this.shortcuts = shortcuts;
        this.currentState = ModalState.CLOSED;
        this.actionCallbacks = new Map();
        this.isActive = false;

        // Bind the handler to preserve 'this' context
        this.keydownHandler = this.handleKeydown.bind(this);
    }

    /**
     * Register a callback for a specific keyboard action
     */
    registerAction(action: KeyboardAction, callback: () => void): void {
        this.actionCallbacks.set(action, callback);
    }

    /**
     * Unregister a callback for a specific keyboard action
     */
    unregisterAction(action: KeyboardAction): void {
        this.actionCallbacks.delete(action);
    }

    /**
     * Update the current modal state
     * This determines which shortcuts are valid
     */
    setState(state: ModalState): void {
        this.currentState = state;
    }

    /**
     * Start capturing keyboard events
     */
    activate(): void {
        if (this.isActive) {
            return;
        }

        // Check if document is available (for testing environments)
        if (typeof document !== "undefined") {
            document.addEventListener("keydown", this.keydownHandler, true);
        }
        this.isActive = true;
    }

    /**
     * Stop capturing keyboard events
     */
    deactivate(): void {
        if (!this.isActive) {
            return;
        }

        // Check if document is available (for testing environments)
        if (typeof document !== "undefined") {
            document.removeEventListener("keydown", this.keydownHandler, true);
        }
        this.isActive = false;
    }

    /**
     * Check if the handler is currently active
     */
    isActivated(): boolean {
        return this.isActive;
    }

    /**
     * Handle keyboard events
     * Property 5: Keyboard Shortcut Handling
     */
    private handleKeydown(e: KeyboardEvent): void {
        // Ignore keyboard events when typing in input fields
        const target = e.target as HTMLElement;
        if (
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
        ) {
            return;
        }

        // Find matching shortcut
        const matchingShortcut = this.findMatchingShortcut(e);

        if (matchingShortcut) {
            // Prevent default behavior and stop propagation
            e.preventDefault();
            e.stopPropagation();

            // Execute the callback if registered
            const callback = this.actionCallbacks.get(matchingShortcut.action);
            if (callback) {
                callback();
            }
        }
    }

    /**
     * Find a shortcut that matches the keyboard event and current state
     */
    private findMatchingShortcut(e: KeyboardEvent): KeyboardShortcut | null {
        for (const shortcut of this.shortcuts) {
            // Check if the key matches
            if (e.key !== shortcut.key) {
                continue;
            }

            // Check modifier keys
            if (shortcut.ctrlKey && !e.ctrlKey) {
                continue;
            }
            if (shortcut.shiftKey && !e.shiftKey) {
                continue;
            }
            if (shortcut.altKey && !e.altKey) {
                continue;
            }

            // Check if shortcut is valid for current state
            if (!shortcut.validStates.includes(this.currentState)) {
                continue;
            }

            return shortcut;
        }

        return null;
    }

    /**
     * Get all shortcuts valid for a specific state
     */
    getShortcutsForState(state: ModalState): KeyboardShortcut[] {
        return this.shortcuts.filter((s) => s.validStates.includes(state));
    }

    /**
     * Update the shortcuts configuration
     */
    setShortcuts(shortcuts: KeyboardShortcut[]): void {
        this.shortcuts = shortcuts;
    }

    /**
     * Get the current shortcuts configuration
     */
    getShortcuts(): KeyboardShortcut[] {
        return [...this.shortcuts];
    }
}
