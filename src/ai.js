import {generateLocalJSON} from './ollama.js';
import {spawn} from 'node:child_process';
import {isAbsolute as isWinAbsolute} from 'node:path/win32';
import {isAbsolute as isPosixAbsolute} from 'node:path/posix';
import {join} from 'node:path';

export const AI_PROVIDERS = ['template', 'codex', 'claude', 'qwen', 'llama'];
const LIMIT = 120000;
export function cliInvocation(provider, platform = process.platform, env = process.env) {
  if (!['codex', 'claude'].includes(provider)) throw new Error('Choose Codex or Claude in AI settings');
  const args = provider === 'codex'
    ? ['exec', '--ephemeral', '--sandbox', 'read-only', '--skip-git-repo-check', '--json', '-']
    : ['-p', '--output-format', 'json', '--max-turns', '1', '--no-session-persistence', '--tools', '', '--disallowedTools', 'mcp__*'];
  // A teammate may explicitly override Codex's location; otherwise use the normal PATH lookup.
  const codexPath = provider === 'codex' ? env.CODEX_PATH?.trim() : null;
  if (codexPath) {
    const isAbsolute = platform === 'win32' ? isWinAbsolute : isPosixAbsolute;
    if (!isAbsolute(codexPath)) throw new Error('CODEX_PATH must be an absolute path to the Codex executable');
    return {command: codexPath, args};
  }
  return platform === 'win32'
    ? {command: env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', provider, ...args]}
    : {command: provider, args};
}
function cliEnvironment(provider){
  const env={...process.env};
  // Some managed Windows shells omit HOME. Keep Codex pointed at the signed-in
  // user's existing profile without changing global environment or config.
  if(provider==='codex'&&!env.CODEX_HOME&&env.USERPROFILE)env.CODEX_HOME=join(env.USERPROFILE,'.codex');
  return env;
}
export function parseAIJSON(text, provider) {
  let output = text.trim();
  if (provider === 'claude') {
    const wrapper = JSON.parse(output);
    if (wrapper.is_error || typeof wrapper.result !== 'string') throw new Error('Claude did not return a successful response');
    output = wrapper.result.trim();
  }
  output = output.replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/, '').trim();
  try { return JSON.parse(output); }
  catch {
    const start = output.indexOf('{'), end = output.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('AI response did not contain JSON');
    return JSON.parse(output.slice(start, end + 1));
  }
}
export function tokenUsage(raw,provider){
 if(!raw||typeof raw!=='object')return null;
 const get=(key)=>Number.isFinite(raw[key])&&raw[key]>=0?raw[key]:null;
 const input=get('input_tokens'),output=get('output_tokens');
 return {inputTokens:input,outputTokens:output,cachedInputTokens:provider==='claude'?get('cache_read_input_tokens'):get('cached_input_tokens')};
}
export function parseAIOutput(text,provider){
 if(provider==='claude'){
  const wrapper=JSON.parse(text.trim());
  return {result:parseAIJSON(text,provider),usage:tokenUsage(wrapper.usage,provider)};
 }
 const lines=text.trim().split(/\r?\n/);
 let events=[];
 try{events=lines.map(line=>JSON.parse(line));}catch{}
 if(events.some(e=>e&&typeof e.type==='string'&&(e.type.startsWith('item.')||e.type.startsWith('turn.')||e.type.startsWith('thread.')))){
  let answer=null,usage=null;
  for(const e of events){
   if(e.type==='item.completed'&&e.item?.type==='agent_message'&&typeof e.item.text==='string')answer=e.item.text;
   if(e.type==='turn.completed')usage=tokenUsage(e.usage,'codex');
  }
  if(!answer)throw new Error('Codex did not return a completed response');
  return {result:parseAIJSON(answer,'codex'),usage};
 }
 return {result:parseAIJSON(text,provider),usage:null};
}
// CLIs use the signed-in local user's subscription. Prompts are passed on stdin, never shell-interpolated.
// Tools are disabled for Claude and Codex is read-only; neither may edit project files.
export async function generateJSON(provider, prompt, {runner=spawn, timeoutMs=90000, withUsage=false, signal} = {}) {
  signal?.throwIfAborted();
  if(provider==='qwen'||provider==='llama')return generateLocalJSON(provider,prompt,{withUsage,signal,timeoutMs:Math.max(timeoutMs,240000)});
  const {command, args} = cliInvocation(provider);
  return new Promise((resolve, reject) => {
    let child, stdout = '', stderr = '', finished = false;
    const complete = (err, result) => {if (finished) return; finished = true; clearTimeout(timer); signal?.removeEventListener('abort',onAbort); err ? reject(err) : resolve(result);};
    const onAbort=()=>{if(child?.pid&&process.platform==='win32')spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'}).on('error',()=>child?.kill());else child?.kill();complete(signal.reason||new Error('AI request stopped'));};
    const timer = setTimeout(() => {child?.kill(); complete(new Error(provider + ' timed out; check your CLI login or try again'));}, timeoutMs);
    signal?.addEventListener('abort',onAbort,{once:true});
    if(signal?.aborted){onAbort();return;}
    try {child = runner(command, args, {cwd:process.cwd(), env:cliEnvironment(provider), windowsHide:true, stdio:['pipe','pipe','pipe']});}
    catch {complete(new Error('Could not launch ' + provider + '; install and sign in to its CLI on this computer')); return;}
    child.on('error', () => complete(new Error('Could not launch ' + provider + '; install and sign in to its CLI on this computer')));
    child.stdout.on('data', chunk => {stdout += chunk.toString(); if (stdout.length > LIMIT) child.kill();});
    child.stderr.on('data', chunk => {stderr += chunk.toString(); if (stderr.length > LIMIT) child.kill();});
    child.on('close', code => {
      if (stdout.length > LIMIT || stderr.length > LIMIT) return complete(new Error('AI output was too long'));
      if (code !== 0) return complete(new Error(/\b429\b|Too Many Requests/i.test(stderr+' '+stdout)?provider+' rate-limited (HTTP 429); try again when the provider allows requests':provider + ' CLI failed. Confirm it is installed and signed in (run ' + provider + ' in your terminal).'));
      try {const parsed=parseAIOutput(stdout,provider); complete(null,withUsage?parsed:parsed.result);}
      catch {complete(new Error(provider + ' returned an invalid JSON response. Try again.'));}
    });
    child.stdin.on('error', ()=>{});
    child.stdin.end(prompt);
  });
}
export function validateDraft(o) {
  if (!o || typeof o.subject !== 'string' || typeof o.body !== 'string' || !o.subject.trim() || !o.body.trim()) throw new Error('AI draft was incomplete');
  return {subject:o.subject.slice(0,300),body:o.body.slice(0,8000),guide:typeof o.guide==='string'?o.guide.slice(0,2500):''};
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
