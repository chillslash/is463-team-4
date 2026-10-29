# Methodological audit: 28 October ranking benchmark

**Conclusion: do not treat the earlier “rules-only wins” result as a valid comparison of CoffeeBot partner-selection quality.** This audit was prompted by a challenge to the experimental setup. It reanalyses the *saved predictions* and frozen reference labels without running any new model inference, changing app scores or altering the source database.

The benchmark's numerical calculations were reproducible, but its design does not isolate the claimed effect of AI. This is an **evaluation-validity problem**, not evidence that LLMs cannot help find partners.

## 1. Source-category confounding

The reviewer-assigned reference tiers and deterministic scoring both depend substantially on the discovery source.

| Discovery source | Grade 1 | Grade 2 | Grade 3 |
| --- | ---: | ---: | ---: |
| NParks Parks | **4** | 0 | 0 |
| NParks Community in Bloom | 0 | **4** | 0 |
| MOE School Programmes | 3 | 1 | 0 |
| LIAS Landscapers | 1 | 3 | 0 |
| SFA Crop Farms | 3 | 1 | 0 |
| NEA Food Waste Recycling | 1 | 2 | 1 |

No grade-0 cases were present; only one partner had grade 3. This creates a dataset in which a simple source-category rule can achieve exceptional top-10 accuracy even if it fails to recognise the differences between two farms, two schools, or two landscaping companies. This is **construct overlap and reference-label bias**, not evidence of a software bug leaking label values directly into prediction.

The standard 155 differently graded partner pairs over-represent cross-source comparison: **141 across different sources versus only 14 within the same source**.

### Recomputed pairwise accuracy

| Method | All 155 pairs | 141 cross-source pairs | **14 within-source pairs** |
| --- | ---: | ---: | ---: |
| Rules-only | 91.29% | 92.91% | 75.00% |
| Full Codex | 70.97% | 69.50% | **85.71%** |
| Selective Codex hybrid | 88.71% | 90.07% | 75.00% |
| Full Qwen3.5 4B | 61.29% | 63.48% | 39.29% |
| Selective Qwen hybrid | 91.29% | 92.91% | 75.00% |

This **reverses the rules-versus-Codex ordering** on the small, more relevant within-source subset. There are only 14 pairs and those comparisons share partners, so they are neither 14 independent trials nor a sound generalisation estimate. Still, the overall ranking does not answer the user-relevant question on its own.

## 2. Reference reviewer knew more than the candidate models

The 24 provisional labels were assigned by an assistant after organisation-specific desk research. The separate `scripts/proxy-researched-facts.json` contains factual supplements for **nine of those labelled organisations**, including:

