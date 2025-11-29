# Obsidian Spaced Repetition Flow

An enhanced version of Obsidian spaced repititon Recall with improved user experience and modern UI.

**Flow** extends the powerful spaced repetition features of Recall with a focus on usability, visual design, and workflow improvements.

## ✨ What's New in Flow

### 🎨 Enhanced UI/UX
- **Modern Sidebar** - Redesigned sidebar with better organization and visual hierarchy
- **Improved Settings** - Modular settings interface with intuitive tag and folder management
- **Tag Manager Component** - Add, edit, and remove tags/folders with autocomplete support
- **Smoother Animations** - Optimized CSS for better performance and softer colors

### 🚀 Core Features (from Recall)
- **Separate Data Storage** - Schedule information saved in `tracked_files.json` (optional)
- **Multiple Algorithms** - Choose between Default, Anki, or [FSRS](https://github.com/open-spaced-repetition/ts-fsrs)
- **Flexible Review Options** - Float bar for quick responses, direct note review
- **Advanced Scheduling** - Postpone notes/cards, reschedule items, mix queue settings
- **Multi-Cloze Support** - Enhanced cloze card handling
- **FSRS Optimization** - Export `ob-revlog.csv` for algorithm optimization

## 📚 Documentation

- [Usage Guide](./docs/usage.md)
- [中文使用手册](./docs/README_ZH.md)
- [Original SR Documentation](https://github.com/st3v3nmw/obsidian-spaced-repetition#readme)

## 📦 Installation

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall/releases/)
2. Create folder `Vault-name/.obsidian/plugins/obsidian-spaced-repetition-flow`
3. Place downloaded files in the folder
4. Reload Obsidian and enable the plugin

### BRAT Plugin
Install using the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) for automatic updates.

## 🎯 Quick Start

1. **Configure Tags** - Go to Settings → Flashcards/Notes and add your review tags
2. **Choose Algorithm** - Select your preferred spaced repetition algorithm (FSRS recommended)
3. **Set Data Location** - Choose between in-note or separate JSON storage
4. **Start Reviewing** - Use the sidebar or status bar to begin your review sessions

For detailed usage instructions, check the [documentation](./docs/usage.md).

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, or UI improvements, feel free to:
- Submit an [issue](https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall/issues)
- Create a [pull request](https://github.com/open-spaced-repetition/obsidian-spaced-repetition-recall/pulls)
- Join the [discussion](https://forum-zh.obsidian.md/t/topic/20551)

## 💝 Support

If you find this plugin valuable, consider supporting the development:


## 🙏 Acknowledgments

This plugin builds upon the excellent work of:

- [@martin-jw](https://github.com/martin-jw) - [Recall plugin](https://github.com/martin-jw/obsidian-recall)
- [@st3v3nmw](https://github.com/st3v3nmw) - [Obsidian Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition)
- [@chetachiezikeuzor](https://github.com/chetachiezikeuzor) - Float bar inspiration from [cMenu](https://github.com/chetachiezikeuzor/cMenu-Plugin)
- [Open Spaced Repetition](https://github.com/open-spaced-repetition) - FSRS Algorithm
- [@zsviczian](https://github.com/zsviczian) - Release notes implementation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
