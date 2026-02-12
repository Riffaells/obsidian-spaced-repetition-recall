# Quick Start: Context-Aware Flashcards

## What's New?

Flashcards in lists and callouts are now automatically cleaned! No more ugly prefixes in your cards.

## Basic Usage

### Lists (Works Automatically)

**Write this:**
```markdown
#flashcards

## Capitals
- Kenya::Nairobi
- Canada::Ottawa
- Japan::Tokyo
```

**Get clean cards:**
- Front: "Kenya" | Back: "Nairobi"
- Front: "Canada" | Back: "Ottawa"
- Front: "Japan" | Back: "Tokyo"

### Callouts (Works Automatically)

**Write this:**
```markdown
#flashcards

> [!tip] Quick Facts
> Speed of light::299,792,458 m/s
> Planck's constant::6.626 × 10⁻³⁴ J⋅s
```

**Get clean cards:**
- Front: "Speed of light" | Back: "299,792,458 m/s"
- Front: "Planck's constant" | Back: "6.626 × 10⁻³⁴ J⋅s"

### Nested Lists (Works Automatically)

**Write this:**
```markdown
#flashcards

## Programming
- Data Structures
  - Array::Contiguous memory
  - Linked List::Nodes with pointers
```

**Get clean cards:**
- Front: "Array" | Back: "Contiguous memory"
- Front: "Linked List" | Back: "Nodes with pointers"

## Advanced: Alternative Separators

Want to use natural language? Configure alternative separators!

### Step 1: Configure (in plugin settings)

Add to your flashcard rule:
```json
{
  "contextAwareSeparators": [" ? ", " | ", " - "]
}
```

### Step 2: Use Natural Separators

**Write this:**
```markdown
#flashcards

## Questions
- What is the capital of France ? Paris
- Who wrote Hamlet ? Shakespeare

## Definitions  
- Algorithm | Step-by-step procedure
- Recursion | Function calling itself

## Simple
- Front - Back
- Question - Answer
```

**All work perfectly!**

### Important Notes

✅ Alternative separators work ONLY in lists and callouts  
✅ Normal lines still require `::`  
✅ This prevents accidental card creation  
✅ Fully backward compatible

## Rich Markdown

All formatting is preserved:

```markdown
#flashcards

- **Bold question**::*Italic answer*
- ==Highlighted term==::Definition with `code`
- Normal::With ==highlights== and **bold**
```

Everything works as expected!

## Tips

1. **Group related cards:** Use lists under headings
2. **Use callouts for important facts:** Makes them stand out
3. **Nest lists for hierarchy:** Shows relationships
4. **Configure separators for your style:** Use `?` for questions, `|` for definitions
5. **Mix and match:** Use different formats in the same note

## Troubleshooting

### Card not detected?
- Check the separator is present: `- Q::A` ✓
- Ensure space after list marker: `- ` not `-` ✓
- Verify not in code block ✓

### Alternative separator not working?
- Check it's configured in settings ✓
- Ensure line is a list or callout ✓
- Remember: doesn't work in normal lines ✓

### Prefix still showing?
- Update plugin to latest version ✓
- Reload Obsidian ✓
- Check flashcard rule is enabled ✓

## Examples

### Study Notes
```markdown
#flashcards

## Biology
- Mitochondria::Powerhouse of the cell
- DNA::Deoxyribonucleic acid
- ATP::Adenosine triphosphate

## Chemistry
> [!note] Elements
> H::Hydrogen
> He::Helium
> Li::Lithium
```

### Language Learning
```markdown
#flashcards

## Spanish (with ? separator)
- What is "hello" in Spanish ? Hola
- What is "goodbye" in Spanish ? Adiós
- What is "thank you" in Spanish ? Gracias
```

### Programming
```markdown
#flashcards

## JavaScript (with | separator)
- const | Declares a constant variable
- let | Declares a block-scoped variable
- var | Declares a function-scoped variable
```

## Next Steps

- Read full documentation: [Context-Aware Parsing](./CONTEXT_AWARE_PARSING.md)
- Configure alternative separators in settings
- Try different formats and find what works for you
- Share your workflows with the community!

---

**Need Help?** Check the [full documentation](./CONTEXT_AWARE_PARSING.md) or ask in the community forum.
