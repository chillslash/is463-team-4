import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {initialState} from '../src/core.js';

const folder=await mkdtemp(join(tmpdir(),'coffee-evidence-discovery-'));
process.env.DATA_FILE=join(folder,'state.json');
process.env.SOURCE_CACHE_DIR=join(folder,'source-cache');
process.env.AI_PROVIDER='codex';process.env.AUTO_AI_REVIEW='true';
const state=initialState();
const current=new Date().toISOString();
state.partners.push({id:'existing-evidence-farm',name:'Existing Fungal Farm',status:'suggested',
 source:'SFA Licensed Crop Farms',category:'crop farm',capacityKg:null,verified:false,
 sourcedAt:current,lastSeenAt:current,evidenceResearch:{checkedAt:current,result:'Already checked'},
 evidenceEntries:[{source:'Official organisation website',url:'https://example.org/farm',checkedAt:current,
  claim:'We cultivate mushrooms using agricultural by-products as an indoor growing substrate.'}]});
await writeFile(process.env.DATA_FILE,JSON.stringify(state));
const {createApp}=await import('../server.js');
let calls=0;
const assessmentGenerator=async(_provider,prompt)=>{
 calls++;
 assert.match(prompt,/Existing Fungal Farm/);
 return {result:{assessments:[{id:'existing-evidence-farm',reuseSuitability:34,sourceEvidence:29,evidenceIds:[0],
  pathway:'Potential fungal substrate component',reason:'The organisation documents mushroom cultivation using agricultural by-products; coffee-ground acceptance is unverified.',
  check:'Can prepared coffee grounds be accepted in the documented substrate?'}]},usage:{inputTokens:100,outputTokens:30}};
};
const discoveryProvider=async()=>({candidates:[],sources:[{name:'Cached fixture source',found:0,cached:true}],warnings:[]});
const server=createApp({aiProvider:'codex',assessmentGenerator,discoveryProvider});
server.listen(0,'127.0.0.1');await once(server,'listening');
const api=async(path,method='GET')=>{const r=await fetch('http://127.0.0.1:'+server.address().port+path,{method});return {status:r.status,body:await r.json()};};
test.after(async()=>{server.close();await once(server,'close');await rm(folder,{recursive:true,force:true});});
test('discovery assesses an existing eligible partner with zero newly discovered partners',async()=>{
 const run=await api('/api/discover','POST');
 assert.equal(run.status,200);assert.equal(run.body.added,0);assert.equal(run.body.found,0);
 assert.equal(run.body.assessed,1);assert.equal(run.body.aiCalls,1);assert.equal(run.body.sourceFreshness,'cached');
 assert.equal(calls,1);
 const after=(await api('/api/state')).body;
 const partner=after.ranked.find(p=>p.id==='existing-evidence-farm');
 assert.equal(partner.match.method,'AI-assisted');assert.equal(partner.aiEvidenceReview.provider,'codex');
 assert.equal(partner.match.parts.operations,0);
 assert.equal(after.discoveryRuns[0].newLeads,0);assert.equal(after.discoveryRuns[0].reviewed,1);
});
