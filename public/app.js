/* Stitch-inspired UI, backed by real API state. All example organisations in the seed are fictional. */
const $ = (sel,root=document)=>root.querySelector(sel);
const esc = v => String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const m = v => new Intl.NumberFormat('en-SG',{maximumFractionDigits:1}).format(Number(v)||0);
const qs = new URLSearchParams(location.search);
let data=null;
let journalSuggestion=null;
let journalAnalysisRun=null;
let ui={category:'all',sort:'fit',aiAssessedOnly:false,contactableFirst:false,search:'',page:1,discoveryRunning:false,discoveryStopping:false,discoveryStatus:null,reviewingId:null,draft:null,selectedId:qs.get('partner')||null,manageSearch:'',manageCategory:'all',manageStage:'active',manageSort:'name',managePage:1,partnerTab:'relationship'};
const nav={ '/':'dashboard','/dashboard':'dashboard','/this-week':'dashboard','/find-partners':'find_partners','/outreach':'outreach_draft','/pipeline':'manage_partners','/manage-partners':'manage_partners','/partner':'partner_detail'};
const current=nav[location.pathname]||'dashboard';
const partner=id=>data.partners.find(p=>p.id===id);
const name=id=>partner(id)?.name||'(deleted partner)';
function notice(message,kind='ok') {document.querySelector('.co-toast')?.remove();const el=document.createElement('div');el.className='co-toast';el.setAttribute('role','status');el.style.background=kind==='error'?'#853c20':'#143c2b';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),4800);}
async function request(url,opts={}) {const response=await fetch(url,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});let value;try{value=await response.json();}catch{throw Error('The server did not return JSON');}if(!response.ok)throw Error(value.error||'Request failed');return value;}
async function refresh(){
 const [state,status]=await Promise.all([request('/api/state'),request('/api/discovery-status')]);
 data=state;
 if(current==='find_partners'){
  ui.discoveryRunning=!!status.active;ui.discoveryStopping=!!status.stopping;
  ui.discoveryStatus=status.active?status:null;
 }
 render();
}
function dateLabel(v){if(!v)return 'Not Recorded';const raw=String(v);const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw+'T12:00:00+08:00':raw);return isNaN(d)?'Not Recorded':d.toLocaleDateString('en-SG',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Singapore'});}
function timeLabel(v){if(!v)return 'Never';const d=new Date(v);return isNaN(d)?'Unknown':new Intl.DateTimeFormat('en-SG',{day:'numeric',month:'long',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true,timeZone:'Asia/Singapore'}).format(d).replace(' at ', ', ').replace(/\b(am|pm)\b/gi,(_match,period)=>period.toLowerCase()==='am'?'a.m.':'p.m.');}
const ACTIVITY_OUTCOME_LABELS={
 'none':'Not Recorded','requested-information':'Requested Information','meeting-agreed':'Agreed to Meeting',
 'trial-discussed':'Discussed Pilot','follow-up-needed':'Follow-Up Needed','declined':'Declined',
 'no-response':'No Reply','other':'Other','positive':'Positive (Historical)','awaiting-reply':'Awaiting Reply (Historical)'
};
const activityOutcomeLabel=outcome=>ACTIVITY_OUTCOME_LABELS[outcome]||titleCase(String(outcome||'').replaceAll('-',' '));
const titleCase=s=>String(s||'').replace(/\b[a-z][a-z']*/gi,w=>({hq:'HQ',ai:'AI',id:'ID',kg:'kg',api:'API'}[w.toLowerCase()]||w[0].toUpperCase()+w.slice(1)));
const stageLabel=s=>String(s||'').toLowerCase()==='trial'?'Pilot':titleCase(s);
// Render legacy and current automatic stage changes consistently, without rewriting stored history.
function activityDisplayText(text,type){
 const value=String(text||'');
 if(type!=='update'&&type!=='stage')return value;
 const names='suggested|contacted|interested|trial|regular|closed';
 return value
  .replace(new RegExp('\\bstage:\\s*('+names+')\\s+to\\s+('+names+')\\b','gi'),(_match,from,to)=>'Stage: '+stageLabel(from)+' to '+stageLabel(to))
  .replace(new RegExp('\\b(added as\\s+)('+names+')\\b','gi'),(_match,prefix,stage)=>'Added as '+stageLabel(stage))
  .replace(new RegExp('\\b(progressed the relationship to\\s+)('+names+')\\b','gi'),(_match,prefix,stage)=>'progressed the relationship to '+stageLabel(stage))
   .replace(/\b\d{4}-\d{2}-\d{2}\b/g,iso=>dateLabel(iso));
}

function pBadge(p){return p.verified?'<span class="co-pill">Verified</span>':'';}
function base(title,sub,action=''){return `<div class="co-page co-page-header"><div class="co-head"><div><h1 class="co-title">${title}</h1><div class="co-sub">${sub}</div></div><div class="co-actions">${action}</div></div><div id="view"></div></div>`;}
function render(){
 const root=$('#app-main');if(!root)return;
 const views={dashboard:dashboardView,find_partners:findView,outreach_draft:outreachView,manage_partners:manageView,partner_detail:partnerDetailView};root.innerHTML=views[current]();
 bindControls();
 if(current==='partner_detail'&&partner(qs.get('partner')))switchManageTab(ui.partnerTab);
}
function dashboardView(){
 return base('Dashboard','',`<button class="co-button" data-action="handover-select">Log Handover</button>`);
}
// Operational overview: use recorded state, not invented historical estimates.
function weekBody(){
 const t=data.metrics,s=data.settings,today=journalDate();
 const relevant=data.partners.filter(p=>p.status!=='closed'&&p.status!=='suggested'&&p.followUpDate);
 const overdue=relevant.filter(p=>p.followUpDate<today);
 const due=relevant.filter(p=>p.followUpDate<=new Date(Date.now()+7*86400000+8*3600000).toISOString().slice(0,10))
  .sort((a,b)=>a.followUpDate.localeCompare(b.followUpDate)).slice(0,3);
 const stageNames=['suggested','contacted','interested','trial','regular'];
 const handovers=[...(data.handovers||[])].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  const forecastDemandKg=t.confirmedKg;
  const gapKg=t.gapKg;
  const thisWeek=new Date(today+'T12:00:00Z'),day=thisWeek.getUTCDay();
  thisWeek.setUTCDate(thisWeek.getUTCDate()-(day+6)%7);
  const weekStart=thisWeek.toISOString().slice(0,10);
  const weeklyHandoversKg=(data.handovers||[]).filter(h=>h.date>=weekStart&&h.date<=today).reduce((total,h)=>total+(Number(h.kg)||0),0);
  const capacityPct=t.forecastKg?Math.min(100,Math.round(forecastDemandKg/t.forecastKg*100)):0;
 const stat=(label,value,tone='')=>`<div class="co-overview-stat ${tone}"><span>${label}</span><strong>${value}</strong></div>`;
 return `<section class="co-overview">
  <div class="co-overview-stats">
   ${stat('Forecast Supply',m(t.forecastKg)+' kg/week')}
    ${stat('Forecast Demand',m(forecastDemandKg)+' kg/week')}
    ${stat('Handed Over This Week',m(weeklyHandoversKg)+' kg')}
    ${stat('Projected Gap',m(gapKg)+' kg/week',gapKg?'co-warn':'')}
  </div>
  <div class="co-overview-grid">
   <section class="co-overview-panel co-overview-supply"><div class="co-overview-heading"><h2>Supply vs Demand</h2><button class="co-overview-link" data-action="settings">Edit Forecast</button></div>
    <div class="co-supply-numbers"><span>${m(forecastDemandKg)} kg/week planned</span><strong>${capacityPct}%</strong></div>
    <div class="co-supply-track" role="img" aria-label="${capacityPct}% of projected supply covered"><span style="width:${capacityPct}%"></span></div>
    <div class="co-supply-legend"><span><i></i>Forecast Demand</span><span><i></i>Projected Gap</span></div>

   </section>
   <section class="co-overview-panel"><div class="co-overview-heading"><h2>Upcoming Follow-Ups${overdue.length?' ('+overdue.length+' Overdue)':''}</h2><a href="/manage-partners">View All</a></div>
    ${due.length?due.map(p=>`<a class="co-overview-item" href="/partner?partner=${encodeURIComponent(p.id)}"><div><strong>${esc(p.name)}</strong><small>${esc(p.nextAction||stageLabel(p.status))}</small></div><time class="${p.followUpDate<today?'co-overdue':''}">${esc(dateLabel(p.followUpDate))}</time></a>`).join(''):'<p class="co-overview-empty">No follow-ups due in the next seven days.</p>'}
   </section>
   <section class="co-overview-panel"><div class="co-overview-heading"><h2>Partner Stages</h2><a href="/manage-partners">Manage Partners</a></div>
    <div class="co-stage-strip">${stageNames.map(stage=>`<a href="${stage==='suggested'?'/find-partners':'/manage-partners'}"><span>${stageLabel(stage)}</span><strong>${data.partners.filter(p=>p.status===stage).length}</strong></a>`).join('')}</div>
   </section>
   <section class="co-overview-panel"><div class="co-overview-heading"><h2>Recent Handovers</h2><a href="/manage-partners">View Partners</a></div>
    ${handovers.length?handovers.map(h=>`<a class="co-overview-item" href="/partner?partner=${encodeURIComponent(h.partnerId)}"><div><strong>${esc(name(h.partnerId))}</strong><small>${esc(dateLabel(h.date))}</small></div><b>${m(h.kg)} kg</b></a>`).join(''):'<p class="co-overview-empty">No handovers recorded yet.</p>'}
   </section>
  </div>
 </section>`;
}
function discoveryViewProgress(status){
 const done=Math.max(0,Math.min(4,Number(status?.completed)||0));
 const fraction=status?.phase==='Assessing and Ranking Partners'&&status.batchTotal>0?Math.max(0,Math.min(1,(status.batchCompleted||0)/status.batchTotal)):0;
 const percentage=Math.round(Math.min(100,(done+fraction)*25));
 const stage=status?.phase?.startsWith('Completed')?4:Math.min(4,done+1);
 return {percentage,stage,phase:status?.phase||'Discovering Partners',detail:status?.detail||'',label:'Stage '+stage+' of 4'};
}
function contactRouteBlock(p){
 const email=String(p.contactEmail||'').trim();
 const hasEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
 const page=p.contactPageUrl&&/^https:\/\//i.test(p.contactPageUrl)?p.contactPageUrl:'';
 const label=hasEmail?'Email available':page?'Contact page available':'Not identified';
 const source=p.contactEvidence;
 const channel=hasEmail?'<a href="mailto:'+encodeURIComponent(email)+'">'+esc(email)+'</a>':page?'<a href="'+esc(page)+'" target="_blank" rel="noopener noreferrer">Open contact page ↗</a>':'No public contact recorded';
 const attribution=hasEmail&&source?.method==='staff'?'Staff entered':hasEmail&&source?.url&&/^https:\/\//.test(source.url)?'<a href="'+esc(source.url)+'" target="_blank" rel="noopener noreferrer">'+esc(source.source||'Email source')+' ↗</a>':hasEmail?'Source not recorded':page?'Organisation website':'';
 const checked=p.contactSearch?.checkedAt?'Checked '+esc(dateLabel(p.contactSearch.checkedAt)):'';
 const search=!hasEmail?'<a href="https://www.google.com/search?q='+encodeURIComponent(p.name+' official contact Singapore')+'" target="_blank" rel="noopener noreferrer">Search web ↗</a>':'';
 const html='<div class="co-contact-route"><strong>Contact</strong><div>'+channel+'</div><div class="co-contact-route-meta">'+attribution+' '+checked+' '+search+'</div><button type="button" class="co-button alt small" data-action="research-contact" data-id="'+esc(p.id)+'">Research Contact</button></div>';
 return {label,html};
}

function findView(){
 const all=data.ranked.filter(p=>p.status==='suggested'&&p.source!=='Fictional Stitch scenario');
 const categories=[...new Set(all.map(p=>p.category))].sort();
 let matches=all.filter(p=>(!ui.aiAssessedOnly||p.match?.aiLed===true)&&(ui.category==='all'||p.category===ui.category)&&(p.name+' '+p.category+' '+p.use).toLowerCase().includes(ui.search.toLowerCase()));
 if(ui.sort==='fit')matches.sort((a,b)=>b.match.score-a.match.score||a.name.localeCompare(b.name));
 if(ui.sort==='nearest')matches.sort((a,b)=>(a.distanceKm??Infinity)-(b.distanceKm??Infinity)||b.match.score-a.match.score);
 if(ui.sort==='recent')matches.sort((a,b)=>(Date.parse(b.sourcedAt||'')||0)-(Date.parse(a.sourcedAt||'')||0)||b.match.score-a.match.score);
  // Stable partition: preserve selected sort order within each contactability tier.
  if(ui.contactableFirst){
   const rank=p=>p.contactEmail?2:p.contactPageUrl?1:0;
   matches.sort((a,b)=>rank(b)-rank(a));
  }
 const totalPages=Math.max(1,Math.ceil(matches.length/15));
 ui.page=Math.min(Math.max(1,ui.page),totalPages);
 const pageStart=(ui.page-1)*15;
 const pageItems=matches.slice(pageStart,pageStart+15);
 const cards=pageItems.map(p=>{
  const contact=contactRouteBlock(p);
  const sourceHref=[...(p.evidenceEntries||[]).map(e=>e.url),p.sourceUrl].find(url=>typeof url==='string'&&url.startsWith('https://'));
  const sourceLink=sourceHref?`<a class="co-listing-source" href="${esc(sourceHref)}" target="_blank" rel="noopener noreferrer">View source ↗</a>`:'';
  const recommendation=p.match.aiLed&&p.aiAssessment?`<p class="co-why"><strong>AI Review Notes:</strong> ${esc(p.aiAssessment.reason)}</p>`:`<p class="co-why">Preliminary screening based on source category and available evidence.</p>`;
   const claim=(p.evidenceEntries||[]).find(e=>typeof e.claim==='string'&&e.claim.trim())?.claim?.trim()||p.materialEvidence||'';
   const evidenceSummary=claim?'<div class="co-compact-source-evidence"><strong>Source Evidence</strong><span>'+esc(claim.length>220?claim.slice(0,217)+'…':claim)+'</span></div>':'';
  const dimensions=[
   {label:'Reuse Suitability',value:p.match.parts?.suitability??0,max:p.match.weights?.suitability??40,colour:'suitability'},
   {label:'Source Evidence',value:p.match.parts?.evidence??0,max:p.match.weights?.evidence??35,colour:'evidence'},
   {label:'HQ Proximity',value:p.match.parts?.proximity??0,max:p.match.weights?.proximity??10,colour:'proximity'},
   {label:'Intake & Operations',value:p.match.parts?.operations??0,max:p.match.weights?.operations??35,colour:'readiness'}
  ];
  const filled=dimensions.reduce((total,item)=>total+Math.min(item.max,Math.max(0,item.value)),0);
  const composition=`<div class="co-fit-composition"><div class="co-fit-composition-head"><strong>Fit Score</strong><span>${p.match.score}/100</span></div><div class="co-fit-segments" role="img" aria-label="Fit Score composition: ${dimensions.map(x=>x.label+' '+x.value+' of '+x.max).join(', ')}">${dimensions.map(x=>`<span class="co-fit-segment co-fit-${x.colour}" style="width:${Math.min(x.max,Math.max(0,x.value))}%"></span>`).join('')}<span class="co-fit-segment co-fit-unearned" style="width:${Math.max(0,100-filled)}%"></span></div><div class="co-fit-legend">${dimensions.map(x=>`<div><i class="co-fit-dot co-fit-${x.colour}"></i><span>${x.label}</span><strong>${x.value}/${x.max}</strong></div>`).join('')}</div></div>`;
  return `<article class="co-discovery-card" data-listing-id="${esc(p.id)}" tabindex="0" aria-label="Toggle details for ${esc(p.name)}" aria-controls="listing-details-${esc(p.id)}" aria-expanded="false"><div><div class="co-listing-head"><h3>${esc(p.name)}</h3>${sourceLink}${pBadge(p)}</div><div class="co-listing-meta"><span><b><span class="material-symbols-outlined" aria-hidden="true">category</span>Category</b>${esc(titleCase(p.category))}</span><span><b><span class="material-symbols-outlined" aria-hidden="true">near_me</span>Distance From HQ</b>${p.distanceKm==null?'Unknown':m(p.distanceKm)+' km'}</span><span><b><span class="material-symbols-outlined" aria-hidden="true">alternate_email</span>Contact Route</b>${esc(contact.label)}</span></div>${recommendation}<details class="co-candidate-details" id="listing-details-${esc(p.id)}"><summary>Details</summary><div class="co-details-sourced"><span class="material-symbols-outlined" aria-hidden="true">calendar_today</span><span>Date Sourced</span><strong>${timeLabel(p.sourcedAt)}</strong></div>${composition}${evidenceSummary}${contact.html}</details></div><div class="co-card-actions"><div class="co-fit-meter co-fit-${p.match.score>=75?'good':p.match.score>=50?'moderate':'low'}" role="img" aria-label="Fit score ${p.match.score} out of 100"><div class="co-fit-meter-score">${p.match.score}/100</div><div class="co-fit-meter-method">Source Screening</div><div class="co-fit-meter-track"><span class="co-fit-meter-fill" style="width:${Math.max(0,Math.min(100,p.match.score))}%"></span></div></div><button class="co-button small" data-href="/outreach?partner=${encodeURIComponent(p.id)}">Draft Outreach</button><button class="co-button alt small" data-action="edit" data-id="${esc(p.id)}">Edit Partner</button><button class="co-button alt small" data-action="ai-review" data-id="${esc(p.id)}" ${ui.reviewingId?'disabled':''}>${ui.reviewingId===p.id?'Reviewing…':'AI Review'}</button></div></article>`;
 }).join('');
 const pageNumbers=[...new Set([1,ui.page-1,ui.page,ui.page+1,totalPages].filter(n=>n>=1&&n<=totalPages))].sort((a,b)=>a-b);
 const pageButton=n=>'<button class="co-page-button" data-action="page" data-page="'+n+'" '+(ui.page===n?'aria-current="page"':'')+'>'+n+'</button>';
 const pageLinks=pageNumbers.map((n,i)=>(i&&n-pageNumbers[i-1]>1?'<span class="co-page-ellipsis">…</span>':'')+pageButton(n)).join('');
 const pagination=totalPages>1?'<nav class="co-pages" aria-label="Partner result pages"><button data-action="page" data-page="'+(ui.page-1)+'" '+(ui.page===1?'disabled':'')+'>Previous</button>'+pageLinks+'<button data-action="page" data-page="'+(ui.page+1)+'" '+(ui.page===totalPages?'disabled':'')+'>Next</button></nav>':'';
 const history=(data.discoveryRuns||[]).length?
  '<details class="co-section co-card co-audit"><summary>Discovery History</summary>'+
  data.discoveryRuns.slice(0,5).map(run=>'<div class="co-audit-row"><strong>'+timeLabel(run.startedAt)+'</strong><span>'+esc((run.sources||[]).map(x=>x.name+(x.cached?' (cached)':'')+' · '+x.found).join(', '))+'</span><span>'+run.newLeads+' added · '+run.reviewed+' AI assessed · '+run.aiCalls+' AI calls'+'</span></div>').join('')+
  '</details>':'';
 const last=(data.discoveryRuns||[])[0];
  const idle=`<div class="co-last-scan"><div class="co-scan-primary"><strong>Last Scanned</strong><span>${timeLabel(last?.finishedAt||last?.startedAt)}</span></div><div class="co-scan-meta">${last?(()=>{return last.sources.length+' Sources Successful · '+last.sources.reduce((sum,x)=>sum+x.found,0)+' Entries · '+all.filter(p=>p.match.aiLed).length+' AI-Assessed Now';})():'Select Discover Partners to begin'}</div></div>`;
 const status=ui.discoveryStatus;
 const progressState=discoveryViewProgress(status);
 const progress=`<section class="co-progress-panel" id="discovery-progress" ${ui.discoveryRunning?'':'hidden'} role="status" aria-live="polite"><strong id="discovery-phase">${esc(progressState.phase)}</strong><div class="co-progress-track"><div class="co-progress-fill" id="discovery-bar" style="width:${progressState.percentage}%"></div></div><div class="co-progress-meta"><span class="co-note" id="discovery-count">${progressState.label}</span><span class="co-note" id="discovery-detail">${esc(progressState.detail)}</span></div></section>`;
 const filters=`<aside class="co-discovery-sidebar" aria-label="Partner discovery controls">

   <div class="co-discovery-filter-fields">
    <label class="co-discovery-filter-field" for="search-filter">Search
     <input id="search-filter" type="search" placeholder="Search Partners" value="${esc(ui.search)}">
    </label>
    <label class="co-discovery-filter-field" for="sort-filter">Sort
     <select id="sort-filter">
      <option value="fit" ${ui.sort==='fit'?'selected':''}>Best Fit</option>
      <option value="nearest" ${ui.sort==='nearest'?'selected':''}>Nearest</option>
      <option value="recent" ${ui.sort==='recent'?'selected':''}>Recently Sourced</option>
     </select>
    </label>
    <label class="co-discovery-filter-field" for="category-filter">Category
     <select id="category-filter">
      <option value="all" ${ui.category==='all'?'selected':''}>All Categories</option>
      ${categories.map(c=>`<option value="${esc(c)}" ${c===ui.category?'selected':''}>${esc(titleCase(c))}</option>`).join('')}
     </select>
    </label>
    <label class="co-discovery-ai-checkbox"><input type="checkbox" id="contactable-first-filter" ${ui.contactableFirst?'checked':''}>Contactable First</label>
    <label class="co-discovery-ai-checkbox"><input type="checkbox" id="ai-assessed-filter" ${ui.aiAssessedOnly?'checked':''}>AI-Assessed Only</label>
    <div class="co-discovery-result-count">Showing ${matches.length?pageStart+1:0}–${Math.min(pageStart+15,matches.length)} of ${matches.length}</div>
   </div>
   <div class="co-discovery-sidebar-status">
    ${ui.discoveryRunning?progress:idle}
    <p class="co-source-caption">Sources: Community in Bloom · NParks · MOE · NEA · LIAS · SFA</p>
   </div>
  </aside>`;
   return base('Discover Partners','',`${ui.discoveryRunning?`<button class="co-button alt co-stop-discovery" data-action="stop-discovery" ${ui.discoveryStopping?'disabled':''}><span class="material-symbols-outlined" aria-hidden="true">stop_circle</span>${ui.discoveryStopping?'Stopping...':'Stop Discovery'}</button>`:`<button class="co-button" data-action="discover">Discover Partners</button>`}<button class="co-button alt" data-action="assessment-settings" ${ui.discoveryRunning?'disabled':''}>Assessment Settings</button>`)+
  `<div class="co-page co-discovery-page" style="padding-top:0">
   <div class="co-discovery-layout">\n     ${filters}
    <div class="co-discovery-main">
     <div id="discovery-results">${cards||'<div class="co-empty">'+(ui.aiAssessedOnly?'No AI-assessed partners match your filters.':'No Partners Discovered Yet. Select Discover Partners to search.')+'</div>'}</div>
     ${pagination}
     ${history}
    </div>

   </div>
  </div>`;
}
function outreachView(){
 const isFollowUp=qs.get('mode')==='followup';
 const chosen=partner(ui.selectedId)||data.ranked[0]||data.partners[0];
 if(!chosen)return base('Draft Outreach','')+'<div class="co-page"><div class="co-empty">No Partners Available</div></div>';
 ui.selectedId=chosen.id;
 if(isFollowUp&&chosen.status==='suggested')return base('Draft Follow-Up','')+'<div class="co-page"><p class="co-note">This partner has not yet been contacted. Use Draft Outreach for the first email.</p></div>';
 const d=ui.draft;
 const messages=(data.partnerActivity||[]).filter(x=>x.partnerId===chosen.id&&!x.deletedAt&&
   (x.type==='response'||x.type==='email'||['text','whatsapp','call','meeting','site-visit'].includes(x.type)))
   .sort((x,y)=>Date.parse(y.occurredAt||y.at)-Date.parse(x.occurredAt||x.at));
 const recent=messages[0];
 const contextPanel=isFollowUp?`<section class="co-followup-context" aria-label="Follow-up context"><h3>Follow-Up Context</h3>${recent?`<div><span>${recent.type==='email'&&recent.emailDirection==='sent'?'Latest Sent Email':'Latest Recorded Communication'}</span><p>${esc((recent.text||'').slice(0,260))}${(recent.text||'').length>260?'…':''}</p></div>`:''}${chosen.nextAction?`<div><span>Next Action</span><p>${esc(chosen.nextAction)}</p></div>`:''}${chosen.followUpDate?`<div><span>Follow-Up Due</span><p>${esc(dateLabel(chosen.followUpDate))}</p></div>`:''}${!recent&&!chosen.nextAction?`<p>No previous conversation or next action recorded. Review the partner before sending.</p>`:''}</section>`:'';

 const copyField=(id,label,value,action,disabled=false,editable=false)=>`<div class="co-field"><label for="${id}">${label}</label><div class="co-copy-field"><input id="${id}" ${editable?'type="email" autocomplete="off"':'readonly'} value="${esc(value)}"><button type="button" class="co-icon-copy" aria-label="Copy ${label}" title="Copy ${label}" data-action="${action}" ${disabled?'disabled':''}><span class="material-symbols-outlined" aria-hidden="true">content_copy</span></button></div></div>`;
 return base(isFollowUp?'Draft Follow-Up':'Draft Outreach','',`<button class="co-button alt small co-back-link" data-href="${isFollowUp?'/partner?partner='+encodeURIComponent(chosen.id):'/find-partners'}"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>${isFollowUp?'Back to Partner':'Discover Partners'}</button>`)+
 `<div class="co-page co-outreach-page"><div class="co-card co-outreach-editor">
  <div class="co-field"><div class="co-field-heading"><label for="draft-partner-search">Selected Partner</label><button type="button" class="co-button alt co-outreach-edit" data-action="edit" data-id="${esc(chosen.id)}"><span class="material-symbols-outlined" aria-hidden="true">edit</span>Edit Partner</button></div>
   <div class="co-partner-combobox"><div class="co-combobox-control"><input id="draft-partner-search" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" aria-controls="draft-partner-options" autocomplete="off" value="${esc(chosen.name)}" placeholder="Search Partners" ${isFollowUp?'readonly':''}><button type="button" class="co-combobox-toggle" data-action="draft-toggle" aria-label="Show partners" ${isFollowUp?'hidden':''} aria-controls="draft-partner-options"><span class="material-symbols-outlined" aria-hidden="true">expand_more</span></button></div><div class="co-partner-options" id="draft-partner-options" role="listbox" hidden></div></div>
  </div>
  ${contextPanel}<div class="co-outreach-fields">
  ${copyField('draft-recipient','Recipient',chosen.contactEmail||'','copy-recipient',false,true)}
  ${copyField('draft-subject','Subject',isFollowUp?'CoffeeBot | Spent Coffee Grounds Reuse Follow-Up':'CoffeeBot | Spent Coffee Grounds Reuse Partnership','copy-subject')}
  </div>
  <div class="co-field co-outreach-body"><label for="draft-body">Email Body</label><textarea id="draft-body" rows="15" placeholder="Generate a draft to get started.">${esc(d?.body||'')}</textarea></div>
  <div class="co-outreach-actions"><div class="co-outreach-actions-left"><button class="co-button alt" data-action="generate"><span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>${isFollowUp?'Generate Follow-Up':'Generate Draft'}</button><button class="co-button alt" data-action="copy"><span class="material-symbols-outlined" aria-hidden="true">content_copy</span>Copy Email</button></div><button class="co-button" data-action="record-sent">Record Sent<span class="material-symbols-outlined" aria-hidden="true">send</span></button></div>
 </div></div>`;
}
function draftCandidates(search=''){
 const q=search.toLowerCase().trim();
 return data.partners.filter(p=>p.status!=='closed'&&(qs.get('mode')!=='followup'||p.status!=='suggested')&&(p.name+' '+p.category).toLowerCase().includes(q))
  .sort((a,b)=>a.name.localeCompare(b.name)).slice(0,60);
}
function draftOptions(search=''){
 ui.draftSearchQuery=search;
 const list=$('#draft-partner-options'),input=$('#draft-partner-search');
 if(!list||!input)return;
 const candidates=draftCandidates(search);
 ui.draftOptionIndex=Math.max(0,Math.min(ui.draftOptionIndex||0,candidates.length-1));
 list.innerHTML=candidates.length?candidates.map((p,i)=>`<button type="button" role="option" class="co-partner-option ${i===ui.draftOptionIndex?'active':''}" id="draft-option-${i}" aria-selected="${p.id===ui.selectedId}" data-action="draft-pick" data-id="${esc(p.id)}"><span>${esc(p.name)}</span><small>${esc(titleCase(p.category))}</small></button>`).join(''):'<div class="co-partner-no-results">No Partners Found</div>';
 list.hidden=false;input.setAttribute('aria-expanded','true');
 if(candidates.length)input.setAttribute('aria-activedescendant','draft-option-'+ui.draftOptionIndex);
 else input.removeAttribute('aria-activedescendant');
}
function closeDraftOptions(reset=true){
 const list=$('#draft-partner-options'),input=$('#draft-partner-search');
 if(list)list.hidden=true;
 if(input){input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');if(reset)input.value=partner(ui.selectedId)?.name||'';}
}
function chooseDraftPartner(id){
 if(!data.partners.some(p=>p.id===id&&p.status!=='closed'))return;
 ui.selectedId=id;ui.draft=null;ui.draftOptionIndex=0;
 history.replaceState(null,'','/outreach?partner='+encodeURIComponent(id)+(qs.get('mode')==='followup'?'&mode=followup':''));render();
}
const manageStages=[
 {key:'contacted',icon:'outgoing_mail',label:'Contacted'},
 {key:'interested',icon:'chat_bubble',label:'Interested'},
 {key:'trial',icon:'rocket_launch',label:'Pilot'},
 {key:'regular',icon:'autorenew',label:'Regular'},
 {key:'closed',icon:'archive',label:'Closed'}
];
function stageChip(status){
 const item=manageStages.find(x=>x.key===status);
 if(!item)return '';
 return `<span class="co-stage-chip co-stage-${item.key}"><span class="material-symbols-outlined" aria-hidden="true">${item.icon}</span>${item.label}</span>`;
}
function manageSidebar(counts,total,start,end,categories){
 const opts=(selected,values)=>values.map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('');
 return `<aside class="co-discovery-sidebar co-manage-sidebar" aria-label="Partner management controls">
  <div class="co-discovery-filter-fields">
   <label class="co-discovery-filter-field" for="manage-search">Search<input id="manage-search" type="search" value="${esc(ui.manageSearch)}" placeholder="Search Partners"></label>
   <label class="co-discovery-filter-field" for="manage-sort">Sort<select id="manage-sort">${opts(ui.manageSort,[['name','Name: A–Z'],['recent','Recent Activity'],['follow-up','Next Follow-Up']])}</select></label>
   <label class="co-discovery-filter-field" for="manage-category">Category<select id="manage-category"><option value="all">All Categories</option>${categories.map(c=>`<option value="${esc(c)}" ${ui.manageCategory===c?'selected':''}>${esc(titleCase(c))}</option>`).join('')}</select></label>
   <div class="co-discovery-result-count">Showing ${start}–${end} of ${total}</div>
  </div>
  <div class="co-manage-stage-summary"><div class="co-manage-stage-head"><h3>Partner Stages</h3><button type="button" class="co-manage-clear" data-action="manage-clear-stage">All Active</button></div>${manageStages.map(x=>`<button type="button" class="co-stage-count ${ui.manageStage===x.key?'is-active':''}" data-action="manage-stage-pick" data-stage="${x.key}" aria-pressed="${ui.manageStage===x.key}">${stageChip(x.key)}<span class="co-stage-number">${counts[x.key]}</span></button>`).join('')}</div>
 </aside>`;
}
function manageView(){
 const statuses=manageStages.map(x=>x.key);
 const active=data.partners.filter(p=>statuses.includes(p.status));
 const categories=[...new Set(active.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const counts=Object.fromEntries(statuses.map(k=>[k,active.filter(p=>p.status===k).length]));
 let arr=active.filter(p=>(ui.manageStage==='active'?p.status!=='closed':ui.manageStage==='all'||p.status===ui.manageStage)&&(ui.manageCategory==='all'||p.category===ui.manageCategory));
 arr=arr.filter(p=>(p.name+' '+p.category+' '+(p.contactName||'')+' '+(p.contactEmail||'')+' '+(p.nextAction||'')).toLowerCase().includes(ui.manageSearch.toLowerCase()));
 if(ui.manageSort==='recent')arr.sort((a,b)=>(Date.parse((data.partnerActivity||[]).find(x=>x.partnerId===b.id)?.at)||0)-(Date.parse((data.partnerActivity||[]).find(x=>x.partnerId===a.id)?.at)||0)||a.name.localeCompare(b.name));
 else if(ui.manageSort==='follow-up')arr.sort((a,b)=>(a.followUpDate||'9999').localeCompare(b.followUpDate||'9999')||a.name.localeCompare(b.name));
 else arr.sort((a,b)=>a.name.localeCompare(b.name));
 const pages=Math.max(1,Math.ceil(arr.length/15));ui.managePage=Math.max(1,Math.min(ui.managePage,pages));
 const start=(ui.managePage-1)*15,items=arr.slice(start,start+15);
 const rows=items.map(p=>`<a class="co-manage-row" href="/partner?partner=${encodeURIComponent(p.id)}" aria-label="Manage ${esc(p.name)}"><div class="co-manage-row-head"><strong>${esc(p.name)}</strong>${stageChip(p.status)}</div><div class="co-manage-row-meta">${esc(titleCase(p.category))}${p.source==='Fictional Stitch scenario'?' · Demo':''}</div>${p.nextAction||p.followUpDate?`<div class="co-manage-next"><span class="material-symbols-outlined" aria-hidden="true">event_note</span><span>${p.nextAction?'Next: '+esc(p.nextAction):'Follow-Up'}${p.followUpDate?' · '+esc(dateLabel(p.followUpDate)):''}</span></div>`:''}</a>`).join('');

 const main=`<div class="co-discovery-main co-manage-main"><div class="co-manage-list">${rows||'<div class="co-empty">No Partners Match</div>'}</div><div class="co-manage-pages"><button data-action="manage-page" data-page="${ui.managePage-1}" ${ui.managePage===1?'disabled':''}>Previous</button><span>${ui.managePage} / ${pages}</span><button data-action="manage-page" data-page="${ui.managePage+1}" ${ui.managePage===pages?'disabled':''}>Next</button></div></div>`;
 return base('Manage Partners','',`<button class="co-button" data-action="new">Add Partner</button>`)+`<div class="co-page co-manage-page"><div class="co-discovery-layout">${manageSidebar(counts,arr.length,arr.length?start+1:0,Math.min(start+15,arr.length),categories)}${main}</div></div>`;
}
function switchManageTab(tab){
 if(!['relationship','edit'].includes(tab))return;
 for(const key of ['relationship','edit']){
  const panel=$('#manage-tab-'+key),button=$('#manage-tab-button-'+key);
  if(!panel||!button)continue;
  const selected=key===tab;
  panel.hidden=!selected;
  panel.querySelectorAll('input,select,textarea').forEach(field=>{field.disabled=!selected;});
  button.setAttribute('aria-selected',String(selected));
  button.tabIndex=selected?0:-1;
 }
 const form=$('#partner-page-form')||$('#dialog-form');
 if(form)form.dataset.activeTab=tab;
 const footer=$('.co-partner-page-footer')||$('.co-dialog-footer');if(footer)footer.hidden=tab==='relationship';
 ui.partnerTab=tab;
 const save=form?.querySelector('[type="submit"]');
 if(save)save.textContent=tab==='edit'?'Save Partner':'Save Changes';
 const scroll=$('.co-dialog-scroll');
 if(scroll)scroll.scrollTop=0;
}
function journalDate(){return new Date(Date.now()+8*3600000).toISOString().slice(0,10);}
const MANUAL_ACTIVITY_TYPES=['email','text','call','whatsapp','meeting','site-visit','other','response','note','follow-up','stage','update','outreach'];
function editableStaffActivity(a){return MANUAL_ACTIVITY_TYPES.includes(a.type)&&!a.deletedAt&&!a.handoverId&&(['stage','update','outreach'].includes(a.type)||a.entrySource!=='system');}
function journalEvents(p){
 const outbound=(data.outreach||[]).filter(x=>x.partnerId===p.id&&x.sent);
 const records=(data.partnerActivity||[])
  .filter(x=>x.partnerId===p.id&&!x.deletedAt&&x.type!=='handover'&&!(x.type==='outreach'&&outbound.length))
  .map(x=>({id:x.id,type:x.type,at:x.occurredAt||x.at,loggedAt:x.at,displayDate:x.date||'',text:x.text,emailDirection:x.emailDirection||'',contact:x.contactPerson||'',outcome:x.outcome||'',next:x.nextAction||'',stage:x.stageTo||'',editable:editableStaffActivity(x),recordKind:'activity',editedAt:x.editedAt||null}));
 records.push(...outbound.map(x=>({id:x.id,type:'outreach',at:x.sentAt||x.preparedAt,text:'Email recorded as sent',kind:x.kind||'initial',subject:x.subject||'',body:x.body||'',recipientEmail:x.recipientEmail||'',editable:true,recordKind:'outreach',editedAt:x.editedAt||null})));
 records.push(...(data.handovers||[]).filter(h=>h.partnerId===p.id).map(h=>({id:h.id,type:'handover',at:h.date+'T'+(h.time||'12:00')+':00+08:00',displayDate:h.time?'':h.date,text:m(h.kg)+' kg transferred',outcome:'',next:h.notes||'',arrangement:[h.transportException?'Collection: '+({'partner-collects':'Partner Collects','coffeebot-delivers':'CoffeeBot Delivers',either:'Either'})[h.transportArrangement]:null,h.groundsException?'Grounds: '+({dry:'Dried',wet:'Wet',either:'Either'})[h.groundsCondition]:null].filter(Boolean).join(' / '),editable:true,recordKind:'handovers',editedAt:h.editedAt||null})));
 return records.sort((a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0));
}
function journalTimeline(p){
 const records=journalEvents(p);
 if(!records.length)return '<p class="co-note">No interactions recorded yet.</p>';
 const titles={outreach:'Outreach Sent',email:'Email',call:'Phone Call',whatsapp:'WhatsApp',text:'Text / WhatsApp',meeting:'Meeting','site-visit':'Site Visit',handover:'Grounds Handover',discovery:'Partner Discovered',note:'Note',response:'Response',update:'Record Updated'};
 const itemHtml=(x,older=false)=>{
  const subject=x.subject||'';
  const message=activityDisplayText(x.text,x.type);
  const label=x.type==='outreach'&&x.kind==='followup'?'Follow-Up Sent':x.type==='email'?(x.emailDirection==='received'?'Reply Received':x.emailDirection==='sent'?'Email Sent':'Email'):(titles[x.type]||titleCase(x.type));
  const hasLongMessage=['email','text','whatsapp'].includes(x.type)&&(message.length>180||message.split('\n').length>3);
  const expandable=(x.type==='outreach'&&!!x.body)||hasLongMessage;
  const displayedTime=x.displayDate&&x.loggedAt?'Logged '+timeLabel(x.loggedAt):x.displayDate?dateLabel(x.displayDate):timeLabel(x.at);
   const correction=x.editedAt?' <span class="co-history-corrected">Edited</span>':'';
  const heading=`<div class="co-journal-entry-heading"><strong>${esc(label)}${correction}</strong><time>${esc(displayedTime)}</time></div>`;
  const activityMenu=x.editable?`<details class="co-activity-menu"><summary title="Activity options" aria-label="Options for ${esc(label)}"><span class="material-symbols-outlined" aria-hidden="true">more_horiz</span></summary><div class="co-activity-menu-panel"><button type="button" data-action="manage-activity-edit" data-id="${esc(x.id)}">Edit Activity</button><button type="button" data-action="manage-activity-delete" data-id="${esc(x.id)}">Delete Activity</button></div></details>`:'';
    const extra=`${x.contact?`<small>With ${esc(x.contact)}</small>`:''}${x.outcome?`<small>Outcome: ${esc(activityOutcomeLabel(x.outcome))}</small>`:''}${x.stage?`<small>Stage: ${esc(stageLabel(x.stage))}</small>`:''}${x.next?`<small>${x.type==='handover'?'Notes':'Next'}: ${esc(x.next)}</small>`:''}${x.arrangement?`<small>${esc(x.arrangement)}</small>`:''}`;
  if(!expandable){
   const content=x.type==='outreach'&&subject?subject:message;
   const sourceClass=x.type==='discovery'?' co-journal-source':'';
   return `<article class="co-journal-item"${older?' hidden':''}><div class="co-journal-entry-static">${heading}${content?`<p class="co-journal-static-message${sourceClass}">${esc(content)}</p>`:''}${extra?`<div class="co-journal-entry-meta">${extra}</div>`:''}</div>${activityMenu}</article>`;
  }
  // Collapsed long messages show the event and sender, never a duplicate excerpt of the full message.
  const preview=x.type==='outreach'?subject:(x.contact?'From '+x.contact:'');
  const detail=x.type==='outreach'
   ?`<div class="co-journal-email"><div><strong>Subject</strong><span>${esc(subject||'Not recorded')}</span></div>${x.recipientEmail?'<div><strong>To</strong><span>'+esc(x.recipientEmail)+'</span></div>':''}<div><strong>Sent Email</strong><div class="co-journal-email-body">${esc(x.body||'Email body not available for this historical entry.')}</div></div></div>`
   :`<p class="co-journal-full-message">${esc(message)}</p>`;
  return `<article class="co-journal-item"${older?' hidden':''}><details class="co-journal-entry"><summary>${heading}${preview?`<span class="co-journal-preview">${esc(preview)}</span>`:''}<span class="co-journal-expand">View Details <span class="material-symbols-outlined" aria-hidden="true">expand_more</span></span></summary><div class="co-journal-expanded">${x.contact?`<small>With ${esc(x.contact)}</small>`:''}${detail}${x.outcome?`<small>Outcome: ${esc(activityOutcomeLabel(x.outcome))}</small>`:''}${x.stage?`<small>Stage: ${esc(stageLabel(x.stage))}</small>`:''}${x.next?`<small>${x.type==='handover'?'Notes':'Next'}: ${esc(x.next)}</small>`:''}${x.arrangement?`<small>${esc(x.arrangement)}</small>`:''}</div></details>${activityMenu}</article>`;
 };
 const latest=records.slice(0,24).map(x=>itemHtml(x)).join('');
 const older=records.slice(24).map(x=>itemHtml(x,true)).join('');
 return `<div class="co-journal-timeline">${latest}${older}</div>${older?`<button type="button" class="co-show-older" data-action="manage-show-older">Show Older Activity (${records.length-24})</button>`:''}`;
}
function manageDetails(p){
 if(!p)return;
 const stages=['suggested','contacted','interested','trial','regular','closed'].map(k=>[k,stageLabel(k)]);
 const overview=`<section class="co-journal-overview"><div class="co-relationship-heading"><div><span class="material-symbols-outlined" aria-hidden="true">handshake</span><h3>Relationship Overview</h3></div></div><div class="co-journal-overview-grid"><div><span>Current Contact</span><strong>${esc(p.contactName||'Not Recorded')}</strong>${p.contactEmail?`<small>${esc(p.contactEmail)}</small>`:''}</div><div><span>Next Action</span><strong>${esc(p.nextAction||'Not Scheduled')}</strong></div><div class="${p.followUpDate&&p.followUpDate<=journalDate()?'co-follow-up-attention':''}"><span>Follow-Up Due</span><strong>${esc(p.followUpDate?dateLabel(p.followUpDate):'Not Scheduled')}</strong>${p.followUpDate&&p.followUpDate<=journalDate()?`<small>${p.followUpDate<journalDate()?'Overdue':'Due Today'}</small>`:''} </div></div><div class="co-journal-stage"><div class="co-field"><label for="relationship-stage">Stage</label><select id="relationship-stage">${stages.map(([v,t])=>`<option value="${v}" ${v===p.status?'selected':''}>${t}</option>`).join('')}</select></div><button type="button" class="co-button alt small" data-action="manage-stage-save" data-id="${esc(p.id)}">Update Stage</button></div></section>`;
 const log=`<div id="manage-journal-editor" class="co-journal-editor" hidden><div class="co-field-row"><div class="co-field"><label for="journal-type">Type <span class="co-required">*</span></label><select id="journal-type"><option value="email">Email Received</option><option value="email-sent">Email Sent</option><option value="call">Phone Call</option><option value="text">Text / WhatsApp</option><option value="meeting">Meeting</option><option value="site-visit">Site Visit</option><option value="other">Other</option></select></div><div class="co-field"><label for="journal-date">Date <span class="co-required">*</span></label><input type="date" id="journal-date" max="${journalDate()}" value="${journalDate()}"></div></div><div class="co-field-row"><div class="co-field"><label for="journal-contact">Contact Person</label><input id="journal-contact" autocomplete="off" value="${esc(p.contactName||'')}" placeholder="Who did you speak to?"></div><div class="co-field"><label for="journal-outcome">Outcome</label><select id="journal-outcome"><option value="none">Not Recorded</option><option value="requested-information">Requested Information</option><option value="meeting-agreed">Agreed to Meeting</option><option value="trial-discussed">Discussed Pilot</option><option value="follow-up-needed">Follow-Up Needed</option><option value="declined">Declined</option><option value="no-response">No Reply</option><option value="other">Other</option></select></div></div><div class="co-field"><label for="journal-text">Message / Notes <span class="co-required">*</span></label><textarea id="journal-text" maxlength="10000" rows="6" placeholder="Paste a partner reply, or briefly describe the conversation"></textarea></div><div class="co-field-row"><div class="co-field"><label for="journal-next">Next Action</label><input id="journal-next" maxlength="250" placeholder="e.g. Send material specifications"></div><div class="co-field"><label for="journal-due">Follow-Up Date</label><input type="date" id="journal-due"></div></div><div class="co-field"><label for="journal-stage">Stage</label><select id="journal-stage">${stages.filter(([v])=>v!=='closed'||p.status==='closed').map(([v,t])=>`<option value="${v}" ${v===p.status?'selected':''}>${t}</option>`).join('')}</select></div><div class="co-journal-form-actions"><button type="button" class="co-button alt" data-action="manage-log-cancel">Cancel</button><button type="button" class="co-button" data-action="manage-log-save" data-id="${esc(p.id)}">Save Activity</button></div></div>`;
 const actions=`<div class="co-journal-actions"><button type="button" class="co-button alt small" data-action="manage-log-open"><span class="material-symbols-outlined" aria-hidden="true">add</span> Log Activity</button><button type="button" class="co-button alt small" data-action="manage-handover-open" data-id="${esc(p.id)}"><span class="material-symbols-outlined" aria-hidden="true">inventory_2</span> Record Handover</button>${p.status!=='closed'&&p.status!=='suggested'?`<button type="button" class="co-button alt small" data-href="/outreach?partner=${encodeURIComponent(p.id)}&mode=followup"><span class="material-symbols-outlined" aria-hidden="true">edit_note</span> Draft Follow-Up</button>`:''}</div>`;
 const timeline=`<section class="co-journal-history"><div class="co-journal-history-toggle"><span class="co-journal-history-title"><span class="material-symbols-outlined" aria-hidden="true">history</span><strong>Activity History</strong><span class="co-journal-count">${journalEvents(p).length}</span></span></div>${journalTimeline(p)}</section>`;
 const tabs=`<div class="co-manage-tabs" role="tablist" aria-label="Partner management"><button type="button" role="tab" id="manage-tab-button-relationship" aria-controls="manage-tab-relationship" aria-selected="true" data-action="manage-tab" data-tab="relationship">Relationship</button><button type="button" role="tab" id="manage-tab-button-edit" aria-controls="manage-tab-edit" aria-selected="false" data-action="manage-tab" data-tab="edit" tabindex="-1">Edit Partner</button></div>`;
 const fields=tabs+`<div id="manage-tab-relationship" class="co-manage-panel" role="tabpanel" aria-labelledby="manage-tab-button-relationship">${overview+actions+timeline}</div><div id="manage-tab-edit" class="co-manage-panel" role="tabpanel" aria-labelledby="manage-tab-button-edit" hidden>${partnerFormFields(p,{includeStage:false})}</div>`;
 return {fields,log};
}
function partnerDetailView(){
 const p=partner(qs.get('partner'));
 if(!p)return base('Partner Not Found','',`<button type="button" class="co-button alt" data-href="/manage-partners">Back to Partners</button>`)+`<div class="co-page"><p class="co-note">This partner is no longer available.</p></div>`;
 const detail=manageDetails(p);
 const back=p.status==='suggested'?'/find-partners':'/manage-partners';
 return base(p.name,'',`<button type="button" class="co-button alt small co-back-link" data-href="${back}"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>Back to Partners</button>`)+
 `<div class="co-page co-partner-page"><div class="co-partner-profile"><div class="co-partner-profile-meta"><span class="co-category-tag">${esc(titleCase(p.category))}${p.source==='Fictional Stitch scenario'?' · Demo':''}</span>${stageChip(p.status)}</div><form id="partner-page-form" autocomplete="off"><div class="co-partner-page-content">${detail.fields}</div><div class="co-partner-page-footer" hidden><button type="button" class="co-button alt" data-action="manage-reset-edit">Cancel Changes</button><button type="submit" class="co-button">Save Partner</button></div></form></div></div>`;
}
function journalDialogContent(p){
 const labels={type:'type',date:'date',contact:'contactPerson',outcome:'outcome',text:'text',next:'nextAction',due:'followUpDate',stage:'stage'};
 let content=manageDetails(p).log.replace('id="manage-journal-editor" class="co-journal-editor" hidden','class="co-journal-editor co-journal-modal"');
 content=content.replace(/id="journal-(type|date|contact|outcome|text|next|due|stage)"/g,(_,key)=>`id="journal-${key}" name="${labels[key]}"`);
 content=content.replace('id="journal-date" name="date"','id="journal-date" name="date" required').replace('id="journal-text" name="text"','id="journal-text" name="text" required');
 content=content.replace(/<div class="co-journal-form-actions">[\s\S]*?<\/div><\/div>$/,'</div>');
 const aiSection=`<section id="journal-ai-section" class="co-journal-ai" aria-label="AI assisted logging"><div class="co-journal-ai-action"><div><strong>AI-Assisted Review</strong> </div><button type="button" class="co-button alt" data-action="manage-ai-analyse"><span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>Analyse with AI</button></div><div id="journal-ai-state" class="co-journal-ai-state" role="status" aria-live="polite" hidden><span class="co-ai-spinner" aria-hidden="true"></span><span>Analysing partner message...</span></div><div id="journal-ai-result" class="co-journal-ai-result" aria-live="polite" hidden></div></section>`;
 const afterMessage='</textarea></div><div class="co-field-row">';
 if(!content.includes(afterMessage))throw Error('Log Activity textarea layout changed');
 content=content.replace(afterMessage,'</textarea></div>'+aiSection+'<div class="co-field-row">');
 return content;
}
function openJournalDialog(p){
 if(!p)return;
 journalSuggestion=null;
 const content=journalDialogContent(p);
 dialog('Log Activity',content,async values=>{
  if(!values.text?.trim())throw Error('Add a short summary of what happened.');
  const payload={type:values.type==='email-sent'?'email':values.type,date:values.date,contactPerson:values.contactPerson,outcome:values.outcome,text:values.text};
   if(payload.type==='email')payload.emailDirection=values.type==='email-sent'?'sent':'received';
  for(const field of ['nextAction','followUpDate'])if(values[field]?.trim())payload[field]=values[field].trim();
  if(values.stage&&values.stage!==p.status)payload.stage=values.stage;
  await request('/api/partners/'+encodeURIComponent(p.id)+'/activity',{method:'POST',body:JSON.stringify(payload)});
 },{partnerEditor:true,submitLabel:'Save Activity',onComplete:async()=>{journalSuggestion=null;await refresh();notice('Activity recorded.');}});
 const type=$('#journal-type'),message=$('#journal-text');
 if(type)type.addEventListener('change',()=>{if(journalAnalysisRun)void cancelJournalAnalysis({quiet:true});invalidateJournalSuggestions();updateJournalAIAccess();});
 if(message)message.addEventListener('input',()=>{if(journalAnalysisRun)void cancelJournalAnalysis({quiet:true});invalidateJournalSuggestions();});
 updateJournalAIAccess();
}
function updateJournalAIAccess(){
 const type=$('#journal-type')?.value;
 const panel=$('#journal-ai-section');
 if(panel)panel.hidden=!['email','text'].includes(type);
}
function invalidateJournalSuggestions(){
 journalSuggestion=null;
 const result=$('#journal-ai-result');
 if(result){result.hidden=true;result.innerHTML='';}
}
function showJournalAISuggestion(suggestion,currentStage){
 const result=$('#journal-ai-result');if(!result)return;
 const options=[
  ['Outcome',suggestion.outcome?activityOutcomeLabel(suggestion.outcome):null],
  ['Stage',suggestion.stage?stageLabel(currentStage)+' → '+stageLabel(suggestion.stage):null],
  ['Next Action',suggestion.nextAction],
  ['Follow-Up Date',suggestion.followUpDate?dateLabel(suggestion.followUpDate):null],
  ['Contact Person',suggestion.contactPerson]
 ];
 const provided=options.filter(([,value])=>value);
 const fields=provided.length?provided.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join(''):'<p>No clear updates identified. You can still record this message manually.</p>';
 result.innerHTML=`<div class="co-journal-ai-heading"><strong>Suggested Updates</strong><span>Review Before Saving</span></div><div class="co-journal-ai-proposals">${fields}</div><div class="co-journal-ai-buttons"><button type="button" class="co-button alt small" data-action="manage-ai-dismiss">Dismiss</button><button type="button" class="co-button small" data-action="manage-ai-apply" ${provided.length?'':'disabled'}>Apply Suggestions</button></div>`;
 result.hidden=false;
}
function resetJournalAnalysisButton(el){
 if(!el?.isConnected)return;
 el.disabled=false;
 el.dataset.action='manage-ai-analyse';
 el.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>Analyse with AI';
 const state=$('#journal-ai-state');if(state)state.hidden=true;
}
async function cancelJournalAnalysis({quiet=false}={}){
 const run=journalAnalysisRun;
 if(!run||run.stopped)return;
 run.stopped=true;
 run.controller.abort();
 if(run.button?.isConnected){
  run.button.disabled=true;
  run.button.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">stop_circle</span>Stopping...';
   const state=$('#journal-ai-state');if(state){state.hidden=false;state.querySelector('span:last-child').textContent='Stopping analysis...';}
 }
 try{
  await request('/api/partners/'+encodeURIComponent(run.partnerId)+'/activity/analyse/stop',{method:'POST'});
  if(!quiet)notice('AI analysis cancelled.');
 }catch(error){
  if(!quiet&&error.message!=='No activity analysis is running')notice('Could not confirm cancellation: '+error.message,'error');
 }finally{
  if(journalAnalysisRun===run)journalAnalysisRun=null;
  resetJournalAnalysisButton(run.button);
 }
}
async function analyseJournalMessage(el){
 const p=partner(qs.get('partner'));
 const type=$('#journal-type')?.value,text=$('#journal-text')?.value?.trim();
 if(!p||!['email','text'].includes(type)||journalAnalysisRun)return;
 if(!text){notice('Paste an email or message before analysing.','error');$('#journal-text')?.focus?.();return;}
 const form=$('#dialog-form');
 const run={partnerId:p.id,button:el,controller:new AbortController(),stopped:false};
 journalAnalysisRun=run;
 el.dataset.action='manage-ai-cancel';
 el.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">stop_circle</span>Stop Analysis';
  const state=$('#journal-ai-state');if(state){state.hidden=false;state.querySelector('span:last-child').textContent='Analysing partner message...';}
 invalidateJournalSuggestions();
 try{
  const suggestion=await request('/api/partners/'+encodeURIComponent(p.id)+'/activity/analyse',{method:'POST',body:JSON.stringify({type,text}),signal:run.controller.signal});
  if(run.stopped||$('#dialog-form')!==form||$('#journal-type')?.value!==type||$('#journal-text')?.value?.trim()!==text)return;
  journalSuggestion={partnerId:p.id,type,text,suggestion};
  showJournalAISuggestion(suggestion,p.status);
 }catch(error){
  if(!run.stopped&&error.name!=='AbortError')notice(error.message,'error');
 }finally{
  if(journalAnalysisRun===run&&!run.stopped){
   journalAnalysisRun=null;
   resetJournalAnalysisButton(el);
  }
 }
}
function applyJournalSuggestion(){
 const j=journalSuggestion;
 if(!j||j.type!==$('#journal-type')?.value||j.text!==$('#journal-text')?.value?.trim()){
  invalidateJournalSuggestions();notice('The message has changed. Analyse again for new suggestions.','error');return;
 }
 const fields=[['outcome','#journal-outcome'],['stage','#journal-stage'],['nextAction','#journal-next'],['followUpDate','#journal-due'],['contactPerson','#journal-contact']];
 for(const [key,id] of fields)if(j.suggestion[key]){
  const field=$(id);
  if(field?.options&&!Array.from(field.options).some(opt=>opt.value===j.suggestion[key])){
   notice('The suggested '+key+' is not available. Refresh the page and try again.','error');
   return;
  }
 }
 for(const [key,id] of fields)if(j.suggestion[key]){
  const field=$(id);if(field)field.value=j.suggestion[key];
 }
 const result=$('#journal-ai-result');if(result)result.hidden=true;
 journalSuggestion=null;notice('Suggestions applied. Review the fields and save when ready.');
}
function staffActivity(id){
 const pid=qs.get('partner');
 const a=(data.partnerActivity||[]).find(x=>x.id===id&&x.partnerId===pid&&!x.deletedAt);
 if(a)return {...a,recordKind:'activity'};
 const o=(data.outreach||[]).find(x=>x.id===id&&x.partnerId===pid&&x.sent);
 if(o)return {...o,type:'outreach',recordKind:'outreach'};
 const h=(data.handovers||[]).find(x=>x.id===id&&x.partnerId===pid);
 if(h)return {...h,type:'handover',recordKind:'handovers'};
 return null;
}
function editHistoryRecord(a){
 const kind=a.recordKind;
 const path='/api/partners/'+encodeURIComponent(a.partnerId)+'/'+(kind==='activity'?'activity':kind)+'/'+encodeURIComponent(a.id);
 const field=(label,key,value,type='text')=>`<div class="co-field"><label for="historical-${key}">${label}</label>${type==='textarea'?`<textarea name="${key}" id="historical-${key}" rows="5">${esc(value||'')}</textarea>`:`<input id="historical-${key}" name="${key}" type="${type}" value="${esc(value??'')}">`}</div>`;
 let title='Correct History Entry',parts='',help='';
 if(kind==='outreach'){
  title='Correct Recorded Email';parts=field('Subject','subject',a.subject)+field('Recipient Email','recipientEmail',a.recipientEmail||'')+field('Email Body','body',a.body,'textarea');
  help='Corrects the saved record only. An externally sent email cannot be changed.';
 }else if(kind==='handovers'){
  title='Correct Handover';parts=field('Date','date',a.date,'date')+field('Time','time',a.time,'time')+field('Amount (kg)','kg',a.kg,'number')+field('Notes','notes',a.notes,'textarea')+handoverArrangementFields(partner(a.partnerId),a);
  help='Changes to this amount affect recorded grounds transferred.';
 }else{
  const d=a.date||new Date(a.at).toLocaleDateString('sv-SE',{timeZone:'Asia/Singapore'});
  parts=field('Date','date',d,'date')+field('Description','text',a.text,'textarea');
  help='The historical description changes, not the current relationship stage.';
 }
 dialog(title,`<div class="co-journal-modal">${parts}</div>`,async values=>{
  await request(path,{method:'PATCH',body:JSON.stringify(values)});
 },{partnerEditor:true,submitLabel:'Save Correction',onComplete:async()=>{await refresh();notice('History corrected.');}});
}
function editLoggedActivity(activity){
 if(!activity)return;
 if(activity.recordKind!=='activity'||['stage','update','outreach'].includes(activity.type))return editHistoryRecord(activity);
 const activityDate=activity.date||new Date(activity.occurredAt||activity.at).toLocaleDateString('sv-SE',{timeZone:'Asia/Singapore'});
 const typeValue=activity.type==='email'?(activity.emailDirection==='sent'?'email-sent':activity.emailDirection==='received'?'email':'email-unknown'):activity.type;
 const options=[['email','Email Received'],['email-sent','Email Sent'],['email-unknown','Email (Direction Not Recorded)'],['call','Phone Call'],['text','Text / WhatsApp'],['meeting','Meeting'],['site-visit','Site Visit'],['other','Other'],['response','Response'],['note','Note'],['follow-up','Follow-Up']];
 const fieldOptions=options.map(([value,title])=>`<option value="${value}" ${typeValue===value?'selected':''}>${title}</option>`).join('');
 const outcomes=Object.entries(ACTIVITY_OUTCOME_LABELS).map(([value,title])=>`<option value="${esc(value)}" ${(activity.outcome||'none')===value?'selected':''}>${esc(title)}</option>`).join('');
 const body=`<div class="co-journal-modal"><div class="co-field-row"><div class="co-field"><label for="edit-activity-type">Type</label><select id="edit-activity-type" name="type">${fieldOptions}</select></div><div class="co-field"><label for="edit-activity-date">Date <span class="co-required">*</span></label><input id="edit-activity-date" name="date" type="date" value="${esc(activityDate)}" required></div></div><div class="co-field-row"><div class="co-field"><label for="edit-activity-contact">Contact Person</label><input id="edit-activity-contact" name="contactPerson" value="${esc(activity.contactPerson||'')}"></div><div class="co-field"><label for="edit-activity-outcome">Outcome</label><select id="edit-activity-outcome" name="outcome">${outcomes}</select></div></div><div class="co-field"><label for="edit-activity-text">Message / Notes <span class="co-required">*</span></label><textarea id="edit-activity-text" name="text" rows="6" required>${esc(activity.text)}</textarea></div><div class="co-field-row"><div class="co-field"><label for="edit-activity-next">Next Action (as recorded)</label><input id="edit-activity-next" name="nextAction" value="${esc(activity.nextAction||'')}"></div><div class="co-field"><label for="edit-activity-due">Follow-Up Date (as recorded)</label><input id="edit-activity-due" name="followUpDate" type="date" value="${esc(activity.followUpDate||'')}"></div></div></div>`;
 dialog('Edit Activity',body,async values=>{
  const type=['email-sent','email-unknown'].includes(values.type)?'email':values.type;
  await request('/api/partners/'+encodeURIComponent(activity.partnerId)+'/activity/'+encodeURIComponent(activity.id),{method:'PATCH',body:JSON.stringify({...values,type,emailDirection:type==='email'?(values.type==='email-sent'?'sent':values.type==='email'?'received':''):''})});
 },{partnerEditor:true,submitLabel:'Save Activity',onComplete:async()=>{await refresh();notice('Activity updated.');}});
}
function deleteLoggedActivity(activity){
 if(!activity)return;
 const body=`<p class="co-confirm-copy">${esc(activity.recordKind==='handovers'?'Remove this handover from history and transfer totals?':activity.recordKind==='outreach'?'Remove this recorded email from history? It will not unsend an email.':'Remove this history entry? The partner’s current stage and follow-up settings will not change.')} The removed record is retained internally for corrections.</p>`;
 dialog('Delete Activity',body,async()=>{
  await request('/api/partners/'+encodeURIComponent(activity.partnerId)+'/'+(activity.recordKind==='activity'?'activity':activity.recordKind)+'/'+encodeURIComponent(activity.id),{method:'DELETE'});
 },{confirmation:true,submitLabel:'Delete Activity',onComplete:async()=>{await refresh();notice('Activity deleted.');}});
}
function handoverArrangementFields(p,record=null){
 const choices=(title,key,options,selected)=>`<div class="co-field"><label for="ho-${key}">${title}</label><select id="ho-${key}" name="${key}">${options.map(([v,t])=>`<option value="${v}" ${selected===v?'selected':''}>${t}</option>`).join('')}</select></div>`;
 const transports=[['',record?'Keep Recorded':p.transportArrangement&&p.transportArrangement!=='unknown'?'As Arranged':'Not Recorded'],...(record?[['arranged','Partner Arrangement']]:[]),['partner-collects','Partner Collects'],['coffeebot-delivers','CoffeeBot Delivers'],['either','Flexible / Either']];
 const conditions=[['',record?'Keep Recorded':p.groundsAccepted&&p.groundsAccepted!=='unknown'?'As Arranged':'Not Recorded'],...(record?[['arranged','Partner Arrangement']]:[]),['dry','Dried Grounds'],['wet','Wet Grounds'],['either','Either']];
 const labels={unknown:'Not Discussed','partner-collects':'Partner Collects','coffeebot-delivers':'CoffeeBot Delivers',either:'Either',dry:'Dried Grounds',wet:'Wet Grounds'};
 const current=[p.transportArrangement&&p.transportArrangement!=='unknown'?labels[p.transportArrangement]:null,p.groundsAccepted&&p.groundsAccepted!=='unknown'?labels[p.groundsAccepted]:null].filter(Boolean);const summary=current.length?`<div class="co-arrangement-summary"><strong>Partner Arrangement</strong><span>${current.join(' · ')}</span></div>`:'';
 return summary+`<details class="co-handover-exceptions" ${record?.transportException||record?.groundsException?'open':''}><summary>Change For This Handover</summary><div class="co-field-row">${choices('Collection / Delivery','transportArrangement',transports,record?.transportException?record.transportArrangement:'')}${choices('Grounds Condition','groundsCondition',conditions,record?.groundsException?record.groundsCondition:'')}</div></details>`;
}
function openHandoverPicker(){
 const partners=data.partners.filter(p=>['contacted','interested','trial','regular'].includes(p.status)).sort((a,b)=>a.name.localeCompare(b.name));
 if(!partners.length){notice('No active partners available.','error');return;}
 const html='<div class="co-field"><label for="handover-search">Partner <span class="co-required">*</span></label><input id="handover-search" type="search" role="combobox" aria-autocomplete="list" aria-controls="handover-matches" aria-expanded="false" autocomplete="off" placeholder="Search Partners" required><div id="handover-matches" class="co-handover-matches" role="listbox" hidden></div></div>';
 let selected=null,matches=[],active=0;
 dialog('Log Handover',html,async()=>{if(!selected)throw Error('Select a partner from the list');},{partnerEditor:true,submitLabel:'Continue',onComplete:()=>openHandoverDialog(selected)});
 const input=$('#handover-search'),results=$('#handover-matches');
 const hide=()=>{results.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
 const draw=()=>{
  matches=partners.filter(p=>p.name.toLowerCase().includes(input.value.trim().toLowerCase())).slice(0,8);
  active=Math.max(0,Math.min(active,matches.length-1));
  results.innerHTML=matches.length?matches.map((p,i)=>'<button type="button" id="handover-option-'+i+'" class="co-handover-option'+(i===active?' is-active':'')+'" role="option" aria-selected="'+(i===active)+'" data-id="'+esc(p.id)+'"><span>'+esc(p.name)+'</span><small>'+stageLabel(p.status)+'</small></button>').join(''):'<div class="co-handover-empty">No matching partners</div>';
  results.hidden=false;input.setAttribute('aria-expanded','true');
  if(matches.length)input.setAttribute('aria-activedescendant','handover-option-'+active);
  else input.removeAttribute('aria-activedescendant');
 };
 const choose=p=>{selected=p;input.value=p.name;hide();};
 input.addEventListener('focus',()=>{if(!selected)draw();});
 input.addEventListener('input',()=>{selected=null;active=0;draw();});
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(!results.hidden){e.preventDefault();hide();}return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(results.hidden){active=0;draw();}else if(matches.length){active=(active+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;draw();}return;}
  if(e.key==='Enter'&&!results.hidden){e.preventDefault();if(matches[active])choose(matches[active]);return;}
  if(e.key==='Tab')hide();
 });
 results.addEventListener('click',e=>{const item=e.target.closest('[data-id]');if(item){const p=matches.find(x=>x.id===item.dataset.id);if(p)choose(p);}});
}
function openHandoverDialog(p){
 if(!p)return;
 const html=`<div class="co-journal-modal"><div class="co-field-row"><div class="co-field"><label for="ho-date">Date <span class="co-required">*</span></label><input id="ho-date" name="date" type="date" value="${journalDate()}" required></div><div class="co-field"><label for="ho-time">Time</label><input id="ho-time" name="time" type="time"></div></div><div class="co-field"><label for="ho-kg">Amount (kg) <span class="co-required">*</span></label><input id="ho-kg" name="kg" type="number" min="0.01" step="any" required placeholder="e.g. 5"></div>${handoverArrangementFields(p)}<div class="co-field"><label for="ho-notes">Notes</label><textarea id="ho-notes" name="notes" rows="3"></textarea></div></div>`;
 dialog('Record Handover',html,async values=>{
  await request('/api/handovers',{method:'POST',body:JSON.stringify({...values,partnerId:p.id})});
 },{partnerEditor:true,submitLabel:'Save Handover',initialFocus:'close',onComplete:async()=>{await refresh();notice('Handover recorded.');}});
}

async function saveRelationshipStage(el){
 const id=el.dataset.id,p=partner(id),stage=$('#relationship-stage')?.value;
 if(!p||!stage||p.status===stage){notice('Stage is already up to date.');return;}
 if(stage==='closed'){
  const choices=[['','Select Reason'],['declined','Declined'],['unresponsive','No Response'],['unsuitable','Not Suitable'],['logistics','Logistics'],['other','Other']];
  const fields='<div class="co-field"><label for="close-reason">Reason *</label><select id="close-reason" name="closeReason" required>'+choices.map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></div><div class="co-field"><label for="close-notes">Additional Notes</label><textarea id="close-notes" name="closeNotes" rows="2"></textarea></div>';
  dialog('Close Relationship',fields,async values=>request('/api/partners/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:'closed',...values})}),{partnerEditor:true,submitLabel:'Close Relationship',onComplete:()=>{location.href='/manage-partners';}});return;
 }
 el.disabled=true;
 try{
  await request('/api/partners/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:stage})});
  await refresh();
  if(stage==='suggested')location.href='/find-partners';else if(stage==='closed')location.href='/manage-partners';
  notice('Stage updated.');
 }catch(err){notice(err.message,'error');el.disabled=false;}
}
const controlBind = new WeakSet();
function bindControls(){
 // The week dashboard is built separately to keep Stitch's navigation shell intact.
 if(current==='dashboard')$('#view').innerHTML=weekBody();
 $('#sort-filter')?.addEventListener('change',e=>{ui.sort=e.target.value;ui.page=1;render()});
 $('#ai-assessed-filter')?.addEventListener('change',e=>{ui.aiAssessedOnly=e.target.checked;ui.page=1;render()});
  $('#contactable-first-filter')?.addEventListener('change',e=>{ui.contactableFirst=e.target.checked;ui.page=1;render()});
  $('#category-filter')?.addEventListener('change',e=>{ui.category=e.target.value;ui.page=1;render()});
 $('#search-filter')?.addEventListener('input',e=>{ui.search=e.target.value;ui.page=1;const pos=e.target.selectionStart;render();const x=$('#search-filter');x.focus();x.setSelectionRange(pos,pos);});
  $('#draft-partner-search')?.addEventListener('focus',e=>{ui.draftOptionIndex=0;draftOptions('');e.target.select();});
  $('#draft-partner-search')?.addEventListener('input',e=>{ui.draftOptionIndex=0;draftOptions(e.target.value);});
  $('#draft-partner-search')?.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();closeDraftOptions();return;}
   if(e.key==='Tab'){closeDraftOptions();return;}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();const input=$('#draft-partner-search'),open=$('#draft-partner-options')?.hidden===false;
    if(!open){ui.draftOptionIndex=0;draftOptions('');return;}
    const n=draftCandidates(ui.draftSearchQuery||'').length;
    if(n){ui.draftOptionIndex=(ui.draftOptionIndex+(e.key==='ArrowDown'?1:-1)+n)%n;draftOptions(ui.draftSearchQuery||'');$('#draft-option-'+ui.draftOptionIndex)?.scrollIntoView?.({block:'nearest'});}
   }
   if(e.key==='Enter'){
    e.preventDefault();const options=$('#draft-partner-options');
    if(options?.hidden){draftOptions('');return;}
    const id=draftCandidates(ui.draftSearchQuery||'')[ui.draftOptionIndex]?.id;
    if(id)chooseDraftPartner(id);
   }
  });
 $('#manage-stage')?.addEventListener('change',e=>{ui.manageStage=e.target.value;ui.managePage=1;render()});
 $('#manage-sort')?.addEventListener('change',e=>{ui.manageSort=e.target.value;ui.managePage=1;render()});
 $('#manage-category')?.addEventListener('change',e=>{ui.manageCategory=e.target.value;ui.managePage=1;render()});
 $('#manage-search')?.addEventListener('input',e=>{ui.manageSearch=e.target.value;ui.managePage=1;const pos=e.target.selectionStart;render();const field=$('#manage-search');field?.focus();field?.setSelectionRange(pos,pos)});
 $('#partner-page-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(e.target.dataset.activeTab!=='edit')return;
  const save=e.target.querySelector('[type="submit"]');if(save)save.disabled=true;
  const p=partner(qs.get('partner'));if(!p)return;
  const f=Object.fromEntries(new FormData(e.target));
  try{
   await request('/api/partners/'+encodeURIComponent(p.id),{method:'PATCH',body:JSON.stringify({...f,capacityKg:f.capacityKg===''?null:Number(f.capacityKg)})});
   await refresh();notice('Partner updated.');
  }catch(err){notice(err.message,'error');if(save)save.disabled=false;}
 });

}
function formField(label,name,value='',type='text',options=null){return `<div class="co-field"><label for="f-${name}">${esc(label)}</label>${options?`<select name="${name}" id="f-${name}">${options.map(([v,t])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`).join('')}</select>`:`<input id="f-${name}" name="${name}" type="${type}" ${type==='number'?'min="0" step="any"':''} value="${esc(value??'')}">`}</div>`;}
let modalOverflow=null;
function closeDialog(){
 journalSuggestion=null;
 if(journalAnalysisRun)void cancelJournalAnalysis({quiet:true});
 $('.co-dialog-back')?.remove();
 if(!modalOverflow)return;
 if(document.body?.style)document.body.style.overflow=modalOverflow.body;
 if(document.documentElement?.style)document.documentElement.style.overflow=modalOverflow.html;
 modalOverflow=null;
}
function dialog(title,body,onSubmit,{partnerEditor=false,confirmation=false,onComplete=null,submitLabel=null,initialFocus='first-field'}={}){
 closeDialog();
 modalOverflow={body:document.body?.style?.overflow||'',html:document.documentElement?.style?.overflow||''};
 if(document.body?.style)document.body.style.overflow='hidden';
 if(document.documentElement?.style)document.documentElement.style.overflow='hidden';
 const wrap=document.createElement('div');
 wrap.className='co-dialog-back';
 wrap.innerHTML=`<div class="co-dialog ${partnerEditor?'co-dialog-partner':confirmation?'co-dialog-confirm':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="co-dialog-titlebar"><h2>${esc(title)}</h2><button type="button" class="co-dialog-close" data-action="close-dialog" aria-label="Close ${esc(title)}"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></div><form id="dialog-form" class="co-dialog-form" autocomplete="off"><div class="co-dialog-scroll">${body}</div><div class="co-foot co-dialog-footer"><button class="co-button alt" type="button" data-action="close-dialog">Cancel</button><button class="co-button" type="submit">${submitLabel||(confirmation?'Record Sent':partnerEditor?'Save Partner':'Save Changes')}</button></div></form></div>`;
 document.body.append(wrap);
 wrap.addEventListener('click',e=>{if(e.target===wrap)closeDialog();});
 $('#dialog-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const submit=e.target.querySelector('[type="submit"]');
  if(submit)submit.disabled=true;
  try{
   await onSubmit(Object.fromEntries(new FormData(e.target)));
   closeDialog();if(onComplete)await onComplete();else{await refresh();notice('Saved.');}
  }catch(err){notice(err.message,'error');if(submit)submit.disabled=false;}
 });
 if(initialFocus==='close')wrap.querySelector('.co-dialog-close')?.focus?.();
 else if(partnerEditor)wrap.querySelector('#f-name,[name="text"],[name="date"],input,select,textarea')?.focus?.();
}
function partnerFormFields(v,{includeStage=false}={}){
 const categories=['community garden','urban farm','crop farm','mixed crop/aquaculture farm','park','public park','garden','school garden','school programme','organic waste recycler','composting','nursery','zoo','business','other'];
 // Preserve any sourced category the dropdown does not explicitly list.
 if(v.category&&!categories.includes(v.category))categories.push(v.category);
 const stages=[['suggested','Suggested'],['contacted','Contacted'],['interested','Interested'],['trial','Pilot'],['regular','Regular'],['closed','Closed']];
 const field=(label,key,val='',type='text',options=null,required=false,optional=false)=>{
  const labelText=esc(label)+(required?' <span class="co-required" aria-label="required">*</span>':'');
  const id='f-'+key,req=required?'required':'';
  const control=options
   ?`<select id="${id}" name="${key}" ${req} autocomplete="off">${options.map(([value,caption])=>`<option value="${esc(value)}" ${value===val?'selected':''}>${esc(caption)}</option>`).join('')}</select>`
   :type==='textarea'
    ?`<textarea id="${id}" name="${key}" rows="3" ${req} autocomplete="off">${esc(val??'')}</textarea>`
    :`<input id="${id}" name="${key}" type="${type}" ${req} autocomplete="off" ${type==='number'?'min="0" step="any"':''} value="${esc(val??'')}">`;
  return `<div class="co-field"><label for="${id}">${labelText}</label>${control}</div>`;
 };
 const section=(id,icon,title,content)=>`<section class="co-partner-form-section" aria-labelledby="section-${id}"><div class="co-partner-section-title"><span class="material-symbols-outlined" aria-hidden="true">${icon}</span><h3 id="section-${id}">${title}</h3></div><div class="co-partner-fields">${content}</div></section>`;
 const details=field('Name','name',v.name,'text',null,true)+
  (includeStage
   ?`<div class="co-field-row">${field('Type','category',v.category,'text',categories.map(x=>[x,titleCase(x)]),true)}${field('Stage','status',v.status,'text',stages.filter(([v])=>v!=='closed'),true)}</div>`
   :field('Type','category',v.category,'text',categories.map(x=>[x,titleCase(x)]),true))+
  `<div class="co-field-row">${field('Contact / Decision-Maker','contactName',v.contactName)}${field('Contact Email','contactEmail',v.contactEmail,'email',null,false,true)}</div>`+
  field('Location / Collection Area','location',v.location);
 const reuse=field('Potential Use','use',v.use,'textarea')+field('Agreed Use','agreedUse',v.agreedUse,'textarea')+
   `<div class="co-field-row">${field('Collection / Delivery','transportArrangement',v.transportArrangement||'unknown','text',[['unknown','Not Discussed'],['partner-collects','Partner Collects'],['coffeebot-delivers','CoffeeBot Delivers'],['either','Flexible / Either']])}${field('Grounds Condition','groundsAccepted',v.groundsAccepted||'unknown','text',[['unknown','Not Discussed'],['dry','Dried Grounds'],['wet','Wet Grounds'],['either','Either']])}</div>`+
  `<div class="co-field-row">${field('Frequency','frequency',v.frequency&&String(v.frequency).toLowerCase()!=='unknown'?titleCase(v.frequency):'')}${field('Weekly Capacity (kg)','capacityKg',v.capacityKg,'number')}</div>`+
  field('Notes','notes',v.notes,'textarea')+
   (v.source&& !['Staff-entered lead','Fictional Stitch scenario'].includes(v.source)
   ?`<details class="co-source-evidence"><summary>Public Source Evidence</summary><p><strong>${esc(v.source)}</strong>${v.sourceUrl&&/^https:\/\//.test(v.sourceUrl)?` · <a href="${esc(v.sourceUrl)}" target="_blank" rel="noopener noreferrer">View Source</a>`:''}</p><p>${esc(v.materialEvidence||v.evidenceEntries?.map(e=>e.claim).filter(Boolean).join('; ')||'No Source Details')}</p></details>`:'');
 return section('partner','storefront','Partner Details',details)+section('grounds','eco','Grounds Arrangement',reuse);
}
function editPartner(p){
 const v=p||{name:'',category:'community garden',status:'contacted',capacityKg:'',use:'',location:'',frequency:'',contactName:'',contactEmail:'',notes:''};
 dialog(p?'Edit Partner':'Add Partner',partnerFormFields(v,{includeStage:!p}),async f=>{
  f.capacityKg=f.capacityKg===''?null:Number(f.capacityKg);
  return request(p?`/api/partners/${encodeURIComponent(p.id)}`:'/api/partners',{method:p?'PATCH':'POST',body:JSON.stringify(f)});
 },{partnerEditor:true});
}
function toggleListingDetails(card){
 const details=card?.querySelector('.co-candidate-details');
 if(!details)return;
 details.open=!details.open;
 card.setAttribute('aria-expanded',String(details.open));
}
async function handleAction(el){const action=el.dataset.action;
 if(action==='close-dialog'){closeDialog();return;}
 if(action==='handover-select'){openHandoverPicker();return;}
 if(action==='new'){editPartner();return;}
 if(action==='manage-clear-stage'){ui.manageStage='active';ui.managePage=1;render();return;}
 if(action==='manage-stage-pick'){ui.manageStage=ui.manageStage===el.dataset.stage?'active':el.dataset.stage;ui.managePage=1;render();return;}

 if(action==='manage-tab'){switchManageTab(el.dataset.tab);return;}
 if(action==='manage-log-open'){openJournalDialog(partner(qs.get('partner')));return;}
 if(action==='manage-activity-edit'){editLoggedActivity(staffActivity(el.dataset.id));return;}
 if(action==='manage-activity-delete'){deleteLoggedActivity(staffActivity(el.dataset.id));return;}
 if(action==='manage-ai-analyse'){await analyseJournalMessage(el);return;}
 if(action==='manage-ai-cancel'){await cancelJournalAnalysis();return;}
 if(action==='manage-ai-apply'){applyJournalSuggestion();return;}
 if(action==='manage-ai-dismiss'){invalidateJournalSuggestions();return;}
 if(action==='manage-handover-open'){openHandoverDialog(partner(el.dataset.id||qs.get('partner')));return;}
 if(action==='manage-reset-edit'){ui.partnerTab='relationship';render();return;}
 if(action==='manage-stage-save'){await saveRelationshipStage(el);return;}
 if(action==='manage-show-older'){document.querySelectorAll('.co-journal-item[hidden]').forEach(item=>item.hidden=false);el.remove();return;}
 if(action==='manage-page'){ui.managePage=Math.max(1,Number(el.dataset.page)||1);render();return;}
 if(action==='page'){ui.page=Math.max(1,Number(el.dataset.page)||1);render();$('#discovery-results')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(action==='edit'){editPartner(partner(el.dataset.id));return;}
 if(action==='settings'){const settings=data.settings;const ref=data.sponsorReference;const refHtml=ref?'<details class="co-source-evidence"><summary>CoffeeBot Reference Volumes</summary><p>Estimated total beverages per month:</p><p>'+ref.locations.map(x=>esc(x.location)+': '+m(x.minCups)+(x.maxCups!==x.minCups?'–'+m(x.maxCups):'')).join(' · ')+'</p></details>':'';const html=`<div class="co-field-row">${formField('Total Beverages per Week','cupsPerWeek',settings.cupsPerWeek,'number')}${formField('Coffee-Based Beverages (%)','coffeeSharePercent',settings.coffeeSharePercent??60,'number')}</div>${formField('Grounds per Coffee (g)','gramsPerCup',settings.gramsPerCup,'number')}${refHtml}`;dialog('Edit Forecast',html,async f=>request('/api/settings',{method:'PATCH',body:JSON.stringify(f)}));return;}

 if(action==='assessment-settings'){
  const w=data.settings.ratingWeights||{suitability:30,evidence:30,proximity:5,operations:35};
  const weightRows=[
   ['Reuse Suitability','weightSuitability',w.suitability],
   ['Source Evidence','weightEvidence',w.evidence],
   ['HQ Proximity','weightProximity',w.proximity],
   ['Intake & Operations','weightOperations',w.operations]
  ];
  const rows=weightRows.map(([label,key,value])=>`<div class="co-assessment-weight-row"><label for="f-${key}">${label}</label><div class="co-assessment-weight-input"><input id="f-${key}" name="${key}" type="number" min="0" max="100" step="1" value="${esc(value)}" aria-describedby="assessment-weight-total"><span>%</span></div></div>`).join('');
  const html=`<div class="co-assessment-weight-list">${rows}<div class="co-assessment-total"><strong>Total</strong><output id="assessment-weight-total" aria-live="polite">100/100%</output></div></div>`+
   '<div class="co-assessment-reset"><button type="button" class="co-button alt small" id="reset-assessment-settings">Reset to Default Settings</button></div>';
  dialog('Assessment Settings',html,async f=>{
   const weights={suitability:Number(f.weightSuitability),evidence:Number(f.weightEvidence),proximity:Number(f.weightProximity),operations:Number(f.weightOperations)};
   if(Object.values(weights).some(v=>!Number.isInteger(v)||v<0||v>100)||Object.values(weights).reduce((a,b)=>a+b,0)!==100)
    throw Error('Rating weights must be whole percentages adding up to 100.');
   return request('/api/settings',{method:'PATCH',body:JSON.stringify({ratingWeights:weights})});
  });
  const updateWeightTotal=()=>{
   const total=['Suitability','Evidence','Proximity','Operations'].reduce((sum,key)=>sum+Number($('#f-weight'+key)?.value||0),0);
   const output=$('#assessment-weight-total');if(output){output.value=total+'/100%';output.textContent=total+'/100%';output.classList.toggle('co-invalid',total!==100);}
  };
  for(const key of ['Suitability','Evidence','Proximity','Operations'])$('#f-weight'+key)?.addEventListener('input',updateWeightTotal);
  updateWeightTotal();
  $('#reset-assessment-settings')?.addEventListener('click',()=>{
   const defaults={weightSuitability:30,weightEvidence:30,weightProximity:5,weightOperations:35};
   for(const [name,value] of Object.entries(defaults))$('#f-'+name).value=value;
   updateWeightTotal();
  });
  return;
 }   if(action==='research-contact'){
   const p=partner(el.dataset.id);if(!p)return;
   const webSearch='https://www.google.com/search?q='+encodeURIComponent(p.name+' official contact Singapore');
   const html='<div class="co-field"><label for="contact-website">Organisation Website <span class="co-required" aria-label="required">*</span></label><input id="contact-website" name="websiteUrl" type="url" placeholder="https://example.org" value="'+esc(p.websiteUrl||'')+'" required autocomplete="off"></div><p class="co-note">Only published contact details are saved; contact does not imply acceptance.</p><a href="'+esc(webSearch)+'" target="_blank" rel="noopener noreferrer">Search for the organisation’s website ↗</a>';
   let result=null;
   dialog('Research Contact',html,async f=>{result=await request('/api/partners/'+encodeURIComponent(p.id)+'/research-contact',{method:'POST',body:JSON.stringify({websiteUrl:f.websiteUrl})});},{submitLabel:'Research Contact',onComplete:async()=>{await refresh();notice(result?.result==='email-found'?'Published email found.':result?.result==='contact-page'?'Contact page found.':result?.result==='unavailable'?'The website could not be checked. Try again or search the web.':'No public contact found on the checked pages.');}});
   return;
  }
  if(action==='ai-review'){
  const id=el.dataset.id,p=partner(id);
  if(!p||ui.reviewingId)return;
  if(p.aiAssessment&&!confirm('Re-review '+p.name+' with AI? This will use another AI call and replace its existing AI assessment.'))return;
  ui.reviewingId=id;render();
  try{
   await request('/api/partners/'+encodeURIComponent(id)+'/ai-review',{method:'POST',body:'{}'});
   await refresh();
   notice('AI review complete.');
  }catch(err){notice(err.message,'error');}
  finally{ui.reviewingId=null;render();}
  return;
 }
 if(action==='stop-discovery'){
   if(ui.discoveryStopping)return;
   ui.discoveryStopping=true;
   ui.discoveryStatus={...ui.discoveryStatus,phase:'Stopping',detail:'Discarding this run',stopping:true};
   render();
   try{
    await request('/api/discovery/stop',{method:'POST'});
    if(!ui.discoveryOwned){
     let tries=0;
     const statusPoll=setInterval(async()=>{
      try{
       const status=await request('/api/discovery-status');
       if(!status.active||++tries>=30){
        clearInterval(statusPoll);await refresh();
        notice(status.stopped?'Discovery stopped. No partner changes were saved.':'Discovery no longer running.');
       }
      }catch{if(++tries>=30)clearInterval(statusPoll);}
     },400);
    }else notice('Stopping discovery; this run will not be saved.');
   }
   catch(err){ui.discoveryStopping=false;notice(err.message,'error');await refresh();}
   return;
  }
  if(action==='discover'){
  ui.discoveryRunning=true;ui.discoveryStopping=false;ui.discoveryOwned=true;
  ui.discoveryStatus={phase:'Discovering Partners',detail:'Retrieving sources and matching locations',completed:0,total:4};
  render();
  const updateProgress=st=>{
   if(ui.discoveryStopping&&st.active&&!st.stopping)return;
    ui.discoveryStatus=st;
   const progress=discoveryViewProgress(st);
   const label=$('#discovery-phase'),bar=$('#discovery-bar'),count=$('#discovery-count'),detail=$('#discovery-detail');
   if(label)label.textContent=progress.phase;
   if(bar)bar.style.width=progress.percentage+'%';
   if(count)count.textContent=progress.label;
   if(detail)detail.textContent=progress.detail;
  };
  const poller=setInterval(async()=>{try{updateProgress(await request('/api/discovery-status'));}catch{}},750);
  try{
   const result=await request('/api/discover',{method:'POST'});
   updateProgress({phase:'Completed',completed:4,total:4,detail:''});
   await refresh();
   notice(result.added+' partners added · '+result.assessed+' assessed.');
  }catch(err){notice(ui.discoveryStopping||/Discovery stopped/i.test(err.message)?'Discovery stopped. No partner changes were saved.':err.message,ui.discoveryStopping||/Discovery stopped/i.test(err.message)?'ok':'error');}
  finally{clearInterval(poller);ui.discoveryOwned=false;ui.discoveryRunning=false;ui.discoveryStopping=false;ui.discoveryStatus=null;await refresh();}
  return;
 }
 if(action==='draft-toggle'){
   const options=$('#draft-partner-options');
   if(options?.hidden){ui.draftOptionIndex=0;draftOptions('');$('#draft-partner-search')?.focus();}
   else closeDraftOptions();
   return;
  }
  if(action==='draft-pick'){chooseDraftPartner(el.dataset.id);return;}
  if(action==='generate'){el.disabled=true;el.textContent='Preparing draft…';try{ui.draft=await request(qs.get('mode')==='followup'?'/api/draft/follow-up':'/api/draft',{method:'POST',body:JSON.stringify({partnerId:ui.selectedId})});render();notice('Draft prepared.');}catch(err){notice(err.message,'error');el.disabled=false;el.textContent='Generate draft';}return;}
 if(action==='record-sent'){
   const body=$('#draft-body')?.value?.trim()||'';
   if(!body){notice('Generate or enter the email body first.','error');return;}
   const recipientEmail=$('#draft-recipient')?.value?.trim()||'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)){notice('Enter the actual recipient email before recording sent outreach.','error');$('#draft-recipient')?.focus();return;}
   const partnerId=ui.selectedId;
   dialog('Confirm Record Sent',`<p class="co-confirm-copy">Record that an email to <strong>${esc(partner(partnerId)?.name||'this partner')}</strong> was sent using your email client? CoffeeBot saves this activity in the partner history but does not send emails.</p>`,async()=>{
    await request('/api/outreach/sent',{method:'POST',body:JSON.stringify({partnerId,body,recipientEmail,kind:qs.get('mode')==='followup'?'follow-up':'initial'})});
   },{confirmation:true,onComplete:()=>{location.href='/partner?partner='+encodeURIComponent(partnerId);}});
   return;
  }
  if(action==='copy-recipient'||action==='copy-subject'){
  const recipient=action==='copy-recipient';
  const value=(recipient?$('#draft-recipient')?.value:$('#draft-subject')?.value)||'';
  if(!value.trim()){notice('Nothing to copy yet.','error');return;}
  try{await navigator.clipboard.writeText(value);notice(recipient?'Recipient copied.':'Subject copied.');}
  catch{notice('Clipboard unavailable; select and copy manually.','error');}
  return;
 }
 if(action==='copy'){
   const subject=$('#draft-subject')?.value?.trim()||'';
   const body=$('#draft-body')?.value?.trim()||'';
   if(!body){notice('Generate or enter the email body first.','error');return;}
   try{await navigator.clipboard.writeText('Subject: '+subject+'\n\n'+body);notice('Email copied — not sent.');}
   catch{notice('Clipboard unavailable; select and copy manually.','error');}
   return;
  }
}
document.addEventListener('click',async e=>{
 if(!e.target.closest('.co-activity-menu'))document.querySelectorAll?.('.co-activity-menu[open]').forEach(m=>m.open=false);
 if(current==='outreach_draft'&&!e.target.closest('.co-partner-combobox'))closeDraftOptions();
 const action=e.target.closest('[data-action],[data-href]');
 if(action){
  if(action.dataset.href){location.href=action.dataset.href;return;}
  e.preventDefault();await handleAction(action);return;
 }
 const card=e.target.closest('.co-discovery-card[data-listing-id]');
 // Native summary toggling, links and controls remain independently usable.
 if(card&&!e.target.closest('a,button,input,select,textarea,details,summary'))toggleListingDetails(card);
});

// Keep the card accessible expanded state in sync with native summary clicks.
document.addEventListener('toggle',e=>{
 const details=e.target;
 if(!details.matches?.('.co-candidate-details'))return;
 details.closest('.co-discovery-card')?.setAttribute('aria-expanded',String(details.open));
},true);
document.addEventListener('keydown',e=>{
 if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&e.target.matches?.('[role="tab"][data-action="manage-tab"]')){
  e.preventDefault();
  const next=e.target.dataset.tab==='relationship'?'edit':'relationship';
  switchManageTab(next);
  $('#manage-tab-button-'+next)?.focus?.();
  return;
 }
 if((e.key==='Enter'||e.key===' ')&&e.target.matches('.co-discovery-card[data-listing-id]')){e.preventDefault();toggleListingDetails(e.target);}if(e.key==='Escape'){document.querySelectorAll?.('.co-activity-menu[open]').forEach(m=>m.open=false);closeDialog();}});
if(current==='outreach_draft'&&qs.get('mode')==='followup'){
 const d=document.querySelector('nav[aria-label="Main navigation"] a[data-path="find-partners"]');
 const m=document.querySelector('nav[aria-label="Main navigation"] a[data-path="manage-partners"]');
 if(d&&m){
  const active=['bg-primary-container','text-on-primary','font-semibold'];
  const idle=['text-on-surface-variant','hover:bg-surface-container-low','hover:text-on-surface'];
  d.classList.remove(...active);d.classList.add(...idle);d.removeAttribute('aria-current');
  m.classList.remove(...idle);m.classList.add(...active);m.setAttribute('aria-current','page');
 }
}
refresh().catch(err=>{$('#app-main').innerHTML=`<div class="co-page"><h1 class="co-title">Unable to load prototype</h1><p>${esc(err.message)}</p><p>Start the Node server with <code>npm start</code> from the repository root.</p></div>`});
