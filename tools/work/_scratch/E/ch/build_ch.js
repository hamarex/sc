const fs = require('fs');
const OUT = '/Users/hiroham/develop/sc/tools/work/chapters/';
const chapters = require('/Users/hiroham/develop/sc/tools/chapters.json');
const Q = require('./qs_data.js');
const EXTRA = require('./extras.js');
const meta = {
  9: { data: require('./ch09_a.js'), summary: 'マルウェアの種類と動作、標的型攻撃(APT・キルチェーン・ATT＆CK)、ランサムウェア、ソーシャルエンジニアリングとBEC、脆弱性情報の評価(CVE・CWE・CVSS・EPSS・KEV)、サプライチェーン攻撃、脅威インテリジェンス、マルウェア解析を整理する。午後の攻撃シナリオ問題にも直結する章である。' },
  10: { data: require('./ch10_a.js'), summary: 'インシデント対応のプロセス、CSIRT・SOC・SOARの体制、ログ管理とSIEM、デジタルフォレンジック、脆弱性・資産管理、事業継続と報告・公表、ペネトレーションテストと演習を扱う。最終のレッスンでは、午後問題で問われるログからの攻撃経路の読み解きを学ぶ。' }
};
const amp = x => typeof x === 'string' ? x.replace(/&(?!(lt|gt|amp|quot|nbsp|#\d+);)/g, '&amp;') : x;
const deepAmp = o => Array.isArray(o) ? o.map(deepAmp) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deepAmp(v)])) : amp(o);
function pad(n) { return String(n).padStart(2, '0'); }
for (const no of [9, 10]) {
  const ch = chapters.find(c => c.no === no);
  const id = 'c' + pad(no);
  const lessons = meta[no].data.map((l, i) => {
    const lid = id + '-l' + pad(i + 1);
    if (l.title !== ch.lessons[i].title) throw new Error('title mismatch ' + lid);
    return {
      id: lid, no: i + 1, title: l.title, topics: l.topics,
      pages: l.pages.map((p, j) => {
        const pid = lid + '-p' + pad(j + 1);
        return {
          id: pid, title: p.title, html: p.html + (EXTRA[pid] || ''),
          quiz: p.quiz.map((z, k) => ({ id: pid + '-z' + (k + 1), type: 'ox', text: amp(z.text), answer: z.answer, explain: { conclusion: amp(z.c), basis: amp(z.b) } }))
        };
      })
    };
  });
  fs.writeFileSync(OUT + `ch${pad(no)}.lessons.json`, JSON.stringify({ id, no, title: ch.title, field: ch.field, summary: meta[no].summary, lessons }, null, 1));
  const q = Q[no];
  const finals = [];
  let ri = 0;
  for (let n = 1; n <= 7; n++) {
    const key = 'f' + n;
    if (q.inlineFinals[key]) finals.push(q.inlineFinals[key]);
    else finals.push({ id: id + '-f' + n, ref: q.refs[ri++] });
  }
  fs.writeFileSync(OUT + `ch${pad(no)}.qs.json`, JSON.stringify(deepAmp({ samples: q.samples, finals }), null, 1));
  console.log(no, lessons.length, lessons.reduce((a, l) => a + l.pages.length, 0), 'refs used', ri, 'of', q.refs.length);
}
