#!/usr/bin/env node
// Design kickoff: turns a project brief into 3 recommended design styles + 1 wildcard,
// each with real reference sites and live collection links.
//   node suggest.mjs --brief "international dating app, warm and friendly" [--platform app|web|landing|dashboard]
//   node suggest.mjs --list | --stats | --brief "..." --json
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(dir, "data", f), "utf8"));
const { styles } = load("styles.json");
const { references, snapshotDate } = load("references.json");
const collections = load("collections.json");

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d = "") => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

// Korean/other synonyms -> the English vocabulary used in styles.json keywords/bestFor.
const SYNONYMS = {
  미니멀: "minimal clean simple", 깔끔: "clean simple", 심플: "simple minimal",
  따뜻: "warm friendly human", 친근: "friendly warm", 감성: "warm story",
  소개팅: "dating", 데이팅: "dating", 매칭: "dating social community", 연애: "dating", 만남: "dating community",
  국제: "international multilingual global", 다국어: "multilingual international", 글로벌: "global international",
  다크: "dark night", 어두: "dark night", 밝은: "light", 귀여: "playful friendly fun", 재미: "fun playful",
  플레이풀: "playful fun", 고급: "luxury premium elegant", 럭셔리: "luxury premium", 프리미엄: "premium luxury",
  대시보드: "dashboard admin analytics", 관리자: "admin dashboard", 통계: "analytics dashboard",
  패션: "fashion", 음악: "music", 교육: "education", 헬스: "fitness wellness", 건강: "wellness healthcare",
  금융: "finance fintech", 커뮤니티: "community social", 소셜: "social", 쇼핑: "e-commerce shop", 커머스: "e-commerce",
  앱: "mobile app", 모바일: "mobile app", 웹: "web", 랜딩: "landing conversion", 포트폴리오: "portfolio",
  대담: "bold statement", 실험: "experimental art", 레트로: "retro nostalgia", 애니메이션: "animation motion interactive",
  스와이프: "swipe gesture animation", 신뢰: "trust professional", 전문: "professional trust", 접근성: "accessible inclusive a11y",
  ai: "ai assistant chat", 챗: "chat conversation", 채팅: "chat conversation messaging",
};
const PLATFORM_HINT = {
  app: "mobile app", mobile: "mobile app", web: "web", landing: "landing conversion hero", dashboard: "dashboard admin analytics", admin: "dashboard admin analytics",
};

const expand = (text) => {
  let t = text.toLowerCase();
  for (const [k, v] of Object.entries(SYNONYMS)) if (t.includes(k)) t += ` ${v}`;
  return t;
};
const tokens = (t) => new Set(t.split(/[^a-z0-9가-힣]+/).filter((w) => w.length > 2));

if (flag("list")) {
  for (const s of styles) console.log(`${s.id.padEnd(26)} ${s.name}  [${s.group}]`);
  process.exit(0);
}
if (flag("stats")) {
  const c = {};
  for (const r of references) for (const s of r.styles) c[s] = (c[s] ?? 0) + 1;
  console.log(`references: ${references.length} (snapshot ${snapshotDate})`);
  for (const s of styles) console.log(`${s.id.padEnd(26)} ${String(c[s.id] ?? 0).padStart(4)} catalogued sites, ${(collections.styles[s.id] ?? []).length} collection links`);
  process.exit(0);
}

const brief = opt("brief");
if (!brief) { console.error('usage: node suggest.mjs --brief "<project description>" [--platform app|web|landing|dashboard] [--top 3] [--json]'); process.exit(1); }

const platform = opt("platform");
const text = expand(`${brief} ${PLATFORM_HINT[platform] ?? ""} ${opt("mood")} ${opt("industry")}`);
const want = tokens(text);
const hit = (list) => list.reduce((n, w) => n + (want.has(w.toLowerCase()) || text.includes(w.toLowerCase()) ? 1 : 0), 0);

