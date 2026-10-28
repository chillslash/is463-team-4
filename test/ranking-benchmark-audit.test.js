import test from 'node:test';
import assert from 'node:assert/strict';
import {pairAgreement,benchmarkAudit} from '../scripts/ranking-benchmark-audit.mjs';
test('within-source analysis is separated from source-category ordering',()=>{
 const rows=[
  {id:'a',source:'A',tier:2,rules:10,ai:11},
  {id:'b',source:'A',tier:1,rules:10,ai:9},
  {id:'c',source:'B',tier:2,rules:20,ai:3},
  {id:'d',source:'B',tier:1,rules:5,ai:4}
 ];
 assert.deepEqual(pairAgreement(rows,'rules',{sameSource:true}),{pairs:2,agreement:.75,ties:1});
 assert.deepEqual(pairAgreement(rows,'ai',{sameSource:true}),{pairs:2,agreement:.5,ties:0});
 assert.equal(pairAgreement(rows,'rules',{sameSource:false}).pairs,2);
});
test('audit surfaces external research and missing-grade warnings rather than declaring a winner',()=>{
 const state={partners:[
  {id:'a',source:'Farms',category:'farm',status:'suggested'},
  {id:'b',source:'Farms',category:'farm',status:'suggested'},
  {id:'c',source:'Parks',category:'public park',status:'suggested'}]};
 const review={cases:[{id:'a',review:{outreachPriority:2}},
  {id:'b',review:{outreachPriority:1}},{id:'c',review:{outreachPriority:1}}]};
 const output=benchmarkAudit(state,review,{ai:{a:10,b:8,c:5}},{a:'Documented cultivation'});
 assert.equal(output.totalCases,3);
 assert.equal(output.researchSupplementCaseCount,1);
 assert.equal(output.measures.ai.withinSource.agreement,1);
 assert.equal(output.tiers.find(x=>x.grade===0).count,0);
 assert.match(output.decision,/Do not report/);
});
