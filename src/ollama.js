// Ollama is deliberately loopback-only. No candidate evidence leaves the local computer.
const MODELS={qwen:'qwen3.5:4b',llama:'llama3.2:3b'};
export const LOCAL_MODEL_IDS=Object.freeze({...MODELS});
export async function generateLocalJSON(provider,prompt,{withUsage=false,signal,timeoutMs=240000}={}){
 if(!Object.hasOwn(MODELS,provider))throw new Error('Unknown local model');
 const model=provider==='qwen'?process.env.OLLAMA_QWEN_MODEL||MODELS.qwen:process.env.OLLAMA_LLAMA_MODEL||MODELS.llama;
 if(!/^[\w.:-]{1,80}$/.test(model))throw new Error('Invalid local model identifier');
 const timeout=AbortSignal.timeout(timeoutMs);
 const combined=signal?AbortSignal.any([signal,timeout]):timeout;
 const directUrl=provider==='qwen'?process.env.QWEN_LLAMA_CPP_URL:process.env.LLAMA_LLAMA_CPP_URL;
 if(directUrl){
  const parsed=new URL(directUrl);
  if(!['127.0.0.1','localhost'].includes(parsed.hostname)||parsed.protocol!=='http:')throw new Error('Local llama.cpp URL must use HTTP loopback');
  const endpoint=new URL('/v1/chat/completions',parsed);
  let direct;
  try{direct=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:0,seed:463,
     max_tokens:2200,response_format:{type:'json_object'},chat_template_kwargs:{enable_thinking:false}}),signal:combined});
  }catch(err){if(signal?.aborted)throw signal.reason;throw new Error('Local llama.cpp call failed: '+err.message);}
  if(!direct.ok)throw new Error('Local llama.cpp '+model+' HTTP '+direct.status+': '+(await direct.text()).slice(0,250));
  const raw=await direct.json();
  if(typeof raw.choices?.[0]?.message?.content!=='string')throw new Error('llama.cpp returned no JSON answer');
  const result=JSON.parse(raw.choices[0].message.content);
  const usage={inputTokens:raw.usage?.prompt_tokens??null,outputTokens:raw.usage?.completion_tokens??null,
    cachedInputTokens:raw.usage?.prompt_tokens_details?.cached_tokens??null,model,
    executionSeconds:raw.timings?.predicted_ms==null?null:(raw.timings.predicted_ms+(raw.timings.prompt_ms||0))/1000};
  return withUsage?{result,usage}:result;
 }
 let response;
 try{
  response=await fetch('http://127.0.0.1:11434/api/generate',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({model,prompt,format:'json',stream:false,think:false,
    options:{temperature:0,seed:463,num_ctx:4096,num_predict:2200},keep_alive:'5m'}),
   signal:combined
  });
 }catch(err){
  if(signal?.aborted)throw signal.reason||new Error('AI request stopped');
  throw new Error('Local Ollama is unavailable or timed out; start Ollama and pull '+model+'. '+err.message);
 }
 if(!response.ok)throw new Error('Ollama '+model+' failed (HTTP '+response.status+'); ensure the model is pulled');
 const raw=await response.json();
 if(typeof raw.response!=='string')throw new Error('Ollama returned no text');
 let output=raw.response.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'');
 let result;
 try{result=JSON.parse(output);}
 catch{const a=output.indexOf('{'),b=output.lastIndexOf('}');if(a<0||b<a)throw new Error('Ollama returned invalid JSON');result=JSON.parse(output.slice(a,b+1));}
 const usage={inputTokens:raw.prompt_eval_count??null,outputTokens:raw.eval_count??null,
  cachedInputTokens:null,model,executionSeconds:raw.total_duration==null?null:raw.total_duration/1e9};
 return withUsage?{result,usage}:result;
}
