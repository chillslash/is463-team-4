import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {scorePartner,DEFAULT_RATING_WEIGHTS,AI_RUBRIC_VERSION} from '../src/core.js';
import {generateJSON,validateAssessment} from '../src/ai.js';
import {sourceFacts,assessmentPrompt} from '../server.js';
import {rankingMetrics} from './ranking-metrics.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const option=(n,d)=>process.argv.find(x=>x.startsWith('--'+n+'='))?.slice(n.length+3)||d;
const models=option('models','rules,codex,qwen,llama').split(',');
const split=option('split','all');
const batchSize=Number(option('batch','6'));
if(models.some(x=>!['rules','codex','qwen','llama'].includes(x))||!['all','development','holdout'].includes(split)||batchSize<1||batchSize>12)throw new Error('Invalid benchmark options');
const fixture=JSON.parse(await readFile(join(root,'scripts/benchmark-cases.json'),'utf8'));
const state=JSON.parse(await readFile(join(root,'data/state.json'),'utf8'));
const index=new Map(state.partners.map(p=>[p.id,p]));
const cases=fixture.cases.filter(x=>split==='all'||x.split===split).map(x=>{
 const p=index.get(x.id);if(!p)throw new Error('Missing saved prospect '+x.id+'; benchmark requires the reviewed discovery snapshot');
 return {...x,p:{...p,aiAssessment:null}};
});
const fingerprint=createHash('sha256').update(JSON.stringify(cases.map(x=>sourceFacts(x.p)))).digest('hex');
const all=[];
for(const model of models){
 const began=Date.now(),scores=new Map(),errors=[],calls=[];
 if(model==='rules'){
  for(const x of cases)scores.set(x.id,{score:scorePartner(x.p,0,DEFAULT_RATING_WEIGHTS).score,reason:'Source-only screening'});
 }else for(let i=0;i<cases.length;i+=batchSize){
  const group=cases.slice(i,i+batchSize),prompt=assessmentPrompt(group.map(x=>sourceFacts(x.p)));
  const t=Date.now();
  try{
   const raw=await generateJSON(model,prompt,{withUsage:true,timeoutMs:300000});
   const assessments=validateAssessment(raw.result,group.map(x=>x.id));
   for(const a of assessments){
    const x=group.find(x=>x.id===a.id);
    scores.set(a.id,{score:scorePartner({...x.p,aiAssessment:{...a,rubricVersion:AI_RUBRIC_VERSION}},0,DEFAULT_RATING_WEIGHTS).score,reason:a.reason,check:a.check});
   }
   calls.push({ids:group.map(x=>x.id),ms:Date.now()-t,usage:raw.usage});
  }catch(e){errors.push({ids:group.map(x=>x.id),error:e.message});}
 }
 const rows=cases.map(x=>({id:x.id,name:x.p.name,source:x.source,split:x.split,tier:x.tier,
  score:scores.get(x.id)?.score??null,reason:scores.get(x.id)?.reason??null,check:scores.get(x.id)?.check??null}));
 const metrics=rankingMetrics(rows),holdout=rankingMetrics(rows.filter(x=>x.split==='holdout'));
 all.push({model,elapsedMs:Date.now()-began,metrics,holdout,errors,calls,rows});
 console.log(model,JSON.stringify({valid:metrics.valid,holdoutNdcg10:holdout.ndcgAt10,holdoutPairwise:holdout.pairwiseAccuracy,errors:errors.length}));
}
const report={createdAt:new Date().toISOString(),fixture:fixture.version,scope:fixture.scope,inputSha256:fingerprint,
 models,split,batchSize,caveat:'Source-evidence tiers are reviewer judgements, NOT verified acceptance, impact, carbon savings or sponsor preferences.',results:all};
const folder=join(root,'data','benchmark-results');await mkdir(folder,{recursive:true});
const path=join(folder,'ranking-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log('Saved '+path);
