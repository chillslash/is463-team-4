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
 if (/mushroom|fung/i.test(p.name+' '+u))return 'evaluating processed grounds as one component of a controlled growing-substrate trial';
 if (/material|studio|research|experiment|recycl/i.test(c+' '+u))return 'exploring a small materials-reuse experiment subject to your requirements';
 if (/compost/i.test(c+' '+u))return 'testing small quantities of grounds in a managed composting process';
 if (/farm|garden|nursery|horticultur|park|school|zoo/i.test(c))return 'exploring a controlled composting trial for horticultural use';
 return 'exploring a small reuse trial appropriate to your organisation';
}
// Obsolete source-generated warnings: evidence belongs in its original sourced fields.
export const LEGACY_SEEDED_PARTNER_NOTES=Object.freeze([
 'Contact and collection arrangements require confirmation.',
 'CIB registration locates a growing community, not a commitment to accept grounds. Contact organisers and confirm permission, materials and quantities.',
 'Programme is a potential outreach lead only; school garden and willingness are unverified.',
 'This is an NParks-managed physical site, NOT an organisation confirmed to accept grounds. Staff must identify its authorised decision-maker and verify any reuse agreement.'
]);
export const DEFAULT_RATING_WEIGHTS = Object.freeze({suitability:40,evidence:35,proximity:10,operations:15});
export function validRatingWeights(weights){return !!weights && typeof weights==='object' && Object.keys(DEFAULT_RATING_WEIGHTS).every(k=>Number.isInteger(weights[k])&&weights[k]>=0&&weights[k]<=100) && Object.keys(weights).length===4 && Object.values(weights).reduce((sum,v)=>sum+v,0)===100;}
export const DEFAULT_SETTINGS = { ratingWeights: {...DEFAULT_RATING_WEIGHTS}, cupsPerWeek: 9100, gramsPerCup: 20, referenceLat: 1.3275, referenceLon: 103.8723, referenceLabel: 'CoffeeBot HQ, 8 Lor Bakar Batu, #05-01, Singapore 348743 (approximate coordinates)', reportingCollectedKg: null, reportingDiscardedKg: null, automaticAIAssessments: 24, aiProvider: 'template' };
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
 p4:{contactName:'CitySoil Team (demo)',contactEmail:'hello@citysoil.example',location:'Western Singapore (demo)',responseStatus:'positive',nextAction:'Review trial outcome'},
 p5:{contactName:'SporeWorks Research (demo)',contactEmail:'research@sporeworks.example',location:'Eastern Singapore (demo)',responseStatus:'awaiting-reply',nextAction:'Follow up on substrate feasibility'},
 p6:{contactName:'Northside Sustainability (demo)',contactEmail:'sustainability@northside.example',location:'Northern Singapore (demo)',responseStatus:'awaiting-reply',nextAction:'Discuss school garden trial'},
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
 const progress=({p1:'Regular',p2:'Regular',p3:'Regular',p4:'Trial',p5:'Contacted',p6:'Contacted',p7:'Interested'})[id];
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
  schemaVersion: 1, demo: true, demoProfilesVersion: 2, settings: { ...DEFAULT_SETTINGS },
  partners: [
    demo('p1','EcoGrow Urban Farm','urban farm','regular',70,{ use: 'Composting (demo)', frequency: 'Wednesdays (demo)' }),
    demo('p2','GreenCycle Organics','composting','regular',40,{ use: 'Composting (demo)', frequency: 'Thursdays (demo)' }),
    demo('p3','Rooted Gardens','community garden','regular',30,{ use: 'Gardening (demo)', frequency: 'Fridays (demo)' }),
    demo('p4','CitySoil Community Composting','community garden','trial',10,{ use: 'Community composting' }),
    demo('p5','SporeWorks Mushroom Farm','urban farm','contacted',null,{ use: 'Potential growing substrate research' }),
    demo('p6','Northside Primary School Garden','school garden','contacted',null,{ use: 'School gardening programme' }),
    demo('p7','LoopMaterials Studio','business','interested',null,{ use: 'Potential recycled material experiments' })
  ].map(p=>({...p,...DEMO_PROFILES[p.id]})),
  handovers: [], outreach: [], discoveryRuns: [], aiActivity: [], partnerActivity: DEMO_ACTIVITY.map(a=>({...a}))
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
// Source-only triage follows the model rubric's evidence thresholds.
// It never infers willingness, composting, authority, fees or capacity.
function screen(p){
 const src=String(p.source||'').toLowerCase(),cat=String(p.category||'').toLowerCase(),mat=String(p.materialEvidence||'').toLowerCase();
 if(p.directCoffeeEvidence)return {reuse:38,evidence:33,operational:0};
 if(src.includes('nea')||cat.includes('organic waste recycler')){
  const broad=/mixed food waste|food waste|organic waste/.test(mat);
  return {reuse:broad?13:8,evidence:broad?13:10,operational:0};
 }
 if(src.includes('community in bloom'))return {reuse:12,evidence:8,operational:0};
 if(src.includes('moe')||cat.includes('school programme'))return {reuse:7,evidence:6,operational:0};
 if(src.includes('nparks')||cat.includes('public park'))return {reuse:7,evidence:5,operational:0};
 if(src.includes('sfa')||cat.includes('crop farm'))return {reuse:12,evidence:10,operational:0};
 if(src.includes('lias')||cat.includes('landscap')){
  const equipment=/equipment|machiner|parts|irrigation|technology/.test(String(p.name||'').toLowerCase());
  return {reuse:equipment?4:11,evidence:8,operational:0};
 }
 if(/compost/.test(cat))return {reuse:15,evidence:8,operational:0};
 if(/garden|nursery|horticultur|farm/.test(cat))return {reuse:11,evidence:7,operational:0};
 return {reuse:5,evidence:3,operational:0};
}
export function scorePartner(p,gap,ratingWeights=DEFAULT_RATING_WEIGHTS){
 const weights=validRatingWeights(ratingWeights)?ratingWeights:DEFAULT_RATING_WEIGHTS;
 const aiLed=hasAIFit(p),a=p.aiAssessment||{};
 const q=aiLed?{reuse:a.reuseSuitability,evidence:a.sourceEvidence,operational:a.operationalCompatibility}:screen(p);
 const km=Number(p.distanceKm);
 const proximity=p.distanceKm==null||!Number.isFinite(km)?0:Math.round(Math.max(0,10-0.35*Math.max(0,km)));
 // Contactability is independently displayed/sorted; it is not evidence of operational handling.
 const verifiedReady=p.verified&&p.confirmed&&Number(p.capacityKg)>0?5:0;
 const operations=Math.min(15,q.operational+verifiedReady);
 const rawParts={suitability:q.reuse,evidence:q.evidence,proximity,operations};
 const maxima=DEFAULT_RATING_WEIGHTS;
 const parts=Object.fromEntries(Object.keys(maxima).map(key=>[key,Math.round(Math.max(0,Math.min(1,rawParts[key]/maxima[key]))*weights[key])]));
 const score=Object.values(parts).reduce((sum,v)=>sum+v,0);
 const reasons=[aiLed?a.reason:(p.directCoffeeEvidence?'Source explicitly mentions used coffee grounds':'Preliminary screening based on source category and available evidence')];
 if(p.distanceKm!=null)reasons.push('Approximately '+p.distanceKm+' km straight-line from HQ');
 return {score,aiLed,provisional:!aiLed,parts,weights:{...weights},
  reasons,checks:[aiLed?a.check:'Confirm actual grounds reuse and acceptance arrangements']};
}
export function rankPartners(partners,gap,ratingWeights=DEFAULT_RATING_WEIGHTS){
 return partners.filter(p=>p.status!=='closed'&&p.status!=='regular')
 .map(p=>({...p,match:scorePartner(p,gap,ratingWeights)}))
 .sort((a,b)=>b.match.score-a.match.score||Number(b.match.aiLed)-Number(a.match.aiLed)||a.name.localeCompare(b.name));
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
 if(/mushroom|fung/i.test(p.name+' '+p.use))return 'One idea could be a small controlled trial using prepared grounds as part of a growing substrate, provided your team considers them suitable and can advise on preparation.';
 if(/garden|farm|nursery|school|park|zoo|horticultur/i.test(c))return 'If you already have an appropriate composting setup, we wondered whether the grounds could be trialled as an ingredient in that process, rather than assuming they can be applied directly to soil.';
 if(/material|studio|experiment|research/i.test(c+' '+p.use))return 'We wondered whether the grounds might be useful in a small materials-reuse experiment, guided by your own processing and safety requirements.';
 return 'We would love to hear whether there is a suitable reuse process your team already follows where a small grounds trial could make sense.';
}
export function draftTemplate(p, kg) {
 const trial=Math.min(10,Math.max(1,Math.round(kg||10)));
 const hello=outreachSalutation(p);
 const idea=suggestedReuse(p);
 const context=/school/i.test(p.category||'')?'school gardening activities':
   /park|garden|nursery|farm|horticultur/i.test(p.category||'')?'gardening and growing activities':
   /compost|organic waste/i.test(p.category||'')?'organic materials and composting':
   /business|material|recycl/i.test(p.category||'')?'materials and reuse':
   'your organisation\'s activities';
 return {subject:OUTREACH_SUBJECT,
 body:`${hello}\n\nI'm reaching out from CoffeeBot. We're looking for local partners who might be interested in finding a useful second life for spent coffee grounds from our coffee machines.\n\nI came across ${p.name} while looking into ${context}. ${proposedReuseContext(p)}\n\nFor context, we currently collect and sun-dry the grounds at our headquarters, though we haven't measured their moisture content. If the material sounds relevant to your work, perhaps we could discuss a small trial of up to ${trial} kg and work out suitable collection arrangements and approvals together.\n\nWould you be open to a brief conversation?\n\nThanks for your time, and I look forward to hearing from you.\n\nBest regards,\nCoffeeBot Partnerships`,
 suggestedUse:idea,guide:'Verify material suitability, contact and collection arrangements.',mode:'Template fallback (no AI selected)'};
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
