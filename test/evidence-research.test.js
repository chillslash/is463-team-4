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

test('website research follows at most two relevant same-origin pages and cites their exact URLs',async()=>{
 const called=[];
 const page='<html><a href="/services/composting">Composting Services</a>'+
  '<a href="/research/mushrooms">Mushroom Research</a>'+
  '<a href="/about-us">About Us</a>'+
  '<a href="https://unrelated.example/composting">External research</a>'+
  '<a href="/brochure.pdf">Download composting PDF</a></html>';
 const httpFetch=async url=>{
  called.push(url);
  if(url==='https://org.example/')return new Response(page,{status:200,headers:{'Content-Type':'text/html'}});
  if(url.endsWith('/services/composting'))return new Response('<p>Our team processes garden cuttings and organic food waste into managed compost for horticultural growing operations.</p>',{status:200,headers:{'Content-Type':'text/html'}});
  if(url.endsWith('/research/mushrooms'))return new Response('<p>We cultivate mushrooms using prepared organic by-products under monitored indoor growing conditions.</p>',{status:200,headers:{'Content-Type':'text/html'}});
  throw Error('unexpected URL');
 };
 const result=await researchOrganisationEvidence({websiteUrl:'https://org.example/'},{httpFetch});
 assert.deepEqual(called,['https://org.example/','https://org.example/services/composting','https://org.example/research/mushrooms']);
 assert.equal(result.pagesRead,3);
 assert.equal(result.entries.length,2);
 assert.ok(result.entries.every(e=>called.includes(e.url)));
 assert.ok(result.entries.some(e=>e.url.endsWith('/services/composting')));
 assert.ok(result.entries.some(e=>e.url.endsWith('/research/mushrooms')));
});

test('website research does not follow redirects on secondary pages',async()=>{
 const called=[];
 const httpFetch=async url=>{
  called.push(url);
  if(url==='https://org.example/')return new Response('<a href="/services">Services</a><p>We cultivate mushrooms using carefully formulated organic by-products as the growing substrate.</p>',{status:200,headers:{'Content-Type':'text/html'}});
  return new Response('',{status:302,headers:{Location:'http://127.0.0.1/internal'}});
 };
 const result=await researchOrganisationEvidence({websiteUrl:'https://org.example/'},{httpFetch});
 assert.equal(called.length,2);
 assert.equal(result.pagesRead,1);
 assert.equal(result.entries.length,1);
 assert.equal(result.entries[0].url,'https://org.example/');
});
