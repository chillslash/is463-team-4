
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const CACHE_DIR=process.env.SOURCE_CACHE_DIR||join(process.cwd(),'data','source-cache');
const DAY_MS=24*60*60*1000;
function cachedResponse(body,savedAt,fromCache){return {json:async()=>JSON.parse(body),text:async()=>body,snapshotAt:savedAt,fromCache};}
import {cibCandidates, nparksCandidates} from './core.js';
import {DIRECTORY_SOURCES} from './directories.js';
import {SFA_URL,SFA_SOURCE,parseSfaPdf} from './sfa.js';
import {moeSchoolCandidates,enrichSchoolGardenLocations,parseCSV,SCHOOL_PROGRAMMES_ID,SCHOOL_DIRECTORY_ID} from './moe.js';

const DATA_URL = 'https://api-open.data.gov.sg/v1/public/api/datasets/';
const DATASETS = [
  {key:'Community in Bloom', id:'d_f91a8b057cfb2bebf2e531ad8061e1c1', converter:cibCandidates},
  {key:'NParks public parks', id:'d_0542d48f0991541706b58059381a6eca', converter:nparksCandidates}
];
export function uniqueCandidates(candidates) {
 const result=[];const key=p=>p.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 for(const p of candidates){
  const existing=result.find(a=>a.id===p.id || (key(a)===key(p) && (!Number.isFinite(a.lat)||!Number.isFinite(p.lat) || (Math.abs(a.lat-p.lat)<0.008&&Math.abs(a.lon-p.lon)<0.008))));
  if(!existing){result.push(p);continue;}
  const original=existing.evidenceEntries||[{source:existing.source,url:existing.sourceUrl,claim:'Dataset lists '+existing.name}];
  const extras=p.evidenceEntries||[{source:p.source,url:p.sourceUrl,claim:'Dataset lists '+p.name}];
  existing.evidenceEntries=[...original,...extras].filter((e,i,arr)=>arr.findIndex(x=>x.source===e.source&&x.url===e.url)===i);
  if(!Number.isFinite(existing.lat) && Number.isFinite(p.lat)){existing.lat=p.lat;existing.lon=p.lon;existing.distanceKm=p.distanceKm;existing.location=p.location;}
  if(!existing.contactEmail&&p.contactEmail){existing.contactEmail=p.contactEmail;existing.contactName||=p.contactName||'';existing.contactEvidence=p.contactEvidence;}
  if(!existing.websiteUrl&&p.websiteUrl)existing.websiteUrl=p.websiteUrl;
  if(existing.category==='school programme'&&p.category==='school garden')existing.category='school garden';
 }
 return result;
}

async function withDeadline(fn,timeoutMs,signal) {
 const c=new AbortController();const timer=setTimeout(()=>c.abort(),timeoutMs);
 try{signal?.throwIfAborted();return await fn(signal?AbortSignal.any([signal,c.signal]):c.signal);}finally{clearTimeout(timer);}
}
async function officialDownload(id,httpFetch,signal,useCache){
 const filename=join(CACHE_DIR,id+'.json');
 let previous=null;
 if(useCache){try{previous=JSON.parse(await readFile(filename,'utf8'));if(Date.now()-Date.parse(previous.savedAt)<DAY_MS)return cachedResponse(previous.body,previous.savedAt,true);}catch{}}
 try{
  const r=await httpFetch(DATA_URL+id+'/poll-download',{signal});
  if(!r.ok)throw new Error('metadata HTTP '+r.status);
  const meta=await r.json(),url=meta?.data?.url;
  if(meta.code!==0||!url?.startsWith('https://'))throw new Error('dataset URL unavailable');
  const u=new URL(url);
  if(!u.hostname.endsWith('.amazonaws.com')&&!u.hostname.endsWith('.data.gov.sg'))throw new Error('unexpected data host');
  const data=await httpFetch(url,{signal});
  if(!data.ok)throw new Error('dataset HTTP '+data.status);
  const body=await data.text(),savedAt=new Date().toISOString();
  if(useCache){try{await mkdir(CACHE_DIR,{recursive:true});await writeFile(filename,JSON.stringify({savedAt,body}),'utf8');}catch{}}
  return cachedResponse(body,savedAt,false);
 }catch(err){
  if(previous?.body){return cachedResponse(previous.body,previous.savedAt,true);}
  throw err;
 }
}

async function fetchDataset(item,reference,httpFetch,useCache,signal){
 return withDeadline(async signal=>{
 const response=await officialDownload(item.id,httpFetch,signal,useCache);
 const candidates=item.converter(await response.json(),reference);
 if(!candidates.length)throw new Error('no eligible named locations');
 return {key:item.key,candidates,cached:response.fromCache,snapshotAt:response.snapshotAt};
 },15000,signal);
}
async function fetchSchools(reference,httpFetch,useCache,signal){
 return withDeadline(async signal=>{
  const [programmeResponse,directoryResponse]=await Promise.all([
    officialDownload(SCHOOL_PROGRAMMES_ID,httpFetch,signal,useCache),
    officialDownload(SCHOOL_DIRECTORY_ID,httpFetch,signal,useCache)
  ]);
  const directory=parseCSV(await directoryResponse.text());
  const candidates=moeSchoolCandidates(parseCSV(await programmeResponse.text()),directory,reference);
  if(!candidates.length)throw new Error('no sustainability-related school programmes');
  return {key:'MOE school programmes',candidates,directory,cached:programmeResponse.fromCache||directoryResponse.fromCache,snapshotAt:programmeResponse.snapshotAt};
 },18000,signal);
}

