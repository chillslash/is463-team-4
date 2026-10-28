import {publicWebUrl} from './contacts.js';

const SIGNALS=/\b(?:coffee grounds?|spent grounds?|compost(?:ing)?|mushroom|mycelium|fungi|fungal|hydroponics?|aeroponics?|substrate|fertilis(?:er|ation)|horticultur\w*|nursery|planting|soil amendments?|organic by-products?|food waste|rubber flooring|grow(?:ing|th) media|black soldier fly)\b/i;
const BLOCK=/<(?:script|style|nav|footer|header|aside|svg|noscript)\b[^>]*>[\s\S]*?<\/\s*(?:script|style|nav|footer|header|aside|svg|noscript)>/gi;
function plain(html){
 return String(html||'').replace(BLOCK,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/gi,' ').replace(/&#\d+;/g,' ')
  .replace(/\s+/g,' ').trim();
}
export function extractMaterialEvidence(html){
 const structured=String(html||'').replace(/<\\/(?:p|li|h[1-6]|section|article|div)>/gi,'. ');
 const text=plain(structured).slice(0,160000);
 const sentences=text.split(/(?<=[.!?])\s+|\s{2,}/);
 const selected=[];
 for(const piece of sentences){
  const p=piece.trim();
  if(p.length<45||p.length>650||!SIGNALS.test(p))continue;
  if(/\b(?:privacy policy|all rights reserved|cookie preferences)\b/i.test(p))continue;
  if(!selected.includes(p))selected.push(p);
  if(selected.length>=3)break;
 }
 return selected.map(x=>x.slice(0,400));
}
export async function researchOrganisationEvidence(partner,{httpFetch=fetch,timeoutMs=4500,signal}={}){
 const url=publicWebUrl(partner.websiteUrl);
 if(!url||url.protocol!=='https:')return {checkedAt:new Date().toISOString(),entries:[],reason:'No valid HTTPS organisation website'};
 signal?.throwIfAborted();
 try{
  const r=await httpFetch(url.href,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs),
   redirect:'manual',headers:{Accept:'text/html','User-Agent':'CoffeeBot-IS463-Prototype/0.4'}});
  if(!r.ok||r.status>=300||!/html|text/i.test(r.headers?.get?.('content-type')||'text/html'))
   return {checkedAt:new Date().toISOString(),entries:[],reason:'No accessible text page'};
  const snippets=extractMaterialEvidence((await r.text()).slice(0,220000));
  return {checkedAt:new Date().toISOString(),entries:snippets.map(claim=>({
   source:'Organisation website excerpt (unverified)',
   url:url.href,claim,checkedAt:new Date().toISOString()
  })),reason:snippets.length?'Published material-specific excerpts found':'No specific reuse or cultivation text found'};
 }catch(err){
  signal?.throwIfAborted();
  return {checkedAt:new Date().toISOString(),entries:[],reason:'Organisation website unavailable'};
 }
}
