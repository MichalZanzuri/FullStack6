// Server entry point. Verifies the DB connection, then starts listening.
import 'dotenv/config';
import { createApp } from './app.js';
import { ping } from './db.js';

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  try {
    await ping();
    console.log('✓ MySQL connection OK');
  } catch (e) {
    console.error('✗ Could not connect to MySQL. Is the container up? (npm run db:up)');
    console.error('  ', e.message);
    process.exit(1);
  }

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`✓ Pulse API (Express + MySQL) listening on http://localhost:${PORT}`);
  });
}

start();
