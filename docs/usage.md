# Flow Usage Guide

This comprehensive guide covers everything you need to know about using Flow, from initial setup to advanced features. Flow is a complete reimagining of the Obsidian Spaced Repetition plugin with 15+ major enhancements including FSRS algorithm, separate data storage, float bar for note review, and much more.

## Table of Contents

- [Getting Started](#getting-started)
  - [CASE1: New Users](#case1-new-users)
  - [CASE2: Migrating from Original SR Plugin](#case2-migrating-from-original-sr-plugin)
- [Adding Content](#adding-content)
  - [Adding Notes](#adding-notes)
  - [Adding Cards](#adding-cards)
- [Reviewing Content](#reviewing-content)
  - [Reviewing Notes](#reviewing-notes)
  - [Reviewing Cards](#reviewing-cards)
- [Flow Features](#flow-features)
  - [Postpone Notes/Cards](#postpone-notescards)
  - [Postpone After X Days](#postpone-after-x-days)
  - [Reschedule All Items](#reschedule-all-items)
  - [View Statistics](#view-statistics)
  - [SR Item Info](#sr-item-info)
- [Algorithm Selection](#algorithm-selection)
- [Use Cases](#use-cases)
  - [Spaced Repetition Review](#spaced-repetition-review)
  - [Progressive Summarization](#progressive-summarization)
  - [Incremental Writing](#incremental-writing)
- [Experimental Features](#experimental-features)

---

## Getting Started

### CASE1: New Users

If you're new to spaced repetition plugins and starting fresh with Flow, follow these recommendations for optimal setup.

#### Recommended Settings

**Data Location:**
- Choose: **In plugin/vault/specified folder** (NOT in notes)
- This stores scheduling information in `tracked_files.json` instead of modifying your note files
- Benefits: Cleaner notes, easier version control, no scheduling data cluttering your content

**Algorithm:**
- Choose: **FSRS** (Free Spaced Repetition Scheduler)
- This is one of the main reasons to use Flow - FSRS is more accurate than traditional SM-2
- For parameter settings, refer to [FSRS v4 documentation](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-v4)

**Example Configuration:**

![Recommended Settings](https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall/assets/9208450/a22d23df-5d11-4b19-9007-e1530e2808be)

**Other Settings:**
- Configure remaining settings based on the descriptions in the settings panel
- See [User Options](./en/user-options.md) for detailed explanations of all settings

#### Getting Started with Review

**Via Command Palette:**
- Press `Ctrl/Cmd + P` to open command palette
- Search for "Spaced Repetition" commands
- Use commands to start reviewing notes or cards

**Via UI:**
- **Desktop:** Click notes in the status bar or right sidebar to review notes
- **Desktop:** Click cards in the left sidebar navigation to review cards
- **Mobile:** Access review through command palette or sidebar

**Additional Resources:**
- For flashcard creation, see [@st3v3nmw's documentation](https://github.com/st3v3nmw/obsidian-spaced-repetition#readme)
- For note tracking, see [recall plugin documentation](https://github.com/martin-jw/obsidian-recall)

---

### CASE2: Migrating from Original SR Plugin

If you're migrating from the original Obsidian Spaced Repetition plugin, follow these steps carefully.

#### ⚠️ CRITICAL WARNINGS

**BACKUP YOUR VAULT!!!**  
**BACKUP YOUR VAULT!!!**  
**BACKUP YOUR VAULT!!!**

Changing the Data Location setting will delete review information from your note content and move it to a separate `tracked_files.json` file. While this is intentional behavior, **always backup first** in case of unexpected issues.

#### Migration Steps

1. **Close the original plugin**
   - Go to Settings → Community Plugins
   - Disable "Obsidian Spaced Repetition" to avoid conflicts

2. **Backup your vault**
   - Create a complete backup of your entire vault
   - Verify the backup is complete and accessible
   - This is your safety net!

3. **Copy plugin data**
   - Close Obsidian completely
   - Navigate to your vault's `.obsidian/plugins/` directory
   - Copy `obsidian-spaced-repetition/data.json` to `obsidian-spaced-repetition-recall/data.json`
   - This preserves your existing review history

4. **Reopen Obsidian**
   - Start Obsidian
   - Flow will load your existing review data

5. **Configure for FSRS (Recommended)**
   - Follow the CASE1 recommended settings above
   - Set Data Location to "In plugin/vault/specified folder"
   - Set Algorithm to "FSRS"
   - Configure FSRS parameters as needed

#### What Happens During Migration

- Your review history is preserved
- If you change Data Location to separate storage, scheduling data is removed from notes
- Notes become cleaner without scheduling metadata
- All review progress is maintained in `tracked_files.json`

#### Reverting Changes

If you're not satisfied with the new setup:
- Simply restart Obsidian before reviewing any items
- The previous schedule will be restored
- New schedules only persist after you review your first note/card

---

## Adding Content

### Adding Notes

Notes in Flow can be tracked for spaced repetition review. This is perfect for progressive summarization and incremental writing.

#### Methods to Add Notes

**Method 1: Add Review Tag**
- Add your configured review tag (e.g., `#review`) to any note
- The note will automatically be tracked for review

**Method 2: Via Command Palette**
- Open command palette (`Ctrl/Cmd + P`)
- Search for "Track note" or "Add note to review"
- Select the command to track the current note
- See [tracking notes documentation](https://github.com/martin-jw/obsidian-recall#tracking-notes) for details

**Method 3: Folder Operations**
- Right-click on any folder in the file explorer
- Select "Track All Notes" to add all notes in that folder
- Select "Untrack All Notes" to remove all notes from review

![Folder Operations](https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall/assets/9208450/163f397c-cc8f-49a6-ab6f-cb929cf91d2d)

#### Removing Notes from Review

**Manual Untracking:**
- Remove the review tag from the note
- Use command palette: "Untrack note"

**Automatic Untracking:**
- Enable the `untrackWithReviewTag` setting
- Notes will automatically be untracked when you remove the review tag
- No manual untracking command needed

#### Converting Notes to Card Decks

Flow allows you to selectively convert review notes into flashcard decks:

- Not all notes need to be converted - choose which ones make sense
- Configure in Settings → Flashcards
- Can also convert entire folders to card decks

---

### Adding Cards

Flashcards in Flow support all standard card types plus enhanced features like multiple cloze deletions.

#### Prerequisites

Before creating cards, you **must** add a flashcard tag to your note (e.g., `#flashcards`).

**Optional organization methods:**
- Convert folders to decks in settings (uses folder structure for organization)
- Convert review notes to card decks in settings

**Important:** Flashcard tags are always required, even when using folder-based or note-based organization. These settings only affect how cards are organized, not whether they are processed.

#### Card Types

Flow supports all standard flashcard formats. For detailed instructions, see the [flashcard documentation](./en/flashcards/flashcards-overview.md).

**Single-line Basic (RemNote style):**
```markdown
Question::Answer
```

**Single-line Reversed:**
```markdown
Question:::Answer
```
Creates two cards: Question→Answer and Answer→Question

**Multi-line Basic:**
```markdown
Question
?
Answer
```

**Multi-line Reversed:**
```markdown
Question
??
Answer
```
Creates two cards in both directions

**Cloze Cards:**
```markdown
==Highlighted text== becomes a cloze deletion
**Bold text** becomes a cloze deletion
{{Text in curly braces}} becomes a cloze deletion
```

**Multiple Cloze Deletions:**
Flow supports multiple cloze deletions in a single card:
```markdown
The {{capital}} of {{France}} is {{Paris}}.
```
- Maximum 4 clozes per card
- More than 4 are split into groups of 3
- Not affected by "bury sibling cards" setting
- See [Cloze Cards documentation](./en/flashcards/basic-cloze-cards.md) for details

---

## Reviewing Content

### Reviewing Notes

Note review in Flow includes the powerful float bar feature for a seamless review experience.

#### Starting Note Review

**Via Command Palette:**
- Open command palette (`Ctrl/Cmd + P`)
- Search for "Review notes"
- Select the command to start reviewing

**Via UI:**
- **Desktop:** Click "Notes" in the status bar (bottom) or right sidebar
- **Mobile:** Access through command palette or sidebar

#### Float Bar Feature

The float bar provides a card-like review experience for notes, displaying review buttons that float over your note content.

**Desktop Usage:**

- **Keyboard Shortcuts** (in reading/preview mode, not edit mode):
  - `0` = Reset/Again (start over with this note)
  - `1` = Hard (found it difficult, review sooner)
  - `2` = Good (standard interval)
  - `3` = Easy (found it easy, review later)

- **Right-click Float Bar:**
  - Close the float bar
  - Set time interval visibility (show/hide intervals)

- **Alternative Feedback:**
  - Use command palette for review responses
  - Use menu bar options

**Mobile Usage:**

- **Swipe up** from the float bar to show/hide the menu
- **Long-press** the float bar to set time interval visibility
- Tap review buttons to provide feedback

#### Float Bar Visibility Recommendations

Configure float bar visibility based on your use case:

- **Hide intervals during review:** Focus on recall without seeing the schedule
- **Show intervals during progressive summarization:** See when you'll revisit the note
- **Show intervals during incremental writing:** Track your writing schedule

Configure visibility in Settings → Notes → Float Bar Settings

---

### Reviewing Cards

Card review in Flow works similarly to the original plugin with enhanced features.

#### Starting Card Review

**Via Command Palette:**
- Open command palette (`Ctrl/Cmd + P`)
- Search for "Review flashcards"
- Select the command to start reviewing

**Via UI:**
- **Desktop:** Click on decks in the left sidebar navigation
- **Mobile:** Access through command palette or sidebar

#### Review Modes

**Normal Review:**
- Reviews cards according to their schedule
- Updates review data after each response
- Follows your selected algorithm (Default/Anki/FSRS)

**CRAM Mode (Concentrated Review):**
- Review cards from current note or all notes
- **Does not update review data**
- Useful for quick study sessions without affecting scheduling
- Access via command palette: "CRAM review"

#### Review Options

**Current Note Cards:**
- Review only cards within the currently open note
- Useful for focused study on specific topics

**All Cards:**
- Review cards from across your entire vault
- Standard spaced repetition workflow

---

## Flow Features

### Postpone Notes/Cards

Postpone allows you to delay review of items that are scheduled before today.

#### How It Works

- Postpones notes/cards scheduled before today (not including today)
- Only applies to items with **current retention >65%**
- Reschedules items to a future date without updating review data
- Useful when you're behind on reviews and want to catch up gradually

#### Usage

1. Open command palette (`Ctrl/Cmd + P`)
2. Search for "Postpone notes" or "Postpone cards"
3. Select the command
4. Items meeting the criteria will be rescheduled

#### Important Notes

⚠️ **Reverting Changes:**
- If you're not satisfied with the new schedule, **restart Obsidian immediately**
- The previous schedule will be restored
- Changes persist after you review your first note/card

⚠️ **Procrastination Warning:**
- "Tomorrow after tomorrow, how many tomorrows?"
- Use postpone sparingly to avoid building up a large backlog
- Better to review consistently than to postpone repeatedly

---

### Postpone After X Days

This feature allows you to schedule specific notes/cards to review after a custom number of days.

#### How It Works

- Schedule individual notes/cards to review after X days
- Ignores current review time and retention rate
- Overrides the normal scheduling algorithm
- Useful for items you want to review at a specific time

#### Usage

1. Open the note containing the item you want to postpone
2. Open command palette (`Ctrl/Cmd + P`)
3. Search for "Postpone after x days"
4. Enter the number of days
5. The item will be scheduled for review after that many days

#### Recommendations

⚠️ **Use Sparingly:**
- Only modify individual notes or cards, not large batches
- Bulk postponing can create excessive review load on specific days
- Can disrupt the natural spacing of your reviews

**Good Use Cases:**
- Postponing a single difficult card you want to review soon
- Scheduling a note to align with an upcoming event
- Adjusting timing for a specific piece of content

**Bad Use Cases:**
- Postponing entire decks or folders
- Using as a substitute for proper review scheduling
- Repeatedly postponing the same items

---

### Reschedule All Items

Reschedule recalculates the next review time for all scheduled items based on your current settings.

#### How It Works

- Recalculates next review time for all **already scheduled** notes/cards
- Based on current algorithm settings and review history
- Uses your configured parameters (FSRS, Anki, or Default)
- Does not affect items that haven't been reviewed yet

#### When to Use

**Useful scenarios:**
- After changing algorithm (e.g., switching to FSRS)
- After updating algorithm parameters
- After importing data from another system

**Note:** This feature is "basically not needed" for normal use. The algorithm handles scheduling automatically.

#### Usage

1. Open command palette (`Ctrl/Cmd + P`)
2. Search for "Reschedule all items"
3. Confirm the action
4. All scheduled items will be recalculated

#### Important Notes

⚠️ **Reverting Changes:**
- If you're not satisfied with the new schedule, **restart Obsidian immediately**
- The previous schedule will be restored
- Changes persist after you review your first note/card

⚠️ **Consider Carefully:**
- This affects all your scheduled items at once
- Make sure you understand the impact before using
- Always backup before major scheduling changes

---

### View Statistics

Flow provides enhanced statistics including note review data and daily review statistics.

#### Accessing Statistics

1. Open command palette (`Ctrl/Cmd + P`)
2. Search for "SR view statistics" or "View statistics"
3. Select the command
4. Statistics window will open

#### Available Statistics

- **Note review statistics:** Track your note review progress
- **Card review statistics:** Traditional flashcard statistics
- **Daily review statistics:** See your review patterns over time
- **Forecast:** Predict future review load
- **Retention rates:** Monitor your learning effectiveness

For detailed information about statistics, see the [Statistics documentation](./en/flashcards/statistics.md).

---

### SR Item Info

View and modify review information for the current note or cards within the current note.

#### Accessing Item Info

1. Open a note containing review items
2. Open command palette (`Ctrl/Cmd + P`)
3. Search for "SR Item Info"
4. Select the command

#### Features

- **View review information:** See scheduling data for current note/cards
- **Modify next review date/time:** Manually adjust when items will be reviewed
- **Inspect review history:** See past review responses
- **Debug scheduling issues:** Understand why items are scheduled as they are

#### Use Cases

- Checking why a card is scheduled for a specific date
- Manually adjusting review timing for special circumstances
- Debugging issues with scheduling
- Understanding your review patterns

---

## Algorithm Selection

Flow supports three different spaced repetition algorithms. Choose the one that best fits your needs.

### Available Algorithms

**1. Default (Anki Optimized)**
- Modified version of the Anki algorithm
- Optimized for better spacing
- Good balance of simplicity and effectiveness
- See [Algorithms documentation](./en/algorithms.md)

**2. Anki Algorithm**
- Standard Anki SM-2 based algorithm
- Well-tested and widely used
- Compatible with Anki's scheduling
- See [Anki algorithm details](https://github.com/martin-jw/obsidian-recall#currently-available-algorithms)

**3. FSRS (Recommended)**
- Free Spaced Repetition Scheduler
- More accurate than SM-2 based algorithms
- Uses machine learning for optimal scheduling
- Can export review log (`ob_revlog.csv`) for parameter optimization
- See [FSRS documentation](https://github.com/open-spaced-repetition/fsrs.js)
- Configure parameters using [FSRS optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer)

### Configuring Your Algorithm

1. Go to Settings → Spaced Repetition → Algorithm
2. Select your preferred algorithm
3. Configure algorithm-specific parameters
4. For FSRS, see [FSRS v4 parameter guide](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-v4)

### Important Guidelines

⚠️ **Don't Switch Algorithms Frequently:**
- Each algorithm has different scheduling logic
- Switching disrupts your review schedule
- Choose one algorithm and stick with it
- If you must switch, consider using "Reschedule all items" afterward

⚠️ **Different Parameters:**
- Each algorithm has its own parameters
- Parameters are not transferable between algorithms
- Configure parameters appropriate for your chosen algorithm

---

## Use Cases

Flow supports multiple workflows beyond traditional flashcard review.

### Spaced Repetition Review

The classic use case: reviewing flashcards and notes at spaced intervals for long-term retention.

**Best Practices:**
- Review consistently every day
- Use appropriate difficulty ratings (Hard/Good/Easy)
- Don't postpone excessively
- Let the algorithm guide your schedule

**Recommended Settings:**
- Algorithm: FSRS
- Data Location: Separate file
- Float bar visibility: Hide intervals during review
- Mixed queue: Enabled (3 due, 2 new)

---

### Progressive Summarization

Incrementally refine and summarize notes over time through spaced review.

**Concept:**
Progressive summarization uses spaced repetition to revisit notes at increasing intervals, allowing you to gradually distill and refine information. This technique is inspired by Andy Matuschak's work on [using spaced repetition to program attention](https://notes.andymatuschak.org/z7iCjRziX6V6unNWL81yc2dJicpRw2Cpp9MfQ).

**Workflow:**

1. **Create initial note:** Write rough notes on a topic
2. **Add to review:** Tag the note for spaced repetition
3. **First review:** Read through, highlight key points
4. **Subsequent reviews:** Each time you review:
   - Refine the summary
   - Add connections to other notes
   - Remove unnecessary details
   - Highlight the most important insights

**Review Responses:**

- **Skip note (Good):** Note is useful, review at normal interval
- **Read, found useful (Hard):** Decrease interval, review sooner
- **Read, not useful (Easy):** Increase interval, review later
- **Convert to evergreen note:** Stop using spaced repetition, note is complete

**Recommended Settings:**
- Float bar visibility: **Show intervals** (track your refinement schedule)
- Algorithm: FSRS (for optimal spacing)
- Review mode: Note review (not cards)

**Benefits:**
- Gradually refine understanding over time
- Avoid one-time note-taking that's never revisited
- Build deeper connections between ideas
- Create high-quality evergreen notes

---

### Incremental Writing

Develop long-form content gradually through spaced writing sessions.

**Concept:**
Instead of writing in one long session, break writing into multiple spaced sessions. Each session builds on the previous work, allowing ideas to develop naturally over time.

**Workflow:**

1. **Create writing note:** Start with an outline or rough draft
2. **Add to review:** Tag for spaced repetition
3. **First session:** Write initial thoughts
4. **Subsequent sessions:** Each review session:
   - Read what you wrote before
   - Add new sections
   - Refine existing content
   - Reorganize as needed
   - Let ideas marinate between sessions

**Review Responses:**

- **Hard:** Need to work on this soon, ideas are flowing
- **Good:** Standard interval, steady progress
- **Easy:** Need more time to think, review later

**Recommended Settings:**
- Float bar visibility: **Show intervals** (plan your writing schedule)
- Algorithm: FSRS
- Review mode: Note review
- Consider longer intervals than traditional review

**Benefits:**
- Avoid writer's block through distributed effort
- Allow ideas to develop subconsciously between sessions
- Produce higher quality writing through iteration
- Make large writing projects manageable

**Use Cases:**
- Research papers
- Blog posts
- Book chapters
- Documentation
- Long-form essays

---

## Experimental Features

⚠️ **WARNING: NOT RECOMMENDED FOR DAILY USE!**  
⚠️ **WARNING: NOT RECOMMENDED FOR DAILY USE!**  
⚠️ **WARNING: NOT RECOMMENDED FOR DAILY USE!**

Flow includes experimental debugging features that can cause data loss. These are intended for development and troubleshooting only.

### Enabling Experimental Features

1. Go to Settings → Spaced Repetition
2. Enable "Setup Logging → Debugging Information"
3. Experimental commands will appear in the command palette

### Available Experimental Commands

**Print Data:**
- Outputs review data in the debug window
- Useful for inspecting data structure
- Safe to use (read-only)

**Reset Data:**
- **DANGEROUS:** Deletes all review data
- Cannot be undone
- Only use if you want to start completely fresh
- **Backup first!**

**Update Items:**
- Updates invalid data entries to default values
- Attempts to fix corrupted data
- May not preserve all information
- **Backup first!**

**Prune Data:**
- Clears invalid data entries
- Modifies data item IDs
- **Affects FSRS optimizer:** Changed IDs prevent optimizer from processing historical data
- Can cause data loss
- **Backup first!**

### When to Use Experimental Features

**Appropriate use cases:**
- Debugging data corruption issues
- Troubleshooting scheduling problems
- Development and testing
- Starting fresh after major changes

**Inappropriate use cases:**
- Regular maintenance
- Normal operation
- Without backups
- Without understanding the consequences

### Safety Guidelines

1. **Always backup your vault before using experimental features**
2. **Understand what each command does before running it**
3. **Don't use these features for daily operation**
4. **If in doubt, ask for help in the community**
5. **Test on a copy of your vault first**

---

## Additional Resources

### Documentation

- [Flow Features Overview](./en/flow-features.md) - Complete list of Flow enhancements
- [Flashcard Documentation](./en/flashcards/flashcards-overview.md) - Detailed flashcard guide
- [User Options](./en/user-options.md) - All settings explained
- [Plugin Commands](./en/plugin-commands.md) - Complete command reference
- [Algorithms](./en/algorithms.md) - Algorithm details and comparison
- [Data Storage](./en/data-storage.md) - Storage options explained

### External Resources

- [Original SR Plugin](https://github.com/st3v3nmw/obsidian-spaced-repetition) - Original plugin documentation
- [Recall Plugin](https://github.com/martin-jw/obsidian-recall) - Note review inspiration
- [FSRS](https://github.com/open-spaced-repetition/fsrs.js) - FSRS algorithm
- [FSRS Optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer) - Parameter optimization
- [Andy Matuschak's Notes](https://notes.andymatuschak.org/) - Spaced repetition research

### Community

- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share tips
- Contributing: See [Contributing Guide](./en/contributing.md)

---

## Quick Reference

### Essential Commands

- `Review notes` - Start note review
- `Review flashcards` - Start card review
- `Track note` - Add current note to review
- `Untrack note` - Remove current note from review
- `SR view statistics` - View statistics
- `SR Item Info` - View/modify item information
- `Postpone notes` - Postpone overdue notes
- `Postpone after x days` - Custom postpone
- `Reschedule all items` - Recalculate all schedules

### Keyboard Shortcuts (Note Review)

- `0` - Reset/Again
- `1` - Hard
- `2` - Good
- `3` - Easy

### Quick Tips

- **New users:** Use FSRS algorithm with separate data storage
- **Migrating:** Backup first, then copy data.json
- **Postponing:** Use sparingly, don't build up backlogs
- **Algorithms:** Choose one and stick with it
- **Float bar:** Hide intervals for review, show for summarization
- **Experimental features:** Don't use for daily operation

---

*This guide covers the essential features of Flow. For detailed information on specific features, see the linked documentation pages.*
