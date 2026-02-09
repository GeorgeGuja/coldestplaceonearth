# Getting Started with ColdestPlace

**Project Status:** ✅ Initialized and ready to build

## Quick Summary

Build a website showing the coldest place on Earth RIGHT NOW using NOAA METAR data from ~10,000 global weather stations.

## Data Source (VALIDATED ✅)

**NOAA Aviation Weather METAR Cache:**
- URL: `https://aviationweather.gov/data/cache/metars.cache.csv.gz`
- One file with ALL current temperatures globally (~10,000 stations)
- Updated continuously (hourly observations)
- Free, public domain, no API keys
- **Tested and working** (Calgary: 6°C as of Feb 8, 2026 23:00 UTC)

## Coverage

✅ **Covers actual coldest places:**
- Antarctic research stations (McMurdo, South Pole, Vostok, etc.)
- Siberian airports (Oymyakon region, Verkhoyansk, etc.)
- Arctic stations
- High altitude locations
- ~10,000 airports/major stations globally

❌ **Does NOT cover:**
- Small remote towns without airports (like Dalwallinu, Australia)
- Villages 100km+ from any weather station

**This is acceptable** - the actual coldest places ARE in the covered network.

## Phase 1: Local MVP (1 week)

**Goal:** Prove the concept works locally before deploying to Cloudflare

**Build:**
1. Script to download METAR CSV cache
2. Parser to extract: temp, station ID, lat/lon, timestamp
3. Algorithm to find minimum temperature
4. Display coldest location + top 5
5. Mobile-responsive HTML/CSS
6. Error handling (fallback to cached data)

**Tech Stack:**
- Node.js 20+
- TypeScript (optional)
- CSV parsing library
- Simple HTML/CSS (or framework of choice)

**Key files to read:**
- `.planning/PROJECT.md` - Project context and decisions
- `.planning/REQUIREMENTS.md` - All requirements with traceability
- `.planning/ROADMAP.md` - 3-phase roadmap
- `.planning/research/` - Data source research findings

## Next Steps

### Option 1: Discuss Phase 1 First
```bash
/clear
/gsd:discuss-phase 1
```
This will help you understand Phase 1 approach and answer questions before coding.

### Option 2: Plan Phase 1 Directly
```bash
/clear
/gsd:plan-phase 1
```
This will create detailed execution plans for Phase 1.

### Option 3: Start Coding Manually
```bash
mkdir coldestplace
cd coldestplace
npm init -y
npm install node-fetch csv-parse zod
```

Then create a script that:
1. Downloads `https://aviationweather.gov/data/cache/metars.cache.csv.gz`
2. Decompresses and parses CSV
3. Finds row with minimum temperature
4. Displays result

## Critical Constraints

🔥 **Query ALL stations with ZERO filtering** - Don't pre-filter by cold regions. If Africa suddenly hits -100°C, we need to catch it.

🔥 **Be honest about coverage** - UI should say "Coldest airport/major station on Earth" not "coldest place" (since we miss small remote towns)

🔥 **No API keys needed** - NOAA data is public domain

## Success Criteria for Phase 1

- [ ] Download + parse + display in <10 seconds
- [ ] Shows top 5 coldest locations with coordinates and timestamps
- [ ] Mobile responsive (works on 375px viewport)
- [ ] Graceful error handling when NOAA FTP unavailable
- [ ] Code structured for easy Cloudflare Workers migration

## Resources

- **NOAA METAR Cache:** https://aviationweather.gov/data/cache/
- **Station List:** https://aviationweather.gov/data/cache/stations.cache.json.gz
- **Project Docs:** `.planning/` directory

---

**Total Timeline:** 3-4 weeks
- Phase 1 (Local MVP): 1 week
- Phase 2 (Cloudflare Deploy): 1-2 weeks  
- Phase 3 (Enhanced Features): 1-2 weeks

Good luck! 🥶
