# Phase 4: Interactive Map — Context

**Gathered:** 2026-04-06
**Status:** Ready for planning
**Source:** User discussion (gsd-discuss-phase equivalent)

<domain>
## Phase Boundary

Add an interactive Leaflet.js map below the top-5 list that pins all displayed coldest
locations (6 pins: coldest hero + top 5), with popups and a card scroll-highlight
interaction. Pure frontend change — no backend modifications required.

**In scope:**
- Leaflet.js map rendered in `public/index.html` and driven by `public/app.js`
- 6 pins total: coldest hero (distinct visual) + each top-5 entry
- Popup on pin click: station name, temperature, source badge
- Pin click scrolls corresponding `.place-card` into view and briefly highlights it
- Map auto-fits bounds to all rendered pins
- Mobile-responsive map (375px viewport)
- Dark theme tile treatment to match existing site aesthetic

**Out of scope:**
- Server-side changes
- All-stations heat map / dot cloud (future)
- Custom tile hosting
- Any API key / account requirement

</domain>

<decisions>
## Implementation Decisions

### Map library
- **LOCKED:** Leaflet.js via CDN
- No API key, no rate limits, open source, tiles from OpenStreetMap
- Load via `<link>` + `<script>` CDN tags in `index.html` — no bundler step

### Pins shown
- **LOCKED:** Top 5 + coldest hero = 6 pins total
- Hero pin uses a visually distinct marker (cyan/blue to match `--accent-cold`)
- Remaining 5 pins use the default Leaflet marker, slightly smaller

### Map placement
- **LOCKED:** Below `.top5-section`, above `.stats`

### Pin interaction
- **LOCKED:** Click scrolls to the corresponding `.place-card` and adds a
  `place-card--highlighted` CSS class for 1.5 seconds
- Popup shows: station name, temperature (°C + °F), source badge HTML, station ID

### Graceful degradation
- **LOCKED:** Stations with `latitude === 0 && longitude === 0` are silently
  skipped — map renders remaining valid pins without error

### Tile provider
- **Agent's discretion:** Use OpenStreetMap default tiles. Consider a dark/muted
  tile provider (e.g. CartoDB Dark Matter, no key required) to match the site's
  dark colour scheme. Prefer no-API-key options only.

### Map height / sizing
- **Agent's discretion:** A fixed height (e.g. 350px desktop, 250px mobile) or
  aspect-ratio approach. Must not overflow on 375px viewport.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing frontend
- `public/index.html` — Current page structure, where to insert map div
- `public/app.js` — `renderUI()`, `renderPlaceCard()`, `SOURCE_INFO`, `renderSourceBadge()` — map popups should reuse `renderSourceBadge()`
- `public/style.css` — CSS variables (`--bg-card`, `--accent-cold`, `--border`, etc.) map styling must reference

### Types & API shape
- `src/types.ts` — `Observation` and `Station` interfaces; `latitude`, `longitude`, `sourceRef` fields
- `src/finder.ts` — API response shape: `{ coldest: Station, top5: Station[], totalStations, lastUpdated }`

### Project conventions
- `AGENTS.md` — Code style, no bundler, vanilla JS frontend, ES Modules on backend only

</canonical_refs>

<specifics>
## Specific Details

- Leaflet CDN: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` and `leaflet.js`
- CartoDB Dark Matter (no key): `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
  - Attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>`
- Hero marker should visually match `--accent-cold: #64b5f6`
- `place-card--highlighted` class: a brief background flash (e.g. box-shadow pulse or border colour change) — keep subtle

</specifics>

<deferred>
## Deferred

- All-stations dot cloud / heat map (ADV-01 extended scope — future phase)
- Custom tile server hosting
- Shareable map screenshot (ADV-02)

</deferred>

---

*Phase: 04-interactive-map*
*Context gathered: 2026-04-06 via user discuss session*
