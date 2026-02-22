/**
 * NOAA SYNOP Data Fetcher
 * 
 * Fetches SYNOP (FM-12) surface weather observations from NOAA's FTP server.
 * 
 * Data source: https://tgftp.nws.noaa.gov/data/raw/sm/
 * 
 * SYNOP bulletins are organized by region:
 * - smra*.txt = Russia (Roshydromet)
 * - smca*.txt = Canada
 * - smgl*.txt = Greenland
 * - sman*.txt = Antarctica
 * - etc.
 */

import { parseSynopBulletin, SynopObservation } from './synop-decoder.js';
import { lookupStation } from './synop-metadata.js';
import type { Observation } from './types.js';

const NOAA_SYNOP_BASE = 'https://tgftp.nws.noaa.gov/data/raw/sm/';

// Cache duration: 3 hours (SYNOP reports are typically 3-6 hourly)
const CACHE_DURATION_MS = 3 * 60 * 60 * 1000;

interface CachedData {
  observations: SynopObservation[];
  fetchedAt: Date;
}

const cache = new Map<string, CachedData>();

/**
 * Fetch a single SYNOP bulletin file
 */
async function fetchBulletin(filename: string): Promise<string> {
  const url = `${NOAA_SYNOP_BASE}${filename}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ColdestPlace/1.0 (Weather monitoring app)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch bulletin ${filename}:`, error);
    throw error;
  }
}

/**
 * List available bulletin files matching a pattern
 */
async function listBulletinFiles(pattern: RegExp): Promise<string[]> {
  try {
    const response = await fetch(NOAA_SYNOP_BASE);
    const html = await response.text();

    // Extract filenames from HTML directory listing
    const files: string[] = [];
    const regex = /href="([^"]+\.txt)"/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const filename = match[1];
      if (pattern.test(filename)) {
        files.push(filename);
      }
    }

    return files;
  } catch (error) {
    console.error('Failed to list bulletin files:', error);
    return [];
  }
}

/**
 * Fetch SYNOP observations from multiple bulletin files
 */
async function fetchBulletins(
  pattern: RegExp,
  maxFiles: number = 50
): Promise<SynopObservation[]> {
  // Check cache
  const cacheKey = pattern.source;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    const age = Date.now() - cached.fetchedAt.getTime();
    if (age < CACHE_DURATION_MS) {
      console.log(`Using cached SYNOP data (age: ${Math.round(age / 60000)}min)`);
      return cached.observations;
    }
  }

  console.log(`Fetching SYNOP bulletins matching: ${pattern}`);
  
  // List available files
  const files = await listBulletinFiles(pattern);
  console.log(`Found ${files.length} bulletin files`);

  if (files.length === 0) {
    return [];
  }

  // Limit number of files to fetch
  const filesToFetch = files.slice(0, maxFiles);

  // Fetch bulletins in parallel (with rate limiting)
  const chunkSize = 10; // Fetch 10 at a time to avoid overwhelming server
  const allObservations: SynopObservation[] = [];

  for (let i = 0; i < filesToFetch.length; i += chunkSize) {
    const chunk = filesToFetch.slice(i, i + chunkSize);
    
    const results = await Promise.allSettled(
      chunk.map(async (file) => {
        const bulletin = await fetchBulletin(file);
        return parseSynopBulletin(bulletin);
      })
    );

    // Collect successful results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allObservations.push(...result.value);
      }
    }

    // Small delay between chunks to be respectful to server
    if (i + chunkSize < filesToFetch.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`Decoded ${allObservations.length} SYNOP observations`);

  // Update cache
  cache.set(cacheKey, {
    observations: allObservations,
    fetchedAt: new Date(),
  });

  return allObservations;
}

/**
 * Fetch Russian SYNOP observations
 * Includes Siberian stations like Oymyakon, Verkhoyansk, etc.
 */
export async function fetchRussianSynop(): Promise<SynopObservation[]> {
  // Pattern matches: smra*.txt, smru*.txt
  return fetchBulletins(/^sm[ru][a-z]\d+\./i, 30);
}

/**
 * Fetch Canadian SYNOP observations
 */
export async function fetchCanadianSynop(): Promise<SynopObservation[]> {
  // Pattern matches: smca*.txt
  return fetchBulletins(/^smca\d+\./i, 20);
}

/**
 * Fetch Greenland SYNOP observations
 */
