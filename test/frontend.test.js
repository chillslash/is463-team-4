import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

function sample(){
 const ranked=Array.from({length:35},(_,i)=>({
  id:'p'+i,name:'Sample Partner '+i,status:'suggested',source:'Example public dataset',
  sourceUrl:'https://example.org/partner/'+i,category:'garden',use:'Potential composting',verified:false,
  contactEmail:i===0?'contact@example.org':'',sourcedAt:'2026-10-18T07:00:00Z',distanceKm:i+1,
  match:{score:90-i,aiLed:i===0,parts:{suitability:30,evidence:30,proximity:8,operations:7},checks:['Confirm interest and authorised contact']},
  aiAssessment:i===0?{reason:'Evidence supports a plausible reuse trial.'}:null
 }));
 return {ranked,partners:ranked,discoveryRuns:[],aiActivity:[],metrics:{},settings:{},handovers:[],outreach:[]};
}

async function boot(pathname,search=''){
 const root={innerHTML:''},listeners={},copied=[];
 const fields={'#draft-recipient':{value:'contact@example.org'},'#draft-subject':{value:'Custom subject'},'#draft-body':{value:'Custom email body'}};
 const document={
  querySelector(selector){return selector==='#app-main'?root:fields[selector]||null;},
  querySelectorAll(){return [];},
  addEventListener(name,fn){listeners[name]=fn;},
  createElement(){return {style:{},setAttribute(){},remove(){}};},
  body:{append(){}}
 };
 const context={document,fetch:async()=>({ok:true,json:async()=>sample()}),location:{pathname,search},
  URLSearchParams,Intl,Date,setTimeout:()=>0,clearTimeout,setInterval,clearInterval,console,navigator:{clipboard:{writeText:async text=>copied.push(text)}}};
 runInNewContext(script,context);
 await new Promise(resolve=>setImmediate(resolve));
 return {root,listeners,context,copied};
}

test('discovery cards highlight on hover and toggle details without intercepting controls',async()=>{
 const {root,listeners}=await boot('/find-partners');
 assert.equal((root.innerHTML.match(/data-listing-id=/g)||[]).length,15);
 assert.ok(root.innerHTML.includes('View source'));
 assert.ok(!root.innerHTML.includes('AI Usage'));
 assert.ok(root.innerHTML.includes('Preliminary screening based on source category and available evidence.'));
 assert.ok(root.innerHTML.includes('AI Review Notes:'));
 assert.ok(!root.innerHTML.includes('co-highlight'));
 assert.ok(root.innerHTML.includes('Showing 1–15 of 35'));
 await listeners.click({target:{closest(query){
  return query==='[data-action],[data-href]'?{dataset:{action:'page',page:'2'}}:null;
 }},preventDefault(){}});
 assert.ok(root.innerHTML.includes('Showing 16–30 of 35'));
 assert.equal((root.innerHTML.match(/data-listing-id=/g)||[]).length,15);
 const details={open:false},attributes={};
 const card={querySelector:()=>details,setAttribute:(k,v)=>attributes[k]=v};
 const target={closest(query){
  return query==='.co-discovery-card[data-listing-id]'?card:null;
 }};
 await listeners.click({target,preventDefault(){}});
 assert.equal(details.open,true);
 assert.equal(attributes['aria-expanded'],'true');
 const linkTarget={closest(query){
  if(query==='.co-discovery-card[data-listing-id]')return card;
  if(query==='a,button,input,select,textarea,details,summary')return {};
  return null;
 }};
 await listeners.click({target:linkTarget,preventDefault(){}});
 assert.equal(details.open,true);
 let prevented=false;
 listeners.keydown({key:' ',target:{matches:sel=>sel==='.co-discovery-card[data-listing-id]',querySelector:()=>details,setAttribute:(k,v)=>attributes[k]=v},preventDefault(){prevented=true;}});
 assert.equal(details.open,false);
 assert.ok(prevented);
 listeners.toggle({target:{matches:sel=>sel==='.co-candidate-details',closest:sel=>sel==='.co-discovery-card'?card:null,open:true}});
 assert.equal(attributes['aria-expanded'],'true','Native summary activation keeps the card accessible state in sync');
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-discovery-card:hover,'));
 assert.ok(css.includes('.co-manage-page .co-manage-row:hover,'));
 assert.ok(css.includes('box-shadow:inset 4px 0 #498565'));
});
test('draft loading button uses a clean ASCII ellipsis instead of garbled characters',()=>{
 assert.ok(script.includes("el.textContent='Preparing Draft...'"));
 assert.ok(!script.includes('Preparing DraftÃ¢'));
});

test('draft guidance is ghost text with recipient and subject copy controls',async()=>{
 const {root}=await boot('/outreach');
 assert.ok(root.innerHTML.includes('placeholder="Generate a draft to get started."'));
 assert.ok(root.innerHTML.includes('data-action="copy-recipient"'));
 assert.ok(root.innerHTML.includes('data-action="copy-subject"'));
 assert.ok(root.innerHTML.includes('data-action="copy"'));
 assert.ok(!root.innerHTML.includes('□'));
});

test('outreach hides reuse guide until shared draft generation is requested',async()=>{
 const {root,context}=await boot('/outreach','?partner=p0');
 assert.ok(root.innerHTML.includes('id="reuse-guide-container"'));
 assert.ok(!root.innerHTML.includes('co-guide-section'));
 assert.ok(!root.innerHTML.includes('data-action="guide-copy"'));
 assert.ok(root.innerHTML.includes('data-action="generate"'));
 runInNewContext("ui.reuseGuides.p0={partnerName:'Sample Partner 0',sections:{pathway:'Possible managed composting',supply:'Sun-dried at HQ',before:'Confirm quantities',learn:'Confirm actual use'}};ui.guideVisible=true;render()",context);
 assert.ok(root.innerHTML.includes('co-guide-section'));
 assert.ok(root.innerHTML.includes('data-action="guide-copy"'));
 assert.ok(root.innerHTML.includes('Possible managed composting'));
 assert.ok(!root.innerHTML.includes('Check published source'));
 assert.ok(script.includes('const guidePromise=loadReuseGuide(id).then('));
 assert.ok(script.includes('const draft=await request('));
 assert.ok(script.includes("if(initialBody.trim()&&initialBody!==ui.generatedDraftBody&&!confirm("));
 assert.ok(script.includes('ui.generatedDraftBody=draft.body;'));
 assert.ok(!script.includes('if(chosen)try{await loadReuseGuide(chosen.id)'));
});

test('copy controls copy the entered content without requiring AI generation',async()=>{
 const {listeners,copied}=await boot('/outreach');
 const act=async action=>listeners.click({
  target:{closest:selector=>selector==='[data-action],[data-href]'?{dataset:{action}}:null},
  preventDefault(){}
 });
 await act('copy-recipient');
 await act('copy-subject');
 await act('copy');
 assert.deepEqual(copied,[
  'contact@example.org',
  'Custom subject',
  'Subject: Custom subject\n\nCustom email body'
 ]);
});

test('listing fit uses a tiered coloured bar and copy controls have capitalised labels',async()=>{
 const {root,context}=await boot('/find-partners');
 assert.ok(root.innerHTML.includes('co-fit-meter co-fit-good'));
 runInNewContext('ui.sort="nearest"; data.ranked[1].match.score=60; render()',context);
 assert.ok(root.innerHTML.includes('co-fit-meter co-fit-moderate'));
 assert.ok(!root.innerHTML.includes('>Fit 90/100<'));
 assert.ok(root.innerHTML.includes('width:90%'));
 runInNewContext('data.ranked[0].match.score=25; render()',context);
 assert.ok(root.innerHTML.includes('co-fit-meter co-fit-low'));
 const draft=await boot('/outreach');
 assert.ok(draft.root.innerHTML.includes('aria-label="Copy Recipient"'));
 assert.ok(draft.root.innerHTML.includes('aria-label="Copy Subject"'));
});

