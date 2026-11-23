// Dependency-free smoke tests for the static Security+ study hub.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const source=JSON.parse(fs.readFileSync('data/source-questions.json','utf8'));
const lessonsIndex=JSON.parse(fs.readFileSync('data/lessons.json','utf8'));
assert.equal(lessonsIndex.lessons.length,16,'Expected 16 indexed course lessons');
const script=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
assert(script,'Inline application script is present');
new vm.Script(script[1],{filename:'index.html'});
assert.equal(source.questions.length,80,'Expected 80 slide-referenced questions');
const lessons=new Set();
for(const [i,q] of source.questions.entries()){
  assert(Number.isInteger(q.lesson)&&q.lesson>=1&&q.lesson<=16,'Valid lesson at '+i);
  assert(Number.isInteger(q.slide)&&q.slide>0,'Valid slide at '+i);
  const indexed=lessonsIndex.lessons.find(l=>l.lesson===q.lesson);
  assert(indexed&&indexed.slides.some(sl=>sl.number===q.slide),'Source slide exists for question '+i);
  assert(/^[1-5]$/.test(String(q.domain)),'Valid domain at '+i);
  assert(typeof q.prompt==='string'&&q.prompt.trim().length>=10,'Prompt at '+i);
  assert(Array.isArray(q.options)&&q.options.length===4,'Four options at '+i);
  assert(new Set(q.options).size===4,'Unique options at '+i);
  assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,'Correct answer at '+i);
  assert(typeof q.explanation==='string'&&q.explanation.trim().length>=10,'Explanation at '+i);
  lessons.add(q.lesson);
}
assert.equal(lessons.size,16,'All 16 lessons represented');
const memory=new Map();
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{value:{count:'10',pool:'all',timer:'0',feedback:'end'}[id]||'',innerHTML:'',textContent:'',classList:{toggle(){},remove(){}},addEventListener(){},dataset:{}});return nodes.get(id)}
const document={getElementById:node,querySelectorAll(){return []},createElement(){return {click(){}}}};
const localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const deferred=[];
const fetch=(url)=>new Promise(resolve=>deferred.push({url,resolve}));
const intervals=[];
function createApp(){const ctx=vm.createContext({document,localStorage,fetch,setInterval:fn=>intervals.push(fn),alert:msg=>{throw Error(msg)},Date,Math,JSON,Blob,URL,console});vm.runInContext(script[1],ctx);return vm.runInContext('({startQuiz,startMockExam,answer,nextQuestion,render,finishQuiz,quiz,startTargetedPractice,reviewQuiz,returnToQuiz,normalizedQuestions,getState:()=>({session,state,tab})})',ctx)}
async function flush(){for(let pass=0;pass<8;pass++){while(deferred.length){const {url,resolve}=deferred.shift();resolve({ok:true,json:async()=>url.includes('source-questions')?source:lessonsIndex})}await Promise.resolve();await Promise.resolve();await Promise.resolve()}}
(async()=>{
 let app=createApp();await flush();
 assert.equal(app.normalizedQuestions().length,100,'20 starter plus 80 source questions');
 assert(node('view').innerHTML.includes('command center'),'Dashboard renders');
 app.startQuiz();
 assert.equal(app.getState().session.questions.length,10);
 app.answer(0);
 assert(memory.has('secplus-active-quiz-v1'),'Active quiz saved');
 let resumed=createApp();await flush();
 assert.equal(resumed.getState().session.answers.length,1,'Answer restored');
 for(let i=0;i<10;i++){if(i>0)resumed.answer(0);resumed.nextQuestion()}
 assert.equal(resumed.getState().session.reviewing,true,'Final question opens review');
 resumed.finishQuiz(false);
 assert.equal(resumed.getState().state.history.length,1,'Completed quiz saved');
 assert(!memory.has('secplus-active-quiz-v1'),'Active session cleared');
 const firstDomain=resumed.getState().state.history.at(-1).answers[0].domain;
 resumed.startTargetedPractice(firstDomain,false);
 assert(resumed.getState().session.questions.every(q=>String(q.domain)===String(firstDomain)),'Targeted practice restricts domain');
 resumed.finishQuiz(false);
 node('pool').value='all';node('count').value='3';node('timer').value='60';
 resumed.startQuiz();resumed.answer(0);
 const active=JSON.parse(memory.get('secplus-active-quiz-v1'));active.deadline=Date.now()-1000;memory.set('secplus-active-quiz-v1',JSON.stringify(active));
 let expired=createApp();await flush();expired.render();
 assert.equal(expired.getState().state.history.length,2,'Expired quiz saved');
 assert.equal(expired.getState().state.history.at(-1).timedOut,true,'Timeout marked');
 assert.equal(expired.getState().state.history.at(-1).answers.filter(a=>a.selected==='Not answered').length,2);
 node('timer').value='0';node('pool').value='all';node('count').value='10';
 expired.startMockExam();assert.equal(expired.getState().session.questions.length,90,'Exam simulator selects 90 questions');
 assert.equal(expired.getState().session.mode,'exam','Exam mode recorded');
 const counts=[1,2,3,4,5].map(d=>expired.getState().session.questions.filter(q=>Number(q.domain)===d).length);
 assert.equal(counts.reduce((a,b)=>a+b,0),90,'Exam domains sum to 90');
 assert(counts.every(n=>n>0),'Every domain represented');
 assert(expired.getState().session.deadline>Date.now(),'Mock exam is timed');
 console.log('PASS: syntax, 80 source questions with valid slide references, 16 lessons, loading, quiz, resume, timeout, mock exam');
})().catch(e=>{console.error(e);process.exitCode=1});
