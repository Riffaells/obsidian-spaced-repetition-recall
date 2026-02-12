# Architecture Documentation

## Overview

This document describes the internal architecture of the Obsidian Spaced Repetition Flow plugin, focusing on the data
storage layer refactoring that implements a clean, layered architecture with proper separation of concerns.

## Contributors

-   **Stephen Mwangi** - Original author and maintainer
-   **Riffaells** - Data storage layer refactoring and architecture improvements (2024-2025)

## Architecture Principles

The plugin follows these core architectural principles:

1. **Separation of Concerns** - Clear boundaries between data access, business logic, and storage
2. **Dependency Injection** - Services receive dependencies through constructors for better testability
3. **Type-Safe Error Handling** - Result types instead of exceptions for predictable error handling
4. **Event-Driven Communication** - Decoupled components communicate through an event bus
5. **Performance Optimization** - In-memory caching and indexing for fast queries

## Layered Architecture

The data storage system is organized into three distinct layers:

```
┌─────────────────────────────────────────────────────┐
│              Application Layer                       │
│         (Plugin, Commands, UI)                       │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Service Layer                           │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │ ItemService      │  │ FileTrackService │        │
│  │ - reviewItem()   │  │ - trackFile()    │        │
│  │ - getNextItem()  │  │ - untrackFile()  │        │
│  └──────────────────┘  └──────────────────┘        │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│             Repository Layer                         │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │ ItemRepository   │  │ FileRepository   │        │
│  │ - findById()     │  │ - findByPath()   │        │
│  │ - save()         │  │ - save()         │        │
│  │ - findDue()      │  │ - list()         │        │
│  └──────────────────┘  └──────────────────┘        │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Storage Layer                           │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │ JsonStorage      │  │ BackupManager    │        │
│  │ - read()         │  │ - createBackup() │        │
│  │ - write()        │  │ - restore()      │        │
│  └──────────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────────┘
```

## Settings Architecture

The plugin uses a modular settings system with clear separation of concerns:

```
src/core/settings/
├── index.ts                  # Main export file
├── SRSettings.ts            # Settings interface definition
├── DefaultSettings.ts       # Default values (uses constants)
├── SettingsConstants.ts     # All hardcoded values as constants
├── SettingsCategories.ts    # Type definitions for settings groups
├── SettingsHelpers.ts       # Helper functions for validation/transformation
├── SettingsMigration.ts     # Migration logic for settings updates
└── README.md                # Documentation for settings module
```

### Settings Principles

1. **No Hardcoded Values** - All defaults defined as typed constants
2. **Type Safety** - Full TypeScript support with const assertions
3. **Categorization** - Settings grouped by functionality
4. **Validation** - Helper functions ensure data integrity
5. **Backward Compatibility** - Migration system for schema changes

### Settings Categories

Settings are organized into logical groups:

- **FlashcardSettings** - Flashcard behavior, separators, cloze patterns
- **NoteReviewSettings** - Note review configuration, tags, queue mixing
- **UIPreferences** - User interface options, sidebar, display settings
- **AlgorithmSettings** - Spaced repetition algorithm parameters
- **StorageSettings** - Data storage location and format
- **TrackingSettings** - File tracking behavior
- **DebugSettings** - Logging and debug options
- **SettingsMetadata** - Plugin version and metadata

### Settings Constants

All hardcoded values are centralized in `SettingsConstants.ts`:

```typescript
// Example: Flashcard separators
export const FLASHCARD_SEPARATORS = {
    SINGLE_LINE: "::",
    SINGLE_LINE_REVERSED: ":::",
    MULTILINE: "?",
    MULTILINE_REVERSED: "??",
} as const;

// Example: Default tags
export const DEFAULT_TAGS = {
    FLASHCARDS: "#flashcards",
    REVIEW: "#review",
    EDIT_LATER: "#edit-later",
} as const;
```

**Benefits**:
- Single source of truth for all default values
- Type-safe with autocomplete support
- Easy to find and modify values
- Self-documenting code

### Settings Helpers

Helper functions provide common operations:

```typescript
// Validation
validatePercentage(value: number): number
validateHeaderLevels(levels: number[]): boolean

// Getters
getResponseButtonText(settings, algorithm, index): string
shouldReviewTag(settings, tag): boolean

// Transformers
secondsToMilliseconds(seconds: number): number
getFlashcardDimensions(isMobile: boolean): { height, width }

// Comparison
hasAlgorithmSettingsChanged(oldSettings, newSettings): boolean
```

