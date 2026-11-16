#!/bin/zsh
# 使い方: pdf2png.sh <pdf> <出力先ディレクトリ> [開始頁] [終了頁] [dpi=150]
# 出力: <dir>/p-NN.png (Read ツールで目視可能)
set -eu
pdf="$1"; out="$2"; f="${3:-1}"; l="${4:-9999}"; r="${5:-150}"
mkdir -p "$out"
pdftoppm -r "$r" -png -f "$f" -l "$l" "$pdf" "$out/p"
ls "$out"
