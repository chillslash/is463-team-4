# CoffeeBot UI consistency guide

These are practical defaults for **Discover Partners**, **Draft Outreach** and
**Manage Partners**. They document patterns useful in the current prototype,
not a requirement to make every screen or button identical. Dashboard is outside
the October 2026 polish pass.

## Principles

1. **Shared meaning, shared treatment.** Buttons with the same role use common
   font sizes, heights and spacing. A back button may be smaller than a primary
   action. Do not force equal widths on labels of unequal length.
2. **Clarity before decoration.** Prefer Inter, forest-green accents, white
   cards, soft borders and muted metadata. Avoid brightly coloured AI panels.
3. **Do not imply certainty.** AI recommendations are proposals, not verified
   reuse, acceptance, capacity or relationship stages.
4. **Dense where useful.** Show related numeric settings in aligned rows;
   expand content-heavy activities and emails only when requested.
5. **Exceptions need a purpose.** Stop actions, copy icons, stage chips and
   data inputs intentionally differ from ordinary action buttons.

## Common visual patterns

| Component | Default | Examples |
| --- | --- | --- |
| Primary action | 40px minimum height, 14px semi-bold | Discover Partners, Add Partner, Record Sent |
| Compact secondary action | ~36px minimum height, 13px semi-bold | Draft Outreach, Edit Partner, AI Review, Manage, back links |
| Input / select | ~40px height | Form fields, stage selection |
| Icon | ~17-18px | Align with label |
| Control border / radius | 1px muted border, ~6px radius | Quiet, consistent interface |
| Primary action | Forest green (`#013625`) | Confirmed deliberate actions |
| Secondary action | White, outlined forest tint | Non-primary actions |
| Stopping | Muted warm red | Stop Discovery, Stop Analysis |
| AI review result | White/near-white, soft sage border | Unconfirmed suggestions |
| Metadata | Muted grey (`--sub`) | Dates, source text, units |

Prefer adjusting shared styles instead of appending one-off overrides. Main
actions and compact controls are deliberately different. Scope design changes
to the relevant pages instead of accidentally changing Dashboard.

## Text and dates

- Capitalise human-readable values: `Unknown`, `Weekly (Demo)`,
  `Organic Waste Recycler`, `Partner Discovered`.
- Keep machine-oriented values such as `status: "contacted"` stable.
  Format them for display without rewriting historical records.
- Interpret timestamps in Singapore time but **never append SGT**.
- Use `19 October 2026, 5:13 p.m.` for timestamps and
  `19 October 2026` for date-only fields. Never invent a time for
  a follow-up date or staff-entered activity date.
  For manually dated activities, show only the precise **Logged**
  timestamp in Activity History rather than stacking a date and timestamp.
  It marks when staff logged the entry, not necessarily when the email
  arrived or the event occurred; the original activity date remains stored.\n- Reuse `dateLabel()` and `timeLabel()` from `public/app.js`.
  Supporting date labels and their values should use muted grey.
- Use one Inter typography scale for Activity History, including
  Partner Discovered source descriptions.

## Form and activity behaviour

- Assessment weights appear on four horizontal rows. Show the live
  **Total / 100%**, and reject totals that are not exactly 100.
- Newly logged received/sent emails record direction explicitly. Keep the
  neutral `Email` label for legacy records without direction; do not guess.
- Collapsed long messages show event, date and optionally sender or subject,
  **not a duplicate excerpt** of the expanded email. Show the full message
  only when expanded. Provide Show Older Activity after the latest 24.
- Record Sent identifies the partner and explains the app **does not send**
  emails. Staff copy the outreach into their email client, where they may
  edit and add attachments. Do **not** add unsaved-draft warnings.
- AI activity analysis is explicitly requested and never autosaves.
  While running, show an indeterminate spinner rather than a fabricated
  percentage. Use the same stop-circle icon as Discover Partners.
  A stopping state remains visible until cancellation resolves.
- Stage changes are deliberate; a response outcome does not automatically
  advance a relationship.

## Change checklist

1. Inspect the shared CSS component first, before adding a new override.
2. Check Discover, Draft Outreach, Manage list, partner profile, Activity
   History, Assessment Settings and Log Activity after UI changes.
