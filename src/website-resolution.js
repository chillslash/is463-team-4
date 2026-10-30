import {publicWebUrl} from './contacts.js';

const EXCLUDED_HOST=/(^|\.)(?:google\.[a-z.]+|bing\.com|duckduckgo\.com|facebook\.com|instagram\.com|linkedin\.com|x\.com|twitter\.com|wikipedia\.org|yellowpages\.[a-z.]+)$/i;
const LEGAL=new Set(['pte','ltd','limited','llp','llc','inc','incorporated','company','co','singapore','the','group','holdings']);
const textOnly=html=>String(html||'')
 .replace(/<(?:script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\s*(?:script|style|svg|noscript)>/gi,' ')
 .replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/gi,' ').replace(/&#\d+;/g,' ')
 .replace(/\s+/g,' ').trim();

export function websiteResolutionPrompt(partners){
 const input=partners.map(p=>({id:p.id,name:p.name,category:p.category,source:p.source,
  sourceUrl:p.sourceUrl||null,location:p.location||null}));
 return [
  'Use live web search only to identify the most credible official public website or official organisation-specific page for each Singapore organisation below.',
  'Return exactly JSON: {"organisations":[{"id":"matching id","websiteUrl":"https://..." or null,"reason":"short verification reason"}]}. Return one row for every id.',
  'Prefer the organisation’s own website. An official government page specifically about that named organisation/site is acceptable when no separate website exists.',
  'Do not return search-result pages, social-media profiles, generic directories, news articles, map listings, aggregators, or a source directory merely because it contains the organisation name.',
  'Use null when the official site cannot be identified confidently. Never invent a domain. The result is only a candidate URL and will be independently checked before saving.',
  JSON.stringify(input)
 ].join('\n');
}

export function validateWebsiteResolutions(payload,partners){
 if(!Array.isArray(payload?.organisations))throw new Error('Website resolution response is missing organisations');
 const allowed=new Set(partners.map(p=>p.id)),seen=new Set(),result=[];
 for(const item of payload.organisations){
  if(!allowed.has(item?.id)||seen.has(item.id))continue;
  seen.add(item.id);
  if(item.websiteUrl===null||item.websiteUrl===''){result.push({id:item.id,websiteUrl:null,reason:String(item.reason||'').slice(0,220)});continue;}
  const url=publicWebUrl(item.websiteUrl);
  if(!url||url.protocol!=='https:'||EXCLUDED_HOST.test(url.hostname))continue;
  url.hash='';
  result.push({id:item.id,websiteUrl:url.href,reason:String(item.reason||'').slice(0,220)});
 }
 return result;
}

function nameTokens(name){
 const values=String(name||'').toLowerCase().replace(/&/g,' and ').match(/[a-z0-9]{2,}/g)||[];
 const filtered=[...new Set(values.filter(x=>!LEGAL.has(x)))];
 return filtered.length?filtered:values;
}
export function websiteIdentityMatches(partner,html){
 const page=textOnly(html).toLowerCase();
 const tokens=nameTokens(partner.name);
 if(!tokens.length||!page)return false;
 const matched=tokens.filter(token=>page.includes(token)).length;
 return tokens.length<=2?matched===tokens.length:matched>=Math.min(2,Math.ceil(tokens.length/2));
}

export async function verifyResolvedWebsite(partner,candidateUrl,{httpFetch=fetch,timeoutMs=5000,signal}={}){
 signal?.throwIfAborted();
 let url=publicWebUrl(candidateUrl);
 const checkedAt=new Date().toISOString();
 if(!url||url.protocol!=='https:'||EXCLUDED_HOST.test(url.hostname))return {ok:false,checkedAt,reason:'Invalid or excluded website'};
 for(let redirect=0;redirect<2;redirect++){
  signal?.throwIfAborted();
  try{
   const res=await httpFetch(url.href,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs),
    redirect:'manual',headers:{Accept:'text/html','User-Agent':'CoffeeBot-IS463-Prototype/0.5'}});
   if(res.status>=300&&res.status<400){
    const location=res.headers?.get?.('location');
    const next=location?publicWebUrl(new URL(location,url.href).href):null;
    if(!next||next.protocol!=='https:'||EXCLUDED_HOST.test(next.hostname))return {ok:false,checkedAt,reason:'Unsafe website redirect'};
    url=next;continue;
   }
   if(!res.ok||!/html|text/i.test(res.headers?.get?.('content-type')||'text/html'))return {ok:false,checkedAt,reason:'Website could not be verified'};
   const html=(await res.text()).slice(0,220000);
   if(!websiteIdentityMatches(partner,html))return {ok:false,checkedAt,reason:'Website did not clearly identify the organisation'};
   return {ok:true,websiteUrl:url.href,checkedAt,reason:'Official website identity matched'};
  }catch(err){signal?.throwIfAborted();return {ok:false,checkedAt,reason:'Website could not be verified'};}
 }
 return {ok:false,checkedAt,reason:'Too many website redirects'};
}
