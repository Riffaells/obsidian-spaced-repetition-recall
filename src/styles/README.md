# Styles Structure

This directory contains all CSS styles for the Obsidian Spaced Repetition Flow plugin, organized into logical modules.

## Structure

```
src/styles/
├── base.css                    # Main entry point (imports all modules)
├── core/                       # Core layout and fundamental styles
│   ├── layout.css             # Flexbox layouts, containers
│   ├── modal.css              # Modal positioning and structure
│   ├── header.css             # Header and content sections
│   ├── buttons.css            # Base button styles
│   └── mobile.css             # Mobile and responsive styles
├── components/                 # Reusable UI components
│   ├── response-buttons.css   # Review response buttons (Hard/Good/Easy)
│   ├── compact-review-buttons.css  # Compact neon-style review buttons
│   ├── note-review-banner.css # Floating review banner
│   ├── sticky-header.css      # Sticky headers and scroll-to-top
│   ├── info-section.css       # Info boxes and section titles
│   └── tags-manager.css       # Tag input and management UI
├── views/                      # View-specific styles
│   ├── deck-list.css          # Deck list view
│   ├── flashcard-review.css   # Flashcard review interface
│   ├── edit-modal.css         # Card editing modal
│   ├── tabs.css               # Tab navigation
│   └── statistics.css         # Statistics view
├── sidebar/                    # Sidebar-specific styles
│   ├── sidebar-new.css        # Main sidebar layout and controls
│   ├── sidebar-decks.css      # Deck display in sidebar
│   └── sidebar-items.css      # Note and card items
├── settings/                   # Settings UI styles
│   └── flashcard-rules-modal.css  # Flashcard rules configuration
├── modal-card-view.css        # Card view modal (legacy)
├── modal-fullscreen.css       # Fullscreen modal (legacy)
├── modal-mobile.css           # Mobile modal (legacy)
├── modal-session-view.css     # Session view modal (legacy)
└── flashcard-rules.css        # Flashcard rules (legacy)
```

## How It Works

1. **Entry Point**: `base.css` is the main entry point that imports all other modules
2. **Build Process**: `bundle-css.mjs` resolves all `@import` statements and creates a single bundled file
3. **Output**: All styles are bundled into `build/styles.css`

## Adding New Styles

1. Create a new CSS file in the appropriate directory:
   - `core/` for fundamental layout/structure
   - `components/` for reusable UI elements
   - `views/` for page-specific styles
   - `sidebar/` for sidebar-related styles
   - `settings/` for settings UI

2. Add an `@import` statement in `base.css`:
   ```css
   @import './components/your-new-component.css';
   ```

3. Run the build:
   ```bash
   bun run dev    # Watch mode
   # or
   node bundle-css.mjs  # One-time build
   ```

## CSS Conventions

- Use CSS custom properties (variables) from Obsidian theme:
  - `var(--background-primary)`, `var(--background-secondary)`
  - `var(--text-normal)`, `var(--text-muted)`, `var(--text-accent)`
  - `var(--interactive-accent)`, `var(--text-on-accent)`
  - `var(--background-modifier-border)`, `var(--background-modifier-hover)`

- Prefix all custom classes with `sr-` to avoid conflicts:
  - `.sr-button`, `.sr-modal`, `.sr-deck-list`

- Use BEM-like naming for component variants:
  - `.sr-button`, `.sr-button-primary`, `.sr-button-disabled`

- Keep specificity low - avoid deep nesting

## Migration Notes

The original `base.css` (2000+ lines) has been split into 20+ focused modules:
- Easier to maintain and understand
- Better organization by feature/component
- Reduced merge conflicts
- Faster development with focused files

Legacy modal CSS files (`modal-*.css`) are kept separate for backward compatibility but may be refactored in the future.
