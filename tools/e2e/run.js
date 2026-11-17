'use strict';
// docs/index.html の e2e。file:// で開き、主要導線とコンソールエラーを確認する。
// 実行: cd tools/e2e && npm install && node run.js [--headed] [--quick]
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright-core');

const URL = 'file://' + path.resolve(__dirname, '../../docs/index.html');
const HEADED = process.argv.includes('--headed');
const QUICK = process.argv.includes('--quick'); // 模試を各区分1回分(2025a)だけにする
const results = [];
const consoleErrors = [];
let page;

async function step(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log('PASS ' + name); }
  catch (e) { results.push({ name, ok: false, err: e.message }); console.log('FAIL ' + name + '\n     ' + e.message.split('\n')[0]); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'mismatch') + ': got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b)); }
function ok(c, msg) { if (!c) throw new Error(msg); }
const act = (a, extra) => '[data-act="' + a + '"]' + (extra || '');
const click = (sel) => page.locator(sel).first().click({ timeout: 5000 });
const h1 = () => page.locator('h1').first().innerText();
const progress = () => page.evaluate(() => JSON.parse(localStorage.getItem('sc.progress.v1') || 'null'));

async function launch() {
  const opts = { headless: !HEADED };
  try { return await chromium.launch(Object.assign({ channel: 'chrome' }, opts)); }
  catch (e) {
    if (process.env.CHROME_PATH) return chromium.launch(Object.assign({ executablePath: process.env.CHROME_PATH }, opts));
    return chromium.launch(opts); // playwright install chromium 済みの場合
  }
}

async function answerRun(items, pickCorrect) {
  // run 画面: 1問ずつ選択 → 解説表示確認 → 次へ
  for (let i = 0; i < items.length; i++) {
    const q = items[i];
    const v = pickCorrect ? (q.type === 'ox' ? String(q.answer) : String(q.answer)) : (q.type === 'ox' ? 'true' : '1');
    await click(act('pick', '[data-v="' + v + '"]'));
    const ex = await page.locator('.explain').first().innerText();
    ok(ex.trim().length > 20, 'explain empty for ' + q.id);
    await click(act('run-next'));
  }
}

