// Section 12: Data Modification & Transactions (dml-01 .. dml-20)
// DML lessons use the `dml` before/after visual; transaction lessons use the `txn` timeline.
// Challenges are SELECTs that identify or verify the rows a statement would change.
Lessons.add([
  // ---------------------------------------------------------------- 01
  {
    id: 'dml-01',
    goals: ['Add a new row with INSERT INTO ... VALUES', 'Why you should always list the columns', 'How defaults, NULLs and auto-generated keys fill the gaps', 'How constraints can reject an INSERT'],
    concept: `<p><b>INSERT</b> adds new rows to a table. You name the table, list the columns you are filling, and give one value per column, in the same order.</p>
<p>Columns you leave out get their <b>DEFAULT</b> value, or <b>NULL</b> if there is no default. An <code>INTEGER PRIMARY KEY</code> column left out gets the next id automatically in SQLite.</p>
<p>The database checks every <b>constraint</b> before accepting the row: NOT NULL, CHECK, UNIQUE and FOREIGN KEY. If any check fails, the whole INSERT is rejected and nothing is added.</p>`,
    why: 'Every new patient, invoice, charge and payment enters the billing system through an INSERT.',
    when: 'Whenever a new real-world fact must be recorded: a patient registers, a visit is billed, a payment arrives.',
    analogy: 'Filling in a new patient registration form and filing it. Blank fields stay empty (NULL) and the front desk stamps the next chart number (auto id).',
    exampleSql: `SELECT patient_id, first_name, last_name, date_of_birth, city FROM patients WHERE patient_id >= 21`,
    syntax: `INSERT INTO table_name (col1, col2, col3)\nVALUES (value1, value2, value3);`,
    sql: `INSERT INTO patients (patient_id, first_name, last_name, date_of_birth, gender, city, email, primary_payor_id)\nVALUES (26, 'Rosa', 'Diaz', '1988-04-02', 'F', 'Austin', 'rosa.diaz@mail.com', 2);\n\nSELECT patient_id, first_name, last_name, city, primary_payor_id\nFROM patients\nWHERE patient_id >= 22;`,
    breakdown: [
      ['INSERT INTO patients (...)', 'Target table and the exact columns we are filling'],
      ['VALUES (26, \'Rosa\', ...)', 'One value per listed column, in the same order'],
      ['allergies (not listed)', 'Left out, so it becomes NULL'],
      ['SELECT ... WHERE patient_id >= 22', 'Verify the new row is there'],
    ],
    visual: { type: 'dml', statement: `INSERT INTO patients (patient_id, first_name, last_name, date_of_birth, gender, city, email, primary_payor_id) VALUES (26, 'Rosa', 'Diaz', '1988-04-02', 'F', 'Austin', 'rosa.diaz@mail.com', 2)`, view: `SELECT patient_id, first_name, last_name, city, primary_payor_id FROM patients WHERE patient_id >= 22`, key: 'patient_id' },
    internals: `<p>SQLite finds the right leaf page of the table B-tree (by rowid) and inserts the record, then inserts one entry into every index on the table. It writes the change to the rollback journal or WAL first so it can be undone. More indexes = more work per INSERT.</p>`,
    mistakes: [
      { wrong: `INSERT INTO patients VALUES (27, 'Ana', 'Ruiz', '1990-01-01');`, why: 'Without a column list you must supply every column in table order. It fails here (9 columns, 4 values) and breaks silently if columns are ever reordered.', fix: `INSERT INTO patients (patient_id, first_name, last_name, date_of_birth) VALUES (27, 'Ana', 'Ruiz', '1990-01-01');` },
      { wrong: `INSERT INTO patients (first_name, last_name) VALUES ('Ana', 'Ruiz');`, why: 'date_of_birth is NOT NULL and has no default, so the row is rejected.', fix: `INSERT INTO patients (first_name, last_name, date_of_birth) VALUES ('Ana', 'Ruiz', '1990-01-01');` },
      { wrong: `INSERT INTO patients (first_name, last_name, date_of_birth, primary_payor_id) VALUES ('Ana', 'Ruiz', '1990-01-01', 99);`, why: 'Payor 99 does not exist: the foreign key constraint rejects it (when foreign keys are enforced).', fix: `INSERT INTO patients (first_name, last_name, date_of_birth, primary_payor_id) VALUES ('Ana', 'Ruiz', '1990-01-01', 7);` },
    ],
    rules: ['Always list the columns.', 'Values must match the column list in count and order.', 'Missing columns get DEFAULT or NULL.', 'Any failed constraint rejects the whole statement.'],
    compare: `<table><tr><th>Form</th><th>Use</th></tr>
<tr><td>INSERT ... VALUES (...)</td><td>One new row</td></tr>
<tr><td>INSERT ... VALUES (...), (...)</td><td>Several rows at once</td></tr>
<tr><td>INSERT ... SELECT</td><td>Rows copied/derived from a query</td></tr>
<tr><td>INSERT ... ON CONFLICT</td><td>Insert or update (UPSERT)</td></tr></table>`,
    realWorld: 'Patient registration screens, EHR interfaces (HL7/FHIR feeds) and payment posting all end in INSERT statements, usually parameterized: VALUES (?, ?, ?).',
    tips: ['Leave out the id column to let the database assign it; use RETURNING patient_id (SQLite 3.35+, PostgreSQL) to get it back.'],
    deep: `<p>Getting generated keys: SQLite/PostgreSQL <code>RETURNING</code>, SQL Server <code>OUTPUT inserted.id</code>, MySQL <code>LAST_INSERT_ID()</code>, Oracle <code>RETURNING ... INTO</code>. Always use parameterized statements from applications to prevent SQL injection.</p>`,
    tryIt: { prompt: 'Insert yourself as a patient without giving patient_id and use RETURNING to see the id SQLite assigned.', starter: `INSERT INTO patients (first_name, last_name, date_of_birth, city)\nVALUES ('Sam', 'Lee', '1995-06-15', 'Dallas')\nRETURNING patient_id, first_name, last_name;` },
    challenge: {
      level: 1,
      prompt: 'Before inserting a new registration for Maria Garcia (born 1951-12-18), check for duplicates: return patient_id, first_name, last_name and date_of_birth of existing patients with that name and birth date, ordered by patient_id.',
      solution: `SELECT patient_id, first_name, last_name, date_of_birth FROM patients WHERE first_name = 'Maria' AND last_name = 'Garcia' AND date_of_birth = '1951-12-18' ORDER BY patient_id;`,
      hints: ['Query the patients table.', 'Match first_name, last_name and date_of_birth.', 'Combine the three conditions with AND.', 'ORDER BY patient_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What happens to a column you leave out of the INSERT column list?', options: ['Error always', 'It gets its DEFAULT or NULL', 'It copies the previous row', 'It becomes 0'], answer: 1, why: 'Unless it is NOT NULL without a default, which causes an error.' },
      { q: 'Why list columns explicitly?', options: ['It is faster', 'The statement stays correct if the table changes and is easier to read', 'It is required by SQLite', 'It avoids indexes'], answer: 1, why: 'Positional inserts break when columns are added or reordered.' },
    ],
  },
  // ---------------------------------------------------------------- 02
  {
    id: 'dml-02',
    goals: ['Insert several rows with one statement', 'Why batching is faster than row-by-row', 'All-or-nothing behaviour of a multi-row INSERT', 'Batch size limits'],
    concept: `<p>You can insert several rows at once by listing several value groups separated by commas:</p>
<pre>INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)
VALUES (3, 2, '2026-09-01', 45, 'EFT'),
       (9, 3, '2026-09-01', 97.5, 'EFT');</pre>
<p>It is one statement, so it is <b>atomic</b>: if any row breaks a constraint, <b>none</b> of the rows are inserted.</p>
<p>It is also much faster than separate INSERTs: one parse, one round trip, one commit.</p>`,
    why: 'Payment files (ERA/835 remittances) and charge batches arrive with many rows at once.',
    when: 'Posting a batch of insurer payments, loading reference data, seeding test data.',
    analogy: 'Mailing one envelope with ten remittance slips instead of ten envelopes with one slip each.',
    syntax: `INSERT INTO table (c1, c2)\nVALUES (a1, a2),\n       (b1, b2),\n       (c1, c2);`,
    sql: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (3, 2, '2026-09-01', 45.00, 'EFT'),\n       (9, 3, '2026-09-01', 97.50, 'EFT'),\n       (11, 3, '2026-09-01', 9.75, 'Check');\n\nSELECT payment_id, invoice_id, payor_id, amount, method\nFROM payments\nWHERE payment_id >= 44;`,
    breakdown: [
      ['INSERT INTO payments (...)', 'One column list for all rows'],
      ['VALUES (...), (...), (...)', 'Three rows, comma-separated; payment_id is generated (48, 49, 50)'],
      ['SELECT ... WHERE payment_id >= 44', 'Verify the batch'],
    ],
    visual: { type: 'dml', statement: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (3, 2, '2026-09-01', 45.00, 'EFT'), (9, 3, '2026-09-01', 97.50, 'EFT'), (11, 3, '2026-09-01', 9.75, 'Check')`, view: `SELECT payment_id, invoice_id, payor_id, amount, method FROM payments WHERE payment_id >= 44`, key: 'payment_id' },
    internals: `<p>Each separate INSERT in autocommit mode is its own transaction, which means its own journal write and <b>fsync</b> to disk: often the slowest part. A multi-row INSERT (or many INSERTs inside one BEGIN ... COMMIT) pays that cost once. In SQLite the difference can be 100x for thousands of rows.</p>`,
    mistakes: [
      { wrong: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (3, 2, '2026-09-01', 45, 'EFT'), (9, 3, '2026-09-01', 97.5);`, why: 'Every row must have the same number of values as the column list.', fix: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (3, 2, '2026-09-01', 45, 'EFT'), (9, 3, '2026-09-01', 97.5, 'EFT');` },
      { wrong: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (3, 2, '2026-09-01', 45, 'EFT'), (999, 3, '2026-09-01', 10, 'EFT');`, why: 'Invoice 999 does not exist; the foreign key fails and neither row is inserted.', fix: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (3, 2, '2026-09-01', 45, 'EFT');` },
    ],
    rules: ['One column list, many value groups.', 'The whole statement succeeds or fails together.', 'Batch rows (or wrap many INSERTs in one transaction) for speed.', 'Keep batches to a reasonable size (hundreds to a few thousand rows).'],
    compare: `<table><tr><th></th><th>Row-by-row INSERTs</th><th>Multi-row INSERT</th></tr>
<tr><td>Round trips</td><td>N</td><td>1</td></tr>
<tr><td>Commits (autocommit)</td><td>N</td><td>1</td></tr>
<tr><td>On error</td><td>Earlier rows stay</td><td>Nothing inserted</td></tr></table>`,
    realWorld: 'An 835 remittance file from Medicare can contain thousands of claim payments. Posting systems insert them in batches inside a transaction so a bad file never half-posts.',
    deep: `<p>Limits: SQLite caps bound parameters (32,766 by default) and SQL Server allows at most 1,000 rows in a VALUES list. For very large loads use bulk tools: PostgreSQL <code>COPY</code>, MySQL <code>LOAD DATA</code>, SQL Server <code>BULK INSERT</code> / bcp, SQLite <code>.import</code>.</p>`,
    tryIt: { prompt: 'Insert two new CHARGE transactions for invoice 5 in one statement, then list the transactions of invoice 5.', starter: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nVALUES (5, '2026-09-01', 'CHARGE', 25, 'you'),\n       (5, '2026-09-01', 'CHARGE', 40, 'you');\n\nSELECT * FROM transactions WHERE invoice_id = 5;` },
    challenge: {
      level: 2,
      prompt: 'Before posting the insurer batch for invoices 3, 9 and 11, compute the expected payor payment for each: invoice_id, total_amount, the payor\'s contract_rate and expected = total_amount * contract_rate. Order by invoice_id.',
      solution: `SELECT i.invoice_id, i.total_amount, p.contract_rate, i.total_amount * p.contract_rate AS expected FROM invoices i JOIN payors p ON p.payor_id = i.payor_id WHERE i.invoice_id IN (3, 9, 11) ORDER BY i.invoice_id;`,
      hints: ['You need invoices and payors.', 'Join on payor_id.', 'Filter invoice_id IN (3, 9, 11).', 'expected = i.total_amount * p.contract_rate; ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'A 3-row INSERT has one row that violates a CHECK constraint. How many rows are inserted?', options: ['0', '2', '3', '1'], answer: 0, why: 'A single statement is atomic.' },
      { q: 'Why is a multi-row INSERT faster than separate INSERTs?', options: ['Smaller rows', 'Fewer round trips and commits', 'It skips constraints', 'It skips indexes'], answer: 1, why: 'Overhead is paid once for the whole batch.' },
    ],
  },
  // ---------------------------------------------------------------- 03
  {
    id: 'dml-03',
    goals: ['Insert rows produced by a query with INSERT ... SELECT', 'Match SELECT columns to the target column list', 'Preview the rows before inserting', 'Typical uses: ledger entries, archiving, staging'],
    concept: `<p><b>INSERT ... SELECT</b> inserts the result of a query instead of hand-typed values. The SELECT can filter, join, compute and aggregate. Each result row becomes a new row in the target table.</p>
<p>Always run the SELECT on its own first: <b>what you see is exactly what will be inserted</b>.</p>`,
    why: 'Many billing entries are derived from other data: write-offs from overdue invoices, ledger lines from payments, archive copies of old invoices.',
    when: 'Generating rows from existing data in bulk, copying data between tables, or populating a summary table.',
    analogy: 'Instead of hand-writing write-off slips, you print them straight from the "small overdue balances" report.',
    syntax: `INSERT INTO target (c1, c2, c3)\nSELECT x, y, z\nFROM source\nWHERE condition;`,
    sql: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nSELECT invoice_id, '2026-09-01', 'WRITE_OFF', -total_amount, 'system'\nFROM invoices\nWHERE status = 'Overdue'\n  AND total_amount < 100;\n\nSELECT transaction_id, invoice_id, transaction_type, amount, posted_by\nFROM transactions\nWHERE transaction_id >= 150;`,
    breakdown: [
      ['INSERT INTO transactions (invoice_id, ..., posted_by)', 'Five target columns'],
      ['SELECT invoice_id, \'2026-09-01\', \'WRITE_OFF\', -total_amount, \'system\'', 'Five values per row: mixes columns and constants. Negative amount lowers the balance.'],
      ['WHERE status = \'Overdue\' AND total_amount < 100', 'Only small overdue balances (invoices 3 and 11)'],
    ],
    visual: { type: 'dml', statement: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by) SELECT invoice_id, '2026-09-01', 'WRITE_OFF', -total_amount, 'system' FROM invoices WHERE status = 'Overdue' AND total_amount < 100`, view: `SELECT transaction_id, invoice_id, transaction_type, amount, posted_by FROM transactions WHERE transaction_id >= 150`, key: 'transaction_id' },
    internals: `<p>The engine runs the SELECT and feeds each row into the insert logic. If the SELECT reads the same table it inserts into, SQLite first materializes the SELECT result into a temporary table so the new rows are not read back by the query (otherwise it could loop forever).</p>`,
    mistakes: [
      { wrong: `INSERT INTO transactions (invoice_id, transaction_type, amount)\nSELECT invoice_id, -total_amount, 'WRITE_OFF' FROM invoices WHERE status = 'Overdue' AND total_amount < 100;`, why: 'Columns are matched by position, not name: amount and type are swapped (and the NOT NULL transaction_date is missing).', fix: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount)\nSELECT invoice_id, '2026-09-01', 'WRITE_OFF', -total_amount FROM invoices WHERE status = 'Overdue' AND total_amount < 100;` },
      { wrong: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount)\nSELECT invoice_id, '2026-09-01', 'WRITE_OFF', -total_amount FROM invoices;`, why: 'Forgot the WHERE: every invoice gets written off.', fix: `SELECT invoice_id, '2026-09-01', 'WRITE_OFF', -total_amount FROM invoices WHERE status = 'Overdue' AND total_amount < 100;` },
    ],
    rules: ['Run the SELECT alone first and check the rows.', 'Columns match by position.', 'Constants and expressions are allowed in the SELECT list.', 'Guard against inserting the same rows twice (NOT EXISTS).'],
    compare: `<table><tr><th>Statement</th><th>Creates table?</th><th>Target</th></tr>
<tr><td>INSERT ... SELECT</td><td>No</td><td>Existing table</td></tr>
<tr><td>CREATE TABLE ... AS SELECT</td><td>Yes</td><td>New table (SQLite, PostgreSQL, MySQL, Oracle)</td></tr>
<tr><td>SELECT ... INTO new_table</td><td>Yes</td><td>SQL Server (and PostgreSQL)</td></tr></table>`,
    realWorld: 'Month-end jobs generate WRITE_OFF ledger entries for tiny balances that cost more to collect than they are worth, using exactly this pattern.',
    deep: `<p>Make the job <b>idempotent</b> (safe to re-run) by excluding invoices that already have a write-off: <code>AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.invoice_id = invoices.invoice_id AND t.transaction_type = 'WRITE_OFF')</code>. Add a unique constraint as a second line of defence.</p>`,
    tryIt: { prompt: 'Make the write-off idempotent: add a NOT EXISTS so running it twice does not create duplicates. Run it twice and check.', starter: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nSELECT invoice_id, '2026-09-01', 'WRITE_OFF', -total_amount, 'system'\nFROM invoices i\nWHERE status = 'Overdue' AND total_amount < 100\n  AND NOT EXISTS (SELECT 1 FROM transactions t\n                  WHERE t.invoice_id = i.invoice_id AND t.transaction_type = 'WRITE_OFF');\n\nSELECT * FROM transactions WHERE transaction_type = 'WRITE_OFF';` },
    challenge: {
      level: 2,
      prompt: 'Preview an INSERT ... SELECT that writes off Overdue invoices under 120: return exactly the rows it would insert: invoice_id, the date \'2026-09-01\', the type \'WRITE_OFF\' and the negative total_amount. Order by invoice_id.',
      solution: `SELECT invoice_id, '2026-09-01', 'WRITE_OFF', -total_amount FROM invoices WHERE status = 'Overdue' AND total_amount < 120 ORDER BY invoice_id;`,
      hints: ['This is the SELECT part of the INSERT on its own.', 'Constants can be selected directly: \'2026-09-01\', \'WRITE_OFF\'.', 'Filter status = \'Overdue\' AND total_amount < 120.', 'Use -total_amount and ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'How are SELECT columns matched to the INSERT column list?', options: ['By name', 'By position', 'By type', 'Randomly'], answer: 1, why: 'The first SELECT expression goes into the first listed column, and so on.' },
      { q: 'Safest habit before an INSERT ... SELECT?', options: ['Drop indexes', 'Run the SELECT alone and inspect the rows', 'Disable constraints', 'Use SELECT *'], answer: 1, why: 'The SELECT result is exactly what gets inserted.' },
    ],
  },
  // ---------------------------------------------------------------- 04
  {
    id: 'dml-04',
    goals: ['Change existing rows with UPDATE ... SET ... WHERE', 'Update several columns and use expressions', 'Why a missing WHERE is dangerous', 'Preview affected rows with a SELECT first'],
    concept: `<p><b>UPDATE</b> changes values in rows that already exist. <code>SET</code> says which columns get which new values; <code>WHERE</code> says which rows.</p>
<pre>UPDATE invoices
SET status = 'Paid'
WHERE invoice_id = 3;</pre>
<p>The new value can be an expression using the old values: <code>SET total_amount = total_amount + 25</code>.</p>
<p><b>Without WHERE, every row in the table is updated.</b> Always write and run the matching SELECT first.</p>`,
    why: 'Billing data changes constantly: invoices get paid, payors renegotiate rates, patients move.',
    when: 'Correcting or progressing existing records: status changes, rate changes, address updates.',
    analogy: 'Pulling specific patient folders (WHERE) and crossing out and rewriting one field on each (SET). Forget to pick folders and you rewrite every folder in the room.',
    syntax: `UPDATE table\nSET col1 = value1,\n    col2 = expression\nWHERE condition;`,
    sql: `-- 1) preview\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 3;\n\n-- 2) change\nUPDATE invoices\nSET status = 'Paid'\nWHERE invoice_id = 3;\n\nSELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id BETWEEN 1 AND 6;`,
    breakdown: [
      ['SELECT ... WHERE invoice_id = 3', 'Preview: the WHERE you will reuse'],
      ['UPDATE invoices', 'The table whose rows change'],
      ['SET status = \'Paid\'', 'New value for the status column'],
      ['WHERE invoice_id = 3', 'Only this invoice. Without it, all 48 invoices become Paid.'],
    ],
    visual: { type: 'dml', statement: `UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3`, view: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id BETWEEN 1 AND 6`, key: 'invoice_id' },
    internals: `<p>The engine finds the rows with the WHERE clause (using indexes if possible), writes the old version to the journal/undo log, then writes the new version. Every index containing a changed column is updated too. In PostgreSQL an UPDATE actually writes a new row version and marks the old one dead (MVCC), which VACUUM cleans later.</p>`,
    mistakes: [
      { wrong: `UPDATE invoices SET status = 'Paid';`, why: 'No WHERE: every invoice is marked Paid.', fix: `UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;` },
      { wrong: `UPDATE payors SET contract_rate = 0.82 AND is_active = 1 WHERE payor_id = 1;`, why: 'Using AND between assignments sets contract_rate to the boolean result of (0.82 AND is_active = 1). Separate assignments with commas.', fix: `UPDATE payors SET contract_rate = 0.82, is_active = 1 WHERE payor_id = 1;` },
      { wrong: `UPDATE invoices SET status = 'Overdue' WHERE due_date < '2026-09-01';`, why: 'Also flips Paid and Void invoices to Overdue. Include every business condition.', fix: `UPDATE invoices SET status = 'Overdue' WHERE due_date < '2026-09-01' AND status IN ('Open', 'Partially Paid');` },
    ],
    rules: ['Always write the WHERE first, as a SELECT.', 'Separate assignments with commas, not AND.', 'Right-hand expressions see the old row values.', 'Check the affected row count (changes()) after running.'],
    compare: `<table><tr><th>Statement</th><th>Effect on rows</th></tr>
<tr><td>INSERT</td><td>Adds new rows</td></tr>
<tr><td>UPDATE</td><td>Changes columns of existing rows</td></tr>
<tr><td>DELETE</td><td>Removes rows</td></tr>
<tr><td>UPSERT / MERGE</td><td>Insert or update depending on existence</td></tr></table>`,
    realWorld: 'Nightly jobs flip Open invoices past their due date to Overdue; payment posting sets invoices to Paid or Partially Paid.',
    deep: `<p>All assignments in one UPDATE read the <b>old</b> values: <code>SET a = b, b = a</code> swaps two columns in standard SQL (PostgreSQL, SQLite, SQL Server). MySQL is the exception: it evaluates assignments left to right, so the swap does not work there. <code>RETURNING</code> (SQLite, PostgreSQL) / <code>OUTPUT</code> (SQL Server) shows the changed rows.</p>`,
    tryIt: { prompt: 'Give BlueShield (payor 1) a new contract rate of 0.82 and a new phone number in one UPDATE, using RETURNING to see the result.', starter: `UPDATE payors\nSET contract_rate = 0.82,\n    phone = '800-555-0199'\nWHERE payor_id = 1\nRETURNING payor_id, payor_name, contract_rate, phone;` },
    challenge: {
      level: 2,
      prompt: 'A job will run UPDATE invoices SET status = \'Overdue\' WHERE status = \'Open\' AND due_date < \'2026-09-30\'. Write the SELECT that identifies the rows it would affect: invoice_id, patient_id, due_date and status. Order by invoice_id.',
      solution: `SELECT invoice_id, patient_id, due_date, status FROM invoices WHERE status = 'Open' AND due_date < '2026-09-30' ORDER BY invoice_id;`,
      hints: ['Reuse the UPDATE\'s WHERE clause unchanged.', 'FROM invoices WHERE status = \'Open\' AND due_date < \'2026-09-30\'.', 'Select the four requested columns and ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What does UPDATE patients SET city = \'Austin\'; do?', options: ['Nothing', 'Sets city to Austin for every patient', 'Errors', 'Updates only NULL cities'], answer: 1, why: 'No WHERE = all rows.' },
      { q: 'How do you set two columns?', options: ['SET a = 1 AND b = 2', 'SET a = 1, b = 2', 'SET (a = 1)(b = 2)', 'Two UPDATE statements only'], answer: 1, why: 'Assignments are comma-separated.' },
    ],
  },
  // ---------------------------------------------------------------- 05
  {
    id: 'dml-05',
    goals: ['Update rows using values or conditions from another table', 'UPDATE ... FROM (SQLite, PostgreSQL, SQL Server) and UPDATE ... JOIN (MySQL)', 'Correlated subquery alternative', 'Avoiding ambiguous multi-match updates'],
    concept: `<p>Often the new value or the condition lives in <b>another table</b>. Example: payor 6 (Cigna Select) is inactive, so every patient whose primary payor is an inactive payor should be switched to Self-Pay (payor 7).</p>
<p>SQLite 3.33+ and PostgreSQL use <code>UPDATE ... FROM</code>:</p>
<pre>UPDATE patients
SET primary_payor_id = 7
FROM payors py
WHERE py.payor_id = patients.primary_payor_id
  AND py.is_active = 0;</pre>
<p>The FROM table is joined to the target, and matching target rows are updated. The syntax differs by database (see the comparison tabs).</p>`,
    why: 'Real updates depend on related data: payor status, payment totals, location settings.',
    when: 'Syncing a column from a related table, applying rules based on another table, applying corrections from a staging table.',
    analogy: 'Going through the patient files with the list of terminated insurance contracts beside you, and restamping every affected file as Self-Pay.',
    syntax: `-- SQLite / PostgreSQL\nUPDATE target\nSET col = src.val\nFROM source src\nWHERE src.key = target.key AND ...;`,
    sql: `UPDATE patients\nSET primary_payor_id = 7\nFROM payors py\nWHERE py.payor_id = patients.primary_payor_id\n  AND py.is_active = 0;\n\nSELECT patient_id, first_name, last_name, primary_payor_id\nFROM patients\nWHERE patient_id BETWEEN 15 AND 21;`,
    breakdown: [
      ['UPDATE patients SET primary_payor_id = 7', 'Target table and new value (Self-Pay)'],
      ['FROM payors py', 'The related table that provides the condition'],
      ['WHERE py.payor_id = patients.primary_payor_id', 'Join condition: links each patient to their payor'],
      ['AND py.is_active = 0', 'Only patients of inactive payors (patient 19)'],
    ],
    visual: { type: 'dml', statement: `UPDATE patients SET primary_payor_id = 7 FROM payors py WHERE py.payor_id = patients.primary_payor_id AND py.is_active = 0`, view: `SELECT patient_id, first_name, last_name, primary_payor_id FROM patients WHERE patient_id BETWEEN 15 AND 21`, key: 'patient_id' },
    internals: `<p>The engine executes a join between the target and the FROM tables and updates each target row found. If one target row matches <b>several</b> source rows, only one match is used and which one is not defined. Make sure the join key is unique on the source side, or aggregate the source first.</p>`,
    mistakes: [
      { wrong: `UPDATE patients p JOIN payors py ON py.payor_id = p.primary_payor_id\nSET p.primary_payor_id = 7 WHERE py.is_active = 0;`, why: 'That is MySQL syntax; SQLite and PostgreSQL use UPDATE ... FROM.', fix: `UPDATE patients SET primary_payor_id = 7 FROM payors py WHERE py.payor_id = patients.primary_payor_id AND py.is_active = 0;` },
      { wrong: `UPDATE invoices SET total_amount = c.amount FROM charges c WHERE c.invoice_id = invoices.invoice_id;`, why: 'Invoices with several charges match several rows; one arbitrary charge amount wins. Aggregate the source first.', fix: `UPDATE invoices SET total_amount = c.total FROM (SELECT invoice_id, SUM(amount) AS total FROM charges GROUP BY invoice_id) AS c WHERE c.invoice_id = invoices.invoice_id;` },
    ],
    rules: ['Preview with the equivalent SELECT ... JOIN.', 'Make the source unique per target row (aggregate if needed).', 'Syntax differs: FROM (SQLite/PostgreSQL/SQL Server) vs JOIN (MySQL).', 'A correlated subquery in SET works everywhere.'],
    compare: `<table><tr><th>Database</th><th>Syntax</th></tr>
<tr><td>SQLite 3.33+, PostgreSQL</td><td>UPDATE t SET ... FROM s WHERE s.k = t.k</td></tr>
<tr><td>SQL Server</td><td>UPDATE t SET ... FROM t JOIN s ON s.k = t.k</td></tr>
<tr><td>MySQL</td><td>UPDATE t JOIN s ON s.k = t.k SET ...</td></tr>
<tr><td>Oracle / portable</td><td>UPDATE t SET col = (SELECT ... WHERE s.k = t.k) WHERE EXISTS (...)</td></tr></table>`,
    realWorld: 'When a payor contract ends, billing reassigns affected patients and open invoices to the right payer based on the contracts table.',
    deep: `<p>Portable form with correlated subqueries: <code>UPDATE patients SET primary_payor_id = 7 WHERE primary_payor_id IN (SELECT payor_id FROM payors WHERE is_active = 0);</code>. For computed values: <code>SET x = (SELECT ... WHERE s.k = t.k)</code>, but remember that rows with no match get NULL unless you add <code>WHERE EXISTS</code>.</p>`,
    dialectSql: {
      sqlite: `UPDATE patients\nSET primary_payor_id = 7\nFROM payors py\nWHERE py.payor_id = patients.primary_payor_id\n  AND py.is_active = 0;`,
      postgres: `UPDATE patients p\nSET primary_payor_id = 7\nFROM payors py\nWHERE py.payor_id = p.primary_payor_id\n  AND py.is_active = 0;`,
      mysql: `UPDATE patients p\nJOIN payors py ON py.payor_id = p.primary_payor_id\nSET p.primary_payor_id = 7\nWHERE py.is_active = 0;`,
      sqlserver: `UPDATE p\nSET p.primary_payor_id = 7\nFROM patients p\nJOIN payors py ON py.payor_id = p.primary_payor_id\nWHERE py.is_active = 0;`,
      oracle: `UPDATE patients p\nSET p.primary_payor_id = 7\nWHERE EXISTS (SELECT 1 FROM payors py\n              WHERE py.payor_id = p.primary_payor_id AND py.is_active = 0);`,
    },
    tryIt: { prompt: 'Recalculate invoices.total_amount from the sum of charges using an aggregated FROM source, then check invoice 13.', starter: `UPDATE invoices\nSET total_amount = c.total\nFROM (SELECT invoice_id, SUM(amount) AS total FROM charges GROUP BY invoice_id) AS c\nWHERE c.invoice_id = invoices.invoice_id;\n\nSELECT invoice_id, total_amount FROM invoices WHERE invoice_id = 13;` },
    challenge: {
      level: 3,
      prompt: 'An UPDATE ... FROM will set statuses using payment totals. First write the SELECT that shows, for every Partially Paid invoice: invoice_id, total_amount, paid (sum of payments) and remaining (total_amount - paid). Order by invoice_id.',
      solution: `SELECT i.invoice_id, i.total_amount, SUM(p.amount) AS paid, i.total_amount - SUM(p.amount) AS remaining FROM invoices i JOIN payments p ON p.invoice_id = i.invoice_id WHERE i.status = 'Partially Paid' GROUP BY i.invoice_id, i.total_amount ORDER BY i.invoice_id;`,
      hints: ['Join invoices to payments on invoice_id.', 'Filter status = \'Partially Paid\'.', 'GROUP BY invoice_id, total_amount and SUM(p.amount).', 'remaining = i.total_amount - SUM(p.amount); ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which syntax does SQLite use to update from another table?', options: ['UPDATE t JOIN s SET ...', 'UPDATE t SET ... FROM s WHERE ...', 'MERGE only', 'It is impossible'], answer: 1, why: 'SQLite 3.33+ supports UPDATE ... FROM like PostgreSQL.' },
      { q: 'A target row matches 3 source rows. What happens?', options: ['Updated 3 times, summed', 'An arbitrary one of the matches is used', 'Error in all databases', 'Row is skipped'], answer: 1, why: 'Results are unpredictable; aggregate the source to one row per key.' },
    ],
  },
  // ---------------------------------------------------------------- 06
  {
    id: 'dml-06',
    goals: ['Remove rows with DELETE FROM ... WHERE', 'How foreign keys protect related rows', 'Soft delete vs hard delete', 'Previewing and counting what will be deleted'],
    concept: `<p><b>DELETE</b> removes whole rows that match the WHERE clause:</p>
<pre>DELETE FROM invoices WHERE invoice_id = 37;</pre>
<p>Like UPDATE, <b>no WHERE means every row is deleted</b>.</p>
<p>Foreign keys protect related data: you cannot delete an invoice that still has charges or payments pointing at it (unless the FK says <code>ON DELETE CASCADE</code>). Invoice 37 is a Void invoice with no charges, so it can be deleted safely.</p>
<p>In billing, records are often <b>soft deleted</b> (<code>status = 'Void'</code>) instead, because financial history must be kept for audits.</p>`,
    why: 'Test data, mistakes and expired temporary data must be removable, while real financial records must be protected.',
    when: 'Removing erroneous or expired rows. For audited financial data prefer voiding (UPDATE) over DELETE.',
    analogy: 'Shredding a folder. Before shredding, check that no other file references it, and ask whether regulations require you to keep it (soft delete = stamp it VOID and keep it).',
    syntax: `DELETE FROM table\nWHERE condition;`,
    sql: `-- preview\nSELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id = 37;\n\nDELETE FROM invoices\nWHERE invoice_id = 37;\n\nSELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id BETWEEN 34 AND 40;`,
    breakdown: [
      ['SELECT ... WHERE invoice_id = 37', 'Preview the row that will disappear'],
      ['DELETE FROM invoices', 'Target table'],
      ['WHERE invoice_id = 37', 'Only the empty Void invoice'],
    ],
    visual: { type: 'dml', statement: `DELETE FROM invoices WHERE invoice_id = 37`, view: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id BETWEEN 34 AND 40`, key: 'invoice_id' },
    internals: `<p>The engine locates matching rows, logs them for rollback, removes them from the table B-tree and every index, and checks foreign keys that reference the table. Freed pages are reused later; the file does not shrink until VACUUM (SQLite/PostgreSQL) or a rebuild.</p>`,
    mistakes: [
      { wrong: `DELETE FROM invoices WHERE invoice_id = 13;`, why: 'Invoice 13 has charges and payments. With foreign keys enforced this fails; without them it leaves orphaned child rows.', fix: `UPDATE invoices SET status = 'Void' WHERE invoice_id = 13;` },
      { wrong: `DELETE FROM payments;`, why: 'No WHERE: every payment is gone.', fix: `DELETE FROM payments WHERE payment_id = 47;` },
      { wrong: `DELETE invoice_id FROM invoices WHERE invoice_id = 37;`, why: 'DELETE removes whole rows; you do not list columns. To blank one column use UPDATE ... SET col = NULL.', fix: `DELETE FROM invoices WHERE invoice_id = 37;` },
    ],
    rules: ['Preview with SELECT using the same WHERE.', 'No WHERE = delete everything.', 'Delete children before parents (or use ON DELETE CASCADE deliberately).', 'Prefer soft delete for financial/audit data.'],
    compare: `<table><tr><th></th><th>DELETE</th><th>Soft delete (UPDATE)</th><th>TRUNCATE</th></tr>
<tr><td>Removes data</td><td>Matching rows</td><td>No (flags it)</td><td>All rows</td></tr>
<tr><td>WHERE</td><td>Yes</td><td>Yes</td><td>No</td></tr>
<tr><td>Audit trail</td><td>Lost</td><td>Kept</td><td>Lost</td></tr></table>`,
    realWorld: 'Billing systems almost never hard-delete invoices; they void them. DELETE is used for staging tables, session data and correcting test entries.',
    deep: `<p>Foreign key actions: <code>ON DELETE RESTRICT/NO ACTION</code> (block), <code>CASCADE</code> (delete children too), <code>SET NULL</code>, <code>SET DEFAULT</code>. SQLite enforces foreign keys only when <code>PRAGMA foreign_keys = ON</code>. Deleting millions of rows at once creates huge undo logs and long locks; delete in batches (e.g. 10,000 rows per transaction).</p>`,
    tryIt: { prompt: 'Soft-delete invoice 13 by voiding it. Then uncomment the DELETE and run it on its own: the foreign key from charges blocks it.', starter: `UPDATE invoices SET status = 'Void' WHERE invoice_id = 13;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 13;\n\n-- hard delete (fails: invoice 13 still has charges and payments):\n-- DELETE FROM invoices WHERE invoice_id = 13;` },
    challenge: {
      level: 2,
      prompt: 'Before deleting Void invoices, verify they have no dependents: for each Void invoice return invoice_id and the number of related charges, payments and transactions. Order by invoice_id.',
      solution: `SELECT i.invoice_id, (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id) AS n_charges, (SELECT COUNT(*) FROM payments p WHERE p.invoice_id = i.invoice_id) AS n_payments, (SELECT COUNT(*) FROM transactions t WHERE t.invoice_id = i.invoice_id) AS n_transactions FROM invoices i WHERE i.status = 'Void' ORDER BY i.invoice_id;`,
      hints: ['Start from invoices WHERE status = \'Void\'.', 'Use one correlated COUNT(*) subquery per child table.', 'For example (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id).', 'Repeat for payments and transactions; ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'DELETE FROM charges; does what?', options: ['Drops the table', 'Deletes every row, keeps the table', 'Errors without WHERE', 'Deletes the first row'], answer: 1, why: 'The table structure remains; all rows are removed.' },
      { q: 'Why do billing systems usually void instead of delete invoices?', options: ['DELETE is slow', 'Audit and legal requirements to keep financial history', 'SQL cannot delete invoices', 'To save space'], answer: 1, why: 'Financial records must remain traceable.' },
    ],
  },
  // ---------------------------------------------------------------- 07
  {
    id: 'dml-07',
    goals: ['Delete rows based on another table', 'Portable forms: WHERE IN / WHERE EXISTS', 'DELETE ... JOIN (MySQL, SQL Server) and DELETE ... USING (PostgreSQL)', 'Anti-join deletes (rows with no match)'],
    concept: `<p>Sometimes which rows to delete depends on <b>another table</b>. Example: invoice 1 received a duplicate patient payment (payment 47) that was reversed by a REFUND transaction whose <code>reference_id</code> is 47. We want to delete payments that have a REFUND pointing at them.</p>
<p>SQLite has no <code>DELETE ... JOIN</code>, so we use a subquery with <code>EXISTS</code> (or <code>IN</code>), which works in every database:</p>
<pre>DELETE FROM payments
WHERE EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.transaction_type = 'REFUND'
    AND t.reference_id = payments.payment_id
);</pre>`,
    why: 'Clean-ups usually depend on relationships: refunded payments, orphaned rows, rows matched in a staging table.',
    when: 'Removing rows that have (or lack) matching rows elsewhere.',
    analogy: 'Pulling every payment slip that has a matching refund memo stapled to the refunds binder.',
    syntax: `DELETE FROM target\nWHERE EXISTS (SELECT 1 FROM other o WHERE o.key = target.key AND ...);`,
    sql: `DELETE FROM payments\nWHERE EXISTS (\n  SELECT 1 FROM transactions t\n  WHERE t.transaction_type = 'REFUND'\n    AND t.reference_id = payments.payment_id\n);\n\nSELECT payment_id, invoice_id, payment_date, amount, method\nFROM payments\nWHERE invoice_id = 1;`,
    breakdown: [
      ['DELETE FROM payments', 'Target table'],
      ['WHERE EXISTS (SELECT 1 FROM transactions t ...', 'Keep the payment only if no REFUND references it'],
      ['t.reference_id = payments.payment_id', 'Correlation: links the refund to the payment it reversed (payment 47)'],
    ],
    visual: { type: 'dml', statement: `DELETE FROM payments WHERE EXISTS (SELECT 1 FROM transactions t WHERE t.transaction_type = 'REFUND' AND t.reference_id = payments.payment_id)`, view: `SELECT payment_id, invoice_id, payment_date, amount, method FROM payments WHERE invoice_id = 1`, key: 'payment_id' },
    internals: `<p>The engine evaluates the subquery for each candidate row (or converts it into a semi-join). An index on the correlation column (here transactions(reference_id)) keeps it fast. Rows are collected first and then deleted, so the subquery is not affected by deletions in progress.</p>`,
    mistakes: [
      { wrong: `DELETE p FROM payments p JOIN transactions t ON t.reference_id = p.payment_id WHERE t.transaction_type = 'REFUND';`, why: 'DELETE ... JOIN is MySQL/SQL Server syntax and fails in SQLite.', fix: `DELETE FROM payments WHERE payment_id IN (SELECT reference_id FROM transactions WHERE transaction_type = 'REFUND');` },
      { wrong: `DELETE FROM patients WHERE patient_id NOT IN (SELECT payor_id FROM invoices);`, why: 'Wrong column, and NOT IN with a NULL in the list (payor_id has NULLs) deletes nothing. Use NOT EXISTS for anti-join deletes.', fix: `DELETE FROM patients WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = patients.patient_id);` },
    ],
    rules: ['EXISTS / IN subqueries work in every database.', 'Use NOT EXISTS (not NOT IN) for "has no match" deletes.', 'Preview with the equivalent SELECT.', 'Index the columns used to correlate.'],
    compare: `<table><tr><th>Database</th><th>Join-style delete</th></tr>
<tr><td>SQLite</td><td>WHERE EXISTS / IN (subquery) only</td></tr>
<tr><td>PostgreSQL</td><td>DELETE FROM p USING t WHERE ...</td></tr>
<tr><td>MySQL</td><td>DELETE p FROM p JOIN t ON ...</td></tr>
<tr><td>SQL Server</td><td>DELETE p FROM p JOIN t ON ...</td></tr>
<tr><td>Oracle</td><td>WHERE EXISTS / IN (subquery)</td></tr></table>`,
    realWorld: 'Data-quality jobs remove staging rows that already exist in production, or prospective patients who never had a visit after 2 years.',
    deep: `<p>In SQL Server and MySQL a join delete can remove rows from the target that match several source rows only once, but the join can still multiply work. With large anti-join deletes, PostgreSQL turns <code>NOT EXISTS</code> into a hash anti join, which is far more efficient than <code>NOT IN</code>.</p>`,
    dialectSql: {
      sqlite: `DELETE FROM payments\nWHERE EXISTS (SELECT 1 FROM transactions t\n              WHERE t.transaction_type = 'REFUND'\n                AND t.reference_id = payments.payment_id);`,
      postgres: `DELETE FROM payments p\nUSING transactions t\nWHERE t.reference_id = p.payment_id\n  AND t.transaction_type = 'REFUND';`,
      mysql: `DELETE p\nFROM payments p\nJOIN transactions t ON t.reference_id = p.payment_id\nWHERE t.transaction_type = 'REFUND';`,
      sqlserver: `DELETE p\nFROM payments p\nJOIN transactions t ON t.reference_id = p.payment_id\nWHERE t.transaction_type = 'REFUND';`,
    },
    tryIt: { prompt: 'Delete patients who have no invoices at all (an anti-join delete) and see how many remain.', starter: `DELETE FROM patients\nWHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = patients.patient_id);\n\nSELECT COUNT(*) AS remaining_patients FROM patients;` },
    challenge: {
      level: 2,
      prompt: 'A clean-up job will DELETE patients who have never been invoiced. Write the SELECT that identifies them: patient_id, first_name, last_name. Order by patient_id.',
      solution: `SELECT p.patient_id, p.first_name, p.last_name FROM patients p WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id) ORDER BY p.patient_id;`,
      hints: ['This is an anti-join: patients with no matching invoice.', 'Use WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE ...).', 'Correlate with i.patient_id = p.patient_id.', 'ORDER BY p.patient_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Does SQLite support DELETE ... JOIN?', options: ['Yes', 'No; use WHERE EXISTS / IN', 'Only with USING', 'Only in triggers'], answer: 1, why: 'SQLite deletes from one table filtered by subqueries.' },
      { q: 'Best way to delete rows with no match in another table?', options: ['NOT IN', 'NOT EXISTS', 'LEFT JOIN in DELETE', 'EXCEPT'], answer: 1, why: 'NOT EXISTS is NULL-safe and efficient.' },
    ],
  },
  // ---------------------------------------------------------------- 08
  {
    id: 'dml-08',
    dialect: 'postgres',
    goals: ['What TRUNCATE does and how it differs from DELETE', 'Why TRUNCATE is fast', 'Its restrictions: no WHERE, foreign keys, triggers, identity reset', 'The SQLite equivalent: DELETE FROM table'],
    concept: `<p><b>TRUNCATE TABLE</b> removes <b>all</b> rows from a table instantly. Instead of deleting row by row, it deallocates the table\'s data pages, so it is very fast even on huge tables.</p>
<p>Differences from <code>DELETE FROM table</code>:</p>
<ul>
<li>No WHERE clause: always everything.</li>
<li>Row-level DELETE triggers do not fire.</li>
<li>Usually resets identity/auto-increment counters.</li>
<li>Fails if other tables reference it with foreign keys (PostgreSQL has <code>CASCADE</code>).</li>
<li>In MySQL and Oracle it is DDL and <b>commits implicitly</b> (cannot be rolled back); in PostgreSQL and SQL Server it can be rolled back.</li>
</ul>
<p><b>SQLite has no TRUNCATE.</b> Use <code>DELETE FROM table;</code> without WHERE: SQLite recognises it and uses a fast "truncate optimization" (when there are no triggers).</p>`,
    why: 'Staging and scratch tables are emptied and reloaded constantly; deleting row by row would be slow and create huge logs.',
    when: 'Emptying staging tables before a nightly load, resetting test data. Never on tables holding real billing history.',
    analogy: 'Emptying a whole mail tray into the recycling bin at once, instead of taking out envelopes one by one and logging each.',
    syntax: `-- PostgreSQL / SQL Server / MySQL / Oracle\nTRUNCATE TABLE table_name;\n-- SQLite\nDELETE FROM table_name;`,
    sql: `TRUNCATE TABLE payments;`,
    dialectSql: {
      postgres: `TRUNCATE TABLE payments;\n-- also reset identity and cascade to referencing tables:\nTRUNCATE TABLE invoices RESTART IDENTITY CASCADE;`,
      mysql: `TRUNCATE TABLE payments;  -- implicit commit, resets AUTO_INCREMENT`,
      sqlserver: `TRUNCATE TABLE payments;  -- resets IDENTITY; fails if referenced by a FK`,
      oracle: `TRUNCATE TABLE payments;  -- DDL: implicit commit, cannot roll back`,
      sqlite: `DELETE FROM payments;  -- no TRUNCATE; fast "truncate optimization"`,
    },
    breakdown: [
      ['TRUNCATE TABLE payments', 'Remove every row from payments at once (not runnable in SQLite)'],
      ['SQLite: DELETE FROM payments', 'The equivalent here: DELETE without WHERE'],
    ],
    visual: { type: 'dml', statement: `DELETE FROM payments`, view: `SELECT payment_id, invoice_id, amount, method FROM payments WHERE payment_id <= 6`, key: 'payment_id' },
    internals: `<p>PostgreSQL TRUNCATE creates a new empty data file for the table and drops the old one at commit; it takes an ACCESS EXCLUSIVE lock. SQL Server logs only page deallocations (minimal logging). SQLite\'s DELETE without WHERE on a table without triggers drops and recreates the B-tree pages in one step instead of visiting each row.</p>`,
    mistakes: [
      { wrong: `TRUNCATE TABLE payments WHERE payment_date < '2025-06-01';`, why: 'TRUNCATE has no WHERE; it always removes everything.', fix: `DELETE FROM payments WHERE payment_date < '2025-06-01';` },
      { wrong: `TRUNCATE TABLE invoices;  -- charges and payments reference invoices`, why: 'Tables referenced by foreign keys cannot be truncated (PostgreSQL needs CASCADE, which also empties the child tables).', fix: `DELETE FROM payments;` },
    ],
    rules: ['TRUNCATE = remove all rows fast; no WHERE.', 'Triggers do not fire; identities usually reset.', 'MySQL/Oracle: implicit commit, no rollback.', 'SQLite: use DELETE FROM table.'],
    compare: `<table><tr><th></th><th>DELETE FROM t</th><th>TRUNCATE TABLE t</th><th>DROP TABLE t</th></tr>
<tr><td>Removes</td><td>Rows (WHERE allowed)</td><td>All rows</td><td>Rows + table</td></tr>
<tr><td>Speed on big table</td><td>Slow (per row)</td><td>Fast</td><td>Fast</td></tr>
<tr><td>Triggers</td><td>Fire</td><td>Do not fire</td><td>-</td></tr>
<tr><td>Rollback</td><td>Yes</td><td>PG/SQL Server yes; MySQL/Oracle no</td><td>PG/SQL Server yes</td></tr>
<tr><td>Identity</td><td>Kept</td><td>Reset</td><td>Gone</td></tr></table>`,
    realWorld: 'ETL pipelines TRUNCATE a claims staging table, bulk-load the day\'s 837 file into it, validate, then insert into production tables.',
    deep: `<p>Because TRUNCATE does not scan rows it cannot check row-level conditions, which is why foreign key references block it. In PostgreSQL, TRUNCATE is not MVCC-safe: a concurrent transaction with an older snapshot will see the table as empty after the TRUNCATE commits.</p>`,
    tryIt: { prompt: 'Empty the payments table the SQLite way, then count rows. Wrap it in a transaction and roll back to get the data back.', starter: `BEGIN;\nDELETE FROM payments;\nSELECT COUNT(*) AS rows_after_delete FROM payments;\nROLLBACK;\n\nSELECT COUNT(*) AS rows_after_rollback FROM payments;` },
    challenge: {
      level: 1,
      prompt: 'Before emptying the payments and transactions staging copies, record how many rows each holds: return two rows (table_name, row_count) for payments and transactions, ordered by table_name.',
      solution: `SELECT 'payments' AS table_name, COUNT(*) AS row_count FROM payments UNION ALL SELECT 'transactions', COUNT(*) FROM transactions ORDER BY table_name;`,
      hints: ['Count each table with COUNT(*).', 'Label each count with a constant string.', 'Combine the two SELECTs with UNION ALL.', 'Add ORDER BY table_name at the end.'],
      ordered: true,
    },
    quiz: [
      { q: 'Can TRUNCATE remove only some rows?', options: ['Yes, with WHERE', 'No, always all rows', 'Only with LIMIT', 'Only in PostgreSQL'], answer: 1, why: 'Use DELETE ... WHERE for partial removal.' },
      { q: 'SQLite equivalent of TRUNCATE TABLE payments?', options: ['DROP TABLE payments', 'DELETE FROM payments', 'VACUUM payments', 'TRUNCATE payments'], answer: 1, why: 'SQLite has no TRUNCATE; DELETE without WHERE is optimized.' },
    ],
  },
  // ---------------------------------------------------------------- 09
  {
    id: 'dml-09',
    dialect: 'sqlserver',
    goals: ['What MERGE does: insert, update (and delete) in one statement', 'WHEN MATCHED / WHEN NOT MATCHED clauses', 'MERGE support across databases', 'The SQLite equivalent: INSERT ... ON CONFLICT DO UPDATE'],
    concept: `<p><b>MERGE</b> synchronizes a target table with a source (a staging table or a list of values). For each source row it checks whether a matching target row exists:</p>
<ul>
<li><b>WHEN MATCHED</b> -&gt; UPDATE (or DELETE) the target row.</li>
<li><b>WHEN NOT MATCHED</b> -&gt; INSERT a new row.</li>
<li><b>WHEN NOT MATCHED BY SOURCE</b> (SQL Server) -&gt; the target row is missing from the source: often DELETE or deactivate.</li>
</ul>
<p>Example: the payor contract file arrives monthly. Aetna\'s rate changed (update) and Humana Gold is new (insert).</p>
<p><b>SQLite has no MERGE.</b> Its equivalent for insert-or-update is <code>INSERT ... ON CONFLICT (key) DO UPDATE</code> (UPSERT), shown in the visual.</p>`,
    why: 'Loading external reference files (payors, CPT fee schedules, provider rosters) needs "update what exists, add what is new" in one reliable step.',
    when: 'Syncing a target table with a staging table or feed.',
    analogy: 'Reconciling the monthly contract list from the insurance department with your payor binder: update pages that changed, add pages for new insurers, and flag insurers that disappeared.',
    syntax: `MERGE INTO target AS t\nUSING source AS s\n  ON t.key = s.key\nWHEN MATCHED THEN UPDATE SET ...\nWHEN NOT MATCHED THEN INSERT (...) VALUES (...);`,
    sql: `MERGE INTO payors AS t\nUSING (VALUES\n    (2, 'Aetna Care',  'Commercial', '800-555-0102', 0.77),\n    (8, 'Humana Gold', 'Medicare',   '800-555-0108', 0.68)\n) AS s (payor_id, payor_name, payor_type, phone, contract_rate)\n  ON t.payor_id = s.payor_id\nWHEN MATCHED THEN\n  UPDATE SET contract_rate = s.contract_rate\nWHEN NOT MATCHED THEN\n  INSERT (payor_id, payor_name, payor_type, phone, contract_rate, is_active)\n  VALUES (s.payor_id, s.payor_name, s.payor_type, s.phone, s.contract_rate, 1);`,
    dialectSql: {
      sqlserver: `MERGE INTO payors AS t\nUSING (VALUES (2, 'Aetna Care', 'Commercial', '800-555-0102', 0.77),\n             (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.68))\n  AS s (payor_id, payor_name, payor_type, phone, contract_rate)\n  ON t.payor_id = s.payor_id\nWHEN MATCHED THEN UPDATE SET contract_rate = s.contract_rate\nWHEN NOT MATCHED THEN INSERT (payor_id, payor_name, payor_type, phone, contract_rate, is_active)\n  VALUES (s.payor_id, s.payor_name, s.payor_type, s.phone, s.contract_rate, 1);`,
      postgres: `-- PostgreSQL 15+\nMERGE INTO payors t\nUSING (VALUES (2, 'Aetna Care', 'Commercial', '800-555-0102', 0.77),\n              (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.68))\n  AS s (payor_id, payor_name, payor_type, phone, contract_rate)\n  ON t.payor_id = s.payor_id\nWHEN MATCHED THEN UPDATE SET contract_rate = s.contract_rate\nWHEN NOT MATCHED THEN INSERT VALUES (s.payor_id, s.payor_name, s.payor_type, s.phone, s.contract_rate, 1);`,
      oracle: `MERGE INTO payors t\nUSING (SELECT 2 payor_id, 0.77 contract_rate FROM dual\n       UNION ALL SELECT 8, 0.68 FROM dual) s\n  ON (t.payor_id = s.payor_id)\nWHEN MATCHED THEN UPDATE SET t.contract_rate = s.contract_rate\nWHEN NOT MATCHED THEN INSERT (payor_id, contract_rate) VALUES (s.payor_id, s.contract_rate);`,
      mysql: `-- MySQL has no MERGE\nINSERT INTO payors (payor_id, payor_name, payor_type, phone, contract_rate, is_active)\nVALUES (2, 'Aetna Care', 'Commercial', '800-555-0102', 0.77, 1),\n       (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.68, 1)\nON DUPLICATE KEY UPDATE contract_rate = VALUES(contract_rate);`,
      sqlite: `-- SQLite has no MERGE: use UPSERT\nINSERT INTO payors (payor_id, payor_name, payor_type, phone, contract_rate, is_active)\nVALUES (2, 'Aetna Care', 'Commercial', '800-555-0102', 0.77, 1),\n       (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.68, 1)\nON CONFLICT (payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;`,
    },
    breakdown: [
      ['MERGE INTO payors AS t', 'The target table'],
      ['USING (VALUES ...) AS s (...)', 'The source rows (normally a staging table)'],
      ['ON t.payor_id = s.payor_id', 'How source and target rows are matched'],
      ['WHEN MATCHED THEN UPDATE ...', 'Payor 2 exists: its contract_rate becomes 0.77'],
      ['WHEN NOT MATCHED THEN INSERT ...', 'Payor 8 is new: it is inserted'],
    ],
    visual: { type: 'dml', statement: `INSERT INTO payors (payor_id, payor_name, payor_type, phone, contract_rate, is_active) VALUES (2, 'Aetna Care', 'Commercial', '800-555-0102', 0.77, 1), (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.68, 1) ON CONFLICT (payor_id) DO UPDATE SET contract_rate = excluded.contract_rate`, view: `SELECT payor_id, payor_name, payor_type, contract_rate FROM payors`, key: 'payor_id' },
    internals: `<p>MERGE is executed as a join between source and target (often a full outer join when NOT MATCHED BY SOURCE is used), and each joined row is routed to the matching WHEN branch. If a target row matches two source rows, SQL Server and PostgreSQL raise an error: the source must be unique on the match key.</p>`,
    mistakes: [
      { wrong: `MERGE INTO payors t USING staging s ON t.payor_name = s.payor_name ...  -- staging has two 'Aetna Care' rows`, why: 'A target row may be affected only once; duplicate source keys cause an error. De-duplicate the source first.', fix: `SELECT payor_name, COUNT(*) FROM payors GROUP BY payor_name HAVING COUNT(*) > 1;` },
      { wrong: `MERGE INTO payors t USING staging s ON t.payor_id = s.payor_id WHEN MATCHED THEN UPDATE SET contract_rate = s.contract_rate;  -- in SQLite`, why: 'SQLite (and MySQL) have no MERGE statement. Use INSERT ... ON CONFLICT DO UPDATE on a unique key instead. (In SQL Server, also remember MERGE must end with a semicolon.)', fix: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate) VALUES (2, 'Aetna Care', 'Commercial', 0.77)\nON CONFLICT (payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;` },
    ],
    rules: ['Source must be unique on the match key.', 'MATCHED -> update/delete; NOT MATCHED -> insert.', 'SQLite and MySQL: use UPSERT instead.', 'Under concurrency MERGE is not automatically race-free; use proper locking or unique constraints.'],
    compare: `<table><tr><th>Database</th><th>Statement</th></tr>
<tr><td>SQL Server, Oracle, DB2</td><td>MERGE</td></tr>
<tr><td>PostgreSQL 15+</td><td>MERGE, or INSERT ... ON CONFLICT</td></tr>
<tr><td>MySQL</td><td>INSERT ... ON DUPLICATE KEY UPDATE</td></tr>
<tr><td>SQLite</td><td>INSERT ... ON CONFLICT DO UPDATE / DO NOTHING</td></tr></table>`,
    realWorld: 'Monthly CMS fee schedule and payor contract files are loaded into staging tables and merged into production reference tables.',
    deep: `<p>SQL Server\'s <code>OUTPUT $action, inserted.*, deleted.*</code> reports which branch each row took, useful for audit logs. MERGE has had concurrency bugs and surprises in SQL Server; many teams use <code>HOLDLOCK</code> hints or separate UPDATE + INSERT statements inside a serializable transaction.</p>`,
    tryIt: { prompt: 'Run the SQLite equivalent (UPSERT) and look at the payors table.', starter: `INSERT INTO payors (payor_id, payor_name, payor_type, phone, contract_rate, is_active)\nVALUES (2, 'Aetna Care', 'Commercial', '800-555-0102', 0.77, 1),\n       (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.68, 1)\nON CONFLICT (payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;\n\nSELECT * FROM payors;` },
    challenge: {
      level: 3,
      prompt: 'Preview what a MERGE of this contract file would do. Incoming rows (payor_name, contract_rate): (\'Aetna Care\', 0.77), (\'Humana Gold\', 0.68), (\'State Medicaid\', 0.55). Return payor_name and the action: \'INSERT\' if the name does not exist, \'UPDATE\' if it exists with a different rate, \'NO CHANGE\' otherwise. Order by payor_name.',
      solution: `WITH incoming(payor_name, contract_rate) AS (VALUES ('Aetna Care', 0.77), ('Humana Gold', 0.68), ('State Medicaid', 0.55)) SELECT i.payor_name, CASE WHEN p.payor_id IS NULL THEN 'INSERT' WHEN p.contract_rate <> i.contract_rate THEN 'UPDATE' ELSE 'NO CHANGE' END AS action FROM incoming i LEFT JOIN payors p ON p.payor_name = i.payor_name ORDER BY i.payor_name;`,
      hints: ['Put the incoming rows in a CTE: WITH incoming(payor_name, contract_rate) AS (VALUES ...).', 'LEFT JOIN payors on payor_name, so new names get NULLs.', 'CASE WHEN p.payor_id IS NULL THEN \'INSERT\' WHEN p.contract_rate <> i.contract_rate THEN \'UPDATE\' ELSE \'NO CHANGE\' END.', 'ORDER BY i.payor_name.'],
      ordered: true,
    },
    quiz: [
      { q: 'What does WHEN NOT MATCHED usually do in MERGE?', options: ['Update', 'Insert the source row', 'Delete the target row', 'Nothing'], answer: 1, why: 'No target row exists, so the source row is inserted.' },
      { q: 'SQLite alternative to MERGE for insert-or-update?', options: ['REPLACE only', 'INSERT ... ON CONFLICT DO UPDATE', 'UPDATE ... JOIN', 'There is none'], answer: 1, why: 'UPSERT handles the matched/not-matched cases for a unique key.' },
    ],
  },
  // ---------------------------------------------------------------- 10
  {
    id: 'dml-10',
    goals: ['INSERT ... ON CONFLICT DO UPDATE / DO NOTHING', 'The conflict target (a PRIMARY KEY or UNIQUE column)', 'Using excluded.col for the incoming value', 'UPSERT vs INSERT OR REPLACE'],
    concept: `<p><b>UPSERT</b> = "insert, or update if it already exists". You try to INSERT; if it would violate a UNIQUE or PRIMARY KEY constraint (a <b>conflict</b>), you do something else instead:</p>
<pre>INSERT INTO payors (payor_name, payor_type, phone, contract_rate)
VALUES ('United Workers Comp', 'Workers Comp', '800-555-0105', 0.90)
ON CONFLICT (payor_name) DO UPDATE SET phone = excluded.phone;</pre>
<ul>
<li><code>ON CONFLICT (payor_name)</code>: which unique column decides "already exists".</li>
<li><code>excluded.phone</code>: the value you tried to insert.</li>
<li><code>DO NOTHING</code>: skip conflicting rows silently.</li>
</ul>`,
    why: 'Feeds often resend rows the system already has. UPSERT handles new and existing rows in one atomic, race-free statement.',
    when: 'Loading reference data, syncing records from an external system, maintaining counters or summary rows.',
    analogy: 'At registration: if the patient already has a chart, update their phone number on it; if not, open a new chart.',
    syntax: `INSERT INTO t (key_col, c2) VALUES (?, ?)\nON CONFLICT (key_col) DO UPDATE SET c2 = excluded.c2;\n-- or\nON CONFLICT (key_col) DO NOTHING;`,
    sql: `INSERT INTO payors (payor_name, payor_type, phone, contract_rate)\nVALUES ('United Workers Comp', 'Workers Comp', '800-555-0105', 0.90),\n       ('Humana Gold', 'Medicare', '800-555-0108', 0.68)\nON CONFLICT (payor_name) DO UPDATE\n  SET phone = excluded.phone,\n      contract_rate = excluded.contract_rate;\n\nSELECT payor_id, payor_name, phone, contract_rate FROM payors;`,
    breakdown: [
      ['INSERT INTO payors (...) VALUES (...), (...)', 'Two incoming rows'],
      ['ON CONFLICT (payor_name)', 'payor_name is UNIQUE: \'United Workers Comp\' already exists (payor 5)'],
      ['DO UPDATE SET phone = excluded.phone, ...', 'Existing payor 5 gets the phone number that was NULL'],
      ['(no conflict for \'Humana Gold\')', 'Inserted as a new payor with the next id'],
    ],
    visual: { type: 'dml', statement: `INSERT INTO payors (payor_name, payor_type, phone, contract_rate) VALUES ('United Workers Comp', 'Workers Comp', '800-555-0105', 0.90), ('Humana Gold', 'Medicare', '800-555-0108', 0.68) ON CONFLICT (payor_name) DO UPDATE SET phone = excluded.phone, contract_rate = excluded.contract_rate`, view: `SELECT payor_id, payor_name, phone, contract_rate FROM payors`, key: 'payor_id' },
    internals: `<p>For each row the engine attempts the insert, checking the unique index named in the conflict target. On a conflict it switches to updating the existing row, all within the same statement and lock, so no other session can sneak in between the check and the write. A plain "SELECT, then INSERT or UPDATE" in application code has a race window.</p>`,
    mistakes: [
      { wrong: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Aetna Care', 'Commercial', 0.77)\nON CONFLICT (payor_type) DO UPDATE SET contract_rate = excluded.contract_rate;`, why: 'The conflict target must have a UNIQUE or PRIMARY KEY constraint. payor_type is not unique, so this errors.', fix: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Aetna Care', 'Commercial', 0.77)\nON CONFLICT (payor_name) DO UPDATE SET contract_rate = excluded.contract_rate;` },
      { wrong: `INSERT OR REPLACE INTO payors (payor_id, payor_name, payor_type, contract_rate) VALUES (5, 'United Workers Comp', 'Workers Comp', 0.9);`, why: 'REPLACE deletes the old row and inserts a new one: phone and is_active are reset to NULL/default, and ON DELETE actions fire.', fix: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate) VALUES (5, 'United Workers Comp', 'Workers Comp', 0.9)\nON CONFLICT (payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;` },
    ],
    rules: ['The conflict target must be a UNIQUE / PRIMARY KEY column set.', 'excluded.col = the value you tried to insert.', 'DO NOTHING skips duplicates.', 'Prefer ON CONFLICT DO UPDATE over INSERT OR REPLACE.'],
    compare: `<table><tr><th>Database</th><th>UPSERT syntax</th></tr>
<tr><td>SQLite 3.24+ / PostgreSQL 9.5+</td><td>ON CONFLICT (...) DO UPDATE / DO NOTHING</td></tr>
<tr><td>MySQL</td><td>ON DUPLICATE KEY UPDATE; INSERT IGNORE</td></tr>
<tr><td>SQL Server / Oracle</td><td>MERGE</td></tr></table>`,
    realWorld: 'Eligibility feeds resend the whole member list daily; UPSERT on member id updates changed coverage and adds new members without duplicates.',
    deep: `<p>A <code>WHERE</code> on the DO UPDATE clause makes updates conditional: <code>DO UPDATE SET contract_rate = excluded.contract_rate WHERE excluded.contract_rate &lt;&gt; payors.contract_rate</code> avoids writing unchanged rows. In SQLite, <code>INSERT ... SELECT ... ON CONFLICT</code> needs a <code>WHERE true</code> in the SELECT to avoid a parsing ambiguity.</p>`,
    tryIt: { prompt: 'Try DO NOTHING: re-insert the existing payor \'Self-Pay\' and a new one; only the new one appears.', starter: `INSERT INTO payors (payor_name, payor_type, contract_rate)\nVALUES ('Self-Pay', 'Self-Pay', 1.0),\n       ('Tricare East', 'Commercial', 0.72)\nON CONFLICT (payor_name) DO NOTHING;\n\nSELECT * FROM payors;` },
    challenge: {
      level: 3,
      prompt: 'An UPSERT keyed on payor_name will receive: (\'Aetna Care\', 0.77), (\'Humana Gold\', 0.68), (\'Medicare Part B\', 0.65), (\'Tricare East\', 0.72). Write the SELECT returning the incoming names that will hit the DO UPDATE branch (already exist), with their current and incoming rate. Order by payor_name.',
      solution: `WITH incoming(payor_name, contract_rate) AS (VALUES ('Aetna Care', 0.77), ('Humana Gold', 0.68), ('Medicare Part B', 0.65), ('Tricare East', 0.72)) SELECT i.payor_name, p.contract_rate AS current_rate, i.contract_rate AS incoming_rate FROM incoming i JOIN payors p ON p.payor_name = i.payor_name ORDER BY i.payor_name;`,
      hints: ['Put the incoming rows in a CTE with VALUES.', 'Existing names are the ones that JOIN to payors on payor_name.', 'An INNER JOIN keeps only the conflicting names.', 'Select name, p.contract_rate, i.contract_rate; ORDER BY payor_name.'],
      ordered: true,
    },
    quiz: [
      { q: 'In ON CONFLICT DO UPDATE, what is excluded.phone?', options: ['The old phone', 'The phone value you tried to insert', 'A deleted row', 'NULL'], answer: 1, why: 'excluded refers to the proposed row.' },
      { q: 'What does INSERT OR REPLACE do on a conflict in SQLite?', options: ['Updates the listed columns only', 'Deletes the old row and inserts a new one', 'Skips the row', 'Errors'], answer: 1, why: 'Unlisted columns lose their old values.' },
    ],
  },
  // ---------------------------------------------------------------- 11
  {
    id: 'dml-11',
    goals: ['What a transaction is: a unit of work that succeeds or fails as a whole', 'BEGIN, COMMIT, ROLLBACK', 'Autocommit mode', 'Why multi-step billing changes need transactions'],
    concept: `<p>A <b>transaction</b> groups several statements into one <b>all-or-nothing</b> unit.</p>
<p>Posting a payment takes three changes: insert the payment, insert the ledger transaction, update the invoice status. If the system crashes after the first step, the books are inconsistent: money recorded but the invoice still says unpaid. Inside a transaction, either <b>all three</b> are saved (<code>COMMIT</code>) or <b>none</b> are (<code>ROLLBACK</code> or crash).</p>
<pre>BEGIN;
  INSERT INTO payments ...;
  INSERT INTO transactions ...;
  UPDATE invoices ...;
COMMIT;</pre>
<p>Without BEGIN, each statement is its own transaction (<b>autocommit</b>).</p>`,
    why: 'Real business operations touch several rows and tables. Transactions keep the data consistent even with errors, crashes and concurrent users.',
    when: 'Any time two or more changes must stay in sync: payments + ledger, transfers, invoice + its charges.',
    analogy: 'Posting a payment at the cashier: you take the money, write the receipt and stamp the invoice. If anything fails, you give the money back and tear up the receipt, as if nothing happened.',
    syntax: `BEGIN;            -- or BEGIN TRANSACTION / START TRANSACTION\n  statement 1;\n  statement 2;\nCOMMIT;           -- or ROLLBACK;`,
    sql: `BEGIN;\n\nINSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (6, NULL, '2026-09-01', 190, 'Credit Card');\n\nINSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, reference_id, posted_by)\nVALUES (6, '2026-09-01', 'PAYMENT', -190, last_insert_rowid(), 'cashier');\n\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 6;\n\nCOMMIT;\n\nSELECT invoice_id, status,\n  (SELECT SUM(amount) FROM transactions t WHERE t.invoice_id = 6) AS ledger_balance\nFROM invoices WHERE invoice_id = 6;`,
    breakdown: [
      ['BEGIN;', 'Start the unit of work'],
      ['INSERT INTO payments ...', 'Step 1: record the money'],
      ['INSERT INTO transactions ... last_insert_rowid()', 'Step 2: ledger entry linked to the new payment'],
      ['UPDATE invoices SET status = \'Paid\' ...', 'Step 3: invoice 6 now fully paid (ledger balance 0)'],
      ['COMMIT;', 'Make all three changes permanent together'],
    ],
    visual: { type: 'txn', scenario: 'commit' },
    internals: `<p>SQLite (rollback-journal mode) copies original pages to a journal file before changing them; COMMIT deletes the journal after syncing the database file. In WAL mode, changes are appended to the write-ahead log and COMMIT writes a commit record. Server databases write redo/undo logs (WAL, InnoDB redo log, SQL Server transaction log) and flush the log on COMMIT so committed work survives a crash.</p>`,
    mistakes: [
      { wrong: `INSERT INTO payments (invoice_id, payment_date, amount, method) VALUES (6, '2026-09-01', 190, 'Cash');\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 6;`, why: 'In autocommit mode each statement commits separately; a failure between them leaves the payment recorded but the invoice unpaid.', fix: `BEGIN;\nINSERT INTO payments (invoice_id, payment_date, amount, method) VALUES (6, '2026-09-01', 190, 'Cash');\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 6;\nCOMMIT;` },
      { wrong: `BEGIN;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 6;\n-- ...user goes to lunch, transaction left open`, why: 'Open transactions hold locks and block other sessions (and in PostgreSQL, prevent cleanup). Keep transactions short.', fix: `BEGIN;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 6;\nCOMMIT;` },
    ],
    rules: ['Group related changes in one transaction.', 'Keep transactions short: no user input in the middle.', 'COMMIT saves; ROLLBACK undoes.', 'Without BEGIN each statement autocommits.'],
    compare: `<table><tr><th>Database</th><th>Start</th><th>Default mode</th></tr>
<tr><td>SQLite</td><td>BEGIN [DEFERRED|IMMEDIATE|EXCLUSIVE]</td><td>Autocommit</td></tr>
<tr><td>PostgreSQL</td><td>BEGIN / START TRANSACTION</td><td>Autocommit</td></tr>
<tr><td>MySQL</td><td>START TRANSACTION</td><td>Autocommit (autocommit=1)</td></tr>
<tr><td>SQL Server</td><td>BEGIN TRANSACTION</td><td>Autocommit</td></tr>
<tr><td>Oracle</td><td>(implicit on first DML)</td><td>Transaction open until COMMIT</td></tr></table>`,
    realWorld: 'Payment posting, claim adjudication and refund processing all run inside transactions so the ledger always balances.',
    deep: `<p>Application frameworks wrap requests in transactions (Spring @Transactional, Django atomic, Rails transaction do). Beware of calling external services (payment gateways, email) inside a database transaction: the transaction can roll back while the external action cannot. Use an outbox table committed with the transaction instead.</p>`,
    tryIt: { prompt: 'Start a transaction, void invoice 5 and delete its charges, check the result, then ROLLBACK and check again.', starter: `BEGIN;\nUPDATE invoices SET status = 'Void' WHERE invoice_id = 5;\nDELETE FROM charges WHERE invoice_id = 5;\nSELECT status, (SELECT COUNT(*) FROM charges WHERE invoice_id = 5) AS n_charges FROM invoices WHERE invoice_id = 5;\nROLLBACK;\n\nSELECT status, (SELECT COUNT(*) FROM charges WHERE invoice_id = 5) AS n_charges FROM invoices WHERE invoice_id = 5;` },
    challenge: {
      level: 2,
      prompt: 'Before committing payments, a posting job checks each Partially Paid invoice\'s ledger balance. Return invoice_id and the sum of its transactions.amount (the balance still owed). Order by invoice_id.',
      solution: `SELECT i.invoice_id, SUM(t.amount) AS ledger_balance FROM invoices i JOIN transactions t ON t.invoice_id = i.invoice_id WHERE i.status = 'Partially Paid' GROUP BY i.invoice_id ORDER BY i.invoice_id;`,
      hints: ['The ledger lives in transactions.', 'Join invoices to transactions on invoice_id.', 'Filter status = \'Partially Paid\' and GROUP BY invoice_id.', 'SUM(t.amount); ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'The server crashes after the 2nd of 3 statements inside BEGIN...COMMIT. What survives?', options: ['Statements 1 and 2', 'Nothing from this transaction', 'Only statement 1', 'All three'], answer: 1, why: 'Uncommitted work is rolled back on recovery.' },
      { q: 'What is autocommit?', options: ['Each statement is its own transaction', 'Transactions never commit', 'Commits every minute', 'Only for SELECT'], answer: 0, why: 'Without an explicit BEGIN, each statement commits on its own.' },
    ],
  },
  // ---------------------------------------------------------------- 12
  {
    id: 'dml-12',
    goals: ['What COMMIT guarantees', 'When other sessions see your changes', 'Durability: committed data survives crashes', 'Commit frequency trade-offs'],
    concept: `<p><b>COMMIT</b> ends a transaction and makes all its changes <b>permanent</b> and <b>visible</b> to other sessions.</p>
<ul>
<li><b>Before COMMIT</b>: only your session sees your changes (at normal isolation levels). Others see the old data.</li>
<li><b>After COMMIT</b>: everyone sees the new data, and it survives power loss or crashes (durability).</li>
</ul>
<p>Once committed, a change cannot be rolled back; fixing it needs a new, compensating change (e.g. a REFUND transaction).</p>`,
    why: 'COMMIT is the promise point: after it, the payment is officially posted.',
    when: 'At the end of every successful unit of work, as soon as all its steps are done.',
    analogy: 'Signing and filing the day\'s deposit slip at the bank. Before signing you can still correct it; after, corrections need a new adjusting entry.',
    syntax: `BEGIN;\n  ...changes...\nCOMMIT;   -- also: COMMIT TRANSACTION; END; (SQLite/PostgreSQL)`,
    sql: `BEGIN;\n\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\n\nINSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (3, 2, '2026-09-01', 60, 'EFT');\n\nCOMMIT;\n\nSELECT i.invoice_id, i.status, i.total_amount, SUM(p.amount) AS paid\nFROM invoices i JOIN payments p ON p.invoice_id = i.invoice_id\nWHERE i.invoice_id = 3\nGROUP BY i.invoice_id;`,
    breakdown: [
      ['BEGIN;', 'Changes from here are private to this session'],
      ['UPDATE ... / INSERT ...', 'Invoice 3 paid by Aetna in full'],
      ['COMMIT;', 'Changes become durable and visible to all sessions'],
      ['SELECT ...', 'Verify: status Paid, paid = total'],
    ],
    visual: { type: 'txn', scenario: 'commit' },
    internals: `<p>On COMMIT the database forces its log to stable storage (fsync) before reporting success: that is what makes the change durable. Options like PostgreSQL <code>synchronous_commit = off</code> or SQLite <code>PRAGMA synchronous = OFF</code> skip or delay the fsync for speed, risking loss of the last few transactions on a crash (but not corruption, in PostgreSQL).</p>`,
    mistakes: [
      { wrong: `-- Commit after every single row while loading 100,000 charges`, why: 'Each commit forces a disk sync: very slow. Commit in batches.', fix: `BEGIN;\nINSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount) VALUES (5, '2026-09-01', 'CHARGE', 10);\nINSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount) VALUES (5, '2026-09-01', 'CHARGE', 12);\nCOMMIT;` },
      { wrong: `BEGIN;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\n-- forgot COMMIT; connection closes`, why: 'Closing the connection without COMMIT rolls the transaction back: the change is lost.', fix: `BEGIN;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\nCOMMIT;` },
    ],
    rules: ['COMMIT = permanent + visible.', 'Uncommitted work is lost on disconnect or crash.', 'Committed work can only be corrected by new changes.', 'Batch commits for bulk loads; commit promptly for interactive work.'],
    compare: `<table><tr><th></th><th>Before COMMIT</th><th>After COMMIT</th></tr>
<tr><td>Visible to others</td><td>No</td><td>Yes</td></tr>
<tr><td>Survives crash</td><td>No</td><td>Yes</td></tr>
<tr><td>Can ROLLBACK</td><td>Yes</td><td>No</td></tr>
<tr><td>Locks held</td><td>Yes</td><td>Released</td></tr></table>`,
    realWorld: 'Payment gateways only confirm a card payment to the patient after the database COMMIT succeeds, so a receipt always matches a stored payment.',
    deep: `<p><b>Group commit</b>: busy databases combine the log flushes of many concurrent commits into one fsync. <b>Two-phase commit</b> (PREPARE TRANSACTION / COMMIT PREPARED in PostgreSQL, XA in MySQL) coordinates a commit across several databases, at the cost of complexity and potential blocking.</p>`,
    tryIt: { prompt: 'Post a full payment for invoice 9 (Medicare Part B, 150) and mark it Paid inside one transaction, then verify.', starter: `BEGIN;\nINSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (9, 3, '2026-09-01', 150, 'EFT');\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 9;\nCOMMIT;\n\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 9;` },
    challenge: {
      level: 2,
      prompt: 'Post-commit consistency check: find Paid invoices whose total payments differ from total_amount (treat no payments as 0). Return invoice_id, total_amount and paid. Order by invoice_id.',
      solution: `SELECT i.invoice_id, i.total_amount, COALESCE(SUM(p.amount), 0) AS paid FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.invoice_id WHERE i.status = 'Paid' GROUP BY i.invoice_id, i.total_amount HAVING COALESCE(SUM(p.amount), 0) <> i.total_amount ORDER BY i.invoice_id;`,
      hints: ['LEFT JOIN payments so invoices without payments still appear.', 'Filter status = \'Paid\' and GROUP BY invoice_id, total_amount.', 'COALESCE(SUM(p.amount), 0) gives 0 for no payments.', 'HAVING that value <> i.total_amount; ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'When do other sessions see your changes (at READ COMMITTED)?', options: ['Immediately', 'After COMMIT', 'After the next SELECT', 'Never'], answer: 1, why: 'Uncommitted changes are private.' },
      { q: 'You committed a wrong payment. How do you fix it?', options: ['ROLLBACK', 'A new compensating change (refund/adjustment)', 'Restart the server', 'It cannot be fixed'], answer: 1, why: 'Committed work is permanent; correct it with new entries.' },
    ],
  },
  // ---------------------------------------------------------------- 13
  {
    id: 'dml-13',
    goals: ['Undo all uncommitted changes with ROLLBACK', 'Automatic rollback on errors and crashes', 'Using a transaction as a safety net for risky changes', 'What ROLLBACK cannot undo'],
    concept: `<p><b>ROLLBACK</b> cancels the current transaction: every change since <code>BEGIN</code> is undone, as if it never happened.</p>
<pre>BEGIN;
DELETE FROM payments WHERE invoice_id = 1;   -- oops, deleted both payments
ROLLBACK;                                    -- both are back</pre>
<p>Rollback also happens automatically when the connection drops or the server crashes before COMMIT.</p>
<p>A great habit: run risky UPDATEs/DELETEs inside <code>BEGIN</code>, check the result, and only then COMMIT (or ROLLBACK).</p>`,
    why: 'Mistakes and errors happen mid-operation. ROLLBACK returns the data to its last consistent state.',
    when: 'When a step fails, a validation check fails, or you realise a change was wrong before committing.',
    analogy: 'Voiding a cash-register transaction before printing the receipt: the drawer and the log go back to exactly how they were.',
    syntax: `BEGIN;\n  ...changes...\nROLLBACK;   -- undo everything since BEGIN`,
    sql: `BEGIN;\n\nDELETE FROM payments WHERE invoice_id = 1;\nSELECT COUNT(*) AS payments_for_invoice_1 FROM payments WHERE invoice_id = 1;\n\nROLLBACK;\n\nSELECT payment_id, invoice_id, amount FROM payments WHERE invoice_id = 1;`,
    breakdown: [
      ['BEGIN;', 'Open the safety net'],
      ['DELETE FROM payments WHERE invoice_id = 1;', 'Too broad: removes the real payment as well as the duplicate'],
      ['SELECT COUNT(*) ...', 'Check inside the transaction: 0 rows. Wrong!'],
      ['ROLLBACK;', 'Undo the delete'],
      ['SELECT ...', 'Both payments (1 and 47) are back'],
    ],
    visual: { type: 'txn', scenario: 'rollback' },
    internals: `<p>SQLite restores original pages from the rollback journal (or discards uncommitted WAL frames). PostgreSQL simply marks the transaction id as aborted: the new row versions it wrote become invisible and are cleaned up by VACUUM. InnoDB and SQL Server apply undo log records in reverse.</p>`,
    mistakes: [
      { wrong: `DELETE FROM payments WHERE invoice_id = 1;\nROLLBACK;`, why: 'Without BEGIN the DELETE autocommitted; there is nothing to roll back.', fix: `BEGIN;\nDELETE FROM payments WHERE invoice_id = 1;\nROLLBACK;` },
      { wrong: `-- MySQL: BEGIN; DELETE FROM payments; TRUNCATE TABLE staging; ROLLBACK;`, why: 'In MySQL and Oracle DDL statements like TRUNCATE commit implicitly, so the DELETE before it is committed too.', fix: `BEGIN;\nDELETE FROM payments WHERE payment_id = 47;\nROLLBACK;` },
    ],
    rules: ['ROLLBACK undoes everything since BEGIN.', 'It only works before COMMIT.', 'Disconnects and crashes roll back automatically.', 'Wrap risky manual fixes in BEGIN ... check ... COMMIT/ROLLBACK.'],
    compare: `<table><tr><th>Command</th><th>Undoes</th></tr>
<tr><td>ROLLBACK</td><td>The whole transaction</td></tr>
<tr><td>ROLLBACK TO SAVEPOINT s</td><td>Only changes after savepoint s</td></tr>
<tr><td>Compensating entry</td><td>Committed work (by adding new rows)</td></tr></table>`,
    realWorld: 'Payment posting code wraps each remittance in a transaction; if one claim line fails validation, the whole remittance rolls back and is sent to an error queue.',
    deep: `<p>In PostgreSQL, any error inside a transaction puts it in an "aborted" state: every later statement fails with <i>current transaction is aborted</i> until you ROLLBACK (or roll back to a savepoint). SQL Server by default only aborts the failing statement unless <code>SET XACT_ABORT ON</code> is set, a common source of half-applied changes.</p>`,
    tryIt: { prompt: 'Delete only the duplicate payment (47) inside a transaction, check invoice 1\'s payments, and decide: COMMIT or ROLLBACK?', starter: `BEGIN;\nDELETE FROM payments WHERE payment_id = 47;\nSELECT payment_id, amount FROM payments WHERE invoice_id = 1;\n-- COMMIT;  or  ROLLBACK;\nROLLBACK;` },
    challenge: {
      level: 2,
      prompt: 'Before a risky duplicate clean-up, identify suspected duplicate patient payments: invoices with more than one patient-paid payment (payor_id IS NULL) of the same amount. Return invoice_id, amount and the count. Order by invoice_id.',
      solution: `SELECT invoice_id, amount, COUNT(*) AS n FROM payments WHERE payor_id IS NULL GROUP BY invoice_id, amount HAVING COUNT(*) > 1 ORDER BY invoice_id;`,
      hints: ['Patient payments have payor_id IS NULL.', 'Group by invoice_id and amount.', 'Keep groups with HAVING COUNT(*) > 1.', 'ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Can ROLLBACK undo a committed transaction?', options: ['Yes', 'No'], answer: 1, why: 'After COMMIT the change is permanent.' },
      { q: 'What happens to an open transaction when the client disconnects?', options: ['It commits', 'It rolls back', 'It stays open forever', 'It is paused'], answer: 1, why: 'Uncommitted work is discarded.' },
    ],
  },
  // ---------------------------------------------------------------- 14
  {
    id: 'dml-14',
    goals: ['Create checkpoints inside a transaction with SAVEPOINT', 'ROLLBACK TO a savepoint without losing earlier work', 'RELEASE a savepoint', 'Use savepoints for per-row error handling in batches'],
    concept: `<p>A <b>SAVEPOINT</b> is a named bookmark inside a transaction. You can roll back to it, undoing only the work done after it, while keeping everything before it.</p>
<pre>BEGIN;
  INSERT ... charge A;          -- keep
  SAVEPOINT before_discount;
  UPDATE ... apply discount;    -- wrong, undo just this
  ROLLBACK TO before_discount;
  INSERT ... charge B;          -- keep
COMMIT;                         -- A and B saved, discount not</pre>
<p><code>RELEASE savepoint</code> forgets the bookmark (keeping the changes). Nothing is permanent until the outer COMMIT.</p>`,
    why: 'Long batches should not lose all their work because one step failed.',
    when: 'Processing a remittance file line by line, optional steps that may fail, nested operations in application code.',
    analogy: 'Writing a long claim in pencil and marking "checkpoint" after each section: if one section goes wrong you erase back to the last checkpoint, not the whole form.',
    syntax: `SAVEPOINT name;\n  ...\nROLLBACK TO name;   -- undo back to the savepoint (it stays active)\nRELEASE name;       -- keep changes, drop the savepoint`,
    sql: `BEGIN;\n\nINSERT INTO charges (invoice_id, practitioner_id, service_date, cpt_code, description, units, unit_price, amount)\nVALUES (5, 9, '2026-08-28', '36415', 'Routine venipuncture', 1, 15, 15);\n\nSAVEPOINT before_discount;\nUPDATE charges SET amount = 0 WHERE invoice_id = 5;   -- mistake: zeroes every charge\nROLLBACK TO before_discount;\nRELEASE before_discount;\n\nUPDATE invoices SET total_amount = total_amount + 15 WHERE invoice_id = 5;\n\nCOMMIT;\n\nSELECT charge_id, cpt_code, amount FROM charges WHERE invoice_id = 5;`,
    breakdown: [
      ['INSERT INTO charges ...', 'New lab charge on invoice 5: keep it'],
      ['SAVEPOINT before_discount;', 'Bookmark'],
      ['UPDATE charges SET amount = 0 ...', 'A wrong change'],
      ['ROLLBACK TO before_discount;', 'Undo only the wrong UPDATE; the INSERT stays'],
      ['RELEASE ... / UPDATE invoices ... / COMMIT;', 'Continue and commit the good work'],
    ],
    visual: { type: 'txn', scenario: 'savepoint' },
    internals: `<p>Savepoints are nested sub-transactions. SQLite keeps a statement journal per savepoint; PostgreSQL assigns a subtransaction id. Many savepoints in one transaction have a cost (PostgreSQL slows down past 64 active subtransactions per backend), so don\'t create one per row for huge batches unless needed.</p>`,
    mistakes: [
      { wrong: `BEGIN;\nSAVEPOINT s1;\nUPDATE invoices SET status = 'Void' WHERE invoice_id = 5;\nROLLBACK TO s2;`, why: 'There is no savepoint s2: this errors. Names must match.', fix: `BEGIN;\nSAVEPOINT s1;\nUPDATE invoices SET status = 'Void' WHERE invoice_id = 5;\nROLLBACK TO s1;\nCOMMIT;` },
      { wrong: `-- "RELEASE s1 makes the changes permanent"`, why: 'RELEASE only removes the bookmark. Changes become permanent at the outer COMMIT (and are lost on ROLLBACK).', fix: `BEGIN;\nSAVEPOINT s1;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;\nRELEASE s1;\nCOMMIT;` },
    ],
    rules: ['ROLLBACK TO undoes only work after the savepoint.', 'The transaction stays open after ROLLBACK TO.', 'RELEASE keeps the changes and drops the savepoint.', 'Nothing is durable until the outer COMMIT.'],
    compare: `<table><tr><th>Command</th><th>Undo scope</th><th>Transaction afterwards</th></tr>
<tr><td>ROLLBACK</td><td>Everything since BEGIN</td><td>Ended</td></tr>
<tr><td>ROLLBACK TO s</td><td>Since SAVEPOINT s</td><td>Still open</td></tr>
<tr><td>RELEASE s</td><td>Nothing</td><td>Still open</td></tr></table>
<p>SQL Server uses <code>SAVE TRANSACTION s</code> and <code>ROLLBACK TRANSACTION s</code>.</p>`,
    realWorld: 'A remittance import sets a savepoint before each claim line. A line with an unknown invoice is rolled back to its savepoint and logged, and the rest of the file still posts.',
    deep: `<p>Frameworks implement nested transactions with savepoints (Django nested <code>atomic()</code>, Spring <code>PROPAGATION_NESTED</code>). In SQLite, <code>SAVEPOINT</code> can also start a transaction when none is open; releasing that outermost savepoint commits it.</p>`,
    tryIt: { prompt: 'Process two lines: the first valid, the second breaks a CHECK constraint. Roll back only the bad one using a savepoint.', starter: `BEGIN;\nSAVEPOINT line1;\nINSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount) VALUES (5, '2026-09-01', 'PAYMENT', -50);\nRELEASE line1;\n\nSAVEPOINT line2;\n-- invalid transaction_type fails the CHECK constraint; run it alone to see the error\n-- INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount) VALUES (5, '2026-09-01', 'BONUS', -10);\nROLLBACK TO line2;\nCOMMIT;\n\nSELECT * FROM transactions WHERE invoice_id = 5;` },
    challenge: {
      level: 2,
      prompt: 'After a batch that added charges, verify invoices at location 3 still balance: return invoice_id, total_amount and the SUM of their charge amounts side by side. Order by invoice_id.',
      solution: `SELECT i.invoice_id, i.total_amount, SUM(c.amount) AS charges_total FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id WHERE i.location_id = 3 GROUP BY i.invoice_id, i.total_amount ORDER BY i.invoice_id;`,
      hints: ['Join invoices to charges on invoice_id.', 'Filter i.location_id = 3.', 'GROUP BY invoice_id, total_amount with SUM(c.amount).', 'ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'After ROLLBACK TO s1, is the transaction still open?', options: ['Yes', 'No'], answer: 0, why: 'Only the work after s1 is undone; you can continue and COMMIT.' },
      { q: 'What does RELEASE SAVEPOINT do?', options: ['Commits the whole transaction', 'Removes the savepoint, keeping changes', 'Undoes changes', 'Starts a new transaction'], answer: 1, why: 'Durability still depends on the outer COMMIT.' },
    ],
  },
  // ---------------------------------------------------------------- 15
  {
    id: 'dml-15',
    goals: ['The four ACID properties: Atomicity, Consistency, Isolation, Durability', 'What mechanism provides each one', 'ACID examples in payment posting', 'Where ACID ends (application logic, external systems)'],
    concept: `<p><b>ACID</b> is the set of guarantees a transaction gives:</p>
<ul>
<li><b>Atomicity</b>: all or nothing. A payment and its ledger entry are saved together or not at all. (<i>undo log / journal</i>)</li>
<li><b>Consistency</b>: every commit leaves the data valid according to constraints: no charge for a missing invoice, no status outside the allowed list. (<i>constraints, triggers</i>)</li>
<li><b>Isolation</b>: concurrent transactions don\'t see each other\'s half-finished work. (<i>locks, MVCC, isolation levels</i>)</li>
<li><b>Durability</b>: once committed, it stays committed, even after a power cut. (<i>write-ahead log, fsync</i>)</li>
</ul>`,
    why: 'Money must never appear or vanish because of crashes or concurrency. ACID is why databases are trusted with financial records.',
    when: 'Always relevant for billing data; especially when choosing a database or configuring durability/isolation settings.',
    analogy: 'A bank transfer between the clinic\'s accounts: both sides happen or neither (A), balances stay valid (C), tellers don\'t see each other\'s half-done work (I), and the receipt holds even if the power fails (D).',
    syntax: `BEGIN;\n  -- A: all statements succeed together\n  -- C: constraints checked\n  -- I: others don't see this yet\nCOMMIT;  -- D: survives crashes`,
    sql: `BEGIN;\n\nINSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (12, NULL, '2026-09-01', 99, 'Cash');\n\n-- This violates the CHECK constraint on transaction_type, so the statement fails:\n-- INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount)\n-- VALUES (12, '2026-09-01', 'CASH', -99);\n\nROLLBACK;   -- atomicity: the payment above is undone too\n\nSELECT COUNT(*) AS payments_on_invoice_12 FROM payments WHERE invoice_id = 12;`,
    breakdown: [
      ['INSERT INTO payments ...', 'First half of the posting'],
      ['INSERT INTO transactions ... \'CASH\'', 'Consistency: CHECK (transaction_type IN (...)) rejects it'],
      ['ROLLBACK;', 'Atomicity: the first half is undone as well'],
      ['SELECT COUNT(*) ...', 'Still 1 payment on invoice 12: no half-posted money'],
    ],
    visual: { type: 'txn', scenario: 'rollback' },
    internals: `<p>Durability relies on the write-ahead rule: the log record describing a change reaches disk <b>before</b> the changed data page and before COMMIT returns. After a crash the database replays committed log records (redo) and undoes uncommitted ones. Isolation is implemented with locking (SQLite locks the whole database for writes; SQL Server/MySQL lock rows) and/or MVCC (PostgreSQL, Oracle, InnoDB keep old row versions for readers).</p>`,
    mistakes: [
      { wrong: `-- Checking "balance never negative" only in application code`, why: 'Consistency is strongest when enforced by the database (CHECK, FK, UNIQUE); app checks can be bypassed or race.', fix: `SELECT invoice_id FROM invoices WHERE total_amount < 0;` },
      { wrong: `PRAGMA synchronous = OFF;  -- "for speed" on the production billing DB`, why: 'Trades away durability: a power loss can lose committed payments or corrupt the database file.', fix: `PRAGMA synchronous = FULL;` },
    ],
    rules: ['Atomicity: all or nothing.', 'Consistency: constraints hold at every commit.', 'Isolation: concurrent work doesn\'t interfere.', 'Durability: committed = permanent.'],
    compare: `<table><tr><th>Property</th><th>Protects against</th><th>Mechanism</th></tr>
<tr><td>Atomicity</td><td>Half-finished changes</td><td>Undo log / journal</td></tr>
<tr><td>Consistency</td><td>Invalid data</td><td>Constraints, triggers</td></tr>
<tr><td>Isolation</td><td>Concurrency anomalies</td><td>Locks, MVCC</td></tr>
<tr><td>Durability</td><td>Losing committed data</td><td>WAL + fsync, replication</td></tr></table>
<p>Many NoSQL systems trade some ACID guarantees for scale ("BASE": basically available, soft state, eventually consistent).</p>`,
    realWorld: 'Auditors rely on ACID: every payment in the payments table has its ledger entry, and nothing committed disappears after an outage.',
    deep: `<p>The "C" in ACID is partly the application\'s responsibility: the database enforces declared constraints, but rules like "ledger sum equals invoice balance" hold only if every transaction is written correctly (or enforced via triggers). Isolation is usually weakened by default (READ COMMITTED in PostgreSQL/SQL Server/Oracle) for performance, which the next lessons explore.</p>`,
    tryIt: { prompt: 'See Consistency in action: the valid ledger entry is accepted. Then uncomment the invalid one (type CASH) and run it: the CHECK constraint rejects it.', starter: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount)\nVALUES (12, '2026-09-01', 'PAYMENT', -99);\n\n-- INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount)\n-- VALUES (12, '2026-09-01', 'CASH', -99);\n\nSELECT transaction_id, transaction_type, amount FROM transactions WHERE invoice_id = 12;` },
    challenge: {
      level: 2,
      prompt: 'Consistency check for auditors: every payment should have a matching PAYMENT ledger entry. Return one row with the number of payments and the number of PAYMENT transactions.',
      solution: `SELECT (SELECT COUNT(*) FROM payments) AS n_payments, (SELECT COUNT(*) FROM transactions WHERE transaction_type = 'PAYMENT') AS n_payment_entries;`,
      hints: ['Two independent counts in one row.', 'Use two scalar subqueries in a SELECT without FROM.', 'The second one filters transaction_type = \'PAYMENT\'.'],
    },
    quiz: [
      { q: 'Which ACID property guarantees a committed payment survives a power failure?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 3, why: 'Durability via the write-ahead log.' },
      { q: 'A CHECK constraint rejects an invalid status. Which property is that?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 1, why: 'Consistency keeps data valid by the rules.' },
      { q: 'Two cashiers\' in-progress postings don\'t see each other. Which property?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 2, why: 'Isolation.' },
    ],
  },
  // ---------------------------------------------------------------- 16
  {
    id: 'dml-16',
    goals: ['The four standard isolation levels', 'Which anomalies each level allows', 'Default levels in popular databases', 'The lost update problem and how to prevent it'],
    concept: `<p>Perfect isolation is expensive, so databases let you choose an <b>isolation level</b>: how much concurrent transactions may affect each other.</p>
<table><tr><th>Level</th><th>Dirty read</th><th>Non-repeatable read</th><th>Phantom read</th></tr>
<tr><td>READ UNCOMMITTED</td><td>possible</td><td>possible</td><td>possible</td></tr>
<tr><td>READ COMMITTED</td><td>no</td><td>possible</td><td>possible</td></tr>
<tr><td>REPEATABLE READ</td><td>no</td><td>no</td><td>possible*</td></tr>
<tr><td>SERIALIZABLE</td><td>no</td><td>no</td><td>no</td></tr></table>
<p>*PostgreSQL and MySQL InnoDB also prevent most phantoms at REPEATABLE READ.</p>
<p>The timeline shows a <b>lost update</b>: two clerks read the same invoice balance, both subtract their payment from the old value, and the second write overwrites the first. Prevent it with an atomic update (<code>SET x = x - 50</code>), row locks (<code>SELECT ... FOR UPDATE</code>) or a stricter isolation level.</p>`,
    why: 'Higher isolation = fewer anomalies but more blocking/aborts. Choosing well balances correctness and throughput.',
    when: 'Designing concurrent processes: payment posting, balance updates, reports running during business hours.',
    analogy: 'How private each billing clerk\'s desk is: from "anyone can read my half-written notes" (READ UNCOMMITTED) to "everyone works as if alone, one at a time" (SERIALIZABLE).',
    syntax: `-- SQL standard / PostgreSQL / MySQL / SQL Server\nSET TRANSACTION ISOLATION LEVEL READ COMMITTED;\n-- SQLite: always SERIALIZABLE between connections\nBEGIN IMMEDIATE;`,
    sql: `-- SQLite transactions are serializable. Safe balance change: compute in ONE atomic UPDATE\nBEGIN IMMEDIATE;\n\nUPDATE invoices\nSET total_amount = total_amount - 50\nWHERE invoice_id = 13;\n\nCOMMIT;\n\nSELECT invoice_id, total_amount FROM invoices WHERE invoice_id = 13;`,
    breakdown: [
      ['BEGIN IMMEDIATE;', 'SQLite: take the write lock at the start, so no other writer can interleave'],
      ['SET total_amount = total_amount - 50', 'Read-and-modify in one statement: no stale value from an earlier SELECT'],
      ['COMMIT;', 'Release the lock'],
    ],
    visual: { type: 'txn', scenario: 'lostupdate' },
    internals: `<p>PostgreSQL implements READ COMMITTED with a new snapshot per statement, REPEATABLE READ with one snapshot per transaction (and errors on conflicting updates: <i>could not serialize access</i>), and SERIALIZABLE with Serializable Snapshot Isolation (SSI), which detects dangerous patterns and aborts one transaction. SQL Server uses locks by default, or row versioning with READ_COMMITTED_SNAPSHOT / SNAPSHOT. SQLite allows one writer at a time, so its transactions are serializable.</p>`,
    mistakes: [
      { wrong: `-- read balance in the app, subtract, write back\nSELECT total_amount FROM invoices WHERE invoice_id = 13;   -- app sees 685\nUPDATE invoices SET total_amount = 635 WHERE invoice_id = 13;`, why: 'Classic lost update: another session may have changed the value between the SELECT and the UPDATE.', fix: `UPDATE invoices SET total_amount = total_amount - 50 WHERE invoice_id = 13;` },
      { wrong: `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;  -- for the month-end revenue report`, why: 'The report may include payments that are later rolled back (dirty reads).', fix: `SELECT SUM(amount) FROM payments;` },
    ],
    rules: ['Higher level = fewer anomalies, more blocking or retries.', 'Know your database\'s default level.', 'Prefer atomic UPDATE ... SET x = x + ? over read-then-write.', 'At REPEATABLE READ / SERIALIZABLE, be ready to retry on serialization errors.'],
    compare: `<table><tr><th>Database</th><th>Default level</th><th>Notes</th></tr>
<tr><td>PostgreSQL</td><td>READ COMMITTED</td><td>READ UNCOMMITTED behaves as READ COMMITTED; SSI for SERIALIZABLE</td></tr>
<tr><td>MySQL InnoDB</td><td>REPEATABLE READ</td><td>Gap locks prevent phantoms for locking reads</td></tr>
<tr><td>SQL Server</td><td>READ COMMITTED (locking)</td><td>RCSI / SNAPSHOT for versioning</td></tr>
<tr><td>Oracle</td><td>READ COMMITTED</td><td>SERIALIZABLE = snapshot isolation</td></tr>
<tr><td>SQLite</td><td>SERIALIZABLE</td><td>One writer at a time</td></tr></table>`,
    realWorld: 'Two payment files from different payors post to the same invoice at once. Atomic updates or SELECT ... FOR UPDATE keep the balance correct.',
    deep: `<p>Snapshot isolation (Oracle "SERIALIZABLE", PostgreSQL REPEATABLE READ) prevents dirty, non-repeatable and phantom reads but allows <b>write skew</b>: two transactions each check a condition ("at least one on-call practitioner remains") and update different rows, together breaking it. True SERIALIZABLE (PostgreSQL SSI, or locking) prevents it.</p>`,
    dialectSql: {
      postgres: `BEGIN ISOLATION LEVEL REPEATABLE READ;\nSELECT total_amount FROM invoices WHERE invoice_id = 13 FOR UPDATE;\nUPDATE invoices SET total_amount = total_amount - 50 WHERE invoice_id = 13;\nCOMMIT;`,
      mysql: `SET TRANSACTION ISOLATION LEVEL READ COMMITTED;\nSTART TRANSACTION;\nSELECT total_amount FROM invoices WHERE invoice_id = 13 FOR UPDATE;\nUPDATE invoices SET total_amount = total_amount - 50 WHERE invoice_id = 13;\nCOMMIT;`,
      sqlserver: `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;\nBEGIN TRANSACTION;\nSELECT total_amount FROM invoices WITH (UPDLOCK) WHERE invoice_id = 13;\nUPDATE invoices SET total_amount = total_amount - 50 WHERE invoice_id = 13;\nCOMMIT;`,
      sqlite: `BEGIN IMMEDIATE;\nUPDATE invoices SET total_amount = total_amount - 50 WHERE invoice_id = 13;\nCOMMIT;`,
    },
    tryIt: { prompt: 'SQLite shows its settings with PRAGMAs. Check read_uncommitted (only relevant for shared-cache connections) and then run an atomic balance update.', starter: `PRAGMA read_uncommitted;\n\nBEGIN IMMEDIATE;\nUPDATE invoices SET total_amount = total_amount + 10 WHERE invoice_id = 5;\nCOMMIT;\nSELECT invoice_id, total_amount FROM invoices WHERE invoice_id = 5;` },
    challenge: {
      level: 2,
      prompt: 'Two clerks might post payments to the same invoice at once. Find the risky invoices: those with 2 or more payments posted on the same payment_date. Return invoice_id, payment_date and the number of payments. Order by invoice_id, payment_date.',
      solution: `SELECT invoice_id, payment_date, COUNT(*) AS n FROM payments GROUP BY invoice_id, payment_date HAVING COUNT(*) >= 2 ORDER BY invoice_id, payment_date;`,
      hints: ['Group payments by invoice_id and payment_date.', 'Count each group.', 'HAVING COUNT(*) >= 2.', 'ORDER BY invoice_id, payment_date.'],
      ordered: true,
    },
    quiz: [
      { q: 'Lowest level that prevents dirty reads?', options: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'], answer: 1, why: 'READ COMMITTED only shows committed data.' },
      { q: 'Best simple fix for a lost update on a balance?', options: ['Read then write from the app', 'UPDATE ... SET balance = balance - ? in one statement', 'READ UNCOMMITTED', 'Add an index'], answer: 1, why: 'The read and write happen atomically inside the database.' },
    ],
  },
  // ---------------------------------------------------------------- 17
  {
    id: 'dml-17',
    goals: ['What a dirty read is', 'Why reading uncommitted data is dangerous', 'Which isolation levels allow it', 'How MVCC avoids it without blocking readers'],
    concept: `<p>A <b>dirty read</b> happens when a transaction reads data that another transaction has changed but <b>not yet committed</b>. If that other transaction rolls back, you have read data that <b>never officially existed</b>.</p>
<p>Timeline:</p>
<ol>
<li>Session A: <code>UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;</code> (not committed)</li>
<li>Session B (READ UNCOMMITTED): reads invoice 3 as <b>Paid</b> and skips sending a reminder.</li>
<li>Session A: card was declined -&gt; <code>ROLLBACK</code>. Invoice 3 is still Overdue, but no reminder was sent.</li>
</ol>
<p>Only <b>READ UNCOMMITTED</b> allows dirty reads. PostgreSQL never allows them, even if you ask for READ UNCOMMITTED.</p>`,
    why: 'Decisions and reports based on data that is later rolled back are simply wrong.',
    when: 'Understanding why READ UNCOMMITTED / NOLOCK is risky, even for "just a report".',
    analogy: 'Reading a colleague\'s draft adjustment slip from their desk and entering it into the monthly report before they decide to throw it away.',
    syntax: `-- SQL Server: allows dirty reads\nSET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;\nSELECT ... FROM invoices WITH (NOLOCK);`,
    sql: `-- In SQLite a second connection can never see uncommitted changes.\n-- Within one session, you see your OWN uncommitted work:\nBEGIN;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 3;   -- 'Paid' (own change)\nROLLBACK;\n\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 3;   -- back to 'Overdue'`,
    breakdown: [
      ['BEGIN; UPDATE ... \'Paid\'', 'Session A\'s uncommitted change'],
      ['SELECT ... (inside the transaction)', 'A sees its own change: that is normal'],
      ['ROLLBACK;', 'The change is discarded'],
      ['SELECT ... (after)', 'Anyone who "dirty read" Paid acted on data that never existed'],
    ],
    visual: { type: 'txn', scenario: 'dirty' },
    internals: `<p>With locking (SQL Server default), a writer holds an exclusive lock on the row; READ COMMITTED readers wait for it, READ UNCOMMITTED readers ignore it (NOLOCK) and read the in-progress value. With <b>MVCC</b> (PostgreSQL, Oracle, InnoDB, SQL Server RCSI), readers simply read the last committed version of the row, so they neither block nor see dirty data.</p>`,
    mistakes: [
      { wrong: `SELECT SUM(amount) FROM payments WITH (NOLOCK);  -- SQL Server "fast" revenue report`, why: 'NOLOCK = READ UNCOMMITTED: can include rolled-back payments, and can even read rows twice or skip rows during page splits.', fix: `SELECT SUM(amount) FROM payments;` },
    ],
    rules: ['Dirty read = reading uncommitted data.', 'Only READ UNCOMMITTED (NOLOCK) allows it.', 'Your own uncommitted changes are always visible to you: that is not a dirty read.', 'Use MVCC / snapshot options instead of NOLOCK to avoid blocking.'],
    compare: `<table><tr><th>Anomaly</th><th>What goes wrong</th><th>Prevented from</th></tr>
<tr><td>Dirty read</td><td>See uncommitted data</td><td>READ COMMITTED</td></tr>
<tr><td>Non-repeatable read</td><td>Same row, different value on re-read</td><td>REPEATABLE READ</td></tr>
<tr><td>Phantom read</td><td>New/missing rows on re-query</td><td>SERIALIZABLE</td></tr></table>`,
    realWorld: 'A clinic dashboard used NOLOCK and occasionally showed payments that were later reversed by failed card settlements, causing month-end reconciliation differences.',
    deep: `<p>In SQL Server, turn on <code>ALTER DATABASE ... SET READ_COMMITTED_SNAPSHOT ON</code> so READ COMMITTED readers use row versions from tempdb instead of waiting on locks. This removes most reasons people reach for NOLOCK.</p>`,
    dialectSql: {
      sqlserver: `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 3;\n-- or per table: SELECT ... FROM invoices WITH (NOLOCK)`,
      mysql: `SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 3;`,
      postgres: `-- Accepted but behaves as READ COMMITTED: no dirty reads\nBEGIN ISOLATION LEVEL READ UNCOMMITTED;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 3;\nCOMMIT;`,
      sqlite: `-- Separate connections never see uncommitted data\n-- (PRAGMA read_uncommitted applies only to shared-cache mode)\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 3;`,
    },
    tryIt: { prompt: 'Change several invoices inside a transaction, run a report inside it, then roll back and run the report again.', starter: `BEGIN;\nUPDATE invoices SET status = 'Paid' WHERE status = 'Overdue';\nSELECT status, COUNT(*) FROM invoices GROUP BY status;\nROLLBACK;\n\nSELECT status, COUNT(*) FROM invoices GROUP BY status;` },
    challenge: {
      level: 1,
      prompt: 'Write the committed-data revenue report that must never use dirty reads: for each status return the number of invoices and the total amount. Order by status.',
      solution: `SELECT status, COUNT(*) AS n, SUM(total_amount) AS total FROM invoices GROUP BY status ORDER BY status;`,
      hints: ['GROUP BY status.', 'COUNT(*) and SUM(total_amount).', 'ORDER BY status.'],
      ordered: true,
    },
    quiz: [
      { q: 'What is a dirty read?', options: ['Reading deleted rows', 'Reading another transaction\'s uncommitted changes', 'Reading your own changes', 'Reading from a cache'], answer: 1, why: 'The data may be rolled back.' },
      { q: 'Does PostgreSQL ever return dirty reads?', options: ['Yes, at READ UNCOMMITTED', 'No, never'], answer: 1, why: 'Its READ UNCOMMITTED behaves as READ COMMITTED.' },
    ],
  },
  // ---------------------------------------------------------------- 18
  {
    id: 'dml-18',
    goals: ['What a non-repeatable read is', 'Why reading the same row twice can give different values', 'Fixes: REPEATABLE READ, snapshots, single statements, locks', 'Statement-level vs transaction-level snapshots'],
    concept: `<p>A <b>non-repeatable read</b>: your transaction reads a row, another transaction <b>updates and commits</b> it, and when you read the same row again you get a <b>different value</b>.</p>
<ol>
<li>Session A (report): reads invoice 13 total = 685.</li>
<li>Session B: posts an adjustment, <code>total_amount = 635</code>, COMMIT.</li>
<li>Session A: reads invoice 13 again for the balance line: 635. The statement header and the detail disagree.</li>
</ol>
<p>Allowed at READ COMMITTED (the default in PostgreSQL, SQL Server, Oracle). Prevented at REPEATABLE READ and above, where the whole transaction reads one consistent snapshot.</p>`,
    why: 'Multi-query reports and calculations must be internally consistent: totals must match their details.',
    when: 'Patient statements, reconciliations and any transaction that reads the same data more than once.',
    analogy: 'You copy a patient\'s balance onto the statement header, a colleague posts a payment, and when you fill in the detail section the balance is different. The printed statement contradicts itself.',
    syntax: `-- PostgreSQL / MySQL\nBEGIN ISOLATION LEVEL REPEATABLE READ;\n  SELECT ...;  -- all reads see the same snapshot\nCOMMIT;`,
    sql: `-- Tip: compute related values in ONE statement: a single statement always sees one consistent snapshot\nSELECT i.invoice_id,\n       i.total_amount,\n       (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.invoice_id = i.invoice_id) AS paid,\n       i.total_amount - (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.invoice_id = i.invoice_id) AS balance\nFROM invoices i\nWHERE i.invoice_id = 13;`,
    breakdown: [
      ['i.total_amount', 'Read once...'],
      ['(SELECT SUM(amount) FROM payments ...) AS paid', '...and paid, in the same statement'],
      ['balance = total - paid', 'Guaranteed consistent: no other commit can land between these reads'],
    ],
    visual: { type: 'txn', scenario: 'nonrepeatable' },
    internals: `<p>READ COMMITTED in MVCC databases takes a <b>new snapshot for every statement</b>, so two statements in the same transaction can see different committed data. REPEATABLE READ takes <b>one snapshot at the first statement</b> and uses it for the whole transaction. Locking databases (SQL Server default) implement REPEATABLE READ by holding shared locks on read rows until commit, which blocks writers instead.</p>`,
    mistakes: [
      { wrong: `-- READ COMMITTED, two separate queries for one statement\nSELECT total_amount FROM invoices WHERE invoice_id = 13;\nSELECT SUM(amount) FROM payments WHERE invoice_id = 13;`, why: 'A payment or adjustment can commit between the two queries, so total and paid come from different moments.', fix: `SELECT i.total_amount, (SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.invoice_id) AS paid FROM invoices i WHERE i.invoice_id = 13;` },
    ],
    rules: ['Non-repeatable read = same row, new value, same transaction.', 'Allowed at READ COMMITTED.', 'REPEATABLE READ / snapshot isolation prevents it.', 'One statement is always internally consistent.'],
    compare: `<table><tr><th></th><th>Non-repeatable read</th><th>Phantom read</th></tr>
<tr><td>What changes</td><td>An existing row\'s values</td><td>The set of rows matching a condition</td></tr>
<tr><td>Caused by</td><td>UPDATE / DELETE by others</td><td>INSERT (or UPDATE into/out of the range)</td></tr>
<tr><td>Prevented at</td><td>REPEATABLE READ</td><td>SERIALIZABLE (PG/InnoDB also mostly at RR)</td></tr></table>`,
    realWorld: 'Patient statement batches run at REPEATABLE READ (or from a snapshot) so the header balance, the line items and the aging buckets all match.',
    deep: `<p>At REPEATABLE READ in PostgreSQL, if you try to UPDATE a row that another transaction changed after your snapshot, you get <i>ERROR: could not serialize access due to concurrent update</i> and must retry the transaction. MySQL InnoDB instead updates the latest version (a "read-committed write" inside a repeatable-read transaction), which can surprise developers.</p>`,
    dialectSql: {
      postgres: `BEGIN ISOLATION LEVEL REPEATABLE READ;\nSELECT total_amount FROM invoices WHERE invoice_id = 13;\n-- ... other session commits an update ...\nSELECT total_amount FROM invoices WHERE invoice_id = 13;  -- same value as before\nCOMMIT;`,
      mysql: `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;  -- InnoDB default\nSTART TRANSACTION;\nSELECT total_amount FROM invoices WHERE invoice_id = 13;\nSELECT total_amount FROM invoices WHERE invoice_id = 13;\nCOMMIT;`,
      sqlserver: `SET TRANSACTION ISOLATION LEVEL SNAPSHOT;  -- or REPEATABLE READ (locking)\nBEGIN TRANSACTION;\nSELECT total_amount FROM invoices WHERE invoice_id = 13;\nSELECT total_amount FROM invoices WHERE invoice_id = 13;\nCOMMIT;`,
      sqlite: `BEGIN;  -- reads in one SQLite transaction see one consistent snapshot\nSELECT total_amount FROM invoices WHERE invoice_id = 13;\nSELECT total_amount FROM invoices WHERE invoice_id = 13;\nCOMMIT;`,
    },
    tryIt: { prompt: 'Simulate the other session inside one script: read, "commit" an adjustment, read again. Note how the value differs between the reads.', starter: `SELECT total_amount AS first_read FROM invoices WHERE invoice_id = 13;\n\nUPDATE invoices SET total_amount = 635 WHERE invoice_id = 13;  -- the other session\n\nSELECT total_amount AS second_read FROM invoices WHERE invoice_id = 13;` },
    challenge: {
      level: 2,
      prompt: 'Build a consistent single-statement statement line for every invoice of patient 24: invoice_id, total_amount, paid (0 if none) and balance (total - paid). Order by invoice_id.',
      solution: `SELECT i.invoice_id, i.total_amount, COALESCE((SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS paid, i.total_amount - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS balance FROM invoices i WHERE i.patient_id = 24 ORDER BY i.invoice_id;`,
      hints: ['One SELECT over invoices WHERE patient_id = 24.', 'paid = COALESCE((SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0).', 'balance = i.total_amount - that same expression.', 'ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which change causes a non-repeatable read?', options: ['Another session INSERTs a new invoice', 'Another session UPDATEs and commits a row you already read', 'You update your own row', 'A rollback'], answer: 1, why: 'Re-reading that row gives a new value.' },
      { q: 'Default PostgreSQL level allows non-repeatable reads?', options: ['Yes (READ COMMITTED)', 'No'], answer: 0, why: 'Each statement gets a fresh snapshot.' },
    ],
  },
  // ---------------------------------------------------------------- 19
  {
    id: 'dml-19',
    goals: ['What a phantom read is', 'How it differs from a non-repeatable read', 'Which levels prevent phantoms (SERIALIZABLE, predicate/gap locks)', 'Keeping counts and totals consistent'],
    concept: `<p>A <b>phantom read</b>: you run a query with a condition twice in the same transaction, and the second time <b>new rows appear</b> (or rows disappear) because another transaction inserted/deleted matching rows and committed.</p>
<ol>
<li>Session A: <code>SELECT COUNT(*) FROM invoices WHERE status = 'Overdue'</code> -&gt; 13.</li>
<li>Session B: nightly job flips 5 Open invoices to Overdue (or inserts one), COMMIT.</li>
<li>Session A: <code>SELECT SUM(total_amount) FROM invoices WHERE status = 'Overdue'</code>: now over 18 rows. The count and the sum describe different sets.</li>
</ol>
<p>The individual rows did not change for A; the <b>set</b> of rows matching the condition did. Only SERIALIZABLE fully prevents this (PostgreSQL and InnoDB also prevent it at REPEATABLE READ for plain reads).</p>`,
    why: 'Reports that compute counts, sums and lists in several steps must describe the same set of rows.',
    when: 'Aging reports, collections queues, month-end totals, "check then insert" logic (e.g. no double-booking).',
    analogy: 'You count the overdue folders in the tray, turn around to total them, and meanwhile a colleague drops two new folders in. Your count and your total no longer match.',
    syntax: `-- PostgreSQL / SQL Server\nSET TRANSACTION ISOLATION LEVEL SERIALIZABLE;\nBEGIN;\n  SELECT COUNT(*) ... WHERE cond;\n  SELECT SUM(...) ... WHERE cond;\nCOMMIT;`,
    sql: `-- Avoid multi-query drift: get the count AND the sum from one statement\nSELECT location_id,\n       COUNT(*)          AS overdue_invoices,\n       SUM(total_amount) AS overdue_amount\nFROM invoices\nWHERE status = 'Overdue'\nGROUP BY location_id\nORDER BY location_id;`,
    breakdown: [
      ['WHERE status = \'Overdue\'', 'The predicate whose row set phantoms can change'],
      ['COUNT(*) and SUM(total_amount) together', 'Computed over exactly the same rows in one statement'],
      ['GROUP BY location_id', 'Per-location work queue sizes'],
    ],
    visual: { type: 'txn', scenario: 'phantom' },
    internals: `<p>Row locks can\'t stop phantoms, because the new row did not exist when you read. Locking databases use <b>range / gap / predicate locks</b>: SQL Server SERIALIZABLE locks key ranges of the index; InnoDB takes next-key (gap) locks for locking reads. MVCC databases give each transaction a fixed snapshot (so new rows are invisible) and, for SERIALIZABLE, PostgreSQL SSI tracks read predicates to detect conflicts and abort one transaction.</p>`,
    mistakes: [
      { wrong: `-- READ COMMITTED: check then insert (double-booking risk)\nSELECT COUNT(*) FROM payments WHERE invoice_id = 5 AND payment_date = '2026-09-01';\n-- app sees 0, then:\nINSERT INTO payments (invoice_id, payment_date, amount, method) VALUES (5, '2026-09-01', 135, 'Cash');`, why: 'Another session can insert the same payment between the check and the insert: a phantom. Enforce it with a UNIQUE constraint or SERIALIZABLE.', fix: `SELECT invoice_id, payment_date, COUNT(*) FROM payments GROUP BY invoice_id, payment_date HAVING COUNT(*) > 1;` },
    ],
    rules: ['Phantom = the set of matching rows changes between two reads.', 'Caused by INSERT/DELETE (or UPDATE moving rows in/out of the condition).', 'SERIALIZABLE prevents it; UNIQUE constraints prevent check-then-insert races.', 'Compute related aggregates in one statement.'],
    compare: `<table><tr><th>Level</th><th>Phantoms?</th></tr>
<tr><td>READ COMMITTED</td><td>Yes</td></tr>
<tr><td>REPEATABLE READ (standard / SQL Server)</td><td>Yes</td></tr>
<tr><td>REPEATABLE READ (PostgreSQL, InnoDB consistent reads)</td><td>No for plain reads</td></tr>
<tr><td>SERIALIZABLE</td><td>No</td></tr></table>`,
    realWorld: 'An A/R aging report showed "13 overdue invoices" in its header but listed 18 because the overdue-flagging job ran between the two queries. Running the report in one snapshot fixed it.',
    deep: `<p>Write skew is the phantom\'s cousin: two transactions both check "no payment exists for invoice 5 today" (the predicate), both see none, and both insert. Snapshot isolation allows it; SERIALIZABLE (SSI) aborts one; a UNIQUE index on (invoice_id, payment_date, method) makes the database reject the duplicate regardless of isolation level.</p>`,
    dialectSql: {
      postgres: `BEGIN ISOLATION LEVEL SERIALIZABLE;\nSELECT COUNT(*) FROM invoices WHERE status = 'Overdue';\nSELECT SUM(total_amount) FROM invoices WHERE status = 'Overdue';\nCOMMIT;  -- may fail with a serialization error: retry`,
      sqlserver: `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;  -- key-range locks\nBEGIN TRANSACTION;\nSELECT COUNT(*) FROM invoices WHERE status = 'Overdue';\nSELECT SUM(total_amount) FROM invoices WHERE status = 'Overdue';\nCOMMIT;`,
      mysql: `START TRANSACTION;\nSELECT COUNT(*) FROM invoices WHERE status = 'Overdue' FOR SHARE;  -- next-key locks\nSELECT SUM(total_amount) FROM invoices WHERE status = 'Overdue';\nCOMMIT;`,
      sqlite: `BEGIN;  -- SQLite: serializable, no phantoms between connections\nSELECT COUNT(*) FROM invoices WHERE status = 'Overdue';\nSELECT SUM(total_amount) FROM invoices WHERE status = 'Overdue';\nCOMMIT;`,
    },
    tryIt: { prompt: 'Simulate the phantom in one script: count, let the "other session" flip Open invoices to Overdue, then sum.', starter: `SELECT COUNT(*) AS overdue_count FROM invoices WHERE status = 'Overdue';\n\nUPDATE invoices SET status = 'Overdue' WHERE status = 'Open';  -- the other session\n\nSELECT COUNT(*) AS overdue_count_now, SUM(total_amount) FROM invoices WHERE status = 'Overdue';` },
    challenge: {
      level: 2,
      prompt: 'Produce the collections summary in one statement so it cannot drift: for each location_name, the number of Overdue invoices and their total amount. Only locations that have overdue invoices. Order by total amount descending.',
      solution: `SELECT l.location_name, COUNT(*) AS overdue_invoices, SUM(i.total_amount) AS overdue_amount FROM invoices i JOIN treatment_locations l ON l.location_id = i.location_id WHERE i.status = 'Overdue' GROUP BY l.location_id, l.location_name ORDER BY overdue_amount DESC;`,
      hints: ['Join invoices to treatment_locations on location_id.', 'Filter i.status = \'Overdue\'.', 'GROUP BY the location with COUNT(*) and SUM(total_amount).', 'ORDER BY overdue_amount DESC.'],
      ordered: true,
    },
    quiz: [
      { q: 'A phantom read is caused mainly by...', options: ['UPDATE of a row you read', 'INSERT/DELETE of rows matching your condition', 'Your own changes', 'Index rebuilds'], answer: 1, why: 'The set of matching rows changes.' },
      { q: 'Which level prevents phantoms in all databases?', options: ['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE', 'READ UNCOMMITTED'], answer: 2, why: 'SERIALIZABLE.' },
    ],
  },
  // ---------------------------------------------------------------- 20
  {
    id: 'dml-20',
    goals: ['What a deadlock is (circular waiting)', 'How databases detect and resolve deadlocks', 'Preventing deadlocks with consistent lock order and short transactions', 'Retrying the victim transaction'],
    concept: `<p>A <b>deadlock</b> happens when two transactions each hold a lock the other needs, so both wait forever:</p>
<ol>
<li>Session A locks invoice 3 (UPDATE), then wants invoice 9.</li>
<li>Session B locks invoice 9 (UPDATE), then wants invoice 3.</li>
<li>A waits for B, B waits for A: a cycle.</li>
</ol>
<p>The database detects the cycle and <b>kills one transaction</b> (the "victim") with an error such as <i>deadlock detected</i>; the other continues. The application must <b>retry</b> the victim.</p>
<p>Best prevention: <b>always lock rows in the same order</b> (e.g. ascending invoice_id), and keep transactions short.</p>`,
    why: 'Busy billing systems run many concurrent postings; without prevention and retry logic, deadlocks surface as random failures.',
    when: 'Batch jobs and concurrent processes that update several rows or tables in one transaction.',
    analogy: 'Two clerks each hold one of two files and refuse to give theirs up until they get the other. A supervisor (deadlock detector) takes one file away so work continues.',
    syntax: `-- Prevent: lock in a consistent order\nBEGIN;\nUPDATE invoices SET ... WHERE invoice_id = 3;   -- lower id first\nUPDATE invoices SET ... WHERE invoice_id = 9;\nCOMMIT;`,
    sql: `-- SQLite has one writer at a time, so BEGIN IMMEDIATE takes the write lock up front:\n-- no deadlock between writers (a second writer gets SQLITE_BUSY and retries).\nBEGIN IMMEDIATE;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;   -- always ascending order\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 9;\nCOMMIT;\n\nSELECT invoice_id, status FROM invoices WHERE invoice_id IN (3, 9);`,
    breakdown: [
      ['BEGIN IMMEDIATE;', 'SQLite: acquire the write lock at the start instead of upgrading later (which can deadlock read-then-write transactions)'],
      ['UPDATE ... invoice_id = 3; then 9', 'Consistent ascending order: every job locks 3 before 9, so no cycle can form'],
      ['COMMIT;', 'Release locks quickly'],
    ],
    visual: { type: 'txn', scenario: 'deadlock' },
    internals: `<p>Server databases keep a <b>wait-for graph</b> of which transaction waits on which. PostgreSQL checks for cycles after <code>deadlock_timeout</code> (1 s); SQL Server\'s lock monitor runs every few seconds and picks the cheapest victim (error 1205); InnoDB detects immediately and rolls back the smaller transaction. SQLite avoids writer deadlocks by allowing one writer, but two DEFERRED transactions that both read and then try to write can block each other: one gets SQLITE_BUSY.</p>`,
    mistakes: [
      { wrong: `-- Job A: UPDATE invoice 3, then invoice 9\n-- Job B: UPDATE invoice 9, then invoice 3`, why: 'Opposite lock order is the classic deadlock recipe.', fix: `SELECT invoice_id FROM invoices WHERE invoice_id IN (3, 9) ORDER BY invoice_id;` },
      { wrong: `-- Catch the deadlock error and give up`, why: 'Deadlocks are expected in concurrent systems. The victim transaction was rolled back cleanly; retry the whole transaction (with a small random delay).', fix: `-- retry loop in the app runs the whole unit again:\nBEGIN IMMEDIATE;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 9;\nCOMMIT;` },
    ],
    rules: ['Lock rows/tables in a consistent order.', 'Keep transactions short; no user interaction inside.', 'Index your WHERE columns so updates lock fewer rows.', 'Always retry deadlock victims.'],
    compare: `<table><tr><th></th><th>Blocking</th><th>Deadlock</th></tr>
<tr><td>What</td><td>A waits for B</td><td>A waits for B and B waits for A</td></tr>
<tr><td>Resolves itself?</td><td>Yes, when B commits</td><td>No; the DB must kill one</td></tr>
<tr><td>Fix</td><td>Shorter transactions</td><td>Consistent lock order + retry</td></tr></table>`,
    realWorld: 'Two remittance files posting to overlapping invoices deadlocked nightly. Sorting each file\'s lines by invoice_id before posting eliminated the deadlocks.',
    deep: `<p>Other techniques: <code>SELECT ... FOR UPDATE</code> of all needed rows at the start (in id order), <code>NOWAIT</code> / <code>SKIP LOCKED</code> for work queues (each worker takes unlocked invoices without waiting), lock timeouts (<code>lock_timeout</code>, <code>SET LOCK_TIMEOUT</code>), and missing indexes on foreign keys, which cause wider locks during parent deletes/updates and are a frequent hidden cause of deadlocks.</p>`,
    dialectSql: {
      postgres: `BEGIN;\nSELECT invoice_id FROM invoices WHERE invoice_id IN (3, 9)\nORDER BY invoice_id FOR UPDATE;   -- lock both, in order\nUPDATE invoices SET status = 'Paid' WHERE invoice_id IN (3, 9);\nCOMMIT;\n-- victim error: ERROR: deadlock detected (SQLSTATE 40P01)`,
      sqlserver: `BEGIN TRANSACTION;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 9;\nCOMMIT;\n-- victim error: Msg 1205 ... chosen as the deadlock victim. Rerun the transaction.`,
      mysql: `START TRANSACTION;\nSELECT invoice_id FROM invoices WHERE invoice_id IN (3, 9) ORDER BY invoice_id FOR UPDATE;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id IN (3, 9);\nCOMMIT;\n-- victim error: ERROR 1213 (40001): Deadlock found when trying to get lock`,
      sqlite: `BEGIN IMMEDIATE;  -- write lock up front; other writers get SQLITE_BUSY\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 9;\nCOMMIT;`,
    },
    tryIt: { prompt: 'Use the safe pattern for a batch on patient 24\'s invoices: select the ids in ascending order first, then update them in that same order.', starter: `SELECT invoice_id FROM invoices WHERE patient_id = 24 ORDER BY invoice_id;\n\nBEGIN IMMEDIATE;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 1;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 4;\nCOMMIT;` },
    challenge: {
      level: 2,
      prompt: 'A posting job will update every invoice that has an Aetna Care (payor_id 2) payment. To avoid deadlocks it must lock them in ascending order. Return the distinct invoice_ids it will touch, in ascending order.',
      solution: `SELECT DISTINCT invoice_id FROM payments WHERE payor_id = 2 ORDER BY invoice_id;`,
      hints: ['The rows to touch come from payments.', 'Filter payor_id = 2.', 'Use DISTINCT so each invoice appears once.', 'ORDER BY invoice_id ascending.'],
      ordered: true,
    },
    quiz: [
      { q: 'What makes a deadlock different from ordinary blocking?', options: ['It is faster', 'There is a cycle of waits that cannot resolve itself', 'It only happens in SQLite', 'It needs three sessions'], answer: 1, why: 'Each waits on the other; the database must abort one.' },
      { q: 'Best prevention?', options: ['Longer transactions', 'Access rows in a consistent order and keep transactions short', 'Use READ UNCOMMITTED', 'Disable locking'], answer: 1, why: 'Consistent ordering prevents cycles.' },
      { q: 'Your transaction was chosen as the deadlock victim. What should the app do?', options: ['Crash', 'Retry the transaction', 'Commit anyway', 'Ignore it'], answer: 1, why: 'It was rolled back; run it again.' },
    ],
  },
  // ---------------------------------------------------------------- 21
  {
    id: 'dml-21',
    goals: ['The lost update problem in read-edit-save screens', 'How a version column detects conflicting edits', 'Writing the optimistic UPDATE and checking changes() = 0', 'Optimistic vs pessimistic locking: when to use each'],
    concept: `<p>A billing screen loads invoice 5, the clerk edits it for two minutes, then clicks Save. Meanwhile another clerk saved a different change to the same invoice. A plain <code>UPDATE ... WHERE invoice_id = 5</code> overwrites the first clerk's work without anyone noticing: a <b>lost update</b>.</p>
<p><b>Optimistic locking</b> assumes conflicts are rare, so it locks nothing while the user is editing. Instead each row carries a <b>version</b> number (or a last-modified timestamp):</p>
<ol>
<li>Read the row <i>and</i> its version: <code>SELECT ..., version FROM invoices WHERE invoice_id = 5</code> gives version 1.</li>
<li>Save with the version you read, and bump it in the same statement:<br><code>UPDATE invoices SET status = 'Paid', version = version + 1 WHERE invoice_id = 5 AND version = 1</code></li>
<li>Check how many rows changed (<code>changes()</code> in SQLite, the affected-row count in every driver). <b>1</b> = saved. <b>0</b> = someone else changed the row first: reload, show the user, and retry.</li>
</ol>
<p>The check-and-write happens in <b>one atomic UPDATE</b>, so two sessions can never both succeed with the same version.</p>`,
    why: 'Web and desktop billing apps keep records open for minutes; holding database locks that long would freeze everyone else, but silently overwriting edits corrupts claims and balances.',
    when: 'Edit forms, APIs and any read, think, then write workflow where conflicts are uncommon: invoice edits, patient demographics, payor setup screens.',
    analogy: 'Each paper chart has a revision stamp. You photocopy the chart (revision 1) and take it to your desk. When you come back to file your changes, the records clerk checks: is the chart still at revision 1? If a colleague already filed revision 2, your changes are refused and you must re-read the new version first.',
    syntax: `-- read\nSELECT cols, version FROM t WHERE id = :id;\n-- write\nUPDATE t SET col = :new, version = version + 1\nWHERE id = :id AND version = :version_read;\n-- rows affected = 0  ->  conflict: reload and retry`,
    sql: `ALTER TABLE invoices ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Clerk A and Clerk B both open invoice 5 and see version 1
SELECT invoice_id, status, total_amount, version FROM invoices WHERE invoice_id = 5;

-- Clerk A saves first: matches version 1, bumps it to 2
UPDATE invoices SET status = 'Paid', version = version + 1
WHERE invoice_id = 5 AND version = 1;
SELECT changes() AS clerk_a_rows;   -- 1 = saved

-- Clerk B saves with the stale version 1: nothing matches
UPDATE invoices SET total_amount = 150, version = version + 1
WHERE invoice_id = 5 AND version = 1;
SELECT changes() AS clerk_b_rows;   -- 0 = conflict, reload and retry

SELECT invoice_id, status, total_amount, version FROM invoices WHERE invoice_id = 5;`,
    breakdown: [
      ['ALTER TABLE invoices ADD COLUMN version ... DEFAULT 1', 'Every row starts at version 1'],
      ['SELECT ..., version', 'The app remembers the version it showed the user'],
      ['SET ..., version = version + 1', 'Each successful save creates a new version'],
      ['WHERE invoice_id = 5 AND version = 1', 'Only matches if nobody saved since we read it'],
      ['SELECT changes()', 'Rows changed by the last statement: 1 = success, 0 = conflict'],
      ['Final SELECT', 'Clerk A\'s change survived; Clerk B\'s was refused, not silently lost'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 250" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="110" y="20" text-anchor="middle" fill="var(--blue)" font-weight="bold">Clerk A</text>
<text x="320" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">invoices row 5</text>
<text x="530" y="20" text-anchor="middle" fill="var(--purple)" font-weight="bold">Clerk B</text>
<line x1="320" y1="28" x2="320" y2="240" stroke="var(--border)"/>
<rect x="250" y="34" width="140" height="26" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="320" y="51" text-anchor="middle" fill="var(--text)">Open, v1</text>
<text x="110" y="80" text-anchor="middle" fill="var(--text)">read: v1</text>
<text x="530" y="80" text-anchor="middle" fill="var(--text)">read: v1</text>
<text x="110" y="118" text-anchor="middle" fill="var(--text)" font-size="11">UPDATE ... WHERE version = 1</text>
<line x1="200" y1="114" x2="250" y2="130" stroke="var(--green)" stroke-width="2"/>
<rect x="250" y="120" width="140" height="26" rx="5" fill="var(--panel2)" stroke="var(--green)" stroke-width="2"/><text x="320" y="137" text-anchor="middle" fill="var(--text)">Paid, v2</text>
<text x="110" y="136" text-anchor="middle" fill="var(--green)" font-size="11">1 row changed: saved</text>
<text x="530" y="176" text-anchor="middle" fill="var(--text)" font-size="11">UPDATE ... WHERE version = 1</text>
<line x1="440" y1="172" x2="390" y2="140" stroke="var(--red)" stroke-width="2" stroke-dasharray="4"/>
<text x="530" y="194" text-anchor="middle" fill="var(--red)" font-size="11">0 rows changed: row is at v2</text>
<text x="530" y="222" text-anchor="middle" fill="var(--yellow)" font-size="11">reload v2, re-apply, save with version = 2</text>
<text x="320" y="240" text-anchor="middle" fill="var(--muted)" font-size="11">No locks held while editing; the conflict is detected at save time.</text>
</svg>` },
    internals: `<p>The UPDATE's WHERE clause is the whole trick. The database locks the row while it evaluates and writes it, so the test <code>version = 1</code> and the write <code>version = 2</code> happen atomically. If two sessions race, the second one waits for the first to commit, then re-checks the condition (PostgreSQL READ COMMITTED re-evaluates the WHERE on the new row version), finds version 2, and changes 0 rows.</p>
<p>Frameworks build this in: JPA/Hibernate <code>@Version</code>, Entity Framework <code>[ConcurrencyCheck]</code> / <code>rowversion</code>, Rails <code>lock_version</code>, Django packages. They raise an OptimisticLockException / DbUpdateConcurrencyException when the row count is 0. SQL Server's <code>rowversion</code> type changes automatically on every update, so the app never has to increment it.</p>`,
    mistakes: [
      { wrong: `UPDATE invoices SET version = version + 1 WHERE invoice_id = 5;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 5 AND version = 2;`, why: 'Bumping the version first and checking later is two statements: another session can slip in between. Check the old version and bump it in the same UPDATE.', fix: `ALTER TABLE invoices ADD COLUMN version INTEGER NOT NULL DEFAULT 1;\nUPDATE invoices SET status = 'Paid', version = version + 1\nWHERE invoice_id = 5 AND version = 1;\nSELECT changes();` },
      { wrong: `-- App ignores the affected-row count\nUPDATE invoices SET status = 'Paid', version = version + 1\nWHERE invoice_id = 5 AND version = 1;\n-- shows "Saved!" to the user`, why: 'If 0 rows changed, nothing was saved. The app must check the row count and tell the user about the conflict.', fix: `ALTER TABLE invoices ADD COLUMN version INTEGER NOT NULL DEFAULT 1;\nUPDATE invoices SET status = 'Paid', version = version + 1 WHERE invoice_id = 5 AND version = 1;\nSELECT CASE changes() WHEN 1 THEN 'saved' ELSE 'conflict: reload' END AS outcome;` },
      { wrong: `-- Use updated_at with one-second precision as the version\nUPDATE invoices SET status = 'Paid', updated_at = datetime('now')\nWHERE invoice_id = 5 AND updated_at = '2026-09-01 10:15:00';`, why: 'Two saves in the same second produce the same timestamp, so a conflict can go undetected, and clock changes break it. An integer version (or rowversion) is exact.', fix: `ALTER TABLE invoices ADD COLUMN version INTEGER NOT NULL DEFAULT 1;\nSELECT invoice_id, version FROM invoices WHERE invoice_id = 5;` },
    ],
    rules: ['Read the version with the data; send it back with the save.', 'Check and bump the version in one UPDATE.', 'Always check the affected-row count: 0 means conflict.', 'On conflict: reload, show or merge, retry. Never overwrite blindly.', 'Every writer to the table must use the version, including batch jobs.'],
    compare: `<table><tr><th></th><th>Optimistic</th><th>Pessimistic</th></tr>
<tr><td>Locks while user edits</td><td>None</td><td>Row locked (SELECT ... FOR UPDATE)</td></tr>
<tr><td>Conflict detected</td><td>At save (0 rows changed)</td><td>Prevented up front (others wait)</td></tr>
<tr><td>Best when</td><td>Conflicts are rare, edits are slow (forms, APIs)</td><td>Conflicts are frequent, the transaction is short</td></tr>
<tr><td>Cost of a conflict</td><td>User redoes or merges the edit</td><td>Waiting, possible deadlocks</td></tr>
<tr><td>Works across HTTP requests</td><td>Yes (version travels in the form / ETag)</td><td>No (a lock cannot outlive the transaction)</td></tr></table>`,
    realWorld: 'REST billing APIs return the version as an ETag; clients send it back in an If-Match header, and the server runs the versioned UPDATE, answering 412 Precondition Failed when 0 rows change. Claim-editing screens show "This claim was changed by J. Smith at 10:42. Reload?" instead of silently losing a coder\'s work.',
    tips: ['Return the new version to the client after a save (UPDATE ... RETURNING version).', 'Put the version in hidden form fields or ETags, never in session memory that can go stale.', 'Combine with a retry loop for automated jobs: re-read, re-apply, re-save, up to N times.'],
    deep: `<p>Optimistic locking protects one row. If a business rule spans rows ("total of payments must not exceed the invoice"), versioning each payment row is not enough: two sessions can insert two payments that are each fine alone. Version the parent row (bump the invoice's version whenever a payment is added) so the second transaction conflicts, or use SERIALIZABLE isolation.</p>
<p>A cheaper variant compares the columns you changed instead of a version (<code>WHERE invoice_id = 5 AND status = 'Open'</code>). It allows non-conflicting edits of other columns to proceed, but is easy to get wrong with NULLs; use <code>IS</code> instead of <code>=</code> for nullable columns.</p>`,
    dialectSql: {
      postgres: `UPDATE invoices SET status = 'Paid', version = version + 1\nWHERE invoice_id = 5 AND version = 1\nRETURNING version;   -- no row returned = conflict`,
      sqlserver: `-- rowversion changes automatically on every update\nALTER TABLE invoices ADD row_ver rowversion;\nUPDATE invoices SET status = 'Paid'\nWHERE invoice_id = 5 AND row_ver = @row_ver_read;\nIF @@ROWCOUNT = 0 THROW 50001, 'Invoice was changed by another user', 1;`,
      mysql: `UPDATE invoices SET status = 'Paid', version = version + 1\nWHERE invoice_id = 5 AND version = 1;\nSELECT ROW_COUNT();   -- 0 = conflict`,
      oracle: `UPDATE invoices SET status = 'Paid', version = version + 1\nWHERE invoice_id = 5 AND version = 1;\n-- in PL/SQL: IF SQL%ROWCOUNT = 0 THEN RAISE_APPLICATION_ERROR(-20001, 'conflict'); END IF;`,
      sqlite: `UPDATE invoices SET status = 'Paid', version = version + 1\nWHERE invoice_id = 5 AND version = 1\nRETURNING version;\nSELECT changes();`,
    },
    tryIt: { prompt: 'Play Clerk B after the conflict: reload the row, then save again with the version you just read. The second changes() should now be 1.', starter: `ALTER TABLE invoices ADD COLUMN version INTEGER NOT NULL DEFAULT 1;\n\n-- Clerk A saves\nUPDATE invoices SET status = 'Paid', version = version + 1 WHERE invoice_id = 5 AND version = 1;\n\n-- Clerk B (stale) tries\nUPDATE invoices SET total_amount = 150, version = version + 1 WHERE invoice_id = 5 AND version = 1;\nSELECT changes() AS clerk_b_first_try;\n\n-- Clerk B reloads\nSELECT invoice_id, status, total_amount, version FROM invoices WHERE invoice_id = 5;\n\n-- Clerk B retries with the version just read (edit the number)\nUPDATE invoices SET total_amount = 150, version = version + 1 WHERE invoice_id = 5 AND version = 1;\nSELECT changes() AS clerk_b_retry;` },
    challenge: {
      mode: 'state', level: 3,
      prompt: 'Add a version column (INTEGER NOT NULL DEFAULT 1) to invoices. Two clerks both opened invoice 5 at version 1. Run their saves as optimistic-lock UPDATEs, in order: (1) Clerk A sets status = \'Paid\'; (2) Clerk B, still holding version 1, sets total_amount = 150 (this must change nothing); (3) Clerk B reloads, sees version 2, and retries total_amount = 150 with the correct version. Every UPDATE must bump the version.',
      solution: `ALTER TABLE invoices ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

UPDATE invoices SET status = 'Paid', version = version + 1
WHERE invoice_id = 5 AND version = 1;

UPDATE invoices SET total_amount = 150, version = version + 1
WHERE invoice_id = 5 AND version = 1;

UPDATE invoices SET total_amount = 150, version = version + 1
WHERE invoice_id = 5 AND version = 2;`,
      check: `SELECT * FROM invoices WHERE invoice_id BETWEEN 4 AND 6 ORDER BY invoice_id`,
      hints: ['Start with ALTER TABLE invoices ADD COLUMN version INTEGER NOT NULL DEFAULT 1;', 'Each save is UPDATE invoices SET <change>, version = version + 1 WHERE invoice_id = 5 AND version = <version read>;', 'Clerk A and Clerk B\'s first try both use version = 1; only the first one matches.', 'Clerk B\'s retry uses version = 2. The final row should be Paid, 150, version 3.'],
    },
    quiz: [
      { q: 'An optimistic UPDATE ... WHERE id = 5 AND version = 3 changes 0 rows. What does it mean?', options: ['The update succeeded', 'Another session changed the row since you read it (or it was deleted)', 'The database is locked', 'The version column is missing'], answer: 1, why: 'The row is no longer at version 3, so nothing matched.' },
      { q: 'Why must the version check and increment be in the same UPDATE?', options: ['Style only', 'So the check and the write are atomic and no other session can slip in between', 'Because triggers need it', 'To save disk space'], answer: 1, why: 'One statement is atomic; two statements leave a gap.' },
      { q: 'Which suits a web form that stays open for minutes?', options: ['SELECT ... FOR UPDATE held until the user clicks Save', 'Optimistic locking with a version column', 'READ UNCOMMITTED', 'No concurrency control'], answer: 1, why: 'Locks cannot be held across HTTP requests; a version check works at save time.' },
    ],
  },
  // ---------------------------------------------------------------- 22
  {
    id: 'dml-22',
    goals: ['What pessimistic locking is: lock first, then work', 'SELECT ... FOR UPDATE, FOR SHARE, NOWAIT and SKIP LOCKED', 'Building a safe work queue with SKIP LOCKED', 'The SQLite equivalent: BEGIN IMMEDIATE'],
    concept: `<p><b>Pessimistic locking</b> assumes a conflict is likely, so it <b>locks the rows before changing them</b>. Other writers must wait until you commit.</p>
<pre>BEGIN;
SELECT total_amount, status FROM invoices WHERE invoice_id = 5 FOR UPDATE;  -- row locked
-- compute the new balance in the app
UPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;
COMMIT;   -- lock released</pre>
<ul>
<li><code>FOR UPDATE</code>: exclusive row lock. Others can still <i>read</i> (MVCC) but cannot update, delete or lock the row.</li>
<li><code>FOR SHARE</code>: shared lock: others may also read-lock, but nobody may change the row.</li>
<li><code>NOWAIT</code>: fail immediately instead of waiting if the row is locked.</li>
<li><code>SKIP LOCKED</code>: silently skip locked rows. Perfect for <b>work queues</b>: each worker grabs the next unlocked overdue invoice.</li>
</ul>
<p>SQL Server uses table hints (<code>WITH (UPDLOCK, ROWLOCK)</code>, <code>READPAST</code> for skip). <b>SQLite</b> has no row locks: <code>BEGIN IMMEDIATE</code> takes the database write lock at the start, so your read-then-write transaction cannot be interrupted by another writer.</p>`,
    why: 'Read-then-write logic (read the balance, compute, write the new balance) loses updates when two sessions interleave. Locking the row on read makes the second session wait for the first.',
    when: 'Short transactions with a real risk of collision: posting payments to the same invoice, allocating a limited resource, and dispatching queue items to parallel workers.',
    analogy: 'Pulling a patient\'s paper chart from the shelf and signing it out: while it is on your desk, nobody else can write in it. Colleagues who need it wait at the shelf (FOR UPDATE), give up at once (NOWAIT), or move on to the next chart in the stack (SKIP LOCKED).',
    syntax: `BEGIN;\nSELECT ... FROM t WHERE ... FOR UPDATE [NOWAIT | SKIP LOCKED];\nUPDATE t SET ... WHERE ...;\nCOMMIT;`,
    dialect: 'postgres',
    sql: `-- 1) Read-then-write safely: lock the invoice before computing its balance
BEGIN;
SELECT i.invoice_id, i.total_amount,
       (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.invoice_id) AS paid
FROM invoices i
WHERE i.invoice_id = 5
FOR UPDATE OF i;                       -- other posters of invoice 5 now wait

INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)
VALUES (5, 2, CURRENT_DATE, 135, 'EFT');
UPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;
COMMIT;                                -- lock released

-- 2) Work queue: each collector grabs 3 overdue invoices nobody else holds
BEGIN;
SELECT invoice_id, due_date, total_amount
FROM invoices
WHERE status = 'Overdue'
ORDER BY due_date
LIMIT 3
FOR UPDATE SKIP LOCKED;
-- ... call the patients, record notes ...
COMMIT;`,
    breakdown: [
      ['BEGIN;', 'Locks live only as long as the transaction'],
      ['FOR UPDATE OF i', 'Exclusive lock on the invoice row (only table i, not the subquery)'],
      ['INSERT ... / UPDATE ...', 'Safe: no other session can change invoice 5 until COMMIT'],
      ['COMMIT;', 'Releases the lock; the waiting session continues and sees the new data'],
      ['ORDER BY due_date LIMIT 3', 'Oldest overdue invoices first'],
      ['FOR UPDATE SKIP LOCKED', 'Rows locked by other workers are skipped, so workers never collide or wait'],
    ],
    visual: { type: 'txn', scenario: 'lostupdate' },
    internals: `<p>In PostgreSQL a row lock is stored <b>in the row itself</b> (its xmax field marks the locking transaction), so millions of row locks cost no lock-table memory. A second <code>FOR UPDATE</code> on the same row sleeps on the first transaction's id until it commits or rolls back. In READ COMMITTED it then re-reads the latest version of the row and re-checks the WHERE.</p>
<p>InnoDB (MySQL) locks <b>index records</b>; a FOR UPDATE on a column without an index can lock far more rows than intended. SQL Server keeps locks in a lock manager and may escalate thousands of row locks to a table lock. SQLite locks the whole database file: one writer at a time. <code>BEGIN IMMEDIATE</code> acquires the RESERVED (write) lock immediately, so a later write in the same transaction never has to upgrade a read lock, which is where SQLite "deadlocks" (SQLITE_BUSY) come from.</p>`,
    mistakes: [
      { wrong: `SELECT total_amount FROM invoices WHERE invoice_id = 5 FOR UPDATE;\n-- (autocommit: the lock is released as soon as the SELECT ends)\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;`, why: 'Without BEGIN, each statement is its own transaction, so the lock disappears before the UPDATE. Wrap the SELECT FOR UPDATE and the writes in one transaction.', fix: `BEGIN;\nSELECT total_amount FROM invoices WHERE invoice_id = 5 FOR UPDATE;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;\nCOMMIT;` },
      { wrong: `BEGIN;\nSELECT * FROM invoices WHERE invoice_id = 5 FOR UPDATE;\n-- open the edit form and wait for the user to click Save...`, why: 'The row stays locked for minutes, blocking every other poster and inviting deadlocks. Never hold locks during user think-time; use optimistic locking for forms.', fix: `-- read without locking, then save with a version check:\nUPDATE invoices SET status = 'Paid', version = version + 1\nWHERE invoice_id = 5 AND version = 1;` },
      { wrong: `-- Two workers, no SKIP LOCKED\nSELECT invoice_id FROM invoices WHERE status = 'Overdue' ORDER BY due_date LIMIT 1 FOR UPDATE;`, why: 'Every worker targets the same oldest row: the second worker waits for the first, and then both call the same patient. SKIP LOCKED gives each worker a different row.', fix: `SELECT invoice_id FROM invoices WHERE status = 'Overdue'\nORDER BY due_date LIMIT 1 FOR UPDATE SKIP LOCKED;` },
    ],
    rules: ['Lock only inside an explicit transaction, and keep it short.', 'Lock rows in a consistent order (e.g. ascending invoice_id) to avoid deadlocks.', 'Use SKIP LOCKED for queues and NOWAIT when waiting is worse than failing.', 'No user think-time inside a locking transaction.', 'SQLite: BEGIN IMMEDIATE for read-then-write transactions.'],
    compare: `<table><tr><th>Syntax</th><th>PostgreSQL</th><th>MySQL 8</th><th>SQL Server</th><th>Oracle</th><th>SQLite</th></tr>
<tr><td>Exclusive row lock</td><td>FOR UPDATE</td><td>FOR UPDATE</td><td>WITH (UPDLOCK, ROWLOCK)</td><td>FOR UPDATE</td><td>BEGIN IMMEDIATE (whole DB)</td></tr>
<tr><td>Shared row lock</td><td>FOR SHARE</td><td>FOR SHARE</td><td>WITH (HOLDLOCK)</td><td>-</td><td>-</td></tr>
<tr><td>Don't wait</td><td>NOWAIT</td><td>NOWAIT</td><td>SET LOCK_TIMEOUT 0</td><td>NOWAIT / WAIT n</td><td>busy_timeout = 0</td></tr>
<tr><td>Skip locked rows</td><td>SKIP LOCKED</td><td>SKIP LOCKED</td><td>WITH (READPAST)</td><td>SKIP LOCKED</td><td>-</td></tr></table>`,
    realWorld: 'Collections platforms run a dozen worker processes that each fetch the next overdue accounts with FOR UPDATE SKIP LOCKED, so no patient is called twice. Payment posting locks the invoice row (FOR UPDATE) while it computes the remaining balance, so two ERA files posting to the same invoice cannot both mark it underpaid.',
    tips: ['In PostgreSQL, FOR NO KEY UPDATE is a lighter lock that does not block inserts of child rows referencing the locked row.', 'Set a lock timeout (lock_timeout, innodb_lock_wait_timeout, SET LOCK_TIMEOUT) so a stuck session produces an error instead of hanging forever.', 'With joins, FOR UPDATE OF table locks only the named table\'s rows.'],
    deep: `<p>A classic alternative to SELECT FOR UPDATE for counters and balances is to do the read and write in one statement: <code>UPDATE invoices SET balance = balance - 135 WHERE invoice_id = 5 AND balance &gt;= 135 RETURNING balance</code>. The row lock is taken by the UPDATE itself, so no separate locking read is needed.</p>
<p>SKIP LOCKED gives an inconsistent view on purpose (locked rows are invisible), which is right for queues and wrong for reports. It also does not guarantee strict FIFO order across workers.</p>`,
    dialectSql: {
      postgres: `BEGIN;\nSELECT * FROM invoices WHERE invoice_id = 5 FOR UPDATE NOWAIT;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;\nCOMMIT;`,
      mysql: `START TRANSACTION;\nSELECT * FROM invoices WHERE status = 'Overdue'\nORDER BY due_date LIMIT 3 FOR UPDATE SKIP LOCKED;\nCOMMIT;`,
      sqlserver: `BEGIN TRANSACTION;\nSELECT TOP (3) invoice_id FROM invoices WITH (UPDLOCK, ROWLOCK, READPAST)\nWHERE status = 'Overdue' ORDER BY due_date;\nCOMMIT;`,
      oracle: `SELECT invoice_id FROM invoices\nWHERE status = 'Overdue'\nFOR UPDATE SKIP LOCKED;   -- use FETCH FIRST in a subquery to limit\nCOMMIT;`,
      sqlite: `BEGIN IMMEDIATE;   -- write lock now: no other writer can interleave\nSELECT total_amount FROM invoices WHERE invoice_id = 5;\nINSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (5, 2, '2026-09-01', 135, 'EFT');\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;\nCOMMIT;`,
    },
    tryIt: { prompt: 'The SQLite version of "lock, read, write": BEGIN IMMEDIATE holds the write lock for the whole read-compute-write. Change the payment amount to 100 and see the status become Partially Paid.', starter: `BEGIN IMMEDIATE;\n\nINSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (5, 2, '2026-09-01', 135, 'EFT');\n\nUPDATE invoices\nSET status = CASE\n  WHEN (SELECT SUM(amount) FROM payments WHERE invoice_id = 5) >= total_amount THEN 'Paid'\n  ELSE 'Partially Paid' END\nWHERE invoice_id = 5;\n\nCOMMIT;\n\nSELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id = 5;` },
    challenge: {
      mode: 'state', level: 3,
      prompt: 'SQLite has no SKIP LOCKED, but a single UPDATE is atomic, so it can "claim" queue rows safely. Add a column claimed_by TEXT to invoices. Then, inside BEGIN IMMEDIATE ... COMMIT, claim for \'worker-1\' the 3 unclaimed Overdue invoices with the oldest due_date.',
      solution: `ALTER TABLE invoices ADD COLUMN claimed_by TEXT;

BEGIN IMMEDIATE;
UPDATE invoices
SET claimed_by = 'worker-1'
WHERE invoice_id IN (
  SELECT invoice_id FROM invoices
  WHERE status = 'Overdue' AND claimed_by IS NULL
  ORDER BY due_date
  LIMIT 3
);
COMMIT;`,
      check: `SELECT * FROM invoices WHERE status = 'Overdue' ORDER BY due_date`,
      hints: ['First ALTER TABLE invoices ADD COLUMN claimed_by TEXT;', 'Wrap the claim in BEGIN IMMEDIATE; ... COMMIT;', 'UPDATE invoices SET claimed_by = \'worker-1\' WHERE invoice_id IN (a subquery that picks the rows).', 'Subquery: SELECT invoice_id FROM invoices WHERE status = \'Overdue\' AND claimed_by IS NULL ORDER BY due_date LIMIT 3'],
    },
    quiz: [
      { q: 'What does FOR UPDATE SKIP LOCKED do?', options: ['Waits for locked rows', 'Returns only rows no other transaction has locked, and locks them', 'Skips the UPDATE', 'Reads uncommitted data'], answer: 1, why: 'Locked rows are skipped instead of waited on: ideal for work queues.' },
      { q: 'You run SELECT ... FOR UPDATE in autocommit mode. How long is the row locked?', options: ['Until COMMIT', 'Only for that statement', 'Until the connection closes', 'Forever'], answer: 1, why: 'Each statement is its own transaction, so the lock ends with it.' },
      { q: 'What is the closest SQLite equivalent?', options: ['SELECT ... FOR UPDATE', 'BEGIN IMMEDIATE, which takes the database write lock up front', 'PRAGMA row_lock', 'There is no way to prevent interleaving'], answer: 1, why: 'SQLite locks the whole database for writing; IMMEDIATE takes that lock at the start.' },
    ],
  },
  // ---------------------------------------------------------------- 23
  {
    id: 'dml-23',
    goals: ['What MVCC (multi-version concurrency control) is', 'Snapshots: which row version each transaction sees', 'Why readers do not block writers and writers do not block readers', 'The cleanup cost: dead versions, VACUUM and long-running transactions'],
    concept: `<p>With plain locking, a report reading invoices would block a clerk posting a payment, and vice versa. <b>MVCC</b> avoids that by keeping <b>several versions</b> of a row:</p>
<ul>
<li>An UPDATE does not overwrite the row. It writes a <b>new version</b> and marks the old one as ended by that transaction.</li>
<li>Each transaction (or statement) reads from a <b>snapshot</b>: the database as it was when the snapshot was taken. It sees the newest version committed <i>before</i> its snapshot and ignores later ones.</li>
<li>So a long report sees a stable, consistent picture while posting continues, and the posting never waits for the report.</li>
</ul>
<p>Each version carries two stamps (PostgreSQL calls them <code>xmin</code> and <code>xmax</code>): the transaction that <b>created</b> it and the one that <b>replaced or deleted</b> it. A snapshot taken at time T sees a version when <code>xmin &lt;= T</code> (and xmin committed) and (<code>xmax</code> is empty or <code>xmax &gt; T</code>).</p>
<p>Writers still block <b>writers</b> on the same row: two sessions cannot both create the next version of invoice 5 at once. Old versions that no snapshot can see anymore are "dead" and are removed later (VACUUM in PostgreSQL, the undo log purge in MySQL/Oracle, tempdb version store in SQL Server).</p>`,
    why: 'Billing systems run long reports and constant posting at the same time. MVCC lets both proceed without waiting and gives every report a consistent point-in-time view.',
    when: 'Always, in practice: PostgreSQL, Oracle, MySQL InnoDB and SQLite in WAL mode are MVCC by design; SQL Server uses it when READ_COMMITTED_SNAPSHOT or SNAPSHOT isolation is on.',
    analogy: 'Instead of erasing a line in the ledger, the billing office writes the corrected line below and notes "superseded at 10:05" on the old one. An auditor who started reviewing at 10:00 keeps reading the lines as they were at 10:00; the clerk keeps posting new lines without waiting for the auditor. At night, a janitor removes superseded lines nobody is still reviewing.',
    syntax: `-- Visibility rule for a snapshot taken at transaction id T\nWHERE xmin <= T                    -- created before the snapshot\n  AND (xmax IS NULL OR xmax > T)   -- not yet replaced at the snapshot`,
    sql: `-- A simulation of how PostgreSQL stores row versions of invoice 5
CREATE TABLE invoice_versions (
  invoice_id INTEGER,
  status     TEXT,
  paid       REAL,
  xmin       INTEGER,   -- transaction that created this version
  xmax       INTEGER    -- transaction that replaced it (NULL = still current)
);
INSERT INTO invoice_versions VALUES
  (5, 'Open',           0,   100, 205),   -- created by txn 100, replaced by 205
  (5, 'Partially Paid', 60,  205, 310),   -- payment posted by txn 205
  (5, 'Paid',           135, 310, NULL);  -- final payment by txn 310

-- What does each snapshot see? (one row per snapshot)
SELECT s.snapshot_txid, v.status, v.paid
FROM (SELECT 150 AS snapshot_txid UNION ALL SELECT 250 UNION ALL SELECT 400) s
JOIN invoice_versions v
  ON v.xmin <= s.snapshot_txid
 AND (v.xmax IS NULL OR v.xmax > s.snapshot_txid)
ORDER BY s.snapshot_txid;`,
    breakdown: [
      ['CREATE TABLE invoice_versions (... xmin, xmax)', 'Every physical row version carries creator and replacer transaction ids'],
      ['(5, \'Open\', 0, 100, 205)', 'Version 1: born in txn 100, superseded by txn 205'],
      ['(5, \'Paid\', 135, 310, NULL)', 'The current version: nobody has replaced it'],
      ['snapshot_txid 150 / 250 / 400', 'Three transactions that started at different moments'],
      ['v.xmin <= s.snapshot_txid', 'The version existed when the snapshot was taken'],
      ['v.xmax IS NULL OR v.xmax > s.snapshot_txid', 'It had not yet been replaced at that moment'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 240" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="320" y="18" text-anchor="middle" fill="var(--text)" font-weight="bold">Row versions of invoice 5 over time (transaction ids)</text>
<line x1="40" y1="150" x2="610" y2="150" stroke="var(--muted)"/>
<text x="70" y="168" text-anchor="middle" fill="var(--muted)" font-size="11">100</text>
<text x="250" y="168" text-anchor="middle" fill="var(--muted)" font-size="11">205</text>
<text x="430" y="168" text-anchor="middle" fill="var(--muted)" font-size="11">310</text>
<text x="600" y="168" text-anchor="end" fill="var(--muted)" font-size="11">txn id</text>
<rect x="70" y="100" width="180" height="36" rx="6" fill="var(--panel2)" stroke="var(--muted)"/>
<text x="160" y="116" text-anchor="middle" fill="var(--text)">v1: Open, paid 0</text><text x="160" y="130" text-anchor="middle" fill="var(--muted)" font-size="10">xmin 100, xmax 205 (dead later)</text>
<rect x="250" y="100" width="180" height="36" rx="6" fill="var(--panel2)" stroke="var(--muted)"/>
<text x="340" y="116" text-anchor="middle" fill="var(--text)">v2: Partially Paid, 60</text><text x="340" y="130" text-anchor="middle" fill="var(--muted)" font-size="10">xmin 205, xmax 310</text>
<rect x="430" y="100" width="180" height="36" rx="6" fill="var(--panel2)" stroke="var(--green)" stroke-width="2"/>
<text x="520" y="116" text-anchor="middle" fill="var(--text)">v3: Paid, 135</text><text x="520" y="130" text-anchor="middle" fill="var(--green)" font-size="10">xmin 310, xmax NULL (current)</text>
<line x1="150" y1="40" x2="150" y2="100" stroke="var(--blue)" stroke-width="2" stroke-dasharray="4"/>
<text x="150" y="34" text-anchor="middle" fill="var(--blue)" font-size="11">report snapshot 150 &#8594; Open</text>
<line x1="330" y1="56" x2="330" y2="100" stroke="var(--purple)" stroke-width="2" stroke-dasharray="4"/>
<text x="330" y="50" text-anchor="middle" fill="var(--purple)" font-size="11">snapshot 250 &#8594; Partially Paid</text>
<line x1="560" y1="72" x2="560" y2="100" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4"/>
<text x="560" y="66" text-anchor="middle" fill="var(--accent)" font-size="11">snapshot 400 &#8594; Paid</text>
<text x="320" y="196" text-anchor="middle" fill="var(--text)" font-size="11">Txn 310 wrote v3 while snapshot 150 was still reading v1: nobody waited.</text>
<text x="320" y="216" text-anchor="middle" fill="var(--muted)" font-size="11">v1 and v2 become dead once no running snapshot needs them; VACUUM / purge reclaims them.</text>
</svg>` },
    internals: `<p><b>PostgreSQL</b> stores every version in the table itself (the "heap"); an UPDATE is effectively an INSERT of a new tuple plus setting <code>xmax</code> on the old one. Indexes may point at several versions. VACUUM later removes dead tuples, and autovacuum does this in the background. <b>Oracle and MySQL InnoDB</b> update the row in place and keep old versions in an <b>undo log</b>; readers reconstruct the older version from undo. <b>SQL Server</b> (with snapshot isolation) copies old versions into a version store in tempdb. <b>SQLite in WAL mode</b> appends changed pages to the write-ahead log; a reader remembers the WAL position when it started and ignores pages written after it, giving it a snapshot while one writer continues.</p>
<p>Snapshot timing depends on isolation: READ COMMITTED takes a new snapshot for <b>each statement</b>; REPEATABLE READ / SNAPSHOT takes one for the <b>whole transaction</b>.</p>`,
    mistakes: [
      { wrong: `BEGIN;  -- REPEATABLE READ, then left open for hours by a forgotten session\nSELECT COUNT(*) FROM transactions;`, why: 'An old snapshot keeps every version created since it started "possibly needed", so VACUUM / undo purge cannot remove dead rows. Tables and indexes bloat and queries slow down. Close transactions promptly and set idle-in-transaction timeouts.', fix: `SELECT COUNT(*) FROM transactions;  -- autocommit: the snapshot ends with the statement` },
      { wrong: `-- "MVCC means nothing ever blocks"\n-- Session A: UPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;  (not committed)\n-- Session B: UPDATE invoices SET status = 'Void' WHERE invoice_id = 5;`, why: 'Readers and writers do not block each other, but two writers on the same row still do: Session B waits for A (or gets a serialization error at REPEATABLE READ).', fix: `UPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 5;` },
      { wrong: `-- Report across two statements in READ COMMITTED\nSELECT SUM(total_amount) FROM invoices;\nSELECT SUM(amount) FROM payments;`, why: 'Each statement gets a new snapshot, so payments posted in between make the two totals inconsistent. Use one statement or a REPEATABLE READ / SNAPSHOT transaction.', fix: `SELECT (SELECT SUM(total_amount) FROM invoices) AS billed,\n       (SELECT SUM(amount) FROM payments) AS collected;` },
    ],
    rules: ['MVCC: writers create new versions; readers read a snapshot.', 'Readers never block writers, writers never block readers; writers still block writers on the same row.', 'READ COMMITTED = new snapshot per statement; REPEATABLE READ / SNAPSHOT = one per transaction.', 'Long-open transactions stop cleanup of dead versions: keep them short.'],
    compare: `<table><tr><th>Database</th><th>Old versions live in</th><th>Cleanup</th></tr>
<tr><td>PostgreSQL</td><td>The table (dead tuples)</td><td>VACUUM / autovacuum</td></tr>
<tr><td>Oracle</td><td>Undo tablespace</td><td>Automatic; "snapshot too old" if undo is overwritten</td></tr>
<tr><td>MySQL InnoDB</td><td>Undo log</td><td>Purge thread</td></tr>
<tr><td>SQL Server</td><td>tempdb version store (RCSI / SNAPSHOT)</td><td>Automatic cleanup</td></tr>
<tr><td>SQLite (WAL)</td><td>WAL file pages</td><td>Checkpoint</td></tr></table>
<p>Versus pure locking (SQL Server default READ COMMITTED without RCSI, SQLite rollback-journal mode): readers take shared locks and wait for writers, and writers wait for readers.</p>`,
    realWorld: 'A month-end A/R aging report runs for 20 minutes against the live billing database while payment posting continues. Thanks to MVCC the report sees exactly the state at its start, and cashiers never wait. The flip side: a reporting tool that left a transaction open overnight caused the transactions table to bloat to three times its size until VACUUM could catch up.',
    tips: ['In PostgreSQL you can see a row\'s versions stamps: SELECT xmin, xmax, * FROM invoices.', 'Turn on READ_COMMITTED_SNAPSHOT in SQL Server to get MVCC reads and far less reader/writer blocking.', 'Use PRAGMA journal_mode = WAL in SQLite apps so readers are not blocked by the writer.'],
    deep: `<p>Visibility is more than comparing numbers: a snapshot also records which transactions were <b>still in progress</b> when it was taken (PostgreSQL stores xmin, xmax and a list of in-progress xids), and versions created by those, or by aborted transactions, stay invisible even if their id is lower. Commit status is looked up in the commit log (pg_xact).</p>
<p>Snapshot isolation allows <b>write skew</b>: two transactions read the same data, each writes a different row, and together they break a rule neither broke alone. PostgreSQL's SERIALIZABLE adds predicate tracking (SSI) on top of MVCC to detect this and abort one of them.</p>`,
    dialectSql: {
      postgres: `-- see the hidden version stamps\nSELECT xmin, xmax, invoice_id, status FROM invoices WHERE invoice_id = 5;\nBEGIN ISOLATION LEVEL REPEATABLE READ;   -- one snapshot for the whole transaction\nSELECT SUM(total_amount) FROM invoices;\nCOMMIT;\nVACUUM (VERBOSE) invoices;`,
      sqlserver: `ALTER DATABASE Billing SET READ_COMMITTED_SNAPSHOT ON;\nALTER DATABASE Billing SET ALLOW_SNAPSHOT_ISOLATION ON;\nSET TRANSACTION ISOLATION LEVEL SNAPSHOT;\nBEGIN TRANSACTION;\nSELECT SUM(total_amount) FROM invoices;\nCOMMIT;`,
      mysql: `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;  -- InnoDB default: consistent snapshot\nSTART TRANSACTION WITH CONSISTENT SNAPSHOT;\nSELECT SUM(total_amount) FROM invoices;\nCOMMIT;`,
      oracle: `-- every query is read-consistent; for a whole transaction:\nSET TRANSACTION READ ONLY;\nSELECT SUM(total_amount) FROM invoices;\nCOMMIT;`,
      sqlite: `PRAGMA journal_mode = WAL;   -- readers get a snapshot, one writer continues\nBEGIN;\nSELECT SUM(total_amount) FROM invoices;\nSELECT SUM(amount) FROM payments;\nCOMMIT;`,
    },
    tryIt: { prompt: 'Add a snapshot at txn 310 and one at 309: which versions do they see? Then simulate a delete by txn 500 (set xmax = 500 on the current version) and query snapshot 600.', starter: `CREATE TABLE invoice_versions (invoice_id INTEGER, status TEXT, paid REAL, xmin INTEGER, xmax INTEGER);\nINSERT INTO invoice_versions VALUES\n  (5, 'Open', 0, 100, 205),\n  (5, 'Partially Paid', 60, 205, 310),\n  (5, 'Paid', 135, 310, NULL);\n\nSELECT s.snapshot_txid, v.status, v.paid\nFROM (SELECT 150 AS snapshot_txid UNION ALL SELECT 250 UNION ALL SELECT 400) s\nLEFT JOIN invoice_versions v\n  ON v.xmin <= s.snapshot_txid AND (v.xmax IS NULL OR v.xmax > s.snapshot_txid)\nORDER BY s.snapshot_txid;` },
    challenge: {
      mode: 'state', level: 3,
      starter: `CREATE TABLE invoice_versions (invoice_id INTEGER, status TEXT, xmin INTEGER, xmax INTEGER);
INSERT INTO invoice_versions VALUES
  (5, 'Open', 100, 205),
  (5, 'Partially Paid', 205, NULL),
  (9, 'Overdue', 150, NULL);

-- Transaction 400 voids invoice 5. Write the MVCC-style change below:
`,
      prompt: 'Keep the starter (it builds a version table like PostgreSQL\'s). Transaction 400 changes invoice 5\'s status to \'Void\'. MVCC never overwrites: (1) close the current version of invoice 5 by setting its xmax = 400, and (2) insert the new version (5, \'Void\') with xmin = 400 and xmax = NULL. Invoice 9 must not change.',
      solution: `CREATE TABLE invoice_versions (invoice_id INTEGER, status TEXT, xmin INTEGER, xmax INTEGER);
INSERT INTO invoice_versions VALUES
  (5, 'Open', 100, 205),
  (5, 'Partially Paid', 205, NULL),
  (9, 'Overdue', 150, NULL);

UPDATE invoice_versions SET xmax = 400
WHERE invoice_id = 5 AND xmax IS NULL;

INSERT INTO invoice_versions (invoice_id, status, xmin, xmax)
VALUES (5, 'Void', 400, NULL);`,
      check: `CREATE TABLE IF NOT EXISTS invoice_versions (invoice_id INTEGER, status TEXT, xmin INTEGER, xmax INTEGER);
SELECT invoice_id, status, xmin, xmax FROM invoice_versions ORDER BY invoice_id, xmin`,
      hints: ['Leave the starter statements in place; add two statements after them.', 'The current version is the one whose xmax IS NULL.', 'UPDATE invoice_versions SET xmax = 400 WHERE invoice_id = 5 AND xmax IS NULL;', 'INSERT INTO invoice_versions VALUES (5, \'Void\', 400, NULL);'],
    },
    quiz: [
      { q: 'Under MVCC, a report is reading invoices while a clerk updates invoice 5. What happens?', options: ['The clerk waits for the report', 'The report waits for the clerk', 'Neither waits: the report reads the old version from its snapshot', 'The report fails'], answer: 2, why: 'The update creates a new version; the report keeps reading the version visible to its snapshot.' },
      { q: 'Which still blocks under MVCC?', options: ['A reader and a writer on the same row', 'Two writers on the same row', 'Two readers', 'Nothing ever'], answer: 1, why: 'Only one transaction can create the next version of a row at a time.' },
      { q: 'Why is a transaction left open for hours harmful in PostgreSQL?', options: ['It holds table locks', 'Its old snapshot prevents VACUUM from removing dead row versions, causing bloat', 'It uses too much CPU', 'It is not harmful'], answer: 1, why: 'Versions a snapshot might need cannot be cleaned up.' },
    ],
  },
  // ---------------------------------------------------------------- 24
  {
    id: 'dml-24',
    goals: ['What happens to a transaction when a statement fails', 'T-SQL TRY/CATCH, PL/pgSQL EXCEPTION blocks and MySQL handlers', 'SQLite conflict clauses: INSERT OR IGNORE / REPLACE / ABORT / FAIL / ROLLBACK, and UPSERT', 'Raising your own errors with RAISE() in triggers'],
    concept: `<p>Statements fail: a duplicate key, a CHECK constraint (status 'Closed' is not allowed), a NOT NULL column, a business rule. Good error handling decides three things: <b>what to undo</b>, <b>what to report</b>, and <b>whether to continue</b>.</p>
<ul>
<li><b>Statement-level atomicity</b>: a failed statement is undone completely (all of its rows), in every database.</li>
<li><b>The transaction</b> is a different story: SQLite, SQL Server and MySQL keep the transaction open after a statement error, so earlier statements are still pending. <i>You</i> must ROLLBACK. PostgreSQL marks the whole transaction as failed: every later statement errors until you ROLLBACK (or roll back to a savepoint).</li>
<li><b>Procedural handlers</b> catch errors on the server: <code>BEGIN TRY ... END TRY BEGIN CATCH ... END CATCH</code> (SQL Server), <code>BEGIN ... EXCEPTION WHEN ... THEN ... END</code> (PL/pgSQL, PL/SQL), <code>DECLARE ... HANDLER FOR SQLEXCEPTION</code> (MySQL).</li>
</ul>
<p><b>SQLite</b> has no procedural language. It offers <b>conflict clauses</b> instead, which say what to do when a constraint fails:</p>
<ul>
<li><code>INSERT OR IGNORE</code>: skip the bad row, keep going.</li>
<li><code>INSERT OR REPLACE</code>: delete the conflicting row, insert the new one.</li>
<li><code>OR ABORT</code> (default): undo this statement. <code>OR FAIL</code>: stop, keep rows already changed by this statement. <code>OR ROLLBACK</code>: undo the whole transaction.</li>
<li><code>INSERT ... ON CONFLICT (col) DO UPDATE / DO NOTHING</code>: UPSERT for UNIQUE / PRIMARY KEY conflicts.</li>
<li>In triggers, <code>RAISE(ABORT | FAIL | ROLLBACK, 'message')</code> or <code>RAISE(IGNORE)</code> to enforce your own rules.</li>
</ul>`,
    why: 'A payment batch that half-posts, or a script that keeps running after an error inside an open transaction, leaves balances wrong. Error handling makes failures clean, visible and recoverable.',
    when: 'Batch imports (ERA/835 remittances, eligibility files), multi-step postings, triggers that enforce billing rules, and any procedure that must log failures.',
    analogy: 'Posting a stack of checks: if one check is unreadable, you can set it aside and keep going (INSERT OR IGNORE), stop and undo just that check (ABORT), or undo the whole deposit and start over (ROLLBACK). The CATCH block is the supervisor who writes the problem in the exceptions log and decides which of those to do.',
    syntax: `-- SQLite\nINSERT OR {IGNORE | REPLACE | ABORT | FAIL | ROLLBACK} INTO t ...;\nINSERT INTO t ... ON CONFLICT (col) DO {NOTHING | UPDATE SET ...};\nSELECT RAISE({ABORT | FAIL | ROLLBACK}, 'msg');  -- inside a trigger\n-- SQL Server\nBEGIN TRY ... END TRY BEGIN CATCH ... END CATCH\n-- PostgreSQL\nBEGIN ... EXCEPTION WHEN unique_violation THEN ... END;`,
    sql: `-- 1) Skip rows that break a constraint (duplicate payment_id 1)
INSERT OR IGNORE INTO payments (payment_id, invoice_id, payor_id, payment_date, amount, method)
VALUES (1,  1, NULL, '2025-05-09', 165, 'Cash'),   -- duplicate key: skipped
       (48, 5, 2,    '2026-09-01', 135, 'EFT');    -- new: inserted

-- 2) Turn a key conflict into an update (UPSERT)
INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)
VALUES (5, 'United Workers Comp', 'Workers Comp', 0.92)
ON CONFLICT (payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;

-- 3) Your own business rule, raised as an error from a trigger
CREATE TRIGGER trg_payments_positive
BEFORE INSERT ON payments
WHEN NEW.amount <= 0
BEGIN
  SELECT RAISE(ABORT, 'payment amount must be positive');
END;

SELECT payor_id, payor_name, contract_rate FROM payors WHERE payor_id = 5;
SELECT payment_id, invoice_id, amount, method FROM payments WHERE payment_id IN (1, 48) ORDER BY payment_id;`,
    breakdown: [
      ['INSERT OR IGNORE', 'Rows that violate a constraint are skipped silently; the others go in'],
      ['(1, 1, NULL, ...)', 'payment_id 1 already exists: this row is ignored'],
      ['ON CONFLICT (payor_id) DO UPDATE', 'UPSERT: instead of failing on the existing key, update it'],
      ['excluded.contract_rate', 'The value the failed INSERT tried to write'],
      ['BEFORE INSERT ... WHEN NEW.amount <= 0', 'The trigger fires only for bad rows'],
      ['RAISE(ABORT, \'...\')', 'Undo the current statement and return the message as an error'],
    ],
    visual: { type: 'flow', steps: [['BEGIN TRANSACTION', 'start the payment posting'], ['BEGIN TRY: INSERT payment, INSERT ledger line, UPDATE invoice', 'normal path'], ['Error? (constraint, RAISE, deadlock)', 'control jumps to CATCH / EXCEPTION'], ['CATCH: ROLLBACK', 'undo every step of this posting'], ['Log the error', 'ERROR_NUMBER(), ERROR_MESSAGE() / SQLSTATE, SQLERRM into an error table'], ['Re-raise (THROW / RAISE) or retry', 'the caller learns it failed; deadlocks are retried'], ['No error: COMMIT', 'all steps saved together']] },
    internals: `<p>Every database wraps each statement in an implicit <b>statement savepoint</b>: if row 3 of a 10-row INSERT fails, rows 1-2 are undone too (unless SQLite <code>OR FAIL</code> is used). What happens next differs:</p>
<ul>
<li><b>SQLite</b>: the transaction stays open. <code>OR ROLLBACK</code> or <code>RAISE(ROLLBACK, ...)</code> ends it immediately. Some errors (SQLITE_FULL, SQLITE_IOERR, SQLITE_NOMEM) may roll back automatically.</li>
<li><b>PostgreSQL</b>: the transaction enters an "aborted" state (<i>current transaction is aborted, commands ignored until end of transaction block</i>). An EXCEPTION block in PL/pgSQL works by creating a savepoint at BEGIN and rolling back to it when an error is caught.</li>
<li><b>SQL Server</b>: most errors abort only the statement, unless <code>SET XACT_ABORT ON</code>, which makes any error roll back the whole transaction. Inside CATCH, <code>XACT_STATE()</code> tells you whether the transaction can still commit (1), must roll back (-1), or does not exist (0).</li>
</ul>`,
    mistakes: [
      { wrong: `BEGIN;\nINSERT INTO payments (invoice_id, payment_date, amount, method) VALUES (5, '2026-09-01', 135, 'EFT');\nUPDATE invoices SET status = 'Closed' WHERE invoice_id = 5;   -- fails the CHECK constraint\nCOMMIT;   -- the payment is still committed!`, why: 'In SQLite (and SQL Server without XACT_ABORT) the failed UPDATE is undone but the transaction stays open, so COMMIT saves the payment without the status change. On error, the app must ROLLBACK.', fix: `BEGIN;\nINSERT INTO payments (invoice_id, payment_date, amount, method) VALUES (5, '2026-09-01', 135, 'EFT');\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;\nCOMMIT;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 5;` },
      { wrong: `INSERT OR REPLACE INTO payors (payor_id, payor_name, payor_type, contract_rate)\nVALUES (5, 'United Workers Comp', 'Workers Comp', 0.92);`, why: 'REPLACE deletes the old row and inserts a new one: columns you did not list (phone, is_active) fall back to their defaults or NULL, and ON DELETE actions fire. Use UPSERT to change only some columns.', fix: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)\nVALUES (5, 'United Workers Comp', 'Workers Comp', 0.92)\nON CONFLICT (payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;\nSELECT * FROM payors WHERE payor_id = 5;` },
      { wrong: `BEGIN CATCH\n  -- swallow the error\nEND CATCH`, why: 'An empty CATCH hides failures: the caller thinks the posting worked. Roll back, log, then re-raise with THROW (or RAISE in PL/pgSQL).', fix: `SELECT 'BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT INTO error_log ...; THROW; END CATCH' AS pattern;` },
    ],
    rules: ['A failed statement is undone; the transaction is not: ROLLBACK on error.', 'Never swallow errors: rollback, log, re-raise.', 'Prefer UPSERT (ON CONFLICT DO UPDATE) over INSERT OR REPLACE when changing some columns.', 'Use INSERT OR IGNORE / DO NOTHING only when skipping bad rows is truly acceptable, and count what was skipped.', 'Retry only transient errors (deadlock, serialization failure, SQLITE_BUSY), and retry the whole transaction.'],
    compare: `<table><tr><th>Need</th><th>SQLite</th><th>PostgreSQL</th><th>SQL Server</th><th>MySQL</th></tr>
<tr><td>Catch an error</td><td>In the app</td><td>BEGIN ... EXCEPTION WHEN ... END</td><td>BEGIN TRY / BEGIN CATCH</td><td>DECLARE ... HANDLER</td></tr>
<tr><td>Raise your own</td><td>RAISE() in triggers</td><td>RAISE EXCEPTION</td><td>THROW / RAISERROR</td><td>SIGNAL SQLSTATE</td></tr>
<tr><td>Skip duplicates</td><td>INSERT OR IGNORE / ON CONFLICT DO NOTHING</td><td>ON CONFLICT DO NOTHING</td><td>IGNORE_DUP_KEY / NOT EXISTS</td><td>INSERT IGNORE</td></tr>
<tr><td>Error info</td><td>error code + message</td><td>SQLSTATE, SQLERRM, GET STACKED DIAGNOSTICS</td><td>ERROR_NUMBER(), ERROR_MESSAGE()</td><td>GET DIAGNOSTICS</td></tr>
<tr><td>Whole txn on any error</td><td>OR ROLLBACK / RAISE(ROLLBACK)</td><td>Automatic (aborted state)</td><td>SET XACT_ABORT ON</td><td>Handler with ROLLBACK</td></tr></table>`,
    realWorld: 'ERA (835) remittance loaders post thousands of payment lines. Each claim is posted in its own transaction inside TRY/CATCH: a failure rolls back just that claim, writes the claim number and error message to an exceptions table for the billing team to work, and the loader moves on. Duplicate files are harmless because payments carry a unique check/EFT trace number and the loader uses ON CONFLICT DO NOTHING.',
    tips: ['In SQL Server procedures start with SET XACT_ABORT ON and SET NOCOUNT ON.', 'Error codes worth retrying: 40001 serialization failure, 40P01 deadlock (PostgreSQL), 1205 (SQL Server), 1213 (MySQL), SQLITE_BUSY.', 'Use changes() after INSERT OR IGNORE to know how many rows were actually inserted.'],
    deep: `<p>Batch strategy matters. One transaction for a 10,000-line file is all-or-nothing: one bad line blocks everything. One transaction per line is slow and leaves half-posted claims when lines belong together. The usual middle ground is one transaction per business unit (a claim) plus a <b>savepoint</b> per optional step, so a failed optional step (e.g. updating a statistics table) can be rolled back without losing the claim.</p>
<p>In PL/pgSQL, every EXCEPTION block costs a subtransaction; wrapping each row of a large loop in one can be slow and can exhaust subtransaction caches. Validate data set-based first, then post only the good rows.</p>`,
    dialectSql: {
      sqlserver: `SET XACT_ABORT ON;\nBEGIN TRY\n  BEGIN TRANSACTION;\n    INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\n    VALUES (5, 2, '2026-09-01', 135, 'EFT');\n    UPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;\n  COMMIT;\nEND TRY\nBEGIN CATCH\n  IF @@TRANCOUNT > 0 ROLLBACK;\n  INSERT INTO error_log (err_no, err_msg, logged_at)\n  VALUES (ERROR_NUMBER(), ERROR_MESSAGE(), SYSDATETIME());\n  THROW;   -- re-raise to the caller\nEND CATCH;`,
      postgres: `DO $$\nBEGIN\n  INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\n  VALUES (5, 2, CURRENT_DATE, 135, 'EFT');\n  UPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;\nEXCEPTION\n  WHEN unique_violation THEN\n    RAISE NOTICE 'duplicate payment skipped';\n  WHEN check_violation THEN\n    RAISE EXCEPTION 'invalid status for invoice 5: %', SQLERRM;\nEND $$;`,
      mysql: `CREATE PROCEDURE post_payment()\nBEGIN\n  DECLARE EXIT HANDLER FOR SQLEXCEPTION\n  BEGIN\n    ROLLBACK;\n    RESIGNAL;\n  END;\n  START TRANSACTION;\n  INSERT INTO payments (invoice_id, payment_date, amount, method) VALUES (5, CURDATE(), 135, 'EFT');\n  UPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;\n  COMMIT;\nEND;`,
      oracle: `BEGIN\n  INSERT INTO payments (invoice_id, payment_date, amount, method) VALUES (5, SYSDATE, 135, 'EFT');\n  UPDATE invoices SET status = 'Paid' WHERE invoice_id = 5;\n  COMMIT;\nEXCEPTION\n  WHEN DUP_VAL_ON_INDEX THEN ROLLBACK;\n  WHEN OTHERS THEN ROLLBACK; RAISE;\nEND;`,
      sqlite: `-- conflict clauses + trigger RAISE(); the app catches the error and runs ROLLBACK\nINSERT OR IGNORE INTO payments (payment_id, invoice_id, payment_date, amount, method)\nVALUES (1, 1, '2025-05-09', 165, 'Cash');\nCREATE TRIGGER trg_no_overpay BEFORE INSERT ON payments\nWHEN NEW.amount > (SELECT total_amount FROM invoices WHERE invoice_id = NEW.invoice_id)\nBEGIN SELECT RAISE(ROLLBACK, 'payment exceeds invoice total'); END;`,
    },
    tryIt: { prompt: 'Run it: the duplicate is skipped and changes() shows how many rows went in. Then uncomment the last INSERT to see the trigger\'s error message, and try changing IGNORE to ABORT on the first INSERT.', starter: `CREATE TRIGGER trg_payments_positive\nBEFORE INSERT ON payments\nWHEN NEW.amount <= 0\nBEGIN\n  SELECT RAISE(ABORT, 'payment amount must be positive');\nEND;\n\nINSERT OR IGNORE INTO payments (payment_id, invoice_id, payor_id, payment_date, amount, method)\nVALUES (1, 1, NULL, '2025-05-09', 165, 'Cash'),\n       (48, 5, 2, '2026-09-01', 135, 'EFT');\nSELECT changes() AS rows_inserted;\n\n-- INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (5, 2, '2026-09-01', 0, 'EFT');\n\nSELECT payment_id, invoice_id, amount FROM payments WHERE payment_id >= 46 ORDER BY payment_id;` },
    challenge: {
      mode: 'state', level: 3,
      prompt: 'Make a lockbox import tolerant of bad rows. (1) Create a trigger trg_skip_zero_payments BEFORE INSERT ON payments that silently skips any payment with amount <= 0 (use RAISE(IGNORE)). (2) Load this batch with INSERT OR IGNORE so the duplicate key is skipped too: (1, 3, 2, \'2026-09-01\', 60, \'EFT\'), (100, 3, 2, \'2026-09-01\', 60, \'EFT\'), (101, 5, 2, \'2026-09-01\', 0, \'EFT\'), (102, 5, NULL, \'2026-09-01\', 35, \'Cash\') into (payment_id, invoice_id, payor_id, payment_date, amount, method).',
      solution: `CREATE TRIGGER trg_skip_zero_payments
BEFORE INSERT ON payments
WHEN NEW.amount <= 0
BEGIN
  SELECT RAISE(IGNORE);
END;

INSERT OR IGNORE INTO payments (payment_id, invoice_id, payor_id, payment_date, amount, method)
VALUES (1,   3, 2,    '2026-09-01', 60, 'EFT'),
       (100, 3, 2,    '2026-09-01', 60, 'EFT'),
       (101, 5, 2,    '2026-09-01', 0,  'EFT'),
       (102, 5, NULL, '2026-09-01', 35, 'Cash');`,
      check: `SELECT payment_id, invoice_id, payor_id, payment_date, amount, method,
       (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'payments') AS payment_triggers
FROM payments
WHERE payment_id = 1 OR payment_id >= 100
ORDER BY payment_id`,
      hints: ['Two statements: a CREATE TRIGGER, then one multi-row INSERT.', 'Trigger: BEFORE INSERT ON payments WHEN NEW.amount <= 0 BEGIN SELECT RAISE(IGNORE); END;', 'INSERT OR IGNORE INTO payments (payment_id, invoice_id, payor_id, payment_date, amount, method) VALUES (...), (...), ...;', 'Expected result: payment 1 is unchanged (the original), 100 and 102 are inserted, 101 is skipped by the trigger.'],
    },
    quiz: [
      { q: 'In SQLite, BEGIN; INSERT (ok); UPDATE (fails a CHECK); COMMIT; What is saved?', options: ['Nothing', 'The INSERT, because the transaction stayed open and was committed', 'Both statements', 'The UPDATE only'], answer: 1, why: 'Only the failing statement is undone; the app must ROLLBACK on error.' },
      { q: 'Which clause updates the existing row instead of failing on a duplicate key, without deleting it?', options: ['INSERT OR REPLACE', 'INSERT OR IGNORE', 'INSERT ... ON CONFLICT (key) DO UPDATE', 'INSERT OR FAIL'], answer: 2, why: 'UPSERT updates in place; REPLACE deletes and reinserts the row.' },
      { q: 'What should a CATCH / EXCEPTION block usually do?', options: ['Nothing', 'Roll back, log the error, and re-raise it (or retry transient errors)', 'COMMIT anyway', 'Drop the table'], answer: 1, why: 'Silent failures leave callers believing the work succeeded.' },
    ],
  },
]);