async function fetchDirectory(item,httpFetch,useCache,signal){
 return withDeadline(async signal=>{
  const id='directory-'+item.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const filename=join(CACHE_DIR,id+'.json');
  let old=null;
  if(useCache){try{old=JSON.parse(await readFile(filename,'utf8'));if(Date.now()-Date.parse(old.savedAt)<DAY_MS){const candidates=item.parse(old.body);if(candidates.length)return {key:item.name,candidates,cached:true,snapshotAt:old.savedAt};}}catch{}}
  try{
    const resp=await httpFetch(item.url,{signal,headers:{'User-Agent':'CoffeeBot-IS463-Prototype/0.3'}});
    if(!resp.ok)throw Error('HTTP '+resp.status);
    const body=await resp.text(),candidates=item.parse(body);
    if(!candidates.length)throw Error('Directory structure not recognised or no relevant entries');
    const savedAt=new Date().toISOString();
    if(useCache){try{await mkdir(CACHE_DIR,{recursive:true});await writeFile(filename,JSON.stringify({body,savedAt}),'utf8');}catch{}}
    return {key:item.name,candidates,cached:false,snapshotAt:savedAt};
  }catch(err){if(old?.body){const candidates=item.parse(old.body);if(candidates.length)return {key:item.name,candidates,cached:true,snapshotAt:old.savedAt};}throw err;}
 },18000,signal);
}

async function fetchSfa(httpFetch,useCache,signal){
 return withDeadline(async activeSignal=>{
  const filename=join(CACHE_DIR,'sfa-licensed-crop-farms.json');
  let previous=null;
  if(useCache)try{previous=JSON.parse(await readFile(filename,'utf8'));}catch{}
  const fromCache=old=>({key:SFA_SOURCE,candidates:old.candidates,cached:true,snapshotAt:old.savedAt,registerUpdated:old.registerUpdated});
  if(previous?.candidates?.length&&Date.now()-Date.parse(previous.savedAt)<DAY_MS)return fromCache(previous);
  try{
   activeSignal.throwIfAborted();
   const resp=await httpFetch(SFA_URL,{signal:activeSignal,headers:{'User-Agent':'CoffeeBot-IS463-Prototype/0.3','Accept':'application/pdf'}});
   if(!resp.ok)throw Error('SFA register HTTP '+resp.status);
   const bytes=new Uint8Array(await resp.arrayBuffer());
   activeSignal.throwIfAborted();
   const parsed=await parseSfaPdf(bytes);
   activeSignal.throwIfAborted();
   if(!parsed.candidates.length)throw Error('SFA register contains no eligible crop farms');
   const savedAt=new Date().toISOString();
   if(useCache)try{await mkdir(CACHE_DIR,{recursive:true});await writeFile(filename,JSON.stringify({...parsed,savedAt}),'utf8');}catch{}
   return {key:SFA_SOURCE,candidates:parsed.candidates,cached:false,snapshotAt:savedAt,registerUpdated:parsed.registerUpdated};
  }catch(err){
   activeSignal.throwIfAborted();
   if(previous?.candidates?.length)return fromCache(previous);
   throw err;
  }
 },25000,signal);
}

export async function discoverAll(reference,{httpFetch=fetch,includeDirectories=true,includeSfa=true,useCache=httpFetch===fetch,signal}={}){
 signal?.throwIfAborted();
 // Independent sources continue to contribute even when one source fails.
 const requests=DATASETS.map(item=>fetchDataset(item,reference,httpFetch,useCache,signal));
 requests.push(fetchSchools(reference,httpFetch,useCache,signal));
 if(includeDirectories)requests.push(...DIRECTORY_SOURCES.map(item=>fetchDirectory(item,httpFetch,useCache,signal)));
 if(includeSfa)requests.push(fetchSfa(httpFetch,useCache,signal));

 const outcomes=await Promise.allSettled(requests),sources=[],warnings=[],entries=[];
 for(let i=0;i<outcomes.length;i++){
  const item=outcomes[i];const labels=[...DATASETS.map(item=>item.key),'MOE school programmes',...(includeDirectories?DIRECTORY_SOURCES.map(x=>x.name):[]),...(includeSfa?[SFA_SOURCE]:[])];
  const label=labels[i];
  if(item.status==='fulfilled'){
   sources.push({name:item.value.key,found:item.value.candidates.length,cached:!!item.value.cached,snapshotAt:item.value.snapshotAt||new Date().toISOString(),...(item.value.registerUpdated?{sourceUpdatedAt:item.value.registerUpdated}:{})});
   entries.push(...item.value.candidates);
  }else warnings.push(label+': '+(item.reason?.message||'unavailable'));
 }
 const schoolDirectory=outcomes.find(x=>x.status==='fulfilled'&&x.value.key==='MOE school programmes')?.value.directory;
 if(schoolDirectory)enrichSchoolGardenLocations(entries,schoolDirectory);
 signal?.throwIfAborted();
 const fetchedAt=new Date().toISOString();
 const candidates=uniqueCandidates(entries).map(p=>({...p,sourcedAt:fetchedAt,lastSeenAt:fetchedAt,evidenceEntries:(p.evidenceEntries?.length?p.evidenceEntries:[{source:p.source,url:p.sourceUrl,claim:'Official or mapped source lists '+p.name}]).map(e=>({...e,checkedAt:fetchedAt}))}));
 if(!candidates.length)throw Object.assign(new Error('No discovery source available: '+warnings.join(' / ')),{status:503});
 return {candidates,sources,warnings};
}
