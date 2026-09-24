// Schema Design & Advanced DDL (ddl-01..21). DDL runs in the SQLite sandbox; vendor-only features set `dialect`.
Lessons.add([
  {
    id: 'ddl-01',
    goals: ['What a database (catalog) is compared with a schema and a table', 'CREATE DATABASE in server databases, with character set and collation', 'How SQLite differs: one file = one database, ATTACH for more', 'Naming and environment conventions (billing_dev, billing_prod)'],
    concept: `<p>A <b>database</b> is the top-level container for your tables, views, and other objects. In server products you create it explicitly:</p>
<pre>CREATE DATABASE billing;</pre>
<ul>
<li>In <b>MySQL</b>, "database" and "schema" are the same thing. You pick a default character set (<code>utf8mb4</code>) and collation.</li>
<li>In <b>PostgreSQL</b> and <b>SQL Server</b>, a database contains <b>schemas</b> (like folders: <code>billing.invoices</code>, <code>audit.log</code>), which contain tables.</li>
<li>In <b>Oracle</b>, a database is created by the DBA once; users normally create <b>schemas</b> (users) or pluggable databases inside it.</li>
<li>In <b>SQLite</b>, a database is simply <b>a file</b>. There is no CREATE DATABASE: opening a new file creates it. <code>ATTACH DATABASE 'archive.db' AS archive</code> lets one connection use several files at once.</li>
</ul>`,
    why: 'Everything else you build lives inside a database; its character set, collation, and ownership settings affect every table in it.',
    when: 'Setting up a new application or environment (dev, test, prod), or separating unrelated systems (billing vs scheduling).',
    analogy: 'A database is the building of the billing department. Schemas are the rooms (claims, payments, audit). Tables are the filing cabinets inside each room.',
    syntax: `CREATE DATABASE name\n  [CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci];   -- MySQL\nCREATE SCHEMA name;\nATTACH DATABASE 'file.db' AS alias;                      -- SQLite`,
    dialect: 'mysql',
    sql: `CREATE DATABASE IF NOT EXISTS billing
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE billing;

CREATE TABLE payors (
  payor_id   INT PRIMARY KEY,
  payor_name VARCHAR(100) NOT NULL
);`,
    breakdown: [
      ['CREATE DATABASE IF NOT EXISTS billing', 'Creates the container; IF NOT EXISTS avoids an error on re-runs'],
      ['CHARACTER SET utf8mb4', 'Full Unicode (including accents and emoji) for patient names'],
      ['COLLATE utf8mb4_0900_ai_ci', 'Sorting/comparison rules: accent- and case-insensitive'],
      ['USE billing', 'Makes billing the default database for the session'],
    ],
    dialectSql: {
      mysql: `CREATE DATABASE billing CHARACTER SET utf8mb4;\nUSE billing;`,
      postgres: `CREATE DATABASE billing ENCODING 'UTF8' TEMPLATE template0;\n\\c billing\nCREATE SCHEMA claims;`,
      sqlserver: `CREATE DATABASE billing;\nGO\nUSE billing;\nGO\nCREATE SCHEMA claims;`,
      oracle: `-- DBA creates the database once; apps get a schema (user)\nCREATE USER billing IDENTIFIED BY "secret" QUOTA UNLIMITED ON users;`,
      sqlite: `-- opening a new file creates the database\n-- sqlite3 billing.db\nATTACH DATABASE 'archive.db' AS archive;\nCREATE TABLE archive.old_invoices (invoice_id INTEGER PRIMARY KEY);`,
    },
    mistakes: [
      { wrong: `CREATE DATABASE billing;  -- MySQL 5.x default latin1`, why: 'Older defaults (latin1, or the 3-byte "utf8") cannot store every character; names like "Nguyễn" get corrupted. Always specify utf8mb4.', fix: `SELECT first_name, last_name FROM patients LIMIT 3;` },
      { wrong: `CREATE DATABASE billing;  -- in SQLite`, why: 'SQLite has no CREATE DATABASE. The database is the file you open; use ATTACH to add another file to the connection.', fix: `ATTACH DATABASE ':memory:' AS archive;\nSELECT name FROM pragma_database_list;` },
    ],
    rules: ['MySQL: database = schema.', 'PostgreSQL / SQL Server: database > schema > table.', 'SQLite: one file = one database; ATTACH for more.', 'Choose UTF-8 (utf8mb4) from day one.'],
    compare: `<table><tr><th></th><th>Top container</th><th>Namespace inside</th></tr>
<tr><td>MySQL</td><td>Server</td><td>Database (= schema)</td></tr>
<tr><td>PostgreSQL</td><td>Database</td><td>Schema</td></tr>
<tr><td>SQL Server</td><td>Database</td><td>Schema</td></tr>
<tr><td>Oracle</td><td>Database / PDB</td><td>Schema (user)</td></tr>
<tr><td>SQLite</td><td>File</td><td>main, temp, attached aliases</td></tr></table>`,
    realWorld: 'Billing vendors create one database per environment (billing_dev, billing_test, billing_prod) and sometimes one per client clinic for isolation; SQLite-based apps keep an attached archive.db for closed years.',
    tips: ['Script database creation in migrations so every environment is identical.', 'In PostgreSQL you cannot switch databases inside one connection; schemas are cheaper to cross.'],
    deep: `<p>Collation choice affects uniqueness: under a case-insensitive collation, 'garcia@mail.com' and 'Garcia@mail.com' collide on a UNIQUE email index. Changing collation later requires rebuilding indexes, so decide early.</p>`,
    tryIt: { prompt: 'SQLite\'s version of "another database": attach an in-memory database, create a table in it, and list the databases on this connection.', starter: `ATTACH DATABASE ':memory:' AS archive;\n\nCREATE TABLE archive.old_invoices AS\nSELECT * FROM invoices WHERE invoice_date < '2025-07-01';\n\nSELECT seq, name FROM pragma_database_list;\nSELECT COUNT(*) AS archived FROM archive.old_invoices;` },
    challenge: {
      level: 1,
      prompt: 'Inventory the main database: list the name of every table in sqlite_master, alphabetically.',
      solution: `SELECT name
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;`,
      hints: ['The catalog of a SQLite database is sqlite_master.', 'Each row has a type (table, index, view, trigger).', 'Filter type = \'table\'.', 'SELECT name FROM sqlite_master WHERE type = \'table\' ORDER BY name;'],
      ordered: true,
    },
    quiz: [
      { q: 'In MySQL, what is the difference between a database and a schema?', options: ['A database contains schemas', 'They are synonyms', 'A schema contains databases', 'Schemas do not exist'], answer: 1, why: 'CREATE SCHEMA is a synonym for CREATE DATABASE in MySQL.' },
      { q: 'How do you create a new SQLite database?', options: ['CREATE DATABASE', 'Open (create) a new file', 'CREATE SCHEMA', 'PRAGMA new_database'], answer: 1, why: 'A SQLite database is a file; opening a new path creates it.' },
    ],
  },
  {
    id: 'ddl-02',
    goals: ['Write CREATE TABLE with columns, types and constraints', 'Choose data types for billing data', 'Add defaults, NOT NULL, primary and foreign keys at creation', 'Create a table from a query (CREATE TABLE AS)'],
    concept: `<p><code>CREATE TABLE</code> defines a new table: its name, its columns, each column's <b>type</b>, and the <b>rules</b> (constraints) data must follow.</p>
<ul>
<li>Every column: a name + a type (<code>INTEGER</code>, <code>TEXT</code>, <code>REAL</code>, <code>DATE</code>, <code>DECIMAL(10,2)</code>...).</li>
<li><code>PRIMARY KEY</code>: the unique identity of each row.</li>
<li><code>NOT NULL</code>: the value is required. <code>DEFAULT</code>: the value used when none is given.</li>
<li><code>REFERENCES other(col)</code>: a foreign key to another table.</li>
<li><code>CHECK (...)</code> and <code>UNIQUE</code>: business rules.</li>
</ul>
<p>Designing the table well at the start is far cheaper than fixing bad data later. <code>CREATE TABLE new AS SELECT ...</code> copies the result of a query into a new table (columns and data, but not constraints).</p>`,
    why: 'The table definition is the contract for all data that will ever be stored: good definitions prevent bad data automatically.',
    when: 'Adding a new entity (claim notes, prior authorizations, fee schedules) to the system.',
    analogy: 'CREATE TABLE is designing a new paper form: which boxes it has, which are mandatory, what goes in each (date, dollar amount, text), and which reference number links it to the patient\'s chart.',
    syntax: `CREATE TABLE [IF NOT EXISTS] name (\n  col type [PRIMARY KEY] [NOT NULL] [DEFAULT v] [REFERENCES t(c)],\n  ...,\n  [CONSTRAINT name CHECK (...)]\n);`,
    sql: `CREATE TABLE prior_authorizations (
  auth_id       INTEGER PRIMARY KEY,
  patient_id    INTEGER NOT NULL REFERENCES patients(patient_id),
  payor_id      INTEGER NOT NULL REFERENCES payors(payor_id),
  cpt_code      TEXT    NOT NULL,
  auth_number   TEXT    UNIQUE,
  units_allowed INTEGER NOT NULL DEFAULT 1 CHECK (units_allowed > 0),
  valid_from    TEXT    NOT NULL,
  valid_to      TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'Pending'
                CHECK (status IN ('Pending','Approved','Denied')),
  CHECK (valid_to >= valid_from)
);

INSERT INTO prior_authorizations (patient_id, payor_id, cpt_code, auth_number, units_allowed, valid_from, valid_to)
VALUES (5, 2, '97110', 'PA-2026-0001', 12, '2026-09-01', '2026-12-31');

SELECT * FROM prior_authorizations;`,
    breakdown: [
      ['auth_id INTEGER PRIMARY KEY', 'Row identity; in SQLite an alias for rowid, auto-assigned'],
      ['REFERENCES patients(patient_id)', 'Foreign key: the patient must exist'],
      ['auth_number TEXT UNIQUE', 'No two authorizations share a number (NULLs allowed)'],
      ['DEFAULT 1 CHECK (units_allowed > 0)', 'Default plus a column rule'],
      ['DEFAULT \'Pending\' CHECK (status IN (...))', 'Enumerated status list'],
      ['CHECK (valid_to >= valid_from)', 'Table-level rule comparing two columns'],
    ],
    visual: { type: 'er', tables: ['patients', 'payors', 'invoices', 'charges'] },
    mistakes: [
      { wrong: `CREATE TABLE auths (id, patient, payor, dates);`, why: 'No types, no keys, no constraints: SQLite accepts it, but anything can be stored, and multiple values get crammed into one "dates" column.', fix: `CREATE TABLE auths (auth_id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(patient_id), valid_from TEXT NOT NULL, valid_to TEXT NOT NULL);\nSELECT name, type FROM pragma_table_info('auths');` },
      { wrong: `CREATE TABLE invoice_copy AS SELECT * FROM invoices;\n-- assume the primary key and FKs were copied`, why: 'CREATE TABLE AS copies column names and data only. Primary keys, NOT NULL, CHECK and foreign keys are not copied.', fix: `CREATE TABLE invoice_copy AS SELECT * FROM invoices;\nSELECT name, pk, "notnull" FROM pragma_table_info('invoice_copy');` },
    ],
    rules: ['Every table needs a primary key.', 'Declare NOT NULL for everything that is truly required.', 'Put business rules in CHECK constraints, not only in the app.', 'CREATE TABLE AS copies data, not constraints.'],
    compare: `<table><tr><th>Type need</th><th>SQLite</th><th>PostgreSQL</th><th>SQL Server</th></tr>
<tr><td>Id</td><td>INTEGER PRIMARY KEY</td><td>INT GENERATED ALWAYS AS IDENTITY</td><td>INT IDENTITY(1,1)</td></tr>
<tr><td>Money</td><td>REAL / INTEGER cents</td><td>NUMERIC(12,2)</td><td>DECIMAL(12,2)</td></tr>
<tr><td>Date</td><td>TEXT (ISO)</td><td>DATE</td><td>DATE</td></tr>
<tr><td>Flag</td><td>INTEGER 0/1</td><td>BOOLEAN</td><td>BIT</td></tr></table>`,
    realWorld: 'Adding prior-authorization tracking to a billing system starts with exactly this: a table tied to patients and payors, with status rules and valid date ranges checked by the database.',
    tips: ['Name constraints (CONSTRAINT chk_units CHECK ...) so error messages are readable.', 'Use IF NOT EXISTS in idempotent setup scripts.'],
    deep: `<p>In SQLite, <code>INTEGER PRIMARY KEY</code> (exact spelling) makes the column an alias for the internal rowid, so the table is stored in id order and lookups by id are one B-tree search. <code>INT PRIMARY KEY</code> does not get this treatment.</p>`,
    tryIt: { prompt: 'Create a claim_notes table linked to invoices, insert a note, and read it back. Then try inserting a note for invoice 999 (it should fail because of the foreign key).', starter: `CREATE TABLE claim_notes (\n  note_id    INTEGER PRIMARY KEY,\n  invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id),\n  note       TEXT    NOT NULL,\n  created_on TEXT    NOT NULL DEFAULT (date('now')),\n  created_by TEXT    NOT NULL DEFAULT 'billing'\n);\n\nINSERT INTO claim_notes (invoice_id, note) VALUES (3, 'Called Aetna, claim in review');\nSELECT * FROM claim_notes;` },
    challenge: {
      level: 2,
      prompt: 'Study an existing CREATE TABLE: list the columns of the charges table with their position (cid), name, declared type, whether they are NOT NULL, and their default value, in column order.',
      solution: `SELECT cid, name, type, "notnull", dflt_value
FROM pragma_table_info('charges')
ORDER BY cid;`,
      hints: ['SQLite describes a table with pragma_table_info(\'table\').', 'It returns cid, name, type, notnull, dflt_value, pk.', 'notnull is a keyword: quote it as "notnull".', 'SELECT cid, name, type, "notnull", dflt_value FROM pragma_table_info(\'charges\') ORDER BY cid;'],
      ordered: true,
    },
    quiz: [
      { q: 'What does DEFAULT \'Pending\' do?', options: ['Forces every value to Pending', 'Uses Pending when no value is supplied', 'Rejects NULL', 'Creates an index'], answer: 1, why: 'Defaults fill in omitted columns.' },
      { q: 'Which is copied by CREATE TABLE ... AS SELECT?', options: ['Primary key', 'Foreign keys', 'Column names and data', 'CHECK constraints'], answer: 2, why: 'Only the shape and rows of the result are copied.' },
    ],
  },
  {
    id: 'ddl-03',
    goals: ['Add, rename and drop columns with ALTER TABLE', 'Rename a table', 'What SQLite ALTER TABLE cannot do and the rebuild pattern', 'Safe schema changes on live systems'],
    concept: `<p>Requirements change: payors get a portal URL, a column name is confusing, a field is no longer used. <code>ALTER TABLE</code> changes an existing table without recreating it.</p>
<ul>
<li><code>ALTER TABLE payors ADD COLUMN portal_url TEXT;</code> adds a column (existing rows get NULL or the DEFAULT).</li>
<li><code>ALTER TABLE payors RENAME COLUMN phone TO claims_phone;</code></li>
<li><code>ALTER TABLE payors RENAME TO insurance_payors;</code></li>
<li><code>ALTER TABLE payors DROP COLUMN portal_url;</code> (SQLite 3.35+)</li>
</ul>
<p>Server databases can also change types (<code>ALTER COLUMN ... TYPE</code>) and add or drop constraints. SQLite cannot; there you <b>rebuild</b>: create a new table with the new definition, copy the rows, drop the old table, rename the new one, all in one transaction.</p>`,
    why: 'Schemas evolve with the business; ALTER TABLE lets you evolve without losing data.',
    when: 'Adding new attributes, fixing names, removing obsolete columns, tightening constraints.',
    analogy: 'ALTER TABLE is revising a form that is already in use: adding a new box is easy (old forms just have it blank), renaming a box is easy, but changing what a box means for thousands of filled-in forms needs care.',
    syntax: `ALTER TABLE t ADD COLUMN col type [DEFAULT v];\nALTER TABLE t RENAME COLUMN old TO new;\nALTER TABLE t RENAME TO new_name;\nALTER TABLE t DROP COLUMN col;`,
    sql: `ALTER TABLE payors ADD COLUMN portal_url TEXT;
ALTER TABLE payors ADD COLUMN timely_filing_days INTEGER NOT NULL DEFAULT 90;
ALTER TABLE payors RENAME COLUMN phone TO claims_phone;

UPDATE payors SET timely_filing_days = 365 WHERE payor_type = 'Medicare';

SELECT payor_id, payor_name, claims_phone, portal_url, timely_filing_days
FROM payors;`,
    breakdown: [
      ['ADD COLUMN portal_url TEXT', 'New nullable column; existing rows get NULL'],
      ['ADD COLUMN ... NOT NULL DEFAULT 90', 'A NOT NULL column needs a default so existing rows are valid'],
      ['RENAME COLUMN phone TO claims_phone', 'Renames; SQLite also updates views/triggers that reference it'],
      ['UPDATE ... SET timely_filing_days = 365', 'Backfill real values after adding the column'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 170" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="150" y="18" text-anchor="middle" fill="var(--text)" font-weight="bold">Before: payors</text>
<rect x="10" y="28" width="280" height="26" fill="var(--panel2)" stroke="var(--border)"/>
<text x="20" y="46" fill="var(--text)">payor_id | payor_name | payor_type | phone | ...</text>
<rect x="10" y="54" width="280" height="22" fill="none" stroke="var(--border)"/><text x="20" y="70" fill="var(--muted)">3 | Medicare Part B | Medicare | 800-555-0103</text>
<text x="320" y="75" text-anchor="middle" fill="var(--accent)" font-size="22">&#8594;</text>
<text x="485" y="18" text-anchor="middle" fill="var(--text)" font-weight="bold">After ALTER TABLE</text>
<rect x="340" y="28" width="290" height="26" fill="var(--panel2)" stroke="var(--border)"/>
<text x="348" y="46" fill="var(--text)">... | <tspan fill="var(--yellow)">claims_phone</tspan> | <tspan fill="var(--green)">portal_url</tspan> | <tspan fill="var(--green)">timely_filing_days</tspan></text>
<rect x="340" y="54" width="290" height="22" fill="none" stroke="var(--border)"/><text x="348" y="70" fill="var(--muted)">... | 800-555-0103 | NULL | 365</text>
<rect x="10" y="100" width="12" height="12" fill="var(--green)"/><text x="28" y="111" fill="var(--text)">added column (NULL or DEFAULT for existing rows)</text>
<rect x="10" y="122" width="12" height="12" fill="var(--yellow)"/><text x="28" y="133" fill="var(--text)">renamed column (data unchanged)</text>
<text x="10" y="158" fill="var(--muted)">Type changes / new constraints in SQLite: create new table, copy, drop old, rename.</text>
</svg>` },
    mistakes: [
      { wrong: `ALTER TABLE payors ADD COLUMN timely_filing_days INTEGER NOT NULL;`, why: 'Existing rows would have NULL in a NOT NULL column. SQLite refuses; give the new column a DEFAULT.', fix: `ALTER TABLE payors ADD COLUMN timely_filing_days INTEGER NOT NULL DEFAULT 90;\nSELECT payor_id, timely_filing_days FROM payors;` },
      { wrong: `ALTER TABLE invoices ALTER COLUMN total_amount TYPE NUMERIC;  -- SQLite`, why: 'SQLite does not support changing column types. Use the rebuild pattern inside a transaction.', fix: `CREATE TABLE payors_new (payor_id INTEGER PRIMARY KEY, payor_name TEXT NOT NULL UNIQUE, contract_rate REAL NOT NULL CHECK (contract_rate BETWEEN 0 AND 1));\nINSERT INTO payors_new SELECT payor_id, payor_name, contract_rate FROM payors;\nSELECT * FROM payors_new;` },
    ],
    rules: ['New NOT NULL columns need a DEFAULT.', 'Add, then backfill, then tighten constraints.', 'SQLite: ADD / RENAME / DROP COLUMN and RENAME TO; everything else = rebuild.', 'Renaming breaks application code that uses the old name; coordinate deploys.'],
    compare: `<table><tr><th>Change</th><th>SQLite</th><th>PostgreSQL</th><th>MySQL</th><th>SQL Server</th></tr>
<tr><td>Add column</td><td>Yes</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Rename column</td><td>Yes</td><td>Yes</td><td>Yes</td><td>sp_rename</td></tr>
<tr><td>Drop column</td><td>3.35+</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Change type</td><td>Rebuild</td><td>ALTER COLUMN TYPE</td><td>MODIFY COLUMN</td><td>ALTER COLUMN</td></tr>
<tr><td>Add CHECK/FK later</td><td>Rebuild</td><td>ADD CONSTRAINT</td><td>ADD CONSTRAINT</td><td>ADD CONSTRAINT</td></tr></table>`,
    realWorld: 'When payors started enforcing different timely-filing limits, billing systems added a timely_filing_days column with a default of 90, then backfilled Medicare with 365.',
    tips: ['Use migration tools (Flyway, Liquibase, Alembic) so every environment gets the same ALTERs in order.', 'On huge tables, some ALTERs rewrite the whole table and lock it; check your database\'s online-DDL rules.'],
    deep: `<p>PostgreSQL 11+ adds a column with a constant DEFAULT instantly (it stores the default in the catalog instead of rewriting rows). MySQL 8 has INSTANT ADD COLUMN. Changing a type, however, usually rewrites every row.</p>`,
    tryIt: { prompt: 'Add an is_in_network column (INTEGER NOT NULL DEFAULT 1) to payors, set it to 0 for payor 6, then drop portal_url after adding it.', starter: `ALTER TABLE payors ADD COLUMN portal_url TEXT;\nALTER TABLE payors ADD COLUMN is_in_network INTEGER NOT NULL DEFAULT 1;\nUPDATE payors SET is_in_network = 0 WHERE payor_id = 6;\nALTER TABLE payors DROP COLUMN portal_url;\n\nSELECT * FROM payors;` },
    challenge: {
      level: 2,
      prompt: 'Before renaming payors.payor_id you must know its impact. List every table that has a column named payor_id or primary_payor_id: table name and column name, sorted by table then column.',
      solution: `SELECT m.name AS table_name, p.name AS column_name
FROM sqlite_master m
JOIN pragma_table_info(m.name) p
WHERE m.type = 'table'
  AND p.name IN ('payor_id', 'primary_payor_id')
ORDER BY m.name, p.name;`,
      hints: ['Tables are listed in sqlite_master.', 'Join each table to pragma_table_info(m.name) to see its columns.', 'Filter p.name IN (\'payor_id\', \'primary_payor_id\').', 'ORDER BY m.name, p.name'],
      ordered: true,
    },
    quiz: [
      { q: 'What do existing rows get when you ADD COLUMN x INTEGER DEFAULT 90?', options: ['NULL', '90', '0', 'An error'], answer: 1, why: 'The default is applied to existing rows.' },
      { q: 'How do you change a column type in SQLite?', options: ['ALTER COLUMN TYPE', 'MODIFY COLUMN', 'Rebuild the table (create, copy, drop, rename)', 'It is impossible'], answer: 2, why: 'SQLite ALTER TABLE does not support type changes.' },
    ],
  },
  {
    id: 'ddl-04',
    goals: ['Remove tables with DROP TABLE and DROP TABLE IF EXISTS', 'How foreign keys block drops of parent tables', 'DROP vs DELETE vs TRUNCATE', 'Checking dependencies before dropping'],
    concept: `<p><code>DROP TABLE</code> removes a table completely: its definition, its data, its indexes and triggers. There is no undo outside a transaction or a backup.</p>
<ul>
<li><code>DROP TABLE IF EXISTS temp_import;</code> avoids an error if it is already gone.</li>
<li><code>DELETE FROM t</code> removes rows but keeps the table. <code>TRUNCATE</code> (not in SQLite) empties it quickly.</li>
<li>If other tables reference this one with foreign keys, the database protects you: PostgreSQL refuses (unless <code>CASCADE</code>), and SQLite (with foreign keys on) refuses if dropping would orphan child rows.</li>
<li>Views that use the table break (in SQLite they remain but fail when queried).</li>
</ul>`,
    why: 'Dropping cleans up obsolete or temporary tables, but it is the most destructive DDL; knowing what depends on a table prevents outages.',
    when: 'Removing staging/import tables, retiring features, rebuilding a table (drop old after copying).',
    analogy: 'DELETE is emptying a filing cabinet. DROP is hauling the cabinet itself to the shredder. You cannot shred the patient cabinet while claim folders elsewhere still point to patients in it.',
    syntax: `DROP TABLE [IF EXISTS] name;\nDROP TABLE name CASCADE;   -- PostgreSQL: also drop dependent views/FKs`,
    sql: `CREATE TABLE import_staging AS
SELECT * FROM payments WHERE payment_date >= '2026-08-01';

SELECT COUNT(*) AS staged FROM import_staging;

DROP TABLE IF EXISTS import_staging;

SELECT name FROM sqlite_master WHERE name = 'import_staging';`,
    breakdown: [
      ['CREATE TABLE import_staging AS ...', 'A temporary work table (nothing references it)'],
      ['DROP TABLE IF EXISTS import_staging', 'Removes it; no error if it does not exist'],
      ['SELECT name FROM sqlite_master ...', 'Confirms the table is gone (no rows)'],
    ],
    mistakes: [
      { wrong: `DROP TABLE invoices;`, why: 'charges, payments and transactions reference invoices. With foreign keys on, SQLite refuses (FOREIGN KEY constraint failed); in other databases it errors unless you CASCADE, which silently drops the constraints.', fix: `SELECT m.name AS child_table FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) f WHERE f."table" = 'invoices';` },
      { wrong: `DROP TABLE import_staging;  -- in a re-runnable script`, why: 'The second run fails because the table no longer exists. Use IF EXISTS.', fix: `DROP TABLE IF EXISTS import_staging;\nSELECT COUNT(*) FROM sqlite_master WHERE name = 'import_staging';` },
    ],
    rules: ['Check dependencies (FKs, views, triggers) before DROP.', 'Use IF EXISTS in scripts.', 'Back up or rename before dropping important tables.', 'DELETE removes rows; DROP removes the table.'],
    compare: `<table><tr><th></th><th>DELETE</th><th>TRUNCATE</th><th>DROP</th></tr>
<tr><td>Removes rows</td><td>Yes (filterable)</td><td>All</td><td>All</td></tr>
<tr><td>Keeps structure</td><td>Yes</td><td>Yes</td><td>No</td></tr>
<tr><td>Fires triggers</td><td>Yes</td><td>No</td><td>No</td></tr>
<tr><td>SQLite</td><td>Yes</td><td>No (use DELETE)</td><td>Yes</td></tr></table>`,
    realWorld: 'Nightly ETL creates staging tables for 835 remittance files and drops them when loaded. A safe retirement process renames a table (invoices_old), waits a release cycle, then drops it.',
    tips: ['In SQLite and PostgreSQL, DDL is transactional: BEGIN; DROP TABLE x; ROLLBACK; brings it back.', 'MySQL and Oracle auto-commit DDL, so DROP cannot be rolled back there.'],
    deep: `<p>With foreign keys enabled, SQLite performs an implicit <code>DELETE FROM</code> before dropping; if that delete would violate a constraint, the DROP fails. Dropping child tables first (transactions, payments, charges) then the parent works.</p>`,
    tryIt: { prompt: 'DDL is transactional in SQLite: drop a table inside a transaction, see it gone, then roll back and see it return.', starter: `BEGIN;\nDROP TABLE transactions;\nSELECT COUNT(*) AS tables_left FROM sqlite_master WHERE type = 'table';\nROLLBACK;\n\nSELECT COUNT(*) AS tables_after_rollback FROM sqlite_master WHERE type = 'table';` },
    challenge: {
      level: 2,
      prompt: 'Dependency check before dropping invoices: list every table that has a foreign key pointing to invoices, with the child table name, the child column and the referenced column. Sort by child table.',
      solution: `SELECT m.name AS child_table, f."from" AS child_column, f."to" AS parent_column
FROM sqlite_master m
JOIN pragma_foreign_key_list(m.name) f
WHERE m.type = 'table'
  AND f."table" = 'invoices'
ORDER BY m.name;`,
      hints: ['pragma_foreign_key_list(\'table\') lists a table\'s foreign keys.', 'Join it to sqlite_master for every table.', 'The referenced table is in the column "table"; from/to are the column names (quote them).', 'WHERE f."table" = \'invoices\' ORDER BY m.name'],
      ordered: true,
    },
    quiz: [
      { q: 'What does DROP TABLE IF EXISTS do when the table is missing?', options: ['Error', 'Nothing, no error', 'Creates it', 'Drops all tables'], answer: 1, why: 'IF EXISTS makes the statement a no-op.' },
      { q: 'Which removes the table definition itself?', options: ['DELETE', 'TRUNCATE', 'DROP', 'UPDATE'], answer: 2, why: 'DROP removes the structure and data.' },
    ],
  },
  {
    id: 'ddl-05',
    goals: ['The six constraint types: NOT NULL, DEFAULT, CHECK, UNIQUE, PRIMARY KEY, FOREIGN KEY', 'Column-level vs table-level constraints', 'Naming constraints', 'Why constraints beat application-only validation'],
    concept: `<p>A <b>constraint</b> is a rule the database enforces on every insert and update, no matter which program sends the data.</p>
<ul>
<li><b>NOT NULL</b>: value required.</li>
<li><b>DEFAULT</b>: value used when omitted (not a rule, but declared the same way).</li>
<li><b>CHECK</b>: a condition that must be true (<code>amount &gt;= 0</code>).</li>
<li><b>UNIQUE</b>: no duplicates among non-NULL values.</li>
<li><b>PRIMARY KEY</b>: unique + not null identity.</li>
<li><b>FOREIGN KEY</b>: the value must exist in another table.</li>
</ul>
<p>Column-level constraints sit next to one column; table-level constraints (after the columns) can involve several columns, like <code>UNIQUE (payor_id, cpt_code)</code>. Giving them names (<code>CONSTRAINT chk_amount_positive CHECK ...</code>) makes errors readable.</p>`,
    why: 'Applications have bugs, scripts bypass them, and imports skip them. Constraints are the last line of defence for data quality.',
    when: 'Always: every table should declare the rules its data must obey.',
    analogy: 'Constraints are the claim scrubber built into the filing cabinet: a claim missing a patient, with a negative amount, or pointing to a payor that does not exist is rejected at the door.',
    syntax: `col type NOT NULL DEFAULT v CHECK (cond) UNIQUE REFERENCES t(c)\nCONSTRAINT name PRIMARY KEY (a, b)\nCONSTRAINT name UNIQUE (a, b)\nCONSTRAINT name CHECK (cond)\nCONSTRAINT name FOREIGN KEY (a) REFERENCES t(c)`,
    sql: `CREATE TABLE fee_schedule (
  payor_id    INTEGER NOT NULL,
  cpt_code    TEXT    NOT NULL,
  allowed_amt REAL    NOT NULL,
  effective   TEXT    NOT NULL DEFAULT '2026-01-01',
  CONSTRAINT pk_fee_schedule PRIMARY KEY (payor_id, cpt_code, effective),
  CONSTRAINT fk_fee_payor    FOREIGN KEY (payor_id) REFERENCES payors(payor_id),
  CONSTRAINT chk_allowed_pos CHECK (allowed_amt > 0),
  CONSTRAINT chk_cpt_format  CHECK (length(cpt_code) = 5)
);

INSERT INTO fee_schedule (payor_id, cpt_code, allowed_amt) VALUES
  (1, '99213', 92.00), (1, '99214', 131.50), (3, '99213', 78.25);

SELECT * FROM fee_schedule;`,
    breakdown: [
      ['NOT NULL', 'Every row must provide the value'],
      ['DEFAULT \'2026-01-01\'', 'Filled in automatically when omitted'],
      ['PRIMARY KEY (payor_id, cpt_code, effective)', 'Composite key: one price per payor, code and effective date'],
      ['FOREIGN KEY (payor_id) REFERENCES payors', 'Payor must exist'],
      ['CHECK (allowed_amt > 0)', 'No zero or negative prices'],
      ['CHECK (length(cpt_code) = 5)', 'CPT codes are 5 characters'],
    ],
    visual: { type: 'dml', statement: `INSERT INTO invoices (invoice_id, patient_id, payor_id, location_id, invoice_date, due_date, status, total_amount) VALUES (49, 2, 1, 1, '2026-09-01', '2026-10-01', 'Open', 120)`, view: `SELECT invoice_id, patient_id, payor_id, status, total_amount FROM invoices WHERE invoice_id >= 44 ORDER BY invoice_id`, key: 'invoice_id' },
    mistakes: [
      { wrong: `INSERT INTO invoices (invoice_id, patient_id, location_id, invoice_date, due_date, status, total_amount)\nVALUES (50, 2, 1, '2026-09-01', '2026-10-01', 'Pending', 100);`, why: 'Pending is not in the status CHECK list, so the row is rejected (CHECK constraint failed). This is the constraint doing its job.', fix: `INSERT INTO invoices (invoice_id, patient_id, location_id, invoice_date, due_date, status, total_amount)\nVALUES (50, 2, 1, '2026-09-01', '2026-10-01', 'Open', 100);\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 50;` },
      { wrong: `-- Validate amounts only in the web form`, why: 'Imports, admin scripts and other apps bypass the form. Put the rule in a CHECK as well.', fix: `SELECT sql FROM sqlite_master WHERE name = 'invoices';` },
    ],
    rules: ['Declare rules in the database, not only in code.', 'Name your constraints.', 'Multi-column rules are table-level constraints.', 'A constraint that fails rejects the whole statement.'],
    compare: `<table><tr><th>Constraint</th><th>Allows NULL?</th><th>Per table</th></tr>
<tr><td>PRIMARY KEY</td><td>No</td><td>One</td></tr>
<tr><td>UNIQUE</td><td>Yes (NULLs not compared)</td><td>Many</td></tr>
<tr><td>FOREIGN KEY</td><td>Yes (NULL = no parent)</td><td>Many</td></tr>
<tr><td>CHECK</td><td>NULL passes (UNKNOWN is not FALSE)</td><td>Many</td></tr>
<tr><td>NOT NULL</td><td>No</td><td>Per column</td></tr></table>`,
    realWorld: 'Payor fee schedules use a composite key (payor, CPT, effective date) and CHECKs on amount, so a bad spreadsheet import fails loudly instead of creating $0 allowed amounts.',
    tips: ['A CHECK passes when the condition is NULL; add NOT NULL too if the value is required.', 'SQLite needs PRAGMA foreign_keys = ON for FK enforcement (this app has it on).'],
    deep: `<p>Constraints also help the optimizer: a NOT NULL column lets it simplify <code>IS NULL</code> tests, UNIQUE constraints tell it a join produces at most one match, and trusted foreign keys allow some databases (SQL Server, Oracle) to eliminate unnecessary joins.</p>`,
    tryIt: { prompt: 'Try the fee_schedule rules: insert a valid row, then uncomment each bad insert one at a time to see which constraint rejects it.', starter: `CREATE TABLE fee_schedule (\n  payor_id    INTEGER NOT NULL REFERENCES payors(payor_id),\n  cpt_code    TEXT    NOT NULL CHECK (length(cpt_code) = 5),\n  allowed_amt REAL    NOT NULL CHECK (allowed_amt > 0),\n  PRIMARY KEY (payor_id, cpt_code)\n);\nINSERT INTO fee_schedule VALUES (1, '99213', 92.00);\n-- INSERT INTO fee_schedule VALUES (1, '99213', 95.00);  -- duplicate key\n-- INSERT INTO fee_schedule VALUES (99, '99213', 95.00); -- no such payor\n-- INSERT INTO fee_schedule VALUES (1, '9921', 95.00);   -- bad CPT length\nSELECT * FROM fee_schedule;` },
    challenge: {
      level: 2,
      prompt: 'Constraint inventory: for each table in sqlite_master, show the table name, how many columns are NOT NULL, and how many columns have a DEFAULT value. Sort by table name.',
      solution: `SELECT m.name AS table_name,
       SUM(p."notnull") AS not_null_columns,
       SUM(p.dflt_value IS NOT NULL) AS default_columns
FROM sqlite_master m
JOIN pragma_table_info(m.name) p
WHERE m.type = 'table'
GROUP BY m.name
ORDER BY m.name;`,
      hints: ['Join sqlite_master to pragma_table_info(m.name).', '"notnull" is 1 or 0, so SUM counts NOT NULL columns.', 'dflt_value IS NOT NULL is 1 or 0 too.', 'GROUP BY m.name ORDER BY m.name'],
      ordered: true,
    },
    quiz: [
      { q: 'Does CHECK (amount > 0) reject a NULL amount?', options: ['Yes', 'No, NULL makes the check UNKNOWN which passes', 'Only in SQLite', 'Only with UNIQUE'], answer: 1, why: 'Only FALSE fails a CHECK; add NOT NULL to require a value.' },
      { q: 'Where do you declare UNIQUE (payor_id, cpt_code)?', options: ['On one column', 'As a table-level constraint', 'In an index hint', 'Nowhere'], answer: 1, why: 'Multi-column constraints are table-level.' },
    ],
  },
  {
    id: 'ddl-06',
    goals: ['What a primary key guarantees', 'Surrogate vs natural keys (invoice_id vs NPI)', 'Composite primary keys', 'Auto-generated ids in SQLite, PostgreSQL, MySQL and SQL Server'],
    concept: `<p>A <b>primary key</b> (PK) is the column (or columns) that uniquely identifies each row. It is <b>unique</b> and <b>never NULL</b>, and every table should have exactly one.</p>
<ul>
<li><b>Surrogate key</b>: a meaningless number generated by the database (<code>invoice_id</code>). Stable, short, never changes.</li>
<li><b>Natural key</b>: a real-world identifier (a practitioner's NPI, a CPT code). Meaningful, but it can change, be missing (practitioner 12 has no NPI yet), or be reused.</li>
<li><b>Composite key</b>: several columns together, common in link tables: <code>PRIMARY KEY (invoice_id, line_no)</code>.</li>
</ul>
<p>A common design: surrogate PK for identity + a UNIQUE constraint on the natural key.</p>
<p>In SQLite, <code>INTEGER PRIMARY KEY</code> auto-assigns the next number when you insert NULL or omit it.</p>`,
    why: 'Primary keys make every row addressable; foreign keys, updates, deletes and joins all rely on them.',
    when: 'Every table. The only question is which kind of key.',
    analogy: 'The primary key is the medical record number (MRN). Two patients can share a name and birthday (like patients 1 and 25!), but never an MRN. The MRN is issued by the hospital (surrogate), while an SSN (natural) might be missing or wrong.',
    syntax: `col INTEGER PRIMARY KEY                    -- SQLite auto id\nPRIMARY KEY (col1, col2)                  -- composite\nid INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY   -- standard / PostgreSQL`,
    sql: `CREATE TABLE claim_lines (
  invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id),
  line_no    INTEGER NOT NULL,
  cpt_code   TEXT    NOT NULL,
  amount     REAL    NOT NULL,
  PRIMARY KEY (invoice_id, line_no)
);

INSERT INTO claim_lines
SELECT invoice_id,
       ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY charge_id),
       cpt_code, amount
FROM charges;

SELECT * FROM claim_lines WHERE invoice_id IN (4, 20) ORDER BY invoice_id, line_no;`,
    breakdown: [
      ['PRIMARY KEY (invoice_id, line_no)', 'Composite key: line numbers restart for each invoice'],
      ['ROW_NUMBER() OVER (PARTITION BY invoice_id ...)', 'Generates line numbers 1, 2, 3... per invoice'],
      ['NOT NULL on both key columns', 'PK columns must never be NULL (SQLite needs it explicit for non-integer keys)'],
    ],
    visual: { type: 'keys', parent: 'invoices', child: 'charges', pk: 'invoice_id', fk: 'invoice_id' },
    dialectSql: {
      mysql: `CREATE TABLE notes (note_id INT AUTO_INCREMENT PRIMARY KEY, body TEXT);`,
      postgres: `CREATE TABLE notes (note_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body TEXT);`,
      sqlserver: `CREATE TABLE notes (note_id INT IDENTITY(1,1) PRIMARY KEY, body NVARCHAR(MAX));`,
      oracle: `CREATE TABLE notes (note_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body CLOB);`,
      sqlite: `CREATE TABLE notes (note_id INTEGER PRIMARY KEY, body TEXT);`,
    },
    mistakes: [
      { wrong: `CREATE TABLE practitioners2 (npi TEXT PRIMARY KEY, first_name TEXT);`, why: 'NPI as the primary key fails for a new hire without an NPI yet (practitioner 12), and changing an NPI would ripple through every child table. Use a surrogate PK and make NPI UNIQUE.', fix: `CREATE TABLE practitioners2 (practitioner_id INTEGER PRIMARY KEY, npi TEXT UNIQUE, first_name TEXT);\nINSERT INTO practitioners2 (npi, first_name) VALUES (NULL, 'Leo');\nSELECT * FROM practitioners2;` },
      { wrong: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate) VALUES (1, 'Duplicate Payor', 'Commercial', 0.5);`, why: 'payor_id 1 already exists: UNIQUE constraint failed. Omit the id to let SQLite assign the next one.', fix: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('New Payor', 'Commercial', 0.5);\nSELECT payor_id, payor_name FROM payors ORDER BY payor_id DESC LIMIT 1;` },
    ],
    rules: ['Every table gets exactly one primary key.', 'Prefer short, stable surrogate keys; enforce natural keys with UNIQUE.', 'Never reuse or change primary key values.', 'Composite keys suit link and line-item tables.'],
    compare: `<table><tr><th></th><th>Surrogate (invoice_id)</th><th>Natural (npi)</th></tr>
<tr><td>Meaning</td><td>None</td><td>Real-world id</td></tr>
<tr><td>Can change</td><td>Never</td><td>Sometimes</td></tr>
<tr><td>Always available</td><td>Yes</td><td>Not always</td></tr>
<tr><td>Size in FKs</td><td>Small integer</td><td>Often wider text</td></tr></table>`,
    realWorld: 'EHRs identify patients with an internal MRN (surrogate), keep SSN and insurance member ids as attributes with their own uniqueness rules, and use (claim_id, line_no) for claim lines as on the 837 claim format.',
    tips: ['Random UUID keys fragment clustered indexes; use UUIDv7 (time-ordered) if you need UUIDs.', 'In SQLite, AUTOINCREMENT prevents reuse of ids from deleted rows but is rarely needed.'],
    deep: `<p>SQLite tables are B-trees keyed by rowid. An <code>INTEGER PRIMARY KEY</code> becomes the rowid, so the PK lookup is the table lookup. A <code>WITHOUT ROWID</code> table instead clusters on any PK (e.g. the composite (invoice_id, line_no)), saving space for tables that are always accessed by that key.</p>`,
    tryIt: { prompt: 'Insert into a table with INTEGER PRIMARY KEY without giving the id, and see SQLite assign it. Then insert with an explicit id of 100 and one more without an id.', starter: `CREATE TABLE denial_codes (\n  denial_id   INTEGER PRIMARY KEY,\n  carc_code   TEXT NOT NULL UNIQUE,\n  description TEXT NOT NULL\n);\nINSERT INTO denial_codes (carc_code, description) VALUES ('CO-16', 'Missing information');\nINSERT INTO denial_codes (carc_code, description) VALUES ('CO-197', 'Precertification absent');\nSELECT * FROM denial_codes;` },
    challenge: {
      level: 2,
      prompt: 'List the primary key column(s) of every table: table name, column name and declared type, sorted by table name and then key position.',
      solution: `SELECT m.name AS table_name, p.name AS pk_column, p.type
FROM sqlite_master m
JOIN pragma_table_info(m.name) p
WHERE m.type = 'table'
  AND p.pk > 0
ORDER BY m.name, p.pk;`,
      hints: ['pragma_table_info has a pk column: 0 = not in the key, 1, 2... = position in the key.', 'Join sqlite_master (type = \'table\') to pragma_table_info(m.name).', 'Keep rows with p.pk > 0.', 'ORDER BY m.name, p.pk'],
      ordered: true,
    },
    quiz: [
      { q: 'Which is TRUE of a primary key?', options: ['It may contain NULLs', 'It must be unique and not null', 'A table can have several', 'It must be a natural key'], answer: 1, why: 'A PK uniquely identifies rows and cannot be NULL.' },
      { q: 'Why is NPI a poor primary key for practitioners here?', options: ['It is too short', 'A new hire may not have one yet and it could change', 'It is numeric', 'It is unique'], answer: 1, why: 'Primary keys must always exist and never change.' },
    ],
  },
  {
    id: 'ddl-07',
    goals: ['What a foreign key enforces: referential integrity', 'ON DELETE / ON UPDATE actions: RESTRICT, CASCADE, SET NULL', 'Self-referencing keys (practitioners.supervisor_id)', 'Indexing foreign key columns'],
    concept: `<p>A <b>foreign key</b> (FK) says: "the value in this column must exist as a key in that other table." <code>invoices.patient_id REFERENCES patients(patient_id)</code> means no invoice can point to a patient that does not exist.</p>
<p>The FK is checked in both directions:</p>
<ul>
<li>Inserting or updating a <b>child</b> row with a missing parent fails.</li>
<li>Deleting or changing a <b>parent</b> that still has children triggers the <b>referential action</b>:
<ul><li><code>NO ACTION</code> / <code>RESTRICT</code> (default): refuse.</li>
<li><code>CASCADE</code>: delete/update the children too.</li>
<li><code>SET NULL</code> / <code>SET DEFAULT</code>: detach the children.</li></ul></li>
</ul>
<p>A table can reference itself: <code>practitioners.supervisor_id REFERENCES practitioners(practitioner_id)</code> builds the supervision hierarchy. A NULL FK means "no parent" and is allowed unless the column is NOT NULL.</p>`,
    why: 'Without FKs you get orphans: payments for invoices that no longer exist, charges for unknown practitioners. Reports then silently disagree.',
    when: 'Every relationship between tables. Choose the action based on the business meaning of deleting the parent.',
    analogy: 'A foreign key is the rule that a claim must reference a real patient chart. You cannot file a claim for chart #999 if it does not exist, and you cannot shred a chart while claims still point to it (unless your policy says shred the claims too: CASCADE).',
    syntax: `col type REFERENCES parent(key)\n  [ON DELETE {NO ACTION|RESTRICT|CASCADE|SET NULL}]\n  [ON UPDATE ...]\nFOREIGN KEY (a, b) REFERENCES parent(x, y)`,
    sql: `CREATE TABLE claim_attachments (
  attachment_id INTEGER PRIMARY KEY,
  invoice_id    INTEGER NOT NULL
                REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  uploaded_by   INTEGER
                REFERENCES practitioners(practitioner_id) ON DELETE SET NULL,
  file_name     TEXT NOT NULL
);
CREATE INDEX idx_attach_invoice ON claim_attachments(invoice_id);

INSERT INTO claim_attachments (invoice_id, uploaded_by, file_name)
VALUES (37, 2, 'void_reason.pdf'), (37, 3, 'op_note.pdf'), (5, 2, 'referral.pdf');

DELETE FROM invoices WHERE invoice_id = 37;   -- void invoice, no charges or payments

SELECT * FROM claim_attachments;`,
    breakdown: [
      ['REFERENCES invoices(invoice_id) ON DELETE CASCADE', 'Attachments belong to the invoice: delete them with it'],
      ['REFERENCES practitioners ... ON DELETE SET NULL', 'Keep the file if the uploader is removed, just forget who'],
      ['CREATE INDEX idx_attach_invoice', 'Index the FK: speeds joins and parent deletes'],
      ['DELETE FROM invoices WHERE invoice_id = 37', 'Invoice 37 has no charges/payments, so the delete is allowed and cascades'],
    ],
    visual: { type: 'keys', parent: 'patients', child: 'invoices', pk: 'patient_id', fk: 'patient_id' },
    mistakes: [
      { wrong: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (999, 1, '2026-09-01', 50, 'EFT');`, why: 'Invoice 999 does not exist: FOREIGN KEY constraint failed. The FK stops an orphan payment.', fix: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (5, 2, '2026-09-01', 50, 'EFT');\nSELECT payment_id, invoice_id, amount FROM payments ORDER BY payment_id DESC LIMIT 1;` },
      { wrong: `CREATE TABLE payments2 (invoice_id INTEGER REFERENCES invoices(invoice_id) ON DELETE CASCADE, ...);`, why: 'Cascading deletes of payments would erase financial history when an invoice is deleted. For money records, prefer RESTRICT and void/adjust instead of delete.', fix: `SELECT m.name, f."table", f.on_delete FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) f WHERE m.name = 'payments';` },
    ],
    rules: ['Every relationship gets an FK.', 'Index FK columns.', 'CASCADE only for true "part-of" children (attachments, lines), never for financial history.', 'NULL in an FK means "no parent".'],
    compare: `<table><tr><th>Action</th><th>On parent delete</th><th>Good for</th></tr>
<tr><td>NO ACTION / RESTRICT</td><td>Refuse</td><td>Payments, transactions</td></tr>
<tr><td>CASCADE</td><td>Delete children</td><td>Attachments, line items</td></tr>
<tr><td>SET NULL</td><td>Child FK becomes NULL</td><td>Optional links (uploaded_by)</td></tr></table>`,
    realWorld: 'Billing systems keep RESTRICT on payments and transactions so ledger history can never be orphaned, and use CASCADE for scanned documents attached to a claim.',
    tips: ['SQLite: PRAGMA foreign_key_check lists existing violations.', 'Loading big data sets? Some teams disable FK checks during the load and run a check afterwards.'],
    deep: `<p>Deleting a parent requires finding its children. Without an index on the child FK column, every parent delete scans the whole child table, and in some databases (Oracle, SQL Server) it can also escalate locks. Indexing FKs is one of the most common performance fixes.</p>`,
    tryIt: { prompt: 'The self-referencing FK in practitioners: try to assign a supervisor that does not exist (id 99), then fix it to a real one.', starter: `-- UPDATE practitioners SET supervisor_id = 99 WHERE practitioner_id = 12;  -- fails: FK\nUPDATE practitioners SET supervisor_id = 9 WHERE practitioner_id = 12;\n\nSELECT p.practitioner_id, p.last_name, s.last_name AS supervisor\nFROM practitioners p\nLEFT JOIN practitioners s ON s.practitioner_id = p.supervisor_id\nORDER BY p.practitioner_id;` },
    challenge: {
      level: 2,
      prompt: 'Draw the ER diagram as data: list every foreign key in the database as child table, child column, parent table and parent column. Sort by child table, then child column.',
      solution: `SELECT m.name AS child_table, f."from" AS child_column,
       f."table" AS parent_table, f."to" AS parent_column
FROM sqlite_master m
JOIN pragma_foreign_key_list(m.name) f
WHERE m.type = 'table'
ORDER BY m.name, f."from";`,
      hints: ['pragma_foreign_key_list(name) returns a table\'s FKs.', 'Join it to every table in sqlite_master.', 'Columns: "table" (parent), "from" (child column), "to" (parent column), quoted because they are keywords.', 'ORDER BY m.name, f."from"'],
      ordered: true,
    },
    quiz: [
      { q: 'What does ON DELETE CASCADE do?', options: ['Refuses the delete', 'Deletes child rows with the parent', 'Sets children to NULL', 'Archives the parent'], answer: 1, why: 'CASCADE propagates the delete to children.' },
      { q: 'An invoice has payor_id NULL. Does the FK to payors reject it?', options: ['Yes', 'No, NULL means no parent', 'Only on update', 'Only in SQLite'], answer: 1, why: 'FK checks apply only to non-NULL values.' },
    ],
  },
  {
    id: 'ddl-08',
    goals: ['Write CHECK constraints on one column and across columns', 'Use IN lists as lightweight enums', 'Understand that NULL passes a CHECK', 'Find existing rows that would violate a new rule'],
    concept: `<p>A <b>CHECK</b> constraint is a condition every row must satisfy. If an INSERT or UPDATE makes it FALSE, the statement fails.</p>
<ul>
<li>Single column: <code>CHECK (units &gt; 0)</code>.</li>
<li>List of allowed values: <code>CHECK (status IN ('Open','Paid','Partially Paid','Overdue','Void'))</code> (the invoices table has this).</li>
<li>Several columns: <code>CHECK (due_date &gt;= invoice_date)</code>, <code>CHECK (amount = units * unit_price)</code>.</li>
</ul>
<p>Rules: the check can only look at <b>the same row</b> (no subqueries, no other tables); NULL results count as passing; and before adding a CHECK to a table with data, find the rows that would break it.</p>`,
    why: 'CHECKs encode business rules in one place so no application, import or manual fix can store impossible data.',
    when: 'Value ranges, allowed codes, date ordering, and arithmetic relationships within a row.',
    analogy: 'A CHECK is the "reasonableness edit" in a claim scrubber: units must be positive, the service date cannot be after the bill date, and status must be one of the approved codes.',
    syntax: `col type CHECK (condition)\nCONSTRAINT name CHECK (condition involving several columns)`,
    sql: `CREATE TABLE charge_lines (
  line_id      INTEGER PRIMARY KEY,
  invoice_id   INTEGER NOT NULL REFERENCES invoices(invoice_id),
  service_date TEXT    NOT NULL CHECK (service_date = date(service_date)),
  units        INTEGER NOT NULL CHECK (units BETWEEN 1 AND 96),
  unit_price   REAL    NOT NULL CHECK (unit_price >= 0),
  amount       REAL    NOT NULL,
  modifier     TEXT    CHECK (modifier IN ('25','59','GP','KX')),
  CONSTRAINT chk_amount_math CHECK (abs(amount - units * unit_price) < 0.005)
);

INSERT INTO charge_lines (invoice_id, service_date, units, unit_price, amount, modifier)
VALUES (4, '2025-08-21', 2, 50, 100, 'GP'),
       (4, '2025-08-21', 1, 85, 85, NULL);

SELECT * FROM charge_lines;`,
    breakdown: [
      ['CHECK (service_date = date(service_date))', 'Only valid ISO dates survive: date() normalizes, and garbage gives NULL, which is not equal'],
      ['CHECK (units BETWEEN 1 AND 96)', 'Range rule (96 = 24 hours of 15-minute units)'],
      ['CHECK (modifier IN (...))', 'Allowed codes; NULL (no modifier) passes'],
      ['CHECK (abs(amount - units * unit_price) < 0.005)', 'Cross-column arithmetic rule, tolerant of rounding'],
    ],
    visual: { type: 'dml', statement: `INSERT INTO invoices (invoice_id, patient_id, payor_id, location_id, invoice_date, due_date, status, total_amount) VALUES (49, 5, 2, 4, '2026-09-01', '2026-10-01', 'Open', 185)`, view: `SELECT invoice_id, patient_id, invoice_date, due_date, status, total_amount FROM invoices WHERE invoice_id >= 45 ORDER BY invoice_id`, key: 'invoice_id' },
    mistakes: [
      { wrong: `UPDATE invoices SET status = 'Closed' WHERE invoice_id = 1;`, why: '\'Closed\' is not in the invoices status CHECK list: CHECK constraint failed. The rule protects reports that group by status.', fix: `UPDATE invoices SET status = 'Paid' WHERE invoice_id = 1;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 1;` },
      { wrong: `CHECK (payor_id IN (SELECT payor_id FROM payors))`, why: 'CHECK cannot use subqueries or other tables. Use a FOREIGN KEY for that.', fix: `SELECT payor_id FROM payors ORDER BY payor_id;` },
    ],
    rules: ['A CHECK sees only the current row.', 'NULL passes a CHECK: add NOT NULL when required.', 'Use IN (...) for small fixed code lists.', 'Before adding a CHECK, query for rows that would violate it.'],
    compare: `<table><tr><th>Need</th><th>Use</th></tr>
<tr><td>Value in a fixed short list</td><td>CHECK (col IN (...))</td></tr>
<tr><td>Value in another table</td><td>FOREIGN KEY</td></tr>
<tr><td>Rule across rows (no overlap, totals)</td><td>Trigger / exclusion constraint</td></tr>
<tr><td>Required value</td><td>NOT NULL</td></tr></table>`,
    realWorld: 'Claim-line tables check that units are within MUE-style limits, amounts equal units x price, and modifiers are from the allowed list, so malformed lines never reach the clearinghouse.',
    tips: ['MySQL ignored CHECK constraints before 8.0.16; verify on older servers.', 'Name CHECKs so the error tells you which rule failed.'],
    deep: `<p>PostgreSQL can add a CHECK as <code>NOT VALID</code> (enforced for new rows only), then <code>VALIDATE CONSTRAINT</code> later without a long lock, a useful pattern for large live tables with legacy bad data.</p>`,
    tryIt: { prompt: 'Try to break the charge_lines rules: uncomment one bad insert at a time and read the error.', starter: `CREATE TABLE charge_lines (\n  line_id    INTEGER PRIMARY KEY,\n  units      INTEGER NOT NULL CHECK (units BETWEEN 1 AND 96),\n  unit_price REAL    NOT NULL CHECK (unit_price >= 0),\n  amount     REAL    NOT NULL,\n  CHECK (abs(amount - units * unit_price) < 0.005)\n);\nINSERT INTO charge_lines (units, unit_price, amount) VALUES (2, 50, 100);\n-- INSERT INTO charge_lines (units, unit_price, amount) VALUES (0, 50, 0);     -- units\n-- INSERT INTO charge_lines (units, unit_price, amount) VALUES (2, 50, 90);    -- math\nSELECT * FROM charge_lines;` },
    challenge: {
      level: 2,
      prompt: 'Before adding CHECK (total_amount > 0 OR status = \'Void\') and CHECK (due_date >= invoice_date) to invoices, find every invoice that would violate EITHER rule if the Void exception were removed: invoices with total_amount <= 0 or due_date < invoice_date. Show invoice_id, status, total_amount, invoice_date and due_date.',
      solution: `SELECT invoice_id, status, total_amount, invoice_date, due_date
FROM invoices
WHERE total_amount <= 0
   OR due_date < invoice_date
ORDER BY invoice_id;`,
      hints: ['A proposed CHECK becomes a WHERE clause looking for its opposite.', 'The opposite of total_amount > 0 is total_amount <= 0.', 'Combine both violations with OR.', 'WHERE total_amount <= 0 OR due_date < invoice_date ORDER BY invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'CHECK (units > 0) and units is NULL. Result?', options: ['Rejected', 'Accepted', 'Converted to 0', 'Error in CREATE TABLE'], answer: 1, why: 'NULL > 0 is UNKNOWN, which passes.' },
      { q: 'Can a CHECK reference another table?', options: ['Yes, with a subquery', 'No', 'Only in SQLite', 'Only with CASCADE'], answer: 1, why: 'CHECKs are row-local; use FOREIGN KEY or triggers.' },
    ],
  },
  {
    id: 'ddl-09',
    goals: ['Enforce uniqueness on one or several columns', 'UNIQUE vs PRIMARY KEY and how NULLs behave', 'Partial (filtered) unique indexes', 'Find duplicates before adding a UNIQUE rule'],
    concept: `<p>A <b>UNIQUE</b> constraint guarantees no two rows have the same value (or combination of values) in the listed columns.</p>
<ul>
<li><code>payor_name TEXT UNIQUE</code>: no two payors with the same name (the sample payors table has this).</li>
<li><code>UNIQUE (first_name, last_name, date_of_birth)</code>: the combination must be unique.</li>
<li>Unlike a primary key, a table can have many UNIQUE constraints, and the columns may be NULL.</li>
<li>NULLs are not equal to each other, so several rows may have NULL (that is why practitioners.npi is UNIQUE yet practitioner 12 can have NULL). SQL Server is the exception: it allows only one NULL.</li>
<li>A <b>partial unique index</b> applies the rule to some rows: one <i>active</i> primary coverage per patient.</li>
</ul>
<p>UNIQUE is implemented with a unique index, so it also speeds up lookups on those columns.</p>`,
    why: 'Duplicates cause double billing, split patient histories and wrong counts. UNIQUE stops them at the source.',
    when: 'Natural identifiers (NPI, claim numbers, authorization numbers, emails) and "one X per Y" rules.',
    analogy: 'UNIQUE is the front desk rule "search before you register": you cannot create a second chart for the same name and birth date. Patient 25 in our data is exactly the duplicate this rule would have blocked.',
    syntax: `col type UNIQUE\nCONSTRAINT name UNIQUE (a, b)\nCREATE UNIQUE INDEX name ON t(a, b) [WHERE condition];`,
    sql: `CREATE TABLE payor_members (
  member_row  INTEGER PRIMARY KEY,
  patient_id  INTEGER NOT NULL REFERENCES patients(patient_id),
  payor_id    INTEGER NOT NULL REFERENCES payors(payor_id),
  member_id   TEXT    NOT NULL,
  is_primary  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_member UNIQUE (payor_id, member_id)
);
-- at most one primary coverage per patient
CREATE UNIQUE INDEX uq_one_primary ON payor_members(patient_id) WHERE is_primary = 1;

INSERT INTO payor_members (patient_id, payor_id, member_id, is_primary) VALUES
  (2, 1, 'BSH-1001', 1),
  (2, 3, 'MCR-7788', 0),
  (3, 4, 'MCD-5521', 1);

SELECT * FROM payor_members;`,
    breakdown: [
      ['CONSTRAINT uq_member UNIQUE (payor_id, member_id)', 'A member id is unique within one payor (different payors may reuse it)'],
      ['CREATE UNIQUE INDEX ... WHERE is_primary = 1', 'Partial unique index: only primary rows are checked'],
      ['(2, 3, \'MCR-7788\', 0)', 'Secondary coverage is allowed because it is not primary'],
    ],
    mistakes: [
      { wrong: `CREATE UNIQUE INDEX uq_patient_identity ON patients(first_name, last_name, date_of_birth);`, why: 'Patients 1 and 25 already have the same name and birth date, so creating the index fails (UNIQUE constraint failed). Merge or fix duplicates first.', fix: `SELECT first_name, last_name, date_of_birth, COUNT(*) FROM patients GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;` },
      { wrong: `-- Expect UNIQUE(email) to reject a second NULL email`, why: 'NULLs are distinct for UNIQUE in SQLite, PostgreSQL, MySQL and Oracle, so many patients may lack an email. Add NOT NULL if every row must have a distinct value.', fix: `SELECT COUNT(*) AS patients_without_email FROM patients WHERE email IS NULL;` },
    ],
    rules: ['Many UNIQUE constraints per table, one PRIMARY KEY.', 'Multiple NULLs are allowed (except SQL Server).', 'Use partial unique indexes for "one active X" rules.', 'Find and fix duplicates before adding UNIQUE.'],
    compare: `<table><tr><th></th><th>PRIMARY KEY</th><th>UNIQUE</th></tr>
<tr><td>Per table</td><td>1</td><td>Many</td></tr>
<tr><td>NULLs</td><td>No</td><td>Yes</td></tr>
<tr><td>Typical target of FKs</td><td>Yes</td><td>Possible</td></tr>
<tr><td>Creates an index</td><td>Yes</td><td>Yes</td></tr></table>`,
    realWorld: 'Patient registration enforces uniqueness of (payor, member id) and uses probabilistic matching plus a unique MRN to avoid duplicate charts; claims enforce unique claim control numbers so resubmissions are not double-billed.',
    tips: ['PostgreSQL 15+: UNIQUE NULLS NOT DISTINCT treats NULLs as equal.', 'Use COLLATE NOCASE (SQLite) or lower() indexes for case-insensitive uniqueness of emails.'],
    deep: `<p>Unique checks happen per row as the statement runs (in most databases), so <code>UPDATE t SET n = n + 1</code> can fail midway on a unique column. PostgreSQL supports <code>DEFERRABLE</code> unique constraints checked at statement or transaction end.</p>`,
    tryIt: { prompt: 'Try adding a second primary coverage for patient 2 (uncomment it): the partial unique index rejects it. A second non-primary row is fine.', starter: `CREATE TABLE payor_members (\n  patient_id INTEGER NOT NULL,\n  payor_id   INTEGER NOT NULL,\n  member_id  TEXT NOT NULL,\n  is_primary INTEGER NOT NULL DEFAULT 0,\n  UNIQUE (payor_id, member_id)\n);\nCREATE UNIQUE INDEX uq_one_primary ON payor_members(patient_id) WHERE is_primary = 1;\nINSERT INTO payor_members VALUES (2, 1, 'BSH-1001', 1);\nINSERT INTO payor_members VALUES (2, 3, 'MCR-7788', 0);\n-- INSERT INTO payor_members VALUES (2, 2, 'AET-4411', 1);  -- second primary: rejected\nSELECT * FROM payor_members;` },
    challenge: {
      level: 2,
      prompt: 'Find the rows that would block UNIQUE (first_name, last_name, date_of_birth) on patients: show every patient whose name and birth date combination appears more than once, with patient_id, first_name, last_name and date_of_birth, sorted by patient_id.',
      solution: `SELECT patient_id, first_name, last_name, date_of_birth
FROM patients
WHERE (first_name, last_name, date_of_birth) IN (
  SELECT first_name, last_name, date_of_birth
  FROM patients
  GROUP BY first_name, last_name, date_of_birth
  HAVING COUNT(*) > 1
)
ORDER BY patient_id;`,
      hints: ['First find the duplicated combinations with GROUP BY ... HAVING COUNT(*) > 1.', 'Then return the full patient rows that match those combinations.', 'SQLite supports row values: (a, b, c) IN (SELECT a, b, c ...).', 'Alternatively use COUNT(*) OVER (PARTITION BY first_name, last_name, date_of_birth) > 1 in a subquery.'],
      ordered: true,
    },
    quiz: [
      { q: 'Can a UNIQUE column hold several NULLs in SQLite?', options: ['No', 'Yes', 'Only one', 'Only with PRIMARY KEY'], answer: 1, why: 'NULLs are considered distinct from each other.' },
      { q: 'How do you allow only one primary coverage per patient but many secondary ones?', options: ['UNIQUE (patient_id)', 'A partial unique index WHERE is_primary = 1', 'CHECK', 'FOREIGN KEY'], answer: 1, why: 'The partial index only enforces uniqueness on primary rows.' },
    ],
  },
  {
    id: 'ddl-10',
    goals: ['What normalization is and the problems it solves', 'Update, insert and delete anomalies', 'Functional dependencies in plain words', 'The path 1NF → 2NF → 3NF → BCNF and when to stop'],
    concept: `<p><b>Normalization</b> is organizing tables so that <b>each fact is stored once</b>, in the table where it belongs.</p>
<p>Imagine one wide spreadsheet: invoice number, patient name, patient city, payor name, payor phone, CPT code, CPT description, amount. It "works", but:</p>
<ul>
<li><b>Update anomaly</b>: Aetna changes phone numbers; you must update hundreds of rows and will miss some.</li>
<li><b>Insert anomaly</b>: you cannot record a new payor until it has an invoice.</li>
<li><b>Delete anomaly</b>: deleting a patient's only invoice also deletes the only record of that patient.</li>
</ul>
<p>The fix is to split the data into tables by what each fact depends on. A <b>functional dependency</b> A → B means "if you know A, you know B": <code>payor_id → payor_name</code>, <code>cpt_code → description</code>. Each normal form removes one kind of bad dependency:</p>
<ul>
<li><b>1NF</b>: one value per cell, no repeating groups.</li>
<li><b>2NF</b>: no column depends on only part of a composite key.</li>
<li><b>3NF</b>: no column depends on another non-key column.</li>
<li><b>BCNF</b>: every determinant is a candidate key.</li>
</ul>
<p>Our sample database is (mostly) normalized: that is why reports need joins to put the facts back together.</p>`,
    why: 'Normalized schemas prevent contradictory data and make changes safe: fix a fact in one place and every report sees it.',
    when: 'Designing transactional (OLTP) schemas like billing, scheduling and claims. Reporting schemas may deliberately denormalize later.',
    analogy: 'Instead of writing the payor\'s phone number on every claim folder, the office keeps one payor directory card. Every claim just says "payor #2". When the number changes, you fix one card.',
    syntax: `-- one fact, one place:\npayors(payor_id PK, payor_name, phone)\ninvoices(invoice_id PK, patient_id FK, payor_id FK, ...)\n-- recombine with joins`,
    sql: `SELECT i.invoice_id,
       pa.first_name || ' ' || pa.last_name AS patient,
       py.payor_name,
       l.location_name,
       i.total_amount
FROM invoices i
JOIN patients pa            ON pa.patient_id = i.patient_id
LEFT JOIN payors py         ON py.payor_id   = i.payor_id
JOIN treatment_locations l  ON l.location_id = i.location_id
WHERE i.invoice_id <= 6
ORDER BY i.invoice_id;`,
    breakdown: [
      ['FROM invoices i', 'The invoice stores only keys to the related facts'],
      ['JOIN patients pa', 'Patient name lives once, in patients'],
      ['LEFT JOIN payors py', 'Payor name lives once, in payors (LEFT JOIN: self-pay invoices may have no payor)'],
      ['JOIN treatment_locations l', 'Location details live once, in treatment_locations'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 250" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="11">
<text x="10" y="16" fill="var(--red)" font-weight="bold">Unnormalized: one wide table, facts repeated</text>
<rect x="10" y="24" width="620" height="22" fill="var(--panel2)" stroke="var(--border)"/>
<text x="16" y="39" fill="var(--text)">invoice | patient | patient_city | payor_name | payor_phone | cpt | cpt_description | amount</text>
<text x="16" y="60" fill="var(--muted)">4 | Aria Carter | Plano | Self-Pay | NULL | 97140 | Manual therapy (15 min) | 50</text>
<text x="16" y="76" fill="var(--muted)">4 | Aria Carter | Plano | Self-Pay | NULL | 97140 | Manual therapy (15 min) | 100</text>
<text x="16" y="92" fill="var(--muted)">3 | Noah Taylor | Dallas | <tspan fill="var(--red)">Aetna Care | 800-555-0102</tspan> | 93000 | Electrocardiogram (ECG) | 60</text>
<text x="16" y="108" fill="var(--muted)">9 | ... | ... | <tspan fill="var(--red)">Aetna Care | 800-555-9999 ?</tspan> | ...  <tspan fill="var(--red)">(update anomaly: two phones)</tspan></text>
<text x="320" y="132" text-anchor="middle" fill="var(--accent)" font-size="18">&#8595; split by dependency &#8595;</text>
<g font-size="11">
<rect x="10" y="145" width="140" height="95" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="80" y="162" text-anchor="middle" fill="var(--text)" font-weight="bold">patients</text><text x="18" y="180" fill="var(--muted)">patient_id PK</text><text x="18" y="196" fill="var(--muted)">name, city</text>
<rect x="165" y="145" width="140" height="95" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="235" y="162" text-anchor="middle" fill="var(--text)" font-weight="bold">payors</text><text x="173" y="180" fill="var(--muted)">payor_id PK</text><text x="173" y="196" fill="var(--muted)">payor_name, phone</text>
<rect x="320" y="145" width="150" height="95" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="395" y="162" text-anchor="middle" fill="var(--text)" font-weight="bold">invoices</text><text x="328" y="180" fill="var(--muted)">invoice_id PK</text><text x="328" y="196" fill="var(--muted)">patient_id FK</text><text x="328" y="212" fill="var(--muted)">payor_id FK</text>
<rect x="485" y="145" width="145" height="95" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="557" y="162" text-anchor="middle" fill="var(--text)" font-weight="bold">charges</text><text x="493" y="180" fill="var(--muted)">charge_id PK</text><text x="493" y="196" fill="var(--muted)">invoice_id FK</text><text x="493" y="212" fill="var(--muted)">cpt_code, amount</text>
</g>
</svg>` },
    mistakes: [
      { wrong: `CREATE TABLE invoice_report (invoice_id INTEGER, patient_name TEXT, payor_name TEXT, payor_phone TEXT, cpt_codes TEXT);\n-- used as the system of record`, why: 'Every fact is copied into every row: payor phones drift apart, cpt_codes packs many values in one cell, and deleting a row can lose a patient. Fine as a report output, wrong as the stored design.', fix: `SELECT i.invoice_id, py.payor_name, py.phone FROM invoices i LEFT JOIN payors py ON py.payor_id = i.payor_id LIMIT 5;` },
      { wrong: `-- "Normalize" by splitting every column into its own table`, why: 'Over-normalization (a table for first names, a table for cities...) adds joins without removing any redundancy. Split only where a real dependency causes repetition.', fix: `SELECT patient_id, first_name, last_name, city FROM patients LIMIT 5;` },
    ],
    rules: ['Store each fact once.', 'Split tables along functional dependencies (A → B).', '3NF (or BCNF) is the usual target for transactional systems.', 'Join to recombine; denormalize only deliberately.'],
    compare: `<table><tr><th>Form</th><th>Removes</th><th>Sample violation</th></tr>
<tr><td>1NF</td><td>Multi-valued cells, repeating groups</td><td>allergies = 'Penicillin, Latex'</td></tr>
<tr><td>2NF</td><td>Partial dependency on part of a composite key</td><td>description depends only on cpt_code in (invoice_id, cpt_code)</td></tr>
<tr><td>3NF</td><td>Transitive dependency via a non-key</td><td>location_city stored in invoices</td></tr>
<tr><td>BCNF</td><td>Determinants that are not keys</td><td>practitioner → specialty inside (patient, specialty) key</td></tr></table>`,
    realWorld: 'Practice-management databases keep patients, payors, locations and CPT master data in separate reference tables; claims and invoices store only keys, so a payor address change is a single update.',
    tips: ['Ask of every column: "What single thing does this describe?" If it is not the table\'s key, it belongs elsewhere.', 'Normalization is about writes; for heavy reads, add views or summary tables.'],
    deep: `<p>Formally, a relation is in BCNF when for every non-trivial functional dependency X → Y, X is a superkey. 3NF relaxes this by allowing Y to be part of a candidate key. Higher forms (4NF, 5NF) deal with multi-valued and join dependencies, rare in billing schemas but seen in many-to-many-to-many designs.</p>`,
    tryIt: { prompt: 'Build the "unnormalized" wide view with joins to see how much repetition normalization avoids. Add py.phone and notice it repeats on every row for the same payor.', starter: `SELECT i.invoice_id, pa.last_name, py.payor_name, c.cpt_code, c.description, c.amount\nFROM invoices i\nJOIN patients pa ON pa.patient_id = i.patient_id\nLEFT JOIN payors py ON py.payor_id = i.payor_id\nJOIN charges c ON c.invoice_id = i.invoice_id\nORDER BY py.payor_name, i.invoice_id\nLIMIT 15;` },
    challenge: {
      level: 2,
      prompt: 'Reassemble normalized data: for invoices 1 to 8, show invoice_id, the patient last name, the payor name (or \'Self-Pay/None\' when payor_id is NULL) and the location name. Sort by invoice_id.',
      solution: `SELECT i.invoice_id, pa.last_name,
       COALESCE(py.payor_name, 'Self-Pay/None') AS payor_name,
       l.location_name
FROM invoices i
JOIN patients pa ON pa.patient_id = i.patient_id
LEFT JOIN payors py ON py.payor_id = i.payor_id
JOIN treatment_locations l ON l.location_id = i.location_id
WHERE i.invoice_id BETWEEN 1 AND 8
ORDER BY i.invoice_id;`,
      hints: ['Start from invoices and join each reference table by its key.', 'payor_id can be NULL: use LEFT JOIN payors.', 'COALESCE(py.payor_name, \'Self-Pay/None\') fills the missing name.', 'WHERE i.invoice_id BETWEEN 1 AND 8 ORDER BY i.invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'What is an update anomaly?', options: ['A slow UPDATE', 'Having to change the same fact in many rows, risking inconsistency', 'An UPDATE without WHERE', 'A deadlock'], answer: 1, why: 'Redundant copies of a fact can be updated inconsistently.' },
      { q: 'payor_id → payor_name means...', options: ['payor_name determines payor_id', 'Knowing payor_id tells you payor_name', 'They are equal', 'payor_id is NULL'], answer: 1, why: 'A functional dependency: the left side determines the right side.' },
    ],
  },
  {
    id: 'ddl-11',
    goals: ['The First Normal Form rule: atomic values, no repeating groups', 'Spot 1NF violations: comma lists, code1/code2/code3 columns', 'Fix them with a child table', 'Split an existing list column into rows'],
    concept: `<p>A table is in <b>First Normal Form (1NF)</b> when:</p>
<ul>
<li>every cell holds <b>one value</b> (atomic), not a list;</li>
<li>there are <b>no repeating groups</b> like <code>dx1, dx2, dx3, dx4</code> columns;</li>
<li>each row is unique (it has a key).</li>
</ul>
<p>Our sample data contains a deliberate violation: <code>patients.allergies</code> holds text like <code>'Penicillin, Latex'</code>. Questions such as "how many patients are allergic to Latex?" become fragile string searches (<code>LIKE '%Latex%'</code> would also match "Latex-free gloves note").</p>
<p>The 1NF fix is a <b>child table</b> with one row per value: <code>patient_allergies(patient_id, allergy)</code>. Now each allergy can be counted, indexed, validated and joined.</p>`,
    why: 'Lists in a cell cannot be indexed, constrained or joined properly, and every query must parse strings.',
    when: 'Whenever a column holds several values or a table has numbered repeating columns.',
    analogy: 'Writing all allergies on one line of the intake form in free text is fine for a human, but the pharmacy system needs a checklist with one checkbox per allergy to warn reliably.',
    syntax: `-- instead of: patients(..., allergies TEXT 'A, B')\nCREATE TABLE patient_allergies (\n  patient_id INTEGER REFERENCES patients,\n  allergy    TEXT NOT NULL,\n  PRIMARY KEY (patient_id, allergy)\n);`,
    sql: `CREATE TABLE patient_allergies (
  patient_id INTEGER NOT NULL REFERENCES patients(patient_id),
  allergy    TEXT    NOT NULL,
  PRIMARY KEY (patient_id, allergy)
);

-- split 'Penicillin, Latex' into rows with a recursive CTE
WITH RECURSIVE split(patient_id, item, rest) AS (
  SELECT patient_id, '', allergies || ', '
  FROM patients WHERE allergies IS NOT NULL
  UNION ALL
  SELECT patient_id,
         substr(rest, 1, instr(rest, ', ') - 1),
         substr(rest, instr(rest, ', ') + 2)
  FROM split WHERE rest <> ''
)
INSERT INTO patient_allergies (patient_id, allergy)
SELECT patient_id, item FROM split WHERE item <> '';

SELECT * FROM patient_allergies ORDER BY patient_id, allergy;`,
    breakdown: [
      ['PRIMARY KEY (patient_id, allergy)', 'One row per patient per allergy, no duplicates'],
      ['allergies || \', \'', 'Add a trailing separator so every item ends the same way'],
      ['substr(rest, 1, instr(rest, \', \') - 1)', 'Take the text before the next separator'],
      ['substr(rest, instr(rest, \', \') + 2)', 'Keep the remainder for the next recursion step'],
      ['WHERE item <> \'\'', 'Skip the empty seed row'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 170" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="10" y="18" fill="var(--red)" font-weight="bold">Not 1NF: patients.allergies</text>
<rect x="10" y="26" width="260" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="18" y="43" fill="var(--text)">patient_id | allergies</text>
<text x="18" y="68" fill="var(--muted)">3 | Penicillin</text>
<text x="18" y="88" fill="var(--red)">5 | Penicillin, Latex   &#8592; two values in one cell</text>
<text x="18" y="108" fill="var(--muted)">11 | Peanuts</text>
<text x="300" y="75" fill="var(--accent)" font-size="22">&#8594;</text>
<text x="340" y="18" fill="var(--green)" font-weight="bold">1NF: patient_allergies</text>
<rect x="340" y="26" width="260" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="348" y="43" fill="var(--text)">patient_id | allergy   (PK both)</text>
<text x="348" y="68" fill="var(--muted)">3 | Penicillin</text>
<text x="348" y="88" fill="var(--green)">5 | Latex</text>
<text x="348" y="108" fill="var(--green)">5 | Penicillin</text>
<text x="348" y="128" fill="var(--muted)">11 | Peanuts</text>
<text x="10" y="158" fill="var(--muted)">Also not 1NF: dx1, dx2, dx3, dx4 columns (repeating group) &#8594; one row per diagnosis.</text>
</svg>` },
    mistakes: [
      { wrong: `SELECT COUNT(*) FROM patients WHERE allergies LIKE '%Penicillin%';`, why: 'Works by luck today, but string matching breaks on spelling variants ("penicilin"), partial matches, and cannot use an index. After the 1NF split it is a simple equality.', fix: `SELECT COUNT(*) AS penicillin_patients FROM patients WHERE ', ' || allergies || ', ' LIKE '%, Penicillin, %';` },
      { wrong: `CREATE TABLE claims (claim_id INTEGER PRIMARY KEY, dx1 TEXT, dx2 TEXT, dx3 TEXT, dx4 TEXT);`, why: 'A repeating group: the 5th diagnosis needs a schema change, and "claims with I10" must check four columns. Use a claim_diagnoses child table.', fix: `CREATE TABLE claim_diagnoses (claim_id INTEGER NOT NULL, seq INTEGER NOT NULL, icd10 TEXT NOT NULL, PRIMARY KEY (claim_id, seq));\nSELECT name FROM pragma_table_info('claim_diagnoses');` },
    ],
    rules: ['One value per cell.', 'No numbered repeating columns.', 'Lists become child tables with one row per item.', 'Every row needs a key.'],
    compare: `<table><tr><th></th><th>List in a cell</th><th>Child table (1NF)</th></tr>
<tr><td>Count patients with Latex allergy</td><td>String search</td><td><code>WHERE allergy = 'Latex'</code></td></tr>
<tr><td>Index</td><td>No</td><td>Yes</td></tr>
<tr><td>Validate values (FK to allergen list)</td><td>No</td><td>Yes</td></tr>
<tr><td>Add a 5th value</td><td>Edit string</td><td>Insert a row</td></tr></table>`,
    realWorld: 'Clinical systems store allergies, diagnoses and medications as child rows with coded values (RxNorm, ICD-10) so drug-allergy checks and quality reports can query them reliably.',
    tips: ['JSON arrays in a column are still a list in a cell; fine for display payloads, not for data you query often.', 'The recursive split pattern is useful for one-time migrations.'],
    deep: `<p>Strictly, relational theory says every attribute value is atomic with respect to the database operations used on it. A date is "atomic" even though it has a year inside; a comma list is not, because you need its parts. Atomicity is about how you use the data.</p>`,
    tryIt: { prompt: 'After the split, answering questions is easy. Run it, then count patients per allergy.', starter: `WITH RECURSIVE split(patient_id, item, rest) AS (\n  SELECT patient_id, '', allergies || ', ' FROM patients WHERE allergies IS NOT NULL\n  UNION ALL\n  SELECT patient_id, substr(rest, 1, instr(rest, ', ') - 1), substr(rest, instr(rest, ', ') + 2)\n  FROM split WHERE rest <> ''\n)\nSELECT patient_id, item AS allergy\nFROM split\nWHERE item <> ''\nORDER BY patient_id, allergy;` },
    challenge: {
      level: 2,
      prompt: 'Find the 1NF violations in patients.allergies: patients whose allergies cell holds more than one value. Show patient_id, allergies and the number of values in the cell (count the commas + 1). Sort by patient_id.',
      solution: `SELECT patient_id, allergies,
       length(allergies) - length(replace(allergies, ',', '')) + 1 AS value_count
FROM patients
WHERE allergies LIKE '%,%'
ORDER BY patient_id;`,
      hints: ['Multi-valued cells contain a comma.', 'Filter WHERE allergies LIKE \'%,%\'.', 'Commas = length(allergies) - length(replace(allergies, \',\', \'\')).', 'value_count = commas + 1'],
      ordered: true,
    },
    quiz: [
      { q: 'Which violates 1NF?', options: ['A date column', 'allergies = \'Penicillin, Latex\'', 'A composite primary key', 'A NULL value'], answer: 1, why: 'Two values in one cell break atomicity.' },
      { q: 'How do you fix columns dx1..dx4?', options: ['Add dx5', 'Store them as JSON', 'Create a child table with one row per diagnosis', 'Concatenate them'], answer: 2, why: 'Repeating groups become rows in a child table.' },
    ],
  },
  {
    id: 'ddl-12',
    goals: ['Second Normal Form: no partial dependencies on a composite key', 'Recognize partial dependencies in line-item tables', 'Extract a lookup table (CPT codes)', 'Why single-column surrogate keys make 2NF automatic'],
    concept: `<p>2NF only matters for tables with a <b>composite key</b>. A table is in <b>2NF</b> when it is in 1NF and every non-key column depends on the <b>whole</b> key, not just part of it.</p>
<p>Example: a table <code>invoice_lines(invoice_id, cpt_code, units, description, standard_price)</code> with key <b>(invoice_id, cpt_code)</b>.</p>
<ul>
<li><code>units</code> depends on both (how many of that code on that invoice): fine.</li>
<li><code>description</code> and <code>standard_price</code> depend only on <code>cpt_code</code>: a <b>partial dependency</b>. The description of 97140 is repeated on every invoice that uses it (15 times in our charges!).</li>
</ul>
<p>The fix: move the partially dependent columns to their own table keyed by that part: <code>cpt_codes(cpt_code PK, description, standard_price)</code>.</p>
<p>Our sample charges table stores description next to cpt_code, a small, realistic 2NF-style redundancy (charges uses a surrogate key, but the dependency cpt_code → description is still there).</p>`,
    why: 'Partial dependencies duplicate reference data; a typo fix or price change must be repeated everywhere and can drift.',
    when: 'Line-item, enrollment and assignment tables with composite keys; code descriptions and prices stored on transactions.',
    analogy: 'Printing the full CPT description from the codebook onto every claim line is redundant: the codebook already has it. The claim line needs only the code; look the description up when you print.',
    syntax: `-- before: lines(invoice_id, cpt_code, units, description)  key (invoice_id, cpt_code)\n-- after:\ncpt_codes(cpt_code PK, description)\nlines(invoice_id, cpt_code FK, units)  key (invoice_id, cpt_code)`,
    sql: `CREATE TABLE cpt_codes (
  cpt_code    TEXT PRIMARY KEY,
  description TEXT NOT NULL
);
INSERT INTO cpt_codes (cpt_code, description)
SELECT DISTINCT cpt_code, description FROM charges;

CREATE TABLE invoice_lines (
  invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id),
  cpt_code   TEXT    NOT NULL REFERENCES cpt_codes(cpt_code),
  units      INTEGER NOT NULL,
  PRIMARY KEY (invoice_id, cpt_code)
);
INSERT INTO invoice_lines
SELECT invoice_id, cpt_code, SUM(units) FROM charges GROUP BY invoice_id, cpt_code;

SELECT l.invoice_id, l.cpt_code, c.description, l.units
FROM invoice_lines l JOIN cpt_codes c USING (cpt_code)
WHERE l.invoice_id IN (4, 20)
ORDER BY l.invoice_id, l.cpt_code;`,
    breakdown: [
      ['CREATE TABLE cpt_codes', 'The lookup table: description depends only on cpt_code'],
      ['SELECT DISTINCT cpt_code, description', 'Collapse 104 repeated descriptions into 16 rows'],
      ['PRIMARY KEY (invoice_id, cpt_code)', 'The composite key of the line table'],
      ['units', 'The only non-key column left: it depends on the whole key'],
      ['JOIN cpt_codes USING (cpt_code)', 'Recover the description when needed'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 175" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="10" y="18" fill="var(--red)" font-weight="bold">Not 2NF  (key = invoice_id + cpt_code)</text>
<rect x="10" y="26" width="300" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="18" y="43" fill="var(--text)">invoice_id | cpt_code | units | <tspan fill="var(--red)">description</tspan></text>
<text x="18" y="68" fill="var(--muted)">4 | 97140 | 3 | <tspan fill="var(--red)">Manual therapy (15 min)</tspan></text>
<text x="18" y="88" fill="var(--muted)">6 | 97140 | 2 | <tspan fill="var(--red)">Manual therapy (15 min)</tspan></text>
<text x="18" y="108" fill="var(--muted)">9 | 97140 | 1 | <tspan fill="var(--red)">Manual therapy (15 min)</tspan></text>
<text x="18" y="130" fill="var(--red)" font-size="11">description depends on cpt_code only (part of the key)</text>
<text x="325" y="75" fill="var(--accent)" font-size="22">&#8594;</text>
<text x="360" y="18" fill="var(--green)" font-weight="bold">2NF</text>
<rect x="360" y="26" width="270" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="368" y="43" fill="var(--text)">invoice_lines: invoice_id | cpt_code | units</text>
<text x="368" y="66" fill="var(--muted)">4 | 97140 | 3     6 | 97140 | 2 ...</text>
<rect x="360" y="90" width="270" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="368" y="107" fill="var(--text)">cpt_codes: cpt_code PK | description</text>
<text x="368" y="130" fill="var(--green)">97140 | Manual therapy (15 min)   (stored once)</text>
</svg>` },
    mistakes: [
      { wrong: `UPDATE charges SET description = 'Manual therapy techniques (15 min)' WHERE charge_id = 4;`, why: 'Now charge 4 says one thing and 14 other 97140 charges say another: the update anomaly caused by the partial dependency. Change the description in one lookup table instead.', fix: `SELECT cpt_code, COUNT(DISTINCT description) AS versions FROM charges GROUP BY cpt_code HAVING COUNT(DISTINCT description) > 1;` },
      { wrong: `-- Think 2NF is irrelevant because the table has an id column`, why: 'A surrogate key hides the composite "real" key but not the dependency: cpt_code → description still repeats data. Look at dependencies, not just the declared key.', fix: `SELECT cpt_code, description, COUNT(*) AS repeated FROM charges GROUP BY cpt_code, description ORDER BY repeated DESC LIMIT 5;` },
    ],
    rules: ['2NF applies to composite keys.', 'Every non-key column must depend on the whole key.', 'Columns that depend on part of the key move to a table keyed by that part.', 'Historical prices may legitimately be copied (the price at the time of service).'],
    compare: `<table><tr><th></th><th>Before (not 2NF)</th><th>After (2NF)</th></tr>
<tr><td>Descriptions stored</td><td>104 copies</td><td>16 rows</td></tr>
<tr><td>Fix a typo</td><td>Update many rows</td><td>Update one row</td></tr>
<tr><td>Add a new CPT code before it is billed</td><td>Impossible</td><td>Insert into cpt_codes</td></tr></table>`,
    realWorld: 'Charge masters (CDMs) hold CPT/HCPCS descriptions and standard prices once; charge lines reference the code. The charged unit_price is still copied onto the line on purpose, because it is the price at the time of service (history, not redundancy).',
    tips: ['Distinguish "current reference data" (normalize) from "value at the time" (snapshot, keep on the transaction).', 'A lookup table also lets you add FK validation of codes.'],
    deep: `<p>Keeping unit_price on each charge is not a 2NF violation if the business fact is "price charged on this line": that depends on the whole line, not on cpt_code. The dependency analysis depends on meaning, which is why normalization needs domain knowledge, not just column names.</p>`,
    tryIt: { prompt: 'Build the cpt_codes lookup table and check that each code has exactly one description (the dependency cpt_code → description holds).', starter: `CREATE TABLE cpt_codes AS\nSELECT DISTINCT cpt_code, description FROM charges;\n\nSELECT cpt_code, COUNT(*) AS descriptions\nFROM cpt_codes\nGROUP BY cpt_code\nORDER BY cpt_code;` },
    challenge: {
      level: 2,
      prompt: 'Design the cpt_codes lookup from the data: one row per cpt_code with its description and how many charge rows currently repeat that description. Sort by the repeat count descending, then cpt_code.',
      solution: `SELECT cpt_code, description, COUNT(*) AS times_repeated
FROM charges
GROUP BY cpt_code, description
ORDER BY times_repeated DESC, cpt_code;`,
      hints: ['All data is in charges.', 'Group by cpt_code and description.', 'COUNT(*) shows how many times the description is stored.', 'ORDER BY times_repeated DESC, cpt_code'],
      ordered: true,
    },
    quiz: [
      { q: 'A table with a single-column key and no composite key...', options: ['Can never violate 2NF (if in 1NF)', 'Always violates 2NF', 'Must be in BCNF', 'Needs a partial index'], answer: 0, why: 'Partial dependency requires a key with more than one column.' },
      { q: 'In lines(invoice_id, cpt_code, units, description), which column causes the 2NF violation?', options: ['units', 'description', 'invoice_id', 'None'], answer: 1, why: 'description depends only on cpt_code, part of the key.' },
    ],
  },
  {
    id: 'ddl-13',
    goals: ['Third Normal Form: no transitive dependencies', 'Recognize non-key columns that determine other columns', 'Move them to the table they describe', 'Get the values back with joins'],
    concept: `<p>A table is in <b>Third Normal Form (3NF)</b> when it is in 2NF and no non-key column depends on <b>another non-key column</b>. In short: every column describes <i>the key, the whole key, and nothing but the key</i>.</p>
<p>Example: suppose practitioners stored <code>location_id, location_name, location_city</code>.</p>
<ul>
<li><code>practitioner_id → location_id</code> (fine: where the practitioner works)</li>
<li><code>location_id → location_name, location_city</code> (a fact about the location, not about the practitioner)</li>
</ul>
<p>So <code>practitioner_id → location_id → location_city</code> is a <b>transitive dependency</b>. The city is repeated for every practitioner at that location, and if the clinic moves you must update many rows.</p>
<p>The fix is what our sample schema already does: <code>practitioners</code> keeps only <code>location_id</code>, and <code>treatment_locations</code> holds name, city and state once.</p>`,
    why: '3NF removes the most common redundancy in business schemas: descriptive attributes of a referenced thing copied into the referencing table.',
    when: 'Whenever a table stores attributes of something it points to (location city, payor phone, supervisor name).',
    analogy: 'The staff roster should say "works at Clinic #3", not also copy the clinic\'s address next to every name. The clinic address lives on the clinic\'s card.',
    syntax: `-- before: practitioners(id, name, location_id, location_city)\n-- after:\npractitioners(id, name, location_id FK)\ntreatment_locations(location_id PK, location_name, city, state)`,
    sql: `-- A 3NF violation, built on purpose
CREATE TABLE staff_flat AS
SELECT p.practitioner_id, p.last_name, p.location_id, l.location_name, l.city
FROM practitioners p JOIN treatment_locations l USING (location_id);

-- The clinic moves: in the flat table many rows must change
UPDATE staff_flat SET city = 'Pflugerville' WHERE location_id = 1;

-- In 3NF it is one row in treatment_locations
UPDATE treatment_locations SET city = 'Pflugerville' WHERE location_id = 1;

SELECT p.practitioner_id, p.last_name, l.location_name, l.city
FROM practitioners p JOIN treatment_locations l USING (location_id)
ORDER BY p.practitioner_id;`,
    breakdown: [
      ['CREATE TABLE staff_flat AS ...', 'Copies location_name and city onto every practitioner row (transitive dependency)'],
      ['UPDATE staff_flat ... WHERE location_id = 1', 'Must touch every practitioner at that clinic'],
      ['UPDATE treatment_locations ...', '3NF: the fact lives once, one row changes'],
      ['JOIN treatment_locations USING (location_id)', 'Join to show the city next to the practitioner'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 165" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="10" y="18" fill="var(--red)" font-weight="bold">Not 3NF</text>
<rect x="10" y="26" width="300" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="18" y="43" fill="var(--text)">practitioner_id | location_id | <tspan fill="var(--red)">city</tspan></text>
<text x="18" y="68" fill="var(--muted)">2 | 1 | <tspan fill="var(--red)">Austin</tspan></text>
<text x="18" y="88" fill="var(--muted)">9 | 1 | <tspan fill="var(--red)">Austin</tspan></text>
<text x="18" y="112" fill="var(--red)" font-size="11">practitioner_id &#8594; location_id &#8594; city  (transitive)</text>
<text x="325" y="70" fill="var(--accent)" font-size="22">&#8594;</text>
<text x="360" y="18" fill="var(--green)" font-weight="bold">3NF</text>
<rect x="360" y="26" width="270" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="368" y="43" fill="var(--text)">practitioners: id | location_id</text>
<text x="368" y="66" fill="var(--muted)">2 | 1     9 | 1</text>
<rect x="360" y="84" width="270" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="368" y="101" fill="var(--text)">treatment_locations: location_id | city</text>
<text x="368" y="124" fill="var(--green)">1 | Austin   (stored once)</text>
</svg>` },
    mistakes: [
      { wrong: `ALTER TABLE invoices ADD COLUMN payor_phone TEXT;`, why: 'payor_phone depends on payor_id, not on the invoice: invoice_id → payor_id → phone. Copying it creates stale phone numbers on old invoices.', fix: `SELECT i.invoice_id, py.phone FROM invoices i LEFT JOIN payors py ON py.payor_id = i.payor_id LIMIT 5;` },
      { wrong: `-- Store a patient's age column next to date_of_birth`, why: 'Age is derived from date_of_birth (and today), so it goes stale every birthday. Compute it in queries or views.', fix: `SELECT patient_id, date_of_birth, (strftime('%Y','2026-09-01') - strftime('%Y', date_of_birth)) - (strftime('%m-%d','2026-09-01') < strftime('%m-%d', date_of_birth)) AS age FROM patients LIMIT 5;` },
    ],
    rules: ['Every non-key column describes the key, the whole key, and nothing but the key.', 'Attributes of a referenced thing live in that thing\'s table.', 'Derived values (age, totals) are computed, or deliberately denormalized.', 'Join to display related attributes.'],
    compare: `<table><tr><th>Form</th><th>Question to ask</th></tr>
<tr><td>1NF</td><td>Is every cell a single value?</td></tr>
<tr><td>2NF</td><td>Does any column depend on only part of the key?</td></tr>
<tr><td>3NF</td><td>Does any column depend on a non-key column?</td></tr></table>`,
    realWorld: 'When a clinic relocates, a 3NF billing system updates one location row and every future claim prints the new service-facility address; older systems that copied addresses onto practitioner rows produced claims with mixed addresses.',
    tips: ['Snapshot values (address billed on a submitted claim) are history, not a 3NF violation.', 'Look for columns named like other tables: payor_*, location_*, patient_*.'],
    deep: `<p>3NF allows a non-key attribute to determine part of a candidate key; BCNF does not. In practice most 3NF schemas are also BCNF; the differences appear with overlapping candidate keys.</p>`,
    tryIt: { prompt: 'Count how many rows the flat design repeats the city: build staff_flat and group by city. Compare with the number of rows in treatment_locations.', starter: `CREATE TABLE staff_flat AS\nSELECT p.practitioner_id, p.last_name, p.location_id, l.city\nFROM practitioners p JOIN treatment_locations l USING (location_id);\n\nSELECT city, COUNT(*) AS copies_of_city FROM staff_flat GROUP BY city ORDER BY city;` },
    challenge: {
      level: 2,
      prompt: 'Use the 3NF design: count practitioners per city by joining practitioners to treatment_locations. Show city, state and the practitioner count, sorted by count descending, then city.',
      solution: `SELECT l.city, l.state, COUNT(*) AS practitioners
FROM practitioners p
JOIN treatment_locations l ON l.location_id = p.location_id
GROUP BY l.city, l.state
ORDER BY practitioners DESC, l.city;`,
      hints: ['The city is not in practitioners; it is in treatment_locations.', 'Join on location_id.', 'GROUP BY l.city, l.state and COUNT(*).', 'ORDER BY practitioners DESC, l.city'],
      ordered: true,
    },
    quiz: [
      { q: 'What is a transitive dependency?', options: ['A dependency on part of the key', 'A non-key column depending on another non-key column', 'A foreign key', 'A circular FK'], answer: 1, why: 'key → A → B: B depends on the key only through A.' },
      { q: 'Where should a location\'s city be stored?', options: ['On every invoice', 'On every practitioner', 'In treatment_locations', 'In a JSON column'], answer: 2, why: 'It is a fact about the location.' },
    ],
  },
  {
    id: 'ddl-14',
    goals: ['Boyce-Codd Normal Form: every determinant is a candidate key', 'The classic BCNF case: overlapping candidate keys', 'Decompose without losing information', 'When stopping at 3NF is acceptable'],
    concept: `<p><b>BCNF</b> is a stricter 3NF: for every dependency <code>X → Y</code>, <code>X</code> must be a key (can identify a whole row).</p>
<p>Classic healthcare example: a table <code>care_team(patient_id, specialty, practitioner_id)</code> with rules:</p>
<ul>
<li>each patient has one practitioner per specialty: key <b>(patient_id, specialty)</b>;</li>
<li>each practitioner has exactly one specialty: <b>practitioner_id → specialty</b>.</li>
</ul>
<p>The table is in 3NF (specialty is part of a key), but <b>not BCNF</b>, because practitioner_id determines specialty yet is not a key. Result: Dr. Nair's specialty "Cardiology" is repeated for every patient she sees, and nothing stops a row that says Dr. Nair is a psychiatrist for one patient.</p>
<p>BCNF decomposition: <code>practitioners(practitioner_id, specialty)</code> (already in our schema) and <code>care_team(patient_id, practitioner_id)</code>. The trade-off: the rule "one practitioner per specialty per patient" can no longer be a simple UNIQUE constraint; it needs a trigger or a check in the app.</p>`,
    why: 'BCNF removes the last kind of redundancy caused by functional dependencies, which prevents contradictions like one practitioner with two specialties.',
    when: 'Tables with several overlapping candidate keys, typically assignment or scheduling tables.',
    analogy: 'The care-team board lists "patient / specialty / doctor". Writing the doctor\'s specialty on every line is redundant: the staff directory already says Dr. Nair is a cardiologist. BCNF says: keep the specialty only in the directory.',
    syntax: `-- not BCNF: care_team(patient_id, specialty, practitioner_id), practitioner_id -> specialty\n-- BCNF:\npractitioners(practitioner_id PK, specialty)\ncare_team(patient_id, practitioner_id, PRIMARY KEY (patient_id, practitioner_id))`,
    sql: `CREATE TABLE care_team (
  patient_id      INTEGER NOT NULL REFERENCES patients(patient_id),
  practitioner_id INTEGER NOT NULL REFERENCES practitioners(practitioner_id),
  PRIMARY KEY (patient_id, practitioner_id)
);

INSERT INTO care_team
SELECT DISTINCT i.patient_id, c.practitioner_id
FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id;

-- specialty comes from its single home
SELECT ct.patient_id, pr.specialty, pr.last_name
FROM care_team ct
JOIN practitioners pr ON pr.practitioner_id = ct.practitioner_id
WHERE ct.patient_id IN (2, 5)
ORDER BY ct.patient_id, pr.specialty;`,
    breakdown: [
      ['care_team(patient_id, practitioner_id)', 'Only the relationship; no specialty column'],
      ['SELECT DISTINCT i.patient_id, c.practitioner_id', 'Derive who treated whom from the charges'],
      ['JOIN practitioners', 'specialty is looked up where practitioner_id is the key'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 170" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="10" y="18" fill="var(--red)" font-weight="bold">3NF but not BCNF</text>
<rect x="10" y="26" width="300" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="18" y="43" fill="var(--text)">patient_id | specialty | practitioner_id</text>
<text x="18" y="68" fill="var(--muted)">2 | <tspan fill="var(--red)">Cardiology</tspan> | 3</text>
<text x="18" y="88" fill="var(--muted)">7 | <tspan fill="var(--red)">Cardiology</tspan> | 3</text>
<text x="18" y="108" fill="var(--red)">9 | Psychiatry | 3   &#8592; contradiction possible</text>
<text x="18" y="132" fill="var(--red)" font-size="11">practitioner_id &#8594; specialty, but practitioner_id is not a key</text>
<text x="325" y="75" fill="var(--accent)" font-size="22">&#8594;</text>
<text x="360" y="18" fill="var(--green)" font-weight="bold">BCNF</text>
<rect x="360" y="26" width="270" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="368" y="43" fill="var(--text)">practitioners: practitioner_id PK | specialty</text>
<text x="368" y="66" fill="var(--green)">3 | Cardiology  (once)</text>
<rect x="360" y="84" width="270" height="24" fill="var(--panel2)" stroke="var(--border)"/><text x="368" y="101" fill="var(--text)">care_team: patient_id | practitioner_id</text>
<text x="368" y="124" fill="var(--muted)">2 | 3     7 | 3</text>
</svg>` },
    mistakes: [
      { wrong: `CREATE TABLE care_team_bad (patient_id INTEGER, specialty TEXT, practitioner_id INTEGER, PRIMARY KEY (patient_id, specialty));`, why: 'Nothing prevents two rows giving practitioner 3 different specialties, and the specialty is repeated per patient. Keep specialty only in practitioners.', fix: `SELECT practitioner_id, specialty FROM practitioners WHERE practitioner_id = 3;` },
      { wrong: `-- Decompose into (patient_id, specialty) and (specialty, practitioner_id)`, why: 'That split loses information: joining back on specialty creates false combinations (every patient with every same-specialty practitioner). Decompose on the determinant: (practitioner_id, specialty) + (patient_id, practitioner_id).', fix: `SELECT specialty, COUNT(*) AS practitioners FROM practitioners GROUP BY specialty HAVING COUNT(*) > 1;` },
    ],
    rules: ['BCNF: every determinant must be a candidate key.', 'Decompose on the offending dependency (X, Y) + (rest, X).', 'Check the decomposition is lossless: the join must return exactly the original rows.', 'Sometimes you trade a lost constraint for BCNF; document it.'],
    compare: `<table><tr><th></th><th>3NF</th><th>BCNF</th></tr>
<tr><td>Non-key determinants</td><td>Allowed if the dependent is part of a key</td><td>Never</td></tr>
<tr><td>Always dependency-preserving</td><td>Yes</td><td>Not always</td></tr>
<tr><td>Redundancy</td><td>A little possible</td><td>None from FDs</td></tr></table>`,
    realWorld: 'Care-team and referral tables in EHRs store the relationship (patient, practitioner, role) and look up specialty from the provider directory, so a provider\'s specialty change is reflected everywhere.',
    tips: ['Most tables that are in 3NF are already in BCNF; check tables with overlapping composite keys.', 'Verify a suspected dependency with GROUP BY x HAVING COUNT(DISTINCT y) > 1.'],
    deep: `<p>A lossless-join decomposition of R into R1 and R2 requires that the common attributes be a key of R1 or R2. Here the common attribute practitioner_id is the key of practitioners, so joining care_team back to practitioners reproduces the original rows exactly.</p>`,
    tryIt: { prompt: 'Verify the dependency practitioner_id → specialty in the derived care relation: every practitioner should show exactly 1 distinct specialty.', starter: `WITH care AS (\n  SELECT DISTINCT i.patient_id, pr.specialty, c.practitioner_id\n  FROM charges c\n  JOIN invoices i ON i.invoice_id = c.invoice_id\n  JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id\n)\nSELECT practitioner_id, COUNT(DISTINCT specialty) AS specialties, COUNT(DISTINCT patient_id) AS patients\nFROM care\nGROUP BY practitioner_id\nORDER BY practitioner_id;` },
    challenge: {
      level: 3,
      prompt: 'Show why specialty cannot be a key of the care relation: for each specialty, count how many different practitioners have charges in it and how many distinct patients they treated. Only specialties with more than one practitioner. Sort by specialty.',
      solution: `SELECT pr.specialty,
       COUNT(DISTINCT c.practitioner_id) AS practitioners,
       COUNT(DISTINCT i.patient_id) AS patients
FROM charges c
JOIN invoices i ON i.invoice_id = c.invoice_id
JOIN practitioners pr ON pr.practitioner_id = c.practitioner_id
GROUP BY pr.specialty
HAVING COUNT(DISTINCT c.practitioner_id) > 1
ORDER BY pr.specialty;`,
      hints: ['Join charges -> invoices (patient) and charges -> practitioners (specialty).', 'GROUP BY specialty.', 'COUNT(DISTINCT c.practitioner_id) and COUNT(DISTINCT i.patient_id).', 'HAVING COUNT(DISTINCT c.practitioner_id) > 1 ORDER BY pr.specialty'],
      ordered: true,
    },
    quiz: [
      { q: 'A table is in 3NF but not BCNF when...', options: ['It has NULLs', 'A non-key determinant decides part of a candidate key', 'It has no primary key', 'It has a transitive dependency'], answer: 1, why: 'That is exactly the case 3NF allows and BCNF forbids.' },
      { q: 'Correct BCNF split of care_team(patient, specialty, practitioner) with practitioner → specialty?', options: ['(patient, specialty) + (specialty, practitioner)', '(practitioner, specialty) + (patient, practitioner)', '(patient) + (specialty) + (practitioner)', 'No split needed'], answer: 1, why: 'Split on the determinant so the join is lossless.' },
    ],
  },
  {
    id: 'ddl-15',
    goals: ['What denormalization is and why it is sometimes right', 'Common patterns: stored totals, copied attributes, summary tables', 'Keeping denormalized data correct (triggers, jobs, checks)', 'Verifying a stored total against its source'],
    concept: `<p><b>Denormalization</b> is deliberately storing redundant data to make reads faster or simpler, accepting extra work on writes.</p>
<p>Our sample schema already has one: <code>invoices.total_amount</code> is the sum of that invoice's <code>charges.amount</code>. It could always be computed, but storing it makes every invoice list fast without summing charges.</p>
<p>Common patterns:</p>
<ul>
<li><b>Stored aggregates</b>: invoice totals, patient balances, charge counts.</li>
<li><b>Copied attributes</b>: patient name on a claim snapshot, payor name in a reporting table.</li>
<li><b>Summary / reporting tables</b>: monthly revenue by location (star schemas in data warehouses).</li>
</ul>
<p>The price: redundant data can <b>drift</b>. You must keep it in sync (triggers, application logic, scheduled rebuilds) and <b>audit</b> it with reconciliation queries.</p>`,
    why: 'Read-heavy screens and reports can be much faster when they do not recompute joins and aggregates on every request.',
    when: 'After normalizing first, when measurements show a read path is too slow, or for analytics/reporting tables.',
    analogy: 'The total at the bottom of the invoice is denormalized: you could always add up the lines, but printing the total saves everyone the arithmetic. The cost is that when a line changes, someone must fix the total too.',
    syntax: `-- keep in sync with a trigger or job\nUPDATE invoices SET total_amount = (SELECT SUM(amount) FROM charges c WHERE c.invoice_id = invoices.invoice_id);\n-- audit\nSELECT ... WHERE stored <> computed;`,
    sql: `ALTER TABLE patients ADD COLUMN open_balance REAL NOT NULL DEFAULT 0;

UPDATE patients
SET open_balance = IFNULL((
  SELECT SUM(t.amount)
  FROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id
  WHERE i.patient_id = patients.patient_id
), 0);

SELECT patient_id, last_name, open_balance
FROM patients
WHERE open_balance > 0
ORDER BY open_balance DESC;`,
    breakdown: [
      ['ADD COLUMN open_balance', 'A denormalized copy of a value derivable from transactions'],
      ['UPDATE ... SET open_balance = (SELECT SUM ...)', 'Refresh from the source of truth (the ledger)'],
      ['SELECT ... WHERE open_balance > 0', 'Now the collections screen reads one table, no joins'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 160" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="10" y="18" fill="var(--text)" font-weight="bold">Normalized: compute on read</text>
<rect x="10" y="28" width="130" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="75" y="48" text-anchor="middle" fill="var(--text)">patients</text>
<rect x="160" y="28" width="130" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="225" y="48" text-anchor="middle" fill="var(--text)">invoices</text>
<rect x="310" y="28" width="130" height="30" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="375" y="48" text-anchor="middle" fill="var(--text)">transactions</text>
<text x="460" y="48" fill="var(--muted)">JOIN + SUM every time</text>
<text x="10" y="92" fill="var(--text)" font-weight="bold">Denormalized: compute on write</text>
<rect x="10" y="102" width="200" height="30" rx="5" fill="var(--panel2)" stroke="var(--green)"/><text x="110" y="122" text-anchor="middle" fill="var(--text)">patients.open_balance</text>
<text x="230" y="122" fill="var(--green)">fast read, one table</text>
<text x="400" y="122" fill="var(--yellow)">must be kept in sync + audited</text>
<text x="10" y="152" fill="var(--muted)">Rule of thumb: normalize first, denormalize only measured hot paths.</text>
</svg>` },
    mistakes: [
      { wrong: `INSERT INTO charges (invoice_id, practitioner_id, service_date, cpt_code, description, units, unit_price, amount)\nVALUES (5, 2, '2026-08-28', '36415', 'Venipuncture (blood draw)', 1, 25, 25);\n-- and forget invoices.total_amount`, why: 'The stored total is now $25 short. Every denormalized value needs a sync mechanism (trigger, same transaction, or job).', fix: `SELECT i.invoice_id, i.total_amount, SUM(c.amount) AS computed FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id WHERE i.invoice_id = 5 GROUP BY i.invoice_id;` },
      { wrong: `-- Denormalize everything up front "for speed"`, why: 'Premature denormalization multiplies update paths and drift bugs without proven benefit. Normalize, measure, then denormalize specific hot reads.', fix: `EXPLAIN QUERY PLAN SELECT i.patient_id, SUM(t.amount) FROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id GROUP BY i.patient_id;` },
    ],
    rules: ['Normalize first; denormalize deliberately.', 'Every redundant value needs a single, reliable sync path.', 'Schedule reconciliation queries (stored vs computed).', 'Prefer views or materialized views when they are fast enough.'],
    compare: `<table><tr><th></th><th>Normalized</th><th>Denormalized</th></tr>
<tr><td>Reads</td><td>Joins/aggregates</td><td>Simple, fast</td></tr>
<tr><td>Writes</td><td>One place</td><td>Several places</td></tr>
<tr><td>Risk</td><td>Slow reports</td><td>Inconsistent data</td></tr>
<tr><td>Typical use</td><td>OLTP (billing entry)</td><td>Dashboards, warehouses</td></tr></table>`,
    realWorld: 'Billing systems store invoice totals and patient balances for fast statements and work queues, update them in the same transaction as the ledger entry, and run nightly reconciliations that flag any invoice whose stored total differs from its lines.',
    tips: ['Put the sync in the database (trigger) if many apps write the source table.', 'Name denormalized columns clearly (cached_, total_) so readers know they are derived.'],
    deep: `<p>Data warehouses denormalize on purpose into <b>star schemas</b>: a fact table (charges) surrounded by wide dimension tables (patient, payor, date, location). The redundancy is fine there because data is loaded in batches, not edited row by row.</p>`,
    tryIt: { prompt: 'Simulate drift: add a charge without updating the total, then run the reconciliation query to catch it.', starter: `INSERT INTO charges (invoice_id, practitioner_id, service_date, cpt_code, description, units, unit_price, amount)\nVALUES (5, 2, '2026-08-28', '36415', 'Venipuncture (blood draw)', 1, 25, 25);\n\nSELECT i.invoice_id, i.total_amount AS stored, SUM(c.amount) AS computed\nFROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id\nGROUP BY i.invoice_id, i.total_amount\nHAVING i.total_amount <> SUM(c.amount);` },
    challenge: {
      level: 2,
      prompt: 'Audit the denormalized invoices.total_amount: for EVERY invoice (including ones with no charges), show invoice_id, the stored total, the total computed from charges (0 if none) and a column in_sync that is 1 when they match, else 0. Sort by invoice_id.',
      solution: `SELECT i.invoice_id,
       i.total_amount AS stored_total,
       IFNULL(SUM(c.amount), 0) AS computed_total,
       i.total_amount = IFNULL(SUM(c.amount), 0) AS in_sync
FROM invoices i
LEFT JOIN charges c ON c.invoice_id = i.invoice_id
GROUP BY i.invoice_id, i.total_amount
ORDER BY i.invoice_id;`,
      hints: ['LEFT JOIN charges so invoice 37 (no charges) stays.', 'IFNULL(SUM(c.amount), 0) is the computed total.', 'A comparison returns 1 or 0 in SQLite.', 'GROUP BY i.invoice_id, i.total_amount ORDER BY i.invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'What is the main risk of denormalization?', options: ['Slower reads', 'Redundant copies drifting out of sync', 'More joins', 'Less storage'], answer: 1, why: 'Every copy must be kept consistent with the source.' },
      { q: 'Which is denormalized in the sample schema?', options: ['charges.amount', 'invoices.total_amount', 'payors.payor_name', 'patients.patient_id'], answer: 1, why: 'It equals the sum of the invoice\'s charges.' },
    ],
  },
  {
    id: 'ddl-16',
    goals: ['Create a view as a saved query', 'Use views to simplify, secure and standardize', 'Understand that views store no data', 'Updatable views and INSTEAD OF triggers'],
    concept: `<p>A <b>view</b> is a named SELECT stored in the database. You query it like a table, but it holds <b>no data</b>: each time you use it, its query runs against the current base tables.</p>
<pre>CREATE VIEW v_invoice_balance AS SELECT ...;
SELECT * FROM v_invoice_balance WHERE balance &gt; 0;</pre>
<ul>
<li><b>Simplify</b>: hide a four-table join behind one name.</li>
<li><b>Standardize</b>: everyone uses the same definition of "balance".</li>
<li><b>Secure</b>: expose some columns (no allergies or emails) and grant access to the view only.</li>
<li><b>Stable interface</b>: rename base columns while the view keeps old names.</li>
</ul>
<p>Simple single-table views are often updatable in server databases; in SQLite views are read-only unless you add <code>INSTEAD OF</code> triggers.</p>`,
    why: 'Views centralize complex or sensitive logic so reports stay consistent and short.',
    when: 'Repeated joins/calculations (balances, aging), restricted data access, and backward-compatible interfaces.',
    analogy: 'A view is a saved report template. It contains no numbers itself; every time you open it, it pulls fresh figures from the ledgers.',
    syntax: `CREATE VIEW [IF NOT EXISTS] name AS\nSELECT ...;\nDROP VIEW name;`,
    sql: `CREATE VIEW v_invoice_balance AS
SELECT i.invoice_id,
       i.patient_id,
       i.status,
       i.due_date,
       i.total_amount,
       IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS paid,
       i.total_amount
         - IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS balance
FROM invoices i;

SELECT invoice_id, status, total_amount, paid, balance
FROM v_invoice_balance
WHERE balance > 0
ORDER BY balance DESC
LIMIT 10;`,
    breakdown: [
      ['CREATE VIEW v_invoice_balance AS', 'Saves the query under a name'],
      ['(SELECT SUM(p.amount) ...) AS paid', 'Correlated subquery avoids double counting when joining'],
      ['total_amount - paid AS balance', 'One shared definition of balance'],
      ['SELECT ... FROM v_invoice_balance WHERE balance > 0', 'Use the view like a table; the query runs now against current data'],
    ],
    mistakes: [
      { wrong: `CREATE VIEW v_bad AS\nSELECT i.invoice_id, SUM(c.amount) AS charged, SUM(p.amount) AS paid\nFROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id\nLEFT JOIN payments p ON p.invoice_id = i.invoice_id\nGROUP BY i.invoice_id;`, why: 'Joining two child tables multiplies rows (3 charges x 2 payments = 6 rows), inflating both sums. A view hides the bug from everyone who uses it. Aggregate each child separately.', fix: `SELECT i.invoice_id, (SELECT SUM(amount) FROM charges c WHERE c.invoice_id = i.invoice_id) AS charged, (SELECT SUM(amount) FROM payments p WHERE p.invoice_id = i.invoice_id) AS paid FROM invoices i LIMIT 5;` },
      { wrong: `CREATE VIEW v_patients AS SELECT * FROM patients;`, why: 'SELECT * in a view exposes every column (allergies, email) and, in many databases, the column list is frozen at creation, so later schema changes surprise users. List columns explicitly.', fix: `CREATE VIEW v_patient_directory AS SELECT patient_id, first_name, last_name, city FROM patients;\nSELECT * FROM v_patient_directory LIMIT 5;` },
    ],
    rules: ['A view stores a query, not data.', 'List columns explicitly.', 'Beware of fan-out when joining several child tables.', 'Views can restrict access to sensitive columns.'],
    compare: `<table><tr><th></th><th>View</th><th>Table</th><th>Materialized view</th></tr>
<tr><td>Stores data</td><td>No</td><td>Yes</td><td>Yes (snapshot)</td></tr>
<tr><td>Always current</td><td>Yes</td><td>Yes</td><td>Until refreshed</td></tr>
<tr><td>Speed</td><td>Same as its query</td><td>Direct</td><td>Fast reads</td></tr></table>`,
    realWorld: 'Billing teams publish views like v_invoice_balance and v_ar_aging so every dashboard, export and ad-hoc query computes balances identically; a HIPAA-minded v_patient_directory hides clinical columns from front-desk reports.',
    tips: ['Prefix views (v_) so readers know they are not tables.', 'SELECT sql FROM sqlite_master WHERE type = \'view\' shows view definitions.'],
    deep: `<p>The optimizer usually <b>inlines</b> a view (merges its query into yours), so a filter on the view can be pushed down to the base tables and use indexes. Views with DISTINCT, aggregates, LIMIT or window functions may be computed first and then filtered, which can be slower.</p>`,
    tryIt: { prompt: 'Create the balance view and build an aging report on top of it: count invoices with balance > 0 per status.', starter: `CREATE VIEW v_invoice_balance AS\nSELECT i.invoice_id, i.status, i.due_date, i.total_amount,\n       i.total_amount - IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS balance\nFROM invoices i;\n\nSELECT status, COUNT(*) AS invoices, SUM(balance) AS open_balance\nFROM v_invoice_balance\nWHERE balance > 0\nGROUP BY status\nORDER BY open_balance DESC;` },
    challenge: {
      level: 2,
      prompt: 'Write the query behind a view v_overdue_balance: for Overdue invoices, show invoice_id, total_amount, amount paid (0 if none) and balance (total minus paid). Sort by balance descending, then invoice_id.',
      solution: `SELECT i.invoice_id, i.total_amount,
       IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS paid,
       i.total_amount - IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS balance
FROM invoices i
WHERE i.status = 'Overdue'
ORDER BY balance DESC, i.invoice_id;`,
      hints: ['Start from invoices with status = \'Overdue\'.', 'Paid = SUM of payments for that invoice (correlated subquery or LEFT JOIN + GROUP BY).', 'Wrap in IFNULL(..., 0) for invoices with no payments.', 'ORDER BY balance DESC, i.invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'Does a (non-materialized) view store rows?', options: ['Yes', 'No, it stores a query', 'Only the first 100', 'Only indexes'], answer: 1, why: 'The query runs each time the view is used.' },
      { q: 'A good use of a view is...', options: ['Speeding up every query automatically', 'Hiding sensitive columns and standardizing a calculation', 'Backing up a table', 'Replacing indexes'], answer: 1, why: 'Views simplify, standardize and secure.' },
    ],
  },
  {
    id: 'ddl-17',
    goals: ['What a materialized view is: a stored query result', 'Refresh strategies: full, concurrent, incremental', 'Emulating materialized views in SQLite with CREATE TABLE AS', 'Trade-offs: speed vs freshness'],
    concept: `<p>A <b>materialized view</b> (MV) runs its query once and <b>stores the result</b> like a table. Reads are instant; the data is a snapshot until you <b>refresh</b> it.</p>
<ul>
<li>PostgreSQL: <code>CREATE MATERIALIZED VIEW mv AS SELECT ...;</code> and <code>REFRESH MATERIALIZED VIEW [CONCURRENTLY] mv;</code></li>
<li>Oracle: MVs with <code>REFRESH FAST ON COMMIT</code> (incremental) and query rewrite.</li>
<li>SQL Server: <b>indexed views</b>, maintained automatically on every write.</li>
<li>MySQL and SQLite: no MVs. Emulate with a summary table: <code>CREATE TABLE ... AS SELECT</code>, then refresh with <code>DELETE</code> + <code>INSERT ... SELECT</code> in a transaction.</li>
</ul>`,
    why: 'Heavy aggregations (monthly revenue by payor and location over millions of charges) are too slow to run on every dashboard load.',
    when: 'Dashboards and reports that tolerate slightly stale data (refreshed hourly or nightly).',
    analogy: 'A view is calling the ledger clerk every time you want the monthly totals. A materialized view is the printed month-end summary pinned on the wall: instant to read, but it only changes when someone reprints it.',
    syntax: `CREATE MATERIALIZED VIEW mv AS SELECT ...;   -- PostgreSQL\nREFRESH MATERIALIZED VIEW CONCURRENTLY mv;\n-- SQLite emulation\nCREATE TABLE mv AS SELECT ...;\nDELETE FROM mv; INSERT INTO mv SELECT ...;`,
    sql: `-- SQLite emulation of a materialized view
CREATE TABLE mv_monthly_revenue AS
SELECT strftime('%Y-%m', invoice_date) AS month,
       COUNT(*)                        AS invoices,
       SUM(total_amount)               AS billed
FROM invoices
WHERE status <> 'Void'
GROUP BY month;

-- new data arrives...
INSERT INTO invoices (patient_id, payor_id, location_id, invoice_date, due_date, status, total_amount)
VALUES (2, 1, 1, '2026-08-30', '2026-09-29', 'Open', 500);

-- refresh = rebuild the snapshot atomically
BEGIN;
DELETE FROM mv_monthly_revenue;
INSERT INTO mv_monthly_revenue
SELECT strftime('%Y-%m', invoice_date), COUNT(*), SUM(total_amount)
FROM invoices WHERE status <> 'Void'
GROUP BY strftime('%Y-%m', invoice_date);
COMMIT;

SELECT * FROM mv_monthly_revenue WHERE month >= '2026-05' ORDER BY month;`,
    breakdown: [
      ['CREATE TABLE mv_monthly_revenue AS SELECT ...', 'Stores the aggregated result (the "materialization")'],
      ['INSERT INTO invoices ...', 'The source changes; the snapshot is now stale'],
      ['BEGIN; DELETE ...; INSERT ... SELECT ...; COMMIT;', 'Full refresh inside one transaction so readers never see an empty table'],
      ['SELECT * FROM mv_monthly_revenue', 'Fast reads from the stored result'],
    ],
    dialectSql: {
      mysql: `-- no MVs: summary table + scheduled event\nCREATE TABLE mv_monthly_revenue AS SELECT DATE_FORMAT(invoice_date,'%Y-%m') AS month, SUM(total_amount) AS billed FROM invoices GROUP BY month;`,
      postgres: `CREATE MATERIALIZED VIEW mv_monthly_revenue AS\nSELECT date_trunc('month', invoice_date) AS month, SUM(total_amount) AS billed FROM invoices GROUP BY 1;\nCREATE UNIQUE INDEX ON mv_monthly_revenue(month);\nREFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue;`,
      sqlserver: `CREATE VIEW dbo.v_monthly_revenue WITH SCHEMABINDING AS\nSELECT location_id, COUNT_BIG(*) AS n, SUM(total_amount) AS billed FROM dbo.invoices GROUP BY location_id;\nCREATE UNIQUE CLUSTERED INDEX ix ON dbo.v_monthly_revenue(location_id);`,
      oracle: `CREATE MATERIALIZED VIEW mv_monthly_revenue\nREFRESH COMPLETE ON DEMAND AS\nSELECT TRUNC(invoice_date, 'MM') AS month, SUM(total_amount) AS billed FROM invoices GROUP BY TRUNC(invoice_date, 'MM');`,
      sqlite: `CREATE TABLE mv_monthly_revenue AS\nSELECT strftime('%Y-%m', invoice_date) AS month, SUM(total_amount) AS billed FROM invoices GROUP BY month;`,
    },
    mistakes: [
      { wrong: `DELETE FROM mv_monthly_revenue;\nINSERT INTO mv_monthly_revenue SELECT ...;  -- without a transaction`, why: 'Between the DELETE and the INSERT, dashboards see an empty table, and a failure leaves it empty. Wrap the refresh in one transaction (or build a new table and swap names).', fix: `BEGIN;\nCREATE TABLE mv_x AS SELECT status, COUNT(*) AS n FROM invoices GROUP BY status;\nCOMMIT;\nSELECT * FROM mv_x;` },
      { wrong: `-- Use a nightly MV for the "amount due today" screen at the payment window`, why: 'Front-desk collections need current balances; a snapshot from last night shows payments that were already made. Use MVs only where staleness is acceptable.', fix: `SELECT invoice_id, total_amount FROM invoices WHERE status = 'Open';` },
    ],
    rules: ['Materialized = stored result; view = stored query.', 'Decide and document the refresh schedule.', 'Refresh atomically.', 'Never use stale snapshots for real-time decisions.'],
    compare: `<table><tr><th></th><th>PostgreSQL</th><th>Oracle</th><th>SQL Server</th><th>SQLite / MySQL</th></tr>
<tr><td>Feature</td><td>MATERIALIZED VIEW</td><td>MATERIALIZED VIEW</td><td>Indexed view</td><td>Summary table</td></tr>
<tr><td>Refresh</td><td>Manual (full)</td><td>Full / fast, on demand or commit</td><td>Automatic, synchronous</td><td>Your code</td></tr></table>`,
    realWorld: 'Revenue-cycle dashboards read from nightly-refreshed MVs of charges by month, payor and location; the CFO sees yesterday\'s numbers in milliseconds instead of waiting minutes for a live aggregation.',
    tips: ['REFRESH ... CONCURRENTLY in PostgreSQL needs a unique index but lets readers keep reading.', 'Store a refreshed_at timestamp so users know how fresh the data is.'],
    deep: `<p>Incremental ("fast") refresh applies only the changes since the last refresh, using change logs on the base tables. It is much cheaper for large MVs but restricts which queries qualify (certain aggregates and joins only).</p>`,
    tryIt: { prompt: 'Build a location summary snapshot, then add a refreshed_at column to it using date(\'now\').', starter: `CREATE TABLE mv_location_revenue AS\nSELECT l.location_name,\n       COUNT(i.invoice_id)            AS invoices,\n       IFNULL(SUM(i.total_amount), 0) AS billed\nFROM treatment_locations l\nLEFT JOIN invoices i ON i.location_id = l.location_id\nGROUP BY l.location_name;\n\nSELECT * FROM mv_location_revenue ORDER BY billed DESC;` },
    challenge: {
      level: 2,
      prompt: 'Write the query that would populate mv_monthly_revenue for 2026: month (YYYY-MM), number of non-Void invoices and total billed. Sort by month.',
      solution: `SELECT strftime('%Y-%m', invoice_date) AS month,
       COUNT(*) AS invoices,
       SUM(total_amount) AS billed
FROM invoices
WHERE status <> 'Void'
  AND invoice_date >= '2026-01-01' AND invoice_date < '2027-01-01'
GROUP BY month
ORDER BY month;`,
      hints: ['Month key: strftime(\'%Y-%m\', invoice_date).', 'Exclude Void and keep only 2026 dates.', 'GROUP BY the month with COUNT(*) and SUM(total_amount).', 'ORDER BY month'],
      ordered: true,
    },
    quiz: [
      { q: 'What does a materialized view store?', options: ['The SQL text only', 'The query result', 'An index only', 'Nothing'], answer: 1, why: 'It stores the result set, refreshed on a schedule.' },
      { q: 'How do you emulate one in SQLite?', options: ['CREATE MATERIALIZED VIEW', 'A summary table built with CREATE TABLE AS and refreshed', 'PRAGMA materialize', 'A trigger on SELECT'], answer: 1, why: 'SQLite has no MVs; a summary table does the job.' },
    ],
  },
  {
    id: 'ddl-18',
    goals: ['What a trigger is and when it fires (BEFORE/AFTER/INSTEAD OF)', 'Use NEW and OLD row values', 'Common uses: audit trails, derived values, validations', 'Risks: hidden logic, cascades, performance'],
    concept: `<p>A <b>trigger</b> is code the database runs <b>automatically</b> when rows are inserted, updated or deleted in a table.</p>
<ul>
<li><b>Timing</b>: <code>BEFORE</code> (validate or adjust), <code>AFTER</code> (react: audit, sync), <code>INSTEAD OF</code> (on views).</li>
<li><b>Event</b>: <code>INSERT</code>, <code>UPDATE [OF column]</code>, <code>DELETE</code>.</li>
<li><b>NEW</b> is the row after the change; <b>OLD</b> is the row before.</li>
<li><code>WHEN</code> limits when it fires; <code>RAISE(ABORT, 'msg')</code> (SQLite) rejects the change.</li>
</ul>
<p>Typical billing uses: write a ledger line in <code>transactions</code> whenever a payment is recorded, keep <code>invoices.total_amount</code> in sync with charges, or log every status change for audit.</p>`,
    why: 'Triggers guarantee that related bookkeeping happens no matter which application or script changes the data.',
    when: 'Audit logging, keeping denormalized values in sync, and cross-row validations that constraints cannot express.',
    analogy: 'A trigger is the office rule "whenever a check is deposited, the ledger clerk automatically writes the matching ledger line." Nobody has to remember to ask; it just happens.',
    syntax: `CREATE TRIGGER name {BEFORE|AFTER} {INSERT|UPDATE [OF col]|DELETE} ON table\n[WHEN condition]\nBEGIN\n  statements using NEW.col / OLD.col;\nEND;`,
    sql: `CREATE TRIGGER trg_payment_ledger
AFTER INSERT ON payments
BEGIN
  INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, reference_id, posted_by)
  VALUES (NEW.invoice_id, NEW.payment_date, 'PAYMENT', -NEW.amount, NEW.payment_id, 'trigger');
END;

CREATE TRIGGER trg_no_overpayment
BEFORE INSERT ON payments
WHEN NEW.amount > (SELECT total_amount FROM invoices WHERE invoice_id = NEW.invoice_id)
BEGIN
  SELECT RAISE(ABORT, 'Payment exceeds invoice total');
END;

INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)
VALUES (3, 2, '2026-09-01', 45, 'EFT');

SELECT transaction_id, invoice_id, transaction_type, amount, posted_by
FROM transactions WHERE invoice_id = 3 ORDER BY transaction_id;`,
    breakdown: [
      ['AFTER INSERT ON payments', 'Fires once for each inserted payment row'],
      ['NEW.invoice_id, -NEW.amount', 'Values of the new payment; payments lower the balance'],
      ['BEFORE INSERT ... WHEN NEW.amount > ...', 'Validation trigger, runs only when the condition is true'],
      ['RAISE(ABORT, ...)', 'Rejects the INSERT with a message'],
    ],
    visual: { type: 'dml', statement: `CREATE TRIGGER trg_payment_ledger AFTER INSERT ON payments BEGIN INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, reference_id, posted_by) VALUES (NEW.invoice_id, NEW.payment_date, 'PAYMENT', -NEW.amount, NEW.payment_id, 'trigger'); END; INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (3, 2, '2026-09-01', 45, 'EFT');`, view: `SELECT transaction_id, invoice_id, transaction_type, amount, posted_by FROM transactions WHERE invoice_id = 3 ORDER BY transaction_id`, key: 'transaction_id' },
    mistakes: [
      { wrong: `CREATE TRIGGER t AFTER UPDATE ON invoices BEGIN\n  UPDATE invoices SET status = 'Paid' WHERE invoice_id = NEW.invoice_id;\nEND;`, why: 'The trigger updates the same table it listens to. With recursive triggers enabled (as in this build) it re-fires itself until the depth limit errors. Restrict it with UPDATE OF col and a WHEN condition, or compute the value in a BEFORE trigger elsewhere.', fix: `CREATE TRIGGER t_mark_paid AFTER INSERT ON payments\nWHEN (SELECT IFNULL(SUM(amount),0) FROM payments WHERE invoice_id = NEW.invoice_id) >= (SELECT total_amount FROM invoices WHERE invoice_id = NEW.invoice_id)\nBEGIN UPDATE invoices SET status = 'Paid' WHERE invoice_id = NEW.invoice_id AND status <> 'Paid'; END;\nSELECT name FROM sqlite_master WHERE type = 'trigger';` },
      { wrong: `-- Put complex business workflows (emails, API calls) in triggers`, why: 'Triggers are invisible to people reading application code, run inside every transaction and slow every write. Keep them small and data-focused.', fix: `SELECT COUNT(*) FROM payments;` },
    ],
    rules: ['Keep triggers short and deterministic.', 'Use NEW/OLD; restrict with UPDATE OF and WHEN.', 'Document triggers: they are hidden side effects.', 'Beware of triggers firing other triggers (recursion).'],
    compare: `<table><tr><th></th><th>Trigger</th><th>Constraint</th><th>App code</th></tr>
<tr><td>Runs for every writer</td><td>Yes</td><td>Yes</td><td>No</td></tr>
<tr><td>Can touch other tables</td><td>Yes</td><td>No (FK only checks)</td><td>Yes</td></tr>
<tr><td>Visibility</td><td>Hidden</td><td>Declarative</td><td>Explicit</td></tr></table>`,
    realWorld: 'Hospitals keep audit tables filled by triggers (who changed an invoice status and when) for compliance, and ledger triggers ensure every payment posted by any interface creates a matching transaction line.',
    tips: ['SQLite triggers are FOR EACH ROW only.', 'List triggers with SELECT name, tbl_name, sql FROM sqlite_master WHERE type = \'trigger\'.'],
    deep: `<p>SQL Server and SQL-standard statement-level triggers see the whole set of changed rows (the <code>inserted</code>/<code>deleted</code> pseudo-tables in SQL Server, transition tables in PostgreSQL). A common SQL Server bug is writing a trigger that assumes one row and breaks on multi-row INSERTs.</p>`,
    tryIt: { prompt: 'Add an audit trigger for invoice status changes, then change a status and read the audit log.', starter: `CREATE TABLE invoice_audit (\n  audit_id   INTEGER PRIMARY KEY,\n  invoice_id INTEGER,\n  old_status TEXT,\n  new_status TEXT,\n  changed_on TEXT DEFAULT (datetime('now'))\n);\n\nCREATE TRIGGER trg_invoice_status_audit\nAFTER UPDATE OF status ON invoices\nWHEN OLD.status IS NOT NEW.status\nBEGIN\n  INSERT INTO invoice_audit (invoice_id, old_status, new_status)\n  VALUES (NEW.invoice_id, OLD.status, NEW.status);\nEND;\n\nUPDATE invoices SET status = 'Paid' WHERE invoice_id IN (3, 9);\nSELECT invoice_id, old_status, new_status FROM invoice_audit;` },
    challenge: {
      level: 3,
      prompt: 'Check that the ledger matches what a payment trigger would have produced: for each Partially Paid invoice, show invoice_id, the sum of payments.amount, and the sum of PAYMENT transactions (as a positive number). Sort by invoice_id.',
      solution: `SELECT i.invoice_id,
       (SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id) AS paid_per_payments,
       (SELECT -SUM(t.amount) FROM transactions t
         WHERE t.invoice_id = i.invoice_id AND t.transaction_type = 'PAYMENT') AS paid_per_ledger
FROM invoices i
WHERE i.status = 'Partially Paid'
ORDER BY i.invoice_id;`,
      hints: ['Start from invoices WHERE status = \'Partially Paid\'.', 'Use a correlated subquery to sum payments for each invoice.', 'Use another correlated subquery for transactions with transaction_type = \'PAYMENT\'.', 'PAYMENT amounts are negative in the ledger: negate the sum with -SUM(t.amount).'],
      ordered: true,
    },
    quiz: [
      { q: 'In an AFTER UPDATE trigger, OLD.status is...', options: ['The new value', 'The value before the update', 'Always NULL', 'The default value'], answer: 1, why: 'OLD holds the row before the change, NEW after.' },
      { q: 'How does a SQLite trigger reject a change?', options: ['ROLLBACK TRIGGER', 'SELECT RAISE(ABORT, \'msg\')', 'RETURN FALSE', 'THROW'], answer: 1, why: 'RAISE(ABORT, ...) aborts the statement with an error.' },
    ],
  },
  {
    id: 'ddl-19',
    goals: ['What stored procedures are and why databases offer them', 'Write one in PostgreSQL (PL/pgSQL) and compare with MySQL, SQL Server and Oracle', 'Procedures vs functions vs triggers', 'Replacing procedures in SQLite with application code and views'],
    concept: `<p>A <b>stored procedure</b> is a named program stored in the database, called explicitly (<code>CALL</code>, <code>EXEC</code>). It can run many statements, use variables and branching, and manage transactions.</p>
<ul>
<li><b>Benefits</b>: one round trip for many steps, shared business logic for all apps, permission to run the procedure without direct table access.</li>
<li><b>Costs</b>: logic split between app and database, vendor-specific language, harder testing and version control.</li>
</ul>
<p>Every major server database has them, in different languages: PL/pgSQL (PostgreSQL), SQL/PSM (MySQL), T-SQL (SQL Server), PL/SQL (Oracle). <b>SQLite has none</b>: the application runs the steps inside a transaction.</p>
<p>Distinctions: a <b>function</b> returns a value and can be used in SELECT; a <b>procedure</b> performs an action and is called on its own; a <b>trigger</b> runs automatically on data changes.</p>`,
    why: 'Multi-step operations like "apply a payment and update the invoice" must be consistent across every application that performs them.',
    when: 'Atomic business operations, batch jobs close to the data, and APIs exposed to other teams with restricted permissions.',
    analogy: 'A stored procedure is the office\'s standard operating procedure binder: "To post a payment: 1) record the check, 2) write the ledger line, 3) update the invoice status." Anyone calls "post payment" and the steps are always done the same way.',
    syntax: `CREATE [OR REPLACE] PROCEDURE name(params)\nLANGUAGE plpgsql AS $$\nBEGIN\n  ...\nEND $$;\nCALL name(args);`,
    dialect: 'postgres',
    sql: `CREATE OR REPLACE PROCEDURE apply_payment(
  p_invoice_id int,
  p_amount     numeric,
  p_method     text,
  p_payor_id   int DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance numeric;
BEGIN
  INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)
  VALUES (p_invoice_id, p_payor_id, CURRENT_DATE, p_amount, p_method);

  INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)
  VALUES (p_invoice_id, CURRENT_DATE, 'PAYMENT', -p_amount, current_user);

  SELECT SUM(amount) INTO v_balance FROM transactions WHERE invoice_id = p_invoice_id;

  UPDATE invoices
  SET status = CASE WHEN v_balance <= 0 THEN 'Paid' ELSE 'Partially Paid' END
  WHERE invoice_id = p_invoice_id;

  IF v_balance < 0 THEN
    RAISE EXCEPTION 'Overpayment on invoice %: balance %', p_invoice_id, v_balance;
  END IF;
END $$;

CALL apply_payment(3, 60, 'EFT', 2);`,
    breakdown: [
      ['CREATE OR REPLACE PROCEDURE apply_payment(...)', 'Named, parameterized, stored in the database'],
      ['p_payor_id int DEFAULT NULL', 'Optional parameter (NULL = patient paid)'],
      ['DECLARE v_balance numeric', 'Local variable'],
      ['SELECT ... INTO v_balance', 'Store a query result in the variable'],
      ['RAISE EXCEPTION', 'Abort: the whole CALL (all three writes) rolls back'],
      ['CALL apply_payment(3, 60, \'EFT\', 2)', 'Invoke it'],
    ],
    dialectSql: {
      mysql: `DELIMITER //\nCREATE PROCEDURE apply_payment(IN p_invoice INT, IN p_amount DECIMAL(10,2))\nBEGIN\n  INSERT INTO payments (invoice_id, payment_date, amount, method) VALUES (p_invoice, CURDATE(), p_amount, 'EFT');\nEND //\nDELIMITER ;\nCALL apply_payment(3, 60);`,
      postgres: `CALL apply_payment(3, 60, 'EFT', 2);`,
      sqlserver: `CREATE PROCEDURE dbo.apply_payment @invoice_id int, @amount decimal(10,2) AS\nBEGIN SET NOCOUNT ON; INSERT INTO payments (...) VALUES (...); END;\nEXEC dbo.apply_payment @invoice_id = 3, @amount = 60;`,
      oracle: `CREATE OR REPLACE PROCEDURE apply_payment(p_invoice IN NUMBER, p_amount IN NUMBER) AS\nBEGIN INSERT INTO payments (...) VALUES (...); END;\n/\nBEGIN apply_payment(3, 60); END;`,
      sqlite: `-- no procedures: the app runs, in one transaction:\nBEGIN;\nINSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (3, 2, '2026-09-01', 60, 'EFT');\nINSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by) VALUES (3, '2026-09-01', 'PAYMENT', -60, 'app');\nCOMMIT;`,
    },
    mistakes: [
      { wrong: `-- Build SQL by string concatenation inside a procedure:\nEXECUTE 'SELECT * FROM invoices WHERE status = ''' || p_status || '''';`, why: 'Dynamic SQL built from parameters is open to SQL injection. Use parameters (EXECUTE ... USING) or static SQL.', fix: `SELECT invoice_id FROM invoices WHERE status = 'Overdue';` },
      { wrong: `-- Put all business logic, including UI rules, in 400 procedures`, why: 'The database becomes a hard-to-test, vendor-locked application server. Keep procedures for data-centric, atomic operations.', fix: `SELECT COUNT(*) FROM invoices;` },
    ],
    rules: ['Procedures act; functions return values; triggers react.', 'A failed procedure step should roll back all its work.', 'Never concatenate parameters into dynamic SQL.', 'Keep procedures in version control like application code.'],
    compare: `<table><tr><th></th><th>Procedure</th><th>Function</th><th>Trigger</th></tr>
<tr><td>Invoked by</td><td>CALL / EXEC</td><td>Inside SQL expressions</td><td>Data changes</td></tr>
<tr><td>Returns</td><td>Result sets / OUT params</td><td>A value or table</td><td>Nothing</td></tr>
<tr><td>Transaction control</td><td>Yes (PostgreSQL 11+, others)</td><td>No</td><td>No</td></tr></table>`,
    realWorld: 'Payment posting, month-end close and claim status batch updates are often procedures, so the clearinghouse interface, the web portal and staff screens all post payments through the same audited path.',
    tips: ['PostgreSQL functions existed long before procedures; procedures (11+) add COMMIT/ROLLBACK inside.', 'Use SECURITY DEFINER carefully: it runs with the owner\'s privileges.'],
    deep: `<p>Round trips matter: posting 10,000 lockbox payments as 3 statements each from an app across a network is 30,000 round trips; one procedure call per batch (or a set-based procedure that takes an array) reduces latency dramatically.</p>`,
    tryIt: { prompt: 'SQLite has no procedures, so run the procedure\'s steps yourself in one transaction. Then check the invoice balance and status.', starter: `BEGIN;\nINSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (3, 2, '2026-09-01', 60, 'EFT');\nINSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nVALUES (3, '2026-09-01', 'PAYMENT', -60, 'app');\nUPDATE invoices\nSET status = CASE WHEN (SELECT SUM(amount) FROM transactions WHERE invoice_id = 3) <= 0 THEN 'Paid' ELSE 'Partially Paid' END\nWHERE invoice_id = 3;\nCOMMIT;\n\nSELECT invoice_id, status, (SELECT SUM(amount) FROM transactions WHERE invoice_id = 3) AS balance\nFROM invoices WHERE invoice_id = 3;` },
    challenge: {
      level: 2,
      prompt: 'Write the read query a get_patient_statement(2) procedure would return: for patient 2, each invoice with invoice_id, invoice_date, status, total_amount, and ledger balance (sum of its transactions). Sort by invoice_date.',
      solution: `SELECT i.invoice_id, i.invoice_date, i.status, i.total_amount,
       SUM(t.amount) AS balance
FROM invoices i
JOIN transactions t ON t.invoice_id = i.invoice_id
WHERE i.patient_id = 2
GROUP BY i.invoice_id, i.invoice_date, i.status, i.total_amount
ORDER BY i.invoice_date;`,
      hints: ['Filter invoices to patient_id = 2 (the procedure parameter).', 'Join transactions to get the ledger lines.', 'GROUP BY the invoice columns and SUM(t.amount).', 'ORDER BY i.invoice_date'],
      ordered: true,
    },
    quiz: [
      { q: 'Which can be used inside a SELECT list?', options: ['Procedure', 'Function', 'Trigger', 'All'], answer: 1, why: 'Functions return values usable in expressions.' },
      { q: 'How does SQLite handle "procedure" logic?', options: ['CREATE PROCEDURE', 'The application runs the statements, usually in a transaction', 'PRAGMA procedure', 'Views only'], answer: 1, why: 'SQLite has no stored procedures.' },
    ],
  },
  {
    id: 'ddl-20',
    goals: ['What table partitioning is: one logical table, many physical pieces', 'Range, list and hash partitioning', 'Partition pruning and cheap data retention', 'Emulating partitions in SQLite with tables + UNION ALL view'],
    concept: `<p><b>Partitioning</b> splits one large table into smaller physical <b>partitions</b>, while queries still see a single table.</p>
<ul>
<li><b>Range</b>: by date ranges: <code>transactions_2025</code>, <code>transactions_2026</code>. The most common in billing.</li>
<li><b>List</b>: by discrete values: one partition per state or per payor type.</li>
<li><b>Hash</b>: spread rows evenly by a hash of a key (patient_id).</li>
</ul>
<p>Benefits:</p>
<ul>
<li><b>Partition pruning</b>: <code>WHERE transaction_date &gt;= '2026-01-01'</code> reads only the 2026 partition.</li>
<li><b>Retention</b>: dropping or detaching an old partition is instant, instead of a huge DELETE.</li>
<li>Maintenance (vacuum, index rebuilds) works on smaller pieces.</li>
</ul>
<p>Partitioning stays on <b>one server</b>; spreading data across servers is <i>sharding</i> (next lesson). SQLite has no partitioning, but you can emulate it with one table per range and a UNION ALL view.</p>`,
    why: 'Very large, time-based tables (ledgers, audit logs, claims history) become slow and hard to maintain as one piece.',
    when: 'Tables with hundreds of millions of rows, a natural time key, and queries or retention policies that work by period.',
    analogy: 'Instead of one giant filing cabinet for every claim since 2010, the office keeps one cabinet per year. Looking for 2026 claims? Open only the 2026 cabinet. Retention policy says destroy 2015? Roll that one cabinet out.',
    syntax: `CREATE TABLE t (...) PARTITION BY RANGE (date_col);\nCREATE TABLE t_2026 PARTITION OF t\n  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');`,
    dialect: 'postgres',
    sql: `CREATE TABLE transactions_p (
  transaction_id   bigint,
  invoice_id       int NOT NULL,
  transaction_date date NOT NULL,
  transaction_type text NOT NULL,
  amount           numeric(12,2) NOT NULL,
  PRIMARY KEY (transaction_id, transaction_date)
) PARTITION BY RANGE (transaction_date);

CREATE TABLE transactions_2025 PARTITION OF transactions_p
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE transactions_2026 PARTITION OF transactions_p
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Only transactions_2026 is scanned (partition pruning)
EXPLAIN SELECT SUM(amount) FROM transactions_p
WHERE transaction_date >= '2026-06-01';

-- Retention: remove a year instantly
ALTER TABLE transactions_p DETACH PARTITION transactions_2025;
DROP TABLE transactions_2025;`,
    breakdown: [
      ['PARTITION BY RANGE (transaction_date)', 'The parent is a logical table; rows go to partitions by date'],
      ['PRIMARY KEY (transaction_id, transaction_date)', 'Unique keys must include the partition key'],
      ['PARTITION OF ... FOR VALUES FROM ... TO ...', 'One partition per year (upper bound exclusive)'],
      ['WHERE transaction_date >= ...', 'The planner prunes partitions that cannot match'],
      ['DETACH PARTITION / DROP TABLE', 'Instant retention instead of deleting millions of rows'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 200" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<rect x="200" y="10" width="240" height="40" rx="8" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/>
<text x="320" y="35" text-anchor="middle" fill="var(--text)" font-weight="bold">transactions (logical table)</text>
<line x1="260" y1="50" x2="110" y2="95" stroke="var(--muted)"/><line x1="320" y1="50" x2="320" y2="95" stroke="var(--muted)"/><line x1="380" y1="50" x2="530" y2="95" stroke="var(--muted)"/>
<rect x="30" y="95" width="160" height="50" rx="6" fill="var(--panel2)" stroke="var(--border)" stroke-dasharray="5"/>
<text x="110" y="116" text-anchor="middle" fill="var(--muted)">transactions_2024</text><text x="110" y="134" text-anchor="middle" fill="var(--red)" font-size="11">detached / dropped</text>
<rect x="240" y="95" width="160" height="50" rx="6" fill="var(--panel2)" stroke="var(--border)"/>
<text x="320" y="116" text-anchor="middle" fill="var(--text)">transactions_2025</text><text x="320" y="134" text-anchor="middle" fill="var(--muted)" font-size="11">pruned (not read)</text>
<rect x="450" y="95" width="160" height="50" rx="6" fill="var(--panel2)" stroke="var(--green)" stroke-width="2"/>
<text x="530" y="116" text-anchor="middle" fill="var(--text)">transactions_2026</text><text x="530" y="134" text-anchor="middle" fill="var(--green)" font-size="11">scanned</text>
<text x="320" y="178" text-anchor="middle" fill="var(--text)">WHERE transaction_date &gt;= '2026-06-01'  &#8594;  reads only the 2026 partition</text>
<text x="320" y="196" text-anchor="middle" fill="var(--muted)" font-size="11">all partitions live on the same server (sharding spreads them across servers)</text>
</svg>` },
    dialectSql: {
      mysql: `CREATE TABLE transactions_p (...)\nPARTITION BY RANGE (YEAR(transaction_date)) (\n  PARTITION p2025 VALUES LESS THAN (2026),\n  PARTITION p2026 VALUES LESS THAN (2027)\n);`,
      postgres: `CREATE TABLE transactions_p (...) PARTITION BY RANGE (transaction_date);\nCREATE TABLE transactions_2026 PARTITION OF transactions_p FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');`,
      sqlserver: `CREATE PARTITION FUNCTION pf_year (date) AS RANGE RIGHT FOR VALUES ('2025-01-01','2026-01-01');\nCREATE PARTITION SCHEME ps_year AS PARTITION pf_year ALL TO ([PRIMARY]);\nCREATE TABLE transactions_p (...) ON ps_year(transaction_date);`,
      oracle: `CREATE TABLE transactions_p (...)\nPARTITION BY RANGE (transaction_date) INTERVAL (NUMTOYMINTERVAL(1,'YEAR'))\n(PARTITION p2025 VALUES LESS THAN (DATE '2026-01-01'));`,
      sqlite: `CREATE TABLE tx_2025 AS SELECT * FROM transactions WHERE transaction_date < '2026-01-01';\nCREATE TABLE tx_2026 AS SELECT * FROM transactions WHERE transaction_date >= '2026-01-01';\nCREATE VIEW tx_all AS SELECT * FROM tx_2025 UNION ALL SELECT * FROM tx_2026;`,
    },
    mistakes: [
      { wrong: `SELECT SUM(amount) FROM transactions_p WHERE EXTRACT(YEAR FROM transaction_date) = 2026;`, why: 'Wrapping the partition key in a function can prevent pruning, so every partition is scanned. Filter the raw column with a range.', fix: `SELECT SUM(amount) FROM transactions WHERE transaction_date >= '2026-01-01' AND transaction_date < '2027-01-01';` },
      { wrong: `-- Partition a 50,000-row table "for performance"`, why: 'Small tables gain nothing; partitioning adds planning overhead and key restrictions. Use it for very large tables with a clear partition key in most queries.', fix: `SELECT COUNT(*) FROM transactions;` },
    ],
    rules: ['Choose a partition key that most queries filter on (usually a date).', 'Filter on the raw key so pruning works.', 'Unique keys must include the partition key (PostgreSQL, MySQL).', 'Partitioning = one server; sharding = many.'],
    compare: `<table><tr><th>Type</th><th>Split by</th><th>Billing example</th></tr>
<tr><td>Range</td><td>Value ranges</td><td>transaction_date by year/month</td></tr>
<tr><td>List</td><td>Specific values</td><td>state: TX, CA, NY</td></tr>
<tr><td>Hash</td><td>Hash of key</td><td>patient_id into 8 buckets</td></tr></table>`,
    realWorld: 'Large health systems partition the charge and transaction ledgers by month; queries for the current period touch one partition, and records past the retention period are archived by detaching old partitions.',
    tips: ['Create future partitions ahead of time (or use Oracle INTERVAL / pg_partman).', 'A DEFAULT partition catches rows that fit nowhere else.'],
    deep: `<p>Indexes on a partitioned table are per partition (local). Global uniqueness across partitions is only guaranteed when the partition key is part of the unique key, because each partition can only check its own rows.</p>`,
    tryIt: { prompt: 'SQLite emulation: one table per year and a UNION ALL view. Query the view for 2026 only, then query tx_2026 directly and compare.', starter: `CREATE TABLE tx_2025 AS SELECT * FROM transactions WHERE transaction_date <  '2026-01-01';\nCREATE TABLE tx_2026 AS SELECT * FROM transactions WHERE transaction_date >= '2026-01-01';\nCREATE VIEW tx_all AS\n  SELECT * FROM tx_2025 UNION ALL SELECT * FROM tx_2026;\n\nSELECT 'tx_2025' AS partition, COUNT(*) FROM tx_2025\nUNION ALL SELECT 'tx_2026', COUNT(*) FROM tx_2026\nUNION ALL SELECT 'tx_all', COUNT(*) FROM tx_all;` },
    challenge: {
      level: 2,
      prompt: 'Plan yearly range partitions for transactions: show each year (from transaction_date), the number of rows that would land in that partition, and the net amount. Sort by year.',
      solution: `SELECT strftime('%Y', transaction_date) AS partition_year,
       COUNT(*) AS row_count,
       SUM(amount) AS net_amount
FROM transactions
GROUP BY partition_year
ORDER BY partition_year;`,
      hints: ['The partition key is transaction_date.', 'strftime(\'%Y\', transaction_date) gives the year.', 'GROUP BY the year with COUNT(*) and SUM(amount).', 'ORDER BY partition_year'],
      ordered: true,
    },
    quiz: [
      { q: 'What is partition pruning?', options: ['Deleting old partitions', 'Skipping partitions that cannot contain matching rows', 'Compressing partitions', 'Merging partitions'], answer: 1, why: 'The planner reads only relevant partitions.' },
      { q: 'Which partitioning type fits a ledger queried by month?', options: ['Hash', 'List', 'Range', 'None'], answer: 2, why: 'Date ranges match how the data is queried and retained.' },
    ],
  },
  {
    id: 'ddl-21',
    goals: ['What sharding is: splitting data across several database servers', 'Choosing a shard key (patient_id, clinic, region)', 'Hash vs range vs directory-based sharding', 'The costs: cross-shard queries, joins, transactions and rebalancing'],
    concept: `<p><b>Sharding</b> splits the rows of a table across <b>several independent database servers</b> (shards). Each shard holds a subset, for example patients 1, 4, 7... on shard 1, patients 2, 5, 8... on shard 2.</p>
<ul>
<li><b>Shard key</b>: the column that decides where a row lives. A good key spreads load evenly and keeps related data together (a patient's invoices, charges and payments on the same shard).</li>
<li><b>Hash sharding</b>: <code>shard = hash(patient_id) % N</code>: even spread, but range queries hit all shards.</li>
<li><b>Range sharding</b>: patient_id 1-1M on shard 1, and so on: simple, but new rows can pile onto one "hot" shard.</li>
<li><b>Directory</b>: a lookup table maps each tenant/clinic to a shard: flexible for multi-tenant systems.</li>
</ul>
<p>Costs: queries without the shard key must ask <b>every</b> shard (scatter-gather), cross-shard joins and transactions are hard, and adding shards means moving data. Shard only when one server (with replicas and partitioning) is truly not enough.</p>`,
    why: 'A single server has limits on storage, writes and memory; sharding scales writes and data size horizontally.',
    when: 'Very large multi-tenant or high-write systems: national claims processors, SaaS billing platforms serving thousands of clinics.',
    analogy: 'One billing office can only handle so many claims. A national company opens regional offices and routes each patient\'s file to one office by a rule (say, the last digit of the MRN). A question about one patient goes to one office; "total revenue for the whole company" means calling every office and adding up.',
    syntax: `-- conceptual routing\nshard_no = hash(shard_key) % shard_count\n-- Citus (PostgreSQL)\nSELECT create_distributed_table('invoices', 'patient_id');`,
    dialect: 'postgres',
    sql: `-- Citus (distributed PostgreSQL): shard by patient_id and co-locate related tables
SELECT create_distributed_table('patients',     'patient_id');
SELECT create_distributed_table('invoices',     'patient_id', colocate_with => 'patients');
SELECT create_reference_table('payors');           -- small table copied to every shard

-- Routed to ONE shard (filter on the shard key)
SELECT i.invoice_id, i.total_amount
FROM invoices i
WHERE i.patient_id = 5;

-- Scatter-gather: every shard computes a partial sum, the coordinator adds them
SELECT payor_id, SUM(total_amount) FROM invoices GROUP BY payor_id;`,
    breakdown: [
      ['create_distributed_table(\'patients\', \'patient_id\')', 'Splits patients into shards by hash of patient_id'],
      ['colocate_with => \'patients\'', 'A patient\'s invoices live on the same shard as the patient: local joins'],
      ['create_reference_table(\'payors\')', 'Small lookup table replicated to all shards'],
      ['WHERE i.patient_id = 5', 'Single-shard query: fast and scalable'],
      ['GROUP BY payor_id (no shard key)', 'Runs on all shards, then merged'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 230" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<rect x="220" y="10" width="200" height="40" rx="8" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/>
<text x="320" y="28" text-anchor="middle" fill="var(--text)" font-weight="bold">Router / coordinator</text>
<text x="320" y="43" text-anchor="middle" fill="var(--muted)" font-size="11">shard = patient_id % 3</text>
<line x1="260" y1="50" x2="110" y2="95" stroke="var(--muted)"/><line x1="320" y1="50" x2="320" y2="95" stroke="var(--muted)"/><line x1="380" y1="50" x2="530" y2="95" stroke="var(--muted)"/>
<g>
<rect x="30" y="95" width="160" height="80" rx="8" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="110" y="115" text-anchor="middle" fill="var(--text)" font-weight="bold">Server A (shard 0)</text>
<text x="110" y="135" text-anchor="middle" fill="var(--muted)" font-size="11">patients 3, 6, 9, ...</text>
<text x="110" y="152" text-anchor="middle" fill="var(--muted)" font-size="11">+ their invoices, charges</text>
<rect x="240" y="95" width="160" height="80" rx="8" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="320" y="115" text-anchor="middle" fill="var(--text)" font-weight="bold">Server B (shard 1)</text>
<text x="320" y="135" text-anchor="middle" fill="var(--muted)" font-size="11">patients 1, 4, 7, ...</text>
<text x="320" y="152" text-anchor="middle" fill="var(--muted)" font-size="11">+ their invoices, charges</text>
<rect x="450" y="95" width="160" height="80" rx="8" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="530" y="115" text-anchor="middle" fill="var(--text)" font-weight="bold">Server C (shard 2)</text>
<text x="530" y="135" text-anchor="middle" fill="var(--muted)" font-size="11">patients 2, 5, 8, ...</text>
<text x="530" y="152" text-anchor="middle" fill="var(--muted)" font-size="11">+ their invoices, charges</text>
</g>
<text x="320" y="200" text-anchor="middle" fill="var(--green)">WHERE patient_id = 5  &#8594;  one shard (C)</text>
<text x="320" y="220" text-anchor="middle" fill="var(--yellow)">SUM over all patients  &#8594;  all shards, then merge</text>
</svg>` },
    mistakes: [
      { wrong: `-- Shard invoices by invoice_id and patients by patient_id`, why: 'A patient and their invoices land on different servers, so every patient statement becomes a cross-shard join. Shard related tables by the same key and co-locate them.', fix: `SELECT patient_id % 3 AS shard, COUNT(*) AS invoices FROM invoices GROUP BY shard ORDER BY shard;` },
      { wrong: `-- Shard by invoice_date (month)`, why: 'All new writes go to the current month\'s shard (a hot spot), while old shards sit idle. Time is a good partition key, but usually a poor shard key.', fix: `SELECT strftime('%Y-%m', invoice_date) AS month, COUNT(*) FROM invoices GROUP BY month ORDER BY month DESC LIMIT 3;` },
    ],
    rules: ['Shard only when one server is not enough.', 'Pick a shard key present in most queries, with even distribution.', 'Co-locate related tables on the same key; replicate small lookup tables.', 'Expect scatter-gather for queries without the shard key.'],
    compare: `<table><tr><th></th><th>Partitioning</th><th>Sharding</th><th>Read replicas</th></tr>
<tr><td>Servers</td><td>One</td><td>Many</td><td>Many (copies)</td></tr>
<tr><td>Scales</td><td>Maintenance, pruning</td><td>Writes and size</td><td>Reads</td></tr>
<tr><td>Each server has</td><td>All data</td><td>A subset</td><td>All data</td></tr>
<tr><td>Cross-piece joins</td><td>Easy</td><td>Hard</td><td>n/a</td></tr></table>`,
    realWorld: 'Multi-tenant SaaS billing platforms shard by clinic (tenant): each clinic\'s patients, claims and payments live on one shard, reference tables like CPT codes and payors are replicated everywhere, and company-wide analytics run in a separate data warehouse.',
    tips: ['Use many small logical shards mapped to fewer servers, so rebalancing moves whole shards.', 'Keep global unique ids (UUIDv7, snowflake ids) so rows can move between shards.'],
    deep: `<p>Distributed transactions across shards need two-phase commit, which adds latency and failure modes. Most sharded designs avoid them by keeping each business transaction within one shard (the reason to choose patient or tenant as the shard key).</p>`,
    tryIt: { prompt: 'Simulate hash sharding with patient_id % 3: see how patients and invoices spread. Try % 4 and compare the balance.', starter: `SELECT p.patient_id % 3 AS shard,\n       COUNT(DISTINCT p.patient_id) AS patients,\n       COUNT(i.invoice_id)          AS invoices,\n       IFNULL(SUM(i.total_amount), 0) AS billed\nFROM patients p\nLEFT JOIN invoices i ON i.patient_id = p.patient_id\nGROUP BY shard\nORDER BY shard;` },
    challenge: {
      level: 3,
      prompt: 'Evaluate patient_id as a shard key with 3 shards (shard = patient_id % 3): for each shard show the number of patients, invoices and charges it would hold. Keep patients without invoices. Sort by shard.',
      solution: `SELECT p.patient_id % 3 AS shard,
       COUNT(DISTINCT p.patient_id) AS patients,
       COUNT(DISTINCT i.invoice_id) AS invoices,
       COUNT(c.charge_id) AS charges
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
LEFT JOIN charges c ON c.invoice_id = i.invoice_id
GROUP BY shard
ORDER BY shard;`,
      hints: ['The shard number is p.patient_id % 3.', 'LEFT JOIN invoices and then charges so patients without invoices stay.', 'Joins multiply rows: use COUNT(DISTINCT ...) for patients and invoices.', 'COUNT(c.charge_id) counts charges; GROUP BY shard ORDER BY shard'],
      ordered: true,
    },
    quiz: [
      { q: 'What is the main difference between partitioning and sharding?', options: ['None', 'Sharding spreads data across multiple servers', 'Partitioning needs more servers', 'Sharding only works for dates'], answer: 1, why: 'Partitions live on one server; shards are separate servers.' },
      { q: 'Which is usually the best shard key for a patient billing system?', options: ['invoice_date', 'status', 'patient_id (or clinic/tenant id)', 'amount'], answer: 2, why: 'It keeps a patient\'s related rows together and spreads load.' },
      { q: 'A query without the shard key in WHERE...', options: ['Fails', 'Hits every shard (scatter-gather)', 'Hits the first shard only', 'Is always faster'], answer: 1, why: 'The router cannot know which shard holds the rows.' },
    ],
  },
  {
    id: 'ddl-22',
    goals: ['How databases generate key values: INTEGER PRIMARY KEY, AUTOINCREMENT, IDENTITY and SEQUENCE', 'Why SQLite may reuse a deleted id without AUTOINCREMENT, and never with it', 'When to use UUIDs instead of counters', 'Surrogate keys vs natural keys (NPI, CPT code, claim number)'],
    concept: `<p>Most tables need a key value that the database <b>generates</b> for you, so the app never has to invent one. Each database spells it differently:</p>
<ul>
<li><b>SQLite</b>: a column declared <code>INTEGER PRIMARY KEY</code> becomes the table's <b>rowid</b>. Leave it out of an INSERT and SQLite picks <i>max(id) + 1</i>. Add <code>AUTOINCREMENT</code> and SQLite also remembers the highest id it ever issued (in <code>sqlite_sequence</code>), so a deleted id is <b>never reused</b>.</li>
<li><b>SQL standard / PostgreSQL / Oracle / SQL Server</b>: <code>GENERATED ALWAYS AS IDENTITY</code> or <code>IDENTITY(1,1)</code> on the column.</li>
<li><b>MySQL</b>: <code>AUTO_INCREMENT</code>.</li>
<li><b>SEQUENCE</b>: a separate, named counter object (<code>CREATE SEQUENCE claim_no_seq</code>). Many tables or apps can draw numbers from it with <code>nextval()</code> / <code>NEXT VALUE FOR</code>.</li>
<li><b>UUID</b>: a 128-bit random (or time-ordered) value such as <code>3f2a...c9</code>. Anyone can create one without asking the database, so ids stay unique across servers, offline apps and merged systems.</li>
</ul>
<p>A generated id is a <b>surrogate key</b>: it has no business meaning. A <b>natural key</b> is a real-world identifier such as a practitioner's NPI or a payor's name. A common design uses both: a surrogate primary key for joins, plus a UNIQUE constraint on the natural key so duplicates are still rejected.</p>`,
    why: 'Every new invoice, claim and payment needs a unique identifier the moment it is created, even when many users insert at the same time.',
    when: 'On almost every table. Use a counter (IDENTITY/rowid) by default, a SEQUENCE when numbers are shared or need custom format, and a UUID when rows are created on several servers or devices.',
    analogy: 'The front desk stamps each new patient chart with the next number from a numbering machine (IDENTITY). If a chart is shredded, a careful office never re-stamps that number on a new chart (AUTOINCREMENT), because old paperwork may still mention it. A UUID is like a barcode sticker from a roll that every clinic in the country shares: no two stickers are ever alike, so no clinic has to phone head office for the next number.',
    syntax: `-- SQLite\ncol INTEGER PRIMARY KEY [AUTOINCREMENT]\n-- Standard / PostgreSQL / Oracle 12c+\ncol BIGINT GENERATED { ALWAYS | BY DEFAULT } AS IDENTITY\n-- SQL Server: col INT IDENTITY(1,1)   MySQL: col INT AUTO_INCREMENT\nCREATE SEQUENCE seq_name START WITH 1000 INCREMENT BY 1;`,
    sql: `CREATE TABLE claim_batches (
  batch_id   INTEGER PRIMARY KEY AUTOINCREMENT,                          -- surrogate key
  batch_uuid TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))), -- globally unique
  payor_id   INTEGER NOT NULL REFERENCES payors(payor_id),
  created_on TEXT NOT NULL DEFAULT '2026-09-01'
);

INSERT INTO claim_batches (payor_id) VALUES (1), (2), (3);   -- ids 1, 2, 3
DELETE FROM claim_batches WHERE batch_id = 3;               -- remove the newest
INSERT INTO claim_batches (payor_id) VALUES (4);            -- gets 4, not 3

SELECT batch_id, payor_id, length(batch_uuid) AS uuid_hex_chars,
       (SELECT seq FROM sqlite_sequence WHERE name = 'claim_batches') AS highest_ever
FROM claim_batches
ORDER BY batch_id;`,
    breakdown: [
      ['batch_id INTEGER PRIMARY KEY AUTOINCREMENT', 'Alias for the rowid; SQLite fills it in. AUTOINCREMENT forbids reusing ids'],
      ['DEFAULT (lower(hex(randomblob(16))))', '16 random bytes as 32 hex characters: a UUID-style value made without a counter'],
      ['UNIQUE', 'Guarantees no two batches share the same uuid'],
      ['INSERT ... (payor_id) VALUES (1), (2), (3)', 'No batch_id given, so the database generates 1, 2, 3'],
      ['DELETE ... batch_id = 3, then INSERT', 'With AUTOINCREMENT the next id is 4; without it SQLite would hand out 3 again'],
      ['sqlite_sequence', 'Internal table where SQLite stores the highest id issued for each AUTOINCREMENT table'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 220" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="160" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">INTEGER PRIMARY KEY</text>
<text x="480" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">INTEGER PRIMARY KEY AUTOINCREMENT</text>
<g font-size="11">
<rect x="40" y="35" width="70" height="28" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="75" y="54" text-anchor="middle" fill="var(--text)">id 1</text>
<rect x="125" y="35" width="70" height="28" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="160" y="54" text-anchor="middle" fill="var(--text)">id 2</text>
<rect x="210" y="35" width="70" height="28" rx="5" fill="var(--panel2)" stroke="var(--red)" stroke-dasharray="4"/><text x="245" y="54" text-anchor="middle" fill="var(--red)">id 3 deleted</text>
<rect x="360" y="35" width="70" height="28" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="395" y="54" text-anchor="middle" fill="var(--text)">id 1</text>
<rect x="445" y="35" width="70" height="28" rx="5" fill="var(--panel2)" stroke="var(--border)"/><text x="480" y="54" text-anchor="middle" fill="var(--text)">id 2</text>
<rect x="530" y="35" width="70" height="28" rx="5" fill="var(--panel2)" stroke="var(--red)" stroke-dasharray="4"/><text x="565" y="54" text-anchor="middle" fill="var(--red)">id 3 deleted</text>
</g>
<text x="160" y="95" text-anchor="middle" fill="var(--muted)">next id = max(id) + 1 = 3</text>
<text x="480" y="95" text-anchor="middle" fill="var(--muted)">next id = sqlite_sequence.seq + 1 = 4</text>
<rect x="110" y="110" width="100" height="32" rx="6" fill="var(--panel2)" stroke="var(--yellow)" stroke-width="2"/><text x="160" y="131" text-anchor="middle" fill="var(--yellow)">new row: id 3</text>
<rect x="430" y="110" width="100" height="32" rx="6" fill="var(--panel2)" stroke="var(--green)" stroke-width="2"/><text x="480" y="131" text-anchor="middle" fill="var(--green)">new row: id 4</text>
<text x="160" y="168" text-anchor="middle" fill="var(--yellow)" font-size="11">an old remittance that mentions batch 3</text>
<text x="160" y="184" text-anchor="middle" fill="var(--yellow)" font-size="11">now points at the wrong batch</text>
<text x="480" y="168" text-anchor="middle" fill="var(--green)" font-size="11">ids are never reused</text>
<text x="480" y="184" text-anchor="middle" fill="var(--muted)" font-size="11">(tiny cost: one extra table write)</text>
<text x="320" y="212" text-anchor="middle" fill="var(--muted)" font-size="11">Both are fine for most tables. Gaps are normal in every database and are not a bug.</text>
</svg>` },
    internals: `<p>In SQLite every ordinary table is a B-tree keyed by a 64-bit <b>rowid</b>. <code>INTEGER PRIMARY KEY</code> (exactly that spelling) makes your column an alias for it, so lookups by id are the fastest possible. Without AUTOINCREMENT, a new row gets <i>largest rowid + 1</i>. With AUTOINCREMENT, SQLite reads and updates a row in the hidden <code>sqlite_sequence</code> table on each insert.</p>
<p>Server databases hand out identity and sequence values from an in-memory counter <b>outside the transaction</b>: a rolled-back insert still "uses up" its number, and sequences often cache 20-50 values per session. That is why gaps appear and why ids are never guaranteed to be consecutive.</p>
<p>Random UUIDs (version 4) scatter inserts all over a B-tree index, which causes page splits and cache misses on big tables. Time-ordered UUIDs (<b>version 7</b>) start with a timestamp, so new values land at the end of the index like a counter.</p>`,
    mistakes: [
      { wrong: `-- Compute the next id yourself\nINSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)\nVALUES ((SELECT MAX(payor_id) + 1 FROM payors), 'Humana Gold', 'Medicare', 0.7);`, why: 'Two sessions can read the same MAX at the same time and try to insert the same id. Let the database generate it by leaving the key column out.', fix: `INSERT INTO payors (payor_name, payor_type, contract_rate)\nVALUES ('Humana Gold', 'Medicare', 0.7);\nSELECT payor_id, payor_name FROM payors ORDER BY payor_id DESC LIMIT 1;` },
      { wrong: `CREATE TABLE claim_batches (batch_id INT PRIMARY KEY, payor_id INTEGER);`, why: 'In SQLite only the exact type name INTEGER makes the column a rowid alias. INT PRIMARY KEY is an ordinary column: nothing is generated, so it stays NULL when you leave it out.', fix: `CREATE TABLE claim_batches (batch_id INTEGER PRIMARY KEY, payor_id INTEGER);\nINSERT INTO claim_batches (payor_id) VALUES (1);\nSELECT * FROM claim_batches;` },
      { wrong: `-- Use only a surrogate key\nCREATE TABLE cpt_codes (cpt_id INTEGER PRIMARY KEY, cpt_code TEXT);`, why: 'Nothing stops "99214" from being entered twice with two different ids. Keep the generated key, but also put UNIQUE (and NOT NULL) on the natural key.', fix: `CREATE TABLE cpt_codes (cpt_id INTEGER PRIMARY KEY, cpt_code TEXT NOT NULL UNIQUE);` },
    ],
    rules: ['Let the database generate ids: never use MAX(id) + 1.', 'Expect gaps; never use ids to count rows or to prove nothing was deleted.', 'Surrogate key for joins + UNIQUE on the natural key.', 'Use UUIDs (preferably time-ordered v7) when ids are created on many servers or devices.', 'Never show internal ids as business numbers that must be gap-free (such as legal invoice numbers).'],
    compare: `<table><tr><th>Option</th><th>Where</th><th>Pros</th><th>Cons</th></tr>
<tr><td>INTEGER PRIMARY KEY</td><td>SQLite</td><td>Fastest, no extra storage</td><td>Can reuse the highest deleted id</td></tr>
<tr><td>AUTOINCREMENT</td><td>SQLite</td><td>Never reuses ids</td><td>Small extra write per insert</td></tr>
<tr><td>IDENTITY / AUTO_INCREMENT</td><td>PostgreSQL, SQL Server, Oracle, MySQL</td><td>Simple, tied to one column</td><td>One counter per table</td></tr>
<tr><td>SEQUENCE</td><td>PostgreSQL, Oracle, SQL Server</td><td>Shared across tables, get the number before inserting</td><td>A separate object to manage</td></tr>
<tr><td>UUID</td><td>All (native type in PostgreSQL / SQL Server)</td><td>Unique everywhere, no coordination</td><td>16 bytes, random v4 slows big indexes</td></tr>
<tr><td>Natural key</td><td>All</td><td>Meaningful, no extra column</td><td>Can change (a name) or be missing (NULL npi)</td></tr></table>`,
    realWorld: 'Billing systems use an IDENTITY claim_id internally, a SEQUENCE to print human-readable claim numbers such as CLM-2026-000123, and UUIDs for rows created by the mobile check-in app while offline. The payor\'s own claim control number is stored as a natural key with a UNIQUE constraint.',
    tips: ['After an INSERT, get the new id with last_insert_rowid() in SQLite, RETURNING in PostgreSQL/SQLite, SCOPE_IDENTITY() or OUTPUT in SQL Server, LAST_INSERT_ID() in MySQL.', 'Prefer GENERATED ALWAYS in PostgreSQL: it stops accidental manual ids that would later collide with the counter.', 'Use BIGINT for busy tables; a 32-bit INT runs out at about 2.1 billion.'],
    deep: `<p>Legal documents (invoices in some countries, check numbers) sometimes must be <b>gap-free</b>. Identity and sequences cannot promise that, because numbers are handed out outside the transaction. The usual design is a small counter table updated inside the same transaction (<code>UPDATE counters SET next_no = next_no + 1 WHERE name = 'invoice' RETURNING next_no</code>), which serializes invoice creation but never skips a number.</p>
<p>In PostgreSQL, if you load rows with explicit ids into an IDENTITY BY DEFAULT column, the counter does not move: run <code>SELECT setval(pg_get_serial_sequence('invoices','invoice_id'), MAX(invoice_id)) FROM invoices</code> afterwards or the next insert fails with a duplicate key.</p>`,
    dialectSql: {
      postgres: `CREATE TABLE claim_batches (\n  batch_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  batch_uuid uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,\n  payor_id   int NOT NULL REFERENCES payors\n);\nCREATE SEQUENCE claim_no_seq START 1000;\nSELECT nextval('claim_no_seq');\nINSERT INTO claim_batches (payor_id) VALUES (1) RETURNING batch_id, batch_uuid;`,
      mysql: `CREATE TABLE claim_batches (\n  batch_id   BIGINT AUTO_INCREMENT PRIMARY KEY,\n  batch_uuid BINARY(16) NOT NULL DEFAULT (UUID_TO_BIN(UUID(), 1)) UNIQUE,\n  payor_id   INT NOT NULL\n);\nINSERT INTO claim_batches (payor_id) VALUES (1);\nSELECT LAST_INSERT_ID();`,
      sqlserver: `CREATE TABLE claim_batches (\n  batch_id   bigint IDENTITY(1,1) PRIMARY KEY,\n  batch_uuid uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID() UNIQUE,\n  payor_id   int NOT NULL\n);\nCREATE SEQUENCE claim_no_seq START WITH 1000;\nSELECT NEXT VALUE FOR claim_no_seq;\nINSERT INTO claim_batches (payor_id) OUTPUT inserted.batch_id VALUES (1);`,
      oracle: `CREATE TABLE claim_batches (\n  batch_id   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  batch_uuid RAW(16) DEFAULT SYS_GUID() NOT NULL UNIQUE,\n  payor_id   NUMBER NOT NULL\n);\nCREATE SEQUENCE claim_no_seq START WITH 1000;\nSELECT claim_no_seq.NEXTVAL FROM dual;`,
      sqlite: `CREATE TABLE claim_batches (\n  batch_id   INTEGER PRIMARY KEY AUTOINCREMENT,\n  batch_uuid TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),\n  payor_id   INTEGER NOT NULL\n);\nINSERT INTO claim_batches (payor_id) VALUES (1) RETURNING batch_id, batch_uuid;`,
    },
    tryIt: { prompt: 'Remove AUTOINCREMENT from the table definition and run again: which id does the last batch get now? Then try RETURNING batch_id on the last INSERT.', starter: `CREATE TABLE claim_batches (\n  batch_id INTEGER PRIMARY KEY AUTOINCREMENT,\n  payor_id INTEGER NOT NULL\n);\nINSERT INTO claim_batches (payor_id) VALUES (1), (2), (3);\nDELETE FROM claim_batches WHERE batch_id = 3;\nINSERT INTO claim_batches (payor_id) VALUES (4);\n\nSELECT batch_id, payor_id FROM claim_batches ORDER BY batch_id;` },
    challenge: {
      mode: 'state', level: 2,
      prompt: 'Create a table payor_contracts with: contract_id as an INTEGER PRIMARY KEY that never reuses ids (AUTOINCREMENT); contract_code TEXT NOT NULL that is a UNIQUE natural key; and payor_id INTEGER NOT NULL. Define the columns in that order.',
      solution: `CREATE TABLE payor_contracts (
  contract_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_code TEXT NOT NULL UNIQUE,
  payor_id      INTEGER NOT NULL
);`,
      check: `SELECT p.name, upper(p.type) AS type, p."notnull", p.pk,
       (SELECT COUNT(*) FROM pragma_index_list('payor_contracts') WHERE "unique" = 1) AS unique_indexes,
       (SELECT instr(upper(sql), 'AUTOINCREMENT') > 0 FROM sqlite_master WHERE name = 'payor_contracts') AS uses_autoincrement
FROM pragma_table_info('payor_contracts') p
ORDER BY p.cid`,
      hints: ['Start with CREATE TABLE payor_contracts ( ... ); and list three columns.', 'The key column must be spelled exactly INTEGER PRIMARY KEY to become the rowid.', 'Add AUTOINCREMENT after PRIMARY KEY so deleted ids are never reused.', 'contract_code TEXT NOT NULL UNIQUE, then payor_id INTEGER NOT NULL.'],
    },
    quiz: [
      { q: 'A SQLite table has id INTEGER PRIMARY KEY (no AUTOINCREMENT) with ids 1, 2, 3. You delete id 3 and insert a row. Which id does it get?', options: ['4', '3', 'NULL', 'An error'], answer: 1, why: 'Without AUTOINCREMENT the new rowid is max(rowid) + 1 = 2 + 1 = 3.' },
      { q: 'Why do identity columns and sequences have gaps?', options: ['A bug in the database', 'Numbers are handed out outside the transaction, so rollbacks and caching skip values', 'Deleted rows are renumbered', 'Only in SQLite'], answer: 1, why: 'A rolled-back insert still used its number, and cached values can be lost on restart.' },
      { q: 'When is a UUID the better key?', options: ['Always', 'When rows are created on many servers or offline devices that cannot share one counter', 'When the table is tiny', 'When you need gap-free numbers'], answer: 1, why: 'UUIDs need no coordination; counters are smaller and faster when there is one database.' },
    ],
  },
  {
    id: 'ddl-23',
    goals: ['What a generated (computed) column is', 'VIRTUAL vs STORED generated columns', 'Adding a generated column with ALTER TABLE in SQLite (VIRTUAL only)', 'Indexing a generated column for fast lookups'],
    concept: `<p>A <b>generated column</b> gets its value from an expression over other columns of the same row. You never insert or update it: the database computes it for you, so it can never be out of date.</p>
<pre>line_total REAL GENERATED ALWAYS AS (units * unit_price) VIRTUAL</pre>
<ul>
<li><b>VIRTUAL</b>: computed every time the row is read. Takes no disk space. The default in SQLite and MySQL.</li>
<li><b>STORED</b>: computed when the row is inserted or updated and saved on disk. Reads are cheaper, writes and storage cost more. PostgreSQL (before version 18) only supports STORED.</li>
</ul>
<p>Rules in SQLite: the expression can only use columns of the same row and <b>deterministic</b> functions (no subqueries, no <code>date('now')</code>, no <code>random()</code>). <code>ALTER TABLE ... ADD COLUMN</code> can add only VIRTUAL columns; a STORED column must be defined in CREATE TABLE. <code>SELECT *</code> returns generated columns like any other, but <code>pragma_table_info</code> hides them (use <code>pragma_table_xinfo</code>).</p>`,
    why: 'Derived values such as line totals, age buckets or patient full names are needed everywhere. Computing them once in the schema removes copy-pasted formulas and stale copies.',
    when: 'When a value is always a pure formula of other columns in the same row, and many queries need it, filter on it or want to index it.',
    analogy: 'On a paper superbill the "line total" box is pre-printed as "units x price": nobody writes the total by hand, so it can never disagree with the units and price on the same line. VIRTUAL means you do the multiplication each time you read the form; STORED means the total is printed on the form once and reprinted only when units or price change.',
    syntax: `col_name type GENERATED ALWAYS AS (expression) [VIRTUAL | STORED]\n-- short form: col_name type AS (expression)\nALTER TABLE t ADD COLUMN col type GENERATED ALWAYS AS (expr) VIRTUAL;`,
    sql: `-- 1) Add a VIRTUAL computed column to an existing table
ALTER TABLE charges ADD COLUMN line_total REAL
  GENERATED ALWAYS AS (units * unit_price) VIRTUAL;

-- 2) A STORED column must be declared in CREATE TABLE
CREATE TABLE patient_cards (
  patient_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  full_name  TEXT GENERATED ALWAYS AS (last_name || ', ' || first_name) STORED
);
INSERT INTO patient_cards (patient_id, first_name, last_name)
SELECT patient_id, first_name, last_name FROM patients WHERE patient_id <= 3;

-- 3) Use it like any column (and index it)
CREATE INDEX idx_charges_line_total ON charges(line_total);

SELECT c.charge_id, c.units, c.unit_price, c.line_total, pc.full_name
FROM charges c
JOIN invoices i ON i.invoice_id = c.invoice_id
JOIN patient_cards pc ON pc.patient_id = i.patient_id
ORDER BY c.line_total DESC;`,
    breakdown: [
      ['ALTER TABLE charges ADD COLUMN line_total REAL', 'A new column on an existing table'],
      ['GENERATED ALWAYS AS (units * unit_price)', 'The formula; it can only use columns from the same row'],
      ['VIRTUAL', 'Computed on read, nothing stored. The only kind ALTER TABLE can add in SQLite'],
      ['full_name ... STORED', 'Computed on write and saved in the row; declared in CREATE TABLE'],
      ['INSERT ... (patient_id, first_name, last_name)', 'You never supply a generated column; writing to it is an error'],
      ['CREATE INDEX ... ON charges(line_total)', 'Generated columns (even VIRTUAL ones) can be indexed'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 210" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="160" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">VIRTUAL</text>
<text x="480" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">STORED</text>
<rect x="30" y="32" width="260" height="34" rx="6" fill="var(--panel2)" stroke="var(--border)"/>
<text x="42" y="54" fill="var(--text)">on disk: units=2 | unit_price=50</text>
<rect x="350" y="32" width="260" height="34" rx="6" fill="var(--panel2)" stroke="var(--border)"/>
<text x="362" y="54" fill="var(--text)">on disk: units=2 | unit_price=50 | </text><text x="560" y="54" fill="var(--green)" font-weight="bold">100</text>
<line x1="160" y1="66" x2="160" y2="100" stroke="var(--accent)" stroke-width="2"/><polygon points="154,96 166,96 160,106" fill="var(--accent)"/>
<line x1="480" y1="66" x2="480" y2="100" stroke="var(--accent)" stroke-width="2"/><polygon points="474,96 486,96 480,106" fill="var(--accent)"/>
<rect x="60" y="108" width="200" height="34" rx="6" fill="var(--panel2)" stroke="var(--yellow)" stroke-width="2"/>
<text x="160" y="130" text-anchor="middle" fill="var(--text)">SELECT computes 2 x 50 = 100</text>
<rect x="380" y="108" width="200" height="34" rx="6" fill="var(--panel2)" stroke="var(--green)" stroke-width="2"/>
<text x="480" y="130" text-anchor="middle" fill="var(--text)">SELECT just reads 100</text>
<text x="160" y="168" text-anchor="middle" fill="var(--muted)" font-size="11">no storage, cheap writes</text>
<text x="160" y="184" text-anchor="middle" fill="var(--muted)" font-size="11">work done on every read</text>
<text x="480" y="168" text-anchor="middle" fill="var(--muted)" font-size="11">uses disk, recomputed on INSERT/UPDATE</text>
<text x="480" y="184" text-anchor="middle" fill="var(--muted)" font-size="11">cheap reads</text>
<text x="320" y="204" text-anchor="middle" fill="var(--muted)" font-size="11">Either way, the value always matches units x unit_price.</text>
</svg>` },
    internals: `<p>SQLite records generated columns in the table schema with a hidden flag (<code>hidden</code> = 2 for VIRTUAL, 3 for STORED in <code>pragma_table_xinfo</code>). For a VIRTUAL column, the expression is compiled into every query that reads the column, just as if you had typed <code>units * unit_price</code>. For a STORED column, the value is evaluated during INSERT and UPDATE and written into the record like a normal column.</p>
<p>An index on a generated column stores the computed value in the index B-tree, so the planner can SEARCH on it even when the column itself is VIRTUAL. This is essentially the same as an <b>expression index</b> on <code>(units * unit_price)</code>, but queries only need to name the column.</p>`,
    mistakes: [
      { wrong: `ALTER TABLE charges ADD COLUMN line_total REAL\n  GENERATED ALWAYS AS (units * unit_price) STORED;`, why: 'SQLite cannot add a STORED column to an existing table (it would need to rewrite every row). Add it as VIRTUAL, or rebuild the table.', fix: `ALTER TABLE charges ADD COLUMN line_total REAL\n  GENERATED ALWAYS AS (units * unit_price) VIRTUAL;\nSELECT charge_id, line_total FROM charges LIMIT 5;` },
      { wrong: `ALTER TABLE invoices ADD COLUMN days_overdue INTEGER\n  GENERATED ALWAYS AS (julianday('now') - julianday(due_date)) VIRTUAL;`, why: '"now" changes every second, so the expression is not deterministic and SQLite rejects it. Compute time-dependent values in the query (or a view) instead.', fix: `SELECT invoice_id, due_date,\n       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_overdue\nFROM invoices WHERE status = 'Overdue' ORDER BY days_overdue DESC;` },
      { wrong: `INSERT INTO patient_cards (patient_id, first_name, last_name, full_name)\nVALUES (99, 'Ana', 'Lopez', 'Lopez, Ana');`, why: 'You cannot write to a generated column; the database computes it. Leave it out of the column list.', fix: `CREATE TABLE patient_cards (patient_id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT,\n  full_name TEXT GENERATED ALWAYS AS (last_name || ', ' || first_name) STORED);\nINSERT INTO patient_cards (patient_id, first_name, last_name) VALUES (99, 'Ana', 'Lopez');\nSELECT * FROM patient_cards;` },
    ],
    rules: ['A generated column is a formula over columns of the same row.', 'Only deterministic functions: no now, random or subqueries.', 'VIRTUAL = computed on read; STORED = computed on write.', 'SQLite: ALTER TABLE can add VIRTUAL only.', 'Never INSERT or UPDATE a generated column directly.'],
    compare: `<table><tr><th>Approach</th><th>Always correct?</th><th>Indexable?</th><th>Can use other tables?</th></tr>
<tr><td>Generated column</td><td>Yes</td><td>Yes</td><td>No (same row only)</td></tr>
<tr><td>Regular column filled by the app</td><td>Only if every app remembers</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Trigger that fills a column</td><td>Yes, if triggers cover every path</td><td>Yes</td><td>Yes</td></tr>
<tr><td>View with the formula</td><td>Yes</td><td>No (index the expression instead)</td><td>Yes</td></tr>
<tr><td>Expression index</td><td>Yes</td><td>It is the index</td><td>No</td></tr></table>
<p>Support: SQLite 3.31+, MySQL 5.7+, PostgreSQL 12+ (STORED; VIRTUAL from 18), SQL Server "computed columns" (<code>AS (expr) [PERSISTED]</code>), Oracle "virtual columns".</p>`,
    realWorld: 'Charge tables keep line_total as a generated column so billing reports, claim exports and patient statements all use the same units x price math. Patient tables often add a STORED search_name (upper(last_name) || first_name) with an index to power the front-desk lookup box.',
    tips: ['Use pragma_table_xinfo (not pragma_table_info) to see generated columns in SQLite.', 'Put a generated column in an index to speed up filters on the formula without changing any query.', 'If the formula depends on another table (such as a payor\'s contract rate), use a view or a trigger instead.'],
    deep: `<p>A classic use is pulling a field out of JSON: <code>payor_ref TEXT GENERATED ALWAYS AS (json_extract(raw_835, '$.payer.id')) VIRTUAL</code> plus an index on it. The raw remittance stays untouched, while queries filter on a normal, indexed column.</p>
<p>Because the expression is part of the schema, changing it later means dropping and re-adding the column (or rebuilding the table), just like changing any other column definition.</p>`,
    dialectSql: {
      postgres: `ALTER TABLE charges ADD COLUMN line_total numeric\n  GENERATED ALWAYS AS (units * unit_price) STORED;`,
      mysql: `ALTER TABLE charges ADD COLUMN line_total DECIMAL(10,2)\n  GENERATED ALWAYS AS (units * unit_price) VIRTUAL;`,
      sqlserver: `ALTER TABLE charges ADD line_total AS (units * unit_price) PERSISTED;`,
      oracle: `ALTER TABLE charges ADD (line_total NUMBER GENERATED ALWAYS AS (units * unit_price) VIRTUAL);`,
      sqlite: `ALTER TABLE charges ADD COLUMN line_total REAL\n  GENERATED ALWAYS AS (units * unit_price) VIRTUAL;`,
    },
    tryIt: { prompt: 'Add the generated column, then change a charge\'s units and watch line_total follow. Try adding a STORED column with ALTER TABLE to see the error.', starter: `ALTER TABLE charges ADD COLUMN line_total REAL\n  GENERATED ALWAYS AS (units * unit_price) VIRTUAL;\n\nUPDATE charges SET units = 3 WHERE charge_id = 5;\n\nSELECT charge_id, units, unit_price, amount, line_total\nFROM charges WHERE invoice_id = 4;\n\nSELECT name, type, hidden FROM pragma_table_xinfo('charges');` },
    challenge: {
      mode: 'state', level: 2,
      prompt: 'Add a VIRTUAL generated column days_to_due (REAL) to invoices: the number of days between invoice_date and due_date, computed with julianday().',
      solution: `ALTER TABLE invoices ADD COLUMN days_to_due REAL
  GENERATED ALWAYS AS (julianday(due_date) - julianday(invoice_date)) VIRTUAL;`,
      check: `SELECT i.*,
       (SELECT hidden FROM pragma_table_xinfo('invoices') WHERE name = 'days_to_due') AS generated_kind
FROM invoices i
WHERE i.invoice_id <= 6
ORDER BY i.invoice_id`,
      hints: ['It is a schema change on an existing table: ALTER TABLE invoices ADD COLUMN ...', 'The formula is due_date minus invoice_date, but as day numbers.', 'julianday(due_date) - julianday(invoice_date)', 'ALTER TABLE invoices ADD COLUMN days_to_due REAL GENERATED ALWAYS AS (julianday(due_date) - julianday(invoice_date)) VIRTUAL;'],
    },
    quiz: [
      { q: 'Which generated column type takes no disk space?', options: ['STORED', 'VIRTUAL', 'PERSISTED', 'Both'], answer: 1, why: 'VIRTUAL is computed each time it is read.' },
      { q: 'Why is GENERATED ALWAYS AS (julianday(\'now\') - julianday(due_date)) rejected?', options: ['julianday is not allowed', '\'now\' is not deterministic', 'REAL is not allowed', 'Generated columns cannot use dates'], answer: 1, why: 'The value would change over time without the row changing.' },
      { q: 'In SQLite, which can ALTER TABLE ADD COLUMN create?', options: ['Only STORED', 'Only VIRTUAL', 'Both', 'Neither'], answer: 1, why: 'Adding a STORED column would require rewriting every row, so SQLite only allows VIRTUAL.' },
    ],
  },
  {
    id: 'ddl-24',
    goals: ['Updating data through a view', 'What WITH CHECK OPTION prevents: rows escaping the view', 'LOCAL vs CASCADED check options', 'Emulating it in SQLite with an INSTEAD OF trigger and RAISE()'],
    concept: `<p>In many databases you can INSERT or UPDATE <b>through</b> a simple view, and the change goes to the base table. That creates a surprise: you can change a row so it no longer matches the view's WHERE, and it silently <b>disappears from the view</b>.</p>
<pre>CREATE VIEW open_invoices AS
SELECT ... FROM invoices WHERE status IN ('Open','Overdue');
UPDATE open_invoices SET status = 'Paid' WHERE invoice_id = 3;  -- row vanishes</pre>
<p><code>WITH CHECK OPTION</code> makes the database reject any INSERT or UPDATE through the view that would produce a row the view cannot see. The view becomes a <b>fence</b>, not just a window.</p>
<ul>
<li><b>CASCADED</b> (default): the conditions of this view and every view it is built on are checked.</li>
<li><b>LOCAL</b>: only this view's own WHERE (plus any underlying views that have their own check option).</li>
</ul>
<p><b>SQLite</b> has no WITH CHECK OPTION, and its views are read-only. You make a view writable with an <code>INSTEAD OF</code> trigger, and inside it you can check the rule yourself and stop the change with <code>RAISE(ABORT, 'message')</code>.</p>`,
    why: 'Views are often used to restrict what a user or app may touch. Without a check option, a user limited to "open invoices" could still mark them Paid or move them to another clinic, pushing rows outside their scope.',
    when: 'Whenever a view is used for writes by an app, a role or a tenant: per-clinic views, "active payors only" screens, work queues.',
    analogy: 'A collections clerk may only work the "open and overdue" tray. The view is the tray; WITH CHECK OPTION is the supervisor who stops the clerk from stamping a folder "Paid" and dropping it back in the tray, because a Paid folder does not belong there. Paid folders go through the payment-posting desk instead.',
    syntax: `CREATE VIEW view_name AS\nSELECT ... FROM table WHERE condition\nWITH [CASCADED | LOCAL] CHECK OPTION;`,
    dialect: 'postgres',
    sql: `CREATE VIEW clinic2_open_invoices AS
SELECT invoice_id, patient_id, location_id, due_date, status, total_amount
FROM invoices
WHERE location_id = 2
  AND status IN ('Open', 'Overdue', 'Partially Paid')
WITH CASCADED CHECK OPTION;

-- Allowed: the row still matches the view
UPDATE clinic2_open_invoices SET due_date = '2026-10-10' WHERE invoice_id = 3;

-- Rejected: the row would leave the view
UPDATE clinic2_open_invoices SET status = 'Paid' WHERE invoice_id = 3;
-- ERROR: new row violates check option for view "clinic2_open_invoices"

-- Rejected: inserting a row for another clinic
INSERT INTO clinic2_open_invoices (invoice_id, patient_id, location_id, due_date, status, total_amount)
VALUES (500, 7, 4, '2026-10-01', 'Open', 80);`,
    breakdown: [
      ['CREATE VIEW clinic2_open_invoices AS SELECT ...', 'A simple one-table view, so the database can write through it'],
      ['WHERE location_id = 2 AND status IN (...)', 'The fence: which rows belong to the view'],
      ['WITH CASCADED CHECK OPTION', 'Every INSERT/UPDATE through the view must still satisfy the WHERE (and those of any views underneath)'],
      ['SET due_date = ...', 'Allowed: the row still matches'],
      ['SET status = \'Paid\'', 'Rejected: a Paid invoice would vanish from the view'],
      ['INSERT ... location_id 4', 'Rejected: the new row would belong to another clinic'],
    ],
    visual: { type: 'flow', steps: [['UPDATE clinic2_open_invoices SET status = \'Paid\' WHERE invoice_id = 3', 'Change requested through the view'], ['Rewrite to the base table', 'UPDATE invoices ... WHERE invoice_id = 3 AND location_id = 2 AND status IN (...)'], ['Build the new row', 'invoice 3: location 2, status Paid'], ['Check option: does the new row match the view WHERE?', 'status Paid is not in (Open, Overdue, Partially Paid)'], ['Reject the statement', 'ERROR: new row violates check option; nothing changes'], ['SQLite: INSTEAD OF trigger does the same', 'SELECT RAISE(ABORT, ...) WHERE NEW.status NOT IN (...)']] },
    internals: `<p>When a view is "simply updatable" (one table, no GROUP BY, DISTINCT, aggregates or window functions), the planner rewrites a write on the view into a write on the base table, adding the view's WHERE to find the target rows. With CHECK OPTION, the engine also evaluates the view's condition against the <b>new</b> row image before storing it; if it is false, the statement fails and rolls back.</p>
<p>In SQLite, an <code>INSTEAD OF UPDATE</code> trigger fires once per view row matched by the UPDATE. <code>OLD</code> is the row as the view saw it, <code>NEW</code> is the requested new values. The trigger decides what really happens to the base tables; <code>RAISE(ABORT, msg)</code> undoes the current statement and returns the error to the caller.</p>`,
    mistakes: [
      { wrong: `CREATE VIEW clinic2_open_invoices AS\nSELECT * FROM invoices WHERE location_id = 2 AND status IN ('Open','Overdue');\n-- no check option: users can move rows out of the view`, why: 'Writes through the view can create rows the view cannot see, so a restricted user can change data outside their scope.', fix: `CREATE VIEW clinic2_open_invoices AS\nSELECT * FROM invoices WHERE location_id = 2 AND status IN ('Open','Overdue')\nWITH CHECK OPTION;` },
      { wrong: `-- SQLite\nUPDATE open_invoices SET due_date = '2026-10-10' WHERE invoice_id = 3;\n-- Error: cannot modify open_invoices because it is a view`, why: 'SQLite views are read-only until you add an INSTEAD OF trigger for that operation.', fix: `CREATE TRIGGER trg_open_invoices_upd INSTEAD OF UPDATE ON open_invoices\nBEGIN\n  UPDATE invoices SET due_date = NEW.due_date WHERE invoice_id = OLD.invoice_id;\nEND;` },
      { wrong: `CREATE VIEW v AS SELECT location_id, SUM(total_amount) AS billed\nFROM invoices GROUP BY location_id WITH CHECK OPTION;`, why: 'Views with GROUP BY, DISTINCT, aggregates or joins (in most databases) are not updatable, so a check option makes no sense on them.', fix: `CREATE VIEW v AS SELECT invoice_id, location_id, total_amount\nFROM invoices WHERE location_id = 2 WITH CHECK OPTION;` },
    ],
    rules: ['WITH CHECK OPTION: a write through a view must produce a row the view can see.', 'CASCADED checks every underlying view; LOCAL checks this view (and views with their own option).', 'Only simple, updatable views can take a check option.', 'SQLite: use an INSTEAD OF trigger + RAISE(ABORT, ...) to emulate it.'],
    compare: `<table><tr><th>Database</th><th>Write through views</th><th>Check option</th></tr>
<tr><td>PostgreSQL</td><td>Simple views automatically</td><td>LOCAL / CASCADED</td></tr>
<tr><td>MySQL</td><td>Updatable views</td><td>LOCAL / CASCADED</td></tr>
<tr><td>SQL Server</td><td>Updatable views</td><td>WITH CHECK OPTION (always cascaded)</td></tr>
<tr><td>Oracle</td><td>Updatable views</td><td>WITH CHECK OPTION [CONSTRAINT name]</td></tr>
<tr><td>SQLite</td><td>Only via INSTEAD OF triggers</td><td>Not supported: emulate with RAISE()</td></tr></table>
<p>A CHECK constraint protects the whole table for everyone; a view check option protects only writes made through that view.</p>`,
    realWorld: 'Multi-clinic billing apps give each clinic\'s staff a view filtered by location_id WITH CHECK OPTION (often combined with row-level security), so a clerk at Clinic 2 cannot insert an invoice for Clinic 4 or move an invoice there.',
    tips: ['Name the view after its fence (clinic2_open_invoices) so its purpose is obvious.', 'In SQLite, add INSTEAD OF INSERT, UPDATE and DELETE triggers separately; each operation needs its own.', 'For tenant isolation on a server database, also look at row-level security policies.'],
    deep: `<p>LOCAL vs CASCADED matters with stacked views. If <code>v_overdue</code> (status = 'Overdue', no check option) is built on <code>v_clinic2</code> (location_id = 2), then <code>v_overdue WITH LOCAL CHECK OPTION</code> checks only status, so you could move a row to another clinic through it; <code>WITH CASCADED CHECK OPTION</code> checks both conditions.</p>
<p>RAISE() has four forms in SQLite triggers: <code>ABORT</code> (undo this statement, keep the transaction), <code>ROLLBACK</code> (undo the whole transaction), <code>FAIL</code> (stop, keep earlier rows of this statement) and <code>IGNORE</code> (silently skip this row).</p>`,
    dialectSql: {
      postgres: `CREATE VIEW clinic2_open_invoices AS\nSELECT * FROM invoices\nWHERE location_id = 2 AND status IN ('Open','Overdue','Partially Paid')\nWITH CASCADED CHECK OPTION;`,
      mysql: `CREATE VIEW clinic2_open_invoices AS\nSELECT * FROM invoices\nWHERE location_id = 2 AND status IN ('Open','Overdue','Partially Paid')\nWITH CASCADED CHECK OPTION;`,
      sqlserver: `CREATE VIEW dbo.clinic2_open_invoices AS\nSELECT invoice_id, patient_id, location_id, due_date, status, total_amount\nFROM dbo.invoices\nWHERE location_id = 2 AND status IN ('Open','Overdue','Partially Paid')\nWITH CHECK OPTION;`,
      oracle: `CREATE VIEW clinic2_open_invoices AS\nSELECT * FROM invoices\nWHERE location_id = 2 AND status IN ('Open','Overdue','Partially Paid')\nWITH CHECK OPTION CONSTRAINT chk_clinic2_open;`,
      sqlite: `CREATE VIEW clinic2_open_invoices AS\nSELECT invoice_id, location_id, due_date, status FROM invoices\nWHERE location_id = 2 AND status IN ('Open','Overdue','Partially Paid');\n\nCREATE TRIGGER trg_clinic2_open_upd INSTEAD OF UPDATE ON clinic2_open_invoices\nBEGIN\n  SELECT RAISE(ABORT, 'check option: row would leave clinic2_open_invoices')\n  WHERE NEW.location_id <> 2\n     OR NEW.status NOT IN ('Open','Overdue','Partially Paid');\n  UPDATE invoices SET due_date = NEW.due_date, status = NEW.status, location_id = NEW.location_id\n  WHERE invoice_id = OLD.invoice_id;\nEND;`,
    },
    tryIt: { prompt: 'SQLite emulation. Run it: the due-date change goes through. Then uncomment the last UPDATE: the trigger raises the check-option error and nothing changes.', starter: `CREATE VIEW clinic2_open_invoices AS\nSELECT invoice_id, location_id, due_date, status FROM invoices\nWHERE location_id = 2 AND status IN ('Open', 'Overdue', 'Partially Paid');\n\nCREATE TRIGGER trg_clinic2_open_upd INSTEAD OF UPDATE ON clinic2_open_invoices\nBEGIN\n  SELECT RAISE(ABORT, 'check option: row would leave clinic2_open_invoices')\n  WHERE NEW.location_id <> 2\n     OR NEW.status NOT IN ('Open', 'Overdue', 'Partially Paid');\n  UPDATE invoices\n  SET due_date = NEW.due_date, status = NEW.status, location_id = NEW.location_id\n  WHERE invoice_id = OLD.invoice_id;\nEND;\n\nUPDATE clinic2_open_invoices SET due_date = '2026-10-10' WHERE invoice_id = 3;\n-- UPDATE clinic2_open_invoices SET status = 'Paid' WHERE invoice_id = 3;\n\nSELECT * FROM clinic2_open_invoices;` },
    challenge: {
      mode: 'state', level: 3,
      prompt: 'Emulate WITH CHECK OPTION in SQLite. Create a view active_payors_v (payor_id, payor_name, contract_rate, is_active) showing payors with is_active = 1. Add an INSTEAD OF UPDATE trigger on it that raises ABORT when NEW.is_active <> 1 and otherwise updates payor_name and contract_rate in payors. Then, through the view, set Aetna Care\'s (payor_id 2) contract_rate to 0.77.',
      solution: `CREATE VIEW active_payors_v AS
SELECT payor_id, payor_name, contract_rate, is_active
FROM payors
WHERE is_active = 1;

CREATE TRIGGER trg_active_payors_upd INSTEAD OF UPDATE ON active_payors_v
BEGIN
  SELECT RAISE(ABORT, 'check option: payor must stay active')
  WHERE NEW.is_active <> 1;
  UPDATE payors
  SET payor_name = NEW.payor_name, contract_rate = NEW.contract_rate
  WHERE payor_id = OLD.payor_id;
END;

UPDATE active_payors_v SET contract_rate = 0.77 WHERE payor_id = 2;`,
      check: `SELECT payor_id, payor_name, contract_rate, is_active,
       (SELECT COUNT(*) FROM sqlite_master WHERE type = 'view' AND name = 'active_payors_v') AS has_view,
       (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'active_payors_v'
          AND upper(sql) LIKE '%INSTEAD OF UPDATE%' AND upper(sql) LIKE '%RAISE%') AS has_check_trigger
FROM payors
ORDER BY payor_id`,
      hints: ['Three statements: CREATE VIEW, CREATE TRIGGER, then an UPDATE on the view (not on payors).', 'The view is SELECT payor_id, payor_name, contract_rate, is_active FROM payors WHERE is_active = 1.', 'Trigger body: SELECT RAISE(ABORT, \'...\') WHERE NEW.is_active <> 1; then UPDATE payors SET ... WHERE payor_id = OLD.payor_id;', 'Finish with UPDATE active_payors_v SET contract_rate = 0.77 WHERE payor_id = 2;'],
    },
    quiz: [
      { q: 'A view shows only Open invoices WITH CHECK OPTION. What happens to UPDATE view SET status = \'Paid\'?', options: ['The row is updated and disappears', 'The statement is rejected', 'Only the view changes', 'The status becomes NULL'], answer: 1, why: 'The new row would not satisfy the view\'s WHERE, so the check option rejects it.' },
      { q: 'How do you get similar protection in SQLite?', options: ['WITH CHECK OPTION', 'An INSTEAD OF trigger that calls RAISE(ABORT, ...) for bad rows', 'PRAGMA check_option = ON', 'It is impossible'], answer: 1, why: 'SQLite views are read-only; the INSTEAD OF trigger performs the write and can reject it.' },
      { q: 'What does CASCADED add compared with LOCAL?', options: ['Nothing', 'It also checks the conditions of the views underneath', 'It deletes child rows', 'It makes the view materialized'], answer: 1, why: 'CASCADED enforces the WHERE of every view in the stack.' },
    ],
  },
  {
    id: 'ddl-25',
    goals: ['Create and drop indexes: plain, composite, UNIQUE, partial and expression indexes', 'Check that the planner uses them with EXPLAIN QUERY PLAN', 'Maintain them: ANALYZE, REINDEX, dropping unused indexes', 'Understand the write cost of every extra index'],
    concept: `<p>An <b>index</b> is a separate sorted structure (a B-tree) that lets the database jump straight to matching rows instead of scanning the whole table. The kinds you will create most:</p>
<ul>
<li><b>Single / composite</b>: <code>CREATE INDEX idx_charges_invoice ON charges(invoice_id)</code>, or several columns <code>(status, due_date)</code>. Column order matters: the index helps filters on the leading column(s).</li>
<li><b>UNIQUE</b>: also enforces that no two rows share the value (for example one payment per reference number).</li>
<li><b>Partial</b>: <code>... WHERE status = 'Overdue'</code> indexes only some rows: smaller and cheaper, perfect for work queues.</li>
<li><b>Expression</b>: <code>ON patients(lower(email))</code> indexes a computed value, so <code>WHERE lower(email) = ...</code> can use it.</li>
</ul>
<p>Maintenance:</p>
<ul>
<li><code>ANALYZE</code> gathers statistics (in <code>sqlite_stat1</code>) so the planner can pick the best index.</li>
<li><code>REINDEX</code> rebuilds an index (after corruption or a collation change). Server databases also rebuild to remove bloat.</li>
<li><code>DROP INDEX</code> removes indexes nobody uses.</li>
</ul>
<p>Indexes are <b>not free</b>: every INSERT, DELETE, and UPDATE of an indexed column must also change every matching index. Reads get faster; writes and storage get slower.</p>`,
    why: 'Without the right indexes, looking up one patient\'s invoices or the overdue work queue means reading the whole table, which becomes painfully slow as a billing database grows to millions of rows.',
    when: 'Index foreign keys used in joins, columns in frequent WHERE / ORDER BY clauses, and natural keys that must be unique. Skip indexes on tiny tables and on columns rarely searched.',
    analogy: 'An index is the tabbed card file at the front desk, sorted by last name, pointing to where each chart sits on the shelves. A partial index is a separate card file for "overdue accounts only": small and quick to flip through. But every new patient means filing a card in every card file too, so an office with ten card files registers patients slowly.',
    syntax: `CREATE [UNIQUE] INDEX [IF NOT EXISTS] idx_name\n  ON table (col1 [, col2 ...] | (expression))\n  [WHERE condition];          -- partial index\nDROP INDEX [IF EXISTS] idx_name;\nANALYZE [table];\nREINDEX [idx_name | table];`,
    sql: `-- Foreign key used by joins
CREATE INDEX idx_charges_invoice ON charges(invoice_id);

-- Composite: filter on status, then range/sort on due_date
CREATE INDEX idx_invoices_status_due ON invoices(status, due_date);

-- Unique natural key
CREATE UNIQUE INDEX ux_payors_name ON payors(payor_name);

-- Partial: only the overdue work queue
CREATE INDEX idx_invoices_overdue_due ON invoices(due_date) WHERE status = 'Overdue';

-- Expression: case-insensitive email lookup
CREATE INDEX idx_patients_email_lower ON patients(lower(email));

ANALYZE;                         -- refresh planner statistics
REINDEX idx_charges_invoice;     -- rebuild one index
DROP INDEX idx_invoices_status_due;  -- remove one we decided not to keep

SELECT name, tbl_name, sql
FROM sqlite_master
WHERE type = 'index' AND sql IS NOT NULL
ORDER BY tbl_name, name;`,
    breakdown: [
      ['CREATE INDEX idx_charges_invoice ON charges(invoice_id)', 'Speeds up joins and lookups of an invoice\'s charges'],
      ['ON invoices(status, due_date)', 'Composite: usable for WHERE status = ? and WHERE status = ? AND due_date < ?, not for due_date alone'],
      ['CREATE UNIQUE INDEX ...', 'An index that also rejects duplicate values'],
      ['... WHERE status = \'Overdue\'', 'Partial index: only overdue rows are stored'],
      ['ON patients(lower(email))', 'Expression index: matches queries that use exactly lower(email)'],
      ['ANALYZE / REINDEX / DROP INDEX', 'Statistics, rebuild, removal'],
      ['sqlite_master WHERE type = \'index\'', 'Lists the indexes (automatic ones have sql = NULL)'],
    ],
    visual: { type: 'explain', sql: `SELECT invoice_id, due_date, total_amount FROM invoices WHERE status = 'Overdue' AND due_date < '2026-07-01' ORDER BY due_date`, index: `CREATE INDEX idx_invoices_overdue_due ON invoices(due_date) WHERE status = 'Overdue'` },
    internals: `<p>Each index is its own B-tree whose entries are (indexed values, rowid). A SEARCH descends the tree in O(log n) steps, then fetches each row by rowid (unless the index <i>covers</i> every needed column). A partial index stores only rows that satisfy its WHERE; the planner can use it only when the query's WHERE <b>implies</b> the index condition, which in SQLite usually means the query contains the same term (<code>status = 'Overdue'</code>).</p>
<p>On every write, SQLite updates the table B-tree and then each index B-tree: a table with 6 indexes does roughly 7 B-tree modifications per INSERT. <code>ANALYZE</code> samples each index and stores rows-per-key estimates in <code>sqlite_stat1</code>; without them the planner guesses. <code>PRAGMA optimize</code> runs ANALYZE only where it is likely to help and is a good habit before closing long-lived connections.</p>`,
    mistakes: [
      { wrong: `CREATE INDEX idx_patients_email ON patients(email);\nSELECT patient_id FROM patients WHERE lower(email) = 'maria.garcia@mail.com';`, why: 'The query filters on lower(email), a different expression from the indexed column, so the index cannot be used (the plan shows SCAN).', fix: `CREATE INDEX idx_patients_email_lower ON patients(lower(email));\nEXPLAIN QUERY PLAN\nSELECT patient_id FROM patients WHERE lower(email) = 'maria.garcia@mail.com';` },
      { wrong: `CREATE INDEX idx_invoices_status_due ON invoices(status, due_date);\nSELECT invoice_id FROM invoices WHERE due_date < '2025-06-01';`, why: 'A composite index is sorted by its first column. Filtering only on the second column cannot seek into it. Put the most commonly filtered (equality) column first, or add a separate index.', fix: `CREATE INDEX idx_invoices_due ON invoices(due_date);\nEXPLAIN QUERY PLAN SELECT invoice_id FROM invoices WHERE due_date < '2025-06-01';` },
      { wrong: `-- "Index everything"\nCREATE INDEX i1 ON transactions(amount);\nCREATE INDEX i2 ON transactions(posted_by);\nCREATE INDEX i3 ON transactions(reference_id);`, why: 'Transactions is the busiest insert table. Each unused index slows every posting and wastes space. Index what queries actually filter or join on, and drop the rest.', fix: `CREATE INDEX idx_transactions_invoice ON transactions(invoice_id);` },
    ],
    rules: ['Index foreign keys and frequent filters; verify with EXPLAIN QUERY PLAN.', 'Composite index: equality columns first, then range/sort columns.', 'A query must use the same expression (or imply the same WHERE) as an expression or partial index.', 'Every index slows writes: drop the ones no query uses.', 'Run ANALYZE (or PRAGMA optimize) after large data changes.'],
    compare: `<table><tr><th>Index kind</th><th>Billing example</th><th>Best for</th></tr>
<tr><td>Single column</td><td>charges(invoice_id)</td><td>Joins, lookups</td></tr>
<tr><td>Composite</td><td>invoices(status, due_date)</td><td>Filter + range/sort together</td></tr>
<tr><td>UNIQUE</td><td>payors(payor_name)</td><td>Enforcing natural keys</td></tr>
<tr><td>Partial</td><td>invoices(due_date) WHERE status = 'Overdue'</td><td>Small hot subsets, queues</td></tr>
<tr><td>Expression</td><td>patients(lower(email))</td><td>Case-insensitive or computed filters</td></tr></table>
<p>Server extras: PostgreSQL <code>CREATE INDEX CONCURRENTLY</code> (no write lock), <code>INCLUDE</code> columns for covering indexes (PostgreSQL, SQL Server), SQL Server filtered indexes (= partial) and <code>ALTER INDEX ... REBUILD</code>.</p>`,
    realWorld: 'A clearinghouse import that posted 200,000 remittance lines an hour slowed to a crawl after developers added nine "just in case" indexes to the transactions table. Usage statistics (pg_stat_user_indexes) showed six were never read; dropping them tripled posting speed while the overdue-queue partial index kept the collectors\' screen instant.',
    tips: ['Name indexes consistently: idx_table_columns, ux_ for unique.', 'On server databases, create indexes on big live tables with CREATE INDEX CONCURRENTLY (PostgreSQL) or ONLINE = ON (SQL Server) to avoid blocking writes.', 'Check index usage before dropping: pg_stat_user_indexes (PostgreSQL), sys.dm_db_index_usage_stats (SQL Server).'],
    deep: `<p>Creating an index on a big table sorts every row once, which can take minutes and, in SQLite, holds the write lock for the whole time. Bulk loads are faster if you drop secondary indexes, load, then recreate them, because building an index from sorted data is much cheaper than inserting millions of entries one by one.</p>
<p>In PostgreSQL, MVCC leaves dead index entries behind after updates and deletes; heavy-churn indexes grow ("bloat") until VACUUM reclaims space, and occasionally need <code>REINDEX CONCURRENTLY</code>. SQLite has no such bloat, but <code>VACUUM</code> can still shrink the file after mass deletes.</p>`,
    dialectSql: {
      postgres: `CREATE INDEX CONCURRENTLY idx_charges_invoice ON charges(invoice_id);\nCREATE INDEX idx_invoices_overdue_due ON invoices(due_date) WHERE status = 'Overdue';\nCREATE INDEX idx_patients_email_lower ON patients(lower(email));\nANALYZE invoices;\nREINDEX INDEX CONCURRENTLY idx_charges_invoice;`,
      mysql: `CREATE INDEX idx_charges_invoice ON charges(invoice_id);\n-- no partial indexes; functional index (8.0.13+):\nCREATE INDEX idx_patients_email_lower ON patients((lower(email)));\nANALYZE TABLE invoices;\nOPTIMIZE TABLE charges;   -- rebuilds table and indexes`,
      sqlserver: `CREATE INDEX idx_charges_invoice ON dbo.charges(invoice_id) WITH (ONLINE = ON);\nCREATE INDEX idx_invoices_overdue_due ON dbo.invoices(due_date) INCLUDE (total_amount)\n  WHERE status = 'Overdue';   -- filtered index\nUPDATE STATISTICS dbo.invoices;\nALTER INDEX idx_charges_invoice ON dbo.charges REBUILD;`,
      oracle: `CREATE INDEX idx_charges_invoice ON charges(invoice_id) ONLINE;\nCREATE INDEX idx_patients_email_lower ON patients(LOWER(email));\nEXEC DBMS_STATS.GATHER_TABLE_STATS(USER, 'INVOICES');\nALTER INDEX idx_charges_invoice REBUILD ONLINE;`,
      sqlite: `CREATE INDEX idx_invoices_overdue_due ON invoices(due_date) WHERE status = 'Overdue';\nCREATE INDEX idx_patients_email_lower ON patients(lower(email));\nANALYZE;\nREINDEX idx_invoices_overdue_due;`,
    },
    tryIt: { prompt: 'Look at the plan, create the index, and look again (SCAN becomes SEARCH). Then change the query to status = \'Open\': can the partial index still be used?', starter: `EXPLAIN QUERY PLAN\nSELECT invoice_id, due_date, total_amount FROM invoices\nWHERE status = 'Overdue' AND due_date < '2026-07-01'\nORDER BY due_date;\n\nCREATE INDEX idx_invoices_overdue_due ON invoices(due_date) WHERE status = 'Overdue';\nANALYZE;\n\nEXPLAIN QUERY PLAN\nSELECT invoice_id, due_date, total_amount FROM invoices\nWHERE status = 'Overdue' AND due_date < '2026-07-01'\nORDER BY due_date;` },
    challenge: {
      mode: 'state', level: 2,
      prompt: 'Create two indexes on invoices: (1) a partial index idx_invoices_open_due on due_date that contains only invoices with status = \'Open\'; (2) a composite index idx_invoices_patient_date on (patient_id, invoice_date).',
      solution: `CREATE INDEX idx_invoices_open_due ON invoices(due_date) WHERE status = 'Open';
CREATE INDEX idx_invoices_patient_date ON invoices(patient_id, invoice_date);`,
      check: `SELECT il.name AS index_name, il."unique", il.partial, ii.seqno, ii.name AS column_name
FROM pragma_index_list('invoices') il
JOIN pragma_index_info(il.name) ii
ORDER BY il.name, ii.seqno`,
      hints: ['You need two CREATE INDEX statements on invoices.', 'A partial index ends with a WHERE clause.', 'CREATE INDEX idx_invoices_open_due ON invoices(due_date) WHERE status = \'Open\';', 'CREATE INDEX idx_invoices_patient_date ON invoices(patient_id, invoice_date);'],
    },
    quiz: [
      { q: 'An index on invoices(status, due_date) helps which filter most?', options: ['WHERE due_date < ?', 'WHERE status = ? AND due_date < ?', 'WHERE total_amount > ?', 'WHERE lower(status) = ?'], answer: 1, why: 'Equality on the leading column, then a range on the second, is exactly how the index is sorted.' },
      { q: 'What is the main cost of adding indexes?', options: ['Slower SELECTs', 'Slower INSERT/UPDATE/DELETE and more storage', 'Data loss', 'None'], answer: 1, why: 'Every write must also update each index.' },
      { q: 'What does ANALYZE do in SQLite?', options: ['Rebuilds indexes', 'Gathers statistics so the planner chooses better plans', 'Checks for corruption', 'Deletes unused indexes'], answer: 1, why: 'It fills sqlite_stat1 with estimates the planner uses.' },
    ],
  },
  {
    id: 'ddl-26',
    goals: ['Keep a full change history with a history table filled by triggers', 'Model time with valid_from / valid_to and query "as of" a date', 'SQL Server system-versioned (temporal) tables', 'Soft deletes vs hard deletes'],
    concept: `<p>Most tables keep only the <b>current</b> value. Billing and compliance often need the <b>past</b> too: "What was Aetna's contract rate when this claim was billed?" or "Who changed this invoice, and when?"</p>
<ul>
<li><b>Audit (history) table</b>: a trigger copies the <code>OLD</code> row into <code>..._history</code> on every UPDATE and DELETE. The main table stays small and fast.</li>
<li><b>Validity period</b>: each version has <code>valid_from</code> and <code>valid_to</code>. The current version has <code>valid_to</code> = NULL (or '9999-12-31'). An "as of" query picks the version where <code>valid_from &lt;= date &lt; valid_to</code>.</li>
<li><b>System-versioned temporal tables</b> (SQL:2011; SQL Server, MariaDB, Oracle Flashback, PostgreSQL via extensions): the database maintains the history table and periods for you, and you query <code>FOR SYSTEM_TIME AS OF '2025-06-01'</code>.</li>
<li><b>Soft delete</b>: instead of DELETE, set <code>deleted_at</code> (or <code>is_active = 0</code>). The row stays for audits and foreign keys, and queries filter it out.</li>
</ul>
<p>SQLite has no system versioning, but triggers plus a history table do the same job.</p>`,
    why: 'Healthcare billing must prove what was billed, at what rate, by whom, and when. Auditors, payor disputes and HIPAA access reviews all require history that a plain UPDATE destroys.',
    when: 'Contract rates, fee schedules, invoice status changes, patient demographics and anything regulators or disputes may ask about later.',
    analogy: 'A paper ledger is never erased: a correction is a new line, and the old line is crossed out with a date and initials. The history table is that crossed-out line; valid_from/valid_to are the dates in the margin; a soft delete is stamping "VOID" on a chart instead of shredding it.',
    syntax: `CREATE TABLE t_history (..., valid_from, valid_to, changed_by);\nCREATE TRIGGER trg_t_audit AFTER UPDATE ON t\nBEGIN\n  INSERT INTO t_history (...) VALUES (OLD.col, ..., OLD.valid_from, NEW.valid_from);\nEND;\n-- as of a date\nWHERE valid_from <= :d AND (valid_to IS NULL OR valid_to > :d)`,
    sql: `-- Current rate starts on a date
ALTER TABLE payors ADD COLUMN rate_valid_from TEXT NOT NULL DEFAULT '2025-01-01';

CREATE TABLE payor_rate_history (
  history_id    INTEGER PRIMARY KEY,
  payor_id      INTEGER NOT NULL,
  contract_rate REAL    NOT NULL,
  valid_from    TEXT    NOT NULL,
  valid_to      TEXT    NOT NULL,   -- exclusive end
  operation     TEXT    NOT NULL
);

-- Copy the old version whenever the rate changes
CREATE TRIGGER trg_payors_rate_history
AFTER UPDATE OF contract_rate ON payors
WHEN OLD.contract_rate IS NOT NEW.contract_rate
BEGIN
  INSERT INTO payor_rate_history (payor_id, contract_rate, valid_from, valid_to, operation)
  VALUES (OLD.payor_id, OLD.contract_rate, OLD.rate_valid_from, NEW.rate_valid_from, 'UPDATE');
END;

-- Two renegotiations for Aetna Care
UPDATE payors SET contract_rate = 0.78, rate_valid_from = '2025-07-01' WHERE payor_id = 2;
UPDATE payors SET contract_rate = 0.80, rate_valid_from = '2026-03-01' WHERE payor_id = 2;

-- Full timeline: history + current row
SELECT payor_id, contract_rate, valid_from, valid_to FROM payor_rate_history WHERE payor_id = 2
UNION ALL
SELECT payor_id, contract_rate, rate_valid_from, NULL FROM payors WHERE payor_id = 2
ORDER BY valid_from;`,
    breakdown: [
      ['ADD COLUMN rate_valid_from', 'When the current version started'],
      ['CREATE TABLE payor_rate_history', 'One row per old version, with its validity period'],
      ['AFTER UPDATE OF contract_rate ON payors', 'Fires only when contract_rate is in the SET list'],
      ['WHEN OLD.contract_rate IS NOT NEW.contract_rate', 'Skip no-op updates (IS NOT is NULL-safe)'],
      ['VALUES (OLD..., OLD.rate_valid_from, NEW.rate_valid_from, ...)', 'The old version ends exactly when the new one starts'],
      ['UNION ALL ... ORDER BY valid_from', 'History plus current row = the complete timeline'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 200" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="320" y="18" text-anchor="middle" fill="var(--text)" font-weight="bold">Aetna Care contract_rate over time</text>
<line x1="40" y1="120" x2="610" y2="120" stroke="var(--muted)"/>
<text x="40" y="140" text-anchor="middle" fill="var(--muted)" font-size="11">2025-01-01</text>
<text x="250" y="140" text-anchor="middle" fill="var(--muted)" font-size="11">2025-07-01</text>
<text x="460" y="140" text-anchor="middle" fill="var(--muted)" font-size="11">2026-03-01</text>
<text x="600" y="140" text-anchor="end" fill="var(--muted)" font-size="11">now</text>
<rect x="40" y="60" width="210" height="40" rx="6" fill="var(--panel2)" stroke="var(--muted)"/>
<text x="145" y="78" text-anchor="middle" fill="var(--text)">0.75</text><text x="145" y="93" text-anchor="middle" fill="var(--muted)" font-size="10">payor_rate_history</text>
<rect x="250" y="60" width="210" height="40" rx="6" fill="var(--panel2)" stroke="var(--muted)"/>
<text x="355" y="78" text-anchor="middle" fill="var(--text)">0.78</text><text x="355" y="93" text-anchor="middle" fill="var(--muted)" font-size="10">payor_rate_history</text>
<rect x="460" y="60" width="150" height="40" rx="6" fill="var(--panel2)" stroke="var(--green)" stroke-width="2"/>
<text x="535" y="78" text-anchor="middle" fill="var(--text)">0.80</text><text x="535" y="93" text-anchor="middle" fill="var(--green)" font-size="10">payors (current)</text>
<line x1="330" y1="40" x2="330" y2="125" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4"/>
<text x="330" y="34" text-anchor="middle" fill="var(--accent)" font-size="11">AS OF 2025-11-15 &#8594; 0.78</text>
<text x="320" y="170" text-anchor="middle" fill="var(--text)" font-size="11">each version: valid_from &lt;= date &lt; valid_to (end exclusive, no gaps, no overlaps)</text>
<text x="320" y="188" text-anchor="middle" fill="var(--muted)" font-size="11">the trigger closes the old version at the moment the new one starts</text>
</svg>` },
    internals: `<p>The trigger runs inside the same transaction as the UPDATE, so the history row and the change commit or roll back together: there is never a change without its audit row. <code>AFTER UPDATE OF col</code> is cheaper than a plain AFTER UPDATE because SQLite skips the trigger entirely when <code>col</code> is not being set.</p>
<p>SQL Server system-versioned tables add two hidden <code>datetime2</code> columns (<code>ValidFrom</code>, <code>ValidTo</code>) filled with the transaction's start time, and move each old row version into a linked history table automatically. <code>FOR SYSTEM_TIME AS OF</code> is rewritten into a UNION of the current table and the history table with the period predicate, the same query you write by hand in SQLite.</p>`,
    mistakes: [
      { wrong: `-- "as of" with an inclusive end on both sides\nSELECT contract_rate FROM payor_rate_history\nWHERE payor_id = 2 AND '2025-07-01' BETWEEN valid_from AND valid_to;`, why: 'On the change date both the old version (ending 2025-07-01) and the new one (starting 2025-07-01) match. Use half-open periods: valid_from <= d AND d < valid_to.', fix: `WITH payor_rate_history (payor_id, contract_rate, valid_from, valid_to) AS (\n  VALUES (2, 0.75, '2025-01-01', '2025-07-01'), (2, 0.78, '2025-07-01', '2026-03-01'))\nSELECT payor_id, contract_rate, valid_from, valid_to FROM payor_rate_history\nWHERE valid_from <= '2025-07-01' AND '2025-07-01' < valid_to;` },
      { wrong: `DELETE FROM payors WHERE payor_id = 6;`, why: 'Cigna Select still has historical invoices and payments. A hard delete loses the record (or breaks foreign keys). Soft-delete it instead.', fix: `UPDATE payors SET is_active = 0 WHERE payor_id = 6;\nSELECT payor_id, payor_name FROM payors WHERE is_active = 1 ORDER BY payor_id;` },
      { wrong: `-- History written by the application after the UPDATE\nUPDATE payors SET contract_rate = 0.78 WHERE payor_id = 2;\n-- (app crashes before inserting the history row)`, why: 'Any code path that forgets (a script, a manual fix, a crash) leaves a gap in the audit trail. A trigger or system versioning records the change in the same transaction, every time.', fix: `CREATE TABLE rate_log (payor_id INTEGER, old_rate REAL, new_rate REAL);\nCREATE TRIGGER trg_rate_log AFTER UPDATE OF contract_rate ON payors\nBEGIN INSERT INTO rate_log VALUES (OLD.payor_id, OLD.contract_rate, NEW.contract_rate); END;\nUPDATE payors SET contract_rate = 0.78 WHERE payor_id = 2;\nSELECT * FROM rate_log;` },
    ],
    rules: ['Record history in the database (trigger or system versioning), not only in app code.', 'Use half-open periods: valid_from <= d < valid_to.', 'The current row has valid_to NULL (or 9999-12-31); versions must not overlap.', 'Soft-delete records other rows or audits still refer to.', 'History tables are append-only: never UPDATE them.'],
    compare: `<table><tr><th>Approach</th><th>What you get</th><th>Where</th></tr>
<tr><td>Trigger + history table</td><td>Full old versions, any columns you choose</td><td>Every database (SQLite included)</td></tr>
<tr><td>System-versioned temporal table</td><td>Automatic history and FOR SYSTEM_TIME queries</td><td>SQL Server, MariaDB, Db2; Oracle Flashback Archive</td></tr>
<tr><td>Generic audit log (table, key, column, old, new, who, when)</td><td>One log for all tables</td><td>Any, via triggers or CDC</td></tr>
<tr><td>Soft delete (deleted_at / is_active)</td><td>Deleted rows stay queryable</td><td>Any</td></tr>
<tr><td>Change Data Capture</td><td>A stream of changes for other systems</td><td>SQL Server CDC, PostgreSQL logical decoding, Debezium</td></tr></table>
<p><b>System time</b> = when the database recorded the change. <b>Application (business) time</b> = when the fact is true in the real world, such as a contract rate effective next month. Tables that track both are "bitemporal".</p>`,
    realWorld: 'Fee schedules and payor contract rates are stored with effective dates so a claim for a 2025 visit is priced with the 2025 rate even if it is rebilled today. Invoice status changes are logged with user and timestamp for audits, and patients are never hard-deleted: merged duplicate records are soft-deleted and point to the surviving record.',
    tips: ['Add changed_by and changed_at columns to history rows; in SQLite use a value passed from the app, since there is no current_user.', 'Index history tables on (key, valid_from) for fast as-of lookups.', 'With soft deletes, make a view of active rows (WHERE deleted_at IS NULL) and point most queries at it.'],
    deep: `<p>Soft deletes interact with UNIQUE constraints: a deleted payor named "Cigna Select" would block creating a new one with the same name. Fix it with a partial unique index: <code>CREATE UNIQUE INDEX ux_payors_name_active ON payors(payor_name) WHERE is_active = 1</code>.</p>
<p>For business-time data (rates effective in the future), PostgreSQL can prevent overlapping periods with an exclusion constraint: <code>EXCLUDE USING gist (payor_id WITH =, daterange(valid_from, valid_to) WITH &amp;&amp;)</code>.</p>`,
    dialectSql: {
      sqlserver: `CREATE TABLE dbo.payor_rates (\n  payor_id      int PRIMARY KEY,\n  contract_rate decimal(4,2) NOT NULL,\n  ValidFrom datetime2 GENERATED ALWAYS AS ROW START NOT NULL,\n  ValidTo   datetime2 GENERATED ALWAYS AS ROW END   NOT NULL,\n  PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo)\n) WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.payor_rates_history));\n\nSELECT * FROM dbo.payor_rates FOR SYSTEM_TIME AS OF '2025-11-15' WHERE payor_id = 2;`,
      postgres: `-- no built-in system versioning: trigger + history table (or the temporal_tables extension)\nCREATE TRIGGER trg_payors_rate_history\nAFTER UPDATE OF contract_rate ON payors\nFOR EACH ROW WHEN (OLD.contract_rate IS DISTINCT FROM NEW.contract_rate)\nEXECUTE FUNCTION log_payor_rate();`,
      mysql: `-- MariaDB has system versioning; MySQL uses triggers:\nCREATE TABLE payor_rates (...) WITH SYSTEM VERSIONING;   -- MariaDB\nSELECT * FROM payor_rates FOR SYSTEM_TIME AS OF TIMESTAMP '2025-11-15 00:00:00';`,
      oracle: `-- Flashback query (undo-based) or Flashback Data Archive for long retention\nSELECT contract_rate FROM payors AS OF TIMESTAMP TIMESTAMP '2025-11-15 00:00:00'\nWHERE payor_id = 2;`,
      sqlite: `SELECT contract_rate FROM payor_rate_history\nWHERE payor_id = 2 AND valid_from <= '2025-11-15' AND '2025-11-15' < valid_to\nUNION ALL\nSELECT contract_rate FROM payors\nWHERE payor_id = 2 AND rate_valid_from <= '2025-11-15';`,
    },
    tryIt: { prompt: 'Build the history, then answer "what was Aetna\'s rate on 2025-11-15?" Change the date to 2026-05-01 and 2025-03-01.', starter: `ALTER TABLE payors ADD COLUMN rate_valid_from TEXT NOT NULL DEFAULT '2025-01-01';\nCREATE TABLE payor_rate_history (payor_id INTEGER, contract_rate REAL, valid_from TEXT, valid_to TEXT);\nCREATE TRIGGER trg_payors_rate_history AFTER UPDATE OF contract_rate ON payors\nWHEN OLD.contract_rate IS NOT NEW.contract_rate\nBEGIN\n  INSERT INTO payor_rate_history VALUES (OLD.payor_id, OLD.contract_rate, OLD.rate_valid_from, NEW.rate_valid_from);\nEND;\nUPDATE payors SET contract_rate = 0.78, rate_valid_from = '2025-07-01' WHERE payor_id = 2;\nUPDATE payors SET contract_rate = 0.80, rate_valid_from = '2026-03-01' WHERE payor_id = 2;\n\n-- As of a date\nSELECT contract_rate FROM payor_rate_history\nWHERE payor_id = 2 AND valid_from <= '2025-11-15' AND '2025-11-15' < valid_to\nUNION ALL\nSELECT contract_rate FROM payors\nWHERE payor_id = 2 AND rate_valid_from <= '2025-11-15';` },
    challenge: {
      mode: 'state', level: 3,
      prompt: 'Audit invoice status changes. Create table invoice_status_history (invoice_id INTEGER, old_status TEXT, new_status TEXT, changed_on TEXT) and a trigger trg_invoice_status_audit that, AFTER UPDATE OF status ON invoices, inserts one row when the status really changes, with changed_on = \'2026-09-01\'. Then mark invoices 3 and 9 as Paid, and "update" invoice 5 to Open (its current status, so no history row).',
      solution: `CREATE TABLE invoice_status_history (
  invoice_id INTEGER,
  old_status TEXT,
  new_status TEXT,
  changed_on TEXT
);

CREATE TRIGGER trg_invoice_status_audit
AFTER UPDATE OF status ON invoices
WHEN OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO invoice_status_history (invoice_id, old_status, new_status, changed_on)
  VALUES (OLD.invoice_id, OLD.status, NEW.status, '2026-09-01');
END;

UPDATE invoices SET status = 'Paid' WHERE invoice_id IN (3, 9);
UPDATE invoices SET status = 'Open' WHERE invoice_id = 5;`,
      check: `CREATE TABLE IF NOT EXISTS invoice_status_history (invoice_id INTEGER, old_status TEXT, new_status TEXT, changed_on TEXT);
SELECT h.invoice_id, h.old_status, h.new_status, h.changed_on, i.status AS current_status
FROM invoice_status_history h
JOIN invoices i ON i.invoice_id = h.invoice_id
ORDER BY h.invoice_id, h.rowid`,
      hints: ['First CREATE TABLE invoice_status_history with the four columns.', 'Then CREATE TRIGGER trg_invoice_status_audit AFTER UPDATE OF status ON invoices ... BEGIN ... END;', 'Add WHEN OLD.status IS NOT NEW.status so no-op updates are not logged; insert OLD.invoice_id, OLD.status, NEW.status, \'2026-09-01\'.', 'Finally run the updates: status = \'Paid\' WHERE invoice_id IN (3, 9), then status = \'Open\' WHERE invoice_id = 5.'],
    },
    quiz: [
      { q: 'Why use a trigger (not app code) to write history rows?', options: ['Triggers are faster to write', 'Every change, from any app or script, is recorded in the same transaction', 'Apps cannot insert rows', 'Triggers compress data'], answer: 1, why: 'The history row commits or rolls back together with the change, whoever made it.' },
      { q: 'Which condition finds the version valid on date d?', options: ['d BETWEEN valid_from AND valid_to', 'valid_from <= d AND (valid_to IS NULL OR d < valid_to)', 'valid_to = d', 'valid_from = d'], answer: 1, why: 'Half-open periods never match two versions on the change date.' },
      { q: 'What is a soft delete?', options: ['DELETE with a WHERE clause', 'Marking a row as deleted (deleted_at / is_active = 0) instead of removing it', 'TRUNCATE', 'Deleting from a view'], answer: 1, why: 'The row stays for history and references, and normal queries filter it out.' },
    ],
  },

  // ─────────────────────────── ddl-27 Case Study: Sites, Locations & Roll-ups ───────────────────────────
  {
    id: 'ddl-27',
    goals: [
      'Understand the <b>site → treatment location</b> hierarchy and what each level stores',
      'Tell a <b>stored</b> relationship (a foreign key) from a <b>derived</b> one (a roll-up through a path)',
      'Explain why <code>site_id</code> is <b>not</b> stored on invoices (transitive dependency, 3NF)',
      'Recognize that sites ↔ patients is <b>N : N</b>, not 1 : N, and count correctly',
      'Write roll-up queries that keep sites with no activity',
    ],
    concept: `<p>Our billing organization has a two-level place hierarchy:</p>
<ul>
  <li><b>sites</b>: a physical <i>facility or campus</i>, such as "St. Mary Medical Campus". A site has an address, a facility NPI and a tax ID. <b>One row per facility.</b></li>
  <li><b>treatment_locations</b>: a <i>care unit inside a site</i>, such as "St. Mary General Hospital" or "CareConnect Telehealth". Each location has exactly one site (<code>treatment_locations.site_id</code>, NOT NULL). <b>One row per unit.</b></li>
</ul>
<p>Invoices and practitioners point at a <b>location</b>, not at a site. So how do we get "revenue per site"? We follow the chain of foreign keys:</p>
<pre>invoices.location_id → treatment_locations.location_id
treatment_locations.site_id → sites.site_id</pre>
<p>Every step of that chain is <b>N : 1</b> (each invoice has one location, each location has one site). So each invoice <b>rolls up</b> to exactly one site, and <b>sites → invoices is a derived 1 : N</b>. The same holds for transactions and payments, which hang off invoices.</p>
<p>The link to <b>patients</b> is different. A patient can visit several sites, and a site sees many patients, so <b>sites ↔ patients is N : N</b>. The invoices table is the junction between them. In our data, 13 of the 20 patients with invoices were seen at two or more sites.</p>
<p>Open the diagram below: the <span style="color:var(--green)"><b>green long-dash</b></span> lines are the derived roll-ups. Click one to see a query that <i>proves</i> the 1 : N holds in the data.</p>`,
    why: 'Organizations report at several levels (unit, facility, company). Modelling the levels as separate tables keeps facility facts (address, NPI, tax ID) in one place, while every transaction is still traceable up to its facility.',
    when: 'Whenever you need numbers "per site": revenue, collections, outstanding balance, patient volume or staffing. Also whenever you are tempted to add a site_id column to a transaction table.',
    analogy: 'A hospital campus is like an apartment building and its departments are the apartments. Mail (invoices) is addressed to an apartment. You never write the building name on each letter separately: the apartment number already tells the post office which building it is in. If you did write both, a letter could one day say "apartment 4B" and "the wrong building".',
    exampleSql: `SELECT s.site_id, s.site_name, s.site_type, s.default_pos_code,
       tl.location_id, tl.location_name, tl.location_type
FROM sites s
LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id
ORDER BY s.site_id, tl.location_id;`,
    syntax: `-- roll a child table up to the site through its location
SELECT s.site_name, AGG(child.col)
FROM sites s
LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id
LEFT JOIN invoices i            ON i.location_id = tl.location_id
-- ... more child tables of invoices (payments, transactions)
GROUP BY s.site_id;`,
    sql: `SELECT s.site_name,
       COUNT(DISTINCT tl.location_id) AS locations,
       COUNT(DISTINCT i.invoice_id)   AS invoices,
       COUNT(DISTINCT i.patient_id)   AS patients,
       COALESCE(SUM(i.total_amount), 0) AS billed
FROM sites s
LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id
LEFT JOIN invoices i            ON i.location_id = tl.location_id
GROUP BY s.site_id
ORDER BY billed DESC, s.site_name;`,
    breakdown: [
      ['FROM sites s', 'Start from the "one" side (sites), so every site appears, even one with no activity.'],
      ['LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id', 'Step 1 of the path (1 : N). LEFT keeps Westlake Surgery Center, which has no locations yet.'],
      ['LEFT JOIN invoices i ON i.location_id = tl.location_id', 'Step 2 (1 : N). Each invoice attaches to the site of its location. LEFT keeps sites with no invoices, like Eastside.'],
      ['COUNT(DISTINCT i.patient_id) AS patients', 'DISTINCT matters: one patient has several invoices at the same site. It counts patients per site; the total across sites is NOT the number of patients (N : N).'],
      ['COALESCE(SUM(i.total_amount), 0)', 'SUM over no rows is NULL. COALESCE turns it into 0 for inactive sites.'],
      ['GROUP BY s.site_id', 'One output row per site. Grouping by the key (not the name) is safest.'],
    ],
    visual: { type: 'er', tables: ['sites', 'treatment_locations', 'practitioners', 'patients', 'invoices', 'payments', 'transactions'], focus: 'sites', layers: { rollup: true, nn: true, logical: false } },
    internals: `<p>The engine resolves a roll-up as ordinary joins: for each site it looks up locations (ideally through an index on <code>treatment_locations(site_id)</code>), then for each location looks up invoices (an index on <code>invoices(location_id)</code> helps). With a two-level hierarchy and small dimension tables this is cheap, so storing a redundant <code>site_id</code> "for speed" rarely pays off in a transactional database.</p>
<p>Because every step is N : 1 going upward, the derived relationship is guaranteed <b>functional</b>: invoice → location → site gives exactly one answer, so no uniqueness check is needed at query time.</p>`,
    mistakes: [
      { wrong: `-- "Let's just add site_id to invoices for convenience"
ALTER TABLE invoices ADD COLUMN site_id INTEGER REFERENCES sites(site_id);
UPDATE invoices SET site_id = 1;   -- someone fills it in wrong (or a location later moves)
SELECT i.invoice_id, i.site_id AS stored_site, tl.site_id AS true_site
FROM invoices i JOIN treatment_locations tl ON tl.location_id = i.location_id
WHERE i.site_id <> tl.site_id;`, why: 'Storing site_id on invoices duplicates a fact the location already determines (location_id → site_id). That is a <b>transitive dependency</b>, which breaks 3NF. The two copies can disagree, and here most invoices now claim the wrong site. Derive the site with a join, or expose it through a VIEW.', fix: `SELECT i.invoice_id, tl.site_id
FROM invoices i
JOIN treatment_locations tl ON tl.location_id = i.location_id
ORDER BY i.invoice_id;` },
      { wrong: `-- Treating sites → patients as 1 : N and adding up the per-site counts
SELECT SUM(patients) AS total_patients
FROM (SELECT COUNT(DISTINCT i.patient_id) AS patients
      FROM invoices i JOIN treatment_locations tl ON tl.location_id = i.location_id
      GROUP BY tl.site_id);`, why: 'This returns 38, but only 20 distinct patients have invoices. Patients who visit several sites are counted once per site, because sites ↔ patients is <b>N : N</b>. Count distinct patients across the whole set instead.', fix: `SELECT COUNT(DISTINCT patient_id) AS total_patients FROM invoices;` },
      { wrong: `SELECT s.site_name, SUM(i.total_amount) AS billed
FROM sites s
JOIN treatment_locations tl ON tl.site_id = s.site_id
JOIN invoices i ON i.location_id = tl.location_id
GROUP BY s.site_id;`, why: 'INNER JOINs silently drop Eastside Community Campus (no invoices yet) and Westlake Surgery Center (no locations). A site report usually needs every site, including zeros.', fix: `SELECT s.site_name, COALESCE(SUM(i.total_amount), 0) AS billed
FROM sites s
LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id
LEFT JOIN invoices i ON i.location_id = tl.location_id
GROUP BY s.site_id;` },
    ],
    rules: [
      'Store each fact once: the site belongs to the <b>location</b>, and invoices point to the location.',
      'A chain of N : 1 foreign keys gives a <b>derived 1 : N</b> roll-up: sites → invoices, transactions, payments.',
      'sites ↔ patients is <b>N : N</b> (through invoices). Never add up per-site patient counts.',
      'Start FROM sites and LEFT JOIN downward to keep sites with no activity.',
      'Aggregate child tables (payments, transactions) per invoice first, then roll up, to avoid fan-out double counting.',
    ],
    compare: `<table>
<tr><th>Option</th><th>How</th><th>Pros</th><th>Cons</th></tr>
<tr><td><b>Derive with joins</b> (our choice)</td><td>invoices → treatment_locations → sites</td><td>One source of truth, 3NF, no drift</td><td>One extra join in queries</td></tr>
<tr><td><b>VIEW</b></td><td><code>CREATE VIEW site_invoices AS SELECT … JOIN …</code></td><td>Queries stay short; still one source of truth</td><td>Another object to maintain</td></tr>
<tr><td><b>Stored site_id on invoices</b></td><td>Extra FK column</td><td>Slightly simpler, faster filters</td><td>Transitive dependency, values can drift, and moving a location means mass updates</td></tr>
<tr><td><b>Warehouse fact table</b></td><td>fact_charges carries site_key (denormalized on purpose)</td><td>Fast analytics, frozen history ("site at time of service")</td><td>Belongs in an analytics copy loaded by ETL, not in the live billing tables</td></tr>
</table>`,
    realWorld: 'Health systems report revenue, denials and A/R "by facility" for cost reports and leadership dashboards. Facility claims (UB-04) print the site\'s facility NPI and tax ID, found by rolling the encounter\'s unit up to its site. Payer contracts and place-of-service codes are often negotiated per facility too.',
    tips: ['When a question says "per site", sketch the path first: which table has the numbers, and which foreign keys lead from it up to sites?', 'Use the diagram\'s path finder (sites → payments) to generate the join chain, then add your GROUP BY.'],
    deep: `<p><b>Why this is a 3NF question.</b> In <code>invoices</code>, <code>invoice_id → location_id</code> and <code>location_id → site_id</code>. If <code>site_id</code> were also a column of invoices, then <code>invoice_id → site_id</code> would hold <i>through</i> a non-key attribute: a transitive dependency. 3NF says non-key columns must depend on the key directly, so site_id belongs in treatment_locations only.</p>
<p><b>History caveat.</b> If a location could move to another site, a live join reports <i>today's</i> site for old invoices. When "the site at time of service" matters, capture it deliberately: a slowly changing dimension in the warehouse, or a snapshot column set once at invoice creation and documented as historical, not as a second copy of the current truth.</p>`,
    tryIt: { prompt: 'Change the query to show <b>payments collected per site</b>: join payments to invoices and sum <code>pm.amount</code>. Keep every site, with 0 for sites that collected nothing.', starter: `SELECT s.site_name,
       COUNT(DISTINCT i.invoice_id) AS invoices
FROM sites s
LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id
LEFT JOIN invoices i            ON i.location_id = tl.location_id
GROUP BY s.site_id
ORDER BY s.site_id;` },
    challenge: {
      level: 2,
      prompt: 'List every site with its number of treatment locations and number of practitioners based there (practitioners.location_id → treatment_locations). Include sites with zero. Columns: site_name, locations, practitioners. Order by practitioners descending, then site_name.',
      solution: `SELECT s.site_name,
       COUNT(DISTINCT tl.location_id)     AS locations,
       COUNT(DISTINCT pr.practitioner_id) AS practitioners
FROM sites s
LEFT JOIN treatment_locations tl ON tl.site_id = s.site_id
LEFT JOIN practitioners pr       ON pr.location_id = tl.location_id
GROUP BY s.site_id
ORDER BY practitioners DESC, s.site_name;`,
      ordered: true,
      hints: ['Start FROM sites so that every site appears.', 'The path is sites → treatment_locations → practitioners, and both steps are 1 : N.', 'Use LEFT JOINs, and COUNT(DISTINCT ...) because the second join multiplies location rows.', 'GROUP BY s.site_id, then ORDER BY practitioners DESC, s.site_name.'],
    },
    quiz: [
      { q: 'Invoices point to a treatment location, and each location belongs to one site. What is the relationship between sites and invoices?', options: ['1 : 1', 'Derived 1 : N (one site, many invoices)', 'N : N', 'There is none'], answer: 1, why: 'Every step of invoices → locations → sites is N : 1, so each invoice rolls up to exactly one site, and a site has many invoices.' },
      { q: 'Why is site_id NOT stored on invoices?', options: ['SQLite does not allow it', 'It would be a transitive dependency (duplicate of location → site) that could drift out of sync', 'Invoices cannot have foreign keys', 'It would make invoices slower to insert'], answer: 1, why: 'The location already determines the site. Storing it again violates 3NF and allows contradictions.' },
      { q: 'Site A has 9 patients and site B has 8. How many distinct patients do the two sites have together?', options: ['Exactly 17', 'Somewhere from 9 to 17, because a patient can visit both sites', 'Exactly 9', 'It cannot be computed'], answer: 1, why: 'sites ↔ patients is N : N, so the sets can overlap. Use COUNT(DISTINCT patient_id) over both sites together.' },
    ],
  },
]);
