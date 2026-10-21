import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,enrichDemoProfiles,draftTemplate} from '../src/core.js';

test('demo relationships have safe sample contacts and a coherent simulated history',()=>{
 const state=initialState();
 assert.equal(state.demoProfilesVersion,2);
 for(const p of state.partners){
  assert.match(p.contactName,/\(demo\)/);
  assert.match(p.contactEmail,/@[a-z]+\.example$/);
  assert.ok(p.location.includes('(demo)'));
  assert.ok(p.nextAction);
  assert.equal(p.notes,'','Demo profile Notes should not repeat structured status or next action');
  assert.ok(state.partnerActivity.filter(x=>x.partnerId===p.id).length>=2);
  assert.ok(state.partnerActivity.filter(x=>x.partnerId===p.id).every(x=>x.text.includes('Demo')));
 }
});

test('legacy demo enrichment preserves entered contact details',()=>{
 const original={id:'p5',source:'Fictional Stitch scenario',name:'SporeWorks Mushroom Farm',status:'contacted',contactName:'Staff-chosen contact',contactEmail:'',location:'Singapore (demo)'};
 enrichDemoProfiles([original]);
 assert.equal(original.contactName,'Staff-chosen contact');
 assert.equal(original.contactEmail,'research@sporeworks.example');
 assert.equal(original.location,'Eastern Singapore (demo)');
 assert.ok(!original.notes,'Enrichment should not reintroduce canned Notes');
});

test('draft fallback sounds like connected email paragraphs, not a labelled outline',()=>{
 const p=initialState().partners.find(x=>x.id==='p4');
 const body=draftTemplate(p,12).body;
 assert.match(body,/Dear CitySoil Community Composting Team/);
 assert.match(body,/I came across CitySoil/);
 assert.match(body,/we haven't measured their moisture content/);
 assert.doesNotMatch(body,/^(?:Introduction|Why This Partner|Proposed Reuse|Call To Action|Closing):/mi);
 assert.ok(body.includes('\n\n'));
});

test('A1-style direct coffee evidence becomes specific and tentative email guidance',async()=>{
 const {draftTemplate,outreachSalutation,proposedReuseContext}=await import('../src/core.js');
 const p={name:'A1 Environment Pte Ltd',category:'organic waste recycler',source:'NEA Food Waste Recycling Facilities',directCoffeeEvidence:true,materialEvidence:'Used coffee grounds',contactName:'',contactEmail:''};
 const draft=draftTemplate(p,10);
 assert.equal(outreachSalutation(p),'Dear A1 Environment Pte Ltd Team,');
 assert.match(draft.body,/^Dear A1 Environment Pte Ltd Team,/);
 assert.match(draft.body,/NEA recycling-facility directory lists used coffee grounds/);
 assert.match(draft.body,/preparation, segregation or delivery requirements/);
 assert.match(draft.body,/sun-dry/);
 assert.match(proposedReuseContext(p),/intake process/);
 assert.doesNotMatch(draft.body,/^(?:Introduction|Proposed Reuse|Guidance):/m);
});
