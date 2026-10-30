import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const match=source.match(/function discoveryViewProgress\(status\)\{[\s\S]*?\n\}/);
assert.ok(match,'Discovery progress helper must exist');
const titleCase=source.match(/const titleCase=s=>[^\n]+/);
assert.ok(titleCase,'Shared title-case helper must exist');
const progress=runInNewContext(titleCase[0]+'\n'+match[0]+';discoveryViewProgress',{Math,Number});

test('progress label matches progress-bar percentage',()=>{
 const stages=[
  {phase:'Discovering Partners',completed:0},
  {phase:'Researching Contacts',completed:1},
  {phase:'Ranking Partners',completed:2},
  {phase:'Finalising Results',completed:3},
  {phase:'Completed',completed:4}
 ];
 for(const stage of stages){
  const result=progress(stage);
  assert.equal(result.label,result.percentage+'% Complete');
 }
});
test('batch progress moves during AI evaluation with capitalised status',()=>{
 const at=n=>progress({phase:'Assessing and Ranking Partners',completed:2,batchCompleted:n,batchTotal:4});
 assert.equal(at(0).percentage,25);
 assert.equal(at(0).detail,'Evaluating Batch 1 of 4');
 assert.equal(at(2).percentage,58);
 assert.equal(at(2).detail,'Evaluating Batch 3 of 4');
 assert.equal(at(4).percentage,90);
});
test('all discovery phases and subtitles are title-cased except of',()=>{
 const scenarios=[
  [{phase:'Discovering Partners',completed:0,detail:'Retrieving sources and matching locations'},
   'Discovering Partners','Retrieving Sources And Matching Locations'],
  [{phase:'Researching Contacts',completed:1,detail:'Checking published contact details'},
   'Researching Contacts','Checking Published Contact Details'],
  [{phase:'Ranking Partners',completed:2,detail:'Ranking sourced leads'},
   'Ranking Partners','Ranking Sourced Leads'],
  [{phase:'Assessing and Ranking Partners',completed:2,batchTotal:0,detail:'Evidence assessment batch 1 of 4'},
   'Assessing And Ranking Partners','Evidence Assessment Batch 1 of 4'],
  [{phase:'Finalising Results',completed:3,detail:'Saving discovery results'},
   'Finalising Results','Saving Discovery Results'],
  [{phase:'Completed with partial AI results',completed:4,detail:''},
   'Completed With Partial AI Results',''],
  [{phase:'Stopping',completed:1,detail:'Discarding this run'},
   'Stopping','Discarding This Run']
 ];
 for(const [input,phase,detail] of scenarios){
  const result=progress(input);
  assert.equal(result.phase,phase);
  assert.equal(result.detail,detail);
 }
});

test('score badges use consistent capitalisation without changing internal method keys',()=>{
 assert.match(source,/AI-Assisted/);
 assert.match(source,/Rule-Ranked/);
 assert.match(source,/p\.match\.method==='AI-assisted'/);
});
