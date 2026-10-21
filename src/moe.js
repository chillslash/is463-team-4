import {distanceKm} from './core.js';

export const SCHOOL_PROGRAMMES_URL='https://data.gov.sg/datasets/d_db1faeea02c646fa3abccfa5aba99214/view';
export const SCHOOL_DIRECTORY_URL='https://data.gov.sg/datasets/d_688b934f82c1059ed0a6993d2a829089/view';
export const SCHOOL_PROGRAMMES_ID='d_db1faeea02c646fa3abccfa5aba99214';
export const SCHOOL_DIRECTORY_ID='d_688b934f82c1059ed0a6993d2a829089';

export function parseCSV(csv) {
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<csv.length;i++){
   const c=csv[i];
   if(c==='"'){if(quoted&&csv[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
   else if(c===','&&!quoted){row.push(field);field='';}
   else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&csv[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}
   else field+=c;
 }
 row.push(field);if(row.some(Boolean))rows.push(row);
 const headers=(rows.shift()||[]).map((s,i)=>i===0?s.replace(/^\uFEFF/,'').trim():s.trim());
 return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,(values[i]||'').trim()])));
}
const key=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function enrichSchoolGardenLocations(partners,directory) {
 const official=new Map((directory||[]).map(row=>[key(row.school_name),row]));
 let resolved=0;
 for(const p of partners){
  if(p.category!=='school garden'||!String(p.source||'').includes('Community in Bloom'))continue;
  if(!/registered Community in Bloom location|Address not recorded|^Singapore/i.test(String(p.location||'')))continue;
  const contact=official.get(key(p.name));
  if(!contact?.address)continue;
  const postal=/^\d{5,6}$/.test(contact.postal_code||'')?contact.postal_code.padStart(6,'0'):'';
  p.location=contact.address.trim().replace(/\s+/g,' ')+(postal?' Singapore '+postal:'');
  if(postal)p.postalCode=postal;
  p.locationSource=SCHOOL_DIRECTORY_URL;
  p.evidenceEntries??=[];
  if(!p.evidenceEntries.some(x=>x.source==='MOE School Directory'))p.evidenceEntries.push({source:'MOE School Directory',url:SCHOOL_DIRECTORY_URL,claim:'MOE lists the school at '+contact.address.trim()});
  resolved++;
 }
 return resolved;
}
const programmePattern=/sustainab|environment|ecolog|garden|horticultur|agricultur|urban farm|compost|green living|biodivers/i;
export function moeSchoolCandidates(programmes,directory,reference) {
 const contacts=new Map(directory.map(s=>[key(s.school_name),s]));
 const normalise=s=>key(String(s||'').replace(/\s*\((?:primary|secondary)\)\s*$/i,'')).replace(/school$/i,'');
 const aliases=new Map();for(const item of directory){const id=normalise(item.school_name);if(aliases.has(id))aliases.set(id,null);else aliases.set(id,item);}
 return programmes.filter(row=>programmePattern.test([row.alp_domain,row.alp_title,row.llp_title,row.llp_domain1].join(' '))).map(row=>{
  const name=String(row.school_name||'').trim(),contact=contacts.get(key(name))||aliases.get(normalise(name));
  if(!name)return null;
  const programme=[row.alp_title,row.llp_title].find(v=>programmePattern.test(v||''))||row.alp_domain||'Sustainability-related school programme';
  const description='MOE-listed programme: '+programme+'. This does NOT establish a garden, composting, or spent-grounds acceptance.';
  return {id:'moe-'+key(name),name,category:'school programme',status:'suggested',capacityKg:null,verified:false,confirmed:false,frequency:'unknown',
    use:description,source:'MOE School Distinctive Programmes',sourceUrl:SCHOOL_PROGRAMMES_URL,location:contact?.address?(contact.address.trim()+(contact.postal_code&&/^\d{5,6}$/.test(contact.postal_code)?' Singapore '+contact.postal_code.padStart(6,'0'):'')):'Address not recorded',postalCode:contact?.postal_code&&/^\d{5,6}$/.test(contact.postal_code)?contact.postal_code.padStart(6,'0'):null,
    lat:null,lon:null,distanceKm:null,contactName:'',contactEmail:'',notes:'',
    evidenceEntries:[
      {source:'MOE School Distinctive Programmes',url:SCHOOL_PROGRAMMES_URL,claim:'MOE lists '+programme+' for '+name},
      ...(contact?[{source:'MOE School Directory',url:SCHOOL_DIRECTORY_URL,claim:'MOE lists the school at '+contact.address}]:[])
    ]};
 }).filter(Boolean).slice(0,65);
}
