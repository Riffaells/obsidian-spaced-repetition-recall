declare module "bun:test" {
    export function describe(name: string, fn: () => void): void;
    export function test(name: string, fn: () => void | Promise<void>): void;
    export function expect<T>(actual: T): {
        toBe(expected: T): void;
        toEqual(expected: T): void;
        toBeNull(): void;
        not: {
            toBeNull(): void;
        };
        toContain(item: any): void;
    };
    export const mock: {
        module(name: string, factory: () => any): void;
    };
}
