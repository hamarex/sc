const fs = require('fs');
const path = require('path');
const FIELDS = {1:'基礎・リスク',2:'マネジメント・監査',3:'法令・制度',4:'暗号・PKI',5:'認証・認可',6:'ネットワーク',7:'Web・開発',8:'システム・クラウド',9:'脅威・マルウェア',10:'インシデント・運用'};
function leaf(pid, o) {
  const id = pid + '-q' + o.s;
  const r = {
    id, label: o.label, no: o.no, points: null,
    prompt: o.prompt, answerType: o.type || 'text',
    answerExample: o.ans,
  };
  if (o.blanks) r.blanks = o.blanks.map(([key, answer]) => ({ key, answer }));
  r.keyPoints = o.kp.map(k => Array.isArray(k) ? { text: k[0], point: k[1] } : { text: k, point: null });
  r.comment = o.comment || null;
  r.explain = { conclusion: o.c, basis: o.b };
  if (o.p && o.p.length) r.explain.pitfalls = o.p;
  return r;
}
function norm(h) {
  if (typeof h !== 'string') return h;
  const parts = h.split(/(<pre[\s\S]*?<\/pre>)/);
  return parts.map((x, i) => i % 2 ? x : x.replace(/\n/g, '')).join('')
    .replace(/(https?:)\/\//g, '$1&#47;&#47;').replace(/<h4>([\s\S]*?)<\/h4>/g, '<p><b>$1</b></p>')
    .replace(/(data):/gi, '$1&#58;');
}
function deep(o) {
  if (typeof o === 'string') return norm(o);
  if (Array.isArray(o)) return o.map(deep);
  if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) r[k] = (k === 'id' || k === 'title' || k === 'label' || k === 'no' || k === 'field' || k==='key') ? o[k] : deep(o[k]); return r; }
  return o;
}
function problem(examId, o) {
  return deep(problem0(examId, o));
}
function problem0(examId, o) {
  return {
    id: examId + '-pm-p' + o.no, no: o.no, title: o.title, chapters: o.chapters,
    field: FIELDS[o.chapters[0]], required: !!o.required, points: o.points == null ? null : o.points,
    intent: o.intent, review: o.review, passage: o.passage,
    questions: o.leaves.map(l => leaf(examId + '-pm-p' + o.no, l)),
  };
}
function writeExam(meta, problems) {
  const dir = '/Users/hiroham/develop/sc/tools/work/exams';
  const base = {
    id: meta.examId + '-pm', kind: 'pm', label: '午後', timeLimitMin: 150, maxScore: 100,
    selectRule: meta.selectRule, requiredNos: [], chooseCount: 2, problems: [],
  };
  fs.writeFileSync(path.join(dir, meta.examId + '-pm.json'), JSON.stringify(base, null, 1));
  problems.forEach((p, i) => {
    fs.writeFileSync(path.join(dir, meta.examId + '-pm.part' + (i + 1) + '.json'), JSON.stringify({ problems: [p] }, null, 1));
  });
}
module.exports = { leaf, problem, writeExam, FIELDS };