test('all navigation pages use the updated two-line brand and centred staff label',()=>{
 for(const page of ['find_partners','this_week','outreach_draft','manage_partners','partner']){
  const html=readFileSync(new URL('../public/'+page+'.html',import.meta.url),'utf8');
  assert.match(html,/class="co-brand-name[^"]*"><span>Circularity<\/span><span>Copilot<\/span><\/span>/);
  assert.match(html,/<span class="co-workspace-title[^"]*">CoffeeBot Singapore<\/span>/);
  assert.match(html,/class="co-demo-staff[^"]*">Demo Staff<\/div>/);
  assert.ok(!html.includes('Circularity Ops'));
  assert.ok(!html.includes('>Partnerships</div>'));
 }
});

test('discovery progress tracks AI batches and displays its actual completion percentage',async()=>{
 const {root,context}=await boot('/find-partners');
 const status=(completed,phase,extra='')=>runInNewContext('discoveryViewProgress({completed:'+completed+',phase:'+JSON.stringify(phase)+',total:4'+extra+'})',context);
 const first=status(0,'Discovering Partners');
 assert.equal(first.percentage,5);
 assert.equal(first.label,'5% Complete');
 assert.equal(status(1,'Researching Contacts').percentage,15);
 const start=status(2,'Assessing and Ranking Partners',',batchTotal:2,batchCompleted:0');
 const halfway=status(2,'Assessing and Ranking Partners',',batchTotal:2,batchCompleted:1');
 const done=status(2,'Assessing and Ranking Partners',',batchTotal:2,batchCompleted:2');
 assert.equal(start.percentage,25);
 assert.equal(start.detail,'Evaluating Batch 1 of 2');
 assert.equal(halfway.percentage,58);
 assert.equal(halfway.detail,'Evaluating Batch 2 of 2');
 assert.equal(done.percentage,90);
 assert.equal(done.detail,'Evaluated All 2 Batches');
 assert.equal(status(3,'Finalising Results').percentage,95);
 assert.equal(status(4,'Completed').percentage,100);
 for(const progress of [first,start,halfway,done])assert.equal(progress.label,progress.percentage+'% Complete');
 assert.ok(!root.innerHTML.includes('discovery-progress"  role'));
 assert.ok(root.innerHTML.includes('5 Sources')===false);
});
test('partner edit and AI review actions use consistent outlined buttons',async()=>{
 const {root}=await boot('/find-partners');
 assert.ok(root.innerHTML.includes('>Edit Partner</button>'));
  assert.ok(root.innerHTML.includes('class="co-button alt small" data-action="ai-review"'));
  assert.ok(!root.innerHTML.includes('>Edit Info</button>'));
 assert.ok(!root.innerHTML.includes('>Review Partner</button>'));
 const outreach=await boot('/outreach');
 assert.ok(outreach.root.innerHTML.includes('>Edit Partner</button>'));
});
test('Best Fit sorts numerically and AI-Assessed Only filters with pagination reset',async()=>{
 const {root,context}=await boot('/find-partners');
 assert.ok(root.innerHTML.includes('id="ai-assessed-filter"'));
 assert.ok(root.innerHTML.includes('AI-Assessed Only'));
 assert.ok(root.innerHTML.includes('co-fit-meter-method'));
 assert.ok(root.innerHTML.includes('Rule-Ranked'));
 runInNewContext('data.ranked.forEach((p,i)=>{p.match.score=i===1?82:i===0?17:10;});render()',context);
 assert.equal(root.innerHTML.match(/data-listing-id="([^"]+)"/)[1],'p1');
 runInNewContext('ui.page=3;ui.aiAssessedOnly=true;render()',context);
 assert.equal((root.innerHTML.match(/data-listing-id=/g)||[]).length,1);
 assert.equal(root.innerHTML.match(/data-listing-id="([^"]+)"/)[1],'p0');
 assert.ok(root.innerHTML.includes('Showing 1–1 of 1'));
 assert.ok(root.innerHTML.includes('id="ai-assessed-filter" checked'));
 assert.ok(root.innerHTML.includes('AI-Assessed'));
 assert.ok(root.innerHTML.includes('17/100'));
 assert.equal(runInNewContext('ui.page',context),1);
 runInNewContext('ui.search="not-there";render()',context);
 assert.ok(root.innerHTML.includes('No AI-assessed partners match your filters.'));
 runInNewContext('ui.aiAssessedOnly=false;ui.search="";render()',context);
 assert.equal((root.innerHTML.match(/data-listing-id=/g)||[]).length,15);
 assert.equal(root.innerHTML.match(/data-listing-id="([^"]+)"/)[1],'p1');
});
test('discovery places controls on left and listings on right, ordered Search, Sort, Category, AI',async()=>{
 const {root}=await boot('/find-partners');
 const html=root.innerHTML;
 assert.ok(html.includes('class="co-discovery-layout"'));
 assert.ok(html.includes('class="co-discovery-main"'));
 assert.ok(html.includes('class="co-discovery-sidebar"'));
 const panel=html.indexOf('class="co-discovery-sidebar"');
 assert.ok(panel<html.indexOf('id="discovery-results"'));
 const search=html.indexOf('id="search-filter"',panel);
 const sort=html.indexOf('id="sort-filter"',panel);
 const category=html.indexOf('id="category-filter"',panel);
 const assessed=html.indexOf('id="ai-assessed-filter"',panel);
 assert.ok(search>panel&&sort>search&&category>sort&&assessed>category);
 assert.ok(html.indexOf('class="co-discovery-sidebar-status"',assessed)>assessed);
 assert.ok(html.indexOf('Last Scanned',assessed)>assessed);
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('grid-template-columns:300px minmax(0,1fr)'));
 assert.ok(css.includes('top:84px;max-height:calc(100vh - 100px);overflow-y:auto'));
 assert.ok(css.includes('@media(max-width:1180px)'));
});
test('manage partners has active alphabetical list and closed filter',async()=>{
 const {root,context}=await boot('/manage-partners');
 runInNewContext("data.partners[0].status='contacted';data.partners[1].status='closed';data.partners[2].status='trial';render()",context);
 assert.ok(root.innerHTML.includes('id="manage-search"'));
 assert.ok(!root.innerHTML.includes('id="manage-stage"'));
 assert.ok(root.innerHTML.includes('data-action="manage-clear-stage"'));
 assert.equal((root.innerHTML.match(/<a class="co-manage-row" href=/g)||[]).length,2);
 assert.ok(root.innerHTML.indexOf('Sample Partner 0')<root.innerHTML.indexOf('Sample Partner 2'));
 runInNewContext("ui.manageStage='closed';render()",context);
 assert.equal((root.innerHTML.match(/<a class="co-manage-row" href=/g)||[]).length,1);
 assert.ok(root.innerHTML.includes('Sample Partner 1'));
 const shell=readFileSync(new URL('../public/manage_partners.html',import.meta.url),'utf8');
 assert.ok(shell.includes('href="/manage-partners"'));
 assert.ok(shell.includes('>Manage Partners</span>'));
});

