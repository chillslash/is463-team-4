import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';

const temp=await mkdtemp(join(tmpdir(),'coffee-draft-fallback-'));
process.env.DATA_FILE=join(temp,'state.json');
process.env.AI_PROVIDER='template';
const {createApp}=await import('../server.js');
const run=async(draftGenerator,route='/api/draft')=>{
 const app=createApp({aiProvider:'codex',draftGenerator});
 app.listen(0,'127.0.0.1');await once(app,'listening');
 try{
  const origin='http://127.0.0.1:'+app.address().port;
  const state=await(await fetch(origin+'/api/state')).json();
  const partner=state.partners.find(p=>route.includes('follow-up')?p.status==='contacted':p.status!=='closed');
  assert.ok(partner,'Test partner exists');
  const response=await fetch(origin+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({partnerId:partner.id})});
  const result=await response.json();
  const after=await(await fetch(origin+'/api/state')).json();
  return {status:response.status,result,log:after.aiActivity[0]};
 }finally{app.close();await once(app,'close');}
};
test.after(async()=>{await rm(temp,{recursive:true,force:true});});
test('Codex email body without subject is valid when system owns subject',async()=>{
 const {status,result,log}=await run(async(_provider,prompt)=>{
  const facts=JSON.parse(prompt.split('Facts: ').at(-1));
  const body=facts.salutation+'\n\nI am reaching out from CoffeeBot about spent coffee grounds.\n\n'+facts.reuseParagraph+'\n\nWe collect and sun-dry the grounds at HQ, although moisture content is unmeasured. Would you be open to a short discussion about a trial and any material requirements?\n\nBest regards,\nCoffeeBot Partnerships';
  return {result:{body},usage:{inputTokens:80,outputTokens:90,cachedInputTokens:0}};
 });
 assert.equal(status,200);
 assert.equal(result.subject,'CoffeeBot | Spent Coffee Grounds Reuse Partnership');
 assert.match(result.body,/compost|growing.media/i);
 assert.notEqual(result.aiFailed,true);
 assert.equal(log.success,true);
});
test('malformed or empty Codex body produces labelled template, no HTTP 500',async()=>{
 const {status,result,log}=await run(async()=>({result:{subject:'Ignored',body:''}}));
 assert.equal(status,200);
 assert.equal(result.aiFailed,true);
 assert.match(result.mode,/Template fallback/i);
 assert.match(result.body,/CoffeeBot/);
 assert.equal(log.success,false);
 assert.match(log.error,/body was missing/i);
});
test('Codex exception produces usable template and failure audit',async()=>{
 const {status,result,log}=await run(async()=>{throw new Error('Artificial provider timeout')});
 assert.equal(status,200);
 assert.equal(result.aiFailed,true);
 assert.match(result.body,/coffee grounds/i);
 assert.equal(log.success,false);
 assert.match(log.error,/Artificial provider timeout/);
});
test('follow-up also accepts absent subject, retains fixed subject',async()=>{
 const {status,result,log}=await run(async()=>({result:{body:'Thank you for speaking with us.'}}),'/api/draft/follow-up');
 assert.equal(status,200);
 assert.equal(result.subject,'CoffeeBot | Spent Coffee Grounds Reuse Follow-Up');
 assert.match(result.body,/Thank you for speaking with us/);
 assert.equal(log.success,true);
});
test('follow-up AI failure falls back to reviewed template',async()=>{
 const {status,result,log}=await run(async()=>{throw new Error('Artificial rate limit')},'/api/draft/follow-up');
 assert.equal(status,200);
 assert.equal(result.aiFailed,true);
 assert.match(result.mode,/Template follow-up/i);
 assert.match(result.body,/CoffeeBot/);
 assert.equal(log.success,false);
});
test('AI email lacking specific partner reuse connection falls back rather than sending generic text',async()=>{
 const {status,result,log}=await run(async()=>({result:{body:'Dear Team,\\n\\nWe are CoffeeBot. We would love to collaborate on coffee grounds. Please contact us about this opportunity.\\n\\nBest regards,\\nCoffeeBot'}}));
 assert.equal(status,200);
 assert.equal(result.aiFailed,true);
 assert.match(result.mode,/Template fallback/);
 assert.match(result.body,/compost|growing.media/i);
 assert.equal(log.success,false);
});
