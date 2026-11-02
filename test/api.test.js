import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
const tmp=await mkdtemp(join(tmpdir(),'coffee-copilot-test-'));
process.env.DATA_FILE=join(tmp,'state.json');
process.env.AI_PROVIDER='template';
const {createApp}=await import('../server.js');
const server=createApp();server.listen(0,'127.0.0.1');await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
const call=async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
test.after(async()=>{server.close();await once(server,'close');await rm(tmp,{recursive:true,force:true});});
test('health and each HTML page loads',async()=>{
 const {data}=await call('/api/health');assert.equal(data.ok,true);
 for(const p of ['/dashboard','/this-week','/find-partners','/outreach','/pipeline','/manage-partners','/log-handover']){const r=await fetch(base+p);assert.equal(r.status,200);assert.match(await r.text(),/\/app.js/);}
});
test('forecast settings, partner arrangements and handovers persist without certification',async()=>{
 let state=(await call('/api/state')).data;assert.equal(state.metrics.gapKg,1.6);assert.equal(state.settings.coffeeSharePercent,60);assert.deepEqual(state.sponsorReference.monthlyTotalCups,{min:3600,max:4200});assert.equal(state.sponsorReference.locations.length,5);
 assert.equal((await call('/api/settings','PATCH',{coffeeSharePercent:101})).status,400);
 let r=await call('/api/settings','PATCH',{cupsPerWeek:10000});assert.equal(r.status,200);
 state=(await call('/api/state')).data;assert.equal(state.metrics.gapKg,83.5);
 r=await call('/api/partners','POST',{name:'Example Park Lead',category:'park',fee:'unknown'});assert.equal(r.status,201);const id=r.data.id;
 r=await call('/api/partners/'+id,'PATCH',{status:'regular',capacityKg:20,confirmed:true,verified:false});assert.equal(r.status,400);
 r=await call('/api/partners/'+id,'PATCH',{status:'regular',capacityKg:20,confirmed:true,verified:true});assert.equal(r.status,200);
 state=(await call('/api/state')).data;assert.equal(state.metrics.gapKg,63.5);
 r=await call('/api/handovers','POST',{partnerId:id,kg:8,date:'2026-10-16'});assert.equal(r.status,201);
 state=(await call('/api/state')).data;assert.equal(state.metrics.transferredKg,8);assert.equal(Object.hasOwn(state.metrics,'evidencedKg'),false);
 r=await call('/api/handovers','POST',{partnerId:id,kg:5,date:'2026-10-16'});assert.equal(r.status,201);
 r=await call('/api/settings','PATCH',{reportingCollectedKg:100});assert.equal(r.status,400);
 state=(await call('/api/state')).data;assert.equal(state.metrics.transferredKg,13);assert.equal(Object.hasOwn(state.metrics,'reuseRate'),false);
 r=await call('/api/handovers','POST',{partnerId:id,kg:1,date:'2026-10-16',confirmation:'reuse-confirmed'});assert.equal(r.status,400);
 assert.equal(JSON.parse(await readFile(process.env.DATA_FILE,'utf8')).handovers.length,2);
});
test('staff moving a Pilot partner to Regular updates demand without the hidden confirmed flag',async()=>{
 const before=(await call('/api/state')).data;
 const previous=before.partners.find(p=>p.id==='p4');
 const baseDemand=before.metrics.confirmedKg;
 const capacity=20;
 const promote=await call('/api/partners/p4','PATCH',{status:'regular',capacityKg:capacity});
 assert.equal(promote.status,200);
 assert.equal(promote.data.confirmed,false);
 const after=(await call('/api/state')).data;
 assert.equal(after.metrics.confirmedKg,baseDemand+capacity);
 assert.equal(after.metrics.gapKg,Math.max(0,after.metrics.forecastKg-baseDemand-capacity));
 const restore=await call('/api/partners/p4','PATCH',{status:previous.status,capacityKg:previous.capacityKg});
 assert.equal(restore.status,200);
 assert.equal((await call('/api/state')).data.metrics.confirmedKg,baseDemand);
});
test('handover time is optional and no reuse confirmation is stored',async()=>{
 const baseline=(await call('/api/state')).data.metrics.transferredKg;
 const created=await call('/api/partners','POST',{name:'Handover Test Partner',category:'urban farm'});
 assert.equal(created.status,201);
 const id=created.data.id;
 const first=await call('/api/handovers','POST',{partnerId:id,kg:8,date:'2026-10-18',time:'14:25',notes:'Collected by partner staff'});
 assert.equal(first.status,201);
 assert.equal(first.data.time,'14:25');
 assert.equal(Object.hasOwn(first.data,'confirmation'),false);
 assert.equal(first.data.notes,'Collected by partner staff');
 assert.ok(!Object.hasOwn(first.data,'intendedUse'),'Do not store an invented batch-level reuse purpose');
 const second=await call('/api/handovers','POST',{partnerId:id,kg:3,date:'2026-10-18'});
 assert.equal(second.status,201);
 assert.ok(!Object.hasOwn(second.data,'time'),'No invented time for unrecorded transfers');
 const invalid=await call('/api/handovers','POST',{partnerId:id,kg:3,date:'2026-10-18',time:'27:92'});
 assert.equal(invalid.status,400);
 const after=(await call('/api/state')).data;
 assert.equal(after.metrics.transferredKg,baseline+11,'Handovers track actual transferred mass only');
 assert.equal(after.handovers.filter(h=>h.partnerId===id).length,2);
});

