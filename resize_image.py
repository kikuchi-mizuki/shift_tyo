#!/usr/bin/env python3
"""
画像を自動リサイズするスクリプト
Claude Code APIの制限（2000ピクセル以下）に合わせて画像をリサイズします。
"""

import sys
from pathlib import Path
from PIL import Image


def resize_image(input_path: str, max_dimension: int = 2000, output_path: str = None) -> str:
    """
    画像をリサイズして保存します。

    Args:
        input_path: 入力画像のパス
        max_dimension: 最大寸法（ピクセル）
        output_path: 出力画像のパス（Noneの場合は元のファイルを上書き）

    Returns:
        保存した画像のパス
    """
    # 画像を開く
    img = Image.open(input_path)

    # 現在のサイズを取得
    width, height = img.size

    # すでに制限内の場合はスキップ
    if width <= max_dimension and height <= max_dimension:
        print(f"画像サイズは既に{max_dimension}ピクセル以下です: {width}x{height}")
        if output_path and output_path != input_path:
            img.save(output_path, quality=95, optimize=True)
            return output_path
        return input_path

    # アスペクト比を保持してリサイズ
    if width > height:
        new_width = max_dimension
        new_height = int(height * (max_dimension / width))
    else:
        new_height = max_dimension
        new_width = int(width * (max_dimension / height))

    # リサイズ実行
    resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # 出力パスを決定
    if output_path is None:
        output_path = input_path

    # 保存（品質を保持）
    resized_img.save(output_path, quality=95, optimize=True)

    print(f"リサイズ完了: {width}x{height} → {new_width}x{new_height}")
    print(f"保存先: {output_path}")

    return output_path


def main():
    if len(sys.argv) < 2:
        print("使い方:")
        print("  python resize_image.py <画像ファイル> [出力ファイル] [最大サイズ]")
        print()
        print("例:")
        print("  python resize_image.py image.png")
        print("  python resize_image.py image.png resized.png")
        print("  python resize_image.py image.png resized.png 1500")
        print()
        print("デフォルトの最大サイズ: 2000ピクセル")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    max_dimension = int(sys.argv[3]) if len(sys.argv) > 3 else 2000

    # ファイルの存在チェック
    if not Path(input_path).exists():
        print(f"エラー: ファイルが見つかりません: {input_path}")
        sys.exit(1)

    try:
        resize_image(input_path, max_dimension, output_path)
    except Exception as e:
        print(f"エラー: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
