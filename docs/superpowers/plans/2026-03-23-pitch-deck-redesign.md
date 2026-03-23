# Pitch Deck Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Ironheart pitch deck to be audience-agnostic (not SME-specific), add an Expansion slide showing future opportunity areas, add a Team slide with overlapping avatar gallery, and update the CTA.

**Architecture:** Single-file HTML slide deck (`docs/pitch-deck.html`) with inline CSS and JS. All changes are to this one file. No build step, no dependencies.

**Tech Stack:** HTML, CSS, vanilla JS

**Spec:** `docs/superpowers/specs/2026-03-23-pitch-deck-redesign.md`

---

### Task 1: Update Slide 1 and Slide 2 text content

**Files:**
- Modify: `docs/pitch-deck.html:419` (slide 1 headline)
- Modify: `docs/pitch-deck.html:427` (slide 2 headline)
- Modify: `docs/pitch-deck.html:435-437` (slide 2 card 2 desc)
- Modify: `docs/pitch-deck.html:440-442` (slide 2 card 3 desc)

- [ ] **Step 1: Update slide 1 headline**

Change line 419 from:
```html
<h1>Custom AI systems for industries that still run on <em>paper</em></h1>
```
to:
```html
<h1>Custom AI systems for organisations that still run on <em>paper</em></h1>
```

- [ ] **Step 2: Update slide 2 headline**

Change line 427 from:
```html
<h2>Entire industries running on <em>spreadsheets, phone calls, and workarounds</em></h2>
```
to:
```html
<h2>Entire organisations running on <em>spreadsheets, phone calls, and workarounds</em></h2>
```

- [ ] **Step 3: Rewrite card 2 (Wasted spend) description**

Change the `.desc` inside the second card from:
```html
<div class="desc">Paying for enterprise software that does 5% of what you bought it for. Or worse, paying three people to do what one system could.</div>
```
to:
```html
<div class="desc">Three people doing what one system could. Solutions that are &lsquo;good enough&rsquo; &mdash; meaning slow, manual, and the first thing to break when someone&rsquo;s off sick.</div>
```

- [ ] **Step 4: Rewrite card 3 (Stalled projects) description**

Change the `.desc` inside the third card from:
```html
<div class="desc">"Digital transformation" that takes 18 months, costs six figures, and changes nothing. The IT backlog never shrinks.</div>
```
to:
```html
<div class="desc">&ldquo;Digital transformation&rdquo; that takes 18 months, costs six figures, and changes nothing. Good intentions that never make it past the proposal stage.</div>
```

- [ ] **Step 5: Open in browser and verify slides 1 and 2**

Run: `open docs/pitch-deck.html`

Verify:
- Slide 1 says "organisations" not "industries"
- Slide 2 headline says "organisations"
- Card 2 shows new "good enough" copy
- Card 3 shows new "proposal stage" copy

- [ ] **Step 6: Commit**

```bash
git add docs/pitch-deck.html
git commit -m "content: update pitch deck copy for audience-agnostic framing"
```

---

### Task 2: Add CSS for Expansion slide (`.s-expansion`)

**Files:**
- Modify: `docs/pitch-deck.html` — CSS section, before the `SLIDE 10 — CLOSE` comment block (around line 349)

- [ ] **Step 1: Add CSS comment block and styles for `.s-expansion`**

Insert the following CSS before the `/* SLIDE 10 — CLOSE */` comment block (line 351):

