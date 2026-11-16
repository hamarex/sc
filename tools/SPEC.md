# SC(情報処理安全確保支援士)学習アプリ 仕様書 v1

対象: `docs/index.html` + `docs/logic.js` + `docs/data.js` の3ファイルのみ(ビルド不要の静的HTML、外部CDN・画像・フォント禁止)。
元アプリ `/Users/hiroham/develop/gaimuin/docs/` の仕様を踏襲する(ホーム/章解錠/レッスンのページ送り/ページ内クイズ/章末テスト/復習/誤り報告(間違いメモ)/設定/localStorage 進捗の保存・書き出し・読み込み)。
元アプリとの差分は §0 に集約。**全担当はこの SPEC を最初に全文読み、以後は担当範囲だけを見ること。**

## 0. 元アプリからの差分(要点)

| 項目 | 元アプリ | 本アプリ |
|---|---|---|
| 構成 | 章 → レッスン → ページ(○×クイズ) → 章末テスト | 章 → 中項目(=lesson)→ページ(ページ内クイズ)→ **サンプル問題 → 仕上げ問題(章末テスト)** |
| 問題形式 | ○×(ox) と五肢(mc) | ページ内=○×(ox)、サンプル/仕上げ/午前=四肢択一(mc4、ア〜エ) |
| 総仕上げ(本番形式) | 全章合格で解放、ランダム出題 | **廃止し「模試モード」に置換**。過去問8回分を常時選択受験可(ロック無し) |
| 午後 | なし | 記述式。解答例・採点キーポイント・講評を見ながら自己採点 |
| 解説 | explain 文字列/配列 | 構造化 `explain`(結論→根拠→誤り選択肢)。§3.4 |
| データ操作 | 破壊的更新 | **イミュータブル**(関数は新オブジェクトを返す) |
| localStorage キー | `gaimuin.progress.v1` | `sc.progress.v1` |
| 合格基準 | 章末テスト 正答率70%(設定可)、総仕上げ308点 | 仕上げ問題 正答率70%(設定可)。模試: 午前 60%、午後 60%(自己採点の目安) |

## 1. 章立て(12章)

章は「年度・回」ではなくテーマ別。**lesson = 中項目**(下表の番号付き項目 1つ=lesson 1つ、順序固定)。
lesson ID は `c{章2桁}-l{連番2桁}`(例: 第4章の3番目 = `c04-l03`)。タイトルは下表の文字列を一字一句そのまま使う(validate が照合)。

`field` は章のタグ文字列(試験データの `field` と同一値)。「試験区分」は出題分野との対応(午前I=高度共通、午前II=SC専門、午後=記述)。

### 第1章 情報セキュリティの基礎とリスクマネジメント(field: `基礎・リスク`)
対応: 午前II「情報セキュリティ及びリスクの概念」/ 午後: リスク分析系の設問
1. 情報セキュリティの3要素(CIA)と追加の特性(真正性・責任追跡性・否認防止・信頼性)
2. 脅威・脆弱性・攻撃・資産の関係と分類
3. リスクの概念と対応(回避・低減・移転・保有)
4. リスクアセスメント(資産評価・ベースライン/詳細・JIS Q 27005)
5. セキュリティ設計原則(多層防御・最小権限・職務分離・フェールセーフ・Defense in Depth)
6. 対策の分類(予防・検知・対応・回復、技術的/物理的/人的/組織的)
7. 事業継続(BCP/BCM・RTO・RPO・BIA)

### 第2章 情報セキュリティマネジメントとガバナンス・監査(field: `マネジメント・監査`)
対応: 午前II「情報セキュリティマネジメント」/ 午前I マネジメント系(監査)/ 午後: 組織・体制・委託先
1. ISMS(JIS Q 27001/27002・PDCA・適用宣言書)
2. 情報セキュリティ方針・規程・組織体制(CISO・委員会・役割と責任)
3. 情報セキュリティガバナンスと内部統制(ISO/IEC 27014・COBIT・経営ガイドライン)
4. 委託先管理・サプライチェーンリスク管理(SBOM・契約・再委託)
5. 情報セキュリティ監査・システム監査(監査基準・管理基準・証拠)
6. 教育・訓練・人的対策(啓発・内部不正対策・テレワーク規程)
7. 評価・認証制度(ISMS認証・ISMAP・CC/ISO 15408・PCI DSS・CSMS・JCMVP)

### 第3章 法令・制度・ガイドライン(field: `法令・制度`)
対応: 午前II「関連法規」/ 午前I ストラテジ系(企業と法務)/ 午後: 法対応・報告義務
1. 個人情報保護法とマイナンバー法(安全管理措置・漏えい等報告)
2. 不正アクセス禁止法・刑法(不正指令電磁的記録・電子計算機損壊等業務妨害)
3. 不正競争防止法(営業秘密)・著作権法・特許
4. サイバーセキュリティ基本法・電気通信事業法・特定電子メール法・プロバイダ責任制限法
5. 電子署名法・電子帳簿保存法・タイムスタンプ・eシール
6. 国内外のガイドラインと標準(政府統一基準・NIST CSF/SP 800・GDPR・CRYPTREC)
7. 契約・労務(秘密保持契約・請負/派遣・労働関連法・公益通報者保護法)

### 第4章 暗号技術とPKI(field: `暗号・PKI`)
対応: 午前II「暗号」「PKI」/ 午後: 暗号・証明書の設問
1. 共通鍵暗号(AES・ブロック暗号モード CBC/CTR/GCM・ChaCha20)
2. 公開鍵暗号(RSA・ECC・Diffie-Hellman 鍵交換・前方秘匿性)
3. ハッシュ関数・MAC・パスワードハッシュ(HMAC・bcrypt/PBKDF2/Argon2・ソルト)
4. 電子署名とタイムスタンプ
5. PKI と X.509 証明書(CA・失効 CRL/OCSP・証明書の透明性・EV/DV)
6. 鍵管理と乱数(HSM・鍵のライフサイクル・疑似乱数)
7. 暗号プロトコル(TLS 1.2/1.3・IPsec・SSH・S/MIME)と暗号の危殆化・耐量子暗号
8. 暗号への攻撃(総当たり・誕生日攻撃・パディングオラクル・サイドチャネル攻撃)

### 第5章 認証・認可・アクセス制御(field: `認証・認可`)
対応: 午前II「認証」「アクセス制御」/ 午後: 認証基盤・SSO・特権ID
1. 認証の要素と多要素認証・パスワード管理とパスワード攻撃対策
2. 生体認証・FIDO2/パスキー・ワンタイムパスワード(HOTP/TOTP)
3. 認証プロトコル(Kerberos・RADIUS・TACACS+・EAP・IEEE 802.1X)
4. シングルサインオンとフェデレーション(SAML・OAuth 2.0・OpenID Connect・JWT)
5. アクセス制御モデル(DAC/MAC/RBAC/ABAC・Bell-LaPadula・Biba)
6. ID管理と特権ID管理(ディレクトリ・LDAP/AD・IDaaS・SCIM・PAM)
7. ゼロトラストと条件付きアクセス

