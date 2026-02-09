import { Observation, Station } from './types.js';
import { lookupStationMetadata } from './metadata.js';

/**
 * Finds the coldest place(s) from all observations
 * CRITICAL: No pre-filtering by region - scans ALL stations globally
 */
export function findColdestPlaces(observations: Observation[]): {
  coldest: Station;
  top5: Station[];
  totalStations: number;
  sources: Record<string, number>;
} {
  if (observations.length === 0) {
    throw new Error('No observations to process');
  }

  // Sort by temperature (coldest first)
  const sorted = [...observations].sort((a, b) => a.tempC - b.tempC);

  // Take top 5
  const top5Observations = sorted.slice(0, 5);

  // Enrich with metadata (if not already present)
  const top5 = top5Observations.map((obs) => {
    const metadata = obs.name && obs.country 
      ? { name: obs.name, country: obs.country }
      : lookupStationMetadata(obs.stationId);
    
    return {
      ...obs,
      ...metadata,
    };
  });

  // Count observations by source
  const sources: Record<string, number> = {};
  for (const obs of observations) {
    sources[obs.source] = (sources[obs.source] || 0) + 1;
  }

  return {
    coldest: top5[0],
    top5,
    totalStations: observations.length,
    sources,
  };
}
