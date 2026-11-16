#!/usr/bin/env node
'use strict';
// data.js / sample.json の検査(SPEC §7)。
// node tools/validate.js [--data docs/data.js] [--sample] [--strict] [--verbose]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const LB = ['ア', 'イ', 'ウ', 'エ'];
const TAGS = ['p', 'br', 'b', 'i', 'em', 'sub', 'sup', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'h4'];
const VOID = ['br'];
const ATTRS = ['class', 'colspan', 'rowspan'];
const CLASSES = ['key', 'trap', 't', 'fig', 'code', 'note', 'blank'];
const ENTITY = /&(?:lt|gt|amp|quot|nbsp|#\d+|#x[0-9a-fA-F]+);/g;
const PLACEHOLDER = /TODO|省略|後述|同上|解説略|^\s*略\s*$|^[\s….・]*$/;
const EXAM_IDS = ['2022h', '2022a', '2023h', '2023a', '2024h', '2024a', '2025h', '2025a'];
const SECTION_KINDS = {
  '2022h': ['am1', 'am2', 'pm1', 'pm2'], '2022a': ['am1', 'am2', 'pm1', 'pm2'], '2023h': ['am1', 'am2', 'pm1', 'pm2'],
  '2023a': ['am1', 'am2', 'pm'], '2024h': ['am1', 'am2', 'pm'], '2024a': ['am1', 'am2', 'pm'], '2025h': ['am1', 'am2', 'pm'], '2025a': ['am1', 'am2', 'pm']
};
const AM_TOTAL = { am1: 30, am2: 25 };
const CATEGORIES = ['technology', 'management', 'strategy'];

const isStr = (x) => typeof x === 'string';
const isInt = (x) => Number.isInteger(x);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const textLen = (h) => String(h).replace(/<[^>]*>/g, '').replace(ENTITY, 'x').length;
const strip = (h) => String(h).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

function loadData(args) {
  if (args.sample) return JSON.parse(fs.readFileSync(path.join(__dirname, 'work', 'sample.json'), 'utf8'));
  const file = path.resolve(args.data || path.join(ROOT, 'docs', 'data.js'));
  const sb = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sb, { filename: file });
  return sb.window.DATA;
}

