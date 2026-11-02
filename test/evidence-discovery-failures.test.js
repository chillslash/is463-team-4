import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {initialState} from '../src/core.js';

const folder=await mkdtemp(join(tmpdir(),'coffee-evidence-failures-'));
process.env.DATA_FILE=join(folder,'state.json');process.env.SOURCE_CACHE_DIR=join(folder,'source-cache');
process.env.AI_PROVIDER='claude';process.env.AUTO_AI_REVIEW='true';
const state=initialState(),checkedAt=new Date().toISOString();
for(let i=0;i<31;i++)state.partners.push({id:'eligible-'+i,name:'Eligible Farm '+i,status:'suggested',
 source:'SFA source '+i,category:'crop farm',capacityKg:null,verified:false,sourcedAt:checkedAt,
 evidenceEntries:[{source:'Organisation website',url:'https://example.org/farm-'+i,checkedAt,
  claim:'We cultivate mushrooms using agricultural by-products as an indoor growing substrate.'}]});
await writeFile(process.env.DATA_FILE,JSON.stringify(state));
const {createApp}=await import('../server.js');
let calls=0;
const assessmentGenerator=async(_provider,prompt)=>{
 calls++;if(calls===1)throw new Error('Simulated Claude rate limit');
 const input=JSON.parse(prompt.slice(prompt.lastIndexOf('\n')+1));
 return {result:{assessments:input.map(p=>({id:p.id,reuseSuitability:32,sourceEvidence:28,potentialIntake:10,evidenceIds:[0],intakeEvidenceIds:[0],
  reason:'The cited organisation documents mushroom cultivation with agricultural by-products; spent grounds acceptance remains unverified.',
  intakeReason:'Documented recurring substrate cultivation supports moderate relative intake potential; actual volume is unknown.',
  check:'Can prepared coffee grounds be used in this documented process?',pathway:'Potential mushroom substrate component'}))}};
};
const discoveryProvider=async()=>({candidates:[],sources:[{name:'Cached source fixture',found:0,cached:true}],warnings:[]});
const server=createApp({aiProvider:'claude',assessmentGenerator,discoveryProvider});server.listen(0,'127.0.0.1');await once(server,'listening');
test.after(async()=>{server.close();await once(server,'close');await rm(folder,{recursive:true,force:true});});
test('a failed assessment batch is counted and later eligible partners continue',async()=>{
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/discover',{method:'POST'});
 assert.equal(response.status,200);const run=await response.json();
 assert.equal(run.added,0);assert.equal(run.found,0);assert.equal(run.aiCalls,4);assert.equal(run.assessed,18);
 assert.equal(run.assessmentFailed,6);assert.equal(calls,4);
 const saved=JSON.parse(await (await fetch('http://127.0.0.1:'+server.address().port+'/api/state')).text());
 const ai=saved.ranked.filter(p=>p.match.method==='AI-assisted');
 assert.equal(ai.length,18);
 assert.ok(saved.discoveryRuns[0].warnings.some(x=>/rate limit/.test(x)));

 const secondResponse=await fetch('http://127.0.0.1:'+server.address().port+'/api/discover',{method:'POST'});
 assert.equal(secondResponse.status,200);const second=await secondResponse.json();
 assert.equal(second.aiCalls,2);assert.equal(second.assessed,7);assert.equal(second.assessmentFailed,0);assert.equal(calls,6);
 const final=JSON.parse(await (await fetch('http://127.0.0.1:'+server.address().port+'/api/state')).text());
 assert.equal(final.ranked.filter(p=>p.match.method==='AI-assisted').length,25);
 assert.equal(final.partners.filter(p=>p.aiEvidenceFailureAt).length,6);
});