test('draft fallback and explicit reset',async()=>{
 const id=(await call('/api/state')).data.partners[0].id;
 let r=await call('/api/draft','POST',{partnerId:id});assert.equal(r.status,200);assert.match(r.data.mode,/Template fallback/);
 r=await call('/api/reset-demo','POST');assert.equal(r.status,200);assert.equal((await call('/api/state')).data.metrics.forecastKg,8.1);
});

test('rating weights persist and server recalculates scores without AI',async()=>{
 const before=(await call('/api/state')).data;
 assert.deepEqual(before.settings.ratingWeights,{suitability:40,evidence:25,intake:20,proximity:15});
 const original=before.ranked.find(p=>p.status==='trial');
 assert.equal((await call('/api/settings','PATCH',{ratingWeights:{suitability:40,evidence:25,intake:20,proximity:15}})).status,200);
 assert.equal((await call('/api/settings','PATCH',{ratingWeights:{suitability:40,evidence:25,intake:20,proximity:15,extra:0}})).status,400);
 const weights={suitability:20,evidence:20,intake:20,proximity:40};
 assert.equal((await call('/api/settings','PATCH',{ratingWeights:weights})).status,200);
 const after=(await call('/api/state')).data;
 assert.deepEqual(after.settings.ratingWeights,weights);
 const revised=after.ranked.find(p=>p.id===original.id);
 assert.deepEqual(revised.match.weights,weights);
 assert.notEqual(revised.match.score,original.match.score);
 assert.equal(revised.match.score,Object.values(revised.match.parts).reduce((sum,v)=>sum+v,0));
 assert.equal((await call('/api/settings','PATCH',{ratingWeights:{suitability:40,evidence:25,intake:20,proximity:15}})).status,200);
});
test('manual outreach and lifecycle keep durable activity records',async()=>{
 const id='p5';
 let draft=await call('/api/draft','POST',{partnerId:id});
 assert.equal(draft.status,200);
 assert.equal(draft.data.subject,'CoffeeBot | Spent Coffee Grounds Reuse Partnership');
 assert.match(draft.data.body,/compost|growing.media/i);
 const saved=await call('/api/outreach','POST',{partnerId:id,subject:'Custom',body:draft.data.body});
 assert.equal(saved.status,201);
 assert.equal(saved.data.subject,draft.data.subject);
 assert.equal(saved.data.sent,false);
 let state=(await call('/api/state')).data;
 assert.equal(state.outreach.find(x=>x.id===saved.data.id).sent,false);
 assert.equal((await call('/api/outreach/sent','POST',{partnerId:id,body:draft.data.body,recipientEmail:'staff@example.org'})).status,200);
 state=(await call('/api/state')).data;
 assert.equal(state.outreach.find(x=>x.id===saved.data.id).sent,true);
 assert.equal(state.outreach.find(x=>x.id===saved.data.id).body,draft.data.body);
 assert.equal(state.outreach.find(x=>x.id===saved.data.id).recipientEmail,'staff@example.org');
 const patch=await call('/api/partners/'+id,'PATCH',{status:'interested',responseStatus:'positive',nextAction:'Arrange trial',followUpDate:'2026-10-24'});
 assert.equal(patch.status,200);
 assert.equal(patch.data.nextAction,'Arrange trial');
 assert.equal((await call('/api/partners/'+id+'/activity','POST',{type:'response',text:'Partner requested a sample'})).status,201);
 assert.equal((await call('/api/partners/'+id+'/activity','POST',{type:'response',text:''})).status,400);
 assert.equal((await call('/api/partners/'+id,'PATCH',{responseStatus:'invented'})).status,400);
 assert.equal((await call('/api/partners/'+id,'PATCH',{status:'closed'})).status,400);
 assert.equal((await call('/api/partners/'+id,'PATCH',{status:'closed',closeReason:'declined'})).status,200);
 assert.equal((await call('/api/outreach/sent','POST',{partnerId:id})).status,400);
 state=(await call('/api/state')).data;
 assert.ok(state.partnerActivity.some(x=>x.partnerId===id&&x.type==='response'));
 assert.ok(state.partnerActivity.some(x=>x.partnerId===id&&x.text.includes('Closed')));
 assert.equal(state.partners.find(x=>x.id===id).closeReason,'declined');
 assert.equal(JSON.parse(await readFile(process.env.DATA_FILE,'utf8')).partnerActivity.length,state.partnerActivity.length);
});

