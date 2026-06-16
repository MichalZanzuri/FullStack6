// Dedicated query functions for `todos`.
import { randomUUID } from 'node:crypto';
import { query, one } from '../db.js';
import { paginate, MAX_ROWS } from './_helpers.js';

const COLS = `id, user_id AS userId, title, completed`;

// List with optional filters (userId, completed) + sorting + optional pagination.
// Mirrors jsonplaceholder query params: ?userId=&completed=&_sort=&_order=&_page=&_per_page=
export async function list(q = {}) {
  const where = ['is_deleted = 0'];
  const params = [];
  if (q.userId !== undefined) { where.push('user_id = ?'); params.push(q.userId); }
  if (q.completed !== undefined) {
    where.push('completed = ?');
    params.push(q.completed === 'true' || q.completed === true || q.completed === '1' ? 1 : 0);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  // Whitelist sortable columns to avoid injection via _sort.
  const sortCol = { id: 'id', title: 'title', completed: 'completed' }[q._sort] || 'id';
  const order = String(q._order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const orderSql = `ORDER BY ${sortCol} ${order}`;

  if (q._page !== undefined || q._per_page !== undefined) {
    return paginate({
      dataSql: `SELECT ${COLS} FROM todos ${whereSql} ${orderSql}`,
      countSql: `SELECT COUNT(*) AS cnt FROM todos ${whereSql}`,
      params,
      page: q._page,
      perPage: q._per_page,
    });
  }
  // No pagination requested → still hard-capped so it can't return unbounded rows.
  return query(`SELECT ${COLS} FROM todos ${whereSql} ${orderSql} LIMIT ${MAX_ROWS}`, params);
}

export async function getById(id) {
  return one(`SELECT ${COLS} FROM todos WHERE id = ? AND is_deleted = 0`, [id]);
}

export async function create({ userId, title, completed }) {
  const id = randomUUID();
  await query(
    `INSERT INTO todos (id, user_id, title, completed) VALUES (?, ?, ?, ?)`,
    [id, userId, title || '', completed ? 1 : 0]
  );
  return getById(id);
}

// Partial update (PATCH) — only the provided fields change.
export async function update(id, fields) {
  const sets = [];
  const params = [];
  if (fields.title !== undefined) { sets.push('title = ?'); params.push(fields.title); }
  if (fields.completed !== undefined) { sets.push('completed = ?'); params.push(fields.completed ? 1 : 0); }
  if (fields.userId !== undefined) { sets.push('user_id = ?'); params.push(fields.userId); }
  if (sets.length) {
    params.push(id);
    await query(`UPDATE todos SET ${sets.join(', ')} WHERE id = ? AND is_deleted = 0`, params);
  }
  return getById(id);
}

export async function softDelete(id) {
  const res = await query(`UPDATE todos SET is_deleted = 1 WHERE id = ? AND is_deleted = 0`, [id]);
  return res.affectedRows > 0;
}

// Ownership check used by routes that must enforce "only the owner".
export async function ownerOf(id) {
  const row = await one(`SELECT user_id AS userId FROM todos WHERE id = ?`, [id]);
  return row ? row.userId : null;
}
