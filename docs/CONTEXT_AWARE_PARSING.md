# Context-Aware Flashcard Parsing

## Overview

The parser now supports context-aware extraction of flashcards from lists, callouts, and quotes. This means flashcards in these contexts are automatically cleaned of their markdown prefixes while preserving rich formatting.

## Features

### 1. Automatic Context Detection

The parser automatically detects when a flashcard is inside:
- **Lists**: Unordered (`-`, `*`, `+`) and ordered (`1.`, `2.`, etc.)
- **Callouts**: Obsidian callouts (`> [!note]`, `> [!tip]`, etc.)
- **Quotes**: Block quotes (`>`, `>>`, etc.)
- **Nested Lists**: Lists with indentation (2 or 4 spaces)

### 2. Automatic Prefix Cleaning

When a flashcard is detected in a context, the parser automatically removes the context prefix:

**Before (what you write):**
```markdown
- Question in list::Answer in list
> Question in callout::Answer in callout
  - Nested question::Nested answer
```

**After (what you see in review):**
- Front: "Question in list" | Back: "Answer in list"
- Front: "Question in callout" | Back: "Answer in callout"
- Front: "Nested question" | Back: "Nested answer"

### 3. Rich Markdown Preservation

All rich markdown formatting is preserved during cleaning:

```markdown
- **Bold question**::*Italic answer*
- ==Highlighted term==::Definition with `code`
> **Important**::This is ==very== important
```

The bold, italic, highlights, and inline code are all preserved in the flashcards.

### 4. Alternative Separators (Optional)

You can configure alternative separators that work ONLY in context-aware lines (lists and callouts). This is useful for more natural-looking flashcards.

**Configuration:**

In your flashcard rule settings, add `contextAwareSeparators`:

```json
{
  "id": "inline-with-alternatives",
  "type": "inline",
  "config": {
    "separator": "::",
    "contextAwareSeparators": [" - ", " | ", " ? "]
  }
}
```

**Usage:**

```markdown
#flashcards

## Normal lines (only :: works)
Question::Answer

## Lists (:: and alternatives work)
- What is this ? This is an answer
- Term | Definition
- Front - Back
- Traditional::Still works

## Callouts (:: and alternatives work)
> [!note]
> Question | Answer
```

**Important:** Alternative separators ONLY work in lists and callouts, NOT in normal lines. This prevents accidental card creation from regular text.

## Examples

### Basic List Flashcards

```markdown
#flashcards

## Capitals
- Kenya::Nairobi
- Canada::Ottawa
- Japan::Tokyo
```

### Nested Lists

```markdown
#flashcards

## Programming Concepts
- Data Structures
  - Array::Contiguous memory allocation
  - Linked List::Nodes with pointers
  - Hash Table::Key-value pairs with hashing
```

### Callouts

```markdown
#flashcards

> [!tip] Quick Facts
> Speed of light::299,792,458 m/s
> Planck's constant::6.626 × 10⁻³⁴ J⋅s
```

### With Alternative Separators

```markdown
#flashcards

## Natural Questions (configured with " ? " separator)
- What is the capital of France ? Paris
- Who wrote Hamlet ? William Shakespeare
- When did WWII end ? 1945

## Definitions (configured with " | " separator)
- Algorithm | Step-by-step procedure for solving a problem
- Recursion | Function that calls itself
- Polymorphism | Ability to take multiple forms
```

### Mixed Contexts

```markdown
#flashcards

Normal::Card

- List::Card
  - Nested::Card

> Callout::Card

> [!warning]
> - List in callout::Works too
```

## Technical Details

### Context Detection

The `ContextCleaner` module detects context using regex patterns:
- Lists: `/^(\s*)([-*+]|\d+\.)\s+/`
- Callouts/Quotes: `/^(\s*)(>+)\s*/`

### Indentation Levels

For nested lists, indentation is calculated as:
- 2 spaces = 1 indent level
- 4 spaces = 2 indent levels
- etc.

### Separator Priority

When multiple separators are configured, they are tried in this order:
1. Reverse separator (if configured, e.g., `:::`)
2. Main separator (e.g., `::`)
3. Context-aware separators (only in lists/callouts)

The first matching separator is used.

## Migration Guide

### From Old Behavior

If you have existing flashcards in lists that include the list marker in the text:

**Old (before context-aware parsing):**
```markdown
- - Question::Answer
```
This would create a card with "- Question" as the front.

**New (with context-aware parsing):**
```markdown
- Question::Answer
```
This now creates a card with "Question" as the front (list marker removed).

### Compatibility

Context-aware parsing is **backward compatible**. Existing flashcards continue to work:
- Normal flashcards (not in lists/callouts) work exactly as before
- The main separator (`::`) still works everywhere
- Alternative separators are opt-in via configuration

## Best Practices

1. **Use lists for related flashcards**: Group similar flashcards under a heading with a list
2. **Use callouts for important facts**: Highlight critical information with callouts
3. **Configure alternative separators for natural language**: Use `?` for questions, `|` for definitions
4. **Preserve rich markdown**: Use bold, italic, highlights to emphasize key parts
5. **Nest lists for hierarchical content**: Use indentation to show relationships

## Troubleshooting

### Flashcard not detected in list

Make sure:
- The list marker is followed by a space: `- ` not `-`
- The separator is present: `- Q::A` or `- Q | A` (if configured)
- The line is not inside a code block

### Alternative separator not working

Check:
- `contextAwareSeparators` is configured in your flashcard rule
- The line is actually a list or callout (not a normal line)
- The separator has spaces if needed: `" - "` not `"-"`

### Rich markdown broken

If markdown formatting is broken:
- Check that you're using standard markdown syntax
- Ensure the separator doesn't conflict with markdown (e.g., `**` as separator)
- Verify the flashcard is being extracted correctly in the review modal