(async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 420, height: 900 } });
  page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => consoleErrors.push('requestfailed: ' + r.url()));
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'e2e memo' : undefined));

  await page.goto(URL);
  const DATA = await page.evaluate(() => JSON.parse(JSON.stringify(window.DATA)));
  const ch1 = DATA.chapters[0];

  await step('ホーム表示(12章・模試ボタン)', async () => {
    ok((await h1()).includes('安全確保支援士'), 'title');
    eq(await page.locator(act('chapter')).count(), 1, 'unlocked chapter buttons (only ch1)');
    ok(await page.locator(act('mock')).count() > 0, 'mock button');
    eq(await page.locator('.chap, .card').filter({ hasText: '第12章' }).count() > 0, true, 'ch12 listed');
  });

  await step('ホーム→第1章メニュー', async () => {
    await click(act('chapter', '[data-ch="1"]'));
    eq(await page.locator(act('open-lesson')).count(), ch1.lessons.length, 'lesson buttons');
    ok(await page.locator(act('run-sample')).isEnabled(), 'sample enabled');
  });

  await step('第1章レッスンを最後まで(本文→確認クイズ→次ページ→休憩)', async () => {
    await click(act('open-lesson'));
    let quizzes = 0, guard = 0;
    for (; guard < 400; guard++) {
      if (await page.locator('.card.lesson').count() === 0 && await page.locator(act('run-sample')).count()) break; // chapterend
      if (await page.locator(act('break-go')).count()) { await click(act('break-go')); continue; }
      if (await page.locator(act('quiz-next')).count()) { await click(act('quiz-next')); continue; }
      if (await page.locator('.choice:not(.locked)').count()) {
        await page.locator('.choice:not(.locked)').first().click(); quizzes++; continue;
      }
      if (await page.locator(act('page-quiz')).count() && await page.locator(act('page-quiz')).first().innerText().then(t => t.startsWith('次へ'))) { await click(act('page-quiz')); continue; }
      if (await page.locator(act('page-next')).count()) { await click(act('page-next')); continue; }
      break;
    }
    ok(guard < 400, 'loop guard');
    ok(quizzes >= ch1.lessons.length, 'quizzes answered: ' + quizzes);
    ok(await page.locator(act('run-sample')).count() > 0 && await page.locator(act('run-final')).count() > 0, 'chapterend shows sample/final buttons');
    const p = await progress();
    ok(JSON.stringify(p).includes(ch1.lessons[ch1.lessons.length - 1].id), 'last lesson recorded in progress');
  });

  await step('サンプル問題(第1章)全問', async () => {
    await click(act('run-sample'));
    await answerRun(ch1.samples, true);
    ok((await h1()).includes('サンプル'), 'sample result: ' + await h1());
    ok((await page.locator('.card').first().innerText()).includes('正解'), 'result text');
  });

  await step('仕上げ問題(第1章)全問正解→合格→第2章解錠', async () => {
    await page.goto(URL); // 位置復元の影響を避けるためホームから
    await click(act('chapter', '[data-ch="1"]'));
    await click(act('run-final'));
    await answerRun(ch1.finals, true);
    ok((await h1()).includes('仕上げ問題 結果'), 'result screen');
    ok((await page.locator('h2.ok').innerText()).includes('合格'), 'pass');
    await click(act('home'));
    ok(await page.locator(act('chapter', '[data-ch="2"]')).count() > 0, 'ch2 unlocked');
  });

  await step('仕上げ問題 全問不正解→不合格(第2章はロック維持)', async () => {
    const ch2 = DATA.chapters[1];
    await click(act('chapter', '[data-ch="2"]'));
    await click(act('run-final'));
    // 全て誤答: 正解でない選択肢を選ぶ
    for (const q of ch2.finals) {
      const wrong = q.type === 'ox' ? String(!q.answer) : String(q.answer === 1 ? 2 : 1);
      await click(act('pick', '[data-v="' + wrong + '"]'));
      await click(act('run-next'));
    }
    ok((await page.locator('h2.ng').innerText()).includes('不合格'), 'fail');
    await click(act('home'));
    eq(await page.locator(act('chapter', '[data-ch="3"]')).count(), 0, 'ch3 still locked');
  });

  // ---- 模試 ----
  const exams = QUICK ? DATA.exams.filter(e => e.id === '2025a') : DATA.exams;
  for (const ex of exams) {
    for (const s of ex.sections.filter(s => s.questions)) {
      await step('模試 ' + ex.id + ' ' + s.kind + ' 開始→提出→全問解説', async () => {
        await page.goto(URL);
        await click(act('mock'));
        await click(act('mock-start', '[data-exam="' + ex.id + '"][data-kind="' + s.kind + '"]'));
        eq(await page.locator(act('mock-pick')).count() > 0, true, 'questions shown');
        eq(await page.locator('.card .mute', { hasText: /^問\d+$/ }).count(), s.questions.length, 'question cards');
        // 偶数番目を正解、奇数番目を不正解、最後の1問は未回答
        const expected = await page.evaluate((qs) => {
          let c = 0;
          qs.forEach((q, i) => {
            if (i === qs.length - 1) return;
            const v = i % 2 === 0 ? q.answer : (q.answer % 4) + 1;
            const el = document.querySelector('[data-act="mock-pick"][data-id="' + q.id + '"][data-v="' + v + '"]');
            el.click();
            if (i % 2 === 0) c++;
          });
          return c;
        }, s.questions);
        await click(act('mock-submit'));
        ok((await h1()).includes('結果'), 'result h1');
        eq(await page.locator('.explain').count(), s.questions.length, 'explanations shown');
        const head = await page.locator('h2.ok, h2.ng').first().innerText();
        ok(head.startsWith(expected + ' / ' + s.questions.length), 'score "' + head + '" expected ' + expected);
        await click(act('toggle-wrong'));
        eq(await page.locator('.explain').count(), s.questions.length - expected, 'wrong-only count');
      });
    }
    for (const s of ex.sections.filter(s => s.problems)) {
      await step('模試 ' + ex.id + ' ' + s.kind + ' 午後 開始→自己採点→結果', async () => {
        await page.goto(URL);
        await click(act('mock'));
        await click(act('mock-start', '[data-exam="' + ex.id + '"][data-kind="' + s.kind + '"]'));
        ok(await page.locator(act('pm-start')).count() > 0, 'pmselect');
        // 選択状態を整える: 必須+必要数
        const rule = s.chooseCount, req = s.requiredNos || [];
        const boxes = page.locator('input[data-pmsel]');
        const n = await boxes.count();
        for (let i = 0; i < n; i++) { // 一旦全解除(必須はdisabled)
          const b = boxes.nth(i); if (!(await b.isDisabled()) && await b.isChecked()) await b.uncheck();
        }
        let need = rule - req.length;
        for (let i = 0; i < n && need > 0; i++) {
          const b = boxes.nth(i); if (!(await b.isDisabled())) { await b.check(); need--; }
        }
        await click(act('pm-start'));
        ok(await page.locator('textarea[data-leaf]').count() > 0, 'pmrun textareas (notice: ' + (await page.locator('.notice').allInnerTexts()).join('|') + ')');
        await page.locator('textarea[data-leaf]').first().fill('e2e 解答 <b>x</b>');
        await click(act('pm-grade'));
        ok(await page.locator('.explain').count() > 0, 'explain in pmgrade');
        const kp = page.locator('input[data-kp]');
        ok(await kp.count() > 0, 'keypoints');
        const cnt = await kp.count();
        for (let i = 0; i < cnt; i += 2) await kp.nth(i).check();
        await click(act('pm-confirm'));
        ok(await page.locator(act('home')).count() > 0 && await page.locator(act('mock')).count() > 0, 'pmresult nav');
        ok(/%/.test(await page.locator('body').innerText()), 'ratio shown');
      });
    }
  }

  await step('模試履歴・間違いメモ・復習', async () => {
    await page.goto(URL);
    await click(act('mock')); await click(act('history'));
    ok(await page.locator('.chap').count() >= 1, 'history rows');
    await page.goto(URL);
    // メモ: 仕上げ1問目で「間違いをメモ」
    await click(act('chapter', '[data-ch="1"]')); await click(act('run-final'));
    await click(act('pick', '[data-v="1"]'));
    await click(act('report'));
    await click(act('home')); await click(act('reports'));
    ok((await page.locator('body').innerText()).includes('e2e memo'), 'memo listed');
    await click(act('home')); await click(act('review'));
    ok(await page.locator('h1').count() > 0, 'review opens');
  });

  await step('設定: 合格基準変更・全章開放', async () => {
    await page.goto(URL); await click(act('settings'));
    await page.fill('#passRate', '50'); await click(act('set-pass'));
    eq((await progress()).settings.passRate, 0.5);
    await page.check('#unlockAll'); await click(act('set-unlock'));
    eq((await progress()).settings.unlockAll, true);
    await click(act('home'));
    eq(await page.locator(act('chapter')).count(), 12, 'all chapters open');
  });

  await step('設定: 進捗の書き出し→消去→読み込み(sc.progress.v1)', async () => {
    await page.goto(URL); await click(act('settings'));
    const before = await page.evaluate(() => localStorage.getItem('sc.progress.v1'));
    ok(before, 'localStorage key sc.progress.v1 exists');
    const [dl] = await Promise.all([page.waitForEvent('download'), click(act('export'))]);
    ok(/^sc-progress-\d{8}\.json$/.test(dl.suggestedFilename()), 'filename ' + dl.suggestedFilename());
    const f = path.join(os.tmpdir(), 'sc-e2e-' + process.pid + '.json');
    await dl.saveAs(f);
    const exported = JSON.parse(fs.readFileSync(f, 'utf8'));
    eq(JSON.stringify(exported), JSON.stringify(JSON.parse(before)), 'export equals localStorage');
    await click(act('reset'));
    const after = await progress();
    ok(!after || (Object.keys(after.answers || {}).length === 0 && (after.mockHistory || []).length === 0), 'progress cleared');
    await click(act('settings'));
    await page.setInputFiles('#importFile', f);
    await click(act('import'));
    await page.waitForFunction(() => /読み込みました/.test(document.body.innerText));
    eq(JSON.stringify(await progress()), JSON.stringify(exported), 'restored');
    // 不正ファイル
    const bad = f + '.bad'; fs.writeFileSync(bad, '{not json');
    await page.setInputFiles('#importFile', bad); await click(act('import'));
    await page.waitForFunction(() => /読み込めませんでした/.test(document.body.innerText));
    eq(JSON.stringify(await progress()), JSON.stringify(exported), 'unchanged after bad import');
    fs.unlinkSync(f); fs.unlinkSync(bad);
  });

  await step('コンソールエラー・ページエラーなし', async () => {
    eq(consoleErrors.join('\n'), '', 'errors');
  });

  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log('\n' + (results.length - failed.length) + ' passed, ' + failed.length + ' failed');
  failed.forEach(f => console.log(' - ' + f.name + ': ' + f.err.split('\n')[0]));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
