// Sponsor-facing, model-blinded partner priority review.
// This evaluates proposed outreach priority, not actual acceptance or environmental impact.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scorePartner, DEFAULT_RATING_WEIGHTS, migrateSponsorAssumptions} from '../src/core.js';
import {rankingMetrics} from './ranking-metrics.mjs';

const PRIORITIES = new Set([0, 1, 2, 3]);
const stableOrder = value => createHash('sha256').update('coffeebot-sponsor-review-v1:' + value).digest('hex');
const round = value => Math.round(value * 10000) / 10000;

export function buildBlindedReview(state, {limit = 24} = {}) {
 if (!Number.isInteger(limit) || limit < 6 || limit > 100) throw new Error('Review size must be 6–100');
 const sources = new Map();
 for (const partner of state.partners || []) {
  if (partner.status !== 'suggested' || partner.source === 'Fictional Stitch scenario') continue;
  const source = partner.source || 'Unknown source';
  if (!sources.has(source)) sources.set(source, []);
  sources.get(source).push(partner);
 }
 if (sources.size < 2) throw new Error('Need prospects from at least two sources');
 // Within every source, include a direct-coffee-evidence case when available, then
 // hash-sample the remainder. No score or AI assessment controls the sample.
 const queues = [...sources].sort(([a], [b]) => a.localeCompare(b)).map(([source, partners]) => {
  const explicit = partners.filter(p => p.directCoffeeEvidence).sort((a,b) => stableOrder(a.id).localeCompare(stableOrder(b.id)));
  const rest = partners.filter(p => !p.directCoffeeEvidence).sort((a,b) => stableOrder(a.id).localeCompare(stableOrder(b.id)));
  return {source, candidates:[...explicit, ...rest]};
 });
 const chosen = [];
 while (chosen.length < limit && queues.some(q => q.candidates.length)) {
  for (const queue of queues) {
   if (chosen.length >= limit) break;
   const next = queue.candidates.shift();
   if (next) chosen.push(next);
  }
 }
 return {
  version:'coffee-sponsor-review-v1',
  purpose:'Independent judgement of outreach priority using public evidence; not confirmed willingness or reuse',
  preparedAt:new Date().toISOString(),
  sampling:'Source-balanced, stable hash-sampling; includes explicit SCG evidence when present; selection does not use model scores',
  guidance:'Reviewer must not see deterministic or AI scores. Leave outreachPriority null when evidence is insufficient; unknown is not zero.',
  reviewedBy:'', reviewerRole:'', reviewedAt:null,
  cases:chosen.map(p => ({
   id:p.id, name:p.name, source:p.source, category:p.category || '',
   sourceUrl:p.sourceUrl || '',
   materialEvidence:p.materialEvidence || '',
   publicEvidence:(p.evidenceEntries || []).slice(0,4).map(e => ({source:e.source || '',claim:e.claim || '',url:e.url || ''})),
   proposedUse:p.use || '',
   approximateDistanceKm:Number.isFinite(p.distanceKm)?p.distanceKm:null,
   review:{
    outreachPriority:null, confidence:null, rationale:'',
    capacityKgPerWeek:null, recurrence:'unknown', transport:'unknown',
    willingness:'unknown', reuseVerification:'unknown', openQuestions:''
   }
  }))
 };
}

