// Lesson page: the 14-part lesson structure.
(function () {
  const { h, esc, table, code } = UI;
  const C = Curriculum;
  const SECTIONS = [
    ['goals', '🎯', 'What You Will Learn'], ['concept', '🧠', 'Concept'], ['analogy', '🌎', 'Real-World Analogy'], ['data', '📊', 'Example Data'],
    ['syntax', '💻', 'SQL Syntax'], ['breakdown', '🔍', 'Query Breakdown'], ['visual', '🎬', 'Visual Execution'], ['result', '📋', 'Result'],
    ['mistakes', '⚠️', 'Common Mistakes'], ['rules', '💡', 'Important Rules'], ['try', '🧪', 'Try It Yourself'], ['challenge', '🎯', 'Practice Challenge'],
    ['quiz', '📝', 'Quick Quiz'], ['next', '➡️', 'Next Concept'],
  ];

  function fallback(meta) {
    const sec = C.sectionByKey[meta.section];
    return { concept: `<p><b>${esc(meta.title)}</b> is part of <i>${esc(sec.title)}</i>. Explore it hands-on with the sample database below.</p>`, sql: 'SELECT * FROM invoices LIMIT 5;', goals: [`Understand ${meta.title}`] };
  }

  function section(key, n, icon, title, ...body) {
    const kids = body.flat().filter(Boolean);
    if (!kids.length) return null;
    return h('section', { class: 'ls card', id: 'ls-' + key },
      h('div', { class: 'ls-hd' }, h('span', { class: 'ls-n' }, n), h('span', { class: 'ls-ic' }, icon), h('h2', null, title)), ...kids);
  }
  const para = (html) => (html ? h('div', { class: 'prose', html }) : null);
  const infoBox = (icon, label, text) => (text ? h('div', { class: 'qbox' }, h('div', { class: 'qbox-l' }, icon, ' ', label), h('div', { class: 'prose', html: text })) : null);

  function runSql(sql) {
    try { const r = DB.sandbox(sql); return r.last ? table(r.last, { compact: true, max: 50 }) : h('div', { class: 'fb good' }, `✔ Statement ran — ${r.changes} row(s) affected (sandboxed).`); }
    catch (e) { return h('div', { class: 'err' }, '❌ ' + e.message); }
  }

  function render(id) {
    const meta = C.byId[id] || C.lessons[0];
    id = meta.id;
    Progress.setCurrent(id);
    const L = Lessons.get(id) || fallback(meta);
    const sec = C.sectionByKey[meta.section];
    const idx = meta.order;
    const prev = C.lessons[idx - 1], next = C.lessons[idx + 1];
    const runnable = !L.dialect;
    const missingPrereq = sec.prereq.filter((p) => Progress.sectionStats(C.sectionByKey[p]).pct < 0.5);
    const doneBtn = () => h('button', { class: 'btn ' + (Progress.isDone(id) ? 'ghost' : ''), onclick: (e) => { Progress.isDone(id) ? Progress.uncomplete(id) : Progress.complete(id); e.target.replaceWith(doneBtn()); } }, Progress.isDone(id) ? '✔ Completed' : '☐ Mark as complete');

    // ----- 1. goals
    const goals = section('goals', 1, '🎯', 'What You Will Learn', L.goals ? h('ul', { class: 'goals' }, L.goals.map((g) => h('li', { html: g }))) : null);
    // ----- 2. concept (+ the "9 questions")
    const concept = section('concept', 2, '🧠', 'Concept', para(L.concept),
      h('div', { class: 'qgrid' }, infoBox('❓', 'Why does it exist?', L.why), infoBox('🕐', 'When should I use it?', L.when), infoBox('⚙️', 'How does it work internally?', L.internals)),
      L.compare ? h('details', { class: 'more', open: true }, h('summary', null, '⚖️ How it compares with related concepts'), para(L.compare)) : null,
      L.deep ? h('details', { class: 'more adv' }, h('summary', null, '🔬 Advanced note'), para(L.deep)) : null);
    // ----- 3. analogy
    const analogy = section('analogy', 3, '🌎', 'Real-World Analogy', L.analogy ? h('div', { class: 'analogy', html: L.analogy }) : null,
      L.realWorld ? h('div', { class: 'qbox' }, h('div', { class: 'qbox-l' }, '🏥 Where it is used in real applications'), h('div', { class: 'prose', html: L.realWorld })) : null);
    // ----- 4. example data
    let dataKids = [];
    if (L.exampleSql) dataKids = [code(L.exampleSql, { label: 'Example data query' }), runSql(L.exampleSql)];
    else if (L.exampleTables) dataKids = L.exampleTables.map((t) => h('div', null, h('div', { class: 'jv-cap' }, '▦ ', t), runSql(`SELECT * FROM ${t} LIMIT 8`)));
    const data = section('data', 4, '📊', 'Example Data', dataKids);
    // ----- 5. syntax
    const syn = [];
    if (L.syntax) syn.push(code(L.syntax, { run: false, label: 'Syntax' }));
    if (L.dialectSql) {
      const ds = Object.entries(L.dialectSql);
      syn.push(h('div', { class: 'jv-cap' }, '🗂️ Across databases'), UI.tabs(ds.map(([d, s]) => ({ label: UI.dialectName(d), render: () => code(s, { run: d === 'sqlite', dialect: d === 'sqlite' ? null : d, label: UI.dialectName(d) }) }))));
    }
    const syntax = section('syntax', 5, '💻', 'SQL Syntax', syn);
    // ----- 6. breakdown
    const bd = L.sql ? [code(L.sql, { dialect: L.dialect, label: L.dialect ? null : 'Example query', run: runnable }),
      L.breakdown ? h('div', { class: 'breakdown' }, L.breakdown.map(([part, text], i) => h('div', { class: 'bd-row', style: { '--gc': UI.groupColor(i) } }, h('pre', { class: 'code inline', html: UI.highlight(part) }), h('div', { class: 'bd-tx', html: text })))) : null] : [];
    const breakdown = section('breakdown', 6, '🔍', 'Query Breakdown', bd);
    // ----- 7. visual (lazy: rendered when scrolled into view)
    const visHolder = h('div', { class: 'vis-holder' }, h('div', { class: 'muted small' }, 'Loading visual…'));
    let visSpec = L.visual;
    if (!visSpec && runnable && L.sql && /^\s*(WITH|SELECT)\b/i.test(L.sql)) visSpec = { type: 'stages' };
    const visual = visSpec ? section('visual', 7, '🎬', 'Visual Execution', visHolder) : null;
    // ----- 8. result
    const result = section('result', 8, '📋', 'Result', L.sql ? (runnable ? [h('p', { class: 'muted small' }, 'Output of the example query, run live on the sample database:'), runSql(L.sql)]
      : h('div', { class: 'note' }, `ℹ️ This example uses ${UI.dialectName(L.dialect)} syntax, which the in-browser SQLite engine can't run. The Try It and Challenge sections below use the SQLite equivalent.`)) : null);
    // ----- 9. mistakes
    const mistakes = section('mistakes', 9, '⚠️', 'Common Mistakes', (L.mistakes || []).map((m, i) => {
      const out = h('div');
      return h('div', { class: 'mistake' },
        h('div', { class: 'mk-col bad' }, h('div', { class: 'mk-l' }, '❌ Wrong'), code(m.wrong, { run: false }),
          runnable && !m.fixDialect && looksLikeSql(m.wrong) ? h('button', { class: 'btn xs ghost', onclick: () => { out.innerHTML = ''; out.appendChild(tryWrong(m.wrong)); } }, '▶ See what happens') : null, out),
        h('div', { class: 'mk-why', html: '🤔 ' + m.why }),
        m.fix ? h('div', { class: 'mk-col good' }, h('div', { class: 'mk-l' }, '✅ Correct'), code(m.fix, { run: runnable && !m.fixDialect })) : null);
    }));
    // ----- 10. rules
    const rules = section('rules', 10, '💡', 'Important Rules', L.rules ? h('ul', { class: 'rules' }, L.rules.map((r) => h('li', { html: r }))) : null,
      L.tips ? h('div', { class: 'tips' }, L.tips.map((t) => h('div', { class: 'tip', html: '🌱 <b>Beginner tip:</b> ' + t }))) : null);
    // ----- 11. try it
    let tryEl = null;
    if (L.tryIt || (runnable && L.sql)) {
      const starter = (L.tryIt && L.tryIt.starter) || L.sql;
      const out = h('div');
      const ed = UI.editor({ value: starter, minLines: 5, onRun: () => go() });
      const go = () => { out.innerHTML = ''; try { const r = DB.sandbox(ed.value); Progress.logQuery(ed.value, true); out.appendChild(r.last ? table(r.last, { compact: true, max: 100 }) : h('div', { class: 'fb good' }, `✔ ${r.changes} row(s) affected (sandboxed — reset automatically).`)); } catch (e) { Progress.logQuery(ed.value, false); out.appendChild(Practice.feedbackCard(Practice.explainError(e.message, ed.value, DB.schema()), {})); } };
      tryEl = section('try', 11, '🧪', 'Try It Yourself', L.tryIt && L.tryIt.prompt ? h('div', { class: 'ch-prompt', html: '✍️ ' + L.tryIt.prompt }) : h('div', { class: 'ch-prompt' }, '✍️ Edit the query and run it. Experiment — change columns, filters and sorting!'),
        ed.el, h('div', { class: 'row' }, h('button', { class: 'btn', onclick: go }, '▶ Run'), h('button', { class: 'btn ghost', onclick: () => { ed.value = starter; out.innerHTML = ''; } }, '↺ Reset'), h('button', { class: 'btn ghost', onclick: () => App.openInPlayground(ed.value) }, '🧪 Open in playground'), h('span', { class: 'muted xs' }, 'Ctrl+Enter to run')), out);
      ed.el.addEventListener('focusin', () => (App.activeEditor = ed));
    }
    // ----- 12. challenge
    const challenge = L.challenge ? section('challenge', 12, '🎯', 'Practice Challenge', Practice.challengeBox({
      key: 'lesson:' + id, title: meta.title, prompt: L.challenge.prompt, level: L.challenge.level || 1, solution: L.challenge.solution, hints: L.challenge.hints,
      ordered: L.challenge.ordered, topic: sec.key, starter: L.challenge.starter, explain: L.challenge.explain, mode: L.challenge.mode, check: L.challenge.check, buggy: L.challenge.buggy,
      onSolved: () => { Progress.complete(id); } })) : null;
    // ----- 13. quiz
    const quiz = L.quiz && L.quiz.length ? section('quiz', 13, '📝', 'Quick Quiz', L.quiz.map((qz, qi) => quizItem(qz, `${id}#${qi}`, qi))) : null;
    // ----- 14. next
    const nextSec = section('next', 14, '➡️', 'Next Concept',
      h('div', { class: 'next-row' },
        prev ? h('a', { class: 'next-card', href: `#/learn/${prev.id}` }, h('span', { class: 'muted xs' }, '◀ Previous'), h('b', null, prev.title)) : h('span'),
        h('div', { class: 'next-mid' }, doneBtn()),
        next ? h('a', { class: 'next-card right', href: `#/learn/${next.id}`, onclick: () => Progress.complete(id) }, h('span', { class: 'muted xs' }, 'Next ▶ (marks this complete)'), h('b', null, next.title), h('span', { class: 'muted xs' }, C.sectionByKey[next.section].title)) : h('a', { class: 'next-card right', href: '#/interview' }, h('b', null, '🎉 Course finished — try Interview Mode'))));

    const parts = [goals, concept, analogy, data, syntax, breakdown, visual, result, mistakes, rules, tryEl, challenge, quiz, nextSec];
    const toc = h('nav', { class: 'toc', 'aria-label': 'Lesson sections' }, SECTIONS.map(([k, ic, t], i) => (parts[i] ? h('a', { href: '#', onclick: (e) => { e.preventDefault(); document.getElementById('ls-' + k).scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, h('span', null, ic), ' ', t) : null)));

    const page = h('div', { class: 'page lesson' },
      h('div', { class: 'crumbs' }, 'SQL › ', h('a', { href: `#/learn/${sec.ids[0]}` }, `${sec.num} · ${sec.title}`), meta.group ? ` › ${meta.group}` : '', ' › ', h('b', null, meta.title)),
      h('header', { class: 'lesson-hd' },
        h('div', null,
          h('div', { class: 'eyebrow' }, `${sec.icon} ${sec.title} · Lesson ${meta.n} of ${sec.ids.length}`),
          h('h1', null, meta.title),
          h('div', { class: 'row wrap' }, UI.levelBadge({ Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 }[sec.level]), h('span', { class: 'badge' }, `⏱ ~${C.MIN_PER_LESSON} min`),
            L.dialect ? h('span', { class: 'badge dialect' }, '🗂️ ' + UI.dialectName(L.dialect)) : h('span', { class: 'badge' }, '▶ Runnable'), visSpec ? h('span', { class: 'badge' }, '🎬 Interactive visual') : null)),
        doneBtn()),
      missingPrereq.length ? h('div', { class: 'note' }, '🧭 Recommended first: ', missingPrereq.map((p, i) => [i ? ', ' : '', h('a', { href: `#/learn/${C.sectionByKey[p].ids[0]}` }, C.sectionByKey[p].title)]), '. You can continue anyway!') : null,
      h('div', { class: 'lesson-grid' }, h('div', { class: 'lesson-body' }, parts), h('aside', { class: 'lesson-toc' }, toc)));

    if (visual) {
      const io = new IntersectionObserver((ents) => {
        if (ents.some((e) => e.isIntersecting)) {
          io.disconnect();
          visHolder.innerHTML = '';
          const v = Visuals.render(visSpec, L);
          if (v) visHolder.appendChild(v);
        }
      }, { rootMargin: '400px' });
      requestAnimationFrame(() => io.observe(visHolder));
    }
    return page;
  }

  // Mistake examples can be app code (Python, JS...); only offer to run real SQL.
  const looksLikeSql = (s) => /^\s*(--[^\n]*\n\s*)*(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|BEGIN|PRAGMA|REPLACE|VALUES|EXPLAIN|SAVEPOINT|ROLLBACK|COMMIT)\b/i.test(s);

  function tryWrong(sql) {
    try {
      const r = DB.sandbox(sql);
      return h('div', null, h('div', { class: 'muted small' }, 'It runs — but look at the result carefully:'), r.last ? table(r.last, { compact: true, max: 15 }) : h('div', { class: 'muted small' }, `${r.changes} row(s) affected`));
    } catch (e) { return Practice.feedbackCard(Practice.explainError(e.message, sql, DB.schema()), {}); }
  }

  function quizItem(qz, key, qi) {
    const prev = Progress.state.quiz[key];
    const fb = h('div', { class: 'quiz-fb' });
    const opts = h('div', { class: 'quiz-opts' });
    qz.options.forEach((o, i) => {
      const b = h('button', { class: 'quiz-opt', onclick: () => {
        if (opts.dataset.done) return;
        opts.dataset.done = '1';
        const ok = i === qz.answer;
        [...opts.children].forEach((x, j) => { x.classList.add(j === qz.answer ? 'right' : j === i ? 'wrong' : 'dim'); x.disabled = true; });
        fb.innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><b>${ok ? '✅ Correct!' : '❌ Not quite.'}</b> ${qz.why || ''}</div>`;
        Progress.quizAnswer(key, ok);
      } }, h('span', { class: 'quiz-letter' }, 'ABCDEF'[i]), h('span', { html: esc(o).replace(/`([^`]+)`/g, '<code>$1</code>') }));
      opts.appendChild(b);
    });
    return h('div', { class: 'quiz' }, h('div', { class: 'quiz-q' }, h('b', null, `Q${qi + 1}. `), h('span', { html: esc(qz.q).replace(/`([^`]+)`/g, '<code>$1</code>') })), qz.sql ? code(qz.sql, { run: false }) : null, opts, fb,
      prev && prev.done ? h('div', { class: 'muted xs' }, `Previously answered ${prev.correct ? 'correctly ✔' : 'incorrectly'}`) : null);
  }

  window.LessonView = { render, quizItem };
})();
