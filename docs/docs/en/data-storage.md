# Data Storage

Flow provides two methods for storing scheduling information: in-note storage (the traditional method) and separate file storage (a Flow enhancement). You can choose the method that best fits your workflow.

## Scheduling Information Storage Methods

### Method 1: Individual Markdown Files (In-Note Storage)

This is the original method used for storing the scheduling information for cards and notes directly within your markdown files.

**For Cards:**

Scheduling data is stored in an HTML comment after the card. For example with the card:

```
The RCU and WCU limits for a single partition key value::3000 RCU, 1000 WCU
```

When the card is reviewed, an HTML comment will be added after the card's text, such as:

```
<!--SR:!2024-08-16,51,230-->
```

By default, the comment is stored on the line following the card text.
Alternatively, it can be stored on the same line by enabling the
[Save scheduling comment on the same line as the flashcard's last line?](user-options.md#storage-of-scheduling-data)
option.

**For Notes:**

Scheduling information for the note is kept at the beginning of the file, in YAML format within the frontmatter section.
For example:

![note-frontmatter](https://github.com/user-attachments/assets/b9744f50-c897-46ad-ab34-1bbc55796b57)

!!! note "Raw text format"

    ```yaml
    sr-due: 2024-07-01
    sr-interval: 3
    sr-ease: 269
    ```

---

### Method 2: Separate File Storage (Flow Enhancement)

Flow introduces the ability to store all scheduling information in a separate JSON file (`tracked_files.json`) instead of modifying your note files. This is a major enhancement that keeps your notes clean and improves version control.

**File Location:**

The scheduling data is stored in `tracked_files.json` in one of these locations (configurable in settings):

-   Plugin folder (`.obsidian/plugins/obsidian-spaced-repetition-flow/`)
-   Vault root folder
-   Custom specified folder

**Benefits:**

-   **Cleaner Notes**: Your markdown files remain unmodified, containing only your content
-   **Better Version Control**: Git diffs show only content changes, not scheduling metadata
-   **Easier Collaboration**: Share notes without exposing your personal review schedule
-   **Simpler Backups**: Separate your content from your review data

**Configuration:**

1. Open plugin settings
2. Navigate to the "Data Location" setting
3. Choose one of the following options:
    - **In plugin folder** (recommended for most users)
    - **In vault root folder**
    - **In specified folder** (enter custom path)
4. To use in-note storage instead, select **"In notes"**

!!! warning "Important: Data Migration"

    When you change the Data Location setting from "In notes" to a separate file location:

    - All scheduling information will be **removed from your note files**
    - The data will be **moved to** `tracked_files.json`
    - This change is **immediate and automatic**
    - **Backup your vault before changing this setting!**

**Migration Between Storage Methods:**

**From In-Note to Separate File:**

1. **Backup your vault first!** (This is critical)
2. Open plugin settings
3. Change "Data Location" from "In notes" to your preferred location
4. The plugin will automatically:
    - Extract all scheduling data from your notes
    - Create `tracked_files.json` with the extracted data
    - Remove scheduling comments and frontmatter from your notes

**From Separate File to In-Note:**

1. **Backup your vault first!**
2. Open plugin settings
3. Change "Data Location" to "In notes"
4. The plugin will automatically:
    - Read scheduling data from `tracked_files.json`
    - Add scheduling comments to cards
    - Add frontmatter to notes
    - The `tracked_files.json` file will remain but won't be used

!!! tip "Recommendation for New Users"

    If you're starting fresh with Flow, consider using separate file storage from the beginning. This keeps your notes clean and makes version control much easier. See the [usage guide](usage.md) for CASE1 (new user) recommendations.

!!! warning "For Users Migrating from Original SR Plugin"

    If you're migrating from the original Obsidian Spaced Repetition plugin:

    - **BACKUP YOUR VAULT** before making any changes
    - Your existing in-note scheduling data will be preserved
    - You can optionally migrate to separate file storage after confirming everything works
    - See the [usage guide](usage.md) for CASE2 (migration) instructions

---

## User Options

All user [options](user-options.md) are stored in `data.json` in the plugin folder.

---

## Card Postponement List

This records a list of cards reviewed today that have sibling cards that shouldn't be reviewed until tomorrow.

Cards are only added to this list if the [Bury sibling cards until the next day](user-options.md#flashcard-review)
setting is turned on.

This information is also kept in the `data.json` file.

!!! note

    To minimise the space required for this, a copy of the card is not stored. Rather a small numeric hash code ("fingerprint") is kept.
