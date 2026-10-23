// Ollama is deliberately loopback-only. No candidate evidence leaves the local computer.
const MODELS={qwen:'qwen3.5:4b',llama:'llama3.2:3b'};
export const LOCAL_MODEL_IDS=Object.freeze({...MODELS});
export async function generateLocalJSON(provider,prompt,{withUsage=false,signal,timeoutMs=240000}={}){
 if(!Object.hasOwn(MODELS,provider))throw new Error('Unknown local model');
 const model=provider==='qwen'?process.env.OLLAMA_QWEN_MODEL||MODELS.qwen:process.env.OLLAMA_LLAMA_MODEL||MODELS.llama;
 if(!/^[\w.:-]{1,80}$/.test(model))throw new Error('Invalid local model identifier');
 const timeout=AbortSignal.timeout(timeoutMs);
 const combined=signal?AbortSignal.any([signal,timeout]):timeout;
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
