interface IMinTouch {
    identifier: number;
    pageX: number;
    pageY: number;
}

export class TouchOnMobile {
    private static readonly LONG_CLICK_DURATION = 800; // ms
    private static readonly SWIPE_MAX_DURATION = 200; // ms
    private static readonly SWIPE_MAX_X_DIFF = 30; // px
    private static readonly SWIPE_MIN_Y_DIFF = 50; // px
    private static readonly LONG_CLICK_MAX_MOVEMENT = 10; // px

    private timeStart = 0;
    private originTouches: IMinTouch[] = [];
    private ongoingTouches: IMinTouch[] = [];

    public longClickCb?: () => void;
    public swipeUpCb?: () => void;

    static create(): TouchOnMobile {
        return new TouchOnMobile();
    }

    handleStart(evt: TouchEvent): void {
        const touches = evt.changedTouches;
        this.timeStart = Date.now();
        
        for (let i = 0; i < touches.length; i++) {
            this.originTouches.push(copyTouch(touches[i]));
            this.ongoingTouches.push(copyTouch(touches[i]));
        }
    }

    handleMove(evt: TouchEvent): void {
        const touches = evt.changedTouches;

        for (let i = 0; i < touches.length; i++) {
            const idx = this.findTouchesIndexById(touches[i].identifier);

            if (idx >= 0) {
                this.ongoingTouches.splice(idx, 1, copyTouch(touches[i]));
            }
        }
    }

    handleEnd(evt: TouchEvent): void {
        const touches = evt.changedTouches;

        for (let i = 0; i < touches.length; i++) {
            const idx = this.findTouchesIndexById(touches[i].identifier);
            
            if (idx >= 0) {
                // Check for long click first (higher priority)
                if (this.isLongClick(idx)) {
                    evt.preventDefault();
                    if (this.longClickCb) {
                        this.longClickCb();
                    }
                } 
                // Then check for swipe up
                else if (this.isSwipeUp(idx)) {
                    evt.preventDefault();
                    if (this.swipeUpCb) {
                        this.swipeUpCb();
                    }
                }

                this.originTouches.splice(idx, 1);
                this.ongoingTouches.splice(idx, 1);
            }
        }
    }

    handleCancel(evt: TouchEvent): void {
        evt.preventDefault();
        const touches = evt.changedTouches;

        for (let i = 0; i < touches.length; i++) {
            const idx = this.findTouchesIndexById(touches[i].identifier);
            
            if (idx >= 0) {
                this.originTouches.splice(idx, 1);
                this.ongoingTouches.splice(idx, 1);
            }
        }
    }

    private findTouchesIndexById(idToFind: number): number {
        return this.ongoingTouches.findIndex((t) => t.identifier === idToFind);
    }

    private isSwipeUp(idx: number): boolean {
        if (!this.isValidIndex(idx)) {
            return false;
        }

        const duration = this.getTimeDuration();
        const xDiff = this.absXDiff(idx);
        const yDiff = this.actYDiff(idx);

        return (
            duration < TouchOnMobile.SWIPE_MAX_DURATION &&
            xDiff < TouchOnMobile.SWIPE_MAX_X_DIFF &&
            yDiff > TouchOnMobile.SWIPE_MIN_Y_DIFF
        );
    }

    private isLongClick(idx: number): boolean {
        if (!this.isValidIndex(idx)) {
            return false;
        }

        const duration = this.getTimeDuration();
        const xDiff = this.absXDiff(idx);
        const yDiff = Math.abs(this.actYDiff(idx));

        return (
            duration >= TouchOnMobile.LONG_CLICK_DURATION &&
            xDiff < TouchOnMobile.LONG_CLICK_MAX_MOVEMENT &&
            yDiff < TouchOnMobile.LONG_CLICK_MAX_MOVEMENT
        );
    }

    private isValidIndex(idx: number): boolean {
        return (
            idx >= 0 &&
            idx < this.originTouches.length &&
            idx < this.ongoingTouches.length
        );
    }

    private getTimeDuration(): number {
        return Date.now() - this.timeStart;
    }

    private actYDiff(idx: number): number {
        return this.originTouches[idx].pageY - this.ongoingTouches[idx].pageY;
    }

    private absXDiff(idx: number): number {
        return Math.abs(this.originTouches[idx].pageX - this.ongoingTouches[idx].pageX);
    }
}

function copyTouch(touch: Touch): IMinTouch {
    return {
        identifier: touch.identifier,
        pageX: touch.pageX,
        pageY: touch.pageY,
    };
}
