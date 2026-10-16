
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const CACHE_DIR=process.env.SOURCE_CACHE_DIR||join(process.cwd(),'data','source-cache');
const DAY_MS=24*60*60*1000;
function cachedResponse(body,savedAt,fromCache){return {json:async()=>JSON.parse(body),text:async()=>body,snapshotAt:savedAt,fromCache};}
import {cibCandidates, nparksCandidates, osmCandidates} from './core.js';
import {moeSchoolCandidates,parseCSV,SCHOOL_PROGRAMMES_ID,SCHOOL_DIRECTORY_ID} from './moe.js';

const DATA_URL = 'https://api-open.data.gov.sg/v1/public/api/datasets/';
const DATASETS = [
  {key:'Community in Bloom', id:'d_f91a8b057cfb2bebf2e531ad8061e1c1', converter:cibCandidates},
  {key:'NParks public parks', id:'d_0542d48f0991541706b58059381a6eca', converter:nparksCandidates}
];
const OSM_ENDPOINTS = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
// Named growing sites, nurseries, urban farms, parks and major gardens / zoos.
// OSM maps a place; it does not confirm an accepting organisation or approval authority.
const OSM_QUERY = '[out:json][timeout:14];('+
  'nwr["shop"~"^(garden_centre|nursery)$"]["name"](1.22,103.60,1.48,104.04);'+
  'nwr["landuse"~"^(allotments|farmland)$"]["name"](1.22,103.60,1.48,104.04);'+
  'nwr["leisure"~"^(garden|park)$"]["name"](1.22,103.60,1.48,104.04);'+
  'nwr["tourism"="zoo"]["name"](1.22,103.60,1.48,104.04);'+
  'nwr["amenity"="school"]["garden"]["name"](1.22,103.60,1.48,104.04);'+
  ');out center 140;';
export function uniqueCandidates(candidates) {
 const result=[];const key=p=>p.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 for(const p of candidates){
  const existing=result.find(a=>a.id===p.id || (key(a)===key(p) && (!Number.isFinite(a.lat)||!Number.isFinite(p.lat) || (Math.abs(a.lat-p.lat)<0.008&&Math.abs(a.lon-p.lon)<0.008))));
  if(!existing){result.push(p);continue;}
  const original=existing.evidenceEntries||[{source:existing.source,url:existing.sourceUrl,claim:'Dataset lists '+existing.name}];
  const extras=p.evidenceEntries||[{source:p.source,url:p.sourceUrl,claim:'Dataset lists '+p.name}];
  existing.evidenceEntries=[...original,...extras].filter((e,i,arr)=>arr.findIndex(x=>x.source===e.source&&x.url===e.url)===i);
  if(!Number.isFinite(existing.lat) && Number.isFinite(p.lat)){existing.lat=p.lat;existing.lon=p.lon;existing.distanceKm=p.distanceKm;existing.location=p.location;}
  if(existing.category==='school programme'&&p.category==='school garden')existing.category='school garden';
 }
 return result;
}

async function withDeadline(fn,timeoutMs) {
 const c=new AbortController();const timer=setTimeout(()=>c.abort(),timeoutMs);
 try{return await fn(c.signal);}finally{clearTimeout(timer);}
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

async function fetchDataset(item,reference,httpFetch,useCache){
 return withDeadline(async signal=>{
 const response=await officialDownload(item.id,httpFetch,signal,useCache);
 const candidates=item.converter(await response.json(),reference);
 if(!candidates.length)throw new Error('no eligible named locations');
 return {key:item.key,candidates,cached:response.fromCache,snapshotAt:response.snapshotAt};
 },15000);
}
async function fetchSchools(reference,httpFetch,useCache){
 return withDeadline(async signal=>{
  const [programmeResponse,directoryResponse]=await Promise.all([
    officialDownload(SCHOOL_PROGRAMMES_ID,httpFetch,signal,useCache),
    officialDownload(SCHOOL_DIRECTORY_ID,httpFetch,signal,useCache)
  ]);
  const candidates=moeSchoolCandidates(parseCSV(await programmeResponse.text()),parseCSV(await directoryResponse.text()),reference);
  if(!candidates.length)throw new Error('no sustainability-related school programmes');
  return {key:'MOE school programmes',candidates,cached:programmeResponse.fromCache||directoryResponse.fromCache,snapshotAt:programmeResponse.snapshotAt};
 },18000);
}

async function fetchOSM(reference,httpFetch) {
 let error='';
 for(const endpoint of OSM_ENDPOINTS){
  try{return await withDeadline(async signal=>{
    const r=await httpFetch(endpoint,{method:'POST',signal,headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'CoffeeBot-IS463-Prototype/0.2'},body:new URLSearchParams({data:OSM_QUERY})});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const json=await r.json();if(!Array.isArray(json.elements))throw new Error('invalid OSM response');
    const candidates=osmCandidates(json.elements,reference);
    if(!candidates.length)throw new Error('no relevant named locations');
    return {key:'OpenStreetMap',candidates};
   },12000);}
  catch(e){error=e.name==='AbortError'?'timed out':e.message;}
 }
 throw new Error(error||'OSM service unavailable');
}
export async function discoverAll(reference,{httpFetch=fetch,includeOSM=true,useCache=httpFetch===fetch}={}){
 // Independent sources: a failed OSM endpoint must never suppress community gardens or parks.
 const requests=DATASETS.map(item=>fetchDataset(item,reference,httpFetch,useCache));
 requests.push(fetchSchools(reference,httpFetch,useCache));
 if(includeOSM)requests.push(fetchOSM(reference,httpFetch));
 const outcomes=await Promise.allSettled(requests),sources=[],warnings=[],entries=[];
 for(let i=0;i<outcomes.length;i++){
  const item=outcomes[i];const label=i<DATASETS.length?DATASETS[i].key:i===DATASETS.length?'MOE school programmes':'OpenStreetMap';
  if(item.status==='fulfilled'){
   sources.push({name:item.value.key,found:item.value.candidates.length,cached:!!item.value.cached,snapshotAt:item.value.snapshotAt||new Date().toISOString()});
   entries.push(...item.value.candidates);
  }else warnings.push(label+': '+(item.reason?.message||'unavailable'));
 }
 const fetchedAt=new Date().toISOString();
 const candidates=uniqueCandidates(entries).map(p=>({...p,sourcedAt:fetchedAt,lastSeenAt:fetchedAt,evidenceEntries:(p.evidenceEntries?.length?p.evidenceEntries:[{source:p.source,url:p.sourceUrl,claim:'Official or mapped source lists '+p.name}]).map(e=>({...e,checkedAt:fetchedAt}))}));
 if(!candidates.length)throw Object.assign(new Error('No discovery source available: '+warnings.join(' / ')),{status:503});
 return {candidates,sources,warnings};
}
