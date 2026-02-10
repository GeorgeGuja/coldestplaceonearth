import { z } from 'zod';

/**
 * METAR observation schema
 */
export const MetarObservationSchema = z.object({
  stationId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  tempC: z.number(),
  observationTime: z.string(),
});

export type MetarObservation = z.infer<typeof MetarObservationSchema>;

/**
 * Generic observation (from any source)
 */
export interface Observation {
  stationId: string;
  latitude: number;
  longitude: number;
  tempC: number;
  observationTime: string;
  name?: string;
  country?: string;
  source: 'METAR' | 'EC' | 'ISD' | 'SYNOP';
}

/**
 * Station with metadata
 */
export interface Station extends Observation {
  name: string;
  country: string;
}

/**
 * API response
 */
export interface ColdestPlacesResponse {
  coldest: Station;
  top5: Station[];
  totalStations: number;
  lastUpdated: string;
}
