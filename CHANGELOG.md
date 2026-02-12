# Changelog

## [Unreleased]

### Added
- **Context-Aware Flashcard Parsing**: Flashcards in lists and callouts now automatically have their markdown prefixes removed
  - Supports unordered lists (`-`, `*`, `+`), ordered lists (`1.`, `2.`), and nested lists
  - Supports callouts (`>`) and block quotes (`>>`)
  - Preserves all rich markdown formatting (bold, italic, highlights, code)
- **Alternative Separators for Context Lines**: New `contextAwareSeparators` option in inline flashcard rules
  - Allows using custom separators (e.g., `-`, `|`, `?`) in lists and callouts only
  - Does not affect normal lines (backward compatible)
  - Example: `- What is this ? This is an answer`
- **Default Deck for Base Tag**: Cards with only `#flashcards` tag (no subdeck) now go to default deck instead of being filtered out

### Fixed
- **Flashcard Repetition Mode**: Fixed issue where cards with only `#flashcards` tag were being filtered out and not appearing in review
- **Deck Assignment**: Improved deck assignment logic with proper fallback to default deck

### Changed
- **Parser Architecture**: Introduced `ContextCleaner` module for cleaner separation of concerns
- **Question Creation**: Added Priority 4 fallback to default deck in `Question.Create`

### Technical
- Added 52 new tests for context-aware parsing
- Added comprehensive documentation in `docs/CONTEXT_AWARE_PARSING.md`
- Exported `ContextCleaner` module for external use

---

New Plugin update
