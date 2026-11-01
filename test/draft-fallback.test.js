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
 const {status,result,log}=await run(async()=>({result:{body:'Hello, a specific enquiry regarding spent grounds.'},usage:{inputTokens:80,outputTokens:15,cachedInputTokens:0}}));
 assert.equal(status,200);
 assert.equal(result.subject,'CoffeeBot | Spent Coffee Grounds Reuse Partnership');
 assert.match(result.body,/specific enquiry/);
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