const fs = require('fs'), path = require('path');
const LB = ['ア','イ','ウ','エ'];
const root = path.resolve(__dirname, '../../../..');
const chs = JSON.parse(fs.readFileSync(path.join(root,'tools/chapters.json'),'utf8'));
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const TAGRE=/<(br|table|pre|div|b|i|sup|sub|p|ul|ol|li|code|span|em)[ >\/]/;
const h = s => (typeof s==='string'&&s.charAt(0)==='!')?s.slice(1):(TAGRE.test(s)?s:esc(s.replace(/&(lt|gt|amp);/g,m=>({'&lt;':'<','&gt;':'>','&amp;':'&'})[m])));
const pad=(n,w)=>String(n).padStart(w,'0');
for (const no of process.argv.slice(2).map(Number)) {
  const def = chs[no-1], src = require(path.join(__dirname,'src','ch'+pad(no,2)+'.js'));
  const cid='c'+pad(no,2);
  if (src.lessons.length!==def.lessons.length) throw new Error('lessons '+src.lessons.length);
  const lessons = src.lessons.map((l,li)=>{
    const lid=cid+'-l'+pad(li+1,2);
    return { id:lid, no:li+1, title:def.lessons[li].title, topics:l.topics,
      pages:l.pages.map((p,pi)=>{ const pid=lid+'-p'+pad(pi+1,2);
        return { id:pid, title:p.t, html:p.h,
          quiz:p.z.map((z,zi)=>({ id:pid+'-z'+(zi+1), type:'ox', text:h(z[0]), answer:z[1],
            explain:{conclusion:h(z[2]), basis:h(z[3])} })) }; }) };
  });
  fs.writeFileSync(path.join(root,'tools/work/chapters','ch'+pad(no,2)+'.lessons.json'),
    JSON.stringify({id:cid,no,title:def.title,field:def.field,summary:src.summary,lessons},null,1));
  const mc=(q,id)=>{ if(q.ref) return {id,ref:q.ref};
    const a=q.a, wl=LB.filter((_,i)=>i+1!==a);
    if(q.c.length!==4||q.w.length!==3) throw new Error(id+' shape');
    const o={id,type:'mc4',stem:h(q.s),choices:q.c.map(h),answer:a,
      explain:{conclusion:'正解は'+LB[a-1]+'。'+h(q.con),basis:h(q.bas),wrong:q.w.map((t,i)=>wl[i]+': '+h(t))},
      chapter:no,field:def.field};
    if(q.tip)o.tip=h(q.tip); return o; };
  fs.writeFileSync(path.join(root,'tools/work/chapters','ch'+pad(no,2)+'.qs.json'),
    JSON.stringify({samples:src.samples.map((q,i)=>mc(q,cid+'-s'+(i+1))),finals:src.finals.map((q,i)=>mc(q,cid+'-f'+(i+1)))},null,1));
  console.log('ch'+no,'ok',lessons.length,lessons.reduce((a,l)=>a+l.pages.length,0));
}
