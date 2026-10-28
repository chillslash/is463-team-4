# Evidence-grounded AI ranking — experimental feature branch

**Branch:** `feature/evidence-calibrated-ranking-benchmark`. **Not merged into main.** The existing 36-case internal benchmark and the 24-case provisional proxy review are retained separately. Neither is CoffeeBot-confirmed ground truth. This document describes an experimental implementation, not a proven improvement in real partner acceptance.

## Why change

The earlier scoring method treated all members of a source category similarly. In the 354 Suggested leads saved on 27 October, 118 scored 18/100 and 89 SFA crop-farm leads all scored 18/100, even though some farms cultivate fungi and others operate hydroponic systems. All 354 lacked recorded intake information and therefore earned zero *documented operational points*, not zero real-world capacity. Existing LLM reviews were shown only as advisory text.

The internal 36-case benchmark favoured deterministic scoring against labels based on our own source categories; its holdout was small and lacked a grade-3 example. It does not establish actual CoffeeBot partner acceptance, volume, willingness or operational usefulness. The 24-case assistant desk review adds case-specific research but remains an imperfect, non-sponsor reference.

## Implemented inference lifecycle

1. **Discover broadly:** Existing independent NParks/MOE/NEA/LIAS/SFA data ingestion, deduplication, source URLs, geocoding, contact research and staff relationship history remain.
2. **Source-screen cheaply:** Every lead gets an explainable deterministic score. This is the fallback for missing or insufficient evidence, an unavailable model or an invalid response.
3. **Find source-specific material evidence:** Where a saved HTTPS organisation website exists, a bounded, non-redirecting web fetch extracts relevant short passages about cultivation, substrate or material handling. The website URL and unverified excerpt are recorded. During discovery, at most six top-ranked website-linked Suggested leads are checked; checks are cached for seven days. The staff-triggered AI Review also attempts a website check when evidence is thin. This is *not* a general-purpose web search and does not discover missing organisation homepages.
4. **Selective evidence assessment:** With a configured provider, automatically select up to the setting `automaticAIAssessments` (default 24) source-balanced leads that have specific, cited evidence. Assess in batches of up to six. The LLM must return numeric suitability and evidence scores, a concrete reuse pathway, a critical verification question and **source evidence indices**. Models cannot browse during this call.
5. **Validate before using:** Accept only correctly typed scores within bounds, indices pointing to stored HTTPS source claims with material-specific wording, and a fingerprint matching the latest public and verified staff facts. Invalid or generic evidence does not activate AI ranking. Preserve historical `aiAssessment` as advisory and store new assessments in `aiEvidenceReview`, with provider, timestamp, source fingerprint and run ID.
6. **Combine transparently:** For a cited, fresh assessment, **reuse suitability and source evidence** become a 50/50 blend of rule-derived and AI-derived points. **Proximity and operations remain deterministic** using known locations and recorded partner information. Otherwise all four dimensions are rules-only. Each Suggested card displays **AI-assisted** or **Rule-ranked** and any selected AI-cited source passages. AI-Assessed Only continues to include historical advisory assessments, whereas the score-method label distinguishes actual model contribution.
7. **Preserve staff control:** A model cannot create a contact, consent, fee, quantity, transport arrangement, intake schedule or evidence of actual reuse. Staff control relationship stages, outreach, handovers and any verified facts.

### Why this is a hybrid, not a disguised deterministic approach

AI's individual interpretation can materially **raise or lower suitability and evidence scores**, potentially distinguishing two organisations from the same source category. The rules implement safe screening, computation-efficient selection and verification gates. No numeric promotion occurs just because a legacy LLM response exists or because a website contains vague sustainability claims.

An important limitation remains: without material-specific public information or an organisation website, the application cannot reliably distinguish individual partners. A low provisional Fit Score reflects *evidence available for triage*, not a low actual capacity. More detailed sources, representative candidate selection and real partnership outcomes are the next product-quality bottlenecks.

## Configuration and green computing

The backend loads a local ignored `.env` if present, without overwriting environment variables provided by the process. `AI_PROVIDER=codex` (authenticated CLI) or `AI_PROVIDER=qwen` (a running local inference endpoint) enables selective AI discovery by default. `AI_PROVIDER=template` or `AUTO_AI_REVIEW=false` uses source-only discovery. On-demand evidence assessment still requires a working model. An absent or unsuccessful model must never be represented as completed AI analysis.

The app already records provider, token metadata when available, number of calls, time and failures. New assessments are cached against source/verified-fact fingerprints to avoid unnecessary repeated inference. Website checks and AI work are bounded, and failed sources do not invalidate previous evidence.

**No measured energy, power or carbon values are available.** Token counts, wall time and inference-call counts are proxies for resource use, not carbon footprints. The sustainability hypothesis is that a selective hybrid might provide useful individual differentiation at less inference cost than sending all discovered candidates to a large model; it has **not yet been demonstrated on independently verified operational outcomes**.

**Completed 28 October benchmark:** [Full Codex, full Qwen, rules-only and selective-hybrid results](benchmark-2026-10-28-results.md). The legacy comparison ran on all 24 frozen proxy cases, but a [methodological audit](benchmark-methodology-audit-2026-10-28.md) found label and scoring confounds. Its figures are diagnostic only; no ranking approach has been validated for actual CoffeeBot acceptance.

## Reproducible evaluation

Existing assessments and frozen desk judgements are in `scripts/proxy-review-judgements.json`, with the labelled local review at `data/proxy-review-labelled.json` (ignored). Never allow prediction code to read reference labels until scoring is complete.

```powershell
npm test
# Rules-only baseline on the same 24 labelled cases:
node scripts/proxy-ranking-experiment.mjs --state=data/state.json --review=data/proxy-review-labelled.json --out=data/rules-proxy-result.json
# Requires authenticated CLI or running local models; the full AI and selective hybrid are run separately:
node scripts/proxy-ranking-experiment.mjs --state=data/state.json --review=data/proxy-review-labelled.json --models=codex --limit=12 --out=data/codex-proxy-result.json
node scripts/proxy-ranking-experiment.mjs --state=data/state.json --review=data/proxy-review-labelled.json --models=qwen --limit=12 --out=data/qwen-proxy-result.json
```

The runner computes deterministic scores for the full frozen cohort. For each selected model it additionally obtains **full AI scores** (legacy unconstrained assessment rubric) for all 24 and **selective AI scores** (new citation-required rubric) only for evidence-rich leads up to the limit; unreviewed hybrid leads retain rules-only scores. This is a comparison of *strategies*, with different prompt constraints by design, not an isolated test of LLM capability alone.

Evaluate **nDCG@10**, pairwise ordering, coverage, top-lead accuracy, false positives, model failures and explanation quality. Compare on the same labelled cases and report incomplete coverage. Per-call wall time and actual token counts (when supplied) permit a computational-effort comparison; **do not infer electrical energy or carbon emissions**.

The independent-proxy cohort is only 24 cases, labels are assistant-produced, and source categories may still influence judgements. Don't promote a new model or claim source-grounded AI improves operational uptake until the comparative results and individual errors are inspected. A better fresh benchmark would use blinded ratings and actual outreach/capacity results from outside this team's scoring assumptions.

## Backwards compatibility and rollout

The old `aiAssessment` fields and audit log are preserved; no existing partner contacts or staff workflows are reset. This feature branch deliberately does **not** update `main`. The redesigned scoring remains experimental until the real model benchmark and UX audit are complete. Do not clear and rediscover the source pool just to create different numeric scores.
