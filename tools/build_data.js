#!/usr/bin/env node
'use strict';
// work/ の分割データを結合して docs/data.js を生成する(SPEC §4.2)。依存なし。
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORK = path.join(__dirname, 'work');
const KIND_ORDER = ['am1', 'am2', 'pm1', 'pm2', 'pm'];
const KIND_LABEL = { am1: '午前I(高度共通)', am2: '午前II', pm1: '午後I', pm2: '午後II', pm: '午後' };
const AM_META = { am1: { timeLimitMin: 50, total: 30 }, am2: { timeLimitMin: 40, total: 25 } };
const ERA = { 2022: '令和4年度', 2023: '令和5年度', 2024: '令和6年度', 2025: '令和7年度' };
const EXAM_KINDS = (() => {
  const m = {};
  ['2022h', '2022a', '2023h'].forEach((id) => { m[id] = ['am1', 'am2', 'pm1', 'pm2']; });
  m['2022a'] = ['am1', 'am2', 'pm1', 'pm2'];
  ['2023a', '2024h', '2024a', '2025h', '2025a'].forEach((id) => { m[id] = ['am1', 'am2', 'pm']; });
  return m;
})();

function parseArgs(argv) {
  const a = { out: path.join(ROOT, 'docs', 'data.js'), sample: false, allowMissing: false, list: false, tagged: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--out') a.out = path.resolve(argv[++i]);
    else if (t === '--sample') a.sample = true;
    else if (t === '--allow-missing') a.allowMissing = true;
    else if (t === '--list') a.list = true;
    else if (t === '--tagged') a.tagged = parseInt(argv[++i], 10);
    else throw new Error('不明なオプション: ' + t);
  }
  return a;
}

function readJson(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return null; }
  try { return JSON.parse(text); } catch (e) {
    throw new Error('JSON パースエラー ' + path.relative(ROOT, file) + ': ' + e.message);
  }
}
const pad = (n) => String(n).padStart(2, '0');
const clone = (o) => structuredClone(o);

function parseExamId(id) {
  const m = /^(\d{4})([ha])$/.exec(id);
  return { year: +m[1], season: m[2] };
}
function examMeta(id) {
  const { year, season } = parseExamId(id);
  return { id, year, season, era: ERA[year], label: year + '年度 ' + (season === 'h' ? '春期' : '秋期') };
}

// 区分ファイル(基底 + part)を読み、Section を組み立てる。無ければ null。
function loadSection(examId, kind, dir, warn) {
  const base = readJson(path.join(dir, examId + '-' + kind + '.json'));
  if (!base) return null;
  const isAm = kind === 'am1' || kind === 'am2';
  const key = isAm ? 'questions' : 'problems';
  let items = (base[key] || []).slice();
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const prefix = examId + '-' + kind + '.part';
  const parts = files
    .filter((f) => f.startsWith(prefix) && /^\d+\.json$/.test(f.slice(prefix.length)))
    .sort((a, b) => parseInt(a.slice(prefix.length), 10) - parseInt(b.slice(prefix.length), 10));
  parts.forEach((f) => {
    const p = readJson(path.join(dir, f));
    items = items.concat(p[key] || []);
  });
  const id = examId + '-' + kind;
  if (base.id && base.id !== id) warn('区分ID不一致: ' + base.id + ' (期待 ' + id + ')');
  const meta = Object.assign({}, AM_META[kind] || {}, base);
  const section = Object.assign({}, meta, { id, kind, label: base.label || KIND_LABEL[kind] });
  delete section[isAm ? 'problems' : 'questions'];
  section[key] = clone(items);
  return section;
}

function buildExams(dir, errors, warn) {
  const exams = [];
  Object.keys(EXAM_KINDS).forEach((examId) => {
    const sections = [];
    KIND_ORDER.forEach((kind) => {
      const exp = EXAM_KINDS[examId].indexOf(kind) >= 0;
      const s = loadSection(examId, kind, dir, warn);
      if (s) {
        if (!exp) warn('想定外の区分: ' + examId + '-' + kind);
        sections.push(s);
      } else if (exp) errors.push('試験データ欠落: ' + examId + '-' + kind);
    });
    exams.push(Object.assign(examMeta(examId), { sections }));
  });
  return exams.sort((a, b) => a.year - b.year || (a.season === b.season ? 0 : a.season === 'h' ? -1 : 1));
}

function amIndex(exams) {
  const m = {};
  exams.forEach((e) => e.sections.forEach((s) => (s.questions || []).forEach((q) => { m[q.id] = q; })));
  return m;
}

// ref を新オブジェクトに解決。解決不能なら null(呼び出し側で処理)。
function resolveRef(item, chapter, amById) {
  const src = amById[item.ref];
  if (!src) return null;
  const c = clone(src);
  const sourceExam = { exam: src.id.split('-')[0], kind: src.kind, no: src.no, kindOfUse: 'verbatim' };
  delete c.no; delete c.kind; delete c.category;
  return Object.assign(c, { id: item.id, chapter: chapter.no, field: chapter.field, sourceExam });
}

