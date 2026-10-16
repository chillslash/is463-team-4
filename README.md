# CoffeeBot Circularity Copilot

IS463 group prototype based on the Google Stitch screens. The app estimates spent coffee grounds, finds **potential** reuse partners in Singapore, prepares staff-reviewed outreach, tracks pipeline stages and records actual handovers.

## Start

Requires Node.js 20.12+.

```powershell
cd C:\Users\ryano\Documents\Projects\is463-group-project
npm start
```

Open **http://localhost:4173**. Run `npm test` to run the automated checks.

Each team member configures AI **on their own computer**, not in the user-facing interface. Create a **local** `.env` file (ignored by Git):

```ini
AI_PROVIDER=codex
# Optional if codex is not available through PATH:
CODEX_PATH=C:\path\to\codex.exe
```

Alternatively set `AI_PROVIDER=claude` for an installed, authenticated Claude Code CLI, or `AI_PROVIDER=template` for no model calls. Each user must sign in to their selected CLI under the same OS account that launches the app. These commands use the local CLI subscription rather than API billing. An absent or failing AI backend leaves sourced, rule-ranked candidates in place; outreach generation reports errors instead of silently claiming AI succeeded.

## Workflow

1. **This Week:** Change the illustrative forecast: 9,100 cups × 20 g = 182 kg, simulated regular partner capacity 140 kg and projected surplus 42 kg. These are **demo figures**, not CoffeeBot telemetry or real commitments.
2. **Suggested Partners:** Select **Discover Partners**. The app queries source datasets, removes duplicates, adds new candidates, reuses unmodified AI assessments, evaluates a bounded batch of unevaluated leads and ranks them. Progress is shown by completed stages. Only sourced, non-fictional candidates appear in Suggested.
3. **Outreach Draft:** Generate a reviewable email via the configured local AI CLI, or a transparent rule-based template. The application **does not send emails**.
4. **Partner Pipeline:** Update contacted, interested, trial and regular relationships. Fictional demo organisations illustrate these later stages. Simulated regular capacity counts toward the demo forecast but must never be presented as a real agreement.
5. **Log Handover:** Record kg actually transferred and evidence level. A recorded handover is not automatically verified reuse.

## Sources and traceability

Live discovery aggregates independently from:

