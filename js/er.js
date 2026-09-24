// Interactive ER diagram: crow's-foot notation, cardinality labels, FK / logical / many-to-many layers,
// details panel with live statistics and runnable join SQL, path finder, drag / pan / zoom.
(function () {
  const { h, esc, table, code, svgEl } = UI;
  const ALIAS = { patients: 'p', invoices: 'i', payors: 'py', payments: 'pm', charges: 'c', practitioners: 'pr', treatment_locations: 'tl', transactions: 't', sites: 's' };
  const alias = (t) => ALIAS[t] || t.slice(0, 2);
  // default layout: [column, row]
  const GRID = { patients: [0, 0], payors: [0, 2], transactions: [1, 0], invoices: [1, 1], payments: [1, 2], treatment_locations: [2, 0], charges: [2, 1], sites: [3, 0], practitioners: [3, 1] };
  const W = 236, HEAD = 34, ROW = 21, GAPX = 96, GAPY = 70, PAD = 30;
  const LAYOUT_KEY = 'sqlpath.er.layout.v2';
  const docs = () => window.SchemaDocs || { tables: {}, logical: [], derived: [] };
  const labelCol = (t) => {
    const names = t.columns.map((c) => c.name);
    return ['site_name', 'location_name', 'payor_name', 'last_name', 'cpt_code', 'status', 'transaction_type', 'method'].find((n) => names.includes(n)) || names[1] || names[0];
  };
  const q = (sql) => { try { return DB.sandbox(sql).last; } catch (e) { return null; } };
  const val = (sql) => { const r = q(sql); return r && r.rows[0] ? r.rows[0][0] : null; };

  function loadSchema() {
    const db = DB.fresh();
    try {
      const sch = DB.schema(db).filter((t) => t.type === 'table');
      sch.forEach((t) => {
        const uniq = new Set();
        db.exec(`PRAGMA index_list("${t.name}")`).forEach((r) => r.values.forEach((ix) => {
          if (ix[2]) { const cols = db.exec(`PRAGMA index_info("${ix[1]}")`)[0].values; if (cols.length === 1) uniq.add(cols[0][2]); }
        }));
        t.columns.forEach((c) => { c.unique = c.pk || uniq.has(c.name); });
      });
      return sch;
    } finally { db.close(); }
  }

  function render(spec = {}) {
    const all = loadSchema();
    const only = spec.tables ? new Set(spec.tables) : null;
    const tabs = all.filter((t) => !only || only.has(t.name));
    const byName = Object.fromEntries(tabs.map((t) => [t.name, t]));
    const full = !only;
    const st = { layers: { fk: true, logical: full, rollup: false, nn: false, ...(spec.layers || {}) }, keysOnly: false, sel: null, path: null, hoverCol: null, zoom: 1, pan: { x: 0, y: 0 } };

    // ---------- edges ----------
    const edges = [];
    tabs.forEach((t) => t.fks.forEach((f) => {
      if (!byName[f.table]) return;
      const col = t.columns.find((c) => c.name === f.from);
      edges.push({ id: `fk:${t.name}.${f.from}`, kind: 'fk', child: t.name, col: f.from, parent: f.table, pcol: f.to, optional: !col.notnull, self: t.name === f.table });
    }));
    docs().logical.forEach((l, k) => { if (byName[l.from] && byName[l.to]) edges.push({ id: `lg:${k}`, kind: 'logical', child: l.from, col: l.col, parent: l.to, pcol: l.tcol, doc: l }); });
    (docs().rollups || []).forEach((d, k) => { if (byName[d.a] && byName[d.b]) edges.push({ id: `ru:${k}`, kind: 'rollup', child: d.b, parent: d.a, doc: d }); });
    docs().derived.forEach((d, k) => { if (byName[d.a] && byName[d.b]) edges.push({ id: `nn:${k}`, kind: 'nn', child: d.a, parent: d.b, doc: d }); });

    // ---------- layout ----------
    let saved = {};
    if (full) { try { saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}'); } catch (e) { saved = {}; } }
    const visibleCols = (t) => (st.keysOnly ? t.columns.filter((c) => c.pk || c.fk || edges.some((e) => e.kind === 'logical' && e.child === t.name && e.col === c.name)) : t.columns);
    const nodeH = (t) => HEAD + visibleCols(t).length * ROW + 8;
    const pos = {};
    function defaultLayout() {
      const usedCols = [...new Set(tabs.map((t) => (GRID[t.name] || [0, 0])[0]))].sort((a, b) => a - b);
      const usedRows = [...new Set(tabs.map((t) => (GRID[t.name] || [0, 0])[1]))].sort((a, b) => a - b);
      const rowTop = {}; let y = PAD;
      usedRows.forEach((r) => { rowTop[r] = y; y += Math.max(...tabs.filter((t) => (GRID[t.name] || [0, 0])[1] === r).map(nodeH)) + GAPY; });
      tabs.forEach((t, k) => {
        const g = GRID[t.name] || [k % 4, Math.floor(k / 4)];
        pos[t.name] = { x: PAD + usedCols.indexOf(g[0]) * (W + GAPX), y: rowTop[g[1]] ?? PAD };
      });
    }
    defaultLayout();
    tabs.forEach((t) => { if (saved[t.name]) pos[t.name] = { ...saved[t.name] }; });
    const saveLayout = () => { if (full) try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(pos)); } catch (e) { /* storage unavailable */ } };

    // ---------- DOM ----------
    const svg = svgEl('svg', { class: 'erx-svg', role: 'img', 'aria-label': 'Entity relationship diagram', preserveAspectRatio: 'xMinYMin meet' });
    const gEdges = svgEl('g', { class: 'erx-edges' }), gNodes = svgEl('g', { class: 'erx-nodes' }), gLabels = svgEl('g', { class: 'erx-labels' });
    const world = svgEl('g', { class: 'erx-world' }, gEdges, gNodes, gLabels);
    svg.appendChild(world);
    const canvas = h('div', { class: 'erx-canvas' + (full ? ' full' : '') }, svg,
      h('div', { class: 'erx-zoom' },
        h('button', { class: 'icon-btn', title: 'Zoom in', 'aria-label': 'Zoom in', onclick: () => zoomBy(1.2) }, '＋'),
        h('button', { class: 'icon-btn', title: 'Zoom out', 'aria-label': 'Zoom out', onclick: () => zoomBy(1 / 1.2) }, '－'),
        h('button', { class: 'icon-btn', title: 'Guide & legend', 'aria-label': 'Guide and legend', onclick: () => { st.sel = null; st.path = null; drawAll(); showOverview(); openDrawer(); } }, 'ℹ'),
        h('button', { class: 'icon-btn', title: 'Fit to screen', 'aria-label': 'Fit to screen', onclick: () => fit() }, '⤢'),
        h('button', { class: 'icon-btn', title: 'Full screen', 'aria-label': 'Toggle full screen', onclick: () => toggleFull() }, '⛶')),
      h('div', { class: 'erx-hint' }, 'Drag tables · drag background to pan · Ctrl + wheel to zoom · click anything for details'));
    // Details drawer: slides over the right side of the canvas so the diagram can use the full width.
    const panel = h('div', { class: 'erx-pbody' });
    const drawer = h('aside', { class: 'erx-panel', 'aria-label': 'Details' },
      h('button', { class: 'icon-btn erx-close', title: 'Close details', 'aria-label': 'Close details', onclick: () => closeDrawer() }, '✕'), panel);
    const openDrawer = () => { drawer.classList.add('open'); drawer.scrollTop = 0; requestAnimationFrame(reveal); };
    // Pan so the highlighted tables sit left of the open drawer (when there is room).
    function reveal() {
      const rel = related();
      if (!rel || getComputedStyle(drawer).position !== 'absolute') return;
      const nodes = [...gNodes.querySelectorAll('.erx-node')].filter((n) => rel.tables.has(n.dataset.t)).map((n) => n.getBoundingClientRect());
      if (!nodes.length) return;
      const c = canvas.getBoundingClientRect(), limit = c.right - drawer.offsetWidth - 24;
      const minL = Math.min(...nodes.map((r) => r.left)), maxR = Math.max(...nodes.map((r) => r.right));
      const minT = Math.min(...nodes.map((r) => r.top)), maxB = Math.max(...nodes.map((r) => r.bottom));
      let dx = 0, dy = 0;   // screen pixels to move the content (+ = right / down)
      if (minL < c.left + 12) dx = c.left + 12 - minL;                              // hidden on the left
      else if (maxR > limit) dx = -Math.min(maxR - limit, minL - c.left - 12);       // hidden under the drawer
      if (minT < c.top + 12) dy = c.top + 12 - minT;
      else if (maxB > c.bottom - 12) dy = -Math.min(maxB - c.bottom + 12, minT - c.top - 12);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const s = svgScale();
      st.pan = { x: st.pan.x + dx * s, y: st.pan.y + dy * s };
      world.style.transition = 'transform .3s';
      applyView();
      setTimeout(() => { world.style.transition = ''; }, 350);
    }
    function closeDrawer() { drawer.classList.remove('open'); st.sel = null; st.path = null; drawAll(); }

    // ---------- geometry helpers ----------
    const colIndex = (t, c) => visibleCols(byName[t]).findIndex((x) => x.name === c);
    const colY = (t, c) => { const i = colIndex(t, c); return pos[t].y + (i < 0 ? HEAD / 2 : HEAD + i * ROW + ROW / 2 + 2); };
    function endpoints(e) {
      const a = pos[e.child], b = pos[e.parent];
      const viaHead = e.kind === 'nn' || e.kind === 'rollup';
      const y1 = viaHead ? a.y + HEAD / 2 : colY(e.child, e.col), y2 = viaHead ? b.y + HEAD / 2 : colY(e.parent, e.pcol);
      if (e.self || Math.abs(a.x - b.x) < W * 0.6) {
        const x = Math.max(a.x, b.x) + W;
        const k = edges.filter((o) => o !== e && (o.self || Math.abs(pos[o.child].x - pos[o.parent].x) < W * 0.6) && Math.max(pos[o.child].x, pos[o.parent].x) === Math.max(a.x, b.x)).indexOf(e);
        const off = 34 + (edges.indexOf(e) % 4) * 14 + Math.max(k, 0) * 4;
        return { x1: x, y1, d1: 1, x2: x, y2, d2: 1, loop: off };
      }
      const right = a.x < b.x;
      return { x1: right ? a.x + W : a.x, y1, d1: right ? 1 : -1, x2: right ? b.x : b.x + W, y2, d2: right ? -1 : 1 };
    }
    function pathD(p) {
      if (p.loop) return `M${p.x1},${p.y1} C${p.x1 + p.loop * 1.6},${p.y1} ${p.x2 + p.loop * 1.6},${p.y2} ${p.x2},${p.y2}`;
      const dx = Math.max(48, Math.abs(p.x2 - p.x1) / 2);
      return `M${p.x1},${p.y1} C${p.x1 + p.d1 * dx},${p.y1} ${p.x2 + p.d2 * dx},${p.y2} ${p.x2},${p.y2}`;
    }
    function midPoint(p) {
      // cubic bezier at t = .5
      let c1x, c2x;
      if (p.loop) { c1x = p.x1 + p.loop * 1.6; c2x = p.x2 + p.loop * 1.6; } else { const dx = Math.max(48, Math.abs(p.x2 - p.x1) / 2); c1x = p.x1 + p.d1 * dx; c2x = p.x2 + p.d2 * dx; }
      return { x: 0.125 * p.x1 + 0.375 * c1x + 0.375 * c2x + 0.125 * p.x2, y: 0.5 * p.y1 + 0.5 * p.y2 };
    }
    // Crow's-foot end symbol. kind: one | zeroOne | zeroMany | oneMany. dir: direction the line leaves the table (+1 right, -1 left)
    function symbol(x, y, dir, kind, cls) {
      const g = svgEl('g', { class: 'erx-sym ' + cls });
      const L = (x1, y1, x2, y2) => g.appendChild(svgEl('line', { x1, y1, x2, y2 }));
      if (kind === 'zeroMany' || kind === 'oneMany') { L(x + dir * 13, y, x, y - 7); L(x + dir * 13, y, x, y + 7); L(x + dir * 13, y, x, y); }
      if (kind === 'one') { L(x + dir * 8, y - 7, x + dir * 8, y + 7); L(x + dir * 13, y - 7, x + dir * 13, y + 7); }
      if (kind === 'zeroOne') L(x + dir * 9, y - 7, x + dir * 9, y + 7);
      if (kind === 'oneMany') L(x + dir * 17, y - 7, x + dir * 17, y + 7);
      if (kind === 'zeroOne' || kind === 'zeroMany') g.appendChild(svgEl('circle', { cx: x + dir * (kind === 'zeroOne' ? 17 : 20), cy: y, r: 4.2 }));
      return g;
    }
    const cardText = (x, y, dir, text, cls) => svgEl('text', { x: x + dir * 28, y: y - 7, class: 'erx-card ' + cls, 'text-anchor': dir > 0 ? 'start' : 'end' }, text);

    // ---------- highlighting state ----------
    function related() {
      if (st.path) return { tables: new Set(st.path.tables), edges: new Set(st.path.edges) };
      if (!st.sel) return null;
      if (st.sel.type === 'table') {
        const es = edges.filter((e) => shown(e) && (e.child === st.sel.name || e.parent === st.sel.name));
        return { tables: new Set([st.sel.name, ...es.flatMap((e) => [e.child, e.parent])]), edges: new Set(es.map((e) => e.id)) };
      }
      const e = edges.find((x) => x.id === st.sel.id);
      const via = e.kind === 'nn' || e.kind === 'rollup' ? e.doc.via : [];
      return { tables: new Set([e.child, e.parent, ...via]), edges: new Set([e.id]) };
    }
    const shown = (e) => st.layers[e.kind];

    // ---------- draw ----------
    function drawNodes() {
      gNodes.innerHTML = '';
      const rel = related();
      tabs.forEach((t) => {
        const p = pos[t.name], cols = visibleCols(t), H = nodeH(t);
        const d = docs().tables[t.name] || {};
        const g = svgEl('g', { class: 'erx-node' + (rel ? (rel.tables.has(t.name) ? ' on' : ' dim') : '') + (st.sel && st.sel.type === 'table' && st.sel.name === t.name ? ' sel' : ''), transform: `translate(${p.x},${p.y})`, 'data-t': t.name, tabindex: 0 });
        g.appendChild(svgEl('rect', { class: 'erx-box', width: W, height: H, rx: 10 }));
        g.appendChild(svgEl('path', { class: 'erx-head', d: `M0,10 a10,10 0 0 1 10,-10 h${W - 20} a10,10 0 0 1 10,10 v${HEAD - 10} h${-W} z` }));
        g.appendChild(svgEl('text', { x: 12, y: 22, class: 'erx-title' }, `${d.icon || '▦'} ${t.name}`));
        g.appendChild(svgEl('text', { x: W - 10, y: 22, class: 'erx-count', 'text-anchor': 'end' }, `${t.count} rows`));
        cols.forEach((c, i) => {
          const y = HEAD + i * ROW;
          const row = svgEl('g', { class: 'erx-col' + (c.pk ? ' pk' : '') + (c.fk ? ' fk' : '') + (st.hoverCol && st.hoverCol.t === t.name && st.hoverCol.c === c.name ? ' hl' : ''), 'data-c': c.name });
          row.appendChild(svgEl('rect', { x: 1, y, width: W - 2, height: ROW, class: 'erx-colbg' }));
          const badge = c.pk ? 'PK' : c.fk ? 'FK' : c.unique ? 'UQ' : '';
          if (badge) { row.appendChild(svgEl('rect', { x: 8, y: y + 4, width: 22, height: 13, rx: 3, class: 'erx-badge ' + badge.toLowerCase() })); row.appendChild(svgEl('text', { x: 19, y: y + 14, 'text-anchor': 'middle', class: 'erx-badge-t' }, badge)); }
          row.appendChild(svgEl('text', { x: 36, y: y + 15, class: 'erx-cname' }, c.name + (c.notnull || c.pk ? '' : ' ?')));
          row.appendChild(svgEl('text', { x: W - 10, y: y + 15, class: 'erx-ctype', 'text-anchor': 'end' }, c.fk ? fkLabel(c) : (c.type || '').toLowerCase()));
          row.appendChild(svgEl('title', {}, `${t.name}.${c.name} ${c.type}${c.pk ? ' · PRIMARY KEY' : ''}${c.fk ? ` · FOREIGN KEY → ${c.fk.table}.${c.fk.to}` : ''}${c.notnull || c.pk ? ' · NOT NULL' : ' · nullable'}${c.unique && !c.pk ? ' · UNIQUE' : ''}\n${(d.columns || {})[c.name] || ''}`));
          row.addEventListener('mouseenter', () => { st.hoverCol = { t: t.name, c: c.name }; drawEdges(); markCols(); });
          row.addEventListener('mouseleave', () => { st.hoverCol = null; drawEdges(); markCols(); });
          g.appendChild(row);
        });
        attachDrag(g, t.name);
        g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') select({ type: 'table', name: t.name }); });
        gNodes.appendChild(g);
      });
    }
    // "→ table" after an FK column, truncated so it never overlaps the column name
    function fkLabel(c) {
      const room = Math.floor((W - 50) / 6.4) - (c.name.length + 2);
      const t = c.fk.table;
      return '→ ' + (t.length <= room - 2 ? t : t.slice(0, Math.max(3, room - 3)) + '…');
    }
    function markCols() {
      const hc = st.hoverCol;
      const partners = new Set();
      if (hc) edges.filter((e) => shown(e) && e.kind !== 'nn').forEach((e) => {
        if (e.child === hc.t && e.col === hc.c) partners.add(`${e.parent}.${e.pcol}`);
        if (e.parent === hc.t && e.pcol === hc.c) partners.add(`${e.child}.${e.col}`);
      });
      gNodes.querySelectorAll('.erx-node').forEach((n) => n.querySelectorAll('.erx-col').forEach((r) => {
        const k = `${n.dataset.t}.${r.dataset.c}`;
        r.classList.toggle('hl', !!hc && (k === `${hc.t}.${hc.c}` || partners.has(k)));
      }));
    }
    function drawEdges() {
      gEdges.innerHTML = ''; gLabels.innerHTML = '';
      const rel = related();
      const hc = st.hoverCol;
      edges.filter(shown).forEach((e) => {
        const p = endpoints(e);
        const hot = hc && e.kind !== 'nn' && ((e.child === hc.t && e.col === hc.c) || (e.parent === hc.t && e.pcol === hc.c));
        const state = rel ? (rel.edges.has(e.id) ? ' on' : ' dim') : '';
        const g = svgEl('g', { class: `erx-edge k-${e.kind}${state}${hot ? ' hot' : ''}${st.sel && st.sel.id === e.id ? ' sel' : ''}` });
        const d = pathD(p);
        g.appendChild(svgEl('path', { d, class: 'erx-hit' }));
        g.appendChild(svgEl('path', { d, class: 'erx-line' }));
        // ends: child side = "many" (or one, for 1:1 logical); parent side = one / zero-or-one
        if (e.kind === 'fk') {
          g.appendChild(symbol(p.x1, p.y1, p.d1, 'zeroMany', 'child'));
          g.appendChild(symbol(p.x2, p.y2, p.d2, e.optional ? 'zeroOne' : 'one', 'parent'));
          g.appendChild(cardText(p.x1, p.y1, p.d1, 'N', 'child'));
          g.appendChild(cardText(p.x2, p.y2, p.d2, e.optional ? '0..1' : '1', 'parent'));
        } else if (e.kind === 'rollup') {
          g.appendChild(symbol(p.x1, p.y1, p.d1, 'zeroMany', 'child'));
          g.appendChild(symbol(p.x2, p.y2, p.d2, 'one', 'parent'));
        } else if (e.kind === 'logical') {
          g.appendChild(symbol(p.x1, p.y1, p.d1, 'zeroOne', 'child'));
          g.appendChild(symbol(p.x2, p.y2, p.d2, 'one', 'parent'));
        } else {
          g.appendChild(symbol(p.x1, p.y1, p.d1, 'zeroMany', 'child'));
          g.appendChild(symbol(p.x2, p.y2, p.d2, 'zeroMany', 'parent'));
        }
        g.appendChild(svgEl('title', {}, edgeTitle(e)));
        g.addEventListener('click', (ev) => { ev.stopPropagation(); select({ type: 'edge', id: e.id }); });
        gEdges.appendChild(g);
        // pill label
        const m = midPoint(p);
        const text = e.kind === 'fk' ? (e.self ? '1 : N (self)' : '1 : N') : e.kind === 'logical' ? '1 : 1' : e.kind === 'rollup' ? '1 : N derived' : 'N : N';
        const pw = text.length * 6.6 + 14;
        const pill = svgEl('g', { class: `erx-pill k-${e.kind}${state}${hot ? ' hot' : ''}`, transform: `translate(${m.x - pw / 2},${m.y - 10})` },
          svgEl('rect', { width: pw, height: 20, rx: 10 }), svgEl('text', { x: pw / 2, y: 14, 'text-anchor': 'middle' }, text), svgEl('title', {}, edgeTitle(e)));
        pill.addEventListener('click', (ev) => { ev.stopPropagation(); select({ type: 'edge', id: e.id }); });
        gLabels.appendChild(pill);
      });
    }
    const edgeTitle = (e) => (e.kind === 'rollup' ? `${e.parent} 1 ── N ${e.child} (derived via ${e.doc.via.join(' → ')})` : e.kind === 'fk' ? `${e.parent} 1 ── N ${e.child}  (${e.child}.${e.col} → ${e.parent}.${e.pcol})` : e.kind === 'logical' ? `${e.child}.${e.col} ↔ ${e.parent}.${e.pcol} 1 : 1 when ${e.doc.when} (not enforced)` : `${e.child} N ── N ${e.parent} via ${e.doc.via.join(' → ')}`);
    function drawAll() { drawEdges(); drawNodes(); markCols(); applyView(); }

    // ---------- pan / zoom / drag ----------
    const bounds = () => {
      const xs = tabs.flatMap((t) => [pos[t.name].x, pos[t.name].x + W]), ys = tabs.flatMap((t) => [pos[t.name].y, pos[t.name].y + nodeH(t)]);
      return { x: Math.min(...xs) - PAD, y: Math.min(...ys) - PAD, w: Math.max(...xs) - Math.min(...xs) + PAD * 2 + 90, h: Math.max(...ys) - Math.min(...ys) + PAD * 2 };
    };
    // The viewBox is fixed at fit time (not recomputed while dragging, which would make the view jump).
    function applyView() {
      if (!st.vb) st.vb = bounds();
      const b = st.vb, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
      world.setAttribute('transform', `translate(${st.pan.x + cx},${st.pan.y + cy}) scale(${st.zoom}) translate(${-cx},${-cy})`);
    }
    function zoomBy(f) { st.zoom = Math.min(2.5, Math.max(0.4, st.zoom * f)); applyView(); }
    function fit() { st.zoom = 1; st.pan = { x: 0, y: 0 }; st.vb = bounds(); applyView(); }
    // If fitting everything makes text too small (narrow lesson column), start at a readable zoom anchored top-left.
    const MIN_READABLE = 0.78;
    function readableStart() {
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const b = st.vb, base = Math.min(r.width / b.w, r.height / b.h);
      if (base >= MIN_READABLE) return;
      const z = MIN_READABLE / base, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      st.zoom = z;
      st.pan = { x: (b.x - cx) * (1 - z), y: (b.y - cy) * (1 - z) };
      applyView();
    }
    const svgScale = () => { const b = st.vb || bounds(); const r = svg.getBoundingClientRect(); return r.width ? Math.max(b.w / r.width, b.h / r.height) : 1; };
    function attachDrag(g, name) {
      let start = null, moved = false;
      g.addEventListener('pointerdown', (ev) => { if (ev.button !== 0) return; ev.stopPropagation(); start = { x: ev.clientX, y: ev.clientY, px: pos[name].x, py: pos[name].y, s: svgScale() / st.zoom }; moved = false; g.setPointerCapture(ev.pointerId); });
      g.addEventListener('pointermove', (ev) => {
        if (!start) return;
        const dx = (ev.clientX - start.x) * start.s, dy = (ev.clientY - start.y) * start.s;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        if (!moved) return;
        pos[name] = { x: Math.round(start.px + dx), y: Math.round(start.py + dy) };
        g.setAttribute('transform', `translate(${pos[name].x},${pos[name].y})`);
        drawEdges();
      });
      g.addEventListener('pointerup', () => { if (start && !moved) select({ type: 'table', name }); if (moved) saveLayout(); start = null; });
    }
    let panStart = null;
    svg.addEventListener('pointerdown', (ev) => { if (ev.target.closest('.erx-edge, .erx-pill')) return; panStart = { x: ev.clientX, y: ev.clientY, px: st.pan.x, py: st.pan.y, s: svgScale(), moved: false }; });
    svg.addEventListener('pointermove', (ev) => {
      if (!panStart) return;
      const dx = ev.clientX - panStart.x, dy = ev.clientY - panStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) { panStart.moved = true; canvas.classList.add('panning'); }
      st.pan = { x: panStart.px + dx * panStart.s, y: panStart.py + dy * panStart.s };
      if (panStart.moved) applyView();
    });
    const endPan = () => { if (panStart && !panStart.moved && drawer.classList.contains('open')) closeDrawer(); panStart = null; canvas.classList.remove('panning'); };
    svg.addEventListener('pointerup', endPan);
    svg.addEventListener('pointerleave', () => { panStart = null; canvas.classList.remove('panning'); });
    canvas.addEventListener('wheel', (ev) => { if (!ev.ctrlKey && !ev.metaKey) return; ev.preventDefault(); zoomBy(ev.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });

    // ---------- selection + panel ----------
    function select(s) {
      st.sel = s; st.path = null; drawAll();
      if (s.type === 'table') showTable(s.name); else showEdge(edges.find((e) => e.id === s.id));
      openDrawer();
    }
    const sqlBlock = (title, sql) => {
      const out = h('div');
      return h('div', { class: 'erx-sql' }, h('div', { class: 'erx-sql-hd' }, h('b', null, title),
        h('button', { class: 'btn xs', onclick: () => { out.innerHTML = ''; const r = q(sql); out.appendChild(r ? table(r, { compact: true, max: 12 }) : h('div', { class: 'err' }, 'Query failed')); } }, '▶ Run'),
        h('button', { class: 'btn xs ghost', onclick: () => App.openInPlayground(sql) }, '🧪 Playground')), code(sql, { run: false }), out);
    };
    const statGrid = (items) => h('div', { class: 'erx-stats' }, items.map(([v, l]) => h('div', { class: 'erx-stat' }, h('b', null, v ?? '—'), h('span', null, l))));
    const cardRow = (left, sym, right, note) => h('div', { class: 'erx-read' }, h('code', null, left), h('span', { class: 'erx-read-sym' }, sym), h('code', null, right), note ? h('span', { class: 'muted xs' }, note) : null);

    function showOverview() {
      panel.innerHTML = '';
      const fks = edges.filter((e) => e.kind === 'fk');
      panel.append(
        h('div', { class: 'erx-p-hd' }, h('h3', null, full ? '🗺️ Healthcare Billing schema' : '🗺️ Tables in this lesson'), h('span', { class: 'muted xs' }, `${tabs.length} tables · ${fks.length} foreign keys`)),
        h('p', { class: 'small' }, 'Click a ', h('b', null, 'table'), ' to see what it stores, its keys and relationships. Click a ', h('b', null, 'line or its label'), ' to see the relationship type, live statistics and the JOIN you use in SQL.'),
        h('div', { class: 'erx-list' }, tabs.map((t) => { const d = docs().tables[t.name] || {}; return h('button', { class: 'erx-li', onclick: () => select({ type: 'table', name: t.name }) }, h('span', null, d.icon || '▦'), h('span', null, h('b', null, t.name), h('br'), h('span', { class: 'muted xs' }, d.grain || '')), h('span', { class: 'muted xs' }, t.count)); })),
        legend());
    }

    function showTable(name) {
      const t = byName[name], d = docs().tables[name] || {};
      const out = edges.filter((e) => e.kind === 'fk' && e.child === name);
      const inc = edges.filter((e) => e.kind === 'fk' && e.parent === name && !e.self);
      const other = edges.filter((e) => e.kind !== 'fk' && (e.child === name || e.parent === name));
      const relBtn = (e, txt) => h('button', { class: 'erx-rel', onclick: () => select({ type: 'edge', id: e.id }) }, txt);
      panel.innerHTML = '';
      panel.append(
        h('div', { class: 'erx-p-hd' }, h('h3', null, `${d.icon || '▦'} ${name}`), h('span', { class: 'badge' }, `${t.count} rows`)),
        d.purpose ? h('p', { class: 'small' }, d.purpose) : null,
        d.grain ? h('div', { class: 'erx-grain' }, h('b', null, 'Grain: '), d.grain) : null,
        d.scope ? h('details', { class: 'more', open: name === 'sites' }, h('summary', null, '📐 Scope'), h('p', { class: 'small' }, d.scope)) : null,
        h('div', { class: 'jv-cap' }, 'Columns'),
        h('table', { class: 'erx-cols' }, h('tbody', null, t.columns.map((c) => h('tr', null,
          h('td', null, c.pk ? h('span', { class: 'kb pk' }, 'PK') : c.fk ? h('span', { class: 'kb fk' }, 'FK') : c.unique ? h('span', { class: 'kb uq' }, 'UQ') : null),
          h('td', null, h('code', null, c.name), h('div', { class: 'muted xs' }, `${(c.type || '').toLowerCase()}${c.notnull || c.pk ? ' · required' : ' · nullable'}${c.fk ? ` · → ${c.fk.table}.${c.fk.to}` : ''}`)),
          h('td', { class: 'small' }, (d.columns || {})[c.name] || ''))))),
        h('div', { class: 'jv-cap' }, 'Relationships'),
        h('div', { class: 'erx-rels' },
          out.map((e) => relBtn(e, h('span', null, h('b', null, 'N : 1'), ` → ${e.parent}`, h('span', { class: 'muted xs' }, ` via ${e.col}${e.optional ? ' (optional)' : ''}`)))),
          inc.map((e) => relBtn(e, h('span', null, h('b', null, '1 : N'), ` ← ${e.child}`, h('span', { class: 'muted xs' }, ` via ${e.child}.${e.col}`)))),
          other.map((e) => relBtn(e, h('span', null, h('b', null, e.kind === 'logical' ? '1 : 1' : e.kind === 'rollup' ? (e.parent === name ? '1 : N' : 'N : 1') : 'N : N'), ` ${e.kind === 'rollup' ? (e.parent === name ? '←' : '→') : '↔'} ${e.child === name ? e.parent : e.child}`, h('span', { class: 'muted xs' }, e.kind === 'logical' ? ' (logical)' : ` ${e.kind === 'rollup' ? 'derived ' : ''}via ${e.doc.via.join(', ')}`)))),
          !out.length && !inc.length && !other.length ? h('span', { class: 'muted small' }, 'No relationships to tables shown here.') : null),
        sqlBlock('Preview rows', `SELECT *\nFROM ${name}\nLIMIT 5;`));
    }

    function showEdge(e) {
      panel.innerHTML = '';
      if (e.kind === 'fk') return fkPanel(e);
      if (e.kind === 'logical') return logicalPanel(e);
      if (e.kind === 'rollup') return rollupPanel(e);
      return nnPanel(e);
    }
    function fkPanel(e) {
      const P = byName[e.parent], Cc = byName[e.child];
      const pa = e.self ? 'boss' : alias(e.parent), ca = e.self ? 'staff' : alias(e.child);
      const pl = labelCol(P), cl = labelCol(Cc), cpk = Cc.columns.find((c) => c.pk).name;
      const total = val(`SELECT COUNT(*) FROM ${e.child}`), nulls = val(`SELECT COUNT(*) FROM ${e.child} WHERE ${e.col} IS NULL`);
      const parents = val(`SELECT COUNT(*) FROM ${e.parent}`), used = val(`SELECT COUNT(DISTINCT ${e.col}) FROM ${e.child}`);
      const maxc = val(`SELECT MAX(n) FROM (SELECT COUNT(*) n FROM ${e.child} WHERE ${e.col} IS NOT NULL GROUP BY ${e.col})`);
      const avg = val(`SELECT ROUND(AVG(n), 1) FROM (SELECT COUNT(*) n FROM ${e.child} WHERE ${e.col} IS NOT NULL GROUP BY ${e.col})`);
      const one = e.self ? `One practitioner (supervisor)` : `One ${e.parent.replace(/s$/, '')}`;
      panel.append(
        h('div', { class: 'erx-p-hd' }, h('h3', null, e.self ? '🔁 Self-referencing one-to-many' : '🔗 One-to-many relationship'), h('span', { class: 'erx-pill-static k-fk' }, e.self ? '1 : N (self)' : '1 : N')),
        h('div', { class: 'erx-big' }, h('span', null, e.parent), h('span', { class: 'erx-big-mid', html: bigSym(e.optional ? 'zeroOne' : 'one', 'zeroMany') }), h('span', null, e.child)),
        cardRow(e.parent, '1 → N', e.child, `${one} has zero or many ${e.child}.`),
        cardRow(e.child, 'N → 1', e.parent, e.optional ? `Each row has zero or one ${e.parent.replace(/s$/, '')} (${e.col} can be NULL).` : `Each row has exactly one ${e.parent.replace(/s$/, '')} (${e.col} is NOT NULL).`),
        h('div', { class: 'erx-keys' }, 'Foreign key ', h('code', null, `${e.child}.${e.col}`), ' → primary key ', h('code', null, `${e.parent}.${e.pcol}`), e.optional ? h('span', { class: 'badge' }, 'optional') : h('span', { class: 'badge' }, 'mandatory')),
        h('div', { class: 'jv-cap' }, 'In the data right now'),
        statGrid([[`${used}/${parents}`, `${e.parent} referenced`], [parents - used, `${e.parent} with no ${e.child}`], [maxc, `max ${e.child} per ${e.parent.replace(/s$/, '')}`], [avg, 'average'], [nulls, `${e.child} with NULL ${e.col}`], [total, `${e.child} total`]]),
        h('div', { class: 'jv-cap' }, 'Using it in SQL'),
        sqlBlock('INNER JOIN — matching pairs', `SELECT ${pa}.${pl} AS ${e.self ? 'supervisor' : e.parent.replace(/s$/, '')}, ${ca}.${cpk}, ${ca}.${cl}\nFROM ${e.parent} ${pa}\nJOIN ${e.child} ${ca} ON ${ca}.${e.col} = ${pa}.${e.pcol}\nORDER BY ${pa}.${e.pcol}\nLIMIT 10;`),
        sqlBlock(`Count ${e.child} per ${e.parent.replace(/s$/, '')} (LEFT JOIN keeps zeros)`, `SELECT ${pa}.${e.pcol}, ${pa}.${pl}, COUNT(${ca}.${cpk}) AS ${e.self ? 'direct_reports' : e.child}\nFROM ${e.parent} ${pa}\nLEFT JOIN ${e.child} ${ca} ON ${ca}.${e.col} = ${pa}.${e.pcol}\nGROUP BY ${pa}.${e.pcol}\nORDER BY 3 DESC;`),
        sqlBlock(`${e.parent} with no ${e.child} (anti-join)`, `SELECT ${pa}.*\nFROM ${e.parent} ${pa}\nLEFT JOIN ${e.child} ${ca} ON ${ca}.${e.col} = ${pa}.${e.pcol}\nWHERE ${ca}.${cpk} IS NULL;`),
        h('div', { class: 'erx-tip' }, '💡 Join direction: start FROM the "one" side and LEFT JOIN the "many" side to keep parents without children. Joining the "many" side multiplies rows, so aggregate carefully.'));
    }
    function logicalPanel(e) {
      const l = e.doc;
      const n = val(`SELECT COUNT(*) FROM ${e.child} ${alias(e.child)} JOIN ${e.parent} ${alias(e.parent)} ON ${alias(e.parent)}.${e.pcol} = ${alias(e.child)}.${e.col} WHERE ${alias(e.child)}.${l.when.replace('transaction_type', 'transaction_type')}`);
      const parents = val(`SELECT COUNT(*) FROM ${e.parent}`);
      panel.append(
        h('div', { class: 'erx-p-hd' }, h('h3', null, '🔗 One-to-one (logical)'), h('span', { class: 'erx-pill-static k-logical' }, '1 : 1')),
        h('div', { class: 'erx-big' }, h('span', null, e.parent), h('span', { class: 'erx-big-mid', html: bigSym('one', 'zeroOne') }), h('span', null, e.child)),
        h('p', { class: 'small' }, l.text),
        cardRow(e.parent, '1 → 1', e.child, `Each ${e.parent.replace(/s$/, '')} has exactly one ledger posting.`),
        h('div', { class: 'erx-keys' }, h('code', null, `${e.child}.${e.col}`), ' ↔ ', h('code', null, `${e.parent}.${e.pcol}`), ' only when ', h('code', null, l.when), h('span', { class: 'badge' }, 'not enforced')),
        statGrid([[n, 'matched postings'], [parents, `${e.parent} total`]]),
        sqlBlock('Join with the type condition', `SELECT ${alias(e.parent)}.*, ${alias(e.child)}.transaction_id, ${alias(e.child)}.amount AS ledger_amount\nFROM ${e.parent} ${alias(e.parent)}\nJOIN ${e.child} ${alias(e.child)}\n  ON ${alias(e.child)}.${e.col} = ${alias(e.parent)}.${e.pcol}\n AND ${alias(e.child)}.${l.when}\nLIMIT 10;`),
        h('div', { class: 'erx-tip' }, '⚠️ Because the same column points at different tables depending on transaction_type (a polymorphic association), a foreign key cannot protect it. Always add the type condition to the join.'));
    }
    function rollupPanel(e) {
      const chain = [e.parent, ...e.doc.via, e.child];
      const cpk = byName[e.child].columns.find((c) => c.pk).name, pl = labelCol(byName[e.parent]);
      // LEFT JOIN lines walking a chain of tables along their foreign keys
      const joinLines = (ch) => ch.slice(1).map((t, i) => {
        const x = fkBetween(ch[i], t);
        const on = x.child === t ? `${alias(t)}.${x.col} = ${alias(ch[i])}.${x.pcol}` : `${alias(t)}.${x.pcol} = ${alias(ch[i])}.${x.col}`;
        return `LEFT JOIN ${t} ${alias(t)} ON ${on}`;
      }).join('\n');
      const P = alias(e.parent), Ca = alias(e.child), ppk = byName[e.parent].columns.find((c) => c.pk).name;
      const perSite = `SELECT ${P}.${ppk}, ${P}.${pl}, COUNT(DISTINCT ${Ca}.${cpk}) AS ${e.child}\nFROM ${e.parent} ${P}\n${joinLines(chain)}\nGROUP BY 1\nORDER BY 3 DESC;`;
      const check = `-- every ${e.child.replace(/s$/, '')} must roll up to exactly one ${e.parent.replace(/s$/, '')}\nSELECT ${Ca}.${cpk}, COUNT(DISTINCT ${P}.${ppk}) AS ${e.parent}\nFROM ${e.child} ${Ca}\n${joinLines([...chain].reverse())}\nGROUP BY 1\nHAVING COUNT(DISTINCT ${P}.${ppk}) <> 1;`;
      const bad = (q(check) || { rows: [] }).rows.length;
      const total = val(`SELECT COUNT(*) FROM ${e.child}`);
      panel.append(
        h('div', { class: 'erx-p-hd' }, h('h3', null, '⤵️ Derived one-to-many (roll-up)'), h('span', { class: 'erx-pill-static k-rollup' }, '1 : N')),
        h('div', { class: 'erx-big' }, h('span', null, e.parent), h('span', { class: 'erx-big-mid', html: bigSym('one', 'zeroMany') }), h('span', null, e.child)),
        h('p', { class: 'small' }, e.doc.text),
        h('div', { class: 'erx-chain' }, chain.map((t, i) => [i ? h('span', { class: 'muted' }, ' → ') : null, h('code', { class: e.doc.via.includes(t) ? 'via' : '' }, t)])),
        cardRow(e.parent, '1 → N', e.child, `One ${e.parent.replace(/s$/, '')} has many ${e.child}.`),
        cardRow(e.child, 'N → 1', e.parent, `Each ${e.child.replace(/s$/, '')} rolls up to exactly one ${e.parent.replace(/s$/, '')}, because every step of the path is N : 1.`),
        statGrid([[`${total - bad}/${total}`, `${e.child} map to exactly one ${e.parent.replace(/s$/, '')}`], [bad, 'exceptions']]),
        h('div', { class: 'erx-tip' }, '📐 Not stored as a column on purpose: the site is already determined by the location (location_id → site_id). Storing ', h('code', null, `${e.child}.site_id`), ' too would be a transitive dependency (a 3NF violation) that could drift out of sync. Derive it with joins, or wrap the joins in a VIEW.'),
        sqlBlock(`Count ${e.child} per ${e.parent.replace(/s$/, '')}`, perSite),
        sqlBlock('Prove the 1 : N (should return no rows)', check));
    }
    function nnPanel(e) {
      const chain = [e.child, ...e.doc.via, e.parent];
      const sql = chainSql(chain, true);
      const pairs = val(`SELECT COUNT(*) FROM (${chainSql(chain, false)})`);
      const multi = val(`SELECT COUNT(*) FROM (SELECT a_id FROM (${chainSql(chain, false)}) GROUP BY a_id HAVING COUNT(*) >= 2)`);
      panel.append(
        h('div', { class: 'erx-p-hd' }, h('h3', null, '🔀 Many-to-many'), h('span', { class: 'erx-pill-static k-nn' }, 'N : N')),
        h('div', { class: 'erx-big' }, h('span', null, e.child), h('span', { class: 'erx-big-mid', html: bigSym('zeroMany', 'zeroMany') }), h('span', null, e.parent)),
        h('p', { class: 'small' }, e.doc.text),
        h('div', { class: 'erx-chain' }, chain.map((t, i) => [i ? h('span', { class: 'muted' }, ' → ') : null, h('code', { class: e.doc.via.includes(t) ? 'via' : '' }, t)])),
        h('p', { class: 'muted xs' }, 'Relational databases store N : N as two 1 : N relationships through a junction (or a path of tables). The highlighted middle tables are the junction.'),
        statGrid([[pairs, `distinct ${e.child} ↔ ${e.parent} pairs`], [multi, `${e.child} linked to 2+ ${e.parent}`]]),
        sqlBlock(`Which ${e.parent} each ${e.child.replace(/s$/, '')} is linked to`, sql));
    }
    const bigSym = (left, right) => {
      const s = (k, dir) => { const g = symbol(dir > 0 ? 0 : 120, 14, dir, k, ''); return g.outerHTML; };
      return `<svg viewBox="-4 0 128 28" width="128" height="28" class="erx-bigsym"><line x1="0" y1="14" x2="120" y2="14"/>${s(left, 1)}${s(right, -1)}</svg>`;
    };

    // ---------- path finder ----------
    function fkBetween(a, b) {
      return edges.find((e) => e.kind === 'fk' && !e.self && ((e.child === a && e.parent === b) || (e.child === b && e.parent === a)));
    }
    function chainSql(chain, pretty) {
      const al = (t, i) => (chain.indexOf(t) !== i ? alias(t) + i : alias(t));
      const first = chain[0], last = chain[chain.length - 1];
      const fl = labelCol(byName[first]), ll = labelCol(byName[last]);
      const fpk = byName[first].columns.find((c) => c.pk).name, lpk = byName[last].columns.find((c) => c.pk).name;
      let s = pretty ? `SELECT DISTINCT ${al(first, 0)}.${fpk}, ${al(first, 0)}.${fl}, ${al(last, chain.length - 1)}.${lpk}, ${al(last, chain.length - 1)}.${ll}\nFROM ${first} ${al(first, 0)}`
        : `SELECT DISTINCT ${al(first, 0)}.${fpk} AS a_id, ${al(last, chain.length - 1)}.${lpk} AS b_id FROM ${first} ${al(first, 0)}`;
      for (let i = 1; i < chain.length; i++) {
        const a = chain[i - 1], b = chain[i], e = fkBetween(a, b);
        const A = al(a, i - 1), B = al(b, i);
        const on = e.child === b ? `${B}.${e.col} = ${A}.${e.pcol}` : `${B}.${e.pcol} = ${A}.${e.col}`;
        s += `${pretty ? '\n' : ' '}JOIN ${b} ${B} ON ${on}`;
      }
      return s + (pretty ? `\nORDER BY 1, 3\nLIMIT 20;` : '');
    }
    function findPath(a, b) {
      const adj = {};
      edges.filter((e) => e.kind === 'fk' && !e.self).forEach((e) => { (adj[e.child] = adj[e.child] || []).push(e.parent); (adj[e.parent] = adj[e.parent] || []).push(e.child); });
      const prev = { [a]: null }, qu = [a];
      while (qu.length) { const x = qu.shift(); if (x === b) break; (adj[x] || []).forEach((y) => { if (!(y in prev)) { prev[y] = x; qu.push(y); } }); }
      if (!(b in prev)) return null;
      const chain = []; for (let x = b; x; x = prev[x]) chain.unshift(x);
      return chain;
    }
    const names = tabs.map((t) => t.name);
    const selA = h('select', { class: 'input sm', 'aria-label': 'From table' }, names.map((n) => h('option', { value: n, selected: n === 'sites' || (!names.includes('sites') && n === names[0]) }, n)));
    const selB = h('select', { class: 'input sm', 'aria-label': 'To table' }, names.map((n) => h('option', { value: n, selected: n === 'patients' || (!names.includes('patients') && n === names[names.length - 1]) }, n)));
    function runPath() {
      const a = selA.value, b = selB.value;
      if (a === b) return;
      const chain = findPath(a, b);
      panel.innerHTML = '';
      if (!chain) { panel.appendChild(h('div', { class: 'err' }, `No foreign-key path between ${a} and ${b} in this diagram.`)); openDrawer(); return; }
      const pe = []; for (let i = 1; i < chain.length; i++) pe.push(fkBetween(chain[i - 1], chain[i]).id);
      st.sel = null; st.path = { tables: chain, edges: pe }; drawAll(); openDrawer();
      panel.append(
        h('div', { class: 'erx-p-hd' }, h('h3', null, '🧭 Join path'), h('span', { class: 'badge' }, `${chain.length - 1} join${chain.length > 2 ? 's' : ''}`)),
        h('div', { class: 'erx-chain' }, chain.map((t, i) => [i ? h('span', { class: 'muted' }, ' → ') : null, h('code', null, t)])),
        h('ol', { class: 'erx-steps small' }, chain.slice(1).map((t, i) => { const e = fkBetween(chain[i], t); return h('li', null, `${chain[i]} → ${t}: `, h('code', null, `${e.child}.${e.col} = ${e.parent}.${e.pcol}`), ` (${e.child === t ? '1 : N — rows can multiply' : 'N : 1 — one match each'})`); })),
        sqlBlock(`Connect ${a} to ${b}`, chainSql(chain, true)),
        h('div', { class: 'erx-tip' }, '💡 This is the shortest chain of foreign keys. Each 1 : N step can multiply rows, so use DISTINCT or aggregate at the end.'));
    }

    // ---------- toolbar + legend ----------
    const layerBtn = (k, label, title) => h('label', { class: 'erx-tg', title }, h('input', { type: 'checkbox', checked: st.layers[k], onchange: (ev) => { st.layers[k] = ev.target.checked; drawAll(); } }), h('span', { class: 'erx-sw k-' + k }), label);
    const toolbar = h('div', { class: 'erx-toolbar' },
      h('div', { class: 'erx-group' }, h('span', { class: 'muted xs' }, 'Show'), layerBtn('fk', 'Foreign keys (1 : N)', 'Declared, enforced foreign keys'), layerBtn('logical', 'Logical 1 : 1', 'Real relationships not declared as foreign keys'), layerBtn('rollup', 'Derived roll-ups', 'One-to-many relationships implied by a chain of foreign keys (e.g. site → invoices)'), layerBtn('nn', 'Many-to-many (N : N)', 'Relationships that go through a junction table')),
      h('div', { class: 'erx-group' }, h('label', { class: 'erx-tg' }, h('input', { type: 'checkbox', onchange: (ev) => { st.keysOnly = ev.target.checked; drawAll(); } }), 'Keys only')),
      h('div', { class: 'erx-group' }, h('span', { class: 'muted xs' }, 'Find join path'), selA, h('span', null, '→'), selB, h('button', { class: 'btn xs', onclick: runPath }, 'Show path')),
      full ? h('button', { class: 'btn xs ghost', onclick: () => { try { localStorage.removeItem(LAYOUT_KEY); } catch (e) { /* ignore */ } defaultLayout(); fit(); drawAll(); } }, '↺ Reset layout') : null);
    function legend() {
      const item = (k, a, b, t) => h('div', { class: 'erx-lg' }, h('span', { html: bigSym(a, b).replace('width="128"', 'width="96"') }), h('span', { class: 'small' }, t));
      return h('div', { class: 'erx-legend' },
        h('div', { class: 'jv-cap' }, "How to read it (crow's-foot notation)"),
        item('one', 'one', 'zeroMany', '1 : N — exactly one parent ‖ … zero or many children'),
        item('opt', 'zeroOne', 'zeroMany', '0..1 : N — optional parent (FK can be NULL)'),
        item('11', 'one', 'zeroOne', '1 : 1 — at most one on each side'),
        item('nn', 'zeroMany', 'zeroMany', 'N : N — many on both sides (needs a junction table)'),
        h('div', { class: 'erx-lg' }, h('span', { class: 'erx-sw k-fk' }), h('span', { class: 'small' }, 'solid = enforced foreign key')),
        h('div', { class: 'erx-lg' }, h('span', { class: 'erx-sw k-logical' }), h('span', { class: 'small' }, 'dotted = logical link (not enforced)')),
        h('div', { class: 'erx-lg' }, h('span', { class: 'erx-sw k-rollup' }), h('span', { class: 'small' }, 'long dashes = derived 1 : N roll-up (implied by a path, not stored)')),
        h('div', { class: 'erx-lg' }, h('span', { class: 'erx-sw k-nn' }), h('span', { class: 'small' }, 'dashed = many-to-many through a junction')),
        h('div', { class: 'erx-lg' }, h('span', { class: 'kb pk' }, 'PK'), h('span', { class: 'kb fk' }, 'FK'), h('span', { class: 'kb uq' }, 'UQ'), h('span', { class: 'small' }, ' primary key · foreign key · unique; "?" after a name = nullable')));
    }

    drawAll();
    showOverview();
    const root = h('div', { class: 'erx' + (full ? ' is-full' : '') }, toolbar, h('div', { class: 'erx-body' }, canvas, drawer));
    function toggleFull() {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (root.requestFullscreen) root.requestFullscreen().catch(() => root.classList.toggle('pseudo-full'));
      else root.classList.toggle('pseudo-full');
    }
    document.addEventListener('fullscreenchange', () => { if (document.body.contains(root)) setTimeout(() => { fit(); if (!document.fullscreenElement) readableStart(); }, 60); });
    // wait until the canvas is laid out (lessons render visuals lazily)
    const ro = new ResizeObserver(() => { if (svg.getBoundingClientRect().width) { ro.disconnect(); readableStart(); } });
    ro.observe(canvas);
    // Focus a table on load: open its details on wide canvases; on narrow ones only highlight it,
    // so the drawer doesn't cover the diagram before the learner has seen it.
    if (spec.focus && byName[spec.focus]) setTimeout(() => {
      if (canvas.getBoundingClientRect().width >= 900) select({ type: 'table', name: spec.focus });
      else { st.sel = { type: 'table', name: spec.focus }; drawAll(); showTable(spec.focus); requestAnimationFrame(() => centerOn(spec.focus)); }
    }, 0);
    // Pan so a table's centre sits in the middle of the canvas (keeping the current zoom).
    function centerOn(name) {
      const n = gNodes.querySelector(`.erx-node[data-t="${name}"]`);
      if (!n) return;
      const r = n.getBoundingClientRect(), c = canvas.getBoundingClientRect();
      if (!c.width) return;
      const s = svgScale();
      st.pan = { x: st.pan.x + (c.left + c.width / 2 - (r.left + r.width / 2)) * s, y: st.pan.y + (c.top + Math.min(c.height / 2, r.height / 2 + 20) - (r.top + r.height / 2)) * s };
      applyView();
    }
    return root;
  }

  window.ER = { render };
})();
