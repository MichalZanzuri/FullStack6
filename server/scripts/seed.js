// Seed MySQL from the legacy db.json (one-time migration).
//   * Every record gets a fresh UUID (ids are NOT sequential). We keep maps from
//     the old numeric id -> new UUID so foreign keys can be re-pointed.
//   * The old `website` field (which held the password) is moved into the
//     protected `credentials` table as a bcrypt hash.
//   * Orphaned rows (FK target missing in db.json) are skipped with a warning.
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool, query } from '../src/db.js';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
const DB_JSON = new URL('../db.json', import.meta.url);

async function main() {
  const raw = JSON.parse(await readFile(DB_JSON, 'utf8'));
  const users = raw.users || [];
  const todos = raw.todos || [];
  const posts = raw.posts || [];
  const comments = raw.comments || [];
  const albums = raw.albums || [];
  const photos = raw.photos || [];

  console.log('Resetting tables...');
  await query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of ['sessions', 'credentials', 'photos', 'albums', 'comments', 'posts', 'todos', 'users']) {
    await query(`TRUNCATE TABLE ${t}`);
  }
  await query('SET FOREIGN_KEY_CHECKS = 1');

  // old id -> new UUID maps (keyed by String(oldId))
  const uMap = new Map(), pMap = new Map(), aMap = new Map();
  const nu = (m, k) => m.get(String(k));

  // --- users + credentials ---
  console.log(`Seeding ${users.length} users...`);
  let adminAssigned = false;
  for (const u of users) {
    const id = randomUUID();
    uMap.set(String(u.id), id);
    const role = !adminAssigned ? 'admin' : 'user';  // first user becomes admin
    adminAssigned = true;
    await query(
      `INSERT INTO users (id, name, username, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, u.name || u.username, u.username, u.email || null, u.phone || null, role]
    );
    const plain = u.website || 'pulse123';   // legacy password lived in `website`
    const hash = await bcrypt.hash(String(plain), ROUNDS);
    await query(`INSERT INTO credentials (user_id, password_hash) VALUES (?, ?)`, [id, hash]);
  }

  // --- todos ---
  console.log(`Seeding ${todos.length} todos...`);
  for (const t of todos) {
    if (!nu(uMap, t.userId)) continue;
    await query(`INSERT INTO todos (id, user_id, title, completed) VALUES (?, ?, ?, ?)`,
      [randomUUID(), nu(uMap, t.userId), t.title || '', t.completed ? 1 : 0]);
  }

  // --- posts ---
  console.log(`Seeding ${posts.length} posts...`);
  for (const p of posts) {
    if (!nu(uMap, p.userId)) continue;
    const id = randomUUID();
    pMap.set(String(p.id), id);
    await query(`INSERT INTO posts (id, user_id, title, body) VALUES (?, ?, ?, ?)`,
      [id, nu(uMap, p.userId), p.title || '', p.body || null]);
  }

  // --- comments ---
  console.log(`Seeding ${comments.length} comments...`);
  let skippedC = 0;
  for (const c of comments) {
    if (!nu(pMap, c.postId)) { skippedC++; continue; }
    await query(`INSERT INTO comments (id, post_id, user_id, name, email, body) VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), nu(pMap, c.postId), nu(uMap, c.userId) || null, c.name || null, c.email || null, c.body || null]);
  }
  if (skippedC) console.log(`  (skipped ${skippedC} orphaned comment(s))`);

  // --- albums ---
  console.log(`Seeding ${albums.length} albums...`);
  for (const a of albums) {
    if (!nu(uMap, a.userId)) continue;
    const id = randomUUID();
    aMap.set(String(a.id), id);
    await query(`INSERT INTO albums (id, user_id, title) VALUES (?, ?, ?)`,
      [id, nu(uMap, a.userId), a.title || '']);
  }

  // --- photos ---
  console.log(`Seeding ${photos.length} photos...`);
  let skippedP = 0;
  for (const ph of photos) {
    if (!nu(aMap, ph.albumId)) { skippedP++; continue; }
    await query(`INSERT INTO photos (id, album_id, title, url, thumbnail_url) VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), nu(aMap, ph.albumId), ph.title || null, ph.url || null, ph.thumbnailUrl || null]);
  }
  if (skippedP) console.log(`  (skipped ${skippedP} orphaned photo(s))`);

  const [admin] = await query(`SELECT username FROM users WHERE role='admin' LIMIT 1`);
  console.log('\nDone. Admin user:', admin ? admin.username : 'none');
  console.log('All seeded users keep their original password (from db.json `website`).');
  await pool.end();
}

main().catch((e) => { console.error('SEED FAILED:', e); process.exit(1); });
