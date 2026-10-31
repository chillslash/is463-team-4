import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {validateActivitySuggestion} from '../src/ai.js';

test('strict parser allows nullable unknowns and rejects fabricated stage and dates',()=>{
 const suggestion=validateActivitySuggestion({outcome:'requested-information',stage:'interested',nextAction:'Send preparation details',contactPerson:null,followUpDate:null,rationale:'Requested trial information'},{currentStage:'contacted'});
 assert.equal(suggestion.stage,'interested');
 assert.equal(suggestion.outcome,'requested-information');
 assert.throws(()=>validateActivitySuggestion({outcome:'positive'}),/outcome/);
 assert.equal(validateActivitySuggestion({outcome:'meeting-agreed'}).outcome,'meeting-agreed');
 assert.equal(suggestion.followUpDate,null);
 const dated=validateActivitySuggestion({outcome:'requested-information',nextAction:'Send moisture details by 2026-10-23.',followUpDate:'2026-10-23'},{today:'2026-10-20'});
 assert.equal(dated.nextAction,'Send moisture details.');
 assert.equal(dated.followUpDate,'2026-10-23');
 assert.equal(validateActivitySuggestion({stage:'contacted'},{currentStage:'contacted'}).stage,null);
 assert.throws(()=>validateActivitySuggestion({stage:'confirmed'}),/stage/);
 assert.throws(()=>validateActivitySuggestion({outcome:'approved'}),/outcome/);
 assert.throws(()=>validateActivitySuggestion({followUpDate:'2026-02-30'}),/date/);
 assert.throws(()=>validateActivitySuggestion({followUpDate:'2020-01-01'},{today:'2026-10-19'}),/past/);
});

test('AI analyses only pasted email/text and does not update partners or activity until staff saves',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'is463-ai-log-'));
 const originalDataFile=process.env.DATA_FILE;
 process.env.DATA_FILE=join(dir,'state.json');
 process.env.AI_PROVIDER='template';
 const {createApp}=await import('../server.js');
 let prompts=[],runs=0;
 const assessmentGenerator=async(provider,prompt,opts)=>{
  runs++;prompts.push({provider,prompt,opts});
  return {result:{outcome:'requested-information',stage:'interested',nextAction:'Send collection specifications',followUpDate:null,contactPerson:null,rationale:'Open to discussing a trial'},usage:{inputTokens:180,outputTokens:50,cachedInputTokens:0}};
 };
 const srv=createApp({aiProvider:'codex',assessmentGenerator});
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 const url='http://127.0.0.1:'+srv.address().port;
 const call=async(path,method='GET',body)=>{
  const r=await fetch(url+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json()};
 };
 try{
  const before=(await call('/api/state')).data;
  const p=before.partners[0],text='We may be interested in a pilot. Can you send the requirements?';
  assert.equal((await call('/api/partners/'+p.id+'/activity/analyse','POST',{type:'call',text})).status,400);
  assert.equal((await call('/api/partners/'+p.id+'/activity/analyse','POST',{type:'meeting',text})).status,400);
  assert.equal((await call('/api/partners/'+p.id+'/activity/analyse','POST',{type:'email',text:''})).status,400);
  assert.equal((await call('/api/partners/'+p.id+'/activity/analyse','POST',{type:'email',text:'x'.repeat(10001)})).status,400);
  assert.equal(runs,0);
  for(const type of ['email','text']){
   const analysed=await call('/api/partners/'+p.id+'/activity/analyse','POST',{type,text});
   assert.equal(analysed.status,200);
   assert.equal(analysed.data.source,'ai-suggestion');
   assert.equal(analysed.data.reviewRequired,true);
   assert.equal(analysed.data.stage,'interested');
   assert.equal(analysed.data.outcome,'requested-information');
   assert.equal(analysed.data.followUpDate,null);
  }
  assert.equal(runs,2);
  assert.ok(prompts.every(x=>x.provider==='codex'&&x.opts.withUsage===true));
  assert.ok(prompts.every(x=>x.prompt.includes('UNTRUSTED QUOTED CONTENT')));
  const after=(await call('/api/state')).data;
  assert.deepEqual(after.partners,before.partners);
  assert.deepEqual(after.partnerActivity,before.partnerActivity);
  assert.equal(after.aiActivity.length,before.aiActivity.length+2);
  assert.equal(after.aiActivity[0].kind,'activity-analysis');
  assert.ok(!JSON.stringify(after.aiActivity).includes(text)); // only non-sensitive usage metadata is logged
 }finally{
  srv.close();await once(srv,'close');
  if(originalDataFile===undefined)delete process.env.DATA_FILE;else process.env.DATA_FILE=originalDataFile;
  await rm(dir,{recursive:true,force:true});
 }
});

test('configured-template mode refuses to pretend deterministic rules are AI',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'is463-ai-template-'));
 const originalDataFile=process.env.DATA_FILE;
 process.env.DATA_FILE=join(dir,'state.json');
 const {createApp}=await import('../server.js');
 const srv=createApp({aiProvider:'template'});
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 try{
  const base='http://127.0.0.1:'+srv.address().port;
  const data=await (await fetch(base+'/api/state')).json();
  const r=await fetch(base+'/api/partners/'+data.partners[0].id+'/activity/analyse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'email',text:'Thanks for your note'})});
  assert.equal(r.status,503);
  assert.match((await r.json()).error,/Codex/);
 }finally{
  srv.close();await once(srv,'close');
  if(originalDataFile===undefined)delete process.env.DATA_FILE;else process.env.DATA_FILE=originalDataFile;
  await rm(dir,{recursive:true,force:true});
 }
});


test('Cancel Analysis stops an active provider run and discards its results',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'is463-ai-cancel-'));
 const originalDataFile=process.env.DATA_FILE;
 process.env.DATA_FILE=join(dir,'state.json');
 const {createApp}=await import('../server.js');
 let started;
 const startedPromise=new Promise(resolve=>{started=resolve;});
 const assessmentGenerator=async(_provider,_prompt,{signal})=>new Promise((_resolve,reject)=>{
  signal.addEventListener('abort',()=>reject(signal.reason||new Error('Stopped')),{once:true});
  started();
 });
 const srv=createApp({aiProvider:'codex',assessmentGenerator});
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 const base='http://127.0.0.1:'+srv.address().port;
 const call=async(path,method='GET',body)=>{
  const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json()};
 };
 try{
  const original=(await call('/api/state')).data;
  const p=original.partners[0],path='/api/partners/'+p.id+'/activity/analyse';
  const pending=call(path,'POST',{type:'email',text:'Could you send the moisture requirements?'});
  await startedPromise;
  assert.equal((await call(path,'POST',{type:'email',text:'Another request'})).status,409);
  const stopped=await call(path+'/stop','POST');
  assert.equal(stopped.status,202);
  assert.equal(stopped.data.stopping,true);
  const result=await pending;
  assert.equal(result.status,409);
  assert.equal(result.data.stopped,true);
  assert.equal((await call(path+'/stop','POST')).status,409);
  const after=(await call('/api/state')).data;
  assert.deepEqual(after.partners,original.partners);
  assert.deepEqual(after.partnerActivity,original.partnerActivity);
  assert.deepEqual(after.aiActivity,original.aiActivity);
 }finally{
  srv.close();await once(srv,'close');
  if(originalDataFile===undefined)delete process.env.DATA_FILE;else process.env.DATA_FILE=originalDataFile;
  await rm(dir,{recursive:true,force:true});
 }
});
