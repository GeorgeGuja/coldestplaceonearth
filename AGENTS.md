# Agent Guidelines for ColdestPlace

ColdestPlace is a real-time weather web app that answers one question: *"What is the coldest airport or weather station on Earth right now?"* It scans 10,000+ global weather stations every hour using free NOAA public-domain feeds (no API keys required) and displays the coldest place plus the top-5 coldest locations.

## Project Overview

**Language**: TypeScript (strict mode, ES2022 target)
**Runtime**: Node.js 20+
**Framework**: None — raw Node.js `http` module for the server; vanilla HTML/CSS/JS frontend
**Package Manager**: npm
**Module System**: ES Modules (`"type": "module"` in package.json)

## Directory Structure

```
ColdestPlace/
├── src/              # All TypeScript source (backend logic + manual test scripts)
├── public/           # Static frontend assets (HTML, CSS, JS) served by the Node server
├── data/             # Runtime cache files (gitignored except ec-cache.json)
├── dist/             # TypeScript compilation output (gitignored)
├── .planning/        # Project planning docs (requirements, roadmap, state, research)
├── package.json
├── tsconfig.json
└── AGENTS.md
```

### Key source files

| File | Purpose |
|---|---|
| `src/types.ts` | Central type definitions and Zod schemas (`MetarObservation`, `Observation`, `Station`, `ColdestPlacesResponse`) |
| `src/server.ts` | HTTP server — serves `GET /api/coldest` JSON and static files from `public/` |
| `src/fetcher-combined.ts` | Top-level aggregator — fans out to all three sources, deduplicates by station ID (SYNOP > METAR > EC priority) |
| `src/fetcher.ts` | NOAA METAR CSV gzip fetcher with 1-hour file cache |
| `src/parser.ts` | METAR CSV → `MetarObservation[]` using `csv-parse` + Zod validation |
| `src/fetcher-synop.ts` | NOAA SYNOP bulletin fetcher — rate-limited, chunked, 3-hour in-memory cache per cold region |
| `src/synop-decoder.ts` | Hand-written SYNOP FM-12 decoder — extracts temperature from `1SnTTT` groups |
| `src/synop-metadata.ts` | Fetches and parses NOAA ISD station history to enrich SYNOP observations with names/coords |
| `src/fetcher-ec-hourly.ts` | Active Environment Canada fetcher — HTML-scrapes weather.gc.ca for ~20 cold-weather stations |
| `src/fetcher-ec.ts` | Older EC fetcher via SWOB-ML XML (less used) |
| `src/finder.ts` | Pure function: `Observation[]` → `{ coldest, top5, totalStations, sources }` |
| `src/metadata.ts` | Hardcoded ICAO → name/country lookup table with prefix-based country guessing as fallback |
| `src/test-*.ts` | Manual integration test/smoke test scripts — run individually with `npx tsx` |

## Commands

### Setup
```bash
npm install
```

### Development server (hot reload)
```bash
npm run dev        # tsx watch src/server.ts — server at http://localhost:3000
```

### Production build + run
```bash
npm run build      # tsc → dist/
npm start          # node dist/server.js
```

### Manual test scripts
There is no test framework. Run integration scripts individually:
```bash
npx tsx src/test-synop.ts        # Decode a sample SYNOP bulletin
npx tsx src/test-enrichment.ts   # Fetch all cold-region SYNOP data, print top-10 + metadata stats
npx tsx src/test-vostok.ts       # Check if Vostok Station appears in Antarctic SYNOP feed
npx tsx src/test-with-synop.ts   # Run full combined pipeline, print observations by source and top-5
```

### Linting
No linter is configured. Strict TypeScript (`tsc --noEmit`) is the linting equivalent:
```bash
npx tsc --noEmit
```

## Code Style

### Formatting
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Trailing commas**: Used in multi-line arrays/objects
- **Line length**: ~100 characters max
- No formatter config file exists; follow the conventions above manually

### Imports
1. Node.js built-in modules first
2. Third-party packages
3. Local imports using `.js` extensions (required for ES Module Node.js)
4. Type-only imports last

```typescript
import { createServer } from 'http';
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as cheerio from 'cheerio';
import { fetchMetarData } from './fetcher.js';
import type { Observation } from './types.js';
```

**Always use `.js` extensions** on local imports, even in `.ts` files. This is correct ES Module TypeScript for Node.js.

### Naming conventions

