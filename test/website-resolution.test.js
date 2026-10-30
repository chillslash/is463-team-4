import test from 'node:test';
import assert from 'node:assert/strict';
import {websiteResolutionPrompt,validateWebsiteResolutions,websiteIdentityMatches,verifyResolvedWebsite} from '../src/website-resolution.js';

const partner={id:'p1',name:'Ento Industries Pte Ltd',category:'organic waste recycler',source:'NEA Food Waste Recycling Facilities',location:'Singapore'};

test('website resolution prompt asks only for official sites and permits null',()=>{
 const prompt=websiteResolutionPrompt([partner]);
 assert.match(prompt,/official public website/i);
 assert.match(prompt,/Do not return search-result pages, social-media profiles, generic directories/i);
 assert.match(prompt,/Use null when the official site cannot be identified confidently/i);
 assert.match(prompt,/Ento Industries/);
});

test('website resolution rejects social/search pages and unsafe URLs',()=>{
 const rows=validateWebsiteResolutions({organisations:[
  {id:'p1',websiteUrl:'https://example.org/',reason:'Official site'},
  {id:'other',websiteUrl:'https://invented.example/',reason:'Wrong id'}
 ]},[partner]);
 assert.deepEqual(rows,[{id:'p1',websiteUrl:'https://example.org/',reason:'Official site'}]);
 assert.deepEqual(validateWebsiteResolutions({organisations:[{id:'p1',websiteUrl:'https://www.linkedin.com/company/ento',reason:'Profile'}]},[partner]),[]);
 assert.deepEqual(validateWebsiteResolutions({organisations:[{id:'p1',websiteUrl:null,reason:'Not sure'}]},[partner]),
  [{id:'p1',websiteUrl:null,reason:'Not sure'}]);
});

test('official-site verification requires the page to identify the organisation',async()=>{
 assert.equal(websiteIdentityMatches(partner,'<title>Ento Industries | Singapore</title>'),true);
 assert.equal(websiteIdentityMatches(partner,'<title>Unrelated Recycling Company</title>'),false);
 const verified=await verifyResolvedWebsite(partner,'https://ento.example/',{
  httpFetch:async()=>new Response('<html><title>Ento Industries</title><p>Food waste processing services.</p></html>',
   {status:200,headers:{'Content-Type':'text/html'}})
 });
 assert.equal(verified.ok,true);
 assert.equal(verified.websiteUrl,'https://ento.example/');
 const rejected=await verifyResolvedWebsite(partner,'https://wrong.example/',{
  httpFetch:async()=>new Response('<html><title>Different Company</title></html>',
   {status:200,headers:{'Content-Type':'text/html'}})
 });
 assert.equal(rejected.ok,false);
});
