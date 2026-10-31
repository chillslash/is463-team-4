# CoffeeBot Circularity Copilot

**31 October partner-discovery workflow:** CoffeeBot first discovers prospects from six independent source families and applies conservative deterministic pre-ranking. A configurable, source-balanced cohort (0–24 per run) then receives shared organisation research: source-provided official websites are reused, missing websites may be resolved with a bounded Codex web-search call, every returned HTTPS site is independently identity-checked, and relevant same-site pages are read for organisation-specific evidence. Only after that shared evidence packet is built does the configured AI evaluation run. The evaluator itself does **not** browse. The final **Outreach Priority** is pre-contact triage only: Reuse Suitability 40%, Organisation-Specific Evidence 25%, Potential Intake Scale 20%, HQ Proximity 15%. Potential Intake is a relative, evidence-backed estimate of likely absorption scale—not actual or agreed kg/week. Frequency, willingness and collection arrangements remain post-contact facts.


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

Enable the Codex integration in a local, Git-ignored `.env` file:

```ini
AI_PROVIDER=codex
# CODEX_PATH=C:\path\to\codex.exe
```

Codex uses the installed, authenticated CLI under the account running the server. Discover Partners selects a configurable, source-balanced cohort of up to 24 Suggested prospects per run. For that bounded cohort, source-provided websites are reused; when Codex is the configured provider, missing official sites can be searched in batches and are saved only after an independent HTTPS/name check. The app then reads up to three relevant same-site pages and retains page-level source URLs for factual excerpts. Missing or inaccessible websites never block evaluation. Because the SFA licence register has company names but no addresses, discovery also attempts a bounded SFA location-enrichment pass: up to 12 unresolved farms per run may have an official website resolved, and an unambiguous Singapore postcode published on that verified site is matched against the local postal-coordinate snapshot to calculate proximity. Failed or ambiguous location checks cool down for 30 days so later runs move on to other farms. Change the evaluation budget in **Assessment Settings** or set `AUTO_AI_REVIEW=false` to disable automatic evaluations; staff-triggered evidence review remains available. Evaluation receives the frozen evidence packet and does not browse independently. Historical advisory reviews remain visible but do not change active evidence-v4 scoring.

For postal-code distance matching, run `npm run setup:geocodes` once. It caches a [2023 Singapore postal-coordinate snapshot](https://github.com/faezlatiff/SingaporePostalToLatLong) in `data/source-cache/`. Optional OneMap lookup for otherwise unresolved locations requires `ONEMAP_EMAIL` / `ONEMAP_PASSWORD` or `ONEMAP_ACCESS_TOKEN`. Distances are approximate straight lines from CoffeeBot HQ (8 Lor Bakar Batu, Singapore 348743), not travel distances.

## Current staff workflow

The sidebar has **Dashboard**, **Discover Partners** and **Manage Partners**. Draft Outreach and individual partner pages open contextually.

1. **Dashboard** — Edit an illustrative weekly supply estimate and compare it with Forecast Demand, Handed Over This Week and Projected Gap. Use **Log Handover** here for a quick partner selection and transfer entry; there is no duplicate handover button on the Manage Partners list.
2. **Discover Partners** — Run and optionally stop source discovery, inspect sourced Suggested prospects, sort/filter by score/category/distance and inspect their provenance. **Contactable First** is an independent ordering checkbox (email, then published contact page, then no identified contact route) which can be combined with Outreach Priority/Nearest/Recently Sourced and **AI-Assessed Only**; it never alters score or filters out unmatched contacts. Start a reviewed AI assessment of an individual lead or open Draft Outreach. Discovery does not imply permission to receive grounds. Suggested cards show **Contact Route** independently of Outreach Priority: published email, published contact page, or no identified route. Failed website checks are reported separately from completed checks without a contact. Within Details, **Research Contact** checks a supplied public HTTPS organisation website (up to three bounded pages) and retains page-level attribution. Staff may look up the organisation website manually; no contact or authority is invented.
3. **Draft Outreach** - Generate or edit an email and explicitly **Record Sent** after sending it externally. An accompanying four-section **Reuse Guide** is assembled deterministically from the selected partner information and CoffeeBot operational facts, with cautious trial questions, editable text and a separate Copy Guide action. It makes no additional AI call and is never sent automatically. Guide edits remain in the current page session until copied; they are not saved as partner records.
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

**Outreach Priority (0–100) is pre-contact prioritisation, not a probability of acceptance.** Current adjustable weights are Reuse Suitability **40**, Organisation-Specific Evidence **25**, Potential Intake Scale **20**, and HQ Proximity **15**. A valid evidence assessment blends with deterministic rule values for suitability, evidence and relative intake scale; proximity remains deterministic. Stale citations, generic directory claims and historical advisory AI reviews leave the deterministic fallback in place. Contactable First remains a separate ordering preference.

CoffeeBot’s emphasis on quantity is represented only as **Potential Intake Scale**: a cautious relative estimate based on source/category evidence and, where available, cited organisation-specific evidence of operating scale such as processing throughput, growing area, commercial production or multiple facilities. It never becomes an invented kg/week figure. Frequency, willingness, consistency and collection/delivery remain relationship facts after outreach.

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
