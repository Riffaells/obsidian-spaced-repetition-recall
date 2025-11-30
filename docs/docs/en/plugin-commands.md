# Plugin Commands

Flow provides a comprehensive set of commands accessible through Obsidian's command palette (Ctrl/Cmd + P). These commands give you quick access to review functions, scheduling operations, and data management.

![plugin-commands](https://github.com/user-attachments/assets/4838812c-121b-4bd1-82b3-46138b2ae67f)

---

## Review Commands

### Open a note for review

Opens a note from your review queue based on your configured tags.

**Usage:**
1. Press Ctrl/Cmd + P to open command palette
2. Type "Open a note for review"
3. Select a deck/tag if prompted
4. Note opens for review with float bar (if enabled)

**Settings:**
- Configure review tags in Settings → Spaced Repetition → Notes → Tags to review
- Enable "Review note directly" to skip tag selection when note has multiple tags

---

### Review flashcards

Opens the flashcard review interface to review cards from your vault.

**Usage:**
1. Press Ctrl/Cmd + P
2. Type "Review flashcards"
3. Select a deck to review
4. Begin reviewing cards

**Related commands:**
- **Review flashcards from all notes**: Review cards from entire vault
- **Review flashcards in this note**: Review only cards in the current note
- **Cram flashcards in this note**: Review cards in current note without affecting scheduling

---

### View statistics

Opens the statistics modal showing your review progress and patterns.

**Flow Enhancements:**
- **Note review statistics**: Track note review counts and patterns
- **Daily review statistics**: See reviews completed today
- **Enhanced visualizations**: Charts for intervals, eases, and forecasts

**Data shown:**
- Cards/notes reviewed today (new learned + due reviewed)
- Review forecasts
- Interval distributions
- Ease distributions
- Card type breakdowns (new, young, mature)

**Validates:** Requirements 6.10

**Usage:**
1. Press Ctrl/Cmd + P
2. Type "View statistics"
3. Explore your review data across different time periods (Month, Quarter, Year, Lifetime)

---

### SR Item Info

View detailed information about the current note or cards in the current note.

**Information displayed:**
- Next review date
- Current interval
- Current ease
- Review history
- Card/note status (new, due, scheduled)

**Special feature:**
- Can modify the next review time directly from this view
- Useful for manual scheduling adjustments

**Usage:**
1. Open a note that's tracked for review
2. Press Ctrl/Cmd + P
3. Type "SR Item Info" or "Item Info"
4. View and optionally modify scheduling information

**Availability:** Only available when viewing a tracked note or note with flashcards.

**Validates:** Requirements 6.13

---

## Scheduling Commands

### Postpone notes/cards

Postpone items that are scheduled before today (not including today) to a future date.

**How it works:**
- Only applies to items with retention >65%
- Reschedules items without updating review data
- Useful when you need a break or have too many overdue reviews

**Available variants:**
- **Postpone notes**: Postpone only review notes
- **Postpone cards**: Postpone only flashcards
- **Postpone All**: Postpone both notes and cards

**Usage:**
1. Press Ctrl/Cmd + P
2. Type "Postpone notes" or "Postpone cards"
3. Items are automatically rescheduled

**Important notes:**
- ⚠️ **Procrastination warning**: Use sparingly! "Tomorrow after tomorrow, how many tomorrows?"
- **Revert**: Restart Obsidian to restore previous schedule if unsatisfied
- **Persistence**: New schedule saves permanently after reviewing your first note/card

**Validates:** Requirements 6.4

---

### Postpone after x days

Schedule a specific note or cards in the current note to review after a custom number of days.

**How it works:**
- Ignores current review time and retention rate
- Sets a specific delay for individual items
- More precise control than general postpone

**Available variants:**
- **Postpone this note after x days**: Postpone the current note
- **Postpone cards in this note after x days**: Postpone all cards in current note

**Usage:**
1. Open the note you want to postpone
2. Press Ctrl/Cmd + P
3. Type "Postpone after x days"
4. Enter the number of days (must be a positive number)
5. Note/cards are rescheduled

**Recommendation:**
- ✅ **Do**: Use for individual notes/cards that need specific timing
- ❌ **Don't**: Bulk modify many items at once
- **Why**: Prevents excessive review load spikes on specific days

**Availability:** Only available when viewing a tracked note.

**Validates:** Requirements 6.5

---

### Reschedule all items

Recalculate the next review time for all already-scheduled notes and cards.

**How it works:**
- Recalculates based on current settings and review history
- Applies to all scheduled items in your vault
- Useful after changing algorithm or parameters

**Usage:**
1. Press Ctrl/Cmd + P
2. Type "Reschedule"
3. All items are recalculated

**Important notes:**
- ℹ️ **Note**: "Basically not needed" for most users
- **Revert**: Restart Obsidian to restore previous schedule if unsatisfied
- **Persistence**: New schedule saves permanently after reviewing your first note/card
- **Use case**: Primarily useful when switching algorithms or significantly changing parameters

**Validates:** Requirements 6.6

---

## Note Tracking Commands

### Track Note

Add the current note to the spaced repetition system for review.

**Usage:**
1. Open a note you want to track
2. Press Ctrl/Cmd + P
3. Type "Track Note"
4. Note is added to review queue

**Alternative method:**
- Add a review tag (e.g., `#review`) to the note
- Flow automatically tracks notes with configured review tags

**Availability:** Only available for notes that aren't already tracked.

---

### Untrack Note

Remove the current note from the spaced repetition system.

**Usage:**
1. Open a tracked note
2. Press Ctrl/Cmd + P
3. Type "Untrack Note"
4. Note is removed from review queue

**Alternative method:**
- Remove the review tag from the note
- If "UntrackWithReviewTag" setting is enabled, note is automatically untracked

**Availability:** Only available for notes that are currently tracked.

---

## File Menu Commands

### Review: Easy / Good / Hard

Quick review commands available in the file menu (right-click on file).

**Usage:**
1. Right-click on a note in the file explorer
2. Select "Review: Easy", "Review: Good", or "Review: Hard"
3. Note is reviewed with the selected difficulty

**Configuration:**
- Enable/disable in Settings → Spaced Repetition → UI → Enable file menu review options
- Useful for quick reviews without opening the note

**Note:** These commands respect your configured algorithm and scheduling settings.

---

## Experimental Commands

⚠️ **WARNING: NOT RECOMMENDED FOR DAILY USE!**

These commands are for debugging and development purposes only. They can cause data loss or corruption.

**Access:**
1. Navigate to Settings → Spaced Repetition
2. Enable "Setup Logging → Debugging Information"
3. Experimental commands become available in command palette

---

### Print Data

Outputs review data in the developer console for inspection.

**Usage:**
1. Press Ctrl/Cmd + P
2. Type "Print Data"
3. Open developer console (Ctrl/Cmd + Shift + I)
4. View the data output

**Purpose:** Debugging and data inspection

**Safety:** Read-only operation, safe to use

---

### Update Items

Updates invalid data entries to default values.

**Usage:**
1. Press Ctrl/Cmd + P
2. Type "Update Items"
3. Invalid data is updated

**Purpose:** Fix corrupted or invalid data entries

**Warning:** May not preserve all information. Backup first!

---

### Reset Data

⚠️ **EXTREMELY DANGEROUS**: Deletes ALL review data permanently.

**Purpose:** Start completely fresh with no review history

**Warning:** 
- Cannot be undone
- All review progress is lost
- All scheduling information is deleted
- Only use if you want to completely reset Flow

**Not available by default:** This command is commented out in the code for safety.

---

### Prune Data

Clears invalid data entries from the review database.

**Purpose:** Remove corrupted or orphaned data

**Warning:**
- Changes data item IDs
- Affects FSRS optimizer compatibility
- May cause issues with review history
- Only use if you have corrupted data

**Not available by default:** This command is commented out in the code for safety.

---

### Other Debug Commands

Additional debugging commands available when debugging is enabled:

- **Build Queue**: Manually rebuild the review queue
- **Clear Queue**: Clear the current review queue
- **Queue All**: Add all items to the queue
- **Review**: Open the review view directly
- **Print View State**: Output current view state to console
- **Print Ephemeral State**: Output ephemeral state to console

**Purpose:** Development and troubleshooting

**Recommendation:** Only use these if you understand their effects or are troubleshooting with developer support.

---

## Command Hotkeys

You can assign custom keyboard shortcuts to any command:

1. Go to Settings → Hotkeys
2. Search for "Spaced Repetition" or "SR"
3. Click the "+" icon next to a command
4. Press your desired key combination
5. Save

**Recommended hotkeys:**
- Review flashcards: `Ctrl/Cmd + Shift + R`
- Open note for review: `Ctrl/Cmd + Shift + N`
- View statistics: `Ctrl/Cmd + Shift + S`

---

## Tips for Effective Command Usage

### Daily Review Workflow

1. **Morning**: Run "View statistics" to see today's review load
2. **Review session**: Use "Review flashcards" or "Open note for review"
3. **During review**: Use keyboard shortcuts (0/1/2/3) for faster reviews
4. **As needed**: Use "Postpone" commands if overwhelmed

### Maintenance Workflow

1. **Weekly**: Check statistics to monitor progress
2. **Monthly**: Review "SR Item Info" for important notes
3. **After settings changes**: Run "Reschedule all items" if needed
4. **Before algorithm switch**: Export review log for FSRS optimization

### Troubleshooting Workflow

1. **Enable debugging**: Settings → Logging → Debugging Information
2. **Print Data**: Check current data state
3. **Update Items**: Fix invalid entries
4. **Contact support**: Share console output if issues persist

---

## Related Documentation

- **Settings Configuration**: See [User Options](user-options.md)
- **Algorithm Details**: See [Repetition Algorithms](algorithms.md)
- **Flow Features Overview**: See [Flow Features](flow-features.md)
- **Statistics Details**: See [Statistics](flashcards/statistics.md)
