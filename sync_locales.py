# sync_locales.py

import os
import re
import glob
from collections import OrderedDict

# Configuration
SOURCE_DIR = "src"
LOCALE_DIR = "src/lang/locale"
SOURCE_LOCALE = "en.ts"

# Regex to find t("KEY") or t('KEY') in codebase
# Matches: t("KEY") or t('KEY')
CODE_KEY_REGEX = re.compile(r"\bt\s*\(\s*([\"'])(.+?)\1")

# Regex to capture keys in locale files: either quoted strings or simple identifiers
# Matches: KEY: or "KEY":
LOCALE_KEY_REGEX = re.compile(r"^\s*(\"(?:[^\"]|\\.)*\"|[A-Z_0-9_]+)\s*:")

def find_keys_in_codebase(root_dir):
    """
    Scans all .ts and .tsx files in the root_dir for t("KEY") usage.
    Returns a set of found keys.
    """
    keys = set()
    print(f"Scanning codebase in '{root_dir}' for translation keys...")
    for root, dirs, files in os.walk(root_dir):
        # Skip node_modules and hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
        
        for file in files:
            if file.endswith(".ts") or file.endswith(".tsx"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        matches = CODE_KEY_REGEX.findall(content)
                        for quote, key in matches:
                            keys.add(key)
                except Exception as e:
                    print(f"Error reading {path}: {e}")
    return keys

def parse_locale_file(filepath):
    """
    Parses a locale file into a more structured format.
    Returns:
    - A list of all items in order (comments, keys, other).
    - An OrderedDict mapping keys to their full, multi-line content.
    - An OrderedDict mapping keys to their line number information (start, end).
    """
    items = []
    key_to_content = OrderedDict()
    key_to_pos = OrderedDict()
    lines = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except FileNotFoundError:
        return [], OrderedDict(), OrderedDict()

    i = 0
    while i < len(lines):
        line = lines[i]
        
        match = LOCALE_KEY_REGEX.match(line)
        is_comment = line.strip().startswith("//")

        if match and not is_comment:
            raw_key = match.group(1)
            key = raw_key.strip().strip('"').strip("'")
            
            start_index = i
            # Find the end of this entry by looking for the next key/comment/brace
            end_index = start_index
            for j in range(i + 1, len(lines)):
                next_line = lines[j]
                # Stop if we see a new key, a comment, or the closing brace of the object
                if (LOCALE_KEY_REGEX.match(next_line) and not next_line.strip().startswith("//")) or \
                   next_line.strip().startswith("//") or \
                   next_line.strip() == "};" or \
                   next_line.strip() == "}" or \
                   (next_line.strip().startswith("}") and ";" in next_line):
                    end_index = j - 1
                    break
                end_index = j
            
            content_lines = lines[start_index : end_index + 1]
            full_content = "".join(content_lines)

            if key not in key_to_content:
                items.append({'type': 'key', 'key': key})
                key_to_content[key] = full_content
                key_to_pos[key] = {'start': start_index, 'end': end_index}
            
            i = end_index + 1
        else:
            items.append({'type': 'other', 'content': line})
            i += 1
            
    return items, key_to_content, key_to_pos

def update_en_locale(filepath, used_keys):
    """
    Adds missing keys from used_keys to en.ts.
    """
    items, key_map, _ = parse_locale_file(filepath)
    existing_keys = set(key_map.keys())
    
    missing_keys = used_keys - existing_keys
    
    if not missing_keys:
        print("No new keys found in codebase to add to en.ts.")
        return

    print(f"Found {len(missing_keys)} new keys in codebase. Adding to {os.path.basename(filepath)}...")
    
    # Read the file lines
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Find the insertion point (before the last closing brace)
    insert_idx = -1
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip().startswith("}"):
            insert_idx = i
            break
    
    if insert_idx == -1:
        print("Error: Could not find closing brace '}' in en.ts")
        return

    # Prepare new lines
    new_lines = []
    # Add a separator comment if not present
    if not lines[insert_idx-1].strip() == "":
        new_lines.append("\n")
    new_lines.append("    // Missing keys (auto-added)\n")
    
    sorted_missing_keys = sorted(list(missing_keys))
    for key in sorted_missing_keys:
        # Check if key needs quotes
        if not re.match(r"^[A-Z_0-9]+$", key):
            formatted_key = f'"{key}"'
            # If the key itself is the text (has spaces, mixed case), use it as the value
            value = key
        else:
            formatted_key = key
            # Heuristic: Convert UPPER_CASE_KEY to "Upper Case Key"
            # This provides a better default "English translation" than the key itself
            value = key.replace("_", " ").replace("-", " ").title()
            
        new_lines.append(f'    {formatted_key}: "{value}",\n')
        print(f"  + Added: {key} -> \"{value}\"")

    # Insert
    lines[insert_idx:insert_idx] = new_lines
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Updated en.ts successfully.")

def sync_target_locale(target_path, en_ordered_keys, en_key_map):
    filename = os.path.basename(target_path)
    print(f"\nProcessing {filename}...")

    _, target_key_map, target_key_pos = parse_locale_file(target_path)
    target_keys = set(target_key_map.keys())

    missing_keys = set(en_ordered_keys) - target_keys
    orphan_keys = target_keys - set(en_ordered_keys)
    
    if not missing_keys and not orphan_keys:
        print(f"  {filename} is perfectly in sync.")
        return

    target_lines = []
    with open(target_path, "r", encoding="utf-8") as f:
        target_lines = f.readlines()
    
    # 1. Remove orphan keys by commenting them out
    if orphan_keys:
        print(f"  ! Found {len(orphan_keys)} orphan keys. Commenting them out...")
        for key in orphan_keys:
            # Check if already commented (simple check)
            # Actually, parse_locale_file ignores comments, so these are definitely active keys
            print(f"    - Commenting out orphan key: {key}")
            pos = target_key_pos[key]
            for i in range(pos['start'], pos['end'] + 1):
                if not target_lines[i].strip().startswith("//"):
                    target_lines[i] = "// ORPHANED: " + target_lines[i]

    # 2. Add missing keys
    if missing_keys:
        print(f"  + Found {len(missing_keys)} missing keys. Inserting them...")
        
        # Create a map of where to insert things
        insertions = {} # key_to_insert_after -> list_of_content_to_insert
        
        prev_key = None
        for key in en_ordered_keys:
            if key in missing_keys:
                # print(f"    - Preparing to insert: {key}")
                content_to_add = en_key_map[key]

                # Ensure comma at end if needed
                lines_to_add = content_to_add.splitlines(True)
                last_line = lines_to_add[-1]
                stripped_last_line = last_line.rstrip()
                indentation = last_line[:len(last_line) - len(last_line.lstrip())]
                
                if not stripped_last_line.endswith(','):
                     # Add comma if it's not the last item in the object (heuristic)
                     # But in en.ts it might be the last item. 
                     # Safest is to always add comma for intermediate items.
                     # Since we are copying from en.ts, it might already have a comma.
                     lines_to_add[-1] = indentation + stripped_last_line + ",\n"
                
                # Normalize indentation
                base_indent = "    "
                final_content_to_add = "".join([f"{base_indent}{line.lstrip()}" if line.strip() else line for line in "".join(lines_to_add).splitlines(True)])

                if prev_key not in insertions:
                    insertions[prev_key] = []
                insertions[prev_key].append(final_content_to_add)
            
            prev_key = key

        # Now, actually insert the lines by iterating backwards
        
        keys_to_insert_after = {} # existing_key -> list of content strings
        last_existing_key = None # None means insert at start (or after opening brace)
        
        for key in en_ordered_keys:
            if key in target_keys and key not in orphan_keys:
                last_existing_key = key
            elif key in missing_keys:
                content = en_key_map[key]
                # Fix comma
                if not content.strip().endswith(","):
                    content = content.rstrip() + ",\n"
                
                # Fix indent
                lines = content.splitlines(True)
                fixed_lines = []
                for l in lines:
                    if l.strip():
                        fixed_lines.append("    " + l.lstrip())
                    else:
                        fixed_lines.append(l)
                content = "".join(fixed_lines)
                
                if last_existing_key not in keys_to_insert_after:
                    keys_to_insert_after[last_existing_key] = []
                keys_to_insert_after[last_existing_key].append(content)
        
        # Sort keys_to_insert_after by the position of last_existing_key descending
        # so we insert from bottom to top.
        
        insertion_points = []
        for anchor_key, contents in keys_to_insert_after.items():
            if anchor_key is None:
                # Insert after opening brace
                insertion_points.append((-1, contents))
            else:
                end_line = target_key_pos[anchor_key]['end']
                insertion_points.append((end_line, contents))
        
        # Sort by line number descending
        insertion_points.sort(key=lambda x: x[0], reverse=True)
        
        for line_idx, contents in insertion_points:
            text_block = "".join(contents)
            if line_idx == -1:
                # Insert after opening brace. 
                # Let's just find the first line with '{'
                for i, line in enumerate(target_lines):
                    if "{" in line:
                        target_lines.insert(i + 1, text_block)
                        break
            else:
                target_lines.insert(line_idx + 1, text_block)

    # Write back
    try:
        with open(target_path, "w", encoding="utf-8") as f:
            f.writelines(target_lines)
        print(f"  Finished syncing {filename}.")
    except IOError as e:
        print(f"  Error writing to file {target_path}: {e}")

def main():
    print("Starting locale sync...")
    
    # 1. Scan codebase
    used_keys = find_keys_in_codebase(SOURCE_DIR)
    print(f"Found {len(used_keys)} unique translation keys in codebase.")

    # 2. Update en.ts
    en_path = os.path.join(LOCALE_DIR, SOURCE_LOCALE)
    if not os.path.exists(en_path):
         print(f"Error: Source file '{en_path}' not found.")
         return
         
    update_en_locale(en_path, used_keys)

    # 3. Re-parse en.ts to get the authoritative list
    en_items, en_key_map, _ = parse_locale_file(en_path)
    en_keys = [item['key'] for item in en_items if item['type'] == 'key']

    # 4. Sync other locales
    target_files = [
        f for f in glob.glob(os.path.join(LOCALE_DIR, "*.ts"))
        if os.path.basename(f) != SOURCE_LOCALE and os.path.basename(f) != "helpers.ts"
    ]
    
    for target_path in target_files:
        sync_target_locale(target_path, en_keys, en_key_map)
        
    print("\nDone!")

if __name__ == "__main__":
    main()
