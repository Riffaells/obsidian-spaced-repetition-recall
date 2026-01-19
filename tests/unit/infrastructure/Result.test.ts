import { describe, test, expect } from "bun:test";
import { Ok, Err, Result } from "../../../src/core/infrastructure/Result";
import { StorageError } from "../../../src/core/infrastructure/errors";

/**
 * Feature: data-storage-improvements, Property 1: Storage operations return Result types
 * Validates: Requirements 1.2, 1.3
 *
 * Property: For any storage operation (read or write), the operation should return
 * a Result type containing either the success value or an error, never throwing exceptions.
 */
describe("Result Type - Property Tests", () => {
    describe("Property 1: Storage operations return Result types", () => {
        test("Ok result should have isOk=true and isErr=false", () => {
            // Generate various success values
            const testValues = [
                42,
                "test string",
                { data: "object" },
                [1, 2, 3],
                null,
                undefined,
                true,
                false,
            ];

            for (const value of testValues) {
                const result = new Ok(value);

                expect(result.isOk).toBe(true);
                expect(result.isErr).toBe(false);
                expect(result.value).toBe(value);
            }
        });

        test("Err result should have isOk=false and isErr=true", () => {
            // Generate various error types
            const testErrors = [
                new Error("generic error"),
                new StorageError("storage error"),
                new TypeError("type error"),
                { message: "custom error object" },
                "string error",
                42,
            ];

            for (const error of testErrors) {
                const result = new Err(error);

                expect(result.isOk).toBe(false);
                expect(result.isErr).toBe(true);
                expect(result.error).toBe(error);
            }
        });

        test("Result type should never throw exceptions when created", () => {
            // Test that creating Results never throws
            const operations = [
                () => new Ok(42),
                () => new Ok(null),
                () => new Ok(undefined),
                () => new Err(new Error("test")),
                () => new Err(null),
                () => new Err(undefined),
            ];

            for (const operation of operations) {
                expect(operation).not.toThrow();
            }
        });

        test("Ok and Err should be mutually exclusive", () => {
            const okResult = new Ok(42);
            const errResult = new Err(new Error("test"));

            // Ok result should not be Err
            expect(okResult.isOk).toBe(true);
            expect(okResult.isErr).toBe(false);

            // Err result should not be Ok
            expect(errResult.isOk).toBe(false);
            expect(errResult.isErr).toBe(true);
        });

        test("Result should preserve value types", () => {
            // Test various types
            const numberResult = new Ok(42);
            expect(typeof numberResult.value).toBe("number");

            const stringResult = new Ok("test");
            expect(typeof stringResult.value).toBe("string");

            const objectResult = new Ok({ key: "value" });
            expect(typeof objectResult.value).toBe("object");

            const arrayResult = new Ok([1, 2, 3]);
            expect(Array.isArray(arrayResult.value)).toBe(true);
        });

        test("Result should preserve error types", () => {
            const errorResult = new Err(new StorageError("test"));
            expect(errorResult.error).toBeInstanceOf(StorageError);

            const typeErrorResult = new Err(new TypeError("test"));
            expect(typeErrorResult.error).toBeInstanceOf(TypeError);
        });

        test("simulated storage operations should return Result types", () => {
            // Simulate storage read operation
            const simulateRead = (shouldSucceed: boolean): Result<string, StorageError> => {
                if (shouldSucceed) {
                    return new Ok("data from storage");
                } else {
                    return new Err(new StorageError("Failed to read"));
                }
            };

            // Simulate storage write operation
            const simulateWrite = (shouldSucceed: boolean): Result<void, StorageError> => {
                if (shouldSucceed) {
                    return new Ok(undefined);
                } else {
                    return new Err(new StorageError("Failed to write"));
                }
            };

            // Test successful operations
            const readSuccess = simulateRead(true);
            expect(readSuccess.isOk).toBe(true);
            if (readSuccess.isOk) {
                expect(readSuccess.value).toBe("data from storage");
            }

            const writeSuccess = simulateWrite(true);
            expect(writeSuccess.isOk).toBe(true);

            // Test failed operations
            const readFailure = simulateRead(false);
            expect(readFailure.isErr).toBe(true);
            if (readFailure.isErr) {
                expect(readFailure.error).toBeInstanceOf(StorageError);
            }

            const writeFailure = simulateWrite(false);
            expect(writeFailure.isErr).toBe(true);
            if (writeFailure.isErr) {
                expect(writeFailure.error).toBeInstanceOf(StorageError);
            }
        });

        test("Result pattern matching should work correctly", () => {
            const processResult = <T, E>(result: Result<T, E>): string => {
                if (result.isOk) {
                    return `Success: ${result.value}`;
                } else {
                    return `Error: ${result.error}`;
                }
            };

            const okResult = new Ok(42);
            expect(processResult(okResult)).toBe("Success: 42");

            const errResult = new Err(new Error("failed"));
            expect(processResult(errResult)).toContain("Error:");
        });

        test("multiple Result operations should compose correctly", () => {
            // Simulate a chain of operations
            const operation1 = (): Result<number, Error> => new Ok(10);
            const operation2 = (value: number): Result<number, Error> => new Ok(value * 2);
            const operation3 = (value: number): Result<string, Error> => new Ok(`Result: ${value}`);

            const result1 = operation1();
            expect(result1.isOk).toBe(true);

            if (result1.isOk) {
                const result2 = operation2(result1.value);
                expect(result2.isOk).toBe(true);

                if (result2.isOk) {
                    const result3 = operation3(result2.value);
                    expect(result3.isOk).toBe(true);
                    if (result3.isOk) {
                        expect(result3.value).toBe("Result: 20");
                    }
                }
            }
        });

        test("Result should handle async operations", async () => {
            const asyncOperation = async (
                shouldSucceed: boolean,
            ): Promise<Result<string, Error>> => {
                await new Promise((resolve) => setTimeout(resolve, 1));
                if (shouldSucceed) {
                    return new Ok("async success");
                } else {
                    return new Err(new Error("async failure"));
                }
            };

            const successResult = await asyncOperation(true);
            expect(successResult.isOk).toBe(true);
            if (successResult.isOk) {
                expect(successResult.value).toBe("async success");
            }

            const failureResult = await asyncOperation(false);
            expect(failureResult.isErr).toBe(true);
            if (failureResult.isErr) {
                expect(failureResult.error.message).toBe("async failure");
            }
        });
    });
});
