# CoffeeBot Circularity Copilot

**29 October simplified assessment workflow (feature branch):** CoffeeBot uses deterministic screening only to select a configurable, source-balanced top-N cohort (0–24 per run). Every selected candidate is eligible for the same structured AI evaluation prompt—even if its only evidence is a directory entry. Codex is the current prototype model; Qwen and Llama use the same prompt for comparisons with the deterministic baseline. Cite whatever public records are actually available, score source-evidence strength conservatively, state uncertainties, and never invent uptake, capacity, willingness or downstream reuse. AI changes only suitability and evidence points; location and documented operations stay deterministic. A bounded website check may supplement some selected candidates but never determines assessment eligibility. Previously saved evidence-v2 and advisory results remain as history, not active v3 numerical scores. The benchmark comparisons remain exploratory, not sponsor outcomes.


Functional, single-user IS463 prototype for CoffeeBot (Team Second Shot). It helps staff identify *potential* spent coffee grounds (SCG) recipients, prepare reviewed outreach, manage recurring partnerships, and log physical transfers. This repository is the source of truth for the implemented application; see [`docs/problem-statement.md`](docs/problem-statement.md) for the sponsor problem and [`docs/prototype.md`](docs/prototype.md) for the current functional scope and open decisions.

## Run locally

Requires Node.js 20.12+.

```powershell
npm ci
npm start
# Open http://localhost:4173
npm test
npm run visual:review
```

The visual-review script currently requires Microsoft Edge at the standard Windows installation path and checks the app at localhost:4173; it is not a cross-platform browser test runner. The Node test suite is separate.

Set the optional AI provider in a local, Git-ignored `.env` file:

```ini
AI_PROVIDER=codex
# CODEX_PATH=C:\path\to\codex.exe
# Alternatively: AI_PROVIDER=claude or AI_PROVIDER=template
```

Codex/Claude use installed, authenticated CLIs. Codex is the configured prototype assessor. Qwen3.5 4B and Llama 3.2 3B remain optional borrowed local models through Ollama or a loopback llama.cpp server. Discover Partners can research up to the configured budget of 24 existing websites and separately assess up to that many evidence-eligible Suggested partners per run; the total distinct prospects touched can exceed the setting because research and inference have separate caps. Change the inference budget in **Assessment Settings** or set `AUTO_AI_REVIEW=false` to disable automatic assessments; staff-triggered evidence review remains available. Only a current, source-cited evidence assessment can influence suitability and source-evidence score components. Historical advisory reviews remain visible but do not change scores. See [model evaluation](docs/model-evaluation.md).

