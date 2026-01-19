# Flow Features

## Overview

**Flow** is a comprehensive fork of Obsidian Spaced Repetition with 15+ major enhancements designed to provide an improved user experience, modern UI, and advanced spaced repetition capabilities. While maintaining compatibility with the original plugin's core functionality, Flow introduces powerful new features for spaced repetition review, progressive summarization, and incremental writing.

Flow is not just a minor update—it's a complete reimagining of spaced repetition in Obsidian, offering:

-   **Modern algorithms**: FSRS (Free Spaced Repetition Scheduler) support with parameter optimization
-   **Flexible data storage**: Keep your notes clean with separate JSON storage
-   **Enhanced review experience**: Float bar for seamless note review with keyboard shortcuts
-   **Intelligent scheduling**: Postpone, reschedule, and auto-balancing features
-   **Advanced card features**: Header-based flashcards, multiple cloze deletions, and precise BlockID positioning
-   **Improved workflows**: Mixed queues, selective conversions, and enhanced statistics

Whether you're a new user or migrating from the original plugin, Flow provides the tools you need for effective spaced repetition learning.

---

## Core Features

### 1. Separate Data Storage

Store scheduling information in `tracked_files.json` instead of modifying your note files.

**Benefits:**

-   **Cleaner notes**: No scheduling data cluttering your markdown files
-   **Better version control**: Git diffs show only content changes, not scheduling updates
-   **Optional feature**: You can still use traditional in-note storage if preferred

**Configuration:**

-   Navigate to Settings → Spaced Repetition → Data Location
-   Choose between:
    -   **In-note storage**: Traditional method (scheduling data in note frontmatter)
    -   **Separate file storage**: Store in plugin folder, vault folder, or specified folder

**Migration:**

-   You can switch between storage methods at any time
-   ⚠️ **Warning**: Changing data location will move review information from notes to the separate file

**File location:**

-   Default: `.obsidian/plugins/obsidian-spaced-repetition-flow/tracked_files.json`
-   Custom: Configure your preferred location in settings

---

### 2. FSRS Algorithm Support

Flow includes full support for the **FSRS (Free Spaced Repetition Scheduler)** algorithm, a modern alternative to the traditional SM-2 algorithm.

**Why FSRS?**

-   More accurate predictions of memory retention
-   Better scheduling based on your actual review performance
-   Scientifically validated approach to spaced repetition

**Configuration:**

-   Navigate to Settings → Spaced Repetition → Algorithm
-   Select "FSRS" from the algorithm dropdown
-   Configure FSRS parameters (or use defaults)

**Parameter Optimization:**

1. Export your review history: Use the "Export review log" command
2. Generated file: `ob_revlog.csv` (exported by tag)
3. Optimize parameters: Use the [FSRS Optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer)
4. Import optimized parameters back into Flow settings

**Reference:**

-   [FSRS v4 Algorithm Details](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-v4)

⚠️ **Note**: Don't switch algorithms frequently. Choose one algorithm and stick with it for consistent results.

---

### 3. Float Bar for Note Review

Experience seamless note review with a floating interface similar to flashcard review.

**Desktop Usage:**

**Keyboard Shortcuts** (in reading/preview mode):

-   `0` = Reset/Again
-   `1` = Hard
-   `2` = Good
-   `3` = Easy

**Mouse Controls:**

-   Right-click the float bar to close it
-   Click to set visibility for time intervals

**Mobile Usage:**

-   **Swipe up** from the float bar to show/hide the menu
-   **Long-press** the float bar to configure time interval visibility

**Visibility Settings:**

The float bar can display or hide time intervals based on your use case:

-   **Hide intervals during review**: Focus on recall without seeing the next review time
-   **Show intervals during progressive summarization**: Make informed decisions about when to see notes again
-   **Show intervals during incremental writing**: Plan your writing schedule effectively

**Recommendation**: Configure visibility based on your primary use case. Most users hide intervals during traditional spaced repetition review.

---

### 4. Postpone Notes/Cards

Delay review of items that are scheduled before today (not including today).

**How it works:**

-   Only applies to items with current retention >65%
-   Reschedules items to a future date without updating review data
-   Useful when you need a break or have too many reviews

**Usage:**

1. Open command palette
2. Run "Postpone notes/cards" command
3. Items are rescheduled to tomorrow or later

**Important Notes:**

