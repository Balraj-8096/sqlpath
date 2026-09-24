// Practice Mode challenge bank. Every solution runs on the Healthcare Billing sample DB (SQLite).
// level: 1 Beginner, 2 Intermediate, 3 Advanced, 4 Expert. Grading compares result values with the solution.
window.PracticeBank = [
  // ───────────────────────── Level 1: Beginner ─────────────────────────
  { id: 'pc-001', title: 'Patients without allergies', level: 1, topic: 'Filtering',
    prompt: 'Find patients without allergies. Return patient_id, first_name and last_name, ordered by patient_id.',
    solution: `SELECT patient_id, first_name, last_name
FROM patients
WHERE allergies IS NULL
ORDER BY patient_id;`,
    ordered: true,
    hints: ['Everything you need is in the patients table.', 'A patient with no allergies has a NULL in the allergies column.', 'NULL is tested with IS NULL, never with = NULL.', 'SELECT patient_id, first_name, last_name FROM patients WHERE allergies IS NULL ORDER BY ...'],
    explain: 'allergies IS NULL keeps rows where the value is missing. "= NULL" would compare with an unknown value and return no rows at all.' },

  { id: 'pc-002', title: 'Find unpaid invoices', level: 1, topic: 'Filtering',
    prompt: 'Find unpaid invoices: invoices whose status is Open, Overdue or Partially Paid. Return invoice_id, patient_id, status and total_amount, ordered by invoice_id.',
    solution: `SELECT invoice_id, patient_id, status, total_amount
FROM invoices
WHERE status IN ('Open', 'Overdue', 'Partially Paid')
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['Use the invoices table.', 'You are filtering on the status column with several allowed values.', 'IN (...) is shorter than several OR conditions.', "WHERE status IN ('Open', 'Overdue', 'Partially Paid')"],
    explain: "IN matches any value in the list. status NOT IN ('Paid', 'Void') would give the same rows here, because status is never NULL." },

  { id: 'pc-003', title: 'Active payors by contract rate', level: 1, topic: 'Fundamentals',
    prompt: 'List active payors (is_active = 1) with payor_name and contract_rate, highest contract_rate first (ties by payor_name).',
    solution: `SELECT payor_name, contract_rate
FROM payors
WHERE is_active = 1
ORDER BY contract_rate DESC, payor_name;`,
    ordered: true,
    hints: ['Use the payors table.', 'Active payors have is_active = 1.', 'Sort with ORDER BY ... DESC.', 'ORDER BY contract_rate DESC, payor_name'],
    explain: 'WHERE removes the inactive payor (Cigna Select), and ORDER BY sorts the remaining six. The second sort key makes the order fully deterministic.' },

  { id: 'pc-004', title: 'Patients living in Dallas', level: 1, topic: 'Filtering',
    prompt: 'List the first_name and last_name of patients who live in Dallas, ordered by last_name.',
    solution: `SELECT first_name, last_name
FROM patients
WHERE city = 'Dallas'
ORDER BY last_name;`,
    ordered: true,
    hints: ['Use the patients table.', 'Filter rows on the city column.', "Text values go in single quotes: 'Dallas'.", "WHERE city = 'Dallas' ORDER BY last_name"],
    explain: 'A simple equality filter. Patients with a NULL city are not Dallas and not "not Dallas" either; they are simply excluded.' },

  { id: 'pc-005', title: 'Invoices over $500', level: 1, topic: 'Filtering',
    prompt: 'Show invoice_id, invoice_date and total_amount for invoices with a total above 500, largest first.',
    solution: `SELECT invoice_id, invoice_date, total_amount
FROM invoices
WHERE total_amount > 500
ORDER BY total_amount DESC;`,
    ordered: true,
    hints: ['Use the invoices table.', 'Compare total_amount with a number.', 'Use > 500 in WHERE.', 'ORDER BY total_amount DESC'],
    explain: 'Numeric comparisons do not need quotes. Sorting DESC puts the biggest invoices first.' },

  { id: 'pc-006', title: 'Invoices per status', level: 1, topic: 'Aggregations',
    prompt: 'Count the invoices in each status. Return status and the count, ordered by status.',
    solution: `SELECT status, COUNT(*) AS invoice_count
FROM invoices
GROUP BY status
ORDER BY status;`,
    ordered: true,
    hints: ['Use the invoices table.', 'You need one output row per status.', 'GROUP BY status with COUNT(*).', 'SELECT status, COUNT(*) FROM invoices GROUP BY status ORDER BY status'],
    explain: 'GROUP BY collapses rows with the same status into one group, and COUNT(*) counts the rows in each group.' },

  { id: 'pc-007', title: 'Recent hires', level: 1, topic: 'Filtering',
    prompt: 'List practitioners hired on or after 2020-01-01: first_name, last_name, hire_date, oldest hire first.',
    solution: `SELECT first_name, last_name, hire_date
FROM practitioners
WHERE hire_date >= '2020-01-01'
ORDER BY hire_date;`,
    ordered: true,
    hints: ['Use the practitioners table.', "Dates are stored as 'YYYY-MM-DD' text, which sorts correctly.", "Compare with >= '2020-01-01'.", "WHERE hire_date >= '2020-01-01' ORDER BY hire_date"],
    explain: 'ISO date strings compare in the same order as the dates they represent, so a plain >= works.' },

  { id: 'pc-008', title: 'Patients with no email', level: 1, topic: 'Filtering',
    prompt: 'Find patients with no email address on file. Return patient_id, first_name and last_name, ordered by patient_id.',
    solution: `SELECT patient_id, first_name, last_name
FROM patients
WHERE email IS NULL
ORDER BY patient_id;`,
    ordered: true,
    hints: ['Use the patients table.', 'A missing email is NULL.', 'Use IS NULL.', 'WHERE email IS NULL ORDER BY patient_id'],
    explain: 'IS NULL finds missing values. These patients would need a paper statement instead of an e-mailed one.' },

  { id: 'pc-009', title: 'Top 5 invoices', level: 1, topic: 'Fundamentals',
    prompt: 'Return the 5 largest invoices: invoice_id and total_amount, largest first.',
    solution: `SELECT invoice_id, total_amount
FROM invoices
ORDER BY total_amount DESC
LIMIT 5;`,
    ordered: true,
    hints: ['Use the invoices table.', 'Sort so the biggest totals come first.', 'ORDER BY total_amount DESC.', 'Add LIMIT 5 at the end.'],
    explain: 'ORDER BY runs before LIMIT, so LIMIT 5 keeps the first five rows of the sorted result.' },

  { id: 'pc-010', title: 'Distinct procedure codes', level: 1, topic: 'Fundamentals',
    prompt: 'List each distinct cpt_code that appears in charges, in ascending order.',
    solution: `SELECT DISTINCT cpt_code
FROM charges
ORDER BY cpt_code;`,
    ordered: true,
    hints: ['Use the charges table.', 'Many charges share the same code.', 'DISTINCT removes duplicate rows.', 'SELECT DISTINCT cpt_code FROM charges ORDER BY cpt_code'],
    explain: 'DISTINCT keeps one copy of each value. GROUP BY cpt_code would produce the same list.' },

  { id: 'pc-011', title: 'Money collected by method', level: 1, topic: 'Aggregations',
    prompt: 'Show each payment method with the total amount collected, highest total first.',
    solution: `SELECT method, SUM(amount) AS collected
FROM payments
GROUP BY method
ORDER BY collected DESC;`,
    ordered: true,
    hints: ['Use the payments table.', 'One row per method.', 'GROUP BY method with SUM(amount).', 'ORDER BY the sum DESC.'],
    explain: 'SUM adds the amounts inside each method group. You can sort by the alias of an aggregate.' },

  { id: 'pc-012', title: 'Patient display names', level: 1, topic: 'Fundamentals',
    prompt: 'Return each patient\'s name as a single column formatted "Last, First" (e.g. "Garcia, Maria"), ordered by that name.',
    solution: `SELECT last_name || ', ' || first_name AS display_name
FROM patients
ORDER BY display_name;`,
    ordered: true,
    hints: ['Use the patients table.', 'You need to join two text columns into one.', 'SQLite concatenates text with ||.', "last_name || ', ' || first_name"],
    explain: '|| is the standard SQL concatenation operator (SQL Server uses +, MySQL uses CONCAT()). Both Maria Garcia records appear.' },

  { id: 'pc-013', title: 'Payors missing a phone number', level: 1, topic: 'Filtering',
    prompt: 'List payor_id and payor_name for payors that have no phone number.',
    solution: `SELECT payor_id, payor_name
FROM payors
WHERE phone IS NULL
ORDER BY payor_id;`,
    ordered: true,
    hints: ['Use the payors table.', 'Missing phone numbers are NULL.', 'Use IS NULL in WHERE.', 'WHERE phone IS NULL'],
    explain: 'IS NULL finds the missing values: United Workers Comp and Self-Pay.' },

  // ───────────────────────── Level 2: Intermediate ─────────────────────────
  { id: 'pc-014', title: 'Invoices with patient names', level: 2, topic: 'Joins',
    prompt: 'For invoices dated in 2026, return invoice_id, the patient\'s first_name and last_name, and total_amount, ordered by invoice_id.',
    solution: `SELECT i.invoice_id, p.first_name, p.last_name, i.total_amount
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id
WHERE i.invoice_date >= '2026-01-01'
ORDER BY i.invoice_id;`,
    ordered: true,
    hints: ['You need invoices and patients.', 'They are linked by patient_id.', 'INNER JOIN patients ON patients.patient_id = invoices.patient_id.', "Filter with WHERE i.invoice_date >= '2026-01-01'."],
    explain: 'The join attaches the patient row to each invoice through the foreign key; the WHERE clause then keeps 2026 invoices.' },

  { id: 'pc-015', title: 'Patients never invoiced', level: 2, topic: 'Joins',
    prompt: 'Find patients who have no invoices at all. Return patient_id, first_name and last_name, ordered by patient_id.',
    solution: `SELECT p.patient_id, p.first_name, p.last_name
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
WHERE i.invoice_id IS NULL
ORDER BY p.patient_id;`,
    ordered: true,
    hints: ['Start from patients.', 'LEFT JOIN invoices keeps patients with no match.', 'Unmatched rows have NULL in every invoice column.', 'WHERE i.invoice_id IS NULL'],
    explain: 'This is the anti-join pattern. NOT EXISTS (SELECT 1 FROM invoices WHERE patient_id = p.patient_id) is an equivalent answer.' },

  { id: 'pc-016', title: 'Billing per location', level: 2, topic: 'Joins',
    prompt: 'Show every treatment location\'s name with its total billed amount (0 for locations with no invoices). Order by the total DESC, then location_name.',
    solution: `SELECT l.location_name, COALESCE(SUM(i.total_amount), 0) AS billed
FROM treatment_locations l
LEFT JOIN invoices i ON i.location_id = l.location_id
GROUP BY l.location_id, l.location_name
ORDER BY billed DESC, l.location_name;`,
    ordered: true,
    hints: ['You need treatment_locations and invoices.', 'Every location must appear, even with no invoices: LEFT JOIN.', 'GROUP BY the location and SUM the totals.', 'SUM of no rows is NULL; wrap it in COALESCE(..., 0).'],
    explain: 'The LEFT JOIN keeps Eastside Family Clinic, which has no invoices, and COALESCE turns its NULL sum into 0.' },

  { id: 'pc-017', title: 'Who reports to whom', level: 2, topic: 'Joins',
    prompt: 'List each practitioner\'s last_name with their supervisor\'s last_name (NULL for the practitioner with no supervisor), ordered by practitioner_id.',
    solution: `SELECT p.last_name AS practitioner, s.last_name AS supervisor
FROM practitioners p
LEFT JOIN practitioners s ON s.practitioner_id = p.supervisor_id
ORDER BY p.practitioner_id;`,
    ordered: true,
    hints: ['Both people are in the practitioners table.', 'Join the table to itself using two aliases.', 's.practitioner_id = p.supervisor_id', 'Use LEFT JOIN so the top boss is not dropped.'],
    explain: 'A self join gives the same table two roles. The LEFT JOIN keeps Dr. Ramirez, whose supervisor_id is NULL.' },

  { id: 'pc-018', title: 'Charge lines per practitioner', level: 2, topic: 'Joins',
    prompt: 'For every practitioner, show practitioner_id, last_name and the number of charge lines they billed (0 if none). Order by the count DESC, then practitioner_id.',
    solution: `SELECT pr.practitioner_id, pr.last_name, COUNT(c.charge_id) AS charge_lines
FROM practitioners pr
LEFT JOIN charges c ON c.practitioner_id = pr.practitioner_id
GROUP BY pr.practitioner_id, pr.last_name
ORDER BY charge_lines DESC, pr.practitioner_id;`,
    ordered: true,
    hints: ['You need practitioners and charges.', 'Keep practitioners with no charges: LEFT JOIN.', 'COUNT(c.charge_id) counts only matched rows; COUNT(*) would count 1 for the unmatched row.', 'GROUP BY pr.practitioner_id, pr.last_name'],
    explain: 'COUNT(column) ignores NULLs, so the new hire Leo Martins shows 0. COUNT(*) would wrongly show 1 for him.' },

  { id: 'pc-019', title: 'Busy payors', level: 2, topic: 'Aggregations',
    prompt: 'Which payors appear on more than 5 invoices? Return payor_name and the invoice count, highest count first.',
    solution: `SELECT py.payor_name, COUNT(*) AS invoice_count
FROM invoices i
JOIN payors py ON py.payor_id = i.payor_id
GROUP BY py.payor_id, py.payor_name
HAVING COUNT(*) > 5
ORDER BY invoice_count DESC;`,
    ordered: true,
    hints: ['Join invoices to payors.', 'Count invoices per payor with GROUP BY.', 'A condition on an aggregate goes in HAVING, not WHERE.', 'HAVING COUNT(*) > 5'],
    explain: 'WHERE filters rows before grouping; HAVING filters the groups after COUNT(*) has been computed.' },

  { id: 'pc-020', title: 'Above-average invoices', level: 2, topic: 'Subqueries',
    prompt: 'List invoice_id and total_amount for invoices whose total is above the average invoice total, largest first (ties by invoice_id).',
    solution: `SELECT invoice_id, total_amount
FROM invoices
WHERE total_amount > (SELECT AVG(total_amount) FROM invoices)
ORDER BY total_amount DESC, invoice_id;`,
    ordered: true,
    hints: ['Use the invoices table.', 'You need the overall average first.', 'Aggregates are not allowed directly in WHERE, but a scalar subquery is.', 'WHERE total_amount > (SELECT AVG(total_amount) FROM invoices)'],
    explain: 'The scalar subquery returns one value (about 241.04) that every row is compared against.' },

  { id: 'pc-021', title: 'Cities with patients and clinics', level: 2, topic: 'Set Operations',
    prompt: 'List the cities that have both at least one patient and at least one treatment location.',
    solution: `SELECT city FROM patients
INTERSECT
SELECT city FROM treatment_locations
ORDER BY city;`,
    ordered: true,
    hints: ['Cities are in patients and in treatment_locations.', 'You want values present in both lists.', 'That is the INTERSECT set operator.', 'SELECT city FROM patients INTERSECT SELECT city FROM treatment_locations'],
    explain: 'INTERSECT returns distinct rows found in both queries. NULL patient cities do not match any location city.' },

  { id: 'pc-022', title: 'Every city we serve', level: 2, topic: 'Set Operations',
    prompt: 'Produce one de-duplicated list of all known cities from patients and treatment_locations (ignore NULL cities), in alphabetical order.',
    solution: `SELECT city FROM patients WHERE city IS NOT NULL
UNION
SELECT city FROM treatment_locations
ORDER BY city;`,
    ordered: true,
    hints: ['Combine the city column from two tables.', 'UNION removes duplicates, UNION ALL does not.', 'Filter out NULL cities in the patients part.', 'A single ORDER BY at the end sorts the combined result.'],
    explain: 'UNION stacks both results and removes duplicates. The ORDER BY applies to the whole combined result.' },

  { id: 'pc-023', title: 'Payors never billed', level: 2, topic: 'Set Operations',
    prompt: 'Using a set operator, return the payor_id of every payor that never appears on an invoice.',
    solution: `SELECT payor_id FROM payors
EXCEPT
SELECT payor_id FROM invoices
ORDER BY payor_id;`,
    ordered: true,
    hints: ['Start with all payor ids.', 'Remove the ones used on invoices.', 'EXCEPT returns rows in the first query that are not in the second.', 'SELECT payor_id FROM payors EXCEPT SELECT payor_id FROM invoices'],
    explain: 'EXCEPT treats NULLs as equal to each other, so the NULL payor_ids in invoices do not cause the NOT IN trap.' },

  { id: 'pc-024', title: 'Invoices per month in 2025', level: 2, topic: 'Aggregations',
    prompt: 'For 2025, count invoices per month. Return the month as \'YYYY-MM\' and the count, in month order.',
    solution: `SELECT strftime('%Y-%m', invoice_date) AS month, COUNT(*) AS invoices
FROM invoices
WHERE invoice_date >= '2025-01-01' AND invoice_date < '2026-01-01'
GROUP BY month
ORDER BY month;`,
    ordered: true,
    hints: ['Use the invoices table.', "strftime('%Y-%m', invoice_date) extracts the month.", 'Filter to 2025 before grouping.', 'GROUP BY the month expression and COUNT(*).'],
    explain: 'strftime formats the date into a month key, and GROUP BY counts per key. Note that January has no row: grouping cannot invent empty months.' },

  { id: 'pc-025', title: 'Patient ages', level: 2, topic: 'Fundamentals',
    prompt: 'Treat today as 2026-09-01. Return patient_id and each patient\'s age in whole years, oldest first (ties by patient_id).',
    solution: `SELECT patient_id,
       (CAST(strftime('%Y', '2026-09-01') AS INTEGER) - CAST(strftime('%Y', date_of_birth) AS INTEGER))
       - (strftime('%m-%d', '2026-09-01') < strftime('%m-%d', date_of_birth)) AS age
FROM patients
ORDER BY age DESC, patient_id;`,
    ordered: true,
    hints: ['Use patients.date_of_birth.', 'Age = difference in years, minus 1 if the birthday has not happened yet this year.', "Compare strftime('%m-%d', ...) of today and of the birth date.", 'In SQLite a comparison returns 1 or 0, so you can subtract it directly.'],
    explain: 'Subtracting birth years overcounts people whose birthday is later in the year; the month-day comparison (1 or 0) corrects it. Dividing days by 365.25 is close but can be off by one around birthdays.' },

  { id: 'pc-026', title: 'Follow-up labels', level: 2, topic: 'Fundamentals',
    prompt: "Label each invoice: 'Closed' for Paid or Void, 'Collections' for Overdue, otherwise 'In progress'. Return invoice_id, status and the label, ordered by invoice_id.",
    solution: `SELECT invoice_id, status,
       CASE WHEN status IN ('Paid', 'Void') THEN 'Closed'
            WHEN status = 'Overdue' THEN 'Collections'
            ELSE 'In progress' END AS label
FROM invoices
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['Use the invoices table.', 'You need a conditional value per row.', 'CASE WHEN ... THEN ... ELSE ... END', 'Check Paid/Void first, then Overdue, else In progress.'],
    explain: 'CASE evaluates the WHEN branches in order and returns the first match, falling back to ELSE.' },

  // ───────────────────────── Level 3: Advanced ─────────────────────────
  { id: 'pc-027', title: 'Second-highest invoice per location', level: 3, topic: 'Window Functions',
    prompt: 'For each location, return location_id and its second-highest distinct invoice total. Order by location_id.',
    solution: `WITH r AS (
  SELECT DISTINCT location_id, total_amount,
         DENSE_RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) AS rnk
  FROM invoices
)
SELECT location_id, total_amount
FROM r
WHERE rnk = 2
ORDER BY location_id;`,
    ordered: true,
    hints: ['Use the invoices table.', 'You need a ranking inside each location.', 'DENSE_RANK() OVER (PARTITION BY location_id ORDER BY total_amount DESC) handles ties.', 'Wrap it in a CTE and keep rnk = 2.'],
    explain: 'DENSE_RANK gives tied totals the same rank without gaps, so rank 2 is the second-highest distinct value in each partition. This is the "Nth highest per group" pattern.' },

  { id: 'pc-028', title: 'Each patient\'s largest invoice', level: 3, topic: 'Window Functions',
    prompt: 'For each patient, return patient_id, invoice_id and total_amount of their largest invoice (return all invoices if tied). Order by patient_id, invoice_id.',
    solution: `WITH r AS (
  SELECT patient_id, invoice_id, total_amount,
         RANK() OVER (PARTITION BY patient_id ORDER BY total_amount DESC) AS rnk
  FROM invoices
)
SELECT patient_id, invoice_id, total_amount
FROM r
WHERE rnk = 1
ORDER BY patient_id, invoice_id;`,
    ordered: true,
    hints: ['Use the invoices table.', 'Rank invoices within each patient.', 'RANK() keeps ties at 1; ROW_NUMBER() would keep only one.', 'Filter rnk = 1 in an outer query.'],
    explain: 'RANK() = 1 returns every invoice tied for the maximum. A correlated subquery (total_amount = (SELECT MAX(...) ... same patient)) is an equivalent answer.' },

  { id: 'pc-029', title: 'Cumulative monthly billing', level: 3, topic: 'Window Functions',
    prompt: 'Show billed amount per month (\'YYYY-MM\') and the cumulative total billed up to and including that month, in month order.',
    solution: `SELECT strftime('%Y-%m', invoice_date) AS month,
       SUM(total_amount) AS billed,
       SUM(SUM(total_amount)) OVER (ORDER BY strftime('%Y-%m', invoice_date)) AS cumulative
FROM invoices
GROUP BY month
ORDER BY month;`,
    ordered: true,
    hints: ['Group invoices by month first.', 'A running total is SUM() OVER (ORDER BY ...).', 'You can nest an aggregate inside a window: SUM(SUM(total_amount)) OVER (...).', 'Or put the monthly totals in a CTE and run SUM(billed) OVER (ORDER BY month).'],
    explain: 'Window functions run after GROUP BY, so SUM(SUM(x)) OVER (ORDER BY month) sums the monthly totals cumulatively.' },

  { id: 'pc-030', title: 'Outstanding balance per patient', level: 3, topic: 'Subqueries',
    prompt: 'For each patient who still owes money on non-Void invoices, return patient_id and the outstanding balance (sum of invoice totals minus sum of payments). Largest balance first, ties by patient_id.',
    solution: `WITH paid AS (
  SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id
)
SELECT i.patient_id, SUM(i.total_amount - COALESCE(p.paid, 0)) AS balance
FROM invoices i
LEFT JOIN paid p ON p.invoice_id = i.invoice_id
WHERE i.status <> 'Void'
GROUP BY i.patient_id
HAVING balance > 0
ORDER BY balance DESC, i.patient_id;`,
    ordered: true,
    hints: ['You need invoices and payments.', 'Pre-aggregate payments per invoice first to avoid fan-out.', 'LEFT JOIN the per-invoice payments and COALESCE missing ones to 0.', 'GROUP BY patient_id and keep HAVING balance > 0.'],
    explain: 'Summing payments per invoice before joining prevents an invoice with several payments from repeating its total. Note patient 24 nets out lower because invoice 1 was paid twice.' },

  { id: 'pc-031', title: 'Duplicate patient pairs', level: 3, topic: 'Joins',
    prompt: 'Find pairs of patient records that look like the same person (same first_name, last_name and date_of_birth). Return the lower patient_id and the higher patient_id of each pair.',
    solution: `SELECT a.patient_id AS keep_id, b.patient_id AS duplicate_id
FROM patients a
JOIN patients b
  ON a.first_name = b.first_name
 AND a.last_name = b.last_name
 AND a.date_of_birth = b.date_of_birth
 AND a.patient_id < b.patient_id
ORDER BY a.patient_id;`,
    ordered: true,
    hints: ['Compare patients with other patients: a self join.', 'Match on first_name, last_name and date_of_birth.', 'Without an extra condition every row matches itself.', 'Add a.patient_id < b.patient_id to drop self-matches and mirrored pairs.'],
    explain: 'The < condition removes both the row-matches-itself case and the (25, 1) mirror of (1, 25), leaving one row per duplicate pair.' },

  { id: 'pc-032', title: 'Rank practitioners by billing', level: 3, topic: 'Window Functions',
    prompt: 'For practitioners with charges, return practitioner_id, total charged amount and a DENSE_RANK (1 = highest). Order by rank, then practitioner_id.',
    solution: `SELECT practitioner_id, SUM(amount) AS charged,
       DENSE_RANK() OVER (ORDER BY SUM(amount) DESC) AS rnk
FROM charges
GROUP BY practitioner_id
ORDER BY rnk, practitioner_id;`,
    ordered: true,
    hints: ['Use the charges table.', 'Total per practitioner: GROUP BY practitioner_id.', 'Window functions can rank aggregated values.', 'DENSE_RANK() OVER (ORDER BY SUM(amount) DESC)'],
    explain: 'The window runs over the grouped rows, so it can order by SUM(amount). DENSE_RANK leaves no gaps after ties.' },

  { id: 'pc-033', title: 'Above-average patients', level: 3, topic: 'Subqueries',
    prompt: 'Return patient_id and total billed for patients whose total billed is higher than the average total billed per patient (among patients with invoices). Highest first.',
    solution: `SELECT patient_id, SUM(total_amount) AS total_billed
FROM invoices
GROUP BY patient_id
HAVING SUM(total_amount) > (
  SELECT AVG(t) FROM (SELECT SUM(total_amount) AS t FROM invoices GROUP BY patient_id)
)
ORDER BY total_billed DESC, patient_id;`,
    ordered: true,
    hints: ['First you need each patient\'s total.', 'Then the average of those totals (an aggregate of an aggregate).', 'Compute the average in a nested subquery: SELECT AVG(t) FROM (SELECT SUM(...) AS t ... GROUP BY patient_id).', 'Compare in HAVING.'],
    explain: 'AVG(SUM(...)) is not allowed directly, so the per-patient totals go in a derived table and are averaged there. A CTE makes this easier to read.' },

  { id: 'pc-034', title: 'Quarter-over-quarter billing', level: 3, topic: 'Window Functions',
    prompt: "Show billed amount per quarter labelled like '2025-Q1', and the change from the previous quarter (NULL for the first). Order by quarter.",
    solution: `WITH q AS (
  SELECT strftime('%Y', invoice_date) || '-Q' || ((CAST(strftime('%m', invoice_date) AS INTEGER) + 2) / 3) AS quarter,
         SUM(total_amount) AS billed
  FROM invoices
  GROUP BY quarter
)
SELECT quarter, billed, billed - LAG(billed) OVER (ORDER BY quarter) AS change
FROM q
ORDER BY quarter;`,
    ordered: true,
    hints: ['Build a quarter label from the year and month.', 'Quarter number = (month + 2) / 3 using integer division.', 'Aggregate per quarter in a CTE.', 'LAG(billed) OVER (ORDER BY quarter) gives the previous quarter.'],
    explain: 'Integer division maps months 1-3 to 1, 4-6 to 2 and so on. LAG then looks one row back in quarter order.' },

  { id: 'pc-035', title: 'Payment methods by year', level: 3, topic: 'Aggregations',
    prompt: 'Pivot payments: one row per payment year, with the total amount for EFT, Check, Credit Card and Cash as four columns (in that order). Order by year.',
    solution: `SELECT strftime('%Y', payment_date) AS year,
       SUM(CASE WHEN method = 'EFT' THEN amount ELSE 0 END) AS eft,
       SUM(CASE WHEN method = 'Check' THEN amount ELSE 0 END) AS check_amt,
       SUM(CASE WHEN method = 'Credit Card' THEN amount ELSE 0 END) AS card,
       SUM(CASE WHEN method = 'Cash' THEN amount ELSE 0 END) AS cash
FROM payments
GROUP BY year
ORDER BY year;`,
    ordered: true,
    hints: ['Use the payments table.', 'GROUP BY the year.', 'Each column is a sum of one method only.', "SUM(CASE WHEN method = 'EFT' THEN amount ELSE 0 END), and so on."],
    explain: 'Conditional aggregation turns row values (methods) into columns. It is the portable replacement for PIVOT.' },

  { id: 'pc-036', title: 'Days to first payment', level: 3, topic: 'Advanced',
    prompt: 'For each payor_type, return the average number of days between invoice_date and the invoice\'s FIRST payment, rounded to 1 decimal. Only invoices with payments and a payor count. Order by the average.',
    solution: `WITH firstpay AS (
  SELECT invoice_id, MIN(payment_date) AS first_payment
  FROM payments
  GROUP BY invoice_id
)
SELECT py.payor_type,
       ROUND(AVG(julianday(f.first_payment) - julianday(i.invoice_date)), 1) AS avg_days
FROM invoices i
JOIN firstpay f ON f.invoice_id = i.invoice_id
JOIN payors py ON py.payor_id = i.payor_id
GROUP BY py.payor_type
ORDER BY avg_days, py.payor_type;`,
    ordered: true,
    hints: ['You need invoices, payments and payors.', 'First find MIN(payment_date) per invoice.', 'julianday(a) - julianday(b) gives the number of days between two dates.', 'Join, GROUP BY payor_type and ROUND(AVG(...), 1).'],
    explain: 'Reducing payments to one row per invoice first keeps the average fair; julianday converts ISO dates to day numbers for subtraction.' },

  { id: 'pc-037', title: 'James Okafor\'s whole team', level: 3, topic: 'Advanced',
    prompt: 'Using a recursive CTE, list everyone who reports to practitioner 2 (James Okafor) directly or indirectly: practitioner_id, last_name and depth (1 = direct report). Order by depth, practitioner_id.',
    solution: `WITH RECURSIVE team AS (
  SELECT practitioner_id, last_name, 1 AS depth
  FROM practitioners
  WHERE supervisor_id = 2
  UNION ALL
  SELECT p.practitioner_id, p.last_name, t.depth + 1
  FROM practitioners p
  JOIN team t ON p.supervisor_id = t.practitioner_id
)
SELECT practitioner_id, last_name, depth
FROM team
ORDER BY depth, practitioner_id;`,
    ordered: true,
    hints: ['The hierarchy is practitioners.supervisor_id.', 'Anchor: the direct reports of practitioner 2.', 'Recursive step: people whose supervisor is already in the CTE.', 'Carry depth + 1 and join on p.supervisor_id = t.practitioner_id.'],
    explain: 'The anchor finds direct reports; each recursive pass adds the next level down until no one new is found.' },

  { id: 'pc-038', title: 'Top 2 procedures per specialty', level: 3, topic: 'Window Functions',
    prompt: 'For each practitioner specialty, return the 2 CPT codes with the highest total charged amount (specialty, cpt_code, total). Break ties by cpt_code. Order by specialty, then total DESC.',
    solution: `WITH t AS (
  SELECT pr.specialty, c.cpt_code, SUM(c.amount) AS total,
         ROW_NUMBER() OVER (PARTITION BY pr.specialty ORDER BY SUM(c.amount) DESC, c.cpt_code) AS rn
  FROM charges c
  JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
  GROUP BY pr.specialty, c.cpt_code
)
SELECT specialty, cpt_code, total
FROM t
WHERE rn <= 2
ORDER BY specialty, total DESC, cpt_code;`,
    ordered: true,
    hints: ['Join charges to practitioners to get the specialty.', 'GROUP BY specialty, cpt_code to total each code.', 'ROW_NUMBER() OVER (PARTITION BY specialty ORDER BY SUM(amount) DESC, cpt_code)', 'Filter rn <= 2 in an outer query.'],
    explain: 'Aggregate first, then rank inside each specialty. This is the top-N-per-group pattern applied to grouped data.' },

  { id: 'pc-039', title: 'Share of billing by location', level: 3, topic: 'Window Functions',
    prompt: 'For each location_id with invoices, show the total billed and its percentage of all billing, rounded to 2 decimals. Order by percentage DESC.',
    solution: `SELECT location_id,
       SUM(total_amount) AS billed,
       ROUND(100.0 * SUM(total_amount) / SUM(SUM(total_amount)) OVER (), 2) AS pct
FROM invoices
GROUP BY location_id
ORDER BY pct DESC, location_id;`,
    ordered: true,
    hints: ['GROUP BY location_id and SUM the totals.', 'You also need the grand total on every row.', 'SUM(SUM(total_amount)) OVER () is the grand total.', 'Use 100.0 to avoid integer division, then ROUND(..., 2).'],
    explain: 'An empty OVER () window spans all grouped rows, so it returns the grand total without a separate subquery.' },

  // ───────────────────────── Level 4: Expert ─────────────────────────
  { id: 'pc-040', title: 'Longest monthly invoice streak', level: 4, topic: 'Advanced',
    prompt: 'For each patient with invoices, find the longest streak of consecutive calendar months that each contain at least one of their invoices. Return patient_id and longest_streak, ordered by longest_streak DESC, then patient_id.',
    solution: `WITH months AS (
  SELECT DISTINCT patient_id,
         CAST(strftime('%Y', invoice_date) AS INTEGER) * 12 + CAST(strftime('%m', invoice_date) AS INTEGER) AS m
  FROM invoices
),
islands AS (
  SELECT patient_id, m,
         m - ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY m) AS grp
  FROM months
),
streaks AS (
  SELECT patient_id, grp, COUNT(*) AS len
  FROM islands
  GROUP BY patient_id, grp
)
SELECT patient_id, MAX(len) AS longest_streak
FROM streaks
GROUP BY patient_id
ORDER BY longest_streak DESC, patient_id;`,
    ordered: true,
    hints: ['Reduce invoices to distinct (patient, month) pairs.', 'Turn each month into a number: year * 12 + month, so consecutive months differ by 1.', 'Gaps and islands: month_number - ROW_NUMBER() is constant within a run of consecutive months.', 'GROUP BY patient and that difference to get run lengths, then take MAX per patient.'],
    explain: 'Within a run of consecutive months, the month number and ROW_NUMBER both grow by 1, so their difference stays constant and labels the "island". Counting each island gives the streak length.' },

  { id: 'pc-041', title: 'AR aging buckets', level: 4, topic: 'Advanced',
    prompt: "Accounts-receivable aging as of 2026-09-01. For non-Void invoices with a positive balance (total_amount minus payments), bucket by days past due_date: 'Current' (not yet due), '1-30', '31-60', '61-90', '90+'. Return bucket, invoice count and total balance, in that bucket order (skip empty buckets).",
    solution: `WITH bal AS (
  SELECT i.invoice_id, i.due_date,
         i.total_amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS balance
  FROM invoices i
  WHERE i.status <> 'Void'
),
aged AS (
  SELECT balance, julianday('2026-09-01') - julianday(due_date) AS days_past
  FROM bal
  WHERE balance > 0
)
SELECT CASE WHEN days_past <= 0 THEN 'Current'
            WHEN days_past <= 30 THEN '1-30'
            WHEN days_past <= 60 THEN '31-60'
            WHEN days_past <= 90 THEN '61-90'
            ELSE '90+' END AS bucket,
       COUNT(*) AS invoices,
       SUM(balance) AS balance
FROM aged
GROUP BY bucket
ORDER BY MIN(days_past);`,
    ordered: true,
    hints: ['Start by computing each invoice\'s balance: total_amount minus its payments.', "Days past due = julianday('2026-09-01') - julianday(due_date).", 'Map days to a bucket label with CASE.', 'GROUP BY the bucket; sort buckets by MIN(days_past) so they come out in aging order.'],
    explain: 'Aging reports group open balances by how late they are. Sorting by MIN(days_past) orders the text labels by age without needing a separate sort column.' },

  { id: 'pc-042', title: 'Ledger reconciliation', level: 4, topic: 'Advanced',
    prompt: 'The transactions table is the accounting ledger (balance = SUM(amount)). Find invoices where the ledger balance differs from total_amount minus payments. Return invoice_id, ledger_balance, expected_balance and the difference (ledger minus expected), ordered by invoice_id.',
    solution: `WITH ledger AS (
  SELECT invoice_id, SUM(amount) AS ledger_balance FROM transactions GROUP BY invoice_id
),
paid AS (
  SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id
)
SELECT i.invoice_id,
       COALESCE(l.ledger_balance, 0) AS ledger_balance,
       i.total_amount - COALESCE(p.paid, 0) AS expected_balance,
       COALESCE(l.ledger_balance, 0) - (i.total_amount - COALESCE(p.paid, 0)) AS difference
FROM invoices i
LEFT JOIN ledger l ON l.invoice_id = i.invoice_id
LEFT JOIN paid p ON p.invoice_id = i.invoice_id
WHERE COALESCE(l.ledger_balance, 0) <> i.total_amount - COALESCE(p.paid, 0)
ORDER BY i.invoice_id;`,
    ordered: true,
    hints: ['You need invoices, payments and transactions.', 'Aggregate transactions and payments per invoice separately (avoid fan-out).', 'LEFT JOIN both aggregates to invoices and COALESCE missing sums to 0.', 'Keep rows where the two balances differ.'],
    explain: 'The differences are explained by ledger-only entries: the REFUND of the duplicate payment on invoice 1, an ADJUSTMENT on invoice 6 and a WRITE_OFF on invoice 24. Reconciliation queries like this are how finance teams find them.' },

  { id: 'pc-043', title: 'Quarterly cohort retention', level: 4, topic: 'Advanced',
    prompt: "Group patients into cohorts by the quarter of their FIRST invoice (label like '2025-Q1'). For each cohort, return the cohort, the number of patients, how many of them had an invoice in any LATER quarter, and the retention percentage rounded to 1 decimal. Order by cohort.",
    solution: `WITH pq AS (
  SELECT DISTINCT patient_id,
         strftime('%Y', invoice_date) || '-Q' || ((CAST(strftime('%m', invoice_date) AS INTEGER) + 2) / 3) AS quarter
  FROM invoices
),
cohort AS (
  SELECT patient_id, MIN(quarter) AS cohort FROM pq GROUP BY patient_id
)
SELECT c.cohort,
       COUNT(*) AS patients,
       SUM(EXISTS (SELECT 1 FROM pq WHERE pq.patient_id = c.patient_id AND pq.quarter > c.cohort)) AS retained,
       ROUND(100.0 * SUM(EXISTS (SELECT 1 FROM pq WHERE pq.patient_id = c.patient_id AND pq.quarter > c.cohort)) / COUNT(*), 1) AS retention_pct
FROM cohort c
GROUP BY c.cohort
ORDER BY c.cohort;`,
    ordered: true,
    hints: ['Build distinct (patient, quarter) pairs from invoices.', "The cohort is each patient's MIN(quarter); 'YYYY-Qn' labels sort correctly as text.", 'A patient is retained if they have any quarter greater than their cohort (EXISTS).', 'GROUP BY cohort; EXISTS returns 1/0 in SQLite so it can be summed.'],
    explain: 'Cohort analysis fixes each patient to their starting period and then measures later activity. Using EXISTS avoids counting a patient twice when they came back in several quarters.' },

  { id: 'pc-044', title: 'Out-billing the boss', level: 4, topic: 'Joins',
    prompt: 'Find practitioners whose total charged amount is greater than their direct supervisor\'s total charged amount (a supervisor with no charges counts as 0). Return practitioner_id, their total, supervisor_id and the supervisor\'s total, ordered by practitioner_id.',
    solution: `WITH t AS (
  SELECT pr.practitioner_id, pr.supervisor_id, COALESCE(SUM(c.amount), 0) AS total
  FROM practitioners pr
  LEFT JOIN charges c ON c.practitioner_id = pr.practitioner_id
  GROUP BY pr.practitioner_id, pr.supervisor_id
)
SELECT e.practitioner_id, e.total, e.supervisor_id, s.total AS supervisor_total
FROM t e
JOIN t s ON s.practitioner_id = e.supervisor_id
WHERE e.total > s.total
ORDER BY e.practitioner_id;`,
    ordered: true,
    hints: ['First compute every practitioner\'s total charged (0 if none).', 'Keep supervisor_id alongside each total.', 'Self join the totals: employee row to supervisor row.', 'Filter e.total > s.total.'],
    explain: 'Aggregating once into a CTE and then self-joining it compares each practitioner with their supervisor without recomputing totals.' },

  { id: 'pc-045', title: 'Two overdue invoices in a row', level: 4, topic: 'Window Functions',
    prompt: 'Find patients whose two most recent invoices (by invoice_date, then invoice_id) are both Overdue. Return patient_id, ordered by patient_id.',
    solution: `WITH r AS (
  SELECT patient_id, status,
         ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date DESC, invoice_id DESC) AS rn
  FROM invoices
)
SELECT patient_id
FROM r
WHERE rn <= 2
GROUP BY patient_id
HAVING COUNT(*) = 2 AND SUM(status = 'Overdue') = 2
ORDER BY patient_id;`,
    ordered: true,
    hints: ['Number each patient\'s invoices from most recent.', 'ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date DESC, invoice_id DESC)', 'Keep rn <= 2 and group by patient.', "Require COUNT(*) = 2 and both Overdue: SUM(status = 'Overdue') = 2."],
    explain: 'Ranking gives the latest two invoices; the HAVING clause checks that both exist and both are Overdue. Patients with a single invoice are excluded by COUNT(*) = 2.' },

  { id: 'pc-046', title: 'Headcount under each manager', level: 4, topic: 'Advanced',
    prompt: 'For every practitioner who manages anyone, count all the people below them in the hierarchy (direct and indirect). Return practitioner_id and headcount, ordered by headcount DESC, then practitioner_id.',
    solution: `WITH RECURSIVE below(manager_id, practitioner_id) AS (
  SELECT supervisor_id, practitioner_id FROM practitioners WHERE supervisor_id IS NOT NULL
  UNION ALL
  SELECT b.manager_id, p.practitioner_id
  FROM below b
  JOIN practitioners p ON p.supervisor_id = b.practitioner_id
)
SELECT manager_id AS practitioner_id, COUNT(*) AS headcount
FROM below
GROUP BY manager_id
ORDER BY headcount DESC, manager_id;`,
    ordered: true,
    hints: ['You need every (manager, subordinate) pair, not just direct ones.', 'Anchor: each (supervisor_id, practitioner_id) direct pair.', 'Recursive step: extend a pair down one level, keeping the same manager.', 'GROUP BY manager_id and COUNT(*).'],
    explain: 'The recursive CTE builds the transitive closure of the reporting tree. Grouping the closure by manager counts everyone beneath them.' },

  { id: 'pc-047', title: 'Median invoice total', level: 4, topic: 'Window Functions',
    prompt: 'SQLite has no MEDIAN function. Compute the median invoice total_amount across all invoices (a single value).',
    solution: `WITH o AS (
  SELECT total_amount,
         ROW_NUMBER() OVER (ORDER BY total_amount) AS rn,
         COUNT(*) OVER () AS n
  FROM invoices
)
SELECT AVG(total_amount) AS median
FROM o
WHERE rn IN ((n + 1) / 2, (n + 2) / 2);`,
    ordered: false,
    hints: ['Sort the totals and number them.', 'ROW_NUMBER() OVER (ORDER BY total_amount) and COUNT(*) OVER ().', 'For an even count the median is the average of the two middle rows.', 'Keep rn IN ((n + 1) / 2, (n + 2) / 2) and AVG them.'],
    explain: 'With integer division, (n+1)/2 and (n+2)/2 are the same row when n is odd and the two middle rows when n is even, so one query handles both cases.' },

  { id: 'pc-048', title: 'Payor collection rate vs contract', level: 4, topic: 'Advanced',
    prompt: 'For each payor that has made payments, compare what it actually paid with what it contracted to pay: payor_name, contract_rate, billed (sum of total_amount of the invoices it paid on), paid (sum of its payments) and actual_rate = paid / billed rounded to 2 decimals. Order by payor_name.',
    solution: `WITH pp AS (
  SELECT payor_id, invoice_id, SUM(amount) AS paid
  FROM payments
  WHERE payor_id IS NOT NULL
  GROUP BY payor_id, invoice_id
)
SELECT py.payor_name, py.contract_rate,
       SUM(i.total_amount) AS billed,
       SUM(pp.paid) AS paid,
       ROUND(SUM(pp.paid) / SUM(i.total_amount), 2) AS actual_rate
FROM pp
JOIN invoices i ON i.invoice_id = pp.invoice_id
JOIN payors py ON py.payor_id = pp.payor_id
GROUP BY py.payor_id, py.payor_name, py.contract_rate
ORDER BY py.payor_name;`,
    ordered: true,
    hints: ['Payor payments have a non-NULL payments.payor_id.', 'Collapse payments to one row per (payor, invoice) so invoice totals are not double counted.', 'Join to invoices for total_amount and to payors for contract_rate.', 'actual_rate = ROUND(SUM(paid) / SUM(total_amount), 2)'],
    explain: 'Pre-aggregating to (payor, invoice) guarantees each invoice total is added once per payor. Comparing actual_rate with contract_rate shows whether payors reimburse as agreed.' },

  { id: 'pc-049', title: 'Patient value quartiles', level: 4, topic: 'Window Functions',
    prompt: 'Split patients with invoices into 4 quartiles by total billed (quartile 1 = highest billed). Return patient_id, total_billed and quartile. Break ties by patient_id. Order by quartile, total_billed DESC, patient_id.',
    solution: `SELECT patient_id, SUM(total_amount) AS total_billed,
       NTILE(4) OVER (ORDER BY SUM(total_amount) DESC, patient_id) AS quartile
FROM invoices
GROUP BY patient_id
ORDER BY quartile, total_billed DESC, patient_id;`,
    ordered: true,
    hints: ['Total billed per patient: GROUP BY patient_id.', 'NTILE(4) splits ordered rows into 4 nearly equal buckets.', 'Order the window by SUM(total_amount) DESC, then patient_id for determinism.', 'NTILE(4) OVER (ORDER BY SUM(total_amount) DESC, patient_id)'],
    explain: 'NTILE deals rows into buckets in window order; with 20 patients each quartile gets 5. When the count does not divide evenly, the first buckets get one extra row.' },

  { id: 'pc-050', title: 'Rolling 3-month billing', level: 4, topic: 'Advanced',
    prompt: "For every calendar month from 2025-02 to 2026-08 (including months with no invoices), return the month ('YYYY-MM'), billed that month (0 if none) and the rolling 3-month total (that month plus the two before it). Order by month.",
    solution: `WITH RECURSIVE cal(d) AS (
  SELECT '2025-02-01'
  UNION ALL
  SELECT date(d, '+1 month') FROM cal WHERE d < '2026-08-01'
),
monthly AS (
  SELECT strftime('%Y-%m', invoice_date) AS month, SUM(total_amount) AS billed
  FROM invoices
  GROUP BY month
),
filled AS (
  SELECT strftime('%Y-%m', cal.d) AS month, COALESCE(m.billed, 0) AS billed
  FROM cal
  LEFT JOIN monthly m ON m.month = strftime('%Y-%m', cal.d)
)
SELECT month, billed,
       SUM(billed) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3m
FROM filled
ORDER BY month;`,
    ordered: true,
    hints: ['Months with no invoices must still appear: generate a calendar.', "WITH RECURSIVE and date(d, '+1 month') build the month list.", 'LEFT JOIN monthly totals onto the calendar and COALESCE to 0.', 'SUM(billed) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)'],
    explain: 'A ROWS frame counts rows, not months, so gaps would make "2 preceding rows" reach too far back. Filling the calendar first makes each row exactly one month.' },

  { id: 'pc-051', title: 'Lapsed patients', level: 4, topic: 'Subqueries',
    prompt: 'Treat today as 2026-09-01. Find patients who had at least 2 invoices but whose most recent invoice is more than 270 days old. Return patient_id, invoice count, last invoice date and days since it, ordered by days since DESC.',
    solution: `SELECT patient_id,
       COUNT(*) AS invoices,
       MAX(invoice_date) AS last_invoice,
       CAST(julianday('2026-09-01') - julianday(MAX(invoice_date)) AS INTEGER) AS days_since
FROM invoices
GROUP BY patient_id
HAVING COUNT(*) >= 2
   AND julianday('2026-09-01') - julianday(MAX(invoice_date)) > 270
ORDER BY days_since DESC, patient_id;`,
    ordered: true,
    hints: ['Use invoices grouped by patient.', 'The most recent invoice is MAX(invoice_date).', "Days since = julianday('2026-09-01') - julianday(MAX(invoice_date)).", 'Both conditions are on aggregates, so they go in HAVING.'],
    explain: 'Repeat patients who have gone quiet are prime candidates for recall outreach. Every condition here depends on the group, so HAVING does all the filtering.' },

  { id: 'pc-052', title: 'When did each invoice settle?', level: 4, topic: 'Advanced',
    prompt: 'Using the transactions ledger, find for each invoice the first date on which its running balance (running SUM of amount in transaction_date, transaction_id order) reached 0 or less. Return invoice_id and settled_date for invoices that ever settled, ordered by invoice_id.',
    solution: `WITH running AS (
  SELECT invoice_id, transaction_date,
         SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id) AS balance
  FROM transactions
)
SELECT invoice_id, MIN(transaction_date) AS settled_date
FROM running
WHERE balance <= 0
GROUP BY invoice_id
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['Use the transactions table.', 'Compute a running balance per invoice with SUM() OVER (PARTITION BY invoice_id ORDER BY ...).', 'Order the window by transaction_date, then transaction_id.', 'Keep rows with balance <= 0 and take MIN(transaction_date) per invoice.'],
    explain: 'The running balance replays the ledger entry by entry. The earliest date where it drops to 0 or below is when the invoice was settled, even if later entries (like a refund) move it again.' },

  // ───────────────────────── Set Operations ─────────────────────────
  { id: 'pc-053', title: 'Every first name on file', level: 1, topic: 'Set Operations',
    prompt: 'Produce one list of every distinct first name used by a patient or a practitioner, in alphabetical order.',
    solution: `SELECT first_name FROM patients
UNION
SELECT first_name FROM practitioners
ORDER BY first_name;`,
    ordered: true,
    hints: ['You need names from two tables stacked into one column.', 'Stacking results is a set operation.', 'UNION removes duplicates; UNION ALL keeps them.', 'SELECT first_name FROM patients UNION SELECT first_name FROM practitioners ORDER BY first_name'],
    explain: 'UNION stacks the two lists and removes duplicates, so names like Grace (a patient and a practitioner) and Maria (patients 1 and 25) appear once. The ORDER BY applies to the whole combined result.' },

  { id: 'pc-054', title: 'Invoices paid by insurer and patient', level: 2, topic: 'Set Operations',
    prompt: 'Find the invoice_ids that received at least one insurer payment (payor_id NOT NULL) AND at least one patient payment (payor_id NULL). Order by invoice_id.',
    solution: `SELECT invoice_id FROM payments WHERE payor_id IS NOT NULL
INTERSECT
SELECT invoice_id FROM payments WHERE payor_id IS NULL
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['Everything is in the payments table.', 'Build two lists of invoice_ids: insurer-paid and patient-paid.', 'Keep only ids that are in both lists.', 'Use INTERSECT between the two SELECTs.'],
    explain: 'INTERSECT returns rows present in both inputs (and removes duplicates). These are the invoices where the insurer paid its share and the patient paid the rest.' },

  { id: 'pc-055', title: 'Billed but never paid', level: 2, topic: 'Set Operations',
    prompt: 'List the invoice_ids of non-Void invoices that have no payment at all. Use EXCEPT. Order by invoice_id.',
    solution: `SELECT invoice_id FROM invoices WHERE status <> 'Void'
EXCEPT
SELECT invoice_id FROM payments
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['Start with all non-Void invoice ids.', 'Remove the ids that appear in payments.', 'EXCEPT returns rows from the first query that are not in the second.', "SELECT invoice_id FROM invoices WHERE status <> 'Void' EXCEPT SELECT invoice_id FROM payments"],
    explain: 'EXCEPT is a clean anti-join when you only need the key column. Unlike NOT IN it is not tripped up by NULLs.' },

  { id: 'pc-056', title: 'Practitioners with no charges', level: 1, topic: 'Set Operations',
    prompt: 'Return the practitioner_id of every practitioner who has never billed a charge, using EXCEPT.',
    solution: `SELECT practitioner_id FROM practitioners
EXCEPT
SELECT practitioner_id FROM charges
ORDER BY practitioner_id;`,
    ordered: true,
    hints: ['Take all practitioner ids.', 'Remove every practitioner_id found in charges.', 'EXCEPT does exactly that.', 'SELECT practitioner_id FROM practitioners EXCEPT SELECT practitioner_id FROM charges'],
    explain: 'Only practitioner 12 (Leo Martins, the new hire) remains: every other id also appears in charges.' },

  { id: 'pc-057', title: 'Patient activity feed', level: 3, topic: 'Set Operations',
    prompt: "Build an activity feed for patient 7: one row per invoice (activity_date = invoice_date, kind = 'Invoice', invoice_id, amount = total_amount) and one row per payment on their invoices (payment_date, 'Payment', invoice_id, amount as a NEGATIVE number). Order by activity_date, then kind.",
    solution: `SELECT invoice_date AS activity_date, 'Invoice' AS kind, invoice_id, total_amount AS amount
FROM invoices
WHERE patient_id = 7
UNION ALL
SELECT p.payment_date, 'Payment', p.invoice_id, -p.amount
FROM payments p
JOIN invoices i ON i.invoice_id = p.invoice_id
WHERE i.patient_id = 7
ORDER BY activity_date, kind;`,
    ordered: true,
    hints: ['Two different kinds of event need to share one set of columns.', 'Both SELECTs must return the same number of columns in the same order.', 'Payments need a join to invoices to find the patient.', "Use UNION ALL, a literal 'Invoice'/'Payment' column and -p.amount."],
    explain: 'UNION ALL is the right tool for a feed: rows from different tables are aligned by position and nothing is de-duplicated. The column names come from the first SELECT.' },

  { id: 'pc-058', title: 'Patients seen in both years', level: 2, topic: 'Set Operations',
    prompt: 'Which patients had at least one invoice in 2025 AND at least one in 2026? Return patient_id, ordered.',
    solution: `SELECT patient_id FROM invoices WHERE invoice_date LIKE '2025%'
INTERSECT
SELECT patient_id FROM invoices WHERE invoice_date LIKE '2026%'
ORDER BY patient_id;`,
    ordered: true,
    hints: ['Build a list of patients per year.', "Filter years with invoice_date LIKE '2025%' or strftime('%Y', invoice_date).", 'You want patients in both lists.', 'Use INTERSECT.'],
    explain: 'INTERSECT gives the retained patients. The same idea with EXCEPT would give churned (2025 only) or new (2026 only) patients.' },

  { id: 'pc-059', title: 'Procedures billed in only one year', level: 4, topic: 'Set Operations',
    prompt: "Find CPT codes that were billed (charges.service_date) in 2025 but not 2026, or in 2026 but not 2025. Return cpt_code and a label '2025 only' or '2026 only', ordered by cpt_code.",
    solution: `SELECT cpt_code, '2025 only' AS seen
FROM (SELECT cpt_code FROM charges WHERE service_date LIKE '2025%'
      EXCEPT
      SELECT cpt_code FROM charges WHERE service_date LIKE '2026%')
UNION ALL
SELECT cpt_code, '2026 only'
FROM (SELECT cpt_code FROM charges WHERE service_date LIKE '2026%'
      EXCEPT
      SELECT cpt_code FROM charges WHERE service_date LIKE '2025%')
ORDER BY cpt_code;`,
    ordered: true,
    hints: ['This is a symmetric difference: (A EXCEPT B) plus (B EXCEPT A).', 'SQLite does not allow parentheses around compound SELECTs, so wrap each EXCEPT in a subquery in FROM.', 'Add a literal label column to each half.', 'Combine the two halves with UNION ALL and ORDER BY cpt_code.'],
    explain: 'Each EXCEPT finds codes unique to one year; wrapping it in a derived table lets you add a label and combine the halves. The result shows 99214 and 99223 dropped out after 2025 and 99203 is new in 2026.' },

  // ───────────────────────── Subqueries ─────────────────────────
  { id: 'pc-060', title: 'Invoices for Dallas patients', level: 1, topic: 'Subqueries',
    prompt: 'List invoice_id, patient_id and total_amount for invoices whose patient lives in Dallas. Use a subquery with IN (no JOIN). Order by invoice_id.',
    solution: `SELECT invoice_id, patient_id, total_amount
FROM invoices
WHERE patient_id IN (SELECT patient_id FROM patients WHERE city = 'Dallas')
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['The city is in patients, the invoices are in invoices.', 'First find the Dallas patient_ids.', 'Use that list in WHERE patient_id IN (...).', "WHERE patient_id IN (SELECT patient_id FROM patients WHERE city = 'Dallas')"],
    explain: 'The inner query returns a list of ids, and IN keeps invoices whose patient_id is in that list. It never duplicates rows, unlike a join to a table with repeated keys.' },

  { id: 'pc-061', title: 'The largest payment', level: 2, topic: 'Subqueries',
    prompt: 'Show the full payments row(s) with the largest amount ever received.',
    solution: `SELECT *
FROM payments
WHERE amount = (SELECT MAX(amount) FROM payments);`,
    ordered: false,
    hints: ['You need to compare each row with one computed value.', 'MAX(amount) gives the largest amount.', 'A scalar subquery returns a single value you can compare with.', 'WHERE amount = (SELECT MAX(amount) FROM payments)'],
    explain: 'A scalar subquery works where ORDER BY ... LIMIT 1 would not: if two payments tied for the maximum, both would be returned.' },

  { id: 'pc-062', title: 'Patients with an overdue invoice', level: 2, topic: 'Subqueries',
    prompt: 'List patient_id, first_name and last_name of patients who have at least one Overdue invoice. Use EXISTS. Order by patient_id.',
    solution: `SELECT p.patient_id, p.first_name, p.last_name
FROM patients p
WHERE EXISTS (SELECT 1 FROM invoices i
              WHERE i.patient_id = p.patient_id AND i.status = 'Overdue')
ORDER BY p.patient_id;`,
    ordered: true,
    hints: ['Start from patients.', 'For each patient, ask: is there an Overdue invoice for them?', 'EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id ...) is a correlated subquery.', "Add AND i.status = 'Overdue' inside the subquery."],
    explain: 'EXISTS stops at the first matching invoice and returns each patient once, even if they have several overdue invoices. A JOIN would need DISTINCT.' },

  { id: 'pc-063', title: 'Paid above their specialty average', level: 3, topic: 'Subqueries',
    prompt: "List practitioners whose hourly_rate is higher than the average hourly_rate of their own specialty. Return practitioner_id, last_name, specialty and hourly_rate, ordered by practitioner_id.",
    solution: `SELECT p.practitioner_id, p.last_name, p.specialty, p.hourly_rate
FROM practitioners p
WHERE p.hourly_rate > (SELECT AVG(p2.hourly_rate)
                       FROM practitioners p2
                       WHERE p2.specialty = p.specialty)
ORDER BY p.practitioner_id;`,
    ordered: true,
    hints: ['The comparison value is different for each row: it depends on the specialty.', 'That calls for a correlated subquery.', 'Inside, compute AVG(hourly_rate) for the same specialty as the outer row.', 'WHERE p.hourly_rate > (SELECT AVG(p2.hourly_rate) FROM practitioners p2 WHERE p2.specialty = p.specialty)'],
    explain: 'The subquery is re-evaluated per outer row using p.specialty. Single-person specialties can never beat their own average, so only multi-person specialties produce rows.' },

  { id: 'pc-064', title: 'Visit summary for every patient', level: 3, topic: 'Subqueries',
    prompt: 'For every patient (including those with no invoices), show patient_id, last_name, the number of invoices and the date of the latest invoice (NULL if none), using scalar subqueries in the SELECT list. Order by patient_id.',
    solution: `SELECT p.patient_id, p.last_name,
       (SELECT COUNT(*) FROM invoices i WHERE i.patient_id = p.patient_id) AS invoice_count,
       (SELECT MAX(i.invoice_date) FROM invoices i WHERE i.patient_id = p.patient_id) AS last_invoice
FROM patients p
ORDER BY p.patient_id;`,
    ordered: true,
    hints: ['Every patient must appear, so start FROM patients with no filtering.', 'Each extra column can be its own correlated subquery.', 'COUNT(*) in a subquery returns 0 when there are no rows; MAX returns NULL.', '(SELECT COUNT(*) FROM invoices i WHERE i.patient_id = p.patient_id) AS invoice_count'],
    explain: 'Scalar subqueries in SELECT behave like a LEFT JOIN plus aggregation: patients with no invoices get 0 and NULL instead of vanishing.' },

  { id: 'pc-065', title: 'Payors with nothing open', level: 3, topic: 'Subqueries',
    prompt: "List payor_id and payor_name of payors that have at least one invoice but no invoice with status 'Open'. Order by payor_id.",
    solution: `SELECT py.payor_id, py.payor_name
FROM payors py
WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.payor_id = py.payor_id)
  AND NOT EXISTS (SELECT 1 FROM invoices i
                  WHERE i.payor_id = py.payor_id AND i.status = 'Open')
ORDER BY py.payor_id;`,
    ordered: true,
    hints: ['Two conditions: has invoices, and has no Open invoices.', 'EXISTS handles the first, NOT EXISTS the second.', 'Both subqueries are correlated on payor_id.', "... AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.payor_id = py.payor_id AND i.status = 'Open')"],
    explain: 'Combining EXISTS and NOT EXISTS expresses "has some, but none of this kind". Payors 5 and 6 have no invoices, so the EXISTS test keeps them out.' },

  { id: 'pc-066', title: 'Above their location average', level: 4, topic: 'Subqueries',
    prompt: 'Find non-Void invoices whose total_amount is above the average non-Void total of their own location. Return invoice_id, location_id, total_amount and the location average rounded to 2 decimals. Order by location_id, then total_amount DESC.',
    solution: `SELECT i.invoice_id, i.location_id, i.total_amount, ROUND(la.avg_total, 2) AS location_avg
FROM invoices i
JOIN (SELECT location_id, AVG(total_amount) AS avg_total
      FROM invoices
      WHERE status <> 'Void'
      GROUP BY location_id) la ON la.location_id = i.location_id
WHERE i.status <> 'Void'
  AND i.total_amount > la.avg_total
ORDER BY i.location_id, i.total_amount DESC;`,
    ordered: true,
    hints: ['You need each location\'s average next to each invoice.', 'A derived table (subquery in FROM) can compute one average per location.', 'Join it back on location_id, and exclude Void invoices in both places.', 'WHERE i.total_amount > la.avg_total, and ROUND(la.avg_total, 2) in SELECT.'],
    explain: 'A derived table computes each average once and lets you both filter on it and display it. A correlated subquery works too, but you would have to repeat it in SELECT and WHERE.' },

  // ───────────────────────── Aggregations ─────────────────────────
  { id: 'pc-067', title: 'Billing at a glance', level: 1, topic: 'Aggregations',
    prompt: 'For all non-Void invoices, return the number of invoices, the total billed and the average invoice rounded to 2 decimals, in one row.',
    solution: `SELECT COUNT(*) AS invoices,
       SUM(total_amount) AS total_billed,
       ROUND(AVG(total_amount), 2) AS avg_invoice
FROM invoices
WHERE status <> 'Void';`,
    ordered: false,
    hints: ['Use the invoices table.', "Exclude Void invoices with WHERE status <> 'Void'.", 'Without GROUP BY, aggregates collapse all rows into one.', 'COUNT(*), SUM(total_amount), ROUND(AVG(total_amount), 2)'],
    explain: 'With no GROUP BY, the whole filtered table is one group. Excluding the $0 Void invoice matters for the average.' },

  { id: 'pc-068', title: 'Most frequent procedures', level: 1, topic: 'Aggregations',
    prompt: 'For each cpt_code, show the number of charge lines and the total amount billed. Order by number of lines DESC, then cpt_code.',
    solution: `SELECT cpt_code, COUNT(*) AS lines, SUM(amount) AS billed
FROM charges
GROUP BY cpt_code
ORDER BY lines DESC, cpt_code;`,
    ordered: true,
    hints: ['Use the charges table.', 'One row per cpt_code means GROUP BY cpt_code.', 'COUNT(*) counts lines, SUM(amount) totals money.', 'ORDER BY lines DESC, cpt_code'],
    explain: 'GROUP BY forms one group per code, and each aggregate is computed per group. The second sort key breaks ties deterministically.' },

  { id: 'pc-069', title: 'Frequent patients', level: 2, topic: 'Aggregations',
    prompt: 'List patients with 3 or more invoices: patient_id, invoice count and total billed. Order by invoice count DESC, then patient_id.',
    solution: `SELECT patient_id, COUNT(*) AS invoices, SUM(total_amount) AS billed
FROM invoices
GROUP BY patient_id
HAVING COUNT(*) >= 3
ORDER BY invoices DESC, patient_id;`,
    ordered: true,
    hints: ['Group invoices by patient_id.', 'The condition is on a count, which only exists after grouping.', 'Filters on aggregates go in HAVING, not WHERE.', 'HAVING COUNT(*) >= 3'],
    explain: 'WHERE filters rows before grouping; HAVING filters groups after. A count-based condition can only be tested in HAVING.' },

  { id: 'pc-070', title: 'Paid invoices per location', level: 2, topic: 'Aggregations',
    prompt: "For each location_id that has invoices, show the total invoice count, the count of Paid invoices and the count of Overdue invoices. Use the FILTER clause. Order by location_id.",
    solution: `SELECT location_id,
       COUNT(*) AS invoices,
       COUNT(*) FILTER (WHERE status = 'Paid') AS paid,
       COUNT(*) FILTER (WHERE status = 'Overdue') AS overdue
FROM invoices
GROUP BY location_id
ORDER BY location_id;`,
    ordered: true,
    hints: ['Group invoices by location_id.', 'You need several counts with different conditions in the same row.', 'COUNT(*) FILTER (WHERE ...) counts only rows that match.', "COUNT(*) FILTER (WHERE status = 'Paid') AS paid"],
    explain: "FILTER restricts the rows fed to one aggregate. SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) is the portable equivalent for databases without FILTER." },

  { id: 'pc-071', title: 'Monthly collections in 2026', level: 2, topic: 'Aggregations',
    prompt: "Show total payments received per month in 2026: month as 'YYYY-MM', number of payments and total amount. Order by month.",
    solution: `SELECT strftime('%Y-%m', payment_date) AS month,
       COUNT(*) AS payments,
       SUM(amount) AS collected
FROM payments
WHERE payment_date >= '2026-01-01' AND payment_date < '2027-01-01'
GROUP BY month
ORDER BY month;`,
    ordered: true,
    hints: ['Use the payments table.', "strftime('%Y-%m', payment_date) turns a date into its month.", 'Filter to 2026 before grouping.', 'GROUP BY the month expression, then COUNT(*) and SUM(amount).'],
    explain: 'Grouping by a derived expression is common for time series. Months with no payments are simply missing; a calendar CTE is needed to show them as 0.' },

  { id: 'pc-072', title: 'Insurer vs patient share', level: 3, topic: 'Aggregations',
    prompt: 'For every invoice with payments, show invoice_id, the amount paid by insurers (payor_id NOT NULL), the amount paid by the patient (payor_id NULL), and the total. Show 0 rather than NULL. Order by invoice_id.',
    solution: `SELECT invoice_id,
       COALESCE(SUM(amount) FILTER (WHERE payor_id IS NOT NULL), 0) AS insurer_paid,
       COALESCE(SUM(amount) FILTER (WHERE payor_id IS NULL), 0) AS patient_paid,
       SUM(amount) AS total_paid
FROM payments
GROUP BY invoice_id
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['Use payments grouped by invoice_id.', 'Each column is a SUM over a different subset of rows.', 'SUM(CASE WHEN payor_id IS NULL THEN amount ELSE 0 END) or SUM(amount) FILTER (WHERE ...).', 'SUM over zero rows is NULL; wrap it in COALESCE(..., 0).'],
    explain: 'Conditional aggregation pivots one column into several. Note SUM over an empty set is NULL, not 0, which is why COALESCE is needed with FILTER.' },

  { id: 'pc-073', title: 'Team roster per location', level: 3, topic: 'Aggregations',
    prompt: "For each location_id, show the number of practitioners and their last names as one comma-separated list in alphabetical order (separator ', '). Order by location_id.",
    solution: `SELECT location_id,
       COUNT(*) AS practitioners,
       group_concat(last_name, ', ' ORDER BY last_name) AS team
FROM practitioners
GROUP BY location_id
ORDER BY location_id;`,
    ordered: true,
    hints: ['Group practitioners by location_id.', 'group_concat(x, separator) joins the values of a group into one string.', 'Without an ORDER BY inside the aggregate, the list order is not guaranteed.', "group_concat(last_name, ', ' ORDER BY last_name)"],
    explain: 'String aggregation (group_concat in SQLite/MySQL, STRING_AGG in PostgreSQL/SQL Server, LISTAGG in Oracle) needs an ORDER BY inside the aggregate to be deterministic. SQLite supports that from version 3.44.' },

  // ───────────────────────── CTEs ─────────────────────────
  { id: 'pc-074', title: 'Overdue exposure per patient', level: 2, topic: 'CTEs',
    prompt: 'Using a CTE named overdue that holds the Overdue invoices, return each patient_id with the number of overdue invoices and the overdue total. Order by overdue total DESC, then patient_id.',
    solution: `WITH overdue AS (
  SELECT patient_id, total_amount
  FROM invoices
  WHERE status = 'Overdue'
)
SELECT patient_id, COUNT(*) AS overdue_invoices, SUM(total_amount) AS overdue_total
FROM overdue
GROUP BY patient_id
ORDER BY overdue_total DESC, patient_id;`,
    ordered: true,
    hints: ['A CTE is a named query defined with WITH name AS (...).', "Put the filter status = 'Overdue' inside the CTE.", 'The main query reads FROM overdue like a table.', 'GROUP BY patient_id with COUNT(*) and SUM(total_amount).'],
    explain: 'A CTE names an intermediate result so the main query reads top-down. Here it is equivalent to a WHERE clause, but the pattern scales to multi-step logic.' },

  { id: 'pc-075', title: 'Open balance per invoice', level: 2, topic: 'CTEs',
    prompt: 'Use a CTE that sums payments per invoice, then list every non-Void invoice that still has a balance > 0: invoice_id, total_amount, paid (0 if none) and balance. Order by balance DESC, then invoice_id.',
    solution: `WITH paid AS (
  SELECT invoice_id, SUM(amount) AS paid
  FROM payments
  GROUP BY invoice_id
)
SELECT i.invoice_id, i.total_amount,
       COALESCE(p.paid, 0) AS paid,
       i.total_amount - COALESCE(p.paid, 0) AS balance
FROM invoices i
LEFT JOIN paid p ON p.invoice_id = i.invoice_id
WHERE i.status <> 'Void'
  AND i.total_amount - COALESCE(p.paid, 0) > 0
ORDER BY balance DESC, i.invoice_id;`,
    ordered: true,
    hints: ['Aggregate payments to one row per invoice first.', 'LEFT JOIN the CTE to invoices so unpaid invoices stay.', 'COALESCE(p.paid, 0) turns missing payments into 0.', 'Filter on total_amount - COALESCE(p.paid, 0) > 0.'],
    explain: 'Aggregating before joining keeps one payment row per invoice, so the join cannot multiply invoice totals. The LEFT JOIN keeps invoices with no payments at all.' },

  { id: 'pc-076', title: 'Location scorecard', level: 3, topic: 'CTEs',
    prompt: 'For every treatment location (all 6), show location_name, total billed on non-Void invoices and total collected in payments, both 0 when there is nothing. Use two CTEs. Order by location_id.',
    solution: `WITH billed AS (
  SELECT location_id, SUM(total_amount) AS billed
  FROM invoices
  WHERE status <> 'Void'
  GROUP BY location_id
),
collected AS (
  SELECT i.location_id, SUM(p.amount) AS collected
  FROM payments p
  JOIN invoices i ON i.invoice_id = p.invoice_id
  GROUP BY i.location_id
)
SELECT l.location_name,
       COALESCE(b.billed, 0) AS billed,
       COALESCE(c.collected, 0) AS collected
FROM treatment_locations l
LEFT JOIN billed b ON b.location_id = l.location_id
LEFT JOIN collected c ON c.location_id = l.location_id
ORDER BY l.location_id;`,
    ordered: true,
    hints: ['Compute billing per location and collections per location separately.', 'Collections need payments joined to invoices to know the location.', 'Start the main query FROM treatment_locations and LEFT JOIN both CTEs.', 'COALESCE each total to 0 so Eastside Family Clinic shows zeros.'],
    explain: 'Joining payments and invoices in one query and summing both would double count. Two CTEs, each at one-row-per-location grain, join safely.' },

  { id: 'pc-077', title: 'Grace Liu\'s chain of command', level: 3, topic: 'CTEs',
    prompt: 'Starting from practitioner 11 (Grace Liu), walk up the supervisor_id chain to the top. Return practitioner_id, last_name and level (0 for Grace, 1 for her supervisor, ...). Order by level.',
    solution: `WITH RECURSIVE chain(practitioner_id, last_name, supervisor_id, level) AS (
  SELECT practitioner_id, last_name, supervisor_id, 0
  FROM practitioners
  WHERE practitioner_id = 11
  UNION ALL
  SELECT p.practitioner_id, p.last_name, p.supervisor_id, c.level + 1
  FROM practitioners p
  JOIN chain c ON p.practitioner_id = c.supervisor_id
)
SELECT practitioner_id, last_name, level
FROM chain
ORDER BY level;`,
    ordered: true,
    hints: ['A chain of unknown length needs WITH RECURSIVE.', 'The anchor row is practitioner 11 with level 0.', 'The recursive step finds the practitioner whose id equals the previous row\'s supervisor_id.', 'JOIN chain c ON p.practitioner_id = c.supervisor_id, and select c.level + 1.'],
    explain: 'Walking up follows supervisor_id from child to parent. The recursion stops by itself when it reaches Elena Ramirez, whose supervisor_id is NULL and so matches nothing.' },

  { id: 'pc-078', title: 'Quiet days in June 2026', level: 3, topic: 'CTEs',
    prompt: 'List every date in June 2026 on which no invoice was issued. Generate the dates with a recursive CTE. Order by date.',
    solution: `WITH RECURSIVE days(d) AS (
  SELECT '2026-06-01'
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2026-06-30'
)
SELECT d AS quiet_day
FROM days
WHERE d NOT IN (SELECT invoice_date FROM invoices)
ORDER BY d;`,
    ordered: true,
    hints: ['You cannot find missing dates in data that has no rows for them: generate a calendar.', "The anchor is '2026-06-01'; the step is date(d, '+1 day').", "Stop the recursion with WHERE d < '2026-06-30'.", 'Keep dates with no invoice: NOT IN (SELECT invoice_date FROM invoices) or a LEFT JOIN ... IS NULL.'],
    explain: 'A recursive CTE is the standard way to build a date spine in SQLite. invoice_date is never NULL, so NOT IN is safe here.' },

  { id: 'pc-079', title: 'New vs returning patients', level: 4, topic: 'CTEs',
    prompt: "For each year (as 'YYYY'), count the distinct patients invoiced that year who were NEW (their first-ever invoice is in that year) and those who were RETURNING (first invoice in an earlier year). Order by year.",
    solution: `WITH firsts AS (
  SELECT patient_id, strftime('%Y', MIN(invoice_date)) AS first_year
  FROM invoices
  GROUP BY patient_id
),
active AS (
  SELECT DISTINCT patient_id, strftime('%Y', invoice_date) AS yr
  FROM invoices
)
SELECT a.yr AS year,
       SUM(a.yr = f.first_year) AS new_patients,
       SUM(a.yr > f.first_year) AS returning_patients
FROM active a
JOIN firsts f ON f.patient_id = a.patient_id
GROUP BY a.yr
ORDER BY a.yr;`,
    ordered: true,
    hints: ['First find each patient\'s first invoice year.', 'Then find which (patient, year) pairs were active.', 'Join the two and compare the active year with the first year.', 'SUM(a.yr = f.first_year) counts new patients because a true comparison is 1 in SQLite.'],
    explain: 'Two CTEs at two different grains (per patient and per patient-year) keep the logic readable. In SQLite a boolean expression is 0 or 1, so SUM of a comparison counts matches.' },

  { id: 'pc-080', title: 'Org chart paths', level: 4, topic: 'CTEs',
    prompt: "For every practitioner, build the reporting path from the top boss as last names joined with ' > ' (for example 'Ramirez > Okafor > Rossi'), plus their depth (0 for the top). Return practitioner_id, depth and path, ordered by path.",
    solution: `WITH RECURSIVE tree(practitioner_id, depth, path) AS (
  SELECT practitioner_id, 0, last_name
  FROM practitioners
  WHERE supervisor_id IS NULL
  UNION ALL
  SELECT p.practitioner_id, t.depth + 1, t.path || ' > ' || p.last_name
  FROM practitioners p
  JOIN tree t ON p.supervisor_id = t.practitioner_id
)
SELECT practitioner_id, depth, path
FROM tree
ORDER BY path;`,
    ordered: true,
    hints: ['Start at the top: supervisor_id IS NULL.', 'Walk down: children have supervisor_id = the parent\'s practitioner_id.', 'Carry a growing string in the recursion.', "t.path || ' > ' || p.last_name, and t.depth + 1"],
    explain: 'Carrying the path through the recursion gives each row its full ancestry. Sorting by the path string lists each subtree right under its manager.' },

  // ───────────────────────── Joins ─────────────────────────
  { id: 'pc-081', title: 'Who did the work on invoice 13', level: 1, topic: 'Joins',
    prompt: "For invoice 13, list each charge's charge_id, description, amount and the practitioner's first_name and last_name. Order by charge_id.",
    solution: `SELECT c.charge_id, c.description, c.amount, pr.first_name, pr.last_name
FROM charges c
JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
WHERE c.invoice_id = 13
ORDER BY c.charge_id;`,
    ordered: true,
    hints: ['Charges hold the practitioner_id; names are in practitioners.', 'Join the two tables on practitioner_id.', 'Filter to invoice 13.', 'FROM charges c JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id WHERE c.invoice_id = 13'],
    explain: 'An INNER JOIN matches each charge line with exactly one practitioner, adding their name to the row.' },

  { id: 'pc-082', title: 'Who paid?', level: 2, topic: 'Joins',
    prompt: "List every payment for invoices 19-22: payment_id, invoice_id, amount and the payer's name: the payor_name, or 'Patient' when payor_id is NULL. Order by payment_id.",
    solution: `SELECT p.payment_id, p.invoice_id, p.amount,
       COALESCE(py.payor_name, 'Patient') AS paid_by
FROM payments p
LEFT JOIN payors py ON py.payor_id = p.payor_id
WHERE p.invoice_id BETWEEN 19 AND 22
ORDER BY p.payment_id;`,
    ordered: true,
    hints: ['Payor names live in payors.', 'Patient payments have payor_id NULL, so an INNER JOIN would drop them.', 'Use LEFT JOIN and COALESCE the missing name.', "COALESCE(py.payor_name, 'Patient')"],
    explain: 'The LEFT JOIN keeps patient payments with a NULL payor_name, and COALESCE turns that NULL into a readable label.' },

  { id: 'pc-083', title: 'Overdue worklist', level: 3, topic: 'Joins',
    prompt: "Build a collections worklist of Overdue invoices: invoice_id, patient full name (first + ' ' + last), payor_name ('No payor' if none), location_name, due_date and total_amount. Order by due_date, then invoice_id.",
    solution: `SELECT i.invoice_id,
       pa.first_name || ' ' || pa.last_name AS patient,
       COALESCE(py.payor_name, 'No payor') AS payor,
       l.location_name,
       i.due_date,
       i.total_amount
FROM invoices i
JOIN patients pa ON pa.patient_id = i.patient_id
LEFT JOIN payors py ON py.payor_id = i.payor_id
JOIN treatment_locations l ON l.location_id = i.location_id
WHERE i.status = 'Overdue'
ORDER BY i.due_date, i.invoice_id;`,
    ordered: true,
    hints: ['Four tables: invoices, patients, payors, treatment_locations.', 'Patient and location are mandatory; payor can be NULL.', 'Use LEFT JOIN for payors so invoices with no payor are kept.', "COALESCE(py.payor_name, 'No payor'), and filter status = 'Overdue'."],
    explain: 'Choose the join type per relationship: INNER where the foreign key is NOT NULL, LEFT where it can be missing. An INNER JOIN to payors would silently drop invoice 25.' },

  { id: 'pc-084', title: 'Payments received after the due date', level: 3, topic: 'Joins',
    prompt: 'List payments that arrived after their invoice\'s due_date: payment_id, invoice_id, due_date, payment_date and days late (whole days). Order by days late DESC, then payment_id.',
    solution: `SELECT p.payment_id, p.invoice_id, i.due_date, p.payment_date,
       CAST(julianday(p.payment_date) - julianday(i.due_date) AS INTEGER) AS days_late
FROM payments p
JOIN invoices i ON i.invoice_id = p.invoice_id
WHERE p.payment_date > i.due_date
ORDER BY days_late DESC, p.payment_id;`,
    ordered: true,
    hints: ['The due date is on the invoice, the payment date on the payment.', 'Join payments to invoices on invoice_id.', 'ISO date strings compare correctly as text.', 'julianday(p.payment_date) - julianday(i.due_date) gives the number of days.'],
    explain: 'The join puts both dates on one row so they can be compared. julianday() converts dates to day numbers so subtracting gives days.' },

  // ───────────────────────── Data Modification (state mode) ─────────────────────────
  { id: 'pc-085', title: 'Mark an invoice as paid', level: 1, topic: 'Data Modification', mode: 'state',
    prompt: "The patient just settled invoice 5 at the front desk. Change its status to 'Paid'. Change nothing else.",
    solution: `UPDATE invoices
SET status = 'Paid'
WHERE invoice_id = 5;`,
    check: `SELECT invoice_id, status FROM invoices WHERE status IN ('Open', 'Paid') ORDER BY invoice_id`,
    hints: ['Changing existing rows is an UPDATE.', 'SET says what to change.', 'WHERE says which rows; without it every invoice would change.', "UPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;"],
    explain: 'Always target an UPDATE by primary key when you mean one row. Forgetting the WHERE clause is the classic way to overwrite the whole table.' },

  { id: 'pc-086', title: 'Add a new payor', level: 1, topic: 'Data Modification', mode: 'state',
    prompt: "Add payor 8: payor_name 'Humana Gold', payor_type 'Medicare', phone '800-555-0108', contract_rate 0.7, is_active 1.",
    solution: `INSERT INTO payors (payor_id, payor_name, payor_type, phone, contract_rate, is_active)
VALUES (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.7, 1);`,
    check: `SELECT payor_id, payor_name, payor_type, phone, contract_rate, is_active FROM payors ORDER BY payor_id`,
    hints: ['Adding a row is an INSERT.', 'List the columns explicitly so the statement survives schema changes.', 'Text values go in single quotes; numbers do not.', "INSERT INTO payors (payor_id, payor_name, ...) VALUES (8, 'Humana Gold', ...);"],
    explain: 'Naming the columns in INSERT makes the statement self-documenting and safe if columns are added or reordered later.' },

  { id: 'pc-087', title: 'Delete the duplicate payment', level: 1, topic: 'Data Modification', mode: 'state',
    prompt: 'Invoice 1 has the same $165 cash payment recorded twice on 2025-05-09 (payment_ids 1 and 47). Delete the later duplicate (the one with the higher payment_id), keeping the original.',
    solution: `DELETE FROM payments
WHERE payment_id = 47;`,
    check: `SELECT payment_id, invoice_id, payment_date, amount, method FROM payments WHERE invoice_id = 1 ORDER BY payment_id`,
    hints: ['Removing rows is a DELETE.', 'Look at the payments for invoice 1 first with a SELECT.', 'Target the exact row by its primary key.', 'DELETE FROM payments WHERE payment_id = 47;'],
    explain: 'Run the SELECT version of a DELETE first to see exactly what will go. Deleting by primary key removes the duplicate while keeping the genuine payment.' },

  { id: 'pc-088', title: 'Small-balance close-out', level: 2, topic: 'Data Modification', mode: 'state',
    prompt: "Policy: a Partially Paid invoice whose remaining balance (total_amount minus all its payments) is below 150 is closed as 'Paid'. Apply it with one UPDATE.",
    solution: `UPDATE invoices
SET status = 'Paid'
WHERE status = 'Partially Paid'
  AND total_amount - (SELECT COALESCE(SUM(p.amount), 0)
                      FROM payments p
                      WHERE p.invoice_id = invoices.invoice_id) < 150;`,
    check: `SELECT invoice_id, status FROM invoices WHERE invoice_id IN (6, 12, 13, 18, 22, 36) ORDER BY invoice_id`,
    hints: ['Only Partially Paid invoices are candidates.', 'The balance needs the sum of that invoice\'s payments: a correlated subquery.', 'Inside an UPDATE, refer to the row being updated as invoices.invoice_id.', 'WHERE ... AND total_amount - (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = invoices.invoice_id) < 150'],
    explain: 'A correlated subquery in the WHERE of an UPDATE is evaluated for each candidate row. Invoices 12, 13, 18 and 22 qualify; 6 and 36 still owe more than 150.' },

  { id: 'pc-089', title: 'Month-end overdue run', level: 2, topic: 'Data Modification', mode: 'state',
    prompt: "Month-end is 2026-09-30. Every Open invoice whose due_date is before 2026-09-30 becomes 'Overdue'.",
    solution: `UPDATE invoices
SET status = 'Overdue'
WHERE status = 'Open'
  AND due_date < '2026-09-30';`,
    check: `SELECT invoice_id, status, due_date FROM invoices WHERE due_date >= '2026-09-01' ORDER BY invoice_id`,
    hints: ['This is a status change on many rows at once.', 'Two conditions: the current status and the due date.', 'ISO dates compare correctly as text.', "UPDATE invoices SET status = 'Overdue' WHERE status = 'Open' AND due_date < '2026-09-30';"],
    explain: 'Batch status updates like this run nightly in billing systems. Keeping status = \'Open\' in the WHERE stops the job from touching Paid or Void invoices.' },

  { id: 'pc-090', title: 'Post a payment and settle the invoice', level: 2, topic: 'Data Modification', mode: 'state',
    prompt: "The patient on invoice 12 paid the remaining 99 by Credit Card on 2026-09-01. Insert the payment (payor_id NULL, let payment_id be assigned automatically) and set invoice 12's status to 'Paid'.",
    solution: `BEGIN;
INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)
VALUES (12, NULL, '2026-09-01', 99, 'Credit Card');
UPDATE invoices SET status = 'Paid' WHERE invoice_id = 12;
COMMIT;`,
    check: `SELECT i.invoice_id, i.status,
       (SELECT COUNT(*) FROM payments p WHERE p.invoice_id = i.invoice_id) AS payments,
       (SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.invoice_id) AS paid
FROM invoices i WHERE i.invoice_id = 12 ORDER BY i.invoice_id`,
    hints: ['Two changes: a new payments row and an invoice status update.', 'Leave payment_id out of the column list and SQLite assigns the next id.', 'Wrap both statements in BEGIN ... COMMIT so they succeed or fail together.', "INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (12, NULL, '2026-09-01', 99, 'Credit Card'); UPDATE invoices SET status = 'Paid' WHERE invoice_id = 12;"],
    explain: 'Posting money and updating the invoice must be atomic: a crash between them would leave the books inconsistent. A transaction makes the pair all-or-nothing.' },

  { id: 'pc-091', title: 'Upsert a payor contract', level: 3, topic: 'Data Modification', mode: 'state',
    prompt: "Cigna Select re-signed: it should be 'Commercial', phone '800-555-0199', contract_rate 0.8 and active. Write ONE INSERT that creates the payor if payor_name 'Cigna Select' does not exist, and otherwise updates phone, contract_rate and is_active (keep its payor_id).",
    solution: `INSERT INTO payors (payor_name, payor_type, phone, contract_rate, is_active)
VALUES ('Cigna Select', 'Commercial', '800-555-0199', 0.8, 1)
ON CONFLICT (payor_name) DO UPDATE SET
  phone = excluded.phone,
  contract_rate = excluded.contract_rate,
  is_active = excluded.is_active;`,
    check: `SELECT payor_id, payor_name, payor_type, phone, contract_rate, is_active FROM payors ORDER BY payor_id`,
    hints: ['payor_name has a UNIQUE constraint, so it can be the conflict target.', 'SQLite UPSERT syntax: INSERT ... ON CONFLICT (column) DO UPDATE SET ...', 'excluded.col refers to the value you tried to insert.', 'ON CONFLICT (payor_name) DO UPDATE SET phone = excluded.phone, contract_rate = excluded.contract_rate, is_active = excluded.is_active'],
    explain: 'UPSERT makes the load idempotent: it can be re-run safely. INSERT OR REPLACE would delete and re-insert the row, possibly with a new id, breaking foreign keys; ON CONFLICT ... DO UPDATE keeps the row.' },

  { id: 'pc-092', title: 'Commercial rate increase', level: 3, topic: 'Data Modification', mode: 'state',
    prompt: 'Active Commercial payors negotiated a 5% higher contract_rate. Apply it, rounding the new rate to 2 decimals.',
    solution: `UPDATE payors
SET contract_rate = ROUND(contract_rate * 1.05, 2)
WHERE payor_type = 'Commercial'
  AND is_active = 1;`,
    check: `SELECT payor_id, payor_type, is_active, contract_rate FROM payors ORDER BY payor_id`,
    hints: ['Update payors.', 'The new value is computed from the old value in the same row.', 'Filter on both payor_type and is_active.', "SET contract_rate = ROUND(contract_rate * 1.05, 2) WHERE payor_type = 'Commercial' AND is_active = 1"],
    explain: 'The right side of SET sees the old value of the row, so contract_rate * 1.05 works in one pass. The inactive Cigna Select is left untouched.' },

  { id: 'pc-093', title: 'Write off tiny overdue invoices', level: 3, topic: 'Data Modification', mode: 'state',
    prompt: "For each Overdue invoice under 100, add a transactions row: transaction_date '2026-09-01', transaction_type 'WRITE_OFF', amount = minus the invoice total, reference_id NULL, posted_by 'billing.bot'. Let transaction_id be assigned automatically. Use a single INSERT ... SELECT.",
    solution: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, reference_id, posted_by)
SELECT invoice_id, '2026-09-01', 'WRITE_OFF', -total_amount, NULL, 'billing.bot'
FROM invoices
WHERE status = 'Overdue'
  AND total_amount < 100;`,
    check: `SELECT invoice_id, transaction_date, transaction_type, amount, posted_by FROM transactions WHERE transaction_type = 'WRITE_OFF' ORDER BY invoice_id, transaction_date`,
    hints: ['INSERT can take its rows from a SELECT instead of VALUES.', 'The SELECT must return the columns in the same order as the INSERT column list.', 'Literals such as \'WRITE_OFF\' can be selected as constant columns.', "INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, reference_id, posted_by) SELECT invoice_id, '2026-09-01', 'WRITE_OFF', -total_amount, NULL, 'billing.bot' FROM invoices WHERE ..."],
    explain: 'INSERT ... SELECT posts one ledger entry per qualifying invoice in a single set-based statement, instead of a loop in application code.' },

  { id: 'pc-094', title: 'Merge the duplicate patient', level: 4, topic: 'Data Modification', mode: 'state',
    prompt: 'Patient 25 is a duplicate of patient 1 (same name and date of birth). Move all of patient 25\'s invoices to patient 1, then delete patient 25. Do it in one transaction.',
    solution: `BEGIN;
UPDATE invoices SET patient_id = 1 WHERE patient_id = 25;
DELETE FROM patients WHERE patient_id = 25;
COMMIT;`,
    check: `SELECT 'invoice' AS kind, invoice_id AS id, patient_id FROM invoices WHERE patient_id IN (1, 25)
UNION ALL
SELECT 'patient', patient_id, patient_id FROM patients WHERE patient_id IN (1, 25)
ORDER BY kind, id`,
    hints: ['Order matters: re-point the children before deleting the parent.', 'UPDATE invoices to change the foreign key from 25 to 1.', 'Then DELETE the patients row.', 'BEGIN; UPDATE invoices SET patient_id = 1 WHERE patient_id = 25; DELETE FROM patients WHERE patient_id = 25; COMMIT;'],
    explain: 'Deleting the parent first would orphan invoices 15 and 22 (or fail with foreign keys enforced). Re-pointing children then deleting, inside one transaction, is the standard merge pattern.' },

  // ───────────────────────── Schema Design (state mode) ─────────────────────────
  { id: 'pc-095', title: 'Add a phone column', level: 1, topic: 'Schema Design', mode: 'state',
    prompt: 'Patients need a phone number. Add a nullable TEXT column named phone to the patients table.',
    solution: `ALTER TABLE patients ADD COLUMN phone TEXT;`,
    check: `SELECT name, type, "notnull" FROM pragma_table_info('patients') ORDER BY cid`,
    hints: ['Changing an existing table\'s structure is ALTER TABLE.', 'ADD COLUMN appends a new column.', 'Existing rows get NULL in the new column.', 'ALTER TABLE patients ADD COLUMN phone TEXT;'],
    explain: 'ADD COLUMN is cheap in SQLite: existing rows are not rewritten; they simply read NULL (or the DEFAULT) for the new column.' },

  { id: 'pc-096', title: 'Create a referrals table', level: 2, topic: 'Schema Design', mode: 'state',
    prompt: "Create table referrals with: referral_id INTEGER PRIMARY KEY; patient_id INTEGER NOT NULL referencing patients; practitioner_id INTEGER NOT NULL referencing practitioners; to_specialty TEXT NOT NULL; referral_date TEXT NOT NULL; status TEXT NOT NULL DEFAULT 'Pending' with a CHECK that allows only 'Pending', 'Scheduled', 'Closed'. Keep the columns in this order.",
    solution: `CREATE TABLE referrals (
  referral_id     INTEGER PRIMARY KEY,
  patient_id      INTEGER NOT NULL REFERENCES patients(patient_id),
  practitioner_id INTEGER NOT NULL REFERENCES practitioners(practitioner_id),
  to_specialty    TEXT NOT NULL,
  referral_date   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending', 'Scheduled', 'Closed'))
);`,
    check: `SELECT name, type, "notnull", dflt_value, pk FROM pragma_table_info('referrals') ORDER BY cid`,
    hints: ['CREATE TABLE name ( column type constraints, ... ).', 'NOT NULL, DEFAULT and CHECK are column constraints.', 'A foreign key can be written inline: REFERENCES patients(patient_id).', "status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Scheduled', 'Closed'))"],
    explain: 'Constraints push data rules into the database so every application gets them for free: NOT NULL for required fields, CHECK for allowed values, REFERENCES for relationships.' },

  { id: 'pc-097', title: 'Index invoice lookups', level: 2, topic: 'Schema Design', mode: 'state',
    prompt: 'The patient portal runs WHERE patient_id = ? ORDER BY invoice_date. Create a composite index named idx_invoices_patient_date on invoices(patient_id, invoice_date).',
    solution: `CREATE INDEX idx_invoices_patient_date ON invoices (patient_id, invoice_date);`,
    check: `SELECT il.name, il."unique", ii.seqno, ii.name AS col
FROM pragma_index_list('invoices') il
JOIN pragma_index_info(il.name) ii
ORDER BY il.name, ii.seqno`,
    hints: ['CREATE INDEX name ON table (columns).', 'Column order in a composite index matters.', 'Put the equality column first and the sort column second.', 'CREATE INDEX idx_invoices_patient_date ON invoices (patient_id, invoice_date);'],
    explain: 'With patient_id first, SQLite seeks straight to one patient\'s entries, which are already sorted by invoice_date, so no separate sort step is needed.' },

  { id: 'pc-098', title: 'Block duplicate payments', level: 3, topic: 'Schema Design', mode: 'state',
    prompt: 'Create a UNIQUE index named ux_payments_dedup on payments(invoice_id, payment_date, amount, method) so the same payment cannot be recorded twice. Note: the data already contains one duplicate (payment 47 duplicates payment 1); remove it first.',
    solution: `DELETE FROM payments WHERE payment_id = 47;
CREATE UNIQUE INDEX ux_payments_dedup ON payments (invoice_id, payment_date, amount, method);`,
    check: `SELECT name, "unique" FROM pragma_index_list('payments')
UNION ALL
SELECT 'rows', COUNT(*) FROM payments
ORDER BY 1`,
    hints: ['CREATE UNIQUE INDEX fails if existing rows already violate it.', 'Find the duplicate with GROUP BY invoice_id, payment_date, amount, method HAVING COUNT(*) > 1.', 'Delete the later copy, then create the index.', 'DELETE FROM payments WHERE payment_id = 47; CREATE UNIQUE INDEX ux_payments_dedup ON payments (invoice_id, payment_date, amount, method);'],
    explain: 'A unique index is also a constraint. Existing data must be cleaned before it can be added, which is exactly how production de-duplication projects go: clean, then enforce.' },

  { id: 'pc-099', title: 'Open balances view', level: 3, topic: 'Schema Design', mode: 'state',
    prompt: 'Create a view named v_open_balances with columns invoice_id, patient_id, total_amount, paid and balance (paid = sum of payments, 0 if none; balance = total_amount - paid) for invoices whose status is Open, Overdue or Partially Paid.',
    solution: `CREATE VIEW v_open_balances AS
SELECT i.invoice_id, i.patient_id, i.total_amount,
       COALESCE(SUM(p.amount), 0) AS paid,
       i.total_amount - COALESCE(SUM(p.amount), 0) AS balance
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.invoice_id
WHERE i.status IN ('Open', 'Overdue', 'Partially Paid')
GROUP BY i.invoice_id;`,
    check: `SELECT m.type, m.name, t.cid, t.name AS col
FROM sqlite_master m
JOIN pragma_table_info(m.name) t
WHERE m.name = 'v_open_balances'
ORDER BY t.cid`,
    hints: ['CREATE VIEW name AS SELECT ...', 'A view stores the query, not the data; it is recomputed when read.', 'LEFT JOIN payments and GROUP BY invoice so unpaid invoices show paid = 0.', 'Name the computed columns with AS paid and AS balance.'],
    explain: 'A view gives reports one trusted definition of "balance". Test it afterwards with SELECT * FROM v_open_balances ORDER BY balance DESC.' },

  { id: 'pc-100', title: 'Auto-settle trigger', level: 4, topic: 'Schema Design', mode: 'state',
    prompt: "Create a trigger named trg_payment_settles that runs AFTER INSERT ON payments: when the invoice's total payments reach or exceed its total_amount, set that invoice's status to 'Paid'. (The grader inserts test payments after your trigger exists.)",
    solution: `CREATE TRIGGER trg_payment_settles
AFTER INSERT ON payments
BEGIN
  UPDATE invoices
  SET status = 'Paid'
  WHERE invoice_id = NEW.invoice_id
    AND (SELECT SUM(amount) FROM payments WHERE invoice_id = NEW.invoice_id) >= total_amount;
END;`,
    check: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (12, NULL, '2026-09-01', 99, 'Cash');
INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (31, NULL, '2026-09-01', 50, 'Cash');
SELECT invoice_id, status FROM invoices WHERE invoice_id IN (12, 31) ORDER BY invoice_id`,
    hints: ['CREATE TRIGGER name AFTER INSERT ON payments BEGIN ... END;', 'Inside the trigger, NEW.invoice_id is the invoice of the inserted payment.', 'Compare SUM(amount) of that invoice\'s payments with total_amount.', "UPDATE invoices SET status = 'Paid' WHERE invoice_id = NEW.invoice_id AND (SELECT SUM(amount) FROM payments WHERE invoice_id = NEW.invoice_id) >= total_amount;"],
    explain: 'The grader pays off invoice 12 in full (it becomes Paid) and pays only half of invoice 31 (it stays Overdue). Triggers keep derived state in sync, but hide logic from readers, so use them sparingly.' },

  // ───────────────────────── Debugging (fix the query) ─────────────────────────
  { id: 'pc-101', title: 'Fix: patients without email', level: 1, topic: 'Debugging',
    prompt: 'This query should list patient_id, first_name and last_name of patients with no email on file, ordered by patient_id. It returns nothing. Fix it.',
    buggy: `SELECT patient_id, first_name, last_name
FROM patients
WHERE email = NULL
ORDER BY patient_id;`,
    solution: `SELECT patient_id, first_name, last_name
FROM patients
WHERE email IS NULL
ORDER BY patient_id;`,
    ordered: true,
    hints: ['Some patients clearly have no email, yet no rows come back.', 'What is the result of NULL = NULL?', 'Comparisons with NULL give UNKNOWN, and WHERE drops UNKNOWN rows.', 'Use WHERE email IS NULL.'],
    explain: '= NULL is never TRUE, not even for NULL values. IS NULL is the only correct test for a missing value.' },

  { id: 'pc-102', title: 'Fix: big spenders', level: 2, topic: 'Debugging',
    prompt: 'This query should list patient_id and total billed for patients whose invoices total more than 1000, largest first. It fails. Fix it.',
    buggy: `SELECT patient_id, SUM(total_amount) AS billed
FROM invoices
WHERE SUM(total_amount) > 1000
GROUP BY patient_id
ORDER BY billed DESC;`,
    solution: `SELECT patient_id, SUM(total_amount) AS billed
FROM invoices
GROUP BY patient_id
HAVING SUM(total_amount) > 1000
ORDER BY billed DESC;`,
    ordered: true,
    hints: ['Read the error message: aggregates are misused somewhere.', 'WHERE runs before GROUP BY, so group totals do not exist yet.', 'Conditions on aggregates belong after grouping.', 'Move the condition to HAVING SUM(total_amount) > 1000.'],
    explain: 'WHERE filters individual rows; HAVING filters groups. Any condition on SUM, COUNT, AVG and friends must be in HAVING.' },

  { id: 'pc-103', title: 'Fix: 2026 invoices per patient', level: 2, topic: 'Debugging',
    prompt: 'This should list EVERY patient (all 25) with the number of invoices they received in 2026, showing 0 for patients with none. Order by patient_id. It only returns patients with 2026 invoices. Fix it.',
    buggy: `SELECT p.patient_id, COUNT(i.invoice_id) AS invoices_2026
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
WHERE i.invoice_date >= '2026-01-01'
GROUP BY p.patient_id
ORDER BY p.patient_id;`,
    solution: `SELECT p.patient_id, COUNT(i.invoice_id) AS invoices_2026
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
                    AND i.invoice_date >= '2026-01-01'
GROUP BY p.patient_id
ORDER BY p.patient_id;`,
    ordered: true,
    hints: ['The LEFT JOIN should keep every patient. Something removes them afterwards.', 'For unmatched patients, i.invoice_date is NULL.', 'NULL >= \'2026-01-01\' is UNKNOWN, so WHERE drops those rows.', 'Move the date condition into the ON clause.'],
    explain: 'A WHERE condition on the right-hand table of a LEFT JOIN turns it back into an INNER JOIN. Conditions in ON only decide which rows match; they never remove left-side rows.' },

  { id: 'pc-104', title: 'Fix: billed vs paid per patient', level: 3, topic: 'Debugging',
    prompt: 'This should show, for each patient with invoices, total billed (sum of invoice totals) and total paid (sum of payments), ordered by patient_id. Billed is inflated for several patients. Fix it.',
    buggy: `SELECT i.patient_id,
       SUM(i.total_amount) AS billed,
       COALESCE(SUM(p.amount), 0) AS paid
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.invoice_id
GROUP BY i.patient_id
ORDER BY i.patient_id;`,
    solution: `SELECT i.patient_id,
       SUM(i.total_amount) AS billed,
       COALESCE(SUM(pp.paid), 0) AS paid
FROM invoices i
LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid
           FROM payments
           GROUP BY invoice_id) pp ON pp.invoice_id = i.invoice_id
