# Scripts

Utility scripts for the Obsidian Spaced Repetition Flow plugin.

## sync_lang.py

Synchronizes translation files across all language directories.

### Features

- **Adds missing keys**: Automatically adds new translation keys from English to all other languages
- **Marks untranslated strings**: Adds `// TODO: Translate` comment above untranslated strings
- **Updates changed strings**: When English source changes, updates strings that have the TODO marker
- **Preserves translations**: Keeps existing translations intact
- **Maintains structure**: Preserves file structure, comments, and formatting

### Usage

```bash
# From project root
python scripts/sync_lang.py

# Or with Python 3 explicitly
python3 scripts/sync_lang.py
```

### How it works

1. Reads all translation modules from `src/lang/locale/en/` (English source)
2. For each language directory (ru, fr, de, etc.):
   - Loads existing translations from both old monolithic files and new modular files
   - Compares with English source
   - Adds missing keys with `// TODO: Translate` marker
   - Updates keys that already have the TODO marker (when English changed)
   - Preserves existing translations
   - Writes updated files

### Example output

```typescript
export default {
    // Existing translation (preserved)
    ALGORITHM: "Алгоритм",
    
    // TODO: Translate
    NEW_FEATURE: "New feature description",
    
    // TODO: Translate
    UPDATED_FEATURE: "Updated English text",
};
```

### When to run

- After adding new translation keys to English files
- After modifying English text that needs re-translation
- When setting up a new language
- Periodically to keep all languages in sync

### Notes

- The script is idempotent - safe to run multiple times
- Existing translations are never overwritten (unless marked with TODO)
- The TODO marker helps translators identify what needs work
- Run this before asking translators to update their languages
