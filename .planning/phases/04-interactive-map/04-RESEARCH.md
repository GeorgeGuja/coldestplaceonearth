# Phase 4: Interactive Map — Research

**Researched:** 2026-04-06
**Domain:** Leaflet.js 1.9.4 — vanilla JS CDN integration, no bundler
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Map library:** Leaflet.js via CDN (unpkg), no API key, OpenStreetMap tiles
- **Pins:** Top 5 + coldest hero = 6 total; hero pin visually distinct (cyan / `--accent-cold`)
- **Map placement:** Below `.top5-section`, above `.stats`
- **Pin interaction:** Click scrolls to corresponding `.place-card`, adds `place-card--highlighted` CSS class for 1.5 seconds
- **Graceful degradation:** Stations with `latitude === 0 && longitude === 0` silently skipped

### Agent's Discretion
- **Tile provider:** Prefer dark/muted tiles (CartoDB Dark Matter, no key) to match site aesthetic
- **Map height/sizing:** Fixed height (350px desktop / 250px mobile) or aspect-ratio. Must not overflow at 375px.

### Deferred Ideas (OUT OF SCOPE)
- All-stations dot cloud / heat map (ADV-01 extended scope — future phase)
</user_constraints>

---

## Summary

- **CDN load order is critical:** Leaflet CSS `<link>` must come before `<script>` in `<head>`; the JS `<script>` (deferred or at end of `<body>`) must execute before `L.map()` is called, but the map container `<div>` must exist in the DOM first. Since `renderUI()` injects content via `innerHTML`, `initMap()` must be called *after* `app.innerHTML = renderUI(data)`.
- **DivIcon is the right approach** for a hero pin with no image assets — create a `<div>` styled entirely with CSS (circle, cyan background, white border, box-shadow).
- **CartoDB Dark Matter** tiles are confirmed free and no-key at `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`.
- **`fitBounds` needs `maxZoom: 12`** — without it, a cluster of Antarctic stations over-zooms past z14+. Also guard the 1-pin edge case by falling back to `setView`.
- **No `overflow: hidden` on any ancestor of the map div** — this is the #1 Leaflet layout bug; the existing CSS has none, so we're safe. The `box-shadow` on `.coldest-card` does not create a clipping context.

---

## Leaflet CDN Integration

### CDN URLs (version locked per CONTEXT.md)
```html
<!-- In <head> — CSS MUST load before JS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin="" />

<!-- Just before </body> or with defer — after app.js -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN/WLs="
        crossorigin=""></script>
```
[VERIFIED: unpkg CDN — version 1.9.4 confirmed present]

### Initialization timing — the innerHTML gotcha

The existing `loadColdestPlaces()` in `app.js` does:
```javascript
app.innerHTML = renderUI(data);  // injects all HTML including the map div
```

**`L.map()` MUST be called after this line** — the map container `<div>` does not exist before `renderUI()` runs. The correct pattern:

```javascript
// In loadColdestPlaces(), after the try/catch success path:
app.innerHTML = renderUI(data);
initMap(data);  // <-- map container now exists, safe to call L.map()
```

[VERIFIED: Leaflet source confirms `L.map()` throws `"Map container not found."` if the element is absent]

### Script tag order in index.html

Current `index.html` loads `<script src="app.js"></script>` just before `</body>`. The Leaflet script tag (no `defer`, or with `defer`) must appear **before** `app.js` so `window.L` is defined when `app.js` runs. Recommended: add Leaflet CDN tags in `<head>` (CSS) and just before `</body>` (JS script, before `app.js`).

```html
<head>
  ...
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" ... />
</head>
<body>
  ...
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" ...></script>
  <script src="app.js"></script>
</body>
```

### Map container in renderUI()

Insert the map container div in the `renderUI()` return string, between `.top5-section` and `.stats`:

```javascript
// Inside renderUI() template literal, after top5-section, before stats:
`<div id="coldest-map" class="map-section" aria-label="Map of coldest locations"></div>`
```

The container needs an explicit height (set in CSS, not inline) — Leaflet will not render in a zero-height div.

---

## Custom Markers (Hero Pin)

### DivIcon — no image assets required

