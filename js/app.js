// Theme: light / dark, remembered per browser; defaults to the OS preference.
const Theme = (function () {
  const KEY = 'sqlpath.theme';
  const root = document.documentElement;
  const saved = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const system = () => (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const apply = (t) => { root.dataset.theme = t; };
  apply(saved() || system());
  if (window.matchMedia) matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (!saved()) { apply(system()); window.App && App.refresh && App.refresh(); } });
  return {
    current: () => root.dataset.theme,
    toggle() { const t = root.dataset.theme === 'light' ? 'dark' : 'light'; apply(t); try { localStorage.setItem(KEY, t); } catch (e) { /* storage unavailable */ } },
  };
})();

// App shell: router, curriculum sidebar, database explorer, dashboard, progress, visualizer hub.
(function () {
  const { h, esc, table, code, toast } = UI;
  const C = Curriculum;
  const main = () => document.getElementById('main');

  const App = {
    activeEditor: null,
    pendingSql: null,
    openInPlayground(sql) { App.pendingSql = sql; location.hash = '#/practice'; },
    go(hash) { location.hash = hash; },
    refreshExplorer() { renderExplorer(); },
    refreshHeader() { renderHeader(); },
  };
  window.App = App;

  // ---------------- Header ----------------
  const NAV = [['#/', 'Dashboard', '🏠'], ['#/learn', 'Learn', '📚'], ['#/practice', 'Practice', '🧪'], ['#/visualizer', 'Visualizer', '🎬'], ['#/builder', 'Query Builder', '🧩'], ['#/interview', 'Interview', '💼'], ['#/progress', 'Progress', '🏆']];
  function renderHeader() {
    const o = Progress.overall();
    const st = Progress.state;
    const route = (location.hash || '#/').split('/')[1] || '';
    const hd = document.getElementById('topbar');
    hd.innerHTML = '';
    hd.append(
      h('button', { class: 'icon-btn only-mobile', 'aria-label': 'Toggle curriculum', onclick: () => document.body.classList.toggle('show-sidebar') }, '☰'),
      h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-logo', html: logoSvg() }), h('span', null, 'SQL', h('b', null, 'Path'))),
      h('nav', { class: 'nav' }, NAV.map(([href, label, icon]) => h('a', { href, class: 'nav-link' + ((href.split('/')[1] || '') === route ? ' active' : '') }, h('span', { class: 'nav-ic' }, icon), h('span', { class: 'nav-tx' }, label)))),
      h('div', { class: 'hd-stats' },
        h('div', { class: 'hd-prog', title: `${o.done} of ${o.total} lessons completed` }, h('span', { class: 'muted small' }, 'Progress'), h('div', { class: 'mini-bar' }, h('i', { style: { width: o.pct * 100 + '%' } })), h('b', null, Math.round(o.pct * 100) + '%')),
        h('span', { class: 'hd-chip', title: 'Day streak' }, '🔥 ', st.streak.count || 0),
        h('span', { class: 'hd-chip', title: 'Experience points' }, '⭐ ', st.xp)),
      h('button', { class: 'icon-btn theme-btn', title: Theme.current() === 'light' ? 'Switch to dark theme' : 'Switch to light theme', 'aria-label': 'Toggle light/dark theme', onclick: () => { Theme.toggle(); route(); } }, Theme.current() === 'light' ? '🌙' : '☀️'),
      h('button', { class: 'icon-btn', title: 'Toggle database explorer', 'aria-label': 'Toggle database explorer', onclick: () => document.body.classList.toggle('hide-explorer') }, '🗄️'));
  }
  const logoSvg = () => `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><ellipse cx="16" cy="8" rx="11" ry="4" fill="none" stroke="var(--accent)" stroke-width="2.2"/><path d="M5 8v16c0 2.2 4.9 4 11 4s11-1.8 11-4V8" fill="none" stroke="var(--accent)" stroke-width="2.2"/><path d="M5 16c0 2.2 4.9 4 11 4s11-1.8 11-4" fill="none" stroke="var(--accent2)" stroke-width="2.2"/><path d="M12 22l3 3 6-7" fill="none" stroke="var(--green)" stroke-width="2.4" stroke-linecap="round"/></svg>`;

  // ---------------- Curriculum sidebar ----------------
  let sidebarFilter = '';
  const openSections = new Set();
  function renderSidebar() {
    const sb = document.getElementById('sidebar');
    const cur = currentLessonId();
    if (cur) openSections.add(C.byId[cur].section);
    sb.innerHTML = '';
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Search lessons…', value: sidebarFilter, 'aria-label': 'Search lessons', oninput: (e) => { sidebarFilter = e.target.value.toLowerCase(); renderList(); } });
    const list = h('div', { class: 'sb-list' });
    function renderList() {
      list.innerHTML = '';
      C.sections.forEach((sec) => {
        const ss = Progress.sectionStats(sec);
        const matches = sec.ids.map((id) => C.byId[id]).filter((l) => !sidebarFilter || l.title.toLowerCase().includes(sidebarFilter) || sec.title.toLowerCase().includes(sidebarFilter));
        if (!matches.length) return;
        const open = sidebarFilter || openSections.has(sec.key);
        const items = h('div', { class: 'sb-items' });
        let lastGroup = null;
        matches.forEach((l) => {
          if (l.group && l.group !== lastGroup) { items.appendChild(h('div', { class: 'sb-group' }, l.group)); lastGroup = l.group; }
          items.appendChild(h('a', { class: 'sb-lesson' + (l.id === cur ? ' current' : '') + (Progress.isDone(l.id) ? ' done' : ''), href: `#/learn/${l.id}`, onclick: () => document.body.classList.remove('show-sidebar') },
            h('span', { class: 'sb-check' }, Progress.isDone(l.id) ? '✔' : l.n), h('span', null, l.title), Lessons.get(l.id) && Lessons.get(l.id).visual ? h('span', { class: 'sb-vis', title: 'Interactive visual' }, '🎬') : null));
        });
        const hd = h('button', { class: 'sb-sec' + (open ? ' open' : ''), 'aria-expanded': open ? 'true' : 'false', onclick: () => { openSections.has(sec.key) ? openSections.delete(sec.key) : openSections.add(sec.key); renderList(); } },
          h('span', { class: 'sb-num' }, sec.num), h('span', { class: 'sb-title' }, sec.icon, ' ', sec.short), h('span', { class: 'sb-count' }, `${ss.done}/${ss.total}`), h('span', { class: 'sb-caret' }, '▸'));
        list.appendChild(h('div', { class: 'sb-section' }, hd, h('div', { class: 'sb-bar' }, h('i', { style: { width: ss.pct * 100 + '%' } })), open ? items : null));
      });
    }
    renderList();
    sb.append(h('div', { class: 'sb-hd' }, h('div', { class: 'sb-cap' }, 'Course Curriculum'), search), list);
  }
  const currentLessonId = () => { const m = (location.hash || '').match(/^#\/learn\/([\w-]+)/); return m ? m[1] : Progress.state.current; };

  // ---------------- Database explorer ----------------
  const openTables = new Set();
  function renderExplorer() {
    const ex = document.getElementById('explorer');
    let sch;
    try { sch = DB.schema(); } catch (e) { sch = []; }
    ex.innerHTML = '';
    ex.append(
      h('div', { class: 'ex-hd' }, h('div', null, h('div', { class: 'sb-cap' }, 'Database Explorer'), h('div', { class: 'muted small' }, '🏥 Healthcare Billing · SQLite')),
        h('button', { class: 'icon-btn', title: 'Close', 'aria-label': 'Close explorer', onclick: () => document.body.classList.add('hide-explorer') }, '✕')),
      h('div', { class: 'ex-actions' },
        h('button', { class: 'btn sm ghost', onclick: () => { location.hash = '#/visualizer/er'; } }, '🔗 ER diagram'),
        h('button', { class: 'btn sm ghost', title: 'Restore the original sample data', onclick: () => { DB.reset(); renderExplorer(); toast('Database reset to the original sample data'); } }, '↺ Reset DB')),
      h('div', { class: 'ex-list' }, sch.map((t) => {
        const open = openTables.has(t.name);
        return h('div', { class: 'ex-table' + (open ? ' open' : '') },
          h('div', { class: 'ex-row' },
            h('button', { class: 'ex-name', title: ((window.SchemaDocs || {}).tables || {})[t.name] ? SchemaDocs.tables[t.name].purpose + ' Grain: ' + SchemaDocs.tables[t.name].grain : t.name, 'aria-expanded': open ? 'true' : 'false', onclick: () => { open ? openTables.delete(t.name) : openTables.add(t.name); renderExplorer(); } }, h('span', { class: 'sb-caret' }, '▸'), t.type === 'view' ? '👁 ' : '▦ ', t.name),
            h('span', { class: 'muted small' }, t.count),
            h('button', { class: 'icon-btn xs', title: `Preview ${t.name}`, onclick: () => previewTable(t.name) }, '👁'),
            h('button', { class: 'icon-btn xs', title: 'Insert into editor', onclick: () => insertText(t.name) }, '⤵')),
          open ? h('div', { class: 'ex-cols' }, t.columns.map((c) => h('button', { class: 'ex-col', title: `${c.type}${c.notnull ? ' NOT NULL' : ''}${c.fk ? ` → ${c.fk.table}.${c.fk.to}` : ''} — click to insert`, onclick: () => insertText(c.name) },
            h('span', { class: 'ex-ic' }, c.pk ? '🔑' : c.fk ? '🔗' : '·'), h('span', { class: 'ex-cn' }, c.name), h('span', { class: 'ex-ct' }, c.fk ? '→ ' + c.fk.table : c.type.toLowerCase())))) : null);
      })),
      h('div', { class: 'ex-rel' }, h('div', { class: 'sb-cap' }, 'Relationships'),
        sch.flatMap((t) => t.fks.map((f) => h('div', { class: 'ex-relrow' }, h('code', null, `${t.name}.${f.from}`), h('span', { class: 'muted' }, ' ∞─1 '), h('code', null, `${f.table}.${f.to}`))))));
  }
  function insertText(t) {
    if (App.activeEditor && document.body.contains(App.activeEditor.el)) App.activeEditor.insert(t);
    else { navigator.clipboard && navigator.clipboard.writeText(t); toast(`"${t}" copied — open an editor to insert directly`); }
  }
  function previewTable(name) {
    const r = DB.exec(`SELECT * FROM "${name}" LIMIT 100`).last;
    UI.modal(`${name}`, h('div', null, code(`SELECT * FROM ${name};`), table(r, { max: 100 })), { wide: true });
  }

  // ---------------- Dashboard ----------------
  function dashboard() {
    const o = Progress.overall();
    const st = Progress.state;
    const acc = Progress.accuracy();
    const curId = st.current || C.lessons.find((l) => !Progress.isDone(l.id))?.id || C.lessons[0].id;
    const nextId = Progress.isDone(curId) ? (C.lessons.find((l) => !Progress.isDone(l.id)) || C.byId[curId]).id : curId;
    const cur = C.byId[nextId];
    const remainingMin = (o.total - o.done) * C.MIN_PER_LESSON;
    const solved = Object.values(st.challenges).filter((c) => c.solved).length;
    const el = h('div', { class: 'page dash' },
      h('div', { class: 'crumbs' }, 'SQL › ', h('b', null, 'Dashboard')),
      h('section', { class: 'hero card' },
        h('div', { class: 'hero-main' },
          h('div', { class: 'eyebrow' }, 'SQL · Learning Mode'),
          h('h1', null, o.done ? 'Welcome back — keep going!' : 'Learn SQL by seeing what it does'),
          h('p', { class: 'muted' }, 'A hands-on course on a real Healthcare Billing database: invoices, charges, payments, payors, practitioners and treatment locations. Every query runs live in your browser.'),
          h('div', { class: 'hero-prog' },
            h('div', { class: 'hero-prog-top' }, h('span', null, 'Your Progress'), h('b', null, Math.round(o.pct * 100) + '%')),
            h('div', { class: 'bar big' }, h('i', { style: { width: Math.max(o.pct * 100, 0.5) + '%' } })),
            h('div', { class: 'muted small' }, `${o.done} of ${o.total} lessons completed`)),
          h('div', { class: 'hero-cur' }, h('span', { class: 'muted small' }, o.done ? 'Continue with' : 'Start with'),
            h('div', null, h('b', null, cur.title), h('span', { class: 'muted' }, ` · ${C.sectionByKey[cur.section].title}`)),
            h('div', { class: 'hero-btns' }, h('a', { class: 'btn', href: `#/learn/${cur.id}` }, o.done ? '▶ Continue lesson' : '▶ Start learning'), h('a', { class: 'btn ghost', href: '#/practice' }, '🧪 Open playground')))),
        h('div', { class: 'hero-art', html: heroSvg() })),
      h('section', { class: 'stat-grid' },
        stat('📘', `${o.done} / ${o.total}`, 'Lessons completed'),
        stat('⏱', remainingMin > 90 ? `${Math.round(remainingMin / 60)} h` : `${remainingMin} min`, 'Estimated time left'),
        stat('🎓', Progress.skillLevel(), 'Current skill level'),
        stat('🔥', `${st.streak.count || 0} day${st.streak.count === 1 ? '' : 's'}`, `Streak · best ${st.streak.best || 0}`),
        stat('🎯', solved, 'Challenges solved'),
        stat('✅', acc.pct === null ? '—' : Math.round(acc.pct * 100) + '%', 'Accuracy'),
        stat('⭐', st.xp, 'XP earned'),
        stat('💼', Progress.interviewReadiness() + '%', 'Interview readiness')),
      h('section', { class: 'modes' },
        mode('📚', 'Learning Mode', 'Step-by-step lessons with visuals, examples, quizzes and challenges.', `#/learn/${cur.id}`),
        mode('🔁', 'Mixed Review', Progress.reviewDueCount() ? `${Progress.reviewDueCount()} item(s) waiting — spaced repetition of missed, due and weak-topic challenges.` : 'Spaced repetition: missed, due and weak-topic challenges, interleaved.', '#/practice/review'),
        mode('🧪', 'Practice Mode', 'SQL playground, step-by-step execution, challenges with hints and instant feedback.', '#/practice'),
        mode('🎬', 'Visual Explainer', 'Watch JOINs, GROUP BY, windows, indexes and transactions work on real rows.', '#/visualizer'),
        mode('🧩', 'Query Builder', 'Click together a query and see the SQL generated live.', '#/builder'),
        mode('💼', 'Interview Mode', 'MCQs, output prediction, debugging and timed query-writing.', '#/interview')),
      h('section', { class: 'card' }, h('div', { class: 'card-hd' }, h('h2', null, '🗺️ Learning Path'), h('span', { class: 'muted small' }, 'Recommended order — jump anywhere, prerequisites are shown')), roadmap()),
      h('section', null, h('div', { class: 'card-hd' }, h('h2', null, '📋 Course Curriculum'), h('span', { class: 'muted small' }, `${C.sections.length} sections · ${C.lessons.length} lessons`)),
        h('div', { class: 'sec-grid' }, C.sections.map(sectionCard))));
    return el;
  }
  const stat = (ic, v, l) => h('div', { class: 'stat card' }, h('div', { class: 'stat-ic' }, ic), h('div', null, h('div', { class: 'stat-v' }, v), h('div', { class: 'stat-l' }, l)));
  const mode = (ic, t, d, href) => h('a', { class: 'mode card', href }, h('div', { class: 'mode-ic' }, ic), h('b', null, t), h('span', { class: 'muted small' }, d));
  function sectionCard(sec) {
    const ss = Progress.sectionStats(sec);
    const first = sec.ids.find((i) => !Progress.isDone(i)) || sec.ids[0];
    return h('a', { class: 'sec-card card', href: `#/learn/${first}` },
      h('div', { class: 'sec-top' }, h('span', { class: 'sec-num' }, sec.num), h('span', { class: 'sec-ic' }, sec.icon), UI.levelBadge({ Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 }[sec.level])),
      h('b', null, sec.title),
      h('div', { class: 'muted small' }, `${sec.ids.length} lessons · ~${Math.round((sec.ids.length * C.MIN_PER_LESSON) / 60 * 10) / 10} h`),
      sec.prereq.length ? h('div', { class: 'muted xs' }, 'Requires: ', sec.prereq.map((p) => C.sectionByKey[p].short).join(', ')) : h('div', { class: 'muted xs' }, 'No prerequisites'),
      h('div', { class: 'bar' }, h('i', { style: { width: ss.pct * 100 + '%' } })), h('div', { class: 'muted xs' }, `${ss.done}/${ss.total} completed`));
  }
  function roadmap() {
    const steps = [...C.PATH.map((k) => C.sectionByKey[k]), { key: 'interview', short: 'Interview Mode', icon: '💼', num: '★' }];
    return h('div', { class: 'roadmap' }, steps.map((sec, i) => {
      const ss = sec.ids ? Progress.sectionStats(sec) : { pct: Progress.interviewReadiness() / 100, done: 0, total: 0 };
      const status = ss.pct >= 1 ? 'done' : ss.pct > 0 ? 'active' : 'todo';
      const href = sec.ids ? `#/learn/${sec.ids.find((x) => !Progress.isDone(x)) || sec.ids[0]}` : '#/interview';
      const R = 20, circ = 2 * Math.PI * R;
      return [i ? h('div', { class: 'rm-link ' + status }) : null,
        h('a', { class: 'rm-node ' + status, href, title: sec.prereq && sec.prereq.length ? 'Prerequisites: ' + sec.prereq.map((p) => C.sectionByKey[p].short).join(', ') : '' },
          h('div', { class: 'rm-ring', html: `<svg viewBox="0 0 50 50" width="50" height="50"><circle cx="25" cy="25" r="${R}" class="ring-bg"/><circle cx="25" cy="25" r="${R}" class="ring-fg" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - ss.pct)}"/></svg><span>${sec.icon}</span>` }),
          h('div', { class: 'rm-label' }, sec.short), h('div', { class: 'rm-sub' }, sec.ids ? `${ss.done}/${ss.total}` : `${Math.round(ss.pct * 100)}% ready`))];
    }));
  }
  const heroSvg = () => `<svg viewBox="0 0 300 220" width="100%" role="img" aria-label="Tables joined into a result">
    <g font-family="var(--mono)" font-size="10">
      <rect x="10" y="20" width="110" height="92" rx="8" fill="var(--panel2)" stroke="var(--blue)"/><text x="20" y="38" fill="var(--blue)" font-weight="700">patients</text>
      ${[0, 1, 2, 3].map((i) => `<rect x="18" y="${46 + i * 15}" width="94" height="11" rx="3" fill="var(--blue)" opacity="${i === 2 ? 0.15 : 0.35}"><animate attributeName="opacity" values="${i === 2 ? '.15;.15;.15' : '.35;.8;.35'}" dur="3s" begin="${i * 0.4}s" repeatCount="indefinite"/></rect>`).join('')}
      <rect x="180" y="20" width="110" height="92" rx="8" fill="var(--panel2)" stroke="var(--yellow)"/><text x="190" y="38" fill="var(--yellow)" font-weight="700">invoices</text>
      ${[0, 1, 2, 3].map((i) => `<rect x="188" y="${46 + i * 15}" width="94" height="11" rx="3" fill="var(--yellow)" opacity=".35"><animate attributeName="opacity" values=".35;.8;.35" dur="3s" begin="${i * 0.4 + 0.2}s" repeatCount="indefinite"/></rect>`).join('')}
      <path d="M112 51 C150 51 150 51 188 51 M112 66 C150 66 150 81 188 81 M112 96 C150 96 150 96 188 96" stroke="var(--accent)" stroke-width="1.6" fill="none" stroke-dasharray="4 3"><animate attributeName="stroke-dashoffset" values="14;0" dur="1s" repeatCount="indefinite"/></path>
      <path d="M150 120 v26" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#ah)"/><defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
      <text x="158" y="138" fill="var(--muted)">INNER JOIN</text>
      <rect x="70" y="152" width="160" height="58" rx="8" fill="var(--panel2)" stroke="var(--green)"/><text x="80" y="170" fill="var(--green)" font-weight="700">result</text>
      ${[0, 1].map((i) => `<rect x="78" y="${178 + i * 14}" width="144" height="10" rx="3" fill="var(--green)" opacity=".45"/>`).join('')}
    </g></svg>`;

  // ---------------- Progress page ----------------
  function progressPage() {
    const st = Progress.state;
    const acc = Progress.accuracy();
    const topics = Progress.topicStats();
    const topicName = (k) => (k.startsWith('iv:') ? 'Interview · ' + k.slice(3) : (C.sectionByKey[k] && C.sectionByKey[k].short) || k);
    const ranked = Object.entries(topics).filter(([, v]) => v.n >= 2).map(([k, v]) => [k, v.ok / v.n]).sort((a, b) => a[1] - b[1]);
    const weak = ranked.filter(([, p]) => p < 0.6).slice(0, 5), strong = ranked.filter(([, p]) => p >= 0.8).reverse().slice(0, 5);
    const avg = Progress.avgChallengeMs();
    const solved = Object.values(st.challenges).filter((c) => c.solved).length;
    const ivOk = Object.values(st.interview).filter((r) => r.correct).length;
    // activity heatmap: last 16 weeks
    const days = [];
    const end = new Date();
    for (let i = 16 * 7 - 1; i >= 0; i--) { const d = new Date(end - i * 864e5).toISOString().slice(0, 10); days.push([d, st.activity[d] || 0]); }
    return h('div', { class: 'page' },
      h('div', { class: 'crumbs' }, 'SQL › ', h('b', null, 'Progress')),
      h('h1', null, '🏆 Your Progress'),
      h('div', { class: 'stat-grid' },
        stat('📘', `${Progress.overall().done}`, 'Lessons completed'), stat('🎯', solved, 'Practice solved'),
        stat('✅', acc.pct === null ? '—' : Math.round(acc.pct * 100) + '%', 'Accuracy'), stat('🔥', st.streak.count || 0, `Current streak (best ${st.streak.best || 0})`),
        stat('⏱', avg ? fmtMs(avg) : '—', 'Avg. challenge time'), stat('💼', Progress.interviewReadiness() + '%', 'Interview readiness'),
        stat('🗣', `${ivOk}/${(window.InterviewBank || []).length}`, 'Interview questions'), stat('⭐', st.xp, `XP · ${Progress.skillLevel()}`)),
      h('div', { class: 'two-col' },
        h('div', { class: 'card' }, h('div', { class: 'card-hd' }, h('h2', null, 'By section')),
          h('div', { class: 'overall' }, h('span', null, 'Overall Progress'), h('div', { class: 'bar' }, h('i', { style: { width: Progress.overall().pct * 100 + '%' } })), h('b', null, Math.round(Progress.overall().pct * 100) + '%')),
          C.sections.map((sec) => { const ss = Progress.sectionStats(sec); return h('a', { class: 'prog-row', href: `#/learn/${sec.ids[0]}` }, h('span', null, sec.icon, ' ', sec.short), h('div', { class: 'bar' }, h('i', { style: { width: ss.pct * 100 + '%' } })), h('span', { class: 'mono small' }, `${ss.done}/${ss.total}`)); })),
        h('div', null,
          h('div', { class: 'card' }, h('div', { class: 'card-hd' }, h('h2', null, '📈 Strong topics')), strong.length ? strong.map(([k, p]) => topicRow(topicName(k), p, 'good')) : h('p', { class: 'muted small' }, 'Answer quizzes and solve challenges to discover your strengths.')),
          h('div', { class: 'card' }, h('div', { class: 'card-hd' }, h('h2', null, '🩹 Weak topics')), weak.length ? weak.map(([k, p]) => topicRow(topicName(k), p, 'bad')) : h('p', { class: 'muted small' }, 'No weak spots detected yet.')),
          h('div', { class: 'card' }, h('div', { class: 'card-hd' }, h('h2', null, '🗓 Activity')), h('div', { class: 'heat' }, days.map(([d, n]) => h('i', { title: `${d}: ${n} activities`, class: 'l' + Math.min(4, Math.ceil(n / 3)) })))))),
      h('div', { class: 'card danger-zone' }, h('b', null, 'Reset progress'), h('span', { class: 'muted small' }, ' Clears lessons, XP, streak and history stored in this browser.'),
        h('button', { class: 'btn sm danger', onclick: () => { if (confirm('Reset all progress? This cannot be undone.')) { Progress.reset(); route(); } } }, 'Reset')));
  }
  const topicRow = (name, p, cls) => h('div', { class: 'prog-row' }, h('span', null, name), h('div', { class: 'bar ' + cls }, h('i', { style: { width: p * 100 + '%' } })), h('span', { class: 'mono small' }, Math.round(p * 100) + '%'));
  const fmtMs = (ms) => (ms < 60000 ? Math.round(ms / 1000) + 's' : Math.round(ms / 60000) + ' min');

  // ---------------- Visualizer hub ----------------
  const HUB = [
    ['join', '🔗 JOINs', 'INNER / LEFT / RIGHT / FULL / CROSS with match lines', { type: 'join', join: 'left' }],
    ['groupby', '📊 GROUP BY & HAVING', 'Rows → buckets → one value per bucket', { type: 'groupby', source: 'SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id <= 14', group: 'status', value: 'total_amount', agg: 'SUM', having: 200 }],
    ['order', '⚙️ Execution order', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT', { type: 'order', sql: "SELECT location_id, COUNT(*) AS invoices, SUM(total_amount) AS billed\nFROM invoices\nWHERE status <> 'Void'\nGROUP BY location_id\nHAVING COUNT(*) > 5\nORDER BY billed DESC\nLIMIT 3;" }],
    ['window', '🪟 Window functions', 'Partitions, ranking, running totals, frames', { type: 'window', source: 'SELECT invoice_id, location_id, total_amount FROM invoices WHERE invoice_id <= 14', partition: 'location_id', order: 'total_amount', value: 'total_amount', fn: 'RANK' }],
    ['setops', '⚪ Set operations', 'UNION vs UNION ALL vs INTERSECT vs EXCEPT', { type: 'setops', a: 'SELECT city FROM patients WHERE city IS NOT NULL', b: 'SELECT city FROM treatment_locations', op: 'UNION' }],
    ['null', '❓ NULL logic', 'TRUE / FALSE / UNKNOWN and why = NULL fails', { type: 'null' }],
    ['keys', '🔑 Primary & foreign keys', 'How tables point at each other', { type: 'keys' }],
    ['er', '🗺 ER diagram', 'Interactive schema: keys, cardinality, join paths', { type: 'er' }],
    ['correlated', '🪆 Correlated subquery', 'Inner query re-evaluated per outer row', { type: 'correlated' }],
    ['recursive', '🌳 Recursive CTE', 'Build a hierarchy level by level', { type: 'recursive' }],
    ['index', '📇 Indexes', 'B-tree seek vs full table scan', { type: 'index' }],
    ['explain', '🧭 Execution plans', 'Real EXPLAIN QUERY PLAN, before/after an index', { type: 'explain', sql: 'SELECT c.cpt_code, SUM(c.amount) FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id WHERE c.practitioner_id = 3 GROUP BY c.cpt_code', index: 'CREATE INDEX idx_charges_prac ON charges(practitioner_id)' }],
    ['txn', '🔒 Transactions', 'COMMIT, ROLLBACK, isolation anomalies, deadlocks', { type: 'txn', scenario: 'dirty' }],
    ['dml', '✏️ INSERT / UPDATE / DELETE', 'Before → after with changes highlighted', { type: 'dml', statement: "UPDATE invoices SET status = 'Paid' WHERE status = 'Partially Paid' AND invoice_id < 20", view: 'SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id < 20', key: 'invoice_id' }],
  ];
  function visualizer(sel) {
    const pick = HUB.find((x) => x[0] === sel) || null;
    const stage = h('div', { class: 'hub-stage' });
    const el = h('div', { class: 'page' },
      h('div', { class: 'crumbs' }, 'SQL › ', h('b', null, 'Visual SQL Explainer')),
      h('h1', null, '🎬 Visual SQL Explainer'),
      h('p', { class: 'muted' }, 'See exactly what SQL does to the data. Pick a concept, or paste your own query to step through it clause by clause.'),
      h('div', { class: 'hub-grid' }, HUB.map(([k, t, d]) => h('a', { class: 'hub-card card' + (pick && pick[0] === k ? ' active' : ''), href: `#/visualizer/${k}` }, h('b', null, t), h('span', { class: 'muted small' }, d)))),
      stage);
    if (pick) {
      if (pick[0] === 'txn') {
        const box = h('div');
        const draw = (s) => { box.innerHTML = ''; box.appendChild(Visuals.render({ type: 'txn', scenario: s })); };
        stage.append(h('div', { class: 'seg' }, ['commit', 'rollback', 'savepoint', 'dirty', 'nonrepeatable', 'phantom', 'lostupdate', 'deadlock'].map((s) => h('button', { class: 'seg-btn' + (s === 'dirty' ? ' active' : ''), onclick: (e) => { e.target.parentNode.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active')); e.target.classList.add('active'); draw(s); } }, s))), box);
        draw('dirty');
      } else stage.appendChild(Visuals.render(pick[3], { sql: pick[3].sql }));
    } else {
      const ed = UI.editor({ value: "SELECT p.city, COUNT(*) AS invoices, SUM(i.total_amount) AS billed\nFROM invoices i\nJOIN patients p ON p.patient_id = i.patient_id\nWHERE i.status IN ('Paid', 'Partially Paid')\nGROUP BY p.city\nHAVING COUNT(*) >= 2\nORDER BY billed DESC;", minLines: 7, onRun: () => go() });
      App.activeEditor = ed;
      const out = h('div');
      const go = () => { out.innerHTML = ''; out.appendChild(Visuals.render({ type: 'order' }, { sql: ed.value })); };
      stage.append(h('div', { class: 'card' }, h('div', { class: 'card-hd' }, h('h2', null, 'Step through your own query'), h('span', { class: 'muted small' }, 'Ctrl+Enter to run')), ed.el, h('div', { class: 'row' }, h('button', { class: 'btn', onclick: go }, '▶ Visualize'))), out);
      go();
    }
    return el;
  }

  // ---------------- Router ----------------
  function route() {
    const hash = location.hash || '#/';
    const [, page, arg] = hash.split('/');
    const m = main();
    m.innerHTML = '';
    m.scrollTop = 0;
    window.scrollTo(0, 0);
    document.body.classList.remove('show-sidebar');
    document.body.dataset.page = page || 'home';
    let view;
    try {
      switch (page) {
        case 'learn': view = LessonView.render(arg || Progress.state.current || C.lessons[0].id); break;
        case 'practice': view = Practice.render(arg); break;
        case 'builder': view = Builder.render(); break;
        case 'interview': view = InterviewView.render(arg); break;
        case 'progress': view = progressPage(); break;
        case 'visualizer': view = visualizer(arg); break;
        default: view = dashboard();
      }
    } catch (e) {
      console.error(e);
      view = h('div', { class: 'page' }, h('div', { class: 'err' }, 'Something went wrong rendering this page: ' + e.message));
    }
    m.appendChild(view);
    renderHeader();
    renderSidebar();
  }

  App.refresh = () => route();

  async function boot() {
    document.getElementById('main').innerHTML = '<div class="boot"><div class="spinner"></div><p>Loading the SQL engine…</p></div>';
    renderHeader();
    try { await DB.init(); } catch (e) {
      document.getElementById('main').innerHTML = `<div class="page"><div class="err">Could not start the SQLite engine: ${esc(e.message)}</div></div>`;
      return;
    }
    if (window.innerWidth < 1280) document.body.classList.add('hide-explorer');
    renderExplorer();
    Progress.onChange(() => renderHeader());
    window.addEventListener('hashchange', route);
    route();
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
