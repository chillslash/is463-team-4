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
// Interleave broad geographic regions before applying dataset caps.
export function diverseLocations(items,limit){
 const groups=new Map();
 for(const p of items){
  const region=(p.lat>=1.34?'N':'S')+(p.lon>=103.84?'E':'W');
  if(!groups.has(region))groups.set(region,[]);
  groups.get(region).push(p);
 }
 for(const group of groups.values())group.sort((a,b)=>a.name.localeCompare(b.name));
 const result=[];
 while(result.length<limit&&[...groups.values()].some(arr=>arr.length)){
  for(const group of groups.values())if(group.length&&result.length<limit)result.push(group.shift());
 }
 return result;
}
export const AI_RUBRIC_VERSION='ai-led-v1';
export function hasAIFit(p){
 const a=p.aiAssessment;
 return a?.rubricVersion===AI_RUBRIC_VERSION &&
  [['reuseSuitability',40],['sourceEvidence',35],['operationalCompatibility',10]]
   .every(([key,max])=>Number.isInteger(a[key])&&a[key]>=0&&a[key]<=max);
}
// Screening is a temporary, explainable fallback, never labelled as AI assessment.
function screen(p){
 const cat=String(p.category||'').toLowerCase(),src=String(p.source||'').toLowerCase();
 const reuse=p.directCoffeeEvidence?38:/compost/.test(cat)?30:/farm|garden|nursery|horticultur/.test(cat)?25:/organic waste recycler/.test(cat)?20:10;
 const evidence=p.directCoffeeEvidence?33:src.includes('community in bloom')?20:src.includes('nea')?22:src.includes('moe')?15:src.includes('lias')?11:12;
 return {reuse,evidence,operational:0};
}
export function scorePartner(p,gap){
 const aiLed=hasAIFit(p),a=p.aiAssessment||{};
 const q=aiLed?{reuse:a.reuseSuitability,evidence:a.sourceEvidence,operational:a.operationalCompatibility}:screen(p);
 const km=Number(p.distanceKm);
 const proximity=p.distanceKm==null||!Number.isFinite(km)?5:Math.round(Math.max(0,10-0.35*Math.max(0,km)));
 const verifiedReady=(p.contactEmail?2:0)+(p.verified&&p.confirmed&&Number(p.capacityKg)>0?3:0);
 const operations=Math.min(15,q.operational+verifiedReady);
 const score=Math.max(0,Math.min(100,q.reuse+q.evidence+proximity+operations));
 const reasons=[aiLed?a.reason:(p.directCoffeeEvidence?'Source explicitly mentions used coffee grounds':'Preliminary screening based on source category and available evidence')];
 if(p.distanceKm!=null)reasons.push('Approximately '+p.distanceKm+' km straight-line from HQ');
 return {score,aiLed,provisional:!aiLed,parts:{suitability:q.reuse,evidence:q.evidence,proximity,operations},
  reasons,checks:[aiLed?a.check:'Confirm actual grounds reuse and acceptance arrangements']};
}
export function rankPartners(partners,gap){
 return partners.filter(p=>p.status!=='closed'&&p.status!=='regular')
 .map(p=>({...p,match:scorePartner(p,gap)}))
 .sort((a,b)=>Number(b.match.aiLed)-Number(a.match.aiLed)||b.match.score-a.match.score||a.name.localeCompare(b.name));
}

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
    result.push({id:`osm-${e.type}-${e.id}`,name,category:typeNames[cat]||cat,status:'suggested',capacityKg:null,willingness:'unknown',verified:false,confirmed:false,frequency:'unknown',use:`Potential horticulture/composting application (${typeNames[cat]||cat} )`,source:'OpenStreetMap live discovery',sourceUrl,location:tags['addr:street']||tags['addr:suburb']||'Singapore',lat,lon,distanceKm:distanceKm(reference.referenceLat,reference.referenceLon,lat,lon),contactName:'',contactEmail:'',notes:'Site identified from place data; authority to approve acceptance, capacity are unknown',evidence:''});
    if(result.length>=60)break;
  }
  return result;
}
export function draftTemplate(p, kg) {
  const trial=Math.min(10,Math.max(1,Math.round(kg||10)));
  const hello=p.contactName?`Dear ${p.contactName},`:'Hello,';
  return {subject:`CoffeeBot — exploring a small spent coffee grounds reuse trial with ${p.name}`,
   body:`${hello}\n\nI'm reaching out from CoffeeBot about a possible collaboration with ${p.name}. We collect spent coffee grounds from our coffee machines and are looking for regular partners who may be able to put them to good use.\n\nWe understand your organisation may be involved in ${p.category}. Would spent coffee grounds be relevant to your activities? Our grounds are collected, sun-dried at our headquarters and stored; moisture content has not been measured. We would first like to confirm your requirements and whether this material would be appropriate for your intended use.\n\nIf there is interest, would you consider discussing a small trial of up to ${trial} kg? We would appreciate knowing what quantity and schedule might work, who could approve such an arrangement, what handling or collection arrangements you require.\n\nThank you for considering this. We would be happy to discuss the details.\n\nBest regards,\nCoffeeBot Partnerships`,
  guide:`Confirm the partner's material requirements, transport arrangements and intended reuse.`, mode:'Template fallback (no AI selected)'};
}

