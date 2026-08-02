# Ironheart Platform

The management-platform codebase for The Ironheart Ltd (GitHub: `lukehodges/ironheart-platform`). Business-ops docs live in the sibling `../the-ironheart-ltd/` repo; the live booking software is `../booking-software/`.

## Agent skills

### Issue tracker

Issues, PRDs, and triage live as **GitHub issues** in `lukehodges/ironheart-platform`, driven by the `gh` CLI. External PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles map to default label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

**Single-context** layout: one `CONTEXT.md` + `docs/adr/` at the repo root (created lazily by `/domain-modeling`). See `docs/agents/domain.md`.
