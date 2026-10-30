import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {mkdtemp,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

// Non-destructive visual regression: the app runs on an isolated copy of state.
const temp=await mkdtemp(join(tmpdir(),'coffeebot-assessment-ui-'));
const port=4187;
let server=null,browser=null;
try{
 await copyFile('data/state.json',join(temp,'state.json'));
 server=spawn(process.execPath,['server.js'],{
  cwd:process.cwd(),env:{...process.env,PORT:String(port),DATA_FILE:join(temp,'state.json'),AUTO_AI_REVIEW:'false'},
  stdio:'ignore',windowsHide:true,
 });
 const url='http://127.0.0.1:'+port;
 let ready=false;
 for(let i=0;i<25;i++){
  try{if((await fetch(url+'/api/health',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 assert.ok(ready,'Isolated test server did not start');
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 for(const width of [1100,390]){
  const page=await browser.newPage({viewport:{width,height:780}});
  await page.goto(url+'/find-partners',{waitUntil:'domcontentloaded'});
  await page.locator('[data-action="assessment-settings"]').click();
  await page.locator('#assessment-budget').waitFor();
  const view=await page.evaluate(()=>{
   const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
   const modal=document.querySelector('.co-dialog-assessment'),label=document.querySelector('label[for="assessment-budget"]');
   return {modal:rect(modal),budget:rect(document.querySelector('#assessment-budget')),
    button:rect(document.querySelector('#reset-assessment-settings')),
    label:rect(label),labelSize:getComputedStyle(label).fontSize,
    horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
    dialogOverflow:modal.scrollWidth-modal.clientWidth};
  });
  assert.equal(view.labelSize,'12px','Budget label typography must match other dialog labels');
  assert.equal(Math.round(view.budget.height),42);
  assert.ok(view.button.y>=view.label.bottom,'Reset must not cover the budget label');
  assert.ok(view.button.x>=view.budget.right+8||view.button.y>=view.budget.bottom+8,
   'Reset button must not overlap budget input');
  assert.ok(view.horizontalOverflow<=0&&view.dialogOverflow<=0,'No horizontal overflow');
  await page.locator('#assessment-budget').fill('7');
  await page.locator('#reset-assessment-settings').click();
  assert.equal(await page.locator('#assessment-budget').inputValue(),'24','Reset restores AI assessment budget');
  await page.screenshot({path:'data/assessment-settings-'+width+'.png'});
  console.log(JSON.stringify({width,...view,reset:'ok'}));
  await page.close();
 }
 console.log('Assessment Settings browser visual audit passed');
} finally {
 await browser?.close();
 if(server&&!server.killed){server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,1200))]);}
 await rm(temp,{recursive:true,force:true});
}
