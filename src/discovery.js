import {cibCandidates, nparksCandidates, osmCandidates} from './core.js';

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
  ');out center 140;';
export function uniqueCandidates(candidates) {
 const keys=new Set();const result=[];
 for(const p of candidates) {
   const key=p.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
   const close=result.some(a => a.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()===key &&
     Number.isFinite(p.lat) && Number.isFinite(a.lat) && Math.abs(p.lat-a.lat)<0.008 && Math.abs(p.lon-a.lon)<0.008);
   if(keys.has(p.id)||close)continue;
   keys.add(p.id); result.push(p);
 }
 return result;
}
async function withDeadline(fn,timeoutMs) {
 const c=new AbortController();const timer=setTimeout(()=>c.abort(),timeoutMs);
 try{return await fn(c.signal);}finally{clearTimeout(timer);}
}
async function fetchDataset(item, reference, httpFetch) {
 return withDeadline(async signal=>{
   const r=await httpFetch(DATA_URL+item.id+'/poll-download',{signal});
   if(!r.ok)throw new Error('metadata HTTP '+r.status);
   const meta=await r.json(); const url=meta?.data?.url;
   // Only follow the signed official dataset object-storage URLs advertised by data.gov.sg.
   if(meta.code!==0||!url?.startsWith('https://'))throw new Error('dataset URL unavailable');
   const endpoint=new URL(url);
   if(!endpoint.hostname.endsWith('.amazonaws.com')&&!endpoint.hostname.endsWith('.data.gov.sg'))throw new Error('unexpected data host');
   const data=await httpFetch(url,{signal});
   if(!data.ok)throw new Error('dataset HTTP '+data.status);
   const candidates=item.converter(await data.json(),reference);
   if(!candidates.length)throw new Error('no eligible named locations');
   return {key:item.key,candidates};
 },13000);
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
export async function discoverAll(reference,{httpFetch=fetch,includeOSM=true}={}){
 // Independent sources: a failed OSM endpoint must never suppress community gardens or parks.
 const requests=DATASETS.map(item=>fetchDataset(item,reference,httpFetch));
 if(includeOSM)requests.push(fetchOSM(reference,httpFetch));
 const outcomes=await Promise.allSettled(requests),sources=[],warnings=[],entries=[];
 for(let i=0;i<outcomes.length;i++){
  const item=outcomes[i];const label=i<DATASETS.length?DATASETS[i].key:'OpenStreetMap';
  if(item.status==='fulfilled'){
   sources.push({name:item.value.key,found:item.value.candidates.length});
   entries.push(...item.value.candidates);
  }else warnings.push(label+': '+(item.reason?.message||'unavailable'));
 }
 const candidates=uniqueCandidates(entries);
 if(!candidates.length)throw Object.assign(new Error('No discovery source available: '+warnings.join(' / ')),{status:503});
 return {candidates,sources,warnings};
}
