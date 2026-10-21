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
5. **Record Handover within Manage Partners — record outcomes:** Log date, optional actual time, partner, kilograms transferred and Notes. Update transferred-volume metrics from handovers, but do not count outreach, forecast allocations or handovers as verified reuse without separate confirmation.

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
| Evidence and readiness | Data provenance, verified contact, stated willingness, trial history | Prioritise verified facts, with clear flags for unverified leads |

Start with simple **rules and explainable ordering**, not an opaque AI score. Hard incompatibilities (e.g. unacceptable handling requirements or prohibitive fees) should be flagged before scoring. Unknown information should create a **question to verify**, not a false positive. Do not silently exclude paid arrangements: surface the trade-off so CoffeeBot can decide if exceptional benefits justify the cost.

### Minimum prospect fields

- `name`, `entity_type` (site/organisation), `category`, `location`, `source`, `source_checked_at`.
- `potential_use`, `verification_status` (unverified / contacted / verified), `decision_maker_or_contact` where known.
- `capacity_kg_per_week`, `frequency`, `collection_mode`, `handling_requirements`, `each nullable/unknown.
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
- Produce an editable message, recipient-specific questions (acceptable condition, kg/week, transport arrangements and pickup frequency), and a short reuse-information note.
- Human approval before external communication. Sending email via an API is **not** required for the MVP.

### Tracking and material accounting

- Store outreach and status changes, confirmed capacities, scheduled pickups, and logged actual transfers separately.
- A handover record should contain `date`, optionally `time` when known, `partner`, `kg`, free-text `notes`. Per-batch reuse/receipt confirmation is not a required staff input.
- Dashboard: total collected, reused/confirmed transfer (clearly defined), stored, discarded, and reuse rate over a chosen window.
- A transfer is not automatically proof of final beneficial use. If ultimate reuse cannot be verified, label it as *handed over for intended reuse* rather than *verified reused*.

## Screens and acceptance checks

| Screen | Must demonstrate |
|---|---|
| **Dashboard** | Update inputs and recalculate forecast, capacity and gap correctly |
| **Find Partners** | Return actual sourced leads; display source, suitability explanation, unknowns and fee/verification status; allow shortlist/selection |
| **Outreach Draft** | Standardised subject, partner-specific tentative use, editable body and staff-confirmed sending |
| **Manage Partners** | Track active and closed relationships in one list, with responses, follow-ups and handover history |
| **Record Handover dialog** | Record a concrete kg transfer and update reporting, without incorrectly treating mere matches as reuse |

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
- Will partners collect at HQ, or will CoffeeBot deliver? This is not yet agreed.
- What recipient requirements must be screened (moisture, contaminants, handling, use-case restrictions, minimum collection size)?
- Can CoffeeBot provide anonymised or sample IoT cup counts, existing partner capacities, and representative outreach details?
- What can the team honestly classify as **reused** versus **handed over for intended reuse**?

## References and decision record

- **Midterm slides, 12 October 2026 scenario:** forecast → gap → recommendations → outreach → tracking; five clickable demo screens; ranking criteria; 20 g/cup and indicative reuse estimates.
- **Professor's midterm feedback:** Strong problem framing and handprint; finals should demonstrate partner discovery in action and make the scraper/curated database/AI-assisted search decision concrete.
- **Sponsor's additional feedback:** Avoid reducing circularity to paid waste management; explore non-commercial and institutional recipients, including parks and gardens.

The above informs the **proposed** MVP; it does not imply external organisations have agreed to take grounds or that live API/IoT integrations have already been implemented.

## Implementation update — October 2026

- CoffeeBot HQ is treated as **8 Lor Bakar Batu, #05-01, Singapore 348743** (map coordinates approximate). Distances are straight-line reference distances, not routes or delivery promises. Who arranges transport remains unconfirmed.
- The **Suggested** stage contains sourced prospects only; fictional midterm partners populate Contacted, Interested, Trial and Regular for demo purposes. Historical simulated confirmed capacity is not sponsor-verified.
- **Discover Partners** is one workflow: it queries NParks Community in Bloom, NParks parks, MOE sustainability-related school programmes joined with the MOE directory, NEA and LIAS; removes duplicates; performs bounded AI assessment using locally configured Codex/Claude; and ranks saved candidates.
- Each lead retains the original source URL and claim, first date sourced if known, and last observed date. AI assessments retain source references, assessment time, provider, run ID, and input/prompt hashes. A discovery-run audit includes source availability, cache use, counts and number of AI calls.
- Official dataset snapshots are cached for 24 hours to reduce repeated requests; where stale snapshots are used after an outage, the run metadata identifies this. Unchanged candidates are not repeatedly reassessed merely because staff clicks discovery again.
- An MOE sustainability programme identifies a potential **school lead**, not necessarily a garden or a willingness to reuse spent grounds. The source-backed finding and the AI's inference must remain distinct.
- AI provider selection is local repository configuration via `.env`, not an operator-facing control. Fees are not part of the prototype workflow or ranking.
## Possible refinements to validate (not a change in scope)

The next iteration could strengthen the connection between discovering a promising lead and securing reliable, recurring reuse. These are **lightweight staff-assistance ideas**, not requirements already validated with CoffeeBot:

- **Relationship follow-through:** Allow staff to record a concise summary of a reply or call, a next action and date, the proposed kg/week and pickup frequency, and any outstanding acceptance/handling questions. Staff would continue using their existing email workflow and approve all status or capacity changes; there is no need for inbox integration, autonomous outreach or a full CRM.
- **Evidence-backed reuse guidance:** Alongside the editable outreach draft, consider a short, partner-type-specific guidance note drawn from a small, maintained set of trustworthy references, with links and a clear distinction between published guidance, CoffeeBot-approved handling facts, and partner-specific uncertainties. AI may tailor the wording but must not invent treatment instructions, verified material properties, safe-use claims, environmental savings or confirmed acceptance.
- **Validation before expansion:** Ask CoffeeBot staff whether recording next steps and sharing sourced guidance would save time or build trust. Evaluate whether this helps move leads to trials and recurring collections, rather than counting extra features, AI calls or suggested partners as sustainability outcomes.

These refinements remain secondary to **credible partner prioritisation, human-reviewed outreach, verified regular capacity and logged reuse outcomes**. Do not expand into general-purpose customer relationship management, automatic sending, logistics optimisation or unsupported carbon calculations.
## Partner management implementation (18 October 2026)

- The Dashboard and partner management are separate. **Manage Partners** defaults to an alphabetical list of Contacted, Interested, Trial and Regular partners, with Closed accessible by filter. Closed is not a required fifth pipeline step: it can be selected from any stage.
- Staff can update stage, response, next action and follow-up date; log responses, notes and follow-ups; and review the resulting activity history and linked handovers. Drafts, handovers and status updates are recorded separately.
- Outreach uses a fixed CoffeeBot subject and a structured, editable body featuring a tentative use relevant to each partner's work. It never asserts material suitability or willingness. Drafting or copying never marks an email sent. **Record Sent** requires staff confirmation and atomically archives the reviewed subject/body, its sent timestamp and the relationship activity.
- No automated emailing, full CRM, delivery routing or unsupported carbon calculations are introduced. An actual handover still does not establish confirmed reuse.

## UI refinement — 18 October 2026

- The Find Partners page heading matches its navigation label.
- Draft Outreach uses a searchable partner-name dropdown without visible IDs, inline icon copy buttons for recipient and subject, and a wide single-column email editor. Generate Draft and Copy Email sit on the left; the primary Record Sent action sits on the right. Save Draft and the separate Before Outreach panel are removed.
- Manage Partners mirrors Find Partners: a left Search/Sort control panel with clickable stage counts, and a right alphabetical list. Contacted, Interested, Trial, Regular and Closed have consistently labelled, muted-colour icon tags. The existing partner-details and handover interactions remain intact.

## User feedback refinement — October 2026

Stage-count tags serve as the stage filter, and clicking one twice clears it back to All Active. Partner forms require only Name, Type and Stage, identify Contact Email as optional, and omit source and internal verification flags from the interface. Demo profiles and stage histories are fictional and labelled as such.

Community in Bloom school sites use grounded MOE School Directory addresses when available, rather than describing registry membership as a physical address. Outreach uses human-sounding paragraphs rather than script-like headings, a narrower editor, prominent editing and action controls, and manual sent confirmation only.

## Operational refinement — October 2026

Discovery can be stopped from its progress view: the cancel signal reaches active source, contact, geocoding and AI work, the database transaction is not committed, and no new discovery history or partner assessment is persisted. A run that has started final storage cannot be cancelled. Already consumed provider usage and fetched source caches are not reversible. We distinguish abandoned discovery from completed scans.

Listing category, proximity and source-date labels have unobtrusive icons, and Manage Partners uses a two-column arrangement on sufficiently wide viewports. Outreach emails are addressed to a named contact or organisation team and contain a tentative, source-backed reuse proposal with practical preparation questions in their natural prose, not a generic separate checklist.

## Edit Partner layout refinement — October 2026

Edit Partner and AI Review use the same white outlined secondary-button design. The partner-edit form now shows Partner Details and Grounds Reuse as separate sections with two subtle headings/icons and a divided, scrolling form; save/cancel actions remain visible. Page scrolling is disabled while a dialog is displayed and restored when the dialog closes. Field requirements and backend rules were not changed.

## Stage correction and recording outreach — October 2026

Staff confirm an email sent outside the app through a minimal in-app **Confirm Record Sent** dialog; on success, the UI opens that specific partner page. There is still no automatic email sending. The Manage Partners stage field permits reverting a partner to Suggested as a correction, retaining existing relationship/audit history.

## Manage Partners relationship tabs — October 2026

Partner list entries now have an explicit Manage action. Selecting it opens a dedicated partner page with Relationship (stage/response/next action/follow-up and real activity/handover history) and Edit Partner (organisation details and grounds reuse). The tab-specific save paths prevent accidental cross-updates, and Stage lives only in the Relationship tab. Activity and Handovers have matching section headings, with limited decorative icons and restrained dividers. This is still lightweight relationship management, not a complete multi-contact CRM.

## Partnership journal — October 2026

The Relationship tab prioritises situational awareness, a dedicated Log Activity action, then a single chronological history. The activity form gathers channel, date, interaction contact, outcome, summary and optional follow-up and staff-confirmed stage change. Log submission is atomic; no outcome silently changes the stage. The separate Edit Partner tab maintains the current organisation contact and grounds-reuse information; current contact changes are themselves logged. The timeline combines source discovery, human activities, externally confirmed sent outreach, and handovers without duplicates or fabricated transfer times.

## Standalone partner workflow — October 2026

The whole Manage Partners card navigates to a dedicated partner page with Relationship and Edit Partner tabs. Staff use focused Log Activity and Record Handover dialogs rather than an inline activity editor or separate handover page. The latter was retired from navigation; old URLs redirect appropriately. Physical transfers are still recorded by the canonical API and displayed only once in Activity History.

Find Partners moves Date Sourced into Details, the sidebar uses equal Last Scanned spacing, and the timeline connectors run only between event dots.

## Sidebar and selected-partner typography — October 2026

The sidebar contains Dashboard, Discover Partners and Manage Partners. Draft Outreach remains contextual and both the outreach and selected-partner headings align with their body panels. Relationship and Edit Partner use consistent text hierarchy without changing data.

## Expandable relationship evidence — October 2026

The Activity History section and each timeline item are collapsed by default. Sent-email entries open the exact stored email and subject rather than a generated summary. Manage Partner cards use a subtle next-action cue, and Stage is a compact dropdown. Log Activity accepts raw pasted communications with Email and the current Stage preselected. Future AI extraction should produce editable proposals for staff approval; the underlying message is retained and not reinterpreted as verified acceptance.


## Email and text-only AI activity assistance — October 2026

Log Activity retains manual entry for all channels. Only Email and Text / WhatsApp show an optional Analyse with AI control. The analysis returns review-only proposed response, stage, next action, follow-up and participant; staff explicitly apply or dismiss suggestions before a normal Save Activity. The original communication is retained in the journal on save. No automatic stage progression or handover inference occurs, and unverified information remains unverified. The existing CLI provider is used; analyses may consume provider usage. The message is transmitted only when staff select Analyse, and audit records store usage metadata rather than pasted contents.


## Activity outcome semantics — October 2026

Stage describes the ongoing lifecycle (Contacted, Interested, Trial, Regular, etc.) and is always changed explicitly. Outcome describes one specific interaction (e.g. Requested Information, Agreed to Meeting, Discussed Trial, Follow-Up Needed, Declined, No Reply, Other). The Relationship Overview no longer shows the redundant latest response; staff see each outcome when expanding an Activity History entry. AI suggestions use this separate taxonomy, and old responseStatus/positive records are preserved.


## Cancelable, concise activity analysis — October 2026

The Email/Text AI analysis panel uses a subtle powder-blue suggestion box. Suggested outcomes match the manual form options, and deadlines stay in Follow-Up Date instead of repeating in Next Action. Long AI rationale/explanation prose is not presented. A running request offers Cancel Analysis: the server aborts its configured CLI provider using an AbortController, and the unsaved output is discarded. The activity history and partner stage are not modified by analysis or cancellation; normal Save Activity still requires staff action. UI and backend cancellation are covered by regression tests.


## Partner activity history and type scale — October 2026

Activity History is always visible on the dedicated partner page. Individual entries expand only where hidden details add value (especially a sent outreach email body or a long text/email); simple stage changes, calls and short notes have no superfluous expander. The selected-partner page and Log Activity/Record Handover dialogs use a shared, smaller typography scale, while AI Suggested Updates has a near-neutral background with restrained indigo controls.

- Routine non-expandable **Record Updated** and **Partner Discovered** entries are one-line title/date events; their old stage/source descriptions are no longer shown. All activity dates align at the far right. Short calls and other meaningful activity notes remain visible.

- Timeline update and discovery event descriptions (e.g. stage change and discovery source) remain visible as muted text beneath the title, with the date right-aligned; these concise entries do not expand.


### Simplified handovers (October 2026)

A handover is an operational movement of spent coffee grounds, not an
audit of the receiving organisation. The staff-facing form gathers Date,
optional Time (Singapore local time), Amount (kg) and Notes.
It omits the three-way confirmation question and all "Evidence" wording.
Historical records and explicit confirmation values are retained for
backward compatibility, but new UI records default internally to
`unverified` and never increase a verified-reuse KPI by themselves.

For ongoing partners, reuse may be communicated as a standing relationship
("we continue to reuse these") or as a cumulative quantity ("we have used
8 kg so far"), rather than confirmed for each transfer. Staff can record
these claims in activity or partner notes. Such claims are not silently
mapped to a per-batch verified-reuse total; that would risk double counting
and needs a separate reporting definition if ever implemented.

### Current handover and management UI

Handover records Date, optional Time, Amount (kg), and Notes only.
The partner's Potential Use / Agreed Use is maintained on the profile, not
repeated for each collection. Both Log Activity and Record Handover use a
clean white dialog surface. Opening Handover focuses the Close control
rather than selecting the prefilled date. The Manage Partners sidebar has
a Category filter alongside Search, Sort and stage controls.


### Relationship lifecycle refinements

Redirect staff to the **individual partner** on confirmed Record Sent, so
they can set the next follow-up without finding the organisation again.
On that page, visually surface only actual overdue/due-today follow-up
dates; defer cross-partner task summaries to a later Dashboard discussion.

The partner's Grounds Reuse profile stores optional transport arrangements
(Partner Collects, CoffeeBot Delivers, flexible, or Not Discussed) and
grounds acceptance (wet, dried, either, or Not Discussed). This is
staff-recorded information, never inferred from a category or automatically
inserted into the Fit Score before CoffeeBot confirms its operational
criteria.

Manual communications can be edited or hidden via soft deletion, without
rewriting the current relationship state. Historical stage events, sent-outreach records and handovers use dedicated correction controls, with archived originals.
For contacted or later-stage partners, staff can request an AI-grounded
follow-up draft based on the latest recorded interactions, review/edit it
in the existing outreach editor, send it externally and record it sent.
No automated messaging or unreviewed stage updates are introduced.

### Editing short activities and notes discipline

Place manual-activity Edit/Delete controls outside the collapsed Details
content, so staff can correct short notes and calls as readily as lengthy
emails. Preserve automatic stage and sent-outreach history. Partner Notes
are for information not represented by structured fields; remove
repetitive pre-filled demo descriptions without clearing custom notes.
## Current data and correction rules

**Potential Use** is tentative; **Agreed Use** is entered only following
partner confirmation. Public listings (such as NEA accepted materials) are
shown separately as **Public Source Evidence**, not treated as agreement.

Activity History exposes the same three-dot Edit/Delete menu for staff
communications, stage changes, recorded sent emails and handovers.
Historical edits do not silently change today's stage or tasks. Correcting a
sent-email record does not change the email already sent. Editing or
archiving a handover updates recorded kilograms and transfer totals; an
internal archived copy remains. Source discovery metadata is available in
the profile, not the conversation timeline.

Draft Follow-Up shows recent recorded communications (including emails
whose sent/received direction was not recorded), current Next Action and
Follow-Up Date; staff still review and send all emails externally.
### Grounds Arrangement and Handover Exceptions

The partner profile holds the ongoing arrangement: **Potential Use**, **Agreed
Use**, Collection / Delivery, Grounds Condition, Frequency and Weekly Capacity.
The stage progresses through Contacted, Interested, Trial and Regular; reuse
is not proven or tracked separately for every transfer.

Record Handover captures Date, Time, Amount and Notes. It inherits the
partner's recorded Collection / Delivery and Grounds Condition as a snapshot.
Only **Change For This Handover** reveals per-transfer exceptions. The
History entry shows the changes only when there were exceptions.
Correcting a handover retains its original handling details unless staff
explicitly change them; selecting Partner Arrangement applies the currently
recorded partner arrangement. No new reuse-status field or confirmation
workflow is attached to individual handovers.
