# CoffeeBot Circularity Copilot — Current Prototype

**Course:** IS463 Digital Technologies for Environmental Sustainability

**Team:** Second Shot

**Sponsor:** CoffeeBot

**Status:** Functional prototype updated 31 October 2026. Pre-contact Outreach Priority and organisation-evidence research reflect CoffeeBot feedback; operational thresholds remain provisional.
**Companions:** [Problem statement](problem-statement.md), [run/setup instructions](../README.md), [UI conventions](ui-guidelines.md).

## Purpose and boundaries

CoffeeBot's bottleneck is coordinating **suitable, reliable, preferably low-cost recurring recipients** for spent coffee grounds (SCG), not the absence of imaginable reuse ideas. The system helps an employee find real potential recipients, prepare personalised staff-reviewed outreach, maintain lightweight relationships and record physical transfers. Weekly supply visibility is supporting context, not an autonomous resource-allocation system.

Scope deliberately excludes automatic emailing, negotiations, route optimisation, rider scheduling, live stock accounting, full CRM, automatic reuse certification, production deployment and unsupported carbon claims. Past Stitch screens were clickable concepts; this document describes the connected application now implemented.

## Current workflow (three main pages)

| Page or contextual view | Implemented behaviour | Human responsibility |
| --- | --- | --- |
| **Dashboard** | Forecast Supply, Forecast Demand, Handed Over This Week, Projected Gap; editable demo forecast; recent handovers; upcoming follow-ups; partner stage counts; quick Log Handover | Enter credible figures, distinguish forecast from actuals |
| **Discover Partners** | Six independent source families; deduplication, geocoding, public contact research, source URLs, caching, discovery progress/cancellation, Outreach Priority, factual Contact Route labels, on-demand Research Contact, composable **Contactable First** ordering and **AI-Assessed Only** filter, AI Review, contextual Draft Outreach | Check whether a prospect is relevant, reachable, authorised and willing |
| **Draft Outreach** (contextual) | Pre-filled partner, editable email, template or Codex draft, Copy controls and Record Sent; a deterministic four-section Reuse Guide with separate Edit/Copy actions, no additional AI call | Review guide claims, share externally if appropriate, send the email, and record what was actually sent |
| **Manage Partners** | Search, category/sort/stage filters, active/closed relationships, Add Partner, dedicated partner profile | Maintain accurate stages, contact and arrangements |
| **Partner profile** | Relationship and Edit Partner tabs; stage editing; next action/follow-up; Log Activity; Draft Follow-Up; Record Handover; chronological Activity History with correction/archive actions | Confirm relationship transitions; record what actually occurred |
| **Log Activity** | Email, Text/WhatsApp, phone, meeting, visit and other events; date, contact, outcome, message, next actions; optional AI suggestions for Email/Text that require Apply and Save | Check AI interpretation, never infer agreements automatically |
| **Record Handover** | Date, optional actual time, kg, notes; optional transport/grounds-condition exception to partner's standing arrangement | Record transfer facts, not presumed reuse or per-batch certification |

The sidebar has **Dashboard**, **Discover Partners**, **Manage Partners** only. The dashboard has the cross-partner Log Handover action; the Manage Partners *list* does not duplicate it. From a partner profile, the existing partner is already selected when recording a handover. There is no standalone Log Handover page in navigation.

The **Reuse Guide** sits below the email editor (including follow-up mode) and covers a possible pathway, CoffeeBot collection/drying facts, pre-trial unknowns and post-trial feedback. It selects cautious wording by partner category and, where present, extracts narrow, citation-linked cues from current AI-assessed official-page excerpts or material-specific directories, without adding another model call. MOE programme titles provide educational context only. Unassessed, stale and generic sources retain the cautious category fallback. Recorded intake/frequency/logistics remain values to reconfirm. Text edits are retained only in the current page session for copying, not written to partner records; this is not an AI-generated document or verified reuse claim. The staff-facing guide and its copied text deliberately omit source-check footers and generic staff-review disclaimers; uncertainty is conveyed through specific questions, while source provenance remains available in discovery records. The Guide heading has only the selected partner name, without evaluation-method labels. Category-only guides can be generic and should not substitute for organisation-specific staff research.

