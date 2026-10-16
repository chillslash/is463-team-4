# Prototype — CoffeeBot Circularity Copilot

**Project:** IS463 Group Project (Team Second Shot)  
**Status:** Proposed final-prototype specification; technical choices can be revised after testing  
**Companion:** [Problem statement](./problem-statement.md)

## Purpose

Turn the midterm's five-screen clickable concept into a **working, connected demonstration**, especially around the professor's main question: **where partner recommendations come from and how partner discovery works in practice**.

The system is a staff-facing assistant for finding **credible, preferably low-cost recurring reuse partners**, not a waste-disposal marketplace or an autonomous matchmaking agent. The priority is a convincing end-to-end workflow rather than elaborate infrastructure.

## Core user journey

1. **This Week — forecast supply:** Import or enter cup counts; estimate spent grounds using an adjustable default of **20 g/cup**. Display upcoming estimated kilograms, confirmed existing pickup capacity, and the projected surplus. Distinguish forecast figures from actual collected amounts.
2. **Find Partners — discover and assess:** Search supported sources for relevant sites/organisations (e.g. community gardens, urban farms, park-related contacts, horticulture operators), add leads to a local shortlist, then apply transparent filters and ranking. Display source and verification status for each lead.
3. **Outreach Draft — prepare, don't auto-send:** Staff select a lead and generate a personalised email and short reuse/handling note from **approved CoffeeBot facts** and sourced partner facts. Staff can edit and approve it before manually sending or marking it as sent.
4. **Pipeline — manage relationships:** Track leads through candidate → contacted → replied → trial → regular partner, with rejected/closed statuses where appropriate. Maintain next-action reminders and distinguish potential from confirmed capacity.
5. **Log Handover — record outcomes:** Log date, partner, kilograms transferred, intended use, and supporting confirmation. Update the dashboard and sustainability metrics only from qualifying records; do not count outreach or forecast allocations as actual reuse.

A simple sample scenario, reused from the midterm: **9,100 cups × 20 g = 182 kg expected**, **140 kg confirmed by current partners**, so **42 kg projected gap**. The prototype should find prospects for that gap, let staff assess one, draft outreach, and progress that lead through a **simulated** trial and handover. Clearly label scenario data and simulations; a demo must not imply a prospect has agreed to receive grounds.

## Partner discovery: proposed design

### Sources

Use a **small curated, maintainable prospect database**, populated from a mixture of:

