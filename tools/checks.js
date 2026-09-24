// Shared grading checks for lesson challenges and the practice / interview banks.
const { load } = require('./sqldb');

const norm = (v) => (v === null ? null : typeof v === 'number' ? Math.round(v * 100) / 100 : String(v));
const key = (r) => JSON.stringify(r.values.map((row) => row.map(norm)));

async function runOn(sql, check) {
  const db = await load();
  try {
    const res = db.exec(sql);
    if (!check) return { last: res[res.length - 1] || null };
    const c = db.exec(check);
    return { last: c[c.length - 1] || { columns: [], values: [] } };
  } finally { db.close(); }
}

// ch: { solution, mode?, check?, buggy?, ordered? }. Calls err(msg) for each problem.
async function checkChallenge(ch, err) {
  if (!ch.solution) return err('missing solution');
  const state = ch.mode === 'state';
  if (state && !ch.check) return err("mode 'state' needs a `check` query");
  let sol;
  try { sol = await runOn(ch.solution, state ? ch.check : null); } catch (e) { return err(`solution failed: ${e.message}`); }
  if (!sol.last) return err('solution returns no result set');
  if (!state && !sol.last.values.length) err('solution returns 0 rows');
  if (state) {
    if (/^\s*(WITH|SELECT)\b/i.test(ch.solution) && !/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|REPLACE)\b/i.test(ch.solution)) err("mode 'state' solution should modify data or schema");
    let base;
    try { base = await runOn('SELECT 1', ch.check); } catch (e) { return err(`check failed on base DB: ${e.message}`); }
    if (key(base.last) === key(sol.last)) err('check query gives the same result before and after the solution, so doing nothing would pass');
  }
  if (ch.buggy) {
    try {
      const b = await runOn(ch.buggy, state ? ch.check : null);
      if (b.last && key(b.last) === key(sol.last)) err('buggy query already produces the correct result');
    } catch (e) { /* a buggy query that errors is fine */ }
  }
  if (ch.ordered && !state && !/ORDER\s+BY/i.test(ch.solution)) err('ordered: true but the solution has no ORDER BY');
}

module.exports = { checkChallenge, runOn };