GROUP BY i.patient_id
ORDER BY i.patient_id;`,
    ordered: true,
    hints: ['Look at an invoice with two payments: how many rows does it produce after the join?', 'Each payment row repeats the invoice total, so SUM counts it twice.', 'Reduce payments to one row per invoice before joining.', 'LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) pp'],
    explain: 'Joining a one-to-many table duplicates the parent row once per child (fan-out). Pre-aggregating the child to the parent\'s grain keeps SUM(total_amount) honest.' },

  { id: 'pc-105', title: 'Fix: charge lines per specialty', level: 2, topic: 'Debugging',
    prompt: 'This should return one row per specialty with the number of charge lines billed by that specialty, ordered by specialty. It returns several rows for the same specialty. Fix it.',
    buggy: `SELECT pr.specialty, COUNT(*) AS lines
FROM charges c
JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
GROUP BY pr.practitioner_id
ORDER BY pr.specialty;`,
    solution: `SELECT pr.specialty, COUNT(*) AS lines
FROM charges c
JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
GROUP BY pr.specialty
ORDER BY pr.specialty;`,
    ordered: true,
    hints: ['How many groups does the query form, and by what?', 'The groups should match the rows you want: one per specialty.', 'SQLite lets you select a column you did not group by, which hides the mistake.', 'GROUP BY pr.specialty'],
    explain: 'The GROUP BY defines the grain of the result. Grouping by practitioner gives one row per practitioner; most other databases would also reject selecting specialty without grouping by it.' },

  { id: 'pc-106', title: 'Fix: payors never billed', level: 3, topic: 'Debugging',
    prompt: 'This should list payor_id and payor_name of payors that appear on no invoice, ordered by payor_id. It returns nothing, although payors 5 and 6 were never billed. Fix it.',
    buggy: `SELECT payor_id, payor_name
