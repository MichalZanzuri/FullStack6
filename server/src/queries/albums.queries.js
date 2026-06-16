// Dedicated query functions for `albums` (advanced stage).
import { randomUUID } from 'node:crypto';
import { query, one } from '../db.js';
import { paginate, MAX_ROWS } from './_helpers.js';

const COLS = `id, user_id AS userId, title`;

export async function list(q = {}) {
  const where = ['is_deleted = 0'];
  const params = [];
  if (q.userId !== undefined) { where.push('user_id = ?'); params.push(q.userId); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const orderSql = 'ORDER BY id ASC';

  if (q._page !== undefined || q._per_page !== undefined) {
    return paginate({
      dataSql: `SELECT ${COLS} FROM albums ${whereSql} ${orderSql}`,
      countSql: `SELECT COUNT(*) AS cnt FROM albums ${whereSql}`,
      params,
      page: q._page,
      perPage: q._per_page,
    });
  }
  return query(`SELECT ${COLS} FROM albums ${whereSql} ${orderSql} LIMIT ${MAX_ROWS}`, params);
}

export async function getById(id) {
  return one(`SELECT ${COLS} FROM albums WHERE id = ? AND is_deleted = 0`, [id]);
}

export async function create({ userId, title }) {
  const id = randomUUID();
  await query(`INSERT INTO albums (id, user_id, title) VALUES (?, ?, ?)`, [id, userId, title || '']);
  return getById(id);
}

export async function update(id, fields) {
  if (fields.title !== undefined) {
    await query(`UPDATE albums SET title = ? WHERE id = ? AND is_deleted = 0`, [fields.title, id]);
  }
  return getById(id);
}

// Soft-deleting an album also soft-deletes its photos — one server-side
// operation instead of the client deleting each photo in its own request.
export async function softDelete(id) {
  const res = await query(`UPDATE albums SET is_deleted = 1 WHERE id = ? AND is_deleted = 0`, [id]);
  if (res.affectedRows > 0) {
    await query(`UPDATE photos SET is_deleted = 1 WHERE album_id = ? AND is_deleted = 0`, [id]);
  }
  return res.affectedRows > 0;
}

export async function ownerOf(id) {
  const row = await one(`SELECT user_id AS userId FROM albums WHERE id = ?`, [id]);
  return row ? row.userId : null;
}
