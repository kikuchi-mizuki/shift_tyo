#!/bin/bash

# Fix all migration files to use DROP ... IF EXISTS pattern

cd supabase/migrations

for file in *.sql; do
  echo "Processing $file..."

  # Fix CREATE POLICY
  sed -i '' 's/CREATE POLICY "/DROP POLICY IF EXISTS "/g' "$file"
  sed -i '' 's/DROP POLICY IF EXISTS "\(.*\)" ON \(.*\);/DROP POLICY IF EXISTS "\1" ON \2;\
CREATE POLICY "/g' "$file"

  # Fix CREATE TRIGGER
  sed -i '' 's/CREATE TRIGGER /DROP TRIGGER IF EXISTS /g' "$file"
  sed -i '' 's/DROP TRIGGER IF EXISTS \([^ ]*\) ON \(.*\);/DROP TRIGGER IF EXISTS \1 ON \2;\
CREATE TRIGGER /g' "$file"
done

echo "All migrations fixed!"
