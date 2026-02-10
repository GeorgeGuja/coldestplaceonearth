/**
 * SYNOP Station Metadata Module
 * Fetches and parses NOAA ISD station database to enrich SYNOP observations with names and coordinates
 */

export interface StationMetadata {
  usaf: string;
  wban: string;
  name: string;
  country: string;
  state: string;
  icao: string;
  lat: number;
  lon: number;
  elevation: number;
  beginDate: string;
  endDate: string;
}

const ISD_HISTORY_URL = 'https://www.ncei.noaa.gov/pub/data/noaa/isd-history.txt';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

let stationCache: Map<string, StationMetadata> | null = null;
let lastFetchTime = 0;

/**
 * Parse a single line from the ISD station history file
 */
function parseISDLine(line: string): StationMetadata | null {
  // Skip header lines and empty lines
  if (line.length < 80 || line.startsWith('USAF') || line.startsWith('-')) {
    return null;
  }

  try {
    // Fixed-width format parsing based on ISD documentation
    const usaf = line.substring(0, 6).trim();
    const wban = line.substring(7, 12).trim();
    const name = line.substring(13, 43).trim();
    const country = line.substring(43, 47).trim();
    const state = line.substring(48, 50).trim();
    const icao = line.substring(51, 56).trim();
    const latStr = line.substring(57, 64).trim();
    const lonStr = line.substring(65, 73).trim();
    const elevStr = line.substring(74, 81).trim();
    const beginDate = line.substring(82, 90).trim();
    const endDate = line.substring(91, 99).trim();

    // Skip invalid entries
    if (!usaf || usaf === '999999' || !name || name.includes('BOGUS') || name.includes('WXPOD')) {
      return null;
    }

    // Parse coordinates (already in decimal degrees with 3 decimal places)
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    const elevation = parseFloat(elevStr);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lon) || lat === 0 && lon === 0) {
      return null;
    }

    return {
      usaf,
      wban,
      name,
      country,
      state,
      icao,
      lat,
      lon,
      elevation: isNaN(elevation) ? 0 : elevation,
      beginDate,
      endDate,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Fetch and parse the ISD station history database
 */
async function fetchStationDatabase(): Promise<Map<string, StationMetadata>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (stationCache && (now - lastFetchTime) < CACHE_DURATION_MS) {
    return stationCache;
  }

  console.log('Fetching NOAA ISD station database...');
  
  try {
    const response = await fetch(ISD_HISTORY_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch ISD database: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.split('\n');
    
    const stations = new Map<string, StationMetadata>();
    
    for (const line of lines) {
      const station = parseISDLine(line);
      if (station) {
        // Index by USAF ID (WMO station ID for SYNOP)
        stations.set(station.usaf, station);
        
        // Also index by ICAO if available
        if (station.icao) {
          stations.set(station.icao, station);
        }
      }
    }

    console.log(`Loaded ${stations.size} valid station records`);
    
    stationCache = stations;
    lastFetchTime = now;
    
    return stations;
  } catch (error) {
    console.error('Error fetching station database:', error);
    
    // Return empty map on error, but keep old cache if available
    if (stationCache) {
      console.log('Using stale cache due to fetch error');
      return stationCache;
    }
    
    return new Map();
  }
}

/**
 * Lookup station metadata by WMO station ID
 * WMO IDs are typically 5-digit codes (e.g., "24688" for Oymyakon)
 */
export async function lookupStation(stationId: string): Promise<StationMetadata | null> {
  const db = await fetchStationDatabase();
  
  // Try direct lookup (5-digit WMO codes match USAF field in some cases)
  let station = db.get(stationId);
  if (station) {
    return station;
  }
  
  // Try with leading zero if it's a 5-digit code (some WMO IDs need this)
  if (stationId.length === 5) {
    station = db.get('0' + stationId);
    if (station) {
      return station;
    }
  }
  
  // Try as 6-digit USAF code if 5-digit was provided
  if (stationId.length === 5) {
    // Try common patterns: e.g., 24688 → 246880, 246880
    const patterns = [
      stationId + '0',  // Append 0
      stationId,        // As-is
    ];
    
    for (const pattern of patterns) {
      station = db.get(pattern);
      if (station) {
        return station;
      }
    }
  }
  
  return null;
}

/**
 * Lookup multiple stations in parallel
 */
export async function lookupStations(stationIds: string[]): Promise<Map<string, StationMetadata>> {
  // Trigger database fetch once
  await fetchStationDatabase();
  
  const results = new Map<string, StationMetadata>();
  
  for (const id of stationIds) {
    const metadata = await lookupStation(id);
    if (metadata) {
      results.set(id, metadata);
    }
  }
  
  return results;
}

/**
 * Format station name for display
 * Prioritizes ICAO code over raw name if available
 */
export function formatStationName(metadata: StationMetadata): string {
  if (metadata.icao) {
    return `${metadata.name} (${metadata.icao})`;
  }
  return metadata.name;
}

/**
 * Get a human-readable location string
 */
export function getLocationString(metadata: StationMetadata): string {
  const parts: string[] = [];
  
  if (metadata.name) {
    parts.push(metadata.name);
  }
  
  if (metadata.state) {
    parts.push(metadata.state);
  }
  
  if (metadata.country) {
    parts.push(metadata.country);
  }
  
  return parts.join(', ');
}

/**
 * Check if station is currently active
 */
export function isStationActive(metadata: StationMetadata): boolean {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  
  if (!metadata.endDate) {
    return true;
  }
  
  return metadata.endDate >= today;
}