### 第6章 ネットワークセキュリティ(field: `ネットワーク`)
対応: 午前II「ネットワークセキュリティ」/ 午前I テクノロジ系(ネットワーク)/ 午後: NW構成・ログ・FW設計
1. プロトコルと攻撃の基礎(ARP・DHCP・ICMP・TCP・パケット分析)
2. FW・次世代FW・IDS/IPS・UTM・WAF・プロキシ
3. VPN とリモートアクセス(IPsec・SSL-VPN・WireGuard・ZTNA・SASE)
4. DNS のセキュリティ(キャッシュポイズニング・DNSSEC・DoH/DoT・DNSリフレクション)
5. メールセキュリティ(SPF・DKIM・DMARC・STARTTLS・S/MIME・フィッシング対策)
6. 無線LAN・Bluetooth・モバイル通信(WPA3・802.1X・5G)
7. DoS/DDoS・可用性・ネットワーク設計(DMZ・セグメンテーション・マイクロセグメンテーション)

### 第7章 Webアプリケーションセキュリティとセキュア開発(field: `Web・開発`)
対応: 午前II「アプリケーションセキュリティ」「セキュア開発」/ 午後: Web脆弱性・開発プロセス・診断
1. Web の基礎機構(HTTP・Cookie・同一生成元ポリシー・CORS・CSP・HSTS)
2. Web の脆弱性(SQLi・XSS・CSRF・SSRF・XXE・OSコマンドインジェクション・パストラバーサル)
3. 認証・セッション管理の実装(セッション固定・ハイジャック・パスワードリセット)
4. セキュア開発ライフサイクル(SDLC・脅威モデリング STRIDE・DevSecOps・SAST/DAST/IAST/SCA・SBOM)
5. API・スマートフォンアプリ・クラウドネイティブアプリのセキュリティ
6. 脆弱性診断・ペネトレーションテスト・ファジング・バグバウンティ
7. メモリ破壊系の脆弱性と対策(バッファオーバフロー・ASLR・DEP)・コード署名

### 第8章 システム・クラウド・IoT/OT のセキュリティ(field: `システム・クラウド`)
対応: 午前II「システム・インフラのセキュリティ」/ 午前I テクノロジ系(システム構成)/ 午後: クラウド構成・端末管理
1. OS・サーバ・端末の防御(ハードニング・パッチ管理・EDR・MDM・Secure Boot・TPM)
2. クラウドのセキュリティ(責任共有・IAM・CASB・CSPM・KMS)
3. 仮想化・コンテナ・Kubernetes・サーバレスのセキュリティ
4. データ保護(DB暗号化・マスキング・トークナイゼーション・DLP・バックアップ)
5. IoT・OT・制御システム(IEC 62443・ICS・組込み機器)
6. 物理・環境セキュリティと耐タンパ性(入退室管理・電波/電磁漏えい・サイドチャネル)
7. テレワーク・BYOD・モバイル端末管理
8. AI・機械学習システムの安全性(敵対的サンプル・データポイズニング・プロンプトインジェクション)

### 第9章 脅威・マルウェア・攻撃手法(field: `脅威・マルウェア`)
対応: 午前II「脅威と攻撃」「脆弱性情報」/ 午後: マルウェア・標的型攻撃・脆弱性評価(CVSS 等)
1. マルウェアの種類と動作(ウイルス・ワーム・トロイの木馬・ボット・ファイルレス・RAT)
2. 標的型攻撃(APT・サイバーキルチェーン・MITRE ATT&CK・Living off the Land・ラテラルムーブメント・C2)
3. ランサムウェアと二重脅迫・被害の想定
4. ソーシャルエンジニアリング・フィッシング・BEC
5. 脆弱性情報と評価(CVE・CWE・CVSS・EPSS・SSVC・KEV・JVN)
6. サプライチェーン攻撃・ゼロデイ攻撃
7. 脅威インテリジェンスと情報共有(STIX/TAXII・IoC・TTP・J-CSIP・ISAC・JPCERT/CC・IPA)
8. マルウェア解析(静的解析・動的解析・サンドボックス・YARA)

### 第10章 インシデント対応・セキュリティ運用・フォレンジック(field: `インシデント・運用`)
対応: 午前II「セキュリティ運用」「インシデント対応」/ 午後: ログ解析・初動対応・CSIRT/SOC
1. インシデント対応プロセス(準備・検知・分析・封じ込め・根絶・復旧・教訓、NIST SP 800-61・JIS Q 27035)
2. CSIRT・SOC・MDR・SOAR の体制と役割
3. ログ管理・SIEM・監視(Windowsイベントログ・プロキシ/DNS/EDRログ・時刻同期)
4. デジタルフォレンジックと証拠保全(Chain of custody・ディスクイメージ・メモリフォレンジック)
5. 脆弱性管理・パッチ管理・構成管理・資産管理(ASM)
6. 事業継続・DR・バックアップとレジリエンス・インシデントの報告と公表
7. ペネトレーションテスト・レッドチーム・演習(机上演習・TLPT)
8. ログと証跡からの攻撃経路の読み解き(午後対策)

### 第11章 IT基盤技術(午前I テクノロジ系)(field: `IT基盤`)
対応: 午前I「テクノロジ系」(基礎理論・アルゴリズム・コンピュータ・DB・ネットワーク・開発)
1. 基礎理論(2進数・確率統計・情報理論・論理演算・オートマトン)
2. アルゴリズムとデータ構造・プログラミング
3. コンピュータ構成要素・性能・信頼性(MTBF/MTTR・稼働率・RAID)・OS・仮想化
4. データベース(正規化・SQL・トランザクション・排他制御)
5. ネットワーク技術(TCP/IP・ルーティング・HTTP・IPv6)
6. システム開発技術(設計・テスト・アジャイル・ソフトウェア工学)

### 第12章 マネジメント・ストラテジ・企業活動(午前I マネジメント/ストラテジ系)(field: `マネジメント基盤`)
対応: 午前I「マネジメント系」「ストラテジ系」
1. プロジェクトマネジメント(PMBOK・クリティカルパス・EVM)
2. サービスマネジメント(ITIL・障害/変更/問題管理・SLA・JIS Q 20000)
3. システム監査と内部統制(監査人の独立性・監査証拠・COSO)
4. システム戦略と経営戦略(EA・BPR・SWOT・ERP・DX・IT投資評価)
5. 企業活動(財務会計・損益分岐点・在庫・OR・標準化)
6. システム企画・調達(要件定義・RFP・契約形態)

