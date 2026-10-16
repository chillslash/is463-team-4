---
name: Circularity Copilot
colors:
  surface: '#f1fcf3'
  surface-dim: '#d1ddd4'
  surface-bright: '#f1fcf3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ebf7ed'
  surface-container: '#e5f1e7'
  surface-container-high: '#e0ebe2'
  surface-container-highest: '#dae5dc'
  on-surface: '#141e18'
  on-surface-variant: '#414944'
  inverse-surface: '#29332c'
  inverse-on-surface: '#e8f4ea'
  outline: '#717973'
  outline-variant: '#c0c9c2'
  surface-tint: '#396753'
  primary: '#013625'
  on-primary: '#ffffff'
  primary-container: '#1e4d3a'
  on-primary-container: '#8cbda4'
  inverse-primary: '#a0d1b8'
  secondary: '#954915'
  on-secondary: '#ffffff'
  secondary-container: '#fd9b61'
  on-secondary-container: '#743200'
  tertiary: '#4c2120'
  on-tertiary: '#ffffff'
  tertiary-container: '#673735'
  on-tertiary-container: '#e3a29e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bbeed3'
  primary-fixed-dim: '#a0d1b8'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#204f3c'
  secondary-fixed: '#ffdbc9'
  secondary-fixed-dim: '#ffb68d'
  on-secondary-fixed: '#331200'
  on-secondary-fixed-variant: '#763300'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#fab5b1'
  on-tertiary-fixed: '#350f0f'
  on-tertiary-fixed-variant: '#693937'
  background: '#f1fcf3'
  on-background: '#141e18'
  surface-variant: '#dae5dc'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  metric-lg:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  metric-md:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.03em
  caption:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system serves field engineers, route dispatchers, and inventory controllers managing automated bean-to-cup vending units across Singapore. The operational reality demands quiet clarity, instant scannability during fast-paced shifts, and dependable precision under cognitive fatigue.

The aesthetic is functional, understated utilitarianism:
- **Calm, Analog Trust:** Grounded in warmth through cream backdrops and deep botanical greens rather than harsh industrial monitor blacks or sterile SaaS blues.
- **Pure Utility:** Void of decorative abstractions, decorative pill tags, futuristic gradients, or gamified sustainability badges. The software functions like well-maintained physical equipment—reliable, quiet, and direct.
- **High-Density Focus:** Information hierarchy prioritizes telemetry counts, hopper inventory levels, machine status codes, and routing logs. Dense numerical data balances against measured whitespace and clear structural borders.

## Colors

The palette leverages natural, roasted, and botanical pigments engineered for maximum contrast on light, matte surfaces:

- **Primary Canvas & Surfaces:**
  - Canvas Base: `#F6F1E9` (Warm Cream). Replaces harsh blue-white with a non-fatiguing matte foundation.
  - Surface Containers: `#FFFFFF` (Pure White). Reserved for operational cards, data tables, and input panels.
  - Surface Delimiters: `#E6DFD5` (Warm Muted Stone). Used for 1px hairline structural dividers and boundaries.

- **Brand & Action Tones:**
  - Primary / Forest Green: `#1E4D3A`. Used for default interactive states, confirmed actions, high-level navigation, and active filter selections.
  - Primary Hover: `#163B2C`. Darkened green for deliberate tactile cursor response.
  - Primary Soft Tint: `#EEF3F0`. Applied to affirmative row selections, active navigation tags, and operational health badges.

- **Status & Warning Accents:**
  - Caramel Accent: `#B4612C`. Reserved for operational warnings, hopper low-fill alerts, trial configurations, and salvage inventory flows.
  - Caramel Soft Tint: `#FBF3ED`. Used behind secondary notifications, review drawers, and warning states to eliminate jarring signal red.

- **Typography & Structural Contrast:**
  - Primary Text: `#1F2923` (Charcoal Slate). Retains extreme legibility without cold digital black.
  - Muted Text: `#68756B` (Earthy Grey). Used for telemetry units (kg, ml, bar), timestamps, serial identifiers, and metadata labels.

## Typography

The type scale uses `Inter` exclusively across all levels to maintain a cohesive, industrial layout that feels clear on 1080p and 1440p displays.

- **Numerical Hierarchy:** Data metrics (`metric-lg`, `metric-md`) use tabular numbers (`font-variant-numeric: tabular-nums`) to ensure vertical alignment down columns for bin weights, dispense temperatures, cycle times, and water filter capacities.
- **Labels vs. Data:** All data descriptors use `label-md` or `label-sm` with slight positive tracking (`0.02em` - `0.03em`) and uppercase transformation where critical differentiation is needed (e.g., status flags, machine node IDs).
- **Prose Restraint:** Internal documentation, maintenance notes, and route instructions are locked to `body-md` and `body-sm` with tight line heights to maximize visible lines per screen height.

## Layout & Spacing

Designed primarily for standard internal desktop consoles (target resolution: 1440px wide).

