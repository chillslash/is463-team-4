import {activeEvidenceReview} from './evidence-review.js';
import {outreachEmailBody} from './outreach-email.js';
export const STATUSES = ['suggested', 'contacted', 'interested', 'trial', 'regular', 'closed'];
export const OUTREACH_SUBJECT = 'CoffeeBot | Spent Coffee Grounds Reuse Partnership';
export const RESPONSE_STATUSES = ['none', 'awaiting-reply', 'positive', 'declined', 'no-response', 'other'];
// Outcomes describe individual interactions, not the relationship stage or legacy response status.
export const ACTIVITY_OUTCOMES = ['none','requested-information','meeting-agreed','trial-discussed','follow-up-needed','declined','no-response','other'];
export const LEGACY_ACTIVITY_OUTCOMES = ['positive','awaiting-reply'];
export function suggestedReuse(p) {
 const c=String(p.category||'').toLowerCase(),u=String(p.use||'').toLowerCase();
 if (p.directCoffeeEvidence&&/coffee grounds/i.test(p.materialEvidence||p.use||''))return 'checking whether our sun-dried spent grounds can meet your facility\'s intake requirements';
 if (/organic waste recycler|food waste recycl/i.test(c))return 'checking if our grounds could be processed through your existing organic-waste operations';
 if (/mushroom|fung/i.test(p.name+' '+u))return 'evaluating processed grounds as one component of a small growing-substrate pilot';
 if (/material|studio|research|experiment|recycl/i.test(c+' '+u))return 'exploring a small materials-reuse experiment subject to your requirements';
 if (/compost/i.test(c+' '+u))return 'discussing a small initial collection for a managed composting process';
 if (/farm|garden|nursery|horticultur|park|school|zoo/i.test(c))return 'exploring an initial composting arrangement for horticultural use';
 return 'exploring a small initial reuse arrangement appropriate to your organisation';
}
// Obsolete source-generated warnings: evidence belongs in its original sourced fields.
export const LEGACY_SEEDED_PARTNER_NOTES=Object.freeze([
 'Contact and collection arrangements require confirmation.',
 'CIB registration locates a growing community, not a commitment to accept grounds. Contact organisers and confirm permission, materials and quantities.',
 'Programme is a potential outreach lead only; school garden and willingness are unverified.',
 'This is an NParks-managed physical site, NOT an organisation confirmed to accept grounds. Staff must identify its authorised decision-maker and verify any reuse agreement.'
]);
// Sponsor priority: meaningful intake quantity, then dependable logistics and reuse.
export const DEFAULT_RATING_WEIGHTS = Object.freeze({suitability:40,evidence:25,intake:20,proximity:15});
export const LEGACY_THREE_FACTOR_RATING_WEIGHTS = Object.freeze({suitability:55,evidence:30,proximity:15});
export const LEGACY_RATING_WEIGHTS = Object.freeze({suitability:30,evidence:30,proximity:5,operations:35});
export const OLDER_RATING_WEIGHTS = Object.freeze({suitability:40,evidence:35,proximity:10,operations:15});
// All five sponsor locations report TOTAL beverages per month, not coffee drinks.
export const COFFEEBOT_MONTHLY_CUP_VOLUMES = Object.freeze([
 {region:'North',location:'Republic Polytechnic',minCups:700,maxCups:700},
 {region:'South',location:'100 Pasir Panjang',minCups:500,maxCups:500},
 {region:'East',location:'Changi General Hospital',minCups:1000,maxCups:1200},
 {region:'West',location:'NTU',minCups:800,maxCups:1000},
 {region:'Central',location:'Singapore Business Federation',minCups:600,maxCups:800}
]);
export const SPONSOR_MONTHLY_CUPS = Object.freeze({
 min:COFFEEBOT_MONTHLY_CUP_VOLUMES.reduce((n,x)=>n+x.minCups,0),
 max:COFFEEBOT_MONTHLY_CUP_VOLUMES.reduce((n,x)=>n+x.maxCups,0)
});
// 52 weeks / 12 months; use the range midpoint as the editable initial forecast.
const SPONSOR_WEEKLY_CUPS = Math.round((SPONSOR_MONTHLY_CUPS.min+SPONSOR_MONTHLY_CUPS.max)/2*12/52);
export function validRatingWeights(weights){return !!weights && typeof weights==='object' && Object.keys(DEFAULT_RATING_WEIGHTS).every(k=>Number.isInteger(weights[k])&&weights[k]>=0&&weights[k]<=100) && Object.keys(weights).length===4 && Object.values(weights).reduce((sum,v)=>sum+v,0)===100;}
export const DEFAULT_SETTINGS = { ratingWeights: {...DEFAULT_RATING_WEIGHTS}, sponsorAssumptionsVersion: 1, cupsPerWeek: SPONSOR_WEEKLY_CUPS, coffeeSharePercent: 60, gramsPerCup: 15, referenceLat: 1.3275, referenceLon: 103.8723, referenceLabel: 'CoffeeBot HQ, 8 Lor Bakar Batu, #05-01, Singapore 348743 (approximate coordinates)', automaticAIAssessments: 24, aiProvider: 'template' };
// Upgrade only untouched historical demo assumptions. Staff-edited forecasts and
// real partner records must never be silently replaced by sponsor sample data.
export function migrateSponsorAssumptions(state){
 const settings=state.settings||{};
 if(settings.sponsorAssumptionsVersion===1)return state;
 const untouched=state.demo===true && settings.cupsPerWeek===9100 && settings.gramsPerCup===20;
 if(untouched){
  settings.cupsPerWeek=DEFAULT_SETTINGS.cupsPerWeek;
  settings.gramsPerCup=DEFAULT_SETTINGS.gramsPerCup;
  const demoCapacity={p1:[70,3],p2:[40,2],p3:[30,1.5],p4:[10,1]};
  for(const p of state.partners||[]){
   const values=demoCapacity[p.id];
   if(p.source==='Fictional Stitch scenario'&&values&&p.capacityKg===values[0])
    p.capacityKg=values[1];
  }
 }
 if(!validRatingWeights(settings.ratingWeights))settings.ratingWeights={...DEFAULT_RATING_WEIGHTS};
 if(!Number.isFinite(settings.coffeeSharePercent)||settings.coffeeSharePercent<0||settings.coffeeSharePercent>100)
  settings.coffeeSharePercent=DEFAULT_SETTINGS.coffeeSharePercent;
 settings.sponsorAssumptionsVersion=1;
 return state;
}
const demo = (id, name, category, status, capacityKg = null, extra = {}) => ({
  id, name, category, status, capacityKg, willingness: status === 'regular' ? 'confirmed (demo)' : 'unknown',
  verified: status === 'regular', confirmed: status === 'regular', use: 'Potential soil and compost applications',
  frequency: status === 'regular' ? 'weekly (demo)' : 'unknown', source: 'Fictional Stitch scenario', sourceUrl: '',
  location: 'Singapore (demo)', distanceKm: null, contactName: '', contactEmail: '', notes: '', evidence: '', ...extra
});
export const DEMO_PROFILES={
 p1:{contactName:'EcoGrow Partnerships (demo)',contactEmail:'partnerships@ecogrow.example',location:'Eastern Singapore (demo)',responseStatus:'positive',nextAction:'Confirm next collection plan'},
 p2:{contactName:'GreenCycle Operations (demo)',contactEmail:'operations@greencycle.example',location:'Central Singapore (demo)',responseStatus:'positive',nextAction:'Check ongoing collection capacity'},
 p3:{contactName:'Rooted Gardens (demo)',contactEmail:'coordinator@rootedgardens.example',location:'Northern Singapore (demo)',responseStatus:'positive',nextAction:'Follow up on garden schedule'},
 p4:{contactName:'CitySoil Team (demo)',contactEmail:'hello@citysoil.example',location:'Western Singapore (demo)',responseStatus:'positive',nextAction:'Review pilot arrangement'},
 p5:{contactName:'SporeWorks Research (demo)',contactEmail:'research@sporeworks.example',location:'Eastern Singapore (demo)',responseStatus:'awaiting-reply',nextAction:'Follow up on substrate feasibility'},
 p6:{contactName:'Northside Sustainability (demo)',contactEmail:'sustainability@northside.example',location:'Northern Singapore (demo)',responseStatus:'awaiting-reply',nextAction:'Discuss initial school garden collection'},
 p7:{contactName:'LoopMaterials Studio (demo)',contactEmail:'studio@loopmaterials.example',location:'Central Singapore (demo)',responseStatus:'positive',nextAction:'Arrange sample discussion'}
};
// Historical boilerplate: used only to recognise and clean old prefilled demo notes.
export const LEGACY_DEMO_NOTES={
 p1:'Demo: shortlisted for composting, contacted, completed an illustrative trial and became a simulated regular partner.',
 p2:'Demo: staff-added composting lead, assessed for suitability and progressed to an illustrative regular arrangement.',
 p3:'Demo: garden contact found through discovery, explored a trial and agreed a simulated recurring collection.',
 p4:'Demo: outreach and a positive reply led to a small illustrative composting trial; no actual transfer recorded.',
 p5:'Demo: initial contact regarding mushroom-growing substrate; response still pending.',
 p6:'Demo: school garden outreach sent to a fictional coordinator; response and approval remain pending.',
 p7:'Demo: materials-reuse enquiry received initial interest; a sample discussion is the next step.'
};
export const DEMO_ACTIVITY=Object.keys(DEMO_PROFILES).flatMap(id=>{
 const progress=({p1:'Regular',p2:'Regular',p3:'Regular',p4:'Pilot',p5:'Contacted',p6:'Contacted',p7:'Interested'})[id];
 return [
  {id:'seed-'+id+'-start',partnerId:id,type:'note',at:'2026-10-05T09:00:00.000Z',text:'Demo scenario: lead sourced or entered by staff for initial screening.'},
  {id:'seed-'+id+'-progress',partnerId:id,type:'stage',at:'2026-10-11T09:00:00.000Z',text:'Demo scenario: staff progressed the relationship to '+progress+' after illustrative outreach and review.'}
 ];
});
export function enrichDemoProfiles(partners){
 for(const p of partners){
  if(p.source!=='Fictional Stitch scenario'||!DEMO_PROFILES[p.id])continue;
  for(const [k,v] of Object.entries(DEMO_PROFILES[p.id]))if(p[k]===undefined||p[k]===null||p[k]===''||p[k]==='Singapore (demo)')p[k]=v;
 }
 return partners;
}
export const initialState = () => ({
  schemaVersion: 1, demo: true, demoProfilesVersion: 2, settings: { ...DEFAULT_SETTINGS, ratingWeights:{...DEFAULT_RATING_WEIGHTS} },
  partners: [
    demo('p1','EcoGrow Urban Farm','urban farm','regular',3,{ use: 'Composting (demo)', frequency: 'Wednesdays (demo)' }),
    demo('p2','GreenCycle Organics','composting','regular',2,{ use: 'Composting (demo)', frequency: 'Thursdays (demo)' }),
    demo('p3','Rooted Gardens','community garden','regular',1.5,{ use: 'Gardening (demo)', frequency: 'Fridays (demo)' }),
    demo('p4','CitySoil Community Composting','community garden','trial',1,{ use: 'Community composting' }),
    demo('p5','SporeWorks Mushroom Farm','urban farm','contacted',null,{ use: 'Potential growing substrate research' }),
    demo('p6','Northside Primary School Garden','school garden','contacted',null,{ use: 'School gardening programme' }),
    demo('p7','LoopMaterials Studio','business','interested',null,{ use: 'Potential recycled material experiments' })
  ].map(p=>({...p,...DEMO_PROFILES[p.id]})),
  handovers: [], outreach: [], discoveryRuns: [], aiActivity: [], partnerActivity: DEMO_ACTIVITY.map(a=>({...a}))
});
export function numbers(settings, partners, handovers) {
  // The total beverage count includes non-coffee drinks; only coffee drinks generate grounds.
  const coffeeShare = Number.isFinite(Number(settings.coffeeSharePercent)) ? Number(settings.coffeeSharePercent) : 60;
  const forecastKg = round(Number(settings.cupsPerWeek) * coffeeShare / 100 * Number(settings.gramsPerCup) / 1000);
  // A Regular partner's recorded weekly intake is its agreed arrangement. The legacy confirmation flag is not a separate staff-visible requirement.
  const confirmedKg = round(partners.filter(p => p.status === 'regular' && Number(p.capacityKg)>0).reduce((a,p)=>a + Number(p.capacityKg),0));
  const gapKg = round(Math.max(0, forecastKg - confirmedKg));
  const transferredKg = round(handovers.reduce((a,h) => a + Number(h.kg),0));
  // A physical handover is an observed transfer; no final-use confirmation or reuse rate is inferred.
  return {forecastKg,confirmedKg,gapKg,transferredKg};
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
 const src=String(p.source||'').toLowerCase(),cat=String(p.category||'').toLowerCase(),mat=String(p.materialEvidence||'').toLowerCase();
 const equipment=/equipment|machiner|parts|irrigation|technology/.test(String(p.name||'').toLowerCase());
 // Potential intake is relative pre-contact scale, never an estimate of kg/week or willingness.
 // Category/source evidence only earns a cautious baseline; organisation-specific evidence can refine it later.
 let intake=3;
 if(src.includes('nea')||cat.includes('organic waste recycler'))intake=12;
 else if(/compost/.test(cat))intake=11;
 else if(src.includes('sfa')||cat.includes('crop farm'))intake=7;
 else if(src.includes('community in bloom')||cat.includes('community garden'))intake=3;
 else if(src.includes('moe')||cat.includes('school programme')||cat.includes('school garden'))intake=2;
 else if(src.includes('nparks')||cat.includes('public park'))intake=6;
 else if(src.includes('lias')||cat.includes('landscap'))intake=equipment?2:7;
 else if(/garden|nursery|horticultur|farm/.test(cat))intake=6;
 if(p.directCoffeeEvidence)return {reuse:38,evidence:33,intake:Math.max(intake,12)};
 if(src.includes('nea')||cat.includes('organic waste recycler')){
  const broad=/mixed food waste|food waste|organic waste/.test(mat);
  return {reuse:broad?13:8,evidence:broad?13:10,intake};
 }
 if(cat.includes('public park'))return {reuse:7,evidence:5,intake};
 if(src.includes('community in bloom'))return {reuse:12,evidence:8,intake};
 if(src.includes('moe')||cat.includes('school programme'))return {reuse:7,evidence:6,intake};
 if(src.includes('nparks')||cat.includes('public park'))return {reuse:7,evidence:5,intake};
 if(src.includes('sfa')||cat.includes('crop farm'))return {reuse:12,evidence:10,intake};
 if(src.includes('lias')||cat.includes('landscap'))return {reuse:equipment?4:11,evidence:8,intake};
 if(/compost/.test(cat))return {reuse:15,evidence:8,intake};
 if(/garden|nursery|horticultur|farm/.test(cat))return {reuse:11,evidence:7,intake};
 return {reuse:5,evidence:3,intake};
}
export function scorePartner(p,gap,ratingWeights=DEFAULT_RATING_WEIGHTS){
 const weights=validRatingWeights(ratingWeights)?ratingWeights:DEFAULT_RATING_WEIGHTS;
 const review=activeEvidenceReview(p);
 const aiLed=!!review; // AI-Assessed Only means an active model-influenced score, not historical advisory text.
 // Rules-only is the complete, inexpensive fallback. V2 AI contributes only
 // when the cited organisation-specific evidence still matches saved facts.
 const base=screen(p);
 const q=review?{
  reuse:(base.reuse+review.reuseSuitability)/2,
  evidence:(base.evidence+review.sourceEvidence)/2,
  intake:(base.intake+review.potentialIntake)/2
 }:base;
 const km=Number(p.distanceKm);
 // Straight-line distance is a weak convenience proxy, never a delivery-route promise.
 const proximity=p.distanceKm==null||!Number.isFinite(km)?0:Math.round(Math.max(0,10-0.35*Math.max(0,km)));
 // Outreach Priority is intentionally pre-contact. Potential Intake Scale is a relative,
 // evidence-backed estimate of plausible absorption scale, never actual kg/week or willingness.
 // Frequency, willingness and transport remain post-contact relationship facts.
 const rawParts={suitability:q.reuse,evidence:q.evidence,intake:q.intake,proximity};
 const maxima={suitability:40,evidence:35,intake:20,proximity:10};
 const parts=Object.fromEntries(Object.keys(maxima).map(key=>[key,Math.round(Math.max(0,Math.min(1,rawParts[key]/maxima[key]))*weights[key])]));
 const score=Object.values(parts).reduce((sum,v)=>sum+v,0);
 const reasons=[review?review.reason:(p.directCoffeeEvidence?'Source explicitly mentions used coffee grounds':'Preliminary screening based on source category and available evidence')];
 if(review?.intakeReason)reasons.push(review.intakeReason);
 if(p.distanceKm!=null)reasons.push('Approximately '+p.distanceKm+' km straight-line from HQ');
 reasons.push('Confirm intake quantity, frequency and collection arrangements during outreach');
 return {score,aiLed,provisional:!review,method:review?'AI-assisted':'Rule-ranked',
  evidenceReferences:review?review.evidenceIds:[],parts,weights:{...weights},
  reasons,checks:[review?review.check:(aiLed?a.check:'Confirm actual grounds reuse and acceptance arrangements')]};
}
export function rankPartners(partners,gap,ratingWeights=DEFAULT_RATING_WEIGHTS){
 return partners.filter(p=>p.status!=='closed'&&p.status!=='regular')
 .map(p=>({...p,match:scorePartner(p,gap,ratingWeights)}))
 .sort((a,b)=>b.match.score-a.match.score||a.name.localeCompare(b.name));
}
export function distanceKm(lat1,lon1,lat2,lon2) {
  const rad=Math.PI/180;const dlat=(lat2-lat1)*rad,dlon=(lon2-lon1)*rad;
  const a=Math.sin(dlat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dlon/2)**2;
  return round(6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}
export function outreachSalutation(p){
 const role=/team|department|partnership|operations|research|office|programme|enquir|staff|demo/i;
 const contact=String(p.contactName||'').replace(/\s*\([^)]*\)/g,'').trim();
 if(contact&&!role.test(contact)&&contact.length<=65)return 'Dear '+contact+',';
 return 'Dear '+p.name+' Team,';
}
export function proposedReuseContext(p){
 const c=String(p.category||'').toLowerCase();
 if(p.directCoffeeEvidence&&/coffee grounds/i.test(p.materialEvidence||p.use||''))return 'I noticed that the NEA recycling-facility directory lists used coffee grounds among the materials associated with your facility. We wondered whether our spent grounds could be suitable for your intake process and what preparation, segregation or delivery requirements your team would recommend.';
 if(/compost|organic waste recycl/i.test(c))return 'We wondered whether the grounds might work as an ingredient in your existing composting or organic-waste process, subject to how your team assesses and prepares the material.';
 if(/mushroom|fung/i.test(p.name+' '+p.use))return 'One idea could be a small initial use of prepared grounds as part of a growing substrate, provided your team considers them suitable and can advise on preparation.';
 if(/garden|farm|nursery|school|park|zoo|horticultur/i.test(c))return 'If you already have an appropriate composting setup, we wondered whether the grounds might be suitable as an ingredient in that process, rather than assuming they can be applied directly to soil.';
 if(/material|studio|experiment|research/i.test(c+' '+p.use))return 'We wondered whether the grounds might be useful in a small materials-reuse experiment, guided by your own processing and safety requirements.';
 return 'We would love to hear whether there is a suitable reuse process your team already follows where a small initial collection could make sense.';
}
export function draftTemplate(p) {
 return {subject:OUTREACH_SUBJECT,body:outreachEmailBody(p,outreachSalutation(p)),
 suggestedUse:suggestedReuse(p),mode:'Template fallback (no AI selected)'};
}

