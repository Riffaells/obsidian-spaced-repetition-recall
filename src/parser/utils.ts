/**
 * Utility functions for flashcard parsing
 *
 * @module parser/utils
 */

export let debugParser = false;

/**
 * Enables or disables debug logging for the parser
 * @param value - true to enable debug logging, false to disable
 */
export function setDebugParser(value: boolean) {
    debugParser = value;
}

/**
 * Checks if a marker is inside an inline code block by counting backticks.
 *
 * @param text - The full text line
 * @param marker - The marker to check (e.g., "::", "?")
 * @param markerIndex - The index position of the marker in the text
 * @returns true if the marker is inside an inline code block, false otherwise
 *
 * @example
 * markerInsideCodeBlock("This is `code::block` text", "::", 11) // returns true
 * markerInsideCodeBlock("This is normal::text", "::", 14) // returns false
 */
export function markerInsideCodeBlock(text: string, marker: string, markerIndex: number): boolean {
    let goingBack = markerIndex - 1,
        goingForward = markerIndex + marker.length;
    let backTicksBefore = 0,
        backTicksAfter = 0;

    // Count backticks before the marker
    while (goingBack >= 0) {
        if (text[goingBack] === "`") backTicksBefore++;
        goingBack--;
    }

    // Count backticks after the marker
    while (goingForward < text.length) {
        if (text[goingForward] === "`") backTicksAfter++;
        goingForward++;
    }

    // If there's an odd number of backticks before and after,
    // the marker is inside an inline code block
    return backTicksBefore % 2 === 1 && backTicksAfter % 2 === 1;
}

/**
 * Checks if a line contains a valid inline flashcard marker.
 * Performs validation to avoid false positives from URLs, times, etc.
 *
 * @param text - The text line to check
 * @param marker - The marker to look for (e.g., "::", ":::", "?")
 * @returns true if the line contains a valid flashcard marker, false otherwise
 *
 * @example
 * hasInlineMarker("Question::Answer", "::") // returns true
 * hasInlineMarker("http://example.com", "::") // returns false (URL)
 * hasInlineMarker("Time: 10:30", "::") // returns false (time format)
 * hasInlineMarker("Code `::` block", "::") // returns false (inside code block)
 */
export function hasInlineMarker(text: string, marker: string): boolean {
    // No marker provided
    if (marker.length == 0) return false;

    // Check if the marker is in the text
    const markerIdx = text.indexOf(marker);
    if (markerIdx === -1) return false;

    // Check if it's inside an inline code block
    if (markerInsideCodeBlock(text, marker, markerIdx)) return false;

    // Additional validation for :: marker to avoid false positives
    // (e.g., URLs like http://example.com, times like 10:30)
    if (marker === "::" || marker === ":::") {
        // Check if there's meaningful text before and after the marker
        const beforeMarker = text.substring(0, markerIdx).trim();
        const afterMarker = text.substring(markerIdx + marker.length).trim();

        // Must have text on both sides
        if (beforeMarker.length === 0 || afterMarker.length === 0) return false;

        // Check if it's part of a URL (http://, https://, ftp://)
        if (beforeMarker.match(/(https?|ftp)$/i)) return false;

        // Check if it's a time format (e.g., 10:30)
        if (beforeMarker.match(/\d$/) && afterMarker.match(/^\d/)) return false;
    }

    return true;
}
