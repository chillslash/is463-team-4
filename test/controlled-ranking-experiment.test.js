import test from 'node:test';
import assert from 'node:assert/strict';
import {makePacket,validate,deriveStrategies,applyPrediction} from '../scripts/controlled-ranking-experiment.mjs';

const p=(id,source)=>({id,name:id,category:'crop farm',source,sourceUrl:'https://example.org/registry',
 evidenceEntries:[{source:'Official register',url:'https://example.org/registry',claim:'Official register lists '+id}],
 status:'suggested',distanceKm:4,capacityKg:null,verified:false});
const state={partners:[p('a','SFA'),p('b','SFA'),p('c','MOE'),p('d','MOE')],settings:{ratingWeights:{suitability:30,evidence:30,proximity:5,operations:35}}};
test('packet contains exactly the same fixed public facts and never imports labels',()=>{
 const packet=makePacket(state,['a','b','c','d'],{byId:{a:[{url:'https://example.org/extra',claim:'Cultivation with mushroom substrate'}]}});
 assert.equal(packet.packets.length,4);
 assert.equal(packet.packets.find(x=>x.id==='a').sourceEvidence.length,2);
 assert.ok(!JSON.stringify(packet).includes('outreachPriority'));
});
test('the same AI output is used by full and selective strategies; no new AI scoring call',()=>{
 const packet=makePacket(state,['a','b','c','d'],{byId:{}});
 const result=validate(packet.packets.slice(0,4),{assessments:packet.packets.map(x=>({id:x.id,reuseSuitability:20,sourceEvidence:10,
  evidenceIds:[0],rationale:'No evidence of authorised receiving process.',openQuestion:'Will this organisation participate?'}))});
 assert.equal(result.valid.length,4);
 const pred=Object.fromEntries(result.valid.map(x=>[x.id,x]));
 const full=deriveStrategies(packet,{results:pred},2);
 assert.equal(full.fullValid,4);assert.equal(full.selectedValid,2);
 for(const item of packet.packets){
  assert.equal(full.scenarios.fullBlendedAI[item.id],applyPrediction(item,pred[item.id],packet.weights));
  if(!full.selected.includes(item.id))assert.equal(full.scenarios.selectiveBlendedAI[item.id],item.ruleScore);
  else assert.equal(full.scenarios.selectiveBlendedAI[item.id],full.scenarios.fullBlendedAI[item.id]);
 }
});
test('generic listing cannot inflate reported suitability or evidence beyond explicit cap',()=>{
 const packet=makePacket(state,['a','b','c','d'],{byId:{}});
 const assessed={assessments:packet.packets.map(x=>({id:x.id,reuseSuitability:40,sourceEvidence:35,
  evidenceIds:[0],rationale:'Farm is viable',openQuestion:'What capacity?'}))};
 assert.equal(validate(packet.packets,assessed).valid.length,0);
});
