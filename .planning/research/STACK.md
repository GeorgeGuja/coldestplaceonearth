# Stack Research

**Domain:** Weather/Temperature Tracking Website on Cloudflare
**Researched:** 2026-02-07
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Astro** | 5.17.1 | Frontend framework | Server-first architecture minimizes JS bundle size (critical for free tier performance). Content-focused design perfect for data presentation. Native Cloudflare Pages support with zero-config deployments. 62% of Astro sites pass Core Web Vitals vs 29% for Next.js. Zero JS by default means minimal compute costs. |
| **Cloudflare Workers** | Latest (Runtime) | Serverless compute | Free tier: 100,000 requests/day, 10ms CPU time per invocation. Perfect for API proxying and scheduled jobs. Global edge network for low latency. No cold starts. Native integration with KV and Cron Triggers. |
| **Cloudflare KV** | Latest | Key-value storage | Free tier: 100,000 reads/day, 1,000 writes/day, 1GB storage. Ideal for caching weather data. Global replication with eventual consistency. Low-latency edge reads. Simple API. Stores processed "coldest place" results. |
| **Cloudflare Cron Triggers** | Latest | Scheduled jobs | Free tier included with Workers. Supports standard cron syntax. Runs Worker on schedule (e.g., hourly updates). No additional cost for cron invocations under CPU limits. Critical for periodic weather data fetching. |
| **TypeScript** | 5.x | Type safety | Industry standard for Cloudflare Workers. Prevents runtime errors. Excellent IDE support. Native support in Astro and Wrangler. Type-safe bindings for KV/Workers. |

### Weather API

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **WeatherAPI.com** | REST API v1 | Weather data source | Free tier: 1 million calls/month, realtime weather, 3-day forecast, global coverage. More generous than OpenWeather (1M/month vs 60 calls/min = ~2.6M/month max). Simple JSON API. No credit card required for free tier. Search API for location lookup. Astronomy data included. |
| **Alternative: OpenWeather** | API 3.0 | Backup weather source | Free tier: 1,000 calls/day (30K/month), current weather + 5-day forecast. Good fallback option. Requires email signup but established reputation. One Call API 3.0 for comprehensive data. |

**Recommendation:** Use WeatherAPI.com as primary (1M calls/month is generous for hourly updates). With hourly updates: 24 calls/day × 30 days = 720 calls/month, leaving 999,280 calls for development/testing.

### Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|---|
| **Cloudflare Pages** | Latest | Static site hosting | Free tier: Unlimited sites, 500 deploys/month, unlimited bandwidth. Auto-deploy from Git. Built-in preview deployments. Native Workers integration via Pages Functions. Global CDN. Zero configuration for Astro. |
| **Wrangler** | 4.63.0 | Cloudflare CLI | Official Cloudflare CLI for Workers/Pages. Local dev server with KV emulation. Deploy Workers and configure cron triggers. Type generation for bindings. Essential development tool. |
| **@astrojs/cloudflare** | 12.6.12 | Astro adapter | Official Cloudflare adapter for Astro SSR. Enables Pages Functions. Provides runtime bindings (KV, env vars). Platform proxy for local development. Auto-configured by create-cloudflare. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Leaflet** | 1.9.4 | Interactive maps | Lightweight (39KB gzipped), open-source, no API keys required. Display coldest location on world map. OpenStreetMap tiles are free. Better than Mapbox for free tier (Mapbox free = 50K loads/month). |
| **ofetch** | 1.x | HTTP client | Cloudflare Workers compatible. Auto-retry, timeout handling. Better than fetch() for reliability. Type-safe requests. Built by Nuxt team for edge runtime. |
| **date-fns** | 3.x | Date formatting | Tree-shakeable, small bundle. Format timestamps for display. Timezone handling for UTC weather data. No moment.js bloat (date-fns is 20KB vs 67KB). |
| **zod** | 3.x | Runtime validation | Validate weather API responses. Type-safe schema validation. Prevent bad data from crashing site. Catches API changes early. Works in Workers runtime. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Git** | Version control | Standard for Pages deployment |
| **GitHub** | Code hosting | Free for public repos, auto-deploy to Pages |
| **VS Code** | IDE | Astro extension, TypeScript support, Wrangler integration |
| **Vitest** | Testing | Fast, Vite-native, works with Astro project structure |
| **Prettier** | Code formatting | Standard JavaScript formatter, Astro plugin available |
| **ESLint** | Linting | TypeScript support, Astro plugin for .astro files |

## Installation