test('closing a confirmed Regular partner clears capacity without erasing history',async()=>{
 const before=(await call('/api/state')).data;
 const prior=before.metrics.confirmedKg;
 assert.equal(before.partners.find(x=>x.id==='p1').confirmed,true);
 const result=await call('/api/partners/p1','PATCH',{status:'closed',closeReason:'declined'});
 assert.equal(result.status,200);
 assert.equal(result.data.confirmed,false);
 const after=(await call('/api/state')).data;
 assert.equal(after.metrics.confirmedKg,prior-3);
 assert.ok(after.partnerActivity.some(x=>x.partnerId==='p1'&&x.text.includes('Closed')));
});

test('Record Sent stores reviewed body even without a saved draft',async()=>{
 const created=await call('/api/partners','POST',{name:'Sample Community Garden',category:'community garden',status:'suggested'});
 assert.equal(created.status,201);
 const id=created.data.id;
 assert.equal((await call('/api/outreach/sent','POST',{partnerId:id})).status,400);
 assert.equal((await call('/api/outreach/sent','POST',{partnerId:id,body:'Written but recipient missing'})).status,400);
 assert.equal((await call('/api/outreach/sent','POST',{partnerId:id,body:'Email',recipientEmail:'not-an-email'})).status,400);
 const sent=await call('/api/outreach/sent','POST',{partnerId:id,body:'Reviewed outreach email sent externally.',recipientEmail:'staff@example.org'});
 assert.equal(sent.status,200);
 assert.equal(sent.data.outreach.subject,'CoffeeBot | Spent Coffee Grounds Reuse Partnership');
 assert.equal(sent.data.outreach.body,'Reviewed outreach email sent externally.');
 assert.equal(sent.data.outreach.sent,true);
 assert.ok(sent.data.outreach.sentAt);
 assert.equal(sent.data.partner.status,'contacted');
 assert.equal(sent.data.partner.responseStatus,'awaiting-reply');
 const state=(await call('/api/state')).data;
 assert.equal(state.outreach.filter(x=>x.partnerId===id).length,1);
 assert.equal(state.partnerActivity.filter(x=>x.partnerId===id&&x.type==='outreach').length,1);
});

