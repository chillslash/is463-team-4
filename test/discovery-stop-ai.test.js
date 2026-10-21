import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
const dir=await mkdtemp(join(tmpdir(),'is463-stop-ai-'));
process.env.DATA_FILE=join(dir,'state.json');
process.env.SOURCE_CACHE_DIR=join(dir,'sources');
process.env.AI_PROVIDER='codex';
const {createApp}=await import('../server.js');
let entering;
const inAI=new Promise(resolve=>entering=resolve);
const assessmentGenerator=async(_,__,{signal})=>{
 entering();
 return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
};
const srv=createApp({aiProvider:'codex',assessmentGenerator});srv.listen(0,'127.0.0.1');await once(srv,'listening');
const base='http://127.0.0.1:'+srv.address().port,native=globalThis.fetch;
const cib='d_f91a8b057cfb2bebf2e531ad8061e1c1',parks='d_0542d48f0991541706b58059381a6eca';
globalThis.fetch=async(url,opts)=>{
 const u=String(url);
 if(u.startsWith(base))return native(url,opts);
 if(u.includes('poll-download'))return new Response(JSON.stringify({code:0,data:{url:'https://s3.ap-southeast-1.amazonaws.com/'+u.match(/d_[a-f0-9]+/)?.[0]+'.json'}}),{status:200});
 if(u.includes('amazonaws.com')){
  const id=u.match(/d_[a-f0-9]+/)?.[0];
  if(id===cib)return new Response(JSON.stringify({features:[{geometry:{type:'Point',coordinates:[103.84,1.32]},properties:{GARDEN_NAME:'Sample Community Garden',GARDENID:7}}]}));
  if(id===parks)return new Response(JSON.stringify({features:[{geometry:{type:'Point',coordinates:[103.86,1.35]},properties:{NAME:'Sample Park',OBJECTID:12}}]}));
  return new Response('school_name,alp_domain,alp_title,llp_domain1,llp_title\n',{status:200});
 }
 return new Response('',{status:503});
};
const api=async(path,method='GET')=>{const r=await native(base+path,{method});return {status:r.status,body:await r.json()};};
test.after(async()=>{globalThis.fetch=native;srv.close();await once(srv,'close');await rm(dir,{recursive:true,force:true})});
test('Stop during AI assessment discards source leads, assessments, and audit records',async()=>{
 const before=(await api('/api/state')).body;
 const disk=await readFile(process.env.DATA_FILE,'utf8');
 const ongoing=api('/api/discover','POST');
 await inAI;
 assert.equal((await api('/api/discovery-status')).body.phase,'Assessing and Ranking Partners');
 assert.equal((await api('/api/discovery/stop','POST')).status,202);
 const interrupted=await ongoing;
 assert.equal(interrupted.status,409);
 assert.equal(interrupted.body.stopped,true);
 const after=(await api('/api/state')).body;
 assert.deepEqual(after.partners,before.partners);
 assert.deepEqual(after.discoveryRuns,before.discoveryRuns);
 assert.deepEqual(after.aiActivity,before.aiActivity);
 assert.equal((await readFile(process.env.DATA_FILE,'utf8')),disk);
});
