#!/usr/bin/env node
// Evidence audit: checks exact indexed slide links and records what still needs review.
// Lexical overlap is a triage signal, NOT proof of factual correctness.
const fs=require('node:fs');
const path=require('node:path');
const questions=JSON.parse(fs.readFileSync('data/source-questions.json','utf8')).questions;
const lessons=JSON.parse(fs.readFileSync('data/lessons.json','utf8')).lessons;
const stop=new Set('a an and are as at be by can for from has have in into is it its of on or that the their these this to use using was were what when which who with would after before best most should slide describes identifies defines explains lists'.split(' '));
const words=s=>new Set((s.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g)||[]).filter(w=>!stop.has(w)));
const records=questions.map((q,i)=>{
 const lesson=lessons.find(l=>l.lesson===q.lesson);
 const slide=lesson?.slides.find(s=>s.number===q.slide);
 const evidence=slide?slide.title+' '+slide.preview:'';
 const claim=words(q.prompt+' '+q.options[q.answer]+' '+q.explanation);
 const source=words(evidence);
 const shared=[...claim].filter(w=>source.has(w));
 const overlap=claim.size?shared.length/claim.size:0;
 const issues=[];
 if(!slide)issues.push('missing-slide-reference');
 if(!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)issues.push('invalid-answer-index');
 if(slide&&shared.length<2)issues.push('low-lexical-evidence-overlap');
 return {id:'SRC-'+String(i+1).padStart(3,'0'),lesson:q.lesson,slide:q.slide,domain:q.domain,prompt:q.prompt,answer:q.options[q.answer],sourceTitle:slide?.title||null,sourcePreview:slide?.preview||null,sharedTerms:shared,overlap:Number(overlap.toFixed(3)),issues,status:issues.length?'needs-manual-review':'reference-checked-not-fact-verified'};
});
const flagged=records.filter(r=>r.issues.length);
const result={generatedFrom:'data/source-questions.json and data/lessons.json',method:'Exact slide references, answer bounds and lexical overlap; not a semantic accuracy certification',counts:{sourceQuestions:records.length,referenceLinked:records.filter(r=>r.sourceTitle).length,flagged:flagged.length,starterQuestionsRequiringSourceMapping:20,performanceBasedScenariosRequiringSourceMapping:3},records};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/question-source-audit.json',JSON.stringify(result,null,2)+'\n');
let md='# Security+ question source audit\n\n';
md+='This is an **automated reference and evidence triage**, not a completed human fact-check. Matching terms do not prove the answer or explanation is supported.\n\n';
md+='- Source questions: '+records.length+'\n- Valid slide links: '+result.counts.referenceLinked+'\n- Flagged for closer review: '+flagged.length+'\n- Original starter questions not individually mapped: 20\n- Performance-based scenarios not individually mapped: 3\n\n';
md+='## Questions needing closer review\n\n';
md+='| ID | Lesson / slide | Reason | Prompt |\n|---|---|---|---|\n';
for(const r of flagged)md+='| '+r.id+' | '+r.lesson+' / '+r.slide+' | '+r.issues.join(', ')+' | '+r.prompt.replace(/\|/g,'/')+' |\n';
md+='\nFull per-question evidence and source previews are in [question-source-audit.json](question-source-audit.json).\n';
fs.writeFileSync('reports/question-source-audit.md',md);
console.log(JSON.stringify(result.counts));
if(records.some(r=>r.issues.includes('missing-slide-reference')||r.issues.includes('invalid-answer-index')))process.exitCode=1;
