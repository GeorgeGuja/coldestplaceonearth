---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 02
status: executing
last_updated: "2026-04-06T01:33:10.530Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 3
  completed_plans: 0
  percent: 0
---

# Project State: ColdestPlace

**Last Updated:** 2026-04-05
**Current Phase:** 02
**Overall Status:** 🟡 Phase 2 Ready — Plans written, execution pending

## Phase Status

### Phase 1: Local MVP - Proof of Concept

**Status:** Executing Phase 02
**Progress:** 12 complete, 8 partial, 0 not started (out of 20)
**Target Completion:** Done

#### Requirements Status

- DATA-01: 🟡 Partial — METAR covers ~5k global stations; SYNOP fetcher is deliberately scoped to cold regions only (Russia, Canada, Greenland, Antarctica). Combined total likely meets or exceeds 10k but not formally verified.
- DATA-02: 🟡 Partial — `finder.ts` applies zero geographic filtering, but the upstream SYNOP source only pulls cold-region bulletins. METAR compensates with true global airport coverage.
- DATA-03: ✅ Complete — `parser.ts` (METAR CSV), `synop-decoder.ts` (FM-12 decoder), `synop-metadata.ts` (coords via ISD lookup). All four fields extracted across all sources.
- DATA-04: ✅ Complete — `finder.ts` sorts all observations ascending by `tempC`, returns global minimum with no caps or region comparisons.
- DATA-05: ✅ Complete — Zod schemas in `types.ts`; per-row try/catch in `parser.ts`; physical plausibility bounds (-90°C to +60°C) in `synop-decoder.ts`; null guards in EC fetchers.
- DATA-06: 🟡 Partial — Same caveat as DATA-02: `finder.ts` itself is unfiltered, but a non-airport anomaly in a non-cold SYNOP region would not be detected. METAR provides global airport-level anomaly detection.
- DISP-01: ✅ Complete — `public/app.js` renders temperature at `font-size: 4rem` as the page's largest element.
- DISP-02: ✅ Complete — `name` and `country` rendered in hero card and each top-5 entry. Fallback to `"${stationId} Station"` / `"Unknown"` for unenriched SYNOP stations.
- DISP-03: ✅ Complete — Coordinates formatted to 2 decimal places with N/S/E/W suffixes. Caveat: SYNOP stations with failed ISD lookup show `0.00°N, 0.00°E`.
- DISP-04: ✅ Complete — Observation timestamp shown per card; server last-updated timestamp shown in stats bar.
- DISP-05: ✅ Complete — `finder.ts` slices top 5; `app.js` renders all 5 with rank, name, coords, source, temp.
- UX-01: ✅ Complete — Two responsive breakpoints at 768px and 375px; viewport meta tag present.
- UX-02: ✅ Complete — Single-page, dark theme, no navigation chrome, minimal markup.
- UX-03: 🟡 Partial — Static assets load near-instantly. First API call (cold start) takes tens of seconds due to SYNOP bulletin fetching. Subsequent calls within cache TTL are fast. No server-side pre-warming or result cache in `server.ts`.
- UX-04: 🟡 Partial — Frontend error div rendered on HTTP errors; backend per-source failures are isolated; stale cache used as fallback. Gap: no staleness warning when cached data is old.
- UX-05: ✅ Complete — Raw `node:http` server, no Cloudflare dependencies. `npm run dev` is fully self-contained.
- TECH-01: ✅ Complete — Every `GET /api/coldest` request triggers the pipeline (cache-aware). Four `src/test-*.ts` scripts run individual pipeline components manually via `npx tsx`.
- TECH-02: ✅ Complete — Four cache layers: METAR file cache (`data/cache.json`, 1h TTL), EC file cache (`data/ec-cache.json`, 1h TTL), SYNOP in-memory Map (3h TTL), ISD station database in-memory (24h TTL). All survive source failures.
- TECH-03: ✅ Complete — Comprehensive `console.log`/`console.error` throughout all fetchers and the aggregator. Logs include station counts, cache hits, decode counts, and error context.
- TECH-04: 🟡 Partial — `src/server.ts`, `src/fetcher.ts`, and `src/fetcher-ec.ts` use `node:http`, `node:fs`, `node:zlib`, and `node:path` — hard blockers for Cloudflare Workers. The remaining 8+ source files use only `fetch()` and standard JS and are already Workers-compatible. Migration is the expected Phase 2 work.