FROM payors
WHERE payor_id NOT IN (SELECT payor_id FROM invoices)
ORDER BY payor_id;`,
    solution: `SELECT py.payor_id, py.payor_name
FROM payors py
WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.payor_id = py.payor_id)
ORDER BY py.payor_id;`,
    ordered: true,
    hints: ['Check the subquery: does invoices.payor_id contain NULLs?', 'x NOT IN (1, 2, NULL) is never TRUE: it is FALSE or UNKNOWN.', 'Either filter the NULLs out of the subquery, or use NOT EXISTS.', 'WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.payor_id = py.payor_id)'],
    explain: 'One NULL in a NOT IN list makes the whole predicate UNKNOWN for every row. NOT EXISTS (or adding WHERE payor_id IS NOT NULL to the subquery) is NULL-safe.' },

  { id: 'pc-107', title: 'Fix: April 2025 payments', level: 2, topic: 'Debugging',
    prompt: 'This should list payment_id, payment_date and amount for payments received in April 2025, ordered by payment_date then payment_id. It includes a payment from another month. Fix it.',
    buggy: `SELECT payment_id, payment_date, amount
FROM payments
WHERE payment_date BETWEEN '2025-04-01' AND '2025-05-01'
ORDER BY payment_date, payment_id;`,
    solution: `SELECT payment_id, payment_date, amount