`L.divIcon` creates a `<div>` element as the marker. Use inline HTML with a styled `<span>` (circle shaped via CSS) for a no-asset, fully CSS-styled hero pin:

```javascript
// Source: Leaflet 1.9.4 DivIcon docs
const heroIcon = L.divIcon({
  html: '<span class="map-pin map-pin--hero"></span>',
  className: '',          // empty string removes Leaflet's white box default
  iconSize: [16, 16],
  iconAnchor: [8, 8],     // centre of icon on the coordinate
  popupAnchor: [0, -10],
});

const regularIcon = L.divIcon({
  html: '<span class="map-pin"></span>',
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -8],
});
```

Corresponding CSS (add to `style.css`):
```css
.map-pin {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--accent-colder);
  border: 2px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
}

.map-pin--hero {
  background: var(--accent-cold); /* #64b5f6 — cyan */
  border: 2px solid #fff;
  box-shadow: 0 0 10px rgba(100, 181, 246, 0.7);
}
```

**Important:** Setting `className: ''` on `L.divIcon` is required to remove the default `leaflet-div-icon` class, which applies a white square background and border. Without this, the pin will have an unwanted white box behind it.
[VERIFIED: Leaflet source — `_setIconStyles` reads `options.className` directly]

---

## Tile Provider

### CartoDB Dark Matter — confirmed no API key

```javascript
// Source: CONTEXT.md + CARTO public docs
L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }
).addTo(map);
```

- **No API key, no rate limits** for public use at reasonable traffic levels [VERIFIED: CARTO public docs]
- The `{r}` token resolves to `@2x` on retina displays automatically in Leaflet
- Subdomains `abcd` (4 subdomains vs default 3) — standard for CartoDB
- Dark background (`#1a1520` approx.) matches the site's `--bg-primary: #0a0e27` reasonably well

---

## Popup Customisation

### HTML string in bindPopup — reuse renderSourceBadge()

The locked decision requires popups show: station name, temperature (°C + °F), source badge, station ID. The existing `renderSourceBadge()` function in `app.js` produces the correct HTML and should be reused:

```javascript
function buildPopupContent(station, isHero) {
  const badge = renderSourceBadge(station.source, station.stationId, station.sourceRef);
  const tempC = station.tempC.toFixed(1);
  const tempF = ((station.tempC * 9 / 5) + 32).toFixed(1);
  const heroTag = isHero ? '<span class="map-popup-hero-tag">Coldest</span>' : '';
  return `
    <div class="map-popup-content">
      ${heroTag}
      <div class="map-popup-name">${station.name}</div>
      <div class="map-popup-temp">${tempC}°C / ${tempF}°F</div>
      <div class="map-popup-meta">${badge}&nbsp;· ${station.stationId}</div>
    </div>
  `;
}

marker.bindPopup(buildPopupContent(station, isHero), {
  className: 'map-popup',    // applied to .leaflet-popup container
  maxWidth: 220,
  minWidth: 160,
});
```

### Dark popup styling

Leaflet popup containers get class `leaflet-popup`. Using the `className` option of `bindPopup` adds an extra class to the container. Target `.map-popup .leaflet-popup-content-wrapper` to override the white background:

```css
.map-popup .leaflet-popup-content-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: 8px;
  box-shadow: 0 4px 20px var(--shadow);
}
.map-popup .leaflet-popup-tip {
  background: var(--bg-card);
}
.map-popup .leaflet-popup-close-button {
  color: var(--text-secondary);
}
```

[VERIFIED: Leaflet source — `_initLayout` creates `.leaflet-popup-content-wrapper` and `.leaflet-popup-tip`]

---

## Scroll + Highlight Interaction

### Pattern — on marker click event

