// Dedicated query functions for `users` (+ the protected `credentials` table).
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool, query, one } from '../db.js';
import { paginate } from './_helpers.js';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

// FULL projection — the user's own profile (returned to themselves / admin).
const FULL_COLS = `id, name, username, email, phone, role, is_blocked AS isBlocked`;
// LEAN projection — the minimum other users are allowed to see (#3 expose-minimum).
const LEAN_COLS = `id, name, username`;

// The user list is ALWAYS bounded — never "SELECT * FROM users" with a million
// rows. We page it (default 50, hard max 100) and return the same wrapper shape
// as the other paginated resources: { data, first, prev, next, last, pages, items }.
const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 100;
const clampPerPage = (pp) => Math.min(Math.max(1, Number(pp) || DEFAULT_PER_PAGE), MAX_PER_PAGE);

// Lean list (paginated). No emails/phones leak.
export async function findAllLean({ page, perPage } = {}) {
  return paginate({
    dataSql: `SELECT ${LEAN_COLS} FROM users WHERE is_deleted = 0 ORDER BY id`,
    countSql: `SELECT COUNT(*) AS cnt FROM users WHERE is_deleted = 0`,
    params: [],
    page: page || 1,
    perPage: clampPerPage(perPage),
  });
}

// Full list — admin only (paginated, capped).
export async function findAll({ page, perPage } = {}) {
  return paginate({
    dataSql: `SELECT ${FULL_COLS} FROM users WHERE is_deleted = 0 ORDER BY id`,
    countSql: `SELECT COUNT(*) AS cnt FROM users WHERE is_deleted = 0`,
    params: [],
    page: page || 1,
    perPage: clampPerPage(perPage),
  });
}

// Full profile (self / admin).
export async function findById(id) {
  return one(`SELECT ${FULL_COLS} FROM users WHERE id = ? AND is_deleted = 0`, [id]);
}

// Lean profile (anyone else looking at a user).
export async function findByIdLean(id) {
  return one(`SELECT ${LEAN_COLS} FROM users WHERE id = ? AND is_deleted = 0`, [id]);
}

export async function findByUsername(username) {
  return one(`SELECT ${FULL_COLS} FROM users WHERE username = ? AND is_deleted = 0`, [username]);
}

export async function usernameTaken(username) {
  const row = await one(`SELECT id FROM users WHERE username = ?`, [username]);
  return !!row;
}

// Verify credentials against the protected table. Returns the public user on
// success, { blocked:true } if blocked, or null on failure.
export async function verifyCredentials(username, password) {
  const row = await one(
    `SELECT u.id, u.name, u.username, u.email, u.phone, u.role,
            u.is_blocked AS isBlocked, u.is_deleted AS isDeleted,
            c.password_hash AS hash
       FROM users u
       JOIN credentials c ON c.user_id = u.id
      WHERE u.username = ?`,
    [username]
  );
  if (!row || row.isDeleted) return null;
  const ok = await bcrypt.compare(String(password), row.hash);
  if (!ok) return null;
  if (row.isBlocked) return { blocked: true };
  const { hash, isDeleted, ...publicUser } = row;
  return publicUser;
}

// Create a user + its credentials row in one transaction.
export async function create({ name, username, email, phone, password }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = randomUUID();
    await conn.execute(
      `INSERT INTO users (id, name, username, email, phone) VALUES (?, ?, ?, ?, ?)`,
      [id, name || username, username, email || null, phone || null]
    );
    const hash = await bcrypt.hash(String(password), ROUNDS);
    await conn.execute(`INSERT INTO credentials (user_id, password_hash) VALUES (?, ?)`, [id, hash]);
    await conn.commit();
    return findById(id);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// Update editable profile fields (never username/role/password here).
export async function update(id, { name, email, phone }) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (email !== undefined) { sets.push('email = ?'); params.push(email); }
  if (phone !== undefined) { sets.push('phone = ?'); params.push(phone); }
  if (sets.length) {
    params.push(id);
    await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return findById(id);
}

export async function changePassword(id, newPassword) {
  const hash = await bcrypt.hash(String(newPassword), ROUNDS);
  const res = await query(`UPDATE credentials SET password_hash = ? WHERE user_id = ?`, [hash, id]);
  return res.affectedRows > 0;
}

export async function checkPassword(id, password) {
  const row = await one(`SELECT password_hash AS hash FROM credentials WHERE user_id = ?`, [id]);
  if (!row) return false;
  return bcrypt.compare(String(password), row.hash);
}

export async function setBlocked(id, blocked) {
  const res = await query(`UPDATE users SET is_blocked = ? WHERE id = ?`, [blocked ? 1 : 0, id]);
  return res.affectedRows > 0;
}

export async function setRole(id, role) {
  const res = await query(`UPDATE users SET role = ? WHERE id = ?`, [role, id]);
  return res.affectedRows > 0;
}

export async function softDelete(id) {
  const res = await query(`UPDATE users SET is_deleted = 1 WHERE id = ?`, [id]);
  return res.affectedRows > 0;
}
