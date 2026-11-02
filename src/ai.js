// Production AI transport: Anthropic Messages API. Benchmark adapters live on
// feature/evidence-calibrated-ranking-benchmark, not in the application.
export const AI_PROVIDERS=['template','claude'];
export const DEFAULT_CLAUDE_MODEL='claude-sonnet-5';
const CLAUDE_ENDPOINT='https://api.anthropic.com/v1/messages';

export function parseAIJSON(text){
 let value=String(text||'').trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'').trim();
 try{return JSON.parse(value);}catch{
  const start=value.indexOf('{'),end=value.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('Claude response did not contain JSON');
  return JSON.parse(value.slice(start,end+1));
 }
}
export function tokenUsage(raw){
 if(!raw||typeof raw!=='object')return null;
 const finite=v=>Number.isFinite(v)&&v>=0?v:null;
 return {inputTokens:finite(raw.input_tokens),outputTokens:finite(raw.output_tokens),
  cachedInputTokens:finite(raw.cache_read_input_tokens)};
}
export function parseAIOutput(message){
 if(!message||typeof message!=='object'||!Array.isArray(message.content))
  throw new Error('Claude returned an invalid API response');
 if(message.stop_reason==='max_tokens')throw new Error('Claude response exceeded its output limit');
 const text=message.content.filter(b=>b?.type==='text').map(b=>b.text).filter(x=>typeof x==='string').join('\n');
 if(!text.trim())throw new Error('Claude returned no text');
 return {result:parseAIJSON(text),usage:tokenUsage(message.usage)};
}
// The API key stays in ANTHROPIC_API_KEY (local Git-ignored .env or process env).
// No CLI, local model, paid second-pass fallback or API key in error messages.
export async function generateJSON(provider,prompt,{fetchImpl=globalThis.fetch,apiKey=process.env.ANTHROPIC_API_KEY||process.env.CLAUDE_API_KEY,
 model=process.env.CLAUDE_MODEL||DEFAULT_CLAUDE_MODEL,timeoutMs=90000,
 withUsage=false,signal,webSearch=false}={}){
 signal?.throwIfAborted();
 if(provider!=='claude')throw new Error('Only Claude is supported for AI generation');
 if(!apiKey?.trim())throw new Error('Set ANTHROPIC_API_KEY (or CLAUDE_API_KEY) in your local environment');
 if(typeof fetchImpl!=='function')throw new Error('HTTP client unavailable');
 const controller=new AbortController();
 const abort=()=>controller.abort(signal?.reason||new Error('AI request cancelled'));
 signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(new Error('Claude API request timed out')),timeoutMs);
 const messages=[{role:'user',content:'Return only a valid JSON object. No Markdown fences or commentary.\n\n'+prompt}];
 const base={model,max_tokens:8192,messages};
 if(webSearch)base.tools=[{type:'web_search_20250305',name:'web_search',max_uses:2}];
 try{
  for(let turn=0;turn<3;turn++){
   let res;
   try{res=await fetchImpl(CLAUDE_ENDPOINT,{method:'POST',
    headers:{'content-type':'application/json','anthropic-version':'2023-06-01','x-api-key':apiKey},
    body:JSON.stringify(base),signal:controller.signal});}
   catch(err){if(controller.signal.aborted)throw new Error(signal?.aborted?'Claude request cancelled':'Claude API request timed out');throw new Error('Claude API connection failed');}
   if(!res.ok){
    if(res.status===429)throw new Error('Claude API rate-limited (HTTP 429)');
    if(res.status===401||res.status===403)throw new Error('Claude API key rejected or lacks access (HTTP '+res.status+')');
    throw new Error('Claude API request failed (HTTP '+res.status+')');
   }
   const message=await res.json();
   if(webSearch&&message?.stop_reason==='pause_turn'&&turn<2){
    base.messages.push({role:'assistant',content:message.content});
    continue;
   }
   const output=parseAIOutput(message);
   return withUsage?output:output.result;
  }
  throw new Error('Claude web research did not complete');
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export function validateDraft(o,{subjectFallback=null}={}) {
  if (!o || typeof o.body !== 'string' || !o.body.trim()) throw new Error('AI email body was missing');
  const subject=typeof o.subject==='string'&&o.subject.trim()?o.subject.trim():subjectFallback;
  if(typeof subject!=='string'||!subject.trim())throw new Error('AI email subject was missing');
  return {subject:subject.slice(0,300),body:o.body.trim().slice(0,8000),guide:typeof o.guide==='string'?o.guide.slice(0,2500):''};
}
export function ensureCoffeeBotSubject(subject){
 const original=String(subject??'').trim();
 const normalised=original.replace(/\bcoffee[\s-]?bot\b/gi,'CoffeeBot');
 return (/\bCoffeeBot\b/i.test(normalised)?normalised:'CoffeeBot — '+normalised).slice(0,300);
}
export function validateAssessment(o,ids){
 if(!o||!Array.isArray(o.assessments))throw new Error('AI assessment was incomplete');
 const allowed=new Set(ids),seen=new Set(),valid=[];
 for(const a of o.assessments){
  if(!allowed.has(a?.id)||seen.has(a.id))continue;
  const bounded=[['reuseSuitability',40],['sourceEvidence',35],['operationalCompatibility',10]];
  if(!bounded.every(([key,max])=>Number.isInteger(a[key])&&a[key]>=0&&a[key]<=max))continue;
  if(typeof a.reason!=='string'||!a.reason.trim()||typeof a.check!=='string'||!a.check.trim())continue;
  seen.add(a.id);valid.push({id:a.id,reuseSuitability:a.reuseSuitability,sourceEvidence:a.sourceEvidence,
    operationalCompatibility:a.operationalCompatibility,reason:a.reason.trim().slice(0,350),
    check:a.check.trim().slice(0,250)});
 }
 if(!valid.length)throw new Error('AI response contained no valid evidence-grounded scores');
 return valid.slice(0,ids.length);
}


/** Read-only assistant output for staff review. Never commit suggestions automatically. */
export function validateActivitySuggestion(raw,{currentStage='contacted',today=new Date().toISOString().slice(0,10)}={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('AI activity analysis did not return an object');
 const pickText=(key,max)=>{const value=raw[key];if(value===null||value===undefined||value==='')return null;if(typeof value!=='string')throw new Error('Invalid AI activity '+key);return value.trim().slice(0,max)||null;};
 const outcome=pickText('outcome',30);
 if(outcome&&!['requested-information','meeting-agreed','trial-discussed','follow-up-needed','declined','no-response','other'].includes(outcome))throw new Error('Invalid AI activity outcome');
 const stage=pickText('stage',30);
 if(stage&&!['suggested','contacted','interested','trial','regular','closed'].includes(stage))throw new Error('Invalid AI activity stage');
 const due=pickText('followUpDate',10);
 if(due){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(due))throw new Error('Invalid AI follow-up date');
  const [y,m,d]=due.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw new Error('Invalid AI follow-up date');
  if(due<today)throw new Error('AI suggested a past follow-up date');
 }
 // The deadline belongs in Follow-Up Date, not repeated in the action.
 let nextAction=pickText('nextAction',250);
 if(due&&nextAction){
  nextAction=nextAction.replace(new RegExp('\\s+(?:by|on|before|due)\\s+'+due+'(?=[\\s.,;:]|$)','gi'),'')
   .replace(new RegExp('\\s+'+due+'(?=[\\s.,;:]|$)','gi'),'')
   .replace(/\s+([,.;])/g,'$1').trim()||null;
 }
 return {
  outcome,stage:stage===currentStage?null:stage,
  nextAction,
  followUpDate:due,
  contactPerson:pickText('contactPerson',120),
  rationale:pickText('rationale',350)
 };
}