- **Grid Architecture:**
  - Standard 12-column grid system with fixed 240px operational left sidebar for station groups, route dispatching, and equipment lists.
  - Main operational area conforms to a fluid 12-column grid with a `margin-desktop` of `2rem` (32px) and a `gutter-desktop` of `1.5rem` (24px).
  - Maximum content constraint on wide displays is fixed to `1440px` centered to avoid distorted tracking spans across wide-format monitors.
- **Vertical Spacing Rhythm:**
  - Micro-spacing (`space-xs`: 4px, `space-sm`: 8px) controls tighter form controls, table cells, and status chip insets.
  - Structural spacing (`space-md`: 12px, `space-lg`: 20px, `space-xl`: 28px) separates panel modules, card groups, and telemetry clusters.
- **Operational Density:**
  - Compact row layouts for data grids: 40px cell height for high density; 48px standard for interactive action tables.
  - Card internal padding is locked to `space-lg` (20px) to balance edge definition against internal content grouping.

## Elevation & Depth

Depth is established strictly through planar layering and crisp 1px borders rather than diffuse drop shadows:

- **Zero Heavy Shadows:** Soft ambient drop shadows are eliminated. Elevation does not simulate light fixtures; it distinguishes surface precedence.
- **Border-First Boundary:** All cards, modules, tables, and popovers maintain an explicit `1px solid #E6DFD5` boundary.
- **Surface Layering:**
  - Base: Matte Canvas (`#F6F1E9`).
  - Layer 1 (Operational Cards & Workspaces): `#FFFFFF` with `1px solid #E6DFD5`.
  - Layer 2 (Modals, Slide-over Drawers, Flyout Menus): `#FFFFFF` with `1px solid #D5CCC0` plus a precise architectural shadow: `0px 4px 16px rgba(31, 41, 35, 0.08)`.
- **Active State Depth:** Interactive components reflect selection by swapping border colors to `#1E4D3A` and adjusting background fills rather than expanding shadows.

## Shapes

The design system maintains disciplined, restrained geometry:

- **Cards & Data Modules:** Radii are locked to `10px` (`rounded-md` to `rounded-lg` range). This ensures the interface feels contemporary without appearing overly bubbly or consumer-facing.
- **Form Controls & Inputs:** Inputs, buttons, and dropdowns sit at `6px` to `8px`, offering a firm, tool-like interaction surface.
- **Status Tags & Badges:** Rounded to `4px` or `6px` rather than circular pill formats. This preserves an engineering-forward, data-dense look.
- **Dividers & Strokes:** Consistent 1px border thickness across all structural elements.

## Components

### Buttons
- **Primary:** Solid `#1E4D3A` fill, `#FFFFFF` text, 8px border radius, no border. Hover state switches to `#163B2C`. Height: 36px (dense) or 40px (default). Internal horizontal padding: 16px.
- **Secondary / Outlined:** `#FFFFFF` fill, 1px border with `#E6DFD5`, `#1F2923` text. Hover changes border to `#1E4D3A` and background to `#EEF3F0`.
- **Caramel / Alert Action:** Solid `#B4612C` fill, `#FFFFFF` text. Used exclusively for operations requiring supervisor confirmation, bean surplus re-allocations, or physical bypass locks.

### Form Inputs & Selectors
- **Input Fields:** White surface (`#FFFFFF`), 1px solid `#E6DFD5` border, 8px corner radius. Text is `#1F2923` with `#68756B` placeholder. Focused state triggers a crisp 1px `#1E4D3A` border and an outline ring of `2px rgba(30, 77, 58, 0.15)`.
- **Labels:** Set in `label-md`, positioned consistently 6px above inputs, rendered in `#1F2923` with optional technical field codes in `#68756B`.

### Telemetry Cards & Metric Panels
- **Structure:** Pure white `#FFFFFF` surface enclosed by a 1px `#E6DFD5` perimeter border. Padding is 20px.
- **Layout:** Top section displays parameter label (`label-md`, muted) and optional machine node badge. Center displays the numeric measurement (`metric-lg`, tabular numerals). Bottom section houses secondary thresholds or delta rates in `caption` font.

### Status Badges & Chips
- **Nominal / Active:** Soft green tint background `#EEF3F0`, text `#1E4D3A`, 1px border `#D4E3DB`.
- **Review / Alert:** Warm caramel tint background `#FBF3ED`, text `#B4612C`, 1px border `#ECD9CB`.
- **Neutral / Idle:** Stone tint background `#F2EDE6`, text `#68756B`, 1px border `#E6DFD5`.
- **Shape:** Non-pill structure with a subtle 4px corner radius and horizontal padding of 8px.

### Data Tables
- **Header:** Sticky table header with background `#F6F1E9` and bottom border of 1px solid `#E6DFD5`. Text in `label-sm`, uppercase, `#68756B`.
- **Rows:** White rows with clean 1px bottom border `#E6DFD5`. Height set to 44px. Hover effect: `#FAF8F5`. Active or selected row: background `#EEF3F0` with a left edge indicator of 3px solid `#1E4D3A`.

### Checkboxes & Radios
- **Checkboxes:** 16px × 16px square with 3px border radius, 1px `#68756B` border on white. Checked state fills with `#1E4D3A` featuring a crisp white tick.