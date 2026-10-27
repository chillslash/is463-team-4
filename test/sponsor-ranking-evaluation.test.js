import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBlindedReview, evaluateSponsorReview, diagnosePool} from '../scripts/sponsor-ranking-evaluation.mjs';

function sampleState() {
 const sources = ['NParks Community in Bloom','NParks Parks','MOE School Programmes','NEA Food Waste Recycling Facilities','LIAS Landscaping','SFA Crop Farms'];
 const partners = sources.flatMap((source, i) => Array.from({length:6}, (_,j)=>({
  id:'s'+i+'-'+j, name:'Candidate '+i+'-'+j, source, category:i===3?'organic waste recycler':i===5?'crop farm':'garden',
  status:'suggested', sourceUrl:'https://example.org/records/'+i+'/'+j,
  evidenceEntries:[{source,claim:'Published activity, no acceptance established',url:'https://example.org'}],
  materialEvidence:i===3&&j===0?'Used coffee grounds':'',
  directCoffeeEvidence:i===3&&j===0,
  distanceKm:j+1, verified:false,capacityKg:null,
  aiAssessment:{reason:'An AI opinion that must not be shown to the reviewer',reuseSuitability:40}
 })));
 return {partners,settings:{ratingWeights:{suitability:30,evidence:30,proximity:5,operations:35}}};
}

function populatedReview(state, count=16) {
 const template=buildBlindedReview(state,{limit:24});
 template.reviewedBy='CoffeeBot reviewer';
 template.reviewerRole='CoffeeBot';
 template.reviewedAt='2026-10-28';
 template.cases.slice(0,count).forEach((c,i)=>{
  c.review.outreachPriority=i%4;
  c.review.confidence='medium';
  c.review.rationale='Independent outreach prioritisation';
 });
 return template;
}

test('blinded review is source-balanced, reproducible, and does not expose model scores',()=>{
 const state=sampleState(),a=buildBlindedReview(state,{limit:24});
 const shuffled={...state,partners:[...state.partners].reverse()};
 const b=buildBlindedReview(shuffled,{limit:24});
 assert.equal(a.cases.length,24);
 assert.deepEqual(a.cases.map(c=>c.id),b.cases.map(c=>c.id));
 const sourceCounts=Object.values(a.cases.reduce((acc,x)=>(acc[x.source]=(acc[x.source]||0)+1,acc),{}));
 assert.deepEqual(sourceCounts.sort(),[4,4,4,4,4,4]);
 assert.ok(a.cases.some(x=>x.id==='s3-0'),'Explicit used-coffee-grounds evidence must appear');
 assert.ok(a.cases.every(x=>x.review.outreachPriority===null));
 assert.ok(a.cases.every(x=>!Object.hasOwn(x,'match')&&!Object.hasOwn(x,'aiAssessment')&&!Object.hasOwn(x,'score')&&!Object.hasOwn(x,'proposedUse')));
 assert.doesNotMatch(JSON.stringify(a),/An AI opinion that must not be shown/);
});

test('unknown ratings are not treated as zero relevance',()=>{
 const state=sampleState(),review=buildBlindedReview(state);
 const report=evaluateSponsorReview(state,review);
 assert.equal(report.status,'awaiting-sponsor-ratings');
 assert.equal(report.labelledCandidates,0);
 assert.equal(report.results.deterministic.coverage,0);
 assert.ok(report.warnings.some(w=>w.includes('No independent')));
 review.cases[0].review.outreachPriority=0;
 assert.equal(evaluateSponsorReview(state,review).labelledCandidates,1);
});

test('independent, attributed sponsor labels allow a comparable, complete evaluation',()=>{
 const state=sampleState(),review=populatedReview(state);
 const labels=review.cases.filter(c=>c.review.outreachPriority!==null);
 const predictions={models:{codex:Object.fromEntries(labels.map((c,i)=>[c.id,20+i])),qwen:Object.fromEntries(labels.map((c,i)=>[c.id,90-i]))}};
 const result=evaluateSponsorReview(state,review,predictions);
 assert.equal(result.status,'sponsor-comparison-ready');
 assert.equal(result.labelledCandidates,16);
 assert.equal(result.comparableCases,16);
 assert.equal(result.results.deterministic.coverage,1);
 assert.equal(result.results.codex.coverage,1);
 assert.equal(result.results.qwen.coverage,1);
 assert.equal(result.results.codex.comparable.count,16);
 assert.equal(result.results.qwen.comparable.count,16);
 assert.ok(result.results.codex.comparable.pairwiseAccuracy!==null);
});

test('incomplete AI coverage cannot establish a model winner',()=>{
 const state=sampleState(),review=populatedReview(state);
 const one=review.cases[0].id;
 const report=evaluateSponsorReview(state,review,{models:{codex:{[one]:60}}});
 assert.equal(report.status,'provisional');
 assert.equal(report.results.codex.covered,1);
 assert.equal(report.results.codex.comparable,null);
 assert.equal(report.comparableCases,1);
 assert.ok(report.warnings.some(w=>w.includes('incomplete coverage')));
});

test('rejects invalid labels, model scores, and source records that cannot be reconciled',()=>{
 const state=sampleState(),review=populatedReview(state);
 review.cases[0].review.outreachPriority='3';
 assert.throws(()=>evaluateSponsorReview(state,review),/Priority must be 0/);
 review.cases[0].review.outreachPriority=3;
 assert.throws(()=>evaluateSponsorReview(state,review,{models:{codex:{[review.cases[0].id]:Infinity}}}),/Invalid prediction/);
 assert.throws(()=>evaluateSponsorReview({partners:[],settings:state.settings},review),/missing source record/);
});

test('diagnostic distinguishes missing evidence from zero actual intake and identifies score ties',()=>{
 const state=sampleState(), d=diagnosePool(state);
 assert.equal(d.total,36);
 assert.equal(d.aiReviewed,36);
 assert.equal(d.unknownCapacity,36);
 assert.equal(d.documentedIntake,0);
 assert.equal(d.zeroOperations,36);
 assert.equal(Object.keys(d.bySource).length,6);
 assert.ok(d.mostFrequentScores.length>0);
 state.partners[0].capacityKg=10;
 state.partners[0].verified=true;
 const updated=diagnosePool(state);
 assert.equal(updated.unknownCapacity,35);
 assert.equal(updated.documentedIntake,1);
 assert.equal(updated.zeroOperations,35);
});
