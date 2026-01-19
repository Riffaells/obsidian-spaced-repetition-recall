import { SessionView } from "src/gui/flashcard-modal-rewrite/components/SessionView";
import { SessionStats } from "src/gui/flashcard-modal-rewrite/types";
import { ReviewResponse } from "src/core/scheduling/scheduling";
import { TopicPath } from "src/core/services/TopicPath";
import * as fc from "fast-check";

// Helper to create a mock container
const createMockContainer = (): HTMLElement => {
    const container = document.createElement("div");
    return container;
};

// Arbitrary for SessionStats
const arbSessionStats = (): fc.Arbitrary<SessionStats> => {
    return fc
        .tuple(
            fc.integer({ min: 0, max: 100 }), // cardsReviewed
            fc.integer({ min: 0, max: 3600000 }), // timeSpent
            fc.integer({ min: 0, max: 10 }), // reset (ReviewResponse.Reset = 0)
            fc.integer({ min: 0, max: 50 }), // hard (ReviewResponse.Hard = 1)
            fc.integer({ min: 0, max: 50 }), // good (ReviewResponse.Good = 2)
            fc.integer({ min: 0, max: 50 }), // easy (ReviewResponse.Easy = 3)
            fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => s.trim().length > 0 && !s.includes("/")), // deckName
            fc
                .array(
                    fc
                        .string({ minLength: 1, maxLength: 20 })
                        .filter((s) => s.trim().length > 0 && !s.includes("/")),
                    { minLength: 1, maxLength: 5 },
                )
                .map((parts) => new TopicPath(parts)), // deckPath
            fc.integer({ min: 0, max: 100 }), // remainingCards
        )
        .map(
            ([
                cardsReviewed,
                timeSpent,
                reset,
                hard,
                good,
                easy,
                deckName,
                deckPath,
                remainingCards,
            ]) => {
                const stats: SessionStats = {
                    cardsReviewed,
                    timeSpent,
                    responses: {
                        [ReviewResponse.Reset]: reset,
                        [ReviewResponse.Hard]: hard,
                        [ReviewResponse.Good]: good,
                        [ReviewResponse.Easy]: easy,
                    },
                    deckName,
                    deckPath,
                    remainingCards,
                };
                return stats;
            },
        );
};

