# Obsidian Spaced Repetition - Flow

<img src="https://img.shields.io/github/downloads/martin-jw/obsidian-recall/total" /> <img src="https://img.shields.io/github/downloads/martin-jw/obsidian-recall/latest/total?style=flat-square" /> <img src="https://img.shields.io/github/manifest-json/v/martin-jw/obsidian-recall?style=flat-square" />

**Flow** is a comprehensive fork of Obsidian Spaced Repetition with 15+ major enhancements for improved user experience, modern UI, and advanced spaced repetition capabilities.

Fight the forgetting curve by reviewing flashcards & notes using spaced repetition on Obsidian.md - now with FSRS algorithm, separate data storage, float bar for note review, postpone/reschedule functions, auto-balancing, and much more.

<div class="grid" markdown>

!!! tip "Getting started"

    :material-circle-medium: View the [quick demo](index.md#quick-demo) below<br/>
    :material-circle-medium: [Plugin installation](index.md#installation)<br/>
    :material-circle-medium: General [guidelines & tips](resources.md) about spaced repetition learning.

!!! tip "What's New in Flow"

    :material-circle-medium: [Flow Features Overview](flow-features.md) - Complete guide to all Flow enhancements<br/>
    :material-circle-medium: **FSRS Algorithm** - Modern spaced repetition algorithm with parameter optimization<br/>
    :material-circle-medium: **Separate Data Storage** - Keep scheduling data in JSON files, not in your notes<br/>
    :material-circle-medium: **Float Bar** - Review notes with keyboard shortcuts and mobile gestures<br/>
    :material-circle-medium: **Postpone & Reschedule** - Flexible review scheduling and workload management<br/>
    :material-circle-medium: **Auto-balancing** - Automatic distribution of review workload<br/>
    :material-circle-medium: **Multiple Cloze Deletions** - Enhanced cloze card support<br/>
    :material-circle-medium: And 10+ more features!

!!! tip "Features"

    :material-circle-medium: [Flashcards](flashcards/flashcards-overview.md) &nbsp; &nbsp; :material-circle-medium: [Notes](notes.md) <br/>
    :material-circle-medium: [User Options](user-options.md) &nbsp; &nbsp; :material-circle-medium: [CommandManager](plugin-commands.md)
    <hr class="thin">
    :material-circle-medium: [Repetition Algorithms](algorithms.md) &nbsp; &nbsp; :material-circle-medium: [Data Storage](data-storage.md)

!!! tip "Help & Support"

    :material-circle-medium: Visit the [discussions](https://github.com/martin-jw/obsidian-recall/discussions/) section for Q&A help, feedback, and general discussion.<br/>
    :material-circle-medium: Raise an issue [here](https://github.com/martin-jw/obsidian-recall/issues/) if you have a feature request or a bug-report.

!!! tip "Contributing"
:material-circle-medium: The plugin has been translated into over [10 languages](contributing.md#translating) by the
Obsidian community 😄. To help translate this plugin to your language, check
the [translation guide here](contributing.md#translating).<br/>
:material-circle-medium: Software developers can contribute [feature enhancements and bug fixes](contributing.md#code)

!!! note "Acknowledgments"

    Flow is built upon the excellent work of the original [Obsidian Spaced Repetition plugin](https://github.com/st3v3nmw/obsidian-spaced-repetition) by st3v3nmw. We are grateful for the foundation provided by the original plugin and the Obsidian community.

</div>

---

## Quick Demo

![user-interface-overview](https://github.com/user-attachments/assets/977bab30-cc5e-4b5c-849e-3881d82b3f8e)

!!! note ""

    1. Display the [Note Review Queue](notes.md#note-review-queue) <br/>
    2. Note review queue<br/>
    3. Display the Obsidian command dialog to access the plugin [commands](plugin-commands.md)<br/>
    4. `Flashcard Review Icon` Select a flashcard [deck](flashcards/reviewing.md#deck-selection) to [review](flashcards/reviewing.md#reviewing) <br/>
    5. Identify that flashcards within this note are in the `#flashcards/science/physics` [deck](flashcards/decks.md#using-obsidian-tags)<br/>
    6. A [single line question](flashcards/qanda-cards.md#single-line-basic) (identified by the `::` separating the question and answer)<br/>
    7. The plugin stores scheduling info within this [HTML comment](data-storage.md#method-1-individual-markdown-files-in-note-storage) <br/>
    8. `Spaced Repetition Status Area` The number of notes and flashcards currently due for review. Click to [open a note for review](notes.md#selecting-a-note-for-review).

<video controls>
  <source src="https://user-images.githubusercontent.com/43380836/115256965-5d455f00-a138-11eb-988f-27ba29f328a0.mp4" type="video/mp4">
</video>

---

## Installation

### Manual Installation (Recommended)

!!! note "Flow Installation"
Flow is currently available through manual installation. Follow these steps:

    1. Download the latest release from the [Flow releases page](https://github.com/martin-jw/obsidian-recall/releases)
    2. Create an `obsidian-spaced-repetition-recall` folder under `.obsidian/plugins` in your vault
    3. Extract and add the `main.js`, `manifest.json`, and `styles.css` files to the folder
    4. Restart Obsidian
    5. Enable the plugin in Settings → Community Plugins

### Migrating from Original Spaced Repetition Plugin

!!! warning "Important: Backup Your Vault First!"

    If you're migrating from the original Spaced Repetition plugin:

    1. **BACKUP YOUR VAULT** - This is critical!
    2. Disable the original Spaced Repetition plugin
    3. Close Obsidian
    4. Copy `obsidian-spaced-repetition/data.json` to `obsidian-spaced-repetition-recall/data.json`
    5. Reopen Obsidian and enable Flow
    6. Review the [Flow Features](flow-features.md) documentation to understand new capabilities

    **Note:** If you change the Data Location setting, review information will be moved from your notes to `tracked_files.json`. This action cannot be easily undone, so backup first!

---

## Support

<a href='https://ko-fi.com/M4M44DEN6' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi3.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

<a href="https://jb.gg/OpenSourceSupport" target="_blank"><img src="https://resources.jetbrains.com/storage/products/company/brand/logos/jb_beam.png" height='128' style='border:0px;height:128px;' alt="JetBrains Logo (Main) logo."></a>