test('outreach editor uses a searchable name-only dropdown and a compact action row',async()=>{
 const {root,context}=await boot('/outreach');
 assert.ok(root.innerHTML.includes('<h1 class="co-title">Draft Outreach</h1>'));
 assert.ok(!root.innerHTML.includes('Outreach Draft:'));
 assert.ok(!root.innerHTML.includes('Before Outreach'));
 assert.ok(!root.innerHTML.includes('Save Draft'));
 assert.ok(root.innerHTML.includes('data-action="record-sent"'));
 assert.ok(root.innerHTML.includes('class="co-outreach-actions-left"'));
 assert.ok(root.innerHTML.includes('role="combobox"'));
 assert.ok(root.innerHTML.includes('role="listbox"'));
 assert.ok(!root.innerHTML.includes('list="draft-partners"'));
 assert.ok(root.innerHTML.includes('value="Sample Partner 0"'));
 assert.ok(!root.innerHTML.includes('value="Sample Partner 0 ['));
 const candidates=runInNewContext("draftCandidates('sample partner 2').map(p=>p.name)",context);
 assert.ok(candidates.includes('Sample Partner 2'));
 assert.ok(!candidates.includes('Sample Partner 0'));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-outreach-actions{display:flex'));
 assert.ok(css.includes('.co-copy-field{position:relative'));
});

test('manage partners mirrors discovery controls and stage counts filter the list',async()=>{
 const {root,context,listeners}=await boot('/manage-partners');
 runInNewContext("data.partners[0].status='contacted';data.partners[1].status='interested';data.partners[2].status='trial';data.partners[3].status='regular';data.partners[4].status='closed';render()",context);
 const html=root.innerHTML;
 assert.ok(html.includes('class="co-discovery-layout"'));
 assert.ok(html.indexOf('co-manage-sidebar')<html.indexOf('co-manage-main'));
 assert.ok(html.includes('Partner Stages'));
 assert.ok(html.includes('data-stage="trial"'));
 assert.ok(html.includes('Pilot'),'Stage trial must display as Pilot');
 for(const stage of ['contacted','interested','trial','regular','closed']){
  assert.ok(html.includes('co-stage-'+stage));
 }
 assert.equal((html.match(/<a class="co-manage-row" href=/g)||[]).length,4);
 await listeners.click({target:{closest:sel=>sel==='[data-action],[data-href]'?{dataset:{action:'manage-stage-pick',stage:'trial'}}:null},preventDefault(){}});
 assert.equal(runInNewContext('ui.manageStage',context),'trial');
 assert.equal((root.innerHTML.match(/<a class="co-manage-row" href=/g)||[]).length,1);
 assert.ok(root.innerHTML.includes('Sample Partner 2'));
 assert.ok(root.innerHTML.includes('aria-pressed="true"'));
});

test('partner stage counts can be toggled off to return to All Active',async()=>{
 const {root,context,listeners}=await boot('/manage-partners');
 runInNewContext("data.partners[0].status='contacted';data.partners[1].status='trial';data.partners[2].status='regular';render()",context);
 const action=async(stage)=>listeners.click({target:{closest:sel=>sel==='[data-action],[data-href]'?{dataset:{action:'manage-stage-pick',stage}}:null},preventDefault(){}});
 await action('trial');assert.equal(runInNewContext('ui.manageStage',context),'trial');
 await action('trial');assert.equal(runInNewContext('ui.manageStage',context),'active');
 assert.equal((root.innerHTML.match(/<a class="co-manage-row" href=/g)||[]).length,3);
 assert.ok(root.innerHTML.includes('data-action="manage-clear-stage"'));
});
test('partner editor exposes required fields without source and verification controls',async()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const fn=app.slice(app.indexOf('function partnerFormFields('),app.indexOf('function toggleListingDetails('));
 assert.ok(fn.includes("field('Name','name',v.name,'text',null,true)"));
 assert.ok(fn.includes("field('Type','category'"));
 assert.ok(fn.includes("field('Stage','status'"));
 assert.ok(fn.includes("field('Contact Email','contactEmail'"));
 assert.ok(fn.includes("null,false,true"));
 assert.ok(fn.includes("autocomplete=\"off\""));
 assert.ok(!fn.includes('Details Verified by Staff'));
 assert.ok(!fn.includes('Confirm Recurring Capacity'));
 assert.ok(!fn.includes('Source:'));
});

test('discovery exposes a stop control while running and icons remain subtle',async()=>{
 const {root,context}=await boot('/find-partners');
 assert.ok(root.innerHTML.includes('>Discover Partners</button>'));
 for(const icon of ['category','near_me','calendar_today'])assert.ok(root.innerHTML.includes('>'+icon+'</span>'));
 runInNewContext('ui.discoveryRunning=true;ui.discoveryStatus={phase:"Researching Contacts",completed:1,total:4};render()',context);
 assert.ok(root.innerHTML.includes('data-action="stop-discovery"'));
 assert.ok(root.innerHTML.includes('Stop Discovery'));
 assert.ok(!root.innerHTML.includes('data-action="discover"'));
 runInNewContext('ui.discoveryStopping=true;render()',context);
 assert.ok(root.innerHTML.includes('Stopping...'));
 assert.ok(root.innerHTML.includes('data-action="stop-discovery" disabled'));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-listing-meta b .material-symbols-outlined'));
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
});

test('Edit Partner has two restrained sections, a scrollable body and restores page scroll on close',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 const edit=js.slice(js.indexOf('function partnerFormFields('),js.indexOf('function toggleListingDetails('));
 assert.ok(edit.includes("section('partner','storefront','Partner Details',details)"));
 assert.ok(edit.includes("section('grounds','eco','Grounds Arrangement',reuse)"));
 for(const key of ['name','category','status','contactName','contactEmail','location'])assert.ok(edit.includes("'"+key+"'"));
 for(const key of ['use','frequency','capacityKg','notes'])assert.ok(edit.includes("'"+key+"'"));
 assert.ok(edit.includes('{partnerEditor:true}'));
 assert.ok(edit.includes('partnerFormFields(v,{includeStage:!p})'));
 assert.ok(js.includes("document.body.style.overflow='hidden'"));
 assert.ok(js.includes('document.body.style.overflow=modalOverflow.body'));
 assert.ok(js.includes("if(action==='close-dialog'){closeDialog();return;}"));
 assert.ok(js.includes('closeDialog();'));
 assert.ok(js.includes('if(e.target===wrap)closeDialog();'));
 assert.ok(css.includes('.co-dialog-partner .co-dialog-scroll{overflow-y:auto;overscroll-behavior:contain'));
 assert.ok(css.includes('.co-dialog-partner .co-dialog-footer{'));
 assert.ok(css.includes('.co-partner-form-section+.co-partner-form-section'));
 assert.ok(css.includes('.co-discovery-card .co-card-actions .co-button.alt{background:#fff;border:1px'));
});

test('Record Sent confirms locally then opens the selected partner page',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 const start=js.indexOf("if(action==='record-sent'){");
 const end=js.indexOf("if(action==='copy-recipient'",start);
 const action=js.slice(start,end);
 assert.ok(action.includes("dialog('Confirm Record Sent',"));
  assert.ok(action.includes('co-confirm-copy'));
  assert.ok(action.includes('does not send emails'));
  assert.ok(action.includes("esc(partner(partnerId)?.name"));
 assert.ok(action.includes("{confirmation:true,onComplete:()=>{location.href='/partner?partner='+encodeURIComponent(partnerId);}}"));
 assert.ok(action.includes("await request('/api/outreach/sent'"));
 assert.ok(!action.includes("confirm("));
 assert.ok(js.includes("confirmation?'Record Sent':partnerEditor?'Save Partner':'Save Changes'"));
 assert.ok(css.includes('.co-dialog-confirm .co-dialog-scroll{display:block;padding:0 24px 6px}'));
 assert.ok(css.includes('.co-dialog-confirm .co-dialog-footer{'));
});

test('Manage Partners allows reverting the stage to Suggested',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const modal=js.slice(js.indexOf('function manageDetails('),js.indexOf('const controlBind = new WeakSet();'));
 assert.ok(modal.includes("['suggested','contacted','interested','trial','regular','closed']"));
 assert.ok(modal.includes('id="relationship-stage"'));
 const listing=js.slice(js.indexOf('function manageView('),js.indexOf('function manageDetails('));
 assert.ok(listing.includes("p.status!=='closed'"));
});

