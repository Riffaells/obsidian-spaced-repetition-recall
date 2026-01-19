import { describe, test, expect } from "bun:test";
import { StateMachine } from "src/gui/flashcard-modal-rewrite/utils/StateMachine.ts";
import { EventBus } from "src/gui/flashcard-modal-rewrite/utils/EventBus.ts";
import { ModalState } from "src/gui/flashcard-modal-rewrite/types.ts";

describe("SM Debug", () => {
    test("CLOSED to CLOSED", () => {
        const bus = new EventBus();
        const machine = new StateMachine(bus);
        (machine as any).currentState = ModalState.CLOSED;

        let eventEmitted: ModalState | null = null;
        bus.on("state-changed", (data: any) => {
            eventEmitted = data.to;
        });

        machine.transitionTo(ModalState.CLOSED);
        expect(machine.getCurrentState()).toBe(ModalState.CLOSED);
        expect(eventEmitted).toBeNull();
    });
});
