// Interview mode: categories, question types (mcq / predict / write / debug / scenario), timed challenge.
(function () {
  const { h, esc, code } = UI;
  const CATS = ['Fundamentals', 'Joins', 'Subqueries', 'CTEs', 'Window Functions', 'Aggregations', 'Performance', 'Database Design', 'Transactions', 'Real-World Problems', 'Security & Admin'];
  const CAT_IC = { Fundamentals: '🔤', Joins: '🔗', Subqueries: '🪆', CTEs: '🧱', 'Window Functions': '🪟', Aggregations: '📊', Performance: '🚀', 'Database Design': '📐', Transactions: '🔒', 'Real-World Problems': '🏥', 'Security & Admin': '🛡️' };
  const TYPE = { mcq: '☑ Multiple choice', predict: '🔮 Predict the output', write: '✍️ Write the query', debug: '🐞 Debug the query', scenario: '🎭 Interview scenario' };
  const bank = () => window.InterviewBank || [];
  const md = (s) => esc(s || '').replace(/`([^`]+)`/g, '<code>$1</code>');
  let timed = null; // { ids, i, answers: {}, end }

  function render(arg) {
    if (arg === 'timed' && timed) return timedView();
    const cat = arg && decodeURIComponent(arg);
    if (cat && CATS.includes(cat)) return categoryView(cat, 0);
    return home();
  }

  function home() {
    const st = Progress.state.interview;
    return h('div', { class: 'page' },
      h('div', { class: 'crumbs' }, 'SQL › ', h('b', null, 'Interview Mode')),
      h('h1', null, '💼 SQL Interview Mode'),
      h('p', { class: 'muted' }, `${bank().length} questions: multiple-choice, output prediction, query writing, debugging and real interview scenarios. Interview readiness: `, h('b', null, Progress.interviewReadiness() + '%')),
      h('div', { class: 'card timed-card' },
        h('div', null, h('h2', null, '⏱ Timed challenge'), h('p', { class: 'muted small' }, '10 random questions across all categories, 15 minutes. Scored at the end — just like a screening round.')),
        h('div', { class: 'row' }, [5, 10, 15].map((n) => h('button', { class: 'btn' + (n === 10 ? '' : ' ghost'), onclick: () => startTimed(n) }, `${n} questions`)))),
      h('div', { class: 'sec-grid' }, CATS.map((c) => {
        const qs = bank().filter((q) => q.category === c);
        const ok = qs.filter((q) => st[q.id] && st[q.id].correct).length;
        return h('a', { class: 'sec-card card', href: `#/interview/${encodeURIComponent(c)}` },
          h('div', { class: 'sec-top' }, h('span', { class: 'sec-ic' }, CAT_IC[c])), h('b', null, c),
          h('div', { class: 'muted small' }, `${qs.length} questions · ${[...new Set(qs.map((q) => q.type))].map((t) => TYPE[t].split(' ')[0]).join(' ')}`),
          h('div', { class: 'bar' }, h('i', { style: { width: (qs.length ? (ok / qs.length) * 100 : 0) + '%' } })), h('div', { class: 'muted xs' }, `${ok}/${qs.length} answered correctly`));
      })));
  }

  function startTimed(n) {
    const all = [...bank()].sort(() => Math.random() - 0.5);
    // pick a spread across categories
    const pick = [];
    CATS.forEach((c) => { const q = all.find((x) => x.category === c && !pick.includes(x)); if (q) pick.push(q); });
    all.forEach((q) => { if (!pick.includes(q)) pick.push(q); });
    timed = { ids: pick.slice(0, n).sort(() => Math.random() - 0.5).map((q) => q.id), i: 0, answers: {}, end: Date.now() + n * 90 * 1000, done: false };
    if (location.hash === '#/interview/timed') App.refresh && App.refresh(); else location.hash = '#/interview/timed';
  }

  function categoryView(cat, start) {
    const qs = bank().filter((q) => q.category === cat);
    let i = start;
    const holder = h('div');
    const nav = h('div', { class: 'iv-nav' });
    function draw() {
      holder.innerHTML = '';
      holder.appendChild(questionCard(qs[i], { index: i, total: qs.length, onAnswered: drawNav }));
      holder.appendChild(h('div', { class: 'row spread' },
        h('button', { class: 'btn ghost sm', disabled: i === 0, onclick: () => { i--; draw(); } }, '◀ Previous'),
        h('button', { class: 'btn sm', disabled: i === qs.length - 1, onclick: () => { i++; draw(); } }, 'Next ▶')));
      drawNav();
    }
    function drawNav() {
      nav.innerHTML = '';
      qs.forEach((q, k) => { const r = Progress.state.interview[q.id]; nav.appendChild(h('button', { class: 'dot' + (k === i ? ' active' : '') + (r ? (r.correct ? ' ok' : ' bad') : ''), title: TYPE[q.type], onclick: () => { i = k; draw(); } }, k + 1)); });
    }
    draw();
    return h('div', { class: 'page' },
      h('div', { class: 'crumbs' }, 'SQL › ', h('a', { href: '#/interview' }, 'Interview Mode'), ' › ', h('b', null, cat)),
      h('h1', null, CAT_IC[cat], ' ', cat), nav, holder);
  }

  // onAnswered(correct)
  function questionCard(q, { index, total, onAnswered, timedMode = false, prior } = {}) {
    const body = h('div');
    const fb = h('div');
    const done = (ok) => {
      if (!timedMode) Progress.interviewAnswer(q.id, ok, q.category);
      onAnswered && onAnswered(ok);
      if (!timedMode || true) fb.innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><b>${ok ? '✅ Correct!' : '❌ Not quite.'}</b> ${md(q.why)}</div>`;
    };
    if (q.type === 'mcq' || q.type === 'scenario' || q.type === 'predict') {
      if (q.sql) body.appendChild(code(q.sql, { run: false }));
      const opts = h('div', { class: 'quiz-opts' });
      q.options.forEach((o, k) => opts.appendChild(h('button', { class: 'quiz-opt' + (q.type === 'predict' ? ' mono' : ''), disabled: prior !== undefined, onclick: () => {
        [...opts.children].forEach((x, j) => { x.classList.add(j === q.answer ? 'right' : j === k ? 'wrong' : 'dim'); x.disabled = true; });
        done(k === q.answer);
        if (q.type === 'predict' && q.sql) { try { const r = DB.sandbox(q.sql).last; if (r) fb.appendChild(h('div', null, h('div', { class: 'jv-cap' }, 'Actual output'), UI.table(r, { compact: true, max: 20 }))); } catch (e) { /* ignore */ } }
      } }, h('span', { class: 'quiz-letter' }, 'ABCDEF'[k]), h('span', { html: md(String(o)) }))));
      body.appendChild(opts);
    } else {
      body.appendChild(Practice.challengeBox({
        key: 'interview:' + q.id, prompt: q.q, level: q.difficulty, solution: q.solution, hints: q.hints, ordered: q.ordered, topic: 'iv:' + q.category,
        starter: q.type === 'debug' ? q.sql : '-- Write your answer\nSELECT ', debugSql: q.type === 'debug' ? q.sql : null, explain: md(q.why), compactHeader: true,
        onSolved: () => done(true),
      }));
    }
    return h('div', { class: 'card iv-q' },
      h('div', { class: 'row wrap' }, h('span', { class: 'badge' }, TYPE[q.type]), UI.levelBadge(q.difficulty), h('span', { class: 'badge' }, CAT_IC[q.category] + ' ' + q.category), total ? h('span', { class: 'muted xs' }, `Question ${index + 1} of ${total}`) : null),
      q.type === 'write' || q.type === 'debug' ? null : h('div', { class: 'iv-text', html: md(q.q) }),
      body, fb);
  }

  function timedView() {
    const T = timed;
    const clock = h('span', { class: 'iv-clock' });
    const holder = h('div');
    const tick = setInterval(() => {
      if (!document.body.contains(clock)) return clearInterval(tick);
      const left = Math.max(0, T.end - Date.now());
      clock.textContent = `⏱ ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
      clock.classList.toggle('low', left < 60000);
      if (!left && !T.done) finish();
    }, 500);
    function finish() { T.done = true; draw(); }
    function draw() {
      holder.innerHTML = '';
      if (T.done) { holder.appendChild(summary()); return; }
      const q = bank().find((x) => x.id === T.ids[T.i]);
      holder.appendChild(questionCard(q, { index: T.i, total: T.ids.length, timedMode: true, onAnswered: (ok) => {
        if (T.answers[q.id] === undefined) { T.answers[q.id] = ok; Progress.interviewAnswer(q.id, ok, q.category); }
      } }));
      holder.appendChild(h('div', { class: 'row spread' },
        h('button', { class: 'btn ghost sm', onclick: () => { if (T.answers[q.id] === undefined) T.answers[q.id] = false; next(); } }, 'Skip'),
        h('button', { class: 'btn sm', onclick: next }, T.i === T.ids.length - 1 ? 'Finish ✔' : 'Next question ▶')));
    }
    function next() { if (T.i < T.ids.length - 1) { T.i++; draw(); } else finish(); }
    function summary() {
      const ok = T.ids.filter((id) => T.answers[id]).length;
      const pct = Math.round((ok / T.ids.length) * 100);
      return h('div', { class: 'card' },
        h('h2', null, pct >= 80 ? '🏆 Excellent!' : pct >= 50 ? '👍 Good effort!' : '📚 Keep practicing!'),
        h('div', { class: 'big-score' }, `${ok} / ${T.ids.length}`, h('span', { class: 'muted small' }, ` · ${pct}%`)),
        h('table', { class: 'rt compact' }, h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, 'Category'), h('th', null, 'Type'), h('th', null, 'Result'))),
          h('tbody', null, T.ids.map((id, k) => { const q = bank().find((x) => x.id === id); return h('tr', { class: T.answers[id] ? 'keep' : 'drop' }, h('td', null, k + 1), h('td', null, q.category), h('td', null, TYPE[q.type]), h('td', null, T.answers[id] ? '✔ correct' : T.answers[id] === false ? '✘ wrong / skipped' : '— unanswered')); }))),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => startTimed(T.ids.length) }, '↻ New timed round'), h('a', { class: 'btn ghost', href: '#/interview' }, 'Back to categories')));
    }
    draw();
    return h('div', { class: 'page' },
      h('div', { class: 'crumbs' }, 'SQL › ', h('a', { href: '#/interview' }, 'Interview Mode'), ' › ', h('b', null, 'Timed challenge')),
      h('div', { class: 'row spread' }, h('h1', null, '⏱ Timed challenge'), clock), holder);
  }

  window.InterviewView = { render };
})();
