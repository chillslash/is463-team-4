# CoffeeBot Circularity Copilot — Current UI Guide

**Current as of 30 October 2026.** This guide covers the implemented application. If wording conflicts with source code, inspect public/app.js, public/app.css, src/core.js and tests first.

## Navigation and workflow

- Exactly three primary destinations: **Dashboard**, **Discover Partners**, **Manage Partners**. **Draft Outreach** is contextual, and a selected partner has a separate detail page.
- The Dashboard has the cross-partner **Log Handover** action. Manage Partners cards open the partner page; there is no duplicate Log Handover shortcut on the management list.
- Discover results contain sourced **Suggested** leads. Cards expose provenance, category, indicative straight-line distance, Outreach Priority and **Contact Route** (Email Available / Contact Page Available / Not Identified). Details show the link, attribution and **Research Contact**. Contactability is a factual status, not a new stage or acceptance guarantee. **Contactable First** is an independent checkbox that partitions available emails first, then published contact pages, then unidentified contacts, while keeping the selected Outreach Priority/Nearest/Recent order inside each group. AI-Assessed Only stays an independent filter. Never describe an unreachable website as a successful check that found no contact. Keep Outreach Priority and contactability distinct; do not add a second post-contact score.
- Manage Partners is one filterable list with an explicit **Closed** filter and a partner page with **Relationship** and **Edit Partner** tabs.
- Relationship pages expose deliberate stage changes, Log Activity, Record Handover, Draft Follow-Up and a single Activity History. Do not create parallel histories or independent handover views.

## Status labels and scope boundaries

The visible lifecycle is **Suggested → Contacted → Interested → Pilot → Regular**, plus **Closed**. **Pilot** is the public-facing label for the persisted key `trial`; the API and saved historical statuses remain unchanged. The historical interaction outcome key `trial-discussed` is displayed as **Discussed Pilot**. No data migration is needed; render older stage-audit messages with the current label.

Stages change through explicit staff actions. A single interaction outcome does not silently advance a relationship. An AI suggestion always requires the staff member to apply it and save.

**Forecast Demand** is agreed weekly intake for Regular partners; **Handed Over This Week** is recorded physical transfer mass. The prototype does **not** capture confirmed beneficial reuse, calculate reuse rate or claim carbon savings. Do not reintroduce reuse-confirmation inputs into Record Handover. Partner-level **Potential Use** and **Agreed Use** remain relevant.

Use language such as **initial collection**, **pilot arrangement** and **discussing ongoing reuse** in outreach rather than describing the recipient as being tested. No generic 10 kg pilot quantity is assumed.

## Visual rules

- Clean, readable Inter type, green primary actions, restrained secondary outlines, white cards and muted metadata. Apply shared style rules before adding one-off CSS.
- Shared dialog headings use **20px** across Add/Edit, Log Activity, Record Handover and confirmation dialogs. Single-line dialog inputs and selects have a consistent **42px** height; labels and multiline fields retain their own hierarchy. The visual-review script checks these dimensions on desktop and mobile.
- Deliberate differences are okay: page titles, section headings, body text and metadata have distinct hierarchies. Preserve consistent hierarchy within Partner, Log Activity and Record Handover.
- Discover and Manage lists use a soft hover/focus affordance. Discover card surfaces toggle Details, but buttons, links and disclosure summaries retain independent actions. Manage cards are links, not nested Manage buttons.
- Keep descriptions short. Prefer meaningful labels and values over duplicate help text, multiple summaries or decorative boxes.
- Show dates and timestamps in Singapore local time, without appending a timezone suffix. Never fabricate time for date-only events. Existing `dateLabel()` and `timeLabel()` are the shared formatters.
- Controls need visible labels, keyboard access, correct focus and usable narrow-screen layout. Assess at desktop and mobile widths.

## Forms, history and AI behaviour

- **Record Handover:** require Date and Amount (kg); Time and Notes are optional. Existing partner transport/grounds conditions can be shown compactly, with exceptional changes disclosed as needed. No per-batch reuse declaration, verification selector, or fabricated handover time.
- **Add/Edit Partner:** Name and Type are required; Stage is required on Add. Reuse purpose, frequency, weekly intake and other unknowns are editable and may remain blank. Do not invent verified facts.
- **Activity History:** show concrete staff interactions, recorded sent outreach, stage changes and handovers in one chronological view. Long communications may expand; the most recent 24 display initially with an option to show older entries. Correct or archive records through their dedicated controls without silently editing current relationship status.
- **Outreach:** generated or edited messages never send themselves. Staff copy the text to their email client, then deliberately confirm **Record Sent**.
- **AI:** configure Codex/Claude/Qwen/Llama/Template locally in the repository, not a settings page. During discovery, Codex may use web search only in the shared official-site resolution step; returned sites are independently verified and bounded page excerpts are stored before evaluation. The evaluation itself uses the frozen evidence packet and does not browse. AI activity assistance remains opt-in for Email/Text, gives review-only suggestions, and can be cancelled. Do not pass AI-generated acceptance or capacity off as partner-confirmed.
- **Assessment:** display the four pre-contact weights and their total (100%): Reuse Suitability, Organisation-Specific Evidence, Potential Intake Scale and HQ Proximity. Outreach Priority is a Suggested-prospect triage aid, not the probability of agreement. Potential Intake is relative evidence-backed scale only; actual kg/week, frequency, willingness and logistics remain relationship facts after contact.

## Change discipline

1. Before UI changes, inspect the current screen, shared styles, event handlers and relevant tests.
2. Verify the intended function through the API and browser; preserve historical source/handovers.
3. Run `npm test`, and `npm run visual:review` for layout-sensitive edits; check desktop and mobile views.
4. Update **README.md**, **docs/prototype.md**, and this guide only when their current behaviour changes. Do not append a chronological list of each tweak here.
5. Treat older screenshots and presentation materials as historical context, not implementation requirements. Do not reintroduce retired features without a current operational reason.
