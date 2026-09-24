// SQL interview question bank. All SQL runs on the Healthcare Billing sample database (SQLite).
// Types: mcq | predict | write | debug | scenario. See tools/CONTENT_GUIDE.md for the data.
window.InterviewBank = [
  // ───────────────────────── Fundamentals ─────────────────────────
  { id: 'iv-001', category: 'Fundamentals', type: 'mcq', difficulty: 1,
    q: 'In the logical processing order of a SELECT statement, which clause is evaluated first?',
    options: ['SELECT', 'WHERE', 'FROM', 'ORDER BY'], answer: 2,
    why: 'The engine first decides which rows exist (FROM and JOINs), then filters them (WHERE), groups (GROUP BY / HAVING), computes the SELECT list, and finally sorts (ORDER BY) and limits. That is why a SELECT alias cannot be used in WHERE in standard SQL.' },

  { id: 'iv-002', category: 'Fundamentals', type: 'predict', difficulty: 1,
    q: 'What does this query return?',
    sql: `SELECT COUNT(*) FROM patients WHERE allergies = NULL;`,
    options: ['0', '8', '17', '25'], answer: 0,
    why: 'Any comparison with NULL using = gives UNKNOWN, never TRUE, so no row passes the filter. To find the 17 patients with no allergies recorded you must write allergies IS NULL.' },

  { id: 'iv-003', category: 'Fundamentals', type: 'predict', difficulty: 2,
    q: 'What does this query return? (patients has 25 rows; some cities are NULL.)',
    sql: `SELECT COUNT(*), COUNT(city), COUNT(DISTINCT city) FROM patients;`,
    options: ['25 | 25 | 6', '25 | 19 | 5', '25 | 19 | 6', '19 | 19 | 5'], answer: 1,
    why: 'COUNT(*) counts rows (25). COUNT(city) skips NULLs (19). COUNT(DISTINCT city) counts distinct non-NULL values: Dallas, Round Rock, Houston, Austin and Plano = 5. NULL is never counted as a distinct value.' },

  { id: 'iv-004', category: 'Fundamentals', type: 'write', difficulty: 1,
    q: 'Write a query that lists patients with no allergies recorded: patient_id, first_name, last_name, ordered by patient_id.',
    solution: `SELECT patient_id, first_name, last_name
FROM patients
WHERE allergies IS NULL
ORDER BY patient_id;`,
    ordered: true,
    hints: ['The data is in the patients table.', 'A missing value is NULL, not an empty string.', 'Use WHERE allergies IS NULL (not = NULL).'],
    why: 'IS NULL is the only reliable test for a missing value. "= NULL" evaluates to UNKNOWN for every row and returns nothing.' },

  { id: 'iv-005', category: 'Fundamentals', type: 'debug', difficulty: 2,
    q: 'This query is supposed to list every patient who does NOT live in Dallas, including patients whose city is unknown. It misses some patients. Fix it.',
    sql: `SELECT patient_id, city
FROM patients
WHERE city <> 'Dallas'
ORDER BY patient_id;`,
    solution: `SELECT patient_id, city
FROM patients
WHERE city <> 'Dallas' OR city IS NULL
ORDER BY patient_id;`,
    ordered: true,
    hints: ['Look at the patients whose city is NULL.', 'What is NULL <> \'Dallas\'?', 'Add OR city IS NULL (or use city IS NOT \'Dallas\' in SQLite).'],
    why: 'NULL <> \'Dallas\' is UNKNOWN, and WHERE only keeps TRUE rows, so the 6 patients with a NULL city were silently dropped. Handle NULL explicitly with OR city IS NULL (or the null-safe IS NOT / IS DISTINCT FROM).' },

  { id: 'iv-006', category: 'Fundamentals', type: 'mcq', difficulty: 2,
    q: 'Why does standard SQL reject SELECT total_amount * 0.8 AS expected FROM invoices WHERE expected > 100?',
    options: ['Aliases can only be used with GROUP BY', 'WHERE is evaluated before the SELECT list, so the alias does not exist yet', 'Arithmetic is not allowed in the SELECT list', 'The alias must be written in double quotes'], answer: 1,
    why: 'WHERE runs before SELECT, so aliases defined in SELECT are not visible there. Repeat the expression, or wrap the query in a subquery/CTE. (SQLite and MySQL happen to allow it as an extension, but PostgreSQL, SQL Server and Oracle do not.)' },

  { id: 'iv-007', category: 'Fundamentals', type: 'mcq', difficulty: 3,
    q: 'Which statement best describes the difference between DELETE, TRUNCATE and DROP?',
    options: [
      'They are synonyms; all three remove rows',
      'DELETE removes chosen rows (can have WHERE, fires triggers); TRUNCATE removes all rows quickly, keeping the table; DROP removes the table itself',
      'DROP removes rows, TRUNCATE removes the table, DELETE removes indexes',
      'TRUNCATE can take a WHERE clause; DELETE cannot'],
    answer: 1,
    why: 'DELETE is row-by-row DML with an optional WHERE. TRUNCATE (not in SQLite, where DELETE without WHERE is optimised instead) empties the table fast and usually resets identity counters. DROP removes the table definition and data entirely.' },

  // ───────────────────────── Joins ─────────────────────────
  { id: 'iv-008', category: 'Joins', type: 'mcq', difficulty: 1,
    q: 'patients LEFT JOIN invoices ON invoices.patient_id = patients.patient_id returns...',
    options: ['Only patients who have invoices', 'Every patient; invoice columns are NULL for patients with no invoice', 'Every invoice; patient columns are NULL when unmatched', 'The Cartesian product of both tables'], answer: 1,
    why: 'A LEFT JOIN keeps every row of the left table. When no right-side row matches, the right-side columns are filled with NULL. The 5 patients who were never invoiced appear once each with NULL invoice columns.' },

  { id: 'iv-009', category: 'Joins', type: 'predict', difficulty: 2,
    q: 'There are 25 patients and 48 invoices; 5 patients have no invoices. How many rows does this return?',
    sql: `SELECT p.patient_id, i.invoice_id
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id;`,
    options: ['25 rows', '48 rows', '53 rows', '1200 rows'], answer: 2,
    why: 'Every invoice matches exactly one patient (48 rows), and the 5 patients without invoices are kept once each with a NULL invoice_id: 48 + 5 = 53.' },

  { id: 'iv-010', category: 'Joins', type: 'write', difficulty: 2,
    q: 'Write an anti-join: list patients who have never been invoiced (patient_id, first_name, last_name), ordered by patient_id.',
    solution: `SELECT p.patient_id, p.first_name, p.last_name
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
WHERE i.invoice_id IS NULL
ORDER BY p.patient_id;`,
    ordered: true,
    hints: ['Start from patients and look for missing invoices.', 'LEFT JOIN keeps patients with no match.', 'Keep only rows where the invoice side is NULL: WHERE i.invoice_id IS NULL.'],
    why: 'LEFT JOIN ... WHERE right.key IS NULL keeps only left rows with no match. NOT EXISTS is the equivalent and is also NULL-safe; NOT IN is risky when the subquery can contain NULLs.' },

  { id: 'iv-011', category: 'Joins', type: 'debug', difficulty: 3,
    q: 'This query should list EVERY payor with its number of Paid invoices, showing 0 for payors with none. Payors are missing. Fix it.',
    sql: `SELECT p.payor_name, COUNT(i.invoice_id) AS paid_invoices
FROM payors p
LEFT JOIN invoices i ON i.payor_id = p.payor_id
WHERE i.status = 'Paid'
GROUP BY p.payor_id, p.payor_name
ORDER BY p.payor_id;`,
    solution: `SELECT p.payor_name, COUNT(i.invoice_id) AS paid_invoices
FROM payors p
LEFT JOIN invoices i ON i.payor_id = p.payor_id AND i.status = 'Paid'
GROUP BY p.payor_id, p.payor_name
ORDER BY p.payor_id;`,
    ordered: true,
    hints: ['Which payors disappear? Do they have any Paid invoices?', 'For unmatched payors, i.status is NULL.', 'A WHERE filter on the right table turns a LEFT JOIN into an INNER JOIN.', 'Move the status condition into the ON clause.'],
    why: 'After the LEFT JOIN, payors with no Paid invoice have i.status = NULL (or a different status), and the WHERE clause removes them. Putting the filter in ON restricts which invoices match while still keeping every payor.' },

  { id: 'iv-012', category: 'Joins', type: 'write', difficulty: 3,
    q: 'Self join: list every practitioner\'s full name and their supervisor\'s full name (NULL for the top boss), ordered by practitioner_id. Format names as "First Last".',
    solution: `SELECT p.first_name || ' ' || p.last_name AS practitioner,
       s.first_name || ' ' || s.last_name AS supervisor
FROM practitioners p
LEFT JOIN practitioners s ON s.practitioner_id = p.supervisor_id
ORDER BY p.practitioner_id;`,
    ordered: true,
    hints: ['Both people live in the practitioners table.', 'Join the table to itself with two aliases.', 'Match s.practitioner_id = p.supervisor_id.', 'Use LEFT JOIN so the top boss (supervisor_id NULL) is kept.'],
    why: 'A self join treats one table as two roles. LEFT JOIN keeps Elena Ramirez, whose supervisor_id is NULL; an inner join would drop her.' },

  { id: 'iv-013', category: 'Joins', type: 'predict', difficulty: 3,
    q: 'Invoice 4 has total_amount 380 and 4 charge lines. What does this return?',
    sql: `SELECT SUM(i.total_amount)
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id
WHERE i.invoice_id = 4;`,
    options: ['380', '760', '1140', '1520'], answer: 3,
    why: 'Joining one invoice to its 4 charges repeats the invoice row 4 times, so its total is summed 4 times: 4 x 380 = 1520. This "fan-out" is a classic join bug when summing parent-level columns.' },

  { id: 'iv-014', category: 'Joins', type: 'scenario', difficulty: 4,
    q: 'An analyst joins invoices to charges AND payments in one query and reports SUM(charges.amount) and SUM(payments.amount) per invoice. Numbers for some invoices are two or three times too high. What is the best fix?',
    options: [
      'Add DISTINCT inside both SUMs',
      'Aggregate charges and payments separately per invoice (subqueries or CTEs) and then join the aggregated results to invoices',
      'Switch to a RIGHT JOIN',
      'Add GROUP BY on every selected column'],
    answer: 1,
    why: 'Two independent one-to-many joins multiply: 3 charges x 2 payments = 6 rows per invoice. Pre-aggregate each child table to one row per invoice first, then join. SUM(DISTINCT) is wrong because two legitimate charges can have the same amount.' },

  // ───────────────────────── Subqueries ─────────────────────────
  { id: 'iv-015', category: 'Subqueries', type: 'mcq', difficulty: 2,
    q: 'What makes a subquery "correlated"?',
    options: ['It returns more than one column', 'It references a column from the outer query, so it is logically evaluated once per outer row', 'It appears in the FROM clause', 'It uses an aggregate function'], answer: 1,
    why: 'A correlated subquery depends on the current outer row (for example, the average of the current invoice\'s location). A non-correlated subquery can be evaluated once and reused.' },

  { id: 'iv-016', category: 'Subqueries', type: 'predict', difficulty: 2,
    q: 'The average invoice total is about 241.04. What does this query return?',
    sql: `SELECT COUNT(*)
FROM invoices
WHERE total_amount > (SELECT AVG(total_amount) FROM invoices);`,
    options: ['0', '16', '24', '48'], answer: 1,
    why: 'The scalar subquery is computed once (241.04...), then each invoice is compared with it. 16 invoices have a total above the average.' },

  { id: 'iv-017', category: 'Subqueries', type: 'write', difficulty: 2,
    q: 'Classic: return the second highest distinct invoice total_amount (a single value).',
    solution: `SELECT MAX(total_amount)
FROM invoices
WHERE total_amount < (SELECT MAX(total_amount) FROM invoices);`,
    ordered: false,
    hints: ['First find the highest total.', 'Then look only at totals below it.', 'MAX() of the remaining totals is the second highest.'],
    why: 'Filtering out the maximum and taking MAX again handles ties correctly. Alternatives: DENSE_RANK() = 2, or SELECT DISTINCT ... ORDER BY DESC LIMIT 1 OFFSET 1.' },

  { id: 'iv-018', category: 'Subqueries', type: 'debug', difficulty: 3,
    q: 'This query should list payors that have never been billed on any invoice. It returns no rows, but there are such payors. Fix it.',
    sql: `SELECT payor_id, payor_name
FROM payors
WHERE payor_id NOT IN (SELECT payor_id FROM invoices)
ORDER BY payor_id;`,
    solution: `SELECT p.payor_id, p.payor_name
FROM payors p
WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.payor_id = p.payor_id)
ORDER BY p.payor_id;`,
    ordered: true,
    hints: ['Does invoices.payor_id contain NULLs?', 'x NOT IN (1, 2, NULL) is never TRUE.', 'Use NOT EXISTS, or filter NULLs out of the subquery.'],
    why: 'invoices.payor_id has NULLs. "x NOT IN (..., NULL)" means x <> ... AND x <> NULL, and x <> NULL is UNKNOWN, so no row passes. NOT EXISTS ignores NULLs and returns payors 5 and 6.' },

  { id: 'iv-019', category: 'Subqueries', type: 'write', difficulty: 3,
    q: 'Correlated subquery: list invoices whose total_amount is greater than the average total of invoices at the same location. Return invoice_id, location_id, total_amount ordered by invoice_id.',
    solution: `SELECT i.invoice_id, i.location_id, i.total_amount
FROM invoices i
WHERE i.total_amount > (SELECT AVG(i2.total_amount)
                        FROM invoices i2
                        WHERE i2.location_id = i.location_id)
ORDER BY i.invoice_id;`,
    ordered: true,
    hints: ['Compare each invoice with an average.', 'The average depends on the current row\'s location.', 'Use a subquery in WHERE that refers to the outer invoice\'s location_id.', 'WHERE i.total_amount > (SELECT AVG(...) FROM invoices i2 WHERE i2.location_id = i.location_id)'],
    why: 'The inner query is re-evaluated for each outer invoice using its location_id. A window function (AVG() OVER (PARTITION BY location_id)) is an equivalent, often faster, alternative.' },

  { id: 'iv-020', category: 'Subqueries', type: 'mcq', difficulty: 3,
    q: 'Why do many teams prefer NOT EXISTS over NOT IN for anti-joins?',
    options: ['NOT EXISTS is ANSI SQL and NOT IN is not', 'NOT IN returns no rows if the subquery yields any NULL, while NOT EXISTS is unaffected by NULLs', 'NOT EXISTS always returns more columns', 'NOT IN cannot use indexes at all'], answer: 1,
    why: 'The NULL trap: a single NULL in the NOT IN list makes every comparison UNKNOWN. NOT EXISTS only asks "is there a matching row?", so NULLs do not matter. Optimisers often turn both into the same anti-join when columns are NOT NULL.' },

  { id: 'iv-021', category: 'Subqueries', type: 'predict', difficulty: 2,
    q: 'What does this query return?',
    sql: `SELECT COUNT(*)
FROM payors
WHERE payor_id IN (SELECT payor_id FROM invoices);`,
    options: ['5', '6', '7', '46'], answer: 0,
    why: 'IN checks membership, so duplicates in the subquery do not multiply rows. Payors 1, 2, 3, 4 and 7 appear on invoices. The NULL payor_ids in invoices do not hurt IN (they only break NOT IN).' },

  // ───────────────────────── CTEs ─────────────────────────
  { id: 'iv-022', category: 'CTEs', type: 'mcq', difficulty: 1,
    q: 'What is the scope of a CTE defined with WITH?',
    options: ['It is stored permanently like a view', 'It exists only for the single statement that defines it', 'It lasts until the session ends, like a temp table', 'It lasts until the transaction commits'], answer: 1,
    why: 'A CTE is a named subquery for one statement. For reuse across statements use a view (permanent) or a temporary table (session).' },

  { id: 'iv-023', category: 'CTEs', type: 'write', difficulty: 2,
    q: 'Using a CTE, compute each patient\'s total billed amount and return only patients whose total is above 1000: patient_id, total_billed, highest first.',
    solution: `WITH patient_totals AS (
  SELECT patient_id, SUM(total_amount) AS total_billed
  FROM invoices
  GROUP BY patient_id
)
SELECT patient_id, total_billed
FROM patient_totals
WHERE total_billed > 1000
ORDER BY total_billed DESC, patient_id;`,
    ordered: true,
    hints: ['Totals come from invoices grouped by patient.', 'Put that aggregation in a WITH block.', 'Filter the CTE in the outer query with WHERE total_billed > 1000.'],
    why: 'The CTE names the intermediate aggregate so the outer query can filter it like a table. HAVING SUM(total_amount) > 1000 would also work in a single query.' },

  { id: 'iv-024', category: 'CTEs', type: 'write', difficulty: 3,
    q: 'Recursive CTE: starting from the top boss (supervisor_id IS NULL, level 1), return every practitioner with their level in the hierarchy: practitioner_id, first_name, level, ordered by level then practitioner_id.',
    solution: `WITH RECURSIVE tree AS (
  SELECT practitioner_id, first_name, 1 AS level
  FROM practitioners
  WHERE supervisor_id IS NULL
  UNION ALL
  SELECT p.practitioner_id, p.first_name, t.level + 1
  FROM practitioners p
  JOIN tree t ON p.supervisor_id = t.practitioner_id
)
SELECT practitioner_id, first_name, level
FROM tree
ORDER BY level, practitioner_id;`,
    ordered: true,
    hints: ['Anchor: the practitioner with no supervisor.', 'Recursive part: people whose supervisor is already in the result.', 'Join practitioners p to the CTE on p.supervisor_id = t.practitioner_id.', 'Carry level + 1 in the recursive SELECT.'],
    why: 'The anchor seeds level 1, and each recursive step adds the direct reports of the previous level until no new rows appear.' },

  { id: 'iv-025', category: 'CTEs', type: 'predict', difficulty: 3,
    q: 'What does this query return?',
    sql: `WITH RECURSIVE n(x) AS (
  SELECT 1
  UNION ALL
  SELECT x + 1 FROM n WHERE x < 5
)
SELECT SUM(x) FROM n;`,
    options: ['5', '10', '15', '21'], answer: 2,
    why: 'The CTE produces 1, 2, 3, 4, 5 (it stops when x < 5 is false for x = 5). 1+2+3+4+5 = 15.' },

  { id: 'iv-026', category: 'CTEs', type: 'debug', difficulty: 3,
    q: 'This recursive query should return the chain of command for practitioner 6 (practitioner 6, their supervisor, that person\'s supervisor, ... up to the top). It only returns one row. Fix it.',
    sql: `WITH RECURSIVE chain AS (
  SELECT practitioner_id, supervisor_id FROM practitioners WHERE practitioner_id = 6
  UNION ALL
  SELECT p.practitioner_id, p.supervisor_id
  FROM practitioners p
  JOIN chain c ON p.supervisor_id = c.practitioner_id
)
SELECT practitioner_id FROM chain;`,
    solution: `WITH RECURSIVE chain AS (
  SELECT practitioner_id, supervisor_id FROM practitioners WHERE practitioner_id = 6
  UNION ALL
  SELECT p.practitioner_id, p.supervisor_id
  FROM practitioners p
  JOIN chain c ON p.practitioner_id = c.supervisor_id
)
SELECT practitioner_id FROM chain;`,
    ordered: false,
    hints: ['Which direction is the recursion walking: down to reports or up to bosses?', 'Practitioner 6 has no direct reports.', 'To walk up, find the practitioner whose id equals the current row\'s supervisor_id.'],
    why: 'The join condition walked downward (find people who report to the current row). Practitioner 6 has no reports, so recursion stopped. Joining on p.practitioner_id = c.supervisor_id walks upward: 6 -> 5 -> 2 -> 1.' },

  { id: 'iv-027', category: 'CTEs', type: 'scenario', difficulty: 2,
    q: 'An interviewer asks: "Is a CTE faster than the same logic written as a subquery?" What is the best answer?',
    options: [
      'Yes, CTEs are always cached',
      'Usually no difference: most engines inline CTEs like subqueries; some may materialize them. CTEs mainly improve readability and allow recursion',
      'No, CTEs are always slower because they create temp tables',
      'CTEs are only allowed in stored procedures'],
    answer: 1,
    why: 'Modern optimisers (PostgreSQL 12+, SQL Server, SQLite) usually inline CTEs. Some engines materialize a CTE that is referenced several times, and hints like MATERIALIZED / NOT MATERIALIZED exist. Measure with the query plan rather than assuming.' },

  { id: 'iv-028', category: 'CTEs', type: 'write', difficulty: 4,
    q: 'Gaps problem: using a recursive CTE to generate the months 2025-01 through 2026-08, return the months (as \'YYYY-MM\') in which no invoice was issued, in order.',
    solution: `WITH RECURSIVE months(m) AS (
  SELECT '2025-01-01'
  UNION ALL
  SELECT date(m, '+1 month') FROM months WHERE m < '2026-08-01'
)
SELECT strftime('%Y-%m', m) AS month
FROM months
WHERE strftime('%Y-%m', m) NOT IN (SELECT strftime('%Y-%m', invoice_date) FROM invoices)
ORDER BY month;`,
    ordered: true,
    hints: ['You need a list of all months, even the empty ones.', 'Generate it with WITH RECURSIVE and date(m, \'+1 month\').', 'Compare strftime(\'%Y-%m\', ...) of the calendar with the invoice months.', 'Keep calendar months NOT IN (or NOT EXISTS) the set of invoice months.'],
    why: 'Missing data cannot be found by grouping existing rows. A generated calendar (a "date spine") supplies every month, and an anti-join finds the empty ones: 2025-01, 2026-02 and 2026-04.' },

  // ───────────────────────── Window Functions ─────────────────────────
  { id: 'iv-029', category: 'Window Functions', type: 'mcq', difficulty: 2,
    q: 'Three invoices have totals 500, 500, 400 (sorted DESC). What do ROW_NUMBER, RANK and DENSE_RANK give the 400 invoice?',
    options: ['3, 3, 3', '3, 3, 2', '3, 2, 2', '2, 3, 2'], answer: 1,
    why: 'ROW_NUMBER always numbers 1,2,3. RANK gives ties the same rank and skips (1,1,3). DENSE_RANK gives ties the same rank without gaps (1,1,2).' },

  { id: 'iv-030', category: 'Window Functions', type: 'predict', difficulty: 2,
    q: 'What does this query return?',
    sql: `SELECT COUNT(*)
FROM (SELECT invoice_id,
             DENSE_RANK() OVER (ORDER BY total_amount DESC) AS r
      FROM invoices)
WHERE r <= 3;`,
    options: ['3', '4', '5', '6'], answer: 0,
    why: 'The three highest totals (685, 630, 615) each belong to exactly one invoice, so DENSE_RANK 1-3 covers 3 rows. With ties, DENSE_RANK <= 3 could return more than 3 rows.' },

  { id: 'iv-031', category: 'Window Functions', type: 'write', difficulty: 2,
    q: 'Running total: list payments with payment_id, payment_date, amount and a running total of amount in date order (break ties by payment_id).',
    solution: `SELECT payment_id, payment_date, amount,
       SUM(amount) OVER (ORDER BY payment_date, payment_id) AS running_total
FROM payments
ORDER BY payment_date, payment_id;`,
    ordered: true,
    hints: ['Use the payments table.', 'A running total is SUM() used as a window function.', 'OVER (ORDER BY payment_date, payment_id)', 'Order the final result the same way.'],
    why: 'SUM() OVER (ORDER BY ...) adds up everything from the first row to the current row. Including payment_id in the ORDER BY makes the order unique, so rows with the same date get separate running totals.' },

  { id: 'iv-032', category: 'Window Functions', type: 'write', difficulty: 3,
    q: 'Top-N per group: for each location, return its 2 largest invoices (location_id, invoice_id, total_amount). Break ties by the lower invoice_id. Order by location_id, then total_amount DESC.',
    solution: `WITH ranked AS (
  SELECT location_id, invoice_id, total_amount,
         ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY total_amount DESC, invoice_id) AS rn
  FROM invoices
)
SELECT location_id, invoice_id, total_amount
FROM ranked
WHERE rn <= 2
ORDER BY location_id, total_amount DESC, invoice_id;`,
    ordered: true,
    hints: ['You need a rank inside each location.', 'ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY total_amount DESC, invoice_id)', 'Window functions cannot be filtered in WHERE directly.', 'Wrap in a CTE and filter rn <= 2.'],
    why: 'PARTITION BY restarts numbering per location. Because WHERE runs before window functions, you filter on the rank in an outer query.' },

  { id: 'iv-033', category: 'Window Functions', type: 'debug', difficulty: 3,
    q: 'This query should show, next to every invoice, the LARGEST invoice total of the same patient. Instead it mostly repeats the current row\'s total. Fix it.',
    sql: `SELECT invoice_id, patient_id, total_amount,
       LAST_VALUE(total_amount) OVER (PARTITION BY patient_id ORDER BY total_amount) AS patient_max
FROM invoices
ORDER BY invoice_id;`,
    solution: `SELECT invoice_id, patient_id, total_amount,
       LAST_VALUE(total_amount) OVER (PARTITION BY patient_id ORDER BY total_amount
         ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS patient_max
FROM invoices
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['What is the default window frame when ORDER BY is present?', 'The default frame ends at the CURRENT ROW (and its peers).', 'Extend the frame to UNBOUNDED FOLLOWING, or simply use MAX() OVER (PARTITION BY patient_id).'],
    why: 'With ORDER BY, the default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, so the "last value" is the current row. Widening the frame (or using MAX over the partition) fixes it.' },

  { id: 'iv-034', category: 'Window Functions', type: 'debug', difficulty: 4,
    q: 'This query should find invoices issued within 30 days of the SAME patient\'s previous invoice (invoice_id, patient_id, invoice_date, prev_date). It returns wrong pairs. Fix it.',
    sql: `WITH x AS (
  SELECT invoice_id, patient_id, invoice_date,
         LAG(invoice_date) OVER (ORDER BY invoice_date) AS prev_date
  FROM invoices
)
SELECT invoice_id, patient_id, invoice_date, prev_date
FROM x
WHERE julianday(invoice_date) - julianday(prev_date) <= 30
ORDER BY invoice_id;`,
    solution: `WITH x AS (
  SELECT invoice_id, patient_id, invoice_date,
         LAG(invoice_date) OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id) AS prev_date
  FROM invoices
)
SELECT invoice_id, patient_id, invoice_date, prev_date
FROM x
WHERE julianday(invoice_date) - julianday(prev_date) <= 30
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['Whose "previous invoice" does LAG look at right now?', 'Without PARTITION BY, LAG looks at the previous invoice of any patient.', 'Add PARTITION BY patient_id to the window.'],
    why: 'LAG without PARTITION BY compares each invoice with the previous invoice in the whole table. Partitioning by patient_id restricts the comparison to the same patient.' },

  { id: 'iv-035', category: 'Window Functions', type: 'predict', difficulty: 3,
    q: 'Invoices 1, 2, 3 have totals 165, 95, 60. What values does the lagged column return, in order?',
    sql: `SELECT LAG(total_amount) OVER (ORDER BY invoice_id) AS prev_total
FROM invoices
WHERE invoice_id <= 3
ORDER BY invoice_id;`,
    options: ['165, 95, 60', 'NULL, 165, 95', '95, 60, NULL', '0, 165, 95'], answer: 1,
    why: 'LAG returns the value from the previous row in the window order. The first row has no previous row, so it gets NULL (unless a default is given: LAG(total_amount, 1, 0)).' },

  // ───────────────────────── Aggregations ─────────────────────────
  { id: 'iv-036', category: 'Aggregations', type: 'mcq', difficulty: 1,
    q: 'What is the difference between WHERE and HAVING?',
    options: ['None; they are interchangeable', 'WHERE filters rows before grouping; HAVING filters groups after aggregation', 'HAVING filters rows before grouping; WHERE filters groups', 'HAVING can only be used with ORDER BY'], answer: 1,
    why: 'WHERE works on individual rows and cannot use aggregates. HAVING works on groups, so HAVING COUNT(*) > 5 is valid while WHERE COUNT(*) > 5 is an error.' },

  { id: 'iv-037', category: 'Aggregations', type: 'predict', difficulty: 1,
    q: 'Two invoices have a NULL payor_id. What does this return?',
    sql: `SELECT COUNT(*), COUNT(payor_id) FROM invoices;`,
    options: ['48 | 48', '48 | 46', '46 | 46', '46 | 48'], answer: 1,
    why: 'COUNT(*) counts rows; COUNT(column) counts non-NULL values in that column. 48 rows, 46 non-NULL payor_ids.' },

  { id: 'iv-038', category: 'Aggregations', type: 'write', difficulty: 2,
    q: 'Pivot: for each location_id that has invoices, show the number of Paid, Overdue and Open invoices as three columns (location_id, paid, overdue, open), ordered by location_id.',
    solution: `SELECT location_id,
       SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) AS paid,
       SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) AS overdue,
       SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS open
FROM invoices
GROUP BY location_id
ORDER BY location_id;`,
    ordered: true,
    hints: ['One row per location: GROUP BY location_id.', 'Each output column counts a different status.', 'Use conditional aggregation: SUM(CASE WHEN status = ... THEN 1 ELSE 0 END).', 'Or COUNT(*) FILTER (WHERE status = \'Paid\').'],
    why: 'Conditional aggregation is the portable way to pivot rows into columns. PIVOT syntax exists in SQL Server/Oracle, but CASE inside SUM works everywhere.' },

  { id: 'iv-039', category: 'Aggregations', type: 'write', difficulty: 1,
    q: 'Find duplicate patient records: people with the same first_name, last_name and date_of_birth appearing more than once. Return first_name, last_name, date_of_birth and the count.',
    solution: `SELECT first_name, last_name, date_of_birth, COUNT(*) AS copies
FROM patients
GROUP BY first_name, last_name, date_of_birth
HAVING COUNT(*) > 1;`,
    ordered: false,
    hints: ['Group by the columns that define "the same person".', 'Count rows in each group.', 'Keep groups with HAVING COUNT(*) > 1.'],
    why: 'Grouping on the identifying columns collapses duplicates into one group; HAVING keeps only the groups with more than one row (Maria Garcia, patients 1 and 25).' },

  { id: 'iv-040', category: 'Aggregations', type: 'debug', difficulty: 2,
    q: 'This query should return locations with more than 3 PAID invoices and the count of paid invoices. The counts are too high. Fix it.',
    sql: `SELECT location_id, COUNT(*) AS paid_invoices
FROM invoices
GROUP BY location_id
HAVING COUNT(*) > 3
ORDER BY location_id;`,
    solution: `SELECT location_id, COUNT(*) AS paid_invoices
FROM invoices
WHERE status = 'Paid'
GROUP BY location_id
HAVING COUNT(*) > 3
ORDER BY location_id;`,
    ordered: true,
    hints: ['Which invoices are being counted?', 'The row filter (only Paid) belongs before grouping.', 'Add WHERE status = \'Paid\'.'],
    why: 'Row-level conditions go in WHERE (before grouping); conditions on the aggregate go in HAVING. Without the WHERE, every status is counted.' },

  { id: 'iv-041', category: 'Aggregations', type: 'predict', difficulty: 3,
    q: 'What does this query return?',
    sql: `SELECT COUNT(DISTINCT payor_id),
       COUNT(DISTINCT COALESCE(payor_id, 0))
FROM invoices;`,
    options: ['5 | 5', '5 | 6', '6 | 6', '7 | 7'], answer: 1,
    why: 'COUNT(DISTINCT col) ignores NULLs, giving 5 payors. COALESCE turns NULL into 0, which is then counted as a sixth distinct value.' },

  { id: 'iv-042', category: 'Aggregations', type: 'mcq', difficulty: 3,
    q: 'SELECT location_id, patient_id, COUNT(*) FROM invoices GROUP BY location_id; What happens?',
    options: [
      'Every engine returns an error',
      'PostgreSQL/SQL Server raise an error because patient_id is neither grouped nor aggregated; SQLite (and MySQL without ONLY_FULL_GROUP_BY) return an arbitrary patient_id per group',
      'It returns one row per patient',
      'It silently groups by patient_id too'],
    answer: 1,
    why: 'Standard SQL requires every selected column to be in GROUP BY or inside an aggregate. SQLite allows "bare columns" and picks a value from some row in the group, which is a common source of silent bugs.' },

  { id: 'iv-043', category: 'Aggregations', type: 'scenario', difficulty: 4,
    q: 'A dashboard shows "average invoice amount across locations" computed as AVG of each location\'s average. Location A has 20 invoices averaging 100, location B has 2 invoices averaging 1000. What is wrong?',
    options: [
      'Nothing; average of averages equals the overall average',
      'It gives each location equal weight (550) instead of weighting by invoice count (about 182); compute SUM(total)/COUNT(*) over all invoices instead',
      'AVG ignores NULLs so the result is too low',
      'It should use MEDIAN instead'],
    answer: 1,
    why: 'Average of averages is only equal to the overall average when groups are the same size. The weighted average is (20*100 + 2*1000) / 22 ≈ 181.8.' },

  // ───────────────────────── Performance ─────────────────────────
  { id: 'iv-044', category: 'Performance', type: 'mcq', difficulty: 2,
    q: 'invoices has an index on invoice_date. Which filter can use the index efficiently (is "sargable")?',
    options: [
      "WHERE strftime('%Y', invoice_date) = '2025'",
      "WHERE substr(invoice_date, 1, 4) = '2025'",
      "WHERE invoice_date >= '2025-01-01' AND invoice_date < '2026-01-01'",
      "WHERE invoice_date || '' = '2025-01-01'"],
    answer: 2,
    why: 'Wrapping the indexed column in a function hides it from the index, forcing a scan. A range on the bare column lets the B-tree seek to the start and read only matching entries.' },

  { id: 'iv-045', category: 'Performance', type: 'scenario', difficulty: 2,
    q: 'You create INDEX idx ON invoices(patient_id, invoice_date). Which query can NOT use it for seeking?',
    options: [
      'WHERE patient_id = 3',
      "WHERE patient_id = 3 AND invoice_date >= '2026-01-01'",
      "WHERE invoice_date >= '2026-01-01'",
      'WHERE patient_id IN (3, 7) ORDER BY patient_id, invoice_date'],
    answer: 2,
    why: 'A composite index is sorted by its leftmost column first (leftmost-prefix rule). Filtering only on the second column cannot seek; it would need its own index (or a skip-scan, which few engines do well).' },

  { id: 'iv-046', category: 'Performance', type: 'mcq', difficulty: 3,
    q: 'What is a covering index?',
    options: [
      'An index on every column of a table',
      'An index that contains all columns a query needs, so the engine never has to look up the base table row',
      'A clustered primary key',
      'An index that covers NULL values'],
    answer: 1,
    why: 'If a query only touches columns stored in the index (for example SELECT invoice_date FROM invoices WHERE patient_id = 3 with an index on (patient_id, invoice_date)), the engine answers from the index alone. SQLite shows this as "USING COVERING INDEX" in EXPLAIN QUERY PLAN.' },

  { id: 'iv-047', category: 'Performance', type: 'scenario', difficulty: 3,
    q: 'The invoice list page uses ORDER BY invoice_id LIMIT 50 OFFSET 200000 and gets slower on every page. What is the standard fix?',
    options: [
      'Increase the page size',
      'Keyset (seek) pagination: WHERE invoice_id > :last_seen_id ORDER BY invoice_id LIMIT 50',
      'Add DISTINCT',
      'Use SELECT * so the engine can cache rows'],
    answer: 1,
    why: 'OFFSET still reads and throws away every skipped row. Keyset pagination remembers the last key and seeks directly to it through the index, so each page costs the same.' },

  { id: 'iv-048', category: 'Performance', type: 'debug', difficulty: 2,
    q: 'To make the filter index-friendly, a teammate replaced strftime(\'%Y\', invoice_date) = \'2025\' with a date range. The rewritten query is missing an invoice. Fix it.',
    sql: `SELECT invoice_id, invoice_date
FROM invoices
WHERE invoice_date >= '2025-01-01' AND invoice_date < '2025-12-31'
ORDER BY invoice_id;`,
    solution: `SELECT invoice_id, invoice_date
FROM invoices
WHERE invoice_date >= '2025-01-01' AND invoice_date < '2026-01-01'
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['Which date does < \'2025-12-31\' leave out?', 'The upper bound is exclusive, so the last day of the year is lost.', 'Use a half-open range: >= first day of the year AND < first day of the NEXT year.'],
    why: '< \'2025-12-31\' drops invoices dated December 31 (invoice 16). A half-open range (>= start AND < start of the next period) never loses the last day, works for any month or year length, and still works if the column later holds timestamps.' },

  { id: 'iv-049', category: 'Performance', type: 'mcq', difficulty: 3,
    q: 'Which column is usually the WORST candidate for a stand-alone B-tree index in the invoices table?',
    options: ['invoice_id', 'patient_id', 'status (5 distinct values, mostly Paid)', 'invoice_date'], answer: 2,
    why: 'Low-cardinality columns have poor selectivity: a lookup on status = \'Paid\' still returns a large share of the table, so a scan is often cheaper. Partial indexes (e.g. WHERE status = \'Open\') can help for rare values.' },

  { id: 'iv-050', category: 'Performance', type: 'write', difficulty: 3,
    q: 'A report uses two correlated subqueries per patient (one for invoice count, one for total billed). Rewrite it as a single pass: for each patient that has invoices, return patient_id, invoice_count and total_billed, ordered by patient_id.',
    solution: `SELECT patient_id, COUNT(*) AS invoice_count, SUM(total_amount) AS total_billed
FROM invoices
GROUP BY patient_id
ORDER BY patient_id;`,
    ordered: true,
    hints: ['Both numbers come from the invoices table.', 'One GROUP BY can compute several aggregates at once.', 'GROUP BY patient_id with COUNT(*) and SUM(total_amount).'],
    why: 'One GROUP BY reads invoices once. Correlated subqueries in the SELECT list may re-scan invoices for each patient and each subquery.' },

  { id: 'iv-051', category: 'Performance', type: 'scenario', difficulty: 4,
    q: 'The transactions table receives thousands of inserts per second and already has 9 indexes. Inserts are slowing down. What do you recommend?',
    options: [
      'Add more indexes so reads get faster',
      'Review index usage and drop unused or redundant indexes; every index must be updated on every insert',
      'Switch every column to TEXT',
      'Remove the primary key'],
    answer: 1,
    why: 'Indexes speed up reads but cost writes: each insert must update every index. Keep indexes that serve real queries, merge overlapping ones (an index on (a) is redundant with (a, b)), and consider batching inserts inside transactions.' },

  // ───────────────────────── Database Design ─────────────────────────
  { id: 'iv-052', category: 'Database Design', type: 'mcq', difficulty: 1,
    q: 'What does a primary key guarantee?',
    options: ['Values are sorted', 'Each row is uniquely identified, and the key is not NULL', 'The column is indexed only in memory', 'The column can be referenced only once'], answer: 1,
    why: 'A primary key is a unique, non-null identifier for each row. Engines usually build an index for it, and foreign keys in other tables reference it.' },

  { id: 'iv-053', category: 'Database Design', type: 'mcq', difficulty: 2,
    q: 'patients.allergies stores values like \'Penicillin, Latex\'. Which normalization problem is this?',
    options: ['It violates first normal form (non-atomic, repeating values in one column)', 'It violates referential integrity', 'It is a transitive dependency (3NF)', 'Nothing; text columns are always normalized'], answer: 0,
    why: 'A comma-separated list is not atomic: you cannot index, count or join individual allergies reliably. The normalized design is a patient_allergies(patient_id, allergen) table.' },

  { id: 'iv-054', category: 'Database Design', type: 'scenario', difficulty: 3,
    q: 'Patients can change insurance over time, and billing must know which payor covered a patient on any given service date. How should you model it?',
    options: [
      'Keep overwriting patients.primary_payor_id',
      'Add payor_2, payor_3 columns to patients',
      'Create patient_coverage(patient_id, payor_id, effective_from, effective_to, priority) and look up coverage by date range',
      'Store the payor name as text on each charge'],
    answer: 2,
    why: 'Coverage is a many-to-many relationship that changes over time, so it needs its own table with validity dates. Overwriting loses history, and numbered columns break first normal form.' },

  { id: 'iv-055', category: 'Database Design', type: 'predict', difficulty: 2,
    q: 'This checks for orphaned invoices (invoices that point at a missing patient). What does it return on the sample DB, which enforces foreign keys?',
    sql: `SELECT COUNT(*)
FROM invoices i
LEFT JOIN patients p ON p.patient_id = i.patient_id
WHERE p.patient_id IS NULL;`,
    options: ['0', '3', '25', '48'], answer: 0,
    why: 'Every invoice.patient_id references an existing patient, which the foreign key enforces. The 5 patients with no invoices are the opposite case (parents with no children), and this query does not count them.' },

  { id: 'iv-056', category: 'Database Design', type: 'mcq', difficulty: 3,
    q: 'invoices.total_amount duplicates information that could be derived from SUM(charges.amount). What is the main risk of this denormalization?',
    options: ['Queries become slower', 'The stored total can drift out of sync with the charges unless every write path maintains it (or a trigger does)', 'It violates the primary key', 'SQLite cannot store REAL values'], answer: 1,
    why: 'Derived values speed up reads but create update anomalies. Keep them consistent with transactions, triggers or scheduled reconciliation queries.' },

  { id: 'iv-057', category: 'Database Design', type: 'write', difficulty: 3,
    q: 'Data-integrity check: find invoices with status \'Paid\' whose recorded payments do NOT add up to total_amount. Return invoice_id, total_amount and total_paid, ordered by invoice_id.',
    solution: `SELECT i.invoice_id, i.total_amount, COALESCE(SUM(p.amount), 0) AS total_paid
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.invoice_id
WHERE i.status = 'Paid'
GROUP BY i.invoice_id, i.total_amount
HAVING COALESCE(SUM(p.amount), 0) <> i.total_amount
ORDER BY i.invoice_id;`,
    ordered: true,
    hints: ['Join invoices to payments.', 'Aggregate payments per invoice.', 'Only Paid invoices: WHERE status = \'Paid\'.', 'HAVING COALESCE(SUM(p.amount), 0) <> i.total_amount'],
    why: 'Invoice 1 shows 330 paid against 165 billed: a duplicate patient payment (later refunded in the ledger). Reconciliation queries like this catch drift between stored status and actual money.' },

  { id: 'iv-058', category: 'Database Design', type: 'scenario', difficulty: 4,
    q: 'A duplicate payment was recorded on invoice 1. Why does the billing system record a REFUND transaction instead of deleting the duplicate payment row?',
    options: [
      'SQLite cannot delete rows with foreign keys',
      'Financial ledgers are append-only: corrections are new entries, so the audit trail shows what happened and totals can be reconciled at any point in time',
      'Deleting would be slower',
      'REFUND rows use less storage'],
    answer: 1,
    why: 'Accounting data must be auditable. Reversing entries (REFUND, ADJUSTMENT, WRITE_OFF) keep history intact, and the balance is SUM(amount) over the ledger.' },

  // ───────────────────────── Transactions ─────────────────────────
  { id: 'iv-059', category: 'Transactions', type: 'mcq', difficulty: 1,
    q: 'What does the "A" (Atomicity) in ACID guarantee?',
    options: ['Data is stored in atoms', 'All statements in a transaction succeed together or none take effect', 'Committed data survives a crash', 'Transactions do not see each other\'s changes'], answer: 1,
    why: 'Atomicity means all-or-nothing. Durability is about surviving crashes, Isolation about concurrent transactions, and Consistency about keeping constraints valid.' },

  { id: 'iv-060', category: 'Transactions', type: 'scenario', difficulty: 2,
    q: 'Posting a payment requires: INSERT into payments, INSERT into transactions, UPDATE invoices.status. The app crashes after the first INSERT. How should this have been written?',
    options: [
      'Run the three statements in any order',
      'Wrap all three in one transaction (BEGIN ... COMMIT) so a failure rolls back everything',
      'Run them in three separate transactions',
      'Only run the UPDATE'],
    answer: 1,
    why: 'A single business action that touches several tables must be atomic. Otherwise a crash leaves a payment without its ledger entry, which is exactly what reconciliation later has to hunt for.' },

  { id: 'iv-061', category: 'Transactions', type: 'mcq', difficulty: 3,
    q: 'Transaction T1 reads invoice 5\'s status twice and gets different values because T2 committed an update in between. What anomaly is this?',
    options: ['Dirty read', 'Non-repeatable read', 'Phantom read', 'Deadlock'], answer: 1,
    why: 'A non-repeatable read happens when re-reading the same row gives a different committed value. A dirty read sees uncommitted data; a phantom read sees new or removed rows matching a range condition.' },

  { id: 'iv-062', category: 'Transactions', type: 'scenario', difficulty: 3,
    q: 'Two clerks load the same invoice balance (500), each subtracts their payment in the application, and each writes the result back. One payment is lost. Which fix is NOT appropriate?',
    options: [
      'Use an atomic update: UPDATE ... SET balance = balance - :amount',
      'Lock the row while reading (SELECT ... FOR UPDATE) inside a transaction',
      'Optimistic locking: add a version column and UPDATE ... WHERE version = :read_version',
      'Lower the isolation level to READ UNCOMMITTED'],
    answer: 3,
    why: 'This is the lost-update anomaly. Atomic updates, pessimistic row locks and optimistic version checks all prevent it. Lowering isolation makes things worse.' },

  { id: 'iv-063', category: 'Transactions', type: 'mcq', difficulty: 2,
    q: 'Inside a long import transaction, one batch fails validation. You want to undo only that batch and continue. What should you use?',
    options: ['COMMIT', 'SAVEPOINT before each batch and ROLLBACK TO that savepoint on failure', 'ROLLBACK the whole transaction', 'Turn off autocommit'], answer: 1,
    why: 'Savepoints are named checkpoints inside a transaction. ROLLBACK TO savepoint undoes work since that point but keeps the outer transaction alive.' },

  { id: 'iv-064', category: 'Transactions', type: 'scenario', difficulty: 4,
    q: 'Job A updates invoices then payments; Job B updates payments then invoices. Occasionally both hang and one is killed with a deadlock error. What is the most robust fix?',
    options: [
      'Add more indexes',
      'Make every job acquire locks in the same order (e.g. always invoices before payments), keep transactions short, and retry on deadlock',
      'Increase the lock timeout to one hour',
      'Disable foreign keys'],
    answer: 1,
    why: 'Deadlocks come from cyclic waits. A consistent lock order breaks the cycle; short transactions reduce the window; and because deadlocks can still happen, the application should retry the victim transaction.' },

  { id: 'iv-065', category: 'Transactions', type: 'predict', difficulty: 3,
    q: 'There are 13 Overdue invoices. What does the final SELECT return?',
    sql: `BEGIN;
UPDATE invoices SET status = 'Paid' WHERE status = 'Overdue';
ROLLBACK;
SELECT COUNT(*) FROM invoices WHERE status = 'Overdue';`,
    options: ['0', '13', '36', 'An error: UPDATE is not allowed'], answer: 1,
    why: 'ROLLBACK undoes every change made since BEGIN, so the 13 Overdue invoices are unchanged.' },

  // ───────────────────────── Real-World Problems ─────────────────────────
  { id: 'iv-066', category: 'Real-World Problems', type: 'write', difficulty: 2,
    q: 'Balance due: for every non-Void invoice that still has money owed, return invoice_id, total_amount, total_paid and balance (total_amount minus payments), largest balance first (ties by invoice_id).',
    solution: `SELECT i.invoice_id, i.total_amount,
       COALESCE(SUM(p.amount), 0) AS total_paid,
       i.total_amount - COALESCE(SUM(p.amount), 0) AS balance
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.invoice_id
WHERE i.status <> 'Void'
GROUP BY i.invoice_id, i.total_amount
HAVING balance > 0
ORDER BY balance DESC, i.invoice_id;`,
    ordered: true,
    hints: ['Join invoices to payments.', 'LEFT JOIN keeps invoices with no payments; COALESCE turns their NULL sum into 0.', 'GROUP BY the invoice and compute total_amount - SUM(payments).', 'Keep HAVING balance > 0 and sort by balance DESC.'],
    why: 'LEFT JOIN + COALESCE handles unpaid invoices. The balance filter uses HAVING because it depends on an aggregate.' },

  { id: 'iv-067', category: 'Real-World Problems', type: 'debug', difficulty: 3,
    q: 'This should show billed amount per month (YYYY-MM) and the change versus the previous month. The change column is nonsense. Fix it.',
    sql: `WITH m AS (
  SELECT strftime('%Y-%m', invoice_date) AS month, SUM(total_amount) AS billed
  FROM invoices
  GROUP BY month
)
SELECT month, billed, billed - LAG(billed) OVER (ORDER BY billed) AS change
FROM m
ORDER BY month;`,
    solution: `WITH m AS (
  SELECT strftime('%Y-%m', invoice_date) AS month, SUM(total_amount) AS billed
  FROM invoices
  GROUP BY month
)
SELECT month, billed, billed - LAG(billed) OVER (ORDER BY month) AS change
FROM m
ORDER BY month;`,
    ordered: true,
    hints: ['What does "previous" mean for LAG here?', 'The window order decides which row is previous, not the final ORDER BY.', 'Order the window by month.'],
    why: 'LAG follows the window\'s ORDER BY. Ordering by billed compares each month with the next-smaller month, not the previous calendar month.' },

  { id: 'iv-068', category: 'Real-World Problems', type: 'write', difficulty: 3,
    q: 'Detect duplicate payments: return invoice_id, payment_date, amount, method and how many times that exact payment was recorded, for combinations recorded more than once.',
    solution: `SELECT invoice_id, payment_date, amount, method, COUNT(*) AS times
FROM payments
GROUP BY invoice_id, payment_date, amount, method
HAVING COUNT(*) > 1;`,
    ordered: false,
    hints: ['Use the payments table.', 'A duplicate has the same invoice, date, amount and method.', 'GROUP BY those four columns and HAVING COUNT(*) > 1.'],
    why: 'Grouping by the business key (ignoring the surrogate payment_id) reveals rows entered twice: invoice 1 was paid 165 in cash twice on 2025-05-09.' },

  { id: 'iv-069', category: 'Real-World Problems', type: 'debug', difficulty: 3,
    q: 'For each invoice that has payments, this should show total charges and total payments. Several invoices show inflated numbers. Fix it.',
    sql: `SELECT i.invoice_id, SUM(c.amount) AS charged, SUM(p.amount) AS paid
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id
JOIN payments p ON p.invoice_id = i.invoice_id
GROUP BY i.invoice_id
ORDER BY i.invoice_id;`,
    solution: `WITH c AS (SELECT invoice_id, SUM(amount) AS charged FROM charges GROUP BY invoice_id),
     p AS (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id)
SELECT c.invoice_id, c.charged, p.paid
FROM c
JOIN p ON p.invoice_id = c.invoice_id
ORDER BY c.invoice_id;`,
    ordered: true,
    hints: ['How many rows does an invoice with 3 charges and 2 payments produce after the joins?', 'Two one-to-many joins multiply each other.', 'Aggregate charges and payments separately, then join the results.'],
    why: 'Joining two child tables to the same parent creates charges x payments rows per invoice, so each sum is repeated. Pre-aggregating each child to one row per invoice removes the fan-out.' },

  { id: 'iv-070', category: 'Real-World Problems', type: 'predict', difficulty: 2,
    q: 'Treat today as 2026-09-01. What does this return?',
    sql: `SELECT COUNT(*)
FROM invoices
WHERE due_date < '2026-09-01'
  AND status NOT IN ('Paid', 'Void');`,
    options: ['13', '14', '19', '24'], answer: 2,
    why: 'Past-due and not settled: the 13 Overdue invoices plus the 6 Partially Paid ones (all due before September 2026). The 5 Open invoices are not yet due.' },

  { id: 'iv-071', category: 'Real-World Problems', type: 'scenario', difficulty: 3,
    q: 'A monthly collections chart skips months with no payments, so the line jumps from March to June. How do you fix it in SQL?',
    options: [
      'ORDER BY month DESC',
      'Generate a calendar of all months (recursive CTE or a calendar table) and LEFT JOIN the monthly totals to it, using COALESCE(total, 0)',
      'Use INNER JOIN between months and payments',
      'Use GROUP BY with DISTINCT'],
    answer: 1,
    why: 'GROUP BY can only produce groups for data that exists. A date spine supplies every month, and the LEFT JOIN keeps empty months with 0.' },

  { id: 'iv-072', category: 'Real-World Problems', type: 'write', difficulty: 4,
    q: 'Payer mix: for each payor_type (use \'No payor\' when the invoice has no payor), show the total billed and its percentage of all billing rounded to 1 decimal. Order by billed DESC.',
    solution: `SELECT COALESCE(py.payor_type, 'No payor') AS payor_type,
       SUM(i.total_amount) AS billed,
       ROUND(100.0 * SUM(i.total_amount) / SUM(SUM(i.total_amount)) OVER (), 1) AS pct
FROM invoices i
LEFT JOIN payors py ON py.payor_id = i.payor_id
GROUP BY COALESCE(py.payor_type, 'No payor')
ORDER BY billed DESC;`,
    ordered: true,
    hints: ['Join invoices to payors; keep invoices with no payor.', 'Group by payor_type (COALESCE the NULLs).', 'The grand total can be computed with SUM(SUM(total_amount)) OVER () or a scalar subquery.', 'Multiply by 100.0 (not 100) to avoid integer division, then ROUND(..., 1).'],
    why: 'A window over the grouped result (SUM(SUM(x)) OVER ()) gives the grand total on each row without a second query. Using 100.0 forces real division.' },

  // ───────────────────────── Security & Admin ─────────────────────────
  { id: 'iv-073', category: 'Security & Admin', type: 'mcq', difficulty: 1,
    q: "A patient search page builds its SQL like this: \"SELECT * FROM patients WHERE last_name = '\" + input + \"'\". What happens if a user types  x' OR '1'='1  into the search box?",
    options: ['The query fails with a syntax error and nothing is returned', "The WHERE clause becomes last_name = 'x' OR '1'='1', which is always true, so every patient record is returned", 'Only patients named x are returned', 'The database escapes the quote automatically'],
    answer: 1,
    why: "String concatenation lets user input change the structure of the query. The injected OR '1'='1' makes the condition true for every row, exposing all patients' PHI. Worse payloads can read other tables or modify data." },

  { id: 'iv-074', category: 'Security & Admin', type: 'mcq', difficulty: 2,
    q: 'Why do parameterized queries (prepared statements with ? or :name placeholders) prevent SQL injection?',
    options: ['They escape every quote character in the input', 'The SQL text is parsed first, and the input is bound later purely as a data value, so it can never become SQL syntax', 'They run the query with read-only permissions', 'They reject any input containing SQL keywords'],
    answer: 1,
    why: "With placeholders the statement's structure is fixed before any user data arrives; bound values are always treated as literals. Escaping and keyword blocklists are fragile. Note that placeholders cannot stand in for identifiers (table or column names): those must be validated against an allow-list." },

  { id: 'iv-075', category: 'Security & Admin', type: 'scenario', difficulty: 2,
    q: 'A reporting dashboard connects to the billing database with the same account the application uses to write data, which also owns the schema. What is the best fix?',
    options: [
      'Keep the account but rotate its password monthly',
      'Create a dedicated reporting role with SELECT only on the tables or views it needs, and connect the dashboard with that role',
      'Give the dashboard the DBA account so it never hits permission errors',
      'Put the dashboard behind a VPN and leave permissions as they are'],
    answer: 1,
    why: 'Least privilege: each application gets only the permissions its job requires. A read-only reporting role limits the damage from a bug, a leaked credential or an injection flaw in the dashboard. Granting on views rather than base tables narrows it further.' },

  { id: 'iv-076', category: 'Security & Admin', type: 'mcq', difficulty: 2,
    q: 'In PostgreSQL, which statements give the role billing_clerk read access to invoices and then take away its ability to delete payments?',
    options: [
      'ALLOW SELECT ON invoices TO billing_clerk; DENY DELETE ON payments TO billing_clerk;',
      'GRANT SELECT ON invoices TO billing_clerk; REVOKE DELETE ON payments FROM billing_clerk;',
      'GRANT READ invoices billing_clerk; REMOVE DELETE payments billing_clerk;',
      'ALTER ROLE billing_clerk ADD SELECT invoices; ALTER ROLE billing_clerk DROP DELETE payments;'],
    answer: 1,
    why: "GRANT privilege ON object TO role adds a permission; REVOKE privilege ON object FROM role removes it. (SQL Server also has DENY, which overrides grants from other roles.) SQLite has no users or GRANT at all: access control is the application's and file system's job." },

  { id: 'iv-077', category: 'Security & Admin', type: 'scenario', difficulty: 3,
    q: 'Clerks at each clinic must see only invoices for their own location, and the rule must hold no matter which tool or query they use. What is the most robust approach in PostgreSQL?',
    options: [
      "Tell each clinic's report writers to always add WHERE location_id = their clinic",
      'Enable row-level security on invoices and add a policy such as USING (location_id = current_setting(\'app.location_id\')::int), then grant clerks access',
      'Create one copy of the invoices table per clinic',
      'Filter the rows in the front-end JavaScript'],
    answer: 1,
    why: 'Row-level security attaches the filter to the table itself, so every query by the restricted role is filtered automatically, even ad-hoc ones. Relying on callers to remember a WHERE clause (or on client-side filtering) is not access control. Where RLS is unavailable, a security-barrier view per role is the fallback.' },

  { id: 'iv-078', category: 'Security & Admin', type: 'write', difficulty: 2,
    q: "Write a masked patient list for an outsourced call-center: patient_id, display_name (first name + ' ' + first letter of last name + '.', e.g. 'Maria G.'), birth_year (year only) and masked_email (first character + '***' + everything from the '@' on, e.g. 'm***@mail.com'; NULL stays NULL). Order by patient_id.",
    solution: `SELECT patient_id,
       first_name || ' ' || substr(last_name, 1, 1) || '.' AS display_name,
       strftime('%Y', date_of_birth) AS birth_year,
       CASE WHEN email IS NULL THEN NULL
            ELSE substr(email, 1, 1) || '***' || substr(email, instr(email, '@'))
       END AS masked_email
FROM patients
ORDER BY patient_id;`,
    ordered: true,
    hints: ['substr(text, start, length) takes part of a string; || concatenates.', "strftime('%Y', date_of_birth) keeps only the year.", "instr(email, '@') finds the position of the @; substr(email, pos) takes the rest.", 'Anything concatenated with NULL is NULL, but a CASE makes the intent explicit.'],
    why: 'Masking removes identifiers the consumer does not need (full surname, exact date of birth, full email) while keeping the data useful. In production, expose this as a view and grant the call-center role access to the view only, never to the base table.' },

  { id: 'iv-079', category: 'Security & Admin', type: 'write', difficulty: 3,
    q: "A public health report may show patient counts per city, but any city with fewer than 3 patients must be suppressed to protect privacy. Treat a NULL city as 'Unknown'. Return city and patient_count for the cities that may be shown, ordered by patient_count DESC, then city.",
    solution: `SELECT COALESCE(city, 'Unknown') AS city, COUNT(*) AS patient_count
FROM patients
GROUP BY COALESCE(city, 'Unknown')
HAVING COUNT(*) >= 3
ORDER BY patient_count DESC, city;`,
    ordered: true,
    hints: ['Group patients by city.', "COALESCE(city, 'Unknown') turns NULL into a label.", 'Suppression is a condition on the group size.', 'HAVING COUNT(*) >= 3'],
    why: 'Small cells can re-identify people (one 17-year-old in a small town is easy to find). Minimum cell-size suppression is a standard de-identification rule for aggregate health reports.' },

  { id: 'iv-080', category: 'Security & Admin', type: 'mcq', difficulty: 2,
    q: 'The billing database takes a full backup every Sunday night and nothing else. On Friday afternoon a bad UPDATE corrupts invoices. What is the main gap in this strategy?',
    options: [
      'Full backups cannot be restored on a different server',
      'The recovery point objective is up to a week: everything since Sunday is lost. Add transaction log / WAL archiving (or frequent incrementals) to allow point-in-time recovery',
      'Backups should be taken during business hours',
      'There is no gap as long as the backup is encrypted'],
    answer: 1,
    why: 'Point-in-time recovery replays archived logs on top of the last full backup up to just before the bad statement. Also test restores regularly and keep copies off-site: an untested backup is only a hope.' },

  { id: 'iv-081', category: 'Security & Admin', type: 'scenario', difficulty: 3,
    q: 'Two billing clerks often open the same invoice, edit it for a few minutes, and save; conflicts are rare but a lost update would be costly. The invoices table has a version column. Which approach fits best?',
    options: [
      'Pessimistic locking: SELECT ... FOR UPDATE when the invoice is opened and hold the lock until the clerk clicks Save',
      "Optimistic locking: save with UPDATE invoices SET ..., version = version + 1 WHERE invoice_id = ? AND version = ?; if 0 rows are updated, someone else saved first, so reload and retry",
      'Use READ UNCOMMITTED so both clerks see each other\'s edits',
      'Let the last save win'],
    answer: 1,
    why: 'Optimistic locking suits rare conflicts and long human "think time": no locks are held while the form is open, and the version check catches a concurrent save. Pessimistic locks held for minutes block other users and risk abandoned locks; they suit short, high-contention transactions such as decrementing a balance.' },

  { id: 'iv-082', category: 'Security & Admin', type: 'mcq', difficulty: 3,
    q: 'Which practice does NOT meaningfully protect PHI in a billing database?',
    options: [
      'Encrypting data at rest and requiring TLS for connections',
      'Auditing who read or changed patient records',
      'Renaming the patients table to something obscure like tbl_x9',
      'Giving analysts de-identified views instead of the base tables'],
    answer: 2,
    why: 'Obscurity is not a control: anyone with access can list the schema. Encryption, audit logs, least-privilege access and de-identified views are the real safeguards (and map directly to HIPAA technical safeguards).' },
];
