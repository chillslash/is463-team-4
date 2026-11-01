import {activeEvidenceReview,evidenceQuality} from './evidence-review.js';
// Rule-based partner guide: no extra AI inference or technical-use guarantees.
export const GUIDE_SECTIONS=[['pathway','Potential Reuse Pathway'],['supply','What CoffeeBot Can Provide'],['before','Before Starting a Trial'],['learn',"What We'd Like to Learn"]];
const known=v=>v!=null&&String(v).trim()&&!/^(unknown|none|not discussed|n\/a)$/i.test(String(v).trim());
export function guideKind(p){
 const c=String(p.category||'').toLowerCase(),n=String(p.name||'').toLowerCase();
 if(/recycl|organic waste|processor/.test(c))return 'recycler';
 if(/school|education|polytechnic|university|college|research institute/.test(c)||(/school|polytechnic|university/.test(n)&&/moe|community in bloom/.test(String(p.source||'').toLowerCase())))return 'education';
 if(/crop farm|urban farm|vegetable|aquaculture|farm/.test(c))return 'farm';
 if(/compost/.test(c))return 'compost';
 if(/community garden|garden|nursery|horticultur|landscap/.test(c))return 'garden';
 if(/park|nature reserve|zoo/.test(c))return 'park';
 if(/research|material|laboratory/.test(c))return 'research';
 return 'other';
}
const pathways={
 recycler:'could explore whether spent coffee grounds fit its accepted-material streams and a defined processing route. A recycler listing does not prove current acceptance, fees or beneficial end use.',
 education:'could explore a specific educational, sustainability or research activity using grounds. The programme listing alone does not establish a suitable activity or approval.',
 farm:'could explore compatibility with an existing growing-medium, composting or other material-consuming process, if one is actually used. A farm licence does not establish coffee-ground compatibility.',
 compost:'could explore grounds as a possible input to an existing managed composting process, subject to operator approval and material requirements.',
 garden:'could explore an existing managed composting or horticultural process, if one is available. Do not assume direct application to soil is suitable or authorised.',
 park:'could explore an authorised managed horticultural or composting activity only through the responsible operator. A public site listing is not permission to apply grounds.',
 research:'could explore a defined materials-reuse experiment with the receiving team confirming preparation and approvals.',
 other:'may have a reuse opportunity, but its category does not establish a specific suitable pathway. Ask for the intended process before suggesting a trial.'
};
const questions={
 recycler:['Are spent coffee grounds explicitly accepted in the current process?','What feedstock, contamination or preparation specifications apply?','Are there fees, and what is the intended processing outcome?'],
 education:['Which educational or research activity would use the material?','Who will receive and manage it, and which institutional approvals apply?','Is this a one-off project or a recurring need?'],
 farm:['What growing method and relevant material-consuming process does the farm actually use?','Can that process take spent coffee grounds, and with what preparation?','Who approves the trial and could it support recurring material intake?'],
 compost:['Is there an existing managed composting process for these grounds?','Who operates and approves it, and what preparation is required?'],
 garden:['Does the organisation operate a relevant composting or horticultural process?','Who is responsible for permission and site storage?'],
 park:['Who is the authorised NParks or contracted decision-maker?','Is there a permitted process, and what site restrictions apply?'],
 research:['What is the precise experimental purpose?','Who will manage the material, and which project approvals are required?'],
 other:['What exactly would the organisation do with the grounds?','Who approves the activity and what preparation is required?']
};
const feedback={
 recycler:'Was the material accepted and actually processed through the intended route? Were fees or preparation barriers involved?',
 education:'Did the proposed educational/research activity take place? Would additional batches be useful?',
 farm:'Were the grounds used in the intended farm process, and were there handling or compatibility issues?',
 compost:'Were the grounds incorporated into the intended composting process?',
 garden:'Were the grounds used in the proposed managed process, and were there site or storage issues?',
 park:'Was use approved and completed through the authorised operator?',
 research:'Was the intended experiment completed using the material? Would future samples help?',
 other:'Was the stated reuse activity carried out rather than the grounds simply being received?'
};
// Select material-specific facts from a CURRENT, source-cited assessment, not free-form
// model prose. All outgoing wording is fixed; untrusted webpage excerpts are never pasted.
const WEBSITE_SIGNALS=[
 {pattern:/cocopeat.{0,100}compost|compost.{0,100}cocopeat/i,
  observation:'reusing cocopeat together with organic compost after a harvest',
  question:'Could grounds fit that cocopeat-and-compost process, and what preparation would be required?'},
 {pattern:/potting (?:soil|mix)|soil mix|premium compost|compost products/i,
  observation:'potting soils or compost products',
  question:'Are those materials processed in-house or sold as finished products, and is any process suitable for grounds?'},
 {pattern:/anaerobic digesti|biogas|waste.to.energy/i,
  observation:'anaerobic digestion or biogas operations',
  question:'Could the process accept solid, sun-dried grounds, or is it limited to other feedstocks?'},
 {pattern:/wastemaster|food waste treatment system|on.site food waste treatment/i,
  observation:'a food-waste treatment system',
  question:'Does that specific treatment system permit coffee grounds as a feedstock?'},
 {pattern:/treated post.consumer food waste|food.waste.derived feed|feed made from treated/i,
  observation:'processing food waste into feed',
  question:'Would spent grounds be an allowed input in that process and its downstream products?'},
 {pattern:/horticultural lighting|plant factory|aeroponics|fogponics|hydroponics|substrate.based cultivation/i,
  observation:'horticultural technology or soilless and substrate-based cultivation systems',
  question:'Does this organisation itself operate a growing site with a compatible material-consuming process, rather than only supplying equipment?'},
 {pattern:/mushroom cultivation|mushroom growing|mycelium|fungal substrate/i,
  observation:'fungal cultivation or substrate work',
  question:'Is there a controlled process in which prepared grounds could be assessed as a substrate ingredient?'},
 {pattern:/horticulturists|nursery specialists|arborists|landscape managers/i,
  observation:'a landscape or horticulture specialist team',
  question:'Does the team actually operate a material-consuming compost or soil-management process?'},
 {pattern:/managed composting|composting facil|composting process/i,
  observation:'a composting process',
  question:'Would the operator consider grounds as an input, and under what conditions?'}
];
const host=u=>{try{return new URL(u).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}};
function organisationEvidence(p,type){
 const entries=p.evidenceEntries||[];
 const review=activeEvidenceReview(p);
 const cited=new Set([...(review?.evidenceIds||[]),...(review?.intakeEvidenceIds||[])]);
 const verifiedHost=host(p.websiteUrl||'');
 // A directly relevant source statement does not require an AI assessment.
 if(p.directCoffeeEvidence){
  const match=entries.find(e=>/^https:\/\//i.test(e.url||'')&&
    /accepted materials\s*:\s*.*(?:used|spent) coffee grounds/i.test(e.claim||'')&&
    evidenceQuality(e,p));
  if(match)return {description:'The published recycling-facility listing explicitly names used coffee grounds among the materials associated with this organisation. Current acceptance and handling terms still need confirmation.',
    question:'What is the current permitted intake and preparation specification for spent grounds?',
    source:{label:match.source||p.source,url:match.url},kind:'direct'};
 }
 // Do not treat a licence/directory, general mission statement, outdated page,
 // uncited excerpt or unrelated business as organisation-specific reuse evidence.
 const matches=[];
 for(const [index,e] of entries.entries()){
  if(!cited.has(index)||!review||!evidenceQuality(e,p)||
     !/Organisation website excerpt/i.test(e.source||'')||!verifiedHost||
     host(e.url)!==verifiedHost)continue;
  for(const [rank,signal] of WEBSITE_SIGNALS.entries()){
   if(signal.pattern.test(e.claim||'')){
    matches.push({rank,signal,e});break;
   }
  }
 }
 matches.sort((a,b)=>a.rank-b.rank);
 if(matches.length){
  const {signal,e}=matches[0];
  return {description:'An organisation-page excerpt describes '+signal.observation+'. Whether grounds could fit that activity is unconfirmed.',
   question:signal.question,source:{label:e.source||'Organisation website',url:e.url},kind:'website'};
 }
 // NEA names accepted material streams, which must not be conflated with coffee-ground acceptance.
 if(type==='recycler' && review){
  const match=entries.find((e,i)=>cited.has(i)&&/NEA Food Waste Recycling Facilities/i.test(e.source||'')&&
     evidenceQuality(e,p)&&/^https:\/\//i.test(e.url||'')&&/accepted materials:/i.test(e.claim||''));
  if(match){
   const mat=match.claim.split(/accepted materials:/i)[1]||'';
   const stream=/mixed food waste/i.test(mat)?'mixed food waste':
    /dried food waste/i.test(mat)?'dried food waste':
    /spent grains|okara/i.test(mat)?'spent grains or related food by-products':
    /manufacturing|factory by.products/i.test(mat)?'manufacturing food by-products':
    /food waste/i.test(mat)?'other food-waste materials':null;
   if(stream)return {description:'NEA lists '+stream+' for this facility, but the cited listing does not explicitly establish acceptance of spent coffee grounds.',
     question:'Could its listed '+stream+' stream accept sun-dried grounds, and which material specifications apply?',
     source:{label:match.source,url:match.url},kind:'directory-material'};
  }
 }
 // MOE programme titles are organisation-specific context, not technical reuse proof.
 if(type==='education'){
  const e=entries.find(e=>/^https:\/\//i.test(e.url||'')&&
   /MOE School Distinctive Programmes/i.test(e.source||'')&&
   (e.claim||'').startsWith('MOE lists ')&&
   (e.claim||'').endsWith(' for '+p.name));
  if(e){
   const title=e.claim.slice('MOE lists '.length,-(' for '+p.name).length).trim();
   if(title.length>=5&&title.length<=100&&!/[<>\n\r]/.test(title))
    return {description:'The MOE listing identifies the programme "'+title+'". That suggests a possible discussion topic, not a confirmed garden, material use or permission.',
      question:'Does this programme have a real activity that could use spent grounds, with an authorised staff lead?',
      source:{label:e.source,url:e.url},kind:'programme'};
  }
 }
 return null;
}
export function generateReuseGuide(p){
 const type=guideKind(p),demo=p.source==='Fictional Stitch scenario';
 const evidence=organisationEvidence(p,type);
 const pathway=evidence?p.name+': '+evidence.description:p.name+' '+pathways[type];
 const supply='CoffeeBot collects grounds from its machines and sun-dries them at HQ before storage. Moisture content has not been measured. Quantity and collection or delivery arrangements must be discussed, not assumed.';
 const before=[
  'To confirm before a trial:',
  '- '+(evidence?.question||questions[type][0]),
  '- '+(evidence?(type==='recycler'?questions[type][2]:(type==='education'||type==='garden'||type==='park'?questions[type][1]:questions[type][0])):questions[type][1]||questions[type][0]),
  Number(p.capacityKg)>0?(demo?'- Illustrative demo intake':p.status==='regular'?'- Recorded Regular intake':'- Recorded proposed intake')+
    ': '+Number(p.capacityKg)+' kg/week; reconfirm.':
    '- What quantity could the organisation realistically take?',
  known(p.frequency)&&!demo?'- Recorded frequency (reconfirm): '+p.frequency:
    '- Is intake one-off or recurring, and at what frequency?',
  p.transportArrangement==='partner-collects'?'- Recorded arrangement: partner collects; reconfirm timing.':
    p.transportArrangement==='coffeebot-delivers'?'- Recorded arrangement: CoffeeBot delivers; reconfirm route feasibility.':
    p.transportArrangement==='either'?'- Recorded arrangement: flexible; confirm collection/delivery.':
    '- Can the partner collect from HQ, or would delivery be feasible?',
  '- What grounds preparation, storage, permissions and fees apply?'
 ];
 if(known(p.agreedUse))before.splice(3,0,'- Recorded agreed use (reconfirm): '+p.agreedUse);
 else if(known(p.use)&&p.source==='Staff-entered lead')before.splice(3,0,'- Staff-recorded potential use (unconfirmed): '+p.use);
 if(known(p.groundsAccepted))before.push('- Recorded grounds condition (reconfirm): '+({dry:'dried',wet:'wet',either:'either'}[p.groundsAccepted]||p.groundsAccepted));
 const learn=['- '+feedback[type],
  '- What evidence shows the material was actually reused rather than simply handed over?',
  '- Were logistics workable, and what quantity and frequency could be repeated?'].join('\n');
 return {partnerId:p.id,partnerName:p.name,sections:{pathway,supply,before:before.join('\n'),learn},
  source:evidence?.source||null,
  evidenceBasis:evidence?.kind||'category'};
}
export function formatReuseGuide(g){
 return 'Reuse Guide: '+g.partnerName+'\n\n'+GUIDE_SECTIONS.map(([key,title])=>title+'\n'+g.sections[key]).join('\n\n');
}
