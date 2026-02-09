# Architecture Research

**Domain:** Weather/Temperature Tracking on Cloudflare Edge
**Researched:** 2026-02-07
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Cloudflare Pages (Frontend)              │       │
│  │         Static HTML/CSS/JS served from Edge           │       │
│  └──────────────┬───────────────────────────────────────┘       │
│                 │ HTTP GET /api/coldest                          │
│                 ↓                                                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │           Workers - HTTP Handler (fetch)              │       │
│  │    • Receives user requests                           │       │
│  │    • Reads from KV cache                              │       │
│  │    • Returns cached data (fast path)                  │       │
│  └──────────────┬───────────────────────────────────────┘       │
│                 │ Bindings                                       │
│                 ↓                                                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Cloudflare KV Storage                    │       │
│  │    Key: "coldest_place_current"                       │       │
│  │    Value: { location, temp, timestamp, ... }          │       │
│  └─────────────────────────────────────────┬────────────┘       │
│                                             ↑                    │
│                                             │ Writes (PUT)       │
│  ┌──────────────────────────────────────────────────────┐       │
│  │       Workers - Scheduled Handler (scheduled)         │       │
│  │    • Triggered by Cron (e.g., every 30 mins)          │       │
│  │    • Fetches weather data from API                    │       │
│  │    • Determines coldest location                      │       │
│  │    • Updates KV storage                               │       │
│  └──────────────┬───────────────────────────────────────┘       │
│                 │ HTTP Fetch                                     │
│                 ↓                                                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │            External Weather API                       │       │
│  │    (OpenWeatherMap, WeatherAPI, etc.)                 │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘

External (not on Cloudflare):
┌──────────────────────────────────────────────────────────────────┐
│                     Weather API Provider                          │
│  Free Tier: 60 calls/min, 1M calls/month (OpenWeatherMap)       │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Frontend (Pages)** | Static UI served at edge, displays coldest location data | HTML/CSS/JS (vanilla or React/Vue/Svelte), deployed to Cloudflare Pages |
| **HTTP Handler Worker** | Responds to user requests, reads from KV cache | Worker with `fetch()` handler, fast read path (<50ms globally) |
| **Scheduled Worker** | Periodic data refresh via cron, calls weather API, updates KV | Worker with `scheduled()` handler, runs every 30-60 minutes |
| **KV Storage** | Global key-value cache for coldest place data | Cloudflare KV namespace with bindings, eventually consistent across edge |
| **Weather API Integration** | External data source for weather/temperature data | REST API calls to OpenWeatherMap, WeatherAPI, or similar (free tier) |

## Recommended Project Structure

```
coldest-place/
├── src/
│   ├── workers/
│   │   ├── api.ts              # HTTP handler (fetch event)
│   │   └── scheduler.ts        # Cron handler (scheduled event)
│   ├── lib/
│   │   ├── weather-api.ts      # Weather API client
│   │   ├── coldest-finder.ts   # Logic to determine coldest location
│   │   ├── kv-store.ts         # KV storage abstraction
│   │   └── types.ts            # TypeScript types
│   └── frontend/
│       ├── index.html          # Static HTML page
│       ├── styles.css          # Styling
│       └── app.js              # Frontend JS (fetch API data)
├── wrangler.jsonc              # Cloudflare Workers config
├── package.json
└── README.md
```

### Structure Rationale

- **src/workers/:** Separate HTTP and scheduled handlers (can be same Worker with two exports or separate Workers)
- **src/lib/:** Shared business logic reused by both handlers (weather API, coldest calculation, KV operations)
- **src/frontend/:** Static assets for Cloudflare Pages (or served directly from Worker)
- **wrangler.jsonc:** Central configuration for Workers, KV bindings, Cron triggers, environment variables

## Architectural Patterns

### Pattern 1: Scheduled Background Job with Edge Cache Read-Through

**What:** Cron Worker periodically fetches weather data, computes result, and writes to KV. User-facing Worker reads from KV (cached data). This decouples expensive API calls from user requests.

**When to use:** When external API has rate limits, data updates infrequently (every 30-60 mins), and you need fast global reads.

**Trade-offs:**
- **Pro:** Sub-50ms response times globally, minimal API calls (respects free tier limits)
- **Pro:** User requests never block on slow API calls
- **Con:** Data freshness delayed by cron interval (eventual consistency)
- **Con:** Cron propagation can take 5-15 minutes after config changes

