import {createHash} from 'node:crypto';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

// SFA publishes a public land-farm register as a PDF, not a farm-level open-data API.
export const SFA_URL='https://www.sfa.gov.sg/docs/default-source/food-farming/licensed-land-based-farms.pdf';
export const SFA_SOURCE='SFA Licensed Crop Farms';

const normalise=name=>String(name).normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sections=[
  ['Vegetable Farming','crop farm'],
  ['Aquaculture and Vegetable Farms','mixed crop/aquaculture farm']
];

// The register uses actual table columns (row number, activity, licence, name).
// Extract by page coordinates, not by fixed row ranges: SFA adds and removes farms.
export function parseSfaTextPages(pages) {
  if(!Array.isArray(pages)||!pages.length)throw Error('SFA register has no pages');
  let activity='',revision='';
  const licensed=[];
  for(const page of pages){
    const items=page.filter(x=>x&&typeof x.str==='string'&&Number.isFinite(x.x)&&Number.isFinite(x.y));
    const title=items.find(x=>/LIST OF LICENSED LAND BASED FARMS/i.test(x.str));
    const stamp=title?.str.match(/Last updated\s+([^\]]+)/i);
    if(stamp)revision=stamp[1].trim();
    const lineNumbers=items.filter(x=>x.x>=55&&x.x<90&&/^\d{1,4}$/.test(x.str.trim()));
    for(const row of lineNumbers.sort((a,b)=>b.y-a.y)){
      const near=items.filter(x=>Math.abs(x.y-row.y)<2.7);
      const heading=near.find(x=>x.x>=88&&x.x<205&&/^(Vegetable Farming|Aquaculture Farms|Aquaculture and Vegetable Farms|Dairy cattle Farms|Dairy goat Farm|Egg Farms)$/i.test(x.str.trim()));
      if(heading)activity=heading.str.trim();
      const licence=near.find(x=>x.x>=205&&x.x<295&&/^[A-Z0-9]{8,11}$/i.test(x.str.trim()))?.str.trim();
      const name=near.filter(x=>x.x>=296&&x.x<570&&!/^\s*$/.test(x.str)).sort((a,b)=>a.x-b.x).map(x=>x.str.trim()).join(' ').replace(/\s+/g,' ').trim();
      if(licence&&name&&sections.some(x=>x[0]===activity))
        licensed.push({name,licence,activity});
    }
  }
  // Fail closed if the agency replaces/reformats the PDF rather than silently importing nonsense.
  if(!revision||licensed.length===0)throw Error('SFA register format not recognised');
  const companies=new Map();
  for(const row of licensed){
    const key=normalise(row.name);
    if(!key)continue;
    if(!companies.has(key))companies.set(key,{name:row.name,licences:new Set(),activities:new Set()});
    const p=companies.get(key);
    p.licences.add(row.licence);
    p.activities.add(row.activity);
  }
  const candidates=[...companies.entries()].map(([key,p])=>{
    const activities=[...p.activities],licences=[...p.licences];
    const mixedOnly=activities.every(a=>a==='Aquaculture and Vegetable Farms');
    const claim='SFA lists '+p.name+' under '+activities.join(' and ')+' (licence '+licences.join(', ')+
      '). This does not establish growing method, acceptance of coffee grounds, contact authority, capacity or logistics.';
    return {
      id:'sfa-'+createHash('sha256').update(key).digest('hex').slice(0,16),
      name:p.name,
      category:mixedOnly?'mixed crop/aquaculture farm':'crop farm',
      status:'suggested',
      capacityKg:null,
      verified:false,confirmed:false,willingness:'unknown',frequency:'unknown',
      use:'',agreedUse:'',notes:'',contactName:'',contactEmail:'',
      location:'',lat:null,lon:null,distanceKm:null,
      source:SFA_SOURCE,sourceUrl:SFA_URL,
      evidenceEntries:[{source:SFA_SOURCE,url:SFA_URL,claim}],
      sfaRegisterUpdated:revision,
      sfaLicenceCount:licences.length
    };
  });
  return {candidates,registerUpdated:revision,licensedRows:licensed.length};
}

export async function parseSfaPdf(bytes) {
  if(!(bytes instanceof Uint8Array)||bytes.length<20)throw Error('Invalid SFA PDF');
  const pdf=await getDocument({data:bytes,disableFontFace:true,useSystemFonts:true}).promise;
  try{
    if(pdf.numPages<1||pdf.numPages>30)throw Error('Unexpected SFA register page count');
    const pages=[];
    for(let i=1;i<=pdf.numPages;i++){
      const content=await (await pdf.getPage(i)).getTextContent();
      pages.push(content.items.filter(x=>x?.str?.trim()).map(x=>({str:x.str,x:x.transform[4],y:x.transform[5]})));
    }
    return parseSfaTextPages(pages);
  }finally{await pdf.destroy();}
}
