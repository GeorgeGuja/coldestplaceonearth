import { fetchMetarData } from './fetcher.js';
import { parseMetarData } from './parser.js';
import { fetchECHourlyObservations } from './fetcher-ec-hourly.js';
import { Observation } from './types.js';

/**
 * Fetches observations from all data sources and combines them
 * Sources:
 * 1. NOAA METAR - ~10,000 global airports
 * 2. Environment Canada Hourly - Key Canadian cold-weather stations (including Thomsen River)
 */
export async function fetchAllObservations(): Promise<Observation[]> {
  const allObservations: Observation[] = [];

  // Fetch METAR data (global airports)
  console.log('Fetching METAR data...');
  try {
    const metarCsv = await fetchMetarData();
    const metarObs = parseMetarData(metarCsv);
    allObservations.push(...metarObs.map(obs => ({
      ...obs,
      source: 'METAR' as const,
    })));
    console.log(`Added ${metarObs.length} METAR observations`);
  } catch (error) {
    console.error('Failed to fetch METAR data:', error);
  }

  // Fetch Environment Canada hourly data (cold-weather stations)
  console.log('Fetching Environment Canada hourly observations...');
  try {
    const ecObs = await fetchECHourlyObservations();
    
    // Deduplicate: Remove EC stations that are already in METAR
    const metarStationIds = new Set(
      allObservations.map(obs => obs.stationId.toUpperCase())
    );
    
    const uniqueECObs = ecObs.filter(obs => !metarStationIds.has(obs.stationId.toUpperCase()));
    
    allObservations.push(...uniqueECObs);
    
    console.log(`Added ${uniqueECObs.length} unique Environment Canada observations (${ecObs.length - uniqueECObs.length} duplicates removed)`);
  } catch (error) {
    console.error('Failed to fetch Environment Canada data:', error);
  }

  console.log(`Total observations from all sources: ${allObservations.length}`);
  return allObservations;
}
