// Geocoding is deliberately classical: reuse postal coordinates and only make
// token-authenticated OneMap requests when credentials are explicitly configured.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {distanceKm} from './core.js';

const POSTAL_FILE=process.env.POSTAL_COORDINATES_FILE||join(process.cwd(),'data','source-cache','sg-postal-coordinates-2023.json');
const CACHE_FILE=process.env.GEOCODE_CACHE_FILE||join(process.cwd(),'data','geocode-cache.json');
const ONE_MAP='https://www.onemap.gov.sg';
let postalPromise=null,tokenCache=null;
const inSingapore=(lat,lon)=>Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=1.1&&lat<=1.55&&lon>=103.5&&lon<=104.1;
const postcodeOf=p=>{const raw=String(p.postalCode||p.location?.match(/\b[0-8]\d{5}\b/)?.[0]||'');return raw?raw.padStart(6,'0'):'';};
export const validCoordinates=(lat,lon)=>inSingapore(Number(lat),Number(lon));
export async function postalCoordinates(){
 if(!postalPromise)postalPromise=readFile(POSTAL_FILE,'utf8').then(JSON.parse).catch(()=>null);
 return postalPromise;
}
export function applyPostalCoordinates(partners,reference,codes){
 let resolved=0;
 if(!codes)return resolved;
 for(const p of partners){
  if(validCoordinates(p.lat,p.lon))continue;
  const code=postcodeOf(p),site=/^[0-8]\d{5}$/.test(code)?codes[code]:null;
  if(!site)continue;
  const lat=Number(site.lat),lon=Number(site.lon);
  if(!inSingapore(lat,lon))continue;
  p.lat=lat;p.lon=lon;
  p.distanceKm=distanceKm(reference.referenceLat,reference.referenceLon,lat,lon);
  p.coordinateSource='Singapore postal coordinate snapshot (2023)';
  resolved++;
 }
 return resolved;
}
async function requestJson(httpFetch,url,options={},signal){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await httpFetch(url,{...options,signal:signal?AbortSignal.any([controller.signal,signal]):controller.signal});
  if(!response.ok)throw Error('Geocoding HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timer);}
}
async function getToken(httpFetch,signal){
 signal?.throwIfAborted();
 if(tokenCache&&tokenCache.expires>Date.now()+60000)return tokenCache.value;
 if(process.env.ONEMAP_ACCESS_TOKEN)return process.env.ONEMAP_ACCESS_TOKEN;
 const email=process.env.ONEMAP_EMAIL,password=process.env.ONEMAP_PASSWORD;
 if(!email||!password)return null;
 const value=await requestJson(httpFetch,ONE_MAP+'/api/auth/post/getToken',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email,password})
 },signal);
 if(!value.access_token)throw Error('OneMap authentication failed');
 tokenCache={value:value.access_token,expires:Number(value.expiry_timestamp)*1000||Date.now()+3600000};
 return tokenCache.value;
}
const normalized=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function selectOneMapResult(results,p){
 if(!Array.isArray(results)||!results.length)return null;
 const code=postcodeOf(p),postal=/^[0-8]\d{5}$/.test(code)?code:null;
 const valid=results.filter(x=>inSingapore(Number(x.LATITUDE),Number(x.LONGITUDE)));
 const matched=postal
  ?valid.filter(x=>String(x.POSTAL||'').padStart(6,'0')===postal)
  :valid.filter(x=>{
   const name=normalized(p.name),building=normalized(x.BUILDING);
   return name.length>=8&&building.length>=8&&(building===name||building.includes(name)||name.includes(building));
  });
 if(!matched.length)return null;
 const unique=[...new Set(matched.map(x=>String(x.POSTAL||'')+':'+Number(x.LATITUDE).toFixed(5)+':'+Number(x.LONGITUDE).toFixed(5)))];
 if(unique.length!==1)return null;
 return {lat:Number(matched[0].LATITUDE),lon:Number(matched[0].LONGITUDE),address:matched[0].ADDRESS||'',postalCode:String(matched[0].POSTAL||'')};
}
export async function resolveLocations(partners,reference,{httpFetch=fetch,lookup,allowOneMap=true,signal}={}){
 signal?.throwIfAborted();
 const resolvedPostal=applyPostalCoordinates(partners,reference,lookup===undefined?await postalCoordinates():lookup);
 signal?.throwIfAborted();
 let resolvedOneMap=0;
 if(!allowOneMap||(!process.env.ONEMAP_ACCESS_TOKEN&&!(process.env.ONEMAP_EMAIL&&process.env.ONEMAP_PASSWORD)))
  return {resolvedPostal,resolvedOneMap,unresolved:partners.filter(p=>!validCoordinates(p.lat,p.lon)).length};
 const pending=partners.filter(p=>!validCoordinates(p.lat,p.lon)).slice(0,30);
 let cache={};
 try{cache=JSON.parse(await readFile(CACHE_FILE,'utf8'));}catch{}
 let token;
 try{token=await getToken(httpFetch,signal);}catch{signal?.throwIfAborted();return {resolvedPostal,resolvedOneMap,unresolved:pending.length};}
 for(const p of pending){signal?.throwIfAborted();
  const query=postcodeOf(p).match(/^[0-8]\d{5}$/)?.[0]||p.name;
  if(!query)continue;
  const cacheKey=query.toLowerCase(),previous=cache[cacheKey];
  let match=previous&&Date.now()-Date.parse(previous.at)<30*86400000?previous.result:undefined;
  if(match===undefined){
   try{
    const params=new URLSearchParams({searchVal:query,returnGeom:'Y',getAddrDetails:'Y',pageNum:'1'});
    const payload=await requestJson(httpFetch,ONE_MAP+'/api/common/elastic/search?'+params,{headers:{Authorization:token}},signal);
    match=selectOneMapResult(payload.results,p);
    cache[cacheKey]={at:new Date().toISOString(),result:match};
   }catch{signal?.throwIfAborted();continue;}
  }
  if(match&&inSingapore(match.lat,match.lon)){
   p.lat=match.lat;p.lon=match.lon;
   p.distanceKm=distanceKm(reference.referenceLat,reference.referenceLon,match.lat,match.lon);
   p.coordinateSource='OneMap search';
   if(!p.location||p.location==='Address not recorded')p.location=match.address||p.location;
   if(!p.postalCode&&/^[0-8]\d{5}$/.test(match.postalCode))p.postalCode=match.postalCode;
   resolvedOneMap++;
  }
 }
 signal?.throwIfAborted();
 try{await mkdir(dirname(CACHE_FILE),{recursive:true});await writeFile(CACHE_FILE,JSON.stringify(cache),'utf8');}catch{}
 return {resolvedPostal,resolvedOneMap,unresolved:partners.filter(p=>!validCoordinates(p.lat,p.lon)).length};
}
