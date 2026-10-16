import {createServer} from 'node:http';
import {readFile, writeFile, rename, mkdir, stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {join, resolve, extname} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {initialState, numbers, rankPartners, distanceKm, draftTemplate, STATUSES} from './src/core.js';
import {generateJSON,validateDraft,validateAssessment} from './src/ai.js';
import {discoverAll} from './src/discovery.js';
import {researchPublicContact} from './src/contacts.js';

const ROOT=process.cwd();
// Optional per-member configuration, kept outside Git. Existing OS environment variables take precedence.
const localConfig=join(ROOT,'.env');
if(existsSync(localConfig))loadEnvFile(localConfig);
const DB_PATH=process.env.DATA_FILE || join(ROOT,'data','state.json');
const PORT=Number(process.env.PORT || 4173);
const AI_PROVIDER=['codex','claude'].includes(process.env.AI_PROVIDER)?process.env.AI_PROVIDER:'template';
let discoveryStatus={active:false,phase:'Idle',completed:0,total:0};
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const ROUTES={'/':'this_week','/this-week':'this_week','/find-partners':'find_partners','/outreach':'outreach_draft','/pipeline':'pipeline','/log-handover':'log_handover'};
const FILE_TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.png':'image/png'};
let serial=Promise.resolve();
async function readState(){if(!existsSync(DB_PATH)){const seed=initialState();await store(seed);return seed;}const s=JSON.parse(await readFile(DB_PATH,'utf8'));const defaults=initialState().settings;for(const field of ['referenceLat','referenceLon','referenceLabel'])s.settings[field]=defaults[field];delete s.settings.aiProvider;s.discoveryRuns??=[];for(const p of s.partners){delete p.fee;if(p.source==='Fictional Stitch scenario'&&p.status==='suggested')p.status='interested';if(Number.isFinite(p.lat)&&Number.isFinite(p.lon))p.distanceKm=distanceKm(defaults.referenceLat,defaults.referenceLon,p.lat,p.lon);}return s;}
async function store(v){await mkdir(resolve(DB_PATH,'..'),{recursive:true});const temp=DB_PATH+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(v,null,2)+'\n','utf8');await rename(temp,DB_PATH);}
function mutation(fn){const next=serial.catch(()=>{}).then(async()=>{let s=await readState();const value=await fn(s);await store(s);return value;});serial=next;return next;}
function response(res,status,value){const body=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store'});res.end(body);}
async function input(req){let txt='';for await (const chunk of req){txt+=chunk;if(txt.length>150000)throw Object.assign(new Error('Request too large'),{status:413});}try{return txt?JSON.parse(txt):{};}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}}
function fail(msg){throw Object.assign(new Error(msg),{status:400});}
const cleanString=(v,n=300)=>String(v ?? '').trim().slice(0,n);
const validNumber=(v,label,min,max)=>{if(v===null||v===''||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max)fail(`Invalid ${label}`);return Number(v);};
function validatePartnerFields(payload,current={}){
 const p={...current};
 for(const k of ['name','category','location','use','notes','contactName','contactEmail','frequency','evidence'])if(Object.hasOwn(payload,k))p[k]=cleanString(payload[k],k==='notes'||k==='evidence'?2000:250);
 if(Object.hasOwn(payload,'status')){if(!STATUSES.includes(payload.status))fail('Invalid pipeline status');p.status=payload.status;}
 if(Object.hasOwn(payload,'capacityKg'))p.capacityKg=payload.capacityKg===''||payload.capacityKg===null?null:validNumber(payload.capacityKg,'weekly capacity',0,100000);
 if(Object.hasOwn(payload,'verified'))p.verified=payload.verified===true;
 if(Object.hasOwn(payload,'confirmed'))p.confirmed=payload.confirmed===true;
 if(Object.hasOwn(payload,'willingness'))p.willingness=cleanString(payload.willingness);
 if(!p.name)fail('Partner name required');
 if(p.confirmed && (p.status!=='regular'||!p.verified||!(p.capacityKg>0)))fail('Confirmed capacity requires regular status, verified details and positive kg/week');
 if(p.status!=='regular')p.confirmed=false;
 return p;
}
function sourceFacts(p){return {id:p.id,name:p.name,category:p.category,use:p.use,distanceKm:p.distanceKm,directCoffeeEvidence:!!p.directCoffeeEvidence,materialEvidence:p.materialEvidence||null,sourceEvidence:(p.evidenceEntries||[{source:p.source,url:p.sourceUrl,claim:'Source lists '+p.name}]).map(e=>({source:e.source,url:e.url,claim:e.claim}))};}
export function saveAIResults(partners,batch,results,{provider,prompt,runId}){
 const byId=new Map(results.map(a=>[a.id,a]));let saved=0;
 for(const ranked of batch){
  const result=byId.get(ranked.id),record=partners.find(p=>p.id===ranked.id);
  if(!record||!result)continue;
  record.aiAssessment={...result,provider,assessedAt:new Date().toISOString(),factsHash:digest(sourceFacts(record)),promptHash:digest(prompt),runId,
   basedOn:record.evidenceEntries?.map(e=>({source:e.source,url:e.url}))||[{source:record.source,url:record.sourceUrl}],method:'Inference from source records'};
  saved++;
 }
 return saved;
}
export function chooseForAssessment(partners,limit=24){
 const buckets=new Map();
 for(const p of partners){const key=p.source||'Unknown';if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p);}
 const selected=[];
 while(selected.length<limit&&[...buckets.values()].some(a=>a.length)){
  for(const bucket of buckets.values())if(bucket.length&&selected.length<limit)selected.push(bucket.shift());
 }
 return selected;
}
async function discover(s){
 const runId=randomUUID(),startedAt=new Date().toISOString();
 discoveryStatus={active:true,phase:'Retrieving source data',completed:0,total:2,runId};
 const run={id:runId,startedAt,provider:AI_PROVIDER,sources:[],warnings:[],newLeads:0,reviewed:0,aiCalls:0,contactsFound:0,contactPagesChecked:0};
 try{
  const result=await discoverAll(s.settings);
  run.sources=result.sources;run.warnings.push(...result.warnings);
  const ids=new Set(s.partners.map(p=>p.id));
  for(const p of result.candidates){
   const key=x=>x.name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
   const existing=s.partners.find(o=>o.id===p.id||(o.source!=='Fictional Stitch scenario'&&key(o)===key(p)&&(!Number.isFinite(o.lat)||!Number.isFinite(p.lat)||(Math.abs(o.lat-p.lat)<0.008&&Math.abs(o.lon-p.lon)<0.008))));
   if(existing){
    existing.lastSeenAt=p.lastSeenAt;
    // Earlier imports have no reliable first-seen timestamp; do not fabricate one.
    const prev=existing.evidenceEntries||[{source:existing.source,url:existing.sourceUrl,claim:'Previous source record'}];
    existing.evidenceEntries=[...prev,...p.evidenceEntries].filter((x,i,arr)=>arr.findIndex(y=>y.source===x.source&&y.url===x.url)===i);
    if(!Number.isFinite(existing.lat)&&Number.isFinite(p.lat)){existing.lat=p.lat;existing.lon=p.lon;existing.distanceKm=p.distanceKm;}
    if(!existing.websiteUrl&&p.websiteUrl)existing.websiteUrl=p.websiteUrl;
    if(!existing.directCoffeeEvidence&&p.directCoffeeEvidence){existing.directCoffeeEvidence=true;existing.materialEvidence=p.materialEvidence;existing.use=p.use;}
    if(!existing.contactEmail&&p.contactEmail){existing.contactEmail=p.contactEmail;existing.contactName||=p.contactName||'';existing.contactEvidence=p.contactEvidence;run.contactsFound++;}

    continue;
   }
   if(!ids.has(p.id)){s.partners.push(p);ids.add(p.id);run.newLeads++;if(p.contactEmail)run.contactsFound++;}
  }
  discoveryStatus={active:true,phase:'Researching Public Contacts',completed:1,total:3,runId};
  const sites=rankPartners(s.partners,numbers(s.settings,s.partners,s.handovers).gapKg)
   .filter(p=>p.status==='suggested'&&!p.contactEmail&&p.websiteUrl&&(!p.contactSearch?.checkedAt||Date.now()-Date.parse(p.contactSearch.checkedAt)>7*86400000)).slice(0,5);
  for(const ranked of sites){
   const target=s.partners.find(p=>p.id===ranked.id);if(!target)continue;
   const found=await researchPublicContact(target);
   target.contactSearch={checkedAt:found.checkedAt,result:found.email?'found':'unavailable',pagesChecked:found.tried||0};
   run.contactPagesChecked+=found.tried||0;
   if(found.email){target.contactEmail=found.email;target.contactEvidence={source:'Organisation Website',url:found.sourceUrl,checkedAt:found.checkedAt,method:'website'};run.contactsFound++;}
  }
  discoveryStatus={active:true,phase:'Ranking Sourced Leads',completed:2,total:3,runId};
  if(AI_PROVIDER!=='template'){
   const candidates=rankPartners(s.partners,numbers(s.settings,s.partners,s.handovers).gapKg)
    .filter(p=>p.status==='suggested'&&p.source!=='Fictional Stitch scenario'&&!p.verified);
   const pending=chooseForAssessment(candidates.filter(p=>p.aiAssessment?.factsHash!==digest(sourceFacts(p))),24);
   const batches=[];for(let i=0;i<pending.length;i+=12)batches.push(pending.slice(i,i+12));
   discoveryStatus={active:true,phase:'Assessing Candidates with AI',completed:2,total:3+batches.length,runId};
   for(let i=0;i<batches.length;i++){
    const batch=batches[i],facts=batch.map(sourceFacts);
    const prompt='Classify POSSIBLE reuse partner leads. You may ONLY use the supplied official/public source facts; do not browse or call tools. No record proves willingness, composting or acceptance of spent coffee grounds. Return JSON with assessments: [{id,priority (high|medium|low),reason (short grounded inference),check (critical question)}]. Never invent activities, contacts or agreements. Source records: '+JSON.stringify(facts);
    try{
     run.aiCalls++;
     const response=validateAssessment(await generateJSON(AI_PROVIDER,prompt),batch.map(p=>p.id));
     run.reviewed+=saveAIResults(s.partners,batch,response,{provider:AI_PROVIDER,prompt,runId});
    }catch(err){run.warnings.push('AI batch '+(i+1)+': '+err.message);}
    discoveryStatus={active:true,phase:'Assessing Candidates with AI ('+(i+1)+'/'+batches.length+')',completed:3+i,total:3+batches.length,runId};
   }
  }
  if(AI_PROVIDER==='template')discoveryStatus={active:true,phase:'Finalising Results',completed:3,total:3,runId};
  run.finishedAt=new Date().toISOString();
  s.discoveryRuns.unshift(run);s.discoveryRuns=s.discoveryRuns.slice(0,40);
  discoveryStatus={active:false,phase:run.warnings.some(w=>w.startsWith('AI batch'))?'Completed with partial AI results':'Completed',completed:discoveryStatus.total,total:discoveryStatus.total,runId};
  return {runId,found:result.candidates.length,added:run.newLeads,assessed:run.reviewed,aiCalls:run.aiCalls,provider:AI_PROVIDER,sources:run.sources,warnings:run.warnings,contactsFound:run.contactsFound};
 }catch(err){discoveryStatus={active:false,phase:'Failed: '+err.message,completed:0,total:0,runId};throw err;}
}

