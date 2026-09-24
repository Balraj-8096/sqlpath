// Small DOM helpers, SQL highlighter, code editor, result tables, toasts.
(function () {
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svgEl = (tag, attrs = {}, ...kids) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, v);
    kids.flat().forEach((k) => k != null && el.appendChild(k instanceof Node ? k : document.createTextNode(String(k))));
    return el;
  };

  // ---------- SQL highlighter ----------
  const KW = new Set(('SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN INNER LEFT RIGHT FULL OUTER CROSS NATURAL USING GROUP BY ORDER HAVING LIMIT OFFSET ' +
    'DISTINCT ALL UNION INTERSECT EXCEPT MINUS INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE VIEW INDEX DROP ALTER ADD COLUMN RENAME TO PRIMARY KEY FOREIGN ' +
    'REFERENCES UNIQUE CHECK DEFAULT CONSTRAINT CASE WHEN THEN ELSE END WITH RECURSIVE OVER PARTITION ROWS RANGE BETWEEN UNBOUNDED PRECEDING FOLLOWING CURRENT ROW ' +
    'ASC DESC LIKE GLOB ESCAPE EXISTS BEGIN COMMIT ROLLBACK TRANSACTION SAVEPOINT RELEASE TRIGGER AFTER BEFORE INSTEAD OF FOR EACH EXPLAIN QUERY PLAN ANALYZE ' +
    'IF CONFLICT DO NOTHING REPLACE TEMP TEMPORARY TRUE FALSE FILTER WINDOW LATERAL TOP APPLY MERGE MATCHED TRUNCATE NULLS FIRST LAST FETCH NEXT ONLY INTEGER TEXT REAL ' +
    'NUMERIC BLOB VARCHAR INT DECIMAL DATE BOOLEAN AUTOINCREMENT ROLLUP CUBE GROUPING SETS PROCEDURE FUNCTION RETURNS DECLARE EXEC EXECUTE MATERIALIZED ISOLATION LEVEL ' +
    'READ COMMITTED UNCOMMITTED REPEATABLE SERIALIZABLE LOCK SHARE MODE ANY SOME CAST COLLATE PRAGMA VACUUM ELSIF LOOP RETURN OUTPUT GO USE DATABASE SCHEMA').split(' '));
  function highlight(sql) {
    const re = /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^']|'')*'?)|("(?:[^"])*"?|`[^`]*`?|\[[^\]\n]*\])|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(\s*\()?|([<>=!]=?|<>|\|\||[+\-*/%])|([\s\S])/g;
    let out = '', m;
    while ((m = re.exec(sql))) {
      if (m[1]) out += `<span class="t-com">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="t-str">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="t-id">${esc(m[3])}</span>`;
      else if (m[4]) out += `<span class="t-num">${m[4]}</span>`;
      else if (m[5]) {
        const up = m[5].toUpperCase();
        if (m[6] && !KW.has(up)) out += `<span class="t-fn">${esc(m[5])}</span>${esc(m[6])}`;
        else if (KW.has(up)) out += `<span class="t-kw">${esc(m[5])}</span>${m[6] ? esc(m[6]) : ''}`;
        else out += esc(m[5]) + (m[6] ? esc(m[6]) : '');
      } else if (m[7]) out += `<span class="t-op">${esc(m[7])}</span>`;
      else out += esc(m[8]);
    }
    return out;
  }

  // ---------- Editor (textarea over highlighted pre) ----------
  function editor({ value = '', onRun, minLines = 5, readOnly = false, placeholder = '' } = {}) {
    const pre = h('pre', { class: 'ed-hl', 'aria-hidden': 'true' });
    const ta = h('textarea', { class: 'ed-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', placeholder, 'aria-label': 'SQL editor' });
    const gutter = h('div', { class: 'ed-gutter', 'aria-hidden': 'true' });
    const wrap = h('div', { class: 'editor' + (readOnly ? ' ro' : '') }, gutter, h('div', { class: 'ed-body' }, pre, ta));
    ta.value = value;
    if (readOnly) ta.readOnly = true;
    const sync = () => {
      pre.innerHTML = highlight(ta.value) + '\n';
      const lines = Math.max(minLines, ta.value.split('\n').length);
      gutter.innerHTML = Array.from({ length: lines }, (_, i) => `<div>${i + 1}</div>`).join('');
      ta.style.height = 'auto';
      const hgt = Math.max(minLines * 21 + 20, ta.scrollHeight);
      ta.style.height = hgt + 'px';
      pre.style.height = hgt + 'px';
    };
    ta.addEventListener('input', sync);
    ta.addEventListener('scroll', () => { pre.scrollLeft = ta.scrollLeft; });
    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun && onRun(); return; }
      if (e.key === 'Tab' && !readOnly) {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 2;
        sync();
      }
    });
    requestAnimationFrame(sync);
    sync();
    return {
      el: wrap,
      get value() { return ta.value; },
      set value(v) { ta.value = v; sync(); },
      insert(text) {
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + text + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + text.length;
        ta.focus(); sync();
      },
      focus() { ta.focus(); },
    };
  }

  // Read-only highlighted code block with copy / open-in-playground actions
  function code(sql, { run = true, label = null, dialect = null } = {}) {
    const actions = h('div', { class: 'code-actions' },
      label || dialect ? h('span', { class: 'code-label' }, label || dialectName(dialect)) : null,
      h('button', { class: 'icon-btn', title: 'Copy', onclick: (e) => { navigator.clipboard && navigator.clipboard.writeText(sql); toast('Copied to clipboard'); } }, '⧉ Copy'),
      run && !dialect ? h('button', { class: 'icon-btn', title: 'Open in playground', onclick: () => App.openInPlayground(sql) }, '▶ Playground') : null);
    const pre = h('pre', { class: 'code', html: highlight(sql) });
    return h('div', { class: 'code-wrap' }, actions, pre);
  }
  const dialectName = (d) => ({ mysql: 'MySQL', postgres: 'PostgreSQL', sqlserver: 'SQL Server (T-SQL)', oracle: 'Oracle', sqlite: 'SQLite', ansi: 'ANSI SQL' }[d] || d);

  // ---------- Result table ----------
  function fmt(v) {
    if (v === null) return h('span', { class: 'null' }, 'NULL');
    if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 100) / 100);
    if (v instanceof Uint8Array) return `<blob ${v.length} bytes>`;
    return String(v);
  }
  // opts: max, rowClass(i,row), cellClass(i,j,v), groupColors (array per row), caption, hideCols (Set of indexes), compact, onRowHover(i)
  function table(res, opts = {}) {
    if (!res) return h('div', { class: 'muted small' }, 'No result set.');
    const max = opts.max ?? 200;
    const rows = res.rows.slice(0, max);
    const hide = opts.hideCols || new Set();
    const thead = h('thead', null, h('tr', null, opts.index ? h('th', { class: 'idx' }, '#') : null, res.columns.map((c, j) => (hide.has(j) ? null : h('th', null, c)))));
    const tbody = h('tbody');
    rows.forEach((r, i) => {
      const tr = h('tr', { class: opts.rowClass ? opts.rowClass(i, r) || '' : '' },
        opts.index ? h('td', { class: 'idx' }, i + 1) : null,
        r.map((v, j) => (hide.has(j) ? null : h('td', { class: (opts.cellClass ? opts.cellClass(i, j, v) || '' : '') + (typeof v === 'number' ? ' num' : '') }, fmt(v)))));
      if (opts.groupColors && opts.groupColors[i] != null) tr.style.setProperty('--gc', groupColor(opts.groupColors[i]));
      if (opts.onRowHover) { tr.addEventListener('mouseenter', () => opts.onRowHover(i, tr)); tr.addEventListener('mouseleave', () => opts.onRowHover(-1, tr)); }
      tr.dataset.i = i;
      tbody.appendChild(tr);
    });
    const t = h('table', { class: 'rt' + (opts.compact ? ' compact' : '') + (opts.groupColors ? ' grouped' : '') }, thead, tbody);
    const wrap = h('div', { class: 'rt-wrap' + (opts.scroll === false ? '' : ' scroll') }, t);
    const foot = res.rows.length > max ? h('div', { class: 'rt-foot' }, `Showing ${max} of ${res.rows.length} rows`) : opts.footer !== false ? h('div', { class: 'rt-foot' }, `${res.rows.length} row${res.rows.length === 1 ? '' : 's'}`) : null;
    return h('div', { class: 'rt-box' }, opts.caption ? h('div', { class: 'rt-cap' }, opts.caption) : null, wrap, foot);
  }
  const GROUP_COLORS = ['#7aa2f7', '#e0af68', '#9ece6a', '#f7768e', '#bb9af7', '#2ac3de', '#ff9e64', '#73daca', '#c0caf5', '#db4b4b', '#41a6b5', '#b4f9f8'];
  const GROUP_COLORS_LIGHT = ['#2f5fd0', '#b06d00', '#2e7d32', '#c62845', '#7c4dcc', '#0e8397', '#c2570c', '#138a74', '#5b6488', '#a3262a', '#1f6f7d', '#3a8f8a'];
