// Section 09: Query Execution & SQL Mental Model (execution-01 .. execution-10)
Lessons.add([
  // ---------------------------------------------------------------- 01
  {
    id: 'execution-01',
    goals: [
      'The difference between the order you WRITE a query and the order it is logically EVALUATED',
      'The logical processing order: FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT',
      'What "physical" processing is and why the optimizer may reorder work',
      'How to peek at the physical plan with EXPLAIN QUERY PLAN',
    ],
    concept: `<p>You <b>write</b> a query starting with SELECT, but the database <b>logically evaluates</b> it in a different order:</p>
<p style="font-size:1.05em"><b>FROM/JOIN &rarr; WHERE &rarr; GROUP BY &rarr; HAVING &rarr; SELECT &rarr; DISTINCT &rarr; ORDER BY &rarr; LIMIT</b></p>
<p>Each step takes a table of rows in and hands a (usually smaller) table of rows to the next step. This <b>logical</b> order defines what the answer must be and explains which names are visible where. For example, a column alias created in SELECT does not exist yet during WHERE.</p>
<p><b>Physical</b> processing is what the engine actually does: which index to use, which table to read first, whether to sort or hash. The optimizer may reorder, merge or skip steps (for example, pushing a filter into an index lookup) as long as the final result is the same as the logical order would produce.</p>`,
    why: 'Most confusing SQL errors ("no such column", "misuse of aggregate", "window function in WHERE") make instant sense once you know the logical order.',
    when: 'Every time you write a query with more than SELECT and FROM, and whenever an error mentions a column or aggregate that "should" exist.',
    analogy: 'A claims clerk processes a stack of claims: first pull the right folders (FROM), discard the ones not for this month (WHERE), sort them into piles per clinic (GROUP BY), throw away piles that are too small (HAVING), fill in the summary line for each pile (SELECT), put the summaries in order (ORDER BY) and hand over the top few (LIMIT). The memo you received was written in a different order ("give me the summary of..."), but the work happens in this order.',
    exampleSql: `SELECT invoice_id, location_id, status, total_amount FROM invoices ORDER BY invoice_id LIMIT 8;`,
    syntax: `SELECT    -- 5\nDISTINCT  -- 6\nFROM/JOIN -- 1\nWHERE     -- 2\nGROUP BY  -- 3\nHAVING    -- 4\nORDER BY  -- 7\nLIMIT     -- 8`,
    sql: `SELECT location_id, COUNT(*) AS invoices, SUM(total_amount) AS billed
FROM invoices
WHERE status <> 'Void'
GROUP BY location_id
HAVING COUNT(*) >= 7
ORDER BY billed DESC
LIMIT 3;`,
    breakdown: [
      ['FROM invoices', 'Step 1: start with all 48 invoices'],
      ["WHERE status <> 'Void'", 'Step 2: drop the void invoice: 47 rows'],
      ['GROUP BY location_id', 'Step 3: collapse into 5 groups, one per location with invoices'],
      ['HAVING COUNT(*) >= 7', 'Step 4: keep groups with at least 7 invoices: 4 groups'],
      ['SELECT location_id, COUNT(*) AS invoices, SUM(total_amount) AS billed', 'Step 5: compute output columns and name them'],
      ['ORDER BY billed DESC', 'Step 7: sort, using the alias created in step 5'],
      ['LIMIT 3', 'Step 8: keep the first 3 rows'],
    ],
    visual: { type: 'order' },
    internals: `<p>The engine's pipeline: <b>parse</b> the text into a tree, <b>bind</b> names to tables/columns, <b>rewrite</b> (flatten subqueries, push predicates down), <b>optimize</b> (estimate costs, pick indexes and join order), then <b>execute</b>. SQLite compiles the plan into bytecode for its virtual machine. <code>EXPLAIN QUERY PLAN</code> shows the physical plan: for this query you will see a SCAN of invoices and a TEMP B-TREE used for GROUP BY and ORDER BY. The logical order is the contract; the plan is the implementation.</p>`,
    mistakes: [
      { wrong: `SELECT location_id, SUM(total_amount) AS billed FROM invoices WHERE billed > 1500 GROUP BY location_id;`, why: 'WHERE runs at step 2, before grouping. There is no per-location sum yet, and filtering on an aggregate there is illegal ("misuse of aggregate"). Group filters go in HAVING.', fix: `SELECT location_id, SUM(total_amount) AS billed FROM invoices GROUP BY location_id HAVING SUM(total_amount) > 1500;` },
      { wrong: `-- "The database reads the SELECT list first, so it only fetches those columns"`, why: 'Logically SELECT happens late. Physically the engine may read only needed columns, but that is an optimization, not the order of meaning.', fix: `EXPLAIN QUERY PLAN SELECT location_id, COUNT(*) FROM invoices WHERE status <> 'Void' GROUP BY location_id;` },
    ],
    rules: ['Written order: SELECT first. Logical order: FROM first.', 'FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT.', 'Each step only sees what earlier steps produced.', 'The optimizer may change physical order, never the result.'],
    compare: `<table><tr><th></th><th>Logical processing</th><th>Physical processing</th></tr><tr><td>Defined by</td><td>SQL standard</td><td>Each engine's optimizer</td></tr><tr><td>Purpose</td><td>What the answer is; name scoping</td><td>How fast it is computed</td></tr><tr><td>Visible with</td><td>Reasoning, the order visual</td><td>EXPLAIN / EXPLAIN QUERY PLAN</td></tr><tr><td>Changes?</td><td>Never</td><td>With indexes, statistics, versions</td></tr></table>`,
    realWorld: 'When a revenue report is wrong or throws an error, analysts debug by walking the logical order: how many rows after FROM/JOIN, after WHERE, per group... Performance tuning, in contrast, reads the physical plan.',
    tips: ['Mnemonic: "Friendly Workers Group Happy Service Desks Organize Lists" (FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT).'],
    deep: `<p>Some engines add steps: window functions are evaluated right after HAVING (in the SELECT phase, before DISTINCT and ORDER BY); <code>QUALIFY</code> (Snowflake, BigQuery, DuckDB) filters on window results after that. Set operations (UNION) combine complete SELECT results before a final ORDER BY/LIMIT applies to the combined set.</p>`,
    tryIt: { prompt: 'Run EXPLAIN QUERY PLAN on the lesson query and read how SQLite physically executes it.', starter: `EXPLAIN QUERY PLAN
SELECT location_id, COUNT(*) AS invoices, SUM(total_amount) AS billed
FROM invoices
WHERE status <> 'Void'
GROUP BY location_id
HAVING COUNT(*) >= 7
ORDER BY billed DESC
LIMIT 3;` },
    challenge: {
      level: 2,
      prompt: 'Among invoices dated in 2026, count invoices per status, keep only statuses with at least 3 invoices, and order by the count descending, then status.',
      solution: `SELECT status, COUNT(*) AS n FROM invoices WHERE invoice_date >= '2026-01-01' GROUP BY status HAVING COUNT(*) >= 3 ORDER BY n DESC, status;`,
      hints: ['Walk the logical order: FROM invoices, then WHERE on the date.', "WHERE invoice_date >= '2026-01-01' filters rows before grouping.", 'GROUP BY status, then HAVING COUNT(*) >= 3 filters groups.', "SELECT status, COUNT(*) AS n FROM invoices WHERE invoice_date >= '2026-01-01' GROUP BY status HAVING COUNT(*) >= 3 ORDER BY n DESC, status;"],
      ordered: true,
    },
    quiz: [
      { q: 'Which clause is logically evaluated first?', options: ['SELECT', 'WHERE', 'FROM', 'ORDER BY'], answer: 2, why: 'FROM (with its JOINs) builds the working set of rows first.' },
      { q: 'Which is logically evaluated right after GROUP BY?', options: ['WHERE', 'HAVING', 'SELECT', 'ORDER BY'], answer: 1, why: 'HAVING filters the groups GROUP BY just produced.' },
      { q: 'Can the optimizer read an index before scanning the table, even though WHERE is "step 2"?', options: ['No, it must follow the logical order exactly', 'Yes, physical order can differ as long as the result is the same', 'Only in SQLite', 'Only for ORDER BY'], answer: 1, why: 'Logical order defines the result; physical execution is free to optimize.' },
    ],
  },

  // ---------------------------------------------------------------- 02
  {
    id: 'execution-02',
    goals: ['Why FROM and JOIN are evaluated first', 'How joins build one wide working table', 'Why ON conditions and WHERE conditions behave differently for LEFT JOIN', 'Why table aliases work everywhere'],
    concept: `<p>Step 1 is <b>FROM</b>, including every <b>JOIN</b>. It builds the <b>working table</b>: all the rows and columns the rest of the query is allowed to use.</p>
<p>Conceptually, a join pairs rows from both tables (a cross product) and keeps the pairs that satisfy the <code>ON</code> condition. For <code>LEFT JOIN</code>, unmatched left rows are added back with NULLs on the right side. Only after this wide table exists does WHERE start filtering.</p>
<p>Consequences:</p>
<ul>
<li>Table aliases (<code>invoices i</code>) are defined here, so they can be used in every later clause, even in SELECT, which you write earlier.</li>
<li>Row counts are decided here: a 1:N join multiplies parent rows before any grouping.</li>
<li>For LEFT JOIN, a condition in <code>ON</code> decides matching; the same condition in <code>WHERE</code> runs later and can throw away the NULL-extended rows, silently turning it into an inner join.</li>
</ul>`,
    why: 'Everything else in the query works on the rows FROM produces. Wrong rows here (duplicates, missing unmatched rows) poison every later step.',
    when: 'Whenever a query has more than one table, and whenever counts look too high (fan-out) or rows are mysteriously missing (outer join filtered in WHERE).',
    analogy: 'Before any analysis, the clerk staples each invoice to its patient\'s registration card. Only then do they start discarding or sorting. If an invoice has 3 service lines, it gets stapled into 3 bundles, one per line.',
    exampleSql: `SELECT l.location_id, l.location_name, i.invoice_id FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id WHERE l.location_id IN (5, 6);`,
    syntax: `FROM a\nJOIN b      ON b.a_id = a.id   -- matching rule\nLEFT JOIN c ON c.b_id = b.id   -- keep unmatched b rows`,
    sql: `SELECT l.location_id, l.location_name,
       i.invoice_id, i.status
FROM treatment_locations l
LEFT JOIN invoices i
       ON i.location_id = l.location_id
      AND i.status = 'Overdue'
ORDER BY l.location_id, i.invoice_id;`,
    breakdown: [
      ['FROM treatment_locations l', 'Step 1a: start with 6 locations; alias l is created here'],
      ['LEFT JOIN invoices i ON i.location_id = l.location_id', 'Step 1b: attach each location\'s invoices'],
      ["AND i.status = 'Overdue'", 'Part of the matching rule: only overdue invoices match, but every location is kept'],
      ['ORDER BY l.location_id, i.invoice_id', 'Locations with no overdue invoices still appear once, with NULLs'],
    ],
    visual: { type: 'stages' },
    internals: `<p>No engine really builds the full cross product. It uses a <b>nested loop</b> (for each outer row, probe the inner table, ideally via an index), a <b>hash join</b> (build a hash table on the smaller input, probe it with the larger) or a <b>merge join</b> (walk two sorted inputs together). SQLite uses nested loops with automatic indexes. The optimizer also chooses the physical join order, but for an outer join it must preserve outer-join semantics.</p>`,
    mistakes: [
      { wrong: `SELECT l.location_id, i.invoice_id FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id WHERE i.status = 'Overdue';`, why: 'WHERE runs after the join. Locations without overdue invoices have i.status = NULL, and NULL = \'Overdue\' is unknown, so those rows are dropped: the LEFT JOIN has become an INNER JOIN.', fix: `SELECT l.location_id, i.invoice_id FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id AND i.status = 'Overdue' ORDER BY l.location_id;` },
      { wrong: `SELECT i.invoice_id, SUM(i.total_amount) FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id GROUP BY i.invoice_id;`, why: 'The join (step 1) repeats each invoice once per charge, before GROUP BY (step 3). The total is multiplied by the number of charges.', fix: `SELECT i.invoice_id, i.total_amount, COUNT(c.charge_id) AS lines FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id GROUP BY i.invoice_id, i.total_amount ORDER BY i.invoice_id LIMIT 5;` },
    ],
    rules: ['FROM/JOIN is step 1: it decides which rows exist.', 'Aliases defined in FROM are visible everywhere.', 'For LEFT JOIN, filter the right table in ON, not WHERE.', 'Joins can multiply rows; check counts after joining.'],
    compare: `<table><tr><th>Condition placed in...</th><th>INNER JOIN</th><th>LEFT JOIN</th></tr><tr><td>ON</td><td>Filters pairs</td><td>Decides matches; left rows are kept regardless</td></tr><tr><td>WHERE</td><td>Same result as ON</td><td>Filters after the join; can remove NULL-extended rows</td></tr></table>`,
    realWorld: 'An "overdue by clinic" dashboard that must list every clinic, including those with zero overdue invoices, depends on putting the status filter in the ON clause.',
    tryIt: { prompt: "Move the status condition from ON to WHERE and compare the row count. Which locations disappear?", starter: `SELECT l.location_id, l.location_name, i.invoice_id
FROM treatment_locations l
LEFT JOIN invoices i ON i.location_id = l.location_id AND i.status = 'Overdue'
ORDER BY l.location_id;` },
    challenge: {
      level: 3,
      prompt: 'List every location with the number of its OVERDUE invoices, including locations with zero. Show location_id, location_name and the count, ordered by location_id.',
      solution: `SELECT l.location_id, l.location_name, COUNT(i.invoice_id) FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id AND i.status = 'Overdue' GROUP BY l.location_id, l.location_name ORDER BY l.location_id;`,
      hints: ['Start FROM treatment_locations and LEFT JOIN invoices.', "Put i.status = 'Overdue' in the ON clause so locations with none survive.", 'COUNT(i.invoice_id) returns 0 for NULL-extended rows.', "SELECT l.location_id, l.location_name, COUNT(i.invoice_id) FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id AND i.status = 'Overdue' GROUP BY l.location_id, l.location_name ORDER BY l.location_id;"],
      ordered: true,
    },
    quiz: [
      { q: 'Why can SELECT use the alias i defined in "FROM invoices i"?', options: ['SELECT is evaluated first', 'FROM is evaluated first, so the alias exists for all later steps', 'Aliases are global', 'It cannot'], answer: 1, why: 'Table aliases are born in step 1.' },
      { q: "LEFT JOIN invoices ... WHERE i.status = 'Overdue' behaves like...", options: ['A FULL JOIN', 'An INNER JOIN', 'A CROSS JOIN', 'A LEFT JOIN'], answer: 1, why: 'WHERE removes the NULL-extended rows the LEFT JOIN added.' },
    ],
  },

  // ---------------------------------------------------------------- 03
  {
    id: 'execution-03',
    goals: ['WHERE is step 2: it filters individual rows', 'Why WHERE cannot use aggregates', 'Why SELECT aliases are not (in standard SQL) visible in WHERE', 'Filtering early to make grouping cheaper and correct'],
    concept: `<p><b>WHERE</b> runs right after FROM/JOIN. It looks at <b>one row at a time</b> and keeps the row only if the condition is TRUE (FALSE and UNKNOWN are dropped).</p>
<p>Because it runs <b>before GROUP BY</b>:</p>
<ul>
<li>It decides which rows are allowed <i>into</i> the groups. Filter out void invoices here and they are never counted.</li>
<li>It cannot use aggregate functions (<code>COUNT</code>, <code>SUM</code>...): there are no groups yet.</li>
<li>In standard SQL it cannot use aliases from the SELECT list, which runs later. (SQLite and MySQL are lenient and allow some aliases; PostgreSQL, SQL Server and Oracle do not. Do not rely on it.)</li>
</ul>`,
    why: 'Row filters belong before grouping: it shapes what gets aggregated and reduces the work for every later step.',
    when: 'For any condition about a single row: a date range, a status, a payor, a practitioner.',
    analogy: 'Before sorting invoices into per-clinic piles, the clerk throws away the voided ones. Asking "throw away piles with fewer than 5 invoices" at this moment makes no sense: there are no piles yet.',
    exampleSql: `SELECT invoice_id, location_id, status, total_amount FROM invoices WHERE status = 'Overdue' ORDER BY invoice_id;`,
    syntax: `SELECT ...\nFROM t\nWHERE row_condition        -- no aggregates here\nGROUP BY ...\nHAVING group_condition;    -- aggregates go here`,
    sql: `SELECT location_id,
       COUNT(*)          AS overdue_invoices,
       SUM(total_amount) AS overdue_amount
FROM invoices
WHERE status = 'Overdue'
GROUP BY location_id
ORDER BY overdue_amount DESC;`,
    breakdown: [
      ['FROM invoices', 'Step 1: 48 rows'],
      ["WHERE status = 'Overdue'", 'Step 2: keep only the 13 overdue rows; the rest never reach the groups'],
      ['GROUP BY location_id', 'Step 3: group only the surviving rows'],
      ['COUNT(*), SUM(total_amount)', 'Aggregates now count and sum overdue invoices only'],
      ['ORDER BY overdue_amount DESC', 'Biggest overdue balance first'],
    ],
    visual: { type: 'order' },
    internals: `<p>WHERE conditions are where indexes help most. The optimizer turns <code>status = 'Overdue'</code> into an index seek if an index on status exists, and pushes conditions as early as possible, even into a join or a subquery ("predicate pushdown"). Conditions that wrap the column in a function (<code>WHERE strftime('%Y', invoice_date) = '2026'</code>) usually cannot use a plain index; a range (<code>invoice_date >= '2026-01-01'</code>) can.</p>`,
    mistakes: [
      { wrong: `SELECT location_id, COUNT(*) FROM invoices WHERE COUNT(*) > 8 GROUP BY location_id;`, why: 'WHERE runs before grouping, so COUNT(*) has nothing to count. SQLite reports "misuse of aggregate: COUNT()".', fix: `SELECT location_id, COUNT(*) FROM invoices GROUP BY location_id HAVING COUNT(*) > 8;` },
      { wrong: `SELECT invoice_id, total_amount * 0.8 AS expected_payment FROM invoices WHERE expected_payment > 400;`, why: 'In standard SQL the alias does not exist yet in WHERE (SELECT runs later). SQLite happens to accept it, but PostgreSQL, SQL Server and Oracle raise "column does not exist". Repeat the expression, or use a subquery/CTE.', fix: `SELECT invoice_id, total_amount * 0.8 AS expected_payment FROM invoices WHERE total_amount * 0.8 > 400 ORDER BY invoice_id;` },
      { wrong: `SELECT status, COUNT(*) FROM invoices GROUP BY status HAVING status <> 'Void';`, why: 'This works, but it filters after grouping: all rows are grouped first, then a whole group is discarded. A row-level condition belongs in WHERE, which is clearer and cheaper.', fix: `SELECT status, COUNT(*) FROM invoices WHERE status <> 'Void' GROUP BY status;` },
    ],
    rules: ['WHERE filters rows, before grouping.', 'No aggregates in WHERE.', 'Do not rely on SELECT aliases in WHERE (portable SQL).', 'Put row-level conditions in WHERE, group-level in HAVING.'],
    compare: `<table><tr><th></th><th>WHERE</th><th>HAVING</th></tr><tr><td>Step</td><td>2 (before GROUP BY)</td><td>4 (after GROUP BY)</td></tr><tr><td>Filters</td><td>Individual rows</td><td>Whole groups</td></tr><tr><td>Aggregates allowed</td><td>No</td><td>Yes</td></tr><tr><td>Uses indexes</td><td>Often</td><td>Rarely</td></tr></table>`,
    realWorld: 'An A/R aging report filters out Paid and Void invoices in WHERE, then groups what remains by payor and aging bucket.',
    tryIt: { prompt: "Change the WHERE to keep 'Open' and 'Partially Paid' invoices instead (use IN).", starter: `SELECT location_id, COUNT(*) AS n, SUM(total_amount) AS amount
FROM invoices
WHERE status = 'Overdue'
GROUP BY location_id;` },
    challenge: {
      level: 2,
      prompt: 'For charges with a service_date in 2026 or later, count charge lines per cpt_code. Show cpt_code and the count, ordered by count descending, then cpt_code, top 5.',
      solution: `SELECT cpt_code, COUNT(*) AS n FROM charges WHERE service_date >= '2026-01-01' GROUP BY cpt_code ORDER BY n DESC, cpt_code LIMIT 5;`,
      hints: ['The date condition is about single rows, so it goes in WHERE.', "WHERE service_date >= '2026-01-01'.", 'GROUP BY cpt_code and COUNT(*).', "SELECT cpt_code, COUNT(*) AS n FROM charges WHERE service_date >= '2026-01-01' GROUP BY cpt_code ORDER BY n DESC, cpt_code LIMIT 5;"],
      ordered: true,
    },
    quiz: [
      { q: 'Why is WHERE COUNT(*) > 5 an error?', options: ['COUNT needs a column', 'WHERE runs before groups exist', 'WHERE cannot compare numbers', 'It is not an error'], answer: 1, why: 'Aggregates need groups, which are created in step 3.' },
      { q: 'A row filtered out by WHERE...', options: ['Is still counted by COUNT(*)', 'Never reaches GROUP BY or the aggregates', 'Shows up with NULLs', 'Is deleted from the table'], answer: 1, why: 'Later steps only see rows that passed WHERE. The table itself is not changed.' },
    ],
  },

  // ---------------------------------------------------------------- 04
  {
    id: 'execution-04',
    goals: ['GROUP BY (step 3) collapses rows into groups', 'Aggregates are computed per group', 'HAVING (step 4) filters whole groups', 'Which columns SELECT may use after grouping'],
    concept: `<p>At step 3, <b>GROUP BY</b> takes the rows that survived WHERE and sorts them into <b>groups</b> that share the same values of the grouping columns. From here on, the query works with <b>one row per group</b>, not individual rows.</p>
<p>Aggregates (<code>COUNT, SUM, AVG, MIN, MAX</code>) summarize each group. At step 4, <b>HAVING</b> keeps or drops whole groups based on those aggregates.</p>
<p>After grouping, SELECT may only show: the grouping columns, aggregates, and constants/expressions built from them. A plain column like <code>invoice_id</code> has many values per group, so "which one?" has no answer. PostgreSQL, SQL Server and Oracle reject it; SQLite and older MySQL silently pick an arbitrary row's value, which is a bug waiting to happen.</p>`,
    why: 'Summaries (billed per payor, visits per practitioner) are the heart of billing reports. GROUP BY + HAVING is how SQL makes them.',
    when: 'Any "per" question: per location, per month, per payor. Use HAVING when the filter is about the summary ("payors with more than $1,000 billed").',
    analogy: 'The clerk sorts the remaining invoices into one pile per payor (GROUP BY), writes a tally slip on top of each pile (aggregates), and then removes piles whose tally is too small to report (HAVING). After this, the manager only sees tally slips, not individual invoices.',
    exampleSql: `SELECT invoice_id, payor_id, total_amount FROM invoices WHERE payor_id IS NOT NULL ORDER BY payor_id, invoice_id LIMIT 12;`,
    syntax: `SELECT group_col, AGG(col)\nFROM t\nWHERE row_filter\nGROUP BY group_col\nHAVING AGG(col) condition;`,
    sql: `SELECT i.payor_id, py.payor_name,
       COUNT(*)            AS invoices,
       SUM(i.total_amount) AS billed
FROM invoices i
JOIN payors py ON py.payor_id = i.payor_id
WHERE i.status <> 'Void'
GROUP BY i.payor_id, py.payor_name
HAVING SUM(i.total_amount) > 1000
ORDER BY billed DESC;`,
    breakdown: [
      ['FROM invoices i JOIN payors py', 'Step 1: invoices that have a payor, with the payor name attached'],
      ["WHERE i.status <> 'Void'", 'Step 2: drop void invoices (row filter)'],
      ['GROUP BY i.payor_id, py.payor_name', 'Step 3: one group per payor'],
      ['HAVING SUM(i.total_amount) > 1000', 'Step 4: keep only payors billed more than $1,000 (group filter)'],
      ['SELECT ... COUNT(*), SUM(...)', 'Step 5: one output row per surviving group'],
      ['ORDER BY billed DESC', 'Step 7: largest first'],
    ],
    visual: { type: 'groupby', source: `SELECT invoice_id, payor_id, total_amount FROM invoices WHERE payor_id IS NOT NULL AND invoice_id <= 18 ORDER BY payor_id, invoice_id LIMIT 14`, group: 'payor_id', value: 'total_amount', agg: 'SUM', having: 300 },
    internals: `<p>Engines group in two main ways: <b>sort-based</b> (sort rows by the group key, then scan and emit a group when the key changes) or <b>hash-based</b> (keep a hash table of running totals per key). SQLite uses a sorter (a temporary B-tree) unless an index already delivers rows in group order, in which case it can group while streaming. HAVING is applied to each finished group before it is passed on.</p>`,
    mistakes: [
      { wrong: `SELECT payor_id, invoice_id, SUM(total_amount) FROM invoices GROUP BY payor_id;`, why: 'invoice_id is not grouped or aggregated: each payor group has many invoice ids. SQLite returns an arbitrary one; other engines raise an error.', fix: `SELECT payor_id, COUNT(invoice_id) AS invoices, SUM(total_amount) FROM invoices GROUP BY payor_id;` },
      { wrong: `SELECT payor_id, SUM(total_amount) FROM invoices WHERE SUM(total_amount) > 1000 GROUP BY payor_id;`, why: 'Group conditions cannot run in step 2. Use HAVING, which runs after the groups are built.', fix: `SELECT payor_id, SUM(total_amount) FROM invoices GROUP BY payor_id HAVING SUM(total_amount) > 1000;` },
    ],
    rules: ['GROUP BY: one output row per distinct group key.', 'SELECT only grouped columns and aggregates.', 'HAVING filters groups; WHERE filters rows.', 'NULL keys form their own single group.'],
    compare: `<p><b>GROUP BY vs DISTINCT:</b> <code>SELECT DISTINCT payor_id</code> and <code>SELECT payor_id ... GROUP BY payor_id</code> return the same rows, but only GROUP BY lets you compute aggregates per group. <b>GROUP BY vs window functions:</b> GROUP BY collapses rows; <code>SUM(...) OVER (PARTITION BY payor_id)</code> keeps every row and adds the group total beside it.</p>`,
    realWorld: 'Payor mix reports (billed and collected per payor), provider productivity (RVUs per practitioner) and denial rates per CPT code are all GROUP BY + HAVING queries.',
    tryIt: { prompt: 'Change the HAVING to keep payors with at least 8 invoices instead of billed > 1000.', starter: `SELECT payor_id, COUNT(*) AS invoices, SUM(total_amount) AS billed
FROM invoices
WHERE status <> 'Void'
GROUP BY payor_id
HAVING SUM(total_amount) > 1000;` },
    challenge: {
      level: 3,
      prompt: 'Per practitioner specialty, count charge lines and sum charge amounts, keeping only specialties with more than 10 lines. Show specialty, lines, total; order by total descending.',
      solution: `SELECT p.specialty, COUNT(*) AS lines, SUM(c.amount) AS total FROM charges c JOIN practitioners p ON p.practitioner_id = c.practitioner_id GROUP BY p.specialty HAVING COUNT(*) > 10 ORDER BY total DESC;`,
      hints: ['Specialty is on practitioners; amounts are on charges. Join them.', 'GROUP BY p.specialty.', 'The "more than 10 lines" condition is about a group: HAVING COUNT(*) > 10.', 'SELECT p.specialty, COUNT(*) AS lines, SUM(c.amount) AS total FROM charges c JOIN practitioners p ON p.practitioner_id = c.practitioner_id GROUP BY p.specialty HAVING COUNT(*) > 10 ORDER BY total DESC;'],
      ordered: true,
    },
    quiz: [
      { q: 'After GROUP BY payor_id, which can SELECT safely show?', options: ['invoice_id', 'payor_id and aggregates like SUM(total_amount)', 'Any column', 'Only COUNT(*)'], answer: 1, why: 'Only grouped columns and aggregates have one value per group.' },
      { q: 'HAVING is evaluated...', options: ['Before WHERE', 'After GROUP BY, before SELECT', 'After ORDER BY', 'After LIMIT'], answer: 1, why: 'Step 4: it filters the groups built in step 3.' },
    ],
  },

  // ---------------------------------------------------------------- 05
  {
    id: 'execution-05',
    goals: ['SELECT is step 5: it computes the output columns late', 'Why column aliases are unavailable to WHERE, GROUP BY and HAVING (in standard SQL)', 'Window functions are computed in the SELECT step', 'How to reuse a computed column: repeat it, or wrap it in a CTE/subquery'],
    concept: `<p>Although you write it first, <b>SELECT</b> is evaluated at <b>step 5</b>, after FROM, WHERE, GROUP BY and HAVING. It takes each row (or each group) that survived and computes the output columns: expressions, aggregates, CASE, window functions. This is also where <b>column aliases</b> are born.</p>
<p>Because aliases are born here:</p>
<ul>
<li>WHERE, GROUP BY and HAVING (earlier steps) cannot see them in standard SQL. SQLite and MySQL bend this rule for convenience; PostgreSQL, SQL Server and Oracle do not.</li>
<li>ORDER BY (step 7) <b>can</b> use them everywhere.</li>
</ul>
<p><b>Window functions</b> (<code>RANK() OVER (...)</code>) also run in this step, after WHERE and HAVING. So you cannot filter on a window function in WHERE; compute it in a CTE/subquery first, then filter in the outer query.</p>`,
    why: 'Knowing SELECT runs late explains alias errors and the "window function in WHERE" error, and tells you how to fix both.',
    when: 'Whenever you create calculated columns (expected payment, age, days overdue, rank) and want to filter, group or sort by them.',
    analogy: 'The summary line on each invoice pile ("Location 4: 14 invoices, $4,400") is written only after the piles are sorted and checked. You cannot use a nickname that appears on that summary line to decide which invoices go into the piles.',
    exampleSql: `SELECT invoice_id, total_amount, payor_id FROM invoices WHERE payor_id IS NOT NULL LIMIT 6;`,
    syntax: `WITH t AS (\n  SELECT col, expression AS alias\n  FROM tbl\n)\nSELECT * FROM t WHERE alias > value;   -- the alias now exists`,
    sql: `WITH ranked AS (
  SELECT invoice_id, location_id, total_amount,
         RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS rank_in_location
  FROM invoices
  WHERE status <> 'Void'
)
SELECT location_id, invoice_id, total_amount, rank_in_location
FROM ranked
WHERE rank_in_location = 1
ORDER BY location_id;`,
    breakdown: [
      ['WITH ranked AS (...)', 'Inner query: its SELECT step computes the rank for every invoice'],
      ['RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC)', 'Window function: evaluated during SELECT, after WHERE'],
      ["WHERE status <> 'Void'", 'Inner WHERE runs before the rank is computed'],
      ['FROM ranked WHERE rank_in_location = 1', 'Outer query: the rank is now a normal column, so WHERE can filter on it'],
    ],
    visual: { type: 'order' },
    internals: `<p>The binder resolves names clause by clause following the logical scopes. When it reaches WHERE, the SELECT list has not been bound, so a standard engine reports "column does not exist". SQLite resolves unknown names in WHERE by looking at SELECT aliases as a fallback, which is why the shortcut works here. Window functions need the full set of filtered rows of each partition, so they must wait until WHERE/GROUP BY/HAVING are done; the engine sorts by the partition and order keys, then streams the window results.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, location_id, RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS rnk FROM invoices WHERE rnk = 1;`, why: 'Window functions are computed in the SELECT step, after WHERE. SQLite: "misuse of window function RANK()". Compute the rank in a CTE, then filter outside.', fix: `WITH r AS (SELECT invoice_id, location_id, RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS rnk FROM invoices) SELECT invoice_id, location_id FROM r WHERE rnk = 1 ORDER BY location_id;` },
      { wrong: `SELECT invoice_id, total_amount * 0.8 AS expected FROM invoices WHERE expected > 400;`, why: 'Works in SQLite, but not in PostgreSQL/SQL Server/Oracle, because the alias is created in step 5 and WHERE is step 2. Portable code repeats the expression or uses a CTE.', fix: `WITH e AS (SELECT invoice_id, total_amount * 0.8 AS expected FROM invoices) SELECT invoice_id, expected FROM e WHERE expected > 400 ORDER BY invoice_id;` },
    ],
    rules: ['SELECT is step 5: aliases are born here.', 'ORDER BY can use aliases; WHERE/GROUP BY/HAVING (standard) cannot.', 'Window functions run in the SELECT step; filter them in an outer query.', 'Use a CTE or subquery to name something once and reuse it.'],
    compare: `<table><tr><th>Clause</th><th>Can use SELECT alias? (standard)</th><th>SQLite</th></tr><tr><td>WHERE</td><td>No</td><td>Yes (extension)</td></tr><tr><td>GROUP BY</td><td>No (PostgreSQL/MySQL allow)</td><td>Yes</td></tr><tr><td>HAVING</td><td>No</td><td>Yes</td></tr><tr><td>ORDER BY</td><td>Yes</td><td>Yes</td></tr></table>`,
    realWorld: 'Top-N-per-group reports ("largest invoice per clinic", "latest payment per claim") always use this pattern: rank in a CTE, filter rank = 1 outside.',
    deep: `<p>Within a single SELECT list, expressions are conceptually evaluated "all at once", so one column cannot reference another column's alias in the same list in standard SQL (<code>SELECT a * 2 AS x, x + 1</code> fails in PostgreSQL). Snowflake/BigQuery offer <code>QUALIFY</code> to filter on window functions without a CTE; SQLite does not.</p>`,
    tryIt: { prompt: 'Change the query to find the two largest invoices per location (rank_in_location <= 2).', starter: `WITH ranked AS (
  SELECT invoice_id, location_id, total_amount,
         RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS rank_in_location
  FROM invoices
)
SELECT * FROM ranked WHERE rank_in_location = 1 ORDER BY location_id;` },
    challenge: {
      level: 3,
      prompt: 'For each patient, find their most recent invoice (by invoice_date, ties broken by the higher invoice_id). Show patient_id, invoice_id and invoice_date, ordered by patient_id. Use ROW_NUMBER in a CTE.',
      solution: `WITH r AS (SELECT patient_id, invoice_id, invoice_date, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date DESC, invoice_id DESC) AS rn FROM invoices) SELECT patient_id, invoice_id, invoice_date FROM r WHERE rn = 1 ORDER BY patient_id;`,
      hints: ['A window function cannot be filtered in the same query\'s WHERE.', 'Number each patient\'s invoices in a CTE: ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date DESC, invoice_id DESC).', 'In the outer query keep rn = 1.', 'WITH r AS (SELECT patient_id, invoice_id, invoice_date, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date DESC, invoice_id DESC) AS rn FROM invoices) SELECT patient_id, invoice_id, invoice_date FROM r WHERE rn = 1 ORDER BY patient_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'In standard SQL, which clause can use a SELECT alias?', options: ['WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'], answer: 3, why: 'ORDER BY runs after SELECT.' },
      { q: 'Why does WHERE RANK() OVER (...) = 1 fail?', options: ['RANK needs GROUP BY', 'Window functions are computed in the SELECT step, after WHERE', 'RANK only works in ORDER BY', 'It does not fail'], answer: 1, why: 'Filter on it in an outer query instead.' },
    ],
  },

  // ---------------------------------------------------------------- 06
  {
    id: 'execution-06',
    goals: ['DISTINCT (step 6) removes duplicate output rows', 'ORDER BY (step 7) is the only thing that guarantees order', 'LIMIT/OFFSET (step 8) run last', 'Why ORDER BY + LIMIT must be deterministic'],
    concept: `<p>The last three steps shape the final result:</p>
<ul>
<li><b>DISTINCT</b> (step 6) compares whole output rows (all selected columns) and keeps one of each. It works on what SELECT produced, not on the table.</li>
<li><b>ORDER BY</b> (step 7) sorts. It can use aliases and column positions. Without ORDER BY, the order of rows is <b>not defined</b>: it can change with indexes, versions or data size.</li>
<li><b>LIMIT / OFFSET</b> (step 8) cut the sorted list. Because it runs last, "top 5" means "sort everything that survived, then take 5".</li>
</ul>
<p>If ORDER BY has ties (two invoices with the same amount), LIMIT may pick either one, and paging with OFFSET may skip or repeat rows. Add a unique tiebreaker such as the primary key.</p>`,
    why: 'Reports and pages must show the same rows every time. Knowing these three run last explains how to get a stable, correct top-N.',
    when: 'Removing duplicate combinations, sorting any user-facing list, building top-N lists and pagination.',
    analogy: 'The finished tally slips are de-duplicated (two identical slips become one), put in order by amount, and then only the first page is photocopied for the manager. Photocopying first and sorting later would give the wrong page.',
    exampleSql: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC, invoice_id LIMIT 8;`,
    syntax: `SELECT DISTINCT cols\nFROM t\nORDER BY col1 DESC, unique_col\nLIMIT n OFFSET m;`,
    sql: `SELECT DISTINCT p.city
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id
WHERE i.status IN ('Overdue', 'Partially Paid')
ORDER BY p.city
LIMIT 5;`,
    breakdown: [
      ['FROM patients p JOIN invoices i ...', 'Step 1: one row per patient-invoice pair'],
      ["WHERE i.status IN ('Overdue', 'Partially Paid')", 'Step 2: only patients with balances due'],
      ['SELECT DISTINCT p.city', 'Steps 5-6: keep just the city, then remove repeated cities (NULL counts as one value)'],
      ['ORDER BY p.city', 'Step 7: sort the distinct cities (NULL sorts first in SQLite)'],
      ['LIMIT 5', 'Step 8: take the first five after sorting'],
    ],
    visual: { type: 'stages' },
    internals: `<p>DISTINCT is implemented like a GROUP BY on all selected columns (sort or hash, then drop repeats). ORDER BY needs a sort unless an index already provides the order; with LIMIT, engines use a <b>top-N heap</b> that keeps only N rows in memory instead of sorting everything. OFFSET still has to produce and discard the skipped rows, so OFFSET 100000 is slow; "keyset pagination" (<code>WHERE invoice_id > last_seen ORDER BY invoice_id LIMIT 20</code>) avoids that.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, total_amount FROM invoices LIMIT 5;`, why: 'No ORDER BY means no defined order: these are "some 5 invoices", not the first or the biggest. It may change tomorrow.', fix: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC, invoice_id LIMIT 5;` },
      { wrong: `SELECT DISTINCT patient_id, invoice_id FROM invoices;`, why: 'DISTINCT applies to the whole output row. Every (patient, invoice) pair is already unique, so nothing is removed. To list patients once, select only patient_id.', fix: `SELECT DISTINCT patient_id FROM invoices ORDER BY patient_id;` },
      { wrong: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC LIMIT 3;`, why: 'Several invoices may share the same amount; which of the tied rows lands in the top 3 is arbitrary. Add a unique tiebreaker.', fix: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC, invoice_id LIMIT 3;` },
    ],
    rules: ['DISTINCT works on complete output rows.', 'Only ORDER BY guarantees order.', 'LIMIT runs after ORDER BY.', 'Add a unique tiebreaker for stable top-N and paging.'],
    compare: `<table><tr><th>Step</th><th>Clause</th><th>Works on</th></tr><tr><td>6</td><td>DISTINCT</td><td>Output rows from SELECT</td></tr><tr><td>7</td><td>ORDER BY</td><td>Distinct output rows; may use aliases</td></tr><tr><td>8</td><td>LIMIT / OFFSET</td><td>The sorted list</td></tr></table>
<p>With DISTINCT, standard SQL (and PostgreSQL) requires ORDER BY columns to appear in the SELECT list; SQLite is lenient.</p>`,
    realWorld: 'Work queues ("next 20 overdue invoices, oldest first") are ORDER BY due_date, invoice_id LIMIT 20; a missing tiebreaker makes collectors see the same invoice on two pages.',
    tryIt: { prompt: 'Page through invoices by amount: show rows 6-10 using LIMIT 5 OFFSET 5 with a stable order.', starter: `SELECT invoice_id, total_amount
FROM invoices
ORDER BY total_amount DESC, invoice_id
LIMIT 5;` },
    challenge: {
      level: 2,
      prompt: 'List the distinct cpt_code values billed by practitioner 5, sorted by cpt_code, and return only the first 3.',
      solution: `SELECT DISTINCT cpt_code FROM charges WHERE practitioner_id = 5 ORDER BY cpt_code LIMIT 3;`,
      hints: ['Filter practitioner 5 in WHERE.', 'SELECT DISTINCT cpt_code removes repeated codes.', 'ORDER BY cpt_code, then LIMIT 3 (which runs last).', 'SELECT DISTINCT cpt_code FROM charges WHERE practitioner_id = 5 ORDER BY cpt_code LIMIT 3;'],
      ordered: true,
    },
    quiz: [
      { q: 'SELECT invoice_id FROM invoices LIMIT 5 without ORDER BY returns...', options: ['The 5 lowest ids, guaranteed', 'Any 5 rows; order is undefined', 'The 5 newest invoices', 'An error'], answer: 1, why: 'Only ORDER BY defines order.' },
      { q: 'In which order do these run?', options: ['LIMIT, ORDER BY, DISTINCT', 'DISTINCT, ORDER BY, LIMIT', 'ORDER BY, DISTINCT, LIMIT', 'ORDER BY, LIMIT, DISTINCT'], answer: 1, why: 'Steps 6, 7, 8.' },
    ],
  },

  // ---------------------------------------------------------------- 07
  {
    id: 'execution-07',
    goals: ['Trace a complete query clause by clause', 'Predict the row count after each step', 'Use intermediate queries to debug each step', 'Connect every clause to its logical position'],
    concept: `<p>Let us trace one realistic query from start to finish: <i>"Which locations have the most money tied up in unpaid invoices (Open, Overdue, Partially Paid), counting only locations with at least 3 such invoices? Show the top 2."</i></p>
<ol>
<li><b>FROM invoices JOIN treatment_locations</b>: 48 invoice rows, each with its location name attached.</li>
<li><b>WHERE status IN (...)</b>: 24 unpaid invoices remain.</li>
<li><b>GROUP BY location_name</b>: 5 groups (one per location that has unpaid invoices).</li>
<li><b>HAVING COUNT(*) >= 3</b>: 3 groups remain (two locations have only 2).</li>
<li><b>SELECT</b>: compute name, count and total for each group, and name them.</li>
<li><b>ORDER BY unpaid DESC</b>: sort the 3 rows by the alias.</li>
<li><b>LIMIT 2</b>: keep the top 2.</li>
</ol>
<p>Debugging trick: run the query one step at a time (<code>SELECT *</code> after FROM, then add WHERE, then GROUP BY...) and check the row count at each step against what you expect.</p>`,
    why: 'Tracing turns a scary 10-line query into a series of small, checkable steps. It is the most reliable way to find where a wrong number comes from.',
    when: 'Before trusting any report number, when a result looks too big or too small, and when reviewing someone else\'s SQL.',
    analogy: 'Auditing a revenue report the way an auditor follows the paper trail: how many invoices went in, how many were excluded and why, how they were grouped, which groups were dropped, and how the final list was ranked.',
    exampleSql: `SELECT i.invoice_id, l.location_name, i.status, i.total_amount FROM invoices i JOIN treatment_locations l ON l.location_id = i.location_id WHERE i.status IN ('Open','Overdue','Partially Paid') ORDER BY l.location_name, i.invoice_id;`,
    syntax: `SELECT ...        -- 5\nFROM ... JOIN ... -- 1\nWHERE ...         -- 2\nGROUP BY ...      -- 3\nHAVING ...        -- 4\nORDER BY ...      -- 7\nLIMIT ...;        -- 8`,
    sql: `SELECT l.location_name,
       COUNT(*)            AS unpaid_invoices,
       SUM(i.total_amount) AS unpaid
FROM invoices i
JOIN treatment_locations l ON l.location_id = i.location_id
WHERE i.status IN ('Open', 'Overdue', 'Partially Paid')
GROUP BY l.location_name
HAVING COUNT(*) >= 3
ORDER BY unpaid DESC
LIMIT 2;`,
    breakdown: [
      ['FROM invoices i JOIN treatment_locations l ON ...', 'Step 1: 48 rows (every invoice has a location)'],
      ["WHERE i.status IN ('Open', 'Overdue', 'Partially Paid')", 'Step 2: 24 rows'],
      ['GROUP BY l.location_name', 'Step 3: 5 groups'],
      ['HAVING COUNT(*) >= 3', 'Step 4: 3 groups (Telehealth and Urgent Care have only 2 each)'],
      ['SELECT l.location_name, COUNT(*) AS unpaid_invoices, SUM(i.total_amount) AS unpaid', 'Step 5: 3 output rows with named columns'],
      ['ORDER BY unpaid DESC', 'Step 7: highest unpaid total first'],
      ['LIMIT 2', 'Step 8: the final 2 rows'],
    ],
    visual: { type: 'order' },
    internals: `<p>Physically, SQLite will probably scan invoices, look up each location by primary key (a fast rowid lookup), filter on status as it goes, feed survivors into a temporary B-tree for grouping, then sort the few groups for ORDER BY. The WHERE filter is applied during the scan, not as a separate pass, but the result is identical to the logical trace. Try <code>EXPLAIN QUERY PLAN</code> to see it.</p>`,
    mistakes: [
      { wrong: `SELECT l.location_name, COUNT(*) AS unpaid_invoices FROM invoices i JOIN treatment_locations l ON l.location_id = i.location_id GROUP BY l.location_name HAVING i.status IN ('Open','Overdue','Partially Paid');`, why: 'i.status is not a group-level value; HAVING runs after grouping, and SQLite would test one arbitrary row per group. Row filters belong in WHERE (step 2).', fix: `SELECT l.location_name, COUNT(*) AS unpaid_invoices FROM invoices i JOIN treatment_locations l ON l.location_id = i.location_id WHERE i.status IN ('Open','Overdue','Partially Paid') GROUP BY l.location_name ORDER BY l.location_name;` },
      { wrong: `-- Trusting the final number without checking intermediate counts`, why: 'A wrong join or filter changes every later step. Check the row count after FROM/JOIN and after WHERE first.', fix: `SELECT COUNT(*) AS after_where FROM invoices WHERE status IN ('Open','Overdue','Partially Paid');` },
    ],
    rules: ['Trace in logical order, not written order.', 'Predict a row count for each step, then verify it.', 'Build complex queries incrementally.', 'A wrong total usually comes from step 1 (joins) or step 2 (filters).'],
    compare: `<p><b>Logical trace</b> answers "is the result correct?". <b>EXPLAIN QUERY PLAN</b> answers "is it fast?". Use the trace first; optimize a correct query, never a wrong one.</p>`,
    realWorld: 'When finance asks "why does the dashboard show $2,655 unpaid at Lakeview but the ledger says otherwise?", you answer by tracing: which invoices were included, which statuses, which location mapping.',
    tryIt: { prompt: 'Debug step by step: this shows the rows after steps 1-2. Add GROUP BY, then HAVING, then ORDER BY/LIMIT, checking the row count each time.', starter: `SELECT l.location_name, i.invoice_id, i.status, i.total_amount
FROM invoices i
JOIN treatment_locations l ON l.location_id = i.location_id
WHERE i.status IN ('Open', 'Overdue', 'Partially Paid')
ORDER BY l.location_name;` },
    challenge: {
      level: 3,
      prompt: 'Which practitioners (last_name) billed more than 1000 in total charge amounts for services in 2025? Show last_name, number of lines and total, highest total first, top 3.',
      solution: `SELECT p.last_name, COUNT(*) AS lines, SUM(c.amount) AS total FROM charges c JOIN practitioners p ON p.practitioner_id = c.practitioner_id WHERE c.service_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY p.practitioner_id, p.last_name HAVING SUM(c.amount) > 1000 ORDER BY total DESC LIMIT 3;`,
      hints: ['Step 1: FROM charges JOIN practitioners.', "Step 2: WHERE c.service_date BETWEEN '2025-01-01' AND '2025-12-31'.", 'Steps 3-4: GROUP BY practitioner, HAVING SUM(c.amount) > 1000.', "SELECT p.last_name, COUNT(*) AS lines, SUM(c.amount) AS total FROM charges c JOIN practitioners p ON p.practitioner_id = c.practitioner_id WHERE c.service_date BETWEEN '2025-01-01' AND '2025-12-31' GROUP BY p.practitioner_id, p.last_name HAVING SUM(c.amount) > 1000 ORDER BY total DESC LIMIT 3;"],
      ordered: true,
    },
    quiz: [
      { q: 'In the traced query, how many rows reach GROUP BY?', options: ['48', '24', '5', '3'], answer: 1, why: 'WHERE kept the 24 unpaid invoices.' },
      { q: 'If a total looks too large, which step do you check first?', options: ['LIMIT', 'ORDER BY', 'FROM/JOIN (row multiplication) and WHERE', 'SELECT aliases'], answer: 2, why: 'Inflated totals almost always come from joins that multiply rows or missing filters.' },
    ],
  },

  // ---------------------------------------------------------------- 08
  {
    id: 'execution-08',
    goals: ['Recognize the classic execution-order mistakes', 'Know which error message maps to which mistake', 'Fix each one with the right clause or a CTE', 'Build a mental checklist for writing correct queries'],
    concept: `<p>Almost every "why doesn't this work?" moment in SQL is an execution-order mistake. The big ones:</p>
<ol>
<li><b>Aggregate in WHERE</b> ("misuse of aggregate"): WHERE is before grouping. Use HAVING.</li>
<li><b>SELECT alias in WHERE/GROUP BY/HAVING</b> ("column does not exist" in most engines): SELECT runs later. Repeat the expression or use a CTE.</li>
<li><b>Window function in WHERE</b> ("misuse of window function"): windows run in SELECT. Filter in an outer query.</li>
<li><b>Non-grouped column in SELECT</b>: after GROUP BY each group needs one value. Group it or aggregate it.</li>
<li><b>Filtering the right table of a LEFT JOIN in WHERE</b>: silently becomes an inner join. Move it to ON.</li>
<li><b>Aggregating after a fan-out join</b>: the join multiplies rows before SUM. Aggregate first, then join.</li>
<li><b>LIMIT without ORDER BY</b>: undefined rows. Always sort first.</li>
</ol>`,
    why: 'These mistakes either throw confusing errors or, worse, return plausible but wrong numbers. Recognizing them quickly saves hours and prevents bad reports.',
    when: 'As a checklist before shipping any report query, and as the first thing to check when a query errors or a number looks off.',
    analogy: 'Common claim denials have standard reason codes; a billing specialist learns them and fixes the claim instantly. These are SQL\'s standard "denial codes".',
    exampleSql: `SELECT invoice_id, COUNT(*) AS payments, SUM(amount) AS paid FROM payments GROUP BY invoice_id ORDER BY invoice_id LIMIT 6;`,
    syntax: `-- Checklist in logical order\n-- 1 FROM/JOIN: right rows? fan-out? outer join filters in ON?\n-- 2 WHERE: row filters only, no aggregates or window funcs\n-- 3 GROUP BY: every non-aggregated SELECT column listed\n-- 4 HAVING: group filters\n-- 5 SELECT: aliases born here\n-- 7 ORDER BY + tiebreaker, 8 LIMIT`,
    sql: `WITH paid AS (
  SELECT invoice_id, SUM(amount) AS paid_amount
  FROM payments
  GROUP BY invoice_id
)
SELECT i.invoice_id, i.total_amount,
       COALESCE(p.paid_amount, 0)                  AS paid_amount,
       i.total_amount - COALESCE(p.paid_amount, 0) AS balance
FROM invoices i
LEFT JOIN paid p ON p.invoice_id = i.invoice_id
WHERE i.status IN ('Overdue', 'Partially Paid')
ORDER BY balance DESC, i.invoice_id
LIMIT 5;`,
    breakdown: [
      ['WITH paid AS (... GROUP BY invoice_id)', 'Avoid fan-out: aggregate payments to one row per invoice BEFORE joining'],
      ['LEFT JOIN paid p ON p.invoice_id = i.invoice_id', 'Keep invoices with no payments (they get NULL, turned into 0 by COALESCE)'],
      ["WHERE i.status IN (...)", 'Filter on the LEFT table only, so the outer join is not broken'],
      ['i.total_amount - COALESCE(p.paid_amount, 0) AS balance', 'Computed column; alias born in SELECT'],
      ['ORDER BY balance DESC, i.invoice_id LIMIT 5', 'ORDER BY can use the alias; tiebreaker makes the top 5 stable'],
    ],
    visual: { type: 'flow', steps: [['1. FROM / JOIN', 'Fan-out? LEFT JOIN filters belong in ON'], ['2. WHERE', 'No aggregates, no window functions, no SELECT aliases (standard)'], ['3. GROUP BY', 'Every plain SELECT column must be grouped'], ['4. HAVING', 'Filters on aggregates go here'], ['5. SELECT', 'Aliases and window functions are created here'], ['6. DISTINCT', 'Applies to whole output rows'], ['7. ORDER BY', 'Aliases OK; add a unique tiebreaker'], ['8. LIMIT', 'Meaningless without ORDER BY']] },
    internals: `<p>Error messages map straight to the step: SQLite raises "misuse of aggregate" when the binder finds an aggregate in a WHERE/ON scope, and "misuse of window function" when it finds a window function outside SELECT/ORDER BY. The silent mistakes (fan-out, LEFT JOIN turned inner, non-grouped column) produce no error because they are valid SQL; only knowing the order catches them.</p>`,
    mistakes: [
      { wrong: `SELECT i.invoice_id, i.total_amount, SUM(p.amount) AS paid, SUM(c.amount) AS charged\nFROM invoices i\nJOIN payments p ON p.invoice_id = i.invoice_id\nJOIN charges  c ON c.invoice_id = i.invoice_id\nGROUP BY i.invoice_id, i.total_amount;`, why: 'Two 1:N joins multiply each other: 2 payments x 3 charges = 6 rows per invoice, so both sums are inflated. Aggregate each child table separately first.', fix: `WITH p AS (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id),\n     c AS (SELECT invoice_id, SUM(amount) AS charged FROM charges GROUP BY invoice_id)\nSELECT i.invoice_id, i.total_amount, p.paid, c.charged\nFROM invoices i JOIN p ON p.invoice_id = i.invoice_id JOIN c ON c.invoice_id = i.invoice_id\nORDER BY i.invoice_id LIMIT 5;` },
      { wrong: `SELECT patient_id, COUNT(*) AS n FROM invoices WHERE n > 2 GROUP BY patient_id;`, why: 'Two mistakes: n is a SELECT alias (step 5) and it is an aggregate (needs step 3). SQLite: "misuse of aggregate".', fix: `SELECT patient_id, COUNT(*) AS n FROM invoices GROUP BY patient_id HAVING COUNT(*) > 2 ORDER BY patient_id;` },
      { wrong: `SELECT p.patient_id, i.invoice_id FROM patients p LEFT JOIN invoices i ON i.patient_id = p.patient_id WHERE i.status <> 'Void';`, why: 'Patients with no invoices have i.status NULL; NULL <> \'Void\' is UNKNOWN, so WHERE removes exactly the rows the LEFT JOIN was meant to keep.', fix: `SELECT p.patient_id, i.invoice_id FROM patients p LEFT JOIN invoices i ON i.patient_id = p.patient_id AND i.status <> 'Void' ORDER BY p.patient_id, i.invoice_id;` },
    ],
    rules: ['Aggregate filters: HAVING.', 'Window filters: outer query.', 'Right-table filters of LEFT JOIN: ON.', 'Aggregate child tables before joining them together.', 'ORDER BY before trusting LIMIT.'],
    compare: `<table><tr><th>Symptom</th><th>Likely cause</th><th>Fix</th></tr>
<tr><td>"misuse of aggregate"</td><td>Aggregate in WHERE</td><td>HAVING</td></tr>
<tr><td>"misuse of window function"</td><td>Window function in WHERE/GROUP BY</td><td>CTE + outer WHERE</td></tr>
<tr><td>"column does not exist" (PostgreSQL)</td><td>SELECT alias in WHERE</td><td>Repeat expression / CTE</td></tr>
<tr><td>Totals too high</td><td>Fan-out join</td><td>Pre-aggregate</td></tr>
<tr><td>Rows missing after LEFT JOIN</td><td>Right-table filter in WHERE</td><td>Move to ON</td></tr>
<tr><td>Different rows each run</td><td>LIMIT without ORDER BY / ties</td><td>ORDER BY + tiebreaker</td></tr></table>`,
    realWorld: 'The "collected vs billed" report that double-counts revenue because payments and charges were joined together is one of the most common bugs in healthcare finance dashboards.',
    tryIt: { prompt: 'This query counts invoices per patient. Change it to show only patients with more than 2 invoices, without putting an aggregate in WHERE.', starter: `SELECT patient_id, COUNT(*) AS n
FROM invoices
GROUP BY patient_id
ORDER BY patient_id;` },
    challenge: {
      level: 4,
      prompt: 'For every invoice that has both charges and payments, show invoice_id, total charged (sum of charges) and total paid (sum of payments) without fan-out inflation. Order by invoice_id; return the first 5.',
      solution: `WITH c AS (SELECT invoice_id, SUM(amount) AS charged FROM charges GROUP BY invoice_id), p AS (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) SELECT c.invoice_id, c.charged, p.paid FROM c JOIN p ON p.invoice_id = c.invoice_id ORDER BY c.invoice_id LIMIT 5;`,
      hints: ['Joining charges and payments directly multiplies rows.', 'Aggregate each child table to one row per invoice in its own CTE.', 'Then join the two CTEs on invoice_id (inner join keeps invoices that have both).', 'WITH c AS (SELECT invoice_id, SUM(amount) AS charged FROM charges GROUP BY invoice_id), p AS (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) SELECT c.invoice_id, c.charged, p.paid FROM c JOIN p ON p.invoice_id = c.invoice_id ORDER BY c.invoice_id LIMIT 5;'],
      ordered: true,
    },
    quiz: [
      { q: 'An invoice has 2 payments and 3 charges. Joining both to the invoice produces how many rows for it?', options: ['2', '3', '5', '6'], answer: 3, why: 'Each payment pairs with each charge: 2 x 3 = 6.' },
      { q: 'Where should "only patients with more than 2 invoices" go?', options: ['WHERE COUNT(*) > 2', 'HAVING COUNT(*) > 2', 'ORDER BY', 'LIMIT 2'], answer: 1, why: 'It is a condition on a group aggregate.' },
      { q: 'SQLite says "misuse of window function". What is the fix?', options: ['Add GROUP BY', 'Compute the window function in a CTE, filter in the outer query', 'Use HAVING', 'Remove ORDER BY'], answer: 1, why: 'Window functions exist only after the SELECT step.' },
    ],
  },
  // ---------------------------------------------------------------- 09
  {
    id: 'execution-09',
    goals: [
      'Build a complex query incrementally instead of writing it all at once',
      'Check row counts after every JOIN and filter to catch fan-out and lost rows',
      'Debug a CTE chain by running each CTE on its own',
      'Read SQLite error messages and map them to the logical processing order',
    ],
    concept: `<p>When a query returns the wrong numbers, do not stare at the whole thing. <b>Debug it the way the engine runs it</b>: in logical order, one step at a time, checking the row count after each step.</p>
<ol>
<li><b>Start from the driving table</b>: <code>SELECT COUNT(*) FROM invoices</code>. You know the grain: one row per invoice (48).</li>
<li><b>Add one JOIN at a time</b> and count again. If the count grows, the join is one-to-many (<b>fan-out</b>): every invoice now appears once per charge. If it shrinks, an inner join is <b>dropping rows</b> with no match.</li>
<li><b>Add WHERE</b> and count again. Did the filter remove what you expected?</li>
<li><b>Add GROUP BY / aggregates</b> last, and compare totals with a simple, trusted query (e.g. <code>SUM(total_amount) FROM invoices</code>).</li>
<li>For CTE chains, <b>run each CTE alone</b>: replace the final SELECT with <code>SELECT * FROM step_2</code>.</li>
</ol>
<p>Row counts are your debugger's breakpoints. Most wrong totals come from a join that changed the grain.</p>`,
    why: 'SQL does not have a step-through debugger in most tools, and a wrong total gives no error. Counting rows at each stage turns a silent logic bug into a visible jump in a number.',
    when: 'When totals do not match a trusted source, when a report suddenly doubles, when rows go missing, and when you receive an error you do not understand in a long query.',
    analogy: 'A billing manager reconciling a batch of claims counts the stack after each step: 48 claims received, 48 after attaching payor info, 104 after attaching charge lines. The jump from 48 to 104 is exactly where the "double billing" in the summary came from.',
    exampleSql: `SELECT 'invoices' AS step, COUNT(*) AS row_count FROM invoices
UNION ALL SELECT 'invoices JOIN charges', COUNT(*) FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id
UNION ALL SELECT 'invoices LEFT JOIN charges', COUNT(*) FROM invoices i LEFT JOIN charges c ON c.invoice_id = i.invoice_id
UNION ALL SELECT 'invoices JOIN payors', COUNT(*) FROM invoices i JOIN payors p ON p.payor_id = i.payor_id`,
    syntax: `-- 1. grain of the driving table
SELECT COUNT(*) FROM a;
-- 2. after each join: did the count grow (fan-out) or shrink (lost rows)?
SELECT COUNT(*), COUNT(DISTINCT a.id) FROM a JOIN b ON ...;
-- 3. after WHERE
-- 4. aggregate last; compare with a trusted total
-- 5. CTE chain: SELECT * FROM cte_n LIMIT 20;`,
    sql: `SELECT i.location_id,
       COUNT(DISTINCT i.invoice_id) AS invoices,
       COUNT(*)                     AS charge_lines,
       SUM(c.amount)                AS billed_from_charges
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id
WHERE i.status <> 'Void'
GROUP BY i.location_id
ORDER BY i.location_id;`,
    breakdown: [
      ['FROM invoices i', 'Checkpoint 1: 48 rows, one per invoice.'],
      ['JOIN charges c ON c.invoice_id = i.invoice_id', 'Checkpoint 2: 104 rows. The grain changed to one row per charge line (fan-out), and void invoice 37 (no charges) dropped out.'],
      ["WHERE i.status <> 'Void'", 'Checkpoint 3: still 104 (the only void invoice was already gone).'],
      ['COUNT(DISTINCT i.invoice_id)', 'Because rows are now charges, invoices must be counted DISTINCT.'],
      ['SUM(c.amount)', 'Sum the measure that matches the grain: charge amounts, not invoice totals.'],
      ['GROUP BY i.location_id', 'Aggregate last; the sum across locations should equal SUM(amount) FROM charges = 11570.'],
    ],
    visual: { type: 'order' },
    internals: `<p>Errors also follow the logical order. SQLite reports the <b>first</b> problem it finds while compiling, and the message tells you which stage failed:</p>
<ul>
<li><code>no such table: invoice</code> / <code>no such column: i.totl</code>: a name problem in FROM or anywhere (typo, wrong alias, alias not yet defined).</li>
<li><code>ambiguous column name: payor_id</code>: two joined tables share the name; prefix it with an alias.</li>
<li><code>misuse of aggregate: SUM()</code>: an aggregate in WHERE (which runs before grouping). Move it to HAVING.</li>
<li><code>misuse of window function</code>: a window function in WHERE/GROUP BY. Compute it in a CTE first.</li>
<li><code>near "FROM": syntax error</code>: usually a trailing comma in the SELECT list just before FROM.</li>
</ul>
<p>Note that SQLite does not complain about a bare column in an aggregate query (<code>SELECT location_id, patient_id, COUNT(*) ... GROUP BY location_id</code>); it silently picks a value from some row. Stricter engines raise an error.</p>`,
    mistakes: [
      { wrong: `SELECT i.location_id, SUM(i.total_amount) AS billed
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id
GROUP BY i.location_id;`, why: 'Fan-out: after joining charges each invoice appears once per charge line, so its total_amount is summed 2, 3 or 4 times. Counting rows after the join (104 vs 48) reveals it immediately.', fix: `SELECT i.location_id, SUM(i.total_amount) AS billed
FROM invoices i
WHERE EXISTS (SELECT 1 FROM charges c WHERE c.invoice_id = i.invoice_id)
GROUP BY i.location_id;` },
      { wrong: `SELECT p.payor_type, COUNT(*) AS invoices
FROM invoices i JOIN payors p ON p.payor_id = i.payor_id
GROUP BY p.payor_type;   -- sums to 46, not 48`, why: 'Lost rows: 2 invoices have a NULL payor_id and vanish in the inner join. The count after the join (46) is lower than the driving table (48).', fix: `SELECT COALESCE(p.payor_type, 'No payor') AS payor_type, COUNT(*) AS invoices
FROM invoices i LEFT JOIN payors p ON p.payor_id = i.payor_id
GROUP BY 1;` },
      { wrong: `SELECT invoice_id, total_amount, FROM invoices;`, why: '"near FROM: syntax error" is the classic trailing comma before FROM, often left after deleting the last column while debugging.', fix: `SELECT invoice_id, total_amount FROM invoices;` },
    ],
    rules: [
      'Know the grain of every step: "one row per ___".',
      'Count after each JOIN: more rows = fan-out, fewer rows = lost matches.',
      'Compare COUNT(*) with COUNT(DISTINCT key) to detect duplicates.',
      'Debug CTE chains one CTE at a time.',
      'Reconcile the final total with a simple trusted query.',
    ],
    compare: `<table><tr><th>Symptom</th><th>Likely cause</th><th>Check</th></tr>
<tr><td>Totals too high (2x, 3x)</td><td>Fan-out from a 1:N join</td><td>COUNT(*) vs COUNT(DISTINCT parent_id)</td></tr>
<tr><td>Totals too low / rows missing</td><td>Inner join or WHERE dropping NULL / unmatched rows</td><td>LEFT JOIN ... WHERE right.key IS NULL</td></tr>
<tr><td>LEFT JOIN acting like INNER</td><td>Filter on the right table in WHERE</td><td>Move the condition into ON</td></tr>
<tr><td>Everything NULL</td><td>Joined on the wrong column</td><td>SELECT both key columns side by side</td></tr>
<tr><td>Error mentions a stage</td><td>Clause used too early (alias, aggregate, window)</td><td>Walk the logical order</td></tr></table>`,
    realWorld: 'When a revenue dashboard shows billed amounts twice as high as the general ledger, analysts rebuild the query step by step with row counts. The culprit is almost always a join added later (payments, charges, diagnoses) that multiplied invoice rows.',
    tips: [
      'Keep a scratch query with a COUNT(*) version of each step next to the real one.',
      'Temporarily add the key columns of every joined table to the SELECT to see what matched.',
      'Comment out joins from the bottom up to find the one that changes the count.',
    ],
    deep: `<p>Pre-aggregate before joining when two child tables hang off the same parent. Joining invoices to both charges (N rows) and payments (M rows) produces N × M rows per invoice: a <b>chasm trap</b>. Summing charges and payments separately in CTEs (one row per invoice each) and then joining keeps the grain at one row per invoice. A quick automated guard is to assert that <code>COUNT(*) = COUNT(DISTINCT invoice_id)</code> in the joined CTE; if it fails, the grain has changed.</p>`,
    tryIt: {
      prompt: 'See the chasm trap: join invoices to both charges and payments for invoice 7, and count the rows. Then fix it by aggregating charges and payments in separate CTEs first.',
      starter: `SELECT i.invoice_id,
       COUNT(*)            AS joined_rows,
       SUM(c.amount)       AS charges_total_wrong,
       SUM(pm.amount)      AS payments_total_wrong
FROM invoices i
JOIN charges  c  ON c.invoice_id  = i.invoice_id
JOIN payments pm ON pm.invoice_id = i.invoice_id
WHERE i.invoice_id = 7
GROUP BY i.invoice_id;`,
    },
    challenge: {
      level: 3,
      buggy: `SELECT i.location_id,
       COUNT(*)              AS invoices,
       SUM(i.total_amount)   AS billed,
       COUNT(c.charge_id)    AS charge_lines
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id
WHERE i.status <> 'Void'
GROUP BY i.location_id
ORDER BY i.location_id;`,
      prompt: 'This location report should show, for non-void invoices, the number of invoices, the billed amount (sum of total_amount) and the number of charge lines per location. The invoice count and billed amount are inflated. Debug it (count rows after the join) and fix it so all three columns are correct. Keep the same columns and order.',
      solution: `WITH charge_counts AS (
  SELECT invoice_id, COUNT(*) AS charge_lines
  FROM charges
  GROUP BY invoice_id
)
SELECT i.location_id,
       COUNT(*)                          AS invoices,
       SUM(i.total_amount)               AS billed,
       COALESCE(SUM(cc.charge_lines), 0) AS charge_lines
FROM invoices i
LEFT JOIN charge_counts cc ON cc.invoice_id = i.invoice_id
WHERE i.status <> 'Void'
GROUP BY i.location_id
ORDER BY i.location_id;`,
      hints: [
        'Run SELECT COUNT(*) on the FROM + JOIN part: it is 104, not 47. Each invoice repeats once per charge.',
        'The fix: make charges one row per invoice BEFORE joining.',
        'Pre-aggregate charges in a CTE: SELECT invoice_id, COUNT(*) AS charge_lines FROM charges GROUP BY invoice_id.',
        'Join that CTE to invoices, then COUNT(*) invoices, SUM(i.total_amount) and SUM(cc.charge_lines) per location.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'After adding a JOIN, the row count goes from 48 to 104. What happened?', options: ['Rows were lost', 'Fan-out: a one-to-many join repeated parent rows', 'A syntax error', 'The WHERE clause ran twice'], answer: 1, why: 'Each invoice now appears once per matching charge.' },
      { q: 'An inner join makes the count drop from 48 to 46. What should you check?', options: ['Duplicate keys', 'Rows with no match (e.g. NULL foreign keys)', 'ORDER BY', 'Indexes'], answer: 1, why: 'Inner joins drop unmatched rows; a LEFT JOIN ... IS NULL finds them.' },
      { q: 'SQLite says "misuse of aggregate: SUM()". Where is the SUM most likely?', options: ['In SELECT', 'In WHERE', 'In HAVING', 'In ORDER BY'], answer: 1, why: 'WHERE runs before grouping, so aggregates are not allowed there.' },
    ],
  },

  // ---------------------------------------------------------------- 10
  {
    id: 'execution-10',
    goals: [
      'Write expected-result tests: a query that returns PASS or FAIL',
      'Use row-count and uniqueness assertions to protect a query\'s grain',
      'Reconcile two sources that must agree (invoices vs ledger vs payments)',
      'Test NULLs and edge cases on purpose',
      'Diff two versions of a query with EXCEPT in both directions',
    ],
    concept: `<p>A query that runs is not a query that is right. <b>Testing SQL</b> means writing small queries that check facts you know must be true, so a wrong result becomes a visible <b>FAIL</b>.</p>
<ul>
<li><b>Expected result</b>: compare the output with a known answer. <code>SELECT CASE WHEN (SELECT COUNT(*) FROM invoices) = 48 THEN 'PASS' ELSE 'FAIL' END</code>.</li>
<li><b>Row-count / grain assertions</b>: "one row per invoice" means <code>COUNT(*) = COUNT(DISTINCT invoice_id)</code>.</li>
<li><b>Integrity tests</b>: no orphans (every charge has an invoice), no NULLs where they are not allowed, amounts never negative.</li>
<li><b>Reconciliation</b>: two independent paths to the same number must agree. The sum of charges per invoice should equal the invoice total; the ledger balance should equal total minus payments.</li>
<li><b>Edge cases</b>: NULL payors, void invoices, invoices with no charges, boundary dates. Your query must handle each on purpose.</li>
<li><b>Diffing</b>: when you rewrite a query, <code>(old EXCEPT new)</code> and <code>(new EXCEPT old)</code> must both be empty.</li>
</ul>
<p>A good test returns <b>nothing</b> (or PASS) when all is well and the <b>offending rows</b> when it is not.</p>`,
    why: 'Billing numbers go to patients, payors and auditors. Tests catch silent errors (fan-out, dropped NULLs, a changed status code) before a wrong statement is mailed or a wrong total is reported to finance.',
    when: 'After writing or changing any saved query or view, after every data load, before a month-end close, and when refactoring a query for performance (the result must not change).',
    analogy: "At month-end the billing office balances the books: total charges posted must equal total invoiced; cash in the bank must equal payments recorded. If the two sides don't match, they don't publish the report; they list the invoices that disagree and investigate.",
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id IN (1, 6, 24, 37) ORDER BY invoice_id`,
    syntax: `-- assertion: returns PASS / FAIL
SELECT 'test name' AS test,
       CASE WHEN <actual> = <expected> THEN 'PASS' ELSE 'FAIL' END AS result;

-- "should return no rows" test
SELECT ... FROM ... WHERE <something that must never be true>;

-- diff two queries
SELECT * FROM (old_query) EXCEPT SELECT * FROM (new_query);
SELECT * FROM (new_query) EXCEPT SELECT * FROM (old_query);`,
    sql: `SELECT 'invoices: row count is 48' AS test,
       CASE WHEN (SELECT COUNT(*) FROM invoices) = 48 THEN 'PASS' ELSE 'FAIL' END AS result
UNION ALL
SELECT 'invoices: invoice_id is unique',
       CASE WHEN (SELECT COUNT(*) - COUNT(DISTINCT invoice_id) FROM invoices) = 0 THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'charges: no orphan invoice_id',
       CASE WHEN NOT EXISTS (SELECT 1 FROM charges c
                             WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.invoice_id = c.invoice_id))
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'charges: amount = units * unit_price',
       CASE WHEN NOT EXISTS (SELECT 1 FROM charges WHERE ROUND(amount - units * unit_price, 2) <> 0)
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'reconcile: SUM(charges) = invoice total (non-void)',
       CASE WHEN NOT EXISTS (
              SELECT i.invoice_id FROM invoices i
              LEFT JOIN charges c ON c.invoice_id = i.invoice_id
              WHERE i.status <> 'Void'
              GROUP BY i.invoice_id, i.total_amount
              HAVING ROUND(COALESCE(SUM(c.amount), 0) - i.total_amount, 2) <> 0)
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'payments: never more than invoice total',
       CASE WHEN NOT EXISTS (
              SELECT 1 FROM invoices i JOIN payments pm ON pm.invoice_id = i.invoice_id
              GROUP BY i.invoice_id, i.total_amount
              HAVING SUM(pm.amount) > i.total_amount)
            THEN 'PASS' ELSE 'FAIL' END;`,
    breakdown: [
      ["'invoices: row count is 48'", 'Expected-result test: the known size of the table after the load.'],
      ['COUNT(*) - COUNT(DISTINCT invoice_id) = 0', 'Uniqueness / grain assertion: no invoice appears twice.'],
      ['NOT EXISTS (... NOT EXISTS ...)', 'Integrity test: no charge points at a missing invoice (orphan check).'],
      ['ROUND(amount - units * unit_price, 2) <> 0', 'Row-level rule, rounded to cents to avoid floating-point noise.'],
      ['HAVING ROUND(COALESCE(SUM(c.amount), 0) - i.total_amount, 2) <> 0', 'Reconciliation: two paths to the invoice amount must agree. COALESCE handles invoices with no charges (edge case).'],
      ["'payments: never more than invoice total'", 'FAILS on purpose: invoice 1 has a duplicate patient payment (330 paid on 165). Tests find real data problems.'],
      ['UNION ALL', 'Stack all tests into one small PASS/FAIL report.'],
    ],
    visual: { type: 'flow', steps: [['Write the query', 'e.g. open balance per invoice'], ['Know the grain', 'assert COUNT(*) = COUNT(DISTINCT invoice_id)'], ['Reconcile', 'compare with an independent path (ledger, charges)'], ['Edge cases', 'NULL payor, void, no charges, boundary dates'], ['Refactor?', 'old EXCEPT new and new EXCEPT old both empty'], ['Result', 'PASS: publish; FAIL: list offending rows']] },
    internals: `<p><code>EXCEPT</code> compares whole rows and removes duplicates, so a diff can miss a row that appears twice in one result and once in the other. For duplicate-sensitive comparisons, compare counts per row: <code>GROUP BY</code> all columns with <code>COUNT(*)</code> in each query, then EXCEPT those. Also note that EXCEPT treats two NULLs as equal (unlike <code>=</code>), which is exactly what a diff needs. Floating-point amounts should be <code>ROUND</code>ed to cents before comparing, or 0.1 + 0.2 will not "equal" 0.3.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id FROM invoices i
WHERE total_amount <> (SELECT SUM(amount) FROM charges c WHERE c.invoice_id = i.invoice_id);`, why: 'Invoice 37 has no charges, so the subquery returns NULL and "0 <> NULL" is unknown: the edge case is silently skipped. Tests must handle NULL on purpose.', fix: `SELECT invoice_id FROM invoices i
WHERE total_amount <> COALESCE((SELECT SUM(amount) FROM charges c WHERE c.invoice_id = i.invoice_id), 0);` },
      { wrong: `SELECT location_id, SUM(total_amount) FROM invoices GROUP BY location_id
EXCEPT
SELECT location_id, SUM(total_amount) FROM invoices WHERE status <> 'Void' GROUP BY location_id;`, why: 'Only one direction of the diff. Rows that exist in the new query but not the old one are never shown. Always run EXCEPT both ways (or UNION ALL both directions with a label).', fix: `SELECT 'only in old' AS side, * FROM (
  SELECT location_id, SUM(total_amount) AS billed FROM invoices GROUP BY location_id
  EXCEPT
  SELECT location_id, SUM(total_amount) FROM invoices WHERE status <> 'Void' GROUP BY location_id)
UNION ALL
SELECT 'only in new', * FROM (
  SELECT location_id, SUM(total_amount) FROM invoices WHERE status <> 'Void' GROUP BY location_id
  EXCEPT
  SELECT location_id, SUM(total_amount) FROM invoices GROUP BY location_id);` },
    ],
    rules: [
      'A test returns no rows (or PASS) when correct and the bad rows when not.',
      'Assert the grain: COUNT(*) = COUNT(DISTINCT key).',
      'Reconcile with an independent path to the same number.',
      'Test NULLs, voids, empty children and boundary dates on purpose.',
      'Diff rewrites with EXCEPT in BOTH directions; round money first.',
    ],
    compare: `<table><tr><th>Test type</th><th>Question it answers</th><th>Example</th></tr>
<tr><td>Expected result</td><td>Is the answer what we know it should be?</td><td>48 invoices after the load</td></tr>
<tr><td>Grain / uniqueness</td><td>One row per key?</td><td>COUNT(*) = COUNT(DISTINCT invoice_id)</td></tr>
<tr><td>Integrity</td><td>Do references and rules hold?</td><td>No orphan charges; amount = units × price</td></tr>
<tr><td>Reconciliation</td><td>Do two sources agree?</td><td>Ledger balance = total - payments</td></tr>
<tr><td>Regression diff</td><td>Did a rewrite change the result?</td><td>old EXCEPT new, new EXCEPT old</td></tr></table>`,
    realWorld: 'Data teams run tests like these automatically after every load (dbt tests: unique, not_null, relationships, accepted_values; Great Expectations). Finance runs reconciliation queries at month-end: charges vs invoices, payments vs bank deposits, ledger vs A/R aging.',
    tips: [
      'Save tests as views (test_no_orphan_charges) so anyone can run them.',
      'Give every test a clear name that states the rule it checks.',
      'When a test fails, first decide: is the data wrong or is the rule wrong?',
    ],
    deep: `<p>Tests turn into a safety net only when they run automatically. In dbt, a test is literally a SELECT that must return zero rows; the framework runs every test after each model build and fails the pipeline otherwise. For performance refactors, a common pattern is a <b>checksum</b> comparison: compute <code>COUNT(*)</code>, <code>SUM(amount)</code> and a hash aggregate over both versions and compare three numbers instead of millions of rows. Reconciliation failures are often real business events (the duplicate payment and REFUND on invoice 1, the ADJUSTMENT on invoice 6, the WRITE_OFF on invoice 24), so a good reconciliation report explains differences by transaction type instead of just flagging them.</p>`,
    tryIt: {
      prompt: 'Refactor check: the second query is a "faster" rewrite of the first. Diff them in both directions. Are they equivalent? Why or why not?',
      starter: `WITH old_q AS (
  SELECT p.payor_name, SUM(i.total_amount) AS billed
  FROM invoices i JOIN payors p ON p.payor_id = i.payor_id
  GROUP BY p.payor_name
),
new_q AS (
  SELECT p.payor_name, SUM(i.total_amount) AS billed
  FROM invoices i JOIN payors p ON p.payor_id = i.payor_id
  WHERE i.status <> 'Void'
  GROUP BY p.payor_name
)
SELECT 'only in old' AS side, * FROM (SELECT * FROM old_q EXCEPT SELECT * FROM new_q)
UNION ALL
SELECT 'only in new', * FROM (SELECT * FROM new_q EXCEPT SELECT * FROM old_q);`,
    },
    challenge: {
      level: 3,
      prompt: 'Reconciliation test: for every invoice, compute calc_balance = total_amount minus the sum of its payments (0 if none) and ledger_balance = the sum of its transactions.amount (0 if none). Return invoice_id, calc_balance and ledger_balance only for invoices where the two differ after rounding to 2 decimals. Order by invoice_id.',
      solution: `WITH paid AS (
  SELECT invoice_id, SUM(amount) AS paid_amount FROM payments GROUP BY invoice_id
),
ledger AS (
  SELECT invoice_id, SUM(amount) AS ledger_balance FROM transactions GROUP BY invoice_id
)
SELECT i.invoice_id,
       i.total_amount - COALESCE(p.paid_amount, 0) AS calc_balance,
       COALESCE(l.ledger_balance, 0)               AS ledger_balance
FROM invoices i
LEFT JOIN paid   p ON p.invoice_id = i.invoice_id
LEFT JOIN ledger l ON l.invoice_id = i.invoice_id
WHERE ROUND(i.total_amount - COALESCE(p.paid_amount, 0), 2) <> ROUND(COALESCE(l.ledger_balance, 0), 2)
ORDER BY i.invoice_id;`,
      hints: [
        'Pre-aggregate payments and transactions per invoice in two CTEs (joining both raw tables at once causes fan-out).',
        'LEFT JOIN both CTEs to invoices so invoices without payments or transactions are kept; COALESCE the sums to 0.',
        'Compare ROUND(calc, 2) <> ROUND(ledger, 2) in WHERE.',
        'You should find 3 invoices; each difference is explained by a REFUND, ADJUSTMENT or WRITE_OFF in transactions.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What should a well-written "must never happen" test return when the data is correct?', options: ['All rows', 'No rows', 'An error', 'NULL'], answer: 1, why: 'Zero rows = pass; any returned rows are the offenders.' },
      { q: 'Why run EXCEPT in both directions when diffing two queries?', options: ['EXCEPT is not commutative: A EXCEPT B only shows rows missing from B', 'For speed', 'SQLite requires it', 'To remove NULLs'], answer: 0, why: 'Rows only in the new result appear only in new EXCEPT old.' },
      { q: 'Which assertion checks that a query has one row per invoice?', options: ['COUNT(*) > 0', 'COUNT(*) = COUNT(DISTINCT invoice_id)', 'SUM(total_amount) > 0', 'MAX(invoice_id) = 48'], answer: 1, why: 'If any invoice repeats, COUNT(*) exceeds the distinct count.' },
    ],
  },
]);
