/**
 * CreaBomber Custom Server
 * Integrates Next.js with Socket.io for real-time device communication
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './src/lib/socket-server';

// Load environment variables
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || (dev ? 'localhost' : '0.0.0.0');
const port = parseInt(process.env.PORT || '3000', 10);

// Parse CORS origins from environment
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : [`http://${hostname}:${port}`, 'http://localhost:3000', 'http://127.0.0.1:3000'];

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.io server with CORS configuration
  initSocketServer(httpServer, corsOrigins);

  // Start listening
  httpServer.listen(port, hostname, () => {
    const displayHost = hostname === '0.0.0.0' ? 'localhost' : hostname;
    console.log('');
    console.log('  ┌─────────────────────────────────────────────────────┐');
    console.log('  │                                                     │');
    console.log('  │   CreaBomber Server Started!                        │');
    console.log('  │                                                     │');
    console.log(`  │   Next.js:    http://${displayHost}:${port}`.padEnd(54) + '│');
    console.log(`  │   Socket.io:  ws://${displayHost}:${port}`.padEnd(54) + '│');
    console.log(`  │   Binding:    ${hostname}:${port}`.padEnd(54) + '│');
    console.log(`  │   Mode:       ${dev ? 'development' : 'production'}`.padEnd(54) + '│');
    console.log('  │                                                     │');
    console.log('  │   CORS Origins:                                     │');
    corsOrigins.forEach((origin) => {
      console.log(`  │     - ${origin}`.padEnd(54) + '│');
    });
    console.log('  │                                                     │');
    console.log('  └─────────────────────────────────────────────────────┘');
    console.log('');

    // Signal PM2 that app is ready (for wait_ready option)
    if (process.send) {
      process.send('ready');
    }
  });
});