async function aiDraft(p,kg,provider){
 const base=draftTemplate(p,kg);
 if(provider==='template')return base;
 const facts={organisation:p.name,category:p.category,possibleUse:p.use,source:p.source,sourceUrl:p.sourceUrl,sourceEvidence:p.evidenceEntries,location:p.location,verified:p.verified,weeklyCapacityKg:p.capacityKg,contact:p.contactName,notes:p.notes,
   grounds:'CoffeeBot grounds are collected and sun-dried at HQ. Moisture content is not measured.',
   trialMaxKg:Math.min(10,Math.max(1,kg||10))};
 const prompt='Write a professional first-contact email plus short handling/verification guide as strictly JSON with keys subject, body, guide. Do not use tools, browse, or infer that a place is willing to accept grounds. Do not invent a recipient, safe-use claims, capacity, ongoing agreement or authorised contact. Ask about material suitability, transport arrangements, regularity and authorised approval. The email will be reviewed by staff and NOT sent automatically. Facts: '+JSON.stringify(facts);
 const draft=validateDraft(await generateJSON(provider,prompt));
 return {...draft, mode:provider+' CLI-assisted draft — review before use',audit:{provider,generatedAt:new Date().toISOString(),factsHash:digest(facts),sourceEvidence:p.evidenceEntries||[]}};
}

