// SQLite (sql.js) wrapper: the learner's working DB, a pristine reference DB for grading,
// schema introspection, and the logical-stage runner used by the visual explainers.
(function () {
  let SQL = null;
  let work = null;   // learner's playground DB (can be modified, resettable)
  let ref = null;    // pristine DB used for grading and visuals

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function fresh() {
    const db = new SQL.Database();
    db.exec(window.SEED_SQL);
    db.exec('PRAGMA foreign_keys = ON;');
    return db;
  }

  async function init() {
    SQL = await window.initSqlJs({ wasmBinary: b64ToBytes(window.SQL_WASM_BASE64) });
    work = fresh();
    ref = fresh();
  }

  const shape = (r) => (r ? { columns: r.columns, rows: r.values } : null);

  // Like db.exec, but keeps result sets that have zero rows (db.exec drops them).
  function execAll(db, sql) {
    const out = [];
    for (const stmt of db.iterateStatements(sql)) {
      const columns = stmt.getColumnNames();
      const values = [];
      while (stmt.step()) values.push(stmt.get());
      if (columns.length) out.push({ columns, values });
    }
    return out;
  }

  function exec(sql, db = work) {
    const t0 = performance.now();
    const res = execAll(db, sql);
    const ms = performance.now() - t0;
    const last = res[res.length - 1];
    return { results: res.map(shape), last: shape(last), ms, changes: db.getRowsModified() };
  }

  // Run on the reference DB inside a savepoint so nothing persists.
  const TXN_RE = /\b(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|END\s+TRANSACTION)\b/i;
  function sandbox(sql) {
    if (TXN_RE.test(sql.replace(/'(?:[^']|'')*'/g, ''))) {
      // Transaction-control statements can't nest inside our savepoint: use a throwaway copy.
      const db = fresh();
      try { return exec(sql, db); } finally { db.close(); }
    }
    ref.exec('SAVEPOINT sb');
    try { return exec(sql, ref); }
    finally { try { ref.exec('ROLLBACK TO sb; RELEASE sb;'); } catch (e) { ref = fresh(); } }
  }

  // Run a list of statements in the sandbox, returning each result (for before/after visuals).
  function sandboxSeq(list) {
    if (list.some((s) => TXN_RE.test(s))) {
      const db = fresh();
      try { return list.map((s) => { try { return exec(s, db); } catch (e) { return { error: e.message }; } }); } finally { db.close(); }
    }
    ref.exec('SAVEPOINT sq');
    try { return list.map((s) => { try { return exec(s, ref); } catch (e) { return { error: e.message }; } }); }
    finally { try { ref.exec('ROLLBACK TO sq; RELEASE sq;'); } catch (e) { ref = fresh(); } }
  }

  // State-graded challenges: run statements on a throwaway copy, then return what `check` sees.
  function stateRun(sql, check) {
    const db = fresh();
    try {
      const r = exec(sql, db);
      const c = exec(check, db);
      return { ...r, check: c.last || { columns: [], rows: [] } };
    } finally { db.close(); }
  }

  function reset() { if (work) work.close(); work = fresh(); }

  function schema(db = work) {
    const tables = db.exec("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY rowid");
    if (!tables.length) return [];
    return tables[0].values.map(([name, type]) => {
      const q = (s) => { const r = db.exec(s); return r.length ? r[0].values : []; };
      const cols = q(`PRAGMA table_info("${name}")`).map(([, n, t, notnull, dflt, pk]) => ({ name: n, type: t || 'ANY', notnull: !!notnull, pk: !!pk, dflt }));
      const fks = q(`PRAGMA foreign_key_list("${name}")`).map((r) => ({ table: r[2], from: r[3], to: r[4] }));
      let count = 0;
      try { count = q(`SELECT COUNT(*) FROM "${name}"`)[0][0]; } catch (e) { /* view error */ }
      fks.forEach((f) => { const c = cols.find((c) => c.name === f.from); if (c) c.fk = f; });
      return { name, type, columns: cols, fks, count };
    });
  }

  // ---------- Top-level clause splitter ----------
  const CLAUSES = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'WINDOW', 'ORDER BY', 'LIMIT'];
  function stripComments(sql) {
    return sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
  }
  // Returns { prefix (WITH ...), distinct, parts: {SELECT, FROM, ...} } or { unsupported: reason }
  function splitQuery(sqlIn) {
    let sql = stripComments(sqlIn).trim().replace(/;\s*$/, '');
    if (sql.includes(';')) return { unsupported: 'Multiple statements — step-through works on a single SELECT.' };
    const marks = [];
    let depth = 0, quote = null;
    const up = sql.toUpperCase();
    const isWordBoundary = (i) => i < 0 || i >= sql.length || !/[A-Za-z0-9_]/.test(sql[i]);
    for (let i = 0; i < sql.length; i++) {
      const c = sql[i];
      if (quote) { if (c === quote) quote = null; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if (c === '[') { quote = ']'; continue; }
      if (c === '(') { depth++; continue; }
      if (c === ')') { depth--; continue; }
      if (depth !== 0 || !isWordBoundary(i - 1)) continue;
      for (const kw of ['WITH', 'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'WINDOW', 'ORDER BY', 'LIMIT', 'UNION', 'INTERSECT', 'EXCEPT']) {
        const re = new RegExp('^' + kw.replace(' ', '\\s+') + '(?![A-Za-z0-9_])');
        const m = up.slice(i).match(re);
        if (m) { marks.push({ kw, start: i, end: i + m[0].length }); i += m[0].length - 1; break; }
      }
    }
    if (!marks.length) return { unsupported: 'Not a SELECT query.' };
    if (marks.some((m) => ['UNION', 'INTERSECT', 'EXCEPT'].includes(m.kw))) return { unsupported: 'Set operations (UNION/INTERSECT/EXCEPT) run as a whole — see the Set Operations visualizer.' };
    let prefix = '';
    let idx = 0;
    if (marks[0].kw === 'WITH') {
      const sel = marks.findIndex((m) => m.kw === 'SELECT');
      if (sel < 0) return { unsupported: 'Could not find the main SELECT.' };
      prefix = sql.slice(0, marks[sel].start).trim() + ' ';
      idx = sel;
    }
    if (marks[idx].kw !== 'SELECT' || marks[idx].start !== (prefix ? marks[idx].start : 0)) {
      if (!prefix && marks[0].start !== 0) return { unsupported: 'Only SELECT statements can be stepped through.' };
    }
    const parts = {};
    const rest = marks.slice(idx);
    for (let k = 0; k < rest.length; k++) {
      const m = rest[k];
      if (m.kw === 'WITH') return { unsupported: 'Unexpected WITH.' };
      if (parts[m.kw] !== undefined) return { unsupported: `Duplicate ${m.kw} at top level.` };
      const next = rest[k + 1];
      parts[m.kw] = sql.slice(m.end, next ? next.start : sql.length).trim();
    }
    if (parts.SELECT === undefined) return { unsupported: 'Only SELECT statements can be stepped through.' };
    let distinct = false;
    const dm = parts.SELECT.match(/^DISTINCT\s+/i);
    if (dm) { distinct = true; parts.SELECT = parts.SELECT.slice(dm[0].length); }
    return { prefix, distinct, parts };
  }

  const AGG_RE = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|TOTAL|STRING_AGG)\s*\(/i;
  // Detect aggregate use outside of OVER(...) windows (rough but effective for teaching queries).
  function hasAggregate(selectList) {
    const noWin = selectList.replace(/OVER\s*\([^)]*\)/gi, '');
    if (!AGG_RE.test(noWin)) return false;
    // aggregate immediately followed later by OVER => window function, not grouping
    const re = new RegExp(AGG_RE.source, 'gi');
    let m;
    while ((m = re.exec(selectList))) {
      let d = 0, j = m.index + m[0].length - 1;
      for (; j < selectList.length; j++) { if (selectList[j] === '(') d++; else if (selectList[j] === ')') { d--; if (d === 0) break; } }
      if (!/^\s*(FILTER\s*\([^)]*\)\s*)?OVER\b/i.test(selectList.slice(j + 1))) return true;
    }
    return false;
  }

  // Split a comma list at top level.
  function splitList(s) {
    const out = [];
    let d = 0, q = null, cur = '';
    for (const c of s) {
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === "'" || c === '"') { q = c; cur += c; continue; }
      if (c === '(') d++;
      if (c === ')') d--;
      if (c === ',' && d === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  // Build the logical processing stages for a SELECT. Each stage: { key, title, clause, explain, result, marks }
  // marks: per-row 'keep' | 'drop' | group index. Runs on the given runner (default: sandbox).
  function stages(sqlIn, runner = sandbox) {
    const sp = splitQuery(sqlIn);
    if (sp.unsupported) return { unsupported: sp.unsupported };
    const { prefix, distinct, parts: P } = sp;
    const out = [];
    const run = (s) => runner(prefix + s).last || { columns: [], rows: [] };
    const from = P.FROM;
    const W = P.WHERE ? ` WHERE ${P.WHERE}` : '';
    const grouped = !!P['GROUP BY'] || hasAggregate(P.SELECT) || !!P.HAVING;
    try {
      if (from) {
        const joins = (from.match(/\bJOIN\b/gi) || []).length;
        const r = run(`SELECT * FROM ${from}`);
        out.push({ key: 'FROM', title: joins ? 'FROM + JOIN' : 'FROM', clause: `FROM ${from}`, result: r,
          explain: joins ? `SQL first builds one combined row set by joining ${joins + 1} tables → <b>${r.rows.length}</b> rows.` : `SQL starts by reading every row of the source → <b>${r.rows.length}</b> rows.` });
      }
      if (P.WHERE) {
        const r = run(`SELECT CASE WHEN (${P.WHERE}) THEN '✔' WHEN (${P.WHERE}) IS NULL THEN '?' ELSE '✘' END AS "WHERE?", * FROM ${from}`);
        const kept = r.rows.filter((x) => x[0] === '✔').length;
        const unk = r.rows.filter((x) => x[0] === '?').length;
        out.push({ key: 'WHERE', title: 'WHERE', clause: `WHERE ${P.WHERE}`, result: r, marks: r.rows.map((x) => (x[0] === '✔' ? 'keep' : 'drop')), flagCol: 0,
          explain: `Each row is tested. <b>${kept}</b> row(s) pass, <b>${r.rows.length - kept}</b> are removed${unk ? ` (${unk} evaluated to <b>UNKNOWN</b> because of NULL — UNKNOWN is not TRUE, so they are removed too)` : ''}.` });
      }
      if (grouped && from) {
        const gexprs = P['GROUP BY'] ? splitList(P['GROUP BY']) : [];
        if (gexprs.length) {
          const sel = gexprs.map((g, i) => `(${g}) AS "⟨${g.replace(/"/g, '')}⟩"`).join(', ');
          const r = run(`SELECT ${sel}, * FROM ${from}${W} ORDER BY ${gexprs.map((g) => `(${g})`).join(', ')}`);
          const keys = [];
          const marks = r.rows.map((row) => {
            const k = JSON.stringify(row.slice(0, gexprs.length));
            let gi = keys.indexOf(k);
            if (gi < 0) { keys.push(k); gi = keys.length - 1; }
            return gi;
          });
          out.push({ key: 'GROUP BY', title: 'GROUP BY', clause: `GROUP BY ${P['GROUP BY']}`, result: r, marks, grouped: true, keyCols: gexprs.length,
            explain: `Rows with the same value of <code>${escapeHtml(P['GROUP BY'])}</code> are placed in the same bucket → <b>${keys.length}</b> group(s). Each group will become exactly <b>one</b> output row.` });
        } else {
          const r = run(`SELECT * FROM ${from}${W}`);
          out.push({ key: 'GROUP BY', title: 'Implicit group', clause: '(no GROUP BY)', result: r, marks: r.rows.map(() => 0), grouped: true,
            explain: `The SELECT uses an aggregate without GROUP BY, so <b>all ${r.rows.length} rows form a single group</b> → one output row.` });
        }
        if (P.HAVING) {
          const G = P['GROUP BY'] ? ` GROUP BY ${P['GROUP BY']}` : '';
          const gsel = P['GROUP BY'] ? splitList(P['GROUP BY']).join(', ') + ', ' : '';
          const r = run(`SELECT CASE WHEN (${P.HAVING}) THEN '✔' ELSE '✘' END AS "HAVING?", ${gsel}COUNT(*) AS "rows in group" FROM ${from}${W}${G}`);
          const kept = r.rows.filter((x) => x[0] === '✔').length;
          out.push({ key: 'HAVING', title: 'HAVING', clause: `HAVING ${P.HAVING}`, result: r, marks: r.rows.map((x) => (x[0] === '✔' ? 'keep' : 'drop')),
            explain: `HAVING filters <b>groups</b> (after aggregation), not rows. <b>${kept}</b> of ${r.rows.length} group(s) survive.` });
        }
      }
      const tail = `${from ? ` FROM ${from}` : ''}${W}${P['GROUP BY'] ? ` GROUP BY ${P['GROUP BY']}` : ''}${P.HAVING ? ` HAVING ${P.HAVING}` : ''}${P.WINDOW ? ` WINDOW ${P.WINDOW}` : ''}`;
      const rSel = run(`SELECT ${P.SELECT}${tail}`);
      out.push({ key: 'SELECT', title: 'SELECT', clause: `SELECT ${P.SELECT}`, result: rSel,
        explain: `Now the output columns are computed: <code>${escapeHtml(truncate(P.SELECT, 90))}</code>. Aliases defined here only exist from this point on — that is why WHERE cannot use them.` });
      let cur = rSel;
      if (distinct) {
        const seen = new Set();
        const marks = rSel.rows.map((r) => { const k = JSON.stringify(r); if (seen.has(k)) return 'drop'; seen.add(k); return 'keep'; });
        const dups = marks.filter((m) => m === 'drop').length;
        out.push({ key: 'DISTINCT', title: 'DISTINCT', clause: 'DISTINCT', result: rSel, marks,
          explain: `Duplicate result rows are removed: <b>${dups}</b> duplicate(s) dropped, <b>${rSel.rows.length - dups}</b> unique row(s) remain.` });
        cur = run(`SELECT DISTINCT ${P.SELECT}${tail}`);
      }
      if (P['ORDER BY']) {
        cur = run(`SELECT ${distinct ? 'DISTINCT ' : ''}${P.SELECT}${tail} ORDER BY ${P['ORDER BY']}`);
        out.push({ key: 'ORDER BY', title: 'ORDER BY', clause: `ORDER BY ${P['ORDER BY']}`, result: cur,
          explain: `Rows are sorted by <code>${escapeHtml(P['ORDER BY'])}</code>. ORDER BY runs after SELECT, so it <i>can</i> use column aliases.` });
      }
      if (P.LIMIT) {
        const fin = run(`SELECT ${distinct ? 'DISTINCT ' : ''}${P.SELECT}${tail}${P['ORDER BY'] ? ` ORDER BY ${P['ORDER BY']}` : ''} LIMIT ${P.LIMIT}`);
        const lm = P.LIMIT.match(/^\s*(\d+)\s*(?:(?:OFFSET\s+(\d+))|(?:,\s*(\d+)))?/i);
        let off = 0, n = fin.rows.length;
        if (lm) { if (lm[3]) { off = +lm[1]; n = +lm[3]; } else { n = +lm[1]; off = lm[2] ? +lm[2] : 0; } }
        out.push({ key: 'LIMIT', title: 'LIMIT / OFFSET', clause: `LIMIT ${P.LIMIT}`, result: cur, marks: cur.rows.map((_, i) => (i >= off && i < off + n ? 'keep' : 'drop')),
          explain: `Finally, only <b>${fin.rows.length}</b> row(s) are returned${off ? ` after skipping ${off}` : ''}.` });
        cur = fin;
      }
      out.push({ key: 'RESULT', title: 'Result', clause: '', result: cur, final: true, explain: `The final result: <b>${cur.rows.length}</b> row(s) × <b>${cur.columns.length}</b> column(s).` });
    } catch (e) {
      return { error: e.message, stages: out };
    }
    return { stages: out, parts: P, prefix, distinct };
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

  // Compare two results for grading. Returns { ok, reason, missing, extra }
  function compare(user, expected, ordered) {
    if (!user) return { ok: false, reason: 'Your query did not return a result table. Grading needs a SELECT.' };
    const norm = (v) => (v === null ? null : typeof v === 'number' ? Math.round(v * 100) / 100 : String(v));
    const key = (r) => JSON.stringify(r.map(norm));
    if (user.columns.length !== expected.columns.length)
      return { ok: false, reason: `Expected <b>${expected.columns.length}</b> column(s) but your query returns <b>${user.columns.length}</b>.`, colMismatch: true };
    const u = user.rows.map(key), e = expected.rows.map(key);
    const count = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
    const cu = count(u), ce = count(e);
    const missing = [], extra = [];
    ce.forEach((n, k) => { const d = n - (cu.get(k) || 0); for (let i = 0; i < d; i++) missing.push(JSON.parse(k)); });
    cu.forEach((n, k) => { const d = n - (ce.get(k) || 0); for (let i = 0; i < d; i++) extra.push(JSON.parse(k)); });
    if (missing.length || extra.length) {
      let reason = `Expected <b>${e.length}</b> row(s), you returned <b>${u.length}</b>.`;
      if (u.length === e.length) reason = 'Same number of rows, but some values differ.';
      return { ok: false, reason, missing, extra };
    }
    if (ordered && u.join('|') !== e.join('|')) return { ok: false, reason: 'The right rows, but in the wrong <b>order</b>. Check your ORDER BY.', orderOnly: true };
    return { ok: true };
  }

  window.DB = { init, exec, sandbox, sandboxSeq, stateRun, reset, schema, stages, splitQuery, compare, fresh: () => fresh(), get work() { return work; } };
})();
