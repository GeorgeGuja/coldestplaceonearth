# ColdestPlace

## What This Is

A daily-visit website that shows the current coldest place on Earth with accurate, real-time temperature data. The site performs a true global search across weather stations worldwide to find the absolute coldest location at any given moment, whether it's in Antarctica, Russia, Africa, or anywhere else. The experience is modern and visual, presenting location details including country, coordinates, and time of reading in an engaging way.

## Core Value

Deliver accurate, reliable temperature data that correctly identifies the coldest place on Earth, served fast through a delightful user experience that makes daily checking enjoyable.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Fetch SYNOP data from NOAA ISD (10,000+ global weather stations)
- [ ] Search ALL weather stations globally with zero filtering to find absolute coldest location
- [ ] Display the coldest location with moderate detail (name, temperature, country, coordinates, time of reading)
- [ ] Display top 5 coldest places (not just the coldest)
- [ ] Update data periodically (every 3-6 hours matching SYNOP observation intervals)
- [ ] Deploy on Cloudflare infrastructure (Pages/Workers)
- [ ] Modern, visual design with clean aesthetics
- [ ] Fast page load and instant display of current data
- [ ] Mobile-responsive layout
- [ ] Optional: Show location on an interactive map

### Out of Scope

- Historical temperature tracking — Focus is on current data only, not trends over time
- Filtering/pre-selecting cold regions — Must check ALL stations to catch unexpected anomalies
- Real-time-on-every-visit updates — Periodic updates (every 3-6 hours) match SYNOP reporting intervals
- Rich immersive animations — Keeping it clean and modern, not overdesigned

## Context

**Use Case**: User visits daily to see where the coldest place on Earth currently is. This scratches a curiosity itch and provides an interesting fact to start the day.

**Target Audience**: Anyone curious about global weather extremes, geography enthusiasts, people who like tracking interesting data points.

**Daily Habit**: The site should be bookmarkable and quick to check, becoming part of someone's daily browsing routine.

**Weather Data Reality**: NOAA ISD provides free access to 10,000+ global SYNOP weather stations including remote research stations (Antarctic bases, Siberian outposts, Arctic stations). This gives us true global coverage with observations updated every 3-6 hours.

**Data Source**: SYNOP (Surface Synoptic Observations) via NOAA's Integrated Surface Database (ISD) - public domain data from the WMO Global Telecommunication System. No API keys required, no rate limits, includes all extreme locations.

**Cloudflare Fit**: Cloudflare's edge network makes this ideal for fast global delivery. Workers can handle API calls and caching, while KV can store the latest coldest location data between updates.

## Constraints

- **Budget**: Free tier only — Cloudflare free plan + NOAA public domain data (no cost)
- **Tech Stack**: JavaScript/TypeScript — Modern web development stack
- **Deployment**: Must run on Cloudflare — Specifically requested platform
- **Data Source**: NOAA ISD SYNOP data — Free, public domain, no API keys or rate limits
- **Data Coverage**: 10,000+ stations including Antarctic research stations, Siberian outposts, Arctic stations
- **Update Frequency**: Every 3-6 hours matching SYNOP observation intervals (00, 03, 06, 09, 12, 15, 18, 21 UTC)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NOAA SYNOP data instead of weather APIs | Public domain, no rate limits, includes 10,000+ stations with full Antarctic/Arctic coverage | — Pending |
| Query ALL stations globally (no filtering) | Must catch unexpected cold anomalies anywhere on Earth, even in Africa | — Pending |
| Updates every 3-6 hours | Matches SYNOP reporting schedule, better than daily, more efficient than hourly | — Pending |
| Cloudflare Workers + KV | Serverless backend with edge caching fits both performance and budget | — Pending |
| Top 5 coldest places | More interesting than single location, adds context | — Pending |

---
*Last updated: 2026-02-08 after SYNOP data source research*