test('returning a contacted partner to Suggested preserves the record and audit history',async()=>{
 const created=await call('/api/partners','POST',{name:'Accidental Contact Test',category:'organic waste recycler',status:'contacted'});
 assert.equal(created.status,201);
 const id=created.data.id;
 const before=(await call('/api/state')).data;
 const bee=before.outreach.filter(x=>x.sent).map(x=>x.id).sort();
 const patch=await call('/api/partners/'+id,'PATCH',{status:'suggested'});
 assert.equal(patch.status,200);
 assert.equal(patch.data.status,'suggested');
 const after=(await call('/api/state')).data;
 assert.equal(after.partners.find(x=>x.id===id).status,'suggested');
 assert.ok(after.ranked.some(x=>x.id===id&&x.status==='suggested'));
 assert.ok(after.partnerActivity.some(x=>x.partnerId===id&&x.text.includes('Stage: Contacted to Suggested')));
 assert.deepEqual(after.outreach.filter(x=>x.sent).map(x=>x.id).sort(),bee);
});

test('structured staff activity preserves historical contacts and only updates explicit relationship fields',async()=>{
 const created=await call('/api/partners','POST',{name:'Journal Test Garden',category:'community garden',status:'contacted',contactName:'Initial Contact'});
 assert.equal(created.status,201);
 const id=created.data.id;
 const event=await call('/api/partners/'+id+'/activity','POST',{type:'call',date:'2026-10-18',contactPerson:'Alternate Coordinator',outcome:'requested-information',text:'Coordinator requested additional material preparation information.',nextAction:'Send preparation details',followUpDate:'2026-10-24'});
 assert.equal(event.status,201);
 assert.equal(event.data.type,'call');
 assert.equal(event.data.date,'2026-10-18');
 assert.equal(event.data.contactPerson,'Alternate Coordinator');
 assert.equal(event.data.outcome,'requested-information');
 assert.equal(event.data.nextAction,'Send preparation details');
 let after=(await call('/api/state')).data;
 let p=after.partners.find(x=>x.id===id);
 assert.equal(p.status,'contacted'); // no automatic Interested promotion
 assert.equal(p.contactName,'Initial Contact'); // the interaction contact is historical
 assert.equal(p.responseStatus,created.data.responseStatus); // interaction outcome must not overwrite relationship-level legacy response
 assert.equal(p.nextAction,'Send preparation details');
 assert.equal(p.followUpDate,'2026-10-24');
 assert.equal((await call('/api/partners/'+id+'/activity','POST',{type:'meeting',date:'2026-10-18',text:'Discussed next steps.',stage:'interested',outcome:'none'})).status,201);
 after=(await call('/api/state')).data;p=after.partners.find(x=>x.id===id);
 assert.equal(p.status,'interested');
 assert.equal(p.responseStatus,created.data.responseStatus); // stage changes and no-outcome activities do not replace legacy response status // 'none' leaves prior outcome untouched
 assert.ok(after.partnerActivity.some(x=>x.partnerId===id&&x.stageFrom==='contacted'&&x.stageTo==='interested'));
 const count=after.partnerActivity.length;
 assert.equal((await call('/api/partners/'+id+'/activity','POST',{type:'call',date:'2026-02-30',text:'Invalid date'})).status,400);
 assert.equal((await call('/api/partners/'+id+'/activity','POST',{type:'call',date:'2026-10-18',text:'Invalid stage',stage:'invented'})).status,400);
 assert.equal((await call('/api/partners/'+id+'/activity','POST',{type:'call',date:'2026-10-18',text:'Invalid follow-up',followUpDate:'2026-02-30'})).status,400);
 assert.equal((await call('/api/partners/'+id+'/activity','POST',{type:'call',date:'2026-10-18',text:''})).status,400);
 assert.equal((await call('/api/state')).data.partnerActivity.length,count);
 const received=await call('/api/partners/'+id+'/activity','POST',{type:'email',emailDirection:'received',date:'2026-10-18',text:'We can discuss a pilot.'});
 assert.equal(received.status,201);
 assert.equal(received.data.emailDirection,'received');
 const sent=await call('/api/partners/'+id+'/activity','POST',{type:'email',emailDirection:'sent',date:'2026-10-18',text:'I sent the sample requirements.'});
 assert.equal(sent.status,201);
 assert.equal(sent.data.emailDirection,'sent');
 const legacy=await call('/api/partners/'+id+'/activity','POST',{type:'email',text:'Historical direction unspecified.'});
 assert.equal(legacy.status,201);
 assert.ok(!Object.hasOwn(legacy.data,'emailDirection'));
 assert.equal((await call('/api/partners/'+id+'/activity','POST',{type:'call',emailDirection:'received',text:'Incorrect direction on call'})).status,400);
});

