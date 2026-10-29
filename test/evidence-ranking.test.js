import test from 'node:test';
import assert from 'node:assert/strict';
import {activeEvidenceReview,evidenceFingerprint,evidenceQuality,evidencePrompt,validateEvidenceAssessments} from '../src/evidence-review.js';
import {scorePartner,rankPartners} from '../src/core.js';
import {saveEvidenceResults} from '../server.js';
const source = (id,name,claim)=>({
 id,name,status:'suggested',source:'SFA Licensed Crop Farms',category:'crop farm',
 capacityKg:null,verified:false,distanceKm:5,
 evidenceEntries:[{source:'Public organisation website',url:'https://example.org/reuse',claim}]
});
const explicit='This organisation cultivates mushrooms using agricultural by-products as an indoor growing substrate.';
const irrelevant='This business focuses on rubber flooring for playgrounds and sport facilities rather than growing activities.';
function answer(p,reuseSuitability,sourceEvidence){
 return {assessments:[{id:p.id,reuseSuitability,sourceEvidence,evidenceIds:[0],
  reason:'Specific cited substrate or material evidence supports a distinct potential pathway; acceptance unverified.',
  check:'Can the organisation accept prepared spent grounds?',pathway:'Verify compatible material use'}]};
}
test('v2 AI can distinguish differently evidenced partners from the same category',()=>{
 const a=source('a','Fungal Growers',explicit),b=source('b','Surface Materials',irrelevant);
 const priorA=scorePartner(a,0),priorB=scorePartner(b,0);
 assert.equal(priorA.score,priorB.score,'Both begin with source-only category ranking');
 const outputA=validateEvidenceAssessments(answer(a,37,31),[a]);
 const outputB=validateEvidenceAssessments(answer(b,3,5),[b]);
 assert.equal(outputA.length,1);assert.equal(outputB.length,1);
 assert.equal(saveEvidenceResults([a,b],[...outputA,...outputB],{provider:'codex',runId:'test'}),2);
 const afterA=scorePartner(a,0),afterB=scorePartner(b,0);
 assert.equal(afterA.method,'AI-assisted');assert.equal(afterB.method,'AI-assisted');
 assert.ok(afterA.score>afterB.score+15,'Specific evidence creates meaningful relative ordering');
 assert.equal(afterA.parts.operations,0);assert.equal(afterB.parts.operations,0);
 assert.equal(a.capacityKg,null);assert.equal(b.capacityKg,null);
 assert.deepEqual(rankPartners([a,b],0).map(p=>p.id),['a','b']);
});
test('generic directory citation cannot promote even a confident hallucinated review',()=>{
 const p=source('generic','Generic Farm','Official or mapped source lists Generic Farm');
 assert.equal(evidenceQuality(p.evidenceEntries[0]),false);
 assert.deepEqual(validateEvidenceAssessments(answer(p,40,35),[p]),[]);
 p.aiEvidenceReview={...answer(p,40,35).assessments[0],rubricVersion:'evidence-v2',factsHash:evidenceFingerprint(p)};
 assert.equal(activeEvidenceReview(p),null);
 assert.equal(scorePartner(p,0).method,'Rule-ranked');
});
test('stale sources and falsified evidence IDs cannot affect the score',()=>{
 const p=source('a','A',explicit);
 const reviewed=validateEvidenceAssessments(answer(p,36,30),[p])[0];
 p.aiEvidenceReview=reviewed;
 assert.equal(scorePartner(p,0).method,'AI-assisted');
 p.evidenceEntries[0].claim='Organisation is no longer cultivating fungal substrates';
 assert.equal(scorePartner(p,0).method,'Rule-ranked');
 assert.equal(activeEvidenceReview(p),null);
 assert.equal(validateEvidenceAssessments({...answer(p,36,30),assessments:[{...answer(p,36,30).assessments[0],evidenceIds:[999]}]},[p]).length,0);
});
test('evidence citations older than 30 days cannot keep an AI score active',()=>{
 const p=source('old','Old Evidence',explicit);
 p.aiEvidenceReview=validateEvidenceAssessments(answer(p,38,32),[p])[0];
 p.evidenceEntries[0].checkedAt=new Date(Date.now()-31*86400000).toISOString();
 assert.equal(scorePartner(p,0).method,'Rule-ranked');
});
test('AI may not award operational points or infer permission, recurring intake, or logistics',()=>{
 const p=source('a','A',explicit);
 const x=answer(p,40,35);
 x.assessments[0].operationalCompatibility=10;
 x.assessments[0].capacityKg=100;
 p.aiEvidenceReview=validateEvidenceAssessments(x,[p])[0];
 const result=scorePartner(p,0);
 assert.equal(result.parts.operations,0);
 assert.match(result.reasons.join(' '),/capacity unknown/);
 assert.equal(result.method,'AI-assisted');
 assert.equal(p.capacityKg,null);
});
test('prompt requires cited evidence indices, source-limited reasoning and no invented grounds acceptance',()=>{
 const p=source('a','A',explicit);
 const prompt=evidencePrompt([p]);
 assert.match(prompt,/evidenceIds/);
 assert.match(prompt,/no browsing/i);
 assert.match(prompt,/do not score distance or logistics/i);
 assert.match(prompt,/sourceEvidence/i);
 assert.match(prompt,/explicitly names used or spent coffee grounds.*direct evidence/i);
 assert.ok(prompt.includes(explicit));
});

test('SFA licence disclaimer mentioning coffee grounds is not positive reuse evidence',()=>{
 const p=source('sfa','Vegetable Farm','SFA lists Vegetable Farm under Vegetable Farming (licence 7521I051). This does not establish growing method, acceptance of coffee grounds, contact authority, capacity or logistics.');
 assert.equal(evidenceQuality(p.evidenceEntries[0]),false);
 assert.deepEqual(validateEvidenceAssessments(answer(p,40,35),[p]),[]);
 assert.equal(scorePartner(p,0).method,'Rule-ranked');
});
