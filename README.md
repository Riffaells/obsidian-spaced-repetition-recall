# Obsidian Spaced Repetition Flow

**Flow** is a comprehensive reimagining of the Obsidian Spaced Repetition plugin, featuring 15+ major enhancements for improved user experience, modern UI, and advanced spaced repetition capabilities. Flow is designed for spaced repetition review, progressive summarization, and incremental writing workflows.

This is a distinct fork with its own feature set and identity, building upon the excellent foundations of the original Spaced Repetition plugin and Recall.

## ✨ What's New in Flow

Flow introduces 15+ major enhancements over the original plugin:

### 🎯 Core Enhancements

1. **FSRS Algorithm Support** - Modern [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) algorithm with parameter optimization and `ob_revlog.csv` export for the [FSRS optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer)

2. **Separate Data Storage** - Store scheduling information in `tracked_files.json` instead of modifying note files (optional) - cleaner notes and easier version control

3. **Float Bar for Note Review** - Quick review interface with keyboard shortcuts (0/1/2/3) on desktop and swipe gestures on mobile

4. **Postpone Functions** - Two postpone options:
   - Postpone notes/cards with retention >65% from before today
   - Postpone specific items after X days

5. **Reschedule All Items** - Recalculate next review times for all scheduled items based on current settings

6. **Auto-balancing** - Automatic workload distribution to prevent review spikes (triggers when ≥10 items and interval ≥3 days)

7. **Multiple Cloze Deletions** - Support for multiple cloze deletions in a single card (up to 4 clozes, then groups of 3)

8. **Mixed Queue for Notes** - Mix new and due notes in review queue (default: 3 due, then 2 new)

9. **BlockID Positioning** - Append BlockID (e.g., `^blkid1`) to card text for accurate positioning (optional)

10. **Enhanced Statistics** - Note review statistics and daily review statistics in data view

### 🎨 UI/UX Improvements

11. **Modern Sidebar** - Redesigned sidebar with better organization and visual hierarchy

12. **Improved Settings** - Modular settings interface with intuitive tag and folder management

13. **Tag Manager Component** - Add, edit, and remove tags/folders with autocomplete support

14. **Separate Sibling Card Settings** - Independent "bury sibling cards" settings for flashcards and note review

15. **Direct Note Opening** - Open notes directly without tag selection when multiple tags are present

### 🔧 Additional Features

- **Algorithm Switching** - Choose between Default (Anki optimized), Anki, or FSRS algorithms
- **Selective Note-to-Deck Conversion** - Convert only specific review notes to flashcard decks
- **SR Item Info Command** - View and modify review information for current note/cards
- **Experimental Features** - Advanced debugging tools (Print Data, Reset Data, Update Items, Prune Data) with appropriate warnings

## 📚 Documentation

