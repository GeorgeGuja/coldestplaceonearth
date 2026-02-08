# Roadmap: ColdestPlace

**Created:** 2026-02-08
**Status:** Active
**Version:** 1.0

## Overview

This roadmap delivers ColdestPlace in 3 phases, transitioning from local proof-of-concept to production Cloudflare deployment. Each phase builds on the previous, with clear success criteria based on observable user behaviors.

**Critical Path:** Phase 1 (Local MVP) → Phase 2 (Cloudflare Migration) → Phase 3 (Enhanced Features)

## Phase 1: Local MVP - Proof of Concept

**Goal:** Validate METAR/SYNOP data fetching and display works locally before investing in Cloudflare infrastructure

**Duration:** 1 week

**Delivered Value:** Working local application that proves we can fetch NOAA METAR data for ~10,000 global stations, identify the coldest airport/major station on Earth, and display it with clean UX

### Requirements Included

**Data Fetching (6):**
- DATA-01: System can fetch SYNOP/METAR data from NOAA (10,000+ global stations)
- DATA-02: System queries ALL weather stations globally with zero filtering
- DATA-03: System can parse METAR CSV format to extract temperature, location, coordinates, timestamp
- DATA-04: System can identify the absolute coldest location from all station data
- DATA-05: System validates METAR data to prevent parsing errors
- DATA-06: System can detect unexpected cold anomalies anywhere with METAR coverage

**Data Display (5):**
- DISP-01: User can see the current coldest temperature prominently displayed
- DISP-02: User can see the location name and country
- DISP-03: User can see exact coordinates (latitude/longitude)
- DISP-04: User can see timestamp showing when data was collected
- DISP-05: User can see top 5 coldest places (not just the coldest)

**User Experience (5):**
- UX-01: Site is mobile responsive (works on phones and tablets)
- UX-02: Site has clean, minimal layout for fast scanning
- UX-03: Site loads in under 2 seconds
- UX-04: Site handles errors gracefully ("data unavailable" states)
- UX-05: Site works locally without Cloudflare deployment

**Technical Foundation (4):**
- TECH-01: Weather data updates can be triggered manually (proof of concept)
- TECH-02: Data is cached locally to avoid repeated API calls during testing
- TECH-03: System logs API usage to track free tier limits
- TECH-04: Code is structured to easily migrate to Cloudflare Workers later

### Success Criteria

Users can observe:

1. **Global discovery works:** When manually triggering update, system downloads NOAA METAR CSV cache (one file with ~10,000 stations), parses all temperatures, and correctly identifies coldest station globally - not pre-filtered by region

2. **Accuracy and credibility:** Display shows temperature, location name, country, exact coordinates, and observation timestamp within 2 seconds on both desktop and mobile, with all data fields populated and readable

3. **Resilience:** When NOAA FTP is unavailable or returns invalid data, site displays graceful "Data temporarily unavailable - last updated [timestamp]" message with cached previous result

4. **Mobile experience:** Site is fully usable on 375px mobile viewport with no horizontal scrolling, readable text, and tappable elements

5. **Development velocity:** Engineer can trigger manual data refresh via npm script, see updated results within 10 seconds (download + parse + display), with clear console logs showing station count processed

### Key Deliverables

- Local Node.js application with NOAA METAR CSV parsing
- Script to download `https://aviationweather.gov/data/cache/metars.cache.csv.gz`
- CSV parser extracting temp, station ID, lat/lon, timestamp
- Algorithm to find minimum temperature from all stations
- Station metadata lookup (convert ICAO code to location name/country)
- HTML/CSS interface displaying coldest location + top 5
- Local file-based cache (JSON)
- Mobile-responsive layout
- Error handling with fallback to cached data
- README with setup instructions

## Phase 2: Cloudflare Migration - Production Infrastructure

**Goal:** Migrate validated local MVP to Cloudflare infrastructure with automated updates and global edge delivery

**Duration:** 1-2 weeks

**Delivered Value:** Production-ready website on coldestplace.com with automatic hourly updates, global <50ms response times, and zero hosting costs

### Requirements Included

