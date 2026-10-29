import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {initialState} from '../src/core.js';

const folder=await mkdtemp(join(tmpdir(),'coffee-evidence-api-'));
process.env.DATA_FILE=join(folder,'state.json');
process.env.AI_PROVIDER='template';process.env.AUTO_AI_REVIEW='false';
const state=initialState();
state.partners.push({
 id:'material-farm',name:'Fungal Materials Ltd',status:'suggested',source:'SFA Licensed Crop Farms',
 category:'crop farm',distanceKm:5,capacityKg:null,verified:false,
 evidenceEntries:[{source:'Official company website',url:'https://example.org/fungi',
  claim:'We grow mushrooms on organic by-products and recycled agricultural substrate, subject to testing.'}]
});
state.partners.push({id:'stale-material-farm',name:'Stale Fungal Farm',status:'suggested',source:'SFA Licensed Crop Farms',
 category:'crop farm',capacityKg:null,verified:false,
 evidenceEntries:[{source:'Official organisation website',url:'https://example.org/stale-fungi',
  checkedAt:new Date(Date.now()-60*86400000).toISOString(),
  claim:'We cultivate mushrooms using agricultural by-products and recycled substrate.'}]});
state.partners.push({
 id:'second-material-farm',name:'Second Fungal Materials Ltd',status:'suggested',source:'SFA Licensed Crop Farms',
 category:'crop farm',distanceKm:8,capacityKg:null,verified:false,
 evidenceEntries:[{source:'Official company website',url:'https://example.org/second-fungi',
  claim:'We grow mushrooms using agricultural by-products and recycled organic substrate, subject to testing.'}]
});
state.partners.push({id:'generic-farm',name:'Generic Farm',status:'suggested',
 source:'SFA Licensed Crop Farms',category:'crop farm',capacityKg:null,verified:false,
 evidenceEntries:[{source:'SFA',url:'https://example.org/farm',claim:'Official or mapped source lists Generic Farm'}]});
await writeFile(process.env.DATA_FILE,JSON.stringify(state));
const {createApp}=await import('../server.js');
let invalid=false,providerFailure=false,calls=0;
const assessmentGenerator=async(_provider,prompt)=>{
 calls++;
 if(providerFailure)throw new Error('Codex provider unavailable');
 const [input]=JSON.parse(prompt.split('\\n').at(-1));
 const generic=input.id==='generic-farm';
 return {result:{assessments:[{id:input.id,reuseSuitability:invalid?40:generic?12:36,
  sourceEvidence:generic?4:30,evidenceIds:[invalid?99:0],
  reason:generic?'Only an organisation directory listing is known; material compatibility is unverified.':
    'The company documents organic-by-product fungal substrate production, not verified grounds acceptance.',
  check:'Can prepared coffee grounds be used in a documented process?',
  pathway:generic?'Unknown; verify organisation-specific use':'Fungal cultivation trial'}]},usage:{inputTokens:250,outputTokens:70}};
};
const srv=createApp({aiProvider:'codex',assessmentGenerator});
srv.listen(0,'127.0.0.1');await once(srv,'listening');
const base='http://127.0.0.1:'+srv.address().port;
const call=async(path,method='GET')=>{
 const r=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:method==='POST'?'{}':undefined});
 return {status:r.status,data:await r.json()};
};
test.after(async()=>{srv.close();await once(srv,'close');await rm(folder,{recursive:true,force:true});});
test('AI evidence review increases relative suitability and has an auditable explanation',async()=>{
 const before=(await call('/api/state')).data;
 const initial=before.ranked.find(p=>p.id==='material-farm').match;
 assert.equal(initial.method,'Rule-ranked');
 const reviewed=await call('/api/partners/material-farm/evidence-review','POST');
 assert.equal(reviewed.status,200);assert.equal(calls,1);
 assert.deepEqual(reviewed.data.assessment.evidenceIds,[0]);
 const after=(await call('/api/state')).data;
 const p=after.ranked.find(p=>p.id==='material-farm');
 assert.equal(p.match.method,'AI-assisted');
 assert.ok(p.match.score>initial.score);
 assert.equal(p.match.parts.operations,0);
 assert.equal(p.capacityKg,null);
 assert.equal(p.aiEvidenceReview.provider,'codex');
 assert.ok(after.aiActivity.some(x=>x.kind==='manual-evidence-review'&&x.success));
});
test('generic directory partner is assessed with low confidence instead of being blocked',async()=>{
 const previous=calls;
 const response=await call('/api/partners/generic-farm/evidence-review','POST');
 assert.equal(response.status,200);
 assert.equal(calls,previous+1);
 const state=(await call('/api/state')).data;
 assert.equal(state.ranked.find(p=>p.id==='generic-farm').match.method,'AI-assisted');
 assert.equal(state.partners.find(p=>p.id==='generic-farm').aiEvidenceReview.sourceEvidence,4);
});
test('invalid citations do not overwrite a previous grounded review',async()=>{
 invalid=true;
 const response=await call('/api/partners/material-farm/evidence-review','POST');
 assert.equal(response.status,502);
 const after=(await call('/api/state')).data;
 assert.equal(after.ranked.find(p=>p.id==='material-farm').match.method,'AI-assisted');
 assert.equal(after.partners.find(p=>p.id==='material-farm').aiEvidenceReview.evidenceIds[0],0);
});
test('dated source evidence does not create a pre-assessment block',async()=>{
 const previous=calls;
 const response=await call('/api/partners/stale-material-farm/evidence-review','POST');
 assert.equal(response.status,200);assert.equal(calls,previous+1);
});
test('failed live provider calls leave deterministic scores and record the failure',async()=>{
 providerFailure=true;
 const response=await call('/api/partners/second-material-farm/evidence-review','POST');
 assert.equal(response.status,502);
 const after=(await call('/api/state')).data;
 assert.equal(after.ranked.find(p=>p.id==='second-material-farm').match.method,'Rule-ranked');
 const log=after.aiActivity.find(x=>x.kind==='manual-evidence-review'&&x.partnerId==='second-material-farm');
 assert.equal(log.success,false);
 assert.match(log.error,/Codex provider unavailable/);
});
