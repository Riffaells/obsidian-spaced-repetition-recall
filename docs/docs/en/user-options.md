# User Options

This page provides a comprehensive reference for all Flow settings. Flow includes numerous configuration options for flashcards, notes, algorithms, data storage, and UI preferences.

For detailed feature explanations, see [Flow Features](flow-features.md).

---

## Table of Contents

-   [Flashcard Settings](#flashcard-settings)
-   [Note Settings](#note-settings)
-   [Algorithm Settings](#algorithm-settings)
-   [Data Storage Settings](#data-storage-settings)
-   [Float Bar Settings](#float-bar-settings)
-   [Scheduling Management](#scheduling-management)
-   [Auto-balancing Settings](#auto-balancing-settings)
-   [BlockID Positioning](#blockid-positioning)
-   [Mixed Queue Settings](#mixed-queue-settings)
-   [Sibling Card Settings](#sibling-card-settings)
-   [UI Preferences](#ui-preferences)

---

## Flashcard Settings

### Tags & Folders

Configure which notes and folders are tracked for flashcard review.

![flashcard-settings-tag-folders.jpg](https://github.com/user-attachments/assets/34baba63-8439-4f31-b07b-e8f62671b621)

**Key Options:**

-   **Flashcard tags**: Tags that identify flashcards (default: `#flashcards`) - **Required for all notes**
-   **Folders to ignore**: Exclude specific folders from flashcard scanning
-   **Convert folders to decks**: Use folder structure for organization (still requires flashcard tags in notes)
-   **Bury sibling cards**: Hide related cards during review session (see [Sibling Card Settings](#sibling-card-settings))

**Important:** All notes must contain flashcard tags to be processed, even when using folder-based organization.

---

### Flashcard Review

Configure review behavior and scheduling parameters.

![flashcard-settings-review.jpg](https://github.com/user-attachments/assets/fe81f6a8-e333-4894-b6cd-db68e1ae6f86)

**Key Options:**

-   **Review order**: Random, due date, or deck order
-   **New card limit**: Maximum new cards per day
-   **Review limit**: Maximum reviews per day
-   **Card order within deck**: Sequential or random

---

### Flashcard Rules

Define exactly how your flashcards are created using the powerful Rules system.

**Location**: Settings → Spaced Repetition → Flashcard Rules

Instead of global separator settings, Flow now uses **Flashcard Rules** to define card types (Inline, Header, Multiline, Cloze) and their configurations per tag.

For detailed configuration instructions, see [Flashcard Rules](flashcards/flashcard-rules.md).

**Key Features:**

-   **Per-tag configuration**: Use different separators or behaviors for different tags.
-   **Flexible rule types**: Configure Inline, Header, Multiline, and Cloze rules independently.
-   **Regex tag matching**: Apply rules to groups of tags using regular expressions.

---

### Storage of Scheduling Data

Configure where scheduling information is stored.

![flashcard-settings-scheduling-data](https://github.com/user-attachments/assets/200bb976-c631-4d73-82a5-12ba7e140339)

See [Data Storage Settings](#data-storage-settings) for detailed information.

---

## Note Settings

Configure note review behavior and tracking.

![settings-notes](https://github.com/user-attachments/assets/75f7a55a-933f-436f-868a-efb622cc0f9c)

**Key Options:**

-   **Note review tags**: Tags that identify notes for review (default: `#review`)
-   **Folders to ignore**: Exclude specific folders from note tracking
-   **Open notes directly**: Skip tag selection when note has multiple tags (Flow enhancement)
-   **Bury sibling cards for note review**: Separate setting from flashcard sibling burying (see [Sibling Card Settings](#sibling-card-settings))

**Flow Enhancement**: Direct note opening saves time when working with multi-tagged notes.

---

## Algorithm Settings

Choose and configure your spaced repetition algorithm.

**Location**: Settings → Spaced Repetition → Algorithm

### Available Algorithms

Flow supports three spaced repetition algorithms:

1. **Default (Anki Optimized)**

    - Optimized version of Anki's algorithm
    - Good balance of accuracy and simplicity
    - Suitable for most users

2. **Anki Algorithm**

    - Original Anki algorithm
    - Widely tested and proven
    - Compatible with Anki workflows

3. **FSRS Algorithm** ⭐ **Recommended for new users**
    - Free Spaced Repetition Scheduler
    - Modern, scientifically validated algorithm
    - Most accurate retention predictions
    - Requires parameter optimization for best results

### FSRS Configuration

**Parameters:**

FSRS uses several parameters to model your memory. Default parameters work well, but optimization improves accuracy.

**Parameter Optimization:**

1. **Export review log**: Use command "Export review log" to generate `ob_revlog.csv`
2. **Optimize parameters**: Use [FSRS Optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer)
3. **Import parameters**: Copy optimized parameters back to Flow settings
4. **Minimum data**: Optimize after ~100 reviews for meaningful results

**Configuration Options:**

-   **FSRS parameters**: Configure w[0] through w[18] values
-   **Desired retention**: Target retention rate (default: 0.9 = 90%)
-   **Maximum interval**: Longest possible review interval (default: 36500 days)

⚠️ **Important**: Don't switch algorithms frequently! Choose one algorithm and stick with it for consistent results. Switching algorithms can disrupt your review schedule.

**Reference**: [FSRS v4 Algorithm Details](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-v4)

---

## Data Storage Settings

Configure where Flow stores scheduling information.

**Location**: Settings → Spaced Repetition → Data Location

### Storage Options

#### In-Note Storage (Traditional)

Stores scheduling data in note frontmatter.

**Format:**

```yaml
---
sr-due: 2024-12-15
sr-interval: 30
sr-ease: 250
---
```

**Pros:**

-   All data in one place
-   Portable with notes

**Cons:**

-   Clutters note files
-   Git diffs show scheduling changes
-   Frontmatter visible in notes

#### Separate File Storage (Flow Enhancement) ⭐ **Recommended**

Stores scheduling data in `tracked_files.json` separate from notes.

**Benefits:**

-   **Cleaner notes**: No scheduling data in markdown files
-   **Better version control**: Git diffs show only content changes
-   **Organized data**: All scheduling information in one JSON file

**File Locations:**

1. **Plugin folder** (default): `.obsidian/plugins/obsidian-spaced-repetition-flow/tracked_files.json`
2. **Vault folder**: `tracked_files.json` in vault root
3. **Specified folder**: Custom location you configure

**Configuration:**

1. Navigate to Settings → Spaced Repetition → Data Location
2. Select "Separate file storage"
3. Choose storage location (plugin folder, vault folder, or custom)
4. Optionally specify custom folder path

### Migration Between Storage Methods

You can switch between storage methods at any time.

**From In-Note to Separate File:**

1. Change Data Location setting to "Separate file storage"
2. Flow automatically migrates data from note frontmatter to JSON file
3. Frontmatter scheduling data remains in notes (not automatically removed)

**From Separate File to In-Note:**

1. Change Data Location setting to "In-note storage"
2. Flow writes scheduling data back to note frontmatter
3. JSON file remains but is no longer used

⚠️ **Warning**: Always backup your vault before changing data location settings. While migration is automatic, having a backup ensures you can revert if needed.

**Recommendation**: Use separate file storage for cleaner notes and better version control, especially if you use Git.

---

## Float Bar Settings

Configure the floating review interface for note review.

**Location**: Settings → Spaced Repetition → Float Bar

The float bar provides a seamless review experience similar to flashcard review, with keyboard shortcuts and customizable visibility.

### Visibility Settings

Control when review intervals are displayed on the float bar.

**Options:**

-   **Always show intervals**: Display next review times for all responses
-   **Hide intervals**: Focus on recall without seeing scheduling information
-   **Custom visibility**: Show/hide based on time intervals

### Use Case Recommendations

**Hide intervals when:**

-   Doing traditional spaced repetition review
-   Focusing on pure recall without scheduling bias
-   Learning new material

**Show intervals when:**

-   Doing progressive summarization
-   Planning incremental writing sessions
-   Making informed scheduling decisions

### Keyboard Shortcuts

When reviewing notes in reading/preview mode:

-   `0` = Reset/Again
-   `1` = Hard
-   `2` = Good
-   `3` = Easy

### Mouse Controls

-   **Right-click**: Close float bar
-   **Click**: Configure visibility for time intervals

### Mobile Controls

-   **Swipe up**: Show/hide float bar menu
-   **Long-press**: Configure time interval visibility

**Configuration:**

1. Navigate to Settings → Spaced Repetition → Float Bar
2. Configure visibility preferences
3. Test in reading mode with a review note

For detailed usage instructions, see [Notes - Float Bar](notes.md#float-bar-for-note-review).

---

## Scheduling Management

Flow provides powerful commands for managing your review schedule.

### Postpone Notes/Cards

Delay review of items scheduled before today.

**Location**: Command Palette → "Postpone notes/cards"

**How it works:**

-   Only affects items with retention >65%
-   Reschedules items to tomorrow or later
-   Does not update review history

**When to use:**

-   Taking a break from reviews
-   Too many reviews accumulated
-   Need to reduce daily workload

⚠️ **Warning**: Use sparingly! Postponing frequently can disrupt your learning schedule.

**Revert**: Restart Obsidian before reviewing any items to restore previous schedule.

**Persistence**: New schedule saves permanently after reviewing your first note/card.

---

### Postpone After X Days

Schedule specific notes or cards to review after a custom number of days.

**Location**: Command Palette → "Postpone after X days"

**How it works:**

-   Ignores current review time and retention
-   Sets specific delay for individual items
-   More precise than general postpone

**When to use:**

-   Individual notes need specific timing
-   Planning review sessions
-   Scheduling writing projects

**Recommendation:**

-   ✅ **Do**: Use for individual items with specific timing needs
-   ❌ **Don't**: Bulk modify many items at once (causes workload spikes)

---

### Reschedule All Items

Recalculate next review time for all scheduled items.

**Location**: Command Palette → "Reschedule all items"

**How it works:**

-   Recalculates based on current settings and review history
-   Applies to all scheduled items in vault
-   Uses current algorithm and parameters

**When to use:**

-   After switching algorithms
-   After changing algorithm parameters
-   After importing optimized FSRS parameters

ℹ️ **Note**: "Basically not needed" for most users. Only use when making significant algorithm changes.

**Revert**: Restart Obsidian before reviewing any items to restore previous schedule.

**Persistence**: New schedule saves permanently after reviewing your first note/card.

---

## Auto-balancing Settings

Automatically distribute review workload to prevent overwhelming days.

**Location**: Settings → Spaced Repetition → Auto-balancing

### How It Works

Auto-balancing monitors your review schedule and redistributes reviews when load becomes uneven.

**Trigger Conditions:**

-   Day has ≥10 review cards/notes scheduled
-   Next review interval is ≥3 days

**Behavior:**

-   Redistributes reviews across multiple days
-   Prevents large spikes in daily review counts
-   Maintains steady learning pace

### Benefits

-   **Consistent workload**: Similar number of reviews each day
-   **Prevents burnout**: Avoids overwhelming review sessions
-   **Better retention**: Steady pace improves learning outcomes

### Configuration

1. Navigate to Settings → Spaced Repetition → Auto-balancing
2. Toggle "Enable auto-balancing"
3. Works automatically once enabled

**Recommendation**: Enable auto-balancing for consistent daily workload, especially if you have many cards/notes.

---

## BlockID Positioning

Append BlockIDs to card text for more accurate card positioning.

**Location**: Settings → Spaced Repetition → BlockID Positioning

### How It Works

BlockID positioning adds unique identifiers (e.g., `^blkid1`) to each card in your notes.

**Example:**

```markdown
What is the capital of France? :: Paris ^blkid1
```

### Trade-offs

**Benefits:**

-   ✅ More accurate card positioning
-   ✅ Reliable card tracking even when content changes
-   ✅ Prevents card misidentification

**Costs:**

-   ❌ Modifies your original note files
-   ❌ Adds visible BlockIDs to notes
-   ❌ Changes note formatting

### Default Behavior

**BlockID Positioning: Disabled** (default)

Flow uses an alternative method:

-   Card line number + text hash
-   Less accurate but sufficient for most users
-   Does not modify note files

### When to Enable

Enable BlockID positioning if you experience:

-   Cards appearing in wrong order
-   Card scheduling data getting mixed up
-   Frequent card repositioning issues

### Configuration

1. Navigate to Settings → Spaced Repetition → BlockID Positioning
2. Toggle "Enable BlockID positioning"
3. BlockIDs are added to cards on next review

**Recommendation**: Keep disabled unless you experience card positioning issues. The default method works well for most users.

---

## Mixed Queue Settings

Mix new and due notes in your review queue.

**Location**: Settings → Spaced Repetition → Mixed Queue Settings

### How It Works

Mixed queue alternates between due notes (review) and new notes (learning) for a better review experience.

**Default Pattern:**

-   3 due notes
-   2 new notes
-   Repeat

### Benefits

-   **More engaging**: Prevents monotony of only old or only new content
-   **Better balance**: Mix review and learning in each session
-   **Reduces fatigue**: Variety maintains focus and motivation

### Configuration

1. Navigate to Settings → Spaced Repetition → Mixed Queue Settings
2. Enable "Mixed queue for notes"
3. Configure pattern (e.g., "5:3" = 5 due notes, then 3 new notes)

**Pattern Format**: `due:new` (e.g., "3:2", "5:3", "10:5")

**Recommendation**: Use default 3:2 pattern for balanced review sessions. Adjust based on your preference for review vs learning.

---

## Sibling Card Settings

Control how related cards are handled during review sessions.

**Location**: Settings → Spaced Repetition → Sibling Card Settings

Flow provides **two separate settings** for granular control:

### 1. Bury Sibling Cards (Flashcards)

Controls sibling card behavior for flashcards.

**What are sibling cards?**

-   Cards generated from the same source
-   Example: Multiple Q&A cards in the same note
-   Example: Cloze cards with different deletions

**When enabled:**

-   After reviewing one card, related cards are hidden for the session
-   Prevents reviewing similar content repeatedly
-   Reduces interference between related cards

**When disabled:**

-   All cards appear in review queue
-   May review multiple related cards in same session

**Recommendation**: Enable to avoid repetition and interference.

---

### 2. Bury Sibling Cards for Note Review

Controls sibling card behavior specifically for note review.

**Independent setting** from flashcard sibling burying.

**When enabled:**

-   After reviewing a note, related notes are hidden for the session
-   Useful when notes share tags or topics

**When disabled:**

-   All notes appear in review queue
-   May review related notes in same session

**Recommendation**: Configure based on your note organization. Enable if you have many related notes with shared tags.

---

### Multiple Cloze Deletions

⚠️ **Important**: Multiple cloze deletions (e.g., `{{c1::first}} {{c2::second}}`) are **NOT affected** by the "bury sibling cards" setting.

**Behavior:**

-   All clozes in a card are treated as a single unit
-   Reviewed together in one card
-   Maximum 4 clozes per card
-   More than 4 clozes: automatically split into groups of 3

**Example:**

```markdown
The {{c1::mitochondria}} is the {{c2::powerhouse}} of the {{c3::cell}}.
```

This creates **one card** with three cloze deletions reviewed together, not three separate cards.

For more details, see [Basic Cloze Cards - Multiple Cloze Deletions](flashcards/basic-cloze-cards.md).

---

## UI Preferences

Configure the user interface appearance and behavior.

![settings-ui-preferences](https://github.com/user-attachments/assets/c0740fa0-02b5-4db9-9d81-94f0ae29ab6c)

**Key Options:**

-   **Show status bar**: Display review statistics in status bar
-   **Show ribbon icon**: Show Flow icon in left sidebar
-   **Flashcard modal size**: Configure review modal dimensions
-   **Context display**: Show surrounding context for cards
-   **Card order display**: Show card position in deck

---

## Additional Settings

### Logging and Debugging

**Location**: Settings → Spaced Repetition → Setup Logging

**Options:**

-   **Debugging information**: Enable detailed logging for troubleshooting
-   **Experimental features**: Access experimental commands (⚠️ use with caution)

⚠️ **Warning**: Experimental features can cause data loss. See [Flow Features - Experimental Features](flow-features.md#experimental-features) for details.

---

### Export and Import

**Export review log:**

-   Command: "Export review log"
-   Generates: `ob_revlog.csv` (by tag)
-   Use for: FSRS parameter optimization

**Import settings:**

-   Export settings from one vault
-   Import to another vault
-   Useful for consistent configuration across vaults

---

## Quick Reference

### Recommended Settings for New Users

-   **Algorithm**: FSRS
-   **Data Location**: Separate file storage
-   **Float Bar**: Hide intervals (for traditional review)
-   **Auto-balancing**: Enabled
-   **BlockID Positioning**: Disabled
-   **Mixed Queue**: Enabled (3:2 pattern)
-   **Bury Sibling Cards**: Enabled (both settings)

### Recommended Settings for Progressive Summarization

-   **Algorithm**: FSRS or Default
-   **Data Location**: Separate file storage
-   **Float Bar**: Show intervals
-   **Auto-balancing**: Enabled
-   **Mixed Queue**: Enabled
-   **Open Notes Directly**: Enabled

### Recommended Settings for Incremental Writing

-   **Algorithm**: FSRS or Default
-   **Data Location**: Separate file storage
-   **Float Bar**: Show intervals
-   **Auto-balancing**: Enabled
-   **Mixed Queue**: Enabled
-   **Open Notes Directly**: Enabled

---

## See Also

-   [Flow Features](flow-features.md) - Comprehensive guide to all Flow enhancements
-   [Plugin CommandManager](plugin-commands.md) - Available commands and shortcuts
-   [Repetition Algorithms](algorithms.md) - Algorithm details and comparison
-   [Data Storage](data-storage.md) - Storage options and migration
-   [Notes](notes.md) - Note review and float bar usage
-   [Flashcards Overview](flashcards/flashcards-overview.md) - Flashcard types and usage
