import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {initialState} from '../src/core.js';

const folder=await mkdtemp(join(tmpdir(),'coffee-website-pipeline-'));
process.env.DATA_FILE=join(folder,'state.json');
process.env.SOURCE_CACHE_DIR=join(folder,'source-cache');
process.env.AI_PROVIDER='codex';
process.env.AUTO_AI_REVIEW='true';

const state=initialState();
state.settings.automaticAIAssessments=1;
state.partners.push({
 id:'ento-test',name:'Ento Industries Pte Ltd',status:'suggested',source:'NEA Food Waste Recycling Facilities',
 sourceUrl:'https://www.nea.gov.sg/example',category:'organic waste recycler',capacityKg:null,verified:false,
 location:'Singapore',distanceKm:6,sourcedAt:new Date().toISOString(),lastSeenAt:new Date().toISOString(),
 evidenceEntries:[{source:'NEA Food Waste Recycling Facilities',url:'https://www.nea.gov.sg/example',
  claim:'NEA lists Ento Industries as a food-waste recycling facility.',checkedAt:new Date().toISOString()}]
});
await writeFile(process.env.DATA_FILE,JSON.stringify(state));

const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{
 const value=String(url);
 if(value.startsWith('https://ento.example/')){
  return new Response('<html><title>Ento Industries</title><body><p>Ento Industries processes organic food waste using black soldier fly larvae and produces recovered material outputs for circular applications.</p></body></html>',
   {status:200,headers:{'Content-Type':'text/html'}});
 }
 return originalFetch(url,opts);
};

const {createApp}=await import('../server.js');
let websiteCalls=0,assessmentCalls=0;
const websiteResearchGenerator=async(provider,prompt,options)=>{
 websiteCalls++;
 assert.equal(provider,'codex');
 assert.equal(options.webSearch,true);
 assert.match(prompt,/Ento Industries Pte Ltd/);
 return {result:{organisations:[{id:'ento-test',websiteUrl:'https://ento.example/',reason:'Official Ento Industries website'}]},
  usage:{inputTokens:80,outputTokens:30,cachedInputTokens:0}};
};
const assessmentGenerator=async(provider,prompt)=>{
 assessmentCalls++;assert.equal(provider,'codex');
 const input=JSON.parse(prompt.split('\n').at(-1));
 const candidate=input.find(x=>x.id==='ento-test');
 assert.ok(candidate,'Selected candidate must reach AI evaluation');
 const index=candidate.sourceEvidence.findIndex(e=>/black soldier fly/i.test(e.claim));
 assert.ok(index>=0,'Organisation-specific website evidence must be gathered before evaluation');
 return {result:{assessments:[{id:'ento-test',reuseSuitability:28,sourceEvidence:24,evidenceIds:[index],
  pathway:'Potential organic-waste processing input subject to facility requirements',
  reason:'The organisation website documents a specific organic-waste processing pathway.',
  check:'Can sun-dried spent coffee grounds enter the documented process?'}]},
  usage:{inputTokens:100,outputTokens:40,cachedInputTokens:0}};
};
const discoveryProvider=async()=>({candidates:[],sources:[{name:'Fixture source',found:0,cached:true}],warnings:[]});
const server=createApp({aiProvider:'codex',assessmentGenerator,websiteResearchGenerator,discoveryProvider});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
const api=async(path,method='GET')=>{const r=await originalFetch(base+path,{method});return {status:r.status,body:await r.json()};};

test.after(async()=>{globalThis.fetch=originalFetch;server.close();await once(server,'close');await rm(folder,{recursive:true,force:true});});

test('discovery resolves and verifies an official site before evidence-only AI evaluation',async()=>{
 const run=await api('/api/discover','POST');
 assert.equal(run.status,200);
 assert.equal(run.body.websiteResolutionCalls,1);
 assert.equal(run.body.websitesResolved,1);
 assert.ok(run.body.evidencePagesChecked>=1);
 assert.equal(run.body.assessed,1);
 assert.equal(websiteCalls,1);
 assert.equal(assessmentCalls,1);
 const after=(await api('/api/state')).body;
 const p=after.partners.find(x=>x.id==='ento-test');
 assert.equal(p.websiteUrl,'https://ento.example/');
 assert.equal(p.websiteOrigin,'codex-web-search');
 assert.equal(p.websiteResolution.result,'verified');
 assert.ok(p.evidenceEntries.some(e=>/black soldier fly/i.test(e.claim)));
 assert.equal(p.aiEvidenceReview.provider,'codex');
 assert.equal(after.ranked.find(x=>x.id==='ento-test').match.method,'AI-assisted');
});