-   ⚠️ **Procrastination warning**: "Tomorrow after tomorrow, how many tomorrows?" Use sparingly!
-   **Revert**: Restart Obsidian to restore the previous schedule if unsatisfied
-   **Persistence**: New schedule saves permanently after reviewing your first note/card

---

### 5. Postpone After X Days

Schedule specific notes or cards to review after a custom number of days.

**How it works:**

-   Ignores current review time and retention rate
-   Sets a specific delay for individual items
-   More precise control than general postpone

**Usage:**

1. Select the note or card you want to postpone
2. Open command palette
3. Run "Postpone after X days" command
4. Enter the number of days

**Recommendation:**

-   ✅ **Do**: Use for individual notes/cards that need specific timing
-   ❌ **Don't**: Bulk modify many items at once
-   **Why**: Prevents excessive review load spikes on specific days

---

### 6. Reschedule All Items

Recalculate the next review time for all already-scheduled notes and cards.

**How it works:**

-   Recalculates based on current settings and review history
-   Applies to all scheduled items in your vault
-   Useful after changing algorithm or parameters

**Usage:**

1. Open command palette
2. Run "Reschedule all items" command
3. All items are recalculated

**Important Notes:**

-   ℹ️ **Note**: "Basically not needed" for most users
-   **Revert**: Restart Obsidian to restore previous schedule if unsatisfied
-   **Persistence**: New schedule saves permanently after reviewing your first note/card
-   **Use case**: Primarily useful when switching algorithms or significantly changing parameters

---

### 7. Auto-balancing

Automatically distribute your review workload to prevent overwhelming days.

**How it works:**

-   Monitors your review schedule
-   Redistributes reviews when load becomes uneven
-   Prevents large spikes in daily review counts

**Trigger Conditions:**

-   Day has ≥10 review cards/notes scheduled
-   Next review interval is ≥3 days

**Benefits:**

-   Consistent daily review load
-   Prevents burnout from review spikes
-   Maintains steady learning pace

**Configuration:**

-   Navigate to Settings → Spaced Repetition → Auto-balancing
-   Enable or disable as preferred
-   Works automatically once enabled

---

### 8. BlockID Positioning

Append BlockIDs (e.g., `^blkid1`) to card text for more accurate card positioning.

**How it works:**

-   Adds unique block identifiers to each card
-   Provides precise card location tracking
-   More reliable than line number + text hash method

**Trade-offs:**

-   ✅ **Benefit**: More accurate card positioning
-   ❌ **Cost**: Modifies your original note files

**Configuration:**

-   Navigate to Settings → Spaced Repetition → BlockID Positioning
-   **Default**: Disabled (to avoid modifying notes)
-   **Alternative**: Flow uses card line number and text hash (less accurate but sufficient for most users)

**Recommendation**: Only enable if you experience card positioning issues.

---

### 9. Multiple Cloze Deletions

Support for multiple cloze deletions within a single card.

**How it works:**

-   Create multiple clozes in one card: `{{c1::first}} and {{c2::second}}`
-   Maximum 4 clozes per card
-   More than 4 clozes: automatically split into groups of 3

**Behavior:**

-   **Not hidden** by "bury sibling cards" setting
-   All clozes in a card are treated as a single unit
-   Different from original plugin behavior

**Example:**

```markdown
The {{c1::mitochondria}} is the {{c2::powerhouse}} of the {{c3::cell}}.
```

This creates one card with three cloze deletions that are reviewed together.

**Note**: This differs from the original plugin, which would create separate cards for each cloze.

---

### 9.5. Header-Based Flashcards

Create flashcards using Markdown headings as questions and content below as answers.

**How it works:**

-   Use headings (h1-h6) as questions
-   Content below the heading becomes the answer
-   Configure which heading levels to use
-   Optional: require `?` at end of heading

**Basic Example:**

```markdown
#flashcard/h2

## What is React?

React is a JavaScript library for building user interfaces.
```

**Configuration Options:**

-   **Heading Levels**: Choose which levels (h1-h6) become cards
-   **Nesting Mode**: Include or exclude subheadings in answers
-   **Recognition Mode**: All headings or only those ending with `?`
-   **Context Display**: Show heading hierarchy during review

**Benefits:**

-   Natural, structured way to organize study materials
-   Works alongside existing card formats
-   Flexible configuration via tags
-   Optional context display for large notes

**See**: [Header-Based Flashcards Documentation](flashcards/header-based-cards.md) for complete guide