const scored = styles.map((s) => {
  const kw = hit(s.keywords), bf = hit(s.bestFor), av = hit(s.avoid);
  return { s, score: kw * 2 + bf * 3 - av * 4 };
}).sort((a, b) => b.score - a.score);

const top = Number(opt("top", "3"));
const picks = [];
for (const x of scored) {
  if (picks.length >= top) break;
  if (picks.some((p) => p.s.group === x.s.group) && picks.length < top && scored.filter((y) => !picks.includes(y) && y.s.group !== x.s.group && y.score >= x.score - 2).length) continue;
  picks.push(x);
}
// Wildcard: best-scoring style from a group not yet represented, so the user always sees one contrasting direction.
const wildcard = scored.find((x) => !picks.includes(x) && !picks.some((p) => p.s.group === x.s.group)) ?? scored.find((x) => !picks.includes(x));

const refsFor = (s, n = 4) => {
  const pool = references.filter((r) => r.styles.includes(s.id));
  const seen = new Set(); const out = [];
  for (const r of pool) { // one per source first, for variety
    const src = r.sources[0]; if (seen.has(src)) continue; seen.add(src); out.push(r); if (out.length === n) return out;
  }
  for (const r of pool) { if (!out.includes(r)) out.push(r); if (out.length === n) break; }
  return out;
};

const domainKeys = [];
if (/dating|social|community/.test(text)) domainKeys.push("dating");
if (/mobile app|app\b/.test(text) || ["app", "mobile"].includes(platform)) domainKeys.push("mobile-app");
if (/landing|conversion/.test(text) || platform === "landing") domainKeys.push("landing");
if (!domainKeys.length || platform === "web") domainKeys.push("web-general");

const build = (x, label) => ({
  label, id: x.s.id, name: x.s.name, score: x.score, summary: x.s.summary, tokens: x.s.tokens,
  bestFor: x.s.bestFor, avoid: x.s.avoid,
  examples: refsFor(x.s).map((r) => ({ name: r.name, url: r.url, from: r.sources.join("+") })),
  collections: collections.styles[x.s.id] ?? [],
});
const result = {
  brief, platform: platform || null, snapshotDate,
  options: [...picks.map((x, i) => build(x, `Option ${String.fromCharCode(65 + i)}`)), ...(wildcard ? [build(wildcard, "Wildcard")] : [])],
  domainCollections: Object.fromEntries(domainKeys.map((k) => [k, collections.domains[k]])),
  domainNotes: domainKeys.map((k) => collections.domainNotes?.[k]).filter(Boolean),
  caveat: "Examples are matched by the gallery category each site was listed under, not by visual analysis. Open the links and confirm the look before committing.",
};

if (flag("json")) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }

const out = [`# Design kickoff - ${brief}`, `_catalog snapshot ${snapshotDate}, ${references.length} sites from ${new Set(references.flatMap((r) => r.sources)).size} sources_`, ""];
for (const o of result.options) {
  out.push(`## ${o.label}: ${o.name}`, o.summary, "",
    `- Palette: ${o.tokens.palette}`, `- Type: ${o.tokens.type}`, `- Shape: ${o.tokens.shape}`, `- Motion: ${o.tokens.motion}`,
    `- Best for: ${o.bestFor.join(", ")}${o.avoid.length ? `  |  Avoid for: ${o.avoid.join(", ")}` : ""}`, "");
  if (o.examples.length) { out.push("Examples:"); for (const e of o.examples) out.push(`- ${e.name} (${e.from}) ${e.url}`); }
  if (o.collections.length) { out.push("Live collections:"); for (const c of o.collections) out.push(`- ${c}`); }
  out.push("");
}
out.push("## Domain reference collections");
for (const [k, v] of Object.entries(result.domainCollections)) { out.push(`- ${k}:`); for (const u of v) out.push(`  - ${u}`); }
for (const n of result.domainNotes) out.push("", `Note: ${n}`);
out.push("", `> ${result.caveat}`);
console.log(out.join("\n"));
