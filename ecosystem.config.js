/**
 * PM2 Ecosystem Configuration for CreaBomber
 *
 * Usage:
 *   Start:   pm2 start ecosystem.config.js
 *   Stop:    pm2 stop creabomber
 *   Restart: pm2 restart creabomber
 *   Logs:    pm2 logs creabomber
 *   Monitor: pm2 monit
 *
 * First-time setup:
 *   1. Install PM2 globally: npm install -g pm2
 *   2. Build the app: npm run build
 *   3. Start: pm2 start ecosystem.config.js
 *   4. Save process list: pm2 save
 *   5. Setup startup: pm2 startup (follow instructions)
 */

// Detect production environment for Docker
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  apps: [
    {
      // Application name (used for pm2 commands)
      name: 'creabomber',

      // Entry point script
      script: 'server.ts',

      // Use tsx in production (installed globally), ts-node in development
      interpreter: isProduction ? 'tsx' : 'node_modules/.bin/ts-node',
      interpreter_args: isProduction ? '' : '--project tsconfig.server.json -r tsconfig-paths/register',

      // Working directory
      cwd: __dirname,

      // Environment variables for production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        DATABASE_PATH: '/app/data/creabomber.db',
        CORS_ORIGINS: 'https://bomber.suimation.de,http://localhost:3000,http://127.0.0.1:3000',
      },

      // Environment variables for development
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOSTNAME: 'localhost',
      },

      // Restart behavior
      instances: 1, // Single instance (required for SQLite)
      autorestart: true,
      watch: false, // Don't watch files in production
      max_memory_restart: '500M',

      // Restart delay after crash (milliseconds)
      restart_delay: 5000,

      // Maximum restarts within window
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
