import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,numbers,scorePartner,nparksCandidates,draftTemplate,rankPartners,validRatingWeights,DEFAULT_RATING_WEIGHTS,SPONSOR_MONTHLY_CUPS,migrateSponsorAssumptions} from '../src/core.js';

test('CoffeeBot sponsor assumptions apply the coffee share to total beverages',()=>{
 const s=initialState();
 assert.deepEqual(SPONSOR_MONTHLY_CUPS,{min:3600,max:4200});
 assert.equal(s.settings.cupsPerWeek,900); // midpoint of sponsor's 3,600-4,200 monthly cups
 assert.deepEqual(numbers(s.settings,s.partners,s.handovers),{forecastKg:8.1,confirmedKg:6.5,gapKg:1.6,transferredKg:0});
 s.settings.cupsPerWeek=11000;
 assert.equal(numbers(s.settings,s.partners,s.handovers).forecastKg,99);
 assert.equal(numbers(s.settings,s.partners,s.handovers).gapKg,92.5);
 s.settings.coffeeSharePercent=50;
 assert.equal(numbers(s.settings,s.partners,s.handovers).forecastKg,82.5);
});
test('Regular agreed weekly intake drives forecast demand without a hidden confirmation flag',()=>{
 const s=initialState();
 const trial=s.partners.find(p=>p.id==='p4');
 trial.capacityKg=20;
 assert.equal(numbers(s.settings,s.partners,s.handovers).confirmedKg,6.5,'Trial does not contribute');
 trial.status='regular';trial.confirmed=false;trial.verified=false;
 assert.equal(numbers(s.settings,s.partners,s.handovers).confirmedKg,26.5);
 assert.equal(numbers(s.settings,s.partners,s.handovers).gapKg,0);
 trial.status='closed';
 assert.equal(numbers(s.settings,s.partners,s.handovers).confirmedKg,6.5,'Closed removes demand');
});
test('unverified candidates do not inherit fees, acceptance or capacity',()=>{
 const state=initialState(); assert.ok(state.partners.every(p=>p.fee===undefined)); assert.ok(state.partners.filter(p=>p.status!=='regular').every(p=>!p.confirmed));
});
test('pre-contact ranking ignores verified intake fields until outreach',()=>{
 const a={category:'community garden',use:'Composting',verified:true,confirmed:true,capacityKg:30,distanceKm:3};
 assert.equal(scorePartner(a,42).score,scorePartner({...a,verified:false,confirmed:false,capacityKg:null},42).score);
 assert.ok(rankPartners(initialState().partners,42).every(p=>p.status!=='regular'));
 assert.ok(initialState().partners.filter(p=>p.source==='Fictional Stitch scenario').every(p=>p.status!=='suggested'));
});
test('legacy advisory AI does not alter the evidence-grounded outreach priority',()=>{
 const p={category:'public park',distanceKm:10,verified:false,confirmed:false,capacityKg:null,contactEmail:'',aiAssessment:{
  rubricVersion:'ai-led-v1',reuseSuitability:30,sourceEvidence:20,operationalCompatibility:7,reason:'Source-backed activity',check:'Confirm use'
 }};
 const x=scorePartner(p,42);
 assert.deepEqual(x.parts,{suitability:10,evidence:4,proximity:11});
 assert.equal(x.score,25);assert.equal(x.aiLed,false);
 assert.equal(scorePartner({...p,aiAssessment:null},42).score,25);
 assert.equal(scorePartner({...p,distanceKm:0,contactEmail:'info@example.com'},42).score,29);
 assert.equal(scorePartner({...p,verified:true,confirmed:true,capacityKg:25},42).score,25);
 assert.equal(scorePartner({...p,aiAssessment:{priority:'high'}},42).provisional,true);
});
test('draft has relevant caveats and does not promise acceptance',()=>{
 const draft=draftTemplate(initialState().partners[3],42);
 assert.match(draft.body,/haven't measured their moisture content/);
 assert.match(draft.body,/collection arrangements/);
 assert.match(draft.body,/small initial collection/);
 assert.doesNotMatch(draft.body,/\btrial\b|\b10 kg\b/i);
 assert.match(draft.mode,/Template fallback/);
});

test('NParks places remain only potential sites with no acceptance assumed',()=>{
 const features={features:[{geometry:{type:'Point',coordinates:[103.84,1.31]},properties:{NAME:'Example Park',OBJECTID:1200}}]};
 const c=nparksCandidates(features,initialState().settings);
 assert.equal(c[0].id,'nparks-1200');assert.equal(c[0].capacityKg,null);assert.equal(c[0].verified,false);assert.equal(c[0].fee,undefined);
});

test('configurable weights validate totals and deterministically reorder partners',()=>{
 const a={name:'A',status:'suggested',category:'composting',source:'NEA',directCoffeeEvidence:true,distanceKm:30};
 const b={name:'B',status:'suggested',category:'garden',source:'LIAS',distanceKm:0};
 assert.equal(rankPartners([a,b],30)[0].name,'A');
 const w={suitability:0,evidence:0,proximity:100};
 assert.equal(validRatingWeights(w),true);
 const ranked=rankPartners([a,b],30,w);
 assert.equal(ranked[0].name,'B');
 assert.equal(ranked[0].match.score,100);
 assert.deepEqual(ranked[0].match.parts,{suitability:0,evidence:0,proximity:100});
 assert.deepEqual(DEFAULT_RATING_WEIGHTS,{suitability:55,evidence:30,proximity:15});
 assert.equal(validRatingWeights({suitability:40,evidence:35,proximity:25}),true);
 assert.equal(validRatingWeights({suitability:40,evidence:35,proximity:10,operations:15}),false);
 assert.equal(validRatingWeights({...DEFAULT_RATING_WEIGHTS,extra:0}),false);
 const ai={name:'AI',status:'suggested',category:'garden',source:'NParks',distanceKm:5,
  aiAssessment:{rubricVersion:'ai-led-v1',reuseSuitability:30,sourceEvidence:10,operationalCompatibility:2,reason:'Original evidence',check:'Verify capacity'}};
 const before=scorePartner(ai,0);
 const after=scorePartner(ai,0,{suitability:10,evidence:70,proximity:20});
 assert.notEqual(before.score,after.score);
 assert.match(after.reasons[0],/Preliminary screening/);
 assert.equal(ai.aiAssessment.sourceEvidence,10);
 assert.equal(Object.values(after.parts).reduce((sum,v)=>sum+v,0),after.score);
});
test('unknown intake and logistics are deliberately outside pre-contact outreach priority',()=>{
 const base={status:'suggested',category:'urban farm',source:'SFA crop-farm licence',distanceKm:7,capacityKg:null};
 const unknown=scorePartner(base,5);
 assert.equal(scorePartner({...base,capacityKg:10},5).score,unknown.score);
 assert.equal(scorePartner({...base,capacityKg:10,verified:true},5).score,unknown.score);
 assert.equal(scorePartner({...base,frequency:'weekly',transportArrangement:'partner-collects',verified:true},5).score,unknown.score);
 assert.match(unknown.reasons.join(' '),/Confirm intake quantity, frequency and collection arrangements during outreach/);
 const research=scorePartner({...base,category:'research',agreedUse:'Materials experiment',capacityKg:2,verified:true,frequency:'one-off'},5);
 assert.ok(research.score>0,'One-off research is still eligible');
 assert.equal(scorePartner({...base,contactEmail:'info@example.org'},5).score,unknown.score,'Contactability is a separate sort consideration');
});
test('sponsor migration changes only untouched fictional values, not edited forecasts or real partners',()=>{
 const legacy=initialState();
 legacy.settings={cupsPerWeek:9100,gramsPerCup:20,ratingWeights:{suitability:40,evidence:35,proximity:10,operations:15}};
 legacy.partners.push({id:'real',source:'Staff-entered lead',capacityKg:70,status:'regular'});
 migrateSponsorAssumptions(legacy);
 assert.equal(legacy.settings.cupsPerWeek,900);
 assert.equal(legacy.settings.gramsPerCup,15);
 assert.equal(legacy.settings.coffeeSharePercent,60);
 assert.deepEqual(legacy.settings.ratingWeights,DEFAULT_RATING_WEIGHTS);
 assert.equal(legacy.partners.find(p=>p.id==='p1').capacityKg,3);
 assert.equal(legacy.partners.find(p=>p.id==='real').capacityKg,70);
 const edited=initialState();edited.settings={cupsPerWeek:1500,gramsPerCup:18,ratingWeights:{suitability:35,evidence:25,proximity:15,operations:25}};
 migrateSponsorAssumptions(edited);
 assert.equal(edited.settings.cupsPerWeek,1500);
 assert.equal(edited.settings.gramsPerCup,18);
 assert.equal(edited.partners.find(p=>p.id==='p1').capacityKg,3);
 assert.deepEqual(edited.settings.ratingWeights,DEFAULT_RATING_WEIGHTS);
});
