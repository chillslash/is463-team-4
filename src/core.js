export const STATUSES = ['suggested', 'contacted', 'interested', 'trial', 'regular', 'closed'];
export const DEFAULT_SETTINGS = { cupsPerWeek: 9100, gramsPerCup: 20, referenceLat: 1.3000, referenceLon: 103.8500, referenceLabel: 'Singapore city centre (demo reference)', reportingCollectedKg: null, reportingDiscardedKg: null, aiProvider: 'template' };
const demo = (id, name, category, status, capacityKg = null, extra = {}) => ({
  id, name, category, status, capacityKg, fee: 'unknown', willingness: status === 'regular' ? 'confirmed (demo)' : 'unknown',
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
    demo('p7','LoopMaterials Studio','business','suggested',null,{ use: 'Potential recycled material experiments' })
  ],
  handovers: [], outreach: []
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
export function scorePartner(p, gap) {
  const category = (p.category || '').toLowerCase();
  const use = (p.use || '').toLowerCase();
  let score = 0; const reasons=[]; const checks=[];
  if (/garden|park|farm|compost|nursery|horticulture|zoo/.test(category+' '+use)) {score+=38;reasons.push('Plausible horticultural or composting use');}
  else {score+=12;reasons.push('Possible reuse application; verify intended use');}
  if (p.fee === 'none') {score+=22;reasons.push('No acceptance fee reported');}
  else if(p.fee === 'paid') {score-=25;checks.push('Review acceptance fee and total logistics cost');}
  else checks.push('Confirm whether acceptance incurs a fee');
  if (p.verified) {score+=20; reasons.push('Details staff-verified');} else checks.push('Confirm organisation interest and authorised contact');
  if (Number.isFinite(Number(p.capacityKg)) && p.capacityKg !== null && Number(p.capacityKg) > 0){score+=Math.min(15,10+Number(p.capacityKg)/Math.max(1,gap)*5); reasons.push(`Recorded capacity ${p.capacityKg} kg/week`);}
  else checks.push('Confirm weekly capacity and frequency');
  if(Number.isFinite(Number(p.distanceKm)) && p.distanceKm !== null){score+=Math.max(0,12-Number(p.distanceKm)); reasons.push(`Approximately ${p.distanceKm} km from reference point`);}
  else checks.push('Check collection route and distance');
  if(p.status==='closed') score-=100;
  return { score:Math.round(score), reasons, checks };
}
export function rankPartners(partners, gap){return partners.filter(p=>p.status!=='closed'&&p.status!=='regular').map(p=>({...p,match:scorePartner(p,gap)})).sort((a,b)=>b.match.score-a.match.score||a.name.localeCompare(b.name));}
export function distanceKm(lat1,lon1,lat2,lon2) {
  const rad=Math.PI/180;const dlat=(lat2-lat1)*rad,dlon=(lon2-lon1)*rad;
  const a=Math.sin(dlat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dlon/2)**2;
  return round(6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}
const typeNames={park:'public park',garden:'garden',allotments:'community growing site',nursery:'nursery',garden_centre:'garden centre',zoo:'zoo'};
export function osmCandidates(elements, reference) {
  const result=[];const seen=new Set();
  for(const e of elements){
    const tags=e.tags||{};const name=String(tags.name||tags['name:en']||'').trim();
    if(!name || seen.has(name.toLowerCase())) continue;
    const lat=e.lat ?? e.center?.lat, lon=e.lon ?? e.center?.lon;
    if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const cat=tags.leisure==='park'?'park':tags.leisure==='garden'?'garden':tags.tourism==='zoo'?'zoo':tags.landuse==='allotments'?'allotments':tags.shop==='garden_centre'?'garden_centre':tags.shop==='nursery'?'nursery':'garden';
    seen.add(name.toLowerCase());
    const sourceUrl=`https://www.openstreetmap.org/${e.type}/${e.id}`;
    result.push({id:`osm-${e.type}-${e.id}`,name,category:typeNames[cat]||cat,status:'suggested',capacityKg:null,fee:'unknown',willingness:'unknown',verified:false,confirmed:false,frequency:'unknown',use:`Potential horticulture/composting application (${typeNames[cat]||cat}; not validated)`,source:'OpenStreetMap live discovery',sourceUrl,location:tags['addr:street']||tags['addr:suburb']||'Singapore',lat,lon,distanceKm:distanceKm(reference.referenceLat,reference.referenceLon,lat,lon),contactName:'',contactEmail:'',notes:'Site identified from place data; authority to approve acceptance, fees and capacity are unknown',evidence:''});
    if(result.length>=35)break;
  }
  return result;
}
export function draftTemplate(p, kg) {
  const trial=Math.min(10,Math.max(1,Math.round(kg||10)));
  const hello=p.contactName?`Dear ${p.contactName},`:'Hello,';
  return {subject:`CoffeeBot — exploring a small spent coffee grounds reuse trial with ${p.name}`,
   body:`${hello}\n\nI'm reaching out from CoffeeBot about a possible collaboration with ${p.name}. We collect spent coffee grounds from our coffee machines and are looking for regular partners who may be able to put them to good use.\n\nWe understand your organisation may be involved in ${p.category}. Would spent coffee grounds be relevant to your activities? Our grounds are collected, sun-dried at our headquarters and stored; moisture content has not been measured. We would first like to confirm your requirements and whether this material would be appropriate for your intended use.\n\nIf there is interest, would you consider discussing a small trial of up to ${trial} kg? We would appreciate knowing what quantity and schedule might work, who could approve such an arrangement, whether there are any acceptance fees, and what handling or collection arrangements you require.\n\nThank you for considering this. We would be happy to discuss the details.\n\nBest regards,\nCoffeeBot Partnerships`,
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
    return {id:`nparks-${props.OBJECTID??name.toLowerCase().replace(/[^a-z0-9]/g,'-')}`,name,category:'public park',status:'suggested',capacityKg:null,fee:'unknown',willingness:'unknown',verified:false,confirmed:false,frequency:'unknown',use:'Potential park horticulture / composting needs (not validated)',source:'NParks Parks open dataset (data.gov.sg)',sourceUrl:'https://data.gov.sg/datasets/d_0542d48f0991541706b58059381a6eca/view',location:'Singapore · NParks-managed site',lat,lon,distanceKm:distanceKm(reference.referenceLat,reference.referenceLon,lat,lon),contactName:'',contactEmail:'',notes:'This is an NParks-managed physical site, NOT an organisation confirmed to accept grounds. Staff must identify its authorised decision-maker and verify any reuse agreement.',evidence:''};
  }).filter(Boolean).filter(p=>/\b(PARK|GARDEN|NATURE|RESERVE|BOTANIC)\b/i.test(p.name)).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,35);
}
