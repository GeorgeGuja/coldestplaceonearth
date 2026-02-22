/**
 * Check if Vostok station is in our SYNOP data
 */

import { fetchAntarcticSynop } from './fetcher-synop.js';
import { lookupStation } from './synop-metadata.js';

async function checkVostok() {
  console.log('Checking Antarctic SYNOP stations for Vostok...\n');
  
  const obs = await fetchAntarcticSynop();
  console.log(`Found ${obs.length} Antarctic SYNOP observations\n`);
  
  // Check each station
  console.log('Antarctic stations:\n');
  for (const o of obs) {
    const meta = await lookupStation(o.stationId);
    const name = meta?.name || 'Unknown';
    console.log(`${o.stationId}: ${o.temperature}°C - ${name}`);
    
    // Check if it's Vostok
    if (name.toLowerCase().includes('vostok')) {
      console.log('\n✅ FOUND VOSTOK!');
      console.log(`  Station ID: ${o.stationId}`);
      console.log(`  Temperature: ${o.temperature}°C`);
      console.log(`  Location: ${meta?.lat}°, ${meta?.lon}°`);
      console.log(`  Elevation: ${meta?.elevation}m`);
    }
  }
  
  // Also search the metadata database for Vostok
  console.log('\n\nSearching NOAA ISD database for Vostok stations...');
  const vostokIds = ['89606', '89512', '89502', '895060'];  // Common Vostok WMO IDs
  
  for (const id of vostokIds) {
    const meta = await lookupStation(id);
    if (meta) {
      console.log(`\nFound station ${id}:`);
      console.log(`  Name: ${meta.name}`);
      console.log(`  Location: ${meta.lat}°, ${meta.lon}°`);
      console.log(`  Country: ${meta.country}`);
      console.log(`  Active: ${meta.beginDate} to ${meta.endDate}`);
    }
  }
}

checkVostok();
