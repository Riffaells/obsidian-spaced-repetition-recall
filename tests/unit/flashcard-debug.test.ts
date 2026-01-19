import { describe, test, expect, mock } from "bun:test";
import { CardView } from "src/gui/flashcard-modal-rewrite/components/CardView";
import { ModalState } from "src/gui/flashcard-modal-rewrite/types";

describe("Flashcard Modal Infrastructure Debug", () => {
    test("CardView.renderFront with mock card", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const mockRenderer = {
            render: async (text: string, el: HTMLElement) => {
                el.createDiv().setText(text);
            },
        };

        const mockApp = {} as any;
        const cardView = new CardView(mockApp, container, mockRenderer as any);

        const mockCard = {
            questionType: 1,
            question: {
                note: { file: { basename: "test" }, filePath: "test.md" },
                questionText: { textDirection: 0 },
                questionContext: [],
                topicPathList: { list: [] },
                cards: [],
            },
            front: "front",
            back: "back",
        } as any;

        await cardView.renderFront(mockCard);

        const announcer = container.querySelector('[aria-live="polite"]');
        expect(announcer).not.toBeNull();
        expect(announcer?.textContent).toContain("front");

        document.body.removeChild(container);
    });
});