export function diagnosePool(state) {
 const leads=(state.partners || []).filter(p=>p.status==='suggested' && p.source!=='Fictional Stitch scenario');
 const weights=state.settings?.ratingWeights || DEFAULT_RATING_WEIGHTS;
 const histogram={},sources={};
 let zeroOperations=0, unknownCapacity=0, aiReviewed=0, documentedIntake=0;
 for (const p of leads) {
  const score=scorePartner(p,0,weights);
  histogram[score.score]=(histogram[score.score] || 0)+1;
  const source=p.source || 'Unknown source';
  if (!sources[source]) sources[source]={total:0, scores:{}};
  sources[source].total++;
  sources[source].scores[score.score]=(sources[source].scores[score.score] || 0)+1;
  if (score.parts.operations===0) zeroOperations++;
  const capacity=p.capacityKg==null || p.capacityKg===''?null:Number(p.capacityKg);
  if (!Number.isFinite(capacity) || capacity<=0) unknownCapacity++;
  else documentedIntake++;
  if (p.aiAssessment) aiReviewed++;
 }
 const sorted=Object.entries(histogram).map(([score,count])=>({score:Number(score),count})).sort((a,b)=>b.count-a.count || a.score-b.score);
 return {
  scope:'Suggested prospects in locally saved state',
  assumption:'Missing operational fields indicate unobserved facts, not zero real-world capacity',
  total:leads.length, aiReviewed, documentedIntake, unknownCapacity, zeroOperations,
  distinctNumericScores:sorted.length,
  mostFrequentScores:sorted.slice(0,10),
  bySource:Object.fromEntries(Object.entries(sources).sort(([a],[b])=>a.localeCompare(b)).map(([name,info])=>[name,{total:info.total,distinctScores:Object.keys(info.scores).length,scoreHistogram:info.scores}]))
 };
}

function requireReview(review) {
 if (review?.version !== 'coffee-sponsor-review-v1' || !Array.isArray(review.cases)) throw new Error('Invalid sponsor review format');
 const ids = new Set();
 for (const candidate of review.cases) {
  if (typeof candidate.id !== 'string' || !candidate.id || ids.has(candidate.id)) throw new Error('Missing or duplicate review ID');
  ids.add(candidate.id);
  const tier = candidate.review?.outreachPriority;
  if (tier !== null && tier !== undefined && !PRIORITIES.has(tier)) throw new Error('Priority must be 0–3 or null for ' + candidate.id);
 }
 return review.cases.filter(x => PRIORITIES.has(x.review?.outreachPriority));
}
function asModelScores(predictions) {
 const models = predictions?.models || {};
 if (typeof models !== 'object' || Array.isArray(models) || models === null) throw new Error('Expected predictions.models object');
 const result = {};
 for (const [name, scores] of Object.entries(models)) {
  if (name === 'deterministic' || !scores || typeof scores !== 'object' || Array.isArray(scores)) throw new Error('Invalid model predictions for ' + name);
  result[name] = new Map();
  for (const [id, score] of Object.entries(scores)) {
   if (typeof id !== 'string' || !id || !Number.isFinite(score) || score < 0 || score > 100) throw new Error('Invalid prediction for ' + name + '/' + id);
   result[name].set(id, score);
  }
 }
 return result;
}

