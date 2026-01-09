-- Test script to preview store_names extraction
-- This will show what store names will be extracted without actually updating

SELECT
  id,
  name,
  user_type,
  store_names as current_store_names,
  ARRAY[
    CASE
      -- Extract name from parentheses if exists
      WHEN name ~ '\([^)]+\)' THEN
        regexp_replace(regexp_replace(name, '.*\(([^)]+)\).*', '\1'), '薬局$', '')
      -- Remove company prefixes and suffixes
      WHEN name ~ '^(株式会社|有限会社|合同会社)' THEN
        regexp_replace(
          regexp_replace(name, '^(株式会社|有限会社|合同会社)', ''),
          '薬局$',
          ''
        )
      -- Use name as-is, remove '薬局' suffix if exists
      ELSE
        regexp_replace(name, '薬局$', '')
    END
  ] as extracted_store_names
FROM user_profiles
WHERE user_type IN ('pharmacy', 'store')
  AND (store_names IS NULL OR array_length(store_names, 1) = 0 OR array_length(store_names, 1) IS NULL)
  AND name IS NOT NULL
  AND name != ''
ORDER BY name;

-- Preview: What will be updated
-- Expected results based on your data:
-- 神明堂 -> ["神明堂"]
-- 株式会社グラム -> ["グラム"]
-- 合同会社クラマス(ヤシの木) -> ["ヤシの木"]
-- 株式会社ノムラ薬局 -> ["ノムラ"]
-- 株式会社メディカルアライアンス(スマートスマイル) -> ["スマートスマイル"]
-- 有限会社フラワーズ(フラワー) -> ["フラワー"]
-- 有限会社メイプル薬局 -> ["メイプル"]
-- 有限会社スケガワ(とまと) -> ["とまと"]
-- 有限会社あおいメディカル -> ["あおいメディカル"]
-- 株式会社ふぁるめど(岡田薬局) -> ["岡田"]
-- 株式会社Re-pharame(つばさ薬局) -> ["つばさ"]
-- 有限会社エイファーマ(きたぞの) -> ["きたぞの"]
-- 日本機材販売株式会社(ぞうさん) -> ["ぞうさん"]
