import { HeadingInfo, ContentBoundary } from "./types";

/**
 * Detects content boundaries for header-based flashcards.
 * Determines where the answer content starts and ends for a given heading.
 */
export class ContentBoundaryDetector {
    /**
     * Detects the boundary of content for a heading-based flashcard.
     * 
     * @param questionHeading - The heading that serves as the question
     * @param allHeadings - All headings in the note
     * @param noteLines - All lines in the note
     * @param nestingMode - "nested" includes subheadings, "flat" stops at first subheading
     * @returns ContentBoundary defining start and end of the answer
     */
    detectBoundary(
        questionHeading: HeadingInfo,
        allHeadings: HeadingInfo[],
        noteLines: string[],
        nestingMode: "nested" | "flat"
    ): ContentBoundary {
        // Start line is right after the heading
        const startLine = questionHeading.lineNumber + 1;
        
        // Find where the answer should end based on nesting mode
        let endLine: number;
        let includesSubheadings = false;
        
        if (nestingMode === "nested") {
            // In nested mode, include all content until next heading of same or higher level
            const nextSameLevelOrHigher = this.findNextSameLevelOrHigher(
                questionHeading,
                allHeadings
            );
            
            if (nextSameLevelOrHigher) {
                endLine = nextSameLevelOrHigher.lineNumber - 1;
                // Check if there are any subheadings in between
                includesSubheadings = this.hasSubheadingsBetween(
                    questionHeading,
                    nextSameLevelOrHigher,
                    allHeadings
                );
            } else {
                // No next heading, go to end of document
                endLine = noteLines.length - 1;
                // Check if there are any subheadings after this heading
                includesSubheadings = this.hasSubheadingsAfter(
                    questionHeading,
                    allHeadings
                );
            }
        } else {
            // In flat mode, stop at first subheading (any heading lower level)
            const nextAnyHeading = this.findNextHeading(
                questionHeading,
                allHeadings
            );
            
            if (nextAnyHeading) {
                endLine = nextAnyHeading.lineNumber - 1;
                // In flat mode, we never include subheadings
                includesSubheadings = false;
            } else {
                // No next heading, go to end of document
                endLine = noteLines.length - 1;
                includesSubheadings = false;
            }
        }
        
        // Trim whitespace: find first non-empty line after heading
        const trimmedStartLine = this.findFirstNonEmptyLine(
            startLine,
            endLine,
            noteLines
        );
        
        // Trim whitespace: find last non-empty line before end
        const trimmedEndLine = this.findLastNonEmptyLine(
            trimmedStartLine,
            endLine,
            noteLines
        );
        
        return {
            startLine: trimmedStartLine,
            endLine: trimmedEndLine,
            includesSubheadings
        };
    }
    
    /**
     * Finds the next heading at the same level or higher (lower number).
     * 
     * @param currentHeading - The current heading
     * @param allHeadings - All headings in the note
     * @returns The next heading at same or higher level, or null if none found
     */
    private findNextSameLevelOrHigher(
        currentHeading: HeadingInfo,
        allHeadings: HeadingInfo[]
    ): HeadingInfo | null {
        for (const heading of allHeadings) {
            // Must be after current heading
            if (heading.lineNumber <= currentHeading.lineNumber) {
                continue;
            }
            
            // Must be same level or higher (lower number = higher level)
            if (heading.level <= currentHeading.level) {
                return heading;
            }
        }
        
        return null;
    }
    
    /**
     * Finds the next heading of any level after the current heading.
     * 
     * @param currentHeading - The current heading
     * @param allHeadings - All headings in the note
     * @returns The next heading, or null if none found
     */
    private findNextHeading(
        currentHeading: HeadingInfo,
        allHeadings: HeadingInfo[]
    ): HeadingInfo | null {
        for (const heading of allHeadings) {
            if (heading.lineNumber > currentHeading.lineNumber) {
                return heading;
            }
        }
        
        return null;
    }
    
    /**
     * Checks if there are any subheadings between two headings.
     * 
     * @param startHeading - The starting heading
     * @param endHeading - The ending heading
     * @param allHeadings - All headings in the note
     * @returns True if there are subheadings in between
     */
    private hasSubheadingsBetween(
        startHeading: HeadingInfo,
        endHeading: HeadingInfo,
        allHeadings: HeadingInfo[]
    ): boolean {
        for (const heading of allHeadings) {
            // Must be between start and end
            if (heading.lineNumber <= startHeading.lineNumber ||
                heading.lineNumber >= endHeading.lineNumber) {
                continue;
            }
            
            // Must be lower level (higher number = lower level)
            if (heading.level > startHeading.level) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Checks if there are any subheadings after the given heading.
     * 
     * @param heading - The heading to check after
     * @param allHeadings - All headings in the note
     * @returns True if there are subheadings after this heading
     */
    private hasSubheadingsAfter(
        heading: HeadingInfo,
        allHeadings: HeadingInfo[]
    ): boolean {
        for (const h of allHeadings) {
            // Must be after current heading
            if (h.lineNumber <= heading.lineNumber) {
                continue;
            }
            
            // Must be lower level (higher number = lower level)
            if (h.level > heading.level) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Finds the first non-empty line in a range.
     * 
     * @param startLine - Start of range (inclusive)
     * @param endLine - End of range (inclusive)
     * @param noteLines - All lines in the note
     * @returns Line number of first non-empty line, or startLine if all empty
     */
    private findFirstNonEmptyLine(
        startLine: number,
        endLine: number,
        noteLines: string[]
    ): number {
        for (let i = startLine; i <= endLine && i < noteLines.length; i++) {
            if (noteLines[i].trim().length > 0) {
                return i;
            }
        }
        
        // If all lines are empty, return startLine
        return startLine;
    }
    
    /**
     * Finds the last non-empty line in a range.
     * 
     * @param startLine - Start of range (inclusive)
     * @param endLine - End of range (inclusive)
     * @param noteLines - All lines in the note
     * @returns Line number of last non-empty line, or endLine if all empty
     */
    private findLastNonEmptyLine(
        startLine: number,
        endLine: number,
        noteLines: string[]
    ): number {
        for (let i = Math.min(endLine, noteLines.length - 1); i >= startLine; i--) {
            if (noteLines[i].trim().length > 0) {
                return i;
            }
        }
        
        // If all lines are empty, return endLine
        return endLine;
    }
}
