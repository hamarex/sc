(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Logic = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var KEY = 'sc.progress.v1';
  var CHOICE_LABELS = ['ア', 'イ', 'ウ', 'エ'];
  var MOCK_MAX = 200;
  var AM_PASS = 0.6, PM_PASS = 0.6;
  var KIND_LABELS = { am1: '午前I(高度共通)', am2: '午前II', pm1: '午後I', pm2: '午後II', pm: '午後' };

  // ---------- 汎用 ----------
  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isStrArr(x) { return Array.isArray(x) && x.every(function (s) { return typeof s === 'string'; }); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function extend(base, patch) {
    var o = {}, k;
    for (k in base) if (has(base, k)) o[k] = base[k];
    for (k in patch) if (has(patch, k)) o[k] = patch[k];
    return o;
  }
  function round1(x) { return Math.round(x * 10) / 10; }

  function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function choiceLabel(i) { return CHOICE_LABELS[i] || ''; }

  // ---------- 採点(単問) ----------
  function gradeOx(q, ans) {
    if (q && q.voided) return { correct: true };
    return { correct: typeof ans === 'boolean' && ans === q.answer };
  }
  function gradeMc(q, ans) {
    if (q && q.voided) return { correct: true };
    if (!isNum(ans)) return { correct: false };
    if (ans === q.answer) return { correct: true };
    return { correct: Array.isArray(q.altAnswers) && q.altAnswers.indexOf(ans) >= 0 };
  }

  // ---------- 解説整形 ----------
  function liList(arr) {
    return '<ul>' + arr.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul>';
  }
  function explainToHtml(q) {
    var e = q && q.explain;
    if (!isObj(e)) return '';
    var h = '';
    if (e.conclusion) h += '<p><b>結論</b>　' + e.conclusion + '</p>';
    if (e.basis) h += '<p><b>根拠</b>　' + e.basis + '</p>';
    if (Array.isArray(e.wrong) && e.wrong.length) h += '<p><b>誤りの選択肢</b></p>' + liList(e.wrong);
    if (Array.isArray(e.pitfalls) && e.pitfalls.length) h += '<p><b>よくある誤答</b></p>' + liList(e.pitfalls);
    if (q.tip) h += '<p><b>コツ</b>　' + q.tip + '</p>';
    return h;
  }

  // ---------- 進捗 ----------
  function emptyProgress() {
    return {
      version: 1, position: null, lessonsDone: [], quizResults: {}, wrongLog: [],
      chapterTest: {}, mockHistory: [], pmSelf: {}, reports: [],
      settings: { passRate: 0.7, unlockAll: false }
    };
  }

  function allValues(o, fn) { return Object.keys(o).every(function (k) { return fn(o[k], k); }); }

  function validate(p) {
    if (!isObj(p)) return '進捗ファイルの形式が正しくありません';
    if (p.version !== 1) return '対応していないバージョンです';
    var pos = p.position;
    if (pos !== null && !(isObj(pos) && isNum(pos.ch) && typeof pos.lessonId === 'string' &&
      (pos.page === undefined || (isNum(pos.page) && pos.page >= 0 && Math.floor(pos.page) === pos.page)))) return 'position が不正です';
    if (!isStrArr(p.lessonsDone)) return 'lessonsDone が不正です';
    if (!isObj(p.quizResults) || !allValues(p.quizResults, function (r) { return isObj(r) && typeof r.correct === 'boolean' && isNum(r.ts); })) return 'quizResults が不正です';
    if (!isStrArr(p.wrongLog)) return 'wrongLog が不正です';
    if (!isObj(p.chapterTest) || !allValues(p.chapterTest, function (r) { return isObj(r) && isNum(r.score) && typeof r.passed === 'boolean'; })) return 'chapterTest が不正です';
    if (!Array.isArray(p.mockHistory) || !p.mockHistory.every(function (m) { return isObj(m) && isNum(m.ts) && typeof m.examId === 'string' && typeof m.kind === 'string'; })) return 'mockHistory が不正です';
    if (!isObj(p.pmSelf) || !allValues(p.pmSelf, function (r) { return isObj(r) && Array.isArray(r.checked) && r.checked.every(isNum) && isNum(r.ts); })) return 'pmSelf が不正です';
    if (!Array.isArray(p.reports) || !p.reports.every(function (r) { return isObj(r) && typeof r.id === 'string' && typeof r.memo === 'string'; })) return 'reports が不正です';
    if (!isObj(p.settings) || !isNum(p.settings.passRate) || typeof p.settings.unlockAll !== 'boolean') return 'settings が不正です';
    return null;
  }

  function loadProgress(storage) {
    var raw;
    try { raw = storage.getItem(KEY); } catch (e) { return { progress: emptyProgress(), ok: false }; }
    if (raw === null || raw === undefined) return { progress: emptyProgress(), ok: true };
    try {
      var p = JSON.parse(raw);
      if (validate(p) === null) return { progress: p, ok: true };
    } catch (e) { /* 壊れたJSON */ }
    return { progress: emptyProgress(), ok: false };
  }
  function saveProgress(storage, p) {
    try { storage.setItem(KEY, JSON.stringify(p)); return true; } catch (e) { return false; }
  }
  function importProgress(json, current) {
    var p;
    try { p = JSON.parse(json); } catch (e) { return { progress: current, error: 'JSONとして読めませんでした' }; }
    var err = validate(p);
    if (err) return { progress: current, error: err };
    return { progress: p, error: null };
  }

  // ---------- 索引 ----------
  function indexData(data) {
    var ix = { qById: {}, lessonById: {}, chapterOfLesson: {}, chapterByNo: {}, sectionById: {}, examById: {}, leafById: {} };
    (data.chapters || []).forEach(function (c) {
      ix.chapterByNo[c.no] = c;
      (c.lessons || []).forEach(function (l) {
        ix.lessonById[l.id] = l; ix.chapterOfLesson[l.id] = c;
        (l.pages || []).forEach(function (pg) { (pg.quiz || []).forEach(function (q) { ix.qById[q.id] = q; }); });
      });
      (c.samples || []).concat(c.finals || []).forEach(function (q) { ix.qById[q.id] = q; });
    });
    (data.exams || []).forEach(function (ex) {
      ix.examById[ex.id] = ex;
      (ex.sections || []).forEach(function (s) {
        ix.sectionById[s.id] = s;
        (s.questions || []).forEach(function (q) { ix.qById[q.id] = q; });
        (s.problems || []).forEach(function (pr) {
          (pr.questions || []).forEach(function (lf) { ix.leafById[lf.id] = lf; });
        });
      });
    });
    return ix;
  }

  // ---------- 進捗更新(すべて新オブジェクト) ----------
  function recordAnswer(p, id, correct, ts) {
    var qr = {}; qr[id] = { correct: !!correct, ts: ts };
    var wl = p.wrongLog.filter(function (x) { return x !== id; });
    if (!correct) wl = wl.concat([id]);
    return extend(p, { quizResults: extend(p.quizResults, qr), wrongLog: wl });
  }
  function markLessonDone(p, lessonId) {
    if (p.lessonsDone.indexOf(lessonId) >= 0) return p;
    return extend(p, { lessonsDone: p.lessonsDone.concat([lessonId]) });
  }
  function setPosition(p, pos) {
    return extend(p, { position: pos === null || pos === undefined ? null : extend(pos, {}) });
  }
  function recordChapterTest(p, no, rate) {
    var prev = p.chapterTest[no], passed = rate >= p.settings.passRate - 1e-9, e = {};
    var wasPassed = !!(prev && prev.passed);
    e[no] = { score: wasPassed ? Math.max(prev.score, rate) : rate, passed: passed || wasPassed };
    return extend(p, { chapterTest: extend(p.chapterTest, e) });
  }
  function isChapterUnlocked(p, no) {
    if (no <= 1 || p.settings.unlockAll) return true;
    var t = p.chapterTest[no - 1];
    return !!(t && t.passed);
  }
  function chapterProgress(p, chapter) {
    var t = p.chapterTest[chapter.no];
    return {
      done: chapter.lessons.filter(function (l) { return p.lessonsDone.indexOf(l.id) >= 0; }).length,
      total: chapter.lessons.length,
      testScore: t ? t.score : null,
      testPassed: !!(t && t.passed)
    };
  }
  function firstUndoneLesson(p, chapter) {
    for (var i = 0; i < chapter.lessons.length; i++) if (p.lessonsDone.indexOf(chapter.lessons[i].id) < 0) return chapter.lessons[i];
    return null;
  }
  function continueTarget(p, data) {
    var ix = indexData(data), pos = p.position, i;
    if (pos && ix.lessonById[pos.lessonId] && isChapterUnlocked(p, pos.ch) && p.lessonsDone.indexOf(pos.lessonId) < 0) {
      var l = ix.lessonById[pos.lessonId], c = ix.chapterOfLesson[pos.lessonId];
      var pg = pos.page >= 0 && pos.page < l.pages.length ? pos.page : 0;
      return { lessonId: l.id, page: pg, ch: c.no, label: '第' + c.no + '章 ' + l.title + ' ページ' + (pg + 1) };
    }
    for (i = 0; i < data.chapters.length; i++) {
      var ch = data.chapters[i];
      if (!isChapterUnlocked(p, ch.no)) continue;
      var u = firstUndoneLesson(p, ch);
      if (u) return { lessonId: u.id, page: 0, ch: ch.no, label: '第' + ch.no + '章 ' + u.title };
    }
    return null;
  }
  function chapterOfId(id) {
    var m = /^c(\d{2})-/.exec(id);
    return m ? parseInt(m[1], 10) : 0;
  }
  function chapterStats(p, data) {
    var ix = indexData(data), out = {};
    Object.keys(p.quizResults).forEach(function (id) {
      var q = ix.qById[id];
      var ch = q && isNum(q.chapter) ? q.chapter : chapterOfId(id);
      if (!ch) return;
      var b = out[ch] || { correct: 0, total: 0 };
      var nb = { correct: b.correct + (p.quizResults[id].correct ? 1 : 0), total: b.total + 1 };
      out[ch] = nb;
    });
    return out;
  }
  function findSection(data, examId, kind) {
    var ex = (data.exams || []).filter(function (e) { return e.id === examId; })[0];
    if (!ex) return null;
    return (ex.sections || []).filter(function (s) { return s.kind === kind; })[0] || null;
  }

  // ---------- 午前 ----------
  function bump(map, key, ok) {
    var b = map[key] || { correct: 0, total: 0 };
    map[key] = { correct: b.correct + (ok ? 1 : 0), total: b.total + 1 };
  }
  function scoreAm(section, answers) {
    answers = answers || {};
    var correct = 0, unanswered = 0, wrongIds = [], byChapter = {}, byCategory = {};
    section.questions.forEach(function (q) {
      var a = answers[q.id], answered = isNum(a), ok = answered && gradeMc(q, a).correct;
      if (!answered) unanswered++;
      if (ok) correct++; else wrongIds.push(q.id);
      if (q.chapter) bump(byChapter, q.chapter, ok);
      if (q.category) bump(byCategory, q.category, ok);
    });
    var total = section.questions.length, rate = total ? correct / total : 0;
    return { correct: correct, total: total, rate: rate, points: round1(rate * 100), pass: rate >= AM_PASS - 1e-9,
      unanswered: unanswered, wrongIds: wrongIds, byChapter: byChapter, byCategory: byCategory };
  }

  // ---------- 午後 ----------
  function validateSelection(section, nos) {
    var req = section.requiredNos || [], choose = section.chooseCount || 0;
    if (!Array.isArray(nos)) return '大問が選択されていません';
    var seen = {}, i;
    for (i = 0; i < nos.length; i++) {
      if (seen[nos[i]]) return '同じ問が重複しています';
      seen[nos[i]] = true;
      if (!section.problems.some(function (p) { return p.no === nos[i]; })) return '問' + nos[i] + 'は存在しません';
    }
    for (i = 0; i < req.length; i++) if (!seen[req[i]]) return '問' + req[i] + 'は必須です';
    var optional = nos.filter(function (n) { return req.indexOf(n) < 0; }).length;
    if (optional !== choose) return '必須問以外から' + choose + '問を選択してください(現在' + optional + '問)';
    return null;
  }
  function leafWeights(leaf) {
    var kps = leaf.keyPoints || [], given = kps.filter(function (k) { return isNum(k.point); });
    var fill = given.length ? given.reduce(function (a, k) { return a + k.point; }, 0) / given.length : 1;
    return kps.map(function (k) { return isNum(k.point) ? k.point : fill; });
  }
  function scorePmLeaf(leaf, checkedIdx) {
    var w = leafWeights(leaf), total = w.reduce(function (a, b) { return a + b; }, 0);
    if (!total) return 0;
    var seen = {}, got = 0;
    (checkedIdx || []).forEach(function (i) {
      if (isNum(i) && i >= 0 && i < w.length && !seen[i]) { seen[i] = true; got += w[i]; }
    });
    return Math.min(1, got / total);
  }
  function scorePmProblem(problem, checkedByLeaf, defaultMax) {
    checkedByLeaf = checkedByLeaf || {};
    var wsum = 0, acc = 0;
    problem.questions.forEach(function (lf) {
      var w = isNum(lf.points) ? lf.points : 1;
      wsum += w; acc += w * scorePmLeaf(lf, checkedByLeaf[lf.id]);
    });
    var ratio = wsum ? acc / wsum : 0, max = isNum(problem.points) ? problem.points : (isNum(defaultMax) ? defaultMax : 100);
    return { ratio: ratio, earned: round1(ratio * max), max: max };
  }
  function scorePmSection(section, selectedNos, checkedByLeaf) {
    var byProblem = {}, earned = 0, max = 0;
    // 配点未設定の大問は、区分の満点を選択数で等分(例: 満点100・2問選択 → 各50点)
    var nSel = (section.requiredNos || []).length + (section.chooseCount || 0);
    var defMax = isNum(section.maxScore) && nSel ? section.maxScore / nSel : 100;
    section.problems.forEach(function (pr) {
      if (selectedNos.indexOf(pr.no) < 0) return;
      var r = scorePmProblem(pr, checkedByLeaf, defMax);
      byProblem[pr.no] = r; earned += r.earned; max += r.max;
    });
    var ratio = max ? earned / max : 0;
    return { ratio: ratio, earned: round1(earned), max: max, pass: ratio >= PM_PASS - 1e-9, byProblem: byProblem };
  }

  // ---------- 履歴・メモ・設定 ----------
  function recordMock(p, entry) {
    var h = p.mockHistory.concat([extend(entry, {})]);
    if (h.length > MOCK_MAX) h = h.slice(h.length - MOCK_MAX);
    return extend(p, { mockHistory: h });
  }
  function savePmSelf(p, leafId, checked, ts) {
    var e = {}; e[leafId] = { checked: (checked || []).slice(), ts: ts };
    return extend(p, { pmSelf: extend(p.pmSelf, e) });
  }
  function addReport(p, id, memo, ts) {
    return extend(p, { reports: p.reports.concat([{ id: id, memo: memo, ts: ts }]) });
  }
  function removeReport(p, i) {
    return extend(p, { reports: p.reports.filter(function (r, k) { return k !== i; }) });
  }
  function setSettings(p, patch) {
    var s = extend(p.settings, {});
    if (patch && isNum(patch.passRate) && patch.passRate >= 0.1 && patch.passRate <= 1) s.passRate = patch.passRate;
    if (patch && typeof patch.unlockAll === 'boolean') s.unlockAll = patch.unlockAll;
    return extend(p, { settings: s });
  }
  function reviewIds(p, data, ix) {
    var idx = ix || indexData(data);
    return p.wrongLog.filter(function (id) { return !!idx.qById[id]; });
  }

  // ---------- 表示補助 ----------
  function formatElapsed(sec) {
    var s = Math.max(0, Math.floor(sec));
    return Math.floor(s / 60) + '分' + ('0' + (s % 60)).slice(-2) + '秒';
  }
  function remainingSec(startTs, nowTs, limitMin) {
    return limitMin * 60 - Math.floor((nowTs - startTs) / 1000);
  }
  function kindLabel(kind) { return KIND_LABELS[kind] || kind; }
  function sourceLabel(data, se) {
    if (!se) return '';
    var ex = (data.exams || []).filter(function (e) { return e.id === se.exam; })[0];
    var name = ex ? ex.era + (ex.season === 'h' ? '春期' : '秋期') : se.exam;
    return name + ' ' + kindLabel(se.kind) + ' 問' + se.no;
  }

  return {
    STORAGE_KEY: KEY, CHOICE_LABELS: CHOICE_LABELS, MOCK_MAX: MOCK_MAX,
    emptyProgress: emptyProgress, validate: validate, loadProgress: loadProgress, saveProgress: saveProgress, importProgress: importProgress,
    escapeHtml: escapeHtml, explainToHtml: explainToHtml, choiceLabel: choiceLabel,
    gradeOx: gradeOx, gradeMc: gradeMc, indexData: indexData,
    recordAnswer: recordAnswer, markLessonDone: markLessonDone, setPosition: setPosition,
    recordChapterTest: recordChapterTest, isChapterUnlocked: isChapterUnlocked, chapterProgress: chapterProgress,
    firstUndoneLesson: firstUndoneLesson, continueTarget: continueTarget, chapterStats: chapterStats, chapterOfId: chapterOfId,
    findSection: findSection, scoreAm: scoreAm, validateSelection: validateSelection,
    scorePmLeaf: scorePmLeaf, scorePmProblem: scorePmProblem, scorePmSection: scorePmSection,
    recordMock: recordMock, savePmSelf: savePmSelf, addReport: addReport, removeReport: removeReport, setSettings: setSettings,
    reviewIds: reviewIds, formatElapsed: formatElapsed, remainingSec: remainingSec, kindLabel: kindLabel, sourceLabel: sourceLabel
  };
});
