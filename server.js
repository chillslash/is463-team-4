import {createServer} from 'node:http';
import {readFile, writeFile, rename, mkdir, stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join, resolve, extname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {initialState, numbers, rankPartners, osmCandidates, nparksCandidates, draftTemplate, STATUSES} from './src/core.js';

const ROOT=process.cwd();
const DB_PATH=process.env.DATA_FILE || join(ROOT,'data','state.json');
const PORT=Number(process.env.PORT || 4173);
const ROUTES={'/':'this_week','/this-week':'this_week','/find-partners':'find_partners','/outreach':'outreach_draft','/pipeline':'pipeline','/log-handover':'log_handover'};
const FILE_TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.png':'image/png'};
let serial=Promise.resolve();
async function readState(){if(!existsSync(DB_PATH)){const seed=initialState();await store(seed);return seed;}return JSON.parse(await readFile(DB_PATH,'utf8'));}
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
 if(Object.hasOwn(payload,'fee')){if(!['unknown','none','paid'].includes(payload.fee))fail('Invalid fee status');p.fee=payload.fee;}
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
async function discover(s){
 const errors=[];let candidates=[];let source='';
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),19000);
 try {
  // Official open-data endpoint is attempted first: no scraping of NParks web pages.
  try {
    const id='d_0542d48f0991541706b58059381a6eca';
    const metadata=await fetch(`https://api-open.data.gov.sg/v1/public/api/datasets/${id}/poll-download`,{signal:controller.signal});
    if(!metadata.ok)throw new Error(`data.gov.sg metadata HTTP ${metadata.status}`);
    const json=await metadata.json();const url=json?.data?.url;
    if(json.code!==0||!url?.startsWith('https://'))throw new Error('No authorised dataset URL available');
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok)throw new Error(`NParks dataset HTTP ${response.status}`);
    candidates=nparksCandidates(await response.json(),s.settings);
    if(!candidates.length)throw new Error('No usable NParks park records returned');
    source='NParks Parks dataset via data.gov.sg';
  } catch(err) {errors.push(`NParks: ${err.message}`);}
  if(!candidates.length){
    try{
      const query='[out:json][timeout:20];(nwr["leisure"~"^(garden|park)$"]["name"](1.22,103.60,1.48,104.04);nwr["landuse"="allotments"]["name"](1.22,103.60,1.48,104.04);nwr["shop"~"^(garden_centre|nursery)$"]["name"](1.22,103.60,1.48,104.04);nwr["tourism"="zoo"]["name"](1.22,103.60,1.48,104.04););out center 80;';
      const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'CoffeeBot-IS463-Prototype/0.1 educational research'},body:new URLSearchParams({data:query}),signal:controller.signal});
      if(!r.ok)throw new Error(`Overpass HTTP ${r.status}`);
      const json=await r.json();if(!Array.isArray(json.elements))throw new Error('Invalid place dataset');
      candidates=osmCandidates(json.elements,s.settings);source='OpenStreetMap Overpass';
      if(!candidates.length)throw new Error('No usable OSM sites returned');
    }catch(err){errors.push(`OSM: ${err.message}`);}
  }
  if(!candidates.length)throw Object.assign(new Error(`Live discovery unavailable: ${errors.join(' / ')}. Existing candidates remain usable.`),{status:503});
  const existing=new Set(s.partners.map(p=>p.id));let added=0;
  for(const p of candidates)if(!existing.has(p.id)){s.partners.push(p);added++;}
  return {added,found:candidates.length,source,note:'Mapped parks and sites are NOT confirmed recipients. Acceptance, authority, fees and capacity remain unverified.'};
 }finally{clearTimeout(timer);}
}

