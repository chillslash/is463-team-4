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

1. **Dashboard:** Change the illustrative forecast: 9,100 cups × 20 g = 182 kg, simulated regular partner capacity 140 kg and projected surplus 42 kg. These are **demo figures**, not CoffeeBot telemetry or real commitments.
2. **Find Partners:** Select **Discover Partners**. The app queries source datasets, removes duplicates, adds new candidates, reuses unmodified AI assessments, evaluates a bounded batch of unevaluated leads and ranks them. Progress is shown by completed stages. Only sourced, non-fictional candidates appear in Suggested.
3. **Draft Outreach:** Generate a reviewable email via the configured local AI CLI, or a transparent rule-based template. The application **does not send emails**.
4. **Manage Partners:** A unified active list (Contacted, Interested, Trial, Regular), with Closed available as a filter. Staff can update responses, stages, next actions, follow-up dates and dated activity. Demo relationships are not actual commitments.
5. **Record Handover (within Manage Partners):** Log the collection/transfer date, optional actual handover time, amount (kg) and Notes. Reuse purposes live on the partner profile, not individual batches. No per-batch confirmation is required. A recorded handover is not automatically verified reuse.

## Sources and traceability

Live discovery aggregates independently from:

- [NParks Community in Bloom](https://data.gov.sg/datasets/d_f91a8b057cfb2bebf2e531ad8061e1c1/view): registered garden sites, including some schools and institutions.
- [NParks public parks](https://data.gov.sg/datasets/d_0542d48f0991541706b58059381a6eca/view): possible sites for horticultural activity.
- [MOE School Distinctive Programmes](https://data.gov.sg/datasets/d_db1faeea02c646fa3abccfa5aba99214/view), joined with the [MOE School Directory](https://data.gov.sg/datasets/d_688b934f82c1059ed0a6993d2a829089/view): schools with documented sustainability-related programmes. **A programme does not prove the presence of a garden or a willingness to accept grounds.**
- [NEA Food Waste Recycling Facilities](https://www.nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/food-waste-management/food-distribution-organisations-local-recycling-facilities-and-suppliers): facilities and published accepted materials. Some listings explicitly mention used coffee grounds. The separate equipment-supplier table is excluded.
- [Landscape Industry Association (Singapore) members](https://lias.org.sg/members-list/): landscape and horticultural operators. Membership is not proof of grounds acceptance.

The source searches are independent, so one failed API need not cancel all results. Successful official dataset snapshots are cached under `data/source-cache/` for up to 24 hours, with stale snapshots usable during outages. Each saved candidate has source records/URLs, its initial sourced date (if known) and last-seen date. Older imports with an unknown first-sourced date are not assigned a fabricated original date.

Every discovery run stores its source success/failure summary, source cache age, AI provider, number of AI calls, assessment count and timestamp in `data/state.json`. The 40 latest runs are retained. AI assessments record the provider, assessment date, source references, run ID and a hash of the exact input facts and prompt. This is **auditability**, not independent fact-checking. The CLI is instructed not to browse or use tools: AI interprets sourced records, rather than performing autonomous web search. **Accepting grounds, suitability, capacity and contact authority remain unverified until confirmed by staff.**

AI assessment processes at most **24 pending leads per click**, in batches of 12, favouring promising candidates. Unchanged source facts are cached by hash so subsequent runs do not needlessly repeat an assessment. New or changed candidates can be assessed in later runs. Each request starts an independent ephemeral CLI session. The app records CLI-reported token counts when available, together with the provider, duration and outcome of each AI call. Missing usage is not estimated.

### Distance resolution (no AI)

Discovery calculates approximate straight-line distance from HQ. MOE school names
are matched to the official school directory to recover addresses and postal codes.
LIAS businesses already provide postal codes. These are matched against a cached
[Singapore postal-coordinate snapshot (2023)](https://github.com/faezlatiff/SingaporePostalToLatLong)
collected from OneMap, without an AI model or extra API calls.

On a fresh checkout, run `npm run setup:geocodes` once. The lookup is cached
under the Git-ignored `data/source-cache/` folder. The 2023 dataset may be stale
and sometimes stores only the first address for a postcode; distances are
indicative and are not driving distances.

For places without a postcode, optionally register for
[OneMap Search](https://www.onemap.gov.sg/apidocs/search) and set
`ONEMAP_EMAIL` and `ONEMAP_PASSWORD` in the local `.env` (or supply
`ONEMAP_ACCESS_TOKEN`). The service requires a token and is not queried
unless configured. Lookups are cached, and ambiguous results are left Unknown
rather than receiving an invented location.

## HQ, handling and limitations

Use **8 Lor Bakar Batu, #05-01, Singapore 348743** as the CoffeeBot HQ reference. Its approximate map coordinates in this demo are **1.3275° N, 103.8723° E**. Distances shown are approximate **straight-line distances**, not driving kilometres. Partners without validated coordinates show distance unavailable. Whether partners collect at HQ or CoffeeBot delivers remains to be agreed; neither is promised in outreach.

Staff must verify grounds handling requirements, material suitability, and any actual beneficial reuse. Grounds are sun-dried at HQ with unmeasured moisture. No defensible CO₂e figure is calculated without confirmed material flows, disposal baseline and emissions factors. AI assessments are suggestions, **not external evidence of acceptance**.

The app is a single-user local prototype using JSON state, not a production multi-user service. Do not expose it publicly without authentication and security controls. The navigation pages use Tailwind CDN and Google Fonts, requiring internet connectivity for styling. The browser talks to a local Node backend. `data/`, `.env` and `node_modules/` are Git-ignored. No GitHub remote is configured.

## Project files

- `public/`: Stitch-inspired frontend and interactions.
- `src/core.js`: scoring, demo state, forecasts and data transformations.
- `src/discovery.js`, `src/moe.js`, `src/directories.js`, `src/contacts.js`: multi-source search, caching and school programme data.
- `src/ai.js`: local Codex and Claude Code CLI adapters.
- `server.js`: API, JSON persistence, batch AI assessment and discovery audit.
- `test/`: unit and API integration tests.
- `docs/`: problem statement, prototype scope, and [UI consistency guide](docs/ui-guidelines.md) for future edits.

## Discovery and UI refinement

- Fit Score is an explainable 0–100 relevance score, not the probability of acceptance. Weights: reuse suitability 40, source evidence 35, proximity 10, operational readiness 15. AI adds a bounded adjustment. Unknown location receives neutral proximity points without a fabricated distance.
- Find Partners supports Best Fit, Nearest and Recently Sourced sorting, Why Recommended notes, expandable source and scoring details, and SGT timestamps. The discovery progress bar replaces the last-scan summary only during scanning.
- Discovery places search and filters on the left and results on the right. Manage Partners uses a unified alphabetical list, not separate stage columns. Outreach has a fixed CoffeeBot subject, a partner-specific proposed use and a Record Sent action that archives the reviewed message only after staff confirmation.
- A dated local-state backup is required before resetting the historical Suggested list; later-stage demo partners and the cached public source snapshots are preserved. A subsequent discovery can then regenerate Suggested results and new sourcing dates.

## Evidence-backed contact discovery

- NEA and LIAS public directory contacts are extracted directly, with the listing URL stored alongside each email. The app does not guess email addresses.
- For promising leads with a source-linked organisation website but no email, it checks up to five public websites per discovery, inspecting at most three pages per site. Failed lookups are not repeated for seven days.
- Candidate assessment rotates across independent source groups, saving results against original partner records and reusing unchanged assessments on later runs.
- NParks datasets are sampled across broad geographic regions instead of taking only nearest locations. Proximity is now 10 of 100 Fit Score points. Last Scanned shows source success counts, and the progress bar animates during work.

- The Find Partners cards show source evidence first and a segmented Fit Score bar inside Details, with all four scoring dimensions labelled. There is no nested score dropdown. Contact emails stay in Outreach Draft, not in discovery cards. Outbound drafts keep the email body editable, without a separate Before Outreach panel.

## Navigation

The sidebar now contains Dashboard, Discover Partners and Manage Partners only. Draft Outreach remains accessible from a partner card, but is no longer a sidebar destination. The old /this-week URL still reaches Dashboard; /pipeline opens Manage Partners. No extra descriptive page text is introduced.

## AI-led partner evaluation

Source discovery, deduplication, distance, contact extraction and pipeline records remain conventional software. Codex/Claude evaluates source-diverse candidates on reuse suitability (0–40), source evidence specificity (0–35) and operational compatibility (0–10). The application adds deterministic HQ proximity (0–10) and up to five operational points for sourced contact or verified capacity, yielding an explainable 100-point Fit Score. It is not an acceptance probability.

AI assessments include reasoning, a verification question, source links, provider, run ID, input/prompt hashes and a versioned rubric. Unassessed candidates show a clearly labelled Preliminary Screening score rather than claiming AI evaluation, and are ordered after AI-reviewed suggestions. Up to 24 candidates across sources are assessed per scan; unchanged assessments are cached and invalidated when supporting facts change. Existing Codex/Claude CLI configuration is preserved.

## Usability refinement — October 2026

- Manage Partners uses clickable stage counts instead of a duplicate Stage dropdown. Clicking the selected stage again, or **All Active**, resets the list.
- Add/Edit Partner requires only **Name**, **Type** and **Stage** (red asterisks). Potential use, location, frequency, capacity and notes are optional; **Contact Email** is explicitly marked optional. Autocomplete is disabled. Source and internal verification flags are hidden, but existing evidence and confirmation data remain intact.
- Fictional demo partners have safe non-deliverable .example contact emails, illustrative regions, next actions and demo activity histories. These are not real CoffeeBot contacts or verified commitments. Legacy demo records receive missing details without overwriting recorded user activity.
- NParks Community in Bloom school gardens match the cached official MOE School Directory for a real street address and postcode when available, including previously discovered leads. No street address is fabricated for unmatched sites.
- Outreach Draft is narrower and centred, with a prominent Edit Partner control and icons for Generate Draft, Copy Email and Record Sent. Both template and AI drafting prefer conversational emails without section labels.

## Discovery cancellation and visual refinement — October 2026

- **Stop Discovery** appears while a run is active, including after refreshing the Find Partners page. It aborts source downloads, contact research, geocoding and any active AI request, and drops in-memory partner changes, assessments and audit events before the transaction commits. The server rejects stopping after the final save has begun; it never reports an already-saved run as discarded. Previously completed runs remain intact.
- Cancelling a scan does not refund any AI calls already made and may leave non-partner source caches fetched before cancellation, which can be reused later. Cached data is not counted as a completed discovery result.
- Discovery listing metadata (category, distance, sourced date) uses small neutral icons. Manage Partners uses a two-column card layout on wider displays and a single column on narrower displays.
- Draft Outreach now uses a named contact when appropriate, otherwise Dear [Organisation] Team. Reuse guidance is included naturally in the email itself and tailored to source evidence. For direct coffee-ground listings such as A1 Environment, it asks about material intake/preparation rather than asserting acceptance or verified reuse.

## Partner editor polish — October 2026

- Find Partners uses consistent white outlined **Edit Partner** and **AI Review** actions; Edit Partner is also labelled consistently in Draft Outreach and Manage Partners.
- Add/Edit Partner groups existing fields into **Partner Details** (name, type, stage, contact and location) and **Grounds Reuse** (proposed/confirmed use, frequency, weekly kg capacity and notes). Section headings use restrained icons, separators and aligned fields rather than decorative cards.
- The modal contains its own scrollable form content and a persistent heading and save/cancel footer. The underlying page's scroll is locked while the modal is open and restored on save, cancel, Escape or backdrop dismissal.

## Outreach confirmation and stage correction — October 2026

- **Record Sent** opens a small branded **Confirm Record Sent** dialog with Cancel and Record Sent actions, rather than a native browser confirmation. Only confirming invokes the API; a successful record opens **the individual partner page**.
- Manage Partners' stage editor now includes **Suggested**, allowing staff to correct an accidentally advanced lead without deleting the partner or falsifying earlier outreach and activity records. Moving to Suggested removes the lead from the active management list and makes it available under Find Partners again.

## Manage Partners tabs — October 2026

- Each relationship card has a dedicated white outlined **Manage** button; the whole card is no longer a button.
- The partner dialog has **Relationship** and **Edit Partner** tabs. Relationship owns stage, response, next action, follow-up, activity and handovers; Edit Partner reuses the existing Partner Details and Grounds Reuse sections for organisation information and material-specific attributes.
- The stage field appears only in Relationship inside the two-tab partner workspace. New-partner creation still requires a starting stage. Inactive tabs disable their fields so only the currently selected tab is saved; changes in one tab cannot overwrite the other tab's values. The tab headings remain visible during modal scrolling and support keyboard navigation.
- Activity is organised under a proper section heading, with a compact log-entry area and chronological history. Contact detail remains a current value rather than a fabricated multi-contact CRM; staff can record earlier conversations in Activity.

## Partnership journal — October 2026

- **Relationship** now starts with an overview of the current contact, latest recorded response, next action, follow-up date and a separately saved stage selector. Responses do not automatically advance stages.
- A distinct **Log Activity** action records interaction type (phone, email, WhatsApp, meeting, site visit or other), interaction date, historical contact person, response outcome, required notes and optional next action, follow-up date and explicitly selected stage. Each interaction and its optional relationship updates are saved atomically.
- **Activity History** presents one chronological view of interactions, recorded sent outreach, stage changes and physical handovers; public discovery evidence stays on the partner profile. It derives handovers from the canonical handover records to avoid displaying duplicated entries and retains their actual date without inventing an interaction time. Handovers remain explicitly logged through the separate Record Handover workflow.
- Editing the current contact creates an automatic history record naming the previous contact; historical interactions retain the contact person entered at the time. The form remains deliberately lightweight rather than a multi-contact CRM.
- Existing legacy activity and demo timelines remain readable. Data already saved was not reset.

## Dedicated partner workspace — October 2026

- **Manage Partners:** Stage badges remain upper-right and whole cards open a dedicated /partner?partner=ID page, rather than a modal. Relationship and Edit Partner tabs remain.
- **Log Activity / Record Handover:** Both open compact dialogs from a partner's dedicated page. Log Activity records interactions, participants and explicit relationship changes. Record Handover captures the date, optional time, kg amount and Notes, with no confirmation dropdown. The old Log Handover navigation and standalone page remain retired; old URLs redirect to the partner or management page.
- **Find Partners:** Date Sourced is disclosed under Details, and Last Scanned date, counts and source descriptions use consistent 10px spacing.
- **Activity History:** The redundant Most Recent First label is removed. Connectors link only adjacent event dots, without extending past either end.

## Navigation and type scale — October 2026

The contextual Draft Outreach workflow and selected-partner page have headings aligned to their centred content. Relationship and Edit Partner follow a consistent hierarchy: 16px section headings, 14px body and values, 13px labels, and 12px metadata.

## Partner history and lightweight logging — October 2026

- Discover Partners Details now has a single divider between Date Sourced and the Fit Score breakdown.
- Manage Partners keeps the two-column cards and top-right stage badges; next actions get an icon and concise, balanced visual treatment without increasing the intended card height. The Stage picker on a selected partner is narrower.
- Activity History starts collapsed, with individually expandable entries. Recorded sent outreach displays the exact stored subject and reviewed email body; canonical sent-outreach records prevent duplicate activity entries. Legacy activity remains readable. No AI regeneration is used.
- Log Activity defaults to Email and to the current Stage. Redundant heading and stage note are gone. Message / Notes accepts up to 10,000 characters for pasted partner replies or short summaries; unchanged Stage does not trigger an update.
- AI-based interpretation of partner replies is a future optional review workflow, not an automatic save or stage update.


## Optional AI-assisted activity review — October 2026

Only **Email** and **Text / WhatsApp** activity types offer **Analyse with AI** in Manage Partners. Staff can paste the original message, explicitly request an analysis, inspect suggested response, stage, next action, contact and follow-up, then choose **Apply Suggestions** before manually saving the activity. Calls, meetings and site visits remain manual. Original pasted content is preserved in Activity History on save; analysis itself never changes a relationship stage or saves an activity. Stage changes require staff choosing and confirming them.

- Provider: existing repo-side AI_PROVIDER=codex or AI_PROVIDER=claude setting. Template mode returns a clear manual-logging fallback rather than presenting rules as AI.
- Privacy: only clicking Analyse sends the pasted content to the configured provider. The source message is not written to AI audit logs; only provider, time, status and token usage are logged. Staff should consider whether partner emails contain confidential or personal information before using this action.
- Suggested dates, names, approvals, reuse or capacity must not be invented. Uncertain values remain blank and every suggestion is editable. Editing the message or changing type invalidates old suggestions; only Email and Text / WhatsApp can invoke the analysis route.


## Interaction outcomes versus relationship stage — October 2026

- Relationship Overview intentionally shows only durable status and tasks (current contact, next action, follow-up and separately editable Stage). It no longer duplicates the interaction's latest response.
- Individual email/text/call/meeting activities can record concrete optional **Outcomes**: Requested Information, Agreed to Meeting, Discussed Trial, Follow-Up Needed, Declined, No Reply or Other. Uncertain cases remain Not Recorded.
- AI-assisted Email and Text logging uses the same outcome categories and suggests Stage changes independently for explicit staff review. Recording an Outcome never advances Stage and never overwrites the older partner-level responseStatus field.
- Legacy response values and historical activity outcomes remain readable for compatibility; no existing records are migrated or reset.


## Activity AI suggestion refinements — October 2026

- The **Suggested Updates** area uses a muted powder-blue background to distinguish AI proposals from ordinary partnership management.
- Only interaction outcomes actually available in the Log Activity dropdown can be applied; **Requested Information** is a valid option. Staff must still explicitly apply suggestions and save.
- The free-text **Next Action** contains the task, without an ISO deadline when a separate **Follow-Up Date** is provided. The AI prompt also requires separating tasks and dates.
- Suggested Updates no longer displays an AI explanation/rationale paragraph.
- While Email/Text AI analysis runs, **Analyse with AI** becomes **Cancel Analysis**. Cancelling sends a stop command to the backend and aborts the AI provider process using the existing runner's abort signal; stopped results are discarded without creating partner activities or new AI audit entries. Changing or closing the dialog also cancels in-progress analysis. Calls, meetings and visits remain manual.


## Individual activity disclosure and typography refinement — October 2026

- Activity History is displayed directly in the partner workspace; the whole history is not collapsed. The event timeline and connecting dots remain visible.
- Only entries containing useful extra material default to individual collapsible details: sent outreach with the actual email body, or sufficiently long/multiline email/text messages. Short calls, stage changes, brief notes, handovers and source discovery display immediately without a redundant View Details control.
- The Suggested Updates panel now uses a near-white neutral background with a subtle border instead of a stronger blue fill; its indigo action accent remains.
- Relationship and Edit Partner typography and the Log Activity / Record Handover pop-ups use a restrained hierarchy: section headings about 15px, body and inputs 13px, labels 12px and metadata 11–12px. The partner's page title is scaled down separately to avoid competing with the content.


## Lightweight handover logging — October 2026

Staff enter the transfer date, kilograms transferred and any Time or Notes. An optional **Time** field is for the
actual handover time, when known; it is never fabricated for older entries.
The Record Handover dialog no longer includes receipt/reuse confirmation
levels, an evidence field, or a warning demanding supporting documents.

Recording a handover counts **transferred kilograms**, not kilograms
definitively reused. The backend defaults the legacy confirmation status to
`unverified` for newly created records so existing dashboard reuse metrics
do not falsely treat all collections as reuse. Historical explicitly
confirmed handovers remain valid and are not altered. Existing API clients
that provide a legacy confirmation value remain compatible.

A regular partner's general statement that grounds are routinely reused,
or a partner's occasional report such as "8 kg used so far", can be
recorded in **Log Activity** or partner **Notes** without implying that
every handover was verified separately. No quantity reported in free text
is silently counted as verified reuse; a later reporting approach would
need an explicit, defensible rule against double-counting.

The Manage Partners sidebar now includes a Category filter after Sort, used
alongside Search and partner stages. Both activity and handover dialogs have
white form surfaces. The handover date does not receive initial focus, and
unstarred fields do not repeat the word Optional.


## Staff lifecycle improvements — October 2026

- **Record Sent** now opens the exact partner's Relationship page, rather
  than returning to the general Manage Partners list. Staff can immediately
  record the next action, follow-up date or a subsequent conversation.
- The existing Relationship Overview gently emphasises a genuinely overdue
  or due-today follow-up date. No separate Needs Attention dashboard or
  automated workflow has been introduced.
- **Edit Partner → Grounds Reuse** includes optional **Transport Arrangement**
  (Not Discussed, Partner Collects, CoffeeBot Delivers, Flexible / Either)
  and **Grounds Accepted** (Not Discussed, Dried Grounds, Wet Grounds, Either).
  These describe the partner's requirements and agreements, not a universal
  CoffeeBot guarantee. They do not alter the ranking while sponsor criteria
  are still being gathered.
- The timeline three-dot menu offers **Edit** and **Delete** for
  communications, historical stage entries, recorded sent emails and
  handovers. Corrections never silently change the current relationship
  stage or what was sent externally. Handovers update transferred kilograms.
  Deleted records are retained internally rather than irreversibly erased.
- **Draft Follow-Up** opens the existing outreach editor for contacted,
  interested, trial and regular partners. It uses recorded recent partner
  communications and the current partner profile as context. A configured
  AI provider can suggest a grounded, editable message. In template mode
  the app provides a transparently labelled generic draft. The app never
  sends email on its own; staff must send externally, then **Record Sent**.
  A sent follow-up is distinguished in Activity History. It never implies
  a partner agreed to collection or reuse without evidence.

Contactability scoring and a cross-partner "what is due today?" view remain
deferred pending sponsor feedback and the separate Dashboard discussion.

### Activity controls and partner notes

Edit/Delete are available in a contextual menu on concise and expandable
entries. Sent emails, handovers and stage history use type-specific correction
forms, with provenance retained.
Legacy canned demo partner Notes have been cleared only when they
exactly matched known seeded text. Staff-authored notes are preserved;
profile Notes now default to blank rather than duplicating stage,
next action, and reuse fields.
## Visual review through Gateway (local Windows)

Run `npm run visual:review` from the repository root. This uses the
installed Edge browser via `playwright-core`, starts the local Node server
temporarily if needed, and captures the Manage Partners list, a managed
partner's Relationship view, its three-dot activity menu, Log Activity,
Record Handover and Draft Follow-Up.

Screenshots stay in ignored `data/visual-review/`; this needs no public
localhost tunnel. The script checks that the follow-up page keeps
**Manage Partners** selected. Set `AI_PROVIDER=template` if you want to
keep visual testing free of model calls. Do not treat screenshot checks as
a substitute for automated functional tests.

Demo/source-generated Notes are not staff Notes. The one-time
`node scripts/clean-seeded-notes.mjs` migration backed up the original
local state under `data/source-notes-cleanup-backup.json`, removed 266
exact boilerplate Notes and preserved original AI input-hash provenance.
Only staff-supplied context belongs in the Notes field.
