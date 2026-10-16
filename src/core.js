export const STATUSES = ['suggested', 'contacted', 'interested', 'trial', 'regular', 'closed'];
export const DEFAULT_SETTINGS = { cupsPerWeek: 9100, gramsPerCup: 20, referenceLat: 1.3275, referenceLon: 103.8723, referenceLabel: 'CoffeeBot HQ, 8 Lor Bakar Batu, #05-01, Singapore 348743 (approximate coordinates)', reportingCollectedKg: null, reportingDiscardedKg: null, aiProvider: 'template' };
const demo = (id, name, category, status, capacityKg = null, extra = {}) => ({
  id, name, category, status, capacityKg, willingness: status === 'regular' ? 'confirmed (demo)' : 'unknown',
  verified: status === 'regular', confirmed: status === 'regular', use: 'Potential soil and compost applications',
  frequency: status === 'regular' ? 'weekly (demo)' : 'unknown', source: 'Fictional Stitch scenario', sourceUrl: '',
  location: 'Singapore (demo)', distanceKm: null, contactName: '', contactEmail: '', notes: '', evidence: '', ...extra
});
export const initialState = () => ({
  schemaVersion: 1, demo: true, settings: { ...DEFAULT_SETTINGS },
  partners: [
    demo('p1','EcoGrow Urban Farm','urban farm','regular',70,{ use: 'Composting (demo)', frequency: 'Wednesdays (demo)' }),
    demo('p2','GreenCycle Organics','composting','regular',40,{ use: 'Composting (demo)', frequency: 'Thursdays (demo)' }),
    demo('p3','Rooted Gardens','community garden','regular',30,{ use: 'Gardening (demo)', frequency: 'Fridays (demo)' }),
    demo('p4','CitySoil Community Composting','community garden','trial',10,{ use: 'Community composting', notes: 'Illustrative lead; no actual acceptance verified' }),
    demo('p5','SporeWorks Mushroom Farm','urban farm','contacted',null,{ use: 'Potential growing substrate research' }),
    demo('p6','Northside Primary School Garden','school garden','contacted',null,{ use: 'School gardening programme' }),
    demo('p7','LoopMaterials Studio','business','interested',null,{ use: 'Potential recycled material experiments' })
  ],
  handovers: [], outreach: [], discoveryRuns: []
});
export function numbers(settings, partners, handovers) {
  const forecastKg = round(Number(settings.cupsPerWeek) * Number(settings.gramsPerCup) / 1000);
  const confirmedKg = round(partners.filter(p => p.status === 'regular' && p.confirmed === true).reduce((a,p)=>a + (Number(p.capacityKg)||0),0));
  const gapKg = round(Math.max(0, forecastKg - confirmedKg));
  const transferredKg = round(handovers.reduce((a,h) => a + Number(h.kg),0));
  const evidencedKg = round(handovers.filter(h=>h.confirmation==='reuse-confirmed').reduce((a,h)=>a + Number(h.kg),0));
  const collected = Number(settings.reportingCollectedKg);
  const collectedKg = settings.reportingCollectedKg === null ? null : collected;
  return { forecastKg, confirmedKg, gapKg, transferredKg, evidencedKg, collectedKg, discardedKg: settings.reportingDiscardedKg, reuseRate: collectedKg > 0 ? round(100 * evidencedKg / collectedKg) : null };
}
export const round = n => Math.round((n + Number.EPSILON) * 10) / 10;
// Fit is an evidence-backed decision aid, not a probability of acceptance.
export function scorePartner(p,gap){
 const category=String(p.category||'').toLowerCase(),use=String(p.use||'').toLowerCase(),src=String(p.source||'').toLowerCase();
 const text=category+' '+use;
 let suitability=12;
 if(p.directCoffeeEvidence) suitability=40;
 else if(/organic waste recycler|compost|vermicompost/.test(category))suitability=33;
 else if(/community garden|school garden|urban farm|nursery|horticultur|allotment/.test(category))suitability=30;
 else if(/park/.test(category))suitability=16;
 else if(/garden|farm|grow/.test(text))suitability=25;
 else if(/school programme|sustainab/.test(text))suitability=12;
 else if(/landscap/.test(text))suitability=16;
 const ai=p.aiAssessment?.priority;
 if(ai==='high')suitability=Math.min(40,suitability+4);
 if(ai==='medium')suitability=Math.min(40,suitability+1);
 if(ai==='low')suitability=Math.max(0,suitability-6);
 let evidence=8;
 if(p.directCoffeeEvidence)evidence=30;
 else if(src.includes('nea food waste'))evidence=24;
 else if(src.includes('community in bloom'))evidence=24;
 else if(src.includes('moe school'))evidence=20;
 else if(src.includes('nparks'))evidence=18;
 else if(src.includes('openstreetmap'))evidence=13;
 else if(src.includes('lias'))evidence=12;
 if(p.verified)evidence=Math.min(30,evidence+3);
 const km=Number(p.distanceKm);
 // Unknown distance receives a neutral midpoint, never an invented kilometre figure.
 const proximity=p.distanceKm==null||!Number.isFinite(km)?10:Math.round(Math.max(0,20-0.8*Math.max(0,km)));
 const operations=Math.min(10,(p.verified?5:0)+(p.confirmed&&p.capacityKg>0?5:0)+(p.contactEmail?2:0));
 const score=Math.max(0,Math.min(100,Math.round(suitability+evidence+proximity+operations)));
 const reasons=[
  p.directCoffeeEvidence?'NEA records used coffee grounds among this facility’s accepted waste materials':
   /garden|farm|nursery|compost|landscap|recycl/.test(text)?'Source records indicate potentially relevant operations':'Source records a possible outreach lead; the reuse connection needs checking',
  (p.distanceKm==null?'HQ distance not established':'Approximately '+p.distanceKm+' km straight-line from HQ'),
 ];
 if(ai)reasons.push('AI assessment: '+ai+' potential, based on the recorded sources');
 const checks=['Confirm willingness to accept CoffeeBot spent grounds','Confirm suitable condition, kg/week, transport arrangement and authorised contact'];
 return {score,parts:{suitability,evidence,proximity,operations},reasons,checks};
}
export function rankPartners(partners,gap){return partners.filter(p=>p.status!=='closed'&&p.status!=='regular').map(p=>({...p,match:scorePartner(p,gap)})).sort((a,b)=>b.match.score-a.match.score||a.name.localeCompare(b.name));}

