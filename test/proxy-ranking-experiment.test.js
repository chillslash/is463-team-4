import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {initialState} from '../src/core.js';

const exec=promisify(execFile);
test('proxy benchmark runs without an AI provider and cannot invent AI metrics',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'coffee-proxy-test-'));
 try{
  const state=initialState();
  for(let i=0;i<12;i++)state.partners.push({id:'proxy-'+i,name:'Candidate '+i,status:'suggested',
   source:i<6?'Source A':'Source B',category:i%2?'garden':'farm',
   distanceKm:i,verified:false,capacityKg:null,
   evidenceEntries:[{source:'Official source',url:'https://example.org/prospect',
    claim:'Official or mapped source lists Candidate '+i}]});
  const review={version:'coffee-sponsor-review-v1',reviewerRole:'Independent proxy',
   reviewedBy:'Desk reviewer',reviewedAt:'2026-10-28',
   cases:Array.from({length:12},(_,i)=>({id:'proxy-'+i,name:'Candidate '+i,
    source:i<6?'Source A':'Source B',review:{outreachPriority:i%3}}))};
  const st=join(dir,'state.json'),rv=join(dir,'review.json'),out=join(dir,'report.json');
  await Promise.all([writeFile(st,JSON.stringify(state)),writeFile(rv,JSON.stringify(review))]);
  await exec(process.execPath,[resolve('scripts/proxy-ranking-experiment.mjs'),
   '--state='+st,'--review='+rv,'--out='+out],{cwd:process.cwd(),timeout:12000});
  const result=JSON.parse(await readFile(out,'utf8'));
  assert.equal(result.caseCount,12);
  assert.equal(result.evaluation.results.deterministic.coverage,1);
  assert.equal(result.evaluation.status,'provisional');
  assert.deepEqual(result.predictions.models,{});
  assert.equal(Object.keys(result.runMetrics).length,0,'Never invent AI calls or token totals');
 }finally{await rm(dir,{recursive:true,force:true});}
});
