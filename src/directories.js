import {createHash} from 'node:crypto';

export const NEA_URL='https://www.nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/food-waste-management/food-distribution-organisations-local-recycling-facilities-and-suppliers';
export const LIAS_URL='https://lias.org.sg/members-list/';
export const DIRECTORY_SOURCES=[
 {name:'NEA Food Waste Recycling Facilities',url:NEA_URL,parse:neaCandidates},
 {name:'LIAS Landscaping Directory',url:LIAS_URL,parse:liasCandidates}
];
function plain(raw=''){
 return String(raw).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')
 .replace(/<br\s*\/?>/gi,' ').replace(/<[^>]*>/g,' ')
 .replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();
}
function tableRows(html){
 return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>plain(c[1]))).filter(r=>r.length);
}
const id=s=>createHash('sha256').update(s.toLowerCase().trim()).digest('hex').slice(0,15);
function candidate(name,category,description,source,url,claim,extra={}){
 return {id:'directory-'+id(source+':'+name),name,category,status:'suggested',capacityKg:null,
 verified:false,confirmed:false,frequency:'unknown',use:description,source,sourceUrl:url,
 location:extra.location||'',lat:null,lon:null,distanceKm:null,contactName:'',contactEmail:'',
 evidenceEntries:[{source,url,claim}],notes:'Public directory entry is a potential lead; operational suitability requires confirmation.', ...extra};
}
export function neaCandidates(html){
 // NEA's first table lists recycling facilities; a separate table lists equipment suppliers.
 const start=html.toLowerCase().indexOf('local food waste recycling facilities');
 if(start<0)return [];
 const table=html.slice(start).match(/<table\b[\s\S]*?<\/table>/i)?.[0];if(!table)return [];
 return tableRows(table).map((row,index)=>{
  if(row.length<3)return null;
  const [rawName,,materials]=row;if(!rawName||!materials)return null;
  let name=rawName.replace(/\s*Website:.*/i,'').trim();
  // Website text sometimes appears inside the name cell; only the organisation name is retained.
  const rawRows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].filter(r=>/<td\b/i.test(r[1]));
  const original=rawRows[index]?.[1];
  if(original){const first=original.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i)?.[1]||'';const strong=[...first.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)].map(m=>plain(m[1]));if(strong.length)name=strong.filter(Boolean).join('').trim();}
  const explicit=/used coffee grounds|spent coffee grounds|coffee grounds/i.test(materials);
  const claim='NEA lists '+name+' as a recycling facility; its accepted-material listing says: '+materials.slice(0,320);
  return candidate(name,'organic waste recycler',explicit?'NEA explicitly lists used coffee grounds among accepted waste materials.':'NEA lists this facility and these accepted materials: '+materials.slice(0,260),
   'NEA Food Waste Recycling Facilities',NEA_URL,claim,{directCoffeeEvidence:explicit,materialEvidence:materials.slice(0,450)});
 }).filter(Boolean).slice(0,35);
}
export function liasCandidates(html){
 const table=html.match(/<table\b[^>]*id=["']tablepress-1["'][\s\S]*?<\/table>/i)?.[0];if(!table)return [];
 return tableRows(table).map(row=>{
  if(row.length<3)return null;
  const [type,name,address]=row;if(!name||name.length<4)return null;
  return candidate(name,/nurser|garden|horticultur|farm/i.test(name)?'horticultural business':'landscaping business',
   'Listed LIAS member. Relevant operations and acceptance of spent grounds have not been verified.',
   'LIAS Member Directory',LIAS_URL,
   'LIAS lists '+name+' as a '+type+' member'+(address?' with address '+address:''),
   {location:address.slice(0,190)});
 }).filter(Boolean).slice(0,85);
}
