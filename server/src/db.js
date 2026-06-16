// MySQL connection pool (promise API). Every query function imports `pool`
// or the `query`/`one` helpers from here.
import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || 'pulse',
  password: process.env.DB_PASSWORD || 'pulsepass',
  database: process.env.DB_NAME || 'pulse',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4_unicode_ci',
  // Return BOOLEAN/TINYINT(1) as JS booleans so JSON output matches the client.
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      const v = field.string();
      return v === null ? null : v === '1';
    }
    return next();
  },
});

// Run a parameterized query, return the rows.
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Run a query expected to return a single row (or null).
export async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length ? rows[0] : null;
}

// Quick connectivity probe used at startup.
export async function ping() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}
