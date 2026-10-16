import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
const tmp=await mkdtemp(join(tmpdir(),'coffee-copilot-test-'));
process.env.DATA_FILE=join(tmp,'state.json');
process.env.AI_PROVIDER='template';
const {createApp}=await import('../server.js');
const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
const call=async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
test.after(async()=>{server.close();await once(server,'close');await rm(tmp,{recursive:true,force:true});});
test('health and each HTML page loads',async()=>{
 const {data}=await call('/api/health');assert.equal(data.ok,true);
 for(const p of ['/dashboard','/this-week','/find-partners','/outreach','/pipeline','/log-handover']){const r=await fetch(base+p);assert.equal(r.status,200);assert.match(await r.text(),/\/app.js/);}
});
test('settings, partner updates, handovers persist and reflect actual vs confirmed outcomes',async()=>{
 let state=(await call('/api/state')).data;assert.equal(state.metrics.gapKg,42);
 let r=await call('/api/settings','PATCH',{cupsPerWeek:10000});assert.equal(r.status,200);
 state=(await call('/api/state')).data;assert.equal(state.metrics.gapKg,60);
 r=await call('/api/partners','POST',{name:'Example Park Lead',category:'park',fee:'unknown'});assert.equal(r.status,201);const id=r.data.id;
 r=await call('/api/partners/'+id,'PATCH',{status:'regular',capacityKg:20,confirmed:true,verified:false});assert.equal(r.status,400);
 r=await call('/api/partners/'+id,'PATCH',{status:'regular',capacityKg:20,confirmed:true,verified:true});assert.equal(r.status,200);
 state=(await call('/api/state')).data;assert.equal(state.metrics.gapKg,40);
 r=await call('/api/handovers','POST',{partnerId:id,kg:8,date:'2026-10-16',confirmation:'partner-confirmed',intendedUse:'Trial composting'});assert.equal(r.status,201);
 state=(await call('/api/state')).data;assert.equal(state.metrics.transferredKg,8);assert.equal(state.metrics.evidencedKg,0);
 r=await call('/api/handovers','POST',{partnerId:id,kg:5,date:'2026-10-16',confirmation:'reuse-confirmed',intendedUse:'Compost verified'});assert.equal(r.status,201);
 r=await call('/api/settings','PATCH',{reportingCollectedKg:100});assert.equal(r.status,200);
 state=(await call('/api/state')).data;assert.equal(state.metrics.evidencedKg,5);assert.equal(state.metrics.reuseRate,5);
 assert.equal(JSON.parse(await readFile(process.env.DATA_FILE,'utf8')).handovers.length,2);
});
test('draft fallback and explicit reset',async()=>{
 const id=(await call('/api/state')).data.partners[0].id;
 let r=await call('/api/draft','POST',{partnerId:id});assert.equal(r.status,200);assert.match(r.data.mode,/Template fallback/);
 r=await call('/api/reset-demo','POST');assert.equal(r.status,200);assert.equal((await call('/api/state')).data.metrics.forecastKg,182);
});