---

### 10. Mixed Queue for Notes

Mix new and due notes in your review queue for a better learning experience.

**How it works:**

-   Alternates between due notes (review) and new notes (learning)
-   Prevents monotony of reviewing only old or only new content
-   Configurable pattern

**Default Pattern:**

-   3 due notes
-   2 new notes
-   Repeat

**Configuration:**

-   Navigate to Settings → Spaced Repetition → Mixed Queue Settings
-   Customize the pattern to your preference
-   Example: "5:3" means 5 due notes, then 3 new notes

**Benefits:**

-   More engaging review sessions
-   Better balance between review and learning
-   Reduces cognitive fatigue

---

### 11. Selective Note-to-Deck Conversion

Convert only specific review notes to flashcard decks.

**How it works:**

-   Not all notes in your vault need to become flashcard decks
-   Choose which notes to convert based on folders or tags
-   Granular control over your flashcard organization

**Usage:**

1. Navigate to Settings → Spaced Repetition → Flashcards
2. Configure "Convert review notes to card decks"
3. Select specific folders or use folder-based conversion

**Benefits:**

-   Keep your vault organized
-   Separate notes for review from notes for flashcards
-   Flexible workflow options

---

### 12. Direct Note Opening

Open notes directly without tag selection when multiple tags are present.

**How it works:**

-   Original plugin: prompts for tag selection when note has multiple tags
-   Flow: opens note directly for faster workflow
-   Saves time when working with multi-tagged notes

**Benefits:**

-   Faster note access
-   Streamlined workflow
-   Less clicking and decision-making

---

### 13. Enhanced Statistics

View detailed statistics about your note and card reviews.

**Features:**

-   **Note review statistics**: Track your note review progress
-   **Daily review statistics**: See your daily review patterns
-   **Data table**: Comprehensive view of all review data

**Usage:**

1. Open command palette
2. Run "View statistics" command
3. Explore your review data

**Additional Command:**

-   **SR Item Info**: View review information for the current note or cards in the current note
-   Can modify next review time directly from this view

---

### 14. Separate Sibling Card Settings

Granular control over sibling card behavior for flashcards and notes.

**Two Settings:**

1. **Bury sibling cards** (original setting)

    - Applies to flashcards
    - Hides related cards during review session

2. **Bury sibling cards for note review** (new setting)
    - Applies specifically to note review
    - Independent control from flashcard setting

**Note**: Multiple cloze deletions are **not affected** by the "bury sibling cards" setting.

**Benefits:**

-   Different behavior for cards vs notes
-   More control over review experience
-   Customize based on content type

---

### 15. Algorithm Switching

Choose from three spaced repetition algorithms.

**Available Algorithms:**

1. **Default (Anki Optimized)**

    - Optimized version of Anki's algorithm
    - Good balance of accuracy and simplicity

2. **Anki Algorithm**

    - Original Anki algorithm
    - Widely tested and proven

3. **FSRS Algorithm**
    - Modern, scientifically validated algorithm
    - Most accurate predictions
    - Recommended for new users

**Configuration:**

-   Navigate to Settings → Spaced Repetition → Algorithm
-   Select your preferred algorithm
-   Configure algorithm-specific parameters

⚠️ **Important**: Don't switch algorithms frequently! Choose one and stick with it for consistent, reliable results. Each algorithm has different parameters and switching can disrupt your review schedule.

---

## Experimental Features

⚠️ **WARNING: NOT RECOMMENDED FOR DAILY USE!**

These features are for debugging and development purposes only. They can cause data loss or corruption.

**Access:**

1. Navigate to Settings → Spaced Repetition
2. Enable "Setup Logging → Debugging Information"
3. Experimental commands become available

**Available CommandManager:**

### Print Data

-   Outputs review data in the debug window
-   For inspection and debugging
-   Safe to use (read-only)

### Reset Data

-   ⚠️ **DANGEROUS**: Deletes ALL review data
-   Cannot be undone
-   Only use if you want to start completely fresh

### Update Items

-   Updates invalid data entries to default values
-   Attempts to fix corrupted data
-   May not preserve all information

### Prune Data

-   Clears invalid data entries
-   ⚠️ **Warning**: Changes data item IDs, affecting FSRS optimizer compatibility
-   Use only if you have corrupted data

**Recommendation**: Create a full vault backup before using any experimental features. These are primarily for developers and advanced troubleshooting.

