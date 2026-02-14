#!/usr/bin/env python3
"""
Fix all migration files to use DROP IF EXISTS pattern before CREATE statements
"""
import os
import re
from pathlib import Path

migrations_dir = Path("supabase/migrations")

def fix_migration_file(filepath):
    """Fix a single migration file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Pattern 1: Fix CREATE POLICY
    # Match: CREATE POLICY "policy_name" ON table_name
    policy_pattern = r'CREATE POLICY "([^"]+)" ON (\w+)'

    def replace_policy(match):
        policy_name = match.group(1)
        table_name = match.group(2)
        return f'DROP POLICY IF EXISTS "{policy_name}" ON {table_name};\nCREATE POLICY "{policy_name}" ON {table_name}'

    content = re.sub(policy_pattern, replace_policy, content)

    # Pattern 2: Fix CREATE TRIGGER
    # Match: CREATE TRIGGER trigger_name
    trigger_pattern = r'CREATE TRIGGER (\w+)'

    def replace_trigger(match):
        trigger_name = match.group(1)
        # We need to find the ON clause to get the table name
        # Look for: CREATE TRIGGER name ... ON table_name
        full_match = re.search(
            rf'CREATE TRIGGER {trigger_name}[^;]*?ON (\w+)',
            content,
            re.DOTALL
        )
        if full_match:
            table_name = full_match.group(1)
            return f'DROP TRIGGER IF EXISTS {trigger_name} ON {table_name};\nCREATE TRIGGER {trigger_name}'
        return match.group(0)

    content = re.sub(trigger_pattern, replace_trigger, content)

    # Only write if content changed
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Process all migration files"""
    if not migrations_dir.exists():
        print(f"Error: {migrations_dir} not found")
        return

    sql_files = sorted(migrations_dir.glob("*.sql"))
    fixed_count = 0

    for filepath in sql_files:
        if fix_migration_file(filepath):
            print(f"✅ Fixed: {filepath.name}")
            fixed_count += 1
        else:
            print(f"⏭️  Skipped (no changes): {filepath.name}")

    print(f"\n📊 Summary: Fixed {fixed_count}/{len(sql_files)} files")

if __name__ == "__main__":
    main()
