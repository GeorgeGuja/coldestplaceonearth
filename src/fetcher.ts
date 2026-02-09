import { gunzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const METAR_URL = 'https://aviationweather.gov/data/cache/metars.cache.csv.gz';
const CACHE_PATH = join(process.cwd(), 'data', 'cache.json');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches METAR data from NOAA, with local caching
 */
export async function fetchMetarData(): Promise<string> {
  // Check if cache exists and is fresh
  if (existsSync(CACHE_PATH)) {
    const stats = statSync(CACHE_PATH);
    const age = Date.now() - stats.mtimeMs;
    
    if (age < CACHE_TTL_MS) {
      console.log(`Using cached METAR data (age: ${Math.round(age / 1000 / 60)} minutes)`);
      const cached = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
      return cached.data;
    }
  }

  console.log('Fetching fresh METAR data from NOAA...');
  
  try {
    const response = await fetch(METAR_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const decompressed = gunzipSync(Buffer.from(buffer));
    const csvData = decompressed.toString('utf-8');

    // Save to cache
    writeFileSync(CACHE_PATH, JSON.stringify({
      data: csvData,
      timestamp: new Date().toISOString(),
    }), 'utf-8');

    console.log(`Fetched and cached ${csvData.length} bytes of METAR data`);
    return csvData;
  } catch (error) {
    console.error('Failed to fetch METAR data:', error);
    
    // Try to use stale cache as fallback
    if (existsSync(CACHE_PATH)) {
      console.log('Using stale cache as fallback');
      const cached = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
      return cached.data;
    }
    
    throw new Error('Failed to fetch METAR data and no cache available');
  }
}
