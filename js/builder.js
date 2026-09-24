// Visual query builder: configure clauses, SQL is generated live.
(function () {
  const { h, esc, table, code } = UI;
  const ALIAS = { patients: 'p', invoices: 'i', payors: 'py', payments: 'pm', charges: 'c', practitioners: 'pr', treatment_locations: 'tl', transactions: 't' };
  const alias = (t) => ALIAS[t] || t.slice(0, 2);
  let S = null;
  const init = () => ({ table: 'invoices', cols: ['i.invoice_id', 'i.status', 'i.total_amount'], joins: [], where: [], groupBy: [], aggs: [], having: null, order: { col: '', dir: 'ASC' }, limit: '', distinct: false });

  function schema() { return DB.schema().filter((t) => t.type === 'table'); }
  function inScope() { return [S.table, ...S.joins.map((j) => j.table)]; }
  function allCols() {
    const sch = schema();
    return inScope().flatMap((t) => (sch.find((x) => x.name === t) || { columns: [] }).columns.map((c) => `${alias(t)}.${c.name}`));
  }
  function joinOptions() {
    const sch = schema();
    const scope = inScope();
    const opts = [];
    sch.forEach((t) => {
      t.fks.forEach((f) => {
        if (scope.includes(t.name) && !scope.includes(f.table)) opts.push({ table: f.table, on: `${alias(f.table)}.${f.to} = ${alias(t.name)}.${f.from}`, label: `${f.table} (via ${t.name}.${f.from})` });
        if (scope.includes(f.table) && !scope.includes(t.name)) opts.push({ table: t.name, on: `${alias(t.name)}.${f.from} = ${alias(f.table)}.${f.to}`, label: `${t.name} (via ${t.name}.${f.from})` });
      });
    });
    return opts;
  }
  function sql() {
    const sel = [...S.cols, ...S.aggs.map((a) => `${a.fn}(${a.col === '*' ? '*' : (a.distinct ? 'DISTINCT ' : '') + a.col})${a.alias ? ' AS ' + a.alias : ''}`)];
    let s = `SELECT ${S.distinct ? 'DISTINCT ' : ''}${sel.length ? sel.join(',\n       ') : '*'}\nFROM ${S.table} ${alias(S.table)}`;
    S.joins.forEach((j) => { s += `\n${j.type} JOIN ${j.table} ${alias(j.table)} ON ${j.on}`; });
    const w = S.where.filter((c) => c.col);
    if (w.length) s += '\nWHERE ' + w.map((c, i) => (i ? `  ${c.conj} ` : '') + cond(c)).join('\n');
    if (S.groupBy.length) s += `\nGROUP BY ${S.groupBy.join(', ')}`;
    if (S.having && S.having.agg) s += `\nHAVING ${S.having.agg} ${S.having.op} ${S.having.val}`;
    if (S.order.col) s += `\nORDER BY ${S.order.col} ${S.order.dir}`;
    if (S.limit) s += `\nLIMIT ${S.limit}`;
    return s + ';';
  }
  function cond(c) {
    const v = c.val.trim();
    const lit = (x) => (x === '' ? "''" : /^-?\d+(\.\d+)?$/.test(x) ? x : `'${x.replace(/'/g, "''")}'`);
    if (c.op === 'IS NULL' || c.op === 'IS NOT NULL') return `${c.col} ${c.op}`;
    if (c.op === 'IN') return `${c.col} IN (${v.split(',').map((x) => lit(x.trim())).join(', ')})`;
    if (c.op === 'BETWEEN') { const [a, b] = v.split(/\s+and\s+|,/i).map((x) => x.trim()); return `${c.col} BETWEEN ${lit(a || '')} AND ${lit(b || '')}`; }
    if (c.op === 'LIKE') return `${c.col} LIKE ${lit(v.includes('%') ? v : '%' + v + '%')}`;
    return `${c.col} ${c.op} ${lit(v)}`;
  }

  function render() {
    if (!S) S = init();
    const root = h('div', { class: 'page builder' });
    const out = h('div');
    const sqlBox = h('div', { class: 'bl-sql' });
    function refreshSql() { sqlBox.innerHTML = ''; sqlBox.appendChild(h('pre', { class: 'code', html: UI.highlight(sql()) })); }
    function run() {
      out.innerHTML = '';
      try { const r = DB.exec(sql()); out.appendChild(r.last ? table(r.last, { max: 200 }) : h('div', { class: 'muted' }, 'No rows')); }
      catch (e) { out.appendChild(Practice.feedbackCard(Practice.explainError(e.message, sql(), DB.schema()), { sql: sql() })); }
    }
    function redraw() { root.innerHTML = ''; root.append(...build()); refreshSql(); run(); }
    const sel = (value, options, onchange, attrs = {}) => h('select', { class: 'input sm', onchange: (e) => onchange(e.target.value), ...attrs }, options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: v === value }, l); }));
    const step = (kw, title, ...body) => h('div', { class: 'bl-step' }, h('div', { class: 'bl-kw' }, kw), h('div', { class: 'bl-body' }, h('div', { class: 'bl-title' }, title), ...body));

    function build() {
      const cols = allCols();
      const sch = schema();
      return [
        h('div', { class: 'crumbs' }, 'SQL › ', h('b', null, 'Query Builder')),
        h('h1', null, '🧩 Visual Query Builder'),
        h('p', { class: 'muted' }, 'Configure each clause in logical order — the SQL is written for you. Then open it in the playground to keep editing by hand.'),
        h('div', { class: 'bl-grid' },
          h('div', { class: 'bl-steps card' },
            step('FROM', 'Choose the main table', sel(S.table, sch.map((t) => [t.name, `${t.name} (${t.count} rows)`]), (v) => { S = init(); S.table = v; S.cols = []; redraw(); })),
            step('JOIN', 'Connect related tables (detected from foreign keys)',
              S.joins.map((j, i) => h('div', { class: 'bl-line' }, sel(j.type, ['INNER', 'LEFT'], (v) => { j.type = v; redraw(); }), h('code', null, `${j.table} ${alias(j.table)} ON ${j.on}`), h('button', { class: 'icon-btn xs', onclick: () => { S.joins.splice(i, 1); const sc = inScope().map(alias); S.cols = S.cols.filter((c) => sc.includes(c.split('.')[0])); redraw(); } }, '✕'))),
              joinOptions().length ? h('div', { class: 'row wrap' }, joinOptions().map((o) => h('button', { class: 'chip-btn', onclick: () => { S.joins.push({ table: o.table, on: o.on, type: 'INNER' }); redraw(); } }, '+ ', o.label))) : h('span', { class: 'muted xs' }, 'No more related tables.')),
            step('SELECT', 'Choose columns', h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: S.distinct, onchange: (e) => { S.distinct = e.target.checked; redraw(); } }), ' DISTINCT'),
              h('div', { class: 'bl-cols' }, cols.map((c) => h('label', { class: 'bl-col' + (S.cols.includes(c) ? ' on' : '') }, h('input', { type: 'checkbox', checked: S.cols.includes(c), onchange: (e) => { e.target.checked ? S.cols.push(c) : (S.cols = S.cols.filter((x) => x !== c)); redraw(); } }), c)))),
            step('WHERE', 'Filter rows',
              S.where.map((c, i) => h('div', { class: 'bl-line' },
                i ? sel(c.conj, ['AND', 'OR'], (v) => { c.conj = v; redraw(); }) : h('span', { class: 'muted xs' }, 'where'),
                sel(c.col, cols, (v) => { c.col = v; redraw(); }),
                sel(c.op, ['=', '<>', '>', '>=', '<', '<=', 'LIKE', 'IN', 'BETWEEN', 'IS NULL', 'IS NOT NULL'], (v) => { c.op = v; redraw(); }),
                /NULL/.test(c.op) ? null : h('input', { class: 'input sm', value: c.val, placeholder: c.op === 'IN' ? 'a, b, c' : c.op === 'BETWEEN' ? 'low, high' : 'value', onchange: (e) => { c.val = e.target.value; redraw(); } }),
                h('button', { class: 'icon-btn xs', onclick: () => { S.where.splice(i, 1); redraw(); } }, '✕'))),
              h('button', { class: 'chip-btn', onclick: () => { S.where.push({ col: cols[0], op: '=', val: '', conj: 'AND' }); redraw(); } }, '+ condition')),
            step('GROUP BY', 'Group rows & aggregate',
              h('div', { class: 'bl-cols' }, cols.map((c) => h('label', { class: 'bl-col' + (S.groupBy.includes(c) ? ' on' : '') }, h('input', { type: 'checkbox', checked: S.groupBy.includes(c), onchange: (e) => { if (e.target.checked) { S.groupBy.push(c); if (!S.cols.includes(c)) S.cols.push(c); } else S.groupBy = S.groupBy.filter((x) => x !== c); redraw(); } }), c))),
              S.aggs.map((a, i) => h('div', { class: 'bl-line' }, sel(a.fn, ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'], (v) => { a.fn = v; redraw(); }), sel(a.col, ['*', ...cols], (v) => { a.col = v; redraw(); }),
                h('input', { class: 'input sm', value: a.alias, placeholder: 'alias', onchange: (e) => { a.alias = e.target.value.replace(/\W/g, '_'); redraw(); } }), h('button', { class: 'icon-btn xs', onclick: () => { S.aggs.splice(i, 1); redraw(); } }, '✕'))),
              h('button', { class: 'chip-btn', onclick: () => { S.aggs.push({ fn: 'COUNT', col: '*', alias: 'n' + (S.aggs.length || '') }); redraw(); } }, '+ aggregate'),
              S.groupBy.length && S.cols.some((c) => !S.groupBy.includes(c)) ? h('div', { class: 'note small' }, '⚠️ Selected columns that are not in GROUP BY: ', S.cols.filter((c) => !S.groupBy.includes(c)).join(', '), '. Most databases reject this — SQLite silently picks an arbitrary row.') : null),
            step('HAVING', 'Filter groups', S.aggs.length ? h('div', { class: 'bl-line' },
              sel(S.having ? S.having.agg : '', [['', '— none —'], ...S.aggs.map((a) => `${a.fn}(${a.col})`)], (v) => { S.having = v ? { agg: v, op: (S.having && S.having.op) || '>', val: (S.having && S.having.val) || '1' } : null; redraw(); }),
              S.having ? sel(S.having.op, ['>', '>=', '<', '<=', '=', '<>'], (v) => { S.having.op = v; redraw(); }) : null,
              S.having ? h('input', { class: 'input sm', value: S.having.val, onchange: (e) => { S.having.val = e.target.value; redraw(); } }) : null) : h('span', { class: 'muted xs' }, 'Add an aggregate first — HAVING filters groups by aggregate values.')),
            step('ORDER BY', 'Sort', h('div', { class: 'bl-line' }, sel(S.order.col, [['', '— none —'], ...S.cols, ...S.aggs.map((a) => a.alias || `${a.fn}(${a.col})`)], (v) => { S.order.col = v; redraw(); }), sel(S.order.dir, ['ASC', 'DESC'], (v) => { S.order.dir = v; redraw(); }))),
            step('LIMIT', 'Max rows', h('input', { class: 'input sm', type: 'number', min: 0, value: S.limit, placeholder: 'all', onchange: (e) => { S.limit = e.target.value; redraw(); } })),
            h('button', { class: 'btn sm ghost', onclick: () => { S = init(); redraw(); } }, '↺ Start over')),
          h('div', { class: 'bl-right' },
            h('div', { class: 'card sticky' }, h('div', { class: 'card-hd' }, h('h2', null, 'Generated SQL'), h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: run }, '▶ Run'), h('button', { class: 'btn sm ghost', onclick: () => App.openInPlayground(sql()) }, '🧪 Playground'), h('button', { class: 'btn sm ghost', onclick: () => { out.innerHTML = ''; out.appendChild(Visuals.render({ type: 'order', runner: (s) => DB.exec(s) }, { sql: sql() })); } }, '🎬 Step through'))), sqlBox, h('div', { class: 'jv-cap' }, 'Result'), out))),
      ];
    }
    redraw();
    return root;
  }
  window.Builder = { render };
})();
