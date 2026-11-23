// Chromium end-to-end checks for the published static app.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
   await page.getByRole('heading',{name:/security\+ command center/i}).waitFor();
   await page.getByRole('button',{name:'Practice Quiz',exact:true}).click();
   await page.getByText('Question bank: 68 questions').waitFor();
   await page.locator('#count').fill('2');
   await page.getByRole('button',{name:'Start quiz',exact:true}).click();
   await page.getByText('Question 1 of 2').waitFor();
   await page.locator('button.option').first().click();
   await page.getByRole('button',{name:'Next question'}).click();
   await page.reload({waitUntil:'networkidle'});
   await page.getByText('Question 2 of 2').waitFor();
   await page.locator('button.option').first().click();
   await page.getByRole('button',{name:'Finish quiz'}).click();
   await page.getByRole('heading',{name:'Quiz complete'}).waitFor();
   assert.equal(errors.length,0,'No uncaught page errors: '+errors.join('; '));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
   assert(!overflow,'No horizontal overflow at '+viewport.width+'px');
   await page.close();
   console.log('PASS Chromium viewport '+viewport.width+'x'+viewport.height+': load, question bank, quiz, reload, results, layout');
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
