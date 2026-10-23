# Evidence-based ranking and borrowed-model review

**Status:** Pre-sponsor evaluation, 23 October 2026. Weighting preferences and operational requirements remain unconfirmed by CoffeeBot. Experimental outputs in `data/benchmark-results/` are local and Git-ignored.

## Operational purpose

Find *credible, contactable and realistically reusable* spent-coffee-grounds recipients with minimal extra staff work. A recommendation is not consent, an agreed intake, or verified beneficial reuse. Discovery still covers NParks Community in Bloom, NParks parks, MOE programmes, NEA recycling facilities, LIAS membership and SFA crop-farm licences. Their evidentiary meaning differs: a programme or mapped site is weaker than a listing explicitly naming spent coffee grounds. A company charging disposal fees may be waste management rather than low-cost circular reuse.

The pre-existing score uses four configurable factors: **reuse suitability 40, source evidence 35, HQ proximity 10, operational readiness 15**. These provisional weights stay adjustable. Contactability is separately displayed/sortable, not evidence of material-handling ability. Unknown distance does not earn proximity points. Operational facts such as weekly acceptance volume, fee, collection frequency, approval authority and preparation requirements cannot be inferred from public category membership.

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

CoffeeBot still needs to specify tolerable acceptance fees, who collects/delivers, moisture and contamination requirements, acceptable minimum and maximum batch sizes, intake regularity, how institutions authorise grounds use, and credible evidence of final beneficial reuse. In particular, parks and schools are often sites rather than independent counterparties. Treat these as explicit open questions, not scoring facts. A recorded handover is a transfer, not proof of actual reuse.

**Release gate:** full automated tests, source spot check, held-out benchmark coverage, staff-facing ranking explanation, preserved contactability sorting and AI status clarity, and a review of any changes to supplier outreach or handover. No model should be promoted on an incomplete comparison.