**Example:**
```typescript
// src/workers/scheduler.ts
export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    // Fetch weather data for predefined locations (e.g., 50-100 coldest cities)
    const weatherData = await fetchWeatherForLocations(env.WEATHER_API_KEY);
    
    // Determine coldest location
    const coldestPlace = findColdest(weatherData);
    
    // Store in KV with metadata
    await env.COLDEST_PLACE_KV.put('current', JSON.stringify({
      location: coldestPlace.name,
      temperature: coldestPlace.temp,
      timestamp: Date.now(),
      coord: { lat: coldestPlace.lat, lon: coldestPlace.lon }
    }), {
      expirationTtl: 3600 // expire in 1 hour as safety
    });
    
    console.log(`Updated coldest place: ${coldestPlace.name} at ${coldestPlace.temp}°C`);
  }
};

// src/workers/api.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Fast read from KV (globally distributed, edge cache)
    const data = await env.COLDEST_PLACE_KV.get('current', 'json');
    
    if (!data) {
      return new Response('Data not available yet', { status: 503 });
    }
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800', // CDN cache for 30 mins
      }
    });
  }
};
```

### Pattern 2: Rate Limit Management via Batch Fetching

**What:** Fetch weather data for multiple locations in a single cron run by batching API calls. Use Promise.all() for parallel requests, respecting API rate limits.

**When to use:** When monitoring many locations (50-200) and need to stay within free tier limits (60 calls/min).

**Trade-offs:**
- **Pro:** Efficient use of rate limits, completes in 1-2 minutes
- **Pro:** Maximizes free tier coverage (1M calls/month = ~22K calls/day)
- **Con:** Need to track rate limits carefully to avoid hitting ceiling
- **Con:** Longer cron execution time (but doesn't affect user response time)

**Example:**
```typescript
// src/lib/weather-api.ts
export async function fetchWeatherBatch(
  locations: { lat: number; lon: number }[],
  apiKey: string,
  rateLimit: number = 60 // calls per minute
): Promise<WeatherData[]> {
  const batchSize = Math.floor(rateLimit / 2); // Conservative: 30 calls/min
  const batches = chunk(locations, batchSize);
  
  const results: WeatherData[] = [];
  
  for (const batch of batches) {
    // Parallel fetch within rate limit
    const promises = batch.map(loc =>
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${loc.lat}&lon=${loc.lon}&appid=${apiKey}&units=metric`)
        .then(r => r.json())
    );
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // Wait 60s between batches to respect rate limit
    if (batches.indexOf(batch) < batches.length - 1) {
      await sleep(60000);
    }
  }
  
  return results;
}
```

### Pattern 3: KV as Single Source of Truth with Versioning

**What:** Store multiple versions of data in KV (current, previous, metadata) with timestamps. Allows rollback and historical tracking.

**When to use:** When you need data history, want graceful degradation, or need to detect stale data.

**Trade-offs:**
- **Pro:** Can serve previous data if update fails
- **Pro:** Frontend can detect stale data and show warning
- **Con:** Uses more KV storage (but still well within free tier: 1GB)

**Example:**
```typescript
// KV keys structure:
// - "coldest:current"  -> Latest coldest place
// - "coldest:previous" -> Previous result (rollback)
// - "coldest:metadata" -> Update history, error logs

interface ColdestPlaceData {
  location: string;
  temperature: number;
  timestamp: number;
  coord: { lat: number; lon: number };
  version: number;
}

async function updateColdestPlace(env: Env, data: ColdestPlaceData) {
  // Get current data to archive as previous
  const current = await env.COLDEST_PLACE_KV.get('coldest:current', 'json');
  
  if (current) {
    await env.COLDEST_PLACE_KV.put('coldest:previous', JSON.stringify(current));
  }
  
  // Write new current
  await env.COLDEST_PLACE_KV.put('coldest:current', JSON.stringify(data));
  
  // Update metadata
  const metadata = await env.COLDEST_PLACE_KV.get('coldest:metadata', 'json') || { updates: [] };
  metadata.updates.push({ timestamp: Date.now(), location: data.location, temp: data.temperature });
  metadata.updates = metadata.updates.slice(-100); // Keep last 100 updates
  await env.COLDEST_PLACE_KV.put('coldest:metadata', JSON.stringify(metadata));
}
```

## Data Flow

### Request Flow (User Request)

```
User Browser
    ↓ HTTP GET /api/coldest
Cloudflare Edge (nearest datacenter)
    ↓
Workers HTTP Handler (fetch event)
    ↓ Read binding
KV Storage (edge cache, <10ms)
    ↓