**Infrastructure (6):**
- INFRA-01: Deploy frontend to Cloudflare Pages
- INFRA-02: Deploy backend to Cloudflare Workers
- INFRA-03: Implement Cloudflare KV for data storage
- INFRA-04: Set up scheduled cron jobs for automatic updates (every 1-3 hours matching METAR update frequency)
- INFRA-05: Implement edge caching with proper Cache-Control headers
- INFRA-06: Set up monitoring for NOAA FTP availability and Worker execution

### Success Criteria

Users can observe:

1. **Automatic freshness:** Visiting site shows "Last updated X minutes ago" timestamp that updates every hour without manual intervention, proving cron jobs work

2. **Global performance:** Users in US, Europe, and Asia all experience <2 second page load times (measure via WebPageTest from 3 continents), proving edge caching works

3. **Reliability:** Site remains available 24/7 for 1 week with no downtime or "data unavailable" messages, proving infrastructure stability

4. **Live domain:** Users can access site at coldestplace.com (or similar) via HTTPS, proving successful Cloudflare Pages deployment

5. **Operational visibility:** Admin dashboard (Cloudflare Analytics) shows hourly Worker executions completing successfully, proving cron jobs and NOAA FTP access work reliably

### Key Deliverables

- Astro site deployed to Cloudflare Pages
- Cloudflare Worker with METAR CSV download and parsing logic
- Scheduled Worker with cron triggers (every 1-3 hours)
- KV namespace with versioned data model (current + previous for rollback)
- Cache API integration for aggressive caching
- Workers Analytics setup
- NOAA FTP availability monitoring
- Custom domain configuration
- Deployment documentation

## Phase 3: Enhanced Experience - Competitive Differentiators

**Goal:** Add features that transform raw data into engaging daily experience and differentiate from generic weather sites

**Duration:** 1-2 weeks

**Delivered Value:** Rich context (visual comparisons, photos, weather conditions) that makes daily checking compelling and shareable

### Requirements Included

**Enhanced Features (6):**
- ENH-01: Add temperature unit toggle (°C/°F)
- ENH-02: Add visual temperature context ("Cold enough to freeze boiling water")
- ENH-03: Add historical context ("Average winter temp here: -45°C")
- ENH-04: Add location photos/imagery
- ENH-05: Add weather conditions beyond temp ("Clear skies" or "Blizzard")
- ENH-06: Add sunrise/sunset times for context

### Success Criteria

Users can observe:

1. **Intuitive comparisons:** Display shows relatable context like "3x colder than your freezer" or "Cold enough to instantly freeze boiling water mid-air" that helps non-technical users grasp extreme temperatures

2. **Visual richness:** Each location includes high-quality photo showing the landscape/environment, transforming data table into immersive experience

3. **Weather storytelling:** Beyond temperature, see "Clear skies, -67°C" or "Blizzard, -54°C, currently in polar night (24h darkness)" providing narrative context

4. **Historical perspective:** Display shows "Record low: -89.2°C (1983)" and "Average January: -45°C" allowing users to understand if current reading is typical or extreme

5. **Unit flexibility:** Users can toggle between °C/°F with preference persisting across visits (localStorage), serving both metric and imperial audiences

### Key Deliverables

- Temperature unit toggle with client-side state persistence
- Visual context library (freezer comparisons, water freezing points)
- Location photo integration (curated static assets or Unsplash API)
- Weather conditions display with icons
- Historical data integration (averages, records)
- Sunrise/sunset times with polar night detection
- Enhanced KV data model (top 5 locations, extended metadata)
- Social share metadata (Open Graph tags)

## Post-V1: Future Enhancements

Not committed for v1, consider based on user feedback and metrics:

### Advanced Features (from v2 requirements)
- **ADV-01:** Interactive map showing coldest location
- **ADV-02:** Shareable graphics for social media
- **ADV-03:** "Compare to your city" feature with location detection
- **ADV-04:** Streak counter for daily visits
- **ADV-05:** Historical temperature tracking over time

### Triggers for consideration:
- **Map feature:** If >30% of users click on coordinates trying to see location
- **Social graphics:** If organic sharing (via URL shares) exceeds 5% of visitors
- **Comparison feature:** If user feedback explicitly requests city comparison
- **Streak counter:** If return visitor rate exceeds 40% (indicates habit formation)
- **Historical tracking:** If users explicitly ask "what was it yesterday?" in feedback

## Risk Management