The **Suggested** stage is for actual sourced prospects and staff-entered leads. Fictional demo relationships live in Contacted/Interested/Pilot/Regular to exercise the workflow; they are not real CoffeeBot partners.

## Forecasting and accounting semantics

**Sponsor reference (estimated total drinks/month):** Republic Polytechnic 700; 100 Pasir Panjang 500; Changi General Hospital 1,000–1,200; NTU 800–1,000; Singapore Business Federation 600–800. CoffeeBot supplied 60% coffee share and 15 g/coffee. Its approximately 20 kg Temasek Polytechnic research donation demonstrates a meaningful possible one-off use but supplies neither a recurring intake target nor an independent ranking label.


Current editable demo baseline: **900 total beverages/week × 60% coffee-based × 15 g per coffee = 8.1 kg/week** projected grounds supply. CoffeeBot’s five machine locations total **3,600–4,200 drinks/month** (32.4–37.8 kg potentially generated). The demo default is the rounded midpoint converted at 52 weeks/12 months. **Fictional Regular partner intake totals 6.5 kg/week**, leaving an illustrative **1.6 kg/week gap**. The previous midterm scenario (9,100 × 20 g = 182 kg/week) is historical and not an operating baseline.

| Concept | Current rule | Explicit non-equivalence |
| --- | --- | --- |
| Forecast Supply (kg/week) | Total weekly drinks × coffee-based share / 100 × grams per coffee / 1,000 | Potential generation, not physically collected mass |
| Forecast Demand (kg/week) | Sum of positive `capacityKg` values for partners in **Regular** | Not all leads, pilot arrangements, preliminary capacity, or physically transferred kilograms |
| Projected Gap (kg/week) | `max(0, Forecast Supply − Forecast Demand)` | Not current grounds stock or disposal volume |
| Handed Over This Week (kg) | Sum of dated handovers in the Singapore current week | Not recurring commitment or verified beneficial reuse |
| Historical transferred kg | Sum of recorded handovers (all dates) | Not necessarily final disposition |
| Reuse rate / confirmed beneficial reuse | **Not calculated or collected** by the prototype | Do not equate a physical handover with verified final use |

**One source of truth:** the backend `numbers()` calculates Forecast Demand (the existing API key `confirmedKg` represents this internal figure) and Projected Gap. The dashboard uses these metrics directly, not its own alternative capacity calculation. A staff-confirmed **Regular** stage and positive weekly capacity represent an agreed recurring arrangement; the older internal `confirmed` field is not an additional hidden prerequisite. Moving back to Pilot, Suggested, or Closed removes it from Forecast Demand. Handovers never adjust weekly agreed demand.

A partner may have a **Potential Use** and an **Agreed Use**, plus a standing collection/delivery and grounds-condition arrangement. A specific handover may record exceptions to the latter. These are partner/transfer logistics, not per-handover assertions that grounds have been reused.

There is **no automated IoT import**, no reliable period-specific collected/stored/discarded balance, and no proof of final reuse in the current operator workflow. The former reuse-confirmation/reuse-rate feature is retired; new handovers have no confirmation fields, and legacy confirmation metadata is ignored in calculations.

## Data sources and provenance

The implemented **six** discovery source families are:

