# Provisional independent desk-review results — 27 October 2026

**Not CoffeeBot validation.** This is a single-reviewer, web-assisted *proxy* assessment of outreach priority, not partner willingness, accepted kg/week, repeatability, reuse or carbon impact. The 24 labels were frozen in `scripts/proxy-review-judgements.json` before generating any new model predictions. Review cases were selected without model scores: four per source.

## Reference labels

- **Priority 3:** 1 candidate, A1 Environment; official NEA reporting explicitly documents spent-coffee-grounds recovery.
- **Priority 2:** 11 candidates; plausible physical pathways for outreach but unverified capacity, acceptance and conditions.
- **Priority 1:** 12 candidates; related activity or site but low source-backed operational readiness.
- **Priority 0:** 0 candidates; there was insufficient negative evidence to call any completely unsuitable. An *unknown* fact was never coded as zero capacity.

Proxy labels combine saved records with supplementary public research. Because the reviewer knew the project design and source categories, this is **not an independently blinded external test** and should not be treated as sponsor ground truth.

## Measured deterministic baseline (24 labelled candidates)

| Metric | Result |
| --- | ---: |
| nDCG@10 | **1.0000** |
| Pairwise agreement | **0.9129** |
| Assessed candidates | 24 |
| Relevant among top 10 (priority 2–3) | 10 |
| Distinct numerical scores in sample | 10 |

Computed by `scripts/sponsor-ranking-evaluation.mjs` against the saved local state. This does **not** provide an AI comparison. The strong metrics also expose an evaluation-design limitation: the proxy rubric still tends to reward source categories the deterministic rules already favour. A top-10 result of 1.0 with one priority-3 case and eleven priority-2 cases is weak evidence of fine-grained operational discrimination.

## Source-backed within-category contrasts

- **Bewilder vs MEOD:** Both entered as licensed crop farms and score roughly 18. Bewilder explicitly develops products from fungi and organic by-products ([company](https://www.bewildersg.com/aboutus)), whereas MEOD documents predominantly hydroponic growing ([company](https://meod.com.sg/)). The proxy review prefers further investigation of Bewilder, but neither has confirmed coffee-ground uptake.
- **Nature Landscapes vs KAF Resources:** Both entered from the landscape industry directory. NParks identifies Nature Landscapes as an accredited nursery ([NParks](https://cuge.nparks.gov.sg/resources/nursery-accreditation-scheme/)); KAF's own description centres on rubber and playground flooring ([KAF](https://kafresources.com.sg/about-us/)). Membership alone does not make them equally promising grounds recipients.
- **Holy Innocents' vs Horizon Primary:** The former documents school science-garden activity ([school](https://www.holyinnocentspri.moe.edu.sg/cca/cca-environmental-science/)); Horizon describes recycling drives involving other materials ([school](https://www.horizonpri.moe.edu.sg/our-experiences/moral/er3/)). Neither school has given permission or committed capacity.
- **A1 Environment:** NEA describes real spent-grounds recovery into materials and compost ([NEA](https://www.nea.gov.sg/media/news/news/index/closing-the-food-resource-loop-and-driving-sustainability-at-the-inaugural-food-resource-valorisation-awards)). Fees and additional uptake remain to be checked.
- **Ento Industries:** SMU describes food-waste conversion using black soldier flies and an often paid intake model ([SMU](https://news.smu.edu.sg/news/2025/08/27/trash-treasure-how-ento-industries-developed-growing-sustainable-food-waste)). It is a plausible technical recipient but neither free collection nor grounds acceptance is established.

**Completed 28 October benchmark:** [Full Codex, full Qwen, rules-only and selective-hybrid results](benchmark-2026-10-28-results.md). The experiment ran on all 24 frozen proxy cases; rules-only had the highest agreement with internal labels, but operational partner acceptance remains unvalidated.

## Interpretation / next comparison

The proxy experiment does **not** overturn the earlier 36-case source-tier results, nor establish that rules beat LLMs operationally. The most useful diagnosis is that some same-source records deserve different attention, and an LLM should be tested for its ability to use *specific, cited* evidence rather than just source category.

The now-completed Codex/Qwen comparison (linked above) followed this procedure; future replications must (1) use the same 24 frozen IDs; (2) show both methods the same evidence snapshot; (3) keep proxy grades out of prompts; (4) record inference latency, tokens, errors and coverage; and (5) evaluate using common complete records. Where local providers are unavailable, report that explicitly; never replace missing predictions with invented scores or claim an LLM lost without running it.

No production ranking, partner state or discovery reset is justified by this exploratory result alone.
