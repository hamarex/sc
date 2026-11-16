import json,sys,glob,re
tot=0
for p in sorted(glob.glob('/Users/hiroham/develop/sc/tools/work/exams/20*pm*.json')):
    try: d=json.load(open(p,encoding='utf8'))
    except Exception as e: print('BAD',p,e); continue
    for pr in d.get('problems',[]):
        n=len(pr['questions']); tot+=n
        for q in pr['questions']:
            e=q['explain']
            if len(e['conclusion'])<10 or len(e['basis'])<60: print('SHORT',q['id'],len(e['basis']))
            if q['answerType']=='blank' and not q.get('blanks'): print('NOBLANK',q['id'])
            if not q['keyPoints']: print('NOKP',q['id'])
            for k in ['prompt','answerExample']:
                if re.search(r'<(?!/?(p|br|b|i|em|sub|sup|code|pre|ul|ol|li|table|thead|tbody|tr|th|td|span|div|h4)\b)',q[k]): print('TAG',q['id'],k)
        s=pr['passage']
        for m in re.finditer(r'<(?!/?(p|br|b|i|em|sub|sup|code|pre|ul|ol|li|table|thead|tbody|tr|th|td|span|div|h4)\b)[^>]{0,20}',s): print('PTAG',pr['id'],m.group(0))
        # stack check
        st=[]
        for m in re.finditer(r'<(/?)(\w+)[^>]*?>',s):
            t=m.group(2)
            if t=='br': continue
            if m.group(1)=='':
                st.append(t)
            else:
                if not st or st[-1]!=t: print('MISMATCH',pr['id'],t,st[-3:]); break
                st.pop()
        if st: print('UNCLOSED',pr['id'],st)
        if re.search(r'&(?!lt;|gt;|amp;|quot;|nbsp;|#)',s): print('AMP',pr['id'])
    print(p.split('/')[-1],'problems',len(d.get('problems',[])))
print('leaves',tot)
