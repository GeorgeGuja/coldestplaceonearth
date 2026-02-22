/**
 * Test combined fetcher with SYNOP data
 */

import { fetchAllObservations } from './fetcher-combined.js';
import { findColdestPlaces } from './finder.js';

async function testWithSynop() {
  console.log('Testing combined fetcher with SYNOP integration...\n');
  
  try {
    const observations = await fetchAllObservations();
    
    console.log('\n=== OBSERVATION SOURCES ===');
    const bySources = observations.reduce((acc, obs) => {
      acc[obs.source] = (acc[obs.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    for (const [source, count] of Object.entries(bySources)) {
      console.log(`${source}: ${count}`);
    }
    
    console.log('\n=== FINDING COLDEST PLACES ===');
    const result = findColdestPlaces(observations);
    
    console.log('\n📍 COLDEST PLACE:');
    console.log(`  Station: ${result.coldest.stationId}${result.coldest.name ? ' (' + result.coldest.name + ')' : ''}`);
    console.log(`  Temperature: ${result.coldest.tempC}°C`);
    console.log(`  Source: ${result.coldest.source}`);
    console.log(`  Location: ${result.coldest.latitude}°, ${result.coldest.longitude}°`);
    console.log(`  Time: ${result.coldest.observationTime}`);
    
    console.log('\n🥶 TOP 5 COLDEST:');
    for (let i = 0; i < result.top5.length; i++) {
      const place = result.top5[i];
      console.log(`${i + 1}. ${place.stationId.padEnd(8)} ${place.tempC.toFixed(1).padStart(6)}°C  [${place.source}]  ${place.name || '(unknown)'}`);
    }
    
    console.log(`\nTotal stations: ${result.totalStations}`);
    console.log(`Last updated: ${result.lastUpdated}`);
    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

testWithSynop().catch(console.error);
