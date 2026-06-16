// Dedicated query functions for `posts`.
import { randomUUID } from 'node:crypto';
import { query, one } from '../db.js';
import { paginate, MAX_ROWS } from './_helpers.js';

// Each post carries its author's name/username (via JOIN), so the client can
// label posts WITHOUT fetching the whole users table — this is what lets the
// feed scale to a huge user base.
const COLS = `p.id, p.user_id AS userId, p.title, p.body,
              u.username AS authorUsername, u.name AS authorName`;
const FROM = `FROM posts p JOIN users u ON u.id = p.user_id`;

export async function list(q = {}) {
  const where = ['p.is_deleted = 0'];
  const params = [];
  if (q.userId !== undefined) { where.push('p.user_id = ?'); params.push(q.userId); }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const sortCol = { id: 'p.id', title: 'p.title' }[q._sort] || 'p.id';
  const order = String(q._order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const orderSql = `ORDER BY ${sortCol} ${order}`;

  if (q._page !== undefined || q._per_page !== undefined) {
    return paginate({
      dataSql: `SELECT ${COLS} ${FROM} ${whereSql} ${orderSql}`,
      countSql: `SELECT COUNT(*) AS cnt ${FROM} ${whereSql}`,
      params,
      page: q._page,
      perPage: q._per_page,
    });
  }
  // No pagination requested → still hard-capped so it can't return unbounded rows.
  return query(`SELECT ${COLS} ${FROM} ${whereSql} ${orderSql} LIMIT ${MAX_ROWS}`, params);
}

export async function getById(id) {
  return one(`SELECT ${COLS} ${FROM} WHERE p.id = ? AND p.is_deleted = 0`, [id]);
}

export async function create({ userId, title, body }) {
  const id = randomUUID();
  await query(
    `INSERT INTO posts (id, user_id, title, body) VALUES (?, ?, ?, ?)`,
    [id, userId, title || '', body || null]
  );
  return getById(id);
}

export async function update(id, fields) {
  const sets = [];
  const params = [];
  if (fields.title !== undefined) { sets.push('title = ?'); params.push(fields.title); }
  if (fields.body !== undefined) { sets.push('body = ?'); params.push(fields.body); }
  if (sets.length) {
    params.push(id);
    await query(`UPDATE posts SET ${sets.join(', ')} WHERE id = ? AND is_deleted = 0`, params);
  }
  return getById(id);
}

// Soft-deleting a post also soft-deletes its comments (regardless of who wrote
// them) so the thread disappears as a unit — no orphaned comments left behind.
// One server-side operation instead of many client round-trips.
export async function softDelete(id) {
  const res = await query(`UPDATE posts SET is_deleted = 1 WHERE id = ? AND is_deleted = 0`, [id]);
  if (res.affectedRows > 0) {
    await query(`UPDATE comments SET is_deleted = 1 WHERE post_id = ? AND is_deleted = 0`, [id]);
  }
  return res.affectedRows > 0;
}

export async function ownerOf(id) {
  const row = await one(`SELECT user_id AS userId FROM posts WHERE id = ?`, [id]);
  return row ? row.userId : null;
}
