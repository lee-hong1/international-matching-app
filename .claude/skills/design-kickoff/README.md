# design-kickoff

Design reference catalog + style recommender used at the start of every project.

- `suggest.mjs` - CLI: brief -> 3 styles + wildcard with example sites and live collection links
- `data/styles.json` - 23 style families (tokens, best-for/avoid, keywords)
- `data/references.json` - 270 sites from Siteinspire, Awwwards, Lapa Ninja, Httpster, Minimal Gallery + curated dark/neubrutalism sets (snapshot 2026-10-29)
- `data/sources.json` - 16 reference sources and their classification axes, with ingest status
- `data/collections.json` - live entry-point links per style and per domain (dating, mobile-app, landing, web)
- `build-catalog.mjs`, `sources.mjs`, `raw-other.mjs` - rebuild references.json from raw scrapes

## Honest limits
- Style tags on sites come from the gallery category they were listed under, not from looking at the sites.
- Pinterest could not be bulk-ingested (scraper does not support it; only public /ideas text pages are reachable). It is registered as a manual source and linked from collections.
- Mobbin returned a paid-plan error; Refero, Page Flows are paywalled for full access. Their taxonomies are recorded, their libraries are not copied.
- Styles with 0 catalogued sites (soft-neumorphism, claymorphism, organic-warm, retro-y2k, vibrant-blocks, data-dense-dashboard, accessible-inclusive) rely on collection links.

## Global install
`bash install-global.sh` copies this folder to `~/.claude/skills/design-kickoff` and adds the mandatory rule to `~/.claude/CLAUDE.md`, so it applies to every project on that machine.