### 試験区分(午前/午後)の field・chapter タグ
- **午前I(am1)**: `category` = `technology` / `management` / `strategy`(高度共通の分野)。`chapter` は原則 11・12、セキュリティ系の問は 1〜10 のうち最適な章。
- **午前II(am2)**: `chapter` = 1〜10(最も近い章。迷ったら主題の章)。
- **午後**: 大問ごとに `chapters`(配列、主テーマ順、1〜3個)。
- 全問・全大問に `field`(=該当章の field 文字列)を付与(午後大問は `chapters[0]` の field)。

## 2. 試験データの対象(8回)

| 回ID | 年度/期 | 午前I | 午前II | 午後 |
|---|---|---|---|---|
| 2022h | 2022(R4)春 | am1 30問 | am2 25問 | pm1, pm2 |
| 2022a | 2022(R4)秋 | am1 30問 | am2 25問 | pm1, pm2 |
| 2023h | 2023(R5)春 | am1 30問 | am2 25問 | pm1, pm2 |
| 2023a | 2023(R5)秋 | am1 30問 | am2 25問 | pm(単一) |
| 2024h | 2024(R6)春 | am1 30問 | am2 25問 | pm |
| 2024a | 2024(R6)秋 | am1 30問 | am2 25問 | pm |
| 2025h | 2025(R7)春 | am1 30問 | am2 25問 | pm |
| 2025a | 2025(R7)秋 | am1 30問 | am2 25問 | pm |

回ID = `{YYYY}{h|a}`(h=春, a=秋。過去問PDFの `r04h` 等の h/a と同義)。区分 `kind` = `am1`/`am2`/`pm1`/`pm2`/`pm`。
元PDF: `past_exam/{YYYY}r{令和2桁}{h|a}_{koudo_am1|sc_am2|sc_pm1|sc_pm2|sc_pm}_{qs|ans|cmnt}.pdf`(午前に cmnt なし)。例 `past_exam/2025r07h_sc_pm_qs.pdf`。

## 3. data.js スキーマ

`docs/data.js` は `window.DATA = {...};` 1文(ビルド生成物。手編集禁止)。

```
DATA = { schema: 1, built: "ISO日時", chapters: [Chapter×12], exams: [Exam×8] }
```

### 3.1 文字列の種別(重要)
- **プレーン文字列**(アプリが escapeHtml して表示): `title`, `label`, `field`, `category`, `summary`, `topics[]`, `selectRule`, ID類。`<` `>` `&` を含めない。
- **HTML 断片**(アプリがそのまま innerHTML): 上記以外の全ての本文系(`html`, `stem`, `choices[]`, `text`, `explain.*`, `passage`, `prompt`, `answerExample`, `keyPoints[].text`, `comment`, `intent`, `review` 等)。
- HTML 断片で許可する要素: `p br b i em sub sup code pre ul ol li table thead tbody tr th td span div h4`(h4 はレッスン本文のみ)。
  - 許可属性: `class`(値は `key trap t fig code note blank` のみ。複数可)、`colspan` `rowspan`(数値)。**属性値は単引用符 `'` を使う**(JSON エスケープ回避。例 `<b class='key'>`)。
  - 禁止: `script style img svg a iframe link on*` 属性、`href`/`src`、`data:` URI、外部URL参照。
  - 文字としての `<` `>` `&` は必ず `&lt;` `&gt;` `&amp;` にする(コード・不等式・タグ名の例示も同様)。許可エンティティ: `&lt; &gt; &amp; &quot; &nbsp;` と数値参照。
  - `<pre>` 内以外で改行文字 `\n` を使わない(段落は `<p>`、改行は `<br>`)。
- 文字は全角/半角を原文どおり。丸数字・記号(①②、→、≦、×、÷、√、Σ)は Unicode のまま。上付/下付は `<sup>` `<sub>`。
- 用語強調 `<b class='key'>…</b>`、ひっかけ注意 `<span class='trap'>…</span>`、補足 `<div class='note'>…</div>`。

### 3.2 図表の扱い(画像は使わない)
画像ファイル・`<img>`・`data:` URI・`<svg>` は全面禁止(3ファイル縛りとサイズのため)。
1. **表** → `<table class='t'><thead><tr><th>…</th></tr></thead><tbody>…</tbody></table>`。結合セルは colspan/rowspan。
2. **構成図・ネットワーク図・フロー・シーケンス図** → `<pre class='fig'>` に罫線文字(┌ ─ ┐ │ └ ┘ ├ ┤ → ← ↔ ▼)かテキスト記法(`FW1 ──[DMZ]── Webサーバ` / シーケンスは `A → B : メッセージ`)で表す。幅は半角80桁以内。図の直後に `<p>` で凡例・補足があれば付す。
3. **文字化が困難な図**(複雑なグラフ、手書き風図等)→ ノード/辺/ラベル/数値/向きを漏れなく列挙した `<div class='note'>【図の文字起こし】…</div>`。設問を解くのに必要な情報は**必ず文字で残す**。
4. それでも情報が失われる場合のみ、その問に `figLossy: true` を付与し本文に `【図省略: 理由】` を明記する。**図に依存せず解ける形に問を補足してはならない**(出題を改変しない)。figLossy は全体の5%以下を目安とし、件数を完了報告に含める。
5. 空欄は半角で `[ a ]`(午後)。午前の空欄 a,b は `a` `b` を `<b>` で囲まない。選択肢が「a: X / b: Y」の組合せのときは choices 文字列を `a: X<br>b: Y` とする。
6. ログ・ソース・設定は `<pre class='code'>`(等幅・横スクロール)。行番号は原文のまま。
7. OCR 誤認識(「ト」↔「F」、数字の取り違え等)に注意。**図表・数式・空欄・コードを含む問と、解答(正解番号)は必ず頁画像を目視**して確認(§7)。

### 3.3 ID 命名規則(全て小文字、半角)
| 対象 | 形式 | 例 |
|---|---|---|
| 章 | `c{NN}` | `c04` |
| lesson(中項目) | `c{NN}-l{MM}` | `c04-l03` |
| page | `c{NN}-l{MM}-p{PP}` | `c04-l03-p02` |
| ページ内クイズ | `{pageId}-z{N}` | `c04-l03-p02-z1` |
| サンプル問題 | `c{NN}-s{N}` | `c04-s1`(N=1〜2) |
| 仕上げ問題 | `c{NN}-f{N}` | `c04-f3`(N=1〜) |
| 回 | `{YYYY}{h\|a}` | `2025h` |
| 区分 | `{回ID}-{kind}` | `2025h-am1`, `2022a-pm2` |
| 午前の問 | `{区分ID}-q{NN}` | `2024a-am2-q07`(NN=2桁) |
| 午後の大問 | `{区分ID}-p{N}` | `2025h-pm-p1`(N=問題冊子の問番号) |
| 午後の設問(採点単位) | `{大問ID}-q{S}[-{S2}]` | `2025h-pm-p1-q3-1`(設問3(1)), `…-q4`(設問4) |