For postal-code distance matching, run `npm run setup:geocodes` once. It caches a [2023 Singapore postal-coordinate snapshot](https://github.com/faezlatiff/SingaporePostalToLatLong) in `data/source-cache/`. Optional OneMap lookup for otherwise unresolved locations requires `ONEMAP_EMAIL` / `ONEMAP_PASSWORD` or `ONEMAP_ACCESS_TOKEN`. Distances are approximate straight lines from CoffeeBot HQ (8 Lor Bakar Batu, Singapore 348743), not travel distances.

## Current staff workflow

The sidebar has **Dashboard**, **Discover Partners** and **Manage Partners**. Draft Outreach and individual partner pages open contextually.

1. **Dashboard** — Edit an illustrative weekly supply estimate and compare it with Forecast Demand, Handed Over This Week and Projected Gap. Use **Log Handover** here for a quick partner selection and transfer entry; there is no duplicate handover button on the Manage Partners list.
2. **Discover Partners** — Run and optionally stop source discovery, inspect sourced Suggested prospects, sort/filter by score/category/distance and inspect their provenance. **Contactable First** is an independent ordering checkbox (email, then published contact page, then no identified contact route) which can be combined with Best Fit/Nearest/Recently Sourced and **AI-Assessed Only**; it never alters score or filters out unmatched contacts. Start a reviewed AI assessment of an individual lead or open Draft Outreach. Discovery does not imply permission to receive grounds. Suggested cards now show **Contact Route** independently of Fit Score: published email, published contact page, or no identified route. Failed website checks are reported separately from completed checks without a contact. Within Details, **Research Contact** checks a supplied public HTTPS organisation website (up to three bounded pages) and retains page-level attribution. Staff may look up the organisation website manually; no contact or authority is invented.
3. **Draft Outreach** — Generate or edit an email, copy it to an external mail client, then explicitly **Record Sent** after sending. The app never sends mail.
4. **Manage Partners** — Browse Contacted, Interested, Pilot and Regular relationships, with Closed available as a filter. Open a dedicated partner page to update Stage, edit the organisation/grounds arrangement, record interactions, draft follow-ups and log handovers. AI interpretation of Email or Text/WhatsApp is an optional, review-and-apply aid; it never saves changes by itself.
5. **Record Handover** — Enter date, optional actual time, kilograms and notes, with optional exceptions to the partner's usual transport/grounds-condition arrangement. This records a physical transfer, **not** proof of beneficial reuse. No reuse-certification or reuse-rate fields are collected. Intended and agreed reuse purposes belong on the partner profile, not each handover.

### Forecast terminology and demo scenario

**Sponsor monthly references (total beverages):** Republic Polytechnic 700; 100 Pasir Panjang 500; Changi General Hospital 1,000–1,200; NTU 800–1,000; Singapore Business Federation 600–800. The previous 9,100 cups × 20 g = 182 kg/week midterm illustration is historical and superseded as the default.


The current editable forecast uses CoffeeBot’s five reported machine locations: **3,600–4,200 total beverages/month**, assumed **60% coffee-based** with **15 g of grounds per coffee**. That gives **32.4–37.8 kg/month** potentially generated. The midpoint converts to **900 total drinks/week**, or **8.1 kg/week**. Fictional Regular partner arrangements of **6.5 kg/week** leave a **1.6 kg/week illustrative gap**. Neither fictional uptake nor forecast mass represents actual collected/reused material.

- **Forecast Supply** = total beverages per week × coffee-based share / 100 × grounds per coffee (g) / 1,000.
- **Forecast Demand** = sum of the recorded weekly intake of **Regular** partners with positive capacity. Moving an arrangement to Regular is the staff's explicit stage decision; no additional hidden confirmation flag is required. Pilot, Interested, Contacted, Suggested and Closed are excluded.
- **Projected Gap** = max(0, Forecast Supply − Forecast Demand).
- **Handed Over This Week** = sum of physically logged handovers dated within the current Singapore week. It is not capacity, forecast demand or verified reuse.

These calculations use the shared backend `numbers()` implementation. Future sponsor-confirmed requirements may change the data model; they are not assumed now.

## Discovery sources and assessment

Discovery currently has **six independent source families**:

- [NParks Community in Bloom](https://data.gov.sg/datasets/d_f91a8b057cfb2bebf2e531ad8061e1c1/view) — registered community-garden sites.
- [NParks public parks](https://data.gov.sg/datasets/d_0542d48f0991541706b58059381a6eca/view) — potential managed green sites.
- [MOE School Distinctive Programmes](https://data.gov.sg/datasets/d_db1faeea02c646fa3abccfa5aba99214/view), joined with the [MOE School Directory](https://data.gov.sg/datasets/d_688b934f82c1059ed0a6993d2a829089/view) — schools with documented programmes, **not** verified gardens or recipients.
- [NEA food waste recycling facilities](https://www.nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/food-waste-management/food-distribution-organisations-local-recycling-facilities-and-suppliers) — material-specific listing evidence where published.
- [Landscape Industry Association (Singapore)](https://lias.org.sg/members-list/) — landscaping and horticulture organisations, not evidence of acceptance.
- [SFA licensed land-based farms](https://www.sfa.gov.sg/docs/default-source/food-farming/licensed-land-based-farms.pdf) — licensed vegetable/crop farms and mixed vegetable/aquaculture operators only. This official PDF establishes licensed farming activity, **not** soil use, willingness, contact authority, capacity or suitable grounds handling. Fish-only, dairy and egg farms are excluded.

The sources run independently with source caching and run history. Candidate records store URLs, evidence and known sourcing dates. Deduplication, contact lookup, geocoding and persisted partnership states use conventional code.

**Fit Score (0–100) is provisional prioritisation, not a probability of acceptance.** Current adjustable weights: suitability **30**, source evidence **30**, HQ proximity **5**, intake & operations **35**. A valid Codex evidence assessment blends equally with the deterministic rule values for suitability and source evidence; proximity and operational compatibility remain based on recorded facts. Stale citations, generic directory claims and historical advisory AI reviews leave the deterministic score in place. Recorded quantity has substantial weight; frequency and collection arrangements count only when documented. Missing intake data does not disqualify a partner. Contactable First remains separate. See the [model evaluation](docs/model-evaluation.md) and [29 October diagnostic rerun](docs/controlled-rerun-results-2026-10-29.md).

The ranking considers intake only where recorded; it cannot infer quantities from organisation size or category, optimise delivery routes, or claim partner willingness. Approximate HQ proximity has a small role because an existing delivery route can be more convenient than a closer new stop. CoffeeBot has no immediate reuse-method restrictions; staff must still check intended reuse, capacity, frequency and practical transport.

## Auditability, limitations and project structure

- Source results, latest scan history (up to 40 runs), AI source and prompt hashes and provider usage metadata are stored locally in `data/state.json`; source caches live in `data/source-cache/`. Both are ignored by Git. Stopping before commit discards partner/assessment changes from that run, but not already consumed AI usage or downloaded caches.
- Staff may correct or archive activity and handover entries while retaining an internal history. Records are local to one machine, without multi-user authentication or shared synchronization.
- The app does not directly ingest CoffeeBot IoT data, verify partner acceptance or fees, track live grounds stock/disposal, or certify end use. Reuse-confirmation inputs and the old reuse-rate metric were retired. Pre-existing confirmation metadata in old handover records is ignored by current calculations, not used to make new claims. An actual transfer is not automatically actual *reuse*. There is no defensible CO₂e claim without CoffeeBot baseline and external evidence.
- Do not expose the development server publicly without production authentication, data protection and deployment controls. Frontend styling includes web-loaded fonts/assets.
- `public/` contains the HTML/CSS/JS interface; `server.js` exposes the local API and persistence; `src/` contains forecasting, discovery, source integrations, geocoding and AI adapters; `test/` covers business rules, API and UI. Use the current UI guidelines listed below alongside the implemented CSS.

## Documentation

- [Problem and sponsor questions](docs/problem-statement.md)
- [Implemented prototype, data definitions and validation plan](docs/prototype.md)
- [UI design conventions](docs/ui-guidelines.md)
