import {isIP} from 'node:net';
const MAX_PAGE=250000;
const EMAIL=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
export function publicWebUrl(value){
 try{
  const u=new URL(value);
  const host=u.hostname.toLowerCase();
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password||isIP(host)||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||!host.includes('.'))return null;
  if(u.port && !['80','443'].includes(u.port))return null;
  return u;
 }catch{return null;}
}
function decodeHtml(s){return s.replace(/&#64;|&commat;/gi,'@').replace(/&#46;|&period;/gi,'.').replace(/&amp;/gi,'&');}
export function findPublishedEmail(html){
 const text=decodeHtml(String(html||''));
 const mailto=[...text.matchAll(/href\s*=\s*["']mailto:([^"'?\s]+)(?:\?[^"']*)?["']/gi)].map(m=>m[1]);
 const all=[...mailto,...(text.match(EMAIL)||[])].map(x=>x.trim().toLowerCase().replace(/[)>.,;]+$/g,''));
 return all.find(x=>/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(x)&&!/\.(png|svg|gif|jpeg|jpg|webp)$/i.test(x))||'';
}
export function findContactPages(html,origin){
 const candidates=[];
 for(const match of String(html||'').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  if(!/contact|enquir|reach us/i.test(match[1]+' '+match[2].replace(/<[^>]+>/g,' ')))continue;
  try{const url=new URL(match[1],origin);if(publicWebUrl(url.href)&&url.origin===origin.origin&&!candidates.includes(url.href))candidates.push(url.href);}catch{}
 }
 return candidates.slice(0,2);
}

function visibleText(html){
 return decodeHtml(String(html||'')
  .replace(/<(?:script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\s*(?:script|style|svg|noscript)>/gi,' ')
  .replace(/<[^>]*>/g,' ')
  .replace(/&nbsp;/gi,' '))
  .replace(/\s+/g,' ').trim();
}
const ADDRESS_CONTEXT=/singapore|road|street|avenue|lane|drive|way|walk|crescent|close|place|lorong|jalan|industrial|building|farm|park|neo tiew|lim chu kang|sungei tengah|kranji|jurong|seletar|tampines|pasir ris|punggol|bukit|choa chu kang|woodlands|mandai/i;
export function findPublishedSingaporePostal(html,postalLookup){
 if(!postalLookup||typeof postalLookup!=='object')return null;
 const text=visibleText(html),hits=[];
 for(const match of text.matchAll(/\b[0-8]\d{5}\b/g)){
  const code=match[0];
  if(!postalLookup[code])continue;
  const start=Math.max(0,match.index-120),end=Math.min(text.length,match.index+code.length+120);
  const context=text.slice(start,end);
  if(!ADDRESS_CONTEXT.test(context))continue;
  hits.push({postalCode:code,excerpt:context.trim()});
 }
 const codes=[...new Set(hits.map(x=>x.postalCode))];
 if(codes.length!==1)return null;
 return hits.find(x=>x.postalCode===codes[0])||null;
}
export async function researchPublishedLocation(partner,{httpFetch=fetch,timeoutMs=4500,signal,postalLookup}={}){
 signal?.throwIfAborted();
 const start=publicWebUrl(partner.websiteUrl),checkedAt=new Date().toISOString();
 if(!start||!postalLookup)return {postalCode:'',sourceUrl:'',checkedAt,tried:0,pagesRead:0};
 let urls=[start.href],tried=0,pagesRead=0;const found=[];
 for(let i=0;i<urls.length&&i<3;i++){
  signal?.throwIfAborted();const url=urls[i];tried++;
  try{
   const res=await httpFetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs),redirect:'manual',headers:{Accept:'text/html','User-Agent':'CoffeeBot-IS463-Prototype/0.6'}});
   if(!res.ok||res.status>=300)continue;
   const mime=res.headers?.get?.('content-type')||'text/html';
   if(!/html|text/i.test(mime))continue;
   const html=(await res.text()).slice(0,MAX_PAGE);pagesRead++;
   const location=findPublishedSingaporePostal(html,postalLookup);
   if(location)found.push({...location,sourceUrl:url});
   if(i===0)urls=[...urls,...findContactPages(html,start)];
  }catch{signal?.throwIfAborted();}
 }
 const codes=[...new Set(found.map(x=>x.postalCode))];
 if(codes.length!==1)return {postalCode:'',sourceUrl:'',checkedAt,tried,pagesRead,ambiguous:codes.length>1};
 const hit=found.find(x=>x.postalCode===codes[0]);
 return {postalCode:hit.postalCode,sourceUrl:hit.sourceUrl,excerpt:hit.excerpt,checkedAt,tried,pagesRead};
}
export async function researchPublicContact(partner,{httpFetch=fetch,timeoutMs=4500,signal}={}){
 signal?.throwIfAborted();
 const start=publicWebUrl(partner.websiteUrl);
 if(!start)return {email:'',checkedAt:new Date().toISOString(),sourceUrl:''};
 let urls=[start.href];let tried=0;let pagesRead=0;let contactPageUrl='';
 for(let i=0;i<urls.length&&i<3;i++){
  signal?.throwIfAborted();const url=urls[i];tried++;
  try{
   const res=await httpFetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs),redirect:'manual',headers:{'Accept':'text/html','User-Agent':'CoffeeBot-IS463-Prototype/0.4'}});
   if(!res.ok||res.status>=300)continue;
   const mime=res.headers?.get?.('content-type')||'text/html';
   if(!/html|text/.test(mime))continue;
   const html=(await res.text()).slice(0,MAX_PAGE);pagesRead++;
   const email=findPublishedEmail(html);
   if(i>0&&!contactPageUrl)contactPageUrl=url;
   if(email)return {email,sourceUrl:url,contactPageUrl,checkedAt:new Date().toISOString(),tried,pagesRead};
   if(i===0)urls=[...urls,...findContactPages(html,start)];
  }catch{ signal?.throwIfAborted(); /* One site must not halt discovery. */ }
 }
 return {email:'',sourceUrl:'',contactPageUrl,checkedAt:new Date().toISOString(),tried,pagesRead};
}
