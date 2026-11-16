#!/bin/zsh
# 使い方: ocr.sh <pdf> <出力txt> [dpi=200]
# 全頁を tesseract(jpn+eng, psm6)でOCR。図表・空欄は不正確なので目視と併用すること。
set -eu
pdf="$1"; out="$2"; r="${3:-200}"
tmp=$(mktemp -d)
pdftoppm -r "$r" -png "$pdf" "$tmp/p"
: > "$out"
for f in "$tmp"/p-*.png; do
  echo "=== $(basename $f) ===" >> "$out"
  tesseract "$f" - -l jpn+eng --psm 6 2>/dev/null >> "$out"
done
rm -rf "$tmp"
