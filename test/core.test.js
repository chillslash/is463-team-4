import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,numbers,scorePartner,osmCandidates,nparksCandidates,draftTemplate,rankPartners} from '../src/core.js';

test('midterm scenario recomputes without adding trial capacity',()=>{
 const s=initialState();assert.deepEqual(numbers(s.settings,s.partners,s.handovers),{forecastKg:182,confirmedKg:140,gapKg:42,transferredKg:0,evidencedKg:0,collectedKg:null,discardedKg:null,reuseRate:null});
 s.settings.cupsPerWeek=11000;assert.equal(numbers(s.settings,s.partners,s.handovers).gapKg,80);
});
test('unverified candidates do not inherit fees, acceptance or capacity',()=>{
 const c=osmCandidates([{type:'way',id:900,center:{lat:1.302,lon:103.851},tags:{name:'Example Garden',leisure:'garden'}}],initialState().settings);
 assert.equal(c.length,1);assert.equal(c[0].fee,undefined);assert.equal(c[0].capacityKg,null);assert.equal(c[0].confirmed,false);assert.equal(c[0].sourceUrl,'https://www.openstreetmap.org/way/900');
});
test('ranking prioritises relevant, verified partners',()=>{
 const a={category:'community garden',use:'Composting',verified:true,confirmed:true,capacityKg:30,distanceKm:3};
 assert.ok(scorePartner(a,42).score>scorePartner({...a,verified:false},42).score);
 assert.ok(rankPartners(initialState().partners,42).every(p=>p.status!=='regular'));
 assert.ok(initialState().partners.filter(p=>p.source==='Fictional Stitch scenario').every(p=>p.status!=='suggested'));
});
test('AI controls contextual score, while distance and confirmed facts remain deterministic',()=>{
 const p={category:'public park',distanceKm:10,verified:false,confirmed:false,capacityKg:null,contactEmail:'',aiAssessment:{
  rubricVersion:'ai-led-v1',reuseSuitability:30,sourceEvidence:20,operationalCompatibility:7,reason:'Source-backed activity',check:'Confirm use'
 }};
 const x=scorePartner(p,42);
 assert.deepEqual(x.parts,{suitability:30,evidence:20,proximity:7,operations:7});
 assert.equal(x.score,64);assert.equal(x.aiLed,true);
 assert.equal(scorePartner({...p,distanceKm:0,contactEmail:'info@example.com'},42).score,69);
 assert.equal(scorePartner({...p,verified:true,confirmed:true,capacityKg:25},42).score,67);
 assert.equal(scorePartner({...p,aiAssessment:{priority:'high'}},42).provisional,true);
});
test('draft has relevant caveats and does not promise acceptance',()=>{
 const draft=draftTemplate(initialState().partners[3],42);
 assert.match(draft.body,/moisture content has not been measured/);
 assert.match(draft.body,/handling or collection arrangements/);
 assert.match(draft.mode,/Template fallback/);
});

test('NParks places remain only potential sites with no acceptance assumed',()=>{
 const features={features:[{geometry:{type:'Point',coordinates:[103.84,1.31]},properties:{NAME:'Example Park',OBJECTID:1200}}]};
 const c=nparksCandidates(features,initialState().settings);
 assert.equal(c[0].id,'nparks-1200');assert.equal(c[0].capacityKg,null);assert.equal(c[0].verified,false);assert.equal(c[0].fee,undefined);
});