ID は全データでユニーク。章を識別する正規表現 `/^c(\d{2})-/`。

### 3.4 問題オブジェクト

**ox(ページ内クイズ専用)**
```json
{ "id":"c01-l01-p01-z1", "type":"ox", "text":"HTML", "answer":true,
  "explain":{ "conclusion":"…", "basis":"…" } }
```
**mc4(サンプル・仕上げ・午前)**
```json
{ "id":"c04-s1", "type":"mc4", "stem":"HTML(表/図可)", "choices":["ア本文","イ本文","ウ本文","エ本文"],
  "answer":3,
  "explain":{ "conclusion":"…", "basis":"…", "wrong":["ア: …","イ: …","エ: …"] },
  "chapter":4, "field":"暗号・PKI", "tip":"(任意)暗記のコツ",
  "sourceExam":{ "exam":"2024a", "kind":"am2", "no":12, "kindOfUse":"verbatim" } }
```
- `choices` は**ラベル(ア〜エ)を含めない本文のみ**4個。`answer` は 1〜4(1=ア)。アプリが ア〜エ を付ける。
- `explain.wrong` は**正解以外の3選択肢を、番号順に1つずつ**。各項は `"ア: …"` のようにラベル始まり。
- `sourceExam`(仕上げ/サンプルのみ、無ければ省略): `kindOfUse` = `verbatim`(原文そのまま)/ `adapted`(一部改変)/ 省略=オリジナル。
- 午前の問のみ追加: `no`(問番号 int)、`kind`(`am1`|`am2`)、`category`(am1のみ)。
- 稀な例外(任意): `altAnswers:[int]`(複数正解扱い)、`voided:true`(IPA が全員正解とした問。この場合 `answer` は公式の正答、全員正解と explain に明記)。

**explain の書式**(結論 → 根拠 → 誤り選択肢の指摘。アプリは `L.explainToHtml` で整形)
- `conclusion`: 「正解はウ。〜である」のように**正解ラベルと結論を1文**で。
- `basis`: 用語定義・仕組み・計算過程・本文引用などの**根拠**。
- `wrong`(mc4必須): 各誤り選択肢がなぜ誤りか(別の概念との取り違え、条件の逆転、数値誤り等)。
- 計算問題は途中式を `basis` に書く。表・図は不要な再掲をしない。

**解説の最低品質基準(validate が機械検査、未達は error)**
- ox: `conclusion` ≥ 10字、`basis` ≥ 30字。
- mc4: `conclusion` ≥ 15字かつ正解ラベル(ア〜エ)を含む、`basis` ≥ 60字、`wrong` はちょうど3件で各 ≥ 15字・ラベル始まり・正解のラベルを含まない。
- 午後設問: §3.6。
- 全共通: `TODO` `省略` `後述` `同上` `解説略` `略` 単独 `…` のみ等のプレースホルダ禁止。正解番号と矛盾する解説は禁止(公式の解答が正。解説の論理が公式解答と合わない場合は `explain.basis` 末尾に `公式の正答に従う。〜` と理由を書き、完了報告に列挙)。
- **品質の本質**: 「その選択肢がなぜ○/×か」を、用語の定義や仕組みに踏み込んで説明する。正解文の言い換えだけの解説は不可。

### 3.5 Chapter スキーマ
```
Chapter = { id:"c04", no:4, title:"暗号技術とPKI", field:"暗号・PKI", summary:"章の概要(プレーン、80〜200字)",
            lessons:[Lesson], samples:[mc4 ×1〜2], finals:[mc4 ×5〜7] }
Lesson  = { id:"c04-l03", no:3, title:"(§1表のとおり)", topics:["小項目プレーン",…(3〜8個)], pages:[Page ×2〜4] }
Page    = { id:"c04-l03-p02", title:"プレーン", html:"HTML(§3.1)", quiz:[ox ×1〜2] }
```
- 各ページ: `html` は本文 400〜1200字程度、`<b class='key'>` を1個以上、見出し/箇条書き/表を使い読みやすく。1ページ=1トピック。
- ページ内クイズは**そのページの内容から答えられる**○×。1ページ1問以上(推奨1問、要点が複数なら2問)。
- 内容は SC 試験(令和4〜7年度)に即した正確な知識。用語は IPA/JIS/RFC/NIST の表記に従う。事実に自信がない記述は書かない。
- **samples**(1〜2問): 章の代表的な典型問題。解説は特に丁寧(基準の約1.5倍)。
- **finals**(5〜7問、章末テスト): 章の全 lesson を満遍なくカバー。**なるべく過去問に合わせる**(§3.7 ref 機構)。目標: 過去問由来(ref または sourceExam あり)が半数以上。難度は本試験相当。
- 章11・12 の finals は午前I の過去問(am1)中心。

### 3.6 Exam スキーマ
```
Exam    = { id:"2025h", year:2025, season:"h", era:"令和7年度", label:"2025年度 春期", sections:[Section] }   // sections は am1,am2,pm1,pm2,pm の順
Section(午前) = { id:"2025h-am1", kind:"am1", label:"午前I(高度共通)", timeLimitMin:50, total:30, questions:[mc4 ×total] }
Section(午後) = { id:"2025h-pm", kind:"pm", label:"午後", timeLimitMin:150, maxScore:100,
                  selectRule:"問1は必須。問2、問3から1問選択(プレーン、冊子の注意事項から転記)",
                  requiredNos:[1], chooseCount:1, problems:[Problem] }
Problem = { id:"2025h-pm-p1", no:1, title:"プレーン(例: サプライチェーンのリスク対策)", chapters:[7,9], field:"Web・開発",
            required:true, points:50|null,
            intent:"出題趣旨(HTML、IPA解答例PDFの『出題趣旨』を転記/要約)",
            review:"採点講評(HTML、IPA採点講評PDFの当該問を転記/要約。必須)",
            passage:"問題本文(HTML。表は table、図は §3.2。設問文は含めず状況説明・会話・ログ・表のみ)",
            questions:[Leaf] }
Leaf    = { id:"2025h-pm-p1-q3-1", label:"設問3(1)", no:"3(1)", points:null|number,
            prompt:"設問文(HTML。空欄 [ a ] を含む場合は本文どおり)",
            answerType:"text"|"blank"|"choice",
            answerExample:"IPA解答例(HTML。blank の場合は『a: …<br>b: …』)",
            blanks:[{key:"a", answer:"…"}]   // answerType=="blank" のとき必須。それ以外は省略
            keyPoints:[{ text:"採点キーポイント(HTML)", point:null|number }],   // 1個以上
            comment:"設問単位の採点講評(HTML)または null",
            explain:{ conclusion:"解答の骨子", basis:"本文のどの記述(〔見出し〕・行・表・図)から導くか", pitfalls:["よくある誤答と不足点",…] } }   // pitfalls は任意(推奨1〜3件)
```
- 午前: `timeLimitMin` は冊子表紙から転記(参考値: am1=50, am2=40)。`total`: am1=30, am2=25。
- 午後: `timeLimitMin` は冊子表紙から転記(参考値: pm1=90, pm2=120, pm=150)。`maxScore` 通常100。
  - **選択ルール**: `requiredNos`(必須の問番号配列、無ければ `[]`)、`chooseCount`(必須以外から選ぶ数)。旧 pm1 は通常 `requiredNos:[]`, `chooseCount:2`(3問から2問)、旧 pm2 は `chooseCount:1`(2問から1問)。冊子と一致させる(想定と違えば冊子を優先し完了報告に記す)。
  - `Problem.points`: 冊子に配点があれば数値、無ければ null。`Leaf.points`: IPA は設問別配点を公表しないので通常 null(配点が冊子/解答例にあるときのみ数値)。
