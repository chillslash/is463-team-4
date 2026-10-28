import {readFile,writeFile} from 'node:fs/promises';
import {scorePartner,rankPartners,migrateSponsorAssumptions} from '../src/core.js';
import {selectSourceBalanced} from '../src/assessment-selection.js';
import {activeEvidenceReview,evidenceQuality,evidencePrompt,validateEvidenceAssessments} from '../src/evidence-review.js';
import {sourceFacts,assessmentPrompt} from '../server.js';
import {generateJSON,validateAssessment} from '../src/ai.js';
import {evaluateSponsorReview} from './sponsor-ranking-evaluation.mjs';

const opts=Object.fromEntries(process.argv.slice(2).map(arg=>{const m=arg.match(/^--([\w-]+)=(.+)$/);if(!m)throw Error('Use --name=value');return [m[1],m[2]];}));
if(!opts.state||!opts.review||!opts.out)throw Error('Provide --state, --review and --out');
const models=opts.models?opts.models.split(','):[];
if(models.some(x=>!['codex','claude','qwen','llama'].includes(x)))throw Error('Unsupported AI provider');
const limit=opts.limit?Number(opts.limit):12;
if(!Number.isInteger(limit)||limit<1||limit>24)throw Error('Hybrid limit must be 1–24');
const state=JSON.parse(await readFile(opts.state,'utf8'));migrateSponsorAssumptions(state);
const reference=JSON.parse(await readFile(opts.review,'utf8'));
const maxCases=opts['max-cases']?Number(opts['max-cases']):reference.cases.length;
if(!Number.isInteger(maxCases)||maxCases<1||maxCases>reference.cases.length)throw Error('Invalid max-cases');
const review={...reference,cases:reference.cases.slice(0,maxCases)};
const index=new Map(state.partners.map(p=>[p.id,p]));
const all=review.cases.map(x=>{const p=index.get(x.id);if(!p)throw Error('Missing '+x.id);return {...p,use:'',notes:'',aiAssessment:null,aiEvidenceReview:null};});
const w=state.settings.ratingWeights;
const runMetrics={};const predictions={models:{}};
for(const provider of models){
 // Full AI baseline uses the legacy model rubric without grounding requirements.
 const full={},fullCalls=[];let begin=Date.now(),unavailable=false;
 for(let i=0;i<all.length;i+=4){
  const batch=all.slice(i,i+4),start=Date.now();
  try{
   const result=await generateJSON(provider,assessmentPrompt(batch.map(sourceFacts)),{withUsage:true,timeoutMs:90000});
   const values=validateAssessment(result.result,batch.map(p=>p.id));
   for(const a of values){
    const p=batch.find(x=>x.id===a.id),fixed=scorePartner(p,0,w).parts;
    full[p.id]=Math.round(a.reuseSuitability/40*w.suitability)+Math.round(a.sourceEvidence/35*w.evidence)+fixed.proximity+fixed.operations;
   }
   fullCalls.push({count:batch.length,valid:values.length,ms:Date.now()-start,usage:result.usage});
  }catch(err){fullCalls.push({count:batch.length,valid:0,ms:Date.now()-start,error:String(err.message).slice(0,160)});
   if(/could not launch|CLI failed|timed out|ECONNREFUSED|fetch failed/i.test(String(err.message))){unavailable=true;break;}}
 }
 predictions.models[provider+'-full']=full;
 runMetrics[provider+'-full']={coverage:Object.keys(full).length,elapsedMs:Date.now()-begin,calls:fullCalls};
 // Selective assessment uses source-balanced rules, then only evidence-rich leads.
 const eligible=rankPartners(all,0,w).filter(p=>(p.evidenceEntries||[]).some(e=>evidenceQuality(e)));
 const selected=selectSourceBalanced(eligible,limit);
 const scores={};const hybridCalls=[];const upgraded=new Map();begin=Date.now();
 for(let i=0;!unavailable && i<selected.length;i+=4){
  const batch=selected.slice(i,i+4),start=Date.now();
  try{
   const result=await generateJSON(provider,evidencePrompt(batch),{withUsage:true,timeoutMs:300000});
   const values=validateEvidenceAssessments(result.result,batch);
   for(const a of values)upgraded.set(a.id,a);
   hybridCalls.push({count:batch.length,valid:values.length,ms:Date.now()-start,usage:result.usage});
  }catch(err){hybridCalls.push({count:batch.length,valid:0,ms:Date.now()-start,error:String(err.message).slice(0,160)});}
 }
 for(const p of all)scores[p.id]=scorePartner({...p,aiEvidenceReview:upgraded.get(p.id)||null},0,w).score;
 predictions.models[provider+'-selective-hybrid']=scores;
 runMetrics[provider+'-selective-hybrid']={selected:selected.length,upgraded:upgraded.size,coverage:all.length,elapsedMs:Date.now()-begin,calls:hybridCalls};
}
const evaluation=evaluateSponsorReview(state,review,predictions);
const output={description:'Exploratory proxy comparison, not CoffeeBot ground truth; unassessed hybrid uses deterministic fallback',caseCount:all.length,hybridLimit:limit,runMetrics,predictions,evaluation};
await writeFile(opts.out,JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:evaluation.status,labelled:evaluation.labelledCandidates,results:Object.fromEntries(Object.entries(evaluation.results).map(([k,v])=>[k,{coverage:v.coverage,ndcg:v.comparable?.ndcgAt10,pairwise:v.comparable?.pairwiseAccuracy}])),runs:runMetrics},null,2));
