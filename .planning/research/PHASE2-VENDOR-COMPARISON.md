# Phase 2 Vendor Comparison: Hosting Platform for ColdestPlace

**Researched:** 2026-03-16
**Question:** Which platform should host ColdestPlace in Phase 2, and can we do it for free?
**Recommendation:** **Render free tier (persistent web service)** — free forever with no critical blockers for our workload, at the cost of ~60s cold-start spin-up on idle. If cold-start is unacceptable, use **Cloudflare Workers Paid ($5/mo)**.

---

## Context: What the Platform Must Do

The ColdestPlace backend does one thing on a schedule:

1. **Hourly cron job** — downloads NOAA METAR gzip (~5 MB compressed), decompresses, parses ~10,000 CSV rows; fetches 80–180 SYNOP bulletin files in batched parallel HTTP requests; scrapes ~20 Environment Canada HTML pages. Total: **~200 outbound HTTP requests per run**, taking **30–90 seconds wall-clock time** (mostly I/O wait).
2. **API endpoint** — `GET /api/coldest` returns cached JSON in <100ms. Serves maybe a few hundred requests/day.
3. **Static files** — serves `index.html`, `style.css`, `app.js` from `public/`.

The platform needs:
- No per-invocation subrequest cap that would kill the 200-request cron job
- Wall-clock time per run > 90 seconds (or persistent process model)
- KV/cache storage for the computed result (or in-memory is fine for a single instance)
- Hourly cron or equivalent
- Custom domain with HTTPS

---

## Candidates Evaluated

### 1. Cloudflare Workers (Free tier)
**Verdict: ❌ BLOCKED — two hard limits**

| Limit | Our Need | Free Tier |
|-------|----------|-----------|
| Subrequests per invocation | ~200 | **50** ❌ |
| CPU time (cron) | >>10ms | **10ms** ❌ |

Sources: https://developers.cloudflare.com/workers/platform/limits/ (verified March 2026)

### 2. Cloudflare Workers Paid ($5/mo)
**Verdict: ✅ VIABLE — all limits met**

| Limit | Our Need | Paid Tier |
|-------|----------|-----------|
| Subrequests per invocation | ~200 | **10,000** ✅ |
| CPU time (cron/Scheduled Workers) | >>10ms | **15 minutes** ✅ |
| KV writes/day | 1/hr = 24/day | **1,000** ✅ |
| KV reads/day | ~few hundred | **100,000** ✅ |
| Cron triggers | 1 | **5 (free slot)** ✅ |
| Custom domain | yes | **free via Pages** ✅ |

**Memory risk (MEDIUM):** METAR CSV decompresses to ~40–60 MB. Must stream through `DecompressionStream` → `csv-parse` pipeline. Cannot buffer full decompressed body in 128 MB Worker memory limit. This is solvable but requires streaming implementation in `fetcher.ts`.

**Migration cost:** `server.ts`, `fetcher.ts`, `fetcher-ec.ts` must shed `node:http`, `node:fs`, `node:zlib`, `node:path`. The remaining 8+ files are already Workers-compatible.

**Cost:** $5/month. No free path on this platform.

Sources: https://developers.cloudflare.com/workers/platform/limits/

---

### 3. Vercel (Hobby — free)
**Verdict: ❌ BLOCKED — cron minimum interval is once per day on free tier**

| Limit | Our Need | Hobby |
|-------|----------|-------|
| Cron minimum interval | 1 hour | **Once per day** ❌ |
| Function max duration | 90s | **300s** ✅ |
| Subrequest cap | ~200 | None documented ✅ |
| Cost | $0 | $0 |

The Hobby plan cron restriction is a hard deployment-time error, not a runtime degradation. A `0 * * * *` (hourly) cron expression will **fail to deploy** on Hobby. Upgrading to Pro ($20/mo) removes the restriction.

Sources: https://vercel.com/docs/cron-jobs/usage-and-pricing (verified March 2026)

### 4. Vercel (Pro — $20/mo)
**Verdict: ✅ VIABLE but expensive relative to Cloudflare**

| Limit | Our Need | Pro |
|-------|----------|-----|
| Cron minimum interval | 1 hour | **Per-minute** ✅ |
| Function max duration | 90s | **800s** ✅ |
| Cost | low | **$20/month** ⚠️ |

No subrequest cap found in official docs; Node.js runtime with fluid compute handles I/O-heavy workloads well. Storage via Vercel KV (Upstash Redis) available. However, at $20/mo this is 4× more expensive than Cloudflare Workers Paid for a project that needs one cron job.

---

### 5. Deno Deploy (Free)
**Verdict: ⚠️ PROBABLY VIABLE — no per-invocation subrequest cap, but monthly CPU budget math is tight**

| Limit | Our Need | Free |
|-------|----------|------|
| Subrequest cap per invocation | ~200 | **Not documented — no cap found** ✅ |
| Wall-clock time per cron run | 90s | **Not documented — no per-invocation limit found** ✅ |
| CPU time total/month | cron CPU only | **15h/month** — need to calculate |
| KV storage | ~1 KB result | **1 GiB** ✅ |
| KV writes/month | 24/day × 30 = 720 | **300,000** ✅ |
| Custom domains | yes | **50** ✅ |
| Cron support | yes (`Deno.cron()`) | **10 per revision** ✅ |
| Cost | $0 | $0 |

