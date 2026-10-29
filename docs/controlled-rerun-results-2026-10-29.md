# Corrected fixed-evidence ranking experiment — 29 October 2026

**Completed:** Both Codex and Qwen3.5 4B assessed all 24 frozen prospects using the same candidate evidence packets and the same assessment rubric. No source labels, priority grades or reviewer rationales were supplied during inference. Full and selective strategies for each model use exactly the same saved responses and scoring formula; selective uses predictions for the first 12 source-balanced candidates and rules for the remaining 12. All work stays on `feature/evidence-calibrated-ranking-benchmark`, not `main`.

**Validity label: DIAGNOSTIC, NOT INDEPENDENT VALIDATION.** The reference labels are still the assistant's own provisional outreach-priority judgements, with only 14 differently graded within-source candidate pairs. Some source categories are uniformly graded. The fresh facts were frozen before this rerun but are neither prospect acceptance data nor an independently blinded reference.

## Protocol and parity improvements

- Fixed 24 candidates, four from each of the six discovery sources; same historical state, same 24 original reference labels.
- Supplemented **nine organisations** with dated, attributed public source descriptions (factual supplements in `scripts/controlled-evidence-supplements.json`); this includes Bewilder's fungal by-products, MEOD's hydroponics **and mushroom-picking** activities, Nature Landscapes' nursery accreditation, KAF's rubber flooring, Holy Innocents' school garden, and Ento's waste processing/fee model.
- Frozen input hash (the public-evidence array, including original directory claims): `c1979e1641e07f242625f2464fc784081f0360c616a31171476c4eb29c626070`. Evidence packets contain no reference grades or reviewer rationales.
- Each model assessed **six groups of four candidates**, with identical prompts, evidence-index citation requirements, score bounds and quality caps for generic listings. Each returned **24/24 schema-valid answers** (schema validity does not independently establish semantic citation accuracy).
- Candidates were source-balanced and ordered before model outputs were observed. The first 12 (two per source) form the selected budget. Selective outputs reuse the **same 12 individual predictions and exactly the same first three batch contexts** as full inference.
- Full and selective blends apply **one identical formula**: half the original rules suitability/evidence subscore plus half the AI's suitability/evidence subscore, with fixed proximity and known operational components. No model estimates unverified kg, willingness or transport. An additional full-AI-without-blending score is reported as context, **not** a controlled alternative to selective blending.
- The category-rule baseline is the actual current source-based production scorer; it does **not exploit** the nine new factual supplements. Thus the controlled causal comparison here is primarily **full versus selective use of each model**, not an equal-complexity challenge between the best possible deterministic evidence parser and an LLM.

## Outcome against the frozen internal reviewer grades

| Method | Candidates receiving AI | nDCG@10 | All-pair agreement (155 pairs) | **Within-source agreement (14 pairs)** | Grade 2+ among top 10 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original category rules | 0 | **1.0000** | **91.29%** | 75.00% | **10** |
| **Full Codex blend** | 24 | 0.9184 | 83.55% | **100.00%** | 8 |
| **Selective Codex blend** | 12 | 0.9511 | **91.29%** | **96.43%** | 9 |
| Full Qwen3.5 4B blend | 24 | 0.8923 | 83.87% | 71.43% | 7 |
| Selective Qwen blend | 12 | 0.9314 | 86.77% | 71.43% | 8 |

The full-model, **no-blend sensitivity** uses the exact same predictions but removes rules from the first two dimensions:
- Codex: nDCG@10 **0.8892**, overall pairwise **78.06%**, within-source **100.00%**.
- Qwen: nDCG@10 **0.8532**, overall pairwise **70.97%**, within-source **64.29%**.

**Reading the result:** The older statement “rules-only is more accurate” is not supported as a business conclusion. Rules agree very well with source-structured proxy grades, but struggle to distinguish individual organisations within a category. With the enriched public evidence, Codex separated the within-source, differently graded pairs better than rules in this small set. Selective Codex retained nearly all of that differentiation, while matching rules' overall pairwise agreement. Qwen did not improve within-source ordering under the same task and input conditions.

**Not a proof of AI superiority:** Fourteen pairs are a sparse, dependent sample; several categories have no contrasting grades at all, the one grade-3 case has unique direct grounds evidence, and many prospect capacities, fees and consent decisions are unknown. The reviewer helped define the labels and extra research. A perfect 14/14 can easily change with independent reviewers and fresh businesses.

