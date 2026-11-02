import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_PROVIDERS,DEFAULT_CLAUDE_MODEL,parseAIJSON,parseAIOutput,generateJSON,validateDraft,ensureCoffeeBotSubject} from '../src/ai.js';
const msg=text=>({content:[{type:'text',text}],stop_reason:'end_turn',usage:{input_tokens:120,output_tokens:40,cache_read_input_tokens:20}});
test('Claude API replaces all production model providers',()=>{
 assert.deepEqual(AI_PROVIDERS,['template','claude']);
 assert.equal(DEFAULT_CLAUDE_MODEL,'claude-sonnet-5');
 assert.deepEqual(parseAIJSON('{"ok":true}'),{ok:true});
 assert.deepEqual(validateDraft({body:'Hello'},{subjectFallback:'CoffeeBot'}),{subject:'CoffeeBot',body:'Hello',guide:''});
});
test('Claude API request is authenticated and usage recorded',async()=>{
 const calls=[];
 const r=await generateJSON('claude','Assess prospect',{apiKey:'mock-key',withUsage:true,
  fetchImpl:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>msg('{"score":7}')}}});
 assert.deepEqual(r.result,{score:7});
 assert.deepEqual(r.usage,{inputTokens:120,outputTokens:40,cachedInputTokens:20});
 assert.equal(calls[0].url,'https://api.anthropic.com/v1/messages');
 assert.equal(calls[0].opts.headers['x-api-key'],'mock-key');
 assert.equal(JSON.parse(calls[0].opts.body).tools,undefined);
});
test('Claude web search is explicit and supports continuation',async()=>{
 let n=0;const sent=[];
 const r=await generateJSON('claude','Look for official site',{apiKey:'mock-key',webSearch:true,
  fetchImpl:async(_u,o)=>{sent.push(JSON.parse(o.body));return {ok:true,json:async()=>++n===1?
   {...msg('Searching'),stop_reason:'pause_turn'}:msg('{"found":true}')}}});
 assert.equal(r.found,true);assert.equal(sent.length,2);
 assert.equal(sent[0].tools[0].name,'web_search');
 assert.equal(sent[1].messages[1].role,'assistant');
});
test('API errors and invalid outputs never expose secrets',async()=>{
 await assert.rejects(generateJSON('claude','p',{apiKey:''}),/ANTHROPIC_API_KEY/);
 await assert.rejects(generateJSON('unknown','p',{apiKey:'fake'}),/Only Claude/);
 await assert.rejects(generateJSON('claude','p',{apiKey:'fake',fetchImpl:async()=>({ok:false,status:401})}),/key rejected/);
 assert.throws(()=>parseAIOutput({...msg('{"x":1}'),stop_reason:'max_tokens'}),/output limit/);
 assert.throws(()=>parseAIOutput(msg('bad json')),/JSON/);
});
test('subject validation maintains CoffeeBot branding',()=>{
 assert.match(ensureCoffeeBotSubject('Partnership enquiry'),/CoffeeBot/);
});
