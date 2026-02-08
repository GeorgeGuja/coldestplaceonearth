# ColdestPlace

## What This Is

A daily-visit website that shows the current coldest place on Earth with accurate, real-time temperature data. The site performs a true global search across weather stations worldwide to find the absolute coldest location at any given moment, whether it's in Antarctica, Russia, Africa, or anywhere else. The experience is modern and visual, presenting location details including country, coordinates, and time of reading in an engaging way.

## Core Value

Deliver accurate, reliable temperature data that correctly identifies the coldest place on Earth, served fast through a delightful user experience that makes daily checking enjoyable.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Fetch real-time temperature data from a weather API
- [ ] Search globally across weather stations to find the absolute coldest location
- [ ] Display the coldest location with moderate detail (name, temperature, country, coordinates, time of reading)
- [ ] Update data periodically (hourly or daily) via scheduled job
- [ ] Deploy on Cloudflare infrastructure (Pages/Workers)
- [ ] Modern, visual design with clean aesthetics
- [ ] Fast page load and instant display of current data
- [ ] Mobile-responsive layout
- [ ] Optional: Show location on an interactive map

### Out of Scope

- Historical temperature tracking — Focus is on current data only, not trends over time
- Manual weather station feeds — Using established weather APIs for reliability
- Real-time-on-every-visit updates — Periodic updates are sufficient and more efficient
- Rich immersive animations — Keeping it clean and modern, not overdesigned
- Multiple location comparisons — Single coldest place is the core feature

## Context

**Use Case**: User visits daily to see where the coldest place on Earth currently is. This scratches a curiosity itch and provides an interesting fact to start the day.

**Target Audience**: Anyone curious about global weather extremes, geography enthusiasts, people who like tracking interesting data points.

**Daily Habit**: The site should be bookmarkable and quick to check, becoming part of someone's daily browsing routine.

**Weather Data Reality**: Most free-tier weather APIs have good global coverage but may not include remote research stations (like Antarctic bases). The definition of "coldest place" will be constrained by available data sources.

**Cloudflare Fit**: Cloudflare's edge network makes this ideal for fast global delivery. Workers can handle API calls and caching, while KV can store the latest coldest location data between updates.

## Constraints

- **Budget**: Free tier only — Cloudflare free plan + free weather API tier
- **Tech Stack**: JavaScript/TypeScript — Modern web development stack
- **Deployment**: Must run on Cloudflare — Specifically requested platform
- **API Limits**: Work within free tier API rate limits — May need caching strategy
- **Data Coverage**: Limited to what free weather APIs provide — May not include all Antarctic research stations
- **Update Frequency**: Hourly or daily updates acceptable — Not real-time on every visit

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Free tier budget constraint | Keeps hosting costs at zero, forces creative solutions | — Pending |
| Periodic updates vs real-time | Better API usage, faster page loads, still meets daily-check use case | — Pending |
| Cloudflare Workers + KV | Serverless backend with edge caching fits both performance and budget | — Pending |
| Global search approach | True global coverage aligns with "who knows where" curiosity aspect | — Pending |

---
*Last updated: 2026-02-07 after initialization*