test('Manage Partners cards are whole-card links and no longer show Manage buttons',async()=>{
 const {root,context}=await boot('/manage-partners');
 runInNewContext("data.partners[0].status='contacted';render()",context);
 assert.ok(root.innerHTML.includes('<a class="co-manage-row" href="/partner?partner=p0" aria-label="Manage Sample Partner 0">'));
 assert.ok(!root.innerHTML.includes('data-action="manage-detail"'));
 assert.ok(!root.innerHTML.includes('>Manage <span class="material-symbols-outlined"'));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-manage-page .co-manage-row{display:block;position:relative;min-height:0;cursor:pointer'));
 assert.ok(css.includes('.co-manage-page .co-manage-row:hover,'));
});
test('Relationship and Edit Partner are two panels, with Stage only in Relationship for existing partners',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 const fn=js.slice(js.indexOf('function manageDetails('),js.indexOf('const controlBind = new WeakSet();'));
 assert.ok(fn.includes('role="tablist"'));
 assert.ok(fn.includes('role="tab"'));
 assert.ok(fn.includes('role="tabpanel"'));
 assert.ok(fn.includes('data-action="manage-tab"'));
 assert.ok(fn.includes('>Relationship</button>'));
 assert.ok(fn.includes('>Edit Partner</button>'));
 assert.ok(fn.includes('id="relationship-stage"'));
 assert.ok(fn.includes("partnerFormFields(p,{includeStage:false})"));
 assert.ok(!fn.includes('data-action="edit"'));
 assert.ok(fn.includes('Activity History'));
 assert.ok(fn.includes('Record Handover'));
 assert.ok(js.includes("if(e.target.dataset.activeTab!==\x27edit\x27)return;"));
 assert.ok(js.includes("dialog('Log Activity',content"));
 assert.ok(js.includes("panel.querySelectorAll('input,select,textarea').forEach(field=>{field.disabled=!selected;})"));
 assert.ok(js.includes("if(action==='manage-tab'){switchManageTab(el.dataset.tab);return;}"));
 assert.ok(js.includes('dialog(p?\'Edit Partner\':\'Add Partner\',partnerFormFields(v,{includeStage:!p})'));
 assert.ok(css.includes('.co-manage-panel[hidden]{display:none!important}'));
 assert.ok(css.includes('.co-manage-tabs button[aria-selected="true"]'));
});

test('relationship journal merges automatic handovers without duplicates',async()=>{
 const {context}=await boot('/manage-partners');
 runInNewContext("data.partners[0].status='contacted';data.partners[0].sourcedAt='2026-10-18T06:00:00Z';data.partnerActivity=[{id:'sent',partnerId:'p0',type:'outreach',text:'Email sent',at:'2026-10-19T08:00:00Z'},{id:'old',partnerId:'p0',type:'handover',text:'5 kg transferred',at:'2026-10-19T07:00:00Z'}];data.handovers=[{id:'handover',partnerId:'p0',kg:5,date:'2026-10-19',intendedUse:'Trial',confirmation:'unverified',recordedAt:'2026-10-19T07:00:00Z'}]",context);
 const html=runInNewContext("journalTimeline(data.partners[0])",context);
 assert.equal(html.split('<strong>Grounds Handover</strong>').length-1,1);
 assert.ok(html.includes('Outreach Sent'));
 assert.ok(!html.includes('Partner Discovered'));
 assert.ok(html.includes('<time>19 October 2026</time>'));
 assert.ok(!html.includes('12:00 pm SGT'));
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 for(const action of ['manage-log-open','manage-handover-open','manage-stage-save'])assert.ok(js.includes('data-action="'+action+'"'));
 assert.ok(js.includes('id="journal-stage"'));
 assert.ok(js.includes("if(values[field]?.trim())payload[field]=values[field].trim()"));
 assert.ok(js.includes("if(footer)footer.hidden=tab==='relationship'"));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-journal-editor[hidden]{display:none!important}'));
});

test('Manage opens a dedicated partner page; activity and handover use popups',async()=>{
 const detail=await boot('/partner','?partner=p0');
 for(const marker of ['co-partner-page','co-partner-profile','role="tablist"','Relationship Overview','Activity History','id="partner-page-form"','data-action="manage-handover-open"','data-action="manage-log-open"'])
  assert.ok(detail.root.innerHTML.includes(marker),marker);
 assert.ok(!detail.root.innerHTML.includes('id="manage-journal-editor"'));
 assert.ok(!detail.root.innerHTML.includes('Most Recent First'));
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 for(const text of ["href=\"/partner?partner=${encodeURIComponent(p.id)}\"","dialog('Log Activity',content","dialog('Record Handover',html","submitLabel:'Save Activity'","submitLabel:'Save Handover'"])
  assert.ok(js.includes(text),text);
 assert.ok(!js.includes('data-href="/log-handover?partner='));
});

test('Date Sourced is in Details and Last Scanned spacing and timeline endpoints are even',async()=>{
 const {root}=await boot('/find-partners');
 const card=root.innerHTML.slice(root.innerHTML.indexOf('co-discovery-card'));
 assert.ok(!card.slice(0,card.indexOf('<details class="co-candidate-details"')).includes('Date Sourced'));
 assert.ok(card.includes('<summary>Details</summary><div class="co-details-sourced">'));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 for(const rule of ['.co-discovery-sidebar .co-scan-meta{margin-top:10px}', '.co-discovery-sidebar .co-source-caption{margin:10px 0 0}', '.co-journal-timeline{border-left:0}', '.co-journal-item:not(:last-child):after'])
  assert.ok(css.includes(rule),rule);
 for(const name of ['find_partners','this_week','outreach_draft','partner','manage_partners']){
  const html=readFileSync(new URL('../public/'+name+'.html',import.meta.url),'utf8');
  assert.ok(!html.includes('data-path="log-handover"'),name);
 }
});

test('Log Activity opens a complete, compact form rather than an embedded editor',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 const markup=runInNewContext('journalDialogContent(data.partners[0])',context);
 for(const field of ['type','date','contactPerson','outcome','text','nextAction','followUpDate','stage']){
  assert.ok(markup.includes('name="'+field+'"'),field);
 }
 assert.ok(markup.includes('id="journal-date" name="date" required'));
 assert.ok(markup.includes('id="journal-text" name="text" required'));
 assert.ok(!markup.includes('id="manage-journal-editor"'));
 assert.ok(!markup.includes('data-action="manage-log-save"'));
 assert.ok(markup.includes('id="journal-ai-result" class="co-journal-ai-result" aria-live="polite" hidden'));
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(source.includes("wrap.querySelector('#f-name,[name="));
});

