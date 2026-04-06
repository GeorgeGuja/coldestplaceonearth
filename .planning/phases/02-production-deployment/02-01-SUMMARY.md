---
plan: 02-01
phase: 02-production-deployment
status: complete
completed_at: 2026-04-05
commits:
  - 12a08d9
  - 83e9c49
---

# Summary: Background Scheduler + Render Config

## What Was Built

Refactored `src/server.ts` to use a cache-aside pattern with an hourly background refresh. The server now:

1. Pre-warms its in-memory cache on startup by fetching data immediately
2. Schedules hourly data refreshes via `node-cron` (fires at `:00` each hour)
3. Serves `GET /api/coldest` instantly from the cached result (no per-request fetch)
4. On cold start (cache is `null`), triggers a live fetch then responds
5. Sets `Cache-Control: public, max-age=60` on all API 200 responses

Added `render.yaml` at the project root for Render free-tier deployment.

Fixed 7 pre-existing TypeScript errors in `fetcher-ec.ts`, `fetcher-ec-hourly.ts`, and `test-with-synop.ts` that were blocking `tsc --noEmit` and `npm run build` from exiting cleanly.

## Key Files

### Created
- `render.yaml` — Render deployment config (web service, free plan, `npm install && npm run build`, `npm start`)

### Modified
- `src/server.ts` — Added `node-cron` import, `CachedResult` type, `cachedResult` variable, `refreshData()` function; rewrote `/api/coldest` handler to serve from cache; added cron schedule and startup pre-warm
- `src/fetcher-ec.ts` — Added `ParsedSwob`/`SwobElement` interfaces for xml2js result; fixed filter predicate type
- `src/fetcher-ec-hourly.ts` — Fixed filter predicate type
- `src/test-with-synop.ts` — Removed access to non-existent `result.lastUpdated`
- `package.json` / `package-lock.json` — Added `node-cron` dependency and `@types/node-cron` devDependency

## Verification

- `npx tsc --noEmit` exits with code 0 (zero errors)
- `npm run build` exits with code 0 (`dist/server.js` created)
- `render.yaml` exists at project root
- `src/server.ts` contains `node-cron` import, `cachedResult` variable, `refreshData()` function
- `Cache-Control: public, max-age=60` set on `/api/coldest` 200 responses
- `node-cron` and `@types/node-cron` present in `package.json`

## Self-Check: PASSED

All must_haves satisfied:
- ✓ Server pre-warms data on startup (refreshData called immediately after server.listen)
- ✓ Hourly cron job refreshes cached result (`cron.schedule('0 * * * *', ...)`)
- ✓ GET /api/coldest returns instantly from cache when warm
- ✓ GET /api/coldest includes `Cache-Control: public, max-age=60`
- ✓ First request after cold start triggers live fetch (cache is null check)
- ✓ `src/server.ts` with node-cron and `cachedResult` in place
- ✓ `render.yaml` at project root
