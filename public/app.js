// Source metadata for provenance display
const SOURCE_INFO = {
  METAR: { label: 'NOAA METAR', description: 'Aviation weather report — hourly ASOS/AWOS' },
  SYNOP: { label: 'NOAA SYNOP', description: 'Surface synoptic bulletin (FM-12 format) via NOAA FTP' },
  EC:    { label: 'Environment Canada', description: 'Past conditions — weather.gc.ca' },
  ISD:   { label: 'NOAA ISD', description: 'Integrated Surface Database via NOAA FTP' },
};

function getSourceUrl(source, stationId, sourceRef) {
  // If the backend gave us an exact ref, prefer it
  if (sourceRef) {
    switch (source) {
      case 'SYNOP':
      case 'ISD':
        // sourceRef is a bulletin filename — link to the file on NOAA FTP
        return `https://tgftp.nws.noaa.gov/data/raw/sm/${encodeURIComponent(sourceRef)}`;
      case 'EC':
      case 'METAR':
        // sourceRef is already a full URL
        return sourceRef;
    }
  }
  // Fallback: derive from source + stationId
  switch (source) {
    case 'METAR':
      return `https://aviationweather.gov/metar/data/?ids=${encodeURIComponent(stationId)}&hours=1&order=id,-obs&sep=true`;
    case 'EC':
      return `https://weather.gc.ca/past_conditions/index_e.html?station=${encodeURIComponent(stationId.toLowerCase())}`;
    case 'SYNOP':
    case 'ISD':
      return 'https://tgftp.nws.noaa.gov/data/raw/sm/';
    default:
      return null;
  }
}

function getRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function renderSourceBadge(source, stationId, sourceRef) {
  const info = SOURCE_INFO[source] || { label: source, description: '' };
  const url = getSourceUrl(source, stationId, sourceRef);
  if (url) {
    return `<a class="source-badge source-badge-${source}" href="${url}" target="_blank" rel="noopener" title="${info.description}">${info.label} ↗</a>`;
  }
  return `<span class="source-badge source-badge-${source}" title="${info.description}">${info.label}</span>`;
}

function renderSourceRefLabel(source, sourceRef) {
  if (!sourceRef) return '';
  let label = '';
  if (source === 'SYNOP' || source === 'ISD') {
    // Show just the filename, linked
    label = sourceRef;
    const url = `https://tgftp.nws.noaa.gov/data/raw/sm/${encodeURIComponent(sourceRef)}`;
    return `<a class="source-ref-label" href="${url}" target="_blank" rel="noopener" title="Raw bulletin file on NOAA FTP">${label}</a>`;
  }
  if (source === 'METAR') {
    label = 'metars.cache.csv.gz';
    return `<a class="source-ref-label" href="${sourceRef}" target="_blank" rel="noopener" title="NOAA METAR cache file">${label}</a>`;
  }
  return '';
}