Return JSON response
    ↓ HTTP 200 + Cache-Control header
User Browser (display coldest place)
    ↓ CDN caches response for 30 mins
Subsequent users get CDN cached response (<5ms)
```

### Scheduled Update Flow (Background Job)

```
Cloudflare Cron Trigger (every 30 minutes)
    ↓
Workers Scheduled Handler (scheduled event)
    ↓ Define target locations (50-100 cities)
Batch API Requests (parallel fetch)
    ↓ HTTP GET to OpenWeatherMap (respecting rate limits)
Weather API (responds with temperature data)
    ↓
Workers: Process responses
    ↓ Find minimum temperature
Workers: Determine coldest location
    ↓ Write to KV
KV Storage: Update "coldest:current" key
    ↓ Propagates globally (eventually consistent, ~60s)
All Edge Locations: Serve updated data on next request
```

### Key Data Flows

1. **Cold Start (First Request):** User request → Worker → KV read → Return data (or 503 if no data yet)
2. **Steady State (Cached):** User request → Cloudflare CDN cache hit → Return cached response (<5ms)
3. **Cron Update:** Cron trigger → Worker → Weather API (batch fetch) → Process → KV write → Global propagation
4. **Error Handling:** Weather API fails → Worker logs error → Serve stale data from KV (previous version) → Alert monitoring

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-10K users/day** | Current architecture sufficient. Single Worker, KV cache, 30-min updates. Free tier handles easily. |
| **10K-1M users/day** | Add CDN caching (Cache-Control headers). Consider Durable Objects for real-time coordination if needed. Monitor KV read throughput. |
| **1M+ users/day** | Add Analytics Engine for usage tracking. Use Workers Analytics to optimize. Consider D1 for historical data storage. Scale cron to multiple regions if needed. |

### Scaling Priorities

1. **First bottleneck:** KV read limits (unlikely with caching, but can add Cloudflare Cache API for aggressive caching)
   - **Fix:** Add Cache API layer before KV: `cache.match(request)` → `env.KV.get()` → `cache.put()`
   
2. **Second bottleneck:** Weather API rate limits (if expanding locations or increasing update frequency)
   - **Fix:** Upgrade to paid API tier, or use multiple free accounts with round-robin, or reduce update frequency

## Anti-Patterns

### Anti-Pattern 1: Calling Weather API on Every User Request

**What people do:** Fetch weather data directly in the HTTP handler on each user request.

**Why it's wrong:** 
- Blows through API rate limits instantly (60 calls/min = 1 call/sec, but you have thousands of users)
- Slow response times (500ms+ for API call vs. <10ms for KV read)
- Expensive if you exceed free tier

**Do this instead:** Use scheduled worker + KV cache pattern (Pattern 1 above). User requests only read from KV, never call external API.

---

### Anti-Pattern 2: Using Workers KV for Frequent Writes

**What people do:** Update KV on every temperature change or every user request.

**Why it's wrong:**
- KV is optimized for high read, low write workloads
- Writes have eventual consistency (60s propagation globally)
- Free tier: 1,000 writes/day limit (easily exceeded)

**Do this instead:** 
- Write only on cron schedule (every 30-60 mins = 48-24 writes/day)
- For high-frequency writes, use Durable Objects instead
- Batch multiple updates into a single KV write

---

### Anti-Pattern 3: Not Setting Cache-Control Headers

**What people do:** Return data without cache headers, forcing every request to hit Worker.

**Why it's wrong:**
- Wastes Worker CPU time (charged on paid plans)
- Misses free CDN caching layer (Cloudflare's global CDN)
- Slower response times (10ms vs. 5ms)

**Do this instead:**
```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=1800', // 30 mins
    'CDN-Cache-Control': 'max-age=1800'
  }
});
```

---

### Anti-Pattern 4: Storing Large Data in KV Without Compression

**What people do:** Store uncompressed JSON with full weather data for hundreds of locations.

**Why it's wrong:**
- KV has 25MB value size limit (unlikely to hit, but inefficient)
- Slower reads for large payloads
- Wastes storage (free tier: 1GB)

**Do this instead:**
- Store only essential data (location name, temperature, timestamp)
- Compress JSON if storing large datasets (use gzip)
- Use KV for metadata, R2 for bulk data if needed

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **OpenWeatherMap API** | REST API via `fetch()` in scheduled worker | Free tier: 60 calls/min, 1M calls/month. Use One Call API 3.0 (first 1K/day free). |
| **WeatherAPI.com** | REST API via `fetch()` | Alternative: 1M calls/month free. Similar integration pattern. |
| **Cloudflare KV** | Bindings in `wrangler.jsonc` | `env.COLDEST_PLACE_KV.get/put()`. Free tier: 100K reads/day, 1K writes/day, 1GB storage. |
| **Cloudflare Pages** | Static hosting via Git integration | Automatic deployment on push. Serves frontend HTML/CSS/JS. |
| **Cloudflare Cache API** | `caches.default.match/put()` | Optional aggressive caching layer before KV. Use for high-traffic scenarios. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **HTTP Worker ↔ KV** | Bindings (read-only) | Fast reads (<10ms). Use `env.KV.get('key', 'json')` for automatic JSON parsing. |
| **Scheduled Worker ↔ KV** | Bindings (read-write) | Writes propagate globally in ~60s (eventual consistency). |
| **Scheduled Worker ↔ Weather API** | HTTP fetch (outbound) | Respect rate limits. Use `Promise.all()` for parallel requests within limit. |
| **Frontend ↔ HTTP Worker** | REST API (HTTP GET /api/coldest) | CORS handled by Worker. Return JSON with Cache-Control headers. |

## Build Order (Dependencies)

Recommended implementation sequence to minimize rework:

### Phase 1: Core Infrastructure (1-2 days)
1. **KV Namespace Setup:** Create KV namespace via Wrangler
2. **Basic HTTP Worker:** Simple `fetch()` handler that reads from KV and returns JSON
3. **Wrangler Config:** Set up bindings, environment variables

**Rationale:** Establishes foundation. Can manually write to KV for testing before cron is ready.

---

### Phase 2: Weather API Integration (1-2 days)
4. **Weather API Client:** Abstract API calls into `src/lib/weather-api.ts`
5. **Rate Limit Logic:** Implement batching and rate limit respect
6. **Coldest Finder Logic:** Algorithm to determine coldest location from batch results

**Rationale:** Build and test API integration independently. Can run manually before scheduling.

---

### Phase 3: Scheduled Updates (1 day)
7. **Scheduled Worker:** Implement `scheduled()` handler
8. **Cron Trigger Config:** Add to `wrangler.jsonc` (e.g., `*/30 * * * *` for every 30 mins)
9. **Error Handling:** Log failures, serve stale data on errors

**Rationale:** Automation layer. Depends on Phases 1-2 being stable.

---

### Phase 4: Frontend (1-2 days)
10. **Static HTML/CSS/JS:** Basic UI to display coldest place
11. **API Integration:** Fetch from `/api/coldest` and render
12. **Cloudflare Pages Deployment:** Deploy via Git integration

**Rationale:** UI depends on backend API being functional. Can develop locally against mock data.

---

### Phase 5: Optimization (1-2 days)
13. **Cache Headers:** Add Cache-Control to HTTP responses
14. **Error States:** Handle 503 gracefully in frontend
15. **Monitoring:** Add logging, consider Analytics Engine

**Rationale:** Polish after core functionality works. These are enhancements, not blockers.

## Cloudflare-Specific Patterns

### Pattern: Bindings over Environment Variables

**What:** Use Wrangler bindings for KV, Secrets, and other resources instead of environment variables.

**Why:** Bindings are type-safe (TypeScript), versioned with deployments, and avoid secret leakage.

**Example:**
```jsonc
// wrangler.jsonc
{
  "name": "coldest-place",
  "main": "src/workers/api.ts",
  "compatibility_date": "2026-02-07",
  "kv_namespaces": [
    { "binding": "COLDEST_PLACE_KV", "id": "your-kv-namespace-id" }
  ],
  "vars": {
    "WEATHER_API_KEY": "your-api-key" // or use secrets: wrangler secret put WEATHER_API_KEY
  },
  "triggers": {
    "crons": ["*/30 * * * *"] // every 30 minutes
  }
}
```

### Pattern: Multi-Environment Configuration

**What:** Use Wrangler environments for dev/staging/prod with separate KV namespaces and cron schedules.

**Example:**
```jsonc
{
  "name": "coldest-place",
  "env": {
    "dev": {
      "kv_namespaces": [{ "binding": "COLDEST_PLACE_KV", "id": "dev-kv-id" }],
      "triggers": { "crons": ["*/60 * * * *"] } // hourly in dev
    },
    "production": {
      "kv_namespaces": [{ "binding": "COLDEST_PLACE_KV", "id": "prod-kv-id" }],
      "triggers": { "crons": ["*/30 * * * *"] } // every 30 mins in prod
    }
  }
}
```

### Pattern: Edge Caching with Cache API

**What:** Add an additional cache layer using Cloudflare's Cache API before KV reads.

**When:** High traffic scenarios where KV read quotas might be a concern (unlikely on free tier, but good practice).

**Example:**
```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cache = caches.default;
    const cacheKey = new Request(request.url, request);
    
    // Try Cache API first (fastest)
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }
    
    // Fall back to KV
    const data = await env.COLDEST_PLACE_KV.get('current', 'json');
    if (!data) {
      return new Response('Data not available', { status: 503 });
    }
    
    response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800'
      }
    });
    
    // Store in Cache API for next request
    await cache.put(cacheKey, response.clone());
    
    return response;
  }
};
```

## Handling API Rate Limits on Free Tier

### Strategy 1: Smart Location Selection

**What:** Instead of fetching weather for all global locations, target a curated list of ~50-100 historically cold locations (e.g., Antarctica, Siberia, Northern Canada, Alaska).

**Why:** Reduces API calls from thousands to dozens. 50 locations × 48 times/day = 2,400 calls/day (well within 1M/month).

**Implementation:**
```typescript
// src/lib/locations.ts
export const COLD_LOCATIONS = [
  { name: "Oymyakon, Russia", lat: 63.4608, lon: 142.7858 },
  { name: "Verkhoyansk, Russia", lat: 67.5444, lon: 133.3914 },
  { name: "Vostok Station, Antarctica", lat: -78.4644, lon: 106.8378 },
  // ... 47 more locations
];
```

### Strategy 2: Adaptive Update Frequency

**What:** Adjust cron frequency based on time of day or season. Update more frequently in winter (when temperatures fluctuate more), less in summer.

**Why:** Saves API calls during low-activity periods. Winter: every 30 mins (48 calls/day). Summer: every 2 hours (12 calls/day).

**Implementation:**
```typescript
// Multiple cron schedules in wrangler.jsonc
{
  "triggers": {
    "crons": [
      "*/30 * * * *", // Every 30 mins (default)
      // Alternatively, use Worker logic to skip calls based on season
    ]
  }
}

