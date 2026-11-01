import test from 'node:test';
import assert from 'node:assert/strict';
import {generateReuseGuide,formatReuseGuide,GUIDE_SECTIONS,guideKind} from '../src/reuse-guide.js';
import {EVIDENCE_RUBRIC_VERSION,evidenceFingerprint} from '../src/evidence-review.js';

const base=(extra={})=>({id:'sample',name:'Example Partner',category:'other',source:'Staff-entered lead',...extra});
const required=g=>{
 assert.deepEqual(Object.keys(g.sections),GUIDE_SECTIONS.map(([key])=>key));
 assert.equal(Object.hasOwn(g,'note'),false,'No extra meta-disclaimer field in generated guide');
 assert.doesNotMatch(formatReuseGuide(g),/Check published source|Source to verify|Staff review required|Public-source descriptions are research leads/i);
 assert.match(g.sections.pathway,/grounds|coffee grounds/i);
 assert.match(g.sections.before,/quantity/i);
 assert.ok(g.sections.before.split('\n').length<=4);
 assert.doesNotMatch(formatReuseGuide(g),/COâ‚‚e|carbon savings|guaranteed suitable|verified reuse/i);
};

test('community garden guide describes only a possible managed process and asks for trial logistics',()=>{
 const g=generateReuseGuide(base({name:'CitySoil',category:'community garden'}));
 required(g);assert.match(g.sections.pathway,/managed composting/i);
 assert.match(g.sections.before,/schedule/i);assert.match(g.sections.before,/quantity/i);
 assert.match(g.sections.before,/collection or delivery/i);
});
test('school guide names education and authorisation rather than assuming garden use',()=>{
 const g=generateReuseGuide(base({name:'Example School',category:'school programme'}));
 required(g);assert.equal(guideKind({category:'school garden'}),'education');
 assert.match(g.sections.pathway,/sustainability or STEM/i);assert.match(g.sections.before,/organisational approvals/i);
 assert.doesNotMatch(g.sections.pathway,/existing garden|accepts grounds/i);
});
test('SFA farm guide is cautious and never presumes coffee grounds are accepted',()=>{
 const g=generateReuseGuide(base({name:'Licensed Farm',category:'crop farm',source:'SFA Licensed Crop Farms'}));
 required(g);assert.match(g.sections.pathway,/existing composting or growing-media preparation process/i);
 assert.match(g.sections.before,/composting or prepare growing media/i);
 assert.doesNotMatch(g.sections.pathway,/will improve|guaranteed/i);
});
test('recycler guide flags material eligibility, fees and downstream outcomes',()=>{
 const g=generateReuseGuide(base({name:'Example Recycler',category:'organic waste recycler',
  directCoffeeEvidence:true,evidenceEntries:[{source:'NEA',url:'https://www.nea.gov.sg/some-directory',claim:'NEA lists Example Recycler as a facility; accepted materials: Used coffee grounds'}]}));
 required(g);assert.match(g.sections.before,/fees/i);assert.match(g.sections.before,/current permitted intake/i);
 assert.match(g.sections.pathway,/trial batch into that established recycling stream/i);
 assert.equal(g.source.url,'https://www.nea.gov.sg/some-directory');
});
test('unknown information remains to confirm; no quantities are invented',()=>{
 const g=generateReuseGuide(base());
 required(g);assert.match(g.sections.pathway,/specific use would first need to be identified/i);
 assert.match(g.sections.before,/What initial quantity, schedule/i);
 assert.doesNotMatch(formatReuseGuide(g),/\d+\s*kg\/week/);
 assert.match(g.sections.supply,/Moisture content has not been measured/);
 assert.doesNotMatch(formatReuseGuide(g),/clean containers/i);
});
test('internal intake figures and fictional demo values are not promised to prospective partners',()=>{
 const p=base({transportArrangement:'partner-collects',capacityKg:3,frequency:'monthly',status:'interested'});
 const g=generateReuseGuide(p);
 assert.doesNotMatch(formatReuseGuide(g),/3 kg|monthly|partner collects; reconfirm/i);
 const demo=generateReuseGuide(base({source:'Fictional Stitch scenario',capacityKg:5,frequency:'weekly (demo)'}));
 assert.doesNotMatch(formatReuseGuide(demo),/5 kg|weekly \(demo\)/i);
 assert.match(g.sections.before,/collection or delivery/i);
});

