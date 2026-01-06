/**
 * CreaBomber Custom Server
 * Integrates Next.js with Socket.io for real-time device communication
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './src/lib/socket-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.io server
  initSocketServer(httpServer);

  // Start listening
  httpServer.listen(port, () => {
    console.log('');
    console.log('  ┌─────────────────────────────────────────────┐');
    console.log('  │                                             │');
    console.log('  │   🚀 CreaBomber Server Started!             │');
    console.log('  │                                             │');
    console.log(`  │   📡 Next.js:    http://${hostname}:${port}          │`);
    console.log(`  │   🔌 Socket.io:  ws://${hostname}:${port}            │`);
    console.log(`  │   📊 Mode:       ${dev ? 'development' : 'production'}               │`);
    console.log('  │                                             │');
    console.log('  └─────────────────────────────────────────────┘');
    console.log('');
  });
});
