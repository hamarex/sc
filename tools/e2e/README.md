# e2e(docs/index.html の動作確認)

Playwright(playwright-core)で `docs/index.html` を `file://` で開いて確認する。依存は `tools/e2e/` 内(`node_modules/`)に閉じる。`docs/` には何も置かない。

## 準備と実行

```sh
cd ~/develop/sc/tools/e2e
npm install                 # 初回のみ(playwright-core 1.49.1)
node run.js                 # 全8回の模試を含む全項目(約30秒)
node run.js --quick         # 模試は 2025a のみ(約15秒)
node run.js --headed        # ブラウザを表示
```

ブラウザはシステムの Google Chrome(`channel: 'chrome'`)を使う。無い場合は `CHROME_PATH=/path/to/chrome node run.js`、
または `npx playwright-core install chromium` で取得する。終了コードは 0=全通過、1=失敗あり、2=スクリプト異常。

## 確認内容

- ホーム表示 → 第1章メニュー → 全レッスン(本文、確認クイズ、休憩画面)→ サンプル問題 → 仕上げ問題(全問正解で合格・第2章解錠、全問不正解で不合格・第3章ロック維持)
- 模試: 8回 × 午前I/午前II(全問回答の一部/未回答を混ぜて提出、得点・全問解説数・誤答のみ表示の件数を検証)、午後(大問選択 → 記述 → 自己採点 → 結果)
- 模試履歴、間違いメモ、復習
- 設定: 合格基準・全章開放、進捗の書き出し(`sc-progress-YYYYMMDD.json` が localStorage `sc.progress.v1` と一致)→ 消去 → 読み込みで復元、不正ファイル読み込みで進捗不変
- コンソールエラー、ページエラー、読み込み失敗が0件

テストは `docs/data.js` の内容(`window.DATA`)から正解番号を読んで操作するため、データ更新後もそのまま使える。