test('sidebar contains exactly three destinations with contextual active navigation',()=>{
 const pages={
  this_week:'dashboard',find_partners:'find-partners',outreach_draft:'find-partners',
  manage_partners:'manage-partners',partner:'manage-partners'
 };
 const expected=['dashboard','find-partners','manage-partners'];
 for(const [name,active] of Object.entries(pages)){
  const shell=readFileSync(new URL('../public/'+name+'.html',import.meta.url),'utf8');
  const paths=[...shell.matchAll(/data-path="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(paths,expected,name);
  assert.equal((shell.match(/aria-current="page"/g)||[]).length,1,name);
  const selected=shell.match(/<a[^>]*aria-current="page"[^>]*data-path="([^"]+)"/);
  assert.equal(selected?.[1],active,name);
  assert.ok(shell.includes('>Discover Partners</span>'),name);
  assert.ok(!shell.includes('>Draft Outreach</span>'),name);
  assert.ok(!shell.includes('Partner Management</div>'),name);
 }
});

test('Discover Partners and Draft Outreach titles are consistent; both narrow pages align headings to panels',async()=>{
 const discovery=await boot('/find-partners');
 assert.ok(discovery.root.innerHTML.includes('<h1 class="co-title">Discover Partners</h1>'));
 const draft=await boot('/outreach');
 assert.ok(draft.root.innerHTML.includes('<h1 class="co-title">Draft Outreach</h1>'));
 const partner=await boot('/partner','?partner=p0');
 assert.ok(partner.root.innerHTML.includes('co-partner-profile'));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 for(const selector of [
  '.co-page-header:has(+ .co-outreach-page) .co-head{width:100%;max-width:900px',
  '.co-page-header:has(+ .co-partner-page) .co-head{width:100%;max-width:980px',
  '.co-partner-page .co-partner-profile{width:100%;max-width:980px'
 ])assert.ok(css.includes(selector),selector);
});

test('dedicated partner page uses a consistent type hierarchy for metadata, labels, body and sections',()=>{
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 for(const selector of [
  '.co-partner-page .co-relationship-heading h3,.co-partner-page .co-partner-section-title h3{font-size:16px',
  '.co-partner-page .co-journal-overview-grid strong{font-size:14px',
  '.co-partner-page .co-manage-panel .co-field>label{font-size:13px',
  '.co-partner-page .co-journal-item p{font-size:14px',
  '.co-partner-page .co-journal-item time,.co-partner-page .co-journal-item small{font-size:12px',
  '.co-partner-page .co-manage-panel .co-field input,.co-partner-page .co-manage-panel .co-field select,.co-partner-page .co-manage-panel .co-field textarea{font-size:14px'
 ])assert.ok(css.includes(selector),selector);
});

test('activity history is visible and sent outreach retains expandable email details',async()=>{
 const {context,root}=await boot('/partner','?partner=p0');
 runInNewContext("data.outreach=[{id:'sent-1',partnerId:'p0',sent:true,sentAt:'2026-10-19T09:00:00Z',subject:'Real Sent Subject',body:'Dear Partner. This was actually sent.'}];data.partnerActivity=[{id:'legacy-activity',partnerId:'p0',type:'outreach',text:'Staff confirmed outreach was sent',at:'2026-10-19T09:00:00Z'}];render()",context);
 const html=root.innerHTML;
 assert.ok(html.includes('<section class="co-journal-history">'));
 assert.ok(!html.includes('<details class="co-journal-history">'));
 assert.ok(html.includes('<details class="co-journal-entry">'));
 assert.ok(html.includes('Real Sent Subject'));
 assert.ok(html.includes('This was actually sent.'));
 assert.equal(html.split('<strong>Outreach Sent</strong>').length-1,1);
});

test('Log Activity defaults to Email and current Stage and accepts pasted long replies',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 runInNewContext("data.partners[0].status='contacted'",context);
 const html=runInNewContext('journalDialogContent(data.partners[0])',context);
 assert.ok(html.includes('<option value="email">Email Received</option><option value="email-sent">Email Sent</option><option value="call">Phone Call</option>'));
 assert.ok(html.includes('value="contacted" selected'));
 assert.ok(html.includes('>Stage</label>'));
 assert.ok(html.includes('maxlength="10000"'));
 assert.ok(html.includes('Paste a partner reply'));
 assert.ok(!html.includes('Record an Interaction'));
 assert.ok(!html.includes('Stage changes are explicit'));
});

test('AI assistance is gated to Email and Text/WhatsApp with explicit preview and Apply action',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 const html=runInNewContext('journalDialogContent(data.partners[0])',context);
 assert.ok(html.includes('<option value="email">Email Received</option>'));
 assert.ok(html.includes('<option value="text">Text / WhatsApp</option>'));
 assert.ok(html.includes('id="journal-ai-section"'));
 assert.ok(html.includes('data-action="manage-ai-analyse"'));
 assert.ok(html.includes('<strong>AI-Assisted Review</strong>'));
  assert.ok(html.includes('id="journal-ai-state"'));
 assert.ok(!html.includes('Clicking Analyse sends the message to the configured AI provider'));
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(js.includes("panel.hidden=!['email','text'].includes(type)"));
 assert.ok(js.includes("if(!p||!['email','text'].includes(type)||journalAnalysisRun)return"));
 assert.ok(js.includes("data-action=\"manage-ai-apply\""));
 assert.ok(js.includes("if(values.stage&&values.stage!==p.status)payload.stage=values.stage")); // Changes remain explicit
 assert.ok(js.includes("journalSuggestion={partnerId:p.id,type,text,suggestion}"));
 assert.ok(js.includes("if(run.stopped||$('#dialog-form')!==form||$('#journal-type')?.value!==type||$('#journal-text')?.value?.trim()!==text)return"));
 assert.ok(js.includes("if(j.suggestion[key])"));
 assert.ok(js.includes("notice('Suggestions applied. Review the fields and save when ready.')"));
 assert.ok(!html.includes('Automatically save'));
});
test('AI suggestion preview escapes partner-supplied fields',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 const html=runInNewContext("(() => {const x={innerHTML:'',hidden:true};document._aiTestResult=x;return x})()",context);
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(js.includes("${esc(value)}"));
});

test('AI analysis appears immediately after message field in log activity',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 const html=runInNewContext('journalDialogContent(data.partners[0])',context);
 const message=html.indexOf('id="journal-text"');
 const messageEnd=html.indexOf('</textarea>',message);
 const ai=html.indexOf('id="journal-ai-section"');
 const next=html.indexOf('id="journal-next"');
 assert.ok(message>=0&&messageEnd>message&&ai>messageEnd&&next>ai);
 assert.equal((html.match(/id="journal-ai-section"/g)||[]).length,1);
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-journal-ai[hidden],.co-journal-ai-result[hidden]{display:none!important}'));
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(app.includes("panel.hidden=!['email','text'].includes(type)"));
});

test('AI suggested updates use a distinct, restrained colour palette',()=>{
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-journal-ai-result{border:1px solid #dbe8de;background:#fbfdfb'));
 assert.ok(css.includes('.co-journal-ai-buttons .co-button:not(.alt){background:var(--forest)'));
 assert.ok(css.includes('.co-journal-ai-action strong,.co-journal-ai-heading strong{color:var(--forest)}'));
});


test('interaction outcomes are concrete and separate from relationship stage',async()=>{
 const {context,root}=await boot('/partner','?partner=p0');
 const form=runInNewContext('journalDialogContent(data.partners[0])',context);
 for(const label of ['Requested Information','Agreed to Meeting','Discussed Pilot','Follow-Up Needed','Declined','No Reply'])
  assert.ok(form.includes('>'+label+'</option>'),label);
 assert.ok(!form.includes('Interested / Positive'));
 assert.ok(!form.includes('value="positive"'));
 assert.ok(!root.innerHTML.includes('Latest Response'));
 assert.ok(root.innerHTML.includes('Current Contact'));
 assert.ok(root.innerHTML.includes('Next Action'));
 assert.ok(root.innerHTML.includes('Follow-Up Due'));
 assert.ok(root.innerHTML.includes('relationship-stage'));
 runInNewContext("data.partnerActivity=[{id:'new',partnerId:'p0',type:'email',text:'Please send the moisture information.',outcome:'requested-information',at:'2026-10-19T10:00:00Z'},{id:'old',partnerId:'p0',type:'call',text:'Older note',outcome:'positive',at:'2026-10-18T10:00:00Z'}]",context);
 const rendered=runInNewContext('journalTimeline(data.partners[0])',context);
 assert.ok(rendered.includes('Outcome: Requested Information'));
 assert.ok(rendered.includes('Outcome: Positive (Historical)'));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-partner-page .co-journal-overview-grid{grid-template-columns:repeat(3,minmax(0,1fr))}'));
});


test('AI cancellation control and concise suggested updates keep outcome available',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 const html=runInNewContext('journalDialogContent(data.partners[0])',context);
 assert.ok(html.includes('<option value="requested-information">Requested Information</option>'));
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const render=js.slice(js.indexOf('function showJournalAISuggestion('),js.indexOf('function resetJournalAnalysisButton('));
 assert.ok(!render.includes('co-journal-ai-rationale'));
 assert.ok(render.includes('Suggested Updates'));
 assert.ok(js.includes("el.dataset.action='manage-ai-cancel'"));
 assert.ok(js.includes("if(action==='manage-ai-cancel'){await cancelJournalAnalysis();return;}"));
 assert.ok(js.includes("run.controller.abort()"));
 assert.ok(js.includes("/activity/analyse/stop"));
 assert.ok(js.includes("if(journalAnalysisRun)void cancelJournalAnalysis({quiet:true})"));
 assert.ok(js.includes("Array.from(field.options).some(opt=>opt.value===j.suggestion[key])"));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('#fbfdfb'));
  assert.ok(js.includes('stop_circle</span>Stop Analysis'));
  assert.ok(css.includes('.co-ai-spinner{'));
 assert.ok(css.includes('.co-journal-ai-action .co-button[data-action="manage-ai-cancel"]'));
});