export function distanceKm(lat1,lon1,lat2,lon2) {
  const rad=Math.PI/180;const dlat=(lat2-lat1)*rad,dlon=(lon2-lon1)*rad;
  const a=Math.sin(dlat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dlon/2)**2;
  return round(6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}
const typeNames={park:'public park',garden:'garden',allotments:'community growing site',farmland:'urban growing site',nursery:'nursery',garden_centre:'garden centre',zoo:'zoo'};
export function osmCandidates(elements, reference) {
  const result=[];const seen=new Set();
  for(const e of elements){
    const tags=e.tags||{};const name=String(tags.name||tags['name:en']||'').trim();
    if(!name || seen.has(name.toLowerCase())) continue;
    const lat=e.lat ?? e.center?.lat, lon=e.lon ?? e.center?.lon;
    if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const cat=tags.leisure==='park'?'park':tags.leisure==='garden'?'garden':tags.tourism==='zoo'?'zoo':tags.landuse==='allotments'?'allotments':tags.landuse==='farmland'?'farmland':tags.shop==='garden_centre'?'garden_centre':tags.shop==='nursery'?'nursery':'garden';
    seen.add(name.toLowerCase());
    const sourceUrl=`https://www.openstreetmap.org/${e.type}/${e.id}`;
    result.push({id:`osm-${e.type}-${e.id}`,name,category:typeNames[cat]||cat,status:'suggested',capacityKg:null,willingness:'unknown',verified:false,confirmed:false,frequency:'unknown',use:`Potential horticulture/composting application (${typeNames[cat]||cat}; not validated)`,source:'OpenStreetMap live discovery',sourceUrl,location:tags['addr:street']||tags['addr:suburb']||'Singapore',lat,lon,distanceKm:distanceKm(reference.referenceLat,reference.referenceLon,lat,lon),contactName:'',contactEmail:'',notes:'Site identified from place data; authority to approve acceptance, fees and capacity are unknown',evidence:''});
    if(result.length>=60)break;
  }
  return result;
}
export function draftTemplate(p, kg) {
  const trial=Math.min(10,Math.max(1,Math.round(kg||10)));
  const hello=p.contactName?`Dear ${p.contactName},`:'Hello,';
  return {subject:`CoffeeBot — exploring a small spent coffee grounds reuse trial with ${p.name}`,
   body:`${hello}\n\nI'm reaching out from CoffeeBot about a possible collaboration with ${p.name}. We collect spent coffee grounds from our coffee machines and are looking for regular partners who may be able to put them to good use.\n\nWe understand your organisation may be involved in ${p.category}. Would spent coffee grounds be relevant to your activities? Our grounds are collected, sun-dried at our headquarters and stored; moisture content has not been measured. We would first like to confirm your requirements and whether this material would be appropriate for your intended use.\n\nIf there is interest, would you consider discussing a small trial of up to ${trial} kg? We would appreciate knowing what quantity and schedule might work, who could approve such an arrangement, what handling or collection arrangements you require.\n\nThank you for considering this. We would be happy to discuss the details.\n\nBest regards,\nCoffeeBot Partnerships`,
  guide:`Potential use: ${p.use || 'To be discussed with the organisation'}.\nCoffeeBot currently sun-dries grounds; moisture content is not measured. Store and handle according to recipient requirements. Confirm suitability with the recipient before application. Do not claim agronomic or food-safety benefits without evidence. Ask for feedback on amount accepted, intended use and whether the grounds were ultimately reused.`, mode:'Template fallback (no AI selected)'};
}

/** Public NParks parks dataset. A physical site is NOT an accepting partner. */
export function nparksCandidates(featureCollection, reference) {
  const features=Array.isArray(featureCollection?.features)?featureCollection.features:[];
  return features.map(feature=>{
    const coords=feature.geometry?.coordinates;const props=feature.properties||{};
    if(feature.geometry?.type!=='Point'||!Array.isArray(coords)||coords.length<2)return null;
    const [lon,lat]=coords;const name=String(props.NAME||'').trim();
    if(!name||!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    return {id:`nparks-${props.OBJECTID??name.toLowerCase().replace(/[^a-z0-9]/g,'-')}`,name,category:'public park',status:'suggested',capacityKg:null,willingness:'unknown',verified:false,confirmed:false,frequency:'unknown',use:'Potential park horticulture / composting needs (not validated)',source:'NParks Parks open dataset (data.gov.sg)',sourceUrl:'https://data.gov.sg/datasets/d_0542d48f0991541706b58059381a6eca/view',location:'Singapore · NParks-managed site',lat,lon,distanceKm:distanceKm(reference.referenceLat,reference.referenceLon,lat,lon),contactName:'',contactEmail:'',notes:'This is an NParks-managed physical site, NOT an organisation confirmed to accept grounds. Staff must identify its authorised decision-maker and verify any reuse agreement.',evidence:''};
  }).filter(Boolean).filter(p=>/\b(PARK|GARDEN|NATURE|RESERVE|BOTANIC)\b/i.test(p.name)).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,35);
}

/** Official NParks Community in Bloom dataset lists registered garden locations, not recipients. */
export function cibCandidates(featureCollection, reference) {
 const features=Array.isArray(featureCollection?.features)?featureCollection.features:[];
 return features.map(feature=>{
  if(feature.geometry?.type!=='Point')return null;
  const [lon,lat]=feature.geometry.coordinates||[];const props=feature.properties||{};
  const name=String(props.GARDEN_NAME||'').trim();
  if(!name||!Number.isFinite(lon)||!Number.isFinite(lat))return null;
  return {id:'cib-'+(props.GARDENID??props.OBJECTID??name.toLowerCase().replace(/[^a-z0-9]/g,'-')),name,category:/school|primary|secondary|junior college|polytechnic|university|institute of technical education/i.test(name)?'school garden':'community garden',status:'suggested',capacityKg:null,willingness:'unknown',verified:false,confirmed:false,frequency:'unknown',use:'Registered community growing programme; possible soil/composting use (not verified)',source:'NParks Community in Bloom open dataset (data.gov.sg)',sourceUrl:'https://data.gov.sg/datasets/d_f91a8b057cfb2bebf2e531ad8061e1c1/view',location:'Singapore · registered Community in Bloom location',lat,lon,distanceKm:distanceKm(reference.referenceLat,reference.referenceLon,lat,lon),contactName:'',contactEmail:'',notes:'CIB registration locates a growing community, not a commitment to accept grounds. Contact organisers and confirm permission, materials, fees and quantities.',evidence:''};
 }).filter(Boolean).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,70);
}
