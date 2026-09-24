// Practice mode: playground, auto-graded challenges, hints, mistake explainer.
(function () {
  const { h, esc, table, code, toast } = UI;

  // ---------------- Mistake explainer ----------------
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function closest(name, list) {
    const n = name.toLowerCase().replace(/^.*\./, '');
    const best = list.map((x) => [x, lev(n, x.toLowerCase())]).sort((a, b) => a[1] - b[1])[0];
    return best && best[1] <= Math.max(2, n.length / 3) ? best[0] : null;
  }
  const FN_MAP = {
    NOW: "SQLite uses <code>datetime('now')</code> or <code>date('now')</code>.", GETDATE: "SQLite uses <code>datetime('now')</code>.", CURDATE: "SQLite uses <code>date('now')</code>.",
    YEAR: "SQLite uses <code>strftime('%Y', col)</code>.", MONTH: "SQLite uses <code>strftime('%m', col)</code>.", DAY: "SQLite uses <code>strftime('%d', col)</code>.",
    DATEDIFF: 'SQLite uses <code>julianday(a) - julianday(b)</code>.', DATE_ADD: "SQLite uses <code>date(col, '+30 days')</code>.", DATEADD: "SQLite uses <code>date(col, '+30 days')</code>.",
    LEFT: 'SQLite uses <code>substr(col, 1, n)</code>.', RIGHT: 'SQLite uses <code>substr(col, -n)</code>.', LEN: 'SQLite uses <code>length(col)</code>.',
    ISNULL: 'SQLite uses <code>IFNULL(a, b)</code> or <code>COALESCE(a, b)</code>.', NVL: 'SQLite uses <code>IFNULL(a, b)</code> or <code>COALESCE(a, b)</code>.',
    STRING_AGG: 'SQLite uses <code>group_concat(col, \', \')</code>.', LISTAGG: 'SQLite uses <code>group_concat(col, \', \')</code>.',
    STDDEV: 'SQLite has no STDDEV — compute it from AVG(x*x) - AVG(x)*AVG(x).', REGEXP: 'SQLite has no built-in REGEXP — use LIKE or GLOB.', TO_CHAR: "SQLite uses <code>strftime(format, col)</code>.",
    TOP: 'SQLite uses <code>LIMIT n</code> at the end of the query instead of TOP.',
  };
  function explainError(msg, sql, schema) {
    const tables = schema.map((t) => t.name);
    const cols = [...new Set(schema.flatMap((t) => t.columns.map((c) => c.name)))];
    let m;
    const r = (title, what, why, fix, remember) => ({ title, what, why, fix, remember });
    if ((m = msg.match(/no such column: ([\w."]+)/i))) {
      const col = m[1].replace(/"/g, '');
      const aliasRe = new RegExp(`\\bAS\\s+${col.replace(/^.*\./, '')}\\b`, 'i');
      if (aliasRe.test(sql) && /\bWHERE\b/i.test(sql))
        return r('Column alias used too early', `<code>${esc(col)}</code> is an alias you defined in SELECT, but you used it in WHERE (or GROUP BY/HAVING in some databases).`,
          'SQL evaluates <b>FROM → WHERE → GROUP BY → HAVING → SELECT</b>. When WHERE runs, the SELECT aliases do not exist yet.',
          'Repeat the full expression in WHERE, or wrap the query in a subquery/CTE and filter on the alias outside.', 'Aliases from SELECT can be used in ORDER BY — not in WHERE.');
      const sug = closest(col, cols);
      const tbl = col.includes('.') ? col.split('.')[0] : null;
      return r('Unknown column', `The column <code>${esc(col)}</code> does not exist in the tables of your FROM clause.`,
        tbl ? `Check that <code>${esc(tbl)}</code> is a table/alias in FROM and that it really has this column.` : 'It may be a typo, a column from a table you did not join, or a string that needs single quotes.',
        sug ? `Did you mean <code>${esc(sug)}</code>? Use the Database Explorer (right) to check column names.` : "Open the Database Explorer to see each table's columns. Text values need 'single quotes'.",
        "Text in 'single quotes' is a value; bare words are column names.");
    }
    if ((m = msg.match(/no such table: ([\w.]+)/i))) {
      const sug = closest(m[1], tables);
      return r('Unknown table', `There is no table called <code>${esc(m[1])}</code>.`, 'Table names must match exactly. This database uses plural snake_case names.',
        sug ? `Did you mean <code>${esc(sug)}</code>?` : `Available tables: ${tables.map((t) => `<code>${t}</code>`).join(', ')}.`, 'Check the Database Explorer for exact table names.');
    }
    if ((m = msg.match(/ambiguous column name: ([\w.]+)/i)))
      return r('Ambiguous column', `More than one table in your FROM/JOIN has a column named <code>${esc(m[1])}</code>, so SQL cannot know which one you mean.`,
        'After a JOIN, columns like <code>patient_id</code> exist in both tables.', `Prefix it with the table or alias: <code>i.${esc(m[1])}</code> or <code>p.${esc(m[1])}</code>.`, 'When joining, always qualify columns with table aliases.');
    if (/misuse of aggregate/i.test(msg) || /aggregate functions are not allowed in the GROUP BY/i.test(msg))
      return r('Aggregate in the wrong clause', 'You used an aggregate like COUNT/SUM/AVG in WHERE (or GROUP BY).',
        'WHERE filters individual rows <b>before</b> groups exist, so there is nothing to aggregate yet.', 'Move the aggregate condition into <code>HAVING</code>, which runs after GROUP BY.', 'WHERE filters rows; HAVING filters groups.');
    if (/misuse of window function/i.test(msg))
      return r('Window function in WHERE', 'Window functions (ROW_NUMBER, RANK, LAG…) cannot be used in WHERE, GROUP BY or HAVING.',
        'They are computed in the SELECT step — after WHERE has already run.', 'Compute it in a CTE or subquery, then filter in the outer query: <code>WITH r AS (SELECT …, ROW_NUMBER() OVER (…) AS rn …) SELECT * FROM r WHERE rn = 1</code>', 'To filter on a window result, wrap it in a CTE.');
    if (/do not have the same number of result columns/i.test(msg))
      return r('Set operation column mismatch', 'The queries on each side of UNION/INTERSECT/EXCEPT return a different number of columns.', 'Set operations stack rows vertically, so every query must have the same shape.', 'Make both SELECT lists have the same number of columns (and compatible types).', 'Same number of columns, same order, compatible types.');
    if ((m = msg.match(/sub-select returns (\d+) columns - expected 1/i)))
      return r('Subquery returns too many columns', `A subquery used as a single value (or with IN) returned ${m[1]} columns.`, 'A comparison like <code>x IN (subquery)</code> needs exactly one column.', 'Select only one column in the subquery.', 'Scalar and IN subqueries return exactly one column.');
    if ((m = msg.match(/no such function: (\w+)/i))) {
      const f = m[1].toUpperCase();
      return r('Function not available', `<code>${esc(m[1])}</code> is not a SQLite function.`, 'Every database has its own dialect. This playground runs SQLite.', FN_MAP[f] || 'Check the SQLite function list, or see the Database-Specific SQL section.', 'Functions differ between MySQL, PostgreSQL, SQL Server, Oracle and SQLite.');
    }
    if (/incomplete input/i.test(msg)) return r('Unfinished query', 'SQL reached the end of your text while still expecting more.', 'Usually an unclosed parenthesis, an unclosed \'quote\', or a clause without its content.', 'Check that every ( has a ) and every \' has a closing \'.', 'Balance your quotes and parentheses.');
    if (/FOREIGN KEY constraint failed/i.test(msg)) return r('Foreign key violation', 'You tried to reference a row that does not exist (or delete a row that others still reference).', 'Foreign keys guarantee every reference points to a real parent row.', 'Insert the parent row first, or reference an existing id. Delete child rows before the parent.', 'Foreign keys prevent orphan rows.');
    if ((m = msg.match(/UNIQUE constraint failed: ([\w.]+)/i))) return r('Duplicate value', `<code>${esc(m[1])}</code> must be unique, and the value already exists.`, 'Primary keys and UNIQUE columns cannot contain duplicates.', 'Use a different value, or an UPSERT (<code>ON CONFLICT … DO UPDATE</code>).', 'Primary keys uniquely identify a row.');
    if ((m = msg.match(/NOT NULL constraint failed: ([\w.]+)/i))) return r('Missing required value', `<code>${esc(m[1])}</code> is required (NOT NULL) but no value was given.`, 'The schema says this column must always have a value.', 'Include the column in your INSERT column list with a value.', 'NOT NULL columns must be supplied.');
    if (/CHECK constraint failed/i.test(msg)) return r('CHECK constraint violated', 'The value breaks a rule defined on the table (e.g. allowed status values).', 'CHECK constraints keep invalid data out.', 'Use one of the allowed values — see the table definition.', 'Constraints protect data quality.');
    if ((m = msg.match(/near "([^"]+)": syntax error/i))) {
      const tok = m[1];
      const s = sql.replace(/\s+/g, ' ');
      let tip = `SQL got confused right before or at <code>${esc(tok)}</code>.`;
      let fix = 'Look closely at the text just before that word.';
      if (/,\s*FROM\b/i.test(s)) fix = 'You have a <b>comma right before FROM</b> — remove the trailing comma after the last column.';
      else if (/^(FROM|WHERE|GROUP|ORDER|HAVING)$/i.test(tok) && /\bSELECT\s*(FROM|$)/i.test(s)) fix = 'SELECT needs at least one column (or *).';
      else if (/\bGROUP BY\b[\s\S]*\bWHERE\b/i.test(s)) fix = 'Clauses are in the wrong order. The order is: <code>SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT</code>.';
      else if (/\bORDER BY\b[\s\S]*\b(WHERE|GROUP BY|HAVING)\b/i.test(s)) fix = 'ORDER BY must come after WHERE / GROUP BY / HAVING.';
      else if (/\bLIMIT\b[\s\S]*\bORDER BY\b/i.test(s)) fix = 'LIMIT goes after ORDER BY.';
      else if (/^TOP$/i.test(tok) || /\bSELECT TOP\b/i.test(s)) fix = FN_MAP.TOP;
      else if (/\w\s+\w+\s*,/.test(tok) || /[A-Za-z_]\s+[A-Za-z_]+\s+FROM/i.test(s)) fix = 'Possibly a <b>missing comma</b> between two columns.';
      else if (/^(from|select|where)$/i.test(tok)) fix = 'Possibly a missing comma, a missing value, or a keyword typo nearby.';
      return r('Syntax error', tip, 'The query does not follow SQL grammar at that point — often a missing comma, a typo in a keyword, a clause in the wrong order, or a missing quote.', fix, 'Clause order: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.');
    }
    return r('The database reported an error', esc(msg), 'Read the message carefully — it usually names the exact problem.', 'Fix the part mentioned and run again.', 'Errors are clues, not failures.');
  }

  function explainWrong(sql, user, expected, cmp, solution) {
    const s = sql.replace(/\s+/g, ' ');
    const sol = (solution || '').replace(/\s+/g, ' ');
    const out = { title: 'Not quite right', what: cmp.reason, why: '', fix: '', remember: '' };
    if (/(=|<>|!=)\s*NULL\b/i.test(s)) { out.title = 'Comparing with NULL'; out.why = '<code>= NULL</code> (and <code>&lt;&gt; NULL</code>) is never TRUE — any comparison with NULL is UNKNOWN, so those rows are filtered out.'; out.fix = 'Use <code>IS NULL</code> or <code>IS NOT NULL</code>.'; out.remember = 'NULL means "unknown" — test it with IS NULL.'; }
    else if (cmp.colMismatch) { out.title = 'Wrong columns'; out.why = `The expected result has the columns: ${expected.columns.map((c) => `<code>${esc(c)}</code>`).join(', ')}.`; out.fix = 'Select exactly the requested columns, in that order.'; out.remember = 'SELECT decides the shape of the result.'; }
    else if (cmp.orderOnly) { out.title = 'Wrong order'; out.why = 'Your rows are correct but the order is different.'; out.fix = /ORDER BY/i.test(s) ? 'Check the sort column and direction (ASC/DESC), and add a tie-breaker.' : 'Add an <code>ORDER BY</code>. Without it, row order is not guaranteed.'; out.remember = 'No ORDER BY → no guaranteed order.'; }
    else if (/\bNOT IN\s*\(\s*SELECT/i.test(s) && user.rows.length < expected.rows.length) { out.title = 'NOT IN with NULLs'; out.why = 'If the subquery returns any NULL, <code>NOT IN</code> returns no rows at all (x NOT IN (…, NULL) is UNKNOWN).'; out.fix = 'Use <code>NOT EXISTS</code>, or filter NULLs out of the subquery.'; out.remember = 'Prefer NOT EXISTS over NOT IN.'; }
    else if (/\bLEFT JOIN\b/i.test(sol) && !/\bLEFT JOIN\b/i.test(s) && user.rows.length < expected.rows.length) { out.title = 'Rows lost by the JOIN'; out.why = 'An INNER JOIN drops rows that have no match on the other side.'; out.fix = 'Use a <code>LEFT JOIN</code> to keep all rows from the left table.'; out.remember = 'INNER = matches only; LEFT = all left rows.'; }
    else if (/\bLEFT JOIN\b/i.test(s) && /\bWHERE\b/i.test(s) && user.rows.length < expected.rows.length) { out.title = 'WHERE undid your LEFT JOIN'; out.why = 'A WHERE condition on the right-hand table removes the NULL-padded rows, turning the LEFT JOIN into an INNER JOIN.'; out.fix = 'Move that condition into the <code>ON</code> clause.'; out.remember = 'Filter the right table in ON, not WHERE, to keep unmatched rows.'; }
    else if (/\bGROUP BY\b/i.test(sol) && !/\bGROUP BY\b/i.test(s)) { out.title = 'Missing GROUP BY'; out.why = 'The task asks for one row per group (e.g. per status/location/patient).'; out.fix = 'Add <code>GROUP BY</code> on the column that defines each group.'; out.remember = 'One output row per group → GROUP BY.'; }
    else if (/\bDISTINCT\b/i.test(sol) && !/\bDISTINCT\b/i.test(s) && user.rows.length > expected.rows.length) { out.title = 'Duplicates in your result'; out.why = 'Some rows repeat — typically because a JOIN matched several rows.'; out.fix = 'Use <code>DISTINCT</code>, or aggregate.'; out.remember = 'JOINs to a "many" table multiply rows.'; }
    else if (/\bJOIN\b/i.test(s) && /\bSUM\s*\(/i.test(s) && user.rows.length === expected.rows.length) { out.title = 'Numbers are off'; out.why = 'When you JOIN a one-to-many table before SUMming, the "one" side values are repeated and get counted multiple times.'; out.fix = 'Aggregate the "many" table first (in a subquery/CTE), then join.'; out.remember = 'Aggregate before you join to avoid double counting.'; }
    else if (/\bCOUNT\s*\(\s*\w+/i.test(s) && /\bCOUNT\s*\(\s*\*\s*\)/i.test(sol)) { out.title = 'COUNT(column) skips NULLs'; out.why = '<code>COUNT(column)</code> only counts non-NULL values, while <code>COUNT(*)</code> counts rows.'; out.fix = 'Use <code>COUNT(*)</code> to count rows.'; out.remember = 'COUNT(*) counts rows; COUNT(col) counts values.'; }
    else if (user.rows.length > expected.rows.length) { out.why = 'You return more rows than expected — a filter may be missing or too loose (check AND/OR and parentheses).'; out.fix = 'Compare the extra rows below with the task: what makes them not belong?'; out.remember = 'AND binds tighter than OR — use parentheses.'; }
    else if (user.rows.length < expected.rows.length) { out.why = 'You return fewer rows than expected — a filter may be too strict, a JOIN too restrictive, or NULLs excluded.'; out.fix = 'Look at the missing rows below: why did your query exclude them?'; out.remember = 'Check boundaries (>= vs >) and NULLs.'; }
    else { out.why = 'The rows have different values — check calculations, rounding, and which column you aggregate.'; out.fix = 'Compare your values with the expected output.'; out.remember = 'Verify each column against the task wording.'; }
    return out;
  }

  function feedbackCard(fb, { sql, missing, extra, columns, kind = 'bad' } = {}) {
    return h('div', { class: 'fb ' + kind },
      h('div', { class: 'fb-title' }, kind === 'bad' ? '❌ ' : '💡 ', fb.title),
      sql ? h('details', { class: 'fb-sql' }, h('summary', null, 'Your query'), h('pre', { class: 'code', html: UI.highlight(sql) })) : null,
      h('div', { class: 'fb-sec' }, h('b', null, 'What went wrong? '), h('span', { html: fb.what })),
      fb.why ? h('div', { class: 'fb-sec' }, h('b', null, 'Why? '), h('span', { html: fb.why })) : null,
      missing && missing.length ? h('div', { class: 'fb-rows' }, h('div', { class: 'small' }, `Rows expected but missing from yours (${missing.length}):`), table({ columns, rows: missing.slice(0, 8) }, { compact: true, rowClass: () => 'k-missing', footer: false })) : null,
      extra && extra.length ? h('div', { class: 'fb-rows' }, h('div', { class: 'small' }, `Rows in yours that should not be there (${extra.length}):`), table({ columns, rows: extra.slice(0, 8) }, { compact: true, rowClass: () => 'k-extra', footer: false })) : null,
      fb.fix ? h('div', { class: 'fb-sec' }, h('b', null, 'Correct approach: '), h('span', { html: fb.fix })) : null,
      fb.remember ? h('div', { class: 'fb-remember' }, '🧠 Remember: ', fb.remember) : null);
  }

  // ---------------- Challenge component (used by lessons, practice and interview) ----------------
  // cfg: { key, title, prompt, level, solution, hints, ordered, topic, starter, explain, onSolved, compactHeader, debugSql }
  function challengeBox(cfg) {
    const st = Progress.state.challenges[cfg.key];
    const started = Date.now();
    const state = cfg.mode === 'state';
    if (cfg.buggy) { cfg.debugSql = cfg.debugSql || cfg.buggy; cfg.starter = cfg.starter || cfg.buggy; }
    if (state && !cfg.starter) cfg.starter = '-- Write your statement(s) here\n';
    const ed = UI.editor({ value: cfg.starter || '-- Write your query here\nSELECT ', minLines: 6, onRun: () => submit() });
    App.activeEditor = ed;
    const out = h('div', { class: 'ch-out' });
    const hintBox = h('div', { class: 'hints' });
    let shown = 0;
    let expected = null;
    try { expected = state ? DB.stateRun(cfg.solution, cfg.check).check : DB.sandbox(cfg.solution).last; } catch (e) { expected = null; }
    const timer = h('span', { class: 'ch-timer mono small' });
    const tick = setInterval(() => { if (!document.body.contains(timer)) return clearInterval(tick); const s = Math.floor((Date.now() - started) / 1000); timer.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 1000);
    const hintBtn = h('button', { class: 'btn sm ghost', onclick: () => {
      if (shown < (cfg.hints || []).length) {
        hintBox.appendChild(h('div', { class: 'hint', style: { animationDelay: '0ms' } }, h('b', null, `💡 Hint ${shown + 1}`), h('span', { html: ' ' + cfg.hints[shown] })));
        shown++; Progress.hint(cfg.key);
        hintBtn.textContent = shown < cfg.hints.length ? `💡 Hint ${shown + 1}` : '👀 Show solution';
      } else {
        if (!confirm('Reveal the solution? Try once more first — mistakes are how you learn!')) return;
        hintBox.appendChild(h('div', { class: 'hint sol' }, h('b', null, '✅ Solution'), code(cfg.solution), cfg.explain ? h('p', { class: 'small', html: cfg.explain }) : null));
        hintBtn.disabled = true;
      }
    } }, (cfg.hints || []).length ? '💡 Hint 1' : '👀 Show solution');
    function run() {
      out.innerHTML = '';
      const sql = ed.value;
      try {
        if (state) {
          const r = DB.stateRun(sql, cfg.check);
          Progress.logQuery(sql, true);
          out.appendChild(h('div', { class: 'muted small' }, `Your statements ran (${r.changes} row(s) changed by the last one). The check query now returns:`));
          out.appendChild(table(r.check, { compact: true, max: 50 }));
          return r.check;
        }
        const r = DB.sandbox(sql);
        Progress.logQuery(sql, true);
        out.appendChild(r.last ? table(r.last, { compact: true, max: 50 }) : h('div', { class: 'muted small' }, `Statement executed. ${r.changes} row(s) affected (sandboxed — nothing saved).`));
        return r.last;
      } catch (e) {
        Progress.logQuery(sql, false);
        out.appendChild(feedbackCard(explainError(e.message, sql, DB.schema()), { sql }));
        out.appendChild(h('div', { class: 'err small' }, 'SQLite: ' + e.message));
        return undefined;
      }
    }
    function submit() {
      const res = run();
      if (res === undefined) { Progress.attempt(cfg.key, { solved: false, level: cfg.level, topic: cfg.topic }); cfg.onResult && cfg.onResult(false); return; }
      if (!expected) return;
      const cmp = DB.compare(res, expected, state ? cfg.ordered !== false : cfg.ordered);
      const rec = Progress.attempt(cfg.key, { solved: cmp.ok, level: cfg.level, topic: cfg.topic, ms: Date.now() - started });
      if (cmp.ok) {
        out.prepend(h('div', { class: 'fb good' }, h('div', { class: 'fb-title' }, '✅ Correct! '), h('div', null, `Solved in ${rec.attempts} attempt${rec.attempts > 1 ? 's' : ''}.`, cfg.explain ? h('p', { class: 'small', html: cfg.explain }) : null)));
        cfg.onSolved && cfg.onSolved();
        cfg.onResult && cfg.onResult(true);
      } else {
        cfg.onResult && cfg.onResult(false);
        out.prepend(feedbackCard(explainWrong(ed.value, res || { rows: [], columns: [] }, expected, cmp, cfg.solution), { missing: cmp.missing, extra: cmp.extra, columns: expected.columns }));
      }
    }
    const expBtn = h('button', { class: 'btn sm ghost', onclick: () => { expBox.hidden = !expBox.hidden; expBtn.textContent = expBox.hidden ? '📋 Expected output' : '🙈 Hide expected'; } }, '📋 Expected output');
    const expBox = h('div', { class: 'expected', hidden: true }, h('div', { class: 'jv-cap' }, state ? 'Expected result of the check query' : 'Expected output'), expected ? table(expected, { compact: true, max: 30 }) : h('div', { class: 'muted' }, '—'));
    return h('div', { class: 'challenge' },
      cfg.compactHeader ? null : h('div', { class: 'ch-hd' }, UI.levelBadge(cfg.level || 1), cfg.title ? h('b', null, cfg.title) : null, st && st.solved ? h('span', { class: 'badge solved' }, '✔ solved') : null, timer),
      h('div', { class: 'ch-prompt', html: esc(cfg.prompt).replace(/`([^`]+)`/g, '<code>$1</code>') }),
      cfg.debugSql ? h('div', null, h('div', { class: 'jv-cap' }, '🐞 Buggy query — fix it in the editor below'), code(cfg.debugSql, { run: false })) : null,
      state ? h('details', { class: 'more' }, h('summary', null, '🔎 How this is graded'), h('p', { class: 'small' }, 'Your statements run on a fresh copy of the database. Then this check query runs, and its result must match the result after the reference solution:'), code(cfg.check, { run: false })) : null,
      ed.el,
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn', onclick: submit }, '✔ Run & check'),
        h('button', { class: 'btn ghost', onclick: () => run() }, '▶ Run only'),
        hintBtn, expBtn,
        h('button', { class: 'btn sm ghost', onclick: () => { ed.value = cfg.starter || 'SELECT '; out.innerHTML = ''; } }, '↺ Reset'),
        h('span', { class: 'muted xs' }, 'Ctrl+Enter = check')),
      hintBox, expBox, out);
  }

  // ---------------- Practice page ----------------
  function allChallenges() {
    const list = (window.PracticeBank || []).map((c) => ({ ...c, key: 'practice:' + c.id, source: 'Practice' }));
    Curriculum.lessons.forEach((l) => {
      const L = Lessons.get(l.id);
      if (L && L.challenge) list.push({ id: 'L-' + l.id, key: 'lesson:' + l.id, title: l.title, level: L.challenge.level || 1, topic: Curriculum.sectionByKey[l.section].short, prompt: L.challenge.prompt, solution: L.challenge.solution, hints: L.challenge.hints, ordered: L.challenge.ordered, mode: L.challenge.mode, check: L.challenge.check, starter: L.challenge.starter, buggy: L.challenge.buggy, source: 'Lesson', lessonId: l.id });
    });
    return list;
  }
  let filt = { level: 0, topic: 'All', q: '', status: 'all' };
  // ---------------- Mixed review (spaced repetition) ----------------
  const REASON = { due: ['🔁', 'Due for review'], retry: ['🩹', 'You missed this one'], weak: ['🎯', 'From a weak topic'] };
  let session = null;
  function reviewSession() {
    if (!session) session = { items: Progress.reviewQueue(allChallenges()), i: 0, results: {} };
    const S = session;
    const box = h('div');
    function draw() {
      box.innerHTML = '';
      if (!S.items.length) { box.appendChild(h('div', { class: 'card' }, h('h2', null, 'Nothing to review yet'), h('p', { class: 'muted' }, 'Solve or attempt a few challenges first. Missed ones, weak topics and solved ones that are due for a refresher will show up here.'), h('a', { class: 'btn', href: '#/practice' }, 'Go to practice'))); return; }
      if (S.i >= S.items.length) {
        const ok = S.items.filter((c) => S.results[c.key]).length;
        box.appendChild(h('div', { class: 'card' }, h('h2', null, ok === S.items.length ? '🏆 Perfect review!' : '✅ Review complete'), h('div', { class: 'big-score' }, `${ok} / ${S.items.length}`),
          h('p', { class: 'muted small' }, 'Solved items come back after 1, 3, 7, 16 and 35 days. Missed ones return in the next session.'),
          h('table', { class: 'rt compact' }, h('tbody', null, S.items.map((c) => h('tr', { class: S.results[c.key] ? 'keep' : 'drop' }, h('td', null, REASON[c.reason][0]), h('td', null, c.title), h('td', null, c.topic), h('td', null, S.results[c.key] ? '✔' : S.results[c.key] === false ? '✘' : '— skipped'))))),
          h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { session = null; App.refresh(); } }, '↻ New review session'), h('a', { class: 'btn ghost', href: '#/practice' }, 'Back to practice'))));
        return;
      }
      const c = S.items[S.i];
      box.appendChild(h('div', { class: 'card' },
        h('div', { class: 'card-hd' }, h('h2', null, `${S.i + 1} / ${S.items.length} · ${c.title}`), h('span', { class: 'badge' }, REASON[c.reason][0], ' ', REASON[c.reason][1]), h('span', { class: 'muted small' }, c.topic)),
        h('div', { class: 'iv-nav' }, S.items.map((x, k) => h('span', { class: 'dot' + (k === S.i ? ' active' : '') + (S.results[x.key] ? ' ok' : S.results[x.key] === false ? ' bad' : '') }, k + 1))),
        challengeBox({ ...c, starter: c.starter || (c.mode === 'state' || c.buggy ? null : `-- ${c.title}\nSELECT \nFROM `), onResult: (ok) => { if (S.results[c.key] !== true) S.results[c.key] = ok; } }),
        h('div', { class: 'row spread' }, h('button', { class: 'btn ghost sm', onclick: () => { S.i++; draw(); } }, 'Skip'), h('button', { class: 'btn sm', onclick: () => { S.i++; draw(); } }, S.i === S.items.length - 1 ? 'Finish ✔' : 'Next ▶'))));
    }
    draw();
    return h('div', null, h('div', { class: 'note' }, '🔁 ', h('b', null, 'Mixed review'), ' — a spaced-repetition session: challenges due for a refresher, ones you missed, and new ones from your weakest topics, interleaved so you practice choosing the right technique.'), box);
  }

  function render(arg) {
    const list = allChallenges();
    if (arg !== 'review') session = null;
    const selected = arg ? list.find((c) => c.id === arg) : null;
    const topics = ['All', ...new Set(list.map((c) => c.topic))];
    const listBox = h('div', { class: 'pc-list' });
    function drawList() {
      listBox.innerHTML = '';
      const items = list.filter((c) => (!filt.level || c.level === filt.level) && (filt.topic === 'All' || c.topic === filt.topic) && (!filt.q || (c.title + c.prompt).toLowerCase().includes(filt.q))
        && (filt.status === 'all' || (filt.status === 'solved') === !!(Progress.state.challenges[c.key] || {}).solved));
      listBox.appendChild(h('div', { class: 'muted xs' }, `${items.length} challenges`));
      items.slice(0, 400).forEach((c) => {
        const s = Progress.state.challenges[c.key];
        listBox.appendChild(h('a', { class: 'pc-item' + (selected && selected.id === c.id ? ' active' : '') + (s && s.solved ? ' solved' : ''), href: `#/practice/${c.id}` },
          h('span', { class: 'pc-lv' }, UI.LEVELS[c.level][0]), h('span', { class: 'pc-t' }, c.title), s && s.solved ? h('span', { class: 'pc-ok' }, '✔') : null, h('span', { class: 'pc-topic' }, c.topic)));
      });
    }
    drawList();
    const filters = h('div', { class: 'pc-filters' },
      h('input', { class: 'input sm', type: 'search', placeholder: 'Search challenges…', value: filt.q, oninput: (e) => { filt.q = e.target.value.toLowerCase(); drawList(); } }),
      h('div', { class: 'seg small' }, [[0, 'All'], [1, '🟢'], [2, '🟡'], [3, '🟠'], [4, '🔴']].map(([v, l]) => h('button', { class: 'seg-btn' + (filt.level === v ? ' active' : ''), title: v ? UI.LEVELS[v][1] : 'All levels', onclick: (e) => { filt.level = v; e.target.parentNode.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active')); e.target.classList.add('active'); drawList(); } }, l))),
      h('div', { class: 'row' },
        h('select', { class: 'input sm', 'aria-label': 'Topic', onchange: (e) => { filt.topic = e.target.value; drawList(); } }, topics.map((t) => h('option', { selected: t === filt.topic }, t))),
        h('select', { class: 'input sm', 'aria-label': 'Status', onchange: (e) => { filt.status = e.target.value; drawList(); } }, [['all', 'Any status'], ['solved', 'Solved'], ['todo', 'Unsolved']].map(([v, l]) => h('option', { value: v, selected: v === filt.status }, l)))));

    const work = arg === 'review' ? reviewSession() : selected ? challengePanel(selected) : playground();
    return h('div', { class: 'page practice' },
      h('div', { class: 'crumbs' }, 'SQL › ', h('a', { href: '#/practice' }, 'Practice'), [' › ', h('b', null, selected ? selected.title : arg === 'review' ? 'Mixed review' : 'Playground')]),
      h('div', { class: 'pc-grid' },
        h('aside', { class: 'pc-side card' }, h('a', { class: 'pc-item free' + (selected || arg === 'review' ? '' : ' active'), href: '#/practice' }, '🧪 Free playground'),
          h('a', { class: 'pc-item free' + (arg === 'review' ? ' active' : ''), href: '#/practice/review' }, '🔁 Mixed review', Progress.reviewDueCount() ? h('span', { class: 'pc-topic' }, `${Progress.reviewDueCount()} due`) : null), h('div', { class: 'sb-cap' }, 'Challenges'), filters, listBox),
        h('div', { class: 'pc-main' }, work)));
  }

  function challengePanel(c) {
    const box = challengeBox({ ...c, starter: c.starter || (c.mode === 'state' || c.buggy ? null : `-- ${c.title}\nSELECT \nFROM `), onSolved: () => { if (c.lessonId) Progress.complete(c.lessonId); } });
    const list = allChallenges();
    const i = list.findIndex((x) => x.id === c.id);
    return h('div', { class: 'card' },
      h('div', { class: 'card-hd' }, h('h2', null, c.title), h('span', { class: 'muted small' }, `${c.topic} · ${c.source}`), c.lessonId ? h('a', { class: 'btn sm ghost', href: `#/learn/${c.lessonId}` }, '📚 Open lesson') : null),
      box,
      h('div', { class: 'row spread' }, i > 0 ? h('a', { class: 'btn ghost sm', href: `#/practice/${list[i - 1].id}` }, '◀ Previous') : h('span'), i < list.length - 1 ? h('a', { class: 'btn sm', href: `#/practice/${list[i + 1].id}` }, 'Next challenge ▶') : null));
  }

  const EXAMPLES = [
    ['Patients without allergies', 'SELECT first_name, last_name\nFROM patients\nWHERE allergies IS NULL;'],
    ['Unpaid invoices', "SELECT invoice_id, patient_id, due_date, total_amount\nFROM invoices\nWHERE status IN ('Open', 'Overdue')\nORDER BY due_date;"],
    ['Revenue by payor', 'SELECT py.payor_name, COUNT(*) AS payments, ROUND(SUM(pm.amount), 2) AS collected\nFROM payments pm\nLEFT JOIN payors py ON py.payor_id = pm.payor_id\nGROUP BY py.payor_name\nORDER BY collected DESC;'],
    ['Busiest practitioners', "SELECT pr.first_name || ' ' || pr.last_name AS practitioner, pr.specialty,\n       COUNT(c.charge_id) AS charges, SUM(c.amount) AS billed\nFROM practitioners pr\nLEFT JOIN charges c ON c.practitioner_id = pr.practitioner_id\nGROUP BY pr.practitioner_id\nORDER BY billed DESC;"],
    ['Running ledger balance', 'SELECT invoice_id, transaction_date, transaction_type, amount,\n       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id) AS balance\nFROM transactions\nWHERE invoice_id <= 5\nORDER BY invoice_id, transaction_date;'],
    ['AR aging buckets', "SELECT CASE\n         WHEN julianday('2026-09-01') - julianday(due_date) <= 0 THEN 'Not due'\n         WHEN julianday('2026-09-01') - julianday(due_date) <= 30 THEN '1-30'\n         WHEN julianday('2026-09-01') - julianday(due_date) <= 60 THEN '31-60'\n         WHEN julianday('2026-09-01') - julianday(due_date) <= 90 THEN '61-90'\n         ELSE '90+' END AS bucket,\n       COUNT(*) AS invoices, SUM(total_amount) AS amount\nFROM invoices\nWHERE status IN ('Open', 'Overdue', 'Partially Paid')\nGROUP BY bucket;"],
  ];

  function playground() {
    const ed = UI.editor({ value: App.pendingSql || EXAMPLES[0][1], minLines: 8, onRun: () => run() });
    App.pendingSql = null;
    App.activeEditor = ed;
    const out = h('div', { class: 'pg-out' });
    const meta = h('span', { class: 'muted small' });
    let lastTab = 0;
    function run(mode = 'run') {
      const sql = ed.value.trim();
      if (!sql) return;
      out.innerHTML = '';
      let res;
      try { res = DB.exec(sql); Progress.logQuery(sql, true); }
      catch (e) {
        Progress.logQuery(sql, false);
        meta.textContent = '';
        out.appendChild(feedbackCard(explainError(e.message, sql, DB.schema()), { sql }));
        out.appendChild(h('div', { class: 'err small' }, 'SQLite: ' + e.message));
        return;
      }
      meta.textContent = `${res.results.length > 1 ? res.results.length + ' result sets · ' : ''}${res.last ? res.last.rows.length + ' rows' : res.changes + ' row(s) affected'} · ${res.ms.toFixed(1)} ms`;
      if (/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE)\b/i.test(sql)) App.refreshExplorer();
      const tabs = [
        { label: '📋 Result', render: () => (res.last ? table(res.last, { max: 500, index: true }) : h('div', { class: 'fb good' }, `✔ Statement executed — ${res.changes} row(s) affected. Use ↺ Reset DB in the explorer to restore the sample data.`)) },
        { label: '🎬 Step-by-step', render: () => Visuals.render({ type: 'order', sql, runner: (s) => DB.exec(s) }, { sql }) },
        { label: '🧭 Query plan', render: () => { try { DB.exec('EXPLAIN QUERY PLAN ' + sql.replace(/;\s*$/, '')); return Visuals.render({ type: 'explain', sql }, { sql }); } catch (e) { return h('div', { class: 'muted' }, 'No plan available for this statement.'); } } },
      ];
      out.appendChild(UI.tabs(tabs, { active: mode === 'steps' ? 1 : lastTab, onChange: (i) => (lastTab = i) }));
    }
    const hist = h('div', { class: 'history' });
    function drawHistory() {
      hist.innerHTML = '';
      const H = Progress.state.history;
      if (!H.length) { hist.appendChild(h('div', { class: 'muted small' }, 'Your executed queries will appear here.')); return; }
      H.slice(0, 25).forEach((x) => hist.appendChild(h('button', { class: 'hist-item ' + (x.ok ? 'ok' : 'bad'), title: new Date(x.t).toLocaleString(), onclick: () => { ed.value = x.sql; ed.focus(); } }, h('span', null, x.ok ? '✔' : '✘'), h('code', null, x.sql.replace(/\s+/g, ' ').slice(0, 90)))));
    }
    drawHistory();
    Progress.onChange(() => document.body.contains(hist) && drawHistory());
    setTimeout(() => run(), 0);
    return h('div', null,
      h('div', { class: 'card' },
        h('div', { class: 'card-hd' }, h('h2', null, '🧪 SQL Playground'), h('span', { class: 'muted small' }, 'SQLite in your browser · Healthcare Billing sample DB')),
        h('div', { class: 'row wrap examples' }, h('span', { class: 'muted xs' }, 'Examples:'), EXAMPLES.map(([t, s]) => h('button', { class: 'chip-btn', onclick: () => { ed.value = s; run(); } }, t))),
        ed.el,
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn', onclick: () => run() }, '▶ Run query'),
          h('button', { class: 'btn ghost', onclick: () => run('steps') }, '🎬 Step through'),
          h('button', { class: 'btn ghost', onclick: () => { ed.value = ''; ed.focus(); out.innerHTML = ''; meta.textContent = ''; } }, '✕ Clear'),
          h('button', { class: 'btn ghost', title: 'Restore original sample data', onclick: () => { DB.reset(); App.refreshExplorer(); toast('Database reset'); } }, '↺ Reset DB'),
          h('span', { class: 'muted xs' }, 'Ctrl+Enter to run'), meta),
        out),
      h('div', { class: 'card' }, h('div', { class: 'card-hd' }, h('h2', null, '🕘 Query history'), h('button', { class: 'btn sm ghost', onclick: () => Progress.clearHistory() }, 'Clear')), hist));
  }

  window.Practice = { render, challengeBox, explainError, explainWrong, feedbackCard, allChallenges };
})();