test('editing the current contact automatically preserves the previous contact in history',async()=>{
 const created=await call('/api/partners','POST',{name:'Contact Change Journal Test',category:'urban farm',contactName:'First Coordinator',status:'contacted'});
 assert.equal(created.status,201);
 const id=created.data.id;
 const edited=await call('/api/partners/'+id,'PATCH',{contactName:'Operations Lead'});
 assert.equal(edited.status,200);
 const state=(await call('/api/state')).data;
 assert.equal(state.partners.find(x=>x.id===id).contactName,'Operations Lead');
 assert.ok(state.partnerActivity.some(x=>x.partnerId===id&&x.text.includes('Current contact: First Coordinator to Operations Lead')));
});

test('partner detail URL is served and retired handover route redirects without losing partner context',async()=>{
 const state=(await call('/api/state')).data;
 const id=state.partners[0].id;
 const detail=await fetch(base+'/partner?partner='+encodeURIComponent(id));
 assert.equal(detail.status,200);
 assert.match(await detail.text(),/\/app.js/);
 const old=await fetch(base+'/log-handover?partner='+encodeURIComponent(id),{redirect:'manual'});
 assert.equal(old.status,302);
 assert.equal(old.headers.get('location'),'/partner?partner='+encodeURIComponent(id));
 const bare=await fetch(base+'/log-handover',{redirect:'manual'});
 assert.equal(bare.status,302);
 assert.equal(bare.headers.get('location'),'/manage-partners');
});

test('stage audit entries use capitalised labels while statuses remain lowercase keys',async()=>{
 const created=await call('/api/partners','POST',{name:'Stage Label Case Test',category:'community garden',status:'contacted'});
 assert.equal(created.status,201);
 const id=created.data.id;
 assert.equal(created.data.status,'contacted');
 let state=(await call('/api/state')).data;
 assert.ok(state.partnerActivity.some(x=>x.partnerId===id&&x.text==='Added as Contacted'));
 const updated=await call('/api/partners/'+id,'PATCH',{status:'suggested'});
 assert.equal(updated.status,200);
 assert.equal(updated.data.status,'suggested');
 state=(await call('/api/state')).data;
 assert.ok(state.partnerActivity.some(x=>x.partnerId===id&&x.text==='Stage: Contacted to Suggested'));
});


