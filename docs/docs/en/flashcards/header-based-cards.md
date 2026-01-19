# Header-Based Flashcards

## Overview

Header-based flashcards is a powerful format for creating flashcards using Markdown headings. This feature allows you to use headings as questions and the content below them as answers, providing a more natural and structured way to organize your study materials.

## Table of Contents

-   [Basic Usage](#basic-usage)
-   [Tag Syntax](#tag-syntax)
-   [Configuration Modes](#configuration-modes)
-   [Settings](#settings)
-   [Examples](#examples)
-   [Advanced Features](#advanced-features)
-   [Compatibility](#compatibility)
-   [Best Practices](#best-practices)
-   [Troubleshooting](#troubleshooting)

## Basic Usage

### Creating Your First Header-Based Flashcard

To create a header-based flashcard, simply:

1. Add the `#flashcard` tag to your note
2. Write a heading that ends with a question mark `?`
3. Add your answer content below the heading

```markdown
#flashcard/h2

## What is React?

React is a JavaScript library for building user interfaces.
```

This creates one flashcard where:

-   **Question**: "What is React?"
-   **Answer**: "React is a JavaScript library for building user interfaces."

### How Content Boundaries Work

The answer includes all content from the heading until:

-   The next heading of the **same or higher level**
-   The end of the document

```markdown
#flashcard/h2

## What is TypeScript?

TypeScript is a superset of JavaScript with static typing.

### Key Features

-   Static type checking
-   Better IDE support
-   Early error detection

## What is Vue?

Vue is a progressive JavaScript framework.
```

This creates **2 flashcards**:

1. "What is TypeScript?" → includes the paragraph AND the h3 section
2. "What is Vue?" → includes only the paragraph

## Tag Syntax

### Basic Tag Format

```
#flashcard/[levels]/[nesting]/[mode]
```

All parts are optional and can be combined in any order.

### Heading Levels

Specify which heading levels to use for flashcards:

| Tag                | Description                |
| ------------------ | -------------------------- |
| `#flashcard/h1`    | Only h1 headings           |
| `#flashcard/h2`    | Only h2 headings (default) |
| `#flashcard/h3`    | Only h3 headings           |
| `#flashcard/h2-h3` | Both h2 and h3 headings    |
| `#flashcard/h1-h6` | All heading levels         |

**Example:**

```markdown
#flashcard/h3

### What is a variable?

A variable is a named storage location.
```

### Nesting Modes

Control how subheadings are included in answers:

| Tag                 | Mode   | Description                       |
| ------------------- | ------ | --------------------------------- |
| `#flashcard/nested` | Nested | Include all subheadings (default) |
| `#flashcard/flat`   | Flat   | Stop at first subheading          |

**Nested Mode Example:**

```markdown
#flashcard/h2/nested

## What is Python?

Python is a high-level programming language.

### Advantages

-   Easy to learn
-   Large ecosystem
-   Versatile

### Use Cases

-   Web development
-   Data science
-   Automation
```

Answer includes everything: the paragraph, "Advantages" section, and "Use Cases" section.

**Flat Mode Example:**

```markdown
#flashcard/h2/flat

## What is Python?

Python is a high-level programming language.

### Advantages

(This will NOT be included)
```

Answer includes only the first paragraph.

### Recognition Modes

Control which headings become flashcards:

| Tag              | Mode     | Description                             |
| ---------------- | -------- | --------------------------------------- |
| `#flashcard/qa`  | QA Mode  | Only headings ending with `?` (default) |
| `#flashcard/all` | All Mode | All headings at specified levels        |

**QA Mode (default):**

```markdown
#flashcard/h2

## What is JavaScript?

A programming language.

## JavaScript Features

(No flashcard created - no question mark)
```

**All Mode:**

```markdown
#flashcard/h2/all

## JavaScript

A programming language.

## TypeScript

A typed superset of JavaScript.
```

Both headings become flashcards, even without `?`.

### Combining Tags

You can combine multiple configuration tags:

```markdown
#flashcard/h2/h3/flat/all

# Programming Languages

## JavaScript

Content here...

### Node.js

More content...

## Python

Content here...
```

This configuration:

-   Uses h2 AND h3 headings
-   Flat mode (stops at subheadings)
-   All mode (no `?` required)

## Configuration Modes

### Default Configuration

If you only use `#flashcard` without additional tags, the default configuration is:

-   **Heading Levels**: h2 only
-   **Nesting Mode**: nested
-   **Recognition Mode**: qa (only headings with `?`)

### Configuration Priority

When multiple tags are present, they are merged with these rules:

1. **Heading Levels**: Combined (union)
    - `#flashcard/h2` + `#flashcard/h3` = h2 and h3
2. **Nesting Mode**: Last tag wins
    - `#flashcard/nested` + `#flashcard/flat` = flat
3. **Recognition Mode**: Last tag wins
    - `#flashcard/qa` + `#flashcard/all` = all
4. **Enabled Status**: `true` takes priority
    - `#flashcard/disable` + `#flashcard/h2` = enabled

## Settings

### Accessing Settings

1. Open Obsidian Settings
2. Navigate to "Spaced Repetition" plugin
3. Find the "Header-Based Flashcards" section

### Available Settings

#### Enable Header-Based Cards

Toggle to enable or disable the entire feature globally.

#### Default Configuration

Set the default behavior for notes with just `#flashcard` tag:

-   **Default Heading Levels**: Which levels to use (h1-h6)
-   **Default Nesting Mode**: nested or flat
-   **Default Recognition Mode**: qa or all

#### Show Context in Cards

When enabled, displays the full heading hierarchy above the question during review.

Example with context enabled:

```
JavaScript > React > Hooks
━━━━━━━━━━━━━━━━━━━━━━━━
What are React Hooks?
```

Example with context disabled:

```
What are React Hooks?
```

### Custom Tags

Create your own tags with specific configurations:

1. Click "Add Custom Tag" in settings
2. Enter tag name (e.g., `#my-questions`)
3. Configure:
    - Heading levels (checkboxes for h1-h6)
    - Nesting mode (radio buttons)
    - Recognition mode (radio buttons)
    - Enabled toggle
4. Save

**Example Custom Tags:**

| Custom Tag     | Configuration     | Use Case             |
| -------------- | ----------------- | -------------------- |
| `#quick-facts` | h3, flat, all     | Short fact cards     |
| `#deep-dive`   | h2-h4, nested, qa | Detailed study cards |
| `#review`      | h2, nested, all   | Review all sections  |

## Examples

### Example 1: Simple Q&A Note

```markdown
#flashcard/h2

# JavaScript Basics

## What is a closure?

A closure is a function that has access to variables in its outer scope.

## What is hoisting?

Hoisting is JavaScript's behavior of moving declarations to the top.

## Event Loop

(No flashcard - no question mark)
```

**Result**: 2 flashcards created

### Example 2: Nested Structure

```markdown
#flashcard/h2/nested

# Web Development

## What is the DOM?

The Document Object Model is a programming interface for HTML documents.

### DOM Methods

-   getElementById()
-   querySelector()
-   createElement()

### DOM Events

-   click
-   submit
-   load

## What is AJAX?

AJAX allows web pages to update asynchronously.
```

**Result**: 2 flashcards

-   Card 1: "What is the DOM?" with all nested content
-   Card 2: "What is AJAX?" with its content

### Example 3: Flat Mode for Concise Cards

```markdown
#flashcard/h2/flat

## What is CSS?

CSS stands for Cascading Style Sheets.

### Selectors

(Not included in answer)

## What is Flexbox?

Flexbox is a CSS layout module.

### Properties

(Not included in answer)
```

**Result**: 2 flashcards with only the first paragraph each

### Example 4: Mixed Formats

Header-based flashcards work alongside existing formats:

```markdown
#flashcard/h2

## What is Vue.js?

Vue is a progressive JavaScript framework.

Inline card: Creator of Vue::Evan You

How to install Vue?
?
npm install vue

## Why use Vue?

Vue has a gentle learning curve and excellent documentation.
```

**Result**: 4 flashcards

-   2 header-based cards (h2 with `?`)
-   1 inline card (`::` format)
-   1 multiline card (`?` separator format)

### Example 5: Multiple Heading Levels

```markdown
#flashcard/h2-h3

# Programming Concepts

## What is recursion?

Recursion is when a function calls itself.

### What is base case?

The base case stops the recursion.

### What is recursive case?

The recursive case continues the recursion.

## What is iteration?

Iteration is repeating a process.
```

**Result**: 4 flashcards (1 h2 + 3 h3)

### Example 6: All Mode (No Question Marks Needed)

```markdown
#flashcard/h2/all

# Data Structures

## Arrays

Ordered collections of elements.

## Linked Lists

Nodes connected by pointers.

## Trees

Hierarchical data structures.
```

**Result**: 3 flashcards (all h2 headings become cards)

## Advanced Features

### Context Display

Header-based flashcards automatically track the heading hierarchy. When "Show Context" is enabled in settings, you'll see the full path during review:

```
Mathematics > Algebra > Linear Equations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What is the slope-intercept form?
```

This helps you understand the context of each question, especially in large notes with many topics.

### Ignoring Headings in Special Blocks

The parser automatically ignores headings inside:

**Code Blocks:**

```markdown
## What is Markdown?

Markdown is a lightweight markup language.

\`\`\`markdown

## This heading is ignored

It's inside a code block.
\`\`\`
```

**Blockquotes:**

```markdown
## What is a quote?

A quote is cited text.

> ## This heading is ignored
>
> It's inside a blockquote.
```

### Empty Answers

If a heading has no content before the next heading, a flashcard is still created with an empty answer:

```markdown
#flashcard/h2

## What needs more research?

## What is completed?

This has content.
```

The first card will have an empty answer, allowing you to fill it in later.

### Whitespace Handling

Leading and trailing whitespace in answers is automatically trimmed:

```markdown
## What is JavaScript?

JavaScript is a programming language.
```

The answer will be cleanly formatted without extra blank lines.

## Compatibility

### Works With Existing Formats

Header-based flashcards are fully compatible with:

-   **Inline cards**: `Question::Answer`
-   **Multiline cards**: Question, `?` on separate line, Answer
-   **Cloze deletions**: `{{c1::text}}`

All formats can coexist in the same note.

### Backward Compatibility

-   Existing notes without header-based tags are unaffected
-   All existing flashcard functionality remains unchanged
-   The feature is opt-in via tags or settings

### Migration

No migration is needed. Simply:

1. Enable the feature in settings (if desired)
2. Add appropriate tags to notes where you want header-based cards
3. Existing cards continue working as before

## Best Practices

### 1. Use Consistent Heading Levels

Choose a heading level for questions and stick to it within a note:

```markdown
#flashcard/h2

## Question 1?

Answer 1

## Question 2?

Answer 2
```

### 2. Leverage Nesting for Detailed Answers

Use nested mode when answers have multiple parts:

```markdown
#flashcard/h2/nested

## What are the SOLID principles?

SOLID is an acronym for five design principles.

### Single Responsibility

Each class should have one responsibility.

### Open/Closed

Open for extension, closed for modification.

(etc.)
```

### 3. Use Flat Mode for Quick Facts

Use flat mode for simple, concise flashcards:

```markdown
#flashcard/h2/flat

## Capital of France?

Paris

## Capital of Germany?

Berlin
```

### 4. Combine with Context Display

Enable context display for large notes with many topics to maintain orientation during review.

### 5. Create Custom Tags for Different Study Types

Set up custom tags for different learning scenarios:

-   `#quick-review` for rapid recall
-   `#deep-study` for comprehensive understanding
-   `#exam-prep` for test preparation

## Troubleshooting

### Cards Not Appearing

**Check:**

1. Is the feature enabled in settings?
2. Does the note have a `#flashcard` tag (or custom tag)?
3. Do headings end with `?` (in qa mode)?
4. Are you using the correct heading level?

### Too Many/Few Cards Created

**Adjust:**

-   Use `#flashcard/qa` to only create cards from headings with `?`
-   Use `#flashcard/all` to create cards from all headings
-   Specify exact heading levels: `#flashcard/h2` instead of `#flashcard/h1-h6`

### Answers Too Long/Short

**Adjust:**

-   Use `#flashcard/flat` for shorter answers (stops at subheadings)
-   Use `#flashcard/nested` for longer answers (includes subheadings)

### Context Not Showing

**Check:**

-   Is "Show Context" enabled in settings?
-   Context only appears for header-based cards, not inline/multiline cards

## FAQ

**Q: Can I use header-based cards without the `?` at the end?**  
A: Yes! Use `#flashcard/all` mode to create cards from all headings at specified levels.

**Q: Can I mix different heading levels in one note?**  
A: Yes! Use tags like `#flashcard/h2-h3` to include multiple levels.

**Q: Do header-based cards work with spaced repetition?**  
A: Yes! They use the same scheduling system as all other card types.

**Q: Can I edit header-based cards?**  
A: Yes! Edit the heading (question) or content (answer) directly in your note.

**Q: What happens if I change a heading level?**  
A: The card will be recreated with the new heading level on next scan.

**Q: Can I disable header-based cards for specific notes?**  
A: Yes! Use `#flashcard/disable` tag or simply don't add any flashcard tags.

**Q: How do I see which headings will become cards?**  
A: Headings that match your configuration (level + mode) will become cards. In qa mode, only headings with `?` are used.

## Summary

Header-based flashcards provide a natural, structured way to create study materials:

-   ✅ Use headings as questions
-   ✅ Content below becomes the answer
-   ✅ Flexible configuration via tags
-   ✅ Works with existing card formats
-   ✅ Optional context display
-   ✅ Customizable via settings

Start simple with `#flashcard/h2` and expand as needed!

---

**Need Help?** Check the [main plugin documentation](../index.md) or open an issue on [GitHub](https://github.com/Riffaells/obsidian-spaced-repetition-flow/issues).
