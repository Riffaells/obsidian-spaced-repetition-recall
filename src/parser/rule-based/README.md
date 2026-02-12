# Rule-Based Parser

The rule-based parser is a flexible, modular system for extracting flashcards from markdown documents.

## Architecture

### Core Components

- **RuleBasedParser**: Main orchestrator that coordinates all extractors
- **DocumentStructureParser**: Analyzes document structure (headings, code blocks, comments)
- **RuleMatcher**: Matches rules against note context (tags, folders, headers)
- **Extractors**: Type-specific extraction logic
  - `HeaderExtractor`: Extracts flashcards from headers
  - `InlineExtractor`: Extracts inline flashcards (e.g., `Q::A`)
  - `MultilineExtractor`: Extracts multiline flashcards
- **ClozeProcessor**: Processes cloze deletions
- **ContextCleaner**: Cleans markdown context prefixes (lists, callouts)
- **ParsedFlashcardBuilder**: Builds final flashcard objects with metadata

### Data Flow

```
Markdown Text
    ↓
DocumentStructureParser → Document Structure (headings, code blocks, etc.)
    ↓
RuleBasedParser
    ↓
RuleMatcher → Matching Rules
    ↓
Type-Specific Extractors (Header/Inline/Multiline)
    ↓
ContextCleaner → Clean Prefixes
    ↓
ClozeProcessor (if enabled) → Process Clozes
    ↓
ParsedFlashcardBuilder → Final Flashcards
```

## Features

### Context-Aware Extraction

The parser automatically detects and cleans markdown context:

- **Lists**: `- Q::A` → Front: "Q", Back: "A"
- **Callouts**: `> Q::A` → Front: "Q", Back: "A"
- **Nested Lists**: `  - Q::A` → Front: "Q", Back: "A"

Rich markdown is preserved: `- **Bold**::*Italic*` works correctly.

### Alternative Separators

Configure alternative separators for context-aware lines:

```typescript
{
  type: "inline",
  config: {
    separator: "::",
    contextAwareSeparators: [" - ", " | ", " ? "]
  }
}
```

This allows natural-looking flashcards:
- `- What is X ? Answer`
- `- Term | Definition`

### Flexible Rules

Rules can be configured with:
- Tag patterns (regex)
- Priority levels
- Type-specific configurations
- Cloze settings

## Usage

### Basic Usage

```typescript
import { RuleBasedParser, NoteContext } from "src/parser/rule-based";

const parser = new RuleBasedParser(flashcardRules);

const noteContext: NoteContext = {
  filePath: "note.md",
  fileName: "note.md",
  text: noteText,
  tags: ["#flashcards"],
  folderPath: "folder",
};

const flashcards = parser.parse(noteContext);
```

### With Context Cleaning

Context cleaning is automatic. The `InlineExtractor` uses `ContextCleaner` internally:

```typescript
import { ContextCleaner } from "src/parser/rule-based";

// Detect context
const context = ContextCleaner.detectContext("- Question::Answer");
// { type: "list", prefix: "- ", indentLevel: 0 }

// Clean line
const cleaned = ContextCleaner.cleanLine("- Question::Answer");
// "Question::Answer"
```

## Testing

The parser has comprehensive test coverage:

- `ContextCleaner.test.ts`: 26 tests for context detection and cleaning
- `InlineExtractor-context.test.ts`: 26 tests for context-aware extraction
- `HeaderExtractor.test.ts`: Header extraction tests
- `MultilineExtractor.test.ts`: Multiline extraction tests
- `ClozeProcessor.test.ts`: Cloze processing tests

Run tests:
```bash
bun test tests/unit/parser/
```

## Extension Points

### Adding New Context Types

To add a new context type (e.g., tables):

1. Add to `LineContext` enum in `ContextCleaner.ts`
2. Update `detectContext()` with detection logic
3. Update `cleanLine()` with cleaning logic
4. Add tests

### Adding New Extractors

To add a new extractor type:

1. Create new extractor class (e.g., `TableExtractor.ts`)
2. Implement extraction logic
3. Add to `RuleBasedParser.parse()` switch statement
4. Add corresponding config type in `types/configs.ts`
5. Add tests

## Performance Considerations

- Document structure is parsed once per note
- Context detection uses regex (fast)
- Extractors process line-by-line (O(n))
- Code blocks and comments are skipped efficiently

## Backward Compatibility

All changes are backward compatible:
- Existing flashcards work without modification
- Context cleaning only affects new behavior
- Alternative separators are opt-in
- Main separator (`::`) works everywhere

## See Also

- [Context-Aware Parsing Documentation](../../../docs/CONTEXT_AWARE_PARSING.md)
- [Parser Types](./types/)
- [Main Parser Index](../index.ts)
