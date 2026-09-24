// Real-world SQL projects: multi-step capstones on the Healthcare Billing database.
Lessons.add([
  // ---------------------------------------------------------------- P01
  {
    id: 'projects-01',
    goals: [
      'Turn a vague request ("a revenue dashboard") into precise metrics',
      'Build billed, collected and net collections per month from three tables',
      'Fill missing months with a calendar and add MoM change and YTD totals',
      'Assemble the dashboard query step by step with CTEs',
    ],
    concept: `<p><b>Business question:</b> the practice manager wants one monthly table: how much did we <b>bill</b>, how much did we <b>collect</b>, what is the collection ratio, how did billing change versus last month, and what is the year-to-date total?</p>
<p><b>Definitions</b> (always agree on these first):</p>
<ul>
<li><b>Billed</b> = sum of <code>invoices.total_amount</code> by <code>invoice_date</code> month, excluding Void.</li>
<li><b>Collected</b> = net cash from the ledger: PAYMENT (negative) and REFUND (positive) entries, sign flipped, by <code>transaction_date</code> month. Using the ledger means the refunded duplicate payment is not counted twice.</li>
<li><b>Collection ratio</b> = collected / billed for the month (a rough cash measure; cash lags billing).</li>
</ul>
<p><b>Step 1: a calendar</b> so months with no activity still appear.</p>
<pre>WITH RECURSIVE months(m) AS (
  SELECT '2025-02-01'
  UNION ALL SELECT date(m, '+1 month') FROM months WHERE m &lt; '2026-08-01'
)</pre>
<p><b>Step 2: billed per month.</b></p>
<pre>billed AS (
  SELECT strftime('%Y-%m', invoice_date) AS ym, SUM(total_amount) AS billed
  FROM invoices WHERE status &lt;&gt; 'Void' GROUP BY ym
)</pre>
<p><b>Step 3: collected per month</b> from the ledger.</p>
<pre>collected AS (
  SELECT strftime('%Y-%m', transaction_date) AS ym, -SUM(amount) AS collected
  FROM transactions WHERE transaction_type IN ('PAYMENT', 'REFUND') GROUP BY ym
)</pre>
<p><b>Step 4: join everything to the calendar</b> (LEFT JOINs + COALESCE), then add window metrics: <code>LAG</code> for MoM change and a year-partitioned running <code>SUM</code> for YTD.</p>`,
    why: 'Every practice runs on a monthly revenue view. Building it in SQL makes the numbers reproducible and auditable instead of living in a hand-edited spreadsheet.',
    when: 'Use this pattern for any monthly KPI table that combines several fact tables with different date columns.',
    analogy: 'A monthly bank statement for the practice: money invoiced in, cash actually received, and the running total for the year.',
    exampleTables: ['invoices', 'transactions'],
    exampleSql: `SELECT strftime('%Y-%m', invoice_date) AS month, COUNT(*) AS invoices, SUM(total_amount) AS billed FROM invoices WHERE status <> 'Void' GROUP BY month ORDER BY month`,
    syntax: `WITH RECURSIVE months AS (...), billed AS (...), collected AS (...)
SELECT month, billed, collected, ratio, LAG(...) OVER (...), SUM(...) OVER (PARTITION BY year ORDER BY month)
FROM months LEFT JOIN billed ... LEFT JOIN collected ...;`,
    sql: `WITH RECURSIVE months(m) AS (
  SELECT '2025-02-01'
  UNION ALL SELECT date(m, '+1 month') FROM months WHERE m < '2026-08-01'
),
billed AS (
  SELECT strftime('%Y-%m', invoice_date) AS ym, SUM(total_amount) AS billed
  FROM invoices WHERE status <> 'Void'
  GROUP BY ym
),
collected AS (
  SELECT strftime('%Y-%m', transaction_date) AS ym, -SUM(amount) AS collected
  FROM transactions WHERE transaction_type IN ('PAYMENT', 'REFUND')
  GROUP BY ym
),
monthly AS (
  SELECT strftime('%Y-%m', months.m) AS month,
         COALESCE(b.billed, 0)    AS billed,
         COALESCE(c.collected, 0) AS collected
  FROM months
  LEFT JOIN billed b    ON b.ym = strftime('%Y-%m', months.m)
  LEFT JOIN collected c ON c.ym = strftime('%Y-%m', months.m)
)
SELECT month, billed, collected,
       ROUND(100.0 * collected / NULLIF(billed, 0), 1)                  AS collection_pct,
       billed - LAG(billed) OVER (ORDER BY month)                       AS billed_mom_change,
       SUM(billed) OVER (PARTITION BY substr(month, 1, 4) ORDER BY month)    AS billed_ytd,
       SUM(collected) OVER (PARTITION BY substr(month, 1, 4) ORDER BY month) AS collected_ytd
FROM monthly
ORDER BY month;`,
    breakdown: [
      ['months', 'Calendar: every month from 2025-02 to 2026-08.'],
      ['billed', 'Invoice totals by invoice month, Void excluded.'],
      ['collected', 'Net cash by ledger month: payments minus refunds (sign flipped to positive).'],
      ['monthly', 'LEFT JOIN both facts to the calendar; COALESCE empty months to 0.'],
      ['NULLIF(billed, 0)', 'Avoids division by zero in months with no billing (ratio becomes NULL).'],
      ['LAG / SUM OVER (PARTITION BY year)', 'Month-over-month change and year-to-date running totals.'],
    ],
    visual: { type: 'er', tables: ['invoices', 'transactions', 'payments'] },
    mistakes: [
      { wrong: `SELECT strftime('%Y-%m', i.invoice_date) AS month, SUM(i.total_amount) AS billed, SUM(p.amount) AS collected
FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.invoice_id
GROUP BY month;`, why: 'Joining invoices to payments repeats each invoice once per payment, so billed is inflated. It also puts cash in the invoice month instead of the month it arrived.', fix: `SELECT strftime('%Y-%m', invoice_date) AS month, SUM(total_amount) AS billed
FROM invoices WHERE status <> 'Void' GROUP BY month;` },
    ],
    rules: [
      'Write down metric definitions before writing SQL.',
      'Aggregate each fact table separately, then join the summaries.',
      'Always drive time reports from a calendar.',
      'Use NULLIF(denominator, 0) for ratios.',
    ],
    compare: `<table><tr><th>Metric</th><th>Source</th><th>Date column</th></tr>
<tr><td>Billed</td><td>invoices</td><td>invoice_date</td></tr>
<tr><td>Gross charges</td><td>charges / CHARGE transactions</td><td>service_date / transaction_date</td></tr>
<tr><td>Collected (cash)</td><td>PAYMENT + REFUND transactions</td><td>transaction_date</td></tr></table>`,
    realWorld: 'This is the first page of a practice\'s monthly financial pack and the query behind most revenue dashboards in BI tools.',
    deep: `<p>In production, save the <code>monthly</code> CTE as a view or a summary table refreshed nightly; BI tools then read the small table. Watch out for the "cash lags billing" effect: June 2026 billing is collected in July and August, so a single month's collection ratio can exceed 100%.</p>`,
    tryIt: {
      prompt: 'Add an invoice count column to the billed CTE and show it in the dashboard.',
      starter: `WITH billed AS (
  SELECT strftime('%Y-%m', invoice_date) AS ym, COUNT(*) AS invoices, SUM(total_amount) AS billed
  FROM invoices WHERE status <> 'Void' GROUP BY ym
)
SELECT ym, invoices, billed, ROUND(billed * 1.0 / invoices, 2) AS avg_invoice
FROM billed ORDER BY ym;`,
    },
    challenge: {
      level: 4,
      prompt: 'Deliverable: a 2026 dashboard for January through August (every month, even with no activity). Return month (YYYY-MM), billed (non-void invoice totals by invoice month), collected (net of PAYMENT and REFUND ledger entries by transaction month, as a positive number) and collection % rounded to 1 (NULL when nothing was billed). Order by month.',
      solution: `WITH RECURSIVE months(m) AS (
  SELECT '2026-01-01'
  UNION ALL SELECT date(m, '+1 month') FROM months WHERE m < '2026-08-01'
),
billed AS (
  SELECT strftime('%Y-%m', invoice_date) AS ym, SUM(total_amount) AS billed
  FROM invoices WHERE status <> 'Void' GROUP BY ym
),
collected AS (
  SELECT strftime('%Y-%m', transaction_date) AS ym, -SUM(amount) AS collected
  FROM transactions WHERE transaction_type IN ('PAYMENT', 'REFUND') GROUP BY ym
)
SELECT strftime('%Y-%m', months.m) AS month,
       COALESCE(b.billed, 0) AS billed,
       COALESCE(c.collected, 0) AS collected,
       ROUND(100.0 * COALESCE(c.collected, 0) / NULLIF(COALESCE(b.billed, 0), 0), 1) AS collection_pct
FROM months
LEFT JOIN billed b ON b.ym = strftime('%Y-%m', months.m)
LEFT JOIN collected c ON c.ym = strftime('%Y-%m', months.m)
ORDER BY month;`,
      hints: [
        'Generate the months 2026-01 .. 2026-08 with a recursive CTE.',
        'Summarize billed (invoices) and collected (transactions of type PAYMENT or REFUND, -SUM(amount)) in separate CTEs keyed by YYYY-MM.',
        'LEFT JOIN both to the calendar and COALESCE missing values to 0.',
        'collection % = ROUND(100.0 * collected / NULLIF(billed, 0), 1); ORDER BY month.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why aggregate invoices and transactions in separate CTEs before joining?', options: ['CTEs are faster', 'Joining raw fact tables multiplies rows and inflates sums', 'SQLite requires it', 'To sort months'], answer: 1, why: 'Summarize first, then join one row per month to one row per month.' },
      { q: 'Why use the ledger (PAYMENT + REFUND) for collections instead of the payments table?', options: ['It is smaller', 'The ledger includes the refund that reverses the duplicate payment', 'payments has no dates', 'No reason'], answer: 1, why: 'The payments table still contains the double-posted payment 47; the ledger nets it out.' },
    ],
  },

  // ---------------------------------------------------------------- P02
  {
    id: 'projects-02',
    goals: [
      'Build an accounts-receivable (A/R) aging report as of a fixed date',
      'Compute each invoice\'s open balance from the ledger',
      'Assign aging buckets with CASE on days past due',
      'Summarize buckets with a custom sort order and % of total',
    ],
    concept: `<p><b>Business question:</b> "How much money is owed to us, and how old is it?" Older debt is harder to collect, so A/R is split into <b>aging buckets</b> by days past the due date, as of <b>2026-09-01</b>.</p>
<p><b>Step 1: open balance per invoice</b> from the ledger (it includes payments, the adjustment, the write-off and the refund).</p>
<pre>WITH balances AS (
  SELECT invoice_id, ROUND(SUM(amount), 2) AS balance
  FROM transactions
  WHERE transaction_date &lt;= '2026-09-01'
  GROUP BY invoice_id
)</pre>
<p><b>Step 2: days past due</b> for invoices that still owe money.</p>
<pre>aged AS (
  SELECT i.invoice_id, b.balance,
         CAST(julianday('2026-09-01') - julianday(i.due_date) AS INTEGER) AS days_past_due
  FROM invoices i JOIN balances b ON b.invoice_id = i.invoice_id
  WHERE b.balance &gt; 0
)</pre>
<p><b>Step 3: bucket</b> with CASE: negative days = <i>Current</i> (not yet due), then 0-30, 31-60, 61-90, 90+.</p>
<p><b>Step 4: summarize</b> per bucket with count, balance and share of total, sorted in bucket order (not alphabetically).</p>`,
    why: 'Aging is the standard tool for managing cash flow and prioritizing collections. Auditors and lenders ask for it.',
    when: 'Run it at month end, before collection calls, and when estimating bad-debt reserves.',
    analogy: 'Sorting the unpaid-bills tray into folders: "due soon", "a month late", "two months late", "hopeless unless we chase hard".',
    exampleTables: ['invoices', 'transactions'],
    exampleSql: `SELECT invoice_id, status, due_date, total_amount FROM invoices WHERE status IN ('Open','Overdue','Partially Paid') ORDER BY due_date`,
    syntax: `WITH balances AS (...), aged AS (...)
SELECT CASE WHEN days < 0 THEN 'Current' WHEN days <= 30 THEN '0-30' ... END AS bucket,
       COUNT(*), SUM(balance)
FROM aged GROUP BY bucket ORDER BY <bucket order>;`,
    sql: `WITH balances AS (
  SELECT invoice_id, ROUND(SUM(amount), 2) AS balance
  FROM transactions
  WHERE transaction_date <= '2026-09-01'
  GROUP BY invoice_id
),
aged AS (
  SELECT i.invoice_id, b.balance,
         CAST(julianday('2026-09-01') - julianday(i.due_date) AS INTEGER) AS days_past_due
  FROM invoices i
  JOIN balances b ON b.invoice_id = i.invoice_id
  WHERE b.balance > 0
),
bucketed AS (
  SELECT *,
         CASE WHEN days_past_due < 0   THEN 'Current'
              WHEN days_past_due <= 30 THEN '0-30'
              WHEN days_past_due <= 60 THEN '31-60'
              WHEN days_past_due <= 90 THEN '61-90'
              ELSE '90+' END AS bucket,
         CASE WHEN days_past_due < 0   THEN 0
              WHEN days_past_due <= 30 THEN 1
              WHEN days_past_due <= 60 THEN 2
              WHEN days_past_due <= 90 THEN 3
              ELSE 4 END AS bucket_order
  FROM aged
)
SELECT bucket, COUNT(*) AS invoices, SUM(balance) AS balance,
       ROUND(100.0 * SUM(balance) / SUM(SUM(balance)) OVER (), 1) AS pct_of_ar
FROM bucketed
GROUP BY bucket, bucket_order
ORDER BY bucket_order;`,
    breakdown: [
      ['balances', 'Ledger balance per invoice up to the as-of date.'],
      ['aged: WHERE b.balance > 0', 'Only invoices that still owe money; days past due from due_date.'],
      ['bucketed: CASE ... AS bucket, CASE ... AS bucket_order', 'Label plus a numeric key for sorting.'],
      ['SUM(SUM(balance)) OVER ()', 'A window over the grouped rows: the grand total, for percentages.'],
      ['ORDER BY bucket_order', 'Current, 0-30, 31-60, 61-90, 90+ in time order.'],
    ],
    visual: { type: 'er', tables: ['invoices', 'transactions'] },
    mistakes: [
      { wrong: `SELECT CASE WHEN julianday('2026-09-01') - julianday(due_date) <= 30 THEN '0-30' ELSE '90+' END AS bucket, SUM(total_amount)
FROM invoices WHERE status = 'Overdue' GROUP BY bucket;`, why: 'Uses total_amount instead of the remaining balance (partially paid invoices are overstated), filters on the status label instead of the actual balance, and skips buckets.', fix: `SELECT i.invoice_id, ROUND(SUM(t.amount), 2) AS balance
FROM invoices i JOIN transactions t ON t.invoice_id = i.invoice_id
GROUP BY i.invoice_id HAVING ROUND(SUM(t.amount), 2) > 0;` },
      { wrong: `SELECT ... ORDER BY bucket;`, why: 'Alphabetical order puts 0-30, 31-60, 61-90, 90+, Current: Current ends up last. Sort by a numeric bucket key.', fix: `SELECT 'Current' AS bucket, 0 AS k UNION ALL SELECT '90+', 4 UNION ALL SELECT '0-30', 1 ORDER BY k;` },
    ],
    rules: [
      'Age the remaining balance, not the original total.',
      'Always state the as-of date and use it everywhere.',
      'Bucket by days past DUE date (or by invoice date, but say which).',
      'Sort buckets with a numeric key.',
    ],
    compare: `<table><tr><th>Aging basis</th><th>Measures</th></tr>
<tr><td>Days past due date</td><td>How late the payer is (collections view)</td></tr>
<tr><td>Days since invoice/service date</td><td>How old the receivable is (finance / payer-contract view)</td></tr></table>`,
    realWorld: 'Every billing system has an A/R aging report; the 90+ bucket percentage is a key revenue-cycle KPI (healthy practices keep it under 15-20%).',
    deep: `<p>Real aging reports are often split by <b>payer vs patient responsibility</b> and by payor, since insurance A/R and patient A/R are chased differently. Add <code>payor_id</code> to the GROUP BY or pivot buckets into columns per payor.</p>`,
    tryIt: {
      prompt: 'List the individual invoices in the 90+ bucket, oldest first, with the patient name.',
      starter: `WITH balances AS (
  SELECT invoice_id, ROUND(SUM(amount), 2) AS balance FROM transactions GROUP BY invoice_id
)
SELECT i.invoice_id, p.first_name || ' ' || p.last_name AS patient, i.due_date, b.balance,
       CAST(julianday('2026-09-01') - julianday(i.due_date) AS INTEGER) AS days_past_due
FROM invoices i
JOIN balances b ON b.invoice_id = i.invoice_id
JOIN patients p ON p.patient_id = i.patient_id
WHERE b.balance > 0 AND julianday('2026-09-01') - julianday(i.due_date) > 90
ORDER BY days_past_due DESC;`,
    },
    challenge: {
      level: 4,
      prompt: 'Deliverable: the past-due A/R aging summary as of 2026-09-01. Using ledger balances (sum of transactions per invoice, rounded to 2), include only invoices with a positive balance that are past due (days past due >= 0). Return bucket (0-30, 31-60, 61-90, 90+), number of invoices and total balance, in bucket order.',
      solution: `WITH balances AS (
  SELECT invoice_id, ROUND(SUM(amount), 2) AS balance
  FROM transactions WHERE transaction_date <= '2026-09-01'
  GROUP BY invoice_id
),
aged AS (
  SELECT b.balance, CAST(julianday('2026-09-01') - julianday(i.due_date) AS INTEGER) AS d
  FROM invoices i JOIN balances b ON b.invoice_id = i.invoice_id
  WHERE b.balance > 0
)
SELECT CASE WHEN d <= 30 THEN '0-30' WHEN d <= 60 THEN '31-60' WHEN d <= 90 THEN '61-90' ELSE '90+' END AS bucket,
       COUNT(*) AS invoices,
       SUM(balance) AS balance
FROM aged
WHERE d >= 0
GROUP BY bucket
ORDER BY MIN(d);`,
      hints: [
        'Balance per invoice: ROUND(SUM(amount), 2) from transactions, grouped by invoice_id.',
        'Days past due = CAST(julianday(\'2026-09-01\') - julianday(due_date) AS INTEGER); keep balance > 0 and days >= 0.',
        'CASE WHEN d <= 30 THEN \'0-30\' WHEN d <= 60 THEN \'31-60\' WHEN d <= 90 THEN \'61-90\' ELSE \'90+\' END.',
        'GROUP BY bucket with COUNT(*) and SUM(balance); sort by a numeric key such as MIN(d).',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why age the ledger balance instead of total_amount?', options: ['It is faster', 'Partially paid, adjusted and written-off invoices owe less than their total', 'total_amount can be NULL', 'No difference'], answer: 1, why: 'Aging measures what is still owed.' },
      { q: 'An invoice is due 2026-09-27. Which bucket is it in as of 2026-09-01?', options: ['0-30', 'Current (not yet due)', '90+', 'It is excluded from A/R'], answer: 1, why: 'Days past due is negative, so it is current A/R, not past due.' },
    ],
  },

  // ---------------------------------------------------------------- P03
  {
    id: 'projects-03',
    goals: [
      'Measure payor mix: each payor type\'s share of billing and collections',
      'Handle invoices with no payor explicitly',
      'Compute percentages of a total with a window SUM',
      'Compare billed share with collected share',
    ],
    concept: `<p><b>Business question:</b> "Who pays for our services?" The <b>payor mix</b> is the share of billing (and of cash) coming from each payor type: Commercial, Medicare, Medicaid, Workers Comp, Self-Pay, and invoices with <b>no payor</b> on file.</p>
<p><b>Step 1: invoice facts with payor type</b> (LEFT JOIN so NULL payors survive, labelled Uninsured).</p>
<pre>WITH inv AS (
  SELECT i.invoice_id, COALESCE(py.payor_type, 'Uninsured') AS payor_type, i.total_amount
  FROM invoices i LEFT JOIN payors py ON py.payor_id = i.payor_id
  WHERE i.status &lt;&gt; 'Void'
)</pre>
<p><b>Step 2: cash per invoice</b> (payments, net of the refunded duplicate, from the ledger).</p>
<pre>cash AS (
  SELECT invoice_id, -SUM(amount) AS collected
  FROM transactions WHERE transaction_type IN ('PAYMENT','REFUND')
  GROUP BY invoice_id
)</pre>
<p><b>Step 3: aggregate by payor type</b>, and divide by the grand total with <code>SUM(...) OVER ()</code>.</p>`,
    why: 'Payor mix drives revenue: Medicaid reimburses far less than commercial plans. Contract negotiations, staffing and budgeting all start from it.',
    when: 'Use it for budgeting, payer contract reviews, and when revenue changes and you need to know whether the mix shifted.',
    analogy: 'A pie chart of who picks up the tab at a restaurant: the company card, the government voucher, or the diner\'s own wallet.',
    exampleTables: ['payors', 'invoices'],
    exampleSql: `SELECT payor_id, payor_name, payor_type, contract_rate, is_active FROM payors ORDER BY payor_id`,
    syntax: `SELECT group_key, SUM(x) AS x,
       ROUND(100.0 * SUM(x) / SUM(SUM(x)) OVER (), 1) AS pct
FROM ... GROUP BY group_key;`,
    sql: `WITH inv AS (
  SELECT i.invoice_id, COALESCE(py.payor_type, 'Uninsured') AS payor_type, i.total_amount
  FROM invoices i
  LEFT JOIN payors py ON py.payor_id = i.payor_id
  WHERE i.status <> 'Void'
),
cash AS (
  SELECT invoice_id, -SUM(amount) AS collected
  FROM transactions
  WHERE transaction_type IN ('PAYMENT', 'REFUND')
  GROUP BY invoice_id
),
mix AS (
  SELECT inv.payor_type,
         COUNT(*)                        AS invoices,
         SUM(inv.total_amount)           AS billed,
         TOTAL(cash.collected)           AS collected
  FROM inv
  LEFT JOIN cash ON cash.invoice_id = inv.invoice_id
  GROUP BY inv.payor_type
)
SELECT payor_type, invoices, billed, collected,
       ROUND(100.0 * billed / SUM(billed) OVER (), 1)       AS billed_pct,
       ROUND(100.0 * collected / SUM(collected) OVER (), 1) AS collected_pct,
       ROUND(100.0 * collected / billed, 1)                 AS yield_pct
FROM mix
ORDER BY billed DESC;`,
    breakdown: [
      ['inv: COALESCE(py.payor_type, \'Uninsured\')', 'Invoices 12 and 25 have no payor; they get their own label instead of vanishing.'],
      ['cash: -SUM(amount) for PAYMENT/REFUND', 'Net cash per invoice from the ledger.'],
      ['mix: LEFT JOIN cash', 'Unpaid invoices stay in the mix with 0 collected (TOTAL).'],
      ['SUM(billed) OVER ()', 'Grand total across all payor types, for shares.'],
      ['yield_pct', 'Collected / billed per payor type: how much of each billed dollar arrived.'],
    ],
    visual: { type: 'er', tables: ['payors', 'invoices', 'transactions'] },
    mistakes: [
      { wrong: `SELECT py.payor_type, SUM(i.total_amount) FROM invoices i JOIN payors py ON py.payor_id = i.payor_id GROUP BY py.payor_type;`, why: 'An inner join drops invoices with no payor, so the percentages silently ignore uninsured patients.', fix: `SELECT COALESCE(py.payor_type, 'Uninsured') AS payor_type, SUM(i.total_amount)
FROM invoices i LEFT JOIN payors py ON py.payor_id = i.payor_id GROUP BY 1;` },
      { wrong: `SELECT payor_type, 100 * SUM(total_amount) / (SELECT SUM(total_amount) FROM invoices) FROM invoices i JOIN payors USING (payor_id) GROUP BY payor_type;`, why: 'Integer arithmetic can truncate, and the denominator includes invoices the numerator excludes (NULL payor, Void), so shares do not add up to 100.', fix: `SELECT COALESCE(py.payor_type, 'Uninsured') AS t, ROUND(100.0 * SUM(i.total_amount) / SUM(SUM(i.total_amount)) OVER (), 1) AS pct
FROM invoices i LEFT JOIN payors py ON py.payor_id = i.payor_id WHERE i.status <> 'Void' GROUP BY 1;` },
    ],
    rules: [
      'Keep unknown categories visible (Uninsured) instead of dropping them.',
      'Use 100.0 (not 100) to force decimal division.',
      'SUM(SUM(x)) OVER () = grand total over grouped rows.',
      'Numerator and denominator must cover the same rows.',
    ],
    compare: `<table><tr><th>Mix basis</th><th>Answers</th></tr>
<tr><td>Invoice count</td><td>Who our patients are covered by</td></tr>
<tr><td>Billed amount</td><td>Where our charges go</td></tr>
<tr><td>Collected amount</td><td>Where our cash actually comes from</td></tr></table>`,
    realWorld: 'CFOs track payor mix monthly; a shift from commercial to Medicaid can cut revenue even when visit volume grows.',
    tryIt: {
      prompt: 'Break the mix down by individual payor name instead of payor type. Which single payor bills the most?',
      starter: `SELECT COALESCE(py.payor_name, 'No payor') AS payor, COUNT(*) AS invoices, SUM(i.total_amount) AS billed,
       ROUND(100.0 * SUM(i.total_amount) / SUM(SUM(i.total_amount)) OVER (), 1) AS pct
FROM invoices i LEFT JOIN payors py ON py.payor_id = i.payor_id
WHERE i.status <> 'Void'
GROUP BY 1
ORDER BY billed DESC;`,
    },
    challenge: {
      level: 3,
      prompt: 'Deliverable: payor mix by billed amount. For non-void invoices, return payor type (\'Uninsured\' when the invoice has no payor), invoice count, billed total and percent of all billed rounded to 1 decimal. Order by billed descending, then payor type.',
      solution: `SELECT COALESCE(py.payor_type, 'Uninsured') AS payor_type,
       COUNT(*) AS invoices,
       SUM(i.total_amount) AS billed,
       ROUND(100.0 * SUM(i.total_amount) / SUM(SUM(i.total_amount)) OVER (), 1) AS pct_of_billed
FROM invoices i
LEFT JOIN payors py ON py.payor_id = i.payor_id
WHERE i.status <> 'Void'
GROUP BY 1
ORDER BY billed DESC, payor_type;`,
      hints: [
        'LEFT JOIN payors so invoices with NULL payor_id are kept.',
        'COALESCE(payor_type, \'Uninsured\') is the grouping key; exclude Void in WHERE.',
        'The grand total over grouped rows is SUM(SUM(total_amount)) OVER ().',
        'ROUND(100.0 * SUM(total_amount) / SUM(SUM(total_amount)) OVER (), 1); ORDER BY billed DESC, payor_type.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What does SUM(SUM(billed)) OVER () compute in a grouped query?', options: ['An error', 'The grand total of the grouped sums', 'A running total', 'The row count'], answer: 1, why: 'The inner SUM is the group aggregate; the outer windowed SUM adds all groups together.' },
      { q: 'Why LEFT JOIN payors in a payor mix?', options: ['It is faster', 'To keep invoices with no payor in the totals', 'To remove inactive payors', 'To sort by payor'], answer: 1, why: 'An inner join would silently drop uninsured invoices.' },
    ],
  },

  // ---------------------------------------------------------------- P04
  {
    id: 'projects-04',
    goals: [
      'Measure practitioner productivity from charges',
      'Include practitioners with no activity (Leo Martins) using LEFT JOIN',
      'Rank practitioners overall and within specialty',
      'Compare billed output with hourly cost',
    ],
    concept: `<p><b>Business question:</b> "Who is generating the most billable work, and how does each practitioner compare with peers in the same specialty?"</p>
<p><b>Step 1: charges per practitioner.</b></p>
<pre>WITH work AS (
  SELECT practitioner_id, COUNT(*) AS charges, SUM(units) AS units, SUM(amount) AS billed,
         COUNT(DISTINCT invoice_id) AS encounters
  FROM charges GROUP BY practitioner_id
)</pre>
<p><b>Step 2: start from practitioners and LEFT JOIN work</b>, so the new hire with no charges shows 0 instead of disappearing.</p>
<p><b>Step 3: rank</b> with <code>RANK() OVER (ORDER BY billed DESC)</code> and within specialty with <code>PARTITION BY specialty</code>.</p>
<p><b>Step 4: add context</b>: patients seen, average charge, and billed per hourly-rate dollar (a rough output/cost ratio).</p>`,
    why: 'Productivity reports drive compensation (RVU-based pay), scheduling and hiring decisions.',
    when: 'Use it in monthly provider scorecards and when reviewing workload balance within a department.',
    analogy: 'A leaderboard in the staff room, with a separate board per department so physical therapists are compared with physical therapists, not with cardiologists.',
    exampleTables: ['practitioners', 'charges'],
    exampleSql: `SELECT practitioner_id, first_name, last_name, specialty, hourly_rate, hire_date FROM practitioners ORDER BY practitioner_id`,
    syntax: `SELECT p.*, COALESCE(w.billed, 0) AS billed,
       RANK() OVER (ORDER BY COALESCE(w.billed, 0) DESC) AS overall_rank,
       RANK() OVER (PARTITION BY p.specialty ORDER BY COALESCE(w.billed, 0) DESC) AS specialty_rank
FROM practitioners p LEFT JOIN work w ON ...;`,
    sql: `WITH work AS (
  SELECT c.practitioner_id,
         COUNT(*)                     AS charges,
         SUM(c.units)                 AS units,
         SUM(c.amount)                AS billed,
         COUNT(DISTINCT i.patient_id) AS patients
  FROM charges c
  JOIN invoices i ON i.invoice_id = c.invoice_id
  GROUP BY c.practitioner_id
)
SELECT p.practitioner_id,
       p.first_name || ' ' || p.last_name AS practitioner,
       p.specialty,
       COALESCE(w.charges, 0)  AS charges,
       COALESCE(w.patients, 0) AS patients,
       COALESCE(w.billed, 0)   AS billed,
       ROUND(COALESCE(w.billed, 0) / p.hourly_rate, 1) AS billed_per_rate_dollar,
       RANK() OVER (ORDER BY COALESCE(w.billed, 0) DESC) AS overall_rank,
       RANK() OVER (PARTITION BY p.specialty ORDER BY COALESCE(w.billed, 0) DESC) AS specialty_rank
FROM practitioners p
LEFT JOIN work w ON w.practitioner_id = p.practitioner_id
ORDER BY overall_rank, p.practitioner_id;`,
    breakdown: [
      ['work CTE', 'One row per practitioner who has charges: counts, units, billed, distinct patients.'],
      ['FROM practitioners p LEFT JOIN work', 'Every practitioner appears, including Leo Martins with no charges.'],
      ['COALESCE(w.billed, 0)', 'Turns missing work into 0 so ranking and math work.'],
      ['RANK() OVER (ORDER BY billed DESC)', 'Overall leaderboard (ties share a rank).'],
      ['RANK() OVER (PARTITION BY specialty ...)', 'Leaderboard within each specialty.'],
    ],
    visual: { type: 'er', tables: ['practitioners', 'charges', 'invoices'] },
    mistakes: [
      { wrong: `SELECT p.practitioner_id, SUM(c.amount) AS billed
FROM practitioners p JOIN charges c ON c.practitioner_id = p.practitioner_id
GROUP BY p.practitioner_id;`, why: 'The inner join hides practitioners with no charges, so the scorecard misses the new hire entirely.', fix: `SELECT p.practitioner_id, TOTAL(c.amount) AS billed
FROM practitioners p LEFT JOIN charges c ON c.practitioner_id = p.practitioner_id
GROUP BY p.practitioner_id;` },
    ],
    rules: [
      'Drive people reports from the people table (LEFT JOIN facts).',
      'Aggregate facts in a CTE before joining dimension tables.',
      'Rank within peer groups (PARTITION BY specialty) for fair comparisons.',
      'Choose RANK vs DENSE_RANK vs ROW_NUMBER deliberately for ties.',
    ],
    compare: `<table><tr><th>Measure</th><th>Strength</th><th>Weakness</th></tr>
<tr><td>Billed amount</td><td>Easy</td><td>Favors expensive specialties</td></tr>
<tr><td>Charges / units</td><td>Workload</td><td>Ignores complexity</td></tr>
<tr><td>RVUs (industry standard)</td><td>Complexity-weighted</td><td>Needs an RVU table per CPT</td></tr></table>`,
    realWorld: 'Provider scorecards and RVU-based compensation reports are built exactly this way, usually monthly and year-to-date.',
    deep: `<p>Real productivity uses <b>work RVUs</b> per CPT code: add a <code>cpt_rvu(cpt_code, work_rvu)</code> table and replace <code>SUM(amount)</code> with <code>SUM(units * work_rvu)</code>. The query shape stays the same.</p>`,
    tryIt: {
      prompt: 'Show each practitioner\'s top CPT code by count (use ROW_NUMBER within the practitioner).',
      starter: `SELECT practitioner_id, cpt_code, n FROM (
  SELECT practitioner_id, cpt_code, COUNT(*) AS n,
         ROW_NUMBER() OVER (PARTITION BY practitioner_id ORDER BY COUNT(*) DESC, cpt_code) AS rn
  FROM charges GROUP BY practitioner_id, cpt_code
) WHERE rn = 1
ORDER BY practitioner_id;`,
    },
    challenge: {
      level: 3,
      prompt: 'Deliverable: revenue per practitioner with rank. Return practitioner_id, full name, specialty, total billed from charges (0 if none) and RANK() by billed descending. Include every practitioner. Order by rank, then practitioner_id.',
      solution: `SELECT p.practitioner_id,
       p.first_name || ' ' || p.last_name AS practitioner,
       p.specialty,
       TOTAL(c.amount) AS billed,
       RANK() OVER (ORDER BY TOTAL(c.amount) DESC) AS revenue_rank
FROM practitioners p
LEFT JOIN charges c ON c.practitioner_id = p.practitioner_id
GROUP BY p.practitioner_id
ORDER BY revenue_rank, p.practitioner_id;`,
      hints: [
        'Start from practitioners and LEFT JOIN charges.',
        'GROUP BY practitioner_id; TOTAL(amount) (or COALESCE(SUM(amount), 0)) gives 0 for no charges.',
        'A window can rank grouped rows: RANK() OVER (ORDER BY TOTAL(c.amount) DESC).',
        'ORDER BY the rank, then practitioner_id.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why rank within specialty as well as overall?', options: ['It is faster', 'Specialties bill very different amounts, so peers are a fairer comparison', 'RANK requires a partition', 'To hide low performers'], answer: 1, why: 'A cardiologist and a physical therapist are not comparable on billed dollars.' },
      { q: 'Two practitioners tie for 2nd with RANK(). What rank does the next one get?', options: ['2', '3', '4', 'NULL'], answer: 2, why: 'RANK leaves a gap after ties (1, 2, 2, 4). DENSE_RANK would give 3.' },
    ],
  },

  // ---------------------------------------------------------------- P05
  {
    id: 'projects-05',
    goals: [
      'Compare treatment locations on volume, billing and collections',
      'Keep a new location with no invoices in the report',
      'Compute collection rate and average invoice safely',
      'Rank locations and flag under-performers against the average',
    ],
    concept: `<p><b>Business question:</b> "Which of our six sites performs best, and which needs attention?"</p>
<p><b>Step 1: per-location invoice facts.</b></p>
<pre>WITH inv AS (
  SELECT location_id, COUNT(*) AS invoices, SUM(total_amount) AS billed,
         COUNT(DISTINCT patient_id) AS patients
  FROM invoices WHERE status &lt;&gt; 'Void' GROUP BY location_id
)</pre>
<p><b>Step 2: per-location cash</b> (ledger payments net of refunds, joined through invoices).</p>
<pre>cash AS (
  SELECT i.location_id, -SUM(t.amount) AS collected
  FROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id
  WHERE t.transaction_type IN ('PAYMENT','REFUND')
  GROUP BY i.location_id
)</pre>
<p><b>Step 3: join both to treatment_locations</b> (LEFT JOIN, so Eastside Family Clinic, opened 2026-08-15, still appears).</p>
<p><b>Step 4: ratios and comparison</b>: collection rate, average invoice, rank, and a flag when a location's collection rate is below the all-location rate.</p>`,
    why: 'Multi-site practices allocate staff, marketing and capital by location performance.',
    when: 'Use it in quarterly site reviews, when opening or closing sites, and to spot billing-process problems at one location.',
    analogy: 'A regional manager\'s report card for each branch of a pharmacy chain.',
    exampleTables: ['treatment_locations'],
    exampleSql: `SELECT location_id, location_name, location_type, city, opened_date FROM treatment_locations ORDER BY location_id`,
    syntax: `SELECT l.*, COALESCE(a.x, 0), COALESCE(b.y, 0), ... , RANK() OVER (...)
FROM locations l LEFT JOIN a ON ... LEFT JOIN b ON ...;`,
    sql: `WITH inv AS (
  SELECT location_id, COUNT(*) AS invoices, SUM(total_amount) AS billed,
         COUNT(DISTINCT patient_id) AS patients
  FROM invoices WHERE status <> 'Void'
  GROUP BY location_id
),
cash AS (
  SELECT i.location_id, -SUM(t.amount) AS collected
  FROM transactions t
  JOIN invoices i ON i.invoice_id = t.invoice_id
  WHERE t.transaction_type IN ('PAYMENT', 'REFUND')
  GROUP BY i.location_id
),
perf AS (
  SELECT l.location_id, l.location_name, l.location_type,
         COALESCE(inv.invoices, 0)  AS invoices,
         COALESCE(inv.patients, 0)  AS patients,
         COALESCE(inv.billed, 0)    AS billed,
         COALESCE(cash.collected, 0) AS collected
  FROM treatment_locations l
  LEFT JOIN inv  ON inv.location_id  = l.location_id
  LEFT JOIN cash ON cash.location_id = l.location_id
)
SELECT location_name, location_type, invoices, patients, billed, collected,
       ROUND(billed * 1.0 / NULLIF(invoices, 0), 2)     AS avg_invoice,
       ROUND(100.0 * collected / NULLIF(billed, 0), 1)  AS collection_rate,
       RANK() OVER (ORDER BY billed DESC)               AS billed_rank,
       CASE WHEN billed = 0 THEN 'No activity'
            WHEN collected * 1.0 / billed < SUM(collected) OVER () * 1.0 / SUM(billed) OVER () THEN 'Below average'
            ELSE 'OK' END                               AS flag
FROM perf
ORDER BY billed_rank, location_id;`,
    breakdown: [
      ['inv / cash CTEs', 'Aggregate each fact table by location before joining.'],
      ['perf: FROM treatment_locations LEFT JOIN ...', 'All six locations, with zeros for Eastside.'],
      ['NULLIF(invoices, 0), NULLIF(billed, 0)', 'Safe division for the location with no invoices.'],
      ['SUM(collected) OVER () / SUM(billed) OVER ()', 'The all-location collection rate as a benchmark on every row.'],
      ['CASE ... flag', 'No activity, Below average or OK.'],
    ],
    visual: { type: 'er', tables: ['treatment_locations', 'invoices', 'transactions'] },
    mistakes: [
      { wrong: `SELECT l.location_name, SUM(i.total_amount) AS billed, -SUM(t.amount) AS collected
FROM treatment_locations l
JOIN invoices i ON i.location_id = l.location_id
JOIN transactions t ON t.invoice_id = i.invoice_id AND t.transaction_type = 'PAYMENT'
GROUP BY l.location_id;`, why: 'Joining invoices to their payment rows repeats each invoice once per payment (billed inflated), drops unpaid invoices, and drops Eastside.', fix: `SELECT l.location_name, TOTAL(i.total_amount) AS billed
FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id AND i.status <> 'Void'
GROUP BY l.location_id;` },
    ],
    rules: [
      'One CTE per fact table, aggregated to the report grain (location).',
      'Dimension table first, facts LEFT JOINed.',
      'Guard every ratio with NULLIF.',
      'Benchmarks: window aggregates over the final rows (SUM(...) OVER ()).',
    ],
    compare: `<table><tr><th>KPI</th><th>Formula</th></tr>
<tr><td>Average invoice</td><td>billed / invoices</td></tr>
<tr><td>Collection rate</td><td>collected / billed</td></tr>
<tr><td>Patients per location</td><td>COUNT(DISTINCT patient_id)</td></tr>
<tr><td>Share of billing</td><td>billed / SUM(billed) OVER ()</td></tr></table>`,
    realWorld: 'Operations reviews for multi-site groups, urgent-care chains and hospital outpatient departments start from this kind of site comparison.',
    tryIt: {
      prompt: 'Break down each location\'s invoices by status (a pivot with SUM(CASE ...)).',
      starter: `SELECT l.location_name,
       SUM(CASE WHEN i.status = 'Paid' THEN 1 ELSE 0 END) AS paid,
       SUM(CASE WHEN i.status = 'Partially Paid' THEN 1 ELSE 0 END) AS partial,
       SUM(CASE WHEN i.status = 'Overdue' THEN 1 ELSE 0 END) AS overdue,
       SUM(CASE WHEN i.status = 'Open' THEN 1 ELSE 0 END) AS open
FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id
GROUP BY l.location_id ORDER BY l.location_id;`,
    },
    challenge: {
      level: 4,
      prompt: 'Deliverable: collection-rate ranking for locations that have invoices. For each such location return location_name, billed (non-void invoice totals), collected (ledger PAYMENT + REFUND, as a positive number), collection rate % rounded to 1, and RANK() by collection rate descending. Order by rank, then location_name.',
      solution: `WITH inv AS (
  SELECT location_id, SUM(total_amount) AS billed
  FROM invoices WHERE status <> 'Void' GROUP BY location_id
),
cash AS (
  SELECT i.location_id, -SUM(t.amount) AS collected
  FROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id
  WHERE t.transaction_type IN ('PAYMENT', 'REFUND')
  GROUP BY i.location_id
)
SELECT l.location_name, inv.billed, COALESCE(cash.collected, 0) AS collected,
       ROUND(100.0 * COALESCE(cash.collected, 0) / inv.billed, 1) AS collection_rate,
       RANK() OVER (ORDER BY ROUND(100.0 * COALESCE(cash.collected, 0) / inv.billed, 1) DESC) AS rate_rank
FROM treatment_locations l
JOIN inv ON inv.location_id = l.location_id
LEFT JOIN cash ON cash.location_id = l.location_id
ORDER BY rate_rank, l.location_name;`,
      hints: [
        'Aggregate billed per location from invoices (non-void) in one CTE.',
        'Aggregate collected per location in another CTE: join transactions to invoices, keep PAYMENT and REFUND, -SUM(amount).',
        'Inner-join inv (only locations with invoices), LEFT JOIN cash; rate = 100.0 * collected / billed rounded to 1.',
        'RANK() OVER (ORDER BY the rounded rate DESC); ORDER BY rank, location_name.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why aggregate invoices and transactions in separate CTEs?', options: ['Style', 'Joining them first repeats invoices per transaction and inflates billed', 'CTEs are required for RANK', 'To avoid NULLs'], answer: 1, why: 'Summarize each fact to the report grain, then join.' },
      { q: 'What does NULLIF(billed, 0) protect against?', options: ['NULL payors', 'Division by zero for a location with no billing', 'Negative balances', 'Duplicate rows'], answer: 1, why: 'x / NULL is NULL instead of an error or infinity.' },
    ],
  },

  // ---------------------------------------------------------------- P06
  {
    id: 'projects-06',
    goals: [
      'Produce patient balance statements from the ledger',
      'Show statement lines with a running balance',
      'Summarize each patient\'s open invoices, balance and oldest due date',
      'Merge the duplicate patient (25 into 1) at report time',
    ],
    concept: `<p><b>Business question:</b> "What does each patient owe, and what should their statement show?"</p>
<p>A statement has two parts: a <b>summary</b> (total due, oldest due date) and <b>detail lines</b> (every charge, payment and adjustment with a running balance).</p>
<p><b>Step 1: resolve the patient identity.</b> Patient 25 is a duplicate of patient 1, so we map every invoice to a <i>master</i> patient id.</p>
<pre>WITH master AS (
  SELECT patient_id,
         MIN(patient_id) OVER (PARTITION BY first_name, last_name, date_of_birth) AS master_id
  FROM patients
)</pre>
<p><b>Step 2: ledger lines per invoice</b>, tagged with the master patient.</p>
<pre>lines AS (
  SELECT m.master_id, t.invoice_id, t.transaction_date, t.transaction_type, t.amount
  FROM transactions t
  JOIN invoices i ON i.invoice_id = t.invoice_id
  JOIN master m   ON m.patient_id = i.patient_id
)</pre>
<p><b>Step 3: running balance per patient</b> with <code>SUM(amount) OVER (PARTITION BY master_id ORDER BY date, id)</code>.</p>
<p><b>Step 4: summary</b>: per patient, open invoices (balance &gt; 0), total balance, oldest due date.</p>`,
    why: 'Patient statements are the main way practices collect patient-responsibility balances; they must be accurate and explainable.',
    when: 'Run it for monthly statement cycles, for patient portal balances, and when a patient calls asking "why do I owe this?"',
    analogy: 'A credit card statement: a summary box at the top (amount due, due date) and every transaction listed below with a running balance.',
    exampleTables: ['patients', 'transactions'],
    exampleSql: `SELECT t.transaction_id, i.patient_id, t.invoice_id, t.transaction_date, t.transaction_type, t.amount
FROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id
WHERE i.patient_id IN (1, 25) ORDER BY t.transaction_date`,
    syntax: `WITH master AS (...), lines AS (...)
SELECT master_id, date, type, amount,
       SUM(amount) OVER (PARTITION BY master_id ORDER BY date, id) AS running_balance
FROM lines;`,
    sql: `WITH master AS (
  SELECT patient_id,
         MIN(patient_id) OVER (PARTITION BY first_name, last_name, date_of_birth) AS master_id
  FROM patients
),
lines AS (
  SELECT m.master_id, t.transaction_id, t.invoice_id, t.transaction_date, t.transaction_type, t.amount
  FROM transactions t
  JOIN invoices i ON i.invoice_id = t.invoice_id
  JOIN master m   ON m.patient_id = i.patient_id
)
SELECT l.master_id AS patient_id,
       p.first_name || ' ' || p.last_name AS patient,
       l.transaction_date, l.invoice_id, l.transaction_type, l.amount,
       ROUND(SUM(l.amount) OVER (PARTITION BY l.master_id
                                 ORDER BY l.transaction_date, l.transaction_id
                                 ROWS UNBOUNDED PRECEDING), 2) AS running_balance
FROM lines l
JOIN patients p ON p.patient_id = l.master_id
WHERE l.master_id = 1
ORDER BY l.transaction_date, l.transaction_id;`,
    breakdown: [
      ['master: MIN(patient_id) OVER (PARTITION BY name, DOB)', 'Maps patient 25 to master id 1 (and every other patient to themselves).'],
      ['lines', 'Every ledger entry tagged with the master patient.'],
      ['SUM(amount) OVER (PARTITION BY master_id ORDER BY date, id ROWS UNBOUNDED PRECEDING)', 'Statement running balance across all of the patient\'s invoices.'],
      ['WHERE l.master_id = 1', 'Maria Garcia\'s merged statement: invoices from both of her records.'],
    ],
    visual: { type: 'er', tables: ['patients', 'invoices', 'transactions'] },
    mistakes: [
      { wrong: `SELECT i.patient_id, SUM(t.amount) AS balance
FROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id
GROUP BY i.patient_id;`, why: 'Maria Garcia gets two statements (patient 1 and patient 25), each showing part of her balance.', fix: `WITH master AS (SELECT patient_id, MIN(patient_id) OVER (PARTITION BY first_name, last_name, date_of_birth) AS master_id FROM patients)
SELECT m.master_id, ROUND(SUM(t.amount), 2) AS balance
FROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id JOIN master m ON m.patient_id = i.patient_id
GROUP BY m.master_id;` },
    ],
    rules: [
      'Resolve identities (duplicates) before summing per person.',
      'Balances come from the ledger, not from invoice status.',
      'Order statement lines by date and a unique id.',
      'Round money at the end, not in intermediate steps.',
    ],
    compare: `<table><tr><th>View</th><th>Grain</th></tr>
<tr><td>Statement detail</td><td>One row per ledger entry, running balance</td></tr>
<tr><td>Statement summary</td><td>One row per patient</td></tr>
<tr><td>Invoice balance</td><td>One row per invoice</td></tr></table>`,
    realWorld: 'Statement vendors receive exactly these two extracts (summary + detail) from the billing system every cycle.',
    deep: `<p>Real statements show only <b>patient responsibility</b> (after insurance). With a payer/patient split you would add a responsibility column to each ledger line and filter or sum by it.</p>`,
    tryIt: {
      prompt: 'Show the statement lines for patient 7 (Noah Taylor) instead. Where does his balance come from?',
      starter: `SELECT t.transaction_date, t.invoice_id, t.transaction_type, t.amount,
       SUM(t.amount) OVER (ORDER BY t.transaction_date, t.transaction_id ROWS UNBOUNDED PRECEDING) AS running_balance
FROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id
WHERE i.patient_id = 7
ORDER BY t.transaction_date, t.transaction_id;`,
    },
    challenge: {
      level: 4,
      prompt: 'Deliverable: statement summary. Merging duplicate patients (same first name, last name and date of birth) into the lowest patient_id, return for each master patient with a positive ledger balance: patient_id, full name, number of invoices with a positive balance, total balance (rounded to 2) and the oldest due date among those invoices. Order by balance descending, then patient_id.',
      solution: `WITH master AS (
  SELECT patient_id, MIN(patient_id) OVER (PARTITION BY first_name, last_name, date_of_birth) AS master_id
  FROM patients
),
inv_bal AS (
  SELECT i.invoice_id, m.master_id, i.due_date, ROUND(SUM(t.amount), 2) AS balance
  FROM invoices i
  JOIN transactions t ON t.invoice_id = i.invoice_id
  JOIN master m ON m.patient_id = i.patient_id
  GROUP BY i.invoice_id
  HAVING ROUND(SUM(t.amount), 2) > 0
)
SELECT b.master_id AS patient_id, p.first_name || ' ' || p.last_name AS patient,
       COUNT(*) AS open_invoices, ROUND(SUM(b.balance), 2) AS balance, MIN(b.due_date) AS oldest_due
FROM inv_bal b
JOIN patients p ON p.patient_id = b.master_id
GROUP BY b.master_id
ORDER BY balance DESC, patient_id;`,
      hints: [
        'Map each patient to a master id: MIN(patient_id) OVER (PARTITION BY first_name, last_name, date_of_birth).',
        'Compute a ledger balance per invoice (SUM of transactions), keeping only invoices with balance > 0.',
        'Group those invoices by master id: COUNT(*), SUM(balance), MIN(due_date).',
        'Join patients on the master id for the name; ORDER BY balance DESC, patient_id.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why map patients to a master id before summing balances?', options: ['Performance', 'So a duplicated patient gets one statement with the full balance', 'To remove NULLs', 'Statements require it by law'], answer: 1, why: 'Patient 25 and patient 1 are the same person.' },
      { q: 'Which frame gives a statement running balance?', options: ['ROWS UNBOUNDED PRECEDING with ORDER BY date, id', 'No ORDER BY', 'ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING', 'RANGE with ORDER BY date only'], answer: 0, why: 'All previous lines plus the current one, in a unique order.' },
    ],
  },

  // ---------------------------------------------------------------- P07
  {
    id: 'projects-07',
    goals: [
      'Reconcile two sources of truth: invoice/payment tables vs the ledger',
      'Compute expected balance (total - payments) and ledger balance per invoice',
      'Find and explain every difference',
      'Use FULL-coverage joins so nothing slips through',
    ],
    concept: `<p><b>Business question:</b> "Do our invoice and payment tables agree with the accounting ledger?" Finance must prove that <code>total_amount - payments</code> equals the ledger balance for every invoice. When they differ, someone must explain why.</p>
<p><b>Step 1: payments per invoice.</b></p>
<pre>WITH paid AS (
  SELECT invoice_id, SUM(amount) AS payments FROM payments GROUP BY invoice_id
)</pre>
<p><b>Step 2: ledger per invoice</b>, plus the non-standard entries that usually explain differences.</p>
<pre>ledger AS (
  SELECT invoice_id, SUM(amount) AS ledger_balance,
         SUM(CASE WHEN transaction_type IN ('ADJUSTMENT','WRITE_OFF','REFUND') THEN amount ELSE 0 END) AS other_entries
  FROM transactions GROUP BY invoice_id
)</pre>
<p><b>Step 3: compare</b> starting from invoices (LEFT JOINs, COALESCE to 0 so invoice 37 with no ledger rows is still checked).</p>
<p><b>Step 4: keep differences</b> (rounded, to ignore floating-point dust) and label the likely reason.</p>
<p>Expected findings: invoice 1 (duplicate payment in <code>payments</code>, reversed by a REFUND in the ledger), invoice 6 (an ADJUSTMENT) and invoice 24 (a WRITE_OFF).</p>`,
    why: 'Unreconciled differences mean either lost money or wrong reports. Auditors require reconciliations; month-end close cannot finish without them.',
    when: 'Run it at every month end, after data migrations, and whenever two systems hold the same money.',
    analogy: 'Balancing a checkbook against the bank statement: every difference must be explained by an item one side has and the other does not.',
    exampleTables: ['payments', 'transactions'],
    exampleSql: `SELECT t.invoice_id, t.transaction_type, COUNT(*) AS entries, SUM(t.amount) AS amount
FROM transactions t WHERE t.invoice_id IN (1, 6, 24) GROUP BY t.invoice_id, t.transaction_type ORDER BY t.invoice_id`,
    syntax: `WITH a AS (source 1 per key), b AS (source 2 per key)
SELECT key, a.value, b.value, a.value - b.value AS diff
FROM keys LEFT JOIN a ... LEFT JOIN b ...
WHERE ROUND(a.value - b.value, 2) <> 0;`,
    sql: `WITH paid AS (
  SELECT invoice_id, SUM(amount) AS payments FROM payments GROUP BY invoice_id
),
ledger AS (
  SELECT invoice_id,
         SUM(amount) AS ledger_balance,
         SUM(CASE WHEN transaction_type = 'ADJUSTMENT' THEN amount ELSE 0 END) AS adjustments,
         SUM(CASE WHEN transaction_type = 'WRITE_OFF'  THEN amount ELSE 0 END) AS write_offs,
         SUM(CASE WHEN transaction_type = 'REFUND'     THEN amount ELSE 0 END) AS refunds
  FROM transactions GROUP BY invoice_id
),
recon AS (
  SELECT i.invoice_id, i.status, i.total_amount,
         COALESCE(p.payments, 0)                       AS payments,
         i.total_amount - COALESCE(p.payments, 0)      AS expected_balance,
         COALESCE(l.ledger_balance, 0)                 AS ledger_balance,
         COALESCE(l.adjustments, 0) AS adjustments, COALESCE(l.write_offs, 0) AS write_offs, COALESCE(l.refunds, 0) AS refunds
  FROM invoices i
  LEFT JOIN paid p   ON p.invoice_id = i.invoice_id
  LEFT JOIN ledger l ON l.invoice_id = i.invoice_id
)
SELECT invoice_id, status, total_amount, payments, expected_balance, ledger_balance,
       ROUND(ledger_balance - expected_balance, 2) AS difference,
       CASE WHEN refunds <> 0     THEN 'Refund in ledger (duplicate payment reversed)'
            WHEN write_offs <> 0  THEN 'Write-off in ledger only'
            WHEN adjustments <> 0 THEN 'Adjustment in ledger only'
            ELSE 'Unexplained' END AS likely_reason
FROM recon
WHERE ROUND(ledger_balance - expected_balance, 2) <> 0
ORDER BY invoice_id;`,
    breakdown: [
      ['paid', 'Source A: payments table summed per invoice.'],
      ['ledger', 'Source B: transactions summed per invoice, with the special entry types split out.'],
      ['recon: FROM invoices LEFT JOIN ...', 'Every invoice is checked, even ones missing from a source.'],
      ['ROUND(ledger_balance - expected_balance, 2) <> 0', 'Keep real differences only (ignores floating-point noise).'],
      ['likely_reason CASE', 'Explains each difference from the ledger entries that the payments table cannot see.'],
    ],
    visual: { type: 'er', tables: ['invoices', 'payments', 'transactions'] },
    mistakes: [
      { wrong: `SELECT i.invoice_id, i.total_amount - SUM(p.amount) AS expected, SUM(t.amount) AS ledger
FROM invoices i
JOIN payments p ON p.invoice_id = i.invoice_id
JOIN transactions t ON t.invoice_id = i.invoice_id
GROUP BY i.invoice_id;`, why: 'Joining two child tables at once multiplies rows (payments × transactions), so both sums are wrong; the inner joins also drop unpaid invoices.', fix: `WITH paid AS (SELECT invoice_id, SUM(amount) AS s FROM payments GROUP BY invoice_id),
led AS (SELECT invoice_id, SUM(amount) AS s FROM transactions GROUP BY invoice_id)
SELECT i.invoice_id, i.total_amount - COALESCE(paid.s, 0) AS expected, COALESCE(led.s, 0) AS ledger
FROM invoices i LEFT JOIN paid ON paid.invoice_id = i.invoice_id LEFT JOIN led ON led.invoice_id = i.invoice_id;` },
      { wrong: `... WHERE ledger_balance <> expected_balance`, why: 'Floating-point sums (0.1 + 0.2) can differ in the last bits and create false alarms.', fix: `SELECT ROUND(0.1 + 0.2 - 0.3, 2) <> 0 AS is_real_difference;` },
    ],
    rules: [
      'Summarize each source separately to the same key, then compare.',
      'Start from the master list (invoices) with LEFT JOINs.',
      'Compare rounded money values.',
      'Every difference needs a reason; "Unexplained" rows are the action list.',
    ],
    compare: `<table><tr><th>Technique</th><th>Finds</th></tr>
<tr><td>LEFT JOIN from master list</td><td>Keys missing in a source</td></tr>
<tr><td>FULL OUTER JOIN of two sources</td><td>Keys missing on either side</td></tr>
<tr><td>EXCEPT both ways</td><td>Rows that differ in any column</td></tr>
<tr><td>Rounded difference</td><td>Amounts that disagree</td></tr></table>`,
    realWorld: 'Month-end close: sub-ledger (billing) to general-ledger reconciliation, bank deposit to posted-payment reconciliation, and clearinghouse remittance (835) to posted-payment reconciliation.',
    deep: `<p>The findings show the design lesson: the payments table only knows about cash, while the ledger also records adjustments, write-offs and reversals. Reports must pick one source of truth for balances (the ledger) and use the other only for detail.</p>`,
    tryIt: {
      prompt: 'Check the charge side too: compare invoice total_amount with the sum of charges and with the ledger CHARGE entries. Do they agree?',
      starter: `WITH ch AS (SELECT invoice_id, SUM(amount) AS charges FROM charges GROUP BY invoice_id),
lc AS (SELECT invoice_id, SUM(amount) AS ledger_charges FROM transactions WHERE transaction_type = 'CHARGE' GROUP BY invoice_id)
SELECT i.invoice_id, i.total_amount, COALESCE(ch.charges, 0) AS charges, COALESCE(lc.ledger_charges, 0) AS ledger_charges
FROM invoices i LEFT JOIN ch ON ch.invoice_id = i.invoice_id LEFT JOIN lc ON lc.invoice_id = i.invoice_id
WHERE i.total_amount <> COALESCE(ch.charges, 0) OR i.total_amount <> COALESCE(lc.ledger_charges, 0);`,
    },
    challenge: {
      level: 4,
      prompt: 'Deliverable: ledger reconciliation exceptions. For every invoice, compare expected balance (total_amount minus the sum of payments, 0 if none) with the ledger balance (sum of transactions, 0 if none). Return invoice_id, expected balance, ledger balance and the difference (ledger - expected, rounded to 2) for invoices where the rounded difference is not 0. Order by invoice_id.',
      solution: `WITH paid AS (
  SELECT invoice_id, SUM(amount) AS payments FROM payments GROUP BY invoice_id
),
ledger AS (
  SELECT invoice_id, SUM(amount) AS ledger_balance FROM transactions GROUP BY invoice_id
)
SELECT i.invoice_id,
       i.total_amount - COALESCE(p.payments, 0) AS expected_balance,
       COALESCE(l.ledger_balance, 0) AS ledger_balance,
       ROUND(COALESCE(l.ledger_balance, 0) - (i.total_amount - COALESCE(p.payments, 0)), 2) AS difference
FROM invoices i
LEFT JOIN paid p ON p.invoice_id = i.invoice_id
LEFT JOIN ledger l ON l.invoice_id = i.invoice_id
WHERE ROUND(COALESCE(l.ledger_balance, 0) - (i.total_amount - COALESCE(p.payments, 0)), 2) <> 0
ORDER BY i.invoice_id;`,
      hints: [
        'Summarize payments per invoice and transactions per invoice in two separate CTEs.',
        'Start FROM invoices and LEFT JOIN both summaries; COALESCE missing sums to 0.',
        'expected = total_amount - payments; difference = ledger - expected, ROUND(..., 2).',
        'Keep rows where the rounded difference <> 0 and ORDER BY invoice_id (you should find 3 invoices).',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why not join payments and transactions to invoices in one query and SUM both?', options: ['It is slower', 'Rows multiply (payments × transactions), so both sums are inflated', 'SQLite forbids it', 'It works fine'], answer: 1, why: 'Two independent one-to-many joins create a cross product per invoice.' },
      { q: 'Invoice 1 differs by +165. What explains it?', options: ['A missing charge', 'The duplicate payment is in the payments table, but the ledger reversed it with a REFUND', 'A write-off', 'Rounding'], answer: 1, why: 'payments counts 330 received; the ledger nets to 165 received.' },
    ],
  },

  // ---------------------------------------------------------------- P08
  {
    id: 'projects-08',
    goals: [
      'Measure payment velocity: days from invoice to payment',
      'Separate insurance payments from patient payments',
      'Find days to first payment and days to full payment per invoice',
      'Summarize velocity by payor with averages and medians',
    ],
    concept: `<p><b>Business question:</b> "How fast do we get paid, and by whom?" Faster collections mean better cash flow; slow payors need follow-up.</p>
<p><b>Step 1: label each payment's source</b>: the insurance payor if <code>payor_id</code> is set, otherwise the patient.</p>
<pre>WITH pay AS (
  SELECT p.payment_id, p.invoice_id, p.amount, p.payment_date,
         COALESCE(py.payor_name, 'Patient') AS payer,
         julianday(p.payment_date) - julianday(i.invoice_date) AS days_to_pay
  FROM payments p
  JOIN invoices i ON i.invoice_id = p.invoice_id
  LEFT JOIN payors py ON py.payor_id = p.payor_id
)</pre>
<p><b>Step 2: per-invoice milestones</b>: first payment date, and the date the cumulative payments reached the total (a running SUM).</p>
<p><b>Step 3: summarize by payer</b>: count, amount, average days, and a weighted average (big payments count more).</p>`,
    why: 'Days to pay drives cash flow and tells collectors which payors and which patients to chase.',
    when: 'Use it in payer performance reviews, prompt-pay law compliance checks, and cash forecasting.',
    analogy: 'Timing how long each friend takes to pay you back after dinner: some pay the same night, some need three reminders.',
    exampleTables: ['payments'],
    exampleSql: `SELECT p.payment_id, p.invoice_id, i.invoice_date, p.payment_date, p.payor_id, p.amount, p.method
FROM payments p JOIN invoices i ON i.invoice_id = p.invoice_id ORDER BY p.payment_id LIMIT 12`,
    syntax: `SELECT payer, COUNT(*), AVG(julianday(payment_date) - julianday(invoice_date)) AS avg_days
FROM payments JOIN invoices ... LEFT JOIN payors ...
GROUP BY payer;`,
    sql: `WITH pay AS (
  SELECT p.payment_id, p.invoice_id, p.amount, p.payment_date,
         COALESCE(py.payor_name, 'Patient') AS payer,
         julianday(p.payment_date) - julianday(i.invoice_date) AS days_to_pay
  FROM payments p
  JOIN invoices i ON i.invoice_id = p.invoice_id
  LEFT JOIN payors py ON py.payor_id = p.payor_id
  WHERE p.payment_id <> 47            -- exclude the duplicate payment that was refunded
),
milestones AS (
  SELECT i.invoice_id, i.invoice_date, i.total_amount,
         MIN(p.payment_date) AS first_payment,
         (SELECT MIN(x.payment_date) FROM (
            SELECT payment_date,
                   SUM(amount) OVER (ORDER BY payment_date, payment_id) AS cum_paid
            FROM payments WHERE invoice_id = i.invoice_id AND payment_id <> 47) x
          WHERE x.cum_paid >= i.total_amount) AS paid_in_full
  FROM invoices i
  JOIN payments p ON p.invoice_id = i.invoice_id
  GROUP BY i.invoice_id
)
SELECT payer, COUNT(*) AS payments, SUM(amount) AS collected,
       ROUND(AVG(days_to_pay), 1) AS avg_days,
       ROUND(SUM(amount * days_to_pay) / SUM(amount), 1) AS amount_weighted_days,
       (SELECT ROUND(AVG(julianday(paid_in_full) - julianday(invoice_date)), 1)
        FROM milestones WHERE paid_in_full IS NOT NULL) AS all_invoices_avg_days_to_full
FROM pay
GROUP BY payer
ORDER BY avg_days, payer;`,
    breakdown: [
      ['pay: COALESCE(py.payor_name, \'Patient\')', 'Payments with no payor were made by the patient.'],
      ['WHERE p.payment_id <> 47', 'Leave out the known duplicate so it does not distort timing.'],
      ['milestones: correlated running SUM', 'For each invoice, the first date cumulative payments reached the total.'],
      ['SUM(amount * days_to_pay) / SUM(amount)', 'Dollar-weighted days: large payments count more than small ones.'],
      ['all_invoices_avg_days_to_full', 'A practice-wide benchmark shown on every row.'],
    ],
    visual: { type: 'er', tables: ['invoices', 'payments', 'payors'] },
    mistakes: [
      { wrong: `SELECT py.payor_name, AVG(julianday(p.payment_date) - julianday(i.invoice_date))
FROM payments p JOIN invoices i ON i.invoice_id = p.invoice_id JOIN payors py ON py.payor_id = i.payor_id
GROUP BY py.payor_name;`, why: 'This uses the INVOICE payor, so the patient\'s own copay payments are credited to the insurer and slow its average down.', fix: `SELECT COALESCE(py.payor_name, 'Patient') AS payer, AVG(julianday(p.payment_date) - julianday(i.invoice_date))
FROM payments p JOIN invoices i ON i.invoice_id = p.invoice_id LEFT JOIN payors py ON py.payor_id = p.payor_id
GROUP BY 1;` },
    ],
    rules: [
      'Attribute each payment to who actually paid (payments.payor_id).',
      'Exclude or net out known duplicates and reversals.',
      'Report both simple and dollar-weighted averages.',
      'Use the invoice date (or claim submission date) consistently as the start.',
    ],
    compare: `<table><tr><th>Metric</th><th>Meaning</th></tr>
<tr><td>Days to first payment</td><td>How fast the payer responds</td></tr>
<tr><td>Days to paid in full</td><td>How long the invoice stays open</td></tr>
<tr><td>Days in A/R (DSO)</td><td>A/R balance / average daily charges</td></tr></table>`,
    realWorld: 'Payer scorecards (average days to pay by insurer) are used in contract negotiations and to enforce state prompt-pay laws (often 30-45 days for clean claims).',
    tryIt: {
      prompt: 'List invoices with their first payment date and days to first payment, slowest first.',
      starter: `SELECT i.invoice_id, i.invoice_date, MIN(p.payment_date) AS first_payment,
       CAST(julianday(MIN(p.payment_date)) - julianday(i.invoice_date) AS INTEGER) AS days_to_first
FROM invoices i JOIN payments p ON p.invoice_id = i.invoice_id
GROUP BY i.invoice_id
ORDER BY days_to_first DESC
LIMIT 10;`,
    },
    challenge: {
      level: 3,
      prompt: 'Deliverable: payment velocity by payer. Excluding the duplicate payment (payment_id 47), attribute each payment to payments.payor_id\'s payor_name (or \'Patient\' when NULL) and return payer, number of payments, total collected and average days from invoice_date to payment_date rounded to 1. Order by average days ascending, then payer.',
      solution: `SELECT COALESCE(py.payor_name, 'Patient') AS payer,
       COUNT(*) AS payments,
       SUM(p.amount) AS collected,
       ROUND(AVG(julianday(p.payment_date) - julianday(i.invoice_date)), 1) AS avg_days
FROM payments p
JOIN invoices i ON i.invoice_id = p.invoice_id
LEFT JOIN payors py ON py.payor_id = p.payor_id
WHERE p.payment_id <> 47
GROUP BY 1
ORDER BY avg_days, payer;`,
      hints: [
        'Join payments to invoices for invoice_date, and LEFT JOIN payors on payments.payor_id (not invoices.payor_id).',
        'COALESCE(payor_name, \'Patient\') is the payer label; exclude payment 47 in WHERE.',
        'Days = julianday(payment_date) - julianday(invoice_date); AVG and ROUND to 1.',
        'GROUP BY the payer label; ORDER BY avg_days, payer.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why join payors on payments.payor_id rather than invoices.payor_id?', options: ['It is faster', 'The patient\'s own payments must not be credited to the insurer', 'invoices.payor_id is always NULL', 'No reason'], answer: 1, why: 'An invoice can be paid partly by insurance and partly by the patient.' },
      { q: 'What does a dollar-weighted average days-to-pay emphasize?', options: ['Small payments', 'Large payments', 'Recent payments', 'Cash payments'], answer: 1, why: 'Each payment contributes in proportion to its amount.' },
    ],
  },

  // ---------------------------------------------------------------- P09
  {
    id: 'projects-09',
    goals: [
      'Build a data-quality report that runs many anomaly checks in one query',
      'Detect duplicate patients and duplicate payments',
      'Detect overpaid invoices, missing NPIs and inconsistent statuses',
      'Combine all checks into one list with UNION ALL',
    ],
    concept: `<p><b>Business question:</b> "What is wrong in our data right now?" A good anomaly report runs every known check and returns one row per problem: <b>check name, record id, detail</b>.</p>
<p>Each check is a small query. UNION ALL stacks them into one list:</p>
<pre>-- check 1: duplicate patients (same name + DOB, not the first id)
SELECT 'Duplicate patient', patient_id, ... FROM (... ROW_NUMBER() ... ) WHERE rn &gt; 1
UNION ALL
-- check 2: duplicate payments (same invoice, date, amount, method, payor)
SELECT 'Duplicate payment', payment_id, ... WHERE rn &gt; 1
UNION ALL
-- check 3: overpaid invoices (payments &gt; total_amount)
SELECT 'Overpaid invoice', invoice_id, ...
UNION ALL
-- check 4: practitioners without NPI (cannot bill insurance)
SELECT 'Missing NPI', practitioner_id, ...
UNION ALL
-- check 5: status says Paid but ledger balance is not 0
SELECT 'Paid status with balance', invoice_id, ...</pre>
<p>Each branch returns the same three columns, so the result is a single, sortable work list for the data steward.</p>`,
    why: 'Bad data silently corrupts every report. A single, scheduled anomaly query catches problems early and gives someone a list to fix.',
    when: 'Run it nightly or before month-end close, after imports, and before building analytics on a new data set.',
    analogy: 'A pre-flight checklist: many small checks, each either OK or a line on the problem list for the crew.',
    exampleTables: ['patients', 'payments'],
    exampleSql: `SELECT patient_id, first_name, last_name, date_of_birth FROM patients WHERE last_name IN ('Garcia', 'Smith') ORDER BY patient_id`,
    syntax: `SELECT 'check A' AS check_name, id, detail FROM ... WHERE <rule A>
UNION ALL
SELECT 'check B', id, detail FROM ... WHERE <rule B>
ORDER BY check_name, id;`,
    sql: `WITH dup_patients AS (
  SELECT patient_id, first_name || ' ' || last_name AS name,
         ROW_NUMBER() OVER (PARTITION BY first_name, last_name, date_of_birth ORDER BY patient_id) AS rn,
         MIN(patient_id) OVER (PARTITION BY first_name, last_name, date_of_birth) AS keep_id
  FROM patients
),
dup_payments AS (
  SELECT payment_id, invoice_id,
         ROW_NUMBER() OVER (PARTITION BY invoice_id, payment_date, amount, method, payor_id ORDER BY payment_id) AS rn
  FROM payments
),
paid AS (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id),
ledger AS (SELECT invoice_id, ROUND(SUM(amount), 2) AS balance FROM transactions GROUP BY invoice_id)
SELECT 'Duplicate patient' AS check_name, patient_id AS record_id, name || ' duplicates patient ' || keep_id AS detail
FROM dup_patients WHERE rn > 1
UNION ALL
SELECT 'Duplicate payment', payment_id, 'Repeats a payment on invoice ' || invoice_id
FROM dup_payments WHERE rn > 1
UNION ALL
SELECT 'Overpaid invoice', i.invoice_id, 'Paid ' || p.paid || ' on a total of ' || i.total_amount
FROM invoices i JOIN paid p ON p.invoice_id = i.invoice_id
WHERE p.paid > i.total_amount
UNION ALL
SELECT 'Missing NPI', practitioner_id, first_name || ' ' || last_name || ' has no NPI'
FROM practitioners WHERE npi IS NULL
UNION ALL
SELECT 'Paid status with balance', i.invoice_id, 'Ledger balance ' || l.balance
FROM invoices i JOIN ledger l ON l.invoice_id = i.invoice_id
WHERE i.status = 'Paid' AND l.balance <> 0
ORDER BY check_name, record_id;`,
    breakdown: [
      ['dup_patients / dup_payments', 'ROW_NUMBER over the match key: rn > 1 means "not the first copy".'],
      ['paid / ledger', 'Helper summaries for the money checks.'],
      ['SELECT \'Duplicate patient\' ... UNION ALL ...', 'Each check returns (check_name, record_id, detail).'],
      ['WHERE p.paid > i.total_amount', 'Overpayment: more money received than billed (invoice 1).'],
      ['WHERE i.status = \'Paid\' AND l.balance <> 0', 'A status that contradicts the ledger (returns nothing today, which is good).'],
    ],
    visual: { type: 'flow', steps: [['check 1: duplicate patients', '1 row (patient 25)'], ['check 2: duplicate payments', '1 row (payment 47)'], ['check 3: overpaid invoices', '1 row (invoice 1)'], ['check 4: missing NPI', '1 row (practitioner 12)'], ['check 5: Paid with balance', '0 rows'], ['UNION ALL + ORDER BY', 'one work list']] },
    mistakes: [
      { wrong: `SELECT 'Missing NPI', practitioner_id FROM practitioners WHERE npi IS NULL
UNION ALL
SELECT 'Overpaid', invoice_id, total_amount FROM invoices;`, why: 'All branches of a UNION must return the same number of columns.', fix: `SELECT 'Missing NPI', practitioner_id, NULL FROM practitioners WHERE npi IS NULL
UNION ALL
SELECT 'Overpaid', invoice_id, total_amount FROM invoices WHERE 0;` },
      { wrong: `SELECT 'Missing NPI', practitioner_id FROM practitioners WHERE npi = NULL;`, why: '= NULL is never true; the check silently finds nothing.', fix: `SELECT 'Missing NPI', practitioner_id FROM practitioners WHERE npi IS NULL;` },
    ],
    rules: [
      'One branch per rule; same column list in every branch.',
      'Name each check clearly: the result is read by humans.',
      'A check that returns 0 rows is a pass.',
      'Use ROW_NUMBER to flag only the extra copies, never the original.',
    ],
    compare: `<table><tr><th>Check type</th><th>Example</th></tr>
<tr><td>Uniqueness</td><td>Duplicate patients / payments</td></tr>
<tr><td>Completeness</td><td>Missing NPI, missing payor</td></tr>
<tr><td>Consistency</td><td>Status vs ledger balance</td></tr>
<tr><td>Validity</td><td>Payments greater than billed</td></tr></table>`,
    realWorld: 'Billing data-integrity dashboards, claim scrubbers (edits before submission) and payment-integrity audits are collections of exactly these rule queries.',
    deep: `<p>Mature teams store rules as rows (<code>rule_id, name, sql</code>) and run them with a scheduler, logging counts over time. Tools like dbt tests and Great Expectations formalize the same idea.</p>`,
    tryIt: {
      prompt: 'Add another check: invoices whose charges do not add up to total_amount (non-void). Does it find anything?',
      starter: `SELECT 'Charges mismatch' AS check_name, i.invoice_id AS record_id,
       'Total ' || i.total_amount || ' vs charges ' || TOTAL(c.amount) AS detail
FROM invoices i LEFT JOIN charges c ON c.invoice_id = i.invoice_id
WHERE i.status <> 'Void'
GROUP BY i.invoice_id
HAVING ROUND(TOTAL(c.amount), 2) <> ROUND(i.total_amount, 2);`,
    },
    challenge: {
      level: 4,
      prompt: 'Deliverable: a single anomaly list with columns check_name and record_id, combining four checks: \'Duplicate patient\' (patient_id of every copy after the lowest id with the same first name, last name and date of birth), \'Duplicate payment\' (payment_id of every copy after the lowest with the same invoice_id, payment_date, amount, method and payor_id), \'Overpaid invoice\' (invoice_id where total payments exceed total_amount), \'Missing NPI\' (practitioner_id with NULL npi). Order by check_name, record_id.',
      solution: `SELECT 'Duplicate patient' AS check_name, patient_id AS record_id FROM (
  SELECT patient_id, ROW_NUMBER() OVER (PARTITION BY first_name, last_name, date_of_birth ORDER BY patient_id) AS rn
  FROM patients) WHERE rn > 1
UNION ALL
SELECT 'Duplicate payment', payment_id FROM (
  SELECT payment_id, ROW_NUMBER() OVER (PARTITION BY invoice_id, payment_date, amount, method, payor_id ORDER BY payment_id) AS rn
  FROM payments) WHERE rn > 1
UNION ALL
SELECT 'Overpaid invoice', i.invoice_id
FROM invoices i JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) p ON p.invoice_id = i.invoice_id
WHERE p.paid > i.total_amount
UNION ALL
SELECT 'Missing NPI', practitioner_id FROM practitioners WHERE npi IS NULL
ORDER BY check_name, record_id;`,
      hints: [
        'Write each check as its own SELECT returning (check_name, record_id).',
        'Duplicates: ROW_NUMBER() OVER (PARTITION BY the match columns ORDER BY id) in a subquery, keep rn > 1.',
        'Overpaid: join invoices to payments summed per invoice, keep paid > total_amount. Missing NPI: WHERE npi IS NULL.',
        'Glue the four with UNION ALL and put one ORDER BY check_name, record_id at the end.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why UNION ALL rather than UNION for an anomaly report?', options: ['UNION is not allowed', 'Each problem row should be kept; there is no need to pay for duplicate removal', 'UNION ALL sorts', 'UNION ALL removes NULLs'], answer: 1, why: 'Checks produce distinct rows anyway; UNION would just add a sort/dedup step.' },
      { q: 'A check returns zero rows. What does it mean?', options: ['The query is broken', 'The rule passed: no records violate it', 'The table is empty', 'NULLs were ignored'], answer: 1, why: 'Anomaly checks list violations; none means clean (assuming the rule itself is correct).' },
    ],
  },

  // ---------------------------------------------------------------- P10
  {
    id: 'projects-10',
    goals: [
      'Build a one-page revenue-cycle KPI report in a single query',
      'Compute gross charges, collections, adjustments and net collection rate',
      'Compute A/R, days in A/R and % of A/R over 90 days',
      'Combine several CTEs into one KPI row, then unpivot for display',
    ],
    concept: `<p><b>Business question:</b> "How healthy is our revenue cycle?" Executives want a handful of standard KPIs on one page, as of <b>2026-09-01</b>:</p>
<ul>
<li><b>Gross charges</b>: all CHARGE entries.</li>
<li><b>Net collections</b>: PAYMENT + REFUND entries (sign flipped).</li>
<li><b>Adjustments</b>: ADJUSTMENT + WRITE_OFF entries (sign flipped).</li>
<li><b>Net collection rate</b> = collections / (charges - adjustments). Healthy practices reach 95%+.</li>
<li><b>A/R balance</b> = sum of all ledger entries; <b>% A/R over 90 days</b> past due.</li>
<li><b>Days in A/R</b> = A/R balance / average daily charges over the last 90 days.</li>
</ul>
<p><b>Step 1: ledger totals by type.</b></p>
<pre>WITH totals AS (
  SELECT SUM(CASE WHEN transaction_type = 'CHARGE' THEN amount ELSE 0 END) AS charges,
         -SUM(CASE WHEN transaction_type IN ('PAYMENT','REFUND') THEN amount ELSE 0 END) AS collections,
         -SUM(CASE WHEN transaction_type IN ('ADJUSTMENT','WRITE_OFF') THEN amount ELSE 0 END) AS adjustments,
         SUM(amount) AS ar_balance
  FROM transactions WHERE transaction_date &lt;= '2026-09-01'
)</pre>
<p><b>Step 2: A/R over 90 days</b> from invoice balances and due dates.</p>
<p><b>Step 3: recent daily charges</b>: charges in the 90 days before the as-of date, divided by 90.</p>
<p><b>Step 4: one row of KPIs</b> from a CROSS JOIN of the one-row CTEs, then unpivot with UNION ALL into a readable (kpi, value) list.</p>`,
    why: 'KPIs condense the whole revenue cycle into numbers that can be tracked month over month and compared with industry benchmarks.',
    when: 'Use it for monthly executive reporting, board packs and revenue-cycle vendor reviews.',
    analogy: 'A car dashboard: speed, fuel, temperature and warning lights on one panel, each computed from many sensors underneath.',
    exampleTables: ['transactions'],
    exampleSql: `SELECT transaction_type, COUNT(*) AS entries, SUM(amount) AS amount FROM transactions GROUP BY transaction_type ORDER BY transaction_type`,
    syntax: `WITH a AS (one-row totals), b AS (one-row totals), c AS (one-row totals)
SELECT 'KPI 1' AS kpi, <expr> AS value FROM a, b, c
UNION ALL
SELECT 'KPI 2', <expr> FROM a, b, c;`,
    sql: `WITH totals AS (
  SELECT SUM(CASE WHEN transaction_type = 'CHARGE' THEN amount ELSE 0 END)                         AS charges,
         -SUM(CASE WHEN transaction_type IN ('PAYMENT', 'REFUND') THEN amount ELSE 0 END)          AS collections,
         -SUM(CASE WHEN transaction_type IN ('ADJUSTMENT', 'WRITE_OFF') THEN amount ELSE 0 END)    AS adjustments,
         SUM(amount)                                                                               AS ar_balance
  FROM transactions
  WHERE transaction_date <= '2026-09-01'
),
inv_bal AS (
  SELECT i.invoice_id, i.due_date, SUM(t.amount) AS balance
  FROM invoices i JOIN transactions t ON t.invoice_id = i.invoice_id
  GROUP BY i.invoice_id
),
aging AS (
  SELECT TOTAL(CASE WHEN julianday('2026-09-01') - julianday(due_date) > 90 THEN balance END) AS ar_over_90
  FROM inv_bal WHERE balance > 0
),
recent AS (
  SELECT TOTAL(amount) / 90.0 AS avg_daily_charges
  FROM transactions
  WHERE transaction_type = 'CHARGE'
    AND transaction_date > date('2026-09-01', '-90 days') AND transaction_date <= '2026-09-01'
),
kpi AS (SELECT * FROM totals, aging, recent)
SELECT 1 AS k, 'Gross charges' AS kpi, ROUND(charges, 2) AS value FROM kpi
UNION ALL SELECT 2, 'Net collections', ROUND(collections, 2) FROM kpi
UNION ALL SELECT 3, 'Adjustments + write-offs', ROUND(adjustments, 2) FROM kpi
UNION ALL SELECT 4, 'Net collection rate %', ROUND(100.0 * collections / (charges - adjustments), 1) FROM kpi
UNION ALL SELECT 5, 'A/R balance', ROUND(ar_balance, 2) FROM kpi
UNION ALL SELECT 6, '% of A/R over 90 days', ROUND(100.0 * ar_over_90 / ar_balance, 1) FROM kpi
UNION ALL SELECT 7, 'Days in A/R', ROUND(ar_balance / avg_daily_charges, 1) FROM kpi
ORDER BY k;`,
    breakdown: [
      ['totals', 'One pass over the ledger: charges, collections, adjustments and A/R balance with conditional SUMs.'],
      ['inv_bal / aging', 'Invoice balances, and the part more than 90 days past due.'],
      ['recent', 'Average daily charges over the 90 days before the as-of date.'],
      ['kpi AS (SELECT * FROM totals, aging, recent)', 'Cross join of one-row CTEs = one wide KPI row.'],
      ['UNION ALL ... ORDER BY k', 'Unpivot into a readable (kpi, value) list in a fixed order.'],
    ],
    visual: { type: 'flow', steps: [['transactions', 'ledger totals by type'], ['invoices + transactions', 'A/R over 90 days'], ['last 90 days of CHARGE', 'average daily charges'], ['CROSS JOIN one-row CTEs', 'one wide KPI row'], ['UNION ALL unpivot', '7 KPI rows']] },
    mistakes: [
      { wrong: `SELECT SUM(amount) FILTER (WHERE transaction_type = 'PAYMENT') / SUM(amount) FILTER (WHERE transaction_type = 'CHARGE') AS collection_rate
FROM transactions;`, why: 'Payments are negative in the ledger, so the rate is negative; it also ignores refunds (the duplicate payment) and adjustments, which the net collection rate must exclude from the denominator.', fix: `SELECT ROUND(100.0 * -SUM(CASE WHEN transaction_type IN ('PAYMENT','REFUND') THEN amount ELSE 0 END)
       / (SUM(CASE WHEN transaction_type = 'CHARGE' THEN amount ELSE 0 END)
          + SUM(CASE WHEN transaction_type IN ('ADJUSTMENT','WRITE_OFF') THEN amount ELSE 0 END)), 1) AS net_collection_rate
FROM transactions;` },
    ],
    rules: [
      'Know the sign convention of every amount column.',
      'Use one fixed as-of date for every KPI.',
      'Build each KPI ingredient in its own small CTE, then combine.',
      'Document formulas next to the numbers; KPI names mean different things in different organizations.',
    ],
    compare: `<table><tr><th>KPI</th><th>Formula</th><th>Typical target</th></tr>
<tr><td>Net collection rate</td><td>collections / (charges - contractual adjustments)</td><td>95%+</td></tr>
<tr><td>Days in A/R</td><td>A/R / average daily charges</td><td>under 40-50 days</td></tr>
<tr><td>% A/R over 90 days</td><td>A/R 90+ / total A/R</td><td>under 15-20%</td></tr>
<tr><td>Gross collection rate</td><td>collections / charges</td><td>varies by payor mix</td></tr></table>`,
    realWorld: 'This is the "KPI page" in revenue-cycle management (RCM) reports that practices, hospital CFOs and billing vendors review monthly (HFMA MAP keys use the same definitions).',
    deep: `<p>Our sample A/R includes invoices billed in the last few days (due 2026-09-27) and old, uncollected balances, so days in A/R looks high; the small data set exaggerates it. In production you would compute KPIs per month (GROUP BY month) and trend them, not just a single snapshot.</p>`,
    tryIt: {
      prompt: 'Show the wide one-row version of the KPIs instead of the unpivoted list.',
      starter: `SELECT SUM(CASE WHEN transaction_type = 'CHARGE' THEN amount ELSE 0 END) AS charges,
       -SUM(CASE WHEN transaction_type IN ('PAYMENT','REFUND') THEN amount ELSE 0 END) AS collections,
       -SUM(CASE WHEN transaction_type IN ('ADJUSTMENT','WRITE_OFF') THEN amount ELSE 0 END) AS adjustments,
       SUM(amount) AS ar_balance
FROM transactions;`,
    },
    challenge: {
      level: 4,
      prompt: 'Deliverable: KPIs per calendar year of transaction_date. Return year, gross charges (CHARGE), net collections (PAYMENT + REFUND, positive), adjustments (ADJUSTMENT + WRITE_OFF, positive) and net collection rate % = collections / (charges - adjustments) × 100 rounded to 1. Order by year.',
      solution: `WITH y AS (
  SELECT strftime('%Y', transaction_date) AS year,
         SUM(CASE WHEN transaction_type = 'CHARGE' THEN amount ELSE 0 END) AS charges,
         -SUM(CASE WHEN transaction_type IN ('PAYMENT', 'REFUND') THEN amount ELSE 0 END) AS collections,
         -SUM(CASE WHEN transaction_type IN ('ADJUSTMENT', 'WRITE_OFF') THEN amount ELSE 0 END) AS adjustments
  FROM transactions
  GROUP BY 1
)
SELECT year, charges, collections, adjustments,
       ROUND(100.0 * collections / (charges - adjustments), 1) AS net_collection_rate
FROM y
ORDER BY year;`,
      hints: [
        'Group transactions by strftime(\'%Y\', transaction_date).',
        'Use conditional sums: SUM(CASE WHEN transaction_type = \'CHARGE\' THEN amount ELSE 0 END), etc.',
        'Payments, refunds, adjustments and write-offs have ledger signs; negate the sums to report positive numbers.',
        'Rate = ROUND(100.0 * collections / (charges - adjustments), 1) computed in an outer SELECT; ORDER BY year.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why subtract adjustments from charges in the net collection rate?', options: ['To make the number bigger', 'Adjusted and written-off amounts were never collectible, so they are removed from the base', 'Adjustments are payments', 'It is optional'], answer: 1, why: 'Net collection rate measures how much of the collectible amount was collected.' },
      { q: 'How is days in A/R computed here?', options: ['A/R / average daily charges', 'Charges / payments', 'Average of invoice ages', 'Days since the oldest invoice'], answer: 0, why: 'It expresses A/R as the number of days of charges it represents.' },
    ],
  },
]);
