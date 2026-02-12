# Locale Structure

This directory contains translations for the Obsidian Spaced Repetition Flow plugin.

## Structure

Each language has its own directory with modular translation files:

```
locale/
├── en/                    # English (source)
│   ├── index.ts          # Exports all modules
│   ├── algorithms.ts     # Algorithm-related translations
│   ├── commands.ts       # Command translations
│   ├── data.ts           # Data management translations
│   ├── flashcard-modal.ts # Flashcard modal translations
│   ├── main.ts           # Main plugin translations
│   ├── scheduling.ts     # Scheduling translations
│   ├── settings.ts       # Settings translations
│   ├── sidebar.ts        # Sidebar translations
│   └── stats.ts          # Statistics translations
├── ru/                    # Russian
│   └── (same structure)
├── zh-cn/                 # Chinese (Simplified)
│   └── (same structure)
└── ...                    # Other languages

```

## Modules

- **algorithms.ts** - FSRS, Anki, SM2 algorithm settings and descriptions
- **commands.ts** - Command palette entries and command-related messages
- **data.ts** - Data storage, tracking, and file management
- **flashcard-modal.ts** - Flashcard review modal UI
- **main.ts** - Core plugin messages, status bar, notifications
- **scheduling.ts** - Interval formatting and scheduling messages
- **settings.ts** - Settings tab, configuration options
- **sidebar.ts** - Sidebar view, deck list, sorting, filtering
- **stats.ts** - Statistics modal, charts, forecasts

## Adding Translations

### For New Languages

1. Run `global_sync.py` to create the modular structure from your monolithic `{lang}.ts` file
2. The script will:
   - Create a new directory `locale/{lang}/`
   - Split translations into modules matching English structure
   - Preserve existing translations
   - Use English text for missing translations

### For Existing Modular Languages

1. Add your translations to the appropriate module file
2. Translations are key-value pairs:
   ```typescript
   export default {
       KEY_NAME: "Translated text",
       ANOTHER_KEY: "Another translation",
   };
   ```

### Syncing After English Changes

When English translations are updated:

1. Run `global_sync.py`
2. The script will:
   - Preserve all existing translations
   - Add new keys with English text as placeholder
   - Maintain the same structure as English
   - Keep comments and formatting

## Translation Guidelines

1. **Preserve placeholders**: Keep `{variable}` placeholders intact
   - Example: `"Review in {days} days"` → `"Повторить через {days} дней"`

2. **Maintain formatting**: Keep line breaks and indentation for multi-line strings

3. **Template literals**: Use backticks for multi-line text
   ```typescript
   LONG_TEXT: `This is a long
   multi-line text that
   spans several lines`,
   ```

4. **HTML tags**: Preserve HTML tags and attributes
   - Example: `'<a href="{url}">link</a>'`

5. **Special characters**: Escape quotes when needed
   - Example: `"He said \"hello\""`

## Scripts

### global_sync.py

Synchronizes all language directories with English structure.

```bash
python global_sync.py
```

This script:
- Reads the English modular structure
- For each language:
  - Loads existing translations from monolithic or modular files
  - Creates/updates modular files matching English structure
  - Preserves all existing translations
  - Uses English text for missing keys
  - Copies index.ts

### sync_locales.py

Legacy script for syncing monolithic locale files (deprecated).

## File Format

Each module file follows this structure:

```typescript
export default {
    // Section comment
    KEY_NAME: "Translation text",
    ANOTHER_KEY: "Another translation",
    
    // Multi-line example
    LONG_KEY: `This is a long
    translation that spans
    multiple lines`,
    
    // With placeholders
    FORMATTED_KEY: "Text with {variable} placeholder",
};
```

## Notes

- The `index.ts` file in each language directory imports and re-exports all modules
- The main `helpers.ts` imports from `locale/{lang}/index`
- All translations are loaded at plugin startup
- Missing translations automatically fall back to English
