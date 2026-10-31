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
export function generateReuseGuide(p){
 const type=guideKind(p),demo=p.source==='Fictional Stitch scenario';
 const source=(p.evidenceEntries||[]).find(e=>p.directCoffeeEvidence&&/used coffee grounds|spent coffee grounds/i.test(e.claim||'')&&/^https:\/\//.test(e.url||''));
 const pathway=p.name+' '+pathways[type]+(source?' Published source evidence mentions coffee grounds for this organisation; confirm the latest intake conditions before relying on it.':'');
 const supply='CoffeeBot collects spent grounds from its machines, brings them to HQ and sun-dries them before storage. Moisture content is not measured. Supply varies with machine usage; no quantity is promised by this guide. Collection from HQ or a feasible delivery can be discussed.';
 const before=[
  ...questions[type].map(q=>'To confirm: '+q),
  known(p.agreedUse)?'Recorded agreed use (reconfirm): '+p.agreedUse:known(p.use)?'Recorded potential use (not confirmed): '+p.use:'To confirm: intended reuse purpose.',
  Number(p.capacityKg)>0?(demo?'Illustrative demo intake':p.status==='regular'?'Recorded Regular intake':'Recorded proposed intake')+': '+Number(p.capacityKg)+' kg/week; reconfirm before relying on it.':'To confirm: realistic quantity per collection.',
  known(p.frequency)&&!demo?'Recorded frequency (reconfirm): '+p.frequency:'To confirm: one-off or recurring frequency.',
  p.transportArrangement==='partner-collects'?'Recorded arrangement: partner collects; reconfirm timing.':p.transportArrangement==='coffeebot-delivers'?'Recorded arrangement: CoffeeBot delivers; reconfirm route feasibility.':p.transportArrangement==='either'?'Recorded arrangement: flexible; confirm collection/delivery.':'To confirm: collection from HQ or feasible delivery.',
  known(p.groundsAccepted)?'Recorded grounds-condition preference: '+({dry:'dried',wet:'wet',either:'either'}[p.groundsAccepted]||p.groundsAccepted)+'; confirm compatibility with sun-dried grounds.':'To confirm: grounds condition and preparation requirements.',
  'To confirm: available storage, approval and any fees.'
 ].join('\n');
 const learn=[feedback[type],'Were the quantity and condition appropriate?','What evidence shows the material was actually used rather than only handed over?','Were storage and transport arrangements workable?','Would another batch be useful? If so, what quantity and frequency?'].join('\n');
 return {partnerId:p.id,partnerName:p.name,sections:{pathway,supply,before,learn},
  source:source?{label:source.source||p.source,url:source.url}:null,
  note:'Prepared from recorded partner information and CoffeeBot operational facts. Staff must review before sharing; this is neither technical approval nor proof of reuse.'};
}
export function formatReuseGuide(g){
 return 'Reuse Guide: '+g.partnerName+'\n\n'+GUIDE_SECTIONS.map(([key,title])=>title+'\n'+g.sections[key]).join('\n\n')+(g.source?'\n\nSource to verify: '+g.source.url:'')+'\n\n'+g.note;
}