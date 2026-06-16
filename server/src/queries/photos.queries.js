// Dedicated query functions for `photos` (advanced stage).
import { randomUUID } from 'node:crypto';
import { query, one } from '../db.js';
import { paginate, MAX_ROWS } from './_helpers.js';

const COLS = `id, album_id AS albumId, title, url, thumbnail_url AS thumbnailUrl`;

export async function list(q = {}) {
  const where = ['is_deleted = 0'];
  const params = [];
  if (q.albumId !== undefined) { where.push('album_id = ?'); params.push(q.albumId); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const orderSql = 'ORDER BY id ASC';

  if (q._page !== undefined || q._per_page !== undefined) {
    return paginate({
      dataSql: `SELECT ${COLS} FROM photos ${whereSql} ${orderSql}`,
      countSql: `SELECT COUNT(*) AS cnt FROM photos ${whereSql}`,
      params,
      page: q._page,
      perPage: q._per_page,
    });
  }
  return query(`SELECT ${COLS} FROM photos ${whereSql} ${orderSql} LIMIT ${MAX_ROWS}`, params);
}

export async function getById(id) {
  return one(`SELECT ${COLS} FROM photos WHERE id = ? AND is_deleted = 0`, [id]);
}

export async function create({ albumId, title, url, thumbnailUrl }) {
  const id = randomUUID();
  await query(
    `INSERT INTO photos (id, album_id, title, url, thumbnail_url) VALUES (?, ?, ?, ?, ?)`,
    [id, albumId, title || null, url || null, thumbnailUrl || null]
  );
  return getById(id);
}

export async function update(id, fields) {
  const sets = [];
  const params = [];
  if (fields.title !== undefined) { sets.push('title = ?'); params.push(fields.title); }
  if (fields.url !== undefined) { sets.push('url = ?'); params.push(fields.url); }
  if (fields.thumbnailUrl !== undefined) { sets.push('thumbnail_url = ?'); params.push(fields.thumbnailUrl); }
  if (sets.length) {
    params.push(id);
    await query(`UPDATE photos SET ${sets.join(', ')} WHERE id = ? AND is_deleted = 0`, params);
  }
  return getById(id);
}

export async function softDelete(id) {
  const res = await query(`UPDATE photos SET is_deleted = 1 WHERE id = ? AND is_deleted = 0`, [id]);
  return res.affectedRows > 0;
}

// Photos are owned transitively through their album.
export async function ownerOf(id) {
  const row = await one(
    `SELECT a.user_id AS userId FROM photos p JOIN albums a ON a.id = p.album_id WHERE p.id = ?`,
    [id]
  );
  return row ? row.userId : null;
}
