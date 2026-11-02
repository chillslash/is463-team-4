import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const script=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function bootHarness(){
 const root={innerHTML:''},listeners={},append=[],progress={};
 const status={active:true,phase:'Assessing and Ranking Partners',detail:'Evidence batch 2 of 4 complete',completed:2,total:4,batchCompleted:2,batchTotal:4};
 const state={partners:[],ranked:[],discoveryRuns:[],aiActivity:[],metrics:{},settings:{},handovers:[],outreach:[]};
 let tick=null,cleared=0,dropDiscovery=false;
 const document={
  querySelector(sel){
   if(sel==='#app-main')return root;
   if(sel.startsWith('#')){progress[sel]??={textContent:'',style:{},addEventListener(){},setAttribute(){}};return progress[sel];}
   return null;
  },
  querySelectorAll(){return [];},
  addEventListener(name,fn){listeners[name]=fn;},
  createElement(){return {style:{},setAttribute(){},remove(){}};},
  body:{append(node){append.push(node)}}
 };
 const fetch=async(url)=>{
  if(url==='/api/discover'&&dropDiscovery)throw new TypeError('Load failed');
  const value=url==='/api/discovery-status'?status:state;
  return {ok:true,status:200,json:async()=>value};
 };
 const context={
  document,fetch,location:{pathname:'/find-partners',search:''},URLSearchParams,Intl,Date,
  setTimeout:()=>0,clearTimeout:()=>{},setInterval:fn=>{tick=fn;return 42;},
  clearInterval:()=>{cleared++},console,navigator:{clipboard:{writeText:async()=>{}}}
 };
 runInNewContext(script,context);
 return {root,context,status,state,append,listeners,progress,get tick(){return tick},get cleared(){return cleared},set dropped(value){dropDiscovery=value}};
}
test('reloaded discovery page observes active server run and renders completion without another POST',async()=>{
 const h=bootHarness();
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(h.root.innerHTML,/Stop Discovery/);
 assert.equal(typeof h.tick,'function','an active server discovery must be polled after page load');
 await h.tick();
 assert.match(h.progress['#discovery-detail'].textContent,/Evaluating Batch 3 of 4/);
 h.status.active=false;h.status.phase='Completed';
 h.state.discoveryRuns=[{newLeads:255,reviewed:24,assessmentFailed:0,startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),sources:[]}];
 await h.tick();
 assert.ok(h.cleared>=1);
 assert.match(h.root.innerHTML,/>Discover Partners<\/button>/);
 assert.ok(h.append.some(node=>String(node.textContent).includes('255 new')));
});
test('browser load failed during discovery produces continuation notice, not false server failure',async()=>{
 const h=bootHarness();
 await new Promise(resolve=>setImmediate(resolve));
 h.dropped=true;
 const action={dataset:{action:'discover'}};
 await h.listeners.click({target:{closest:sel=>sel==='[data-action],[data-href]'?action:null},preventDefault(){}});
 assert.ok(h.append.some(node=>String(node.textContent).includes('discovery continues on the server')));
 assert.ok(!h.append.some(node=>String(node.textContent).includes('Load failed')));
 assert.equal(typeof h.tick,'function');
 assert.match(h.root.innerHTML,/Stop Discovery/);
});