FROM payments
WHERE payment_date >= '2025-04-01' AND payment_date < '2025-05-01'
ORDER BY payment_date, payment_id;`,
    ordered: true,
    hints: ['Look at the last row of the result.', 'BETWEEN includes both ends.', 'So the first day of the next month is included.', "Use a half-open range: payment_date >= '2025-04-01' AND payment_date < '2025-05-01'."],
    explain: 'BETWEEN is inclusive on both sides, so "up to the 1st of next month" includes that day. A half-open range (>= start AND < next start) is correct for dates and timestamps alike.' },

  { id: 'pc-108', title: 'Fix: paid rate per location', level: 2, topic: 'Debugging',
    prompt: 'This should show, per location_id, the percentage of invoices that are Paid, rounded to 1 decimal (e.g. 42.9). Every percentage comes out as 0. Fix it. Order by location_id.',
    buggy: `SELECT location_id,
       COUNT(*) FILTER (WHERE status = 'Paid') / COUNT(*) * 100 AS pct_paid
FROM invoices
GROUP BY location_id
ORDER BY location_id;`,
    solution: `SELECT location_id,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Paid') / COUNT(*), 1) AS pct_paid
FROM invoices
GROUP BY location_id
ORDER BY location_id;`,
    ordered: true,
    hints: ['What type does COUNT(*) return?', 'Integer divided by a larger integer gives 0 in SQLite.', 'Make the calculation real before dividing.', "ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Paid') / COUNT(*), 1)"],
    explain: 'Integer / integer is integer division in SQLite, PostgreSQL and SQL Server (3 / 7 = 0). Multiplying by 100.0 first makes the division real.' },

  { id: 'pc-109', title: 'Fix: problem invoices at St. Mary', level: 2, topic: 'Debugging',
    prompt: "This should list invoice_id, location_id and status of location 2's invoices that are Overdue or Partially Paid, ordered by invoice_id. It also shows invoices from other locations. Fix it.",
    buggy: `SELECT invoice_id, location_id, status
