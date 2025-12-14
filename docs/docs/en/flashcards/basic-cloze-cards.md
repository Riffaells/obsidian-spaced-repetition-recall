# Basic Cloze Cards

With [Single & Multiline Cards](../flashcards/qanda-cards.md) the text of both the front and back of each card is
specified.

With `cloze` cards a single text is specified, together with an identification of which parts of the text should be
obscured.

The front of the card is displayed as the text with (one or more) `cloze deletions` obscured.

## Cloze Deletions

A part of the card text is identified as a cloze deletion by surrounding it with the `cloze delimiter`.

### Single Cloze Deletion

By default, the cloze delimiter is `==`, and a simple cloze card would be:

```
The first female prime minister of Australia was ==Julia Gillard==
```

!!! note "Displayed when reviewed"

<div class="grid" markdown>

    !!! tip "Initial View"

        The first female prime minister of Australia was [...]

    !!! tip "After `Show Answer` Clicked"

        The first female prime minister of Australia was Julia Gillard

    </div>

### Multiple Cloze Deletions

If the card text identifies multiple parts as cloze deletions, then multiple cards will be shown for review, each one
occluding one deletion, while leaving the other deletions visible.

For instance, the following note:

```
The first female ==prime minister== of Australia was ==Julia Gillard==
```

!!! note ""

<div class="grid" markdown>

    !!! tip "Card 1 Initial View"

        The first female [...] of Australia was Julia Gillard

    !!! tip "Card 2 Initial View"

        The first female prime minister of Australia was [...]

    </div>

!!! tip "After `Show Answer` Clicked (same for both cards)"

    The first female prime minister of Australia was Julia Gillard

These two cards are considered sibling cards. See [sibling cards](flashcards-overview.md#sibling-cards) regarding the
[Bury sibling cards until the next day](../user-options.md#flashcard-review) scheduling option.

### Flow Enhancement: Multiple Cloze Deletions in Single Cards

!!! info "Flow Feature"

    Flow extends multiple cloze deletion support beyond the standard behavior described above.

**Standard Behavior (as described above):**

-   Multiple cloze deletions create separate cards
-   Each card occludes one deletion while showing others
-   Cards are treated as siblings

**Flow's Enhanced Multiple Cloze Support:**

Flow also supports **multiple cloze deletions within a single card** using Anki-style syntax:

```markdown
The {{c1::mitochondria}} is the {{c2::powerhouse}} of the {{c3::cell}}.
```

**How it works:**

-   Creates **one card** with multiple cloze deletions reviewed together
-   Maximum of **4 clozes per card**
-   If more than 4 clozes are used, they are automatically split into groups of 3

**Key Differences from Original Plugin:**

| Aspect                | Original Plugin                          | Flow                                                                     |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| Multiple clozes       | Creates separate cards for each cloze    | Can create single card with multiple clozes                              |
| Anki-style syntax     | Not supported                            | Fully supported with `{{c1::text}}` format                               |
| Sibling card behavior | Affected by "bury sibling cards" setting | Multiple clozes in one card are **not affected** by "bury sibling cards" |
| Maximum clozes        | No specific limit                        | 4 clozes per card (auto-splits if more)                                  |

**Interaction with Sibling Card Settings:**

When using Flow's multiple cloze deletions in a single card:

-   The card is treated as **one unit**, not as sibling cards
-   The "Bury sibling cards until the next day" setting does **not apply**
-   All clozes in the card are reviewed together in the same session

This is different from the standard multiple cloze behavior (using `==text==` multiple times), where each cloze creates a separate card that **is** affected by the sibling card setting.

**Example Comparison:**

```markdown
<!-- Standard: Creates 2 separate sibling cards -->

The first female ==prime minister== of Australia was ==Julia Gillard==

<!-- Flow enhanced: Creates 1 card with 2 clozes -->

The first female {{c1::prime minister}} of Australia was {{c2::Julia Gillard}}
```

**When to use each approach:**

-   **Standard multiple clozes** (`==text==`): When you want to review each piece of information separately across different sessions
-   **Flow multiple clozes** (`{{c1::text}}`): When you want to review related information together in a single card

!!! tip "Recommendation"

    Use Flow's multiple cloze deletions when the information is closely related and should be learned together. Use standard multiple cloze deletions when each piece of information should be reviewed independently.

## Cloze Delimiter

The cloze delimiter can be modified in [settings](../user-options.md#flashcard-review), e.g. to `**`, or curly braces
`{{text in curly braces}}`.

<!--
## Cloze Hints

Hints can be included for any of the cloze deletions, using the `^[text of hint]` syntax. For example:

```
Kaleida, funded to the tune of ==$40 million==^[USD]
by Apple Computer and IBM in ==1991==^[year]
```

!!! note "Front of card 1"
    Kaleida, funded to the tune of [USD] by Apple Computer and IBM in 1991
!!! note "Front of card 2"
    Kaleida, funded to the tune of $40 million by Apple Computer and IBM in [year]


## Deletion Groups

In the above examples, each card shown for review has one cloze deletion shown and all the others obscured.

`Deletion groups` allow this to be tailored by specifying a `group number` for each cloze deletion.

For example:
```
This is ==in group 1==[^1], this ==in group 2==[^2]
and this also ==in group 1==[^1]
```

!!! note "Front of card 1"
    This is  [...], this in group 2 and this also [...]
!!! note "Front of card 2"
    This is in group 1, this  [...] and this also in group 1
!!! note "Back of both cards"
    This is in group 1, this in group 2 and this also in group 1

!!! warning
    When using deletion groups, every cloze deletion must include the group number
 -->

## Anki Style Cloze Deletions

!!! success "Flow Feature: Anki Style Support"

    Flow **fully supports** Anki-style cloze deletions with the `{{c1::text}}` syntax!

**Syntax:**

```markdown
{{c1::This text}} would {{c2::generate}} a card with {{c1::2 cloze deletions}}
```

**Behavior:**

-   Creates **one card** with multiple cloze deletions
-   Clozes with the same number (e.g., `{{c1::...}}`) are grouped together
-   Maximum 4 clozes per card
-   More than 4 clozes: automatically split into groups of 3

**Example:**

```markdown
{{c1::Mitochondria}} are the {{c2::powerhouses}} of the {{c3::cell}}, producing {{c2::ATP}}.
```

This creates one card where:

-   `c1` (Mitochondria) is one cloze deletion
-   `c2` (powerhouses and ATP) are grouped as one cloze deletion
-   `c3` (cell) is one cloze deletion

**Note:** This feature was not available in the original Obsidian Spaced Repetition plugin but is fully implemented in Flow. See the [Flow Enhancement section](#flow-enhancement-multiple-cloze-deletions-in-single-cards) above for more details on how this differs from standard multiple cloze behavior.
