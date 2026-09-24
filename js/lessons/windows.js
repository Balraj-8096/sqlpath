// Section 07: Window Functions (windows-01 .. windows-24)
// Small (<= 16 row) sources for the interactive window visual.
(function () {
const W_LOC = `SELECT invoice_id, location_id, invoice_date, total_amount FROM invoices WHERE location_id IN (3, 5)`; // 12 rows, ties of 110 in location 5
const W_L4 = `SELECT invoice_id, invoice_date, total_amount FROM invoices WHERE location_id = 4`; // 15 rows, several ties
const W_CHG = `SELECT invoice_id, charge_id, service_date, amount FROM charges WHERE invoice_id IN (4, 27, 40)`; // 11 rows, tied service dates
const W_TXN = `SELECT transaction_id, invoice_id, transaction_date, transaction_type, amount FROM transactions WHERE invoice_id IN (1, 6, 24)`; // 13 rows: refund, adjustment, write-off
const W_VISITS = `SELECT patient_id, invoice_id, invoice_date, total_amount FROM invoices WHERE patient_id IN (3, 7, 24)`; // 14 rows
const W_MONTH = `SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount) AS collected FROM payments GROUP BY month`; // 15 rows
const W_PAY = `SELECT invoice_id, payment_id, payment_date, amount FROM payments WHERE invoice_id IN (1, 2, 7, 14, 16, 19, 20)`; // 14 rows, invoice 1 has a duplicate payment

const FRAME_SVG = `<svg viewBox="0 0 640 250" width="100%" font-family="sans-serif" font-size="12">
<text x="10" y="18" fill="var(--text)" font-weight="bold">One partition, ordered by date. Current row = row 5</text>
<g>
<rect x="10" y="30" width="80" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="50" y="47" text-anchor="middle" fill="var(--text)">row 1</text>
<rect x="10" y="58" width="80" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="50" y="75" text-anchor="middle" fill="var(--text)">row 2</text>
<rect x="10" y="86" width="80" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="50" y="103" text-anchor="middle" fill="var(--text)">row 3</text>
<rect x="10" y="114" width="80" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="50" y="131" text-anchor="middle" fill="var(--text)">row 4</text>
<rect x="10" y="142" width="80" height="26" fill="var(--accent)" stroke="var(--border)"/><text x="50" y="159" text-anchor="middle" fill="var(--text)" font-weight="bold">row 5 ◀</text>
<rect x="10" y="170" width="80" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="50" y="187" text-anchor="middle" fill="var(--text)">row 6</text>
<rect x="10" y="198" width="80" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="50" y="215" text-anchor="middle" fill="var(--text)">row 7</text>
</g>
<rect x="110" y="30" width="14" height="138" rx="4" fill="var(--green)"/>
<text x="132" y="95" fill="var(--text)">UNBOUNDED PRECEDING</text><text x="132" y="110" fill="var(--text)">→ CURRENT ROW</text><text x="132" y="125" fill="var(--muted)">(running total)</text>
<rect x="290" y="86" width="14" height="82" rx="4" fill="var(--blue)"/>
<text x="312" y="120" fill="var(--text)">2 PRECEDING</text><text x="312" y="135" fill="var(--text)">→ CURRENT ROW</text><text x="312" y="150" fill="var(--muted)">(3-row moving avg)</text>
<rect x="450" y="142" width="14" height="82" rx="4" fill="var(--purple)"/>
<text x="472" y="175" fill="var(--text)">CURRENT ROW</text><text x="472" y="190" fill="var(--text)">→ UNBOUNDED FOLLOWING</text><text x="472" y="205" fill="var(--muted)">(what is still ahead)</text>
<text x="10" y="244" fill="var(--muted)">Frame = the rows the function sees for THIS row. It slides as the current row moves.</text>
</svg>`;

const ROWS_RANGE_SVG = `<svg viewBox="0 0 640 200" width="100%" font-family="sans-serif" font-size="12">
<text x="10" y="18" fill="var(--text)" font-weight="bold">Invoice 4 charges ordered by service_date. Two rows share 08-21 (peers)</text>
<g>
<rect x="10" y="32" width="170" height="28" fill="var(--panel2)" stroke="var(--border)"/><text x="18" y="50" fill="var(--text)">08-19 · 100</text>
<rect x="10" y="62" width="170" height="28" fill="var(--yellow)" stroke="var(--border)"/><text x="18" y="80" fill="var(--text)">08-21 · 50</text>
<rect x="10" y="92" width="170" height="28" fill="var(--yellow)" stroke="var(--border)"/><text x="18" y="110" fill="var(--text)">08-21 · 100</text>
<rect x="10" y="122" width="170" height="28" fill="var(--panel2)" stroke="var(--border)"/><text x="18" y="140" fill="var(--text)">08-22 · 130</text>
</g>
<text x="215" y="30" fill="var(--text)" font-weight="bold">ROWS running sum</text>
<text x="215" y="50" fill="var(--text)">100</text><text x="215" y="80" fill="var(--text)">150</text><text x="215" y="110" fill="var(--text)">250</text><text x="215" y="140" fill="var(--text)">380</text>
<text x="400" y="30" fill="var(--text)" font-weight="bold">RANGE running sum (default)</text>
<text x="400" y="50" fill="var(--text)">100</text><text x="400" y="80" fill="var(--red)" font-weight="bold">250</text><text x="400" y="110" fill="var(--red)" font-weight="bold">250</text><text x="400" y="140" fill="var(--text)">380</text>
<text x="10" y="180" fill="var(--muted)">ROWS counts physical rows. RANGE treats all rows with the same ORDER BY value as one step, so peers get the same total.</text>
</svg>`;

Lessons.add([
  // ─────────────────────────────────────────────── 01
  {
    id: 'windows-01',
    goals: [
      'What a window function is: a calculation across related rows that keeps every row',
      'The OVER() clause that turns a function into a window function',
      'The difference between collapsing rows (GROUP BY) and annotating rows (windows)',
      'A first look at PARTITION BY and ORDER BY inside OVER()',
    ],
    concept: `<p>A <b>window function</b> calculates a value from a group of related rows, called the <b>window</b>, and writes the answer <b>on every row</b>. Unlike GROUP BY, the rows do not collapse.</p>
<p>You recognize one by the <code>OVER(...)</code> clause:</p>
<ul>
<li><code>SUM(total_amount) OVER (PARTITION BY location_id)</code>: each invoice also shows its location's total.</li>
<li><code>ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY invoice_date)</code>: each invoice gets a sequence number within its location (1st visit, 2nd visit...).</li>
</ul>
<p>Picture a sheet of invoices. A window function looks through a "window" at a set of neighboring rows, calculates something, and writes the result in a new column, without removing any row.</p>
<p>Try the visual: rows are color-coded by partition (location). Hover a row to see which rows are in its window.</p>`,
    why: 'Reports constantly need detail and summary side by side: each invoice and its location total, each payment and the running balance, each claim and its rank. GROUP BY alone cannot do that.',
    when: 'Use one whenever you want to keep row-level detail while adding a ranking, a running total, a comparison with the previous row, or a group statistic.',
    analogy: 'A billing clerk goes down the invoice list with a ruler. For each invoice, she looks at the other invoices from the same clinic (the window) and pencils a note in the margin, such as "3rd visit" or "clinic total 2,890". She crosses nothing out.',
    exampleSql: W_LOC + ` ORDER BY location_id, invoice_date`,
    syntax: `function_name(args) OVER (
    [PARTITION BY col, ...]
    [ORDER BY col [ASC|DESC], ...]
    [frame clause]
)`,
    sql: `SELECT invoice_id, location_id, invoice_date, total_amount,
       ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY invoice_date) AS visit_no,
       SUM(total_amount) OVER (PARTITION BY location_id) AS location_total
FROM invoices
WHERE location_id IN (3, 5)
ORDER BY location_id, invoice_date;`,
    breakdown: [
      ['SELECT invoice_id, location_id, invoice_date, total_amount', 'Normal columns: every invoice row stays.'],
      ['ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY invoice_date)', 'Numbers the invoices 1, 2, 3... within each location, oldest first.'],
      ['SUM(total_amount) OVER (PARTITION BY location_id)', 'The location total, repeated on every invoice of that location.'],
      ['WHERE location_id IN (3, 5)', 'Only two locations, so the result is small (12 rows).'],
      ['ORDER BY location_id, invoice_date', 'Final display order (separate from the ORDER BY inside OVER).'],
    ],
    visual: { type: 'window', source: W_LOC, partition: 'location_id', order: 'invoice_date', value: 'total_amount', fn: 'ROW_NUMBER' },
    internals: `<p>Window functions run <b>after</b> FROM, WHERE, GROUP BY and HAVING, but <b>before</b> the final ORDER BY and LIMIT. SQLite sorts the rows by the PARTITION BY + ORDER BY keys, then walks through them once, keeping running state for each partition. That is why window results can be computed in a single pass after one sort.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, location_id, SUM(total_amount)
FROM invoices
GROUP BY location_id;`, why: 'GROUP BY collapses each location to one row, so invoice_id is meaningless (SQLite picks an arbitrary one; other databases raise an error). To keep every invoice AND show the total, use a window.', fix: `SELECT invoice_id, location_id,
       SUM(total_amount) OVER (PARTITION BY location_id) AS location_total
FROM invoices;` },
    ],
    rules: [
      'A window function always has OVER(...).',
      'It never removes rows. Output rows = input rows.',
      'PARTITION BY splits rows into groups; ORDER BY sets the order inside each group.',
      'Window functions are evaluated after WHERE/GROUP BY/HAVING and before the final ORDER BY.',
    ],
    compare: `<table><tr><th></th><th>GROUP BY + SUM</th><th>SUM() OVER (PARTITION BY)</th></tr>
<tr><td>Rows returned</td><td>one per group</td><td>all input rows</td></tr>
<tr><td>Detail columns</td><td>lost</td><td>kept</td></tr>
<tr><td>Typical use</td><td>summary report</td><td>detail + context</td></tr></table>`,
    realWorld: 'Patient statements with a running balance, "visit number" per patient, top-N claims per payor, and each clinic\'s share of total revenue are all built with window functions.',
    tips: ['Read OVER(...) as "calculated over these rows".'],
    deep: `<p>The SQL standard calls these <i>window functions</i> (SQL:2003); Oracle calls them <i>analytic functions</i>. There are three families: <b>ranking</b> (ROW_NUMBER, RANK, DENSE_RANK, NTILE, PERCENT_RANK, CUME_DIST), <b>value/offset</b> (LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTH_VALUE) and <b>aggregate</b> (SUM, AVG, COUNT, MIN, MAX with OVER). SQLite has supported all of them since 3.25.</p>`,
    tryIt: { prompt: 'Add a column location_avg with AVG(total_amount) OVER (PARTITION BY location_id).', starter: `SELECT invoice_id, location_id, invoice_date, total_amount,
       ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY invoice_date) AS visit_no
FROM invoices
WHERE location_id IN (3, 5)
ORDER BY location_id, invoice_date;` },
    challenge: {
      level: 1,
      prompt: 'For every invoice at location 1, show invoice_id, total_amount and the number of invoices at that location (location_invoices) using a window function. Order by invoice_id.',
      solution: `SELECT invoice_id, total_amount,
       COUNT(*) OVER (PARTITION BY location_id) AS location_invoices
FROM invoices
WHERE location_id = 1
ORDER BY invoice_id;`,
      hints: ['Keep every invoice row, so no GROUP BY.', 'COUNT(*) can be a window function when you add OVER(...).', 'COUNT(*) OVER (PARTITION BY location_id) AS location_invoices', 'Filter WHERE location_id = 1 and ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'A query reads 12 rows and adds a window function. How many rows come out?', options: ['1', 'one per partition', '12', 'depends on ORDER BY'], answer: 2, why: 'Window functions never remove rows.' },
      { q: 'What keyword makes SUM() a window function?', options: ['GROUP BY', 'OVER', 'PARTITION', 'WINDOW'], answer: 1, why: 'OVER(...) turns an aggregate into a window function.' },
    ],
  },

  // ─────────────────────────────────────────────── 02
  {
    id: 'windows-02',
    goals: [
      'Why GROUP BY loses the detail rows',
      'The classic workaround (join back to a grouped subquery) and its cost',
      'How a window function gives detail + summary in one pass',
      'Computing shares and running totals next to the rows',
    ],
    concept: `<p>Question: <i>"Show every invoice at locations 3 and 5, its location total, and what percentage of that total it represents."</i></p>
<p>With <b>GROUP BY</b> you get the totals, but the individual invoices are gone. You have one row per location. The old workaround is to compute the totals in a subquery and <b>join them back</b> to the invoices. That works, but the table is read twice and the query gets long.</p>
<p>A <b>window function</b> gives you both at once: <code>SUM(total_amount) OVER (PARTITION BY location_id)</code> puts the total on every row, so the percentage is a simple division. Add <code>ORDER BY invoice_date</code> inside OVER and you get a <b>running total</b> instead, which GROUP BY cannot express at all.</p>`,
    why: 'Real reports need per-row numbers compared with their group. Without windows, you need self-joins or correlated subqueries.',
    when: 'Use a window whenever you catch yourself writing "GROUP BY in a subquery, then JOIN back to the detail rows".',
    analogy: 'GROUP BY is the clinic\'s monthly summary sheet: totals only, no individual invoices. A window function is the detailed invoice list with a "clinic total" and a "running total" column added in the margin.',
    exampleSql: `SELECT location_id, SUM(total_amount) AS location_total, COUNT(*) AS invoices FROM invoices WHERE location_id IN (3, 5) GROUP BY location_id`,
    syntax: `-- old way: aggregate then join back
SELECT d.*, g.total FROM t d JOIN (SELECT key, SUM(x) AS total FROM t GROUP BY key) g ON g.key = d.key;
-- window way
SELECT d.*, SUM(x) OVER (PARTITION BY key) AS total FROM t d;`,
    sql: `SELECT invoice_id, location_id, invoice_date, total_amount,
       SUM(total_amount) OVER (PARTITION BY location_id) AS location_total,
       ROUND(100.0 * total_amount / SUM(total_amount) OVER (PARTITION BY location_id), 1) AS pct_of_location,
       SUM(total_amount) OVER (PARTITION BY location_id ORDER BY invoice_date) AS running_total
FROM invoices
WHERE location_id IN (3, 5)
ORDER BY location_id, invoice_date;`,
    breakdown: [
      ['SUM(total_amount) OVER (PARTITION BY location_id)', 'Whole-location total on every row (location 3 = 2890, location 5 = 1070).'],
      ['100.0 * total_amount / SUM(...) OVER (...)', 'Each invoice\'s share of its location. A window result can be used in expressions.'],
      ['SUM(total_amount) OVER (PARTITION BY location_id ORDER BY invoice_date)', 'Adding ORDER BY makes it a running total: the sum of all rows up to this date.'],
      ['ORDER BY location_id, invoice_date', 'Display order matching the running total.'],
    ],
    visual: { type: 'window', source: W_LOC, partition: 'location_id', order: 'invoice_date', value: 'total_amount', fn: 'RUNNING_SUM' },
    internals: `<p>The join-back version needs two passes over invoices plus a join. The window version sorts once by (location_id, invoice_date) and computes all three columns in a single pass. The partition total needs the whole partition, so SQLite buffers each partition before emitting its rows.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, location_id, total_amount, SUM(total_amount) AS location_total
FROM invoices
GROUP BY location_id;`, why: 'This returns one row per location with an arbitrary invoice_id. The per-invoice detail is lost and the invoice_id shown is meaningless.', fix: `SELECT invoice_id, location_id, total_amount,
       SUM(total_amount) OVER (PARTITION BY location_id) AS location_total
FROM invoices;` },
    ],
    rules: [
      'GROUP BY = fewer rows. Window = same rows, extra columns.',
      'Window results can be used in arithmetic in the SELECT list.',
      'Without ORDER BY in OVER: whole-partition value. With ORDER BY: running value.',
    ],
    compare: `<table><tr><th>Approach</th><th>Passes over data</th><th>Running totals?</th><th>Readability</th></tr>
<tr><td>GROUP BY only</td><td>1</td><td>no</td><td>✓, but loses detail</td></tr>
<tr><td>Join to grouped subquery</td><td>2 + join</td><td>no</td><td>long</td></tr>
<tr><td>Correlated subquery per row</td><td>N</td><td>possible, slow</td><td>ok</td></tr>
<tr><td>Window function</td><td>1 sort + 1 pass</td><td>yes</td><td>short</td></tr></table>`,
    realWorld: 'Revenue-share reports ("this clinic produces 32% of billing"), payer-mix percentages per invoice line, and running collections on a dashboard.',
    tips: ['If you see a subquery that GROUPs a table and then JOINs back to the same table, try a window function instead.'],
    deep: `<p>You can define the same window once with a named <code>WINDOW</code> clause: <code>... SUM(x) OVER w, AVG(x) OVER w FROM t WINDOW w AS (PARTITION BY location_id)</code>. Engines can then share the sort across functions (SQLite does this for identical window definitions anyway).</p>`,
    tryIt: { prompt: 'Rewrite the location_total column using the old way (JOIN to a GROUP BY subquery) and confirm the numbers match.', starter: `SELECT i.invoice_id, i.location_id, i.total_amount, g.location_total
FROM invoices i
JOIN (SELECT location_id, SUM(total_amount) AS location_total FROM invoices GROUP BY location_id) g
  ON g.location_id = i.location_id
WHERE i.location_id IN (3, 5)
ORDER BY i.location_id, i.invoice_date;` },
    challenge: {
      level: 2,
      prompt: 'For each payment on invoices 7, 19 and 20, show invoice_id, payment_id, amount, and pct = the payment\'s share of all payments on that invoice (rounded to 1 decimal). Order by invoice_id, payment_id.',
      solution: `SELECT invoice_id, payment_id, amount,
       ROUND(100.0 * amount / SUM(amount) OVER (PARTITION BY invoice_id), 1) AS pct
FROM payments
WHERE invoice_id IN (7, 19, 20)
ORDER BY invoice_id, payment_id;`,
      hints: ['You need detail rows (payments) plus a per-invoice total, so use a window.', 'SUM(amount) OVER (PARTITION BY invoice_id) is the invoice\'s total paid.', 'Divide: 100.0 * amount / SUM(amount) OVER (PARTITION BY invoice_id), wrapped in ROUND(..., 1).', 'Filter WHERE invoice_id IN (7, 19, 20) and ORDER BY invoice_id, payment_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What does GROUP BY location_id do to 12 invoice rows from 2 locations?', options: ['Keeps 12 rows', 'Collapses them to 2 rows', 'Sorts them', 'Numbers them'], answer: 1, why: 'GROUP BY produces one row per group.' },
      { q: 'Which gives a running total instead of a partition total?', options: ['SUM(x) OVER ()', 'SUM(x) OVER (PARTITION BY k)', 'SUM(x) OVER (PARTITION BY k ORDER BY d)', 'SUM(x) GROUP BY k'], answer: 2, why: 'ORDER BY inside OVER limits the default frame to "start of partition up to the current row".' },
    ],
  },

  // ─────────────────────────────────────────────── 03
  {
    id: 'windows-03',
    goals: [
      'What an empty OVER() means: the whole result set is one window',
      'Grand totals and averages next to every row',
      'That OVER() sees rows after WHERE',
      'Adding ORDER BY inside OVER() for a global sequence',
    ],
    concept: `<p><code>OVER()</code> with nothing inside means <b>"the window is every row of the result"</b>. There is no partitioning and no ordering: one big window.</p>
<ul>
<li><code>COUNT(*) OVER ()</code>: total number of rows, on every row.</li>
<li><code>AVG(total_amount) OVER ()</code>: the overall average, on every row.</li>
<li><code>ROW_NUMBER() OVER (ORDER BY total_amount DESC)</code>: one global sequence (no partitions).</li>
</ul>
<p>Important: the window only sees rows that survived <b>WHERE</b>. If you filter to location 4, <code>OVER()</code> means "all location-4 invoices", not "all invoices".</p>`,
    why: 'Comparing each row with a grand total or overall average is one of the most common report needs: "% of total", "above or below average".',
    when: 'Use it for grand totals, overall averages, total row counts (for paging: "showing 1-10 of 48") and single global rankings.',
    analogy: 'Writing "clinic grand total: 4,400" at the top of every invoice page from the Lakeview binder. Every page gets the same number, computed from the whole binder.',
    exampleSql: W_L4 + ` ORDER BY invoice_date`,
    syntax: `SELECT col,
       AGG(col) OVER () AS overall,
       ROW_NUMBER() OVER (ORDER BY col) AS seq
FROM t;`,
    sql: `SELECT invoice_id, invoice_date, total_amount,
       COUNT(*)          OVER () AS invoices_in_result,
       SUM(total_amount) OVER () AS grand_total,
       ROUND(total_amount - AVG(total_amount) OVER (), 2) AS vs_avg,
       ROW_NUMBER()      OVER (ORDER BY invoice_date) AS seq
FROM invoices
WHERE location_id = 4
ORDER BY invoice_date;`,
    breakdown: [
      ['COUNT(*) OVER ()', 'The number of rows in the result: 15 on every row.'],
      ['SUM(total_amount) OVER ()', 'The grand total of the filtered rows (4400).'],
      ['total_amount - AVG(total_amount) OVER ()', 'How far each invoice is from the overall average (293.33).'],
      ['ROW_NUMBER() OVER (ORDER BY invoice_date)', 'One sequence across all rows, oldest first. No partitions.'],
      ['WHERE location_id = 4', 'Runs BEFORE the window, so "all rows" means the location-4 invoices.'],
    ],
    visual: { type: 'window', source: W_L4, partition: null, order: 'invoice_date', value: 'total_amount', fn: 'ROW_NUMBER' },
    internals: `<p>For an aggregate with an empty OVER(), SQLite reads all rows once to compute the aggregate, then emits each row with that value. No sort is needed unless there is an ORDER BY inside OVER. The window sees the result of FROM/WHERE/GROUP BY/HAVING, never rows that were filtered out.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, total_amount, SUM(total_amount) OVER () AS company_total
FROM invoices
WHERE location_id = 4;`, why: 'The label says "company total", but WHERE runs first, so OVER() only sums location 4 (4400, not 11570). If you really need the company total, use a scalar subquery, or filter after the window.', fix: `SELECT invoice_id, total_amount, company_total
FROM (SELECT invoice_id, location_id, total_amount, SUM(total_amount) OVER () AS company_total FROM invoices)
WHERE location_id = 4;` },
    ],
    rules: [
      'OVER() = one window containing every row of the result.',
      'The window sees rows AFTER WHERE and GROUP BY.',
      'COUNT(*) OVER () is a cheap "total rows" for paging.',
      'ORDER BY inside OVER() gives one global order with no partitions.',
    ],
    compare: `<table><tr><th>Expression</th><th>Meaning</th></tr>
<tr><td><code>SUM(x) OVER ()</code></td><td>grand total of the result</td></tr>
<tr><td><code>SUM(x) OVER (PARTITION BY k)</code></td><td>total per group</td></tr>
<tr><td><code>SUM(x) OVER (ORDER BY d)</code></td><td>running total over everything</td></tr>
<tr><td><code>(SELECT SUM(x) FROM t)</code></td><td>grand total of the whole table, ignoring the outer WHERE</td></tr></table>`,
    realWorld: 'Paginated invoice lists show "48 results" using COUNT(*) OVER () in the same query that returns page 1, avoiding a second COUNT query.',
    tips: ['OVER() with an aggregate is a quick way to add "% of total" to any report.'],
    deep: `<p>With LIMIT, the window is still computed over the full result before LIMIT is applied. So <code>SELECT ..., COUNT(*) OVER () FROM invoices ORDER BY invoice_date LIMIT 10</code> returns 10 rows that each show 48. That is exactly what paging UIs need.</p>`,
    tryIt: { prompt: 'Add LIMIT 5 to the query. Does invoices_in_result change? Why not?', starter: `SELECT invoice_id, invoice_date, total_amount,
       COUNT(*) OVER () AS invoices_in_result
FROM invoices
WHERE location_id = 4
ORDER BY invoice_date;` },
    challenge: {
      level: 1,
      prompt: 'List every payor with payor_name, contract_rate, the average contract_rate of all payors (avg_rate, rounded to 3 decimals) and the difference contract_rate - average (diff, rounded to 3 decimals). Order by contract_rate descending, then payor_name.',
      solution: `SELECT payor_name, contract_rate,
       ROUND(AVG(contract_rate) OVER (), 3) AS avg_rate,
       ROUND(contract_rate - AVG(contract_rate) OVER (), 3) AS diff
FROM payors
ORDER BY contract_rate DESC, payor_name;`,
      hints: ['You want every payor row plus one overall value, so use an empty OVER().', 'AVG(contract_rate) OVER () gives the average on every row.', 'ROUND(AVG(contract_rate) OVER (), 3) AS avg_rate, and ROUND(contract_rate - AVG(contract_rate) OVER (), 3) AS diff', 'ORDER BY contract_rate DESC, payor_name.'],
      ordered: true,
    },
    quiz: [
      { q: 'SELECT COUNT(*) OVER () FROM invoices WHERE status = \'Paid\'. What does each row show?', options: ['48', 'The number of Paid invoices', '1', 'The row number'], answer: 1, why: 'WHERE runs first; OVER() counts the surviving rows.' },
      { q: 'What does ROW_NUMBER() OVER (ORDER BY invoice_date) produce?', options: ['One sequence per location', 'One sequence over all rows', 'Always 1', 'An error, since PARTITION BY is required'], answer: 1, why: 'No PARTITION BY means the whole result is one partition.' },
    ],
  },

  // ─────────────────────────────────────────────── 04
  {
    id: 'windows-04',
    goals: [
      'Splitting rows into independent groups with PARTITION BY',
      'How calculations restart in each partition',
      'Partitioning by multiple columns',
      'Combining PARTITION BY with ORDER BY',
    ],
    concept: `<p><code>PARTITION BY</code> splits the rows into <b>separate groups</b>, and the window function runs <b>separately in each group</b>. Numbering restarts at 1, totals restart at 0, and one partition never sees another partition's rows.</p>
<p>It is like GROUP BY, except the rows are not collapsed. Each row just learns which group it belongs to.</p>
<ul>
<li><code>PARTITION BY location_id</code>: one window per location.</li>
<li><code>PARTITION BY patient_id</code>: one window per patient (their own visit history).</li>
<li><code>PARTITION BY location_id, status</code>: one window per location-and-status combination.</li>
</ul>
<p>In the visual, each color is one partition. Hover a row: its window never crosses a color boundary.</p>`,
    why: 'Most analytics questions are "per something": per patient, per clinic, per payor. PARTITION BY expresses the "per".',
    when: 'Use it whenever the calculation should restart for each patient, invoice, location, payor or month.',
    analogy: 'Filing invoices into one folder per clinic before numbering them. Every folder starts again at page 1.',
    exampleSql: W_VISITS + ` ORDER BY patient_id, invoice_date`,
    syntax: `fn(...) OVER (PARTITION BY col1 [, col2 ...] [ORDER BY ...])`,
    sql: `SELECT patient_id, invoice_id, invoice_date, total_amount,
       ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date) AS visit_no,
       COUNT(*)     OVER (PARTITION BY patient_id) AS total_visits,
       SUM(total_amount) OVER (PARTITION BY patient_id) AS patient_billed
FROM invoices
WHERE patient_id IN (3, 7, 24)
ORDER BY patient_id, invoice_date;`,
    breakdown: [
      ['PARTITION BY patient_id', 'One window per patient: patients 3, 7 and 24 are handled independently.'],
      ['ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date)', 'Visit number: restarts at 1 for each patient.'],
      ['COUNT(*) OVER (PARTITION BY patient_id)', 'How many invoices this patient has (5, 5 and 4).'],
      ['SUM(total_amount) OVER (PARTITION BY patient_id)', 'The patient\'s lifetime billed amount, on each of their rows.'],
    ],
    visual: { type: 'window', source: W_VISITS, partition: 'patient_id', order: 'invoice_date', value: 'total_amount', fn: 'ROW_NUMBER' },
    internals: `<p>SQLite sorts the input by the partition columns first (then by the ORDER BY columns), so each partition is a contiguous run of rows. As it scans, it detects when the partition key changes and resets the function state. An index on (patient_id, invoice_date) can deliver rows already sorted and skip the sort step.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id, invoice_id,
       ROW_NUMBER() OVER (ORDER BY invoice_date) AS visit_no
FROM invoices
WHERE patient_id IN (3, 7, 24);`, why: 'Without PARTITION BY, the numbering runs across all three patients together (1 to 14), so "visit number" is wrong for each patient.', fix: `SELECT patient_id, invoice_id,
       ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date) AS visit_no
FROM invoices
WHERE patient_id IN (3, 7, 24);` },
    ],
    rules: [
      'Each partition is processed independently; results restart.',
      'PARTITION BY does not reduce the number of rows.',
      'You may partition by several columns or by an expression (e.g. strftime(\'%Y\', invoice_date)).',
      'Without PARTITION BY, the whole result is one partition.',
    ],
    compare: `<table><tr><th></th><th>GROUP BY patient_id</th><th>PARTITION BY patient_id</th></tr>
<tr><td>Rows out</td><td>1 per patient</td><td>all invoices</td></tr>
<tr><td>Access to each invoice</td><td>no</td><td>yes</td></tr>
<tr><td>Where written</td><td>query clause</td><td>inside OVER()</td></tr></table>`,
    realWorld: 'Patient histories (visit number, days since last visit), per-payor claim ranking and per-clinic running revenue all start with PARTITION BY.',
    tips: ['Ask "per what?". The answer goes in PARTITION BY.'],
    deep: `<p>Partitioning by an expression is legal: <code>SUM(total_amount) OVER (PARTITION BY strftime('%Y', invoice_date))</code> gives a yearly total on each invoice. Different window functions in the same SELECT can use different partitions. The engine may then have to sort more than once, which is worth knowing for performance.</p>`,
    tryIt: { prompt: 'Partition by location_id AND status to count how many invoices share each invoice\'s location and status.', starter: `SELECT invoice_id, location_id, status,
       COUNT(*) OVER (PARTITION BY location_id) AS same_location
FROM invoices
ORDER BY location_id, status, invoice_id;` },
    challenge: {
      level: 2,
      prompt: 'For each charge on invoices 1 to 6, show invoice_id, charge_id, amount, the number of charge lines on that invoice (lines) and the invoice\'s charge total (invoice_charged). Order by invoice_id, charge_id.',
      solution: `SELECT invoice_id, charge_id, amount,
       COUNT(*)    OVER (PARTITION BY invoice_id) AS lines,
       SUM(amount) OVER (PARTITION BY invoice_id) AS invoice_charged
FROM charges
WHERE invoice_id BETWEEN 1 AND 6
ORDER BY invoice_id, charge_id;`,
      hints: ['Each invoice is its own group: PARTITION BY invoice_id.', 'COUNT(*) OVER (PARTITION BY invoice_id) gives the lines per invoice.', 'SUM(amount) OVER (PARTITION BY invoice_id) gives the invoice total.', 'WHERE invoice_id BETWEEN 1 AND 6 ORDER BY invoice_id, charge_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date). What is the first invoice of EACH patient numbered?', options: ['Its global position', '1', '0', 'NULL'], answer: 1, why: 'Numbering restarts at 1 in every partition.' },
      { q: 'Does PARTITION BY reduce the number of output rows?', options: ['Yes, one row per partition', 'No', 'Only with ORDER BY', 'Only in SQLite'], answer: 1, why: 'It only defines windows; every row stays.' },
    ],
  },

  // ─────────────────────────────────────────────── 05
  {
    id: 'windows-05',
    goals: [
      'What ORDER BY inside OVER() controls',
      'Why adding ORDER BY turns a total into a running total',
      'The difference between ORDER BY in OVER() and the query\'s final ORDER BY',
      'Why ties in the ORDER BY key matter',
    ],
    concept: `<p><code>ORDER BY</code> inside <code>OVER()</code> decides the <b>order of rows within each window</b>. It does two things:</p>
<ol>
<li>It gives meaning to order-based functions: ROW_NUMBER, RANK, LAG, LEAD, FIRST_VALUE need to know what "first" and "previous" mean.</li>
<li>It <b>changes the default frame</b> for aggregates. Without ORDER BY, <code>SUM() OVER ()</code> sums the whole partition. With ORDER BY, it sums from the start up to the current row, which is a <b>running total</b>.</li>
</ol>
<p>It is <b>not</b> the same as the final <code>ORDER BY</code> of the query. The window order is used only for the calculation; the output order is decided by the final ORDER BY. They are often the same, but they do not have to be.</p>`,
    why: 'Time-ordered questions (running totals, "previous visit", "first payment") need an explicit order, because SQL tables have no built-in row order.',
    when: 'Use it whenever the calculation depends on sequence: dates, amounts or ids.',
    analogy: 'Putting a clinic\'s invoices in date order before adding them up one by one on a calculator tape. The tape shows the running subtotal after each invoice.',
    exampleSql: W_L4 + ` ORDER BY invoice_date`,
    syntax: `fn(...) OVER ([PARTITION BY ...] ORDER BY col [ASC|DESC] [, tie_breaker])`,
    sql: `SELECT invoice_id, invoice_date, total_amount,
       SUM(total_amount) OVER ()                     AS location_total,
       SUM(total_amount) OVER (ORDER BY invoice_date) AS running_total,
       COUNT(*)          OVER (ORDER BY invoice_date) AS invoices_so_far
FROM invoices
WHERE location_id = 4
ORDER BY invoice_date;`,
    breakdown: [
      ['SUM(total_amount) OVER ()', 'No ORDER BY: the same total (4400) on every row.'],
      ['SUM(total_amount) OVER (ORDER BY invoice_date)', 'With ORDER BY: a running total that grows row by row in date order.'],
      ['COUNT(*) OVER (ORDER BY invoice_date)', 'A running count: how many invoices so far.'],
      ['ORDER BY invoice_date (final)', 'Shows the rows in the same order, so the running totals read naturally.'],
    ],
    visual: { type: 'window', source: W_L4, partition: null, order: 'invoice_date', value: 'total_amount', fn: 'RUNNING_SUM' },
    internals: `<p>When ORDER BY is present and no frame is given, the default frame is <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. SQLite keeps a running accumulator and adds each new row (including any peer rows that share the same ORDER BY value, because of RANGE). Without ORDER BY, the frame is the whole partition.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, invoice_date, total_amount,
       SUM(total_amount) OVER (ORDER BY invoice_date) AS running_total
FROM invoices
WHERE location_id = 4
ORDER BY total_amount DESC;`, why: 'Not an error, but confusing: the running total follows date order while the rows are displayed by amount, so the column appears to jump around. Keep the final ORDER BY consistent with the window order when you show running values.', fix: `SELECT invoice_id, invoice_date, total_amount,
       SUM(total_amount) OVER (ORDER BY invoice_date) AS running_total
FROM invoices
WHERE location_id = 4
ORDER BY invoice_date;` },
      { wrong: `SELECT invoice_id, invoice_date, SUM(total_amount) OVER (ORDER BY invoice_date) AS running_total
FROM invoices;`, why: 'Several invoices share an invoice_date (e.g. five on 2026-08-28). The default RANGE frame treats them as peers and gives them all the same total, which jumps in one step. Add a unique tie-breaker so the order is exact.', fix: `SELECT invoice_id, invoice_date, SUM(total_amount) OVER (ORDER BY invoice_date, invoice_id) AS running_total
FROM invoices;` },
    ],
    rules: [
      'ORDER BY in OVER() orders rows for the calculation only.',
      'Adding ORDER BY to an aggregate window makes it a running aggregate.',
      'The final ORDER BY decides display order, and is separate.',
      'Add a unique tie-breaker (like the id) for deterministic results.',
    ],
    compare: `<table><tr><th>Window</th><th>Frame</th><th>Result</th></tr>
<tr><td><code>SUM(x) OVER ()</code></td><td>all rows</td><td>total</td></tr>
<tr><td><code>SUM(x) OVER (ORDER BY d)</code></td><td>start → current (incl. peers)</td><td>running total</td></tr>
<tr><td><code>SUM(x) OVER (ORDER BY d ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)</code></td><td>last 3 rows</td><td>moving sum</td></tr></table>`,
    realWorld: 'Year-to-date collections, cumulative patient counts and "days since previous visit" all depend on ORDER BY inside OVER().',
    tips: ['Reading tip: "SUM ... OVER (ORDER BY date)" means "sum of everything up to this date".'],
    deep: `<p>ORDER BY in OVER() supports <code>DESC</code> and <code>NULLS FIRST/LAST</code> (SQLite 3.30+). Running totals in <b>descending</b> order give "remaining" amounts: <code>SUM(x) OVER (ORDER BY d DESC)</code> is the total from this row to the end.</p>`,
    tryIt: { prompt: 'Change the running total to go from the newest invoice to the oldest (ORDER BY invoice_date DESC inside OVER).', starter: `SELECT invoice_id, invoice_date, total_amount,
       SUM(total_amount) OVER (ORDER BY invoice_date) AS running_total
FROM invoices
WHERE location_id = 4
ORDER BY invoice_date;` },
    challenge: {
      level: 2,
      prompt: 'For invoices at location 1, show invoice_id, invoice_date, total_amount and running_billed: the cumulative total in date order, using invoice_id as a tie-breaker. Order by invoice_date, invoice_id.',
      solution: `SELECT invoice_id, invoice_date, total_amount,
       SUM(total_amount) OVER (ORDER BY invoice_date, invoice_id) AS running_billed
FROM invoices
WHERE location_id = 1
ORDER BY invoice_date, invoice_id;`,
      hints: ['A running total is SUM() OVER (ORDER BY ...).', 'Location 1 has three invoices on 2026-08-28, so add invoice_id to the ORDER BY inside OVER.', 'SUM(total_amount) OVER (ORDER BY invoice_date, invoice_id) AS running_billed', 'Match the final ORDER BY: invoice_date, invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What changes when you add ORDER BY invoice_date inside SUM(...) OVER ()?', options: ['Nothing', 'It becomes a running total', 'It sorts the output', 'It groups rows'], answer: 1, why: 'ORDER BY changes the default frame to "start of the partition up to the current row (and its peers)".' },
      { q: 'Does ORDER BY inside OVER() sort the final output?', options: ['Yes, always', 'No, only the final ORDER BY guarantees output order', 'Only with PARTITION BY', 'Only in SQLite'], answer: 1, why: 'Output order is only guaranteed by the query\'s ORDER BY.' },
    ],
  },

  // ─────────────────────────────────────────────── 06
  {
    id: 'windows-06',
    goals: [
      'ROW_NUMBER() assigns 1, 2, 3... with no ties',
      'Why ties need a tie-breaker for deterministic results',
      'The "latest row per group" / "first row per group" pattern',
      'De-duplicating with ROW_NUMBER',
    ],
    concept: `<p><code>ROW_NUMBER()</code> gives each row in a partition a <b>unique</b> sequential number: 1, 2, 3... in the order given by ORDER BY. Even if two rows tie, they get different numbers.</p>
<p>Because ties are broken <b>arbitrarily</b>, always add a unique tie-breaker. Invoice 4 has two charges on 2025-08-21; which one is "2nd" is undefined unless you also sort by <code>charge_id</code>.</p>
<p>The most important pattern is <b>top-1 per group</b>: number the rows in a subquery or CTE, then keep <code>rn = 1</code>. For example: the latest payment per invoice, the first visit per patient, or one row per duplicate.</p>`,
    why: 'Picking exactly one row per group (the latest, the first, the largest) is a daily need, and ROW_NUMBER does it cleanly.',
    when: 'Use it for top-N per group, de-duplication, pagination, and assigning sequence numbers such as line numbers or visit numbers.',
    analogy: 'Numbering the charge lines on each invoice, 1, 2, 3, in service-date order. If two services happened on the same day, you decide by charge number which gets written first.',
    exampleSql: W_CHG + ` ORDER BY invoice_id, service_date, charge_id`,
    syntax: `ROW_NUMBER() OVER ([PARTITION BY g] ORDER BY col [, unique_tiebreaker])

-- top 1 per group
SELECT * FROM (SELECT t.*, ROW_NUMBER() OVER (PARTITION BY g ORDER BY d DESC) AS rn FROM t) WHERE rn = 1;`,
    sql: `SELECT invoice_id, charge_id, service_date, amount,
       ROW_NUMBER() OVER (PARTITION BY invoice_id
                          ORDER BY service_date, charge_id) AS line_no
FROM charges
WHERE invoice_id IN (4, 27, 40)
ORDER BY invoice_id, line_no;`,
    breakdown: [
      ['ROW_NUMBER()', 'Assigns 1, 2, 3... with no gaps and no duplicates.'],
      ['PARTITION BY invoice_id', 'Restart numbering for each invoice.'],
      ['ORDER BY service_date, charge_id', 'Earliest service first; charge_id breaks ties when two charges share a date.'],
      ['ORDER BY invoice_id, line_no', 'Display in line-number order.'],
    ],
    visual: { type: 'window', source: W_CHG, partition: 'invoice_id', order: 'service_date', value: 'amount', fn: 'ROW_NUMBER' },
    internals: `<p>ROW_NUMBER is the cheapest window function: after the sort, SQLite only needs a counter that resets at each partition boundary. It never needs to look ahead or keep a frame buffer.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, payment_id, payment_date,
       ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY payment_date DESC) AS rn
FROM payments
WHERE rn = 1;`, why: 'Window functions are computed AFTER WHERE, so rn does not exist yet when WHERE runs ("misuse of window function" / "no such column"). Compute it in a subquery or CTE, then filter outside.', fix: `SELECT invoice_id, payment_id, payment_date
FROM (SELECT invoice_id, payment_id, payment_date,
             ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY payment_date DESC, payment_id DESC) AS rn
      FROM payments)
WHERE rn = 1;` },
      { wrong: `SELECT invoice_id, charge_id, service_date,
       ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY service_date) AS line_no
FROM charges;`, why: 'Charges 4 and 7 on invoice 4 share 2025-08-21. Which one gets 2 and which gets 3 can change between runs or engines. Add a unique tie-breaker.', fix: `SELECT invoice_id, charge_id, service_date,
       ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY service_date, charge_id) AS line_no
FROM charges;` },
    ],
    rules: [
      'ROW_NUMBER is always unique within a partition: 1..n with no gaps.',
      'Always add a unique tie-breaker to ORDER BY.',
      'Filter on the row number in an outer query (not in WHERE of the same level).',
      'rn = 1 with ORDER BY ... DESC means the latest row per group.',
    ],
    compare: `<table><tr><th>Amounts</th><th>ROW_NUMBER</th><th>RANK</th><th>DENSE_RANK</th></tr>
<tr><td>630</td><td>1</td><td>1</td><td>1</td></tr>
<tr><td>380</td><td>2</td><td>2</td><td>2</td></tr>
<tr><td>380</td><td>3</td><td>2</td><td>2</td></tr>
<tr><td>350</td><td>4</td><td>4</td><td>3</td></tr></table>`,
    realWorld: 'The "most recent payment per invoice" on a statement, "first visit per patient" for new-patient reports, and removing duplicate patient records all use ROW_NUMBER.',
    tips: ['Use ROW_NUMBER when you need exactly N rows per group, even with ties.'],
    deep: `<p>Many engines (Snowflake, BigQuery, DuckDB, Teradata) support <code>QUALIFY rn = 1</code> to filter window results without a subquery. SQLite, PostgreSQL, MySQL and SQL Server do not, so use a subquery or CTE. ROW_NUMBER over a non-unique ORDER BY is <i>non-deterministic</i>: the standard allows any ordering of peers.</p>`,
    tryIt: { prompt: 'Use ROW_NUMBER to keep only the most expensive charge per invoice (for invoices 4, 27, 40).', starter: `SELECT * FROM (
    SELECT invoice_id, charge_id, amount,
           ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY amount DESC, charge_id) AS rn
    FROM charges
    WHERE invoice_id IN (4, 27, 40)
)
ORDER BY invoice_id, rn;` },
    challenge: {
      level: 3,
      prompt: 'Return the LATEST payment for every invoice that has payments: invoice_id, payment_id, payment_date, amount. Break ties on payment_date by the highest payment_id. Order by invoice_id.',
      solution: `SELECT invoice_id, payment_id, payment_date, amount
FROM (
    SELECT invoice_id, payment_id, payment_date, amount,
           ROW_NUMBER() OVER (PARTITION BY invoice_id
                              ORDER BY payment_date DESC, payment_id DESC) AS rn
    FROM payments
)
WHERE rn = 1
ORDER BY invoice_id;`,
      hints: ['Number each invoice\'s payments, newest first.', 'ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY payment_date DESC, payment_id DESC) AS rn', 'You cannot filter rn in the same SELECT, so wrap it in a subquery.', 'Outer query: WHERE rn = 1 ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Two charges tie on service_date. What does ROW_NUMBER give them?', options: ['The same number', 'Different numbers, in an arbitrary order unless you add a tie-breaker', 'NULL', 'An error'], answer: 1, why: 'ROW_NUMBER is always unique; the order of ties is undefined without a tie-breaker.' },
      { q: 'Why does WHERE ROW_NUMBER() OVER (...) = 1 fail?', options: ['ROW_NUMBER needs GROUP BY', 'Window functions are evaluated after WHERE', 'You must use HAVING', 'It doesn\'t fail'], answer: 1, why: 'Compute the window in a subquery or CTE, then filter it outside.' },
      { q: 'Which pattern returns the latest payment per invoice?', options: ['MAX(payment_id) with no GROUP BY', 'ROW_NUMBER() ... ORDER BY payment_date DESC, then keep rn = 1', 'RANK() ... ORDER BY amount', 'NTILE(1)'], answer: 1, why: 'Numbering newest-first and keeping 1 picks exactly one latest row per invoice.' },
    ],
  },

  // ─────────────────────────────────────────────── 07
  {
    id: 'windows-07',
    goals: [
      'RANK() gives tied rows the same rank',
      'Why RANK leaves gaps after ties (1, 2, 2, 4)',
      'Choosing RANK vs ROW_NUMBER for "top N"',
      'Ranking in descending order',
    ],
    concept: `<p><code>RANK()</code> numbers rows by the ORDER BY value, but <b>tied rows share the same rank</b>, and the next rank <b>skips</b> ahead by the number of ties, like in a race.</p>
<p>Lakeview Physical Therapy (location 4) invoices, highest first: 630 → 1, 480 → 2, 415 → 3, 405 → 4, <b>380 → 5, 380 → 5</b>, then 350 → <b>7</b> (rank 6 is skipped).</p>
<p>That gap is the key difference from DENSE_RANK (next lesson). With RANK, a row's rank means <i>"1 + the number of rows strictly ahead of me"</i>.</p>`,
    why: 'Fair rankings must treat equal values equally. ROW_NUMBER would arbitrarily call one of two identical invoices "5th" and the other "6th".',
    when: 'Use it for competition-style rankings (leaderboards, "top 3 highest-billing") where ties should share a position and the positions after them are pushed down.',
    analogy: 'Two clinics tie for 2nd place in the monthly collections contest. Both get a silver ribbon, and the next clinic is 4th, because three clinics did better than it.',
    exampleSql: W_L4 + ` ORDER BY total_amount DESC`,
    syntax: `RANK() OVER ([PARTITION BY g] ORDER BY col DESC)`,
    sql: `SELECT invoice_id, invoice_date, total_amount,
       RANK()       OVER (ORDER BY total_amount DESC) AS amount_rank,
       ROW_NUMBER() OVER (ORDER BY total_amount DESC, invoice_id) AS row_num
FROM invoices
WHERE location_id = 4
ORDER BY total_amount DESC, invoice_id;`,
    breakdown: [
      ['RANK() OVER (ORDER BY total_amount DESC)', 'Highest amount = rank 1; equal amounts share a rank; gaps follow ties.'],
      ['ROW_NUMBER() OVER (ORDER BY total_amount DESC, invoice_id)', 'For comparison: always unique, no ties.'],
      ['WHERE location_id = 4', 'Lakeview has several tied amounts (380, 350, 150, 100).'],
      ['ORDER BY total_amount DESC, invoice_id', 'Display in rank order.'],
    ],
    visual: { type: 'window', source: W_L4, partition: null, order: 'total_amount', value: 'total_amount', fn: 'RANK' },
    internals: `<p>SQLite tracks two counters: the row position and the rank of the current peer group. When the ORDER BY value changes, the rank jumps to the current row position. Peers (rows with equal ORDER BY values) keep the previous rank. The tie-breaker you add for ROW_NUMBER must NOT be added to RANK, or the ties disappear.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, total_amount,
       RANK() OVER (ORDER BY total_amount DESC, invoice_id) AS amount_rank
FROM invoices WHERE location_id = 4;`, why: 'Adding a unique tie-breaker to RANK\'s ORDER BY makes every row unique, so RANK behaves exactly like ROW_NUMBER and the ties are gone. Rank on the value only.', fix: `SELECT invoice_id, total_amount,
       RANK() OVER (ORDER BY total_amount DESC) AS amount_rank
FROM invoices WHERE location_id = 4;` },
      { wrong: `SELECT * FROM (SELECT invoice_id, total_amount, RANK() OVER (ORDER BY total_amount DESC) AS r
               FROM invoices WHERE location_id = 4)
WHERE r = 6;`, why: 'RANK skips 6 after the tie at 5, so this returns nothing. If you need "the 6th distinct amount level", use DENSE_RANK. If you need "the 6th row", use ROW_NUMBER.', fix: `SELECT * FROM (SELECT invoice_id, total_amount, DENSE_RANK() OVER (ORDER BY total_amount DESC) AS r
               FROM invoices WHERE location_id = 4)
WHERE r = 6;` },
    ],
    rules: [
      'Ties share a rank; the next rank skips (1, 2, 2, 4).',
      'rank = 1 + number of rows strictly ahead.',
      'Do not add a unique tie-breaker to RANK, or it becomes ROW_NUMBER.',
      '"WHERE rank <= 3" may return more than 3 rows when there are ties.',
    ],
    compare: `<table><tr><th>total_amount</th><th>ROW_NUMBER</th><th>RANK</th><th>DENSE_RANK</th></tr>
<tr><td>405</td><td>4</td><td>4</td><td>4</td></tr>
<tr><td>380</td><td>5</td><td>5</td><td>5</td></tr>
<tr><td>380</td><td>6</td><td>5</td><td>5</td></tr>
<tr><td>350</td><td>7</td><td><b>7</b></td><td><b>6</b></td></tr></table>`,
    realWorld: 'Practitioner productivity leaderboards, "top 5 CPT codes by revenue" (with ties shown fairly) and payor ranking by denial rate.',
    tips: ['Ask: should two equal values get the same position? Yes → RANK or DENSE_RANK. No → ROW_NUMBER.'],
    deep: `<p>Related functions: <code>PERCENT_RANK()</code> = (rank − 1) / (rows − 1), from 0 to 1, and <code>CUME_DIST()</code> = (rows with value ≤ current) / rows. Both are in SQLite. They turn ranks into percentiles, e.g. "this invoice is in the top 10% of amounts".</p>`,
    tryIt: { prompt: 'Add DENSE_RANK() next to RANK() and compare the numbers after the ties.', starter: `SELECT invoice_id, total_amount,
       RANK() OVER (ORDER BY total_amount DESC) AS amount_rank
FROM invoices
WHERE location_id = 4
ORDER BY total_amount DESC, invoice_id;` },
    challenge: {
      level: 2,
      prompt: 'Rank all practitioners by hourly_rate from highest to lowest using RANK (column rate_rank). Show practitioner_id, last_name, hourly_rate, rate_rank. Order by rate_rank, then practitioner_id.',
      solution: `SELECT practitioner_id, last_name, hourly_rate,
       RANK() OVER (ORDER BY hourly_rate DESC) AS rate_rank
FROM practitioners
ORDER BY rate_rank, practitioner_id;`,
      hints: ['One ranking over all practitioners: no PARTITION BY.', 'Highest first: ORDER BY hourly_rate DESC inside OVER.', 'RANK() OVER (ORDER BY hourly_rate DESC) AS rate_rank. Do not add a tie-breaker inside OVER.', 'Final ORDER BY rate_rank, practitioner_id makes the output deterministic.'],
      ordered: true,
    },
    quiz: [
      { q: 'Amounts 500, 400, 400, 300 ranked DESC with RANK(). What rank does 300 get?', options: ['3', '4', '2', '5'], answer: 1, why: 'Three rows are ahead of it, so 1 + 3 = 4.' },
      { q: 'What happens if you add invoice_id to RANK\'s ORDER BY?', options: ['Nothing', 'Ties disappear; it behaves like ROW_NUMBER', 'It errors', 'Ranks become dense'], answer: 1, why: 'A unique ORDER BY means no peers, so no shared ranks.' },
    ],
  },

  // ─────────────────────────────────────────────── 08
  {
    id: 'windows-08',
    goals: [
      'DENSE_RANK() gives ties the same rank without gaps (1, 2, 2, 3)',
      'RANK vs DENSE_RANK: when the gap matters',
      '"Nth highest distinct value" questions',
      'Top-N distinct levels per group',
    ],
    concept: `<p><code>DENSE_RANK()</code> is like RANK: <b>ties share a rank</b>. The difference is that the next rank is <b>the next integer, with no gaps</b>.</p>
<p>Lakeview invoices by amount: 380 and 380 both get 5, and 350 gets <b>6</b> (RANK would give 7).</p>
<p>So DENSE_RANK counts <b>distinct values</b>: rank <i>k</i> means "the k-th highest distinct amount". That makes it the right tool for questions like <i>"the second-highest invoice amount"</i>, even when the top amount appears twice.</p>`,
    why: 'Some questions are about value levels, not positions: "the 3 highest charge amounts" should list three distinct amounts even when there are duplicates.',
    when: 'Use it for Nth-highest distinct value, tiering by distinct levels, and "top N price points" per group.',
    analogy: 'Fee-schedule tiers: every service priced at $110 is in the same tier, and the next price down is simply the next tier. No tier numbers are skipped just because many services share a price.',
    exampleSql: W_LOC + ` ORDER BY location_id, total_amount DESC`,
    syntax: `DENSE_RANK() OVER ([PARTITION BY g] ORDER BY col DESC)`,
    sql: `SELECT invoice_id, location_id, total_amount,
       RANK()       OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS rnk,
       DENSE_RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS dense_rnk
FROM invoices
WHERE location_id IN (3, 5)
ORDER BY location_id, total_amount DESC, invoice_id;`,
    breakdown: [
      ['PARTITION BY location_id', 'Rank separately within Northside Urgent Care (3) and CareConnect Telehealth (5).'],
      ['RANK() ... ORDER BY total_amount DESC', 'Location 5: 435 → 1, 305 → 2, then 110, 110, 110 all → 3.'],
      ['DENSE_RANK() ... same ORDER BY', 'Here the results match RANK because the ties are last; with values after the ties, RANK would jump and DENSE_RANK would not.'],
      ['ORDER BY location_id, total_amount DESC, invoice_id', 'Stable display order.'],
    ],
    visual: { type: 'window', source: W_LOC, partition: 'location_id', order: 'total_amount', value: 'total_amount', fn: 'DENSE_RANK' },
    internals: `<p>DENSE_RANK keeps one counter that increments only when the ORDER BY value changes. RANK instead sets the counter to the current row position. Both need the sort; neither needs a frame.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM (
  SELECT invoice_id, total_amount, RANK() OVER (ORDER BY total_amount DESC) AS r
  FROM invoices WHERE location_id = 4)
WHERE r = 6;`, why: 'Intended: "the 6th highest distinct amount" (350). But RANK skips 6 after the tie at 5, so nothing is returned. DENSE_RANK has no gaps.', fix: `SELECT * FROM (
  SELECT invoice_id, total_amount, DENSE_RANK() OVER (ORDER BY total_amount DESC) AS r
  FROM invoices WHERE location_id = 4)
WHERE r = 6;` },
    ],
    rules: [
      'DENSE_RANK: ties share a rank, no gaps (1, 2, 2, 3).',
      'The maximum DENSE_RANK in a partition = the number of distinct values.',
      'Use DENSE_RANK for "Nth highest distinct value".',
      'RANK vs DENSE_RANK only differ AFTER a tie.',
    ],
    compare: `<table><tr><th>Lakeview amounts</th><th>RANK</th><th>DENSE_RANK</th></tr>
<tr><td>630</td><td>1</td><td>1</td></tr><tr><td>480</td><td>2</td><td>2</td></tr><tr><td>415</td><td>3</td><td>3</td></tr><tr><td>405</td><td>4</td><td>4</td></tr>
<tr><td>380, 380</td><td>5, 5</td><td>5, 5</td></tr><tr><td>350, 350</td><td><b>7</b>, 7</td><td><b>6</b>, 6</td></tr><tr><td>310</td><td><b>9</b></td><td><b>7</b></td></tr></table>`,
    realWorld: 'Fee-schedule tiering, "the second-highest claim amount per payor", and medal-style reporting where ties should not push others down.',
    tips: ['Classic interview question "second highest salary": WHERE DENSE_RANK() ... = 2.'],
    deep: `<p>In SQLite, <code>COUNT(DISTINCT x) OVER (...)</code> is not allowed (DISTINCT is not supported in window aggregates). The maximum DENSE_RANK per partition is a neat workaround: <code>MAX(dr) OVER (PARTITION BY g)</code> over a DENSE_RANK column gives the count of distinct values.</p>`,
    tryIt: { prompt: 'Switch the source to location 4 and compare RANK and DENSE_RANK after the ties at 380 and 350.', starter: `SELECT invoice_id, total_amount,
       RANK()       OVER (ORDER BY total_amount DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY total_amount DESC) AS dense_rnk
FROM invoices
WHERE location_id = 4
ORDER BY total_amount DESC, invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'For each location, list the invoices whose total_amount is among the top 2 DISTINCT amounts of that location. Show location_id, invoice_id, total_amount, amount_level (the DENSE_RANK). Order by location_id, amount_level, invoice_id.',
      solution: `SELECT location_id, invoice_id, total_amount, amount_level
FROM (
    SELECT location_id, invoice_id, total_amount,
           DENSE_RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS amount_level
    FROM invoices
)
WHERE amount_level <= 2
ORDER BY location_id, amount_level, invoice_id;`,
      hints: ['"Top 2 distinct amounts" means DENSE_RANK, not ROW_NUMBER.', 'DENSE_RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS amount_level', 'Compute it in a subquery, then filter WHERE amount_level <= 2 outside.', 'ORDER BY location_id, amount_level, invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Values 90, 80, 80, 70 (DESC). What DENSE_RANK does 70 get?', options: ['4', '3', '2', '5'], answer: 1, why: 'Distinct levels: 90 (1), 80 (2), 70 (3).' },
      { q: 'You need "the 2nd highest distinct payment amount". Which function?', options: ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE'], answer: 2, why: 'DENSE_RANK counts distinct values without gaps.' },
      { q: 'When do RANK and DENSE_RANK give the same results?', options: ['Never', 'When there are no ties (or ties only at the end)', 'Only with PARTITION BY', 'Always'], answer: 1, why: 'They differ only in the numbers that come after a tie.' },
    ],
  },

  // ─────────────────────────────────────────────── 09
  {
    id: 'windows-09',
    goals: [
      'NTILE(n) splits ordered rows into n roughly equal buckets',
      'How uneven counts are distributed (the first buckets get the extra rows)',
      'Quartiles and deciles for segmentation',
      'The limits of NTILE with ties',
    ],
    concept: `<p><code>NTILE(n)</code> sorts the rows (by the window's ORDER BY) and deals them into <b>n buckets</b> numbered 1..n, as evenly as possible.</p>
<p>15 Lakeview invoices into 4 buckets: 15 / 4 = 3 remainder 3, so the first three buckets get 4 rows and the last gets 3 (4, 4, 4, 3). The <b>earlier buckets get the extra rows</b>.</p>
<p>Ordered by amount DESC, bucket 1 holds the top quarter of invoices by value, which is useful for "top quartile" analysis. Note that NTILE splits by <b>row count</b>, not by value. Two equal amounts can land in different buckets.</p>`,
    why: 'Segmentation (quartiles, deciles, high / medium / low tiers) is a standard analytics task, and NTILE does it in one expression.',
    when: 'Use it for splitting patients into spending quartiles, invoices into value tiers, or any "divide into n equal groups" request.',
    analogy: 'Dealing a stack of claims, sorted by value, into 4 equal piles for 4 reviewers: the top pile gets the biggest claims. If the stack does not divide evenly, the first reviewers get one extra claim each.',
    exampleSql: W_L4 + ` ORDER BY total_amount DESC`,
    syntax: `NTILE(n) OVER ([PARTITION BY g] ORDER BY col [DESC])`,
    sql: `SELECT invoice_id, total_amount,
       NTILE(4) OVER (ORDER BY total_amount DESC, invoice_id) AS quartile
FROM invoices
WHERE location_id = 4
ORDER BY total_amount DESC, invoice_id;`,
    breakdown: [
      ['NTILE(4)', 'Split into 4 buckets (quartiles).'],
      ['ORDER BY total_amount DESC, invoice_id', 'Largest first, so bucket 1 = the top quarter. invoice_id makes tie placement deterministic.'],
      ['WHERE location_id = 4', '15 invoices → bucket sizes 4, 4, 4, 3.'],
    ],
    visual: { type: 'window', source: W_L4, partition: null, order: 'total_amount', value: 'total_amount', fn: 'NTILE' },
    internals: `<p>NTILE needs the <b>partition row count</b> before it can assign buckets, so SQLite buffers the entire partition first. It then computes the bucket size (count / n) and the remainder, and deals rows sequentially.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, total_amount, NTILE(4) OVER (ORDER BY total_amount DESC) AS quartile
FROM invoices WHERE location_id = 4;`, why: 'The two 380 invoices (and the two 350s, 150s, 100s) are peers, so which one lands in which bucket at a boundary is arbitrary. Add a tie-breaker for repeatable output, and remember that equal values can still be split across buckets.', fix: `SELECT invoice_id, total_amount, NTILE(4) OVER (ORDER BY total_amount DESC, invoice_id) AS quartile
FROM invoices WHERE location_id = 4;` },
    ],
    rules: [
      'NTILE(n) gives bucket numbers 1..n.',
      'Bucket sizes differ by at most 1; the earlier buckets are larger.',
      'It splits by row count, not by value ranges.',
      'With fewer rows than n, some buckets are empty (each row gets its own bucket).',
    ],
    compare: `<table><tr><th>Function</th><th>Splits by</th><th>Output</th></tr>
<tr><td>NTILE(4)</td><td>row count</td><td>bucket 1..4</td></tr>
<tr><td>PERCENT_RANK()</td><td>rank position</td><td>0..1</td></tr>
<tr><td>CUME_DIST()</td><td>value ≤ current</td><td>(0..1]</td></tr>
<tr><td>CASE on value</td><td>fixed thresholds</td><td>custom labels</td></tr></table>`,
    realWorld: 'Patient segmentation by lifetime billing (top quartile get care-coordination outreach), decile analysis of claim amounts, and splitting work queues evenly among billers.',
    tips: ['To label buckets, wrap the result: CASE NTILE(3) OVER (...) WHEN 1 THEN \'High\' WHEN 2 THEN \'Medium\' ELSE \'Low\' END.'],
    deep: `<p>For value-based percentiles (the median or 90th percentile amount), NTILE is only an approximation. Standard SQL has <code>PERCENTILE_CONT</code>/<code>PERCENTILE_DISC</code> (PostgreSQL, Oracle, SQL Server), which SQLite lacks. In SQLite, use ROW_NUMBER and COUNT(*) OVER () to pick the middle row(s).</p>`,
    tryIt: { prompt: 'Change NTILE(4) to NTILE(3) and label the buckets High / Medium / Low with CASE.', starter: `SELECT invoice_id, total_amount,
       NTILE(4) OVER (ORDER BY total_amount DESC, invoice_id) AS quartile
FROM invoices
WHERE location_id = 4
ORDER BY total_amount DESC, invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'Split the patients who have invoices into 4 quartiles by their total billed amount (highest spenders in quartile 1). Show patient_id, billed, quartile. Use patient_id as a tie-breaker. Order by quartile, billed descending, patient_id.',
      solution: `SELECT patient_id, billed,
       NTILE(4) OVER (ORDER BY billed DESC, patient_id) AS quartile
FROM (SELECT patient_id, SUM(total_amount) AS billed FROM invoices GROUP BY patient_id)
ORDER BY quartile, billed DESC, patient_id;`,
      hints: ['First total per patient: SELECT patient_id, SUM(total_amount) AS billed FROM invoices GROUP BY patient_id.', 'Then apply NTILE(4) over that summary (as a subquery).', 'NTILE(4) OVER (ORDER BY billed DESC, patient_id) AS quartile', 'ORDER BY quartile, billed DESC, patient_id.'],
      ordered: true,
    },
    quiz: [
      { q: '10 rows, NTILE(3). What are the bucket sizes?', options: ['3, 3, 4', '4, 3, 3', '3, 4, 3', '4, 4, 2'], answer: 1, why: '10 / 3 = 3 remainder 1, so the first bucket gets the extra row.' },
      { q: 'Does NTILE guarantee that equal values land in the same bucket?', options: ['Yes', 'No, it splits by row count', 'Only with DESC', 'Only with PARTITION BY'], answer: 1, why: 'Peers can straddle a bucket boundary.' },
    ],
  },

  // ─────────────────────────────────────────────── 10
  {
    id: 'windows-10',
    goals: [
      'LAG() reads a value from an earlier row',
      'Offsets and default values: LAG(col, n, default)',
      'Row-to-row differences: days between visits, amount change',
      'Why the first row of each partition gets NULL',
    ],
    concept: `<p><code>LAG(column)</code> returns the value of <code>column</code> from the <b>previous row</b> in the window order, so you can compare each row with the one before it.</p>
<ul>
<li><code>LAG(invoice_date)</code>: the date of the previous visit.</li>
<li><code>LAG(total_amount, 1, 0)</code>: previous amount, or 0 if there is none.</li>
<li><code>LAG(x, 2)</code>: two rows back.</li>
</ul>
<p>The first row in each partition has no previous row, so LAG returns <b>NULL</b> (or your default). Combine LAG with arithmetic: <code>julianday(invoice_date) - julianday(LAG(invoice_date) OVER (...))</code> gives the <b>days since the previous visit</b>.</p>`,
    why: 'Change over time (days between visits, growth from last month, the gap between payments) needs the current row and the previous row side by side. Before windows, this took a self-join.',
    when: 'Use it for deltas, gaps, trends, "previous status" and detecting changes from one row to the next.',
    analogy: 'Flipping back one page in a patient\'s chart to see the date and bill of the last visit before writing today\'s note.',
    exampleSql: W_VISITS + ` ORDER BY patient_id, invoice_date`,
    syntax: `LAG(expr [, offset [, default]]) OVER ([PARTITION BY g] ORDER BY col)`,
    sql: `SELECT patient_id, invoice_id, invoice_date, total_amount,
       LAG(invoice_date) OVER w AS prev_visit,
       CAST(julianday(invoice_date) - julianday(LAG(invoice_date) OVER w) AS INTEGER) AS days_since_prev,
       total_amount - LAG(total_amount, 1, 0) OVER w AS change_vs_prev
FROM invoices
WHERE patient_id IN (3, 7, 24)
WINDOW w AS (PARTITION BY patient_id ORDER BY invoice_date)
ORDER BY patient_id, invoice_date;`,
    breakdown: [
      ['WINDOW w AS (PARTITION BY patient_id ORDER BY invoice_date)', 'A named window reused by all three LAG calls: each patient\'s visits in date order.'],
      ['LAG(invoice_date) OVER w', 'The date of the patient\'s previous invoice (NULL on their first).'],
      ['julianday(invoice_date) - julianday(LAG(...))', 'The number of days between the two visits.'],
      ['LAG(total_amount, 1, 0) OVER w', 'Previous amount, defaulting to 0 so the first row shows its full amount as the change.'],
    ],
    visual: { type: 'window', source: W_VISITS, partition: 'patient_id', order: 'invoice_date', value: 'total_amount', fn: 'LAG' },
    internals: `<p>LAG only needs a small buffer: SQLite keeps the last <i>offset</i> rows of the current partition in memory. It is computed in the same sorted pass as the other window functions. The equivalent self-join (join each invoice to the patient's latest earlier invoice) is much more expensive.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id, invoice_id, invoice_date,
       LAG(invoice_date) OVER (ORDER BY invoice_date) AS prev_visit
FROM invoices WHERE patient_id IN (3, 7, 24);`, why: 'No PARTITION BY, so LAG reads the previous row across ALL patients, and patient 7\'s "previous visit" may be patient 24\'s invoice. Partition by the entity.', fix: `SELECT patient_id, invoice_id, invoice_date,
       LAG(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date) AS prev_visit
FROM invoices WHERE patient_id IN (3, 7, 24);` },
      { wrong: `SELECT patient_id, invoice_id, LAG(invoice_date) OVER (PARTITION BY patient_id) AS prev_visit
FROM invoices;`, why: 'Without ORDER BY, "previous" is undefined, so you get an arbitrary row. LAG and LEAD always need ORDER BY.', fix: `SELECT patient_id, invoice_id, LAG(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id) AS prev_visit
FROM invoices;` },
    ],
    rules: [
      'LAG looks backward; LEAD looks forward.',
      'Always give LAG an ORDER BY (and usually a PARTITION BY).',
      'The first row of each partition gets NULL unless you pass a default.',
      'LAG ignores the frame clause; it counts physical rows.',
    ],
    compare: `<table><tr><th>Approach</th><th>Previous-visit date</th></tr>
<tr><td>Self-join</td><td>join to MAX(earlier date) per patient (complex, slow)</td></tr>
<tr><td>Correlated subquery</td><td>(SELECT MAX(d) FROM ... WHERE d &lt; outer.d)</td></tr>
<tr><td>LAG</td><td>LAG(d) OVER (PARTITION BY patient ORDER BY d)</td></tr></table>`,
    realWorld: 'Readmission checks (visits within 30 days of the previous one), month-over-month revenue change, and spotting status changes in claim histories.',
    tips: ['Use the WINDOW clause when several functions share the same OVER definition.'],
    deep: `<p>The default argument is evaluated as an expression, so <code>LAG(total_amount, 1, total_amount)</code> makes the first row compare with itself (change 0). The standard also defines <code>IGNORE NULLS</code> for LAG/LEAD (skip NULL values). Oracle, Snowflake and newer SQL Server support it; SQLite and PostgreSQL do not.</p>`,
    tryIt: { prompt: 'Flag readmissions: add a column that is \'30-day revisit\' when days_since_prev <= 30, otherwise empty.', starter: `SELECT patient_id, invoice_id, invoice_date,
       CAST(julianday(invoice_date) - julianday(LAG(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date)) AS INTEGER) AS days_since_prev
FROM invoices
ORDER BY patient_id, invoice_date;` },
    challenge: {
      level: 3,
      prompt: 'For each payment, show invoice_id, payment_id, payment_date and days_since_prev: the whole number of days since the previous payment on the SAME invoice (NULL for the first). Order payments within an invoice by payment_date, then payment_id. Output ordered by invoice_id, payment_date, payment_id.',
      solution: `SELECT invoice_id, payment_id, payment_date,
       CAST(julianday(payment_date)
            - julianday(LAG(payment_date) OVER (PARTITION BY invoice_id ORDER BY payment_date, payment_id))
            AS INTEGER) AS days_since_prev
FROM payments
ORDER BY invoice_id, payment_date, payment_id;`,
      hints: ['Previous payment on the same invoice means PARTITION BY invoice_id.', 'LAG(payment_date) OVER (PARTITION BY invoice_id ORDER BY payment_date, payment_id)', 'Subtract with julianday() and CAST(... AS INTEGER).', 'ORDER BY invoice_id, payment_date, payment_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What does LAG(x) return for the first row of a partition?', options: ['0', 'The same row\'s x', 'NULL (unless a default is given)', 'The last row\'s x'], answer: 2, why: 'There is no previous row, so the default (NULL) is used.' },
      { q: 'LAG(total_amount, 2, 0) means...', options: ['the value 2 rows back, or 0 if none', 'the value 2 rows ahead', 'the total times 2', 'the 2nd row of the partition'], answer: 0, why: 'The arguments are (expression, offset, default).' },
    ],
  },

  // ─────────────────────────────────────────────── 11
  {
    id: 'windows-11',
    goals: [
      'LEAD() reads a value from a later row',
      'Next-event questions: next visit, next payment, time until follow-up',
      'The last row of each partition gets NULL',
      'Building "valid from / valid to" intervals with LEAD',
    ],
    concept: `<p><code>LEAD(column)</code> is the mirror of LAG: it returns the value from the <b>next row</b> in the window order.</p>
<ul>
<li><code>LEAD(invoice_date)</code>: the date of the patient's next visit.</li>
<li><code>LEAD(x, 1, 'none')</code>: the next value, or a default on the last row.</li>
</ul>
<p>The last row in each partition has no next row, so it gets NULL. A handy pattern: <code>invoice_date</code> as "from" and <code>LEAD(invoice_date)</code> as "to" turns a list of events into <b>intervals</b>, for example "how long did each visit's episode last until the next visit?"</p>`,
    why: 'Follow-up questions ("did the patient come back?", "how long until the next payment?") look forward in time.',
    when: 'Use it for time-to-next-event, detecting the last event (LEAD IS NULL), and converting events to intervals.',
    analogy: 'Looking at the appointment book to see when the patient is scheduled next after today\'s visit.',
    exampleSql: W_VISITS + ` ORDER BY patient_id, invoice_date`,
    syntax: `LEAD(expr [, offset [, default]]) OVER ([PARTITION BY g] ORDER BY col)`,
    sql: `SELECT patient_id, invoice_id, invoice_date, total_amount,
       LEAD(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date) AS next_visit,
       CAST(julianday(LEAD(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date))
            - julianday(invoice_date) AS INTEGER) AS days_until_next,
       CASE WHEN LEAD(invoice_id) OVER (PARTITION BY patient_id ORDER BY invoice_date) IS NULL
            THEN 'latest visit' END AS note
FROM invoices
WHERE patient_id IN (3, 7, 24)
ORDER BY patient_id, invoice_date;`,
    breakdown: [
      ['LEAD(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date)', 'The date of the same patient\'s next invoice.'],
      ['julianday(LEAD(...)) - julianday(invoice_date)', 'Days until the next visit.'],
      ['LEAD(invoice_id) ... IS NULL', 'No next row, so this is the patient\'s most recent visit.'],
      ['WHERE patient_id IN (3, 7, 24)', 'Three patients with 4 to 5 visits each.'],
    ],
    visual: { type: 'window', source: W_VISITS, partition: 'patient_id', order: 'invoice_date', value: 'total_amount', fn: 'LEAD' },
    internals: `<p>LEAD must look ahead, so SQLite buffers rows of the partition until the row <i>offset</i> positions ahead is available (or the partition ends). LEAD, like LAG, ignores any frame clause.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id, invoice_id,
       LEAD(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date DESC) AS next_visit
FROM invoices;`, why: 'With DESC order, the "next" row is the EARLIER visit, so this is really the previous visit. LEAD with DESC equals LAG with ASC. Keep the order ascending when you mean "later in time".', fix: `SELECT patient_id, invoice_id,
       LEAD(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date) AS next_visit
FROM invoices;` },
    ],
    rules: [
      'LEAD = next row; LAG = previous row (in the window\'s ORDER BY).',
      'The last row of each partition gets NULL or the default.',
      'Reversing the ORDER BY swaps LEAD and LAG.',
      'LEAD(x) IS NULL is a neat test for "is this the last row?".',
    ],
    compare: `<table><tr><th>Question</th><th>Use</th></tr>
<tr><td>Days since last visit</td><td>LAG</td></tr><tr><td>Days until next visit</td><td>LEAD</td></tr>
<tr><td>Is this the latest invoice?</td><td>LEAD(...) IS NULL, or ROW_NUMBER DESC = 1</td></tr>
<tr><td>Episode from/to</td><td>date, LEAD(date)</td></tr></table>`,
    realWorld: 'Follow-up compliance (did the patient return within 14 days?), churn detection (no next visit in 12 months), and turning status events into status periods.',
    tips: ['LEAD(x, 1, date(\'2026-09-01\')) can fill the last interval with "today".'],
    deep: `<p>Intervals built with LEAD are the basis of <b>slowly changing dimension type 2</b> tables (valid_from, valid_to). The last row's valid_to is usually NULL or a sentinel like 9999-12-31. LEAD(x, n) with n greater than 1 works too, e.g. LEAD(invoice_date, 2) for "two visits later".</p>`,
    tryIt: { prompt: 'Add a column next_amount with the amount of the patient\'s next invoice, defaulting to 0.', starter: `SELECT patient_id, invoice_id, invoice_date, total_amount,
       LEAD(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date) AS next_visit
FROM invoices
WHERE patient_id IN (3, 7, 24)
ORDER BY patient_id, invoice_date;` },
    challenge: {
      level: 3,
      prompt: 'For every transaction of invoice 24, show transaction_id, transaction_date, transaction_type and next_type: the transaction_type of the next transaction on that invoice (ordered by transaction_date, then transaction_id), or \'END\' for the last one. Order by transaction_date, transaction_id.',
      solution: `SELECT transaction_id, transaction_date, transaction_type,
       LEAD(transaction_type, 1, 'END') OVER (ORDER BY transaction_date, transaction_id) AS next_type
FROM transactions
WHERE invoice_id = 24
ORDER BY transaction_date, transaction_id;`,
      hints: ['Only invoice 24, so no PARTITION BY is needed (you could add PARTITION BY invoice_id).', 'LEAD looks at the next row.', 'Use the 3-argument form to give a default: LEAD(transaction_type, 1, \'END\').', 'OVER (ORDER BY transaction_date, transaction_id), and the same ORDER BY for the output.'],
      ordered: true,
    },
    quiz: [
      { q: 'LEAD(x) OVER (ORDER BY d DESC) is equivalent to...', options: ['LEAD(x) OVER (ORDER BY d)', 'LAG(x) OVER (ORDER BY d)', 'FIRST_VALUE(x)', 'x'], answer: 1, why: 'Reversing the order swaps "next" and "previous".' },
      { q: 'Which row gets NULL from LEAD(x) OVER (PARTITION BY p ORDER BY d)?', options: ['The first row of each partition', 'The last row of each partition', 'Every row', 'None'], answer: 1, why: 'The last row has no next row.' },
    ],
  },

  // ─────────────────────────────────────────────── 12
  {
    id: 'windows-12',
    goals: [
      'FIRST_VALUE() returns a value from the first row of the window frame',
      'Comparing every row with the first row (first visit, first charge)',
      'Why the default frame is fine for FIRST_VALUE',
      'FIRST_VALUE with DESC to get the maximum row\'s attribute',
    ],
    concept: `<p><code>FIRST_VALUE(expr)</code> returns <code>expr</code> evaluated on the <b>first row of the window frame</b>. With ORDER BY and the default frame (start of partition → current row), the first row is always the <b>first row of the partition</b>, so every row sees the same first value.</p>
<p>Examples:</p>
<ul>
<li><code>FIRST_VALUE(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date)</code>: each invoice shows the patient's <b>first visit date</b>.</li>
<li><code>FIRST_VALUE(invoice_id) OVER (PARTITION BY location_id ORDER BY total_amount DESC)</code>: the id of each location's <b>largest</b> invoice. This is something MAX() cannot give you, because MAX returns the value, not the row it came from.</li>
</ul>`,
    why: 'Comparing each event with the starting point ("how many days since the first visit?", "how much more than the first bill?") is common in patient-journey analysis.',
    when: 'Use it to fetch an attribute from the first or top row of a group onto every row: first visit date, first payor, id of the largest claim.',
    analogy: 'Clipping a copy of the patient\'s intake form (the first page of the chart) to every later visit note, so each visit can be compared with day one.',
    exampleSql: W_VISITS + ` ORDER BY patient_id, invoice_date`,
    syntax: `FIRST_VALUE(expr) OVER ([PARTITION BY g] ORDER BY col [frame])`,
    sql: `SELECT patient_id, invoice_id, invoice_date, total_amount,
       FIRST_VALUE(invoice_date) OVER w AS first_visit,
       CAST(julianday(invoice_date) - julianday(FIRST_VALUE(invoice_date) OVER w) AS INTEGER) AS days_since_first,
       FIRST_VALUE(total_amount) OVER w AS first_bill
FROM invoices
WHERE patient_id IN (3, 7, 24)
WINDOW w AS (PARTITION BY patient_id ORDER BY invoice_date)
ORDER BY patient_id, invoice_date;`,
    breakdown: [
      ['WINDOW w AS (PARTITION BY patient_id ORDER BY invoice_date)', 'Each patient\'s invoices, oldest first.'],
      ['FIRST_VALUE(invoice_date) OVER w', 'The patient\'s first visit date, on every row.'],
      ['julianday(invoice_date) - julianday(FIRST_VALUE(...))', 'Days since the first visit.'],
      ['FIRST_VALUE(total_amount) OVER w', 'The amount of the first invoice, for comparison.'],
    ],
    visual: { type: 'window', source: W_VISITS, partition: 'patient_id', order: 'invoice_date', value: 'total_amount', fn: 'FIRST_VALUE' },
    internals: `<p>With the default frame, the frame always starts at the partition's first row, so SQLite just remembers that row's value. FIRST_VALUE is sensitive to the frame: with <code>ROWS BETWEEN 1 PRECEDING AND CURRENT ROW</code>, the "first" value would be the previous row's.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id, invoice_id,
       FIRST_VALUE(invoice_date) OVER (PARTITION BY patient_id) AS first_visit
FROM invoices;`, why: 'Without ORDER BY, the "first" row of the partition is arbitrary. Always say what "first" means.', fix: `SELECT patient_id, invoice_id,
       FIRST_VALUE(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id) AS first_visit
FROM invoices;` },
    ],
    rules: [
      'FIRST_VALUE reads the first row of the FRAME.',
      'With ORDER BY and the default frame, that is the first row of the partition.',
      'Use ORDER BY ... DESC to get the attribute of the largest or latest row.',
      'Add a tie-breaker when the first position can be tied.',
    ],
    compare: `<table><tr><th>Need</th><th>MIN()/MAX() OVER</th><th>FIRST_VALUE</th></tr>
<tr><td>Earliest date</td><td>MIN(date) ✓</td><td>✓</td></tr>
<tr><td>Amount ON the earliest date</td><td>✗</td><td>FIRST_VALUE(amount) ORDER BY date ✓</td></tr>
<tr><td>Id of the biggest invoice</td><td>✗</td><td>FIRST_VALUE(id) ORDER BY amount DESC ✓</td></tr></table>`,
    realWorld: 'Patient-journey analytics (days from first visit), "original payor" on later claims, and linking every charge line to the invoice\'s primary procedure.',
    tips: ['MIN/MAX give a value; FIRST_VALUE gives a value from the row where the min or max occurs.'],
    deep: `<p>FIRST_VALUE is exactly <code>NTH_VALUE(expr, 1)</code>. For the LAST row, the default frame does <b>not</b> work (it ends at the current row), which is the classic gotcha of the next lesson. A common trick is to use FIRST_VALUE with the ORDER BY reversed instead of LAST_VALUE.</p>`,
    tryIt: { prompt: 'Use FIRST_VALUE with ORDER BY total_amount DESC to show each patient\'s largest bill on every row.', starter: `SELECT patient_id, invoice_id, invoice_date, total_amount,
       FIRST_VALUE(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date) AS first_visit
FROM invoices
WHERE patient_id IN (3, 7, 24)
ORDER BY patient_id, invoice_date;` },
    challenge: {
      level: 3,
      prompt: 'For each invoice, show invoice_id, location_id, total_amount and top_invoice_id: the invoice_id of the largest invoice at the same location (ties broken by the lowest invoice_id). Order by location_id, invoice_id.',
      solution: `SELECT invoice_id, location_id, total_amount,
       FIRST_VALUE(invoice_id) OVER (PARTITION BY location_id
                                     ORDER BY total_amount DESC, invoice_id) AS top_invoice_id
FROM invoices
ORDER BY location_id, invoice_id;`,
      hints: ['You need an attribute (invoice_id) of the top row per location, so FIRST_VALUE.', 'PARTITION BY location_id.', 'ORDER BY total_amount DESC, invoice_id puts the largest (lowest id on ties) first.', 'FIRST_VALUE(invoice_id) OVER (PARTITION BY location_id ORDER BY total_amount DESC, invoice_id) AS top_invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'Why can\'t MAX(total_amount) OVER (PARTITION BY location_id) tell you WHICH invoice is the largest?', options: ['It can', 'MAX returns only the value, not other columns of that row', 'MAX is not a window function', 'It returns NULL'], answer: 1, why: 'FIRST_VALUE(invoice_id) ... ORDER BY amount DESC returns an attribute of the top row.' },
      { q: 'With the default frame, FIRST_VALUE returns...', options: ['The first row of the partition', 'The current row', 'The previous row', 'The last row'], answer: 0, why: 'The default frame starts at UNBOUNDED PRECEDING, the start of the partition.' },
    ],
  },

  // ─────────────────────────────────────────────── 13
  {
    id: 'windows-13',
    goals: [
      'LAST_VALUE() returns a value from the last row of the frame',
      'The default-frame gotcha: LAST_VALUE usually returns the CURRENT row',
      'Fixing it with ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING',
      'The FIRST_VALUE + DESC alternative',
    ],
    concept: `<p><code>LAST_VALUE(expr)</code> returns <code>expr</code> from the <b>last row of the frame</b>, and that is where the trap lies.</p>
<p>When you use ORDER BY, the <b>default frame</b> is <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. The frame <b>ends at the current row</b>, so the "last row of the frame" is the current row itself (or its last peer). The result: LAST_VALUE just echoes the current row's value, which is almost never what you want.</p>
<p><b>Fix:</b> extend the frame to the end of the partition:</p>
<pre>LAST_VALUE(x) OVER (PARTITION BY p ORDER BY d
                    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)</pre>
<p>Or avoid it entirely: <code>FIRST_VALUE(x) OVER (PARTITION BY p ORDER BY d DESC)</code> gives the same answer with the default frame.</p>`,
    why: 'Getting the latest value per group onto every row (latest visit, current status, final balance) is common, and the gotcha silently gives wrong answers.',
    when: 'Use it whenever you need the last row\'s attribute, always with an explicit full frame, or switch to FIRST_VALUE with DESC.',
    analogy: 'You ask a clerk for "the last page of the chart", but she only reads up to the page you are on, so she always hands back the current page. You must tell her to read to the end of the chart.',
    exampleSql: W_VISITS + ` ORDER BY patient_id, invoice_date`,
    syntax: `LAST_VALUE(expr) OVER (
    PARTITION BY g ORDER BY col
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`,
    sql: `SELECT patient_id, invoice_id, invoice_date,
       LAST_VALUE(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date) AS wrong_latest,
       LAST_VALUE(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date
                                      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS latest_visit,
       FIRST_VALUE(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date DESC) AS latest_visit_alt
FROM invoices
WHERE patient_id IN (3, 7, 24)
ORDER BY patient_id, invoice_date;`,
    breakdown: [
      ['LAST_VALUE(...) OVER (PARTITION BY patient_id ORDER BY invoice_date)', 'THE GOTCHA: the default frame ends at the current row, so this equals invoice_date on every row.'],
      ['ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING', 'Makes the frame the whole partition, so the last row is the patient\'s latest invoice.'],
      ['FIRST_VALUE(...) OVER (... ORDER BY invoice_date DESC)', 'An equivalent that avoids frames: the first row in descending order is the latest.'],
    ],
    visual: { type: 'window', source: W_VISITS, partition: 'patient_id', order: 'invoice_date', value: 'total_amount', fn: 'LAST_VALUE' },
    internals: `<p>With an UNBOUNDED FOLLOWING frame, SQLite must buffer the whole partition before emitting its first row, because the last value is not known until the partition ends. With the default frame it can stream, which is why the default is "up to the current row".</p>`,
    mistakes: [
      { wrong: `SELECT patient_id, invoice_id,
       LAST_VALUE(total_amount) OVER (PARTITION BY patient_id ORDER BY invoice_date) AS latest_bill
FROM invoices;`, why: 'The default frame (RANGE ... AND CURRENT ROW) stops at the current row, so latest_bill just repeats each row\'s own amount.', fix: `SELECT patient_id, invoice_id,
       LAST_VALUE(total_amount) OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id
                                      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS latest_bill
FROM invoices;` },
      { wrong: `SELECT patient_id, invoice_id,
       LAST_VALUE(total_amount) OVER (PARTITION BY patient_id ORDER BY invoice_date
                                      RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS latest_bill
FROM invoices;`, why: 'Writing the default frame explicitly does not help. The frame must reach UNBOUNDED FOLLOWING.', fix: `SELECT patient_id, invoice_id,
       FIRST_VALUE(total_amount) OVER (PARTITION BY patient_id ORDER BY invoice_date DESC, invoice_id DESC) AS latest_bill
FROM invoices;` },
    ],
    rules: [
      'LAST_VALUE with the default frame returns the current row (or its last peer).',
      'Always add ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING.',
      'Or use FIRST_VALUE with the ORDER BY reversed.',
      'Frames affect FIRST_VALUE, LAST_VALUE, NTH_VALUE and aggregates, but not ranking functions or LAG/LEAD.',
    ],
    compare: `<table><tr><th>Expression</th><th>Result per row</th></tr>
<tr><td>LAST_VALUE(d) OVER (P ORDER BY d)</td><td>current row's d ❌</td></tr>
<tr><td>LAST_VALUE(d) OVER (P ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)</td><td>latest d ✅</td></tr>
<tr><td>FIRST_VALUE(d) OVER (P ORDER BY d DESC)</td><td>latest d ✅</td></tr>
<tr><td>MAX(d) OVER (P)</td><td>latest d ✅ (value only)</td></tr></table>`,
    realWorld: 'Showing the current claim status on each history row, the final balance on every ledger line of a statement, or the most recent payor on each old invoice.',
    tips: ['Whenever you type LAST_VALUE, type the frame clause right after it.'],
    deep: `<p>The standard default frame with ORDER BY is <code>RANGE UNBOUNDED PRECEDING</code> (i.e. to CURRENT ROW including peers). If there are ties on the ORDER BY value, even the "wrong" LAST_VALUE can return a peer's value instead of the current row's. That is confusing, and another reason to specify frames explicitly. The Window Frames lesson covers this in depth.</p>`,
    tryIt: { prompt: 'Compare wrong_latest and latest_visit row by row. Then try replacing UNBOUNDED FOLLOWING with 1 FOLLOWING. What does that return?', starter: `SELECT patient_id, invoice_id, invoice_date,
       LAST_VALUE(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date) AS wrong_latest,
       LAST_VALUE(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date
                                      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS latest_visit
FROM invoices
WHERE patient_id IN (3, 7, 24)
ORDER BY patient_id, invoice_date;` },
    challenge: {
      level: 3,
      prompt: 'For each transaction of invoices 1, 6 and 24, show invoice_id, transaction_id, transaction_type and final_type: the transaction_type of the LAST transaction of that invoice (ordered by transaction_date, transaction_id). Use LAST_VALUE with a correct frame. Order by invoice_id, transaction_id.',
      solution: `SELECT invoice_id, transaction_id, transaction_type,
       LAST_VALUE(transaction_type) OVER (PARTITION BY invoice_id
                                          ORDER BY transaction_date, transaction_id
                                          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS final_type
FROM transactions
WHERE invoice_id IN (1, 6, 24)
ORDER BY invoice_id, transaction_id;`,
      hints: ['PARTITION BY invoice_id, ORDER BY transaction_date, transaction_id.', 'LAST_VALUE(transaction_type) with the default frame just returns the current row\'s type.', 'Add ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING.', 'Filter WHERE invoice_id IN (1, 6, 24) and ORDER BY invoice_id, transaction_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'LAST_VALUE(x) OVER (PARTITION BY p ORDER BY d) typically returns...', options: ['The last x of the partition', 'The current row\'s x (or its last peer)', 'The first x', 'NULL'], answer: 1, why: 'The default frame ends at the current row.' },
      { q: 'Which is equivalent to a correctly framed LAST_VALUE(x) ... ORDER BY d?', options: ['FIRST_VALUE(x) OVER (... ORDER BY d DESC)', 'LAG(x)', 'LEAD(x)', 'MIN(x) OVER ()'], answer: 0, why: 'Reversing the order makes the last row first.' },
    ],
  },

  // ─────────────────────────────────────────────── 14
  {
    id: 'windows-14',
    goals: [
      'NTH_VALUE(expr, n) returns the value from the n-th row of the frame',
      'Getting the second visit, the second-highest amount, and so on',
      'Why NTH_VALUE also needs a full frame',
      'NTH_VALUE vs ROW_NUMBER filtering',
    ],
    concept: `<p><code>NTH_VALUE(expr, n)</code> returns <code>expr</code> from the <b>n-th row of the window frame</b>. <code>NTH_VALUE(x, 1)</code> is FIRST_VALUE.</p>
<p>It has the same frame issue as LAST_VALUE: with the default frame, rows <i>before</i> the n-th row do not yet see it and get NULL. Use a full frame when you want every row to show the n-th value:</p>
<pre>NTH_VALUE(total_amount, 2) OVER (PARTITION BY location_id ORDER BY total_amount DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)</pre>
<p>That gives each invoice its location's <b>second-highest</b> invoice amount (by row position; for distinct values use DENSE_RANK).</p>`,
    why: 'Questions like "the second visit", "the runner-up claim" or "the third payment" need a specific position, not just first or last.',
    when: 'Use it to put the n-th row\'s value on every row for comparison. If you only need the n-th row itself, filtering on ROW_NUMBER = n is often simpler.',
    analogy: 'Pulling the second page of each clinic\'s top-invoices list and pinning a copy to every invoice from that clinic.',
    exampleSql: W_LOC + ` ORDER BY location_id, total_amount DESC`,
    syntax: `NTH_VALUE(expr, n) OVER (PARTITION BY g ORDER BY col
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`,
    sql: `SELECT invoice_id, location_id, total_amount,
       NTH_VALUE(total_amount, 2) OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS default_frame,
       NTH_VALUE(total_amount, 2) OVER (PARTITION BY location_id ORDER BY total_amount DESC
                                        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS second_highest
FROM invoices
WHERE location_id IN (3, 5)
ORDER BY location_id, total_amount DESC, invoice_id;`,
    breakdown: [
      ['NTH_VALUE(total_amount, 2)', 'The value from the 2nd row of the frame.'],
      ['... ORDER BY total_amount DESC (default frame)', 'The top row of each location sees only itself, so it gets NULL. Later rows see the 2nd.'],
      ['ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING', 'Every row sees the whole partition, so all show the 2nd-highest (615 for location 3, 305 for location 5).'],
    ],
    visual: { type: 'window', source: W_LOC, partition: 'location_id', order: 'total_amount', value: 'total_amount', fn: 'FIRST_VALUE' },
    internals: `<p>NTH_VALUE is evaluated by counting n rows from the frame start. SQLite requires n to be a positive integer. If the frame has fewer than n rows, the result is NULL. The visual shows FIRST_VALUE (n = 1); NTH_VALUE works the same way, just n rows in.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, location_id, total_amount,
       NTH_VALUE(total_amount, 2) OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS second_highest
FROM invoices;`, why: 'With the default frame, the top invoice of each location only sees itself, so second_highest is NULL on that row. Add a full frame.', fix: `SELECT invoice_id, location_id, total_amount,
       NTH_VALUE(total_amount, 2) OVER (PARTITION BY location_id ORDER BY total_amount DESC
                                        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS second_highest
FROM invoices;` },
    ],
    rules: [
      'NTH_VALUE(x, 1) = FIRST_VALUE(x).',
      'Use a full frame so every row sees the n-th row.',
      'It is NULL when the frame has fewer than n rows.',
      'It is position-based. For the n-th DISTINCT value, use DENSE_RANK.',
    ],
    compare: `<table><tr><th>Goal</th><th>Tool</th></tr>
<tr><td>2nd row's value on every row</td><td>NTH_VALUE(x, 2) + full frame</td></tr>
<tr><td>Only the 2nd row</td><td>ROW_NUMBER() = 2 in a subquery</td></tr>
<tr><td>2nd distinct value</td><td>DENSE_RANK() = 2</td></tr></table>`,
    realWorld: 'The "second visit date" in new-patient retention analysis (did they come back?), and the runner-up claim amount for outlier comparisons.',
    tips: ['Location 5 has three invoices of 110. Positions 3, 4 and 5 all hold 110, which shows NTH_VALUE counts rows, not distinct values.'],
    deep: `<p>The standard allows <code>NTH_VALUE(x, n) FROM LAST</code> and <code>IGNORE NULLS</code>. Oracle supports them; SQLite and PostgreSQL do not. Emulate FROM LAST by reversing the ORDER BY.</p>`,
    tryIt: { prompt: 'Get each patient\'s SECOND visit date on every row (patients 3, 7, 24), using a full frame.', starter: `SELECT patient_id, invoice_id, invoice_date,
       NTH_VALUE(invoice_date, 2) OVER (PARTITION BY patient_id ORDER BY invoice_date) AS second_visit
FROM invoices
WHERE patient_id IN (3, 7, 24)
ORDER BY patient_id, invoice_date;` },
    challenge: {
      level: 3,
      prompt: 'For each patient with invoices, show patient_id and second_visit: the invoice_date of their 2nd invoice (by invoice_date, then invoice_id), or NULL if they have only one. One row per patient. Order by patient_id.',
      solution: `SELECT DISTINCT patient_id,
       NTH_VALUE(invoice_date, 2) OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id
                                        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS second_visit
FROM invoices
ORDER BY patient_id;`,
      hints: ['NTH_VALUE(invoice_date, 2) gives the 2nd visit.', 'PARTITION BY patient_id ORDER BY invoice_date, invoice_id, with a full frame so every row sees it.', 'Every row of a patient then has the same value, so use SELECT DISTINCT for one row per patient.', 'ORDER BY patient_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'NTH_VALUE(x, 3) when the frame has only 2 rows returns...', options: ['The 2nd value', 'NULL', 'An error', '0'], answer: 1, why: 'There is no 3rd row in the frame.' },
      { q: 'Which is the same as NTH_VALUE(x, 1)?', options: ['LAG(x)', 'FIRST_VALUE(x)', 'LAST_VALUE(x)', 'ROW_NUMBER()'], answer: 1, why: 'The first row of the frame.' },
    ],
  },

  // ─────────────────────────────────────────────── 15
  {
    id: 'windows-15',
    goals: [
      'Using SUM, AVG, COUNT, MIN and MAX as window functions',
      'Partition-level vs running aggregates',
      'Comparing each row with group statistics (vs average, share of max)',
      'Which aggregates are allowed (no DISTINCT in SQLite windows)',
    ],
    concept: `<p>Any normal aggregate becomes a window function when you add <code>OVER(...)</code>:</p>
<ul>
<li><code>AVG(amount) OVER (PARTITION BY invoice_id)</code>: the invoice's average charge line, on every line.</li>
<li><code>MAX(amount) OVER (PARTITION BY invoice_id)</code>: the largest line on the invoice.</li>
<li><code>SUM(amount) OVER (PARTITION BY invoice_id ORDER BY service_date, charge_id)</code>: a running subtotal.</li>
</ul>
<p>Without ORDER BY you get the <b>whole-partition</b> value; with ORDER BY you get a <b>running</b> value (start → current row). The rows are never collapsed, so you can compare each row with its group directly.</p>`,
    why: 'Comparisons like "this charge vs the invoice average" or "this line as a % of the biggest line" are one-liners with aggregate windows.',
    when: 'Use them for group totals, averages, minimums and maximums next to detail rows, and for running or moving aggregates.',
    analogy: 'The invoice footer (total, average line, biggest line) is copied onto every line of the invoice so each line can be judged against it.',
    exampleSql: W_CHG + ` ORDER BY invoice_id, service_date, charge_id`,
    syntax: `SUM(x)   OVER (PARTITION BY g)
AVG(x)   OVER (PARTITION BY g)
COUNT(*) OVER (PARTITION BY g ORDER BY d)   -- running count
MIN(x) / MAX(x) OVER (...)`,
    sql: `SELECT invoice_id, charge_id, service_date, amount,
       SUM(amount)   OVER (PARTITION BY invoice_id ORDER BY service_date, charge_id) AS running_subtotal,
       SUM(amount)   OVER (PARTITION BY invoice_id) AS invoice_total,
       ROUND(AVG(amount) OVER (PARTITION BY invoice_id), 2) AS avg_line,
       MAX(amount)   OVER (PARTITION BY invoice_id) AS biggest_line,
       COUNT(*)      OVER (PARTITION BY invoice_id) AS lines
FROM charges
WHERE invoice_id IN (4, 27, 40)
ORDER BY invoice_id, service_date, charge_id;`,
    breakdown: [
      ['SUM(amount) OVER (PARTITION BY invoice_id ORDER BY service_date, charge_id)', 'Running subtotal down each invoice.'],
      ['SUM(amount) OVER (PARTITION BY invoice_id)', 'Whole-invoice total (no ORDER BY, so the whole partition).'],
      ['AVG / MAX / COUNT OVER (PARTITION BY invoice_id)', 'Invoice-level statistics on every line.'],
      ['WHERE invoice_id IN (4, 27, 40)', 'Three invoices, 11 charge lines.'],
    ],
    visual: { type: 'window', source: W_CHG, partition: 'invoice_id', order: 'service_date', value: 'amount', fn: 'RUNNING_SUM' },
    internals: `<p>SQLite implements aggregate windows with an <i>inverse</i> step (xInverse) for sliding frames: when a row leaves the frame, its value is subtracted instead of recomputing from scratch. For MIN/MAX (which have no simple inverse), it keeps a small structure of candidates. Whole-partition aggregates are computed once per partition.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, charge_id,
       COUNT(DISTINCT practitioner_id) OVER (PARTITION BY invoice_id) AS providers
FROM charges;`, why: 'SQLite (and PostgreSQL, SQL Server) do not allow DISTINCT in window aggregates. Compute it with GROUP BY in a subquery and join back, or use a DENSE_RANK trick.', fix: `SELECT c.invoice_id, c.charge_id, d.providers
FROM charges c
JOIN (SELECT invoice_id, COUNT(DISTINCT practitioner_id) AS providers FROM charges GROUP BY invoice_id) d
  ON d.invoice_id = c.invoice_id;` },
    ],
    rules: [
      'Any aggregate + OVER() = an aggregate window function.',
      'No ORDER BY: whole partition. ORDER BY: running (frame to the current row).',
      'DISTINCT is not allowed inside window aggregates in SQLite.',
      'You can mix several window aggregates with different partitions in one SELECT.',
    ],
    compare: `<table><tr><th>Form</th><th>Rows</th><th>Value</th></tr>
<tr><td>SUM(x) ... GROUP BY g</td><td>1 per g</td><td>group total</td></tr>
<tr><td>SUM(x) OVER (PARTITION BY g)</td><td>all</td><td>group total on each row</td></tr>
<tr><td>SUM(x) OVER (PARTITION BY g ORDER BY d)</td><td>all</td><td>running total</td></tr></table>`,
    realWorld: 'Charge-line audits ("lines over 2× the invoice average"), itemized statements with running subtotals, and practitioner dashboards showing each visit against their average.',
    tips: ['SQLite also supports FILTER on window aggregates: SUM(amount) FILTER (WHERE units > 1) OVER (PARTITION BY invoice_id).'],
    deep: `<p>Window aggregates can use FILTER (SQLite 3.30+): <code>COUNT(*) FILTER (WHERE transaction_type = 'PAYMENT') OVER (PARTITION BY invoice_id)</code> counts payments per invoice on every ledger row. <code>group_concat</code> is also allowed as a window function in SQLite, which is handy for building a running list of CPT codes.</p>`,
    tryIt: { prompt: 'Add a column pct_of_biggest = amount as a percentage of the biggest line on the invoice.', starter: `SELECT invoice_id, charge_id, amount,
       MAX(amount) OVER (PARTITION BY invoice_id) AS biggest_line
FROM charges
WHERE invoice_id IN (4, 27, 40)
ORDER BY invoice_id, charge_id;` },
    challenge: {
      level: 2,
      prompt: 'Show charges (charge_id, practitioner_id, amount) whose amount is more than 1.5 times the average charge amount of the SAME practitioner. Also show that practitioner average as prac_avg (rounded to 2). Order by practitioner_id, charge_id.',
      solution: `SELECT charge_id, practitioner_id, amount, ROUND(prac_avg, 2) AS prac_avg
FROM (
    SELECT charge_id, practitioner_id, amount,
           AVG(amount) OVER (PARTITION BY practitioner_id) AS prac_avg
    FROM charges
)
WHERE amount > 1.5 * prac_avg
ORDER BY practitioner_id, charge_id;`,
      hints: ['The practitioner average: AVG(amount) OVER (PARTITION BY practitioner_id).', 'You cannot filter on a window in WHERE of the same level.', 'Compute it in a subquery, then filter WHERE amount > 1.5 * prac_avg outside.', 'ROUND(prac_avg, 2) in the outer SELECT, ORDER BY practitioner_id, charge_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'MAX(amount) OVER (PARTITION BY invoice_id) on an invoice with 4 lines returns...', options: ['4 different values', 'The same maximum on all 4 lines', 'One row', 'The running max'], answer: 1, why: 'No ORDER BY means the whole partition.' },
      { q: 'Is COUNT(DISTINCT x) OVER (...) allowed in SQLite?', options: ['Yes', 'No', 'Only with ORDER BY', 'Only with ROWS frames'], answer: 1, why: 'DISTINCT is not supported in window aggregates.' },
    ],
  },

  // ─────────────────────────────────────────────── 16
  {
    id: 'windows-16',
    goals: [
      'Running totals with SUM() OVER (ORDER BY ...)',
      'Running balances from a signed ledger (charges +, payments −)',
      'Using ROWS UNBOUNDED PRECEDING and tie-breakers for exact sequencing',
      'Restarting totals per account with PARTITION BY',
    ],
    concept: `<p>A <b>running total</b> is the sum of all rows from the start up to the current one. In SQL:</p>
<pre>SUM(amount) OVER (PARTITION BY invoice_id
                  ORDER BY transaction_date, transaction_id
                  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)</pre>
<p>The <code>transactions</code> table is a <b>ledger</b>: CHARGE rows add to the balance (+), PAYMENT, ADJUSTMENT and WRITE_OFF rows reduce it (−), and a REFUND adds back (+). A running SUM of <code>amount</code> therefore gives the <b>balance after each entry</b>, exactly like a bank statement.</p>
<p>Look at invoice 1: charge 165 → balance 165; payment −165 → 0; a <b>duplicate</b> payment −165 → −165 (overpaid!); refund +165 → back to 0. The running balance tells the whole story.</p>`,
    why: 'Account balances, cumulative revenue and year-to-date totals are core financial reports, and running totals produce them directly.',
    when: 'Use them for any cumulative measure over time: balances, YTD collections, cumulative patient counts.',
    analogy: 'A patient ledger card: each line shows the entry and the new balance right after it.',
    exampleSql: W_TXN + ` ORDER BY invoice_id, transaction_date, transaction_id`,
    syntax: `SUM(amount) OVER (
    PARTITION BY account
    ORDER BY entry_date, entry_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance`,
    sql: `SELECT invoice_id, transaction_id, transaction_date, transaction_type, amount,
       SUM(amount) OVER (PARTITION BY invoice_id
                         ORDER BY transaction_date, transaction_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance
FROM transactions
WHERE invoice_id IN (1, 6, 24)
ORDER BY invoice_id, transaction_date, transaction_id;`,
    breakdown: [
      ['SUM(amount)', 'Signed amounts: charges +, payments −, refunds +.'],
      ['PARTITION BY invoice_id', 'Each invoice has its own balance, starting from 0.'],
      ['ORDER BY transaction_date, transaction_id', 'Chronological order; transaction_id breaks same-day ties (invoice 1 has two payments on 2025-05-09).'],
      ['ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'Sum from the first entry through exactly this row (not its same-day peers).'],
    ],
    visual: { type: 'window', source: W_TXN, partition: 'invoice_id', order: 'transaction_id', value: 'amount', fn: 'RUNNING_SUM' },
    internals: `<p>A running SUM is O(n) after the sort: SQLite adds each row's value to an accumulator and emits it. With <code>ROWS</code>, each row is its own step. With the default <code>RANGE</code>, SQLite must first find all peers of the current row (same ORDER BY value) and add them together, which is why same-day entries would show the same balance.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, transaction_id, transaction_date, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date) AS balance
FROM transactions WHERE invoice_id = 1;`, why: 'Transactions 30 and 31 are both on 2025-05-09. With the default RANGE frame they are peers, so BOTH rows show −165 and the intermediate balance of 0 after the first payment never appears. Add a tie-breaker and use ROWS.', fix: `SELECT invoice_id, transaction_id, transaction_date, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance
FROM transactions WHERE invoice_id = 1;` },
      { wrong: `SELECT invoice_id, transaction_id, amount,
       SUM(amount) OVER (ORDER BY transaction_date, transaction_id) AS balance
FROM transactions WHERE invoice_id IN (1, 6);`, why: 'Without PARTITION BY, invoice 6\'s balance carries over invoice 1\'s entries. Partition by the account.', fix: `SELECT invoice_id, transaction_id, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id) AS balance
FROM transactions WHERE invoice_id IN (1, 6);` },
    ],
    rules: [
      'Running total = SUM() OVER (ORDER BY ...).',
      'PARTITION BY the account so each one starts at 0.',
      'Add a unique tie-breaker and prefer ROWS for ledger-style output.',
      'The final balance of each partition = the plain SUM for that account.',
    ],
    compare: `<table><tr><th>Technique</th><th>Complexity</th><th>Notes</th></tr>
<tr><td>Correlated subquery SUM(... WHERE id &lt;= outer.id)</td><td>O(n²)</td><td>slow on big ledgers</td></tr>
<tr><td>Self-join + GROUP BY</td><td>O(n²)</td><td>verbose</td></tr>
<tr><td>SUM() OVER (ORDER BY ...)</td><td>O(n log n) sort + O(n)</td><td>standard, fast</td></tr></table>`,
    realWorld: 'Patient statements with a running balance column, A/R reconciliation (does the running balance end where the invoice status says?), and year-to-date collections dashboards.',
    tips: ['Check a running total: its last value per partition must equal SUM(amount) GROUP BY that partition.'],
    deep: `<p>Running totals on money should be computed on exact types. SQLite stores REAL as binary floating point, so 0.1 + 0.2 style errors can appear after many rows. Production ledgers typically store integer cents and divide by 100 for display.</p>`,
    tryIt: { prompt: 'Add a column flag that shows \'OVERPAID\' whenever the running balance drops below 0.', starter: `SELECT invoice_id, transaction_id, transaction_date, transaction_type, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance
FROM transactions
WHERE invoice_id IN (1, 6, 24)
ORDER BY invoice_id, transaction_date, transaction_id;` },
    challenge: {
      level: 3,
      prompt: 'Compute the running collected amount for Aetna Care (payor_id 2) payments over time: payment_id, payment_date, amount, running_collected, ordered by payment_date then payment_id (use the same order in the window with a ROWS frame).',
      solution: `SELECT payment_id, payment_date, amount,
       SUM(amount) OVER (ORDER BY payment_date, payment_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_collected
FROM payments
WHERE payor_id = 2
ORDER BY payment_date, payment_id;`,
      hints: ['Filter payments WHERE payor_id = 2.', 'One running total over all of them: no PARTITION BY.', 'SUM(amount) OVER (ORDER BY payment_date, payment_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)', 'Final ORDER BY payment_date, payment_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Invoice 1 ledger: +165, −165, −165, +165. What is the running balance after the third entry?', options: ['0', '−165', '165', '−330'], answer: 1, why: '165 − 165 − 165 = −165 (the duplicate payment overpaid it).' },
      { q: 'Why add transaction_id to the window ORDER BY?', options: ['For speed', 'To break same-date ties so each row gets its own step', 'It is required syntax', 'To partition'], answer: 1, why: 'Otherwise same-date rows are peers and share a total under RANGE.' },
    ],
  },

  // ─────────────────────────────────────────────── 17
  {
    id: 'windows-17',
    goals: [
      'Moving (rolling) averages with ROWS BETWEEN n PRECEDING AND CURRENT ROW',
      'Smoothing noisy monthly figures',
      'Partial windows at the start of the series',
      'Centered vs trailing windows',
    ],
    concept: `<p>A <b>moving average</b> averages the current row with a fixed number of neighboring rows, and the window <b>slides</b> along the series. A 3-month trailing average:</p>
<pre>AVG(collected) OVER (ORDER BY month
                     ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)</pre>
<p>Monthly collections jump around (32 one month, 923 the next). A moving average smooths the noise so trends are visible.</p>
<p>Note: the first rows have fewer than 3 months available, so their "3-month" average uses only 1 or 2 values. Use <code>COUNT(*) OVER (same frame)</code> to detect and hide those partial windows if needed.</p>`,
    why: 'Month-to-month billing data is noisy. Rolling averages show whether collections are really trending up or down.',
    when: 'Use them for trend lines on dashboards, smoothing daily volumes, and comparing the current value with the recent average.',
    analogy: 'Instead of panicking over one slow month, the practice manager looks at the average of the last three months, like a physician trending a patient\'s blood pressure over several readings instead of reacting to one.',
    exampleSql: W_MONTH,
    syntax: `AVG(x) OVER (ORDER BY period
             ROWS BETWEEN n PRECEDING AND CURRENT ROW)       -- trailing
AVG(x) OVER (ORDER BY period
             ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING)       -- centered`,
    sql: `WITH monthly AS (
    SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount) AS collected
    FROM payments
    GROUP BY month
)
SELECT month, collected,
       ROUND(AVG(collected) OVER (ORDER BY month
                                  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg_3,
       COUNT(*) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS months_in_window
FROM monthly
ORDER BY month;`,
    breakdown: [
      ['WITH monthly AS (... GROUP BY month)', 'First aggregate the payments to one row per month (15 months with payments).'],
      ['AVG(collected) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)', 'The average of this month and the 2 rows before it.'],
      ['COUNT(*) OVER (same frame)', 'How many months were actually averaged (1 or 2 at the start).'],
      ['ORDER BY month', 'Chronological output.'],
    ],
    visual: { type: 'window', source: W_MONTH, partition: null, order: 'month', value: 'collected', fn: 'MOVING_AVG' },
    internals: `<p>For a sliding ROWS frame, SQLite adds the entering row and removes the leaving row (the aggregate's inverse step), so each output row costs O(1), not O(frame size).</p>`,
    mistakes: [
      { wrong: `SELECT month, AVG(collected) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS ma3
FROM (SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount) AS collected FROM payments GROUP BY month);`, why: 'This treats "2 PRECEDING" as 2 ROWS, not 2 MONTHS. Months with no payments (2025-06, 2026-04...) are missing rows, so some windows span more than 3 calendar months. Fill the gaps with a calendar (recursive CTE) first if calendar accuracy matters.', fix: `WITH RECURSIVE cal(m) AS (
  SELECT '2025-02' UNION ALL
  SELECT strftime('%Y-%m', date(m || '-01', '+1 month')) FROM cal WHERE m < '2026-08'
), monthly AS (
  SELECT cal.m AS month, COALESCE(SUM(p.amount), 0) AS collected
  FROM cal LEFT JOIN payments p ON strftime('%Y-%m', p.payment_date) = cal.m
  GROUP BY cal.m
)
SELECT month, collected, ROUND(AVG(collected) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS ma3
FROM monthly;` },
    ],
    rules: [
      'Moving average = AVG() OVER (ORDER BY ... ROWS BETWEEN n PRECEDING AND CURRENT ROW).',
      'n PRECEDING + the current row = a window of n + 1 rows.',
      'The first rows use partial windows; check them with COUNT(*) over the same frame.',
      'ROWS counts rows, not time. Fill date gaps first for calendar-true averages.',
    ],
    compare: `<table><tr><th>Frame</th><th>Meaning</th></tr>
<tr><td>ROWS 2 PRECEDING</td><td>trailing 3-row average</td></tr>
<tr><td>ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING</td><td>centered 3-row average</td></tr>
<tr><td>RANGE BETWEEN 30 PRECEDING AND CURRENT ROW (numeric day key)</td><td>last 30 days by value</td></tr></table>`,
    realWorld: 'Rolling 3-month collection rates for executive dashboards, a 7-day moving average of urgent-care visits for staffing, and smoothing denial rates.',
    tips: ['Use NULLIF/CASE to hide the moving average until the window is full: CASE WHEN months_in_window = 3 THEN ... END.'],
    deep: `<p>For time-based windows without gap-filling, use RANGE with a numeric key: <code>AVG(x) OVER (ORDER BY julianday(d) RANGE BETWEEN 29 PRECEDING AND CURRENT ROW)</code> averages the rows within the last 30 days, however many rows that is. SQLite supports numeric RANGE offsets since 3.28.</p>`,
    tryIt: { prompt: 'Change it to a centered 3-month average (1 PRECEDING AND 1 FOLLOWING) and compare.', starter: `WITH monthly AS (
    SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount) AS collected
    FROM payments GROUP BY month
)
SELECT month, collected,
       ROUND(AVG(collected) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg_3
FROM monthly
ORDER BY month;` },
    challenge: {
      level: 3,
      prompt: 'Using invoices, compute monthly billed totals (month as \'YYYY-MM\' from invoice_date, billed = SUM(total_amount)) and a 2-row trailing moving average ma2 (current and previous month row), rounded to 2 decimals. Order by month.',
      solution: `WITH monthly AS (
    SELECT strftime('%Y-%m', invoice_date) AS month, SUM(total_amount) AS billed
    FROM invoices
    GROUP BY month
)
SELECT month, billed,
       ROUND(AVG(billed) OVER (ORDER BY month ROWS BETWEEN 1 PRECEDING AND CURRENT ROW), 2) AS ma2
FROM monthly
ORDER BY month;`,
      hints: ['First aggregate to one row per month in a CTE.', 'strftime(\'%Y-%m\', invoice_date) AS month, SUM(total_amount) AS billed ... GROUP BY month', 'A 2-row trailing window is ROWS BETWEEN 1 PRECEDING AND CURRENT ROW.', 'ROUND(AVG(billed) OVER (ORDER BY month ROWS BETWEEN 1 PRECEDING AND CURRENT ROW), 2) AS ma2 ... ORDER BY month'],
      ordered: true,
    },
    quiz: [
      { q: 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW covers how many rows (once full)?', options: ['2', '3', '4', 'All'], answer: 1, why: '2 preceding + the current row.' },
      { q: 'For the very first month, a 3-month moving average averages...', options: ['3 months', '1 month', 'NULL', 'Error'], answer: 1, why: 'There are no preceding rows yet, so the frame has only the current row.' },
    ],
  },

  // ─────────────────────────────────────────────── 18
  {
    id: 'windows-18',
    goals: [
      'Top-N per group with a ranking function + outer filter',
      'Choosing ROW_NUMBER vs RANK vs DENSE_RANK for top-N with ties',
      'Ranking on aggregated data (rank practitioners within a specialty by revenue)',
      'Combining CTEs and window functions',
    ],
    concept: `<p>"Top N per group" is the most common window-function pattern:</p>
<ol>
<li>In a CTE or subquery, compute a rank <b>within each group</b>: <code>RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC)</code>.</li>
<li>In the outer query, keep <code>rank &lt;= N</code>.</li>
</ol>
<p>The ranking function decides how ties behave:</p>
<ul>
<li><b>ROW_NUMBER</b>: exactly N rows per group; ties are cut arbitrarily (use a tie-breaker).</li>
<li><b>RANK</b>: all rows tied at the cut-off are included, so you may get more than N.</li>
<li><b>DENSE_RANK</b>: the top N distinct values, possibly many rows.</li>
</ul>
<p>Location 5 has three invoices of 110. "Top 3" with RANK returns all five of its invoices (435, 305, 110, 110, 110), while ROW_NUMBER returns exactly three.</p>`,
    why: 'Dashboards and audits constantly ask for "the top 3 per something": largest claims per clinic, busiest practitioners per specialty.',
    when: 'Use it whenever the question contains "per" plus "top/bottom/first/last N".',
    analogy: 'Each clinic sends its three biggest claims to the audit team. If there is a tie for third place, the auditors must decide: take both (RANK) or pick one by claim number (ROW_NUMBER).',
    exampleSql: W_LOC + ` ORDER BY location_id, total_amount DESC`,
    syntax: `WITH ranked AS (
    SELECT t.*, RANK() OVER (PARTITION BY g ORDER BY metric DESC) AS rnk
    FROM t
)
SELECT * FROM ranked WHERE rnk <= N;`,
    sql: `WITH ranked AS (
    SELECT invoice_id, location_id, total_amount,
           ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY total_amount DESC, invoice_id) AS rn,
           RANK()       OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS rnk
    FROM invoices
    WHERE location_id IN (3, 5)
)
SELECT location_id, invoice_id, total_amount, rn, rnk
FROM ranked
WHERE rnk <= 3
ORDER BY location_id, rnk, invoice_id;`,
    breakdown: [
      ['PARTITION BY location_id', 'Separate rankings per location.'],
      ['ROW_NUMBER() ... ORDER BY total_amount DESC, invoice_id', 'Unique positions (1, 2, 3, 4, 5).'],
      ['RANK() ... ORDER BY total_amount DESC', 'Tie-aware positions (location 5: 1, 2, 3, 3, 3).'],
      ['WHERE rnk <= 3', 'Keeps ties at the cut-off, so location 5 returns 5 rows. Try rn <= 3 to get exactly 3.'],
    ],
    visual: { type: 'window', source: W_LOC, partition: 'location_id', order: 'total_amount', value: 'total_amount', fn: 'RANK' },
    internals: `<p>SQLite computes the ranking over all rows (it cannot stop after N per group), then the outer WHERE filters. With an index on (location_id, total_amount), the sort can be avoided, but every row is still read.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, location_id, total_amount
FROM invoices
WHERE RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) <= 3;`, why: 'Window functions are not allowed in WHERE ("misuse of window function RANK()"), because they are computed after WHERE. Rank in a CTE or subquery and filter outside.', fix: `SELECT invoice_id, location_id, total_amount
FROM (SELECT invoice_id, location_id, total_amount,
             RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS rnk
      FROM invoices)
WHERE rnk <= 3;` },
      { wrong: `SELECT location_id, invoice_id, total_amount
FROM invoices
ORDER BY total_amount DESC
LIMIT 3;`, why: 'LIMIT gives the top 3 overall, not per location. Use PARTITION BY.', fix: `SELECT location_id, invoice_id, total_amount
FROM (SELECT location_id, invoice_id, total_amount,
             ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY total_amount DESC, invoice_id) AS rn
      FROM invoices)
WHERE rn <= 3;` },
    ],
    rules: [
      'Rank inside, filter outside (CTE or subquery).',
      'ROW_NUMBER = exactly N; RANK = N plus ties; DENSE_RANK = N distinct values.',
      'LIMIT is global and cannot do per-group top-N.',
      'Rank aggregated data by grouping in a CTE first.',
    ],
    compare: `<table><tr><th>Location 5 amounts</th><th>ROW_NUMBER ≤ 3</th><th>RANK ≤ 3</th><th>DENSE_RANK ≤ 3</th></tr>
<tr><td>435, 305, 110, 110, 110</td><td>435, 305, 110</td><td>435, 305, 110, 110, 110</td><td>435, 305, 110, 110, 110</td></tr></table>`,
    realWorld: 'Top 3 most expensive claims per payor for audit, the highest-revenue practitioner per specialty, and the most frequent CPT codes per clinic.',
    tips: ['Say the tie policy out loud before choosing the function: "exactly N" or "include ties"?'],
    deep: `<p>Ranking aggregated data: <code>WITH rev AS (SELECT practitioner_id, SUM(amount) AS revenue FROM charges GROUP BY practitioner_id) SELECT ..., RANK() OVER (PARTITION BY specialty ORDER BY revenue DESC) FROM rev JOIN practitioners ...</code>. Window functions can also be applied directly over GROUP BY output in the same SELECT: <code>RANK() OVER (ORDER BY SUM(amount) DESC)</code>, because windows run after grouping.</p>`,
    tryIt: { prompt: 'Change the filter to rn <= 3 and count how many rows location 5 returns now.', starter: `WITH ranked AS (
    SELECT invoice_id, location_id, total_amount,
           ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY total_amount DESC, invoice_id) AS rn,
           RANK()       OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS rnk
    FROM invoices
    WHERE location_id IN (3, 5)
)
SELECT * FROM ranked WHERE rnk <= 3
ORDER BY location_id, rnk, invoice_id;` },
    challenge: {
      level: 4,
      prompt: 'For each specialty, find the practitioner(s) with the highest total charged amount (include ties). Show specialty, last_name, revenue. Only practitioners with charges count. Order by specialty, last_name.',
      solution: `WITH rev AS (
    SELECT p.specialty, p.last_name, SUM(c.amount) AS revenue
    FROM charges c
    JOIN practitioners p ON p.practitioner_id = c.practitioner_id
    GROUP BY p.practitioner_id, p.specialty, p.last_name
),
ranked AS (
    SELECT specialty, last_name, revenue,
           RANK() OVER (PARTITION BY specialty ORDER BY revenue DESC) AS rnk
    FROM rev
)
SELECT specialty, last_name, revenue
FROM ranked
WHERE rnk = 1
ORDER BY specialty, last_name;`,
      hints: ['First total the revenue per practitioner (charges JOIN practitioners, GROUP BY practitioner).', 'Then rank within each specialty: RANK() OVER (PARTITION BY specialty ORDER BY revenue DESC).', '"Include ties" means RANK (or DENSE_RANK), not ROW_NUMBER.', 'Filter WHERE rnk = 1 in an outer query, ORDER BY specialty, last_name.'],
      ordered: true,
    },
    quiz: [
      { q: 'You need EXACTLY 2 claims per payor even if amounts tie. Which function?', options: ['RANK', 'DENSE_RANK', 'ROW_NUMBER (with a tie-breaker)', 'NTILE'], answer: 2, why: 'ROW_NUMBER is unique per row.' },
      { q: 'Why can\'t you write WHERE RANK() OVER (...) <= 3?', options: ['RANK needs GROUP BY', 'Window functions are evaluated after WHERE', 'You must use LIMIT', 'It works'], answer: 1, why: 'Compute the rank in a subquery or CTE, then filter.' },
      { q: 'Amounts 435, 305, 110, 110, 110. How many rows have RANK <= 3?', options: ['3', '4', '5', '2'], answer: 2, why: 'All three 110s share rank 3.' },
    ],
  },

  // ─────────────────────────────────────────────── 19
  {
    id: 'windows-19',
    goals: [
      'The exact difference between PARTITION BY and GROUP BY',
      'How they can be combined in one query',
      'Windows over grouped results (rank of each group\'s total)',
      'Choosing the right one for a report',
    ],
    concept: `<p>Both split rows into groups by a key. The difference is what comes out:</p>
<ul>
<li><b>GROUP BY</b>: one output row per group. Detail columns are gone; only keys and aggregates remain.</li>
<li><b>PARTITION BY</b> (inside OVER): every input row stays and gains a value computed over its group.</li>
</ul>
<p>They also run at <b>different stages</b>: GROUP BY happens first, then window functions run on the grouped result. So you can combine them, for example group invoices by location, then use <code>SUM(SUM(total_amount)) OVER ()</code> to get each location's share of the grand total, or <code>RANK() OVER (ORDER BY SUM(total_amount) DESC)</code> to rank the groups.</p>`,
    why: 'Mixing them up leads to either lost detail or duplicated summary rows. Knowing the stage order unlocks powerful one-query reports.',
    when: 'Use GROUP BY for summary rows; PARTITION BY for per-row context; both together for "summary rows + comparison across summaries".',
    analogy: 'GROUP BY is a clinic\'s one-line summary on the regional report. PARTITION BY is writing the clinic total on each invoice in that clinic\'s folder. Combining them is the regional report with each clinic\'s rank and share added.',
    exampleSql: W_LOC + ` ORDER BY location_id, invoice_date`,
    syntax: `-- windows over grouped rows
SELECT key, SUM(x) AS total,
       SUM(SUM(x)) OVER ()                 AS grand_total,
       RANK() OVER (ORDER BY SUM(x) DESC)  AS rnk
FROM t
GROUP BY key;`,
    sql: `SELECT location_id,
       COUNT(*)                                          AS invoices,
       SUM(total_amount)                                 AS billed,
       SUM(SUM(total_amount)) OVER ()                    AS grand_total,
       ROUND(100.0 * SUM(total_amount) / SUM(SUM(total_amount)) OVER (), 1) AS pct_of_total,
       RANK() OVER (ORDER BY SUM(total_amount) DESC)    AS billing_rank
FROM invoices
GROUP BY location_id
ORDER BY billing_rank;`,
    breakdown: [
      ['GROUP BY location_id', 'Stage 1: collapse 48 invoices into 5 location rows.'],
      ['COUNT(*), SUM(total_amount)', 'Normal aggregates per location.'],
      ['SUM(SUM(total_amount)) OVER ()', 'Stage 2: a window over the 5 grouped rows. The inner SUM is the group aggregate; the outer SUM ... OVER () totals across groups.'],
      ['RANK() OVER (ORDER BY SUM(total_amount) DESC)', 'Ranks the locations by their billed totals.'],
    ],
    visual: { type: 'window', source: W_LOC, partition: 'location_id', order: 'invoice_date', value: 'total_amount', fn: 'RUNNING_SUM' },
    internals: `<p>Logical order: FROM → WHERE → GROUP BY → HAVING → <b>window functions</b> → SELECT expressions → DISTINCT → ORDER BY → LIMIT. That is why a window can reference group aggregates (they already exist), but GROUP BY can never reference a window result (it does not exist yet).</p>`,
    mistakes: [
      { wrong: `SELECT location_id, SUM(total_amount) OVER (PARTITION BY location_id) AS billed
FROM invoices;`, why: 'This returns 48 rows (one per invoice) with the location total repeated, not a 5-row summary. If you want one row per location, use GROUP BY (or add DISTINCT).', fix: `SELECT location_id, SUM(total_amount) AS billed
FROM invoices
GROUP BY location_id;` },
      { wrong: `SELECT location_id, ROW_NUMBER() OVER (ORDER BY invoice_date) AS rn, COUNT(*)
FROM invoices
GROUP BY rn;`, why: 'GROUP BY runs before window functions, so it cannot group by a window result. Compute the window in a subquery first.', fix: `SELECT bucket, COUNT(*)
FROM (SELECT NTILE(4) OVER (ORDER BY invoice_date, invoice_id) AS bucket FROM invoices)
GROUP BY bucket;` },
    ],
    rules: [
      'GROUP BY reduces rows; PARTITION BY keeps them.',
      'Windows run after GROUP BY/HAVING, so they can use aggregates.',
      'GROUP BY cannot reference window results unless you use a subquery.',
      'SUM(SUM(x)) OVER () = the grand total across groups.',
    ],
    compare: `<table><tr><th></th><th>GROUP BY</th><th>PARTITION BY</th></tr>
<tr><td>Output rows</td><td>1 per group</td><td>same as input</td></tr>
<tr><td>Detail columns</td><td>only group keys</td><td>all columns</td></tr>
<tr><td>Stage</td><td>before windows</td><td>after GROUP BY/HAVING</td></tr>
<tr><td>Can reference the other?</td><td>no</td><td>yes (aggregates)</td></tr>
<tr><td>Multiple per query</td><td>one grouping</td><td>many different partitions</td></tr></table>`,
    realWorld: 'Executive summaries with "share of total" and "rank" columns (clinics, payors, CPT codes) are one GROUP BY plus windows.',
    tips: ['Nested aggregate-in-window (SUM(SUM(x)) OVER ()) looks odd but is standard SQL and works everywhere.'],
    deep: `<p>Because windows run after HAVING, <code>HAVING</code> cannot filter on a window either. For "groups whose share is over 20%", put the grouped + windowed query in a CTE and filter in the outer query.</p>`,
    tryIt: { prompt: 'Group by payor_id instead and show each payor\'s share of billed amount and rank.', starter: `SELECT location_id,
       SUM(total_amount) AS billed,
       ROUND(100.0 * SUM(total_amount) / SUM(SUM(total_amount)) OVER (), 1) AS pct_of_total
FROM invoices
GROUP BY location_id
ORDER BY billed DESC;` },
    challenge: {
      level: 3,
      prompt: 'Per invoice status, show status, invoice count (invoices), billed total (billed), and each status\'s share of all invoices by count (pct_count, rounded to 1). Use GROUP BY plus a window over the groups. Order by invoices descending, then status.',
      solution: `SELECT status,
       COUNT(*) AS invoices,
       SUM(total_amount) AS billed,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct_count
FROM invoices
GROUP BY status
ORDER BY invoices DESC, status;`,
      hints: ['GROUP BY status for one row per status.', 'The total count across groups is SUM(COUNT(*)) OVER ().', 'ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct_count', 'ORDER BY invoices DESC, status.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which runs first logically?', options: ['Window functions', 'GROUP BY', 'They run together', 'ORDER BY'], answer: 1, why: 'GROUP BY/HAVING happen before windows are computed.' },
      { q: 'SUM(total_amount) OVER (PARTITION BY location_id) on 48 invoices returns...', options: ['5 rows', '48 rows', '1 row', 'An error'], answer: 1, why: 'PARTITION BY keeps every row.' },
    ],
  },

  // ─────────────────────────────────────────────── 20
  {
    id: 'windows-20',
    goals: [
      'What a window frame is: the subset of the partition a row\'s function sees',
      'Frame syntax: ROWS/RANGE/GROUPS BETWEEN start AND end',
      'UNBOUNDED PRECEDING, n PRECEDING, CURRENT ROW, n FOLLOWING, UNBOUNDED FOLLOWING',
      'The default frames and which functions use frames',
    ],
    concept: `<p>Inside each partition, every row can look at a <b>frame</b>: a sliding sub-range of rows around it. Aggregate windows (SUM, AVG...) and value functions (FIRST_VALUE, LAST_VALUE, NTH_VALUE) calculate over the <b>frame</b>, not the whole partition.</p>
${FRAME_SVG}
<p>Syntax: <code>{ROWS | RANGE | GROUPS} BETWEEN &lt;start&gt; AND &lt;end&gt;</code>, where each bound is one of <code>UNBOUNDED PRECEDING</code>, <code>n PRECEDING</code>, <code>CURRENT ROW</code>, <code>n FOLLOWING</code>, <code>UNBOUNDED FOLLOWING</code>.</p>
<p><b>Defaults:</b> no ORDER BY → the whole partition. With ORDER BY → <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code> (running, including ties). Ranking functions and LAG/LEAD <b>ignore</b> frames.</p>`,
    why: 'Frames are what make running totals, moving averages, "rest of the partition" and a correct LAST_VALUE possible.',
    when: 'Specify a frame whenever you need something other than "whole partition" or "running": moving windows, look-ahead sums, full-partition LAST_VALUE.',
    analogy: 'A reviewer auditing a stack of claims slides a paper mask over the stack that shows only the current claim and the two before it. The mask is the frame; the whole stack for that clinic is the partition.',
    exampleSql: W_TXN + ` ORDER BY invoice_id, transaction_id`,
    syntax: `fn(x) OVER (
    PARTITION BY g ORDER BY d
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)

-- shorthand: ROWS UNBOUNDED PRECEDING  =  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`,
    sql: `SELECT invoice_id, transaction_id, transaction_type, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)        AS running_balance,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_id
                         ROWS BETWEEN 1 PRECEDING AND CURRENT ROW)                AS last_two,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_id
                         ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING)        AS still_to_come,
       SUM(amount) OVER (PARTITION BY invoice_id)                                 AS final_balance
FROM transactions
WHERE invoice_id IN (1, 6, 24)
ORDER BY invoice_id, transaction_id;`,
    breakdown: [
      ['ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'From the first row to this one: the running balance.'],
      ['ROWS BETWEEN 1 PRECEDING AND CURRENT ROW', 'This row and the one before it: a 2-row sliding sum.'],
      ['ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING', 'Everything AFTER this row (NULL on the last row, whose frame is empty).'],
      ['SUM(amount) OVER (PARTITION BY invoice_id)', 'No ORDER BY: the whole partition, the final balance.'],
    ],
    visual: { type: 'window', source: W_TXN, partition: 'invoice_id', order: 'transaction_id', value: 'amount', fn: 'MOVING_AVG' },
    internals: `<p>SQLite evaluates frames with a "sliding" implementation: it maintains the aggregate as rows enter (xStep) and leave (xInverse) the frame. An empty frame gives NULL for SUM/AVG and 0 for COUNT. Frames that end at UNBOUNDED FOLLOWING require buffering the whole partition.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, transaction_id,
       SUM(amount) OVER (PARTITION BY invoice_id ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) AS last_two
FROM transactions;`, why: '"1 PRECEDING" is meaningless without an order. The frame exists, but which row is "preceding" is arbitrary. Always pair row-offset frames with ORDER BY.', fix: `SELECT invoice_id, transaction_id,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id
                         ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) AS last_two
FROM transactions;` },
      { wrong: `SELECT invoice_id, ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY transaction_id
                                         ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) AS rn
FROM transactions;`, why: 'Ranking functions ignore frames (some engines reject a frame on them). The frame here does nothing, so remove it to avoid confusion.', fix: `SELECT invoice_id, ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY transaction_id) AS rn
FROM transactions;` },
    ],
    rules: [
      'Partition = the group; frame = the slice of the group a row sees.',
      'With ORDER BY, the default frame is RANGE UNBOUNDED PRECEDING to CURRENT ROW.',
      'Frames affect aggregates and FIRST/LAST/NTH_VALUE only.',
      'The start bound must not come after the end bound.',
    ],
    compare: `<table><tr><th>Frame</th><th>Typical use</th></tr>
<tr><td>UNBOUNDED PRECEDING → CURRENT ROW</td><td>running total</td></tr>
<tr><td>n PRECEDING → CURRENT ROW</td><td>moving average</td></tr>
<tr><td>n PRECEDING → n FOLLOWING</td><td>centered smoothing</td></tr>
<tr><td>CURRENT ROW → UNBOUNDED FOLLOWING</td><td>remaining total</td></tr>
<tr><td>UNBOUNDED PRECEDING → UNBOUNDED FOLLOWING</td><td>whole partition (LAST_VALUE fix)</td></tr></table>`,
    realWorld: 'Rolling 90-day collections, "remaining scheduled payments" on payment plans, and smoothing daily visit counts all rely on explicit frames.',
    tips: ['Hover rows in the visual: the highlighted rows are the frame for that row.'],
    deep: `<p>SQLite also supports <b>GROUPS</b> frames (count peer groups instead of rows) and the <b>EXCLUDE</b> clause: <code>EXCLUDE CURRENT ROW</code>, <code>EXCLUDE GROUP</code>, <code>EXCLUDE TIES</code>, <code>EXCLUDE NO OTHERS</code>. For example, <code>AVG(total_amount) OVER (PARTITION BY location_id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING EXCLUDE CURRENT ROW)</code> gives each invoice the average of the <i>other</i> invoices at its location, which is handy for leave-one-out comparisons.</p>`,
    tryIt: { prompt: 'Add a column with the average of the OTHER transactions on the same invoice using EXCLUDE CURRENT ROW.', starter: `SELECT invoice_id, transaction_id, amount,
       AVG(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS avg_all
FROM transactions
WHERE invoice_id IN (1, 6, 24)
ORDER BY invoice_id, transaction_id;` },
    challenge: {
      level: 3,
      prompt: 'For invoice 24\'s transactions (ordered by transaction_date, transaction_id), show transaction_id, amount, and remaining = the sum of amount from the current row to the END of the invoice. Order by transaction_date, transaction_id.',
      solution: `SELECT transaction_id, amount,
       SUM(amount) OVER (ORDER BY transaction_date, transaction_id
                         ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) AS remaining
FROM transactions
WHERE invoice_id = 24
ORDER BY transaction_date, transaction_id;`,
      hints: ['Filter to invoice 24; order by transaction_date, transaction_id.', 'You need rows from here to the end: a forward-looking frame.', 'ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING', 'SUM(amount) OVER (ORDER BY transaction_date, transaction_id ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) AS remaining'],
      ordered: true,
    },
    quiz: [
      { q: 'What is the default frame when OVER() has ORDER BY but no frame clause?', options: ['The whole partition', 'ROWS BETWEEN 1 PRECEDING AND CURRENT ROW', 'RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'CURRENT ROW only'], answer: 2, why: 'That default is what makes ORDER BY produce running totals and causes the LAST_VALUE gotcha.' },
      { q: 'Which function IGNORES the frame clause?', options: ['SUM', 'LAST_VALUE', 'ROW_NUMBER', 'AVG'], answer: 2, why: 'Ranking functions and LAG/LEAD work on the partition order, not frames.' },
    ],
  },

  // ─────────────────────────────────────────────── 21
  {
    id: 'windows-21',
    goals: [
      'ROWS counts physical rows; RANGE uses the ORDER BY value (peers together)',
      'Why the default RANGE frame gives tied rows the same running total',
      'Value-based ranges: RANGE BETWEEN n PRECEDING (e.g. last 7 days)',
      'GROUPS frames as a middle ground',
    ],
    concept: `<p>Frames can be measured in three units:</p>
<ul>
<li><b>ROWS</b>: physical rows. "1 PRECEDING" = exactly the previous row.</li>
<li><b>RANGE</b>: <b>values</b> of the ORDER BY column. All rows with the same value (<b>peers</b>) are always in or out together. "7 PRECEDING" = rows whose value is within 7 of the current value.</li>
<li><b>GROUPS</b>: groups of peers. "1 PRECEDING" = the previous distinct value's group.</li>
</ul>
<p>This matters most with <b>ties</b>. Invoice 4 has two charges on 2025-08-21. With the default <code>RANGE ... CURRENT ROW</code>, <b>both</b> tied rows see each other, so both show the running total 250. With <code>ROWS</code>, the first shows 150 and the second 250.</p>
${ROWS_RANGE_SVG}`,
    why: 'Running totals with duplicate dates are extremely common in billing. Knowing ROWS vs RANGE explains "why do two rows show the same balance?".',
    when: 'Use ROWS for row-by-row sequences (ledgers, fixed-size moving windows). Use RANGE for value-based windows (last 30 days) or when ties should be treated as one step.',
    analogy: 'ROWS is counting individual receipts in the drawer. RANGE is counting by day: all receipts from the same day go in together, so each receipt from that day shows the day-end total.',
    exampleSql: W_CHG + ` ORDER BY invoice_id, service_date, charge_id`,
    syntax: `SUM(x) OVER (ORDER BY d ROWS  BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
SUM(x) OVER (ORDER BY d RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)   -- default
SUM(x) OVER (ORDER BY julianday(d) RANGE BETWEEN 6 PRECEDING AND CURRENT ROW) -- last 7 days`,
    sql: `SELECT invoice_id, charge_id, service_date, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY service_date
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)  AS rows_total,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY service_date
                         RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS range_total,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY julianday(service_date)
                         RANGE BETWEEN 1 PRECEDING AND CURRENT ROW)         AS two_day_total
FROM charges
WHERE invoice_id IN (4, 27, 40)
ORDER BY invoice_id, service_date, charge_id;`,
    breakdown: [
      ['ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'Counts rows: tied dates get different running totals (the order among peers is arbitrary).'],
      ['RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'The default: all rows with the same service_date are included together, so peers share the total.'],
      ['ORDER BY julianday(service_date) RANGE BETWEEN 1 PRECEDING AND CURRENT ROW', 'Value-based: the charges from the same day or the previous day (a numeric ORDER BY key is required for offsets).'],
    ],
    visual: { type: 'window', source: W_CHG, partition: 'invoice_id', order: 'service_date', value: 'amount', fn: 'RUNNING_SUM' },
    internals: `<p>For RANGE, SQLite locates frame boundaries by comparing ORDER BY values, not by counting rows. RANGE with a numeric offset (n PRECEDING/FOLLOWING) requires exactly one ORDER BY expression of numeric type. Dates stored as text must be converted, e.g. with <code>julianday()</code>.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, charge_id, service_date, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY service_date) AS running
FROM charges WHERE invoice_id = 4;`, why: 'The default is RANGE, so the two 2025-08-21 charges both show 250, and the running total seems to skip 150. For a line-by-line running total, use ROWS with a unique tie-breaker.', fix: `SELECT invoice_id, charge_id, service_date, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY service_date, charge_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running
FROM charges WHERE invoice_id = 4;` },
      { wrong: `SELECT charge_id, service_date,
       SUM(amount) OVER (ORDER BY service_date RANGE BETWEEN 7 PRECEDING AND CURRENT ROW) AS week_total
FROM charges;`, why: 'RANGE with a numeric offset needs a numeric ORDER BY key. service_date is TEXT, so SQLite raises an error. Order by julianday(service_date).', fix: `SELECT charge_id, service_date,
       SUM(amount) OVER (ORDER BY julianday(service_date) RANGE BETWEEN 6 PRECEDING AND CURRENT ROW) AS week_total
FROM charges;` },
    ],
    rules: [
      'ROWS = physical rows; RANGE = ORDER BY values; GROUPS = peer groups.',
      'The default with ORDER BY is RANGE, so ties move together.',
      'For ledgers and exact per-row running totals, use ROWS + a tie-breaker.',
      'RANGE with n PRECEDING needs a single numeric ORDER BY key.',
    ],
    compare: `<table><tr><th>Frame unit</th><th>"1 PRECEDING" means</th><th>Ties</th><th>Good for</th></tr>
<tr><td>ROWS</td><td>the previous row</td><td>split arbitrarily</td><td>ledgers, fixed N-row windows</td></tr>
<tr><td>RANGE</td><td>values ≥ current − 1</td><td>always together</td><td>time windows, day-level totals</td></tr>
<tr><td>GROUPS</td><td>the previous distinct value group</td><td>together</td><td>"last 3 distinct dates"</td></tr></table>`,
    realWorld: 'Daily-closing balances (RANGE: one balance per day), 30-day rolling charges per patient (RANGE on julianday), and line-by-line statements (ROWS).',
    tips: ['If two rows with the same date show the same running total, you are looking at RANGE.'],
    deep: `<p>Performance: ROWS frames are cheaper because boundaries are simple counts. RANGE requires peer detection, and value offsets require comparing keys. Many engines (older SQL Server versions, for example) only support UNBOUNDED/CURRENT ROW for RANGE. SQLite, PostgreSQL 11+ and Oracle support numeric and interval offsets.</p>`,
    tryIt: { prompt: 'Replace RANGE with GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW and interpret the result (this date + the previous distinct date).', starter: `SELECT invoice_id, charge_id, service_date, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY service_date
                         GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW) AS this_and_prev_date
FROM charges
WHERE invoice_id IN (4, 27, 40)
ORDER BY invoice_id, service_date, charge_id;` },
    challenge: {
      level: 4,
      prompt: 'For every charge of invoice 27, show charge_id, service_date, amount and day_total: the total of ALL charges on that invoice up to and including the charge\'s service_date (same-day charges share the value). Order by service_date, charge_id.',
      solution: `SELECT charge_id, service_date, amount,
       SUM(amount) OVER (ORDER BY service_date
                         RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS day_total
FROM charges
WHERE invoice_id = 27
ORDER BY service_date, charge_id;`,
      hints: ['Same-day charges should share the running value, so treat ties as peers.', 'That is exactly what RANGE does (and it is also the default).', 'SUM(amount) OVER (ORDER BY service_date RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)', 'Do NOT add charge_id inside OVER (that would break the peer groups). Put it only in the final ORDER BY.'],
      ordered: true,
    },
    quiz: [
      { q: 'Two rows share the same ORDER BY value. With RANGE UNBOUNDED PRECEDING → CURRENT ROW, their running totals are...', options: ['Different', 'The same', 'NULL', 'Random'], answer: 1, why: 'Peers are always included together under RANGE.' },
      { q: 'You want a running balance that changes on every ledger line, even for same-day entries. Use...', options: ['RANGE', 'ROWS with a tie-breaker in ORDER BY', 'GROUPS', 'No frame'], answer: 1, why: 'ROWS steps one physical row at a time.' },
    ],
  },

  // ─────────────────────────────────────────────── 22
  {
    id: 'windows-22',
    goals: [
      'Period-over-period change with LAG (month-over-month growth)',
      'Share of total and cumulative share (Pareto / 80-20)',
      'Combining several windows in layered CTEs',
      'Percentiles with PERCENT_RANK and CUME_DIST',
    ],
    concept: `<p>Real analytics questions combine several window functions, often on top of aggregated data:</p>
<ul>
<li><b>Growth</b>: <code>collected - LAG(collected) OVER (ORDER BY month)</code> and the % change.</li>
<li><b>Share</b>: <code>collected / SUM(collected) OVER ()</code>.</li>
<li><b>Cumulative share</b>: <code>SUM(collected) OVER (ORDER BY collected DESC) / SUM(collected) OVER ()</code>. Which few months (or payors, or CPT codes) make up 80% of the money?</li>
<li><b>Percentile</b>: <code>PERCENT_RANK()</code> and <code>CUME_DIST()</code> place each row on a 0-1 scale.</li>
</ul>
<p>The recipe is the same each time: aggregate to the right grain in a CTE, then layer windows on top.</p>`,
    why: 'Month-over-month growth, revenue concentration and percentiles are the bread and butter of healthcare revenue-cycle analytics.',
    when: 'Use these patterns for KPI dashboards, variance reports, Pareto analysis and outlier detection.',
    analogy: 'The CFO\'s monthly packet: this month vs last month, each month\'s share of the year, and how quickly the top months add up to most of the revenue.',
    exampleSql: W_MONTH,
    syntax: `WITH m AS (SELECT period, SUM(x) AS v FROM t GROUP BY period)
SELECT period, v,
       v - LAG(v) OVER (ORDER BY period)                    AS change,
       v * 1.0 / SUM(v) OVER ()                             AS share,
       SUM(v) OVER (ORDER BY v DESC ROWS UNBOUNDED PRECEDING) * 1.0 / SUM(v) OVER () AS cum_share
FROM m;`,
    sql: `WITH monthly AS (
    SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount) AS collected
    FROM payments
    GROUP BY month
)
SELECT month, collected,
       collected - LAG(collected) OVER (ORDER BY month)                        AS change,
       ROUND(100.0 * (collected - LAG(collected) OVER (ORDER BY month))
             / LAG(collected) OVER (ORDER BY month), 1)                        AS pct_change,
       ROUND(100.0 * collected / SUM(collected) OVER (), 1)                    AS pct_of_total,
       ROUND(PERCENT_RANK() OVER (ORDER BY collected), 2)                      AS pct_rank
FROM monthly
ORDER BY month;`,
    breakdown: [
      ['WITH monthly AS (...)', 'Aggregate to the analysis grain: one row per month.'],
      ['collected - LAG(collected) OVER (ORDER BY month)', 'Month-over-month change (NULL for the first month).'],
      ['100.0 * (...) / LAG(collected) OVER (...)', 'Percentage growth versus the previous month.'],
      ['100.0 * collected / SUM(collected) OVER ()', 'The month\'s share of all collections.'],
      ['PERCENT_RANK() OVER (ORDER BY collected)', '0 = the lowest month, 1 = the highest month.'],
    ],
    visual: { type: 'window', source: W_MONTH, partition: null, order: 'month', value: 'collected', fn: 'LAG' },
    internals: `<p>This query uses two different window orderings (by month and by collected). SQLite groups window functions that share the same PARTITION BY/ORDER BY and sorts once per distinct window definition, so the rows are sorted twice here. That is fine for 15 rows, and worth knowing for millions.</p>`,
    mistakes: [
      { wrong: `SELECT month, collected,
       100 * (collected - LAG(collected) OVER (ORDER BY month)) / LAG(collected) OVER (ORDER BY month) AS pct_change
FROM (SELECT strftime('%Y-%m', payment_date) AS month, CAST(SUM(amount) AS INTEGER) AS collected
      FROM payments GROUP BY month);`, why: 'With integer columns, 100 * a / b is integer division, so growth of 33.3% shows as 33 and small changes show as 0. Use 100.0 to force real arithmetic.', fix: `SELECT month, collected,
       ROUND(100.0 * (collected - LAG(collected) OVER (ORDER BY month)) / LAG(collected) OVER (ORDER BY month), 1) AS pct_change
FROM (SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount) AS collected
      FROM payments GROUP BY month);` },
    ],
    rules: [
      'Aggregate to the right grain first, then apply windows.',
      'Use 100.0 (a real) for percentages.',
      'LAG-based growth is NULL for the first period; decide how to display it.',
      'Cumulative share = running sum ordered by value DESC ÷ the total.',
    ],
    compare: `<table><tr><th>Metric</th><th>Window expression</th></tr>
<tr><td>MoM change</td><td>v - LAG(v) OVER (ORDER BY period)</td></tr>
<tr><td>Share of total</td><td>v / SUM(v) OVER ()</td></tr>
<tr><td>Cumulative share (Pareto)</td><td>SUM(v) OVER (ORDER BY v DESC ROWS UNBOUNDED PRECEDING) / SUM(v) OVER ()</td></tr>
<tr><td>Percentile</td><td>PERCENT_RANK() / CUME_DIST() OVER (ORDER BY v)</td></tr>
<tr><td>Year-over-year</td><td>LAG(v, 12) OVER (ORDER BY month) on a gap-free monthly series</td></tr></table>`,
    realWorld: 'Revenue-cycle KPI packs (collections MoM), payer concentration ("3 payors = 80% of revenue"), and flagging practitioners in the top 5% of charges for compliance review.',
    tips: ['Build these reports as CTE layers: grain → windows → final formatting.'],
    deep: `<p>For year-over-year comparisons, LAG(v, 12) is only correct on a <b>gap-free</b> monthly series. Generate the calendar with a recursive CTE and LEFT JOIN the data, or else a missing month shifts every comparison. Alternatively, self-join on <code>month = date(prev_month, '+12 months')</code>.</p>`,
    tryIt: { prompt: 'Add cum_share: the running share of total when months are sorted by collected DESC (Pareto).', starter: `WITH monthly AS (
    SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount) AS collected
    FROM payments GROUP BY month
)
SELECT month, collected,
       ROUND(100.0 * collected / SUM(collected) OVER (), 1) AS pct_of_total
FROM monthly
ORDER BY collected DESC;` },
    challenge: {
      level: 4,
      prompt: 'Pareto by payor: using payments with a non-NULL payor_id, compute each payor\'s total paid (paid), its share of all payor payments (pct, rounded to 1) and the cumulative share when payors are sorted by paid descending (cum_pct, rounded to 1; tie-break by payor_id). Show payor_id, paid, pct, cum_pct. Order by paid descending, payor_id.',
      solution: `WITH by_payor AS (
    SELECT payor_id, SUM(amount) AS paid
    FROM payments
    WHERE payor_id IS NOT NULL
    GROUP BY payor_id
)
SELECT payor_id, paid,
       ROUND(100.0 * paid / SUM(paid) OVER (), 1) AS pct,
       ROUND(100.0 * SUM(paid) OVER (ORDER BY paid DESC, payor_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
             / SUM(paid) OVER (), 1) AS cum_pct
FROM by_payor
ORDER BY paid DESC, payor_id;`,
      hints: ['CTE: total paid per payor_id, excluding NULL payor_id.', 'Share: 100.0 * paid / SUM(paid) OVER ().', 'Cumulative: SUM(paid) OVER (ORDER BY paid DESC, payor_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) divided by the total.', 'Round both to 1 decimal and ORDER BY paid DESC, payor_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What does PERCENT_RANK() return for the lowest value?', options: ['1', '0', '0.5', 'NULL'], answer: 1, why: '(rank − 1) / (n − 1) = 0 for rank 1.' },
      { q: 'Why aggregate by month in a CTE before using LAG?', options: ['LAG cannot read dates', 'So each row is one month and LAG compares consecutive months', 'For speed only', 'It is required syntax'], answer: 1, why: 'LAG compares rows, so rows must be at the grain you want to compare.' },
    ],
  },

  // ─────────────────────────────────────────────── 23
  {
    id: 'windows-23',
    goals: [
      'De-duplication with ROW_NUMBER (keep one of each duplicate set)',
      'Detecting duplicate payments with COUNT(*) OVER (PARTITION BY ...)',
      'Gaps-and-islands: grouping consecutive events',
      'Latest-status-per-entity reports',
    ],
    concept: `<p>A handful of window patterns solve many everyday data problems:</p>
<ul>
<li><b>Duplicates</b>: <code>COUNT(*) OVER (PARTITION BY invoice_id, payment_date, amount)</code> &gt; 1 flags duplicate payments. Invoice 1 has two identical $165 cash payments on the same day.</li>
<li><b>De-duplication</b>: <code>ROW_NUMBER() OVER (PARTITION BY first_name, last_name, date_of_birth ORDER BY patient_id)</code>. Keep rn = 1; rn &gt; 1 rows are duplicates (patient 25 duplicates patient 1).</li>
<li><b>Latest per entity</b>: ROW_NUMBER ... ORDER BY date DESC, keep 1.</li>
<li><b>Gaps and islands</b>: <code>ROW_NUMBER() OVER (ORDER BY d) - ROW_NUMBER() OVER (PARTITION BY status ORDER BY d)</code> is constant within a run of consecutive rows with the same status, so you can group runs.</li>
</ul>`,
    why: 'Billing data is messy: duplicate postings, duplicate patient registrations, status histories. These patterns clean and summarize it without procedural code.',
    when: 'Use them in data-quality checks, patient-matching (MPI) clean-up, remittance reconciliation and status-history reporting.',
    analogy: 'A billing supervisor scanning the payment log with a highlighter: "these two lines are the same payment posted twice". The window function does the highlighting for every row at once.',
    exampleSql: W_PAY + ` ORDER BY invoice_id, payment_date, payment_id`,
    syntax: `-- flag duplicates
COUNT(*) OVER (PARTITION BY k1, k2, k3) AS copies
-- keep one per duplicate set
ROW_NUMBER() OVER (PARTITION BY k1, k2, k3 ORDER BY id) AS rn   -- keep rn = 1`,
    sql: `SELECT invoice_id, payment_id, payment_date, amount,
       COUNT(*) OVER (PARTITION BY invoice_id, payment_date, amount) AS copies,
       ROW_NUMBER() OVER (PARTITION BY invoice_id, payment_date, amount ORDER BY payment_id) AS copy_no,
       ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY payment_date DESC, payment_id DESC) AS recency
FROM payments
WHERE invoice_id IN (1, 2, 7, 14, 16, 19, 20)
ORDER BY invoice_id, payment_date, payment_id;`,
    breakdown: [
      ['COUNT(*) OVER (PARTITION BY invoice_id, payment_date, amount)', 'How many payments look identical to this one. 2 for invoice 1\'s duplicate.'],
      ['ROW_NUMBER() ... ORDER BY payment_id', 'Numbers the copies: the original gets 1, the duplicate (payment 47) gets 2.'],
      ['ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY payment_date DESC, payment_id DESC)', 'Recency: 1 = the latest payment on each invoice.'],
    ],
    visual: { type: 'window', source: W_PAY, partition: 'invoice_id', order: 'payment_date', value: 'amount', fn: 'ROW_NUMBER' },
    internals: `<p>This query uses two different partitionings, so SQLite sorts the rows twice. For a large table, an index matching one of the window orders (e.g. payments(invoice_id, payment_date)) removes one of the sorts.</p>`,
    mistakes: [
      { wrong: `DELETE FROM patients
WHERE ROW_NUMBER() OVER (PARTITION BY first_name, last_name, date_of_birth ORDER BY patient_id) > 1;`, why: 'Window functions are not allowed in WHERE (of DELETE either). Compute the row numbers in a subquery and delete by key.', fix: `SELECT patient_id FROM (
  SELECT patient_id,
         ROW_NUMBER() OVER (PARTITION BY first_name, last_name, date_of_birth ORDER BY patient_id) AS rn
  FROM patients)
WHERE rn > 1;` },
    ],
    rules: [
      'COUNT(*) OVER (PARTITION BY keys) > 1 marks duplicates.',
      'ROW_NUMBER over the duplicate keys, then keep rn = 1, de-duplicates.',
      'Choose the ORDER BY carefully: it decides which copy survives.',
      'For deletes, select the ids in a subquery, then DELETE ... WHERE id IN (...).',
    ],
    compare: `<table><tr><th>Task</th><th>Window pattern</th><th>Non-window alternative</th></tr>
<tr><td>Find duplicates</td><td>COUNT(*) OVER (PARTITION BY keys)</td><td>GROUP BY keys HAVING COUNT(*) &gt; 1 + join back</td></tr>
<tr><td>Keep one copy</td><td>ROW_NUMBER = 1</td><td>MIN(id) GROUP BY keys</td></tr>
<tr><td>Latest per entity</td><td>ROW_NUMBER DESC = 1</td><td>correlated MAX subquery</td></tr>
<tr><td>Runs of equal status</td><td>difference of two ROW_NUMBERs</td><td>procedural loop</td></tr></table>`,
    realWorld: 'Duplicate remittance detection before posting, master-patient-index clean-up, "current coverage per patient" and summarizing streaks of overdue months per account.',
    tips: ['Always SELECT the rows you plan to delete first. Review them, then delete by id.'],
    deep: `<p><b>Gaps and islands</b>: for rows ordered by date, <code>ROW_NUMBER() OVER (ORDER BY d) - ROW_NUMBER() OVER (PARTITION BY status ORDER BY d)</code> stays constant across a consecutive run of the same status and changes when the run is broken. <code>GROUP BY status, that_difference</code> then gives one row per run with MIN(d) and MAX(d). The same trick with <code>julianday(d) - ROW_NUMBER()</code> finds runs of consecutive days.</p>`,
    tryIt: { prompt: 'Find duplicate patients: number patients within (first_name, last_name, date_of_birth) and show only rows with rn > 1.', starter: `SELECT * FROM (
  SELECT patient_id, first_name, last_name, date_of_birth,
         ROW_NUMBER() OVER (PARTITION BY first_name, last_name, date_of_birth ORDER BY patient_id) AS rn
  FROM patients)
ORDER BY rn DESC, patient_id;` },
    challenge: {
      level: 3,
      prompt: 'List every payment that is a duplicate copy (same invoice_id, payment_date, amount and method as an earlier payment with a lower payment_id). Show payment_id, invoice_id, payment_date, amount, method. Order by payment_id.',
      solution: `SELECT payment_id, invoice_id, payment_date, amount, method
FROM (
    SELECT payment_id, invoice_id, payment_date, amount, method,
           ROW_NUMBER() OVER (PARTITION BY invoice_id, payment_date, amount, method
                              ORDER BY payment_id) AS copy_no
    FROM payments
)
WHERE copy_no > 1
ORDER BY payment_id;`,
      hints: ['Partition by everything that defines "the same payment": invoice_id, payment_date, amount, method.', 'ROW_NUMBER() ... ORDER BY payment_id numbers the copies; the original is 1.', 'Wrap it in a subquery and keep copy_no > 1.', 'ORDER BY payment_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which ROW_NUMBER value marks the copy you KEEP when de-duplicating?', options: ['0', '1', 'The highest', '2'], answer: 1, why: 'Keep rn = 1 (the first by your chosen ORDER BY); rn > 1 are duplicates.' },
      { q: 'COUNT(*) OVER (PARTITION BY invoice_id, payment_date, amount) = 2 means...', options: ['The invoice has 2 payments', 'Two payments share those exact values', 'Two invoices exist', 'The payment is split'], answer: 1, why: 'The partition is defined by all three keys together.' },
    ],
  },

  // ─────────────────────────────────────────────── 24
  {
    id: 'windows-24',
    goals: [
      'What makes window queries expensive: sorts and partition buffering',
      'Sharing window definitions (named WINDOW clause) to reduce sorts',
      'Supporting indexes that match PARTITION BY + ORDER BY',
      'Filtering early, and cheaper frame choices',
    ],
    concept: `<p>Most window-function cost comes from <b>sorting</b>. Each distinct <code>(PARTITION BY, ORDER BY)</code> combination needs the rows in that order. Tips:</p>
<ul>
<li><b>Reuse one window definition</b>: functions with identical OVER clauses share one sort. The <code>WINDOW w AS (...)</code> clause makes this explicit and readable.</li>
<li><b>Index for the window</b>: an index on <code>(partition_cols, order_cols)</code> can deliver rows already sorted, so no sort step is needed.</li>
<li><b>Filter early</b>: WHERE runs before windows, so fewer rows means a smaller sort. But only filter early when it doesn't change the meaning (a filter on the window result must go outside).</li>
<li><b>Frames</b>: ROWS frames are cheaper than RANGE; UNBOUNDED FOLLOWING forces buffering whole partitions.</li>
</ul>`,
    why: 'Window queries on millions of claims can be slow. Knowing where the time goes (sorts) tells you how to fix them.',
    when: 'Think about this whenever a window query is slow, or when a query uses several different OVER clauses on a big table.',
    analogy: 'Sorting a stack of claims by clinic and date once, and then doing all your tallies in that single pass, instead of re-sorting the stack for each tally.',
    exampleSql: W_PAY + ` ORDER BY invoice_id, payment_date`,
    syntax: `SELECT ...,
       f1() OVER w, f2() OVER w, f3() OVER (w ROWS BETWEEN 1 PRECEDING AND CURRENT ROW)
FROM t
WHERE ...                      -- filter early
WINDOW w AS (PARTITION BY g ORDER BY d);
-- supporting index: CREATE INDEX ix ON t(g, d);`,
    sql: `SELECT invoice_id, payment_id, payment_date, amount,
       ROW_NUMBER() OVER w                                    AS payment_no,
       SUM(amount)  OVER (w ROWS UNBOUNDED PRECEDING)          AS paid_so_far,
       LAG(payment_date) OVER w                               AS prev_payment,
       COUNT(*)     OVER (PARTITION BY invoice_id)            AS payments_on_invoice
FROM payments
WHERE invoice_id IN (1, 2, 7, 14, 16, 19, 20)
WINDOW w AS (PARTITION BY invoice_id ORDER BY payment_date, payment_id)
ORDER BY invoice_id, payment_date, payment_id;`,
    breakdown: [
      ['WINDOW w AS (PARTITION BY invoice_id ORDER BY payment_date, payment_id)', 'One named window definition, one sort.'],
      ['ROW_NUMBER() OVER w, LAG(...) OVER w', 'Both reuse w, so they share the sort.'],
      ['SUM(amount) OVER (w ROWS UNBOUNDED PRECEDING)', 'Extends w with a frame; still the same partition and order, so still the same sort.'],
      ['COUNT(*) OVER (PARTITION BY invoice_id)', 'Same partition and no order: compatible with the existing sort.'],
      ['WHERE invoice_id IN (...)', 'Filtering before the window keeps the sort small.'],
    ],
    visual: { type: 'window', source: W_PAY, partition: 'invoice_id', order: 'payment_date', value: 'amount', fn: 'ROW_NUMBER' },
    internals: `<p>Run <code>EXPLAIN QUERY PLAN</code> on a window query in SQLite. You will see <code>CO-ROUTINE</code> for the windowed subquery and <code>USE TEMP B-TREE FOR ORDER BY</code> for the sort that feeds the window. After <code>CREATE INDEX idx_pay_inv_date ON payments(invoice_id, payment_date, payment_id)</code>, the scan can use the index order and the temp b-tree for the window disappears. Each additional incompatible window ordering adds another sort.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM (
  SELECT payment_id, invoice_id, payment_date,
         ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY payment_date DESC, payment_id DESC) AS rn
  FROM payments)
WHERE invoice_id = 7 AND rn = 1;`, why: 'This one is fine: recent SQLite versions can push invoice_id = 7 into the subquery because it is a partition key, so filtering first does not change any row number. But filters on non-partition columns cannot be pushed down without changing results. When in doubt, filter by partition keys INSIDE the subquery yourself.', fix: `SELECT * FROM (
  SELECT payment_id, invoice_id, payment_date,
         ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY payment_date DESC, payment_id DESC) AS rn
  FROM payments
  WHERE invoice_id = 7)
WHERE rn = 1;` },
      { wrong: `SELECT invoice_id, payment_id,
       ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY payment_date) AS a,
       ROW_NUMBER() OVER (ORDER BY amount) AS b,
       ROW_NUMBER() OVER (PARTITION BY payor_id ORDER BY payment_id) AS c
FROM payments;`, why: 'Three incompatible window orders mean three sorts of the whole table. Only include the windows you really need, and align them where possible.', fix: `SELECT invoice_id, payment_id,
       ROW_NUMBER() OVER w AS a,
       COUNT(*) OVER w AS running_count
FROM payments
WINDOW w AS (PARTITION BY invoice_id ORDER BY payment_date, payment_id);` },
    ],
    rules: [
      'Cost ≈ one sort per distinct (PARTITION BY, ORDER BY).',
      'Name and reuse windows with the WINDOW clause.',
      'Index (partition columns, order columns) to avoid sorts.',
      'Filter in WHERE as early as the logic allows.',
      'Prefer ROWS frames; avoid UNBOUNDED FOLLOWING unless needed.',
    ],
    compare: `<table><tr><th>Choice</th><th>Cheaper</th><th>More expensive</th></tr>
<tr><td>Window definitions</td><td>1 shared</td><td>many different orders</td></tr>
<tr><td>Frame</td><td>ROWS UNBOUNDED PRECEDING</td><td>RANGE with offsets / UNBOUNDED FOLLOWING</td></tr>
<tr><td>Rows in</td><td>filtered in WHERE</td><td>filtered after the window</td></tr>
<tr><td>Order source</td><td>matching index</td><td>temp b-tree sort</td></tr></table>`,
    realWorld: 'A nightly "latest claim status per claim" job dropped from 20 minutes to 2 after adding an index on (claim_id, status_date) and merging three window definitions into one.',
    tips: ['Prefix the query with EXPLAIN QUERY PLAN and count the "USE TEMP B-TREE" lines.'],
    deep: `<p>Window functions are blocking operators per partition: rows cannot be emitted until the ordering is established, and frames extending forward need buffering. Distributed engines (Spark, BigQuery) shuffle data by the PARTITION BY key, so a window with no PARTITION BY forces all data onto one worker. Avoid <code>OVER (ORDER BY ...)</code> without partitions on huge tables there.</p>`,
    tryIt: { prompt: 'Run EXPLAIN QUERY PLAN on the lesson query, then create the index and compare.', starter: `EXPLAIN QUERY PLAN
SELECT invoice_id, payment_id,
       ROW_NUMBER() OVER w AS payment_no,
       SUM(amount) OVER (w ROWS UNBOUNDED PRECEDING) AS paid_so_far
FROM payments
WINDOW w AS (PARTITION BY invoice_id ORDER BY payment_date, payment_id);

-- then: CREATE INDEX idx_pay_inv_date ON payments(invoice_id, payment_date, payment_id);` },
    challenge: {
      level: 3,
      prompt: 'Using ONE named window w (PARTITION BY patient_id ORDER BY invoice_date, invoice_id), show for every invoice: patient_id, invoice_id, invoice_date, visit_no (ROW_NUMBER), billed_to_date (running SUM of total_amount) and prev_amount (LAG of total_amount). Order by patient_id, invoice_date, invoice_id.',
      solution: `SELECT patient_id, invoice_id, invoice_date,
       ROW_NUMBER() OVER w AS visit_no,
       SUM(total_amount) OVER (w ROWS UNBOUNDED PRECEDING) AS billed_to_date,
       LAG(total_amount) OVER w AS prev_amount
FROM invoices
WINDOW w AS (PARTITION BY patient_id ORDER BY invoice_date, invoice_id)
ORDER BY patient_id, invoice_date, invoice_id;`,
      hints: ['Define the window once at the end: WINDOW w AS (PARTITION BY patient_id ORDER BY invoice_date, invoice_id).', 'ROW_NUMBER() OVER w and LAG(total_amount) OVER w reuse it.', 'For the running sum, extend it: SUM(total_amount) OVER (w ROWS UNBOUNDED PRECEDING).', 'ORDER BY patient_id, invoice_date, invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What is usually the most expensive part of a window query?', options: ['Computing ROW_NUMBER', 'Sorting rows into partition/order sequence', 'Returning columns', 'Parsing'], answer: 1, why: 'Each distinct window ordering typically needs a sort.' },
      { q: 'Which index best supports OVER (PARTITION BY invoice_id ORDER BY payment_date)?', options: ['(payment_date)', '(invoice_id, payment_date)', '(amount)', '(payment_date, invoice_id)'], answer: 1, why: 'Partition columns first, then order columns, matching the required sort.' },
    ],
  },
]);
})();