- **Leaf = 採点単位**: 解答例PDFの設問番号の最小単位(設問2(1)、設問3(2)の a/b/c をまとめるか分けるかは解答例PDFの行構成に合わせる)。「設問番号と解答例の行が1対1」になる粒度。空欄 a〜d が1つの設問にまとまるものは1 Leaf に `blanks`。
- `keyPoints`: 解答例の要点を採点観点に分解(記述の例: 「〜というリスクに言及」「〜を防ぐ対策であること」)。`point` を付ける場合 Leaf 内で合計が `Leaf.points`。null の場合は均等配分。blank/choice は1キーポイントに「正答」を1個。
- 午後 explain 最低基準: `conclusion` ≥ 10字、`basis` ≥ 60字(本文の根拠箇所を示す)、`answerExample` ≥ 2字、`keyPoints` ≥ 1。`Problem.intent` と `review` は必須(非空)。採点講評に当該設問の言及があれば `comment` に入れ、なければ null。
- 午前解説の元データは存在しない(ans のみ)。**公式 ans と照合した正解**に対し、担当が自力で解説を書く。午後の `explain` は cmnt/ans PDF と本文から担当が作成(IPA解答例を `answerExample` に忠実に転記)。

### 3.7 仕上げ問題の ref 機構(過去問の再利用、データ重複の回避)
`chNN.qs.json` の `finals`/`samples` 要素は次のどちらか。
1. インライン問題(§3.4 の mc4、`id` は `c04-f3` 形式)。
2. 参照: `{ "id":"c04-f3", "ref":"2024a-am2-q12" }` — `build_data.js` が当該午前問を**新オブジェクトとして複製**し、`id` を `c04-f3` に差し替え、`chapter`/`field` を章に合わせ、`sourceExam:{exam,kind,no,kindOfUse:"verbatim"}` を自動付与する(元の exams 側は変更しない)。参照先が未生成の間は `--allow-missing` ビルドで無視、最終ビルドでは error。
- 参照できる問の探索: `node tools/build_data.js --tagged 4`(第4章タグの午前問を `ID | 問番号 | 冒頭40字` で一覧)。**章担当は、午前担当の work ファイルができてから(ls で確認)参照を追加してよい**。待たずに先にインラインのオリジナル/過去問準拠問で埋め、後から `ref` に置換するのが推奨手順。
- 図表依存の問は ref しない(`figLossy:true` の問は ref 禁止)。

## 4. 分割データ運用(厳密)

全て `tools/work/` 配下。1ファイル=単一 JSON(UTF-8、BOM無し、コメント無し、末尾カンマ無し)。`_` で始まるディレクトリ(例 `tools/work/_scratch/`)はビルド無視(画像・OCR 作業用)。各担当は **自分の所有ファイルのみ**書く。

### 4.1 ファイル配置
| パス | 中身 | 所有 |
|---|---|---|
| `tools/work/sample.json` | ダミー用完成形データ(§4.4) | A |
| `tools/chapters.json` | §1表の機械可読版 `[{no,id,title,field,lessons:[{id,title}]}]` | A(最初に作成) |
| `tools/work/chapters/ch{NN}.lessons.json` | `{ "id","no","title","field","summary","lessons":[Lesson] }` | 章担当(§5) |
| `tools/work/chapters/ch{NN}.qs.json` | `{ "samples":[…], "finals":[…] }`(§3.7 の ref 可) | 章担当 |
| `tools/work/exams/{回ID}-{kind}.json` | 午前: `{ "id","kind","label","timeLimitMin","total","questions":[…] }` / 午後: `{ "id","kind","label","timeLimitMin","maxScore","selectRule","requiredNos","chooseCount","problems":[…] }` | 試験担当 |
| `tools/work/exams/{回ID}-{kind}.part{N}.json` | 分割書き出し用(任意)。`{ "questions":[…] }` または `{ "problems":[…] }`。N=1,2,…の順に基底ファイルの配列へ連結 | 同上 |
| `docs/data.js` | 結合生成物 | A(最終ビルドのみ) |

- 例: `tools/work/exams/2025h-am1.json`, `2022a-pm2.json`, `2023a-pm.json`, `2022h-am2.part2.json`, `tools/work/chapters/ch04.qs.json`。
- 午前は 1ファイルに 30/25問を書いてよいが、1回の Write が大きすぎる場合は `.partN.json` に分ける(基底ファイルは `questions:[]`)。午後は大問ごとに part に分けることを推奨(`2025h-pm.json` に `problems:[]`、`2025h-pm.part1.json` に問1…)。
- 作業中の未完成ファイルは置かない(書き込みは1ファイルずつ完結させ、JSON として valid な状態を保つ)。

### 4.2 tools/build_data.js(node、依存なし)
- `node tools/build_data.js` : `tools/work/chapters/`・`tools/work/exams/` を読み、§3 の `DATA` を組み立てて `docs/data.js` に書く。
- オプション: `--out <path>`(出力先)、`--sample`(`tools/work/sample.json` をそのまま `window.DATA=` 形式で出力。work は読まない)、`--allow-missing`(欠けファイルを警告のみにして続行)、`--list`(ファイル別の有無と件数一覧: 章ごとの lessons/pages/quiz/samples/finals 数、試験区分ごとの 問数/大問数。**各担当の完了確認に使う**)、`--tagged <章番号>`(§3.7)。
- 処理: ① JSON 読込(パースエラーはファイル名・位置付きで失敗)② 章 = lessons ファイル + qs ファイルのマージ、③ ref 解決、④ part 連結、⑤ 回ごとに sections 組立て(順序 am1,am2,pm1,pm2,pm)、⑥ 回メタ(`year`,`season`,`era`,`label`)は build_data.js 内の固定表(2022=令和4 … 2025=令和7、h=春期/a=秋期)から付与、⑦ 回を `(year, h→a)` 昇順、章を no 昇順に整列、⑧ `JSON.stringify` で1行出力(U+2028/2029 はエスケープ)、先頭に `window.DATA = `、末尾に `;`。
- 必須ファイル欠落(章12×2、区分 am1/am2/pm* 全て)は `--allow-missing` 無しでは exit 1。
- **イミュータブル**: 読み込んだオブジェクトは変更せず、結合・ref 複製・整列は常に新オブジェクトを作る(`structuredClone`/スプレッド)。同一入力 → 同一出力(`built` 以外)。