function validateData(data, opts) {
  const relaxed = !!(opts && opts.sample);
  const errors = [], warnings = [];
  const E = (m) => errors.push(m), W = (m) => warnings.push(m);
  const ids = {};
  const chaptersDef = JSON.parse(fs.readFileSync(path.join(__dirname, 'chapters.json'), 'utf8'));
  const fieldOf = {};
  chaptersDef.forEach((c) => { fieldOf[c.no] = c.field; });
  const stats = { figLossy: 0, finalsTotal: 0, finalsFromExam: 0, mcTotal: 0 };

  function regId(id, re, where) {
    if (!isStr(id)) { E(where + ': id が文字列でない'); return false; }
    if (!re.test(id)) E(where + ': ID 形式不正 ' + id);
    if (ids[id]) E('ID 重複: ' + id);
    ids[id] = true;
    return true;
  }
  function plain(s, where, opt) {
    if (s === undefined || s === null) { if (!opt) E(where + ': 必須のプレーン文字列がない'); return; }
    if (!isStr(s) || (!opt && !s.trim())) { E(where + ': プレーン文字列が不正/空'); return; }
    // & は表示時に escapeHtml されるため許可(例: MITRE ATT&CK)。< > は禁止
    if (/[<>]/.test(s)) E(where + ': プレーン文字列に < > を含む');
  }

  // ----- HTML 断片検査 -----
  function html(s, where, o) {
    o = o || {};
    if (!isStr(s) || (!o.optional && !s.trim())) { if (!(o.optional && (s === null || s === undefined))) E(where + ': HTML が空/非文字列'); return; }
    if (/<img|<script|<svg|<iframe|<style|<link|<a[\s>]/i.test(s)) E(where + ': 禁止タグ(img/script/svg/iframe/style/link/a)');
    if (/\bon\w+\s*=/i.test(s)) E(where + ': on* 属性');
    if (/data:/.test(s)) E(where + ': data: を含む');
    if (/https?:\/\//.test(s)) E(where + ': 外部URL');
    const outsidePre = s.replace(/<pre[\s\S]*?<\/pre>/g, '');
    if (/\n/.test(outsidePre)) E(where + ': pre 外に改行文字');
    const stack = [];
    const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^<>]*)>/g;
    let m, last = 0, bare = '';
    while ((m = re.exec(s))) {
      bare += s.slice(last, m.index); last = re.lastIndex;
      const close = m[1] === '/', tag = m[2].toLowerCase(), attrs = m[3];
      if (TAGS.indexOf(tag) < 0) { E(where + ': 許可外タグ <' + tag + '>'); continue; }
      if (tag === 'h4' && !o.allowH4) E(where + ': h4 はレッスン本文のみ');
      if (close) {
        if (VOID.indexOf(tag) >= 0) continue;
        if (stack.pop() !== tag) E(where + ': タグ不整合 </' + tag + '>');
        continue;
      }
      if (/"/.test(attrs)) E(where + ': 属性値は単引用符を使う <' + tag + '>');
      const ar = /([a-zA-Z-]+)\s*=\s*'([^']*)'/g; let am;
      while ((am = ar.exec(attrs))) {
        if (ATTRS.indexOf(am[1]) < 0) E(where + ': 許可外属性 ' + am[1]);
        else if (am[1] === 'class') am[2].split(/\s+/).filter(Boolean).forEach((c) => { if (CLASSES.indexOf(c) < 0) W(where + ': 未知の class ' + c); });
        else if (!/^\d+$/.test(am[2])) E(where + ': ' + am[1] + ' は数値');
      }
      if (attrs.replace(ar, '').replace(/\/|\s/g, '')) E(where + ': 属性の書式不正 <' + tag + attrs + '>');
      if (VOID.indexOf(tag) < 0 && !/\/\s*$/.test(attrs)) stack.push(tag);
    }
    bare += s.slice(last);
    if (stack.length) E(where + ': 閉じ忘れ <' + stack.join(',') + '>');
    const rest = bare.replace(ENTITY, '');
    if (/[<>&]/.test(rest)) E(where + ': 裸の < > & (' + (rest.match(/.{0,8}[<>&].{0,8}/) || [''])[0] + ')');
  }

  // ----- 解説(mc4 / ox)。欠落なら false -----
  function explainOf(q, where, kind) {
    const ex = q.explain;
    if (!isObj(ex)) { E(where + ': explain がない'); return false; }
    const before = errors.length;
    const need = (v, n, name) => {
      if (!isStr(v) || textLen(v) < n) E(where + ': explain.' + name + ' が ' + n + '字未満/欠落');
      else if (PLACEHOLDER.test(strip(v))) E(where + ': explain.' + name + ' がプレースホルダ');
      else html(v, where + ' explain.' + name);
    };
    if (kind === 'ox') { need(ex.conclusion, 10, 'conclusion'); need(ex.basis, 30, 'basis'); }
    else {
      need(ex.conclusion, 15, 'conclusion'); need(ex.basis, 60, 'basis');
      if (isStr(ex.conclusion) && isInt(q.answer) && ex.conclusion.indexOf(LB[q.answer - 1]) < 0) E(where + ': conclusion に正解ラベルがない');
      if (isStr(ex.basis) && textLen(ex.basis) < 100 && isStr(ex.basis)) W(where + ': basis が 100字未満');
      if (!Array.isArray(ex.wrong) || ex.wrong.length !== 3) E(where + ': wrong は3件必要');
      else {
        const labels = LB.filter((_, i) => i + 1 !== q.answer);
        ex.wrong.forEach((w, i) => {
          if (!isStr(w) || textLen(w) < 15) E(where + ': wrong[' + i + '] が15字未満');
          else {
            if (w.charAt(0) !== labels[i]) E(where + ': wrong[' + i + '] は "' + labels[i] + '" 始まりであるべき');
            if (PLACEHOLDER.test(strip(w))) E(where + ': wrong[' + i + '] がプレースホルダ');
            html(w, where + ' wrong[' + i + ']');
          }
        });
      }
    }
    return errors.length === before;
  }

  function checkMc(q, where, o) {
    o = o || {};
    if (!isObj(q)) { E(where + ': 問題がオブジェクトでない'); return false; }
    stats.mcTotal++;
    if (q.type !== 'mc4') E(where + ': type は mc4');
    html(q.stem, where + ' stem');
    if (!Array.isArray(q.choices) || q.choices.length !== 4) E(where + ': choices は4個');
    else q.choices.forEach((c, i) => html(c, where + ' choices[' + i + ']'));
    if (!isInt(q.answer) || q.answer < 1 || q.answer > 4) E(where + ': answer は 1〜4');
    if (q.altAnswers !== undefined && !(Array.isArray(q.altAnswers) && q.altAnswers.every((n) => isInt(n) && n >= 1 && n <= 4))) E(where + ': altAnswers 不正');
    if (q.voided !== undefined && typeof q.voided !== 'boolean') E(where + ': voided は boolean');
    if (q.figLossy) { stats.figLossy++; if (!/【図省略/.test(q.stem || '')) E(where + ': figLossy 問は本文に【図省略: 理由】が必要'); }
    if (q.tip !== undefined) html(q.tip, where + ' tip');
    const okExplain = explainOf(q, where, 'mc4');
    if (q.sourceExam !== undefined) {
      const se = q.sourceExam;
      if (!isObj(se) || !isStr(se.exam) || !isStr(se.kind) || !isInt(se.no)) E(where + ': sourceExam 不正');
      else {
        if (EXAM_IDS.indexOf(se.exam) < 0) E(where + ': sourceExam.exam 不正 ' + se.exam);
        if (se.kindOfUse !== undefined && ['verbatim', 'adapted'].indexOf(se.kindOfUse) < 0) E(where + ': kindOfUse 不正');
        pendingSource.push({ where, se });
      }
    }
    if (o.chapterNo) {
      if (q.chapter !== o.chapterNo) E(where + ': chapter が章番号と不一致');
      if (q.field !== fieldOf[o.chapterNo]) E(where + ': field が章表と不一致');
    }
    return okExplain;
  }

  const pendingSource = [];
  const examQuestionKeys = {};

  // ----- 章 -----
  const chapters = Array.isArray(data.chapters) ? data.chapters : (E('chapters が配列でない'), []);
  if (!relaxed && (chapters.length !== 12 || chapters.some((c, i) => c.no !== i + 1))) E('章は no 1〜12 の12章が必要(現在 ' + chapters.length + ')');
  chapters.forEach((c) => {
    const def = chaptersDef[c.no - 1], w = '章' + c.no;
    if (!def) { E(w + ': no が範囲外'); return; }
    regId(c.id, /^c\d{2}$/, w);
    if (c.id !== def.id) E(w + ': id が ' + def.id + ' でない');
    if (c.title !== def.title) E(w + ': title が chapters.json と不一致');
    if (c.field !== def.field) E(w + ': field が chapters.json と不一致');
    plain(c.title, w + ' title'); plain(c.field, w + ' field'); plain(c.summary, w + ' summary');
    if (isStr(c.summary) && (c.summary.length < 80 || c.summary.length > 200) && !relaxed) W(w + ': summary は 80〜200字');
    const lessons = Array.isArray(c.lessons) ? c.lessons : [];
    if (!relaxed && lessons.length !== def.lessons.length) E(w + ': lessons 数 ' + lessons.length + ' (期待 ' + def.lessons.length + ')');
    lessons.forEach((l, li) => {
      const lw = w + ' lesson' + (li + 1);
      regId(l.id, /^c\d{2}-l\d{2}$/, lw);
      if (def.lessons[li] && (l.id !== def.lessons[li].id || l.title !== def.lessons[li].title)) E(lw + ': id/title が chapters.json と不一致');
      plain(l.title, lw + ' title');
      if (!Array.isArray(l.topics) || l.topics.length < 3 || l.topics.length > 8) E(lw + ': topics は3〜8個');
      else l.topics.forEach((t) => plain(t, lw + ' topic'));
      const pages = Array.isArray(l.pages) ? l.pages : [];
      if (pages.length < 2 || pages.length > 4) E(lw + ': pages は2〜4 (現在 ' + pages.length + ')');
      pages.forEach((pg) => {
        const pw = lw + ' ' + pg.id;
        regId(pg.id, /^c\d{2}-l\d{2}-p\d{2}$/, pw);
        plain(pg.title, pw + ' title');
        html(pg.html, pw + ' html', { allowH4: true });
        if (isStr(pg.html)) {
          if (textLen(pg.html) < 400) W(pw + ': html が400字未満');
          if (!/<b class='key'>/.test(pg.html)) W(pw + ': <b class=\'key\'> が無い');
        }
        const quiz = Array.isArray(pg.quiz) ? pg.quiz : [];
        if (!quiz.length) E(pw + ': quiz が1問以上必要');
        quiz.forEach((q) => {
          const qw = pw + ' ' + q.id;
          regId(q.id, /^c\d{2}-l\d{2}-p\d{2}-z\d+$/, qw);
          if (q.type !== 'ox') E(qw + ': type は ox');
          html(q.text, qw + ' text');
          if (typeof q.answer !== 'boolean') E(qw + ': answer は boolean');
          explainOf(q, qw, 'ox');
        });
      });
    });
    const samples = Array.isArray(c.samples) ? c.samples : [], finals = Array.isArray(c.finals) ? c.finals : [];
    if (samples.length < 1 || samples.length > 2) E(w + ': samples は1〜2 (現在 ' + samples.length + ')');
    if (finals.length < 5 || finals.length > 7) E(w + ': finals は5〜7 (現在 ' + finals.length + ')');
    samples.forEach((q) => { regId(q.id, /^c\d{2}-s\d+$/, w + ' sample'); checkMc(q, w + ' ' + q.id, { chapterNo: c.no }); });
    finals.forEach((q) => {
      regId(q.id, /^c\d{2}-f\d+$/, w + ' final'); checkMc(q, w + ' ' + q.id, { chapterNo: c.no });
      stats.finalsTotal++; if (q.sourceExam) stats.finalsFromExam++;
      if (q.figLossy) E(w + ' ' + q.id + ': finals に figLossy 問は不可');
    });
    if (finals.length && finals.filter((q) => q.sourceExam).length * 2 < finals.length) W(w + ': finals の過去問由来が半数未満');
  });

  // ----- 試験 -----
  const exams = Array.isArray(data.exams) ? data.exams : (E('exams が配列でない'), []);
  if (!relaxed && (exams.length !== 8 || EXAM_IDS.some((id, i) => !exams[i] || exams[i].id !== id))) E('回は ' + EXAM_IDS.join(',') + ' の順で8回必要');
  const table = [];
  exams.forEach((ex) => {
    const ew = '回' + ex.id;
    regId(ex.id, /^\d{4}[ha]$/, ew);
    plain(ex.label, ew + ' label'); plain(ex.era, ew + ' era');
    if (!isInt(ex.year) || ['h', 'a'].indexOf(ex.season) < 0) E(ew + ': year/season 不正');
    const secs = Array.isArray(ex.sections) ? ex.sections : [];
    const kinds = secs.map((s) => s.kind);
    const expected = SECTION_KINDS[ex.id] || [];
    if (!relaxed && kinds.join() !== expected.join()) E(ew + ': 区分は ' + expected.join(',') + ' (現在 ' + kinds.join(',') + ')');
    secs.forEach((s) => {
      const sw = s.id;
      regId(s.id, /^\d{4}[ha]-(am1|am2|pm1|pm2|pm)$/, ew);
      if (s.id !== ex.id + '-' + s.kind) E(sw + ': id と kind が不一致');
      plain(s.label, sw + ' label');
      if (!isInt(s.timeLimitMin) || s.timeLimitMin <= 0) E(sw + ': timeLimitMin 不正');
      const isAm = s.kind === 'am1' || s.kind === 'am2';
      let missing = 0, lossy = 0, count = 0;
      if (isAm) {
        const qs = Array.isArray(s.questions) ? s.questions : [];
        count = qs.length;
        if (!relaxed && (s.total !== AM_TOTAL[s.kind] || qs.length !== AM_TOTAL[s.kind])) E(sw + ': 問数は ' + AM_TOTAL[s.kind] + ' (現在 ' + qs.length + ')');
        if (s.total !== qs.length) E(sw + ': total と questions 数が不一致');
        const seen = {};
        qs.forEach((q) => {
          const qw = sw + ' q' + q.no;
          if (!isInt(q.no)) E(qw + ': no 不正');
          else { if (seen[q.no]) E(sw + ': 問番号重複 ' + q.no); seen[q.no] = true; }
          regId(q.id, /^\d{4}[ha]-(am1|am2)-q\d{2}$/, qw);
          if (isInt(q.no) && q.id !== s.id + '-q' + String(q.no).padStart(2, '0')) E(qw + ': id と no が不一致');
          if (q.kind !== s.kind) E(qw + ': kind 不一致');
          if (!isInt(q.chapter) || q.chapter < 1 || q.chapter > 12) E(qw + ': chapter 1〜12');
          else if (q.field !== fieldOf[q.chapter]) E(qw + ': field が章表と不一致');
          if (s.kind === 'am1') {
            if (!isStr(q.category)) E(qw + ': am1 は category 必須');
            else if (CATEGORIES.indexOf(q.category) < 0) W(qw + ': 未知の category ' + q.category);
          }
          if (!checkMc(q, qw)) missing++;
          if (q.figLossy) lossy++;
          examQuestionKeys[ex.id + '|' + s.kind + '|' + q.no] = true;
        });
        for (let n = 1; n <= qs.length; n++) if (!seen[n]) E(sw + ': 問番号 ' + n + ' が欠番');
      } else {
        count = checkPm(s, ex, sw, html, plain, regId, explainOf, E, W, relaxed, fieldOf);
        missing = count.missing; count = count.count;
      }
      table.push([ex.id, s.kind, count, missing, lossy]);
    });
  });
  pendingSource.forEach((p) => {
    if (!examQuestionKeys[p.se.exam + '|' + p.se.kind + '|' + p.se.no]) E(p.where + ': sourceExam が実在しない (' + p.se.exam + ' ' + p.se.kind + ' 問' + p.se.no + ')');
  });
  if (stats.mcTotal && stats.figLossy / stats.mcTotal > 0.05) W('figLossy が全体の5%超 (' + stats.figLossy + '件)');
  if (stats.figLossy) W('figLossy 件数: ' + stats.figLossy);
  return { errors, warnings, table, stats };
}