test('partner logistics preferences, editable manual activity and grounded follow-up',async()=>{
 const created=await call('/api/partners','POST',{name:'Sustainable Gardens Team',category:'community garden',
  transportArrangement:'partner-collects',groundsAccepted:'dry',use:'Horticultural trials'});
 assert.equal(created.status,201);
 const id=created.data.id;
 assert.equal(created.data.transportArrangement,'partner-collects');
 assert.equal(created.data.groundsAccepted,'dry');
 assert.equal((await call('/api/partners/'+id,'PATCH',{transportArrangement:'coffeebot-delivers',groundsAccepted:'wet'})).status,200);
 assert.equal((await call('/api/partners/'+id,'PATCH',{transportArrangement:'teleport'})).status,400);
 const posted=await call('/api/partners/'+id+'/activity','POST',{type:'email',emailDirection:'received',date:'2026-10-18',text:'Could you clarify whether grounds are dried?',nextAction:'Reply to question',stage:'interested'});
 assert.equal(posted.status,201);
 assert.equal(posted.data.entrySource,'manual');
 let state=(await call('/api/state')).data;
 assert.equal(state.partners.find(p=>p.id===id).status,'interested');
 const updated=await call('/api/partners/'+id+'/activity/'+posted.data.id,'PATCH',{
  type:'email',emailDirection:'received',date:'2026-10-19',text:'Could you confirm drying before collection?',contactPerson:'Garden Coordinator',
  outcome:'requested-information',nextAction:'Confirm condition'});
 assert.equal(updated.status,200);
 assert.equal(updated.data.date,'2026-10-19');
 assert.equal(updated.data.text,'Could you confirm drying before collection?');
 assert.ok(updated.data.editedAt);
 assert.equal((await call('/api/partners/'+id+'/activity/'+posted.data.id,'PATCH',{date:'2026-02-30'})).status,400);
 state=(await call('/api/state')).data;
 assert.equal(state.partners.find(p=>p.id===id).status,'interested','Editing history must not rewrite live stage');
 assert.equal(state.partners.find(p=>p.id===id).nextAction,'Reply to question','History edits must not silently rewrite current follow-up');
 const draft=await call('/api/draft/follow-up','POST',{partnerId:id});
 assert.equal(draft.status,200);
 assert.equal(draft.data.subject,'CoffeeBot | Spent Coffee Grounds Reuse Follow-Up');
 assert.ok(draft.data.body.includes('Dear'));
 const sent=await call('/api/outreach/sent','POST',{partnerId:id,body:draft.data.body,recipientEmail:'staff@example.org',kind:'follow-up'});
 assert.equal(sent.status,200);
 assert.equal(sent.data.outreach.kind,'follow-up');
 assert.equal(sent.data.outreach.subject,draft.data.subject);
 const removed=await call('/api/partners/'+id+'/activity/'+posted.data.id,'DELETE');
 assert.equal(removed.status,200);
 assert.equal(removed.data.deleted,true);
 state=(await call('/api/state')).data;
 assert.ok(state.partnerActivity.find(a=>a.id===posted.data.id)?.deletedAt,'Soft deletion retains an internal record');
 assert.equal(state.partners.find(p=>p.id===id).status,'interested','Deleting activity does not roll back relationship');
 assert.equal((await call('/api/partners/'+id+'/activity/'+posted.data.id,'PATCH',{text:'Restore'})).status,400);
 assert.equal((await call('/api/partners/'+id+'/activity/'+sent.data.event.id,'DELETE')).status,200,'Legacy outbound audit event is correctable without unsending email');
});


