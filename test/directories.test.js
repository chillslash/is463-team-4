import test from 'node:test';
import assert from 'node:assert/strict';
import {neaCandidates,liasCandidates} from '../src/directories.js';
import {scorePartner} from '../src/core.js';
test('NEA distinguishes recycling facilities from equipment suppliers',()=>{
 const html='<h3>Local food waste recycling facilities</h3><table><tr><td>A1 Environment Pte Ltd</td><td>Contact</td><td>Used coffee grounds</td></tr><tr><td>Other Recycler</td><td>Contact</td><td>Vegetable waste</td></tr></table><h3>Equipment suppliers</h3><table><tr><td>Machine Seller</td><td>Machine</td><td>Composters</td></tr></table>';
 const out=neaCandidates(html);
 assert.equal(out.length,2);assert.equal(out[0].directCoffeeEvidence,true);
 assert.equal(out[1].directCoffeeEvidence,false);assert.equal(out[0].sourceUrl.includes('nea.gov.sg'),true);
 const fit=scorePartner(out[0],42);assert.equal(fit.score<=100,true);assert.ok(fit.score>scorePartner(out[1],42).score);
});
test('LIAS members are listed as businesses, not confirmed grounds recipients',()=>{
 const html='<table id="tablepress-1"><tbody><tr><td>Corporate</td><td>Garden Grower Ltd</td><td>123 Road</td></tr></tbody></table>';
 const p=liasCandidates(html)[0];assert.equal(p.verified,false);assert.equal(p.directCoffeeEvidence,undefined);
 assert.match(p.evidenceEntries[0].claim,/LIAS lists/);
 assert.ok(scorePartner(p,42).score<scorePartner({...p,directCoffeeEvidence:true},42).score);
});
