import { Question } from "../models/Question";

export interface IQuestionPostponementList {
    clear(): void;
    add(question: Question): void;
    includes(question: Question): boolean;
    write(): Promise<void>;
}
