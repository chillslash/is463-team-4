import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
const dir=await mkdtemp(join(tmpdir(),'is463-stop-'));
process.env.DATA_FILE=join(dir,'state.json');
process.env.SOURCE_CACHE_DIR=join(dir,'cache');
process.env.AI_PROVIDER='template';
const {createApp}=await import('../server.js');
const srv=createApp();srv.listen(0,'127.0.0.1');await once(srv,'listening');
const base='http://127.0.0.1:'+srv.address().port,native=globalThis.fetch;
let signalStarted;
const started=new Promise(resolve=>{signalStarted=resolve});
globalThis.fetch=(url,options={})=>{
 if(String(url).startsWith(base))return native(url,options);
 signalStarted();
 return new Promise((resolve,reject)=>{
  if(options.signal?.aborted)return reject(options.signal.reason);
  options.signal?.addEventListener('abort',()=>reject(options.signal.reason||new Error('aborted')),{once:true});
 });
};
const api=async(path,method='GET')=>{const r=await native(base+path,{method});return {status:r.status,body:await r.json()};};
test.after(async()=>{
 globalThis.fetch=native;srv.close();await once(srv,'close');await rm(dir,{recursive:true,force:true});
});
test('Stop Discovery aborts network work and discards the entire uncommitted run',async()=>{
 const before=(await api('/api/state')).body;
 const onDisk=await readFile(process.env.DATA_FILE,'utf8');
 assert.equal((await api('/api/discovery/stop','POST')).status,409);
 const running=api('/api/discover','POST');
 await started;
 assert.equal((await api('/api/discovery-status')).body.active,true);
 const stopped=await api('/api/discovery/stop','POST');
 assert.equal(stopped.status,202);
 assert.equal(stopped.body.stopping,true);
 const done=await running;
 assert.equal(done.status,409);
 assert.equal(done.body.stopped,true);
 const status=(await api('/api/discovery-status')).body;
 assert.equal(status.active,false);
 assert.equal(status.phase,'Stopped');
 assert.deepEqual((await api('/api/state')).body.partners,before.partners);
 assert.equal((await readFile(process.env.DATA_FILE,'utf8')),onDisk);
 assert.equal((await api('/api/discovery/stop','POST')).status,409);
});