/** Public NParks parks dataset. A physical site is NOT an accepting partner. */
export function nparksCandidates(featureCollection, reference) {
  const features=Array.isArray(featureCollection?.features)?featureCollection.features:[];
  return diverseLocations(features.map(feature=>{
    const coords=feature.geometry?.coordinates;const props=feature.properties||{};
    if(feature.geometry?.type!=='Point'||!Array.isArray(coords)||coords.length<2)return null;
    const [lon,lat]=coords;const name=String(props.NAME||'').trim();
    if(!name||!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    return {id:`nparks-${props.OBJECTID??name.toLowerCase().replace(/[^a-z0-9]/g,'-')}`,name,category:'public park',status:'suggested',capacityKg:null,willingness:'unknown',verified:false,confirmed:false,frequency:'unknown',use:'Potential park horticulture / composting needs ',source:'NParks Parks open dataset (data.gov.sg)',sourceUrl:'https://data.gov.sg/datasets/d_0542d48f0991541706b58059381a6eca/view',location:'Singapore · NParks-managed site',lat,lon,distanceKm:distanceKm(reference.referenceLat,reference.referenceLon,lat,lon),contactName:'',contactEmail:'',notes:'',evidence:''};
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
  return {id:'cib-'+(props.GARDENID??props.OBJECTID??name.toLowerCase().replace(/[^a-z0-9]/g,'-')),name,category:/school|primary|secondary|junior college|polytechnic|university|institute of technical education/i.test(name)?'school garden':'community garden',status:'suggested',capacityKg:null,willingness:'unknown',verified:false,confirmed:false,frequency:'unknown',use:'Registered community growing programme; possible soil/composting use ',source:'NParks Community in Bloom open dataset (data.gov.sg)',sourceUrl:'https://data.gov.sg/datasets/d_f91a8b057cfb2bebf2e531ad8061e1c1/view',location:'Singapore · registered Community in Bloom location',lat,lon,distanceKm:distanceKm(reference.referenceLat,reference.referenceLon,lat,lon),contactName:'',contactEmail:'',notes:'',evidence:''};
 }).filter(Boolean),70);
}
