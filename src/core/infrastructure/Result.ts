/**
 * Result type for type-safe error handling without exceptions.
 * A Result can be either Ok (success) or Err (failure).
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Represents a successful result containing a value.
 */
export class Ok<T> {
    readonly isOk: true = true;
    readonly isErr: false = false;

    constructor(readonly value: T) {}
}

/**
 * Represents a failed result containing an error.
 */
export class Err<E> {
    readonly isOk: false = false;
    readonly isErr: true = true;

    constructor(readonly error: E) {}
}

/**
 * Helper function to create an Ok result.
 * @param value - The success value
 * @returns An Ok result containing the value
 */
export function createOk<T>(value: T): Ok<T> {
    return new Ok(value);
}

/**
 * Helper function to create an Err result.
 * @param error - The error value
 * @returns An Err result containing the error
 */
export function createErr<E>(error: E): Err<E> {
    return new Err(error);
}
