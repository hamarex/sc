// 担当C 作業用: src/{id}.js -> tools/work/exams/{id}.json
const fs = require('fs'), path = require('path');
const LB = ['ア','イ','ウ','エ'];
const root = path.resolve(__dirname, '../../../..');
const chs = JSON.parse(fs.readFileSync(path.join(root,'tools/chapters.json'),'utf8'));
const fieldOf = {}; chs.forEach(c => fieldOf[c.no] = c.field);
const answers = JSON.parse(fs.readFileSync(path.join(__dirname,'answers.json'),'utf8'));
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const TAGRE=/<(br|table|pre|div|b|i|sup|sub|p|ul|ol|li|code|span|em)[ >\/]/;
const h = s => (typeof s === 'string' && s.charAt(0) === '!') ? s.slice(1) : (TAGRE.test(s) ? s : esc(s.replace(/&(lt|gt|amp);/g, m => ({"&lt;":"<","&gt;":">","&amp;":"&"})[m])));
const ids = process.argv.slice(2);
const total = {'am1':30,'am2':25};
for (const id of ids) {
  const src = require(path.join(__dirname,'src',id+'.js'));
  const kind = id.split('-')[1];
  const ans = answers[id];
  const qs = src.qs.map(q => {
    const a = ans[q.n-1];
    const wl = LB.filter((_,i)=>i+1!==a);
    if (!q.c || q.c.length!==4) throw new Error(id+' q'+q.n+': choices');
    if (!q.w || q.w.length!==3) throw new Error(id+' q'+q.n+': wrong');
    const o = {
      id: id+'-q'+String(q.n).padStart(2,'0'), type:'mc4',
      stem: h(q.s), choices: q.c.map(h), answer: a,
      explain: { conclusion: '正解は'+LB[a-1]+'。'+h(q.con), basis: h(q.bas),
                 wrong: q.w.map((t,i)=> wl[i]+': '+h(t)) },
      chapter: q.ch, field: fieldOf[q.ch], no: q.n, kind
    };
    if (kind==='am1') o.category = q.cat;
    if (q.tip) o.tip = h(q.tip);
    if (q.fig) o.figLossy = true;
    return o;
  });
  qs.forEach((q,i)=>{ if (q.no!==i+1) throw new Error(id+' order '+q.no); });
  if (qs.length!==total[kind]) throw new Error(id+' count '+qs.length);
  const out = { id, kind, label: kind==='am1'?'午前I(高度共通)':'午前II(専門)',
    timeLimitMin: kind==='am1'?50:40, total: total[kind], questions: qs };
  fs.writeFileSync(path.join(root,'tools/work/exams',id+'.json'), JSON.stringify(out,null,1));
  console.log(id,'ok',qs.length);
}
