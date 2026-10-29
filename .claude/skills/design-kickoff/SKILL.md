---
name: design-kickoff
description: MANDATORY first step for any new project, app, website, landing page, dashboard, UI feature, redesign or branding task. Before writing UI code, run the design catalog, show the user example design styles with real reference links, recommend one, and record the chosen direction. Use whenever work involves visual design, frontend, UI/UX, or "make it look good".
---

# Design Kickoff

Never start UI work on taste alone. At the start of every project or visual task, run this before any design or frontend code.

## When to skip
- `docs/design/DESIGN_DIRECTION.md` already exists in the project and the user has not asked to revisit the look. Read it and follow it instead.
- The task has no visual output (backend, scripts, data).

## Steps

1. **Write a one-line brief** from what the user said: product, audience, platform, mood. Example: "international dating app, mobile-first, warm and friendly".

2. **Run the catalog** (path is relative to this skill folder; use `~/.claude/skills/design-kickoff` for the global install):
   ```
   node .claude/skills/design-kickoff/suggest.mjs --brief "<brief>" --platform app|web|landing|dashboard
   ```
   Korean briefs work (e.g. 소개팅, 따뜻한, 다크). Add `--json` for structured output, `--list` to see all styles, `--stats` to see coverage.

3. **Show the user the result** in the chat language. Present Option A/B/C plus the Wildcard, each with: one-line summary, palette/type/shape/motion tokens, 3-4 example sites with links, and the live collection links. Then give your own recommendation and one sentence why it fits the audience.
   - Styles with few catalogued sites (claymorphism, organic-warm, retro, etc.) rely on the live collection links: open 1-2 of them with the available scrape/browser tools and describe what you actually see before recommending.
   - Always repeat the caveat: examples are matched by gallery category, not by visual analysis.

4. **Ask the user to choose** (AskUserQuestion with the 3 options + wildcard; "Other" lets them mix styles). Do not proceed on assumption. If the user is unreachable and the task is long-running, pick your recommendation, say so explicitly, and continue.

5. **Record the decision** in `docs/design/DESIGN_DIRECTION.md`: chosen style id and name, tokens, 3 reference links, date, and anything the user said ("less playful", "no gradients"). Turn the tokens into real design tokens (CSS variables / Tailwind theme) first, then build components from them.

6. **Check accessibility and international fit** before finishing: AA contrast, 44px touch targets, `prefers-reduced-motion`, text expansion for long translations, and fonts that cover the languages the product supports.

## Refreshing the catalog
Data lives in `data/` (styles, sources, references, collections). To re-ingest galleries, update `sources.mjs` / `raw-other.mjs` with fresh scrapes and run `node build-catalog.mjs`. Source status (ingested vs registered, paywalls, blocks) is in `data/sources.json`.
