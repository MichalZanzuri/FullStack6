// Shared helpers for the query layer.
import { query, one } from '../db.js';

// Hard safety cap for any list that is fetched WITHOUT explicit pagination.
// No endpoint ever returns an unbounded number of rows — even a request with no
// _page/_per_page is limited to MAX_ROWS, so a huge table can't blow up the
// response or the server's memory. Lists that need more must page through.
export const MAX_ROWS = 200;

// Build the json-server v1 pagination wrapper the client already knows how to
// read: { first, prev, next, last, pages, items, data }.
//   dataSql / countSql must be complete SELECTs sharing the same WHERE params,
//   minus the LIMIT/OFFSET which we append here.
export async function paginate({ dataSql, countSql, params, page, perPage }) {
  const p = Math.max(1, Number(page) || 1);
  const pp = Math.max(1, Number(perPage) || 10);
  const offset = (p - 1) * pp;

  const countRow = await one(countSql, params);
  const items = Number(countRow?.cnt ?? 0);
  const pages = Math.max(1, Math.ceil(items / pp));

  // mysql2 is finicky about LIMIT/OFFSET as bound params on some versions —
  // pp/offset are integers we control, so inline them safely.
  const data = await query(`${dataSql} LIMIT ${pp} OFFSET ${offset}`, params);

  return {
    first: 1,
    prev: p > 1 ? p - 1 : null,
    next: p < pages ? p + 1 : null,
    last: pages,
    pages,
    items,
    data,
  };
}
