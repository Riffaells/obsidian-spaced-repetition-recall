import { SRSettings } from "../settings/settings";
import { TrackedFile } from "./trackedFile";
import { RepetitionItem } from "./repetitionItem";

export type ReviewedCounts = Record<string, { new: number; due: number }>;

export interface IQueueData {
    queue: Record<string, number[]>;
    repeatQueue: number[];
    toDayAllQueue: Record<number, string>;
    toDayLaterQueue: Record<number, string>;
    lastQueue: number;
    newAdded: number;

    // Legacy fields for backward compatibility/tests
    newQueue?: number[];
    dueQueue?: number[];
}

export interface IQueue extends IQueueData {
    queueSize(key?: string): number;
    getNextId(key?: string): number | null;
    isInRepeatQueue(item: number): boolean;
    updateWhenReview(
        item: RepetitionItem,
        correct: boolean,
        repeatItems: boolean,
        store: IDataStore,
    ): void;
    remove(item: RepetitionItem, queue?: number[]): void;
    clearQueue(queue?: unknown): void;
    buildQueue(store: IDataStore): Promise<void>;
    buildQueueAll(store: IDataStore): void;
    laterSize: number;
    repeatQueueSize(): number;
    totalSize: number;
    isQueued(id: number): boolean;
    isInLaterQueue(id: number): boolean;
}

export interface SrsData {
    /**
     * @type {IQueue}
     */
    queues: IQueue;

    /**
     * @type {ReviewedCounts}
     */
    reviewedCounts: ReviewedCounts;
    /**
     * @type {ReviewedCounts}
     */
    reviewedCardCounts: ReviewedCounts;
    /**
     * @type {RepetitionItem[]}
     */
    items: RepetitionItem[];
    /**
     * @type {TrackedFile[]}
     */
    trackedFiles: TrackedFile[];

    /**
     * @type {number}
     */
    mtime: number;
    /**
     * @type {number}
     */
    version?: number;

    /**
     * @type {string} hash of flashcard rules to invalidate cache
     */
    settingsHash?: string;
}

export const DEFAULT_QUEUE_DATA: IQueueData = {
    queue: {},
    repeatQueue: [],
    toDayAllQueue: {},
    toDayLaterQueue: {},
    lastQueue: 0,
    newAdded: 0,
};

export const DEFAULT_SRS_DATA: SrsData = {
    queues: DEFAULT_QUEUE_DATA as IQueue,
    reviewedCounts: {},
    reviewedCardCounts: {},
    items: [],
    trackedFiles: [],
    mtime: 0,
};

export interface IDataStore {
    settings: SRSettings;
    data: SrsData;
    items: RepetitionItem[];

    verify(path: string): Promise<boolean>;
    updateMovedFile(trackedFile: TrackedFile): boolean;
    untrackFile(path: string, save?: boolean): number;
    getItembyID(id: number): RepetitionItem;
}
