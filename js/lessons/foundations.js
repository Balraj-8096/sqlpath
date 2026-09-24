// Section 01: Foundational Concepts (foundations-01 .. foundations-23)
Lessons.add([
  // ---------------------------------------------------------------- 01
  {
    id: 'foundations-01',
    goals: [
      'What a database is, in plain words',
      'How a database differs from a spreadsheet or a folder of files',
      'What a DBMS (database engine) does for you',
      'How to ask the sample Healthcare Billing database a first question',
    ],
    concept: `<p>A <b>database</b> is an organized, permanent store of data that many people and programs can read and change safely at the same time.</p>
<p>The data is not just "saved"; it is <b>structured</b> (every invoice has the same fields), <b>connected</b> (an invoice points to a patient), and <b>protected</b> (rules stop you from saving an invoice with status <code>'Maybe'</code>).</p>
<p>You never touch the data files directly. You talk to a <b>DBMS</b> (Database Management System), such as SQLite, PostgreSQL, MySQL, SQL Server or Oracle, and you talk to it in <b>SQL</b>. You say <i>what</i> you want; the DBMS works out <i>how</i> to get it.</p>
<p>This course uses a <b>Healthcare Billing</b> database with 9 tables: sites, patients, payors (insurers), practitioners, treatment_locations, invoices, charges, payments and transactions.</p>`,
    why: 'Spreadsheets and loose files break down when many people edit the same data, when data must stay consistent, and when you have millions of rows. Databases solve sharing, consistency, safety and speed.',
    when: 'Any time data must be kept long-term, shared by several users or apps, kept consistent by rules, or searched quickly: patient records, claims, invoices, payments.',
    analogy: 'Think of the billing office records room. The shelves are tables, each folder is a row, and the form fields on every folder are columns. The records clerk (the DBMS) is the only one allowed into the room: you hand the clerk a request slip (SQL), and the clerk finds, files and guards the folders for you.',
    exampleSql: `SELECT name AS table_name FROM sqlite_master WHERE type = 'table' ORDER BY name;`,
    syntax: `SELECT column_list\nFROM table_name;`,
    sql: `SELECT 'patients' AS table_name, COUNT(*) AS row_count FROM patients
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'charges', COUNT(*) FROM charges
UNION ALL SELECT 'payments', COUNT(*) FROM payments;`,
    breakdown: [
      ["SELECT 'patients' AS table_name", 'A fixed text label so each result row says which table it describes'],
      ['COUNT(*) AS row_count', 'Ask the engine how many rows the table holds'],
      ['FROM patients', 'The table to read'],
      ['UNION ALL SELECT ...', 'Stack the answers for several tables into one result'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 220" width="100%" role="img" aria-label="Apps send SQL to the DBMS which manages the data files">
  <rect x="10" y="30" width="150" height="44" rx="8" fill="var(--panel2)" stroke="var(--border)"/><text x="85" y="57" text-anchor="middle" fill="var(--text)" font-size="13">Billing web app</text>
  <rect x="10" y="90" width="150" height="44" rx="8" fill="var(--panel2)" stroke="var(--border)"/><text x="85" y="117" text-anchor="middle" fill="var(--text)" font-size="13">Claims batch job</text>
  <rect x="10" y="150" width="150" height="44" rx="8" fill="var(--panel2)" stroke="var(--border)"/><text x="85" y="177" text-anchor="middle" fill="var(--text)" font-size="13">You (SQL editor)</text>
  <line x1="160" y1="52" x2="250" y2="105" stroke="var(--accent)" stroke-width="2"/><line x1="160" y1="112" x2="250" y2="112" stroke="var(--accent)" stroke-width="2"/><line x1="160" y1="172" x2="250" y2="120" stroke="var(--accent)" stroke-width="2"/>
  <text x="205" y="95" text-anchor="middle" fill="var(--accent)" font-size="11">SQL</text>
  <rect x="250" y="60" width="170" height="104" rx="10" fill="none" stroke="var(--accent)" stroke-width="2"/>
  <text x="335" y="88" text-anchor="middle" fill="var(--text)" font-size="14" font-weight="bold">DBMS</text>
  <text x="335" y="110" text-anchor="middle" fill="var(--muted)" font-size="11">parse, plan, execute</text>
  <text x="335" y="128" text-anchor="middle" fill="var(--muted)" font-size="11">enforce rules, locks</text>
  <text x="335" y="146" text-anchor="middle" fill="var(--muted)" font-size="11">crash recovery</text>
  <line x1="420" y1="112" x2="480" y2="112" stroke="var(--green)" stroke-width="2"/>
  <rect x="480" y="50" width="150" height="124" rx="8" fill="var(--panel2)" stroke="var(--green)"/>
  <text x="555" y="75" text-anchor="middle" fill="var(--text)" font-size="13" font-weight="bold">Data files</text>
  <text x="555" y="98" text-anchor="middle" fill="var(--muted)" font-size="11">patients</text><text x="555" y="116" text-anchor="middle" fill="var(--muted)" font-size="11">invoices, charges</text><text x="555" y="134" text-anchor="middle" fill="var(--muted)" font-size="11">payments</text><text x="555" y="152" text-anchor="middle" fill="var(--muted)" font-size="11">indexes, log</text>
</svg>` },
    internals: `<p>When you send a query, the DBMS <b>parses</b> the text, checks that tables and columns exist, builds a <b>plan</b> (which indexes to use, which order to read tables), then <b>executes</b> the plan by reading pages of data from disk or memory. Changes are written to a log first so a crash never leaves half-saved data. In this course the engine is SQLite compiled to WebAssembly, running inside your browser.</p>`,
    mistakes: [
      { wrong: `-- Keeping billing in a spreadsheet: one sheet per month, copy-pasted patient names`, why: 'Copies drift apart (one sheet says "Jon Smith", another "John Smith"), two people overwrite each other, and nothing stops bad values. A database stores each fact once and enforces rules.', fix: `SELECT patient_id, first_name, last_name FROM patients WHERE last_name = 'Smith';` },
      { wrong: `SELECT * FROM patient;`, why: 'The DBMS only knows the exact names in its catalog. The table is called patients (plural). Check the schema before guessing.', fix: `SELECT * FROM patients;` },
    ],
    rules: [
      'A database = structured data + relationships + rules + safe shared access.',
      'You never edit data files directly; the DBMS does it for you.',
      'SQL is declarative: describe the result you want, not the steps.',
    ],
    compare: `<table><tr><th></th><th>Spreadsheet</th><th>Database</th></tr>
<tr><td>Users at once</td><td>Few, conflicts common</td><td>Thousands, managed by locks and transactions</td></tr>
<tr><td>Rules</td><td>Optional, easy to bypass</td><td>Enforced (types, keys, CHECK)</td></tr>
<tr><td>Size</td><td>Slows at ~100k rows</td><td>Billions of rows with indexes</td></tr>
<tr><td>Relationships</td><td>Manual lookups</td><td>Keys and JOINs</td></tr></table>`,
    realWorld: 'Every hospital billing system, insurer claims platform and payment processor runs on a database. Your pharmacy history, your EOB statements and your card payments all live in database tables.',
    tips: ['Explore a new database by listing its tables first, then looking at a few rows of each.'],
    deep: `<p>Databases come in families: <b>relational</b> (tables + SQL, the focus of this course), document stores (MongoDB), key-value stores (Redis), wide-column (Cassandra) and graph databases (Neo4j). Relational databases dominate billing and finance because they give strong consistency guarantees (ACID) and powerful ad-hoc querying.</p>`,
    tryIt: { prompt: 'Add rows for the payors, practitioners and transactions tables to the count.', starter: `SELECT 'patients' AS table_name, COUNT(*) AS row_count FROM patients
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices;` },
    challenge: {
      level: 1,
      prompt: 'How many invoices does the billing database hold? Return a single number.',
      solution: `SELECT COUNT(*) FROM invoices;`,
      hints: ['The data lives in the invoices table.', 'You want one number: how many rows.', 'COUNT(*) counts rows.', 'SELECT COUNT(*) FROM invoices;'],
    },
    quiz: [
      { q: 'Which component actually reads and writes the data files?', options: ['The SQL editor', 'The DBMS (database engine)', 'The web browser', 'The spreadsheet'], answer: 1, why: 'Applications send SQL; only the DBMS touches the stored data.' },
      { q: 'SQL is called declarative because...', options: ['You declare variables first', 'You describe the result, and the engine decides how to get it', 'It only declares tables', 'It must be written in capital letters'], answer: 1, why: 'You state what you want; the optimizer chooses the steps.' },
    ],
  },

  // ---------------------------------------------------------------- 02
  {
    id: 'foundations-02',
    goals: [
      'What makes a database "relational"',
      'How tables are linked through shared key values',
      'Why data is split into several tables',
      'How a JOIN re-connects related rows',
    ],
    concept: `<p>A <b>relational database</b> stores data in <b>tables</b> (the math name is <i>relations</i>). Each table describes one kind of thing: patients, invoices, payors.</p>
<p>Tables are <b>linked by values</b>, not by pointers. An invoice row stores <code>patient_id = 2</code>; the patient with <code>patient_id = 2</code> is John Smith. That shared value is the relationship.</p>
<p>Because each fact is stored once (John's name lives only in <code>patients</code>), you combine tables at query time with a <b>JOIN</b>.</p>`,
    why: 'Storing each fact once avoids contradictions: if a patient changes their email, you update one row, not every invoice.',
    when: 'Whenever your data has several kinds of things that refer to each other: patients have invoices, invoices have charges, charges are performed by practitioners.',
    analogy: 'The billing office keeps a patient card file and a separate invoice binder. An invoice does not repeat the patient\'s whole address; it just says "Patient #2". Anyone can look up card #2 in the patient file. The number is the link.',
    exampleSql: `SELECT invoice_id, patient_id, invoice_date, total_amount FROM invoices LIMIT 6;`,
    syntax: `SELECT a.col, b.col\nFROM table_a a\nJOIN table_b b ON b.key = a.key;`,
    sql: `SELECT i.invoice_id, i.invoice_date, p.first_name, p.last_name, i.total_amount
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id
ORDER BY i.invoice_id
LIMIT 8;`,
    breakdown: [
      ['SELECT i.invoice_id, ..., p.first_name, p.last_name', 'Columns from two different tables in one result'],
      ['FROM invoices i', 'Start from invoices, nicknamed i'],
      ['JOIN patients p ON p.patient_id = i.patient_id', 'Match each invoice to the patient whose id it stores'],
      ['ORDER BY i.invoice_id LIMIT 8', 'Show the first 8 invoices in id order'],
    ],
    visual: { type: 'er', tables: ['patients', 'invoices', 'payors', 'treatment_locations'] },
    internals: `<p>The engine keeps each table in its own B-tree, keyed by the primary key. To answer a JOIN it loops over one table and, for each row, looks up the matching row in the other table, ideally through an index on the key (a fast tree search instead of reading the whole table).</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, first_name FROM invoices;`, why: 'first_name is not a column of invoices. It lives in patients, so you must JOIN to reach it.', fix: `SELECT i.invoice_id, p.first_name FROM invoices i JOIN patients p ON p.patient_id = i.patient_id;` },
      { wrong: `SELECT i.invoice_id, p.first_name FROM invoices i, patients p;`, why: 'Without a join condition every invoice is paired with every patient (48 x 25 = 1200 rows). The relationship must be stated.', fix: `SELECT i.invoice_id, p.first_name FROM invoices i JOIN patients p ON p.patient_id = i.patient_id;` },
    ],
    rules: [
      'One table per kind of thing.',
      'Rows are linked by matching key values.',
      'Store each fact once; JOIN to combine.',
    ],
    compare: `<p><b>Relational</b> databases link rows by values and use SQL. <b>Document</b> databases often nest related data inside one record (the invoice document contains a copy of the patient). Nesting is fast to read but copies drift apart; relational links stay consistent.</p>`,
    realWorld: 'Claims systems keep members, providers, claims and claim lines in separate tables linked by ids, then join them to build remittance reports.',
    deep: `<p>E. F. Codd introduced the relational model in 1970. A relation is a <i>set</i> of tuples: in theory rows have no order and no duplicates. SQL relaxes this (tables can hold duplicate rows, and results have an order only when you ask with ORDER BY).</p>`,
    tryIt: { prompt: 'Also show the name of the treatment location for each invoice (join treatment_locations on location_id).', starter: `SELECT i.invoice_id, p.last_name, i.total_amount
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id
LIMIT 8;` },
    challenge: {
      level: 1,
      prompt: 'List invoice_id and the patient last_name for every invoice from location 1, ordered by invoice_id.',
      solution: `SELECT i.invoice_id, p.last_name FROM invoices i JOIN patients p ON p.patient_id = i.patient_id WHERE i.location_id = 1 ORDER BY i.invoice_id;`,
      hints: ['The last name is in patients; the location is on invoices.', 'Join the tables on patient_id.', 'Filter with WHERE i.location_id = 1.', 'SELECT i.invoice_id, p.last_name FROM invoices i JOIN patients p ON p.patient_id = i.patient_id WHERE i.location_id = 1 ORDER BY i.invoice_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'In a relational database, how does an invoice "know" its patient?', options: ['It stores a copy of the patient row', 'It stores the patient\'s id value', 'Through a hidden memory pointer', 'By row position'], answer: 1, why: 'Relationships are expressed by matching values, such as patient_id.' },
      { q: 'Why not store the patient name on every invoice?', options: ['It is not allowed in SQL', 'Copies can become inconsistent when the name changes', 'Names are too long', 'Invoices cannot hold text'], answer: 1, why: 'Duplicated facts drift apart; storing once and joining keeps one source of truth.' },
    ],
  },

  // ---------------------------------------------------------------- 03
  {
    id: 'foundations-03',
    goals: ['The parts of a table: table, row, column, cell', 'What the schema (column definitions) is', 'Why every row has the same columns', 'How to pick columns and rows with SELECT'],
    concept: `<p>A <b>table</b> is a named grid. <b>Columns</b> are the fields (name and type fixed in advance). <b>Rows</b> are the records, one per real thing. A <b>cell</b> is one value where a row meets a column.</p>
<p>In <code>payors</code>, each row is one insurance company, and the columns are <code>payor_id, payor_name, payor_type, phone, contract_rate, is_active</code>. Every payor row has exactly those six fields; a missing value is stored as <code>NULL</code>.</p>
<p>The list of columns and their types is the table's <b>schema</b>. Rows come and go every day; the schema changes rarely.</p>`,
    why: 'A fixed structure makes data predictable: every program knows an invoice has a status and a total, so it can rely on them.',
    when: 'Always. Designing a table means deciding what one row represents and which columns describe it.',
    analogy: 'A claim form is the schema: it has printed boxes (columns). Each filled-in form is a row. A box left blank is NULL. The filing drawer holding all the forms of one kind is the table.',
    exampleTables: ['payors'],
    syntax: `SELECT column1, column2\nFROM table_name\nWHERE condition;`,
    sql: `SELECT payor_id, payor_name, payor_type, contract_rate
FROM payors
WHERE payor_type = 'Commercial';`,
    breakdown: [
      ['SELECT payor_id, payor_name, payor_type, contract_rate', 'Choose 4 of the 6 columns (vertical slice)'],
      ['FROM payors', 'The table: one row per insurance payor'],
      ["WHERE payor_type = 'Commercial'", 'Keep only some rows (horizontal slice)'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 210" width="100%" role="img" aria-label="Anatomy of a table">
  <text x="20" y="22" fill="var(--text)" font-size="13" font-weight="bold">Table: payors</text>
  <g font-size="12">
  <rect x="20" y="34" width="560" height="28" fill="var(--panel2)" stroke="var(--border)"/>
  <text x="30" y="53" fill="var(--accent)">payor_id</text><text x="120" y="53" fill="var(--accent)">payor_name</text><text x="280" y="53" fill="var(--accent)">payor_type</text><text x="400" y="53" fill="var(--accent)">phone</text><text x="510" y="53" fill="var(--accent)">rate</text>
  <rect x="20" y="62" width="560" height="26" fill="none" stroke="var(--border)"/>
  <text x="30" y="80" fill="var(--text)">1</text><text x="120" y="80" fill="var(--text)">BlueShield Health</text><text x="280" y="80" fill="var(--text)">Commercial</text><text x="400" y="80" fill="var(--text)">800-555-0101</text><text x="510" y="80" fill="var(--text)">0.80</text>
  <rect x="20" y="88" width="560" height="26" fill="none" stroke="var(--green)" stroke-width="2"/>
  <text x="30" y="106" fill="var(--text)">2</text><text x="120" y="106" fill="var(--text)">Aetna Care</text><text x="280" y="106" fill="var(--text)">Commercial</text><text x="400" y="106" fill="var(--text)">800-555-0102</text><text x="510" y="106" fill="var(--text)">0.75</text>
  <rect x="20" y="114" width="560" height="26" fill="none" stroke="var(--border)"/>
  <text x="30" y="132" fill="var(--text)">5</text><text x="120" y="132" fill="var(--text)">United Workers Comp</text><text x="280" y="132" fill="var(--text)">Workers Comp</text><rect x="395" y="117" width="90" height="20" fill="none" stroke="var(--yellow)" stroke-width="2"/><text x="400" y="132" fill="var(--yellow)">NULL</text><text x="510" y="132" fill="var(--text)">0.90</text>
  <rect x="273" y="34" width="110" height="106" fill="none" stroke="var(--blue)" stroke-width="2" stroke-dasharray="5 3"/>
  </g>
  <text x="585" y="106" fill="var(--green)" font-size="12">row</text>
  <text x="275" y="160" fill="var(--blue)" font-size="12">column (one field, one type)</text>
  <text x="395" y="180" fill="var(--yellow)" font-size="12">cell with no value = NULL</text>
  <text x="20" y="200" fill="var(--muted)" font-size="12">Header row = the schema (column names and types)</text>
</svg>` },
    internals: `<p>Physically, SQLite stores each row as a compact record inside a B-tree page (4 KB by default), keyed by its rowid (here the INTEGER PRIMARY KEY). Columns are not stored as separate files; a row's values sit together. Column-store engines (used in analytics) do the opposite and store each column together.</p>`,
    mistakes: [
      { wrong: `SELECT payor_name, phone1, phone2, phone3 FROM payors;`, why: 'A table has a fixed set of columns; "repeating" columns like phone1..phone3 are a design smell. Multiple values of the same kind belong in their own table (one row per phone).', fix: `SELECT payor_name, phone FROM payors;` },
      { wrong: `SELECT * FROM payors WHERE row = 3;`, why: 'Rows have no built-in position number. Identify a row by its key value.', fix: `SELECT * FROM payors WHERE payor_id = 3;` },
    ],
    rules: ['One row = one real thing.', 'Every row has the same columns.', 'A column holds one kind of value.', 'Use the key, not the position, to find a row.'],
    compare: `<table><tr><th>Everyday word</th><th>SQL word</th><th>Theory word</th></tr><tr><td>Sheet</td><td>Table</td><td>Relation</td></tr><tr><td>Record / line</td><td>Row</td><td>Tuple</td></tr><tr><td>Field</td><td>Column</td><td>Attribute</td></tr></table>`,
    realWorld: 'An EHR system has a table where each row is one encounter; its columns (date, provider, location, diagnosis codes) are the same for every visit.',
    tips: ['Before querying, ask: "What does one row of this table represent?"'],
    tryIt: { prompt: 'Show only payor_name and phone for all active payors (is_active = 1).', starter: `SELECT *
FROM payors;` },
    challenge: {
      level: 1,
      prompt: 'Show payor_name and contract_rate for payors whose contract_rate is at least 0.75, ordered by payor_name.',
      solution: `SELECT payor_name, contract_rate FROM payors WHERE contract_rate >= 0.75 ORDER BY payor_name;`,
      hints: ['Pick 2 columns from payors.', 'Filter rows with WHERE.', 'Use contract_rate >= 0.75.', 'SELECT payor_name, contract_rate FROM payors WHERE contract_rate >= 0.75 ORDER BY payor_name;'],
      ordered: true,
    },
    quiz: [
      { q: 'In the payors table, what is one row?', options: ['One insurance payor', 'One phone number', 'One column', 'All commercial payors'], answer: 0, why: 'Each row represents a single payor.' },
      { q: 'What is stored in a cell when the value is unknown?', options: ['0', "''", 'NULL', 'The word unknown'], answer: 2, why: 'NULL marks a missing or unknown value.' },
    ],
  },

  // ---------------------------------------------------------------- 04
  {
    id: 'foundations-04',
    goals: ['What a primary key is', 'The two rules: unique and never NULL', 'Natural vs surrogate keys', 'Why names make bad keys'],
    concept: `<p>A <b>primary key (PK)</b> is the column (or columns) whose value identifies exactly one row. <code>patient_id</code> is the PK of <code>patients</code>: patient 7 is one specific person, forever.</p>
<p>A primary key must be <b>unique</b> (no two rows share it) and <b>NOT NULL</b> (every row has one). It should also be <b>stable</b>: it never changes, because other tables point to it.</p>
<p>Most systems use a <b>surrogate key</b>: a meaningless number generated by the database. The alternative, a <b>natural key</b> made from real data (name + birth date), sounds nice but fails: our data has two different rows for "Maria Garcia, 1951-12-18" (patients 1 and 25).</p>`,
    why: 'Without a reliable identifier you cannot update, delete or link one specific row. "Update Maria Garcia\'s email" is ambiguous; "update patient 1" is not.',
    when: 'Every table should have a primary key. Choose it when you design the table.',
    analogy: 'A hospital gives every patient a Medical Record Number (MRN) at first registration. Names repeat, people move and marry, but the MRN stays the same, and every chart, lab and invoice refers to it.',
    exampleSql: `SELECT patient_id, first_name, last_name, date_of_birth FROM patients WHERE last_name = 'Garcia';`,
    syntax: `CREATE TABLE table_name (\n  id INTEGER PRIMARY KEY,\n  ...\n);`,
    sql: `SELECT patient_id, first_name, last_name, date_of_birth, city, email
FROM patients
WHERE first_name = 'Maria' AND last_name = 'Garcia';`,
    breakdown: [
      ['SELECT patient_id, ...', 'patient_id is the primary key: it differs even when everything else looks the same'],
      ['FROM patients', 'The patients table'],
      ["WHERE first_name = 'Maria' AND last_name = 'Garcia'", 'Searching by name returns two rows, proving a name cannot identify a patient'],
    ],
    visual: { type: 'keys', parent: 'patients', child: 'invoices', pk: 'patient_id', fk: 'patient_id' },
    internals: `<p>In SQLite, <code>INTEGER PRIMARY KEY</code> becomes an alias for the internal <b>rowid</b>: the table's B-tree is sorted by it, so <code>WHERE patient_id = 7</code> is a direct tree lookup. Other engines build a unique index on the PK (clustered in SQL Server/MySQL InnoDB, separate in PostgreSQL). Uniqueness is checked on every INSERT and UPDATE by looking the value up in that tree.</p>`,
    mistakes: [
      { wrong: `INSERT INTO patients (patient_id, first_name, last_name, date_of_birth) VALUES (1, 'Ana', 'Lopez', '1990-01-01');`, why: 'patient_id 1 already exists. The engine rejects it: UNIQUE constraint failed: patients.patient_id.', fix: `INSERT INTO patients (first_name, last_name, date_of_birth) VALUES ('Ana', 'Lopez', '1990-01-01');\nSELECT patient_id, first_name, last_name FROM patients ORDER BY patient_id DESC LIMIT 1;` },
      { wrong: `UPDATE patients SET email = 'new@mail.com' WHERE first_name = 'Maria' AND last_name = 'Garcia';`, why: 'This hits both Maria Garcia rows (1 and 25). Always target a single row by its primary key.', fix: `UPDATE patients SET email = 'new@mail.com' WHERE patient_id = 1;\nSELECT patient_id, email FROM patients WHERE patient_id IN (1, 25);` },
    ],
    rules: ['Exactly one primary key per table.', 'PK values are unique and never NULL.', 'Never change a PK value once other rows refer to it.', 'Prefer a surrogate id over names or other real-world data.'],
    compare: `<table><tr><th>Key</th><th>Example</th><th>Pros</th><th>Cons</th></tr><tr><td>Surrogate</td><td>patient_id = 7</td><td>Stable, short, fast</td><td>Means nothing on its own</td></tr><tr><td>Natural</td><td>npi, SSN, name+DOB</td><td>Meaningful</td><td>Can change, repeat or be missing</td></tr></table>`,
    realWorld: 'Claims reference members by a member id and providers by an internal provider id; the public NPI is stored too, but as a unique attribute, not the PK.',
    tips: ['If you omit the id on INSERT, SQLite assigns the next number for an INTEGER PRIMARY KEY.'],
    deep: `<p>Surrogate keys can be sequential integers (compact, index-friendly) or UUIDs (globally unique, safe to generate on many servers, but larger and randomly ordered, which fragments B-tree inserts). UUIDv7 puts a timestamp first to keep inserts mostly ordered.</p>`,
    tryIt: { prompt: 'Look up the single patient with primary key 25. Then try searching by name instead and compare.', starter: `SELECT * FROM patients WHERE patient_id = 25;` },
    challenge: {
      level: 2,
      prompt: 'Find name + date_of_birth combinations that appear on more than one patient row. Show first_name, last_name, date_of_birth and how many rows share them.',
      solution: `SELECT first_name, last_name, date_of_birth, COUNT(*) AS copies FROM patients GROUP BY first_name, last_name, date_of_birth HAVING COUNT(*) > 1;`,
      hints: ['You are testing whether name + DOB could be a key.', 'Group rows that share first_name, last_name and date_of_birth.', 'Keep only groups with more than one row: HAVING COUNT(*) > 1.', 'SELECT first_name, last_name, date_of_birth, COUNT(*) FROM patients GROUP BY first_name, last_name, date_of_birth HAVING COUNT(*) > 1;'],
    },
    quiz: [
      { q: 'Which two properties must every primary key value have?', options: ['Short and numeric', 'Unique and not NULL', 'Sorted and indexed', 'Text and uppercase'], answer: 1, why: 'Uniqueness and presence are the core PK guarantees.' },
      { q: 'Why is (first_name, last_name) a poor primary key for patients?', options: ['Text cannot be a key', 'Different people share names, and names change', 'It is too slow', 'SQL forbids two-column keys'], answer: 1, why: 'Our own data has two Maria Garcia rows; names are neither unique nor stable.' },
    ],
  },

  // ---------------------------------------------------------------- 05
  {
    id: 'foundations-05',
    goals: ['What a foreign key is', 'How it enforces referential integrity', 'Which side of a relationship holds the FK', 'What happens on insert/delete when the reference is broken'],
    concept: `<p>A <b>foreign key (FK)</b> is a column that stores the primary key of a row in another (or the same) table. <code>invoices.patient_id</code> is a foreign key to <code>patients.patient_id</code>.</p>
<p>Declaring it as a FK makes the database guarantee <b>referential integrity</b>: every invoice must point to a patient who really exists. You cannot insert an invoice for patient 999, and you cannot delete a patient who still has invoices.</p>
<p>The FK lives on the <b>"many" side</b>: one patient has many invoices, so the invoice holds the patient id. A FK can be NULL when the link is optional (<code>invoices.payor_id</code> is NULL for self-pay invoices).</p>`,
    why: 'Orphan rows (an invoice for a patient who does not exist) break reports and billing. The FK stops them at the door instead of relying on every app to be careful.',
    when: 'Whenever a column refers to a row of another table: invoice to patient, charge to invoice, charge to practitioner, practitioner to supervisor.',
    analogy: 'A referral slip must name a practitioner who is actually on staff. The front desk checks the staff list before accepting the slip, and HR cannot remove a doctor from the list while open referrals still name them.',
    exampleSql: `SELECT invoice_id, patient_id, payor_id, location_id FROM invoices LIMIT 6;`,
    syntax: `CREATE TABLE child (\n  child_id  INTEGER PRIMARY KEY,\n  parent_id INTEGER NOT NULL REFERENCES parent(parent_id)\n);`,
    sql: `SELECT p.patient_id, p.first_name, p.last_name,
       i.invoice_id, i.invoice_date, i.status
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id
WHERE p.patient_id IN (2, 3)
ORDER BY p.patient_id, i.invoice_id;`,
    breakdown: [
      ['FROM patients p', 'The parent table (holds the primary key)'],
      ['JOIN invoices i ON i.patient_id = p.patient_id', 'Follow the foreign key from each invoice back to its patient'],
      ['WHERE p.patient_id IN (2, 3)', 'Look at two patients to see one parent with many children'],
      ['ORDER BY p.patient_id, i.invoice_id', 'Group each patient\'s invoices together'],
    ],
    visual: { type: 'keys', parent: 'patients', child: 'invoices', pk: 'patient_id', fk: 'patient_id' },
    internals: `<p>With <code>PRAGMA foreign_keys = ON</code> (enabled in this course; SQLite has it off by default for backward compatibility), each INSERT or UPDATE on the child looks up the parent key, and each DELETE on the parent searches the child for references. That second search is why you should <b>index FK columns</b>: without an index, deleting a patient scans all invoices.</p>`,
    mistakes: [
      { wrong: `INSERT INTO invoices (patient_id, location_id, invoice_date, due_date, status, total_amount)\nVALUES (999, 1, '2026-09-01', '2026-10-01', 'Open', 100);`, why: 'There is no patient 999, so the engine refuses: FOREIGN KEY constraint failed.', fix: `INSERT INTO invoices (patient_id, location_id, invoice_date, due_date, status, total_amount)\nVALUES (9, 1, '2026-09-01', '2026-10-01', 'Open', 100);\nSELECT invoice_id, patient_id, status FROM invoices WHERE patient_id = 9;` },
      { wrong: `DELETE FROM patients WHERE patient_id = 2;`, why: 'Patient 2 still has invoices. Deleting them would orphan those invoices, so the FK blocks it.', fix: `DELETE FROM patients WHERE patient_id = 9;\nSELECT COUNT(*) AS patients_left FROM patients;` },
    ],
    rules: ['The FK goes on the many side.', 'An FK value must match an existing PK value, or be NULL if allowed.', 'Index your FK columns.', 'Decide what happens on delete: block (default), CASCADE or SET NULL.'],
    compare: `<table><tr><th></th><th>Primary key</th><th>Foreign key</th></tr><tr><td>Purpose</td><td>Identify this row</td><td>Point to another row</td></tr><tr><td>Unique?</td><td>Yes</td><td>No (many invoices share a patient_id)</td></tr><tr><td>NULL?</td><td>Never</td><td>Allowed if the link is optional</td></tr><tr><td>Per table</td><td>One</td><td>As many as needed</td></tr></table>`,
    realWorld: 'Payment posting systems reject a remittance line that references a claim id not in the system, which is a foreign key check in action.',
    deep: `<p>Referential actions: <code>ON DELETE CASCADE</code> (delete children too, good for invoice to charges), <code>ON DELETE SET NULL</code> (keep children, clear the link), <code>RESTRICT/NO ACTION</code> (block). Constraints can also be <code>DEFERRABLE INITIALLY DEFERRED</code>, checked at COMMIT instead of per statement, useful when inserting rows that reference each other.</p>`,
    tryIt: { prompt: 'This insert works because invoice 1 exists. Change invoice_id to 999, run it, and read the foreign key error.', starter: `INSERT INTO charges (invoice_id, practitioner_id, service_date, cpt_code, description, units, unit_price, amount)
VALUES (1, 2, '2026-09-01', '99213', 'Office visit', 1, 120, 120);
SELECT charge_id, invoice_id, cpt_code, amount FROM charges WHERE invoice_id = 1;` },
    challenge: {
      level: 2,
      prompt: 'Find the patients that no invoice refers to. Show patient_id, first_name and last_name ordered by patient_id.',
      solution: `SELECT p.patient_id, p.first_name, p.last_name FROM patients p LEFT JOIN invoices i ON i.patient_id = p.patient_id WHERE i.invoice_id IS NULL ORDER BY p.patient_id;`,
      hints: ['Start from patients, the parent side.', 'You want parents with no matching child row.', 'LEFT JOIN invoices and keep rows where the invoice side is NULL (or use NOT EXISTS).', 'SELECT p.patient_id, p.first_name, p.last_name FROM patients p LEFT JOIN invoices i ON i.patient_id = p.patient_id WHERE i.invoice_id IS NULL ORDER BY p.patient_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'One patient has many invoices. Where does the foreign key go?', options: ['patients.invoice_id', 'invoices.patient_id', 'Both tables', 'A third table'], answer: 1, why: 'The many side (invoices) stores the id of the one side.' },
      { q: 'With foreign keys enforced, what happens when you delete a patient who has invoices (default action)?', options: ['The invoices are deleted too', 'The delete is rejected', 'The invoices get patient_id NULL', 'Nothing special'], answer: 1, why: 'The default NO ACTION/RESTRICT blocks deletes that would leave orphans.' },
      { q: 'Can a foreign key column contain NULL?', options: ['Never', 'Yes, if the column allows NULL, meaning "no link"', 'Only in SQLite', 'Only when it is also a primary key'], answer: 1, why: 'invoices.payor_id is NULL for invoices without an insurer.' },
    ],
  },

  // ---------------------------------------------------------------- 06
  {
    id: 'foundations-06',
    goals: ['What a candidate key is', 'How the primary key is chosen from candidates', 'Alternate keys and UNIQUE constraints', 'How to test data for candidate-key behaviour'],
    concept: `<p>A <b>candidate key</b> is any column (or minimal set of columns) that <i>could</i> identify every row uniquely. A table can have several.</p>
<p>For <code>practitioners</code>: <code>practitioner_id</code> is one candidate, and <code>npi</code> (the national provider number) is another, since every licensed provider has a different NPI. For <code>payors</code>, both <code>payor_id</code> and <code>payor_name</code> are unique.</p>
<p>You pick <b>one</b> candidate as the primary key. The others become <b>alternate keys</b>, which you protect with a <code>UNIQUE</code> constraint so the database keeps them unique too.</p>
<p><b>Minimal</b> matters: (practitioner_id, last_name) is unique, but only because practitioner_id already is. That is a <i>superkey</i>, not a candidate key.</p>`,
    why: 'Identifying all candidate keys tells you which facts must never repeat, and which UNIQUE constraints to add.',
    when: 'During table design: list every column that should never repeat, pick the most stable as PK, make the rest UNIQUE.',
    analogy: 'A provider can be identified by the staff badge number, the NPI or the state license number. All are candidates. The billing system picks the badge number as its main id and still refuses two providers with the same NPI.',
    exampleSql: `SELECT practitioner_id, first_name, last_name, npi FROM practitioners;`,
    syntax: `CREATE TABLE t (\n  id   INTEGER PRIMARY KEY,   -- chosen candidate\n  code TEXT UNIQUE            -- alternate key\n);`,
    sql: `SELECT COUNT(*)                        AS total_rows,
       COUNT(DISTINCT practitioner_id) AS distinct_ids,
       COUNT(DISTINCT npi)             AS distinct_npis,
       COUNT(npi)                      AS npis_present,
       COUNT(DISTINCT last_name)       AS distinct_last_names
FROM practitioners;`,
    breakdown: [
      ['COUNT(*)', 'How many rows exist (12)'],
      ['COUNT(DISTINCT practitioner_id)', 'Equals the row count: a valid key'],
      ['COUNT(DISTINCT npi) / COUNT(npi)', 'NPI is unique where present, but one row has NULL (new hire), so it cannot be the PK yet'],
      ['COUNT(DISTINCT last_name)', 'If lower than the row count, last_name would not be a candidate key'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 170" width="100%" role="img" aria-label="Candidate keys of practitioners">
  <rect x="20" y="20" width="600" height="130" rx="10" fill="none" stroke="var(--border)"/>
  <text x="40" y="44" fill="var(--text)" font-size="13" font-weight="bold">Columns that could identify a practitioner</text>
  <rect x="40" y="60" width="170" height="70" rx="8" fill="var(--panel2)" stroke="var(--green)" stroke-width="2"/><text x="125" y="88" text-anchor="middle" fill="var(--green)" font-size="13" font-weight="bold">practitioner_id</text><text x="125" y="110" text-anchor="middle" fill="var(--muted)" font-size="11">chosen: PRIMARY KEY</text>
  <rect x="235" y="60" width="170" height="70" rx="8" fill="var(--panel2)" stroke="var(--blue)" stroke-width="2"/><text x="320" y="88" text-anchor="middle" fill="var(--blue)" font-size="13" font-weight="bold">npi</text><text x="320" y="110" text-anchor="middle" fill="var(--muted)" font-size="11">alternate: UNIQUE</text>
  <rect x="430" y="60" width="170" height="70" rx="8" fill="var(--panel2)" stroke="var(--red)" stroke-dasharray="5 3"/><text x="515" y="88" text-anchor="middle" fill="var(--red)" font-size="13" font-weight="bold">last_name</text><text x="515" y="110" text-anchor="middle" fill="var(--muted)" font-size="11">not a key: names repeat</text>
</svg>` },
    internals: `<p>Each declared UNIQUE constraint creates an index (in SQLite you can see it as <code>sqlite_autoindex_practitioners_1</code> in <code>sqlite_master</code>). The engine checks it on every write, and the optimizer can use it for fast lookups by NPI.</p>`,
    mistakes: [
      { wrong: `-- "Every row in today's data has a different last_name, so last_name is a key"`, why: 'A key is a rule about all possible data, not a coincidence in today\'s rows. Tomorrow a second Dr. Patel is hired.', fix: `SELECT last_name, COUNT(*) FROM practitioners GROUP BY last_name HAVING COUNT(*) > 1;` },
      { wrong: `-- Declaring (practitioner_id, npi) together as the key`, why: 'That is a superkey: practitioner_id alone is already unique. Candidate keys must be minimal.', fix: `SELECT practitioner_id, npi FROM practitioners;` },
    ],
    rules: ['A candidate key is unique and minimal.', 'Pick one as PK; enforce the others with UNIQUE.', 'Keys are rules about the business, not patterns in current data.'],
    compare: `<table><tr><th>Term</th><th>Meaning</th></tr><tr><td>Superkey</td><td>Any set of columns that is unique (may have extras)</td></tr><tr><td>Candidate key</td><td>A minimal superkey</td></tr><tr><td>Primary key</td><td>The candidate you choose</td></tr><tr><td>Alternate key</td><td>The candidates you did not choose (UNIQUE)</td></tr></table>`,
    realWorld: 'Provider directories use an internal provider id as PK but keep NPI and Tax ID unique so a provider cannot be enrolled twice.',
    tryIt: { prompt: 'Test whether patients.email could be a candidate key: compare COUNT(*), COUNT(email) and COUNT(DISTINCT email).', starter: `SELECT COUNT(*), COUNT(email), COUNT(DISTINCT email)
FROM patients;` },
    challenge: {
      level: 2,
      prompt: 'Test payor_name as a candidate key: return the total number of payors and the number of distinct payor names (two columns).',
      solution: `SELECT COUNT(*), COUNT(DISTINCT payor_name) FROM payors;`,
      hints: ['Compare the row count with the count of distinct values.', 'Both counts come from the payors table.', 'COUNT(DISTINCT col) ignores repeats.', 'SELECT COUNT(*), COUNT(DISTINCT payor_name) FROM payors;'],
    },
    quiz: [
      { q: 'What makes (practitioner_id, last_name) a superkey but not a candidate key?', options: ['It contains text', 'It is not minimal: practitioner_id alone is unique', 'It allows NULL', 'It is not indexed'], answer: 1, why: 'Removing last_name still leaves a unique set, so it is not minimal.' },
      { q: 'How do you enforce an alternate key?', options: ['A second PRIMARY KEY', 'A UNIQUE constraint', 'A CHECK constraint', 'A comment'], answer: 1, why: 'A table has one PK; other candidates are protected with UNIQUE.' },
    ],
  },

  // ---------------------------------------------------------------- 07
  {
    id: 'foundations-07',
    goals: ['What a composite (compound) key is', 'When one column is not enough to identify a row', 'Composite keys in junction tables', 'Why column order in a composite key matters'],
    concept: `<p>A <b>composite key</b> is a primary (or unique) key made of <b>two or more columns</b>. No single column is unique, but the combination is.</p>
<p>Example: a table that records which practitioners work at which locations. Practitioner 2 can work at several locations, and location 1 has several practitioners, but the <b>pair</b> (practitioner_id, location_id) appears once.</p>
<p>Composite keys are typical in <b>junction (bridge) tables</b> for many-to-many relationships, and in tables like "one row per payor per year" for fee schedules.</p>`,
    why: 'Sometimes the real-world identity of a fact is a combination: "this provider at this clinic" or "this payor\'s rate for this CPT code".',
    when: 'Junction tables, per-period tables (payor + year), and line items identified by (invoice_id, line_number).',
    analogy: 'A seat at a clinic\'s weekly schedule is identified by day + time slot. "Tuesday" is not unique and "9:00" is not unique, but "Tuesday 9:00" is exactly one slot.',
    exampleSql: `SELECT invoice_id, practitioner_id, COUNT(*) AS charge_rows FROM charges GROUP BY invoice_id, practitioner_id ORDER BY invoice_id LIMIT 8;`,
    syntax: `CREATE TABLE t (\n  a INTEGER,\n  b INTEGER,\n  PRIMARY KEY (a, b)\n);`,
    sql: `CREATE TABLE practitioner_locations (
  practitioner_id INTEGER REFERENCES practitioners(practitioner_id),
  location_id     INTEGER REFERENCES treatment_locations(location_id),
  days_per_week   INTEGER,
  PRIMARY KEY (practitioner_id, location_id)
);
INSERT INTO practitioner_locations VALUES (2, 1, 3), (2, 6, 2), (9, 1, 5), (4, 3, 4), (10, 3, 3);
SELECT pl.practitioner_id, pr.last_name, pl.location_id, pl.days_per_week
FROM practitioner_locations pl
JOIN practitioners pr ON pr.practitioner_id = pl.practitioner_id
ORDER BY pl.practitioner_id, pl.location_id;`,
    breakdown: [
      ['CREATE TABLE practitioner_locations (...)', 'A junction table linking practitioners and locations'],
      ['PRIMARY KEY (practitioner_id, location_id)', 'The pair is the key: each practitioner-location combination appears once'],
      ['INSERT ... (2, 1, 3), (2, 6, 2)', 'Practitioner 2 appears twice (different locations): allowed'],
      ['SELECT ... JOIN practitioners', 'Read the pairs back with names'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 190" width="100%" role="img" aria-label="Composite key">
  <text x="20" y="22" fill="var(--text)" font-size="13" font-weight="bold">practitioner_locations: key = (practitioner_id, location_id)</text>
  <g font-size="12">
  <rect x="20" y="34" width="360" height="26" fill="var(--panel2)" stroke="var(--border)"/><text x="30" y="52" fill="var(--accent)">practitioner_id</text><text x="160" y="52" fill="var(--accent)">location_id</text><text x="270" y="52" fill="var(--accent)">days</text>
  <rect x="20" y="60" width="360" height="24" fill="none" stroke="var(--border)"/><text x="30" y="77" fill="var(--text)">2</text><text x="160" y="77" fill="var(--text)">1</text><text x="270" y="77" fill="var(--text)">3</text>
  <rect x="20" y="84" width="360" height="24" fill="none" stroke="var(--border)"/><text x="30" y="101" fill="var(--text)">2</text><text x="160" y="101" fill="var(--text)">6</text><text x="270" y="101" fill="var(--text)">2</text>
  <rect x="20" y="108" width="360" height="24" fill="none" stroke="var(--border)"/><text x="30" y="125" fill="var(--text)">9</text><text x="160" y="125" fill="var(--text)">1</text><text x="270" y="125" fill="var(--text)">5</text>
  <rect x="20" y="136" width="360" height="24" fill="none" stroke="var(--red)" stroke-width="2"/><text x="30" y="153" fill="var(--red)">2</text><text x="160" y="153" fill="var(--red)">1</text><text x="270" y="153" fill="var(--red)">4</text>
  </g>
  <rect x="24" y="36" width="230" height="98" fill="none" stroke="var(--green)" stroke-width="2" stroke-dasharray="5 3"/>
  <text x="400" y="80" fill="var(--green)" font-size="12">2 repeats, 1 repeats...</text>
  <text x="400" y="98" fill="var(--green)" font-size="12">but each PAIR is unique</text>
  <text x="400" y="153" fill="var(--red)" font-size="12">(2, 1) again: rejected</text>
</svg>` },
    internals: `<p>A composite PK is stored as one index sorted by the first column, then the second (like a phone book sorted by last name, then first name). It helps queries filtering on <code>practitioner_id</code> alone or on both columns, but not on <code>location_id</code> alone. That "leftmost prefix" rule is why column order matters. In SQLite, a table whose PK is not a single INTEGER column keeps a hidden rowid plus a separate unique index for the key (unless declared WITHOUT ROWID).</p>`,
    mistakes: [
      { wrong: `CREATE TABLE pl (practitioner_id INTEGER PRIMARY KEY, location_id INTEGER PRIMARY KEY);`, why: 'Two PRIMARY KEY column clauses are an error ("has more than one primary key"). A composite key is declared once, at table level, listing both columns.', fix: `CREATE TABLE pl (practitioner_id INTEGER, location_id INTEGER, PRIMARY KEY (practitioner_id, location_id));\nSELECT name FROM sqlite_master WHERE name = 'pl';` },
      { wrong: `-- Using (invoice_id, practitioner_id) as the key of charges`, why: 'One practitioner can bill several lines on the same invoice (invoice 4 has 4 lines by practitioner 5), so the pair is not unique.', fix: `SELECT invoice_id, practitioner_id, COUNT(*) FROM charges GROUP BY invoice_id, practitioner_id HAVING COUNT(*) > 1 ORDER BY invoice_id;` },
    ],
    rules: ['Declare composite keys at table level: PRIMARY KEY (a, b).', 'Every column of the key is required to identify the row.', 'Put the most frequently filtered column first.'],
    compare: `<p><b>Composite natural key</b> (practitioner_id, location_id) vs <b>surrogate id + UNIQUE(practitioner_id, location_id)</b>: both prevent duplicates. The surrogate is easier for other tables to reference (one column instead of two), so many teams add it once other tables need to point to the row.</p>`,
    realWorld: 'Payor fee schedules are often keyed by (payor_id, cpt_code, effective_year); credentialing tables by (practitioner_id, payor_id).',
    tryIt: { prompt: 'Run the whole script, then add a line inserting (2, 1, 4) and watch the composite key reject it.', starter: `CREATE TABLE practitioner_locations (
  practitioner_id INTEGER, location_id INTEGER, days_per_week INTEGER,
  PRIMARY KEY (practitioner_id, location_id)
);
INSERT INTO practitioner_locations VALUES (2, 1, 3), (2, 6, 2), (9, 1, 5);
SELECT * FROM practitioner_locations;` },
    challenge: {
      level: 2,
      prompt: 'Prove (invoice_id, practitioner_id) is NOT a valid key for charges: list each pair that appears more than once with its count, ordered by invoice_id, then practitioner_id.',
      solution: `SELECT invoice_id, practitioner_id, COUNT(*) AS n FROM charges GROUP BY invoice_id, practitioner_id HAVING COUNT(*) > 1 ORDER BY invoice_id, practitioner_id;`,
      hints: ['Group charges by both columns together.', 'Count rows in each group.', 'Keep groups with HAVING COUNT(*) > 1.', 'SELECT invoice_id, practitioner_id, COUNT(*) FROM charges GROUP BY invoice_id, practitioner_id HAVING COUNT(*) > 1 ORDER BY invoice_id, practitioner_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'With PRIMARY KEY (practitioner_id, location_id), which insert fails if (2, 1) exists?', options: ['(2, 6)', '(3, 1)', '(2, 1)', '(1, 2)'], answer: 2, why: 'Only the exact same pair is a duplicate.' },
      { q: 'A composite index on (practitioner_id, location_id) is most useful for filtering on...', options: ['location_id only', 'practitioner_id, or both columns', 'days_per_week', 'Any column equally'], answer: 1, why: 'Indexes serve the leftmost prefix of their columns.' },
    ],
  },

  // ---------------------------------------------------------------- 08
  {
    id: 'foundations-08',
    goals: ['What a UNIQUE constraint does', 'How UNIQUE differs from PRIMARY KEY', 'How UNIQUE treats NULL', 'Finding duplicates before adding a UNIQUE rule'],
    concept: `<p>A <b>unique key</b> (UNIQUE constraint) guarantees that no two rows share the same value in a column or column set. In our schema, <code>payors.payor_name</code> and <code>practitioners.npi</code> are UNIQUE.</p>
<p>Differences from a primary key: a table can have <b>many</b> UNIQUE constraints but only one PK, and UNIQUE columns may hold <b>NULL</b>. Because NULL means "unknown", two NULLs are not considered equal, so several rows may have NULL in a UNIQUE column (standard SQL; SQL Server is the famous exception and allows only one NULL).</p>
<p>New hire Leo Martins has no NPI yet: his <code>npi</code> is NULL, and that is allowed.</p>`,
    why: 'Business identifiers such as NPI, email, or payor name must not repeat, even though they are not the primary key.',
    when: 'For every alternate key: government ids, login emails, external reference numbers, codes.',
    analogy: 'Each insurance card number must belong to one member. Applicants still waiting for a card have "no number yet", and many applicants can be in that state at once.',
    exampleSql: `SELECT practitioner_id, first_name, last_name, npi FROM practitioners ORDER BY practitioner_id DESC LIMIT 4;`,
    syntax: `column_name TYPE UNIQUE\n-- or, for several columns:\nUNIQUE (col_a, col_b)`,
    sql: `SELECT practitioner_id, first_name, last_name, npi,
       CASE WHEN npi IS NULL THEN 'no NPI yet (allowed)' ELSE 'unique NPI' END AS npi_status
FROM practitioners
ORDER BY practitioner_id;`,
    breakdown: [
      ['SELECT ..., npi', 'The UNIQUE column'],
      ['CASE WHEN npi IS NULL THEN ...', 'Label the row that has no NPI: UNIQUE does not forbid NULL'],
      ['FROM practitioners ORDER BY practitioner_id', 'All 12 practitioners in id order'],
    ],
    internals: `<p>UNIQUE is implemented with a unique index. On INSERT/UPDATE the engine searches the index for the new value; if found (and not NULL) it aborts the statement with "UNIQUE constraint failed". NULLs are skipped by this check. PostgreSQL 15+ offers <code>UNIQUE NULLS NOT DISTINCT</code> to treat NULLs as equal.</p>`,
    mistakes: [
      { wrong: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Aetna Care', 'Commercial', 0.7);`, why: 'payor_name is UNIQUE and Aetna Care already exists, so the insert is rejected.', fix: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Aetna Care PPO', 'Commercial', 0.7);\nSELECT payor_id, payor_name FROM payors ORDER BY payor_id;` },
      { wrong: `INSERT INTO practitioners (first_name, last_name, specialty, npi, hire_date) VALUES ('Ivy', 'Stone', 'Radiology', '1003001008', '2026-09-01');`, why: 'NPI 1003001008 belongs to Tom Walsh. Duplicated provider numbers would send payments to the wrong provider.', fix: `INSERT INTO practitioners (first_name, last_name, specialty, npi, hire_date) VALUES ('Ivy', 'Stone', 'Radiology', NULL, '2026-09-01');\nSELECT practitioner_id, last_name, npi FROM practitioners WHERE npi IS NULL;` },
    ],
    rules: ['Many UNIQUE constraints per table are fine.', 'UNIQUE allows NULL (and usually several NULLs).', 'Check for existing duplicates before adding a UNIQUE constraint.'],
    compare: `<table><tr><th></th><th>PRIMARY KEY</th><th>UNIQUE</th></tr><tr><td>How many per table</td><td>1</td><td>Many</td></tr><tr><td>NULL allowed</td><td>No</td><td>Yes</td></tr><tr><td>Referenced by FKs</td><td>Usually</td><td>Possible</td></tr><tr><td>Creates an index</td><td>Yes</td><td>Yes</td></tr></table>`,
    realWorld: 'Patient portals keep login email UNIQUE; clearinghouses keep claim control numbers UNIQUE to reject resubmitted duplicates.',
    tryIt: { prompt: 'Insert two practitioners with NULL npi and confirm both are accepted.', starter: `INSERT INTO practitioners (first_name, last_name, specialty, npi, hire_date) VALUES ('Ivy', 'Stone', 'Radiology', NULL, '2026-09-01');
SELECT practitioner_id, last_name, npi FROM practitioners WHERE npi IS NULL;` },
    challenge: {
      level: 2,
      prompt: 'Before adding a UNIQUE constraint on patients.email, check whether it is safe: return how many patients have an email and how many distinct emails exist (two numbers). If they match, there are no duplicates.',
      solution: `SELECT COUNT(email), COUNT(DISTINCT email) FROM patients;`,
      hints: ['COUNT(column) skips NULLs.', 'COUNT(DISTINCT column) counts different non-NULL values.', 'If both numbers match, the column is safe to make UNIQUE.', 'SELECT COUNT(email), COUNT(DISTINCT email) FROM patients;'],
    },
    quiz: [
      { q: 'Can two practitioners both have npi = NULL under a UNIQUE constraint (standard SQL, SQLite)?', options: ['No', 'Yes, NULLs are not equal to each other', 'Only if one is inactive', 'Only in a transaction'], answer: 1, why: 'NULL means unknown; two unknowns are not treated as duplicates.' },
      { q: 'How many UNIQUE constraints can a table have?', options: ['Zero', 'One', 'As many as needed', 'Two'], answer: 2, why: 'Only the primary key is limited to one.' },
    ],
  },

  // ---------------------------------------------------------------- 09
  {
    id: 'foundations-09',
    goals: ['The main SQL data types: integer, decimal, text, date, boolean', 'How SQLite stores types (type affinity)', 'Why money and dates need care', 'How to inspect a value\'s type with typeof()'],
    concept: `<p>Each column has a <b>data type</b> that says what kind of value it holds: whole numbers (<code>INTEGER</code>), numbers with decimals (<code>REAL</code>, <code>DECIMAL/NUMERIC</code>), text (<code>TEXT</code>, <code>VARCHAR(n)</code>), dates (<code>DATE</code>, <code>TIMESTAMP</code>) and true/false (<code>BOOLEAN</code>).</p>
<p>Types matter because they decide what operations make sense (you can add amounts, not names), how values sort ('10' sorts before '9' as text!) and how much space they take.</p>
<p><b>SQLite is flexible</b>: it uses <i>type affinity</i>, meaning a column prefers a type but values carry their own type. It has only 5 storage classes: NULL, INTEGER, REAL, TEXT, BLOB. Dates are stored as ISO text like <code>'2026-09-01'</code>, and booleans as 0/1 (see <code>payors.is_active</code>). Other engines are strict and reject the wrong type.</p>`,
    why: 'The right type protects data (no letters in amounts), makes sorting and math correct, and saves space.',
    when: 'Whenever you create a column. Also when reading: know the type before comparing or doing math.',
    analogy: 'A claim form has boxes for dates (MM/DD/YYYY), dollar amounts (with cents) and codes. Writing "yesterday" in the date box or "a lot" in the amount box makes the claim unprocessable.',
    exampleSql: `SELECT invoice_id, invoice_date, status, total_amount FROM invoices LIMIT 5;`,
    syntax: `CREATE TABLE t (\n  id      INTEGER,\n  amount  NUMERIC(10,2),\n  label   VARCHAR(50),\n  created DATE,\n  active  BOOLEAN\n);`,
    sql: `SELECT invoice_id,   typeof(invoice_id)   AS id_type,
       invoice_date, typeof(invoice_date) AS date_type,
       total_amount, typeof(total_amount) AS amount_type,
       julianday('2026-09-01') - julianday(invoice_date) AS days_old
FROM invoices
LIMIT 5;`,
    breakdown: [
      ['typeof(invoice_id)', 'SQLite function returning the storage class of a value: integer'],
      ['typeof(invoice_date)', 'Dates are stored as text in SQLite'],
      ['typeof(total_amount)', 'Money is stored as real (floating point) in this sample'],
      ["julianday('2026-09-01') - julianday(invoice_date)", 'Date functions turn ISO text into numbers so you can do date math'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 170" width="100%" role="img" aria-label="Data type families">
  <g font-size="12">
  <rect x="10" y="20" width="118" height="130" rx="8" fill="var(--panel2)" stroke="var(--blue)"/><text x="69" y="42" text-anchor="middle" fill="var(--blue)" font-weight="bold">Integer</text><text x="69" y="66" text-anchor="middle" fill="var(--text)">patient_id</text><text x="69" y="86" text-anchor="middle" fill="var(--text)">units</text><text x="69" y="126" text-anchor="middle" fill="var(--muted)">INT, BIGINT</text>
  <rect x="136" y="20" width="118" height="130" rx="8" fill="var(--panel2)" stroke="var(--green)"/><text x="195" y="42" text-anchor="middle" fill="var(--green)" font-weight="bold">Decimal</text><text x="195" y="66" text-anchor="middle" fill="var(--text)">total_amount</text><text x="195" y="86" text-anchor="middle" fill="var(--text)">contract_rate</text><text x="195" y="126" text-anchor="middle" fill="var(--muted)">NUMERIC, REAL</text>
  <rect x="262" y="20" width="118" height="130" rx="8" fill="var(--panel2)" stroke="var(--purple)"/><text x="321" y="42" text-anchor="middle" fill="var(--purple)" font-weight="bold">Text</text><text x="321" y="66" text-anchor="middle" fill="var(--text)">last_name</text><text x="321" y="86" text-anchor="middle" fill="var(--text)">cpt_code</text><text x="321" y="126" text-anchor="middle" fill="var(--muted)">VARCHAR, TEXT</text>
  <rect x="388" y="20" width="118" height="130" rx="8" fill="var(--panel2)" stroke="var(--yellow)"/><text x="447" y="42" text-anchor="middle" fill="var(--yellow)" font-weight="bold">Date/Time</text><text x="447" y="66" text-anchor="middle" fill="var(--text)">invoice_date</text><text x="447" y="86" text-anchor="middle" fill="var(--text)">hire_date</text><text x="447" y="126" text-anchor="middle" fill="var(--muted)">DATE, TIMESTAMP</text>
  <rect x="514" y="20" width="118" height="130" rx="8" fill="var(--panel2)" stroke="var(--red)"/><text x="573" y="42" text-anchor="middle" fill="var(--red)" font-weight="bold">Boolean</text><text x="573" y="66" text-anchor="middle" fill="var(--text)">is_active</text><text x="573" y="126" text-anchor="middle" fill="var(--muted)">BOOLEAN / 0-1</text>
  </g>
</svg>` },
    internals: `<p>SQLite decides a column's <b>affinity</b> from words in its declared type: contains "INT" gives INTEGER affinity, "CHAR/TEXT" gives TEXT, "REAL/FLOA/DOUB" gives REAL, otherwise NUMERIC. When you insert '42' into an INTEGER column, it converts it to the integer 42; when you insert 'abc', it stores text anyway. <code>STRICT</code> tables (SQLite 3.37+) enforce types like other engines. <code>REAL</code> is a binary floating point number, so 0.1 + 0.2 is not exactly 0.3; production billing uses <code>NUMERIC(12,2)</code> or integer cents.</p>`,
    mistakes: [
      { wrong: `SELECT SUM(cpt_code) FROM charges;`, why: 'Codes like CPT 99214 look numeric but are identifiers: some start with letters or zeros (G0438, 0001U). Store them as TEXT and never do math on them.', fix: `SELECT DISTINCT cpt_code, typeof(cpt_code) FROM charges ORDER BY cpt_code;` },
      { wrong: `SELECT invoice_id, invoice_date FROM invoices WHERE invoice_date > '9/1/2025';`, why: 'Dates stored as text only compare correctly in ISO format YYYY-MM-DD. "9/1/2025" compares character by character and gives nonsense.', fix: `SELECT invoice_id, invoice_date FROM invoices WHERE invoice_date > '2025-09-01' ORDER BY invoice_date;` },
    ],
    rules: ['Use integer ids, exact decimals for money, text for codes.', 'Store dates in ISO format (YYYY-MM-DD) or real date types.', 'Numbers that are identifiers (CPT, NPI, ZIP) are text.', 'SQLite is loose with types; other engines are strict.'],
    compare: `<table><tr><th>Concept</th><th>SQLite</th><th>PostgreSQL</th><th>SQL Server</th></tr><tr><td>Money</td><td>REAL / integer cents</td><td>NUMERIC(12,2)</td><td>DECIMAL(12,2)</td></tr><tr><td>Date</td><td>TEXT 'YYYY-MM-DD'</td><td>DATE</td><td>DATE</td></tr><tr><td>Boolean</td><td>INTEGER 0/1</td><td>BOOLEAN</td><td>BIT</td></tr><tr><td>Text</td><td>TEXT</td><td>TEXT / VARCHAR(n)</td><td>NVARCHAR(n)</td></tr></table>`,
    realWorld: 'Billing systems store amounts as DECIMAL to avoid rounding drift across millions of claim lines; NPIs and ZIP codes are CHAR/VARCHAR to keep leading zeros.',
    deep: `<p>Floating point surprises: <code>SELECT 0.1 + 0.2 = 0.3</code> returns 0 in SQLite. Summing thousands of REAL amounts can drift by fractions of a cent. Round at the edges (<code>ROUND(x, 2)</code>) or store integer cents.</p>`,
    tryIt: { prompt: "Run SELECT 0.1 + 0.2 = 0.3, typeof('2026-09-01'), typeof(1), typeof(1.5), typeof(NULL) and see what SQLite reports.", starter: `SELECT 0.1 + 0.2 = 0.3 AS exact, typeof('2026-09-01'), typeof(1), typeof(1.5), typeof(NULL);` },
    challenge: {
      level: 2,
      prompt: 'Show each storage type found in practitioners.npi and how many rows have it (columns: type, count), ordered by type.',
      solution: `SELECT typeof(npi) AS t, COUNT(*) FROM practitioners GROUP BY typeof(npi) ORDER BY t;`,
      hints: ['typeof(npi) returns the storage class of each value.', 'Group by that expression.', 'COUNT(*) per group.', 'SELECT typeof(npi) AS t, COUNT(*) FROM practitioners GROUP BY typeof(npi) ORDER BY t;'],
      ordered: true,
    },
    quiz: [
      { q: 'Why store CPT codes as TEXT?', options: ['Text is faster', 'They are identifiers that may contain letters or leading zeros', 'SQLite has no integers', 'To save space'], answer: 1, why: 'Codes are labels, not quantities.' },
      { q: 'In SQLite, how are the dates in this database stored?', options: ['DATE type', 'ISO text YYYY-MM-DD', 'Unix seconds', 'BLOB'], answer: 1, why: 'SQLite has no DATE storage class; ISO text sorts and compares correctly.' },
      { q: 'Which type is best for money in PostgreSQL?', options: ['REAL', 'FLOAT', 'NUMERIC(12,2)', 'TEXT'], answer: 2, why: 'NUMERIC is exact decimal arithmetic.' },
    ],
  },

  // ---------------------------------------------------------------- 10
  {
    id: 'foundations-10',
    goals: ['The main constraints: NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY, CHECK, DEFAULT', 'Where constraints are declared', 'What happens when a constraint is violated', 'Why constraints belong in the database, not only in the app'],
    concept: `<p><b>Constraints</b> are rules the database enforces on every write. If a statement would break a rule, the whole statement is rejected and the data stays unchanged.</p>
<ul>
<li><b>NOT NULL</b>: a value is required (<code>invoice_date</code>).</li>
<li><b>UNIQUE</b>: no duplicates (<code>payor_name</code>).</li>
<li><b>PRIMARY KEY</b>: unique + not null identifier.</li>
<li><b>FOREIGN KEY</b>: must reference an existing row.</li>
<li><b>CHECK</b>: any true/false rule (<code>status IN ('Open','Paid','Partially Paid','Overdue','Void')</code>).</li>
<li><b>DEFAULT</b>: value used when none is given (<code>is_active</code> defaults to 1).</li>
</ul>`,
    why: 'Apps have bugs, scripts skip validation, analysts run manual updates. Constraints are the last line of defence that keeps every path honest.',
    when: 'Declare them when creating tables; add more as you discover business rules (amount must be positive, due date after invoice date).',
    analogy: 'The claims scrubber at a clearinghouse rejects a claim with no member id, an unknown provider or an invalid status code before it ever reaches the payor. Constraints are the database\'s built-in scrubber.',
    exampleSql: `SELECT sql FROM sqlite_master WHERE name = 'invoices';`,
    syntax: `CREATE TABLE t (\n  id     INTEGER PRIMARY KEY,\n  name   TEXT NOT NULL UNIQUE,\n  status TEXT NOT NULL CHECK (status IN ('A','B')),\n  amount REAL NOT NULL DEFAULT 0 CHECK (amount >= 0),\n  parent INTEGER REFERENCES parent(id)\n);`,
    sql: `SELECT status, COUNT(*) AS invoices, MIN(total_amount) AS smallest, MAX(total_amount) AS largest
FROM invoices
GROUP BY status
ORDER BY status;`,
    breakdown: [
      ['SELECT status, COUNT(*)', 'Only the 5 statuses allowed by the CHECK constraint can appear'],
      ['MIN(total_amount), MAX(total_amount)', 'NOT NULL DEFAULT 0 guarantees every invoice has an amount'],
      ['GROUP BY status ORDER BY status', 'One row per status'],
    ],
    visual: { type: 'flow', steps: [['INSERT / UPDATE arrives', 'new row values'], ['DEFAULT', 'fill in missing values'], ['NOT NULL + type', 'required values present?'], ['CHECK', 'business rules true (or unknown)?'], ['PRIMARY KEY / UNIQUE', 'no duplicate in the index?'], ['FOREIGN KEY', 'referenced row exists?'], ['Row written', 'or the whole statement is rejected']] },
    internals: `<p>NOT NULL and CHECK are evaluated on the new row alone (cheap). UNIQUE/PK need an index lookup. FOREIGN KEY needs a lookup in another table. If any check fails, the statement is undone as a unit (statement-level atomicity), even if it touched many rows. Note: a CHECK passes when its expression is NULL (unknown), so <code>CHECK (amount > 0)</code> does not reject NULL amounts; add NOT NULL too.</p>`,
    mistakes: [
      { wrong: `UPDATE invoices SET status = 'Pending' WHERE invoice_id = 1;`, why: "'Pending' is not in the CHECK list, so the update fails: CHECK constraint failed.", fix: `UPDATE invoices SET status = 'Overdue' WHERE invoice_id = 1;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 1;` },
      { wrong: `INSERT INTO patients (first_name, last_name) VALUES ('Sam', 'Reed');`, why: 'date_of_birth is NOT NULL and has no default, so the insert fails.', fix: `INSERT INTO patients (first_name, last_name, date_of_birth) VALUES ('Sam', 'Reed', '1988-04-02');\nSELECT patient_id, first_name, last_name FROM patients WHERE last_name = 'Reed';` },
      { wrong: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Humana', 'Commercial', 0.7);\n-- and then worrying is_active is NULL`, why: 'is_active has DEFAULT 1, so omitted values become 1, not NULL.', fix: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Humana', 'Commercial', 0.7);\nSELECT payor_name, is_active FROM payors WHERE payor_name = 'Humana';` },
    ],
    rules: ['Put rules in the database; apps come and go.', 'CHECK passes on NULL, so pair it with NOT NULL.', 'A violation rejects the whole statement.', 'DEFAULT applies only when the column is omitted.'],
    compare: `<p><b>Constraint vs application validation:</b> app checks give friendly messages; constraints guarantee correctness for every writer. Use both. <b>Constraint vs trigger:</b> triggers can enforce complex cross-row rules but are harder to reason about; prefer declarative constraints first.</p>`,
    realWorld: 'A CHECK that payments are positive and a FK from payments to invoices stop a bad bank-file import from posting money to invoices that do not exist.',
    tryIt: { prompt: 'This valid insert succeeds. Now change the status to "Draft", or patient_id to 999, or remove invoice_date, and see which constraint rejects it.', starter: `INSERT INTO invoices (patient_id, location_id, invoice_date, due_date, status, total_amount)
VALUES (2, 1, '2026-09-01', '2026-10-01', 'Open', 50);
SELECT invoice_id, patient_id, status, total_amount FROM invoices ORDER BY invoice_id DESC LIMIT 1;` },
    challenge: {
      level: 1,
      prompt: 'List the distinct invoice statuses currently used, in alphabetical order. (These are the values the CHECK constraint allows.)',
      solution: `SELECT DISTINCT status FROM invoices ORDER BY status;`,
      hints: ['The status column is on invoices.', 'You want each value once.', 'Use SELECT DISTINCT.', 'SELECT DISTINCT status FROM invoices ORDER BY status;'],
      ordered: true,
    },
    quiz: [
      { q: 'CHECK (total_amount >= 0) and a row with total_amount NULL. What happens?', options: ['Rejected', 'Accepted: CHECK only rejects FALSE, and NULL >= 0 is UNKNOWN', 'Converted to 0', 'Error for NULL types'], answer: 1, why: 'CHECK fails only on FALSE. Use NOT NULL to forbid NULLs.' },
      { q: 'Which constraint supplies a value when an INSERT omits the column?', options: ['NOT NULL', 'CHECK', 'DEFAULT', 'UNIQUE'], answer: 2, why: 'DEFAULT fills in omitted columns.' },
    ],
  },

  // ---------------------------------------------------------------- 11
  {
    id: 'foundations-11',
    goals: ['What NULL means (unknown / missing)', 'Why = NULL never matches', 'Three-valued logic: TRUE, FALSE, UNKNOWN', 'How NULL affects math, comparisons and COUNT'],
    concept: `<p><b>NULL</b> is a marker for "no value": unknown, not applicable, or not yet entered. It is <b>not</b> zero, not an empty string and not "false".</p>
<p>Any comparison with NULL gives <b>UNKNOWN</b>, not TRUE or FALSE: <code>city = NULL</code> is unknown, and even <code>NULL = NULL</code> is unknown. WHERE keeps only rows where the condition is TRUE, so <code>WHERE city = NULL</code> returns nothing. Use <code>IS NULL</code> and <code>IS NOT NULL</code>.</p>
<p>Math with NULL gives NULL (<code>100 + NULL</code> is NULL). Aggregates like SUM, AVG and COUNT(column) <b>skip</b> NULLs; COUNT(*) counts rows.</p>
<p>In our data: 6 patients have no city, 6 have no email, 3 have no primary payor, and self-pay invoices have NULL payor_id.</p>`,
    why: 'Real data is incomplete. NULL lets the database say "we do not know" instead of inventing a fake value like 0 or "N/A".',
    when: 'Whenever a value may legitimately be missing: optional phone, unknown allergies, uninsured patients, an invoice not yet paid.',
    analogy: 'An intake form with the allergies box left blank. Blank does not mean "no allergies" (that would be written as "None"); it means nobody asked or the patient did not answer. Two blank forms do not prove two patients have the same allergies.',
    exampleSql: `SELECT patient_id, first_name, city, email, allergies, primary_payor_id FROM patients WHERE city IS NULL OR email IS NULL;`,
    syntax: `WHERE column IS NULL\nWHERE column IS NOT NULL\nCOALESCE(column, 'fallback')`,
    sql: `SELECT patient_id, first_name, last_name,
       city,
       COALESCE(city, '(unknown)') AS city_display
FROM patients
WHERE city IS NULL
ORDER BY patient_id;`,
    breakdown: [
      ['city', 'Raw column: shows NULL for missing values'],
      ["COALESCE(city, '(unknown)')", 'Replace NULL with a display value (the first non-NULL argument wins)'],
      ['WHERE city IS NULL', 'The correct test for missing values; = NULL would return no rows'],
    ],
    visual: { type: 'null' },
    internals: `<p>NULL is stored as a type tag with no payload (SQLite record header type 0), so it costs almost nothing. B-tree indexes do include NULLs in SQLite and PostgreSQL, so <code>IS NULL</code> can use an index. The optimizer knows <code>col = NULL</code> can never be TRUE and may skip the scan entirely.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM patients WHERE email = NULL;`, why: 'email = NULL is UNKNOWN for every row, so no rows come back. It is not an error, which makes it sneaky.', fix: `SELECT patient_id, first_name, email FROM patients WHERE email IS NULL;` },
      { wrong: `SELECT * FROM patients WHERE primary_payor_id <> 3;`, why: 'Patients with a NULL payor are silently excluded: NULL <> 3 is UNKNOWN, not TRUE.', fix: `SELECT patient_id, primary_payor_id FROM patients WHERE primary_payor_id <> 3 OR primary_payor_id IS NULL;` },
      { wrong: `SELECT AVG(hourly_rate) FROM practitioners; -- "treats missing rates as 0"`, why: 'AVG skips NULLs; it averages only rows with a value. If you want missing to count as 0, say so.', fix: `SELECT AVG(COALESCE(hourly_rate, 0)) FROM practitioners;` },
    ],
    rules: ['NULL means unknown, not zero or empty.', 'Use IS NULL / IS NOT NULL, never = NULL.', 'Anything compared or combined with NULL is NULL/UNKNOWN.', 'WHERE keeps only TRUE rows; UNKNOWN is dropped.', 'COUNT(*) counts rows; COUNT(col) skips NULLs.'],
    compare: `<table><tr><th>Value</th><th>Meaning</th><th>= itself?</th></tr><tr><td>NULL</td><td>Unknown / missing</td><td>UNKNOWN</td></tr><tr><td>0</td><td>The number zero</td><td>TRUE</td></tr><tr><td>''</td><td>Known empty text</td><td>TRUE</td></tr></table>`,
    realWorld: 'Aging reports that filter "payor_id <> Medicare" accidentally drop all self-pay invoices (NULL payor), understating what patients owe. NULL-aware filters fix it.',
    deep: `<p>SQLite supports <code>IS</code> and <code>IS NOT</code> as NULL-safe equality (<code>a IS b</code> is TRUE when both are NULL). The standard spelling is <code>IS NOT DISTINCT FROM</code> (PostgreSQL, SQLite 3.39+); MySQL uses <code>&lt;=&gt;</code>. NOT IN with a subquery that returns a NULL returns no rows at all, a classic trap.</p>`,
    tryIt: { prompt: 'Compare COUNT(*), COUNT(email) and COUNT(allergies) on patients. Why are they different?', starter: `SELECT COUNT(*), COUNT(email), COUNT(allergies)
FROM patients;` },
    challenge: {
      level: 2,
      prompt: 'List patients who have no primary payor on file: patient_id, first_name, last_name, ordered by patient_id.',
      solution: `SELECT patient_id, first_name, last_name FROM patients WHERE primary_payor_id IS NULL ORDER BY patient_id;`,
      hints: ['The column is primary_payor_id.', 'Missing values are NULL.', 'Use IS NULL, not = NULL.', 'SELECT patient_id, first_name, last_name FROM patients WHERE primary_payor_id IS NULL ORDER BY patient_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'What does SELECT NULL = NULL return?', options: ['1 (true)', '0 (false)', 'NULL (unknown)', 'An error'], answer: 2, why: 'Comparing two unknowns is unknown.' },
      { q: 'What is 100 + NULL?', options: ['100', '0', 'NULL', 'Error'], answer: 2, why: 'Arithmetic with NULL yields NULL.' },
      { q: 'WHERE primary_payor_id <> 3 on a patient whose payor is NULL...', options: ['Keeps the row', 'Drops the row', 'Raises an error', 'Sets it to 3'], answer: 1, why: 'The condition is UNKNOWN, and WHERE only keeps TRUE.' },
    ],
  },

  // ---------------------------------------------------------------- 12
  {
    id: 'foundations-12',
    goals: ['What a schema is', 'The steps of designing tables from business requirements', 'How to read the schema of an existing database', 'Naming and design conventions'],
    concept: `<p>A <b>schema</b> is the blueprint of a database: its tables, columns, types, keys and constraints. <b>Schema design</b> is deciding that blueprint before storing data.</p>
<p>A practical recipe:</p>
<ul>
<li><b>1. Find the entities</b> (nouns): patient, payor, practitioner, location, invoice, charge, payment.</li>
<li><b>2. Decide what one row means</b> in each table ("one charge = one billed service line").</li>
<li><b>3. List attributes</b> and pick types.</li>
<li><b>4. Choose keys</b>: a PK per table, UNIQUE for alternate keys.</li>
<li><b>5. Connect</b> entities with foreign keys (1:1, 1:N, M:N).</li>
<li><b>6. Add rules</b>: NOT NULL, CHECK, DEFAULT.</li>
<li><b>7. Normalize</b> to remove duplicated facts; denormalize only with a reason.</li>
</ul>`,
    why: 'Tables are expensive to change once apps and reports depend on them. A good schema makes correct queries easy and wrong data hard.',
    when: 'At the start of a project, and every time a new feature adds new kinds of data.',
    analogy: 'Designing the billing office\'s forms before opening day: one form for patient registration, one for each visit\'s invoice, one line per service, and a payment slip. Each form refers to the others by number.',
    exampleSql: `SELECT name AS column_name, type, "notnull" AS not_null, pk FROM pragma_table_info('invoices');`,
    syntax: `SELECT * FROM pragma_table_info('table_name');      -- SQLite\n-- ANSI: SELECT * FROM information_schema.columns WHERE table_name = '...';`,
    sql: `SELECT m.name AS table_name, c.name AS column_name, c.type, c."notnull" AS not_null, c.pk
FROM sqlite_master m
JOIN pragma_table_info(m.name) c
WHERE m.type = 'table' AND m.name IN ('invoices', 'charges')
ORDER BY m.name, c.cid;`,
    breakdown: [
      ['FROM sqlite_master m', 'The catalog: one row per table/index in the database'],
      ['JOIN pragma_table_info(m.name) c', 'A table-valued function listing the columns of each table'],
      ["WHERE m.type = 'table' AND m.name IN (...)", 'Only real tables, and just two for readability'],
      ['c.type, c."notnull", c.pk', 'Declared type, NOT NULL flag, and position in the primary key'],
    ],
    visual: { type: 'er' },
    internals: `<p>The schema itself is data. SQLite stores each CREATE statement in <code>sqlite_master</code> (also called <code>sqlite_schema</code>); other engines expose the ANSI <code>information_schema</code> views and their own catalogs (<code>pg_catalog</code>, <code>sys.tables</code>). The parser reads the catalog to validate every query you write.</p>`,
    mistakes: [
      { wrong: `CREATE TABLE billing (patient_name TEXT, payor_name TEXT, invoice_date TEXT, cpt1 TEXT, cpt2 TEXT, cpt3 TEXT, total REAL);`, why: 'One giant table mixes patients, payors and invoices, repeats names on every row, and caps services at 3 per invoice. Split entities into their own tables.', fix: `SELECT i.invoice_id, p.last_name, c.cpt_code FROM invoices i JOIN patients p ON p.patient_id = i.patient_id JOIN charges c ON c.invoice_id = i.invoice_id WHERE i.invoice_id = 4;` },
      { wrong: `-- Column names like Date, Amt1, PatNm, "Invoice Total"`, why: 'Reserved words, abbreviations and spaces make SQL harder to write and read. Use clear snake_case names.', fix: `SELECT invoice_date, total_amount FROM invoices LIMIT 3;` },
    ],
    rules: ['One entity per table; decide what one row means.', 'Every table gets a primary key.', 'Relationships are foreign keys.', 'Consistent snake_case names; plural or singular, but pick one.', 'Encode business rules as constraints.'],
    compare: `<p><b>Conceptual model</b> (entities and relationships, no types) vs <b>logical model</b> (tables, columns, keys) vs <b>physical model</b> (engine-specific types, indexes, partitions). Design top-down: concept first, physical last.</p>`,
    realWorld: 'Healthcare schemas often start from standards (HL7, X12 837/835 claim formats) and map each loop or segment to tables such as claim, claim_line, remittance.',
    tryIt: { prompt: 'Change the table list to show the columns of payments and transactions.', starter: `SELECT name, type, "notnull", pk FROM pragma_table_info('payments');` },
    challenge: {
      level: 3,
      prompt: 'Using the catalog, list the foreign keys of the charges table: the local column, the referenced table and the referenced column, ordered by the local column.',
      solution: `SELECT "from", "table", "to" FROM pragma_foreign_key_list('charges') ORDER BY "from";`,
      hints: ['SQLite has a table-valued function for foreign keys, like pragma_table_info.', "It is pragma_foreign_key_list('charges').", 'Its columns are named from, table and to (quote them: they are keywords).', `SELECT "from", "table", "to" FROM pragma_foreign_key_list('charges') ORDER BY "from";`],
      ordered: true,
    },
    quiz: [
      { q: 'What is the first step of schema design?', options: ['Create indexes', 'Identify the entities (things) to store', 'Write reports', 'Choose the engine'], answer: 1, why: 'Tables come from entities; everything else follows.' },
      { q: 'Where does SQLite keep the definition of each table?', options: ['In a text file next to the DB', 'In the sqlite_master catalog table', 'Nowhere', 'In the browser cache'], answer: 1, why: 'The schema is stored as data in sqlite_master.' },
    ],
  },

  // ---------------------------------------------------------------- 13
  {
    id: 'foundations-13',
    goals: ['The three relationship types: 1:1, 1:N, M:N', 'Cardinality and optionality', 'How each type is built with keys', 'How to spot relationships in the sample database'],
    concept: `<p>A <b>relationship</b> describes how rows in one table relate to rows in another. There are three kinds:</p>
<ul>
<li><b>One-to-one (1:1)</b>: one row matches at most one row on the other side (a patient and their portal account).</li>
<li><b>One-to-many (1:N)</b>: one parent has many children (a patient has many invoices). By far the most common.</li>
<li><b>Many-to-many (M:N)</b>: many on both sides (practitioners treat many patients; patients see many practitioners). Needs a middle (junction) table.</li>
</ul>
<p><b>Optionality</b> adds detail: must every invoice have a payor? No (payor_id can be NULL), so it is "zero or one payor per invoice".</p>
<p>A special case is a <b>self-relationship</b>: <code>practitioners.supervisor_id</code> points to another practitioner.</p>`,
    why: 'Relationships decide where foreign keys go and how you will JOIN. Getting them wrong forces duplicate data or makes some questions impossible to answer.',
    when: 'While designing a schema, and whenever you read an unfamiliar database: ask "one or many?" in both directions.',
    analogy: 'One patient, one chart binder (1:1). One patient, many visit invoices (1:N). Many doctors, many patients, connected through the visit log (M:N).',
    exampleSql: `SELECT "table" AS parent_table, "from" AS fk_column, "to" AS parent_column FROM pragma_foreign_key_list('invoices');`,
    syntax: `-- 1:N: FK on the many side\nchild.parent_id REFERENCES parent(id)\n-- M:N: junction table with two FKs\nlink(a_id REFERENCES a, b_id REFERENCES b, PRIMARY KEY (a_id, b_id))`,
    sql: `SELECT p.patient_id, p.last_name,
       COUNT(i.invoice_id) AS invoice_count
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
GROUP BY p.patient_id, p.last_name
ORDER BY invoice_count DESC, p.patient_id
LIMIT 10;`,
    breakdown: [
      ['FROM patients p LEFT JOIN invoices i', 'Follow the 1:N link from each patient to their invoices, keeping patients with none'],
      ['COUNT(i.invoice_id)', 'How many children each parent has: 0, 1 or many'],
      ['GROUP BY p.patient_id, p.last_name', 'One row per patient (the "one" side)'],
      ['ORDER BY invoice_count DESC', 'Patients with the most invoices first'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 250" width="100%" role="img" aria-label="Relationship types">
  <g font-size="12">
  <text x="20" y="24" fill="var(--text)" font-weight="bold">1 : 1</text>
  <rect x="80" y="8" width="130" height="28" rx="6" fill="var(--panel2)" stroke="var(--blue)"/><text x="145" y="27" text-anchor="middle" fill="var(--text)">patients</text>
  <line x1="210" y1="22" x2="330" y2="22" stroke="var(--blue)" stroke-width="2"/><text x="222" y="16" fill="var(--blue)">1</text><text x="316" y="16" fill="var(--blue)">1</text>
  <rect x="330" y="8" width="170" height="28" rx="6" fill="var(--panel2)" stroke="var(--blue)"/><text x="415" y="27" text-anchor="middle" fill="var(--text)">portal_accounts</text>
  <text x="515" y="27" fill="var(--muted)">FK + UNIQUE</text>

  <text x="20" y="104" fill="var(--text)" font-weight="bold">1 : N</text>
  <rect x="80" y="88" width="130" height="28" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="145" y="107" text-anchor="middle" fill="var(--text)">patients</text>
  <line x1="210" y1="102" x2="330" y2="102" stroke="var(--green)" stroke-width="2"/><line x1="318" y1="102" x2="330" y2="92" stroke="var(--green)" stroke-width="2"/><line x1="318" y1="102" x2="330" y2="112" stroke="var(--green)" stroke-width="2"/>
  <text x="222" y="96" fill="var(--green)">1</text><text x="300" y="96" fill="var(--green)">N</text>
  <rect x="330" y="88" width="170" height="28" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="415" y="107" text-anchor="middle" fill="var(--text)">invoices</text>
  <text x="515" y="107" fill="var(--muted)">FK on many side</text>

  <text x="20" y="194" fill="var(--text)" font-weight="bold">M : N</text>
  <rect x="80" y="178" width="130" height="28" rx="6" fill="var(--panel2)" stroke="var(--purple)"/><text x="145" y="197" text-anchor="middle" fill="var(--text)">practitioners</text>
  <line x1="210" y1="192" x2="262" y2="192" stroke="var(--purple)" stroke-width="2"/>
  <rect x="262" y="170" width="110" height="44" rx="6" fill="none" stroke="var(--purple)" stroke-dasharray="5 3"/><text x="317" y="189" text-anchor="middle" fill="var(--text)">charges</text><text x="317" y="205" text-anchor="middle" fill="var(--muted)" font-size="10">junction</text>
  <line x1="372" y1="192" x2="424" y2="192" stroke="var(--purple)" stroke-width="2"/>
  <rect x="424" y="178" width="130" height="28" rx="6" fill="var(--panel2)" stroke="var(--purple)"/><text x="489" y="197" text-anchor="middle" fill="var(--text)">invoices</text>
  <text x="80" y="236" fill="var(--muted)">M:N is always built from two 1:N links through a middle table</text>
  </g>
</svg>` },
    internals: `<p>The database does not store "relationship type" anywhere. It only stores foreign keys and uniqueness rules; the cardinality <i>emerges</i> from them. A FK alone gives 1:N. A FK that is also UNIQUE gives 1:1. Two FKs in a third table give M:N.</p>`,
    mistakes: [
      { wrong: `-- Storing a list in one column: invoices.charge_ids = '12,13,14'`, why: 'Comma lists hide a 1:N relationship inside text: you cannot join, index or constrain them. Put the FK on the child rows instead.', fix: `SELECT charge_id, invoice_id FROM charges WHERE invoice_id = 4;` },
      { wrong: `-- Putting practitioner_id on patients for "their doctor"`, why: 'Patients see many practitioners over time, so one column cannot hold the relationship. It is M:N and needs a middle table (here: invoices + charges).', fix: `SELECT DISTINCT i.patient_id, c.practitioner_id FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id WHERE i.patient_id = 2;` },
    ],
    rules: ['Ask "one or many?" in both directions.', '1:N: FK on the many side.', '1:1: FK + UNIQUE.', 'M:N: junction table with two FKs.'],
    compare: `<table><tr><th>Type</th><th>Example</th><th>Implementation</th></tr><tr><td>1:1</td><td>patient - portal account</td><td>FK with UNIQUE, or shared PK</td></tr><tr><td>1:N</td><td>invoice - charges</td><td>FK in charges</td></tr><tr><td>M:N</td><td>practitioner - patient</td><td>Junction table</td></tr><tr><td>Self</td><td>practitioner - supervisor</td><td>FK to the same table</td></tr></table>`,
    realWorld: 'In claims processing: member to claims (1:N), claim to claim lines (1:N), providers to payor networks (M:N, via a network participation table).',
    tryIt: { prompt: 'Change the query to count charges per practitioner instead (practitioners 1:N charges).', starter: `SELECT p.patient_id, p.last_name, COUNT(i.invoice_id) AS invoice_count
FROM patients p
LEFT JOIN invoices i ON i.patient_id = p.patient_id
GROUP BY p.patient_id, p.last_name;` },
    challenge: {
      level: 2,
      prompt: 'For each treatment location, show location_id, location_name and how many invoices it has (include locations with zero), ordered by location_id.',
      solution: `SELECT l.location_id, l.location_name, COUNT(i.invoice_id) FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id GROUP BY l.location_id, l.location_name ORDER BY l.location_id;`,
      hints: ['Locations are the "one" side, invoices the "many" side.', 'Use LEFT JOIN so location 6 (no invoices) still appears.', 'COUNT(i.invoice_id) counts 0 for no matches, COUNT(*) would count 1.', 'SELECT l.location_id, l.location_name, COUNT(i.invoice_id) FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id GROUP BY l.location_id, l.location_name ORDER BY l.location_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'How is a many-to-many relationship implemented?', options: ['A FK on both tables', 'A junction table with two FKs', 'A comma-separated column', 'It cannot be'], answer: 1, why: 'M:N = two 1:N relationships through a middle table.' },
      { q: 'practitioners.supervisor_id references practitioners. What is this called?', options: ['Composite key', 'Self-referencing (recursive) relationship', 'M:N', 'Candidate key'], answer: 1, why: 'The FK points back into the same table.' },
    ],
  },

  // ---------------------------------------------------------------- 14
  {
    id: 'foundations-14',
    goals: ['What a one-to-one relationship is', 'How to build it: FK + UNIQUE or shared primary key', 'Why you might split one entity into two tables', 'How to verify a relationship really is 1:1'],
    concept: `<p>In a <b>one-to-one (1:1)</b> relationship, each row on one side matches <b>at most one</b> row on the other side, and vice versa.</p>
<p>Typical reasons to split one thing into two tables:</p>
<ul>
<li><b>Security</b>: sensitive data (SSN, clinical notes) in a separate table with tighter permissions.</li>
<li><b>Optional data</b>: only some patients have a portal account; keep those columns out of the main table.</li>
<li><b>Performance</b>: large, rarely-read columns (a scanned ID card image) stored apart.</li>
</ul>
<p>Implementation: the second table's FK is also <b>UNIQUE</b> (or is its primary key), so no patient can appear twice.</p>`,
    why: 'It keeps a core table small and safe while still linking the extra details exactly once.',
    when: 'For optional extensions (portal account, insurance card image), sensitive columns, or subtype details.',
    analogy: 'Each patient has at most one active insurance card on file, kept in a locked drawer separate from the general chart. The card has the patient\'s MRN on it, and no MRN has two cards.',
    exampleSql: `SELECT patient_id, first_name, last_name, email FROM patients WHERE email IS NOT NULL LIMIT 6;`,
    syntax: `CREATE TABLE extension (\n  main_id INTEGER PRIMARY KEY REFERENCES main(main_id),  -- shared PK = 1:1\n  extra   TEXT\n);`,
    sql: `CREATE TABLE portal_accounts (
  patient_id  INTEGER PRIMARY KEY REFERENCES patients(patient_id),
  username    TEXT NOT NULL UNIQUE,
  last_login  TEXT
);
INSERT INTO portal_accounts VALUES (2, 'jsmith', '2026-08-30'), (3, 'ajohnson', NULL), (4, 'cbrown', '2026-08-15');
SELECT p.patient_id, p.first_name, p.last_name, a.username, a.last_login
FROM patients p
LEFT JOIN portal_accounts a ON a.patient_id = p.patient_id
WHERE p.patient_id <= 6
ORDER BY p.patient_id;`,
    breakdown: [
      ['patient_id INTEGER PRIMARY KEY REFERENCES patients', 'Shared primary key: the account\'s id IS the patient id, so each patient has at most one account'],
      ['username TEXT NOT NULL UNIQUE', 'Also unique: one username per account'],
      ['LEFT JOIN portal_accounts a', 'Optional side: patients without an account still appear, with NULLs'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 170" width="100%" role="img" aria-label="One-to-one">
  <g font-size="12">
  <rect x="30" y="20" width="200" height="130" rx="8" fill="var(--panel2)" stroke="var(--border)"/><text x="130" y="40" text-anchor="middle" fill="var(--text)" font-weight="bold">patients</text>
  <text x="50" y="66" fill="var(--text)">2 John Smith</text><text x="50" y="90" fill="var(--text)">3 Aiden Johnson</text><text x="50" y="114" fill="var(--text)">4 Chloe Brown</text><text x="50" y="138" fill="var(--muted)">5 Lucas Lee</text>
  <rect x="400" y="20" width="210" height="130" rx="8" fill="var(--panel2)" stroke="var(--blue)"/><text x="505" y="40" text-anchor="middle" fill="var(--text)" font-weight="bold">portal_accounts</text>
  <text x="420" y="66" fill="var(--text)">2 jsmith</text><text x="420" y="90" fill="var(--text)">3 ajohnson</text><text x="420" y="114" fill="var(--text)">4 cbrown</text>
  <line x1="170" y1="62" x2="415" y2="62" stroke="var(--blue)" stroke-width="2"/><line x1="190" y1="86" x2="415" y2="86" stroke="var(--blue)" stroke-width="2"/><line x1="180" y1="110" x2="415" y2="110" stroke="var(--blue)" stroke-width="2"/>
  <text x="250" y="140" fill="var(--muted)">patient 5: no account (0 or 1)</text>
  </g>
</svg>` },
    internals: `<p>The UNIQUE/PK index on the FK column is what enforces "at most one". Without it the database would happily accept a second account for patient 2, and you would have a 1:N relationship by accident. Joining through a 1:1 never multiplies rows, which is why it is safe to add 1:1 joins to any report.</p>`,
    mistakes: [
      { wrong: `CREATE TABLE portal_accounts (account_id INTEGER PRIMARY KEY, patient_id INTEGER REFERENCES patients(patient_id), username TEXT);`, why: 'Nothing stops two accounts for the same patient. Without UNIQUE on patient_id this is really 1:N.', fix: `CREATE TABLE portal_accounts (account_id INTEGER PRIMARY KEY, patient_id INTEGER UNIQUE REFERENCES patients(patient_id), username TEXT);\nSELECT name FROM sqlite_master WHERE tbl_name = 'portal_accounts';` },
      { wrong: `-- Splitting every table into 1:1 pieces "for tidiness"`, why: 'Each split costs a JOIN on every read. Split only for security, optionality or size reasons.', fix: `SELECT patient_id, first_name, email FROM patients LIMIT 3;` },
    ],
    rules: ['1:1 = foreign key + uniqueness.', 'A shared primary key is the simplest 1:1.', 'Use LEFT JOIN when the second side is optional.', 'Split only with a reason.'],
    compare: `<p><b>1:1 vs extra columns:</b> nullable columns in the main table are simpler; a 1:1 table is better when the data is sensitive, large, or relevant to few rows. <b>1:1 vs 1:N:</b> the only difference in the schema is the UNIQUE constraint on the FK.</p>`,
    realWorld: 'EHRs often keep patient demographics in one table and protected identifiers (SSN, driver license) in a 1:1 table with stricter access and encryption.',
    tryIt: { prompt: 'Run the script, then try inserting a second account for patient 2. Which constraint stops it?', starter: `CREATE TABLE portal_accounts (patient_id INTEGER PRIMARY KEY REFERENCES patients(patient_id), username TEXT NOT NULL UNIQUE);
INSERT INTO portal_accounts VALUES (2, 'jsmith');
SELECT * FROM portal_accounts;` },
    challenge: {
      level: 2,
      prompt: 'Is invoices-to-payments 1:1? Prove it is not: list invoice_id and number of payments for invoices with more than one payment, ordered by invoice_id.',
      solution: `SELECT invoice_id, COUNT(*) AS n FROM payments GROUP BY invoice_id HAVING COUNT(*) > 1 ORDER BY invoice_id;`,
      hints: ['If any invoice has 2+ payments, the relationship is 1:N.', 'Group payments by invoice_id.', 'HAVING COUNT(*) > 1 keeps the invoices with several payments.', 'SELECT invoice_id, COUNT(*) FROM payments GROUP BY invoice_id HAVING COUNT(*) > 1 ORDER BY invoice_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'What turns a plain FK relationship into 1:1?', options: ['An index', 'A UNIQUE (or PK) constraint on the FK column', 'A CHECK', 'Using LEFT JOIN'], answer: 1, why: 'Uniqueness on the FK means each parent appears at most once.' },
      { q: 'A good reason to use a 1:1 table is...', options: ['To make queries faster in general', 'To isolate sensitive or optional data', 'Because every table needs one', 'To avoid primary keys'], answer: 1, why: 'Security, optionality and large rarely-used columns are the classic reasons.' },
    ],
  },

  // ---------------------------------------------------------------- 15
  {
    id: 'foundations-15',
    goals: ['What a one-to-many relationship is', 'Why the FK always sits on the many side', 'How JOINs on 1:N multiply the parent rows', 'Counting children per parent'],
    concept: `<p>In a <b>one-to-many (1:N)</b> relationship, one parent row relates to zero, one or many child rows, but each child belongs to exactly one parent.</p>
<p>Our database is full of them: patient 1:N invoices, invoice 1:N charges, invoice 1:N payments, location 1:N invoices, payor 1:N invoices.</p>
<p>The foreign key goes on the child (the "many" side), because a child has only one parent to name. A parent cannot store a list of children in one column.</p>
<p>When you JOIN parent to children, the parent's columns <b>repeat once per child</b>. Invoice 4 has 4 charges, so a join shows invoice 4 four times. Summing <code>total_amount</code> after that join would count it four times: the classic "fan-out" trap.</p>`,
    why: 'Most real data is hierarchical: a visit has many service lines, a claim has many payments. 1:N captures that without repeating the parent\'s data.',
    when: 'Whenever one thing "owns" or "contains" many others.',
    analogy: 'One invoice envelope, many itemized service lines inside. Each line has the invoice number printed on it; the envelope does not list line numbers.',
    exampleSql: `SELECT charge_id, invoice_id, cpt_code, description, amount FROM charges WHERE invoice_id = 4;`,
    syntax: `SELECT parent.col, child.col\nFROM parent\nJOIN child ON child.parent_id = parent.id;`,
    sql: `SELECT i.invoice_id, i.total_amount,
       c.charge_id, c.cpt_code, c.amount
FROM invoices i
JOIN charges c ON c.invoice_id = i.invoice_id
WHERE i.invoice_id IN (3, 4)
ORDER BY i.invoice_id, c.charge_id;`,
    breakdown: [
      ['FROM invoices i', 'The parent ("one") side'],
      ['JOIN charges c ON c.invoice_id = i.invoice_id', 'Each charge row names its invoice via the FK'],
      ['WHERE i.invoice_id IN (3, 4)', 'Invoice 3 has 1 charge; invoice 4 has several'],
      ['i.total_amount', 'Notice it repeats on every charge row of invoice 4: the parent fans out'],
    ],
    visual: { type: 'keys', parent: 'invoices', child: 'charges', pk: 'invoice_id', fk: 'invoice_id' },
    internals: `<p>For a join from invoices to charges, the engine uses the index on <code>charges.invoice_id</code> (if one exists) to find all child rows of each invoice: a range scan in the index, since many entries share the same key. Without that index it must scan all 104 charges for every invoice. Always index the FK on the many side.</p>`,
    mistakes: [
      { wrong: `SELECT SUM(i.total_amount) FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id;`, why: 'Each invoice total is repeated once per charge, so the sum is inflated. Aggregate at the right level.', fix: `SELECT SUM(total_amount) FROM invoices WHERE invoice_id IN (SELECT invoice_id FROM charges);` },
      { wrong: `-- invoices table with columns charge1_amount, charge2_amount, charge3_amount`, why: 'Repeating columns cap the number of children and make totals awkward. Children belong in their own rows.', fix: `SELECT invoice_id, COUNT(*) AS lines, SUM(amount) FROM charges GROUP BY invoice_id ORDER BY invoice_id LIMIT 5;` },
    ],
    rules: ['FK on the many side.', 'Joining parent to children repeats the parent.', 'Aggregate children before joining, or aggregate at the child level.', 'Use LEFT JOIN to keep parents with no children.'],
    compare: `<p><b>1:N vs M:N:</b> in 1:N each child has exactly one parent (a charge belongs to one invoice). In M:N both sides have many (a practitioner bills many invoices, and an invoice can have lines from many practitioners), so a junction table is needed.</p>`,
    realWorld: 'Explanation of Benefits documents: one claim header, many line items; payments posted per line. Nearly every billing report walks 1:N chains.',
    tryIt: { prompt: 'Show all payments for invoices 1 and 2 alongside the invoice total (invoices 1:N payments).', starter: `SELECT i.invoice_id, i.total_amount, p.payment_id, p.amount
FROM invoices i
JOIN payments p ON p.invoice_id = i.invoice_id
WHERE i.invoice_id IN (1, 2);` },
    challenge: {
      level: 2,
      prompt: 'For each invoice that has charges, show invoice_id, the number of charge lines and the sum of charge amounts. Order by number of lines descending, then invoice_id; return the top 5.',
      solution: `SELECT invoice_id, COUNT(*) AS lines, SUM(amount) AS charged FROM charges GROUP BY invoice_id ORDER BY lines DESC, invoice_id LIMIT 5;`,
      hints: ['You only need the child table (charges).', 'Group by the FK column invoice_id.', 'COUNT(*) and SUM(amount) per group; ORDER BY lines DESC, invoice_id.', 'SELECT invoice_id, COUNT(*) AS lines, SUM(amount) FROM charges GROUP BY invoice_id ORDER BY lines DESC, invoice_id LIMIT 5;'],
      ordered: true,
    },
    quiz: [
      { q: 'Invoice 4 has 4 charges. How many times does invoice 4 appear in invoices JOIN charges?', options: ['1', '4', '0', '48'], answer: 1, why: 'The parent repeats once per matching child.' },
      { q: 'Where does the foreign key go in patient 1:N invoices?', options: ['patients', 'invoices', 'Both', 'A junction table'], answer: 1, why: 'The many side names its single parent.' },
    ],
  },

  // ---------------------------------------------------------------- 16
  {
    id: 'foundations-16',
    goals: ['What a many-to-many relationship is', 'Why it needs a junction (bridge) table', 'How to query through the junction', 'Avoiding duplicates with DISTINCT or aggregation'],
    concept: `<p>In a <b>many-to-many (M:N)</b> relationship, a row on either side can relate to many rows on the other side.</p>
<p>Practitioners and invoices: Dr. Nair (cardiology) bills on many invoices, and a single hospital invoice may include lines from a cardiologist and a radiologist. Neither table can hold the other's id in one column.</p>
<p>The fix is a <b>junction table</b> with a foreign key to each side. Here, <code>charges</code> plays that role: every charge row links one invoice to one practitioner (and carries its own data: CPT code, units, amount). Chained further, invoices link to patients, so practitioners and patients are M:N too.</p>`,
    why: 'Without a junction table you would need repeating columns or comma lists, which cannot be joined, indexed or constrained.',
    when: 'Practitioners-patients, practitioners-locations, payors-practitioners (network participation), patients-payors (primary and secondary insurance).',
    analogy: 'The appointment book is the junction between doctors and patients. Doctors do not list their patients and patients do not list their doctors; each appointment line names one of each.',
    exampleSql: `SELECT charge_id, invoice_id, practitioner_id, cpt_code FROM charges WHERE invoice_id IN (27, 30, 31) ORDER BY invoice_id;`,
    syntax: `SELECT a.col, b.col\nFROM a\nJOIN link ON link.a_id = a.id\nJOIN b    ON b.id = link.b_id;`,
    sql: `SELECT DISTINCT pr.practitioner_id, pr.last_name AS practitioner,
       pa.patient_id, pa.last_name AS patient
FROM practitioners pr
JOIN charges  c  ON c.practitioner_id = pr.practitioner_id
JOIN invoices i  ON i.invoice_id = c.invoice_id
JOIN patients pa ON pa.patient_id = i.patient_id
WHERE pr.practitioner_id IN (3, 8)
ORDER BY pr.practitioner_id, pa.patient_id;`,
    breakdown: [
      ['FROM practitioners pr', 'One side of the M:N'],
      ['JOIN charges c ON c.practitioner_id = ...', 'Into the junction: every line this practitioner billed'],
      ['JOIN invoices i ... JOIN patients pa ...', 'Out the other side to the patient'],
      ['SELECT DISTINCT', 'A practitioner may bill the same patient many times; DISTINCT keeps each pair once'],
    ],
    visual: { type: 'er', tables: ['practitioners', 'charges', 'invoices', 'patients'] },
    internals: `<p>A junction table usually has a composite unique key (a_id, b_id) plus a second index on (b_id, a_id), so the engine can walk the relationship efficiently in either direction. Queries through a junction are two joins; the optimizer chooses which side to start from based on filters and statistics.</p>`,
    mistakes: [
      { wrong: `SELECT pr.last_name, pa.last_name FROM practitioners pr JOIN charges c ON c.practitioner_id = pr.practitioner_id JOIN invoices i ON i.invoice_id = c.invoice_id JOIN patients pa ON pa.patient_id = i.patient_id;`, why: 'Without DISTINCT or GROUP BY, a pair repeats once per charge line, which looks like duplicate data.', fix: `SELECT DISTINCT pr.last_name, pa.last_name FROM practitioners pr JOIN charges c ON c.practitioner_id = pr.practitioner_id JOIN invoices i ON i.invoice_id = c.invoice_id JOIN patients pa ON pa.patient_id = i.patient_id ORDER BY 1, 2;` },
      { wrong: `-- practitioners.patient_ids = '2,5,9'`, why: 'A list in a column breaks first normal form; you cannot join to it or enforce FKs.', fix: `SELECT DISTINCT i.patient_id FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id WHERE c.practitioner_id = 3 ORDER BY 1;` },
    ],
    rules: ['M:N always needs a junction table.', 'The junction holds two FKs, often as a composite key.', 'Junctions can carry their own attributes (date, amount).', 'Use DISTINCT or GROUP BY to collapse repeated pairs.'],
    compare: `<p>A <b>pure junction</b> has only the two keys (practitioner_locations). An <b>associative entity</b> like charges also carries facts about the pairing (CPT code, units, price). Both implement M:N.</p>`,
    realWorld: 'Provider network tables (provider x payor x effective dates) decide whether a visit is in-network; care-team tables link patients to many clinicians.',
    tryIt: { prompt: 'Change the filter to show which practitioners have treated patient 2.', starter: `SELECT DISTINCT pr.practitioner_id, pr.last_name
FROM practitioners pr
JOIN charges c ON c.practitioner_id = pr.practitioner_id
JOIN invoices i ON i.invoice_id = c.invoice_id
WHERE i.patient_id = 1;` },
    challenge: {
      level: 3,
      prompt: 'For each practitioner who has billed anything, show practitioner_id, last_name and the number of DIFFERENT patients they treated. Order by that count descending, then practitioner_id.',
      solution: `SELECT pr.practitioner_id, pr.last_name, COUNT(DISTINCT i.patient_id) AS patients FROM practitioners pr JOIN charges c ON c.practitioner_id = pr.practitioner_id JOIN invoices i ON i.invoice_id = c.invoice_id GROUP BY pr.practitioner_id, pr.last_name ORDER BY patients DESC, pr.practitioner_id;`,
      hints: ['Path: practitioners -> charges -> invoices (which has patient_id).', 'Group by practitioner.', 'COUNT(DISTINCT i.patient_id) avoids counting a patient twice.', 'SELECT pr.practitioner_id, pr.last_name, COUNT(DISTINCT i.patient_id) AS patients FROM practitioners pr JOIN charges c ON ... JOIN invoices i ON ... GROUP BY pr.practitioner_id, pr.last_name ORDER BY patients DESC, pr.practitioner_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'Which table acts as the junction between practitioners and invoices?', options: ['patients', 'charges', 'payments', 'payors'], answer: 1, why: 'Each charge has an invoice_id and a practitioner_id.' },
      { q: 'Why does the practitioner-patient list repeat pairs without DISTINCT?', options: ['A bug in SQLite', 'Each charge line creates a row, and a pair can have many lines', 'Primary keys are missing', 'Because of NULLs'], answer: 1, why: 'The junction has one row per interaction, not per pair.' },
    ],
  },

  // ---------------------------------------------------------------- 17
  {
    id: 'foundations-17',
    goals: ['What normalization is and why it exists', 'Update, insert and delete anomalies', 'First, second and third normal form in plain words', 'When denormalizing on purpose is reasonable'],
    concept: `<p><b>Normalization</b> is organizing tables so that <b>each fact is stored once</b>. It removes the duplication that causes contradictions.</p>
<p>A flat "billing sheet" repeating the patient name, payor name and phone on every service line has three problems (<b>anomalies</b>):</p>
<ul>
<li><b>Update</b>: change the payor's phone and you must fix hundreds of rows; miss one and the data contradicts itself.</li>
<li><b>Insert</b>: you cannot record a new payor until someone is billed to it.</li>
<li><b>Delete</b>: delete the last invoice for a payor and you lose the payor entirely.</li>
</ul>
<p>The normal forms, simply:</p>
<ul>
<li><b>1NF</b>: one value per cell, no repeating groups (no "cpt1, cpt2, cpt3", no comma lists).</li>
<li><b>2NF</b>: every column depends on the <i>whole</i> key (in a (invoice_id, line_no) table, patient_name depends only on invoice_id, so it moves out).</li>
<li><b>3NF</b>: non-key columns depend on the key and <i>nothing else</i> (payor_phone depends on payor_id, not on the invoice, so it lives in payors).</li>
</ul>
<p>Memory aid: every column depends on <b>the key, the whole key, and nothing but the key</b>.</p>`,
    why: 'Duplicated facts drift apart. Normalized data has one source of truth, so updates are simple and reports agree.',
    when: 'When designing transactional (OLTP) schemas like billing, where data is written often. Reporting warehouses often denormalize on purpose.',
    analogy: 'If every visit form re-copies the insurer\'s phone number, the day the insurer changes numbers the front desk calls the old number from half the forms. Keep the insurer directory in one place and write only the insurer id on each form.',
    exampleSql: `SELECT c.charge_id, i.invoice_id, p.last_name, py.payor_name, py.phone, c.cpt_code, c.amount FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id JOIN patients p ON p.patient_id = i.patient_id LEFT JOIN payors py ON py.payor_id = i.payor_id LIMIT 8;`,
    syntax: `-- Unnormalized\nbilling(line_id, patient_name, payor_name, payor_phone, cpt, amount)\n-- 3NF\npatients(patient_id, name)   payors(payor_id, name, phone)\ninvoices(invoice_id, patient_id, payor_id)   charges(charge_id, invoice_id, cpt, amount)`,
    sql: `SELECT py.payor_name, py.phone,
       COUNT(c.charge_id) AS lines_that_would_repeat_the_phone
FROM charges c
JOIN invoices i ON i.invoice_id = c.invoice_id
JOIN payors py  ON py.payor_id = i.payor_id
GROUP BY py.payor_name, py.phone
ORDER BY lines_that_would_repeat_the_phone DESC;`,
    breakdown: [
      ['FROM charges c JOIN invoices i JOIN payors py', 'Rebuild the flat "billing sheet" view by joining the normalized tables'],
      ['COUNT(c.charge_id)', 'How many lines would repeat each payor phone if we did not normalize'],
      ['GROUP BY py.payor_name, py.phone', 'In the normalized schema each phone is stored exactly once, in payors'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 660 290" width="100%" role="img" aria-label="Normalization before and after">
  <g font-size="11">
  <text x="10" y="18" fill="var(--red)" font-size="13" font-weight="bold">Before: one flat table</text>
  <rect x="10" y="26" width="300" height="22" fill="var(--panel2)" stroke="var(--border)"/><text x="16" y="41" fill="var(--accent)">line | patient | payor | payor_phone | cpt | amt</text>
  <rect x="10" y="48" width="300" height="20" fill="none" stroke="var(--border)"/><text x="16" y="62" fill="var(--text)">1 | Smith | BlueShield | </text><text x="160" y="62" fill="var(--red)">800-555-0101</text><text x="248" y="62" fill="var(--text)">| 99214 | 165</text>
  <rect x="10" y="68" width="300" height="20" fill="none" stroke="var(--border)"/><text x="16" y="82" fill="var(--text)">2 | Smith | BlueShield | </text><text x="160" y="82" fill="var(--red)">800-555-0101</text><text x="248" y="82" fill="var(--text)">| 93000 | 60</text>
  <rect x="10" y="88" width="300" height="20" fill="none" stroke="var(--border)"/><text x="16" y="102" fill="var(--text)">3 | Brown | BlueShield | </text><text x="160" y="102" fill="var(--red)">800-555-0199</text><text x="248" y="102" fill="var(--text)">| 97140 | 50</text>
  <text x="10" y="128" fill="var(--red)">Same payor, two phones: update anomaly</text>
  <text x="10" y="146" fill="var(--muted)">Names repeated on every line; new payor cannot</text>
  <text x="10" y="162" fill="var(--muted)">be added until it is billed (insert anomaly)</text>
  <line x1="322" y1="90" x2="352" y2="90" stroke="var(--accent)" stroke-width="3"/><polygon points="352,84 362,90 352,96" fill="var(--accent)"/>
  <text x="370" y="18" fill="var(--green)" font-size="13" font-weight="bold">After: 3NF</text>
  <rect x="370" y="28" width="130" height="62" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="380" y="44" fill="var(--text)" font-weight="bold">payors</text><text x="380" y="62" fill="var(--text)">1 BlueShield</text><text x="380" y="80" fill="var(--green)">800-555-0101</text>
  <rect x="520" y="28" width="130" height="62" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="530" y="44" fill="var(--text)" font-weight="bold">patients</text><text x="530" y="62" fill="var(--text)">2 Smith</text><text x="530" y="80" fill="var(--text)">4 Brown</text>
  <rect x="370" y="110" width="280" height="44" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="380" y="126" fill="var(--text)" font-weight="bold">invoices</text><text x="380" y="144" fill="var(--text)">invoice_id, patient_id FK, payor_id FK</text>
  <rect x="370" y="174" width="280" height="44" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="380" y="190" fill="var(--text)" font-weight="bold">charges</text><text x="380" y="208" fill="var(--text)">charge_id, invoice_id FK, cpt, amount</text>
  <text x="370" y="244" fill="var(--green)">Each fact stored once; phone changes in 1 row</text>
  <text x="10" y="200" fill="var(--text)" font-weight="bold">1NF</text><text x="50" y="200" fill="var(--muted)">atomic cells, no repeating groups</text>
  <text x="10" y="220" fill="var(--text)" font-weight="bold">2NF</text><text x="50" y="220" fill="var(--muted)">depends on the whole key</text>
  <text x="10" y="240" fill="var(--text)" font-weight="bold">3NF</text><text x="50" y="240" fill="var(--muted)">depends on nothing but the key</text>
  </g>
</svg>` },
    internals: `<p>Formally, normalization is about <b>functional dependencies</b>: A determines B (A -> B) if knowing A fixes B. payor_id -> phone. If a table's key is invoice_id but it also stores phone, you have a transitive dependency (invoice_id -> payor_id -> phone), which 3NF removes. BCNF tightens this: every determinant must be a candidate key. Higher forms (4NF, 5NF) deal with multi-valued dependencies and are rarely needed in practice.</p>`,
    mistakes: [
      { wrong: `-- invoices.patient_name TEXT (copied from patients)`, why: 'patient_name depends on patient_id, not on the invoice. When the patient changes their name, old invoices show the old name and reports disagree.', fix: `SELECT i.invoice_id, p.first_name, p.last_name FROM invoices i JOIN patients p ON p.patient_id = i.patient_id LIMIT 5;` },
      { wrong: `-- Normalizing so far that a report needs 15 joins and runs for minutes`, why: 'Normalization is for correctness of writes. For heavy read reporting, a denormalized summary table or view (rebuilt from the normalized source) is fine.', fix: `SELECT i.invoice_id, i.total_amount, SUM(c.amount) AS charge_sum FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id GROUP BY i.invoice_id, i.total_amount LIMIT 5;` },
    ],
    rules: ['Each fact in exactly one place.', '1NF: atomic values, no repeating groups.', '2NF: no partial dependency on part of a composite key.', '3NF: no dependency on non-key columns.', 'Denormalize deliberately, with a way to keep copies in sync.'],
    compare: `<table><tr><th></th><th>Normalized (OLTP)</th><th>Denormalized (reporting)</th></tr><tr><td>Writes</td><td>Simple, safe</td><td>Must update many copies</td></tr><tr><td>Reads</td><td>Need joins</td><td>Fast, few joins</td></tr><tr><td>Risk</td><td>Slower complex reports</td><td>Inconsistent copies</td></tr></table>
<p>Note: <code>invoices.total_amount</code> is itself a stored derived value (it could be computed from charges). That is a deliberate denormalization common in billing, and it must be kept in sync.</p>`,
    realWorld: 'Billing OLTP databases are kept near 3NF; the data warehouse feeding revenue-cycle dashboards uses star schemas (a wide fact table of claim lines with dimension tables), a controlled denormalization.',
    tryIt: { prompt: 'Check the denormalized total: compare each invoice\'s total_amount with the SUM of its charges, and show any that differ.', starter: `SELECT i.invoice_id, i.total_amount, SUM(c.amount) AS charges_sum
FROM invoices i
LEFT JOIN charges c ON c.invoice_id = i.invoice_id
GROUP BY i.invoice_id, i.total_amount
LIMIT 10;` },
    challenge: {
      level: 3,
      prompt: 'The stored invoices.total_amount is derived data. Find invoices where it does NOT match the sum of their charges (treat "no charges" as a sum of NULL, which does not match). Show invoice_id, total_amount, and the charge sum.',
      solution: `SELECT i.invoice_id, i.total_amount, SUM(c.amount) AS charge_sum FROM invoices i LEFT JOIN charges c ON c.invoice_id = i.invoice_id GROUP BY i.invoice_id, i.total_amount HAVING SUM(c.amount) IS NOT i.total_amount;`,
      hints: ['LEFT JOIN charges so invoices without charges are kept.', 'GROUP BY invoice and compute SUM(c.amount).', 'Compare in HAVING. Plain <> is UNKNOWN when the sum is NULL; SQLite\'s IS NOT is NULL-safe.', 'SELECT i.invoice_id, i.total_amount, SUM(c.amount) FROM invoices i LEFT JOIN charges c ON c.invoice_id = i.invoice_id GROUP BY i.invoice_id, i.total_amount HAVING SUM(c.amount) IS NOT i.total_amount;'],
    },
    quiz: [
      { q: 'A payor phone stored on every invoice row violates which normal form?', options: ['1NF', '2NF', '3NF', 'None'], answer: 2, why: 'phone depends on payor_id (a non-key column), a transitive dependency.' },
      { q: 'A column holding "99214, 93000" violates...', options: ['1NF', '2NF', '3NF', 'BCNF only'], answer: 0, why: '1NF requires one atomic value per cell.' },
      { q: 'Losing a payor\'s details when its last invoice is deleted is a...', options: ['Update anomaly', 'Insert anomaly', 'Delete anomaly', 'Deadlock'], answer: 2, why: 'Deleting one fact accidentally deletes another.' },
    ],
  },

  // ---------------------------------------------------------------- 18
  {
    id: 'foundations-18',
    goals: ['What a database engine (DBMS) is', 'The major engines: SQLite, PostgreSQL, MySQL, SQL Server, Oracle', 'Embedded vs client-server architecture', 'How to find out which engine and version you are using'],
    concept: `<p>A <b>database engine</b> (or DBMS) is the software that stores data and runs SQL. They all speak SQL, but they differ in architecture, features, licensing and dialect.</p>
<ul>
<li><b>SQLite</b>: an embedded library, the whole database is one file, no server. It runs in phones, browsers and this course.</li>
<li><b>PostgreSQL</b>: open-source client-server engine, very standards-compliant, rich types (JSONB, arrays).</li>
<li><b>MySQL / MariaDB</b>: open-source, popular for web applications.</li>
<li><b>SQL Server</b>: Microsoft, T-SQL dialect, common in hospital IT.</li>
<li><b>Oracle</b>: commercial, PL/SQL, heavy enterprise and payor systems.</li>
</ul>
<p>Internally every engine has similar layers: a <b>parser</b>, an <b>optimizer</b> that picks a plan, an <b>executor</b>, and a <b>storage engine</b> with a buffer cache, B-tree indexes and a transaction log.</p>`,
    why: 'Knowing the engine tells you which features, functions and syntax you can use, and what limits to expect.',
    when: 'Before writing SQL for a new system; before copying SQL from the internet (it may be written for another engine).',
    analogy: 'Different billing clearinghouses all accept claims in the same X12 standard, but each has its own portal, extra fields and quirks. SQL is the standard; engines are the clearinghouses.',
    exampleSql: `SELECT sqlite_version() AS engine_version;`,
    syntax: `-- Find the engine version\nSELECT sqlite_version();   -- SQLite\nSELECT version();          -- PostgreSQL, MySQL\nSELECT @@VERSION;          -- SQL Server\nSELECT banner FROM v$version; -- Oracle`,
    sql: `SELECT sqlite_version() AS sqlite_version,
       (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table') AS tables,
       (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index') AS indexes;`,
    breakdown: [
      ['sqlite_version()', 'Engine-specific function: which SQLite build is running in your browser'],
      ["(SELECT COUNT(*) FROM sqlite_master WHERE type = 'table')", 'Engine catalog: how many tables exist'],
      ["type = 'index'", 'Indexes the engine created (here: automatic ones for UNIQUE constraints)'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 230" width="100%" role="img" aria-label="Embedded vs client-server">
  <g font-size="12">
  <text x="20" y="22" fill="var(--text)" font-weight="bold">Embedded (SQLite)</text>
  <rect x="20" y="34" width="260" height="150" rx="10" fill="none" stroke="var(--green)" stroke-width="2"/>
  <text x="150" y="54" text-anchor="middle" fill="var(--muted)">one process (app / browser)</text>
  <rect x="40" y="66" width="220" height="40" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="150" y="91" text-anchor="middle" fill="var(--text)">your app code</text>
  <rect x="40" y="116" width="220" height="40" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="150" y="141" text-anchor="middle" fill="var(--text)">SQLite library (function calls)</text>
  <text x="150" y="176" text-anchor="middle" fill="var(--muted)">-> billing.db (a single file)</text>
  <text x="340" y="22" fill="var(--text)" font-weight="bold">Client-server (PostgreSQL, MySQL, SQL Server, Oracle)</text>
  <rect x="340" y="40" width="120" height="36" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="400" y="63" text-anchor="middle" fill="var(--text)">web app</text>
  <rect x="340" y="90" width="120" height="36" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="400" y="113" text-anchor="middle" fill="var(--text)">report tool</text>
  <rect x="340" y="140" width="120" height="36" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="400" y="163" text-anchor="middle" fill="var(--text)">batch job</text>
  <line x1="460" y1="58" x2="510" y2="108" stroke="var(--blue)" stroke-width="2"/><line x1="460" y1="108" x2="510" y2="108" stroke="var(--blue)" stroke-width="2"/><line x1="460" y1="158" x2="510" y2="108" stroke="var(--blue)" stroke-width="2"/>
  <text x="485" y="84" fill="var(--blue)" font-size="10">network</text>
  <rect x="510" y="60" width="120" height="100" rx="10" fill="var(--panel2)" stroke="var(--blue)" stroke-width="2"/><text x="570" y="96" text-anchor="middle" fill="var(--text)" font-weight="bold">DB server</text><text x="570" y="116" text-anchor="middle" fill="var(--muted)">users, roles</text><text x="570" y="134" text-anchor="middle" fill="var(--muted)">many connections</text>
  </g>
</svg>` },
    internals: `<p>SQLite compiles each statement to bytecode for its virtual machine (you can see it with <code>EXPLAIN</code>). PostgreSQL uses a process per connection and MVCC with multiple row versions; MySQL InnoDB clusters rows by primary key; SQL Server and Oracle have sophisticated cost-based optimizers and parallel execution. The SQL you write is the same idea everywhere; the engine decides the physical work.</p>`,
    mistakes: [
      { wrong: `SELECT TOP 5 invoice_id FROM invoices;`, why: 'TOP is SQL Server syntax. SQLite (and PostgreSQL, MySQL) use LIMIT. Check which engine you are on.', fix: `SELECT invoice_id FROM invoices LIMIT 5;` },
      { wrong: `-- "SQLite is a toy, so it cannot run real SQL"`, why: 'SQLite supports CTEs, window functions, JSON, triggers and full transactions. Its limits are concurrency (one writer at a time) and no users/permissions, not SQL power.', fix: `SELECT invoice_id, total_amount, RANK() OVER (ORDER BY total_amount DESC) AS rnk FROM invoices LIMIT 5;` },
    ],
    rules: ['Every engine speaks SQL plus its own dialect.', 'Know your engine and version before writing SQL.', 'Embedded = in-process file; client-server = shared service.', 'Logical SQL is portable; physical behaviour differs.'],
    compare: `<table><tr><th>Engine</th><th>Model</th><th>Dialect</th><th>Typical use</th></tr><tr><td>SQLite</td><td>Embedded</td><td>SQLite SQL</td><td>Apps, devices, browsers, tests</td></tr><tr><td>PostgreSQL</td><td>Server</td><td>PL/pgSQL</td><td>General purpose, analytics</td></tr><tr><td>MySQL</td><td>Server</td><td>MySQL</td><td>Web apps</td></tr><tr><td>SQL Server</td><td>Server</td><td>T-SQL</td><td>Enterprise, hospitals</td></tr><tr><td>Oracle</td><td>Server</td><td>PL/SQL</td><td>Large enterprises, payors</td></tr></table>`,
    realWorld: 'A hospital might run its EHR on Oracle or SQL Server, its web patient portal on PostgreSQL, and cache data offline in SQLite on a tablet.',
    tryIt: { prompt: 'List every object in sqlite_master with its type and table name.', starter: `SELECT type, name, tbl_name FROM sqlite_master ORDER BY type, name;` },
    challenge: {
      level: 1,
      prompt: 'Ask the engine\'s catalog how many user tables exist (objects of type "table" in sqlite_master). Return one number.',
      solution: `SELECT COUNT(*) FROM sqlite_master WHERE type = 'table';`,
      hints: ['The catalog table is sqlite_master.', "Each object has a type such as 'table' or 'index'.", "Filter with WHERE type = 'table' and count.", "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table';"],
    },
    quiz: [
      { q: 'Which engine runs inside the application process with no server?', options: ['PostgreSQL', 'SQLite', 'Oracle', 'SQL Server'], answer: 1, why: 'SQLite is an embedded library.' },
      { q: 'Which part of an engine chooses indexes and join order?', options: ['Parser', 'Optimizer (planner)', 'Storage file', 'Client driver'], answer: 1, why: 'The optimizer builds the execution plan.' },
    ],
  },

  // ---------------------------------------------------------------- 19
  {
    id: 'foundations-19',
    goals: ['The four ACID properties: Atomicity, Consistency, Isolation, Durability', 'What each one protects against in a billing system', 'How engines implement them (logs, locks, MVCC)', 'How COMMIT and ROLLBACK relate to ACID'],
    concept: `<p><b>ACID</b> is the set of guarantees that make database transactions trustworthy:</p>
<ul>
<li><b>Atomicity</b>: all or nothing. Posting a payment inserts the payment, adds a ledger transaction, and updates the invoice status. Either all three happen or none do.</li>
<li><b>Consistency</b>: a transaction moves the database from one valid state to another. Constraints (FKs, CHECKs) are never left broken.</li>
<li><b>Isolation</b>: concurrent transactions do not see each other\'s half-finished work. Two clerks posting to the same invoice do not corrupt each other.</li>
<li><b>Durability</b>: once COMMIT returns, the data survives a crash or power loss.</li>
</ul>`,
    why: 'Money moves through billing systems. A crash between "record payment" and "mark invoice paid" must never leave the books out of balance.',
    when: 'Every time several related changes must succeed or fail together, and whenever many users change data at once.',
    analogy: 'Posting a check at the cashier: the receipt, the ledger entry and the account balance are updated together behind a curtain (isolation). If the drawer jams halfway, everything is undone (atomicity). Once the receipt is stamped, it is in the vault (durability), and the books always balance (consistency).',
    exampleSql: `SELECT transaction_id, invoice_id, transaction_type, amount FROM transactions WHERE invoice_id = 1 ORDER BY transaction_id;`,
    syntax: `BEGIN;\n  -- several changes\nCOMMIT;     -- make them permanent\n-- or\nROLLBACK;   -- undo them all`,
    sql: `BEGIN;
UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;
INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (3, NULL, '2026-09-01', 60, 'Cash');
ROLLBACK;
SELECT i.invoice_id, i.status,
       (SELECT COUNT(*) FROM payments p WHERE p.invoice_id = i.invoice_id AND p.payment_date = '2026-09-01') AS payments_today
FROM invoices i
WHERE i.invoice_id = 3;`,
    breakdown: [
      ['BEGIN;', 'Start a transaction: changes are now tentative'],
      ["UPDATE ... INSERT ...", 'Two related changes'],
      ['ROLLBACK;', 'Atomicity: undo both as one unit'],
      ['SELECT ...', 'The invoice status and payments are unchanged, as if nothing happened'],
    ],
    visual: { type: 'txn', scenario: 'rollback' },
    internals: `<p><b>Atomicity and durability</b> come from a log: SQLite uses a rollback journal or a write-ahead log (WAL); PostgreSQL uses WAL; Oracle uses redo/undo logs. Changes are logged and flushed (fsync) before COMMIT returns. <b>Isolation</b> comes from locks and/or <b>MVCC</b> (multi-version concurrency control: readers see a snapshot while writers create new row versions). <b>Consistency</b> is enforced by constraints checked during the transaction.</p>`,
    mistakes: [
      { wrong: `UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\n-- (app crashes here)\nINSERT INTO payments (invoice_id, payment_date, amount, method) VALUES (3, '2026-09-01', 60, 'Cash');`, why: 'Without an explicit transaction each statement commits by itself. A crash between them leaves an invoice marked Paid with no payment.', fix: `BEGIN;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\nINSERT INTO payments (invoice_id, payment_date, amount, method) VALUES (3, '2026-09-01', 60, 'Cash');\nCOMMIT;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 3;` },
      { wrong: `-- "Consistency means the data is always correct"`, why: 'The database only guarantees the rules you declared (constraints). If you never declared that payments must be positive, ACID will happily keep a negative payment.', fix: `SELECT payment_id, amount FROM payments WHERE amount <= 0;` },
    ],
    rules: ['A = all or nothing.', 'C = constraints hold before and after.', 'I = concurrent work does not interfere.', 'D = committed means permanent.', 'Group related changes in one transaction.'],
    compare: `<p><b>ACID vs BASE:</b> many distributed NoSQL systems choose BASE (Basically Available, Soft state, Eventually consistent), trading immediate consistency for availability and scale. Financial and billing data almost always needs ACID.</p>`,
    realWorld: 'Payment posting from an 835 remittance file runs as a transaction per claim: payment, adjustments, ledger entries and invoice status either all post or none do.',
    deep: `<p>Isolation has levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE), trading strictness for concurrency. SQLite is serializable by design (one writer at a time). PostgreSQL defaults to READ COMMITTED, where a re-read inside the same transaction can see other sessions\' newly committed changes.</p>`,
    tryIt: { prompt: 'Change ROLLBACK to COMMIT and run again. What changes in the final SELECT?', starter: `BEGIN;
UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;
ROLLBACK;
SELECT invoice_id, status FROM invoices WHERE invoice_id = 3;` },
    challenge: {
      level: 2,
      prompt: 'The transactions table is the ledger that ACID keeps in balance. Show invoice_id and the ledger balance (SUM of amount) for invoices 1 to 5, ordered by invoice_id.',
      solution: `SELECT invoice_id, SUM(amount) AS balance FROM transactions WHERE invoice_id BETWEEN 1 AND 5 GROUP BY invoice_id ORDER BY invoice_id;`,
      hints: ['Positive amounts raise the balance, negative ones lower it.', 'Filter invoice_id BETWEEN 1 AND 5.', 'GROUP BY invoice_id and SUM(amount).', 'SELECT invoice_id, SUM(amount) FROM transactions WHERE invoice_id BETWEEN 1 AND 5 GROUP BY invoice_id ORDER BY invoice_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'A payment insert succeeds but the invoice update fails, and both are undone. Which property?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 0, why: 'All or nothing.' },
      { q: 'After COMMIT the server loses power. The payment is still there on restart. Which property?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 3, why: 'Durability: committed data survives crashes.' },
      { q: 'Two clerks update the same invoice at once and neither sees the other\'s half-done work. Which property?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 2, why: 'Isolation separates concurrent transactions.' },
    ],
  },

  // ---------------------------------------------------------------- 20
  {
    id: 'foundations-20',
    goals: ['What a transaction is: BEGIN, COMMIT, ROLLBACK', 'Autocommit mode', 'Savepoints for partial rollback', 'Keeping transactions short'],
    concept: `<p>A <b>transaction</b> is a group of statements treated as one unit of work. You start it with <code>BEGIN</code>, then either <code>COMMIT</code> (make everything permanent) or <code>ROLLBACK</code> (undo everything since BEGIN).</p>
<p>Without BEGIN, most engines run in <b>autocommit</b> mode: every single statement is its own transaction and commits immediately.</p>
<p><b>Savepoints</b> are bookmarks inside a transaction: <code>SAVEPOINT s1</code> ... <code>ROLLBACK TO s1</code> undoes only the work after the bookmark, keeping earlier work.</p>
<p>While a transaction is open, other sessions do not see its changes, and it may hold locks, so keep it short.</p>`,
    why: 'Business operations span several statements. Transactions make them safe to run even when errors, crashes or other users get in the way.',
    when: 'Posting a payment with its ledger entry, transferring a balance between invoices, bulk imports, any multi-step change.',
    analogy: 'A cashier opens a batch (BEGIN), rings up several items, and either closes the sale (COMMIT) or voids the whole ticket (ROLLBACK). A savepoint is removing just the last item scanned without voiding the whole ticket.',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id IN (3, 5);`,
    syntax: `BEGIN;\n  statement1;\n  SAVEPOINT sp;\n  statement2;\n  ROLLBACK TO sp;   -- undo statement2 only\nCOMMIT;`,
    sql: `BEGIN;
INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)
VALUES (3, NULL, '2026-09-01', 60, 'Credit Card');
INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, reference_id, posted_by)
VALUES (3, '2026-09-01', 'PAYMENT', -60, last_insert_rowid(), 'billing.you');
SAVEPOINT before_status;
UPDATE invoices SET status = 'Void' WHERE invoice_id = 3;
ROLLBACK TO before_status;
UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;
COMMIT;
SELECT i.invoice_id, i.status, t.transaction_type, t.amount, t.posted_by
FROM invoices i JOIN transactions t ON t.invoice_id = i.invoice_id
WHERE i.invoice_id = 3
ORDER BY t.transaction_id;`,
    breakdown: [
      ['BEGIN;', 'Open the unit of work'],
      ['INSERT INTO payments ... INSERT INTO transactions ...', 'Record the payment and its ledger entry (last_insert_rowid() links them)'],
      ['SAVEPOINT before_status;', 'Bookmark the good state'],
      ["UPDATE ... 'Void' ... ROLLBACK TO before_status;", 'A mistaken update, undone without losing the payment'],
      ["UPDATE ... 'Paid' ... COMMIT;", 'The correct change, then everything is made permanent together'],
    ],
    visual: { type: 'txn', scenario: 'savepoint' },
    internals: `<p>In SQLite, BEGIN is deferred: locks are taken at the first read/write. The first write takes a RESERVED lock (one writer at a time); COMMIT flushes the journal/WAL to disk. <code>BEGIN IMMEDIATE</code> grabs the write lock up front, avoiding "database is locked" surprises later. Savepoints are nested sub-transactions recorded in the same journal.</p>`,
    mistakes: [
      { wrong: `BEGIN;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\n-- ... wait for the user to click OK for 10 minutes ...`, why: 'Long-open transactions hold locks and block other writers (in SQLite: every writer). Do user interaction before BEGIN, then run the transaction quickly.', fix: `BEGIN;\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\nCOMMIT;\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 3;` },
      { wrong: `BEGIN;\nDELETE FROM charges WHERE invoice_id = 4;\n-- forgot COMMIT, closed the connection`, why: 'An uncommitted transaction is rolled back when the connection closes. The work silently disappears.', fix: `BEGIN;\nDELETE FROM charges WHERE invoice_id = 4;\nCOMMIT;\nSELECT COUNT(*) FROM charges WHERE invoice_id = 4;` },
    ],
    rules: ['BEGIN ... COMMIT or ROLLBACK.', 'Autocommit = each statement is its own transaction.', 'Savepoints allow partial undo.', 'Keep transactions short; no user waits inside them.'],
    compare: `<table><tr><th>Engine</th><th>Start</th><th>Notes</th></tr><tr><td>SQLite</td><td>BEGIN [IMMEDIATE]</td><td>One writer at a time</td></tr><tr><td>PostgreSQL</td><td>BEGIN / START TRANSACTION</td><td>DDL is transactional too</td></tr><tr><td>SQL Server</td><td>BEGIN TRAN</td><td>@@TRANCOUNT for nesting</td></tr><tr><td>Oracle</td><td>implicit</td><td>A transaction starts with the first DML; DDL auto-commits</td></tr></table>`,
    realWorld: 'A refund workflow: insert the REFUND ledger entry, reverse the duplicate payment, reopen the invoice, all inside one transaction so auditors never see half a refund.',
    tryIt: { prompt: 'Replace COMMIT with ROLLBACK and confirm the payment and ledger entry both disappear.', starter: `BEGIN;
INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (3, NULL, '2026-09-01', 60, 'Cash');
COMMIT;
SELECT payment_id, invoice_id, amount, method FROM payments WHERE invoice_id = 3;` },
    challenge: {
      level: 2,
      prompt: 'Audit the ledger: count the transactions of each transaction_type, ordered by transaction_type.',
      solution: `SELECT transaction_type, COUNT(*) FROM transactions GROUP BY transaction_type ORDER BY transaction_type;`,
      hints: ['The ledger table is transactions.', 'Group by transaction_type.', 'COUNT(*) per group, ORDER BY transaction_type.', 'SELECT transaction_type, COUNT(*) FROM transactions GROUP BY transaction_type ORDER BY transaction_type;'],
      ordered: true,
    },
    quiz: [
      { q: 'In autocommit mode, when is an UPDATE made permanent?', options: ['At the next BEGIN', 'Immediately after the statement', 'When the connection closes', 'Never'], answer: 1, why: 'Each statement is its own transaction.' },
      { q: 'What does ROLLBACK TO sp do?', options: ['Undoes the whole transaction', 'Undoes only work after savepoint sp', 'Commits up to sp', 'Deletes the savepoint only'], answer: 1, why: 'It rewinds to the bookmark and the transaction continues.' },
    ],
  },

  // ---------------------------------------------------------------- 21
  {
    id: 'foundations-21',
    goals: ['What the ANSI/ISO SQL standard is', 'Major versions: SQL-86, SQL-92, SQL:1999, SQL:2003, SQL:2011, SQL:2016, SQL:2023', 'Which features are standard vs vendor-specific', 'Why writing standard SQL makes code portable'],
    concept: `<p><b>SQL</b> is standardized by ANSI and ISO (ISO/IEC 9075). The standard defines the core language that every engine is supposed to support.</p>
<ul>
<li><b>SQL-86/89</b>: the first standard (SELECT, INSERT, basic keys).</li>
<li><b>SQL-92</b>: explicit JOIN syntax, CASE, CAST, outer joins. The baseline most engines fully support.</li>
<li><b>SQL:1999</b>: recursive CTEs (WITH RECURSIVE), triggers, BOOLEAN.</li>
<li><b>SQL:2003</b>: window functions, MERGE, sequences.</li>
<li><b>SQL:2008/2011</b>: FETCH FIRST, TRUNCATE, temporal tables.</li>
<li><b>SQL:2016/2023</b>: JSON functions, row pattern matching, property graphs.</li>
</ul>
<p>No engine implements the whole standard, and every engine adds extensions. Writing standard SQL where possible (COALESCE instead of IFNULL/ISNULL/NVL, CASE instead of IIF/DECODE) keeps queries portable.</p>`,
    why: 'Standards let skills and code move between engines. A query written with standard JOIN, CASE and COALESCE runs almost anywhere.',
    when: 'When code may run on several engines, when writing shared reports or teaching material, or when you are unsure which extension exists.',
    analogy: 'CPT codes are a standard: 99214 means the same visit type to every payor. But each payor adds its own modifiers and rules. SQL is the CPT code set; dialects are the payor-specific rules.',
    exampleSql: `SELECT payor_id, payor_name, phone FROM payors ORDER BY payor_id;`,
    syntax: `-- Standard\nCOALESCE(a, b)\nCASE WHEN cond THEN x ELSE y END\nCAST(x AS INTEGER)\nFETCH FIRST 5 ROWS ONLY`,
    sql: `SELECT payor_name,
       COALESCE(phone, 'no phone on file')              AS phone,
       CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END AS status,
       CAST(contract_rate * 100 AS INTEGER)             AS pct_paid
FROM payors
ORDER BY payor_id;`,
    breakdown: [
      ["COALESCE(phone, 'no phone on file')", 'SQL-92 standard NULL replacement (vendor versions: IFNULL, ISNULL, NVL)'],
      ["CASE WHEN ... THEN ... ELSE ... END", 'SQL-92 standard conditional (vendor versions: IIF, IF, DECODE)'],
      ['CAST(... AS INTEGER)', 'SQL-92 standard conversion'],
      ['ORDER BY payor_id', 'Standard sorting; works everywhere'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 660 130" width="100%" role="img" aria-label="SQL standard timeline">
  <line x1="20" y1="60" x2="640" y2="60" stroke="var(--border)" stroke-width="3"/>
  <g font-size="11">
  <circle cx="40" cy="60" r="7" fill="var(--muted)"/><text x="40" y="40" text-anchor="middle" fill="var(--text)" font-weight="bold">1986</text><text x="40" y="84" text-anchor="middle" fill="var(--muted)">SQL-86</text>
  <circle cx="130" cy="60" r="7" fill="var(--blue)"/><text x="130" y="40" text-anchor="middle" fill="var(--text)" font-weight="bold">1992</text><text x="130" y="84" text-anchor="middle" fill="var(--muted)">JOIN, CASE</text><text x="130" y="98" text-anchor="middle" fill="var(--muted)">CAST</text>
  <circle cx="220" cy="60" r="7" fill="var(--green)"/><text x="220" y="40" text-anchor="middle" fill="var(--text)" font-weight="bold">1999</text><text x="220" y="84" text-anchor="middle" fill="var(--muted)">recursive CTE</text><text x="220" y="98" text-anchor="middle" fill="var(--muted)">triggers</text>
  <circle cx="310" cy="60" r="7" fill="var(--purple)"/><text x="310" y="40" text-anchor="middle" fill="var(--text)" font-weight="bold">2003</text><text x="310" y="84" text-anchor="middle" fill="var(--muted)">window funcs</text><text x="310" y="98" text-anchor="middle" fill="var(--muted)">MERGE</text>
  <circle cx="400" cy="60" r="7" fill="var(--yellow)"/><text x="400" y="40" text-anchor="middle" fill="var(--text)" font-weight="bold">2008-11</text><text x="400" y="84" text-anchor="middle" fill="var(--muted)">FETCH FIRST</text><text x="400" y="98" text-anchor="middle" fill="var(--muted)">temporal</text>
  <circle cx="500" cy="60" r="7" fill="var(--accent)"/><text x="500" y="40" text-anchor="middle" fill="var(--text)" font-weight="bold">2016</text><text x="500" y="84" text-anchor="middle" fill="var(--muted)">JSON</text><text x="500" y="98" text-anchor="middle" fill="var(--muted)">MATCH_RECOGNIZE</text>
  <circle cx="600" cy="60" r="7" fill="var(--red)"/><text x="600" y="40" text-anchor="middle" fill="var(--text)" font-weight="bold">2023</text><text x="600" y="84" text-anchor="middle" fill="var(--muted)">property graphs</text><text x="600" y="98" text-anchor="middle" fill="var(--muted)">JSON type</text>
  </g>
</svg>` },
    internals: `<p>The standard defines <b>logical</b> semantics: what result a query must produce (including the logical processing order FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY). It says nothing about indexes, storage or physical execution; each engine is free to compute the result however it likes, as long as the result matches.</p>`,
    mistakes: [
      { wrong: `SELECT payor_name, ISNULL(phone, 'none') FROM payors;`, why: 'ISNULL(a, b) is SQL Server. In SQLite, ISNULL is not a two-argument function. COALESCE is standard and works everywhere.', fix: `SELECT payor_name, COALESCE(phone, 'none') FROM payors;` },
      { wrong: `SELECT invoice_id FROM invoices WHERE status = "Paid";`, why: 'In standard SQL, double quotes are for identifiers (column/table names) and single quotes are for text. SQLite may accept this as a fallback, but other engines will look for a column named Paid.', fix: `SELECT invoice_id FROM invoices WHERE status = 'Paid';` },
    ],
    rules: ["Single quotes for strings, double quotes for identifiers.", 'Prefer COALESCE, CASE, CAST, explicit JOIN.', 'No engine is 100% standard.', 'The standard defines results, not performance.'],
    compare: `<table><tr><th>Task</th><th>Standard</th><th>Vendor variants</th></tr><tr><td>NULL fallback</td><td>COALESCE</td><td>IFNULL, ISNULL, NVL</td></tr><tr><td>Conditional</td><td>CASE</td><td>IIF, IF(), DECODE</td></tr><tr><td>First N rows</td><td>FETCH FIRST n ROWS ONLY</td><td>LIMIT, TOP, ROWNUM</td></tr><tr><td>Concatenate</td><td>a || b</td><td>CONCAT(), +</td></tr></table>`,
    realWorld: 'Vendors of billing software that must run on customers\' SQL Server, Oracle or PostgreSQL write mostly standard SQL and isolate dialect-specific bits in a small layer.',
    tryIt: { prompt: 'Rewrite the CASE as a standard expression that shows "High" when contract_rate >= 0.8, else "Standard".', starter: `SELECT payor_name, contract_rate,
       CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END AS status
FROM payors;` },
    challenge: {
      level: 2,
      prompt: "Using only standard functions, list every patient's patient_id and email, showing 'no email' when it is missing. Order by patient_id.",
      solution: `SELECT patient_id, COALESCE(email, 'no email') FROM patients ORDER BY patient_id;`,
      hints: ['Missing emails are NULL.', 'The standard NULL-replacement function takes several arguments and returns the first non-NULL.', "COALESCE(email, 'no email').", "SELECT patient_id, COALESCE(email, 'no email') FROM patients ORDER BY patient_id;"],
      ordered: true,
    },
    quiz: [
      { q: 'Which SQL standard introduced window functions?', options: ['SQL-92', 'SQL:1999', 'SQL:2003', 'SQL:2016'], answer: 2, why: 'SQL:2003 added window (OLAP) functions.' },
      { q: 'Which is the portable, standard way to replace NULL?', options: ['NVL', 'ISNULL', 'IFNULL', 'COALESCE'], answer: 3, why: 'COALESCE is in the standard and supported by all major engines.' },
    ],
  },

  // ---------------------------------------------------------------- 22
  {
    id: 'foundations-22',
    goals: ['What a SQL dialect is', 'The most common differences: row limits, strings, dates, NULL functions, auto-increment', 'How to translate a query between engines', 'Strategies for writing portable SQL'],
    concept: `<p>A <b>dialect</b> is an engine\'s flavour of SQL: the standard core plus its own syntax, functions and behaviours.</p>
<p>The differences you will meet most often:</p>
<ul>
<li><b>Limiting rows</b>: <code>LIMIT 5</code> (SQLite, PostgreSQL, MySQL), <code>TOP 5</code> (SQL Server), <code>FETCH FIRST 5 ROWS ONLY</code> (standard, Oracle 12c+, PostgreSQL).</li>
<li><b>Concatenation</b>: <code>||</code> (standard, SQLite, PostgreSQL, Oracle), <code>+</code> (SQL Server), <code>CONCAT()</code> (MySQL; everywhere except SQLite).</li>
<li><b>Dates</b>: SQLite <code>date()/strftime()</code>, PostgreSQL <code>date_trunc</code>/<code>interval</code>, SQL Server <code>DATEADD/DATEDIFF</code>, Oracle <code>ADD_MONTHS</code>/<code>TRUNC</code>.</li>
<li><b>Auto ids</b>: <code>INTEGER PRIMARY KEY</code> (SQLite), <code>SERIAL/IDENTITY</code> (PostgreSQL), <code>AUTO_INCREMENT</code> (MySQL), <code>IDENTITY(1,1)</code> (SQL Server).</li>
<li><b>Behaviour</b>: case sensitivity of text comparisons, empty string vs NULL (Oracle treats '' as NULL!), type strictness.</li>
</ul>`,
    why: 'Copying a query from one engine to another often fails or, worse, runs with different results. Knowing the common differences saves hours.',
    when: 'Migrating systems, reading documentation or examples written for another engine, or supporting several databases.',
    analogy: 'US and UK English: "check" vs "cheque", "MM/DD" vs "DD/MM". Same language, different local spellings, and a date misread can bill the wrong month.',
    exampleSql: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC LIMIT 5;`,
    syntax: `-- SQLite / PostgreSQL / MySQL\nSELECT ... ORDER BY x LIMIT 5;\n-- SQL Server\nSELECT TOP 5 ... ORDER BY x;\n-- Standard / Oracle 12c+\nSELECT ... ORDER BY x FETCH FIRST 5 ROWS ONLY;`,
    sql: `SELECT p.first_name || ' ' || p.last_name AS patient,
       i.invoice_id,
       strftime('%Y-%m', i.invoice_date)     AS billing_month,
       date(i.invoice_date, '+30 days')     AS due_30,
       i.total_amount
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id
ORDER BY i.total_amount DESC
LIMIT 5;`,
    breakdown: [
      ["p.first_name || ' ' || p.last_name", 'Standard concatenation (SQL Server uses +, MySQL CONCAT())'],
      ["strftime('%Y-%m', i.invoice_date)", 'SQLite date formatting (PostgreSQL to_char, SQL Server FORMAT, MySQL DATE_FORMAT)'],
      ["date(i.invoice_date, '+30 days')", 'SQLite date math (PostgreSQL + INTERVAL, SQL Server DATEADD)'],
      ['LIMIT 5', 'SQLite/PostgreSQL/MySQL row limit (SQL Server TOP, Oracle FETCH FIRST)'],
    ],
    dialectSql: {
      sqlite: `SELECT first_name || ' ' || last_name AS patient, date(invoice_date, '+30 days') AS due_30
FROM invoices JOIN patients USING (patient_id)
ORDER BY total_amount DESC LIMIT 5;`,
      postgres: `SELECT first_name || ' ' || last_name AS patient, invoice_date::date + INTERVAL '30 days' AS due_30
FROM invoices JOIN patients USING (patient_id)
ORDER BY total_amount DESC LIMIT 5;`,
      mysql: `SELECT CONCAT(first_name, ' ', last_name) AS patient, DATE_ADD(invoice_date, INTERVAL 30 DAY) AS due_30
FROM invoices JOIN patients USING (patient_id)
ORDER BY total_amount DESC LIMIT 5;`,
      sqlserver: `SELECT TOP 5 first_name + ' ' + last_name AS patient, DATEADD(day, 30, invoice_date) AS due_30
FROM invoices i JOIN patients p ON p.patient_id = i.patient_id
ORDER BY total_amount DESC;`,
      oracle: `SELECT first_name || ' ' || last_name AS patient, invoice_date + 30 AS due_30
FROM invoices JOIN patients USING (patient_id)
ORDER BY total_amount DESC FETCH FIRST 5 ROWS ONLY;`,
    },
    visual: { type: 'html', html: `<svg viewBox="0 0 640 170" width="100%" role="img" aria-label="Standard core with dialect extensions">
  <circle cx="320" cy="85" r="52" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/>
  <text x="320" y="80" text-anchor="middle" fill="var(--text)" font-size="13" font-weight="bold">ANSI core</text>
  <text x="320" y="98" text-anchor="middle" fill="var(--muted)" font-size="10">SELECT JOIN CASE</text>
  <g font-size="11">
  <rect x="20" y="15" width="170" height="46" rx="8" fill="none" stroke="var(--green)"/><text x="105" y="34" text-anchor="middle" fill="var(--green)" font-weight="bold">SQLite</text><text x="105" y="50" text-anchor="middle" fill="var(--muted)">strftime, IIF, typeof</text>
  <rect x="20" y="110" width="170" height="46" rx="8" fill="none" stroke="var(--blue)"/><text x="105" y="129" text-anchor="middle" fill="var(--blue)" font-weight="bold">PostgreSQL</text><text x="105" y="145" text-anchor="middle" fill="var(--muted)">::cast, ILIKE, JSONB</text>
  <rect x="450" y="15" width="170" height="46" rx="8" fill="none" stroke="var(--yellow)"/><text x="535" y="34" text-anchor="middle" fill="var(--yellow)" font-weight="bold">SQL Server</text><text x="535" y="50" text-anchor="middle" fill="var(--muted)">TOP, DATEADD, APPLY</text>
  <rect x="450" y="110" width="170" height="46" rx="8" fill="none" stroke="var(--red)"/><text x="535" y="129" text-anchor="middle" fill="var(--red)" font-weight="bold">Oracle</text><text x="535" y="145" text-anchor="middle" fill="var(--muted)">NVL, DECODE, ROWNUM</text>
  <rect x="235" y="148" width="170" height="20" rx="6" fill="none" stroke="var(--purple)"/><text x="320" y="162" text-anchor="middle" fill="var(--purple)">MySQL: CONCAT, IF, backticks</text>
  </g>
  <line x1="190" y1="38" x2="275" y2="60" stroke="var(--border)"/><line x1="190" y1="133" x2="275" y2="110" stroke="var(--border)"/><line x1="450" y1="38" x2="365" y2="60" stroke="var(--border)"/><line x1="450" y1="133" x2="365" y2="110" stroke="var(--border)"/>
</svg>` },
    internals: `<p>Beyond syntax, engines differ in <b>semantics</b>: default collation (MySQL compares text case-insensitively by default; PostgreSQL and SQLite are case-sensitive for =), integer division (<code>5/2</code> is 2 in SQLite, PostgreSQL, SQL Server but 2.5 in MySQL and Oracle), and Oracle storing '' as NULL. These cause silent result differences, which are more dangerous than syntax errors.</p>`,
    mistakes: [
      { wrong: `SELECT CONCAT(first_name, ' ', last_name) FROM patients;`, why: 'SQLite 3.44+ has CONCAT, but older SQLite versions do not; || is the standard operator and works in SQLite, PostgreSQL and Oracle.', fix: `SELECT first_name || ' ' || last_name AS full_name FROM patients LIMIT 5;` },
      { wrong: `SELECT invoice_id, total_amount / 3 FROM invoices WHERE total_amount = 100;\n-- "5/2 is 2.5 everywhere"`, why: 'Integer division rules differ. In SQLite 5/2 = 2 when both are integers. Multiply by 1.0 or CAST to force decimal division.', fix: `SELECT 5 / 2 AS int_div, 5 * 1.0 / 2 AS real_div;` },
    ],
    rules: ['Row limits: LIMIT vs TOP vs FETCH FIRST.', 'Concatenation: || vs + vs CONCAT.', 'Date functions differ the most; check docs.', 'Watch semantic differences: collation, integer division, empty string vs NULL.', 'Test queries on the target engine.'],
    compare: `<table><tr><th>Feature</th><th>SQLite</th><th>PostgreSQL</th><th>MySQL</th><th>SQL Server</th><th>Oracle</th></tr>
<tr><td>Top N</td><td>LIMIT</td><td>LIMIT / FETCH</td><td>LIMIT</td><td>TOP / OFFSET FETCH</td><td>FETCH FIRST / ROWNUM</td></tr>
<tr><td>Concat</td><td>||</td><td>||</td><td>CONCAT</td><td>+ / CONCAT</td><td>||</td></tr>
<tr><td>NULL fallback</td><td>IFNULL</td><td>COALESCE</td><td>IFNULL</td><td>ISNULL</td><td>NVL</td></tr>
<tr><td>Today</td><td>date('now')</td><td>CURRENT_DATE</td><td>CURDATE()</td><td>GETDATE()</td><td>SYSDATE</td></tr></table>`,
    realWorld: 'Migrating a clinic\'s billing system from SQL Server to PostgreSQL means rewriting TOP, DATEADD, ISNULL and + concatenation across hundreds of stored reports.',
    tryIt: { prompt: 'Change the query to show each invoice\'s due date 60 days after invoice_date using SQLite date math.', starter: `SELECT invoice_id, invoice_date, date(invoice_date, '+30 days') AS due_30
FROM invoices
LIMIT 5;` },
    challenge: {
      level: 2,
      prompt: "Show the 3 most recent invoices with invoice_id, the patient's full name as 'First Last', and invoice_date. Use SQLite syntax (|| and LIMIT). Order newest first, then by invoice_id.",
      solution: `SELECT i.invoice_id, p.first_name || ' ' || p.last_name, i.invoice_date FROM invoices i JOIN patients p ON p.patient_id = i.patient_id ORDER BY i.invoice_date DESC, i.invoice_id LIMIT 3;`,
      hints: ['Join invoices to patients.', "Concatenate with first_name || ' ' || last_name.", 'ORDER BY invoice_date DESC, invoice_id.', "SELECT i.invoice_id, p.first_name || ' ' || p.last_name, i.invoice_date FROM invoices i JOIN patients p ON p.patient_id = i.patient_id ORDER BY i.invoice_date DESC, i.invoice_id LIMIT 3;"],
      ordered: true,
    },
    quiz: [
      { q: 'Which engine uses SELECT TOP 5 ...?', options: ['SQLite', 'PostgreSQL', 'SQL Server', 'MySQL'], answer: 2, why: 'TOP is T-SQL (SQL Server).' },
      { q: "In Oracle, what is '' (empty string)?", options: ['An empty string', 'NULL', 'A space', 'An error'], answer: 1, why: 'Oracle treats zero-length strings as NULL, unlike other engines.' },
      { q: 'What does SELECT 5/2 return in SQLite?', options: ['2.5', '2', '3', 'Error'], answer: 1, why: 'Integer divided by integer is integer division in SQLite.' },
    ],
  },
  // ---------------------------------------------------------------- 23
  {
    id: 'foundations-23',
    goals: [
      'What "NoSQL" means and the four main families: document, key-value, wide-column, graph',
      'How the same billing data looks in a relational table vs a JSON document',
      'Trade-offs: schema, joins, transactions, scaling, query flexibility',
      'When to choose SQL, when NoSQL, and when to use JSON inside SQL as a middle ground',
    ],
    concept: `<p><b>Relational (SQL) databases</b> store data in tables with a fixed schema and link them with keys. You ask any question with joins, and ACID transactions keep related changes consistent. The billing database is relational: patients, invoices, charges and payments are separate tables.</p>
<p><b>NoSQL</b> ("not only SQL") is a family of databases that use other models:</p>
<ul>
<li><b>Document</b> (MongoDB, Couchbase, Firestore): each record is a JSON-like document that can nest related data, e.g. a patient with an array of invoices inside.</li>
<li><b>Key-value</b> (Redis, DynamoDB): a giant dictionary. Give a key, get a value. Extremely fast, but you can only look up by key.</li>
<li><b>Wide-column</b> (Cassandra, HBase, Bigtable): rows with flexible columns, partitioned across many servers, built for huge write volumes (sensor data, event logs).</li>
<li><b>Graph</b> (Neo4j, Neptune): nodes and edges, built for relationship questions like "which practitioners share patients?".</li>
</ul>
<p>The core trade-off: NoSQL systems usually <b>design the data around one access pattern</b> (load a whole patient document in one read, scale out easily), while SQL <b>designs the data around the facts</b> and lets you ask new questions later. Modern SQL engines also store <b>JSON</b> columns, so you can mix both.</p>`,
    why: 'Choosing a database is one of the hardest decisions to reverse. Knowing what each model is good at prevents building a billing ledger on a store without transactions, or forcing a flexible device-data feed into rigid tables.',
    when: 'When designing a new system or feature, when a team proposes "just use MongoDB/Redis", and when deciding whether semi-structured data (form answers, device readings, API payloads) belongs in a JSON column or separate tables.',
    analogy: 'A relational database is a filing cabinet with separate, cross-referenced drawers: patients, invoices, payments. A document database is one thick folder per patient with everything stapled inside: fast to grab one patient, painful to answer "total billed to Medicare across all folders". A key-value store is a coat-check: hand over the ticket, get the coat, nothing else.',
    exampleSql: `SELECT p.patient_id, p.first_name, p.last_name, i.invoice_id, i.invoice_date, i.total_amount FROM patients p JOIN invoices i ON i.patient_id = p.patient_id WHERE p.patient_id = 3 ORDER BY i.invoice_id`,
    syntax: `-- Relational: facts in separate tables, joined on demand
SELECT ... FROM patients p JOIN invoices i ON i.patient_id = p.patient_id;

-- Document: one nested JSON value per entity
{ "patient_id": 3, "name": "Aiden Johnson",
  "invoices": [ { "invoice_id": 14, "total": 95 }, ... ] }

-- JSON in SQL (SQLite): build or read documents
json_object('key', value), json_group_array(...), json_extract(doc, '$.path')`,
    sql: `-- Build a MongoDB-style patient document from relational tables
SELECT json_object(
         'patient_id', p.patient_id,
         'name',       p.first_name || ' ' || p.last_name,
         'city',       p.city,
         'invoices',   (SELECT json_group_array(
                                 json_object('invoice_id', i.invoice_id,
                                             'date',       i.invoice_date,
                                             'status',     i.status,
                                             'total',      i.total_amount))
                        FROM invoices i
                        WHERE i.patient_id = p.patient_id)
       ) AS patient_document
FROM patients p
WHERE p.patient_id IN (3, 13)
ORDER BY p.patient_id;`,
    breakdown: [
      ["json_object('patient_id', p.patient_id, ...)", 'Builds one JSON object per patient: key, value, key, value.'],
      ["'name', p.first_name || ' ' || p.last_name", 'Document stores often keep display-ready, denormalized fields.'],
      ['(SELECT json_group_array(json_object(...)) FROM invoices i WHERE ...)', 'Nests the patient\'s invoices as an array inside the document: the "embedding" a document database does.'],
      ['WHERE p.patient_id IN (3, 13)', 'Two sample patients: 3 has four invoices, 13 has two.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 660 270" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="11">
<text x="10" y="18" fill="var(--text)" font-weight="bold" font-size="13">Same patient, five data models</text>
<rect x="10" y="30" width="200" height="110" rx="6" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/>
<text x="20" y="48" fill="var(--accent)" font-weight="bold">Relational (SQL)</text>
<rect x="20" y="56" width="85" height="34" fill="none" stroke="var(--border)"/><text x="25" y="70" fill="var(--text)">patients</text><text x="25" y="84" fill="var(--muted)">3 | Aiden</text>
<rect x="115" y="56" width="85" height="34" fill="none" stroke="var(--border)"/><text x="120" y="70" fill="var(--text)">invoices</text><text x="120" y="84" fill="var(--muted)">14 | 3 | 95</text>
<line x1="105" y1="78" x2="115" y2="78" stroke="var(--accent)"/>
<text x="20" y="110" fill="var(--text)">tables + keys + JOIN</text><text x="20" y="126" fill="var(--green)">any question, ACID</text>
<rect x="225" y="30" width="200" height="110" rx="6" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="235" y="48" fill="var(--blue)" font-weight="bold">Document</text>
<text x="235" y="66" fill="var(--text)" font-family="monospace">{ "id": 3, "name": "Aiden",</text>
<text x="235" y="80" fill="var(--text)" font-family="monospace">  "invoices": [</text>
<text x="235" y="94" fill="var(--text)" font-family="monospace">    {"id": 14, "total": 95} ] }</text>
<text x="235" y="126" fill="var(--green)">one read per patient</text>
<rect x="440" y="30" width="210" height="110" rx="6" fill="var(--panel2)" stroke="var(--purple)"/>
<text x="450" y="48" fill="var(--purple)" font-weight="bold">Key-value</text>
<text x="450" y="70" fill="var(--text)" font-family="monospace">"patient:3" → {…blob…}</text>
<text x="450" y="88" fill="var(--text)" font-family="monospace">"session:ab12" → {…}</text>
<text x="450" y="126" fill="var(--green)">fastest lookup, key only</text>
<rect x="10" y="155" width="310" height="105" rx="6" fill="var(--panel2)" stroke="var(--yellow)"/>
<text x="20" y="173" fill="var(--yellow)" font-weight="bold">Wide-column</text>
<text x="20" y="193" fill="var(--text)" font-family="monospace">row key: patient#3</text>
<text x="20" y="209" fill="var(--text)" font-family="monospace">  2025-03-21:inv43=165  2025-05-23:inv14=95</text>
<text x="20" y="245" fill="var(--green)">huge write volumes, partitioned by key</text>
<rect x="335" y="155" width="315" height="105" rx="6" fill="var(--panel2)" stroke="var(--red)"/>
<text x="345" y="173" fill="var(--red)" font-weight="bold">Graph</text>
<circle cx="385" cy="215" r="18" fill="none" stroke="var(--text)"/><text x="373" y="219" fill="var(--text)">Pt 3</text>
<circle cx="480" cy="200" r="18" fill="none" stroke="var(--text)"/><text x="467" y="204" fill="var(--text)">Dr 4</text>
<circle cx="580" cy="220" r="18" fill="none" stroke="var(--text)"/><text x="567" y="224" fill="var(--text)">Pt 7</text>
<line x1="403" y1="211" x2="462" y2="203" stroke="var(--red)"/><line x1="498" y1="204" x2="562" y2="217" stroke="var(--red)"/>
<text x="345" y="252" fill="var(--green)">relationship hops</text>
</svg>` },
    dialectSql: {
      sqlite: `SELECT json_extract('{"name":"Aiden Johnson","invoices":[{"invoice_id":14}]}', '$.invoices[0].invoice_id');`,
      postgres: `-- JSONB column with an index: document flexibility inside a relational DB
CREATE TABLE intake_forms (form_id serial PRIMARY KEY, patient_id int REFERENCES patients, answers jsonb);
CREATE INDEX ON intake_forms USING gin (answers);
SELECT patient_id FROM intake_forms WHERE answers @> '{"smoker": true}';`,
      mysql: `SELECT JSON_EXTRACT(answers, '$.smoker') FROM intake_forms;  -- or answers->'$.smoker'`,
      sqlserver: `SELECT JSON_VALUE(answers, '$.smoker') FROM intake_forms;   -- JSON stored in NVARCHAR`,
      oracle: `SELECT JSON_VALUE(answers, '$.smoker') FROM intake_forms;`,
    },
    internals: `<p>Relational engines normalize data and assemble answers at query time with joins, using B-tree indexes and a cost-based optimizer; ACID transactions span any rows in any tables. Document stores keep each document together on disk, so reading one patient is a single lookup, but a question that crosses documents ("total billed per payor") must scan all of them or use pre-built indexes and aggregation pipelines. Many NoSQL systems partition data across servers by key and relax consistency for availability (the CAP trade-off, "eventual consistency"), although modern ones (MongoDB, DynamoDB) now offer multi-document transactions with limits.</p>
<p>In SQLite, JSON is stored as TEXT (or JSONB binary since 3.45) and the <code>json_*</code> functions parse it on the fly. PostgreSQL's <code>jsonb</code> is a parsed binary format that can be indexed with GIN.</p>`,
    mistakes: [
      { wrong: `-- Store each patient as one JSON blob, including all invoices and payments,
-- then compute monthly revenue by scanning and parsing every blob.
SELECT json_extract(value, '$.total') FROM json_each('[{"total":95},{"total":165}]');`, why: 'Financial data needs cross-entity questions, constraints and multi-row transactions (a payment and its ledger entry must commit together). Embedding it all in documents makes reporting slow and consistency your application\'s problem.', fix: `SELECT strftime('%Y-%m', invoice_date) AS month, SUM(total_amount) AS billed
FROM invoices GROUP BY month ORDER BY month;` },
      { wrong: `-- "NoSQL means no schema, so no design needed"`, why: 'The schema still exists, it just lives in the application code. Without design, documents drift (city vs City vs address.city) and every reader must handle every variant.', fix: `SELECT json_extract('{"city":"Austin"}', '$.city') AS city;  -- agree on one path, validate on write` },
      { wrong: `-- Split a variable-length questionnaire into 200 nullable columns
SELECT patient_id, allergies FROM patients;`, why: 'The opposite mistake: forcing truly flexible, rarely-queried data into rigid columns. A JSON column (or a key-value child table) inside the relational DB is often the better middle ground.', fix: `SELECT patient_id, json_object('allergies', allergies, 'city', city) AS profile FROM patients WHERE allergies IS NOT NULL;` },
    ],
    rules: [
      'Relational: model the facts, ask any question later.',
      'NoSQL: model around the main access pattern, scale out easily.',
      'Money, ledgers and anything needing multi-row ACID: relational first.',
      'Flexible or nested attributes: JSON columns inside SQL are a strong middle ground.',
      '"Schemaless" means the schema moves into your code, not that it disappears.',
    ],
    compare: `<table><tr><th>Model</th><th>Best at</th><th>Weak at</th><th>Healthcare example</th></tr>
<tr><td>Relational</td><td>Ad-hoc queries, joins, ACID, constraints</td><td>Scaling writes across many servers</td><td>Billing, claims, ledger</td></tr>
<tr><td>Document</td><td>Nested objects read as a whole, evolving fields</td><td>Cross-document aggregates, joins</td><td>Patient-app profiles, intake forms</td></tr>
<tr><td>Key-value</td><td>Very fast get/set by key, caching</td><td>Any query not by key</td><td>Sessions, eligibility cache</td></tr>
<tr><td>Wide-column</td><td>Massive write volume, time-ordered data</td><td>Ad-hoc queries, joins</td><td>Device and vitals telemetry</td></tr>
<tr><td>Graph</td><td>Multi-hop relationships</td><td>Bulk aggregation</td><td>Referral networks, fraud rings</td></tr></table>`,
    realWorld: 'A typical health-tech stack is polyglot: PostgreSQL or SQL Server for billing and claims, Redis for sessions and cached eligibility checks, a document store or JSONB for patient-app preferences, a time-series or wide-column store for device data, and a warehouse (star schema) for analytics. FHIR healthcare APIs exchange JSON documents, which are often stored in JSONB columns of a relational database.',
    tips: [
      'Start with a relational database unless you have a clear reason not to; add specialized stores for specific needs.',
      'Ask "what questions will we ask of this data?" before choosing a model.',
      'Use JSON columns for attributes you store and display but rarely filter or join on.',
    ],
    deep: `<p>The lines have blurred. PostgreSQL (jsonb + GIN indexes), MySQL, SQL Server and Oracle all support JSON querying; SQLite ships json_* and JSONB functions. Meanwhile MongoDB added multi-document ACID transactions and a SQL-like aggregation pipeline, and "NewSQL" systems (CockroachDB, Spanner, YugabyteDB) offer SQL with horizontal scaling. The real design question is not "SQL or NoSQL" but: which consistency guarantees do I need, which access patterns dominate, and who will query this data in ways I cannot predict yet? For billing, the answer is almost always strong consistency and ad-hoc queries, which means relational.</p>`,
    tryIt: {
      prompt: 'Go the other way: read values out of a JSON document with json_extract and json_each, the way you would query a document store.',
      starter: `WITH docs(doc) AS (
  VALUES ('{"patient_id": 3, "name": "Aiden Johnson", "invoices": [{"invoice_id": 43, "total": 165}, {"invoice_id": 14, "total": 95}]}')
)
SELECT json_extract(doc, '$.name')                   AS name,
       json_extract(inv.value, '$.invoice_id')      AS invoice_id,
       json_extract(inv.value, '$.total')           AS total
FROM docs, json_each(doc, '$.invoices') AS inv;`,
    },
    challenge: {
      level: 2,
      prompt: "Export one JSON document per patient who has at least one invoice, as a document store would hold it. Return patient_id and a document built with json_object with exactly these keys in this order: 'name' (first_name || ' ' || last_name), 'invoice_count', 'total_billed' (sum of total_amount). Order by patient_id.",
      solution: `SELECT p.patient_id,
       json_object('name',          p.first_name || ' ' || p.last_name,
                   'invoice_count', COUNT(*),
                   'total_billed',  SUM(i.total_amount)) AS patient_document
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id
GROUP BY p.patient_id
ORDER BY p.patient_id;`,
      hints: [
        'Join patients to invoices (an inner join keeps only patients with invoices).',
        'GROUP BY p.patient_id so COUNT(*) and SUM(i.total_amount) are per patient.',
        "json_object takes alternating keys and values: json_object('name', ..., 'invoice_count', ..., 'total_billed', ...).",
        "SELECT p.patient_id, json_object('name', p.first_name || ' ' || p.last_name, 'invoice_count', COUNT(*), 'total_billed', SUM(i.total_amount)) FROM patients p JOIN invoices i ON i.patient_id = p.patient_id GROUP BY p.patient_id ORDER BY p.patient_id;",
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Which model is best for "total billed per payor per month across all patients"?', options: ['Key-value store', 'Relational database', 'Graph database', 'Document store with one document per patient'], answer: 1, why: 'Cross-entity aggregation with joins is what relational engines are built for.' },
      { q: 'A key-value store like Redis is ideal for...', options: ['Ad-hoc reporting', 'Fast lookups of a value by its key, e.g. session or cache data', 'Multi-hop relationship queries', 'Enforcing foreign keys'], answer: 1, why: 'Key-value stores only look up by key, but do it extremely fast.' },
      { q: 'What is a good middle ground for flexible intake-form answers in a billing system?', options: ['A separate NoSQL database only for forms', 'A JSON/JSONB column in the relational database', '200 nullable columns', 'Storing them in a text file'], answer: 1, why: 'JSON columns keep flexibility while staying in the same transactional database.' },
    ],
  },
]);
