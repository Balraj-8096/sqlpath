// Section 10: Query Optimization & Performance (optimization-01 .. optimization-22)
// Runnable examples use SQLite EXPLAIN QUERY PLAN. PostgreSQL-only output (EXPLAIN ANALYZE, statistics,
// partitioning, memory) is shown as text in concept/deep.
Lessons.add([
  // ---------------------------------------------------------------- 01
  {
    id: 'optimization-01',
    goals: [
      'What "query performance" really means (time, reads, memory)',
      'Why the same answer can be cheap or expensive to produce',
      'The main levers: read less, index well, return less',
      'How to see the cost with EXPLAIN QUERY PLAN',
    ],
    concept: `<p><b>Query performance</b> is how much work the database has to do to give you an answer. Two queries can return the exact same rows, yet one reads 10 rows and the other reads 10 million.</p>
<p>Work is measured in a few ways:</p>
<ul>
<li><b>Rows and pages read</b>: how much data the engine touches (disk and memory).</li>
<li><b>CPU</b>: comparing, sorting, hashing, computing expressions.</li>
<li><b>Memory</b>: sorts and hash tables need working space.</li>
<li><b>Network</b>: every column and row you return has to travel to the application.</li>
</ul>
<p>The golden rule: <b>the fastest row is the one you never read</b>. Good performance comes from letting the database skip data (indexes, good filters) and returning only what you need.</p>`,
    why: 'Billing tables grow every day. A query that is instant on 100 charges can take minutes on 100 million, and slow queries block staff, reports and claims submission.',
    when: 'Think about performance whenever a query runs often (screens, APIs), touches big tables (charges, transactions), or feeds a scheduled report.',
    analogy: 'Finding one patient chart: a clerk can walk every shelf of the records room (slow) or use the alphabetical index card cabinet to go straight to the right drawer (fast). Same chart, very different effort.',
    syntax: `EXPLAIN QUERY PLAN\nSELECT needed_columns\nFROM table\nWHERE selective_condition;`,
    sql: `SELECT charge_id, cpt_code, amount\nFROM charges\nWHERE invoice_id = 13;`,
    breakdown: [
      ['SELECT charge_id, cpt_code, amount', 'Only the three columns the screen needs, not SELECT *'],
      ['FROM charges', 'The biggest table in our billing schema (104 rows here, millions in production)'],
      ['WHERE invoice_id = 13', 'A selective filter: only 3 of 104 charges match. Without an index the engine still has to look at all 104.'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_charges_invoice ON charges(invoice_id)` },
    internals: `<p>Without an index, SQLite answers this with <code>SCAN charges</code>: it reads every row of the table and tests <code>invoice_id = 13</code> on each. After <code>CREATE INDEX idx_charges_invoice ON charges(invoice_id)</code> the plan becomes <code>SEARCH charges USING INDEX idx_charges_invoice (invoice_id=?)</code>: it walks a B-tree straight to the 3 matching entries and then fetches only those rows.</p>
<p>The cost of a scan grows with table size (O(n)). The cost of an index search grows with the depth of the tree (O(log n)), which stays at 3-4 levels even for hundreds of millions of rows.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM charges WHERE invoice_id = 13;`, why: 'SELECT * drags every column over the wire and prevents covering indexes from helping. Screens rarely need all columns.', fix: `SELECT charge_id, cpt_code, amount FROM charges WHERE invoice_id = 13;` },
      { wrong: `SELECT charge_id, amount FROM charges;  -- then filter invoice 13 in the application`, why: 'Filtering in the app means the database ships all rows over the network. Let the database filter.', fix: `SELECT charge_id, amount FROM charges WHERE invoice_id = 13;` },
    ],
    rules: [
      'Read less: filter early and selectively.',
      'Return less: list only the columns you need.',
      'Measure, do not guess: check the plan with EXPLAIN.',
      'Optimize the queries that run most often or touch the most data first.',
    ],
    compare: `<table><tr><th></th><th>Slow pattern</th><th>Fast pattern</th></tr>
<tr><td>Access</td><td>SCAN every row</td><td>SEARCH using an index</td></tr>
<tr><td>Columns</td><td>SELECT *</td><td>Only needed columns</td></tr>
<tr><td>Filtering</td><td>In the application</td><td>In the WHERE clause</td></tr>
<tr><td>Growth</td><td>Gets slower as the table grows</td><td>Stays nearly flat</td></tr></table>`,
    realWorld: 'A patient-portal "view my bill" page runs this kind of query thousands of times a day. With an index on charges(invoice_id) each call is a few page reads; without it every call reads the whole charges table.',
    tips: ['A query that "feels fast" on test data can still be a full scan. Always look at the plan.'],
    deep: `<p>Production engines use a <b>cost model</b>: each plan gets an estimated cost in abstract units (roughly "page reads + CPU work"). PostgreSQL shows it as <code>cost=startup..total</code>. The optimizer picks the plan with the lowest estimated cost, which is only as good as its statistics (see the Statistics lesson).</p>`,
    tryIt: { prompt: 'Run EXPLAIN QUERY PLAN on the query, then create the index and run it again. Watch SCAN turn into SEARCH.', starter: `EXPLAIN QUERY PLAN\nSELECT charge_id, cpt_code, amount FROM charges WHERE invoice_id = 13;\n\n-- then uncomment and run again:\n-- CREATE INDEX idx_charges_invoice ON charges(invoice_id);` },
    challenge: {
      level: 1,
      prompt: 'The invoice screen for invoice 13 only needs charge_id, cpt_code and amount. Write the lean query, ordered by charge_id.',
      solution: `SELECT charge_id, cpt_code, amount FROM charges WHERE invoice_id = 13 ORDER BY charge_id;`,
      hints: ['Which table holds line items? charges.', 'List only the three columns asked for, not *.', 'Filter with WHERE invoice_id = 13.', 'Finish with ORDER BY charge_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Two queries return identical rows. What can still differ?', options: ['Nothing', 'The amount of work (rows read, CPU, memory)', 'Only the column names', 'The data types'], answer: 1, why: 'The result is the same, but one may scan the whole table while the other uses an index.' },
      { q: 'What does SCAN charges mean in an SQLite plan?', options: ['An index lookup', 'Every row of charges is read', 'The table is cached', 'Only the first row is read'], answer: 1, why: 'SCAN = full table scan; SEARCH = targeted lookup using an index or the primary key.' },
    ],
  },
  // ---------------------------------------------------------------- 02
  {
    id: 'optimization-02',
    goals: ['The stages a query goes through: parse, rewrite, plan, execute', 'What the optimizer decides for you', 'Why SQL is declarative ("what", not "how")', 'How rows flow through operators'],
    concept: `<p>When you send SQL to a database it does not just "run it". It goes through a pipeline:</p>
<ol>
<li><b>Parse</b>: check the syntax and build a tree of the statement.</li>
<li><b>Bind / analyze</b>: resolve table and column names, check types and permissions.</li>
<li><b>Rewrite</b>: expand views, flatten simple subqueries, simplify expressions.</li>
<li><b>Optimize (plan)</b>: consider many ways to get the answer (which index, join order, join algorithm) and pick the cheapest.</li>
<li><b>Execute</b>: run the chosen plan, streaming rows from operator to operator.</li>
</ol>
<p>SQL is <b>declarative</b>: you describe <i>what</i> you want; the optimizer decides <i>how</i>. Performance tuning is mostly about helping the optimizer find a cheap "how".</p>`,
    why: 'Knowing the pipeline tells you where time goes and which part (usually planning choices or execution work) you can influence.',
    when: 'Useful whenever you read a plan, wonder why a query is slow, or need to explain why rewriting a query changed its speed.',
    analogy: 'A claim goes through intake (parse), eligibility check (bind), coding clean-up (rewrite), routing to the cheapest clearinghouse (plan) and finally submission (execute).',
    syntax: `-- Every statement: parse -> bind -> rewrite -> plan -> execute\nEXPLAIN QUERY PLAN <your query>;`,
    sql: `SELECT i.invoice_id, SUM(c.amount) AS charged\nFROM invoices i\nJOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.status = 'Overdue'\nGROUP BY i.invoice_id;`,
    breakdown: [
      ['FROM invoices i JOIN charges c', 'The planner decides which table to read first and how to match rows'],
      ['WHERE i.status = \'Overdue\'', 'A filter the planner tries to apply as early as possible'],
      ['GROUP BY i.invoice_id', 'Needs grouping: a temporary B-tree or an ordered index'],
      ['SUM(c.amount)', 'Computed during execution as rows stream in'],
    ],
    visual: { type: 'flow', steps: [['Parse', 'SQL text -> syntax tree'], ['Bind', 'invoices, charges, columns resolved'], ['Rewrite', 'aliases / views expanded'], ['Plan', 'SCAN c, SEARCH i USING INTEGER PRIMARY KEY, TEMP B-TREE FOR GROUP BY'], ['Execute', '104 charges read -> 25 overdue charges -> 13 groups']] },
    internals: `<p>SQLite compiles every statement into bytecode for its virtual machine (you can see it with plain <code>EXPLAIN</code>). The planner in <code>where.c</code> estimates the cost of each candidate loop order and index. The chosen plan is a set of <b>nested loops</b>: the outer loop reads one table, the inner loop looks up matches in the other.</p>
<p>Server databases (PostgreSQL, SQL Server, Oracle) build a tree of operators (Seq Scan, Index Scan, Hash Join, Sort, Aggregate). Each operator pulls rows from its children one at a time: the <b>iterator (Volcano) model</b>.</p>`,
    mistakes: [
      { wrong: `-- "SQL runs top to bottom, so put the big table last to make it fast"`, why: 'The order of tables in FROM is usually not the execution order. The optimizer reorders joins by estimated cost.', fix: `EXPLAIN QUERY PLAN SELECT i.invoice_id FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id;` },
    ],
    rules: ['You write WHAT; the optimizer chooses HOW.', 'Planning uses estimates; execution does the real work.', 'The plan, not the SQL text, determines speed.'],
    compare: `<table><tr><th>Stage</th><th>Question it answers</th><th>Can fail with</th></tr>
<tr><td>Parse</td><td>Is it valid SQL?</td><td>syntax error</td></tr>
<tr><td>Bind</td><td>Do the tables/columns exist?</td><td>no such column</td></tr>
<tr><td>Plan</td><td>What is the cheapest way?</td><td>(a slow plan)</td></tr>
<tr><td>Execute</td><td>Produce the rows</td><td>constraint / runtime errors</td></tr></table>`,
    realWorld: 'Applications use prepared statements so parse and plan happen once and execution is repeated for each patient or invoice id, saving CPU on busy billing APIs.',
    deep: `<p>Planning is itself expensive for big joins: the number of possible join orders grows factorially. PostgreSQL switches from exhaustive search to a genetic algorithm (GEQO) above 12 tables; SQL Server uses a staged search with time-outs. Plan caches store the chosen plan so repeated queries skip optimization, which can backfire when a cached plan was built for untypical parameter values ("parameter sniffing").</p>`,
    tryIt: { prompt: 'Run EXPLAIN QUERY PLAN on the query. Which table does SQLite read first? Swap the table order in FROM and check whether the plan changes.', starter: `EXPLAIN QUERY PLAN\nSELECT i.invoice_id, SUM(c.amount)\nFROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.status = 'Overdue'\nGROUP BY i.invoice_id;` },
    challenge: {
      level: 2,
      prompt: 'Return each Overdue invoice_id with the sum of its charge amounts (as charged), ordered by invoice_id.',
      solution: `SELECT i.invoice_id, SUM(c.amount) AS charged FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id WHERE i.status = 'Overdue' GROUP BY i.invoice_id ORDER BY i.invoice_id;`,
      hints: ['You need invoices (status) and charges (amount).', 'Join on invoice_id.', 'Filter status = \'Overdue\' and GROUP BY invoice_id.', 'SUM(c.amount), then ORDER BY i.invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which stage chooses between an index and a full scan?', options: ['Parse', 'Bind', 'Optimize / plan', 'Execute'], answer: 2, why: 'The optimizer compares candidate plans and picks the cheapest.' },
      { q: 'Does the order of tables in FROM fix the join order?', options: ['Yes, always', 'Usually no; the optimizer reorders joins', 'Only in SQLite', 'Only for LEFT JOIN'], answer: 1, why: 'For inner joins the optimizer is free to reorder. Outer joins restrict some reorderings.' },
    ],
  },
  // ---------------------------------------------------------------- 03
  {
    id: 'optimization-03',
    goals: ['Use EXPLAIN / EXPLAIN QUERY PLAN to see the plan', 'Read SCAN, SEARCH, USING INDEX, TEMP B-TREE', 'Spot the expensive step', 'Compare EXPLAIN across databases'],
    concept: `<p><b>EXPLAIN</b> asks the database: "How would you run this query?" It does not return data; it returns the <b>plan</b>.</p>
<p>In SQLite use <code>EXPLAIN QUERY PLAN</code>. The words to look for:</p>
<ul>
<li><code>SCAN t</code>: reads the whole table (fine for small tables, bad for big ones).</li>
<li><code>SEARCH t USING INDEX idx (col=?)</code>: jumps to matching rows with an index.</li>
<li><code>USING COVERING INDEX</code>: the index alone has every needed column; the table is not touched.</li>
<li><code>USING INTEGER PRIMARY KEY (rowid=?)</code>: direct lookup by primary key.</li>
<li><code>USE TEMP B-TREE FOR ORDER BY / GROUP BY</code>: an extra sort step.</li>
</ul>`,
    why: 'You cannot fix what you cannot see. EXPLAIN shows whether your index is used and where the work happens.',
    when: 'Before adding an index, after adding one (to confirm it is used), and whenever a query is slower than expected.',
    analogy: 'EXPLAIN is like asking the billing supervisor for the work plan before starting: "First pull all overdue folders, then look up each patient\'s charges by invoice number."',
    syntax: `-- SQLite\nEXPLAIN QUERY PLAN SELECT ...;\n-- PostgreSQL / MySQL\nEXPLAIN SELECT ...;\n-- SQL Server\nSET SHOWPLAN_TEXT ON;`,
    sql: `SELECT charge_id, invoice_id, amount\nFROM charges\nWHERE cpt_code = '99213';`,
    breakdown: [
      ['SELECT charge_id, invoice_id, amount', 'Columns to return'],
      ['FROM charges', 'Without an index on cpt_code, the only option is SCAN charges'],
      ['WHERE cpt_code = \'99213\'', 'Equality filter: a perfect candidate for an index. With one, the plan becomes SEARCH charges USING INDEX (cpt_code=?)'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_charges_cpt ON charges(cpt_code)` },
    internals: `<p>SQLite has two forms: <code>EXPLAIN</code> prints the low-level bytecode program (OpenRead, Column, Ne, Next...), while <code>EXPLAIN QUERY PLAN</code> prints a readable summary with one line per loop. The <code>id</code> and <code>parent</code> columns build the tree: a row whose parent is another row's id is nested under it (for example the scan inside a subquery).</p>`,
    mistakes: [
      { wrong: `EXPLAIN SELECT * FROM charges WHERE cpt_code = '99213';  -- in SQLite`, why: 'In SQLite plain EXPLAIN shows virtual machine opcodes, not the readable plan. Use EXPLAIN QUERY PLAN.', fix: `EXPLAIN QUERY PLAN SELECT * FROM charges WHERE cpt_code = '99213';` },
      { wrong: `-- "I created the index, so it is used."`, why: 'Indexes are only used when the optimizer thinks they help and the WHERE clause can use them. Always confirm with EXPLAIN.', fix: `EXPLAIN QUERY PLAN SELECT charge_id FROM charges WHERE cpt_code = '99213';` },
    ],
    rules: ['EXPLAIN shows the plan, not the result.', 'SCAN on a big table = warning sign.', 'TEMP B-TREE = an extra sort.', 'Re-check the plan after every index change.'],
    compare: `<table><tr><th>Database</th><th>Estimated plan</th><th>Actual run statistics</th></tr>
<tr><td>SQLite</td><td>EXPLAIN QUERY PLAN</td><td>(none; use timers)</td></tr>
<tr><td>PostgreSQL</td><td>EXPLAIN</td><td>EXPLAIN ANALYZE</td></tr>
<tr><td>MySQL 8</td><td>EXPLAIN / EXPLAIN FORMAT=TREE</td><td>EXPLAIN ANALYZE</td></tr>
<tr><td>SQL Server</td><td>Estimated execution plan</td><td>Actual execution plan / SET STATISTICS IO</td></tr>
<tr><td>Oracle</td><td>EXPLAIN PLAN FOR + DBMS_XPLAN</td><td>DBMS_XPLAN.DISPLAY_CURSOR</td></tr></table>`,
    realWorld: 'Before a month-end CPT utilization report goes into production, a DBA checks its plan to make sure it does not full-scan years of charges.',
    deep: `<p>PostgreSQL <code>EXPLAIN</code> output for the same query without an index:</p>
<pre>Seq Scan on charges  (cost=0.00..2.30 rows=5 width=16)
  Filter: (cpt_code = '99213'::text)</pre>
<p>and with the index:</p>
<pre>Index Scan using idx_charges_cpt on charges  (cost=0.14..8.22 rows=5 width=16)
  Index Cond: (cpt_code = '99213'::text)</pre>
<p>Note that on a tiny table PostgreSQL may still prefer the Seq Scan because its estimated cost is lower. That is correct behaviour, not a bug.</p>`,
    tryIt: { prompt: 'Run the plan before and after creating the index. Then change the filter to cpt_code LIKE \'992%\' and see what the plan says.', starter: `EXPLAIN QUERY PLAN\nSELECT charge_id, invoice_id, amount FROM charges WHERE cpt_code = '99213';\n\n-- CREATE INDEX idx_charges_cpt ON charges(cpt_code);` },
    challenge: {
      level: 1,
      prompt: 'List charge_id, invoice_id and amount of every charge with CPT code 99213 (the query you just explained), ordered by charge_id.',
      solution: `SELECT charge_id, invoice_id, amount FROM charges WHERE cpt_code = '99213' ORDER BY charge_id;`,
      hints: ['The table is charges.', 'cpt_code is TEXT, so quote the value.', 'WHERE cpt_code = \'99213\' ORDER BY charge_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which SQLite command shows a readable plan?', options: ['EXPLAIN', 'EXPLAIN QUERY PLAN', 'SHOW PLAN', 'DESCRIBE'], answer: 1, why: 'Plain EXPLAIN shows bytecode; EXPLAIN QUERY PLAN shows the readable summary.' },
      { q: 'What does "USE TEMP B-TREE FOR ORDER BY" tell you?', options: ['An index is used for sorting', 'An extra sort step is needed', 'The query failed', 'The table is temporary'], answer: 1, why: 'SQLite builds a temporary structure to sort rows, which costs time and memory.' },
      { q: 'Does EXPLAIN QUERY PLAN return the query\'s data rows?', options: ['Yes', 'No, only the plan'], answer: 1, why: 'It describes how the query would run.' },
    ],
  },
  // ---------------------------------------------------------------- 04
  {
    id: 'optimization-04',
    goals: ['What EXPLAIN ANALYZE adds: actual rows and time', 'Compare estimated vs actual rows', 'Read loops, buffers and "Rows Removed by Filter"', 'Use it safely (it really runs the query)'],
    concept: `<p><b>EXPLAIN</b> shows the plan the database <i>intends</i> to use, with <b>estimates</b>. <b>EXPLAIN ANALYZE</b> actually <b>runs</b> the query and reports what really happened: real row counts, real time per step, how many times each step ran.</p>
<p>PostgreSQL example for overdue invoices with their charges:</p>
<pre>EXPLAIN (ANALYZE, BUFFERS)
SELECT i.invoice_id, c.amount
FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id
WHERE i.status = 'Overdue';

Hash Join  (cost=1.61..4.02 rows=13 width=12) (actual time=0.041..0.069 rows=25 loops=1)
  Hash Cond: (c.invoice_id = i.invoice_id)
  Buffers: shared hit=4
  -&gt;  Seq Scan on charges c  (cost=0.00..2.04 rows=104 width=12) (actual time=0.006..0.017 rows=104 loops=1)
  -&gt;  Hash  (cost=1.60..1.60 rows=13 width=4) (actual time=0.020..0.021 rows=13 loops=1)
        Buckets: 1024  Batches: 1  Memory Usage: 9kB
        -&gt;  Seq Scan on invoices i  (cost=0.00..1.60 rows=13 width=4) (actual time=0.005..0.015 rows=13 loops=1)
              Filter: (status = 'Overdue'::text)
              Rows Removed by Filter: 35
Planning Time: 0.180 ms
Execution Time: 0.098 ms</pre>
<p>Read it from the innermost (most indented) line outward. The key check: <b>estimated rows vs actual rows</b>. Here the Hash Join estimated 13 rows but produced 25. Small gaps are normal; gaps of 100x mean bad statistics and often a bad plan.</p>
<p>SQLite has no EXPLAIN ANALYZE, so the runnable example here shows the SQLite plan for the same query.</p>`,
    why: 'Estimates can be wrong. EXPLAIN ANALYZE shows reality, so you can find the step that actually costs the time.',
    when: 'When a query is slow in practice and the plain EXPLAIN looks reasonable, or when you suspect the row estimates are off.',
    analogy: 'EXPLAIN is the estimated appointment schedule; EXPLAIN ANALYZE is the timesheet at the end of the day showing how long each visit really took.',
    syntax: `-- PostgreSQL\nEXPLAIN (ANALYZE, BUFFERS) SELECT ...;\n-- MySQL 8.0.18+\nEXPLAIN ANALYZE SELECT ...;\n-- SQLite (estimate only)\nEXPLAIN QUERY PLAN SELECT ...;`,
    sql: `EXPLAIN QUERY PLAN\nSELECT i.invoice_id, c.amount\nFROM invoices i\nJOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.status = 'Overdue';`,
    breakdown: [
      ['EXPLAIN QUERY PLAN', 'SQLite\'s estimated plan (no timings). PostgreSQL would use EXPLAIN (ANALYZE, BUFFERS).'],
      ['FROM invoices i JOIN charges c', 'SQLite picks a nested loop: SCAN one table, look up the other'],
      ['WHERE i.status = \'Overdue\'', 'In PostgreSQL this shows up as "Filter" with "Rows Removed by Filter: 35"'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 560 200" width="100%"><text x="10" y="20" fill="var(--text)" font-size="13" font-weight="bold">Estimated vs actual rows (PostgreSQL EXPLAIN ANALYZE)</text>
<text x="10" y="55" fill="var(--text)" font-size="12">Seq Scan invoices</text><rect x="170" y="42" width="65" height="12" fill="var(--blue)"/><rect x="170" y="56" width="65" height="12" fill="var(--green)"/><text x="245" y="60" fill="var(--muted)" font-size="11">est 13 / actual 13</text>
<text x="10" y="100" fill="var(--text)" font-size="12">Seq Scan charges</text><rect x="170" y="87" width="300" height="12" fill="var(--blue)"/><rect x="170" y="101" width="300" height="12" fill="var(--green)"/><text x="478" y="105" fill="var(--muted)" font-size="11">104 / 104</text>
<text x="10" y="145" fill="var(--text)" font-size="12">Hash Join</text><rect x="170" y="132" width="65" height="12" fill="var(--blue)"/><rect x="170" y="146" width="125" height="12" fill="var(--red)"/><text x="305" y="150" fill="var(--muted)" font-size="11">est 13 / actual 25 (off by ~2x)</text>
<rect x="170" y="178" width="12" height="10" fill="var(--blue)"/><text x="188" y="187" fill="var(--text)" font-size="11">estimated</text><rect x="270" y="178" width="12" height="10" fill="var(--green)"/><text x="288" y="187" fill="var(--text)" font-size="11">actual (ok)</text><rect x="370" y="178" width="12" height="10" fill="var(--red)"/><text x="388" y="187" fill="var(--text)" font-size="11">actual (misestimated)</text></svg>` },
    internals: `<p>EXPLAIN ANALYZE instruments every plan node with timers and row counters. <code>actual time=a..b</code> is time to first row..time to last row, in ms, <b>per loop</b>. Multiply by <code>loops</code> for the total (an inner index scan with <code>loops=1000</code> and 0.01 ms each costs 10 ms). <code>Buffers: shared hit</code> = pages found in memory; <code>read</code> = pages fetched from disk.</p>`,
    mistakes: [
      { wrong: `EXPLAIN ANALYZE DELETE FROM payments WHERE amount < 0;  -- PostgreSQL`, why: 'EXPLAIN ANALYZE really executes the statement. This deletes the rows!', fix: `SELECT COUNT(*) FROM payments WHERE amount < 0;`  },
      { wrong: `-- Reading actual time without looking at loops`, why: 'Times are per loop. A cheap-looking inner step can dominate when it runs thousands of times.', fix: `EXPLAIN QUERY PLAN SELECT i.invoice_id FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id;` },
    ],
    rules: ['EXPLAIN ANALYZE runs the query: wrap DML in BEGIN ... ROLLBACK.', 'Compare estimated rows with actual rows at every node.', 'Time is per loop; multiply by loops.', 'Look for the node where time jumps.'],
    compare: `<table><tr><th></th><th>EXPLAIN</th><th>EXPLAIN ANALYZE</th></tr>
<tr><td>Runs the query?</td><td>No</td><td>Yes</td></tr>
<tr><td>Row counts</td><td>Estimated</td><td>Estimated + actual</td></tr>
<tr><td>Timing</td><td>No</td><td>Yes, per node</td></tr>
<tr><td>Safe on DML?</td><td>Yes</td><td>Only inside a rolled-back transaction</td></tr></table>`,
    realWorld: 'A revenue dashboard suddenly takes 30 seconds. EXPLAIN ANALYZE shows a nested loop estimated at 10 rows that actually ran 400,000 times, pointing to stale statistics on the charges table.',
    deep: `<p>Useful PostgreSQL options: <code>EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, WAL, FORMAT JSON)</code>. JSON output can be pasted into visualizers. Timing overhead can be significant on very fast nodes; <code>EXPLAIN (ANALYZE, TIMING OFF)</code> keeps row counts but drops per-node timing. The <code>auto_explain</code> extension logs plans of slow queries automatically.</p>`,
    dialectSql: {
      postgres: `EXPLAIN (ANALYZE, BUFFERS)\nSELECT i.invoice_id, c.amount\nFROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.status = 'Overdue';`,
      mysql: `EXPLAIN ANALYZE\nSELECT i.invoice_id, c.amount\nFROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.status = 'Overdue';`,
      sqlserver: `SET STATISTICS IO, TIME ON;\n-- then run with "Include Actual Execution Plan"\nSELECT i.invoice_id, c.amount\nFROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.status = 'Overdue';`,
      sqlite: `EXPLAIN QUERY PLAN\nSELECT i.invoice_id, c.amount\nFROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.status = 'Overdue';`,
    },
    tryIt: { prompt: 'In SQLite you can still compare estimated work with reality: count how many rows the filter keeps and how many join rows come out.', starter: `SELECT\n  (SELECT COUNT(*) FROM invoices WHERE status = 'Overdue') AS overdue_invoices,\n  (SELECT COUNT(*) FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id\n    WHERE i.status = 'Overdue') AS join_rows;` },
    challenge: {
      level: 2,
      prompt: 'Reproduce the "actual rows" of each plan node: return three numbers in one row: the total invoices, the Overdue invoices, and the rows produced by joining Overdue invoices to charges.',
      solution: `SELECT (SELECT COUNT(*) FROM invoices), (SELECT COUNT(*) FROM invoices WHERE status = 'Overdue'), (SELECT COUNT(*) FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id WHERE i.status = 'Overdue');`,
      hints: ['Use three scalar subqueries in one SELECT.', 'First: SELECT COUNT(*) FROM invoices.', 'Second adds WHERE status = \'Overdue\'.', 'Third joins charges ON c.invoice_id = i.invoice_id with the same filter.'],
    },
    quiz: [
      { q: 'What is the biggest risk of EXPLAIN ANALYZE on an UPDATE?', options: ['It is slow', 'It really updates the rows', 'It locks the database forever', 'Nothing'], answer: 1, why: 'ANALYZE executes the statement. Wrap it in BEGIN; ... ROLLBACK;.' },
      { q: 'A node shows rows=10 (estimated) and actual rows=50000. What does that suggest?', options: ['The query is fine', 'Statistics are stale or the estimate is poor', 'The index is corrupt', 'The disk is full'], answer: 1, why: 'Huge estimate errors lead the optimizer to pick bad plans. Refresh statistics (ANALYZE).' },
    ],
  },
  // ---------------------------------------------------------------- 05
  {
    id: 'optimization-05',
    goals: ['Read an execution plan as a tree', 'Know the common operators: scans, lookups, joins, sorts, aggregates', 'Find the outer and inner loop of a join', 'See how an index reshapes the plan'],
    concept: `<p>An <b>execution plan</b> is a tree of steps (operators). Leaves read data (table scans, index lookups). Inner nodes combine it (joins), reshape it (sort, aggregate) or filter it. Rows flow <b>up</b> the tree to the result.</p>
<p>In SQLite each line is a loop. For a join, the <b>first</b> line is the <b>outer loop</b> (read once) and the next line is the <b>inner loop</b> (run once per outer row). So:</p>
<pre>SCAN i                                            -- outer: every invoice
SEARCH c USING INDEX idx_charges_invoice (invoice_id=?)  -- inner: per invoice, jump to its charges</pre>
<p>is a nested loop join that is cheap because the inner side is an index search, not a scan.</p>`,
    why: 'Plans tell you exactly what the engine does. Reading them turns performance tuning from guessing into diagnosis.',
    when: 'Whenever you tune a query with joins, sorting or grouping, or when an index does not seem to help.',
    analogy: 'A plan is like the workflow chart on a billing department wall: pull overdue folders (outer), and for each folder look up its charge slips by invoice number (inner).',
    syntax: `EXPLAIN QUERY PLAN\nSELECT ...\nFROM a JOIN b ON ...\nWHERE ...\nORDER BY ...;`,
    sql: `SELECT i.invoice_id, i.due_date, c.cpt_code, c.amount\nFROM invoices i\nJOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.status = 'Overdue'\nORDER BY i.invoice_id;`,
    breakdown: [
      ['FROM invoices i JOIN charges c ON ...', 'Two loops: one outer, one inner'],
      ['WHERE i.status = \'Overdue\'', 'Filter on the outer table (13 of 48 invoices)'],
      ['ORDER BY i.invoice_id', 'If invoices is scanned in rowid order, no extra sort is needed'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_charges_invoice ON charges(invoice_id)` },
    internals: `<p>Before the index SQLite chooses <code>SCAN c</code> + <code>SEARCH i USING INTEGER PRIMARY KEY (rowid=?)</code>: it reads every charge and looks up its invoice by primary key, then sorts. After the index it flips the order: <code>SCAN i</code> (in invoice_id order, so no sort) + <code>SEARCH c USING INDEX idx_charges_invoice (invoice_id=?)</code>. The optimizer picked a different outer table because the index made the inner lookup on charges cheap.</p>`,
    mistakes: [
      { wrong: `-- "SEARCH means fast, so any plan with SEARCH is good"`, why: 'A SEARCH inside a loop that runs a million times is still a million lookups. Look at how many times each loop runs.', fix: `EXPLAIN QUERY PLAN SELECT i.invoice_id FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id WHERE i.status = 'Overdue';` },
    ],
    rules: ['Plans are trees; data flows from leaves to root.', 'In SQLite the first loop listed is the outer loop.', 'Inner loops should be SEARCH, not SCAN.', 'Watch for TEMP B-TREE sorts.'],
    compare: `<table><tr><th>SQLite text</th><th>PostgreSQL node</th><th>SQL Server operator</th></tr>
<tr><td>SCAN t</td><td>Seq Scan</td><td>Table Scan / Clustered Index Scan</td></tr>
<tr><td>SEARCH t USING INDEX</td><td>Index Scan</td><td>Index Seek + Key Lookup</td></tr>
<tr><td>USING COVERING INDEX</td><td>Index Only Scan</td><td>Index Seek (covering)</td></tr>
<tr><td>TEMP B-TREE FOR ORDER BY</td><td>Sort</td><td>Sort</td></tr>
<tr><td>(nested loops)</td><td>Nested Loop / Hash Join / Merge Join</td><td>Nested Loops / Hash Match / Merge Join</td></tr></table>`,
    realWorld: 'A collections work queue joins overdue invoices to their charges. Reading the plan shows the inner side is a full scan of charges; adding one index on charges(invoice_id) turns a 40-second queue into a 50 ms one.',
    deep: `<p>PostgreSQL plan for the same query with the index on a larger database:</p>
<pre>Sort  (cost=25.10..25.16 rows=25 width=24)
  Sort Key: i.invoice_id
  -&gt;  Nested Loop  (cost=0.14..24.52 rows=25 width=24)
        -&gt;  Seq Scan on invoices i  (cost=0.00..1.60 rows=13 width=8)
              Filter: (status = 'Overdue'::text)
        -&gt;  Index Scan using idx_charges_invoice on charges c  (cost=0.14..1.74 rows=2 width=20)
              Index Cond: (invoice_id = i.invoice_id)</pre>`,
    tryIt: { prompt: 'Explain the query, then add the index and explain again. Which table became the outer loop?', starter: `EXPLAIN QUERY PLAN\nSELECT i.invoice_id, c.cpt_code, c.amount\nFROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.status = 'Overdue'\nORDER BY i.invoice_id;\n\n-- CREATE INDEX idx_charges_invoice ON charges(invoice_id);` },
    challenge: {
      level: 2,
      prompt: 'Return invoice_id, due_date, cpt_code and amount for charges on Overdue invoices, ordered by invoice_id then charge_id.',
      solution: `SELECT i.invoice_id, i.due_date, c.cpt_code, c.amount FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id WHERE i.status = 'Overdue' ORDER BY i.invoice_id, c.charge_id;`,
      hints: ['Join invoices to charges on invoice_id.', 'Filter i.status = \'Overdue\'.', 'Select the four requested columns.', 'ORDER BY i.invoice_id, c.charge_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'In an SQLite plan with "SCAN i" then "SEARCH c USING INDEX", which is the outer loop?', options: ['SCAN i', 'SEARCH c', 'Both run once', 'Neither'], answer: 0, why: 'The first loop is outer; the SEARCH runs once for each row of i.' },
      { q: 'Why did adding the index remove the sort in this lesson?', options: ['Indexes always remove sorts', 'The planner switched to scanning invoices in invoice_id order', 'ORDER BY was ignored', 'SQLite caches sorts'], answer: 1, why: 'Scanning invoices by rowid already yields invoice_id order, so no TEMP B-TREE is needed.' },
    ],
  },
  // ---------------------------------------------------------------- 06
  {
    id: 'optimization-06',
    goals: ['What a full table scan is', 'When a scan is actually the best choice', 'Why functions and leading wildcards force scans', 'How to recognise SCAN in a plan'],
    concept: `<p>A <b>table scan</b> (full scan, sequential scan) reads <b>every row</b> of a table from start to finish and tests each one against the WHERE clause.</p>
<p>Scans are not always bad:</p>
<ul>
<li>Small tables (our 7 payors) are faster to scan than to look up.</li>
<li>If you need most of the rows (for example 80% of invoices), reading everything sequentially beats thousands of random index lookups.</li>
</ul>
<p>Scans are bad when the table is large and you need only a few rows: that is when an index should be used.</p>`,
    why: 'Most slow queries in production are big-table scans that should have been index lookups.',
    when: 'Check for SCAN whenever a query filters a large table (charges, transactions) by a selective condition.',
    analogy: 'Scanning is reading every page of the claims ledger to find one patient. Fine for a 3-page ledger, awful for a 3,000-page one.',
    syntax: `EXPLAIN QUERY PLAN SELECT ... FROM big_table WHERE col = ?;  -- look for SCAN big_table`,
    sql: `SELECT invoice_id, patient_id, due_date, total_amount\nFROM invoices\nWHERE status = 'Partially Paid';`,
    breakdown: [
      ['FROM invoices', '48 rows; without an index on status every row is read'],
      ['WHERE status = \'Partially Paid\'', 'Keeps only 6 rows, yet a scan examines all 48'],
      ['SELECT invoice_id, patient_id, due_date, total_amount', 'Columns to return for the 6 matches'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_invoices_status ON invoices(status)` },
    internals: `<p>A scan reads table pages in storage order, which is the most efficient way to read data sequentially (the disk and OS read ahead). Its cost is proportional to the table's size, not the number of matches. SQLite labels it <code>SCAN invoices</code>; after indexing status it becomes <code>SEARCH invoices USING INDEX idx_invoices_status (status=?)</code>.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM patients WHERE last_name LIKE '%son';`, why: 'A leading wildcard means the index on last_name cannot be used (the start of the value is unknown), so it scans.', fix: `SELECT * FROM patients WHERE last_name LIKE 'John%';` },
      { wrong: `SELECT * FROM invoices WHERE UPPER(status) = 'OVERDUE';`, why: 'Wrapping the column in a function hides it from a normal index, forcing a scan.', fix: `SELECT * FROM invoices WHERE status = 'Overdue';` },
    ],
    rules: ['Scan cost grows with table size, not with matches.', 'Scans are fine for tiny tables or when you need most rows.', 'Functions on columns and leading % wildcards usually force scans.'],
    compare: `<table><tr><th></th><th>Table scan</th><th>Index lookup</th></tr>
<tr><td>Reads</td><td>Every row</td><td>Only matching entries + their rows</td></tr>
<tr><td>Best for</td><td>Small tables, low selectivity</td><td>Large tables, high selectivity</td></tr>
<tr><td>I/O pattern</td><td>Sequential</td><td>Random</td></tr></table>`,
    realWorld: 'A nightly job that recalculates every invoice balance should scan: it needs every row anyway. The "find this patient\'s open invoices" screen should never scan.',
    deep: `<p>PostgreSQL shows scans as <code>Seq Scan on invoices ... Filter: (status = 'Partially Paid') Rows Removed by Filter: 42</code>. Large scans can run in parallel (<code>Parallel Seq Scan</code> with several workers). SQL Server and Oracle can switch to scans automatically when the estimated number of lookups passes a "tipping point" of roughly a few percent of the table.</p>`,
    tryIt: { prompt: 'Explain the query, create the index, explain again. Then try WHERE UPPER(status) = \'PARTIALLY PAID\' with the index in place.', starter: `EXPLAIN QUERY PLAN\nSELECT invoice_id, total_amount FROM invoices WHERE status = 'Partially Paid';\n\n-- CREATE INDEX idx_invoices_status ON invoices(status);` },
    challenge: {
      level: 1,
      prompt: 'Return invoice_id, patient_id and total_amount of Partially Paid invoices using a filter that an index on status could use (no functions on the column). Order by invoice_id.',
      solution: `SELECT invoice_id, patient_id, total_amount FROM invoices WHERE status = 'Partially Paid' ORDER BY invoice_id;`,
      hints: ['Compare the raw column to a value.', 'Match the stored case exactly: \'Partially Paid\'.', 'WHERE status = \'Partially Paid\' ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'When is a full scan the right choice?', options: ['Never', 'When the table is small or most rows are needed', 'Only on Sundays', 'When there is an index'], answer: 1, why: 'Sequential reading wins when you need a large share of the table.' },
      { q: 'Which filter forces a scan even with an index on last_name?', options: ['last_name = \'Smith\'', 'last_name LIKE \'Sm%\'', 'last_name LIKE \'%th\'', 'last_name > \'M\''], answer: 2, why: 'A leading wildcard means the index order cannot narrow the search.' },
    ],
  },
  // ---------------------------------------------------------------- 07
  {
    id: 'optimization-07',
    goals: ['How an index lookup works (B-tree search)', 'Index seek vs index range scan', 'The cost of fetching rows after the index (lookups)', 'When the optimizer prefers an index scan'],
    concept: `<p>An <b>index</b> is a separate, sorted structure (a B-tree) that stores the indexed column values plus a pointer to each row. An <b>index scan</b> (or seek) uses it to jump straight to matching values.</p>
<ul>
<li><b>Seek / equality lookup</b>: <code>WHERE invoice_id = 13</code> goes down the tree to one spot.</li>
<li><b>Range scan</b>: <code>WHERE service_date BETWEEN '2026-01-01' AND '2026-03-31'</code> finds the start, then reads entries in order until the end.</li>
<li><b>Row lookup</b>: for each matching index entry, fetch the full row from the table (unless the index covers the query).</li>
</ul>`,
    why: 'Index lookups make the cost depend on how many rows match, not on the table size.',
    when: 'For selective filters, joins on foreign keys, and ORDER BY that matches the index order.',
    analogy: 'The index is the alphabetical patient index card file: find "Nguyen" in a few flips, and the card tells you which shelf holds the chart.',
    syntax: `CREATE INDEX idx_name ON table(column);\nSELECT ... FROM table WHERE column = ?;        -- seek\nSELECT ... FROM table WHERE column BETWEEN ? AND ?;  -- range scan`,
    sql: `CREATE INDEX idx_charges_service_date ON charges(service_date);\n\nEXPLAIN QUERY PLAN\nSELECT charge_id, service_date, amount\nFROM charges\nWHERE service_date BETWEEN '2026-01-01' AND '2026-03-31';`,
    breakdown: [
      ['CREATE INDEX idx_charges_service_date ON charges(service_date)', 'Builds a B-tree of service dates, each pointing to its charge row'],
      ['WHERE service_date BETWEEN ... AND ...', 'A range: find 2026-01-01 in the tree, then walk forward'],
      ['EXPLAIN QUERY PLAN', 'Shows SEARCH charges USING INDEX idx_charges_service_date (service_date>? AND service_date<?)'],
    ],
    visual: { type: 'index' },
    internals: `<p>A B-tree has a root page, some internal pages and leaf pages. Each page holds hundreds of keys, so the tree is very shallow: 3 levels can index ~millions of rows. A lookup reads one page per level (root -> internal -> leaf). Leaf pages are linked in key order, which is what makes range scans and ORDER BY cheap.</p>
<p>In SQLite each index entry stores the key plus the table's rowid. After finding an entry, SQLite does a second B-tree search on the table by rowid to get the other columns. That second hop is why covering indexes (next lessons) are faster.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM charges WHERE date(service_date) = '2026-02-10';`, why: 'The function hides the column from the index: the engine must compute date() for every row.', fix: `SELECT * FROM charges WHERE service_date = '2026-02-10';` },
      { wrong: `-- Index every column "just in case"`, why: 'Every index slows INSERT/UPDATE/DELETE and uses space. Index the columns your real queries filter, join and sort on.', fix: `CREATE INDEX idx_charges_invoice ON charges(invoice_id);` },
    ],
    rules: ['An index is a sorted copy of some columns with row pointers.', 'Equality = seek; ranges = seek + ordered walk.', 'Each match may cost an extra table lookup.', 'Indexes speed reads and slow writes.'],
    compare: `<table><tr><th>Operation</th><th>Cost roughly</th></tr>
<tr><td>Full scan</td><td>all pages of the table</td></tr>
<tr><td>Index seek</td><td>tree depth (3-4 pages) + 1 row lookup</td></tr>
<tr><td>Index range scan</td><td>tree depth + leaf pages in range + 1 lookup per match</td></tr>
<tr><td>Covering index scan</td><td>tree depth + leaf pages, no table lookups</td></tr></table>`,
    realWorld: 'Monthly close reports ask for "all charges with service dates in last month". An index on service_date makes that a quick range scan over one month instead of a scan over years.',
    deep: `<p>PostgreSQL distinguishes <code>Index Scan</code> (index then heap, one row at a time), <code>Bitmap Index Scan + Bitmap Heap Scan</code> (collect all matching row locations, sort them by page, then read pages in order: good for medium selectivity), and <code>Index Only Scan</code> (covering, uses the visibility map). SQL Server calls the extra hop a <b>Key Lookup</b> (or RID Lookup on heaps).</p>`,
    tryIt: { prompt: 'Change the range to one day, then to the whole of 2025 and 2026. Does the plan change? Remove the CREATE INDEX line and compare.', starter: `CREATE INDEX idx_charges_service_date ON charges(service_date);\n\nEXPLAIN QUERY PLAN\nSELECT charge_id, service_date, amount FROM charges\nWHERE service_date BETWEEN '2026-01-01' AND '2026-03-31';` },
    challenge: {
      level: 2,
      prompt: 'Return charge_id, service_date and amount for charges with service dates in the first quarter of 2026 (Jan 1 to Mar 31), using an index-friendly range. Order by service_date, then charge_id.',
      solution: `SELECT charge_id, service_date, amount FROM charges WHERE service_date BETWEEN '2026-01-01' AND '2026-03-31' ORDER BY service_date, charge_id;`,
      hints: ['Dates are ISO text, so text comparison works.', 'Do not wrap service_date in a function.', 'Use BETWEEN \'2026-01-01\' AND \'2026-03-31\'.', 'ORDER BY service_date, charge_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Why is a B-tree lookup fast even for huge tables?', options: ['It is kept in RAM', 'The tree is shallow, so few pages are read', 'It skips the WHERE clause', 'It uses parallel threads'], answer: 1, why: 'Each page holds many keys; 3-4 levels cover millions of rows.' },
      { q: 'What extra step does a non-covering index lookup need?', options: ['A sort', 'Fetching the row from the table', 'A hash join', 'A commit'], answer: 1, why: 'The index has the key and a row pointer; other columns come from the table.' },
    ],
  },
  // ---------------------------------------------------------------- 08
  {
    id: 'optimization-08',
    goals: ['B-tree, hash, bitmap, GIN/GiST, full-text index types', 'Unique, partial and expression indexes', 'Clustered vs non-clustered indexes', 'Which types SQLite supports'],
    concept: `<p>Not all indexes are the same shape. The main types:</p>
<ul>
<li><b>B-tree</b> (default everywhere): sorted; supports =, &lt;, &gt;, BETWEEN, LIKE 'abc%', ORDER BY.</li>
<li><b>Hash</b>: only equality (=); PostgreSQL and MySQL MEMORY tables.</li>
<li><b>Bitmap</b> (Oracle): great for low-cardinality columns in warehouses.</li>
<li><b>GIN / GiST</b> (PostgreSQL): for arrays, JSONB, full text, ranges, geometry.</li>
<li><b>Full-text</b>: word search in descriptions or notes.</li>
</ul>
<p>Special kinds of B-tree index (SQLite supports these):</p>
<ul>
<li><b>Unique</b>: also enforces no duplicates (e.g. practitioner NPI).</li>
<li><b>Partial</b>: indexes only some rows: <code>WHERE status IN ('Open','Overdue')</code>.</li>
<li><b>Expression</b>: indexes a computed value, like <code>lower(email)</code>.</li>
</ul>`,
    why: 'Choosing the right index type makes specific queries fast while keeping the index small and cheap to maintain.',
    when: 'Partial indexes for "work queues" (unpaid invoices), expression indexes for case-insensitive search, unique indexes for natural keys.',
    analogy: 'A billing office keeps different lookup tools: an alphabetical card file (B-tree), a pigeonhole per exact claim number (hash), and a small binder only for unpaid claims (partial index).',
    syntax: `CREATE UNIQUE INDEX ux ON t(col);\nCREATE INDEX ix_partial ON t(col) WHERE condition;\nCREATE INDEX ix_expr ON t(lower(col));`,
    sql: `CREATE INDEX idx_unpaid_due ON invoices(due_date)\n  WHERE status IN ('Open','Overdue');\n\nEXPLAIN QUERY PLAN\nSELECT invoice_id, due_date\nFROM invoices\nWHERE status IN ('Open','Overdue')\n  AND due_date < '2026-09-01';`,
    breakdown: [
      ['CREATE INDEX idx_unpaid_due ON invoices(due_date)', 'A B-tree on due_date...'],
      ['WHERE status IN (\'Open\',\'Overdue\')', '...containing only unpaid invoices (18 of 48 rows): smaller and cheaper to maintain'],
      ['WHERE status IN (...) AND due_date < ...', 'The query repeats the index condition, so SQLite can use the partial index: SEARCH invoices USING INDEX idx_unpaid_due (due_date<?)'],
    ],
    visual: { type: 'index' },
    internals: `<p>SQLite implements every index as a B-tree. A partial index is used only if the query\'s WHERE clause logically implies the index\'s WHERE clause (SQLite checks this with simple term matching, so repeat the condition exactly). An expression index is used only when the query contains the same expression, e.g. <code>WHERE lower(email) = ?</code>.</p>
<p>In <b>clustered</b> storage (SQL Server clustered index, MySQL InnoDB primary key, SQLite rowid tables) the table rows themselves live in the B-tree ordered by the key. Other indexes are <b>secondary</b> and point back to that key.</p>`,
    mistakes: [
      { wrong: `CREATE INDEX idx_unpaid_due ON invoices(due_date) WHERE status IN ('Open','Overdue');\nEXPLAIN QUERY PLAN SELECT invoice_id FROM invoices WHERE due_date < '2026-09-01';`, why: 'The query does not include the partial condition, so the index might miss rows: SQLite cannot use it.', fix: `CREATE INDEX idx_unpaid_due ON invoices(due_date) WHERE status IN ('Open','Overdue');\nEXPLAIN QUERY PLAN SELECT invoice_id FROM invoices WHERE status IN ('Open','Overdue') AND due_date < '2026-09-01';` },
      { wrong: `CREATE INDEX idx_email ON patients(email);\nSELECT * FROM patients WHERE lower(email) = 'zoe.young@mail.com';`, why: 'The index is on email, but the query searches lower(email).', fix: `CREATE INDEX idx_email_lower ON patients(lower(email));\nSELECT * FROM patients WHERE lower(email) = 'zoe.young@mail.com';` },
    ],
    rules: ['B-tree is the default and handles most needs.', 'Hash = equality only.', 'Partial indexes must be matched by the query\'s WHERE.', 'Expression indexes must be matched by the same expression.'],
    compare: `<table><tr><th>Type</th><th>Good for</th><th>Available in</th></tr>
<tr><td>B-tree</td><td>=, ranges, sorting, prefix LIKE</td><td>All</td></tr>
<tr><td>Hash</td><td>= only</td><td>PostgreSQL, MySQL (MEMORY)</td></tr>
<tr><td>Bitmap</td><td>Low-cardinality columns, analytics</td><td>Oracle</td></tr>
<tr><td>GIN / GiST / BRIN</td><td>JSONB, arrays, text, ranges, huge append-only tables</td><td>PostgreSQL</td></tr>
<tr><td>Columnstore</td><td>Analytics aggregates</td><td>SQL Server</td></tr>
<tr><td>Partial / filtered</td><td>Subsets (unpaid invoices)</td><td>SQLite, PostgreSQL, SQL Server</td></tr>
<tr><td>Expression / function-based</td><td>lower(email), date parts</td><td>SQLite, PostgreSQL, Oracle, MySQL 8</td></tr></table>`,
    realWorld: 'A collections team queries only unpaid invoices all day. A partial index on due_date for Open/Overdue invoices stays tiny even when millions of paid invoices accumulate.',
    deep: `<p>PostgreSQL <b>BRIN</b> indexes store min/max per block range: a few kilobytes can index a billion-row transactions table that is naturally ordered by transaction_date. SQL Server <b>filtered indexes</b> are its version of partial indexes; Oracle uses function-based indexes with a CASE expression to emulate them.</p>`,
    tryIt: { prompt: 'Create an expression index on lower(email) and check that a case-insensitive lookup uses it.', starter: `CREATE INDEX idx_patients_email_lower ON patients(lower(email));\n\nEXPLAIN QUERY PLAN\nSELECT patient_id, first_name, last_name\nFROM patients\nWHERE lower(email) = 'zoe.young@mail.com';` },
    challenge: {
      level: 2,
      prompt: 'Write the work-queue query the partial index serves: invoice_id, patient_id and due_date of invoices with status Open or Overdue and a due_date before 2026-09-01. Order by due_date, then invoice_id.',
      solution: `SELECT invoice_id, patient_id, due_date FROM invoices WHERE status IN ('Open','Overdue') AND due_date < '2026-09-01' ORDER BY due_date, invoice_id;`,
      hints: ['Repeat the partial index condition: status IN (\'Open\',\'Overdue\').', 'Add the date filter with AND.', 'due_date < \'2026-09-01\'.', 'ORDER BY due_date, invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which index type supports only equality lookups?', options: ['B-tree', 'Hash', 'Partial', 'Expression'], answer: 1, why: 'Hash indexes cannot do ranges or ordering.' },
      { q: 'When can SQLite use a partial index?', options: ['Always', 'When the query WHERE implies the index WHERE', 'Only with ORDER BY', 'Only on primary keys'], answer: 1, why: 'Otherwise the index could be missing rows the query needs.' },
    ],
  },
  // ---------------------------------------------------------------- 09
  {
    id: 'optimization-09',
    goals: ['What a composite (multi-column) index is', 'The leftmost-prefix rule', 'Column order: equality columns first, range last', 'When one composite index replaces several single ones'],
    concept: `<p>A <b>composite index</b> indexes several columns together, sorted by the first column, then the second within it, and so on, like a phone book sorted by last name, then first name.</p>
<p>Index <code>invoices(status, invoice_date)</code> can serve:</p>
<ul>
<li><code>WHERE status = 'Overdue'</code> (leftmost column)</li>
<li><code>WHERE status = 'Overdue' AND invoice_date &gt;= '2026-01-01'</code> (both)</li>
</ul>
<p>but <b>not efficiently</b> <code>WHERE invoice_date &gt;= '2026-01-01'</code> alone, because dates are only sorted <i>within</i> each status. This is the <b>leftmost-prefix rule</b>.</p>
<p>Put <b>equality</b> columns first and the <b>range</b> column last.</p>`,
    why: 'Real queries filter on several columns. One well-ordered composite index can answer them with a single seek.',
    when: 'When queries repeatedly combine the same filters, e.g. status + date, patient + date, invoice + service_date.',
    analogy: 'The claims cabinet is organized by status drawer, then by date inside each drawer. Finding "Overdue claims since January" is instant; finding "all claims since January" means opening every drawer.',
    syntax: `CREATE INDEX idx ON table(equality_col, range_col);`,
    sql: `SELECT invoice_id, patient_id, invoice_date, total_amount\nFROM invoices\nWHERE status = 'Overdue'\n  AND invoice_date >= '2026-01-01';`,
    breakdown: [
      ['WHERE status = \'Overdue\'', 'Equality on the first index column: jump to the Overdue section'],
      ['AND invoice_date >= \'2026-01-01\'', 'Range on the second column: walk forward inside that section'],
      ['Index (status, invoice_date)', 'Plan: SEARCH invoices USING INDEX idx_invoices_status_date (status=? AND invoice_date>?)'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_invoices_status_date ON invoices(status, invoice_date)` },
    internals: `<p>The index entries are ordered by (status, invoice_date, rowid). The engine seeks to the first entry with status='Overdue' and invoice_date >= '2026-01-01' and reads contiguous leaf entries until status changes. If the order were (invoice_date, status), the range on the first column would force reading all dates since January and checking status on each entry.</p>`,
    mistakes: [
      { wrong: `CREATE INDEX idx_d_s ON invoices(invoice_date, status);\nSELECT invoice_id FROM invoices WHERE status = 'Overdue' AND invoice_date >= '2026-01-01';`, why: 'Range column first: the index can only use the date range and must check status for every entry in it.', fix: `CREATE INDEX idx_s_d ON invoices(status, invoice_date);\nSELECT invoice_id FROM invoices WHERE status = 'Overdue' AND invoice_date >= '2026-01-01';` },
      { wrong: `CREATE INDEX idx_s ON invoices(status);\nCREATE INDEX idx_s_d ON invoices(status, invoice_date);`, why: 'The single-column index is redundant: (status, invoice_date) already serves status-only filters.', fix: `CREATE INDEX idx_s_d ON invoices(status, invoice_date);` },
    ],
    rules: ['Leftmost prefix: an index on (a, b, c) helps a, a+b, a+b+c.', 'Equality columns first, range column last.', 'A composite index makes the single-column index on its first column redundant.', 'Only one range column can be used for seeking.'],
    compare: `<table><tr><th>Filter</th><th>Index (status, invoice_date) usable?</th></tr>
<tr><td>status = ?</td><td>Yes (prefix)</td></tr>
<tr><td>status = ? AND invoice_date &gt;= ?</td><td>Yes (both columns)</td></tr>
<tr><td>invoice_date &gt;= ?</td><td>No seek (at most a full index scan)</td></tr>
<tr><td>status IN (?, ?) AND invoice_date &gt;= ?</td><td>Yes (one seek per status)</td></tr></table>`,
    realWorld: 'The A/R dashboard filters invoices by status and date range on every page load. One index on (status, invoice_date) serves every tile.',
    deep: `<p>SQLite can sometimes use a "skip-scan" on a composite index when the first column has very few distinct values and statistics (ANALYZE) exist. Oracle and MySQL 8 have similar skip-scan features. Don\'t rely on it: design indexes for your queries.</p>`,
    tryIt: { prompt: 'Create the index, then explain a query that filters only on invoice_date. Is it SEARCH or SCAN?', starter: `CREATE INDEX idx_invoices_status_date ON invoices(status, invoice_date);\n\nEXPLAIN QUERY PLAN\nSELECT invoice_id FROM invoices WHERE invoice_date >= '2026-01-01';` },
    challenge: {
      level: 2,
      prompt: 'Return invoice_id, patient_id, invoice_date and total_amount of Overdue invoices dated on or after 2026-01-01 (the query the composite index serves). Order by invoice_date, then invoice_id.',
      solution: `SELECT invoice_id, patient_id, invoice_date, total_amount FROM invoices WHERE status = 'Overdue' AND invoice_date >= '2026-01-01' ORDER BY invoice_date, invoice_id;`,
      hints: ['Two filters combined with AND.', 'status = \'Overdue\' is the equality part.', 'invoice_date >= \'2026-01-01\' is the range.', 'ORDER BY invoice_date, invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'An index on (patient_id, invoice_date). Which filter can NOT seek efficiently?', options: ['patient_id = 5', 'patient_id = 5 AND invoice_date > \'2026-01-01\'', 'invoice_date > \'2026-01-01\'', 'patient_id IN (5, 6)'], answer: 2, why: 'It skips the leftmost column.' },
      { q: 'Where should the range column go?', options: ['First', 'Last', 'Anywhere', 'In a separate index'], answer: 1, why: 'After a range, later columns are no longer ordered for seeking.' },
    ],
  },
  // ---------------------------------------------------------------- 10
  {
    id: 'optimization-10',
    goals: ['What a covering index is', 'Why it avoids table lookups', 'How to spot COVERING INDEX / Index Only Scan', 'INCLUDE columns and the trade-offs'],
    concept: `<p>A <b>covering index</b> contains <b>every column the query needs</b>: in WHERE, JOIN, GROUP BY, ORDER BY and SELECT. The database can answer from the index alone, without visiting the table.</p>
<p>For "total charged per invoice for invoices 10-20", an index on <code>charges(invoice_id, amount)</code> covers the query. SQLite reports <code>USING COVERING INDEX</code>; PostgreSQL shows <code>Index Only Scan</code>.</p>`,
    why: 'Table lookups are the expensive random reads of an index plan. Removing them can make a query many times faster.',
    when: 'For hot, frequently run queries that read a few columns: balances, totals per invoice, dashboards.',
    analogy: 'If the patient index card already lists the phone number, the clerk can call without pulling the chart from the shelf.',
    syntax: `CREATE INDEX idx ON t(filter_col, other_needed_col);\n-- SQL Server / PostgreSQL 11+:\nCREATE INDEX idx ON t(filter_col) INCLUDE (other_needed_col);`,
    sql: `SELECT invoice_id, SUM(amount) AS charged\nFROM charges\nWHERE invoice_id BETWEEN 10 AND 20\nGROUP BY invoice_id;`,
    breakdown: [
      ['WHERE invoice_id BETWEEN 10 AND 20', 'The seek column: first in the index'],
      ['SUM(amount)', 'amount is the second index column, so no table access is needed'],
      ['GROUP BY invoice_id', 'Index entries already come in invoice_id order: no temp B-tree for grouping'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_charges_invoice_amount ON charges(invoice_id, amount)` },
    internals: `<p>Before: charges has no index on invoice_id, so SQLite runs <code>SCAN charges</code> and builds a temp B-tree to group. After: <code>SEARCH charges USING COVERING INDEX idx_charges_invoice_amount (invoice_id&gt;? AND invoice_id&lt;?)</code>. SQLite reads only index leaf pages, which are much smaller than table pages because they hold 2 columns instead of 9.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM charges WHERE invoice_id BETWEEN 10 AND 20;`, why: 'SELECT * needs every column, so no reasonable index can cover it.', fix: `SELECT invoice_id, amount FROM charges WHERE invoice_id BETWEEN 10 AND 20;` },
      { wrong: `CREATE INDEX idx_everything ON charges(invoice_id, practitioner_id, service_date, cpt_code, description, units, unit_price, amount);`, why: 'An index that copies the whole table doubles storage and write cost. Cover the hot queries only.', fix: `CREATE INDEX idx_charges_invoice_amount ON charges(invoice_id, amount);` },
    ],
    rules: ['Covering = every referenced column is in the index.', 'SELECT * almost never gets a covering index.', 'Put seek columns first, extra "payload" columns after (or in INCLUDE).', 'Wider indexes cost more writes and space.'],
    compare: `<table><tr><th></th><th>Regular index</th><th>Covering index</th></tr>
<tr><td>Reads</td><td>Index + table per row</td><td>Index only</td></tr>
<tr><td>SQLite plan</td><td>USING INDEX</td><td>USING COVERING INDEX</td></tr>
<tr><td>PostgreSQL</td><td>Index Scan</td><td>Index Only Scan</td></tr>
<tr><td>SQL Server</td><td>Index Seek + Key Lookup</td><td>Index Seek</td></tr></table>`,
    realWorld: 'A patient-balance API sums charges per invoice millions of times a day. A covering index on (invoice_id, amount) serves it without touching the wide charges rows.',
    deep: `<p><code>INCLUDE</code> columns (SQL Server, PostgreSQL 11+) are stored only in the leaf level, not in the sort key, so they don\'t affect ordering and keep internal pages small. In PostgreSQL an Index Only Scan still checks the visibility map; if many pages were recently modified and not yet vacuumed, it falls back to heap fetches (<code>Heap Fetches: N</code> in EXPLAIN ANALYZE).</p>`,
    tryIt: { prompt: 'Explain the query with the index. Then add practitioner_id to the SELECT list and GROUP BY. Is the index still covering?', starter: `CREATE INDEX idx_charges_invoice_amount ON charges(invoice_id, amount);\n\nEXPLAIN QUERY PLAN\nSELECT invoice_id, SUM(amount) FROM charges\nWHERE invoice_id BETWEEN 10 AND 20\nGROUP BY invoice_id;` },
    challenge: {
      level: 2,
      prompt: 'Return invoice_id and total charged (SUM(amount)) for invoices 10 to 20, touching only invoice_id and amount so a (invoice_id, amount) index covers it. Order by invoice_id.',
      solution: `SELECT invoice_id, SUM(amount) AS charged FROM charges WHERE invoice_id BETWEEN 10 AND 20 GROUP BY invoice_id ORDER BY invoice_id;`,
      hints: ['Only reference invoice_id and amount.', 'Filter with BETWEEN 10 AND 20.', 'GROUP BY invoice_id with SUM(amount).', 'ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What makes an index covering for a query?', options: ['It is unique', 'It contains every column the query references', 'It is on the primary key', 'It is partial'], answer: 1, why: 'Then no table lookup is needed.' },
      { q: 'PostgreSQL name for a covering read?', options: ['Seq Scan', 'Bitmap Heap Scan', 'Index Only Scan', 'Hash Join'], answer: 2, why: 'Index Only Scan reads only the index (plus the visibility map).' },
    ],
  },
  // ---------------------------------------------------------------- 11
  {
    id: 'optimization-11',
    goals: ['What selectivity means', 'How to measure it with COUNT(DISTINCT)', 'Why low-selectivity columns make poor indexes', 'Selectivity of a specific value vs a column'],
    concept: `<p><b>Selectivity</b> = what fraction of rows a filter keeps. A filter that keeps <b>few</b> rows is <b>highly selective</b> (good for an index). One that keeps most rows is <b>not selective</b>.</p>
<ul>
<li><code>invoice_id = 13</code>: 1 of 48 rows (2%) -&gt; very selective.</li>
<li><code>status = 'Paid'</code>: 23 of 48 rows (48%) -&gt; poor; a scan is probably cheaper.</li>
<li><code>status = 'Void'</code>: 1 of 48 rows -&gt; selective, even though status overall is not.</li>
</ul>
<p>Column-level estimate: <code>COUNT(DISTINCT col) / COUNT(*)</code>. Close to 1 = great index candidate; close to 0 = poor.</p>`,
    why: 'Indexes pay off only when they eliminate most rows. Selectivity tells you whether an index is worth creating.',
    when: 'When deciding which columns to index and which column goes first in a composite index.',
    analogy: 'Asking the front desk for "patients named Nguyen" narrows the list a lot; asking for "patients with a gender on file" narrows nothing.',
    syntax: `SELECT COUNT(DISTINCT col) * 1.0 / COUNT(*) AS selectivity FROM table;`,
    sql: `SELECT 'invoice_id' AS column_name, ROUND(COUNT(DISTINCT invoice_id) * 1.0 / COUNT(*), 3) AS selectivity FROM invoices\nUNION ALL\nSELECT 'patient_id', ROUND(COUNT(DISTINCT patient_id) * 1.0 / COUNT(*), 3) FROM invoices\nUNION ALL\nSELECT 'location_id', ROUND(COUNT(DISTINCT location_id) * 1.0 / COUNT(*), 3) FROM invoices\nUNION ALL\nSELECT 'status', ROUND(COUNT(DISTINCT status) * 1.0 / COUNT(*), 3) FROM invoices;`,
    breakdown: [
      ['COUNT(DISTINCT col)', 'How many different values the column has'],
      ['* 1.0 / COUNT(*)', 'Divide by total rows (the * 1.0 avoids integer division)'],
      ['UNION ALL', 'Stack one row per column to compare them side by side'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 560 170" width="100%"><text x="10" y="18" fill="var(--text)" font-size="13" font-weight="bold">Distinct values / rows in invoices (higher = more selective)</text>
<text x="10" y="50" fill="var(--text)" font-size="12">invoice_id</text><rect x="110" y="38" width="400" height="16" fill="var(--green)"/><text x="515" y="51" fill="var(--text)" font-size="11">1.00</text>
<text x="10" y="80" fill="var(--text)" font-size="12">patient_id</text><rect x="110" y="68" width="183" height="16" fill="var(--blue)"/><text x="298" y="81" fill="var(--text)" font-size="11">~0.46</text>
<text x="10" y="110" fill="var(--text)" font-size="12">location_id</text><rect x="110" y="98" width="42" height="16" fill="var(--yellow)"/><text x="157" y="111" fill="var(--text)" font-size="11">~0.10</text>
<text x="10" y="140" fill="var(--text)" font-size="12">status</text><rect x="110" y="128" width="42" height="16" fill="var(--red)"/><text x="157" y="141" fill="var(--text)" font-size="11">~0.10 (5 values)</text></svg>` },
    internals: `<p>The optimizer estimates the rows a filter returns as <code>table_rows x selectivity</code>. For equality on a column with n distinct values and no other statistics, it assumes <code>rows / n</code>. That is wrong for skewed data: status = 'Paid' (23 rows) and status = 'Void' (1 row) both get the estimate 48 / 5 ~ 10. Histograms and most-common-value lists (see Statistics) fix this.</p>`,
    mistakes: [
      { wrong: `SELECT COUNT(DISTINCT status) / COUNT(*) FROM invoices;`, why: 'Integer division: 5 / 48 = 0 in SQLite.', fix: `SELECT COUNT(DISTINCT status) * 1.0 / COUNT(*) FROM invoices;` },
      { wrong: `CREATE INDEX idx_patients_gender ON patients(gender);`, why: 'Gender has 2-3 values: a lookup returns ~half the table, so the index is rarely used and still costs writes.', fix: `CREATE INDEX idx_patients_name ON patients(last_name, first_name);` },
    ],
    rules: ['High selectivity (few rows returned) = good index candidate.', 'Selectivity can differ per value (skew).', 'Use * 1.0 to avoid integer division.', 'Low-selectivity columns can still be useful as the first column of a composite or in a partial index.'],
    compare: `<table><tr><th>Column</th><th>Distinct / rows</th><th>Index?</th></tr>
<tr><td>invoice_id (PK)</td><td>1.0</td><td>Always (it is the key)</td></tr>
<tr><td>patient_id</td><td>medium</td><td>Yes (foreign key lookups)</td></tr>
<tr><td>status</td><td>low</td><td>Only for rare values or in a composite/partial index</td></tr></table>`,
    realWorld: 'A team indexed invoices(status) and saw no gain for "Paid" queries (half the table) but a big gain for the rare "Void" audit query: selectivity depends on the value.',
    deep: `<p><b>Density</b> (SQL Server) = 1 / distinct values. Correlated columns break the independence assumption: the optimizer multiplies selectivities of <code>city = 'Austin' AND state = 'TX'</code> as if unrelated, underestimating rows. PostgreSQL <code>CREATE STATISTICS ... (dependencies)</code> and SQL Server multi-column statistics address this.</p>`,
    tryIt: { prompt: 'Measure selectivity of charges columns: cpt_code, practitioner_id and invoice_id.', starter: `SELECT\n  COUNT(*) AS total_rows,\n  COUNT(DISTINCT cpt_code) * 1.0 / COUNT(*) AS cpt_sel,\n  COUNT(DISTINCT practitioner_id) * 1.0 / COUNT(*) AS practitioner_sel,\n  COUNT(DISTINCT invoice_id) * 1.0 / COUNT(*) AS invoice_sel\nFROM charges;` },
    challenge: {
      level: 2,
      prompt: 'Show the selectivity of each status value: status, the number of invoices, and the fraction of all invoices (count / total, rounded to 3 decimals). Order from most to least selective (smallest fraction first), then by status.',
      solution: `SELECT status, COUNT(*) AS n, ROUND(COUNT(*) * 1.0 / (SELECT COUNT(*) FROM invoices), 3) AS fraction FROM invoices GROUP BY status ORDER BY fraction, status;`,
      hints: ['GROUP BY status with COUNT(*).', 'The total is a scalar subquery: (SELECT COUNT(*) FROM invoices).', 'Multiply by 1.0 before dividing and ROUND(..., 3).', 'ORDER BY fraction, status.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which filter is most selective?', options: ['status = \'Paid\'', 'status = \'Void\'', 'total_amount > 0', 'location_id IS NOT NULL'], answer: 1, why: 'Only 1 invoice is Void.' },
      { q: 'Why is an index on gender usually useless?', options: ['Text cannot be indexed', 'It returns a large share of rows, so a scan is cheaper', 'It has NULLs', 'Indexes need numbers'], answer: 1, why: 'Low selectivity means many random lookups, worse than a scan.' },
    ],
  },
  // ---------------------------------------------------------------- 12
  {
    id: 'optimization-12',
    goals: ['Two meanings of cardinality: distinct values and row counts', 'How estimated cardinality drives plan choices', 'Join cardinality (1:1, 1:N, N:M)', 'Why misestimates cause slow plans'],
    concept: `<p><b>Cardinality</b> is used in two ways:</p>
<ul>
<li><b>Column cardinality</b>: how many distinct values a column has (status: 5, invoice_id: 48).</li>
<li><b>Result cardinality</b>: how many rows a step of the plan produces (the "rows=" in a plan).</li>
</ul>
<p>The optimizer estimates result cardinality at every step to choose join order and algorithms. If it thinks a step returns 10 rows, a nested loop with index lookups looks great. If it actually returns 1,000,000 rows, that plan is a disaster.</p>
<p>Joins multiply cardinality: 1 patient -&gt; many invoices -&gt; many charges. Joining patients (25) to invoices (48) to charges (104) gives up to 104 rows, not 25.</p>`,
    why: 'Nearly every bad plan traces back to a wrong cardinality estimate.',
    when: 'When reading plans, designing indexes, or debugging duplicate rows after joins.',
    analogy: 'Planning staff for a clinic: if you expect 10 patients and 300 walk in, the schedule (plan) that looked efficient collapses.',
    syntax: `SELECT COUNT(*), COUNT(DISTINCT col) FROM table;  -- measure\nEXPLAIN QUERY PLAN SELECT ...;                   -- see what the plan assumes`,
    sql: `SELECT p.patient_id, p.last_name, COUNT(i.invoice_id) AS invoices\nFROM patients p\nJOIN invoices i ON i.patient_id = p.patient_id\nWHERE p.city = 'Dallas'\nGROUP BY p.patient_id, p.last_name;`,
    breakdown: [
      ['FROM patients p ... WHERE p.city = \'Dallas\'', 'Estimated fraction of patients from Dallas decides whether patients is the outer loop'],
      ['JOIN invoices i ON i.patient_id = p.patient_id', '1:N join: each patient row can become several rows'],
      ['GROUP BY p.patient_id', 'Collapses back to one row per patient'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_invoices_patient ON invoices(patient_id)` },
    internals: `<p>Without an index on invoices.patient_id, SQLite reads invoices and looks patients up by primary key. With the index, it can start from patients filtered by city and SEARCH invoices per patient. Which is cheaper depends on estimated cardinalities: how many Dallas patients, and how many invoices each has. SQLite uses heuristics plus sqlite_stat1 (after ANALYZE) to estimate them.</p>`,
    mistakes: [
      { wrong: `SELECT p.patient_id, SUM(c.amount) AS charged, SUM(pay.amount) AS paid\nFROM patients p JOIN invoices i ON i.patient_id = p.patient_id\nJOIN charges c ON c.invoice_id = i.invoice_id\nJOIN payments pay ON pay.invoice_id = i.invoice_id\nGROUP BY p.patient_id;`, why: 'Two 1:N joins from the same invoice multiply rows (charges x payments), inflating both sums.', fix: `SELECT i.patient_id,\n  SUM((SELECT SUM(amount) FROM charges c WHERE c.invoice_id = i.invoice_id)) AS charged,\n  SUM((SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.invoice_id)) AS paid\nFROM invoices i GROUP BY i.patient_id;` },
    ],
    rules: ['Joins can multiply rows; aggregate before joining when possible.', 'The optimizer\'s row estimates drive join order and algorithm.', 'Big estimate errors = likely bad plan; refresh statistics.'],
    compare: `<table><tr><th>Relationship</th><th>Example</th><th>Rows after join</th></tr>
<tr><td>1:1</td><td>invoice -&gt; its location</td><td>same as invoices</td></tr>
<tr><td>1:N</td><td>invoice -&gt; charges</td><td>number of charges</td></tr>
<tr><td>N:M via two 1:N</td><td>charges x payments per invoice</td><td>charges x payments (fan-out!)</td></tr></table>`,
    realWorld: 'A revenue report joined charges and payments directly and overstated revenue by 2.3x. The fix was to aggregate each side per invoice first, which also made the query faster.',
    deep: `<p>PostgreSQL shows estimates as <code>rows=</code> and EXPLAIN ANALYZE shows <code>actual rows=</code>. Cardinality errors compound multiplicatively through joins: a 10x error at two levels is a 100x error at the top. Techniques: extended statistics, better predicates (avoid functions on columns), and in the worst case plan hints or splitting a query into temporary tables so the optimizer sees real counts.</p>`,
    tryIt: { prompt: 'Measure real cardinalities: how many patients live in Dallas, and how many invoice rows the join produces before grouping?', starter: `SELECT\n  (SELECT COUNT(*) FROM patients WHERE city = 'Dallas') AS dallas_patients,\n  (SELECT COUNT(*) FROM patients p JOIN invoices i ON i.patient_id = p.patient_id\n     WHERE p.city = 'Dallas') AS joined_rows;` },
    challenge: {
      level: 3,
      prompt: 'Show the join fan-out per invoice: invoice_id, number of charges, number of payments, and charges x payments (the rows a direct charges-payments join would produce). Include only invoices that have at least one payment. Order by invoice_id.',
      solution: `SELECT i.invoice_id, (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id) AS n_charges, (SELECT COUNT(*) FROM payments p WHERE p.invoice_id = i.invoice_id) AS n_payments, (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id) * (SELECT COUNT(*) FROM payments p WHERE p.invoice_id = i.invoice_id) AS fan_out FROM invoices i WHERE EXISTS (SELECT 1 FROM payments p WHERE p.invoice_id = i.invoice_id) ORDER BY i.invoice_id;`,
      hints: ['Use correlated COUNT(*) subqueries so you don\'t multiply rows while counting.', 'One subquery counts charges, another counts payments.', 'Multiply them for the fan-out column.', 'Filter with WHERE EXISTS (SELECT 1 FROM payments ...) and ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'An invoice has 3 charges and 2 payments. How many rows does joining both to it produce?', options: ['3', '5', '6', '2'], answer: 2, why: 'Every charge pairs with every payment: 3 x 2.' },
      { q: 'Why does cardinality estimation matter?', options: ['It sets the result order', 'It drives the optimizer\'s plan choices', 'It affects column names', 'It is only for reporting'], answer: 1, why: 'Join order, join algorithm and index use all depend on estimated row counts.' },
    ],
  },
  // ---------------------------------------------------------------- 13
  {
    id: 'optimization-13',
    goals: ['What optimizer statistics are', 'Running ANALYZE and reading sqlite_stat1', 'Histograms and most-common values (PostgreSQL pg_stats)', 'When statistics go stale'],
    concept: `<p>The optimizer cannot count rows every time it plans a query, so it keeps <b>statistics</b>: summaries of each table and index, such as row counts, distinct values, most common values and histograms.</p>
<p>You refresh them with <code>ANALYZE</code>. In SQLite the results go into <code>sqlite_stat1</code>:</p>
<pre>tbl       idx                  stat
invoices  idx_invoices_status  48 10
invoices  idx_invoices_patient 48 3</pre>
<p><code>48 10</code> means: the index covers 48 rows, and an equality lookup on its first column returns about 10 rows on average. That is how SQLite knows <code>patient_id = ?</code> (about 3 rows) is more selective than <code>status = ?</code> (about 10 rows).</p>
<p>PostgreSQL stores much richer data in <code>pg_stats</code>:</p>
<pre>SELECT attname, n_distinct, most_common_vals, most_common_freqs
FROM pg_stats WHERE tablename = 'invoices' AND attname = 'status';

 attname | n_distinct | most_common_vals                           | most_common_freqs
---------+------------+--------------------------------------------+------------------------------
 status  |          5 | {Paid,Overdue,"Partially Paid",Open,Void}  | {0.479,0.271,0.125,0.104,0.021}</pre>`,
    why: 'Good plans need good estimates, and estimates come from statistics. Stale statistics are a top cause of sudden slowdowns.',
    when: 'After bulk loads, large deletes, creating indexes, or when EXPLAIN ANALYZE shows estimates far from actual rows.',
    analogy: 'Statistics are the clinic\'s monthly census report. Staffing is planned from it; if it is from last year, the plan will be wrong.',
    syntax: `ANALYZE;                  -- SQLite / PostgreSQL: all tables\nANALYZE invoices;         -- one table\n-- SQL Server: UPDATE STATISTICS invoices;\n-- MySQL: ANALYZE TABLE invoices;`,
    sql: `CREATE INDEX idx_invoices_status ON invoices(status);\nCREATE INDEX idx_invoices_patient ON invoices(patient_id);\nANALYZE;\n\nSELECT tbl, idx, stat\nFROM sqlite_stat1\nWHERE tbl = 'invoices';`,
    breakdown: [
      ['CREATE INDEX ...', 'Statistics in sqlite_stat1 are gathered per index'],
      ['ANALYZE;', 'Scans the tables and indexes and writes summary statistics'],
      ['SELECT tbl, idx, stat FROM sqlite_stat1', 'stat = "total rows, avg rows per distinct value of the first column(, first two columns...)"'],
    ],
    visual: { type: 'flow', steps: [['Data changes', 'INSERT / UPDATE / DELETE invoices'], ['ANALYZE', 'read tables & indexes, sample values'], ['Statistics stored', 'sqlite_stat1: "48 10", "48 3"'], ['Planner estimates', 'status=? ~10 rows, patient_id=? ~3 rows'], ['Plan chosen', 'use idx_invoices_patient when both filters apply']] },
    internals: `<p>SQLite computes stat1 by scanning each index. With the optional <code>sqlite_stat4</code> build flag it also stores samples for skew. PostgreSQL samples ~300 x <code>default_statistics_target</code> rows per table and builds MCV lists and equi-depth histograms. Autovacuum re-analyzes a table after about 10% of its rows change; SQL Server auto-updates statistics after a threshold of modifications.</p>`,
    mistakes: [
      { wrong: `-- Bulk load 5 million charges, then immediately run reports`, why: 'Statistics still describe the old, small table, so the optimizer may choose nested loops that explode.', fix: `ANALYZE;` },
      { wrong: `SELECT * FROM sqlite_stat1;  -- before any ANALYZE`, why: 'The table does not exist until ANALYZE runs, so this errors.', fix: `ANALYZE;\nSELECT * FROM sqlite_stat1;` },
    ],
    rules: ['The optimizer plans from statistics, not live counts.', 'Run ANALYZE after big data changes.', 'Skewed data needs histograms / MCVs to estimate well.', 'Check stats when estimates and actual rows diverge.'],
    compare: `<table><tr><th>Database</th><th>Refresh</th><th>Inspect</th></tr>
<tr><td>SQLite</td><td>ANALYZE / PRAGMA optimize</td><td>sqlite_stat1, sqlite_stat4</td></tr>
<tr><td>PostgreSQL</td><td>ANALYZE, autovacuum</td><td>pg_stats, pg_statistic_ext</td></tr>
<tr><td>MySQL</td><td>ANALYZE TABLE</td><td>information_schema.STATISTICS, column histograms</td></tr>
<tr><td>SQL Server</td><td>UPDATE STATISTICS, auto-update</td><td>DBCC SHOW_STATISTICS</td></tr>
<tr><td>Oracle</td><td>DBMS_STATS.GATHER_TABLE_STATS</td><td>USER_TAB_COL_STATISTICS</td></tr></table>`,
    realWorld: 'After migrating five years of legacy claims into the charges table, month-end reports slowed from seconds to hours. Running ANALYZE fixed it instantly.',
    deep: `<p>PostgreSQL extended statistics: <code>CREATE STATISTICS inv_city_state (dependencies, ndistinct, mcv) ON city, state FROM treatment_locations;</code> tell the planner that columns are correlated. <code>ALTER TABLE charges ALTER COLUMN cpt_code SET STATISTICS 1000;</code> increases histogram detail for a skewed column.</p>`,
    tryIt: { prompt: 'Create an index on charges(cpt_code), run ANALYZE and read the stat line. How many charges share a CPT code on average?', starter: `CREATE INDEX idx_charges_cpt ON charges(cpt_code);\nANALYZE;\nSELECT * FROM sqlite_stat1 WHERE tbl = 'charges';` },
    challenge: {
      level: 2,
      prompt: 'Compute by hand what sqlite_stat1 would store for an index on invoices(status): one row with the total number of invoices and the average number of invoices per distinct status, rounded down to an integer.',
      solution: `SELECT COUNT(*) AS total_rows, COUNT(*) / COUNT(DISTINCT status) AS avg_rows_per_value FROM invoices;`,
      hints: ['Total rows = COUNT(*).', 'Distinct values = COUNT(DISTINCT status).', 'Integer division rounds down in SQLite: COUNT(*) / COUNT(DISTINCT status).'],
    },
    quiz: [
      { q: 'What does ANALYZE do?', options: ['Runs a query with timing', 'Collects statistics for the optimizer', 'Rebuilds the table', 'Deletes old rows'], answer: 1, why: 'It samples or scans data and stores summaries the planner uses.' },
      { q: 'In sqlite_stat1, what does "48 3" for idx_invoices_patient mean?', options: ['48 indexes, 3 levels', '48 rows; ~3 rows per patient_id value', '48 pages, 3 MB', '48 patients, 3 invoices total'], answer: 1, why: 'First number = rows, next = average rows per distinct key prefix.' },
    ],
  },
  // ---------------------------------------------------------------- 14
  {
    id: 'optimization-14',
    goals: ['The three join algorithms: nested loop, hash, merge', 'Why foreign key columns need indexes', 'How join order is chosen', 'Filtering before joining'],
    concept: `<p>Databases join tables with three main algorithms:</p>
<ul>
<li><b>Nested loop</b>: for each row of the outer table, look up matches in the inner table. Great when the outer side is small and the inner side has an index. (SQLite uses only this.)</li>
<li><b>Hash join</b>: build a hash table from the smaller input, then probe it with each row of the larger. Great for big, unsorted inputs without useful indexes.</li>
<li><b>Merge join</b>: both inputs sorted on the join key, walked together like a zipper.</li>
</ul>
<p>The simplest big win: <b>index the foreign key</b> used in joins, e.g. <code>charges(invoice_id)</code>, so the inner loop is a SEARCH instead of a SCAN.</p>`,
    why: 'Joins are where queries usually spend their time. A missing FK index turns a join into (rows x rows) work.',
    when: 'Every time you join large tables: invoices-charges, invoices-payments, invoices-transactions.',
    analogy: 'Matching payment checks to invoices: for each check, look up the invoice in an indexed binder (nested loop with index), or sort both piles by invoice number and walk them together (merge join).',
    syntax: `CREATE INDEX idx_child_fk ON child(parent_id);\nSELECT ... FROM parent p JOIN child c ON c.parent_id = p.id WHERE p.filter = ?;`,
    sql: `SELECT i.invoice_id, pay.payment_date, pay.amount\nFROM invoices i\nJOIN payments pay ON pay.invoice_id = i.invoice_id\nWHERE i.location_id = 2;`,
    breakdown: [
      ['FROM invoices i', 'Filtered by location_id = 2: a small outer input'],
      ['JOIN payments pay ON pay.invoice_id = i.invoice_id', 'Without an index on payments(invoice_id) the planner reads payments and looks up invoices by primary key'],
      ['Index on payments(invoice_id)', 'Lets the planner SEARCH payments for each invoice at location 2'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_payments_invoice ON payments(invoice_id)` },
    internals: `<p>SQLite\'s planner enumerates loop orders and, for each, the best index for every inner loop. When no index exists on the join column it may build an <b>automatic index</b> (a temporary index for the duration of the query: <code>SEARCH ... USING AUTOMATIC COVERING INDEX</code>) if it estimates that to be cheaper than repeated scans. PostgreSQL would likely choose a Hash Join here instead.</p>`,
    mistakes: [
      { wrong: `SELECT i.invoice_id, pay.amount FROM invoices i JOIN payments pay ON CAST(pay.invoice_id AS TEXT) = CAST(i.invoice_id AS TEXT);`, why: 'Functions or casts on join columns block index use and force slow joins.', fix: `SELECT i.invoice_id, pay.amount FROM invoices i JOIN payments pay ON pay.invoice_id = i.invoice_id;` },
      { wrong: `SELECT i.invoice_id, pay.amount FROM invoices i, payments pay WHERE i.location_id = 2;`, why: 'Missing join condition = Cartesian product (48 x 47 rows) filtered only by location.', fix: `SELECT i.invoice_id, pay.amount FROM invoices i JOIN payments pay ON pay.invoice_id = i.invoice_id WHERE i.location_id = 2;` },
    ],
    rules: ['Index foreign keys used in joins.', 'Join on bare columns with matching types.', 'Filter the outer side as much as possible.', 'Nested loop for small x indexed; hash for big x big; merge for pre-sorted.'],
    compare: `<table><tr><th>Algorithm</th><th>Best when</th><th>Needs</th><th>Memory</th></tr>
<tr><td>Nested loop</td><td>Small outer, indexed inner</td><td>Index on inner join column</td><td>Low</td></tr>
<tr><td>Hash join</td><td>Large inputs, equality join</td><td>Memory for hash table</td><td>High</td></tr>
<tr><td>Merge join</td><td>Inputs already sorted</td><td>Sorted inputs / indexes</td><td>Low</td></tr></table>`,
    realWorld: 'An ORM-generated query joined transactions to invoices without an index on transactions(invoice_id). Adding it cut the patient statement job from 2 hours to 3 minutes.',
    deep: `<p>PostgreSQL plan for the same join on large tables:</p>
<pre>Hash Join  (cost=12.10..48.30 rows=410 width=20)
  Hash Cond: (pay.invoice_id = i.invoice_id)
  -&gt;  Seq Scan on payments pay
  -&gt;  Hash
        -&gt;  Index Scan using idx_invoices_location on invoices i
              Index Cond: (location_id = 2)</pre>
<p>Hash joins spill to disk in batches when the hash table exceeds <code>work_mem</code> (<code>Batches: 8</code> in EXPLAIN ANALYZE).</p>`,
    tryIt: { prompt: 'Explain the join with and without the index. Then change the filter to location_id IN (1, 2, 3, 4, 5).', starter: `EXPLAIN QUERY PLAN\nSELECT i.invoice_id, pay.amount\nFROM invoices i JOIN payments pay ON pay.invoice_id = i.invoice_id\nWHERE i.location_id = 2;\n\n-- CREATE INDEX idx_payments_invoice ON payments(invoice_id);` },
    challenge: {
      level: 2,
      prompt: 'Return invoice_id, payment_date and amount for every payment on invoices from location 2, ordered by invoice_id then payment_date.',
      solution: `SELECT i.invoice_id, pay.payment_date, pay.amount FROM invoices i JOIN payments pay ON pay.invoice_id = i.invoice_id WHERE i.location_id = 2 ORDER BY i.invoice_id, pay.payment_date;`,
      hints: ['Join invoices to payments on invoice_id.', 'Filter i.location_id = 2.', 'Select invoice_id, payment_date, amount.', 'ORDER BY i.invoice_id, pay.payment_date.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which join algorithm does SQLite use?', options: ['Hash join', 'Merge join', 'Nested loop', 'All three'], answer: 2, why: 'SQLite implements joins as nested loops (possibly with automatic indexes).' },
      { q: 'What is the best cheap fix for a slow join between invoices and charges?', options: ['Add an index on charges(invoice_id)', 'Use SELECT DISTINCT', 'Add ORDER BY', 'Use a CROSS JOIN'], answer: 0, why: 'It makes each inner lookup a B-tree search.' },
    ],
  },
  // ---------------------------------------------------------------- 15
  {
    id: 'optimization-15',
    goals: ['How engines run IN, EXISTS and correlated subqueries', 'When EXISTS beats IN or a JOIN', 'NOT IN vs NOT EXISTS with NULLs', 'Rewriting correlated subqueries as joins'],
    concept: `<p>Subqueries can be fast or slow depending on how the engine runs them:</p>
<ul>
<li><b>Uncorrelated IN</b> (<code>WHERE patient_id IN (SELECT ...)</code>): run once, build a list, probe it.</li>
<li><b>Correlated EXISTS</b>: conceptually runs once per outer row, so it needs an index on the inner lookup column to be cheap. It stops at the first match.</li>
<li>Modern optimizers often <b>flatten</b> subqueries into joins (semi-joins / anti-joins) automatically.</li>
</ul>
<p>For "patients with at least one overdue invoice", <code>EXISTS</code> with an index on <code>invoices(patient_id)</code> does one quick lookup per patient.</p>`,
    why: 'A correlated subquery without an index repeats a full scan for every outer row: O(n x m) work.',
    when: 'Existence checks (has an invoice, has a payment), anti-joins (never billed), and filters against aggregates.',
    analogy: 'Checking each patient for an overdue bill: with the invoices binder indexed by patient you open one tab per patient and stop at the first overdue bill. Without it you re-read the whole binder for every patient.',
    syntax: `SELECT ... FROM outer o\nWHERE EXISTS (SELECT 1 FROM inner i WHERE i.fk = o.pk AND ...);`,
    sql: `SELECT p.patient_id, p.first_name, p.last_name\nFROM patients p\nWHERE EXISTS (\n  SELECT 1 FROM invoices i\n  WHERE i.patient_id = p.patient_id\n    AND i.status = 'Overdue'\n);`,
    breakdown: [
      ['FROM patients p', 'Outer loop: each patient'],
      ['WHERE EXISTS (SELECT 1 ...', 'Correlated: runs per patient, stops at the first match'],
      ['i.patient_id = p.patient_id', 'The correlation column: needs an index on invoices(patient_id)'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_invoices_patient ON invoices(patient_id)` },
    internals: `<p>SQLite reports the subquery as <code>CORRELATED SCALAR SUBQUERY 1</code> nested under <code>SCAN p</code>. Before the index the subquery\'s inner line is <code>SCAN i</code> (full invoices scan per patient, 25 x 48 row checks). After: <code>SEARCH i USING INDEX idx_invoices_patient (patient_id=?)</code>. For <code>IN (SELECT ...)</code> SQLite builds the list once (<code>LIST SUBQUERY</code>) and uses the primary key to probe.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id FROM patients WHERE patient_id NOT IN (SELECT payor_id FROM invoices);`, why: 'invoices.payor_id contains NULLs. NOT IN against a list with a NULL returns no rows at all. (It is also the wrong column!)', fix: `SELECT p.patient_id FROM patients p WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id);` },
      { wrong: `SELECT p.patient_id FROM patients p WHERE (SELECT COUNT(*) FROM invoices i WHERE i.patient_id = p.patient_id AND i.status = 'Overdue') > 0;`, why: 'COUNT(*) must count every match; EXISTS can stop at the first one.', fix: `SELECT p.patient_id FROM patients p WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id AND i.status = 'Overdue');` },
    ],
    rules: ['Index the correlation column of correlated subqueries.', 'Use EXISTS for "has at least one"; it stops early.', 'Prefer NOT EXISTS over NOT IN when NULLs are possible.', 'JOIN + DISTINCT is usually slower than EXISTS for existence checks.'],
    compare: `<table><tr><th>Form</th><th>Runs</th><th>NULL-safe</th><th>Duplicates</th></tr>
<tr><td>IN (subquery)</td><td>Once, list probe</td><td>Yes</td><td>No duplicates</td></tr>
<tr><td>EXISTS</td><td>Per outer row (or semi-join)</td><td>Yes</td><td>No duplicates</td></tr>
<tr><td>JOIN</td><td>Join</td><td>Yes</td><td>Can duplicate outer rows</td></tr>
<tr><td>NOT IN</td><td>Once</td><td><b>No</b></td><td>-</td></tr>
<tr><td>NOT EXISTS</td><td>Anti-join</td><td>Yes</td><td>-</td></tr></table>`,
    realWorld: 'A collections letter job selects patients with any overdue invoice. Switching from JOIN + DISTINCT to EXISTS with an index on invoices(patient_id) removed a large sort and cut runtime in half.',
    deep: `<p>PostgreSQL turns EXISTS into a <code>Semi Join</code> and NOT EXISTS into an <code>Anti Join</code>, which can use hash or merge strategies. It cannot do this for NOT IN (because of NULL semantics), which is another reason to prefer NOT EXISTS. SQL Server shows <code>Left Semi Join</code> / <code>Left Anti Semi Join</code>.</p>`,
    tryIt: { prompt: 'Compare the plans of the EXISTS version and the IN version with the index in place.', starter: `CREATE INDEX idx_invoices_patient ON invoices(patient_id);\n\nEXPLAIN QUERY PLAN\nSELECT patient_id FROM patients\nWHERE patient_id IN (SELECT patient_id FROM invoices WHERE status = 'Overdue');` },
    challenge: {
      level: 2,
      prompt: 'Return patient_id, first_name and last_name of patients who have at least one Overdue invoice, using EXISTS. Order by patient_id.',
      solution: `SELECT p.patient_id, p.first_name, p.last_name FROM patients p WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id AND i.status = 'Overdue') ORDER BY p.patient_id;`,
      hints: ['Outer query on patients.', 'Inner query: SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id ...', 'Add AND i.status = \'Overdue\' inside the subquery.', 'ORDER BY p.patient_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Why can EXISTS be faster than COUNT(*) > 0?', options: ['It uses less memory for columns', 'It stops at the first match', 'It skips the index', 'It runs in parallel'], answer: 1, why: 'COUNT must find every match.' },
      { q: 'Which is dangerous when the subquery column contains NULLs?', options: ['EXISTS', 'NOT EXISTS', 'NOT IN', 'IN'], answer: 2, why: 'x NOT IN (..., NULL) is never TRUE.' },
    ],
  },
  // ---------------------------------------------------------------- 16
  {
    id: 'optimization-16',
    goals: ['How GROUP BY is executed: sorting vs hashing', 'Using an index to avoid a grouping sort', 'Filter before aggregating (WHERE vs HAVING)', 'Pre-aggregating before joins'],
    concept: `<p>To GROUP BY, the engine must bring rows with the same key together. Two ways:</p>
<ul>
<li><b>Sort-based</b>: sort by the group key, then total each run. SQLite shows <code>USE TEMP B-TREE FOR GROUP BY</code>.</li>
<li><b>Hash-based</b>: keep a hash table of running totals per key (PostgreSQL <code>HashAggregate</code>).</li>
</ul>
<p>If an index already stores rows in group-key order, no sort is needed at all. With <code>charges(practitioner_id, amount)</code> SQLite reads the covering index in order and sums as it goes.</p>
<p>Also: filter with <b>WHERE</b> (before grouping) instead of <b>HAVING</b> whenever the condition is on raw columns.</p>`,
    why: 'Aggregation over big tables (charges, transactions) powers every dashboard. Sorting millions of rows is expensive.',
    when: 'Revenue per practitioner, per payor, per month; any report with SUM/COUNT over large tables.',
    analogy: 'Totaling charge slips per doctor: if the slips are already filed by doctor, you just add each stack. If they are in a random pile, you first sort them.',
    syntax: `CREATE INDEX idx ON t(group_col, value_col);\nSELECT group_col, SUM(value_col) FROM t WHERE ... GROUP BY group_col;`,
    sql: `SELECT practitioner_id, COUNT(*) AS charges, SUM(amount) AS billed\nFROM charges\nGROUP BY practitioner_id;`,
    breakdown: [
      ['GROUP BY practitioner_id', 'Rows for the same practitioner must be brought together'],
      ['COUNT(*), SUM(amount)', 'Running totals per group'],
      ['Index (practitioner_id, amount)', 'Already ordered by practitioner and contains amount: SCAN charges USING COVERING INDEX, no temp B-tree'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_charges_practitioner_amount ON charges(practitioner_id, amount)` },
    internals: `<p>Before the index: <code>SCAN charges</code> + <code>USE TEMP B-TREE FOR GROUP BY</code> (every row is inserted into a temporary sorted structure). After: <code>SCAN charges USING COVERING INDEX idx_charges_practitioner_amount</code>: a streaming aggregate that emits each practitioner\'s totals as soon as the key changes, using constant memory.</p>`,
    mistakes: [
      { wrong: `SELECT practitioner_id, SUM(amount) FROM charges GROUP BY practitioner_id HAVING practitioner_id IN (3, 8);`, why: 'HAVING filters after grouping, so all practitioners are aggregated first.', fix: `SELECT practitioner_id, SUM(amount) FROM charges WHERE practitioner_id IN (3, 8) GROUP BY practitioner_id;` },
      { wrong: `SELECT DISTINCT practitioner_id, SUM(amount) OVER (PARTITION BY practitioner_id) FROM charges;`, why: 'A window over every row plus DISTINCT does far more work than a plain GROUP BY.', fix: `SELECT practitioner_id, SUM(amount) FROM charges GROUP BY practitioner_id;` },
    ],
    rules: ['WHERE before GROUP BY; HAVING only for aggregate conditions.', 'An index in group-key order removes the grouping sort.', 'Aggregate child tables before joining them to parents.', 'COUNT(*) is cheaper than COUNT(DISTINCT ...).'],
    compare: `<table><tr><th>Strategy</th><th>Plan text</th><th>Memory</th><th>Output order</th></tr>
<tr><td>Sort + group</td><td>TEMP B-TREE / GroupAggregate + Sort</td><td>Sort buffer</td><td>Sorted</td></tr>
<tr><td>Hash aggregate</td><td>HashAggregate</td><td>One entry per group</td><td>Unordered</td></tr>
<tr><td>Streaming via index</td><td>COVERING INDEX / GroupAggregate</td><td>Constant</td><td>Sorted</td></tr></table>`,
    realWorld: 'The practitioner productivity dashboard sums charges per practitioner every minute. A covering index on (practitioner_id, amount) keeps it fast as charges grow into the millions.',
    deep: `<p>For large analytical workloads, row-by-row aggregation gives way to <b>columnstore</b> indexes (SQL Server), columnar engines (DuckDB, BigQuery, Redshift) and <b>materialized views</b> or summary tables maintained incrementally. PostgreSQL can run <code>Partial Aggregate</code> in parallel workers and combine them with <code>Finalize Aggregate</code>.</p>`,
    tryIt: { prompt: 'Add ORDER BY billed DESC to the query. Does a TEMP B-TREE come back even with the index? Why?', starter: `CREATE INDEX idx_charges_practitioner_amount ON charges(practitioner_id, amount);\n\nEXPLAIN QUERY PLAN\nSELECT practitioner_id, SUM(amount) AS billed\nFROM charges GROUP BY practitioner_id\nORDER BY billed DESC;` },
    challenge: {
      level: 2,
      prompt: 'Return practitioner_id, number of charges and total billed for practitioners 3 and 8 only, filtering with WHERE (not HAVING). Order by practitioner_id.',
      solution: `SELECT practitioner_id, COUNT(*) AS charges, SUM(amount) AS billed FROM charges WHERE practitioner_id IN (3, 8) GROUP BY practitioner_id ORDER BY practitioner_id;`,
      hints: ['The filter is on a raw column, so it belongs in WHERE.', 'WHERE practitioner_id IN (3, 8).', 'GROUP BY practitioner_id with COUNT(*) and SUM(amount).', 'ORDER BY practitioner_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What does "USE TEMP B-TREE FOR GROUP BY" indicate?', options: ['An index is used', 'An extra sort structure is built to group rows', 'Hash aggregation', 'Nothing important'], answer: 1, why: 'SQLite needs to bring groups together because no index provides that order.' },
      { q: 'Condition practitioner_id = 3 in HAVING vs WHERE?', options: ['Same speed', 'WHERE is better: rows are removed before grouping', 'HAVING is better', 'HAVING is required'], answer: 1, why: 'WHERE shrinks the input to the aggregate.' },
    ],
  },
  // ---------------------------------------------------------------- 17
  {
    id: 'optimization-17',
    goals: ['What a sargable predicate is', 'Rewriting functions on columns into ranges', 'OR vs UNION / IN rewrites', 'Checking that a rewrite returns the same result'],
    concept: `<p><b>Query rewriting</b> means expressing the same question in a form the optimizer can run faster. The most important idea is <b>sargable</b> (Search ARGument ABLE) predicates: conditions where the column stands alone, so an index can be used.</p>
<table><tr><th>Not sargable</th><th>Sargable rewrite</th></tr>
<tr><td><code>strftime('%Y', invoice_date) = '2026'</code></td><td><code>invoice_date &gt;= '2026-01-01' AND invoice_date &lt; '2027-01-01'</code></td></tr>
<tr><td><code>total_amount * 1.1 &gt; 200</code></td><td><code>total_amount &gt; 200 / 1.1</code></td></tr>
<tr><td><code>substr(cpt_code, 1, 3) = '992'</code></td><td><code>cpt_code LIKE '992%'</code> (or &gt;= '992' AND &lt; '993')</td></tr></table>
<p>Other rewrites: <code>OR</code> on the same column -&gt; <code>IN</code>; correlated subquery -&gt; join or window function; <code>SELECT DISTINCT</code> hiding a bad join -&gt; <code>EXISTS</code>.</p>`,
    why: 'The same logical question can be 1000x cheaper when written so indexes can be used.',
    when: 'When a plan shows SCAN despite an index on the filtered column, often because the column is wrapped in a function or expression.',
    analogy: 'Asking the records clerk for "charts whose year of birth, computed from the full date, is 1951" vs "charts filed between 1951-01-01 and 1951-12-31": the second uses the filing order directly.',
    syntax: `-- Instead of: WHERE f(col) = value\nWHERE col >= low AND col < high`,
    sql: `SELECT invoice_id, invoice_date, total_amount\nFROM invoices\nWHERE invoice_date >= '2026-01-01'\n  AND invoice_date <  '2027-01-01';`,
    breakdown: [
      ['invoice_date >= \'2026-01-01\'', 'Lower bound on the bare column: the index can seek here'],
      ['AND invoice_date < \'2027-01-01\'', 'Half-open upper bound: includes all of 2026, no end-of-day issues'],
      ['Index on invoices(invoice_date)', 'Plan: SEARCH invoices USING INDEX idx_invoices_date (invoice_date>? AND invoice_date<?)'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_invoices_date ON invoices(invoice_date)` },
    internals: `<p>An index is sorted by the stored value of the column. The engine cannot know the order of <code>strftime('%Y', invoice_date)</code> without computing it for every row, so it must scan. With bare-column bounds it can binary-search the B-tree for the start key and stop at the end key. Try the non-sargable version in "Try it": the plan says <code>SCAN invoices</code> even with the index.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id FROM invoices WHERE strftime('%Y', invoice_date) = '2026';`, why: 'Function on the column: full scan.', fix: `SELECT invoice_id FROM invoices WHERE invoice_date >= '2026-01-01' AND invoice_date < '2027-01-01';` },
      { wrong: `SELECT invoice_id FROM invoices WHERE invoice_date BETWEEN '2026-01-01' AND '2026-12-31 23:59:59';`, why: 'Works for text dates here but is fragile with timestamps and precision. Half-open ranges are always correct.', fix: `SELECT invoice_id FROM invoices WHERE invoice_date >= '2026-01-01' AND invoice_date < '2027-01-01';` },
      { wrong: `SELECT invoice_id FROM invoices WHERE status = 'Open' OR status = 'Overdue' OR status = 'Partially Paid';`, why: 'Works, but long OR chains are harder to read and some optimizers handle IN better.', fix: `SELECT invoice_id FROM invoices WHERE status IN ('Open', 'Overdue', 'Partially Paid');` },
    ],
    rules: ['Keep indexed columns bare on one side of the comparison.', 'Move math to the constant side.', 'Use half-open date ranges: >= start AND < next_start.', 'Verify the rewrite returns exactly the same rows (EXCEPT both ways).'],
    compare: `<table><tr><th>Pattern</th><th>Sargable?</th></tr>
<tr><td>col = ?</td><td>Yes</td></tr>
<tr><td>col BETWEEN ? AND ?</td><td>Yes</td></tr>
<tr><td>col LIKE 'abc%'</td><td>Yes (with the right collation)</td></tr>
<tr><td>col LIKE '%abc'</td><td>No</td></tr>
<tr><td>func(col) = ?</td><td>No (unless there is an expression index)</td></tr>
<tr><td>col + 10 &gt; ?</td><td>No; rewrite as col &gt; ? - 10</td></tr></table>`,
    realWorld: 'A "charges this year" report used YEAR(service_date) = 2026 in MySQL. Rewriting to a date range let it use the existing index and dropped runtime from 40 s to 0.2 s.',
    deep: `<p>Verify a rewrite is equivalent by running <code>(original EXCEPT rewrite)</code> and <code>(rewrite EXCEPT original)</code>; both must be empty. Beware of NULLs and type conversions: in SQLite, comparing a TEXT column to a number uses affinity rules that can change results. Some engines (Oracle, SQL Server) can convert some non-sargable forms automatically, e.g. <code>CAST(datetime_col AS date) = ?</code> in SQL Server is still seekable.</p>`,
    tryIt: { prompt: 'With the index created, explain the non-sargable version. Then prove both versions return the same rows using EXCEPT.', starter: `CREATE INDEX idx_invoices_date ON invoices(invoice_date);\n\nEXPLAIN QUERY PLAN\nSELECT invoice_id FROM invoices WHERE strftime('%Y', invoice_date) = '2026';\n\n-- SELECT invoice_id FROM invoices WHERE strftime('%Y', invoice_date) = '2026'\n-- EXCEPT\n-- SELECT invoice_id FROM invoices WHERE invoice_date >= '2026-01-01' AND invoice_date < '2027-01-01';` },
    challenge: {
      level: 3,
      prompt: 'This report is slow: SELECT charge_id, service_date, amount FROM charges WHERE strftime(\'%Y-%m\', service_date) = \'2026-03\'. Rewrite it in a sargable form that returns the same rows. Order by service_date, then charge_id.',
      solution: `SELECT charge_id, service_date, amount FROM charges WHERE service_date >= '2026-03-01' AND service_date < '2026-04-01' ORDER BY service_date, charge_id;`,
      hints: ['Remove strftime() from the column.', 'March 2026 starts at \'2026-03-01\'.', 'Use a half-open range ending at the first day of April.', 'WHERE service_date >= \'2026-03-01\' AND service_date < \'2026-04-01\'.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which predicate is sargable?', options: ['strftime(\'%Y\', invoice_date) = \'2026\'', 'invoice_date >= \'2026-01-01\'', 'lower(status) = \'paid\'', 'total_amount + 0 > 100'], answer: 1, why: 'The column is bare, so the index can seek.' },
      { q: 'Best rewrite of total_amount * 2 > 400?', options: ['total_amount > 200', 'total_amount * 2 >= 400', 'CAST(total_amount AS INT) > 200', 'ABS(total_amount) > 200'], answer: 0, why: 'Move the math to the constant side.' },
    ],
  },
  // ---------------------------------------------------------------- 18
  {
    id: 'optimization-18',
    goals: ['What the N+1 query problem is', 'Why many tiny queries are slow (round trips)', 'Fixing N+1 with a JOIN, IN list or aggregate', 'Spotting N+1 from ORMs'],
    concept: `<p>The <b>N+1 problem</b>: an application runs <b>1</b> query to get a list (say 48 invoices), then <b>N</b> more queries, one per item, to fetch related data (each invoice\'s charges). That is 49 round trips.</p>
<pre>SELECT invoice_id FROM invoices WHERE status = 'Overdue';     -- 1 query, 13 rows
SELECT SUM(amount) FROM charges WHERE invoice_id = 3;         -- N queries...
SELECT SUM(amount) FROM charges WHERE invoice_id = 9;
...</pre>
<p>Each query is fast, but every round trip costs network latency, parsing and locking. The fix is to ask for everything in <b>one</b> set-based query: a JOIN with GROUP BY, or <code>WHERE invoice_id IN (...)</code>.</p>`,
    why: 'Latency adds up: 1,000 queries x 2 ms = 2 seconds, even though each query is "fast".',
    when: 'Any time code loops over rows and runs a query inside the loop, typically lazy loading in ORMs.',
    analogy: 'Calling the insurance company once per claim to ask its status (N calls) vs sending one batch eligibility request for all claims.',
    syntax: `-- Instead of a query per parent row:\nSELECT p.id, AGG(c.col)\nFROM parent p JOIN child c ON c.parent_id = p.id\nWHERE ...\nGROUP BY p.id;`,
    sql: `SELECT i.invoice_id, i.due_date, COUNT(c.charge_id) AS n_charges, SUM(c.amount) AS charged\nFROM invoices i\nLEFT JOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.status = 'Overdue'\nGROUP BY i.invoice_id, i.due_date\nORDER BY i.invoice_id;`,
    breakdown: [
      ['FROM invoices i WHERE i.status = \'Overdue\'', 'The "1" query: the list'],
      ['LEFT JOIN charges c ON c.invoice_id = i.invoice_id', 'Replaces the N per-invoice queries'],
      ['GROUP BY i.invoice_id ...', 'One row per invoice with its charge totals, in a single round trip'],
    ],
    visual: { type: 'flow', steps: [['N+1: 1 query', 'SELECT overdue invoices -> 13 rows'], ['N+1: 13 more queries', 'SELECT SUM(amount) FROM charges WHERE invoice_id = ? (x13)'], ['Total: 14 round trips', 'latency x 14'], ['Set-based: 1 query', 'invoices LEFT JOIN charges GROUP BY invoice_id'], ['Total: 1 round trip', 'same 13 result rows']] },
    internals: `<p>Each separate query pays: network round trip, statement parse/plan (unless prepared), permission checks, snapshot/lock acquisition, and result serialization. A single join lets the database use one plan (for example one index scan on charges(invoice_id) or a hash join) and stream all results at once.</p>`,
    mistakes: [
      { wrong: `-- application loop:\n-- for each invoice in (SELECT invoice_id FROM invoices WHERE status='Overdue'):\nSELECT SUM(amount) FROM charges WHERE invoice_id = 3;`, why: 'One query per row: N round trips.', fix: `SELECT invoice_id, SUM(amount) FROM charges WHERE invoice_id IN (SELECT invoice_id FROM invoices WHERE status = 'Overdue') GROUP BY invoice_id;` },
      { wrong: `SELECT i.invoice_id, SUM(c.amount) FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id WHERE i.status = 'Overdue' GROUP BY i.invoice_id;`, why: 'Inner join drops invoices with no charges; the per-row loop would have shown them with 0.', fix: `SELECT i.invoice_id, COALESCE(SUM(c.amount), 0) FROM invoices i LEFT JOIN charges c ON c.invoice_id = i.invoice_id WHERE i.status = 'Overdue' GROUP BY i.invoice_id;` },
    ],
    rules: ['Never run a query inside a loop over query results if one set-based query can do it.', 'Use JOIN + GROUP BY or IN (...) for batch fetches.', 'Use LEFT JOIN to keep parents without children.', 'In ORMs use eager loading (include / prefetch / join fetch).'],
    compare: `<table><tr><th></th><th>N+1</th><th>Single query</th></tr>
<tr><td>Round trips</td><td>N + 1</td><td>1</td></tr>
<tr><td>Plans</td><td>N + 1 executions</td><td>1</td></tr>
<tr><td>Scales with</td><td>number of rows x latency</td><td>data size</td></tr></table>`,
    realWorld: 'A patient statements page loaded 200 patients and then their invoices one by one (201 queries, 1.8 s). Eager loading with a single join returned the page in 60 ms.',
    deep: `<p>ORM fixes: Django <code>select_related</code> / <code>prefetch_related</code>, Rails <code>includes</code>, Hibernate <code>JOIN FETCH</code> / <code>@BatchSize</code>, Entity Framework <code>Include</code>, GraphQL DataLoader batching. Beware the opposite problem: one giant join that fans out (charges x payments). Two batched queries (one per child table) are often best.</p>`,
    tryIt: { prompt: 'Rewrite the per-invoice lookups as one query using IN (subquery) and GROUP BY.', starter: `-- N+1 style (one of the N queries):\nSELECT SUM(amount) FROM charges WHERE invoice_id = 3;\n\n-- Your single set-based query:\nSELECT invoice_id, SUM(amount)\nFROM charges\nWHERE invoice_id IN (SELECT invoice_id FROM invoices WHERE status = 'Overdue')\nGROUP BY invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'Replace an N+1 loop that fetched each practitioner\'s charge count: in one query return every practitioner (practitioner_id, last_name) with their number of charges, including practitioners with 0 charges. Order by practitioner_id.',
      solution: `SELECT pr.practitioner_id, pr.last_name, COUNT(c.charge_id) AS n_charges FROM practitioners pr LEFT JOIN charges c ON c.practitioner_id = pr.practitioner_id GROUP BY pr.practitioner_id, pr.last_name ORDER BY pr.practitioner_id;`,
      hints: ['Start from practitioners so everyone appears.', 'LEFT JOIN charges on practitioner_id.', 'COUNT(c.charge_id) counts 0 for practitioners with no charges (not COUNT(*)).', 'GROUP BY practitioner_id, last_name ORDER BY practitioner_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'An app lists 100 patients and then runs one query per patient for their balance. How many queries?', options: ['1', '100', '101', '2'], answer: 2, why: '1 list query + 100 per-row queries.' },
      { q: 'Main cost of N+1?', options: ['Disk space', 'Repeated round trips and per-query overhead', 'Wrong results', 'Locks on DDL'], answer: 1, why: 'Each small query pays latency and overhead.' },
    ],
  },
  // ---------------------------------------------------------------- 19
  {
    id: 'optimization-19',
    goals: ['What table partitioning is', 'Range, list and hash partitioning', 'Partition pruning', 'When partitioning helps and when it does not'],
    concept: `<p><b>Partitioning</b> splits one big logical table into smaller physical pieces (partitions), usually by a key such as date. Queries still see one table, but the engine can skip partitions that cannot contain matching rows: <b>partition pruning</b>.</p>
<p>PostgreSQL example: transactions partitioned by year.</p>
<pre>CREATE TABLE transactions (
  transaction_id   bigint,
  invoice_id       bigint,
  transaction_date date NOT NULL,
  transaction_type text,
  amount           numeric(12,2)
) PARTITION BY RANGE (transaction_date);

CREATE TABLE transactions_2025 PARTITION OF transactions
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE transactions_2026 PARTITION OF transactions
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

EXPLAIN SELECT SUM(amount) FROM transactions
WHERE transaction_date &gt;= '2026-06-01';

Aggregate
  -&gt;  Seq Scan on transactions_2026 transactions
        Filter: (transaction_date &gt;= '2026-06-01'::date)
-- transactions_2025 was pruned: never read</pre>
<p>SQLite has no partitioning. The runnable example shows how the rows <i>would</i> be distributed across yearly partitions.</p>`,
    why: 'Very large tables become easier to query (pruning), maintain (vacuum/reindex per partition) and archive (drop an old partition instantly).',
    when: 'Tables with hundreds of millions of rows and a natural key most queries filter on (transaction_date, service_date), plus a retention policy.',
    analogy: 'Keeping claims in one filing cabinet per year. Looking for June 2026 claims, you open only the 2026 cabinet; archiving 2019 means wheeling that one cabinet away.',
    syntax: `-- PostgreSQL\nCREATE TABLE t (...) PARTITION BY RANGE (date_col);\nCREATE TABLE t_2026 PARTITION OF t FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');`,
    sql: `SELECT strftime('%Y', transaction_date) AS partition_year,\n       COUNT(*) AS rows_in_partition,\n       MIN(transaction_date) AS first_date,\n       MAX(transaction_date) AS last_date\nFROM transactions\nGROUP BY partition_year\nORDER BY partition_year;`,
    breakdown: [
      ['strftime(\'%Y\', transaction_date) AS partition_year', 'The partition key each row would be routed by'],
      ['COUNT(*) AS rows_in_partition', 'How big each yearly partition would be'],
      ['MIN / MAX(transaction_date)', 'The value range each partition covers'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 560 190" width="100%"><text x="10" y="18" fill="var(--text)" font-size="13" font-weight="bold">Partition pruning: WHERE transaction_date &gt;= '2026-06-01'</text>
<rect x="200" y="30" width="160" height="28" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="280" y="49" fill="var(--text)" font-size="12" text-anchor="middle">transactions (logical)</text>
<line x1="240" y1="58" x2="120" y2="100" stroke="var(--muted)"/><line x1="320" y1="58" x2="440" y2="100" stroke="var(--muted)"/>
<rect x="40" y="100" width="160" height="60" rx="6" fill="var(--panel2)" stroke="var(--red)" stroke-dasharray="5 4"/><text x="120" y="125" fill="var(--muted)" font-size="12" text-anchor="middle">transactions_2025</text><text x="120" y="145" fill="var(--red)" font-size="11" text-anchor="middle">pruned (not read)</text>
<rect x="360" y="100" width="160" height="60" rx="6" fill="var(--panel2)" stroke="var(--green)" stroke-width="2"/><text x="440" y="125" fill="var(--text)" font-size="12" text-anchor="middle">transactions_2026</text><text x="440" y="145" fill="var(--green)" font-size="11" text-anchor="middle">scanned</text></svg>` },
    internals: `<p>Pruning happens at plan time when the filter uses constants, and at execution time for parameters or join values (PostgreSQL "Subplans Removed"). Each partition has its own indexes, so index B-trees are smaller. Unique constraints must include the partition key. Queries that do not filter on the partition key must visit every partition, which can be slower than one unpartitioned table.</p>`,
    mistakes: [
      { wrong: `-- PostgreSQL, partitioned by transaction_date\nSELECT SUM(amount) FROM transactions WHERE invoice_id = 13;`, why: 'No filter on the partition key: every partition is scanned (no pruning).', fix: `SELECT SUM(amount) FROM transactions WHERE invoice_id = 13 AND transaction_date >= '2026-01-01';` },
      { wrong: `-- Partition a 50,000-row table by day`, why: 'Thousands of tiny partitions add planning overhead with no benefit. Partitioning is for very large tables.', fix: `CREATE INDEX idx_transactions_date ON transactions(transaction_date);` },
    ],
    rules: ['Partition only very large tables.', 'Choose the key most queries filter on (usually a date).', 'Queries must filter on the partition key to get pruning.', 'Dropping or detaching an old partition is an instant archive.'],
    compare: `<table><tr><th>Type</th><th>Split by</th><th>Healthcare example</th></tr>
<tr><td>Range</td><td>Value ranges</td><td>transactions per year/month</td></tr>
<tr><td>List</td><td>Explicit values</td><td>invoices per state or payor_type</td></tr>
<tr><td>Hash</td><td>hash(key) mod N</td><td>patients spread evenly over 8 partitions</td></tr></table>
<p><b>Partitioning</b> splits a table inside one database; <b>sharding</b> splits data across several database servers.</p>`,
    realWorld: 'A clearinghouse stores 2 billion claim transactions partitioned by month. Daily reports touch only the current month; data older than 7 years is detached and archived in seconds.',
    deep: `<p>MySQL: <code>PARTITION BY RANGE (YEAR(transaction_date)) (PARTITION p2025 VALUES LESS THAN (2026), ...)</code>. SQL Server uses partition functions and schemes. Oracle adds interval partitioning (auto-created partitions) and composite range-hash. In SQLite, the closest emulation is separate tables per year plus a <code>UNION ALL</code> view.</p>`,
    dialectSql: {
      postgres: `CREATE TABLE transactions (...) PARTITION BY RANGE (transaction_date);\nCREATE TABLE transactions_2026 PARTITION OF transactions\n  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');`,
      mysql: `CREATE TABLE transactions (...)\nPARTITION BY RANGE (YEAR(transaction_date)) (\n  PARTITION p2025 VALUES LESS THAN (2026),\n  PARTITION p2026 VALUES LESS THAN (2027)\n);`,
      sqlserver: `CREATE PARTITION FUNCTION pf_year (date)\n  AS RANGE RIGHT FOR VALUES ('2026-01-01');\nCREATE PARTITION SCHEME ps_year AS PARTITION pf_year ALL TO ([PRIMARY]);\nCREATE TABLE transactions (...) ON ps_year(transaction_date);`,
      oracle: `CREATE TABLE transactions (...)\nPARTITION BY RANGE (transaction_date)\nINTERVAL (NUMTOYMINTERVAL(1, 'YEAR'))\n(PARTITION p2025 VALUES LESS THAN (DATE '2026-01-01'));`,
      sqlite: `-- No partitioning: emulate with per-year tables and a view\nCREATE VIEW all_transactions AS\n  SELECT * FROM transactions_2025\n  UNION ALL\n  SELECT * FROM transactions_2026;`,
    },
    tryIt: { prompt: 'Emulate partitioning in SQLite: split transactions into two tables and query them through a UNION ALL view.', starter: `CREATE TABLE tx_2025 AS SELECT * FROM transactions WHERE transaction_date < '2026-01-01';\nCREATE TABLE tx_2026 AS SELECT * FROM transactions WHERE transaction_date >= '2026-01-01';\nCREATE VIEW all_tx AS SELECT * FROM tx_2025 UNION ALL SELECT * FROM tx_2026;\n\nSELECT COUNT(*) FROM all_tx WHERE transaction_date >= '2026-06-01';` },
    challenge: {
      level: 2,
      prompt: 'Plan monthly partitions for 2026: return each 2026 month (YYYY-MM) of transactions with its row count and the sum of amounts. Use a sargable date range for the year filter. Order by month.',
      solution: `SELECT strftime('%Y-%m', transaction_date) AS month, COUNT(*) AS n, SUM(amount) AS net FROM transactions WHERE transaction_date >= '2026-01-01' AND transaction_date < '2027-01-01' GROUP BY month ORDER BY month;`,
      hints: ['Filter the year with >= \'2026-01-01\' AND < \'2027-01-01\'.', 'The partition key is strftime(\'%Y-%m\', transaction_date).', 'GROUP BY that month with COUNT(*) and SUM(amount).', 'ORDER BY month.'],
      ordered: true,
    },
    quiz: [
      { q: 'What is partition pruning?', options: ['Deleting old rows', 'Skipping partitions that cannot match the filter', 'Compressing partitions', 'Merging partitions'], answer: 1, why: 'The engine reads only relevant partitions.' },
      { q: 'A table partitioned by date is queried only by invoice_id. What happens?', options: ['Faster than before', 'Every partition is searched', 'The query fails', 'Only the newest partition is read'], answer: 1, why: 'Without a partition-key filter there is nothing to prune.' },
    ],
  },
  // ---------------------------------------------------------------- 20
  {
    id: 'optimization-20',
    goals: ['The layers of caching: buffer pool, OS, plan cache, result/application cache', 'Summary tables and materialized views as caches', 'Cache invalidation and staleness', 'Warm vs cold cache timing'],
    concept: `<p><b>Caching</b> keeps the results of expensive work so it does not have to be repeated. Several layers exist:</p>
<ul>
<li><b>Buffer pool / page cache</b>: data pages kept in RAM (PostgreSQL shared_buffers, InnoDB buffer pool, SQLite page cache). A "hit" avoids a disk read.</li>
<li><b>Plan cache</b>: compiled plans for prepared statements.</li>
<li><b>Materialized views / summary tables</b>: precomputed query results stored as a table.</li>
<li><b>Application cache</b> (Redis, Memcached): results kept outside the database.</li>
</ul>
<p>The hard part is <b>invalidation</b>: when a payment posts, every cached balance for that invoice is stale.</p>
<p>PostgreSQL shows cache behaviour in EXPLAIN (ANALYZE, BUFFERS):</p>
<pre>Buffers: shared hit=1240 read=86   -- 1240 pages from RAM, 86 from disk</pre>`,
    why: 'RAM is ~1000x faster than disk, and not recomputing is faster than any computation.',
    when: 'Dashboards and reports that are read far more often than the data changes, e.g. payor mix, monthly revenue.',
    analogy: 'The billing manager keeps a printed "revenue by payor" summary on the desk, updated each night, instead of re-adding every claim whenever someone asks.',
    syntax: `-- Summary table (works everywhere)\nCREATE TABLE summary AS SELECT key, AGG(x) FROM t GROUP BY key;\n-- PostgreSQL\nCREATE MATERIALIZED VIEW mv AS SELECT ...;\nREFRESH MATERIALIZED VIEW mv;`,
    sql: `CREATE TABLE payor_revenue_cache AS\nSELECT p.payor_id, p.payor_name,\n       COUNT(*) AS payments, SUM(pay.amount) AS collected,\n       date('2026-09-01') AS refreshed_on\nFROM payments pay\nJOIN payors p ON p.payor_id = pay.payor_id\nGROUP BY p.payor_id, p.payor_name;\n\nSELECT * FROM payor_revenue_cache ORDER BY collected DESC;`,
    breakdown: [
      ['CREATE TABLE payor_revenue_cache AS SELECT ...', 'Computes the expensive aggregate once and stores it'],
      ['date(\'2026-09-01\') AS refreshed_on', 'Record when the cache was built so readers know how fresh it is'],
      ['SELECT * FROM payor_revenue_cache', 'Readers hit the small cached table instead of re-aggregating payments'],
    ],
    visual: { type: 'flow', steps: [['Request: payor revenue', 'dashboard tile'], ['Application cache?', 'Redis hit -> return (fastest)'], ['Summary table / materialized view?', 'read 6 precomputed rows'], ['Buffer pool', 'pages in RAM -> no disk I/O'], ['Disk', 'cold read (slowest)']] },
    internals: `<p>Databases manage the buffer pool with LRU-like algorithms (PostgreSQL clock-sweep, InnoDB midpoint LRU). The first run of a query after a restart is "cold" (many disk reads); the second is "warm". Always compare timings under the same cache state. SQLite\'s page cache is per connection, sized by <code>PRAGMA cache_size</code>.</p>`,
    mistakes: [
      { wrong: `-- Cache patient balances for 24 hours in Redis`, why: 'A patient who pays and refreshes the page still sees the old balance. Cache lifetime must match how stale data may be.', fix: `SELECT i.invoice_id, i.total_amount - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS balance FROM invoices i WHERE i.patient_id = 24;` },
      { wrong: `-- "The query took 5 ms the second time, so it is fast."`, why: 'The second run was served from a warm cache. Measure cold and warm, and look at the plan.', fix: `EXPLAIN QUERY PLAN SELECT payor_id, SUM(amount) FROM payments GROUP BY payor_id;` },
    ],
    rules: ['Cache what is read often and changes rarely.', 'Every cache needs an invalidation or refresh plan.', 'Store the refresh time with cached results.', 'Compare performance under the same cache state.'],
    compare: `<table><tr><th>Cache</th><th>Stores</th><th>Freshness</th></tr>
<tr><td>Buffer pool</td><td>Data pages</td><td>Always current</td></tr>
<tr><td>Plan cache</td><td>Execution plans</td><td>Current data, maybe stale plan</td></tr>
<tr><td>Materialized view</td><td>Query result</td><td>As of last REFRESH</td></tr>
<tr><td>App cache (Redis)</td><td>Any result</td><td>As of TTL / invalidation</td></tr></table>`,
    realWorld: 'Executive dashboards read a nightly materialized view of revenue by payor and month, while the cashier screen always queries live payments.',
    deep: `<p>PostgreSQL <code>REFRESH MATERIALIZED VIEW CONCURRENTLY mv</code> rebuilds without blocking readers (requires a unique index). SQL Server indexed views and Oracle materialized views with <code>FAST REFRESH ON COMMIT</code> are maintained incrementally. MySQL removed its query cache in 8.0 because invalidation on every write made it a bottleneck.</p>`,
    tryIt: { prompt: 'Build the cache, then post a new payment. Compare the cached total with a live query: the cache is now stale.', starter: `CREATE TABLE payor_revenue_cache AS\nSELECT payor_id, SUM(amount) AS collected FROM payments WHERE payor_id IS NOT NULL GROUP BY payor_id;\n\nINSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (5, 2, '2026-09-01', 100, 'EFT');\n\nSELECT c.payor_id, c.collected AS cached,\n  (SELECT SUM(amount) FROM payments p WHERE p.payor_id = c.payor_id) AS live\nFROM payor_revenue_cache c ORDER BY c.payor_id;` },
    challenge: {
      level: 2,
      prompt: 'Write the SELECT that would populate a payor revenue cache: payor_name, number of payments and total collected for insurer (non-NULL payor) payments. Order by total collected, highest first.',
      solution: `SELECT p.payor_name, COUNT(*) AS payments, SUM(pay.amount) AS collected FROM payments pay JOIN payors p ON p.payor_id = pay.payor_id GROUP BY p.payor_id, p.payor_name ORDER BY collected DESC;`,
      hints: ['Join payments to payors on payor_id (this also drops NULL payors).', 'GROUP BY payor.', 'COUNT(*) and SUM(pay.amount).', 'ORDER BY collected DESC.'],
      ordered: true,
    },
    quiz: [
      { q: 'What is the hardest problem with caching?', options: ['Memory size', 'Invalidation / staleness', 'Syntax', 'Indexes'], answer: 1, why: 'Knowing when cached data is no longer true.' },
      { q: '"Buffers: shared hit=1240 read=86" means...', options: ['1240 disk reads', '1240 pages from memory, 86 from disk', '1240 rows returned', 'An error'], answer: 1, why: 'hit = found in the buffer cache; read = fetched from disk/OS.' },
    ],
  },
  // ---------------------------------------------------------------- 21
  {
    id: 'optimization-21',
    goals: ['Which operations need memory: sorts, hashes, aggregates', 'What happens when they spill to disk', 'Memory settings (work_mem, sort buffers, cache_size)', 'Using indexes and LIMIT to avoid big sorts'],
    concept: `<p>Some operations need <b>working memory</b>:</p>
<ul>
<li><b>Sorting</b> (ORDER BY, DISTINCT, GROUP BY by sort, merge joins).</li>
<li><b>Hash tables</b> (hash joins, hash aggregates).</li>
</ul>
<p>If the data fits in the allowed memory, the operation is fast. If not, it <b>spills</b> to temporary files on disk, which can be 10-100x slower. PostgreSQL EXPLAIN ANALYZE reveals it:</p>
<pre>Sort  (actual time=812.4..1034.9 rows=2000000 loops=1)
  Sort Key: invoice_date DESC
  Sort Method: external merge  Disk: 58976kB     -- spilled!
-- vs, after SET work_mem = '256MB':
  Sort Method: quicksort  Memory: 181204kB</pre>
<p>The best fix is often to <b>avoid the sort entirely</b>: an index in the needed order lets the engine read rows already sorted, and with LIMIT it stops early.</p>`,
    why: 'Memory is shared by all concurrent queries. Big sorts and hashes either spill (slow) or starve other sessions.',
    when: 'Large ORDER BY / GROUP BY / DISTINCT queries, big hash joins, and "top N" screens.',
    analogy: 'Sorting claim forms on your desk is quick if they fit; if they don\'t, you spread piles on the floor and merge them, which takes much longer. Better: take them from a cabinet already filed in date order.',
    syntax: `-- Avoid the sort with an index in ORDER BY order\nCREATE INDEX idx ON t(sort_col);\nSELECT ... FROM t ORDER BY sort_col DESC LIMIT n;`,
    sql: `SELECT invoice_id, invoice_date, total_amount\nFROM invoices\nORDER BY invoice_date DESC\nLIMIT 10;`,
    breakdown: [
      ['ORDER BY invoice_date DESC', 'Without an index SQLite sorts all rows in a temp B-tree (memory, or disk if large)'],
      ['LIMIT 10', 'With an index in date order the engine reads the last 10 entries and stops'],
      ['Index on invoices(invoice_date)', 'Plan changes from SCAN + USE TEMP B-TREE FOR ORDER BY to SCAN invoices USING INDEX (no sort)'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_invoices_date ON invoices(invoice_date)` },
    internals: `<p>SQLite\'s sorter keeps rows in memory up to a threshold, then writes sorted runs to temporary files and merges them. <code>PRAGMA cache_size</code> sets the page cache; <code>PRAGMA temp_store = MEMORY</code> keeps temp B-trees in RAM. In PostgreSQL <code>work_mem</code> is <b>per operation, per query</b>: a query with 4 sorts and 100 connections can use 400 x work_mem. SQL Server grants memory per query and reports spills as warnings on Sort/Hash operators.</p>`,
    mistakes: [
      { wrong: `-- SET work_mem = '4GB' globally to fix one slow report`, why: 'Every sort in every session may take that much: the server can run out of memory.', fix: `CREATE INDEX idx_invoices_date ON invoices(invoice_date);` },
      { wrong: `SELECT DISTINCT * FROM charges ORDER BY service_date;`, why: 'DISTINCT on every column forces a huge sort/hash for nothing when rows are already unique (charge_id is a key).', fix: `SELECT * FROM charges ORDER BY service_date;` },
    ],
    rules: ['Sorts and hashes use memory; too big = spill to disk.', 'An index in ORDER BY order removes the sort.', 'LIMIT + index = read only what you show.', 'Raise memory per session/query, not globally.'],
    compare: `<table><tr><th>Database</th><th>Main per-operation memory</th><th>Cache memory</th></tr>
<tr><td>SQLite</td><td>sorter threshold, temp_store</td><td>PRAGMA cache_size</td></tr>
<tr><td>PostgreSQL</td><td>work_mem, hash_mem_multiplier</td><td>shared_buffers + OS cache</td></tr>
<tr><td>MySQL</td><td>sort_buffer_size, join_buffer_size</td><td>innodb_buffer_pool_size</td></tr>
<tr><td>SQL Server</td><td>memory grants</td><td>buffer pool (max server memory)</td></tr></table>`,
    realWorld: 'An "export all transactions sorted by date" job spilled 12 GB to disk nightly. Adding an index on transaction_date let it stream rows in order with almost no memory.',
    deep: `<p>PostgreSQL <code>SET LOCAL work_mem = '256MB';</code> inside a transaction raises memory only for that report. <code>log_temp_files = 0</code> logs every spill. For top-N without an index PostgreSQL uses <code>Sort Method: top-N heapsort</code>, which keeps only N rows in memory: another reason to always add LIMIT when you only show a page.</p>`,
    tryIt: { prompt: 'Explain the query without and with the index. Then remove LIMIT: does the plan change?', starter: `EXPLAIN QUERY PLAN\nSELECT invoice_id, invoice_date FROM invoices ORDER BY invoice_date DESC LIMIT 10;\n\n-- CREATE INDEX idx_invoices_date ON invoices(invoice_date);` },
    challenge: {
      level: 2,
      prompt: 'The "latest activity" screen shows the 10 most recent transactions: transaction_id, transaction_date, transaction_type and amount, newest first (ties broken by transaction_id descending).',
      solution: `SELECT transaction_id, transaction_date, transaction_type, amount FROM transactions ORDER BY transaction_date DESC, transaction_id DESC LIMIT 10;`,
      hints: ['Only 10 rows are needed: use LIMIT.', 'Newest first: ORDER BY transaction_date DESC.', 'Break ties with transaction_id DESC.', 'ORDER BY transaction_date DESC, transaction_id DESC LIMIT 10.'],
      ordered: true,
    },
    quiz: [
      { q: 'What does "Sort Method: external merge Disk: 58976kB" mean?', options: ['The sort was in memory', 'The sort spilled to disk', 'An index was used', 'The query failed'], answer: 1, why: 'It did not fit in work_mem.' },
      { q: 'Best way to make ORDER BY invoice_date DESC LIMIT 10 cheap?', options: ['Increase memory', 'Index on invoice_date', 'Add DISTINCT', 'Use a subquery'], answer: 1, why: 'The index provides the order; LIMIT stops after 10 entries.' },
    ],
  },
  // ---------------------------------------------------------------- 22
  {
    id: 'optimization-22',
    goals: ['A repeatable tuning workflow: measure, explain, fix, verify', 'Case: A/R aging work queue', 'Case: N+1 statements, non-sargable dates, fan-out joins', 'Knowing when to stop'],
    concept: `<p>Real tuning follows a loop:</p>
<ol>
<li><b>Find</b> the slow or most frequent queries (slow query log, pg_stat_statements, Query Store).</li>
<li><b>Explain</b> them: where is the SCAN, the sort, the bad estimate?</li>
<li><b>Fix one thing</b>: an index, a sargable rewrite, pre-aggregation, fresh statistics.</li>
<li><b>Verify</b>: same results, better plan, better timing.</li>
</ol>
<p><b>Case: the collections work queue.</b> Every collector opens a screen listing overdue invoices with the amount owed per patient. The table grew to 20 million invoices and the screen took 9 seconds. The plan showed <code>SCAN invoices</code>. A composite index on <code>(status, due_date)</code> turned it into <code>SEARCH invoices USING INDEX (status=? AND due_date&lt;?)</code>: 40 ms.</p>`,
    why: 'Tuning is most effective when it is systematic. Random index adding wastes write performance and rarely fixes the real problem.',
    when: 'Whenever users complain, a job misses its window, or monitoring shows a query dominating database time.',
    analogy: 'Like a clinical workup: symptoms (slow screen), diagnostics (EXPLAIN), treatment (index/rewrite), follow-up (verify timings and results).',
    syntax: `EXPLAIN QUERY PLAN <slow query>;\nCREATE INDEX ... ;   -- one targeted change\nEXPLAIN QUERY PLAN <slow query>;  -- verify`,
    sql: `SELECT patient_id, COUNT(*) AS overdue_invoices, SUM(total_amount) AS overdue_amount\nFROM invoices\nWHERE status = 'Overdue'\n  AND due_date < '2026-09-01'\nGROUP BY patient_id\nORDER BY overdue_amount DESC;`,
    breakdown: [
      ['WHERE status = \'Overdue\' AND due_date < \'2026-09-01\'', 'Equality + range: perfect for a composite index (status, due_date)'],
      ['GROUP BY patient_id', 'Totals per patient for the collectors'],
      ['ORDER BY overdue_amount DESC', 'Biggest debts first: sorts the small grouped result, which is cheap'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_invoices_status_due ON invoices(status, due_date)` },
    internals: `<p>Other cases seen in billing systems:</p>
<ul>
<li><b>Statement generation (N+1)</b>: 1 query per patient -&gt; one join with GROUP BY: 200x fewer round trips.</li>
<li><b>Monthly revenue report (non-sargable)</b>: <code>strftime('%Y-%m', service_date) = ?</code> -&gt; half-open date range on an indexed column.</li>
<li><b>Payer reconciliation (fan-out)</b>: charges and payments joined directly (wrong totals, huge intermediate result) -&gt; aggregate each per invoice first, then join.</li>
<li><b>Stale statistics</b> after a data migration -&gt; ANALYZE.</li>
</ul>`,
    mistakes: [
      { wrong: `-- Add 12 indexes to invoices at once "to be safe"`, why: 'You cannot tell which helped, and every insert/update now maintains 12 structures.', fix: `CREATE INDEX idx_invoices_status_due ON invoices(status, due_date);` },
      { wrong: `-- Tune on a 50-row dev database`, why: 'Plans on tiny tables differ from production. Test with realistic volumes and fresh statistics.', fix: `ANALYZE;` },
    ],
    rules: ['Measure first; tune the biggest total-time queries.', 'Change one thing at a time.', 'Always verify results are identical after a rewrite.', 'Stop when it meets the requirement; extra indexes cost writes.'],
    compare: `<table><tr><th>Symptom in plan</th><th>Likely fix</th></tr>
<tr><td>SCAN big table with selective WHERE</td><td>Index on the filter columns</td></tr>
<tr><td>SCAN despite an index</td><td>Sargable rewrite / expression index</td></tr>
<tr><td>Inner loop SCAN in a join</td><td>Index on the join (FK) column</td></tr>
<tr><td>TEMP B-TREE for ORDER BY + LIMIT</td><td>Index in sort order</td></tr>
<tr><td>Estimates far from actual</td><td>ANALYZE / extended statistics</td></tr>
<tr><td>Thousands of identical small queries</td><td>Fix N+1 with a set-based query</td></tr></table>`,
    realWorld: 'Revenue-cycle teams track p95 latency of their top 20 queries. Most improvements come from a handful of composite indexes and removing N+1 patterns in the application.',
    deep: `<p>Tools: PostgreSQL <code>pg_stat_statements</code> (total_exec_time, calls, mean), <code>auto_explain</code>; MySQL <code>performance_schema</code> and the slow query log; SQL Server Query Store and missing-index DMVs; Oracle AWR/ASH reports. Sort by <b>total</b> time (calls x mean), not just the slowest single run: a 5 ms query called 2 million times a day matters more than a 30 s monthly report.</p>`,
    tryIt: { prompt: 'Explain the work-queue query, add the composite index, explain again. Then try the index with the columns reversed (due_date, status) and compare.', starter: `EXPLAIN QUERY PLAN\nSELECT patient_id, SUM(total_amount)\nFROM invoices\nWHERE status = 'Overdue' AND due_date < '2026-09-01'\nGROUP BY patient_id;\n\n-- CREATE INDEX idx_invoices_status_due ON invoices(status, due_date);` },
    challenge: {
      level: 3,
      prompt: 'Build the collections work queue: for patients with Overdue invoices due before 2026-09-01, return patient_id, last_name, number of overdue invoices and the overdue amount. Order by overdue amount descending, then patient_id.',
      solution: `SELECT i.patient_id, p.last_name, COUNT(*) AS overdue_invoices, SUM(i.total_amount) AS overdue_amount FROM invoices i JOIN patients p ON p.patient_id = i.patient_id WHERE i.status = 'Overdue' AND i.due_date < '2026-09-01' GROUP BY i.patient_id, p.last_name ORDER BY overdue_amount DESC, i.patient_id;`,
      hints: ['Filter invoices first: status = \'Overdue\' AND due_date < \'2026-09-01\'.', 'Join patients for last_name.', 'GROUP BY patient_id, last_name with COUNT(*) and SUM(total_amount).', 'ORDER BY overdue_amount DESC, i.patient_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What is the first step in tuning?', options: ['Add indexes', 'Measure and find the queries that cost the most', 'Rewrite everything', 'Buy more RAM'], answer: 1, why: 'Focus effort where time is actually spent.' },
      { q: 'Query A: 20 ms x 1,000,000 calls/day. Query B: 60 s x 1 call/day. Which uses more total time?', options: ['A', 'B', 'Equal', 'Cannot tell'], answer: 0, why: 'A = 20,000 s/day vs B = 60 s/day.' },
    ],
  },
]);