const reviewed=(p,ids=[0])=>{
 p.aiEvidenceReview={
  rubricVersion:EVIDENCE_RUBRIC_VERSION,factsHash:evidenceFingerprint(p),
  reuseSuitability:20,sourceEvidence:15,potentialIntake:10,
  reason:'Potential material compatibility must be assessed',intakeReason:'Commercial activity is not actual intake',
  evidenceIds:ids,intakeEvidenceIds:ids,check:'Could grounds fit the process?',
  assessedAt:new Date().toISOString()
 };
 return p;
};
test('cited Arista-type compost and cocopeat evidence changes pathway and question',()=>{
 const p=reviewed(base({name:'Arista-type farm',category:'crop farm',websiteUrl:'https://example-farm.sg/',
  evidenceEntries:[{source:'Organisation website excerpt (unverified)',url:'https://example-farm.sg/about-us',
   claim:'After each harvest, the cocopeat is not discarded but instead combined with organic compost to create a nutrient-rich soil medium.',
   checkedAt:new Date().toISOString()}]}));
 const g=generateReuseGuide(p);
 assert.equal(g.evidenceBasis,'website');
 assert.match(g.sections.pathway,/combining compost with reused cocopeat after harvest/)
 assert.match(g.sections.pathway,/evaluate grounds as an input to the existing compost stage/);
 assert.match(g.sections.before,/cocopeat-and-compost process/);
 assert.doesNotMatch(formatReuseGuide(g),/https:\/\/example-farm.sg\/about-us/);
 assert.equal(g.source.url,'https://example-farm.sg/about-us','Source retained internally for provenance');
 assert.doesNotMatch(g.sections.pathway,/already uses coffee grounds/i);
});
test('GreenSpade-type product listing leads to manufacturing question, not an invented composting operation',()=>{
 const p=reviewed(base({name:'Example soil supplier',category:'landscaping business',websiteUrl:'https://green-example.sg/',
  evidenceEntries:[{source:'Organisation website excerpt (unverified)',url:'https://green-example.sg/collections/soil',
   claim:'Discover our range of potting soil, speciality potting mixes and premium compost for healthier plant growth.',
   checkedAt:new Date().toISOString()}]}));
 const g=generateReuseGuide(p);
 assert.equal(g.evidenceBasis,'website');
 assert.match(g.sections.pathway,/potting mixes and compost products/)
 assert.match(g.sections.pathway,/If you prepare any compost in-house/);
 assert.match(g.sections.before,/processed in-house or sold as finished products/);
 assert.doesNotMatch(g.sections.pathway,/accepts spent grounds|manufactures compost/i);
});
test('stale, uncited, wrong-site and generic website claims do not personalise guidance',()=>{
 const p=base({name:'Example Farm',category:'crop farm',websiteUrl:'https://real-farm.sg/',
  evidenceEntries:[{source:'Organisation website excerpt (unverified)',url:'https://other-farm.sg/about',
   claim:'After each harvest cocopeat is combined with organic compost in our growing medium.',
   checkedAt:new Date().toISOString()}]});
 let g=generateReuseGuide(reviewed(p));
 assert.equal(g.evidenceBasis,'category');
 p.evidenceEntries[0].url='https://real-farm.sg/about';
 p.aiEvidenceReview.factsHash=evidenceFingerprint(p);p.aiEvidenceReview.evidenceIds=[];p.aiEvidenceReview.intakeEvidenceIds=[];
 g=generateReuseGuide(p);assert.equal(g.evidenceBasis,'category');
 p.aiEvidenceReview.evidenceIds=[0];p.aiEvidenceReview.intakeEvidenceIds=[0];
 p.aiEvidenceReview.assessedAt='2020-01-01T00:00:00.000Z';
 g=generateReuseGuide(p);assert.equal(g.evidenceBasis,'category');
});
test('MOE documented programme personalises school cautiously even without AI',()=>{
 const p=base({name:'Ang Mo Kio Secondary',category:'school programme',
  evidenceEntries:[{source:'MOE School Distinctive Programmes',url:'https://data.gov.sg/datasets/programmes',
   claim:'MOE lists Environment Sustainability through STEM for Ang Mo Kio Secondary'}]});
 const g=generateReuseGuide(p);
 assert.equal(g.evidenceBasis,'programme');
 assert.match(g.sections.pathway,/Environment Sustainability through STEM/);
 assert.match(g.sections.before,/authorised staff lead/i);
 assert.doesNotMatch(g.sections.pathway,/has a garden|accepts coffee grounds/i);
});
test('AI reason and pathway cannot be copied as unsupported facts',()=>{
 const p=reviewed(base({name:'Example farm',category:'crop farm',websiteUrl:'https://farm.sg',
  evidenceEntries:[{source:'Organisation website excerpt (unverified)',url:'https://farm.sg/about',
   claim:'After each harvest, the cocopeat is combined with organic compost to create growing substrate for cultivation.',
   checkedAt:new Date().toISOString()}]}));
 p.aiEvidenceReview.reason='This farm definitely accepts unlimited coffee grounds and saves 99 tonnes of carbon';
 p.aiEvidenceReview.pathway='Directly add grounds to soil without treatment';
 const g=generateReuseGuide(p);
 assert.equal(g.evidenceBasis,'website');
 assert.doesNotMatch(formatReuseGuide(g),/unlimited|99 tonnes|without treatment/i);
});

