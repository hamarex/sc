'use strict';
// logic.js の単体テスト: node tools/test_logic.js (または node --test tools/test_logic.js)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const L = require('../docs/logic.js');

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'work', 'sample.json'), 'utf8'));
function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.keys(o).forEach((k) => deepFreeze(o[k])); }
  return o;
}
const mem = (init) => { const m = Object.assign({}, init); return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, _m: m }; };
const P0 = () => deepFreeze(L.emptyProgress());

test('escapeHtml / choiceLabel', () => {
  assert.strictEqual(L.escapeHtml('<script>"a"&\'b\'</script>'), '&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;');
  assert.strictEqual(L.escapeHtml(null), '');
  assert.strictEqual(L.escapeHtml(12), '12');
  assert.deepStrictEqual(L.CHOICE_LABELS, ['ア', 'イ', 'ウ', 'エ']);
  assert.strictEqual(L.choiceLabel(2), 'ウ');
  assert.strictEqual(L.choiceLabel(9), '');
});

test('emptyProgress は validate を通る', () => {
  assert.strictEqual(L.validate(L.emptyProgress()), null);
  assert.strictEqual(L.STORAGE_KEY, 'sc.progress.v1');
});

test('validate: 各種異常', () => {
  const bad = (patch) => L.validate(Object.assign(L.emptyProgress(), patch));
  assert.ok(L.validate(null)); assert.ok(L.validate([]));
  assert.ok(bad({ version: 2 }));
  assert.ok(bad({ position: 'x' }));
  assert.ok(bad({ position: { ch: 1, lessonId: 'a', page: -1 } }));
  assert.strictEqual(bad({ position: { ch: 1, lessonId: 'a', page: 2 } }), null);
  assert.strictEqual(bad({ position: { ch: 1, lessonId: 'a' } }), null);
  assert.ok(bad({ lessonsDone: [1] }));
  assert.ok(bad({ quizResults: { a: { correct: 1, ts: 1 } } }));
  assert.ok(bad({ quizResults: [] }));
  assert.ok(bad({ wrongLog: 'x' }));
  assert.ok(bad({ chapterTest: { 1: { score: 'a', passed: true } } }));
  assert.ok(bad({ mockHistory: [{}] }));
  assert.ok(bad({ mockHistory: 3 }));
  assert.ok(bad({ pmSelf: { a: { checked: ['x'], ts: 1 } } }));
  assert.ok(bad({ reports: [{ id: 1, memo: 'a' }] }));
  assert.ok(bad({ settings: { passRate: 'a', unlockAll: false } }));
  assert.ok(bad({ settings: { passRate: 0.7, unlockAll: 1 } }));
});

test('load/save/import', () => {
  const s = mem();
  assert.deepStrictEqual(L.loadProgress(s), { progress: L.emptyProgress(), ok: true });
  const p = L.markLessonDone(L.emptyProgress(), 'c01-l01');
  assert.strictEqual(L.saveProgress(s, p), true);
  assert.deepStrictEqual(L.loadProgress(s).progress.lessonsDone, ['c01-l01']);
  assert.strictEqual(L.saveProgress({ setItem() { throw new Error('q'); } }, p), false);
  assert.strictEqual(L.loadProgress({ getItem() { throw new Error('x'); } }).ok, false);
  assert.strictEqual(L.loadProgress(mem({ [L.STORAGE_KEY]: '{oops' })).ok, false);
  assert.strictEqual(L.loadProgress(mem({ [L.STORAGE_KEY]: '{"version":9}' })).ok, false);
  const cur = L.emptyProgress();
  assert.ok(L.importProgress('xx', cur).error);
  assert.strictEqual(L.importProgress('xx', cur).progress, cur);
  assert.ok(L.importProgress('{"version":3}', cur).error);
  const good = L.importProgress(JSON.stringify(p), cur);
  assert.strictEqual(good.error, null);
  assert.deepStrictEqual(good.progress.lessonsDone, ['c01-l01']);
});

