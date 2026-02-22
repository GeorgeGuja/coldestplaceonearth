/**
 * Test SYNOP metadata enrichment
 */

import { fetchAllColdRegionSynopEnriched } from './fetcher-synop.js';

async function testEnrichment() {
  console.log('Testing SYNOP metadata enrichment...\n');
  
  try {
    const observations = await fetchAllColdRegionSynopEnriched();
    
    console.log(`\n✅ Fetched ${observations.length} enriched SYNOP observations\n`);
    
    // Find coldest observations
    const coldest = observations
      .sort((a, b) => a.tempC - b.tempC)
      .slice(0, 10);
    
    console.log('📍 TOP 10 COLDEST PLACES (with metadata enrichment):\n');
    
    coldest.forEach((obs, idx) => {
      const hasCoords = obs.latitude !== undefined && obs.longitude !== undefined;
      const coordStr = hasCoords 
        ? `(${obs.latitude?.toFixed(2)}°, ${obs.longitude?.toFixed(2)}°)` 
        : '(no coordinates)';
      
      console.log(
        `${idx + 1}. ${obs.name || obs.stationId}: ${obs.tempC.toFixed(1)}°C ${coordStr} [${obs.source}]`
      );
    });
    
    // Statistics
    const withNames = observations.filter(obs => obs.name && !obs.name.startsWith('Station ')).length;
    const withCoords = observations.filter(obs => obs.latitude !== undefined && obs.longitude !== undefined).length;
    
    console.log('\n📊 Metadata Coverage:');
    console.log(`  Stations with names: ${withNames}/${observations.length} (${(withNames/observations.length*100).toFixed(1)}%)`);
    console.log(`  Stations with coordinates: ${withCoords}/${observations.length} (${(withCoords/observations.length*100).toFixed(1)}%)`);
    
    // Show a few examples with full details
    console.log('\n🔍 Sample enriched observations:');
    const samples = coldest.slice(0, 3);
    samples.forEach((obs) => {
      console.log(`\nStation: ${obs.stationId}`);
      console.log(`  Name: ${obs.name || 'N/A'}`);
      console.log(`  Temperature: ${obs.tempC.toFixed(1)}°C`);
      console.log(`  Location: ${obs.latitude?.toFixed(4)}°, ${obs.longitude?.toFixed(4)}°`);
      console.log(`  Time: ${obs.observationTime}`);
      console.log(`  Source: ${obs.source}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testEnrichment();
