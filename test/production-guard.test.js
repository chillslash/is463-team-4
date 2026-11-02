import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
const dir=await mkdtemp(join(tmpdir(),'coffee-production-'));
process.env.DATA_FILE=join(dir,'state.json');
process.env.SOURCE_CACHE_DIR=join(dir,'cache');
process.env.NODE_ENV='production';
process.env.AI_PROVIDER='template';
process.env.AUTO_AI_REVIEW='false';
process.env.MAX_DISCOVERIES_PER_DAY='1';
process.env.MAX_AI_ACTIONS_PER_DAY='1';
const {createApp}=await import('../server.js');
const app=createApp({aiProvider:'template',discoveryProvider:async()=>({candidates:[],sources:[],warnings:[]})});
app.listen(0,'127.0.0.1');await once(app,'listening');
const root='http://127.0.0.1:'+app.address().port;
async function call(path,method='GET',data){
 const res=await fetch(root+path,{method,headers:data?{'content-type':'application/json'}:undefined,
  body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(10000)});
 return {status:res.status,data:await res.json()};
}
test.after(async()=>{app.close();await once(app,'close');await rm(dir,{recursive:true,force:true});});
test('clean production state has no fictional partners or previous AI history',async()=>{
 const a=await call('/api/state');assert.equal(a.status,200);
 for(const key of ['partners','handovers','discoveryRuns','aiActivity','outreach'])assert.equal(a.data[key].length,0,key);
 assert.equal(a.data.demo,false);
});
test('production reset routes are disabled',async()=>{
 assert.equal((await call('/api/reset-demo','POST')).status,403);
 assert.equal((await call('/api/reset-suggestions','POST')).status,403);
});
test('production AI route budget prevents unbounded paid requests',async()=>{
 const first=await call('/api/draft','POST',{partnerId:'missing'});
 assert.notEqual(first.status,429);
 const second=await call('/api/draft','POST',{partnerId:'missing'});
 assert.equal(second.status,429);
});
test('production discovery daily limit prevents repeat batches',async()=>{
 const first=await call('/api/discover','POST');
 assert.equal(first.status,200);
 const second=await call('/api/discover','POST');
 assert.equal(second.status,429);
});
