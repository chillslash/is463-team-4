# Independent sponsor evaluation of partner rankings

**Status (27 October 2026):** Evaluation workflow prepared on `feature/evidence-calibrated-ranking-benchmark`. **No independent CoffeeBot priority labels have been collected yet**, so no new model winner is established. This work does **not** change production scores, rediscover partners, or overwrite the earlier model comparison.

## Why revisit the selection?

The original 36-case, six-source benchmark tested whether ranking outputs agreed with *our own* four-level **public-source relevance** labels. Those labels value direct spent-coffee-grounds evidence, documented growing activity, and cautious treatment of generic sustainability claims. The deterministic scorer encodes substantially the same assumptions, so its superior nDCG@10 and pairwise accuracy should not be interpreted as independent evidence of operational usefulness.

There were only **18 held-out cases**, of which **none had the highest relevance tier (3)**: one tier 0, ten tier 1, seven tier 2. The 27 October weight adjustments were compared against that *same* holdout, making the recalibrated results exploratory, not a fresh holdout confirmation.

A 27 October inspection of the locally saved Suggested pool found **354 prospects**, including **118 scored 18/100**, **14 scored 21/100**, and **all 89 SFA farm records scored 18/100**. **All 354 received zero points in the operational subscore** because intake capacity, regularity and arrangement information were not recorded. A zero in this *information-dependent component* does **not** establish that any partner has zero capacity. It demonstrates why source-category scores alone poorly discriminate organisations within a source.

## Two separate evaluation targets

| Target | What we can truthfully assess | What it cannot establish |
| --- | --- | --- |
| **Source-evidence relevance** (existing benchmark) | Whether available sources support further investigation of spent-grounds reuse | Willingness, authorisation, recurring capacity, fee, travel convenience, actual reuse |
| **Outreach priority** (new, blinded CoffeeBot review) | Which prospects CoffeeBot would investigate first based on available evidence and their operational priorities | A recipient's actual acceptance or realised weekly uptake |
| **Observed outcome** (later) | Confirmed response, willingness, cost, logistics, accepted kg/week, repeated handovers and *separately verified* beneficial use | Environmental savings without a defensible lifecycle/baseline study |

**Do not collapse these targets into one “ground truth”.** Missing capacity, frequency, permission, fee or transport information is **unknown**, never automatically zero. A high priority for contacting a candidate is also not a commitment to take material.

## CoffeeBot-aligned review rubric

A CoffeeBot reviewer should read each prospect's *public evidence* and make an independent judgement of **priority for outreach**, without seeing the deterministic Fit Score, LLM suggestions or ordering.

- **3 — Strong lead to investigate first:** credible reuse pathway **and** especially promising documented or independently known intake/logistics/regularity prospects; the reviewer must explain the basis.
- **2 — Worth contacting:** plausible meaningful reuse; operational requirements need verification.
- **1 — Lower-priority investigation:** adjacent or ambiguous evidence, weak likely operational benefit, or significant identified obstacles; explain the weakness.
- **0 — Not worth contacting presently:** credible negative evidence or demonstrable impracticality; **do not use 0 just because information is missing**.
- **null — Unassessable with supplied evidence:** do not guess a grade. Add a verification question instead.

Record the reviewer, role, review date, rationale, confidence and (where actually known) capacity in kg/week, regularity, transport, willingness and evidence of reuse. Capacity in the review record is for qualitative sponsor context, **not** an automatically invented input to numeric scoring. For a fair evaluation, reviewers should record judgements before revealing any candidate model scores.

### Why these operational criteria?

CoffeeBot's feedback prioritises **meaningful intake quantity**, **reliable/repeatable use**, **convenient collection or route-based delivery** and **credible beneficial reuse**. They have not approved a numeric minimum, penalty for one-off research, definitive route map, collection fees or a universal 10 kg/week threshold. Their reported 20 kg Temasek Polytechnic research handover demonstrates that some **one-off** uses can be worthwhile, but is not a label proving a recurring prospect.

Institutional sites (e.g. parks and schools) require an authorised contact; a named garden or programme is not consent. Source credibility, willingness and legal/practical handling are distinct.

## Reproducible, blinded procedure

