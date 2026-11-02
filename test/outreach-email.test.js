import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {outreachEmailBody,outreachReuseIdea,emailWordCount,cleanOutreachText,isConciseFirstEmail} from '../src/outreach-email.js';
const partners=JSON.parse(readFileSync('data/state.json','utf8')).partners;
const sample=name=>partners.find(p=>p.name===name);
test('A1 email selects one succinct bespoke reuse paragraph, not full annex',()=>{
 const p=sample('A1 Environment Pte Ltd');assert.ok(p);
 const idea=outreachReuseIdea(p),body=outreachEmailBody(p,'Dear A1 Team,');
 assert.match(idea,/Nanyang Polytechnic/);
 assert.match(idea,/bio-composite panels/);
 assert.match(idea,/farms and community gardens/);
 assert.equal((body.match(/Nanyang Polytechnic/g)||[]).length,1);
 assert.ok(emailWordCount(body)<=125);
 assert.ok(isConciseFirstEmail(body,idea));
 assert.doesNotMatch(body,/Potential Reuse Pathway|What CoffeeBot Can Provide|Before Starting a Trial|Annex|Appendix|https?:\/\//i);
});
test('Arista and GreenSpade reuse paragraphs differ materially and stay short',()=>{
 const arista=sample('Arista Farming Pte Ltd'),green=sample('GreenSpade Pte Ltd');
 assert.match(outreachReuseIdea(arista),/cocopeat/);
 assert.match(outreachReuseIdea(green),/potting mixes/);
 for(const p of [arista,green]){
  const body=outreachEmailBody(p,'Dear Team,');
  assert.ok(emailWordCount(body)<=145);
  assert.ok(isConciseFirstEmail(body,outreachReuseIdea(p)));
  assert.doesNotMatch(body,/verified reuse|carbon savings|guaranteed suitable/i);
 }
});
test('outbound copy removes mojibake and encoded spaces without changing meaning',()=>{
 const damaged='A1'+String.fromCharCode(0xe2,0x20ac,0x2122)+'s recovery routes'+String.fromCharCode(0xe2,0x20ac,0x201d)+'pilot.&#x20;';
 const clean=cleanOutreachText(damaged);
 assert.equal(clean,"A1's recovery routes - pilot.");
 assert.doesNotMatch(clean,/&#x20;|Ã¢/i);
});
test('first-contact validation rejects long or generic AI output',()=>{
 const p=sample('A1 Environment Pte Ltd'),idea=outreachReuseIdea(p);
 assert.equal(isConciseFirstEmail('Hello\\n\\nGeneric reply',idea),false);
 assert.equal(isConciseFirstEmail(outreachEmailBody(p,'Dear Team,')+' '+('extra '.repeat(190)),idea),false);
});
