#!/usr/bin/env python3
"""
複数の画像を一括でリサイズするスクリプト
"""

import sys
from pathlib import Path
from PIL import Image


def resize_images_in_directory(
    directory: str,
    max_dimension: int = 2000,
    output_directory: str = None,
    extensions: tuple = ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif')
):
    """
    ディレクトリ内のすべての画像をリサイズします。

    Args:
        directory: 入力ディレクトリ
        max_dimension: 最大寸法（ピクセル）
        output_directory: 出力ディレクトリ（Noneの場合は元のファイルを上書き）
        extensions: 処理する画像拡張子のタプル
    """
    input_dir = Path(directory)

    if not input_dir.exists():
        print(f"エラー: ディレクトリが見つかりません: {directory}")
        sys.exit(1)

    if not input_dir.is_dir():
        print(f"エラー: パスがディレクトリではありません: {directory}")
        sys.exit(1)

    # 出力ディレクトリを作成
    if output_directory:
        output_dir = Path(output_directory)
        output_dir.mkdir(parents=True, exist_ok=True)
    else:
        output_dir = input_dir

    # 画像ファイルを検索
    image_files = []
    for ext in extensions:
        image_files.extend(input_dir.glob(f"*{ext}"))
        image_files.extend(input_dir.glob(f"*{ext.upper()}"))

    if not image_files:
        print(f"画像ファイルが見つかりませんでした: {directory}")
        return

    print(f"{len(image_files)}個の画像を処理します...")
    print()

    processed = 0
    skipped = 0
    errors = 0

    for img_path in image_files:
        try:
            # 画像を開く
            img = Image.open(img_path)
            width, height = img.size

            # 出力パスを決定
            output_path = output_dir / img_path.name

            # すでに制限内の場合
            if width <= max_dimension and height <= max_dimension:
                print(f"スキップ: {img_path.name} ({width}x{height})")
                if output_directory and output_path != img_path:
                    img.save(output_path, quality=95, optimize=True)
                skipped += 1
                continue

            # アスペクト比を保持してリサイズ
            if width > height:
                new_width = max_dimension
                new_height = int(height * (max_dimension / width))
            else:
                new_height = max_dimension
                new_width = int(width * (max_dimension / height))

            # リサイズ実行
            resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            resized_img.save(output_path, quality=95, optimize=True)

            print(f"リサイズ: {img_path.name} ({width}x{height} → {new_width}x{new_height})")
            processed += 1

        except Exception as e:
            print(f"エラー: {img_path.name} - {e}")
            errors += 1

    print()
    print(f"完了: {processed}個リサイズ, {skipped}個スキップ, {errors}個エラー")


def main():
    if len(sys.argv) < 2:
        print("使い方:")
        print("  python resize_images_batch.py <ディレクトリ> [出力ディレクトリ] [最大サイズ]")
        print()
        print("例:")
        print("  python resize_images_batch.py ./images")
        print("  python resize_images_batch.py ./images ./resized")
        print("  python resize_images_batch.py ./images ./resized 1500")
        print()
        print("デフォルトの最大サイズ: 2000ピクセル")
        print("出力ディレクトリを指定しない場合、元のファイルを上書きします")
        sys.exit(1)

    directory = sys.argv[1]
    output_directory = sys.argv[2] if len(sys.argv) > 2 else None
    max_dimension = int(sys.argv[3]) if len(sys.argv) > 3 else 2000

    resize_images_in_directory(directory, max_dimension, output_directory)


if __name__ == "__main__":
    main()