const isLight = () => document.documentElement.dataset.theme === 'light';
  const groupColor = (i) => { const p = isLight() ? GROUP_COLORS_LIGHT : GROUP_COLORS; return p[i % p.length]; };

  function toast(msg, type = 'info') {
    let box = document.getElementById('toasts');
    if (!box) { box = h('div', { id: 'toasts' }); document.body.appendChild(box); }
    const t = h('div', { class: 'toast ' + type }, msg);
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  function tabs(items, { active = 0, onChange, cls = '' } = {}) {
    const bar = h('div', { class: 'tabs ' + cls, role: 'tablist' });
    const body = h('div', { class: 'tab-body' });
    const btns = items.map((it, i) => h('button', { class: 'tab', role: 'tab', onclick: () => sel(i) }, it.label));
    btns.forEach((b) => bar.appendChild(b));
    function sel(i) {
      btns.forEach((b, j) => b.classList.toggle('active', i === j));
      body.innerHTML = '';
      const c = items[i].render();
      if (c) body.appendChild(c);
      onChange && onChange(i);
    }
    sel(active);
    return h('div', { class: 'tabs-wrap' }, bar, body);
  }

  function modal(title, content, { wide = false } = {}) {
    const close = () => ov.remove();
    const ov = h('div', { class: 'modal-ov', onclick: (e) => { if (e.target === ov) close(); } },
      h('div', { class: 'modal' + (wide ? ' wide' : '') },
        h('div', { class: 'modal-hd' }, h('h3', null, title), h('button', { class: 'icon-btn', onclick: close, 'aria-label': 'Close' }, '✕')),
        h('div', { class: 'modal-bd' }, content)));
    document.body.appendChild(ov);
    const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    return close;
  }

  const LEVELS = { 1: ['🟢', 'Beginner', 'lv1'], 2: ['🟡', 'Intermediate', 'lv2'], 3: ['🟠', 'Advanced', 'lv3'], 4: ['🔴', 'Expert', 'lv4'] };
  const levelBadge = (n) => { const l = LEVELS[n] || LEVELS[1]; return h('span', { class: 'badge ' + l[2] }, `${l[0]} ${l[1]}`); };

  window.UI = { h, esc, svgEl, highlight, editor, code, table, toast, tabs, modal, fmt, groupColor, levelBadge, LEVELS, dialectName };
})();
