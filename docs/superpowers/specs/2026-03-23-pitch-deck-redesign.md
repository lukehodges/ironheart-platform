# Pitch Deck Redesign — Acceler8 Demo Day

## Context

Ironheart is pitching at Acceler8 Demo Day at University of Bath. The audience is university executives (student union heads, school of management, funding departments) plus some external guests. The goal is to land paid contracts — not sponsorship or incubator support. The deck must be audience-agnostic: it should work for anyone in the room, not pander to Bath specifically. University-specific conversations happen after the pitch.

Tone: confident, peer-to-peer. Ironheart is a credible business that happens to be pitching at Bath — not a student asking for help.

## Slide Structure (12 slides)

1. Title
2. Problem
3. Approach
4. Demo Overview
5. Demo 1 — Compliance & Audit Tracker
6. Demo 2 — Customer Support System
7. Demo 3 — Booking & Scheduling Engine
8. Traction
9. Compounding Model
10. **Expansion (NEW)**
11. **Team (NEW)**
12. Close

## Changes From Current Deck

### Slide 1 — Title
- Logo mark: "Ironheart" (unchanged)
- Headline: "Custom AI systems for organisations that still run on *paper*" (changed "industries" → "organisations")
- Subtitle: unchanged ("We audit operations, find the bottlenecks, and build software that removes them permanently.")
- Footer: unchanged (Luke Hodges · Founder)

### Slide 2 — Problem
- Headline: "Entire organisations running on *spreadsheets, phone calls, and workarounds*" (changed "industries" → "organisations")
- Card 1 — Time drain: unchanged
- Card 2 — Wasted spend: **rewritten** → "Three people doing what one system could. Solutions that are 'good enough' — meaning slow, manual, and the first thing to break when someone's off sick."
- Card 3 — Stalled projects: **rewritten** → "'Digital transformation' that takes 18 months, costs six figures, and changes nothing. Good intentions that never make it past the proposal stage."

### Slides 3–7 — Approach + Demos
- No changes. Keep as-is.

### Slide 8 — Traction
- No changes. Keep as-is.

### Slide 9 — Compounding Model
- No changes. Keep as-is.

### Slide 10 — Expansion (NEW)
- Section tag: "What's Next"
- Headline: "Where We See the Biggest Opportunity"
- 3 cards in a grid (same style as demo overview cards):
  - **Approval Workflows** — "Funding requests, sign-offs, and multi-step processes that take weeks when they should take minutes."
  - **Internal Support** — "Staff and stakeholder queries handled through inboxes and spreadsheets instead of a proper system."
  - **Operational Tooling** — "Custom internal tools replacing the spreadsheets, shared drives, and manual trackers that every organisation quietly depends on."

### Slide 11 — Team (NEW)
- Section tag: "The Team"
- CSS class: `.s-team`
- Layout: centered, avatars above text content
- **Avatar gallery:** 3 circular images (120px diameter), overlapping horizontally (~20-30px overlap). First slot is Luke's photo (placeholder image for now), remaining 2 are grey silhouette placeholders. All have 2px amber border.
- Below the gallery:
  - Name: "Luke Hodges"
  - Title: "Founder"
  - Line: "[University of Bath · Course Name]" (placeholder for Luke to fill in)
  - Short bio paragraph: "[Bio placeholder — 2-3 sentences]" (placeholder for Luke to fill in)
- Design: clean, minimal, same dark aesthetic as rest of deck
- **Responsive (≤860px):** Avatar gallery stays horizontal but reduces overlap. Text content remains centered.

### Slide 12 — Close (was slide 10)
- Headline: "We're looking for our next *partner*" (dropped "industry")
- Subtitle: unchanged ("If your organisation runs on manual processes that software should handle — we'd love to talk.")
- Contact, QR, footer: unchanged

## Technical Notes
- **Navigation JS:** No changes needed — slide count and progress bar are driven dynamically by `querySelectorAll('.slide')`, so adding slides is automatic.
- **CSS class names:** Expansion slide uses `.s-expansion`, Team slide uses `.s-team`. Follows existing convention (`.s-title`, `.s-problem`, etc.).
- **CSS comment blocks:** Renumber existing "SLIDE 10 — CLOSE" comment to "SLIDE 12 — CLOSE". Add comment blocks for new slides 10 and 11.

## Design Notes
- Keep existing visual language (dark theme, amber/green accents, Fraunces + Sora fonts, grain overlay)
- Expansion slide reuses the demo overview card grid style (`.s-demos .grid` pattern)
- **Responsive (≤860px):** Expansion grid collapses to single column (same as demo overview). Team avatar gallery stays horizontal with reduced overlap.
- No University of Bath-specific branding or language in any slide content

## Out of Scope
- Actual demo videos (placeholders remain)
- QR code generation
- Bio and avatar image content (Luke to fill in)