test('NEA adjacent material listing stays distinct from explicit coffee-ground acceptance',()=>{
 const p=reviewed(base({name:'Example recycling facility',category:'organic waste recycler',source:'NEA Food Waste Recycling Facilities',
  evidenceEntries:[{source:'NEA Food Waste Recycling Facilities',url:'https://www.nea.gov.sg/recycling',
   claim:'NEA lists Example recycling facility as a recycling facility; accepted materials: Mixed food waste, manufacturing and factory by-products',
   checkedAt:new Date().toISOString()}]}));
 const g=generateReuseGuide(p);
 assert.equal(g.evidenceBasis,'directory-material');
 assert.match(g.sections.pathway,/mixed food waste/);
 assert.match(g.sections.pathway,/listing does not confirm grounds acceptance/);
 assert.match(g.sections.before,/sun-dried grounds/i);
 assert.equal(g.source.url,'https://www.nea.gov.sg/recycling');
});
test('cited horticultural equipment site does not turn a farm label into proof of soil reuse',()=>{
 const p=reviewed(base({name:'Example farming technology',category:'crop farm',websiteUrl:'https://farmtech.sg/',
  evidenceEntries:[{source:'Organisation website excerpt (unverified)',url:'https://farmtech.sg/systems',
   claim:'Multi-Method Cultivation Support includes NFT, DFT, aeroponics, fogponics, and substrate-based cultivation systems.',
   checkedAt:new Date().toISOString()}]}));
 const g=generateReuseGuide(p);
 assert.equal(g.evidenceBasis,'website');
 assert.match(g.sections.pathway,/horticultural technology and substrate-based systems/i);
 assert.match(g.sections.before,/rather than only supplying equipment/i);
 assert.doesNotMatch(g.sections.pathway,/accepts coffee grounds/i);
});

test('reuse guide is written for recipients and highlights a concrete possible use',()=>{
 const farm=generateReuseGuide(base({category:'crop farm'}));
 const school=generateReuseGuide(base({category:'school programme'}));
 const recycler=generateReuseGuide(base({category:'organic waste recycler'}));
 assert.match(farm.sections.pathway,/trial could assess whether spent grounds/i);
 assert.match(school.sections.pathway,/supervised sustainability or STEM/i);
 assert.match(recycler.sections.pathway,/process CoffeeBot spent coffee grounds/i);
 for(const g of [farm,school,recycler]){
  assert.match(g.sections.learn,/we would value your feedback/i);
  assert.doesNotMatch(g.sections.before,/Recorded|Staff-entered|internal/i);
 }
});
