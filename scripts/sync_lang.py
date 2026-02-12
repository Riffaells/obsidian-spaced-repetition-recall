#!/usr/bin/env python3
"""
Language Synchronization Script

This script synchronizes translation files across all language directories:
1. Adds missing keys from English (en) to other languages
2. Marks untranslated strings with // TODO: Translate
3. Updates strings that have the TODO marker when English source changes
4. Preserves existing translations
5. Maintains file structure and comments

Usage:
    python scripts/sync_lang.py
"""

import os
import re
import glob

LOCALE_DIR = "src/lang/locale"
EN_DIR = os.path.join(LOCALE_DIR, "en")
TODO_MARKER = "// TODO: Translate"

def parse_ts_object(content):
    """
    Parse TypeScript object into key-value pairs.
    Handles single-line, multi-line strings, and template literals.
    Returns dict with keys and their full value strings (including quotes/backticks).
    """
    kv = {}
    
    # Remove export default { and closing };
    content = re.sub(r'^\s*export\s+default\s*\{\s*\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'\n\s*\};\s*$', '', content)
    
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Skip comments and empty lines
        if line.strip().startswith('//') or not line.strip():
            i += 1
            continue
        
        # Match key: value pattern
        match = re.match(r'^\s*("(?:[^"]|\\.)*"|[A-Z_0-9_]+)\s*:\s*(.*)$', line)
        
        if match:
            key_raw = match.group(1).strip()
            key_clean = key_raw.strip('"').strip("'")
            value_start = match.group(2).strip()
            
            # Handle case where value is on next line (key:\n    "value")
            if not value_start:
                if i + 1 < len(lines):
                    next_line = lines[i + 1]
                    value_start = next_line.strip()
                    if value_start:
                        i += 1
                        line = lines[i]
                    else:
                        i += 1
                        continue
                else:
                    i += 1
                    continue
            
            # Determine value type and extract full value
            if value_start.strip().startswith('`'):
                # Template literal - find closing backtick
                value_lines = [value_start]
                j = i + 1
                found_end = False
                
                while j < len(lines):
                    current_line = lines[j]
                    value_lines.append('\n' + current_line)
                    
                    if re.search(r'`\s*,?\s*$', current_line.rstrip()):
                        found_end = True
                        break
                    j += 1
                
                if found_end:
                    full_value = ''.join(value_lines).strip()
                    if not full_value.endswith(','):
                        full_value = full_value.rstrip() + ','
                    
                    kv[key_clean] = full_value
                    i = j + 1
                else:
                    i += 1
                
            elif value_start.strip().startswith('"'):
                # Double-quoted string
                unescaped_quotes = len(re.findall(r'(?<!\\)"', value_start))
                
                if unescaped_quotes >= 2:
                    # Single line
                    full_value = value_start.strip()
                    if not full_value.endswith(','):
                        full_value += ','
                    kv[key_clean] = full_value
                    i += 1
                else:
                    # Multi-line string
                    value_lines = [value_start]
                    j = i + 1
                    found_end = False
                    
                    while j < len(lines):
                        current_line = lines[j]
                        value_lines.append('\n' + current_line)
                        
                        if re.search(r'(?<!\\)"\s*,?\s*$', current_line.rstrip()):
                            found_end = True
                            break
                        j += 1
                    
                    if found_end:
                        full_value = ''.join(value_lines).strip()
                        if not full_value.endswith(','):
                            full_value = full_value.rstrip() + ','
                        
                        kv[key_clean] = full_value
                        i = j + 1
                    else:
                        i += 1
                    
            elif value_start.strip().startswith("'"):
                # Single-quoted string
                unescaped_quotes = len(re.findall(r"(?<!\\)'", value_start))
                
                if unescaped_quotes >= 2:
                    full_value = value_start.strip()
                    if not full_value.endswith(','):
                        full_value += ','
                    kv[key_clean] = full_value
                    i += 1
                else:
                    value_lines = [value_start]
                    j = i + 1
                    found_end = False
                    
                    while j < len(lines):
                        current_line = lines[j]
                        value_lines.append('\n' + current_line)
                        
                        if re.search(r"(?<!\\)'\s*,?\s*$", current_line.rstrip()):
                            found_end = True
                            break
                        j += 1
                    
                    if found_end:
                        full_value = ''.join(value_lines).strip()
                        if not full_value.endswith(','):
                            full_value = full_value.rstrip() + ','
                        
                        kv[key_clean] = full_value
                        i = j + 1
                    else:
                        i += 1
            else:
                i += 1
        else:
            i += 1
    
    return kv