export async function fetchGreenlandSynop(): Promise<SynopObservation[]> {
  // Pattern matches: smgl*.txt
  return fetchBulletins(/^smgl\d+\./i, 10);
}

/**
 * Fetch Antarctic SYNOP observations
 * Antarctic stations use WMO blocks 89xxx and are distributed through various meteorological centers
 */
export async function fetchAntarcticSynop(): Promise<SynopObservation[]> {
  // Pattern matches bulletins from:
  // - smaa*.ammc = Australian Met Center (manages Antarctic stations)
  // - smaa*.nzsp = New Zealand Met Service (manages some Antarctic stations)
  // - smaa*.sawb = South African Weather Service (manages multiple Antarctic stations)
  // - smaa*.lfpw = Météo-France (manages Dumont d'Urville, Concordia)
  // - smaa*.liib = Italian Met Service (manages Mario Zucchelli, Concordia)
  // - smaa*.ruml = Russian Met Service (manages Vostok, Mirny, Progress, etc.)
  const patterns = [
    /^smaa\d+\.ammc\./i,
    /^smaa\d+\.nzsp\./i,
    /^smaa\d+\.sawb\./i,
    /^smaa\d+\.lfpw\./i,
    /^smaa\d+\.liib\./i,
    /^smaa\d+\.ruml\./i,
  ];
  
  const allObs: SynopObservation[] = [];
  
  for (const pattern of patterns) {
    try {
      const obs = await fetchBulletins(pattern, 20);
      allObs.push(...obs);
    } catch (error) {
      console.error(`Failed to fetch Antarctic bulletins matching ${pattern}:`, error);
    }
  }
  
  return allObs;
}

/**
 * Fetch all cold-region SYNOP observations
 */
export async function fetchAllColdRegionSynop(): Promise<SynopObservation[]> {
  console.log('Fetching SYNOP data from all cold regions...');

  const [russia, canada, greenland, antarctica] = await Promise.all([
    fetchRussianSynop(),
    fetchCanadianSynop(),
    fetchGreenlandSynop(),
    fetchAntarcticSynop(),
  ]);

  const all = [...russia, ...canada, ...greenland, ...antarctica];
  
  console.log('SYNOP observations by region:');
  console.log(`  Russia: ${russia.length}`);
  console.log(`  Canada: ${canada.length}`);
  console.log(`  Greenland: ${greenland.length}`);
  console.log(`  Antarctica: ${antarctica.length}`);
  console.log(`  Total: ${all.length}`);

  return all;
}

/**
 * Fetch all cold-region SYNOP observations with metadata enrichment
 * Returns fully enriched Observation objects with names and coordinates
 */
export async function fetchAllColdRegionSynopEnriched(): Promise<Observation[]> {
  const synopObs = await fetchAllColdRegionSynop();
  const deduplicated = deduplicateSynopObservations(synopObs);
  const enriched = await enrichObservations(deduplicated);
  
  console.log(`Enriched ${enriched.length} SYNOP observations with metadata`);
  
  return enriched;
}

/**
 * Convert multiple SYNOP observations to enriched Observations
 */
async function enrichObservations(synopObs: SynopObservation[]): Promise<Observation[]> {
  const enriched: Observation[] = [];
  
  for (const synop of synopObs) {
    // Skip observations without temperature data
    if (synop.temperature === null) {
      continue;
    }
    
    const metadata = await lookupStation(synop.stationId);
    
    const obs: Observation = {
      stationId: synop.stationId,
      latitude: metadata?.lat || 0,
      longitude: metadata?.lon || 0,
      tempC: synop.temperature,
      observationTime: synop.timestamp.toISOString(),
      name: metadata?.name || `Station ${synop.stationId}`,
      country: metadata?.country || 'Unknown',
      source: 'SYNOP',
    };
    
    enriched.push(obs);
  }
  
  return enriched;
}

/**
 * Deduplicate observations (same station, keep most recent)
 */
export function deduplicateSynopObservations(
  observations: SynopObservation[]
): SynopObservation[] {
  const byStation = new Map<string, SynopObservation>();

  for (const obs of observations) {
    const existing = byStation.get(obs.stationId);
    
    if (!existing || obs.timestamp > existing.timestamp) {
      byStation.set(obs.stationId, obs);
    }
  }

  return Array.from(byStation.values());
}
