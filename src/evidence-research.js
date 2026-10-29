import {publicWebUrl} from './contacts.js';

const SIGNALS=/\b(?:coffee grounds?|spent grounds?|compost(?:ing)?|mushroom|mycelium|fungi|fungal|hydroponics?|aeroponics?|substrate|fertilis(?:er|ation)|horticultur\w*|nursery|planting|soil amendments?|organic by-products?|food waste|rubber flooring|grow(?:ing|th) media|black soldier fly)\b/i;
const BLOCK=/<(?:script|style|nav|footer|header|aside|svg|noscript)\b[^>]*>[\s\S]*?<\/\s*(?:script|style|nav|footer|header|aside|svg|noscript)>/gi;
function plain(html){
 return String(html||'').replace(BLOCK,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/gi,' ').replace(/&#\d+;/g,' ')
  .replace(/\s+/g,' ').trim();
}
export function extractMaterialEvidence(html){
 const structured=String(html||'').replace(/<\/(?:p|li|h[1-6]|section|article|div)>/gi,'. ');
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
// Only inspect clearly relevant, same-origin public pages linked by the organisation.
// Never broaden a directory entry into an assumed organisation website.
export function findEvidencePages(html,home){
 const result=[],seen=new Set([home.href]);
 for(const match of String(html||'').matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)){
  let next;
  try{next=new URL(match[2],home.href);}catch{continue;}
  if(next.protocol!=='https:'||next.origin!==home.origin||next.username||next.password)continue;
  if(/\.(?:pdf|docx?|xlsx?|zip|png|jpe?g|svg)(?:$|[?#])/i.test(next.pathname))continue;
  next.hash='';
  if(seen.has(next.href))continue;
  const hint=(next.pathname+' '+plain(match[3])).toLowerCase();
  if(!/(?:about|service|project|research|production|process|grow|garden|farm|nursery|compost|mushroom|substrate|horticultur|sustainab|environment|waste|recycl|facilit)/.test(hint))continue;
  seen.add(next.href);
  const priority=/(?:service|project|research|production|process|grow|garden|farm|compost|mushroom|substrate|waste|recycl)/.test(hint)?2:1;
  result.push({url:next.href,priority});
 }
 return result.sort((a,b)=>b.priority-a.priority).slice(0,2).map(x=>x.url);
}
export async function researchOrganisationEvidence(partner,{httpFetch=fetch,timeoutMs=4500,signal}={}){
 const home=publicWebUrl(partner.websiteUrl);
 const checkedAt=new Date().toISOString();
 if(!home||home.protocol!=='https:')return {checkedAt,entries:[],pagesRead:0,reason:'No valid HTTPS organisation website'};
 signal?.throwIfAborted();
 const urls=[home.href],entries=[],seenClaims=new Set();
 let pagesRead=0;
 for(let i=0;i<urls.length&&i<3;i++){
  signal?.throwIfAborted();
  try{
   const r=await httpFetch(urls[i],{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs),
    redirect:'manual',headers:{Accept:'text/html','User-Agent':'CoffeeBot-IS463-Prototype/0.4'}});
   if(!r.ok||r.status>=300||!/html|text/i.test(r.headers?.get?.('content-type')||'text/html'))continue;
   const html=(await r.text()).slice(0,220000);
   pagesRead++;
   if(i===0)urls.push(...findEvidencePages(html,home));
   for(const claim of extractMaterialEvidence(html).slice(0,2)){
    if(seenClaims.has(claim))continue;
    seenClaims.add(claim);
    entries.push({source:'Organisation website excerpt (unverified)',url:urls[i],claim,checkedAt});
   }
  }catch(err){signal?.throwIfAborted();/* One inaccessible page must not block another. */}
 }
 return {checkedAt,entries:entries.slice(0,6),pagesRead,
  reason:entries.length?'Published material-specific excerpts found':pagesRead?'No specific reuse or cultivation text found':'No accessible text page'};
}
