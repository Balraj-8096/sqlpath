// Section 04: Aggregate Functions & Grouping (aggregates-01 .. aggregates-19)
Lessons.add([
  // ─────────────────────────────────────────────── 01 COUNT
  {
    id: 'aggregates-01',
    goals: [
      'What an aggregate function is: many rows in, one value out',
      'The difference between COUNT(*), COUNT(column) and COUNT(DISTINCT column)',
      'Why COUNT(column) skips NULLs',
      'How to count rows per group with GROUP BY',
    ],
    concept: `<p>An <b>aggregate function</b> takes a whole pile of rows and squeezes them into <b>one number</b>. <code>COUNT</code> is the simplest one: it answers "how many?"</p>
<ul>
<li><code>COUNT(*)</code> counts <b>rows</b>. It does not care what is inside them.</li>
<li><code>COUNT(city)</code> counts rows where <code>city</code> is <b>not NULL</b>.</li>
<li><code>COUNT(DISTINCT city)</code> counts <b>different</b> non-NULL values.</li>
</ul>
<p>Without <code>GROUP BY</code>, the whole table is one big group and you get one row back. With <code>GROUP BY status</code>, you get one count per status.</p>`,
    why: 'Almost every report starts with a count: how many patients, how many open invoices, how many claims were denied. COUNT turns a table into a headline number.',
    when: 'Use COUNT(*) to count rows (patients, invoices). Use COUNT(column) when you want to know how many rows actually have a value filled in. Use COUNT(DISTINCT column) to count unique things.',
    analogy: 'A billing clerk with a stack of paper invoices. COUNT(*) is counting the sheets. COUNT(email) is counting only the sheets where the email box is filled in. COUNT(DISTINCT city) is counting how many different cities appear on the sheets.',
    exampleSql: `SELECT patient_id, first_name, city, email FROM patients LIMIT 10`,
    syntax: `SELECT COUNT(*)               -- all rows\n     , COUNT(column)          -- rows where column IS NOT NULL\n     , COUNT(DISTINCT column) -- unique non-NULL values\nFROM table\n[WHERE ...];`,
    sql: `SELECT COUNT(*)             AS total_patients,\n       COUNT(city)          AS patients_with_city,\n       COUNT(email)         AS patients_with_email,\n       COUNT(DISTINCT city) AS distinct_cities\nFROM patients;`,
    breakdown: [
      ['COUNT(*) AS total_patients', 'Counts every row in patients: 25, no matter what is inside them.'],
      ['COUNT(city) AS patients_with_city', 'Counts only rows where city is NOT NULL. Several patients have no city on file, so this is lower.'],
      ['COUNT(email) AS patients_with_email', 'Same idea for email: blanks (NULLs) are skipped.'],
      ['COUNT(DISTINCT city) AS distinct_cities', 'First removes duplicate cities, then counts what is left (NULL is never counted).'],
      ['FROM patients', 'The whole patients table is one single group, because there is no GROUP BY.'],
    ],
    visual: { type: 'groupby', source: `SELECT invoice_id, status FROM invoices WHERE invoice_id <= 12`, group: 'status', value: 'invoice_id', agg: 'COUNT' },
    internals: `<p>For <code>COUNT(*)</code> the engine does not read any column at all. It only walks rows and adds 1 to a counter, so it can often use the smallest index on the table instead of the table itself. For <code>COUNT(col)</code> it must read <code>col</code> and check for NULL. For <code>COUNT(DISTINCT col)</code> it must remember every value it has already seen, usually in a temporary B-tree (SQLite) or hash table (PostgreSQL, SQL Server), which costs memory.</p>`,
    mistakes: [
      { wrong: `SELECT COUNT(city) AS total_patients FROM patients;`, why: 'COUNT(city) skips patients whose city is NULL, so it under-counts patients. It answers "how many have a city", not "how many patients".', fix: `SELECT COUNT(*) AS total_patients FROM patients;` },
      { wrong: `SELECT COUNT(*) FROM invoices WHERE payor_id = NULL;`, why: 'Nothing is ever "= NULL", so the WHERE removes every row and the count is 0.', fix: `SELECT COUNT(*) FROM invoices WHERE payor_id IS NULL;` },
    ],
    rules: [
      'COUNT(*) counts rows; COUNT(col) counts non-NULL values.',
      'COUNT never returns NULL: an empty set gives 0.',
      'COUNT(DISTINCT col) ignores NULLs and duplicates.',
      'No GROUP BY means the whole result is one group and one row.',
    ],
    compare: `<table><tr><th>Expression</th><th>Counts</th><th>On patients</th></tr>
<tr><td><code>COUNT(*)</code></td><td>every row</td><td>25</td></tr>
<tr><td><code>COUNT(city)</code></td><td>rows with a city</td><td>fewer than 25</td></tr>
<tr><td><code>COUNT(DISTINCT city)</code></td><td>different cities</td><td>a handful</td></tr>
<tr><td><code>COUNT(1)</code></td><td>same as COUNT(*)</td><td>25</td></tr></table>`,
    realWorld: 'Dashboards in billing systems show "Open claims: 42", "Patients seen this month: 310". Data-quality reports compare COUNT(*) with COUNT(email) to find missing contact details before sending statements.',
    tips: ['COUNT(1) and COUNT(*) do the same thing. Pick COUNT(*): it says "rows" most clearly.'],
    deep: `<p><code>COUNT(*) - COUNT(col)</code> is a neat trick to get the number of NULLs in one pass. In PostgreSQL <code>COUNT(*)</code> on a large table is slow because of MVCC (it must check each row's visibility); people use <code>pg_class.reltuples</code> for fast estimates.</p>`,
    tryIt: { prompt: 'Count how many invoices there are, how many have a payor, and how many different payors appear on invoices.', starter: `SELECT COUNT(*) AS invoices,\n       COUNT(payor_id) AS with_payor,\n       COUNT(DISTINCT payor_id) AS distinct_payors\nFROM invoices;` },
    challenge: {
      level: 1,
      prompt: 'In one row, show: the total number of payments, how many were paid by an insurance payor (payor_id is not NULL), and how many different invoices received at least one payment.',
      solution: `SELECT COUNT(*), COUNT(payor_id), COUNT(DISTINCT invoice_id) FROM payments;`,
      hints: ['All the data is in the payments table.', 'You need three COUNTs in the same SELECT.', 'COUNT(payor_id) skips the NULL (patient-paid) rows.', 'SELECT COUNT(*), COUNT(payor_id), COUNT(DISTINCT invoice_id) FROM payments;'],
    },
    quiz: [
      { q: 'patients has 25 rows and 6 of them have a NULL city. What does COUNT(city) return?', options: ['25', '19', '6', 'NULL'], answer: 1, why: 'COUNT(column) skips NULLs: 25 - 6 = 19.' },
      { q: 'What does SELECT COUNT(*) FROM payments WHERE amount > 1000000 return?', options: ['NULL', 'An error', '0', 'No rows'], answer: 2, why: 'COUNT over an empty set is 0, never NULL. You still get one row.' },
      { q: 'Which counts different cities?', options: ['COUNT(city)', 'COUNT(*)', 'COUNT(DISTINCT city)', 'DISTINCT COUNT(city)'], answer: 2, why: 'DISTINCT goes inside the parentheses: COUNT(DISTINCT city).' },
    ],
  },

  // ─────────────────────────────────────────────── 02 SUM
  {
    id: 'aggregates-02',
    goals: ['Add up a numeric column with SUM', 'Combine SUM with WHERE to total a subset', 'Know that SUM skips NULLs and returns NULL on no rows', 'Sum per group with GROUP BY'],
    concept: `<p><code>SUM(column)</code> adds up all the values in a column and returns the total. It only works sensibly on numbers.</p>
<p>Think of it as the calculator at the bottom of a spreadsheet column. Add a <code>WHERE</code> to total only some rows (for example only overdue invoices), or a <code>GROUP BY</code> to get one total per group (for example one total per invoice).</p>
<p>Two NULL facts: SUM <b>skips NULL values</b>, and if there are <b>no rows at all</b> it returns <b>NULL</b>, not 0.</p>`,
    why: 'Money questions are sum questions: total billed, total collected, total written off. SUM gives the headline dollar figures of a billing system.',
    when: 'Use SUM whenever you need a total of amounts, units, minutes or any other quantity.',
    analogy: 'The cashier closing the till at night adds every receipt of the day into one total. SUM is that end-of-day total; GROUP BY is doing it separately for each cash drawer.',
    exampleSql: `SELECT charge_id, invoice_id, cpt_code, units, amount FROM charges LIMIT 10`,
    syntax: `SELECT SUM(numeric_column)\nFROM table\n[WHERE condition]\n[GROUP BY group_column];`,
    sql: `SELECT SUM(amount) AS total_charged,\n       SUM(units)  AS total_units\nFROM charges;`,
    breakdown: [
      ['SUM(amount) AS total_charged', 'Adds the amount of all 104 charges into one dollar figure.'],
      ['SUM(units) AS total_units', 'Adds up the billed units (for example 15-minute therapy blocks).'],
      ['FROM charges', 'No WHERE and no GROUP BY: the whole table is one group, so we get one row.'],
    ],
    visual: { type: 'groupby', source: `SELECT charge_id, invoice_id, amount FROM charges WHERE invoice_id <= 6`, group: 'invoice_id', value: 'amount', agg: 'SUM' },
    internals: `<p>The engine keeps one running total (an "accumulator") per group. For every row it reads, it adds the value to the accumulator. At the end it outputs the accumulator. In SQLite, SUM of integers stays an integer and raises an error on overflow; <code>TOTAL()</code> is a SQLite-only version that always returns a float and gives 0.0 instead of NULL on no rows.</p>`,
    mistakes: [
      { wrong: `SELECT SUM(amount) FROM payments WHERE invoice_id = 37;`, why: 'Invoice 37 has no payments, so SUM returns NULL, and NULL shown in a report as "blank" or breaking later math (balance = total - NULL = NULL).', fix: `SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE invoice_id = 37;` },
      { wrong: `SELECT SUM(status) FROM invoices;`, why: 'status is text. SQLite quietly converts text to 0 and returns a meaningless 0; other databases raise an error.', fix: `SELECT SUM(total_amount) FROM invoices;` },
    ],
    rules: ['SUM only makes sense on numbers.', 'SUM skips NULLs.', 'SUM over zero rows is NULL: wrap it in COALESCE(SUM(x), 0).', 'Filter with WHERE before summing.'],
    compare: `<table><tr><th>Function</th><th>No rows</th><th>Type</th></tr>
<tr><td><code>SUM(x)</code></td><td>NULL</td><td>integer if all inputs are integers</td></tr>
<tr><td><code>TOTAL(x)</code> (SQLite only)</td><td>0.0</td><td>always real</td></tr>
<tr><td><code>COUNT(x)</code></td><td>0</td><td>integer</td></tr></table>`,
    realWorld: 'Accounts receivable reports: total billed per month, total collected per payor, net balance per invoice (SUM of transaction amounts with + and - signs).',
    tips: ['When summing money, ROUND(SUM(x), 2) at the end avoids ugly floating-point tails like 1740.4999999.'],
    deep: `<p>Floating-point sums depend on the order of addition, so two databases (or two plans) can give totals that differ in the last decimals. Serious financial systems store cents as integers or use DECIMAL/NUMERIC types. SQLite has no real DECIMAL; it stores REAL as 8-byte IEEE floats.</p>`,
    tryIt: { prompt: 'Change the query to show the total of all payments made by Credit Card.', starter: `SELECT SUM(amount) AS card_total\nFROM payments\nWHERE method = 'Cash';` },
    challenge: {
      level: 1,
      prompt: 'What is the total amount billed on invoices whose status is Overdue?',
      solution: `SELECT SUM(total_amount) FROM invoices WHERE status = 'Overdue';`,
      hints: ['The billed amount is invoices.total_amount.', 'Filter the rows first with WHERE.', 'Then add them with SUM(...).', "SELECT SUM(total_amount) FROM invoices WHERE status = 'Overdue';"],
    },
    quiz: [
      { q: 'Values are 100, NULL, 50. What is SUM?', options: ['NULL', '150', '0', 'An error'], answer: 1, why: 'SUM skips the NULL and adds 100 + 50.' },
      { q: 'SUM over a WHERE that matches no rows returns...', options: ['0', 'NULL', 'No rows', 'An error'], answer: 1, why: 'SUM of nothing is NULL. Use COALESCE(SUM(x), 0) to show 0.' },
    ],
  },

  // ─────────────────────────────────────────────── 03 AVG
  {
    id: 'aggregates-03',
    goals: ['Compute averages with AVG', 'Understand that AVG = SUM / COUNT of non-NULL values', 'Round averages for display', 'See how outliers and zero rows shift an average'],
    concept: `<p><code>AVG(column)</code> returns the <b>arithmetic mean</b>: add up the values and divide by how many there are.</p>
<p>The important detail: it divides by the number of <b>non-NULL</b> values. NULLs are left out completely, they are <b>not</b> treated as zero. So <code>AVG(x)</code> equals <code>SUM(x) / COUNT(x)</code>, not <code>SUM(x) / COUNT(*)</code>.</p>
<p>Averages are sensitive to extreme values and to rows that should not be there (for example a voided invoice with total 0).</p>`,
    why: 'Averages describe what is "typical": the average invoice size, the average payment, the average days to pay. They are key numbers for pricing and forecasting.',
    when: 'Use AVG for a typical value of a measure. Filter out rows that would distort it (voided invoices, test data) first.',
    analogy: 'A clinic manager asks "how much is a typical visit bill?" You add all the bills and divide by the number of bills. A cancelled visit billed at $0 should not be in the pile, or it pulls the average down.',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id BETWEEN 30 AND 40`,
    syntax: `SELECT AVG(numeric_column)\n     , ROUND(AVG(numeric_column), 2)\nFROM table\n[WHERE ...];`,
    sql: `SELECT AVG(total_amount)           AS avg_all,\n       ROUND(AVG(total_amount), 2) AS avg_rounded\nFROM invoices\nWHERE status <> 'Void';`,
    breakdown: [
      ["WHERE status <> 'Void'", 'Leaves out the voided $0 invoice so it does not drag the average down.'],
      ['AVG(total_amount) AS avg_all', 'Sum of the remaining totals divided by how many there are.'],
      ['ROUND(AVG(total_amount), 2)', 'Same value rounded to cents for display.'],
    ],
    visual: { type: 'groupby', source: `SELECT payment_id, method, amount FROM payments WHERE payment_id <= 14`, group: 'method', value: 'amount', agg: 'AVG' },
    internals: `<p>AVG is computed with <b>two accumulators</b> per group: a running sum and a running count of non-NULL values. At the end it divides them. That is why AVG cannot be "added up" across groups: the average of averages is not the overall average unless every group has the same size. To combine groups correctly you need SUM and COUNT, then divide.</p>`,
    mistakes: [
      { wrong: `SELECT AVG(total_amount) FROM invoices;`, why: 'Includes the Void invoice with total 0, which lowers the average of real bills.', fix: `SELECT AVG(total_amount) FROM invoices WHERE status <> 'Void';` },
      { wrong: `SELECT AVG(avg_amt) FROM (SELECT method, AVG(amount) AS avg_amt FROM payments GROUP BY method);`, why: 'An average of averages gives each method equal weight, even though Cash has 12 payments and Check has 7. It is not the true average payment.', fix: `SELECT SUM(amount) / COUNT(amount) AS true_avg FROM payments;` },
    ],
    rules: ['AVG ignores NULLs (they are not zeros).', 'AVG(x) = SUM(x) / COUNT(x).', 'Never average averages; combine SUMs and COUNTs.', 'Round only for display, at the end.'],
    compare: `<table><tr><th>Measure</th><th>Meaning</th><th>Hurt by outliers?</th></tr>
<tr><td>AVG (mean)</td><td>sum / count</td><td>yes</td></tr>
<tr><td>Median</td><td>middle value</td><td>no (no built-in in SQLite)</td></tr>
<tr><td>MIN / MAX</td><td>extremes</td><td>they <i>are</i> the outliers</td></tr></table>`,
    realWorld: 'Revenue-cycle teams track average invoice amount per payor and average days-to-payment; a rising average days-to-payment is an early warning of cash-flow trouble.',
    tips: ['If you want NULLs to count as zero, say so explicitly: AVG(COALESCE(x, 0)).'],
    deep: `<p>In PostgreSQL <code>AVG(integer)</code> returns NUMERIC; in SQL Server <code>AVG(int)</code> returns an <b>int</b> (truncated!), so <code>AVG(units)</code> of 1 and 2 gives 1. Cast to decimal first there: <code>AVG(CAST(units AS decimal(10,2)))</code>. SQLite always returns a float.</p>`,
    tryIt: { prompt: 'Find the average charge amount for CPT code 97140 (manual therapy).', starter: `SELECT ROUND(AVG(amount), 2) AS avg_amount\nFROM charges\nWHERE cpt_code = '99213';` },
    challenge: {
      level: 2,
      prompt: 'For each payment method, show the method and its average payment amount rounded to 2 decimals. Highest average first.',
      solution: `SELECT method, ROUND(AVG(amount), 2) AS avg_payment FROM payments GROUP BY method ORDER BY avg_payment DESC;`,
      hints: ['The data is in payments.', 'You need one row per method: GROUP BY method.', 'Use ROUND(AVG(amount), 2).', 'Finish with ORDER BY avg_payment DESC.'],
      ordered: true,
    },
    quiz: [
      { q: 'Values 10, 20, NULL. What does AVG return?', options: ['10', '15', '30', 'NULL'], answer: 1, why: 'NULL is ignored: (10 + 20) / 2 = 15.' },
      { q: 'Group A has 1 row with avg 100, group B has 99 rows with avg 10. The true overall average is closest to...', options: ['55', '10.9', '100', '10'], answer: 1, why: '(100 + 99*10) / 100 = 10.9. The average of averages (55) is wrong.' },
    ],
  },

  // ─────────────────────────────────────────────── 04 MIN
  {
    id: 'aggregates-04',
    goals: ['Find the smallest value with MIN', 'Use MIN on dates and text, not only numbers', 'Get the minimum per group', 'Know how to fetch the whole row that holds the minimum'],
    concept: `<p><code>MIN(column)</code> returns the <b>smallest</b> value in the column. It works on anything that can be sorted:</p>
<ul><li>numbers: the smallest amount</li><li>dates stored as ISO text: the <b>earliest</b> date</li><li>text: the first value in alphabetical order</li></ul>
<p>NULLs are ignored. If every value is NULL (or there are no rows), MIN returns NULL.</p>`,
    why: 'Billing questions like "when did this patient first visit?" or "what is our cheapest service?" are MIN questions.',
    when: 'Use MIN for earliest dates, lowest prices, first names alphabetically, or the first id in a group.',
    analogy: 'Flipping through a patient folder to find the oldest (earliest dated) visit slip. You only keep an eye on "the earliest seen so far" as you flip.',
    exampleSql: `SELECT invoice_id, location_id, invoice_date, total_amount FROM invoices LIMIT 10`,
    syntax: `SELECT MIN(column)\nFROM table\n[WHERE ...]\n[GROUP BY ...];`,
    sql: `SELECT MIN(invoice_date)  AS first_invoice_date,\n       MIN(total_amount)  AS smallest_invoice\nFROM invoices\nWHERE status <> 'Void';`,
    breakdown: [
      ["WHERE status <> 'Void'", 'Ignore the voided $0 invoice, which would otherwise be the smallest.'],
      ['MIN(invoice_date)', 'ISO dates (YYYY-MM-DD) sort correctly as text, so the smallest text is the earliest date.'],
      ['MIN(total_amount)', 'The smallest real invoice total.'],
    ],
    visual: { type: 'groupby', source: `SELECT invoice_id, location_id, total_amount FROM invoices WHERE invoice_id <= 14`, group: 'location_id', value: 'total_amount', agg: 'MIN' },
    internals: `<p>MIN keeps a single "best so far" value per group. If there is an index on the column and no GROUP BY, SQLite can answer <code>MIN(col)</code> by jumping to the first entry of the index: one lookup instead of a full scan. EXPLAIN QUERY PLAN then shows <code>SEARCH ... USING INDEX</code>.</p>`,
    mistakes: [
      { wrong: `SELECT MIN(invoice_date), invoice_id FROM invoices;`, why: 'Most databases reject a bare column next to an aggregate. SQLite allows it (and happens to pick the row with the min), but this is non-standard and breaks on other engines.', fix: `SELECT invoice_id, invoice_date FROM invoices ORDER BY invoice_date LIMIT 1;` },
      { wrong: `SELECT MIN(total_amount) FROM invoices;`, why: 'Returns 0 from the voided invoice, which is not a real bill.', fix: `SELECT MIN(total_amount) FROM invoices WHERE status <> 'Void';` },
    ],
    rules: ['MIN works on numbers, text and ISO dates.', 'NULLs are ignored.', 'To get the whole row with the minimum, use ORDER BY ... LIMIT 1 (or a window function).', 'Dates must be ISO format (YYYY-MM-DD) to compare correctly as text.'],
    compare: `<table><tr><th>Question</th><th>Tool</th></tr>
<tr><td>What is the smallest value?</td><td><code>MIN(col)</code></td></tr>
<tr><td>Which row has the smallest value?</td><td><code>ORDER BY col LIMIT 1</code></td></tr>
<tr><td>Smallest value per group, with the row</td><td><code>ROW_NUMBER() OVER (PARTITION BY ... ORDER BY col)</code></td></tr></table>`,
    realWorld: 'Patient "first seen" dates, earliest unpaid invoice for dunning letters, lowest contracted rate per payor type.',
    tips: ['MIN on a text date in a format like 03/15/2025 gives wrong answers. Keep dates ISO.'],
    deep: `<p>SQLite has a documented quirk: in <code>SELECT MIN(x), y FROM t</code>, the bare column <code>y</code> comes from the row where the min was found. It is handy, but only SQLite (and MySQL with some modes) behaves this way; PostgreSQL raises "must appear in the GROUP BY clause".</p>`,
    tryIt: { prompt: 'Find the earliest service date and the lowest unit price in the charges table.', starter: `SELECT MIN(service_date) AS first_service,\n       MIN(unit_price)   AS cheapest_unit\nFROM charges;` },
    challenge: {
      level: 2,
      prompt: 'For each location_id, show the earliest invoice_date on its invoices. Order by location_id.',
      solution: `SELECT location_id, MIN(invoice_date) AS first_invoice FROM invoices GROUP BY location_id ORDER BY location_id;`,
      hints: ['You need one row per location.', 'GROUP BY location_id.', 'MIN(invoice_date) gives the earliest date because ISO dates sort as text.', 'Add ORDER BY location_id.'],
      ordered: true,
    },
    quiz: [
      { q: "What does MIN('2026-01-05', '2025-12-31') style comparison pick for ISO dates?", options: ["'2026-01-05'", "'2025-12-31'", 'NULL', 'It depends on the locale'], answer: 1, why: "ISO dates compare correctly as text: '2025...' < '2026...'." },
      { q: 'All values in a group are NULL. MIN returns...', options: ['0', 'NULL', 'The first row', 'An error'], answer: 1, why: 'There is no non-NULL value to pick, so the result is NULL.' },
    ],
  },

  // ─────────────────────────────────────────────── 05 MAX
  {
    id: 'aggregates-05',
    goals: ['Find the largest or latest value with MAX', 'Combine MIN and MAX to get a range', 'Use MAX per group', 'Avoid the "which row had the max" trap'],
    concept: `<p><code>MAX(column)</code> is the mirror of MIN: it returns the <b>largest</b> value. On ISO dates that means the <b>latest</b> date; on text it means the last value alphabetically.</p>
<p>A common pattern is putting MIN and MAX side by side to show a <b>range</b>, for example the first and last payment of a patient, or the cheapest and most expensive charge for a procedure.</p>`,
    why: '"When did we last get paid?" and "what is our biggest outstanding bill?" are MAX questions that collectors ask every day.',
    when: 'Use MAX for latest dates, biggest amounts, highest ids, and MAX(date) - MIN(date) style spans.',
    analogy: 'A collector scanning the payment log for the most recent entry: "the last time this insurer paid us was ...". She only remembers the latest date seen so far.',
    exampleSql: `SELECT payment_id, invoice_id, payment_date, amount, method FROM payments LIMIT 10`,
    syntax: `SELECT MAX(column), MIN(column)\nFROM table\n[GROUP BY ...];`,
    sql: `SELECT MIN(payment_date) AS first_payment,\n       MAX(payment_date) AS last_payment,\n       MAX(amount)       AS largest_payment\nFROM payments;`,
    breakdown: [
      ['MIN(payment_date) / MAX(payment_date)', 'The earliest and latest payment dates: the time range of the payment log.'],
      ['MAX(amount)', 'The single biggest payment amount received.'],
      ['FROM payments', 'All 47 payments form one group.'],
    ],
    visual: { type: 'groupby', source: `SELECT payment_id, method, amount FROM payments WHERE payment_id <= 14`, group: 'method', value: 'amount', agg: 'MAX' },
    internals: `<p>Like MIN, MAX is a single-accumulator aggregate: "keep the largest seen so far". With an index on the column and no GROUP BY, SQLite reads the <b>last</b> index entry instead of scanning. MIN and MAX are also the only standard aggregates that return a value of exactly the same type as the input.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id FROM payments WHERE amount = MAX(amount);`, why: 'Aggregates are not allowed in WHERE: WHERE runs row by row, before any grouping.', fix: `SELECT invoice_id, amount FROM payments WHERE amount = (SELECT MAX(amount) FROM payments);` },
      { wrong: `SELECT MAX(amount) FROM payments GROUP BY method;`, why: 'You get the numbers but cannot tell which method each belongs to. Always show the group key.', fix: `SELECT method, MAX(amount) FROM payments GROUP BY method;` },
    ],
    rules: ['MAX on ISO dates = latest date.', 'Aggregates cannot be used in WHERE; use a subquery or HAVING.', 'Show the GROUP BY column next to the aggregate.', 'Ties: MAX gives the value, not how many rows share it.'],
    compare: `<table><tr><th></th><th>MIN</th><th>MAX</th></tr>
<tr><td>Numbers</td><td>smallest</td><td>largest</td></tr>
<tr><td>ISO dates</td><td>earliest</td><td>latest</td></tr>
<tr><td>Text</td><td>A first</td><td>Z last</td></tr></table>`,
    realWorld: 'Aging reports use MAX(payment_date) per payor to flag insurers who have not paid in 60+ days; fraud checks flag MAX(amount) outliers.',
    tips: ['julianday(MAX(d)) - julianday(MIN(d)) gives the number of days between the first and last date in SQLite.'],
    deep: `<p>"Top-1 per group with the full row" is a classic problem. Options: a correlated subquery (<code>WHERE amount = (SELECT MAX(...) WHERE same group)</code>), a window function (<code>ROW_NUMBER() OVER (PARTITION BY method ORDER BY amount DESC)</code>), or SQLite's bare-column MAX quirk. The window version handles ties explicitly and is portable.</p>`,
    tryIt: { prompt: 'Show the latest invoice date and the largest invoice total for each status.', starter: `SELECT status,\n       MAX(invoice_date) AS latest,\n       MAX(total_amount) AS largest\nFROM invoices\nGROUP BY status;` },
    challenge: {
      level: 2,
      prompt: 'For each payment method, show the method, its largest payment and its most recent payment date. Order by method.',
      solution: `SELECT method, MAX(amount), MAX(payment_date) FROM payments GROUP BY method ORDER BY method;`,
      hints: ['One row per method: GROUP BY method.', 'Two MAX calls: one on amount, one on payment_date.', 'Sort alphabetically by method.', 'SELECT method, MAX(amount), MAX(payment_date) FROM payments GROUP BY method ORDER BY method;'],
      ordered: true,
    },
    quiz: [
      { q: 'Why does WHERE amount = MAX(amount) fail?', options: ['MAX needs GROUP BY', 'Aggregates are not allowed in WHERE', 'amount is not indexed', 'It works fine'], answer: 1, why: 'WHERE filters individual rows before grouping, so aggregates do not exist yet at that point.' },
      { q: 'MAX(payment_date) where dates are ISO text returns...', options: ['The earliest date', 'The latest date', 'The longest string', 'NULL'], answer: 1, why: 'ISO text sorts in date order, so the maximum is the latest date.' },
    ],
  },

  // ─────────────────────────────────────────────── 06 NULL handling
  {
    id: 'aggregates-06',
    goals: ['How each aggregate treats NULL', 'Why COUNT(*) and COUNT(col) differ', 'Why SUM/AVG/MIN/MAX of no values is NULL', 'When to use COALESCE inside vs outside an aggregate'],
    concept: `<p>NULL means "unknown / not filled in". Aggregates have one simple rule: <b>they ignore NULL values</b>. The only exception is <code>COUNT(*)</code>, which counts rows, not values.</p>
<ul>
<li><code>COUNT(col)</code>: NULLs are not counted.</li>
<li><code>SUM(col)</code>, <code>MIN</code>, <code>MAX</code>: NULLs are skipped.</li>
<li><code>AVG(col)</code>: NULLs are left out of <b>both</b> the sum and the count.</li>
<li>If nothing is left (all NULL, or no rows), SUM/AVG/MIN/MAX return <b>NULL</b>; COUNT returns <b>0</b>.</li>
</ul>
<p>In the payments table, a NULL <code>payor_id</code> means the patient paid. The visual averages only the insurer-paid amounts: patient payments become NULL and drop out.</p>`,
    why: 'Real billing data is full of gaps: missing payors, unknown cities, no payment yet. If you do not know how aggregates treat NULLs, your totals and averages will be quietly wrong.',
    when: 'Think about NULLs every time you aggregate a column that allows NULL, and every time a group might have no matching rows.',
    analogy: 'A claims auditor averaging reimbursements. Claims still "pending" have no amount yet. She does not count them as $0 (that would make insurers look stingy); she leaves them out until they are known.',
    exampleSql: `SELECT payment_id, invoice_id, payor_id, amount, method FROM payments LIMIT 14`,
    syntax: `COUNT(*)            -- rows, NULL or not\nCOUNT(col)          -- non-NULL values\nAVG(col)            -- SUM(col) / COUNT(col)\nCOALESCE(SUM(col), 0)   -- 0 instead of NULL when nothing to add\nAVG(COALESCE(col, 0))   -- treat NULL as 0 (a business decision!)`,
    sql: `SELECT COUNT(*)                      AS payments,\n       COUNT(payor_id)               AS insurer_payments,\n       COUNT(*) - COUNT(payor_id)    AS patient_payments,\n       ROUND(AVG(CASE WHEN payor_id IS NOT NULL THEN amount END), 2) AS avg_insurer_amount,\n       ROUND(AVG(COALESCE(CASE WHEN payor_id IS NOT NULL THEN amount END, 0)), 2) AS avg_if_null_is_zero\nFROM payments;`,
    breakdown: [
      ['COUNT(*)', 'All 47 payment rows.'],
      ['COUNT(payor_id)', 'Only payments with a payor (insurer). Patient payments have NULL payor_id and are skipped.'],
      ['COUNT(*) - COUNT(payor_id)', 'A quick way to count the NULLs.'],
      ['AVG(CASE WHEN payor_id IS NOT NULL THEN amount END)', 'The CASE gives NULL for patient payments; AVG skips those, so this is the average insurer payment.'],
      ['AVG(COALESCE(..., 0))', 'Turning NULL into 0 changes the meaning: patient payments now count as $0 insurer payments and pull the average down.'],
    ],
    visual: { type: 'groupby', source: `SELECT payment_id, method, CASE WHEN payor_id IS NOT NULL THEN amount END AS insurer_amount FROM payments WHERE payment_id <= 14`, group: 'method', value: 'insurer_amount', agg: 'AVG' },
    internals: `<p>Inside the engine, each aggregate's "step" function simply returns early when its argument is NULL, so the accumulator never changes. <code>COUNT(*)</code> has no argument, so there is nothing to be NULL. The "final" function of SUM/AVG checks "did I ever receive a value?" and returns NULL if not.</p>`,
    mistakes: [
      { wrong: `SELECT AVG(COALESCE(payor_id, 0)) FROM invoices;`, why: 'COALESCE inside the aggregate invents fake zeros. That is only right if "missing" truly means zero, which is rarely the case.', fix: `SELECT AVG(total_amount) FROM invoices WHERE payor_id IS NOT NULL;` },
      { wrong: `SELECT COUNT(city) AS patients FROM patients;`, why: 'Counts only patients with a city; patients with NULL city vanish from the total.', fix: `SELECT COUNT(*) AS patients FROM patients;` },
      { wrong: `SELECT 165 - SUM(amount) AS balance FROM payments WHERE invoice_id = 37;`, why: 'No payments means SUM is NULL, and 165 - NULL is NULL, not 165.', fix: `SELECT 165 - COALESCE(SUM(amount), 0) AS balance FROM payments WHERE invoice_id = 37;` },
    ],
    rules: ['All aggregates skip NULLs except COUNT(*).', 'COUNT returns 0 on empty input; the others return NULL.', 'COALESCE outside the aggregate fixes "no rows"; COALESCE inside changes the math.', 'COUNT(*) - COUNT(col) = number of NULLs.'],
    compare: `<table><tr><th>Input</th><th>COUNT(*)</th><th>COUNT(x)</th><th>SUM(x)</th><th>AVG(x)</th></tr>
<tr><td>10, NULL, 20</td><td>3</td><td>2</td><td>30</td><td>15</td></tr>
<tr><td>NULL, NULL</td><td>2</td><td>0</td><td>NULL</td><td>NULL</td></tr>
<tr><td>(no rows)</td><td>0</td><td>0</td><td>NULL</td><td>NULL</td></tr></table>`,
    realWorld: 'Payor mix reports ("what share of payments came from insurers?") and data-completeness checks ("12% of patients have no email") rely on COUNT(*) vs COUNT(col).',
    tips: ['Before trusting an AVG, compare COUNT(*) and COUNT(col) to see how many values it actually used.'],
    deep: `<p>GROUP BY treats all NULLs as <b>one group</b> (even though NULL = NULL is not true in WHERE). So <code>GROUP BY city</code> gives one row for "unknown city". This is the "NULLs are not distinct" rule that also applies to DISTINCT and set operations.</p>`,
    tryIt: { prompt: 'Group patients by city. Notice that all the NULL cities land in a single group. Then count how many of each group have an email.', starter: `SELECT city, COUNT(*) AS patients, COUNT(email) AS with_email\nFROM patients\nGROUP BY city;` },
    challenge: {
      level: 2,
      prompt: 'In one row show: the number of patients, how many have a city, and how many have a NULL city.',
      solution: `SELECT COUNT(*), COUNT(city), COUNT(*) - COUNT(city) FROM patients;`,
      hints: ['COUNT(*) counts all patients.', 'COUNT(city) skips NULL cities.', 'The difference between the two is the number of NULLs.', 'SELECT COUNT(*), COUNT(city), COUNT(*) - COUNT(city) FROM patients;'],
    },
    quiz: [
      { q: 'Values: 100, NULL, NULL, 200. AVG returns...', options: ['75', '150', 'NULL', '100'], answer: 1, why: 'Only the two non-NULL values count: 300 / 2 = 150.' },
      { q: 'How do you show 0 instead of NULL when an invoice has no payments?', options: ['SUM(COALESCE(amount,0))', 'COALESCE(SUM(amount), 0)', 'COUNT(amount)', 'SUM(amount) IS NULL'], answer: 1, why: 'With no rows, SUM(COALESCE(...)) is still NULL because there is nothing to add. Wrap the whole SUM instead.' },
      { q: 'GROUP BY city with 5 NULL cities produces how many NULL groups?', options: ['0', '1', '5', 'An error'], answer: 1, why: 'GROUP BY puts all NULLs together in one group.' },
    ],
  },

  // ─────────────────────────────────────────────── 07 GROUP BY
  {
    id: 'aggregates-07',
    goals: ['What GROUP BY does: split rows into buckets, then aggregate each bucket', 'The rule for which columns can appear in SELECT', 'Grouping by more than one column', 'Where GROUP BY runs in the query order'],
    concept: `<p><code>GROUP BY</code> sorts rows into <b>buckets</b> that share the same value, then runs the aggregate <b>once per bucket</b>. The result has <b>one row per bucket</b>.</p>
<p>Three steps (watch them in the animation):</p>
<ol><li><b>Read</b> the rows (after WHERE).</li><li><b>Group</b>: put each row into the bucket for its status.</li><li><b>Aggregate</b>: count / sum each bucket into one row.</li></ol>
<p>The golden rule: every column in SELECT must either be <b>in the GROUP BY</b> or be <b>inside an aggregate</b>. Anything else is ambiguous: which of the 13 overdue invoices' patient_id should be shown?</p>`,
    why: 'Summary reports are always "per something": per status, per location, per payor, per month. GROUP BY is how SQL produces those summaries.',
    when: 'Use GROUP BY whenever the question contains "per", "for each" or "by": revenue per location, invoices by status, charges per practitioner.',
    analogy: 'At month end the billing office sorts all invoice slips into trays by status (Paid, Open, Overdue...). Then someone counts the slips and adds up the totals in each tray, writing one summary line per tray.',
    exampleSql: `SELECT invoice_id, location_id, status, total_amount FROM invoices WHERE invoice_id <= 14`,
    syntax: `SELECT group_col1, group_col2, AGG(value_col)\nFROM table\n[WHERE row_filter]\nGROUP BY group_col1, group_col2\n[ORDER BY ...];`,
    sql: `SELECT status,\n       COUNT(*)          AS invoice_count,\n       SUM(total_amount) AS billed\nFROM invoices\nGROUP BY status\nORDER BY billed DESC;`,
    breakdown: [
      ['FROM invoices', 'Start with all 48 invoices.'],
      ['GROUP BY status', 'Put the invoices into 5 buckets: Open, Overdue, Paid, Partially Paid, Void.'],
      ['SELECT status, COUNT(*), SUM(total_amount)', 'For each bucket: its key, how many invoices, and their total.'],
      ['ORDER BY billed DESC', 'Sorting happens after grouping, so we can sort by the aggregate alias.'],
    ],
    visual: { type: 'groupby', source: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id <= 14`, group: 'status', value: 'total_amount', agg: 'SUM' },
    internals: `<p>Engines group rows in one of two ways:</p>
<ul><li><b>Sort aggregation</b>: sort the rows by the group key, then walk them; each time the key changes, emit the finished group. Needs a sort (or an index already in that order). SQLite mainly uses this, with a temporary B-tree ("USE TEMP B-TREE FOR GROUP BY" in EXPLAIN QUERY PLAN).</li>
<li><b>Hash aggregation</b>: keep a hash table keyed by the group value, with one accumulator per entry; update it for every row. No sort needed; memory grows with the number of groups. PostgreSQL and SQL Server choose between the two based on cost.</li></ul>
<p>Because of this, the output order of GROUP BY is <b>not guaranteed</b>. Add ORDER BY if you care.</p>`,
    mistakes: [
      { wrong: `SELECT status, patient_id, COUNT(*) FROM invoices GROUP BY status;`, why: 'patient_id is neither grouped nor aggregated. Each status bucket has many patient_ids; PostgreSQL/SQL Server raise an error, SQLite silently picks an arbitrary one.', fix: `SELECT status, COUNT(*) AS invoice_count FROM invoices GROUP BY status;` },
      { wrong: `SELECT location_id, COUNT(*) FROM invoices;`, why: 'Without GROUP BY, the whole table is one group, so you get one row with a random location_id (SQLite) or an error (others).', fix: `SELECT location_id, COUNT(*) FROM invoices GROUP BY location_id;` },
    ],
    rules: ['One output row per distinct combination of GROUP BY columns.', 'SELECT columns must be grouped or aggregated.', 'WHERE runs before GROUP BY; HAVING runs after.', 'GROUP BY does not sort; use ORDER BY.', 'All NULL keys form a single group.'],
    compare: `<table><tr><th></th><th>DISTINCT</th><th>GROUP BY</th></tr>
<tr><td>Removes duplicates</td><td>yes</td><td>yes (one row per key)</td></tr>
<tr><td>Can compute aggregates</td><td>no</td><td>yes</td></tr>
<tr><td>Typical use</td><td>list unique values</td><td>summaries per group</td></tr></table>`,
    realWorld: 'Every billing dashboard tile ("Revenue by location", "Claims by payor", "Charges by month") is a GROUP BY query under the hood.',
    tips: ['Read "GROUP BY x" as "for each x".', 'Group by month with GROUP BY strftime(\'%Y-%m\', invoice_date).'],
    deep: `<p>The SQL standard allows a column in SELECT that is <b>functionally dependent</b> on the GROUP BY key: if you <code>GROUP BY patients.patient_id</code>, you may select <code>patients.last_name</code> because the primary key determines it. PostgreSQL and MySQL 5.7+ implement this; SQL Server does not.</p>`,
    tryIt: { prompt: 'Group invoices by location_id AND status to see each status per location.', starter: `SELECT location_id, status, COUNT(*) AS n\nFROM invoices\nGROUP BY location_id\nORDER BY location_id;` },
    challenge: {
      level: 2,
      prompt: 'For each location_id, show the number of invoices and their total billed amount. Highest total first.',
      solution: `SELECT location_id, COUNT(*) AS invoices, SUM(total_amount) AS billed FROM invoices GROUP BY location_id ORDER BY billed DESC;`,
      hints: ['Group the invoices table by location.', 'You need two aggregates: COUNT(*) and SUM(total_amount).', 'Name the sum so you can sort by it.', 'ORDER BY billed DESC.'],
      ordered: true,
    },
    quiz: [
      { q: 'GROUP BY status on invoices with 5 different statuses returns how many rows?', options: ['48', '5', '1', 'Depends on ORDER BY'], answer: 1, why: 'One row per distinct group key.' },
      { q: 'Which column can you select in SELECT ... FROM invoices GROUP BY location_id?', options: ['status', 'invoice_id', 'SUM(total_amount)', 'patient_id'], answer: 2, why: 'Only the group key and aggregates are safe.' },
      { q: 'Is the output of GROUP BY guaranteed to be sorted?', options: ['Yes, by the key', 'No, add ORDER BY', 'Only in SQLite', 'Only with an index'], answer: 1, why: 'Hash aggregation returns groups in any order. Only ORDER BY guarantees order.' },
    ],
  },

  // ─────────────────────────────────────────────── 08 HAVING
  {
    id: 'aggregates-08',
    goals: ['Filter groups with HAVING', 'The difference between WHERE (rows) and HAVING (groups)', 'Use aggregates in HAVING that are not in SELECT', 'Combine WHERE and HAVING in one query'],
    concept: `<p><code>HAVING</code> is a filter for <b>groups</b>. It runs <b>after</b> GROUP BY, when the counts and sums already exist, so it can say things like "only keep patients with at least 2 invoices".</p>
<p><code>WHERE</code> cannot do this, because WHERE runs earlier, on single rows, before any group exists.</p>
<p>Order of work: <b>FROM → WHERE</b> (drop rows) <b>→ GROUP BY</b> (make buckets) <b>→ HAVING</b> (drop buckets) <b>→ SELECT → ORDER BY</b>.</p>`,
    why: 'Many business questions filter on a total: patients with several overdue bills, locations billing over $2,000, CPT codes used more than 10 times. Those filters need HAVING.',
    when: 'Use HAVING when the condition involves an aggregate (COUNT, SUM, AVG...). Use WHERE for conditions on plain columns.',
    analogy: 'The invoice slips are sorted into one tray per patient. WHERE is throwing away individual slips before sorting (for example voided ones). HAVING is looking at the finished trays and only keeping the trays that hold 2 or more slips.',
    exampleSql: `SELECT invoice_id, patient_id, status, total_amount FROM invoices WHERE invoice_id <= 14`,
    syntax: `SELECT group_col, AGG(x)\nFROM table\nWHERE row_condition        -- before grouping\nGROUP BY group_col\nHAVING AGG(...) condition  -- after grouping\nORDER BY ...;`,
    sql: `SELECT patient_id,\n       COUNT(*)          AS invoice_count,\n       SUM(total_amount) AS billed\nFROM invoices\nWHERE status <> 'Void'\nGROUP BY patient_id\nHAVING COUNT(*) >= 3\nORDER BY invoice_count DESC, patient_id;`,
    breakdown: [
      ["WHERE status <> 'Void'", 'Row filter: drop voided invoices before grouping.'],
      ['GROUP BY patient_id', 'One bucket per patient.'],
      ['HAVING COUNT(*) >= 3', 'Group filter: keep only patients with 3 or more invoices.'],
      ['ORDER BY invoice_count DESC, patient_id', 'Busiest patients first; ties broken by id.'],
    ],
    visual: { type: 'groupby', source: `SELECT invoice_id, patient_id FROM invoices WHERE invoice_id <= 14`, group: 'patient_id', value: 'invoice_id', agg: 'COUNT', having: 2 },
    internals: `<p>HAVING is evaluated on the output of the aggregation step, one test per group, so its cost is tiny compared to the scan. The optimizer also moves conditions that do <b>not</b> use aggregates from HAVING down into WHERE ("predicate pushdown"), because filtering rows early means fewer rows to group. Still, write them in WHERE yourself: it is clearer.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id, COUNT(*) FROM invoices WHERE COUNT(*) >= 3 GROUP BY patient_id;`, why: 'WHERE runs before grouping, so COUNT(*) does not exist yet: "misuse of aggregate".', fix: `SELECT patient_id, COUNT(*) FROM invoices GROUP BY patient_id HAVING COUNT(*) >= 3;` },
      { wrong: `SELECT status, COUNT(*) FROM invoices GROUP BY status HAVING status <> 'Void';`, why: 'Works, but filters late: it groups the Void rows and then throws the group away. A plain column condition belongs in WHERE.', fix: `SELECT status, COUNT(*) FROM invoices WHERE status <> 'Void' GROUP BY status;` },
    ],
    rules: ['WHERE filters rows, HAVING filters groups.', 'Aggregates are allowed in HAVING, not in WHERE.', 'HAVING can use aggregates that are not in SELECT.', 'Put plain-column conditions in WHERE for speed and clarity.'],
    compare: `<table><tr><th></th><th>WHERE</th><th>HAVING</th></tr>
<tr><td>Runs</td><td>before GROUP BY</td><td>after GROUP BY</td></tr>
<tr><td>Works on</td><td>single rows</td><td>groups</td></tr>
<tr><td>Aggregates allowed</td><td>no</td><td>yes</td></tr>
<tr><td>Example</td><td><code>status = 'Overdue'</code></td><td><code>COUNT(*) &gt;= 3</code></td></tr></table>`,
    realWorld: 'Collections worklists ("patients with 2+ overdue invoices"), fraud rules ("practitioners billing the same CPT code more than 20 times a day"), payor audits ("payors with average payment under $50").',
    tips: ['SQLite lets you use the SELECT alias in HAVING (HAVING invoice_count >= 3); PostgreSQL does not. Repeating the aggregate works everywhere.'],
    deep: `<p>HAVING without GROUP BY is legal: the whole table is one group. <code>SELECT COUNT(*) FROM invoices HAVING COUNT(*) &gt; 100</code> returns one row or no rows, which is a neat way to return data only if a threshold is met.</p>`,
    tryIt: { prompt: 'Find CPT codes that were billed more than 8 times. Then add a condition so only codes with total amount over 1000 remain.', starter: `SELECT cpt_code, COUNT(*) AS times, SUM(amount) AS total\nFROM charges\nGROUP BY cpt_code\nHAVING COUNT(*) > 8;` },
    challenge: {
      level: 2,
      prompt: 'List patients (patient_id) who have 2 or more Overdue invoices, with how many they have. Order by the count descending, then patient_id.',
      solution: `SELECT patient_id, COUNT(*) AS overdue FROM invoices WHERE status = 'Overdue' GROUP BY patient_id HAVING COUNT(*) >= 2 ORDER BY overdue DESC, patient_id;`,
      hints: ['First keep only Overdue invoices: that is a row filter (WHERE).', 'Group by patient_id and count.', 'Keep only groups with COUNT(*) >= 2: that is HAVING.', 'ORDER BY overdue DESC, patient_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Where does a condition on SUM(total_amount) go?', options: ['WHERE', 'HAVING', 'ORDER BY', 'FROM'], answer: 1, why: 'Conditions on aggregates go in HAVING.' },
      { q: 'In which order do these run?', options: ['HAVING, WHERE, GROUP BY', 'WHERE, GROUP BY, HAVING', 'GROUP BY, WHERE, HAVING', 'WHERE, HAVING, GROUP BY'], answer: 1, why: 'Rows are filtered, then grouped, then groups are filtered.' },
    ],
  },

  // ─────────────────────────────────────────────── 09 Multiple aggregates
  {
    id: 'aggregates-09',
    goals: ['Compute several aggregates in one pass', 'Build a compact summary row per group', 'Derive ratios from aggregates', 'Why one query beats several separate ones'],
    concept: `<p>You can put <b>as many aggregates as you like</b> in one SELECT. The engine reads the rows once and updates all the accumulators at the same time.</p>
<p>You can also do math <b>on</b> the aggregates: <code>SUM(amount) / COUNT(*)</code>, <code>MAX(x) - MIN(x)</code>, or a percentage like <code>100.0 * COUNT(payor_id) / COUNT(*)</code>.</p>`,
    why: 'A good summary needs several numbers side by side: how many, how much, typical size, smallest and largest. One query gives the full picture.',
    when: 'Whenever you build a report row per group, like a location scorecard or a payor profile.',
    analogy: 'At the end of the day, the front-desk supervisor fills one summary card per clinic: number of visits, total billed, average bill, smallest and largest bill. She goes through the pile once and fills all boxes at the same time.',
    exampleSql: `SELECT invoice_id, location_id, status, total_amount FROM invoices WHERE invoice_id <= 12`,
    syntax: `SELECT group_col,\n       COUNT(*), SUM(x), AVG(x), MIN(x), MAX(x),\n       MAX(x) - MIN(x)           AS spread,\n       100.0 * SUM(y) / SUM(x)   AS pct\nFROM table\nGROUP BY group_col;`,
    sql: `SELECT location_id,\n       COUNT(*)                   AS invoices,\n       SUM(total_amount)          AS billed,\n       ROUND(AVG(total_amount),2) AS avg_invoice,\n       MIN(total_amount)          AS smallest,\n       MAX(total_amount)          AS largest,\n       MAX(total_amount) - MIN(total_amount) AS spread\nFROM invoices\nWHERE status <> 'Void'\nGROUP BY location_id\nORDER BY billed DESC;`,
    breakdown: [
      ['COUNT(*), SUM(...), AVG(...), MIN(...), MAX(...)', 'Five accumulators per location, all filled in a single scan.'],
      ['MAX(total_amount) - MIN(total_amount) AS spread', 'Arithmetic on two aggregates: how wide the range of bills is.'],
      ["WHERE status <> 'Void'", 'Leave out the $0 void so MIN and AVG stay meaningful.'],
      ['ORDER BY billed DESC', 'Biggest-billing location first.'],
    ],
    visual: { type: 'groupby', source: `SELECT invoice_id, location_id, total_amount FROM invoices WHERE invoice_id <= 14`, group: 'location_id', value: 'total_amount', agg: 'AVG' },
    internals: `<p>Each aggregate in the SELECT gets its own accumulator slot in the group's entry (a hash-table entry or the current sort group). One pass over the data updates all of them. Running 5 separate queries would scan the table 5 times, so combining them is usually around 5× cheaper on large tables.</p>`,
    mistakes: [
      { wrong: `SELECT location_id, 100 * COUNT(payor_id) / COUNT(*) AS pct_insured FROM invoices GROUP BY location_id;`, why: 'Integer division: location 3 has 6 of 7 invoices with a payor, and 100 * 6 / 7 gives 85, not 85.7. In SQLite (and SQL Server/PostgreSQL) int / int drops the decimals.', fix: `SELECT location_id, ROUND(100.0 * COUNT(payor_id) / COUNT(*), 1) AS pct_insured FROM invoices GROUP BY location_id;` },
      { wrong: `SELECT AVG(SUM(total_amount)) FROM invoices GROUP BY location_id;`, why: 'Aggregates cannot be nested directly in standard SQL (SQLite: "misuse of aggregate").', fix: `SELECT AVG(billed) FROM (SELECT SUM(total_amount) AS billed FROM invoices GROUP BY location_id);` },
    ],
    rules: ['Put all the numbers you need in one SELECT: one scan.', 'Multiply by 100.0 (not 100) to avoid integer division.', 'Aggregates cannot be nested; use a subquery or CTE.', 'Round at the end, not inside SUMs.'],
    compare: `<table><tr><th>Approach</th><th>Scans</th><th>Consistent snapshot</th></tr>
<tr><td>5 separate queries</td><td>5</td><td>not guaranteed</td></tr>
<tr><td>1 query, 5 aggregates</td><td>1</td><td>yes</td></tr></table>`,
    realWorld: 'Location scorecards, payor performance reports ("claims, billed, paid, avg days to pay, denial rate") and practitioner productivity reports are all multi-aggregate GROUP BY queries.',
    tips: ['Give every aggregate a clear alias; reports without names are unreadable.'],
    deep: `<p>Derived metrics built from aggregates are "non-additive": you cannot sum percentages across groups. Store the base aggregates (sums and counts) in summary tables and derive ratios at read time. This is the same idea behind OLAP cubes and dbt metrics layers.</p>`,
    tryIt: { prompt: 'Add a column showing what percentage of each location\'s invoices have a payor (use 100.0).', starter: `SELECT location_id,\n       COUNT(*) AS invoices,\n       COUNT(payor_id) AS with_payor\nFROM invoices\nGROUP BY location_id;` },
    challenge: {
      level: 3,
      prompt: 'For each cpt_code show: number of charges, total units, total amount, and average unit price rounded to 2 decimals. Show only the top 5 codes by total amount (highest first).',
      solution: `SELECT cpt_code, COUNT(*) AS charges, SUM(units) AS units, SUM(amount) AS total, ROUND(AVG(unit_price), 2) AS avg_price FROM charges GROUP BY cpt_code ORDER BY total DESC LIMIT 5;`,
      hints: ['All the data is in charges; group by cpt_code.', 'You need COUNT(*), SUM(units), SUM(amount) and AVG(unit_price).', 'Wrap the AVG in ROUND(..., 2).', 'ORDER BY total DESC LIMIT 5.'],
      ordered: true,
    },
    quiz: [
      { q: 'In SQLite, what does 100 * 7 / 11 return?', options: ['63.63', '63', '64', 'NULL'], answer: 1, why: 'All integers: 700 / 11 = 63 with the remainder dropped. Use 100.0.' },
      { q: 'How many table scans does a query with COUNT, SUM and AVG in one SELECT need?', options: ['1', '3', '2', 'Depends on the number of groups'], answer: 0, why: 'All accumulators are updated in the same pass.' },
    ],
  },

  // ─────────────────────────────────────────────── 10 Conditional aggregation
  {
    id: 'aggregates-10',
    goals: ['Count or sum only some rows inside a group', 'Pivot rows into columns with SUM(CASE ...)', 'Why CASE without ELSE works well with COUNT', 'Compute percentages of a subset in one query'],
    concept: `<p><b>Conditional aggregation</b> means: "aggregate only the rows that meet a condition", inside a bigger group. The trick is to put a <code>CASE</code> <b>inside</b> the aggregate:</p>
<ul>
<li><code>SUM(CASE WHEN status='Paid' THEN total_amount ELSE 0 END)</code>: add only the paid amounts.</li>
<li><code>COUNT(CASE WHEN status='Overdue' THEN 1 END)</code>: count only overdue rows (no ELSE means NULL, and COUNT skips NULLs).</li>
</ul>
<p>Doing this for several conditions turns <b>rows into columns</b>, which is called a <b>pivot</b>: one row per location, one column per status.</p>`,
    why: 'Without it you would need one query per status and then glue them together. Conditional aggregation gives a whole cross-tab in one scan.',
    when: 'Use it for side-by-side columns (paid vs unpaid, insurer vs patient, 2025 vs 2026), and for rates like "percent overdue".',
    analogy: 'The clinic manager\'s tally sheet has one row per clinic and columns "Paid", "Open", "Overdue". She reads each invoice once and puts a tick in the right column. That is SUM(CASE ...) per column.',
    exampleSql: `SELECT invoice_id, location_id, status, total_amount FROM invoices WHERE invoice_id <= 14`,
    syntax: `SELECT group_col,\n       SUM(CASE WHEN cond1 THEN value ELSE 0 END) AS col1,\n       COUNT(CASE WHEN cond2 THEN 1 END)          AS col2\nFROM table\nGROUP BY group_col;`,
    sql: `SELECT location_id,\n       COUNT(*)                                                   AS invoices,\n       COUNT(CASE WHEN status = 'Overdue' THEN 1 END)             AS overdue_count,\n       SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END) AS paid_amount,\n       SUM(CASE WHEN status IN ('Open','Overdue','Partially Paid') THEN total_amount ELSE 0 END) AS unsettled_amount\nFROM invoices\nGROUP BY location_id\nORDER BY location_id;`,
    breakdown: [
      ['GROUP BY location_id', 'One row per location.'],
      ["COUNT(CASE WHEN status = 'Overdue' THEN 1 END)", 'CASE gives 1 for overdue rows and NULL otherwise; COUNT counts only the 1s.'],
      ["SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END)", 'Paid invoices contribute their total, everything else contributes 0.'],
      ['SUM(CASE WHEN status IN (...) ...)', 'A second pivot column for invoices that still need attention.'],
    ],
    visual: { type: 'groupby', source: `SELECT invoice_id, location_id, CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END AS paid_amount FROM invoices WHERE invoice_id <= 14`, group: 'location_id', value: 'paid_amount', agg: 'SUM' },
    internals: `<p>The CASE is evaluated per row, before the value is handed to the accumulator. So <code>SUM(CASE ...)</code> costs one extra expression per row, which is nearly free compared to reading the row. Several pivot columns still need only <b>one scan</b>, unlike a UNION of filtered queries.</p>`,
    mistakes: [
      { wrong: `SELECT location_id, COUNT(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) AS overdue FROM invoices GROUP BY location_id;`, why: 'ELSE 0 is not NULL, so COUNT counts every row. You get the total count, not the overdue count.', fix: `SELECT location_id, SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) AS overdue FROM invoices GROUP BY location_id;` },
      { wrong: `SELECT location_id, SUM(CASE WHEN status = 'Paid' THEN total_amount END) AS paid FROM invoices GROUP BY location_id;`, why: 'Without ELSE 0 a location with no paid invoices shows NULL instead of 0.', fix: `SELECT location_id, SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END) AS paid FROM invoices GROUP BY location_id;` },
    ],
    rules: ['COUNT(CASE WHEN ... THEN 1 END): no ELSE.', 'SUM(CASE WHEN ... THEN x ELSE 0 END): ELSE 0.', 'One CASE per pivot column.', 'Rates: 100.0 * SUM(CASE ...) / COUNT(*).'],
    compare: `<table><tr><th>Approach</th><th>Output shape</th><th>Scans</th></tr>
<tr><td><code>GROUP BY location_id, status</code></td><td>long: one row per pair</td><td>1</td></tr>
<tr><td>Conditional aggregation</td><td>wide: one column per status</td><td>1</td></tr>
<tr><td>One query per status + JOIN</td><td>wide</td><td>many</td></tr></table>`,
    realWorld: 'Aging buckets (0-30, 31-60, 61-90, 90+ days) as columns, payor mix per location, "billed vs collected" side by side, month-over-month columns in finance reports.',
    tips: ['In SQLite, a comparison is already 0 or 1, so SUM(status = \'Paid\') counts paid rows. It is short but less portable.'],
    deep: `<p>SQL Server and Oracle have a <code>PIVOT</code> operator, but it is just syntax for conditional aggregation with fixed columns. Dynamic columns (one per unknown status) always need dynamic SQL, because a query's column list must be known before it runs.</p>`,
    tryIt: { prompt: 'Add a column for total written off: sum of transaction amounts where transaction_type = \'WRITE_OFF\', per invoice.', starter: `SELECT invoice_id,\n       SUM(CASE WHEN transaction_type = 'CHARGE' THEN amount ELSE 0 END)  AS charged,\n       SUM(CASE WHEN transaction_type = 'PAYMENT' THEN -amount ELSE 0 END) AS paid\nFROM transactions\nGROUP BY invoice_id\nORDER BY invoice_id\nLIMIT 10;` },
    challenge: {
      level: 3,
      prompt: 'For each payment method, show the method, the amount paid by insurers (payor_id not NULL) and the amount paid by patients (payor_id NULL). Order by method.',
      solution: `SELECT method, SUM(CASE WHEN payor_id IS NOT NULL THEN amount ELSE 0 END) AS insurer_paid, SUM(CASE WHEN payor_id IS NULL THEN amount ELSE 0 END) AS patient_paid FROM payments GROUP BY method ORDER BY method;`,
      hints: ['One row per method: GROUP BY method.', 'Two columns, each a SUM with a CASE inside.', 'Use IS NULL / IS NOT NULL in the CASE conditions, with ELSE 0.', 'SUM(CASE WHEN payor_id IS NULL THEN amount ELSE 0 END) is the patient column.'],
      ordered: true,
    },
    quiz: [
      { q: "What does COUNT(CASE WHEN status='Paid' THEN 1 ELSE 0 END) count?", options: ['Paid rows', 'All rows', 'Unpaid rows', 'NULL'], answer: 1, why: '0 is a value, not NULL, so every row is counted.' },
      { q: 'Turning rows (one per status) into columns is called...', options: ['Unpivot', 'Pivot', 'Rollup', 'Normalization'], answer: 1, why: 'Conditional aggregation is the portable way to pivot.' },
    ],
  },

  // ─────────────────────────────────────────────── 11 CASE + Aggregates
  {
    id: 'aggregates-11',
    goals: ['Group by a CASE expression to create buckets', 'Label aggregate results with CASE', 'Tell apart CASE inside vs outside an aggregate', 'Build size bands and aging buckets'],
    concept: `<p>CASE and aggregates meet in three places:</p>
<ol>
<li><b>CASE as the group key</b>: turn raw values into buckets, then group by the bucket. Example: invoice size bands Small / Medium / Large.</li>
<li><b>CASE inside the aggregate</b>: conditional aggregation (previous lesson).</li>
<li><b>CASE around the aggregate</b>: label the result of a group. Example: <code>CASE WHEN SUM(total_amount) &gt; 2000 THEN 'High volume' ELSE 'Normal' END</code>.</li>
</ol>
<p>This lesson focuses on 1 and 3. The key question is always: does the CASE look at <b>one row</b> (inside/key) or at the <b>group's result</b> (around)?</p>`,
    why: 'Raw numbers are hard to read. Buckets and labels turn "48 different totals" into "12 small, 25 medium, 11 large", which people can act on.',
    when: 'Use CASE as a key for bands (amount ranges, age groups, days overdue). Use CASE around aggregates for tiers and flags (high/low volume, OK/at risk).',
    analogy: 'Sorting invoices into three trays marked Small, Medium and Large before counting them. The trays do not exist in the data; you invent them with a rule (CASE), then count each tray.',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id <= 14`,
    syntax: `-- CASE as group key\nSELECT CASE WHEN x < 100 THEN 'Small' ... END AS band, COUNT(*)\nFROM t\nGROUP BY band;\n\n-- CASE around an aggregate\nSELECT g, CASE WHEN SUM(x) > 1000 THEN 'High' ELSE 'Normal' END\nFROM t GROUP BY g;`,
    sql: `SELECT CASE\n         WHEN total_amount < 100 THEN '1 Small (<100)'\n         WHEN total_amount < 300 THEN '2 Medium (100-299)'\n         ELSE '3 Large (300+)'\n       END                AS size_band,\n       COUNT(*)           AS invoices,\n       SUM(total_amount)  AS billed\nFROM invoices\nWHERE status <> 'Void'\nGROUP BY size_band\nORDER BY size_band;`,
    breakdown: [
      ['CASE WHEN total_amount < 100 ... END AS size_band', 'Per row: decide which band the invoice belongs to. The number prefix makes the bands sort in a sensible order.'],
      ['GROUP BY size_band', 'Group by the computed band (SQLite allows the alias; elsewhere repeat the CASE).'],
      ['COUNT(*), SUM(total_amount)', 'How many invoices and how many dollars fall into each band.'],
    ],
    visual: { type: 'groupby', source: `SELECT invoice_id, CASE WHEN total_amount < 100 THEN 'Small' WHEN total_amount < 300 THEN 'Medium' ELSE 'Large' END AS size_band, total_amount FROM invoices WHERE invoice_id <= 14`, group: 'size_band', value: 'total_amount', agg: 'COUNT' },
    internals: `<p>When grouping by an expression, the engine computes the expression for each row and uses the result as the hash or sort key. An index on <code>total_amount</code> cannot be used to deliver the rows already grouped, because the band is computed. Some databases let you index the expression itself (SQLite supports indexes on expressions).</p>`,
    mistakes: [
      { wrong: `SELECT location_id, CASE WHEN total_amount > 300 THEN 'Big' ELSE 'Small' END AS tier FROM invoices GROUP BY location_id;`, why: 'The CASE uses a plain column (total_amount) that is not grouped. Each location has many totals, so which one? Wrap the column in an aggregate.', fix: `SELECT location_id, CASE WHEN SUM(total_amount) > 2000 THEN 'High volume' ELSE 'Normal' END AS tier FROM invoices GROUP BY location_id;` },
      { wrong: `SELECT CASE WHEN total_amount < 100 THEN 'Small' WHEN total_amount < 50 THEN 'Tiny' ELSE 'Big' END AS b, COUNT(*) FROM invoices GROUP BY b;`, why: 'CASE stops at the first true branch. Anything under 50 is also under 100, so "Tiny" can never happen.', fix: `SELECT CASE WHEN total_amount < 50 THEN 'Tiny' WHEN total_amount < 100 THEN 'Small' ELSE 'Big' END AS b, COUNT(*) FROM invoices GROUP BY b;` },
    ],
    rules: ['CASE branches are checked top to bottom; order from narrowest to widest.', 'CASE as a group key works on row values.', 'CASE around an aggregate works on group results.', 'Always add ELSE so no row falls into a NULL bucket by accident.'],
    compare: `<table><tr><th>Where the CASE is</th><th>Sees</th><th>Use</th></tr>
<tr><td>GROUP BY key</td><td>one row</td><td>buckets / bands</td></tr>
<tr><td>Inside SUM/COUNT</td><td>one row</td><td>pivot columns</td></tr>
<tr><td>Around SUM/COUNT</td><td>group result</td><td>tiers, flags</td></tr></table>`,
    realWorld: 'A/R aging reports (0-30, 31-60, 61-90, 90+ days past due), patient age bands for payor mix, practitioner tiers by monthly billing.',
    tips: ['Prefix labels with a number ("1 Small") or add a sort-key CASE so bands sort in business order, not alphabetical.'],
    deep: `<p>PostgreSQL does not allow the SELECT alias in GROUP BY when it clashes with a column name, and SQL Server never allows it: repeat the full CASE or wrap the query in a derived table / CTE and group in the outer query. The CTE approach is the most portable and readable.</p>`,
    tryIt: { prompt: 'Build an aging report: bucket unpaid invoices (Open, Overdue, Partially Paid) by days past due_date as of 2026-09-01 (Not due, 1-30, 31-60, 60+).', starter: `SELECT CASE\n         WHEN julianday('2026-09-01') - julianday(due_date) <= 0  THEN '0 Not due'\n         WHEN julianday('2026-09-01') - julianday(due_date) <= 30 THEN '1 1-30'\n         ELSE '2 30+'\n       END AS bucket,\n       COUNT(*) AS invoices, SUM(total_amount) AS amount\nFROM invoices\nWHERE status IN ('Open','Overdue','Partially Paid')\nGROUP BY bucket\nORDER BY bucket;` },
    challenge: {
      level: 3,
      prompt: "For each location_id, show its total billed and a tier: 'High' if the total is 2000 or more, otherwise 'Standard'. Order by location_id.",
      solution: `SELECT location_id, SUM(total_amount) AS billed, CASE WHEN SUM(total_amount) >= 2000 THEN 'High' ELSE 'Standard' END AS tier FROM invoices GROUP BY location_id ORDER BY location_id;`,
      hints: ['Group invoices by location_id.', 'SUM(total_amount) is the total.', 'The tier CASE must test the aggregate, SUM(total_amount), not the column.', "CASE WHEN SUM(total_amount) >= 2000 THEN 'High' ELSE 'Standard' END"],
      ordered: true,
    },
    quiz: [
      { q: "CASE WHEN x < 100 THEN 'A' WHEN x < 50 THEN 'B' END. Which label does x = 30 get?", options: ['A', 'B', 'Both', 'NULL'], answer: 0, why: 'The first true branch wins, and 30 < 100.' },
      { q: 'To label each location as High/Normal by its total, the CASE must use...', options: ['total_amount', 'SUM(total_amount)', 'location_id', 'COUNT(DISTINCT total_amount)'], answer: 1, why: 'A label for the group must look at the group result.' },
    ],
  },

  // ─────────────────────────────────────────────── 12 FILTER
  {
    id: 'aggregates-12',
    goals: ['Use the standard FILTER (WHERE ...) clause on aggregates', 'Compare FILTER with CASE-based conditional aggregation', 'Know which databases support FILTER', 'Combine several FILTERed aggregates in one query'],
    concept: `<p><code>FILTER</code> is the SQL-standard, cleaner way to write conditional aggregation. Instead of hiding the condition inside a CASE, you attach it to the aggregate:</p>
<p><code>COUNT(*) FILTER (WHERE status = 'Overdue')</code></p>
<p>Read it as "count, but only the rows where status is Overdue". Each aggregate can have its own filter, and the rows that fail the filter are simply not fed to that aggregate.</p>
<p>SQLite (3.30+) and PostgreSQL support it. MySQL, SQL Server and Oracle do not, so there you use <code>SUM(CASE ...)</code>.</p>`,
    why: 'CASE-inside-aggregate works but is noisy and easy to get wrong (ELSE 0 with COUNT). FILTER states the intent directly.',
    when: 'Use FILTER whenever your database supports it and you need several conditional counts or sums side by side.',
    analogy: 'Instead of every clerk writing "only if Paid, else zero" on each slip, each counter at the desk has a sign: "I only count Paid slips". Slips that do not match simply walk past.',
    exampleSql: `SELECT invoice_id, location_id, status, total_amount FROM invoices WHERE invoice_id <= 12`,
    syntax: `SELECT group_col,\n       AGG(expr) FILTER (WHERE condition) AS name\nFROM table\nGROUP BY group_col;`,
    sql: `SELECT location_id,\n       COUNT(*)                                        AS invoices,\n       COUNT(*) FILTER (WHERE status = 'Overdue')      AS overdue,\n       SUM(total_amount) FILTER (WHERE status = 'Paid') AS paid_amount,\n       ROUND(AVG(total_amount) FILTER (WHERE status <> 'Void'), 2) AS avg_real_invoice\nFROM invoices\nGROUP BY location_id\nORDER BY location_id;`,
    breakdown: [
      ['COUNT(*)', 'All invoices of the location (no filter).'],
      ["COUNT(*) FILTER (WHERE status = 'Overdue')", 'Counts only overdue rows.'],
      ["SUM(total_amount) FILTER (WHERE status = 'Paid')", 'Sums only paid rows. If none match, the result is NULL (like any SUM of nothing).'],
      ["AVG(...) FILTER (WHERE status <> 'Void')", 'Averages only real invoices.'],
    ],
    visual: { type: 'flow', steps: [['Read row: invoice 9, location 1, Overdue, 150', 'one row at a time'], ["COUNT(*) → +1", 'no filter: every row counts'], ["COUNT(*) FILTER (status='Overdue') → +1", 'condition true: row fed in'], ["SUM(total) FILTER (status='Paid') → skip", 'condition false: row not fed in'], ['End of group', 'each aggregate returns its own result'] ] },
    internals: `<p>FILTER is evaluated per aggregate, per row: the engine tests the condition and only calls the aggregate's step function if it is true. It is essentially the same work as the CASE version, so performance is identical; the gain is readability and correctness (no ELSE 0 vs NULL confusion).</p>`,
    mistakes: [
      { wrong: `SELECT location_id, COUNT(*) WHERE status = 'Paid' FROM invoices GROUP BY location_id;`, why: 'The filter must be attached to the aggregate with FILTER ( ... ) and parentheses.', fix: `SELECT location_id, COUNT(*) FILTER (WHERE status = 'Paid') AS paid FROM invoices GROUP BY location_id;` },
      { wrong: `SELECT SUM(total_amount) FILTER (WHERE status = 'Paid') AS paid FROM invoices WHERE location_id = 6;`, why: 'Location 6 has no invoices, so the filtered SUM is NULL. Wrap in COALESCE if the report needs 0.', fix: `SELECT COALESCE(SUM(total_amount) FILTER (WHERE status = 'Paid'), 0) AS paid FROM invoices WHERE location_id = 6;` },
    ],
    rules: ['FILTER (WHERE ...) goes right after the aggregate.', 'Each aggregate can have its own filter.', 'FILTER on SUM/AVG still returns NULL when nothing matches.', 'Not in MySQL / SQL Server / Oracle: use SUM(CASE ...).'],
    compare: `<table><tr><th>Database</th><th>FILTER</th><th>Portable form</th></tr>
<tr><td>PostgreSQL, SQLite</td><td>yes</td><td rowspan="2"><code>SUM(CASE WHEN c THEN x ELSE 0 END)</code><br><code>COUNT(CASE WHEN c THEN 1 END)</code></td></tr>
<tr><td>MySQL, SQL Server, Oracle</td><td>no</td></tr></table>`,
    dialectSql: {
      sqlite: `SELECT location_id,\n       COUNT(*) FILTER (WHERE status = 'Overdue') AS overdue\nFROM invoices GROUP BY location_id;`,
      postgres: `SELECT location_id,\n       COUNT(*) FILTER (WHERE status = 'Overdue') AS overdue\nFROM invoices GROUP BY location_id;`,
      mysql: `SELECT location_id,\n       SUM(status = 'Overdue') AS overdue   -- boolean is 0/1 in MySQL\nFROM invoices GROUP BY location_id;`,
      sqlserver: `SELECT location_id,\n       COUNT(CASE WHEN status = 'Overdue' THEN 1 END) AS overdue\nFROM invoices GROUP BY location_id;`,
      oracle: `SELECT location_id,\n       COUNT(CASE WHEN status = 'Overdue' THEN 1 END) AS overdue\nFROM invoices GROUP BY location_id;`,
    },
    realWorld: 'Revenue-cycle KPI queries in PostgreSQL-based warehouses (claims submitted, denied, paid per payor per month) are often written with FILTER for readability.',
    tips: ['FILTER also works with window aggregates in PostgreSQL and SQLite: SUM(x) FILTER (WHERE ...) OVER (...).'],
    deep: `<p>FILTER is part of SQL:2003 (feature T612). It also combines with ordered-set and DISTINCT aggregates: <code>COUNT(DISTINCT patient_id) FILTER (WHERE status = 'Overdue')</code> counts patients who have at least one overdue invoice, something the CASE version handles only with a NULL trick.</p>`,
    tryIt: { prompt: 'Per payment method, count payments made by insurers and payments made by patients using FILTER.', starter: `SELECT method,\n       COUNT(*) FILTER (WHERE payor_id IS NOT NULL) AS by_insurer\nFROM payments\nGROUP BY method;` },
    challenge: {
      level: 3,
      prompt: 'For each invoice_id in transactions, show the total of CHARGE amounts and the total of PAYMENT amounts (as stored, negative) using FILTER. Only invoices 1 to 5, ordered by invoice_id.',
      solution: `SELECT invoice_id, SUM(amount) FILTER (WHERE transaction_type = 'CHARGE') AS charged, SUM(amount) FILTER (WHERE transaction_type = 'PAYMENT') AS paid FROM transactions WHERE invoice_id BETWEEN 1 AND 5 GROUP BY invoice_id ORDER BY invoice_id;`,
      hints: ['Filter rows to invoices 1..5 with WHERE, then GROUP BY invoice_id.', 'Two SUM(amount) aggregates, each with its own FILTER.', "FILTER (WHERE transaction_type = 'CHARGE') and FILTER (WHERE transaction_type = 'PAYMENT').", 'ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: "COUNT(*) FILTER (WHERE status='Paid') is equivalent to...", options: ["COUNT(CASE WHEN status='Paid' THEN 1 END)", "COUNT(CASE WHEN status='Paid' THEN 1 ELSE 0 END)", "SUM(status='Paid') only in SQL Server", "COUNT(status)"], answer: 0, why: 'Non-matching rows become NULL and are not counted, exactly like FILTER.' },
      { q: 'Which database does NOT support FILTER?', options: ['PostgreSQL', 'SQLite', 'SQL Server', 'None of them'], answer: 2, why: 'SQL Server (and MySQL, Oracle) need the CASE form.' },
    ],
  },

  // ─────────────────────────────────────────────── 13 String aggregation
  {
    id: 'aggregates-13',
    goals: ['Join many values of a group into one string', 'Control the separator and order', 'Use DISTINCT inside string aggregation', 'Know the name of the function in each database'],
    concept: `<p>A <b>string aggregate</b> glues the values of a group into <b>one text value</b>, like <code>'97140, 97161, 97140'</code>.</p>
<p>In SQLite it is <code>group_concat(value, separator)</code> (also available as <code>string_agg</code> since 3.44). You can sort the pieces with <code>ORDER BY</code> inside the call: <code>group_concat(cpt_code, ', ' ORDER BY charge_id)</code>.</p>
<p>Without an inner ORDER BY, the order of the pieces is <b>not guaranteed</b>.</p>`,
    why: 'People want to read lists, not rows: "codes billed on this invoice", "payment methods this patient used". String aggregation makes a compact, human-friendly column.',
    when: 'Use it for display: summaries, exports, email bodies, debugging. Avoid it when the result will be parsed again by code (keep rows instead).',
    analogy: 'A superbill (the visit summary a doctor fills in) lists all the procedure codes of a visit on one line. string aggregation writes that one line from many charge rows.',
    exampleSql: `SELECT charge_id, invoice_id, cpt_code, description FROM charges WHERE invoice_id <= 6`,
    syntax: `-- SQLite\ngroup_concat(expr [, separator] [ORDER BY ...])\nstring_agg(expr, separator [ORDER BY ...])      -- SQLite 3.44+\ngroup_concat(DISTINCT expr)                        -- DISTINCT: only default ',' separator`,
    sql: `SELECT invoice_id,\n       COUNT(*)                                        AS lines,\n       group_concat(cpt_code, ', ' ORDER BY charge_id) AS cpt_codes,\n       SUM(amount)                                     AS total\nFROM charges\nWHERE invoice_id <= 8\nGROUP BY invoice_id\nORDER BY invoice_id;`,
    breakdown: [
      ['WHERE invoice_id <= 8', 'A small slice of charges to keep the output short.'],
      ['GROUP BY invoice_id', 'One output row per invoice.'],
      ["group_concat(cpt_code, ', ' ORDER BY charge_id)", 'Glue the CPT codes of the invoice with ", " in charge order.'],
      ['COUNT(*), SUM(amount)', 'Normal aggregates can sit next to the string aggregate.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 560 190" width="100%"><g font-family="monospace" font-size="13"><text x="10" y="20" fill="var(--muted)">charges (invoice 4)</text><rect x="10" y="30" width="200" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="18" y="48" fill="var(--text)">4 | 97140 | 50</text><rect x="10" y="60" width="200" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="18" y="78" fill="var(--text)">4 | 97140 | 100</text><rect x="10" y="90" width="200" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="18" y="108" fill="var(--text)">4 | 97161 | 130</text><rect x="10" y="120" width="200" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="18" y="138" fill="var(--text)">4 | 97140 | 100</text><path d="M215 88 L300 88" stroke="var(--accent)" stroke-width="2"/><polygon points="300,82 312,88 300,94" fill="var(--accent)"/><text x="228" y="78" fill="var(--accent)">group_concat</text><rect x="318" y="72" width="235" height="32" fill="var(--panel2)" stroke="var(--green)"/><text x="326" y="93" fill="var(--text)">4 | 97140, 97140, 97161, 97140</text><text x="318" y="130" fill="var(--muted)">4 rows in, 1 text value out</text></g></svg>` },
    internals: `<p>The accumulator is a growing text buffer. For each row, the engine appends the separator (except before the first piece) and the value. With an inner ORDER BY, the engine must first collect and sort the group's values, then concatenate. Memory grows with the total string length; MySQL even truncates at <code>group_concat_max_len</code> (1024 bytes by default!) without an error, just a warning.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, group_concat(cpt_code) FROM charges GROUP BY invoice_id;`, why: 'No inner ORDER BY: the order of codes can change between runs or versions, which breaks tests and diffs.', fix: `SELECT invoice_id, group_concat(cpt_code, ',' ORDER BY charge_id) AS codes FROM charges GROUP BY invoice_id;` },
      { wrong: `SELECT invoice_id, group_concat(DISTINCT cpt_code, ', ') FROM charges GROUP BY invoice_id;`, why: 'SQLite only allows DISTINCT with a single argument (the default comma separator).', fix: `SELECT invoice_id, group_concat(DISTINCT cpt_code) AS codes FROM charges GROUP BY invoice_id;` },
    ],
    rules: ['Always add ORDER BY inside the call if order matters.', 'NULL values are skipped.', 'Use it for display, not for data you will parse back.', 'Function names differ per database.'],
    compare: `<table><tr><th>Database</th><th>Function</th></tr>
<tr><td>SQLite</td><td><code>group_concat(x, sep)</code> / <code>string_agg(x, sep)</code></td></tr>
<tr><td>PostgreSQL</td><td><code>string_agg(x, sep ORDER BY ...)</code></td></tr>
<tr><td>MySQL</td><td><code>GROUP_CONCAT(x ORDER BY ... SEPARATOR sep)</code></td></tr>
<tr><td>SQL Server 2017+</td><td><code>STRING_AGG(x, sep) WITHIN GROUP (ORDER BY ...)</code></td></tr>
<tr><td>Oracle</td><td><code>LISTAGG(x, sep) WITHIN GROUP (ORDER BY ...)</code></td></tr></table>`,
    dialectSql: {
      sqlite: `SELECT invoice_id, group_concat(cpt_code, ', ' ORDER BY charge_id) AS codes\nFROM charges GROUP BY invoice_id;`,
      postgres: `SELECT invoice_id, string_agg(cpt_code, ', ' ORDER BY charge_id) AS codes\nFROM charges GROUP BY invoice_id;`,
      mysql: `SELECT invoice_id, GROUP_CONCAT(cpt_code ORDER BY charge_id SEPARATOR ', ') AS codes\nFROM charges GROUP BY invoice_id;`,
      sqlserver: `SELECT invoice_id, STRING_AGG(cpt_code, ', ') WITHIN GROUP (ORDER BY charge_id) AS codes\nFROM charges GROUP BY invoice_id;`,
      oracle: `SELECT invoice_id, LISTAGG(cpt_code, ', ') WITHIN GROUP (ORDER BY charge_id) AS codes\nFROM charges GROUP BY invoice_id;`,
    },
    realWorld: 'Claim summaries listing CPT codes per claim, "payment methods used" per patient, allergy lists on patient wristbands, CSV-style exports for other systems.',
    tips: ['To remove duplicates AND pick a separator in SQLite, aggregate from a DISTINCT subquery: SELECT group_concat(c, \'; \') FROM (SELECT DISTINCT cpt_code AS c FROM ...).'],
    deep: `<p>The opposite operation (string to rows) is a "split": PostgreSQL has <code>string_to_table</code>/<code>unnest(string_to_array())</code>, SQL Server has <code>STRING_SPLIT</code>, SQLite needs <code>json_each</code> or a recursive CTE. Storing comma lists in a column breaks first normal form; aggregate them only on output.</p>`,
    tryIt: { prompt: 'For each invoice with payments, list the payment methods used in payment order, separated by " + ".', starter: `SELECT invoice_id,\n       group_concat(method, ' + ' ORDER BY payment_date) AS methods\nFROM payments\nGROUP BY invoice_id\nORDER BY invoice_id\nLIMIT 10;` },
    challenge: {
      level: 3,
      prompt: 'For each invoice that has 4 or more charges, show invoice_id, the number of charges, and its CPT codes joined with "," in charge_id order. Order by invoice_id.',
      solution: `SELECT invoice_id, COUNT(*) AS n, group_concat(cpt_code, ',' ORDER BY charge_id) AS codes FROM charges GROUP BY invoice_id HAVING COUNT(*) >= 4 ORDER BY invoice_id;`,
      hints: ['Group charges by invoice_id.', 'Keep only groups with 4+ rows using HAVING.', "Use group_concat(cpt_code, ',' ORDER BY charge_id).", 'ORDER BY invoice_id at the end.'],
      ordered: true,
    },
    quiz: [
      { q: 'What is the Oracle name for string aggregation?', options: ['STRING_AGG', 'GROUP_CONCAT', 'LISTAGG', 'CONCAT_WS'], answer: 2, why: 'Oracle uses LISTAGG(x, sep) WITHIN GROUP (ORDER BY ...).' },
      { q: 'Without ORDER BY inside group_concat, the order of pieces is...', options: ['Alphabetical', 'By primary key', 'Not guaranteed', 'Reverse insertion order'], answer: 2, why: 'It depends on the plan; never rely on it.' },
    ],
  },

  // ─────────────────────────────────────────────── 14 Statistical functions
  {
    id: 'aggregates-14',
    goals: ['What variance and standard deviation measure', 'Compute them in SQLite, which has no STDDEV', 'Population vs sample variance', 'A simple median in SQL'],
    concept: `<p>An average alone hides how <b>spread out</b> the values are. Two clinics can both average $200 per invoice, one with all bills near $200 and one with bills from $15 to $700.</p>
<ul>
<li><b>Variance</b> = the average of the squared distances from the mean.</li>
<li><b>Standard deviation</b> = the square root of the variance, back in dollars.</li>
</ul>
<p>SQLite has no <code>STDDEV</code> or <code>VARIANCE</code>, but we can build them from plain aggregates:</p>
<p><code>variance = AVG(x*x) - AVG(x)*AVG(x)</code> (population), and <code>stddev = sqrt(variance)</code>. For a <b>sample</b>, multiply the population variance by <code>n / (n - 1)</code>.</p>`,
    why: 'Spread tells you how predictable something is: steady payors vs erratic ones, consistent pricing vs outliers that may be billing errors.',
    when: 'Use variance / stddev to detect outliers (values more than 2-3 stddev from the mean), compare consistency across groups, and describe distributions.',
    analogy: 'Two insurers both pay $100 on average. One always pays $95 to $105; the other pays $10 one day and $300 the next. The standard deviation is the number that tells the finance team which one they can plan around.',
    exampleSql: `SELECT payment_id, method, amount FROM payments WHERE payment_id <= 14`,
    syntax: `-- population variance and standard deviation (SQLite)\nSELECT AVG(x*x) - AVG(x)*AVG(x)        AS var_pop,\n       sqrt(AVG(x*x) - AVG(x)*AVG(x))  AS stddev_pop\nFROM t;\n-- sample: var_pop * COUNT(x) / (COUNT(x) - 1.0)`,
    sql: `SELECT method,\n       COUNT(*)                                          AS n,\n       ROUND(AVG(amount), 2)                             AS mean,\n       ROUND(AVG(amount*amount) - AVG(amount)*AVG(amount), 2)        AS var_pop,\n       ROUND(sqrt(AVG(amount*amount) - AVG(amount)*AVG(amount)), 2)  AS stddev_pop,\n       ROUND(sqrt((AVG(amount*amount) - AVG(amount)*AVG(amount)) * COUNT(*) / (COUNT(*) - 1.0)), 2) AS stddev_samp\nFROM payments\nGROUP BY method\nORDER BY stddev_pop DESC;`,
    breakdown: [
      ['GROUP BY method', 'One statistics row per payment method.'],
      ['AVG(amount*amount) - AVG(amount)*AVG(amount)', 'Population variance: mean of squares minus square of the mean.'],
      ['sqrt(...)', 'Standard deviation, in dollars. (SQLite math functions include sqrt.)'],
      ['* COUNT(*) / (COUNT(*) - 1.0)', "Bessel's correction: turns the population variance into the sample variance."],
      ['ORDER BY stddev_pop DESC', 'Most unpredictable method first.'],
    ],
    visual: { type: 'groupby', source: `SELECT payment_id, method, amount FROM payments WHERE payment_id <= 14`, group: 'method', value: 'amount', agg: 'AVG' },
    internals: `<p>Databases with built-in STDDEV (PostgreSQL <code>stddev_samp</code>, SQL Server <code>STDEV</code>, MySQL <code>STDDEV_POP</code>) use a numerically stable one-pass algorithm (Welford's), keeping count, mean and a running "M2" sum. The <code>AVG(x²) - AVG(x)²</code> shortcut is exact mathematically, but with large values and tiny spread it can suffer floating-point cancellation, even going slightly negative. The safer two-pass version subtracts the mean first: <code>AVG((x - mean) * (x - mean))</code>, using a CTE for the mean.</p>`,
    mistakes: [
      { wrong: `SELECT STDDEV(amount) FROM payments;`, why: 'SQLite has no STDDEV function ("no such function").', fix: `SELECT sqrt(AVG(amount*amount) - AVG(amount)*AVG(amount)) AS stddev_pop FROM payments;` },
      { wrong: `SELECT (AVG(amount*amount) - AVG(amount)*AVG(amount)) * COUNT(*) / (COUNT(*) - 1) FROM payments;`, why: 'Fine here, but a group with a single row gives division by zero (NULL in SQLite, an error elsewhere). Sample variance of 1 value is undefined.', fix: `SELECT CASE WHEN COUNT(*) > 1 THEN (AVG(amount*amount) - AVG(amount)*AVG(amount)) * COUNT(*) / (COUNT(*) - 1.0) END AS var_samp FROM payments;` },
    ],
    rules: ['Variance = AVG(x²) - AVG(x)²; stddev = sqrt(variance).', 'Sample variance divides by n - 1 instead of n.', 'Standard deviation is in the same unit as the data.', 'Median needs ordering, not a simple accumulator.'],
    compare: `<table><tr><th>Statistic</th><th>PostgreSQL</th><th>SQL Server</th><th>SQLite</th></tr>
<tr><td>Sample stddev</td><td><code>stddev_samp</code></td><td><code>STDEV</code></td><td>manual</td></tr>
<tr><td>Population stddev</td><td><code>stddev_pop</code></td><td><code>STDEVP</code></td><td>manual</td></tr>
<tr><td>Median</td><td><code>percentile_cont(0.5) WITHIN GROUP</code></td><td><code>PERCENTILE_CONT</code> (window)</td><td>manual (ORDER BY + LIMIT/OFFSET)</td></tr></table>`,
    dialectSql: {
      sqlite: `SELECT sqrt(AVG(amount*amount) - AVG(amount)*AVG(amount)) AS stddev_pop FROM payments;`,
      postgres: `SELECT stddev_pop(amount), stddev_samp(amount),\n       percentile_cont(0.5) WITHIN GROUP (ORDER BY amount) AS median\nFROM payments;`,
      mysql: `SELECT STDDEV_POP(amount), STDDEV_SAMP(amount) FROM payments;`,
      sqlserver: `SELECT STDEVP(amount), STDEV(amount) FROM payments;`,
      oracle: `SELECT STDDEV_POP(amount), STDDEV_SAMP(amount), MEDIAN(amount) FROM payments;`,
    },
    realWorld: 'Payment integrity teams flag charges more than 3 standard deviations above the mean for a CPT code; payor analytics compare the stddev of days-to-pay to judge reliability.',
    tips: ['A z-score (x - mean) / stddev tells you how unusual a single value is. |z| > 3 is a common outlier rule.'],
    deep: `<p>Median in SQLite: order the values and take the middle one or two. With a window function: <code>ROW_NUMBER() OVER (ORDER BY x)</code> and <code>COUNT(*) OVER ()</code>, keep rows where <code>rn IN ((n+1)/2, (n+2)/2)</code>, then AVG them. That works for both odd and even n.</p>`,
    tryIt: { prompt: 'Compute the median payment amount. The CTE numbers the payments in amount order; keep the middle one or two and average them.', starter: `WITH ordered AS (\n  SELECT amount,\n         ROW_NUMBER() OVER (ORDER BY amount) AS rn,\n         COUNT(*) OVER () AS n\n  FROM payments\n)\nSELECT AVG(amount) AS median_payment\nFROM ordered\nWHERE rn IN ((n + 1) / 2, (n + 2) / 2);` },
    challenge: {
      level: 4,
      prompt: 'For each cpt_code billed at least 5 times, show the code, the count, the average amount (2 decimals) and the population standard deviation of amount (2 decimals). Order by the standard deviation descending, then cpt_code.',
      solution: `SELECT cpt_code, COUNT(*) AS n, ROUND(AVG(amount), 2) AS mean, ROUND(sqrt(AVG(amount*amount) - AVG(amount)*AVG(amount)), 2) AS sd FROM charges GROUP BY cpt_code HAVING COUNT(*) >= 5 ORDER BY sd DESC, cpt_code;`,
      hints: ['Group charges by cpt_code and keep groups with HAVING COUNT(*) >= 5.', 'Variance = AVG(amount*amount) - AVG(amount)*AVG(amount).', 'Standard deviation = sqrt(variance); round to 2 decimals.', 'ORDER BY sd DESC, cpt_code.'],
      ordered: true,
    },
    quiz: [
      { q: 'Values 10, 10, 10. What is the standard deviation?', options: ['10', '0', '3.33', 'NULL'], answer: 1, why: 'No value differs from the mean, so the spread is 0.' },
      { q: 'Sample variance divides the sum of squared deviations by...', options: ['n', 'n - 1', 'n + 1', 'n²'], answer: 1, why: "Bessel's correction: n - 1 for samples." },
      { q: 'Why does SQLite need the manual formula?', options: ['STDDEV is slow', 'SQLite has no STDDEV function', 'STDDEV ignores NULLs', 'It does not; STDDEV exists'], answer: 1, why: 'Core SQLite has no statistical aggregates beyond COUNT/SUM/AVG/MIN/MAX/TOTAL/group_concat.' },
    ],
  },

  // ─────────────────────────────────────────────── 15 DISTINCT vs ALL
  {
    id: 'aggregates-15',
    goals: ['What ALL (the default) and DISTINCT mean inside an aggregate', 'Why SUM(DISTINCT x) is usually a bug', 'Counting unique entities with COUNT(DISTINCT)', 'The cost of DISTINCT aggregates'],
    concept: `<p>Every aggregate has a hidden word: <code>ALL</code>. <code>COUNT(payor_id)</code> really means <code>COUNT(ALL payor_id)</code>: use all non-NULL values, duplicates included.</p>
<p>Writing <code>DISTINCT</code> instead removes duplicate values <b>first</b>, then aggregates:</p>
<ul>
<li><code>COUNT(DISTINCT patient_id)</code> on invoices: how many different patients were billed.</li>
<li><code>SUM(DISTINCT amount)</code>: adds each different amount once. Two separate $50 payments count as one $50, which is almost always <b>wrong</b> for money.</li>
</ul>`,
    why: 'Counting unique things (patients, payors, codes) is extremely common, and COUNT(DISTINCT) does it directly. Knowing that SUM(DISTINCT) de-duplicates values, not rows, prevents silent money errors.',
    when: 'Use COUNT(DISTINCT) for "how many different ...". Use SUM/AVG with the default ALL for money. Use DISTINCT on SUM only when duplicate values truly are the same fact.',
    analogy: 'A receptionist counts the day\'s appointment slips (ALL) versus the number of different patients seen (DISTINCT). A patient who came twice is 2 slips but 1 patient.',
    exampleSql: `SELECT invoice_id, patient_id, payor_id, total_amount FROM invoices WHERE invoice_id <= 14`,
    syntax: `AGG([ALL] expr)      -- default: every non-NULL value\nAGG(DISTINCT expr)   -- each different value once`,
    sql: `SELECT COUNT(*)                   AS invoices,\n       COUNT(ALL patient_id)      AS patient_refs,\n       COUNT(DISTINCT patient_id) AS distinct_patients,\n       SUM(total_amount)          AS billed,\n       SUM(DISTINCT total_amount) AS sum_of_distinct_totals\nFROM invoices;`,
    breakdown: [
      ['COUNT(ALL patient_id)', 'Same as COUNT(patient_id): 48 references to patients.'],
      ['COUNT(DISTINCT patient_id)', 'Different patients who have at least one invoice.'],
      ['SUM(total_amount)', 'The true total billed.'],
      ['SUM(DISTINCT total_amount)', 'Adds each different total once. Several invoices are exactly $165 or $95, so this is much smaller and meaningless as revenue.'],
    ],
    visual: { type: 'groupby', source: `SELECT invoice_id, patient_id, total_amount FROM invoices WHERE invoice_id <= 14`, group: 'patient_id', value: 'total_amount', agg: 'COUNT' },
    internals: `<p>A DISTINCT aggregate cannot use a simple running counter: it must remember every value seen in the group, usually in a temporary B-tree or hash set per group, and only add a value if it is new. That is why <code>COUNT(DISTINCT x)</code> is much more expensive than <code>COUNT(x)</code> on large tables. Big-data engines offer approximations like <code>APPROX_COUNT_DISTINCT</code> (HyperLogLog) that use a few KB instead.</p>`,
    mistakes: [
      { wrong: `SELECT SUM(DISTINCT amount) AS collected FROM payments;`, why: 'Two different payments of the same amount are counted once, so collected money is under-reported.', fix: `SELECT SUM(amount) AS collected FROM payments;` },
      { wrong: `SELECT DISTINCT COUNT(patient_id) FROM invoices;`, why: 'DISTINCT outside the function de-duplicates the result rows (there is only one), not the values. You still get 48.', fix: `SELECT COUNT(DISTINCT patient_id) FROM invoices;` },
      { wrong: `SELECT COUNT(DISTINCT patient_id, payor_id) FROM invoices;`, why: 'SQLite and PostgreSQL allow only one argument to COUNT(DISTINCT ...).', fix: `SELECT COUNT(*) FROM (SELECT DISTINCT patient_id, payor_id FROM invoices);` },
    ],
    rules: ['ALL is the default and is almost never written.', 'DISTINCT goes inside the parentheses.', 'COUNT(DISTINCT) = number of different non-NULL values.', 'Be very suspicious of SUM(DISTINCT) and AVG(DISTINCT) on money.'],
    compare: `<table><tr><th>Expression</th><th>Values 50, 50, 80, NULL</th></tr>
<tr><td><code>COUNT(ALL x)</code></td><td>3</td></tr>
<tr><td><code>COUNT(DISTINCT x)</code></td><td>2</td></tr>
<tr><td><code>SUM(ALL x)</code></td><td>180</td></tr>
<tr><td><code>SUM(DISTINCT x)</code></td><td>130</td></tr>
<tr><td><code>SELECT DISTINCT x</code></td><td>rows 50, 80, NULL</td></tr></table>`,
    realWorld: '"Unique patients seen this month" (COUNT DISTINCT patient_id) vs "visits" (COUNT(*)), a core pair of metrics in every practice-management report.',
    tips: ['MIN(DISTINCT x) and MAX(DISTINCT x) are legal but pointless: duplicates cannot change a min or max.'],
    deep: `<p>The <code>SUM(DISTINCT)</code> trap often appears when a JOIN multiplies rows (invoice × its charges) and someone "fixes" the inflated sum with DISTINCT. The real fix is to aggregate each table before joining (pre-aggregation), so every invoice appears once. DISTINCT only hides the fan-out, and breaks as soon as two invoices share a total.</p>`,
    tryIt: { prompt: 'For each location, count invoices and the number of distinct patients. Which location has patients with repeat visits?', starter: `SELECT location_id,\n       COUNT(*) AS invoices,\n       COUNT(DISTINCT patient_id) AS patients\nFROM invoices\nGROUP BY location_id;` },
    challenge: {
      level: 2,
      prompt: 'For each practitioner_id in charges, show the number of charge lines, the number of distinct invoices and the number of distinct CPT codes. Order by practitioner_id.',
      solution: `SELECT practitioner_id, COUNT(*) AS lines, COUNT(DISTINCT invoice_id) AS invoices, COUNT(DISTINCT cpt_code) AS codes FROM charges GROUP BY practitioner_id ORDER BY practitioner_id;`,
      hints: ['Group charges by practitioner_id.', 'COUNT(*) counts lines.', 'COUNT(DISTINCT invoice_id) and COUNT(DISTINCT cpt_code) count unique values.', 'ORDER BY practitioner_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Payments of 50, 50 and 80. SUM(DISTINCT amount) is...', options: ['180', '130', '80', '2'], answer: 1, why: 'Each different value once: 50 + 80.' },
      { q: 'COUNT(x) is shorthand for...', options: ['COUNT(DISTINCT x)', 'COUNT(ALL x)', 'COUNT(*)', 'COUNT(x IS NOT NULL)'], answer: 1, why: 'ALL is the default quantifier.' },
    ],
  },

  // ─────────────────────────────────────────────── 16 ROLLUP
  {
    id: 'aggregates-16',
    goals: ['What ROLLUP adds to GROUP BY: subtotals and a grand total', 'How to read the NULLs in ROLLUP output', 'Using GROUPING() to label total rows', 'Emulating ROLLUP in SQLite with UNION ALL'],
    concept: `<p><code>GROUP BY ROLLUP(location_id, status)</code> produces the normal groups <b>plus</b> extra summary rows, going up a hierarchy from right to left:</p>
<ul>
<li>(location_id, status): the detail rows</li>
<li>(location_id): a <b>subtotal</b> per location, with status shown as NULL</li>
<li>(): the <b>grand total</b>, with both columns NULL</li>
</ul>
<p>It is like the subtotal lines in an accounting report. SQLite does <b>not</b> support ROLLUP, so the example below is PostgreSQL; in the Try It you will build the same result with <code>UNION ALL</code>.</p>`,
    why: 'Reports need subtotals and totals. Without ROLLUP you would run several queries and stitch them together, or compute totals in the application.',
    when: 'Use ROLLUP for hierarchical totals: location → status, year → month → day, payor type → payor.',
    analogy: 'A month-end billing report: lines per clinic and status, then a "Clinic total" line under each clinic, and a "Grand total" at the bottom. ROLLUP writes those total lines for you.',
    exampleSql: `SELECT location_id, status, COUNT(*) AS n, SUM(total_amount) AS billed FROM invoices GROUP BY location_id, status ORDER BY location_id, status`,
    syntax: `SELECT a, b, AGG(x)\nFROM t\nGROUP BY ROLLUP (a, b);        -- (a,b), (a), ()\n-- MySQL: GROUP BY a, b WITH ROLLUP`,
    dialect: 'postgres',
    sql: `SELECT location_id,\n       status,\n       SUM(total_amount)   AS billed,\n       GROUPING(location_id, status) AS level\nFROM invoices\nGROUP BY ROLLUP (location_id, status)\nORDER BY location_id NULLS LAST, status NULLS LAST;`,
    breakdown: [
      ['GROUP BY ROLLUP (location_id, status)', 'Grouping sets (location_id, status), (location_id) and ().'],
      ['SUM(total_amount) AS billed', 'Computed for every one of those grouping levels.'],
      ['GROUPING(location_id, status) AS level', 'A bit mask: 0 = detail row, 1 = location subtotal (status rolled up), 3 = grand total.'],
      ['ORDER BY ... NULLS LAST', 'Put subtotal rows after their details and the grand total at the end.'],
    ],
    dialectSql: {
      postgres: `SELECT location_id, status, SUM(total_amount) AS billed\nFROM invoices\nGROUP BY ROLLUP (location_id, status);`,
      mysql: `SELECT location_id, status, SUM(total_amount) AS billed\nFROM invoices\nGROUP BY location_id, status WITH ROLLUP;`,
      sqlserver: `SELECT location_id, status, SUM(total_amount) AS billed\nFROM invoices\nGROUP BY ROLLUP (location_id, status);`,
      oracle: `SELECT location_id, status, SUM(total_amount) AS billed\nFROM invoices\nGROUP BY ROLLUP (location_id, status);`,
      sqlite: `-- no ROLLUP: emulate with UNION ALL\nSELECT location_id, status, SUM(total_amount) FROM invoices GROUP BY location_id, status\nUNION ALL\nSELECT location_id, NULL, SUM(total_amount) FROM invoices GROUP BY location_id\nUNION ALL\nSELECT NULL, NULL, SUM(total_amount) FROM invoices;`,
    },
    visual: { type: 'flow', steps: [['GROUP BY (location_id, status)', 'detail rows: one per location + status'], ['GROUP BY (location_id)', 'subtotal per location, status = NULL'], ['GROUP BY ()', 'grand total, both = NULL'], ['Combine all three levels', 'one result set, like UNION ALL'] ] },
    internals: `<p>Engines compute ROLLUP in <b>one pass</b>: they sort by (location_id, status) and keep accumulators for every level at once. When status changes they emit a detail row; when location_id changes they also emit the location subtotal; at the end they emit the grand total. The UNION ALL emulation scans the table once per level (3 scans), so ROLLUP is cheaper on big tables.</p>`,
    mistakes: [
      { wrong: `SELECT location_id, status, SUM(total_amount) FROM invoices GROUP BY ROLLUP (location_id, status);`, why: 'Runs on PostgreSQL/SQL Server/Oracle, but SQLite reports a syntax error: ROLLUP is not supported.', fix: `SELECT location_id, status, SUM(total_amount) FROM invoices GROUP BY location_id, status\nUNION ALL SELECT location_id, NULL, SUM(total_amount) FROM invoices GROUP BY location_id\nUNION ALL SELECT NULL, NULL, SUM(total_amount) FROM invoices;` },
      { wrong: `SELECT COALESCE(status, 'Total') ... GROUP BY ROLLUP (location_id, status)`, why: 'If status itself could be NULL in the data, the label "Total" would also be put on real NULL-status groups. GROUPING(status) = 1 is the reliable test.', fix: `SELECT CASE WHEN GROUPING(status) = 1 THEN 'Total' ELSE status END ... GROUP BY ROLLUP (location_id, status)` },
    ],
    rules: ['ROLLUP(a, b) = grouping sets (a,b), (a), ().', 'Column order matters: it defines the hierarchy.', 'NULL in a rolled-up column means "all values".', 'Use GROUPING() to tell subtotal NULLs from data NULLs.', 'SQLite: emulate with UNION ALL.'],
    compare: `<table><tr><th>Clause</th><th>Grouping sets for (a, b)</th></tr>
<tr><td><code>GROUP BY a, b</code></td><td>(a,b)</td></tr>
<tr><td><code>ROLLUP(a, b)</code></td><td>(a,b), (a), ()</td></tr>
<tr><td><code>CUBE(a, b)</code></td><td>(a,b), (a), (b), ()</td></tr>
<tr><td><code>GROUPING SETS((a),(b))</code></td><td>exactly what you list</td></tr></table>`,
    realWorld: 'Finance and A/R reports with subtotals by clinic, department and month; Excel-style pivot tables with "Grand Total" rows exported from SQL Server.',
    tips: ['SQLite accepts only result columns (not expressions) in the ORDER BY of a UNION. Wrap the emulation in SELECT * FROM (...) and then sort by location_id IS NULL, location_id, status IS NULL, status to put totals after details.'],
    deep: `<p>ROLLUP of n columns produces n + 1 grouping sets. <code>GROUPING_ID()</code> (SQL Server, Oracle) or multi-argument <code>GROUPING(a, b)</code> (PostgreSQL) returns a bit mask where bit = 1 means that column was rolled up; it is handy for ORDER BY and for filtering only some levels with HAVING.</p>`,
    tryIt: { prompt: 'This UNION ALL emulates ROLLUP(location_id, status) in SQLite. Run it, then add a label column that says Detail / Subtotal / Grand total.', starter: `SELECT * FROM (\n  SELECT location_id, status, SUM(total_amount) AS billed\n  FROM invoices GROUP BY location_id, status\n  UNION ALL\n  SELECT location_id, NULL, SUM(total_amount)\n  FROM invoices GROUP BY location_id\n  UNION ALL\n  SELECT NULL, NULL, SUM(total_amount)\n  FROM invoices\n)\nORDER BY location_id IS NULL, location_id, status IS NULL, status;` },
    challenge: {
      level: 3,
      prompt: 'Emulate ROLLUP(payor_type) on payors: show each payor_type with its number of payors, then a last row with NULL payor_type and the total count. Order by payor_type with the total last.',
      solution: `SELECT * FROM (SELECT payor_type, COUNT(*) AS payors FROM payors GROUP BY payor_type UNION ALL SELECT NULL, COUNT(*) FROM payors) ORDER BY payor_type IS NULL, payor_type;`,
      hints: ['You need two levels: per payor_type, and the grand total.', 'Write both as SELECTs with the same number of columns and join them with UNION ALL.', 'The grand-total branch uses NULL for payor_type.', 'SQLite only allows plain result columns in the ORDER BY of a UNION, so wrap it: SELECT * FROM (...) ORDER BY payor_type IS NULL, payor_type.'],
      ordered: true,
    },
    quiz: [
      { q: 'ROLLUP(year, month) produces which grouping sets?', options: ['(year, month) only', '(year, month), (year), ()', '(year, month), (month), (year), ()', '(month), ()'], answer: 1, why: 'ROLLUP walks the hierarchy from right to left.' },
      { q: 'How do you reliably detect a subtotal row?', options: ['column IS NULL', 'GROUPING(column) = 1', 'COUNT(*) > 1', 'ORDER BY'], answer: 1, why: 'Real data can contain NULLs too; GROUPING() tells them apart.' },
    ],
  },

  // ─────────────────────────────────────────────── 17 CUBE
  {
    id: 'aggregates-17',
    goals: ['What CUBE adds: totals for every combination of columns', 'The difference between CUBE and ROLLUP', 'How many rows CUBE creates', 'Emulating CUBE in SQLite'],
    concept: `<p><code>CUBE(a, b)</code> creates subtotals for <b>every combination</b> of the listed columns, not just a hierarchy:</p>
<ul>
<li>(a, b): detail</li><li>(a): totals per a</li><li>(b): totals per b</li><li>(): grand total</li>
</ul>
<p>With n columns, CUBE makes 2<sup>n</sup> grouping sets. ROLLUP only makes n + 1 because it follows one path. SQLite has no CUBE; the example is PostgreSQL, and the Try It emulates it with UNION ALL.</p>`,
    why: 'Cross-tab reports need totals on both axes: per location, per status, and overall. CUBE gives all margins at once.',
    when: 'Use CUBE when there is no natural hierarchy between the columns and you want totals in every direction, like a pivot table with row and column totals.',
    analogy: 'A spreadsheet with clinics as rows and statuses as columns. You want the row totals on the right, the column totals at the bottom, and the grand total in the corner. CUBE computes all of them.',
    exampleSql: `SELECT location_id, status, COUNT(*) AS n FROM invoices GROUP BY location_id, status ORDER BY location_id, status`,
    syntax: `SELECT a, b, AGG(x)\nFROM t\nGROUP BY CUBE (a, b);   -- (a,b), (a), (b), ()`,
    dialect: 'postgres',
    sql: `SELECT location_id,\n       status,\n       COUNT(*)          AS invoices,\n       SUM(total_amount) AS billed\nFROM invoices\nGROUP BY CUBE (location_id, status)\nORDER BY GROUPING(location_id), location_id, GROUPING(status), status;`,
    breakdown: [
      ['GROUP BY CUBE (location_id, status)', 'Four grouping sets: (location_id, status), (location_id), (status), ().'],
      ['COUNT(*), SUM(total_amount)', 'Computed for each set.'],
      ['ORDER BY GROUPING(location_id), ...', 'Detail and per-location rows first, then per-status totals, grand total last.'],
    ],
    dialectSql: {
      postgres: `SELECT location_id, status, SUM(total_amount)\nFROM invoices\nGROUP BY CUBE (location_id, status);`,
      sqlserver: `SELECT location_id, status, SUM(total_amount)\nFROM invoices\nGROUP BY CUBE (location_id, status);`,
      oracle: `SELECT location_id, status, SUM(total_amount)\nFROM invoices\nGROUP BY CUBE (location_id, status);`,
      mysql: `-- MySQL has only WITH ROLLUP (no CUBE): use UNION ALL\nSELECT location_id, status, SUM(total_amount) FROM invoices GROUP BY location_id, status WITH ROLLUP\nUNION ALL\nSELECT NULL, status, SUM(total_amount) FROM invoices GROUP BY status;`,
      sqlite: `SELECT location_id, status, SUM(total_amount) FROM invoices GROUP BY location_id, status\nUNION ALL SELECT location_id, NULL, SUM(total_amount) FROM invoices GROUP BY location_id\nUNION ALL SELECT NULL, status, SUM(total_amount) FROM invoices GROUP BY status\nUNION ALL SELECT NULL, NULL, SUM(total_amount) FROM invoices;`,
    },
    visual: { type: 'flow', steps: [['(location_id, status)', 'detail cells of the cross-tab'], ['(location_id)', 'row totals: per location'], ['(status)', 'column totals: per status'], ['()', 'grand total in the corner'], ['2 columns → 2² = 4 grouping sets', 'CUBE grows exponentially'] ] },
    internals: `<p>A naive CUBE runs one aggregation per grouping set. Smart engines compute the finest level (a, b) first and then derive coarser levels from it (for example, the per-status totals by re-aggregating the (a, b) results), because summing a few summary rows is much cheaper than rescanning the table. This only works for "re-aggregatable" functions: SUM and COUNT yes, COUNT(DISTINCT) no.</p>`,
    mistakes: [
      { wrong: `SELECT location_id, status, SUM(total_amount) FROM invoices GROUP BY CUBE (location_id, status, payor_id, patient_id);`, why: 'Four columns = 16 grouping sets, most of them useless and huge. CUBE grows as 2^n.', fix: `SELECT location_id, status, SUM(total_amount) FROM invoices GROUP BY CUBE (location_id, status);` },
      { wrong: `-- SQLite\nSELECT location_id, status, SUM(total_amount) FROM invoices GROUP BY CUBE (location_id, status);`, why: 'SQLite does not know CUBE. Build each grouping set as its own SELECT and UNION ALL them.', fix: `SELECT location_id, status, SUM(total_amount) FROM invoices GROUP BY location_id, status\nUNION ALL SELECT location_id, NULL, SUM(total_amount) FROM invoices GROUP BY location_id\nUNION ALL SELECT NULL, status, SUM(total_amount) FROM invoices GROUP BY status\nUNION ALL SELECT NULL, NULL, SUM(total_amount) FROM invoices;` },
    ],
    rules: ['CUBE(n columns) = 2^n grouping sets.', 'ROLLUP follows a hierarchy; CUBE covers all combinations.', 'Column order in CUBE does not change which sets are produced.', 'Keep CUBE to 2-3 columns.'],
    compare: `<table><tr><th>Columns</th><th>ROLLUP sets</th><th>CUBE sets</th></tr>
<tr><td>1</td><td>2</td><td>2</td></tr><tr><td>2</td><td>3</td><td>4</td></tr><tr><td>3</td><td>4</td><td>8</td></tr><tr><td>4</td><td>5</td><td>16</td></tr></table>`,
    realWorld: 'OLAP-style cross-tabs: revenue by payor × location with all margins, feeding BI tools that let managers slice either way.',
    tips: ['If you only need some of the CUBE sets, GROUPING SETS (next lesson) is more precise and cheaper.'],
    deep: `<p>The term comes from OLAP "data cubes": each GROUP BY column is a dimension, and CUBE materialises every "face" and "edge" of the cube (all aggregated projections). Pre-computed cubes were the heart of 1990s-2000s BI servers (SSAS, Essbase); columnar engines now compute them on the fly.</p>`,
    tryIt: { prompt: 'This emulates CUBE(payor_type, is_active) on payors in SQLite. Run it and find the row totals, column totals and grand total.', starter: `SELECT payor_type, is_active, COUNT(*) AS payors FROM payors GROUP BY payor_type, is_active\nUNION ALL\nSELECT payor_type, NULL, COUNT(*) FROM payors GROUP BY payor_type\nUNION ALL\nSELECT NULL, is_active, COUNT(*) FROM payors GROUP BY is_active\nUNION ALL\nSELECT NULL, NULL, COUNT(*) FROM payors;` },
    challenge: {
      level: 4,
      prompt: 'Emulate CUBE(method, patient_paid) on payments, where patient_paid is 1 if payor_id IS NULL else 0. Return method, patient_paid and SUM(amount) for all four grouping sets. Order by method IS NULL, method, patient_paid IS NULL, patient_paid.',
      solution: `WITH p AS (SELECT method, CASE WHEN payor_id IS NULL THEN 1 ELSE 0 END AS patient_paid, amount FROM payments)\nSELECT * FROM (\n  SELECT method, patient_paid, SUM(amount) AS total FROM p GROUP BY method, patient_paid\n  UNION ALL SELECT method, NULL, SUM(amount) FROM p GROUP BY method\n  UNION ALL SELECT NULL, patient_paid, SUM(amount) FROM p GROUP BY patient_paid\n  UNION ALL SELECT NULL, NULL, SUM(amount) FROM p\n)\nORDER BY method IS NULL, method, patient_paid IS NULL, patient_paid;`,
      hints: ['First make a CTE with method, a patient_paid flag (CASE) and amount.', 'CUBE of 2 columns = 4 SELECTs: (method, flag), (method), (flag), ().', 'Use NULL for the rolled-up column in each branch and glue them with UNION ALL.', 'Wrap the UNION ALL in SELECT * FROM (...) so the outer ORDER BY may use expressions like method IS NULL.'],
      ordered: true,
    },
    quiz: [
      { q: 'How many grouping sets does CUBE(a, b, c) produce?', options: ['3', '4', '8', '6'], answer: 2, why: '2³ = 8.' },
      { q: 'Which set does CUBE(a, b) have that ROLLUP(a, b) does not?', options: ['(a, b)', '(a)', '(b)', '()'], answer: 2, why: 'ROLLUP never drops the first column while keeping the second.' },
    ],
  },

  // ─────────────────────────────────────────────── 18 GROUPING SETS
  {
    id: 'aggregates-18',
    goals: ['List exactly the grouping levels you want with GROUPING SETS', 'See ROLLUP and CUBE as shorthands for GROUPING SETS', 'Combine independent summaries in one result', 'Emulate GROUPING SETS in SQLite'],
    concept: `<p><code>GROUPING SETS</code> is the general tool: you write down <b>exactly which groupings</b> you want, and the database returns all of them stacked in one result.</p>
<p><code>GROUP BY GROUPING SETS ((location_id), (status), ())</code> gives totals per location, totals per status, and a grand total, but <b>no</b> location × status detail.</p>
<p>ROLLUP and CUBE are just shortcuts: <code>ROLLUP(a,b)</code> = <code>GROUPING SETS ((a,b),(a),())</code>. The logical meaning is always the same as a UNION ALL of separate GROUP BY queries, which is exactly how we emulate it in SQLite.</p>`,
    why: 'Dashboards often need several unrelated summaries at once. GROUPING SETS gets them in one statement and (on engines that support it) one scan.',
    when: 'Use it when you need specific summary levels that are not a simple hierarchy (ROLLUP) or all combinations (CUBE).',
    analogy: 'The billing manager asks for three small tables in one handout: "totals by clinic", "totals by status", and "the overall total". GROUPING SETS prints exactly those, nothing more.',
    exampleSql: `SELECT invoice_id, location_id, status, total_amount FROM invoices WHERE invoice_id <= 10`,
    syntax: `SELECT a, b, AGG(x)\nFROM t\nGROUP BY GROUPING SETS ((a, b), (a), (b), ());\n-- ROLLUP(a,b) = GROUPING SETS ((a,b),(a),())\n-- CUBE(a,b)   = GROUPING SETS ((a,b),(a),(b),())`,
    dialect: 'postgres',
    sql: `SELECT location_id,\n       status,\n       COUNT(*)          AS invoices,\n       SUM(total_amount) AS billed\nFROM invoices\nGROUP BY GROUPING SETS ((location_id), (status), ())\nORDER BY GROUPING(location_id) DESC, location_id, status;`,
    breakdown: [
      ['GROUPING SETS ((location_id), (status), ())', 'Three separate summaries: by location, by status, and the grand total.'],
      ['COUNT(*), SUM(total_amount)', 'Computed for each set.'],
      ['location_id / status', 'In the per-location rows, status is NULL; in the per-status rows, location_id is NULL.'],
    ],
    dialectSql: {
      postgres: `SELECT location_id, status, SUM(total_amount)\nFROM invoices\nGROUP BY GROUPING SETS ((location_id), (status), ());`,
      sqlserver: `SELECT location_id, status, SUM(total_amount)\nFROM invoices\nGROUP BY GROUPING SETS ((location_id), (status), ());`,
      oracle: `SELECT location_id, status, SUM(total_amount)\nFROM invoices\nGROUP BY GROUPING SETS ((location_id), (status), ());`,
      mysql: `-- no GROUPING SETS: UNION ALL\nSELECT location_id, NULL AS status, SUM(total_amount) FROM invoices GROUP BY location_id\nUNION ALL SELECT NULL, status, SUM(total_amount) FROM invoices GROUP BY status\nUNION ALL SELECT NULL, NULL, SUM(total_amount) FROM invoices;`,
      sqlite: `SELECT location_id, NULL AS status, SUM(total_amount) FROM invoices GROUP BY location_id\nUNION ALL SELECT NULL, status, SUM(total_amount) FROM invoices GROUP BY status\nUNION ALL SELECT NULL, NULL, SUM(total_amount) FROM invoices;`,
    },
    visual: { type: 'flow', steps: [['GROUPING SETS ((location_id), (status), ())', 'you list the levels'], ['Set 1: GROUP BY location_id', '5 rows, status = NULL'], ['Set 2: GROUP BY status', '5 rows, location_id = NULL'], ['Set 3: GROUP BY ()', '1 grand-total row'], ['Stack the results', 'same as UNION ALL of the three'] ] },
    internals: `<p>PostgreSQL plans GROUPING SETS with "MixedAggregate" or several sort passes: sets that are prefixes of one sort order (like ROLLUP) share one sort; unrelated sets need another sort or a hash table each. Still, the base table is read <b>once</b>, whereas the UNION ALL emulation reads it once per branch.</p>`,
    mistakes: [
      { wrong: `GROUP BY GROUPING SETS (location_id, status)`, why: 'Without inner parentheses this means two single-column sets (location_id) and (status), with no grand total. Always be explicit.', fix: `GROUP BY GROUPING SETS ((location_id), (status), ())` },
      { wrong: `SELECT location_id, SUM(total_amount) FROM invoices GROUP BY location_id\nUNION\nSELECT NULL, SUM(total_amount) FROM invoices;`, why: 'UNION (without ALL) would remove any rows that happen to be identical. Grouping-set emulation must use UNION ALL.', fix: `SELECT location_id, SUM(total_amount) FROM invoices GROUP BY location_id\nUNION ALL\nSELECT NULL, SUM(total_amount) FROM invoices;` },
    ],
    rules: ['GROUPING SETS lists the exact levels you want.', '() is the grand total.', 'ROLLUP and CUBE are shorthands for GROUPING SETS.', 'Emulation: one GROUP BY per set, joined with UNION ALL.'],
    compare: `<table><tr><th>Need</th><th>Use</th></tr>
<tr><td>Hierarchical subtotals</td><td>ROLLUP</td></tr>
<tr><td>Every combination</td><td>CUBE</td></tr>
<tr><td>A hand-picked list</td><td>GROUPING SETS</td></tr>
<tr><td>SQLite / MySQL</td><td>UNION ALL of GROUP BYs</td></tr></table>`,
    realWorld: 'A single BI extract that feeds several dashboard tiles (revenue by clinic, by payor, by month, overall) in one query.',
    tips: ['Add a "level" text column (\'location\', \'status\', \'total\') in each emulation branch so consumers can filter easily.'],
    deep: `<p>Grouping sets can be combined: <code>GROUP BY a, ROLLUP(b, c)</code> is the cross product of the set {(a)} with {(b,c),(b),()} = (a,b,c), (a,b), (a). Oracle and PostgreSQL also allow concatenated GROUPING SETS clauses, which multiply out the same way.</p>`,
    tryIt: { prompt: 'Emulate GROUPING SETS ((location_id), (status), ()) in SQLite. Add a level column so you know which set each row came from.', starter: `SELECT 'location' AS level, location_id, NULL AS status, SUM(total_amount) AS billed\nFROM invoices GROUP BY location_id\nUNION ALL\nSELECT 'status', NULL, status, SUM(total_amount)\nFROM invoices GROUP BY status\nUNION ALL\nSELECT 'total', NULL, NULL, SUM(total_amount)\nFROM invoices;` },
    challenge: {
      level: 3,
      prompt: "Emulate GROUPING SETS ((method), ()) on payments with a label column: return 'method' or 'total' as level, the method (NULL for the total) and the SUM(amount). Put the method rows first (sorted by method) and the total last.",
      solution: `SELECT 'method' AS level, method, SUM(amount) AS total FROM payments GROUP BY method UNION ALL SELECT 'total', NULL, SUM(amount) FROM payments ORDER BY level, method;`,
      hints: ['Two branches: one GROUP BY method, one with no GROUP BY.', "Give both a constant label column: 'method' and 'total'.", 'Use NULL for method in the total branch and UNION ALL the two.', "ORDER BY level, method works, because 'method' sorts before 'total'."],
      ordered: true,
    },
    quiz: [
      { q: 'ROLLUP(a, b) equals...', options: ['GROUPING SETS ((a,b),(a),())', 'GROUPING SETS ((a),(b))', 'GROUPING SETS ((a,b),(a),(b),())', 'GROUPING SETS (())'], answer: 0, why: 'ROLLUP is the hierarchy (a,b) → (a) → ().' },
      { q: 'Why must the emulation use UNION ALL, not UNION?', options: ['UNION is slower only', 'UNION might remove identical summary rows', 'UNION needs ORDER BY', 'UNION does not allow NULL'], answer: 1, why: 'Grouping sets keep every row; UNION de-duplicates.' },
    ],
  },

  // ─────────────────────────────────────────────── 19 Aggregates vs Window Functions
  {
    id: 'aggregates-19',
    goals: ['The key difference: GROUP BY collapses rows, window functions keep them', 'Use SUM(...) OVER (PARTITION BY ...) to show a group total next to each row', 'Running totals with ORDER BY inside OVER', 'When to choose each tool'],
    concept: `<p>A normal aggregate with GROUP BY <b>collapses</b> each group into one row. You lose the details.</p>
<p>A <b>window function</b> uses the same aggregate (<code>SUM</code>, <code>COUNT</code>, <code>AVG</code>...) but adds <code>OVER (...)</code>. It computes the value over a "window" of related rows and <b>keeps every row</b>. Each invoice keeps its own line and also gets its location's total next to it.</p>
<ul>
<li><code>SUM(total_amount) OVER (PARTITION BY location_id)</code>: the location total on every row.</li>
<li><code>SUM(total_amount) OVER (PARTITION BY location_id ORDER BY invoice_id)</code>: a <b>running</b> total within the location.</li>
</ul>`,
    why: 'Many questions need both detail and summary at once: "each invoice and its share of the clinic total", "each payment and the running balance". GROUP BY alone cannot do that without a join back.',
    when: 'Use GROUP BY when you want one row per group. Use window functions when you want every row plus a group-level or running value.',
    analogy: 'GROUP BY is the summary sheet on top of each clinic\'s folder: one line per clinic. A window function is writing the clinic total in the margin of every invoice inside the folder, without removing any invoice.',
    exampleSql: `SELECT invoice_id, location_id, total_amount FROM invoices WHERE invoice_id <= 14 ORDER BY location_id, invoice_id`,
    syntax: `-- aggregate: one row per group\nSELECT g, SUM(x) FROM t GROUP BY g;\n\n-- window: every row, plus a value over its window\nSELECT g, x,\n       SUM(x) OVER (PARTITION BY g)            AS group_total,\n       SUM(x) OVER (PARTITION BY g ORDER BY k) AS running_total\nFROM t;`,
    sql: `SELECT invoice_id,\n       location_id,\n       total_amount,\n       SUM(total_amount) OVER (PARTITION BY location_id)                     AS location_total,\n       SUM(total_amount) OVER (PARTITION BY location_id ORDER BY invoice_id) AS running_total,\n       ROUND(100.0 * total_amount / SUM(total_amount) OVER (PARTITION BY location_id), 1) AS pct_of_location\nFROM invoices\nWHERE invoice_id <= 14\nORDER BY location_id, invoice_id;`,
    breakdown: [
      ['WHERE invoice_id <= 14', 'A small slice so every partition is easy to follow.'],
      ['SUM(total_amount) OVER (PARTITION BY location_id)', 'The total of the row\'s location, repeated on each of its rows. No rows disappear.'],
      ['... OVER (PARTITION BY location_id ORDER BY invoice_id)', 'Adding ORDER BY makes the window grow row by row: a running total.'],
      ['100.0 * total_amount / SUM(...) OVER (...)', 'Mix row values with window values: each invoice\'s share of its location.'],
    ],
    visual: { type: 'window', source: `SELECT invoice_id, location_id, total_amount FROM invoices WHERE invoice_id <= 14 ORDER BY location_id, invoice_id`, partition: 'location_id', order: 'invoice_id', value: 'total_amount', fn: 'RUNNING_SUM' },
    internals: `<p>Window functions run <b>after</b> WHERE, GROUP BY and HAVING, just before ORDER BY. The engine sorts the rows by (partition, order) keys, then walks each partition, maintaining the aggregate over the current frame. For <code>OVER (PARTITION BY g)</code> the frame is the whole partition; with ORDER BY the default frame is "start of partition to current row", which gives running totals. So window functions can even be applied <b>on top of</b> a GROUP BY result, for example <code>SUM(SUM(x)) OVER ()</code> for a grand total next to each group.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, location_id, SUM(total_amount) FROM invoices GROUP BY location_id;`, why: 'GROUP BY collapses rows, so invoice_id is ambiguous (error in most databases, random in SQLite).', fix: `SELECT invoice_id, location_id, SUM(total_amount) OVER (PARTITION BY location_id) AS location_total FROM invoices;` },
      { wrong: `SELECT invoice_id FROM invoices WHERE total_amount > AVG(total_amount) OVER ();`, why: 'Window functions are computed after WHERE, so they cannot be used in WHERE.', fix: `SELECT invoice_id FROM (SELECT invoice_id, total_amount, AVG(total_amount) OVER () AS avg_all FROM invoices) WHERE total_amount > avg_all;` },
    ],
    rules: ['GROUP BY: one row per group. OVER: one row per input row.', 'PARTITION BY is like GROUP BY for windows, without collapsing.', 'ORDER BY inside OVER turns a total into a running total.', 'Window functions cannot appear in WHERE or GROUP BY; wrap in a subquery/CTE.'],
    compare: `<table><tr><th></th><th>GROUP BY + aggregate</th><th>Aggregate OVER (...)</th></tr>
<tr><td>Rows out</td><td>one per group</td><td>same as rows in</td></tr>
<tr><td>Detail columns</td><td>lost</td><td>kept</td></tr>
<tr><td>Grouping clause</td><td>GROUP BY</td><td>PARTITION BY</td></tr>
<tr><td>Running totals</td><td>no</td><td>yes (ORDER BY in OVER)</td></tr>
<tr><td>Evaluated</td><td>before SELECT</td><td>in SELECT, after HAVING</td></tr></table>`,
    realWorld: 'Patient statements with a running balance column, "percent of clinic revenue" per invoice, ranking practitioners within each location, month-over-month change with LAG.',
    tips: ['If you find yourself joining a GROUP BY result back to the detail table, a window function is probably simpler.'],
    deep: `<p>You can combine both in one query: <code>SELECT location_id, SUM(total_amount) AS billed, SUM(SUM(total_amount)) OVER () AS grand_total FROM invoices GROUP BY location_id</code>. The inner SUM is the group aggregate, the outer SUM ... OVER () is a window over the grouped rows. This is the idiomatic "share of total" query.</p>`,
    tryIt: { prompt: 'Show each payment with the running total of payments for its invoice (ordered by payment_date) and the invoice\'s total paid.', starter: `SELECT payment_id, invoice_id, payment_date, amount,\n       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY payment_date, payment_id) AS running_paid,\n       SUM(amount) OVER (PARTITION BY invoice_id) AS invoice_paid\nFROM payments\nWHERE invoice_id <= 16\nORDER BY invoice_id, payment_date;` },
    challenge: {
      level: 3,
      prompt: 'For each location, show location_id, its total billed, and its share of all billing in percent (1 decimal). Use GROUP BY plus a window over the grouped rows. Order by location_id.',
      solution: `SELECT location_id, SUM(total_amount) AS billed, ROUND(100.0 * SUM(total_amount) / SUM(SUM(total_amount)) OVER (), 1) AS pct FROM invoices GROUP BY location_id ORDER BY location_id;`,
      hints: ['Start with GROUP BY location_id and SUM(total_amount).', 'The grand total over all groups is a window: SUM(SUM(total_amount)) OVER ().', 'Divide with 100.0 * ... and ROUND(..., 1).', 'ORDER BY location_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'invoices has 48 rows. How many rows does SELECT SUM(total_amount) OVER (PARTITION BY location_id) FROM invoices return?', options: ['5', '48', '1', '6'], answer: 1, why: 'Window functions keep every row.' },
      { q: 'What does ORDER BY inside OVER() do to SUM?', options: ['Sorts the output', 'Makes it a running total', 'Nothing', 'Removes duplicates'], answer: 1, why: 'The default frame becomes "from the start of the partition to the current row".' },
    ],
  },
]);