1. **Freeze a candidate snapshot** before comparing methods. Use the same public-source facts and observation date for every model. Preserve the original 36-case benchmark unchanged.
2. **Create a separate blinded review file.** The supplied utility source-balances the existing Suggested pool, hash-samples within each source (reproducible despite list ordering), and includes explicit coffee-ground material evidence if present. It *does not use model scores to choose cases*. Default 24 cases means four from each of six populated source families. The reviewer-visible file contains public evidence but **no scores or AI reviews**. The source evidence may include a *proposed* use, which must not be mistaken for an observed reuse.
3. **Collect genuinely independent CoffeeBot labels**, including null when unknown. If the sponsor cannot label many candidates because of insufficient information, document that as an outcome: it is a discovery-data quality problem, not a reason to fabricate values.
4. **Freeze model predictions separately** using identical prospects and a fixed source-information budget. Deterministic rules and AI candidates must receive the same verifiable input fields; avoid treating an LLM's invented quantities as facts. For inference comparisons record provider/model/version, prompt, token use, wall time, hardware and cache status. Only claim energy/CO2 comparisons if directly and fairly measured.
5. **Compare on an identical labelled cohort**; report each model's missing/invalid scores. A useful comparison needs at least 12 labelled cases, at least three sources, two different priority grades, attributed CoffeeBot review and complete coverage for all compared methods. Prefer more sponsor judgements and a separately frozen later cohort before promoting a winner. Inspect false positives and top-ranked recommendations qualitatively, not only aggregate metrics.
6. **Check observed outcomes later.** Actual contacted leads can eventually validate acceptance, capacity, regularity and repeat handovers. Do not evaluate observed acceptance on organisations never contacted without accounting for selection bias.

### Commands

The scripts do **not** change `data/state.json` and refuse to overwrite existing output files. They operate on the local, Git-ignored snapshot; do not commit filled reviews containing potentially sensitive contact data.

```powershell
# Create model-blinded, source-balanced sponsor review. Fill review fields offline.
node scripts/sponsor-ranking-evaluation.mjs prepare --state=data/state.json --limit=24 --out=data/sponsor-review.json

# Before model comparison, obtain independent CoffeeBot labels in the review file.
# Optional: supply independently computed AI scores keyed by the exact same partner IDs.
node scripts/sponsor-ranking-evaluation.mjs evaluate --state=data/state.json --review=data/sponsor-review.json --predictions=data/sponsor-model-scores.json --out=data/sponsor-comparison.json

# With no AI predictions yet, an interim rules-only diagnostic is allowed:
node scripts/sponsor-ranking-evaluation.mjs evaluate --state=data/state.json --review=data/sponsor-review.json --out=data/sponsor-rules-diagnostic.json
```

External prediction file schema (example **format only**, not real scores; do not use these invented values as results):

```json
{
  "models": {
    "codex": {"real-partner-id-1": 55, "real-partner-id-2": 48},
    "qwen": {"real-partner-id-1": 50, "real-partner-id-2": 43}
  }
}
```

Each model must supply **all independently labelled case IDs** before its full ranking metrics can be considered comparable. The script provides `exploratory` per-model metrics when incomplete but marks the overall outcome **provisional**. Its `comparable` metrics use only the IDs for which *every* included model supplied a score, and disclose cohort size. The sponsor-labelled dataset is not a fresh holdout if analysts repeatedly tune scoring rules against it. Freeze a further cohort before any final claim.

### Metrics and decision

- **nDCG@10:** rewards correct ordering of higher-priority leads at the top of the shortlist.
- **Pairwise agreement:** evaluates whether the ranking places the reviewer-preferred partner above a lower-priority partner (ties earn half credit).
- **Coverage:** fraction of labelled cases with valid numeric output; low coverage cannot be hidden behind apparently good ranking metrics.
- **Top-lead inspection / operational usefulness:** reviewer disagreement patterns, credible contact routes, unsupported claims, and actual staff time to a useful shortlist.
- **Green-computing cost:** valid inference calls, tokens, elapsed time, **measured energy only if measured**; compare incremental operational benefit with computational cost.

A result that rules win on internally designed source labels is **not** evidence that rules outperform AI for CoffeeBot operations. Conversely, an AI result with greater numeric variation is not better unless independent judgements or actual outcomes validate it.

## Current decision and next evidence

**Keep the existing production deterministic shortlist as a provisional baseline while the new independent test is pending.** Don't clear and rediscover solely to fix clustered scores: a new scan would still use the same category heuristics. Don't change weights, insert AI into numeric scores or promote a new model purely to create more visually varied numbers.

Remaining external inputs: CoffeeBot's blinded ratings; usable source evidence on intake/logistics; minimum/maximum practical volumes, repeatability, fees, wet/dry storage/handling, actual routes, authorisation and evidence of beneficial use. Only after collecting these can we choose between rules-only, selective AI enrichment and AI-driven ranking based on defensible operational evidence.