function checkPm(s, ex, sw, html, plain, regId, explainOf, E, W, relaxed, fieldOf) {
  const problems = Array.isArray(s.problems) ? s.problems : [];
  let missing = 0, leafCount = 0;
  plain(s.selectRule, sw + ' selectRule');
  if (!isNum(s.maxScore)) E(sw + ': maxScore 不正');
  const req = Array.isArray(s.requiredNos) ? s.requiredNos : (E(sw + ': requiredNos が配列でない'), []);
  if (!isInt(s.chooseCount)) E(sw + ': chooseCount 不正');
  const nos = problems.map((p) => p.no);
  if (problems.length < (relaxed ? 1 : 2)) E(sw + ': problems は2以上');
  req.forEach((n) => { if (nos.indexOf(n) < 0) E(sw + ': requiredNos に存在しない問 ' + n); });
  if (isInt(s.chooseCount) && s.chooseCount > problems.length - req.length) E(sw + ': chooseCount が非必須の大問数を超える');
  if (s.kind === 'pm1' && (problems.length !== 3 || s.chooseCount !== 2)) W(sw + ': 旧pm1は3問/chooseCount 2 を期待');
  if (s.kind === 'pm2' && (problems.length !== 2 || s.chooseCount !== 1)) W(sw + ': 旧pm2は2問/chooseCount 1 を期待');
  problems.forEach((p) => {
    const pw = sw + ' 問' + p.no;
    regId(p.id, /^\d{4}[ha]-pm[12]?-p\d+$/, pw);
    if (p.id !== s.id.replace(/-(pm[12]?)$/, '-$1') + '-p' + p.no) E(pw + ': id と no が不一致');
    if (!isInt(p.no)) E(pw + ': no 不正');
    plain(p.title, pw + ' title');
    if (!Array.isArray(p.chapters) || p.chapters.length < 1 || p.chapters.length > 3 || !p.chapters.every((n) => isInt(n) && n >= 1 && n <= 12)) E(pw + ': chapters は1〜3個の 1〜12');
    else if (p.field !== fieldOf[p.chapters[0]]) E(pw + ': field が chapters[0] の field と不一致');
    plain(p.field, pw + ' field');
    if (typeof p.required !== 'boolean' || p.required !== (req.indexOf(p.no) >= 0)) E(pw + ': required と requiredNos が不整合');
    if (p.points !== null && !isNum(p.points)) E(pw + ': points は数値か null');
    html(p.intent, pw + ' intent'); html(p.review, pw + ' review'); html(p.passage, pw + ' passage');
    const leaves = Array.isArray(p.questions) ? p.questions : [];
    if (!leaves.length) E(pw + ': questions が空');
    leaves.forEach((lf) => {
      leafCount++;
      const lw = pw + ' ' + lf.id;
      regId(lf.id, /^\d{4}[ha]-pm[12]?-p\d+-q\d+(-\d+)?$/, lw);
      if (isStr(lf.id) && lf.id.indexOf(p.id + '-q') !== 0) E(lw + ': id が大問IDで始まらない');
      plain(lf.label, lw + ' label');
      if (!isStr(lf.no) || !lf.no) E(lw + ': no は文字列');
      if (lf.points !== null && !isNum(lf.points)) E(lw + ': points は数値か null');
      html(lf.prompt, lw + ' prompt');
      if (['text', 'blank', 'choice'].indexOf(lf.answerType) < 0) E(lw + ': answerType 不正');
      let bad = false;
      if (!isStr(lf.answerExample) || textLen(lf.answerExample) < 2) { E(lw + ': answerExample が2字未満'); bad = true; }
      else html(lf.answerExample, lw + ' answerExample');
      if (lf.answerType === 'blank') {
        if (!Array.isArray(lf.blanks) || !lf.blanks.length) { E(lw + ': blank には blanks が必要'); bad = true; }
        else lf.blanks.forEach((b) => {
          if (!isObj(b) || !isStr(b.key) || !isStr(b.answer)) E(lw + ': blanks 要素不正');
          else if (isStr(lf.answerExample) && strip(lf.answerExample).indexOf(strip(b.answer)) < 0) E(lw + ': blanks[' + b.key + '] が answerExample に含まれない');
        });
      } else if (lf.blanks !== undefined) E(lw + ': blanks は blank のみ');
      const kps = Array.isArray(lf.keyPoints) ? lf.keyPoints : [];
      if (!kps.length) { E(lw + ': keyPoints が1個以上必要'); bad = true; }
      kps.forEach((k) => {
        html(k && k.text, lw + ' keyPoint');
        if (!(k && (k.point === null || isNum(k.point)))) E(lw + ': keyPoint.point は数値か null');
      });
      const withPt = kps.filter((k) => k && isNum(k.point));
      if (withPt.length && withPt.length !== kps.length) W(lw + ': keyPoints の配点有り/無しが混在');
      if (withPt.length === kps.length && kps.length && isNum(lf.points) && withPt.reduce((a, k) => a + k.point, 0) !== lf.points) E(lw + ': keyPoints 配点合計が points と不一致');
      if (lf.comment === undefined) E(lw + ': comment がない(null 可)');
      else if (lf.comment !== null) html(lf.comment, lw + ' comment');
      const ex = lf.explain;
      if (!isObj(ex)) { E(lw + ': explain がない'); bad = true; }
      else {
        if (!isStr(ex.conclusion) || textLen(ex.conclusion) < 10) { E(lw + ': explain.conclusion が10字未満'); bad = true; } else html(ex.conclusion, lw + ' conclusion');
        if (!isStr(ex.basis) || textLen(ex.basis) < 60) { E(lw + ': explain.basis が60字未満'); bad = true; } else html(ex.basis, lw + ' basis');
        if (ex.pitfalls !== undefined) {
          if (!Array.isArray(ex.pitfalls)) E(lw + ': pitfalls は配列');
          else ex.pitfalls.forEach((x) => html(x, lw + ' pitfall'));
        }
        [ex.conclusion, ex.basis].concat(ex.pitfalls || []).forEach((t) => { if (isStr(t) && PLACEHOLDER.test(strip(t))) { E(lw + ': explain がプレースホルダ'); bad = true; } });
      }
      if (bad) missing++;
    });
  });
  void explainOf;
  return { count: problems.length, missing };
}

