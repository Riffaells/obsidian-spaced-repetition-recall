# Learning Algorithms

A learning algorithm is a formula that determines when a note or flashcard should next be reviewed.

| Algorithm                                           | Status      |
|-----------------------------------------------------|-------------|
| [SM-2-OSR](#sm-2-osr)                               | Implemented |
| [FSRS](#fsrs)                                       | Implemented |
| [User Defined Intervals](#user-specified-intervals) | Planned     |

## SM-2-OSR

- The `SM-2-OSR` algorithm is a variant
  of [Anki's algorithm](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html) which is based on
  the [SM-2 algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2).
- It supports ternary reviews i.e. a concept is either hard, good, or easy at the time of review.
- initial ease is weighted (using max_link_factor) depending on the average ease of linked notes, note importance, and
  the base ease.
- Anki also applies a small amount of random “fuzz” to prevent cards that were introduced at the same time and given the
  same ratings from sticking together and always coming up for review on the same day."
- The algorithm is essentially the same for both notes and flashcards - apart from the PageRanks

### Algorithm Details

!!! warning

    Note that this hasn't been updated in a while,
    please see the [code](https://github.com/st3v3nmw/obsidian-spaced-repetition/blob/master/src/scheduling.ts).

- `if link_count > 0: initial_ease = (1 - link_contribution) * base_ease + link_contribution * average_ease` -
  `link_contribution = max_link_factor * min(1.0, log(link_count + 0.5) / log(64))` (cater for uncertainty)
    - The importance of the different concepts/notes is determined using the PageRank algorithm (not all notes are
      created equal xD)
        - On most occasions, the most fundamental concepts/notes have higher importance
- If the user reviews a concept/note as:
    - easy, the ease increases by `20` and the interval changes to `old_interval * new_ease / 100 * 1.3` (the 1.3 is the
      easy bonus)
    - good, the ease remains unchanged and the interval changes to `old_interval * old_ease / 100`
    - hard, the ease decreases by `20` and the interval changes to `old_interval * 0.5`
        - The `0.5` can be modified in settings
        - `minimum ease = 130`
    - For `8` or more days:
        - `interval += random_choice({-fuzz, 0, +fuzz})`
            - where `fuzz = ceil(0.05 * interval)`
            - [Anki docs](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html):
              > "[...] Anki also applies a small amount of random “fuzz” to prevent cards that were introduced at the
              same time and given the same ratings from sticking together and always coming up for review on the same
              day."
- The scheduling information is stored in the YAML front matter

---

## FSRS

The **Free Spaced Repetition Scheduler (FSRS)** algorithm is a modern, more accurate alternative to the SM-2 algorithm. Flow implements FSRS v4, providing superior scheduling predictions based on your actual review history.

### Overview

FSRS is a sophisticated spaced repetition algorithm that:

- Provides more accurate predictions than SM-2
- Adapts to your individual learning patterns
- Uses a memory model based on cognitive science research
- Supports parameter optimization using your review history

The algorithm is detailed at: [FSRS v4 Documentation](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-v4)

### Algorithm Selection

To use FSRS in Flow:

1. Open plugin settings
2. Navigate to the **Scheduling** section
3. Select **FSRS** from the algorithm dropdown
4. Configure FSRS parameters (see below)

!!! warning "Algorithm Switching"

    Don't switch algorithms frequently. Choose one algorithm and stick with it for consistent results. Different algorithms use different parameters and switching can disrupt your review schedule.

### FSRS Parameters

FSRS uses several parameters that control how the algorithm schedules reviews. The default parameters work well for most users, but you can optimize them for your specific learning patterns.

**Default Parameters:**

The plugin includes default FSRS parameters based on research. These parameters are documented in the [FSRS v4 specification](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-v4).

**Parameter Configuration:**

You can manually adjust FSRS parameters in the plugin settings under the **Scheduling** section. However, for best results, use the FSRS optimizer (see below) to calculate optimal parameters based on your actual review history.

### Review Log Export

Flow can export your review history for use with the FSRS optimizer. This allows you to calculate optimal parameters tailored to your learning patterns.

**To export your review log:**

1. Use the command palette (Ctrl/Cmd + P)
2. Search for and run: **"Spaced Repetition: Export review log"**
3. Select the tag(s) you want to export
4. The plugin will generate an `ob_revlog.csv` file

**File Location:**

The `ob_revlog.csv` file is saved in your vault's root directory (or the configured data location).

### FSRS Optimizer

The [FSRS Optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer) analyzes your review history and calculates optimal parameters for your learning patterns.

**Using the Optimizer:**

1. Export your review log using the command above (generates `ob_revlog.csv`)
2. Visit the [FSRS Optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer)
3. Follow the optimizer's instructions to upload your `ob_revlog.csv` file
4. The optimizer will calculate optimal parameters for you
5. Copy the optimized parameters back into Flow's settings

**Benefits of Optimization:**

- More accurate scheduling predictions
- Better retention rates
- Reduced review workload
- Personalized to your learning patterns

!!! tip "When to Optimize"

    Optimize your parameters after you have at least 1000 reviews in your history. The more review data you have, the more accurate the optimization will be.

### Comparison with SM-2-OSR

| Feature                    | SM-2-OSR                          | FSRS                                    |
|----------------------------|-----------------------------------|-----------------------------------------|
| **Accuracy**               | Good for general use              | Superior, research-backed predictions   |
| **Personalization**        | Limited (ease factor adjustments) | High (optimizable parameters)           |
| **Review Outcomes**        | 3 options (Hard, Good, Easy)      | 4 options (Again, Hard, Good, Easy)     |
| **Memory Model**           | Simple ease-based                 | Sophisticated cognitive model           |
| **Parameter Optimization** | Not available                     | Available via FSRS optimizer            |
| **Learning Curve**         | Simple, easy to understand        | More complex, but better results        |

### Algorithm Details

FSRS uses a memory model that tracks two key variables:

- **Stability (S)**: How long you can remember something
- **Difficulty (D)**: How hard the material is for you to learn

The algorithm updates these variables after each review based on your response (Again, Hard, Good, Easy) and calculates the optimal next review interval.

For detailed mathematical formulas and implementation details, see the [FSRS v4 Algorithm Documentation](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-v4).

---

## User Specified Intervals

This is the simplest "algorithm" possible. There are fixed intervals configured by the user for each of the possible
review outcomes.

For example, `hard` might be configured for an interval of 1 day.

Implementation of this technique has not yet occurred. For progress see:
[ [FEAT] user defined "Easy, Good, Hard" values instead of or in addition to the algorithm defined one. #741 ](https://github.com/st3v3nmw/obsidian-spaced-repetition/issues/741)
