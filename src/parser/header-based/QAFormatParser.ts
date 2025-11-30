import { ContentBoundary, QAContent } from "./types";

/**
 * Parses extended QA format content under headings.
 * 
 * The QA format allows for a question and answer to be placed under a heading:
 * 
 * ## Heading
 * 
 * Question text?
 * 
 * Answer text (first paragraph only)
 * 
 * Second paragraph (ignored due to double newline separator)
 * 
 * Rules:
 * - Empty lines after heading are ignored when finding the question
 * - Question must end with "?"
 * - Single empty line (\n) between question and answer = continuation
 * - Double empty line (\n\n) = paragraph separator, only first paragraph used
 */
export class QAFormatParser {
    /**
     * Parses QA format content under a heading.
     * 
     * @param headingLine - Line number of the heading (0-based)
     * @param boundary - Content boundary defining the answer area
     * @param noteLines - All lines in the note
     * @returns QAContent if valid QA format found, null otherwise
     */
    parseQAContent(
        headingLine: number,
        boundary: ContentBoundary,
        noteLines: string[]
    ): QAContent | null {
        // 1. Find the first non-empty line after heading (the question)
        const questionLine = this.findFirstNonEmptyLine(
            headingLine + 1,
            boundary.endLine,
            noteLines
        );
        
        // If no question found (all empty lines)
        if (questionLine === -1) {
            return null;
        }
        
        const question = noteLines[questionLine].trim();
        
        // 2. Question must end with "?"
        if (!question.endsWith("?")) {
            return null;
        }

        // 3. Find the start of the answer (first non-empty line after question)
        const answerStartLine = this.findFirstNonEmptyLine(
            questionLine + 1,
            boundary.endLine,
            noteLines
        );
        
        // If no answer found
        if (answerStartLine === -1) {
            return null;
        }
        
        // 4. Extract the first paragraph of the answer
        const { text: answer, endLine: answerEndLine } = this.extractFirstParagraph(
            answerStartLine,
            boundary.endLine,
            noteLines
        );
        
        // If answer is empty after extraction
        if (answer.trim().length === 0) {
            return null;
        }
        
        return {
            question,
            answer,
            questionLineStart: questionLine,
            answerLineStart: answerStartLine,
            answerLineEnd: answerEndLine
        };
    }
    
    /**
     * Finds the first non-empty line in a range.
     * 
     * @param startLine - Start of range (inclusive)
     * @param endLine - End of range (inclusive)
     * @param noteLines - All lines in the note
     * @returns Line number of first non-empty line, or -1 if none found
     */
    findFirstNonEmptyLine(
        startLine: number,
        endLine: number,
        noteLines: string[]
    ): number {
        for (let i = startLine; i <= endLine && i < noteLines.length; i++) {
            if (noteLines[i].trim().length > 0) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * Extracts the first paragraph from a range of lines.
     * 
     * Rules:
     * - Single empty line (\n) = continuation of paragraph
     * - Two consecutive empty lines (\n\n) = paragraph separator
     * 
     * @param startLine - Start of range (inclusive)
     * @param endLine - End of range (inclusive)
     * @param noteLines - All lines in the note
     * @returns Object with text and endLine of the first paragraph
     */
    extractFirstParagraph(
        startLine: number,
        endLine: number,
        noteLines: string[]
    ): { text: string; endLine: number } {
        const paragraphLines: string[] = [];
        let currentLine = startLine;
        let consecutiveEmptyLines = 0;
        let lastNonEmptyLine = startLine;
        
        while (currentLine <= endLine && currentLine < noteLines.length) {
            const line = noteLines[currentLine];
            const trimmedLine = line.trim();
            
            if (trimmedLine.length === 0) {
                // Empty line
                consecutiveEmptyLines++;
                
                // Two consecutive empty lines = end of paragraph
                if (consecutiveEmptyLines >= 2) {
                    break;
                }
                
                // Single empty line = continuation, add it
                paragraphLines.push(line);
            } else {
                // Non-empty line
                consecutiveEmptyLines = 0;
                paragraphLines.push(line);
                lastNonEmptyLine = currentLine;
            }
            
            currentLine++;
        }
        
        // Remove trailing empty lines from the paragraph
        while (paragraphLines.length > 0 && 
               paragraphLines[paragraphLines.length - 1].trim().length === 0) {
            paragraphLines.pop();
        }
        
        return {
            text: paragraphLines.join("\n"),
            endLine: lastNonEmptyLine
        };
    }
    
    /**
     * Checks if a line is a paragraph separator (part of double newline).
     * A paragraph separator occurs when there are two consecutive empty lines.
     * 
     * @param lineIndex - Index of the line to check
     * @param noteLines - All lines in the note
     * @returns True if this line is part of a paragraph separator
     */
    isParagraphSeparator(
        lineIndex: number,
        noteLines: string[]
    ): boolean {
        // Line must be empty
        if (lineIndex < 0 || lineIndex >= noteLines.length) {
            return false;
        }
        
        if (noteLines[lineIndex].trim().length > 0) {
            return false;
        }
        
        // Check if previous line is also empty
        if (lineIndex > 0 && noteLines[lineIndex - 1].trim().length === 0) {
            return true;
        }
        
        // Check if next line is also empty
        if (lineIndex < noteLines.length - 1 && noteLines[lineIndex + 1].trim().length === 0) {
            return true;
        }
        
        return false;
    }
}