FROM invoices
WHERE location_id = 2 AND status = 'Overdue' OR status = 'Partially Paid'
ORDER BY invoice_id;`,
    solution: `SELECT invoice_id, location_id, status
FROM invoices
WHERE location_id = 2 AND (status = 'Overdue' OR status = 'Partially Paid')
ORDER BY invoice_id;`,
    ordered: true,
    hints: ['Which operator binds tighter, AND or OR?', 'AND is evaluated first, so the query reads (location 2 AND Overdue) OR (Partially Paid anywhere).', 'Group the OR with parentheses.', "WHERE location_id = 2 AND (status = 'Overdue' OR status = 'Partially Paid'), or use status IN (...)."],
    explain: 'AND has higher precedence than OR. Always parenthesise mixed AND/OR conditions; IN (...) avoids the problem entirely.' },

  { id: 'pc-110', title: 'Fix: each patient\'s visit number', level: 3, topic: 'Debugging',
    prompt: "This should number each patient's invoices 1, 2, 3... in invoice_date order (ties by invoice_id). Return patient_id, invoice_id, invoice_date and visit_no, ordered by patient_id, visit_no. The numbering is wrong. Fix it.",
    buggy: `SELECT patient_id, invoice_id, invoice_date,
       ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY invoice_date, invoice_id) AS visit_no