- Bewilder: actual fungal/mycelium cultivation and use of organic by-products ([organisation](https://www.bewildersg.com/aboutus)).
- MEOD: hydroponic cultivation ([organisation](https://www.meod.com.sg/)).
- KAF: rubber/playground flooring, not an ordinary horticulture service ([organisation](https://kafresources.com.sg/about-us/)).
- Holy Innocents' Primary: school science-garden activity ([school](https://www.holyinnocentspri.moe.edu.sg/cca/cca-environmental-science/)).
- City Garden and Nature Landscapes: documented nursery accreditation ([NParks](https://cuge.nparks.gov.sg/resources/nursery-accreditation-scheme/)).
- Ento: black-soldier-fly food-waste processing and an often fee-based intake model ([SMU](https://news.smu.edu.sg/news/2025/08/27/trash-treasure-how-ento-industries-developed-growing-sustainable-food-waste)).

The frozen model inputs were generated exclusively from `data/state.json` with `sourceFacts`; **the supplementary fact file was not supplied**. This penalises a model for missing information the reviewer already used. Nine is a count of explicit supplementary research files, **not necessarily the full extent of the informational mismatch**.

The sample also illustrates the fallibility of the labels: MEOD's current public website mentions **mushroom-picking as well as hydroponic vegetables**, so interpreting it as categorically incompatible with potential growing-substrate applications is too strong. Coffee-ground acceptance is unconfirmed for either method. Even the original human judgement needs checking against complete evidence.

## 3. Full AI versus hybrid was not a controlled strategy experiment

The original runner:
- Sends **full AI** the legacy `assessmentPrompt()` with a three-part numeric rubric; validates with `validateAssessment()`, and maps its two relevant numerical scores directly onto the 60 points available for suitability and source evidence.
- Sends **selective hybrid** a different `evidencePrompt()` requiring citation indices and material-specific source claims; validates with `validateEvidenceAssessments()`; blends AI with rule-derived scores at **50:50**.
- Only sends partners to hybrid AI if the current source record passes a stringent evidence gate; in the 24-case benchmark **only four NEA partners qualified**. Qwen returned just **one** accepted assessment, leaving 23 hybrid scores identical to rules-only.

Therefore, the groups differ in **model instruction, response schema, rejection rules, scoring transformation, selected cases and inference budget simultaneously**. A difference cannot be attributed to *selective versus full* AI inference, and a cost comparison is not an apples-to-apples estimate of unchanged inference quality.

The legitimate conclusion is narrower: the **implemented evidence-gated fallback** spent fewer reported inference resources on this dataset than the legacy full-LLM baseline, mostly because it assessed or accepted very few candidates. It has **not demonstrated better lead identification**.

## 4. Mismatch with CoffeeBot's operational objective

Sponsor priorities include intake quantity, dependable frequency, convenient handover and intended reuse. Those are almost always unknown in the collected leads. The frozen labels use source-material plausibility instead and contain no verified acceptance, recurring capacity or collection results.

A top-10 ranking of likely gardening/waste-processing categories therefore cannot establish which organisations would be useful partners, even if the top-10 nDCG is perfect.

**Update, 29 October:** The [controlled rerun](controlled-rerun-results-2026-10-29.md) corrected fixed-evidence and full-versus-selective prompt/fusion confounds. It remains diagnostic because the same internal labels were retained. The following recommendations still apply to independent validation.

## Required replacement experiment (do not tune on this frozen proxy set)

1. **Separately assess candidate discovery and partner ranking.** Source coverage, duplicates and finding relevant organisations are discovery metrics. Partner ordering is a distinct inference task.
2. **Freeze source-evidence packets before prediction.** Each candidate gets the *same* organisation-specific, attributed public facts for every method. Distinguish observed facts from inferred pathways, permission, quantity and fees. Include both promising and difficult cases **within each directory** (e.g. Bewilder/MEOD, Nature Landscapes/KAF, gardening school/non-gardening school) rather than just sampling balanced source categories.
3. **Use a single scoring prompt, validator and numeric fusion for full AI versus selective AI.** For a fair comparison, a candidate selected by both must receive the *same* assessment. A saved per-candidate inference result can be reused to compare selection policies without batch/prompt confounding. Any unassessed candidates use the *same* defined fallback.
4. **Evaluate citation correctness and within-source distinction first.** Separately report assessment coverage, reviewer-checkable reuse rationale, false positives, `within-source pairwise`, top-K, unknowns, and actual outreach suitability. Consider uncertainty/blinded multi-reviewer labels or a later held-out cohort. Treat low-context records as **unassessable** where appropriate rather than forcing grades.
5. **Only then compare computational effort.** Model invocation count, input/output tokens and elapsed time can be compared under the *same* prompts and acceptance criteria. Actual energy/CO2 need separate measurement.
6. **Keep this cohort diagnostic-only.** Any revised labels or weights derived from its errors make it a development sample, not independent evidence of generalisation. Independent sponsor acceptance/operational outcomes are still unavailable.

## Audit code, inputs and interpretation

Run `node scripts/ranking-benchmark-audit.mjs --state=data/state.json --review=data/proxy-review-labelled.json --codex=data/proxy-codex-completed-20261028.json --qwen=data/proxy-qwen-full-vs-hybrid-20261028.json --out=data/ranking-benchmark-audit-20261028.json`.

This checks the saved 24 source records, source-dependent reviewer grades, within/across-source agreement, and which reference cases have a separately stored research supplement. It does **not** run any model, manufacture new independent ground truth, or declare a winner.

**Revised status:** The full 28 October *legacy benchmark execution* was technically completed. Its headline model selection is **methodologically inconclusive** for CoffeeBot operations, and the cost difference is only a measurement of the different workflows actually executed.
