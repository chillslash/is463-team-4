import {curatedReuseCase} from './reuse-opportunities.js';
﻿import {activeEvidenceReview,evidenceQuality} from './evidence-review.js';
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
// Reader-facing suggestions rather than an internal prospect-screening checklist.
// These are conditional reuse possibilities, NOT directions for preparing or applying grounds.
const pathways={
 recycler:'A possible route is to process CoffeeBot spent coffee grounds as an input to your existing organic-waste recycling stream, if that stream can accept them.',
 education:'A supervised sustainability or STEM activity could explore the grounds as a potential input to a managed composting demonstration or a materials-reuse study, if that fits your programme.',
 farm:'If your farm has an existing composting or growing-media preparation process, a trial could assess whether spent grounds might be suitable as an input to that process. Direct application to crops is not proposed.',
 compost:'If you run a managed composting process, you could explore whether spent coffee grounds can be incorporated as one of its inputs.',
 garden:'If your garden operates a managed composting programme, you could explore the grounds as one possible input, with any resulting compost considered for future horticultural work.',
 park:'For an authorised park horticulture or composting programme, a small trial could explore coffee grounds as a possible input to an existing managed process.',
 research:'A research team could evaluate a small batch of coffee grounds in a controlled composting, substrate-development or material-recovery study relevant to its work.',
 other:'If you have a materials-reuse or composting activity, we could explore whether a small batch of spent coffee grounds could be useful as an input. The specific use would first need to be identified.'
};
const questions={
 recycler:'Would the grounds be suitable for your current recycling process, including its feedstock requirements and any fees?',
 education:'Would a supervised composting or materials-reuse activity fit your programme, and who could lead it?',
 farm:'Do you use composting or prepare growing media, and could that process trial spent grounds?',
 compost:'Could your managed composting process trial a small amount of spent coffee grounds?',
 garden:'Does your garden operate a managed composting process that could trial grounds?',
 park:'Is there an existing authorised composting or horticultural process that could evaluate grounds?',
 research:'Would a controlled material-reuse study involving grounds suit a current research project?',
 other:'Which existing reuse activity, if any, could make use of the grounds?'
};
const feedback={
 recycler:'whether the grounds could be processed in the intended recycling stream',
 education:'whether the grounds supported a practical learning or research activity',
 farm:'whether the grounds were suitable for the identified composting or growing-media process',
 compost:'whether they worked in your existing managed composting process',
 garden:'whether they could be used in the garden composting process',
 park:'whether an authorised managed process could use the grounds',
 research:'whether they were useful for the agreed research activity',
 other:'whether the grounds could be used in the agreed reuse activity'
};
// Select material-specific facts from a CURRENT, source-cited assessment, not free-form
// model prose. All outgoing wording is fixed; untrusted webpage excerpts are never pasted.
const WEBSITE_SIGNALS=[
 {pattern:/cocopeat.{0,100}compost|compost.{0,100}cocopeat/i,
  observation:'reusing cocopeat together with organic compost after a harvest',
  idea:'Since your materials describe combining compost with reused cocopeat after harvest, one possible trial is to evaluate grounds as an input to the existing compost stage before the growing medium is prepared.',
  question:'Could grounds fit that cocopeat-and-compost process, and what preparation would be required?'},
 {pattern:/potting (?:soil|mix)|soil mix|premium compost|compost products/i,
  observation:'potting soils or compost products',
  idea:'Your range includes potting mixes and compost products. If you prepare any compost in-house, you could explore grounds as a potential composting input before that material is used in a product; if you only distribute finished products, this may not apply.',
  question:'Are those materials processed in-house or sold as finished products, and is any process suitable for grounds?'},
 {pattern:/anaerobic digesti|biogas|waste.to.energy/i,
  observation:'anaerobic digestion or biogas operations',
  idea:'If your anaerobic digestion or biogas process accepts this type of organic solid, a small trial could assess spent grounds as a potential feedstock.',
  question:'Could the process accept solid, sun-dried grounds, or is it limited to other feedstocks?'},
 {pattern:/wastemaster|food waste treatment system|on.site food waste treatment/i,
  observation:'a food-waste treatment system',
  idea:'Your food-waste treatment system could be a potential route for processing spent coffee grounds, provided its permitted feedstock and handling requirements allow them.',
  question:'Does that specific treatment system permit coffee grounds as a feedstock?'},
 {pattern:/treated post.consumer food waste|food.waste.derived feed|feed made from treated/i,
  observation:'processing food waste into feed',
  idea:'Your food-waste treatment activity may offer a possible materials-processing route, but any trial with grounds would first need to establish whether they are permitted inputs, especially for downstream feed.',
  question:'Would spent grounds be an allowed input in that process and its downstream products?'},
 {pattern:/horticultural lighting|plant factory|aeroponics|fogponics|hydroponics|substrate.based cultivation/i,
  observation:'horticultural technology or soilless and substrate-based cultivation systems',
  idea:'Your work includes horticultural technology and substrate-based systems. If you operate a cultivation site with an appropriate composting or substrate-preparation process, grounds could be evaluated as a potential input; equipment supply alone would not create a reuse need.',
  question:'Does this organisation itself operate a growing site with a compatible material-consuming process, rather than only supplying equipment?'},
 {pattern:/mushroom cultivation|mushroom growing|mycelium|fungal substrate/i,
  observation:'fungal cultivation or substrate work',
  idea:'For a controlled fungal-cultivation or substrate research process, prepared spent grounds could be assessed as a possible substrate ingredient, subject to the operator requirements.',
  question:'Is there a controlled process in which prepared grounds could be assessed as a substrate ingredient?'},
 {pattern:/horticulturists|nursery specialists|arborists|landscape managers/i,
  observation:'a landscape or horticulture specialist team',
  idea:'If your horticultural team operates an in-house composting or soil-preparation process, grounds could be explored as an input to that existing process.',
  question:'Does the team actually operate a material-consuming compost or soil-management process?'},
 {pattern:/managed composting|composting facil|composting process/i,
  observation:'a composting process',
  idea:'Since you have a composting process, one possibility is to trial spent grounds as a potential input under your existing operating requirements.',
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
    idea:'Your NEA listing includes used coffee grounds among the facility materials. A practical possibility is to direct a trial batch into that established recycling stream, subject to your current intake specifications.',
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
  const alternatives=matches.filter(m=>m.signal!==signal&&m.signal.idea!==signal.idea)
    .slice(0,1).map(m=>({idea:m.signal.idea,source:{label:m.e.source||'Organisation website',url:m.e.url}}));
  return {description:'An organisation-page excerpt describes '+signal.observation+'. Whether grounds could fit that activity is unconfirmed.',
   idea:signal.idea,alternatives,question:signal.question,source:{label:e.source||'Organisation website',url:e.url},kind:'website'};
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
     idea:'NEA lists '+stream+' among the materials handled by your facility. One potential reuse route is to assess whether spent coffee grounds could also be processed through that existing stream; the listing does not confirm grounds acceptance.',
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
      idea:'Your "'+title+'" programme could potentially explore spent coffee grounds through a supervised materials-reuse investigation or managed composting demonstration, if suitable for its educational activities.',
      question:'Does this programme have a real activity that could use spent grounds, with an authorised staff lead?',
      source:{label:e.source,url:e.url},kind:'programme'};
  }
 }
 return null;
}
export function generateReuseGuide(p){
 const type=guideKind(p),evidence=organisationEvidence(p,type),curated=curatedReuseCase(p);
 // Suggest multiple independently documented routes only where the evidence permits it.
 const opportunities=curated
  ?curated.opportunities.map(o=>o.title+'\n'+o.description+'\n'+o.collaboration)
  :evidence
   ?[evidence.idea,...(evidence.alternatives||[]).map(o=>o.idea)]
   :[pathways[type]];
 const pathway=opportunities.length>1
  ?opportunities.map((idea,i)=>(i+1)+'. '+idea).join('\n\n')
  :opportunities[0];
 const supply='CoffeeBot collects spent grounds from its coffee machines, sun-dries them at HQ and stores them for onward collection. We could discuss a small trial batch and suitable collection or delivery arrangements. Moisture content has not been measured.';
 const before=[
  '- '+(curated?.firstTrialQuestion||evidence?.question||questions[type]),
  '- What preparation, handling or organisational approvals would you require?',
  '- What initial quantity, schedule and collection or delivery arrangement would work for you?'
 ];
 if(type==='recycler')before[1]='- Are there fees or specific material-condition requirements for a trial?';
 const outcome=curated?'which documented recovery route could make good use of the material':type==='garden'&&evidence?.kind==='website'
  ?'whether a suitable composting or soil-preparation activity could actually use the grounds'
  :feedback[type];
 const learn='If a trial goes ahead, we would value your feedback on '+outcome+', what handling adjustments were needed, and whether future batches might be useful.';
 return {partnerId:p.id,partnerName:p.name,sections:{pathway,supply,before:before.join('\n'),learn},
  source:curated?curated.sources[0]:evidence?.source||null,
  sources:curated?curated.sources:evidence?[evidence.source,...(evidence.alternatives||[]).map(a=>a.source)]:[],
  opportunityCount:opportunities.length,evidenceBasis:curated?'curated':evidence?.kind||'category'};
}
export function formatReuseGuide(g){
 return 'Reuse Guide: '+g.partnerName+'\n\n'+GUIDE_SECTIONS.map(([key,title])=>title+'\n'+g.sections[key]).join('\n\n');
}