test('activity history shows all entries while only detailed communications are individually expandable',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 runInNewContext("data.partnerActivity=[{id:'simple',partnerId:'p0',type:'stage',text:'Stage: Suggested to Contacted',at:'2026-10-20T02:00:00Z'},{id:'short',partnerId:'p0',type:'call',text:'Arranged a follow-up.',at:'2026-10-20T01:00:00Z'},{id:'long',partnerId:'p0',type:'email',text:'Hello partner. '.repeat(25),outcome:'requested-information',at:'2026-10-20T00:00:00Z'}];data.outreach=[{id:'sent',partnerId:'p0',sent:true,sentAt:'2026-10-19T20:00:00Z',subject:'Grounds collection trial',body:'Dear partner, these are the collection details.'}]",context);
 const html=runInNewContext('journalTimeline(data.partners[0])',context);
 assert.equal((html.match(/<details class="co-journal-entry">/g)||[]).length,2,'Only sent outreach and long email expand');
 assert.ok((html.match(/co-journal-entry-static/g)||[]).length>=2,'Simple stage change and call remain visible');
 assert.ok(html.includes('Arranged a follow-up.'));
 assert.ok(html.includes('Stage: Suggested to Contacted'));
 assert.ok(html.includes('Dear partner, these are the collection details.'));
 assert.ok(html.includes('Grounds collection trial'));
 assert.ok(html.includes('Outcome: Requested Information'));
 assert.ok(!html.includes('View History'));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-journal-static-message{font-size:13px'));
 assert.ok(css.includes('.co-journal-full-message{white-space:pre-wrap'));
});

test('partner page and Log Activity share a smaller, coherent font hierarchy',()=>{
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 for(const rule of [
  '.co-page-header:has(+ .co-partner-page) .co-title{font-size:24px',
  '.co-partner-page .co-manage-tabs button{font-size:13px}',
  '.co-partner-page .co-journal-overview-grid strong{font-size:13px}',
  '.co-partner-page .co-journal-item p{font-size:13px',
  '.co-partner-page .co-manage-panel .co-field>label{font-size:12px}',
  '.co-dialog-partner:has(.co-journal-modal) .co-dialog-titlebar h2{font-size:20px',
  '.co-dialog-partner:has(.co-journal-modal) .co-field input,'
 ])assert.ok(css.includes(rule),rule);
});


test('routine activity entries show grey descriptions below title and right-aligned date',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 runInNewContext("data.partnerActivity=[{id:'update-1',partnerId:'p0',type:'update',text:'Stage: contacted to suggested',at:'2026-10-19T09:13:00Z'},{id:'call-1',partnerId:'p0',type:'call',text:'Asked us to send more details',at:'2026-10-19T09:00:00Z'}];data.partners[0].source='NEA Food Waste Recycling Facilities'",context);
 const html=runInNewContext('journalTimeline(data.partners[0])',context);
 assert.ok(html.includes('Record Updated'));
 assert.ok(!html.includes('Partner Discovered'));
 assert.ok(html.includes('<p class="co-journal-static-message">Stage: Contacted to Suggested</p>'));
 assert.ok(!html.includes('Source: NEA Food Waste Recycling Facilities'));
 assert.ok(html.includes('Asked us to send more details'),'Ordinary short call details remain readable');
 assert.ok(!html.includes('<details class="co-journal-entry">'),'Routine events should not need expansion');
 assert.ok(html.includes('co-journal-entry-static'),'Descriptions stay under titles');
 assert.ok((html.match(/<time>/g)||[]).length>=2,'Dates are present for update and call');
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-partner-page .co-journal-item>.co-journal-entry-static{display:block}'));
 assert.ok(css.includes('.co-partner-page .co-journal-entry-heading time{margin-left:auto;text-align:right;white-space:nowrap}'));
});

test('historical stage audit displays capitalised labels without changing saved data',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 const formatted=runInNewContext("activityDisplayText('Stage: contacted to suggested','update')",context);
 assert.equal(formatted,'Stage: Contacted to Suggested');
 const html=runInNewContext("data.partnerActivity=[{id:'old',partnerId:'p0',type:'update',text:'Stage: trial to regular',at:'2026-10-19T08:00:00Z'}];journalTimeline(data.partners[0])",context);
 assert.ok(html.includes('Stage: Pilot to Regular'));
 assert.equal(runInNewContext('data.partnerActivity[0].text',context),'Stage: trial to regular');
});


test('Singapore-facing dates have consistent long format without timezone suffix',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 const values=runInNewContext("({date:dateLabel('2026-10-19'),time:timeLabel('2026-10-19T09:13:00Z')})",context);
 assert.equal(values.date,'19 October 2026');
 assert.match(values.time,/19 October 2026, 5:13 p\.m\./);
 assert.ok(!values.time.includes('SGT'));
 runInNewContext("data.partners[0].followUpDate='2026-10-24'",context);
 const overview=runInNewContext("manageDetails(data.partners[0]).fields",context);
 assert.ok(overview.includes('24 October 2026'));
 assert.ok(!overview.includes('2026-10-24'));
});

test('email direction is explicit for new interactions and legacy email labels stay neutral',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 runInNewContext("data.partnerActivity=[{id:'reply',partnerId:'p0',type:'email',emailDirection:'received',text:'We are interested in a trial. '.repeat(14),at:'2026-10-19T09:13:00Z'},{id:'out',partnerId:'p0',type:'email',emailDirection:'sent',text:'We sent the information.',at:'2026-10-18T09:13:00Z'},{id:'legacy',partnerId:'p0',type:'email',text:'Old message direction not known',at:'2026-10-17T09:13:00Z'}]",context);
 const html=runInNewContext("journalTimeline(data.partners[0])",context);
 assert.ok(html.includes('Reply Received'));
 assert.ok(html.includes('Email Sent'));
 assert.ok(html.includes('<strong>Email</strong>'));
 assert.equal((html.match(/We are interested in a trial\./g)||[]).length,14,'Full reply is only shown once');
 const form=runInNewContext("journalDialogContent(data.partners[0])",context);
 assert.ok(form.includes('<option value="email-sent">Email Sent</option>'));
});

test('older activity is explicitly accessible after the initial 24 entries',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 runInNewContext("data.partners[0].sourcedAt=null;data.partnerActivity=Array.from({length:26},(_,i)=>({id:'a'+i,partnerId:'p0',type:'note',text:'Activity '+i,at:new Date(Date.UTC(2026,9,20,10,i)).toISOString()}))",context);
 const html=runInNewContext("journalTimeline(data.partners[0])",context);
 assert.ok(html.includes('Show Older Activity (2)'));
 assert.equal((html.match(/class="co-journal-item" hidden/g)||[]).length,2);
 assert.ok(html.includes('Activity 25'));
});

test('assessment rows and control treatments have shared sizes without recolouring dashboard',()=>{
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(js.includes('co-assessment-weight-row'));
 assert.ok(js.includes('assessment-weight-total'));
 assert.ok(js.includes('updateWeightTotal()'));
 assert.ok(css.includes('.co-assessment-weight-row{'));
 assert.ok(css.includes('.co-category-tag{'));
 assert.ok(css.includes('.co-back-link{')||css.includes(',.co-back-link{'));
 assert.ok(js.includes('co-button alt small co-back-link'));
 assert.ok(css.includes('min-height:36px'));
});


