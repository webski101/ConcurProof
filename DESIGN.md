---
name: ConcurProof
description: A technical incident signal board for proving live multi-agent interaction.
colors:
  signal: "#b9ed74"
  signal-strong: "#d1ff96"
  signal-ink: "#17200e"
  background: "#090c0b"
  panel: "#0e1311"
  panel-strong: "#141b17"
  line: "#263029"
  line-soft: "#1a221d"
  line-hover: "#536057"
  text: "#eef5ef"
  muted: "#8c9b91"
  faint: "#7d8a81"
  error: "#ff8d7d"
  warning: "#e8c46b"
typography:
  display:
    fontFamily: "Geist Sans, Segoe UI, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist Sans, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist Sans, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Mono, Cascadia Code, monospace"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.1em"
  control:
    fontFamily: "Geist Sans, Segoe UI, sans-serif"
    fontSize: "0.76rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.055em"
  status:
    fontFamily: "Geist Mono, Cascadia Code, monospace"
    fontSize: "0.66rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.05em"
  detail:
    fontFamily: "Geist Sans, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.45
  micro:
    fontFamily: "Geist Mono, Cascadia Code, monospace"
    fontSize: "9px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.09em"
rounded:
  control: "4px"
  panel: "6px"
  status: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.72rem 1rem"
    height: "42px"
  button-secondary:
    backgroundColor: "{colors.panel-strong}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.72rem 1rem"
    height: "42px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "16px"
  status:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.status}"
    padding: "0.28rem 0.52rem"
---

# Design System: ConcurProof

## Overview

**Creative North Star: "The Incident Signal Board"**

ConcurProof feels like the shared display in a production incident room: dense, calm, trustworthy, and immediately inspectable. Its drama comes from recorded activity crossing agent lanes, not from ambient effects, terminal cosplay, or decorative AI motifs. Off-black layers, crisp rules, compact typography, and one pale chartreuse signal make the interface feel instrument-like.

The signature is the live reaction trace connecting a public agent output to another agent's response. It reads as evidence, not ornament. Controls remain familiar and compact so a judge can understand the experiment without learning a novel interface.

**Key Characteristics:**

- Dense without feeling cramped
- Flat, ruled, and instrument-like
- One signal color reserved for action and causality
- Monospaced numerals, timestamps, evidence codes, and run IDs
- Motion only for live state and direct feedback

## Colors

The palette uses cool off-black neutral layers with one pale chartreuse primary. Coral error and amber warning are semantic exceptions, never decoration.

### Primary

- **Reaction Signal:** Identifies the primary action, live state, selected reaction edge, verified relationship, and concurrency score.
- **Signal Peak:** Appears only as the primary-button hover state.
- **Signal Ink:** Keeps text on the bright primary action legible.

### Neutral

- **Incident Black:** The single flat page field.
- **Panel Black and Raised Panel:** Separate bounded work areas through tone, not shadow.
- **Structural Rule and Soft Rule:** Divide major and internal regions respectively.
- **Evidence White:** Primary text and high-confidence values.
- **Operational Gray and Faint Gray:** Supporting copy, timestamps, labels, and inactive states.

### Semantic

- **Visible Failure:** Reserved for failed runs and fixture provenance.
- **Measured Warning:** Reserved for actual warning states.

**The Signal Rarity Rule.** Reaction Signal marks the current action, live state, or recorded causal relationship. Inactive structure stays neutral.

## Typography

**Display Font:** Geist Sans with Segoe UI fallback<br>
**Body Font:** Geist Sans with Segoe UI fallback<br>
**Label/Mono Font:** Geist Mono with Cascadia Code fallback

**Character:** Geist keeps the console compact and contemporary without mimicking a terminal. Mono is functional: it carries values that benefit from stable widths and fast comparison.

### Hierarchy

