// usage: node build.js <examId-kind> e.g. 2022h-am2
const fs=require('fs'),path=require('path');
const D=__dirname, OUT=path.join(D,'../../exams');
const ANS=require('./ans_num.json');
const FIELD={1:'基礎・リスク',2:'マネジメント・監査',3:'法令・制度',4:'暗号・PKI',5:'認証・認可',6:'ネットワーク',7:'Web・開発',8:'システム・クラウド',9:'脅威・マルウェア',10:'インシデント・運用',11:'IT基盤',12:'マネジメント基盤'};
const CAT={t:'technology',m:'management',s:'strategy'};
const LAB=['ア','イ','ウ','エ'];
const key=process.argv[2].replace(/^(\d{4}[ha])-(am[12]).*/,"$1-$2");
const kind=key.split('-')[1];
const src=require('./src/'+key+'.js');
const ans=ANS[key];
let EXTRA={};try{EXTRA=JSON.parse(fs.readFileSync(path.join(D,'extra',key+'.json'),'utf8'));}catch(e){}
const errs=[];
const ALLOWED=/^(p|br|b|i|em|sub|sup|code|pre|ul|ol|li|table|thead|tbody|tr|th|td|span|div|h4)$/;
function chkHtml(s,where){
  if(/TODO|省略|後述|同上|解説略/.test(s)&&where.indexOf('stem')<0&&where.indexOf('choice')<0) errs.push(where+' placeholder');
  const t=s.replace(/&(lt|gt|amp|quot|nbsp|#\d+);/g,'');
  if(/&/.test(t)) errs.push(where+' bare &');
  const stack=[];const re=/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g;let m;
  const noTags=t.replace(re,'');
  if(/[<>]/.test(noTags)) errs.push(where+' bare <>');
  while((m=re.exec(t))){
    if(!ALLOWED.test(m[2])) errs.push(where+' tag '+m[2]);
    if(m[2]==='br') continue;
    if(m[1]) { if(stack.pop()!==m[2]) errs.push(where+' mismatch '+m[2]); } else stack.push(m[2]);
    if(/"/.test(m[3])) errs.push(where+' dquote attr');
  }
  if(stack.length) errs.push(where+' unclosed '+stack);
}
const qs=src.map(r=>{
  const [no,ch,cat,stem,choices,concl,basis0,wrong,opt]=r;
  const basis=basis0+(EXTRA[no]||'');
  const id=`${key}-q${String(no).padStart(2,'0')}`;
  const a=ans[no-1];
  if(choices.length!==4) errs.push(id+' choices');
  const L=LAB[a-1];
  if(!concl.includes(L)) errs.push(id+' concl lacks label '+L);
  if(concl.length<15) errs.push(id+' concl short');
  if(basis.length<60) errs.push(id+' basis short '+basis.length);
  const exp=LAB.filter((_,i)=>i!==a-1);
  if(wrong.length!==3) errs.push(id+' wrong count');
  wrong.forEach((w,i)=>{
    if(!w.startsWith(exp[i]+': ')) errs.push(id+' wrong label '+i+' got '+w.slice(0,3));
    if(w.length<15) errs.push(id+' wrong short '+i);
    if(w.slice(0,3).includes(L)) errs.push(id+' wrong has correct label');
    chkHtml(w,id+' wrong'+i);
  });
  chkHtml(stem,id+' stem');chkHtml(concl,id+' concl');chkHtml(basis,id+' basis');choices.forEach((c,i)=>chkHtml(c,id+' choice'+i));
  const o={id,type:'mc4',stem,choices,answer:a,explain:{conclusion:concl,basis,wrong},chapter:ch,field:FIELD[ch],no,kind};
  if(kind==='am1'){ if(!CAT[cat]) errs.push(id+' cat'); o.category=CAT[cat]; }
  if(opt&&opt.figLossy) o.figLossy=true;
  if(opt&&opt.voided) o.voided=true;
  return o;
});
const total=kind==='am1'?30:25;
if(qs.length!==total) errs.push('count '+qs.length);
qs.forEach((q,i)=>{ if(q.no!==i+1) errs.push('order '+q.no); });
if(errs.length){ console.error(key,'ERRORS:\n'+errs.join('\n')); process.exit(1); }
const label=kind==='am1'?'午前I(高度共通)':'午前II';
const [Y,S]=[key.slice(0,4),key.slice(4,5)];
const out={id:key,kind,label,timeLimitMin:kind==='am1'?50:40,total,questions:qs};
fs.writeFileSync(path.join(OUT,key+'.json'),JSON.stringify(out));
console.log(key,'OK',qs.length,'min basis',Math.min(...qs.map(q=>q.explain.basis.length)));
