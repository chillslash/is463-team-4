import test from 'node:test';
import assert from 'node:assert/strict';
import {generateReuseGuide,formatReuseGuide,GUIDE_SECTIONS,guideKind} from '../src/reuse-guide.js';

const base=(extra={})=>({id:'sample',name:'Example Partner',category:'other',source:'Staff-entered lead',...extra});
const required=g=>{
 assert.deepEqual(Object.keys(g.sections),GUIDE_SECTIONS.map(([key])=>key));
 assert.match(formatReuseGuide(g),/To confirm/i);
 assert.doesNotMatch(formatReuseGuide(g),/COâ‚‚e|carbon savings|guaranteed suitable|verified reuse/i);
};

test('community garden guide describes only a possible managed process and asks for trial logistics',()=>{
 const g=generateReuseGuide(base({name:'CitySoil',category:'community garden'}));
 required(g);assert.match(g.sections.pathway,/managed composting or horticultural/i);
 assert.match(g.sections.before,/frequency/i);assert.match(g.sections.before,/quantity/i);
 assert.match(g.sections.before,/collection from HQ/i);
});
test('school guide names education and authorisation rather than assuming garden use',()=>{
 const g=generateReuseGuide(base({name:'Example School',category:'school programme'}));
 required(g);assert.equal(guideKind({category:'school garden'}),'education');
 assert.match(g.sections.pathway,/educational/i);assert.match(g.sections.before,/institutional approvals/i);
 assert.doesNotMatch(g.sections.pathway,/existing garden|accepts grounds/i);
});
test('SFA farm guide is cautious and never presumes coffee grounds are accepted',()=>{
 const g=generateReuseGuide(base({name:'Licensed Farm',category:'crop farm',source:'SFA Licensed Crop Farms'}));
 required(g);assert.match(g.sections.pathway,/A farm licence does not establish/i);
 assert.match(g.sections.before,/growing method/i);
 assert.doesNotMatch(g.sections.pathway,/will improve|guaranteed/i);
});
test('recycler guide flags material eligibility, fees and downstream outcomes',()=>{
 const g=generateReuseGuide(base({name:'Example Recycler',category:'organic waste recycler',
  directCoffeeEvidence:true,evidenceEntries:[{source:'NEA',url:'https://www.nea.gov.sg/some-directory',claim:'NEA lists Used coffee grounds among accepted materials'}]}));
 required(g);assert.match(g.sections.before,/fees/i);assert.match(g.sections.before,/explicitly accepted/i);
 assert.match(g.sections.pathway,/confirm the latest intake conditions/i);
 assert.equal(g.source.url,'https://www.nea.gov.sg/some-directory');
});
test('unknown information remains to confirm; no quantities are invented',()=>{
 const g=generateReuseGuide(base());
 required(g);assert.match(g.sections.pathway,/not establish a specific suitable pathway/i);
 assert.match(g.sections.before,/To confirm: realistic quantity/i);
 assert.doesNotMatch(formatReuseGuide(g),/\d+\s*kg\/week/);
 assert.match(g.sections.supply,/Moisture content is not measured/);
 assert.doesNotMatch(formatReuseGuide(g),/clean containers/i);
});
test('recorded collection arrangement and capacity are distinguished from promises',()=>{
 const collects=generateReuseGuide(base({transportArrangement:'partner-collects',capacityKg:3,frequency:'monthly',status:'interested'}));
 assert.match(collects.sections.before,/partner collects; reconfirm/i);
 assert.match(collects.sections.before,/Recorded proposed intake: 3 kg\/week; reconfirm/i);
 assert.match(collects.sections.before,/Recorded frequency \(reconfirm\): monthly/i);
 const delivers=generateReuseGuide(base({transportArrangement:'coffeebot-delivers'}));
 assert.match(delivers.sections.before,/CoffeeBot delivers; reconfirm route feasibility/i);
 const demo=generateReuseGuide(base({source:'Fictional Stitch scenario',capacityKg:5,frequency:'weekly \(demo\)'}));
 assert.match(demo.sections.before,/Illustrative demo intake/i);
 assert.doesNotMatch(demo.sections.before,/Recorded frequency/i);
});
