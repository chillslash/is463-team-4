import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';

const dir=await mkdtemp(join(tmpdir(),'coffee-contact-route-'));
process.env.DATA_FILE=join(dir,'state.json');
process.env.AI_PROVIDER='template';
const {createApp}=await import('../server.js');
const called=[];
const researcher=async ({websiteUrl})=>{
 called.push(websiteUrl);
 if(websiteUrl.includes('/email'))return {
  email:'office@grow.org',sourceUrl:'https://grow.org/contact',contactPageUrl:'https://grow.org/contact',
  checkedAt:'2026-10-22T10:00:00.000Z',tried:2
 };
 if(websiteUrl.includes('/unreachable'))return {email:'',sourceUrl:'',contactPageUrl:'',checkedAt:'2026-10-22T11:00:00.000Z',tried:1,pagesRead:0};
 if(websiteUrl.includes('/contact-page'))return {
  email:'',sourceUrl:'',contactPageUrl:'https://grow.org/contact',
  checkedAt:'2026-10-22T10:30:00.000Z',tried:2
 };
 return {email:'',sourceUrl:'',contactPageUrl:'',checkedAt:'2026-10-22T11:00:00.000Z',tried:1};
};
const server=createApp({contactResearcher:researcher});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
async function call(path,method='GET',body){
 const resp=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:resp.status,data:await resp.json()};
}
test.after(async()=>{server.close();await once(server,'close');await rm(dir,{force:true,recursive:true});});

test('targeted contact research records a page and later a cited email, leaving stage unchanged',async()=>{
 const created=await call('/api/partners','POST',{name:'Contact Research Garden',category:'community garden',status:'suggested'});
 assert.equal(created.status,201);
 const id=created.data.id;
 const first=await call('/api/partners/'+id+'/research-contact','POST',{websiteUrl:'https://grow.org/contact-page'});
 assert.equal(first.status,200,JSON.stringify(first.data));
 assert.equal(first.data.result,'contact-page');
 const pageState=(await call('/api/state')).data.partners.find(p=>p.id===id);
 assert.equal(pageState.status,'suggested');
 assert.ok(!pageState.contactEmail);
 assert.equal(pageState.contactPageUrl,'https://grow.org/contact');
 assert.equal(pageState.contactPageEvidence.source,'Organisation Website');
 assert.equal(pageState.websiteOrigin,'staff-entered');
 assert.equal(pageState.contactSearch.pagesChecked,2);
 const second=await call('/api/partners/'+id+'/research-contact','POST',{websiteUrl:'https://grow.org/email'});
 assert.equal(second.status,200);
 assert.equal(second.data.result,'email-found');
 const p=(await call('/api/state')).data.partners.find(p=>p.id===id);
 assert.equal(p.contactEmail,'office@grow.org');
 assert.equal(p.contactEvidence.url,'https://grow.org/contact');
 assert.equal(p.status,'suggested');
 assert.equal(p.capacityKg,null);
 assert.equal(p.verified,false);
 assert.equal(p.confirmed,false);
 assert.deepEqual(called,['https://grow.org/contact-page','https://grow.org/email']);
});

test('invalid, internal and non-HTTPS site URLs are refused before contact research',async()=>{
 const before=called.length;
 const id=(await call('/api/state')).data.partners.find(p=>p.name==='Contact Research Garden').id;
 for(const websiteUrl of ['http://grow.org','https://127.0.0.1/','https://localhost/','file:///etc/hosts','https://grow.org:8443/']){
  const res=await call('/api/partners/'+id+'/research-contact','POST',{websiteUrl});
  assert.equal(res.status,400,websiteUrl);
 }
 assert.equal(called.length,before);
});

test('manual contact information is never overwritten by scraped email',async()=>{
 const id=(await call('/api/state')).data.partners.find(p=>p.name==='Contact Research Garden').id;
 const manual=await call('/api/partners/'+id,'PATCH',{contactEmail:'decisionmaker@partner.org'});
 assert.equal(manual.status,200);
 const res=await call('/api/partners/'+id+'/research-contact','POST',{websiteUrl:'https://grow.org/email'});
 assert.equal(res.status,200);
 const record=(await call('/api/state')).data.partners.find(p=>p.id===id);
 assert.equal(record.contactEmail,'decisionmaker@partner.org');
 assert.equal(record.contactEvidence.source,'Staff entered');
});

test('on-demand research is restricted to Suggested prospects',async()=>{
 const id=(await call('/api/state')).data.partners.find(p=>p.name==='Contact Research Garden').id;
 const moved=await call('/api/partners/'+id,'PATCH',{status:'contacted'});
 assert.equal(moved.status,200);
 const result=await call('/api/partners/'+id+'/research-contact','POST',{websiteUrl:'https://grow.org/email'});
 assert.equal(result.status,400);
});



test('website could not be checked is distinct from a successful check with no published contact',async()=>{
 const lead=await call('/api/partners','POST',{name:'Temporarily Unreachable Grower',category:'crop farm',status:'suggested'});
 assert.equal(lead.status,201);
 const result=await call('/api/partners/'+lead.data.id+'/research-contact','POST',{websiteUrl:'https://grow.org/unreachable'});
 assert.equal(result.status,200);
 assert.equal(result.data.result,'unavailable');
 const p=(await call('/api/state')).data.partners.find(p=>p.id===lead.data.id);
 assert.equal(p.contactSearch.result,'unavailable');
 assert.ok(!p.contactEmail);
});
