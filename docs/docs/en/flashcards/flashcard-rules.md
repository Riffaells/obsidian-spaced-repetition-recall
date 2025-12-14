# Flashcard Rules

Flow introduces a powerful and flexible **Flashcard Rules** system that allows you to define exactly how your flashcards are created. Instead of global settings that apply to everything, you can create specific rules that target notes based on tags.

## Overview

A Flashcard Rule consists of:

1.  **Rule Type**: The kind of flashcard to create (Inline, Header, Multiline, or Cloze).
2.  **Tag Pattern**: A regex pattern to match note tags (e.g., `#flashcards`, `#flashcards/science`).
3.  **Configuration**: Specific settings for that rule type (e.g., separators, heading levels).

You can have multiple rules active at the same time. For example, you could have one rule for `#flashcards` that uses `::` separators, and another for `#coding` that uses `==>` separators.

## Managing Rules

Go to **Settings → Spaced Repetition → Flashcard Rules**.

-   **Add Rule**: Click the "Add Rule" button to create a new rule.
-   **Edit Rule**: Click the pencil icon next to an existing rule.
-   **Delete Rule**: Click the trash icon to remove a rule.
-   **Enable/Disable**: Toggle the switch to turn a rule on or off without deleting it.
-   **Priority**: Rules are applied in order of priority. You can change the priority in the rule settings.

## Rule Types

### 1. Inline Rules

Inline rules create flashcards from single lines of text using a separator.

**Configuration:**

-   **Separator**: The characters that separate the question from the answer (e.g., `::`).
-   **Reversed Separator**: The characters for bidirectional cards (e.g., `::: `).
-   **Start of Line Only**: If enabled, the question must start at the beginning of the line.
-   **Cloze Settings**: Enable cloze deletions for this rule (see below).

**Example:**

```markdown
Question :: Answer
```

### 2. Header Rules

Header rules use Markdown headings as questions and the content below them as answers.

**Configuration:**

-   **Heading Levels**: Select which levels (h1-h6) to use.
-   **Strict Priority**: If enabled, deeper headings take precedence over shallower ones.
-   **Scope**:
    -   **Full Section**: The answer includes all content up to the next heading of the same level.
    -   **First Paragraph**: The answer includes only the first paragraph below the heading.
-   **Include Subheaders**: If enabled, subheadings are included in the answer (Nested Mode).
-   **Strip Tags**: Remove hashtags from the heading text.

**Example:**

```markdown
## What is the capital of France?

Paris
```

### 3. Multiline Rules

Multiline rules allow for questions and answers that span multiple lines.

**Configuration:**

-   **Question Line Pattern**: A regex pattern to identify the line that starts a question (e.g., `^Q: (.*)`).
-   **Stop Condition**: Determines where the answer ends.
    -   **Blank Line**: Ends at the next empty line.
    -   **Separator**: Ends at a specific separator line (e.g., `---`).
    -   **Next Question**: Ends when the next question starts.
    -   **Custom Pattern**: Ends when a line matches a custom regex.

**Example:**

```markdown
Q: Describe the process of photosynthesis.
?
Photosynthesis is the process used by plants...
(multiple lines of text)
```

### 4. Cloze Rules

Cloze rules allow you to create "fill-in-the-blank" cards.

**Configuration:**

-   **Patterns**: Define the patterns used to identify cloze deletions.
    -   Default: `==[123;;]answer[;;hint]==` (matches `{{c1::answer::hint}}` style).

**Example:**

```markdown
The {{c1::mitochondria}} is the powerhouse of the cell.
```

## Tag Matching

Rules are applied to notes based on their tags.

-   **Exact Tag**: Matches a specific tag (e.g., `#flashcards`).
-   **Regex Pattern**: Advanced matching using regular expressions.
    -   Example: `^#flashcards/.*` matches `#flashcards/science`, `#flashcards/math`, etc.

## Default Rules

Flow comes with default rules for standard usage:

-   **Inline**: Matches `#flashcards`, uses `::`.
-   **Header**: Matches `#flashcards/h[1-6]`, uses corresponding levels.
-   **Multiline**: Matches `#flashcards`, uses `?` separator.
-   **Cloze**: Matches `#flashcards`, enables standard cloze patterns.

You can modify or delete these defaults to suit your workflow.