---

## Use Cases

Flow supports multiple workflows beyond traditional spaced repetition:

### 1. Spaced Repetition Review

**Traditional flashcard and note review for learning and retention.**

-   Create flashcards with various formats (Q&A, cloze, multi-line)
-   Review notes at spaced intervals
-   Track progress with statistics
-   Use FSRS algorithm for optimal scheduling

**Best practices:**

-   Hide float bar intervals during review (focus on recall)
-   Use auto-balancing to maintain consistent workload
-   Enable "bury sibling cards" to avoid repetition

---

### 2. Progressive Summarization

**Incremental note refinement through spaced review.**

Progressive summarization is a technique for gradually distilling notes to their essence through repeated review. Flow's float bar makes this workflow seamless.

**How it works:**

Based on Andy Matuschak's [Spaced repetition systems can be used to program attention](https://notes.andymatuschak.org/z7iCjRziX6V6unNWL81yc2dJicpRw2Cpp9MfQ), use four operations:

1. **Skip note** (increase x days) → Mark as "Good"
    - Note is useful but doesn't need immediate attention
2. **Read, found useful** (decrease interval) → Mark as "Hard"

    - Note needs more frequent review
    - Contains important information to internalize

3. **Read, not useful** (increase y days) → Mark as "Easy"

    - Note is less relevant now
    - Can be reviewed less frequently

4. **Convert to evergreen note** → Stop using spaced repetition
    - Note has been fully processed
    - Remove from review queue

**Flow features for progressive summarization:**

-   **Show intervals** on float bar to make informed scheduling decisions
-   **Postpone** notes that aren't ready for review
-   **Mixed queue** to balance old and new notes
-   **Separate data storage** to keep notes clean

---

### 3. Incremental Writing

**Gradual content development with spaced review.**

Incremental writing involves developing content over time through repeated review and refinement. Flow helps you maintain momentum on writing projects.

**How it works:**

1. Create initial draft notes
2. Add notes to spaced repetition queue
3. Review notes at intervals
4. Refine and expand during each review
5. Gradually develop complete content

**Flow features for incremental writing:**

-   **Show intervals** on float bar to plan writing schedule
-   **Postpone after X days** to schedule writing sessions
-   **Direct note opening** for quick access
-   **Enhanced statistics** to track writing progress

**Benefits:**

-   Consistent progress on long-term projects
-   Regular engagement with material
-   Natural development of ideas over time
-   Prevents writer's block through structured review

---

## Getting Started

### For New Users

1. **Install Flow** from the Obsidian community plugins
2. **Configure settings**:
    - Data Location: Separate file storage (recommended)
    - Algorithm: FSRS (recommended)
    - Float bar: Configure visibility based on use case
3. **Add content**:
    - Tag notes with your review tag (default: `#review`)
    - Create flashcards using supported formats
4. **Start reviewing**:
    - Use command palette or sidebar to begin reviews
    - Try keyboard shortcuts for faster reviews
5. **Optimize**:
    - Export review log after ~100 reviews
    - Use FSRS optimizer to tune parameters

### For Users Migrating from Original SR Plugin

See the [Usage Guide](usage.md) for detailed CASE2 migration instructions, including:

-   Backup procedures (critical!)
-   Data migration steps
-   Settings configuration
-   Troubleshooting common issues

---

## Additional Resources

-   **Algorithm Details**: See [Repetition Algorithms](algorithms.md)
-   **Data Storage Options**: See [Data Storage](data-storage.md)
-   **Note Review**: See [Notes](notes.md)
-   **Flashcard Types**: See [Flashcards Overview](flashcards/flashcards-overview.md)
-   **Settings Reference**: See [User Options](user-options.md)
-   **CommandManager Reference**: See [Plugin CommandManager](plugin-commands.md)

---

## Contributing

Flow is open source and welcomes contributions! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

-   **Repository**: [GitHub - martin-jw/obsidian-recall](https://github.com/martin-jw/obsidian-recall)
-   **Issues**: Report bugs or request features
-   **Pull Requests**: Submit improvements
-   **Documentation**: Help improve these docs

---

## Acknowledgments

Flow builds upon the excellent work of the original Obsidian Spaced Repetition plugin. We're grateful to the original developers and the community for creating such a solid foundation.

Flow represents a complete reimagining with 15+ major enhancements, but it wouldn't exist without the original plugin's groundwork.