test('gradeOx / gradeMc (voided, altAnswers)', () => {
  assert.strictEqual(L.gradeOx({ answer: true }, true).correct, true);
  assert.strictEqual(L.gradeOx({ answer: true }, false).correct, false);
  assert.strictEqual(L.gradeOx({ answer: true }, 'true').correct, false);
  assert.strictEqual(L.gradeOx({ answer: true, voided: true }, false).correct, true);
  assert.strictEqual(L.gradeMc({ answer: 2 }, 2).correct, true);
  assert.strictEqual(L.gradeMc({ answer: 2 }, 3).correct, false);
  assert.strictEqual(L.gradeMc({ answer: 2 }, undefined).correct, false);
  assert.strictEqual(L.gradeMc({ answer: 2, altAnswers: [4] }, 4).correct, true);
  assert.strictEqual(L.gradeMc({ answer: 2, altAnswers: [4] }, 1).correct, false);
  assert.strictEqual(L.gradeMc({ answer: 2, voided: true }, 1).correct, true);
});

test('explainToHtml: mc4 / ox / leaf / 空', () => {
  const mc = { type: 'mc4', explain: { conclusion: 'C', basis: 'B', wrong: ['ア: x', 'イ: y'] }, tip: 'T' };
  const h = L.explainToHtml(mc);
  assert.ok(h.indexOf('<p><b>結論</b>') === 0 && h.indexOf('<b>根拠</b>') > 0 && h.indexOf('<ul><li>ア: x</li><li>イ: y</li></ul>') > 0 && h.indexOf('<b>コツ</b>') > 0);
  assert.ok(!L.explainToHtml({ type: 'ox', explain: { conclusion: 'C', basis: 'B' } }).includes('<ul>'));
  assert.ok(L.explainToHtml({ answerType: 'text', explain: { conclusion: 'C', basis: 'B', pitfalls: ['p1'] } }).includes('<li>p1</li>'));
  assert.strictEqual(L.explainToHtml({}), '');
  assert.strictEqual(L.explainToHtml(null), '');
  assert.strictEqual(L.explainToHtml({ explain: { wrong: [], pitfalls: [] } }), '');
});

test('indexData', () => {
  const ix = L.indexData(DATA);
  assert.ok(ix.qById['c01-l01-p01-z1'] && ix.qById['c01-s1'] && ix.qById['c01-f5'] && ix.qById['2025h-am1-q01']);
  assert.strictEqual(ix.lessonById['c01-l01'].no, 1);
  assert.strictEqual(ix.chapterOfLesson['c02-l02'].no, 2);
  assert.strictEqual(ix.chapterByNo[1].id, 'c01');
  assert.ok(ix.sectionById['2022h-pm1'] && ix.examById['2025h']);
  assert.ok(ix.leafById['2025h-pm-p1-q2-1']);
  const empty = L.indexData({});
  assert.deepStrictEqual(Object.keys(empty.qById), []);
});

test('recordAnswer: 不変・wrongLog 追加/削除', () => {
  const p0 = P0();
  const p1 = L.recordAnswer(p0, 'q1', false, 10);
  assert.deepStrictEqual(p1.wrongLog, ['q1']);
  assert.deepStrictEqual(p1.quizResults.q1, { correct: false, ts: 10 });
  assert.deepStrictEqual(p0.wrongLog, []);
  const p1b = L.recordAnswer(p1, 'q1', false, 11);
  assert.deepStrictEqual(p1b.wrongLog, ['q1']);
  const p2 = L.recordAnswer(deepFreeze(p1b), 'q1', true, 12);
  assert.deepStrictEqual(p2.wrongLog, []);
  assert.strictEqual(p2.quizResults.q1.correct, true);
});

