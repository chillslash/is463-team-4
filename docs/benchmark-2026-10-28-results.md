# Partner ranking benchmark, 28 October 2026

**Status:** Completed exploratory comparison on the existing 24-case, assistant-labelled proxy cohort. All five approaches generated a score for all 24 partners. The work and results are in `feature/evidence-calibrated-ranking-benchmark`; nothing was merged into `main`.

## Evaluation question

Does applying a large AI model to every candidate, or using a smaller number of evidence-grounded AI assessments, improve the ordering of potential CoffeeBot outreach leads sufficiently to justify the additional inference?

The reference labels are **not independent CoffeeBot or observed acceptance judgements**. They were frozen by an assistant desk review on 27 October. Labels reflect source-evidence plausibility and limited operational judgement; they cannot establish actual capacity, willingness, repeatability, transport, fees, or beneficial end use.

### Frozen inputs

- 24 prospects selected without model scores, across six original discovery source families (four per source).
- Reviewer priority distribution: **12 grade 1, 11 grade 2, one grade 3, zero grade 0**. Grade 3 is A1 Environment. The lack of grade-0 cases and the single strong lead materially limit discrimination.
- Historical saved source snapshot, not the live UI's subsequently discovered state; this avoids changing the cohort during inference.
- **Identical saved candidate records** for all approaches. The two AI strategies use different instructions and evidence-validation constraints by design, so the comparison evaluates *strategies*, not identical prompts or pure model quality.
- Baseline scoring uses current default weights: suitability 30, source evidence 30, proximity 5, recorded operations 35. The AI strategies cannot award unverified operational capacity.
- Only **four of the 24 candidates** (A1 Environment, Life Lab Resources, Tiong Lam Supplies, Ento Industries) have qualifying material-specific public source claims under the new evidence-validation gate. All are NEA-source prospects. The remaining 20 hybrid scores are rule-based.
- Raw results, token usage and model errors are saved locally under Git-ignored `data/`, not committed as live contact or partner records.

| Frozen file | SHA-256 |
| --- | --- |
| `data/state.json` | `5E07F6EFC353A1DA98ADFB9205C81410AF0C62EAFD94B1CF042BB73B1E89015B` |
| `data/proxy-review-labelled.json` | `F3035DDCF183C5C2E8B9693F62E86E77897BB45C6DE5F0B04625A9FC5CE3C330` |

## Ranking outcomes

| Ranking strategy | Valid scores | nDCG@10 | Pairwise agreement | Grade 2+ in top 10 | nDCG over all 24 |
| --- | ---: | ---: | ---: | ---: | ---: |
| **Rules-only** | **24/24** | **1.0000** | **91.29%** | **10** | **0.9948** |
| Full Codex | 24/24 | 0.8826 | 70.97% | 7 | 0.9672 |
| Selective Codex hybrid | 24/24 | 0.9659 | 88.71% | 9 | 0.9922 |
| Full Qwen3.5 4B | 24/24 | 0.7522 | 61.29% | 6 | 0.8840 |
| Selective Qwen hybrid | 24/24 | 1.0000 | 91.29% | 10 | 0.9948 |

**Interpretation:** Against these frozen proxy grades, rules-only was strongest. Selective hybrids preserved most of its ranking quality. The Qwen hybrid had the exact same ordering metrics because its one valid assessment did not change the relevant ordering. It would be false to interpret this as AI improving ranking quality. Similarly, an nDCG@10 of 1.0 is close alignment with **our limited proxy reference**, not proof of optimal real-world partners.

### Where rankings disagreed

- A1 Environment (grade 3) remained the highest-ranked rules and full Codex lead. Full Qwen ranked Life Lab Resources (grade 2) above A1.
- Tiong Lam Supplies (grade 1) moved to **fourth under full Codex** and **third under full Qwen**, ahead of several grade-2 prospects. The NEA source lists dry/manufactured food streams, not an explicitly confirmed separated-coffee-grounds pathway.
- The **Codex hybrid** applied validated AI assessments to all four eligible NEA prospects. Their score changes versus rules were A1 **57→55**, Life Lab **21→26**, Tiong Lam **15→19** and Ento **21→27**. This slightly reduced top-ten relevance against our grades: 9 rather than 10 grade-2+ prospects.
- The **Qwen hybrid** received only one valid citation-backed assessment out of four: A1 **57→56**. The other three eligible leads retained rule-based scores.
- Case-specific researched facts underpinning some proxy labels, such as Bewilder's fungi/by-product work and MEOD's hydroponics, **were not present in the frozen input records fed to these models**. Thus this experiment is a source-record quality baseline; it does not fairly test the value of deeper organisation-specific evidence research.

