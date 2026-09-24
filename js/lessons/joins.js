// Section 05: Joins & Relationships (joins-01 .. joins-21)
// Healthcare Billing database. See tools/CONTENT_GUIDE.md.
Lessons.add([
  // ─────────────────────────────────────────────────────────────── 01
  {
    id: 'joins-01',
    goals: [
      'Why billing data is split across many tables',
      'What a primary key and a foreign key do',
      'How a JOIN puts related rows back together',
      'How to read a JOIN query from top to bottom',
    ],
    concept: `<p>A well-designed database stores each fact <b>once</b>. A patient's name lives in <code>patients</code>. An invoice lives in <code>invoices</code>, and it keeps only a small number, <code>patient_id</code>, that points back to the patient.</p>
<p>That is great for storage (no copies to keep in sync), but a person reading an invoice wants to see the <b>name</b>, not the number 24. A <b>JOIN</b> is how SQL follows that pointer: for each invoice row, it finds the patient row with the same <code>patient_id</code> and glues the two rows side by side.</p>
<ul>
<li><b>Primary key (PK)</b>: the unique id of a row, for example <code>patients.patient_id</code>.</li>
<li><b>Foreign key (FK)</b>: a column that stores another table's PK, for example <code>invoices.patient_id</code>.</li>
<li><b>JOIN ... ON</b>: the rule that says which rows belong together, usually <code>FK = PK</code>.</li>
</ul>`,
    why: 'Normalized databases split data into many tables to avoid duplication and update errors. JOINs let you recombine that data at query time, whenever you need it.',
    when: 'Any time the columns you want to see live in more than one table: a patient name on an invoice, a practitioner name on a charge, a payor name on a payment.',
    analogy: 'A billing clerk sees "Patient #24" on an invoice. To print the statement, the clerk opens the patient file cabinet, finds folder #24 and copies the name and address. A JOIN is that trip to the file cabinet, done for every invoice at once.',
    exampleSql: `SELECT invoice_id, patient_id, invoice_date, total_amount FROM invoices ORDER BY invoice_id LIMIT 6`,
    syntax: `SELECT a.col, b.col
FROM table_a AS a
JOIN table_b AS b
  ON b.key = a.key;`,
    sql: `SELECT i.invoice_id,
       i.invoice_date,
       p.first_name || ' ' || p.last_name AS patient_name,
       i.total_amount
FROM invoices AS i
JOIN patients AS p
  ON p.patient_id = i.patient_id
ORDER BY i.invoice_id
LIMIT 10;`,
    breakdown: [
      ['SELECT i.invoice_id, ... patient_name', 'Columns come from both tables. The prefix (i. or p.) says which table each one comes from.'],
      ['FROM invoices AS i', 'Start with invoices, and give the table a short alias, i.'],
      ['JOIN patients AS p', 'Bring in the patients table under the alias p.'],
      ['ON p.patient_id = i.patient_id', 'The matching rule: an invoice belongs to the patient whose PK equals the invoice FK.'],
      ['ORDER BY i.invoice_id LIMIT 10', 'Show the first 10 invoices in id order.'],
    ],
    visual: { type: 'keys', parent: 'patients', child: 'invoices', pk: 'patient_id', fk: 'patient_id' },
    internals: `<p>Logically, a JOIN starts from every possible pair of rows (a Cartesian product) and keeps only the pairs where the ON condition is true. Physically, no engine builds all those pairs. SQLite loops over one table and, for each row, looks up matching rows in the other table, often through the primary key index. That is why joining on a primary key is so fast.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, first_name, last_name
FROM invoices, patients;`, why: 'There is no matching rule, so every invoice is paired with every patient: 48 × 25 = 1,200 rows of nonsense (a Cartesian product).', fix: `SELECT invoice_id, first_name, last_name
FROM invoices
JOIN patients ON patients.patient_id = invoices.patient_id;` },
      { wrong: `SELECT invoice_id, patient_id, first_name
FROM invoices
JOIN patients ON patients.patient_id = invoices.patient_id;`, why: 'patient_id exists in both tables, so the database does not know which one you mean: "ambiguous column name".', fix: `SELECT i.invoice_id, i.patient_id, p.first_name
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id;` },
    ],
    rules: [
      'Every JOIN needs a matching rule (ON or USING), unless you really want every combination.',
      'The usual rule is child FK = parent PK.',
      'Use short table aliases and prefix every column once more than one table is involved.',
    ],
    compare: `<table><tr><th>Approach</th><th>What you get</th></tr>
<tr><td>Query invoices alone</td><td>Invoice rows with a bare patient_id number</td></tr>
<tr><td>Copy patient names into invoices</td><td>Duplicate data that goes stale when a name changes</td></tr>
<tr><td><b>JOIN at query time</b></td><td>One source of truth, combined only when you need it</td></tr></table>`,
    realWorld: 'Every patient statement, claim form (CMS-1500) and A/R report is built from joins: invoice + patient + payor + location + practitioner.',
    tips: ['Read "JOIN patients p ON p.patient_id = i.patient_id" as "for each invoice, fetch its patient".', 'Put the new table on the left side of the ON condition. It reads more naturally.'],
    deep: `<p>Relational algebra defines the join as a selection over a Cartesian product: R ⋈<sub>θ</sub> S = σ<sub>θ</sub>(R × S). The optimizer's whole job is to get the same answer without ever materializing R × S.</p>`,
    tryIt: {
      prompt: 'Add the payor name to each invoice. Join payors on payor_id and select p2.payor_name. Notice which invoices disappear. (Hint: two invoices have no payor.)',
      starter: `SELECT i.invoice_id, p.last_name, i.total_amount
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id
ORDER BY i.invoice_id;`,
    },
    challenge: {
      level: 1,
      prompt: 'List every Overdue invoice with its invoice_id, the patient last name and the total_amount, ordered by invoice_id.',
      solution: `SELECT i.invoice_id, p.last_name, i.total_amount
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id
WHERE i.status = 'Overdue'
ORDER BY i.invoice_id;`,
      hints: ['The status lives in invoices, and the last name lives in patients.', 'Join the two tables on patient_id.', 'Filter with WHERE i.status = \'Overdue\'.', 'SELECT i.invoice_id, p.last_name, i.total_amount FROM invoices i JOIN patients p ON p.patient_id = i.patient_id WHERE ... ORDER BY i.invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'invoices.patient_id stores the id of a row in patients. What is invoices.patient_id?', options: ['A primary key', 'A foreign key', 'An index', 'An alias'], answer: 1, why: 'A column that stores another table\'s primary key is a foreign key.' },
      { q: 'What happens if you list two tables in FROM with no join condition?', options: ['An error', 'Only matching rows', 'Every row paired with every row (Cartesian product)', 'The first table only'], answer: 2, why: 'Without a condition every pair is valid, so you get rows(A) × rows(B).' },
      { q: 'Why do databases split patients and invoices into separate tables?', options: ['To make queries slower', 'So each fact is stored once and stays consistent', 'Because SQL cannot store text and numbers together', 'To hide data'], answer: 1, why: 'Normalization avoids duplicated data that could get out of sync.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 02
  {
    id: 'joins-02',
    goals: [
      'What INNER JOIN keeps and what it drops',
      'How one-to-many matches multiply rows',
      'How to avoid Cartesian products and ambiguous columns',
      'How ON works as a filter on row pairs',
    ],
    concept: `<p><b>INNER JOIN</b> (or just <code>JOIN</code>) returns only the pairs of rows that <b>match</b> on the ON condition. A row with no partner on the other side is silently dropped.</p>
<ul>
<li>A patient with 3 invoices appears <b>3 times</b>, once per invoice.</li>
<li>A patient with <b>no invoices</b> (patients 8, 9, 17, 19 and 22 in our data) does <b>not appear at all</b>.</li>
<li>An invoice always has a patient, so every invoice appears exactly once.</li>
</ul>
<p>In a Venn diagram, INNER JOIN is the overlap in the middle: only the rows that exist on both sides.</p>`,
    why: 'Most questions are about things that are actually related: invoices and the patients they were billed to, charges and the practitioners who performed them. INNER JOIN answers exactly that.',
    when: 'Use it when you only care about rows that have a match, for example "show billed invoices with patient names" or "list charges with the practitioner who performed them".',
    analogy: 'The clerk pairs each claim form with its patient chart. Charts with no claim stay in the drawer, and they are not on the report. Only matched pairs go into the outbox.',
    exampleSql: `SELECT patient_id, first_name, last_name FROM patients WHERE patient_id IN (7, 8, 9, 24)`,
    syntax: `SELECT a.col, b.col
FROM table_a a
INNER JOIN table_b b
  ON b.fk = a.pk;`,
    sql: `SELECT p.patient_id,
       p.first_name,
       p.last_name,
       i.invoice_id,
       i.status,
       i.total_amount
FROM patients p
INNER JOIN invoices i
  ON i.patient_id = p.patient_id
ORDER BY p.patient_id, i.invoice_id;`,
    breakdown: [
      ['SELECT p.patient_id, ..., i.total_amount', 'Patient columns (p.) and invoice columns (i.) side by side.'],
      ['FROM patients p', 'Left table: patients, alias p.'],
      ['INNER JOIN invoices i', 'Right table: invoices, alias i. INNER means only matches survive.'],
      ['ON i.patient_id = p.patient_id', 'A pair is kept only when the invoice FK equals the patient PK.'],
      ['ORDER BY p.patient_id, i.invoice_id', 'Group each patient\'s invoices together so the repetition is easy to see.'],
    ],
    visual: { type: 'join', join: 'inner' },
    internals: `<p>SQLite runs joins as <b>nested loops</b>: an outer loop over one table and, for each row, an inner lookup in the other. When the inner side is looked up by its primary key (<code>patients.patient_id</code>) each lookup is a B-tree search, O(log n). Other engines can also pick a <b>hash join</b> (build a hash table on the smaller input, probe it with the larger) or a <b>merge join</b> (walk two inputs that are sorted on the key). The result is the same; only the speed differs.</p>`,
    mistakes: [
      { wrong: `SELECT p.last_name, i.invoice_id
FROM patients p
JOIN invoices i;`, why: 'No ON condition. SQLite treats this as a CROSS JOIN and returns 25 × 48 = 1,200 rows, pairing every patient with every invoice.', fix: `SELECT p.last_name, i.invoice_id
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id;` },
      { wrong: `SELECT patient_id, last_name, invoice_id
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id;`, why: 'patient_id is in both tables, so the reference is ambiguous and the query fails.', fix: `SELECT p.patient_id, p.last_name, i.invoice_id
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id;` },
      { wrong: `SELECT p.last_name, i.invoice_id
FROM patients p
JOIN invoices i ON i.invoice_id = p.patient_id;`, why: 'The ON condition compares the wrong columns. It runs without an error but pairs invoice #3 with patient #3, which is meaningless. Always join FK to the PK it references.', fix: `SELECT p.last_name, i.invoice_id
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id;` },
    ],
    rules: [
      'INNER JOIN = only matching pairs; unmatched rows on either side disappear.',
      'JOIN and INNER JOIN are the same thing.',
      'One-to-many joins repeat the "one" side once per matching "many" row.',
      'Prefix shared column names with the table alias.',
    ],
    compare: `<table><tr><th>Join</th><th>Unmatched patients</th><th>Unmatched invoices</th><th>Rows here</th></tr>
<tr><td><b>INNER</b></td><td>dropped</td><td>dropped</td><td>48</td></tr>
<tr><td>LEFT (patients first)</td><td>kept, NULL invoice columns</td><td>dropped</td><td>53</td></tr>
<tr><td>CROSS</td><td colspan="2">every combination</td><td>1,200</td></tr></table>`,
    realWorld: 'Claims reports, "charges with rendering provider", "payments with payor name": nearly every operational billing report starts with INNER JOINs.',
    tips: ['Count the rows before and after a join. If the count jumps unexpectedly, check the ON condition.'],
    deep: `<p>An INNER JOIN is <b>commutative and associative</b>: <code>A JOIN B</code> gives the same rows as <code>B JOIN A</code>, and the order of several inner joins can be rearranged. That is what gives the optimizer the freedom to choose the join order. Outer joins do not have this freedom.</p>`,
    tryIt: {
      prompt: 'Join charges to practitioners to show who performed each charge (charge_id, cpt_code, last_name, specialty). Is practitioner 12, Leo Martins, in the result? Why not?',
      starter: `SELECT c.charge_id, c.cpt_code, pr.last_name, pr.specialty
FROM charges c
JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
ORDER BY c.charge_id;`,
    },
    challenge: {
      level: 2,
      prompt: 'List every charge on invoice 16 with charge_id, cpt_code, amount, and the practitioner\'s last_name and specialty. Order by charge_id.',
      solution: `SELECT c.charge_id, c.cpt_code, c.amount, pr.last_name, pr.specialty
FROM charges c
JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
WHERE c.invoice_id = 16
ORDER BY c.charge_id;`,
      hints: ['Charges know the practitioner_id; practitioners know the name and specialty.', 'JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id', 'Filter to one invoice with WHERE c.invoice_id = 16.', 'Select c.charge_id, c.cpt_code, c.amount, pr.last_name, pr.specialty and ORDER BY c.charge_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Patient 9 has no invoices. How many times does patient 9 appear in patients INNER JOIN invoices?', options: ['0', '1, with NULLs', '48', 'It causes an error'], answer: 0, why: 'INNER JOIN drops rows that have no match.' },
      { q: 'A patient has 4 invoices. How many rows does that patient produce in patients JOIN invoices?', options: ['1', '4', '5', '25'], answer: 1, why: 'One row per matching pair: 4 invoices, 4 rows.' },
      { q: 'What does "JOIN invoices i" with no ON clause produce in SQLite?', options: ['A syntax error', 'A Cartesian product', 'An INNER JOIN on the primary key', 'A LEFT JOIN'], answer: 1, why: 'Without a condition, JOIN behaves like CROSS JOIN.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 03
  {
    id: 'joins-03',
    goals: [
      'How LEFT JOIN keeps every row of the left table',
      'Why unmatched rows get NULLs on the right side',
      'The classic mistake: a WHERE filter that turns LEFT into INNER',
      'Putting right-table filters in ON instead',
    ],
    concept: `<p><b>LEFT JOIN</b> (LEFT OUTER JOIN) keeps <b>every</b> row from the left table. If a row has matches on the right, you get one row per match, just like INNER JOIN. If it has <b>no</b> match, you still get the row once, with <code>NULL</code> in every right-side column.</p>
<p>In our data, patients 8, 9, 17, 19 and 22 have never been billed. With <code>patients LEFT JOIN invoices</code> they still appear, with <code>invoice_id = NULL</code>. That makes 48 matched rows + 5 unmatched = 53 rows.</p>
<p><b>The trap:</b> a condition on the right table in <code>WHERE</code> (such as <code>WHERE i.status = 'Paid'</code>) runs <i>after</i> the join. On the unmatched rows <code>i.status</code> is NULL, <code>NULL = 'Paid'</code> is not true, and the row is thrown away. The LEFT JOIN has quietly become an INNER JOIN. Put the condition in <code>ON</code> to filter the right side while keeping every left row.</p>`,
    why: 'Many questions are about "all of X, with Y if it exists": all patients with their invoices, all practitioners with their charges. INNER JOIN would hide the X rows that have no Y, which are often the most interesting ones.',
    when: 'Use it when the left table is your full list and the right side is optional information, or when you want to find the rows that have no match.',
    analogy: 'The front desk prints the full patient roster and writes each patient\'s invoices next to their name. Patients with no invoices keep their line on the roster, and the invoice column is left blank.',
    exampleSql: `SELECT patient_id, first_name, last_name FROM patients WHERE patient_id IN (8, 9, 17, 19, 22)`,
    syntax: `SELECT a.col, b.col
FROM left_table a
LEFT JOIN right_table b
  ON b.fk = a.pk
  AND b.other_col = 'value'   -- filters the right side only
WHERE a.col = 'value';        -- filters the final rows`,
    sql: `SELECT p.patient_id,
       p.first_name,
       p.last_name,
       i.invoice_id,
       i.status
FROM patients p
LEFT JOIN invoices i
  ON i.patient_id = p.patient_id
ORDER BY i.invoice_id IS NOT NULL, p.patient_id, i.invoice_id;`,
    breakdown: [
      ['SELECT p.patient_id, ..., i.status', 'Patient columns are always filled; invoice columns can be NULL.'],
      ['FROM patients p', 'The left (preserved) table: every patient will appear.'],
      ['LEFT JOIN invoices i', 'Invoices are optional: matched if they exist, NULLs if not.'],
      ['ON i.patient_id = p.patient_id', 'The matching rule.'],
      ['ORDER BY i.invoice_id IS NOT NULL, ...', 'Puts the unmatched rows (invoice_id IS NULL) first so you see them straight away.'],
    ],
    visual: { type: 'join', join: 'left' },
    internals: `<p>SQLite runs a LEFT JOIN as a nested loop with a "matched" flag. For each left row it scans or looks up the right side. If the inner loop finishes without a single match, it emits the left row once with NULLs for the right columns. Because the left table must drive the loop, the optimizer <b>cannot</b> swap the tables of a LEFT JOIN the way it can with an INNER JOIN. Hash-join engines use the same idea: probe with the preserved side and emit NULL-padded rows for probes that find nothing.</p>`,
    mistakes: [
      { wrong: `SELECT p.patient_id, p.last_name, i.invoice_id
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
WHERE i.status = 'Overdue';`, why: 'WHERE runs after the join. Patients without an overdue invoice have i.status NULL or another value, so they are removed. You wanted "all patients, with their overdue invoices", but you got an INNER JOIN.', fix: `SELECT p.patient_id, p.last_name, i.invoice_id
FROM patients p
LEFT JOIN invoices i
  ON i.patient_id = p.patient_id
 AND i.status = 'Overdue';` },
      { wrong: `SELECT p.patient_id, COUNT(*) AS invoices
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
GROUP BY p.patient_id;`, why: 'COUNT(*) counts rows, and the NULL-padded row of an unbilled patient still counts as 1. Those patients show 1 instead of 0.', fix: `SELECT p.patient_id, COUNT(i.invoice_id) AS invoices
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
GROUP BY p.patient_id;` },
    ],
    rules: [
      'LEFT JOIN keeps all left rows; unmatched ones get NULLs on the right.',
      'A filter on the right table goes in ON. In WHERE it turns the join into an INNER JOIN.',
      'A filter on the left table goes in WHERE.',
      'Count right-side rows with COUNT(right.pk), not COUNT(*).',
    ],
    compare: `<table><tr><th>Where the right-side filter goes</th><th>Effect</th></tr>
<tr><td><code>ON ... AND i.status = 'Overdue'</code></td><td>All 25 patients kept; only overdue invoices attached</td></tr>
<tr><td><code>WHERE i.status = 'Overdue'</code></td><td>Only patients with an overdue invoice (same as INNER JOIN)</td></tr>
<tr><td><code>WHERE i.invoice_id IS NULL</code></td><td>Only patients with <b>no</b> invoice (anti-join)</td></tr></table>`,
    realWorld: 'Patient rosters with balances, "all practitioners with this month\'s production (including zero)", payor lists with claim counts: any report where missing data must show up as blank or 0.',
    tips: ['Wrap nullable results with COALESCE(i.total_amount, 0) when you want a 0 instead of NULL.'],
    deep: `<p>Some optimizers detect a "null-rejecting" predicate in WHERE (one that can never be true for a NULL-padded row) and rewrite the LEFT JOIN as an INNER JOIN on purpose, because it is cheaper. That confirms the rule: the WHERE filter really does make it an inner join.</p>`,
    tryIt: {
      prompt: 'Move the status filter from WHERE into the ON clause and compare the row counts. Then try practitioners LEFT JOIN charges to find Leo Martins (id 12).',
      starter: `SELECT p.patient_id, p.last_name, i.invoice_id, i.status
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
WHERE i.status = 'Overdue'
ORDER BY p.patient_id;`,
    },
    challenge: {
      level: 2,
      prompt: 'Show EVERY patient (patient_id, last_name) with the invoice_id of each of their Overdue invoices. Patients without an overdue invoice must still appear once, with NULL. Order by patient_id, then invoice_id.',
      solution: `SELECT p.patient_id, p.last_name, i.invoice_id
FROM patients p
LEFT JOIN invoices i
  ON i.patient_id = p.patient_id
 AND i.status = 'Overdue'
ORDER BY p.patient_id, i.invoice_id;`,
      hints: ['Start from patients, because every patient must appear.', 'Use LEFT JOIN invoices on patient_id.', 'The Overdue filter must not remove patients, so it cannot go in WHERE.', 'LEFT JOIN invoices i ON i.patient_id = p.patient_id AND i.status = \'Overdue\''],
      ordered: true,
    },
    quiz: [
      { q: 'patients has 25 rows and 5 of them have no invoice. How many rows does patients LEFT JOIN invoices return (48 invoices)?', options: ['25', '48', '53', '1,200'], answer: 2, why: '48 matched rows + 5 unmatched patient rows padded with NULLs = 53.' },
      { q: 'You add WHERE i.status = \'Paid\' to a LEFT JOIN. What happens to patients with no invoices?', options: ['They stay, with NULLs', 'They are removed', 'They get status Paid', 'The query fails'], answer: 1, why: 'NULL = \'Paid\' is not true, so WHERE drops the NULL-padded rows. The query now behaves like an INNER JOIN.' },
      { q: 'Which expression gives 0 invoices for an unbilled patient after a LEFT JOIN?', options: ['COUNT(*)', 'COUNT(i.invoice_id)', 'COUNT(p.patient_id)', 'SUM(1)'], answer: 1, why: 'COUNT(column) skips NULLs; COUNT(*) counts the padded row.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 04
  {
    id: 'joins-04',
    goals: [
      'How RIGHT JOIN keeps every row of the right table',
      'Why any RIGHT JOIN can be rewritten as a LEFT JOIN',
      'When a RIGHT JOIN reads naturally',
    ],
    concept: `<p><b>RIGHT JOIN</b> is the mirror image of LEFT JOIN: it keeps <b>every row of the right table</b> and fills the left side with NULLs when there is no match.</p>
<p><code>invoices i RIGHT JOIN payors py</code> lists every payor. BlueShield, Aetna and the others appear once per invoice, and <b>United Workers Comp (5)</b> and <b>Cigna Select (6)</b>, which have never been billed, appear once with NULL invoice columns.</p>
<p>Any RIGHT JOIN can be written as a LEFT JOIN by swapping the two tables: <code>A RIGHT JOIN B</code> = <code>B LEFT JOIN A</code>. Most teams prefer LEFT JOIN for consistency. SQLite has supported RIGHT JOIN since version 3.39.</p>`,
    why: 'It exists for symmetry in the SQL standard, and it helps when you add a table to the end of a long join chain and want that new table to be the preserved one.',
    when: 'Rarely required. Use it when it makes a query read better, or when you read legacy SQL. In new code, LEFT JOIN with the tables swapped is usually clearer.',
    analogy: 'Earlier the roster was the patient list. Now the roster is the list of insurance contracts: every payor gets a line, and invoices are written next to it if any exist.',
    exampleSql: `SELECT payor_id, payor_name, payor_type, is_active FROM payors`,
    syntax: `SELECT a.col, b.col
FROM table_a a
RIGHT JOIN table_b b
  ON a.fk = b.pk;
-- same as: FROM table_b b LEFT JOIN table_a a ON a.fk = b.pk`,
    sql: `SELECT py.payor_id,
       py.payor_name,
       i.invoice_id,
       i.total_amount
FROM invoices i
RIGHT JOIN payors py
  ON i.payor_id = py.payor_id
ORDER BY py.payor_id, i.invoice_id;`,
    breakdown: [
      ['SELECT py.payor_id, py.payor_name, i.invoice_id, i.total_amount', 'Payor columns are always filled; invoice columns may be NULL.'],
      ['FROM invoices i', 'The left table: invoices (optional side).'],
      ['RIGHT JOIN payors py', 'The right table, payors, is preserved: every payor appears.'],
      ['ON i.payor_id = py.payor_id', 'Match invoices to their payor.'],
      ['ORDER BY py.payor_id, i.invoice_id', 'Payors 5 and 6 show up with NULL invoice_id.'],
    ],
    visual: { type: 'join', join: 'right' },
    internals: `<p>Most engines, including SQLite, turn a RIGHT JOIN into a LEFT JOIN with the inputs swapped before planning, so performance is identical. In a hash join the preserved side can be either the build or the probe side. A "right outer hash join" builds on the preserved table, marks entries as they are matched, and emits the unmarked ones at the end.</p>`,
    mistakes: [
      { wrong: `SELECT py.payor_name, i.invoice_id
FROM invoices i
RIGHT JOIN payors py ON i.payor_id = py.payor_id
WHERE i.status = 'Paid';`, why: 'The same trap as LEFT JOIN, on the other side: a WHERE filter on the optional (left) table removes the NULL-padded payors.', fix: `SELECT py.payor_name, i.invoice_id
FROM invoices i
RIGHT JOIN payors py
  ON i.payor_id = py.payor_id
 AND i.status = 'Paid';` },
      { wrong: `SELECT py.payor_name, i.invoice_id
FROM invoices i
RIGHT JOIN payors py ON i.payor_id = py.payor_id
LEFT JOIN patients p ON p.patient_id = i.patient_id
RIGHT JOIN treatment_locations l ON l.location_id = i.location_id;`, why: 'Mixing LEFT and RIGHT joins in one chain makes it very hard to tell which table is preserved. The last RIGHT JOIN keeps all locations but can drop the payors you just preserved.', fix: `SELECT py.payor_name, i.invoice_id, p.last_name
FROM payors py
LEFT JOIN invoices i ON i.payor_id = py.payor_id
LEFT JOIN patients p ON p.patient_id = i.patient_id;` },
    ],
    rules: [
      'A RIGHT JOIN B = B LEFT JOIN A.',
      'The table after RIGHT JOIN is the one that is preserved.',
      'Prefer one direction (usually LEFT) throughout a query.',
    ],
    compare: `<table><tr><th>Query</th><th>Preserved table</th></tr>
<tr><td><code>invoices LEFT JOIN payors</code></td><td>invoices (payors 5 and 6 missing)</td></tr>
<tr><td><code>invoices RIGHT JOIN payors</code></td><td>payors (the 2 invoices with no payor missing)</td></tr>
<tr><td><code>payors LEFT JOIN invoices</code></td><td>payors, the same result as the RIGHT JOIN</td></tr></table>`,
    realWorld: 'Contract management: list every payor contract with its claims volume, including contracts with no claims, to spot unused or inactive contracts such as Cigna Select.',
    tips: ['If you see a RIGHT JOIN in someone else\'s code, rewrite it in your head as a LEFT JOIN with the tables swapped.'],
    tryIt: {
      prompt: 'Rewrite this RIGHT JOIN as a LEFT JOIN (swap the tables) and check that the results are identical.',
      starter: `SELECT l.location_id, l.location_name, i.invoice_id
FROM invoices i
RIGHT JOIN treatment_locations l ON i.location_id = l.location_id
ORDER BY l.location_id, i.invoice_id;`,
    },
    challenge: {
      level: 2,
      prompt: 'Using RIGHT JOIN, list every treatment location (location_id, location_name) with the invoice_id of each of its Open invoices. Locations without an open invoice must still appear with NULL. Order by location_id, invoice_id.',
      solution: `SELECT l.location_id, l.location_name, i.invoice_id
FROM invoices i
RIGHT JOIN treatment_locations l
  ON i.location_id = l.location_id
 AND i.status = 'Open'
ORDER BY l.location_id, i.invoice_id;`,
      hints: ['treatment_locations is the table that must be preserved, so it goes after RIGHT JOIN.', 'FROM invoices i RIGHT JOIN treatment_locations l ON i.location_id = l.location_id', 'The Open filter is on the optional side. Where must it go?', 'Add AND i.status = \'Open\' to the ON clause, then ORDER BY l.location_id, i.invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which query returns the same rows as invoices RIGHT JOIN payors ON ...?', options: ['invoices LEFT JOIN payors', 'payors LEFT JOIN invoices', 'invoices JOIN payors', 'payors CROSS JOIN invoices'], answer: 1, why: 'Swap the tables and change RIGHT to LEFT.' },
      { q: 'In A RIGHT JOIN B, which table keeps all its rows?', options: ['A', 'B', 'Both', 'Neither'], answer: 1, why: 'The right table (after the keyword) is preserved.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 05
  {
    id: 'joins-05',
    goals: [
      'How FULL OUTER JOIN keeps unmatched rows from both sides',
      'How to spot orphans on either side',
      'How to emulate FULL JOIN with LEFT JOIN + UNION',
    ],
    concept: `<p><b>FULL OUTER JOIN</b> = LEFT JOIN + RIGHT JOIN together. Matched pairs appear once. Unmatched rows from <b>either</b> table also appear, with NULLs on the other side.</p>
<p>Invoices and payors are a good example of a mismatch in both directions:</p>
<ul>
<li>2 invoices have <code>payor_id = NULL</code> (no insurer recorded), so no payor matches them.</li>
<li>2 payors (United Workers Comp and Cigna Select) have never been billed, so no invoice matches them.</li>
</ul>
<p><code>invoices FULL JOIN payors</code> shows all of it: 46 matched rows + 2 invoice-only rows + 2 payor-only rows = 50 rows.</p>`,
    why: 'Reconciliation work needs to see what is missing on both sides at once: records in system A but not in B, and records in B but not in A.',
    when: 'Comparing two lists: charges vs ledger entries, expected vs received remittances, this month\'s payors vs last month\'s.',
    analogy: 'Two billing clerks reconcile the claims log against the insurance remittance list. Matches are ticked off. Claims with no remittance and remittances with no claim both go onto the exception report.',
    exampleSql: `SELECT invoice_id, patient_id, payor_id, status FROM invoices WHERE payor_id IS NULL`,
    syntax: `SELECT a.col, b.col
FROM table_a a
FULL OUTER JOIN table_b b
  ON b.key = a.key;`,
    sql: `SELECT i.invoice_id,
       i.payor_id AS invoice_payor,
       py.payor_id,
       py.payor_name
FROM invoices i
FULL OUTER JOIN payors py
  ON py.payor_id = i.payor_id
WHERE i.invoice_id IS NULL
   OR py.payor_id IS NULL;`,
    breakdown: [
      ['SELECT i.invoice_id, ..., py.payor_name', 'Columns from both sides; either side can be NULL.'],
      ['FROM invoices i', 'Left input.'],
      ['FULL OUTER JOIN payors py', 'Both sides are preserved.'],
      ['ON py.payor_id = i.payor_id', 'Matching rule. A NULL payor_id never matches anything.'],
      ['WHERE i.invoice_id IS NULL OR py.payor_id IS NULL', 'Keep only the orphans: invoices without a payor and payors without invoices.'],
    ],
    visual: { type: 'join', join: 'full' },
    internals: `<p>SQLite (3.39+) executes a FULL JOIN as a LEFT JOIN pass plus a second pass that finds the right rows that were never matched. Hash-join engines build a hash table on one side, flag entries as the probe side matches them, and emit the unflagged entries at the end. A merge join handles FULL JOIN naturally: it walks both sorted inputs and outputs whichever key is smaller when they differ.</p>`,
    mistakes: [
      { wrong: `SELECT i.invoice_id, py.payor_name
FROM invoices i
FULL JOIN payors py ON py.payor_id = i.payor_id
WHERE py.is_active = 1;`, why: 'The WHERE filter on payors removes the invoice-only rows (their py.is_active is NULL). The FULL JOIN has become a RIGHT JOIN.', fix: `SELECT i.invoice_id, py.payor_name
FROM invoices i
FULL JOIN payors py
  ON py.payor_id = i.payor_id
 AND py.is_active = 1;` },
      { wrong: `SELECT i.invoice_id, py.payor_name
FROM invoices i LEFT JOIN payors py ON py.payor_id = i.payor_id
UNION ALL
SELECT i.invoice_id, py.payor_name
FROM payors py LEFT JOIN invoices i ON i.payor_id = py.payor_id;`, why: 'Emulating FULL JOIN with UNION ALL of two LEFT JOINs repeats every matched row twice.', fix: `SELECT i.invoice_id, py.payor_name
FROM invoices i LEFT JOIN payors py ON py.payor_id = i.payor_id
UNION ALL
SELECT i.invoice_id, py.payor_name
FROM payors py LEFT JOIN invoices i ON i.payor_id = py.payor_id
WHERE i.invoice_id IS NULL;` },
    ],
    rules: [
      'FULL JOIN = all matches + unmatched left + unmatched right.',
      'Filter the orphans with WHERE a.key IS NULL OR b.key IS NULL.',
      'Emulation: A LEFT JOIN B, UNION ALL, B LEFT JOIN A WHERE A.key IS NULL.',
      'NULL keys never match, so they always come out as orphans.',
    ],
    compare: `<table><tr><th>Join</th><th>Invoices without payor</th><th>Payors without invoices</th><th>Rows</th></tr>
<tr><td>INNER</td><td>no</td><td>no</td><td>46</td></tr>
<tr><td>LEFT (invoices)</td><td>yes</td><td>no</td><td>48</td></tr>
<tr><td>RIGHT (payors)</td><td>no</td><td>yes</td><td>48</td></tr>
<tr><td><b>FULL</b></td><td>yes</td><td>yes</td><td>50</td></tr></table>`,
    realWorld: 'Ledger reconciliation: FULL JOIN the charges table to CHARGE transactions to find charges never posted to the ledger and ledger postings with no source charge.',
    tips: ['Add a label column: CASE WHEN i.invoice_id IS NULL THEN \'payor only\' WHEN py.payor_id IS NULL THEN \'invoice only\' ELSE \'matched\' END.'],
    deep: `<p>MySQL has no FULL OUTER JOIN, so the LEFT + anti-join UNION ALL emulation is common there. With UNION (not UNION ALL) the emulation is simpler but also removes rows that are legitimately duplicated.</p>`,
    tryIt: {
      prompt: 'Add a match_status column with CASE (matched / invoice only / payor only) and remove the WHERE clause to see all 50 rows.',
      starter: `SELECT i.invoice_id, py.payor_name
FROM invoices i
FULL OUTER JOIN payors py ON py.payor_id = i.payor_id
ORDER BY py.payor_id, i.invoice_id;`,
    },
    challenge: {
      level: 3,
      prompt: 'Count the rows of invoices FULL OUTER JOIN payors by category. Return two columns, match_status (\'matched\', \'invoice only\', \'payor only\') and row_count, ordered by match_status.',
      solution: `SELECT CASE
         WHEN i.invoice_id IS NULL THEN 'payor only'
         WHEN py.payor_id IS NULL THEN 'invoice only'
         ELSE 'matched'
       END AS match_status,
       COUNT(*) AS row_count
FROM invoices i
FULL OUTER JOIN payors py ON py.payor_id = i.payor_id
GROUP BY match_status
ORDER BY match_status;`,
      hints: ['Start from invoices FULL OUTER JOIN payors ON payor_id.', 'A row is "payor only" when the invoice side is NULL, and the other way round.', 'Build a CASE expression that labels each row, then GROUP BY it.', 'CASE WHEN i.invoice_id IS NULL THEN \'payor only\' WHEN py.payor_id IS NULL THEN \'invoice only\' ELSE \'matched\' END, COUNT(*) ... GROUP BY 1 ORDER BY 1'],
      ordered: true,
    },
    quiz: [
      { q: 'Which rows does a FULL OUTER JOIN return?', options: ['Only matches', 'Matches + unmatched left', 'Matches + unmatched left + unmatched right', 'Every combination'], answer: 2, why: 'Both sides are preserved.' },
      { q: 'An invoice has payor_id NULL. In invoices FULL JOIN payors, how does it appear?', options: ['Matched to every payor', 'Dropped', 'Once, with NULL payor columns', 'Matched to Self-Pay'], answer: 2, why: 'NULL never equals anything, so the invoice is unmatched and padded with NULLs.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 06
  {
    id: 'joins-06',
    goals: [
      'What a Cartesian product is and how big it gets',
      'Deliberate CROSS JOINs: building grids and combinations',
      'Filling missing combinations with zeros (CROSS JOIN + LEFT JOIN)',
    ],
    concept: `<p><b>CROSS JOIN</b> pairs every row of A with every row of B. No ON condition is needed. The row count is <code>rows(A) × rows(B)</code>: 6 locations × 7 payors = 42 rows.</p>
<p>By accident (a forgotten ON), this is a disaster. On purpose, it is a useful tool: it builds a <b>complete grid</b> of combinations, such as every location × every invoice status or every practitioner × every month. You then LEFT JOIN the real data onto the grid, so combinations with no activity still show up as 0 instead of disappearing.</p>`,
    why: 'Reports often need every combination listed, including empty ones. Real data only contains combinations that happened, so a grid has to be generated.',
    when: 'Scaffolding for reports (location × month, payor × status), generating test combinations, or applying a small parameter table to every row.',
    analogy: 'The billing manager wants a wall chart with every clinic as a row and every payor as a column, with a box for each pair, even pairs that never billed anything. A CROSS JOIN draws the empty chart.',
    exampleSql: `SELECT location_id, location_name FROM treatment_locations`,
    syntax: `SELECT a.col, b.col
FROM table_a a
CROSS JOIN table_b b;`,
    sql: `SELECT l.location_name,
       py.payor_name
FROM treatment_locations l
CROSS JOIN payors py
ORDER BY l.location_id, py.payor_id;`,
    breakdown: [
      ['SELECT l.location_name, py.payor_name', 'One column from each table.'],
      ['FROM treatment_locations l', '6 rows.'],
      ['CROSS JOIN payors py', '7 rows, and every location is paired with every payor: 42 rows.'],
      ['ORDER BY l.location_id, py.payor_id', 'Sorted so you can see each location repeat 7 times.'],
    ],
    visual: { type: 'join', join: 'cross' },
    internals: `<p>A CROSS JOIN is a plain nested loop with no lookup: for each outer row, walk the whole inner table. The cost and the output size are both O(n × m). Two tables of 100,000 rows each give 10 billion rows. That is why an accidental cross join can freeze a production server.</p>`,
    mistakes: [
      { wrong: `SELECT p.last_name, i.invoice_id
FROM patients p, invoices i
WHERE i.status = 'Open';`, why: 'The old comma syntax with no join condition in WHERE is a hidden CROSS JOIN: every patient × every open invoice (25 × 5 = 125 rows).', fix: `SELECT p.last_name, i.invoice_id
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id
WHERE i.status = 'Open';` },
      { wrong: `SELECT l.location_name, s.status, COUNT(*) AS n
FROM treatment_locations l
CROSS JOIN (SELECT DISTINCT status FROM invoices) s
LEFT JOIN invoices i ON i.location_id = l.location_id AND i.status = s.status
GROUP BY l.location_name, s.status;`, why: 'COUNT(*) counts the grid cell itself, so empty combinations show 1 instead of 0.', fix: `SELECT l.location_name, s.status, COUNT(i.invoice_id) AS n
FROM treatment_locations l
CROSS JOIN (SELECT DISTINCT status FROM invoices) s
LEFT JOIN invoices i ON i.location_id = l.location_id AND i.status = s.status
GROUP BY l.location_name, s.status;` },
    ],
    rules: [
      'Rows out = rows(A) × rows(B).',
      'Write CROSS JOIN explicitly when you mean it, so readers know it is on purpose.',
      'Grid pattern: CROSS JOIN the dimensions, then LEFT JOIN the facts, then COUNT(fact.pk).',
    ],
    compare: `<table><tr><th></th><th>CROSS JOIN</th><th>INNER JOIN</th></tr>
<tr><td>Condition</td><td>none</td><td>ON required</td></tr>
<tr><td>Rows</td><td>n × m</td><td>matching pairs only</td></tr>
<tr><td>Typical use</td><td>grids, combinations</td><td>related records</td></tr></table>`,
    realWorld: 'Monthly revenue heat maps (location × month), payor-mix matrices, staffing grids (practitioner × weekday), and generating a calendar spine for time series.',
    tips: ['Before running a CROSS JOIN, multiply the two row counts in your head.'],
    tryIt: {
      prompt: 'Build the location × status grid with invoice counts. Change COUNT(i.invoice_id) to COUNT(*) and see what goes wrong for Eastside Family Clinic (location 6).',
      starter: `SELECT l.location_name, s.status, COUNT(i.invoice_id) AS invoices
FROM treatment_locations l
CROSS JOIN (SELECT DISTINCT status FROM invoices) s
LEFT JOIN invoices i
  ON i.location_id = l.location_id AND i.status = s.status
GROUP BY l.location_id, s.status
ORDER BY l.location_id, s.status;`,
    },
    challenge: {
      level: 3,
      prompt: 'Build a complete grid of every treatment location × every payor_type (from payors), with the total invoice amount billed for that combination (0 when none). Return location_id, payor_type, billed. Order by location_id, payor_type.',
      solution: `WITH types AS (SELECT DISTINCT payor_type FROM payors)
SELECT l.location_id,
       t.payor_type,
       COALESCE(SUM(i.total_amount), 0) AS billed
FROM treatment_locations l
CROSS JOIN types t
LEFT JOIN payors py ON py.payor_type = t.payor_type
LEFT JOIN invoices i ON i.location_id = l.location_id AND i.payor_id = py.payor_id
GROUP BY l.location_id, t.payor_type
ORDER BY l.location_id, t.payor_type;`,
      hints: ['First get the distinct payor types: SELECT DISTINCT payor_type FROM payors.', 'CROSS JOIN treatment_locations with those types to make the grid (6 × 5 = 30 rows).', 'LEFT JOIN payors on payor_type, then LEFT JOIN invoices on location_id AND payor_id.', 'GROUP BY l.location_id, t.payor_type and use COALESCE(SUM(i.total_amount), 0).'],
      ordered: true,
    },
    quiz: [
      { q: 'treatment_locations has 6 rows and payors has 7. How many rows does a CROSS JOIN return?', options: ['13', '7', '42', '6'], answer: 2, why: '6 × 7 = 42.' },
      { q: 'Why CROSS JOIN before a LEFT JOIN in a report?', options: ['To make it faster', 'So combinations with no data still appear', 'To remove duplicates', 'To sort the output'], answer: 1, why: 'The grid guarantees every combination; the LEFT JOIN fills in data where it exists.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 07
  {
    id: 'joins-07',
    goals: [
      'How a table can be joined to itself',
      'Why aliases are required in a self join',
      'Reading a hierarchy: practitioner → supervisor',
      'Comparing rows of the same table with each other',
    ],
    concept: `<p>A <b>SELF JOIN</b> is an ordinary join where both sides are the <b>same table</b>. There is no special keyword: you list the table twice with two different aliases, as if it were two copies.</p>
<p><code>practitioners.supervisor_id</code> stores the <code>practitioner_id</code> of another practitioner. To show each practitioner next to their supervisor's name, join <code>practitioners pr</code> (the employee copy) to <code>practitioners sup</code> (the supervisor copy) on <code>pr.supervisor_id = sup.practitioner_id</code>.</p>
<p>Dr. Elena Ramirez (id 1) is the top of the hierarchy and has <code>supervisor_id = NULL</code>. With an INNER JOIN she disappears; with a LEFT JOIN she stays, with a NULL supervisor.</p>`,
    why: 'Hierarchies (who reports to whom) and comparisons within one table (duplicate patients, charges on the same day) keep all their data in a single table.',
    when: 'Manager/employee lookups, finding duplicates, comparing a row with another row of the same table (earlier vs later invoice, same patient on different dates).',
    analogy: 'The staff directory lists each doctor with a "reports to: #2" note. To print "Sofia Rossi reports to James Okafor", you look up #2 in the same directory, as if you had a second photocopy of it on the desk.',
    exampleSql: `SELECT practitioner_id, first_name, last_name, supervisor_id FROM practitioners`,
    syntax: `SELECT e.col, m.col
FROM same_table e
LEFT JOIN same_table m
  ON e.parent_id = m.id;`,
    sql: `SELECT pr.practitioner_id,
       pr.first_name || ' ' || pr.last_name AS practitioner,
       pr.specialty,
       sup.first_name || ' ' || sup.last_name AS supervisor
FROM practitioners pr
LEFT JOIN practitioners sup
  ON pr.supervisor_id = sup.practitioner_id
ORDER BY pr.practitioner_id;`,
    breakdown: [
      ['FROM practitioners pr', 'Copy 1: the employee.'],
      ['LEFT JOIN practitioners sup', 'Copy 2 of the same table: the supervisor. LEFT keeps Dr. Ramirez, who has no boss.'],
      ['ON pr.supervisor_id = sup.practitioner_id', 'The employee\'s supervisor_id points at the supervisor\'s PK.'],
      ['sup.first_name || \' \' || sup.last_name AS supervisor', 'The supervisor\'s name, NULL for the top of the tree.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 620 230" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="13">
<text x="110" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">practitioners pr (employee)</text>
<text x="510" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">practitioners sup (supervisor)</text>
<g>
<rect x="10" y="32" width="200" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="20" y="52" fill="var(--text)">5 Sofia Rossi · sup_id 2</text>
<rect x="10" y="72" width="200" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="20" y="92" fill="var(--text)">6 David Kim · sup_id 5</text>
<rect x="10" y="112" width="200" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="20" y="132" fill="var(--text)">12 Leo Martins · sup_id 2</text>
<rect x="10" y="152" width="200" height="30" rx="5" fill="var(--panel2)" stroke="var(--red)"/><text x="20" y="172" fill="var(--text)">1 Elena Ramirez · sup_id NULL</text>
</g>
<g>
<rect x="410" y="52" width="200" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="420" y="72" fill="var(--text)">2 James Okafor</text>
<rect x="410" y="112" width="200" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="420" y="132" fill="var(--text)">5 Sofia Rossi</text>
</g>
<line x1="210" y1="47" x2="410" y2="67" stroke="var(--accent)" stroke-width="2"/>
<line x1="210" y1="127" x2="410" y2="67" stroke="var(--accent)" stroke-width="2"/>
<line x1="210" y1="87" x2="410" y2="127" stroke="var(--green)" stroke-width="2"/>
<text x="310" y="200" text-anchor="middle" fill="var(--muted)">ON pr.supervisor_id = sup.practitioner_id  (same table, two aliases)</text>
<text x="310" y="220" text-anchor="middle" fill="var(--red)">Elena has no supervisor: kept by LEFT JOIN, dropped by INNER JOIN</text>
</svg>` },
    internals: `<p>The engine does not copy the table. Both aliases read the same B-tree. Here the supervisor side is looked up through the INTEGER PRIMARY KEY (<code>SEARCH sup USING INTEGER PRIMARY KEY</code>), so each lookup is a single index probe. A self join to follow a hierarchy goes only <b>one level</b> per join. For an unknown depth you need a recursive CTE (next section).</p>`,
    mistakes: [
      { wrong: `SELECT practitioners.last_name, practitioners.last_name
FROM practitioners
JOIN practitioners ON practitioners.supervisor_id = practitioners.practitioner_id;`, why: 'Without two different aliases the database cannot tell the two copies apart, and the query fails.', fix: `SELECT pr.last_name, sup.last_name AS supervisor
FROM practitioners pr
JOIN practitioners sup ON pr.supervisor_id = sup.practitioner_id;` },
      { wrong: `SELECT pr.last_name, sup.last_name AS supervisor
FROM practitioners pr
JOIN practitioners sup ON sup.supervisor_id = pr.practitioner_id;`, why: 'The direction is reversed: this pairs each practitioner with their direct reports, not with their boss. The column labels are now wrong.', fix: `SELECT pr.last_name, sup.last_name AS supervisor
FROM practitioners pr
JOIN practitioners sup ON pr.supervisor_id = sup.practitioner_id;` },
    ],
    rules: [
      'Same table, two aliases, one join condition.',
      'Name the aliases after their roles (emp/mgr, pr/sup) so the direction stays clear.',
      'Use LEFT JOIN to keep the root of a hierarchy.',
      'For pair comparisons, add a.id < b.id to avoid matching a row with itself and listing each pair twice.',
    ],
    compare: `<table><tr><th>Technique</th><th>Depth</th></tr>
<tr><td>One self join</td><td>1 level (direct supervisor)</td></tr>
<tr><td>Two chained self joins</td><td>2 levels (supervisor's supervisor)</td></tr>
<tr><td>Recursive CTE</td><td>any depth</td></tr></table>`,
    realWorld: 'Provider org charts, referral chains, duplicate patient detection (same name and date of birth), and comparing each invoice with the patient\'s previous invoice.',
    tips: ['To find duplicate patients: FROM patients a JOIN patients b ON a.last_name = b.last_name AND a.date_of_birth = b.date_of_birth AND a.patient_id < b.patient_id.'],
    tryIt: {
      prompt: 'Find duplicate patient records: self join patients on first_name, last_name and date_of_birth, with a.patient_id < b.patient_id. (Patient 25 duplicates patient 1.)',
      starter: `SELECT a.patient_id, b.patient_id AS duplicate_id, a.first_name, a.last_name, a.date_of_birth
FROM patients a
JOIN patients b
  ON a.first_name = b.first_name
 AND a.last_name = b.last_name
 AND a.date_of_birth = b.date_of_birth
 AND a.patient_id < b.patient_id;`,
    },
    challenge: {
      level: 2,
      prompt: 'Find practitioners whose hourly_rate is higher than their direct supervisor\'s. Show practitioner last_name, their hourly_rate, the supervisor\'s last_name and the supervisor\'s hourly_rate. Order by the practitioner\'s practitioner_id.',
      solution: `SELECT pr.last_name, pr.hourly_rate, sup.last_name AS supervisor, sup.hourly_rate AS supervisor_rate
FROM practitioners pr
JOIN practitioners sup ON pr.supervisor_id = sup.practitioner_id
WHERE pr.hourly_rate > sup.hourly_rate
ORDER BY pr.practitioner_id;`,
      hints: ['You need practitioners twice: once as the employee, once as the supervisor.', 'JOIN practitioners sup ON pr.supervisor_id = sup.practitioner_id', 'Compare the two rates in WHERE.', 'WHERE pr.hourly_rate > sup.hourly_rate ORDER BY pr.practitioner_id'],
      ordered: true,
    },
    quiz: [
      { q: 'What makes a join a SELF JOIN?', options: ['The SELF keyword', 'The same table appears twice with different aliases', 'Joining on the primary key', 'Using a subquery'], answer: 1, why: 'There is no keyword; it is the same table referenced twice.' },
      { q: 'Dr. Ramirez has supervisor_id NULL. With INNER JOIN practitioners sup ON pr.supervisor_id = sup.practitioner_id, she is...', options: ['Shown with NULL supervisor', 'Dropped', 'Shown as her own supervisor', 'An error'], answer: 1, why: 'NULL matches nothing, so the INNER JOIN drops her. Use LEFT JOIN to keep her.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 08
  {
    id: 'joins-08',
    goals: [
      'How to chain three or more joins',
      'How to follow the foreign keys on an ER diagram',
      'Mixing INNER and LEFT joins in one query',
      'Keeping multi-join queries readable',
    ],
    concept: `<p>Real reports need data from many tables. You <b>chain</b> joins: each new JOIN attaches one more table to the rows built so far, using a key that is already available.</p>
<p>A charge line on a statement needs:</p>
<ul>
<li><code>charges</code>: CPT code and amount</li>
<li>→ <code>invoices</code> (via charges.invoice_id): date and location</li>
<li>→ <code>patients</code> (via invoices.patient_id): patient name</li>
<li>→ <code>practitioners</code> (via charges.practitioner_id): the rendering provider</li>
<li>→ <code>treatment_locations</code> (via invoices.location_id): the place of service</li>
</ul>
<p>Think of it as walking the ER diagram: every join follows one line (one FK → PK).</p>`,
    why: 'Normalized data is spread across many tables, so almost any business question crosses several of them.',
    when: 'Statements, claim forms, dashboards: whenever the columns you need live more than one hop apart.',
    analogy: 'Building a claim form is like a scavenger hunt through the office: the charge slip gives you the invoice number, the invoice points to the patient folder and the clinic, and the charge slip also names the doctor. Each clue leads to the next cabinet.',
    exampleSql: `SELECT charge_id, invoice_id, practitioner_id, cpt_code, amount FROM charges WHERE invoice_id = 16`,
    syntax: `SELECT ...
FROM a
JOIN b ON b.a_id = a.id
JOIN c ON c.id = b.c_id
LEFT JOIN d ON d.id = a.d_id;`,
    sql: `SELECT c.charge_id,
       i.invoice_date,
       p.last_name  AS patient,
       pr.last_name AS practitioner,
       l.location_name,
       c.cpt_code,
       c.amount
FROM charges c
JOIN invoices i             ON i.invoice_id = c.invoice_id
JOIN patients p             ON p.patient_id = i.patient_id
JOIN practitioners pr       ON pr.practitioner_id = c.practitioner_id
JOIN treatment_locations l  ON l.location_id = i.location_id
WHERE i.invoice_id IN (16, 19)
ORDER BY c.charge_id;`,
    breakdown: [
      ['FROM charges c', 'Start at the most detailed table (one row per charge line).'],
      ['JOIN invoices i ON i.invoice_id = c.invoice_id', 'Hop 1: charge → invoice.'],
      ['JOIN patients p ON p.patient_id = i.patient_id', 'Hop 2: invoice → patient (uses a column from the invoice we just joined).'],
      ['JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id', 'Hop 3: charge → practitioner.'],
      ['JOIN treatment_locations l ON l.location_id = i.location_id', 'Hop 4: invoice → location.'],
      ['WHERE i.invoice_id IN (16, 19)', 'Only two invoices, to keep the output short.'],
    ],
    visual: { type: 'er', tables: ['patients', 'invoices', 'charges', 'practitioners', 'treatment_locations'] },
    internals: `<p>SQLite plans a multi-way join as <b>nested loops, one loop per table</b>, and picks the loop order (the "join order") that it estimates is cheapest. The FROM order you write does not bind it for INNER JOINs. Each inner loop is an index lookup when possible (here, every hop lands on an INTEGER PRIMARY KEY). With N tables there are N! possible orders; SQLite's "N nearest neighbors" planner searches them heuristically.</p>`,
    mistakes: [
      { wrong: `SELECT c.charge_id, p.last_name
FROM charges c
JOIN patients p ON p.patient_id = c.invoice_id;`, why: 'Skipping a hop: charges has no patient_id, and joining invoice_id to patient_id runs without an error but gives wrong pairs. You must go through invoices.', fix: `SELECT c.charge_id, p.last_name
FROM charges c
JOIN invoices i ON i.invoice_id = c.invoice_id
JOIN patients p ON p.patient_id = i.patient_id;` },
      { wrong: `SELECT l.location_name, i.invoice_id, c.charge_id
FROM treatment_locations l
LEFT JOIN invoices i ON i.location_id = l.location_id
JOIN charges c ON c.invoice_id = i.invoice_id;`, why: 'The INNER JOIN after the LEFT JOIN throws away the NULL rows the LEFT JOIN kept, so location 6 disappears again. Once a chain goes LEFT, keep the joins after it LEFT.', fix: `SELECT l.location_name, i.invoice_id, c.charge_id
FROM treatment_locations l
LEFT JOIN invoices i ON i.location_id = l.location_id
LEFT JOIN charges c ON c.invoice_id = i.invoice_id;` },
    ],
    rules: [
      'Each JOIN may only use columns from tables joined before it.',
      'One join per FK → PK line on the ER diagram.',
      'After a LEFT JOIN, the joins that depend on it should usually be LEFT as well.',
      'Align the ON clauses and use meaningful aliases.',
    ],
    compare: `<p>A chain of <b>many-to-one</b> joins (charge → invoice → patient) never multiplies rows: each charge has exactly one invoice and one patient. A <b>one-to-many</b> hop (invoice → charges, invoice → payments) does multiply rows. Watch for it when you aggregate (lesson 12).</p>`,
    realWorld: 'An itemized patient statement or an 837 claim file joins 5-8 tables: patient, subscriber, payor, provider, facility, invoice, charge lines, diagnoses.',
    tips: ['Start FROM the most granular table you need (charges), then join "upward" to its parents. Many-to-one joins never duplicate rows.'],
    tryIt: {
      prompt: 'Add the payor name to the statement (LEFT JOIN payors py ON py.payor_id = i.payor_id). Why LEFT and not INNER?',
      starter: `SELECT c.charge_id, p.last_name AS patient, pr.last_name AS practitioner, c.cpt_code, c.amount
FROM charges c
JOIN invoices i       ON i.invoice_id = c.invoice_id
JOIN patients p       ON p.patient_id = i.patient_id
JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
WHERE i.invoice_id = 30
ORDER BY c.charge_id;`,
    },
    challenge: {
      level: 3,
      prompt: 'For every charge billed at \'St. Mary General Hospital\', show charge_id, the patient last_name, the practitioner last_name, cpt_code and amount. Order by charge_id.',
      solution: `SELECT c.charge_id, p.last_name AS patient, pr.last_name AS practitioner, c.cpt_code, c.amount
FROM charges c
JOIN invoices i            ON i.invoice_id = c.invoice_id
JOIN patients p            ON p.patient_id = i.patient_id
JOIN practitioners pr      ON pr.practitioner_id = c.practitioner_id
JOIN treatment_locations l ON l.location_id = i.location_id
WHERE l.location_name = 'St. Mary General Hospital'
ORDER BY c.charge_id;`,
      hints: ['The location is on the invoice, not on the charge.', 'Path: charges → invoices → treatment_locations, charges → practitioners, invoices → patients.', 'You need four joins in total.', 'Filter with WHERE l.location_name = \'St. Mary General Hospital\' and ORDER BY c.charge_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'charges has no patient_id column. How do you get a charge\'s patient?', options: ['JOIN patients ON patient_id = charge_id', 'Go through invoices: charges → invoices → patients', 'It is impossible', 'CROSS JOIN patients'], answer: 1, why: 'Follow the FK chain: charges.invoice_id → invoices.patient_id → patients.' },
      { q: 'You LEFT JOIN invoices to locations and then INNER JOIN charges. What happens to location 6 (no invoices)?', options: ['Kept with NULLs', 'Dropped by the INNER JOIN', 'Duplicated', 'Error'], answer: 1, why: 'The inner join needs c.invoice_id = NULL, which is never true, so the row is removed.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 09
  {
    id: 'joins-09',
    goals: [
      'What a many-to-many relationship is',
      'How a bridge (junction) table connects the two sides',
      'Joining through the bridge in both directions',
      'Using DISTINCT or COUNT(DISTINCT) to undo duplicated pairs',
    ],
    concept: `<p>A patient sees many practitioners, and a practitioner treats many patients. That is <b>many-to-many</b>. A relational table cannot store a list in one cell, so the relationship lives in a <b>bridge</b> table in between. Here, <code>charges</code> is the bridge between practitioners and invoices (and through invoices, patients): each charge says "this practitioner performed this service on this invoice".</p>
<p>To go from a practitioner to their patients, you walk <b>through</b> the bridge: <code>practitioners → charges → invoices → patients</code>. Because a practitioner can bill the same patient many times, the same (practitioner, patient) pair can show up many times. Use <code>DISTINCT</code> for a list, or <code>COUNT(DISTINCT ...)</code> for a count.</p>`,
    why: 'Many-to-many is everywhere in healthcare: patients ↔ providers, providers ↔ locations, claims ↔ diagnosis codes. Bridge tables are how SQL stores it.',
    when: 'Questions like "which practitioners has this patient seen?", "how many distinct patients did each doctor treat?", or "which patients share a provider?".',
    analogy: 'The appointment book is the bridge between the patient list and the doctor list. To answer "which doctors has Maria seen?", you do not look at either list alone. You go through the appointment book.',
    exampleSql: `SELECT charge_id, invoice_id, practitioner_id FROM charges WHERE invoice_id IN (4, 16, 30) ORDER BY invoice_id`,
    syntax: `SELECT DISTINCT a.col, b.col
FROM a
JOIN bridge x ON x.a_id = a.id
JOIN b        ON b.id  = x.b_id;`,
    sql: `SELECT DISTINCT
       p.patient_id,
       p.last_name  AS patient,
       pr.last_name AS practitioner,
       pr.specialty
FROM patients p
JOIN invoices i       ON i.patient_id = p.patient_id
JOIN charges c        ON c.invoice_id = i.invoice_id
JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
WHERE p.patient_id IN (1, 2, 3)
ORDER BY p.patient_id, practitioner;`,
    breakdown: [
      ['SELECT DISTINCT ...', 'One row per (patient, practitioner) pair, even if they met several times.'],
      ['FROM patients p JOIN invoices i', 'Patient → their invoices (one-to-many).'],
      ['JOIN charges c ON c.invoice_id = i.invoice_id', 'Invoice → charge lines: the bridge.'],
      ['JOIN practitioners pr ON ...', 'Charge line → the practitioner who performed it.'],
      ['WHERE p.patient_id IN (1, 2, 3)', 'Keep the example small.'],
    ],
    visual: { type: 'er', tables: ['patients', 'invoices', 'charges', 'practitioners'] },
    internals: `<p>The optimizer can walk the bridge from either end. If you filter on patients, it starts there and looks up charges by invoice_id. If you filter on a practitioner, it may start from charges instead. Indexes on <b>both</b> FK columns of a bridge table (<code>charges(invoice_id)</code> and <code>charges(practitioner_id)</code>) make both directions fast. DISTINCT adds a de-duplication step, done with a temporary B-tree or a hash set.</p>`,
    mistakes: [
      { wrong: `SELECT pr.last_name, COUNT(i.patient_id) AS patients
FROM practitioners pr
JOIN charges c  ON c.practitioner_id = pr.practitioner_id
JOIN invoices i ON i.invoice_id = c.invoice_id
GROUP BY pr.practitioner_id;`, why: 'This counts charge lines, not patients. A patient with 4 charges counts 4 times.', fix: `SELECT pr.last_name, COUNT(DISTINCT i.patient_id) AS patients
FROM practitioners pr
JOIN charges c  ON c.practitioner_id = pr.practitioner_id
JOIN invoices i ON i.invoice_id = c.invoice_id
GROUP BY pr.practitioner_id;` },
      { wrong: `SELECT p.last_name, pr.last_name
FROM patients p
JOIN practitioners pr ON pr.location_id = p.patient_id;`, why: 'Trying to connect the two sides directly with an unrelated column. Many-to-many must go through the bridge.', fix: `SELECT DISTINCT p.last_name, pr.last_name
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id
JOIN charges c ON c.invoice_id = i.invoice_id
JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id;` },
    ],
    rules: [
      'Many-to-many always goes through a bridge table.',
      'Paths through a bridge produce repeated pairs: use DISTINCT or COUNT(DISTINCT).',
      'Index both foreign keys of a bridge table.',
    ],
    compare: `<table><tr><th>Relationship</th><th>Example</th><th>Stored as</th></tr>
<tr><td>One-to-many</td><td>patient → invoices</td><td>FK in the child (invoices.patient_id)</td></tr>
<tr><td>Many-to-many</td><td>patients ↔ practitioners</td><td>Bridge rows (invoices + charges)</td></tr>
<tr><td>Self many-to-one</td><td>practitioner → supervisor</td><td>FK to the same table</td></tr></table>`,
    realWorld: 'Provider panels (patients per doctor), referral networks, a claim with several diagnosis codes (claim_diagnoses bridge), practitioners credentialed at several facilities.',
    tryIt: {
      prompt: 'Flip the direction: list the distinct patients seen by Physical Therapy practitioners (specialty = \'Physical Therapy\').',
      starter: `SELECT DISTINCT pr.last_name AS practitioner, p.patient_id, p.last_name AS patient
FROM practitioners pr
JOIN charges c  ON c.practitioner_id = pr.practitioner_id
JOIN invoices i ON i.invoice_id = c.invoice_id
JOIN patients p ON p.patient_id = i.patient_id
WHERE pr.practitioner_id = 5
ORDER BY p.patient_id;`,
    },
    challenge: {
      level: 3,
      prompt: 'For EVERY practitioner (including ones with no charges), show practitioner_id, last_name and the number of distinct patients they have treated. Order by that count descending, then practitioner_id.',
      solution: `SELECT pr.practitioner_id, pr.last_name, COUNT(DISTINCT i.patient_id) AS patients_seen
FROM practitioners pr
LEFT JOIN charges c  ON c.practitioner_id = pr.practitioner_id
LEFT JOIN invoices i ON i.invoice_id = c.invoice_id
GROUP BY pr.practitioner_id, pr.last_name
ORDER BY patients_seen DESC, pr.practitioner_id;`,
      hints: ['Path: practitioners → charges (bridge) → invoices, which have patient_id.', 'Leo Martins (id 12) has no charges, so both joins must be LEFT JOINs.', 'Count patients, not charge lines: COUNT(DISTINCT i.patient_id).', 'GROUP BY pr.practitioner_id, pr.last_name ORDER BY patients_seen DESC, pr.practitioner_id'],
      ordered: true,
    },
    quiz: [
      { q: 'Which table acts as the bridge between practitioners and invoices?', options: ['patients', 'charges', 'payments', 'payors'], answer: 1, why: 'Each charge row links one practitioner to one invoice.' },
      { q: 'Why is COUNT(DISTINCT i.patient_id) needed when counting a practitioner\'s patients?', options: ['COUNT cannot count ids', 'The same patient appears once per charge line', 'To skip NULLs', 'For speed'], answer: 1, why: 'Joining through the bridge repeats the patient once per charge.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 10
  {
    id: 'joins-10',
    goals: [
      'ON vs USING vs NATURAL JOIN',
      'Compound (multi-column) join conditions',
      'Non-equi joins: <, >, BETWEEN in ON',
      'Why NULL keys never match',
    ],
    concept: `<p>The join condition is just a boolean expression that is evaluated for each candidate pair. Most joins use one equality (<code>FK = PK</code>), but ON accepts any expression:</p>
<ul>
<li><b>Compound</b>: <code>ON p.invoice_id = i.invoice_id AND p.payment_date &gt; i.due_date</code> (only late payments are matched).</li>
<li><b>Non-equi</b>: <code>ON c.service_date BETWEEN x.start AND x.end</code> (range matching).</li>
<li><b>USING (col)</b>: a shorthand for equality on a column with the same name in both tables. The column appears once in the output.</li>
<li><b>NATURAL JOIN</b>: automatically joins on <i>every</i> column with the same name. That is dangerous: <code>invoices NATURAL JOIN payments</code> silently matches on <code>invoice_id</code> <b>and</b> <code>payor_id</code>, so every patient-paid payment (payor_id NULL) is lost. You get 20 rows instead of 47.</li>
</ul>
<p>NULL never equals anything, not even another NULL, so rows with a NULL join key never match in an equality join.</p>`,
    why: 'Real matching rules are often richer than a single key: a payment that arrived after the due date, a charge that falls inside a contract period, a price tier chosen by amount range.',
    when: 'Use compound conditions to restrict which right rows can match (especially with outer joins), and non-equi joins for ranges, tiers, dates and "before/after" comparisons.',
    analogy: 'A clerk matching payments to invoices can follow a simple rule ("same invoice number") or a stricter one ("same invoice number and received after the due date"). The ON clause is the clerk\'s written matching rule.',
    exampleSql: `SELECT invoice_id, due_date FROM invoices WHERE invoice_id IN (2, 7, 14)`,
    syntax: `-- compound
JOIN b ON b.a_id = a.id AND b.date > a.date
-- range
JOIN tiers t ON a.amount BETWEEN t.low AND t.high
-- shorthand
JOIN b USING (shared_col)`,
    sql: `SELECT i.invoice_id,
       i.due_date,
       pay.payment_date,
       pay.amount,
       CAST(julianday(pay.payment_date) - julianday(i.due_date) AS INTEGER) AS days_late
FROM invoices i
JOIN payments pay
  ON pay.invoice_id = i.invoice_id
 AND pay.payment_date > i.due_date
ORDER BY days_late DESC, i.invoice_id;`,
    breakdown: [
      ['FROM invoices i JOIN payments pay', 'Pair invoices with payments...'],
      ['ON pay.invoice_id = i.invoice_id', '...for the same invoice...'],
      ['AND pay.payment_date > i.due_date', '...but only payments received after the due date (a non-equi condition).'],
      ['julianday(...) - julianday(...) AS days_late', 'How many days late each payment was.'],
      ['ORDER BY days_late DESC', 'Latest payments first.'],
    ],
    internals: `<p>Equality conditions allow index lookups, hash joins and merge joins. A pure non-equi condition (<code>a.x &lt; b.y</code>) cannot be hashed, so it falls back to nested loops, possibly with an index <b>range</b> scan. In a compound condition, the engine uses the equality part to find candidate rows and checks the rest as a residual filter on each pair. With an outer join, that residual filter only decides <i>whether a pair matches</i>; it never removes the preserved row.</p>`,
    mistakes: [
      { wrong: `SELECT COUNT(*)
FROM invoices
NATURAL JOIN payments;`, why: 'NATURAL JOIN joins on every shared column name: invoice_id AND payor_id. Payments made by patients (payor_id NULL) and payments where payor differs are silently lost: 20 rows instead of 47.', fix: `SELECT COUNT(*)
FROM invoices i
JOIN payments pay ON pay.invoice_id = i.invoice_id;` },
      { wrong: `SELECT i.invoice_id, py.payor_name
FROM invoices i
JOIN payors py ON py.payor_id = i.payor_id OR i.payor_id IS NULL;`, why: 'OR in a join condition can explode the result: each invoice with a NULL payor matches all 7 payors.', fix: `SELECT i.invoice_id, py.payor_name
FROM invoices i
LEFT JOIN payors py ON py.payor_id = i.payor_id;` },
    ],
    rules: [
      'ON can hold any boolean expression; equality on keys is simply the most common one.',
      'USING (col) is fine when names match. Avoid NATURAL JOIN.',
      'NULL = NULL is not true, so NULL keys never match.',
      'In outer joins, conditions on the optional side belong in ON.',
    ],
    compare: `<table><tr><th>Form</th><th>Example</th><th>Notes</th></tr>
<tr><td>ON</td><td><code>ON i.patient_id = p.patient_id</code></td><td>Explicit, most flexible</td></tr>
<tr><td>USING</td><td><code>USING (patient_id)</code></td><td>Same-named column, shown once</td></tr>
<tr><td>NATURAL</td><td><code>NATURAL JOIN</code></td><td>Implicit, breaks when columns are added</td></tr>
<tr><td>Non-equi</td><td><code>ON a.d BETWEEN b.s AND b.e</code></td><td>Ranges, tiers; no hash join</td></tr></table>`,
    realWorld: 'Fee schedules by date range (a charge priced by the contract in effect on the service date), late-payment penalties, matching remittances to claims within a date window.',
    tryIt: {
      prompt: 'Rewrite the first join with USING (invoice_id). Then try NATURAL JOIN and compare the row counts.',
      starter: `SELECT COUNT(*) AS rows_on
FROM invoices i
JOIN payments pay ON pay.invoice_id = i.invoice_id;`,
    },
    challenge: {
      level: 3,
      prompt: 'For each invoice that received at least one late payment (payment_date after due_date), show invoice_id, the number of late payments and the late amount collected. Order by invoice_id.',
      solution: `SELECT i.invoice_id, COUNT(*) AS late_payments, SUM(pay.amount) AS late_amount
FROM invoices i
JOIN payments pay
  ON pay.invoice_id = i.invoice_id
 AND pay.payment_date > i.due_date
GROUP BY i.invoice_id
ORDER BY i.invoice_id;`,
      hints: ['Join invoices to payments on invoice_id.', 'Add a second condition in ON comparing payment_date with due_date.', 'GROUP BY i.invoice_id and use COUNT(*) and SUM(pay.amount).', 'ON pay.invoice_id = i.invoice_id AND pay.payment_date > i.due_date ... GROUP BY i.invoice_id ORDER BY i.invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'Why does invoices NATURAL JOIN payments return fewer rows than expected?', options: ['NATURAL JOIN is an outer join', 'It also matches on payor_id, the other shared column name', 'It ignores invoice_id', 'It removes duplicates'], answer: 1, why: 'NATURAL JOIN uses every column with the same name.' },
      { q: 'Which join algorithm cannot handle a pure a.x < b.y condition?', options: ['Nested loop', 'Hash join', 'Both', 'Neither'], answer: 1, why: 'Hashing only finds equal keys; ranges need nested loops or range scans.' },
      { q: 'A row has a NULL join key. In an equality INNER JOIN it matches...', options: ['Other NULL keys', 'Nothing', 'Everything', 'Only key 0'], answer: 1, why: 'NULL = anything is unknown, never true.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 11
  {
    id: 'joins-11',
    goals: [
      'Grouping rows that come out of a join',
      'Grouping by a key and displaying names from the parent table',
      'COUNT(*) vs COUNT(child.pk) after a LEFT JOIN',
      'Filtering groups with HAVING',
    ],
    concept: `<p>A join produces rows; <code>GROUP BY</code> then collapses them. The common recipe: <b>join the parent (names) to the child (activity), group by the parent key, aggregate the child columns</b>.</p>
<p>"Charges per practitioner" = <code>practitioners LEFT JOIN charges</code>, <code>GROUP BY practitioner_id</code>, <code>COUNT(c.charge_id)</code>, <code>SUM(c.amount)</code>. The LEFT JOIN keeps Leo Martins (id 12, no charges yet), and <code>COUNT(c.charge_id)</code> correctly gives him 0 because it skips the NULL.</p>
<p>Group by the <b>key</b> (<code>practitioner_id</code>), not just the name: two doctors can share a last name.</p>`,
    why: 'Almost every dashboard metric (revenue per location, visits per practitioner, invoices per payor) is a join followed by a group.',
    when: 'Whenever you want a total or count per entity and the entity\'s descriptive columns live in a different table from the activity.',
    analogy: 'The office manager lays every charge slip out on a table under the doctor\'s name card and counts each pile. Dr. Martins\' name card is out too (LEFT JOIN), with an empty pile: 0.',
    exampleSql: `SELECT practitioner_id, first_name, last_name, specialty FROM practitioners`,
    syntax: `SELECT parent.id, parent.name, COUNT(child.id), SUM(child.amount)
FROM parent
LEFT JOIN child ON child.parent_id = parent.id
GROUP BY parent.id, parent.name
HAVING ...;`,
    sql: `SELECT pr.practitioner_id,
       pr.last_name,
       pr.specialty,
       COUNT(c.charge_id)         AS charges,
       COALESCE(SUM(c.amount), 0) AS billed
FROM practitioners pr
LEFT JOIN charges c
  ON c.practitioner_id = pr.practitioner_id
GROUP BY pr.practitioner_id, pr.last_name, pr.specialty
ORDER BY billed DESC;`,
    breakdown: [
      ['FROM practitioners pr LEFT JOIN charges c', 'Every practitioner, with their charges if there are any.'],
      ['GROUP BY pr.practitioner_id, ...', 'One group per practitioner (grouped by key; name and specialty ride along).'],
      ['COUNT(c.charge_id)', 'Counts only real charges, so Leo Martins gets 0.'],
      ['COALESCE(SUM(c.amount), 0)', 'SUM of no rows is NULL; COALESCE turns it into 0.'],
      ['ORDER BY billed DESC', 'Top producers first.'],
    ],
    visual: { type: 'groupby', source: `SELECT pr.last_name AS practitioner, c.amount FROM charges c JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id WHERE c.invoice_id BETWEEN 1 AND 6`, group: 'practitioner', value: 'amount', agg: 'SUM' },
    internals: `<p>The engine first runs the join, which produces a stream of joined rows, then groups that stream: either by sorting on the group key or by putting rows into a hash table keyed by it. SQLite usually sorts ("USE TEMP B-TREE FOR GROUP BY") unless an index already delivers the rows in key order. Some engines can push the aggregation <i>below</i> the join (eager aggregation): group charges by practitioner_id first, then join 11 summary rows instead of 104 detail rows.</p>`,
    mistakes: [
      { wrong: `SELECT pr.last_name, COUNT(*) AS charges
FROM practitioners pr
LEFT JOIN charges c ON c.practitioner_id = pr.practitioner_id
GROUP BY pr.practitioner_id;`, why: 'COUNT(*) counts the NULL-padded row, so Leo Martins shows 1 charge instead of 0.', fix: `SELECT pr.last_name, COUNT(c.charge_id) AS charges
FROM practitioners pr
LEFT JOIN charges c ON c.practitioner_id = pr.practitioner_id
GROUP BY pr.practitioner_id;` },
      { wrong: `SELECT pr.specialty, COUNT(c.charge_id)
FROM practitioners pr
LEFT JOIN charges c ON c.practitioner_id = pr.practitioner_id
WHERE COUNT(c.charge_id) > 10
GROUP BY pr.specialty;`, why: 'Aggregates cannot go in WHERE, which runs before grouping. Use HAVING.', fix: `SELECT pr.specialty, COUNT(c.charge_id)
FROM practitioners pr
LEFT JOIN charges c ON c.practitioner_id = pr.practitioner_id
GROUP BY pr.specialty
HAVING COUNT(c.charge_id) > 10;` },
    ],
    rules: [
      'Group by the parent key; the display columns can be added to GROUP BY as well.',
      'With LEFT JOIN, count child.pk, not *.',
      'COALESCE(SUM(...), 0) for entities with no activity.',
      'Filter rows in WHERE, filter groups in HAVING.',
    ],
    compare: `<table><tr><th>Goal</th><th>Join</th><th>Count with</th></tr>
<tr><td>Only active practitioners</td><td>INNER</td><td>COUNT(*) is fine</td></tr>
<tr><td>All practitioners incl. zero</td><td>LEFT</td><td>COUNT(c.charge_id)</td></tr></table>`,
    realWorld: 'Provider productivity (RVUs, charges per provider), invoices per location, claim volume per payor: the core tiles of every revenue-cycle dashboard.',
    tryIt: {
      prompt: 'Group by specialty instead of by practitioner. Then add HAVING billed > 1000.',
      starter: `SELECT pr.specialty, COUNT(c.charge_id) AS charges, COALESCE(SUM(c.amount), 0) AS billed
FROM practitioners pr
LEFT JOIN charges c ON c.practitioner_id = pr.practitioner_id
GROUP BY pr.specialty
ORDER BY billed DESC;`,
    },
    challenge: {
      level: 2,
      prompt: 'Show EVERY treatment location (location_id, location_name) with its number of invoices and total invoiced amount (0 when none). Order by location_id.',
      solution: `SELECT l.location_id, l.location_name,
       COUNT(i.invoice_id) AS invoices,
       COALESCE(SUM(i.total_amount), 0) AS billed
FROM treatment_locations l
LEFT JOIN invoices i ON i.location_id = l.location_id
GROUP BY l.location_id, l.location_name
ORDER BY l.location_id;`,
      hints: ['Every location must appear, including Eastside Family Clinic (6), which has no invoices.', 'treatment_locations LEFT JOIN invoices ON location_id.', 'COUNT(i.invoice_id) and COALESCE(SUM(i.total_amount), 0).', 'GROUP BY l.location_id, l.location_name ORDER BY l.location_id'],
      ordered: true,
    },
    quiz: [
      { q: 'After practitioners LEFT JOIN charges, what does COUNT(*) return for Leo Martins (no charges)?', options: ['0', '1', 'NULL', 'Error'], answer: 1, why: 'The NULL-padded row is still a row.' },
      { q: 'Why group by practitioner_id rather than only last_name?', options: ['It is faster', 'Names may not be unique, so two people could merge into one group', 'last_name is not allowed in GROUP BY', 'No reason'], answer: 1, why: 'Group by the key to keep different entities apart.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 12
  {
    id: 'joins-12',
    goals: [
      'Why joining one-to-many and then summing double counts',
      'How to spot fan-out (row multiplication)',
      'Fix 1: pre-aggregate each child table before joining',
      'Fix 2: aggregate at the right grain with correlated subqueries',
    ],
    concept: `<p>Joining a parent to a child repeats the parent row once per child. If you then <code>SUM</code> a <b>parent</b> column, each value is added once per child. This is <b>fan-out double counting</b>, the most expensive bug in reporting.</p>
<ul>
<li><code>SUM(total_amount) FROM invoices</code> = <b>11,570</b> (correct).</li>
<li><code>invoices JOIN charges</code> → 104 rows; <code>SUM(i.total_amount)</code> = <b>31,645</b> (almost 3× too high).</li>
<li>Joining <b>two</b> child tables (charges and payments) to the same invoice multiplies them: 4 charges × 2 payments = 8 rows for that invoice, so both sums are inflated.</li>
</ul>
<p><b>The fix:</b> aggregate each child table to one row per invoice (or per patient, per payor) <i>first</i>, in a CTE or subquery, then join the one-row-per-key summaries.</p>`,
    why: 'Revenue totals that are wrong but plausible get presented to management. Knowing the grain of every joined row is what prevents that.',
    when: 'Any time you SUM or COUNT after a join that crosses a one-to-many line, and above all when you join two or more child tables to the same parent.',
    analogy: 'The clerk copies an invoice total onto each of its charge slips, then adds up all the slips. A $380 invoice with 4 slips gets counted as $1,520. The fix is to total each pile separately and then put the piles side by side.',
    exampleSql: `SELECT i.invoice_id, i.total_amount, c.charge_id, c.amount FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id WHERE i.invoice_id = 4`,
    syntax: `WITH child_a AS (SELECT parent_id, SUM(x) AS sx FROM a GROUP BY parent_id),
     child_b AS (SELECT parent_id, SUM(y) AS sy FROM b GROUP BY parent_id)
SELECT p.id, ca.sx, cb.sy
FROM parent p
LEFT JOIN child_a ca ON ca.parent_id = p.id
LEFT JOIN child_b cb ON cb.parent_id = p.id;`,
    sql: `WITH charge_totals AS (
  SELECT invoice_id, SUM(amount) AS charged, COUNT(*) AS lines
  FROM charges GROUP BY invoice_id
),
payment_totals AS (
  SELECT invoice_id, SUM(amount) AS paid, COUNT(*) AS payments
  FROM payments GROUP BY invoice_id
)
SELECT i.invoice_id,
       i.total_amount,
       COALESCE(ct.charged, 0) AS charged,
       COALESCE(pt.paid, 0)    AS paid,
       i.total_amount - COALESCE(pt.paid, 0) AS balance
FROM invoices i
LEFT JOIN charge_totals ct  ON ct.invoice_id = i.invoice_id
LEFT JOIN payment_totals pt ON pt.invoice_id = i.invoice_id
ORDER BY i.invoice_id
LIMIT 12;`,
    breakdown: [
      ['WITH charge_totals AS (... GROUP BY invoice_id)', 'Collapse charges to one row per invoice first.'],
      ['payment_totals AS (... GROUP BY invoice_id)', 'Collapse payments to one row per invoice first.'],
      ['FROM invoices i LEFT JOIN charge_totals ct', 'Invoice to its one charge summary: no fan-out.'],
      ['LEFT JOIN payment_totals pt', 'Invoice to its one payment summary: no fan-out.'],
      ['i.total_amount - COALESCE(pt.paid, 0) AS balance', 'Correct balance, computed at the invoice grain.'],
    ],
    visual: { type: 'flow', steps: [['invoices', '48 rows · SUM(total_amount) = 11,570 ✔'], ['JOIN charges (one-to-many)', '104 rows: each invoice repeated once per charge'], ['SUM(i.total_amount)', '31,645 ✘ double counted'], ['Fix: GROUP BY invoice_id inside a CTE first', '1 summary row per invoice'], ['JOIN the summaries', '48 rows · totals correct ✔']] },
    internals: `<p>The engine does exactly what you asked: a join is a multiset operation, and SUM adds every row it receives. Nothing in SQL knows that <code>total_amount</code> is an "invoice-level" fact. Pre-aggregation also usually runs <b>faster</b>, because the join handles 47 summary rows instead of 104 detail rows. Optimizers call this <i>eager aggregation</i> or <i>group-by pushdown</i>, but they apply it only when it is provably equivalent, and never to fix your double counting.</p>`,
    mistakes: [
      { wrong: `SELECT SUM(i.total_amount) AS billed
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id;`, why: 'Each invoice total is added once per charge line: 31,645 instead of 11,570.', fix: `SELECT SUM(total_amount) AS billed
FROM invoices;` },
      { wrong: `SELECT i.invoice_id, SUM(c.amount) AS charged, SUM(pay.amount) AS paid
FROM invoices i
LEFT JOIN charges c    ON c.invoice_id = i.invoice_id
LEFT JOIN payments pay ON pay.invoice_id = i.invoice_id
GROUP BY i.invoice_id;`, why: 'Two child tables on the same parent: charges × payments rows per invoice. Invoice 16 (3 charges, 2 payments) gets 6 rows, so charges are doubled and payments tripled.', fix: `SELECT i.invoice_id,
       (SELECT SUM(amount) FROM charges c WHERE c.invoice_id = i.invoice_id) AS charged,
       (SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.invoice_id) AS paid
FROM invoices i;` },
      { wrong: `SELECT py.payor_name, COUNT(i.invoice_id) AS invoices
FROM payors py
JOIN invoices i ON i.payor_id = py.payor_id
JOIN payments pay ON pay.invoice_id = i.invoice_id
GROUP BY py.payor_name;`, why: 'Counting parent rows after a one-to-many join counts each invoice once per payment.', fix: `SELECT py.payor_name, COUNT(DISTINCT i.invoice_id) AS invoices
FROM payors py
JOIN invoices i ON i.payor_id = py.payor_id
JOIN payments pay ON pay.invoice_id = i.invoice_id
GROUP BY py.payor_name;` },
    ],
    rules: [
      'Know the grain: what does one row mean after each join?',
      'Never SUM a parent column after joining to its children.',
      'Never join two independent child tables to the same parent and then aggregate. Pre-aggregate each one.',
      'COUNT(DISTINCT parent.pk) fixes counts, but not sums.',
      'Check totals against the base table: SUM before the join should equal SUM after.',
    ],
    compare: `<table><tr><th>Query</th><th>Result</th></tr>
<tr><td>SUM(total_amount) FROM invoices</td><td>11,570 ✔</td></tr>
<tr><td>... JOIN charges → SUM(i.total_amount)</td><td>31,645 ✘</td></tr>
<tr><td>... JOIN payments → SUM(i.total_amount)</td><td>12,625 ✘</td></tr>
<tr><td>SUM(c.amount) FROM charges</td><td>11,570 ✔ (child column at child grain)</td></tr></table>`,
    realWorld: 'A/R aging, collection rate (payments ÷ charges) and payor mix reports all combine charges and payments. Pre-aggregating each side to the invoice or payor grain is standard practice in revenue-cycle SQL.',
    tips: ['Before summing, run the join with COUNT(*) grouped by the parent key. Any count above 1 means fan-out.'],
    deep: `<p>The "chasm trap" (two one-to-many branches from one parent) and the "fan trap" (a sum of a parent measure after a one-to-many join) are the classic names for these bugs in BI tools. Semantic layers such as LookML handle them with "symmetric aggregates": SUM(DISTINCT) on a key-offset trick. Pre-aggregation is simpler and clearer.</p>`,
    tryIt: {
      prompt: 'Run the broken version and compare invoice 16 with the correct CTE version. By how much is each sum inflated?',
      starter: `SELECT i.invoice_id, i.total_amount,
       SUM(c.amount) AS charged_wrong,
       SUM(pay.amount) AS paid_wrong,
       COUNT(*) AS joined_rows
FROM invoices i
LEFT JOIN charges c    ON c.invoice_id = i.invoice_id
LEFT JOIN payments pay ON pay.invoice_id = i.invoice_id
WHERE i.invoice_id IN (16, 19, 30)
GROUP BY i.invoice_id;`,
    },
    challenge: {
      level: 4,
      prompt: 'For each payor that has invoices, show payor_name, total invoiced (sum of invoice total_amount) and total paid by that payor (sum of payments.amount where payments.payor_id is that payor). Do not double count. Order by payor_name.',
      solution: `WITH billed AS (
  SELECT payor_id, SUM(total_amount) AS billed
  FROM invoices WHERE payor_id IS NOT NULL GROUP BY payor_id
),
paid AS (
  SELECT payor_id, SUM(amount) AS paid
  FROM payments WHERE payor_id IS NOT NULL GROUP BY payor_id
)
SELECT py.payor_name, b.billed, COALESCE(pd.paid, 0) AS paid
FROM payors py
JOIN billed b     ON b.payor_id = py.payor_id
LEFT JOIN paid pd ON pd.payor_id = py.payor_id
ORDER BY py.payor_name;`,
      hints: ['Invoices and payments are two separate child tables of payors. Joining both at once fans out.', 'Build one CTE that sums invoices by payor_id and another that sums payments by payor_id.', 'Join payors to the billed CTE (INNER: only payors with invoices) and LEFT JOIN the paid CTE.', 'SELECT py.payor_name, b.billed, COALESCE(pd.paid, 0) ... ORDER BY py.payor_name'],
      ordered: true,
    },
    quiz: [
      { q: 'Invoice 4 has total 380 and 4 charges. What does SUM(i.total_amount) give for it after joining charges?', options: ['380', '95', '1,520', '4'], answer: 2, why: '380 is repeated on each of the 4 rows: 4 × 380 = 1,520.' },
      { q: 'What is the safest way to report charges and payments per invoice together?', options: ['Join both tables and SUM', 'Use SUM(DISTINCT ...)', 'Pre-aggregate each table per invoice, then join', 'CROSS JOIN them'], answer: 2, why: 'One row per invoice from each side means no multiplication.' },
      { q: 'Why is SUM(DISTINCT amount) not a real fix?', options: ['It is slower', 'Two different charges with the same amount would be counted once', 'DISTINCT is not allowed in SUM', 'It is a fine fix'], answer: 1, why: 'DISTINCT removes equal values, not duplicated rows, so legitimate equal amounts are lost.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 13
  {
    id: 'joins-13',
    goals: [
      'What an anti-join is: rows with NO match',
      'Three ways to write it: LEFT JOIN ... IS NULL, NOT EXISTS, NOT IN',
      'The NOT IN + NULL trap',
    ],
    concept: `<p>An <b>anti-join</b> returns rows from A that have <b>no</b> matching row in B. SQL has no ANTI JOIN keyword; you write it one of three ways:</p>
<ol>
<li><b>LEFT JOIN + IS NULL</b>: <code>patients p LEFT JOIN invoices i ON ... WHERE i.invoice_id IS NULL</code>. The only rows with NULL on the right are the unmatched ones.</li>
<li><b>NOT EXISTS</b>: <code>WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id)</code>. It reads like the question, and it is the safest choice.</li>
<li><b>NOT IN</b>: <code>WHERE patient_id NOT IN (SELECT patient_id FROM invoices)</code>. <b>Dangerous</b> if the subquery can return a NULL.</li>
</ol>
<p>Our data: patients 8, 9, 17, 19, 22 have never been billed; practitioner 12 has no charges; location 6 has no invoices; payors 5 and 6 have no invoices. But <code>payor_id NOT IN (SELECT payor_id FROM invoices)</code> returns <b>nothing</b>, because two invoices have a NULL payor_id.</p>`,
    why: '"What is missing?" is one of the most valuable questions in billing: patients never billed, services never charged, invoices never paid, charges never posted to the ledger.',
    when: 'Finding gaps, orphans, unbilled work, inactive entities and data quality problems.',
    analogy: 'Compare the day\'s appointment list with the charge slips. Anyone who was seen but has no slip is lost revenue. An anti-join is the list of names with no matching slip.',
    exampleSql: `SELECT patient_id, first_name, last_name FROM patients WHERE patient_id IN (8, 9, 17, 19, 22)`,
    syntax: `-- 1
SELECT a.* FROM a LEFT JOIN b ON b.a_id = a.id WHERE b.id IS NULL;
-- 2
SELECT a.* FROM a WHERE NOT EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id);`,
    sql: `SELECT p.patient_id, p.first_name, p.last_name
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
WHERE i.invoice_id IS NULL
ORDER BY p.patient_id;`,
    breakdown: [
      ['FROM patients p LEFT JOIN invoices i', 'Keep every patient; unbilled ones get NULL invoice columns.'],
      ['ON i.patient_id = p.patient_id', 'Match on the patient.'],
      ['WHERE i.invoice_id IS NULL', 'Keep only the NULL-padded rows: the patients with no invoice. Test a column that is never NULL in a real match (the PK).'],
    ],
    visual: { type: 'join', join: 'left' },
    internals: `<p>Most optimizers recognize all three forms and run a physical <b>anti-join</b>: for each left row, probe the right side and emit the row only if the probe finds nothing, stopping at the first hit. SQLite runs NOT EXISTS as a correlated subquery that stops at the first match, and it can build an automatic index on the inner table. NOT IN must also track whether the subquery returned any NULL, because SQL\'s three-valued logic says <code>x NOT IN (1, 2, NULL)</code> is UNKNOWN, never TRUE.</p>`,
    mistakes: [
      { wrong: `SELECT payor_id, payor_name
FROM payors
WHERE payor_id NOT IN (SELECT payor_id FROM invoices);`, why: 'invoices.payor_id contains NULLs. "5 NOT IN (1, 2, NULL, ...)" is UNKNOWN, so every row is rejected and you get 0 rows, although payors 5 and 6 have no invoices.', fix: `SELECT py.payor_id, py.payor_name
FROM payors py
WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.payor_id = py.payor_id);` },
      { wrong: `SELECT p.patient_id
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id AND i.status = 'Paid'
WHERE i.status IS NULL;`, why: 'This tests a nullable column. It works here, but if status could legitimately be NULL, real matches would slip through. Always test the right table\'s primary key (or a NOT NULL column).', fix: `SELECT p.patient_id
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id AND i.status = 'Paid'
WHERE i.invoice_id IS NULL;` },
    ],
    rules: [
      'Anti-join = "A without B".',
      'Prefer NOT EXISTS: it is clear, NULL-safe, and stops at the first match.',
      'LEFT JOIN ... WHERE b.pk IS NULL is fine too; test a NOT NULL column.',
      'Avoid NOT IN on a nullable column (or add WHERE col IS NOT NULL inside).',
    ],
    compare: `<table><tr><th>Form</th><th>NULL-safe</th><th>Readability</th></tr>
<tr><td>NOT EXISTS</td><td>✔</td><td>Reads like English</td></tr>
<tr><td>LEFT JOIN / IS NULL</td><td>✔</td><td>Familiar, a little indirect</td></tr>
<tr><td>NOT IN (subquery)</td><td>✘ if NULLs</td><td>Short, but risky</td></tr>
<tr><td>EXCEPT</td><td>✔</td><td>Only for comparing key lists</td></tr></table>`,
    realWorld: 'Unbilled encounters, claims with no remittance, patients with no visit in 12 months (recall lists), providers not credentialed with a payor, charges missing from the GL.',
    tryIt: {
      prompt: 'Run the NOT IN version against payors and see it return nothing. Then add WHERE payor_id IS NOT NULL inside the subquery, and finally rewrite it with NOT EXISTS.',
      starter: `SELECT payor_id, payor_name
FROM payors
WHERE payor_id NOT IN (SELECT payor_id FROM invoices);`,
    },
    challenge: {
      level: 2,
      prompt: 'Find invoices that have never received any payment and are not Void. Show invoice_id, status and total_amount, ordered by total_amount descending, then invoice_id.',
      solution: `SELECT i.invoice_id, i.status, i.total_amount
FROM invoices i
WHERE NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.invoice_id = i.invoice_id)
  AND i.status <> 'Void'
ORDER BY i.total_amount DESC, i.invoice_id;`,
      hints: ['"Never received any payment" means: no row in payments for that invoice.', 'Use NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.invoice_id = i.invoice_id), or LEFT JOIN + IS NULL.', 'Exclude Void invoices with AND i.status <> \'Void\'.', 'ORDER BY i.total_amount DESC, i.invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'Why can NOT IN (subquery) return zero rows unexpectedly?', options: ['It is case-sensitive', 'A NULL in the subquery makes every comparison UNKNOWN', 'It only works with numbers', 'It needs DISTINCT'], answer: 1, why: 'x NOT IN (..., NULL) is never TRUE.' },
      { q: 'In the LEFT JOIN anti-join pattern, which column should you test for NULL?', options: ['Any right column', 'A NOT NULL column of the right table, ideally its PK', 'A left column', 'The join column of the left table'], answer: 1, why: 'Only a column that is never NULL in a real match tells you reliably that there was no match.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 14
  {
    id: 'joins-14',
    goals: [
      'What a semi-join is: rows that have AT LEAST ONE match',
      'Why a plain JOIN duplicates rows here',
      'Writing semi-joins with EXISTS and IN',
    ],
    concept: `<p>A <b>semi-join</b> returns each row of A <b>once</b> if it has <b>at least one</b> match in B. You only care <i>that</i> a match exists; no columns from B are returned.</p>
<p>"Which patients have an overdue invoice?" A plain JOIN returns a patient once per overdue invoice (duplicates). A semi-join returns each patient once:</p>
<ul>
<li><code>WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id AND i.status = 'Overdue')</code></li>
<li><code>WHERE p.patient_id IN (SELECT patient_id FROM invoices WHERE status = 'Overdue')</code></li>
</ul>
<p>IN is safe for semi-joins; the NULL trap only affects <b>NOT</b> IN.</p>`,
    why: 'Filtering by "has any related X" is extremely common, and doing it with a JOIN forces a DISTINCT that hides the fan-out and costs extra work.',
    when: 'You want rows of one table filtered by the existence of related rows, without showing (or multiplying by) those related rows.',
    analogy: 'The collections team wants the list of patients to call: anyone with at least one overdue bill. Each patient is called once, no matter whether they have one overdue bill or five.',
    exampleSql: `SELECT invoice_id, patient_id, status FROM invoices WHERE status = 'Overdue' ORDER BY patient_id`,
    syntax: `SELECT a.*
FROM a
WHERE EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id AND <condition>);`,
    sql: `SELECT p.patient_id, p.first_name, p.last_name
FROM patients p
WHERE EXISTS (
  SELECT 1
  FROM invoices i
  WHERE i.patient_id = p.patient_id
    AND i.status = 'Overdue'
)
ORDER BY p.patient_id;`,
    breakdown: [
      ['FROM patients p', 'Each patient is considered once.'],
      ['WHERE EXISTS (', 'Keep the patient if the subquery finds at least one row.'],
      ['SELECT 1 FROM invoices i', 'What is selected does not matter; only existence counts.'],
      ['WHERE i.patient_id = p.patient_id AND i.status = \'Overdue\'', 'Correlated: an overdue invoice of this patient.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 620 210" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="13">
<text x="100" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">patients</text>
<text x="330" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">overdue invoices</text>
<text x="540" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">result</text>
<rect x="20" y="35" width="160" height="28" rx="5" fill="var(--panel2)" stroke="var(--green)"/><text x="30" y="54" fill="var(--text)">Patient A</text>
<rect x="20" y="85" width="160" height="28" rx="5" fill="var(--panel2)" stroke="var(--green)"/><text x="30" y="104" fill="var(--text)">Patient B</text>
<rect x="20" y="135" width="160" height="28" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="30" y="154" fill="var(--muted)">Patient C (none)</text>
<rect x="260" y="30" width="140" height="24" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="270" y="47" fill="var(--text)">inv 3 (A)</text>
<rect x="260" y="60" width="140" height="24" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="270" y="77" fill="var(--text)">inv 12 (A)</text>
<rect x="260" y="95" width="140" height="24" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="270" y="112" fill="var(--text)">inv 20 (B)</text>
<line x1="180" y1="49" x2="260" y2="42" stroke="var(--green)" stroke-width="2"/>
<line x1="180" y1="49" x2="260" y2="72" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 3"/>
<line x1="180" y1="99" x2="260" y2="107" stroke="var(--green)" stroke-width="2"/>
<rect x="470" y="35" width="140" height="28" rx="5" fill="var(--panel2)" stroke="var(--green)"/><text x="480" y="54" fill="var(--text)">Patient A (once)</text>
<rect x="470" y="85" width="140" height="28" rx="5" fill="var(--panel2)" stroke="var(--green)"/><text x="480" y="104" fill="var(--text)">Patient B (once)</text>
<text x="310" y="185" text-anchor="middle" fill="var(--muted)">EXISTS stops at the first match (dashed line is never checked) · each patient appears at most once</text>
</svg>` },
    internals: `<p>A physical semi-join probes B for each row of A and <b>stops at the first match</b>, so it never produces more than one output row per A row. Hash engines build a hash set of B's keys and test membership. SQLite may rewrite <code>IN (subquery)</code> into a join against a temporary index of the subquery values, and it runs EXISTS as a correlated probe that stops early (with an automatic index when that helps).</p>`,
    mistakes: [
      { wrong: `SELECT p.patient_id, p.last_name
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id
WHERE i.status = 'Overdue';`, why: 'A patient with 2 overdue invoices appears twice. The JOIN answers "list overdue invoices with patients", not "which patients".', fix: `SELECT p.patient_id, p.last_name
FROM patients p
WHERE EXISTS (SELECT 1 FROM invoices i
              WHERE i.patient_id = p.patient_id AND i.status = 'Overdue');` },
      { wrong: `SELECT p.patient_id, p.last_name
FROM patients p
WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.status = 'Overdue');`, why: 'The subquery is not correlated (no link to p). It is true for every patient because some overdue invoice exists somewhere, so all 25 patients are returned.', fix: `SELECT p.patient_id, p.last_name
FROM patients p
WHERE EXISTS (SELECT 1 FROM invoices i
              WHERE i.patient_id = p.patient_id AND i.status = 'Overdue');` },
    ],
    rules: [
      'Semi-join = "A that has some B"; each A row at most once.',
      'EXISTS and IN are both good; JOIN + DISTINCT works but does extra work.',
      'An EXISTS subquery must be correlated to the outer row.',
      'SELECT 1, SELECT * or SELECT NULL inside EXISTS: all the same.',
    ],
    compare: `<table><tr><th></th><th>JOIN</th><th>Semi-join (EXISTS / IN)</th></tr>
<tr><td>Rows per A</td><td>one per match</td><td>at most one</td></tr>
<tr><td>B columns available</td><td>yes</td><td>no</td></tr>
<tr><td>Stops at first match</td><td>no</td><td>yes</td></tr></table>`,
    realWorld: 'Collections call lists, "patients who had any cardiology service", "payors with any denied claim this month", "providers who billed at least once this quarter".',
    tryIt: {
      prompt: 'Rewrite the EXISTS query with IN. Then write it with JOIN and compare the row counts (and try adding DISTINCT).',
      starter: `SELECT p.patient_id, p.last_name
FROM patients p
WHERE p.patient_id IN (SELECT patient_id FROM invoices WHERE status = 'Overdue')
ORDER BY p.patient_id;`,
    },
    challenge: {
      level: 3,
      prompt: 'List the practitioners (practitioner_id, first_name, last_name) who have performed at least one charge on an Overdue invoice. Each practitioner once, ordered by practitioner_id.',
      solution: `SELECT pr.practitioner_id, pr.first_name, pr.last_name
FROM practitioners pr
WHERE EXISTS (
  SELECT 1
  FROM charges c
  JOIN invoices i ON i.invoice_id = c.invoice_id
  WHERE c.practitioner_id = pr.practitioner_id
    AND i.status = 'Overdue'
)
ORDER BY pr.practitioner_id;`,
      hints: ['The link path is practitioners → charges → invoices.', 'Put charges JOIN invoices inside an EXISTS subquery.', 'Correlate it with c.practitioner_id = pr.practitioner_id and filter on i.status = \'Overdue\'.', 'SELECT pr.practitioner_id, pr.first_name, pr.last_name FROM practitioners pr WHERE EXISTS (...) ORDER BY pr.practitioner_id'],
      ordered: true,
    },
    quiz: [
      { q: 'A patient has 3 overdue invoices. How many times does the patient appear with WHERE EXISTS (...overdue...)?', options: ['0', '1', '3', '4'], answer: 1, why: 'A semi-join returns each outer row at most once.' },
      { q: 'Is IN (subquery) affected by NULLs in the subquery the way NOT IN is?', options: ['Yes, it returns nothing', 'No. A NULL just never matches, and other values still match', 'Only with numbers', 'Only in SQLite'], answer: 1, why: 'x IN (1, NULL) is TRUE when x = 1; only NOT IN is broken by NULLs.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 15
  {
    id: 'joins-15',
    goals: [
      'The main EXISTS patterns: has-any, has-none, flags',
      'EXISTS with extra conditions (date windows, amounts)',
      'Relational division ("for all") with double NOT EXISTS',
    ],
    concept: `<p><code>EXISTS</code> is a small, versatile tool. The patterns worth knowing:</p>
<ul>
<li><b>Has any</b>: <code>WHERE EXISTS (...)</code> (semi-join).</li>
<li><b>Has none</b>: <code>WHERE NOT EXISTS (...)</code> (anti-join).</li>
<li><b>Yes/no flag column</b>: <code>CASE WHEN EXISTS (...) THEN 'Y' ELSE 'N' END</code>, or just <code>EXISTS(...)</code>, which gives 1/0 in SQLite.</li>
<li><b>Conditional existence</b>: add any filter inside, for example "a payment within 30 days of the invoice date".</li>
<li><b>For all (relational division)</b>: "invoices where <i>every</i> charge was performed by a physical therapist" = invoices for which <i>there is no</i> charge that is <i>not</i> by a physical therapist. That is two NOT EXISTS, or one NOT EXISTS plus a negated condition.</li>
</ul>`,
    why: 'EXISTS expresses yes/no questions about related data directly, never multiplies rows, and handles NULLs safely.',
    when: 'Flags on a report (has insurance payment? has refund?), eligibility checks, "all/none/any" questions.',
    analogy: 'For each patient chart, the auditor asks yes/no questions: "Is there any refund slip? Any payment within 30 days? Is every service on this bill physical therapy?" The auditor does not copy slips; they only tick boxes.',
    exampleSql: `SELECT transaction_id, invoice_id, transaction_type, amount FROM transactions WHERE transaction_type IN ('REFUND','WRITE_OFF','ADJUSTMENT')`,
    syntax: `SELECT a.id,
       CASE WHEN EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id AND ...) THEN 'Y' ELSE 'N' END AS flag
FROM a;

-- for all: A where no B fails the test
WHERE NOT EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id AND NOT (<test>))`,
    sql: `SELECT i.invoice_id,
       i.status,
       CASE WHEN EXISTS (SELECT 1 FROM payments pay
                         WHERE pay.invoice_id = i.invoice_id
                           AND pay.payor_id IS NOT NULL)
            THEN 'Y' ELSE 'N' END AS insurer_paid,
       CASE WHEN EXISTS (SELECT 1 FROM payments pay
                         WHERE pay.invoice_id = i.invoice_id
                           AND pay.payor_id IS NULL)
            THEN 'Y' ELSE 'N' END AS patient_paid,
       CASE WHEN EXISTS (SELECT 1 FROM transactions t
                         WHERE t.invoice_id = i.invoice_id
                           AND t.transaction_type IN ('REFUND', 'WRITE_OFF', 'ADJUSTMENT'))
            THEN 'Y' ELSE 'N' END AS has_adjustment
FROM invoices i
ORDER BY i.invoice_id
LIMIT 15;`,
    breakdown: [
      ['FROM invoices i', 'One output row per invoice. EXISTS never multiplies.'],
      ['CASE WHEN EXISTS (... pay.payor_id IS NOT NULL)', 'Flag: did any insurer pay this invoice?'],
      ['CASE WHEN EXISTS (... pay.payor_id IS NULL)', 'Flag: did the patient pay anything?'],
      ['CASE WHEN EXISTS (... transaction_type IN ...)', 'Flag: any refund, write-off or adjustment on the ledger?'],
    ],
    internals: `<p>Each EXISTS is a correlated probe that stops at the first matching row. Without an index on the inner table's FK, each probe is a scan. SQLite can create an <b>automatic index</b> for the duration of the query to avoid repeated scans. Modern optimizers "decorrelate" EXISTS into semi-joins or anti-joins and choose hash or merge strategies, so the three flags above can run as three hash semi-joins.</p>`,
    mistakes: [
      { wrong: `SELECT i.invoice_id
FROM invoices i
WHERE NOT EXISTS (SELECT 1 FROM charges c JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
                  WHERE c.invoice_id = i.invoice_id AND pr.specialty <> 'Physical Therapy');`, why: '"For all" logic is true for empty sets: invoice 37 (Void, no charges) has no non-PT charge, so it is wrongly included. Also require that at least one charge exists.', fix: `SELECT i.invoice_id
FROM invoices i
WHERE EXISTS (SELECT 1 FROM charges c WHERE c.invoice_id = i.invoice_id)
  AND NOT EXISTS (SELECT 1 FROM charges c JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
                  WHERE c.invoice_id = i.invoice_id AND pr.specialty <> 'Physical Therapy');` },
      { wrong: `SELECT i.invoice_id, COUNT(pay.payment_id) > 0 AS has_payment
FROM invoices i
LEFT JOIN payments pay ON pay.invoice_id = i.invoice_id
LEFT JOIN transactions t ON t.invoice_id = i.invoice_id
GROUP BY i.invoice_id;`, why: 'Building flags with joins fans out (payments × transactions) and needs GROUP BY. EXISTS flags are simpler and cannot multiply rows.', fix: `SELECT i.invoice_id,
       EXISTS (SELECT 1 FROM payments pay WHERE pay.invoice_id = i.invoice_id) AS has_payment
FROM invoices i;` },
    ],
    rules: [
      'EXISTS answers yes/no; it never duplicates outer rows.',
      'Put any extra matching condition inside the subquery.',
      '"For all X" = "no X that fails". Remember the empty-set case.',
      'Index the correlated FK column for fast probes.',
    ],
    compare: `<table><tr><th>Question</th><th>Pattern</th></tr>
<tr><td>Has any</td><td>EXISTS</td></tr>
<tr><td>Has none</td><td>NOT EXISTS</td></tr>
<tr><td>How many</td><td>COUNT via JOIN + GROUP BY, or a scalar subquery</td></tr>
<tr><td>All match</td><td>EXISTS + NOT EXISTS(... NOT test)</td></tr></table>`,
    realWorld: 'Claim scrubbers ("does this claim have any line missing a modifier?"), eligibility ("does the patient have any active coverage on the service date?"), audit flags on statements.',
    tryIt: {
      prompt: 'Add a flag late_paid: EXISTS a payment with payment_date > i.due_date.',
      starter: `SELECT i.invoice_id, i.due_date,
       EXISTS (SELECT 1 FROM payments pay WHERE pay.invoice_id = i.invoice_id) AS any_payment
FROM invoices i
ORDER BY i.invoice_id;`,
    },
    challenge: {
      level: 4,
      prompt: 'Find the invoices where EVERY charge was performed by a practitioner with specialty \'Physical Therapy\' (and the invoice has at least one charge). Show invoice_id and total_amount, ordered by invoice_id.',
      solution: `SELECT i.invoice_id, i.total_amount
FROM invoices i
WHERE EXISTS (SELECT 1 FROM charges c WHERE c.invoice_id = i.invoice_id)
  AND NOT EXISTS (
    SELECT 1
    FROM charges c
    JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
    WHERE c.invoice_id = i.invoice_id
      AND pr.specialty <> 'Physical Therapy'
  )
ORDER BY i.invoice_id;`,
      hints: ['Turn "every charge is PT" around: "there is no charge that is not PT".', 'That is a NOT EXISTS over charges JOIN practitioners with pr.specialty <> \'Physical Therapy\'.', 'An invoice with no charges passes that test too (invoice 37), so also require EXISTS any charge.', 'WHERE EXISTS (SELECT 1 FROM charges c WHERE c.invoice_id = i.invoice_id) AND NOT EXISTS (... AND pr.specialty <> \'Physical Therapy\') ORDER BY i.invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'How do you express "every charge on the invoice is Physical Therapy" with EXISTS?', options: ['EXISTS (PT charge)', 'NOT EXISTS (non-PT charge), plus at least one charge', 'COUNT(*) = 1', 'IN (PT practitioners)'], answer: 1, why: 'For-all is the negation of "some charge fails", plus guarding the empty set.' },
      { q: 'In SQLite, what does SELECT EXISTS (SELECT 1 FROM payments WHERE invoice_id = 1) return?', options: ['TRUE / FALSE text', '1 or 0', 'The payment row', 'NULL'], answer: 1, why: 'SQLite represents booleans as the integers 1 and 0.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 16
  {
    id: 'joins-16',
    goals: [
      'Logical join order (what you write) vs physical join order (what runs)',
      'Why the optimizer may reorder INNER joins but not OUTER joins',
      'How an index changes which table drives the loop',
      'How to read EXPLAIN QUERY PLAN for joins',
    ],
    concept: `<p>For <b>INNER</b> joins, the order you write the tables in has <b>no effect on the result</b>: <code>A JOIN B JOIN C</code> = <code>C JOIN A JOIN B</code>. The optimizer is free to pick the order it thinks is cheapest.</p>
<p>In SQLite each join is a nested loop, so "order" means <b>which table is the outer loop</b> (scanned) and which is the inner loop (looked up for each outer row). The ideal: filter the outer table down to few rows, and look up the inner table through an index.</p>
<p>In the example below, without an index on <code>charges(invoice_id)</code>, SQLite scans <b>charges</b> first and looks up each invoice by its primary key. Create the index and the plan flips: it scans <b>invoices</b> (filtered to Overdue) and <i>searches</i> charges through the new index.</p>
<p><b>OUTER</b> joins are different: <code>A LEFT JOIN B</code> must keep all of A, so A stays the outer loop, and moving tables around in a LEFT JOIN chain can change the result.</p>`,
    why: 'Understanding join order explains why the same query can take 5 ms or 5 minutes, and why indexes on foreign keys matter so much.',
    when: 'When a multi-table query is slow, when you read an EXPLAIN plan, or when you mix LEFT and INNER joins and need to know which rows are preserved.',
    analogy: 'To match 13 overdue invoices to their charge slips, you could read all 104 slips and check each one\'s invoice (scan charges), or take each of the 13 invoices and pull its slips from a folder tabbed by invoice number (the index). With the tabbed folder, starting from the invoices is much faster.',
    exampleSql: `SELECT status, COUNT(*) AS invoices FROM invoices GROUP BY status`,
    syntax: `EXPLAIN QUERY PLAN
SELECT ...
FROM a JOIN b ON b.a_id = a.id
WHERE a.col = ?;`,
    sql: `SELECT i.invoice_id, i.status, c.cpt_code, c.amount
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id
WHERE i.status = 'Overdue';`,
    breakdown: [
      ['FROM invoices i', 'Written first, but the optimizer decides which table becomes the outer loop.'],
      ['JOIN charges c ON c.invoice_id = i.invoice_id', 'Without an index on charges(invoice_id), only invoices can be looked up quickly (via its PK), so charges is scanned first.'],
      ['WHERE i.status = \'Overdue\'', 'A filter on invoices. Once charges(invoice_id) is indexed, it pays to scan invoices, keep the 13 overdue rows and probe charges.'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_charges_invoice ON charges(invoice_id)` },
    internals: `<p>SQLite's query planner (the "Next Generation Query Planner") estimates the cost of each candidate order: rows produced by the outer loop × cost of each inner lookup. A lookup by INTEGER PRIMARY KEY or an index costs about log(n); a lookup without an index costs a full scan (or an automatic index build). Other engines choose between nested loop, <b>hash join</b> (build a hash table on the smaller input, O(n + m)) and <b>merge join</b> (both inputs sorted on the key), and they also reorder. PostgreSQL searches orders exhaustively up to <code>join_collapse_limit</code> (8) tables, then uses a genetic algorithm.</p>`,
    mistakes: [
      { wrong: `SELECT l.location_name, COUNT(c.charge_id) AS charges
FROM treatment_locations l
LEFT JOIN invoices i ON i.location_id = l.location_id
JOIN charges c       ON c.invoice_id = i.invoice_id
GROUP BY l.location_id;`, why: 'Order matters for outer joins: the INNER JOIN evaluated after the LEFT JOIN removes location 6 (NULL invoice).', fix: `SELECT l.location_name, COUNT(c.charge_id) AS charges
FROM treatment_locations l
LEFT JOIN invoices i ON i.location_id = l.location_id
LEFT JOIN charges c  ON c.invoice_id = i.invoice_id
GROUP BY l.location_id;` },
      { wrong: `-- "I'll list the small table first so it runs faster"
SELECT c.amount, i.status
FROM invoices i CROSS JOIN charges c
WHERE c.invoice_id = i.invoice_id;`, why: 'In SQLite, CROSS JOIN is a special hint that forces the written order (the left table is always the outer loop). Use it only when you really know better than the planner. Usually you do not.', fix: `SELECT c.amount, i.status
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id;` },
    ],
    rules: [
      'INNER joins: the written order does not change the result, and the optimizer picks the physical order.',
      'OUTER joins: the order is part of the meaning.',
      'Best plan: filter the outer loop early, look up the inner loop by an index.',
      'Index foreign keys so the planner has cheap inner lookups in both directions.',
      'Read EXPLAIN QUERY PLAN: SCAN = full read, SEARCH = index lookup.',
    ],
    compare: `<table><tr><th>Plan line</th><th>Meaning</th></tr>
<tr><td><code>SCAN c</code></td><td>Read every row of charges (outer loop)</td></tr>
<tr><td><code>SEARCH i USING INTEGER PRIMARY KEY</code></td><td>Look up one invoice by id (inner loop)</td></tr>
<tr><td><code>SEARCH c USING INDEX idx_charges_invoice</code></td><td>Find an invoice's charges through the index</td></tr>
<tr><td><code>AUTOMATIC COVERING INDEX</code></td><td>SQLite built a temporary index for this query</td></tr></table>`,
    realWorld: 'Month-end billing reports that join millions of charges: adding the FK index flips the driving table and cuts the runtime from minutes to seconds.',
    tips: ['Write joins in a logical reading order for humans. The planner handles physical order for inner joins.'],
    deep: `<p>The number of possible join orders grows factorially (with 10 tables, 3.6 million left-deep orders), which is why planners rely on heuristics and statistics. SQLite collects statistics with <code>ANALYZE</code> (into <code>sqlite_stat1</code>). Stale or missing statistics are a common cause of bad join orders in every engine.</p>`,
    tryIt: {
      prompt: 'Run EXPLAIN QUERY PLAN, then create the index and run it again. Watch the SCAN/SEARCH lines swap tables.',
      starter: `EXPLAIN QUERY PLAN
SELECT i.invoice_id, c.amount
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id
WHERE i.status = 'Overdue';
-- then run:  CREATE INDEX idx_charges_invoice ON charges(invoice_id);`,
    },
    challenge: {
      level: 3,
      prompt: 'Starting FROM treatment_locations, list every location (location_id, location_name) with the number of charge lines billed there (0 for locations with none). Order by location_id. Choose the join types carefully.',
      solution: `SELECT l.location_id, l.location_name, COUNT(c.charge_id) AS charge_lines
FROM treatment_locations l
LEFT JOIN invoices i ON i.location_id = l.location_id
LEFT JOIN charges c  ON c.invoice_id = i.invoice_id
GROUP BY l.location_id, l.location_name
ORDER BY l.location_id;`,
      hints: ['Path: treatment_locations → invoices → charges.', 'Location 6 has no invoices, so it must survive both joins.', 'Both joins need to be LEFT JOINs; an INNER JOIN on charges would remove location 6.', 'COUNT(c.charge_id) ... GROUP BY l.location_id, l.location_name ORDER BY l.location_id'],
      ordered: true,
    },
    quiz: [
      { q: 'Does swapping the tables in an INNER JOIN change the result?', options: ['Yes', 'No, only possibly the physical plan', 'Only with NULLs', 'Only in SQLite'], answer: 1, why: 'INNER JOIN is commutative.' },
      { q: 'After CREATE INDEX idx_charges_invoice ON charges(invoice_id), why does SQLite switch to scanning invoices first?', options: ['Invoices is alphabetically first', 'It can now filter invoices to Overdue and probe charges cheaply through the index', 'Indexes force the written order', 'Charges became smaller'], answer: 1, why: 'A cheap inner lookup is now available on charges, so the filtered invoices table becomes the best outer loop.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 17
  {
    id: 'joins-17',
    goals: [
      'Why unindexed foreign keys make joins slow',
      'Nested loop vs hash vs merge join: when each wins',
      'Reading EXPLAIN QUERY PLAN before and after an index',
      'Practical checklist for fast joins',
    ],
    concept: `<p>Join cost is roughly <b>(rows in the outer loop) × (cost of one inner lookup)</b>. The inner lookup is where performance is won or lost:</p>
<ul>
<li><b>Index lookup</b>: a few page reads, O(log n). Fast.</li>
<li><b>No index</b>: scan the whole inner table for every outer row, O(n × m). Slow, although SQLite may build a temporary automatic index to save itself.</li>
</ul>
<p>Primary keys are always indexed; <b>foreign keys are not</b> (in SQLite, PostgreSQL and SQL Server). In our database, <code>charges.practitioner_id</code> has no index, so "charges for physical therapists" must scan all of charges. Add <code>CREATE INDEX idx_charges_practitioner ON charges(practitioner_id)</code> and the plan becomes: scan practitioners (filter by specialty) → <i>search</i> charges using the index.</p>`,
    why: 'Joins are the most expensive part of most queries. The right index turns a query that is quadratic in effect into one that is close to linear.',
    when: 'Designing tables (index every FK you join on), tuning slow reports, reading execution plans.',
    analogy: 'Finding each physical therapist\'s charge slips by reading the whole slip box for every therapist is slow. A box with dividers labeled by practitioner (an index) lets you flip straight to the right section.',
    exampleSql: `SELECT practitioner_id, last_name, specialty FROM practitioners WHERE specialty = 'Physical Therapy'`,
    syntax: `CREATE INDEX idx_child_fk ON child(parent_id);
EXPLAIN QUERY PLAN SELECT ... FROM parent JOIN child ON child.parent_id = parent.id WHERE parent.col = ?;`,
    sql: `SELECT pr.last_name, c.service_date, c.cpt_code, c.amount
FROM practitioners pr
JOIN charges c ON c.practitioner_id = pr.practitioner_id
WHERE pr.specialty = 'Physical Therapy';`,
    breakdown: [
      ['FROM practitioners pr', '12 rows; the filter keeps 2 physical therapists.'],
      ['JOIN charges c ON c.practitioner_id = pr.practitioner_id', 'Without an index on charges.practitioner_id, SQLite scans all 104 charges and looks up each practitioner by PK.'],
      ['WHERE pr.specialty = \'Physical Therapy\'', 'With the index, SQLite scans practitioners, keeps 2, and does 2 index searches into charges.'],
    ],
    visual: { type: 'explain', index: `CREATE INDEX idx_charges_practitioner ON charges(practitioner_id)` },
    internals: `<p><b>Nested loop join</b>: for each outer row, look up the inner side. Best when the outer side is small and the inner side is indexed. This is SQLite's only algorithm. <b>Hash join</b>: build an in-memory hash table on the smaller input's join key, then stream the larger input and probe. O(n + m), no index needed, equality only; the default for big analytic joins in PostgreSQL, SQL Server, Oracle and MySQL 8+. <b>Merge join</b>: sort both inputs on the key (or read them in order from indexes) and walk them together like a zipper. Great when both sides are already sorted, and it supports range conditions. Planners pick one per join based on the estimated row counts.</p>`,
    mistakes: [
      { wrong: `SELECT pr.last_name, c.amount
FROM practitioners pr
JOIN charges c ON CAST(c.practitioner_id AS TEXT) = CAST(pr.practitioner_id AS TEXT)
WHERE pr.specialty = 'Physical Therapy';`, why: 'Wrapping the join column in a function or cast hides it from the index, so the planner cannot use idx_charges_practitioner and falls back to scanning.', fix: `SELECT pr.last_name, c.amount
FROM practitioners pr
JOIN charges c ON c.practitioner_id = pr.practitioner_id
WHERE pr.specialty = 'Physical Therapy';` },
      { wrong: `SELECT *
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id
JOIN payments pay ON pay.invoice_id = i.invoice_id;`, why: 'SELECT * across a fan-out join moves every column of every multiplied row. It is slow and usually also logically wrong (charges × payments).', fix: `SELECT i.invoice_id, i.total_amount, c.cpt_code, c.amount
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id;` },
    ],
    rules: [
      'Index every foreign key you join on (child side).',
      'Keep join columns bare: no functions or casts, and matching types.',
      'Filter early and select only the columns you need.',
      'Check EXPLAIN: aim for SEARCH ... USING INDEX on the inner side.',
      'Composite index (fk, filter_col) when you often filter the child as well.',
    ],
    compare: `<table><tr><th>Algorithm</th><th>Best for</th><th>Needs</th></tr>
<tr><td>Nested loop</td><td>small outer input, indexed inner</td><td>an index on the inner key</td></tr>
<tr><td>Hash join</td><td>large unsorted inputs, equality</td><td>memory for the build side</td></tr>
<tr><td>Merge join</td><td>inputs already sorted on the key</td><td>sorted input (index or sort)</td></tr></table>`,
    realWorld: 'Clearinghouse and EHR databases index charges(invoice_id), charges(practitioner_id), payments(invoice_id) and transactions(invoice_id). Missing one of these is the classic reason a nightly A/R job overruns.',
    tips: ['In SQLite, "AUTOMATIC COVERING INDEX" in a plan means you are missing an index. SQLite is building one for every run.'],
    deep: `<p>A <b>covering index</b> includes every column the query needs from that table, so the engine never visits the table itself: <code>CREATE INDEX ... ON charges(practitioner_id, amount)</code> answers "SUM(amount) per practitioner" from the index alone. Index-only joins and "index nested loops" are why OLTP billing systems stay fast on tables with hundreds of millions of rows.</p>`,
    tryIt: {
      prompt: 'Look at the plan, create the index, and look again. Then try a covering index on charges(practitioner_id, amount) with a SUM(c.amount) query.',
      starter: `EXPLAIN QUERY PLAN
SELECT pr.last_name, c.amount
FROM practitioners pr
JOIN charges c ON c.practitioner_id = pr.practitioner_id
WHERE pr.specialty = 'Physical Therapy';
-- then:  CREATE INDEX idx_charges_practitioner ON charges(practitioner_id);`,
    },
    challenge: {
      level: 2,
      prompt: 'For each Physical Therapy practitioner, return last_name, the number of charges and the total billed amount. Order by total billed descending.',
      solution: `SELECT pr.last_name, COUNT(c.charge_id) AS charges, SUM(c.amount) AS billed
FROM practitioners pr
JOIN charges c ON c.practitioner_id = pr.practitioner_id
WHERE pr.specialty = 'Physical Therapy'
GROUP BY pr.practitioner_id, pr.last_name
ORDER BY billed DESC;`,
      hints: ['Join practitioners to charges on practitioner_id.', 'Filter with WHERE pr.specialty = \'Physical Therapy\'.', 'GROUP BY pr.practitioner_id, pr.last_name and use COUNT and SUM.', 'ORDER BY billed DESC'],
      ordered: true,
    },
    quiz: [
      { q: 'Which columns are indexed automatically in SQLite?', options: ['All foreign keys', 'Primary keys (and UNIQUE columns)', 'Every column', 'None'], answer: 1, why: 'Foreign keys need an explicit CREATE INDEX.' },
      { q: 'Which join algorithm builds an in-memory table on one input and probes it with the other?', options: ['Nested loop', 'Hash join', 'Merge join', 'Cross join'], answer: 1, why: 'The hash join builds on the smaller input and probes with the larger.' },
      { q: 'Why does ON CAST(c.practitioner_id AS TEXT) = ... hurt performance?', options: ['CAST is slow', 'The index on practitioner_id cannot be used on an expression', 'It changes the results', 'It does not'], answer: 1, why: 'Indexes store raw column values; an expression on the column cannot be looked up in them.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 18
  {
    id: 'joins-18',
    dialect: 'postgres',
    goals: [
      'What LATERAL does: a subquery that can see the current outer row',
      'Top-N per group (latest 2 invoices per patient)',
      'CROSS APPLY / OUTER APPLY in SQL Server',
      'SQLite emulations: window functions and correlated subqueries',
    ],
    concept: `<p>A normal subquery in FROM cannot refer to other tables in the same FROM clause. <b>LATERAL</b> removes that restriction: the subquery runs <b>once per outer row</b> and can use that row's columns, like a <code>for each</code> loop.</p>
<p>That makes "top-N per group" easy: for each patient, <code>SELECT ... FROM invoices WHERE patient_id = p.patient_id ORDER BY invoice_date DESC LIMIT 2</code>.</p>
<ul>
<li><b>PostgreSQL / MySQL 8.0.14+</b>: <code>CROSS JOIN LATERAL (...)</code> (drops outer rows with no result) or <code>LEFT JOIN LATERAL (...) ON true</code> (keeps them).</li>
<li><b>SQL Server / Oracle 12c+</b>: <code>CROSS APPLY</code> / <code>OUTER APPLY</code>.</li>
<li><b>SQLite</b>: no LATERAL. Use <code>ROW_NUMBER() OVER (PARTITION BY ...)</code> and filter on rn ≤ N, or a correlated scalar subquery when you need one value.</li>
</ul>`,
    why: 'Some questions are naturally "for each row, run this small query": latest N items, the best match, or a function that returns rows. LATERAL expresses that directly.',
    when: 'Top-N per group, "latest payment per invoice", calling set-returning functions per row (unnest, json_each), and reusing computed columns in later expressions.',
    analogy: 'For each patient folder on the desk, the clerk opens the invoice drawer and pulls only that patient\'s two most recent bills. The instruction ("the two latest for this patient") changes with every folder, and LATERAL is what lets the query say that.',
    exampleSql: `SELECT patient_id, invoice_id, invoice_date, total_amount FROM invoices WHERE patient_id IN (1, 2) ORDER BY patient_id, invoice_date DESC`,
    syntax: `SELECT o.*, x.*
FROM outer_table o
CROSS JOIN LATERAL (
  SELECT ... FROM inner_table i
  WHERE i.outer_id = o.id
  ORDER BY ... LIMIT n
) AS x;`,
    sql: `SELECT p.patient_id, p.last_name, recent.invoice_id, recent.invoice_date, recent.total_amount
FROM patients p
CROSS JOIN LATERAL (
  SELECT i.invoice_id, i.invoice_date, i.total_amount
  FROM invoices i
  WHERE i.patient_id = p.patient_id
  ORDER BY i.invoice_date DESC
  LIMIT 2
) AS recent
ORDER BY p.patient_id, recent.invoice_date DESC;`,
    dialectSql: {
      postgres: `SELECT p.patient_id, p.last_name, recent.invoice_id, recent.invoice_date, recent.total_amount
FROM patients p
CROSS JOIN LATERAL (
  SELECT i.invoice_id, i.invoice_date, i.total_amount
  FROM invoices i
  WHERE i.patient_id = p.patient_id
  ORDER BY i.invoice_date DESC
  LIMIT 2
) AS recent
ORDER BY p.patient_id, recent.invoice_date DESC;`,
      sqlserver: `SELECT p.patient_id, p.last_name, recent.invoice_id, recent.invoice_date, recent.total_amount
FROM patients p
CROSS APPLY (
  SELECT TOP (2) i.invoice_id, i.invoice_date, i.total_amount
  FROM invoices i
  WHERE i.patient_id = p.patient_id
  ORDER BY i.invoice_date DESC
) AS recent
ORDER BY p.patient_id, recent.invoice_date DESC;`,
      mysql: `SELECT p.patient_id, p.last_name, recent.invoice_id, recent.invoice_date, recent.total_amount
FROM patients p
JOIN LATERAL (
  SELECT i.invoice_id, i.invoice_date, i.total_amount
  FROM invoices i
  WHERE i.patient_id = p.patient_id
  ORDER BY i.invoice_date DESC
  LIMIT 2
) AS recent ON TRUE
ORDER BY p.patient_id, recent.invoice_date DESC;`,
      sqlite: `-- SQLite has no LATERAL: rank inside each patient, keep rn <= 2
WITH ranked AS (
  SELECT i.*, ROW_NUMBER() OVER (PARTITION BY i.patient_id ORDER BY i.invoice_date DESC) AS rn
  FROM invoices i
)
SELECT p.patient_id, p.last_name, r.invoice_id, r.invoice_date, r.total_amount
FROM patients p
JOIN ranked r ON r.patient_id = p.patient_id AND r.rn <= 2
ORDER BY p.patient_id, r.invoice_date DESC;`,
    },
    breakdown: [
      ['FROM patients p', 'The outer loop: one patient at a time.'],
      ['CROSS JOIN LATERAL (', 'Run the following subquery once for each patient row.'],
      ['WHERE i.patient_id = p.patient_id', 'The subquery can see p, which is exactly what LATERAL allows.'],
      ['ORDER BY i.invoice_date DESC LIMIT 2', 'Per patient: the 2 most recent invoices.'],
      [') AS recent', 'The result rows are joined to their patient. CROSS drops patients with no invoices; LEFT JOIN LATERAL ... ON true would keep them.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 620 200" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="13">
<text x="90" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">patients (outer row)</text>
<text x="400" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">LATERAL subquery runs per row</text>
<rect x="10" y="35" width="160" height="30" rx="5" fill="var(--panel2)" stroke="var(--accent)"/><text x="20" y="55" fill="var(--text)">patient 1 Garcia</text>
<rect x="10" y="85" width="160" height="30" rx="5" fill="var(--panel2)" stroke="var(--accent)"/><text x="20" y="105" fill="var(--text)">patient 2 Smith</text>
<rect x="10" y="135" width="160" height="30" rx="5" fill="var(--panel2)" stroke="var(--red)"/><text x="20" y="155" fill="var(--text)">patient 9 Martin</text>
<rect x="250" y="35" width="330" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="260" y="55" fill="var(--text)">invoices WHERE patient_id = 1 … LIMIT 2 → 2 rows</text>
<rect x="250" y="85" width="330" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="260" y="105" fill="var(--text)">invoices WHERE patient_id = 2 … LIMIT 2 → 2 rows</text>
<rect x="250" y="135" width="330" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="260" y="155" fill="var(--red)">invoices WHERE patient_id = 9 … → 0 rows</text>
<line x1="170" y1="50" x2="250" y2="50" stroke="var(--accent)" stroke-width="2"/>
<line x1="170" y1="100" x2="250" y2="100" stroke="var(--accent)" stroke-width="2"/>
<line x1="170" y1="150" x2="250" y2="150" stroke="var(--red)" stroke-width="2" stroke-dasharray="4 3"/>
<text x="310" y="190" text-anchor="middle" fill="var(--muted)">CROSS JOIN LATERAL drops patient 9 · LEFT JOIN LATERAL ... ON true keeps it with NULLs</text>
</svg>` },
    internals: `<p>A LATERAL join is executed as a <b>nested loop</b> by definition: the inner subquery is parameterized by the outer row. With an index on <code>invoices(patient_id, invoice_date)</code>, each iteration is an index range scan that stops after 2 rows, which is extremely efficient when the groups are large. The window-function emulation instead ranks <i>every</i> invoice and then filters, which is better when you need most of the rows anyway. Optimizers sometimes decorrelate simple LATERAL subqueries into ordinary joins.</p>`,
    mistakes: [
      { wrong: `SELECT p.patient_id, recent.invoice_id
FROM patients p
JOIN (SELECT invoice_id FROM invoices i
      WHERE i.patient_id = p.patient_id
      ORDER BY invoice_date DESC LIMIT 2) recent ON TRUE;`, why: 'Without the LATERAL keyword, a derived table cannot reference p. PostgreSQL reports an invalid reference to table "p".', fix: `SELECT p.patient_id, recent.invoice_id
FROM patients p
JOIN LATERAL (SELECT invoice_id FROM invoices i
      WHERE i.patient_id = p.patient_id
      ORDER BY invoice_date DESC LIMIT 2) recent ON TRUE;` },
      { wrong: `SELECT p.patient_id, recent.invoice_id
FROM patients p
CROSS JOIN LATERAL (SELECT invoice_id FROM invoices i
                    WHERE i.patient_id = p.patient_id LIMIT 1) recent;`, why: 'LIMIT without ORDER BY returns an arbitrary invoice, not the latest. Unbilled patients also vanish because this is a CROSS join.', fix: `SELECT p.patient_id, recent.invoice_id
FROM patients p
LEFT JOIN LATERAL (SELECT invoice_id FROM invoices i
                   WHERE i.patient_id = p.patient_id
                   ORDER BY invoice_date DESC LIMIT 1) recent ON TRUE;` },
    ],
    rules: [
      'LATERAL = a subquery that can reference earlier FROM items; it runs per outer row.',
      'CROSS JOIN LATERAL ≈ CROSS APPLY (drops empty results); LEFT JOIN LATERAL ... ON TRUE ≈ OUTER APPLY.',
      'Always ORDER BY with LIMIT / TOP inside.',
      'SQLite: ROW_NUMBER() OVER (PARTITION BY ...) plus a filter, or a correlated scalar subquery.',
    ],
    compare: `<table><tr><th>Need</th><th>Postgres</th><th>SQL Server</th><th>SQLite</th></tr>
<tr><td>Top N per group</td><td>JOIN LATERAL ... LIMIT n</td><td>CROSS APPLY TOP (n)</td><td>ROW_NUMBER + rn ≤ n</td></tr>
<tr><td>Latest single value</td><td>LATERAL or a scalar subquery</td><td>OUTER APPLY TOP (1)</td><td>correlated scalar subquery</td></tr>
<tr><td>Keep empty groups</td><td>LEFT JOIN LATERAL ... ON TRUE</td><td>OUTER APPLY</td><td>LEFT JOIN ranked ... AND rn ≤ n</td></tr></table>`,
    realWorld: 'Patient summaries showing the last 3 visits, the most recent remittance per claim, the latest eligibility check per patient, and expanding JSON arrays of claim lines per row.',
    tryIt: {
      prompt: 'SQLite emulation: change rn <= 2 to rn = 1 for the single most recent invoice, and switch JOIN to LEFT JOIN to keep patients with no invoices.',
      starter: `WITH ranked AS (
  SELECT i.patient_id, i.invoice_id, i.invoice_date, i.total_amount,
         ROW_NUMBER() OVER (PARTITION BY i.patient_id ORDER BY i.invoice_date DESC, i.invoice_id DESC) AS rn
  FROM invoices i
)
SELECT p.patient_id, p.last_name, r.invoice_id, r.invoice_date, r.total_amount
FROM patients p
JOIN ranked r ON r.patient_id = p.patient_id AND r.rn <= 2
ORDER BY p.patient_id, r.invoice_date DESC;`,
    },
    challenge: {
      level: 3,
      prompt: 'SQLite has no LATERAL. For EVERY patient, show patient_id, last_name and the invoice_date of their most recent invoice (NULL if none), using a correlated subquery or a window function. Order by patient_id.',
      solution: `SELECT p.patient_id,
       p.last_name,
       (SELECT i.invoice_date
        FROM invoices i
        WHERE i.patient_id = p.patient_id
        ORDER BY i.invoice_date DESC
        LIMIT 1) AS last_invoice_date
FROM patients p
ORDER BY p.patient_id;`,
      hints: ['You want one value per patient, and all patients must be kept.', 'A scalar subquery in SELECT can reference p, just like LATERAL can.', 'Inside it: FROM invoices i WHERE i.patient_id = p.patient_id ORDER BY i.invoice_date DESC LIMIT 1.', 'SELECT p.patient_id, p.last_name, (SELECT i.invoice_date FROM invoices i WHERE ... ORDER BY ... LIMIT 1) FROM patients p ORDER BY p.patient_id'],
      ordered: true,
    },
    quiz: [
      { q: 'What does LATERAL allow a FROM-clause subquery to do?', options: ['Run in parallel', 'Reference columns of tables listed before it', 'Skip the WHERE clause', 'Return only one row'], answer: 1, why: 'That is the entire point: a per-row, correlated derived table.' },
      { q: 'What is the SQL Server equivalent of LEFT JOIN LATERAL ... ON TRUE?', options: ['CROSS APPLY', 'OUTER APPLY', 'FULL JOIN', 'MERGE'], answer: 1, why: 'OUTER APPLY keeps outer rows whose inner result is empty.' },
      { q: 'How do you get "top 2 invoices per patient" in SQLite?', options: ['LATERAL', 'CROSS APPLY', 'ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY ...) and rn <= 2', 'GROUP BY patient_id LIMIT 2'], answer: 2, why: 'Window ranking per partition, then filter.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 19
  {
    id: 'joins-19',
    goals: [
      'When a JOIN and a subquery give the same answer',
      'When they differ (duplicates, NULLs, columns you need)',
      'Choosing based on the question: do you need columns from the other table?',
    ],
    concept: `<p>Many questions can be answered either with a JOIN or with a subquery. The quick guide:</p>
<ul>
<li>Need <b>columns</b> from the other table in the output? → <b>JOIN</b>.</li>
<li>Only need to <b>filter</b> by the other table? → subquery (<code>IN</code> / <code>EXISTS</code>). No duplicates, and it reads clearly.</li>
<li>Need <b>one aggregated value</b> per row (e.g. total paid)? → a <b>scalar subquery</b> in SELECT, or JOIN a pre-aggregated derived table. Both avoid fan-out.</li>
<li>Comparing a row with an <b>aggregate of its group</b> (invoice vs its location's average)? → JOIN a grouped derived table, or use a correlated subquery.</li>
</ul>
<p>Modern optimizers often turn one form into the other, so choose for <b>correctness and clarity</b> first.</p>`,
    why: 'Picking the wrong form causes subtle bugs: duplicates from joins, NULL surprises from NOT IN, or a slow correlated subquery that re-runs for every row.',
    when: 'Every time you combine tables. Ask: "do I need their columns, or just to know about them?"',
    analogy: 'If you need the doctor\'s name printed on the bill, you pull the doctor\'s file (JOIN). If you only need to know whether a doctor signed it, a quick yes/no check is enough (subquery).',
    exampleSql: `SELECT location_id, COUNT(*) AS invoices, ROUND(AVG(total_amount), 2) AS avg_total FROM invoices GROUP BY location_id`,
    syntax: `-- JOIN to a derived table
SELECT a.*, g.metric
FROM a JOIN (SELECT key, AGG(x) AS metric FROM b GROUP BY key) g ON g.key = a.key;
-- correlated scalar subquery
SELECT a.*, (SELECT AGG(x) FROM b WHERE b.key = a.key) AS metric FROM a;`,
    sql: `SELECT i.invoice_id,
       i.location_id,
       i.total_amount,
       ROUND(loc.avg_total, 2) AS location_avg
FROM invoices i
JOIN (
  SELECT location_id, AVG(total_amount) AS avg_total
  FROM invoices
  GROUP BY location_id
) AS loc ON loc.location_id = i.location_id
WHERE i.total_amount > loc.avg_total
ORDER BY i.location_id, i.total_amount DESC;`,
    breakdown: [
      ['JOIN ( SELECT location_id, AVG(total_amount) ... GROUP BY location_id ) AS loc', 'A derived table: one row per location with its average invoice.'],
      ['ON loc.location_id = i.location_id', 'Attach each invoice to its location\'s average (many-to-one, no fan-out).'],
      ['WHERE i.total_amount > loc.avg_total', 'Keep invoices above their own location\'s average.'],
      ['ROUND(loc.avg_total, 2) AS location_avg', 'The JOIN makes the average available for display, which a WHERE subquery could not do.'],
    ],
    visual: { type: 'correlated' },
    internals: `<p>A correlated subquery is logically re-evaluated for every outer row. SQLite executes it that way, but it caches results for repeated correlation values, and an index on the correlated column keeps each run cheap. The derived-table JOIN computes all averages <b>once</b> (one pass plus grouping) and then joins. Engines such as PostgreSQL and SQL Server "decorrelate" many subqueries into joins automatically, so the two forms often end up with the same plan.</p>`,
    mistakes: [
      { wrong: `SELECT DISTINCT p.patient_id, p.last_name
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id
WHERE i.status = 'Paid';`, why: 'Using JOIN + DISTINCT just to filter. It works, but it builds duplicates and then removes them, and DISTINCT would also merge genuinely identical output rows.', fix: `SELECT p.patient_id, p.last_name
FROM patients p
WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id AND i.status = 'Paid');` },
      { wrong: `SELECT i.invoice_id,
       (SELECT amount FROM payments pay WHERE pay.invoice_id = i.invoice_id) AS paid
FROM invoices i;`, why: 'A scalar subquery must return one value. Invoice 1 has 2 payments. SQLite silently takes the first; other databases raise an error. Aggregate inside the subquery.', fix: `SELECT i.invoice_id,
       (SELECT SUM(amount) FROM payments pay WHERE pay.invoice_id = i.invoice_id) AS paid
FROM invoices i;` },
    ],
    rules: [
      'Need their columns → JOIN. Only need to filter → EXISTS / IN.',
      'Per-row aggregate → scalar subquery or JOIN a pre-aggregated derived table.',
      'Scalar subqueries must return at most one row: aggregate or use LIMIT 1 with ORDER BY.',
      'Pick the clearer form first; check EXPLAIN if performance matters.',
    ],
    compare: `<table><tr><th>Task</th><th>JOIN</th><th>Subquery</th></tr>
<tr><td>Show payor name on invoice</td><td>✔ natural</td><td>scalar subquery, clumsy</td></tr>
<tr><td>Patients having any overdue</td><td>needs DISTINCT</td><td>✔ EXISTS</td></tr>
<tr><td>Invoice vs its location average</td><td>✔ derived table</td><td>✔ correlated</td></tr>
<tr><td>Total paid per invoice</td><td>✔ pre-aggregated join</td><td>✔ scalar SUM</td></tr></table>`,
    realWorld: 'Outlier detection (charges above the CPT average), variance-to-benchmark reports per location, flagging invoices above a payor\'s typical amount.',
    tryIt: {
      prompt: 'Rewrite the example with a correlated subquery in WHERE: WHERE i.total_amount > (SELECT AVG(total_amount) FROM invoices x WHERE x.location_id = i.location_id). Do you get the same rows?',
      starter: `SELECT i.invoice_id, i.location_id, i.total_amount
FROM invoices i
WHERE i.total_amount > (SELECT AVG(x.total_amount) FROM invoices x WHERE x.location_id = i.location_id)
ORDER BY i.location_id, i.total_amount DESC;`,
    },
    challenge: {
      level: 3,
      prompt: 'Find charges whose amount is higher than the average amount for the same cpt_code. Show charge_id, cpt_code, amount and the CPT average rounded to 2 decimals. Order by cpt_code, then charge_id.',
      solution: `SELECT c.charge_id, c.cpt_code, c.amount, ROUND(a.avg_amount, 2) AS cpt_avg
FROM charges c
JOIN (SELECT cpt_code, AVG(amount) AS avg_amount FROM charges GROUP BY cpt_code) a
  ON a.cpt_code = c.cpt_code
WHERE c.amount > a.avg_amount
ORDER BY c.cpt_code, c.charge_id;`,
      hints: ['First compute AVG(amount) per cpt_code in a derived table.', 'JOIN charges to it ON cpt_code.', 'Filter with WHERE c.amount > a.avg_amount.', 'Select c.charge_id, c.cpt_code, c.amount, ROUND(a.avg_amount, 2) and ORDER BY c.cpt_code, c.charge_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'You need the payor_name printed next to each invoice. Best choice?', options: ['EXISTS', 'IN', 'JOIN', 'NOT EXISTS'], answer: 2, why: 'You need columns from payors, so JOIN.' },
      { q: 'What goes wrong with (SELECT amount FROM payments WHERE invoice_id = i.invoice_id) when an invoice has 2 payments?', options: ['Nothing', 'It returns more than one value: an error in most databases, an arbitrary row in SQLite', 'It returns NULL', 'It sums them'], answer: 1, why: 'Scalar subqueries must return at most one row; aggregate them.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────── 20
  {
    id: 'joins-20',
    goals: [
      'JOIN vs EXISTS: the same filter, different row counts',
      'Why EXISTS never duplicates and can stop early',
      'NOT EXISTS vs LEFT JOIN / IS NULL vs NOT IN',
      'A decision checklist',
    ],
    concept: `<p>"Which payors have been paid by EFT?" can be written two ways:</p>
<ul>
<li><b>JOIN</b>: <code>payors JOIN payments ON ... WHERE method = 'EFT'</code> gives one row <b>per EFT payment</b>, so each payor repeats.</li>
<li><b>EXISTS</b>: <code>payors WHERE EXISTS (EFT payment for this payor)</code> gives one row <b>per payor</b>.</li>
</ul>
<p>The JOIN answers "list the EFT payments with their payor"; EXISTS answers "which payors qualify". Adding DISTINCT to the JOIN makes the rows look the same, but it does more work and hides the intent.</p>
<p>For the negative case, <b>NOT EXISTS</b> and <b>LEFT JOIN ... IS NULL</b> are equivalent and NULL-safe, while <b>NOT IN</b> breaks when the subquery contains a NULL.</p>`,
    why: 'Choosing correctly avoids duplicated rows, wrong counts and wasted work, and makes the query say what you mean.',
    when: 'Every time a second table is used only to decide whether a row qualifies.',
    analogy: 'Asking "which insurers sent us an EFT?" should give a short list of insurers, not a printout of every EFT remittance with the insurer\'s name repeated on each line.',
    exampleSql: `SELECT payment_id, invoice_id, payor_id, method, amount FROM payments WHERE method = 'EFT' ORDER BY payor_id LIMIT 12`,
    syntax: `-- rows of A that have a B (each A once)
SELECT a.* FROM a WHERE EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id);
-- A rows combined with each B
SELECT a.*, b.* FROM a JOIN b ON b.a_id = a.id;`,
    sql: `SELECT 'JOIN' AS approach, COUNT(*) AS rows_returned
FROM payors py
JOIN payments pay ON pay.payor_id = py.payor_id
WHERE pay.method = 'EFT'
UNION ALL
SELECT 'EXISTS', COUNT(*)
FROM payors py
WHERE EXISTS (SELECT 1 FROM payments pay
              WHERE pay.payor_id = py.payor_id AND pay.method = 'EFT');`,
    breakdown: [
      ['FROM payors py JOIN payments pay ... WHERE pay.method = \'EFT\'', 'One row per EFT payment: payors repeat.'],
      ['UNION ALL', 'Stack both counts so you can compare them.'],
      ['FROM payors py WHERE EXISTS (...)', 'One row per payor that has at least one EFT payment.'],
      ['COUNT(*)', 'The two numbers differ. That difference is the fan-out.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 620 170" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="13">
<text x="150" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">JOIN: one row per match</text>
<text x="470" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">EXISTS: one row per payor</text>
<rect x="30" y="35" width="240" height="24" rx="4" fill="var(--panel2)" stroke="var(--yellow)"/><text x="40" y="52" fill="var(--text)">Aetna · EFT payment #1</text>
<rect x="30" y="63" width="240" height="24" rx="4" fill="var(--panel2)" stroke="var(--yellow)"/><text x="40" y="80" fill="var(--text)">Aetna · EFT payment #2</text>
<rect x="30" y="91" width="240" height="24" rx="4" fill="var(--panel2)" stroke="var(--yellow)"/><text x="40" y="108" fill="var(--text)">Aetna · EFT payment #3</text>
<rect x="30" y="119" width="240" height="24" rx="4" fill="var(--panel2)" stroke="var(--border)"/><text x="40" y="136" fill="var(--text)">Medicare · EFT payment #1</text>
<rect x="350" y="35" width="240" height="24" rx="4" fill="var(--panel2)" stroke="var(--green)"/><text x="360" y="52" fill="var(--text)">Aetna ✔ (stops at first EFT)</text>
<rect x="350" y="63" width="240" height="24" rx="4" fill="var(--panel2)" stroke="var(--green)"/><text x="360" y="80" fill="var(--text)">Medicare ✔</text>
<text x="310" y="163" text-anchor="middle" fill="var(--muted)">Same question, different grain: JOIN repeats the payor; EXISTS keeps each payor once</text>
</svg>` },
    internals: `<p>A JOIN must produce every matching pair. An EXISTS (semi-join) can <b>stop at the first match</b> for each outer row, which is a real saving when a payor has thousands of payments. Most optimizers turn EXISTS and IN into semi-join operators (hash semi-join, nested-loop semi-join), and NOT EXISTS and LEFT JOIN/IS NULL into anti-join operators, so those two usually get identical plans. NOT IN often cannot become an anti-join, because its NULL semantics differ.</p>`,
    mistakes: [
      { wrong: `SELECT py.payor_name
FROM payors py
JOIN payments pay ON pay.payor_id = py.payor_id
WHERE pay.method = 'EFT';`, why: 'Returns the payor name once per EFT payment. If you meant "which payors", this is duplicated output, and a COUNT over it would be wrong.', fix: `SELECT py.payor_name
FROM payors py
WHERE EXISTS (SELECT 1 FROM payments pay
              WHERE pay.payor_id = py.payor_id AND pay.method = 'EFT');` },
      { wrong: `SELECT py.payor_name
FROM payors py
WHERE py.payor_id NOT IN (SELECT payor_id FROM payments);`, why: 'payments.payor_id is NULL for patient-paid payments, so NOT IN returns no rows at all.', fix: `SELECT py.payor_name
FROM payors py
WHERE NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.payor_id = py.payor_id);` },
    ],
    rules: [
      'Filter only → EXISTS. Need the other table\'s columns or one row per match → JOIN.',
      'JOIN + DISTINCT to fake a semi-join is a code smell.',
      'Negative filter → NOT EXISTS (or LEFT JOIN ... IS NULL), never NOT IN on a nullable column.',
      'EXISTS stops at the first match; a JOIN produces them all.',
    ],
    compare: `<table><tr><th></th><th>JOIN</th><th>EXISTS</th><th>IN</th><th>NOT EXISTS</th><th>NOT IN</th></tr>
<tr><td>Duplicates outer rows</td><td>yes</td><td>no</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Other table's columns</td><td>yes</td><td>no</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>NULL-safe</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td><td><b>no</b></td></tr>
<tr><td>Stops at first match</td><td>no</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td></tr></table>`,
    realWorld: 'Payor scorecards (payors that paid electronically), provider eligibility lists, and compliance checks ("patients with any charge but no consent on file").',
    tips: ['If you find yourself writing SELECT DISTINCT after a JOIN, ask whether EXISTS says what you mean.'],
    tryIt: {
      prompt: 'Change the JOIN version to SELECT DISTINCT py.payor_name and compare it with the EXISTS version. Then write the payors that have NEVER received any payment, with NOT EXISTS.',
      starter: `SELECT py.payor_name
FROM payors py
JOIN payments pay ON pay.payor_id = py.payor_id
WHERE pay.method = 'EFT'
ORDER BY py.payor_name;`,
    },
    challenge: {
      level: 3,
      prompt: 'List the payors (payor_id, payor_name) that have paid at least one invoice by EFT but have NEVER paid by Check. Each payor once, ordered by payor_id.',
      solution: `SELECT py.payor_id, py.payor_name
FROM payors py
WHERE EXISTS (SELECT 1 FROM payments pay WHERE pay.payor_id = py.payor_id AND pay.method = 'EFT')
  AND NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.payor_id = py.payor_id AND pay.method = 'Check')
ORDER BY py.payor_id;`,
      hints: ['There are two conditions: "has an EFT payment" and "has no Check payment".', 'The first is a semi-join (EXISTS), the second an anti-join (NOT EXISTS).', 'Both subqueries are correlated on pay.payor_id = py.payor_id with a method filter.', 'WHERE EXISTS (... method = \'EFT\') AND NOT EXISTS (... method = \'Check\') ORDER BY py.payor_id'],
      ordered: true,
    },
    quiz: [
      { q: 'A payor has 5 EFT payments. How many rows does it produce with JOIN and with EXISTS?', options: ['5 and 5', '1 and 1', '5 and 1', '1 and 5'], answer: 2, why: 'JOIN gives one row per match; EXISTS gives one per outer row.' },
      { q: 'Which pair is usually executed with the same anti-join plan?', options: ['NOT IN and JOIN', 'NOT EXISTS and LEFT JOIN ... IS NULL', 'EXISTS and CROSS JOIN', 'IN and FULL JOIN'], answer: 1, why: 'Both are NULL-safe anti-joins; optimizers treat them identically.' },
    ],
  },
  // ---------------------------------------------------------------- 21
  {
    id: 'joins-21',
    goals: [
      'What a non-equi (range) join is: ON with <, >, BETWEEN instead of =',
      'Match invoices to the contract period that covers their date',
      'Bucket values into bands (aging buckets, amount tiers) with a band join',
      'Avoid overlaps, gaps and double counting at band boundaries',
      'Know why range joins can be slow and how to help them',
    ],
    concept: `<p>Most joins match equal keys: <code>ON i.patient_id = p.patient_id</code>. A <b>non-equi join</b> uses any other comparison in the ON clause. The most common kind is a <b>range join</b>: a row matches when its value falls <b>inside a range</b> stored in the other table.</p>
<pre>JOIN contract_periods cp
  ON cp.payor_id = i.payor_id                                 -- equality part
 AND i.invoice_date BETWEEN cp.period_start AND cp.period_end  -- range part</pre>
<p>Typical uses in billing:</p>
<ul>
<li><b>Effective-dated lookups</b>: the contract rate, fee schedule or price valid on the service date.</li>
<li><b>Bucketing / band joins</b>: put each invoice into an aging bucket (0-30, 31-60 days...) or an amount tier using a small table of bands.</li>
<li><b>Date-range matching</b>: payments received within 30 days of the invoice, visits during an insurance coverage window.</li>
</ul>
<p>The key requirement: ranges in the lookup table must <b>not overlap</b> (or a row matches twice) and should <b>not have gaps</b> (or a row matches nothing and disappears from an inner join).</p>`,
    why: 'Business rules are often defined by ranges, not exact values: contracts by period, aging by day ranges, fee tiers by amount. A range join applies those rules in one set-based step instead of long CASE expressions or per-row lookups.',
    when: 'Use it when the lookup key is a range (dates, amounts, ages), when bands change often enough to live in a table, and when you need "the version valid at that time".',
    analogy: "The billing office has a wall chart of contract periods for each insurer. To price a claim, a clerk looks along the insurer's row until the period that contains the claim date. A range join is that clerk, working on every claim at once.",
    exampleSql: `SELECT invoice_id, payor_id, invoice_date, due_date, status, total_amount FROM invoices WHERE payor_id IN (2, 3) ORDER BY payor_id, invoice_date LIMIT 10`,
    syntax: `SELECT ...
FROM facts f
JOIN ranges r
  ON r.key = f.key                                -- optional equality
 AND f.value BETWEEN r.range_start AND r.range_end; -- or >= start AND < end`,
    sql: `WITH contract_periods(payor_id, period_start, period_end, contract_rate) AS (
  VALUES (2, '2025-01-01', '2025-12-31', 0.70),
         (2, '2026-01-01', '2026-12-31', 0.75),
         (3, '2025-01-01', '2025-12-31', 0.62),
         (3, '2026-01-01', '2026-12-31', 0.65)
)
SELECT i.invoice_id, i.payor_id, i.invoice_date, i.total_amount,
       cp.period_start, cp.contract_rate,
       ROUND(i.total_amount * cp.contract_rate, 2) AS expected_payment
FROM invoices i
JOIN contract_periods cp
  ON cp.payor_id = i.payor_id
 AND i.invoice_date BETWEEN cp.period_start AND cp.period_end
WHERE i.status <> 'Void'
ORDER BY i.payor_id, i.invoice_date;`,
    breakdown: [
      ['WITH contract_periods(...) AS (VALUES ...)', 'A small lookup of contract periods: one row per payor per calendar year, with the rate for that year.'],
      ['ON cp.payor_id = i.payor_id', 'The equality part narrows the search to the right payor.'],
      ['AND i.invoice_date BETWEEN cp.period_start AND cp.period_end', 'The range part: keep the period that contains the invoice date. Periods do not overlap, so each invoice matches exactly one.'],
      ['ROUND(i.total_amount * cp.contract_rate, 2)', 'Expected payment using the rate of that period: 2025 invoices use the 2025 rate.'],
      ["WHERE i.status <> 'Void'", 'Ordinary filter after the join.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 200" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="10" y="20" fill="var(--text)" font-weight="bold">Payor 2 contract periods (range table) and invoices (points)</text>
<rect x="40" y="45" width="275" height="34" rx="6" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="55" y="66" fill="var(--text)">2025-01-01 … 2025-12-31 | rate 0.70</text>
<rect x="320" y="45" width="275" height="34" rx="6" fill="var(--panel2)" stroke="var(--green)"/>
<text x="335" y="66" fill="var(--text)">2026-01-01 … 2026-12-31 | rate 0.75</text>
<line x1="40" y1="130" x2="600" y2="130" stroke="var(--muted)"/>
<circle cx="70" cy="130" r="5" fill="var(--accent)"/><text x="48" y="152" fill="var(--text)">inv 20</text>
<circle cx="170" cy="130" r="5" fill="var(--accent)"/><text x="150" y="152" fill="var(--text)">inv 24</text>
<circle cx="290" cy="130" r="5" fill="var(--accent)"/><text x="268" y="152" fill="var(--text)">inv 35</text>
<circle cx="335" cy="130" r="5" fill="var(--accent)"/><text x="318" y="170" fill="var(--text)">inv 33</text>
<circle cx="470" cy="130" r="5" fill="var(--accent)"/><text x="450" y="152" fill="var(--text)">inv 7</text>
<line x1="70" y1="125" x2="70" y2="82" stroke="var(--blue)" stroke-dasharray="3 3"/>
<line x1="170" y1="125" x2="170" y2="82" stroke="var(--blue)" stroke-dasharray="3 3"/>
<line x1="290" y1="125" x2="290" y2="82" stroke="var(--blue)" stroke-dasharray="3 3"/>
<line x1="335" y1="125" x2="335" y2="82" stroke="var(--green)" stroke-dasharray="3 3"/>
<line x1="470" y1="125" x2="470" y2="82" stroke="var(--green)" stroke-dasharray="3 3"/>
<text x="40" y="192" fill="var(--muted)">Each invoice date falls inside exactly one period: that row is its match.</text>
</svg>` },
    internals: `<p>An equi-join can use a <b>hash join</b> (build a hash table on the key, probe it). A pure range condition cannot be hashed, so engines fall back to a <b>nested loop</b> (compare each fact row with each range row) or a <b>sort-merge</b> style scan. With a small range table (a few dozen bands or periods) a nested loop is instant. With two big tables (millions of events vs millions of coverage windows) it can explode to O(n × m).</p>
<p>Helpers: include an <b>equality part</b> (payor_id) so the engine can hash or seek on it first; index the range table on <code>(payor_id, period_start)</code> so SQLite seeks to the right payor and scans only its few periods; or, for "latest period starting on or before the date", use a correlated subquery with <code>ORDER BY period_start DESC LIMIT 1</code>, which becomes one index seek per row. PostgreSQL range types with GiST indexes and <code>&amp;&amp;</code> / <code>@&gt;</code> operators are purpose-built for this.</p>`,
    mistakes: [
      { wrong: `WITH bands(band, min_amt, max_amt) AS (VALUES ('Small', 0, 100), ('Medium', 100, 300), ('Large', 300, 100000))
SELECT i.invoice_id, i.total_amount, b.band
FROM invoices i JOIN bands b ON i.total_amount BETWEEN b.min_amt AND b.max_amt
WHERE i.invoice_id IN (11, 31, 34);`, why: "The bands overlap at 100 and 300 because BETWEEN includes both ends. Invoice 31 (exactly 100) matches Small AND Medium, so it appears twice and would be counted twice in totals.", fix: `WITH bands(band, min_amt, max_amt) AS (VALUES ('Small', 0, 100), ('Medium', 100, 300), ('Large', 300, 100000))
SELECT i.invoice_id, i.total_amount, b.band
FROM invoices i JOIN bands b ON i.total_amount >= b.min_amt AND i.total_amount < b.max_amt
WHERE i.invoice_id IN (11, 31, 34);` },
      { wrong: `WITH contract_periods(payor_id, period_start, period_end, contract_rate) AS (
  VALUES (2, '2026-01-01', '2026-12-31', 0.75))
SELECT i.invoice_id, i.invoice_date, cp.contract_rate
FROM invoices i JOIN contract_periods cp
  ON cp.payor_id = i.payor_id AND i.invoice_date BETWEEN cp.period_start AND cp.period_end
WHERE i.payor_id = 2;`, why: 'There is a gap: no period covers 2025. With an INNER JOIN, every 2025 invoice silently disappears from the report. Use LEFT JOIN and look for NULL rates to detect gaps.', fix: `WITH contract_periods(payor_id, period_start, period_end, contract_rate) AS (
  VALUES (2, '2026-01-01', '2026-12-31', 0.75))
SELECT i.invoice_id, i.invoice_date, cp.contract_rate
FROM invoices i LEFT JOIN contract_periods cp
  ON cp.payor_id = i.payor_id AND i.invoice_date BETWEEN cp.period_start AND cp.period_end
WHERE i.payor_id = 2 AND cp.contract_rate IS NULL;   -- invoices with no period` },
      { wrong: `WITH contract_periods(payor_id, period_start, period_end, contract_rate) AS (
  VALUES (2, '2025-01-01', '2025-12-31', 0.70), (2, '2026-01-01', '2026-12-31', 0.75),
         (3, '2025-01-01', '2025-12-31', 0.62), (3, '2026-01-01', '2026-12-31', 0.65))
SELECT i.invoice_id, cp.contract_rate
FROM invoices i JOIN contract_periods cp
  ON i.invoice_date BETWEEN cp.period_start AND cp.period_end
WHERE i.payor_id = 2;`, why: 'The equality on payor_id is missing, so every Aetna invoice also matches the Medicare period for the same year: each invoice appears twice, once with the wrong rate.', fix: `WITH contract_periods(payor_id, period_start, period_end, contract_rate) AS (
  VALUES (2, '2025-01-01', '2025-12-31', 0.70), (2, '2026-01-01', '2026-12-31', 0.75))
SELECT i.invoice_id, cp.contract_rate
FROM invoices i JOIN contract_periods cp
  ON cp.payor_id = i.payor_id AND i.invoice_date BETWEEN cp.period_start AND cp.period_end
WHERE i.payor_id = 2;` },
    ],
    rules: [
      'Any comparison can go in ON: =, <, >, BETWEEN, even LIKE.',
      'Ranges must not overlap (double matches) and should not have gaps (lost rows).',
      'For continuous values prefer half-open ranges: >= start AND < end.',
      'Keep an equality part (payor_id) in the ON when you can; it makes the join fast.',
      'Use LEFT JOIN + IS NULL to find rows that fall into no range.',
    ],
    compare: `<table><tr><th>Approach</th><th>Good for</th><th>Drawback</th></tr>
<tr><td>CASE WHEN days &lt;= 30 THEN ...</td><td>Few fixed bands</td><td>Rules hard-coded in every query</td></tr>
<tr><td>Range join to a band table</td><td>Bands that change or are shared</td><td>Needs non-overlapping ranges</td></tr>
<tr><td>Correlated subquery ORDER BY start DESC LIMIT 1</td><td>"Latest version on or before date"</td><td>One lookup per row; no gap detection</td></tr>
<tr><td>Equi-join on a surrogate key</td><td>Facts already stamped with the version key</td><td>Key must be looked up at load time</td></tr></table>`,
    realWorld: 'Expected-reimbursement engines join each claim line to the fee schedule effective on the date of service. A/R aging reports join days-past-due to an aging bucket table. Eligibility checks join visit dates to coverage windows (member_start, member_end).',
    tips: [
      'Test boundaries: an invoice exactly on a period start, end, or band edge.',
      'Check coverage: every fact row should match exactly one range (COUNT per fact = 1).',
      'Store bands in a table so finance can change them without editing SQL.',
    ],
    deep: `<p>A <b>band join</b> is a range join whose range is computed from the other row, e.g. payments within 30 days of the invoice: <code>ON p.invoice_id = i.invoice_id AND p.payment_date BETWEEN i.invoice_date AND date(i.invoice_date, '+30 days')</code>. Some engines (Snowflake, DuckDB, Spark with hints) have special "range join" or "IEJoin" algorithms that sort both sides and sweep, turning O(n × m) into roughly O((n + m) log n). DuckDB and BigQuery also offer <code>ASOF JOIN</code>, which returns the nearest earlier match directly, perfect for "price in effect at that time".</p>`,
    tryIt: {
      prompt: 'Band join by date: for each invoice from June 2026, list the payments received within 30 days of the invoice date. Change 30 to 60 and see more matches.',
      starter: `SELECT i.invoice_id, i.invoice_date, p.payment_id, p.payment_date,
       CAST(julianday(p.payment_date) - julianday(i.invoice_date) AS INTEGER) AS days_to_pay
FROM invoices i
LEFT JOIN payments p
  ON p.invoice_id = i.invoice_id
 AND p.payment_date BETWEEN i.invoice_date AND date(i.invoice_date, '+30 days')
WHERE i.invoice_date BETWEEN '2026-06-01' AND '2026-06-30'
ORDER BY i.invoice_id, p.payment_date;`,
    },
    challenge: {
      level: 3,
      prompt: "A/R aging with a band join. Create a bands CTE with (band, min_days, max_days): ('0-30', 0, 30), ('31-60', 31, 60), ('61-90', 61, 90), ('91-180', 91, 180), ('181+', 181, 100000). Days past due = whole days between due_date and 2026-09-01, for invoices with status 'Overdue'. Return band, number of overdue invoices and their total_amount (0 when empty) for EVERY band, ordered by min_days.",
      solution: `WITH bands(band, min_days, max_days) AS (
  VALUES ('0-30', 0, 30), ('31-60', 31, 60), ('61-90', 61, 90), ('91-180', 91, 180), ('181+', 181, 100000)
),
overdue AS (
  SELECT invoice_id, total_amount,
         CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_past_due
  FROM invoices
  WHERE status = 'Overdue'
)
SELECT b.band,
       COUNT(o.invoice_id)             AS invoices,
       COALESCE(SUM(o.total_amount), 0) AS amount
FROM bands b
LEFT JOIN overdue o ON o.days_past_due BETWEEN b.min_days AND b.max_days
GROUP BY b.band, b.min_days
ORDER BY b.min_days;`,
      hints: [
        'Two CTEs: the bands (VALUES ...) and the overdue invoices with their days past due.',
        "Days past due: CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER).",
        'Start FROM bands and LEFT JOIN the invoices ON days_past_due BETWEEN min_days AND max_days, so empty bands still appear.',
        'GROUP BY b.band, b.min_days; use COUNT(o.invoice_id) (not COUNT(*)) and COALESCE(SUM(o.total_amount), 0); ORDER BY b.min_days.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What makes a join "non-equi"?', options: ['It uses LEFT JOIN', 'Its ON condition uses a comparison other than equality, such as BETWEEN or <', 'It joins a table to itself', 'It has no ON clause'], answer: 1, why: 'Any non-equality predicate in ON makes it a non-equi join.' },
      { q: "Bands 0-100 and 100-300 are joined with BETWEEN. What happens to an invoice of exactly 100?", options: ['It matches no band', 'It matches both bands and is double counted', 'It matches the first band only', 'SQLite raises an error'], answer: 1, why: 'BETWEEN includes both ends, so overlapping edges double match. Use >= and <.' },
      { q: 'Why keep payor_id = payor_id in a contract-period range join?', options: ['It is required syntax', 'It restricts matches to the right payor and lets the engine seek/hash on it', 'It sorts the result', 'It removes NULLs'], answer: 1, why: 'Without it, invoices match other payors\' periods; with it, the join is also much faster.' },
    ],
  },
]);
