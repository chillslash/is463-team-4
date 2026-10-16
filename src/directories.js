import {createHash} from 'node:crypto';
export const NEA_URL='https://www.nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/food-waste-management/food-distribution-organisations-local-recycling-facilities-and-suppliers';
export const LIAS_URL='https://lias.org.sg/members-list/';
export const DIRECTORY_SOURCES=[{name:'NEA Food Waste Recycling Facilities',url:NEA_URL,parse:neaCandidates},{name:'LIAS Landscaping Directory',url:LIAS_URL,parse:liasCandidates}];
const plain=(raw='')=>String(raw).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();
const rows=html=>[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>c[1])).filter(x=>x.length);
const emailFrom=s=>{const found=plain(s).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);return found?.[0]?.toLowerCase()||'';};
const nameId=s=>createHash('sha256').update(s.toLowerCase().trim()).digest('hex').slice(0,15);
const hyperlink=s=>{for(const m of String(s).matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)){try{const u=new URL(m[1]);if(['http:','https:'].includes(u.protocol))return u.href;}catch{}}return '';};
function candidate(name,category,description,source,url,claim,extra={}){
 return {id:'directory-'+nameId(source+':'+name),name,category,status:'suggested',capacityKg:null,
 verified:false,confirmed:false,frequency:'unknown',use:description,source,sourceUrl:url,
 location:extra.location||'',lat:null,lon:null,distanceKm:null,contactName:'',contactEmail:'',
 evidenceEntries:[{source,url,claim}],notes:'Contact and collection arrangements require confirmation.', ...extra};
}
export function neaCandidates(html){
 const start=html.toLowerCase().indexOf('local food waste recycling facilities');
 if(start<0)return [];
 const table=html.slice(start).match(/<table\b[\s\S]*?<\/table>/i)?.[0];if(!table)return [];
 return rows(table).map(row=>{
  if(row.length<3)return null;
  const [nameHtml,contactHtml,materialsHtml]=row,materials=plain(materialsHtml);
  const strong=[...nameHtml.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)].map(m=>plain(m[1])).filter(Boolean);
  const name=(strong.length?strong.join(''):plain(nameHtml).replace(/\s*Website:.*/i,'')).trim();
  if(!name||!materials)return null;
  const contact=plain(contactHtml),email=emailFrom(contactHtml);
  const person=(contact.match(/Contact person:\s*([^:]+?)(?=\s*(?:Email|Contact No\.|Contact person:)|$)/i)?.[1]||'').trim().slice(0,120);
  const websiteUrl=hyperlink(nameHtml),directCoffeeEvidence=/\b(?:used|spent)?\s*coffee grounds\b/i.test(materials);
  const claim='NEA lists '+name+' as a recycling facility; accepted materials: '+materials.slice(0,300);
  const extra={directCoffeeEvidence,materialEvidence:materials.slice(0,450),websiteUrl,contactName:person,contactEmail:email,
    ...(email?{contactEvidence:{source:'NEA Food Waste Recycling Facilities',url:NEA_URL,checkedAt:new Date().toISOString(),method:'directory'}}:{})};
  return candidate(name,'organic waste recycler',directCoffeeEvidence?'NEA explicitly lists used coffee grounds among accepted materials.':'NEA lists accepted materials: '+materials.slice(0,260),
   'NEA Food Waste Recycling Facilities',NEA_URL,claim,extra);
 }).filter(Boolean).slice(0,35);
}
export function liasCandidates(html){
 const table=html.match(/<table\b[^>]*id=["']tablepress-1["'][\s\S]*?<\/table>/i)?.[0];if(!table)return [];
 return rows(table).map(row=>{
  if(row.length<3)return null;
  const [typeRaw,nameRaw,addressRaw,,emailRaw='',websiteRaw='']=row;
  const name=plain(nameRaw),address=plain(addressRaw),email=emailFrom(emailRaw),websiteUrl=hyperlink(websiteRaw);
  if(!name||name.length<4)return null;
  return candidate(name,/nurser|garden|horticultur|farm/i.test(name)?'horticultural business':'landscaping business',
   'Listed LIAS member. Grounds-reuse operations require confirmation.',
   'LIAS Member Directory',LIAS_URL,
   'LIAS lists '+name+' as a '+plain(typeRaw)+' member'+(address?' at '+address.slice(0,160):''),
   {location:address.slice(0,190),websiteUrl,contactEmail:email,...(email?{contactEvidence:{source:'LIAS Member Directory',url:LIAS_URL,checkedAt:new Date().toISOString(),method:'directory'}}:{})});
 }).filter(Boolean).slice(0,85);
}