## Computational measurements

| Strategy | AI calls | Valid AI assessments | Elapsed inference wall time | Provider input tokens | Provider output tokens | Total reported tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Rules-only | 0 | 0 | Not timed as an inference call | 0 | 0 | 0 |
| Full Codex | 7 attempted, 6 completed | 24 | 141.3 s | 86,022 | 2,015 | 88,037 |
| Selective Codex hybrid | 1 | 4 | 28.2 s | 14,208 | 504 | 14,712 |
| Full Qwen3.5 4B | 6 | 24 | 316.3 s | 6,968 | 2,196 | 9,164 |
| Selective Qwen hybrid | 1 | 1 | 30.1 s | 1,010 | 106 | 1,116 |

- Codex's sixth full-AI batch initially failed with **HTTP 429 Too Many Requests**. After the service recovered, the runner **resumed its prior 20 valid assessments**, completed the last four and then executed the hybrid. The failed call (5.5 s) is included in attempted-call count and elapsed time. No fabricated full-model scores or failed hybrid results are counted.
- Codex reports **11,264 cached input tokens** in its full assessment measurements and **11,264 cached input tokens** in its selective run. The total reported tokens above include cached input; this is not a cost or energy calculation.
- On this laptop and this cohort, the Qwen selective run used **90.5% less measured inference wall time** and **87.8% fewer model-reported tokens** than full Qwen; Codex selective used roughly **80.1% less wall time** and **83.3% fewer reported tokens** than full Codex (including Codex's failed call).
- Codex is a hosted CLI model and Qwen a local CPU model. Provider-specific tokenisations, system/context overhead, caching, inference hardware and elapsed times **are not directly comparable energy or CO₂ measures**. No power, joules, emissions or full lifecycle impact were measured.

## What this establishes and what it does not

**Established:** The complete comparison has actually been executed on a frozen cohort. Both full models produced 24 validated scores. The new evidence-gated hybrid works and conserves inference calls by reverting to rules when facts are inadequate. Codex performed selective assessment on four eligible cases; Qwen returned one valid cited assessment. Benchmarks and regression tests are reproducible without changing partner lifecycle data.

**Not established:** That rules are better at finding willing real partners, that selective AI creates better leads, that the AI-research component is sufficiently capable, or that a particular approach reduces carbon emissions. Reviewer labels share some of our screening assumptions; also, public source-directory membership remains weaker than researched organisation-specific evidence.

**Decision:** Keep this implementation **experimental in the feature branch** rather than promoting AI-based numerical scores or merging into `main` solely on these numbers. The next discriminating experiment should first produce a *source-backed enrichment snapshot* for the same kinds of organisations, including both promising and negative examples within a category; freeze an evaluation cohort with reviewer access to the same factual evidence; then compare rules, full AI and selective AI on the **same evidence budget**, inspecting specific false positives and practical outreach decisions. Sponsor sign-off and real uptake remain separate later validation gates.

## Files and reproducibility

- Scripts: `scripts/proxy-ranking-experiment.mjs`, `scripts/sponsor-ranking-evaluation.mjs` and `src/evidence-review.js`.
- Frozen reference: `scripts/proxy-review-judgements.json`; locally materialised labelled review in `data/proxy-review-labelled.json`.
- Saved machine-readable results (Git-ignored):
  - `data/proxy-rules-20261028.json`
  - `data/proxy-codex-full-vs-hybrid-20261028.json` (initial partial run; Codex hybrid in this file **did not execute** and must not be cited)
  - `data/proxy-codex-completed-20261028.json` (complete, resumed results)
  - `data/proxy-qwen-full-vs-hybrid-20261028.json` (complete results)

To rerun, use the commands in [AI hybrid design](ai-hybrid-design.md) with the frozen data paths and a configured Codex CLI or running local Qwen endpoint. Results from a new source snapshot are a new experiment and should be labelled separately.
