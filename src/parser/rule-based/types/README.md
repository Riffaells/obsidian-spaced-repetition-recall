# Rule-Based Parser Types

This directory contains all type definitions for the rule-based flashcard parser architecture.

## Structure

### Core Types

-   **`primitives.ts`** - Basic primitive types (`RuleId`, `TagVarValue`)
-   **`flashcard.ts`** - `ParsedFlashcard` interface (parser output)

### Configuration Types

-   **`cloze.ts`** - Cloze deletion configuration (`ClozePattern`, `ClozeSettings`)
-   **`selection-strategies.ts`** - Header selection strategies (`LimitCount`, `LimitRange`, `LimitRandom`)
-   **`configs.ts`** - Extraction configurations (`HeaderConfig`, `InlineConfig`, `MultilineConfig`)

### Rule Types

-   **`rules.ts`** - Rule definitions (`RuleMeta`, `HeaderRule`, `InlineRule`, `MultilineRule`, `FlashcardRule`)

### Internal Types

-   **`document-structure.ts`** - Internal parser data structures (`HeadingNode`, `DocumentStructure`, `Range`, `ExtractionContext`)

### Exports

-   **`index.ts`** - Central export point for all types

## Usage

Import types from the index file:

```typescript
import {
    FlashcardRule,
    ParsedFlashcard,
    HeaderConfig,
    DocumentStructure,
} from "src/parser/rule-based/types";
```

Or import specific modules:

```typescript
import { HeaderRule } from "src/parser/rule-based/types/rules";
import { ClozeSettings } from "src/parser/rule-based/types/cloze";
```