- **Display** (600, responsive 36px to 48px, 1.02): One product thesis per surface.
- **Title** (600, 20px, 1.2): Reports and major bounded sections.
- **Body** (400, 14px, 1.5): Explanations and evidence summaries, normally constrained to 62 to 72 characters.
- **Label** (600, 10px, 0.1em tracking): Uppercase context labels and instrument metadata.
- **Numeric data** (Geist Mono, tabular figures): Latency, scores, timestamps, run IDs, evidence IDs, and counts.

**The Numeric Rail Rule.** Every latency, score, timestamp, run ID, and evidence ID uses tabular monospaced figures.

## Layout

The shell is fluid up to 1540px with 16px to 32px side padding. Desktop uses a wide operational grid: a compact header, a three-mode rail, then a timeline workspace beside a 340px event feed. Reports use ruled metric bands, full-width comparison tables, and a graph with a fixed inspection rail. The base spacing rhythm is 4px, 8px, 16px, 24px, and 32px.

Below 1024px the event feed and graph inspector stack. Below 768px the mode rail becomes vertical. The timeline and comparison table remain horizontally scrollable because compressing their temporal and tabular meaning would be worse than deliberate overflow. The page itself must never overflow horizontally.

## Elevation & Depth

The system has no routine shadows. Depth comes from the background, two panel tones, and one-pixel structural borders. The downloadable certificate uses the same flat material so its exported image matches the application.

**The Flat Evidence Rule.** If regions can be separated by spacing, alignment, tone, or one hairline, do not make either a floating card.

## Shapes

The form language is lightly machined. Controls use a 4px radius, bounded panels use 6px, timeline bars use 2px, and compact status badges alone use a full pill radius. Charts and rules retain square geometry. The interface does not use decorative blobs, floating capsules, or oversized rounding.

## Components

### Buttons

- **Shape:** Compact machined rectangle with a 4px radius and minimum 42px height.
- **Primary:** Reaction Signal fill, Signal Ink text, uppercase mono-like label rhythm.
- **Secondary:** Raised Panel fill with a Structural Rule border.
- **Hover / Focus:** One controlled tone shift; focus receives a 2px Reaction Signal outline offset by 3px.
- **Motion:** Background, border, color, and a 1px active press use the standard 180ms easing. Reduced-motion preference collapses these durations.

### Status badges

- **Style:** Transparent compact pills with a one-pixel border and uppercase mono label.
- **State:** Signal is used for a real Mozaik run or selected status; Visible Failure marks fixture provenance so demo data cannot masquerade as a real model run.

### Panels and metric bands

- **Corner Style:** 6px at the outer boundary; internal cells remain square.
- **Background:** Panel Black with Raised Panel reserved for controls and nodes.
- **Border:** One Structural Rule outside and Soft Rules within.
- **Internal Padding:** Usually 16px to 24px, reduced for dense table rows and the event feed.

### Navigation

- **Style:** A single 64px ruled header. The product mark, lab context, and return links use familiar link behavior with no ornamental navigation shell.

### Live reaction trace

- **Style:** Recorded activity intervals form restrained chartreuse bars. Structured outputs appear as small marks, and explicit source-to-response relationships use thin dashed paths.
- **Behavior:** Only events and reaction IDs stored in the run can create marks or edges. The live cursor and pulse animate only while work is active.

## Do's and Don'ts

### Do:

- **Do** make provenance visible wherever a score or run result appears.
- **Do** preserve familiar button, disclosure, table, and link behavior.
- **Do** let recorded events determine every timeline mark, edge, and number.
- **Do** honor reduced motion and maintain keyboard-visible focus.
- **Do** retain the wide instrument view through deliberate internal scrolling on small screens.

### Don't:

- **Don't** use purple-blue AI gradients, glowing borders, fake terminal chrome, or decorative grid noise.
- **Don't** invent decorative metrics, status lights, or activity outside recorded data.
- **Don't** hide failures or let fixture output resemble a real model run.
- **Don't** use display type in controls or dense data labels.
- **Don't** replace structural rules with routine shadows or floating cards.
