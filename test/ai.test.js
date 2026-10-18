import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {AI_PROVIDERS,cliInvocation,parseAIJSON,generateJSON,validateDraft,validateAssessment} from '../src/ai.js';

test('provider commands are noninteractive and use stdin, never a user prompt in shell arguments',()=>{
 assert.deepEqual(AI_PROVIDERS,['template','codex','claude']);
 const codex=cliInvocation('codex','linux');assert.equal(codex.command,'codex');assert.equal(codex.args.at(-1),'-');assert.ok(codex.args.includes('read-only'));
 const claude=cliInvocation('claude','win32');assert.ok(claude.args.includes('--tools'));assert.ok(claude.args.includes('--no-session-persistence'));
 assert.throws(()=>cliInvocation('template'));
});
test('both CLI formats parse equivalent structured drafts',()=>{
 const payload={subject:'Trial',body:'Hi',guide:'Check source'};
 assert.deepEqual(validateDraft(parseAIJSON(JSON.stringify(payload),'codex')),payload);
 assert.deepEqual(validateDraft(parseAIJSON(JSON.stringify({result:JSON.stringify(payload)}),'claude')),payload);
 assert.throws(()=>validateDraft({body:'Hi'}));
 assert.deepEqual(validateDraft({subject:'Hello',body:'Short enquiry'}),{subject:'Hello',body:'Short enquiry',guide:''});
});
test('mock signed-in local CLI receives prompts over stdin',async()=>{
 let actualPrompt='';
 const runner=()=>{
  const proc=new EventEmitter();proc.stdout=new PassThrough();proc.stderr=new PassThrough();proc.stdin=new PassThrough();
  proc.stdin.on('data',chunk=>actualPrompt+=chunk.toString());
  proc.stdin.on('end',()=>{proc.stdout.end(JSON.stringify({subject:'Subject',body:'Safe text',guide:'Review'}));proc.emit('close',0);});
  proc.kill=()=>{};return proc;
 };
 const response=await generateJSON('codex','Assess candidate A', {runner,timeoutMs:2000});
 assert.equal(actualPrompt,'Assess candidate A');assert.equal(response.subject,'Subject');
});
test('AI-led assessment validator rejects old labels and unbounded scores',()=>{
 const result=validateAssessment({assessments:[
  {id:'p1',reuseSuitability:32,sourceEvidence:25,operationalCompatibility:3,reason:'Garden evidence',check:'Verify reuse'},
  {id:'invented',reuseSuitability:40,sourceEvidence:35,operationalCompatibility:10,reason:'Wrong id',check:'Check'},
  {id:'p2',reuseSuitability:41,sourceEvidence:0,operationalCompatibility:0,reason:'Too high',check:'Check'}
 ]},['p1','p2']);
 assert.equal(result.length,1);assert.equal(result[0].reuseSuitability,32);
 assert.throws(()=>validateAssessment({assessments:[{id:'p1',priority:'high',reason:'Old contract'}]},['p1']),/valid/);
});
test('CODEX_PATH overrides PATH only for Codex, without hardcoded machine fallbacks',()=>{
 const custom='C:/Program Files/OpenAI/Codex/codex.exe';
 const a=cliInvocation('codex','win32',{CODEX_PATH:custom,ComSpec:'cmd.exe'});
 assert.equal(a.command,custom);assert.deepEqual(a.args.slice(0,2),['exec','--ephemeral']);
 const b=cliInvocation('codex','win32',{ComSpec:'cmd.exe'});
 assert.equal(b.command,'cmd.exe');assert.deepEqual(b.args.slice(0,4),['/d','/s','/c','codex']);
 const c=cliInvocation('claude','win32',{CODEX_PATH:custom,ComSpec:'cmd.exe'});
 assert.equal(c.command,'cmd.exe');assert.equal(c.args[3],'claude');
 assert.equal(cliInvocation('codex','linux',{CODEX_PATH:'/opt/custom/codex'}).command,'/opt/custom/codex');
 assert.throws(()=>cliInvocation('codex','win32',{CODEX_PATH:'relative/codex.exe'}),/absolute/);
});
