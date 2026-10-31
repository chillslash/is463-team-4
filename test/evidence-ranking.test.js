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
function answer(p,reuseSuitability,sourceEvidence,potentialIntake=8){
 return {assessments:[{id:p.id,reuseSuitability,sourceEvidence,potentialIntake,evidenceIds:[0],intakeEvidenceIds:[0],
  reason:'Specific cited substrate or material evidence supports a distinct potential pathway; acceptance unverified.',
  intakeReason:'The cited operation supports a cautious relative intake estimate; actual kg/week and willingness remain unknown.',
  check:'Can the organisation accept prepared spent grounds?',pathway:'Verify compatible material use'}]};
}
test('v2 AI can distinguish differently evidenced partners from the same category',()=>{
 const a=source('a','Fungal Growers',explicit),b=source('b','Surface Materials',irrelevant);
 const priorA=scorePartner(a,0),priorB=scorePartner(b,0);
 assert.equal(priorA.score,priorB.score,'Both begin with source-only category ranking');
 const outputA=validateEvidenceAssessments(answer(a,37,31,12),[a]);
 const outputB=validateEvidenceAssessments(answer(b,3,5,2),[b]);
 assert.equal(outputA.length,1);assert.equal(outputB.length,1);
 assert.equal(saveEvidenceResults([a,b],[...outputA,...outputB],{provider:'codex',runId:'test'}),2);
 const afterA=scorePartner(a,0),afterB=scorePartner(b,0);
 assert.equal(afterA.method,'AI-assisted');assert.equal(afterB.method,'AI-assisted');
 assert.ok(afterA.score>afterB.score+15,'Specific evidence creates meaningful relative ordering');
 assert.equal('operations' in afterA.parts,false);assert.equal('operations' in afterB.parts,false);
 assert.equal(a.capacityKg,null);assert.equal(b.capacityKg,null);
 assert.deepEqual(rankPartners([a,b],0).map(p=>p.id),['a','b']);
});
test('generic directory leads can be reviewed without an eligibility gate',()=>{
 const p=source('generic','Generic Farm','Official or mapped source lists Generic Farm');
 assert.equal(evidenceQuality(p.evidenceEntries[0]),false);
 const result=validateEvidenceAssessments(answer(p,16,5),[p]);
 assert.equal(result.length,1);
 p.aiEvidenceReview={...result[0],assessedAt:new Date().toISOString()};
 assert.equal(scorePartner(p,0).method,'AI-assisted');
 assert.equal(p.aiEvidenceReview.sourceEvidence,5);
});
test('stale sources and falsified evidence IDs cannot affect the score',()=>{
 const p=source('a','A',explicit);
 const reviewed=validateEvidenceAssessments(answer(p,36,30),[p])[0];
 p.aiEvidenceReview={...reviewed,assessedAt:new Date().toISOString()};
 assert.equal(scorePartner(p,0).method,'AI-assisted');
 p.evidenceEntries[0].claim='Organisation is no longer cultivating fungal substrates';
 assert.equal(scorePartner(p,0).method,'Rule-ranked');
 assert.equal(activeEvidenceReview(p),null);
 assert.equal(validateEvidenceAssessments({...answer(p,36,30),assessments:[{...answer(p,36,30).assessments[0],evidenceIds:[999]}]},[p]).length,0);
 assert.equal(validateEvidenceAssessments({...answer(p,36,30),assessments:[{...answer(p,36,30).assessments[0],intakeEvidenceIds:[999]}]},[p]).length,0);
});
test('AI assessments expire after 30 days and return to rule-ranked fallback',()=>{
 const p=source('old','Old Evidence',explicit);
 p.aiEvidenceReview={...validateEvidenceAssessments(answer(p,38,32),[p])[0],assessedAt:new Date().toISOString()};
 p.aiEvidenceReview.assessedAt=new Date(Date.now()-31*86400000).toISOString();
 assert.equal(scorePartner(p,0).method,'Rule-ranked');
});
test('AI may estimate relative intake scale but not infer permission, actual kg, recurring agreement, or logistics',()=>{
 const p=source('a','A',explicit);
 const x=answer(p,40,35,14);
 x.assessments[0].operationalCompatibility=10;
 x.assessments[0].capacityKg=100;
 p.aiEvidenceReview={...validateEvidenceAssessments(x,[p])[0],assessedAt:new Date().toISOString()};
 const result=scorePartner(p,0);
 assert.equal('operations' in result.parts,false);
 assert.ok(result.parts.intake>0);
 assert.match(result.reasons.join(' '),/relative intake estimate/i);
 assert.match(result.reasons.join(' '),/Confirm intake quantity, frequency and collection arrangements during outreach/);
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
 assert.match(prompt,/potentialIntake/i);
 assert.match(prompt,/intakeEvidenceIds/i);
 assert.match(prompt,/RELATIVE PRE-CONTACT ABSORPTION SCALE/i);
 assert.match(prompt,/documented acceptance of used coffee grounds is strong/i);
 assert.match(prompt,/NOT reasons to deduct technical suitability or factual evidence twice/i);
 assert.match(prompt,/never convert it into kg\/week or imply willingness/i);
 assert.ok(prompt.includes(explicit));
});

test('SFA licence disclaimer remains weak evidence but does not bar an AI review',()=>{
 const p=source('sfa','Vegetable Farm','SFA lists Vegetable Farm under Vegetable Farming (licence 7521I051). This does not establish growing method, acceptance of coffee grounds, contact authority, capacity or logistics.');
 assert.equal(evidenceQuality(p.evidenceEntries[0]),false);
 const results=validateEvidenceAssessments(answer(p,12,4),[p]);
 assert.equal(results.length,1);
 assert.equal(results[0].sourceEvidence,4);
 assert.equal(scorePartner(p,0).method,'Rule-ranked','No model score is active until saved');
});
