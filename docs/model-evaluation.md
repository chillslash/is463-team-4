# Evidence-based ranking and borrowed-model review

**Status:** Baseline model comparison completed 23 October 2026; CoffeeBot feedback incorporated 27 October 2026. Results measure source-evidence ordering, not real acceptance.

**New independent sponsor-priority evaluation:** See [sponsor-ranking-evaluation.md](sponsor-ranking-evaluation.md). The existing figures below assess agreement with our internal public-source relevance tiers, **not** CoffeeBot's operational judgement or realised acceptance. The separate blinded review and diagnostics are on this feature branch; a new model winner is not yet established.

## Operational purpose

Find *credible, contactable and realistically reusable* spent-coffee-grounds recipients with minimal extra staff work. A recommendation is not consent, an agreed intake, or verified beneficial reuse. Discovery still covers NParks Community in Bloom, NParks parks, MOE programmes, NEA recycling facilities, LIAS membership and SFA crop-farm licences. Their evidentiary meaning differs: a programme or mapped site is weaker than a listing explicitly naming spent coffee grounds. A company charging disposal fees may be waste management rather than low-cost circular reuse.

Original weights were **suitability 40, source evidence 35, proximity 10, operations 15**. The current sponsor-aligned defaults are **30 / 30 / 5 / 35**. Actual intake quantity is the largest operational sub-score, with recurring intake and self-collection considered only when documented. Unknown volume does not disqualify a lead; straight-line proximity has less weight because established delivery routes can be convenient. Contactability is independent.

## Why recalibration was needed

On the October 22 saved pool of 354 Suggested prospects, 68 were already AI-assessed. The previous unassessed category heuristic scored many registered gardens near 50/100 while more sceptical AI judgements put the same sites around 15–32. Candidates were rewarded simply for *not having been checked*. The revised source-only screen awards conservative, source-specific points and avoids unearned operational readiness. It does **not**, by itself, prove scores and legacy AI assessments are calibrated. Keep existing AI history and provenance intact.

## Evaluation design and boundaries

The 36-item set at `scripts/benchmark-cases.json` comprises **six items from each of six sources**, split equally into development and holdout. Reviewer-authored ordinal tiers are:

- 0: narrow non-coffee material/adjacent service evidence
- 1: tangential programme, general recycler or site; no direct grounds-use evidence
- 2: documented growing/horticulture context; acceptance still unverified
- 3: published evidence **explicitly** mentions used coffee grounds, without proving agreement

**Critical limitation:** These are internal *source-evidence* judgements, not a blinded CoffeeBot assessment or observed partner willingness. The same broad evidence taxonomy informs the rules-only baseline, so the benchmark favours consistency with our conservative criteria and cannot establish which method produces real-life uptake. A single direct-coffee-positive item (A1 Environment) makes some metrics sensitive to one example. The holdout avoids judging model outputs on their own scores but cannot remove reviewer bias.

Methods: rules-only screening; existing Codex CLI; Qwen3.5 4B; and Llama 3.2 3B. All LLMs use identical `sourceFacts` and `assessmentPrompt`, with numerical validation, reference evidence and no web browsing. Metrics are **held-out nDCG@10**, pairwise ordering agreement, coverage, false-positive review and source-grounded explanations. Invalid responses count as missing, *not* zero scores disguised as successful ranking. Call metadata contains elapsed time and available token counts; checkpoints prevent rerunning already successful local calls.

## Running

```powershell
npm test
node scripts/ranking-benchmark.mjs --models=rules,codex --split=all --batch=6
# With Qwen / Llama installed and running on loopback in Ollama:
ollama pull qwen3.5:4b
ollama pull llama3.2:3b
node scripts/ranking-benchmark.mjs --models=qwen,llama --split=all --batch=1
```

If Windows Ollama cannot load an otherwise present model, the local `llama.cpp` server can be used via `QWEN_LLAMA_CPP_URL=http://127.0.0.1:11436` or `LLAMA_LLAMA_CPP_URL=http://127.0.0.1:11435`. Qwen's hybrid reasoning should be disabled for this short constrained scoring task (e.g. `--reasoning off`) to avoid wasting generation on invisible reasoning. Neither endpoint should bind a public interface. Local provider choices in the ignored `.env` are `AI_PROVIDER=qwen` / `AI_PROVIDER=llama`; use the CLI reference with `AI_PROVIDER=codex`. `--limit=2` and `--batch=1` support smoke tests. The benchmark requires the saved local source snapshot containing the fixture IDs and never rewrites it.

## Selection and sustainability

Choose **reliable, source-faithful triage that helps staff act** rather than maximising model usage. Compare model validity, unsupported acceptance/fee/capacity assertions, top-five relevance, ranking stability, manual review time and deployment practicality. Local CPU time and emitted tokens are *not* measured energy or carbon, nor comparable to hosted Codex without hardware and lifecycle boundaries. The environmentally responsible option might be deterministic screening plus optional human-requested LLM assistance, rather than evaluating every discovered lead automatically.

