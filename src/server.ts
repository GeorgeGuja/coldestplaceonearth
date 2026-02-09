import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fetchAllObservations } from './fetcher-combined.js';
import { findColdestPlaces } from './finder.js';

const PORT = process.env.PORT || 3000;

/**
 * Simple HTTP server for local MVP
 */
const server = createServer(async (req, res) => {
  const url = req.url || '/';

  // API endpoint
  if (url === '/api/coldest') {
    try {
      console.log('Processing request for coldest places...');
      console.log('Fetching observations from all sources (METAR + Environment Canada)...');
      
      const observations = await fetchAllObservations();
      const result = findColdestPlaces(observations);

      const response = {
        ...result,
        lastUpdated: new Date().toISOString(),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response, null, 2));
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
  let filePath = join(publicDir, url === '/' ? 'index.html' : url);

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