### Settings Usage

```typescript
// Import settings module
import { 
    SRSettings, 
    DEFAULT_SETTINGS, 
    SettingsConstants as C,
    validatePercentage 
} from "src/core/settings";

// Use constants instead of hardcoded values
const separator = C.FLASHCARD_SEPARATORS.SINGLE_LINE;
const tag = C.DEFAULT_TAGS.FLASHCARDS;

// Validate user input
const position = validatePercentage(userInput);
```

For detailed information, see `src/core/settings/README.md`.

### Storage Layer

**Responsibility**: File I/O, data validation, schema migration, and backup management

**Key Components**:

-   **IStorage<T>**: Generic interface for reading and writing typed data
-   **JsonStorage**: JSON-based storage implementation with validation and migration
-   **IValidator<T>**: Interface for data validation and auto-fixing
-   **SrsDataValidator**: Validates SrsData structure and fixes common corruption issues
-   **IMigrator<T>**: Interface for schema version upgrades
-   **SrsDataMigrator**: Handles sequential schema migrations
-   **BackupManager**: Creates and manages timestamped backups

**Features**:

-   Automatic data validation on load
-   Auto-fix for common data corruption issues
-   Sequential schema migrations
-   Automatic backups before every save
-   Corrupted data preservation for debugging

### Repository Layer

**Responsibility**: CRUD operations with caching and indexing for fast queries

**Key Components**:

-   **IItemRepository**: Interface for RepetitionItem CRUD operations
-   **ItemRepository**: Implementation with in-memory caching and indexing
-   **IFileRepository**: Interface for TrackedFile CRUD operations
-   **FileRepository**: Implementation with path and index lookups

**Features**:

-   In-memory caching for O(1) lookups
-   Multiple indexes for fast queries:
    -   Items by ID
    -   Items by file index
    -   Due items
    -   New items
-   Event emission on data changes
-   Batch operations support

### Service Layer

**Responsibility**: Business logic for item reviews, file tracking, and queue management

**Key Components**:

-   **ItemService**: Handles item review logic and queue management

    -   `reviewItem()`: Apply spaced repetition algorithm and save
    -   `getNextDueItem()`: Get next item to review (with optional deck filtering)
    -   `getItemById()`: Retrieve item by ID
    -   `getItemsByFile()`: Get all items for a file

-   **FileTrackService**: Manages file tracking lifecycle
    -   `trackFile()`: Add file to spaced repetition system
    -   `untrackFile()`: Remove file and all associated items
    -   `generateItemId()`: Generate unique item IDs

**Features**:

-   Type-safe error handling with Result types
-   Event emission for state changes
-   Algorithm integration for review scheduling
-   Deck-based filtering

## Infrastructure Components

### Result Type

Type-safe error handling without exceptions:

```typescript
type Result<T, E> = Ok<T> | Err<E>;

// Usage
const result = await itemService.reviewItem(itemId, response);
if (result.isErr) {
    // Handle error
    console.error(result.error);
} else {
    // Use value
    const reviewResult = result.value;
}
```

**Benefits**:

-   Explicit error handling
-   Type-safe error types
-   No unexpected exceptions
-   Composable error handling

### EventBus

Publish-subscribe mechanism for decoupled communication:

```typescript
// Subscribe to events
eventBus.on("item:updated", (item) => {
    console.log("Item updated:", item.ID);
});

// Emit events
eventBus.emit("item:reviewed", { item, result });
```

**Events**:

-   `item:updated`: Emitted when an item is saved
-   `item:deleted`: Emitted when an item is deleted
-   `item:reviewed`: Emitted when an item is reviewed
-   `file:updated`: Emitted when a tracked file is saved
-   `file:deleted`: Emitted when a tracked file is deleted

### ServiceContainer

Dependency injection container for managing service lifecycles:

```typescript
// Register services
container.register(
    "itemService",
    () =>
        new ItemService(
            container.get("itemRepository"),
            container.get("fileRepository"),
            algorithm,
            container.get("eventBus"),
        ),
);

// Retrieve services
const itemService = container.get<ItemService>("itemService");
```

**Benefits**:

