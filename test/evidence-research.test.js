import test from 'node:test';
import assert from 'node:assert/strict';
import {extractMaterialEvidence,researchOrganisationEvidence} from '../src/evidence-research.js';

test('organisation website research extracts bounded, cited factual excerpts',async()=>{
 let url;
 const httpFetch=async(input,opts)=>{
  url=input;
  assert.equal(opts.redirect,'manual');
  return new Response('<html><script>ignore this script about coffee grounds</script>'+
   '<p>We cultivate mushrooms using prepared organic by-products in our indoor substrate production.</p>'+
   '<p>Our team also makes tables, chairs, and decor.</p></html>',{status:200,headers:{'Content-Type':'text/html'}});
 };
 const result=await researchOrganisationEvidence({websiteUrl:'https://example.org/production'},{httpFetch});
 assert.equal(url,'https://example.org/production');
 assert.ok(result.entries.length>=1);
 assert.match(result.entries[0].claim,/mushrooms/);
 assert.equal(result.entries[0].url,url);
 assert.doesNotMatch(result.entries.map(x=>x.claim).join(' '),/ignore this script/);
});
test('research refuses internal addresses and non-HTTPS sites',async()=>{
 let called=0;
 const httpFetch=async()=>{called++;throw Error('must not fetch');};
 for(const url of ['http://example.org','http://127.0.0.1','https://localhost/admin','https://example.local']){
  const r=await researchOrganisationEvidence({websiteUrl:url},{httpFetch});
  assert.equal(r.entries.length,0);
 }
 assert.equal(called,0);
});
test('unrelated page content and redirects cannot be treated as material evidence',async()=>{
 assert.deepEqual(extractMaterialEvidence('<p>Contact us. About our firm and community values.</p>'),[]);
 const html='<p>We specialise in hydroponic lettuce and grow using nutrient film technique rather than soil.</p>';
 const r=await researchOrganisationEvidence({websiteUrl:'https://example.org'},
  {httpFetch:async()=>new Response(html,{status:302,headers:{Location:'http://127.0.0.1/admin'}})});
 assert.deepEqual(r.entries,[]);
});
