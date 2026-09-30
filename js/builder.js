// Visual query builder: pick a statement type, configure its clauses, and the SQL is generated live.
// SELECT runs on the learner's DB; INSERT / UPDATE / DELETE are previewed inside a rolled-back savepoint
// and only change data when the learner presses "Apply".
(function () {
  const { h, table, toast } = UI;
  const ALIAS = { patients: 'p', invoices: 'i', payors: 'py', payments: 'pm', charges: 'c', practitioners: 'pr', treatment_locations: 'tl', transactions: 't', sites: 's' };
  const alias = (t) => ALIAS[t] || t.slice(0, 2);
  const STORE = 'sqlpath.builder';
  const KINDS = [
    ['select', '🔎', 'SELECT', 'Read rows'],
    ['insert', '➕', 'INSERT', 'Add a row'],
    ['update', '✏️', 'UPDATE', 'Change rows'],
    ['delete', '🗑️', 'DELETE', 'Remove rows'],
  ];
  // Filter operators per data family: [id, label, input kind]. Input kinds: none, one, two (range), list, n (count), year, month, weekday.
  const OPS = {
    num: [['=', '= equals', 'one'], ['<>', '≠ not equal', 'one'], ['>', '> greater than', 'one'], ['>=', '≥ at least', 'one'], ['<', '< less than', 'one'], ['<=', '≤ at most', 'one'],
      ['BETWEEN', 'between', 'two'], ['NOT BETWEEN', 'not between', 'two'], ['IN', 'is one of', 'list'], ['NOT IN', 'is none of', 'list']],
    text: [['=', 'is', 'one'], ['<>', 'is not', 'one'], ['IEQ', 'is (ignore case)', 'one'], ['CONTAINS', 'contains', 'one'], ['NOT CONTAINS', 'does not contain', 'one'],
      ['STARTS', 'starts with', 'one'], ['ENDS', 'ends with', 'one'], ['IN', 'is one of', 'list'], ['NOT IN', 'is none of', 'list'],
      ['LIKE', 'LIKE pattern (% _)', 'one'], ['NOT LIKE', 'NOT LIKE pattern', 'one'], ['GLOB', 'GLOB pattern (* ?, case-sensitive)', 'one'],
      ['>', 'sorts after', 'one'], ['<', 'sorts before', 'one'], ['EMPTY', "is empty ('')", 'none'], ['BLANK', 'is blank (NULL or empty)', 'none'], ['NOTBLANK', 'has text', 'none'],
      ['LEN>', 'length greater than', 'n'], ['LEN<', 'length less than', 'n']],
    date: [['ON', 'is on', 'one'], ['NOTON', 'is not on', 'one'], ['<', 'is before', 'one'], ['<=', 'is on or before', 'one'], ['>', 'is after', 'one'], ['>=', 'is on or after', 'one'],
      ['BETWEEN', 'is between', 'two'], ['NOT BETWEEN', 'is not between', 'two'], ['YEAR', 'is in year', 'year'], ['MONTH', 'is in month', 'month'], ['WEEKDAY', 'falls on a', 'weekday'],
      ['LASTN', 'is in the last N days', 'n'], ['NEXTN', 'is in the next N days', 'n'], ['OLDERN', 'is more than N days ago', 'n']],
    bool: [['TRUE', 'is true (1)', 'none'], ['FALSE', 'is false (0)', 'none'], ['=', '= equals', 'one']],
  };
  const NULL_OPS = [['IS NULL', 'is NULL (missing)', 'none'], ['IS NOT NULL', 'is not NULL', 'none']];
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const FAMILY_ICON = { num: '#', text: 'Aa', date: '📅', bool: '◐' };
  const AGG_FNS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'TOTAL', 'GROUP_CONCAT'];
  const WIN_FNS = ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'LAG', 'LEAD'];
  const WIN_NOARG = ['ROW_NUMBER', 'RANK', 'DENSE_RANK'];
  // Logical processing order, shown as a badge on each clause card.
  const RUNS = { from: 1, join: 1, where: 2, group: 3, having: 4, select: 5, order: 6, limit: 7 };

  const blank = (kind = 'select', tbl = 'invoices') => ({
    kind, table: tbl, distinct: false, cols: [], colAlias: {}, exprs: [], wins: [], joins: [], where: [],
    groupBy: [], aggs: [], having: [], order: [], limit: '', offset: '', values: {}, set: [],
  });
  const J = (type, tbl, on) => ({ type, table: tbl, on });
  const TEMPLATES = [
    { icon: '📄', name: 'Invoice list', hint: 'Columns, filter & sort', s: { cols: ['i.invoice_id', 'i.invoice_date', 'i.status', 'i.total_amount'], order: [{ col: 'i.invoice_date', dir: 'DESC' }], limit: '20' } },
    { icon: '⏰', name: 'Open & overdue', hint: 'IN filter + sort by due date', s: { cols: ['i.invoice_id', 'p.first_name', 'p.last_name', 'i.due_date', 'i.status', 'i.total_amount'], joins: [J('INNER', 'patients', 'p.patient_id = i.patient_id')], where: [{ col: 'i.status', op: 'IN', val: 'Open, Overdue', conj: 'AND' }], order: [{ col: 'i.due_date', dir: 'ASC' }] } },
    { icon: '💰', name: 'Revenue by payor', hint: 'LEFT JOIN + GROUP BY + SUM', s: { cols: ['py.payor_name'], joins: [J('LEFT', 'payors', 'py.payor_id = i.payor_id')], groupBy: ['py.payor_name'], aggs: [{ fn: 'COUNT', col: '*', distinct: false, alias: 'invoices' }, { fn: 'SUM', col: 'i.total_amount', distinct: false, alias: 'revenue' }], order: [{ col: 'revenue', dir: 'DESC' }] } },
    { icon: '👻', name: 'Patients with no invoices', hint: 'Anti-join: LEFT JOIN … IS NULL', s: { table: 'patients', cols: ['p.patient_id', 'p.first_name', 'p.last_name', 'p.city'], joins: [J('LEFT', 'invoices', 'i.patient_id = p.patient_id')], where: [{ col: 'i.invoice_id', op: 'IS NULL', val: '', conj: 'AND' }] } },
    { icon: '🩺', name: 'Busiest practitioners', hint: 'GROUP BY + HAVING + LIMIT', s: { table: 'charges', cols: ['pr.last_name', 'pr.specialty'], joins: [J('INNER', 'practitioners', 'pr.practitioner_id = c.practitioner_id')], groupBy: ['pr.last_name', 'pr.specialty'], aggs: [{ fn: 'COUNT', col: '*', distinct: false, alias: 'charges' }, { fn: 'SUM', col: 'c.amount', distinct: false, alias: 'billed' }], having: [{ expr: 'COUNT(*)', op: '>=', val: '3', conj: 'AND' }], order: [{ col: 'billed', dir: 'DESC' }], limit: '5' } },
    { icon: '📅', name: 'Q2 2025 payments', hint: 'Date range + weekday', s: { table: 'payments', cols: ['pm.payment_id', 'pm.payment_date', 'pm.method', 'pm.amount'], where: [{ col: 'pm.payment_date', op: 'BETWEEN', val: '2025-04-01', val2: '2025-06-30', conj: 'AND' }, { col: 'pm.method', op: 'CONTAINS', val: 'card', conj: 'AND' }], order: [{ col: 'pm.payment_date', dir: 'ASC' }] } },
    { icon: '🔗', name: 'Invoices never paid', hint: 'NOT EXISTS related rows', s: { cols: ['i.invoice_id', 'i.invoice_date', 'i.status', 'i.total_amount'], where: [{ type: 'exists', rel: 'payments.invoice_id.invoice_id', neg: true, conj: 'AND' }, { col: 'i.status', op: '<>', val: 'Void', conj: 'AND' }], order: [{ col: 'i.total_amount', dir: 'DESC' }] } },
    { icon: '🏅', name: 'Rank invoices per patient', hint: 'Window function', s: { cols: ['i.patient_id', 'i.invoice_id', 'i.total_amount'], wins: [{ fn: 'RANK', col: '', part: 'i.patient_id', ord: 'i.total_amount', dir: 'DESC', alias: 'rank_in_patient' }], order: [{ col: 'i.patient_id', dir: 'ASC' }, { col: 'rank_in_patient', dir: 'ASC' }] } },
    { icon: '➕', name: 'Add a payor', hint: 'INSERT a row', s: { kind: 'insert', table: 'payors', values: { payor_name: 'Humana Gold', payor_type: 'Medicare', phone: '800-555-0199', contract_rate: '0.78' } } },
    { icon: '📈', name: 'Raise commercial rates', hint: 'UPDATE with an expression', s: { kind: 'update', table: 'payors', set: [{ col: 'contract_rate', mode: 'expr', val: 'ROUND(contract_rate * 1.05, 2)' }], where: [{ col: 'payor_type', op: '=', val: 'Commercial', conj: 'AND' }] } },
    { icon: '🧹', name: 'Remove refund entries', hint: 'DELETE with WHERE', s: { kind: 'delete', table: 'transactions', where: [{ col: 'transaction_type', op: '=', val: 'REFUND', conj: 'AND' }] } },
  ];

  let S = null;
  const ui = { tab: 'result', auto: true, closed: new Set(), undo: [], redo: [], committed: null, lastTyping: 0 };

  // ---------- schema helpers ----------
  function schema() { return DB.schema().filter((t) => t.type === 'table'); }
  const tableInfo = (name) => schema().find((x) => x.name === name) || { columns: [], fks: [] };
  const isDml = () => S.kind !== 'select';
  function inScope() { return isDml() ? [S.table] : [S.table, ...S.joins.map((j) => j.table)]; }
  function tableOf(ref) {
    if (!ref.includes('.')) return S.table;
    const a = ref.split('.')[0];
    return inScope().find((t) => alias(t) === a) || S.table;
  }
  function colInfo(ref) {
    const name = ref.includes('.') ? ref.split('.')[1] : ref;
    return tableInfo(tableOf(ref)).columns.find((c) => c.name === name) || null;
  }
  function allCols() {
    return isDml() ? tableInfo(S.table).columns.map((c) => c.name)
      : inScope().flatMap((t) => tableInfo(t).columns.map((c) => `${alias(t)}.${c.name}`));
  }
  function joinOptions() {
    const scope = inScope();
    const opts = [];
    schema().forEach((t) => {
      t.fks.forEach((f) => {
        if (scope.includes(t.name) && !scope.includes(f.table)) opts.push({ table: f.table, on: `${alias(f.table)}.${f.to} = ${alias(t.name)}.${f.from}`, label: `${f.table}`, via: `${t.name}.${f.from}` });
        if (scope.includes(f.table) && !scope.includes(t.name)) opts.push({ table: t.name, on: `${alias(t.name)}.${f.from} = ${alias(f.table)}.${f.to}`, label: `${t.name}`, via: `${t.name}.${f.from}` });
      });
    });
    return opts.filter((o, i) => opts.findIndex((x) => x.table === o.table) === i);
  }
  const docOf = (tbl, col) => { const d = ((window.SchemaDocs || {}).tables || {})[tbl]; return d ? (col ? (d.columns || {})[col] : d.purpose) : ''; };
  const isTextType = (c) => c && /CHAR|TEXT|CLOB/i.test(c.type);
  const isNumType = (c) => c && /INT|REAL|NUM|DEC|FLOA|DOUB/i.test(c.type);
  // Data family drives which filter operators and value inputs are offered. SQLite stores dates as TEXT,
  // so date columns are recognised by declared type or by name.
  function family(ref) {
    const c = ref ? colInfo(ref) : null;
    if (!c) return 'text';
    if (/BOOL/i.test(c.type) || /^(is|has)_/.test(c.name)) return 'bool';
    if (/DATE|TIME/i.test(c.type) || /(^|_)(date|at|on)$|_date_|^date_/.test(c.name)) return 'date';
    if (isNumType(c)) return 'num';
    return 'text';
  }
  function childRelations() {
    return schema().flatMap((t) => t.fks.filter((f) => f.table === S.table && t.name !== S.table).map((f) => ({ rel: `${t.name}.${f.from}.${f.to}`, label: `${t.name} (by ${f.from})` })));
  }
  function distinctValues(ref, max = 60) {
    const c = colInfo(ref);
    if (!c) return [];
    try {
      const r = DB.exec(`SELECT DISTINCT "${c.name}" FROM "${tableOf(ref)}" WHERE "${c.name}" IS NOT NULL ORDER BY 1 LIMIT ${max + 1}`);
      return r.last ? r.last.rows.map((x) => x[0]) : [];
    } catch (e) { return []; }
  }

  // ---------- SQL generation ----------
  function lit(x, ref) {
    x = String(x).trim();
    if (/^null$/i.test(x)) return 'NULL';
    const c = ref ? colInfo(ref) : null;
    if (x !== '' && /^-?\d+(\.\d+)?$/.test(x) && !isTextType(c)) return x;
    return `'${x.replace(/'/g, "''")}'`;
  }
  const opsFor = (ref) => [...OPS[family(ref)], ...NULL_OPS];
  const opInfo = (c) => opsFor(c.col).find((o) => o[0] === c.op) || ['=', '=', 'one'];
  const range = (c) => (c.val2 !== undefined ? [c.val, c.val2] : String(c.val || '').split(/\s+and\s+|,/i)).map((x) => String(x || '').trim());
  const likeLit = (v) => `'${v.replace(/'/g, "''")}'`;
  function cond(c) {
    if (c.type === 'exists') {
      const [child, from, to] = c.rel.split('.');
      const base = S.kind === 'select' ? alias(S.table) : S.table;
      const sa = alias(child) + '2';
      return `${c.neg ? 'NOT ' : ''}EXISTS (SELECT 1 FROM ${child} ${sa} WHERE ${sa}.${from} = ${base}.${to})`;
    }
    const v = String(c.val || '').trim();
    const col = c.col;
    const L = (x) => lit(x, col);
    const n = Math.max(0, parseInt(v, 10) || 0);
    switch (c.op) {
      case 'IS NULL': case 'IS NOT NULL': return `${col} ${c.op}`;
      case 'TRUE': return `${col} = 1`;
      case 'FALSE': return `${col} = 0`;
      case 'IN': case 'NOT IN': return `${col} ${c.op} (${v.split(',').map((x) => L(x)).join(', ')})`;
      case 'BETWEEN': case 'NOT BETWEEN': { const [x, y] = range(c); return `${col} ${c.op} ${L(x)} AND ${L(y)}`; }
      case 'CONTAINS': return `${col} LIKE ${likeLit('%' + v + '%')}`;
      case 'NOT CONTAINS': return `${col} NOT LIKE ${likeLit('%' + v + '%')}`;
      case 'STARTS': return `${col} LIKE ${likeLit(v + '%')}`;
      case 'ENDS': return `${col} LIKE ${likeLit('%' + v)}`;
      case 'LIKE': case 'NOT LIKE': return `${col} ${c.op} ${likeLit(v)}`;
      case 'GLOB': return `${col} GLOB ${likeLit(v)}`;
      case 'IEQ': return `${col} = ${likeLit(v)} COLLATE NOCASE`;
      case 'EMPTY': return `${col} = ''`;
      case 'BLANK': return `(${col} IS NULL OR ${col} = '')`;
      case 'NOTBLANK': return `${col} <> ''`;
      case 'LEN>': return `LENGTH(${col}) > ${n}`;
      case 'LEN<': return `LENGTH(${col}) < ${n}`;
      case 'ON': return `date(${col}) = ${likeLit(v)}`;
      case 'NOTON': return `date(${col}) <> ${likeLit(v)}`;
      case 'YEAR': return `strftime('%Y', ${col}) = ${likeLit(v)}`;
      case 'MONTH': return `strftime('%Y-%m', ${col}) = ${likeLit(v)}`;
      case 'WEEKDAY': return `strftime('%w', ${col}) = ${likeLit(v || '1')}`;
      case 'LASTN': return `${col} BETWEEN date('now', '-${n} days') AND date('now')`;
      case 'NEXTN': return `${col} BETWEEN date('now') AND date('now', '+${n} days')`;
      case 'OLDERN': return `${col} < date('now', '-${n} days')`;
      default: return `${col} ${c.op} ${L(v)}`;
    }
  }
  // Consecutive conditions marked `nest` share a parenthesised group with the condition above.
  function condGroups(list) {
    const groups = [];
    list.forEach((c, i) => { if (i && c.nest && groups.length) groups[groups.length - 1].push(c); else groups.push([c]); });
    return groups;
  }
  function whereExpr(list, sep = '\n') {
    const groups = condGroups(list);
    return groups.map((g, gi) => {
      const body = g.map((c, i) => (i ? ` ${c.conj} ` : '') + cond(c)).join('');
      return (gi ? `${sep === '\n' ? '\n  ' : ' '}${g[0].conj} ` : '') + (g.length > 1 && groups.length > 1 ? `(${body})` : body);
    }).join('');
  }
  const conds = (list, fmt) => list.map((c, i) => (i ? `  ${c.conj} ` : '') + fmt(c)).join('\n');
  const aggExpr = (a) => `${a.fn}(${a.col === '*' ? '*' : (a.distinct ? 'DISTINCT ' : '') + a.col})`;
  function winExpr(w) {
    const arg = WIN_NOARG.includes(w.fn) ? '' : w.fn === 'NTILE' ? (w.col || '4') : w.fn === 'COUNT' && !w.col ? '*' : w.col;
    const over = [w.part ? `PARTITION BY ${w.part}` : '', w.ord ? `ORDER BY ${w.ord} ${w.dir}` : ''].filter(Boolean).join(' ');
    return `${w.fn}(${arg}) OVER (${over})`;
  }
  const asAlias = (e, a) => (a ? `${e} AS ${a}` : e);
  const where = () => S.where.filter((c) => c.col || c.type === 'exists');
  const having = () => S.having.filter((c) => c.expr);

  // Returns [clauseKey, text] pairs so the SQL panel can highlight the lines each card produces.
  function parts() {
    const p = [];
    const w = where();
    if (S.kind === 'select') {
      const items = [
        ...S.cols.map((c) => asAlias(c, S.colAlias[c])),
        ...S.exprs.filter((e) => e.expr.trim()).map((e) => asAlias(e.expr.trim(), e.alias)),
        ...S.aggs.map((a) => asAlias(aggExpr(a), a.alias)),
        ...S.wins.map((x) => asAlias(winExpr(x), x.alias)),
      ];
      p.push(['select', `SELECT ${S.distinct ? 'DISTINCT ' : ''}${items.length ? items.join(',\n       ') : '*'}`]);
      p.push(['from', `FROM ${S.table} ${alias(S.table)}`]);
      S.joins.forEach((j) => p.push(['join', `${j.type} JOIN ${j.table} ${alias(j.table)} ON ${j.on}`]));
      if (w.length) p.push(['where', 'WHERE ' + whereExpr(w)]);
      if (S.groupBy.length) p.push(['group', `GROUP BY ${S.groupBy.join(', ')}`]);
      const hv = having();
      if (hv.length) p.push(['having', 'HAVING ' + conds(hv, (c) => `${c.expr} ${c.op} ${lit(c.val)}`)]);
      const ord = S.order.filter((o) => o.col);
      if (ord.length) p.push(['order', `ORDER BY ${ord.map((o) => `${o.col} ${o.dir}`).join(', ')}`]);
      if (S.limit !== '' || S.offset !== '') p.push(['limit', `LIMIT ${S.limit === '' ? -1 : S.limit}${S.offset !== '' && +S.offset ? ` OFFSET ${S.offset}` : ''}`]);
    } else if (S.kind === 'insert') {
      const cols = tableInfo(S.table).columns.filter((c) => String(S.values[c.name] ?? '').trim() !== '');
      if (!cols.length) p.push(['from', `INSERT INTO ${S.table} DEFAULT VALUES`]);
      else {
        p.push(['from', `INSERT INTO ${S.table} (${cols.map((c) => c.name).join(', ')})`]);
        p.push(['values', `VALUES (${cols.map((c) => lit(S.values[c.name], c.name)).join(', ')})`]);
      }
    } else if (S.kind === 'update') {
      p.push(['from', `UPDATE ${S.table}`]);
      const set = S.set.filter((x) => x.col);
      p.push(['set', 'SET ' + (set.length ? set.map((x) => `${x.col} = ${x.mode === 'null' ? 'NULL' : x.mode === 'expr' ? (x.val.trim() || x.col) : lit(x.val, x.col)}`).join(',\n    ') : '/* choose a column */')]);
      if (w.length) p.push(['where', 'WHERE ' + whereExpr(w)]);
    } else {
      p.push(['from', `DELETE FROM ${S.table}`]);
      if (w.length) p.push(['where', 'WHERE ' + whereExpr(w)]);
    }
    return p;
  }
  const sql = () => parts().map((x) => x[1]).join('\n') + ';';
  const whereSql = () => { const w = where(); return w.length ? ' WHERE ' + whereExpr(w, ' ') : ''; };

  // ---------- checks & plain-English explanation ----------
  function lints() {
    const out = [];
    const L = (level, msg) => out.push({ level, msg });
    const w = where();
    if (S.kind === 'select') {
      if (S.groupBy.length && S.cols.some((c) => !S.groupBy.includes(c))) L('warn', `Selected column(s) not in GROUP BY: ${S.cols.filter((c) => !S.groupBy.includes(c)).join(', ')}. Most databases reject this; SQLite silently picks a value from an arbitrary row.`);
      if (!S.groupBy.length && S.aggs.length && S.cols.length) L('warn', 'Aggregates without GROUP BY collapse all rows into one; the plain columns then come from an arbitrary row. Tick the columns under GROUP BY.');
      const leftAliases = S.joins.filter((j) => j.type === 'LEFT').map((j) => alias(j.table));
      const bad = w.filter((c) => c.col && leftAliases.includes(c.col.split('.')[0]) && !/^(IS NULL|BLANK)$/.test(c.op));
      if (bad.length) L('warn', `A WHERE filter on ${bad.map((c) => c.col).join(', ')} (the optional side of a LEFT JOIN) removes the unmatched rows, so the LEFT JOIN behaves like an INNER JOIN. Move the test into the ON clause or use IS NULL.`);
      if (S.limit !== '' && !S.order.some((o) => o.col)) L('info', 'LIMIT without ORDER BY returns whichever rows the engine reads first. Add ORDER BY for a predictable result.');
      if (having().length && !S.groupBy.length && !S.aggs.length) L('warn', 'HAVING filters groups; without GROUP BY or aggregates it is usually a mistake.');
      S.wins.forEach((x) => { if (!WIN_NOARG.includes(x.fn) && x.fn !== 'COUNT' && x.fn !== 'NTILE' && !x.col) L('warn', `${x.fn}() needs a column.`); if (/RANK|ROW_NUMBER|NTILE|LAG|LEAD/.test(x.fn) && !x.ord) L('info', `${x.fn}() without ORDER BY in OVER() numbers rows in an arbitrary order.`); });
    }
    if (w.some((c, i) => i && c.conj === 'OR') && w.some((c, i) => i && c.conj === 'AND') && !w.some((c, i) => i && c.nest)) L('info', 'Mixing AND and OR: AND is evaluated first, so A AND B OR C means (A AND B) OR C. Use the ( ) button on a condition to group it with the one above.');
    w.forEach((c) => {
      if (c.type === 'exists') return;
      const kind = opInfo(c)[2];
      if (/^(=|<>)$/.test(c.op) && /^null$/i.test(String(c.val).trim())) L('warn', `${c.col} ${c.op} NULL is never true. Use "is NULL" / "is not NULL".`);
      else if (/one|list|n|year|month/.test(kind) && String(c.val ?? '').trim() === '' && c.op !== '=' && c.op !== 'EMPTY') L('info', `The condition on ${c.col} has no value yet.`);
      else if (kind === 'two' && range(c).some((x) => x === '')) L('info', `The range on ${c.col} needs both a start and an end.`);
      if (family(c.col) === 'date' && /^(=|<>)$/.test(c.op)) L('info', `Tip: for dates use "is on" (compares the date part), "is before/after" or a range.`);
    });
    if ((S.kind === 'update' || S.kind === 'delete') && !w.length) L('danger', `No WHERE clause: this ${S.kind.toUpperCase()} affects every row of ${S.table}.`);
    if (S.kind === 'update' && !S.set.some((x) => x.col)) L('warn', 'Add at least one column to SET.');
    if (S.kind === 'insert') {
      const miss = tableInfo(S.table).columns.filter((c) => c.notnull && !c.pk && c.dflt == null && String(S.values[c.name] ?? '').trim() === '');
      if (miss.length) L('warn', `Required (NOT NULL) column(s) without a value: ${miss.map((c) => c.name).join(', ')}.`);
    }
    return out;
  }

  function describe() {
    const steps = [];
    const S2 = (k, kw, text) => steps.push({ k, kw, text });
    const fmtC = (c) => {
      if (c.type === 'exists') { const [child] = c.rel.split('.'); return `it has ${c.neg ? 'no' : 'at least one'} related ${child} row`; }
      const [, label, kind] = opInfo(c);
      const v = String(c.val || '').trim() || '…';
      const words = label.replace(/^[=≠<>≤≥]+ /, '');
      if (kind === 'none') return `${c.col} ${words}`;
      if (kind === 'two') { const [a, b] = range(c); return `${c.col} ${words} ${a || '…'} and ${b || '…'}`; }
      if (kind === 'n') return `${c.col} ${words.replace(' N ', ` ${v} `).replace(/than$/, `than ${v}`)}`;
      if (kind === 'weekday') return `${c.col} falls on a ${WEEKDAYS[+c.val || 1]}`;
      return `${c.col} ${words} ${v}`;
    };
    const condText = (list) => condGroups(list).map((g, gi) => (gi ? ` ${g[0].conj.toLowerCase()} ` : '') + (g.length > 1 ? '(' : '') + g.map((c, i) => (i ? ` ${c.conj.toLowerCase()} ` : '') + fmtC(c)).join('') + (g.length > 1 ? ')' : '')).join('');
    const w = where();
    if (S.kind === 'select') {
      S2('from', 'FROM', `Start with every row of ${S.table} (${tableInfo(S.table).count} rows).`);
      S.joins.forEach((j) => S2('join', `${j.type} JOIN`, j.type === 'INNER' ? `Pair each row with its matching ${j.table} row; rows without a match are dropped.` : j.type === 'LEFT' ? `Attach matching ${j.table} rows; keep every row even without a match (its ${j.table} columns become NULL).` : j.type === 'RIGHT' ? `Keep every ${j.table} row, attaching matching rows from the tables before it.` : `Keep rows from both sides, matched where possible.`));
      if (w.length) S2('where', 'WHERE', `Keep only rows where ${condText(w)}.`);
      if (S.groupBy.length) S2('group', 'GROUP BY', `Put rows with the same ${S.groupBy.join(' + ')} into one group${S.aggs.length ? ` and compute ${S.aggs.map((a) => aggExpr(a)).join(', ')} per group` : ''}.`);
      else if (S.aggs.length) S2('group', 'AGGREGATE', `Collapse all rows into a single summary row: ${S.aggs.map((a) => aggExpr(a)).join(', ')}.`);
      const hv = having();
      if (hv.length) S2('having', 'HAVING', `Keep only groups where ${hv.map((c, i) => (i ? ` ${c.conj.toLowerCase()} ` : '') + `${c.expr} ${c.op} ${c.val}`).join('')}.`);
      const outCols = [...S.cols.map((c) => S.colAlias[c] || c), ...S.exprs.filter((e) => e.expr.trim()).map((e) => e.alias || e.expr), ...S.aggs.map((a) => a.alias || aggExpr(a)), ...S.wins.map((x) => x.alias || x.fn)];
      S2('select', 'SELECT', outCols.length ? `Return the columns ${outCols.join(', ')}.` : 'Return every column.');
      S.wins.forEach((x) => S2('select', 'OVER', `${x.fn} is computed ${x.part ? `separately for each ${x.part}` : 'across the whole result'}${x.ord ? `, in ${x.ord} ${x.dir === 'DESC' ? 'descending' : 'ascending'} order` : ''}, without collapsing rows.`));
      if (S.distinct) S2('select', 'DISTINCT', 'Remove duplicate result rows.');
      const ord = S.order.filter((o) => o.col);
      if (ord.length) S2('order', 'ORDER BY', `Sort by ${ord.map((o) => `${o.col} (${o.dir === 'DESC' ? 'high → low' : 'low → high'})`).join(', then ')}.`);
      if (S.limit !== '' || +S.offset) S2('limit', 'LIMIT', `${+S.offset ? `Skip the first ${S.offset} rows, then r` : 'R'}eturn ${S.limit === '' ? 'the rest' : `at most ${S.limit} rows`}.`);
    } else if (S.kind === 'insert') {
      const set = Object.entries(S.values).filter(([, v]) => String(v).trim() !== '');
      S2('from', 'INSERT', `Add one new row to ${S.table}.`);
      S2('values', 'VALUES', set.length ? `Set ${set.map(([k, v]) => `${k} = ${v}`).join(', ')}; every other column gets its default (or NULL).` : 'Every column gets its default value.');
    } else if (S.kind === 'update') {
      S2('from', 'UPDATE', `Change rows of ${S.table}.`);
      S2('where', 'WHERE', w.length ? `Only rows where ${condText(w)}.` : '⚠️ No filter: every row.');
      S2('set', 'SET', `Set ${S.set.filter((x) => x.col).map((x) => `${x.col} to ${x.mode === 'null' ? 'NULL' : x.val || '…'}`).join(', ') || '…'}.`);
    } else {
      S2('from', 'DELETE', `Remove rows from ${S.table}.`);
      S2('where', 'WHERE', w.length ? `Only rows where ${condText(w)}.` : '⚠️ No filter: every row is deleted.');
    }
    return steps;
  }

  // ---------- running ----------
  // Runs a data-changing statement inside a savepoint on the learner's DB and rolls it back.
  function preview() {
    const db = DB.work;
    const stmt = sql();
    db.exec('SAVEPOINT bl_preview');
    try {
      if (S.kind === 'insert') {
        const r = DB.exec(stmt, db);
        const after = DB.exec(`SELECT * FROM "${S.table}" WHERE rowid = last_insert_rowid()`, db).last;
        return { r, after };
      }
      const w = whereSql();
      const before = DB.exec(`SELECT * FROM "${S.table}"${w} ORDER BY rowid`, db).last || { columns: tableInfo(S.table).columns.map((c) => c.name), rows: [] };
      const ids = (DB.exec(`SELECT rowid FROM "${S.table}"${w} ORDER BY rowid`, db).last || { rows: [] }).rows.map((x) => x[0]);
      const r = DB.exec(stmt, db);
      const after = S.kind === 'update' && ids.length ? DB.exec(`SELECT * FROM "${S.table}" WHERE rowid IN (${ids.join(',')}) ORDER BY rowid`, db).last : null;
      return { r, before, after };
    } finally { try { db.exec('ROLLBACK TO bl_preview; RELEASE bl_preview;'); } catch (e) { /* nothing to roll back */ } }
  }

  // ---------- persistence & history ----------
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (s && schema().some((t) => t.name === s.table)) return { ...blank(), ...s };
    } catch (e) { /* storage unavailable */ }
    return fromTemplate(TEMPLATES[0]);
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
  function savedList() { try { return JSON.parse(localStorage.getItem(STORE + '.saved') || '[]'); } catch (e) { return []; } }
  function setSaved(list) { try { localStorage.setItem(STORE + '.saved', JSON.stringify(list)); return true; } catch (e) { return false; } }
  function csv(res) {
    const q = (v) => (v === null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    return [res.columns.map(q).join(','), ...res.rows.map((r) => r.map(q).join(','))].join('\n');
  }
  function fromTemplate(t) { const s = { ...blank(t.s.kind, t.s.table), ...JSON.parse(JSON.stringify(t.s)) }; return s; }

  function render() {
    if (!S) S = load();
    if (ui.committed === null) ui.committed = JSON.stringify(S);
    const root = h('div', { class: 'page builder' });
    const form = h('div', { class: 'bl-steps' });
    const top = h('div', { class: 'bl-top card' });
    const right = h('div', { class: 'bl-right card sticky' });
    const sqlBox = h('div', { class: 'bl-sql' });
    const meta = h('span', { class: 'bl-meta muted xs' });
    const lintBox = h('div', { class: 'bl-lints' });
    const out = h('div', { class: 'bl-out' });
    const undoBtn = h('button', { class: 'icon-btn', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', onclick: () => undo() }, '↶');
    const redoBtn = h('button', { class: 'icon-btn', title: 'Redo (Ctrl+Shift+Z)', 'aria-label': 'Redo', onclick: () => redo() }, '↷');
    let runTimer = null;

    // ----- history -----
    function record(typing) {
      const cur = JSON.stringify(S);
      if (cur === ui.committed) return;
      const now = Date.now();
      if (!(typing && now - ui.lastTyping < 1000)) { ui.undo.push(ui.committed); if (ui.undo.length > 100) ui.undo.shift(); }
      ui.lastTyping = typing ? now : 0;
      ui.redo = [];
      ui.committed = cur;
    }
    function restore(snap) { S = JSON.parse(snap); ui.committed = snap; redraw(true); }
    function undo() { if (ui.undo.length) { ui.redo.push(ui.committed); restore(ui.undo.pop()); } }
    function redo() { if (ui.redo.length) { ui.undo.push(ui.committed); restore(ui.redo.pop()); } }
    const onKey = (e) => {
      if (!document.body.contains(root)) { document.removeEventListener('keydown', onKey); return; }
      const inField = /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''));
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runNow(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !inField) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !inField) { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', onKey);

    // ----- refresh cycle: redraw() rebuilds the form, update() refreshes SQL, checks and results -----
    function update({ typing = false, noRecord = false } = {}) {
      if (!noRecord) record(typing);
      save();
      undoBtn.disabled = !ui.undo.length;
      redoBtn.disabled = !ui.redo.length;
      sqlBox.innerHTML = '';
      sqlBox.appendChild(h('pre', { class: 'code bl-code' }, parts().map(([k, text], i) => h('span', { class: 'bl-part', dataset: { c: k }, html: (i ? '\n' : '') + UI.highlight(text) })), h('span', { html: UI.highlight(';') })));
      const ls = lints();
      lintBox.innerHTML = '';
      ls.forEach((l) => lintBox.appendChild(h('div', { class: 'bl-lint ' + l.level }, { danger: '⛔', warn: '⚠️', info: '💡' }[l.level], ' ', l.msg)));
      clearTimeout(runTimer);
      if (ui.auto || isDml()) runTimer = setTimeout(showOutput, typing ? 250 : 0);
      else { out.innerHTML = ''; out.appendChild(h('div', { class: 'bl-empty' }, 'Auto-run is off. Press ▶ Run or Ctrl+Enter.')); meta.textContent = ''; }
    }
    function runNow() { clearTimeout(runTimer); showOutput(); }
    function redraw(noRecord) {
      const ae = document.activeElement;
      const k = ae && root.contains(ae) && ae.dataset ? ae.dataset.k : null;
      top.innerHTML = ''; top.append(...buildTop().filter(Boolean));
      form.innerHTML = ''; form.append(...buildForm().filter(Boolean));
      right.innerHTML = ''; right.append(...buildRight().filter(Boolean));
      if (k) { const el = root.querySelector(`[data-k="${k}"]`); if (el) el.focus(); }
      update({ noRecord });
    }

    // ----- output tabs -----
    function showOutput() {
      out.innerHTML = '';
      const tabs = S.kind === 'select'
        ? [['result', '📋 Result'], ['explain', '🗣️ In plain English'], ['plan', '🧭 Query plan'], ['steps', '🎬 Step through']]
        : [['result', '👀 Preview'], ['explain', '🗣️ In plain English']];
      if (!tabs.some((t) => t[0] === ui.tab)) ui.tab = 'result';
      const body = h('div', { class: 'bl-tab-body' });
      const bar = h('div', { class: 'seg small bl-tabs' }, tabs.map(([id, label]) => h('button', { class: 'seg-btn' + (ui.tab === id ? ' active' : ''), onclick: () => { ui.tab = id; showOutput(); } }, label)));
      out.append(bar, body);
      const q = sql();
      meta.textContent = '';
      try {
        if (ui.tab === 'explain') body.appendChild(h('ol', { class: 'bl-explain' }, describe().map((s, i) => h('li', { class: 'bl-ex-step', dataset: { c: s.k } }, h('span', { class: 'bl-ex-n' }, i + 1), h('span', { class: 'bl-pill', dataset: { c: s.k } }, s.kw), h('span', null, s.text)))));
        else if (ui.tab === 'plan') body.appendChild(Visuals.render({ type: 'explain', sql: q }, { sql: q }));
        else if (ui.tab === 'steps') body.appendChild(Visuals.render({ type: 'order', runner: (s) => DB.exec(s) }, { sql: q }));
        else if (S.kind === 'select') {
          const r = DB.exec(q);
          meta.textContent = `${r.last ? r.last.rows.length : 0} row${r.last && r.last.rows.length === 1 ? '' : 's'} · ${r.ms.toFixed(1)} ms`;
          if (!r.last || !r.last.rows.length) { body.appendChild(h('div', { class: 'bl-empty' }, '∅ The query ran but returned no rows. Loosen a filter or check the JOIN type.')); return; }
          const tbl = table(r.last, { max: 200, index: true });
          // Plain selected columns come first in the output, so column j maps back to S.cols[j].
          const filterable = S.cols.length;
          if (filterable) {
            tbl.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].slice(1, filterable + 1).forEach((td) => td.classList.add('bl-pick')));
            tbl.addEventListener('click', (e) => {
              const td = e.target.closest('td.bl-pick');
              if (!td) return;
              const tr = td.parentElement;
              const j = [...tr.children].indexOf(td) - 1;
              const v = r.last.rows[+tr.dataset.i][j];
              const col = S.cols[j];
              S.where.push(v === null ? { col, op: 'IS NULL', val: '', conj: 'AND' } : { col, op: family(col) === 'date' ? 'ON' : family(col) === 'bool' ? (v ? 'TRUE' : 'FALSE') : '=', val: String(v), conj: 'AND' });
              toast(`Filter added: ${col} = ${v === null ? 'NULL' : v}`);
              redraw();
            });
            body.appendChild(h('div', { class: 'muted xs bl-tip' }, '💡 Click a value in the first ', filterable, ' column', filterable > 1 ? 's' : '', ' to filter by it.'));
          }
          body.appendChild(tbl);
        } else body.appendChild(previewView());
      } catch (e) {
        meta.textContent = 'error';
        body.appendChild(Practice.feedbackCard(Practice.explainError(e.message, q, DB.schema()), { sql: q }));
      }
    }
    function previewView() {
      if (S.kind === 'update' && !S.set.some((x) => x.col)) return h('div', { class: 'bl-empty' }, 'Choose at least one column to SET.');
      const p = preview();
      const n = p.r.changes;
      meta.textContent = `${n} row${n === 1 ? '' : 's'} would change · ${p.r.ms.toFixed(1)} ms`;
      const box = h('div', { class: 'bl-preview' });
      box.appendChild(h('div', { class: 'bl-banner' + (n ? '' : ' none') }, h('b', null, S.kind === 'insert' ? `${n} row would be inserted` : S.kind === 'update' ? `${n} row${n === 1 ? '' : 's'} would be updated` : `${n} row${n === 1 ? '' : 's'} would be deleted`), h('span', { class: 'muted xs' }, 'Preview only: rolled back, nothing saved yet.')));
      if (S.kind === 'insert' && p.after) box.appendChild(table(p.after, { compact: true, caption: 'New row (with defaults filled in)', rowClass: () => 'bl-row-new', footer: false }));
      if (S.kind === 'delete' && p.before) box.appendChild(p.before.rows.length ? table(p.before, { compact: true, max: 50, caption: 'Rows that would be deleted', rowClass: () => 'bl-row-del' }) : h('div', { class: 'bl-empty' }, 'No rows match the WHERE clause.'));
      if (S.kind === 'update' && p.before) {
        if (!p.before.rows.length) box.appendChild(h('div', { class: 'bl-empty' }, 'No rows match the WHERE clause.'));
        else {
          const changed = (i, j) => p.after && p.after.rows[i] && p.after.rows[i][j] !== p.before.rows[i][j];
          box.appendChild(h('div', { class: 'bl-ba' },
            table(p.before, { compact: true, max: 50, caption: 'Before', cellClass: (i, j) => (changed(i, j) ? 'bl-cell-old' : '') }),
            p.after ? table(p.after, { compact: true, max: 50, caption: 'After', cellClass: (i, j) => (changed(i, j) ? 'bl-cell-new' : '') }) : null));
        }
      }
      const risky = (S.kind === 'update' || S.kind === 'delete') && !where().length;
      box.appendChild(h('div', { class: 'row wrap' },
        h('button', { class: 'btn sm' + (risky ? ' danger' : ''), disabled: !n, onclick: () => {
          if (risky && !confirm(`This ${S.kind.toUpperCase()} has no WHERE clause and changes all ${n} rows of ${S.table}. Apply anyway?`)) return;
          try { const r = DB.exec(sql()); toast(`✔ ${r.changes} row(s) ${S.kind === 'insert' ? 'inserted' : S.kind === 'update' ? 'updated' : 'deleted'}. Use ↺ Reset DB to restore the sample data.`, 'good'); Progress.logQuery && Progress.logQuery(sql(), true); App.refreshExplorer(); redraw(true); }
          catch (e) { toast(e.message, 'bad'); }
        } }, '✔ Apply to my database'),
        h('span', { class: 'muted xs' }, 'Changes your playground DB. ↺ Reset DB in the explorer undoes it.')));
      return box;
    }

    // ----- small widgets -----
    const sel = (value, options, onchange, attrs = {}) => h('select', { class: 'input sm', onchange: (e) => onchange(e.target.value), ...attrs }, options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: v === value }, l); }));
    const txt = (value, onval, attrs = {}) => h('input', { class: 'input sm', value: value ?? '', oninput: (e) => { onval(e.target.value); update({ typing: true }); }, ...attrs });
    const del = (fn, label = 'Remove') => h('button', { class: 'icon-btn xs bl-x', title: label, 'aria-label': label, onclick: () => { fn(); redraw(); } }, '✕');
    const add = (label, fn) => h('button', { class: 'chip-btn bl-add', onclick: () => { fn(); redraw(); } }, '+ ', label);
    const colTag = (c) => (c ? h('span', { class: 'bl-type' }, c.pk ? '🔑 ' : c.fk ? '🔗 ' : '', (c.type || 'ANY').toLowerCase()) : null);
    function step(key, kw, title, summary, ...body) {
      const closed = ui.closed.has(S.kind + key);
      const active = !!summary;
      const card = h('section', { class: 'bl-step' + (closed ? ' closed' : '') + (active ? ' active' : ''), dataset: { c: key } },
        h('button', { class: 'bl-step-hd', 'aria-expanded': closed ? 'false' : 'true', onclick: () => { closed ? ui.closed.delete(S.kind + key) : ui.closed.add(S.kind + key); redraw(true); } },
          h('span', { class: 'bl-pill', dataset: { c: key } }, kw),
          h('span', { class: 'bl-title' }, title),
          h('span', { class: 'bl-sum' }, summary || ''),
          S.kind === 'select' && RUNS[key] ? h('span', { class: 'bl-runs', title: 'Logical processing order: the database evaluates clauses in this order, not in the order they are written.' }, 'runs #', RUNS[key]) : null,
          h('span', { class: 'bl-caret' }, '▾')),
        closed ? null : h('div', { class: 'bl-body' }, ...body));
      card.addEventListener('mouseenter', () => root.querySelectorAll(`.bl-part[data-c="${key}"]`).forEach((e) => e.classList.add('hl')));
      card.addEventListener('mouseleave', () => root.querySelectorAll('.bl-part.hl').forEach((e) => e.classList.remove('hl')));
      return card;
    }
    function venn(type) {
      const on = { INNER: [0, 1, 0], LEFT: [1, 1, 0], RIGHT: [0, 1, 1], FULL: [1, 1, 1] }[type];
      return h('span', { class: 'bl-venn', html: `<svg viewBox="0 0 34 20" width="34" height="20" aria-hidden="true"><defs><clipPath id="vc-${type}"><circle cx="12" cy="10" r="8"/></clipPath></defs><circle cx="12" cy="10" r="8" class="${on[0] ? 'f' : ''}"/><circle cx="22" cy="10" r="8" class="${on[2] ? 'f' : ''}"/><circle cx="22" cy="10" r="8" clip-path="url(#vc-${type})" class="f mid"/><circle cx="12" cy="10" r="8" class="o"/><circle cx="22" cy="10" r="8" class="o"/></svg>` });
    }
    // One WHERE condition row: operators and the value input adapt to the column's data family.
    function valueInput(c, i) {
      const kind = opInfo(c)[2];
      const fam = family(c.col);
      const k = `w${i}v`;
      if (kind === 'none') return null;
      if (kind === 'weekday') return sel(String(c.val || '1'), WEEKDAYS.map((d, n) => [String(n), d]), (v) => { c.val = v; redraw(); }, { 'data-k': k });
      if (kind === 'year') {
        let years = [];
        try { years = DB.exec(`SELECT DISTINCT strftime('%Y', "${colInfo(c.col).name}") FROM "${tableOf(c.col)}" WHERE "${colInfo(c.col).name}" IS NOT NULL ORDER BY 1`).last.rows.map((r) => r[0]).filter(Boolean); } catch (e) { /* none */ }
        return sel(String(c.val || ''), [['', '— year —'], ...years], (v) => { c.val = v; redraw(); }, { 'data-k': k });
      }
      if (kind === 'month') return txt(c.val, (v) => { c.val = v; }, { type: 'month', 'data-k': k, placeholder: 'YYYY-MM' });
      if (kind === 'n') return h('span', { class: 'bl-fi' }, txt(c.val, (v) => { c.val = v.replace(/\D/g, ''); }, { type: 'number', min: 0, class: 'input sm bl-n', 'data-k': k, placeholder: 'N' }), h('span', { class: 'bl-eq' }, fam === 'date' ? 'days' : 'chars'));
      const type = fam === 'date' ? 'date' : fam === 'num' ? 'number' : 'text';
      if (kind === 'two') {
        const [x, y] = range(c);
        const set = (a, b) => { c.val = a; c.val2 = b; };
        return h('span', { class: 'bl-fi' },
          txt(x, (v) => set(v, range(c)[1]), { type, step: 'any', 'data-k': k, placeholder: 'from' }), h('span', { class: 'bl-eq' }, 'and'),
          txt(y, (v) => set(range(c)[0], v), { type, step: 'any', 'data-k': k + '2', placeholder: 'to' }));
      }
      const vals = distinctValues(c.col);
      const dl = `bl-dl-${i}`;
      const pattern = /LIKE/.test(c.op) ? 'e.g. A%  or  _b%' : c.op === 'GLOB' ? 'e.g. A*' : null;
      return h('span', { class: 'bl-fi' },
        txt(c.val, (v) => { c.val = v; }, { type: kind === 'list' ? 'text' : type, step: 'any', list: kind === 'one' && vals.length ? dl : null, 'data-k': k, placeholder: kind === 'list' ? 'a, b, c' : pattern || (fam === 'num' ? '0' : 'value') }),
        kind === 'one' && vals.length && type === 'text' ? h('datalist', { id: dl }, vals.slice(0, 60).map((v) => h('option', { value: String(v) }))) : null);
    }
    function condRow(c, i, cols, list) {
      const conj = i ? h('span', { class: 'bl-fi' },
        h('button', { class: 'bl-nest' + (c.nest ? ' on' : ''), title: c.nest ? 'Ungroup from the condition above' : 'Group with the condition above in ( )', 'aria-pressed': c.nest ? 'true' : 'false', onclick: () => { c.nest = !c.nest; redraw(); } }, '( )'),
        sel(c.conj, ['AND', 'OR'], (v) => { c.conj = v; redraw(); }, { class: 'input sm bl-conj', 'data-k': `w${i}j` })) : h('span', { class: 'bl-conj0' }, 'if');
      if (c.type === 'exists') {
        const rels = childRelations();
        return h('div', { class: 'bl-cond' + (c.nest ? ' nest' : '') }, h('div', { class: 'bl-line' }, conj,
          sel(c.neg ? 'no' : 'yes', [['yes', 'has related'], ['no', 'has NO related']], (v) => { c.neg = v === 'no'; redraw(); }, { class: 'input sm bl-op' }),
          sel(c.rel, rels.map((r) => [r.rel, r.label]), (v) => { c.rel = v; redraw(); }),
          h('span', { class: 'bl-type' }, 'EXISTS'),
          del(() => list.splice(i, 1), 'Remove condition')));
      }
      const fam = family(c.col);
      const kind = opInfo(c)[2];
      const vals = kind === 'list' ? distinctValues(c.col, 24) : [];
      const inChips = vals.length && vals.length <= 24 ? h('div', { class: 'bl-vals' }, vals.map((v) => {
        const cur = String(c.val || '').split(',').map((x) => x.trim()).filter(Boolean);
        const on = cur.includes(String(v));
        return h('button', { class: 'bl-val' + (on ? ' on' : ''), onclick: () => { c.val = (on ? cur.filter((x) => x !== String(v)) : [...cur, String(v)]).join(', '); redraw(); } }, String(v));
      })) : null;
      return h('div', { class: 'bl-cond' + (c.nest ? ' nest' : '') },
        h('div', { class: 'bl-line' }, conj,
          sel(c.col, cols.map((x) => [x, `${FAMILY_ICON[family(x)]}  ${x}`]), (v) => {
            c.col = v; c.val = ''; delete c.val2;
            if (!opsFor(v).some((o) => o[0] === c.op)) c.op = family(v) === 'bool' ? 'TRUE' : family(v) === 'date' ? 'ON' : '=';
            redraw();
          }, { 'data-k': `w${i}c` }),
          sel(c.op, opsFor(c.col).map((o) => [o[0], o[1]]), (v) => { const was = opInfo(c)[2]; c.op = v; if (opInfo(c)[2] !== was) { c.val = ''; delete c.val2; } redraw(); }, { 'data-k': `w${i}o`, class: 'input sm bl-op', title: `${fam} operators` }),
          valueInput(c, i),
          del(() => list.splice(i, 1), 'Remove condition')),
        inChips);
    }
    const whereStep = (cols, title) => {
      const rels = childRelations();
      return step('where', 'WHERE', title, where().length ? `${where().length} condition${where().length > 1 ? 's' : ''}` : '',
        S.where.map((c, i) => condRow(c, i, cols, S.where)),
        h('div', { class: 'row wrap' }, add('condition', () => { const c0 = cols[0]; S.where.push({ col: c0, op: family(c0) === 'bool' ? 'TRUE' : family(c0) === 'date' ? 'ON' : '=', val: '', conj: 'AND' }); }),
          rels.length ? add('related rows (EXISTS)', () => S.where.push({ type: 'exists', rel: rels[0].rel, neg: false, conj: 'AND' })) : null,
          S.where.length > 1 ? h('span', { class: 'muted xs' }, 'AND is evaluated before OR; ( ) groups a condition with the one above.') : null),
        h('div', { class: 'bl-legend muted xs' }, Object.entries({ num: 'number', text: 'text', date: 'date', bool: 'yes/no' }).map(([f, n]) => h('span', null, h('b', null, FAMILY_ICON[f]), ' ', n))));
    };

    // ----- top bar: statement type + templates -----
    function buildTop() {
      return [
        h('div', { class: 'bl-top-row' },
          h('div', { class: 'bl-kinds', role: 'tablist', 'aria-label': 'Statement type' }, KINDS.map(([k, ic, name, sub]) => h('button', {
            class: 'bl-kind' + (S.kind === k ? ' active' : ''), role: 'tab', 'aria-selected': S.kind === k ? 'true' : 'false',
            onclick: () => { if (S.kind !== k) { S = blank(k, S.table); if (k === 'select') S.cols = tableInfo(S.table).columns.slice(0, 4).map((c) => `${alias(S.table)}.${c.name}`); redraw(); } },
          }, h('span', { class: 'bl-kind-ic' }, ic), h('span', null, h('b', null, name), h('small', null, sub))))),
          h('div', { class: 'bl-tools' }, undoBtn, redoBtn,
            h('button', { class: 'btn sm ghost', title: 'Save this query to My queries (stored in this browser)', onclick: () => {
              const name = prompt('Name this query', `${S.kind.toUpperCase()} ${S.table}`);
              if (!name) return;
              const list = savedList().filter((q) => q.name !== name);
              list.unshift({ name, s: JSON.parse(JSON.stringify(S)) });
              toast(setSaved(list.slice(0, 24)) ? `Saved “${name}”` : 'Could not save: browser storage is unavailable');
              redraw(true);
            } }, '💾 Save'),
            h('button', { class: 'btn sm ghost', title: 'Clear every clause', onclick: () => { S = blank(S.kind, S.table); redraw(); } }, '↺ Start over'))),
        savedList().length ? h('div', { class: 'bl-tpl-row' }, h('span', { class: 'bl-tpl-lbl' }, '💾 My queries'),
          h('div', { class: 'bl-saved' }, savedList().map((q) => h('span', { class: 'bl-save' },
            h('button', { class: 'bl-save-ld', title: 'Load', onclick: () => { if (schema().some((t) => t.name === q.s.table)) { S = { ...blank(), ...JSON.parse(JSON.stringify(q.s)) }; redraw(); } else toast('That table no longer exists'); } }, (KINDS.find((k) => k[0] === q.s.kind) || KINDS[0])[1], ' ', q.name),
            h('button', { class: 'bl-save-x', title: 'Delete', 'aria-label': `Delete ${q.name}`, onclick: () => { setSaved(savedList().filter((x) => x.name !== q.name)); redraw(true); } }, '✕'))))) : null,
        h('div', { class: 'bl-tpl-row' }, h('span', { class: 'bl-tpl-lbl' }, '✨ Start from a recipe'),
          h('div', { class: 'bl-tpls' }, TEMPLATES.map((t) => h('button', { class: 'bl-tpl', title: t.hint, onclick: () => { S = fromTemplate(t); ui.tab = 'result'; redraw(); } },
            h('span', { class: 'bl-tpl-ic' }, t.icon), h('span', null, h('b', null, t.name), h('small', null, t.hint)))))),
      ];
    }

    // ----- clause cards -----
    function buildForm() {
      const sch = schema();
      const cols = allCols();
      const tablePick = step('from', S.kind === 'select' ? 'FROM' : S.kind === 'insert' ? 'INTO' : S.kind === 'update' ? 'UPDATE' : 'FROM', S.kind === 'select' ? 'Main table' : 'Target table', S.table,
        h('div', { class: 'bl-tables' }, sch.map((t) => {
          const d = ((window.SchemaDocs || {}).tables || {})[t.name];
          return h('button', { class: 'bl-table' + (t.name === S.table ? ' on' : ''), title: docOf(t.name) || t.name, onclick: () => {
            if (t.name === S.table) return;
            const k = S.kind;
            S = blank(k, t.name);
            if (k === 'select') S.cols = t.columns.slice(0, 4).map((c) => `${alias(t.name)}.${c.name}`);
            redraw();
          } }, h('span', { class: 'bl-table-ic' }, d ? d.icon : '▦'), h('span', { class: 'bl-table-nm' }, t.name), h('small', null, `${t.count} rows`));
        })),
        docOf(S.table) ? h('div', { class: 'bl-doc muted xs' }, docOf(S.table)) : null);

      if (S.kind === 'insert') {
        const info = tableInfo(S.table);
        const filled = info.columns.filter((c) => String(S.values[c.name] ?? '').trim() !== '').length;
        return [tablePick, step('values', 'VALUES', 'Values for the new row', filled ? `${filled} of ${info.columns.length} columns` : '',
          h('div', { class: 'bl-form' }, info.columns.map((c) => {
            let input;
            if (c.fk) {
              const ref = tableInfo(c.fk.table);
              const lbl = ref.columns.find((x) => isTextType(x) && !x.pk);
              let opts = [];
              try { opts = DB.exec(`SELECT "${c.fk.to}"${lbl ? `, "${lbl.name}"` : ''} FROM "${c.fk.table}" ORDER BY 1 LIMIT 300`).last.rows; } catch (e) { /* empty */ }
              input = sel(String(S.values[c.name] ?? ''), [['', c.notnull ? '— choose —' : '— none (NULL) —'], ...opts.map((r) => [String(r[0]), `${r[0]}${r[1] != null ? ' · ' + r[1] : ''}`])], (v) => { S.values[c.name] = v; redraw(); }, { 'data-k': `v-${c.name}` });
            } else {
              const vals = isTextType(c) ? distinctValues(c.name, 20) : [];
              input = h('span', { class: 'bl-fi' }, txt(S.values[c.name], (v) => { S.values[c.name] = v; }, { 'data-k': `v-${c.name}`, list: vals.length && vals.length <= 20 ? `bl-iv-${c.name}` : null, placeholder: c.pk ? 'auto' : c.dflt != null ? `default ${c.dflt}` : c.notnull ? 'required' : 'NULL', type: isNumType(c) && !c.pk ? 'text' : 'text', inputmode: isNumType(c) ? 'decimal' : null }),
                vals.length && vals.length <= 20 ? h('datalist', { id: `bl-iv-${c.name}` }, vals.map((v) => h('option', { value: String(v) }))) : null);
            }
            return h('label', { class: 'bl-field', title: docOf(S.table, c.name) || '' },
              h('span', { class: 'bl-field-nm' }, c.name, c.notnull && !c.pk && c.dflt == null ? h('span', { class: 'bl-req', title: 'NOT NULL' }, '*') : null, colTag(c)),
              input);
          })),
          h('div', { class: 'muted xs' }, 'Leave a field empty to use its default (🔑 primary keys are numbered automatically). Type NULL for an explicit NULL.'))];
      }

      if (S.kind === 'update') {
        const info = tableInfo(S.table);
        return [tablePick,
          step('set', 'SET', 'New values', S.set.filter((x) => x.col).length ? S.set.filter((x) => x.col).map((x) => x.col).join(', ') : '',
            S.set.map((x, i) => h('div', { class: 'bl-line' },
              sel(x.col, info.columns.filter((c) => !c.pk).map((c) => c.name), (v) => { x.col = v; redraw(); }, { 'data-k': `s${i}c` }),
              h('span', { class: 'bl-eq' }, '='),
              sel(x.mode, [['value', 'value'], ['expr', 'expression'], ['null', 'NULL']], (v) => { x.mode = v; if (v === 'expr' && !x.val) x.val = x.col; redraw(); }, { 'data-k': `s${i}m` }),
              x.mode === 'null' ? null : txt(x.val, (v) => { x.val = v; }, { 'data-k': `s${i}v`, class: 'input sm' + (x.mode === 'expr' ? ' mono' : ''), placeholder: x.mode === 'expr' ? `e.g. ${x.col} * 1.1` : 'new value' }),
              del(() => S.set.splice(i, 1)))),
            add('column', () => S.set.push({ col: (info.columns.find((c) => !c.pk && !S.set.some((y) => y.col === c.name)) || info.columns[0]).name, mode: 'value', val: '' }))),
          whereStep(cols, 'Which rows to change')];
      }

      if (S.kind === 'delete') return [tablePick, whereStep(cols, 'Which rows to delete')];

      // ----- SELECT -----
      const aggOpts = S.aggs.map(aggExpr);
      const outAliases = [...S.exprs.map((e) => e.alias), ...S.aggs.map((a) => a.alias), ...S.wins.map((x) => x.alias)].filter(Boolean);
      const colSearch = h('input', { class: 'input sm bl-search', type: 'search', placeholder: '🔍 Filter columns…', 'aria-label': 'Filter columns', oninput: (e) => {
        const q = e.target.value.toLowerCase();
        form.querySelectorAll('.bl-colgrid .bl-col').forEach((el) => { el.hidden = q && !el.dataset.name.toLowerCase().includes(q); });
      } });
      const numCol = cols.find((c) => isNumType(colInfo(c)) && !colInfo(c).pk && !colInfo(c).fk) || cols[0];
      const textCol = cols.find((c) => isTextType(colInfo(c))) || cols[0];
      const exprIdeas = [['ROUND', `ROUND(${numCol}, 1)`, 'rounded'], ['UPPER', `UPPER(${textCol})`, 'upper_text'], ['CASE', `CASE WHEN ${numCol} > 100 THEN 'high' ELSE 'low' END`, 'bucket'], ['COALESCE', `COALESCE(${textCol}, 'n/a')`, 'filled'], ['||', `${textCol} || ' / ' || ${cols[1] || textCol}`, 'label']];
      const selCount = S.cols.length + S.exprs.length + S.aggs.length + S.wins.length;

      return [
        tablePick,
        step('join', 'JOIN', 'Connect related tables', S.joins.length ? S.joins.map((j) => `${j.type[0]}·${j.table}`).join(', ') : '',
          S.joins.map((j, i) => h('div', { class: 'bl-join' },
            venn(j.type),
            sel(j.type, [['INNER', 'INNER'], ['LEFT', 'LEFT'], ['RIGHT', 'RIGHT'], ['FULL', 'FULL OUTER']], (v) => { j.type = v; redraw(); }, { 'data-k': `j${i}` }),
            h('span', { class: 'bl-join-t' }, h('b', null, j.table), ' ', h('span', { class: 'muted' }, alias(j.table))),
            h('code', { class: 'bl-on' }, 'ON ', j.on),
            del(() => {
              const a = alias(j.table);
              S.joins.splice(i, 1);
              const gone = (r) => r.split('.')[0] === a;
              S.cols = S.cols.filter((c) => !gone(c)); S.groupBy = S.groupBy.filter((c) => !gone(c));
              S.where = S.where.filter((c) => !gone(c.col)); S.order = S.order.filter((o) => !gone(o.col));
              S.aggs = S.aggs.filter((x) => x.col === '*' || !gone(x.col));
            }, 'Remove join'))),
          joinOptions().length ? h('div', { class: 'bl-joinopts' }, h('span', { class: 'muted xs' }, 'Related via foreign keys:'), joinOptions().map((o) => h('button', { class: 'chip-btn', title: `ON ${o.on}`, onclick: () => { S.joins.push({ table: o.table, on: o.on, type: 'INNER' }); redraw(); } }, '+ ', o.label, h('span', { class: 'muted xs' }, ` via ${o.via}`)))) : h('span', { class: 'muted xs' }, 'No more related tables.')),
        step('select', 'SELECT', 'Output columns', selCount ? `${selCount} column${selCount > 1 ? 's' : ''}` : 'all (*)',
          h('div', { class: 'bl-line' }, colSearch,
            h('label', { class: 'toggle', title: 'Remove duplicate rows from the result' }, h('input', { type: 'checkbox', checked: S.distinct, onchange: (e) => { S.distinct = e.target.checked; redraw(); } }), ' DISTINCT')),
          h('div', { class: 'bl-colgrid' }, inScope().map((t) => {
            const a = alias(t);
            const tc = tableInfo(t).columns.map((c) => `${a}.${c.name}`);
            return h('div', { class: 'bl-colgroup' },
              h('div', { class: 'bl-colgroup-hd' }, h('b', null, t), h('span', { class: 'muted' }, ' ', a),
                h('button', { class: 'bl-link', onclick: () => { tc.forEach((c) => { if (!S.cols.includes(c)) S.cols.push(c); }); redraw(); } }, 'all'),
                h('button', { class: 'bl-link', onclick: () => { S.cols = S.cols.filter((c) => !tc.includes(c)); redraw(); } }, 'none')),
              h('div', { class: 'bl-cols' }, tc.map((c) => {
                const info = colInfo(c);
                return h('label', { class: 'bl-col' + (S.cols.includes(c) ? ' on' : ''), dataset: { name: c }, title: docOf(t, info.name) || c },
                  h('input', { type: 'checkbox', checked: S.cols.includes(c), onchange: (e) => { e.target.checked ? S.cols.push(c) : (S.cols = S.cols.filter((x) => x !== c)); redraw(); } }),
                  h('span', null, info.name), colTag(info));
              })));
          })),
          S.cols.length ? h('div', { class: 'bl-order-strip' }, h('div', { class: 'muted xs' }, 'Output order & aliases'),
            S.cols.map((c, i) => h('div', { class: 'bl-outcol' },
              h('button', { class: 'icon-btn xs', title: 'Move left', 'aria-label': 'Move left', disabled: !i, onclick: () => { S.cols.splice(i - 1, 0, S.cols.splice(i, 1)[0]); redraw(); } }, '‹'),
              h('code', null, c),
              h('input', { class: 'bl-alias', value: S.colAlias[c] || '', placeholder: 'AS …', 'data-k': `ca-${c}`, oninput: (e) => { const v = e.target.value.replace(/\W/g, '_'); v ? (S.colAlias[c] = v) : delete S.colAlias[c]; update({ typing: true }); }, onchange: () => redraw() }),
              h('button', { class: 'icon-btn xs', title: 'Move right', 'aria-label': 'Move right', disabled: i === S.cols.length - 1, onclick: () => { S.cols.splice(i + 1, 0, S.cols.splice(i, 1)[0]); redraw(); } }, '›')))) : null,
          h('div', { class: 'bl-sub' }, h('div', { class: 'bl-sub-hd' }, 'ƒ Computed columns'),
            S.exprs.map((x, i) => h('div', { class: 'bl-line' },
              txt(x.expr, (v) => { x.expr = v; }, { class: 'input sm mono bl-grow', placeholder: 'expression', 'data-k': `e${i}` }),
              h('span', { class: 'bl-eq' }, 'AS'), txt(x.alias, (v) => { x.alias = v.replace(/\W/g, '_'); }, { class: 'input sm bl-al', placeholder: 'name', 'data-k': `e${i}a`, onchange: () => redraw() }),
              del(() => S.exprs.splice(i, 1)))),
            h('div', { class: 'row wrap' }, add('expression', () => S.exprs.push({ expr: '', alias: '' })),
              exprIdeas.map(([n, e, a]) => h('button', { class: 'chip-btn ghosty', title: e, onclick: () => { S.exprs.push({ expr: e, alias: a }); redraw(); } }, n)))),
          h('div', { class: 'bl-sub' }, h('div', { class: 'bl-sub-hd' }, '🪟 Window functions ', h('span', { class: 'muted xs' }, 'calculate across rows without collapsing them')),
            S.wins.map((x, i) => h('div', { class: 'bl-line bl-win' },
              sel(x.fn, WIN_FNS, (v) => { x.fn = v; if (!x.alias || WIN_FNS.map((f) => f.toLowerCase()).includes(x.alias)) x.alias = v.toLowerCase(); redraw(); }, { 'data-k': `x${i}f` }),
              WIN_NOARG.includes(x.fn) ? null : x.fn === 'NTILE' ? txt(x.col || '4', (v) => { x.col = v.replace(/\D/g, ''); }, { class: 'input sm bl-n', 'data-k': `x${i}n`, title: 'number of buckets' }) : sel(x.col, [['', x.fn === 'COUNT' ? '*' : '— column —'], ...cols], (v) => { x.col = v; redraw(); }, { 'data-k': `x${i}c` }),
              h('span', { class: 'bl-eq' }, 'OVER'),
              sel(x.part, [['', 'whole result'], ...cols.map((c) => [c, 'per ' + c])], (v) => { x.part = v; redraw(); }, { 'data-k': `x${i}p` }),
              sel(x.ord, [['', 'no order'], ...cols.map((c) => [c, 'by ' + c])], (v) => { x.ord = v; redraw(); }, { 'data-k': `x${i}o` }),
              x.ord ? sel(x.dir, ['ASC', 'DESC'], (v) => { x.dir = v; redraw(); }) : null,
              h('span', { class: 'bl-eq' }, 'AS'), txt(x.alias, (v) => { x.alias = v.replace(/\W/g, '_'); }, { class: 'input sm bl-al', 'data-k': `x${i}a`, onchange: () => redraw() }),
              del(() => S.wins.splice(i, 1)))),
            add('window function', () => S.wins.push({ fn: 'ROW_NUMBER', col: '', part: '', ord: numCol, dir: 'DESC', alias: 'row_number' })))),
        whereStep(cols, 'Keep only rows that match'),
        step('group', 'GROUP BY', 'Group rows & aggregate', [S.groupBy.length ? `by ${S.groupBy.length}` : '', S.aggs.length ? `${S.aggs.length} aggregate${S.aggs.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · '),
          h('div', { class: 'bl-cols' }, cols.map((c) => h('label', { class: 'bl-col' + (S.groupBy.includes(c) ? ' on' : '') },
            h('input', { type: 'checkbox', checked: S.groupBy.includes(c), onchange: (e) => { if (e.target.checked) { S.groupBy.push(c); if (!S.cols.includes(c)) S.cols.push(c); } else S.groupBy = S.groupBy.filter((x) => x !== c); redraw(); } }), c))),
          h('div', { class: 'bl-sub' }, h('div', { class: 'bl-sub-hd' }, 'Σ Aggregates'),
            S.aggs.map((a, i) => h('div', { class: 'bl-line' },
              sel(a.fn, AGG_FNS, (v) => { a.fn = v; if (v !== 'COUNT' && a.col === '*') a.col = numCol; redraw(); }, { 'data-k': `a${i}f` }),
              h('span', { class: 'bl-eq' }, '('),
              sel(a.col, a.fn === 'COUNT' ? ['*', ...cols] : cols, (v) => { a.col = v; if (v === '*') a.distinct = false; redraw(); }, { 'data-k': `a${i}c` }),
              h('span', { class: 'bl-eq' }, ')'),
              a.col !== '*' ? h('label', { class: 'toggle xs' }, h('input', { type: 'checkbox', checked: a.distinct, onchange: (e) => { a.distinct = e.target.checked; redraw(); } }), 'DISTINCT') : null,
              h('span', { class: 'bl-eq' }, 'AS'), txt(a.alias, (v) => { a.alias = v.replace(/\W/g, '_'); }, { class: 'input sm bl-al', placeholder: 'name', 'data-k': `a${i}a`, onchange: () => redraw() }),
              del(() => S.aggs.splice(i, 1)))),
            h('div', { class: 'row wrap' }, add('aggregate', () => S.aggs.push({ fn: 'COUNT', col: '*', distinct: false, alias: S.aggs.length ? 'n' + S.aggs.length : 'n' }))))),
        step('having', 'HAVING', 'Keep only groups that match', having().length ? `${having().length} condition${having().length > 1 ? 's' : ''}` : '',
          S.groupBy.length || S.aggs.length ? [
            S.having.map((c, i) => h('div', { class: 'bl-line' },
              i ? sel(c.conj, ['AND', 'OR'], (v) => { c.conj = v; redraw(); }, { class: 'input sm bl-conj' }) : h('span', { class: 'bl-conj0' }, 'if'),
              sel(c.expr, [...new Set([...aggOpts, 'COUNT(*)', ...S.groupBy, c.expr].filter(Boolean))], (v) => { c.expr = v; redraw(); }, { 'data-k': `h${i}e` }),
              sel(c.op, ['>', '>=', '<', '<=', '=', '<>'], (v) => { c.op = v; redraw(); }, { class: 'input sm bl-op' }),
              txt(c.val, (v) => { c.val = v; }, { 'data-k': `h${i}v`, class: 'input sm bl-n' }),
              del(() => S.having.splice(i, 1)))),
            add('group condition', () => S.having.push({ expr: aggOpts[0] || 'COUNT(*)', op: '>', val: '1', conj: 'AND' }))]
            : h('span', { class: 'muted xs' }, 'Group rows or add an aggregate first: HAVING filters groups by their aggregate values.')),
        step('order', 'ORDER BY', 'Sort the result', S.order.filter((o) => o.col).map((o) => `${o.col.split('.').pop()} ${o.dir === 'DESC' ? '↓' : '↑'}`).join(', '),
          S.order.map((o, i) => h('div', { class: 'bl-line' },
            h('span', { class: 'bl-conj0' }, i ? 'then' : 'by'),
            sel(o.col, [...new Set([...outAliases, ...S.cols, ...cols, o.col].filter(Boolean))], (v) => { o.col = v; redraw(); }, { 'data-k': `o${i}` }),
            h('div', { class: 'seg small' }, ['ASC', 'DESC'].map((d) => h('button', { class: 'seg-btn' + (o.dir === d ? ' active' : ''), onclick: () => { o.dir = d; redraw(); } }, d === 'ASC' ? '↑ ASC' : '↓ DESC'))),
            del(() => S.order.splice(i, 1)))),
          add(S.order.length ? 'tie-breaker' : 'sort key', () => S.order.push({ col: outAliases[0] || S.cols[0] || cols[0], dir: 'ASC' }))),
        step('limit', 'LIMIT', 'Row limit & paging', S.limit !== '' ? `${S.limit}${+S.offset ? ` from ${S.offset}` : ''}` : +S.offset ? `skip ${S.offset}` : '',
          h('div', { class: 'bl-line' },
            h('span', { class: 'bl-conj0' }, 'show'), txt(S.limit, (v) => { S.limit = v.replace(/\D/g, ''); }, { type: 'number', min: 0, placeholder: 'all', class: 'input sm bl-n', 'data-k': 'lim' }),
            h('span', { class: 'bl-conj0' }, 'rows, skip'), txt(S.offset, (v) => { S.offset = v.replace(/\D/g, ''); }, { type: 'number', min: 0, placeholder: '0', class: 'input sm bl-n', 'data-k': 'off' })),
          h('div', { class: 'row wrap' }, ['5', '10', '25', '100'].map((n) => h('button', { class: 'chip-btn' + (S.limit === n ? ' on' : ''), onclick: () => { S.limit = S.limit === n ? '' : n; redraw(); } }, n)),
            S.limit ? h('button', { class: 'chip-btn', onclick: () => { S.offset = String((+S.offset || 0) + +S.limit); redraw(); } }, 'Next page ›') : null,
            +S.offset ? h('button', { class: 'chip-btn', onclick: () => { S.offset = String(Math.max(0, +S.offset - (+S.limit || 0))); if (S.offset === '0') S.offset = ''; redraw(); } }, '‹ Previous') : null)),
      ];
    }

    // ----- right panel -----
    function buildRight() {
      return [
        h('div', { class: 'card-hd bl-right-hd' }, h('h2', null, 'Generated SQL'),
          h('div', { class: 'row' },
            h('button', { class: 'icon-btn', title: 'Copy SQL', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(sql()); toast('SQL copied'); } }, '⧉ Copy'),
            h('button', { class: 'icon-btn', title: 'Edit the SQL by hand in the playground', onclick: () => App.openInPlayground(sql()) }, '🧪 Playground'))),
        sqlBox, lintBox,
        h('div', { class: 'bl-runbar' },
          h('button', { class: 'btn sm', title: 'Run (Ctrl+Enter)', onclick: runNow }, S.kind === 'select' ? '▶ Run' : '👀 Preview'),
          S.kind === 'select' ? h('label', { class: 'toggle bl-auto', title: 'Re-run the query after every change' }, h('input', { type: 'checkbox', checked: ui.auto, onchange: (e) => { ui.auto = e.target.checked; update({ noRecord: true }); } }), ' Auto-run') : null,
          S.kind === 'select' ? h('button', { class: 'icon-btn', title: 'Download the result as CSV', onclick: () => {
            try {
              const r = DB.exec(sql());
              if (!r.last) return toast('No rows to export');
              const a = h('a', { href: URL.createObjectURL(new Blob([csv(r.last)], { type: 'text/csv' })), download: `${S.table}-query.csv` });
              document.body.appendChild(a); a.click(); a.remove();
            } catch (e) { toast(e.message); }
          } }, '⬇ CSV') : null,
          meta),
        out,
      ];
    }

    root.append(
      h('div', { class: 'crumbs' }, 'SQL › ', h('b', null, 'Query Builder')),
      h('div', { class: 'bl-hero' },
        h('div', null, h('h1', null, '🧩 Visual Query Builder'),
          h('p', { class: 'muted' }, 'Pick a statement, configure each clause, and watch the SQL write itself. Hover a clause to see its SQL; changes to data are previewed safely before you apply them.'))),
      top,
      h('div', { class: 'bl-grid' }, form, right));
    redraw(true);
    return root;
  }
  window.Builder = { render };
})();
