import { readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseString } from 'xml2js';
import { promisify } from 'node:util';

const parseXML = promisify(parseString);

const EC_LATEST_URL = 'https://dd.weather.gc.ca/observations/swob-ml/latest/';
const EC_STATION_LIST_URL = 'https://dd.meteo.gc.ca/today/observations/doc/swob-xml_station_list.csv';
const CACHE_PATH = join(process.cwd(), 'data', 'ec-cache.json');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface ECStation {
  stationId: string;
  name: string;
  latitude: number;
  longitude: number;
  province: string;
}

interface ECObservation {
  stationId: string;
  name: string;
  latitude: number;
  longitude: number;
  tempC: number | null;
  observationTime: string;
  province: string;
}

/**
 * Fetches Environment Canada station list
 */
export async function fetchECStationList(): Promise<ECStation[]> {
  try {
    const response = await fetch(EC_STATION_LIST_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csv = await response.text();
    const lines = csv.split('\n').slice(1); // Skip header

    const stations: ECStation[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(',');
      if (parts.length < 11) continue;

      const stationId = parts[2]?.trim(); // WMO_ID
      const name = parts[1]?.trim();
      const lat = parseFloat(parts[4]);
      const lon = parseFloat(parts[5]);
      const province = parts[10]?.trim();

      if (stationId && name && !isNaN(lat) && !isNaN(lon)) {
        stations.push({ stationId, name, latitude: lat, longitude: lon, province });
      }
    }

    console.log(`Loaded ${stations.length} Environment Canada stations`);
    return stations;
  } catch (error) {
    console.error('Failed to fetch EC station list:', error);
    return [];
  }
}

/**
 * Fetches latest observations from Environment Canada
 * WARNING: This attempts to fetch ~800 XML files, which is slow
 * For production, should use AMQP feed or batch processing
 */
export async function fetchECObservations(): Promise<ECObservation[]> {
  // Check cache first
  if (existsSync(CACHE_PATH)) {
    const stats = statSync(CACHE_PATH);
    const age = Date.now() - stats.mtimeMs;
    
    if (age < CACHE_TTL_MS) {
      console.log(`Using cached EC data (age: ${Math.round(age / 1000 / 60)} minutes)`);
      const cached = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
      return cached.observations;
    }
  }

  console.log('Fetching Environment Canada observations (this may take a minute)...');

  const stations = await fetchECStationList();
  const observations: ECObservation[] = [];

  // Fetch in batches to avoid overwhelming the server
  const BATCH_SIZE = 20;
  const CONCURRENT_LIMIT = 5;

  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (station) => {
      try {
        const filename = `latest_${station.stationId}_AUTO_swob.xml`;
        const url = `${EC_LATEST_URL}${filename}`;
        
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return null;

        const xml = await response.text();
        const result = await parseXML(xml);

        // Extract temperature from SWOB-ML format
        const elements = result?.om_Observation?.om_result?.[0]?.elements?.[0]?.element || [];
        let tempC: number | null = null;
        let observationTime = result?.om_Observation?.om_resultTime?.[0]?.TimeInstant?.[0]?.timePosition?.[0] || new Date().toISOString();

        for (const element of elements) {
          if (element.$?.name === 'air_temp' && element.$?.value) {
            tempC = parseFloat(element.$.value);
            break;
          }
        }

        if (tempC !== null && !isNaN(tempC)) {
          return {
            stationId: station.stationId,
            name: station.name,
            latitude: station.latitude,
            longitude: station.longitude,
            tempC,
            observationTime,
            province: station.province,
          };
        }
      } catch (error) {
        // Silently skip failed stations
      }
      return null;
    });

    const results = await Promise.all(promises);
    observations.push(...results.filter((obs): obs is ECObservation => obs !== null));

    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, stations.length)}/${stations.length} stations, found ${observations.length} observations`);
    }
  }

  console.log(`Fetched ${observations.length} Environment Canada observations`);

  // Cache results
  writeFileSync(CACHE_PATH, JSON.stringify({
    observations,
    timestamp: new Date().toISOString(),
  }), 'utf-8');

  return observations;
}
