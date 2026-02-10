import { fetchMetarData } from './fetcher.js';
import { parseMetarData } from './parser.js';
import { fetchECHourlyObservations } from './fetcher-ec-hourly.js';
import { fetchAllColdRegionSynopEnriched } from './fetcher-synop.js';
import { Observation } from './types.js';

/**
 * Fetches observations from all data sources and combines them
 * Sources:
 * 1. NOAA SYNOP - ~10,000+ global weather stations (Russia, Canada, Greenland, Antarctica)
 * 2. NOAA METAR - ~5,000 global airports
 * 3. Environment Canada Hourly - Key Canadian cold-weather stations (manual list)
 */
export async function fetchAllObservations(): Promise<Observation[]> {
  const allObservations: Observation[] = [];

  // Fetch SYNOP data (global weather stations - highest priority for cold regions)
  console.log('Fetching SYNOP data from NOAA...');
  try {
    const synopObs = await fetchAllColdRegionSynopEnriched();
    allObservations.push(...synopObs);
    console.log(`Added ${synopObs.length} SYNOP observations`);
  } catch (error) {
    console.error('Failed to fetch SYNOP data:', error);
  }

  // Fetch METAR data (global airports)
  console.log('Fetching METAR data...');
  try {
    const metarCsv = await fetchMetarData();
    const metarObs = parseMetarData(metarCsv);
    
    // Deduplicate: Prefer SYNOP over METAR for same station
    const synopStationIds = new Set(
      allObservations.map(obs => obs.stationId.toUpperCase())
    );
    
    const uniqueMetarObs = metarObs.filter(obs => 
      !synopStationIds.has(obs.stationId.toUpperCase())
    );
    
    allObservations.push(...uniqueMetarObs.map(obs => ({
      ...obs,
      source: 'METAR' as const,
    })));
    
    console.log(`Added ${uniqueMetarObs.length} METAR observations (${metarObs.length - uniqueMetarObs.length} duplicates with SYNOP removed)`);
  } catch (error) {
    console.error('Failed to fetch METAR data:', error);
  }

  // Fetch Environment Canada hourly data (cold-weather stations)
  console.log('Fetching Environment Canada hourly observations...');
  try {
    const ecObs = await fetchECHourlyObservations();
    
    // Deduplicate: Remove EC stations that are already in METAR or SYNOP
    const existingStationIds = new Set(
      allObservations.map(obs => obs.stationId.toUpperCase())
    );
    
    const uniqueECObs = ecObs.filter(obs => !existingStationIds.has(obs.stationId.toUpperCase()));
    
    allObservations.push(...uniqueECObs);
    
    console.log(`Added ${uniqueECObs.length} unique Environment Canada observations (${ecObs.length - uniqueECObs.length} duplicates removed)`);
  } catch (error) {
    console.error('Failed to fetch Environment Canada data:', error);
  }

  console.log(`Total observations from all sources: ${allObservations.length}`);
  return allObservations;
}