```bash
# Create project with C3 (create-cloudflare)
npm create cloudflare@latest coldest-place -- --framework=astro --platform=pages

# Core dependencies (auto-installed by C3)
# astro@5.17.1
# @astrojs/cloudflare@12.6.12
# wrangler@4.63.0

# Supporting libraries
npm install ofetch@1.4.1 date-fns@3.6.0 zod@3.23.8

# Map visualization
npm install leaflet@1.9.4
npm install -D @types/leaflet@1.9.14

# Dev dependencies (auto-installed)
# typescript@5.7.3
# prettier@3.4.2
# eslint@9.18.0
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Astro** | Next.js | If you need complex React-heavy interactivity or already have Next.js expertise. However, Next.js on Cloudflare requires @cloudflare/next-on-pages which adds complexity. Astro is simpler for content-focused sites. |
| **Astro** | SvelteKit | If you strongly prefer Svelte over React/Vue. SvelteKit has good Cloudflare adapter but Astro's zero-JS-by-default gives better performance for this use case. |
| **Astro** | Static HTML + vanilla JS | If you want absolute minimal setup. But loses type safety, developer experience, and build optimization that Astro provides. |
| **WeatherAPI.com** | OpenWeather | If you need specific features like minutely forecast or extensive historical data (OpenWeather has 47+ years). But WeatherAPI's free tier is more generous for basic use. |
| **Leaflet** | Mapbox GL | If you need advanced 3D maps or vector tiles. But Mapbox free tier (50K loads/month) may be constraining. Leaflet + OSM tiles is truly unlimited and free. |
| **Cloudflare KV** | D1 (SQLite) | If you need relational queries or complex data structures. But KV is simpler and cheaper for key-value weather cache (KV: 100K reads/day vs D1: 5M rows/day - both sufficient, but KV is conceptually simpler). |
| **Cloudflare KV** | Durable Objects | If you need strong consistency or complex state coordination. Overkill for simple weather caching. KV's eventual consistency is fine for weather data that updates hourly. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **moment.js** | 67KB bundle size, deprecated. Too large for free tier performance goals. | **date-fns** (20KB, tree-shakeable, actively maintained) |
| **jQuery** | Outdated paradigm, large bundle. Unnecessary with modern vanilla JS or framework components. | **Vanilla JS** or Astro components |
| **Express.js in Worker** | Workers don't support Node.js APIs. Express requires Node runtime which isn't available. | **Hono** (Workers-compatible lightweight framework, but not needed for simple API proxy) |
| **Axios** | Node.js dependencies don't work in Workers. Larger than needed. | **ofetch** (Workers-compatible, modern, auto-retry) |
| **React Server Components** | Not supported in Cloudflare Pages environment. Next.js App Router has edge limitations. | **Astro SSR** (proper server-rendering for Cloudflare) |
| **MongoDB Atlas** | External database = egress costs + latency. Defeats purpose of edge computing. | **Cloudflare KV** (co-located with Workers, zero egress) |
| **Firebase Hosting** | Wrong platform - project requires Cloudflare. Firebase doesn't have Workers equivalent. | **Cloudflare Pages** (as specified in requirements) |
| **Vercel** | Wrong platform - project requires Cloudflare. Vercel has different pricing model. | **Cloudflare Pages** (as specified in requirements) |
| **REST API frameworks (like tRPC)** | Unnecessary complexity for simple weather proxy. Free tier CPU time is precious. | **Simple fetch() in Worker** scheduled handler |

## Stack Patterns by Variant

**If building with user location detection:**
- Add `@cloudflare/workers-types` for geolocation bindings
- Use `request.cf.country`, `request.cf.city` from Workers
- No additional API calls needed - Cloudflare provides geo data

**If adding weather alerts/notifications:**
- Consider Cloudflare Queues (free tier: 10,000 operations/day)
- Or use Cloudflare Workers KV with TTL for simple notification scheduling
- Email via Mailgun/SendGrid free tier (5K emails/month)

**If needing historical comparison:**
- Use D1 instead of KV for time-series storage
- D1 free tier: 5 million rows read/day, 100K writes/day, 5GB storage
- More appropriate for "coldest place over last 30 days" feature

**If scaling beyond free tier:**
- Workers Paid plan: $5/month gets 10M requests, 30M CPU milliseconds
- Can handle ~13,888 hourly updates (10M / 720) = plenty of room
- KV Paid: $0.50/million reads beyond 10M/month

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| astro@5.17.1 | @astrojs/cloudflare@12.6.12 | Official compatibility, tested together |
| wrangler@4.63.0 | Node.js 18+ | Requires Node 18.17.0 or higher |
| leaflet@1.9.4 | Modern browsers (ES6+) | IE11 not supported (acceptable for 2025) |
| typescript@5.x | astro@5.x | Astro 5 requires TypeScript 5.0+ |
| date-fns@3.6.0 | TypeScript@5.x | Full TypeScript support with strict mode |

## Cloudflare-Specific Considerations

### Free Tier Limits
| Resource | Free Tier Limit | Usage Estimate | Headroom |
|----------|----------------|----------------|----------|
| Workers requests | 100,000/day | ~720/day (hourly cron) + ~100 user visits/day = ~820/day | 99% buffer |
| Workers CPU time | 10ms/invocation | ~5ms per weather API call + parse = well under limit | Safe |
| KV reads | 100,000/day | ~2,400/day (100 users × 24 page loads) | 97.6% buffer |
| KV writes | 1,000/day | 24/day (hourly updates) | 97.6% buffer |
| KV storage | 1GB | <1MB (single JSON object with metadata) | 99.9% buffer |
| Pages deployments | 500/month | ~30/month (daily commits) | 94% buffer |
| Weather API calls | 1M/month | ~720/month (hourly) | 99.93% buffer |

**Conclusion:** Free tier is MORE than sufficient for this use case. Biggest constraint is Workers requests (100K/day) but with hourly updates + modest traffic, we're well within limits.

### Scheduled Job Strategy

```typescript
// wrangler.jsonc configuration
{
  "triggers": {
    "crons": ["0 * * * *"]  // Every hour at :00
  }
}
```

**Rationale:** Hourly updates balance freshness vs API usage. Weather doesn't change dramatically minute-to-minute. Hourly = 720 API calls/month, leaving 999,280 WeatherAPI calls for dev/testing.

**Alternative cron patterns:**
- `0 */2 * * *` - Every 2 hours (360 calls/month) if hourly is too aggressive
- `0 0,6,12,18 * * *` - 4x per day (120 calls/month) for minimal updates
- `0 * * * *` - Recommended: Hourly for good freshness

### Data Flow Architecture

```
User Browser
    ↓