/** Public NParks parks dataset. A physical site is NOT an accepting partner. */
export function nparksCandidates(featureCollection, reference) {
  const features=Array.isArray(featureCollection?.features)?featureCollection.features:[];
  return diverseLocations(features.map(feature=>{
    const coords=feature.geometry?.coordinates;const props=feature.properties||{};
    if(feature.geometry?.type!=='Point'||!Array.isArray(coords)||coords.length<2)return null;
    const [lon,lat]=coords;const name=String(props.NAME||'').trim();
    if(!name||!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    return {id:`nparks-${props.OBJECTID??name.toLowerCase().replace(/[^a-z0-9]/g,'-')}`,name,category:'public park',status:'suggested',capacityKg:null,willingness:'unknown',verified:false,confirmed:false,frequency:'unknown',use:'Potential park horticulture / composting needs ',source:'NParks Parks open dataset (data.gov.sg)',sourceUrl:'https://data.gov.sg/datasets/d_0542d48f0991541706b58059381a6eca/view',location:'Singapore · NParks-managed site',lat,lon,distanceKm:distanceKm(reference.referenceLat,reference.referenceLon,lat,lon),contactName:'',contactEmail:'',notes:'This is an NParks-managed physical site, NOT an organisation confirmed to accept grounds. Staff must identify its authorised decision-maker and verify any reuse agreement.',evidence:''};
  }).filter(Boolean).filter(p=>/\b(PARK|GARDEN|NATURE|RESERVE|BOTANIC)\b/i.test(p.name)),35);
}

/** Official NParks Community in Bloom dataset lists registered garden locations, not recipients. */
export function cibCandidates(featureCollection, reference) {
 const features=Array.isArray(featureCollection?.features)?featureCollection.features:[];
 return diverseLocations(features.map(feature=>{
  if(feature.geometry?.type!=='Point')return null;
  const [lon,lat]=feature.geometry.coordinates||[];const props=feature.properties||{};
  const name=String(props.GARDEN_NAME||'').trim();
  if(!name||!Number.isFinite(lon)||!Number.isFinite(lat))return null;
  return {id:'cib-'+(props.GARDENID??props.OBJECTID??name.toLowerCase().replace(/[^a-z0-9]/g,'-')),name,category:/school|primary|secondary|junior college|polytechnic|university|institute of technical education/i.test(name)?'school garden':'community garden',status:'suggested',capacityKg:null,willingness:'unknown',verified:false,confirmed:false,frequency:'unknown',use:'Registered community growing programme; possible soil/composting use ',source:'NParks Community in Bloom open dataset (data.gov.sg)',sourceUrl:'https://data.gov.sg/datasets/d_f91a8b057cfb2bebf2e531ad8061e1c1/view',location:'Singapore · registered Community in Bloom location',lat,lon,distanceKm:distanceKm(reference.referenceLat,reference.referenceLon,lat,lon),contactName:'',contactEmail:'',notes:'CIB registration locates a growing community, not a commitment to accept grounds. Contact organisers and confirm permission, materials and quantities.',evidence:''};
 }).filter(Boolean),70);
}