### 4.3 tools/validate.js(§7)

### 4.4 tools/work/sample.json(A が最初に作る、B〜E は待たない)
DATA と同形(`{schema,built,chapters,exams}`)で、**全機能を動かせる最小量**を含む完成データ:
- chapters: 第1章・第2章のみ(`chapters.json` とは別に sample 専用で `no` 1,2)。各章: lessons 2、各 lesson に pages 2(各 `quiz` 1問 ox)、samples 1、finals 5(うち2問に `sourceExam`)。
- exams: `2025h`(am1 に3問、am2 に3問、pm 1区分: 大問2、問1は `required:true`、`requiredNos:[1]`, `chooseCount:1`)と `2022h`(pm1: 大問3、`chooseCount:2` と pm2: 大問2、`chooseCount:1`)の2回。
- 午後 Leaf は `text`/`blank`(blanks 2個)/`choice` を各1つ以上、`keyPoints` に `point` 有り/null の両方、`comment` 有り/null の両方を含める。
- passage または stem に **table と `<pre class='fig'>` と `<pre class='code'>` を各1つ以上**、選択肢に `&lt;script&gt;` を含む問を1つ(エスケープ確認用)。
- 午前の1問は `figLossy:true`、1問は `voided:true`。
- sample.json は `validate.js --sample`(個数チェックを緩和)を通ること。これを使って A が logic.js/index.html を先行開発する。**他の担当は sample.json の完成を待たず、本 SPEC のスキーマだけで作業する。**

## 5. logic.js 仕様(UMD・純粋関数・node から単体テスト可能)

- 形式: `(function(root,factory){ if(typeof module==='object'&&module.exports) module.exports=factory(); else root.Logic=factory(); })(...)`。DOM/localStorage/Date.now/Math.random に**直接依存しない**(storage・時刻・乱数は引数注入)。ES5 構文(var/function)で書く(元アプリ踏襲)。
- **全関数はイミュータブル**: 引数を変更せず新しい進捗/配列を返す。
- ストレージキー: `Logic.STORAGE_KEY = 'sc.progress.v1'`。

### 5.1 進捗スキーマ(`version:1`)
```
{ version:1,
  position: null | { ch:int, lessonId:string, page:int },      // レッスン読み途中の位置
  lessonsDone: [lessonId],
  quizResults: { [questionId]: { correct:boolean, ts:number } }, // ページ内クイズ/サンプル/仕上げ/午前模試/復習の単問
  wrongLog: [questionId],                                         // 復習対象(午前問IDも含む)
  chapterTest: { [chNo]: { score:0..1, passed:boolean } },        // 仕上げ問題
  mockHistory: [ { ts, examId, kind, // 午前: correct,total,rate,points(100点換算),pass,elapsedSec
                   //   午後: selected:[問no], ratio:0..1(自己採点), pass, elapsedSec
                   ... } ],                                       // 最大 200 件(超過は古い順に捨てる)
  pmSelf: { [leafId]: { checked:[keyPoint index], ts } },         // 午後の自己採点結果
  reports: [ { id, memo, ts } ],                                  // 間違いメモ
  settings: { passRate:0.7, unlockAll:false } }
```

### 5.2 公開関数
| 関数 | 説明 |
|---|---|
| `emptyProgress()` | 初期進捗 |
| `validate(p)` → `null` \| 理由文字列 | 進捗の形式検査(元アプリ踏襲+新フィールド) |
| `loadProgress(storage)` → `{progress, ok}` / `saveProgress(storage,p)` → bool / `importProgress(json,current)` → `{progress,error}` | storage は getItem/setItem を持つオブジェクト(テストはモック) |
| `escapeHtml(s)` | プレーン文字列用 |
| `explainToHtml(q)` | mc4/ox/午後 Leaf の `explain` を `<p><b>結論</b>…` `<p><b>根拠</b>…` `<ul><li>` 形式の HTML に整形(`q.type`/leaf 判定) |
| `choiceLabel(i)` / `CHOICE_LABELS` | `['ア','イ','ウ','エ']` |
| `gradeOx(q,ans)` / `gradeMc(q,ans)` → `{correct}` | `voided`/`altAnswers` 対応 |
| `indexData(data)` → `{qById, lessonById, chapterOfLesson, chapterByNo, sectionById, examById, leafById}` | 参照用索引 |
| `recordAnswer(p,id,correct,ts)` | quizResults 更新+wrongLog の追加/削除 |
| `markLessonDone(p,lessonId)` / `setPosition(p,pos)` | 新進捗を返す |
| `recordChapterTest(p,no,rate)` | passRate 判定。既合格は維持し最高 score を保持 |
| `isChapterUnlocked(p,no)` | no===1 / unlockAll / chapterTest[no-1].passed |
| `chapterProgress(p,chapter)` → `{done,total,testScore,testPassed}` | |
| `firstUndoneLesson(p,chapter)` / `continueTarget(p,data)` | 「続きから」の行き先 |
| `chapterStats(p,data)` → `{[chNo]:{correct,total}}` | 苦手章の集計(quizResults を問題IDの章/`chapter` で集計) |
| `findSection(data,examId,kind)` | |
| `scoreAm(section,answers)` → `{correct,total,rate,points,pass,unanswered,wrongIds,byChapter,byCategory}` | answers: `{[qid]:1..4}`。points=rate×100(小数1桁)、pass=rate≥0.6 |
| `validateSelection(section,nos)` → `null`\|理由 | 必須問・選択数の検査(`requiredNos`/`chooseCount`) |
| `scorePmLeaf(leaf,checkedIdx)` → 0..1 | checked の `point`(null は均等)の割合 |
| `scorePmProblem(problem,checkedByLeaf)` → `{ratio,earned,max}` | Leaf 重み = `points ?? 1`。max = `problem.points` (null→100) |
| `scorePmSection(section,selectedNos,checkedByLeaf)` → `{ratio,earned,max,pass,byProblem}` | pass=ratio≥0.6(自己採点の目安) |
| `recordMock(p,entry)` / `savePmSelf(p,leafId,checked,ts)` / `addReport(p,id,memo,ts)` / `removeReport(p,i)` / `setSettings(p,patch)` | 新進捗を返す |
| `reviewIds(p,data)` | wrongLog のうち実在するもの |
| `formatElapsed(sec)` / `remainingSec(startTs,nowTs,limitMin)` | 「M分SS秒」/ 残り秒(負数可) |