test('markLessonDone / setPosition', () => {
  const p = L.markLessonDone(P0(), 'a');
  assert.deepStrictEqual(p.lessonsDone, ['a']);
  assert.strictEqual(L.markLessonDone(deepFreeze(p), 'a'), p);
  const q = L.setPosition(P0(), { ch: 1, lessonId: 'a', page: 1 });
  assert.deepStrictEqual(q.position, { ch: 1, lessonId: 'a', page: 1 });
  assert.strictEqual(L.setPosition(q, null).position, null);
  assert.strictEqual(L.setPosition(q, undefined).position, null);
});

test('recordChapterTest / isChapterUnlocked / chapterProgress', () => {
  let p = L.recordChapterTest(P0(), 1, 0.6);
  assert.deepStrictEqual(p.chapterTest[1], { score: 0.6, passed: false });
  p = L.recordChapterTest(deepFreeze(p), 1, 0.8);
  assert.deepStrictEqual(p.chapterTest[1], { score: 0.8, passed: true });
  p = L.recordChapterTest(deepFreeze(p), 1, 0.5);
  assert.deepStrictEqual(p.chapterTest[1], { score: 0.8, passed: true });
  p = L.recordChapterTest(deepFreeze(p), 1, 0.9);
  assert.strictEqual(p.chapterTest[1].score, 0.9);
  assert.strictEqual(L.recordChapterTest(P0(), 3, 0.7).chapterTest[3].passed, true);
  assert.strictEqual(L.isChapterUnlocked(P0(), 1), true);
  assert.strictEqual(L.isChapterUnlocked(P0(), 2), false);
  assert.strictEqual(L.isChapterUnlocked(p, 2), true);
  assert.strictEqual(L.isChapterUnlocked(L.setSettings(P0(), { unlockAll: true }), 5), true);
  const ch = DATA.chapters[0];
  const cp = L.chapterProgress(L.markLessonDone(p, 'c01-l01'), ch);
  assert.deepStrictEqual(cp, { done: 1, total: 2, testScore: 0.9, testPassed: true });
  assert.deepStrictEqual(L.chapterProgress(P0(), ch), { done: 0, total: 2, testScore: null, testPassed: false });
});

test('firstUndoneLesson / continueTarget', () => {
  const ch = DATA.chapters[0];
  assert.strictEqual(L.firstUndoneLesson(P0(), ch).id, 'c01-l01');
  let p = L.markLessonDone(L.markLessonDone(P0(), 'c01-l01'), 'c01-l02');
  assert.strictEqual(L.firstUndoneLesson(p, ch), null);
  assert.strictEqual(L.continueTarget(P0(), DATA).lessonId, 'c01-l01');
  // 第2章はロック → 第1章完了でも次は無し
  assert.strictEqual(L.continueTarget(p, DATA), null);
  p = L.recordChapterTest(p, 1, 1);
  assert.strictEqual(L.continueTarget(p, DATA).lessonId, 'c02-l01');
  const pos = L.setPosition(P0(), { ch: 1, lessonId: 'c01-l02', page: 1 });
  const t = L.continueTarget(pos, DATA);
  assert.strictEqual(t.lessonId, 'c01-l02'); assert.strictEqual(t.page, 1); assert.ok(t.label.indexOf('ページ2') > 0);
  const bad = L.setPosition(P0(), { ch: 1, lessonId: 'c01-l02', page: 99 });
  assert.strictEqual(L.continueTarget(bad, DATA).page, 0);
  const gone = L.setPosition(P0(), { ch: 1, lessonId: 'zzz', page: 0 });
  assert.strictEqual(L.continueTarget(gone, DATA).lessonId, 'c01-l01');
});