1. **NParks Community in Bloom:** registered community-gardening sites, potentially including schools. [Dataset](https://data.gov.sg/datasets/d_f91a8b057cfb2bebf2e531ad8061e1c1/view)
2. **NParks public parks:** physical park locations, not direct decisions by an authorised recipient. [Dataset](https://data.gov.sg/datasets/d_0542d48f0991541706b58059381a6eca/view)
3. **MOE programmes + directory:** schools with distinctive/sustainability-related programmes joined to official school records for addresses where possible. [Programmes](https://data.gov.sg/datasets/d_db1faeea02c646fa3abccfa5aba99214/view), [Directory](https://data.gov.sg/datasets/d_688b934f82c1059ed0a6993d2a829089/view)
4. **NEA Food Waste Recycling Facilities:** published facilities and accepted-material statements when listed; equipment suppliers excluded. [NEA listing](https://www.nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/food-waste-management/food-distribution-organisations-local-recycling-facilities-and-suppliers)
5. **Landscape Industry Association (Singapore):** directory of relevant operators, not proof that they accept SCG. [Members](https://lias.org.sg/members-list/)
6. **Singapore Food Agency licensed land-based farms:** official PDF register of licensed vegetable/crop and mixed vegetable/aquaculture farms (read by a bounded PDF parser). Excludes standalone aquaculture, dairy and egg farms. Duplicate licences for the same organisation are combined. This establishes agricultural activity only, **not** a soil-based method, materials compatibility, willingness, capacity, contact or consent. [SFA register](https://www.sfa.gov.sg/docs/default-source/food-farming/licensed-land-based-farms.pdf)

The sources are queried independently and may partially fail; successful snapshots are cached for 24 hours and may be reused stale during an outage. A source URL, source claim, initial-sourced timestamp where known and discovery history support traceability. The SFA PDF register is cached like other sources, and its publication date is retained in source metadata. If the PDF layout changes unexpectedly, the source fails independently instead of inventing records. Older unknown sourcing dates are not fabricated. Contact discovery extracts published addresses from supported listings and inspects only bounded pages of source-linked websites; it does not guess addresses. Staff can run **Research Contact** against a selected Suggested lead using a public HTTPS organisation website. Results distinguish a cited published email, a cited contact page without email, a completed check with no contact, and a website that could not be checked; a check timestamp and page attribution are stored. If staff enter a contact email manually, it is marked **Staff entered** rather than credited to the former website. A published contact route is **not** proof of decision-making authority, acceptance or fee terms. This factual contactability indicator is not a new partnership stage or a separate sponsor-dependent ranking policy.

Distance uses the approximate CoffeeBot HQ reference at 8 Lor Bakar Batu and straight-line coordinates. MOE names can be joined to the official directory and some postal codes to a cached OneMap-derived 2023 snapshot. Unknown/ambiguous positions show Unknown, not manufactured kilometres. This is not route planning.

### Outreach Priority and AI

**Current partner-discovery sequence:** six source families → conservative deterministic pre-ranking → source-balanced research cohort (0–24) → shared organisation-specific evidence research → evidence-only AI evaluation → final Outreach Priority ordering.

For the bounded research cohort, existing official website URLs from source records are reused. When Codex is the configured provider, missing official sites may be resolved with Codex live web search in small batches. A returned URL is never trusted by itself: the application accepts only public HTTPS pages and independently checks that the page identifies the named organisation before storing it. The application then reads the organisation page and up to two relevant same-site pages for material-, growing-, waste- or sustainability-related evidence. Each retained excerpt keeps its exact page URL. Missing or inaccessible websites do not block evaluation. SFA is a special data-coverage case because its licence register does not publish farm addresses. A separate bounded enrichment pass considers up to 12 unresolved SFA farms per discovery run, accepts only a postcode visibly published on a verified official site, requires that postcode to exist in the local Singapore postal snapshot, and refuses ambiguous multi-address pages. Failed or ambiguous checks cool down for 30 days before retry.

**The evaluator does not browse.** Codex receives the frozen evidence packet: organisation metadata, originating source, source claims, verified organisation-page excerpts where available, material evidence and website URL. It returns bounded reuse-suitability, evidence-strength and relative Potential Intake judgements with separate citation indices, a tentative pathway and a key unanswered question. Potential Intake is evidence-backed relative scale only; it may not invent actual kg/week, acceptance, frequency, fees, collection arrangements or downstream reuse.

**Outreach Priority is deliberately pre-contact.** Current adjustable defaults are **Reuse Suitability 40 + Organisation-Specific Evidence 25 + Potential Intake Scale 20 + HQ Proximity 15 = 100**. Potential Intake estimates only relative plausible absorption scale from source/category evidence and cited organisation-level scale signals; it never claims actual capacity or willingness. Frequency, consistency, willingness and collection/delivery arrangements are confirmed after outreach. Once the relationship moves beyond Suggested, the score is no longer the decision model for managing that partner.

A valid current AI evidence assessment blends equally with the corresponding deterministic suitability, evidence and Potential Intake values; proximity remains conventional software. Unassessed, stale, invalid or failed cases remain Rule-Ranked. Source balancing controls which prospects receive the bounded research/evaluation budget; it does not manufacture evidence. Cached source snapshots, website-resolution calls and AI usage remain auditable in discovery history.

**Remaining sponsor decisions:** CoffeeBot prioritises meaningful intake, reuse frequency, consistency and convenient transport, with no immediate prohibited reuse categories. Pickup at HQ or reasonably convenient delivery are both possible. Actual route patterns, thresholds, fees, institutional authority, material handling compatibility and confirmation of eventual beneficial reuse remain unverified.

## Relationships, outreach and integrity

- **Stage** is a deliberate staff-set lifecycle state (Suggested → Contacted → Interested → Pilot → Regular; Closed available from active states). It is not inferred from a single message outcome.
- **Activity outcome** describes a conversation (such as Requested Information, Meeting Agreed, Pilot Discussed, Follow-Up Needed, Declined). Logging an outcome does not silently advance Stage.
- **Record Sent** archives the reviewed external email only after confirmation. Sending remains in the employee's own mail client.
- **Draft Follow-Up** can reference already recorded communications. AI-generated suggestions are editable and cannot invent assent, capacity or material quality.
- **AI activity analysis** operates only on explicitly supplied Email/Text content after staff clicks Analyse with AI; suggestions require explicit Apply and Save, can be cancelled and never auto-write to the partner record.
- Activity History merges dated interactions, stage changes, recorded emails and handovers, allowing corrections while retaining internal provenance. Transfers are canonical handover records, not duplicate history entries.

This is deliberately lightweight relationship management, not a full email client or complete multi-contact CRM. Partner communications can contain personal or confidential information; the user must consider whether to send pasted messages to a local CLI's configured provider.

## Sustainability claim boundaries

A signed-off weekly arrangement is **planned intake**. A recorded handover is **grounds physically transferred for intended use**. Neither proves final beneficial reuse. To assert a **reuse rate**, obtain an actual collected volume for the same period and independent evidence that the stated mass was used for a beneficial purpose. The handover dialog records transfers without a reuse-certification workflow. If the sponsor later needs validated end-use reporting, its granularity and evidence requirements must be designed separately.

A defensible **carbon handprint** would require an agreed disposal baseline (especially important in Singapore), evidence of additional reuse and suitable impact factors minus handling, transport and technology impacts. The UI does not claim quantified CO₂e savings. Collection, storage, discarded and reused amounts must not be conflated.

## Source-quality spot check (22 October 2026; not sponsor validation)

A dated, non-exhaustive manual inspection of the **saved Suggested pool** (354 records, 92 with a recorded email, 68 AI-assessed) across all six sources. These counts are a snapshot, **not** app targets or permanent dataset guarantees. A listing is not a commitment to accept spent coffee grounds.

| Source | Example and verified scope of *source evidence* | Risk or unanswered screening question |
| --- | --- | --- |
| **NEA recycling facilities** | A1 Environment's NEA entry expressly lists **used coffee grounds**, whereas 800 Super lists spent grains/okara and Chuan Huat Poultry Farm lists bread waste. Source: [NEA recycling facilities](https://www.nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/food-waste-management/food-distribution-organisations-local-recycling-facilities-and-suppliers). | Strongest direct material evidence in this sample is A1. Adjacent-food-waste entries must not be presented as known grounds recipients; fees, capacity and logistics remain unknown. CoffeeBot previously mentioned discussions with A1, so do not portray it as a newly discovered partnership. |
| **NParks Community in Bloom** | Admiralty school/community garden names correspond to recorded growing sites; some school addresses join to the official MOE directory. | Site existence supports a possible growing context, not a composting practice, decision-maker, materials approval or willingness. Resident committees and schools require the responsible person/organisation. |
| **LIAS members** | Garden Works / Goodview Garden & Landscape have horticulture-linked membership and directory contacts. Multico Equipment & Parts is also a listed member but is an **equipment-oriented** business. | Industry membership and a reachable email do not mean the operator can consume SCG. Investigate direct horticultural use; avoid treating supplier/equipment-only members as validated reuse opportunities. |
| **SFA licensed crop farms** | Official register contains growers such as Accufarms and Aeroveg; the current parser yields 89 new Suggested records after deduplication. Source: [SFA land-based farm register](https://www.sfa.gov.sg/docs/default-source/food-farming/licensed-land-based-farms.pdf). | Growing method (soil, substrate, hydroponics), material restrictions, site contact and volumes are unknown. All 89 lacked recorded emails/websites at the time of review. SFA licensing does not establish compatibility with spent grounds. |
| **MOE programmes** | Geylang Methodist (Primary) has an environmental education programme; Broadrick lists STEM–Sustainability. | A programme title is **not** evidence of a garden, soil use or composting. Treat as educational engagement prospects pending school-level activity and permission verification. |
| **NParks parks** | Cambridge Park and Central Catchment Nature Reserve are geographic site records. The latter is a protected conservation area. Source: [NParks Central Catchment](https://www.nparks.gov.sg/visit/parks/park-detail/central-catchment-nature-reserve). | A park is a **site**, not the approving party. Do not imply disposal/compost spreading at parks, especially protected reserves. Any institutional grounds proposal needs an authorised NParks/contractor channel, operational evidence and appropriate approvals. |

**Decision rules pending sponsor input:** This spot check does not approve or change the scoring weights, set a threshold, or automatically suppress candidates. The staff-facing **Contact Route** and **Source Evidence** in Details are factual aids to shortlisting, not substitute judgments about acceptance. For future quality checks, distinguish (a) a real relevant activity/site, (b) an identified responsible contact route, and (c) demonstrated operational compatibility. Quantified lift or saved staff time must be measured separately; a complete browser workflow is not evidence of real partner adoption.

## Acceptance and evaluation

The functional test suite includes forecasting, stage changes, transfer logging, activity corrections, provenance, AI limits/cancellation and frontend behaviour. Run `npm test` for automated checks and `npm run visual:review` for browser-based layout captures. These establish implementation behaviour, not staff adoption or recommendation quality.

Use realistic review tasks with a representative prospect:

1. Adjust weekly cups; check the demand/gap calculation when an agreed-capacity partner becomes Regular and when it is Closed.
2. Review a recommended prospect: locate the source, assess its plausibility, identify what cannot be known from the source (authorised contact, acceptance, fees, volume, transport).
3. Generate and edit an outreach email, copy it, record it as sent, and add a follow-up without implying a reply was received.
4. Record an actual meeting/reply, confirm a stage change deliberately, and correct an erroneous history entry.
5. Log a physical handover; check the dated total, while explicitly *not* calling it verified reuse.

For evaluation, record **source-backed actionable leads, false positives, time/steps to shortlist, time to send a reviewed draft, task completion errors, and staff trust in rankings**. Compare with a simple manual search/email/spreadsheet process when feasible. A successful functional demo is not itself a measured sustainability outcome.

## Unanswered sponsor questions

1. **Criteria and priorities:** Which recipient types and evidence create a credible prospect? How should fees, transport, capacity, regularity and handling be weighted? When should a lead be rejected as impractical?
2. **Recipient authority:** Who can authorise grounds use at NParks facilities, school gardens, large parks, zoos, Gardens by the Bay and other institutions? Are these direct partners or centralised contacts?
3. **Handling and logistics:** Partner collects versus CoffeeBot delivers; accepted wet/dried condition; contamination, storage, pickup frequency and minimum/maximum amounts.
4. **Supply and current partnerships:** What machine cup data, actual grounds measurements, typical recipient volume and schedule could be shared for a meaningful pilot?
5. **Actual outcomes and baseline:** How are current 10–20% reuse estimates measured? What happens to the remainder? What evidence of final use would CoffeeBot realistically obtain?
6. **Ownership and data safeguards:** Which employee would use the system, how often, and what contact or operational details should be retained?

**Do not treat these as approved specifications.** New discovery families or ranking constraints should be evaluated against the value of already-sourced leads before being added.

## Implementation notes

- Local Node HTTP API and JSON persistence in Git-ignored `data/state.json`; `src/core.js` is the shared calculation and scoring layer, `src/discovery.js` and sibling modules supply sources/geocoding/contact research, `src/ai.js` adapts signed-in CLIs and optional local borrowed models.
- The prototype has no production authentication, multi-user data model, push notifications, remote DB or automated live IoT feed. It is not safe to expose directly as a public service.
- Current UI conventions are in docs/ui-guidelines.md, with the actual implementation in public/app.css and public/app.js. Older slides are not implementation requirements.