**CPU budget calculation:** The cron job spends ~90s total wall-clock, but nearly all of that is I/O wait (HTTP requests). Actual CPU (parsing CSV, decoding SYNOP, JSON serialization) is likely <5s per run. 24 runs/day × 5s CPU = 120s = 2 min/day × 30 days = 1h CPU/month. Free tier gives 15h/month. **Comfortable margin.**

**Migration cost:** Deno Deploy runs Deno (not Node.js). Our codebase uses TypeScript with npm packages (`csv-parse`, `zod`, `cheerio`). Deno supports npm packages via `npm:` specifiers (e.g., `import { parse } from 'npm:csv-parse/sync'`). This is a moderate migration — `node:` built-in imports still need to be removed, same as Cloudflare, but no Workers-specific APIs to adopt.

**Risk (MEDIUM):** Deno Deploy is an edge runtime with isolates, not a persistent process. In-memory caches (SYNOP's 3h Map, ISD station database) will not persist between cron invocations — each run starts cold. **All caching must move to Deno KV.** This is additional migration work beyond just removing `node:` imports.

**Risk (LOW):** No documented per-invocation wall-clock limit found in official docs. However, the platform uses an isolate model with CPU billing — extremely long-running invocations may be terminated by the platform even if not explicitly documented. This needs verification by running a test cron job.

Sources: https://deno.com/deploy/pricing, https://docs.deno.com/deploy/reference/cron/ (verified March 2026)

---

### 6. Render (Free web service)
**Verdict: ✅ VIABLE — simplest migration path, free, with one important trade-off**

| Limit | Our Need | Free |
|-------|----------|------|
| Subrequest cap | ~200 | **None — persistent process** ✅ |
| Wall-clock per "cron" | 90s | **None — it's a long-running server** ✅ |
| Memory | ~200 MB peak | **512 MB** ✅ |
| CPU | low | **0.1 vCPU** ✅ |
| Custom domains | yes | **Up to 2** ✅ |
| Persistent process | yes | **yes** ✅ |
| Cost | $0 | $0 |

**How it works on Render free tier:** Deploy as a standard web service (Node.js). The existing `src/server.ts` runs as-is — it's a long-running process, not a serverless function. The in-memory caches all work. Use `node-cron` or `setInterval` inside the server for hourly refreshes instead of a platform cron trigger.

**The trade-off — spin-down on idle:** Free Render web services spin down after 15 minutes of no inbound HTTP traffic. Spin-up takes ~60 seconds, during which Render shows a loading page to the first visitor. For a low-traffic hobby site, this is the dominant UX impact.

**Mitigation options:**
1. Use a free uptime monitor (UptimeRobot, BetterUptime free tier) to ping `GET /api/coldest` every 14 minutes → keeps the service warm permanently. This is a common pattern and works reliably.
2. Accept cold starts: the first visitor after idle gets a loading page for 60s; subsequent visitors get instant responses.

**No migration cost:** The existing `src/server.ts` deploys without modification. No `node:` imports need removal. No Workers API to learn. No KV API to integrate. The in-memory caches keep working. This is by far the lowest-effort path.

**"Service-initiated traffic" policy risk (LOW):** Render's docs mention they "may suspend a Free web service that initiates an uncommonly high volume of traffic." Our cron job makes ~200 HTTP requests/hour to NOAA/EC government servers. This is well within normal hobby project usage — Render's policy targets crypto miners and scrapers, not weather apps polling public data at 200 req/hr.

Sources: https://render.com/pricing, https://render.com/docs/free (verified March 2026)

---

### 7. Netlify (Free)
**Verdict: ❌ NOT SUITABLE — credit-based model with opaque limits, no persistent process**

Netlify moved to a credit-based billing model. Free tier gets 300 credits/month. Scheduled functions (cron) consume compute credits at 5 credits/GB-hour. Our cron job runs for ~90s and uses maybe 128 MB RAM = 128MB × 90s / 3600 = 0.003 GB-hours × 5 = 0.016 credits per run. 24 runs/day × 30 days = 720 runs × 0.016 = ~11.5 credits/month.

That math looks fine, but the concern is that Netlify serverless functions have a **10-second default maximum execution time** (configurable up to higher limits on paid plans, but the free tier default is 10s). Our cron job needs 30–90 seconds. Additionally, Netlify is not designed for persistent servers — it's a Jamstack platform — and cron ("Scheduled Functions") are not clearly documented as supporting long-running I/O-heavy tasks.

Not recommended due to complexity of credit model and likely execution time conflicts.

Sources: https://www.netlify.com/pricing/ (verified March 2026)

---

### 8. Fly.io
**Verdict: ❌ NOT SUITABLE — requires credit card, no meaningful free tier**

Fly.io is pure pay-as-you-go. No free tier that would cover a persistent web service for a non-trivial duration. Requires credit card upfront.

---

### 9. Val.town (from prior research)
**Verdict: ❌ BLOCKED — 1-minute wall-clock per cron run on free tier**

Free tier cron jobs have a **1-minute (60s) wall-clock limit**. Our cron job takes 30–90s wall-clock. Best case it just barely fits; worst case (slow NOAA FTP days) it gets killed mid-run. Not reliable enough.

Pro tier ($8.33/mo) gives 10 minutes wall-clock — would work, but costs money and offers no advantage over Render free + UptimeRobot.

---

## Comparison Matrix

| Platform | Cost | Subreq cap | Wall-clock | Cron | Migration effort | Cold start |
|----------|------|-----------|------------|------|-----------------|------------|
| **Render (free)** | **$0** | None (persistent) | None (persistent) | `node-cron` in process | **None** | 60s if idle >15min |
| Cloudflare Workers (paid) | $5/mo | 10,000 | 15 min | Native | High (Workers API + KV) | None |
| Deno Deploy (free) | $0 | None documented | None documented | `Deno.cron()` | Medium (npm: specifiers + KV) | Unknown |
| Vercel Pro | $20/mo | None documented | 800s | Native | Medium | None |
| Vercel Hobby | $0 | None documented | 300s | ❌ daily only | — | — |
| Val.town (free) | $0 | None documented | ❌ 60s | yes | — | — |
| Netlify (free) | $0 | None | ❌ ~10s default | yes | — | — |
| Fly.io | pay-as-you-go | None | None | manual | — | — |

---

## Recommendation

### Primary: Render free + UptimeRobot

**Use Render's free web service tier.** Deploy `src/server.ts` as-is. Add `node-cron` (or a `setInterval`-based loop) inside the server for the hourly data refresh. Use UptimeRobot's free plan to ping `/api/coldest` every 14 minutes, preventing the 15-minute idle spin-down.

**Why:**
- Zero cost, zero platform migration, zero code changes beyond adding `node-cron`
- All in-memory caches keep working
- 512 MB RAM is comfortable for the ~200 MB peak workload
- 0.1 vCPU is fine — the hourly job is I/O-bound, not CPU-bound
- Custom domain with free TLS
- The 60s cold-start is fully mitigated by the UptimeRobot keepalive

**What changes:**
1. Add `node-cron` to `package.json`
2. Add ~10 lines to `server.ts` to schedule the hourly cron call
3. Create `render.yaml` (optional, for infra-as-code)
4. Register on Render, connect GitHub repo, set environment to Node.js
5. Register on UptimeRobot (free), add HTTP monitor for the Render URL

**Estimated time to live:** 1–2 hours.

### Fallback: Cloudflare Workers Paid ($5/mo)

If Render is unacceptable (e.g., you want edge-distributed responses, or the 60s cold-start is non-negotiable even with keepalive), use Cloudflare Workers Paid. This requires the full Phase 2 migration as originally planned: remove `node:` imports, implement streaming METAR decompression, integrate KV, write Wrangler config. Estimated 3–5 days of work.

### Alternative (untested): Deno Deploy Free

Deno Deploy has no documented per-invocation subrequest cap or wall-clock limit, which makes it theoretically viable at $0. However, it requires:
- Moderate migration effort (npm: specifiers for `csv-parse`, `zod`, `cheerio`)
- Moving all in-memory caches to Deno KV (the isolate model means in-memory state is lost between cron invocations)
- Unverified behavior under 90s I/O-heavy cron runs

This path has more unknowns than Render and is not recommended as the primary choice without a proof-of-concept test first.

---

## Impact on ROADMAP.md

The Phase 2 goal as written assumes Cloudflare as the platform. Based on this research, **the Roadmap should be updated** to reflect the revised recommendation:

- **Option A (Render):** Phase 2 becomes "Production Deployment" — same goals, much simpler execution. No Workers migration. Drop INFRA-02 (Cloudflare Workers), INFRA-03 (KV), and the edge caching requirement. Add INFRA-07: "Deploy to Render free tier with keepalive monitor."

- **Option B (Cloudflare Paid):** Phase 2 stays as written, but add a note that it requires $5/mo and the Workers migration is the primary work item.

Suggested decision: **use Render for Phase 2** to ship fast and validate the live product. If the site gains real traffic and the free tier spin-down becomes a problem, migrate to Cloudflare Workers Paid as a Phase 2.5.

---

## Sources

- https://developers.cloudflare.com/workers/platform/limits/ — Cloudflare Workers limits (verified March 2026)
- https://vercel.com/docs/cron-jobs/usage-and-pricing — Vercel cron restrictions (verified March 2026)
- https://vercel.com/docs/functions/configuring-functions/duration — Vercel function max duration (verified March 2026)
- https://deno.com/deploy/pricing — Deno Deploy pricing and limits (verified March 2026)
- https://docs.deno.com/deploy/reference/cron/ — Deno Deploy cron reference (verified March 2026)
- https://render.com/pricing — Render pricing (verified March 2026)
- https://render.com/docs/free — Render free tier limits (verified March 2026)
- https://www.netlify.com/pricing/ — Netlify credit-based pricing (verified March 2026)