test('chapterStats / chapterOfId', () => {
  assert.strictEqual(L.chapterOfId('c04-f3'), 4);
  assert.strictEqual(L.chapterOfId('2024a-am2-q07'), 0);
  let p = L.recordAnswer(P0(), 'c01-f1', true, 1);
  p = L.recordAnswer(p, 'c01-f2', false, 1);
  p = L.recordAnswer(p, '2025h-am2-q03', false, 1); // chapter=3
  p = L.recordAnswer(p, 'unknown-id', true, 1);
  const st = L.chapterStats(p, DATA);
  assert.deepStrictEqual(st[1], { correct: 1, total: 2 });
  assert.deepStrictEqual(st[3], { correct: 0, total: 1 });
  assert.strictEqual(st[0], undefined);
});

test('findSection', () => {
  assert.strictEqual(L.findSection(DATA, '2025h', 'am1').id, '2025h-am1');
  assert.strictEqual(L.findSection(DATA, '2025h', 'pm1'), null);
  assert.strictEqual(L.findSection(DATA, 'xxxx', 'am1'), null);
});

test('scoreAm', () => {
  const sec = L.findSection(DATA, '2025h', 'am1'); // q01(ans1,figLossy) q02(voided) q03
  deepFreeze(sec);
  const q = sec.questions;
  const none = L.scoreAm(sec, {});
  assert.strictEqual(none.correct, 0); assert.strictEqual(none.unanswered, 3); assert.strictEqual(none.pass, false);
  assert.strictEqual(L.scoreAm(sec).total, 3);
  const a = {}; a[q[0].id] = q[0].answer; a[q[1].id] = 1; a[q[2].id] = (q[2].answer % 4) + 1;
  const r = L.scoreAm(sec, a);
  assert.strictEqual(r.correct, 2); assert.strictEqual(r.points, 66.7); assert.strictEqual(r.pass, true);
  assert.deepStrictEqual(r.wrongIds, [q[2].id]); assert.strictEqual(r.unanswered, 0);
  assert.deepStrictEqual(r.byChapter[11], { correct: 2, total: 3 });
  assert.deepStrictEqual(r.byCategory.technology, { correct: 2, total: 3 });
  const full = {}; q.forEach((x) => { full[x.id] = x.answer; });
  assert.strictEqual(L.scoreAm(sec, full).points, 100);
  assert.strictEqual(L.scoreAm({ questions: [] }, {}).rate, 0);
  const am2 = L.scoreAm(L.findSection(DATA, '2025h', 'am2'), {});
  assert.deepStrictEqual(am2.byCategory, {});
});

test('validateSelection', () => {
  const pm = L.findSection(DATA, '2025h', 'pm');
  assert.strictEqual(L.validateSelection(pm, [1, 2]), null);
  assert.ok(L.validateSelection(pm, [2]).indexOf('必須') >= 0);
  assert.ok(L.validateSelection(pm, [1]).indexOf('1問') >= 0);
  assert.ok(L.validateSelection(pm, [1, 1, 2]).indexOf('重複') >= 0);
  assert.ok(L.validateSelection(pm, [1, 9]).indexOf('存在') >= 0);
  assert.ok(L.validateSelection(pm, 'x'));
  const pm1 = L.findSection(DATA, '2022h', 'pm1');
  assert.strictEqual(L.validateSelection(pm1, [1, 3]), null);
  assert.ok(L.validateSelection(pm1, [1, 2, 3]));
  assert.strictEqual(L.validateSelection({ problems: [{ no: 1 }], chooseCount: 1 }, [1]), null);
});

test('scorePmLeaf', () => {
  const eq = { keyPoints: [{ point: null }, { point: null }, { point: null }, { point: null }] };
  assert.strictEqual(L.scorePmLeaf(eq, [0, 1]), 0.5);
  assert.strictEqual(L.scorePmLeaf(eq, [0, 0, 9, -1, 'x']), 0.25);
  assert.strictEqual(L.scorePmLeaf(eq), 0);
  const w = { keyPoints: [{ point: 3 }, { point: 1 }] };
  assert.strictEqual(L.scorePmLeaf(w, [0]), 0.75);
  assert.strictEqual(L.scorePmLeaf(w, [0, 1]), 1);
  const mixed = { keyPoints: [{ point: 2 }, { point: null }] };
  assert.strictEqual(L.scorePmLeaf(mixed, [1]), 0.5);
  assert.strictEqual(L.scorePmLeaf({ keyPoints: [] }, [0]), 0);
  assert.strictEqual(L.scorePmLeaf({}, [0]), 0);
});

