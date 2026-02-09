import { load } from 'cheerio';
import { Observation } from './types.js';

/**
 * List of known cold-weather stations in Canada (from weather.gc.ca)
 * Format: { code: string, name: string, province: string, latitude: number, longitude: number }
 * 
 * This list focuses on Arctic/Subarctic stations that frequently report extreme cold
 */
const COLD_WEATHER_STATIONS = [
  // Extreme Arctic - Nunavut
  { code: 'ylt', name: 'Alert', province: 'Nunavut', latitude: 82.52, longitude: -62.28 },
  { code: 'yeu', name: 'Eureka', province: 'Nunavut', latitude: 80.00, longitude: -85.93 },
  { code: 'cysr', name: 'Resolute Bay', province: 'Nunavut', latitude: 74.72, longitude: -94.98 },
  { code: 'cyvt', name: 'Grise Fiord', province: 'Nunavut', latitude: 76.42, longitude: -82.90 },
  { code: 'yph', name: 'Hall Beach', province: 'Nunavut', latitude: 68.78, longitude: -81.24 },
  { code: 'yco', name: 'Kugluktuk', province: 'Nunavut', latitude: 67.82, longitude: -115.14 },
  { code: 'yfb', name: 'Iqaluit', province: 'Nunavut', latitude: 63.75, longitude: -68.56 },
  
  // Northwest Territories - High Arctic
  { code: 'wyf', name: 'Thomsen River', province: 'Northwest Territories', latitude: 73.23, longitude: -119.54 },
  { code: 'wsq', name: 'Nangmagvik Lake (Aulavik NP)', province: 'Northwest Territories', latitude: 73.70, longitude: -119.92 },
  { code: 'yck', name: 'Colville Lake', province: 'Northwest Territories', latitude: 67.03, longitude: -126.08 },
  { code: 'yev', name: 'Inuvik', province: 'Northwest Territories', latitude: 68.30, longitude: -133.48 },
  { code: 'yfs', name: 'Fort Simpson', province: 'Northwest Territories', latitude: 61.76, longitude: -121.24 },
  { code: 'yzf', name: 'Yellowknife', province: 'Northwest Territories', latitude: 62.46, longitude: -114.44 },
  
  // Yukon
  { code: 'yxy', name: 'Whitehorse', province: 'Yukon', latitude: 60.72, longitude: -135.07 },
  { code: 'yda', name: 'Dawson City', province: 'Yukon', latitude: 64.04, longitude: -139.13 },
  { code: 'yop', name: 'Old Crow', province: 'Yukon', latitude: 67.57, longitude: -139.84 },
  
  // Northern Quebec/Labrador
  { code: 'cymu', name: 'Kuujjuaq', province: 'Quebec', latitude: 58.10, longitude: -68.42 },
  { code: 'cyph', name: 'Inukjuak', province: 'Quebec', latitude: 58.47, longitude: -78.08 },
  
  // Northern Manitoba/Saskatchewan
  { code: 'ycs', name: 'Chesterfield Inlet', province: 'Nunavut', latitude: 63.35, longitude: -90.73 },
  { code: 'ycm', name: 'St. Theresa Point', province: 'Manitoba', latitude: 53.85, longitude: -94.85 },
];

interface ECHourlyScrapeResult {
  temperature: number;
  timestamp: string;
}

/**
 * Scrapes Environment Canada's past conditions page for a station
 */
async function scrapeECStation(stationCode: string): Promise<ECHourlyScrapeResult | null> {
  try {
    const url = `https://weather.gc.ca/past_conditions/index_e.html?station=${stationCode}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = load(html);

    // Find the most recent temperature reading
    // Temperature is in a <b> tag within class="highLow" or "lowTemp"
    const tempElement = $('td.metricData b').first();
    
    if (tempElement.length > 0) {
      const tempText = tempElement.text().trim();
      // Extract temperature from format like "-49 (-49.3)" or "-49"
      const match = tempText.match(/(-?\d+\.?\d*)/);
      
      if (match) {
        const temp = parseFloat(match[1]);
        
        // Temperature found - use current time as timestamp
        const timestamp = new Date().toISOString();
        
        return { temperature: temp, timestamp };
      }
    }

    return null;
  } catch (error) {
    console.error(`Failed to scrape EC station ${stationCode}:`, error);
    return null;
  }
}

/**
 * Fetches observations from Environment Canada by scraping HTML pages
 * This is a pragmatic solution until we implement proper SWOB-ML parsing
 */
export async function fetchECHourlyObservations(): Promise<Observation[]> {
  console.log(`Fetching Environment Canada hourly observations for ${COLD_WEATHER_STATIONS.length} cold-weather stations...`);
  
  const observations: Observation[] = [];

  // Fetch stations in parallel (with concurrency limit)
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < COLD_WEATHER_STATIONS.length; i += BATCH_SIZE) {
    const batch = COLD_WEATHER_STATIONS.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.all(
      batch.map(async (station) => {
        const data = await scrapeECStation(station.code);
        
        if (data) {
          return {
            stationId: station.code.toUpperCase(),
            name: station.name,
            latitude: station.latitude,
            longitude: station.longitude,
            tempC: data.temperature,
            observationTime: data.timestamp,
            country: 'Canada',
            source: 'EC' as const,
          };
        }
        return null;
      })
    );

    observations.push(...results.filter((obs): obs is Observation => obs !== null));
  }

  console.log(`Fetched ${observations.length} Environment Canada hourly observations`);
  return observations;
}