#### Success Criteria Status

- [x] Global discovery works — METAR parses all ~5k global airports; SYNOP adds key cold-region stations
- [x] Accuracy and credibility — all data fields populated and displayed; loads fast on cache hits
- [x] Resilience — stale cache fallback in all fetchers; per-source isolation in `fetcher-combined.ts`
- [ ] Mobile experience — responsive CSS implemented; not formally browser-tested at 375px
- [x] Development velocity — `npm run dev` + `/api/coldest` endpoint; four manual test scripts

#### Active Work

None — phase complete

#### Blockers

None

---

### Phase 2: Production Deployment

**Status:** 🔵 Not Started
**Progress:** 0% (0/6 requirements)
**Target Completion:** TBD

**Platform Decision:** Render free tier (revised from original Cloudflare plan — see `.planning/research/PHASE2-VENDOR-COMPARISON.md`)

- Cloudflare Workers free: ❌ blocked (50 subrequest cap, 10ms CPU — both violated by our cron job)
- Cloudflare Workers paid ($5/mo): ✅ viable but requires full Workers migration (3–5 days) and costs money
- **Render free: ✅ recommended** — deploy `server.ts` as-is, add `node-cron` for hourly refresh. Zero migration cost, ships in 1–2 hours.
- Deno Deploy free: ⚠️ theoretically viable but untested; in-memory caches need KV migration; moderate effort

#### Requirements Status

- INFRA-01: ⬜ Not Started — Deploy to Render free tier (web service)
- INFRA-02: ⬜ Not Started — Configure `node-cron` inside server for hourly refresh (replaces Cloudflare cron trigger)
- INFRA-04: ⬜ Not Started — Verify hourly cron executes successfully in production
- INFRA-05: ⬜ Not Started — Configure Cache-Control headers on `/api/coldest` (60s max-age)
- INFRA-06: ⬜ Not Started — Set up domain + HTTPS (Render provides free TLS on custom domains)

#### Success Criteria Status

- [ ] Automatic freshness (hourly cron verified, "last updated" timestamp auto-advances)
- [ ] Global performance (<2s response time for API + static assets)
- [ ] Reliability (site stays up; HTTPS accessible at *.onrender.com)
- [ ] Live domain (HTTPS access at custom domain or `*.onrender.com`)
- [ ] Operational visibility (Render dashboard shows cron execution logs)

#### Active Work

3 plans ready for execution:

- `02-01-PLAN.md` — Install node-cron, refactor server.ts (background cache + cron + Cache-Control), add render.yaml
- `02-02-PLAN.md` — Commit code, deploy to Render, verify live URL

#### Blockers

None — Render deployment requires zero refactoring of existing code.

---

### Phase 3: Enhanced Experience - Competitive Differentiators

**Status:** 🔵 Not Started
**Progress:** 0% (0/6 requirements)
**Target Completion:** TBD

#### Requirements Status

- ENH-01: ⬜ Not Started — °C/°F toggle (blocked by Phase 2)
- ENH-02: ⬜ Not Started — Visual temperature context (blocked by Phase 2)
- ENH-03: ⬜ Not Started — Historical context (blocked by Phase 2)
- ENH-04: ⬜ Not Started — Location photos/imagery (blocked by Phase 2)
- ENH-05: ⬜ Not Started — Weather conditions beyond temp (blocked by Phase 2)
- ENH-06: ⬜ Not Started — Sunrise/sunset times (blocked by Phase 2)

#### Success Criteria Status

- [ ] Intuitive comparisons (visual context displayed)
- [ ] Visual richness (photos integrated)
- [ ] Weather storytelling (conditions + narrative)
- [ ] Historical perspective (averages + records)
- [ ] Unit flexibility (°C/°F toggle persists)

#### Active Work