test('scorePmProblem / scorePmSection', () => {
  const pm = deepFreeze(L.findSection(DATA, '2025h', 'pm'));
  const p1 = pm.problems[0]; // q1 points3(2+1), q2-1, q2-2: points null -> weight 1
  const full = {}; p1.questions.forEach((lf) => { full[lf.id] = lf.keyPoints.map((_, i) => i); });
  const r = L.scorePmProblem(p1, full);
  assert.strictEqual(r.ratio, 1); assert.strictEqual(r.max, 100); assert.strictEqual(r.earned, 100);
  const half = {}; half[p1.questions[0].id] = [0, 1]; // 重み3の設問のみ満点
  const rh = L.scorePmProblem(p1, half);
  assert.ok(Math.abs(rh.ratio - 3 / 5) < 1e-9);
  assert.strictEqual(L.scorePmProblem(p1).ratio, 0);
  assert.strictEqual(L.scorePmProblem({ questions: [], points: 50 }, {}).max, 50);
  const sec = L.scorePmSection(pm, [1, 2], Object.assign({}, full));
  assert.strictEqual(sec.pass, false); // 問2 は未チェック → 0.5
  assert.strictEqual(sec.ratio, 0.5); assert.strictEqual(sec.max, 100); assert.strictEqual(sec.earned, 50); // 配点未設定は maxScore を選択数で等分
  assert.strictEqual(sec.byProblem[1].ratio, 1);
  assert.strictEqual(L.scorePmSection(pm, [1], full).pass, true);
  assert.strictEqual(L.scorePmSection(pm, [], {}).ratio, 0);
});

test('recordMock: 上限 200 件・不変', () => {
  let p = P0();
  const e = { ts: 1, examId: '2025h', kind: 'am1', correct: 1, total: 3 };
  p = L.recordMock(p, e);
  assert.notStrictEqual(p.mockHistory[0], e);
  assert.deepStrictEqual(p.mockHistory[0], e);
  for (let i = 0; i < 205; i++) p = L.recordMock(deepFreeze(p), { ts: 100 + i, examId: 'x', kind: 'am1' });
  assert.strictEqual(p.mockHistory.length, 200);
  assert.strictEqual(p.mockHistory[199].ts, 304);
  assert.strictEqual(p.mockHistory[0].ts, 105);
  assert.strictEqual(L.validate(p), null);
});

test('savePmSelf / reports / settings', () => {
  const arr = [0, 2];
  const p = L.savePmSelf(P0(), 'leaf', arr, 5);
  arr.push(9);
  assert.deepStrictEqual(p.pmSelf.leaf, { checked: [0, 2], ts: 5 });
  assert.deepStrictEqual(L.savePmSelf(P0(), 'l', null, 1).pmSelf.l.checked, []);
  let r = L.addReport(P0(), 'id1', 'memo1', 1);
  r = L.addReport(deepFreeze(r), 'id2', 'memo2', 2);
  assert.strictEqual(r.reports.length, 2);
  const r2 = L.removeReport(r, 0);
  assert.deepStrictEqual(r2.reports.map((x) => x.id), ['id2']);
  assert.strictEqual(r.reports.length, 2);
  assert.strictEqual(L.removeReport(r, 9).reports.length, 2);
  let s = L.setSettings(P0(), { passRate: 0.8, unlockAll: true });
  assert.deepStrictEqual(s.settings, { passRate: 0.8, unlockAll: true });
  s = L.setSettings(deepFreeze(s), { passRate: 5, unlockAll: 'x' });
  assert.deepStrictEqual(s.settings, { passRate: 0.8, unlockAll: true });
  assert.deepStrictEqual(L.setSettings(P0(), null).settings, { passRate: 0.7, unlockAll: false });
});

