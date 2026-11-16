import json
LB = ['ア', 'イ', 'ウ', 'エ']


def ox(pid, n, text, answer, concl, basis):
    return {"id": "%s-z%d" % (pid, n), "type": "ox", "text": text, "answer": answer,
            "explain": {"conclusion": concl, "basis": basis}}


def page(pid, title, html, quiz):
    return {"id": pid, "title": title, "html": html, "quiz": quiz}


def lesson(cno, no, title, topics, pages):
    return {"id": "c%02d-l%02d" % (cno, no), "no": no, "title": title, "topics": topics, "pages": pages}


def mc(qid, ch, field, stem, choices, ans, concl, basis, wrongs, tip=None):
    labels = [l for i, l in enumerate(LB) if i + 1 != ans]
    assert len(wrongs) == 3
    q = {"id": qid, "type": "mc4", "stem": stem, "choices": choices, "answer": ans,
         "explain": {"conclusion": "正解は%s。%s" % (LB[ans - 1], concl), "basis": basis,
                     "wrong": ["%s: %s" % (labels[i], wrongs[i]) for i in range(3)]},
         "chapter": ch, "field": field}
    if tip:
        q["tip"] = tip
    return q


def ref(qid, r):
    return {"id": qid, "ref": r}


def write(path, obj):
    with open(path, 'w', encoding='utf8') as f:
        f.write(json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('://', '&#58;//'))