export function createApp(){return createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');const path=url.pathname;
  if(path==='/api/health')return response(res,200,{ok:true,service:'CoffeeBot Circularity Copilot'});
  if(path==='/api/state'&&req.method==='GET'){const s=await readState();return response(res,200,{...s,metrics:numbers(s.settings,s.partners,s.handovers),ranked:rankPartners(s.partners,numbers(s.settings,s.partners,s.handovers).gapKg)});}
  if(path==='/api/settings'&&req.method==='PATCH'){
   const v=await input(req);if(Object.hasOwn(v,'aiProvider'))fail('AI provider must be configured in the local repository environment');const changed=await mutation(s=>{for(const [key,min,max] of [['cupsPerWeek',0,10000000],['gramsPerCup',1,1000],['referenceLat',1.1,1.55],['referenceLon',103.5,104.1]])if(Object.hasOwn(v,key))s.settings[key]=validNumber(v[key],key,min,max);
    for(const k of ['reportingCollectedKg','reportingDiscardedKg'])if(Object.hasOwn(v,k))s.settings[k]=v[k]===null||v[k]===''?null:validNumber(v[k],k,0,100000000);
    if(Object.hasOwn(v,'referenceLabel'))s.settings.referenceLabel=cleanString(v.referenceLabel,150);
    return s.settings;});return response(res,200,changed);
  }
  if(path==='/api/discovery-status'&&req.method==='GET')return response(res,200,discoveryStatus);
  if(path==='/api/discover'&&req.method==='POST'){if(discoveryStatus.active)return response(res,409,{error:'A discovery run is in progress'});discoveryStatus={active:true,phase:'Starting',completed:0,total:2};const result=await mutation(discover);return response(res,200,result);}
  if(path==='/api/partners'&&req.method==='POST'){
   const payload=await input(req);const result=await mutation(s=>{const p=validatePartnerFields(payload,{id:randomUUID(),source:'Staff-entered lead',sourceUrl:'',verified:false,confirmed:false,capacityKg:null,status:'contacted',sourcedAt:new Date().toISOString(),willingness:'unknown'});s.partners.push(p);return p;});return response(res,201,result);
  }
  const pm=path.match(/^\/api\/partners\/([a-zA-Z0-9_-]+)$/);
  if(pm&&req.method==='PATCH'){
   const v=await input(req);const updated=await mutation(s=>{const idx=s.partners.findIndex(p=>p.id===pm[1]);if(idx<0)throw Object.assign(new Error('Partner not found'),{status:404});s.partners[idx]=validatePartnerFields(v,s.partners[idx]);return s.partners[idx];});return response(res,200,updated);
  }
  if(path==='/api/draft'&&req.method==='POST'){
   const {partnerId}=await input(req);const s=await readState();const p=s.partners.find(x=>x.id===partnerId);if(!p)fail('Select a partner');const gap=numbers(s.settings,s.partners,s.handovers).gapKg;const draft=await aiDraft(p,gap,AI_PROVIDER);return response(res,200,{...draft,partnerId});
  }
  if(path==='/api/outreach'&&req.method==='POST'){
   const v=await input(req);const saved=await mutation(s=>{if(!s.partners.some(p=>p.id===v.partnerId))fail('Partner not found');if(!cleanString(v.body))fail('Message required');const entry={id:randomUUID(),partnerId:v.partnerId,subject:cleanString(v.subject,300),body:cleanString(v.body,10000),preparedAt:new Date().toISOString(),sent:false,sourceEvidence:s.partners.find(p=>p.id===v.partnerId)?.evidenceEntries||[]};s.outreach.unshift(entry);return entry;});return response(res,201,saved);
  }
  if(path==='/api/handovers'&&req.method==='POST'){
   const v=await input(req);const record=await mutation(s=>{if(!s.partners.some(p=>p.id===v.partnerId))fail('Partner not found');const kg=validNumber(v.kg,'kg',0.01,100000);const date=cleanString(v.date,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z')))fail('Invalid date');if(!['unverified','partner-confirmed','reuse-confirmed'].includes(v.confirmation))fail('Select confirmation level');const h={id:randomUUID(),partnerId:v.partnerId,kg,date,notes:cleanString(v.notes,1200),intendedUse:cleanString(v.intendedUse,250),confirmation:v.confirmation,recordedAt:new Date().toISOString()};s.handovers.unshift(h);return h;});return response(res,201,record);
  }
  if(path==='/api/reset-demo'&&req.method==='POST'){const reset=await mutation(s=>{const fresh=initialState();Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,fresh);return {ok:true};});return response(res,200,reset);}
  if(req.method!=='GET')return response(res,405,{error:'Method not allowed'});
  let file;
  if(Object.hasOwn(ROUTES,path))file=join(ROOT,'public',ROUTES[path]+'.html');
  else if(/^\/(app\.js|app\.css)$/.test(path))file=join(ROOT,'public',path.slice(1));
  else return response(res,404,{error:'Not found'});
  const blob=await readFile(file);res.writeHead(200,{'Content-Type':FILE_TYPES[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(blob);
 }catch(err){response(res,err.status||500,{error:err.message||'Server error'});}
 });}
if(process.argv[1] && resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname.replace(/^\/(\w:)\//,'$1/'))){createApp().listen(PORT,()=>console.log(`Circularity Copilot http://localhost:${PORT}`));}
