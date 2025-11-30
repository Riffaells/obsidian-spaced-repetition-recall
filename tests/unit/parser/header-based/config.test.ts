import { mergeConfigs } from "src/parser/header-based/config";
import { HeaderCardConfig } from "src/parser/header-based/types";

describe("mergeConfigs", () => {
    describe("Error handling", () => {
        test("Throws error when given empty array", () => {
            expect(() => mergeConfigs([])).toThrow("Cannot merge empty config array");
        });
    });

    describe("Single config", () => {
        test("Returns copy of single config", () => {
            const config: HeaderCardConfig = {
                headingLevels: [2, 3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config]);

            expect(result).toEqual(config);
            expect(result).not.toBe(config); // Should be a copy
        });
    });

    describe("headingLevels merging (union)", () => {
        test("Merges two configs with different heading levels", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.headingLevels).toEqual([2, 3]);
        });

        test("Removes duplicates in heading levels", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2, 3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3, 4],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.headingLevels).toEqual([2, 3, 4]);
        });

        test("Sorts heading levels in ascending order", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [4, 2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3, 1],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.headingLevels).toEqual([1, 2, 3, 4]);
        });

        test("Handles empty heading levels array", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [2, 3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.headingLevels).toEqual([2, 3]);
        });

        test("Merges multiple configs with overlapping levels", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [1, 2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [2, 3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config3: HeaderCardConfig = {
                headingLevels: [3, 4],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2, config3]);

            expect(result.headingLevels).toEqual([1, 2, 3, 4]);
        });
    });

    describe("nestingMode merging (last wins)", () => {
        test("Last config nestingMode wins", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "flat",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.nestingMode).toEqual("flat");
        });

        test("Last config nestingMode wins with multiple configs", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "flat",
                mode: "qa",
                enabled: true,
            };
            const config3: HeaderCardConfig = {
                headingLevels: [4],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2, config3]);

            expect(result.nestingMode).toEqual("nested");
        });
    });

    describe("mode merging ('all' wins priority)", () => {
        test("'all' mode wins when present (qa then all)", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "all",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.mode).toEqual("all");
        });

        test("'all' mode wins regardless of order (all then qa)", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "all",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.mode).toEqual("all");
        });

        test("'all' mode wins with multiple configs (qa, all, qa)", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "all",
                enabled: true,
            };
            const config3: HeaderCardConfig = {
                headingLevels: [4],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2, config3]);

            // "all" wins because it's permissive (Requirement 3.3)
            expect(result.mode).toEqual("all");
        });

        test("Last 'qa' wins when no 'all' mode present", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.mode).toEqual("qa");
        });
    });

    describe("enabled merging (permissive priority)", () => {
        test("enabled: true wins over enabled: false", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: false,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.enabled).toEqual(true);
        });

        test("enabled: true wins regardless of order", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "qa",
                enabled: false,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.enabled).toEqual(true);
        });

        test("enabled: false when all configs are disabled", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: false,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "qa",
                enabled: false,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.enabled).toEqual(false);
        });

        test("enabled: true when any config in multiple is enabled", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: false,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config3: HeaderCardConfig = {
                headingLevels: [4],
                nestingMode: "nested",
                mode: "qa",
                enabled: false,
            };

            const result = mergeConfigs([config1, config2, config3]);

            expect(result.enabled).toEqual(true);
        });
    });

    describe("Complex merging scenarios", () => {
        test("Example from design doc: #flashcard/h2 + #flashcard/h3/flat", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3],
                nestingMode: "flat",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result).toEqual({
                headingLevels: [2, 3],
                nestingMode: "flat",
                mode: "qa",
                enabled: true,
            });
        });

        test("Example from design doc: #flashcard/disable + #flashcard/h2", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [],
                nestingMode: "nested",
                mode: "qa",
                enabled: false,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            expect(result.enabled).toEqual(true);
            expect(result.headingLevels).toEqual([2]);
        });

        test("Merges all properties correctly in complex scenario", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [1, 2],
                nestingMode: "nested",
                mode: "qa",
                enabled: false,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [3, 4],
                nestingMode: "flat",
                mode: "all",
                enabled: true,
            };
            const config3: HeaderCardConfig = {
                headingLevels: [5, 6],
                nestingMode: "nested",
                mode: "qa",
                enabled: false,
            };

            const result = mergeConfigs([config1, config2, config3]);

            expect(result).toEqual({
                headingLevels: [1, 2, 3, 4, 5, 6],
                nestingMode: "nested", // Last wins
                mode: "all", // "all" wins (permissive priority per Requirement 3.3)
                enabled: true, // Permissive priority
            });
        });

        test("Example from design doc: #flashcard/qa + #flashcard/all", () => {
            const config1: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "qa",
                enabled: true,
            };
            const config2: HeaderCardConfig = {
                headingLevels: [2],
                nestingMode: "nested",
                mode: "all",
                enabled: true,
            };

            const result = mergeConfigs([config1, config2]);

            // "all" wins always (Requirement 3.3)
            expect(result.mode).toEqual("all");
        });
    });
});
