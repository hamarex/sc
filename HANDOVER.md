# 引継ぎ書: 情報処理安全確保支援士(SC)学習アプリ

作成日: 2026-11-17

## 1. 概要

- 目的: 元アプリ `~/develop/gaimuin/docs/`(証券外務員の学習アプリ)と同じ仕様の学習アプリを、情報処理安全確保支援士向けに作る(`require.md` 参照)。
- 成果物: `docs/index.html`, `docs/logic.js`, `docs/data.js` の3ファイルのみ。ビルド不要の静的HTMLで、`file://` で開いて動く。
- 状態: 一通り完成済み。残課題は「5. 残課題」のみ。

## 2. 仕様(要点)

- 構成: ホーム → 章ごとに分割(12章、テーマ別)。各章は「中項目のレッスン」「サンプル問題(1〜2問・解説つき)」「章末の仕上げ問題(5〜7問・解説つき・なるべく過去問に合わせる)」。
- 模試モード: 2022〜2025年の春秋8回分の過去問を、年度・回・区分を選んで受験できる。解錠条件なし。終了時に全問解説を表示する。
  - 午前I(30問)・午前II(25問)は自動採点。
  - 午後は記述式のため、解答例と採点講評を見ながらの自己採点。
- 章は「年度・回」で作らない(ユーザー指示)。
- 午前の選択肢はア〜エの四肢(元アプリの五肢から変更)。
- 進捗は localStorage のキー `sc.progress.v1`。設定画面から書き出し・読み込みができる。
- 図表は画像にせず、表は table、図はテキスト(`pre.fig`)で表現する。

詳細は `tools/SPEC.md`(スキーマ、章立て、ID規則、解説の品質基準、`logic.js` の公開関数)。

## 3. ファイル構成

| パス | 内容 |
|---|---|
| `require.md` | 元の要件と実行方針 |
| `past_exam/` | 元データ(PDF 65本、8回分)。変更禁止 |
| `docs/` | 成果物の3ファイル |
| `tools/SPEC.md` | 仕様書(データ形式、画面、担当割り当て) |
| `tools/INVENTORY.md` | 環境とPDF一覧、OCR/目視の推奨手順 |
| `tools/work/` | 担当別の元データ(JSON)。`chapters/chNN.{lessons,qs}.json`、`exams/{回}-{kind}.json` |
| `tools/build_data.js` | `tools/work/` から `docs/data.js` を生成 |
| `tools/validate.js` | データ整合の検証(`--strict`) |
| `tools/test_logic.js` | `logic.js` の単体テスト(23件) |
| `tools/pdf2png.sh`, `tools/ocr.sh` | PDFをページ画像・OCRテキストにする補助 |

## 4. 作業コマンド

```sh
cd ~/develop/sc
node tools/build_data.js          # docs/data.js を再生成
node tools/validate.js --strict   # 期待: ERROR 0 / WARN 0
node tools/test_logic.js          # 期待: 23件通過
open docs/index.html              # 動作確認
node tools/verify_am_answers.js am1   # 午前答の照合(am2 も)
(cd tools/e2e && node run.js)        # ブラウザ検証
```

- データの修正は `tools/work/` の JSON を直し、`build_data.js` で `docs/data.js` を作り直す。`docs/data.js` を直接編集しない。
- `docs/` には3ファイル以外を置かない。

## 5. 残課題

1. **午前・午後の照合(完了)**
   - 午前440問(午前I 240・午前II 200)を公式解答PDFと照合済み。不一致0(`node tools/verify_am_answers.js am1|am2`)。2022h am1 は画像を目視転記して照合。
   - 午後は全35大問を機械照合し、2025春 問3 設問2(2)を修正済み。
2. **午後の配点(確定)**
   - 公式PDFに配点の記載がないため取得不可。現状どおり区分の満点を選択数で等分する。
3. **解説の内容確認(任意)**
   - 解説は全問に付いている(欠落0)が、内容は生成物。誤り選択肢の指摘や、午後の記述の根拠に誤りがないか抜き取りでレビューするとよい。
4. **ブラウザ検証スクリプト(再作成済み)**
   - `tools/e2e` に Playwright で再作成済み(`cd tools/e2e && node run.js`、37件通過)。


## 6. 既知の注意点

- 問題PDFは全て画像のみ(テキスト層なし)。OCR(tesseract jpn)は本文と選択肢なら読めるが、図表・空欄・数値は崩れる。取り込みは目視が基本(`pdftoppm -r 150` で画像にして確認)。解答PDF(`ans`)と採点講評(`cmnt`)はテキストで読める。
- 午後が午後I/午後IIに分かれる回は 2022春、2022秋、2023春。ほかは `pm` 1本。2022年春の過去問は後から追加された。
- 第9章 c09-l02 のタイトル「MITRE ATT&CK」の `&` は、アプリ側でエスケープされる。`validate.js` のプレーン文字列検査は `<` `>` のみ禁止に緩めてある。
- 仮想環境は作っていない(CLI のみで足りたため)。必要になれば `use-conda` で `conda create -n sc-exam python=3.11 pymupdf pytesseract`。切り替えは `~/.zshrc` の `use-pyenv` / `use-conda` / `disable-python-env`。必要なツール: poppler(pdftoppm, pdftotext)、tesseract(jpn+eng)、node。
- 運用方針(`require.md`): オーケストレーターは実作業をせず、サブエージェント(並列5台まで)に指示する。メインは medium、解説生成のように正確性が要る担当だけ effort high。利用上限に当たった場合は、上限の解除後に同じエージェントへ SendMessage で再開させる。

## 7. 件数(2026-11-17 時点)

- 章12、レッスン86、ページ190、ページ内クイズ343、サンプル24(各章2)、仕上げ83(各章6〜7、過去問参照は全て解決)。
- 試験8回: 午前I 30問×8=240、午前II 25問×8=200、午後35大問・340設問。全問に解説あり。
