// Interactive visual explainers. Visuals.render(spec, lesson) → HTMLElement
(function () {
  const { h, esc, svgEl, table, code, groupColor, fmt } = UI;
  const q = (sql) => DB.sandbox(sql).last || { columns: [], rows: [] };
  const btnGroup = (opts, active, onPick, cls = '') => {
    const wrap = h('div', { class: 'seg ' + cls });
    const btns = opts.map((o) => {
      const [val, label] = Array.isArray(o) ? o : [o, o];
      const b = h('button', { class: 'seg-btn' + (val === active ? ' active' : ''), onclick: () => { btns.forEach((x) => x.classList.remove('active')); b.classList.add('active'); onPick(val); } }, label);
      return b;
    });
    btns.forEach((b) => wrap.appendChild(b));
    return wrap;
  };
  const card = (title, sub, ...kids) => h('div', { class: 'viz' }, h('div', { class: 'viz-hd' }, h('div', { class: 'viz-title' }, '🎬 ', title), sub ? h('div', { class: 'viz-sub' }, sub) : null), ...kids);
  const stepper = (n, render, { auto = 1400, labels } = {}) => {
    let i = 0, timer = null;
    const body = h('div', { class: 'step-body' });
    const counter = h('span', { class: 'step-count' });
    const dots = h('div', { class: 'step-dots' }, Array.from({ length: n }, (_, k) => h('button', { class: 'dot', title: labels ? labels[k] : `Step ${k + 1}`, onclick: () => { stop(); go(k); } }, labels ? labels[k] : k + 1)));
    const prev = h('button', { class: 'btn sm ghost', onclick: () => { stop(); go(Math.max(0, i - 1)); } }, '◀ Back');
    const next = h('button', { class: 'btn sm', onclick: () => { stop(); go(Math.min(n - 1, i + 1)); } }, 'Next ▶');
    const play = h('button', { class: 'btn sm ghost', onclick: () => (timer ? stop() : start()) }, '⏵ Play');
    function go(k) {
      i = k;
      body.innerHTML = '';
      body.appendChild(render(i));
      counter.textContent = `${i + 1} / ${n}`;
      [...dots.children].forEach((d, j) => { d.classList.toggle('active', j === i); d.classList.toggle('done', j < i); });
      prev.disabled = i === 0; next.disabled = i === n - 1;
    }
    function start() { play.textContent = '⏸ Pause'; if (i === n - 1) go(0); timer = setInterval(() => { if (i >= n - 1) stop(); else go(i + 1); }, auto); }
    function stop() { clearInterval(timer); timer = null; play.textContent = '⏵ Play'; }
    go(0);
    return h('div', { class: 'stepper' }, h('div', { class: 'step-ctrl' }, prev, play, next, counter, dots), body);
  };

  // ---------------- JOIN explorer ----------------
  function joinViz(spec) {
    const withInv = q(`SELECT DISTINCT patient_id FROM invoices ORDER BY patient_id LIMIT 4`).rows.map((r) => r[0]);
    const pats = q(`SELECT patient_id, first_name || ' ' || last_name AS patient FROM patients WHERE patient_id IN (${[...withInv, 9, 17].join(',')}) ORDER BY patient_id`);
    const invs = q(`SELECT * FROM (SELECT invoice_id, patient_id, total_amount FROM invoices WHERE patient_id IN (${withInv.slice(0, 3).join(',')}) ORDER BY invoice_id LIMIT 5)
                    UNION ALL SELECT * FROM (SELECT invoice_id, patient_id, total_amount FROM invoices WHERE patient_id NOT IN (${[...withInv, 9, 17].join(',')}) ORDER BY invoice_id LIMIT 2)`);
    const L = pats.rows, R = invs.rows;
    let type = spec.join || 'inner';
    const leftT = h('div', { class: 'jv-side' });
    const rightT = h('div', { class: 'jv-side' });
    const lines = svgEl('svg', { class: 'jv-lines' });
    const stage = h('div', { class: 'jv-stage' }, leftT, lines, rightT);
    const resBox = h('div', { class: 'jv-res' });
    const sqlBox = h('div');
    const venn = h('div', { class: 'jv-venn' });
    const explain = h('div', { class: 'viz-explain' });
    const TEXT = {
      inner: 'Only rows with a <b>match on both sides</b> survive. Patients without invoices and invoices whose patient is not in the left table disappear.',
      left: 'Every row from the <b>left</b> table (patients) is kept. Where no invoice matches, the invoice columns are filled with <span class="null">NULL</span>.',
      right: 'Every row from the <b>right</b> table (invoices) is kept. Invoices whose patient is not in the left table get <span class="null">NULL</span> patient columns.',
      full: 'Everything from <b>both</b> sides: matches are combined, unmatched rows from either side are padded with <span class="null">NULL</span>.',
      cross: 'No condition at all: <b>every</b> patient is paired with <b>every</b> invoice (' + L.length + ' × ' + R.length + ' = ' + L.length * R.length + ' rows). This is a Cartesian product.',
    };
    function compute() {
      const out = [];
      if (type === 'cross') { L.forEach((l, i) => R.forEach((r, j) => out.push({ l: i, r: j, kind: 'match' }))); return out; }
      const matchedR = new Set();
      L.forEach((l, i) => {
        const ms = R.map((r, j) => (r[1] === l[0] ? j : -1)).filter((j) => j >= 0);
        ms.forEach((j) => { matchedR.add(j); out.push({ l: i, r: j, kind: 'match' }); });
        if (!ms.length && (type === 'left' || type === 'full')) out.push({ l: i, r: null, kind: 'left' });
      });
      if (type === 'right' || type === 'full') R.forEach((r, j) => { if (!matchedR.has(j)) out.push({ l: null, r: j, kind: 'right' }); });
      if (type === 'right') out.sort((a, b) => a.r - b.r);
      return out;
    }
    function draw() {
      const res = compute();
      const keepL = new Set(res.filter((x) => x.l !== null).map((x) => x.l));
      const keepR = new Set(res.filter((x) => x.r !== null).map((x) => x.r));
      leftT.innerHTML = ''; rightT.innerHTML = '';
      leftT.appendChild(h('div', { class: 'jv-cap' }, 'patients ', h('span', { class: 'muted' }, '(left)')));
      leftT.appendChild(table(pats, { compact: true, footer: false, scroll: false, rowClass: (i) => (keepL.has(i) ? 'keep' : 'drop') }));
      rightT.appendChild(h('div', { class: 'jv-cap' }, 'invoices ', h('span', { class: 'muted' }, '(right)')));
      rightT.appendChild(table(invs, { compact: true, footer: false, scroll: false, rowClass: (i) => (keepR.has(i) ? 'keep' : 'drop'), cellClass: (i, j) => (j === 1 ? 'fkcell' : '') }));
      const cols = ['patient_id', 'patient', 'invoice_id', 'inv.patient_id', 'total_amount'];
      const rows = res.map((x) => [...(x.l !== null ? L[x.l] : [null, null]), ...(x.r !== null ? R[x.r] : [null, null, null])]);
      resBox.innerHTML = '';
      resBox.appendChild(h('div', { class: 'jv-cap' }, `Result: ${rows.length} rows`));
      resBox.appendChild(table({ columns: cols, rows }, { compact: true, max: 60, rowClass: (i) => 'k-' + res[i].kind, cellClass: (i, j, v) => (v === null ? 'nullcell' : '') }));
      const on = type === 'cross' ? '' : '\n  ON p.patient_id = i.patient_id';
      const kw = { inner: 'INNER JOIN', left: 'LEFT JOIN', right: 'RIGHT JOIN', full: 'FULL OUTER JOIN', cross: 'CROSS JOIN' }[type];
      sqlBox.innerHTML = '';
      sqlBox.appendChild(code(`SELECT p.patient_id, p.first_name, i.invoice_id, i.total_amount\nFROM patients p\n${kw} invoices i${on};`, { run: true }));
      explain.innerHTML = TEXT[type];
      venn.innerHTML = vennSvg({ inner: [0, 1, 0], left: [1, 1, 0], right: [0, 1, 1], full: [1, 1, 1], cross: [1, 1, 1] }[type], 'patients', 'invoices', type === 'cross');
      requestAnimationFrame(() => drawLines(res));
    }
    function drawLines(res) {
      lines.innerHTML = '';
      const sr = stage.getBoundingClientRect();
      const lrows = leftT.querySelectorAll('tbody tr'), rrows = rightT.querySelectorAll('tbody tr');
      if (!lrows.length) return;
      lines.setAttribute('width', sr.width); lines.setAttribute('height', sr.height);
      const x1 = leftT.getBoundingClientRect().right - sr.left, x2 = rightT.getBoundingClientRect().left - sr.left;
      const seen = new Set();
      res.forEach((x) => {
        if (x.l === null || x.r === null) return;
        const k = x.l + ':' + x.r;
        if (seen.has(k)) return; seen.add(k);
        const a = lrows[x.l].getBoundingClientRect(), b = rrows[x.r].getBoundingClientRect();
        const y1 = a.top + a.height / 2 - sr.top, y2 = b.top + b.height / 2 - sr.top;
        const mx = (x1 + x2) / 2;
        lines.appendChild(svgEl('path', { d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, class: type === 'cross' ? 'jl cross' : 'jl' }));
      });
    }
    const ro = new ResizeObserver(() => drawLines(compute()));
    ro.observe(stage);
    draw();
    return card('JOIN Explorer', 'Pick a join type and watch which rows survive. Lines connect rows where patients.patient_id = invoices.patient_id.',
      h('div', { class: 'viz-row' }, btnGroup([['inner', 'INNER'], ['left', 'LEFT'], ['right', 'RIGHT'], ['full', 'FULL OUTER'], ['cross', 'CROSS']], type, (v) => { type = v; draw(); }), venn),
      explain, stage, h('div', { class: 'legend' }, h('span', { class: 'lg keep' }, 'kept'), h('span', { class: 'lg drop' }, 'discarded'), h('span', { class: 'lg k-left' }, 'left only (NULL-padded)'), h('span', { class: 'lg k-right' }, 'right only (NULL-padded)')),
      resBox, sqlBox);
  }
  function vennSvg([a, ab, b], la, lb, cross) {
    const fill = (on) => (on ? 'var(--accent)' : 'transparent');
    return `<svg viewBox="0 0 200 110" width="190" role="img" aria-label="Venn diagram">
      <defs><clipPath id="vc"><circle cx="80" cy="52" r="42"/></clipPath></defs>
      <circle cx="80" cy="52" r="42" fill="${fill(a)}" fill-opacity=".35" />
      <circle cx="120" cy="52" r="42" fill="${fill(b)}" fill-opacity=".35" />
      <circle cx="120" cy="52" r="42" clip-path="url(#vc)" fill="${fill(ab)}" fill-opacity="${a && b ? 0 : .55}" />
      <circle cx="80" cy="52" r="42" fill="none" stroke="var(--text)" stroke-opacity=".6"/>
      <circle cx="120" cy="52" r="42" fill="none" stroke="var(--text)" stroke-opacity=".6"/>
      <text x="58" y="106" font-size="11" fill="var(--muted)" text-anchor="middle">${la}</text>
      <text x="142" y="106" font-size="11" fill="var(--muted)" text-anchor="middle">${lb}</text>
      ${cross ? '<text x="100" y="56" font-size="12" fill="var(--text)" text-anchor="middle">A × B</text>' : ''}
    </svg>`;
  }

  // ---------------- GROUP BY animator ----------------
  function groupbyViz(spec) {
    const src = q(spec.source);
    const gi = src.columns.indexOf(spec.group), vi = src.columns.indexOf(spec.value ?? spec.group);
    let agg = spec.agg || 'COUNT';
    const having = spec.having;
    const groups = new Map();
    src.rows.forEach((r, i) => { const k = r[gi] === null ? 'NULL' : String(r[gi]); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
    const keys = [...groups.keys()];
    const aggOf = (idxs) => {
      const vals = idxs.map((i) => src.rows[i][vi]);
      const nn = vals.filter((v) => v !== null && v !== undefined);
      switch (agg) {
        case 'COUNT': return spec.value && spec.countCol ? nn.length : idxs.length;
        case 'SUM': return nn.length ? round(nn.reduce((a, b) => a + b, 0)) : null;
        case 'AVG': return nn.length ? round(nn.reduce((a, b) => a + b, 0) / nn.length) : null;
        case 'MIN': return nn.length ? nn.reduce((a, b) => (b < a ? b : a)) : null;
        case 'MAX': return nn.length ? nn.reduce((a, b) => (b > a ? b : a)) : null;
      }
    };
    const aggLabel = () => (agg === 'COUNT' ? 'COUNT(*)' : `${agg}(${spec.value})`);
    const steps = ['1 · Read rows', '2 · Form groups', '3 · Aggregate', ...(having != null ? ['4 · HAVING'] : []), 'Result'];
    const render = (s) => {
      const name = steps[s];
      if (s === 0) return h('div', null, h('p', { class: 'viz-explain', html: `SQL reads all <b>${src.rows.length}</b> rows. Notice the <code>${esc(spec.group)}</code> column — it decides the groups.` }),
        table(src, { compact: true, cellClass: (i, j) => (j === gi ? 'hl-col' : '') }));
      if (name === 'Result') {
        const rows = keys.map((k) => [groups.get(k).length && src.rows[groups.get(k)[0]][gi], aggOf(groups.get(k))]).filter((r) => having == null || r[1] > having);
        return h('div', null, h('p', { class: 'viz-explain', html: `Each surviving group became <b>one row</b>: ${src.rows.length} rows → ${rows.length} rows.` }),
          table({ columns: [spec.group, aggLabel()], rows }, { compact: true, groupColors: rows.map((r) => keys.indexOf(r[0] === null ? 'NULL' : String(r[0]))) }));
      }
      const showAgg = s >= 2, showHaving = name === '4 · HAVING';
      return h('div', null,
        h('p', { class: 'viz-explain', html: s === 1 ? `Rows with the same <code>${esc(spec.group)}</code> go into the same bucket → <b>${keys.length}</b> groups.${keys.includes('NULL') ? ' All NULLs form <b>one</b> group together.' : ''}`
          : showHaving ? `HAVING <code>${aggLabel()} &gt; ${having}</code> is checked for each <b>group</b>. Groups that fail are removed.`
            : `<code>${aggLabel()}</code> collapses each bucket into a single value${agg !== 'COUNT' ? ' (NULL values are ignored)' : ''}.` }),
        h('div', { class: 'buckets' }, keys.map((k, g) => {
          const idxs = groups.get(k);
          const val = aggOf(idxs);
          const fail = showHaving && !(val > having);
          return h('div', { class: 'bucket' + (fail ? ' fail' : ''), style: { '--gc': groupColor(g), animationDelay: g * 90 + 'ms' } },
            h('div', { class: 'bucket-hd' }, h('span', { class: 'bucket-key' }, k === 'NULL' ? h('span', { class: 'null' }, 'NULL') : k), h('span', { class: 'muted small' }, `${idxs.length} row${idxs.length > 1 ? 's' : ''}`)),
            h('div', { class: 'chips' }, idxs.map((i, n) => h('span', { class: 'chip', style: { animationDelay: g * 90 + n * 60 + 'ms' } }, fmt(src.rows[i][vi])))),
            showAgg ? h('div', { class: 'bucket-agg' }, h('span', { class: 'muted small' }, aggLabel()), h('b', null, fmt(val)), showHaving ? h('span', { class: 'verdict' }, fail ? '✘ removed' : '✔ kept') : null) : null);
        })));
    };
    const box = h('div');
    const redraw = () => { box.innerHTML = ''; box.appendChild(stepper(steps.length, render, { labels: steps })); sqlBox.innerHTML = ''; sqlBox.appendChild(code(`SELECT ${spec.group}, ${aggLabel()}\nFROM (${spec.source.trim().replace(/;$/, '')}) AS t\nGROUP BY ${spec.group}${having != null ? `\nHAVING ${aggLabel()} > ${having}` : ''};`)); };
    const sqlBox = h('div');
    redraw();
    return card('GROUP BY, step by step', `Grouping by ${spec.group}. Switch the aggregate to see how the numbers change.`,
      spec.value ? btnGroup(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'], agg, (v) => { agg = v; redraw(); }) : null, box, sqlBox);
  }
  const round = (n) => Math.round(n * 100) / 100;

  // ---------------- Set operations ----------------
  function setopsViz(spec) {
    const A = q(spec.a).rows.map((r) => r[0]), B = q(spec.b).rows.map((r) => r[0]);
    let op = spec.op || 'UNION';
    const out = h('div');
    const label = (v) => (v === null ? 'NULL' : String(v));
    function compute() {
      const inB = new Set(B.map(label)), inA = new Set(A.map(label));
      if (op === 'UNION ALL') return [...A.map((v) => ({ v, from: 'A' })), ...B.map((v) => ({ v, from: 'B' }))];
      const seen = new Set(), res = [];
      const push = (v, from) => { const k = label(v); if (!seen.has(k)) { seen.add(k); res.push({ v, from }); } };
      if (op === 'UNION') { A.forEach((v) => push(v, inB.has(label(v)) ? 'both' : 'A')); B.forEach((v) => push(v, inA.has(label(v)) ? 'both' : 'B')); }
      if (op === 'INTERSECT') A.forEach((v) => inB.has(label(v)) && push(v, 'both'));
      if (op === 'EXCEPT') A.forEach((v) => !inB.has(label(v)) && push(v, 'A'));
      return res.sort((x, y) => (label(x.v) < label(y.v) ? -1 : 1));
    }
    function draw() {
      const res = compute();
      const inB = new Set(B.map(label)), inA = new Set(A.map(label));
      const count = (arr) => arr.reduce((m, v) => m.set(label(v), (m.get(label(v)) || 0) + 1), new Map());
      const cA = count(A), cB = count(B);
      const chip = (v, side) => {
        const k = label(v);
        const shared = side === 'A' ? inB.has(k) : inA.has(k);
        const dupInside = (side === 'A' ? cA : cB).get(k) > 1;
        return h('span', { class: 'chip set' + (shared ? ' shared' : '') + (dupInside ? ' dup' : ''), title: shared ? 'Also in the other query' : '' }, v === null ? h('span', { class: 'null' }, 'NULL') : k);
      };
      const resCount = new Map();
      res.forEach((r) => resCount.set(label(r.v), (resCount.get(label(r.v)) || 0) + 1));
      out.innerHTML = '';
      out.appendChild(h('div', { class: 'set-cols' },
        h('div', { class: 'set-box' }, h('div', { class: 'set-cap' }, 'Query A', h('span', { class: 'muted small' }, ` ${A.length} rows`)), h('div', { class: 'chips' }, A.map((v) => chip(v, 'A')))),
        h('div', { class: 'set-op', html: vennSvg({ UNION: [1, 1, 1], 'UNION ALL': [1, 1, 1], INTERSECT: [0, 1, 0], EXCEPT: [1, 0, 0] }[op], 'A', 'B') + `<div class="set-op-name">${op}</div>` }),
        h('div', { class: 'set-box' }, h('div', { class: 'set-cap' }, 'Query B', h('span', { class: 'muted small' }, ` ${B.length} rows`)), h('div', { class: 'chips' }, B.map((v) => chip(v, 'B'))))));
      out.appendChild(h('div', { class: 'viz-explain', html: {
        UNION: `UNION stacks both results and then <b>removes duplicates</b>: ${A.length + B.length} rows in → <b>${res.length}</b> distinct rows out. Removing duplicates costs a sort or hash step.`,
        'UNION ALL': `UNION ALL simply stacks both results — <b>duplicates are kept</b> (highlighted). ${A.length} + ${B.length} = <b>${res.length}</b> rows. Faster, because nothing is compared.`,
        INTERSECT: `INTERSECT keeps only values that appear in <b>both</b> queries → <b>${res.length}</b> rows.`,
        EXCEPT: `EXCEPT keeps values from A that do <b>not</b> appear in B → <b>${res.length}</b> rows. Order matters: A EXCEPT B ≠ B EXCEPT A.`,
      }[op] }));
      out.appendChild(h('div', { class: 'set-box result' }, h('div', { class: 'set-cap' }, 'Result', h('span', { class: 'muted small' }, ` ${res.length} rows`)),
        h('div', { class: 'chips' }, res.map((r) => h('span', { class: `chip set from-${r.from}` + (resCount.get(label(r.v)) > 1 ? ' dup' : '') }, r.v === null ? h('span', { class: 'null' }, 'NULL') : label(r.v))))));
      out.appendChild(h('div', { class: 'legend' }, h('span', { class: 'lg from-A' }, 'from A'), h('span', { class: 'lg from-B' }, 'from B'), h('span', { class: 'lg from-both' }, 'in both'), h('span', { class: 'lg dup' }, 'duplicate')));
      out.appendChild(code(`${spec.a.trim().replace(/;$/, '')}\n${op}\n${spec.b.trim().replace(/;$/, '')};`));
    }
    draw();
    return card('Set Operations', 'Each chip is one row. Switch the operator to compare.', btnGroup(['UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT'], op, (v) => { op = v; draw(); }), out);
  }

  // ---------------- Window functions ----------------
  function windowViz(spec) {
    const src = q(spec.source);
    const pi = spec.partition ? src.columns.indexOf(spec.partition) : -1;
    const oi = src.columns.indexOf(spec.order), vi = src.columns.indexOf(spec.value ?? spec.order);
    let fn = spec.fn || 'ROW_NUMBER';
    let usePartition = pi >= 0;
    const box = h('div'), sqlBox = h('div'), explain = h('div', { class: 'viz-explain' });
    const FN = ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD', 'RUNNING_SUM', 'MOVING_AVG', 'FIRST_VALUE', 'LAST_VALUE'];
    const DESC = {
      ROW_NUMBER: 'Numbers rows 1, 2, 3… inside each partition. Ties still get different numbers.',
      RANK: 'Same value → same rank, then it <b>skips</b> (1, 2, 2, 4).',
      DENSE_RANK: 'Same value → same rank, <b>no gaps</b> (1, 2, 2, 3).',
      NTILE: 'Splits each partition into 2 roughly equal buckets (NTILE(2)).',
      LAG: 'Looks at the <b>previous</b> row\'s value in the partition (NULL for the first row).',
      LEAD: 'Looks at the <b>next</b> row\'s value (NULL for the last row).',
      RUNNING_SUM: 'Adds up all rows from the start of the partition <b>up to the current row</b>.',
      MOVING_AVG: 'Average of the current row and the 2 rows before it (ROWS BETWEEN 2 PRECEDING AND CURRENT ROW).',
      FIRST_VALUE: 'The value from the <b>first</b> row of the window frame.',
      LAST_VALUE: 'Gotcha! With the default frame (…AND CURRENT ROW) the "last" row is the <b>current row</b>. Use ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING to get the real last value.',
    };
    function sqlFor() {
      const part = usePartition && pi >= 0 ? `PARTITION BY ${spec.partition} ` : '';
      const ord = `ORDER BY ${spec.order}`;
      const map = {
        ROW_NUMBER: `ROW_NUMBER() OVER (${part}${ord})`, RANK: `RANK() OVER (${part}${ord})`, DENSE_RANK: `DENSE_RANK() OVER (${part}${ord})`,
        NTILE: `NTILE(2) OVER (${part}${ord})`, LAG: `LAG(${spec.value}) OVER (${part}${ord})`, LEAD: `LEAD(${spec.value}) OVER (${part}${ord})`,
        RUNNING_SUM: `SUM(${spec.value}) OVER (${part}${ord} ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`,
        MOVING_AVG: `ROUND(AVG(${spec.value}) OVER (${part}${ord} ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)`,
        FIRST_VALUE: `FIRST_VALUE(${spec.value}) OVER (${part}${ord})`, LAST_VALUE: `LAST_VALUE(${spec.value}) OVER (${part}${ord})`,
      };
      return map[fn];
    }
    function draw() {
      const expr = sqlFor();
      const tieBreak = src.columns[0] !== spec.order ? `, ${src.columns[0]}` : '';
      const partOrder = usePartition && pi >= 0 ? `${spec.partition}, ` : '';
      // For ROW_NUMBER-like ties, make the display order deterministic by appending the first column.
      const full = `SELECT *, ${expr.replace(/ORDER BY ([^)]*?)(\s+ROWS|\))/, (m, o, t) => `ORDER BY ${o}${fn === 'ROW_NUMBER' || fn === 'NTILE' ? tieBreak : ''}${t}`)} AS result FROM (${spec.source.trim().replace(/;$/, '')}) AS src ORDER BY ${partOrder}${spec.order}${tieBreak}`;
      let r;
      try { r = q(full); } catch (e) { box.innerHTML = `<div class="err">${esc(e.message)}</div>`; return; }
      const rp = usePartition && pi >= 0 ? pi : -1;
      const parts = [];
      const partIdx = r.rows.map((row) => { const k = rp >= 0 ? String(row[rp]) : '*'; let p = parts.indexOf(k); if (p < 0) { parts.push(k); p = parts.length - 1; } return p; });
      const resCol = r.columns.length - 1;
      box.innerHTML = '';
      const tbl = table(r, { compact: true, groupColors: partIdx, cellClass: (i, j) => (j === resCol ? 'win-res' : j === rp ? 'hl-col' : j === oi ? 'ord-col' : ''),
        onRowHover: (i, tr) => {
          const trs = tbl.querySelectorAll('tbody tr');
          trs.forEach((t) => t.classList.remove('frame', 'frame-cur', 'frame-dim'));
          if (i < 0) return;
          const p = partIdx[i];
          const members = partIdx.map((pp, k) => (pp === p ? k : -1)).filter((k) => k >= 0);
          const pos = members.indexOf(i);
          let frame = [];
          if (fn === 'RUNNING_SUM' || fn === 'FIRST_VALUE' || fn === 'LAST_VALUE') frame = members.slice(0, pos + 1).filter((k) => fn !== 'LAST_VALUE' || true);
          if (fn === 'LAST_VALUE') frame = members.filter((k) => r.rows[k][oi] <= r.rows[i][oi]);
          if (fn === 'MOVING_AVG') frame = members.slice(Math.max(0, pos - 2), pos + 1);
          if (fn === 'LAG') frame = pos > 0 ? [members[pos - 1]] : [];
          if (fn === 'LEAD') frame = pos < members.length - 1 ? [members[pos + 1]] : [];
          if (['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE'].includes(fn)) frame = members;
          trs.forEach((t, k) => { if (partIdx[k] !== p) t.classList.add('frame-dim'); });
          frame.forEach((k) => trs[k].classList.add('frame'));
          tr.classList.add('frame-cur');
        } });
      box.appendChild(tbl);
      explain.innerHTML = DESC[fn] + (rp >= 0 ? ` Colors = partitions (<code>PARTITION BY ${spec.partition}</code>) — the calculation restarts in each one.` : ' No PARTITION BY: the whole result is one window.') + ' <i>Hover a row to see its window frame.</i>';
      sqlBox.innerHTML = '';
      sqlBox.appendChild(code(`SELECT *,\n  ${expr} AS result\nFROM (${spec.source.trim().replace(/;$/, '')}) AS src;`));
    }
    draw();
    const partToggle = pi >= 0 ? h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: true, onchange: (e) => { usePartition = e.target.checked; draw(); } }), ` PARTITION BY ${spec.partition}`) : null;
    return card('Window Function Explorer', 'Rows are NOT collapsed — every row keeps its identity and gains a computed column.',
      h('div', { class: 'viz-row wrap' }, btnGroup(FN.map((f) => [f, f.replace('_', ' ').replace('RUNNING SUM', 'running SUM').replace('MOVING AVG', 'moving AVG')]), fn, (v) => { fn = v; draw(); }, 'small'), partToggle),
      explain, box, sqlBox);
  }

  // ---------------- NULL / three-valued logic ----------------
  function nullViz() {
    const T = 'TRUE', F = 'FALSE', U = 'UNKNOWN';
    const and = (a, b) => (a === F || b === F ? F : a === U || b === U ? U : T);
    const or = (a, b) => (a === T || b === T ? T : a === U || b === U ? U : F);
    const vals = [T, F, U];
    const cell = (v) => h('td', { class: 'tv tv-' + v.toLowerCase() }, v);
    const truth = (name, f) => h('table', { class: 'truth' }, h('thead', null, h('tr', null, h('th', null, name), vals.map((v) => h('th', null, v)))),
      h('tbody', null, vals.map((a) => h('tr', null, h('th', null, a), vals.map((b) => cell(f(a, b)))))));
    const exprs = ["allergies = NULL", "allergies IS NULL", "allergies <> 'Penicillin'", "allergies IS NOT NULL", "allergies = 'Penicillin' OR allergies IS NULL", "COALESCE(allergies, 'None') = 'None'"];
    let cur = exprs[0];
    const tb = h('div'), note = h('div', { class: 'viz-explain' });
    const NOTES = {
      'allergies = NULL': 'Comparing anything with NULL using <code>=</code> gives <b>UNKNOWN</b> — never TRUE. So this returns <b>zero rows</b>, even for patients with no allergies recorded!',
      'allergies IS NULL': '<code>IS NULL</code> is the correct test for missing values. It only returns TRUE or FALSE.',
      "allergies <> 'Penicillin'": 'Surprise: patients with NULL allergies are <b>not</b> returned, because NULL &lt;&gt; \'Penicillin\' is UNKNOWN.',
      'allergies IS NOT NULL': 'Keeps only rows where a value exists.',
      "allergies = 'Penicillin' OR allergies IS NULL": 'Explicitly include NULLs with <code>OR … IS NULL</code>.',
      "COALESCE(allergies, 'None') = 'None'": '<code>COALESCE</code> replaces NULL with a default value before comparing.',
    };
    function draw() {
      const r = q(`SELECT patient_id, first_name, allergies, CASE WHEN ${cur} THEN 'TRUE' WHEN NOT (${cur}) THEN 'FALSE' ELSE 'UNKNOWN' END AS "WHERE result" FROM patients ORDER BY patient_id LIMIT 12`);
      tb.innerHTML = '';
      const kept = r.rows.filter((x) => x[3] === 'TRUE').length;
      tb.appendChild(table(r, { compact: true, rowClass: (i, row) => (row[3] === 'TRUE' ? 'keep' : 'drop'), cellClass: (i, j, v) => (j === 3 ? 'tv tv-' + String(v).toLowerCase() : '') }));
      note.innerHTML = NOTES[cur] + ` <b>${kept}</b> of ${r.rows.length} rows kept — WHERE keeps only TRUE.`;
    }
    draw();
    return card('NULL & Three-Valued Logic', 'In SQL a condition can be TRUE, FALSE or UNKNOWN. WHERE keeps a row only when the condition is TRUE.',
      h('div', { class: 'truth-row' }, truth('AND', and), truth('OR', or), h('table', { class: 'truth' }, h('thead', null, h('tr', null, h('th', null, 'NOT'), h('th', null, 'result'))), h('tbody', null, vals.map((v) => h('tr', null, h('th', null, v), cell(v === T ? F : v === F ? T : U)))))),
      h('div', { class: 'viz-row wrap' }, h('span', { class: 'muted small' }, 'WHERE '), btnGroup(exprs.map((e) => [e, e]), cur, (v) => { cur = v; draw(); }, 'small mono')), note, tb);
  }

  // ---------------- PK / FK explorer ----------------
  function keysViz(spec) {
    const parent = spec.parent || 'patients', child = spec.child || 'invoices', pk = spec.pk || 'patient_id', fk = spec.fk || 'patient_id';
    const pcols = { patients: 'patient_id, first_name, last_name', payors: 'payor_id, payor_name, payor_type', practitioners: 'practitioner_id, first_name, last_name', treatment_locations: 'location_id, location_name', invoices: 'invoice_id, patient_id, status, total_amount' }[parent] || '*';
    const P = q(`SELECT ${pcols} FROM ${parent} ORDER BY ${pk} LIMIT 8`);
    const ids = P.rows.map((r) => r[0]);
    const C = q(`SELECT * FROM ${child} WHERE ${fk} IN (${ids.map((x) => JSON.stringify(x)).join(',')}) ORDER BY ${fk} LIMIT 14`);
    const cfk = C.columns.indexOf(fk), cpk = 0;
    const hideC = new Set(C.columns.map((c, j) => (j > 5 && j !== cfk ? j : -1)).filter((j) => j >= 0));
    const pt = table(P, { compact: true, footer: false, cellClass: (i, j) => (j === 0 ? 'pkcell' : ''), onRowHover: (i) => hi(i < 0 ? null : P.rows[i][0], 'p') });
    const ct = table(C, { compact: true, footer: false, hideCols: hideC, cellClass: (i, j) => (j === cfk ? 'fkcell' : j === cpk ? 'pkcell' : ''), onRowHover: (i) => hi(i < 0 ? null : C.rows[i][cfk], 'c') });
    const info = h('div', { class: 'viz-explain' }, 'Hover a row. 🔑 = primary key (unique identity), 🔗 = foreign key (points to a primary key in another table).');
    function hi(id, from) {
      pt.querySelectorAll('tbody tr').forEach((tr, i) => tr.classList.toggle('link', id !== null && P.rows[i][0] === id));
      ct.querySelectorAll('tbody tr').forEach((tr, i) => tr.classList.toggle('link', id !== null && C.rows[i][cfk] === id));
      if (id !== null) {
        const n = C.rows.filter((r) => r[cfk] === id).length;
        info.innerHTML = from === 'p' ? `${parent}.${pk} = <b>${esc(id)}</b> is referenced by <b>${n}</b> ${child} row(s) — one-to-many.` : `This ${child} row's ${fk} = <b>${esc(id)}</b> points to exactly <b>one</b> ${parent} row.`;
      }
    }
    const tryOut = h('div', { class: 'viz-explain' });
    const orphan = h('button', { class: 'btn sm ghost', onclick: () => {
      const r = DB.sandboxSeq([`INSERT INTO invoices (invoice_id, patient_id, location_id, invoice_date, due_date, status) VALUES (999, 9999, 1, '2026-09-01', '2026-10-01', 'Open')`]);
      tryOut.innerHTML = r[0].error ? `❌ <b>Rejected:</b> <code>${esc(r[0].error)}</code> — patient 9999 does not exist, so the foreign key protects the data from an "orphan" invoice.` : 'Inserted (unexpected).';
    } }, 'Try inserting an invoice for patient 9999');
    const dupe = h('button', { class: 'btn sm ghost', onclick: () => {
      const r = DB.sandboxSeq([`INSERT INTO patients (patient_id, first_name, last_name, date_of_birth) VALUES (1, 'Copy', 'Cat', '2000-01-01')`]);
      tryOut.innerHTML = r[0].error ? `❌ <b>Rejected:</b> <code>${esc(r[0].error)}</code> — patient_id 1 already exists; a primary key must be unique.` : 'Inserted (unexpected).';
    } }, 'Try a duplicate patient_id');
    return card('Primary Key ↔ Foreign Key', `${parent}.${pk} (🔑) is referenced by ${child}.${fk} (🔗)`,
      info, h('div', { class: 'keys-grid' }, h('div', null, h('div', { class: 'jv-cap' }, '🔑 ', parent), pt), h('div', { class: 'keys-arrow' }, '◄── 1 : N ──'), h('div', null, h('div', { class: 'jv-cap' }, '🔗 ', child), ct)),
      h('div', { class: 'viz-row wrap' }, orphan, dupe), tryOut);
  }

  // ---------------- Stage runner / execution order ----------------
  function stagesViz(spec, lesson, { orderMode = false } = {}) {
    const sql = spec.sql || lesson.sql;
    const st = DB.stages(sql, spec.runner);
    if (st.unsupported) return card('Visual Execution', null, h('div', { class: 'viz-explain' }, st.unsupported), resultOnly(sql));
    if (st.error && !st.stages.length) return card('Visual Execution', null, h('div', { class: 'err' }, st.error));
    const S = st.stages;
    const render = (i) => {
      const s = S[i];
      const opts = { compact: true, max: 60 };
      if (s.marks && s.grouped) { opts.groupColors = s.marks; opts.cellClass = (r, j) => (j < (s.keyCols || 0) ? 'hl-col' : ''); }
      else if (s.marks) { opts.rowClass = (r) => s.marks[r]; opts.cellClass = (r, j) => (j === 0 && s.flagCol === 0 ? 'flag' : ''); }
      return h('div', { class: 'stage-view' },
        h('div', { class: 'stage-clause' }, s.clause ? h('pre', { class: 'code inline', html: UI.highlight(s.clause) }) : null),
        h('p', { class: 'viz-explain', html: s.explain }), table(s.result, opts));
    };
    const pipeline = h('div', { class: 'pipeline' }, S.map((s, i) => [i ? h('span', { class: 'pipe-arrow' }, '→') : null, h('span', { class: 'pipe-step' + (s.final ? ' final' : '') }, s.title, h('small', null, pipeLabel(s)))]));
    const written = orderMode ? writtenVsLogical(st) : null;
    return card(orderMode ? 'Logical Query Processing Order' : 'Visual Execution — what SQL does to the data', 'Step through each clause in the order the database logically evaluates it.',
      written, pipeline, stepper(S.length, render, { labels: S.map((s) => s.title), auto: 1800 }));
  }
  function pipeLabel(s) {
    if (!s.result) return '';
    if (s.grouped) return `${new Set(s.marks).size} group${new Set(s.marks).size === 1 ? '' : 's'}`;
    if (s.marks) { const k = s.marks.filter((m) => m === 'keep').length; return `${k} of ${s.marks.length} kept`; }
    return `${s.result.rows.length} rows`;
  }
  function writtenVsLogical(st) {
    const has = (k) => k === 'SELECT' || k === 'FROM' || st.parts[k] !== undefined || (k === 'DISTINCT' && st.distinct);
    const written = ['SELECT', 'DISTINCT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT'].filter(has);
    const logical = ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT'].filter(has);
    const n = written.length, W = 560, rowH = 30, H = n * rowH + 30;
    const y = (i) => 26 + i * rowH;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" role="img" aria-label="Written order vs logical order">
      <text x="90" y="14" text-anchor="middle" font-size="12" fill="var(--muted)">How you WRITE it</text>
      <text x="${W - 90}" y="14" text-anchor="middle" font-size="12" fill="var(--muted)">How SQL RUNS it</text>`;
    written.forEach((k, i) => {
      const j = logical.indexOf(k);
      s += `<path d="M170,${y(i) + 10} C${W / 2},${y(i) + 10} ${W / 2},${y(j) + 10} ${W - 170},${y(j) + 10}" stroke="${groupColor(j)}" stroke-width="2" fill="none" opacity=".75"/>`;
      s += `<rect x="10" y="${y(i)}" width="160" height="22" rx="6" fill="var(--panel2)" stroke="${groupColor(j)}"/><text x="90" y="${y(i) + 15}" text-anchor="middle" font-size="12" font-family="var(--mono)" fill="var(--text)">${k}</text>`;
    });
    logical.forEach((k, j) => { s += `<rect x="${W - 170}" y="${y(j)}" width="160" height="22" rx="6" fill="var(--panel2)" stroke="${groupColor(j)}"/><text x="${W - 90}" y="${y(j) + 15}" text-anchor="middle" font-size="12" font-family="var(--mono)" fill="var(--text)">${j + 1}. ${k}</text>`; });
    return h('div', { class: 'order-svg', html: s + '</svg>' });
  }
  function resultOnly(sql) {
    try { const r = DB.sandbox(sql).last; return r ? table(r, { compact: true }) : h('div', { class: 'muted' }, 'Statement ran (no rows returned).'); }
    catch (e) { return h('div', { class: 'err' }, e.message); }
  }

  // ---------------- B-tree index vs full scan ----------------
  function indexViz() {
    const keys = q(`SELECT DISTINCT invoice_id FROM charges ORDER BY invoice_id`).rows.map((r) => r[0]);
    const heap = q(`SELECT charge_id, invoice_id FROM charges ORDER BY charge_id`).rows; // physical order
    const leafSize = 6;
    const leaves = []; for (let i = 0; i < keys.length; i += leafSize) leaves.push(keys.slice(i, i + leafSize));
    const branchSize = 3;
    const branches = []; for (let i = 0; i < leaves.length; i += branchSize) branches.push(leaves.slice(i, i + branchSize));
    let target = keys[Math.floor(keys.length * 0.7)];
    const W = 900, H = 250;
    const svg = h('div', { class: 'btree' });
    const heapBox = h('div', { class: 'heap' });
    const stats = h('div', { class: 'viz-explain' });
    let timer = null;
    function drawTree(path = {}) {
      const lw = W / leaves.length;
      let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="B-tree index on charges.invoice_id">`;
      const root = { x: W / 2, y: 30 };
      const bx = (b) => (W / branches.length) * (b + 0.5);
      branches.forEach((br, b) => {
        s += `<line x1="${root.x}" y1="${root.y + 14}" x2="${bx(b)}" y2="${110 - 14}" class="bt-edge ${path.branch === b ? 'on' : ''}"/>`;
        br.forEach((lf, k) => { const li = b * branchSize + k; s += `<line x1="${bx(b)}" y1="${110 + 14}" x2="${lw * (li + 0.5)}" y2="${190 - 16}" class="bt-edge ${path.branch === b && path.leaf === li ? 'on' : ''}"/>`; });
      });
      const rootKeys = branches.slice(1).map((br) => br[0][0]);
      s += node(root.x, root.y, rootKeys.join(' | ') || 'root', path.step >= 0, 'root');
      branches.forEach((br, b) => s += node(bx(b), 110, br.slice(1).map((l) => l[0]).join(' | ') || '•', path.branch === b && path.step >= 1, 'branch'));
      leaves.forEach((lf, li) => {
        const x = lw * (li + 0.5);
        s += `<rect x="${x - lw / 2 + 3}" y="176" width="${lw - 6}" height="34" rx="5" class="bt-node leaf ${path.leaf === li && path.step >= 2 ? 'on' : ''}"/>`;
        lf.forEach((k, j) => s += `<text x="${x - lw / 2 + 8 + j * ((lw - 12) / leafSize) + 4}" y="197" font-size="9" class="bt-key ${k === target && path.step >= 3 ? 'hit' : ''}">${k}</text>`);
      });
      s += `<text x="8" y="16" font-size="11" fill="var(--muted)">B-tree index on charges(invoice_id)</text></svg>`;
      svg.innerHTML = s;
    }
    function node(x, y, label, on, cls) {
      const w = Math.max(60, label.length * 6.4 + 16);
      return `<rect x="${x - w / 2}" y="${y - 14}" width="${w}" height="28" rx="6" class="bt-node ${cls} ${on ? 'on' : ''}"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" class="bt-key">${label}</text>`;
    }
    function drawHeap(upto = -1, hits = []) {
      heapBox.innerHTML = '';
      heapBox.appendChild(h('div', { class: 'jv-cap' }, 'Table storage (heap) — rows in insertion order'));
      heapBox.appendChild(h('div', { class: 'heap-cells' }, heap.map((r, i) => h('span', { class: 'hc' + (i <= upto ? ' seen' : '') + (hits.includes(i) ? ' hit' : ''), title: `charge ${r[0]} → invoice ${r[1]}` }, r[1]))));
    }
    function scan() {
      stop(); let i = -1; const hits = [];
      timer = setInterval(() => {
        i++;
        if (heap[i] && heap[i][1] === target) hits.push(i);
        drawHeap(i, hits);
        stats.innerHTML = `🐢 <b>Full table scan</b>: checked <b>${i + 1}</b> of ${heap.length} rows, found ${hits.length} match(es). Without an index, SQL must read <i>every</i> row.`;
        if (i >= heap.length - 1) stop();
      }, 35);
    }
    function seek() {
      stop(); drawHeap();
      const li = leaves.findIndex((l) => l.includes(target));
      const b = Math.floor(li / branchSize);
      let step = -1;
      const hits = heap.map((r, i) => (r[1] === target ? i : -1)).filter((i) => i >= 0);
      timer = setInterval(() => {
        step++;
        drawTree({ step, branch: b, leaf: li });
        const msg = ['Start at the root: compare ' + target + ' with the separator keys…', `Go down to branch ${b + 1}…`, `Reach leaf page ${li + 1}, which holds keys ${leaves[li][0]}–${leaves[li][leaves[li].length - 1]}…`, `Found <b>${target}</b>! The leaf entry points straight to ${hits.length} row(s).`];
        stats.innerHTML = `⚡ <b>Index seek</b> step ${Math.min(step + 1, 4)}: ${msg[Math.min(step, 3)]} — only <b>${Math.min(step + 1, 3)}</b> page reads instead of ${heap.length} row checks.`;
        if (step >= 3) { drawHeap(-1, hits); stop(); }
      }, 700);
    }
    const stop = () => { clearInterval(timer); timer = null; };
    const sel = h('select', { class: 'input sm', onchange: (e) => { target = +e.target.value; drawTree(); drawHeap(); } }, keys.map((k) => h('option', { value: k, selected: k === target }, `invoice_id = ${k}`)));
    drawTree(); drawHeap();
    stats.innerHTML = 'Pick a value, then compare a full scan with an index seek.';
    return card('Index Seek vs Full Table Scan', 'An index is a sorted, tree-shaped lookup structure — like the index at the back of a book.',
      h('div', { class: 'viz-row wrap' }, h('span', { class: 'mono small' }, 'WHERE '), sel, h('button', { class: 'btn sm ghost', onclick: scan }, '🐢 Full scan'), h('button', { class: 'btn sm', onclick: seek }, '⚡ Index seek')),
      stats, svg, heapBox);
  }

  // ---------------- EXPLAIN QUERY PLAN ----------------
  function explainViz(spec, lesson) {
    const sql = spec.sql || lesson.sql;
    const target = String(sql).replace(/^\s*EXPLAIN\s+(QUERY\s+PLAN\s+)?/i, '');
    const plan = (rows) => {
      if (!rows || rows.error) return h('div', { class: 'err' }, rows ? rows.error : 'No plan');
      const r = rows.last ? rows.last.rows : [];
      const byParent = new Map();
      r.forEach(([id, parent, , detail]) => { if (!byParent.has(parent)) byParent.set(parent, []); byParent.get(parent).push({ id, detail }); });
      const build = (pid, depth) => (byParent.get(pid) || []).map((n) => {
        const kind = /^SCAN/.test(n.detail) ? (/COVERING INDEX|USING INDEX/.test(n.detail) ? 'idx' : 'scan') : /^SEARCH/.test(n.detail) ? 'seek' : /TEMP B-TREE/.test(n.detail) ? 'temp' : 'other';
        const icon = { scan: '🐢', seek: '⚡', idx: '📇', temp: '🧮', other: '◆' }[kind];
        const tip = { scan: 'Reads every row of the table', seek: 'Jumps directly to matching rows via an index', idx: 'Scans the (smaller) index instead of the table', temp: 'Builds a temporary sorted structure (sort/group/distinct)', other: '' }[kind];
        return h('div', { class: 'plan-node', style: { marginLeft: depth * 22 + 'px' } }, h('span', { class: 'plan-box k-' + kind, title: tip }, icon, ' ', n.detail), ...build(n.id, depth + 1));
      });
      return h('div', { class: 'plan' }, build(0, 0));
    };
    const before = DB.sandboxSeq([`EXPLAIN QUERY PLAN ${target}`])[0];
    const after = spec.index ? DB.sandboxSeq([spec.index, `EXPLAIN QUERY PLAN ${target}`])[1] : null;
    return card('Execution Plan (real SQLite EXPLAIN QUERY PLAN)', 'Read the plan top-down: each box is an operation the engine performs.',
      code(target, { label: 'Query' }),
      h('div', { class: 'plan-grid' },
        h('div', null, h('div', { class: 'jv-cap' }, after ? 'Before index' : 'Plan'), plan(before)),
        after ? h('div', null, h('div', { class: 'jv-cap' }, 'After ', h('code', null, spec.index)), plan(after)) : null),
      h('div', { class: 'legend' }, h('span', { class: 'lg plan-scan' }, '🐢 SCAN = read all rows'), h('span', { class: 'lg plan-seek' }, '⚡ SEARCH = index lookup'), h('span', { class: 'lg plan-temp' }, '🧮 TEMP B-TREE = extra sort')));
  }

  // ---------------- Transactions timeline ----------------
  const TXN = {
    commit: { title: 'COMMIT — all or nothing, saved for good', steps: [
      ['A', 'BEGIN;', 'Session A starts a transaction.', { db: 'Invoice 3: Open, paid $0' }],
      ['A', "INSERT INTO payments (...) VALUES (3, 120.00);", 'A records a payment. Only A can see it so far.', { a: 'paid $120 (uncommitted)', db: 'Invoice 3: Open, paid $0' }],
      ['A', "UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;", 'Second change in the same unit of work.', { a: 'Paid (uncommitted)', db: 'Invoice 3: Open, paid $0' }],
      ['B', 'SELECT status FROM invoices WHERE invoice_id = 3;', 'Session B still sees the old, committed data (isolation).', { b: 'sees: Open', db: 'Invoice 3: Open, paid $0' }],
      ['A', 'COMMIT;', 'Both changes become permanent at the same instant (atomic + durable).', { db: 'Invoice 3: Paid, paid $120', ok: true }],
      ['B', 'SELECT status FROM invoices WHERE invoice_id = 3;', 'Now everyone sees the new state.', { b: 'sees: Paid', db: 'Invoice 3: Paid, paid $120', ok: true }]] },
    rollback: { title: 'ROLLBACK — undo everything since BEGIN', steps: [
      ['A', 'BEGIN;', 'Start a transaction.', { db: 'Invoice 3: Open, paid $0' }],
      ['A', "INSERT INTO payments (...) VALUES (3, 120.00);", 'Payment inserted (pending).', { a: 'paid $120 (uncommitted)', db: 'Invoice 3: Open, paid $0' }],
      ['A', "UPDATE invoices SET status = 'Paid' WHERE invoice_id = 99;", '⚠ Oops — wrong invoice id / the card was declined.', { a: 'error!', db: 'Invoice 3: Open, paid $0', bad: true }],
      ['A', 'ROLLBACK;', 'Every change since BEGIN is undone. The payment never happened.', { db: 'Invoice 3: Open, paid $0', ok: true }]] },
    savepoint: { title: 'SAVEPOINT — partial undo inside a transaction', steps: [
      ['A', 'BEGIN;', 'Start a transaction.', { db: 'Balance $300' }],
      ['A', 'INSERT INTO payments ... 100.00;', 'Record a payment.', { a: 'balance $200 (pending)', db: 'Balance $300' }],
      ['A', 'SAVEPOINT before_adjust;', 'Bookmark this point.', { a: 'balance $200 (pending)', db: 'Balance $300' }],
      ['A', 'INSERT INTO transactions ... ADJUSTMENT -50;', 'Apply a discount adjustment…', { a: 'balance $150 (pending)', db: 'Balance $300' }],
      ['A', 'ROLLBACK TO before_adjust;', 'The adjustment was not approved — undo only back to the bookmark.', { a: 'balance $200 (pending)', db: 'Balance $300' }],
      ['A', 'COMMIT;', 'The payment is saved; the adjustment is not.', { db: 'Balance $200', ok: true }]] },
    dirty: { title: 'Dirty Read (READ UNCOMMITTED)', level: 'READ UNCOMMITTED', steps: [
      ['A', 'BEGIN;', '', { db: 'Invoice 7 total: $200' }],
      ['A', 'UPDATE invoices SET total_amount = 900 WHERE invoice_id = 7;', 'A changes the total but has not committed.', { a: '$900 (uncommitted)', db: 'Invoice 7 total: $200' }],
      ['B', 'SELECT total_amount FROM invoices WHERE invoice_id = 7;', 'B reads the UNCOMMITTED value — a dirty read.', { b: 'sees $900 😱', db: 'Invoice 7 total: $200', bad: true }],
      ['A', 'ROLLBACK;', 'A cancels. $900 never officially existed…', { db: 'Invoice 7 total: $200' }],
      ['B', '-- sends a $900 bill to the patient', 'B acted on data that never existed. Prevented by READ COMMITTED and above.', { b: 'used $900 ❌', db: 'Invoice 7 total: $200', bad: true }]] },
    nonrepeatable: { title: 'Non-Repeatable Read (READ COMMITTED)', level: 'READ COMMITTED', steps: [
      ['B', 'BEGIN;', 'B starts a report.', { db: 'Invoice 7 total: $200' }],
      ['B', 'SELECT total_amount FROM invoices WHERE invoice_id = 7;', 'First read.', { b: 'sees $200', db: 'Invoice 7 total: $200' }],
      ['A', 'UPDATE invoices SET total_amount = 250 WHERE invoice_id = 7; COMMIT;', 'A changes the row and commits.', { db: 'Invoice 7 total: $250' }],
      ['B', 'SELECT total_amount FROM invoices WHERE invoice_id = 7;', 'Same query, same transaction — different answer!', { b: 'sees $250 ⁉', db: 'Invoice 7 total: $250', bad: true }],
      ['B', 'COMMIT;', 'Prevented by REPEATABLE READ and SERIALIZABLE.', { db: 'Invoice 7 total: $250' }]] },
    phantom: { title: 'Phantom Read (REPEATABLE READ in the SQL standard)', level: 'REPEATABLE READ', steps: [
      ['B', 'BEGIN;', 'B builds the overdue report.', { db: '13 overdue invoices' }],
      ['B', "SELECT COUNT(*) FROM invoices WHERE status = 'Overdue';", 'Counts 13 rows.', { b: 'count = 13', db: '13 overdue invoices' }],
      ['A', "INSERT INTO invoices (...) VALUES (..., 'Overdue'); COMMIT;", 'A inserts a NEW matching row.', { db: '14 overdue invoices' }],
      ['B', "SELECT COUNT(*) FROM invoices WHERE status = 'Overdue';", 'A "phantom" row appeared in the same range.', { b: 'count = 14 👻', db: '14 overdue invoices', bad: true }],
      ['B', 'COMMIT;', 'Prevented by SERIALIZABLE (PostgreSQL\'s REPEATABLE READ also prevents it via snapshots).', { db: '14 overdue invoices' }]] },
    lostupdate: { title: 'Lost Update', level: 'READ COMMITTED', steps: [
      ['A', "SELECT balance ... → 100", 'A reads the patient balance.', { a: 'reads 100', db: 'Balance $100' }],
      ['B', "SELECT balance ... → 100", 'B reads the same balance.', { b: 'reads 100', db: 'Balance $100' }],
      ['A', 'UPDATE ... SET balance = 100 - 30; COMMIT;', 'A applies a $30 payment.', { db: 'Balance $70' }],
      ['B', 'UPDATE ... SET balance = 100 - 50; COMMIT;', 'B applies a $50 payment using its stale read…', { db: 'Balance $50', bad: true }],
      ['DB', '-- A\'s $30 payment is lost', 'Correct balance is $20. Fix: UPDATE ... SET balance = balance - 50 (atomic), SELECT ... FOR UPDATE, or a stricter isolation level.', { db: 'Balance $50 ❌ (should be $20)', bad: true }]] },
    deadlock: { title: 'Deadlock', steps: [
      ['A', 'BEGIN; UPDATE invoices SET ... WHERE invoice_id = 1;', 'A locks invoice 1.', { a: '🔒 invoice 1', db: '' }],
      ['B', 'BEGIN; UPDATE invoices SET ... WHERE invoice_id = 2;', 'B locks invoice 2.', { a: '🔒 invoice 1', b: '🔒 invoice 2', db: '' }],
      ['A', 'UPDATE invoices SET ... WHERE invoice_id = 2;', 'A wants invoice 2 → waits for B ⏳', { a: '🔒 1, waiting for 2 ⏳', b: '🔒 invoice 2', db: '' }],
      ['B', 'UPDATE invoices SET ... WHERE invoice_id = 1;', 'B wants invoice 1 → waits for A ⏳. Both wait forever…', { a: '🔒 1, waiting for 2 ⏳', b: '🔒 2, waiting for 1 ⏳', db: 'DEADLOCK ♻', bad: true }],
      ['DB', 'ERROR: deadlock detected — transaction B rolled back', 'The database picks a victim and rolls it back; A continues. Prevent it by always locking rows in the same order.', { a: '🔒 1, 2 ✔', b: 'rolled back', db: 'resolved', ok: true }]] },
  };
  const ISO = [['READ UNCOMMITTED', 1, 1, 1], ['READ COMMITTED', 0, 1, 1], ['REPEATABLE READ', 0, 0, 1], ['SERIALIZABLE', 0, 0, 0]];
  function txnViz(spec) {
    const sc = TXN[spec.scenario] || TXN.commit;
    const render = (i) => {
      const rows = sc.steps.slice(0, i + 1);
      const cur = sc.steps[i];
      return h('div', null,
        h('div', { class: 'txn-grid' },
          h('div', { class: 'txn-hd' }, 'Time'), h('div', { class: 'txn-hd a' }, 'Session A'), h('div', { class: 'txn-hd b' }, 'Session B'),
          rows.map(([who, sql, note, st], k) => [
            h('div', { class: 'txn-t' }, `t${k + 1}`),
            h('div', { class: 'txn-c' + (who === 'A' || who === 'DB' ? ' on' : '') + (k === i ? ' cur' : '') }, who === 'A' || who === 'DB' ? h('pre', { class: 'code inline', html: UI.highlight(sql) }) : null),
            h('div', { class: 'txn-c' + (who === 'B' || who === 'DB' ? ' on' : '') + (k === i ? ' cur' : '') }, who === 'B' ? h('pre', { class: 'code inline', html: UI.highlight(sql) }) : null)])),
        h('div', { class: 'txn-state' + (cur[3].bad ? ' bad' : cur[3].ok ? ' ok' : '') },
          h('div', null, h('b', null, 'What happened: '), cur[2]),
          h('div', { class: 'txn-views' }, cur[3].a ? h('span', { class: 'pill a' }, 'A: ' + cur[3].a) : null, cur[3].b ? h('span', { class: 'pill b' }, 'B: ' + cur[3].b) : null, cur[3].db ? h('span', { class: 'pill db' }, '💾 Committed: ' + cur[3].db) : null)));
    };
    const iso = sc.level ? h('table', { class: 'truth iso' }, h('thead', null, h('tr', null, h('th', null, 'Isolation level'), h('th', null, 'Dirty read'), h('th', null, 'Non-repeatable'), h('th', null, 'Phantom'))),
      h('tbody', null, ISO.map(([n, a, b, c]) => h('tr', { class: n === sc.level ? 'cur' : '' }, h('th', null, n), [a, b, c].map((v) => h('td', { class: v ? 'tv tv-false' : 'tv tv-true' }, v ? 'possible' : 'prevented')))))) : null;
    return card(sc.title, 'Two sessions working on the same data. Step through the timeline.', stepper(sc.steps.length, render, { auto: 2200 }), iso);
  }

  // ---------------- Correlated subquery ----------------
  function correlatedViz() {
    const outer = q(`SELECT invoice_id, location_id, total_amount FROM invoices WHERE status <> 'Void' ORDER BY invoice_id LIMIT 8`);
    const avgs = Object.fromEntries(q(`SELECT location_id, ROUND(AVG(total_amount),2) FROM invoices WHERE status <> 'Void' GROUP BY location_id`).rows);
    const render = (i) => {
      const [id, loc, amt] = outer.rows[i];
      const avg = avgs[loc];
      const pass = amt > avg;
      return h('div', null,
        h('div', { class: 'corr-grid' },
          h('div', null, h('div', { class: 'jv-cap' }, 'Outer query — one row at a time'),
            table(outer, { compact: true, footer: false, rowClass: (k) => (k === i ? 'cur' : k < i ? (outer.rows[k][2] > avgs[outer.rows[k][1]] ? 'keep' : 'drop') : 'pending') })),
          h('div', { class: 'corr-inner' }, h('div', { class: 'jv-cap' }, 'Inner query re-runs for this row'),
            h('pre', { class: 'code', html: UI.highlight(`SELECT AVG(total_amount)\nFROM invoices i2\nWHERE i2.location_id = ${loc}  -- ← value from outer row`) }),
            h('div', { class: 'corr-calc' }, `average at location ${loc} = `, h('b', null, avg)),
            h('div', { class: 'corr-calc ' + (pass ? 'ok' : 'bad') }, `${amt} > ${avg} ? `, h('b', null, pass ? 'TRUE → keep' : 'FALSE → skip')))));
    };
    return card('Correlated Subquery, row by row', 'The inner query references the outer row, so it is (logically) re-evaluated once per outer row.',
      code(`SELECT invoice_id, location_id, total_amount\nFROM invoices i1\nWHERE total_amount > (\n  SELECT AVG(total_amount) FROM invoices i2\n  WHERE i2.location_id = i1.location_id\n);`),
      stepper(outer.rows.length, render, { auto: 1600 }));
  }

  // ---------------- Recursive CTE ----------------
  function recursiveViz() {
    const all = q(`WITH RECURSIVE tree(practitioner_id, name, supervisor_id, lvl) AS (
      SELECT practitioner_id, first_name || ' ' || last_name, supervisor_id, 0 FROM practitioners WHERE supervisor_id IS NULL
      UNION ALL SELECT p.practitioner_id, p.first_name || ' ' || p.last_name, p.supervisor_id, t.lvl + 1 FROM practitioners p JOIN tree t ON p.supervisor_id = t.practitioner_id)
      SELECT * FROM tree ORDER BY lvl, practitioner_id`);
    const maxL = Math.max(...all.rows.map((r) => r[3]));
    const render = (it) => {
      const vis = all.rows.filter((r) => r[3] <= it);
      const W = 900, H = (maxL + 1) * 80 + 20;
      const levels = [];
      for (let l = 0; l <= maxL; l++) levels.push(all.rows.filter((r) => r[3] === l));
      const pos = {};
      levels.forEach((lv, l) => lv.forEach((r, k) => (pos[r[0]] = { x: (W / (lv.length + 1)) * (k + 1), y: 34 + l * 80 })));
      let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Practitioner hierarchy">`;
      vis.forEach((r) => { if (r[2] && pos[r[2]]) s += `<line x1="${pos[r[2]].x}" y1="${pos[r[2]].y + 14}" x2="${pos[r[0]].x}" y2="${pos[r[0]].y - 14}" class="bt-edge on"/>`; });
      vis.forEach((r) => {
        const p = pos[r[0]], fresh = r[3] === it;
        s += `<rect x="${p.x - 62}" y="${p.y - 15}" width="124" height="30" rx="8" class="bt-node ${fresh ? 'on' : ''}" style="stroke:${groupColor(r[3])}"/><text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-size="11" class="bt-key">${esc(r[1])}</text>`;
      });
      s += '</svg>';
      return h('div', null,
        h('p', { class: 'viz-explain', html: it === 0 ? '<b>Anchor member</b> runs once: the practitioner with no supervisor (level 0).' : `<b>Iteration ${it}</b>: the recursive member joins practitioners to the rows found in the previous step (level ${it - 1}) → ${levels[it].length} new row(s).${it === maxL ? ' Next iteration finds nothing → recursion stops.' : ''}` }),
        h('div', { class: 'order-svg', html: s }),
        table({ columns: all.columns, rows: vis }, { compact: true, groupColors: vis.map((r) => r[3]), rowClass: (i) => (vis[i][3] === it ? 'fresh' : '') }));
    };
    return card('Recursive CTE — building the supervisor tree', 'Anchor first, then repeat the recursive part until it returns no new rows.',
      code(`WITH RECURSIVE tree AS (\n  SELECT practitioner_id, first_name || ' ' || last_name AS name, supervisor_id, 0 AS lvl\n  FROM practitioners WHERE supervisor_id IS NULL          -- anchor\n  UNION ALL\n  SELECT p.practitioner_id, p.first_name || ' ' || p.last_name, p.supervisor_id, t.lvl + 1\n  FROM practitioners p JOIN tree t ON p.supervisor_id = t.practitioner_id  -- recursive\n)\nSELECT * FROM tree;`),
      stepper(maxL + 1, render, { labels: Array.from({ length: maxL + 1 }, (_, i) => (i ? `Iter ${i}` : 'Anchor')), auto: 1800 }));
  }

  // ---------------- DML before/after ----------------
  function dmlViz(spec) {
    const [before, stmt, after] = DB.sandboxSeq([spec.view, spec.statement, spec.view]);
    if (stmt.error) return card('Before → After', null, code(spec.statement), h('div', { class: 'err' }, '❌ ' + stmt.error), before.last ? table(before.last, { compact: true }) : null);
    const B = before.last, A = after.last;
    const ki = B.columns.indexOf(spec.key || B.columns[0]);
    const bMap = new Map(B.rows.map((r) => [String(r[ki]), r])), aMap = new Map(A.rows.map((r) => [String(r[ki]), r]));
    const beforeT = table(B, { compact: true, rowClass: (i, r) => (!aMap.has(String(r[ki])) ? 'deleted' : ''), cellClass: (i, j, v) => { const a = aMap.get(String(B.rows[i][ki])); return a && a[j] !== v ? 'changed-old' : ''; } });
    const afterT = table(A, { compact: true, rowClass: (i, r) => (!bMap.has(String(r[ki])) ? 'inserted' : ''), cellClass: (i, j, v) => { const b = bMap.get(String(A.rows[i][ki])); return b && b[j] !== v ? 'changed' : ''; } });
    return card('Before → After', `${stmt.changes} row(s) affected. Nothing is saved permanently — this runs in a sandbox.`,
      code(spec.statement, { label: 'Statement' }),
      h('div', { class: 'ba-grid' }, h('div', null, h('div', { class: 'jv-cap' }, 'Before'), beforeT), h('div', { class: 'ba-arrow' }, '➜'), h('div', null, h('div', { class: 'jv-cap' }, 'After'), afterT)),
      h('div', { class: 'legend' }, h('span', { class: 'lg changed' }, 'changed value'), h('span', { class: 'lg inserted' }, 'inserted row'), h('span', { class: 'lg deleted' }, 'deleted row')));
  }

  // ---------------- Flow + HTML ----------------
  function flowViz(spec) {
    return card(spec.title || 'How it flows', spec.sub || null,
      h('div', { class: 'flow' }, (spec.steps || []).map((s, i) => {
        const [a, b] = Array.isArray(s) ? s : [s, ''];
        return [i ? h('div', { class: 'flow-arrow' }, '↓') : null, h('div', { class: 'flow-step', style: { '--gc': groupColor(i), animationDelay: i * 120 + 'ms' } }, h('div', { class: 'flow-main', html: UI.highlight(a) }), b ? h('div', { class: 'flow-note' }, b) : null)];
      })));
  }
  function htmlViz(spec) { return card(spec.title || 'Diagram', spec.sub || null, h('div', { class: 'viz-html', html: spec.html || '' })); }

  function render(spec, lesson = {}) {
    const s = typeof spec === 'string' ? { type: spec } : spec || {};
    try {
      switch (s.type) {
        case 'join': return joinViz(s);
        case 'groupby': return groupbyViz(s);
        case 'setops': return setopsViz(s);
        case 'window': return windowViz(s);
        case 'null': return nullViz(s);
        case 'keys': return keysViz(s);
        case 'order': return stagesViz(s, lesson, { orderMode: true });
        case 'stages': return stagesViz(s, lesson);
        case 'index': return indexViz(s);
        case 'explain': return explainViz(s, lesson);
        case 'txn': return txnViz(s);
        case 'correlated': return correlatedViz(s);
        case 'recursive': return recursiveViz(s);
        case 'er': return card('Entity-Relationship Diagram', 'Interactive: click a table or a relationship line for details, live statistics and the JOIN SQL. Drag tables to rearrange them.', ER.render(s));
        case 'dml': return dmlViz(s);
        case 'flow': return flowViz(s);
        case 'html': return htmlViz(s);
      }
    } catch (e) {
      console.error(e);
      return h('div', { class: 'err' }, `Visual failed to render: ${e.message}`);
    }
    return null;
  }

  window.Visuals = { render, stagesViz, TXN };
})();
