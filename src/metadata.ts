/**
 * Station metadata lookup
 * For MVP, we'll use a simple in-memory map
 * 
 * TODO: Replace with comprehensive station database
 */

interface StationMetadata {
  name: string;
  country: string;
}

// Basic station lookup (will expand as needed)
const STATION_DATABASE: Record<string, StationMetadata> = {
  // Arctic/Antarctic research stations
  'NZSP': { name: 'Amundsen-Scott South Pole Station', country: 'Antarctica' },
  'NZPG': { name: 'Pegasus Field', country: 'Antarctica' },
  'NZIR': { name: 'McMurdo Station', country: 'Antarctica' },
  'SAWB': { name: 'Belgrano II Base', country: 'Antarctica' },
  
  // Russia (Siberia)
  'UHMM': { name: 'Mirny Airport', country: 'Russia' },
  'UEST': { name: 'Tiksi Airport', country: 'Russia' },
  'UOOO': { name: 'Oymyakon', country: 'Russia' },
  'UEEE': { name: 'Yakutsk Airport', country: 'Russia' },
  'UHPP': { name: 'Pevek Airport', country: 'Russia' },
  
  // Canada
  'CYYC': { name: 'Calgary International Airport', country: 'Canada' },
  'CYEG': { name: 'Edmonton International Airport', country: 'Canada' },
  'CYVR': { name: 'Vancouver International Airport', country: 'Canada' },
  'CYYZ': { name: 'Toronto Pearson International', country: 'Canada' },
  'CYUL': { name: 'Montreal-Trudeau International', country: 'Canada' },
  'CYQB': { name: 'Quebec City Jean Lesage International', country: 'Canada' },
  'CYWG': { name: 'Winnipeg James Armstrong Richardson International', country: 'Canada' },
  'CYOW': { name: 'Ottawa Macdonald-Cartier International', country: 'Canada' },
  'CYHZ': { name: 'Halifax Stanfield International', country: 'Canada' },
  'CYYT': { name: "St. John's International Airport", country: 'Canada' },
  
  // Greenland
  'BGBW': { name: 'Narsarsuaq Airport', country: 'Greenland' },
  'BGGH': { name: 'Nuuk Airport', country: 'Greenland' },
  'BGTL': { name: 'Thule Air Base', country: 'Greenland' },
  
  // Alaska
  'PANC': { name: 'Ted Stevens Anchorage International', country: 'United States' },
  'PAFA': { name: 'Fairbanks International Airport', country: 'United States' },
  'PABR': { name: 'Wiley Post-Will Rogers Memorial Airport', country: 'United States' },
  
  // Test stations
  'KJFK': { name: 'John F. Kennedy International Airport', country: 'United States' },
  'EGLL': { name: 'London Heathrow Airport', country: 'United Kingdom' },
  'LFPG': { name: 'Paris Charles de Gaulle Airport', country: 'France' },
  'EDDF': { name: 'Frankfurt Airport', country: 'Germany' },
  'RJTT': { name: 'Tokyo Haneda Airport', country: 'Japan' },
  'YSSY': { name: 'Sydney Kingsford Smith Airport', country: 'Australia' },
};

/**
 * Looks up station metadata by ICAO code
 * Falls back to generic naming if not in database
 */
export function lookupStationMetadata(stationId: string): StationMetadata {
  const metadata = STATION_DATABASE[stationId];
  
  if (metadata) {
    return metadata;
  }
  
  // Fallback: Use station ID and try to guess country from prefix
  const prefix = stationId.substring(0, 1);
  let country = 'Unknown';
  
  // ICAO prefix patterns
  if (prefix === 'K') country = 'United States';
  else if (prefix === 'C') country = 'Canada';
  else if (prefix === 'E') country = 'Europe';
  else if (prefix === 'U') country = 'Russia';
  else if (prefix === 'Y') country = 'Australia';
  else if (prefix === 'N' && stationId.startsWith('NZ')) country = 'Antarctica/New Zealand';
  else if (prefix === 'S') country = 'South America';
  else if (prefix === 'P') country = 'Pacific';
  
  return {
    name: `${stationId} Station`,
    country,
  };
}