3. Verify keyboard usage, readable labels, responsive layouts and reduced
   motion support.
4. Update the expected UI/API tests when changing copy or behaviour.
   Run `npm test` and inspect the diff.
5. Use this document as a **guide**, not a rigid template. Preserve
   useful differences between statuses, navigation and main actions.

`design/DESIGN.md` is an earlier Stitch design reference containing older
bean-to-cup machine terminology. This document reflects the current partner
discovery and lightweight relationship-management prototype, and takes
precedence for its current UI patterns. The tested CSS and JavaScript remain
the implementation source of truth.


## Trial: hover-highlighted, full-surface cards (October 2026)

This is a **visual experiment**, not a rigid default for all screens:

- On Discover Partners and Manage Partners, hovering a card reveals the
  same soft green left-edge cue; keyboard focus has a matching indicator.
  The cue is **not** a persistent selected state.
- Clicking a Discover Partners card toggles its Details panel. The native
  Details summary works independently; outreach, edit, AI review and source
  links retain their own actions.
- Manage Partners cards are native links to each partner workspace with no
  redundant Manage button. The freed-up space belongs to the content.
- Draft Outreach's back button retains its size and moves **down 4px**
  visually, rather than reducing its height.

For a possible rollback, pre-experiment copies of the four touched files
are stored in the Git-ignored `data/ui-hover-experiment-backup/` folder,
with their relative paths (the test backup has a `.bak` suffix to avoid accidental execution). If additional edits are made after this trial,
revert the individual trial changes rather than overwriting newer work.



## Handover form and reuse claims (October 2026)

Keep the handover dialog short: **Date**, **Time**, **Amount (kg)** and
**Notes**. Only Date and Amount are required; do not add an "Optional"
label to unstarred fields. Partner-level reuse purposes stay under
**Potential Use / Agreed Use** in the partner profile. Do not reinstate
per-handover confirmation levels or demanding "Evidence" labels.
Receipt of grounds is separate from confirmed beneficial reuse, but that
distinction belongs in careful reporting logic, not extra questions to
staff who are simply recording a collection. Actual handover times
are entered by staff; a blank time displays as date-only.

Partners may report consistent reuse or cumulative reused kilograms on a
different cadence from individual collections. Record these statements
as ordinary activities or notes, not guessed batch-level confirmations.

Use the same white, uncluttered form background for Log Activity and
Record Handover (no inner green card). Focus the Close button when the
handover dialog opens so the date's day segment is not selected.
Manage Partners shows a Category filter after Sort; combine it with Search
and Stage, resetting pagination on category changes.


## Staff follow-ups and historical corrections

Use a modest amber treatment only for **actual overdue or due-today**
follow-up dates on the partner Relationship page. Keep normal tasks and
unscheduled relationships subdued. Cross-partner prioritisation belongs
in the future Dashboard, not a duplicate Manage Partners filter.

After Confirm Record Sent, return to that partner's page. Provide
**Draft Follow-Up** from managed partner pages using the existing outreach
form (same editable body, copy controls and staff-confirmed Record Sent),
with an explicit subject identifying it as a follow-up. Do not offer it
before initial contact, and do not claim an email was sent automatically.

Use a compact three-dot **Edit / Delete** menu for recorded Activity History
entries, with dedicated correction forms for sent outreach and handovers. Deletions preserve a soft-deleted record internally;
editing old activity details does not implicitly overwrite the current
stage or follow-up task. Historic emails of unspecified direction must
remain unspecified rather than becoming "received" after editing.

## Activity actions and non-duplicative partner notes

On every recorded Activity History entry, keep Edit and Delete
accessible even when a message's Details are collapsed. Place controls
outside the expandable content, with the same subdued treatment for short
notes, calls, emails, and long messages. Historical stage changes, recorded sent emails and handovers use their own
correction forms. Handover edits recalculate kilograms; deletion archives
the original record without silently altering live relationship stages.

Partner **Notes** should store additional operational information not
captured by Stage, Next Action, Potential Use / Agreed Use, Transport
Arrangement, Grounds Accepted, or other profile fields. Leave the field
blank when there is nothing extra to record. Demo records must not inject
boilerplate summaries of the very fields already visible elsewhere.
