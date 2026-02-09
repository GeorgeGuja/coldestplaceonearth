// Fetch and display coldest places
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

  return `
    <div class="coldest-card">
      <h2>Coldest Place Right Now</h2>
      <div class="temperature">${formatTemp(coldest.tempC)}</div>
      <div class="location-name">${coldest.name}</div>
      <div class="location-details">${coldest.country}</div>
      <div class="coordinates">
        ${formatCoordinates(coldest.latitude, coldest.longitude)}
      </div>
      <div class="coordinates" style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.7;">
        Station: ${coldest.stationId}
      </div>
    </div>

    <div class="top5-section">
      <h3>Top 5 Coldest Places</h3>
      <div class="top5-list">
        ${top5.map((place, index) => renderPlaceCard(place, index + 1)).join('')}
      </div>
    </div>

    <div class="stats">
      <p>Scanned ${totalStations.toLocaleString()} weather stations globally</p>
      <p>Last updated: ${formatTimestamp(lastUpdated)}</p>
    </div>
  `;
}

function renderPlaceCard(place, rank) {
  return `
    <div class="place-card">
      <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
        <div class="place-rank">#${rank}</div>
        <div class="place-info">
          <div class="place-name">${place.name}</div>
          <div class="place-location">${place.country} • ${place.stationId}</div>
          <div class="place-location" style="font-size: 0.8rem; margin-top: 0.25rem;">
            ${formatCoordinates(place.latitude, place.longitude)}
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
