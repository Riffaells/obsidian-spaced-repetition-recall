# Parser Module

This module contains all parsers for extracting flashcards from markdown notes.

## Structure

```
src/parser/                    # ✅ Main parser module
    ├── index.ts               # Main entry point, re-exports all parsers
    ├── parse.ts               # Main parse function (combines all parsers)
    ├── types.ts               # Shared types (ParsedQuestionInfo, ParserOptions)
    ├── utils.ts               # Shared utilities
    ├── README.md              # This file
    │
    ├── NoteParser.ts          # High-level note parser
    ├── NoteQuestionParser.ts  # Question extraction from notes
    │
    ├── inline/                # Inline card parser (::)
    │   └── InlineCardParser.ts
    │
    ├── multiline/             # Multiline card parser (?)
    │   └── MultilineCardParser.ts
    │
    ├── cloze/                 # Cloze deletion parser
    │   └── ClozeCardParser.ts
    │
    └── header-based/          # Header-based card parser
        ├── HeaderBasedCardParser.ts
        ├── HeadingExtractor.ts
        ├── HeadingMatcher.ts
        ├── ContentBoundaryDetector.ts
        ├── config.ts
        ├── types.ts
        └── ...
```

## Parser Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        NoteParser                            │
│  (High-level orchestrator for entire note parsing)          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   NoteQuestionParser                         │
│  (Extracts questions and manages topic paths)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌──────────────────┐          ┌──────────────────────┐
│ HeaderBasedCard  │          │   parse() function   │
│     Parser       │          │  (Traditional cards) │
└──────────────────┘          └──────────┬───────────┘
                                         │
                         ┌───────────────┼───────────────┐
                         │               │               │
                         ▼               ▼               ▼
                  ┌──────────┐   ┌──────────┐   ┌──────────┐
                  │  Inline  │   │Multiline │   │  Cloze   │
                  │  Parser  │   │  Parser  │   │  Parser  │
                  └──────────┘   └──────────┘   └──────────┘
```

## Parser Types

### 1. NoteParser
High-level parser that orchestrates the entire note parsing process.

**Usage:**
```typescript
import { NoteParser } from "src/parser";

const parser = new NoteParser(settings);
const note = await parser.parse(noteFile, textDirection, folderTopicPath);
```

### 2. NoteQuestionParser
Extracts questions/flashcards from note content and manages topic paths.

**Usage:**
```typescript
import { NoteQuestionParser } from "src/parser";

const parser = new NoteQuestionParser(settings);
const questions = await parser.createQuestionList(noteFile, textDirection, folderTopicPath, true);
```

### 3. Inline Card Parser
Parses inline flashcards using `::` separator.

**Format:**
```markdown
Question::Answer
Question:::Reversed Answer
```

### 4. Multiline Card Parser
Parses multiline flashcards using `?` separator.

**Format:**
```markdown
Question
?
Answer
```

### 5. Cloze Card Parser
Parses cloze deletion cards.

**Format:**
```markdown
This is a ==cloze deletion==
This is **another cloze**
This is {{yet another}}
```

### 6. Header-Based Card Parser
Parses flashcards from markdown headings.

**Format:**
```markdown
#flashcards/h2

## Question?
Answer content here

## Another Question?
Another answer
```

## Import Paths

```typescript
// Import from src/parser/
import { NoteParser, NoteQuestionParser, parse } from "src/parser";

// Or import specific parsers
import { NoteParser } from "src/parser/NoteParser";
import { InlineCardParser } from "src/parser/inline/InlineCardParser";
```
