// 午前の公式解答PDFと work/exams/{回}-{am1|am2}.json の answer を照合する。
// 使い方: node tools/verify_am_answers.js [am1|am2]   (既定 am1)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const kind = process.argv[2] || 'am1';
const root = path.join(__dirname, '..');
const map = { 'ア': 1, 'イ': 2, 'ウ': 3, 'エ': 4 };
const pre = kind === 'am1' ? 'koudo' : 'sc';
// 2022h am1 の解答PDFはテキスト層が無いため、画像を目視して転記した値を使う
const manual = { '2022h-am1': 'アアエイウイウウアイ' + 'エアエウウイアエウエ' + 'イアイウアウエウイエ' };
let total = 0, bad = 0;
for (const y of [2022, 2023, 2024, 2025]) for (const [s, c] of [['h', 'h'], ['a', 'a']]) {
  const r = y - 2018, pdf = `${root}/past_exam/${y}r0${r}${c}_${pre}_${kind}_ans.pdf`;
  const txt = cp.execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8' });
  const off = {};
  for (const m of txt.matchAll(/問\s*(\d+)\s+([アイウエ])/g)) off[+m[1]] = map[m[2]];
  const f = `${root}/tools/work/exams/${y}${s}-${kind}.json`;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!Object.keys(off).length && manual[`${y}${s}-${kind}`])
    [...manual[`${y}${s}-${kind}`]].forEach((ch, i) => { off[i + 1] = map[ch]; });
  const n = Object.keys(off).length;
  if (n !== d.questions.length) console.log(`!! ${y}${s}: PDF ${n}問 / JSON ${d.questions.length}問`);
  d.questions.forEach((q, i) => {
    total++;
    const no = i + 1;
    if (off[no] !== q.answer) { bad++; console.log(`MISMATCH ${y}${s} q${no}: json=${q.answer} official=${off[no]}`); }
  });
}
console.log(`checked ${total}, mismatches ${bad}`);
