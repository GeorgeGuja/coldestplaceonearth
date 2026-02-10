/**
 * SYNOP (FM-12) Message Decoder
 * 
 * Decodes WMO SYNOP surface weather reports to extract temperature data.
 * 
 * SYNOP Format:
 * AAXX YYGGi IIiii iihVV Nddff 1SnTTT 2SnTdTdTd ...
 * 
 * Example:
 * AAXX 09001 30372 12699 61501 11338 21377 39283 40264 52012 60002 85931
 * 
 * Key groups:
 * - IIiii = Station identifier (5 digits)
 * - 1SnTTT = Temperature group
 *   - 1 = Group identifier
 *   - Sn = Sign (0=positive, 1=negative)
 *   - TTT = Temperature in tenths of degree Celsius
 */

import { z } from 'zod';

export interface SynopObservation {
  stationId: string;
  timestamp: Date;
  temperature: number | null;
  latitude?: number;
  longitude?: number;
}

const SynopMessageSchema = z.object({
  stationId: z.string(),
  temperature: z.number().nullable(),
  timestamp: z.date(),
});

/**
 * Decode a single SYNOP message line
 */
export function decodeSynopMessage(
  line: string,
  bulletinTimestamp?: Date
): SynopObservation | null {
  try {
    // Remove extra whitespace and split into groups
    const groups = line.trim().split(/\s+/);
    
    // Must have at least station ID and some data
    if (groups.length < 3) {
      return null;
    }

    // Find station ID (5-digit number, usually first or second group after AAXX)
    let stationIdIndex = -1;
    let stationId = '';
    
    for (let i = 0; i < Math.min(groups.length, 5); i++) {
      const group = groups[i];
      // Station ID is 5 digits, not starting with special markers
      if (/^\d{5}$/.test(group) && !group.startsWith('999')) {
        stationId = group;
        stationIdIndex = i;
        break;
      }
    }

    if (!stationId || stationIdIndex === -1) {
      return null;
    }

    // Find temperature group: 1SnTTT
    // In SYNOP format, temperature typically comes after station ID and weather groups
    // Look for patterns but prefer those in expected positions (not too early)
    let temperature: number | null = null;
    const temperatureCandidates: Array<{ temp: number; position: number }> = [];
    
    for (let i = stationIdIndex + 1; i < groups.length; i++) {
      const group = groups[i];
      
      // Temperature group starts with '1' and is 5 digits: 1SnTTT
      if (/^1[01]\d{3}$/.test(group)) {
        const sign = group[1];
        const tempStr = group.slice(2);
        
        // Parse temperature in tenths of degree
        const tempTenths = parseInt(tempStr, 10);
        
        // Check if valid (not missing indicator like 999)
        // Missing data is coded as /// or 999
        // Surface temperatures should be reasonable (-90°C to +60°C)
        if (tempTenths < 900 && !isNaN(tempTenths)) {
          let temp = tempTenths / 10.0;
          
          // Apply sign (1 = negative, 0 = positive)
          if (sign === '1') {
            temp = -temp;
          }
          
          // Sanity check: reject implausible surface temperatures
          // Lowest ever recorded: -89.2°C (Vostok, Antarctica)
          // Highest ever recorded: +56.7°C (Death Valley)
          if (temp >= -90 && temp <= 60) {
            temperatureCandidates.push({ temp, position: i });
          }
        }
      }
    }
    
    // Prefer temperature groups that appear after position 3 (after iihVV, Nddff)
    // This avoids picking up cloud groups or other data that might match the pattern
    if (temperatureCandidates.length > 0) {
      const preferred = temperatureCandidates.find(c => c.position >= stationIdIndex + 3);
      temperature = (preferred || temperatureCandidates[temperatureCandidates.length - 1]).temp;
    }

    // Use bulletin timestamp or current time
    const timestamp = bulletinTimestamp || new Date();

    return {
      stationId,
      temperature,
      timestamp,
    };
  } catch (error) {
    console.error('Error decoding SYNOP message:', error);
    return null;
  }
}

/**
 * Parse bulletin timestamp from header
 * Format: SMRA10 RUHB 090000
 * - 09 = day of month
 * - 0000 = hour/minute UTC
 */
export function parseBulletinTimestamp(header: string): Date | null {
  try {
    const parts = header.trim().split(/\s+/);
    if (parts.length < 3) return null;

    const timeStr = parts[2]; // e.g., "090000"
    if (!/^\d{6}$/.test(timeStr)) return null;

    const day = parseInt(timeStr.slice(0, 2), 10);
    const hour = parseInt(timeStr.slice(2, 4), 10);
    const minute = parseInt(timeStr.slice(4, 6), 10);

    // Use current year and month
    const now = new Date();
    const timestamp = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, minute)
    );

    return timestamp;
  } catch (error) {
    return null;
  }
}

/**
 * Parse entire SYNOP bulletin
 */
export function parseSynopBulletin(bulletin: string): SynopObservation[] {
  const observations: SynopObservation[] = [];
  const lines = bulletin.split('\n');

  // First line is usually header with timestamp
  let bulletinTimestamp: Date | null = null;
  if (lines.length > 0) {
    bulletinTimestamp = parseBulletinTimestamp(lines[0]);
  }

  // Process each line looking for SYNOP messages
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines, headers, and terminator lines
    if (
      !trimmed ||
      trimmed.startsWith('SM') ||
      trimmed === 'AAXX' ||
      trimmed.endsWith('=') && trimmed.length < 10
    ) {
      continue;
    }

    // Decode the SYNOP message
    const obs = decodeSynopMessage(trimmed, bulletinTimestamp || undefined);
    if (obs && obs.temperature !== null) {
      observations.push(obs);
    }
  }

  return observations;
}

/**
 * Validate SYNOP observation
 */
export function validateSynopObservation(
  obs: unknown
): obs is SynopObservation {
  try {
    SynopMessageSchema.parse(obs);
    return true;
  } catch {
    return false;
  }
}

/**
 * Filter observations to only include valid temperature readings
 */
export function filterValidTemperatures(
  observations: SynopObservation[]
): SynopObservation[] {
  return observations.filter(
    (obs) => obs.temperature !== null && Math.abs(obs.temperature) < 100
  );
}