- **[Full Documentation](https://riffaells.github.io/obsidian-spaced-repetition-flow/)** - Complete guide to all Flow features
- **[Flow Features Guide](https://open-spaced-repetition.github.io/obsidian-spaced-repetition-recall/flow-features/)** - Detailed documentation of Flow-specific enhancements
- **[Usage Guide](./docs/usage.md)** - Practical scenarios for new users and migration from original SR plugin
- **[Algorithms](https://open-spaced-repetition.github.io/obsidian-spaced-repetition-recall/algorithms/)** - FSRS, Anki, and Default algorithm details
- **[Data Storage](https://open-spaced-repetition.github.io/obsidian-spaced-repetition-recall/data-storage/)** - Separate JSON storage vs in-note storage options

## 📦 Installation

### From Obsidian Community Plugins (Recommended)
1. Open Obsidian Settings → Community Plugins
2. Disable Safe Mode if needed
3. Browse Community Plugins and search for "Spaced Repetition Flow"
4. Click Install, then Enable

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall/releases/)
2. Create folder `YourVault/.obsidian/plugins/obsidian-spaced-repetition-flow`
3. Place downloaded files in the folder
4. Reload Obsidian (Ctrl/Cmd + R) and enable the plugin in Settings → Community Plugins

### BRAT Plugin (Beta Testing)
Install using the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) for automatic updates and beta versions:
1. Install BRAT from Community Plugins
2. In BRAT settings, click "Add Beta Plugin"
3. Enter: `open-spaced-repetition/obsidian-spaced-repetition-recall`
4. Enable the plugin

## 🎯 Quick Start

### For New Users (CASE1)
1. **Configure Tags** - Go to Settings → Spaced Repetition → Flashcards/Notes and add your review tags
2. **Choose Algorithm** - Select FSRS algorithm (Settings → Spaced Repetition → Scheduling) for best results
3. **Set Data Location** - Choose "In plugin/vault/specified folder" (Settings → Spaced Repetition → Scheduling → Data Location) for cleaner notes
4. **Configure FSRS Parameters** - Use default parameters or optimize with [FSRS optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer)
5. **Start Reviewing** - Use the sidebar, status bar, or command palette to begin review sessions

### For Users Migrating from Original SR Plugin (CASE2)
⚠️ **IMPORTANT: Backup your vault before migrating!**

1. **Backup Your Vault** - Create a complete backup of your vault
2. **Disable Original Plugin** - Disable the original Spaced Repetition plugin to avoid conflicts
3. **Close Obsidian** - Completely close Obsidian
4. **Copy Data** - Copy `obsidian-spaced-repetition/data.json` to `obsidian-spaced-repetition-recall/data.json`
5. **Reopen Obsidian** - Launch Obsidian and enable Flow plugin
6. **Configure Settings** - Follow CASE1 settings if using FSRS algorithm

For detailed usage instructions and scenarios, check the [Usage Guide](./docs/usage.md).

## 🎯 Use Cases

Flow is designed for three primary workflows:

1. **Spaced Repetition Review** - Traditional flashcard and note review with optimized scheduling algorithms
2. **Progressive Summarization** - Incremental note refinement using spaced intervals (inspired by [Andy Matuschak's work](https://notes.andymatuschak.org/z7iCjRziX6V6unNWL81yc2dJicpRw2Cpp9MfQ))
3. **Incremental Writing** - Gradual content development with spaced review to maintain context and momentum

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, or UI improvements, feel free to:
- Submit an [issue](https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall/issues)
- Create a [pull request](https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall/pulls)
- Share feedback and suggestions

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 💝 Support

If you find Flow valuable, consider:
- ⭐ Starring the [repository](https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall)
- 📢 Sharing Flow with others who might benefit
- 🐛 Reporting bugs and suggesting improvements
- 💻 Contributing code or documentation


## 🙏 Acknowledgments

Flow builds upon the excellent work of the spaced repetition community:

### Original Plugins
- **[@st3v3nmw](https://github.com/st3v3nmw)** - Creator of the original [Obsidian Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) plugin, which established the foundation for spaced repetition in Obsidian
- **[@martin-jw](https://github.com/martin-jw)** - Developer of [Recall plugin](https://github.com/martin-jw/obsidian-recall), which introduced many enhancements that Flow builds upon

### Algorithms & Research
- **[Open Spaced Repetition](https://github.com/open-spaced-repetition)** - FSRS algorithm development and research
- **[Jarrett Ye](https://github.com/L-M-Sherlock)** - FSRS algorithm creator and spaced repetition researcher

### UI/UX Inspiration
- **[@chetachiezikeuzor](https://github.com/chetachiezikeuzor)** - Float bar inspiration from [cMenu Plugin](https://github.com/chetachiezikeuzor/cMenu-Plugin)
- **[@zsviczian](https://github.com/zsviczian)** - Release notes implementation

### Community
- **Obsidian Community** - Feedback, testing, and continuous improvement suggestions
- **All Contributors** - Everyone who has contributed code, documentation, bug reports, and feature requests

Flow is a community-driven project that stands on the shoulders of giants. We're grateful to everyone who has contributed to making spaced repetition better in Obsidian.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
