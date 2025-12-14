/**
 * Lightweight markdown formatter for sidebar card display.
 * Converts basic markdown syntax to HTML and removes heading markers.
 */
export class MarkdownFormatter {
    /**
     * Formats markdown text for display in sidebar:
     * - Removes heading markers (# ## ### etc.) from the beginning of lines
     * - Converts **bold** to <strong>
     * - Converts *italic* to <em>
     * - Converts ***bold italic*** to <strong><em>
     */
    static formatForDisplay(text: string): string {
        if (!text) return "";

        let formatted = text;

        // Remove heading markers from the beginning of lines
        // Matches: # heading, ## heading, ### heading, etc.
        formatted = formatted.replace(/^#{1,6}\s+/gm, "");

        // Convert ***bold italic*** (must be before ** and *)
        formatted = formatted.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");

        // Convert **bold**
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

        // Convert *italic*
        formatted = formatted.replace(/\*(.+?)\*/g, "<em>$1</em>");

        return formatted.trim();
    }

    /**
     * Extracts plain text from HTML and markdown, suitable for display.
     * Removes HTML tags and converts markdown to HTML.
     */
    static extractDisplayText(html: string, maxLength: number = 100): string {
        if (!html) return "";

        // First remove HTML tags
        let text = html.replace(/<[^>]*>/g, "\n");

        // Then format markdown
        text = this.formatForDisplay(text);

        // Truncate if too long
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + "...";
        }

        return text.trim();
    }
}
