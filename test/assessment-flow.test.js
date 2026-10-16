import test from 'node:test';
import assert from 'node:assert/strict';
import {saveAIResults,chooseForAssessment} from '../server.js';
import {scorePartner,rankPartners} from '../src/core.js';
const p=(id,source)=>({id,name:id,source,category:'community garden',use:'Possible reuse',status:'suggested',distanceKm:2,evidenceEntries:[{source,url:'https://example.org/evidence',claim:'Listed'}]});
test('AI results persist to canonical partner and alter Fit Score',()=>{
 const saved=[p('a','A'),p('b','B')],copies=rankPartners(saved,10);
 const original=scorePartner(saved[0],10).score;
 const n=saveAIResults(saved,[copies[0]],[{id:'a',priority:'low',reason:'Missing evidence',check:'Confirm application'}],{provider:'codex',prompt:'test',runId:'r'});
 assert.equal(n,1);assert.equal(saved[0].aiAssessment.priority,'low');
 assert.equal(copies[0].aiAssessment,undefined);
 assert.ok(scorePartner(saved[0],10).score<original);
 assert.equal(saved[0].aiAssessment.basedOn[0].url,'https://example.org/evidence');
});
test('AI assessment rotates across source categories',()=>{
 const pool=[...Array.from({length:30},(_,i)=>p('garden'+i,'Gardens')),...Array.from({length:5},(_,i)=>p('farm'+i,'Farms')),...Array.from({length:5},(_,i)=>p('school'+i,'Schools'))];
 const top=chooseForAssessment(pool,12);
 assert.equal(top.length,12);assert.equal(top.filter(x=>x.source==='Gardens').length,4);
});
