import { ModalState } from "../types";
import { EventBus } from "./EventBus";

export class StateMachine {
    private currentState: ModalState = ModalState.CLOSED;
    private eventBus: EventBus;

    private readonly VALID_TRANSITIONS: Record<ModalState, ModalState[]> = {
        [ModalState.CLOSED]: [ModalState.DECK_SELECTION, ModalState.ERROR],
        [ModalState.DECK_SELECTION]: [ModalState.CARD_FRONT, ModalState.CLOSED, ModalState.ERROR],
        [ModalState.CARD_FRONT]: [
            ModalState.CARD_BACK,
            ModalState.DECK_SELECTION,
            ModalState.CLOSED,
            ModalState.ERROR,
        ],
        [ModalState.CARD_BACK]: [
            ModalState.CARD_FRONT,
            ModalState.SESSION_COMPLETE,
            ModalState.DECK_SELECTION,
            ModalState.CLOSED,
            ModalState.ERROR,
        ],
        [ModalState.SESSION_COMPLETE]: [
            ModalState.DECK_SELECTION,
            ModalState.CLOSED,
            ModalState.ERROR,
        ],
        [ModalState.ERROR]: [
            ModalState.DECK_SELECTION,
            ModalState.CLOSED,
            ModalState.CARD_FRONT,
            ModalState.CARD_BACK,
            ModalState.SESSION_COMPLETE,
        ],
    };

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    transitionTo(newState: ModalState, context?: any): void {
        if (!this.isValidTransition(this.currentState, newState)) {
            if (this.currentState !== newState) {
                console.error(`Invalid transition from ${this.currentState} to ${newState}`);
            }
            return;
        }

        const oldState = this.currentState;
        this.currentState = newState;

        this.eventBus.emit("state-changed", {
            from: oldState,
            to: newState,
            context,
        });
    }

    getCurrentState(): ModalState {
        return this.currentState;
    }

    private isValidTransition(from: ModalState, to: ModalState): boolean {
        // Special case via design: ANY -> ERROR
        if (to === ModalState.ERROR) return true;

        return this.VALID_TRANSITIONS[from]?.includes(to) ?? false;
    }
}
