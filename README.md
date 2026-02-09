# ColdestPlace

**Find the coldest airport/weather station on Earth right now.**

A real-time website that scans ~10,000 METAR-reporting weather stations globally to show you the coldest place on Earth at this moment.

## 🌡️ Features

- **Global Coverage**: Scans ALL ~10,000 METAR weather stations worldwide (no filtering)
- **Real-Time Data**: Hourly updates from NOAA Aviation Weather
- **Top 5 Display**: See the coldest and top 5 coldest places
- **Both Units**: Shows temperature in °C and °F
- **Mobile Responsive**: Works on all screen sizes (375px+)
- **Fast & Cached**: Local caching prevents repeated downloads

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit in browser
open http://localhost:3000
```

### Build for Production

```bash
# Compile TypeScript
npm run build

# Run production server
npm start
```

## 📊 Data Source

Uses **NOAA METAR/SYNOP data** from Aviation Weather:
- **URL**: `https://aviationweather.gov/data/cache/metars.cache.csv.gz`
- **Coverage**: ~10,000 airports and major weather stations globally
- **Update Frequency**: Hourly observations
- **Cost**: Free, public domain, no API keys required

### Coverage Notes

METAR data covers:
- ✅ All major airports worldwide
- ✅ Research stations (Antarctic, Arctic)
- ✅ Military bases
- ✅ Remote weather stations with aviation infrastructure

METAR data does NOT cover:
- ❌ Small towns without airports
- ❌ Remote villages
- ❌ Personal weather stations

**This means**: We show the coldest *major* location, not necessarily the absolute coldest spot on Earth. The website is honest about this limitation.

## 🏗️ Architecture

### Current (Phase 1 - Local MVP)
```
Node.js Server
├── Fetch METAR CSV from NOAA
├── Parse ~10,000 station observations
├── Find minimum temperature (no filtering)
├── Serve static HTML/CSS/JS frontend
└── Cache data locally (1 hour TTL)
```

### Phase 2 (Planned)
- Migrate to **Cloudflare Workers**
- Use **Cloudflare KV** for caching
- Deploy to global edge network
- Sub-second load times worldwide

## 📁 Project Structure

```
coldest-place/
├── src/
│   ├── fetcher.ts      # Download METAR data with caching
│   ├── parser.ts       # CSV parsing and validation
│   ├── finder.ts       # Find coldest places algorithm
│   ├── metadata.ts     # ICAO station lookup
│   ├── server.ts       # HTTP server
│   └── types.ts        # TypeScript types
├── public/
│   ├── index.html      # Main UI
│   ├── style.css       # Styling
│   └── app.js          # Frontend logic
├── data/
│   └── cache.json      # Cached METAR data (gitignored)
└── .planning/          # Project planning docs
```

## 🧪 Testing

Currently running in development. Verified features:
- ✅ METAR data fetching works
- ✅ Parsing ~10,000 stations successfully
- ✅ Finding coldest place correctly
- ✅ API endpoint returns valid JSON
- ✅ Frontend displays results
- ✅ Mobile responsive design
- ✅ Caching prevents repeated downloads
- ✅ Error handling with stale cache fallback

**Test Results** (as of Feb 9, 2026):
- Coldest: CXSE Station, Canada at -47°C (-52.6°F)
- Stations scanned: ~10,000
- Response time: < 10 seconds (first fetch)
- Subsequent requests: < 1 second (cached)

## 🎯 Requirements Met

Phase 1 MVP requirements:
- [x] Fetch METAR data from NOAA
- [x] Parse CSV (all stations, zero filtering)
- [x] Find minimum temperature globally
- [x] Display coldest place prominently
- [x] Show top 5 coldest places
- [x] Mobile responsive (375px+)
- [x] Coordinates, timestamp, temperature
- [x] Error handling with cache fallback
- [x] Local caching (1 hour TTL)
- [x] Load time < 10 seconds

## 📝 License

MIT

## 🙏 Credits

- Data from [NOAA Aviation Weather](https://aviationweather.gov)
- Built as part of the ColdestPlace project
