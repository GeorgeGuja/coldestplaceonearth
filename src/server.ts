import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import cron from 'node-cron';
import { fetchAllObservations } from './fetcher-combined.js';
import { findColdestPlaces } from './finder.js';

const PORT = process.env.PORT || 3000;

type CachedResult = ReturnType<typeof findColdestPlaces> & { lastUpdated: string };
let cachedResult: CachedResult | null = null;

async function refreshData(): Promise<void> {
  console.log('[cron] Refreshing coldest places data...');
  const observations = await fetchAllObservations();
  const result = findColdestPlaces(observations);
  cachedResult = { ...result, lastUpdated: new Date().toISOString() };
  console.log(`[cron] Refresh complete. ${cachedResult.totalStations} stations, ${Object.keys(cachedResult.sources).join('/')} sources.`);
}

const server = createServer(async (req, res) => {
  const url = req.url || '/';

  // API endpoint
  if (url === '/api/coldest') {
    try {
      if (cachedResult === null) {
        console.log('Cache cold — fetching live data for first request...');
        await refreshData();
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      });
      res.end(JSON.stringify(cachedResult, null, 2));
    } catch (error) {
      console.error('Error processing request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Failed to fetch coldest places',
        message: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
    return;
  }

  // Serve static files
  const publicDir = join(process.cwd(), 'public');
  const filePath = join(publicDir, url === '/' ? 'index.html' : url);

  try {
    const content = readFileSync(filePath);
    const ext = extname(filePath);

    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(content);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🌡️  ColdestPlace server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop\n');
});

cron.schedule('0 * * * *', () => { refreshData().catch(console.error); });
console.log('[cron] Hourly refresh scheduled (fires at :00 each hour)');
refreshData().catch(console.error); // pre-warm cache on startup
