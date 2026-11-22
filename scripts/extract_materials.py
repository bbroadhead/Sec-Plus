#!/usr/bin/env python3
"""Build concise, source-linked lesson notes from user-supplied Security+ decks.
Only excerpts from the slides are emitted. The textbook is not duplicated.
"""
import json,re
from pathlib import Path
from pptx import Presentation
import fitz

root=Path(__file__).resolve().parents[1]
out=[]
for path in sorted((root/'materials').glob('sy0-701_Lesson *.pptx')):
    prs=Presentation(path)
    slides=[]
    for number,slide in enumerate(prs.slides,1):
        lines=[]
        for shape in slide.shapes:
            if not shape.has_text_frame: continue
            for para in shape.text_frame.paragraphs:
                text=' '.join(para.text.split())
                if text and text not in lines and len(text)>2: lines.append(text)
        if not lines: continue
        title=lines[0][:140]
        # Brief preview only; learners open the original slides for complete material.
        excerpt=' • '.join(lines[1:])[:420]
        slides.append({'number':number,'title':title,'preview':excerpt})
    out.append({'lesson':int(re.search(r'Lesson (\d+)',path.name).group(1)),
                'title':next((s['title'] for s in slides if len(s['title'])>10),path.stem),
                'path':'materials/'+path.name,
                'slideCount':len(prs.slides),
                'slides':slides})
# Index the textbook's table of contents without republishing its pages.
pdf=root/'materials'/'CompTIA Security+ SY0-701 Student.pdf'
chapters=[]
if pdf.exists():
    doc=fitz.open(pdf)
    for level,title,page in doc.get_toc():
        title=' '.join(title.split())
        if title and level<=2:
            chapters.append({'level':level,'title':title[:180],'page':page})
    doc.close()
target=root/'data'/'lessons.json'
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps({'lessons':out,'textbook':{'title':'CompTIA Security+ SY0-701 Student',
    'path':'materials/CompTIA Security+ SY0-701 Student.pdf',
    'note':'Consult the original textbook for complete explanations; its text is not republished.', 'chapters':chapters}},
    ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Indexed',len(out),'lessons and',sum(len(x['slides']) for x in out),'slides')