- **Sponsor-provided / manually entered leads:** Existing CoffeeBot contacts and organisations staff have verified.
- **Official/open geographical data:** For example, suitable Singapore parks or facilities records from publicly available datasets such as [data.gov.sg](https://data.gov.sg/). A mapped park is a potential *site*, not proof its manager accepts coffee grounds.
- **Permitted place-search APIs:** For example, Google Places API (or an alternative with appropriate usage/storage rights) to search categories such as community gardens, nurseries and urban farms. Use official APIs subject to their pricing, attribution, caching/storage limits and other terms; **do not assume Maps pages can be freely scraped**.
- **Optional AI assistance:** Suggest search terms, categorise retrieved results, summarise credible evidence, and prepare questions for verification. AI must not fabricate acceptance, capacity, fees, contact details, or source evidence.

**Proposed behaviour:** Seed the database with a few real, sourced prospects; allow staff to discover/import more when needed; retain staff corrections and verification notes. Periodic refresh can be added later. This is preferable to making the LLM invent fresh partners for every query, but remains a design proposal pending implementation.

### Two separate stages

**A. Discover a lead.** Identify a real site or organisation with a plausible beneficial use for SCG. Record the source URL or identifier and the reason it might be relevant. Flag missing details. For institutional sites (e.g. NParks-managed parks, zoos, Gardens by the Bay), distinguish the physical site from the organisation/contact empowered to approve a partnership.

**B. Verify and rank fit.** Evaluate suitability using known requirements. A lead becomes a *confirmed partner* only after staff verify willingness, operational terms, and recurring/one-off capacity. Recommendations may include unverified leads, but must display their status conspicuously.

### Ranking criteria (transparent, revisable)

| Criterion | What to consider | Unknown-data handling |
|---|---|---|
| Potential reuse | Plausible composting, gardening, soil amendment or another appropriate application | Show intended use as *potential*, not confirmed |
| Quantity | Candidate's verified or estimated capacity versus surplus kg | Do not invent capacity; treat as unverified |
| Regularity | Weekly/recurring use preferred over one-off acceptance | Mark as unknown until checked |
| Location and logistics | Distance from relevant CoffeeBot collection/storage point, pickup/delivery needs | Use approximate distance if that is all that is available |
| Cost to CoffeeBot | Acceptance fees, transport and handling costs; prefer free/low-cost arrangements | Mark fee as unknown, never assume free |
| Evidence and readiness | Data provenance, verified contact, stated willingness, trial history | Prioritise verified facts, with clear flags for unverified leads |

Start with simple **rules and explainable ordering**, not an opaque AI score. Hard incompatibilities (e.g. unacceptable handling requirements or prohibitive fees) should be flagged before scoring. Unknown information should create a **question to verify**, not a false positive. Do not silently exclude paid arrangements: surface the trade-off so CoffeeBot can decide if exceptional benefits justify the cost.

### Minimum prospect fields

- `name`, `entity_type` (site/organisation), `category`, `location`, `source`, `source_checked_at`.
- `potential_use`, `verification_status` (unverified / contacted / verified), `decision_maker_or_contact` where known.
- `capacity_kg_per_week`, `frequency`, `collection_mode`, `handling_requirements`, `acceptance_fee`, each nullable/unknown.
- `notes`, `last_verified_at`, and optionally parent organisation / managed site linkage.

Avoid storing unnecessary personal information. Let staff edit a prospect and retain the reason for a recommendation.

## Other features

### Forecast and gap calculation

- Input: cup counts by machine/day/week, using the same 20 g/cup assumption as the midterm unless CoffeeBot supplies a better factor.
- Output: `forecast kg = forecast cups × grams_per_cup / 1000`.
- `projected gap kg = max(0, forecast kg − confirmed partner capacity kg)` for the same time window.
- Confirmed capacity is not the same as potential capacity, and actual collections may differ from forecasts.
- For the demo, a CSV upload or small seeded dataset is acceptable if real IoT access is unavailable. **Do not claim a live integration without one.**

### Outreach

- Use known partner activity and *approved, accurate* CoffeeBot handling details.
- State that grounds are dried by CoffeeBot; **do not assert tested moisture levels**.
- Suggest a low-risk trial where appropriate, but don't promise capacity, deliveries, food-safe use, or agronomic benefit.
- Produce an editable message, recipient-specific questions (fees, acceptable condition, kg/week, pickup frequency), and a short reuse-information note.
- Human approval before external communication. Sending email via an API is **not** required for the MVP.

### Tracking and material accounting

- Store outreach and status changes, confirmed capacities, scheduled pickups, and logged actual transfers separately.
- A handover record should contain `date`, `partner`, `kg`, `intended_use`, and `confirmation/evidence_status`.
- Dashboard: total collected, reused/confirmed transfer (clearly defined), stored, discarded, and reuse rate over a chosen window.
- A transfer is not automatically proof of final beneficial use. If ultimate reuse cannot be verified, label it as *handed over for intended reuse* rather than *verified reused*.

## Screens and acceptance checks

| Screen | Must demonstrate |
|---|---|
| **This Week** | Update inputs and recalculate forecast, capacity and gap correctly |
| **Find Partners** | Return actual sourced leads; display source, suitability explanation, unknowns and fee/verification status; allow shortlist/selection |
| **Outreach Draft** | Generate a personalised, editable draft using only grounded information; require staff approval |
| **Pipeline** | Move a lead through states and record verified/confirmed arrangements |
| **Log Handover** | Record a concrete kg transfer and update reporting, without incorrectly treating mere matches as reuse |

**Critical end-to-end acceptance test:** Change forecast or confirmed capacity → surplus changes → find an appropriate candidate → inspect evidence and unanswered questions → generate/edit outreach → update the candidate's status → log a simulated handover → see the corresponding metric change. No disconnected static mock screens.

## Proposed implementation approach (not yet a locked stack)

- **Repository:** `is463-group-project` (source of truth for prototype and docs).
- **Interface:** A small web application with the five existing screens; preserve the midterm's interaction model where useful.
- **Backend/data:** Minimal API and local persistent database or equivalent; enough to persist leads, status and handovers. Choose framework/storage after checking the intended deployment and team's familiarity.
- **Integrations:** At least **one working permitted discovery source** plus a curated/manual fallback. Optional second source for richer results. Use environment variables for API credentials; never commit secrets.
- **AI:** Optional LLM for grounded enrichment and draft writing, not for declaring partner acceptance. The ranking and validation rules should still work without AI.
- **Scope:** Build one credible vertical slice first; only then polish UI and add optional enhancements. Avoid premature scheduling, elaborate scraping pipelines, and complex scoring models.

## Validation and evaluation plan

1. **Discovery quality:** Check a small set of returned leads manually: are they real, reachable, relevant, and correctly classified? Can the UI show the source of each recommendation?
2. **Operational usefulness:** Ask CoffeeBot staff to assess the suggested prospects and explanations. Measure time to shortlist and prepare outreach compared with the current manual process where feasible.
3. **Truthfulness:** Try incomplete data cases (unknown fee, no contact, no documented capacity) and verify the app says *unknown*, rather than guessing.
4. **Functionality:** Test forecasting arithmetic, status updates, confirmed-capacity logic, handling of duplicate leads, and handover totals.
5. **Sustainability:** Report actual or explicitly simulated material flows. Reuse rate is based on kg, not the count of suggestions. Carbon handprint remains **provisional** until the disposal pathway, avoided-impact factor, additional transport/drying/software emissions, and evidence of actual reuse are supported.

## Open decisions / sponsor confirmations needed

- Which discovery data source(s) and terms are workable for the team's implementation?
- Who at NParks, Gardens by the Bay, zoos, community gardens, or other institutions can authorise accepting SCG? Which categories are worthwhile to contact?
- What constitutes an unacceptable fee, and how should transport costs be valued?
- What recipient requirements must be screened (moisture, contaminants, handling, use-case restrictions, minimum collection size)?
- Can CoffeeBot provide anonymised or sample IoT cup counts, existing partner capacities, and representative outreach details?
- What can the team honestly classify as **reused** versus **handed over for intended reuse**?

## References and decision record

- **Midterm slides, 12 October 2026 scenario:** forecast → gap → recommendations → outreach → tracking; five clickable demo screens; ranking criteria; 20 g/cup and indicative reuse estimates.
- **Professor's midterm feedback:** Strong problem framing and handprint; finals should demonstrate partner discovery in action and make the scraper/curated database/AI-assisted search decision concrete.
- **Sponsor's additional feedback:** Avoid reducing circularity to paid waste management; explore non-commercial and institutional recipients, including parks and gardens.

The above informs the **proposed** MVP; it does not imply external organisations have agreed to take grounds or that live API/IoT integrations have already been implemented.