function parseArgs(argv) {
  const a = { sample: false, strict: false, verbose: false, data: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--sample') a.sample = true;
    else if (argv[i] === '--strict') a.strict = true;
    else if (argv[i] === '--verbose') a.verbose = true;
    else if (argv[i] === '--data') a.data = argv[++i];
    else throw new Error('不明なオプション: ' + argv[i]);
  }
  return a;
}

function main(argv) {
  const args = parseArgs(argv);
  const data = loadData(args);
  const r = validateData(data, { sample: args.sample });
  const lim = args.verbose ? Infinity : 15;
  r.errors.slice(0, lim).forEach((m) => console.log('  E ' + m));
  if (r.errors.length > lim) console.log('  ...他 ' + (r.errors.length - lim) + ' 件の error');
  r.warnings.slice(0, args.verbose ? Infinity : 8).forEach((m) => console.log('  W ' + m));
  if (!args.verbose && r.warnings.length > 8) console.log('  ...他 ' + (r.warnings.length - 8) + ' 件の warning');
  console.log('ERROR ' + r.errors.length + ' / WARN ' + r.warnings.length);
  console.log('回|区分|問数(大問数)|解説欠落|figLossy');
  r.table.forEach((t) => console.log(t.join('|')));
  return r.errors.length || (args.strict && r.warnings.length) ? 1 : 0;
}

module.exports = { validateData, loadData };
if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