-   Centralized service management
-   Singleton pattern support
-   Dependency resolution
-   Improved testability

## Data Flow

### Review Flow

1. **User initiates review** → Application Layer
2. **ItemService.reviewItem()** → Service Layer
    - Retrieves item from repository
    - Validates item state
    - Applies spaced repetition algorithm
    - Updates item statistics
3. **ItemRepository.save()** → Repository Layer
    - Updates in-memory cache
    - Updates indexes
    - Persists to storage
    - Emits `item:updated` event
4. **JsonStorage.write()** → Storage Layer
    - Creates backup
    - Serializes to JSON
    - Writes to file
5. **Event handlers notified** → Application Layer
    - UI updates
    - Statistics refresh

### Track File Flow

1. **User tracks file** → Application Layer
2. **FileTrackService.trackFile()** → Service Layer
    - Validates file exists
    - Checks if already tracked
    - Creates TrackedFile entity
    - Creates RepetitionItem entity
3. **FileRepository.save() + ItemRepository.save()** → Repository Layer
    - Updates caches and indexes
    - Persists both entities
    - Emits events
4. **JsonStorage.write()** → Storage Layer
    - Creates backup
    - Saves data

## Performance Optimizations

### Indexing

The repository layer maintains multiple indexes for O(1) lookups:

```typescript
// ItemRepository indexes
private;
byId: Map<number, RepetitionItem>; // O(1) by ID
private;
byFileIndex: Map<number, Set<number>>; // O(1) by file
private;
dueItems: Set<number>; // O(1) due items
private;
newItems: Set<number>; // O(1) new items
```

**Impact**:

-   Finding due items: O(n) → O(1)
-   Finding items by file: O(n) → O(1)
-   Finding item by ID: O(n) → O(1)

### Caching

Repositories maintain in-memory caches:

-   Items cached after first load
-   Cache updated on save/delete
-   No disk access for queries

**Impact**:

-   Typical query: ~0.1ms (vs ~10ms with disk access)
-   Review session: 100x faster

### Batch Operations

Support for batch updates to reduce I/O:

```typescript
await itemRepository.saveAll([item1, item2, item3]);
// Single disk write instead of three
```

## Error Handling

### Error Types

The system defines specific error types for different scenarios:

**Storage Errors**:

-   `StorageError`: Base class for storage failures
-   `FileNotFoundError`: File not found
-   `ParseError`: JSON parsing failed
-   `WriteError`: Write operation failed
-   `ValidationError`: Data validation failed
-   `MigrationError`: Schema migration failed

**Repository Errors**:

-   `RepositoryError`: Base class for repository failures

**Service Errors**:

-   `ItemNotFoundError`: Item not found
-   `ItemNotTrackedError`: Item not tracked
-   `FileAlreadyTrackedError`: File already tracked
-   `FileNotTrackedError`: File not tracked
-   `ReviewError`: Review operation failed
-   `TrackError`: Track/untrack operation failed

### Error Handling Pattern

```typescript
const result = await service.operation();
if (result.isErr) {
    if (result.error instanceof ItemNotFoundError) {
        // Handle specific error
    } else if (result.error instanceof ItemNotTrackedError) {
        // Handle different error
    } else {
        // Handle generic error
    }
    return;
}

// Success path
const value = result.value;
```

## Data Validation and Migration

### Validation

Data is validated on every load:

1. **Required fields check**: Ensures `items` and `trackedFiles` arrays exist
2. **Timestamp validation**: Checks timestamps aren't too far in future (>10 years)
3. **Reference validation**: Validates `fileIndex` references exist
4. **FSRS data validation**: Validates FSRS-specific date fields

**Auto-fix**:

-   Invalid timestamps → Reset to current time
-   Invalid file references → Mark as untracked (-1)
-   Missing required fields → Add with defaults

### Migration

Schema migrations are applied automatically:

```typescript
// Version 0 → 1: Add itemType field
items.map((item) => ({
    ...item,
    itemType: item.itemType || "note",
}));

// Version 1 → 2: Normalize deckName field
items.map((item) => ({
    ...item,
    deckName: item.deckName || item.deck || "default",
}));
```

**Process**:

1. Detect data version
2. Apply migrations sequentially
3. Create backup before changes
4. Save with current version

## Backup System

### Automatic Backups

