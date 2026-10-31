import test from 'node:test';
import assert from 'node:assert/strict';
import {neaCandidates,liasCandidates} from '../src/directories.js';
import {publicWebUrl,researchPublicContact,findPublishedSingaporePostal,researchPublishedLocation} from '../src/contacts.js';
test('published NEA and LIAS emails retain source URLs',()=>{
 const nea='<h3>Local food waste recycling facilities</h3><table><tr><td><strong>A1 Environment Pte Ltd</strong></td><td>Email: yen@a1environment.com.sg</td><td>Used coffee grounds</td></tr></table>';
 const a=neaCandidates(nea)[0];assert.equal(a.contactEmail,'yen@a1environment.com.sg');assert.match(a.contactEvidence.url,/nea.gov.sg/);
 const li='<table id="tablepress-1"><tr><td>Corporate</td><td>Test Nursery</td><td>10 Road</td><td>1234</td><td><a href="mailto:info@test.com.sg">info@test.com.sg</a></td><td><a href="https://test.com.sg">Website</a></td></tr></table>';
 const b=liasCandidates(li)[0];assert.equal(b.contactEmail,'info@test.com.sg');assert.equal(b.websiteUrl,'https://test.com.sg/');assert.match(b.contactEvidence.url,/lias.org.sg/);
});
test('website lookup extracts only published email with page attribution',async()=>{
 const pages=new Map([['https://example.org/','<a href="/contact">Contact</a>'],['https://example.org/contact','<a href="mailto:hi@example.org">Email</a>']]);
 const httpFetch=async u=>new Response(pages.get(u)||'',{status:pages.has(u)?200:404,headers:{'Content-Type':'text/html'}});
 const found=await researchPublicContact({websiteUrl:'https://example.org/'},{httpFetch});
 assert.equal(found.email,'hi@example.org');assert.equal(found.sourceUrl,'https://example.org/contact');
 assert.equal(publicWebUrl('http://127.0.0.1/'),null);
 assert.equal(publicWebUrl('http://localhost/'),null);
});

test('unreachable websites report no pages read rather than claiming the site has no contact',async()=>{
 const httpFetch=async()=>new Response('Down',{status:503});
 const result=await researchPublicContact({websiteUrl:'https://example.org/'},{httpFetch});
 assert.equal(result.pagesRead,0);
 assert.equal(result.tried,1);
 assert.equal(result.email,'');
});

test('published-location lookup accepts one contextual Singapore postal and rejects ambiguity/noise',async()=>{
 const lookup={'339407':{lat:1.31,lon:103.86},'580111':{lat:1.36,lon:103.84}};
 assert.equal(findPublishedSingaporePostal('<style>.x{color:#339407}</style><p>Nothing here</p>',lookup),null);
 const found=findPublishedSingaporePostal('<p>5 Example Road, Singapore 339407</p>',lookup);
 assert.equal(found.postalCode,'339407');
 assert.match(found.excerpt,/Example Road/);
 assert.equal(findPublishedSingaporePostal('<p>Singapore 339407</p><p>Singapore 580111</p>',lookup),null);
 const pages=new Map([
  ['https://farm.example/','<a href="/contact">Contact</a><p>Fresh produce grown in Singapore.</p>'],
  ['https://farm.example/contact','<p>Visit us at 5 Example Road, Singapore 339407</p>']
 ]);
 const httpFetch=async u=>new Response(pages.get(u)||'',{status:pages.has(u)?200:404,headers:{'Content-Type':'text/html'}});
 const result=await researchPublishedLocation({websiteUrl:'https://farm.example/'},{httpFetch,postalLookup:lookup});
 assert.equal(result.postalCode,'339407');
 assert.equal(result.sourceUrl,'https://farm.example/contact');
 assert.equal(result.pagesRead,2);
});
