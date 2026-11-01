import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {AI_PROVIDERS,cliInvocation,parseAIJSON,parseAIOutput,generateJSON,validateDraft,validateAssessment,ensureCoffeeBotSubject} from '../src/ai.js';

test('provider commands are noninteractive and use stdin, never a user prompt in shell arguments',()=>{
 assert.deepEqual(AI_PROVIDERS,['template','codex']);
 const codex=cliInvocation('codex','linux');assert.equal(codex.command,'codex');assert.equal(codex.args.at(-1),'-');assert.ok(codex.args.includes('read-only'));
 assert.throws(()=>cliInvocation('claude'),/Only Codex/);
 assert.throws(()=>cliInvocation('template'));
});
test('both CLI formats parse equivalent structured drafts',()=>{
 const payload={subject:'Trial',body:'Hi',guide:'Check source'};
 assert.deepEqual(validateDraft(parseAIJSON(JSON.stringify(payload),'codex')),payload);
 assert.throws(()=>validateDraft({body:'Hi'}));
 assert.deepEqual(validateDraft({body:'Hi'},{subjectFallback:'CoffeeBot | Spent Coffee Grounds Reuse Partnership'}),{subject:'CoffeeBot | Spent Coffee Grounds Reuse Partnership',body:'Hi',guide:''});
 assert.throws(()=>validateDraft({body:''},{subjectFallback:'CoffeeBot'}),/body was missing/);
 assert.deepEqual(validateDraft({subject:'Hello',body:'Short enquiry'}),{subject:'Hello',body:'Short enquiry',guide:''});
});
test('mock signed-in local CLI receives prompts over stdin',async()=>{
 let actualPrompt='',codexHome='';
 const priorHome=process.env.CODEX_HOME,priorProfile=process.env.USERPROFILE;
 delete process.env.CODEX_HOME;process.env.USERPROFILE='C:\\Users\\CoffeeBotTest';
 const runner=(_command,_args,options)=>{
  codexHome=options.env.CODEX_HOME;
  const proc=new EventEmitter();proc.stdout=new PassThrough();proc.stderr=new PassThrough();proc.stdin=new PassThrough();
  proc.stdin.on('data',chunk=>actualPrompt+=chunk.toString());
  proc.stdin.on('end',()=>{proc.stdout.end(JSON.stringify({subject:'Subject',body:'Safe text',guide:'Review'}));proc.emit('close',0);});
  proc.kill=()=>{};return proc;
 };
 try{
  const response=await generateJSON('codex','Assess candidate A', {runner,timeoutMs:2000});
  assert.equal(actualPrompt,'Assess candidate A');assert.equal(response.subject,'Subject');
  assert.equal(codexHome,'C:\\Users\\CoffeeBotTest\\.codex');
 }finally{if(priorHome===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=priorHome;if(priorProfile===undefined)delete process.env.USERPROFILE;else process.env.USERPROFILE=priorProfile;}
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
test('Codex web search is opt-in and only enabled for shared research calls',()=>{
 const normal=cliInvocation('codex','linux',{},{}).args;
 const searched=cliInvocation('codex','linux',{}, {webSearch:true}).args;
 assert.equal(normal.includes('--search'),false);
 assert.equal(searched[0],'--search');
 assert.equal(searched[1],'exec');
});

test('CODEX_PATH overrides PATH only for Codex, without hardcoded machine fallbacks',()=>{
 const custom='C:/Program Files/OpenAI/Codex/codex.exe';
 const a=cliInvocation('codex','win32',{CODEX_PATH:custom,ComSpec:'cmd.exe'});
 assert.equal(a.command,custom);assert.deepEqual(a.args.slice(0,2),['exec','--ephemeral']);
 const b=cliInvocation('codex','win32',{ComSpec:'cmd.exe'});
 assert.equal(b.command,'cmd.exe');assert.deepEqual(b.args.slice(0,4),['/d','/s','/c','codex']);
 assert.equal(cliInvocation('codex','linux',{CODEX_PATH:'/opt/custom/codex'}).command,'/opt/custom/codex');
 assert.throws(()=>cliInvocation('codex','win32',{CODEX_PATH:'relative/codex.exe'}),/absolute/);
});

test('CLI usage parsing reports actual token counts where available',()=>{
 const message=JSON.stringify({subject:'Hello',body:'Email'});
 const jsonl=[
  JSON.stringify({type:'thread.started',thread_id:'sample'}),
  JSON.stringify({type:'item.completed',item:{type:'agent_message',text:message}}),
  JSON.stringify({type:'turn.completed',usage:{input_tokens:350,cached_input_tokens:100,output_tokens:88}})
 ].join('\n');
 const codex=parseAIOutput(jsonl,'codex');
 assert.equal(codex.result.subject,'Hello');
 assert.deepEqual(codex.usage,{inputTokens:350,outputTokens:88,cachedInputTokens:100});
 assert.equal(parseAIOutput(message,'codex').usage,null);
});

test('outreach subjects always feature the CoffeeBot brand',()=>{
 assert.equal(ensureCoffeeBotSubject('Partnership enquiry'),'CoffeeBot — Partnership enquiry');
 assert.equal(ensureCoffeeBotSubject('CoffeeBot: A reuse trial'),'CoffeeBot: A reuse trial');
 assert.equal(ensureCoffeeBotSubject('coffee bot partnership'),'CoffeeBot partnership');
 assert.equal(ensureCoffeeBotSubject('Coffee-Bot proposal'),'CoffeeBot proposal');
});
