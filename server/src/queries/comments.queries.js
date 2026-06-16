// Dedicated query functions for `comments`.
import { randomUUID } from 'node:crypto';
import { query, one } from '../db.js';
import { paginate, MAX_ROWS } from './_helpers.js';

const COLS = `id, post_id AS postId, user_id AS userId, name, email, body`;

export async function list(q = {}) {
  const where = ['is_deleted = 0'];
  const params = [];
  if (q.postId !== undefined) { where.push('post_id = ?'); params.push(q.postId); }
  if (q.userId !== undefined) { where.push('user_id = ?'); params.push(q.userId); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const orderSql = 'ORDER BY id ASC';

  if (q._page !== undefined || q._per_page !== undefined) {
    return paginate({
      dataSql: `SELECT ${COLS} FROM comments ${whereSql} ${orderSql}`,
      countSql: `SELECT COUNT(*) AS cnt FROM comments ${whereSql}`,
      params,
      page: q._page,
      perPage: q._per_page,
    });
  }
  return query(`SELECT ${COLS} FROM comments ${whereSql} ${orderSql} LIMIT ${MAX_ROWS}`, params);
}

export async function getById(id) {
  return one(`SELECT ${COLS} FROM comments WHERE id = ? AND is_deleted = 0`, [id]);
}

export async function create({ postId, userId, name, email, body }) {
  const id = randomUUID();
  await query(
    `INSERT INTO comments (id, post_id, user_id, name, email, body) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, postId, userId != null ? userId : null, name || null, email || null, body || null]
  );
  return getById(id);
}

export async function update(id, fields) {
  const sets = [];
  const params = [];
  if (fields.body !== undefined) { sets.push('body = ?'); params.push(fields.body); }
  if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
  if (fields.email !== undefined) { sets.push('email = ?'); params.push(fields.email); }
  if (sets.length) {
    params.push(id);
    await query(`UPDATE comments SET ${sets.join(', ')} WHERE id = ? AND is_deleted = 0`, params);
  }
  return getById(id);
}

export async function softDelete(id) {
  const res = await query(`UPDATE comments SET is_deleted = 1 WHERE id = ? AND is_deleted = 0`, [id]);
  return res.affectedRows > 0;
}

export async function ownerOf(id) {
  const row = await one(`SELECT user_id AS userId FROM comments WHERE id = ?`, [id]);
  return row ? row.userId : null;
}
