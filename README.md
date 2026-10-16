# CoffeeBot Circularity Copilot

Working IS463 Group Project prototype based on the five-screen **Google Stitch export** and the team's midterm workflow. The interface retains the exported Stitch navigation/layout and visual design tokens; the screens are wired to one backend and persistent state.

## Quick start

Requirements: **Node.js 20+**. No npm installation or database server required.

```powershell
cd C:\Users\ryano\Documents\Projects\is463-group-project
npm start
```

Visit **http://localhost:4173**. Run `npm test` to execute the automated tests. Optional: `npm run dev` to restart the server when JavaScript changes.

The first run creates `data/state.json` with the **fictional midterm demonstration dataset**, which is gitignored. All changes persist across refreshes and restarts. To revert to the original example data use `POST /api/reset-demo` (destructive to local changes); back up `data/state.json` first if needed.

## Demonstration journey

1. **This Week:** Start with 9,100 illustrative cups × 20 g = 182 kg forecast, 140 kg simulated regular pickup capacity, 42 kg projected gap. Change values via **Edit forecast** to recompute them.
2. **Find Partners:** Click **Discover live sites** to combine the official [NParks Community in Bloom dataset](https://data.gov.sg/datasets/d_f91a8b057cfb2bebf2e531ad8061e1c1/view), the [NParks Parks dataset](https://data.gov.sg/datasets/d_0542d48f0991541706b58059381a6eca/view) and the [OpenStreetMap Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API). Sources run independently, so partial success is retained. This is a live API query, not HTML scraping. It may fail if the public service is down/rate-limited; the error is shown and existing leads remain. Inspect the source link and unknowns. You can add or edit leads manually.
3. **Outreach:** Select a candidate, generate an editable draft, review it, and copy or save it. No email is sent. Choose the local AI provider (Codex, Claude, or a safe template) via **AI settings**. Signed-in local CLI is required for model-generated drafts; no API key is needed.
4. **Pipeline:** Move a lead through Suggested → Contacted → Interested → Trial → Regular. Only **verified + confirmed + regular** capacity counts against the projected gap; all other capacities remain prospective.
5. **Log Handover:** Record actual kilogram amounts and distinguish unverified transfer, partner-confirmed intended use, and confirmed actual reuse. Tracked outcomes update immediately. Provide *measured* collected kilograms separately for a reuse-rate denominator.

## Evidence & limitations

- **Initial contacts/organisations are fictional** and must not be approached as if real. Existing regular capacity is illustrative, *not* actual CoffeeBot agreements.
- **NParks and OpenStreetMap return sites, not willing recipients.** Staff must identify the relevant decision-maker, verify whether they accept grounds, handling requirements, willingness, fees and capacity. Parks/NParks sites are not presumed to accept grounds. Distances use a clearly labelled Singapore city-centre **demo reference**, not CoffeeBot HQ.
- **No CoffeeBot IoT connection** is available. Weekly cup counts are editable sample inputs, not live machine telemetry.
- **Outreach is human-reviewed.** Copying/saving a draft does not mean a message was sent; pipeline status is updated by staff separately.
- **Handover ≠ verified reuse.** The impact screen tracks evidence levels separately. No fabricated CO₂e or automatic net carbon handprint is shown without an agreed disposal route and defensible emission factors.
- The source uses Stitch Tailwind CDN and Google Fonts, so styling requires internet access; business data is served by the local Node server.
- Single-user classroom prototype using an atomic JSON file, not a hardened multi-user production service. Do not expose it publicly without authentication and security hardening.
- NParks open data uses the Singapore Open Data Licence. The Overpass source is subject to its own terms and fair-use requirements. If unavailable, manually add a sourced real candidate and clearly record provenance.

## Configuration

```powershell
$env:PORT=4173                    # optional; default 4173
$env:OPENAI_API_KEY="..."        # optional; otherwise template fallback
$env:OPENAI_MODEL="gpt-4.1-mini"  # optional
npm start
```

Keep credentials in environment variables, not Git. No remote GitHub repository is configured or pushed yet.

## Structure

- `public/*.html` — original Stitch design shell for five screens, wired to the shared app.
- `public/app.js`, `public/app.css` — screens, interactions and styling.
- `src/discovery.js` — independent official garden, park and OpenStreetMap requests; candidate merging and partial failures.\n- `src/ai.js` — local Claude Code and Codex CLI adapters, structured response parsing, strict timeouts.\n- `server.js` — minimal HTTP API, persistence, live discovery and optional draft generation.
- `src/core.js` — model, forecast, ranking, OpenStreetMap transformation, fallback outreach.
- `test/` — calculations and API integration tests.
- `docs/` — problem statement and prototype specification.
- `design/DESIGN.md` — original Stitch design tokens and notes.

## AI via group members' subscriptions

The app runs locally. Each teammate independently installs and signs into either the **Codex CLI** (ChatGPT account) or **Claude Code CLI** (Claude account), then chooses that provider using **AI settings** in the UI. The choice is saved in local `data/state.json` (gitignored). It is used for both **Assess with AI** on discovered candidates and **Generate draft** on Outreach. Selection `No AI` uses an explicit rule-based email and disables AI candidate assessment.

- Codex: Install `@openai/codex`, run `codex login`, then check `codex exec --help`.
- Claude: Install the official Claude Code CLI, run `claude` and authenticate, then check `claude --help`.
- Launch `npm start` under the **same operating-system user** who authenticated that CLI.
- CLI entitlements and usage limits depend on each teammate's plan. App subscriptions do not give third-party API keys. API billing/keys are not required for this **local CLI** integration.
- The app sends bounded text prompts over standard input. Codex runs in a read-only sandbox; Claude's tools are disabled. Models only draft text or triage publicly sourced candidates; they must not be trusted as evidence of acceptance, fees, contact authority or capacity.
- If a CLI is missing, not signed in, or returns invalid JSON, the UI reports an error instead of quietly pretending AI ran. Use the No AI setting for template drafting.
- The CLI-dependent paths are tested using a mock runner; **real subscription-authenticated inference must be tested by a logged-in teammate**. The Gateway account does not have these CLIs installed.

## Discovery coverage (initial implementation)

**Community in Bloom** registered garden locations and **NParks public parks** are separate official data.gov.sg sources, fetched on each discovery request. **OpenStreetMap** is queried independently for named gardens, allotments, urban growing sites, nurseries and zoos; public Overpass instances are sometimes unavailable (HTTP 500). In that case, the two official datasets can still supply candidates. A source breakdown and partial failures are shown after discovery. Nearby duplicate place names are suppressed.

All discoveries are **locations/leads**, not confirmed willingness, fees, collection authority or capacity. Community growing sites rank ahead of generic public parks *as a search heuristic*, not as proof of acceptance. Use **Assess with AI** for a bounded batch of candidates based on these source facts; assessments are not independent web research. Google Places is not used because it would require an API key, billing and review of Places data-use restrictions. Staff can manually add verifiable leads not in these datasets.
## Interface refinement

The Stitch palette and five-screen shell are retained. Headline numbers are larger, routine badges are reduced, partner cards show short summaries with expandable evidence, and search results display 12 at a time with a **Show more results** control. The illustrative chart is expandable rather than always competing with the main metrics. The pipeline uses wider horizontally scrollable columns, outreach gives the email editor more space, and the small-screen layout collapses the fixed sidebar into a top navigation area. Source and acceptance uncertainty remain visible in the condensed view.