## Outstanding sponsor decisions

**Sponsor-oriented recheck (27 October 2026):** deterministic numeric screening covers all **36/36** historical reviewer-labelled cases. Under updated 30/30/5/35 weights, the prior holdout gives **nDCG@10 = 0.9443** and **pairwise agreement = 0.8391**, versus 0.9373 and 0.8678 under the earlier weights. This is agreement with **our own public-source evidence tiers**, not partner conversion, capacity or sponsor preference. Several candidate weights were compared on the same set; this is **exploratory calibration and no longer a fresh untouched holdout test**. New unit tests cover verified quantity, unknown capacity, recurring arrangements and self-collection. CoffeeBot’s 20 kg Temasek Polytechnic research donation is a useful real-world one-off example, **not** a scored recurring-uptake benchmark. Staff assessment of real prospective partners is still necessary.

The 10 kg/week operational score saturation is a modelling heuristic, not a sponsor-approved threshold. Unknown partner intake must remain unknown rather than invented from public source category or organisation size.


CoffeeBot now confirms that meaningful intake, regularity, consistent reuse and convenience matter. There are no immediate categorical exclusions, and either collection at HQ or convenient delivery is possible. Still open: actual delivery routes, minimum viable intake and other numerical thresholds, fees, institutional authorisation, material preparation/moisture constraints, and final beneficial-use evidence.

**Release gate:** full automated tests, source spot check, held-out benchmark coverage, staff-facing ranking explanation, preserved contactability sorting and AI status clarity, and a review of any changes to supplier outreach or handover. No model should be promoted on an incomplete comparison.

## Results and pre-sponsor decision (23 October 2026)

The benchmark ran against the 36-case saved snapshot. The metrics below apply to **held-out source-evidence tiers**, not experimentally demonstrated partner conversions.

| Approach | Valid outputs | Held-out nDCG@10 | Held-out pairwise agreement | Decision |
| --- | ---: | ---: | ---: | --- |
| Deterministic source screening | 36/36 | **0.9373** | **0.8678** | **Chosen for numeric ranking** |
| Codex CLI assessor | 36/36 | 0.6336 | 0.4598 | Advisory use only |
| Qwen3.5 4B, local CPU (reasoning off) | 36/36 | 0.6199 | 0.4368 | Optional single-lead review / further research, not automatic scoring |
| Llama 3.2 3B, local CPU | 7 completed before stopping | Not comparable | Not comparable | Stopped under bounded test: repetitive/weak material-specific discrimination |

The Llama trial was stopped early rather than spending more computation on an approach which initially assigned roughly 50–53 to six quite different NEA facilities, including A1, despite the explicit grounds-specific evidence. Its short pilot is a **negative viability screen**, not a statistically comparable 36-item ranking result. An earlier failed local Ollama attempt (HTTP 500 when reading manifests) also reflects environment permissions, **not model performance**. Both models subsequently ran through local `llama.cpp`; Qwen completed all 36.

Qwen correctly distinguished explicit used-coffee-grounds material evidence (A1) from adjacent organic streams (800 Super) in individual examples. Across the entire holdout, however, it sometimes promoted general parks/recyclers over documented growing contexts. Its overall scores were less consistent with the evidence tiers than conservative rules. Codex showed similar weakness. This is enough to **avoid automatic model-scored shortlisting for the current sponsor demo**, but not enough to claim that deterministic rules would outperform either model on real acceptance or reuse outcomes. The reference judgements share our screening philosophy, and no prospective real-world validation exists yet.

**Implementation decision:** numeric Fit Scores and tie-breaking use the source-based deterministic screen for both AI-assessed and unassessed prospects. Historical AI assessments and provenance remain available as *optional staff-readable explanations/check questions* but cannot promote or demote a lead simply by being run. Automatic bulk assessment is disabled unless the operator explicitly sets `AUTO_AI_REVIEW=true`. A staff-triggered AI Review is still available when an operator wants additional questions or rationale; the score itself does not change. This is more consistent, less computationally demanding, and preserves CoffeeBot's role in deciding policy-sensitive constraints.

**Operational and sustainability limitations:** Qwen's measured ~15-minute 36-item local run is a performance observation on one CPU machine under some concurrent inference load. It is **not a fair isolated hardware benchmark**, nor a measured carbon footprint. The rules-only pass is effectively immediate. A measured reduction in AI inference does not automatically establish a net reduction in lifecycle emissions; no carbon accounting has been asserted. The present decision is provisional until CoffeeBot can rate recommendations against actual willingness, fees, transport and acceptance.