test('reviewIds', () => {
  let p = L.recordAnswer(P0(), 'c01-f1', false, 1);
  p = L.recordAnswer(p, 'gone-id', false, 1);
  assert.deepStrictEqual(L.reviewIds(p, DATA), ['c01-f1']);
  assert.deepStrictEqual(L.reviewIds(p, DATA, L.indexData(DATA)), ['c01-f1']);
});

test('formatElapsed / remainingSec / labels', () => {
  assert.strictEqual(L.formatElapsed(65), '1分05秒');
  assert.strictEqual(L.formatElapsed(0), '0分00秒');
  assert.strictEqual(L.formatElapsed(-5), '0分00秒');
  assert.strictEqual(L.remainingSec(0, 60000, 50), 2940);
  assert.strictEqual(L.remainingSec(0, 3601000, 50), -601);
  assert.strictEqual(L.kindLabel('am2'), '午前II');
  assert.strictEqual(L.kindLabel('zz'), 'zz');
  assert.strictEqual(L.sourceLabel(DATA, { exam: '2025h', kind: 'am2', no: 12 }), '令和7年度春期 午前II 問12');
  assert.strictEqual(L.sourceLabel(DATA, { exam: '2023a', kind: 'pm', no: 1 }), '2023a 午後 問1');
  assert.strictEqual(L.sourceLabel(DATA, null), '');
});

test('validate.js: 壊れたデータを検出する', () => {
  const V = require('./validate.js');
  const ok = V.validateData(DATA, { sample: true });
  assert.strictEqual(ok.errors.length, 0);
  const bad = structuredClone(DATA);
  bad.chapters[0].lessons[0].pages[0].html = "<p>a <img src='x'> <b>未閉じ & 裸 < </p>";
  bad.exams[0].sections[0].questions[0].answer = 9;
  bad.exams[0].sections[1].questions[1].explain.wrong = ['ア'];
  const r = V.validateData(bad, { sample: true });
  assert.ok(r.errors.some((e) => e.indexOf('禁止タグ') >= 0));
  assert.ok(r.errors.some((e) => e.indexOf('answer は 1〜4') >= 0));
  assert.ok(r.errors.some((e) => e.indexOf('wrong') >= 0));
  assert.ok(r.errors.some((e) => e.indexOf('裸の') >= 0));
});

test('build_data.js: ref 解決・直列化', () => {
  const B = require('./build_data.js');
  const src = { id: '2024a-am2-q12', no: 12, kind: 'am2', chapter: 4, field: 'x', stem: 's', choices: [1, 2, 3, 4], answer: 2 };
  const frozen = deepFreeze(structuredClone(src));
  const r = B.resolveRef({ id: 'c04-f3', ref: src.id }, { no: 4, field: '暗号・PKI' }, { [src.id]: frozen });
  assert.strictEqual(r.id, 'c04-f3'); assert.strictEqual(r.field, '暗号・PKI');
  assert.deepStrictEqual(r.sourceExam, { exam: '2024a', kind: 'am2', no: 12, kindOfUse: 'verbatim' });
  assert.strictEqual(r.no, undefined);
  assert.strictEqual(B.resolveRef({ id: 'x', ref: 'nope' }, { no: 1, field: 'f' }, {}), null);
  const out = B.serialize({ a: '\u2028\u2029' });
  assert.ok(out.startsWith('window.DATA = ') && out.endsWith(';\n') && out.indexOf('\u2028') < 0 && out.indexOf('\u2029') < 0);
  assert.strictEqual(B.parseArgs(['--sample', '--allow-missing']).allowMissing, true);
  assert.throws(() => B.parseArgs(['--zzz']));
});