FROM invoices
ORDER BY patient_id, visit_no;`,
    solution: `SELECT patient_id, invoice_id, invoice_date,
       ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id) AS visit_no
FROM invoices
ORDER BY patient_id, visit_no;`,
    ordered: true,
    hints: ['The numbering should restart for each patient.', 'What does PARTITION BY control?', 'The query restarts the count per location instead.', 'PARTITION BY patient_id'],
    explain: 'PARTITION BY decides where the numbering restarts. Partitioning by the wrong column silently produces plausible-looking but wrong numbers.' },

  { id: 'pc-111', title: 'Fix: total money received', level: 3, topic: 'Debugging',
    prompt: 'This should return the total amount received across all payments, adding insurer payments and patient payments together (every payment row counts). The total is too low. Fix it.',
    buggy: `SELECT SUM(amount) AS total_received
FROM (SELECT amount FROM payments WHERE payor_id IS NOT NULL
      UNION
      SELECT amount FROM payments WHERE payor_id IS NULL);`,
    solution: `SELECT SUM(amount) AS total_received
FROM (SELECT amount FROM payments WHERE payor_id IS NOT NULL
      UNION ALL
      SELECT amount FROM payments WHERE payor_id IS NULL);`,
    ordered: false,
    hints: ['Several different payments have the same amount (for example 30 or 27.5).', 'What does UNION do with identical rows?', 'UNION removes duplicates; that discards real payments.', 'Use UNION ALL.'],
    explain: 'UNION de-duplicates, so two separate $30 payments collapse into one. When combining rows that should all count, use UNION ALL (it is also faster, as no de-duplication step is needed).' },

  { id: 'pc-112', title: 'Fix: repeat overdue patients', level: 3, topic: 'Debugging',
    prompt: 'This should list patient_id, last_name and the number of Overdue invoices for patients with at least 2 Overdue invoices, ordered by patient_id. It fails. Fix it.',
    buggy: `SELECT patient_id, last_name, COUNT(*) AS overdue
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id
GROUP BY patient_id
HAVING status = 'Overdue' AND COUNT(*) >= 2
ORDER BY patient_id;`,
    solution: `SELECT p.patient_id, p.last_name, COUNT(*) AS overdue
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id
WHERE i.status = 'Overdue'
GROUP BY p.patient_id, p.last_name
HAVING COUNT(*) >= 2
ORDER BY p.patient_id;`,
    ordered: true,
    hints: ['Read the error: which column name exists in both tables?', 'Qualify patient_id with a table alias everywhere.', 'status is a row-level condition, not a group-level one.', "Move status = 'Overdue' to WHERE and keep only COUNT(*) >= 2 in HAVING."],
    explain: 'After a join, a column present in both tables must be qualified. And HAVING is for aggregate conditions: a row filter in HAVING either fails or tests one arbitrary row of the group.' },

  // ───────────────────────── Site-level challenges (sites → treatment_locations → invoices ...) ─────────────────────────
  { id: 'pc-113', title: 'Sites without treatment locations', level: 1, topic: 'Joins',
    prompt: 'Find sites that have no treatment locations yet. Return site_name and is_active.',
    solution: `SELECT s.site_name, s.is_active