### Phase 1 Risks
- **METAR coverage limited to airports/major stations:** Will miss small remote towns without aviation weather
  - **Mitigation:** Be transparent in UI: "Coldest airport/major station on Earth" rather than claiming every location
  - **Acceptance:** Antarctic research stations, Siberian airports, Arctic stations ARE covered - these are the actual coldest places

- **NOAA FTP availability:** Government FTP could have outages or slow response times
  - **Mitigation:** Implement retry logic, fallback to cached data, set reasonable timeouts
  - **Fallback:** Display last successful update with timestamp

### Phase 2 Risks
- **KV eventual consistency:** 60s propagation delay across global edge
  - **Mitigation:** METAR updates hourly so 60s delay is acceptable, use cacheTtl of 60s minimum
  - **Impact:** Low - hourly updates mask consistency delays

- **Cron trigger limits (5 per account):** Cloudflare free tier restriction
  - **Mitigation:** Single cron job downloads entire CSV once per hour (one trigger used)
  - **Fallback:** GitHub Actions as external cron if needed

- **Worker CPU time limits:** 10ms on free tier, 50ms on paid
  - **Mitigation:** Parsing 10,000 CSV rows should complete under 10ms, test during Phase 1
  - **Fallback:** Upgrade to Workers Paid ($5/mo) if needed

### Phase 3 Risks
- **Historical data not in METAR:** METAR is current observations only
  - **Mitigation:** Historical records require separate data source (GHCN-Daily or manual curation)
  - **Fallback:** Show only "Record low: -89.2°C (1983)" from static data, don't claim real-time historical tracking

- **Location photo licensing:** Unsplash API has rate limits
  - **Mitigation:** Start with 20-30 curated static photos for common cold locations
  - **Fallback:** Creative Commons imagery with manual curation

## Dependencies

### External Dependencies
- **NOAA METAR data:** Public domain, no API keys, FTP access at `https://aviationweather.gov/data/cache/`
- **Cloudflare free tier:** Workers (100K requests/day), KV (1K writes/day), Pages (unlimited)
- **Domain registration:** For production deployment (Phase 2)

### Inter-Phase Dependencies
- **Phase 2 requires Phase 1 complete:** Cannot deploy to Cloudflare until local METAR parsing validated and working
- **Phase 3 requires Phase 2 complete:** Enhanced features need production infrastructure and real traffic data
- **Phase 3 historical context:** Requires separate research for historical records (GHCN-Daily or manual curation)

### Technical Dependencies
- Node.js 20+ (local development)
- Wrangler CLI 3.x+ (Cloudflare deployments)
- Git (version control)
- npm/pnpm (package management)

## Success Metrics

### Phase 1 Success Gate
Must achieve before proceeding to Phase 2:
- [ ] Successfully download and parse NOAA METAR CSV cache (~10,000 stations) in <10 seconds
- [ ] Top 5 coldest list shows accurate stations with valid coordinates and timestamps
- [ ] Site loads in <2s on throttled 3G connection
- [ ] Zero crashes or blank screens during 100 manual refresh cycles
- [ ] Code review confirms clean separation suitable for Worker migration (fetch/parse/display decoupled)

### Phase 2 Success Gate
Must achieve before proceeding to Phase 3:
- [ ] 99.9% uptime over 1 week (max 1 minute downtime)
- [ ] <50ms p95 response time from KV reads
- [ ] Cron jobs execute successfully 24 times in 24 hours with zero failures
- [ ] NOAA FTP downloads complete successfully >95% of attempts
- [ ] Alerts configured for Worker execution failures

### Phase 3 Success Gate
Defines v1 launch readiness:
- [ ] All 6 enhanced features deployed and functional
- [ ] Page load remains <2s with photos and enhanced content
- [ ] Mobile experience tested on iOS and Android devices
- [ ] Social share preview working (test via Twitter/Slack)
- [ ] Documentation complete (README, deployment guide, data source attribution)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-08 | Initial roadmap created from requirements and research |
| 1.1 | 2026-02-08 | Updated to use NOAA METAR/SYNOP data source after validation research |

---

*This roadmap covers all 19 v1 requirements across 3 phases. V2 requirements (INFRA-01 through ADV-05) partially included where they support v1 goals. See REQUIREMENTS.md traceability table for complete mapping.*