| Kind | Convention | Example |
|---|---|---|
| Variables / functions | `camelCase` | `fetchMetarData`, `allObservations` |
| Constants | `SCREAMING_SNAKE_CASE` | `METAR_URL`, `CACHE_TTL_MS`, `COLD_WEATHER_STATIONS` |
| Interfaces | `PascalCase` | `Station`, `ColdestPlacesResponse`, `StationMetadata` |
| Zod schemas | `PascalCase` + `Schema` suffix | `MetarObservationSchema` |
| Files | `kebab-case` with feature prefix | `fetcher-synop.ts`, `synop-decoder.ts` |
| Test scripts | `test-{feature}.ts` | `test-enrichment.ts` |

### TypeScript
- Strict mode is on — no `any`, use `unknown` in catch blocks
- Always declare explicit return types on exported functions
- Use Zod schemas at all external data boundaries (network responses, CSV/XML parsing)
- Type predicates for filter narrowing: `(obs): obs is Observation => obs !== null`
- Non-null assertions (`!`) only where logically safe and obvious

### Error handling
- All fetchers follow **graceful degradation**: try live fetch → on failure log and return stale cache → only throw if no cache at all
- Use `try/catch` with `unknown` in the catch clause, then check `instanceof Error`
- Log errors with context (which source failed, why)
- Never let a single source failure crash the entire aggregation pipeline

## Architecture Patterns

### Data pipeline (Extract → Transform → Enrich → Aggregate → Reduce → Serve)
1. **Extract** — `fetcher*.ts` download raw data (gzip CSV, raw text bulletins, HTML)
2. **Transform** — `parser.ts`, `synop-decoder.ts` convert to typed objects
3. **Enrich** — `synop-metadata.ts`, `metadata.ts` add human-readable names and coordinates
4. **Aggregate** — `fetcher-combined.ts` merges sources, deduplicates by station ID
5. **Reduce** — `finder.ts` sorts and selects the N coldest
6. **Serve** — `server.ts` exposes result as JSON at `GET /api/coldest`

### Multi-source fan-out with priority deduplication
Three independent sources are fetched. A `Set` of seen station IDs enforces priority: **SYNOP > METAR > EC**. If a station appears in SYNOP, it is not added from METAR or EC.

### Cache-aside pattern
Every fetcher manages its own cache:
- **File cache**: METAR (`data/cache.json`) and EC (`data/ec-cache.json`) with TTL checks
- **In-memory Map cache**: SYNOP bulletins keyed by regex pattern, 3-hour TTL
- **In-memory variable**: NOAA ISD station database, 24-hour TTL
- Stale cache is always used as fallback on network failure

### Batching and rate-limiting for external HTTP
When making multiple requests (EC station files, SYNOP bulletin files), chunk into batches of 10–20 and add a short delay between chunks (e.g., 500ms). Use `AbortSignal.timeout()` for per-request timeouts (5–10 seconds). This avoids hammering government servers.

## Common Pitfalls

- **Do not remove `.js` extensions from local imports.** TypeScript with `moduleResolution: node` and ES Modules requires them.
- **SYNOP decoder is sensitive to group ordering.** The temperature group `1SnTTT` must appear in the expected position in the 5-character block sequence. Do not simplify the position-preference logic without re-testing against known bulletins.
- **EC hourly scraper is fragile by nature.** The HTML structure of `weather.gc.ca` can change. Prefer the SYNOP and METAR sources for cold-weather stations where possible.
- **`fetcher-ec.ts` is the older, less-used EC implementation.** The active one is `fetcher-ec-hourly.ts`. Do not confuse them.
- **`data/` directory is gitignored (except `ec-cache.json`).** Do not rely on cache files being present — always handle cache miss gracefully.
- **The frontend has no build step.** Changes to `public/` files are served immediately; no bundler or transpiler is involved.
- **`npm test` is a placeholder** and exits with code 1. Run `src/test-*.ts` scripts manually with `npx tsx`.

## Planning docs

The `.planning/` directory contains structured project documentation:
- `PROJECT.md` — Vision, core decisions, non-goals
- `REQUIREMENTS.md` — All requirements with IDs (`DATA-xx`, `DISP-xx`, `UX-xx`, `TECH-xx`)
- `ROADMAP.md` — 3-phase plan: Local MVP → Cloudflare Migration → Enhanced UX
- `STATE.md` — Completion snapshot per requirement

Reference these when working on new features or evaluating scope changes.