FROM sites s
LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id
WHERE tl.location_id IS NULL;`,
    ordered: false,
    hints: ['Sites are in the sites table; locations point to a site through treatment_locations.site_id.', 'You want sites with NO matching location: an anti-join.', 'LEFT JOIN treatment_locations, then keep rows where the location side is NULL.', 'SELECT s.site_name, s.is_active FROM sites s LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id WHERE tl.location_id IS NULL;'],
    explain: 'A LEFT JOIN keeps every site. Where no location matches, the location columns are NULL, and that is exactly what the WHERE keeps. Only the planned Westlake Surgery Center qualifies.' },

  { id: 'pc-114', title: 'Revenue per site', level: 2, topic: 'Aggregations',
    prompt: "Show each site's total billed amount: the sum of invoice total_amount, excluding Void invoices. Only include sites that billed something. Columns: site_name, billed. Highest billed first, ties by site_name.",
    solution: `SELECT s.site_name, ROUND(SUM(i.total_amount), 2) AS billed
FROM sites s
JOIN treatment_locations tl ON tl.site_id = s.site_id
JOIN invoices i            ON i.location_id = tl.location_id
WHERE i.status <> 'Void'
GROUP BY s.site_id
ORDER BY billed DESC, s.site_name;`,
    ordered: true,
    hints: ['Invoices do not have a site_id. Which table connects an invoice to its site?', 'Path: sites → treatment_locations (site_id) → invoices (location_id).', "INNER JOINs are fine here (only sites that billed), plus WHERE i.status <> 'Void'.", 'GROUP BY s.site_id, SUM(i.total_amount), ORDER BY billed DESC, s.site_name.'],
    explain: 'The site is derived: each invoice belongs to one location and each location to one site, so SUM per site is a clean roll-up. Lakeview Medical Pavilion leads because it has two locations (physical therapy and telehealth).' },

  { id: 'pc-115', title: 'Site activity summary (including zeros)', level: 2, topic: 'Joins',
    prompt: 'For EVERY site, show site_name, the number of treatment locations, the number of invoices and the number of distinct patients billed there. Sites with no activity must show 0. Order by site_id.',
    solution: `SELECT s.site_name,
       COUNT(DISTINCT tl.location_id) AS locations,
       COUNT(DISTINCT i.invoice_id)   AS invoices,
       COUNT(DISTINCT i.patient_id)   AS patients
