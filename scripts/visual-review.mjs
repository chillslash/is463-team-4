import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
let server,browser;const u='http://127.0.0.1:4173';
async function alive(){try{return (await fetch(u+'/api/health')).ok}catch{return false}}
try{
 if(!await alive()){server=spawn(process.execPath,['server.js'],{cwd:process.cwd(),stdio:'ignore'});for(let i=0;i<25&&!await alive();i++)await new Promise(r=>setTimeout(r,300));}
 if(!await alive())throw Error('Start CoffeeBot first');
 await mkdir('data/visual-review',{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:1280,height:760}});
 const state=await(await fetch(u+'/api/state')).json();
 const p=state.partners.find(x=>x.name==='Bee Joo Industries Pte Ltd');
 if(!p)throw Error('Bee Joo missing');
 const target='/partner?partner='+encodeURIComponent(p.id);
 async function go(path){await page.goto(u+path,{waitUntil:'domcontentloaded'});await page.locator('.co-title').waitFor();}
 async function shot(n){await page.waitForTimeout(650);
 const m=await page.evaluate(()=>{
  const labels=[...document.querySelectorAll('.co-field>label')].filter(x=>x.getClientRects().length).map(x=>getComputedStyle(x).fontSize);
  const first=document.querySelector('.co-discovery-card,.co-manage-row');
  const nav=[...document.querySelectorAll('nav[aria-label="Main navigation"] a')].map(x=>({name:x.textContent.trim(),width:Math.round(x.getBoundingClientRect().width),scroll:x.scrollWidth,client:x.clientWidth,font:getComputedStyle(x).fontSize}));
  const computed=(selector)=>[...document.querySelectorAll(selector)].filter(x=>x.getClientRects().length).map(x=>{const c=getComputedStyle(x);return [c.fontSize,c.fontWeight,c.color,c.lineHeight].join('|')});
  const descriptions=computed('.co-journal-static-message');
  const previews=computed('.co-journal-preview');
  const selectedPartner=computed('.co-field-heading label');
  const otherFields=computed('.co-outreach-fields .co-field>label');
  return {overflow:document.documentElement.scrollWidth-innerWidth,labels:[...new Set(labels)],firstCardY:Math.round(first?.getBoundingClientRect().top??-1),nav,historyStyles:[...new Set([...descriptions,...previews])],outreachLabels:[...new Set([...selectedPartner,...otherFields])]};

 });console.log(n+' audit '+JSON.stringify(m));
 if(m.overflow>0||m.labels.some(x=>x!=='12px')||m.nav.some(x=>x.scroll>x.client)||m.historyStyles.length>1||m.outreachLabels.length>1||m.outreachLabels.some(x=>!x.startsWith('12px|')))throw Error('Visual audit failed: '+n+' '+JSON.stringify(m));
 await page.screenshot({path:'data/visual-review/'+n+'.jpg',type:'jpeg',quality:43});console.log(n);}
 await go('/dashboard');
 if(await page.locator('.co-overview-stat').count()!==4||await page.locator('.co-overview-panel').count()!==4)throw Error('Dashboard must have four metrics and four sections');
 if(!(await page.locator('.co-overview').innerText()).includes('Forecast Demand'))throw Error('Forecast Demand missing from dashboard');
 if(!(await page.locator('.co-overview').innerText()).includes('Handed Over This Week'))throw Error('Actual handovers missing from dashboard');
 await shot('dashboard');
 await go('/find-partners');await shot('discover');
 if(await page.locator('.co-discovery-card').count()){await page.locator('.co-discovery-card').first().click({position:{x:80,y:80}}).catch(()=>{});await shot('discover-details');}
 await go('/outreach');await shot('initial-outreach');
 await go('/manage-partners');await shot('manage');
 if(await page.locator('[data-action="new"]').count()){await page.locator('[data-action="new"]').click();await shot('add-partner');}

 await go(target);await shot('partner');
 let menu=page.locator('.co-activity-menu').first();
 if(await menu.count()){await menu.scrollIntoViewIfNeeded();await menu.locator('summary').click();await shot('menu');await menu.locator('[data-action="manage-activity-edit"]').click();await page.locator('#dialog-form').waitFor();await shot('history-edit');await menu.screenshot({path:'data/visual-review/menu-detail.jpg',type:'jpeg',quality:85});}
 await go(target);await page.locator('[data-action="manage-log-open"]').click();await shot('log');
 await go(target);await page.locator('[data-action="manage-handover-open"]').click();await page.locator('.co-handover-exceptions summary').waitFor();
 const unknown=(p.transportArrangement||'unknown')==='unknown'&&(p.groundsAccepted||'unknown')==='unknown';
 if(unknown&&await page.locator('.co-arrangement-summary').count())throw Error('Undiscussed partner arrangement is shown as an empty summary');
 const note=await page.locator('#ho-notes').boundingBox(),exceptions=await page.locator('.co-handover-exceptions').boundingBox();
 if(!note||!exceptions||note.y<=exceptions.y)throw Error('Notes should follow arrangement exceptions');
 await shot('handover');await page.locator('.co-handover-exceptions summary').click();await shot('handover-exceptions');
 await go(target);await page.locator('#manage-tab-button-edit').click();
 await page.locator('.co-source-evidence summary').click();await page.locator('.co-source-evidence').scrollIntoViewIfNeeded();await shot('source-evidence');
 await go('/outreach?partner='+encodeURIComponent(p.id)+'&mode=followup');
 if(!await page.locator('.co-followup-context').count())throw Error('Follow-up context is missing');
 await shot('followup');
 const nav=await page.locator('nav[aria-label="Main navigation"] [aria-current="page"]').getAttribute('data-path');
 if(nav!=='manage-partners')throw Error('Wrong sidebar: '+nav);
 await page.setViewportSize({width:390,height:844});
 await go('/find-partners');await shot('mobile-discover');
 await go('/manage-partners');await shot('mobile-manage');
 await go(target);await shot('mobile-partner');
 await page.locator('[data-action="manage-log-open"]').click();await shot('mobile-log');
 await go(target);await page.locator('[data-action="manage-handover-open"]').click();await page.locator('.co-handover-exceptions summary').waitFor();await shot('mobile-handover');await page.locator('.co-handover-exceptions summary').click();await shot('mobile-handover-exceptions');
 await go('/outreach?partner='+encodeURIComponent(p.id)+'&mode=followup');await shot('mobile-followup');
 await page.setViewportSize({width:360,height:780});await go('/manage-partners');await shot('narrow-manage');
 console.log('Visual review OK');
}finally{await browser?.close();server?.kill();}
