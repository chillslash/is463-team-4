# Controlled evidence-aware ranking rerun — methodology (29 October 2026)

## Status and objective

The previous 28 October proxy evaluation was confounded by source-dependent labels, withheld organisation-specific facts and differing model prompts, validators and score fusion. This rerun addresses the *method-comparison* confounds without pretending the 24 internally authored labels are independent ground truth. Its objective is to ask:

1. Can a model distinguish **organisations within the same discovery source** once it receives specific public evidence?
2. How much of that within-source ability is retained when AI inference is selectively applied?
3. How do prompt token volumes, completed calls, candidate coverage and elapsed inference time differ?

No new sponsor labels, field-verified intake quantities or measured carbon footprints are created. This cohort is **development/diagnostic** and must not be represented as a reliable estimate of real-world partner acceptance.

## Frozen inputs and evidence parity

- Same 24 candidate IDs and frozen proxy grades as the earlier experiment (four from each of six source types).
- `scripts/controlled-evidence-supplements.json` adds nine public, cited, organisation-specific summaries absent from the original model records. Each supplement explicitly avoids assuming acceptance or volumes.
- A packet is generated from saved state records and those supplements using `scripts/controlled-ranking-experiment.mjs --mode=prepare`. It includes IDs, names, source membership, existing directory evidence, added sources, location information if known and fixed rule-derived points. It does **not** contain reference grades or reviewer rationales.
- Every model receives the **same immutable packet** and question, except provider-specific execution differences. Full and selective AI treatments use **exactly the same saved AI outputs for any candidate they both assess**.
- Source-balanced, score-based order is frozen **before seeing AI results**. The first 12 of 24 candidates (two from each source) form the selective budget; the full budget covers all 24. With batches of four, selective uses the exact first three full-model calls. Batch context is identical, not merely similar.
- `sourceEvidence` must cite supplied evidence indices. Directory-only cases receive a low-evidence scoring ceiling to prevent category membership masquerading as proof of specific reuse. Model responses must provide a rationale and unresolved question. Invalid outputs fall back to rules and must be counted separately.
- Exact same numeric formula for **full blended AI** and **selective blended AI**: 50% original rule-derived suitability/evidence points plus 50% AI suitability/evidence points, with the same fixed proximity and recorded operations. The selective strategy differs **only** in which candidates receive that blend; all others retain the same original rule score.
- For context, we also compute the original **rules-only** baseline and a secondary **full AI without blending** score from the same predictions. This secondary strategy changes the fusion and is not the controlled full-versus-selective comparison.

## Principal metrics and limitations

- nDCG@10 and top-10 plausible candidates are descriptive on the existing reference, but **not** primary evidence of value: the label distribution contains only one grade 3, no grade 0 and entirely grade-1 parks versus grade-2 Community in Bloom entries.
- The main diagnostic is pairwise ordering **within source**. There are only **14 differently labelled within-source pairs** in this cohort; multiple pairs share partners, so neither a binomial independence assumption nor a narrow confidence interval would be valid. Across-source and overall agreement are reported separately.
- Examine actual contrasts and source evidence: Bewilder/MEOD, Nature Landscapes/KAF, Holy Innocents'/Horizon, and the several NEA waste-handling pathways. Model scores may reflect plausibility rather than signed operating arrangements.
- Model calls, provider-reported tokens and elapsed wall time are logged for the *same batches*, allowing an inference-effort comparison. Tokens across Codex and Qwen have different overheads/tokenisers; do not compare them directly as power or carbon. No energy/CO₂ reduction is measured.
- **Main remaining validity gap:** the assistant authored the original proxy labels and also selected/froze the extra public research. The supplement file was created before this inference rerun, but not independently collected by a second reviewer. The dataset remains small, non-random and source-dependent. Results are hypothesis-generating only, not sponsor validation or proof AI is superior.

## Reproducibility

The commands below record the original experiment in its feature-branch worktree. The packet-builder script, public-evidence supplements and tests are now also in this repository. The proxy-label file and generated packets/responses remain private, experiment-local ignored files and are not packaged here; without those exact fixtures the result table cannot be independently regenerated from this repository alone.

```powershell
npm test
node scripts/controlled-ranking-experiment.mjs --mode=prepare --state=data/state.json --review=data/proxy-review-labelled.json --out=data/controlled-packets-20261029.json
# Requires an authenticated Codex CLI. Raw inference files checkpoint after every successful batch.
node scripts/controlled-ranking-experiment.mjs --mode=infer --packets=data/controlled-packets-20261029.json --model=codex --out=data/controlled-codex-20261029.json
# Qwen requires a running local model endpoint, configured with QWEN_LLAMA_CPP_URL
node scripts/controlled-ranking-experiment.mjs --mode=infer --packets=data/controlled-packets-20261029.json --model=qwen --out=data/controlled-qwen-20261029.json
node scripts/controlled-ranking-experiment.mjs --mode=analyse --packets=data/controlled-packets-20261029.json --review=data/proxy-review-labelled.json --predictions=data/controlled-codex-20261029.json --limit=12 --out=data/controlled-codex-analysis-20261029.json
node scripts/controlled-ranking-experiment.mjs --mode=analyse --packets=data/controlled-packets-20261029.json --review=data/proxy-review-labelled.json --predictions=data/controlled-qwen-20261029.json --limit=12 --out=data/controlled-qwen-analysis-20261029.json
```

**Inference must never load the reference review file.** Only the separate analysis command reads the review labels. Generated local JSON under `data/` is ignored by Git. The returned packet and model-result hashes are checked before evaluation. The original experiment ran on `feature/evidence-calibrated-ranking-benchmark`; its later prototype integration is a separate code change and does not make the proxy labels CoffeeBot ground truth.