export function evaluateSponsorReview(state, review, predictions = {models:{}}) {
 const labelled = requireReview(review);
 const partners = new Map((state.partners || []).map(p => [p.id, p]));
 const external = asModelScores(predictions);
 const weights = state.settings?.ratingWeights || DEFAULT_RATING_WEIGHTS;
 const scored = new Map();
 for (const p of labelled) {
  const source = partners.get(p.id);
  if (!source) throw new Error('Cannot score missing source record ' + p.id);
  scored.set(p.id, scorePartner(source, 0, weights).score);
 }
 const byModel = {deterministic:scored, ...external};
 const sources = new Set(labelled.map(x => x.source));
 const tiers = [...new Set(labelled.map(x => x.review.outreachPriority))];
 const sponsorAttribution = review.reviewerRole === 'CoffeeBot' && !!review.reviewedBy && !!review.reviewedAt;
 const allCoverage = Object.values(byModel).every(scores => labelled.every(x => scores.has(x.id)));
 const sufficient = labelled.length >= 12 && sources.size >= 3 && tiers.length >= 2;
 const ready = sponsorAttribution && sufficient && allCoverage && Object.keys(external).length > 0;
 const common = labelled.filter(x => Object.values(byModel).every(scores => scores.has(x.id)));
 const result = {};
 for (const [model,scores] of Object.entries(byModel)) {
  const rows = labelled.map(x => ({id:x.id,name:x.name,tier:x.review.outreachPriority,score:scores.get(x.id)}));
  const covered = rows.filter(x => Number.isFinite(x.score));
  // Incomplete coverage cannot be used to claim a ranking winner. Keep
  // separately labelled exploratory metrics for diagnostics only.
  result[model] = {
   covered:covered.length,coverage:labelled.length?round(covered.length/labelled.length):0,
   exploratory:covered.length >= 2?rankingMetrics(rows):null,
   comparable:common.length >= 2?rankingMetrics(rows.filter(x=>common.some(y=>y.id===x.id))):null
  };
 }
 const warnings = [];
 if (!labelled.length) warnings.push('No independent outreach-priority judgements yet');
 if (!sponsorAttribution) warnings.push('CoffeeBot reviewer attribution and date not confirmed');
 if (!sufficient) warnings.push('Need at least 12 labelled cases spanning 3 sources and at least 2 priority grades');
 if (!allCoverage) warnings.push('Models have incomplete coverage; do not compare their individual exploratory metrics');
 if (!Object.keys(external).length) warnings.push('No AI model scores supplied; cannot compare approaches');
 if (!labelled.some(x=>x.review.outreachPriority===3)) warnings.push('No top-priority cases labelled; strong-lead discrimination not assessed');
 return {
  status: ready?'sponsor-comparison-ready':labelled.length?'provisional':'awaiting-sponsor-ratings',
  definition:'Predict reviewer-rated outreach priority, not actual acceptance, intake or reuse',
  totalCandidates:review.cases.length,labelledCandidates:labelled.length,
  sourceCount:sources.size,priorityDistribution:Object.fromEntries([0,1,2,3].map(t=>[t,labelled.filter(x=>x.review.outreachPriority===t).length])),
  comparableCases:common.length,results:result,warnings,
  decisionGate:'A model comparison requires independent CoffeeBot labels and identical complete case coverage; observed partnership outcomes need a separate future evaluation.'
 };
}

async function runCli() {
 const [command,...args] = process.argv.slice(2);
 const options = Object.fromEntries(args.map(a => {
  const m = a.match(/^--([a-z-]+)=(.+)$/);
  if (!m) throw new Error('Expected --name=value arguments');
  return [m[1],m[2]];
 }));
 if (!['prepare','evaluate','diagnose'].includes(command)) throw new Error('Usage: node scripts/sponsor-ranking-evaluation.mjs prepare|evaluate|diagnose --state=... [--review=...] [--predictions=...] --out=...');
 if (!options.state || !options.out) throw new Error('--state and --out are required');
 const state = JSON.parse(await readFile(options.state,'utf8'));
 migrateSponsorAssumptions(state); // In memory; never change the saved user state.
 let result;
 if (command === 'prepare') {
  result = buildBlindedReview(state,{limit:options.limit ? Number(options.limit) : 24});
 } else if (command === 'diagnose') {
  result = diagnosePool(state);
 } else {
  if (!options.review) throw new Error('--review is required for evaluation');
  const review = JSON.parse(await readFile(options.review,'utf8'));
  const predictions = options.predictions ? JSON.parse(await readFile(options.predictions,'utf8')) : {models:{}};
  result = evaluateSponsorReview(state, review, predictions);
 }
 await writeFile(options.out, JSON.stringify(result,null,2) + '\n', {flag:'wx'});
 console.log(JSON.stringify(command === 'prepare'
  ? {saved:options.out,cases:result.cases.length,modelScoresHidden:true}
  : command === 'diagnose' ? {saved:options.out,total:result.total,zeroOperations:result.zeroOperations,mostFrequentScores:result.mostFrequentScores.slice(0,4)}
  : {saved:options.out,status:result.status,labelled:result.labelledCandidates,comparable:result.comparableCases,warnings:result.warnings},null,2));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
 runCli().catch(error=>{console.error(error.message);process.exitCode=1;});
}