test('manually dated email shows logged timestamp without implying email arrival time',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 runInNewContext("data.partners[0].status='contacted';data.partners[0].sourcedAt='2026-10-18T07:00:00Z';data.partners[0].source='NEA Food Waste Recycling Facilities';data.partnerActivity=[{id:'reply',partnerId:'p0',type:'email',emailDirection:'received',date:'2026-10-19',occurredAt:'2026-10-19T04:00:00Z',at:'2026-10-20T09:13:00Z',text:'Thanks for reaching out'}]",context);
 const html=runInNewContext("journalTimeline(data.partners[0])",context);
 assert.ok(!html.includes('<time>19 October 2026</time>'),'No duplicate date above logged timestamp');
 assert.ok(html.includes('<time>Logged 20 October 2026, 5:13 p.m.</time>'),'Logged time stands alone');
 assert.equal((html.match(/<time>Logged /g)||[]).length,1,'Only manually logged activity shows logging time');
 assert.ok(!html.includes('co-journal-source'));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-page-header:has(+ .co-outreach-page) .co-back-link{transform:translateY(4px)'));
 assert.ok(css.includes('.co-partner-page .co-journal-item .co-journal-source{font-size:12px'));
 assert.ok(!css.includes('.co-journal-log-time{font-size:10px'));
});


test('handover form records transfer facts without repeated per-batch reuse purposes',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 const script=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const start=script.indexOf('function openHandoverDialog(p){');
 const end=script.indexOf('async function saveRelationshipStage(',start);
 const handover=script.slice(start,end);
 assert.ok(handover.includes('id="ho-date" name="date" type="date"'));
 assert.ok(handover.includes('id="ho-time" name="time" type="time"'));
 assert.ok(handover.includes('id="ho-kg" name="kg"'));
 assert.ok(handover.includes('id="ho-notes" name="notes"'));
 assert.ok(handover.includes('>Notes</label>'));
 for(const removed of ['Intended Reuse','name="intendedUse"','Confirmation Level','Evidence / Notes','Select Reuse Confirmed','Record a physical transfer','name="confirmation"','(Optional)','(optional)']){
  assert.ok(!handover.includes(removed),removed);
 }
 assert.ok(handover.includes("initialFocus:'close'"),'Open the dialog without selecting date digits');
 assert.ok(script.includes("if(initialFocus==='close')wrap.querySelector('.co-dialog-close')?.focus?.()"));
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.ok(css.includes('.co-dialog-partner .co-journal-modal.co-journal-editor{'));
 assert.ok(css.includes('background:transparent;'),'Activity and Handover share white form backgrounds');
 runInNewContext("data.handovers=[{id:'handover-timed',partnerId:'p0',kg:8,date:'2026-10-18',time:'14:25',confirmation:'unverified',notes:'Partner collected at HQ'},{id:'handover-date-only',partnerId:'p0',kg:3,date:'2026-10-17',confirmation:'unverified'}]",context);
 const html=runInNewContext('journalTimeline(data.partners[0])',context);
 assert.ok(html.includes('18 October 2026, 2:25 p.m.'));
 assert.ok(html.includes('<time>17 October 2026</time>'),'Older handovers do not gain invented times');
 assert.ok(html.includes('8 kg transferred'));
 assert.ok(!html.includes('Use not recorded'));
 assert.ok(html.includes('Notes: Partner collected at HQ'));
 assert.ok(!html.includes('Reuse not verified'));
});



test('Manage Partners filters by category with independent stage counts and search',async()=>{
 const {root,context}=await boot('/manage-partners');
 runInNewContext("data.partners[0].status='contacted';data.partners[0].category='garden';data.partners[1].status='trial';data.partners[1].category='school programme';data.partners[2].status='regular';data.partners[2].category='garden';render()",context);
 assert.ok(root.innerHTML.includes('id="manage-category"'));
 assert.ok(root.innerHTML.includes('All Categories'));
 assert.ok(root.innerHTML.includes('School Programme'));
 assert.ok(root.innerHTML.indexOf('id="manage-sort"')<root.innerHTML.indexOf('id="manage-category"'));
 assert.equal((root.innerHTML.match(/<a class="co-manage-row" href=/g)||[]).length,3);
 runInNewContext("ui.managePage=5;ui.manageCategory='school programme';render()",context);
 assert.equal((root.innerHTML.match(/<a class="co-manage-row" href=/g)||[]).length,1);
 assert.ok(root.innerHTML.includes('Sample Partner 1'));
 assert.ok(!root.innerHTML.includes('aria-label="Manage Sample Partner 0"'));
 assert.equal(runInNewContext('ui.managePage',context),1);
 assert.ok(root.innerHTML.includes('data-stage="contacted"'),'Stage filtering controls are unaffected');
 runInNewContext("ui.manageCategory='all';render()",context);
 assert.equal((root.innerHTML.match(/<a class="co-manage-row" href=/g)||[]).length,3);
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(js.includes("$('#manage-category')?.addEventListener('change'"));
 assert.ok(js.includes("ui.manageCategory=e.target.value;ui.managePage=1;render()"));
});


test('follow-up drafting uses the outreach editor and selected partner',async()=>{
 const {root,context}=await boot('/outreach','?partner=p0&mode=followup');
 runInNewContext("data.partners[0].status='contacted';render()",context);
 assert.ok(root.innerHTML.includes('<h1 class="co-title">Draft Follow-Up</h1>'));
 assert.ok(root.innerHTML.includes('Generate Follow-Up'));
 assert.ok(root.innerHTML.includes('CoffeeBot | Spent Coffee Grounds Reuse Follow-Up'));
 assert.ok(root.innerHTML.includes('Back to Partner'));
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(js.includes("'/api/draft/follow-up':'/api/draft'"));
 assert.ok(js.includes("kind:qs.get('mode')==='followup'?'follow-up':'initial'"));
 assert.ok(js.includes('data-href="/outreach?partner=${encodeURIComponent(p.id)}&mode=followup"'));
});

test('manual and stage history both support corrections',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 runInNewContext("data.partnerActivity=[{id:'manual',partnerId:'p0',type:'email',text:'Please arrange a trial',date:'2026-10-18',at:'2026-10-18T08:00:00Z',entrySource:'manual'},{id:'audit',partnerId:'p0',type:'stage',text:'Moved to Trial',at:'2026-10-18T08:01:00Z'}];data.outreach=[];",context);
 const html=runInNewContext('journalTimeline(data.partners[0])',context);
 assert.equal((html.match(/data-action="manage-activity-edit"/g)||[]).length,2);
 assert.equal((html.match(/data-action="manage-activity-delete"/g)||[]).length,2);
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(js.includes('function editLoggedActivity('));
 assert.ok(js.includes('function deleteLoggedActivity('));
 assert.ok(!js.includes('Corrects this historical entry only.'));
 assert.ok(js.includes('co-follow-up-attention'));
});

test('transport and grounds acceptance are partner-level preferences',async()=>{
 const {root}=await boot('/partner','?partner=p0');
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(js.includes("field('Collection / Delivery','transportArrangement'"));
 assert.ok(js.includes("field('Grounds Condition','groundsAccepted'"));
 assert.ok(js.includes("['partner-collects','Partner Collects']"));
 assert.ok(js.includes("['dry','Dried Grounds']"));
 assert.ok(root.innerHTML.includes('Collection / Delivery'));
 assert.ok(root.innerHTML.includes('Potential Use'));assert.ok(root.innerHTML.includes('Agreed Use'));
});


