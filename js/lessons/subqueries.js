// Section 06: Subqueries & CTEs (subqueries-01 .. subqueries-17)
Lessons.add([
  // ─────────────────────────────────────────────── 01
  {
    id: 'subqueries-01',
    goals: [
      'What a subquery is: a query inside another query',
      'How the inner query feeds a value or a list to the outer query',
      'Where subqueries can appear (SELECT, FROM, WHERE, HAVING)',
      'How to read a nested query from the inside out',
    ],
    concept: `<p>A <b>subquery</b> is a complete <code>SELECT</code> placed inside parentheses within another SQL statement. The inner query runs to produce an answer, and the outer query uses that answer.</p>
<p>Example question: <i>"Which invoices are bigger than the average invoice?"</i> You cannot answer this in one simple step, because you need the average first. A subquery gives you that step:</p>
<ul>
<li><b>Inner query:</b> <code>(SELECT AVG(total_amount) FROM invoices)</code> gives one number, about 241.04.</li>
<li><b>Outer query:</b> keeps the invoices whose <code>total_amount</code> is greater than that number.</li>
</ul>
<p>Read nested queries <b>from the inside out</b>. Work out what the parentheses return first, then read the outer query as if a literal value were in their place.</p>`,
    why: 'Many questions need an intermediate answer, such as an average, a list of ids or a summary table, before the final question can be asked. Subqueries let you express that in one statement.',
    when: 'Use one when a filter or a column depends on another calculation: comparing rows with an aggregate, filtering by a list that comes from another table, or building a summary to query again.',
    analogy: 'A billing supervisor asks, "Flag every invoice above our average." A clerk first calculates the average on a sticky note (the inner query). The supervisor then goes through the invoice stack using that number (the outer query).',
    exampleSql: `SELECT invoice_id, location_id, status, total_amount FROM invoices ORDER BY invoice_id LIMIT 8`,
    syntax: `SELECT columns
FROM table
WHERE column operator (SELECT ... FROM ... );   -- the subquery`,
    sql: `SELECT invoice_id, status, total_amount
FROM invoices
WHERE total_amount > (SELECT AVG(total_amount) FROM invoices)
ORDER BY total_amount DESC;`,
    breakdown: [
      ['(SELECT AVG(total_amount) FROM invoices)', 'Inner query: runs first and returns a single number, the average invoice total (about 241.04).'],
      ['SELECT invoice_id, status, total_amount', 'Outer query: the columns we want to show.'],
      ['FROM invoices', 'The outer query reads the invoices table too.'],
      ['WHERE total_amount > (...)', 'Keeps only the invoices above the number the subquery produced.'],
      ['ORDER BY total_amount DESC', 'Biggest invoices first.'],
    ],
    visual: { type: 'flow', steps: [
      ['Inner: SELECT AVG(total_amount) FROM invoices', '48 rows → 1 value: 241.04'],
      ['Outer: FROM invoices', '48 rows'],
      ['WHERE total_amount > 241.04', '16 rows kept'],
      ['ORDER BY total_amount DESC', '16 rows, biggest first'],
    ] },
    internals: `<p>This subquery does not depend on the outer row, so SQLite evaluates it <b>once</b>, caches the result and reuses it for every outer row. The plan shows this as <code>SCALAR SUBQUERY</code>. A subquery that <i>does</i> reference the outer row (a correlated subquery) can run once per row instead. That comes later in this section.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id FROM invoices WHERE total_amount > AVG(total_amount);`, why: 'Aggregates cannot be used directly in WHERE, because WHERE looks at one row at a time and has no average to compare with. You need the subquery to compute the average separately.', fix: `SELECT invoice_id FROM invoices WHERE total_amount > (SELECT AVG(total_amount) FROM invoices);` },
      { wrong: `SELECT invoice_id FROM invoices WHERE total_amount > SELECT AVG(total_amount) FROM invoices;`, why: 'A subquery must be wrapped in parentheses. Without them this is a syntax error.', fix: `SELECT invoice_id FROM invoices WHERE total_amount > (SELECT AVG(total_amount) FROM invoices);` },
    ],
    rules: [
      'A subquery is always wrapped in parentheses.',
      'Read nested queries from the innermost parentheses outward.',
      'The shape of the result matters: one value, one column of values, or a whole table.',
      'Uncorrelated subqueries run once; correlated ones may run once per outer row.',
    ],
    compare: `<table><tr><th>Approach</th><th>How</th><th>Good for</th></tr>
<tr><td>Two separate queries</td><td>Run the average, copy the number, paste it into a second query</td><td>One-off checks (but the number goes stale)</td></tr>
<tr><td>Subquery</td><td>Nest the average inside the filter</td><td>Always-current, single statement</td></tr>
<tr><td>JOIN / CTE</td><td>Join to a pre-computed summary</td><td>Reusing the intermediate result in several places</td></tr></table>`,
    realWorld: 'Billing dashboards flag high-dollar claims above the average, list patients who have an overdue invoice, and show each location next to the company-wide average. All of these are subquery patterns.',
    tips: ['Run the inner query on its own first. If it returns what you expect, the outer query becomes easy to reason about.'],
    deep: `<p>The SQL standard classifies subqueries by the shape of what they return: <b>scalar</b> (1×1), <b>row</b> (1×n), <b>column/multi-row</b> (n×1, used with IN/ANY/ALL) and <b>table</b> (n×m, used in FROM). Optimizers often rewrite subqueries into joins or semi-joins, so the way you write the query does not fix how it is executed.</p>`,
    tryIt: { prompt: 'Change the query to show invoices BELOW the average instead, smallest first.', starter: `SELECT invoice_id, status, total_amount
FROM invoices
WHERE total_amount > (SELECT AVG(total_amount) FROM invoices)
ORDER BY total_amount DESC;` },
    challenge: {
      level: 1,
      prompt: 'List the charges (charge_id, description, amount) whose amount is greater than the average charge amount. Sort by amount descending, then charge_id ascending.',
      solution: `SELECT charge_id, description, amount
FROM charges
WHERE amount > (SELECT AVG(amount) FROM charges)
ORDER BY amount DESC, charge_id;`,
      hints: ['The data lives in the charges table.', 'You need the average charge amount first. That is your inner query.', 'Put (SELECT AVG(amount) FROM charges) on the right side of a > comparison in WHERE.', 'SELECT charge_id, description, amount FROM charges WHERE amount > (SELECT AVG(amount) FROM charges) ORDER BY amount DESC, charge_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'In the lesson query, how many times does SQLite need to compute the average?', options: ['Once per invoice (48 times)', 'Once', 'Twice', 'It depends on ORDER BY'], answer: 1, why: 'The subquery does not reference the outer row, so it is evaluated once and the result is reused.' },
      { q: 'Why can\'t you write WHERE total_amount > AVG(total_amount)?', options: ['AVG only works on integers', 'WHERE runs row by row, before any aggregation, so no average exists there', 'You must use HAVING for every comparison', 'It works fine'], answer: 1, why: 'WHERE filters single rows. The average needs all rows, so compute it in a subquery.' },
    ],
  },

  // ─────────────────────────────────────────────── 02
  {
    id: 'subqueries-02',
    goals: [
      'The shapes a subquery can return: scalar, column (list), row and table',
      'Correlated vs uncorrelated subqueries',
      'EXISTS subqueries as yes/no tests',
      'Which operator fits each shape',
    ],
    concept: `<p>Subqueries are grouped by <b>what they return</b> and <b>whether they depend on the outer row</b>.</p>
<ul>
<li><b>Scalar</b>: one row, one column, a single value. Use it anywhere a value fits: <code>= (SELECT MAX(...))</code>.</li>
<li><b>Column / multi-row</b>: one column, many rows, a list. Use it with <code>IN</code>, <code>NOT IN</code>, <code>ANY</code> or <code>ALL</code>.</li>
<li><b>Row</b>: one row, several columns. Compare it with a row value: <code>(a, b) = (SELECT x, y ...)</code>.</li>
<li><b>Table</b>: many rows and many columns. Use it in <code>FROM</code> as a derived table.</li>
<li><b>EXISTS</b>: only asks "is there at least one row?" and returns true or false.</li>
</ul>
<p>Separately, a subquery is <b>correlated</b> if it refers to a column of the outer query, such as <code>WHERE c.invoice_id = i.invoice_id</code>. Otherwise it is <b>uncorrelated</b> (self-contained).</p>`,
    why: 'Knowing the shape tells you which operator to use. A list needs IN; a single value can use =, <, >. Using the wrong one causes errors or wrong answers.',
    when: 'Every time you write a subquery, ask two questions: what shape does it return, and does it need the outer row?',
    analogy: 'Asking the records desk for something: "the one balance for account 12" (scalar), "the list of patient ids with overdue bills" (column), "patient 12\'s name and birth date" (row), "a spreadsheet of totals per clinic" (table), or just "do we have ANY claim for this patient?" (EXISTS).',
    exampleSql: `SELECT payor_id, payor_name, payor_type FROM payors`,
    syntax: `-- scalar      WHERE x > (SELECT AVG(x) FROM t)
-- column/list WHERE id IN (SELECT id FROM t WHERE ...)
-- row         WHERE (a, b) = (SELECT a, b FROM t WHERE ...)
-- table       FROM (SELECT ... ) AS d
-- exists      WHERE EXISTS (SELECT 1 FROM t WHERE t.k = outer.k)`,
    sql: `SELECT invoice_id, payor_id, total_amount
FROM invoices
WHERE payor_id IN (SELECT payor_id
                   FROM payors
                   WHERE payor_type = 'Commercial')
  AND total_amount > (SELECT AVG(total_amount) FROM invoices)
ORDER BY invoice_id;`,
    breakdown: [
      ['SELECT invoice_id, payor_id, total_amount FROM invoices', 'Outer query over invoices.'],
      ['payor_id IN (SELECT payor_id FROM payors WHERE ...)', 'A column (multi-row) subquery: returns the list of commercial payor ids (1, 2, 6). IN checks membership.'],
      ['total_amount > (SELECT AVG(total_amount) FROM invoices)', 'A scalar subquery: returns one number. It works with >.'],
      ['ORDER BY invoice_id', 'Stable output order.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 230" width="100%" font-family="sans-serif" font-size="13">
<g><rect x="10" y="20" width="110" height="60" rx="8" fill="var(--panel2)" stroke="var(--accent)"/><text x="65" y="45" text-anchor="middle" fill="var(--text)" font-weight="bold">Scalar</text><text x="65" y="65" text-anchor="middle" fill="var(--muted)">1 × 1</text></g>
<rect x="55" y="100" width="20" height="20" fill="var(--accent)"/>
<text x="65" y="150" text-anchor="middle" fill="var(--text)">= &lt; &gt;</text>
<g><rect x="135" y="20" width="110" height="60" rx="8" fill="var(--panel2)" stroke="var(--green)"/><text x="190" y="45" text-anchor="middle" fill="var(--text)" font-weight="bold">Column</text><text x="190" y="65" text-anchor="middle" fill="var(--muted)">n × 1</text></g>
<rect x="180" y="100" width="20" height="60" fill="var(--green)"/>
<text x="190" y="185" text-anchor="middle" fill="var(--text)">IN / ANY / ALL</text>
<g><rect x="260" y="20" width="110" height="60" rx="8" fill="var(--panel2)" stroke="var(--yellow)"/><text x="315" y="45" text-anchor="middle" fill="var(--text)" font-weight="bold">Row</text><text x="315" y="65" text-anchor="middle" fill="var(--muted)">1 × n</text></g>
<rect x="285" y="100" width="60" height="20" fill="var(--yellow)"/>
<text x="315" y="150" text-anchor="middle" fill="var(--text)">(a,b) = (...)</text>
<g><rect x="385" y="20" width="110" height="60" rx="8" fill="var(--panel2)" stroke="var(--blue)"/><text x="440" y="45" text-anchor="middle" fill="var(--text)" font-weight="bold">Table</text><text x="440" y="65" text-anchor="middle" fill="var(--muted)">n × m</text></g>
<rect x="410" y="100" width="60" height="60" fill="var(--blue)"/>
<text x="440" y="185" text-anchor="middle" fill="var(--text)">FROM (...) AS d</text>
<g><rect x="510" y="20" width="120" height="60" rx="8" fill="var(--panel2)" stroke="var(--purple)"/><text x="570" y="45" text-anchor="middle" fill="var(--text)" font-weight="bold">EXISTS</text><text x="570" y="65" text-anchor="middle" fill="var(--muted)">true / false</text></g>
<circle cx="570" cy="115" r="14" fill="var(--purple)"/>
<text x="570" y="150" text-anchor="middle" fill="var(--text)">WHERE EXISTS</text>
<text x="320" y="220" text-anchor="middle" fill="var(--muted)">Any of these can be correlated (references the outer row) or uncorrelated.</text>
</svg>` },
    internals: `<p>SQLite runs uncorrelated IN-lists once and stores the values in a temporary b-tree (plan: <code>LIST SUBQUERY</code>), so each membership test is a fast lookup. Scalar subqueries are run once and cached. Correlated subqueries are re-run for each outer row, unless the optimizer can flatten them into a join.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id FROM invoices WHERE payor_id = (SELECT payor_id FROM payors WHERE payor_type = 'Commercial');`, why: 'The subquery returns three ids, but = expects one value. PostgreSQL and SQL Server raise "more than one row returned". SQLite silently uses only the FIRST row, which gives a quietly wrong answer.', fix: `SELECT invoice_id FROM invoices WHERE payor_id IN (SELECT payor_id FROM payors WHERE payor_type = 'Commercial');` },
    ],
    rules: [
      'One value → comparison operators. A list → IN / ANY / ALL. A table → FROM.',
      'EXISTS only cares whether any row exists; the selected columns are ignored.',
      'Correlated means "references the outer query"; it is independent of the shape.',
    ],
    compare: `<table><tr><th>Type</th><th>Returns</th><th>Typical place</th><th>Example</th></tr>
<tr><td>Scalar</td><td>1 value</td><td>SELECT, WHERE</td><td><code>(SELECT MAX(amount) FROM payments)</code></td></tr>
<tr><td>Column</td><td>list</td><td>WHERE ... IN</td><td><code>IN (SELECT patient_id FROM invoices)</code></td></tr>
<tr><td>Row</td><td>1 row</td><td>WHERE (a,b)=</td><td><code>(first_name, last_name) = (SELECT ...)</code></td></tr>
<tr><td>Table</td><td>rows × cols</td><td>FROM</td><td><code>FROM (SELECT ...) AS t</code></td></tr>
<tr><td>EXISTS</td><td>true/false</td><td>WHERE</td><td><code>EXISTS (SELECT 1 ...)</code></td></tr></table>`,
    realWorld: 'Claims systems combine these constantly: IN-lists for "claims from contracted payors", scalar comparisons with benchmarks, EXISTS for "has a denial on file", and derived tables for monthly summaries.',
    tips: ['If you are not sure a subquery returns one row, use IN instead of =. It is safe for one row or many.'],
    deep: `<p>Row-value comparisons such as <code>(a,b) IN (SELECT x,y ...)</code> are supported by SQLite (3.15+), PostgreSQL and MySQL, but not by SQL Server. There you would use EXISTS with two equality predicates.</p>`,
    tryIt: { prompt: 'Try a row subquery: find patients with the same first_name and last_name as patient 1 (you should also see the duplicate, patient 25).', starter: `SELECT patient_id, first_name, last_name, date_of_birth
FROM patients
WHERE (first_name, last_name) = (SELECT first_name, last_name FROM patients WHERE patient_id = 1);` },
    challenge: {
      level: 2,
      prompt: 'Show invoice_id, patient_id and total_amount for invoices billed to a Medicare or Medicaid payor. Use a subquery on payors. Order by invoice_id.',
      solution: `SELECT invoice_id, patient_id, total_amount
FROM invoices
WHERE payor_id IN (SELECT payor_id FROM payors WHERE payor_type IN ('Medicare', 'Medicaid'))
ORDER BY invoice_id;`,
      hints: ['The payor type lives in payors, and the invoice rows live in invoices.', 'Several payors can match, so the subquery returns a LIST.', 'A list goes with IN: WHERE payor_id IN (SELECT payor_id FROM payors WHERE ...).', 'Inside the subquery filter with payor_type IN (\'Medicare\', \'Medicaid\').'],
      ordered: true,
    },
    quiz: [
      { q: 'A subquery returns 3 rows × 1 column. Which operator should you use?', options: ['=', 'IN', '>', 'BETWEEN'], answer: 1, why: 'A single column of many rows is a list. IN tests membership.' },
      { q: 'What makes a subquery "correlated"?', options: ['It returns more than one row', 'It is in the FROM clause', 'It references a column of the outer query', 'It uses GROUP BY'], answer: 2, why: 'Correlation means the inner query depends on the current outer row.' },
      { q: 'In SQLite, WHERE x = (SELECT col FROM t) where the subquery returns 5 rows will...', options: ['Raise an error', 'Use the first row only', 'Compare against all 5', 'Return NULL'], answer: 1, why: 'SQLite silently takes the first row. Other databases raise an error. Either way it is a bug.' },
    ],
  },

  // ─────────────────────────────────────────────── 03
  {
    id: 'subqueries-03',
    goals: [
      'What a scalar subquery is (exactly one value)',
      'Using scalar subqueries in comparisons and calculations',
      'What happens when a "scalar" subquery returns zero rows or many rows',
      'How to guarantee a single value',
    ],
    concept: `<p>A <b>scalar subquery</b> returns exactly <b>one row with one column</b>, a single value. You can use it anywhere a single value could go: in <code>WHERE</code>, in <code>SELECT</code>, or inside arithmetic.</p>
<p>Two edge cases matter:</p>
<ul>
<li><b>Zero rows</b>: the subquery becomes <code>NULL</code>. Comparisons with NULL are unknown, so rows silently disappear.</li>
<li><b>More than one row</b>: most databases raise an error. <b>SQLite does not</b>; it quietly uses the first row. Either way you have a bug.</li>
</ul>
<p>An aggregate without GROUP BY (<code>MAX</code>, <code>AVG</code>, <code>COUNT</code>) always returns exactly one row, which makes it the safest way to build a scalar subquery.</p>`,
    why: 'Many business rules compare with a single benchmark: the largest payment, the latest invoice date, the contract rate of a specific payor.',
    when: 'Use one when you need one specific value computed from the data, such as a max, min, average, count or a lookup by primary key.',
    analogy: 'Calling the payor hotline and asking, "What is your contract rate?" You expect exactly one answer. If three reps each give a different number, something is wrong with the question.',
    exampleSql: `SELECT payment_id, invoice_id, payment_date, amount FROM payments ORDER BY amount DESC LIMIT 6`,
    syntax: `SELECT ... FROM t
WHERE col = (SELECT MAX(col) FROM t);          -- aggregate → always 1 row

SELECT col * (SELECT rate FROM r WHERE id = 1) -- lookup by key → at most 1 row`,
    sql: `SELECT payment_id, invoice_id, payment_date, amount
FROM payments
WHERE amount = (SELECT MAX(amount) FROM payments);`,
    breakdown: [
      ['(SELECT MAX(amount) FROM payments)', 'Scalar subquery: always one row, the largest payment (548).'],
      ['WHERE amount = (...)', 'Keeps the payment(s) equal to that maximum. Ties would all be returned.'],
      ['SELECT payment_id, invoice_id, payment_date, amount', 'Shows the details of the largest payment.'],
    ],
    visual: { type: 'flow', steps: [
      ['SELECT MAX(amount) FROM payments', '47 rows → 1 value: 548'],
      ['FROM payments', '47 rows'],
      ['WHERE amount = 548', '1 row (payment 10, invoice 13)'],
    ] },
    internals: `<p>SQLite compiles an uncorrelated scalar subquery as a one-time subroutine. The first time it is needed, it runs, stores the value in a register and sets a flag so it never runs again. It also stops after the first row, which is why extra rows are ignored instead of rejected.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, total_amount FROM invoices
WHERE total_amount > (SELECT total_amount FROM invoices WHERE location_id = 3);`, why: 'Location 3 has 7 invoices, so the subquery returns 7 rows where one value is expected. PostgreSQL raises an error; SQLite silently compares with only the first of the 7. Decide what you mean: the max? the average? all of them?', fix: `SELECT invoice_id, total_amount FROM invoices
WHERE total_amount > (SELECT MAX(total_amount) FROM invoices WHERE location_id = 3);` },
      { wrong: `SELECT payor_name FROM payors
WHERE contract_rate > (SELECT contract_rate FROM payors WHERE payor_name = 'Blue Shield');`, why: 'The name is misspelled (it is "BlueShield Health"), so the subquery returns zero rows, which becomes NULL. Every comparison with NULL is unknown, so the query returns nothing and no error tells you why.', fix: `SELECT payor_name FROM payors
WHERE contract_rate > (SELECT contract_rate FROM payors WHERE payor_name = 'BlueShield Health');` },
    ],
    rules: [
      'A scalar subquery must return at most one row and exactly one column.',
      'Zero rows becomes NULL. Wrap it in COALESCE(..., default) if that matters.',
      'Aggregates without GROUP BY are always one row, so they are safe scalars.',
      'Lookup by primary key (WHERE id = 5) returns at most one row.',
    ],
    compare: `<table><tr><th>Subquery returns</th><th>PostgreSQL / SQL Server / Oracle</th><th>SQLite</th><th>MySQL</th></tr>
<tr><td>0 rows</td><td>NULL</td><td>NULL</td><td>NULL</td></tr>
<tr><td>1 row</td><td>the value</td><td>the value</td><td>the value</td></tr>
<tr><td>2+ rows</td><td><b>error</b></td><td>first row, silently</td><td><b>error</b></td></tr></table>`,
    realWorld: 'Finding the most recent payment date, the largest outstanding balance, or the rate of a specific payor to price a claim are all scalar subqueries.',
    tips: ['Test the subquery alone. If you see more than one row, add an aggregate or a stricter WHERE.'],
    deep: `<p>Because SQLite ignores extra rows, an accidental multi-row scalar subquery can pass tests on SQLite and then fail in production on PostgreSQL. Portable code should guarantee one row with an aggregate, a primary-key predicate, or <code>LIMIT 1</code> with an explicit <code>ORDER BY</code>.</p>`,
    tryIt: { prompt: 'Find the invoice(s) with the earliest invoice_date using a scalar subquery with MIN().', starter: `SELECT invoice_id, invoice_date, total_amount
FROM invoices
WHERE invoice_date = (SELECT MAX(invoice_date) FROM invoices);` },
    challenge: {
      level: 2,
      prompt: 'Show each charge (charge_id, amount) from invoice 13 together with the percentage it contributes to invoice 13\'s total_amount, rounded to 1 decimal (column pct). Get the total from the invoices table with a scalar subquery. Order by charge_id.',
      solution: `SELECT charge_id, amount,
       ROUND(100.0 * amount / (SELECT total_amount FROM invoices WHERE invoice_id = 13), 1) AS pct
FROM charges
WHERE invoice_id = 13
ORDER BY charge_id;`,
      hints: ['The charges come from charges WHERE invoice_id = 13.', 'The invoice total is ONE value: (SELECT total_amount FROM invoices WHERE invoice_id = 13).', 'Divide amount by that value and multiply by 100.0 (use 100.0 to avoid integer division).', 'ROUND(100.0 * amount / (SELECT total_amount FROM invoices WHERE invoice_id = 13), 1) AS pct'],
      ordered: true,
    },
    quiz: [
      { q: 'A scalar subquery finds no rows. What value does it produce?', options: ['0', 'An empty string', 'NULL', 'An error'], answer: 2, why: 'An empty scalar subquery is NULL, and comparisons with NULL are unknown.' },
      { q: 'Which subquery is guaranteed to be scalar?', options: ['SELECT amount FROM payments WHERE method = \'Cash\'', 'SELECT AVG(amount) FROM payments', 'SELECT invoice_id FROM invoices WHERE status = \'Open\'', 'SELECT * FROM payors WHERE payor_id = 1'], answer: 1, why: 'An aggregate with no GROUP BY always returns exactly one row and one column. The last option returns one row but six columns.' },
    ],
  },

  // ─────────────────────────────────────────────── 04
  {
    id: 'subqueries-04',
    goals: [
      'Putting a subquery in the SELECT list to add a computed column',
      'Correlated SELECT-list subqueries (a value per row)',
      'Why each must return one value per row',
      'When a JOIN + GROUP BY is the better choice',
    ],
    concept: `<p>A subquery in the <b>SELECT list</b> adds a column whose value is calculated by another query. It must be <b>scalar</b>: one value per output row.</p>
<p>Often it is <b>correlated</b>: it uses the current outer row. Example: <i>for each invoice, how many charge lines does it have?</i></p>
<pre>(SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id)</pre>
<p>For invoice 4 it counts invoice 4's charges; for invoice 5 it counts invoice 5's, and so on. Unlike a JOIN + GROUP BY, the outer rows are never multiplied, and invoices without charges still appear (with 0).</p>`,
    why: 'It is an easy way to attach a summary number to each row without changing the row count of the outer query.',
    when: 'Use it for one or two extra computed columns such as "number of charges", "last payment date" or "company average". For many summary columns, a JOIN to a grouped derived table is usually clearer and faster.',
    analogy: 'Going down a list of invoices and, for each one, phoning the charge desk: "How many lines on invoice 4?" You write the answer in the margin, then move to the next invoice.',
    exampleSql: `SELECT invoice_id, charge_id, amount FROM charges WHERE invoice_id <= 5 ORDER BY invoice_id`,
    syntax: `SELECT o.col,
       (SELECT AGG(x) FROM child c WHERE c.fk = o.pk) AS computed
FROM outer_table o;`,
    sql: `SELECT i.invoice_id,
       i.total_amount,
       (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id) AS charge_lines,
       (SELECT MAX(p.payment_date) FROM payments p WHERE p.invoice_id = i.invoice_id) AS last_payment,
       ROUND(i.total_amount - (SELECT AVG(total_amount) FROM invoices), 2) AS vs_avg
FROM invoices i
WHERE i.invoice_id <= 8
ORDER BY i.invoice_id;`,
    breakdown: [
      ['FROM invoices i ... WHERE i.invoice_id <= 8', 'The outer rows: the first 8 invoices. Alias i so the subqueries can refer to them.'],
      ['(SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id)', 'Correlated: counts the charges of the CURRENT invoice. COUNT returns 0, not NULL, when there are none.'],
      ['(SELECT MAX(p.payment_date) ... ) AS last_payment', 'Correlated: latest payment date, or NULL if the invoice has not been paid.'],
      ['i.total_amount - (SELECT AVG(total_amount) FROM invoices)', 'Uncorrelated scalar: the company average, computed once.'],
    ],
    visual: { type: 'flow', steps: [
      ['FROM invoices i WHERE invoice_id <= 8', '8 outer rows'],
      ['For each row: COUNT charges of that invoice', '8 small lookups'],
      ['For each row: MAX payment_date of that invoice', '8 small lookups (NULL if unpaid)'],
      ['Company AVG computed once', '241.04 reused'],
      ['Output', '8 rows, 5 columns'],
    ] },
    internals: `<p>SQLite runs the correlated subqueries once per outer row. With an index on <code>charges(invoice_id)</code>, each run is a quick index seek; without one, each run scans the whole charges table. Look for <code>CORRELATED SCALAR SUBQUERY</code> in <code>EXPLAIN QUERY PLAN</code>.</p>`,
    mistakes: [
      { wrong: `SELECT i.invoice_id,
       (SELECT c.amount FROM charges c WHERE c.invoice_id = i.invoice_id) AS amount
FROM invoices i;`, why: 'Most invoices have several charges, so the subquery returns several rows for a single cell. Other databases error; SQLite shows only the first charge, which is misleading. Aggregate it.', fix: `SELECT i.invoice_id,
       (SELECT SUM(c.amount) FROM charges c WHERE c.invoice_id = i.invoice_id) AS amount
FROM invoices i;` },
      { wrong: `SELECT i.invoice_id,
       (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = invoice_id) AS n
FROM invoices i;`, why: 'Unqualified invoice_id resolves to the nearest table, charges itself, so the condition is always true and every row gets 104. Always qualify correlated columns with the outer alias.', fix: `SELECT i.invoice_id,
       (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id) AS n
FROM invoices i;` },
    ],
    rules: [
      'A SELECT-list subquery must return one value per row. Aggregate if needed.',
      'Qualify outer columns with the outer alias (i.invoice_id).',
      'COUNT gives 0 for no matches; SUM/MAX/AVG give NULL. Use COALESCE to default.',
      'It never changes the number of outer rows.',
    ],
    compare: `<table><tr><th></th><th>SELECT-list subquery</th><th>LEFT JOIN + GROUP BY</th></tr>
<tr><td>Row count</td><td>Always the outer rows</td><td>Need GROUP BY to collapse again</td></tr>
<tr><td>Several summaries</td><td>One subquery each (repeated work)</td><td>One pass, many aggregates</td></tr>
<tr><td>Readability</td><td>Very clear for 1-2 columns</td><td>Clearer for many columns</td></tr>
<tr><td>Fan-out risk</td><td>None</td><td>Joining two child tables multiplies rows</td></tr></table>`,
    realWorld: 'Patient account screens show "number of open invoices" and "last payment date" next to each patient. That is exactly this pattern.',
    tips: ['Name every computed column with AS so the result is readable.'],
    deep: `<p>Joining two child tables at once (charges AND payments) and then aggregating causes <b>fan-out</b>: each charge row is repeated once per payment, so the sums are inflated. Separate SELECT-list subqueries avoid this because each one aggregates its own table on its own. This makes them a correct and simple choice when you need summaries from several child tables.</p>`,
    tryIt: { prompt: 'Add a column paid_total with the SUM of payments for each invoice (use COALESCE to show 0 instead of NULL).', starter: `SELECT i.invoice_id,
       i.total_amount,
       (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id) AS charge_lines
FROM invoices i
WHERE i.invoice_id <= 8
ORDER BY i.invoice_id;` },
    challenge: {
      level: 2,
      prompt: 'For every practitioner, show practitioner_id, last_name and the number of charges they performed (charge_count), using a subquery in the SELECT list. Order by charge_count descending, then practitioner_id.',
      solution: `SELECT p.practitioner_id, p.last_name,
       (SELECT COUNT(*) FROM charges c WHERE c.practitioner_id = p.practitioner_id) AS charge_count
FROM practitioners p
ORDER BY charge_count DESC, p.practitioner_id;`,
      hints: ['The outer query is FROM practitioners p.', 'For each practitioner, count rows in charges that belong to them.', 'Correlate with WHERE c.practitioner_id = p.practitioner_id.', 'Use COUNT(*) so Leo Martins (no charges) shows 0; order by charge_count DESC, p.practitioner_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Invoice 37 has no charges. What does (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id) return for it?', options: ['NULL', '0', 'The row is removed', 'An error'], answer: 1, why: 'COUNT over zero rows is 0. SUM or MAX would give NULL.' },
      { q: 'Why is a SELECT-list subquery safe from "fan-out"?', options: ['It uses an index', 'Each subquery aggregates its own table independently and returns one value per outer row', 'It runs only once', 'It removes duplicates'], answer: 1, why: 'No rows are joined together, so nothing is multiplied.' },
    ],
  },

  // ─────────────────────────────────────────────── 05
  {
    id: 'subqueries-05',
    goals: [
      'Filtering with IN, NOT IN, EXISTS and comparison subqueries',
      'The NOT IN + NULL trap and why it returns nothing',
      'Using NOT EXISTS as the safe anti-join',
      'Subqueries in HAVING',
    ],
    concept: `<p>The most common place for a subquery is <b>WHERE</b>, where it decides which rows to keep.</p>
<ul>
<li><code>col IN (subquery)</code>: keep rows whose value appears in the list.</li>
<li><code>col NOT IN (subquery)</code>: keep rows whose value is NOT in the list. <b>Dangerous when the list contains NULL.</b></li>
<li><code>EXISTS (subquery)</code> / <code>NOT EXISTS</code>: keep rows for which a related row does or does not exist.</li>
<li><code>col &gt; (scalar subquery)</code>: compare with a single computed value.</li>
</ul>
<p><b>The NOT IN trap:</b> <code>x NOT IN (1, 2, NULL)</code> means <code>x&lt;&gt;1 AND x&lt;&gt;2 AND x&lt;&gt;NULL</code>. The last part is always UNKNOWN, so the whole condition can never be TRUE, and <b>no rows come back</b>. The payments table has NULL payor_id values (patient payments), so <code>payor_id NOT IN (SELECT payor_id FROM payments)</code> returns zero rows.</p>`,
    why: 'Filtering by what exists in another table ("patients with an overdue invoice", "payors that never paid") is one of the most frequent needs in reporting.',
    when: 'Use IN or EXISTS for "has a related row", and NOT EXISTS for "has no related row". Use NOT IN only when the subquery column is guaranteed NOT NULL.',
    analogy: 'Checking a patient against the "overdue list" at the front desk. IN means "is their id on the list?". The NOT IN trap is a list containing a smudged, unreadable entry: you can never be sure a patient is NOT that entry, so you refuse to clear anyone.',
    exampleSql: `SELECT payment_id, invoice_id, payor_id, amount FROM payments ORDER BY payment_id LIMIT 8`,
    syntax: `WHERE col IN     (SELECT col FROM t WHERE ...)
WHERE NOT EXISTS (SELECT 1 FROM t WHERE t.k = outer.k)
WHERE col > (SELECT AGG(col) FROM t)
HAVING AGG(x) > (SELECT ...)`,
    sql: `SELECT patient_id, first_name, last_name
FROM patients
WHERE patient_id IN (SELECT patient_id
                     FROM invoices
                     WHERE status = 'Overdue')
ORDER BY patient_id;`,
    breakdown: [
      ['SELECT patient_id FROM invoices WHERE status = \'Overdue\'', 'Inner query: the list of patient ids with at least one overdue invoice. Duplicates do not matter to IN.'],
      ['WHERE patient_id IN (...)', 'Keeps each patient whose id appears in that list, exactly once, even if they have several overdue invoices.'],
      ['ORDER BY patient_id', 'Stable order.'],
    ],
    visual: { type: 'flow', steps: [
      ['Inner: invoices WHERE status = \'Overdue\'', '13 invoice rows → list of patient ids'],
      ['Outer: FROM patients', '25 rows'],
      ['WHERE patient_id IN (list)', 'patients on the list are kept, each once'],
    ] },
    internals: `<p>SQLite turns an uncorrelated IN-subquery into an ephemeral index (plan: <code>LIST SUBQUERY</code>), so each membership test is a b-tree lookup. For <code>NOT IN</code> it must also track whether the list contained a NULL: if it did, and a value was not found, the result is NULL (unknown) rather than TRUE.</p>`,
    mistakes: [
      { wrong: `SELECT payor_name FROM payors
WHERE payor_id NOT IN (SELECT payor_id FROM payments);`, why: 'payments.payor_id is NULL for patient payments. NOT IN against a list containing NULL can never be TRUE, so this returns zero rows, even though three payors never paid anything.', fix: `SELECT payor_name FROM payors p
WHERE NOT EXISTS (SELECT 1 FROM payments y WHERE y.payor_id = p.payor_id);` },
      { wrong: `SELECT payor_name FROM payors
WHERE payor_id NOT IN (SELECT payor_id FROM payments);`, why: 'Another fix, if you prefer NOT IN: remove the NULLs from the list explicitly.', fix: `SELECT payor_name FROM payors
WHERE payor_id NOT IN (SELECT payor_id FROM payments WHERE payor_id IS NOT NULL);` },
    ],
    rules: [
      'IN ignores duplicates in the list; the outer row is kept once.',
      'NOT IN + any NULL in the list returns no rows. Prefer NOT EXISTS.',
      'EXISTS stops at the first matching row, so it is cheap.',
      'Subqueries also work in HAVING to filter groups.',
    ],
    compare: `<table><tr><th>Goal</th><th>Safe choice</th><th>Watch out</th></tr>
<tr><td>Has a related row</td><td>IN or EXISTS</td><td>JOIN duplicates rows if several match</td></tr>
<tr><td>Has NO related row</td><td>NOT EXISTS</td><td>NOT IN fails with NULLs</td></tr>
<tr><td>Compare with a benchmark</td><td>&gt; (scalar subquery)</td><td>must be one value</td></tr></table>`,
    realWorld: 'Collections queues ("patients with any overdue invoice"), payor audits ("contracted payors with no remittances this year") and clean-up reports ("patients never billed") are all WHERE-subquery filters.',
    tips: ['Whenever you type NOT IN (SELECT ...), ask: "can this column be NULL?" If yes, switch to NOT EXISTS.'],
    deep: `<p>A subquery in <b>HAVING</b> compares groups: <code>SELECT location_id, SUM(total_amount) FROM invoices GROUP BY location_id HAVING SUM(total_amount) &gt; (SELECT AVG(total_amount) * 10 FROM invoices)</code>. Also note <code>&gt; ALL (subquery)</code> and <code>&gt; ANY (subquery)</code> are standard but <b>not supported in SQLite</b>. Emulate them with <code>&gt; (SELECT MAX(...))</code> and <code>&gt; (SELECT MIN(...))</code>.</p>`,
    tryIt: { prompt: 'Run the NOT IN version, then the NOT EXISTS version, and compare. Which payors never sent a payment?', starter: `-- Trap: returns nothing
SELECT payor_name FROM payors
WHERE payor_id NOT IN (SELECT payor_id FROM payments);

-- Safe:
SELECT payor_name FROM payors p
WHERE NOT EXISTS (SELECT 1 FROM payments y WHERE y.payor_id = p.payor_id);` },
    challenge: {
      level: 2,
      prompt: 'List the patients (patient_id, first_name, last_name) who have NO invoices at all. Use a subquery. Order by patient_id.',
      solution: `SELECT patient_id, first_name, last_name
FROM patients p
WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id)
ORDER BY patient_id;`,
      hints: ['You want patients where a related invoice does NOT exist.', 'NOT EXISTS (SELECT 1 FROM invoices i WHERE ...) is the safest anti-join.', 'Correlate on i.patient_id = p.patient_id.', 'invoices.patient_id is NOT NULL, so NOT IN (SELECT patient_id FROM invoices) would also work here.'],
      ordered: true,
    },
    quiz: [
      { q: 'What does 5 NOT IN (1, 2, NULL) evaluate to?', options: ['TRUE', 'FALSE', 'UNKNOWN (NULL)', 'Error'], answer: 2, why: '5<>1 is TRUE, 5<>2 is TRUE, 5<>NULL is UNKNOWN. TRUE AND UNKNOWN = UNKNOWN, so the row is filtered out.' },
      { q: 'Patient 7 has 2 overdue invoices. How many times does patient 7 appear in WHERE patient_id IN (SELECT patient_id FROM invoices WHERE status=\'Overdue\')?', options: ['0', '1', '2', 'Depends on ORDER BY'], answer: 1, why: 'IN is a membership test on the outer row, so each patient appears once.' },
      { q: 'Which is the safest way to find payors with no payments?', options: ['NOT IN (SELECT payor_id FROM payments)', 'NOT EXISTS (SELECT 1 FROM payments y WHERE y.payor_id = p.payor_id)', '<> (SELECT payor_id FROM payments)', 'IN (SELECT NULL)'], answer: 1, why: 'NOT EXISTS is not affected by NULLs in payments.payor_id.' },
    ],
  },

  // ─────────────────────────────────────────────── 06
  {
    id: 'subqueries-06',
    goals: [
      'Using a subquery as a table in FROM',
      'Why FROM-subqueries need an alias',
      'Aggregating an aggregate (average of per-location totals)',
      'Joining a summary back to detail rows',
    ],
    concept: `<p>A subquery in <b>FROM</b> returns a whole table that the outer query reads as if it were a real table. It exists only while this query runs.</p>
<p>This lets you do things in two stages. Stage 1 (inner) computes <b>totals per location</b>. Stage 2 (outer) works on those totals: filters them, averages them, or joins them to other tables.</p>
<p>You cannot write <code>AVG(SUM(total_amount))</code> directly, because aggregates cannot be nested. A FROM-subquery solves that: sum in the inner query, then average in the outer one.</p>`,
    why: 'Some questions are about summaries, not rows: "the average location revenue", "locations above the average location". You need the summary table first.',
    when: 'Use it when you need to aggregate twice, filter on an aggregate with extra logic, or join a summary to detail rows.',
    analogy: 'The billing manager asks each clinic for a one-line revenue report (inner query). Then, with only those five report sheets on the desk, she calculates the average clinic revenue (outer query).',
    exampleSql: `SELECT location_id, SUM(total_amount) AS billed FROM invoices GROUP BY location_id`,
    syntax: `SELECT d.col, ...
FROM (
    SELECT key, AGG(x) AS col
    FROM t
    GROUP BY key
) AS d
WHERE d.col > ...;`,
    sql: `SELECT loc.location_id, loc.billed,
       ROUND((SELECT AVG(billed) FROM (SELECT SUM(total_amount) AS billed
                                         FROM invoices GROUP BY location_id)), 2) AS avg_location
FROM (
    SELECT location_id, SUM(total_amount) AS billed
    FROM invoices
    GROUP BY location_id
) AS loc
ORDER BY loc.billed DESC;`,
    breakdown: [
      ['FROM ( SELECT location_id, SUM(total_amount) AS billed ... GROUP BY location_id ) AS loc', 'Stage 1: a temporary table with one row per location and its billed total. It is named loc.'],
      ['SELECT loc.location_id, loc.billed', 'The outer query reads loc like a normal table.'],
      ['(SELECT AVG(billed) FROM (SELECT SUM(...) ... GROUP BY location_id))', 'A scalar subquery whose own FROM is a subquery: the average of the per-location totals (an aggregate of an aggregate).'],
      ['ORDER BY loc.billed DESC', 'Highest-billing location first.'],
    ],
    visual: { type: 'flow', steps: [
      ['Inner: invoices GROUP BY location_id', '48 rows → 5 summary rows'],
      ['Name it: AS loc', 'a temporary 5-row table'],
      ['Outer: SELECT from loc + average of the 5 totals', 'avg = 2314'],
      ['ORDER BY billed DESC', '5 rows'],
    ] },
    internals: `<p>SQLite either <b>flattens</b> the FROM-subquery into the outer query (merging them into one query) or <b>materializes</b> it into a temporary table. Subqueries with GROUP BY usually have to be materialized because the grouping must finish first. The plan shows <code>MATERIALIZE</code> or <code>CO-ROUTINE</code> for them.</p>`,
    mistakes: [
      { wrong: `SELECT AVG(SUM(total_amount)) FROM invoices GROUP BY location_id;`, why: 'Aggregate functions cannot be nested. SQLite reports "misuse of aggregate function SUM()". Compute the sums in a FROM-subquery first.', fix: `SELECT AVG(billed) FROM (SELECT SUM(total_amount) AS billed FROM invoices GROUP BY location_id) AS t;` },
      { wrong: `SELECT AVG(billed) FROM (SELECT SUM(total_amount) FROM invoices GROUP BY location_id) AS t;`, why: 'The inner column has no alias, so the outer query cannot refer to "billed". Name every computed column in the subquery.', fix: `SELECT AVG(billed) FROM (SELECT SUM(total_amount) AS billed FROM invoices GROUP BY location_id) AS t;` },
    ],
    rules: [
      'Give every FROM-subquery an alias (required in PostgreSQL, MySQL and SQL Server).',
      'Alias every computed column inside it so the outer query can use it.',
      'Aggregates cannot be nested, so use a FROM-subquery for "aggregate of aggregate".',
      'The outer query sees only the columns the subquery selects.',
    ],
    compare: `<table><tr><th></th><th>FROM-subquery</th><th>CTE (WITH)</th><th>View</th></tr>
<tr><td>Scope</td><td>this query only</td><td>this statement only</td><td>stored in the database</td></tr>
<tr><td>Reuse in same query</td><td>must repeat</td><td>reference by name</td><td>reference by name</td></tr>
<tr><td>Readability</td><td>nested, inside-out</td><td>top-to-bottom</td><td>hidden definition</td></tr></table>`,
    realWorld: 'Revenue benchmarking ("which clinics are above the average clinic?"), per-patient totals that then feed a distribution report, and monthly summaries joined to targets.',
    tips: ['Build the inner query first, run it alone, then wrap it in FROM ( ... ) AS name.'],
    deep: `<p>The SQLite optimizer applies the "query flattener" to FROM-subqueries whenever it is safe to do so. For example, a simple filtered subquery is merged into the outer query so indexes can be used. Flattening is blocked by aggregates, DISTINCT, LIMIT, window functions and some joins. The next lesson (Derived Tables) and CTE Performance cover what that means for speed.</p>`,
    tryIt: { prompt: 'Show only the locations whose billed total is above 1500 by filtering the outer query.', starter: `SELECT loc.location_id, loc.billed
FROM (
    SELECT location_id, SUM(total_amount) AS billed
    FROM invoices
    GROUP BY location_id
) AS loc
ORDER BY loc.billed DESC;` },
    challenge: {
      level: 2,
      prompt: 'Using a FROM-subquery that computes the number of invoices per patient, return the average number of invoices per billed patient as avg_invoices, rounded to 2 decimals.',
      solution: `SELECT ROUND(AVG(n), 2) AS avg_invoices
FROM (SELECT patient_id, COUNT(*) AS n FROM invoices GROUP BY patient_id) AS per_patient;`,
      hints: ['Stage 1: one row per patient with their invoice count.', 'SELECT patient_id, COUNT(*) AS n FROM invoices GROUP BY patient_id', 'Wrap it: FROM ( ... ) AS per_patient', 'Outer: SELECT ROUND(AVG(n), 2) AS avg_invoices'],
      ordered: false,
    },
    quiz: [
      { q: 'Why can\'t you write AVG(SUM(total_amount))?', options: ['AVG only works on integers', 'Aggregate functions cannot be nested in the same query level', 'SUM returns text', 'It works in SQLite'], answer: 1, why: 'Aggregate first in a subquery, then aggregate the result outside.' },
      { q: 'A FROM-subquery computes SUM(total_amount) without an alias. What is the problem?', options: ['None', 'The outer query has no convenient name to refer to that column', 'It returns NULL', 'It runs twice'], answer: 1, why: 'Always alias computed columns so the outer query can reference them.' },
    ],
  },

  // ─────────────────────────────────────────────── 07
  {
    id: 'subqueries-07',
    goals: [
      'What "derived table" means (a named FROM-subquery)',
      'Joining a derived table to base tables',
      'Pre-aggregating before a join to avoid fan-out',
      'Stacking derived tables in layers',
    ],
    concept: `<p>A <b>derived table</b> is the official name for a subquery in the FROM clause with an alias. The name means the table is <i>derived</i> from a query, not stored.</p>
<p>Its most useful job is to <b>pre-aggregate before joining</b>. Suppose you want each invoice with its total charges AND its total payments. If you join invoices → charges → payments directly, every charge row is repeated for every payment row (fan-out), and the sums come out too large.</p>
<p>The fix is to build two small derived tables, <b>charge totals per invoice</b> and <b>payment totals per invoice</b>, each with one row per invoice, and then join them. One row meets one row, so nothing is multiplied.</p>`,
    why: 'Joining several one-to-many tables multiplies rows. Pre-aggregating each one in a derived table keeps the numbers correct.',
    when: 'Use one whenever you need aggregates from two or more child tables side by side, or when you want to filter or rank a summary and then join details back.',
    analogy: 'Instead of stapling every charge slip to every payment receipt (a mess, with receipts counted many times), the clerk writes one subtotal card for charges and one for payments, then clips the two cards together.',
    exampleSql: `SELECT invoice_id, COUNT(*) AS lines, SUM(amount) AS charged FROM charges WHERE invoice_id <= 6 GROUP BY invoice_id`,
    syntax: `SELECT b.key, d1.agg1, d2.agg2
FROM base b
LEFT JOIN (SELECT key, SUM(x) AS agg1 FROM child1 GROUP BY key) AS d1 ON d1.key = b.key
LEFT JOIN (SELECT key, SUM(y) AS agg2 FROM child2 GROUP BY key) AS d2 ON d2.key = b.key;`,
    sql: `SELECT i.invoice_id,
       i.total_amount,
       COALESCE(ch.charged, 0) AS charged,
       COALESCE(pay.paid, 0)   AS paid,
       COALESCE(ch.charged, 0) - COALESCE(pay.paid, 0) AS balance
FROM invoices i
LEFT JOIN (SELECT invoice_id, SUM(amount) AS charged
           FROM charges GROUP BY invoice_id) AS ch  ON ch.invoice_id = i.invoice_id
LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid
           FROM payments GROUP BY invoice_id) AS pay ON pay.invoice_id = i.invoice_id
WHERE i.invoice_id <= 10
ORDER BY i.invoice_id;`,
    breakdown: [
      ['(SELECT invoice_id, SUM(amount) AS charged FROM charges GROUP BY invoice_id) AS ch', 'Derived table 1: one row per invoice with total charges.'],
      ['(SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) AS pay', 'Derived table 2: one row per invoice with total payments.'],
      ['LEFT JOIN ... ON ch.invoice_id = i.invoice_id', 'One-to-one joins: no fan-out. LEFT keeps invoices with no payments.'],
      ['COALESCE(..., 0)', 'Turns "no rows" (NULL) into 0 so the arithmetic works.'],
      ['charged - paid AS balance', 'Outstanding balance per invoice.'],
    ],
    visual: { type: 'flow', steps: [
      ['charges GROUP BY invoice_id → ch', '104 rows → 47 rows (1 per invoice)'],
      ['payments GROUP BY invoice_id → pay', '47 rows → 29 rows (1 per invoice)'],
      ['invoices LEFT JOIN ch LEFT JOIN pay', '1 : 1 : 1, no fan-out'],
      ['WHERE invoice_id <= 10', '10 rows with charged, paid, balance'],
    ] },
    internals: `<p>Derived tables with GROUP BY are materialized into temporary b-trees. SQLite can create an <b>automatic index</b> on the join key of a materialized derived table (plan: <code>SEARCH ch USING AUTOMATIC COVERING INDEX (invoice_id=?)</code>), so the join is fast even though the table is temporary.</p>`,
    mistakes: [
      { wrong: `SELECT i.invoice_id, SUM(c.amount) AS charged, SUM(p.amount) AS paid
FROM invoices i
JOIN charges c  ON c.invoice_id = i.invoice_id
JOIN payments p ON p.invoice_id = i.invoice_id
GROUP BY i.invoice_id;`, why: 'Fan-out: invoice 7 has 2 charges and 2 payments, so the join produces 4 rows, and both sums are doubled (charged 380 instead of 190). Pre-aggregate each child table in a derived table.', fix: `SELECT i.invoice_id, ch.charged, pay.paid
FROM invoices i
JOIN (SELECT invoice_id, SUM(amount) AS charged FROM charges GROUP BY invoice_id) ch ON ch.invoice_id = i.invoice_id
JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) pay ON pay.invoice_id = i.invoice_id;` },
    ],
    rules: [
      'Derived table = FROM-subquery + alias.',
      'Pre-aggregate each one-to-many child before joining.',
      'Use LEFT JOIN plus COALESCE when some parents have no children.',
      'Each derived table should have one row per join key.',
    ],
    compare: `<table><tr><th>Technique</th><th>Correct sums?</th><th>Notes</th></tr>
<tr><td>Join all children, then GROUP BY</td><td>❌ inflated</td><td>fan-out multiplies rows</td></tr>
<tr><td>Derived tables per child</td><td>✅</td><td>one row per key each</td></tr>
<tr><td>SELECT-list subqueries</td><td>✅</td><td>simple, one per column</td></tr>
<tr><td>CTEs</td><td>✅</td><td>same as derived tables but named up front</td></tr></table>`,
    realWorld: 'Accounts-receivable aging reports combine charges, payments and adjustments per invoice. Doing it without pre-aggregation is a classic source of "the report is double-counting" tickets.',
    tips: ['After a join, check the row count. If it grew unexpectedly, you have fan-out.'],
    deep: `<p>Relational theory calls these <i>inline views</i> (Oracle's term too). The optimizer may push predicates from the outer query down into a derived table (<i>predicate pushdown</i>). For example, <code>WHERE i.invoice_id &lt;= 10</code> could in principle limit which invoices get aggregated. SQLite performs pushdown in some cases (3.30+), but not through every GROUP BY, so filter inside the derived table yourself when it is large.</p>`,
    tryIt: { prompt: 'Keep only invoices whose balance is not zero (filter the outer query) to build a mini open-balance report.', starter: `SELECT i.invoice_id,
       COALESCE(ch.charged, 0) AS charged,
       COALESCE(pay.paid, 0)   AS paid
FROM invoices i
LEFT JOIN (SELECT invoice_id, SUM(amount) AS charged FROM charges GROUP BY invoice_id) AS ch ON ch.invoice_id = i.invoice_id
LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) AS pay ON pay.invoice_id = i.invoice_id
ORDER BY i.invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'For each treatment location that has invoices, show location_name, the number of invoices (invoice_count) and the total amount paid on those invoices (paid_total). Use a derived table of payments per invoice so nothing is double-counted. Treat missing payments as 0. Order by paid_total descending.',
      solution: `SELECT l.location_name,
       COUNT(*) AS invoice_count,
       SUM(COALESCE(pay.paid, 0)) AS paid_total
FROM invoices i
JOIN treatment_locations l ON l.location_id = i.location_id
LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) AS pay
       ON pay.invoice_id = i.invoice_id
GROUP BY l.location_id, l.location_name
ORDER BY paid_total DESC;`,
      hints: ['Start from invoices joined to treatment_locations.', 'Build a derived table pay: SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id.', 'LEFT JOIN it on invoice_id so unpaid invoices stay (their paid is NULL, so use COALESCE).', 'GROUP BY location, COUNT(*) AS invoice_count, SUM(COALESCE(pay.paid,0)) AS paid_total, ORDER BY paid_total DESC.'],
      ordered: true,
    },
    quiz: [
      { q: 'An invoice has 3 charges and 2 payments. Joining invoices→charges→payments gives how many rows for it?', options: ['1', '3', '5', '6'], answer: 3, why: '3 × 2 = 6. That is fan-out, and it inflates both sums.' },
      { q: 'What must every derived table have?', options: ['An ORDER BY', 'An alias', 'A GROUP BY', 'An index'], answer: 1, why: 'The outer query needs a name to refer to it.' },
    ],
  },

  // ─────────────────────────────────────────────── 08
  {
    id: 'subqueries-08',
    goals: [
      'What makes a subquery correlated',
      'Comparing each row with its own group (invoice vs its location average)',
      'How to read a correlated subquery as "for each row..."',
      'EXISTS as a correlated test',
    ],
    concept: `<p>A <b>correlated subquery</b> refers to a column from the outer query, so its answer <b>changes from row to row</b>.</p>
<p>Question: <i>"Which invoices are above the average of their own location?"</i> Location 3's average (412.86) is very different from location 1's (136), so a single company-wide average would be unfair. The subquery must compute the average <b>for the location of the current row</b>:</p>
<pre>WHERE i.total_amount &gt; (SELECT AVG(i2.total_amount)
                        FROM invoices i2
                        WHERE i2.location_id = i.location_id)</pre>
<p>Read it as: <i>"for each invoice i, compute the average of invoices at i's location, and keep i if it is bigger."</i> Two aliases (<code>i</code> and <code>i2</code>) are needed because both levels read the same table.</p>`,
    why: 'Comparing a row with its own peer group (same location, same patient, same payor) is extremely common, and correlated subqueries express it directly.',
    when: 'Use one for per-row comparisons with a group statistic, for EXISTS / NOT EXISTS checks, and for "latest row per group" lookups.',
    analogy: 'An auditor goes through invoices one at a time. For each invoice, she opens that clinic\'s ledger, computes its average, and flags the invoice if it is above. The ledger she opens depends on which invoice is in her hand.',
    exampleSql: `SELECT location_id, ROUND(AVG(total_amount), 2) AS avg_amount, COUNT(*) AS invoices FROM invoices GROUP BY location_id`,
    syntax: `SELECT o.*
FROM t AS o
WHERE o.x > (SELECT AGG(i.x)
             FROM t AS i
             WHERE i.group_col = o.group_col);`,
    sql: `SELECT i.invoice_id, i.location_id, i.total_amount
FROM invoices i
WHERE i.total_amount > (SELECT AVG(i2.total_amount)
                        FROM invoices i2
                        WHERE i2.location_id = i.location_id)
ORDER BY i.location_id, i.total_amount DESC;`,
    breakdown: [
      ['FROM invoices i', 'Outer query: each invoice, called i.'],
      ['FROM invoices i2', 'Inner query: the same table under a different alias, i2.'],
      ['WHERE i2.location_id = i.location_id', 'The correlation: only invoices from the SAME location as the current outer row.'],
      ['SELECT AVG(i2.total_amount)', 'That location\'s average, one value per outer row.'],
      ['i.total_amount > (...)', 'Keep the invoice if it beats its own location\'s average.'],
    ],
    visual: { type: 'correlated' },
    internals: `<p>Logically the inner query runs once per outer row (48 times). SQLite does not cache results by key, so with no index on <code>invoices(location_id)</code> each run scans all 48 invoices, roughly 48 × 48 row visits. An index turns each run into a seek. Some engines (SQL Server, Oracle, PostgreSQL for EXISTS) automatically <b>decorrelate</b> such a query into a join with a grouped derived table.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, location_id, total_amount
FROM invoices
WHERE total_amount > (SELECT AVG(total_amount) FROM invoices WHERE location_id = location_id);`, why: 'Without aliases, both location_id references point to the inner table, so location_id = location_id is always true and you get the company average again. Alias both levels.', fix: `SELECT i.invoice_id, i.location_id, i.total_amount
FROM invoices i
WHERE i.total_amount > (SELECT AVG(i2.total_amount) FROM invoices i2 WHERE i2.location_id = i.location_id);` },
    ],
    rules: [
      'A correlated subquery references the outer row, so it cannot be run on its own.',
      'Use distinct aliases when inner and outer read the same table.',
      'Always qualify correlated columns (i.location_id, not location_id).',
      'Index the correlation column for speed.',
    ],
    compare: `<table><tr><th></th><th>Uncorrelated</th><th>Correlated</th></tr>
<tr><td>Depends on outer row?</td><td>No</td><td>Yes</td></tr>
<tr><td>Runs</td><td>once</td><td>(logically) once per outer row</td></tr>
<tr><td>Run it alone?</td><td>Yes</td><td>No, it references an outer alias</td></tr>
<tr><td>Example</td><td>vs company average</td><td>vs own location average</td></tr></table>`,
    realWorld: 'Outlier detection ("claims 2× above this CPT code\'s average"), latest-status lookups ("the most recent payment for each invoice") and fraud checks all use per-group comparisons.',
    tips: ['To debug, replace the outer reference with a literal (e.g. i.location_id → 3) and run the inner query alone.'],
    deep: `<p>The same result can be written with a window function: <code>SELECT * FROM (SELECT i.*, AVG(total_amount) OVER (PARTITION BY location_id) AS loc_avg FROM invoices i) WHERE total_amount &gt; loc_avg</code>. That version reads the table once. It is covered in the Window Functions section.</p>`,
    tryIt: { prompt: 'Change the comparison to find invoices BELOW their location\'s average. Then try comparing with the location\'s MAX to find the top invoice per location.', starter: `SELECT i.invoice_id, i.location_id, i.total_amount
FROM invoices i
WHERE i.total_amount > (SELECT AVG(i2.total_amount)
                        FROM invoices i2
                        WHERE i2.location_id = i.location_id)
ORDER BY i.location_id, i.total_amount DESC;` },
    challenge: {
      level: 3,
      prompt: 'Find the charges whose amount is greater than the average amount of charges with the same cpt_code. Show charge_id, cpt_code and amount. Order by cpt_code, then charge_id.',
      solution: `SELECT c.charge_id, c.cpt_code, c.amount
FROM charges c
WHERE c.amount > (SELECT AVG(c2.amount) FROM charges c2 WHERE c2.cpt_code = c.cpt_code)
ORDER BY c.cpt_code, c.charge_id;`,
      hints: ['Outer query: FROM charges c.', 'Inner query: the average amount for ONE cpt_code: the current row\'s code.', 'Correlate with WHERE c2.cpt_code = c.cpt_code (two aliases of charges).', 'WHERE c.amount > (SELECT AVG(c2.amount) FROM charges c2 WHERE c2.cpt_code = c.cpt_code) ORDER BY c.cpt_code, c.charge_id'],
      ordered: true,
    },
    quiz: [
      { q: 'Why can\'t you run a correlated subquery by itself?', options: ['It is too slow', 'It references a column of the outer query that doesn\'t exist alone', 'It needs ORDER BY', 'SQLite forbids it'], answer: 1, why: 'The inner query needs the outer row\'s values (like i.location_id) to run.' },
      { q: 'In the lesson query, what happens if you drop the aliases and write WHERE location_id = location_id?', options: ['Same result', 'Error', 'Every invoice is compared with the company-wide average', 'No rows'], answer: 2, why: 'Both names resolve to the inner table, so the predicate is always true.' },
    ],
  },

  // ─────────────────────────────────────────────── 09
  {
    id: 'subqueries-09',
    goals: [
      'The logical execution model: outer row → run inner → decide',
      'Why correlated subqueries can be slow (N × M)',
      'How indexes and decorrelation make them fast',
      'Rewriting a correlated subquery as a JOIN or window function',
    ],
    concept: `<p>Logically, a correlated subquery is executed like a <b>nested loop</b>:</p>
<ol>
<li>Take the next row from the outer query.</li>
<li>Substitute its values into the inner query (<code>i.location_id → 3</code>).</li>
<li>Run the inner query and get its answer.</li>
<li>Use that answer to keep or discard the row, or to fill in a column.</li>
<li>Repeat for every outer row.</li>
</ol>
<p>With 48 invoices, the inner query runs 48 times. If each run scans 48 rows, that is 2,304 row visits. On a real table with a million invoices, that becomes 10<sup>12</sup>. That is why <b>indexes on the correlation column</b> matter, and why optimizers try to <b>rewrite</b> correlated subqueries into joins.</p>`,
    why: 'Knowing the execution model explains both why correlated subqueries are expressive and why they can be slow, and it tells you how to fix them.',
    when: 'Think about this model whenever a correlated subquery runs over a large outer table, or when EXPLAIN QUERY PLAN shows CORRELATED SCALAR SUBQUERY.',
    analogy: 'A clerk with 48 invoices who walks to the file room once per invoice to pull that clinic\'s ledger. An index is a labeled drawer per clinic. Decorrelation is photocopying every clinic\'s average onto one sheet before starting.',
    exampleSql: `SELECT invoice_id, location_id, total_amount FROM invoices WHERE location_id = 3`,
    syntax: `-- correlated (per-row loop)
SELECT ... FROM t o WHERE o.x > (SELECT AVG(x) FROM t i WHERE i.g = o.g);

-- decorrelated (group once, then join)
SELECT o.* FROM t o
JOIN (SELECT g, AVG(x) AS a FROM t GROUP BY g) s ON s.g = o.g
WHERE o.x > s.a;`,
    sql: `SELECT i.invoice_id, i.location_id, i.total_amount,
       ROUND((SELECT AVG(i2.total_amount)
              FROM invoices i2
              WHERE i2.location_id = i.location_id), 2) AS location_avg
FROM invoices i
WHERE i.location_id IN (3, 5)
ORDER BY i.location_id, i.invoice_id;`,
    breakdown: [
      ['FROM invoices i WHERE i.location_id IN (3, 5)', 'Outer rows: 12 invoices from locations 3 and 5.'],
      ['(SELECT AVG(i2.total_amount) FROM invoices i2 WHERE i2.location_id = i.location_id)', 'Runs once per outer row: 12 times. The rows from location 3 all get 412.86 and the rows from location 5 all get 214.'],
      ['ROUND(..., 2) AS location_avg', 'Shows the value the inner query computed for that row.'],
    ],
    visual: { type: 'correlated' },
    internals: `<p>SQLite compiles the correlated subquery as a subroutine that is re-entered for each outer row, and binds the outer value into a register. It does <b>not</b> memoize results per distinct key, so the seven location-3 rows each recompute the same average. Try <code>EXPLAIN QUERY PLAN</code> on this query: you will see <code>CORRELATED SCALAR SUBQUERY</code>. After <code>CREATE INDEX idx_inv_loc ON invoices(location_id)</code>, the inner step becomes <code>SEARCH i2 USING INDEX idx_inv_loc (location_id=?)</code>.</p>`,
    mistakes: [
      { wrong: `SELECT p.patient_id,
       (SELECT COUNT(*) FROM invoices i WHERE i.patient_id = p.patient_id) AS n_inv,
       (SELECT SUM(total_amount) FROM invoices i WHERE i.patient_id = p.patient_id) AS billed,
       (SELECT MAX(invoice_date) FROM invoices i WHERE i.patient_id = p.patient_id) AS last_visit
FROM patients p;`, why: 'Three correlated subqueries on the same table and key means three loops over invoices per patient. One grouped derived table computes all three in a single pass.', fix: `SELECT p.patient_id, COALESCE(s.n_inv, 0) AS n_inv, s.billed, s.last_visit
FROM patients p
LEFT JOIN (SELECT patient_id, COUNT(*) AS n_inv, SUM(total_amount) AS billed, MAX(invoice_date) AS last_visit
           FROM invoices GROUP BY patient_id) s ON s.patient_id = p.patient_id;` },
    ],
    rules: [
      'Logical model: the inner query re-runs for each outer row.',
      'Cost ≈ outer rows × cost of one inner run. An index shrinks the second factor.',
      'Several correlated subqueries on the same table are better as one grouped join.',
      'EXISTS stops at the first match, so it is often cheaper than COUNT(*) > 0.',
    ],
    compare: `<table><tr><th>Form</th><th>Work (N outer, M inner)</th><th>Best when</th></tr>
<tr><td>Correlated, no index</td><td>N × M</td><td>tiny tables</td></tr>
<tr><td>Correlated + index</td><td>N × log M</td><td>small N, selective lookups</td></tr>
<tr><td>JOIN to grouped derived table</td><td>M + N</td><td>many outer rows</td></tr>
<tr><td>Window function</td><td>one sort/scan</td><td>row + group stat side by side</td></tr></table>`,
    realWorld: 'A dashboard that ran fine on 1,000 test claims times out on 5 million production claims. The cause is almost always a correlated subquery without an index on the correlation key.',
    tips: ['Prefer EXISTS over (SELECT COUNT(*) ...) > 0. EXISTS can stop at the first row.'],
    deep: `<p><b>Decorrelation</b> (also called unnesting) is an optimizer rewrite: a correlated aggregate subquery becomes a grouped derived table joined on the correlation key, and EXISTS / NOT EXISTS become semi- and anti-joins. PostgreSQL unnests EXISTS/IN but not scalar aggregates. SQL Server and Oracle unnest most forms. SQLite relies mainly on indexes (and on automatic indexes it builds on the fly) instead of rewriting.</p>`,
    tryIt: { prompt: 'Rewrite the lesson query without a correlated subquery: JOIN invoices to a derived table of averages per location.', starter: `SELECT i.invoice_id, i.location_id, i.total_amount, ROUND(s.avg_amt, 2) AS location_avg
FROM invoices i
JOIN (SELECT location_id, AVG(total_amount) AS avg_amt FROM invoices GROUP BY location_id) s
  ON s.location_id = i.location_id
WHERE i.location_id IN (3, 5)
ORDER BY i.location_id, i.invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'For each invoice, find its most recent payment row. Return invoice_id, payment_id, payment_date and amount of the latest payment (by payment_date, then highest payment_id on ties) using a correlated subquery. Order by invoice_id.',
      solution: `SELECT p.invoice_id, p.payment_id, p.payment_date, p.amount
FROM payments p
WHERE p.payment_id = (SELECT p2.payment_id
                      FROM payments p2
                      WHERE p2.invoice_id = p.invoice_id
                      ORDER BY p2.payment_date DESC, p2.payment_id DESC
                      LIMIT 1)
ORDER BY p.invoice_id;`,
      hints: ['Outer query: FROM payments p. Keep a row only if it is the latest for its invoice.', 'The inner query returns ONE payment_id: the latest for the same invoice.', 'Inside: WHERE p2.invoice_id = p.invoice_id ORDER BY p2.payment_date DESC, p2.payment_id DESC LIMIT 1.', 'Outer filter: WHERE p.payment_id = (that subquery), then ORDER BY p.invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Outer table 10,000 rows, inner table 50,000 rows, no index on the correlation column. Roughly how many row visits?', options: ['60,000', '500,000', '500,000,000', '10,000'], answer: 2, why: 'Each of the 10,000 outer rows triggers a 50,000-row scan: 5 × 10^8.' },
      { q: 'What is the most effective single fix for a slow correlated subquery?', options: ['Add ORDER BY', 'Index the correlation column in the inner table', 'Use SELECT *', 'Add DISTINCT'], answer: 1, why: 'The index turns each inner scan into a quick seek.' },
    ],
  },

  // ─────────────────────────────────────────────── 10
  {
    id: 'subqueries-10',
    goals: [
      'What a Common Table Expression (CTE) is',
      'WITH name AS (...) syntax',
      'How CTEs make queries read top-to-bottom',
      'Referencing a CTE more than once',
    ],
    concept: `<p>A <b>Common Table Expression</b> (CTE) is a named, temporary result set defined at the <b>start</b> of a query with <code>WITH</code>:</p>
<pre>WITH invoice_balance AS ( ... )
SELECT ... FROM invoice_balance ...;</pre>
<p>Think of it as a derived table that you <b>name first and use afterwards</b>. The query then reads like a recipe: step 1 compute balances, step 2 filter them. You read top to bottom instead of inside out.</p>
<p>A CTE exists only for that one statement. It is not saved like a table or a view.</p>`,
    why: 'Deeply nested subqueries are hard to read and hard to debug. CTEs give each step a name and put the steps in reading order.',
    when: 'Use one whenever a query has an intermediate step worth naming, when the same intermediate result is used twice, or for recursion (a later lesson).',
    analogy: 'Before a billing meeting, you prepare a labeled worksheet ("Invoice balances"), then refer to it by name throughout the discussion instead of re-explaining how you calculated it.',
    exampleSql: `SELECT invoice_id, SUM(amount) AS balance FROM transactions GROUP BY invoice_id ORDER BY invoice_id LIMIT 8`,
    syntax: `WITH cte_name AS (
    SELECT ...
)
SELECT ...
FROM cte_name
WHERE ...;`,
    sql: `WITH invoice_balance AS (
    SELECT invoice_id, SUM(amount) AS balance
    FROM transactions
    GROUP BY invoice_id
)
SELECT b.invoice_id, i.status, b.balance
FROM invoice_balance b
JOIN invoices i ON i.invoice_id = b.invoice_id
WHERE b.balance > 0
ORDER BY b.balance DESC;`,
    breakdown: [
      ['WITH invoice_balance AS ( ... )', 'Defines a named step: the ledger balance of each invoice (charges are +, payments are −).'],
      ['SELECT invoice_id, SUM(amount) AS balance FROM transactions GROUP BY invoice_id', 'The CTE body: one row per invoice with the sum of its ledger entries.'],
      ['FROM invoice_balance b JOIN invoices i', 'The main query uses the CTE like a table and joins it to invoices to get the status.'],
      ['WHERE b.balance > 0', 'Only invoices where money is still owed.'],
      ['ORDER BY b.balance DESC', 'Largest outstanding balance first.'],
    ],
    visual: { type: 'flow', steps: [
      ['WITH invoice_balance: transactions GROUP BY invoice_id', '154 ledger rows → 47 balances'],
      ['FROM invoice_balance JOIN invoices', '47 rows with status'],
      ['WHERE balance > 0', 'invoices still owing'],
      ['ORDER BY balance DESC', 'biggest balances first'],
    ] },
    internals: `<p>In SQLite a CTE that is used only once is treated like a FROM-subquery and may be flattened into the main query. A CTE that is used two or more times is usually <b>materialized</b> once into a temporary table and reused (SQLite 3.35+). The Materialized CTE lesson covers how to control this.</p>`,
    mistakes: [
      { wrong: `WITH invoice_balance AS (
    SELECT invoice_id, SUM(amount) AS balance FROM transactions GROUP BY invoice_id
);
SELECT * FROM invoice_balance;`, why: 'The semicolon ends the statement after the CTE, and a CTE exists only inside its own statement, so the second SELECT cannot see it. Remove the semicolon.', fix: `WITH invoice_balance AS (
    SELECT invoice_id, SUM(amount) AS balance FROM transactions GROUP BY invoice_id
)
SELECT * FROM invoice_balance;` },
    ],
    rules: [
      'WITH comes first; the main SELECT follows immediately (no semicolon between).',
      'A CTE lives only for one statement.',
      'Name CTEs after what they contain (invoice_balance, not t1).',
      'A CTE can be referenced several times in the main query.',
    ],
    compare: `<table><tr><th></th><th>Subquery</th><th>CTE</th><th>View</th><th>Temp table</th></tr>
<tr><td>Named?</td><td>alias only</td><td>yes</td><td>yes</td><td>yes</td></tr>
<tr><td>Lifetime</td><td>query</td><td>statement</td><td>permanent</td><td>session</td></tr>
<tr><td>Reusable in the query</td><td>no</td><td>yes</td><td>yes</td><td>yes</td></tr>
<tr><td>Recursive</td><td>no</td><td>yes</td><td>no</td><td>no</td></tr></table>`,
    realWorld: 'Analytics teams write almost all their reporting SQL as chains of CTEs, such as "billed", "paid", "adjusted", "balance", so reviewers can read each step.',
    tips: ['Debug a CTE by changing the final SELECT to SELECT * FROM cte_name to see what the step produced.'],
    deep: `<p>CTEs were added in SQL:1999. SQLite has supported them since 3.8.3. They can also be used with INSERT, UPDATE and DELETE (<code>WITH ... DELETE FROM t WHERE id IN (SELECT id FROM cte)</code>), which makes complex data fixes readable.</p>`,
    tryIt: { prompt: 'Change the main query to show invoices whose ledger balance is negative (overpaid).', starter: `WITH invoice_balance AS (
    SELECT invoice_id, SUM(amount) AS balance
    FROM transactions
    GROUP BY invoice_id
)
SELECT * FROM invoice_balance
ORDER BY balance DESC;` },
    challenge: {
      level: 2,
      prompt: 'Using a CTE named patient_billed that sums invoice total_amount per patient_id, list patients (patient_id, first_name, last_name, billed) with billed of at least 1000. Order by billed descending.',
      solution: `WITH patient_billed AS (
    SELECT patient_id, SUM(total_amount) AS billed
    FROM invoices
    GROUP BY patient_id
)
SELECT p.patient_id, p.first_name, p.last_name, pb.billed
FROM patient_billed pb
JOIN patients p ON p.patient_id = pb.patient_id
WHERE pb.billed >= 1000
ORDER BY pb.billed DESC;`,
      hints: ['Start with WITH patient_billed AS ( ... ).', 'Inside: SELECT patient_id, SUM(total_amount) AS billed FROM invoices GROUP BY patient_id.', 'Main query: join patient_billed to patients on patient_id.', 'Filter WHERE billed >= 1000 and ORDER BY billed DESC.'],
      ordered: true,
    },
    quiz: [
      { q: 'How long does a CTE exist?', options: ['Until the session ends', 'Forever, like a view', 'Only for the statement it belongs to', 'Until COMMIT'], answer: 2, why: 'A CTE is part of a single statement.' },
      { q: 'What is the main readability benefit of CTEs?', options: ['They are always faster', 'Steps are named and read top-to-bottom', 'They remove the need for JOINs', 'They sort the data'], answer: 1, why: 'CTEs replace inside-out nesting with named, ordered steps.' },
    ],
  },

  // ─────────────────────────────────────────────── 11
  {
    id: 'subqueries-11',
    goals: [
      'Defining several CTEs in one WITH clause',
      'Letting later CTEs build on earlier ones',
      'Structuring a multi-step report as a pipeline',
      'Common syntax slips (commas, repeated WITH)',
    ],
    concept: `<p>One <code>WITH</code> can define <b>several CTEs</b>, separated by commas. Each CTE can use the ones defined <b>before</b> it:</p>
<pre>WITH billed AS (...),
     paid   AS (...),
     summary AS (SELECT ... FROM billed JOIN paid ...)
SELECT ... FROM summary;</pre>
<p>This turns a complicated report into a <b>pipeline</b> of simple steps. Each step does one job, and you can check each one on its own.</p>`,
    why: 'Real reports have several stages (collect, aggregate, combine, rank). Chained CTEs keep each stage simple and testable.',
    when: 'Use them when a query has two or more logical stages, or when you need summaries from several tables combined.',
    analogy: 'An end-of-month close checklist: step 1 total the charges, step 2 total the payments, step 3 reconcile the two sheets. Each step uses the sheets from the steps before.',
    exampleSql: `SELECT location_id, COUNT(*) AS invoices, SUM(total_amount) AS billed FROM invoices GROUP BY location_id`,
    syntax: `WITH step1 AS (SELECT ...),
     step2 AS (SELECT ... FROM step1 ...),
     step3 AS (SELECT ... FROM step2 JOIN other ...)
SELECT ... FROM step3;`,
    sql: `WITH billed AS (
    SELECT location_id, SUM(total_amount) AS billed
    FROM invoices
    GROUP BY location_id
),
paid AS (
    SELECT i.location_id, SUM(p.amount) AS paid
    FROM payments p
    JOIN invoices i ON i.invoice_id = p.invoice_id
    GROUP BY i.location_id
),
summary AS (
    SELECT b.location_id, b.billed, COALESCE(pd.paid, 0) AS paid,
           ROUND(100.0 * COALESCE(pd.paid, 0) / b.billed, 1) AS collection_pct
    FROM billed b
    LEFT JOIN paid pd ON pd.location_id = b.location_id
)
SELECT l.location_name, s.billed, s.paid, s.collection_pct
FROM summary s
JOIN treatment_locations l ON l.location_id = s.location_id
ORDER BY s.collection_pct DESC;`,
    breakdown: [
      ['billed AS (...)', 'Step 1: total billed per location.'],
      ['paid AS (...)', 'Step 2: total collected per location (payments joined to their invoice to find the location).'],
      ['summary AS (... FROM billed LEFT JOIN paid ...)', 'Step 3: builds on steps 1 and 2, computing the collection rate.'],
      ['SELECT ... FROM summary JOIN treatment_locations', 'Final step: add location names and sort.'],
    ],
    visual: { type: 'flow', steps: [
      ['billed: invoices GROUP BY location', '5 rows'],
      ['paid: payments ⋈ invoices GROUP BY location', '5 rows'],
      ['summary: billed LEFT JOIN paid', '5 rows + collection_pct'],
      ['final: summary JOIN treatment_locations', '5 named rows, best collection first'],
    ] },
    internals: `<p>SQLite parses all CTEs in the WITH list and keeps them in scope for the rest of the statement. Each CTE is planned where it is referenced. A CTE that is never referenced is simply ignored and costs nothing.</p>`,
    mistakes: [
      { wrong: `WITH billed AS (SELECT location_id, SUM(total_amount) AS billed FROM invoices GROUP BY location_id)
WITH paid AS (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id)
SELECT * FROM billed;`, why: 'Write WITH only once. Additional CTEs are separated by commas.', fix: `WITH billed AS (SELECT location_id, SUM(total_amount) AS billed FROM invoices GROUP BY location_id),
     paid AS (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id)
SELECT * FROM billed;` },
      { wrong: `WITH summary AS (SELECT * FROM billed),
     billed AS (SELECT location_id, SUM(total_amount) AS billed FROM invoices GROUP BY location_id)
SELECT * FROM summary;`, why: 'A CTE can only use CTEs defined before it (in non-recursive WITH). Order the steps so that dependencies come first.', fix: `WITH billed AS (SELECT location_id, SUM(total_amount) AS billed FROM invoices GROUP BY location_id),
     summary AS (SELECT * FROM billed)
SELECT * FROM summary;` },
    ],
    rules: [
      'One WITH, many CTEs, separated by commas.',
      'No comma after the last CTE, right before the main SELECT.',
      'Each CTE can reference CTEs defined earlier in the list.',
      'CTE names must be unique within the WITH clause.',
    ],
    compare: `<p>The same report written as nested derived tables needs three levels of parentheses and repeats the join logic. The CTE version reads like the checklist you would explain to a colleague, and you can test each step by selecting from it.</p>`,
    realWorld: 'Month-end revenue-cycle reports: charges → payments → adjustments → net collections → rank locations. Each stage is a CTE.',
    tips: ['Write and test CTEs one at a time: add a step, then SELECT * FROM that step, and move on once it looks right.'],
    deep: `<p>Order matters only for dependencies. In a <code>WITH RECURSIVE</code> clause, SQLite and PostgreSQL relax the ordering rule so a CTE may reference later ones. Standard SQL treats the whole list as mutually visible only under RECURSIVE.</p>`,
    tryIt: { prompt: 'Add a fourth step, ranked, that keeps only locations with collection_pct below 80.', starter: `WITH billed AS (
    SELECT location_id, SUM(total_amount) AS billed FROM invoices GROUP BY location_id
),
paid AS (
    SELECT i.location_id, SUM(p.amount) AS paid
    FROM payments p JOIN invoices i ON i.invoice_id = p.invoice_id
    GROUP BY i.location_id
)
SELECT b.location_id, b.billed, pd.paid
FROM billed b LEFT JOIN paid pd ON pd.location_id = b.location_id;` },
    challenge: {
      level: 3,
      prompt: 'Using two CTEs, compute per payor_id (1) the number of invoices (invoice_count) and (2) the total paid by that payor itself from the payments table (payor_paid; payments.payor_id = the payor). Show payor_name, invoice_count and payor_paid (0 if none) for payors that have at least one invoice. Order by payor_paid descending, then payor_name.',
      solution: `WITH inv AS (
    SELECT payor_id, COUNT(*) AS invoice_count
    FROM invoices
    WHERE payor_id IS NOT NULL
    GROUP BY payor_id
),
pay AS (
    SELECT payor_id, SUM(amount) AS payor_paid
    FROM payments
    WHERE payor_id IS NOT NULL
    GROUP BY payor_id
)
SELECT py.payor_name, inv.invoice_count, COALESCE(pay.payor_paid, 0) AS payor_paid
FROM inv
JOIN payors py ON py.payor_id = inv.payor_id
LEFT JOIN pay ON pay.payor_id = inv.payor_id
ORDER BY payor_paid DESC, py.payor_name;`,
      hints: ['CTE 1 (inv): invoices grouped by payor_id with COUNT(*).', 'CTE 2 (pay): payments grouped by payor_id with SUM(amount). Skip NULL payor_id (those are patient payments).', 'Main query: FROM inv JOIN payors, LEFT JOIN pay (a payor may have invoices but no payments).', 'COALESCE(pay.payor_paid, 0) AS payor_paid ... ORDER BY payor_paid DESC, py.payor_name'],
      ordered: true,
    },
    quiz: [
      { q: 'How are multiple CTEs separated?', options: ['Semicolons', 'Repeating WITH', 'Commas', 'AND'], answer: 2, why: 'WITH a AS (...), b AS (...) SELECT ...' },
      { q: 'Can CTE #3 reference CTE #1?', options: ['No, never', 'Yes, later CTEs can use earlier ones', 'Only with RECURSIVE', 'Only if they have the same columns'], answer: 1, why: 'Each CTE sees all the CTEs defined before it.' },
    ],
  },

  // ─────────────────────────────────────────────── 12
  {
    id: 'subqueries-12',
    goals: [
      'The anchor + recursive member structure of WITH RECURSIVE',
      'How recursion runs level by level until no new rows appear',
      'Generating series (numbers, dates) with recursion',
      'Guarding against infinite loops',
    ],
    concept: `<p>A <b>recursive CTE</b> refers to <b>itself</b>. It has two parts joined by <code>UNION ALL</code>:</p>
<ol>
<li><b>Anchor member</b>: the starting rows (for example, the top boss, whose supervisor_id IS NULL).</li>
<li><b>Recursive member</b>: a query that joins the CTE to the table to find the <b>next level</b> (the people whose supervisor is someone already found).</li>
</ol>
<p>The engine runs the anchor, then repeatedly runs the recursive member on the rows found in the <b>previous round</b>. It stops when a round produces no new rows. For our practitioners: Elena (level 0) → her 4 direct reports (level 1) → their reports (level 2) → David Kim (level 3) → nothing more, so it stops.</p>`,
    why: 'Hierarchies (org charts, referral chains, CPT code groups) and sequences (every day of a month) have no fixed depth. Normal joins need you to know the depth; recursion does not.',
    when: 'Use one for trees and graphs (supervisor chains, parent/child categories), for generating number or date series, and for walking chains of references.',
    analogy: 'Phoning a practice by chain of command: the medical director calls her direct reports, each of them calls theirs, and so on, until someone has nobody left to call.',
    exampleSql: `SELECT practitioner_id, first_name, last_name, supervisor_id FROM practitioners ORDER BY practitioner_id`,
    syntax: `WITH RECURSIVE cte(cols) AS (
    SELECT ...                  -- anchor: starting rows
    UNION ALL
    SELECT ...                  -- recursive member
    FROM table JOIN cte ON ...  -- references cte itself
)
SELECT * FROM cte;`,
    sql: `WITH RECURSIVE org AS (
    SELECT practitioner_id, first_name || ' ' || last_name AS name,
           supervisor_id, 0 AS level
    FROM practitioners
    WHERE supervisor_id IS NULL
    UNION ALL
    SELECT p.practitioner_id, p.first_name || ' ' || p.last_name,
           p.supervisor_id, org.level + 1
    FROM practitioners p
    JOIN org ON p.supervisor_id = org.practitioner_id
)
SELECT level, practitioner_id, name, supervisor_id
FROM org
ORDER BY level, practitioner_id;`,
    breakdown: [
      ['WITH RECURSIVE org AS (', 'RECURSIVE tells the engine that org refers to itself.'],
      ['SELECT ... 0 AS level FROM practitioners WHERE supervisor_id IS NULL', 'Anchor: the root of the tree, Elena Ramirez, at level 0.'],
      ['UNION ALL', 'Adds each new round of rows to the result.'],
      ['FROM practitioners p JOIN org ON p.supervisor_id = org.practitioner_id', 'Recursive member: people whose supervisor was found in the previous round.'],
      ['org.level + 1', 'Each round is one level deeper.'],
      ['SELECT ... FROM org ORDER BY level, practitioner_id', 'Read the finished result like a normal table.'],
    ],
    visual: { type: 'recursive' },
    internals: `<p>SQLite keeps a <b>queue</b>. The anchor rows are placed in it. Then, repeatedly, one row is taken off the queue, added to the result, and the recursive member runs with <i>only that row</i> as the content of <code>org</code>. Any rows it produces go back on the queue. When the queue is empty, recursion ends. Adding <code>ORDER BY</code> inside the CTE turns the queue into a priority queue (useful for depth-first output). <code>LIMIT</code> inside the CTE caps the total rows, which is a safety net against infinite loops.</p>`,
    mistakes: [
      { wrong: `WITH RECURSIVE n(x) AS (
    SELECT 1
    UNION ALL
    SELECT x + 1 FROM n
)
SELECT x FROM n;`, why: 'There is no stop condition, so the recursive member always produces a new row and the query runs forever (or until memory runs out). Add a WHERE that eventually becomes false.', fix: `WITH RECURSIVE n(x) AS (
    SELECT 1
    UNION ALL
    SELECT x + 1 FROM n WHERE x < 10
)
SELECT x FROM n;` },
      { wrong: `WITH org AS (
    SELECT practitioner_id, 0 AS level FROM practitioners WHERE supervisor_id IS NULL
    UNION ALL
    SELECT p.practitioner_id, org.level + 1 FROM practitioners p JOIN org ON p.supervisor_id = org.practitioner_id
)
SELECT * FROM org;`, why: 'SQLite happens to accept a self-reference without the RECURSIVE keyword, but PostgreSQL and MySQL require it and error without it. Always write WITH RECURSIVE to be clear and portable.', fix: `WITH RECURSIVE org AS (
    SELECT practitioner_id, 0 AS level FROM practitioners WHERE supervisor_id IS NULL
    UNION ALL
    SELECT p.practitioner_id, org.level + 1 FROM practitioners p JOIN org ON p.supervisor_id = org.practitioner_id
)
SELECT * FROM org;` },
    ],
    rules: [
      'Anchor first, then UNION ALL, then the recursive member.',
      'The recursive member must reference the CTE exactly once.',
      'Always include a stop condition (a WHERE, or data that ends naturally).',
      'UNION (not ALL) removes duplicates, which can stop cycles, but costs more.',
      'Aggregates and window functions are not allowed in the recursive member.',
    ],
    compare: `<table><tr><th>Task</th><th>Without recursion</th><th>With recursion</th></tr>
<tr><td>Direct reports</td><td>1 self-join</td><td>overkill</td></tr>
<tr><td>All reports, any depth</td><td>unknown number of self-joins</td><td>one recursive CTE</td></tr>
<tr><td>Every date in a month</td><td>a calendar table</td><td>generate on the fly</td></tr></table>`,
    realWorld: 'Org charts and supervision chains for credentialing, generating a date spine for daily revenue reports (so days with zero invoices still appear), and walking chains of claim resubmissions.',
    tips: ['While developing, add LIMIT 100 to the final SELECT (or inside the CTE) so a mistake cannot run forever.'],
    deep: `<p>Generate a date series for September 2026:</p>
<pre>WITH RECURSIVE d(day) AS (
  SELECT date('2026-09-01')
  UNION ALL
  SELECT date(day, '+1 day') FROM d WHERE day &lt; '2026-09-30'
) SELECT day FROM d;</pre>
<p>LEFT JOIN a series like this to invoices to get daily counts that include empty days. That is called a <i>date spine</i>, a standard analytics technique.</p>`,
    tryIt: { prompt: 'Generate all the months from 2025-01 to 2025-12 as text like \'2025-01-01\'. Then LEFT JOIN them to invoices to count invoices per month, including zero months.', starter: `WITH RECURSIVE months(m) AS (
    SELECT date('2025-01-01')
    UNION ALL
    SELECT date(m, '+1 month') FROM months WHERE m < '2025-12-01'
)
SELECT m FROM months;` },
    challenge: {
      level: 3,
      prompt: 'Using a recursive CTE, list everyone in James Okafor\'s team at any depth (practitioner 2 and everyone below him). Return practitioner_id, last_name and depth (0 for James). Order by depth, then practitioner_id.',
      solution: `WITH RECURSIVE team AS (
    SELECT practitioner_id, last_name, 0 AS depth
    FROM practitioners
    WHERE practitioner_id = 2
    UNION ALL
    SELECT p.practitioner_id, p.last_name, t.depth + 1
    FROM practitioners p
    JOIN team t ON p.supervisor_id = t.practitioner_id
)
SELECT practitioner_id, last_name, depth
FROM team
ORDER BY depth, practitioner_id;`,
      hints: ['The anchor is a single row: WHERE practitioner_id = 2, with depth 0.', 'The recursive member finds practitioners whose supervisor_id is someone already in the CTE.', 'JOIN team t ON p.supervisor_id = t.practitioner_id, and select t.depth + 1.', 'Final: SELECT practitioner_id, last_name, depth FROM team ORDER BY depth, practitioner_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'When does a recursive CTE stop?', options: ['After 10 levels', 'When a round produces no new rows', 'When ORDER BY is reached', 'Never, it needs LIMIT'], answer: 1, why: 'Recursion ends when the recursive member returns nothing new.' },
      { q: 'What does the anchor member do?', options: ['Stops the recursion', 'Produces the starting rows', 'Sorts the output', 'Removes duplicates'], answer: 1, why: 'The anchor seeds the recursion. Every later round builds on it.' },
      { q: 'What is David Kim\'s level (Elena = 0, Kim reports to Rossi, Rossi to Okafor, Okafor to Elena)?', options: ['1', '2', '3', '4'], answer: 2, why: 'Elena 0 → Okafor 1 → Rossi 2 → Kim 3.' },
    ],
  },

  // ─────────────────────────────────────────────── 13
  {
    id: 'subqueries-13',
    goals: [
      'Modeling hierarchies with a self-referencing key (adjacency list)',
      'Building a readable path (Ramirez > Okafor > Rossi)',
      'Walking up the chain (ancestors) vs down (descendants)',
      'Aggregating over subtrees (team size, team billing)',
    ],
    concept: `<p><b>Hierarchical data</b> is stored as an <b>adjacency list</b>: each row points to its parent. In our database, <code>practitioners.supervisor_id</code> points to another practitioner.</p>
<p>Recursive CTEs let you answer three kinds of questions:</p>
<ul>
<li><b>Down the tree</b> (descendants): "Who is in Dr. Okafor's team?" Start at Okafor and repeatedly find children.</li>
<li><b>Up the tree</b> (ancestors): "What is David Kim's chain of command?" Start at Kim and repeatedly find the parent.</li>
<li><b>Paths and depth</b>: carry a growing text <code>path</code> and a <code>depth</code> counter through the recursion to draw the tree.</li>
</ul>
<p>Sorting by the path puts each person directly under their supervisor, like an indented org chart.</p>`,
    why: 'Clinical organizations are hierarchical: supervision, departments, referral networks. Reports often need the whole subtree, not just direct reports.',
    when: 'Use this whenever a table has a column pointing to the same table (supervisor_id, parent_id) and you need depth, full paths, or subtree totals.',
    analogy: 'Tracing a claim\'s approval: a physical therapist\'s note is co-signed by the lead therapist, who reports to the family medicine lead, who reports to the medical director. Walking up that chain is an ancestor query.',
    exampleSql: `SELECT practitioner_id, last_name, specialty, supervisor_id FROM practitioners ORDER BY supervisor_id, practitioner_id`,
    syntax: `WITH RECURSIVE tree AS (
    SELECT id, name, 0 AS depth, name AS path FROM t WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.name, tree.depth + 1, tree.path || ' > ' || c.name
    FROM t c JOIN tree ON c.parent_id = tree.id
)
SELECT * FROM tree ORDER BY path;`,
    sql: `WITH RECURSIVE tree AS (
    SELECT practitioner_id, last_name, specialty,
           0 AS depth, last_name AS path
    FROM practitioners
    WHERE supervisor_id IS NULL
    UNION ALL
    SELECT p.practitioner_id, p.last_name, p.specialty,
           t.depth + 1, t.path || ' > ' || p.last_name
    FROM practitioners p
    JOIN tree t ON p.supervisor_id = t.practitioner_id
)
SELECT substr('            ', 1, depth * 3) || last_name AS org_chart,
       specialty, depth, path
FROM tree
ORDER BY path;`,
    breakdown: [
      ['0 AS depth, last_name AS path', 'Anchor: the root starts at depth 0 with a one-name path.'],
      ['t.depth + 1, t.path || \' > \' || p.last_name', 'Each child extends its parent\'s path and depth.'],
      ['JOIN tree t ON p.supervisor_id = t.practitioner_id', 'Walks DOWN: finds children of rows already in the tree.'],
      ['substr(\'            \', 1, depth * 3) || last_name', 'Indents names by depth to draw the org chart.'],
      ['ORDER BY path', 'Sorting by the path puts everyone right under their supervisor.'],
    ],
    visual: { type: 'recursive' },
    internals: `<p>The path string grows at each level, so very deep trees produce long strings. That is fine for org charts, but for graphs with thousands of levels, compare ids instead. Sorting by path works because every child's path starts with its parent's path. Note that siblings are sorted alphabetically by last name.</p>`,
    mistakes: [
      { wrong: `WITH RECURSIVE chain AS (
    SELECT practitioner_id, supervisor_id, last_name FROM practitioners WHERE practitioner_id = 6
    UNION ALL
    SELECT p.practitioner_id, p.supervisor_id, p.last_name
    FROM practitioners p JOIN chain c ON p.supervisor_id = c.practitioner_id
)
SELECT * FROM chain;`, why: 'To walk UP to the ancestors, the join must go from the child\'s supervisor_id to the parent\'s practitioner_id. This version walks DOWN from Kim, and since he has no reports, it returns only Kim.', fix: `WITH RECURSIVE chain AS (
    SELECT practitioner_id, supervisor_id, last_name FROM practitioners WHERE practitioner_id = 6
    UNION ALL
    SELECT p.practitioner_id, p.supervisor_id, p.last_name
    FROM practitioners p JOIN chain c ON p.practitioner_id = c.supervisor_id
)
SELECT * FROM chain;` },
    ],
    rules: [
      'Down the tree: child.parent_id = cte.id.',
      'Up the tree: parent.id = cte.parent_id.',
      'Carry depth and path columns through the recursion for display.',
      'For data that may contain cycles, track visited ids in the path and stop on repeats.',
    ],
    compare: `<table><tr><th>Model</th><th>Store</th><th>Query subtree</th><th>Move a node</th></tr>
<tr><td>Adjacency list (ours)</td><td>parent_id</td><td>recursive CTE</td><td>update 1 row</td></tr>
<tr><td>Materialized path</td><td>'1/2/5/6'</td><td>LIKE '1/2/%'</td><td>update the subtree</td></tr>
<tr><td>Nested sets</td><td>lft, rgt</td><td>BETWEEN</td><td>renumber many rows</td></tr>
<tr><td>Closure table</td><td>all ancestor pairs</td><td>simple join</td><td>many rows</td></tr></table>`,
    realWorld: 'Supervision reports for credentialing, rolling up billing per department head, and approval chains for high-dollar write-offs.',
    tips: ['To guard against cycles in messy data, add WHERE instr(t.path, p.last_name) = 0 (or track ids) in the recursive member.'],
    deep: `<p><b>Subtree aggregation:</b> first build a table of (manager, member) pairs with a recursive CTE that carries the root id along (<code>SELECT practitioner_id AS root, practitioner_id AS member ... UNION ALL SELECT t.root, p.practitioner_id ...</code>), then join it to charges and <code>GROUP BY root</code> to get each supervisor's team billing, including their own. The same result is a closure table computed on the fly.</p>`,
    tryIt: { prompt: 'Walk UP the chain from David Kim (practitioner 6) to the top, showing each step with a level number.', starter: `WITH RECURSIVE chain AS (
    SELECT practitioner_id, supervisor_id, last_name, 0 AS up
    FROM practitioners WHERE practitioner_id = 6
    UNION ALL
    SELECT p.practitioner_id, p.supervisor_id, p.last_name, c.up + 1
    FROM practitioners p JOIN chain c ON p.practitioner_id = c.supervisor_id
)
SELECT * FROM chain;` },
    challenge: {
      level: 4,
      prompt: 'For every practitioner, count how many people are in their subtree BELOW them (all levels, excluding themselves) as team_size. Include practitioners with 0. Show practitioner_id, last_name, team_size ordered by team_size descending, then practitioner_id.',
      solution: `WITH RECURSIVE reach AS (
    SELECT practitioner_id AS root, practitioner_id AS member
    FROM practitioners
    UNION ALL
    SELECT r.root, p.practitioner_id
    FROM practitioners p
    JOIN reach r ON p.supervisor_id = r.member
)
SELECT pr.practitioner_id, pr.last_name, COUNT(*) - 1 AS team_size
FROM reach r
JOIN practitioners pr ON pr.practitioner_id = r.root
GROUP BY pr.practitioner_id, pr.last_name
ORDER BY team_size DESC, pr.practitioner_id;`,
      hints: ['Start the recursion from EVERY practitioner at once, carrying their id as root.', 'Anchor: SELECT practitioner_id AS root, practitioner_id AS member FROM practitioners.', 'Recursive member: JOIN reach r ON p.supervisor_id = r.member, and keep r.root.', 'GROUP BY root and use COUNT(*) - 1 (the root counted itself). Order by team_size DESC, practitioner_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'To find all ANCESTORS of a practitioner, the recursive join is...', options: ['p.supervisor_id = cte.practitioner_id', 'p.practitioner_id = cte.supervisor_id', 'p.location_id = cte.location_id', 'p.practitioner_id = cte.practitioner_id'], answer: 1, why: 'Going up means finding the row whose id equals the current row\'s supervisor_id.' },
      { q: 'Why does ORDER BY path produce an indented org-chart order?', options: ['Paths are numeric', 'Each child\'s path starts with its parent\'s path, so it sorts right after the parent', 'SQLite sorts trees automatically', 'It doesn\'t'], answer: 1, why: 'Prefix ordering puts every subtree directly under its root.' },
    ],
  },

  // ─────────────────────────────────────────────── 14
  {
    id: 'subqueries-14',
    goals: [
      'Writing the same logic as a nested subquery and as a CTE',
      'Readability, reuse and debugging differences',
      'When a CTE is required (recursion, reuse) and when a subquery is fine',
      'Whether they perform differently',
    ],
    concept: `<p>A non-recursive CTE and a derived table (FROM-subquery) usually <b>mean the same thing</b>. The difference is <b>where</b> you write it:</p>
<ul>
<li><b>Subquery</b>: written inline, right where it is used. Good for small one-off steps.</li>
<li><b>CTE</b>: named at the top and used by name later. Better for multi-step logic, for reuse, and required for recursion.</li>
</ul>
<p>Both queries in this lesson return the same rows: patients whose total billed amount is above the average patient's total. Compare how they read.</p>`,
    why: 'Choosing well makes queries easier to read, review and maintain, and tells you when a rewrite changes nothing about performance.',
    when: 'Use a subquery for one small, obvious step. Use a CTE for two or more steps, for a step used twice, for recursion, or whenever a name adds clarity.',
    analogy: 'A subquery is a note written in the margin exactly where you need it. A CTE is a labeled appendix at the front of the report that every page can point to.',
    exampleSql: `SELECT patient_id, SUM(total_amount) AS billed FROM invoices GROUP BY patient_id ORDER BY billed DESC LIMIT 8`,
    syntax: `-- Subquery form
SELECT ... FROM (SELECT ...) AS t WHERE t.x > (SELECT AVG(x) FROM (SELECT ...) AS t2);

-- CTE form
WITH t AS (SELECT ...)
SELECT ... FROM t WHERE t.x > (SELECT AVG(x) FROM t);`,
    sql: `WITH patient_billed AS (
    SELECT patient_id, SUM(total_amount) AS billed
    FROM invoices
    GROUP BY patient_id
)
SELECT patient_id, billed
FROM patient_billed
WHERE billed > (SELECT AVG(billed) FROM patient_billed)
ORDER BY billed DESC;`,
    breakdown: [
      ['WITH patient_billed AS (...)', 'Computes the per-patient totals once, with a name.'],
      ['FROM patient_billed', 'First use: the rows to report.'],
      ['(SELECT AVG(billed) FROM patient_billed)', 'Second use: the average patient total. In the subquery form, this whole GROUP BY would have to be written twice.'],
      ['ORDER BY billed DESC', 'Largest billed patients first.'],
    ],
    visual: { type: 'flow', steps: [
      ['CTE patient_billed', '48 invoices → 20 patient totals'],
      ['AVG(billed) over the CTE', '1 value (578.5)'],
      ['WHERE billed > avg', 'patients above average'],
      ['ORDER BY billed DESC', 'biggest first'],
    ] },
    internals: `<p>When a CTE is referenced twice, SQLite usually materializes it once and reads it twice. The equivalent subquery form has two separate copies that are each computed. Referenced once, both forms normally compile to the same plan.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id, billed
FROM (SELECT patient_id, SUM(total_amount) AS billed FROM invoices GROUP BY patient_id) t
WHERE billed > (SELECT AVG(billed) FROM t);`, why: 'A derived-table alias (t) is only visible in the FROM where it is defined, not inside another subquery. You would have to repeat the whole subquery. A CTE solves this.', fix: `WITH t AS (SELECT patient_id, SUM(total_amount) AS billed FROM invoices GROUP BY patient_id)
SELECT patient_id, billed FROM t WHERE billed > (SELECT AVG(billed) FROM t);` },
    ],
    rules: [
      'Non-recursive CTE ≈ derived table with a name.',
      'Reuse or recursion means a CTE.',
      'One small step used once: either form is fine.',
      'Readability is the main reason to choose; performance is usually equal.',
    ],
    compare: `<table><tr><th></th><th>Subquery</th><th>CTE</th></tr>
<tr><td>Reading order</td><td>inside-out</td><td>top-to-bottom</td></tr>
<tr><td>Reuse in the same query</td><td>copy and paste</td><td>by name</td></tr>
<tr><td>Recursion</td><td>no</td><td>yes</td></tr>
<tr><td>Debug a step</td><td>cut it out and run it</td><td>SELECT * FROM step</td></tr>
<tr><td>Correlated use</td><td>yes (per-row subquery)</td><td>no (a CTE cannot reference the outer row)</td></tr>
<tr><td>Performance</td><td colspan="2">usually identical; engines differ on materialization (see CTE Performance)</td></tr></table>`,
    realWorld: 'Code-review guidelines at many analytics teams say: "No more than one level of nested subquery; use CTEs." Short ad-hoc checks still use quick subqueries.',
    tips: ['If you are about to copy and paste a subquery, turn it into a CTE instead.'],
    deep: `<p>Before PostgreSQL 12, CTEs were always materialized (an "optimization fence"), so moving a filter into a CTE could make queries slower. Since version 12, PostgreSQL inlines single-use CTEs, just as SQLite does. SQL Server never materializes CTEs, so a CTE referenced twice is computed twice there.</p>`,
    tryIt: { prompt: 'Rewrite the lesson query using ONLY subqueries (no WITH). Notice that you must repeat the GROUP BY.', starter: `SELECT patient_id, billed
FROM (SELECT patient_id, SUM(total_amount) AS billed FROM invoices GROUP BY patient_id) t
WHERE billed > (SELECT AVG(billed)
                FROM (SELECT SUM(total_amount) AS billed FROM invoices GROUP BY patient_id))
ORDER BY billed DESC;` },
    challenge: {
      level: 3,
      prompt: 'Using a CTE of charge totals per practitioner (practitioner_id, total_charged), return the practitioners whose total_charged is above the average of those totals. Show practitioner_id and total_charged, ordered by total_charged descending.',
      solution: `WITH prac AS (
    SELECT practitioner_id, SUM(amount) AS total_charged
    FROM charges
    GROUP BY practitioner_id
)
SELECT practitioner_id, total_charged
FROM prac
WHERE total_charged > (SELECT AVG(total_charged) FROM prac)
ORDER BY total_charged DESC;`,
      hints: ['CTE: SELECT practitioner_id, SUM(amount) AS total_charged FROM charges GROUP BY practitioner_id.', 'Use the CTE twice: once for the rows, once for the average.', 'WHERE total_charged > (SELECT AVG(total_charged) FROM prac)', 'ORDER BY total_charged DESC.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which of these REQUIRES a CTE?', options: ['Filtering by a list', 'A recursive org chart', 'A scalar comparison', 'Counting rows'], answer: 1, why: 'Only CTEs can be recursive.' },
      { q: 'Can a derived-table alias defined in FROM be reused inside a scalar subquery in WHERE?', options: ['Yes', 'No, it must be repeated (or turned into a CTE)', 'Only in SQLite', 'Only with LATERAL'], answer: 1, why: 'Derived-table names are local to their FROM clause. CTE names are visible to the whole statement.' },
    ],
  },

  // ─────────────────────────────────────────────── 15
  {
    id: 'subqueries-15',
    goals: [
      'CTEs and JOINs are complementary, not alternatives',
      'When a plain JOIN is enough',
      'When pre-aggregating in a CTE before joining is necessary',
      'Semi-joins: CTE + IN/EXISTS vs JOIN + DISTINCT',
    ],
    concept: `<p>"CTE vs JOIN" is really a question about <b>shape</b>:</p>
<ul>
<li>If you only need columns from related rows (invoice + patient name), a <b>plain JOIN</b> is simplest. A CTE would just add ceremony.</li>
<li>If a related table must be <b>summarized first</b> (total paid per invoice), put the aggregation in a <b>CTE</b> and then JOIN to it. Joining first and aggregating afterwards risks fan-out.</li>
<li>If you only want to know whether a match exists, a JOIN can <b>duplicate</b> rows. Use EXISTS / IN (or a CTE of distinct keys) instead of JOIN + DISTINCT.</li>
</ul>
<p>CTEs normally <i>contain</i> joins and are <i>joined to</i>. They organize the query, and joins combine tables inside it.</p>`,
    why: 'Picking the right tool avoids both over-engineering and silent double-counting.',
    when: 'Use a JOIN for row-level lookups, a CTE + JOIN for aggregate-then-combine, and EXISTS for membership checks.',
    analogy: 'Pulling a patient\'s chart for each invoice is a JOIN. Asking accounting for "one total per invoice" before matching it to the invoice list is a CTE + JOIN.',
    exampleSql: `SELECT i.invoice_id, p.first_name, p.last_name, i.total_amount FROM invoices i JOIN patients p ON p.patient_id = i.patient_id ORDER BY i.invoice_id LIMIT 6`,
    syntax: `WITH summary AS (SELECT key, AGG(x) AS v FROM child GROUP BY key)
SELECT p.*, s.v
FROM parent p
LEFT JOIN summary s ON s.key = p.key;`,
    sql: `WITH paid AS (
    SELECT invoice_id, SUM(amount) AS paid, COUNT(*) AS payment_count
    FROM payments
    GROUP BY invoice_id
)
SELECT i.invoice_id,
       p.last_name,
       i.total_amount,
       COALESCE(pd.paid, 0) AS paid,
       COALESCE(pd.payment_count, 0) AS payment_count
FROM invoices i
JOIN patients p     ON p.patient_id = i.patient_id
LEFT JOIN paid pd   ON pd.invoice_id = i.invoice_id
WHERE i.location_id = 3
ORDER BY i.invoice_id;`,
    breakdown: [
      ['WITH paid AS (... GROUP BY invoice_id)', 'Summarize payments first: one row per invoice.'],
      ['JOIN patients p ON ...', 'A plain JOIN for a row-level lookup (the patient\'s name). No CTE needed.'],
      ['LEFT JOIN paid pd ON ...', 'Join the summary: 1 invoice to at most 1 summary row, so there is no fan-out.'],
      ['WHERE i.location_id = 3', 'Invoices at Northside Urgent Care.'],
    ],
    visual: { type: 'flow', steps: [
      ['CTE paid: payments GROUP BY invoice_id', '47 → 29 rows'],
      ['invoices JOIN patients', 'row lookup: 1 patient per invoice'],
      ['LEFT JOIN paid', '1:1, no duplication'],
      ['WHERE location_id = 3', '7 rows'],
    ] },
    internals: `<p>The optimizer sees through the CTE: it is just another input to the join. For a join to an aggregated CTE, SQLite typically materializes the CTE and builds an automatic index on <code>invoice_id</code>. The patients join uses the primary key directly.</p>`,
    mistakes: [
      { wrong: `SELECT DISTINCT pt.patient_id, pt.last_name
FROM patients pt
JOIN invoices i ON i.patient_id = pt.patient_id
WHERE i.status = 'Overdue';`, why: 'It works, but the JOIN first creates one row per overdue invoice and DISTINCT then has to remove the copies. A semi-join states the intent ("has an overdue invoice") and never creates duplicates.', fix: `SELECT pt.patient_id, pt.last_name
FROM patients pt
WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = pt.patient_id AND i.status = 'Overdue');` },
    ],
    rules: [
      'Row lookups: a plain JOIN.',
      'Summaries of a child table: a CTE (or derived table) and then a JOIN.',
      '"Has any match": EXISTS / IN, not JOIN + DISTINCT.',
      'Check row counts after every join.',
    ],
    compare: `<table><tr><th>Need</th><th>Best tool</th></tr>
<tr><td>Invoice + patient name</td><td>JOIN</td></tr>
<tr><td>Invoice + total paid</td><td>CTE (aggregate) + LEFT JOIN</td></tr>
<tr><td>Patients with any overdue invoice</td><td>EXISTS</td></tr>
<tr><td>Patients with no invoice</td><td>NOT EXISTS / LEFT JOIN ... IS NULL</td></tr>
<tr><td>Multi-step report</td><td>chained CTEs containing JOINs</td></tr></table>`,
    realWorld: 'Invoice detail screens join patient and payor rows directly, while their "amount paid" and "last payment" columns come from a pre-aggregated payments CTE.',
    tips: ['If a query has GROUP BY and joins to two or more one-to-many tables, pre-aggregate in CTEs.'],
    deep: `<p>Some engines can do <i>eager aggregation</i> (pushing GROUP BY below a join) on their own, but most, including SQLite, do not. Writing the aggregation in a CTE makes the intended plan explicit and keeps the results correct regardless of the optimizer.</p>`,
    tryIt: { prompt: 'Add a second CTE with the charge count per invoice and join it as well.', starter: `WITH paid AS (
    SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id
)
SELECT i.invoice_id, i.total_amount, COALESCE(pd.paid, 0) AS paid
FROM invoices i
LEFT JOIN paid pd ON pd.invoice_id = i.invoice_id
WHERE i.location_id = 3
ORDER BY i.invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'For each practitioner who has charges, show last_name, the number of distinct invoices they worked on (invoice_count) and their total charged amount (total_charged). Aggregate charges in a CTE first, then JOIN to practitioners. Order by total_charged descending, then last_name.',
      solution: `WITH prac AS (
    SELECT practitioner_id,
           COUNT(DISTINCT invoice_id) AS invoice_count,
           SUM(amount) AS total_charged
    FROM charges
    GROUP BY practitioner_id
)
SELECT p.last_name, prac.invoice_count, prac.total_charged
FROM prac
JOIN practitioners p ON p.practitioner_id = prac.practitioner_id
ORDER BY prac.total_charged DESC, p.last_name;`,
      hints: ['Aggregate charges per practitioner in a CTE.', 'COUNT(DISTINCT invoice_id) counts invoices, not charge lines.', 'JOIN the CTE to practitioners for last_name.', 'ORDER BY total_charged DESC, last_name.'],
      ordered: true,
    },
    quiz: [
      { q: 'You need each invoice with its patient\'s name. Best choice?', options: ['A recursive CTE', 'A plain JOIN', 'A correlated EXISTS', 'UNION'], answer: 1, why: 'A simple row lookup needs only a JOIN.' },
      { q: 'Why aggregate payments in a CTE before joining to invoices + charges?', options: ['CTEs are always faster', 'To avoid fan-out that inflates sums', 'JOINs cannot use SUM', 'To sort the result'], answer: 1, why: 'Pre-aggregating makes it a one-to-one join, so nothing is multiplied.' },
    ],
  },

  // ─────────────────────────────────────────────── 16
  {
    id: 'subqueries-16',
    goals: [
      'Reading EXPLAIN QUERY PLAN for CTE queries',
      'Inlining (flattening) vs materializing a CTE',
      'How an index changes a CTE-based join',
      'Practical rules for fast CTE queries',
    ],
    concept: `<p>A CTE is a <b>way of writing</b> a query, not a storage instruction. The optimizer decides how to run it:</p>
<ul>
<li><b>Inline (flatten)</b>: merge the CTE into the main query as if you had typed it there. Filters from outside can then use indexes on the base tables.</li>
<li><b>Materialize</b>: run the CTE once, store the rows in a temporary table, and read from it. Good when the CTE is used several times or is expensive.</li>
</ul>
<p><code>EXPLAIN QUERY PLAN</code> shows which one happened. Look for <code>MATERIALIZE</code>, <code>CO-ROUTINE</code>, <code>SCAN</code> (reads every row) and <code>SEARCH ... USING INDEX</code> (jumps to matching rows).</p>
<p>The visual below runs the lesson query's plan before and after adding an index on <code>charges(invoice_id)</code>.</p>`,
    why: 'Two queries that return the same answer can differ in speed by 1000×. Reading the plan tells you why.',
    when: 'Check the plan whenever a CTE query is slow, runs on large tables, or references the same CTE several times.',
    analogy: 'A CTE is a work order ("pull the overdue invoices"). The office manager (optimizer) decides whether to photocopy the whole stack once (materialize) or pull each file as needed from the indexed cabinet (inline + index).',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices WHERE status = 'Overdue' ORDER BY invoice_id`,
    syntax: `EXPLAIN QUERY PLAN
WITH cte AS (...)
SELECT ... FROM cte JOIN t ON ...;`,
    sql: `WITH overdue AS (
    SELECT invoice_id, patient_id, total_amount
    FROM invoices
    WHERE status = 'Overdue'
)
SELECT o.invoice_id, o.total_amount, COUNT(c.charge_id) AS charge_lines
FROM overdue o
JOIN charges c ON c.invoice_id = o.invoice_id
GROUP BY o.invoice_id, o.total_amount
ORDER BY o.total_amount DESC;`,
    breakdown: [
      ['WITH overdue AS (... WHERE status = \'Overdue\')', 'A simple filtered CTE used once, so SQLite can inline it into the main query.'],
      ['JOIN charges c ON c.invoice_id = o.invoice_id', 'For each overdue invoice, find its charges. Without an index on charges(invoice_id) this needs a scan or an automatic index.'],
      ['GROUP BY o.invoice_id, o.total_amount', 'Count the charge lines per overdue invoice.'],
      ['ORDER BY o.total_amount DESC', 'Needs a temporary sort b-tree (USE TEMP B-TREE FOR ORDER BY).'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_charges_invoice ON charges(invoice_id)` },
    internals: `<p>SQLite's rules (3.35+): a CTE used <b>once</b> is treated like a subquery and flattened when possible. A CTE used <b>more than once</b> is materialized by default. Here the CTE is flattened, so no <code>MATERIALIZE</code> line appears. Before the index, the plan is <code>SCAN c</code> (all 104 charges) + <code>SEARCH invoices USING INTEGER PRIMARY KEY</code> + temp b-trees for GROUP BY and ORDER BY: SQLite drives the join from charges because it has no way to find charges by invoice. After <code>CREATE INDEX idx_charges_invoice</code>, the plan flips to <code>SCAN invoices</code> + <code>SEARCH c USING COVERING INDEX idx_charges_invoice (invoice_id=?)</code>, and the GROUP BY sort disappears because rows already arrive grouped by invoice.</p>`,
    mistakes: [
      { wrong: `WITH all_charges AS (SELECT * FROM charges)
SELECT * FROM all_charges WHERE invoice_id = 13;`, why: 'Not wrong, but a common belief is that the CTE "loads all charges first". Here SQLite flattens it and applies the filter directly. Do not avoid CTEs out of fear. Measure with EXPLAIN QUERY PLAN instead.', fix: `EXPLAIN QUERY PLAN
WITH all_charges AS (SELECT * FROM charges)
SELECT * FROM all_charges WHERE invoice_id = 13;` },
      { wrong: `WITH c AS (SELECT invoice_id, SUM(amount) AS s FROM charges GROUP BY invoice_id)
SELECT * FROM c WHERE invoice_id = 13;`, why: 'The grouped CTE must be built for ALL invoices before the outer filter runs (it cannot be flattened through GROUP BY in every case). Filter inside the CTE when you only need a few keys.', fix: `WITH c AS (SELECT invoice_id, SUM(amount) AS s FROM charges WHERE invoice_id = 13 GROUP BY invoice_id)
SELECT * FROM c;` },
    ],
    rules: [
      'CTEs are logical; the optimizer chooses between inlining and materializing.',
      'Read EXPLAIN QUERY PLAN: SCAN = every row, SEARCH = index seek.',
      'Index the join and filter columns that CTEs feed into.',
      'Filter early (inside the CTE) when the CTE contains GROUP BY, DISTINCT or window functions.',
    ],
    compare: `<table><tr><th>Engine</th><th>Single-use CTE</th><th>Multi-use CTE</th></tr>
<tr><td>SQLite 3.35+</td><td>inlined</td><td>materialized</td></tr>
<tr><td>PostgreSQL 12+</td><td>inlined</td><td>materialized</td></tr>
<tr><td>PostgreSQL ≤ 11</td><td>always materialized (fence)</td><td>materialized</td></tr>
<tr><td>SQL Server</td><td>inlined</td><td>inlined each time (recomputed)</td></tr>
<tr><td>MySQL 8</td><td>merged or materialized</td><td>materialized</td></tr></table>`,
    realWorld: 'A payer-mix dashboard sped up from 40 s to 0.3 s after an engineer saw SCAN charges in the plan of a CTE join and added an index on charges(invoice_id).',
    tips: ['Prefix any query with EXPLAIN QUERY PLAN in this playground to see its plan.'],
    deep: `<p>Materialization is a trade-off: it saves re-computation but loses the ability to push outer predicates into the CTE and to use base-table indexes. SQLite partly compensates by building <b>automatic indexes</b> on materialized results when a join would otherwise be a nested scan. You can see these in plans as <code>AUTOMATIC COVERING INDEX</code>. Seeing them repeatedly is a hint that a permanent index should exist.</p>`,
    tryIt: { prompt: 'Run EXPLAIN QUERY PLAN on the lesson query. Then create the index and run it again. What changed?', starter: `EXPLAIN QUERY PLAN
WITH overdue AS (
    SELECT invoice_id, total_amount FROM invoices WHERE status = 'Overdue'
)
SELECT o.invoice_id, COUNT(c.charge_id)
FROM overdue o JOIN charges c ON c.invoice_id = o.invoice_id
GROUP BY o.invoice_id;

-- then run:
-- CREATE INDEX idx_charges_invoice ON charges(invoice_id);` },
    challenge: {
      level: 3,
      prompt: 'Write an efficient query: using a CTE that filters invoices to status \'Open\' FIRST, return each open invoice_id with its charge total (charged, from charges) ordered by invoice_id.',
      solution: `WITH open_inv AS (
    SELECT invoice_id FROM invoices WHERE status = 'Open'
)
SELECT o.invoice_id, SUM(c.amount) AS charged
FROM open_inv o
JOIN charges c ON c.invoice_id = o.invoice_id
GROUP BY o.invoice_id
ORDER BY o.invoice_id;`,
      hints: ['First CTE: SELECT invoice_id FROM invoices WHERE status = \'Open\'.', 'Join the CTE to charges on invoice_id.', 'GROUP BY o.invoice_id and SUM(c.amount) AS charged.', 'ORDER BY o.invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'In a query plan, SEARCH c USING INDEX idx (invoice_id=?) means...', options: ['Every row of c is read', 'SQLite jumps straight to the matching rows through the index', 'The CTE was materialized', 'The query failed'], answer: 1, why: 'SEARCH = index seek; SCAN = full read.' },
      { q: 'In SQLite, a CTE referenced twice is by default...', options: ['Computed twice', 'Materialized once and read twice', 'Rejected', 'Converted into a view'], answer: 1, why: 'Multi-reference CTEs are materialized (unless NOT MATERIALIZED is specified).' },
    ],
  },

  // ─────────────────────────────────────────────── 17
  {
    id: 'subqueries-17',
    goals: [
      'What a materialized CTE is',
      'The AS MATERIALIZED and AS NOT MATERIALIZED hints',
      'When forcing materialization helps or hurts',
      'How engines differ',
    ],
    concept: `<p><b>Materializing</b> a CTE means computing it <b>once</b> and saving the rows in a temporary table for the rest of the query. The opposite, <b>inlining</b>, pastes the CTE's definition wherever it is used, so it may be computed several times but can be optimized together with the outer query.</p>
<p>SQLite (3.35+) and PostgreSQL (12+) let you choose explicitly:</p>
<pre>WITH x AS MATERIALIZED (...)      -- compute once, store
WITH x AS NOT MATERIALIZED (...)  -- inline it everywhere</pre>
<p><b>Materialize</b> when the CTE is expensive and used many times, or when it contains a non-deterministic function (like <code>random()</code>) that must give the same answer everywhere. <b>Don't materialize</b> when the outer query filters it heavily and an index on the base table could be used.</p>`,
    why: 'Sometimes the optimizer guesses wrong. Hints let you control whether expensive work happens once or whether filters are pushed inside.',
    when: 'Use a hint only after EXPLAIN QUERY PLAN and timing show a problem. The default is right most of the time.',
    analogy: 'Materializing is printing today\'s A/R aging report once and handing copies to every team. Inlining is letting each team query the live system: always fresh, and they can pull only what they need, but the work is repeated.',
    exampleSql: `SELECT location_id, COUNT(*) AS n, SUM(total_amount) AS billed FROM invoices GROUP BY location_id`,
    syntax: `WITH name AS MATERIALIZED (SELECT ...)
SELECT ... FROM name ...;

WITH name AS NOT MATERIALIZED (SELECT ...)
SELECT ... FROM name WHERE key = ...;`,
    sql: `WITH loc_stats AS MATERIALIZED (
    SELECT location_id,
           COUNT(*) AS invoice_count,
           SUM(total_amount) AS billed
    FROM invoices
    GROUP BY location_id
)
SELECT a.location_id, a.billed,
       ROUND(100.0 * a.billed / (SELECT SUM(billed) FROM loc_stats), 1) AS pct_of_total,
       (SELECT COUNT(*) FROM loc_stats b WHERE b.billed > a.billed) + 1 AS billing_rank
FROM loc_stats a
ORDER BY billing_rank;`,
    breakdown: [
      ['WITH loc_stats AS MATERIALIZED (...)', 'Compute per-location stats ONCE and store them in a temporary table.'],
      ['FROM loc_stats a', 'Use #1: the rows to report.'],
      ['(SELECT SUM(billed) FROM loc_stats)', 'Use #2: the grand total, read from the stored rows.'],
      ['(SELECT COUNT(*) FROM loc_stats b WHERE b.billed > a.billed) + 1', 'Use #3: a rank computed by counting how many locations billed more. It is correlated, so it reads the small stored table 5 times instead of re-grouping invoices 5 times.'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_invoices_location ON invoices(location_id, total_amount)` },
    internals: `<p>In the plan, <code>MATERIALIZE loc_stats</code> appears once and the later uses show <code>SCAN loc_stats</code>. The correlated rank subquery shows up as <code>CORRELATED SCALAR SUBQUERY</code> scanning the 5-row <code>loc_stats</code>, not invoices. With <code>NOT MATERIALIZED</code>, each use would expand to its own <code>SCAN invoices</code> + GROUP BY. The index in the visual covers <code>(location_id, total_amount)</code>, so after it is created the CTE body becomes <code>SCAN invoices USING COVERING INDEX</code> and the <code>TEMP B-TREE FOR GROUP BY</code> disappears.</p>`,
    mistakes: [
      { wrong: `WITH pick AS (SELECT abs(random()) % 48 + 1 AS id)
SELECT (SELECT id FROM pick) AS first_look, (SELECT id FROM pick) AS second_look;`, why: 'If the CTE were inlined, random() could be evaluated separately for each reference and the two "looks" might disagree. Force MATERIALIZED when every reference must see the same values.', fix: `WITH pick AS MATERIALIZED (SELECT abs(random()) % 48 + 1 AS id)
SELECT (SELECT id FROM pick) AS first_look, (SELECT id FROM pick) AS second_look;` },
      { wrong: `WITH big AS MATERIALIZED (SELECT * FROM charges)
SELECT * FROM big WHERE invoice_id = 13;`, why: 'Forcing materialization copies all 104 charges (millions in production) into a temp table and then scans it, so an index on charges.invoice_id cannot be used. Let it inline.', fix: `WITH big AS NOT MATERIALIZED (SELECT * FROM charges)
SELECT * FROM big WHERE invoice_id = 13;` },
    ],
    rules: [
      'MATERIALIZED = compute once, store, reuse.',
      'NOT MATERIALIZED = inline, so outer filters and indexes apply.',
      'The defaults are usually right; hint only after measuring.',
      'Hints are supported in SQLite 3.35+ and PostgreSQL 12+, not in SQL Server or MySQL.',
    ],
    compare: `<table><tr><th></th><th>Materialized CTE</th><th>Inlined CTE</th><th>Temp table</th></tr>
<tr><td>Computed</td><td>once per query</td><td>per reference</td><td>once per session (explicit)</td></tr>
<tr><td>Can use base indexes</td><td>no (temp copy)</td><td>yes</td><td>only if you index it</td></tr>
<tr><td>Visible to</td><td>one statement</td><td>one statement</td><td>whole session</td></tr>
<tr><td>Statistics</td><td>none</td><td>base table stats</td><td>can ANALYZE</td></tr></table>`,
    realWorld: 'Nightly billing jobs materialize an expensive "eligible claims" CTE once and use it in several branches of a report, while interactive screens rely on inlining so a single-patient filter can use indexes.',
    tips: ['If a materialized intermediate result is needed across several statements, use CREATE TEMP TABLE instead.'],
    deep: `<p>Oracle offers the undocumented <code>/*+ MATERIALIZE */</code> and <code>/*+ INLINE */</code> hints. SQL Server has no CTE materialization at all, so the idiom there is a <code>#temp</code> table or table variable. For recursive CTEs the question does not arise: they are always built up incrementally in a work table.</p>`,
    tryIt: { prompt: 'Run EXPLAIN QUERY PLAN on the lesson query with AS MATERIALIZED, then with AS NOT MATERIALIZED, and compare the plans.', starter: `EXPLAIN QUERY PLAN
WITH loc_stats AS NOT MATERIALIZED (
    SELECT location_id, SUM(total_amount) AS billed FROM invoices GROUP BY location_id
)
SELECT a.location_id, a.billed, (SELECT SUM(billed) FROM loc_stats) AS grand_total
FROM loc_stats a;` },
    challenge: {
      level: 3,
      prompt: 'Using a MATERIALIZED CTE of total billed per payor_type (join invoices to payors), show payor_type, billed and pct (share of the grand total from the same CTE, rounded to 1 decimal). Ignore invoices with no payor. Order by billed descending.',
      solution: `WITH by_type AS MATERIALIZED (
    SELECT py.payor_type, SUM(i.total_amount) AS billed
    FROM invoices i
    JOIN payors py ON py.payor_id = i.payor_id
    GROUP BY py.payor_type
)
SELECT payor_type, billed,
       ROUND(100.0 * billed / (SELECT SUM(billed) FROM by_type), 1) AS pct
FROM by_type
ORDER BY billed DESC;`,
      hints: ['Join invoices to payors (the inner join drops NULL payors).', 'Group by payor_type inside WITH by_type AS MATERIALIZED ( ... ).', 'Use by_type twice: FROM by_type, and (SELECT SUM(billed) FROM by_type) for the grand total.', 'ROUND(100.0 * billed / (SELECT SUM(billed) FROM by_type), 1) AS pct ... ORDER BY billed DESC'],
      ordered: true,
    },
    quiz: [
      { q: 'What does AS NOT MATERIALIZED allow the optimizer to do?', options: ['Store the CTE permanently', 'Inline the CTE so outer filters and base-table indexes can be used', 'Skip the CTE', 'Run the CTE in parallel'], answer: 1, why: 'Inlining merges the CTE into the outer query.' },
      { q: 'When is forcing MATERIALIZED most useful?', options: ['A cheap CTE used once with a selective outer filter', 'An expensive CTE referenced several times, or one with random()', 'Always', 'Never'], answer: 1, why: 'Compute once and reuse, with consistent values.' },
    ],
  },
]);