Backups are created automatically:

-   **Before every save**: `{path}.backup.{timestamp}`
-   **On validation failure**: `{path}.corrupted.{timestamp}`
-   **Rotation**: Keeps last 5 backups

### Backup Format

```
data.json                    # Current data
data.json.backup.1735123456  # Backup from timestamp
data.json.backup.1735123789  # Newer backup
data.json.corrupted.1735124000  # Corrupted data backup
```

### Restoration

```typescript
const backupManager = container.get<BackupManager>("backupManager");
await backupManager.restore(dataPath, backupPath);
```

## Testing Strategy

### Test Types

1. **Unit Tests**: Test individual components in isolation
2. **Property-Based Tests**: Validate universal properties across many inputs
3. **Integration Tests**: Test component interactions
4. **End-to-End Tests**: Test complete workflows

### Property-Based Testing

The system uses property-based testing to validate correctness properties:

```typescript
// Property: Review updates item state
for (let i = 0; i < 100; i++) {
    const item = generateRandomItem();
    const response = generateRandomResponse();

    const result = await itemService.reviewItem(item.ID, response);

    expect(result.isOk).toBe(true);
    expect(item.nextReview).toBeGreaterThan(Date.now());
}
```

**Properties Tested**:

-   Storage operations return Result types
-   File existence checks are accurate
-   JSON parsing handles all invalid input
-   Data validation runs on load
-   Invalid data is auto-corrected
-   Schema migrations preserve data
-   Backups are created before saves
-   Repository caching works correctly
-   Review operations update state
-   Track/untrack operations maintain consistency

### Test Coverage

-   **330+ tests** covering all layers
-   **100+ property-based tests** validating correctness
-   **Integration tests** for complete workflows
-   **Backward compatibility tests** for old data formats

## Backward Compatibility

### Old DataStore Format

The new system reads data from the old `DataStore` implementation:

-   Detects version 0 data (no version field)
-   Applies migrations automatically
-   Preserves all existing data
-   Creates backups before changes

### DataStoreAdapter

A compatibility adapter maintains the old API:

```typescript
// Old API still works
const dataStore = DataStoreAdapter.getInstance();
await dataStore.load();
const item = dataStore.getItemById(itemId);
```

**Purpose**:

-   Gradual migration path
-   Backward compatibility during transition
-   Minimal code changes required

## Future Enhancements

### Planned Improvements

1. **Incremental Persistence**: Save only modified items instead of full data
2. **Compression**: Compress backup files to save space
3. **Cloud Sync**: Support for cloud-based data synchronization
4. **Multi-vault**: Support for multiple vault instances
5. **Performance Monitoring**: Built-in performance metrics and profiling

### Extension Points

The architecture is designed for extensibility:

-   **IStorage**: Add new storage backends (SQLite, IndexedDB)
-   **IValidator**: Add custom validation rules
-   **IMigrator**: Add new schema migrations
-   **EventBus**: Subscribe to events for custom behavior
-   **ServiceContainer**: Register custom services

## Development Guidelines

### Adding New Features

1. **Identify the layer**: Determine which layer the feature belongs to
2. **Define interfaces**: Create interfaces before implementations
3. **Write tests first**: Use TDD approach with property-based tests
4. **Implement incrementally**: Build and test one component at a time
5. **Document thoroughly**: Add JSDoc comments and update architecture docs

### Code Organization

```
src/
├── core/
│   ├── infrastructure/     # Result types, EventBus, ServiceContainer
│   ├── storage/           # Storage layer (interfaces + implementations)
│   └── services/          # Service layer (business logic)
├── dataStore/             # Legacy DataStore and compatibility adapter
├── algorithms/            # Spaced repetition algorithms
└── ...

tests/
├── unit/
│   ├── infrastructure/    # Infrastructure tests
│   ├── storage/          # Storage layer tests
│   └── service/          # Service layer tests
└── integration/          # End-to-end tests
```

### Best Practices

1. **Use Result types**: Never throw exceptions in business logic
2. **Emit events**: Notify other components of state changes
3. **Write property tests**: Validate universal properties
4. **Document errors**: Explain when each error type is thrown
5. **Test edge cases**: Include tests for error conditions
6. **Keep layers separate**: Don't bypass layers
7. **Use dependency injection**: Pass dependencies through constructors
