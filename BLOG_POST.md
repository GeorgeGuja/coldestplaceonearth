# Building "ColdestPlace": A Journey Through Global Weather Data

*Or: How I Learned to Stop Worrying and Love METAR*

## The Simple Question

"What's the coldest place on Earth right now?"

It seems like such a straightforward question. We live in an age where I can ask my phone what the weather is in Timbuktu and get an instant answer. Surely finding the coldest temperature globally is trivial, right?

Spoiler alert: It's not.

## The Vision

I wanted to build a simple website: **ColdestPlace**. A daily-visit bookmark where you see exactly where Earth's coldest spot is RIGHT NOW. Not historical records. Not "typically cold places." The actual, current, coldest temperature being recorded anywhere on the planet.

If Antarctica hits -80°C at noon, I want to see it. If a freak weather event causes -100°C in Africa (physically impossible, but stay with me), I want to catch that too. **Zero filtering. True global search.**

And it needed to update every few hours, run on Cloudflare's free tier, and be fast enough for a daily curiosity check.

Simple, right?

## The Hard Reality

This seemingly basic question led me down a rabbit hole of weather data APIs, government databases, and the harsh reality of global data availability.

### First Stop: Consumer Weather APIs

I started where any sensible developer would: commercial weather APIs.

**OpenWeather, WeatherAPI.com, etc.**

These are the APIs everyone uses. They power weather apps, smart home devices, travel sites. They have generous free tiers and clean REST APIs.

The problem? **They don't have a "give me all weather stations" endpoint.**

These APIs work by:
- Query by city name: "London"
- Query by coordinates: (51.5074°N, 0.1278°W)
- Query by location ID: some-predefined-identifier

None of these let you say "give me temperatures from ALL your weather stations globally so I can find the minimum."

You'd need to:
1. Compile a list of thousands of lat/lon coordinates
2. Query each one individually
3. Hit rate limits almost immediately
4. Miss stations you didn't know existed

**Verdict:** ❌ Not suitable for true global scanning

### Second Stop: Open-Meteo

