import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const match=source.match(/function discoveryViewProgress\(status\)\{[\s\S]*?\n\}/);
assert.ok(match,'Discovery progress helper must exist');
const progress=runInNewContext(match[0]+';discoveryViewProgress',{Math,Number});

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
 assert.equal(at(0).detail,'Evaluating Batch 1 Of 4');
 assert.equal(at(2).percentage,58);
 assert.equal(at(2).detail,'Evaluating Batch 3 Of 4');
 assert.equal(at(4).percentage,90);
});
test('score badges use consistent capitalisation without changing internal method keys',()=>{
 assert.match(source,/AI-Assisted/);
 assert.match(source,/Rule-Ranked/);
 assert.match(source,/p\.match\.method==='AI-assisted'/);
});