## Individual cases — why evidence matters

- **Bewilder versus MEOD (both SFA crop farms):** The existing source-based rules gave both **18**. Codex identified fungi and organic by-products as a plausible physical reuse route for Bewilder, while recognising that MEOD has hydroponic production and some mushroom activities. Neither has confirmed spent-grounds acceptance. On its 0–40 reuse scale, Codex gave Bewilder **30** and MEOD **22**. Qwen instead gave Bewilder **10** and MEOD **15**, illustrating that supplying equal facts does not guarantee model-quality convergence.
- **Nature Landscapes versus KAF (both LIAS):** Nursery accreditation contrasted with rubber/playground-flooring operations. Codex gave reuse scores **21 versus 6**; the rules' overall scores of **20 versus 17** were less discriminating and largely source-driven.
- **Holy Innocents' versus Horizon Primary (both MOE):** The former has documented school science-garden activity; the latter documents other recycling activities. Codex gave reuse scores **23 versus 14**, with school permission and capacity still unknown.
- **Tiong Lam versus other NEA candidates:** Listing mainly dry/powdered manufactured food materials does not confirm acceptance of wet spent grounds. Even where Codex notes possible material overlap, its reuse pathway must be verified. This matters more than the entity's presence in an NEA directory.

## Computational effort: exact batch reuse

These measurements sum the completed **same-model, same-prompt, same-batch** calls. Selective cost is calculated by keeping the actual first three completed batches of the full run; it was not billed as a second independent inference experiment.

| Provider | Budget | Calls | Valid assessments | Measured batch time | Input tokens | Output tokens | Sum of reported tokens |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Codex | Full, 24 cases | 6 | 24 | 97.5 s | 84,746 | 1,875 | 86,621 |
| Codex | Selective, 12 cases | 3 | 12 | 50.6 s | 42,448 | 927 | 43,375 |
| Qwen3.5 4B | Full, 24 cases | 6 | 24 | 298.3 s | 5,739 | 1,919 | 7,658 |
| Qwen3.5 4B | Selective, 12 cases | 3 | 12 | 148.5 s | 2,943 | 970 | 3,913 |

Selective Codex represents **48.1% less summed inference time** and **49.9% fewer reported tokens** than full Codex. Selective Qwen represents **50.2% less time** and **48.9% fewer reported tokens** than full Qwen. Different provider tokenisers, hosted versus local infrastructure, caching and runtime conditions make cross-provider tokens/time **non-equivalent energy or carbon metrics**. No measured joules or CO₂ outcomes are claimed.

## Interpretation and next product decision

**Do not discard AI or select a production-model winner based solely on these results.** They provide real, controlled evidence that Codex can interpret organisation-level facts and distinguish some same-source candidates, whereas the rules produce excellent category ordering on source-shaped proxy labels. A selective Codex strategy appears promising as an efficiency trade-off, *subject to evidence quality and an independent evaluation*.

The next meaningful test is not more weight tweaking against the same grades. It is a new case-balanced cohort with strong positive, negative and genuinely unknown examples **within every source**, verified public evidence packets for all candidates, blind second-reviewer checks or documented outreach outcomes, and evaluation of factual citation errors, feasibility assumptions, acceptance and repeatable kg/week. The new result does not excuse the prototype's current evidence-collection gaps: only nine cases had additional public research in these packets.

## Reproducibility / boundaries

- **Method:** [Controlled rerun methodology](controlled-rerun-methodology-2026-10-29.md).
- **Code:** `scripts/controlled-ranking-experiment.mjs` and `scripts/controlled-evidence-supplements.json`. `test/controlled-ranking-experiment.test.js` checks label-free packets, exact full/selective output reuse and rejection of inflated generic-listing scores.
- **Saved (Git-ignored) machine-readable inputs/results:** `data/controlled-packets-20261029.json`, `data/controlled-codex-20261029.json`, `data/controlled-qwen-20261029.json`, `data/controlled-codex-analysis-20261029.json`, `data/controlled-qwen-analysis-20261029.json`. Each model prediction file records evidence hash, provider, all 24 scored IDs, per-batch latency, token usage, citation indices and rationale.
- **Historical result:** [28 October benchmark](benchmark-2026-10-28-results.md) is withdrawn as a controlled strategy comparison; do not use its ranking numbers as the final model result.
- **Change isolation:** All files, tests and benchmark scripts remain in the feature branch. No edits to `main`, production `data/state.json` or staff relationship records.