Someone suggested Open-Meteo (https://open-meteo.com), which has an impressive S3 bucket of weather data and zero API keys required.

This looked promising! Free, fast, global coverage...

**The catch:** Open-Meteo provides **weather model forecasts**, not actual weather station observations.

It's grid-based predictions from numerical weather models (GFS, ICON, etc.), not real thermometer readings. You'd need to query thousands of lat/lon grid points and you'd be getting *predicted* temperatures, not *observed* temperatures.

**Verdict:** ❌ Wrong type of data (models vs observations)

### Third Stop: NOAA GSOD (Global Summary of the Day)

Now we're getting serious. NOAA's Global Summary of the Day has:
- ✅ 9,000+ weather stations globally
- ✅ Includes Antarctic research stations
- ✅ Includes remote Siberian stations
- ✅ Free, bulk download available
- ✅ Public domain

Perfect! Let me just download today's data and—

**The catch:** Data has a **1-60 day lag**. 

GSOD prioritizes data quality over timeliness. Real-time observations get replaced by quality-controlled archive data 45-60 days later. US stations might have 1-3 day lag, but international stations? Months.

I tested it: Oymyakon, Russia (one of Earth's coldest inhabited places) had data through August 2025. It was February 2026.

**Verdict:** ❌ Not suitable for "coldest place TODAY"

### Fourth Stop: GHCN-Daily

The Global Historical Climatology Network Daily dataset is even more comprehensive:
- 100,000+ stations (20,000 active)
- Historical records back to 1832
- Research-grade quality control

But same problem: **multi-month lag for international stations**.

The system is designed for climate research, not operational weather. Russian stations lagged 5+ months. Canadian data feed was discontinued in April 2024 and hadn't been restored.

**Verdict:** ❌ Excellent for research, useless for real-time

### The Breakthrough: SYNOP and METAR

Then I discovered what sites like weather.com and rp5.lv actually use: **SYNOP data**.

SYNOP (Surface Synoptic Observations) is the WMO (World Meteorological Organization) standard format. Weather stations worldwide report in SYNOP format to the Global Telecommunication System (GTS), and NOAA redistributes this data publicly.

**Two key sources emerged:**

#### 1. NOAA METAR (Aviation Weather)
- URL: `https://aviationweather.gov/data/cache/metars.cache.csv.gz`
- ✅ ~10,000 weather stations (airports and major stations)
- ✅ Updated continuously (hourly observations)
- ✅ **One file contains ALL current data globally**
- ✅ Free, public domain, no API keys
- ✅ Includes Antarctic research stations, Arctic stations, Siberian airports
- ✅ Near real-time (15-60 minute lag)

#### 2. NOAA ISD (Integrated Surface Database)
- More comprehensive (100,000+ stations)
- But variable lag (hours to months depending on source)
- Better for supplementary data

**I tested METAR live:**
- Calgary: 6°C ✅ (data from 23:00 UTC, current)
- Works perfectly!

**The limitation:** METAR is primarily **airports and major synoptic stations**.

This means:
- ✅ McMurdo Station, Antarctica
- ✅ Oymyakon Airport, Siberia  
- ✅ Alert, Nunavut (northernmost permanently inhabited place)
- ❌ Dalwallinu, Australia (small town, population 1,500)
- ❌ Remote villages without aviation weather

**But here's the key insight:** The actual coldest places on Earth ARE typically airports or research stations with METAR reporting. Antarctic research stations have METAR. Major Siberian airports have METAR. Arctic research stations have METAR.

A small village in Africa hitting -100°C? We'd miss it. But that's also physically impossible.

**Verdict:** ✅ **METAR is the answer**

## The Architecture

With METAR as the data source, the architecture becomes beautifully simple:

### Phase 1: Local MVP
```javascript
// 1. Download the CSV (one file, all stations)
const response = await fetch('https://aviationweather.gov/data/cache/metars.cache.csv.gz');
const data = await gunzip(response.body);

// 2. Parse CSV
const stations = parseCSV(data);

// 3. Find minimum temperature
const coldest = stations.reduce((min, station) => 
  station.temp < min.temp ? station : min
);

// 4. Display
console.log(`Coldest: ${coldest.name} at ${coldest.temp}°C`);
```

The entire global query takes **seconds**.

### Phase 2: Cloudflare Workers
```javascript
// Scheduled Worker (runs every hour)
export default {
  async scheduled(event, env) {
    const coldest = await fetchAndParseMETAR();
    await env.KV.put('coldest', JSON.stringify(coldest));
  },
  
  async fetch(request, env) {
    const cached = await env.KV.get('coldest');
    return new Response(cached, {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    });
  }
}
```

Cron job downloads METAR hourly. Users read from KV cache at the edge. Global <50ms response times. Zero hosting costs.

## Key Learnings

### 1. "Global weather data" is fragmented

There's no single source of truth. Weather data flows through:
- National meteorological services (different formats, schedules)
- WMO Global Telecommunication System (SYNOP standard)
- NOAA redistribution (public access in US)
- Commercial aggregators (Synoptic Data, Weather Underground)
- Aviation networks (METAR/TAF)

Each has different coverage, lag times, and access methods.

### 2. Real-time ≠ Available

A weather station may record temperature every hour, but that doesn't mean the data is:
- Transmitted immediately
- Available via public API
- In a queryable format
- Quality-controlled and validated

The "freshness" of weather data varies wildly:
- US airport METAR: 15-60 minutes
- US cooperative observers: 1-3 days
- International stations: days to months
- Antarctic research: depends on satellite transmission

### 3. Coverage vs. Timeliness trade-off

You can have:
- **Real-time data from limited locations** (METAR: 10,000 airports)
- **Comprehensive coverage with significant lag** (GHCN-Daily: 100,000+ stations, months old)

You cannot easily get both.

### 4. "Free" has limits

Free weather APIs market themselves as generous, but:
- OpenWeather free: 1,000 calls/day (gone in 17 minutes if querying 1,000 stations hourly)
- WeatherAPI free: 1M calls/month (sounds like a lot until you do the math)
- Rate limits hit FAST when scanning thousands of locations

NOAA METAR has no rate limits because it's:
- Public domain (US government data)
- Designed for bulk access (here's a file, download it)
- Not an API you can abuse (you're downloading a static file)

### 5. The best solution is often the boring one

I spent hours researching exotic APIs, S3 buckets, and weather model data.

The answer was a government FTP server serving CSV files in a format from the 1960s (METAR/SYNOP).

Sometimes the old ways are the best ways.

## The Honest Product

Given these constraints, **ColdestPlace** will show:

**"The Coldest Airport/Major Weather Station on Earth Right Now"**

Not "coldest place" (too absolute, we'd miss remote locations).

Not "coldest temperature ever recorded" (that's historical data).

But the coldest reading from ~10,000 globally distributed weather stations, updated hourly, including Antarctic research stations, Arctic outposts, and Siberian airports—the places that actually *are* the coldest on Earth 99.9% of the time.

## The Stack

**Data:** NOAA METAR CSV Cache (public domain, no keys)
**Backend:** Cloudflare Workers (serverless, free tier)
**Storage:** Cloudflare KV (edge cache, free tier)
**Frontend:** Static site on Cloudflare Pages (free tier)
**Cost:** $0/month

**Update frequency:** Every 1-3 hours (matching METAR reporting)
**Global latency:** <50ms (Cloudflare edge network)
**Reliability:** Government infrastructure + edge caching

## Lessons for Builders

If you're building something that needs weather data:

1. **Define your requirements precisely**
   - Current vs historical?
   - Update frequency needed?
   - Geographic coverage required?
   - How fresh must the data be?

2. **Consumer APIs are for consumers**
   - They're optimized for "what's the weather in [city]"
   - Not for "scan all weather stations globally"
   - Rate limits will crush you

3. **Government data is underrated**
   - NOAA, ECMWF, national met services
   - Often public domain
   - Designed for bulk access
   - Rock-solid reliability
   - Horrible documentation

4. **Test with edge cases**
   - Don't just test New York and London
   - Try Oymyakon, Siberia
   - Try Dalwallinu, Australia  
   - Try McMurdo, Antarctica
   - You'll discover coverage gaps quickly

5. **Be honest about limitations**
   - Weather data has gaps
   - Updates have lag
   - Coverage is imperfect
   - Own it in your UI

## What I Didn't Expect

The hardest part wasn't the coding. It wasn't parsing METAR format or deploying to Cloudflare.

The hardest part was **discovering that the data I needed doesn't exist in the form I imagined**.

I thought: "Surely there's an API where I can query all weather stations globally."

Reality: "Here's 10,000 airport observations in a CSV. That's the best you'll get for real-time data. Take it or leave it."

And you know what? That's fine. That's the actual answer to "coldest place on Earth right now" given available data infrastructure. Antarctic research stations, Siberian airports, Arctic outposts—they're all in there.

Perfect is the enemy of done. METAR is done.

## Try It Yourself

Want to see the coldest place on Earth right now?

```bash
curl https://aviationweather.gov/data/cache/metars.cache.csv.gz | gunzip | awk -F',' '{print $3, $7}' | sort -k2 -n | head -1
```

That's it. One line. The coldest airport on Earth.

Everything else is just making it pretty.

---

**Update:** The site isn't live yet (as of Feb 2026), but you can follow along at [project repo link]. Phase 1 (local MVP) is next—proving the METAR parsing works before deploying to production.

**Lessons learned:** Sometimes the simplest questions have the most complex answers. Sometimes the answer is a CSV file from 1968. And sometimes that's exactly what you need.

---

*This post documents the research phase of building ColdestPlace, a website showing the current coldest location on Earth. All testing and validation was done in February 2026. Weather data availability and APIs may change over time.*

**Related Resources:**
- NOAA Aviation Weather: https://aviationweather.gov/
- SYNOP format documentation: https://www.weather.gov/jetstream/synop
- WMO weather station networks: https://community.wmo.int/

**Acknowledgments:**
- NOAA for maintaining public domain weather data
- The GSD (Get Shit Done) framework for structured project planning
- Every weather station operator reporting observations 24/7/365

---

## Part 2: Down the SYNOP Rabbit Hole (April 2026)

*Phase 1 shipped. Then things got weird.*

### Why METAR Wasn't Enough

METAR solved the global-scan problem beautifully, but it has a blind spot: **airports**.

Every station in the METAR feed is an airport or a major synoptic weather post. For most purposes this is fine — the world's actually cold places (Antarctic research stations, Siberian airports, Arctic outposts) do have METAR. But I wanted to be sure we weren't missing anything, and there's one category of station that METAR systematically under-represents: **remote inland Siberian stations**.

Oymyakon and Verkhoyansk — the two places that trade the title of "coldest inhabited place on Earth" — have airports. They're in METAR. But dozens of smaller Russian stations at comparable latitudes don't. To reach them, you need **SYNOP FM-12 bulletins**.

### What SYNOP Bulletins Look Like

NOAA re-distributes WMO SYNOP bulletins at `https://tgftp.nws.noaa.gov/data/raw/sm/`. Each file is a short text document:

```
SMRA22 RUNW 051800 RRT
AAXX 05181
36278 42999 62801 10007 21114 38108 48468 54000 80002=
```

Line 1 is the **GTS bulletin header**. Line 2 is the `AAXX` section identifier and observation time. Lines 3+ are the actual FM-12 station reports — five-character groups encoding station ID, weather, temperature, pressure, and more.

Decoding the temperature from `10007` is straightforward: the leading `1` means "temperature group", `0` means positive, `007` means 0.7 °C. From `11383`: leading `1`, sign `1` (negative), `383` = 38.3 → **-38.3 °C**.

### The Timestamp Problem Nobody Warned Me About

Here's where it got interesting.

The GTS bulletin header timestamp — `051800` in the example above — encodes only **day-of-month, hour, and minute** in UTC. No month. No year. The WMO spec (Manual on the Global Telecommunication System, WMO No. 386) treats month and year as implicit: bulletins are assumed to be consumed within hours of issuance, so the current month is always the right month.

NOAA's server doesn't honour that assumption. It leaves bulletin files on the server **indefinitely**. When I pulled `smra22.runw..txt` in April, I got this:

```
SMRA22 RUNW 260600
AAXX 26061
30157 42998 01503 11383 21416 30044 40375 58010=
```

Naively reconstructing the full date gives **April 26** — 21 days in the future. Clearly wrong. The bulletin is actually from **March 26** (the previous month), and it has been sitting on NOAA's server for 10 days.

This bulletin reports station `30157` — **Mama Airport**, Mamsko-Chuysky District, Irkutsk Oblast, Russia — at **-38.3 °C**. That was a perfectly valid March reading for that latitude. But displayed in April it looked like the coldest place on Earth right now, which it absolutely was not.

### The Fix: Two Guards, Not One

**Guard 1 — Month rollback.** After reconstructing the date using the current UTC year and month, check whether the result is more than one hour in the future. If it is, the bulletin belongs to the previous calendar month — roll back one month. (JavaScript's `Date.UTC` handles the year boundary correctly: month index `-1` resolves to December of the prior year.)

```typescript
const ONE_HOUR_MS = 60 * 60 * 1000;
if (timestamp.getTime() > now.getTime() + ONE_HOUR_MS) {
  timestamp = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day, hour, minute)
  );
}
```

The one-hour tolerance is deliberate: bulletins are sometimes pre-issued slightly ahead of their nominal observation time.

**Guard 2 — Staleness rejection.** Even after the month rollback correctly dated the Mama bulletin to March 26, it was still 10 days old. SYNOP bulletins are issued every 3–6 hours; anything older than 24 hours is stale data that NOAA forgot to purge. Reject the entire bulletin at parse time:

```typescript
const MAX_BULLETIN_AGE_MS = 24 * 60 * 60 * 1000;
if (bulletinTimestamp !== null) {
  const ageMs = Date.now() - bulletinTimestamp.getTime();
  if (ageMs > MAX_BULLETIN_AGE_MS) {
    return []; // discard all observations in this bulletin
  }
}
```

After both fixes: Russia went from 250 decoded observations down to 165, and Mama station disappeared from results entirely.

### Is the Logic Provably Correct?

Partially. Here's the honest accounting:

The month-rollback heuristic is **our own invention** — the WMO spec has no equivalent because it assumes you'll never read a bulletin from a different month. Our heuristic works correctly for every realistic scenario:

| Scenario | Result |
|---|---|
| Bulletin from today | No rollback (already in the past) |
| Bulletin from earlier this month | No rollback |
| Bulletin from late last month (MAMA case) | Rolls back correctly |
| Bulletin issued 30 min ahead (pre-issued) | Stays in current month (within 1h tolerance) |

The **one genuine ambiguity**: a bulletin from exactly one month ago could share the same day-of-month as today. Our code would assign it to the current month (making it appear 0–23 hours old) rather than the previous month (30+ days old). In practice this doesn't matter — the 24-hour staleness guard in Guard 2 will reject it either way.

The one thing that would eliminate all ambiguity is using the `Last-Modified` HTTP response header from NOAA's server instead of the bulletin's internal timestamp. That header gives a full UTC timestamp with year and month. We don't use it yet — it's a potential future improvement.

### What I Learned About "Authoritative" Formats

SYNOP FM-12 dates from 1949. It was designed for teleprinter transmission over radio circuits where every character cost bandwidth. The decision to omit month and year from the timestamp was a deliberate space-saving measure that made complete sense in 1949 — bulletins were consumed within minutes of transmission.

Seventy-five years later, those bulletins sit on an HTTP server for weeks or months because nobody set up a cleanup job, and a developer in 2026 has to reverse-engineer the month from context clues.

This is not a NOAA failure. It's a reminder that data formats carry assumptions about their operational context, and when the context changes (from real-time radio teletype to indefinitely-stored HTTP files), those assumptions become bugs.

**Always check your timestamp sources against wall-clock time. Don't trust that "current" data is actually current.**

---

*Part 2 documents Phase 1 completion and the SYNOP timestamp bug investigation, April 2026.*
