# 環境・過去問 棚卸し

## 環境の有効化
- ~/.zshrc: `use-pyenv`(pyenv有効化) / `use-conda`(anaconda3-2024.10-1) / `disable-python-env`。既定では python は未設定(/usr/bin/python3 のみ)。
- 今回は OCR を CLI(tesseract)だけで実施でき、Python 仮想環境は不要と判断したため作成していない。Python が必要になれば `use-conda` 後に `conda create -n sc-exam python=3.11 pymupdf pytesseract` を推奨(既存環境は変更しない)。

## ツール
- poppler: /opt/homebrew/bin/pdftotext, pdftoppm, pdfinfo
- tesseract: /opt/homebrew/bin/tesseract(jpn, jpn_vert, eng あり)
- node: ~/.nvm/versions/node/v23.10.0/bin/node
- mutool なし
- 自作: tools/pdf2png.sh(PDF→頁PNG), tools/ocr.sh(PDF→OCRテキスト)

## 取り込み方法の評価
- 全PDFはテキスト層なし(pdftotext は改行のみ)。サイズは A4 相当、午前II 16頁、午後 40頁程度。
- OCR (jpn+eng, psm6, 200dpi): 本文・選択肢は概ね良好(1頁約1.5秒)。ただし誤認識あり(例: 項番「10.」→「19.」、「ツールF」→「ツールト」、「枯渇」→「枯潟」、ア〜エ選択肢の混入)。
  図・構成図・表は崩れ、空欄の枠内文字(ア〜エ, a〜c)は欠落。ログ表・数値は信用できない。
- 目視(pdftoppm -r 150 -png で頁画像化し Read で閲覧): 図、表、空欄 a〜d、項番まで正確に読める。
- 推奨: 午前II は OCR で下書き→選択肢・数式・図を含む問は目視で確認。午後は目視(頁画像)を基本とし、OCRは本文検索・下書き補助に限定。解答(ans)/解説(cmnt)も目視で照合。
- 手順: `tools/pdf2png.sh past_exam/XXX_qs.pdf <dir> 5 6 150` → Read で `<dir>/p-05.png`。

## PDF一覧(合計 65 ファイル、8回: 2022-2025 の春・秋)
接頭辞 `YYYYrNNx_`、x: h=春, a=秋。koudo_am1=午前I(高度共通), sc_am2=午前II, sc_pm/pm1/pm2=午後。
○=あり ×=なし -=該当なし(午前に解説PDFなし)

| 年度 | 期 | 区分 | qs | ans | cmnt |
|---|---|---|---|---|---|
| 2022 | 春 | koudo_am1 | ○ | ○ | - |
| 2022 | 春 | sc_am2 | ○ | ○ | - |
| 2022 | 春 | sc_pm1 | ○ | ○ | ○ |
| 2022 | 春 | sc_pm2 | ○ | ○ | ○ |
| 2022 | 秋 | koudo_am1 | ○ | ○ | - |
| 2022 | 秋 | sc_am2 | ○ | ○ | - |
| 2022 | 秋 | sc_pm1 | ○ | ○ | ○ |
| 2022 | 秋 | sc_pm2 | ○ | ○ | ○ |
| 2023 | 春 | koudo_am1 | ○ | ○ | - |
| 2023 | 春 | sc_am2 | ○ | ○ | - |
| 2023 | 春 | sc_pm1 | ○ | ○ | ○ |
| 2023 | 春 | sc_pm2 | ○ | ○ | ○ |
| 2023 | 秋 | koudo_am1 | ○ | ○ | - |
| 2023 | 秋 | sc_am2 | ○ | ○ | - |
| 2023 | 秋 | sc_pm | ○ | ○ | ○ |
| 2024 | 春 | koudo_am1 | ○ | ○ | - |
| 2024 | 春 | sc_am2 | ○ | ○ | - |
| 2024 | 春 | sc_pm | ○ | ○ | ○ |
| 2024 | 秋 | koudo_am1 | ○ | ○ | - |
| 2024 | 秋 | sc_am2 | ○ | ○ | - |
| 2024 | 秋 | sc_pm | ○ | ○ | ○ |
| 2025 | 春 | koudo_am1 | ○ | ○ | - |
| 2025 | 春 | sc_am2 | ○ | ○ | - |
| 2025 | 春 | sc_pm | ○ | ○ | ○ |
| 2025 | 秋 | koudo_am1 | ○ | ○ | - |
| 2025 | 秋 | sc_am2 | ○ | ○ | - |
| 2025 | 秋 | sc_pm | ○ | ○ | ○ |
## 結果
- 回数: 8回(2022春/秋、2023春/秋、2024春/秋、2025春/秋)。
- 午後が pm1/pm2 に分かれるのは 2022春・2022秋・2023春。それ以外は pm 単一。
- 欠落: なし(全区分で qs/ans が揃い、午後は cmnt も揃う)。
