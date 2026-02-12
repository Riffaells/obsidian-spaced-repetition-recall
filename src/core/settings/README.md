# Settings Module

This module provides centralized settings management for the Obsidian Spaced Repetition Flow plugin.

## Overview

The settings module is organized into several files, each with a specific purpose:

```
src/core/settings/
├── index.ts                  # Main export file
├── SRSettings.ts            # Settings interface definition
├── DefaultSettings.ts       # Default values for all settings
├── SettingsConstants.ts     # Constants to avoid hardcoded values
├── SettingsCategories.ts    # Type definitions for settings categories
├── SettingsHelpers.ts       # Helper functions for settings operations
├── SettingsMigration.ts     # Migration logic for settings updates
└── README.md                # This file
```

## Architecture

### 1. SettingsConstants.ts

Contains all hardcoded values as constants. This provides:
- **Single source of truth** for default values
- **Type safety** with const assertions
- **Easy maintenance** - change values in one place
- **Better IDE support** with autocomplete

Example usage:
```typescript
import { SettingsConstants as C } from "src/core/settings";

// Use constants instead of hardcoded strings
const separator = C.FLASHCARD_SEPARATORS.SINGLE_LINE; // "::"
const tag = C.DEFAULT_TAGS.FLASHCARDS; // "#flashcards"
```

### 2. SettingsCategories.ts

Provides type definitions for logical groups of settings:
- `FlashcardSettings` - Flashcard-related settings
- `NoteReviewSettings` - Note review settings
- `UIPreferences` - User interface preferences
- `AlgorithmSettings` - Algorithm parameters
- `StorageSettings` - Data storage configuration
- `TrackingSettings` - File tracking settings
- `DebugSettings` - Debug and logging options
- `SettingsMetadata` - Plugin metadata

This improves code organization and makes it easier to work with related settings.

### 3. SRSettings.ts

The main settings interface that combines all setting categories. This is the interface used throughout the plugin.

### 4. DefaultSettings.ts

Provides default values for all settings. Uses constants from `SettingsConstants.ts` to avoid hardcoding.

### 5. SettingsHelpers.ts

Utility functions for working with settings:
- **Validation** - Validate setting values (percentages, header levels, etc.)
- **Getters** - Retrieve specific settings or computed values
- **Transformers** - Convert between units (seconds ↔ milliseconds)
- **Comparison** - Check if settings have changed
- **Utilities** - Common operations on settings

Example usage:
```typescript
import { validatePercentage, getFlashcardDimensions } from "src/core/settings";

const validPosition = validatePercentage(150); // Returns 100 (clamped)
const dimensions = getFlashcardDimensions(true); // Returns mobile dimensions
```

### 6. SettingsMigration.ts

Handles migration of settings from older versions to newer versions. This ensures backward compatibility when the settings structure changes.

## Usage

### Importing Settings

```typescript
// Import everything from the settings module
import { 
    SRSettings, 
    DEFAULT_SETTINGS, 
    SettingsConstants,
    validatePercentage,
    getFlashcardDimensions 
} from "src/core/settings";

// Or import specific items
import { SRSettings } from "src/core/settings/SRSettings";
import { DEFAULT_SETTINGS } from "src/core/settings/DefaultSettings";
```

### Using Constants

```typescript
import { SettingsConstants as C } from "src/core/settings";

// Instead of hardcoding:
const separator = "::"; // ❌ Bad

// Use constants:
const separator = C.FLASHCARD_SEPARATORS.SINGLE_LINE; // ✅ Good
```

### Validating Settings

```typescript
import { validatePercentage, validateHeaderLevels } from "src/core/settings";

// Validate percentage (0-100)
const position = validatePercentage(userInput);

// Validate header levels
const levels = [1, 2, 3];
if (validateHeaderLevels(levels)) {
    // Levels are valid
}
```

### Checking Settings Changes

```typescript
import { hasAlgorithmSettingsChanged } from "src/core/settings";

if (hasAlgorithmSettingsChanged(oldSettings, newSettings)) {
    // Algorithm settings changed, need to reload
}
```

## Benefits

### 1. No More Hardcoded Values