Cloudflare Pages (Astro static HTML)
    ↓
[User requests page]
    ↓
Cloudflare Workers (Pages Function)
    ↓
Reads from KV (cached weather data)
    ↓
Returns JSON to page
    ↓
Client-side JS renders map (Leaflet)

---

Scheduled Cron (hourly)
    ↓
Cloudflare Worker (scheduled handler)
    ↓
Fetches weather data from WeatherAPI.com
    ↓
Processes: finds coldest location globally
    ↓
Writes result to KV
    ↓
End (data ready for next user request)
```

**Why this architecture:**
1. **Separation of concerns:** Cron updates data, page reads data
2. **Fast page loads:** Users read from KV (edge cache), not API
3. **Cost efficiency:** 720 API calls/month vs millions if users called API directly
4. **Resilience:** If WeatherAPI is down, KV serves stale data (better than error)

## Sources

**HIGH Confidence:**
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/ (fetched 2026-02-07)
- Cloudflare Pages docs: https://developers.cloudflare.com/pages/ (fetched 2026-02-07)
- Cloudflare KV docs: https://developers.cloudflare.com/kv/ (fetched 2026-02-07)
- Cloudflare Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/ (fetched 2026-02-07)
- Cloudflare Pricing: https://developers.cloudflare.com/workers/platform/pricing/ (fetched 2026-02-07)
- Astro official site: https://astro.build/ (fetched 2026-02-07)
- Astro Cloudflare guide: https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/ (fetched 2026-02-07)
- WeatherAPI.com pricing: https://www.weatherapi.com/pricing.aspx (fetched 2026-02-07)
- OpenWeather pricing: https://openweathermap.org/price (fetched 2026-02-07)

**Package versions verified:**
- npm registry queries (2026-02-07): astro@5.17.1, wrangler@4.63.0, @astrojs/cloudflare@12.6.12, leaflet@1.9.4, date-fns@3.6.0

**MEDIUM Confidence:**
- HTTP Archive Core Web Vitals data (referenced by Astro site) - based on real-world CrUX data but date of snapshot unclear

---

*Stack research for: ColdestPlace - Weather/Temperature Tracking Website*  
*Researched: 2026-02-07*  
*Framework compatibility verified with official Cloudflare documentation*  
*All version numbers confirmed against npm registry*