test('short and expandable manually logged activities expose Edit/Delete without opening details',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 runInNewContext("data.partnerActivity=[{id:'short-note',partnerId:'p0',type:'note',text:'Partner prefers discussing quantity over the phone.',at:'2026-10-18T09:00:00Z',entrySource:'manual'},{id:'short-call',partnerId:'p0',type:'call',text:'Talked to their coordinator.',at:'2026-10-18T10:00:00Z',entrySource:'manual'},{id:'long-email',partnerId:'p0',type:'email',emailDirection:'received',text:'A long message. '.repeat(30),at:'2026-10-18T11:00:00Z',entrySource:'manual'},{id:'stage',partnerId:'p0',type:'stage',text:'Stage changed',at:'2026-10-18T12:00:00Z',entrySource:'system'}];data.outreach=[];data.handovers=[];",context);
 const html=runInNewContext('journalTimeline(data.partners[0])',context);
 assert.equal((html.match(/data-action="manage-activity-edit"/g)||[]).length,4);
 assert.equal((html.match(/data-action="manage-activity-delete"/g)||[]).length,4);
 assert.ok(/data-id="short-note"[^>]*>Edit Activity</.test(html));
 assert.ok(/data-id="short-call"[^>]*>Delete Activity</.test(html));
 assert.ok(/<\/details><details class="co-activity-menu">[\s\S]*?data-id="long-email"/.test(html),'Long entries expose controls outside the collapsed details');
 assert.ok(/class="co-journal-entry-static"[\s\S]*?<\/div><details class="co-activity-menu">/.test(html),'Short entries expose controls outside the content');
 assert.ok(/data-id="stage"/.test(html),'History correction is available for stage events');
});
test('follow-up context uses recorded legacy email without claiming a reply direction',async()=>{
 const {root,context}=await boot('/outreach','?partner=p0&mode=followup');
 runInNewContext("data.partners[0].status='contacted';data.partners[0].nextAction='Share preparation details';data.partnerActivity=[{id:'m',partnerId:'p0',type:'email',text:'Please clarify drying requirements',at:'2026-10-20T08:00:00Z'}];render()",context);
 assert.ok(root.innerHTML.includes('Follow-Up Context'));
 assert.ok(root.innerHTML.includes('Latest Recorded Communication'));
 assert.ok(root.innerHTML.includes('Please clarify drying requirements'));
 assert.ok(root.innerHTML.includes('Share preparation details'));
 assert.ok(root.innerHTML.includes('readonly'));
});

test('handover form shows partner arrangement only when known and permits optional exceptions',async()=>{
 const {context}=await boot('/partner','?partner=p0');
 const blank=runInNewContext("handoverArrangementFields({transportArrangement:'unknown',groundsAccepted:'unknown'})",context);
 assert.ok(!blank.includes('co-arrangement-summary'));
 assert.ok(blank.includes('Change For This Handover'));
 assert.ok(blank.includes('Not Recorded'));
 const set=runInNewContext("handoverArrangementFields({transportArrangement:'partner-collects',groundsAccepted:'dry'})",context);
 assert.ok(set.includes('Partner Arrangement'));
 assert.ok(set.includes('Partner Collects'));
 assert.ok(set.includes('Dried Grounds'));
 const editing=runInNewContext("handoverArrangementFields({transportArrangement:'partner-collects',groundsAccepted:'dry'},{transportException:true,transportArrangement:'coffeebot-delivers',groundsException:true,groundsCondition:'wet'})",context);
 assert.ok(editing.includes('Keep Recorded'));
 assert.ok(editing.includes('value="coffeebot-delivers" selected'));
 assert.ok(editing.includes('value="wet" selected'));
});

test('contact routes expose provenance and research actions independently of fit scoring',async()=>{
 const {context,root}=await boot('/find-partners');
 runInNewContext("data.partners[0].contactEvidence={source:'Directory',url:'https://example.org/source',method:'directory'};data.partners[1].contactPageUrl='https://example.org/contact';render()",context);
 const html=root.innerHTML;
 for(const expected of ['Contact Route','Email available','Contact page available','Not identified','research-contact','https://example.org/source','https://example.org/contact'])
  assert.ok(html.includes(expected),expected);
 assert.equal(runInNewContext("contactRouteBlock(data.partners[0]).label",context),'Email available');
 assert.equal(runInNewContext("contactRouteBlock(data.partners[1]).label",context),'Contact page available');
 assert.equal(runInNewContext("contactRouteBlock(data.partners[2]).label",context),'Not identified');
 assert.equal(runInNewContext('data.ranked[0].match.score',context),90);
});

test('editing SFA and unknown sourced partner categories never silently resets their type',async()=>{
 const {context}=await boot('/find-partners');
 for(const category of ['crop farm','mixed crop/aquaculture farm','aquaponic research facility']){
  const html=runInNewContext('partnerFormFields({name:"Existing Farm",category:'+JSON.stringify(category)+',status:"suggested"})',context);
  assert.ok(html.includes('value="'+category+'" selected'),category);
 }
});

test('Contactable First is independent of Best Fit, AI-Assessed Only and other filters',async()=>{
 const {root,context}=await boot('/find-partners');
 assert.ok(root.innerHTML.includes('id="contactable-first-filter"'));
 assert.ok(root.innerHTML.indexOf('id="contactable-first-filter"')<root.innerHTML.indexOf('id="ai-assessed-filter"'));
 runInNewContext("data.ranked[0].match.score=20; data.ranked[1].match.score=90; data.ranked[2].match.score=65; data.ranked[2].contactPageUrl='https://example.org/contact'; ui.contactableFirst=true; render()",context);
 let ids=[...root.innerHTML.matchAll(/data-listing-id="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(ids.slice(0,3),['p0','p2','p1'],'Email > contact page > no identified route');
 assert.ok(root.innerHTML.includes('id="contactable-first-filter" checked'));
 runInNewContext("ui.sort='nearest';render()",context);
 ids=[...root.innerHTML.matchAll(/data-listing-id="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(ids.slice(0,3),['p0','p2','p1'],'Nearest continues working within contact groups');
 runInNewContext("ui.contactableFirst=false;ui.sort='fit';render()",context);
 ids=[...root.innerHTML.matchAll(/data-listing-id="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids[0],'p1','Best Fit has not changed');
 runInNewContext("ui.contactableFirst=true;ui.aiAssessedOnly=true;ui.page=2;render()",context);
 ids=[...root.innerHTML.matchAll(/data-listing-id="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(ids,['p0'],'AI checkbox remains a filter and resets pagination safely');
 assert.equal(runInNewContext('ui.page',context),1);
 assert.equal(runInNewContext('data.ranked[0].match.score',context),20);
});

test('compact source evidence is visible in Details and escapes untrusted source claims',async()=>{
 const {root,context}=await boot('/find-partners');
 runInNewContext("data.ranked[0].evidenceEntries=[{source:'NEA',url:'https://example.org/nea',claim:'Accepted materials: used coffee grounds <script>alert(1)</script>'}];render()",context);
 assert.ok(root.innerHTML.includes('co-compact-source-evidence'));
 assert.ok(root.innerHTML.includes('Source Evidence'));
 assert.ok(root.innerHTML.includes('Accepted materials: used coffee grounds'));
 assert.ok(root.innerHTML.includes('&lt;script&gt;'));
 assert.ok(!root.innerHTML.includes('<script>alert(1)</script>'));
 assert.ok(root.innerHTML.includes('class="co-candidate-details"'),'Evidence belongs inside existing Details');
});

test('Best Fit tie order stays independent of AI review status',async()=>{
 const {root,context}=await boot('/find-partners');
 runInNewContext("data.ranked.forEach((p,i)=>{p.match.score=20;p.match.aiLed=i===10;});ui.sort='fit';render()",context);
 const ids=[...root.innerHTML.matchAll(/data-listing-id="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(ids.slice(0,3),['p0','p1','p10']);
});

test('Assessment Settings keeps the AI budget separate from reset controls',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../public/app.css',import.meta.url),'utf8');
 assert.match(js,/class="co-assessment-controls"/);
 assert.match(js,/class="co-field co-assessment-budget"><label for="assessment-budget"/);
 assert.match(js,/class="co-assessment-budget-control"/);
 assert.match(js,/Potential Intake Scale/);
 assert.match(js,/weightIntake/);
 assert.match(js,/weightSuitability:40,weightEvidence:25,weightIntake:20,weightProximity:15/);
 assert.match(js,/classList\.add\('co-dialog-assessment'\)/);
 assert.match(js,/name==='automaticAIAssessments'\?\$\('#assessment-budget'\):\$\('#f-'\+name\)/);
 assert.match(css,/\.co-assessment-controls\{display:flex;/);
 assert.match(css,/\.co-dialog-assessment #reset-assessment-settings/);
 assert.match(css,/@media\(max-width:580px\)/);
 assert.doesNotMatch(js,/class="co-assessment-reset"/);
});
