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
test('assessment parser rejects invented partner ids and accepts only bounded priorities',()=>{
 const out=validateAssessment({assessments:[{id:'p1',priority:'high',reason:'Potential',check:'Ask'}, {id:'invented',priority:'high',reason:'Fabricated'}, {id:'p2',priority:'extreme',reason:'Not allowed'}]},['p1','p2']);
 assert.equal(out.length,1);assert.equal(out[0].id,'p1');
});