import test from 'node:test';
import assert from 'node:assert/strict';
import {saveAIResults,chooseForAssessment} from '../server.js';
import {scorePartner,rankPartners} from '../src/core.js';
const p=(id,source)=>({id,name:id,source,category:'community garden',use:'Possible reuse',status:'suggested',distanceKm:2,evidenceEntries:[{source,url:'https://example.org/evidence',claim:'Listed'}]});
test('AI qualitative scores persist and outrank provisional leads',()=>{
 const saved=[p('a','A'),p('b','B')],copies=rankPartners(saved,10);
 const prior=scorePartner(saved[0],10).score;
 const results=[{id:'a',reuseSuitability:4,sourceEvidence:5,operationalCompatibility:0,reason:'Sparse evidence',check:'Confirm'}];
 assert.equal(saveAIResults(saved,[copies[0]],results,{provider:'codex',prompt:'test',runId:'run'}),1);
 assert.equal(saved[0].aiAssessment.rubricVersion,'ai-led-v1');
 assert.equal(copies[0].aiAssessment,undefined);
 assert.equal(scorePartner(saved[0],10).aiLed,true);
 assert.ok(scorePartner(saved[0],10).score<prior);
 assert.equal(rankPartners(saved,10)[0].id,'a');
 assert.equal(saved[0].aiAssessment.basedOn[0].url,'https://example.org/evidence');
});
test('AI assessment rotates across source categories',()=>{
 const pool=[...Array.from({length:30},(_,i)=>p('garden'+i,'Gardens')),...Array.from({length:5},(_,i)=>p('farm'+i,'Farms')),...Array.from({length:5},(_,i)=>p('school'+i,'Schools'))];
 const top=chooseForAssessment(pool,12);
 assert.equal(top.length,12);assert.equal(top.filter(x=>x.source==='Gardens').length,4);
});