// In scheduled handler:
export default {
  async scheduled(controller: ScheduledController, env: Env) {
    const month = new Date().getMonth(); // 0-11
    const isWinter = month >= 10 || month <= 2; // Nov-Feb (Northern Hemisphere)
    
    if (!isWinter && Math.random() > 0.25) {
      // 75% chance to skip in summer (effectively 4x less frequent)
      console.log('Skipping update (summer)');
      return;
    }
    
    // Proceed with weather fetch...
  }
};
```

### Strategy 3: Fallback to Multiple APIs

**What:** Use multiple free weather APIs and round-robin between them.

**Why:** Doubles or triples effective rate limit. OpenWeatherMap (1M/month) + WeatherAPI (1M/month) = 2M/month.

**Implementation:**
```typescript
const APIS = [
  { name: 'openweathermap', key: env.OPENWEATHER_KEY, endpoint: 'https://api.openweathermap.org/...' },
  { name: 'weatherapi', key: env.WEATHERAPI_KEY, endpoint: 'https://api.weatherapi.com/...' }
];

let apiIndex = 0;

async function fetchWeather(lat: number, lon: number) {
  const api = APIS[apiIndex % APIS.length];
  apiIndex++;
  
  // Fetch from selected API...
}
```

## Sources

- **Cloudflare Workers Documentation:** https://developers.cloudflare.com/workers/ (HIGH confidence - official docs)
- **Cloudflare KV Documentation:** https://developers.cloudflare.com/kv/ (HIGH confidence - official docs)
- **Cron Triggers Documentation:** https://developers.cloudflare.com/workers/configuration/cron-triggers/ (HIGH confidence - official docs)
- **Cache API Documentation:** https://developers.cloudflare.com/workers/runtime-apis/cache/ (HIGH confidence - official docs)
- **Cloudflare Pages Documentation:** https://developers.cloudflare.com/pages/ (HIGH confidence - official docs)
- **Weather API Example:** https://developers.cloudflare.com/workers/examples/geolocation-app-weather/ (HIGH confidence - official example)
- **OpenWeatherMap Pricing:** https://openweathermap.org/price (HIGH confidence - official pricing page)

---

*Architecture research for: ColdestPlace - Weather/Temperature Tracking on Cloudflare*
*Researched: 2026-02-07*
