// Section 08: Set Operations (setops-01 .. setops-10)
Lessons.add([
  // ─────────────────────────────────────────────── 01 UNION
  {
    id: 'setops-01',
    goals: ['Stack the results of two queries with UNION', 'Understand that UNION removes duplicate rows', 'The rules both queries must follow', 'Where UNION sits among JOIN, WHERE and OR'],
    concept: `<p><code>UNION</code> puts the rows of one query <b>underneath</b> the rows of another query, and then <b>removes duplicate rows</b>. The result is the set of all different rows that appear in either query.</p>
<p>Example: "every city we deal with" = cities where patients live <b>UNION</b> cities where we have treatment locations. Dallas appears in both lists, but only once in the result.</p>
<p>Both queries must return the <b>same number of columns</b>, and the columns are matched <b>by position</b> (1st with 1st, 2nd with 2nd), not by name.</p>`,
    why: 'Data about the same kind of thing often lives in different tables or different filters. UNION merges them into one clean list without duplicates.',
    when: 'Use UNION when you need one combined list of distinct values or rows from two or more queries: all cities, all contact phone numbers, all ids that meet condition A or condition B.',
    analogy: 'Merging the patient mailing list with the clinic address list to print one list of cities for a regional report. If Dallas is on both lists, you write it only once.',
    exampleSql: `SELECT 'patient' AS source, city FROM patients WHERE city IS NOT NULL AND patient_id <= 8\nUNION ALL\nSELECT 'location', city FROM treatment_locations`,
    syntax: `SELECT col1, col2 FROM table_a [WHERE ...]\nUNION\nSELECT col1, col2 FROM table_b [WHERE ...]\n[ORDER BY ...];`,
    sql: `SELECT city FROM patients WHERE city IS NOT NULL\nUNION\nSELECT city FROM treatment_locations\nORDER BY city;`,
    breakdown: [
      ['SELECT city FROM patients WHERE city IS NOT NULL', 'Query A: patient cities (many duplicates: lots of patients live in Dallas).'],
      ['UNION', 'Stack A and B, then remove duplicate rows.'],
      ['SELECT city FROM treatment_locations', 'Query B: the 6 location cities (Austin and Dallas appear twice).'],
      ['ORDER BY city', 'Sorts the final combined result (one ORDER BY for the whole thing).'],
    ],
    visual: { type: 'setops', a: `SELECT city FROM patients WHERE city IS NOT NULL AND patient_id <= 14`, b: `SELECT city FROM treatment_locations`, op: 'UNION' },
    internals: `<p>To remove duplicates the engine must compare every row with every other row, which it does efficiently in one of two ways:</p>
<ul><li><b>Sort-based</b>: run both queries, sort the combined rows, and drop each row equal to the one before it.</li>
<li><b>Hash-based</b>: insert each row into a hash set; skip it if it is already there.</li></ul>
<p>SQLite uses a temporary B-tree index as the "seen" set (EXPLAIN QUERY PLAN shows <code>COMPOUND QUERY</code> / <code>UNION USING TEMP B-TREE</code>). Either way, UNION costs more than UNION ALL, which just appends.</p>`,
    mistakes: [
      { wrong: `SELECT city, state FROM treatment_locations\nUNION\nSELECT city FROM patients;`, why: 'The two queries return a different number of columns, so SQLite raises "SELECTs to the left and right of UNION do not have the same number of result columns".', fix: `SELECT city FROM treatment_locations\nUNION\nSELECT city FROM patients;` },
      { wrong: `SELECT city FROM patients ORDER BY city\nUNION\nSELECT city FROM treatment_locations;`, why: 'ORDER BY is only allowed once, at the very end, and it sorts the whole combined result.', fix: `SELECT city FROM patients\nUNION\nSELECT city FROM treatment_locations\nORDER BY city;` },
    ],
    rules: ['Same number of columns in every SELECT.', 'Columns match by position, not by name.', 'UNION removes duplicate rows (across AND within the inputs).', 'Column names come from the first SELECT.', 'One ORDER BY at the end.'],
    compare: `<table><tr><th></th><th>JOIN</th><th>UNION</th></tr>
<tr><td>Combines</td><td>columns (side by side)</td><td>rows (one under another)</td></tr>
<tr><td>Needs</td><td>a matching condition</td><td>same column count and compatible types</td></tr>
<tr><td>Duplicates</td><td>kept</td><td>removed</td></tr></table>`,
    realWorld: 'Building a single "all contacts" list from patients, practitioners and payors; merging records from an old billing system table with the new one during a migration.',
    tips: ['If you know the inputs cannot overlap, or you want to keep duplicates, use UNION ALL: it is faster.'],
    deep: `<p>UNION treats two NULLs as duplicates ("not distinct"), unlike <code>=</code> in WHERE. So <code>SELECT NULL UNION SELECT NULL</code> returns one row. This is the same comparison rule as DISTINCT and GROUP BY, sometimes written <code>IS NOT DISTINCT FROM</code>.</p>`,
    tryIt: { prompt: 'Remove the WHERE city IS NOT NULL filter. How many NULL rows appear in the result? Then switch UNION to UNION ALL and compare the row counts.', starter: `SELECT city FROM patients WHERE city IS NOT NULL\nUNION\nSELECT city FROM treatment_locations\nORDER BY city;` },
    challenge: {
      level: 2,
      prompt: 'List every different payor_id that appears on invoices or on payments (ignore NULLs), in ascending order.',
      solution: `SELECT payor_id FROM invoices WHERE payor_id IS NOT NULL UNION SELECT payor_id FROM payments WHERE payor_id IS NOT NULL ORDER BY payor_id;`,
      hints: ['Two queries: one on invoices, one on payments, each returning payor_id.', 'Filter out NULLs in both with WHERE payor_id IS NOT NULL.', 'UNION removes the duplicates for you.', 'Put a single ORDER BY payor_id at the very end.'],
      ordered: true,
    },
    quiz: [
      { q: 'Query A returns Dallas, Dallas, Austin. Query B returns Dallas, Houston. How many rows does A UNION B return?', options: ['5', '3', '4', '2'], answer: 1, why: 'Distinct rows: Dallas, Austin, Houston.' },
      { q: 'How are columns matched between the two SELECTs?', options: ['By name', 'By position', 'By data type', 'Alphabetically'], answer: 1, why: 'The 1st column pairs with the 1st, the 2nd with the 2nd, and so on.' },
    ],
  },

  // ─────────────────────────────────────────────── 02 UNION ALL
  {
    id: 'setops-02',
    goals: ['Stack results while keeping every row with UNION ALL', 'Why UNION ALL is faster than UNION', 'Build an activity feed / ledger from several tables', 'Add a label column to know where each row came from'],
    concept: `<p><code>UNION ALL</code> stacks the rows of two queries and <b>keeps everything</b>, duplicates included. It does no comparing, so it is simple and fast.</p>
<p>In billing, duplicates often <b>matter</b>: two identical $165 cash payments on the same day are two real payments (or a double-posting someone must fix). UNION would silently merge them; UNION ALL shows both.</p>
<p>A common pattern is adding a constant <b>label column</b> (<code>'CHARGE' AS entry_type</code>) so you can still tell which table each row came from.</p>`,
    why: 'Most real combining jobs (ledgers, logs, feeds, grouping-set emulation) must keep every row. UNION ALL does exactly that without the cost of de-duplication.',
    when: 'Use UNION ALL by default. Switch to UNION only when you specifically need duplicates removed.',
    analogy: 'Stapling the charge slips and the payment receipts of one invoice together in date order. You keep every slip, even if two receipts look identical: each one is a real piece of paper.',
    exampleSql: `SELECT invoice_id, charge_id, amount FROM charges WHERE invoice_id <= 8`,
    syntax: `SELECT 'A' AS source, col1, col2 FROM table_a\nUNION ALL\nSELECT 'B', col1, col2 FROM table_b\n[ORDER BY ...];`,
    sql: `SELECT service_date AS entry_date, 'CHARGE'  AS entry_type, amount\nFROM charges  WHERE invoice_id = 7\nUNION ALL\nSELECT payment_date, 'PAYMENT', -amount\nFROM payments WHERE invoice_id = 7\nORDER BY entry_date;`,
    breakdown: [
      ["SELECT service_date AS entry_date, 'CHARGE' AS entry_type, amount", 'Charge lines of invoice 7, labelled CHARGE. The first SELECT names the columns.'],
      ['UNION ALL', 'Append the next query\'s rows, with no duplicate check.'],
      ["SELECT payment_date, 'PAYMENT', -amount", 'Payment lines, labelled PAYMENT, with a minus sign because they reduce the balance.'],
      ['ORDER BY entry_date', 'Sort the combined ledger by date.'],
    ],
    visual: { type: 'setops', a: `SELECT invoice_id FROM payments WHERE invoice_id <= 8`, b: `SELECT invoice_id FROM charges WHERE invoice_id <= 8`, op: 'UNION ALL' },
    internals: `<p>UNION ALL is a pure <b>concatenation</b>: the engine runs the first query and streams its rows out, then runs the second and streams those. No temporary storage, no sort, no hashing. It can even return the first rows before the second query has started, which is why it is the building block for pagination-friendly feeds and for partitioned-table scans in many engines.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, payment_date, amount, method FROM payments WHERE invoice_id = 1\nUNION\nSELECT invoice_id, payment_date, amount, method FROM payments WHERE invoice_id = 1;`, why: 'Invoice 1 has two identical $165 cash payments (ids 1 and 47). UNION merges them into one row and the double-posting disappears from your report.', fix: `SELECT payment_id, invoice_id, payment_date, amount, method FROM payments WHERE invoice_id = 1;` },
      { wrong: `SELECT 'CHARGE', amount FROM charges WHERE invoice_id = 4\nUNION\nSELECT 'PAYMENT', amount FROM payments WHERE invoice_id = 4;`, why: 'Invoice 4 has two manual-therapy charges of exactly $100. UNION keeps only one, so the total charged is $100 too low.', fix: `SELECT 'CHARGE', amount FROM charges WHERE invoice_id = 4\nUNION ALL\nSELECT 'PAYMENT', amount FROM payments WHERE invoice_id = 4;` },
    ],
    rules: ['UNION ALL keeps every row.', 'Prefer UNION ALL unless you need de-duplication.', 'Add a label column to remember each row\'s source.', 'Same column count, matched by position.'],
    compare: `<table><tr><th></th><th>UNION</th><th>UNION ALL</th></tr>
<tr><td>Duplicates</td><td>removed</td><td>kept</td></tr>
<tr><td>Extra work</td><td>sort or hash</td><td>none</td></tr>
<tr><td>Row count</td><td>&le; A + B</td><td>= A + B</td></tr>
<tr><td>Typical use</td><td>unique lists</td><td>ledgers, feeds, totals</td></tr></table>`,
    realWorld: 'Patient statements combine charges, payments, adjustments and refunds from different tables into one chronological ledger with UNION ALL. Data warehouses UNION ALL monthly partitions or regional databases.',
    tips: ['When you SUM over a UNION, always use UNION ALL. Otherwise equal amounts from different rows collapse and the total is wrong.'],
    deep: `<p>Optimizers can push filters and aggregates through UNION ALL into each branch ("partition pruning" in partitioned tables works this way). Through UNION they are more careful, because de-duplication changes counts. In PostgreSQL, a UNION ALL of simple queries becomes an <code>Append</code> node, which can run branches in parallel.</p>`,
    tryIt: { prompt: 'Invoice 1 had a duplicate payment that was later refunded. Add a third UNION ALL branch with its REFUND transactions (from transactions, type REFUND) so the ledger balances to zero.', starter: `SELECT service_date AS entry_date, 'CHARGE' AS entry_type, amount\nFROM charges WHERE invoice_id = 1\nUNION ALL\nSELECT payment_date, 'PAYMENT', -amount\nFROM payments WHERE invoice_id = 1\nORDER BY entry_date;` },
    challenge: {
      level: 2,
      prompt: 'Build a ledger for invoice 4: charges as (date, \'CHARGE\', amount) and payments as (date, \'PAYMENT\', negative amount). Keep every line. Order by date, then type, then amount.',
      solution: `SELECT service_date AS d, 'CHARGE' AS t, amount FROM charges WHERE invoice_id = 4 UNION ALL SELECT payment_date, 'PAYMENT', -amount FROM payments WHERE invoice_id = 4 ORDER BY d, t, amount;`,
      hints: ['One SELECT on charges, one on payments, both filtered to invoice_id = 4.', "Use a constant label: 'CHARGE' and 'PAYMENT'.", 'Negate the payment amount with -amount, and use UNION ALL so the two equal $100 charges both stay.', 'ORDER BY the first-column alias, then the label, then amount.'],
      ordered: true,
    },
    quiz: [
      { q: 'A has 5 rows, B has 3 rows, 2 of them are also in A. How many rows does A UNION ALL B return?', options: ['6', '8', '3', '5'], answer: 1, why: 'UNION ALL never removes anything: 5 + 3.' },
      { q: 'Why is UNION ALL usually faster than UNION?', options: ['It uses an index', 'It skips duplicate removal', 'It runs only the first query', 'It sorts the output'], answer: 1, why: 'No sort or hash step is needed.' },
    ],
  },

  // ─────────────────────────────────────────────── 03 INTERSECT
  {
    id: 'setops-03',
    goals: ['Find rows present in both queries with INTERSECT', 'Answer "both A and B" questions about the same entity', 'Compare INTERSECT with INNER JOIN and EXISTS', 'Know that INTERSECT de-duplicates'],
    concept: `<p><code>INTERSECT</code> returns only the rows that appear in <b>both</b> query results (the overlap of two circles). Like UNION, it removes duplicates.</p>
<p>It is perfect for questions like "which patients have <b>both</b> an overdue invoice <b>and</b> a paid invoice?". A simple WHERE cannot answer that, because one invoice row cannot be Overdue and Paid at the same time; the two facts live in different rows.</p>`,
    why: 'Many business questions ask for things that satisfy two separate conditions on different rows. INTERSECT expresses that directly and readably.',
    when: 'Use INTERSECT to find common values between two lists: cities we both serve and have patients in, patients who used two different payors, codes billed at two locations.',
    analogy: 'Holding the "patients with overdue bills" list next to the "patients who have paid before" list and highlighting names that are on both. These are the patients most likely to pay if you call them.',
    exampleSql: `SELECT patient_id, invoice_id, status FROM invoices WHERE patient_id IN (3, 7, 12) ORDER BY patient_id`,
    syntax: `SELECT col FROM table_a [WHERE ...]\nINTERSECT\nSELECT col FROM table_b [WHERE ...];`,
    sql: `SELECT city FROM patients WHERE city IS NOT NULL\nINTERSECT\nSELECT city FROM treatment_locations\nORDER BY city;`,
    breakdown: [
      ['SELECT city FROM patients ...', 'Cities where patients live.'],
      ['INTERSECT', 'Keep only rows found in both results, once each.'],
      ['SELECT city FROM treatment_locations', 'Cities where we have a location.'],
      ['ORDER BY city', 'Sort the common cities.'],
    ],
    visual: { type: 'setops', a: `SELECT city FROM patients WHERE city IS NOT NULL AND patient_id <= 14`, b: `SELECT city FROM treatment_locations`, op: 'INTERSECT' },
    internals: `<p>A typical plan builds a hash set (or temporary B-tree) from the <b>second</b> query's rows, then streams the first query's rows and emits each one that is found in the set and not already emitted. SQLite materialises both sides into temporary B-trees and walks them in order. Cost is roughly the size of both inputs, similar to a hash semi-join.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id FROM invoices WHERE status = 'Overdue' AND status = 'Paid';`, why: 'One row cannot have two statuses at once, so this always returns nothing. The two conditions are about different rows.', fix: `SELECT patient_id FROM invoices WHERE status = 'Overdue'\nINTERSECT\nSELECT patient_id FROM invoices WHERE status = 'Paid';` },
      { wrong: `SELECT patient_id, invoice_id FROM invoices WHERE status = 'Overdue'\nINTERSECT\nSELECT patient_id, invoice_id FROM invoices WHERE status = 'Paid';`, why: 'The whole row must match. An invoice cannot be both Overdue and Paid, so including invoice_id makes the result empty. Select only the columns that define "the same thing".', fix: `SELECT patient_id FROM invoices WHERE status = 'Overdue'\nINTERSECT\nSELECT patient_id FROM invoices WHERE status = 'Paid';` },
    ],
    rules: ['INTERSECT keeps rows in both results.', 'All selected columns must match together.', 'Duplicates are removed.', 'SQLite has no INTERSECT ALL.'],
    compare: `<table><tr><th>Approach</th><th>Duplicates</th><th>NULL = NULL?</th></tr>
<tr><td><code>A INTERSECT B</code></td><td>removed</td><td>yes (treated as equal)</td></tr>
<tr><td><code>A JOIN B ON a.x = b.x</code></td><td>multiplied</td><td>no</td></tr>
<tr><td><code>WHERE EXISTS (...)</code></td><td>kept from A</td><td>no (unless IS)</td></tr></table>`,
    dialectSql: {
      sqlite: `SELECT patient_id FROM invoices WHERE status = 'Overdue'\nINTERSECT\nSELECT patient_id FROM invoices WHERE status = 'Paid';`,
      postgres: `SELECT patient_id FROM invoices WHERE status = 'Overdue'\nINTERSECT            -- also INTERSECT ALL\nSELECT patient_id FROM invoices WHERE status = 'Paid';`,
      mysql: `-- MySQL 8.0.31+\nSELECT patient_id FROM invoices WHERE status = 'Overdue'\nINTERSECT\nSELECT patient_id FROM invoices WHERE status = 'Paid';`,
      sqlserver: `SELECT patient_id FROM invoices WHERE status = 'Overdue'\nINTERSECT\nSELECT patient_id FROM invoices WHERE status = 'Paid';`,
      oracle: `SELECT patient_id FROM invoices WHERE status = 'Overdue'\nINTERSECT\nSELECT patient_id FROM invoices WHERE status = 'Paid';`,
    },
    realWorld: 'Finding patients covered by two payors (coordination of benefits), CPT codes billed at every location, practitioners who work at both a clinic and the hospital.',
    tips: ['To INTERSECT on ids but show names, INTERSECT the ids in a subquery and JOIN the result back to the table.'],
    deep: `<p>INTERSECT has <b>higher precedence</b> than UNION and EXCEPT in the SQL standard (PostgreSQL, SQL Server), so <code>A UNION B INTERSECT C</code> means <code>A UNION (B INTERSECT C)</code>. SQLite evaluates compound operators strictly left to right. Use subqueries to make the order explicit when mixing operators.</p>`,
    tryIt: { prompt: 'Find patients who have invoices at both location 1 and location 2.', starter: `SELECT patient_id FROM invoices WHERE location_id = 1\nINTERSECT\nSELECT patient_id FROM invoices WHERE location_id = 4;` },
    challenge: {
      level: 2,
      prompt: 'List the patient_ids of patients who have at least one Overdue invoice AND at least one Paid invoice. Order by patient_id.',
      solution: `SELECT patient_id FROM invoices WHERE status = 'Overdue' INTERSECT SELECT patient_id FROM invoices WHERE status = 'Paid' ORDER BY patient_id;`,
      hints: ['A single WHERE cannot do it: the two facts are on different invoice rows.', 'Write one query for Overdue patients and one for Paid patients.', 'Combine them with INTERSECT.', 'ORDER BY patient_id at the end.'],
      ordered: true,
    },
    quiz: [
      { q: 'A = {1, 2, 2, 3}, B = {2, 3, 4}. A INTERSECT B = ?', options: ['{2, 2, 3}', '{2, 3}', '{1, 4}', '{1, 2, 3, 4}'], answer: 1, why: 'Rows in both, duplicates removed.' },
      { q: 'Why does WHERE status = \'Overdue\' AND status = \'Paid\' return nothing?', options: ['A syntax error', 'One row cannot have both values', 'Missing GROUP BY', 'NULL statuses'], answer: 1, why: 'AND tests one row at a time.' },
    ],
  },

  // ─────────────────────────────────────────────── 04 EXCEPT / MINUS
  {
    id: 'setops-04',
    goals: ['Find rows in one result but not the other with EXCEPT', 'Understand why the order of the two queries matters', 'Know that Oracle calls it MINUS', 'Compare EXCEPT with NOT EXISTS and LEFT JOIN ... IS NULL'],
    concept: `<p><code>EXCEPT</code> returns the rows of the <b>first</b> query that do <b>not</b> appear in the second query. Duplicates are removed.</p>
<p>Unlike UNION and INTERSECT, the <b>order matters</b>: <code>A EXCEPT B</code> is "in A but not in B", and <code>B EXCEPT A</code> is a different answer.</p>
<p>Billing example: invoices that have charges <b>EXCEPT</b> invoices that have payments = invoices billed but never paid anything. Oracle spells it <code>MINUS</code>.</p>`,
    why: 'Gap-finding is everywhere in billing: patients never invoiced, invoices never paid, charges never posted to the ledger. EXCEPT answers "what is missing?" in one line.',
    when: 'Use EXCEPT to find missing or unmatched items between two lists: reconciliation, data-migration checks, anti-joins on a few columns.',
    analogy: 'Taking the list of invoices sent out and crossing off every invoice number that appears on the bank deposit slips. What is left uncrossed is money still owed.',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id <= 12`,
    syntax: `SELECT col FROM table_a      -- keep these ...\nEXCEPT                        -- (Oracle: MINUS)\nSELECT col FROM table_b;     -- ... unless they are also here`,
    sql: `SELECT invoice_id FROM charges\nEXCEPT\nSELECT invoice_id FROM payments\nORDER BY invoice_id;`,
    breakdown: [
      ['SELECT invoice_id FROM charges', 'Every invoice that has at least one charge (with duplicates, one per charge).'],
      ['EXCEPT', 'Remove any invoice_id that also appears in the next query, then remove duplicates.'],
      ['SELECT invoice_id FROM payments', 'Invoices that received a payment.'],
      ['ORDER BY invoice_id', 'Invoices with charges but no payment at all, in order.'],
    ],
    visual: { type: 'setops', a: `SELECT invoice_id FROM charges WHERE invoice_id <= 10`, b: `SELECT invoice_id FROM payments WHERE invoice_id <= 10`, op: 'EXCEPT' },
    internals: `<p>The engine builds a set from the second query, then streams the first query and emits each row that is <b>not</b> in the set (and not already emitted). This is the same work as a hash <b>anti-join</b>. Because comparisons use "not distinct" semantics, a NULL in A is removed by a NULL in B. That is different from <code>NOT IN</code>, where one NULL in the subquery makes the whole result empty.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id FROM invoices\nEXCEPT\nSELECT patient_id FROM patients;`, why: 'Wrong direction: every invoiced patient exists in patients, so this is empty. You wanted patients who are NOT in invoices.', fix: `SELECT patient_id FROM patients\nEXCEPT\nSELECT patient_id FROM invoices;` },
      { wrong: `SELECT patient_id FROM patients\nWHERE patient_id NOT IN (SELECT payor_id FROM invoices);`, why: 'invoices.payor_id contains NULLs, and NOT IN against a list with a NULL returns no rows at all. (It also compares the wrong columns.) EXCEPT has no NULL trap.', fix: `SELECT patient_id FROM patients\nEXCEPT\nSELECT patient_id FROM invoices;` },
    ],
    rules: ['A EXCEPT B = rows in A that are not in B.', 'Order matters: A EXCEPT B ≠ B EXCEPT A.', 'Result is distinct.', 'Oracle: MINUS. SQLite has no EXCEPT ALL.'],
    compare: `<table><tr><th>Pattern</th><th>Returns extra columns?</th><th>NULL-safe</th></tr>
<tr><td><code>A EXCEPT B</code></td><td>only the compared columns</td><td>yes</td></tr>
<tr><td><code>NOT EXISTS (...)</code></td><td>any columns of A</td><td>yes</td></tr>
<tr><td><code>LEFT JOIN ... WHERE b.id IS NULL</code></td><td>any columns of A</td><td>yes</td></tr>
<tr><td><code>NOT IN (subquery)</code></td><td>any columns of A</td><td>no: breaks on NULL</td></tr></table>`,
    dialectSql: {
      sqlite: `SELECT invoice_id FROM charges\nEXCEPT\nSELECT invoice_id FROM payments;`,
      postgres: `SELECT invoice_id FROM charges\nEXCEPT\nSELECT invoice_id FROM payments;`,
      sqlserver: `SELECT invoice_id FROM charges\nEXCEPT\nSELECT invoice_id FROM payments;`,
      oracle: `SELECT invoice_id FROM charges\nMINUS                -- Oracle 21c+ also accepts EXCEPT\nSELECT invoice_id FROM payments;`,
      mysql: `-- MySQL 8.0.31+\nSELECT invoice_id FROM charges\nEXCEPT\nSELECT invoice_id FROM payments;`,
    },
    realWorld: 'Reconciliation jobs: claims submitted EXCEPT claims acknowledged by the clearinghouse; rows in the source system EXCEPT rows loaded into the warehouse.',
    tips: ['(A EXCEPT B) UNION ALL (B EXCEPT A) shows all differences between two tables: a quick data-diff tool.'],
    deep: `<p>EXCEPT compares <b>whole rows</b>. To diff two versions of a table, EXCEPT on all columns finds changed rows too: a row whose amount changed appears in the diff because (id, old_amount) ≠ (id, new_amount). This is how many data-migration test suites verify that two tables are identical.</p>`,
    tryIt: { prompt: 'Reverse the direction: invoices with payments EXCEPT invoices with charges. Is it empty? Why might that be a good sign?', starter: `SELECT invoice_id FROM charges\nEXCEPT\nSELECT invoice_id FROM payments\nORDER BY invoice_id;` },
    challenge: {
      level: 2,
      prompt: 'Find the patients who have never been invoiced: patient_ids from patients that do not appear in invoices. Order by patient_id.',
      solution: `SELECT patient_id FROM patients EXCEPT SELECT patient_id FROM invoices ORDER BY patient_id;`,
      hints: ['Start with the full list: patients.', 'Take away the ids that appear in invoices.', 'Use EXCEPT, with patients first.', 'ORDER BY patient_id at the end.'],
      ordered: true,
    },
    quiz: [
      { q: 'A = {1, 2, 3}, B = {2, 3, 4}. What is B EXCEPT A?', options: ['{1}', '{4}', '{2, 3}', '{1, 4}'], answer: 1, why: 'Rows in B that are not in A.' },
      { q: 'What is EXCEPT called in Oracle (traditionally)?', options: ['DIFFERENCE', 'MINUS', 'SUBTRACT', 'NOT IN'], answer: 1, why: 'Oracle uses MINUS (21c also accepts EXCEPT).' },
    ],
  },

  // ─────────────────────────────────────────────── 05 Column Compatibility
  {
    id: 'setops-05',
    goals: ['The rules for combining queries: same column count, compatible types', 'Why columns match by position, not by name', 'Where the result column names come from', 'How to line up tables with different shapes using NULL and constants'],
    concept: `<p>For any set operation the queries must be <b>compatible</b>:</p>
<ol>
<li><b>Same number of columns.</b> This is always checked.</li>
<li><b>Compatible types in each position.</b> Text with text, numbers with numbers. PostgreSQL and SQL Server enforce this; SQLite is relaxed and will happily stack a number on top of text, which hides bugs.</li>
<li><b>Position, not name.</b> The database never looks at names when matching. Put <code>last_name, first_name</code> in one query and <code>first_name, last_name</code> in the other, and your columns get mixed up with no error.</li>
</ol>
<p>The <b>result column names</b> come from the <b>first</b> SELECT. When a table lacks a column, fill the gap with <code>NULL</code> or a constant.</p>`,
    why: 'Set operations are unforgiving about shape. Knowing the rules prevents both errors and, worse, silently misaligned data.',
    when: 'Every time you write UNION / INTERSECT / EXCEPT, check the column list of each branch side by side.',
    analogy: 'Two clerks each fill in a stack of index cards to merge into one box. The cards must have the same boxes in the same places. If one clerk writes the last name where the other writes the first name, the merged box is a mess, even though every card "fits".',
    exampleSql: `SELECT practitioner_id, first_name, last_name, specialty FROM practitioners LIMIT 6`,
    syntax: `SELECT a1 AS name, a2 AS kind, NULL AS extra FROM t1   -- first SELECT names the columns\nUNION ALL\nSELECT b1,        'X',        b3            FROM t2;  -- same count, same order, same types`,
    sql: `SELECT 'Practitioner' AS role, last_name, first_name, specialty AS detail\nFROM practitioners\nUNION ALL\nSELECT 'Patient', last_name, first_name, city\nFROM patients\nWHERE city = 'Houston'\nORDER BY role, last_name;`,
    breakdown: [
      ["'Practitioner' AS role", 'A constant label column; its alias becomes the result column name.'],
      ['last_name, first_name', 'Same order in both branches: last then first.'],
      ['specialty AS detail / city', 'Different meaning, same position and type (text): a "detail" column.'],
      ['ORDER BY role, last_name', 'Uses the names from the first SELECT.'],
    ],
    visual: { type: 'setops', a: `SELECT city FROM patients WHERE patient_id <= 10 AND city IS NOT NULL`, b: `SELECT city FROM treatment_locations`, op: 'UNION ALL' },
    internals: `<p>Engines with strict typing compute one result type per column position (for example INTEGER and NUMERIC resolve to NUMERIC, VARCHAR(20) and VARCHAR(50) to VARCHAR(50)) and insert implicit casts. If no common type exists (INTEGER vs DATE) they raise an error. SQLite has dynamic typing: each value keeps its own type, so a column in a UNION can hold integers in some rows and text in others, and sorting follows SQLite's cross-type rules (NULL &lt; numbers &lt; text &lt; blobs).</p>`,
    mistakes: [
      { wrong: `SELECT first_name, last_name FROM practitioners\nUNION ALL\nSELECT last_name, first_name FROM patients;`, why: 'No error, but patients\' last names end up in the first_name column. Columns match by position only.', fix: `SELECT first_name, last_name FROM practitioners\nUNION ALL\nSELECT first_name, last_name FROM patients;` },
      { wrong: `SELECT patient_id, first_name, email FROM patients\nUNION ALL\nSELECT practitioner_id, first_name FROM practitioners;`, why: 'Three columns vs two: "do not have the same number of result columns". Practitioners have no email, so pad with NULL.', fix: `SELECT patient_id, first_name, email FROM patients\nUNION ALL\nSELECT practitioner_id, first_name, NULL FROM practitioners;` },
      { wrong: `SELECT invoice_id, total_amount FROM invoices\nUNION ALL\nSELECT invoice_id, method FROM payments;`, why: 'SQLite accepts it, but the second column mixes money and text. PostgreSQL would reject it ("types numeric and text cannot be matched").', fix: `SELECT invoice_id, total_amount, NULL AS method FROM invoices\nUNION ALL\nSELECT invoice_id, amount, method FROM payments;` },
    ],
    rules: ['Same number of columns in every branch.', 'Match by position; names are ignored.', 'Result names come from the first SELECT.', 'Keep types consistent per position; SQLite will not warn you.', 'Pad missing columns with NULL or a constant.'],
    compare: `<table><tr><th>Mismatch</th><th>SQLite</th><th>PostgreSQL / SQL Server</th></tr>
<tr><td>Column count</td><td>error</td><td>error</td></tr>
<tr><td>Types (int vs text)</td><td>allowed</td><td>error (or implicit cast)</td></tr>
<tr><td>Column names differ</td><td>fine (first wins)</td><td>fine (first wins)</td></tr>
<tr><td>Column order swapped</td><td>silent bug</td><td>silent bug if types match</td></tr></table>`,
    realWorld: 'A unified "people directory" across patients, practitioners and payor contacts; an audit log merging events from several tables with different columns padded by NULL.',
    tips: ['Write each branch\'s columns on one line, aligned vertically, so a missing or swapped column jumps out.', 'CAST(NULL AS TEXT) documents the intended type of a padding column.'],
    deep: `<p>Some engines offer name-based matching: DuckDB's <code>UNION BY NAME</code> and Spark's <code>unionByName</code> align columns by name and fill missing ones with NULL. Standard SQL has <code>CORRESPONDING</code> for this, but almost no mainstream database implements it.</p>`,
    tryIt: { prompt: 'Build a contact directory: patients (name, email) UNION ALL payors (payor_name, phone). Note which column names the result gets.', starter: `SELECT first_name || ' ' || last_name AS contact, email AS reach_at, 'Patient' AS kind\nFROM patients\nUNION ALL\nSELECT payor_name, phone, 'Payor'\nFROM payors\nORDER BY kind, contact;` },
    challenge: {
      level: 3,
      prompt: "Make one list of people at location 4: practitioners working there (role 'Practitioner', last_name, first_name) and patients who have an invoice at location 4 (role 'Patient', last_name, first_name), with no duplicate rows. Order by role, last_name, first_name.",
      solution: `SELECT 'Practitioner' AS role, last_name, first_name FROM practitioners WHERE location_id = 4 UNION SELECT 'Patient', last_name, first_name FROM patients WHERE patient_id IN (SELECT patient_id FROM invoices WHERE location_id = 4) ORDER BY role, last_name, first_name;`,
      hints: ['Two branches with the same three columns in the same order: role, last_name, first_name.', 'Practitioners: WHERE location_id = 4.', 'Patients: WHERE patient_id IN (SELECT patient_id FROM invoices WHERE location_id = 4).', 'Use UNION to drop duplicates and ORDER BY role, last_name, first_name.'],
      ordered: true,
    },
    quiz: [
      { q: 'The first SELECT names its column "role", the second "kind". What is the result column called?', options: ['kind', 'role', 'role_kind', 'An error'], answer: 1, why: 'Names come from the first SELECT.' },
      { q: 'SELECT a, b ... UNION SELECT b, a ... with both text columns will...', options: ['Raise an error', 'Swap the values silently', 'Match by name', 'Remove all rows'], answer: 1, why: 'Matching is by position only.' },
    ],
  },

  // ─────────────────────────────────────────────── 06 Duplicate Handling
  {
    id: 'setops-06',
    goals: ['Exactly which duplicates each set operation removes', 'That UNION also removes duplicates inside a single input', 'How NULLs are compared in set operations', 'ALL variants and how to emulate them'],
    concept: `<p>Set operations come from set theory, where a set has no duplicates. So by default:</p>
<ul>
<li><code>UNION</code>, <code>INTERSECT</code> and <code>EXCEPT</code> return <b>distinct</b> rows. They remove duplicates <b>within each input too</b>, not only between them.</li>
<li><code>UNION ALL</code> keeps every row (a "multiset" or "bag").</li>
<li>For duplicate detection, <b>NULL equals NULL</b>. Two patients with an unknown city count as the same row.</li>
</ul>
<p>The standard also has <code>INTERSECT ALL</code> and <code>EXCEPT ALL</code>, which count copies. SQLite does not support them.</p>`,
    why: 'Whether duplicates survive changes counts and totals. Many reporting bugs come from a UNION silently merging rows that were real, separate facts.',
    when: 'Decide deliberately each time: "are identical rows the same fact (remove) or separate facts (keep)?" Include a key column (like payment_id) when rows must stay distinct.',
    analogy: 'Two receptionists hand you their lists of patients who called today. If you want "who called", you cross out repeats (UNION). If you want "how many calls", you keep every line (UNION ALL). A caller who did not leave a name is still one "unknown" entry, not many.',
    exampleSql: `SELECT patient_id, city FROM patients WHERE patient_id <= 12`,
    syntax: `A UNION B          -- distinct rows of A + B\nA UNION ALL B      -- all rows\nA INTERSECT B      -- distinct rows in both\nA EXCEPT B         -- distinct rows of A not in B\n-- PostgreSQL only: INTERSECT ALL, EXCEPT ALL`,
    sql: `SELECT 'UNION ALL' AS op, COUNT(*) AS row_count\nFROM (SELECT city FROM patients UNION ALL SELECT city FROM treatment_locations)\nUNION ALL\nSELECT 'UNION', COUNT(*)\nFROM (SELECT city FROM patients UNION SELECT city FROM treatment_locations)\nUNION ALL\nSELECT 'patients alone, via UNION with nothing', COUNT(*)\nFROM (SELECT city FROM patients UNION SELECT city FROM patients WHERE 0);`,
    breakdown: [
      ['UNION ALL branch', '25 patient rows + 6 location rows = 31, nothing removed.'],
      ['UNION branch', 'Only the distinct cities survive, and all the NULL cities collapse into one NULL row.'],
      ['UNION with an empty query', 'Even with nothing to merge, UNION de-duplicates the first input by itself.'],
      ['The outer UNION ALL', 'Stacks the three counts into one small report.'],
    ],
    visual: { type: 'setops', a: `SELECT city FROM patients WHERE patient_id <= 12`, b: `SELECT city FROM treatment_locations`, op: 'UNION' },
    internals: `<p>De-duplication treats the <b>whole row</b> as a key and compares with "IS NOT DISTINCT FROM" semantics, so NULLs match each other. For <code>INTERSECT ALL</code> / <code>EXCEPT ALL</code>, PostgreSQL counts how many times each row appears on each side (a hash table of counters) and emits <code>min(a, b)</code> or <code>max(a - b, 0)</code> copies. You can emulate that in SQLite by numbering copies with <code>ROW_NUMBER() OVER (PARTITION BY value)</code> and applying a plain INTERSECT / EXCEPT to (value, copy_number).</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, amount FROM payments WHERE invoice_id = 1\nUNION\nSELECT invoice_id, amount FROM payments WHERE invoice_id = 2;`, why: 'Invoice 1 has two identical $165 payments; UNION removes one even though they are both inside the same input. Total collected is now wrong.', fix: `SELECT payment_id, invoice_id, amount FROM payments WHERE invoice_id = 1\nUNION\nSELECT payment_id, invoice_id, amount FROM payments WHERE invoice_id = 2;` },
      { wrong: `SELECT DISTINCT city FROM patients\nUNION\nSELECT DISTINCT city FROM treatment_locations;`, why: 'Not wrong, just wasted work: UNION already removes duplicates, so the DISTINCTs add an extra de-duplication step each.', fix: `SELECT city FROM patients\nUNION\nSELECT city FROM treatment_locations;` },
    ],
    rules: ['UNION / INTERSECT / EXCEPT return distinct rows.', 'De-duplication also applies within a single input.', 'NULL matches NULL in set operations.', 'Include a key column to keep separate facts separate.', 'SQLite has no INTERSECT ALL / EXCEPT ALL.'],
    compare: `<table><tr><th>A (values)</th><th>B (values)</th><th>Operation</th><th>Result</th></tr>
<tr><td>x, x, y, NULL</td><td>x, NULL, NULL</td><td>UNION</td><td>x, y, NULL</td></tr>
<tr><td></td><td></td><td>UNION ALL</td><td>x, x, y, NULL, x, NULL, NULL</td></tr>
<tr><td></td><td></td><td>INTERSECT</td><td>x, NULL</td></tr>
<tr><td></td><td></td><td>EXCEPT</td><td>y</td></tr>
<tr><td></td><td></td><td>INTERSECT ALL (PG)</td><td>x, NULL</td></tr>
<tr><td></td><td></td><td>EXCEPT ALL (PG)</td><td>x, y</td></tr></table>`,
    realWorld: 'Duplicate-payment detection deliberately compares with UNION ALL + GROUP BY ... HAVING COUNT(*) > 1; patient de-duplication (like patients 1 and 25, the same person entered twice) starts from which columns you consider "the same".',
    tips: ['Test: if COUNT(*) of UNION ALL differs from COUNT(*) of UNION, your inputs contain duplicates. Find out whether they are real before choosing.'],
    deep: `<p>Emulating <code>EXCEPT ALL</code> in SQLite:</p><p><code>SELECT city, ROW_NUMBER() OVER (PARTITION BY city) FROM a EXCEPT SELECT city, ROW_NUMBER() OVER (PARTITION BY city) FROM b</code>. Numbering the copies (Dallas#1, Dallas#2, ...) makes each copy distinct, so the plain EXCEPT removes one copy from A for every copy in B.</p>`,
    tryIt: { prompt: 'Find payments that look duplicated: same invoice, date, amount and method. Change the HAVING to see all groups.', starter: `SELECT invoice_id, payment_date, amount, method, COUNT(*) AS copies\nFROM payments\nGROUP BY invoice_id, payment_date, amount, method\nHAVING COUNT(*) > 1;` },
    challenge: {
      level: 3,
      prompt: 'In one row, show: the number of rows returned by (patient cities UNION ALL location cities) and the number returned by (patient cities UNION location cities). Include NULL cities.',
      solution: `SELECT (SELECT COUNT(*) FROM (SELECT city FROM patients UNION ALL SELECT city FROM treatment_locations)) AS all_rows, (SELECT COUNT(*) FROM (SELECT city FROM patients UNION SELECT city FROM treatment_locations)) AS distinct_rows;`,
      hints: ['Put each set operation inside a subquery in FROM, and COUNT(*) its rows.', 'Wrap each count in a scalar subquery: (SELECT COUNT(*) FROM (...)).', 'One uses UNION ALL, the other UNION. No WHERE on city.', 'SELECT (SELECT COUNT(*) FROM (... UNION ALL ...)), (SELECT COUNT(*) FROM (... UNION ...));'],
    },
    quiz: [
      { q: 'SELECT NULL UNION SELECT NULL returns how many rows?', options: ['0', '1', '2', 'An error'], answer: 1, why: 'In set operations NULLs are "not distinct", so they collapse into one.' },
      { q: 'A alone has Dallas twice. What does A UNION (empty query) return for Dallas?', options: ['Dallas twice', 'Dallas once', 'Nothing', 'NULL'], answer: 1, why: 'UNION de-duplicates the combined result, including within one input.' },
      { q: 'Which is NOT available in SQLite?', options: ['UNION ALL', 'EXCEPT', 'INTERSECT ALL', 'INTERSECT'], answer: 2, why: 'SQLite supports UNION, UNION ALL, INTERSECT and EXCEPT only.' },
    ],
  },

  // ─────────────────────────────────────────────── 07 ORDER BY with Set Operations
  {
    id: 'setops-07',
    goals: ['Where ORDER BY and LIMIT go in a compound query', 'Which column names and positions ORDER BY can use', 'How to sort or limit each branch separately', 'How to force a custom order (for example totals last)'],
    concept: `<p>A compound query (A UNION B ...) can have only <b>one</b> <code>ORDER BY</code>, and it goes at the <b>very end</b>. It sorts the <b>final combined result</b>, not the last SELECT. The same goes for <code>LIMIT</code>.</p>
<p>ORDER BY can refer to:</p>
<ul><li>the column <b>names of the first SELECT</b> (its aliases), or</li><li>column <b>positions</b> (1, 2, ...).</li></ul>
<p>In SQLite it <b>cannot</b> use expressions such as <code>amount * 2</code> or <code>city IS NULL</code>. To sort by an expression, or to sort/limit a single branch, wrap the query in a subquery.</p>`,
    why: 'Reports usually need a specific order, and "top N per source" is a very common request. Knowing the rules avoids syntax errors and wrong results.',
    when: 'Whenever you sort or paginate a UNION result, or need the top rows from each branch.',
    analogy: 'Two clerks each bring a pile of slips. You can only sort once you have made one pile. If you want "the 3 biggest slips from each clerk", each clerk must pick their 3 before the piles are merged.',
    exampleSql: `SELECT payment_id, amount FROM payments ORDER BY amount DESC LIMIT 5`,
    syntax: `SELECT a AS x, b AS y FROM t1\nUNION ALL\nSELECT c, d FROM t2\nORDER BY x DESC, 2      -- first SELECT's names or positions\nLIMIT 10;               -- limits the combined result\n\n-- per-branch limit / expression sort: wrap it\nSELECT * FROM (SELECT ... ORDER BY ... LIMIT 3)\nUNION ALL\nSELECT * FROM (SELECT ... ORDER BY ... LIMIT 3);`,
    sql: `SELECT * FROM (\n  SELECT 'payment' AS kind, payment_id AS id, amount\n  FROM payments ORDER BY amount DESC, payment_id LIMIT 3\n)\nUNION ALL\nSELECT * FROM (\n  SELECT 'charge', charge_id, amount\n  FROM charges ORDER BY amount DESC, charge_id LIMIT 3\n)\nORDER BY amount DESC, kind, id;`,
    breakdown: [
      ['SELECT * FROM ( ... ORDER BY amount DESC ... LIMIT 3 )', 'Branch 1 is wrapped, so its own ORDER BY + LIMIT picks the 3 largest payments.'],
      ['UNION ALL', 'Append the second branch.'],
      ['SELECT * FROM ( ... charges ... LIMIT 3 )', 'The 3 largest charges, also chosen inside a wrapper.'],
      ['ORDER BY amount DESC, kind, id', 'One final sort of all 6 rows, using the first branch\'s column names.'],
    ],
    visual: { type: 'setops', a: `SELECT payor_id FROM invoices WHERE invoice_id <= 10`, b: `SELECT payor_id FROM payments WHERE payment_id <= 10`, op: 'UNION' },
    internals: `<p>For UNION (distinct), SQLite often de-duplicates using a sorted temporary B-tree; when the final ORDER BY matches that order, it can skip the extra sort. The final ORDER BY is applied to the compound result as a whole, which is why it may only reference output columns: at that point the individual tables and their other columns no longer exist.</p>`,
    mistakes: [
      { wrong: `SELECT city FROM patients ORDER BY city\nUNION\nSELECT city FROM treatment_locations;`, why: 'ORDER BY is not allowed before UNION ("ORDER BY clause should come after UNION not before").', fix: `SELECT city FROM patients\nUNION\nSELECT city FROM treatment_locations\nORDER BY city;` },
      { wrong: `SELECT city FROM patients\nUNION\nSELECT city FROM treatment_locations\nORDER BY city IS NULL, city;`, why: 'SQLite: "1st ORDER BY term does not match any column in the result set". Compound ORDER BY accepts only result columns.', fix: `SELECT * FROM (\n  SELECT city FROM patients\n  UNION\n  SELECT city FROM treatment_locations\n)\nORDER BY city IS NULL, city;` },
      { wrong: `SELECT location_name AS place FROM treatment_locations\nUNION ALL\nSELECT city AS town FROM patients\nORDER BY town;`, why: 'Only the first SELECT\'s names count. "town" is unknown to the compound ORDER BY.', fix: `SELECT location_name AS place FROM treatment_locations\nUNION ALL\nSELECT city AS town FROM patients\nORDER BY place;` },
    ],
    rules: ['One ORDER BY, at the very end.', 'It sorts the whole combined result.', 'Use first-SELECT names or positions.', 'Expressions or per-branch LIMIT need a subquery wrapper.', 'LIMIT at the end limits the whole result.'],
    compare: `<table><tr><th>Goal</th><th>Write</th></tr>
<tr><td>Sort everything</td><td><code>A UNION B ORDER BY col</code></td></tr>
<tr><td>Top 10 overall</td><td><code>A UNION ALL B ORDER BY col DESC LIMIT 10</code></td></tr>
<tr><td>Top 3 from each</td><td><code>SELECT * FROM (A ... LIMIT 3) UNION ALL SELECT * FROM (B ... LIMIT 3)</code></td></tr>
<tr><td>Custom order (totals last)</td><td><code>SELECT * FROM (A UNION ALL B) ORDER BY col IS NULL, col</code></td></tr></table>`,
    realWorld: 'Activity feeds ("latest 20 events across charges, payments and notes"), top-N dashboards per source, and subtotal reports where totals must appear last.',
    tips: ['Add a hidden sort column (like 1 AS sort_group in branch A, 2 in branch B) to keep the branches in a fixed order after the final sort.'],
    deep: `<p>PostgreSQL and SQL Server let you parenthesise branches: <code>(SELECT ... ORDER BY ... LIMIT 3) UNION ALL (SELECT ... LIMIT 3)</code>. SQLite does not accept parenthesised compound members, so the portable form is the derived table <code>SELECT * FROM (...)</code>. Remember: without an outer ORDER BY, even a UNION ALL of sorted branches has no guaranteed order.</p>`,
    tryIt: { prompt: 'Add a sort_group column (1 for charges, 2 for payments) and sort by it first so all charges appear before payments, then by date.', starter: `SELECT service_date AS d, 'CHARGE' AS kind, amount FROM charges WHERE invoice_id = 16\nUNION ALL\nSELECT payment_date, 'PAYMENT', -amount FROM payments WHERE invoice_id = 16\nORDER BY d;` },
    challenge: {
      level: 3,
      prompt: "Show the 2 most recent payments (kind 'payment', id, date) and the 2 most recent invoices (kind 'invoice', id, date) in one result. Break date ties by the higher id first. Sort the final result by date descending, then kind, then id.",
      solution: `SELECT * FROM (SELECT 'payment' AS kind, payment_id AS id, payment_date AS d FROM payments ORDER BY payment_date DESC, payment_id DESC LIMIT 2) UNION ALL SELECT * FROM (SELECT 'invoice', invoice_id, invoice_date FROM invoices ORDER BY invoice_date DESC, invoice_id DESC LIMIT 2) ORDER BY d DESC, kind, id;`,
      hints: ['Each branch needs its own ORDER BY ... LIMIT 2, so wrap each in SELECT * FROM (...).', 'Payments: ORDER BY payment_date DESC, payment_id DESC LIMIT 2.', 'Invoices: ORDER BY invoice_date DESC, invoice_id DESC LIMIT 2.', 'Combine with UNION ALL and finish with ORDER BY d DESC, kind, id (names from the first branch).'],
      ordered: true,
    },
    quiz: [
      { q: 'In A UNION B ORDER BY x, what does ORDER BY sort?', options: ['Only B', 'Only A', 'The combined result', 'Each branch separately'], answer: 2, why: 'The single ORDER BY applies to the whole compound result.' },
      { q: 'How do you take the top 3 rows from each branch in SQLite?', options: ['LIMIT 3 after each SELECT directly', 'Wrap each branch: SELECT * FROM (... LIMIT 3)', 'LIMIT 6 at the end', 'Use TOP 3'], answer: 1, why: 'A bare LIMIT before UNION is not allowed; a derived table makes it legal.' },
    ],
  },

  // ─────────────────────────────────────────────── 08 UNION vs JOIN
  {
    id: 'setops-08',
    goals: ['UNION combines rows (vertically); JOIN combines columns (horizontally)', 'When each one is the right tool', 'How a JOIN can multiply rows and a UNION ALL avoids it', 'The UNION ALL + GROUP BY pattern for side-by-side totals'],
    concept: `<p>Both combine data from two sources, but in different directions:</p>
<ul>
<li><b>JOIN</b> glues tables <b>side by side</b>: each output row has columns from both tables, matched by a condition (<code>ON invoice_id = ...</code>).</li>
<li><b>UNION</b> stacks results <b>on top of each other</b>: each output row comes from one query or the other, with the same columns.</li>
</ul>
<p>Rule of thumb: <b>"more attributes about the same thing"</b> → JOIN. <b>"more things of the same kind"</b> → UNION.</p>
<p>A classic trap: joining an invoice to its charges <b>and</b> its payments multiplies rows (2 charges × 2 payments = 4 rows), so SUMs double. Stacking charges and payments with UNION ALL, then grouping, avoids that.</p>`,
    why: 'Choosing the wrong one gives either an error, a result with the wrong shape, or, worst, inflated totals that look plausible.',
    when: 'JOIN when you need columns from related tables on the same row. UNION when you need rows of the same shape from different sources in one list.',
    analogy: 'JOIN is stapling the insurance card photocopy next to the patient registration form: one wider record. UNION is putting this week\'s and last week\'s registration forms into one taller pile.',
    exampleSql: `SELECT invoice_id, charge_id, amount FROM charges WHERE invoice_id = 7`,
    syntax: `-- JOIN: wider rows\nSELECT a.x, b.y FROM a JOIN b ON a.id = b.a_id;\n\n-- UNION ALL: more rows\nSELECT id, x FROM a\nUNION ALL\nSELECT id, y FROM b;`,
    sql: `-- side-by-side totals without row multiplication\nSELECT invoice_id,\n       SUM(CASE WHEN kind = 'charge'  THEN amount ELSE 0 END) AS charged,\n       SUM(CASE WHEN kind = 'payment' THEN amount ELSE 0 END) AS paid\nFROM (\n  SELECT invoice_id, 'charge' AS kind, amount FROM charges\n  UNION ALL\n  SELECT invoice_id, 'payment', amount FROM payments\n)\nWHERE invoice_id <= 8\nGROUP BY invoice_id\nORDER BY invoice_id;`,
    breakdown: [
      ["SELECT invoice_id, 'charge' AS kind, amount FROM charges", 'All charges, tagged.'],
      ["UNION ALL SELECT invoice_id, 'payment', amount FROM payments", 'All payments, tagged, stacked underneath (ALL, so equal amounts are not lost).'],
      ['GROUP BY invoice_id', 'One row per invoice.'],
      ["SUM(CASE WHEN kind = 'charge' ...)", 'Turn the stacked rows back into two side-by-side columns. Each charge and payment is counted exactly once.'],
    ],
    visual: { type: 'setops', a: `SELECT invoice_id FROM charges WHERE invoice_id <= 8`, b: `SELECT invoice_id FROM payments WHERE invoice_id <= 8`, op: 'UNION ALL' },
    internals: `<p>A JOIN produces, for each key, the <b>product</b> of matching rows: invoice 7 with 2 charges and 2 payments yields 2 × 2 = 4 joined rows, so every charge is repeated twice. UNION ALL produces the <b>sum</b> (2 + 2 = 4 rows, each original row once). That is why "stack, then aggregate" is safe with several one-to-many children, while "join everything, then aggregate" is not.</p>`,
    mistakes: [
      { wrong: `SELECT i.invoice_id, SUM(c.amount) AS charged, SUM(p.amount) AS paid\nFROM invoices i\nJOIN charges c ON c.invoice_id = i.invoice_id\nJOIN payments p ON p.invoice_id = i.invoice_id\nWHERE i.invoice_id = 7\nGROUP BY i.invoice_id;`, why: 'Invoice 7 has 2 charges and 2 payments, so the joins make 4 rows and both sums are doubled (charged 380 instead of 190).', fix: `SELECT invoice_id,\n       SUM(CASE WHEN kind = 'charge' THEN amount ELSE 0 END) AS charged,\n       SUM(CASE WHEN kind = 'payment' THEN amount ELSE 0 END) AS paid\nFROM (SELECT invoice_id, 'charge' AS kind, amount FROM charges\n      UNION ALL\n      SELECT invoice_id, 'payment', amount FROM payments)\nWHERE invoice_id = 7\nGROUP BY invoice_id;` },
      { wrong: `SELECT first_name, last_name FROM patients\nJOIN practitioners ON 1 = 1;`, why: 'To make one list of patients and practitioners you need UNION (more rows), not a JOIN (which pairs every patient with every practitioner: 300 rows).', fix: `SELECT first_name, last_name FROM patients\nUNION ALL\nSELECT first_name, last_name FROM practitioners;` },
    ],
    rules: ['JOIN adds columns; UNION adds rows.', 'JOIN needs a matching condition; UNION needs matching shapes.', 'Joining two one-to-many children multiplies rows.', 'UNION ALL + GROUP BY gives safe side-by-side totals.'],
    compare: `<table><tr><th></th><th>JOIN</th><th>UNION / UNION ALL</th></tr>
<tr><td>Direction</td><td>horizontal (wider)</td><td>vertical (taller)</td></tr>
<tr><td>Requirement</td><td>ON condition</td><td>same column count / types</td></tr>
<tr><td>Rows per key</td><td>product of matches</td><td>sum of rows</td></tr>
<tr><td>Typical question</td><td>"invoice with its patient's name"</td><td>"all charges and payments as a ledger"</td></tr></table>`,
    realWorld: 'Accounts-receivable summaries (billed vs collected per invoice) are often built with the stack-and-pivot pattern to avoid the charges × payments fan-out.',
    tips: ['If a SUM after a multi-table JOIN looks too high, check for fan-out: compare COUNT(*) with COUNT(DISTINCT child_id).'],
    deep: `<p>The other safe alternative is pre-aggregation: aggregate charges per invoice and payments per invoice in two CTEs, then JOIN the two one-row-per-invoice results. Both approaches scan each child once. The stack-and-pivot version is a single GROUP BY; the pre-aggregation version is easier to extend with LEFT JOINs to invoices that have no children.</p>`,
    tryIt: { prompt: 'Run the doubled-sum JOIN from the mistakes section, then compare it with this correct stack-and-pivot query for invoice 7.', starter: `SELECT invoice_id,\n       SUM(CASE WHEN kind = 'charge'  THEN amount ELSE 0 END) AS charged,\n       SUM(CASE WHEN kind = 'payment' THEN amount ELSE 0 END) AS paid\nFROM (\n  SELECT invoice_id, 'charge' AS kind, amount FROM charges\n  UNION ALL\n  SELECT invoice_id, 'payment', amount FROM payments\n)\nWHERE invoice_id = 7\nGROUP BY invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'For invoices 1 to 10, show invoice_id, the total charged, the total paid, and the balance (charged - paid), using UNION ALL of charges and payments (no JOIN). Order by invoice_id.',
      solution: `SELECT invoice_id, SUM(CASE WHEN kind = 'c' THEN amount ELSE 0 END) AS charged, SUM(CASE WHEN kind = 'p' THEN amount ELSE 0 END) AS paid, SUM(CASE WHEN kind = 'c' THEN amount ELSE -amount END) AS balance FROM (SELECT invoice_id, 'c' AS kind, amount FROM charges UNION ALL SELECT invoice_id, 'p', amount FROM payments) WHERE invoice_id BETWEEN 1 AND 10 GROUP BY invoice_id ORDER BY invoice_id;`,
      hints: ['Stack charges and payments with UNION ALL in a subquery, tagging each row with a kind.', 'Filter the stacked rows to invoice_id BETWEEN 1 AND 10 and GROUP BY invoice_id.', 'Two conditional SUMs give charged and paid; a third with ELSE -amount gives the balance.', 'ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Invoice has 3 charges and 2 payments. How many rows does joining it to both produce?', options: ['5', '6', '3', '2'], answer: 1, why: 'Each charge pairs with each payment: 3 × 2.' },
      { q: 'You want one list of all patient and practitioner names. Use...', options: ['INNER JOIN', 'CROSS JOIN', 'UNION ALL', 'INTERSECT'], answer: 2, why: 'More rows of the same shape: UNION (ALL).' },
    ],
  },

  // ─────────────────────────────────────────────── 09 UNION vs OR
  {
    id: 'setops-09',
    goals: ['Rewrite an OR condition as a UNION of two queries', 'When the two forms give the same result, and when they do not', 'Why UNION can be faster than OR with indexes', 'Use UNION when the conditions come from different tables'],
    concept: `<p>On a <b>single table</b>, these two queries find the same invoices:</p>
<ul>
<li><code>WHERE status = 'Overdue' OR location_id = 3</code></li>
<li><code>... WHERE status = 'Overdue' UNION ... WHERE location_id = 3</code></li>
</ul>
<p>An invoice matching both conditions appears once in each: OR tests each row once, and UNION removes the duplicate. They stay equivalent <b>only if the selected columns include a unique key</b> (like invoice_id). Without a key, UNION also merges different rows that happen to look alike.</p>
<p>UNION shines when the conditions involve <b>different tables or joins</b> ("patients who have an overdue invoice OR made a cash payment"), where a single OR would be awkward.</p>`,
    why: 'OR across different columns can prevent an index from being used. Splitting into a UNION lets each branch use its own index. It also makes complex "either/or" logic easier to read.',
    when: 'Use plain OR for simple conditions on one table. Consider UNION when each condition has its own index and the table is large, or when the conditions need different joins.',
    analogy: 'Finding charts to review: "all charts flagged overdue, or from the urgent-care clinic". One clerk can go through every chart once checking both (OR), or two clerks each pull from their own index drawer and then remove duplicates (UNION).',
    exampleSql: `SELECT invoice_id, location_id, status FROM invoices WHERE status = 'Overdue' OR location_id = 3`,
    syntax: `-- OR\nSELECT key, ... FROM t WHERE cond1 OR cond2;\n\n-- UNION (keep a unique key in the select list!)\nSELECT key, ... FROM t WHERE cond1\nUNION\nSELECT key, ... FROM t WHERE cond2;`,
    sql: `SELECT invoice_id, location_id, status FROM invoices WHERE status = 'Overdue'\nUNION\nSELECT invoice_id, location_id, status FROM invoices WHERE location_id = 3\nORDER BY invoice_id;`,
    breakdown: [
      ["... WHERE status = 'Overdue'", 'Branch 1: all overdue invoices.'],
      ['UNION', 'Merge, removing invoices that appear in both branches (overdue AND at location 3).'],
      ['... WHERE location_id = 3', 'Branch 2: all invoices at Northside Urgent Care.'],
      ['ORDER BY invoice_id', 'Same rows as the OR version, sorted.'],
    ],
    visual: { type: 'setops', a: `SELECT invoice_id FROM invoices WHERE status = 'Overdue'`, b: `SELECT invoice_id FROM invoices WHERE location_id = 3`, op: 'UNION' },
    internals: `<p>With an index on <code>status</code> and another on <code>location_id</code>, a single B-tree can serve only one of the OR conditions, so a naive plan falls back to a full scan. SQLite has an "OR optimization" (MULTI-INDEX OR) that runs one index lookup per term and merges rowids, which is essentially an automatic UNION; PostgreSQL does the same with BitmapOr. When the optimizer cannot do that (for example, OR across joined tables), a manual UNION forces the index-per-branch plan.</p>`,
    mistakes: [
      { wrong: `SELECT location_id, status FROM invoices WHERE status = 'Overdue'\nUNION\nSELECT location_id, status FROM invoices WHERE location_id = 3;`, why: 'No unique key selected: many different overdue invoices at the same location collapse into one row. The OR version would return all of them.', fix: `SELECT invoice_id, location_id, status FROM invoices WHERE status = 'Overdue'\nUNION\nSELECT invoice_id, location_id, status FROM invoices WHERE location_id = 3;` },
      { wrong: `SELECT invoice_id FROM invoices WHERE status = 'Overdue'\nUNION ALL\nSELECT invoice_id FROM invoices WHERE location_id = 3;`, why: 'UNION ALL keeps invoices that match both conditions twice. OR never returns a row twice.', fix: `SELECT invoice_id FROM invoices WHERE status = 'Overdue'\nUNION\nSELECT invoice_id FROM invoices WHERE location_id = 3;` },
    ],
    rules: ['OR ≡ UNION only when a unique key is selected.', 'OR ≠ UNION ALL when rows can match both conditions.', 'UNION helps when each condition has its own index or its own joins.', 'Measure with EXPLAIN QUERY PLAN before rewriting.'],
    compare: `<table><tr><th></th><th>OR</th><th>UNION</th></tr>
<tr><td>Passes over data</td><td>1</td><td>1 per branch (+ de-dup)</td></tr>
<tr><td>Index use</td><td>often one index or a scan</td><td>one index per branch</td></tr>
<tr><td>Duplicate rows</td><td>never created</td><td>created, then removed</td></tr>
<tr><td>Different tables per condition</td><td>awkward</td><td>natural</td></tr></table>`,
    realWorld: 'Collections worklists ("overdue OR had a write-off OR patient has no payor on file") are often built as a UNION of focused queries, one per rule, often with a label column saying which rule matched.',
    tips: ['Add a reason column to each branch and use UNION ALL + GROUP BY key to list every rule that matched each invoice.'],
    deep: `<p>The reverse rewrite also exists: optimizers can turn <code>UNION</code> of two queries on the same table with the same columns into a single scan with OR. PostgreSQL's planner handles OR with BitmapOr; MySQL has "index_merge union". Neither applies to OR across joins, which is where manual UNION rewrites still pay off.</p>`,
    tryIt: { prompt: 'Compare row counts: run the OR version, then the UNION version, then UNION ALL. Which matches which?', starter: `SELECT COUNT(*) FROM invoices WHERE status = 'Overdue' OR location_id = 3;` },
    challenge: {
      level: 3,
      prompt: "Build a collections worklist of patient_ids who either have an Overdue invoice OR have ever made a Cash payment on any of their invoices. Use UNION. Order by patient_id.",
      solution: `SELECT patient_id FROM invoices WHERE status = 'Overdue' UNION SELECT i.patient_id FROM payments p JOIN invoices i ON i.invoice_id = p.invoice_id WHERE p.method = 'Cash' ORDER BY patient_id;`,
      hints: ['Branch 1: patient_id from invoices where status is Overdue.', 'Branch 2 needs the patient of each cash payment: join payments to invoices on invoice_id.', "Filter branch 2 with p.method = 'Cash' and combine with UNION.", 'ORDER BY patient_id at the end.'],
      ordered: true,
    },
    quiz: [
      { q: 'When is WHERE a OR b equivalent to (WHERE a) UNION (WHERE b)?', options: ['Always', 'When a unique key is in the select list', 'Never', 'Only with UNION ALL'], answer: 1, why: 'Without a key, UNION can merge distinct rows that look the same.' },
      { q: 'Why can UNION be faster than OR?', options: ['UNION never sorts', 'Each branch can use its own index', 'OR is not supported by indexes at all', 'UNION caches results'], answer: 1, why: 'One index per branch instead of a full scan.' },
    ],
  },

  // ─────────────────────────────────────────────── 10 Real-World Set Operation Problems
  {
    id: 'setops-10',
    goals: ['Solve reconciliation problems with EXCEPT', 'Find all differences between two data sets (symmetric difference)', 'Build rule-based worklists with UNION and EXCEPT', 'Combine set operations with CTEs for readable pipelines'],
    concept: `<p>Set operations are the everyday tools of <b>data reconciliation</b>: checking that two sources agree.</p>
<ul>
<li><b>Missing</b>: <code>A EXCEPT B</code>, "in the invoice header but not supported by charges".</li>
<li><b>All differences</b>: <code>(A EXCEPT B) UNION ALL (B EXCEPT A)</code>, the symmetric difference, with a label saying which side each row came from.</li>
<li><b>Worklists</b>: <code>rule1 UNION rule2 EXCEPT exclusions</code>.</li>
</ul>
<p>Because set operations compare <b>whole rows</b>, comparing (invoice_id, amount) finds both missing invoices <b>and</b> invoices whose amounts disagree.</p>`,
    why: 'Billing data flows between systems (charges → invoices → transactions → payments). Every hand-off can drop or change something, and set operations find those gaps quickly.',
    when: 'Use these patterns for audits, month-end close, data-migration checks, and building "needs attention" lists from several rules.',
    analogy: 'The month-end close: the accountant compares the invoice register with the itemised charge lines. Every invoice whose total does not equal the sum of its lines goes on a "fix me" list. EXCEPT is that comparison.',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id BETWEEN 34 AND 40`,
    syntax: `WITH a AS (...), b AS (...)\nSELECT 'only in A' AS side, * FROM (SELECT * FROM a EXCEPT SELECT * FROM b)\nUNION ALL\nSELECT 'only in B', * FROM (SELECT * FROM b EXCEPT SELECT * FROM a);`,
    sql: `-- Do invoice totals agree with their charge lines?\nWITH header AS (\n  SELECT invoice_id, total_amount AS amount FROM invoices\n),\nlines AS (\n  SELECT invoice_id, SUM(amount) AS amount FROM charges GROUP BY invoice_id\n)\nSELECT 'header only / differs' AS side, * FROM (SELECT * FROM header EXCEPT SELECT * FROM lines)\nUNION ALL\nSELECT 'lines only / differs', * FROM (SELECT * FROM lines EXCEPT SELECT * FROM header)\nORDER BY invoice_id;`,
    breakdown: [
      ['header CTE', 'What each invoice claims its total is.'],
      ['lines CTE', 'What its charge lines actually add up to.'],
      ['header EXCEPT lines', 'Invoices whose (id, amount) pair has no exact match in the lines: missing lines or a different total.'],
      ['lines EXCEPT header', 'The reverse direction: charge totals that do not match any header.'],
      ['UNION ALL with a side label', 'One report of all differences. Here only the voided invoice 37 shows up: it has a header but no charge lines.'],
    ],
    visual: { type: 'setops', a: `SELECT patient_id FROM patients`, b: `SELECT patient_id FROM invoices`, op: 'EXCEPT' },
    internals: `<p>Each EXCEPT builds a temporary set from its right side and probes it with the left side, so the symmetric difference costs about two passes over each source. For very large tables, a <b>FULL OUTER JOIN</b> on the key with <code>WHERE a.amount IS DISTINCT FROM b.amount</code> does it in one join and also shows both amounts side by side. That is often the better production choice; EXCEPT is the quickest to write and needs no knowledge of the key.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, total_amount FROM invoices\nEXCEPT\nSELECT invoice_id, amount FROM charges;`, why: 'Compares invoice totals with individual charge lines instead of their sum, so almost every multi-line invoice looks wrong.', fix: `SELECT invoice_id, total_amount FROM invoices\nEXCEPT\nSELECT invoice_id, SUM(amount) FROM charges GROUP BY invoice_id;` },
      { wrong: `SELECT invoice_id FROM invoices WHERE status = 'Overdue'\nUNION\nSELECT invoice_id FROM transactions WHERE transaction_type = 'WRITE_OFF'\nEXCEPT\nSELECT invoice_id FROM invoices WHERE status = 'Void'\nUNION\nSELECT 24;`, why: 'SQLite evaluates compound operators left to right; mixing many of them without structure makes it hard to see what is excluded from what (and other databases give INTERSECT higher precedence).', fix: `WITH worklist AS (\n  SELECT invoice_id FROM invoices WHERE status = 'Overdue'\n  UNION\n  SELECT invoice_id FROM transactions WHERE transaction_type = 'WRITE_OFF'\n)\nSELECT invoice_id FROM worklist\nEXCEPT\nSELECT invoice_id FROM invoices WHERE status = 'Void';` },
    ],
    rules: ['Missing: A EXCEPT B. All differences: (A EXCEPT B) UNION ALL (B EXCEPT A).', 'Compare aggregated values at the same grain (invoice total vs SUM of lines).', 'Label each side so the report explains itself.', 'Use CTEs to name each piece of a complex set pipeline.'],
    compare: `<table><tr><th>Task</th><th>Set operation</th><th>Alternative</th></tr>
<tr><td>Missing records</td><td>A EXCEPT B</td><td>NOT EXISTS / LEFT JOIN IS NULL</td></tr>
<tr><td>All differences</td><td>(A EXCEPT B) UNION ALL (B EXCEPT A)</td><td>FULL OUTER JOIN + IS DISTINCT FROM</td></tr>
<tr><td>Common records</td><td>A INTERSECT B</td><td>EXISTS / INNER JOIN</td></tr>
<tr><td>Rule-based worklist</td><td>r1 UNION r2 EXCEPT excl</td><td>OR / NOT EXISTS in one WHERE</td></tr></table>`,
    realWorld: 'Clearinghouse reconciliation (claims sent vs 277 acknowledgements received), ERA/835 payment posting checks, migration sign-off (legacy table EXCEPT new table must be empty), and patient de-duplication audits.',
    tips: ['For a migration check, run both directions: an empty A EXCEPT B alone does not prove the tables are equal.'],
    deep: `<p>Set operations compare rows with "IS NOT DISTINCT FROM" semantics, so NULLs on both sides match, which is exactly what you want for a diff. Floating-point money is the classic gotcha: 0.1 + 0.2 is not exactly 0.3, so compare <code>ROUND(amount, 2)</code> on both sides, or store cents as integers.</p>`,
    tryIt: { prompt: 'Find patients who look like duplicates: same first_name, last_name and date_of_birth appearing more than once (patient 25 duplicates patient 1).', starter: `SELECT first_name, last_name, date_of_birth FROM patients WHERE patient_id <= 12\nINTERSECT\nSELECT first_name, last_name, date_of_birth FROM patients WHERE patient_id > 12;` },
    challenge: {
      level: 4,
      prompt: "Build a collections worklist of invoice_ids: invoices that are Overdue, plus invoices that had a REFUND, WRITE_OFF or ADJUSTMENT transaction, but excluding Void invoices. Order by invoice_id.",
      solution: `WITH worklist AS (SELECT invoice_id FROM invoices WHERE status = 'Overdue' UNION SELECT invoice_id FROM transactions WHERE transaction_type IN ('REFUND', 'WRITE_OFF', 'ADJUSTMENT')) SELECT invoice_id FROM worklist EXCEPT SELECT invoice_id FROM invoices WHERE status = 'Void' ORDER BY invoice_id;`,
      hints: ['There are two "include" rules and one "exclude" rule.', 'Combine the include rules with UNION (overdue invoices, and invoices from special transactions).', 'Then EXCEPT the Void invoices. A CTE keeps it readable.', 'ORDER BY invoice_id at the end.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which expression gives every row that is in exactly one of A and B?', options: ['A INTERSECT B', '(A EXCEPT B) UNION ALL (B EXCEPT A)', 'A UNION B', 'A EXCEPT B'], answer: 1, why: 'The symmetric difference: each side minus the other.' },
      { q: 'A EXCEPT B is empty. Are A and B identical?', options: ['Yes', 'Not necessarily: B may have extra rows', 'Only if both are sorted', 'Only with UNION ALL'], answer: 1, why: 'You must also check B EXCEPT A (and duplicates, if they matter).' },
    ],
  },
]);