テスト: `tools/test_logic.js`(A 所有、`node --test` もしくは素の assert)。全公開関数を網羅(正常・異常・入力凍結 `Object.freeze` で非破壊確認)。目標カバレッジ 80%+。

## 6. index.html 仕様(A)

単一ファイル(CSS・JS インライン)。`<script src="data.js">` → `logic.js` の順。元アプリの見た目・操作性・`data-act` イベント委譲構造を踏襲。レスポンシブ(スマホ縦で読める)。HTML 断片は innerHTML、プレーン文字列は `L.escapeHtml`。CSS は `.key .trap .t .fig .code .note .blank` と許可クラスを定義(表は罫線付き・`overflow-x:auto` ラッパ、`pre` は横スクロール)。
localStorage が使えない/壊れている場合の警告表示、書き出し(`sc-progress-YYYYMMDD.json`)、読み込み、消去、間違いメモ書き出し(`sc-reports-…json`)は元アプリと同じ。

### 6.1 画面一覧(`view.name`)と遷移
| view | 内容 | 遷移 |
|---|---|---|
| `home` | 全体進捗バー・「続きから」・章一覧(ロック/進行中/完了タグ、章末テスト結果)・模試・復習・間違いメモ・設定 | → chapter / mock / review / reports / settings / lesson(続きから) |
| `chapter` | 章メニュー: 中項目(lesson)一覧と完了印、サンプル問題、仕上げ問題(章末テスト)、章概要。ロック章は開けない | → lesson / run(sample) / run(final) / home |
| `lesson` | 1画面=1ページ。本文、前へ/次へ、「間違いをメモ」。ページにクイズがあれば「次へ(確認クイズ n問)」→ 確認クイズ(1問ずつ即採点+解説) → 次ページ。最終ページ完了で lesson 完了、6ページごとに `break` | → lesson / break / chapterend / home |
| `break` | 「ここまで読みました」休憩画面 | → lesson / home |
| `chapterend` | 全レッスン完了。サンプル問題と仕上げ問題への案内 | → run / home |
| `run` | 1問ずつ即採点ランナー(サンプル・仕上げ・復習で共用)。正誤+解説(`explainToHtml`)+間違いメモ+`sourceExam` 表示(過去問由来なら「出典: 令和7年度春期 午前II 問12」) | → 次問 / `ctresult` / simple |
| `ctresult` | 仕上げ問題の結果。合格(passRate以上)で次章解錠を表示 | → home / run |
| `mock` | 模試メニュー: 年度→回(春/秋)→区分(午前I/午前II/午後I/午後II/午後)を選択。存在する区分のみ有効。問題数・制限時間・過去の受験履歴(最新5件)を表示 | → mockrun / pmselect / history |
| `mockrun`(午前) | 全問を1画面に縦並び(問番号+stem+4択ボタン)、経過/残り時間(超過しても続行可)、回答済み数、提出ボタン。未回答は0点扱い | → mockresult |
| `mockresult`(午前) | 得点(正答数/総数・100点換算・60%合否)、章別・分野別(am1は category)成績、**全問**を問番号順に表示(あなたの回答・正解・解説、誤答強調、「誤答のみ」切替、間違いメモ)。誤答は wrongLog 記録、履歴保存 | → home / mock |
| `pmselect`(午後) | `selectRule` を表示し大問を選択(`validateSelection` で検査) | → pmrun |
| `pmrun`(午後) | 選んだ大問ごとに `passage` と設問(`prompt`)、設問ごとに textarea(session内のみ保持)、タイマー。「解答を見て自己採点へ」 | → pmgrade |
| `pmgrade`(午後) | 設問ごとに: 自分の解答(escape表示)/解答例/採点キーポイントのチェックボックス/講評(`comment`)/解説(`explainToHtml`)。大問ごとに出題趣旨(`intent`)と採点講評(`review`)。「自己採点を確定」で `savePmSelf`+`recordMock` | → pmresult |
| `pmresult` | 大問別の自己採点率、全体 ratio と 60% 目安の判定 | → home / mock |
| `history` | 模試受験履歴一覧(新しい順) | → mock |
| `reports` | 間違いメモ一覧・削除・書き出し | → home |
| `settings` | 仕上げ合格基準(正答率%)、全章開放、進捗の書き出し/読み込み、消去 | → home |
| `simple` | タイトル+本文の汎用画面(復習結果など) | → home |

- 位置の復元: 起動時、`position` が有効で lesson 未完了なら自動で lesson を開く(元アプリ踏襲)。
- 章解錠: 前章の仕上げ問題合格(または unlockAll)。模試は常に解放。
- 履歴・自己採点・進捗はすべて `Logic` の純粋関数で新進捗を作り `P = …; save()`(index.html 内でも進捗オブジェクトを直接変更しない)。

## 7. 検証(tools/validate.js、A 所有)

`node tools/validate.js [--data docs/data.js] [--sample] [--strict]`
- `--sample`: `tools/work/sample.json` を検査(個数チェックを緩和)。デフォルトは `docs/data.js` を `vm` で読み込み検査。`--strict` は warning も失敗扱い。終了コード: error があれば 1。出力は **error 件数・warning 件数・サマリ表のみ**(全文ダンプ禁止)。
- **error**
  1. スキーマ: §3 の必須フィールド・型。プレーン文字列に `<` `>` `&` が無い。ID 命名規則・全体ユニーク。`answer` が 1〜4(am/mc4)。
  2. 構成: 章 12(`no` 1〜12)、各章 lesson 数/タイトルが `tools/chapters.json` と一致、各 lesson の pages 2〜4、各 page に quiz ≥1、samples 1〜2、finals 5〜7、回 8(§2のID)、区分が §2 どおり。
  3. **問題数**: am1=30、am2=25(全回)、各区分の問番号 1..N が欠番・重複なし。午後は `problems` ≥2、`requiredNos`/`chooseCount` が problems と整合(例: chooseCount ≤ 非必須数)、旧形式 pm1 は 3問/chooseCount 2、pm2 は 2問/chooseCount 1 を期待(違えば **warning**、冊子優先)。
  4. **解説欠落ゼロ**: 全 ox・mc4(午前・サンプル・仕上げ・ページ内クイズ)に `explain` があり §3.4 の最低基準を満たす。午後の全 Leaf に `answerExample`・`keyPoints`≥1・`explain` があり §3.6 の最低基準を満たす。`Problem.intent` `review` 非空。
  5. mc4: `choices` 長 4、`wrong` 3件、`wrong` のラベルが正解以外の3つと一致。ox の `answer` が boolean。blank の `blanks` が有り `answerExample` と整合。
  6. HTML 検査: 許可タグ/属性/class のみ。`<img` `<script` `<svg` `on*=` `data:` `http(s)://` 禁止。タグの閉じ忘れ・不整合(スタック検査)。`<`/`>`/`&` の裸使用なし(許可エンティティ以外)。
  7. 午前の `chapter`(1〜12) と `field` が章表と一致、am1 は `category` 有り。`field` と `chapters` が午後大問に有り。
  8. 参照整合: `sourceExam.exam/kind/no` が実在、ref 複製後に `figLossy` 問が無い。ページクイズ・仕上げ問題のID重複なし。