FROM sites s
LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id
LEFT JOIN invoices i            ON i.location_id = tl.location_id
GROUP BY s.site_id
ORDER BY s.site_id;`,
    ordered: true,
    hints: ['Every site must appear, so start FROM sites.', 'Use LEFT JOIN for both steps: sites → treatment_locations → invoices.', 'The second join repeats location rows, so count with COUNT(DISTINCT ...).', 'COUNT(DISTINCT tl.location_id), COUNT(DISTINCT i.invoice_id), COUNT(DISTINCT i.patient_id) ... GROUP BY s.site_id ORDER BY s.site_id.'],
    explain: 'LEFT JOINs keep Eastside (a location but no invoices) and Westlake (no locations). COUNT(column) ignores the NULLs those rows produce, so they show 0.' },

  { id: 'pc-116', title: 'Sites with no billing activity', level: 2, topic: 'Subqueries',
    prompt: 'List sites that have never issued an invoice through any of their locations. Return site_id and site_name, ordered by site_id.',
    solution: `SELECT s.site_id, s.site_name
FROM sites s
WHERE NOT EXISTS (
  SELECT 1
  FROM treatment_locations tl
  JOIN invoices i ON i.location_id = tl.location_id
  WHERE tl.site_id = s.site_id
)
ORDER BY s.site_id;`,
    ordered: true,
    hints: ['"Never issued" means an invoice for this site does not exist: think NOT EXISTS.', 'The subquery needs the path treatment_locations → invoices.', 'Correlate the subquery with WHERE tl.site_id = s.site_id.', 'SELECT s.site_id, s.site_name FROM sites s WHERE NOT EXISTS (SELECT 1 FROM treatment_locations tl JOIN invoices i ON i.location_id = tl.location_id WHERE tl.site_id = s.site_id) ORDER BY s.site_id;'],
    explain: 'NOT EXISTS checks the whole path for each site. It correctly catches both a site with a location but no invoices (Eastside) and a site with no locations at all (Westlake).' },

  { id: 'pc-117', title: 'Patients seen at more than one site', level: 3, topic: 'Aggregations',
    prompt: 'Find patients who have invoices at two or more different sites. Return patient_id, first_name, last_name and sites_visited. Order by sites_visited descending, then patient_id.',
    solution: `SELECT p.patient_id, p.first_name, p.last_name,
       COUNT(DISTINCT tl.site_id) AS sites_visited
FROM patients p
JOIN invoices i            ON i.patient_id = p.patient_id
JOIN treatment_locations tl ON tl.location_id = i.location_id
GROUP BY p.patient_id
HAVING COUNT(DISTINCT tl.site_id) >= 2
ORDER BY sites_visited DESC, p.patient_id;`,
    ordered: true,
    hints: ['Patients and sites are many-to-many. Which table connects them?', 'Path: patients → invoices → treatment_locations (you can read site_id there, no need to join sites).', 'Count DISTINCT site_id per patient, because two invoices at the same site count once.', 'GROUP BY p.patient_id HAVING COUNT(DISTINCT tl.site_id) >= 2.'],
    explain: 'This is the N : N between sites and patients made visible: 13 patients were treated at two or more sites. It is why you must never add up per-site patient counts to get a total.' },

  { id: 'pc-118', title: 'Collected per site (all sites)', level: 2, topic: 'Joins',
    prompt: 'For every site, show the total of all payments received on its invoices (use every payment row as recorded). Sites with nothing collected show 0. Columns: site_name, collected (rounded to 2 decimals). Highest first, ties by site_name.',
    solution: `SELECT s.site_name, ROUND(COALESCE(SUM(pm.amount), 0), 2) AS collected
FROM sites s
LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id
LEFT JOIN invoices i            ON i.location_id = tl.location_id
LEFT JOIN payments pm           ON pm.invoice_id = i.invoice_id
GROUP BY s.site_id
ORDER BY collected DESC, s.site_name;`,
    ordered: true,
    hints: ['Payments belong to invoices, invoices to locations, locations to sites.', 'Keep every site: LEFT JOIN all three steps.', 'SUM over no rows is NULL. Wrap it in COALESCE(..., 0).', 'Only one numeric column is summed here, so the join fan-out is harmless.'],
    explain: 'Summing only payment amounts is safe: each payment row appears once. The trouble starts when you ALSO sum an invoice-level column in the same query (see "Billed vs collected per site").' },

  { id: 'pc-119', title: 'Outstanding balance per site (ledger)', level: 3, topic: 'CTEs',
    prompt: 'Using the transactions ledger (balance of an invoice = SUM(amount)), show the total outstanding balance per site. Only include sites whose total is above 0. Columns: site_name, outstanding (rounded to 2 decimals). Highest first.',
    solution: `WITH balances AS (
  SELECT invoice_id, SUM(amount) AS balance
  FROM transactions
  GROUP BY invoice_id
)
SELECT s.site_name, ROUND(SUM(b.balance), 2) AS outstanding
FROM sites s
JOIN treatment_locations tl ON tl.site_id = s.site_id
JOIN invoices i            ON i.location_id = tl.location_id
JOIN balances b            ON b.invoice_id = i.invoice_id
GROUP BY s.site_id
HAVING SUM(b.balance) > 0
ORDER BY outstanding DESC;`,
    ordered: true,
    hints: ['First compute one balance per invoice from transactions.', 'Put that in a CTE: SELECT invoice_id, SUM(amount) AS balance FROM transactions GROUP BY invoice_id.', 'Roll the CTE up to sites through invoices → treatment_locations → sites.', 'Filter groups with HAVING SUM(b.balance) > 0 and sort by outstanding DESC.'],
    explain: 'Aggregating the ledger per invoice first, then rolling up, keeps every number at the right grain. Joining raw transactions directly would also work here, but the CTE makes the two steps explicit.' },

  { id: 'pc-120', title: 'Top practitioner at each site', level: 4, topic: 'Window Functions',
    prompt: 'For each site, find the practitioner with the highest billed charge amount at that site. Use the invoice\'s location to decide the site. Return site_name, practitioner (first_name || \' \' || last_name) and billed. Keep ties. Order by site_name, then practitioner.',
    solution: `WITH per_prac AS (
  SELECT s.site_id, s.site_name,
         pr.first_name || ' ' || pr.last_name AS practitioner,
         SUM(c.amount) AS billed,
         RANK() OVER (PARTITION BY s.site_id ORDER BY SUM(c.amount) DESC) AS rk
  FROM charges c
  JOIN invoices i            ON i.invoice_id = c.invoice_id
  JOIN treatment_locations tl ON tl.location_id = i.location_id
  JOIN sites s               ON s.site_id = tl.site_id
  JOIN practitioners pr      ON pr.practitioner_id = c.practitioner_id
  GROUP BY s.site_id, pr.practitioner_id
)
SELECT site_name, practitioner, billed
FROM per_prac
WHERE rk = 1
ORDER BY site_name, practitioner;`,
    ordered: true,
    hints: ['Charges carry the amount and the practitioner; the site comes from the charge\'s invoice.', 'Path: charges → invoices → treatment_locations → sites, plus charges → practitioners.', 'GROUP BY site and practitioner, then RANK() OVER (PARTITION BY site ORDER BY SUM(c.amount) DESC).', 'A window function cannot go in WHERE: wrap it in a CTE and filter rk = 1 outside.'],
    explain: 'Aggregation and window functions combine: GROUP BY builds one row per (site, practitioner), RANK numbers them within each site, and RANK keeps ties.' },

  { id: 'pc-121', title: 'Billed vs collected per site', level: 3, topic: 'Debugging',
    prompt: 'This query should show, per site (only sites with invoices), billed = SUM of invoice total_amount and collected = SUM of payment amounts, both rounded to 2 decimals, ordered by site_name. The billed numbers are too high. Fix it.',
    buggy: `SELECT s.site_name,
       ROUND(SUM(i.total_amount), 2) AS billed,
       ROUND(SUM(pm.amount), 2)      AS collected
FROM sites s
JOIN treatment_locations tl ON tl.site_id = s.site_id
JOIN invoices i            ON i.location_id = tl.location_id
LEFT JOIN payments pm      ON pm.invoice_id = i.invoice_id
GROUP BY s.site_id
ORDER BY s.site_name;`,
    solution: `WITH paid AS (
  SELECT invoice_id, SUM(amount) AS collected
  FROM payments
  GROUP BY invoice_id
)
SELECT s.site_name,
       ROUND(SUM(i.total_amount), 2)              AS billed,
       ROUND(COALESCE(SUM(paid.collected), 0), 2) AS collected
FROM sites s
JOIN treatment_locations tl ON tl.site_id = s.site_id
JOIN invoices i            ON i.location_id = tl.location_id
LEFT JOIN paid             ON paid.invoice_id = i.invoice_id
GROUP BY s.site_id
ORDER BY s.site_name;`,
    ordered: true,
    hints: ['Compare the buggy billed values with a query that has no payments join. What changed?', 'An invoice with 2 payments appears on 2 rows after the join, so its total_amount is summed twice (fan-out).', 'Aggregate payments per invoice FIRST (a CTE), so each invoice joins to at most one row.', 'WITH paid AS (SELECT invoice_id, SUM(amount) AS collected FROM payments GROUP BY invoice_id) ... LEFT JOIN paid ON paid.invoice_id = i.invoice_id.'],
    explain: 'The 1 : N join to payments multiplied invoice rows. Lakeview showed $6,615 billed instead of $5,470. Pre-aggregating the "many" side to the invoice grain removes the fan-out.' },

  { id: 'pc-122', title: 'Create a site_invoices view', level: 3, topic: 'Schema Design', mode: 'state',
    prompt: 'Instead of storing site_id on invoices, create a VIEW named site_invoices that exposes invoice_id, site_id, site_name, location_name and total_amount for every invoice (derived through treatment_locations and sites).',
    solution: `CREATE VIEW site_invoices AS
SELECT i.invoice_id, s.site_id, s.site_name, tl.location_name, i.total_amount
FROM invoices i
JOIN treatment_locations tl ON tl.location_id = i.location_id
JOIN sites s               ON s.site_id = tl.site_id;`,
    check: `-- (a placeholder with no rows exists only if you did not create the view)
CREATE VIEW IF NOT EXISTS site_invoices AS
  SELECT NULL AS invoice_id, NULL AS site_id, NULL AS site_name, NULL AS location_name, NULL AS total_amount WHERE 0;
SELECT site_id, site_name, COUNT(*) AS invoices, ROUND(SUM(total_amount), 2) AS billed
FROM site_invoices
GROUP BY site_id, site_name
ORDER BY site_id;`,
    hints: ['A view is a saved SELECT: CREATE VIEW name AS SELECT ...', 'Join invoices → treatment_locations → sites.', 'Select exactly: i.invoice_id, s.site_id, s.site_name, tl.location_name, i.total_amount.', 'CREATE VIEW site_invoices AS SELECT i.invoice_id, s.site_id, s.site_name, tl.location_name, i.total_amount FROM invoices i JOIN treatment_locations tl ON tl.location_id = i.location_id JOIN sites s ON s.site_id = tl.site_id;'],
    explain: 'The view gives every query an invoice-level site_id without storing it twice. If a location ever moves to another site, the view reflects it automatically, with nothing to keep in sync.' },
];