```javascript
marker.on('click', () => {
  // 1. Scroll the corresponding card into view
  const card = document.querySelector(`.place-card[data-station-id="${station.stationId}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 2. Add highlight class, remove after 1.5s
    card.classList.add('place-card--highlighted');
    setTimeout(() => card.classList.remove('place-card--highlighted'), 1500);
  }
});
```

### Connecting cards to station IDs

The existing `renderPlaceCard()` does not emit a `data-station-id` attribute. The executor must **add `data-station-id="${place.stationId}"` to the `.place-card` div** in `renderPlaceCard()`. This is the only change to that function.

The coldest hero card uses `.coldest-card` — give it `data-station-id="${coldest.stationId}"` similarly.

### CSS highlight class

```css
.place-card--highlighted {
  box-shadow: 0 0 0 2px var(--accent-cold), 0 4px 20px rgba(100, 181, 246, 0.3);
  transition: box-shadow 0.2s ease;
}
```

Using `box-shadow` rather than `background` means the dark card background is not disrupted. The 1.5s timeout matches the locked decision.

### Timing consideration

`scrollIntoView` is asynchronous (scroll completes at browser speed). The highlight class should be added immediately (before or at same time as scroll), not after a delay — the highlight is what signals "this is the relevant card."

---

## fitBounds Edge Cases

### Standard call with padding and maxZoom cap

```javascript
const bounds = L.latLngBounds(validPins.map(p => [p.lat, p.lng]));

if (validPins.length === 1) {
  map.setView([validPins[0].lat, validPins[0].lng], 5);
} else {
  map.fitBounds(bounds, {
    padding: [40, 40],   // px buffer inside map edge
    maxZoom: 12,         // prevents over-zoom for clustered stations
  });
}
```

### Why maxZoom: 12

- Without `maxZoom`, `fitBounds` calculates the minimum zoom that fits all pins. If all 6 stations are within, say, 500km of each other (e.g., all in Eastern Siberia), the map will zoom to z13–15+ — tiles are heavily zoomed in and the map loses geographic context.
- `maxZoom: 12` caps at a scale showing ~500km radius, providing recognisable geographic context for extreme cold regions (Siberia, Antarctica).
- For Antarctic clustering specifically (Vostok, Dome Fuji, McMurdo — all within ~2000km), z5–7 is appropriate. `maxZoom: 12` never exceeds a reasonable zoom for any real scenario.

### 0,0 coordinate guard (LOCKED requirement)

```javascript
const validPins = stations.filter(s => !(s.latitude === 0 && s.longitude === 0));
```

Build this list before any `fitBounds` or marker creation call.

---

## Mobile Sizing

### Fixed height approach (recommended)

```css
.map-section {
  height: 350px;
  margin-top: 2rem;
  margin-bottom: 2rem;
  border-radius: 12px;
  overflow: hidden;        /* clips tile edges to match border-radius */
  border: 1px solid var(--border);
}

@media (max-width: 768px) {
  .map-section {
    height: 280px;
  }
}