None — blocked by Phase 2 completion

#### Blockers

- ⛔ Phase 2 must complete before Phase 3 can start

---

## Overall Progress

**Phase 1:** 12/20 complete, 8/20 partial — functionally done
**Phase 2:** 0/6 requirements
**Phase 3:** 0/6 requirements

---

## Recent Activity

- 2026-04-05: Phase 2 plans written (02-01 and 02-02). Covers node-cron refactor and Render deployment. Ready for execution.
- 2026-03-16: Phase 2 platform research complete. Cloudflare Workers free tier ruled out (subrequest cap + CPU limit). Render free tier selected as primary deployment target. PHASE2-VENDOR-COMPARISON.md written. STATE.md Phase 2 plan updated to reflect Render approach.
- 2026-02-22: Phase 1 implementation verified complete against codebase. STATE.md updated to reflect reality.
- 2026-02-08: Roadmap created, project planning phase complete.

## Next Steps

1. **Begin Phase 2: Render Deployment** (see `.planning/research/PHASE2-VENDOR-COMPARISON.md` for full decision rationale)
2. Add `node-cron` to `package.json` and wire hourly refresh into `server.ts` (replaces manual cron trigger)
3. Create `render.yaml` for Render infrastructure-as-code (optional but good practice)
4. Connect GitHub repo to Render, deploy as Node.js web service
5. Register custom domain + configure TLS on Render
6. Verify `GET /api/coldest` responds fast from live URL; confirm hourly updates fire in Render logs

## Risks & Issues

### Active Risks

1. **UX-03 cold start latency** (MEDIUM) — First API call after server restart takes 20-60s due to SYNOP bulletin fetching across 80+ files. No background pre-warming exists. Mitigation for Phase 2: add `node-cron` to run the full pipeline at startup + every hour so the result is always cached by the time users visit.

2. **Render free spin-down** (LOW) — Free web services sleep after 15 min of no traffic. First visitor after idle waits ~60s for spin-up. Acceptable for current scope.

3. **DISP-02/DISP-03 metadata gaps** (LOW) — SYNOP stations not in `metadata.ts` display as `"Station XXXXX"` and may have zero coordinates if ISD lookup fails. Acceptable for Phase 1; worth improving in Phase 2 or 3.

### Active Issues

None

---

## Decisions Log

| Date | Decision | Rationale | Impact |
|------|----------|-----------|--------|
| 2026-03-16 | Use Render free tier for Phase 2 (not Cloudflare) | CF free: blocked by 50-subrequest cap + 10ms CPU limit. CF paid ($5/mo) works but costs money and requires full Workers migration. Render free: zero migration cost, ships in 1–2 hours. | Phase 2 scope dramatically reduced; no Workers migration needed |
| 2026-02-08 | Use 3-phase roadmap (Local → Cloudflare → Enhanced) | Research shows Cloudflare constraints need validation before investment | Adds Phase 1 overhead but reduces Phase 2 risk |
| 2026-02-08 | Include all 20 v1 requirements in roadmap scope | Aligns with user's v1 definition in REQUIREMENTS.md | Clear scope boundary for initial release |
| 2026-02-08 | Use NOAA METAR + SYNOP (no API keys, public domain) | Free, reliable, no rate limits | SYNOP cold-region scope is intentional tradeoff for DATA-01/02 |

---

## Key Metrics

### Development Velocity

- Phase 1: 12/20 requirements complete, 8/20 partial, 0 not started

### Quality Metrics

- TypeScript strict mode: on
- Known type errors in `fetcher-ec.ts` and `fetcher-ec-hourly.ts` (pre-existing, non-blocking)
- No test framework; 4 manual integration test scripts

### User Metrics

- Site not yet deployed

---

*State tracked in real-time. Update after completing requirements or reaching milestones.*

**Legend:**

- 🔵 Not Started
- 🟡 In Progress
- 🟢 Complete
- 🔴 Blocked
- ⬜ Not Started (requirement)
- 🟦 In Progress (requirement)
- ✅ Complete (requirement)
- 🟡 Partial (requirement)
- ⛔ Blocker