Before:
```typescript
const separator = "::"; // What does this mean?
const maxDays = 365; // Why 365?
const position = 5; // 5 what?
```

After:
```typescript
const separator = C.FLASHCARD_SEPARATORS.SINGLE_LINE; // Clear meaning
const maxDays = C.NOTE_REVIEW_SETTINGS.MAX_DAYS_REVIEW_QUEUE; // Self-documenting
const position = C.RESPONSE_BAR_POSITION.DEFAULT_PERCENTAGE; // Clear unit
```

### 2. Type Safety

Constants are typed, so you get autocomplete and type checking:
```typescript
// TypeScript knows this is a CompactButtonPosition
const position: C.CompactButtonPosition = C.COMPACT_BUTTON_POSITIONS.TOP_RIGHT;
```

### 3. Easy Refactoring

Change a value in one place, and it updates everywhere:
```typescript
// In SettingsConstants.ts
export const FLASHCARD_SEPARATORS = {
    SINGLE_LINE: "::", // Change this once
    // ...
} as const;

// All usages automatically updated
```

### 4. Better Organization

Settings are logically grouped by category, making it easier to find and modify related settings.

### 5. Validation and Safety

Helper functions ensure settings are always valid:
```typescript
// Automatically clamps to valid range
const percentage = validatePercentage(150); // Returns 100
```

## Adding New Settings

When adding a new setting:

1. **Add constant** (if applicable) to `SettingsConstants.ts`
2. **Add type** to appropriate category in `SettingsCategories.ts`
3. **Add to interface** in `SRSettings.ts`
4. **Add default value** in `DefaultSettings.ts` (use constants)
5. **Add helpers** (if needed) in `SettingsHelpers.ts`
6. **Add migration** (if needed) in `SettingsMigration.ts`

Example:
```typescript
// 1. Add constant
export const NEW_FEATURE = {
    DEFAULT_VALUE: 42,
    MIN: 0,
    MAX: 100,
} as const;

// 2. Add to category
export interface NewFeatureSettings {
    newFeatureValue: number;
}

// 3. Add to SRSettings
export interface SRSettings extends NewFeatureSettings {
    // ... other settings
}

// 4. Add default
export const DEFAULT_SETTINGS: SRSettings = {
    newFeatureValue: C.NEW_FEATURE.DEFAULT_VALUE,
    // ... other defaults
};

// 5. Add helper
export function validateNewFeature(value: number): number {
    return clamp(value, C.NEW_FEATURE.MIN, C.NEW_FEATURE.MAX);
}
```

## Migration Guide

If you're updating code that uses the old settings structure:

### Before
```typescript
const separator = "::";
const tag = "#flashcards";
const maxDays = 365;
```

### After
```typescript
import { SettingsConstants as C } from "src/core/settings";

const separator = C.FLASHCARD_SEPARATORS.SINGLE_LINE;
const tag = C.DEFAULT_TAGS.FLASHCARDS;
const maxDays = C.NOTE_REVIEW_SETTINGS.MAX_DAYS_REVIEW_QUEUE;
```

## Best Practices

1. **Always use constants** instead of hardcoded values
2. **Use helper functions** for validation and transformation
3. **Import from index.ts** for cleaner imports
4. **Add JSDoc comments** to new constants and helpers
5. **Keep constants organized** by category
6. **Use type assertions** (`as const`) for constant objects
7. **Validate user input** before saving to settings

## Testing

When testing settings-related code:

```typescript
import { DEFAULT_SETTINGS, SettingsConstants as C } from "src/core/settings";

// Use default settings as a base
const testSettings = { ...DEFAULT_SETTINGS };

// Modify specific values
testSettings.flashcardCardOrder = C.FLASHCARD_ORDER.CARD.NEW_FIRST_RANDOM;
```

## Future Improvements

Potential enhancements to consider:

1. **Settings validation schema** - Use Zod or similar for runtime validation
2. **Settings presets** - Predefined configurations for different use cases
3. **Settings export/import** - Allow users to share configurations
4. **Settings versioning** - Track settings schema version for better migration
5. **Settings documentation generator** - Auto-generate docs from constants