@media (max-width: 375px) {
  .map-section {
    height: 240px;
  }
}
```

### invalidateSize() timing

`invalidateSize()` recalculates the map container dimensions after a CSS layout shift. It is **not needed** in this phase since the map is initialized once after `renderUI()` finishes and the container already has its CSS-defined height. However, if the user's browser reflows (e.g., rotating phone), Leaflet's built-in `resize` handler automatically calls `invalidateSize` — no manual call required.

**Only call `invalidateSize()` explicitly** if inserting the map into a hidden element that later becomes visible (e.g., a tab panel). That is not the case here.

[VERIFIED: Leaflet source — `A._initEvents` attaches `window.resize` → `_onResize` → `invalidateSize({debounceMoveend: true})`]

### overflow: hidden on map container

Adding `overflow: hidden` to the map container `<div>` is safe and recommended — it clips tile edges to the rounded border. **Do NOT add it to any ancestor** (`.container`, `body`) — that would break Leaflet's popup positioning and tile rendering.

---

## CSS Conflicts to Watch

### 1. `.place-card:hover { transform: translateY(-2px) }` creates a stacking context

The `transform` property creates a new stacking context, moving `.place-card` above its z-order siblings. **This does not affect the map** because the map is a sibling of `.top5-section`, not nested inside it. No action needed.

### 2. Leaflet default icon path detection

Leaflet's default `L.Icon.Default` tries to auto-detect the CSS path by looking for a `<link>` tag ending in `leaflet.css`. Since we use `L.divIcon` for all markers in this phase, the default icon is never instantiated — this is a non-issue.

### 3. Leaflet attribution control z-index

The Leaflet attribution control (`leaflet-control-attribution`) uses `z-index: 800` by default. This is well above any z-index in the current CSS (no explicit z-index on any element). No conflict expected.

### 4. `box-sizing: border-box` on Leaflet elements

The site's global `* { box-sizing: border-box }` applies to all elements including Leaflet's internal divs. Leaflet 1.9.4 is compatible with `box-sizing: border-box` — it was designed to work in this environment.
[VERIFIED: Leaflet GitHub has longstanding compatibility; box-sizing issues were fixed pre-1.0]

### 5. Leaflet popup `z-index: 700` vs site

No element in the current CSS has competing `z-index`. Popups will always render on top of the map and cards. No z-index CSS rules needed.

---

## Validation Architecture

No test framework is configured (see `AGENTS.md`: `npm test` is a placeholder). Validation is manual/visual per the project's convention.

### Testable criteria (manual UAT)

| # | Criterion | How to verify |
|---|-----------|---------------|
| V1 | Map renders on page load | Open browser, confirm map appears below top-5 list |
| V2 | 6 pins visible (or fewer if <6 valid coords) | Count pins on map |
| V3 | Hero pin is visually distinct (cyan) | Compare hero vs top-5 pin colour |
| V4 | Clicking any pin opens popup with name + temp + source badge | Click each pin |
| V5 | Clicking a pin scrolls to its card and highlights it for 1.5s | Click pin, observe list |
| V6 | Map tiles load (dark theme) | Look for CartoDB Dark Matter tiles |
| V7 | Mobile 375px: no overflow, map cropped but functional | DevTools responsive mode |
| V8 | Station with lat=0, lon=0 does not create a pin at 0°N 0°E | Inspect pin count vs data |
| V9 | No console errors on page load | Browser DevTools console |
| V10 | `tsc --noEmit` passes (no backend changes, frontend only) | `npx tsc --noEmit` |

### Smoke test command
```bash
# Start dev server and open in browser
npm run dev
# Then load http://localhost:3000 and manually verify V1–V9
```

---

## Recommended Implementation Sequence

**Wave 1 — HTML structure (index.html)**
1. Add Leaflet CSS `<link>` in `<head>` (before `style.css`)
2. Add Leaflet JS `<script>` just before `</body>`, before `app.js`

**Wave 2 — Map container in renderUI() (app.js)**
3. In `renderUI()`, add `<div id="coldest-map" class="map-section" aria-label="Map showing coldest locations"></div>` between the closing `</div>` of `.top5-section` and the `<div class="stats">` block
4. Add `data-station-id="${place.stationId}"` attribute to the `.place-card` div in `renderPlaceCard()`
5. Add `data-station-id="${coldest.stationId}"` to `.coldest-card` in `renderUI()`

**Wave 3 — Map CSS (style.css)**
6. Add `.map-section` sizing styles (350px desktop / 280px tablet / 240px mobile viewport)
7. Add `.map-pin` and `.map-pin--hero` circle styles
8. Add `.map-popup` popup dark theme overrides (targeting `.leaflet-popup-content-wrapper`, `.leaflet-popup-tip`)
9. Add `.place-card--highlighted` style (box-shadow pulse)

**Wave 4 — Map initialization (app.js)**
10. Add `initMap(data)` function that:
    a. Filters `validPins` (skip 0,0 coords)
    b. Calls `L.map('coldest-map', { zoomControl: true, scrollWheelZoom: false })` — disable scroll-wheel zoom to prevent accidental scroll-hijack
    c. Adds CartoDB Dark Matter tile layer
    d. Creates hero marker (DivIcon, cyan) for `data.coldest`
    e. Creates regular markers (DivIcon) for each of `data.top5`
    f. On each marker: `bindPopup(buildPopupContent(...))` + `.on('click', scrollHighlightHandler)`
    g. Calls `fitBounds` with `maxZoom: 12, padding: [40, 40]` (or `setView` for single pin)
11. Call `initMap(data)` in `loadColdestPlaces()` immediately after `app.innerHTML = renderUI(data)`

**Verification**
12. Manual UAT against V1–V9 criteria above
13. `npx tsc --noEmit` to confirm no TypeScript regressions

---

## Open Questions

1. **Scroll wheel zoom** — disabling `scrollWheelZoom` (recommended above) prevents the map from hijacking page scroll on desktop. Should it be re-enabled? The CONTEXT.md does not specify. Recommendation: disable by default (common UX practice for embedded maps) — user can re-enable by clicking the map first if needed (`map.scrollWheelZoom.enable()` on map focus).

2. **Retina tile support** — CartoDB Dark Matter URL includes `{r}` which resolves to `@2x` on retina displays automatically. No extra configuration needed but planner should note this in the tile layer options (`detectRetina: true` if desired).

3. **Hero-pin map click** — the hero card is `.coldest-card` (not a `.place-card`). The `scrollIntoView` logic should target `.coldest-card` for the hero marker, `.place-card[data-station-id="X"]` for the top-5 markers. The planner should model these two separate code paths.

---

## Security Domain

No ASVS risks introduced by this phase:
- **V5 Input Validation:** Popup HTML is constructed from `station.name`, `station.stationId`, `station.tempC` — all of which come from the trusted `/api/coldest` JSON response (server-side validated by Zod). No user input flows into popup HTML.
- **V4 Access Control:** Pure frontend read-only rendering. No new endpoints or authentication surfaces.
- **External URLs:** CartoDB tiles load from `*.basemaps.cartocdn.com` only. The `crossorigin=""` attribute on CDN tags follows security best practices.
- **SRI hashes** should be added to the CDN `<script>` and `<link>` tags (unpkg provides them in the CONTEXT.md — use those).

---

## Sources

### Primary (HIGH confidence)
- Leaflet 1.9.4 minified source (unpkg.com/leaflet@1.9.4/dist/leaflet.js) — confirmed version, DivIcon implementation, `invalidateSize` auto-wiring, `fitBounds` options
- leafletjs.com/reference.html — DivIcon, Popup, TileLayer, Map.fitBounds API reference
- CONTEXT.md (`04-CONTEXT.md`) — locked decisions, CartoDB URL, attribution string

### Secondary (MEDIUM confidence)
- Existing `public/app.js` — confirmed `renderUI()` / `inn erHTML` pattern, `renderSourceBadge()` reuse
- Existing `public/style.css` — confirmed CSS variables, no `overflow: hidden` on ancestors, no conflicting z-index, media query breakpoints

### Assumed [ASSUMED]
- `scrollWheelZoom: false` as default is a UX best practice for page-embedded maps — consensus in Leaflet community but not explicitly required by CONTEXT.md
- CartoDB Dark Matter `subdomains: 'abcd'` (4 subdomains) — standard practice; CONTEXT.md URL uses `{s}` which defaults to `abc` if not set, but `abcd` is the canonical CartoDB config [ASSUMED: not verified against current CARTO CDN docs this session]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CartoDB Dark Matter uses `subdomains: 'abcd'` (4 subdomains) | Tile Provider | Tile 404s on subdomain `d`; fallback to `abc` works fine |
| A2 | `scrollWheelZoom: false` is appropriate default | Open Questions | User may want scroll-zoom; easy to toggle |

---

## RESEARCH COMPLETE

**Phase:** 4 — Interactive Map
**Confidence:** HIGH

### Key Findings
- **Initialization must follow `innerHTML`:** `initMap(data)` must be called after `app.innerHTML = renderUI(data)` — the map container div does not exist before that point
- **DivIcon with `className: ''`** removes the default white-box background; pure CSS circles achieve the cyan hero pin requirement without image assets
- **CartoDB Dark Matter** is confirmed no-key, URL and attribution string are specified in CONTEXT.md
- **`fitBounds({ maxZoom: 12 })`** prevents Antarctic cluster over-zoom; single-pin fallback to `setView` is essential
- **No CSS conflicts** in existing styles — no `overflow: hidden` on ancestors, no z-index competition

### Files to Create/Modify
- `public/index.html` — add Leaflet CDN tags
- `public/app.js` — add `initMap()`, update `renderUI()`/`renderPlaceCard()` for `data-station-id` attributes
- `public/style.css` — map container sizing, pin styles, popup dark overrides, highlight class

### Ready for Planning
Research complete. Planner can now create PLAN.md.
