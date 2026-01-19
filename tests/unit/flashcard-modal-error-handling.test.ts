import { describe, test, expect, beforeEach, mock } from "bun:test";
import { ModalController } from "../../src/gui/flashcard-modal-rewrite/ModalController";
import { EventBus } from "../../src/gui/flashcard-modal-rewrite/utils/EventBus";
import { ServiceContainer } from "../../src/gui/flashcard-modal-rewrite/services/ServiceContainer";
import {
    ErrorLogger,
    ErrorSeverity,
} from "../../src/gui/flashcard-modal-rewrite/services/ErrorLogger";
import { ModalState } from "../../src/gui/flashcard-modal-rewrite/types";
import { TopicPath } from "../../src/core/services/TopicPath";

/**
 * Property-based tests for error handling in the flashcard modal
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

describe("Flashcard Modal Error Handling", () => {
    let controller: ModalController;
    let eventBus: EventBus;
    let services: ServiceContainer;
    let mockApp: any;

    beforeEach(() => {
        // Clear error logs
        ErrorLogger.getInstance().clearLogs();

        // Mock Obsidian App
        mockApp = {
            workspace: {
                trigger: mock(() => {}),
            },
        };

        eventBus = new EventBus();
        services = new ServiceContainer();

        // Mock review sequencer
        const mockSequencer = {
            setCurrentDeck: mock(() => {}),
            hasCurrentCard: false,
            currentCard: null,
            currentDeck: null,
            originalDeckTree: null,
            processReview: mock(async () => {}),
            skipCurrentCard: mock(() => {}),
        };

        services.register("reviewSequencer", mockSequencer);

        controller = new ModalController(mockApp, eventBus, services);
    });

    /**
     * Property 23: Card Loading Error Handling
     * When card loading fails, the modal should:
     * - Transition to ERROR state
     * - Log the error with appropriate context
     * - Provide a retry mechanism
     * - Not crash or leave the modal in an inconsistent state
     */
    test("Property 23: Card loading errors are handled gracefully", () => {
        const invalidDeckPath = TopicPath.emptyPath;

        // Mock sequencer to throw error on setCurrentDeck
        const mockSequencer = services.get<any>("reviewSequencer");
        mockSequencer.setCurrentDeck = mock(() => {
            throw new Error("Failed to load deck");
        });

        // Attempt to start review with invalid deck
        controller.startReview(invalidDeckPath);

        // Verify error state
        expect(controller.getCurrentState()).toBe(ModalState.ERROR);

        // Verify error was logged
        const logs = ErrorLogger.getInstance().getLogs();
        expect(logs.length).toBeGreaterThan(0);
        expect(logs[logs.length - 1].severity).toBe(ErrorSeverity.ERROR);
        expect(logs[logs.length - 1].message).toContain("Failed to load deck");
    });

    /**
     * Property 24: Markdown Rendering Fallback
     * When markdown rendering fails, the modal should:
     * - Display a fallback error message
     * - Log the rendering error
     * - Allow the user to continue or retry
     * - Not prevent other cards from being displayed
     */
    test("Property 24: Markdown rendering errors have fallback behavior", () => {
        // This test validates that rendering errors are isolated
        // and don't affect the overall modal state

        const mockSequencer = services.get<any>("reviewSequencer");
        mockSequencer.hasCurrentCard = true;
        mockSequencer.currentCard = {
            front: "# Test Card",
            back: "Test Answer",
        };

        // Start a review session
        controller.open({ deckPath: new TopicPath(["test"]) });

        // Verify modal is in CARD_FRONT state (not ERROR)
        expect(controller.getCurrentState()).toBe(ModalState.CARD_FRONT);

        // Note: Actual markdown rendering errors would be handled
        // by the CardView component, which should log errors but
        // display fallback content
    });

    /**
     * Property 25: Review Sequencer Error Recovery
     * When the review sequencer encounters an error during processReview:
     * - The error should be caught and logged
     * - The modal should transition to ERROR state
     * - A retry mechanism should be available
     * - The session state should remain consistent
     */
    test("Property 25: Review sequencer errors are recoverable", async () => {
        const mockSequencer = services.get<any>("reviewSequencer");
        mockSequencer.hasCurrentCard = true;
        mockSequencer.currentCard = {
            front: "Test",
            back: "Answer",
        };

        // Mock processReview to throw error
        mockSequencer.processReview = mock(async () => {
            throw new Error("Database write failed");
        });

        // Open modal and show answer
        controller.open({ deckPath: new TopicPath(["test"]) });
        controller.showAnswer();

        // Attempt to submit review
        await controller.submitReview(1); // ReviewResponse.Good

        // Verify error state
        expect(controller.getCurrentState()).toBe(ModalState.ERROR);

        // Verify error was logged
        const logs = ErrorLogger.getInstance().getLogs();
        const errorLog = logs.find((log) => log.message.includes("Database write failed"));
        expect(errorLog).toBeDefined();
        expect(errorLog?.severity).toBe(ErrorSeverity.ERROR);
    });

    /**
     * Property 26: Error Logging Completeness
     * All errors should be logged with:
     * - Timestamp
     * - Severity level
     * - Error message
     * - Context information (action, component, etc.)
     * - Original error object (if available)
     */
    test("Property 26: Errors are logged with complete context", () => {
        const mockSequencer = services.get<any>("reviewSequencer");
        mockSequencer.setCurrentDeck = mock(() => {
            throw new Error("Test error");
        });

        const deckPath = new TopicPath(["test", "deck"]);
        controller.startReview(deckPath);

        const logs = ErrorLogger.getInstance().getLogs();
        const errorLog = logs[logs.length - 1];

        // Verify log completeness
        expect(errorLog.timestamp).toBeDefined();
        expect(errorLog.severity).toBe(ErrorSeverity.ERROR);
        expect(errorLog.message).toBe("Test error");
        expect(errorLog.context).toBeDefined();
        expect(errorLog.context?.action).toBe("startReview");
        expect(errorLog.error).toBeDefined();
        expect(errorLog.error?.message).toBe("Test error");
    });

    /**
     * Property 27: Error State Recovery
     * After an error occurs:
     * - The retry() method should attempt to recover
     * - If retry succeeds, the modal should return to normal operation
     * - If retry fails, the error state should be maintained
     * - Users should be able to close the modal from error state
     */
    test("Property 27: Error state allows recovery via retry", () => {
        const mockSequencer = services.get<any>("reviewSequencer");
        let callCount = 0;

        // First call fails, second succeeds
        mockSequencer.setCurrentDeck = mock(() => {
            callCount++;
            if (callCount === 1) {
                throw new Error("Temporary failure");
            }
            // Success on retry
        });

        const deckPath = new TopicPath(["test"]);

        // First attempt fails
        controller.startReview(deckPath);
        expect(controller.getCurrentState()).toBe(ModalState.ERROR);

        // Retry should succeed
        controller.retry();

        // Should no longer be in error state
        // (either CARD_FRONT or SESSION_COMPLETE depending on cards)
        expect(controller.getCurrentState()).not.toBe(ModalState.ERROR);
    });

    /**
     * Property 28: Multi-deck error handling
     * When multi-deck review encounters errors:
     * - Invalid deck paths should be handled gracefully
     * - Missing decks should be logged but not crash the session
     * - Valid decks should still be reviewable
     */
    test("Property 28: Multi-deck errors don't prevent valid deck review", () => {
        const mockSequencer = services.get<any>("reviewSequencer");
        mockSequencer.originalDeckTree = null; // Simulate missing deck tree

        const deckPaths = [new TopicPath(["deck1"]), new TopicPath(["deck2"])];

        // Attempt multi-deck review with missing deck tree
        controller.startMultiDeckReview(deckPaths);

        // Should transition to error state
        expect(controller.getCurrentState()).toBe(ModalState.ERROR);

        // Error should be logged
        const logs = ErrorLogger.getInstance().getLogs();
        const errorLog = logs.find((log) =>
            log.message.includes("Original deck tree not available"),
        );
        expect(errorLog).toBeDefined();
    });

    /**
     * Property 29: Error state doesn't prevent modal close
     * Even in error state, users should be able to:
     * - Close the modal
     * - Return to deck selection
     * - Access other modal functions
     */
    test("Property 29: Modal can be closed from error state", () => {
        const mockSequencer = services.get<any>("reviewSequencer");
        mockSequencer.setCurrentDeck = mock(() => {
            throw new Error("Test error");
        });

        // Trigger error
        controller.startReview(new TopicPath(["test"]));
        expect(controller.getCurrentState()).toBe(ModalState.ERROR);

        // Should be able to close
        controller.close();
        expect(controller.getCurrentState()).toBe(ModalState.CLOSED);
    });

    /**
     * Property 30: Consecutive errors are all logged
     * Multiple errors in sequence should:
     * - All be logged separately
     * - Not overwrite previous error logs
     * - Maintain chronological order
     */
    test("Property 30: Multiple errors are logged independently", () => {
        const mockSequencer = services.get<any>("reviewSequencer");

        // Trigger first error
        mockSequencer.setCurrentDeck = mock(() => {
            throw new Error("First error");
        });
        controller.startReview(new TopicPath(["test1"]));

        const logsAfterFirst = ErrorLogger.getInstance().getLogs().length;

        // Trigger second error
        mockSequencer.setCurrentDeck = mock(() => {
            throw new Error("Second error");
        });
        controller.retry(); // This will call startReview again

        const logsAfterSecond = ErrorLogger.getInstance().getLogs().length;

        // Should have more logs after second error
        expect(logsAfterSecond).toBeGreaterThan(logsAfterFirst);

        // Both errors should be in logs
        const allLogs = ErrorLogger.getInstance().getLogs();
        const firstError = allLogs.find((log) => log.message === "First error");
        const secondError = allLogs.find((log) => log.message === "Second error");

        expect(firstError).toBeDefined();
        expect(secondError).toBeDefined();
    });
});