```css
  /* ══════════════════════════════════════
     SLIDE 10 — EXPANSION
  ══════════════════════════════════════ */
  .s-expansion { justify-content: flex-start; padding-top: 8vh; }
  .s-expansion .ambient { background: var(--amber); opacity: 0.03; }
  .s-expansion h2 { font-size: clamp(24px, 3vw, 42px); margin-bottom: 8px; }
  .s-expansion .sub {
    font-size: clamp(13px, 1.4vw, 16px); color: var(--text-2); margin-bottom: 5vh;
  }
  .s-expansion .grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 16px; max-width: 900px; width: 100%;
  }
  .s-expansion .card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 10px; padding: 32px 24px 28px;
    display: flex; flex-direction: column; gap: 12px;
    transition: border-color 0.3s ease, background 0.3s ease;
  }
  .s-expansion .card:hover { border-color: var(--border-light); background: var(--bg-elevated); }
  .s-expansion .card .title {
    font-family: 'Fraunces', serif; font-size: clamp(16px, 1.6vw, 20px);
    color: var(--text-1); line-height: 1.3;
  }
  .s-expansion .card .desc { font-size: 13px; color: var(--text-2); line-height: 1.5; }
```

- [ ] **Step 2: Commit**

```bash
git add docs/pitch-deck.html
git commit -m "style: add CSS for expansion slide"
```

---

### Task 3: Add CSS for Team slide (`.s-team`)

**Files:**
- Modify: `docs/pitch-deck.html` — CSS section, after the expansion CSS added in Task 2

- [ ] **Step 1: Add CSS comment block and styles for `.s-team`**

Insert the following CSS after the `.s-expansion` block:

```css
  /* ══════════════════════════════════════
     SLIDE 11 — TEAM
  ══════════════════════════════════════ */
  .s-team { }
  .s-team .ambient { background: var(--amber); opacity: 0.03; }
  .s-team .avatars {
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 32px;
  }
  .s-team .avatar {
    width: 120px; height: 120px; border-radius: 50%;
    border: 2px solid var(--amber); background: var(--bg-elevated);
    overflow: hidden; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .s-team .avatar + .avatar { margin-left: -24px; }
  .s-team .avatar img {
    width: 100%; height: 100%; object-fit: cover;
  }
  .s-team .avatar .placeholder-silhouette {
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--text-3); opacity: 0.3;
  }
  .s-team .member-name {
    font-family: 'Fraunces', serif; font-size: clamp(20px, 2.4vw, 28px);
    color: var(--text-1); margin-bottom: 4px;
  }
  .s-team .member-title {
    font-size: 14px; color: var(--amber); font-weight: 500;
    letter-spacing: 0.05em; margin-bottom: 4px;
  }
  .s-team .member-uni {
    font-size: 13px; color: var(--text-2); margin-bottom: 20px;
  }
  .s-team .member-bio {
    font-size: 14px; color: var(--text-2); text-align: center;
    max-width: 480px; line-height: 1.6;
  }
```

- [ ] **Step 2: Update the CLOSE CSS comment block number**

Change the comment from:
```css
  /* ══════════════════════════════════════
     SLIDE 10 — CLOSE
  ══════════════════════════════════════ */
```
to:
```css
  /* ══════════════════════════════════════
     SLIDE 12 — CLOSE
  ══════════════════════════════════════ */
```

- [ ] **Step 3: Add responsive rules for new slides**

Inside the `@media (max-width: 860px)` block, add:

```css
    .s-expansion .grid { grid-template-columns: 1fr; max-width: 400px; }
    .s-team .avatar { width: 90px; height: 90px; }
    .s-team .avatar + .avatar { margin-left: -16px; }
```

- [ ] **Step 4: Commit**

```bash
git add docs/pitch-deck.html
git commit -m "style: add CSS for team slide and responsive rules"
```

---

### Task 4: Add Expansion slide HTML

**Files:**
- Modify: `docs/pitch-deck.html` — HTML section, insert new slide between the Compounding slide (slide 9, ends ~line 607) and the Close slide (starts ~line 609)

- [ ] **Step 1: Insert expansion slide HTML**

Insert the following HTML after the closing `</div>` of the compounding slide (after `<!-- SLIDE 9 — COMPOUNDING -->` block) and before `<!-- SLIDE 10 — CLOSE -->`:

```html
  <!-- SLIDE 10 — EXPANSION -->
  <div class="slide s-expansion">
    <div class="ambient"></div>
    <div class="section-tag amber">What's Next</div>
    <h2>Where We See the Biggest Opportunity</h2>
    <div class="sub">Problems we're actively exploring across every sector we work with.</div>
    <div class="grid">
      <div class="card">
        <div class="title">Approval Workflows</div>
        <div class="desc">Funding requests, sign-offs, and multi-step processes that take weeks when they should take minutes.</div>
      </div>
      <div class="card">
        <div class="title">Internal Support</div>
        <div class="desc">Staff and stakeholder queries handled through inboxes and spreadsheets instead of a proper system.</div>
      </div>
      <div class="card">
        <div class="title">Operational Tooling</div>
        <div class="desc">Custom internal tools replacing the spreadsheets, shared drives, and manual trackers that every organisation quietly depends on.</div>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Commit**

```bash
git add docs/pitch-deck.html
git commit -m "content: add expansion slide with future opportunity areas"
```

---

### Task 5: Add Team slide HTML

**Files:**
- Modify: `docs/pitch-deck.html` — HTML section, insert new slide after the Expansion slide and before the Close slide

- [ ] **Step 1: Insert team slide HTML**

Insert the following HTML after the Expansion slide and before the Close slide:

```html
  <!-- SLIDE 11 — TEAM -->
  <div class="slide s-team">
    <div class="ambient"></div>
    <div class="section-tag muted">The Team</div>
    <div class="avatars">
      <div class="avatar"><img src="" alt="Luke Hodges"></div>
      <div class="avatar"><div class="placeholder-silhouette"></div></div>
      <div class="avatar"><div class="placeholder-silhouette"></div></div>
    </div>
    <div class="member-name">Luke Hodges</div>
    <div class="member-title">Founder</div>
    <div class="member-uni">University of Bath &middot; Course Name</div>
    <div class="member-bio">Bio placeholder &mdash; 2-3 sentences about your background, what drives you, and why you started Ironheart.</div>
  </div>
```

- [ ] **Step 2: Update the Close slide HTML comment**

Change:
```html
  <!-- SLIDE 10 — CLOSE -->
```
to:
```html
  <!-- SLIDE 12 — CLOSE -->
```

- [ ] **Step 3: Commit**

```bash
git add docs/pitch-deck.html
git commit -m "content: add team slide with avatar gallery and bio placeholder"
```

---

### Task 6: Update Close slide CTA

**Files:**
- Modify: `docs/pitch-deck.html` — Close slide headline (line 612)

- [ ] **Step 1: Update CTA headline**

Change:
```html
<div class="headline">We're looking for our next <em>industry partner</em></div>
```
to:
```html
<div class="headline">We're looking for our next <em>partner</em></div>
```

- [ ] **Step 2: Commit**

```bash
git add docs/pitch-deck.html
git commit -m "content: update close slide CTA to audience-agnostic wording"
```

---

### Task 7: Final verification

**Files:**
- Verify: `docs/pitch-deck.html`

- [ ] **Step 1: Open in browser and walk through all 12 slides**

Run: `open docs/pitch-deck.html`

Verify each slide:
1. Title — says "organisations" and "paper"
2. Problem — "organisations" headline, new card 2 and 3 copy
3. Approach — unchanged
4. Demo Overview — unchanged
5. Demo 1 — unchanged
6. Demo 2 — unchanged
7. Demo 3 — unchanged
8. Traction — unchanged
9. Compounding — unchanged
10. **Expansion** — "What's Next" tag, 3 cards (Approval Workflows, Internal Support, Operational Tooling)
11. **Team** — 3 overlapping circular avatars, name/title/uni/bio below
12. Close — "partner" not "industry partner"

Verify:
- Progress bar reaches 100% on slide 12
- Counter shows "X / 12"
- Arrow key navigation works through all 12 slides
- Responsive: resize browser narrow — expansion grid collapses, team avatars shrink

- [ ] **Step 2: Final commit if any fixes needed**

```bash
git add docs/pitch-deck.html
git commit -m "fix: pitch deck verification fixes"
```