def has_todo_marker(lines, key_line_index):
    """Check if the line before the key has a TODO marker."""
    if key_line_index > 0:
        prev_line = lines[key_line_index - 1].strip()
        return TODO_MARKER in prev_line
    return False


def sync():
    """Sync all language directories with English structure."""
    en_files = [os.path.basename(f) for f in glob.glob(os.path.join(EN_DIR, "*.ts")) if "index.ts" not in f]
    lang_dirs = [d for d in glob.glob(os.path.join(LOCALE_DIR, "*")) if os.path.isdir(d) and os.path.basename(d) != "en"]
    
    print("=" * 60)
    print("Language Synchronization Script")
    print("=" * 60)
    print(f"Found {len(en_files)} module files: {', '.join(en_files)}")
    print(f"Found {len(lang_dirs)} language directories\n")
    
    for ldir in lang_dirs:
        lang = os.path.basename(ldir)
        print(f"Processing {lang}...")
        
        # Load existing translations from old monolithic file
        old_file = os.path.join(LOCALE_DIR, f"{lang}.ts")
        all_translations = {}
        
        if os.path.exists(old_file):
            print(f"  Loading from {lang}.ts...")
            with open(old_file, 'r', encoding='utf-8') as f:
                content = f.read()
            all_translations = parse_ts_object(content)
            print(f"  Found {len(all_translations)} translations")
        
        # Also load from existing modular files (in case of re-run)
        for fname in en_files:
            mod_file = os.path.join(ldir, fname)
            if os.path.exists(mod_file):
                with open(mod_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                all_translations.update(parse_ts_object(content))
        
        # Create directory
        os.makedirs(ldir, exist_ok=True)
        
        # Process each module
        for fname in en_files:
            en_path = os.path.join(EN_DIR, fname)
            trg_path = os.path.join(ldir, fname)
            
            with open(en_path, 'r', encoding='utf-8') as f:
                en_content = f.read()
            
            # Parse English to get keys and values
            en_kv = parse_ts_object(en_content)
            
            # Load existing target file to check for TODO markers
            existing_lines = []
            existing_keys_with_todo = set()
            
            if os.path.exists(trg_path):
                with open(trg_path, 'r', encoding='utf-8') as f:
                    existing_lines = f.readlines()
                
                # Find keys with TODO markers
                for i, line in enumerate(existing_lines):
                    if TODO_MARKER in line and i + 1 < len(existing_lines):
                        # Next line should have the key
                        next_line = existing_lines[i + 1]
                        match = re.match(r'^\s*("(?:[^"]|\\.)*"|[A-Z_0-9_]+)\s*:', next_line)
                        if match:
                            key_raw = match.group(1).strip()
                            key_clean = key_raw.strip('"').strip("'")
                            existing_keys_with_todo.add(key_clean)
            
            # Build output
            output_lines = ["export default {\n"]
            
            # Read English file line by line to preserve structure
            en_lines = en_content.split('\n')
            i = 0
            
            added_count = 0
            updated_count = 0
            
            while i < len(en_lines):
                line = en_lines[i]
                
                # Skip export and closing brace
                if 'export default' in line or line.strip() in ['};', '}']:
                    i += 1
                    continue
                
                # Preserve comments
                if line.strip().startswith('//'):
                    output_lines.append(line + '\n')
                    i += 1
                    continue
                
                # Preserve empty lines
                if not line.strip():
                    output_lines.append('\n')
                    i += 1
                    continue
                
                # Check for key
                match = re.match(r'^\s*("(?:[^"]|\\.)*"|[A-Z_0-9_]+)\s*:\s*(.*)$', line)
                if match:
                    key_raw = match.group(1).strip()
                    key_clean = key_raw.strip('"').strip("'")
                    value_start = match.group(2).strip()
                    
                    # Handle value on next line
                    value_on_next_line = False
                    if not value_start and i + 1 < len(en_lines):
                        next_line = en_lines[i + 1]
                        value_start = next_line.strip()
                        if value_start:
                            value_on_next_line = True
                    
                    # Check if key exists in translations and if it needs updating
                    needs_update = key_clean in existing_keys_with_todo
                    has_translation = key_clean in all_translations and not needs_update
                    
                    # Check if the translation is actually different from English
                    if has_translation:
                        # Compare with English to see if it's actually translated
                        translation_value = all_translations[key_clean]
                        english_value = en_kv[key_clean]
                        
                        # If values are identical, it's not translated
                        if translation_value == english_value:
                            has_translation = False
                    
                    if has_translation:
                        # Use existing translation
                        output_lines.append(f"    {key_raw}: {all_translations[key_clean]}\n")
                    else:
                        # Add TODO marker for new or updated keys
                        if needs_update:
                            output_lines.append(f"    {TODO_MARKER}\n")
                            updated_count += 1
                        else:
                            output_lines.append(f"    {TODO_MARKER}\n")
                            added_count += 1
                        
                        # Use English value
                        output_lines.append(f"    {key_raw}: {en_kv[key_clean]}\n")
                    
                    # Skip the rest of this value in English file
                    start_line = i + 1 if value_on_next_line else i
                    
                    if value_start.startswith('`'):
                        # Skip until closing backtick
                        j = start_line
                        if value_on_next_line:
                            j += 1
                        while j < len(en_lines):
                            if re.search(r'`\s*,?\s*$', en_lines[j].rstrip()):
                                break
                            j += 1
                        i = j + 1
                    elif value_start.startswith('"'):
                        # Check if multi-line
                        unescaped_quotes = len(re.findall(r'(?<!\\)"', value_start))
                        if unescaped_quotes < 2:
                            # Multi-line - skip until closing quote
                            j = start_line
                            if value_on_next_line:
                                j += 1
                            while j < len(en_lines):
                                if re.search(r'(?<!\\)"\s*,?\s*$', en_lines[j].rstrip()):
                                    break
                                j += 1
                            i = j + 1
                        else:
                            i = start_line + 1
                    else:
                        i = start_line + 1
                else:
                    i += 1
            
            output_lines.append("};\n")
            
            # Write file
            with open(trg_path, 'w', encoding='utf-8') as f:
                f.writelines(output_lines)
            
            status = []
            if added_count > 0:
                status.append(f"+{added_count} new")
            if updated_count > 0:
                status.append(f"↻{updated_count} updated")
            
            status_str = f" ({', '.join(status)})" if status else ""
            print(f"  ✓ {fname}{status_str}")
        
        # Copy index.ts
        index_src = os.path.join(EN_DIR, "index.ts")
        index_dst = os.path.join(ldir, "index.ts")
        with open(index_src, 'r', encoding='utf-8') as f:
            index_content = f.read()
        with open(index_dst, 'w', encoding='utf-8') as f:
            f.write(index_content)
        
        print(f"  ✓ index.ts")
        print(f"✓ {lang} complete\n")
    
    print("=" * 60)
    print("Sync complete!")
    print("=" * 60)
    print(f"\nNote: Strings marked with '{TODO_MARKER}' need translation.")


if __name__ == "__main__":
    sync()