- [NParks Community in Bloom](https://data.gov.sg/datasets/d_f91a8b057cfb2bebf2e531ad8061e1c1/view): registered garden sites, including some schools and institutions.
- [NParks public parks](https://data.gov.sg/datasets/d_0542d48f0991541706b58059381a6eca/view): possible sites for horticultural activity.
- [MOE School Distinctive Programmes](https://data.gov.sg/datasets/d_db1faeea02c646fa3abccfa5aba99214/view), joined with the [MOE School Directory](https://data.gov.sg/datasets/d_688b934f82c1059ed0a6993d2a829089/view): schools with documented sustainability-related programmes. **A programme does not prove the presence of a garden or a willingness to accept grounds.**
- [OpenStreetMap Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API): named growing sites, gardens, nurseries, parks and zoos; public endpoints may be unavailable.
- [NEA Food Waste Recycling Facilities](https://www.nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/food-waste-management/food-distribution-organisations-local-recycling-facilities-and-suppliers): facilities and published accepted materials. Some listings explicitly mention used coffee grounds. The separate equipment-supplier table is excluded.
- [Landscape Industry Association (Singapore) members](https://lias.org.sg/members-list/): landscape and horticultural operators. Membership is not proof of grounds acceptance.

The source searches are independent, so one failed API need not cancel all results. Successful official dataset snapshots are cached under `data/source-cache/` for up to 24 hours, with stale snapshots usable during outages. Each saved candidate has source records/URLs, its initial sourced date (if known) and last-seen date. Older imports with an unknown first-sourced date are not assigned a fabricated original date.

Every discovery run stores its source success/failure summary, source cache age, AI provider, number of AI calls, assessment count and timestamp in `data/state.json`. The 40 latest runs are retained. AI assessments record the provider, assessment date, source references, run ID and a hash of the exact input facts and prompt. This is **auditability**, not independent fact-checking. The CLI is instructed not to browse or use tools: AI interprets sourced records, rather than performing autonomous web search. **Accepting grounds, suitability, capacity and contact authority remain unverified until confirmed by staff.**

AI assessment processes at most **24 pending leads per click**, in batches of 12, favouring promising candidates. Unchanged source facts are cached by hash so subsequent runs do not needlessly repeat an assessment. New or changed candidates can be assessed in later runs. Each request starts an independent ephemeral CLI session. The app counts AI calls but does **not** claim to measure exact token consumption.

## HQ, handling and limitations

Use **8 Lor Bakar Batu, #05-01, Singapore 348743** as the CoffeeBot HQ reference. Its approximate map coordinates in this demo are **1.3275° N, 103.8723° E**. Distances shown are approximate **straight-line distances**, not driving kilometres. School programme records without coordinates show distance unavailable. Whether partners collect at HQ or CoffeeBot delivers remains to be agreed; neither is promised in outreach.

Staff must verify grounds handling requirements, material suitability, and any actual beneficial reuse. Grounds are sun-dried at HQ with unmeasured moisture. No defensible CO₂e figure is calculated without confirmed material flows, disposal baseline and emissions factors. AI assessments are suggestions, **not external evidence of acceptance**.

The app is a single-user local prototype using JSON state, not a production multi-user service. Do not expose it publicly without authentication and security controls. The five Stitch-inspired screens use Tailwind CDN and Google Fonts, requiring internet connectivity for styling. The browser talks to a local Node backend. `data/`, `.env` and `node_modules/` are Git-ignored. No GitHub remote is configured.

## Project files

- `public/`: Stitch-inspired frontend and interactions.
- `src/core.js`: scoring, demo state, forecasts and data transformations.
- `src/discovery.js`, `src/moe.js`, `src/directories.js`, `src/contacts.js`: multi-source search, caching and school programme data.
- `src/ai.js`: local Codex and Claude Code CLI adapters.
- `server.js`: API, JSON persistence, batch AI assessment and discovery audit.
- `test/`: unit and API integration tests.
- `docs/`: problem statement and prototype scope.

## Discovery and UI refinement

- Fit Score is an explainable 0–100 relevance score, not the probability of acceptance. Weights: reuse suitability 40, source evidence 35, proximity 10, operational readiness 15. AI adds a bounded adjustment. Unknown location receives neutral proximity points without a fabricated distance.
- Find Partners supports Best Fit, Nearest and Recently Sourced sorting, Why Recommended notes, expandable source and scoring details, and SGT timestamps. The discovery progress bar replaces the last-scan summary only during scanning.
- Pipeline shows at most five Suggested leads with a View All link. The later stages retain their members. Outreach has a searchable partner field, and Save Draft is clearly distinct from sending. Unverified badges have been removed from the routine card view.
- A dated local-state backup is required before resetting the historical Suggested list; later-stage demo partners and the cached public source snapshots are preserved. A subsequent discovery can then regenerate Suggested results and new sourcing dates.

## Evidence-backed contact discovery

- NEA and LIAS public directory contacts are extracted directly, with the listing URL stored alongside each email. The app does not guess email addresses.
- For promising leads with a source-linked organisation website but no email, it checks up to five public websites per discovery, inspecting at most three pages per site. Failed lookups are not repeated for seven days.
- Candidate assessment rotates across independent source groups, saving results against original partner records and reusing unchanged assessments on later runs.
- NParks datasets are sampled across broad geographic regions instead of taking only nearest locations. Proximity is now 10 of 100 Fit Score points. Last Scanned shows source success counts, and the progress bar animates during work.