async function aiDraft(p,kg){const base=draftTemplate(p,kg);const key=process.env.OPENAI_API_KEY;
 if(!key)return base;
 const facts=`CoffeeBot collects coffee grounds from coffee machines. Grounds are sun-dried and stored at HQ; moisture is NOT measured. Do not state safety or suitability as fact. The candidate organisation ${p.name} is listed as ${p.category} with ${p.use}. Their willingness, acceptance fees and capacity are NOT confirmed unless recorded explicitly. Fee: ${p.fee}; capacity: ${p.capacityKg ?? 'unknown'}; status: ${p.status}. Do not invent contacts, fees, capacity, agreements or evidence. Suggest a trial up to ${Math.min(10,Math.max(1,kg||10))} kg subject to agreement. Draft an email to ask about use, fees, authority, conditions, frequency and collection. Return JSON object with keys subject,body,guide.`;
 try{const c=new AbortController();const t=setTimeout(()=>c.abort(),12000);let r;try{r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',signal:c.signal,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:0.2,response_format:{type:'json_object'},messages:[{role:'system',content:'Draft cautious, professional emails for a human to review. Use only supplied facts and label uncertainties.'},{role:'user',content:facts}]})});}finally{clearTimeout(t);}
 if(!r.ok)throw new Error(`AI HTTP ${r.status}`);const obj=JSON.parse((await r.json()).choices[0].message.content);if(!obj.body||!obj.subject||!obj.guide)throw new Error('Incomplete AI draft');return {subject:cleanString(obj.subject,300),body:cleanString(obj.body,8000),guide:cleanString(obj.guide,2500),mode:'AI-assisted draft (staff review required)'};
 }catch(err){return {...base,mode:`Template fallback (AI unavailable: ${err.message})`};}
}
export function createApp(){return createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');const path=url.pathname;
  if(path==='/api/health')return response(res,200,{ok:true,service:'CoffeeBot Circularity Copilot'});
  if(path==='/api/state'&&req.method==='GET'){const s=await readState();return response(res,200,{...s,metrics:numbers(s.settings,s.partners,s.handovers),ranked:rankPartners(s.partners,numbers(s.settings,s.partners,s.handovers).gapKg)});}
  if(path==='/api/settings'&&req.method==='PATCH'){
   const v=await input(req);const changed=await mutation(s=>{for(const [key,min,max] of [['cupsPerWeek',0,10000000],['gramsPerCup',1,1000],['referenceLat',1.1,1.55],['referenceLon',103.5,104.1]])if(Object.hasOwn(v,key))s.settings[key]=validNumber(v[key],key,min,max);
    for(const k of ['reportingCollectedKg','reportingDiscardedKg'])if(Object.hasOwn(v,k))s.settings[k]=v[k]===null||v[k]===''?null:validNumber(v[k],k,0,100000000);
    if(Object.hasOwn(v,'referenceLabel'))s.settings.referenceLabel=cleanString(v.referenceLabel,150);return s.settings;});return response(res,200,changed);
  }
  if(path==='/api/discover'&&req.method==='POST'){const result=await mutation(discover);return response(res,200,result);}
  if(path==='/api/partners'&&req.method==='POST'){
   const payload=await input(req);const result=await mutation(s=>{const p=validatePartnerFields(payload,{id:randomUUID(),source:'Staff-entered lead',sourceUrl:'',verified:false,confirmed:false,fee:'unknown',capacityKg:null,status:'suggested',willingness:'unknown'});s.partners.push(p);return p;});return response(res,201,result);
  }
  const pm=path.match(/^\/api\/partners\/([a-zA-Z0-9_-]+)$/);
  if(pm&&req.method==='PATCH'){
   const v=await input(req);const updated=await mutation(s=>{const idx=s.partners.findIndex(p=>p.id===pm[1]);if(idx<0)throw Object.assign(new Error('Partner not found'),{status:404});s.partners[idx]=validatePartnerFields(v,s.partners[idx]);return s.partners[idx];});return response(res,200,updated);
  }
  if(path==='/api/draft'&&req.method==='POST'){
   const {partnerId}=await input(req);const s=await readState();const p=s.partners.find(x=>x.id===partnerId);if(!p)fail('Select a partner');const gap=numbers(s.settings,s.partners,s.handovers).gapKg;const draft=await aiDraft(p,gap);return response(res,200,{...draft,partnerId});
  }
  if(path==='/api/outreach'&&req.method==='POST'){
   const v=await input(req);const saved=await mutation(s=>{if(!s.partners.some(p=>p.id===v.partnerId))fail('Partner not found');if(!cleanString(v.body))fail('Message required');const entry={id:randomUUID(),partnerId:v.partnerId,subject:cleanString(v.subject,300),body:cleanString(v.body,10000),preparedAt:new Date().toISOString(),sent:false};s.outreach.unshift(entry);return entry;});return response(res,201,saved);
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
