#!/usr/bin/env bun
import { readFileSync } from "fs";

interface TestResult {
    file: string;
    name: string;
    status: "pass" | "fail";
    duration?: number;
    error?: string;
}

class TestReporter {
    private results: TestResult[] = [];
    private currentFile = "";

    parseOutput(output: string): void {
        const lines = output.split("\n");

        for (const line of lines) {
            const fileMatch = line.match(/tests\/.*\.test\.ts/);
            if (fileMatch) {
                this.currentFile = fileMatch[0];
            }

            if (line.includes("✓") || line.includes("PASS")) {
                this.results.push({
                    file: this.currentFile,
                    name: line.trim(),
                    status: "pass",
                });
            } else if (line.includes("✗") || line.includes("FAIL")) {
                this.results.push({
                    file: this.currentFile,
                    name: line.trim(),
                    status: "fail",
                });
            }
        }
    }

    generateReport(): string {
        const passed = this.results.filter((r) => r.status === "pass");
        const failed = this.results.filter((r) => r.status === "fail");

        const failedByFile = this.groupByFile(failed);
        const passedByFile = this.groupByFile(passed);

        let report = "\n" + "=".repeat(80) + "\n";
        report += "📊 СВОДКА ТЕСТОВ\n";
        report += "=".repeat(80) + "\n";

        if (failed.length > 0) {
            report += `\n❌ НЕУСПЕШНЫЕ ТЕСТЫ (${failed.length}):\n`;
            report += "-".repeat(80) + "\n";

            for (const [file, tests] of Object.entries(failedByFile)) {
                report += `\n📁 ${file}\n`;
                tests.forEach((test) => {
                    report += `  ${test.name}\n`;
                });
            }
        }

        if (passed.length > 0) {
            report += `\n✅ УСПЕШНЫЕ ТЕСТЫ (${passed.length}):\n`;
            report += "-".repeat(80) + "\n";

            for (const [file, tests] of Object.entries(passedByFile)) {
                report += `  ✓ ${file} (${tests.length} тестов)\n`;
            }
        }

        const total = passed.length + failed.length;
        const passRate = total > 0 ? (passed.length / total) * 100 : 0;

        report += "\n" + "=".repeat(80) + "\n";
        report += `📈 ИТОГО: ${passed.length}/${total} успешно (${passRate.toFixed(1)}%)\n`;
        report += "=".repeat(80) + "\n";

        return report;
    }

    private groupByFile(results: TestResult[]): Record<string, TestResult[]> {
        const grouped: Record<string, TestResult[]> = {};

        for (const result of results) {
            if (!grouped[result.file]) {
                grouped[result.file] = [];
            }
            grouped[result.file].push(result);
        }

        return grouped;
    }

    async saveReports(): Promise<void> {
        const passed = this.results.filter((r) => r.status === "pass");
        const failed = this.results.filter((r) => r.status === "fail");

        // Сохраняем отдельные файлы
        const fs = await import("fs/promises");
        await fs.writeFile("test-passed.txt", this.formatResults(passed));
        await fs.writeFile("test-failed.txt", this.formatResults(failed));
        await fs.writeFile("test-summary.txt", this.generateReport());
    }

    private formatResults(results: TestResult[]): string {
        const grouped = this.groupByFile(results);
        let output = "";

        for (const [file, tests] of Object.entries(grouped)) {
            output += `\n${file}\n`;
            tests.forEach((test) => {
                output += `  ${test.name}\n`;
            });
        }

        return output;
    }
}

// Main execution
async function main() {
    const reporter = new TestReporter();
    let input = "";

    // Читаем из файла или stdin
    if (process.argv[2]) {
        input = readFileSync(process.argv[2], "utf-8");
    } else {
        // Читаем из stdin
        const stdin = process.stdin;
        stdin.setEncoding("utf-8");

        for await (const chunk of stdin) {
            input += chunk;
        }
    }

    reporter.parseOutput(input);
    console.log(reporter.generateReport());
    await reporter.saveReports();

    console.log("\n📝 Результаты сохранены:");
    console.log("  - test-passed.txt (успешные)");
    console.log("  - test-failed.txt (неуспешные)");
    console.log("  - test-summary.txt (сводка)");
}

main();
