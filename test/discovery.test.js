import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,cibCandidates,scorePartner} from '../src/core.js';
import {discoverAll,uniqueCandidates} from '../src/discovery.js';

const ref=initialState().settings;
const geo=(name,props={},lon=103.85,lat=1.33)=>({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{...props, GARDEN_NAME:name}});
test('community garden records are unverified leads and rank ahead of generic parks',()=>{
 const results=cibCandidates({features:[geo('Example CIB Group',{GARDENID:12})]},ref);
 assert.equal(results.length,1);
 const p=results[0]; assert.equal(p.id,'cib-12');assert.equal(p.capacityKg,null);
 assert.equal(p.verified,false);assert.equal(p.fee,undefined);assert.equal(p.confirmed,false);
 assert.ok(scorePartner(p,42).score>scorePartner({...p,category:'public park'},42).score);
});
test('independent data sources merge even when OpenStreetMap is unavailable',async()=>{
 const get=async (url)=>{
  if(url.includes('poll-download')){const id=url.split('/')[7];return {ok:true,json:async()=>({code:0,data:{url:'https://s3.ap-southeast-1.amazonaws.com/'+id}})};}
  if(url.includes('amazonaws.com')){const cib=url.includes('d_f91');const item=cib?{features:[geo('Demo CIB Garden',{GARDENID:5})]}:{features:[{geometry:{type:'Point',coordinates:[103.86,1.35]},properties:{NAME:'Demo Park',OBJECTID:6}}]};return {ok:true,json:async()=>item,text:async()=>JSON.stringify(item)};}
  return {ok:false,status:502};
 };
 const r=await discoverAll(ref,{httpFetch:get,includeDirectories:false});
 assert.equal(r.sources.length,2);
 assert.equal(r.candidates.length,2);
 assert.equal(r.warnings.length,2);
 assert.ok(r.candidates.some(p=>p.source.includes('Community in Bloom')));
 assert.ok(r.candidates.every(p=>!p.confirmed));
});
test('duplicate names near the same coordinates are de-duplicated',()=>{
 const same={name:'Example Garden',lat:1.33,lon:103.85,id:'a'};
 assert.equal(uniqueCandidates([same,{...same,id:'b'},{...same,id:'c',lat:1.38}]).length,2);
});