- **warning**: `figLossy` 件数、finals の過去問由来が半数未満、page.html < 400字、キーポイント無し配点の混在、解説が基準の下限ぎりぎり(basis < 100字)、未知の class。
- 出力例: `ERROR 0 / WARN 3` と `回別件数表(回|区分|問数|解説欠落|figLossy)`。
- 並行して `node tools/build_data.js --list` で各担当が自分の件数を確認する。

最終受入: `node tools/build_data.js && node tools/validate.js --strict` が成功、`node tools/test_logic.js` 成功、`docs/` に `index.html logic.js data.js` の3ファイルのみ、ブラウザでホーム→第1章→レッスン→仕上げ→模試(午前/午後)→結果→設定が動くこと(A がローカル http で確認)。

## 8. 担当割り当て(5台並列・全員が同時開始・競合なし)

### 8.1 所有ファイルとタスク
| 担当 | effort | 所有ファイル(これ以外は書かない) | タスク |
|---|---|---|---|
| **A** アプリ本体 | medium | `docs/index.html`, `docs/logic.js`, `docs/data.js`(最終ビルドのみ), `tools/build_data.js`, `tools/validate.js`, `tools/test_logic.js`, `tools/chapters.json`, `tools/work/sample.json`, `tools/work/chapters/ch11.*.json`, `ch12.*.json` | ①`tools/chapters.json` ②`tools/work/sample.json` ③`logic.js`(+テストを先に書く TDD) ④`build_data.js` ⑤`validate.js` ⑥`index.html`(sample.json で先行開発、`--sample --out docs/data.js`)⑦第11・12章コンテンツ。※最終統合・修正は司令塔からの再指示で実施 |
| **B** 午前 22〜23 + 章1〜3 | high | `tools/work/exams/{2022h,2022a,2023h,2023a}-{am1,am2}*.json`, `tools/work/chapters/ch01〜ch03.*.json` | 午前I・午前II 各4回(計 am1 120問・am2 100問)の転記+解説 → 第1〜3章 |
| **C** 午前 24〜25 + 章4〜6 | high | `tools/work/exams/{2024h,2024a,2025h,2025a}-{am1,am2}*.json`, `ch04〜ch06.*.json` | 午前I・午前II 各4回(計 220問)の転記+解説 → 第4〜6章 |
| **D** 午後 22〜23 + 章7〜8 | high | `tools/work/exams/{2022h-pm1,2022h-pm2,2022a-pm1,2022a-pm2,2023h-pm1,2023h-pm2,2023a-pm}*.json`, `ch07〜ch08.*.json` | 午後(7区分)の転記・解答例・講評・解説 → 第7〜8章 |
| **E** 午後 24〜25 + 章9〜10 | high | `tools/work/exams/{2024h,2024a,2025h,2025a}-pm*.json`, `ch09〜ch10.*.json` | 午後(4区分)の転記・解答例・講評・解説 → 第9〜10章 |

- 仕様上 `require.md` 原案(D=午前解説、E=午後解説、B/C=抽出 lower)と異なり、**抽出と解説を同一担当に束ねた**(ハンドオフと再読を無くしトークン削減・正確性向上)。そのため B〜E は全員 high。
- **作業順(B〜E)**: ① 試験データ(正確性最優先)→ ② 章コンテンツ。試験データを1ファイル完成するごとに書き出し、`node tools/build_data.js --list` が使えるようになれば件数確認に使う(A の build_data.js 完成前は JSON の目視/`node -e "JSON.parse(...)"` で確認)。
- 章コンテンツは §1 の中項目順に1章ずつ `chNN.lessons.json` → `chNN.qs.json` の順で書き出す。章を書く際、その章に関連する午前問は `--tagged N`(build_data.js 完成後)で探し、finals を ref に置換する。
- 依存関係: **なし**(全員同時開始可)。A の `sample.json` は先行開発用で他担当は読まなくてよい。唯一の結合点は最終ビルド(司令塔の指示で A が実行)。
- 他担当のファイルを編集しない。不備を見つけたら修正せず完了報告に「担当X: ファイル/ID/内容」と記す(司令塔が再指示)。`docs/`・`past_exam/`・`require.md` は A 以外変更禁止(past_exam は全員読み取り専用)。

### 8.2 元データの読み方(B〜E、`tools/INVENTORY.md` に従う)
- PDF はテキスト層なし。`tools/pdf2png.sh <pdf> tools/work/_scratch/<担当>/<名> <開始頁> <終了頁> 150` で頁PNG化 → Read で目視。`tools/ocr.sh` は下書き用(誤認識あり)。作業用画像は `tools/work/_scratch/<担当>/` に置く(ビルド対象外)。
- 午前: OCR で下書き → **正解番号は `_ans.pdf` を目視で照合、図表・コード・数式・空欄を含む問は頁画像で確認**。午後: 本文・設問・表・図は頁画像を目視、解答例・出題趣旨は `_ans.pdf`、講評は `_cmnt.pdf`(`_cmnt.pdf` は2頁程度の大問別講評)。
- 午後設問の `answerExample` は IPA 解答例を忠実に転記(言い換えない)。`explain`/`keyPoints` は担当が作成。
- 午前の `chapter`/`field`/`category` タグは担当が付与(迷えば最も近い章。am1 でセキュリティ以外は 11/12)。

### 8.3 完了報告(トークン節約)
各担当は完了時に**司令塔へ短く**(200字以内、本文・全文ダンプ禁止):
`担当X 完了: 試験 回/区分ごとの問数または大問・設問数、章 lessons/pages/quiz/samples/finals 数、figLossy 件数、公式解答と解説論理の不一致(あれば ID)、他担当への指摘(あれば)、未完了(あれば)`。

## 9. 品質ゲート(担当共通チェックリスト)
- [ ] JSON が valid(`node -e "JSON.parse(require('fs').readFileSync(p,'utf8'))"`)
- [ ] ID 規則・ユニーク、`answer` 1〜4、`choices` 4個
- [ ] 解説が §3.4 最低基準を満たす(結論→根拠→誤り選択肢)
- [ ] HTML 許可タグのみ、`<>&` エスケープ、属性は単引用符
- [ ] 図表は §3.2 に従い文字化、画像参照なし
- [ ] 公式 ans と正解番号が一致(午前)/解答例が忠実(午後)
- [ ] ファイル所有権の遵守(他担当のファイルを触っていない)
