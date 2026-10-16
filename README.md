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
2. **Find Partners:** Click **Discover live sites** to retrieve real geographic candidates from the official [NParks Parks dataset on data.gov.sg](https://data.gov.sg/datasets/d_0542d48f0991541706b58059381a6eca/view), with the [OpenStreetMap Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) as fallback. This is a live API query, not HTML scraping. It may fail if the public service is down/rate-limited; the error is shown and existing leads remain. Inspect the source link and unknowns. You can add or edit leads manually.
3. **Outreach:** Select a candidate, generate an editable draft, review it, and copy or save it. No email is sent. Without `OPENAI_API_KEY` the app uses a transparent, safe template. With a key it attempts AI generation, falling back to the template if unavailable.
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
- `server.js` — minimal HTTP API, persistence, live discovery and optional draft generation.
- `src/core.js` — model, forecast, ranking, OpenStreetMap transformation, fallback outreach.
- `test/` — calculations and API integration tests.
- `docs/` — problem statement and prototype specification.
- `design/DESIGN.md` — original Stitch design tokens and notes.
