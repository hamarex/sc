const fs=require('fs');
const dir='/Users/hiroham/develop/sc/tools/work/exams/';
const files=process.argv.slice(2);
const ALLOWED=new Set('p br b i em sub sup code pre ul ol li table thead tbody tr th td span div h4'.split(' '));
const VOID=new Set(['br']);
const CLS=new Set('key trap t fig code note blank'.split(' '));
let errs=0;
function err(w,m){errs++;console.log('ERR',w,m);}
function html(w,s){
  if(typeof s!=='string'){err(w,'not string');return;}
  if(/<(img|script|svg)|data:|https?:\/\//i.test(s)) err(w,'forbidden');
  const re=/<(\/?)([a-zA-Z0-9]+)([^<>]*)>/g; let m; const st=[]; let last=0;
  let stripped=s.replace(re,(all,sl,tag,attrs)=>{
    tag=tag.toLowerCase();
    if(!ALLOWED.has(tag)) err(w,'tag '+tag);
    if(!sl){
      const ar=/([a-z]+)=('([^']*)'|"([^"]*)")/g; let a; let rest=attrs.replace(ar,(x,n,q,v1,v2)=>{
        if(q[0]=='"') err(w,'dq attr');
        const v=v1||v2;
        if(n=='class'){v.split(/\s+/).forEach(c=>{if(!CLS.has(c))err(w,'class '+c);});}
        else if(n=='colspan'||n=='rowspan'){if(!/^\d+$/.test(v))err(w,'span');}
        else err(w,'attr '+n);
        return '';});
      if(rest.trim()&&rest.trim()!='/') err(w,'attr junk '+rest);
      if(!VOID.has(tag)) st.push(tag);
    } else {
      const t=st.pop(); if(t!==tag) err(w,'mismatch '+tag+' vs '+t);
    }
    return '';
  });
  if(st.length) err(w,'unclosed '+st.join(','));
  const bare=stripped.replace(/&(lt|gt|amp|quot|nbsp|#\d+|#x[0-9a-fA-F]+);/g,'');
  if(/[<>&]/.test(bare)) err(w,'bare <>& : '+bare.match(/.{0,15}[<>&].{0,15}/)[0]);
  if(/\n/.test(s) && !/<pre/.test(s)) err(w,'newline outside pre');
  // newline outside pre
  const nopre=s.replace(/<pre[\s\S]*?<\/pre>/g,'');
  if(/\n/.test(nopre)) err(w,'newline outside pre(2)');
}
const PH=/TODO|省略|後述|同上|解説略/;
for(const f of files){
  const d=JSON.parse(fs.readFileSync(dir+f,'utf8'));
  const probs=d.problems||[];
  for(const p of probs){
    ['intent','review','passage'].forEach(k=>html(p.id+'.'+k,p[k]));
    if(!p.intent||!p.review) err(p.id,'empty');
    for(const q of p.questions){
      const w=q.id;
      html(w+'.prompt',q.prompt); html(w+'.ans',q.answerExample);
      q.keyPoints.forEach((k,i)=>html(w+'.kp'+i,k.text));
      if(q.comment) html(w+'.comment',q.comment);
      html(w+'.c',q.explain.conclusion); html(w+'.b',q.explain.basis);
      (q.explain.pitfalls||[]).forEach((x,i)=>html(w+'.pit'+i,x));
      if(q.explain.conclusion.length<10) err(w,'concl short');
      if(q.explain.basis.length<60) err(w,'basis short '+q.explain.basis.length);
      if(q.answerExample.length<2) err(w,'ans short');
      if(!q.keyPoints.length) err(w,'kp');
      if(q.answerType=='blank'&&!(q.blanks&&q.blanks.length)) err(w,'blanks');
      if(/TODO|解説略/.test(q.explain.basis+q.explain.conclusion)) err(w,'placeholder');
    }
  }
  console.log(f, probs.length,'problems', probs.reduce((a,p)=>a+p.questions.length,0),'leaves');
}
console.log('errors',errs);