function buildChapters(list, dir, exams, errors, warn) {
  const amById = amIndex(exams);
  return list.map((def) => {
    const les = readJson(path.join(dir, 'ch' + pad(def.no) + '.lessons.json'));
    const qs = readJson(path.join(dir, 'ch' + pad(def.no) + '.qs.json'));
    if (!les) errors.push('章データ欠落: ch' + pad(def.no) + '.lessons.json');
    if (!qs) errors.push('章データ欠落: ch' + pad(def.no) + '.qs.json');
    if (!les && !qs) return null;
    const head = les || { id: def.id, no: def.no, title: def.title, field: def.field, summary: '', lessons: [] };
    const chapter = Object.assign({}, clone(head), { samples: [], finals: [] });
    ['samples', 'finals'].forEach((k) => {
      chapter[k] = ((qs && qs[k]) || []).reduce((acc, it) => {
        if (it && it.ref) {
          const r = resolveRef(it, chapter, amById);
          if (r) return acc.concat([r]);
          errors.push('ref 解決不能: ' + it.id + ' -> ' + it.ref);
          return acc;
        }
        return acc.concat([clone(it)]);
      }, []);
    });
    return chapter;
  }).filter(Boolean).sort((a, b) => a.no - b.no);
}

function serialize(data) {
  const json = JSON.stringify(data).replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));
  return 'window.DATA = ' + json + ';\n';
}

function buildAll(opts) {
  const errors = [], warnings = [];
  const warn = (m) => warnings.push(m);
  const chaptersDef = readJson(path.join(__dirname, 'chapters.json')) || [];
  if (!chaptersDef.length) errors.push('tools/chapters.json がありません');
  const exams = buildExams(path.join(WORK, 'exams'), errors, warn);
  const chapters = buildChapters(chaptersDef, path.join(WORK, 'chapters'), exams, errors, warn);
  const data = { schema: 1, built: new Date().toISOString(), chapters, exams };
  return { data, errors, warnings };
}

function listReport(data, errors) {
  const lines = ['== 章 (lessons/pages/quiz/samples/finals) =='];
  data.chapters.forEach((c) => {
    const pages = c.lessons.reduce((n, l) => n + l.pages.length, 0);
    const quiz = c.lessons.reduce((n, l) => n + l.pages.reduce((m, p) => m + (p.quiz || []).length, 0), 0);
    lines.push('第' + pad(c.no) + '章 ' + c.lessons.length + '/' + pages + '/' + quiz + '/' + c.samples.length + '/' + c.finals.length);
  });
  lines.push('== 試験 (問数 or 大問数/設問数) ==');
  data.exams.forEach((e) => e.sections.forEach((s) => {
    lines.push(s.id + ' ' + (s.questions ? s.questions.length + '問' :
      s.problems.length + '大問/' + s.problems.reduce((n, p) => n + p.questions.length, 0) + '設問'));
  }));
  lines.push('欠落: ' + errors.length + '件');
  return lines.join('\n');
}

function main(argv) {
  const a = parseArgs(argv);
  if (a.sample) {
    const s = readJson(path.join(WORK, 'sample.json'));
    if (!s) throw new Error('tools/work/sample.json がありません');
    fs.mkdirSync(path.dirname(a.out), { recursive: true });
    fs.writeFileSync(a.out, serialize(Object.assign({}, s, { built: new Date().toISOString() })));
    console.log('sample -> ' + path.relative(ROOT, a.out));
    return 0;
  }
  const { data, errors, warnings } = buildAll(a);
  if (a.tagged !== null) {
    data.exams.forEach((e) => e.sections.forEach((s) => (s.questions || []).forEach((q) => {
      if (q.chapter === a.tagged) console.log(q.id + ' | ' + q.no + ' | ' + String(q.stem || '').replace(/<[^>]*>/g, '').slice(0, 40));
    })));
    return 0;
  }
  if (a.list) { console.log(listReport(data, errors)); return 0; }
  warnings.forEach((w) => console.error('WARN ' + w));
  errors.forEach((m) => console.error((a.allowMissing ? 'WARN(missing) ' : 'ERROR ') + m));
  if (errors.length && !a.allowMissing) { console.error('ビルド失敗: ' + errors.length + '件'); return 1; }
  fs.mkdirSync(path.dirname(a.out), { recursive: true });
  fs.writeFileSync(a.out, serialize(data));
  console.log('built -> ' + path.relative(ROOT, a.out) + ' (章' + data.chapters.length + ' 回' + data.exams.length + ')');
  return 0;
}

module.exports = { parseArgs, buildAll, resolveRef, serialize, loadSection, listReport };

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
