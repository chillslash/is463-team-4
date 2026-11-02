import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseEvidenceAssessments,evidenceAssessmentSchema,validateEvidenceAssessments} from '../src/evidence-review.js';
import {generateJSON} from '../src/ai.js';
const source=(id)=>({id,name:'Example School '+id,category:'school programme',source:'MOE programme',
 evidenceEntries:[{url:'https://data.gov.sg/datasets/programmes',source:'MOE',checkedAt:new Date().toISOString(),claim:'School sustainability programme listed by MOE'}]});
const row=(id)=>({id,reuseSuitability:10,sourceEvidence:4,potentialIntake:3,
 evidenceIds:[0],intakeEvidenceIds:[0],reason:'Possible collection trial; acceptance unconfirmed',
 intakeReason:'Programmes may be small; cannot infer throughput',check:'Is there a staff coordinator?',pathway:'Education trial'});
test('Claude output schema requires assessment fields and exact candidate ids',()=>{
 const schema=evidenceAssessmentSchema([source('a'),source('b')]);
 assert.equal(schema.additionalProperties,false);
 const nested=schema.properties.assessments.items;
 assert.deepEqual(nested.properties.id.enum,['a','b']);
 for(const field of ['id','reuseSuitability','sourceEvidence','potentialIntake','evidenceIds','intakeEvidenceIds','reason','intakeReason','check','pathway'])
  assert.ok(nested.required.includes(field),field);
});
test('validation accepts cited school assessments and explains invalid citations without making up evidence',()=>{
 const p=[source('a'),source('b')];
 const out=diagnoseEvidenceAssessments({assessments:[row('a'),{...row('b'),evidenceIds:[9]}]},p);
 assert.equal(out.accepted.length,1);
 assert.equal(out.rejected.length,1);
 assert.equal(out.rejected[0].id,'b');
 assert.match(out.rejected[0].reason,/citation/i);
 assert.equal(validateEvidenceAssessments({assessments:[row('a')]},p).length,1);
});
test('missing assessments are reported individually, and empty evidence must score zero',()=>{
 const p=[source('a'),source('b'),source('c')];
 const out=diagnoseEvidenceAssessments({assessments:[{...row('a'),sourceEvidence:0,potentialIntake:0,evidenceIds:[],intakeEvidenceIds:[]},{...row('b'),sourceEvidence:5,evidenceIds:[]}]},p);
 assert.equal(out.accepted.length,2);
 assert.equal(out.rejected.length,1);
 assert.equal(out.accepted.find(x=>x.id==='b').sourceEvidence,0);
 assert.equal(out.normalised.length,1);
 assert.match(out.rejected[0].reason,/missing assessment/i);
});
test('Claude request transmits schema only for non-browsing assessment',async()=>{
 const schema=evidenceAssessmentSchema([source('a')]);let seen;
 await generateJSON('claude','Assess evidence',{apiKey:'mock-only',jsonSchema:schema,
  fetchImpl:async(_url,init)=>{seen=JSON.parse(init.body);return {ok:true,json:async()=>({content:[{type:'text',text:JSON.stringify({assessments:[row('a')]})}],stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:50}})};}});
 assert.equal(seen.output_config.format.type,'json_schema');
 assert.deepEqual(seen.output_config.format.schema,schema);
 assert.equal(seen.tools,undefined);
 await assert.rejects(generateJSON('claude','x',{apiKey:'mock-only',jsonSchema:schema,webSearch:true}),/Cannot combine/);
});