describe("SessionView Property Tests", () => {
    // Feature: flashcard-modal-rewrite, Property 39: Session Progress Visualization
    test("progress bar updates after each card review", () => {
        const initialStats: SessionStats = {
            cardsReviewed: 0,
            timeSpent: 0,
            responses: {
                [ReviewResponse.Reset]: 0,
                [ReviewResponse.Hard]: 0,
                [ReviewResponse.Good]: 0,
                [ReviewResponse.Easy]: 0,
            },
            deckName: "Test Deck",
            deckPath: new TopicPath(["Test Deck"]),
            remainingCards: 10,
        };

        const container = createMockContainer();
        const view = new SessionView(container, initialStats);
        view.render();

        console.log("Container HTML:", container.innerHTML);
        console.log("Container children:", container.children);
        console.log("Container childNodes:", container.childNodes);

        // Verify initial progress bar exists
        let progressBar = container.querySelector(".sr-progress-bar") as HTMLElement;
        let progressText = container.querySelector(".sr-progress-text") as HTMLElement;

        console.log("Progress bar:", progressBar);
        console.log("Progress text:", progressText);

        expect(progressBar).toBeTruthy();
        expect(progressText).toBeTruthy();
        expect(progressBar.style.width).toBe("0%");
        expect(progressText.textContent).toContain("0 / 10");

        // Simulate reviewing 5 cards
        for (let i = 1; i <= 5; i++) {
            const updatedStats: SessionStats = {
                ...initialStats,
                cardsReviewed: i,
                remainingCards: 10 - i,
                responses: {
                    [ReviewResponse.Reset]: 0,
                    [ReviewResponse.Hard]: 0,
                    [ReviewResponse.Good]: i,
                    [ReviewResponse.Easy]: 0,
                },
            };
            view.updateStats(updatedStats);

            progressBar = container.querySelector(".sr-progress-bar") as HTMLElement;
            progressText = container.querySelector(".sr-progress-text") as HTMLElement;

            const expectedPercent = (i / 10) * 100;
            expect(progressBar.style.width).toBe(`${expectedPercent}%`);
            expect(progressText.textContent).toContain(`${i} / 10`);
        }
    });

    // Feature: flashcard-modal-rewrite, Property 40: Card Schedule Information Display
    test("displays schedule information based on response distribution", () => {
        // Test with responses
        const statsWithResponses: SessionStats = {
            cardsReviewed: 10,
            timeSpent: 60000,
            responses: {
                [ReviewResponse.Reset]: 0,
                [ReviewResponse.Hard]: 2,
                [ReviewResponse.Good]: 5,
                [ReviewResponse.Easy]: 3,
            },
            deckName: "Test Deck",
            deckPath: new TopicPath(["Test Deck"]),
            remainingCards: 5,
        };

        const container1 = createMockContainer();
        const view1 = new SessionView(container1, statsWithResponses);
        view1.render();

        const scheduleContainer1 = container1.querySelector(".sr-schedule-info");
        const scheduleText1 = container1.querySelector(".sr-schedule-text");

        expect(scheduleContainer1).toBeTruthy();
        expect(scheduleText1).toBeTruthy();
        expect(scheduleText1?.textContent).toBeTruthy();
        expect(scheduleText1?.textContent).toContain("days");

        // Test without responses
        const statsWithoutResponses: SessionStats = {
            cardsReviewed: 0,
            timeSpent: 0,
            responses: {
                [ReviewResponse.Reset]: 0,
                [ReviewResponse.Hard]: 0,
                [ReviewResponse.Good]: 0,
                [ReviewResponse.Easy]: 0,
            },
            deckName: "Test Deck",
            deckPath: new TopicPath(["Test Deck"]),
            remainingCards: 10,
        };

        const container2 = createMockContainer();
        const view2 = new SessionView(container2, statsWithoutResponses);
        view2.render();

        const scheduleContainer2 = container2.querySelector(".sr-schedule-info");
        const scheduleText2 = container2.querySelector(".sr-schedule-text");

        expect(scheduleContainer2).toBeTruthy();
        expect(scheduleText2).toBeTruthy();
        expect(scheduleText2?.textContent).toBeTruthy();
    });

    // Feature: flashcard-modal-rewrite, Property 41: Session Completion Summary
    test("displays completion summary when session is complete", () => {
        const completedStats: SessionStats = {
            cardsReviewed: 20,
            timeSpent: 120000,
            responses: {
                [ReviewResponse.Reset]: 1,
                [ReviewResponse.Hard]: 3,
                [ReviewResponse.Good]: 10,
                [ReviewResponse.Easy]: 6,
            },
            deckName: "Test Deck",
            deckPath: new TopicPath(["Test Deck"]),
            remainingCards: 0,
        };

        const container = createMockContainer();
        const view = new SessionView(container, completedStats);
        view.render();

        // Verify completion summary exists
        const completionContainer = container.querySelector(".sr-completion-summary");
        expect(completionContainer).toBeTruthy();

        // Verify completion title
        const completionTitle = container.querySelector(".sr-completion-title");
        expect(completionTitle).toBeTruthy();
        expect(completionTitle?.textContent).toContain("Complete");

        // Verify completion stats
        const completionStats = container.querySelector(".sr-completion-stats");
        expect(completionStats).toBeTruthy();

        const statsText = completionStats?.textContent || "";
        expect(statsText).toContain("20");
        expect(statsText).toContain("cards");
        expect(statsText).toContain("Success rate");
        expect(statsText).toContain("%");
    });

    // Feature: flashcard-modal-rewrite, Property 42: Statistics Link Provision
    test("provides clickable link to detailed statistics", () => {
        const completedStats: SessionStats = {
            cardsReviewed: 15,
            timeSpent: 90000,
            responses: {
                [ReviewResponse.Reset]: 1,
                [ReviewResponse.Hard]: 3,
                [ReviewResponse.Good]: 8,
                [ReviewResponse.Easy]: 3,
            },
            deckName: "Test Deck",
            deckPath: new TopicPath(["Test Deck"]),
            remainingCards: 0,
        };

        const container = createMockContainer();
        const view = new SessionView(container, completedStats);
        view.render();

        // Verify statistics link exists
        const statsLink = container.querySelector(".sr-stats-link") as HTMLAnchorElement;
        expect(statsLink).toBeTruthy();
        expect(statsLink.tagName).toBe("A");
        expect(statsLink.textContent).toContain("statistics");
        expect(statsLink.getAttribute("href")).toBe("#");
        // Verify clicking the link emits an event
        let eventFired = false;
        container.addEventListener("sr-view-statistics", (e: Event) => {
            eventFired = true;
            const customEvent = e as CustomEvent;
            expect(customEvent.detail.stats).toBeTruthy();
            expect(customEvent.detail.stats.cardsReviewed).toBe(15);
        });

        statsLink.click();
        expect(eventFired).toBe(true);
    });

    // Additional property test: Progress bar percentage calculation
    test("progress bar percentage is always between 0 and 100", () => {
        fc.assert(
            fc.property(arbSessionStats(), (stats) => {
                const container = createMockContainer();
                const view = new SessionView(container, stats);
                view.render();

                const progressBar = container.querySelector(".sr-progress-bar") as HTMLElement;
                if (progressBar) {
                    const widthStr = progressBar.style.width;
                    const width = parseFloat(widthStr);

                    // Progress should be between 0 and 100
                    expect(width).toBeGreaterThanOrEqual(0);
                    expect(width).toBeLessThanOrEqual(100);

                    // Verify width is not NaN
                    expect(isNaN(width)).toBe(false);

                    // If no cards, progress should be 0
                    const totalCards = stats.cardsReviewed + stats.remainingCards;
                    if (totalCards === 0) {
                        expect(width).toBe(0);
                    }

                    // If all cards reviewed, progress should be 100
                    if (stats.remainingCards === 0 && stats.cardsReviewed > 0) {
                        expect(width).toBe(100);
                    }
                }
            }),
            { numRuns: 100 },
        );
    });

    // Additional property test: Response breakdown displays all non-zero responses
    test("response breakdown displays all non-zero response types", () => {
        fc.assert(
            fc.property(
                arbSessionStats().filter((stats) => {
                    // Ensure at least one response is non-zero
                    const totalResponses = Object.values(stats.responses).reduce(
                        (a, b) => a + (b || 0),
                        0,
                    );
                    return totalResponses > 0;
                }),
                (stats) => {
                    const container = createMockContainer();
                    const view = new SessionView(container, stats);
                    view.render();

                    const breakdownContainer = container.querySelector(".sr-response-breakdown");
                    expect(breakdownContainer).toBeTruthy();

                    // Check each response type
                    const responseTypes = [
                        { type: ReviewResponse.Easy, label: "Easy" },
                        { type: ReviewResponse.Good, label: "Good" },
                        { type: ReviewResponse.Hard, label: "Hard" },
                        { type: ReviewResponse.Reset, label: "Reset" },
                    ];

                    responseTypes.forEach(({ type, label }) => {
                        const count = stats.responses[type] || 0;
                        const responseItems = Array.from(
                            breakdownContainer.querySelectorAll(".sr-response-item"),
                        );
                        const hasItem = responseItems.some((item) =>
                            item.textContent?.includes(label),
                        );

                        // If count > 0, item should exist
                        if (count > 0) {
                            expect(hasItem).toBe(true);
                            // Verify count is displayed
                            const matchingItem = responseItems.find((item) =>
                                item.textContent?.includes(label),
                            );
                            expect(matchingItem?.textContent).toContain(count.toString());
                        }
                    });
                },
            ),
            { numRuns: 100 },
        );
    });

    // Additional property test: Time formatting is consistent
    test("time formatting produces valid human-readable strings", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 86400000 }), // 0 to 24 hours in ms
                (timeSpent) => {
                    const stats: SessionStats = {
                        cardsReviewed: 10,
                        timeSpent,
                        responses: {
                            [ReviewResponse.Easy]: 5,
                            [ReviewResponse.Good]: 3,
                            [ReviewResponse.Hard]: 2,
                            [ReviewResponse.Reset]: 0,
                        },
                        deckName: "Test",
                        deckPath: new TopicPath(["Test"]),
                        remainingCards: 0,
                    };

                    const container = createMockContainer();
                    const view = new SessionView(container, stats);
                    view.render();

                    // Find time display in statistics or completion summary
                    const statsContainer = container.querySelector(".sr-statistics-container");
                    const completionStats = container.querySelector(".sr-completion-stats");

                    const timeText =
                        statsContainer?.textContent || completionStats?.textContent || "";

                    // Verify time text is not empty
                    expect(timeText.length).toBeGreaterThan(0);

                    // Verify time format contains expected patterns
                    const hasValidTimeFormat =
                        timeText.includes("s") || // seconds
                        timeText.includes("m") || // minutes
                        timeText.includes("h"); // hours

                    expect(hasValidTimeFormat).toBe(true);

                    // Verify no negative values
                    expect(timeText).not.toContain("-");

                    // Verify the formatted time is reasonable
                    if (timeSpent === 0) {
                        expect(timeText).toContain("0s");
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
