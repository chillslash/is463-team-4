# Problem Statement — CoffeeBot Circularity Copilot

**Project:** IS463 Group Project (Team Second Shot)  
**Sponsor:** CoffeeBot  
**Status:** Updated 27 October 2026; CoffeeBot priorities partly confirmed; numerical thresholds remain open.

## Context

CoffeeBot operates coffee machines whose used coffee grounds (spent coffee grounds, or SCG) accumulate as drinks are made. Riders collect grounds on their regular servicing rounds, approximately every two to three days. At headquarters, the grounds are spread out to dry and then stored in boxes until a partner can collect or receive them. Storage and rider capacity are limited.

Earlier midterm assumptions (historical estimates, superseded by CoffeeBot’s later samples):

- Approximately **100–200 machines** are serviced.
- An earlier 20 g per purchased cup assumption is now superseded by **15 g per coffee-based drink**, with **60% of all drinks assumed coffee-based**.
- Only **10–20% of collected grounds** are currently reused; the rest is stored or discarded.

SCG can potentially be reused in applications such as composting, horticulture, and other material uses, provided the recipient's requirements and handling conditions are met. CoffeeBot's immediate obstacle is not a lack of imaginable uses. It is the difficulty of securing **suitable, reliable, recurring recipients** before grounds accumulate.

## Existing workflow and pain points

1. **Uncertain supply:** CoffeeBot has machine cup-count data but does not yet use it systematically to plan the quantity of grounds available for reuse in upcoming periods.
2. **Partner discovery:** Finding organisations that can actually use the grounds requires manual research. Prospects vary in location, required quantity, collection schedule, use case, and handling requirements.
3. **Time-consuming outreach:** Staff must investigate prospects, explain how CoffeeBot's grounds are handled, and prepare tailored messages and follow-ups.
4. **Limited operational visibility:** Without a simple view of forecast supply, agreed Regular-partner weekly intake, partnership status, and actual handovers, surplus grounds may remain in storage or be disposed of.

### Sponsor feedback: a critical distinction

**CoffeeBot’s October clarification:** meaningful intake quantity is a main selection criterion; convenient collection/delivery, frequency, consistency and intended reuse also matter. CoffeeBot has **no immediate deal-breakers or restricted reuse categories**, but wants to understand the partner’s reuse purpose. Collection from HQ is convenient; delivery is possible along existing routes or where reasonably accessible. Current outreach covers sustainability and environmental organisations and educational institutions; inbound approaches are welcome.

**Five sponsor-reported location estimates:** Republic Polytechnic 700; 100 Pasir Panjang 500; Changi General Hospital 1,000–1,200; NTU 800–1,000; Singapore Business Federation 600–800 **total beverages/month**. That is **3,600–4,200 drinks/month**, translating at 60% coffee and 15 g per coffee to **32.4–37.8 kg/month potentially generated**, not actual grounds collected, transferred or reused. CoffeeBot also reported an approximately **20 kg one-off Temasek Polytechnic research donation**, which supports considering research uses without implying repeatable capacity.


Not every organisation willing to take grounds is a **reuse partner**. Some commercial organisations may charge CoffeeBot to accept the material, making the arrangement closer to paid waste management than the free or low-cost circular reuse CoffeeBot seeks.

The sponsor encouraged looking beyond generic company matching towards plausible end users such as **community gardens, parks, NParks-related sites, zoos, and Gardens by the Bay**. These are **candidate categories or leads, not confirmed accepting partners**. The responsible organisation, authority to approve use, applicable handling requirements, and willingness to accept grounds must all be checked.

The system therefore should not maximise the *number of matches*. It should help identify **credible, operationally feasible, preferably regular and low-cost reuse opportunities**. A paid arrangement should be flagged and assessed, not silently presented as a successful free reuse partnership.

## Core problem statement

> CoffeeBot lacks an efficient way to discover, evaluate, and maintain regular, low-cost reuse partnerships for its spent coffee grounds. Without reliable recipients lined up against forecast supply, excess grounds accumulate in storage or are discarded, while staff spend considerable time on manual research and outreach.

**How might we help CoffeeBot anticipate surplus grounds, find and contact credible reuse prospects ahead of time, and track real handovers — without substantially increasing staff workload?**

## Who the solution serves

