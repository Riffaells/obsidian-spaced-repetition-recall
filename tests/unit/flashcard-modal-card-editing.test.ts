/**
 * Property-Based Tests for Card Editing
 *
 * Feature: flashcard-modal-rewrite
 *
 * These tests validate the correctness properties for in-place card editing:
 * - Property 37: In-Place Card Editing
 *
 * Requirements: 13.3, 13.4
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { ModalController } from "../../src/gui/flashcard-modal-rewrite/ModalController";
import { EventBus } from "../../src/gui/flashcard-modal-rewrite/utils/EventBus";
import { ServiceContainer } from "../../src/gui/flashcard-modal-rewrite/services/ServiceContainer";
import { TopicPath } from "../../src/core/services/TopicPath";
import { Card } from "../../src/core/models/Card";
import { Question } from "../../src/core/models/Question";
import { QuestionText } from "../../src/core/models/Question";
import { TextDirection } from "../../src/utils/TextDirection";
import * as fc from "fast-check";

describe("Card Editing Property Tests", () => {
    let app: any;
    let eventBus: EventBus;
    let services: ServiceContainer;
    let controller: ModalController;
    let mockReviewSequencer: any;

    beforeEach(() => {
        app = {
            workspace: {},
            vault: {},
        };

        eventBus = new EventBus();
        services = new ServiceContainer();

        // Create mock review sequencer
        mockReviewSequencer = {
            currentCard: null,
            updateCurrentQuestionText: mock(async (text: string) => {
                // Simulate updating the question text
                if (mockReviewSequencer.currentCard?.question) {
                    mockReviewSequencer.currentCard.question.questionText.actualQuestion = text;
                }
            }),
        };

        services.register("reviewSequencer", mockReviewSequencer);

        controller = new ModalController(app, eventBus, services);
    });

    /**
     * Feature: flashcard-modal-rewrite, Property 37: In-Place Card Editing
     *
     * For any card, the modal SHALL provide an edit button that opens an editor,
     * and after editing, SHALL update the source note and refresh the card display.
     *
     * Validates: Requirements 13.3, 13.4
     */
    test("Property 37: editing a card updates source note and emits refresh event", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 500 }), // Original card text
                fc.string({ minLength: 1, maxLength: 500 }), // Modified card text
                async (originalText, modifiedText) => {
                    // Create a mock card with question
                    const mockQuestion: Question = {
                        questionText: {
                            actualQuestion: originalText,
                            textDirection: TextDirection.Ltr,
                        } as QuestionText,
                        parsedFlashcard: {
                            id: "test-card-id",
                        },
                        writeQuestion: mock(async () => {}),
                    } as any;

                    const mockCard: Card = {
                        question: mockQuestion,
                    } as any;

                    // Set current card
                    mockReviewSequencer.currentCard = mockCard;

                    // Track events
                    let cardEditedEventEmitted = false;
                    let emittedCardId: string | undefined;
                    let emittedNewText: string | undefined;

                    eventBus.on("card-edited", (data: any) => {
                        cardEditedEventEmitted = true;
                        emittedCardId = data.cardId;
                        emittedNewText = data.newText;
                    });

                    // Mock the FlashcardEditModal to return modified text
                    mock.module("../../src/gui/modals/EditModal", () => ({
                        FlashcardEditModal: {
                            Prompt: mock(() => Promise.resolve(modifiedText)),
                        },
                    }));

                    // Call editCard
                    await controller.editCard();

                    // Verify updateCurrentQuestionText was called with modified text (Requirements 13.4)
                    expect(mockReviewSequencer.updateCurrentQuestionText).toHaveBeenCalledWith(
                        modifiedText,
                    );

                    // Verify the question text was updated
                    expect(mockCard.question.questionText.actualQuestion).toBe(modifiedText);

                    // Verify card-edited event was emitted (Requirements 13.4)
                    expect(cardEditedEventEmitted).toBe(true);
                    expect(emittedCardId).toBe("test-card-id");
                    expect(emittedNewText).toBe(modifiedText);

                    // Cleanup
                    eventBus.clear();
                },
            ),
            { numRuns: 50 }, // Reduced runs since this involves async operations
        );
    });

    /**
     * Additional test: Editing with no current card
     *
     * Verifies that editCard handles the case when there's no current card gracefully
     */
    test("editCard handles missing current card gracefully", async () => {
        // Set no current card
        mockReviewSequencer.currentCard = null;

        // Should not throw
        await expect(controller.editCard()).resolves.toBeUndefined();

        // Should not call updateCurrentQuestionText
        expect(mockReviewSequencer.updateCurrentQuestionText).not.toHaveBeenCalled();
    });

    /**
     * Additional test: Editing with no question
     *
     * Verifies that editCard handles cards without questions gracefully
     */
    test("editCard handles card without question gracefully", async () => {
        // Set card without question
        mockReviewSequencer.currentCard = {
            question: null,
        } as any;

        // Should not throw
        await expect(controller.editCard()).resolves.toBeUndefined();

        // Should not call updateCurrentQuestionText
        expect(mockReviewSequencer.updateCurrentQuestionText).not.toHaveBeenCalled();
    });

    /**
     * Additional test: User cancels edit
     *
     * Verifies that cancelling the edit doesn't update the card
     */
    test("cancelling edit does not update card", async () => {
        const originalText = "Original question text";

        const mockQuestion: Question = {
            questionText: {
                actualQuestion: originalText,
                textDirection: TextDirection.Ltr,
            } as QuestionText,
            parsedFlashcard: {
                id: "test-card-id",
            },
            writeQuestion: mock(async () => {}),
        } as any;

        const mockCard: Card = {
            question: mockQuestion,
        } as any;

        mockReviewSequencer.currentCard = mockCard;

        // Mock the FlashcardEditModal to reject (user cancelled)
        mock.module("../../src/gui/modals/EditModal", () => ({
            FlashcardEditModal: {
                Prompt: mock(() => Promise.reject("NO_INPUT")),
            },
        }));

        // Call editCard
        await controller.editCard();

        // Verify updateCurrentQuestionText was NOT called
        expect(mockReviewSequencer.updateCurrentQuestionText).not.toHaveBeenCalled();

        // Verify the question text was NOT changed
        expect(mockCard.question.questionText.actualQuestion).toBe(originalText);
    });
});
