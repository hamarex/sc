const {problem,writeExam}=require('./lib');
const id='2025a';
const ps=[1,2,3,4].map(n=>problem(id,require('./src/2025a_p'+n+'.js')));
writeExam({examId:id,selectRule:'問1〜問4から2問選択'},ps);
console.log(ps.map(p=>p.id+':'+p.questions.length).join(' '));