// Fetch and display coldest places
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
      <div class="map-popup-meta">${badge}&nbsp;&bull; ${station.stationId}</div>
    </div>
  `;
}

function initMap(data) {
  const { coldest, top5 } = data;

  const allStations = [
    Object.assign({}, coldest, { isHero: true }),
    ...top5.map(s => Object.assign({}, s, { isHero: false })),
  ];

  const validStations = allStations.filter(s => !(s.latitude === 0 && s.longitude === 0));

  if (validStations.length === 0) return;

  const map = L.map('coldest-map', {
    zoomControl: true,
    scrollWheelZoom: false,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  const heroIcon = L.divIcon({
    html: '<span class="map-pin map-pin--hero"></span>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });

  const regularIcon = L.divIcon({
    html: '<span class="map-pin"></span>',
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  });

  validStations.forEach(station => {
    const icon = station.isHero ? heroIcon : regularIcon;
    const marker = L.marker([station.latitude, station.longitude], { icon });

    marker.bindPopup(buildPopupContent(station, station.isHero), {
      className: 'map-popup',
      maxWidth: 220,
      minWidth: 160,
    });

    marker.on('click', () => {
      const selector = station.isHero
        ? `.coldest-card[data-station-id="${station.stationId}"]`
        : `.place-card[data-station-id="${station.stationId}"]`;
      const card = document.querySelector(selector);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('place-card--highlighted');
        setTimeout(() => card.classList.remove('place-card--highlighted'), 1500);
      }
    });

    marker.addTo(map);
  });

  if (validStations.length === 1) {
    map.setView([validStations[0].latitude, validStations[0].longitude], 6);
  } else {
    const bounds = L.latLngBounds(validStations.map(s => [s.latitude, s.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }
}

async function loadColdestPlaces() {
  const app = document.getElementById('app');

  try {
    const response = await fetch('/api/coldest');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Render the UI
    app.innerHTML = renderUI(data);
    initMap(data);  // must be called after innerHTML — map container is injected by renderUI()
  } catch (error) {
    console.error('Failed to load data:', error);
    app.innerHTML = `
      <div class="error">
        <h2>Failed to load data</h2>
        <p>${error.message}</p>
        <p>Please try again later.</p>
      </div>
    `;
  }
}

function renderUI(data) {
  const { coldest, top5, totalStations, lastUpdated } = data;
  const cSource = coldest.source || 'METAR';
  const cSourceInfo = SOURCE_INFO[cSource] || { label: cSource, description: '' };
  const cSourceUrl = getSourceUrl(cSource, coldest.stationId, coldest.sourceRef);
  const cRelTime = getRelativeTime(coldest.observationTime);
  const cFullTime = formatTimestamp(coldest.observationTime);
  const cRefLabel = renderSourceRefLabel(cSource, coldest.sourceRef);

  return `
    <div class="coldest-card" data-station-id="${coldest.stationId}">
      <h2>Coldest Place Right Now</h2>
      <div class="temperature">${formatTemp(coldest.tempC)}</div>
      <div class="location-name">${coldest.name}</div>
      <div class="location-details">${coldest.country}</div>
      <div class="coordinates">${formatCoordinates(coldest.latitude, coldest.longitude)}</div>
      <div class="coldest-provenance">
        <span class="prov-item">Station ${coldest.stationId}</span>
        <span class="prov-sep">·</span>
        <span class="prov-item prov-age" title="${cFullTime}">Observed ${cRelTime}</span>
        <span class="prov-sep">·</span>
        ${cSourceUrl
          ? `<a class="prov-item prov-source-link" href="${cSourceUrl}" target="_blank" rel="noopener" title="${cSourceInfo.description}">${cSourceInfo.label} ↗</a>`
          : `<span class="prov-item prov-source-link">${cSourceInfo.label}</span>`
        }
        ${cRefLabel ? `<span class="prov-sep">·</span><span class="prov-item">${cRefLabel}</span>` : ''}
      </div>
    </div>

    <div class="top5-section">
      <h3>Top 5 Coldest Places</h3>
      <div class="top5-list">
        ${top5.map((place, index) => renderPlaceCard(place, index + 1)).join('')}
      </div>
    </div>

    <div id="coldest-map" class="map-section" aria-label="Map showing coldest locations"></div>

    <div class="stats">
      <p>Scanned ${totalStations.toLocaleString()} weather stations globally</p>
      <p>Last updated: ${formatTimestamp(lastUpdated)}</p>
    </div>
  `;
}

function renderPlaceCard(place, rank) {
  const source = place.source || 'METAR';
  const relTime = getRelativeTime(place.observationTime);
  const fullTime = formatTimestamp(place.observationTime);
  const refLabel = renderSourceRefLabel(source, place.sourceRef);

  return `
    <div class="place-card" data-station-id="${place.stationId}">
      <div class="place-card-left">
        <div class="place-rank">#${rank}</div>
        <div class="place-info">
          <div class="place-name">${place.name}</div>
          <div class="place-location">${place.country} · ${formatCoordinates(place.latitude, place.longitude)}</div>
          <div class="place-source-row">
            ${renderSourceBadge(source, place.stationId, place.sourceRef)}
            <span class="data-age" title="${fullTime}">${relTime}</span>
            <span class="station-id-label">· ${place.stationId}</span>
            ${refLabel ? `<span class="station-id-label">· ${refLabel}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="place-temp">${formatTemp(place.tempC)}</div>
    </div>
  `;
}

function formatTemp(celsius) {
  const fahrenheit = (celsius * 9/5) + 32;
  return `${celsius.toFixed(1)}°C / ${fahrenheit.toFixed(1)}°F`;
}

function formatCoordinates(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

// Load on page load
loadColdestPlaces();
