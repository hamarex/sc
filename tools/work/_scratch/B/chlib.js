const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'../../chapters');
const CH=require('../../../chapters.json');
const LAB=['ア','イ','ウ','エ'];
const ALLOWED=/^(p|br|b|i|em|sub|sup|code|pre|ul|ol|li|table|thead|tbody|tr|th|td|span|div|h4)$/;
const errs=[];
function chk(s,where){
  if(/TODO|省略|後述|同上|解説略/.test(s)) errs.push(where+' placeholder');
  const t=s.replace(/&(lt|gt|amp|quot|nbsp|#\d+);/g,'');
  if(/&/.test(t)) errs.push(where+' bare &');
  const re=/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g;let m;const st=[];
  if(/[<>]/.test(t.replace(re,''))) errs.push(where+' bare <>');
  while((m=re.exec(t))){
    if(!ALLOWED.test(m[2])) errs.push(where+' tag '+m[2]);
    if(m[2]==='br') continue;
    if(m[1]){ if(st.pop()!==m[2]) errs.push(where+' mismatch '+m[2]); } else st.push(m[2]);
    if(/"/.test(m[3])) errs.push(where+' dq');
    const c=/class='([^']*)'/.exec(m[3]); if(c&&!c[1].split(' ').every(x=>/^(key|trap|t|fig|code|note|blank)$/.test(x))) errs.push(where+' class '+c[1]);
  }
  if(st.length) errs.push(where+' unclosed '+st);
}
const pad=(n,w=2)=>String(n).padStart(w,'0');
function Z(text,answer,concl,basis){return {text,answer,concl,basis};}
function P(title,html,quiz){return {title,html,quiz};}
function L(topics,pages){return {topics,pages};}
function M(stem,choices,answer,concl,basis,wrong,opt){return {stem,choices,answer,concl,basis,wrong,opt};}
function R(ref){return {ref};}
function build(no,summary,lessons,samples,finals){
  const meta=CH.find(c=>c.no===no);
  const cid='c'+pad(no);
  if(lessons.length!==meta.lessons.length) errs.push('lessons count '+lessons.length);
  if(summary.length<80||summary.length>200) errs.push('summary len '+summary.length);
  let stats={pages:0,quiz:0,short:0};
  const ls=lessons.map((l,i)=>{
    const lid=`${cid}-l${pad(i+1)}`;
    if(l.topics.length<3||l.topics.length>8) errs.push(lid+' topics '+l.topics.length);
    if(l.pages.length<2||l.pages.length>4) errs.push(lid+' pages '+l.pages.length);
    const pages=l.pages.map((p,j)=>{
      const pid=`${lid}-p${pad(j+1)}`;
      chk(p.html,pid+' html');
      if(!/class='key'/.test(p.html)) errs.push(pid+' no key');
      const len=p.html.replace(/<[^>]*>/g,'').length;
      if(len<400) {stats.short++; errs.push(pid+' html short '+len);}
      if(!p.quiz.length||p.quiz.length>2) errs.push(pid+' quiz count');
      stats.pages++;
      const quiz=p.quiz.map((z,k)=>{
        const id=`${pid}-z${k+1}`;
        if(z.concl.length<10) errs.push(id+' concl short');
        if(z.basis.length<30) errs.push(id+' basis short');
        chk(z.text,id);chk(z.concl,id);chk(z.basis,id);stats.quiz++;
        return {id,type:'ox',text:z.text,answer:z.answer,explain:{conclusion:z.concl,basis:z.basis}};
      });
      return {id:pid,title:p.title,html:p.html,quiz};
    });
    return {id:lid,no:i+1,title:meta.lessons[i].title,topics:l.topics,pages};
  });
  const mk=(q,id,kind,i)=>{
    if(q.ref) return {id,ref:q.ref};
    const a=q.answer,Lb=LAB[a-1];
    const min=kind==='s'?1.5:1;
    if(q.choices.length!==4) errs.push(id+' choices');
    if(!q.concl.includes(Lb)) errs.push(id+' concl label');
    if(q.concl.length<15) errs.push(id+' concl short');
    if(q.basis.length<60*min) errs.push(id+' basis short '+q.basis.length);
    const exp=LAB.filter((_,x)=>x!==a-1);
    if(q.wrong.length!==3) errs.push(id+' wrong n');
    q.wrong.forEach((w,x)=>{ if(!w.startsWith(exp[x]+': ')) errs.push(id+' wrong label '+x); if(w.length<15) errs.push(id+' wrong short'); chk(w,id+' w'+x);});
    chk(q.stem,id+' stem');chk(q.concl,id);chk(q.basis,id);q.choices.forEach((c,x)=>chk(c,id+' c'+x));
    const o={id,type:'mc4',stem:q.stem,choices:q.choices,answer:a,explain:{conclusion:q.concl,basis:q.basis,wrong:q.wrong},chapter:no,field:meta.field};
    if(q.opt&&q.opt.src) o.sourceExam=q.opt.src;
    if(q.opt&&q.opt.tip) o.tip=q.opt.tip;
    return o;
  };
  if(samples.length<1||samples.length>2) errs.push('samples n');
  if(finals.length<5||finals.length>7) errs.push('finals n '+finals.length);
  const s=samples.map((q,i)=>mk(q,`${cid}-s${i+1}`,'s'));
  const f=finals.map((q,i)=>mk(q,`${cid}-f${i+1}`,'f'));
  const refs=f.filter(x=>x.ref).length;
  if(errs.length){console.error(cid,'ERRORS\n'+errs.join('\n'));process.exit(1);}
  fs.writeFileSync(path.join(OUT,cid+'.lessons.json'),JSON.stringify({id:cid,no,title:meta.title,field:meta.field,summary,lessons:ls}));
  fs.writeFileSync(path.join(OUT,cid+'.qs.json'),JSON.stringify({samples:s,finals:f}));
  console.log(cid,'OK pages',stats.pages,'quiz',stats.quiz,'samples',s.length,'finals',f.length,'refs',refs);
}
module.exports={Z,P,L,M,R,build};
