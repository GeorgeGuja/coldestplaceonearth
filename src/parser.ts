import { parse } from 'csv-parse/sync';
import { MetarObservationSchema } from './types.js';

interface MetarObservation {
  stationId: string;
  latitude: number;
  longitude: number;
  tempC: number;
  observationTime: string;
}

/**
 * Parses METAR CSV data into structured observations
 * 
 * CSV format:
 * station_id,latitude,longitude,temp_c,dewpoint_c,wind_dir_degrees,wind_speed_kt,...,observation_time
 */
export function parseMetarData(csvData: string): MetarObservation[] {
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });

  const observations: MetarObservation[] = [];

  for (const record of records) {
    try {
      // Extract fields we care about
      const stationId = record.station_id || record.raw_text?.split(' ')[0];
      const latitude = parseFloat(record.latitude);
      const longitude = parseFloat(record.longitude);
      const tempC = parseFloat(record.temp_c);
      const observationTime = record.observation_time;

      // Skip if missing critical data
      if (!stationId || isNaN(latitude) || isNaN(longitude) || isNaN(tempC)) {
        continue;
      }

      // Validate with Zod
      const observation = MetarObservationSchema.parse({
        stationId,
        latitude,
        longitude,
        tempC,
        observationTime,
      });

      observations.push(observation);
    } catch (error) {
      // Skip invalid records silently
      continue;
    }
  }

  console.log(`Parsed ${observations.length} valid METAR observations`);
  return observations;
}
