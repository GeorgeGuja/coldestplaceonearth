# Plan 04-01 Summary: Leaflet.js Interactive Map

**Status:** ✅ Complete
**Commit:** 54cb55f
**Date:** 2026-04-06

## What Was Built

An interactive Leaflet.js map rendered below the top-5 list on the ColdestPlace page.
6 pins are displayed per page load — the coldest hero station (cyan DivIcon) and each of
the 5 top-ranked stations (standard cyan-blue DivIcon). Cart DB Dark Matter tiles provide
a dark, site-consistent basemap with no API key required.

## Files Changed

| File | Change |
|---|---|
| `public/index.html` | Leaflet 1.9.4 CDN CSS + JS tags with SRI integrity hashes |
| `public/app.js` | `buildPopupContent()`, `initMap()`, map container in `renderUI()`, `data-station-id` on cards, `initMap(data)` call after innerHTML |
| `public/style.css` | `.map-section`, `.map-pin`, `.map-pin--hero`, `.map-popup` dark theme, `.map-popup-*` content, `.place-card--highlighted`, responsive heights |

## Key Implementation Notes

- `initMap(data)` is called synchronously **after** `app.innerHTML = renderUI(data)` — the
  map container div is injected by `renderUI()` so Leaflet must not initialise before it exists
- Hero pin: 16×16 `L.divIcon` with `className: ''` (clears Leaflet white-box default), renders
  `.map-pin.map-pin--hero` CSS circle in `--accent-cold` (#64b5f6) with glow
- Regular pins: 12×12, same approach, renders `.map-pin` in `--accent-colder`
- Popup HTML reuses `renderSourceBadge()` — coloured source pill consistent with card UI
- `scrollWheelZoom: false` prevents scroll hijack when user is scrolling the page
- `fitBounds({ padding: [40, 40], maxZoom: 12 })` — cap prevents over-zoom for clustered
  Antarctic or Siberian stations; 1-pin fallback uses `setView(latlng, 6)`
- Stations with `lat === 0 && lon === 0` are filtered before map initialises — no 0°N/0°E pin

## Plan Checker Flag (LOW)

`overflow: hidden` on `.map-section` clips Leaflet popups that extend above the map container
boundary (e.g. near-top-edge pins after fitBounds on Antarctic cluster). Accepted — no action
taken. If popup clipping is observed in practice, replace with `clip-path: inset(0 round 12px)`.

## UAT Checklist

- [ ] Map renders below the top-5 list on desktop
- [ ] Map renders on 375px mobile (250px tall, no overflow)
- [ ] 6 pins visible: 1 cyan hero, 5 smaller blue
- [ ] Pin popup: name, °C/°F, source badge, station ID, dark background
- [ ] Pin click scrolls + highlights matching card for 1.5s
- [ ] fitBounds auto-fits all pins (no blank initial view)
- [ ] Dark CartoDB tiles (not OSM light blue)
- [ ] lat=0 lon=0 station silently skipped
- [ ] Zero console errors on load
