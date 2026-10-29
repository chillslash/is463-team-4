import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {scorePartner,DEFAULT_RATING_WEIGHTS} from '../src/core.js';
import {evidencePrompt,validateEvidenceAssessments} from '../src/evidence-review.js';
import {generateJSON} from '../src/ai.js';

import {rankingMetrics} from './ranking-metrics.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// Match the server's local provider settings, without committing or printing credentials.
const envPath=join(root,'.env');
if(existsSync(envPath))loadEnvFile(envPath);
const option=(n,d)=>process.argv.find(x=>x.startsWith('--'+n+'='))?.slice(n.length+3)||d;
const models=option('models','rules,codex,qwen,llama').split(',');
const split=option('split','all');
const batchSize=Number(option('batch','6'));
const limit=Number(option('limit','36'));
if(models.some(x=>!['rules','codex','qwen','llama'].includes(x))||!['all','development','holdout'].includes(split)||batchSize<1||batchSize>12||!Number.isInteger(limit)||limit<1||limit>36)throw new Error('Invalid benchmark options');
const fixture=JSON.parse(await readFile(join(root,'scripts/benchmark-cases.json'),'utf8'));
const state=JSON.parse(await readFile(join(root,'data/state.json'),'utf8'));
const index=new Map(state.partners.map(p=>[p.id,p]));
const cases=fixture.cases.filter(x=>split==='all'||x.split===split).slice(0,limit).map(x=>{
 const p=index.get(x.id);if(!p)throw new Error('Missing saved prospect '+x.id+'; benchmark requires the reviewed discovery snapshot');
 return {...x,p:{...p,aiAssessment:null}};
});
const fingerprint=createHash('sha256').update(JSON.stringify(cases.map(x=>x.p))).digest('hex');
const folder=join(root,'data','benchmark-results');await mkdir(folder,{recursive:true});
// Report a candidate model's rubric score for comparison even when production
// intentionally uses deterministic scores instead of model scores.
function diagnosticModelScore(p,a){
 // Exactly the same scorer and assessment format as the actual application.
 return scorePartner({...p,aiEvidenceReview:{...a,assessedAt:new Date().toISOString()}},0,DEFAULT_RATING_WEIGHTS).score;
}
const all=[];
for(const model of models){
 const began=Date.now();
 const checkpoint=join(folder,'checkpoint-'+model+'-'+split+'-'+cases.length+'-'+fingerprint.slice(0,14)+'.json');
 let saved={};try{saved=JSON.parse(await readFile(checkpoint,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const scores=new Map(Object.entries(saved.scores||{})),errors=[],calls=saved.calls||[];
 const saveCheckpoint=async()=>{const tmp=checkpoint+'.tmp';await writeFile(tmp,JSON.stringify({inputSha256:fingerprint,model,scores:Object.fromEntries(scores),calls},null,2)); const {rename}=await import('node:fs/promises');await rename(tmp,checkpoint);};
 if(model==='rules'){
  for(const x of cases)scores.set(x.id,{score:scorePartner(x.p,0,DEFAULT_RATING_WEIGHTS).score,reason:'Source-only screening'});
 }else for(let i=0;i<cases.length;i+=batchSize){
  const group=cases.slice(i,i+batchSize).filter(x=>!scores.has(x.id));if(!group.length)continue;
  const prompt=evidencePrompt(group.map(x=>x.p));
  const t=Date.now();
  console.log(model+' batch '+(Math.floor(i/batchSize)+1)+'/'+Math.ceil(cases.length/batchSize)+' ('+group.length+' records)');
  try{
   const raw=await generateJSON(model,prompt,{withUsage:true,timeoutMs:300000});
   const assessments=validateEvidenceAssessments(raw.result,group.map(x=>x.p));
   for(const a of assessments){
    const x=group.find(x=>x.id===a.id);
    scores.set(a.id,{score:diagnosticModelScore(x.p,a),reason:a.reason,check:a.check});
   }
   calls.push({ids:group.map(x=>x.id),ms:Date.now()-t,usage:raw.usage});
   await saveCheckpoint();
  }catch(e){errors.push({ids:group.map(x=>x.id),error:e.message});}
 }
 const rows=cases.map(x=>({id:x.id,name:x.p.name,source:x.source,split:x.split,tier:x.tier,
  score:scores.get(x.id)?.score??null,reason:scores.get(x.id)?.reason??null,check:scores.get(x.id)?.check??null}));
 const metrics=rankingMetrics(rows),holdout=rankingMetrics(rows.filter(x=>x.split==='holdout'));
 all.push({model,elapsedMs:Date.now()-began,metrics,holdout,errors,calls,rows});
 console.log(model,JSON.stringify({valid:metrics.valid,holdoutNdcg10:holdout.ndcgAt10,holdoutPairwise:holdout.pairwiseAccuracy,errors:errors.length}));
}
const report={createdAt:new Date().toISOString(),fixture:fixture.version,scope:fixture.scope,inputSha256:fingerprint,
 models,split,batchSize,limit,caveat:'Source-evidence tiers are reviewer judgements, NOT verified acceptance, impact, carbon savings or sponsor preferences.',results:all};
const path=join(folder,'ranking-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log('Saved '+path);