- **Primary user:** CoffeeBot staff coordinating reuse partners, outreach, collections, and tracking.
- **Indirect beneficiaries:** CoffeeBot's operations team and organisations that can put grounds to beneficial use.
- **Decision-makers:** Staff retain responsibility for vetting prospects, approving communications, confirming terms, and recording whether grounds were actually handed over for reuse.

## Desired outcomes

- **Earlier planning:** Estimate weekly available grounds from existing cup-count data and compare them with *agreed Regular-partner* weekly capacity.
- **Better discovery:** Surface potential recipients from traceable sources, including non-commercial recipients, while distinguishing plausible leads from verified interest.
- **Better discovery prioritisation:** Use pre-contact suitability, organisation-specific evidence and distance to decide who is worth contacting; then capture quantity, regularity, intended use, logistics, fees and willingness as relationship facts instead of guessing them from public listings.
- **Lower administrative burden:** Assist staff with research and personalised outreach while preserving human approval.
- **More genuine reuse:** Record actual kilograms transferred, associate potential and agreed reuse with the partner profile, and do not count searches, emails, matches or intentions as demonstrated reuse.

## How success should be judged

### Operational and partnership measures

- Time to find and review a suitable candidate, and time to prepare outreach.
- Number of prospects contacted, initial pilot arrangements started, and pilots converted into regular partnerships.
- Agreed recurring capacity (kg/week), actual handovers (kg), and staff-reported quality of recommendations.
- Fees and transport/logistics requirements, where known, so apparent reuse gains are not mistaken for low-cost outcomes.

### Material and sustainability measures

- **Longer-term reuse rate (not implemented):** true beneficial reuse would require kilograms actually reused divided by kilograms collected in the same period. CoffeeBot's indicative **10–20%** baseline cannot be verified from handover records alone.
- **Material accounting:** The current prototype records handovers only; a future study would need comparable collected, stored, discarded, and beneficially reused quantities to measure disposition without double-counting.
- **Carbon handprint (research only, not calculated in app):** `additional kg actually reused vs baseline × net avoided-disposal/reuse emissions per kg − additional emissions (e.g. transport, drying, software/AI)`.
- Where practical, report per **1,000 total drinks** (approximately **9 kg** under the 60% × 15 g factors), as well as absolute kilograms.

The disposal route, defensible emission factors, and some activity data are **not yet confirmed**. The prototype must mark carbon calculations as provisional rather than invent a precise CO₂e saving. More matches do **not** necessarily mean more reuse or better environmental outcomes.

## Boundaries and assumptions

- The new demo default of **900 total drinks/week → 8.1 kg projected grounds/week** is based on the midpoint of CoffeeBot’s five disclosed locations. Its **6.5 kg/week fictional Regular intake** and **1.6 kg/week illustrative gap** are *not* actual commitments. The old 9,100 × 20 g = 182 kg example is superseded.
- CoffeeBot's grounds are described as **sun-dried**, but moisture levels are **not measured** in the midterm materials. Do not claim a moisture specification or suitability for a particular use without evidence.
- Candidate places are not automatically partner organisations. Discovery, willingness to accept SCG, fee terms, allowable uses, capacity, and repeatability are distinct questions.
- The system supports staff decisions; it does not autonomously commit CoffeeBot to pickups, send external communications without approval, or certify beneficial end use.
- Avoid depending on prohibited scraping. Prefer openly licensed datasets, permitted APIs, sponsor contacts, and manual verification, subject to each source's current terms.

## Validation questions for CoffeeBot

1. Who has the authority to approve SCG use at parks, gardens, or larger institutions, and which recipient types are realistically approachable?
2. What are CoffeeBot’s regular delivery routes and how much additional travel makes delivery inconvenient compared with partner collection?
3. Which SCG properties, drying/storage practices, and minimum/maximum quantities must be disclosed to a recipient?
4. Can CoffeeBot supply measured coffee share, collected/discarded grounds, and actual recurring partner intakes over comparable time periods?
5. What evidence counts as a confirmed handover and, separately, as grounds actually **reused** rather than merely collected?
6. Which data may be retained about prospective partners, and how should out-of-date information be revalidated?

## Basis

This document consolidates the midterm, professor feedback and CoffeeBot’s 27 October operational clarification. Delivery routes, numerical intake thresholds and final reuse verification remain open.
