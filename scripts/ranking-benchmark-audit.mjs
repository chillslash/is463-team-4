import {readFile,writeFile} from 'node:fs/promises';
import {scorePartner} from '../src/core.js';

export function pairAgreement(rows,method,{sameSource=null}={}){
 let pairs=0,wins=0,ties=0;
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const a=rows[i],b=rows[j];
  if(a.tier===b.tier)continue;
  if(sameSource===true&&a.source!==b.source)continue;
  if(sameSource===false&&a.source===b.source)continue;
  if(!Number.isFinite(a[method])||!Number.isFinite(b[method]))continue;
  pairs++;
  const diff=a[method]-b[method];
  if(diff===0){wins+=.5;ties++;}
  else if(diff*(a.tier-b.tier)>0)wins++;
 }
 return {pairs,agreement:pairs?+(wins/pairs).toFixed(4):null,ties};
}
export function benchmarkAudit(state,review,results,externalFacts={}){
 const partners=new Map(state.partners.map(p=>[p.id,p]));
 const methods={rules:null,...results};
 const rows=review.cases.filter(c=>c.review?.outreachPriority!==null).map(c=>{
  const p=partners.get(c.id);
  if(!p)throw new Error('Missing partner '+c.id);
  return {id:p.id,name:p.name,source:p.source,
   tier:c.review.outreachPriority,
   rules:scorePartner(p,0,state.settings?.ratingWeights).score,
   ...Object.fromEntries(Object.entries(results).map(([method,scores])=>[method,scores[c.id]]))
  };
 });
 const labelsBySource={};
 for(const r of rows){
  const group=labelsBySource[r.source]??={total:0,tiers:{"0":0,"1":0,"2":0,"3":0}};
  group.total++;group.tiers[r.tier]++;
 }
 const allMethods={};
 for(const method of Object.keys(methods)){
  allMethods[method]={
   overall:pairAgreement(rows,method),
   withinSource:pairAgreement(rows,method,{sameSource:true}),
   acrossSource:pairAgreement(rows,method,{sameSource:false})
  };
 }
 const tiers=[0,1,2,3].map(grade=>({grade,count:rows.filter(r=>r.tier===grade).length}));
 const inputsWithoutResearch=rows.filter(r=>Object.hasOwn(externalFacts,r.id)).map(r=>r.id);
 return {
  scope:'Audit of earlier proxy comparison, not new ground truth',
  totalCases:rows.length,
  sourceGroups:Object.keys(labelsBySource).length,
  labelsBySource,tiers,
  researchSupplementCaseCount:inputsWithoutResearch.length,
  researchSupplementIds:inputsWithoutResearch,
  measures:allMethods,
  validityWarnings:[
   'Proxy labels were authored by the assistant with knowledge of the deterministic project design, not externally blinded',
   'Source labels are structurally associated with grades (all four parks grade 1; all four Community in Bloom grade 2)',
   'Supplementary organisation-specific research exists for some reviewer labels but was not part of frozen model inputs',
   'Legacy full AI and hybrid used DIFFERENT prompts, validation gates, and score fusion, so isolated strategy effects cannot be inferred',
   'Hybrid candidate eligibility was concentrated in NEA and prevents measuring distinction between many same-source organisations',
   'No actual partnership acceptance, recurring capacity, usable intake, delivery or fee outcomes are labelled'
  ],
  decision:'Do not report an approach winner or infer environmental impact from this cohort.'
 };
}
async function main(){
 const args=Object.fromEntries(process.argv.slice(2).map(x=>{const m=x.match(/^--([a-z-]+)=(.+)$/);if(!m)throw Error('Expected --name=value');return [m[1],m[2]];}));
 if(!args.state||!args.review||!args.codex||!args.qwen||!args.out)throw Error('Expected --state --review --codex --qwen --out');
 const [state,review,codex,qwen,external]=await Promise.all([
  readFile(args.state,'utf8').then(JSON.parse),readFile(args.review,'utf8').then(JSON.parse),
  readFile(args.codex,'utf8').then(JSON.parse),readFile(args.qwen,'utf8').then(JSON.parse),
  readFile(new URL('./proxy-researched-facts.json',import.meta.url),'utf8').then(JSON.parse)
 ]);
 const methods={...codex.predictions.models,...qwen.predictions.models};
 const result=benchmarkAudit(state,review,methods,external.facts);
 await writeFile(args.out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({caseCount:result.totalCases,researchSupplementCaseCount:result.researchSupplementCaseCount,measures:result.measures},null,2));
}
if(process.argv[1]?.endsWith('ranking-benchmark-audit.mjs'))main().catch(e=>{console.error(e.message);process.exitCode=1;});