test('only exact canned demo Notes are cleared; staff-written notes survive',async()=>{
 const restored=await call('/api/partners/p7','PATCH',{notes:'Demo: materials-reuse enquiry received initial interest; a sample discussion is the next step.'});
 assert.equal(restored.status,200);
 assert.equal((await call('/api/state')).data.partners.find(p=>p.id==='p7').notes,'');
 const note='Partner needs an email confirming access instructions and a parking permit.';
 assert.equal((await call('/api/partners/p7','PATCH',{notes:note})).status,200);
 assert.equal((await call('/api/state')).data.partners.find(p=>p.id==='p7').notes,note);
});
test('historical outreach and handover records can be corrected and archived',async()=>{
 const r=await call('/api/partners','POST',{name:'Correction Partner',category:'garden',agreedUse:'Composting'});
 assert.equal(r.status,201);const id=r.data.id;
 const ev=(await call('/api/state')).data.partnerActivity.find(x=>x.partnerId===id&&x.type==='stage');
 assert.equal((await call('/api/partners/'+id+'/activity/'+ev.id,'PATCH',{text:'Corrected initial stage'})).status,200);
 const out=await call('/api/outreach/sent','POST',{partnerId:id,body:'Initial message',recipientEmail:'staff@example.org'});
 assert.equal(out.status,200);
 const oid=out.data.outreach.id;
 assert.equal((await call('/api/partners/'+id+'/outreach/'+oid,'PATCH',{body:'Corrected recorded copy'})).status,200);
 assert.equal((await call('/api/partners/'+id+'/outreach/'+oid,'DELETE')).status,200);
 const h=await call('/api/handovers','POST',{partnerId:id,date:'2026-10-20',kg:6});
 assert.equal(h.status,201);
 const before=(await call('/api/state')).data.metrics.transferredKg;
 assert.equal((await call('/api/partners/'+id+'/handovers/'+h.data.id,'PATCH',{kg:4})).status,200);
 assert.equal((await call('/api/state')).data.metrics.transferredKg,before-2);
 assert.equal((await call('/api/partners/'+id+'/handovers/'+h.data.id,'DELETE')).status,200);
 const st=(await call('/api/state')).data;
 assert.equal(st.metrics.transferredKg,before-6);
 assert.equal(st.partners.find(p=>p.id===id).status,'contacted');
 assert.equal(st.partners.find(p=>p.id===id).agreedUse,'Composting');
});

test('handover exceptions preserve partner arrangement without batch-level reuse claims',async()=>{
 const c=await call('/api/partners','POST',{name:'Recurring Partner',category:'garden',status:'contacted',transportArrangement:'partner-collects',groundsAccepted:'dry',agreedUse:'Composting'});
 assert.equal(c.status,201);const id=c.data.id;
 const ordinary=await call('/api/handovers','POST',{partnerId:id,date:'2026-10-20',kg:5});
 assert.equal(ordinary.status,201);
 assert.equal(ordinary.data.transportArrangement,'partner-collects');
 assert.equal(ordinary.data.groundsCondition,'dry');
 assert.equal(ordinary.data.transportException,false);
 assert.equal(ordinary.data.groundsException,false);
 assert.ok(!Object.hasOwn(ordinary.data,'intendedUse'));
 const exception=await call('/api/handovers','POST',{partnerId:id,date:'2026-10-21',kg:3,transportArrangement:'coffeebot-delivers',groundsCondition:'wet'});
 assert.equal(exception.status,201);
 assert.equal(exception.data.transportException,true);
 assert.equal(exception.data.groundsException,true);
 assert.equal((await call('/api/handovers','POST',{partnerId:id,date:'2026-10-21',kg:1,groundsCondition:'invalid'})).status,400);
 assert.equal((await call('/api/partners/'+id,'PATCH',{transportArrangement:'either',groundsAccepted:'either'})).status,200);
 const unchanged=await call('/api/partners/'+id+'/handovers/'+ordinary.data.id,'PATCH',{kg:6,transportArrangement:'',groundsCondition:''});
 assert.equal(unchanged.status,200);
 assert.equal(unchanged.data.transportArrangement,'partner-collects');
 assert.equal(unchanged.data.groundsCondition,'dry');
 const reverted=await call('/api/partners/'+id+'/handovers/'+exception.data.id,'PATCH',{transportArrangement:'arranged',groundsCondition:'arranged'});
 assert.equal(reverted.status,200);
 assert.equal(reverted.data.transportArrangement,'either');
 assert.equal(reverted.data.groundsCondition,'either');
 assert.equal(reverted.data.transportException,false);
 assert.equal(reverted.data.groundsException,false);
});
