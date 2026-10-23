import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scorePartner} from '../src/core.js';
import {rankingMetrics} from '../scripts/ranking-metrics.mjs';
import {generateLocalJSON} from '../src/ollama.js';
const fixture=JSON.parse(readFileSync(new URL('../scripts/benchmark-cases.json',import.meta.url)));
test('benchmark is source-balanced, disjoint and explicit',()=>{
 assert.equal(fixture.cases.length,36);
 assert.equal(new Set(fixture.cases.map(x=>x.id)).size,36);
 assert.equal(fixture.cases.filter(x=>x.split==='holdout').length,18);
 assert.deepEqual(Object.values(Object.groupBy(fixture.cases,x=>x.source)).map(x=>x.length),[6,6,6,6,6,6]);
});
test('ranking metric captures inverted relevance',()=>{
 const rows=[{id:'a',tier:3,score:60},{id:'b',tier:2,score:40},{id:'c',tier:1,score:10}];
 assert.equal(rankingMetrics(rows).ndcgAt10,1);
 assert.equal(rankingMetrics(rows).pairwiseAccuracy,1);
 assert.ok(rankingMetrics([{...rows[0],score:0},...rows.slice(1)]).ndcgAt10<1);
});
test('direct spent grounds evidence outranks adjacent food waste',()=>{
 const p={source:'NEA Food Waste Recycling Facilities',category:'organic waste recycler',directCoffeeEvidence:true};
 const weaker={...p,directCoffeeEvidence:false,materialEvidence:'Spent grains and okara'};
 assert.ok(scorePartner(p,0).score>scorePartner(weaker,0).score+30);
 assert.equal(scorePartner({...p,contactEmail:'hello@example.org'},0).score,scorePartner(p,0).score);
});
test('local models use loopback JSON endpoint and report actual tokens',async()=>{
 const orig=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,request)=>{calls.push({url,request:JSON.parse(request.body)});return {ok:true,json:async()=>({response:'{"assessments":[]}',prompt_eval_count:15,eval_count:7})};};
 try{
  for(const p of ['qwen','llama'])assert.equal((await generateLocalJSON(p,'test',{withUsage:true})).usage.inputTokens,15);
  assert.ok(calls.every(x=>x.url==='http://127.0.0.1:11434/api/generate'));
  assert.ok(calls.every(x=>x.request.format==='json'&&x.request.options.temperature===0));
 }finally{globalThis.fetch=orig;}
});
