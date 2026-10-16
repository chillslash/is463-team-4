import {spawn} from 'node:child_process';

export const AI_PROVIDERS = ['template', 'codex', 'claude'];
const LIMIT = 120000;
export function cliInvocation(provider, platform = process.platform) {
  if (!['codex', 'claude'].includes(provider)) throw new Error('Choose Codex or Claude in AI settings');
  const args = provider === 'codex'
    ? ['exec', '--ephemeral', '--sandbox', 'read-only', '--skip-git-repo-check', '-']
    : ['-p', '--output-format', 'json', '--max-turns', '1', '--no-session-persistence', '--tools', '', '--disallowedTools', 'mcp__*'];
  return platform === 'win32'
    ? {command: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', provider, ...args]}
    : {command: provider, args};
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
// CLIs use the signed-in local user's subscription. Prompts are passed on stdin, never shell-interpolated.
// Tools are disabled for Claude and Codex is read-only; neither may edit project files.
export async function generateJSON(provider, prompt, {runner=spawn, timeoutMs=90000} = {}) {
  const {command, args} = cliInvocation(provider);
  return new Promise((resolve, reject) => {
    let child, stdout = '', stderr = '', finished = false;
    const complete = (err, result) => {if (finished) return; finished = true; clearTimeout(timer); err ? reject(err) : resolve(result);};
    const timer = setTimeout(() => {child?.kill(); complete(new Error(provider + ' timed out; check your CLI login or try again'));}, timeoutMs);
    try {child = runner(command, args, {cwd:process.cwd(), env:process.env, windowsHide:true, stdio:['pipe','pipe','pipe']});}
    catch {complete(new Error('Could not launch ' + provider + '; install and sign in to its CLI on this computer')); return;}
    child.on('error', () => complete(new Error('Could not launch ' + provider + '; install and sign in to its CLI on this computer')));
    child.stdout.on('data', chunk => {stdout += chunk.toString(); if (stdout.length > LIMIT) child.kill();});
    child.stderr.on('data', chunk => {stderr += chunk.toString(); if (stderr.length > LIMIT) child.kill();});
    child.on('close', code => {
      if (stdout.length > LIMIT || stderr.length > LIMIT) return complete(new Error('AI output was too long'));
      if (code !== 0) return complete(new Error(provider + ' CLI failed. Confirm it is installed and signed in (run ' + provider + ' in your terminal).'));
      try {complete(null, parseAIJSON(stdout, provider));}
      catch {complete(new Error(provider + ' returned an invalid JSON response. Try again.'));}
    });
    child.stdin.on('error', ()=>{});
    child.stdin.end(prompt);
  });
}
export function validateDraft(o) {
  if (!o || typeof o.subject !== 'string' || typeof o.body !== 'string' || typeof o.guide !== 'string' || !o.subject.trim() || !o.body.trim() || !o.guide.trim()) throw new Error('AI draft was incomplete');
  return {subject:o.subject.slice(0,300),body:o.body.slice(0,8000),guide:o.guide.slice(0,2500)};
}
export function validateAssessment(o, ids) {
  if (!o || !Array.isArray(o.assessments)) throw new Error('AI assessment was incomplete');
  const allowed = new Set(ids);
  return o.assessments.filter(a => allowed.has(a?.id) && ['high','medium','low'].includes(a?.priority) && typeof a?.reason === 'string').slice(0,ids.length).map(a=>({
    id:a.id, priority:a.priority, reason:a.reason.slice(0,350), check: typeof a.check==='string'?a.check.slice(0,250):'Confirm willingness, fees and authorised contact'
  }));
}
