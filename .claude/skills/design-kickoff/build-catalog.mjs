// Merges the raw gallery snapshots into data/references.json.
// Style assignment is derived from the gallery category a site was listed under
// (a heuristic, NOT a visual analysis) - see CATEGORY_STYLES below.
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GALLERIES as SITEINSPIRE, SNAPSHOT_DATE } from "./sources.mjs";
import { GALLERIES as OTHER } from "./raw-other.mjs";

const dir = dirname(fileURLToPath(import.meta.url));

const CATEGORY_STYLES = {
  "siteinspire/minimal": ["minimal-swiss", "exaggerated-minimalism"],
  "siteinspire/typographic": ["editorial-magazine", "exaggerated-minimalism", "kinetic-type-parallax"],
  "siteinspire/e-commerce": ["luxury-premium", "editorial-magazine"],
  "siteinspire/grid-layout": ["minimal-swiss", "bento-grid", "editorial-magazine"],
  "siteinspire/unusual-layout": ["brutalism-raw", "gen-z-maximalism", "exaggerated-minimalism"],
  "siteinspire/fashion": ["luxury-premium", "editorial-magazine"],
  "awwwards/mobile-apps": ["motion-driven", "glassmorphism", "aurora-gradient", "ai-native"],
  "awwwards/winners": ["kinetic-type-parallax", "3d-hyperreal", "motion-driven"],
  "lapa-ninja/landing": ["hero-conversion", "bento-grid", "aurora-gradient"],
  "httpster/featured": ["minimal-swiss", "editorial-magazine", "brutalism-raw"],
  "minimal-gallery/featured": ["minimal-swiss", "exaggerated-minimalism"],
  "curated/neubrutalism": ["neubrutalism"],
  "curated/dark": ["dark-oled"],
  "curated/saas-clean": ["minimal-swiss", "hero-conversion"],
};

const validStyles = new Set(JSON.parse(readFileSync(join(dir, "data/styles.json"), "utf8")).styles.map((s) => s.id));
const byUrl = new Map();

const add = (key, line) => {
  const [name, url] = line.split("|");
  if (!name || !url) return;
  const [source, category] = key.split("/");
  const id = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase();
  const entry = byUrl.get(id) ?? { name: name.trim(), url: url.trim(), sources: [], categories: [], styles: [] };
  if (!entry.sources.includes(source)) entry.sources.push(source);
  entry.categories.push(`${source}:${category}`);
  for (const s of CATEGORY_STYLES[key] ?? []) if (!entry.styles.includes(s)) entry.styles.push(s);
  byUrl.set(id, entry);
};

for (const [cat, text] of Object.entries(SITEINSPIRE)) for (const l of text.split("\n")) add(`siteinspire/${cat}`, l);
for (const [key, text] of Object.entries(OTHER)) for (const l of text.split("\n")) add(key, l);

for (const [key, styles] of Object.entries(CATEGORY_STYLES)) for (const s of styles) if (!validStyles.has(s)) throw new Error(`unknown style ${s} in ${key}`);

const references = [...byUrl.values()].sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(join(dir, "data/references.json"), JSON.stringify({ snapshotDate: SNAPSHOT_DATE, count: references.length, references }, null, 1) + "\n");
console.log(`wrote ${references.length} references`);
