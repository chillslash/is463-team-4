import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
const temp=await mkdtemp(join(tmpdir(),'is463-trace-test-'));
process.env.DATA_FILE=join(temp,'state.json');
process.env.SOURCE_CACHE_DIR=join(temp,'source-cache');
process.env.AI_PROVIDER='template';
const {createApp}=await import('../server.js');
const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
const httpFetch=globalThis.fetch;
const cibId='d_f91a8b057cfb2bebf2e531ad8061e1c1',parkId='d_0542d48f0991541706b58059381a6eca';
const progId='d_db1faeea02c646fa3abccfa5aba99214',dirId='d_688b934f82c1059ed0a6993d2a829089';
let officialCalls=0;
globalThis.fetch=async(url,opts)=>{
 const u=String(url);
 if(u.startsWith(base))return httpFetch(url,opts);
 if(u.includes('lias.org.sg/members-list'))return new Response('<table id="tablepress-1"><tbody><tr><td>Corporate</td><td>Garden Grower Ltd</td><td>20 Sample Road</td></tr></tbody></table>',{status:200});
 if(u.includes('nea.gov.sg/our-services/'))return new Response('<h3>Local food waste recycling facilities</h3><table><tbody><tr><td>A1 Environment Pte Ltd</td><td>Contact</td><td>Used coffee grounds</td></tr></tbody></table>',{status:200});
 if(u.includes('poll-download')){officialCalls++;const id=u.match(/d_[a-f0-9]+/)?.[0];return new Response(JSON.stringify({code:0,data:{url:'https://s3.ap-southeast-1.amazonaws.com/'+id+'.csv'}}),{status:200});}
 if(u.includes('amazonaws.com')){
  officialCalls++;
  const id=u.match(/d_[a-f0-9]+/)?.[0];
  if(id===progId)return new Response('school_name,alp_domain,alp_title,llp_domain1,llp_title\nGreen Learning School,STEM - Sustainability,Urban Nature Learning,Other,na\n',{status:200});
  if(id===dirId)return new Response('school_name,address\nGreen Learning School,20 Education Street\n',{status:200});
  if(id===cibId)return new Response(JSON.stringify({features:[{geometry:{type:'Point',coordinates:[103.872,1.328]},properties:{GARDEN_NAME:'Test Community Garden',GARDENID:999}}]}),{status:200});
  if(id===parkId)return new Response(JSON.stringify({features:[{geometry:{type:'Point',coordinates:[103.86,1.33]},properties:{NAME:'Test Park',OBJECTID:998}}]}),{status:200});
 }
 return new Response('Upstream unavailable',{status:503});
};
test.after(async()=>{globalThis.fetch=httpFetch;server.close();await once(server,'close');await rm(temp,{recursive:true,force:true});});
const api=async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
test('discovery retains source citations and caching when SFA is unavailable',async()=>{
 const first=await api('/api/discover','POST',{});
 assert.equal(first.status,200);assert.equal(first.body.added,5);assert.equal(first.body.assessed,0);
 assert.equal(first.body.sourceFreshness,'fresh');
 assert.equal(first.body.sources.length,5);
 const done=(await api('/api/discovery-status')).body;assert.equal(done.completed,4);assert.equal(done.total,4);assert.equal(done.phase,'Completed');
 assert.equal(first.body.warnings.length,1);
 assert.match(first.body.warnings[0],/^SFA Licensed Crop Farms:/,'Other source results survive an SFA outage');
 let s=(await api('/api/state')).body;
 assert.equal(s.partners.filter(p=>p.source==='Fictional Stitch scenario'&&p.status==='suggested').length,0);
 const school=s.partners.find(p=>p.source==='MOE School Distinctive Programmes');
 assert.ok(school);assert.equal(school.verified,false);assert.equal(school.capacityKg,null);
 assert.equal(school.evidenceEntries.length,2);assert.ok(school.evidenceEntries.every(x=>x.url.startsWith('https://data.gov.sg/')));
 const when=school.sourcedAt;assert.ok(when);
 assert.equal(s.discoveryRuns.length,1);assert.equal(s.discoveryRuns[0].aiCalls,0);
 const calls=officialCalls;
 const second=await api('/api/discover','POST',{});
 assert.equal(second.status,200);assert.equal(second.body.added,0);
 assert.equal(second.body.sourceFreshness,'cached');assert.equal(second.body.existingRefreshed,5);
 assert.equal(officialCalls,calls);assert.ok(second.body.sources.every(x=>x.cached));
 s=(await api('/api/state')).body;
 assert.equal(s.partners.find(p=>p.id===school.id).sourcedAt,when);
 assert.equal(s.discoveryRuns.length,2);assert.equal(s.discoveryRuns[0].newLeads,0);
});
test('AI provider cannot be changed through frontend settings API',async()=>{
 const r=await api('/api/settings','PATCH',{aiProvider:'claude'});
 assert.equal(r.status,400);
});

test('AI evidence budget is configurable and capped at 24 prospects per discovery run',async()=>{
 assert.equal((await api('/api/settings','PATCH',{automaticAIAssessments:12})).status,200);
 assert.equal((await api('/api/state')).body.settings.automaticAIAssessments,12);
 assert.equal((await api('/api/settings','PATCH',{automaticAIAssessments:25})).status,400);
});

test('reset suggestions preserves existing pipeline entries and removes discovery history',async()=>{
 const before=(await api('/api/state')).body;
 const preserved=before.partners.filter(p=>p.status!=='suggested');
 const reset=await api('/api/reset-suggestions','POST',{});
 assert.equal(reset.status,200);
 assert.equal(reset.body.removed,5);
 const after=(await api('/api/state')).body;
 assert.equal(after.partners.length,preserved.length);
 assert.equal(after.discoveryRuns.length,0);
 assert.deepEqual(after.partners.map(p=>p.id),preserved.map(p=>p.id));
});
