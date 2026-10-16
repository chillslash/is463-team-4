# Problem Statement — CoffeeBot Circularity Copilot

**Project:** IS463 Group Project (Team Second Shot)  
**Sponsor:** CoffeeBot  
**Status:** Working problem definition for the final prototype (16 October 2026)

## Context

CoffeeBot operates coffee machines whose used coffee grounds (spent coffee grounds, or SCG) accumulate as drinks are made. Riders collect grounds on their regular servicing rounds, approximately every two to three days. At headquarters, the grounds are spread out to dry and then stored in boxes until a partner can collect or receive them. Storage and rider capacity are limited.

Based on figures shared by CoffeeBot for the midterm (estimates, not audited measurements):

- Approximately **100–200 machines** are serviced.
- Each cup produces approximately **20 g of spent grounds**.
- Only **10–20% of collected grounds** are currently reused; the rest is stored or discarded.

SCG can potentially be reused in applications such as composting, horticulture, and other material uses, provided the recipient's requirements and handling conditions are met. CoffeeBot's immediate obstacle is not a lack of imaginable uses. It is the difficulty of securing **suitable, reliable, recurring recipients** before grounds accumulate.

## Existing workflow and pain points

1. **Uncertain supply:** CoffeeBot has machine cup-count data but does not yet use it systematically to plan the quantity of grounds available for reuse in upcoming periods.
2. **Partner discovery:** Finding organisations that can actually use the grounds requires manual research. Prospects vary in location, required quantity, collection schedule, use case, and handling requirements.
3. **Time-consuming outreach:** Staff must investigate prospects, explain how CoffeeBot's grounds are handled, and prepare tailored messages and follow-ups.
4. **Limited operational visibility:** Without a simple view of forecast supply, confirmed pickup capacity, partnership status, and actual handovers, surplus grounds may remain in storage or be disposed of.

### Sponsor feedback: a critical distinction

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

- **Earlier planning:** Estimate weekly available grounds from existing cup-count data and compare them with *confirmed* partner capacity.
- **Better discovery:** Surface potential recipients from traceable sources, including non-commercial recipients, while distinguishing plausible leads from verified interest.
- **Better-fit recommendations:** Explain recommendations using distance, quantity, regularity, intended use, logistics, and cost to CoffeeBot — and clearly display unknown information.
- **Lower administrative burden:** Assist staff with research and personalised outreach while preserving human approval.
- **More genuine reuse:** Record actual kilograms transferred and their stated intended use, rather than treating searches, emails, matches, or intentions as successful diversion.

## How success should be judged

### Operational and partnership measures

- Time to find and review a suitable candidate, and time to prepare outreach.
- Number of prospects contacted, trials started, and trials converted into regular partnerships.
- Confirmed recurring capacity (kg/week), actual handovers (kg), and staff-reported quality of recommendations.
- Fees and transport/logistics requirements, where known, so apparent reuse gains are not mistaken for low-cost outcomes.

### Material and sustainability measures

- **Reuse rate:** `kg actually reused / kg collected`, compared with CoffeeBot's indicative **10–20%** baseline.
- **Disposition:** Track collected, handed over for reuse, stored, and discarded grounds separately; avoid double-counting stock or unconfirmed transfers.
- **Carbon handprint (estimated):** `additional kg actually reused vs baseline × net avoided-disposal/reuse emissions per kg − additional emissions (e.g. transport, drying, software/AI)`.
- Where practical, report per **1,000 cups** (approximately **20 kg** of grounds using the current 20 g estimate), alongside absolute kilograms so efficiency and total impact do not get confused.

The disposal route, defensible emission factors, and some activity data are **not yet confirmed**. The prototype must mark carbon calculations as provisional rather than invent a precise CO₂e saving. More matches do **not** necessarily mean more reuse or better environmental outcomes.

## Boundaries and assumptions

- Use existing machine data if CoffeeBot can provide it; demonstrate with **clearly labelled sample data** otherwise. The midterm's **9,100 cups → 182 kg forecast, 140 kg confirmed capacity, 42 kg gap** is an illustrative scenario, not evidence of actual demand or confirmed new partners.
- CoffeeBot's grounds are described as **sun-dried**, but moisture levels are **not measured** in the midterm materials. Do not claim a moisture specification or suitability for a particular use without evidence.
- Candidate places are not automatically partner organisations. Discovery, willingness to accept SCG, fee terms, allowable uses, capacity, and repeatability are distinct questions.
- The system supports staff decisions; it does not autonomously commit CoffeeBot to pickups, send external communications without approval, or certify beneficial end use.
- Avoid depending on prohibited scraping. Prefer openly licensed datasets, permitted APIs, sponsor contacts, and manual verification, subject to each source's current terms.

## Validation questions for CoffeeBot

1. Who has the authority to approve SCG use at parks, gardens, or larger institutions, and which recipient types are realistically approachable?
2. What is an acceptable collection/handling fee, if any, and who normally bears transport costs?
3. Which SCG properties, drying/storage practices, and minimum/maximum quantities must be disclosed to a recipient?
4. Can sample or real cup counts and existing partner arrangements (capacity, frequency, location) be supplied?
5. What evidence counts as a confirmed handover and, separately, as grounds actually **reused** rather than merely collected?
6. Which data may be retained about prospective partners, and how should out-of-date information be revalidated?

## Basis

This document consolidates the **IS463 midterm presentation**, the professor's feedback (indicative grade A; strong problem analysis, workflow and handprint; request for tangible partner-discovery functionality), and subsequent sponsor feedback about fee-charging recipients and non-commercial possibilities. The proposed implementation details are not represented as approved sponsor requirements.
