/**
 * Test SYNOP decoder with real data
 */

import { parseSynopBulletin } from './synop-decoder.js';

const SAMPLE_BULLETIN = `SMRA10 RUHB 090000
AAXX 09001
30372 12699 61501 11338 21377 39283 40264 52012 60002 85931 333 21349
47016 55086=
30433 129// 30101 11234 21259 39652 40302 52001 60002 83030 333 21246
47051 55018=
30554 129// 80000 11189 21215 39087 40234 52005 60002 8807/ 333 21189
47010 55019=
30635 128// 70601 11237 21261 39673 40299 52005 60002 82031 333 21248
47018=
30673 12999 83101 11233 21258 39301 40227 52005 60002 81015 333 21239
47023 55021=
30758 11996 13501 11257 21283 39371 40272 52010 60002 70500 81040 333
21257 47012 55081=
30802 12999 02403 11114 21198 38695 48476 52013 60002 333 21206
55028=
30823 626// 82703 11212 21255 39610 40301 52006 60002 8555/ 333 21222
47020 55066=
30879 12999 30000 11249 21277 39419 40254 52010 60002 80005 333 21250
47016 55080=
30935 12999 80000 11214 21244 39295 40309 52011 60002 86041 333 21253
47016 55082=
30949 12999 62801 11223 21259 39091 40273 52006 60002 82041 333 21246
47002=
30965 12999 70701 11266 21295 39346 40256 52005 60002 80002 333 21276
47006 55092=
31168 42999 83602 11132 21257 30011 40022 57002 82064 333 55068=
31285 42999 11802 11209 21258 30040 40124 53004 81030=
31300 11993 00000 11251 21257 39864 40181 52009 60002 74840 333 21254
47021=`;

async function testSynopDecoder() {
  console.log('Testing SYNOP decoder...\n');
  
  const observations = parseSynopBulletin(SAMPLE_BULLETIN);
  
  console.log(`Decoded ${observations.length} observations\n`);
  
  // Show first 10 observations
  console.log('Sample observations:');
  console.log('Station ID | Temperature (°C) | Timestamp');
  console.log('-----------|------------------|----------');
  
  for (const obs of observations.slice(0, 10)) {
    const tempStr = obs.temperature !== null 
      ? obs.temperature.toFixed(1).padStart(6) 
      : '  null';
    console.log(`${obs.stationId}     | ${tempStr}           | ${obs.timestamp.toISOString()}`);
  }
  
  // Find coldest
  const withTemp = observations.filter(o => o.temperature !== null);
  if (withTemp.length > 0) {
    const coldest = withTemp.reduce((min, obs) => 
      obs.temperature! < min.temperature! ? obs : min
    );
    
    console.log(`\nColdest observation:`);
    console.log(`  Station: ${coldest.stationId}`);
    console.log(`  Temperature: ${coldest.temperature}°C`);
    console.log(`  Time: ${coldest.timestamp.toISOString()}`);
  }
}

testSynopDecoder().catch(console.error);
