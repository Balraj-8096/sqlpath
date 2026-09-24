// Database-Specific SQL (dialects): MySQL, PostgreSQL, SQL Server, Oracle, SQLite, Cross-Database.
// Vendor-only examples set `dialect` (shown, not run). tryIt / challenge always run on SQLite.
Lessons.add([
  // ───────────────────────────── MySQL ─────────────────────────────
  {
    id: 'dialects-01',
    goals: ['The layers inside a MySQL server', 'What a storage engine is and why InnoDB is the default', 'How a query travels from connection to disk', 'How to inspect table metadata (and the SQLite equivalent)'],
    concept: `<p>MySQL is a <b>client-server</b> database. Your app connects over the network, sends SQL text, and the server sends rows back.</p>
<p>Inside, the server is split into two big halves:</p>
<ul>
<li><b>The SQL layer</b> (shared by every table): connection handling, the parser, the optimizer, and the executor. It understands SQL.</li>
<li><b>The storage engine layer</b> (chosen per table): the code that actually stores rows on disk and reads them back. It understands pages, rows and indexes, not SQL.</li>
</ul>
<p>The two halves talk through the <b>storage engine API</b> ("give me the next row", "find the row with key 42"). The default engine is <b>InnoDB</b>: it supports transactions, row-level locks, crash recovery and foreign keys. Older <b>MyISAM</b> has none of these.</p>
<p>InnoDB keeps every table as a <b>clustered index</b>: the rows live inside the primary-key B-tree, so looking up <code>invoice_id = 42</code> lands directly on the row.</p>`,
    why: 'Knowing the layers explains MySQL behaviour that surprises people: why engine choice changes whether transactions work, why the primary key matters so much for speed, and where tuning knobs live.',
    when: 'When you choose table engines, design primary keys, read EXPLAIN output, or debug locking and crash-recovery issues on MySQL.',
    analogy: 'Think of a hospital billing office. The front desk (connection layer) checks who you are. A coder (parser) reads the claim, a billing manager (optimizer) decides the fastest way to process it, and a clerk (executor) does the work. The filing system in the back room (storage engine) can be a locked, audited vault (InnoDB) or an open shelf with no audit trail (MyISAM). The staff at the front never touch the shelves directly; they ask the back room.',
    syntax: `SHOW ENGINES;\nSHOW TABLE STATUS LIKE 'table_name';\nCREATE TABLE t (...) ENGINE = InnoDB;`,
    dialect: 'mysql',
    sql: `-- Which engine stores the invoices table, and how big is it?
SHOW TABLE STATUS LIKE 'invoices';

-- Create a table on the transactional engine explicitly
CREATE TABLE claim_audit (
  audit_id   INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  note       VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
) ENGINE = InnoDB;`,
    breakdown: [
      ['SHOW TABLE STATUS LIKE ...', 'MySQL-specific command: reports the engine, row estimate, data size and index size of a table'],
      ['AUTO_INCREMENT PRIMARY KEY', 'InnoDB clusters rows by this key, so a short, ever-increasing key keeps inserts fast'],
      ['FOREIGN KEY ... REFERENCES', 'Enforced only by InnoDB; MyISAM silently ignores it'],
      ['ENGINE = InnoDB', 'Picks the storage engine for this table (InnoDB is already the default since MySQL 5.5)'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 360" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="13">
<rect x="20" y="10" width="600" height="40" rx="8" fill="var(--panel2)" stroke="var(--border)"/>
<text x="320" y="35" text-anchor="middle" fill="var(--text)">Clients: billing app, reports, mysql CLI</text>
<rect x="20" y="65" width="600" height="40" rx="8" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="320" y="90" text-anchor="middle" fill="var(--text)">Connection layer: threads, authentication, SSL</text>
<rect x="20" y="120" width="600" height="95" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>
<text x="30" y="138" fill="var(--accent)" font-weight="bold">SQL layer (shared)</text>
<rect x="40" y="150" width="130" height="50" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="105" y="180" text-anchor="middle" fill="var(--text)">Parser</text>
<rect x="185" y="150" width="130" height="50" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="250" y="180" text-anchor="middle" fill="var(--text)">Optimizer</text>
<rect x="330" y="150" width="130" height="50" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="395" y="180" text-anchor="middle" fill="var(--text)">Executor</text>
<rect x="475" y="150" width="130" height="50" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="540" y="172" text-anchor="middle" fill="var(--text)">Metadata /</text><text x="540" y="188" text-anchor="middle" fill="var(--text)">privileges</text>
<rect x="20" y="228" width="600" height="28" rx="6" fill="var(--panel2)" stroke="var(--purple)"/>
<text x="320" y="247" text-anchor="middle" fill="var(--text)">Storage engine API (read row, write row, index lookup)</text>
<rect x="20" y="268" width="290" height="50" rx="8" fill="var(--panel2)" stroke="var(--green)" stroke-width="2"/>
<text x="165" y="289" text-anchor="middle" fill="var(--text)" font-weight="bold">InnoDB (default)</text>
<text x="165" y="307" text-anchor="middle" fill="var(--muted)">ACID, row locks, MVCC, FKs, buffer pool</text>
<rect x="325" y="268" width="140" height="50" rx="8" fill="var(--panel2)" stroke="var(--yellow)"/>
<text x="395" y="289" text-anchor="middle" fill="var(--text)">MyISAM</text><text x="395" y="307" text-anchor="middle" fill="var(--muted)">no transactions</text>
<rect x="480" y="268" width="140" height="50" rx="8" fill="var(--panel2)" stroke="var(--border)"/>
<text x="550" y="289" text-anchor="middle" fill="var(--text)">MEMORY</text><text x="550" y="307" text-anchor="middle" fill="var(--muted)">lost on restart</text>
<rect x="20" y="328" width="600" height="28" rx="6" fill="var(--panel2)" stroke="var(--border)"/>
<text x="320" y="347" text-anchor="middle" fill="var(--text)">Disk: .ibd tablespaces, redo log, undo log, binary log (replication)</text>
</svg>` },
    internals: `<p>InnoDB caches data and index pages in the <b>buffer pool</b> (often 50-75% of server RAM). Changes are written first to the <b>redo log</b> (write-ahead logging) so a crash can be replayed, and old row versions go to the <b>undo log</b> so readers see a consistent snapshot (MVCC) without blocking writers. The <b>binary log</b> is a separate, server-level log used for replication and point-in-time recovery.</p>`,
    mistakes: [
      { wrong: `CREATE TABLE payments_copy (...) ENGINE = MyISAM;\nSTART TRANSACTION; ... ROLLBACK;`, why: 'MyISAM ignores transactions. The ROLLBACK does nothing and the rows stay. Foreign keys are also silently ignored.', fix: `SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name = 'payments';` },
      { wrong: `CREATE TABLE charges (charge_uuid CHAR(36) PRIMARY KEY, ...) ENGINE=InnoDB;`, why: 'Random UUIDs as the clustered key scatter inserts all over the B-tree, causing page splits and a bloated buffer pool.', fix: `SELECT charge_id, invoice_id FROM charges ORDER BY charge_id LIMIT 5;` },
    ],
    rules: ['The SQL layer understands SQL; the storage engine stores rows.', 'Use InnoDB unless you have a very specific reason not to.', 'In InnoDB the primary key IS the table layout: keep it short and increasing.', 'Foreign keys and transactions only work on engines that support them.'],
    compare: `<table><tr><th></th><th>MySQL</th><th>PostgreSQL</th><th>SQLite</th></tr>
<tr><td>Model</td><td>Client-server, threads</td><td>Client-server, processes</td><td>Embedded library</td></tr>
<tr><td>Pluggable engines</td><td>Yes (InnoDB, MyISAM...)</td><td>No (one heap engine)</td><td>No (one B-tree file)</td></tr>
<tr><td>Table layout</td><td>Clustered by PK</td><td>Heap + separate indexes</td><td>Clustered by rowid</td></tr>
<tr><td>Inspect a table</td><td><code>SHOW TABLE STATUS</code></td><td><code>\\d+ table</code></td><td><code>PRAGMA table_info</code></td></tr></table>`,
    realWorld: 'MySQL powers many practice-management and patient-portal systems. DBAs size the InnoDB buffer pool so the hot invoices and charges pages stay in memory, and use the binary log to feed read replicas that serve reporting dashboards.',
    tips: ['Run SHOW ENGINES once on a new server to see what is available.', 'SQLite has no engines, but sqlite_master shows how every table was created.'],
    deep: `<p>Because secondary indexes in InnoDB store the primary key value (not a physical row pointer), every secondary-index lookup ends with a second lookup in the clustered index. A wide primary key therefore makes <i>every</i> index bigger.</p>`,
    tryIt: { prompt: 'SQLite has no storage engines, but it keeps the CREATE statement of every table in sqlite_master. Run this, then change it to show only the invoices table.', starter: `SELECT type, name, sql\nFROM sqlite_master\nWHERE type = 'table'\nORDER BY name;` },
    challenge: {
      level: 2,
      prompt: 'Like MySQL\'s SHOW TABLE STATUS, build a metadata report: for every table in sqlite_master, show the table name and how many columns it has, sorted by table name.',
      solution: `SELECT m.name AS table_name, COUNT(*) AS column_count
FROM sqlite_master AS m
JOIN pragma_table_info(m.name) AS p
WHERE m.type = 'table'
GROUP BY m.name
ORDER BY m.name;`,
      hints: ['Table names live in sqlite_master where type = \'table\'.', 'pragma_table_info(name) is a table-valued function returning one row per column.', 'Join sqlite_master to pragma_table_info(m.name), then GROUP BY the table name.', 'SELECT m.name, COUNT(*) FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type=\'table\' GROUP BY m.name ORDER BY m.name;'],
      ordered: true,
    },
    quiz: [
      { q: 'Which MySQL layer decides whether to use an index?', options: ['Connection layer', 'Optimizer in the SQL layer', 'The storage engine', 'The binary log'], answer: 1, why: 'The optimizer (in the shared SQL layer) chooses the plan; the engine only executes row and index operations.' },
      { q: 'What happens to a FOREIGN KEY clause on a MyISAM table?', options: ['It is enforced', 'It causes an error', 'It is parsed but silently ignored', 'It converts the table to InnoDB'], answer: 2, why: 'MyISAM does not support foreign keys; MySQL accepts the syntax but enforces nothing.' },
      { q: 'In InnoDB, where do the table rows physically live?', options: ['In a heap file separate from indexes', 'Inside the primary-key B-tree (clustered index)', 'In the binary log', 'Only in memory'], answer: 1, why: 'InnoDB tables are clustered indexes: the leaf pages of the PK B-tree hold the full rows.' },
    ],
  },
  {
    id: 'dialects-02',
    goals: ['Store and read JSON documents in MySQL', 'Use JSON_EXTRACT, -> and ->>', 'Build JSON with JSON_OBJECT and JSON_ARRAYAGG', 'Do the same work in SQLite with json_* functions'],
    concept: `<p>Sometimes data does not fit neat columns: an insurance eligibility response, a list of diagnosis codes, a device reading. MySQL has a native <code>JSON</code> column type that validates and stores documents in a binary format.</p>
<p>You read inside a document with a <b>JSON path</b>: <code>'$.plan.copay'</code> means "the copay field inside the plan object". Array items use <code>$[0]</code>.</p>
<ul>
<li><code>JSON_EXTRACT(doc, '$.path')</code> or <code>doc->'$.path'</code> returns a JSON value (strings keep their quotes).</li>
<li><code>doc->>'$.path'</code> returns plain text (unquoted).</li>
<li><code>JSON_OBJECT('k', v, ...)</code> and <code>JSON_ARRAY(...)</code> build documents; <code>JSON_ARRAYAGG()</code> / <code>JSON_OBJECTAGG()</code> aggregate rows into JSON.</li>
</ul>
<p>SQLite has almost the same toolkit: <code>json_extract</code>, <code>-></code>, <code>->></code>, <code>json_object</code>, <code>json_group_array</code>.</p>`,
    why: 'APIs and payors exchange JSON. Being able to build and parse it in SQL avoids round trips through application code.',
    when: 'Use JSON for flexible, rarely-filtered attributes (payer response payloads, UI preferences). Keep core billing facts (amounts, dates, ids) in real columns.',
    analogy: 'A JSON column is like the "attachments" folder on a claim: useful for the odd document that does not fit the form, but you would never keep the claim amount only inside an attachment.',
    syntax: `JSON_EXTRACT(doc, '$.key')   -- or doc->'$.key'\ndoc->>'$.key'                -- unquoted text\nJSON_OBJECT('k1', v1, 'k2', v2)\nJSON_ARRAYAGG(expr)`,
    dialect: 'mysql',
    sql: `-- Eligibility responses stored as JSON
SELECT patient_id,
       eligibility->>'$.plan.name'        AS plan_name,
       eligibility->'$.plan.copay'        AS copay,
       JSON_LENGTH(eligibility, '$.dx')   AS dx_count
FROM   patient_eligibility
WHERE  eligibility->>'$.status' = 'active';

-- Build one JSON document per payor
SELECT JSON_OBJECT('payor', p.payor_name,
                   'invoices', JSON_ARRAYAGG(i.invoice_id)) AS doc
FROM payors p JOIN invoices i ON i.payor_id = p.payor_id
GROUP BY p.payor_id, p.payor_name;`,
    breakdown: [
      ['eligibility->>\'$.plan.name\'', 'Walks into the plan object and returns name as plain text'],
      ['eligibility->\'$.plan.copay\'', 'Returns the value as JSON (numbers look the same, strings would keep quotes)'],
      ['JSON_LENGTH(eligibility, \'$.dx\')', 'Counts items in the dx array'],
      ['JSON_OBJECT(...)', 'Builds a document from key/value pairs'],
      ['JSON_ARRAYAGG(i.invoice_id)', 'Aggregate: collects every invoice id of the group into a JSON array'],
    ],
    dialectSql: {
      mysql: `SELECT JSON_OBJECT('id', payor_id, 'name', payor_name) AS doc,\n       JSON_OBJECT('id', 1)->>'$.id' AS id_text\nFROM payors;`,
      postgres: `SELECT jsonb_build_object('id', payor_id, 'name', payor_name) AS doc,\n       jsonb_build_object('id', 1)->>'id' AS id_text\nFROM payors;`,
      sqlserver: `SELECT payor_id AS id, payor_name AS name\nFROM payors\nFOR JSON PATH;          -- JSON_VALUE(doc, '$.id') to read`,
      oracle: `SELECT JSON_OBJECT('id' VALUE payor_id, 'name' VALUE payor_name) AS doc\nFROM payors;            -- JSON_VALUE(doc, '$.id') to read`,
      sqlite: `SELECT json_object('id', payor_id, 'name', payor_name) AS doc,\n       json_object('id', 1)->>'$.id' AS id_text\nFROM payors;`,
    },
    mistakes: [
      { wrong: `SELECT * FROM patient_eligibility WHERE eligibility->'$.status' = 'active';`, why: '-> returns a JSON value. In MySQL the comparison works for strings only because of JSON comparison rules, and it becomes confusing when you concatenate or cast. Use ->> when you want text.', fix: `SELECT json_object('status','active')->>'$.status' AS status_text;` },
      { wrong: `SELECT json_extract(doc, 'plan.name') FROM t;`, why: 'JSON paths must start with $ (the document root).', fix: `SELECT json_extract('{"plan":{"name":"Gold"}}', '$.plan.name') AS plan_name;` },
    ],
    rules: ['Paths start at $: $.key, $.a.b, $.arr[0].', '-> gives JSON, ->> gives text.', 'Keep amounts, dates and keys in real columns; JSON is for the flexible leftovers.', 'To index a JSON field in MySQL, add a generated column and index it.'],
    compare: `<table><tr><th>Task</th><th>MySQL</th><th>SQLite</th></tr>
<tr><td>Read text</td><td><code>doc->>'$.a'</code></td><td><code>doc->>'$.a'</code> / <code>json_extract</code></td></tr>
<tr><td>Build object</td><td><code>JSON_OBJECT</code></td><td><code>json_object</code></td></tr>
<tr><td>Aggregate to array</td><td><code>JSON_ARRAYAGG</code></td><td><code>json_group_array</code></td></tr>
<tr><td>Explode array</td><td><code>JSON_TABLE</code></td><td><code>json_each</code></td></tr>
<tr><td>Storage</td><td>Binary JSON type</td><td>Plain TEXT (JSONB blob in 3.45+)</td></tr></table>`,
    realWorld: 'Clearinghouses return 271 eligibility responses that are often stored as JSON; a nightly job extracts copay and deductible into real columns for reporting. Patient-portal APIs return invoices as JSON built directly in SQL.',
    tips: ['json_valid(text) tells you whether a string is valid JSON.', 'In SQLite, json_each(doc) turns an array into rows, like MySQL JSON_TABLE.'],
    deep: `<p>MySQL cannot index a JSON document directly. The usual pattern is <code>ALTER TABLE t ADD plan_name VARCHAR(50) GENERATED ALWAYS AS (eligibility->>'$.plan.name') STORED, ADD INDEX (plan_name);</code>. MySQL 8 also supports multi-valued indexes over JSON arrays for <code>MEMBER OF</code> searches.</p>`,
    tryIt: { prompt: 'This builds a JSON document per invoice in SQLite and then reads a field back with ->>. Add the patient_id to the document.', starter: `WITH docs AS (\n  SELECT invoice_id,\n         json_object('status', status, 'total', total_amount) AS doc\n  FROM invoices\n)\nSELECT invoice_id, doc, doc->>'$.status' AS status_text\nFROM docs\nORDER BY invoice_id\nLIMIT 8;` },
    challenge: {
      level: 2,
      prompt: 'For each payor that has invoices, return the payor_id and one JSON document with keys "payor" (the name), "invoices" (the count) and "billed" (sum of total_amount). Sort by payor_id.',
      solution: `SELECT p.payor_id,
       json_object('payor', p.payor_name,
                   'invoices', COUNT(i.invoice_id),
                   'billed', SUM(i.total_amount)) AS doc
FROM payors p
JOIN invoices i ON i.payor_id = p.payor_id
GROUP BY p.payor_id, p.payor_name
ORDER BY p.payor_id;`,
      hints: ['Join payors to invoices on payor_id.', 'GROUP BY the payor so you get one row per payor.', 'Aggregates such as COUNT() and SUM() can be used as values inside json_object().', 'json_object(\'payor\', p.payor_name, \'invoices\', COUNT(i.invoice_id), \'billed\', SUM(i.total_amount))'],
      ordered: true,
    },
    quiz: [
      { q: 'What does doc->>\'$.plan.name\' return in MySQL?', options: ['A JSON value with quotes', 'Unquoted text', 'An error', 'The whole document'], answer: 1, why: '->> is JSON_UNQUOTE(JSON_EXTRACT(...)), so you get plain text.' },
      { q: 'Which SQLite function aggregates rows into a JSON array?', options: ['json_array', 'json_group_array', 'json_each', 'group_concat_json'], answer: 1, why: 'json_group_array is the aggregate; json_array builds an array from its arguments in a single row.' },
      { q: 'Where should an invoice total_amount live?', options: ['Inside a JSON column', 'In a regular numeric column', 'In a JSON array', 'It does not matter'], answer: 1, why: 'Core facts that you filter, sum and constrain belong in typed columns.' },
    ],
  },
  {
    id: 'dialects-03',
    goals: ['Use MySQL string functions: CONCAT, CONCAT_WS, SUBSTRING_INDEX, LPAD, LOCATE', 'Know how CONCAT treats NULL', 'Aggregate strings with GROUP_CONCAT', 'Translate each function to SQLite'],
    concept: `<p>Billing reports are full of text work: building "Last, First" names, padding invoice numbers, splitting emails. MySQL gives you a big set of string functions.</p>
<ul>
<li><code>CONCAT(a, b, ...)</code> joins text. In MySQL the <code>||</code> operator means OR by default, so you must use CONCAT.</li>
<li><code>CONCAT_WS(', ', a, b)</code> joins with a separator and <b>skips NULLs</b>.</li>
<li><code>SUBSTRING_INDEX(email, '@', -1)</code> returns everything after the last @.</li>
<li><code>LPAD(invoice_id, 6, '0')</code> pads on the left: 42 becomes 000042.</li>
<li><code>LEFT(s, n)</code>, <code>RIGHT(s, n)</code>, <code>LOCATE(sub, s)</code>, <code>UPPER</code>, <code>TRIM</code>, <code>REPLACE</code>.</li>
<li><code>GROUP_CONCAT(x ORDER BY x SEPARATOR ', ')</code> aggregates many rows into one string.</li>
</ul>
<p>SQLite uses <code>||</code>, <code>substr</code>, <code>instr</code>, <code>printf</code>/<code>format</code> for padding, and <code>group_concat</code>.</p>`,
    why: 'Names, codes and labels are text. Clean string handling in SQL produces statement-ready output without extra application code.',
    when: 'Formatting names and ids for statements, parsing emails or codes, and building comma-separated lists of CPT codes per invoice.',
    analogy: 'String functions are the label maker in the billing office: cut the chart number to size, pad it with zeros, and stick "LAST, First" on the folder.',
    syntax: `CONCAT(a, b)\nCONCAT_WS(sep, a, b)\nSUBSTRING_INDEX(str, delim, count)\nLPAD(str, len, pad)\nGROUP_CONCAT(expr ORDER BY expr SEPARATOR sep)`,
    dialect: 'mysql',
    sql: `SELECT CONCAT(UPPER(last_name), ', ', first_name)        AS patient_label,
       CONCAT_WS(' | ', city, email)                       AS contact,
       SUBSTRING_INDEX(email, '@', -1)                     AS email_domain,
       LPAD(patient_id, 6, '0')                            AS chart_no
FROM patients
ORDER BY last_name;

SELECT invoice_id,
       GROUP_CONCAT(DISTINCT cpt_code ORDER BY cpt_code SEPARATOR ', ') AS cpt_list
FROM charges
GROUP BY invoice_id;`,
    breakdown: [
      ['CONCAT(UPPER(last_name), \', \', first_name)', 'Builds "GARCIA, Maria"; returns NULL if any argument is NULL'],
      ['CONCAT_WS(\' | \', city, email)', 'Joins with a separator and skips NULL values instead of returning NULL'],
      ['SUBSTRING_INDEX(email, \'@\', -1)', 'Negative count: take the part after the last @'],
      ['LPAD(patient_id, 6, \'0\')', 'Left-pads to 6 characters: 000001'],
      ['GROUP_CONCAT(DISTINCT ... SEPARATOR \', \')', 'One string of unique CPT codes per invoice'],
    ],
    dialectSql: {
      mysql: `SELECT CONCAT(last_name, ', ', first_name), LPAD(patient_id, 6, '0') FROM patients;`,
      postgres: `SELECT last_name || ', ' || first_name, LPAD(patient_id::text, 6, '0') FROM patients;`,
      sqlserver: `SELECT last_name + ', ' + first_name, RIGHT('000000' + CAST(patient_id AS varchar(6)), 6) FROM patients;`,
      oracle: `SELECT last_name || ', ' || first_name, LPAD(patient_id, 6, '0') FROM patients;`,
      sqlite: `SELECT last_name || ', ' || first_name, printf('%06d', patient_id) FROM patients;`,
    },
    mistakes: [
      { wrong: `SELECT first_name || ' ' || last_name FROM patients;  -- MySQL`, why: 'In MySQL (without PIPES_AS_CONCAT mode) || is logical OR, so this returns 0 or 1, not a name.', fix: `SELECT first_name || ' ' || last_name AS full_name FROM patients LIMIT 5;` },
      { wrong: `SELECT CONCAT(first_name, ' ', city) FROM patients;`, why: 'CONCAT returns NULL if any piece is NULL, so patients with no city vanish from the label.', fix: `SELECT first_name || ' ' || IFNULL(city, '(no city)') AS label FROM patients LIMIT 8;` },
    ],
    rules: ['MySQL concatenates with CONCAT, not ||.', 'CONCAT returns NULL if any argument is NULL; CONCAT_WS skips NULLs.', 'GROUP_CONCAT output is truncated at group_concat_max_len (1024 bytes by default).', 'SQLite: ||, substr, instr, printf, group_concat.'],
    compare: `<table><tr><th>MySQL</th><th>SQLite</th></tr>
<tr><td><code>CONCAT(a,b)</code></td><td><code>a || b</code> or <code>concat(a,b)</code></td></tr>
<tr><td><code>SUBSTRING_INDEX(e,'@',-1)</code></td><td><code>substr(e, instr(e,'@')+1)</code></td></tr>
<tr><td><code>LPAD(n,6,'0')</code></td><td><code>printf('%06d', n)</code></td></tr>
<tr><td><code>LEFT(s,3)</code></td><td><code>substr(s,1,3)</code></td></tr>
<tr><td><code>LOCATE('@',e)</code></td><td><code>instr(e,'@')</code></td></tr>
<tr><td><code>GROUP_CONCAT(x SEPARATOR ';')</code></td><td><code>group_concat(x, ';')</code></td></tr></table>`,
    realWorld: 'Patient statements print "Account 000123 - GARCIA, Maria". Claim scrubbers list all CPT codes on an invoice in one field for a quick human review.',
    tips: ['SET SESSION group_concat_max_len = 100000; before long GROUP_CONCAT lists.', 'In SQLite 3.44+ you can write group_concat(x, \', \' ORDER BY x).'],
    deep: `<p>MySQL string comparisons follow the column <b>collation</b>. The default <code>utf8mb4_0900_ai_ci</code> is accent- and case-insensitive, so <code>'garcia' = 'GARCÍA'</code> is true. SQLite compares with BINARY by default, so use <code>COLLATE NOCASE</code> or <code>lower()</code>.</p>`,
    tryIt: { prompt: 'SQLite versions of the MySQL functions. Change the chart number to 8 digits and add the email domain using substr + instr.', starter: `SELECT upper(last_name) || ', ' || first_name AS patient_label,\n       printf('%06d', patient_id)          AS chart_no,\n       concat_ws(' | ', city, email)       AS contact\nFROM patients\nORDER BY last_name\nLIMIT 10;` },
    challenge: {
      level: 2,
      prompt: 'For each invoice that has charges, show invoice_id, a label like "INV-000004", and a comma-separated list of its distinct CPT codes in ascending order. Only invoices with more than 2 charges. Sort by invoice_id.',
      solution: `SELECT invoice_id,
       printf('INV-%06d', invoice_id) AS invoice_label,
       group_concat(DISTINCT cpt_code ORDER BY cpt_code) AS cpt_list
FROM charges
GROUP BY invoice_id
HAVING COUNT(*) > 2
ORDER BY invoice_id;`,
      hints: ['All the data is in charges.', 'printf(\'INV-%06d\', invoice_id) pads the number.', 'group_concat(DISTINCT cpt_code ORDER BY cpt_code) builds the ordered list.', 'GROUP BY invoice_id HAVING COUNT(*) > 2 ORDER BY invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'In default MySQL, what does SELECT \'a\' || \'b\' return?', options: ['ab', '0', 'NULL', 'An error'], answer: 1, why: '|| is logical OR; both strings convert to 0, so the result is 0.' },
      { q: 'CONCAT_WS(\', \', \'Austin\', NULL, \'TX\') returns...', options: ['NULL', 'Austin, , TX', 'Austin, TX', 'Austin'], answer: 2, why: 'CONCAT_WS skips NULL arguments.' },
    ],
  },
  {
    id: 'dialects-04',
    goals: ['Use MySQL numeric functions: ROUND, TRUNCATE, CEIL, FLOOR, MOD, ABS, POW', 'Understand DECIMAL vs FLOAT for money', 'Avoid integer division surprises', 'Translate to SQLite'],
    concept: `<p>Billing is arithmetic: contract rates, copays, units times price, late fees. MySQL provides:</p>
<ul>
<li><code>ROUND(x, 2)</code> rounds to cents; <code>TRUNCATE(x, 2)</code> just chops digits off.</li>
<li><code>CEIL(x)</code> / <code>FLOOR(x)</code> round up / down to a whole number (handy for "billable 15-minute units").</li>
<li><code>MOD(a, b)</code> or <code>a % b</code> gives the remainder; <code>ABS</code>, <code>POW</code>, <code>SQRT</code>, <code>RAND()</code>.</li>
<li><code>/</code> always returns a decimal in MySQL (<code>7/2 = 3.5000</code>); <code>DIV</code> is integer division.</li>
</ul>
<p>For money, MySQL uses <code>DECIMAL(10,2)</code>: exact base-10 storage. <code>FLOAT</code>/<code>DOUBLE</code> are binary approximations and can produce 0.1 + 0.2 = 0.30000000000000004.</p>
<p>SQLite has <code>round</code>, <code>ceil</code>, <code>floor</code>, <code>abs</code>, <code>power</code>, <code>sqrt</code> and <code>%</code>, but <code>7/2</code> is <b>3</b> (integer division) when both sides are integers.</p>`,
    why: 'A cent of rounding error on thousands of claims adds up and breaks reconciliation. You need to know exactly how each database rounds and divides.',
    when: 'Calculating expected reimbursement, splitting payments, converting minutes to billable units, and building rate tables.',
    analogy: 'ROUND is the cashier rounding to the nearest cent; TRUNCATE is a cashier who always drops the fraction; CEIL is the therapist billing a started 15-minute block as a full unit.',
    syntax: `ROUND(x, d)  TRUNCATE(x, d)  CEIL(x)  FLOOR(x)\nMOD(a, b)  a DIV b  ABS(x)  POW(x, y)`,
    dialect: 'mysql',
    sql: `SELECT p.payor_name,
       SUM(i.total_amount)                               AS billed,
       ROUND(SUM(i.total_amount) * p.contract_rate, 2)   AS expected,
       TRUNCATE(SUM(i.total_amount) * p.contract_rate, 0) AS expected_whole,
       CEIL(53 / 15)                                     AS pt_units_for_53_min,
       17 DIV 5                                          AS int_div,
       MOD(17, 5)                                        AS remainder
FROM payors p
JOIN invoices i ON i.payor_id = p.payor_id
GROUP BY p.payor_id, p.payor_name, p.contract_rate;`,
    breakdown: [
      ['ROUND(... * p.contract_rate, 2)', 'Expected reimbursement rounded to cents'],
      ['TRUNCATE(..., 0)', 'MySQL-only: drops decimals without rounding'],
      ['CEIL(53 / 15)', '53/15 = 3.53, rounded up to 4 billable units'],
      ['17 DIV 5', 'MySQL integer division = 3'],
      ['MOD(17, 5)', 'Remainder = 2'],
    ],
    dialectSql: {
      mysql: `SELECT ROUND(123.456, 2), TRUNCATE(123.456, 1), 7 / 2, 7 DIV 2, MOD(7, 2);`,
      postgres: `SELECT ROUND(123.456, 2), TRUNC(123.456, 1), 7 / 2 /* = 3 */, 7.0 / 2, MOD(7, 2);`,
      sqlserver: `SELECT ROUND(123.456, 2), ROUND(123.456, 1, 1) /* truncate */, 7 / 2 /* = 3 */, 7 % 2;`,
      oracle: `SELECT ROUND(123.456, 2), TRUNC(123.456, 1), 7 / 2 /* = 3.5 */, MOD(7, 2) FROM dual;`,
      sqlite: `SELECT round(123.456, 2), CAST(123.456 * 10 AS INTEGER) / 10.0, 7 / 2 /* = 3 */, 7 % 2;`,
    },
    mistakes: [
      { wrong: `SELECT 7 / 2;  -- expecting 3.5 in SQLite`, why: 'SQLite (and PostgreSQL / SQL Server) do integer division when both operands are integers. MySQL and Oracle return 3.5.', fix: `SELECT 7 / 2.0 AS half, CAST(7 AS REAL) / 2 AS also_half;` },
      { wrong: `CREATE TABLE fees (amount FLOAT);  -- MySQL`, why: 'FLOAT is approximate. Sums of cents drift. Use DECIMAL(12,2) for money in MySQL.', fix: `SELECT round(0.1 + 0.2, 2) AS safe_cents;` },
    ],
    rules: ['Use DECIMAL for money in MySQL, never FLOAT.', 'Round once, at the end of the calculation.', 'Know your database: 7/2 is 3.5 in MySQL and Oracle, 3 in PostgreSQL, SQL Server and SQLite.', 'CEIL for "any started unit counts".'],
    compare: `<table><tr><th>Function</th><th>MySQL</th><th>SQLite</th></tr>
<tr><td>Round</td><td><code>ROUND(x,2)</code></td><td><code>round(x,2)</code></td></tr>
<tr><td>Truncate</td><td><code>TRUNCATE(x,2)</code></td><td><code>CAST(x*100 AS INTEGER)/100.0</code></td></tr>
<tr><td>Remainder</td><td><code>MOD(a,b)</code> / <code>%</code></td><td><code>a % b</code></td></tr>
<tr><td>Integer division</td><td><code>a DIV b</code></td><td><code>a / b</code> (both integers)</td></tr>
<tr><td>Power</td><td><code>POW(x,y)</code></td><td><code>power(x,y)</code></td></tr></table>`,
    realWorld: 'Contract modeling: "if Aetna pays 75% of billed, what did we expect last quarter?" Physical-therapy billing converts treatment minutes to 15-minute units with CEIL-like rules.',
    tips: ['Multiply by 1.0 in SQLite to force real division.', 'MySQL ROUND on DECIMAL rounds half away from zero; on DOUBLE it may use banker-like behaviour from the C library.'],
    deep: `<p>MySQL DECIMAL(M,D) stores 9 decimal digits per 4 bytes, so DECIMAL(12,2) takes 6 bytes and is exact. SQLite has no exact decimal type: REAL is a 64-bit double. Many SQLite apps store money as integer cents to stay exact.</p>`,
    tryIt: { prompt: 'The SQLite version of the reimbursement report. Add a column that shows the write-off (billed minus expected), rounded to 2 decimals.', starter: `SELECT p.payor_name,\n       SUM(i.total_amount)                             AS billed,\n       round(SUM(i.total_amount) * p.contract_rate, 2) AS expected,\n       ceil(53 / 15.0)                                 AS pt_units_for_53_min\nFROM payors p\nJOIN invoices i ON i.payor_id = p.payor_id\nGROUP BY p.payor_id\nORDER BY billed DESC;` },
    challenge: {
      level: 2,
      prompt: 'For each payor with invoices, show payor_name, total billed, expected reimbursement (billed x contract_rate rounded to 2 decimals) and the expected amount rounded UP to the next whole dollar. Sort by expected descending.',
      solution: `SELECT p.payor_name,
       SUM(i.total_amount) AS billed,
       round(SUM(i.total_amount) * p.contract_rate, 2) AS expected,
       ceil(SUM(i.total_amount) * p.contract_rate) AS expected_whole
FROM payors p
JOIN invoices i ON i.payor_id = p.payor_id
GROUP BY p.payor_id, p.payor_name
ORDER BY expected DESC;`,
      hints: ['Join payors and invoices on payor_id and group by payor.', 'Expected = SUM(total_amount) * contract_rate.', 'round(x, 2) for cents, ceil(x) to round up.', 'ORDER BY expected DESC'],
      ordered: true,
    },
    quiz: [
      { q: 'In MySQL, what is 7 DIV 2?', options: ['3.5', '3', '4', '1'], answer: 1, why: 'DIV is integer division.' },
      { q: 'Which type should hold money in MySQL?', options: ['FLOAT', 'DOUBLE', 'DECIMAL(12,2)', 'VARCHAR'], answer: 2, why: 'DECIMAL is exact base-10 arithmetic.' },
      { q: 'In SQLite, SELECT 7 / 2 returns...', options: ['3.5', '3', 'NULL', 'An error'], answer: 1, why: 'Both operands are integers, so SQLite performs integer division.' },
    ],
  },
  {
    id: 'dialects-05',
    goals: ['Use NOW(), CURDATE(), DATE_ADD, DATEDIFF, TIMESTAMPDIFF', 'Format dates with DATE_FORMAT', 'Find month ends with LAST_DAY', 'Translate every one into SQLite date(), julianday() and strftime()'],
    concept: `<p>Accounts receivable is all about dates: how many days past due, which month a charge belongs to, when a claim must be filed.</p>
<p>MySQL has real <code>DATE</code>, <code>DATETIME</code> and <code>TIMESTAMP</code> types and many functions:</p>
<ul>
<li><code>CURDATE()</code>, <code>NOW()</code>: today / right now.</li>
<li><code>DATE_ADD(d, INTERVAL 30 DAY)</code>, <code>DATE_SUB</code>: move a date.</li>
<li><code>DATEDIFF(a, b)</code>: whole days between dates (a minus b).</li>
<li><code>TIMESTAMPDIFF(MONTH, a, b)</code>: difference in any unit.</li>
<li><code>DATE_FORMAT(d, '%Y-%m')</code>: format as text; <code>LAST_DAY(d)</code>: month end.</li>
</ul>
<p>SQLite has no date type: dates are ISO text like <code>'2026-09-01'</code>. Functions <code>date()</code>, <code>julianday()</code> and <code>strftime()</code> do the maths, using modifiers such as <code>'+30 days'</code> and <code>'start of month'</code>.</p>`,
    why: 'Aging buckets, timely filing limits and monthly revenue all depend on correct date arithmetic, and every database spells it differently.',
    when: 'Days-past-due reports, monthly revenue grouping, due-date calculation, and age-of-patient logic.',
    analogy: 'The date functions are the billing calendar on the wall: count the days since the claim went out, flip to the end of the month to close the books, and circle the date 30 days out when payment is due.',
    syntax: `DATE_ADD(d, INTERVAL n DAY)\nDATEDIFF(later, earlier)\nTIMESTAMPDIFF(unit, start, end)\nDATE_FORMAT(d, '%Y-%m')\nLAST_DAY(d)`,
    dialect: 'mysql',
    sql: `SELECT invoice_id,
       invoice_date,
       DATE_ADD(invoice_date, INTERVAL 30 DAY)        AS due_30,
       DATEDIFF('2026-09-01', due_date)               AS days_past_due,
       TIMESTAMPDIFF(MONTH, invoice_date, '2026-09-01') AS months_old,
       DATE_FORMAT(invoice_date, '%Y-%m')             AS bill_month,
       LAST_DAY(invoice_date)                         AS month_end
FROM invoices
WHERE status = 'Overdue';`,
    breakdown: [
      ['DATE_ADD(invoice_date, INTERVAL 30 DAY)', 'Due date 30 days after billing'],
      ['DATEDIFF(\'2026-09-01\', due_date)', 'Days between due date and "today" (positive = late)'],
      ['TIMESTAMPDIFF(MONTH, ...)', 'Whole months between two dates'],
      ['DATE_FORMAT(invoice_date, \'%Y-%m\')', 'Text month key for grouping'],
      ['LAST_DAY(invoice_date)', 'Last day of that month'],
    ],
    dialectSql: {
      mysql: `SELECT DATE_ADD(due_date, INTERVAL 30 DAY), DATEDIFF('2026-09-01', due_date), DATE_FORMAT(due_date, '%Y-%m') FROM invoices;`,
      postgres: `SELECT due_date + INTERVAL '30 days', DATE '2026-09-01' - due_date, to_char(due_date, 'YYYY-MM') FROM invoices;`,
      sqlserver: `SELECT DATEADD(day, 30, due_date), DATEDIFF(day, due_date, '2026-09-01'), FORMAT(due_date, 'yyyy-MM') FROM invoices;`,
      oracle: `SELECT due_date + 30, DATE '2026-09-01' - due_date, TO_CHAR(due_date, 'YYYY-MM') FROM invoices;`,
      sqlite: `SELECT date(due_date, '+30 days'), julianday('2026-09-01') - julianday(due_date), strftime('%Y-%m', due_date) FROM invoices;`,
    },
    mistakes: [
      { wrong: `SELECT DATEDIFF(due_date, '2026-09-01') FROM invoices;  -- expecting positive days late`, why: 'MySQL DATEDIFF is first minus second. Swapping the arguments flips the sign. (SQL Server DATEDIFF has the opposite order: start, end.)', fix: `SELECT invoice_id, julianday('2026-09-01') - julianday(due_date) AS days_late FROM invoices WHERE status = 'Overdue';` },
      { wrong: `SELECT '2026-09-01' - due_date FROM invoices;  -- SQLite`, why: 'SQLite dates are text; subtracting text converts to numbers (2026 - 2026 = 0). Use julianday().', fix: `SELECT invoice_id, CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days FROM invoices LIMIT 5;` },
    ],
    rules: ['MySQL: DATEDIFF(later, earlier). SQL Server: DATEDIFF(unit, earlier, later).', 'SQLite: julianday() for differences, date(d, modifier) for moving, strftime() for formatting.', 'Store dates as DATE (MySQL) or ISO text YYYY-MM-DD (SQLite) so they sort correctly.', 'Pin "today" in reports (e.g. 2026-09-01) so results are reproducible.'],
    compare: `<table><tr><th>Task</th><th>MySQL</th><th>SQLite</th></tr>
<tr><td>Today</td><td><code>CURDATE()</code></td><td><code>date('now')</code></td></tr>
<tr><td>+30 days</td><td><code>DATE_ADD(d, INTERVAL 30 DAY)</code></td><td><code>date(d,'+30 days')</code></td></tr>
<tr><td>Days between</td><td><code>DATEDIFF(a,b)</code></td><td><code>julianday(a)-julianday(b)</code></td></tr>
<tr><td>Month key</td><td><code>DATE_FORMAT(d,'%Y-%m')</code></td><td><code>strftime('%Y-%m',d)</code></td></tr>
<tr><td>Month end</td><td><code>LAST_DAY(d)</code></td><td><code>date(d,'start of month','+1 month','-1 day')</code></td></tr></table>`,
    realWorld: 'AR aging reports bucket open balances into 0-30, 31-60, 61-90 and 90+ days past due. Month-end close groups charges by service month.',
    tips: ['MySQL NOW() is fixed for the whole statement; SYSDATE() changes during it.', 'In SQLite, date(\'now\') is UTC; add \'localtime\' for local time.'],
    deep: `<p>MySQL <code>TIMESTAMP</code> is stored in UTC and converted to the session time zone; <code>DATETIME</code> is stored as-is with no zone. Mixing them across servers in different zones is a classic source of off-by-hours billing timestamps.</p>`,
    tryIt: { prompt: 'The SQLite translation of the MySQL query. Add a month_end column using date(invoice_date, \'start of month\', \'+1 month\', \'-1 day\').', starter: `SELECT invoice_id,\n       invoice_date,\n       date(invoice_date, '+30 days')                              AS due_30,\n       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_past_due,\n       strftime('%Y-%m', invoice_date)                             AS bill_month\nFROM invoices\nWHERE status = 'Overdue'\nORDER BY days_past_due DESC;` },
    challenge: {
      level: 2,
      prompt: 'List Overdue invoices with invoice_id, due_date and whole days past due as of 2026-09-01. Sort by days past due (largest first), then invoice_id.',
      solution: `SELECT invoice_id, due_date,
       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_past_due
FROM invoices
WHERE status = 'Overdue'
ORDER BY days_past_due DESC, invoice_id;`,
      hints: ['Filter status = \'Overdue\'.', 'SQLite has no DATEDIFF; use julianday().', 'julianday(\'2026-09-01\') - julianday(due_date), cast to INTEGER.', 'ORDER BY days_past_due DESC, invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'MySQL DATEDIFF(\'2026-09-10\', \'2026-09-01\') returns...', options: ['-9', '9', '10', 'An error'], answer: 1, why: 'First argument minus second: 9 days.' },
      { q: 'How do you add 30 days in SQLite?', options: ["DATE_ADD(d, INTERVAL 30 DAY)", "d + 30", "date(d, '+30 days')", "DATEADD(day, 30, d)"], answer: 2, why: 'SQLite uses date() with a modifier string.' },
    ],
  },
  {
    id: 'dialects-06',
    goals: ['Why LIKE \'%word%\' does not scale', 'Create a FULLTEXT index and query it with MATCH ... AGAINST', 'Natural language vs boolean mode', 'Full-text search in SQLite with FTS virtual tables'],
    concept: `<p><code>LIKE '%therapy%'</code> must read every row because the wildcard at the start prevents index use. It also cannot rank results or handle word variations.</p>
<p>A <b>full-text index</b> splits text into words (tokens) and keeps an <b>inverted index</b>: for every word, the list of rows that contain it. Searching for "therapy" becomes a quick lookup.</p>
<p>In MySQL:</p>
<ul>
<li><code>FULLTEXT INDEX ft_desc (description)</code> creates the index (InnoDB supports it).</li>
<li><code>MATCH(description) AGAINST('manual therapy')</code> searches in <b>natural language mode</b> and returns a relevance score.</li>
<li><code>IN BOOLEAN MODE</code> allows operators: <code>+therapy -manual</code> (must / must not), <code>therap*</code> (prefix).</li>
</ul>
<p>SQLite does it with a <b>virtual table</b>: <code>CREATE VIRTUAL TABLE ... USING fts4(...)</code> (FTS5 in most builds) and <code>WHERE t MATCH 'therapy'</code>.</p>`,
    why: 'Staff search clinical descriptions, notes and denial reasons by words. Full-text indexes make that fast and ranked.',
    when: 'Searching free text such as charge descriptions, denial notes or referral letters. Not for exact codes (use a normal index on cpt_code).',
    analogy: 'An inverted index is the index at the back of the CPT codebook: look up "therapy" and it lists every page it appears on, instead of reading the whole book.',
    syntax: `ALTER TABLE t ADD FULLTEXT INDEX ft_name (col);\nSELECT ... WHERE MATCH(col) AGAINST('words');\nSELECT ... WHERE MATCH(col) AGAINST('+must -not pref*' IN BOOLEAN MODE);`,
    dialect: 'mysql',
    sql: `ALTER TABLE charges ADD FULLTEXT INDEX ft_charge_desc (description);

SELECT charge_id, description,
       MATCH(description) AGAINST('office visit') AS relevance
FROM charges
WHERE MATCH(description) AGAINST('office visit')
ORDER BY relevance DESC;

SELECT charge_id, description
FROM charges
WHERE MATCH(description) AGAINST('+therapy -manual' IN BOOLEAN MODE);`,
    breakdown: [
      ['ADD FULLTEXT INDEX ft_charge_desc (description)', 'Builds the inverted word index'],
      ['MATCH(description) AGAINST(\'office visit\')', 'Natural-language search; rows with more rare matching words score higher'],
      ['AS relevance ... ORDER BY relevance DESC', 'The same MATCH in SELECT returns the score so you can rank'],
      ['\'+therapy -manual\' IN BOOLEAN MODE', 'Must contain "therapy", must not contain "manual"'],
    ],
    dialectSql: {
      mysql: `SELECT * FROM charges WHERE MATCH(description) AGAINST('therapy');`,
      postgres: `SELECT * FROM charges WHERE to_tsvector('english', description) @@ to_tsquery('english', 'therapy');`,
      sqlserver: `SELECT * FROM charges WHERE CONTAINS(description, 'therapy');`,
      oracle: `SELECT * FROM charges WHERE CONTAINS(description, 'therapy') > 0;`,
      sqlite: `CREATE VIRTUAL TABLE charge_fts USING fts4(description);\nSELECT * FROM charge_fts WHERE charge_fts MATCH 'therapy';`,
    },
    mistakes: [
      { wrong: `SELECT * FROM charges WHERE MATCH(description) AGAINST('ECG');`, why: 'MySQL InnoDB ignores words shorter than innodb_ft_min_token_size (3) and stopwords, and natural mode ignores words that appear in more than half the rows. Short codes are better searched with = or LIKE.', fix: `SELECT charge_id, description FROM charges WHERE description LIKE '%ECG%';` },
      { wrong: `SELECT * FROM charges WHERE description LIKE '%therapy%';  -- on 50 million rows`, why: 'A leading wildcard cannot use a B-tree index: this is a full table scan every time.', fix: `SELECT description, COUNT(*) AS n FROM charges WHERE description LIKE '%therapy%' GROUP BY description;` },
    ],
    rules: ['LIKE \'%x%\' scans everything; full-text uses an inverted index.', 'Natural mode ranks; boolean mode filters with + - * operators.', 'The MATCH column list must match a FULLTEXT index exactly.', 'Beware minimum word length and stopwords.'],
    compare: `<table><tr><th></th><th>LIKE '%x%'</th><th>FULLTEXT</th></tr>
<tr><td>Uses index</td><td>No</td><td>Yes (inverted)</td></tr>
<tr><td>Ranking</td><td>No</td><td>Yes</td></tr>
<tr><td>Substring inside word</td><td>Yes</td><td>No (whole words / prefixes)</td></tr>
<tr><td>Short codes</td><td>Works</td><td>Often ignored</td></tr></table>`,
    realWorld: 'Denial-management tools let staff search thousands of payer remarks ("prior authorization", "not medically necessary"). Coding assistants search procedure descriptions by keywords.',
    tips: ['Use WITH QUERY EXPANSION for "more like this" searches.', 'For serious search (typos, synonyms) teams add Elasticsearch/OpenSearch next to MySQL.'],
    deep: `<p>InnoDB full-text keeps new documents in an in-memory cache and flushes them to auxiliary index tables. Deleted rows are only marked and removed at <code>OPTIMIZE TABLE</code>, so heavily updated full-text tables need periodic optimization.</p>`,
    tryIt: { prompt: 'SQLite full-text search with an FTS4 virtual table. Try MATCH \'visit\', then \'therap*\' (prefix), then \'office AND visit\'.', starter: `CREATE VIRTUAL TABLE charge_fts USING fts4(charge_id, description);\nINSERT INTO charge_fts SELECT charge_id, description FROM charges;\n\nSELECT charge_id, description\nFROM charge_fts\nWHERE charge_fts MATCH 'therapy'\nORDER BY CAST(charge_id AS INTEGER)\nLIMIT 10;` },
    challenge: {
      level: 2,
      prompt: 'Without a full-text index, emulate a search for the word "visit": show each distinct charge description containing "visit" (case-insensitive) with how many charges use it. Sort by count descending, then description.',
      solution: `SELECT description, COUNT(*) AS charge_count
FROM charges
WHERE lower(description) LIKE '%visit%'
GROUP BY description
ORDER BY charge_count DESC, description;`,
      hints: ['Search the charges.description column.', 'LIKE \'%visit%\' finds the word anywhere; lower() makes it case-insensitive.', 'GROUP BY description and COUNT(*).', 'ORDER BY charge_count DESC, description'],
      ordered: true,
    },
    quiz: [
      { q: 'What data structure powers a FULLTEXT index?', options: ['A hash table of rows', 'An inverted index of words to rows', 'A clustered B-tree on the whole text', 'A bitmap per character'], answer: 1, why: 'Full-text indexes map each token to the documents containing it.' },
      { q: 'In BOOLEAN MODE, what does -manual mean?', options: ['Rank lower', 'Must not contain "manual"', 'Optional word', 'Prefix search'], answer: 1, why: 'The minus operator excludes rows containing the word.' },
    ],
  },
  {
    id: 'dialects-07',
    goals: ['Recognize MySQL-only syntax: backticks, LIMIT offset,count, AUTO_INCREMENT', 'Upserts with INSERT ... ON DUPLICATE KEY UPDATE and REPLACE', 'The null-safe equality operator <=>', 'Portable equivalents in SQLite'],
    concept: `<p>Every database adds its own conveniences. In MySQL you will meet:</p>
<ul>
<li><b>Backtick identifiers</b>: <code>\`order\`</code> lets you use reserved words as names (standard SQL uses double quotes).</li>
<li><code>LIMIT 20, 10</code>: skip 20 rows, return 10 (same as <code>LIMIT 10 OFFSET 20</code>).</li>
<li><code>AUTO_INCREMENT</code> for generated ids, <code>LAST_INSERT_ID()</code> to read the new one.</li>
<li><code>INSERT ... ON DUPLICATE KEY UPDATE</code>: insert, or update the existing row if a unique key clashes (upsert).</li>
<li><code>REPLACE INTO</code>: delete the clashing row, then insert (dangerous with foreign keys).</li>
<li><code>a &lt;=&gt; b</code>: <b>null-safe equals</b>, true when both are NULL.</li>
<li><code>IFNULL(a, b)</code>, <code>IF(cond, a, b)</code>, <code>SHOW TABLES</code>, <code>DESCRIBE t</code>.</li>
</ul>
<p>SQLite has close cousins: <code>ON CONFLICT ... DO UPDATE</code>, <code>INSERT OR REPLACE</code>, <code>IS</code> / <code>IS NOT</code> as null-safe comparison, <code>IFNULL</code> and <code>IIF</code>.</p>`,
    why: 'You will read MySQL code written by others. Recognizing these constructs lets you understand it and port it safely.',
    when: 'Maintaining MySQL applications, migrating MySQL SQL to another database, or writing idempotent loads (upserts).',
    analogy: 'Dialect syntax is like each insurer\'s claim form: the information is the same, but the box names and order differ. Learn the form of the payor you are billing.',
    syntax: `INSERT INTO t (k, v) VALUES (1, 'x')\n  ON DUPLICATE KEY UPDATE v = VALUES(v);\nSELECT ... LIMIT offset, count;\nWHERE a <=> b`,
    dialect: 'mysql',
    sql: `-- Upsert a payor's contract rate
INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)
VALUES (2, 'Aetna Care', 'Commercial', 0.77)
ON DUPLICATE KEY UPDATE contract_rate = VALUES(contract_rate);

-- Page 3 of invoices, 10 per page, reserved word as alias
SELECT invoice_id, status AS \`status\`, total_amount
FROM invoices
ORDER BY invoice_id
LIMIT 20, 10;

-- Invoices billed to someone other than the patient's primary payor (NULL-safe)
SELECT i.invoice_id
FROM invoices i JOIN patients p ON p.patient_id = i.patient_id
WHERE NOT (i.payor_id <=> p.primary_payor_id);`,
    breakdown: [
      ['ON DUPLICATE KEY UPDATE', 'If payor_id 2 exists, update its rate instead of failing'],
      ['VALUES(contract_rate)', 'Refers to the value you tried to insert (MySQL 8.0.20+ prefers an alias: AS new ... new.contract_rate)'],
      ['`status`','Backticks quote identifiers in MySQL'],
      ['LIMIT 20, 10', 'Offset first, then count: rows 21-30'],
      ['NOT (a <=> b)', 'Null-safe "is different": NULL vs NULL counts as equal'],
    ],
    dialectSql: {
      mysql: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)\nVALUES (2, 'Aetna Care', 'Commercial', 0.77)\nON DUPLICATE KEY UPDATE contract_rate = VALUES(contract_rate);`,
      postgres: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)\nVALUES (2, 'Aetna Care', 'Commercial', 0.77)\nON CONFLICT (payor_id) DO UPDATE SET contract_rate = EXCLUDED.contract_rate;`,
      sqlserver: `MERGE payors AS t\nUSING (VALUES (2, 0.77)) AS s(payor_id, rate) ON t.payor_id = s.payor_id\nWHEN MATCHED THEN UPDATE SET contract_rate = s.rate\nWHEN NOT MATCHED THEN INSERT (payor_id, payor_name, payor_type, contract_rate)\n  VALUES (2, 'Aetna Care', 'Commercial', 0.77);`,
      oracle: `MERGE INTO payors t\nUSING (SELECT 2 AS payor_id, 0.77 AS rate FROM dual) s ON (t.payor_id = s.payor_id)\nWHEN MATCHED THEN UPDATE SET t.contract_rate = s.rate\nWHEN NOT MATCHED THEN INSERT (payor_id, payor_name, payor_type, contract_rate)\n  VALUES (2, 'Aetna Care', 'Commercial', 0.77);`,
      sqlite: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)\nVALUES (2, 'Aetna Care', 'Commercial', 0.77)\nON CONFLICT (payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;`,
    },
    mistakes: [
      { wrong: `REPLACE INTO invoices (invoice_id, patient_id, ...) VALUES (3, ...);`, why: 'REPLACE deletes the old row first. With ON DELETE CASCADE that also deletes its charges and payments; without it, it fails or orphans data. Prefer an upsert that updates.', fix: `SELECT invoice_id, status FROM invoices WHERE invoice_id = 3;` },
      { wrong: `SELECT * FROM invoices i JOIN patients p ON p.patient_id = i.patient_id WHERE i.payor_id <> p.primary_payor_id;`, why: 'If either side is NULL, <> gives UNKNOWN and the row is dropped, so self-pay mismatches disappear. Use a null-safe comparison.', fix: `SELECT i.invoice_id FROM invoices i JOIN patients p ON p.patient_id = i.patient_id WHERE i.payor_id IS NOT p.primary_payor_id;` },
    ],
    rules: ['MySQL LIMIT a, b means OFFSET a, COUNT b.', 'ON DUPLICATE KEY UPDATE triggers on ANY unique key, not just the primary key.', 'REPLACE = DELETE + INSERT; avoid it on parent tables.', '<=> in MySQL is IS NOT DISTINCT FROM in standard SQL and IS in SQLite.'],
    compare: `<table><tr><th>Feature</th><th>MySQL</th><th>Standard / SQLite</th></tr>
<tr><td>Quote identifier</td><td><code>\`name\`</code></td><td><code>"name"</code></td></tr>
<tr><td>Upsert</td><td><code>ON DUPLICATE KEY UPDATE</code></td><td><code>ON CONFLICT ... DO UPDATE</code></td></tr>
<tr><td>Null-safe equal</td><td><code>a &lt;=&gt; b</code></td><td><code>a IS NOT DISTINCT FROM b</code> / SQLite <code>a IS b</code></td></tr>
<tr><td>Auto id</td><td><code>AUTO_INCREMENT</code></td><td><code>INTEGER PRIMARY KEY</code> (SQLite), <code>IDENTITY</code></td></tr>
<tr><td>Inline if</td><td><code>IF(c,a,b)</code></td><td><code>CASE</code> / SQLite <code>iif(c,a,b)</code></td></tr></table>`,
    realWorld: 'Nightly payor fee-schedule imports use ON DUPLICATE KEY UPDATE so the load can be re-run safely. Reconciliation reports use null-safe comparison to catch invoices where the payor differs from the patient\'s coverage, including self-pay.',
    tips: ['SQLite IS works with any values: 3 IS 3, NULL IS NULL are both true.', 'DESCRIBE invoices in MySQL = PRAGMA table_info(\'invoices\') in SQLite.'],
    deep: `<p>On InnoDB, ON DUPLICATE KEY UPDATE takes next-key locks on the unique index and can deadlock under concurrent upserts into the same key range. Also, a failed insert still consumes an AUTO_INCREMENT value, leaving gaps.</p>`,
    tryIt: { prompt: 'The SQLite upsert version. Run it, then change the rate to 0.80 and run again: the row updates instead of failing.', starter: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)\nVALUES (2, 'Aetna Care', 'Commercial', 0.77)\nON CONFLICT (payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;\n\nSELECT payor_id, payor_name, contract_rate FROM payors ORDER BY payor_id;` },
    challenge: {
      level: 3,
      prompt: 'Prove why MySQL needs <=>. Join invoices to patients and return one row with three numbers: total invoices, how many have payor_id = primary_payor_id using plain =, and how many match using a null-safe comparison (SQLite IS, where NULL matches NULL).',
      solution: `SELECT COUNT(*) AS invoices,
       SUM(CASE WHEN i.payor_id = p.primary_payor_id THEN 1 ELSE 0 END) AS match_equals,
       SUM(CASE WHEN i.payor_id IS p.primary_payor_id THEN 1 ELSE 0 END) AS match_null_safe
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id;`,
      hints: ['Join invoices to patients on patient_id; no GROUP BY needed, you want one summary row.', 'Count conditionally with SUM(CASE WHEN ... THEN 1 ELSE 0 END).', 'Use = in one CASE and IS in the other (IS is SQLite\'s version of MySQL <=>).', 'SUM(CASE WHEN i.payor_id = p.primary_payor_id THEN 1 ELSE 0 END), SUM(CASE WHEN i.payor_id IS p.primary_payor_id THEN 1 ELSE 0 END)'],
      ordered: false,
    },
    quiz: [
      { q: 'MySQL LIMIT 40, 20 returns...', options: ['Rows 1-40', 'Rows 41-60', 'Rows 21-40', 'Rows 20-40'], answer: 1, why: 'The first number is the offset (skip 40), the second the count (20).' },
      { q: 'NULL <=> NULL in MySQL is...', options: ['NULL', '0', '1', 'An error'], answer: 2, why: 'The null-safe equality operator treats two NULLs as equal.' },
      { q: 'Why is REPLACE INTO risky on a parent table?', options: ['It is slow', 'It deletes the existing row before inserting', 'It ignores unique keys', 'It cannot insert new rows'], answer: 1, why: 'The delete step can cascade to or conflict with child rows.' },
    ],
  },
  // ─────────────────────────── PostgreSQL ───────────────────────────
  {
    id: 'dialects-08',
    goals: ['The PostgreSQL process model: postmaster and one backend per connection', 'Shared buffers, WAL and the background processes', 'How MVCC keeps old row versions and why VACUUM exists', 'How to look inside a running server'],
    concept: `<p>PostgreSQL is a client-server database built from <b>operating-system processes</b>:</p>
<ul>
<li>The <b>postmaster</b> listens for connections. For each client it starts a new <b>backend process</b> that parses, plans and runs that client's queries.</li>
<li>All backends share one memory area, <b>shared buffers</b>, which caches 8 KB table and index pages.</li>
<li>Every change is first written to the <b>WAL</b> (write-ahead log). If the server crashes, the WAL is replayed.</li>
<li>Helper processes run in the background: the <b>checkpointer</b> and <b>background writer</b> flush dirty pages, the <b>WAL writer</b> flushes the log, and <b>autovacuum</b> cleans up dead rows.</li>
</ul>
<p>PostgreSQL uses <b>MVCC</b>: an UPDATE does not overwrite a row; it writes a new version and marks the old one dead. Readers keep seeing the old version until they finish, so readers never block writers. <b>VACUUM</b> later reclaims the dead versions.</p>`,
    why: 'The architecture explains key operational facts: connections are expensive (one process each), memory settings matter, and tables bloat if vacuum cannot keep up.',
    when: 'Sizing connection pools, tuning shared_buffers and work_mem, investigating slow or blocked queries, and diagnosing table bloat.',
    analogy: 'The postmaster is the hospital receptionist who assigns each arriving patient a personal nurse (backend). All nurses share one supply room (shared buffers). Every procedure is logged in the chart before it is done (WAL), and a night cleaning crew (autovacuum) removes old supplies nobody needs any more.',
    syntax: `SELECT * FROM pg_stat_activity;\nSHOW shared_buffers;\nVACUUM (VERBOSE, ANALYZE) table_name;`,
    dialect: 'postgres',
    sql: `-- Who is connected and what are they running?
SELECT pid, usename, state, wait_event_type, now() - query_start AS running_for, query
FROM pg_stat_activity
WHERE datname = 'billing';

-- How many dead row versions are waiting for vacuum?
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

SHOW shared_buffers;`,
    breakdown: [
      ['pg_stat_activity', 'One row per backend process (connection): its pid, state and current query'],
      ['now() - query_start', 'Interval arithmetic: how long the current query has run'],
      ['pg_stat_user_tables', 'Per-table statistics including live and dead tuple counts'],
      ['n_dead_tup', 'Old row versions left by UPDATE/DELETE, removed by VACUUM'],
      ['SHOW shared_buffers', 'Size of the shared page cache'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 330" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="13">
<rect x="10" y="10" width="140" height="34" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="80" y="32" text-anchor="middle" fill="var(--text)">Billing app</text>
<rect x="10" y="54" width="140" height="34" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="80" y="76" text-anchor="middle" fill="var(--text)">Report tool</text>
<rect x="200" y="10" width="140" height="34" rx="6" fill="var(--panel2)" stroke="var(--accent)"/><text x="270" y="32" text-anchor="middle" fill="var(--text)">postmaster</text>
<rect x="400" y="10" width="110" height="34" rx="6" fill="var(--panel2)" stroke="var(--blue)"/><text x="455" y="32" text-anchor="middle" fill="var(--text)">backend #1</text>
<rect x="400" y="54" width="110" height="34" rx="6" fill="var(--panel2)" stroke="var(--blue)"/><text x="455" y="76" text-anchor="middle" fill="var(--text)">backend #2</text>
<line x1="150" y1="27" x2="200" y2="27" stroke="var(--muted)"/><line x1="150" y1="71" x2="200" y2="35" stroke="var(--muted)"/>
<line x1="340" y1="27" x2="400" y2="27" stroke="var(--muted)" stroke-dasharray="4"/><line x1="340" y1="35" x2="400" y2="71" stroke="var(--muted)" stroke-dasharray="4"/>
<text x="370" y="110" text-anchor="middle" fill="var(--muted)" font-size="11">forks one process per connection</text>
<rect x="10" y="125" width="620" height="80" rx="8" fill="none" stroke="var(--purple)" stroke-width="2"/>
<text x="20" y="143" fill="var(--purple)" font-weight="bold">Shared memory</text>
<rect x="30" y="152" width="300" height="42" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="180" y="178" text-anchor="middle" fill="var(--text)">shared_buffers (8 KB pages)</text>
<rect x="350" y="152" width="130" height="42" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="415" y="178" text-anchor="middle" fill="var(--text)">WAL buffers</text>
<rect x="495" y="152" width="120" height="42" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="555" y="178" text-anchor="middle" fill="var(--text)">lock table</text>
<rect x="10" y="220" width="115" height="34" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="67" y="242" text-anchor="middle" fill="var(--text)">checkpointer</text>
<rect x="135" y="220" width="115" height="34" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="192" y="242" text-anchor="middle" fill="var(--text)">bg writer</text>
<rect x="260" y="220" width="115" height="34" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="317" y="242" text-anchor="middle" fill="var(--text)">WAL writer</text>
<rect x="385" y="220" width="115" height="34" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="442" y="242" text-anchor="middle" fill="var(--text)">autovacuum</text>
<rect x="510" y="220" width="120" height="34" rx="6" fill="var(--panel2)" stroke="var(--green)"/><text x="570" y="242" text-anchor="middle" fill="var(--text)">stats / archiver</text>
<rect x="10" y="275" width="300" height="44" rx="8" fill="var(--panel2)" stroke="var(--border)"/><text x="160" y="302" text-anchor="middle" fill="var(--text)">Data files (heap + index files)</text>
<rect x="330" y="275" width="300" height="44" rx="8" fill="var(--panel2)" stroke="var(--yellow)"/><text x="480" y="302" text-anchor="middle" fill="var(--text)">WAL segments (pg_wal)</text>
</svg>` },
    internals: `<p>Each row version carries <code>xmin</code> (the transaction that created it) and <code>xmax</code> (the one that deleted or replaced it). A query's snapshot decides which versions are visible. Because indexes point to row versions, an UPDATE usually creates new index entries too, unless it is a <b>HOT</b> update (no indexed column changed and space exists on the same page).</p>`,
    mistakes: [
      { wrong: `-- App opens 2,000 direct connections to PostgreSQL`, why: 'Each connection is a full OS process with its own memory. Thousands of them waste RAM and cause contention. Put a pooler such as PgBouncer in front.', fix: `SELECT COUNT(*) AS invoices FROM invoices;` },
      { wrong: `-- Long-running "idle in transaction" session left open for hours`, why: 'An open transaction holds back the oldest snapshot, so VACUUM cannot remove dead rows anywhere: tables bloat.', fix: `SELECT status, COUNT(*) FROM invoices GROUP BY status;` },
    ],
    rules: ['One connection = one backend process: pool your connections.', 'All changes hit the WAL first; that is how crash recovery and replication work.', 'UPDATE writes a new row version; VACUUM reclaims the old ones.', 'Never leave transactions open and idle.'],
    compare: `<table><tr><th></th><th>PostgreSQL</th><th>MySQL InnoDB</th><th>SQLite</th></tr>
<tr><td>Concurrency unit</td><td>Process</td><td>Thread</td><td>Caller's thread</td></tr>
<tr><td>Old row versions</td><td>In the table (vacuum)</td><td>In the undo log (purge)</td><td>Rollback journal / WAL</td></tr>
<tr><td>Page cache</td><td>shared_buffers + OS cache</td><td>Buffer pool</td><td>Per-connection page cache</td></tr>
<tr><td>Activity view</td><td>pg_stat_activity</td><td>SHOW PROCESSLIST</td><td>n/a (in-process)</td></tr></table>`,
    realWorld: 'A claims clearinghouse on PostgreSQL runs PgBouncer with 50 server connections serving 3,000 app clients, and monitors n_dead_tup on the transactions table, which receives constant updates.',
    tips: ['pg_stat_statements shows the most expensive queries across all sessions.', 'SQLite has no server processes at all; PRAGMA commands are its inspection tools.'],
    deep: `<p>Transaction ids are 32-bit. Before they wrap around, VACUUM must "freeze" old rows. If autovacuum is blocked for too long, PostgreSQL will eventually refuse new writes to protect data, a famous production incident pattern called transaction-id wraparound.</p>`,
    tryIt: { prompt: 'SQLite runs inside your process, so there is no pg_stat_activity. Its PRAGMAs expose storage details instead. Try PRAGMA page_size, page_count and journal_mode.', starter: `SELECT * FROM pragma_page_size;\nSELECT * FROM pragma_page_count;\nSELECT * FROM pragma_database_list;` },
    challenge: {
      level: 2,
      prompt: 'Build a pg_stat_user_tables-style report: one row per table (patients, payors, invoices, charges, payments, transactions) with the table name and its live row count, sorted by row count descending.',
      solution: `SELECT 'patients' AS relname, COUNT(*) AS n_live_tup FROM patients
UNION ALL SELECT 'payors', COUNT(*) FROM payors
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'charges', COUNT(*) FROM charges
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
ORDER BY n_live_tup DESC;`,
      hints: ['You need one COUNT(*) per table.', 'Combine separate SELECTs with UNION ALL.', 'Put the table name as a literal in each SELECT.', 'SELECT \'patients\', COUNT(*) FROM patients UNION ALL SELECT \'payors\', COUNT(*) FROM payors ... ORDER BY 2 DESC'],
      ordered: true,
    },
    quiz: [
      { q: 'What does PostgreSQL start for each new client connection?', options: ['A thread', 'A backend process', 'A new database', 'Nothing, it is stateless'], answer: 1, why: 'The postmaster forks one backend process per connection.' },
      { q: 'What does an UPDATE leave behind under MVCC?', options: ['Nothing', 'A dead row version to be vacuumed', 'A locked page forever', 'A copy in the binary log only'], answer: 1, why: 'The old version stays in the table until VACUUM removes it.' },
      { q: 'Why is the WAL written before data files?', options: ['It is faster to read', 'So committed changes can be replayed after a crash', 'To compress data', 'To avoid indexes'], answer: 1, why: 'Write-ahead logging guarantees durability and crash recovery.' },
    ],
  },
  {
    id: 'dialects-09',
    goals: ['Declare and fill array columns in PostgreSQL', 'Search arrays with ANY, @> and &&', 'Turn rows into arrays (array_agg) and arrays into rows (unnest)', 'Emulate arrays in SQLite with JSON and group_concat'],
    concept: `<p>PostgreSQL lets a single column hold a list: <code>diagnosis_codes TEXT[]</code>. A charge might be linked to several ICD-10 codes, for example <code>'{E11.9,I10}'</code>.</p>
<ul>
<li><code>ARRAY['E11.9','I10']</code> builds one; arrays are <b>1-based</b>: <code>codes[1]</code> is the first.</li>
<li><code>'I10' = ANY(codes)</code>: is the value in the array?</li>
<li><code>codes @> ARRAY['I10']</code> (contains), <code>codes && ARRAY['I10','E78.5']</code> (overlaps). These can use a GIN index.</li>
<li><code>array_agg(x ORDER BY x)</code> collapses rows into an array; <code>unnest(arr)</code> expands an array into rows.</li>
<li><code>cardinality(arr)</code> / <code>array_length(arr, 1)</code> count elements.</li>
</ul>
<p>SQLite has no array type. Use a JSON array plus <code>json_each</code> (the unnest), and <code>json_group_array</code> or <code>group_concat</code> (the array_agg).</p>`,
    why: 'Arrays model small, ordered lists that belong to one row without a separate table, and array_agg / unnest make reshaping data easy.',
    when: 'Tags, small lists of codes, or reshaping query results. For lists you join, constrain or report on heavily, a child table is still the better design.',
    analogy: 'An array column is a single line on the claim form listing several diagnosis pointers. It is compact, but if you need to count how often each diagnosis appears across all claims, you first have to "unstaple" the list into separate rows (unnest).',
    syntax: `col TEXT[]\n'val' = ANY(col)\ncol @> ARRAY['a']\narray_agg(expr ORDER BY expr)\nunnest(array)`,
    dialect: 'postgres',
    sql: `-- One array of distinct CPT codes per invoice
SELECT invoice_id,
       array_agg(DISTINCT cpt_code ORDER BY cpt_code) AS cpt_codes,
       cardinality(array_agg(DISTINCT cpt_code))      AS code_count
FROM charges
GROUP BY invoice_id;

-- Invoices containing an ECG (93000)
SELECT invoice_id
FROM (SELECT invoice_id, array_agg(cpt_code) AS codes
      FROM charges GROUP BY invoice_id) t
WHERE '93000' = ANY(codes);

-- Back to rows
SELECT unnest(ARRAY['Penicillin', 'Latex']) AS allergy;`,
    breakdown: [
      ['array_agg(DISTINCT cpt_code ORDER BY cpt_code)', 'Collects the codes of each invoice into a sorted array'],
      ['cardinality(...)', 'Number of elements in the array'],
      ['\'93000\' = ANY(codes)', 'True if any element equals 93000'],
      ['unnest(ARRAY[...])', 'Turns each array element into its own row'],
    ],
    dialectSql: {
      mysql: `SELECT invoice_id, JSON_ARRAYAGG(cpt_code) AS codes FROM charges GROUP BY invoice_id;\n-- explode: JSON_TABLE(codes, '$[*]' COLUMNS (code VARCHAR(10) PATH '$'))`,
      postgres: `SELECT invoice_id, array_agg(cpt_code ORDER BY cpt_code) AS codes FROM charges GROUP BY invoice_id;\n-- explode: SELECT unnest(codes)`,
      sqlserver: `SELECT invoice_id, STRING_AGG(cpt_code, ',') WITHIN GROUP (ORDER BY cpt_code) AS codes FROM charges GROUP BY invoice_id;\n-- explode: CROSS APPLY STRING_SPLIT(codes, ',')`,
      oracle: `SELECT invoice_id, LISTAGG(cpt_code, ',') WITHIN GROUP (ORDER BY cpt_code) AS codes FROM charges GROUP BY invoice_id;`,
      sqlite: `SELECT invoice_id, json_group_array(cpt_code) AS codes FROM charges GROUP BY invoice_id;\n-- explode: SELECT value FROM json_each(codes)`,
    },
    mistakes: [
      { wrong: `SELECT codes[0] FROM claims;`, why: 'PostgreSQL arrays start at index 1. codes[0] silently returns NULL.', fix: `SELECT json_extract('["E11.9","I10"]', '$[0]') AS first_code;  -- JSON arrays ARE 0-based` },
      { wrong: `SELECT * FROM claims WHERE codes = 'I10';`, why: 'Comparing an array to a scalar is an error. Test membership with = ANY(codes) or codes @> ARRAY[...].', fix: `SELECT value FROM json_each('["E11.9","I10"]') WHERE value = 'I10';` },
    ],
    rules: ['PostgreSQL arrays are 1-based; JSON arrays are 0-based.', 'Use = ANY() for membership, @> for containment, && for overlap.', 'array_agg rows to array; unnest array to rows.', 'If you join or constrain on the list items, use a child table instead.'],
    compare: `<table><tr><th>Need</th><th>PostgreSQL</th><th>SQLite</th></tr>
<tr><td>Rows to list</td><td><code>array_agg(x)</code></td><td><code>json_group_array(x)</code> / <code>group_concat(x)</code></td></tr>
<tr><td>List to rows</td><td><code>unnest(arr)</code></td><td><code>json_each(doc)</code></td></tr>
<tr><td>Membership</td><td><code>'a' = ANY(arr)</code></td><td><code>EXISTS (SELECT 1 FROM json_each(doc) WHERE value='a')</code></td></tr>
<tr><td>Length</td><td><code>cardinality(arr)</code></td><td><code>json_array_length(doc)</code></td></tr></table>`,
    realWorld: 'Claim lines carry up to four diagnosis pointers; systems on PostgreSQL store them as arrays and use a GIN index to answer "all claims with diagnosis I10" quickly.',
    tips: ['Split a comma list into a JSON array in SQLite with \'["\' || replace(list, \', \', \'","\') || \'"]\'.', 'array_agg without ORDER BY has no guaranteed order.'],
    deep: `<p>A GIN (Generalized Inverted Index) on an array column stores every element as a key pointing to the rows containing it, which makes <code>@></code> and <code>&&</code> fast. Plain B-tree indexes only help with equality of the whole array.</p>`,
    tryIt: { prompt: 'SQLite array emulation: json_group_array builds an array per invoice and json_each explodes it again. Change the filter to find invoices containing CPT 97140.', starter: `WITH arr AS (\n  SELECT invoice_id, json_group_array(cpt_code) AS codes\n  FROM charges\n  GROUP BY invoice_id\n)\nSELECT invoice_id, codes, json_array_length(codes) AS n\nFROM arr\nWHERE EXISTS (SELECT 1 FROM json_each(arr.codes) WHERE value = '93000')\nORDER BY invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'The allergies column holds comma-separated lists like "Penicillin, Latex". Unnest it: return one row per (patient_id, allergy), sorted by patient_id then allergy. Hint: turn the list into a JSON array and use json_each.',
      solution: `SELECT p.patient_id, j.value AS allergy
FROM patients p,
     json_each('["' || replace(p.allergies, ', ', '","') || '"]') AS j
WHERE p.allergies IS NOT NULL
ORDER BY p.patient_id, allergy;`,
      hints: ['Only patients with non-NULL allergies matter.', 'replace(allergies, \', \', \'","\') turns "A, B" into A","B.', 'Wrap it: \'["\' || ... || \'"]\' gives a valid JSON array; json_each() then returns one row per element in its value column.', 'FROM patients p, json_each(\'["\' || replace(p.allergies, \', \', \'","\') || \'"]\') j WHERE p.allergies IS NOT NULL'],
      ordered: true,
    },
    quiz: [
      { q: 'What is the index of the first element in a PostgreSQL array?', options: ['0', '1', '-1', 'It depends on the type'], answer: 1, why: 'PostgreSQL arrays are 1-based by default.' },
      { q: 'Which function turns an array into rows?', options: ['array_agg', 'unnest', 'cardinality', 'string_to_array'], answer: 1, why: 'unnest expands each element into a row; array_agg does the opposite.' },
    ],
  },
  {
    id: 'dialects-10',
    goals: ['JSON vs JSONB in PostgreSQL', 'Read with -> and ->>, test with @> and ?', 'Build documents with jsonb_build_object and jsonb_agg', 'Index JSONB with GIN, and emulate in SQLite'],
    concept: `<p>PostgreSQL has two JSON types:</p>
<ul>
<li><code>json</code> stores the exact text (keeps whitespace, key order, duplicate keys) and re-parses it on every read.</li>
<li><code>jsonb</code> stores a parsed <b>binary</b> form: slightly slower to write, much faster to query, and indexable. Use <b>jsonb</b> almost always.</li>
</ul>
<p>Operators:</p>
<ul>
<li><code>doc->'plan'</code> returns jsonb; <code>doc->>'plan'</code> returns text; <code>doc#>>'{plan,copay}'</code> follows a path.</li>
<li><code>doc @> '{"status":"active"}'</code>: does the document contain this piece? (GIN-indexable)</li>
<li><code>doc ? 'copay'</code>: does the key exist?</li>
<li><code>jsonb_build_object</code>, <code>jsonb_agg</code>, <code>jsonb_set</code>, <code>jsonb_array_elements</code>.</li>
</ul>
<p>Note: PostgreSQL uses plain keys (<code>->'plan'</code>) while MySQL and SQLite use JSON paths (<code>->'$.plan'</code>). SQLite 3.45 also accepts plain keys with <code>-></code>.</p>`,
    why: 'jsonb combines document flexibility with SQL power: you can filter, join, and index inside documents.',
    when: 'Storing payer API responses, audit payloads, or variable attributes. Use @> with a GIN index for fast "documents that contain X" searches.',
    analogy: 'json is a photocopy of the eligibility letter: exact, but you must re-read it every time. jsonb is the same letter already typed into the system as fields: faster to look things up, and the original formatting is gone.',
    syntax: `doc->'key'  doc->>'key'  doc#>>'{a,b}'\ndoc @> '{"k":"v"}'::jsonb\njsonb_build_object('k', v)  jsonb_agg(expr)\nCREATE INDEX ON t USING GIN (doc);`,
    dialect: 'postgres',
    sql: `CREATE TABLE eligibility (
  patient_id INT PRIMARY KEY REFERENCES patients,
  response   JSONB NOT NULL
);
CREATE INDEX idx_elig_gin ON eligibility USING GIN (response);

SELECT patient_id,
       response->'plan'->>'name'             AS plan_name,
       (response#>>'{plan,copay}')::numeric  AS copay
FROM eligibility
WHERE response @> '{"status": "active"}';

SELECT jsonb_build_object('invoice', i.invoice_id,
                          'charges', jsonb_agg(jsonb_build_object('cpt', c.cpt_code, 'amt', c.amount)))
FROM invoices i JOIN charges c USING (invoice_id)
GROUP BY i.invoice_id;`,
    breakdown: [
      ['response JSONB', 'Binary JSON column'],
      ['USING GIN (response)', 'Inverted index over every key/value, speeds up @> and ?'],
      ['response->\'plan\'->>\'name\'', 'Into the plan object (jsonb), then name as text'],
      ['(response#>>\'{plan,copay}\')::numeric', 'Path extraction as text, cast to a number'],
      ['response @> \'{"status": "active"}\'', 'Containment: document includes that key/value'],
      ['jsonb_agg(jsonb_build_object(...))', 'Nested document: an array of charge objects per invoice'],
    ],
    dialectSql: {
      mysql: `SELECT response->>'$.plan.name' FROM eligibility\nWHERE JSON_CONTAINS(response, '"active"', '$.status');`,
      postgres: `SELECT response->'plan'->>'name' FROM eligibility\nWHERE response @> '{"status":"active"}';`,
      sqlserver: `SELECT JSON_VALUE(response, '$.plan.name') FROM eligibility\nWHERE JSON_VALUE(response, '$.status') = 'active';`,
      oracle: `SELECT JSON_VALUE(response, '$.plan.name') FROM eligibility\nWHERE JSON_EXISTS(response, '$?(@.status == "active")');`,
      sqlite: `SELECT response->>'$.plan.name' FROM eligibility\nWHERE response->>'$.status' = 'active';`,
    },
    mistakes: [
      { wrong: `SELECT * FROM eligibility WHERE response->'status' = 'active';`, why: '-> returns jsonb, and \'active\' would need to be the JSON string \'"active"\'. Use ->> for text comparison, or @> for an indexable test.', fix: `SELECT json_object('status','active')->>'$.status' = 'active' AS is_active;` },
      { wrong: `SELECT (response->>'copay') + 10 FROM eligibility;`, why: '->> returns text; PostgreSQL will not add a number to text. Cast first: (response->>\'copay\')::numeric.', fix: `SELECT CAST(json_object('copay', 25)->>'$.copay' AS REAL) + 10 AS copay_plus;` },
    ],
    rules: ['Prefer jsonb over json.', '-> keeps JSON, ->> gives text; cast text before arithmetic.', 'Use @> with a GIN index for fast containment searches.', 'Keep keys, amounts and dates you filter on often in real columns.'],
    compare: `<table><tr><th></th><th>json</th><th>jsonb</th></tr>
<tr><td>Storage</td><td>Exact text</td><td>Parsed binary</td></tr>
<tr><td>Key order / duplicates</td><td>Kept</td><td>Normalized, last key wins</td></tr>
<tr><td>Query speed</td><td>Slower (re-parse)</td><td>Faster</td></tr>
<tr><td>GIN index / @></td><td>No</td><td>Yes</td></tr></table>`,
    realWorld: 'Revenue-cycle platforms store raw 835 remittance and 271 eligibility responses as jsonb, index them with GIN, and expose computed columns (copay, deductible remaining) for dashboards.',
    tips: ['jsonb_pretty(doc) makes documents readable in psql.', 'jsonb_path_query supports SQL/JSON path expressions like MySQL and Oracle.'],
    deep: `<p>A GIN index with the <code>jsonb_path_ops</code> operator class is smaller and faster for <code>@></code> but does not support the <code>?</code> key-exists operators. Choose the operator class based on the queries you run.</p>`,
    tryIt: { prompt: 'SQLite version: build a nested invoice document with its charges using json_group_array, then read a field back. Try adding the invoice status to the outer object.', starter: `SELECT i.invoice_id,\n       json_object('invoice', i.invoice_id,\n                   'charges', json_group_array(json_object('cpt', c.cpt_code, 'amt', c.amount))) AS doc\nFROM invoices i\nJOIN charges c ON c.invoice_id = i.invoice_id\nWHERE i.invoice_id <= 5\nGROUP BY i.invoice_id\nORDER BY i.invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'In a CTE, build a JSON document per invoice with keys status and total. Then, reading ONLY from the documents, return invoice_id, the status and the total for documents whose total is above 500. Sort by total descending, then invoice_id.',
      solution: `WITH docs AS (
  SELECT invoice_id, json_object('status', status, 'total', total_amount) AS doc
  FROM invoices
)
SELECT invoice_id,
       doc->>'$.status' AS status,
       doc->>'$.total'  AS total
FROM docs
WHERE doc->>'$.total' > 500
ORDER BY doc->>'$.total' DESC, invoice_id;`,
      hints: ['First CTE: SELECT invoice_id, json_object(\'status\', status, \'total\', total_amount) AS doc FROM invoices.', 'Read values back with doc->>\'$.status\' and doc->>\'$.total\'.', 'In SQLite ->> returns a SQL number for JSON numbers, so > 500 works.', 'WHERE doc->>\'$.total\' > 500 ORDER BY doc->>\'$.total\' DESC, invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'Which PostgreSQL type should you normally use for JSON?', options: ['json', 'jsonb', 'text', 'hstore'], answer: 1, why: 'jsonb is parsed, faster to query, and indexable.' },
      { q: 'What does response @> \'{"status":"active"}\' test?', options: ['Key exists', 'Document contains that key/value pair', 'Documents are equal', 'Status is not null'], answer: 1, why: '@> is the containment operator.' },
      { q: 'What type does ->> return in PostgreSQL?', options: ['jsonb', 'text', 'numeric', 'boolean'], answer: 1, why: '->> extracts the value as text.' },
    ],
  },
  {
    id: 'dialects-11',
    goals: ['Pick precise PostgreSQL types: NUMERIC, BOOLEAN, UUID, INTERVAL, TIMESTAMPTZ', 'Use range types (daterange) and ENUMs', 'Enforce rules with DOMAINs and exclusion constraints', 'Emulate ranges and intervals in SQLite'],
    concept: `<p>PostgreSQL has a very rich type system. Choosing the right type lets the database validate data and offer smart operators.</p>
<ul>
<li><code>NUMERIC(12,2)</code>: exact money. <code>BOOLEAN</code>: real true/false (not 0/1).</li>
<li><code>UUID</code>: 128-bit ids, good for ids generated outside the database.</li>
<li><code>TIMESTAMPTZ</code>: a moment in time (stored as UTC). <code>INTERVAL</code>: a duration like <code>'30 days'</code>.</li>
<li><code>daterange('2026-01-01','2026-12-31','[]')</code>: a range. Operators: <code>@></code> contains, <code>&&</code> overlaps.</li>
<li><code>CREATE TYPE invoice_status AS ENUM (...)</code>: a fixed list of labels.</li>
<li><code>CREATE DOMAIN npi AS CHAR(10) CHECK (VALUE ~ '^[0-9]{10}$')</code>: a reusable type with rules.</li>
<li>Also <code>INET</code>, <code>CIDR</code>, arrays, <code>JSONB</code>, geometric types, and more.</li>
</ul>
<p>SQLite has only five storage classes (NULL, INTEGER, REAL, TEXT, BLOB). Ranges become two columns and range tests become <code>start &lt;= x AND x &lt;= end</code>.</p>`,
    why: 'Correct types catch bad data early and replace pages of application logic with one operator (for example, "do these coverage periods overlap?").',
    when: 'Coverage periods, appointment slots, contract effective dates, status fields, and identifiers with strict formats.',
    analogy: 'Using TEXT for everything is like a clinic storing every lab result on sticky notes. Typed columns are the proper lab forms: a numeric field only takes numbers, a date field only dates, and a "coverage period" box knows its start and end.',
    syntax: `CREATE TYPE name AS ENUM ('a','b');\nCREATE DOMAIN name AS base CHECK (...);\ncol DATERANGE, EXCLUDE USING gist (key WITH =, period WITH &&)`,
    dialect: 'postgres',
    sql: `CREATE TYPE invoice_status AS ENUM ('Open','Paid','Partially Paid','Overdue','Void');
CREATE DOMAIN npi_code AS CHAR(10) CHECK (VALUE ~ '^[0-9]{10}$');

CREATE TABLE coverage (
  coverage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  INT NOT NULL REFERENCES patients,
  payor_id    INT NOT NULL REFERENCES payors,
  period      DATERANGE NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT true,
  EXCLUDE USING gist (patient_id WITH =, period WITH &&) WHERE (is_primary)
);

-- Which coverage applied on the service date?
SELECT c.payor_id
FROM coverage c
WHERE c.patient_id = 5 AND c.period @> DATE '2026-03-15';

SELECT due_date + INTERVAL '30 days' AS final_notice FROM invoices;`,
    breakdown: [
      ['CREATE TYPE ... AS ENUM', 'A type that only accepts the listed labels, stored compactly'],
      ['CREATE DOMAIN npi_code ... CHECK', 'Reusable type: any column declared npi_code gets the 10-digit rule'],
      ['UUID ... gen_random_uuid()', 'Random 128-bit id generated by the database'],
      ['period DATERANGE', 'Start and end in one value'],
      ['EXCLUDE USING gist (... period WITH &&)', 'No two primary coverages for the same patient may overlap'],
      ['period @> DATE \'2026-03-15\'', 'Does the range contain this date?'],
    ],
    dialectSql: {
      mysql: `-- no range type: two columns\nSELECT payor_id FROM coverage\nWHERE patient_id = 5 AND '2026-03-15' BETWEEN start_date AND end_date;`,
      postgres: `SELECT payor_id FROM coverage\nWHERE patient_id = 5 AND period @> DATE '2026-03-15';`,
      sqlserver: `SELECT payor_id FROM coverage\nWHERE patient_id = 5 AND '2026-03-15' BETWEEN start_date AND end_date;`,
      oracle: `SELECT payor_id FROM coverage\nWHERE patient_id = 5 AND DATE '2026-03-15' BETWEEN start_date AND end_date;`,
      sqlite: `SELECT payor_id FROM coverage\nWHERE patient_id = 5 AND '2026-03-15' BETWEEN start_date AND end_date;`,
    },
    mistakes: [
      { wrong: `CREATE TABLE coverage (start_date DATE, end_date DATE);  -- and hope nobody overlaps`, why: 'Two-column ranges cannot stop overlapping periods with a simple constraint, so double coverage slips in. PostgreSQL range types plus an EXCLUDE constraint prevent it.', fix: `SELECT invoice_id FROM invoices WHERE invoice_date <= '2026-09-01' AND due_date >= '2026-09-01';` },
      { wrong: `ALTER TYPE invoice_status ... -- remove the value 'Void'`, why: 'Enum values can be added but not removed or easily reordered. For lists that change often, use a lookup table with a foreign key.', fix: `SELECT DISTINCT status FROM invoices ORDER BY status;` },
    ],
    rules: ['Use NUMERIC for money, TIMESTAMPTZ for moments, DATE for calendar days.', 'Range types turn overlap and containment into single operators.', 'ENUMs are great for stable lists; lookup tables for changing ones.', 'DOMAINs centralize validation rules.'],
    compare: `<table><tr><th>Concept</th><th>PostgreSQL</th><th>SQLite</th></tr>
<tr><td>Boolean</td><td><code>BOOLEAN</code></td><td>INTEGER 0/1</td></tr>
<tr><td>Date range</td><td><code>daterange</code>, <code>@></code>, <code>&&</code></td><td>Two TEXT columns, <code>BETWEEN</code></td></tr>
<tr><td>Interval</td><td><code>INTERVAL '30 days'</code></td><td><code>date(d, '+30 days')</code></td></tr>
<tr><td>Enum</td><td><code>CREATE TYPE ... ENUM</code></td><td><code>CHECK (col IN (...))</code></td></tr>
<tr><td>UUID</td><td><code>UUID</code></td><td>TEXT or 16-byte BLOB</td></tr></table>`,
    realWorld: 'Eligibility systems store coverage periods as dateranges with exclusion constraints so a patient can never have two overlapping primary plans. Scheduling systems use tstzrange to prevent double-booking a practitioner.',
    tips: ['Two ranges [a,b) and [c,d) overlap when a < d AND c < b: the same test works in any database.', 'SQLite STRICT tables reject values of the wrong type.'],
    deep: `<p>Ranges can be inclusive <code>[</code> or exclusive <code>)</code>. Discrete ranges (daterange, int4range) are normalized to <code>[start,end)</code>. Exclusion constraints require the btree_gist extension when mixing scalar equality (patient_id WITH =) with range operators.</p>`,
    tryIt: { prompt: 'Range "contains" in SQLite: which invoices were within their payment window (invoice_date to due_date) on 2026-09-01? Change the date to 2026-06-15.', starter: `SELECT invoice_id, invoice_date, due_date, status\nFROM invoices\nWHERE invoice_date <= '2026-09-01'\n  AND due_date     >= '2026-09-01'\nORDER BY invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'Emulate the range overlap operator (&&). Find pairs of invoices for the SAME patient whose [invoice_date, due_date] windows overlap. Show patient_id and the two invoice_ids (smaller first), sorted by patient_id, then first id, then second id.',
      solution: `SELECT a.patient_id, a.invoice_id AS first_invoice, b.invoice_id AS second_invoice
FROM invoices a
JOIN invoices b
  ON b.patient_id = a.patient_id
 AND a.invoice_id < b.invoice_id
 AND a.invoice_date <= b.due_date
 AND b.invoice_date <= a.due_date
ORDER BY a.patient_id, first_invoice, second_invoice;`,
      hints: ['Self-join invoices on the same patient_id.', 'Use a.invoice_id < b.invoice_id to avoid pairing a row with itself or listing a pair twice.', 'Two periods overlap when each one starts before the other ends.', 'a.invoice_date <= b.due_date AND b.invoice_date <= a.due_date'],
      ordered: true,
    },
    quiz: [
      { q: 'What does period @> DATE \'2026-03-15\' check?', options: ['Period starts on that date', 'Period contains that date', 'Period is after that date', 'Period overlaps another period'], answer: 1, why: '@> is "contains" for ranges.' },
      { q: 'Which constraint prevents overlapping coverage periods in PostgreSQL?', options: ['UNIQUE', 'CHECK', 'EXCLUDE USING gist', 'FOREIGN KEY'], answer: 2, why: 'Exclusion constraints reject rows whose ranges overlap (&&) with existing ones.' },
    ],
  },
  {
    id: 'dialects-12',
    goals: ['tsvector (the searchable document) and tsquery (the search)', 'Match with @@ and rank with ts_rank', 'Stemming and stop words', 'Index with GIN and compare with SQLite FTS'],
    concept: `<p>PostgreSQL has full-text search built in. Two special types do the work:</p>
<ul>
<li><code>to_tsvector('english', description)</code> turns text into a sorted list of normalized words (lexemes): <i>"Therapeutic exercises"</i> becomes <code>'exercis':2 'therapeut':1</code>. This is <b>stemming</b>: different forms of a word match.</li>
<li><code>to_tsquery('english', 'therapy &amp; !manual')</code> is the search: AND (&amp;), OR (|), NOT (!), prefix (<code>therap:*</code>). <code>plainto_tsquery</code> and <code>websearch_to_tsquery</code> accept normal user text.</li>
<li><code>vector @@ query</code> returns true when they match. <code>ts_rank(vector, query)</code> scores relevance.</li>
</ul>
<p>For speed, store the vector in a <b>generated column</b> and index it with <b>GIN</b>.</p>`,
    why: 'Built-in full-text avoids running a separate search engine for many use cases, and it understands language (stems, stop words).',
    when: 'Searching notes, descriptions, denial reasons, or documents by words, with relevance ranking.',
    analogy: 'to_tsvector is like a coder reducing a narrative note to its key terms ("exercises", "exercising" both become "exercis"); to_tsquery is the lookup request; @@ is checking the request against the key-term list.',
    syntax: `to_tsvector('english', text) @@ to_tsquery('english', 'a & b')\nts_rank(vector, query)\nCREATE INDEX ON t USING GIN (vector_col);`,
    dialect: 'postgres',
    sql: `ALTER TABLE charges
  ADD COLUMN search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', description)) STORED;
CREATE INDEX idx_charges_search ON charges USING GIN (search);

SELECT charge_id, description,
       ts_rank(search, q) AS rank
FROM charges, websearch_to_tsquery('english', 'therapy -manual') AS q
WHERE search @@ q
ORDER BY rank DESC;`,
    breakdown: [
      ['GENERATED ALWAYS AS (to_tsvector(...)) STORED', 'Keeps a pre-computed searchable version of the description'],
      ['USING GIN (search)', 'Inverted index over lexemes'],
      ['websearch_to_tsquery(\'english\', \'therapy -manual\')', 'Parses Google-style input: therapy, but not manual'],
      ['search @@ q', 'The match operator'],
      ['ts_rank(search, q)', 'Relevance score for ordering'],
    ],
    dialectSql: {
      mysql: `SELECT * FROM charges WHERE MATCH(description) AGAINST('+therapy -manual' IN BOOLEAN MODE);`,
      postgres: `SELECT * FROM charges WHERE search @@ websearch_to_tsquery('english', 'therapy -manual');`,
      sqlserver: `SELECT * FROM charges WHERE CONTAINS(description, '"therapy" AND NOT "manual"');`,
      oracle: `SELECT * FROM charges WHERE CONTAINS(description, 'therapy NOT manual') > 0;`,
      sqlite: `SELECT * FROM charge_fts WHERE charge_fts MATCH 'therapy NOT manual';`,
    },
    mistakes: [
      { wrong: `SELECT * FROM charges WHERE to_tsvector(description) @@ to_tsquery('office visit');`, why: 'to_tsquery needs operators between words ("office & visit"); plain text with a space is a syntax error. Use plainto_tsquery or websearch_to_tsquery for user input. Also always pass the language so the index can be used.', fix: `SELECT charge_id, description FROM charges WHERE description LIKE '%office%' AND description LIKE '%visit%';` },
      { wrong: `CREATE INDEX ON charges USING GIN (to_tsvector(description));`, why: 'The one-argument form depends on a setting, so it is not immutable and cannot be indexed. Specify the config: to_tsvector(\'english\', description).', fix: `SELECT COUNT(*) FROM charges;` },
    ],
    rules: ['tsvector = document, tsquery = search, @@ = match.', 'Always name the text search config (\'english\').', 'Store the tsvector in a generated column and index it with GIN.', 'Use websearch_to_tsquery for text typed by users.'],
    compare: `<table><tr><th></th><th>PostgreSQL FTS</th><th>MySQL FULLTEXT</th><th>SQLite FTS</th></tr>
<tr><td>Stemming</td><td>Yes (per language)</td><td>No (ngram/plugins)</td><td>Porter tokenizer option</td></tr>
<tr><td>Ranking</td><td><code>ts_rank</code></td><td>MATCH score</td><td><code>bm25()</code> (FTS5), matchinfo (FTS4)</td></tr>
<tr><td>Storage</td><td>Column + GIN</td><td>Index on table</td><td>Separate virtual table</td></tr></table>`,
    realWorld: 'Denial work queues search payer remark text ("authorization", "timely filing") ranked by relevance, and coding tools search procedure descriptions with stemming so "injection" finds "injections".',
    tips: ['ts_headline() returns snippets with matched words highlighted.', 'setweight() lets the title count more than the body in ranking.'],
    deep: `<p>ts_rank considers how often and how close the query terms appear; ts_rank_cd uses "cover density" (proximity). Neither uses global document frequency like BM25, so large corpora sometimes use extensions (e.g. pg_search/ParadeDB) or an external engine.</p>`,
    tryIt: { prompt: 'SQLite FTS4 with the porter stemmer: "therapeutic" and "therapy" share a stem. Try MATCH \'exercis*\' and MATCH \'visit NOT office\'.', starter: `CREATE VIRTUAL TABLE charge_fts USING fts4(description, tokenize=porter);\nINSERT INTO charge_fts (docid, description) SELECT charge_id, description FROM charges;\n\nSELECT docid AS charge_id, description\nFROM charge_fts\nWHERE charge_fts MATCH 'therapy'\nORDER BY docid\nLIMIT 10;` },
    challenge: {
      level: 3,
      prompt: 'Emulate ranking without an FTS index. Score each distinct charge description by how many of these words it contains: "visit", "office", "patient" (case-insensitive, 1 point each). Return description and score for descriptions scoring at least 1, sorted by score descending, then description.',
      solution: `SELECT description,
       (lower(description) LIKE '%visit%')
     + (lower(description) LIKE '%office%')
     + (lower(description) LIKE '%patient%') AS score
FROM (SELECT DISTINCT description FROM charges)
WHERE score >= 1
ORDER BY score DESC, description;`,
      hints: ['Work on SELECT DISTINCT description FROM charges.', 'In SQLite a comparison like x LIKE \'%visit%\' evaluates to 1 or 0.', 'Add the three LIKE tests together to get a score.', 'SQLite lets you use the score alias in WHERE: WHERE score >= 1 ORDER BY score DESC, description'],
      ordered: true,
    },
    quiz: [
      { q: 'What does to_tsvector produce?', options: ['A list of normalized, stemmed words', 'An exact copy of the text', 'A hash of the text', 'A B-tree index'], answer: 0, why: 'A tsvector is the sorted list of lexemes with positions.' },
      { q: 'Which operator matches a tsvector against a tsquery?', options: ['@>', '@@', '~', 'LIKE'], answer: 1, why: '@@ is the text-search match operator.' },
    ],
  },
  {
    id: 'dialects-13',
    goals: ['DISTINCT ON for "first row per group"', 'generate_series for calendars and gaps', 'RETURNING, ILIKE, FILTER, :: casts, date_trunc, string_agg', 'SQLite equivalents for each'],
    concept: `<p>PostgreSQL has many handy extras. The ones you will see most:</p>
<ul>
<li><code>SELECT DISTINCT ON (patient_id) ... ORDER BY patient_id, invoice_date DESC</code>: keep only the first row per patient (the latest invoice).</li>
<li><code>generate_series('2026-01-01'::date, '2026-12-01', '1 month')</code>: produce rows out of thin air, perfect for calendars that must include empty months.</li>
<li><code>INSERT/UPDATE/DELETE ... RETURNING *</code>: get the changed rows back in one round trip.</li>
<li><code>ILIKE</code>: case-insensitive LIKE. <code>x::numeric</code>: short cast syntax.</li>
<li><code>COUNT(*) FILTER (WHERE status = 'Paid')</code>: conditional aggregation.</li>
<li><code>date_trunc('month', ts)</code>, <code>string_agg(x, ', ' ORDER BY x)</code>.</li>
</ul>
<p>SQLite supports RETURNING, FILTER and string_agg directly. DISTINCT ON becomes ROW_NUMBER(), generate_series becomes a recursive CTE, ILIKE becomes LIKE (already case-insensitive for ASCII).</p>`,
    why: 'These features shorten common queries dramatically, and you need to recognize them to port PostgreSQL code.',
    when: 'Latest-row-per-group reports, calendar/gap reports, returning generated ids, and conditional counts.',
    analogy: 'DISTINCT ON is like pulling only the top sheet from each patient\'s folder after sorting each folder newest-first. generate_series is a blank calendar you lay under your data so empty days still show up.',
    syntax: `SELECT DISTINCT ON (key) ... ORDER BY key, sort_col DESC;\nSELECT * FROM generate_series(start, stop, step);\nINSERT ... RETURNING id;\nCOUNT(*) FILTER (WHERE cond)`,
    dialect: 'postgres',
    sql: `-- Latest invoice per patient
SELECT DISTINCT ON (patient_id) patient_id, invoice_id, invoice_date, status
FROM invoices
ORDER BY patient_id, invoice_date DESC, invoice_id DESC;

-- Every month of 2026, even months with no billing
SELECT m::date AS month, COALESCE(SUM(i.total_amount), 0) AS billed
FROM generate_series('2026-01-01'::date, '2026-09-01', '1 month') AS m
LEFT JOIN invoices i ON date_trunc('month', i.invoice_date) = m
GROUP BY m ORDER BY m;

UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3 RETURNING invoice_id, status;`,
    breakdown: [
      ['DISTINCT ON (patient_id)', 'Keep the first row for each patient_id according to ORDER BY'],
      ['ORDER BY patient_id, invoice_date DESC', 'Must start with the DISTINCT ON key; the rest decides which row is "first"'],
      ['generate_series(..., \'1 month\')', 'One row per month, including months with no invoices'],
      ['date_trunc(\'month\', i.invoice_date)', 'Rounds a date down to the first of its month'],
      ['RETURNING invoice_id, status', 'Returns the updated rows'],
    ],
    dialectSql: {
      mysql: `SELECT * FROM (\n  SELECT i.*, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date DESC) rn FROM invoices i\n) t WHERE rn = 1;`,
      postgres: `SELECT DISTINCT ON (patient_id) *\nFROM invoices ORDER BY patient_id, invoice_date DESC;`,
      sqlserver: `SELECT TOP 1 WITH TIES *\nFROM invoices\nORDER BY ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date DESC);`,
      oracle: `SELECT * FROM invoices\nORDER BY ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date DESC)\nFETCH FIRST 1 ROWS WITH TIES;`,
      sqlite: `SELECT * FROM (\n  SELECT i.*, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date DESC) rn FROM invoices i\n) WHERE rn = 1;`,
    },
    mistakes: [
      { wrong: `SELECT DISTINCT ON (patient_id) * FROM invoices ORDER BY invoice_date DESC;`, why: 'ORDER BY must begin with the DISTINCT ON expressions, otherwise PostgreSQL raises an error.', fix: `SELECT patient_id, MAX(invoice_date) AS latest FROM invoices GROUP BY patient_id;` },
      { wrong: `SELECT DISTINCT ON (patient_id) * FROM invoices ORDER BY patient_id;`, why: 'Without a tie-breaker the "first" row per patient is arbitrary and can change between runs.', fix: `SELECT patient_id, invoice_id FROM (SELECT patient_id, invoice_id, ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date DESC, invoice_id DESC) AS rn FROM invoices) WHERE rn = 1;` },
    ],
    rules: ['DISTINCT ON keys must lead the ORDER BY.', 'Portable version of DISTINCT ON: ROW_NUMBER() ... WHERE rn = 1.', 'generate_series fills gaps; SQLite uses a recursive CTE.', 'RETURNING also exists in SQLite 3.35+.'],
    compare: `<table><tr><th>PostgreSQL</th><th>SQLite</th></tr>
<tr><td><code>DISTINCT ON</code></td><td><code>ROW_NUMBER()</code> + <code>WHERE rn = 1</code></td></tr>
<tr><td><code>generate_series</code></td><td><code>WITH RECURSIVE</code></td></tr>
<tr><td><code>ILIKE</code></td><td><code>LIKE</code> (case-insensitive for ASCII)</td></tr>
<tr><td><code>x::int</code></td><td><code>CAST(x AS INTEGER)</code></td></tr>
<tr><td><code>date_trunc('month', d)</code></td><td><code>date(d, 'start of month')</code></td></tr>
<tr><td><code>FILTER</code>, <code>RETURNING</code>, <code>string_agg</code></td><td>Same</td></tr></table>`,
    realWorld: 'Patient-portal pages show "your most recent statement" using DISTINCT ON. Month-end revenue charts use generate_series so months with zero billing still appear as zero, not a missing bar.',
    tips: ['An index on (patient_id, invoice_date DESC) makes DISTINCT ON very fast.', 'In SQLite, string_agg(x, \', \' ORDER BY x) works in 3.44+.'],
    deep: `<p>For "latest per group" with few groups and many rows, a LATERAL join with LIMIT 1 per group can beat DISTINCT ON, because it uses the index to jump to each group's newest row instead of sorting everything.</p>`,
    tryIt: { prompt: 'SQLite generate_series emulation with a recursive CTE: a month calendar LEFT JOINed to invoices. Extend it to start in 2025-01.', starter: `WITH RECURSIVE months(m) AS (\n  SELECT '2026-01-01'\n  UNION ALL\n  SELECT date(m, '+1 month') FROM months WHERE m < '2026-09-01'\n)\nSELECT strftime('%Y-%m', m) AS month,\n       COUNT(i.invoice_id)            AS invoices,\n       IFNULL(SUM(i.total_amount), 0) AS billed\nFROM months\nLEFT JOIN invoices i ON date(i.invoice_date, 'start of month') = m\nGROUP BY m\nORDER BY m;` },
    challenge: {
      level: 3,
      prompt: 'Emulate DISTINCT ON: for every patient who has invoices, return patient_id, invoice_id, invoice_date and status of their most recent invoice (latest invoice_date; if tied, the higher invoice_id). Sort by patient_id.',
      solution: `SELECT patient_id, invoice_id, invoice_date, status
FROM (
  SELECT patient_id, invoice_id, invoice_date, status,
         ROW_NUMBER() OVER (PARTITION BY patient_id
                            ORDER BY invoice_date DESC, invoice_id DESC) AS rn
  FROM invoices
)
WHERE rn = 1
ORDER BY patient_id;`,
      hints: ['You need one row per patient: think window functions.', 'ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY ...) numbers each patient\'s invoices.', 'Order newest first with a tie-breaker: invoice_date DESC, invoice_id DESC.', 'Wrap it in a subquery and keep WHERE rn = 1.'],
      ordered: true,
    },
    quiz: [
      { q: 'What must ORDER BY start with when using DISTINCT ON (patient_id)?', options: ['Anything', 'patient_id', 'The primary key', 'A date'], answer: 1, why: 'The DISTINCT ON expressions must be the leftmost ORDER BY items.' },
      { q: 'How do you emulate generate_series in SQLite?', options: ['You cannot', 'A recursive CTE', 'GROUP_CONCAT', 'PRAGMA series'], answer: 1, why: 'A recursive CTE generates a sequence of rows.' },
      { q: 'Which of these does SQLite also support?', options: ['DISTINCT ON', 'RETURNING', 'ILIKE', ':: casts'], answer: 1, why: 'SQLite added RETURNING in version 3.35.' },
    ],
  },
  // ─────────────────────────── SQL Server ───────────────────────────
  {
    id: 'dialects-14',
    goals: ['What T-SQL adds to SQL: variables, batches, control flow', 'DECLARE / SET / SELECT @var', 'IF, WHILE, TRY...CATCH, and GO', 'T-SQL functions: GETDATE, ISNULL, + for strings, square brackets'],
    concept: `<p><b>T-SQL</b> (Transact-SQL) is Microsoft SQL Server's language. It is standard SQL plus a small programming language:</p>
<ul>
<li><b>Variables</b> start with <code>@</code>: <code>DECLARE @cutoff date = '2026-09-01';</code></li>
<li><b>Assign</b> with <code>SET @x = ...</code> or <code>SELECT @x = COUNT(*) FROM ...</code>.</li>
<li><b>Control flow</b>: <code>IF ... ELSE</code>, <code>WHILE</code>, <code>BEGIN ... END</code> blocks, <code>BEGIN TRY ... END TRY BEGIN CATCH ... END CATCH</code>.</li>
<li><b>Batches</b> are separated by <code>GO</code> (a client command, not SQL).</li>
<li><b>Quoting</b>: <code>[order]</code> or <code>"order"</code>. Strings join with <code>+</code> (or <code>CONCAT</code>).</li>
<li>Functions: <code>GETDATE()</code>, <code>ISNULL(a,b)</code>, <code>IIF</code>, <code>LEN</code>, <code>CHARINDEX</code>, <code>FORMAT</code>, <code>CONVERT</code>.</li>
</ul>
<p>SQLite has no variables or control flow. A common pattern is a small <b>params CTE</b> that holds the values, joined into the query.</p>`,
    why: 'Most SQL Server logic (scripts, jobs, procedures) is written in T-SQL, so you need its basic building blocks to read or write any of it.',
    when: 'Admin scripts, stored procedures, SQL Agent jobs, and any multi-step logic that runs inside SQL Server.',
    analogy: 'Plain SQL is a single order on a requisition slip. T-SQL is a whole worksheet: jot values in boxes (variables), "if the balance is over $500 send to collections, otherwise mail a statement" (IF/ELSE), and a note on what to do if something goes wrong (TRY/CATCH).',
    syntax: `DECLARE @name type = value;\nSET @name = expr;\nIF condition BEGIN ... END ELSE BEGIN ... END\nBEGIN TRY ... END TRY BEGIN CATCH ... END CATCH`,
    dialect: 'sqlserver',
    sql: `DECLARE @as_of   date          = '2026-09-01';
DECLARE @min_amt decimal(10,2) = 500;
DECLARE @overdue int;

SELECT @overdue = COUNT(*)
FROM invoices
WHERE status = 'Overdue' AND total_amount >= @min_amt;

IF @overdue > 0
BEGIN
    PRINT 'Large overdue invoices: ' + CAST(@overdue AS varchar(10));
    SELECT invoice_id, total_amount,
           DATEDIFF(day, due_date, @as_of) AS days_late,
           ISNULL(CAST(payor_id AS varchar(10)), 'self-pay') AS payor
    FROM invoices
    WHERE status = 'Overdue' AND total_amount >= @min_amt;
END
ELSE
    PRINT 'Nothing to escalate.';`,
    breakdown: [
      ['DECLARE @as_of date = ...', 'Local variables with a type and an initial value'],
      ['SELECT @overdue = COUNT(*)', 'Assigns a query result to a variable'],
      ['IF @overdue > 0 BEGIN ... END', 'Branching; BEGIN/END groups several statements'],
      ['PRINT \'...\' + CAST(...)', 'Sends a message; strings concatenate with +'],
      ['DATEDIFF(day, due_date, @as_of)', 'T-SQL order: unit, start, end'],
      ['ISNULL(x, \'self-pay\')', 'T-SQL version of COALESCE with two arguments'],
    ],
    dialectSql: {
      mysql: `SET @min_amt = 500;\nSELECT COUNT(*) FROM invoices WHERE status = 'Overdue' AND total_amount >= @min_amt;`,
      postgres: `DO $$ DECLARE min_amt numeric := 500; n int;\nBEGIN SELECT COUNT(*) INTO n FROM invoices WHERE status='Overdue' AND total_amount >= min_amt;\n  RAISE NOTICE 'overdue: %', n; END $$;`,
      sqlserver: `DECLARE @min_amt decimal(10,2) = 500;\nSELECT COUNT(*) FROM invoices WHERE status = 'Overdue' AND total_amount >= @min_amt;`,
      oracle: `DECLARE v_min NUMBER := 500; v_n NUMBER;\nBEGIN SELECT COUNT(*) INTO v_n FROM invoices WHERE status='Overdue' AND total_amount >= v_min;\n  DBMS_OUTPUT.PUT_LINE(v_n); END;`,
      sqlite: `WITH params AS (SELECT 500 AS min_amt)\nSELECT COUNT(*) FROM invoices, params WHERE status = 'Overdue' AND total_amount >= min_amt;`,
    },
    mistakes: [
      { wrong: `SELECT 'Invoice ' + invoice_id FROM invoices;`, why: 'In T-SQL, + with a number tries to convert the string to a number and fails. Cast first, or use CONCAT (which also treats NULL as empty).', fix: `SELECT 'Invoice ' || invoice_id AS label FROM invoices LIMIT 3;` },
      { wrong: `DECLARE @id int;\nSELECT @id = invoice_id FROM invoices WHERE status = 'Overdue';`, why: 'If several rows match, @id silently gets the value from the last row processed, which is arbitrary. Make the query return exactly one row (TOP 1 with ORDER BY, or an aggregate).', fix: `SELECT MAX(invoice_id) AS id FROM invoices WHERE status = 'Overdue';` },
    ],
    rules: ['Variables start with @ and must be DECLAREd with a type.', 'DATEDIFF(unit, start, end) in T-SQL.', 'GO separates batches; variables do not survive past GO.', 'Wrap multi-statement branches in BEGIN ... END.'],
    compare: `<table><tr><th>Concept</th><th>T-SQL</th><th>SQLite</th></tr>
<tr><td>Variable</td><td><code>DECLARE @x int = 5</code></td><td>params CTE / bound parameters (?)</td></tr>
<tr><td>Today</td><td><code>GETDATE()</code></td><td><code>date('now')</code></td></tr>
<tr><td>Null fallback</td><td><code>ISNULL(a,b)</code></td><td><code>IFNULL(a,b)</code></td></tr>
<tr><td>String concat</td><td><code>a + b</code></td><td><code>a || b</code></td></tr>
<tr><td>Inline if</td><td><code>IIF(c,a,b)</code></td><td><code>iif(c,a,b)</code></td></tr></table>`,
    realWorld: 'Hospital finance teams run nightly SQL Agent jobs in T-SQL that set a cutoff date variable, compute aging, and email a summary when overdue balances cross a threshold.',
    tips: ['SET NOCOUNT ON at the top of scripts avoids "(n rows affected)" noise.', 'THROW re-raises an error inside CATCH.'],
    deep: `<p>Table variables (<code>DECLARE @t TABLE (...)</code>) and temp tables (<code>#t</code>) both live in tempdb. Temp tables get statistics and can be indexed freely; table variables historically estimated 1 row, which caused poor plans (improved by deferred compilation in SQL Server 2019).</p>`,
    tryIt: { prompt: 'The SQLite "variables" pattern: a params CTE. Change min_amt to 300 and the status to \'Open\'.', starter: `WITH params AS (\n  SELECT '2026-09-01' AS as_of, 500 AS min_amt, 'Overdue' AS wanted_status\n)\nSELECT i.invoice_id, i.total_amount,\n       CAST(julianday(p.as_of) - julianday(i.due_date) AS INTEGER) AS days_late,\n       IFNULL(CAST(i.payor_id AS TEXT), 'self-pay') AS payor\nFROM invoices i, params p\nWHERE i.status = p.wanted_status\n  AND i.total_amount >= p.min_amt\nORDER BY days_late DESC;` },
    challenge: {
      level: 2,
      prompt: 'Using a params CTE (as_of = \'2026-09-01\', min_amt = 300), return one row with the number of Overdue invoices with total_amount >= min_amt and their summed total. This mirrors SELECT @n = COUNT(*), @sum = SUM(...) in T-SQL.',
      solution: `WITH params AS (SELECT '2026-09-01' AS as_of, 300 AS min_amt)
SELECT COUNT(*) AS overdue_count, SUM(i.total_amount) AS overdue_total
FROM invoices i, params p
WHERE i.status = 'Overdue'
  AND i.total_amount >= p.min_amt;`,
      hints: ['Start with WITH params AS (SELECT ... AS min_amt).', 'Cross join the params CTE: FROM invoices i, params p.', 'Filter on status and total_amount >= p.min_amt.', 'SELECT COUNT(*), SUM(i.total_amount) ...'],
    },
    quiz: [
      { q: 'How do you declare a variable in T-SQL?', options: ['VAR x = 5', 'DECLARE @x int = 5', 'SET x := 5', 'LET @x = 5'], answer: 1, why: 'T-SQL variables start with @ and are declared with a type.' },
      { q: 'What is GO in a T-SQL script?', options: ['A keyword that commits', 'A batch separator understood by client tools', 'A loop', 'A jump statement'], answer: 1, why: 'GO is not T-SQL; SSMS and sqlcmd use it to split the script into batches.' },
    ],
  },
  {
    id: 'dialects-15',
    goals: ['Limit rows with TOP n in SQL Server', 'TOP n PERCENT and TOP n WITH TIES', 'Why TOP needs ORDER BY', 'LIMIT and RANK() equivalents in SQLite'],
    concept: `<p>SQL Server limits rows with <code>TOP</code>, written right after SELECT:</p>
<ul>
<li><code>SELECT TOP 5 ...</code>: at most five rows.</li>
<li><code>SELECT TOP 10 PERCENT ...</code>: a percentage of the result.</li>
<li><code>SELECT TOP 3 WITH TIES ... ORDER BY total_amount DESC</code>: three rows, plus any more rows tied with the third.</li>
<li><code>TOP</code> also works in UPDATE and DELETE: <code>DELETE TOP (1000) FROM ...</code> for batching.</li>
</ul>
<p>Without ORDER BY, TOP returns <b>any</b> n rows, not the "first" ones. Other databases use <code>LIMIT n</code> (MySQL, PostgreSQL, SQLite) or <code>FETCH FIRST n ROWS ONLY</code> (standard, Oracle, SQL Server with OFFSET).</p>`,
    why: 'Top-N lists are everywhere: largest invoices, busiest practitioners, most-used CPT codes.',
    when: 'Dashboards and exception lists (top 10 overdue balances), sampling, and batching large deletes.',
    analogy: 'TOP 5 is the billing manager saying "bring me the five biggest outstanding claims". WITH TIES is "and if the sixth is the same amount as the fifth, bring that one too, it is only fair".',
    syntax: `SELECT TOP (n) [PERCENT] [WITH TIES] cols\nFROM t\nORDER BY col DESC;`,
    dialect: 'sqlserver',
    sql: `SELECT TOP 5 invoice_id, patient_id, total_amount
FROM invoices
ORDER BY total_amount DESC;

SELECT TOP 3 WITH TIES practitioner_id, COUNT(*) AS charges
FROM charges
GROUP BY practitioner_id
ORDER BY COUNT(*) DESC;`,
    breakdown: [
      ['SELECT TOP 5', 'Stop after five rows'],
      ['ORDER BY total_amount DESC', 'Defines which five: the largest'],
      ['TOP 3 WITH TIES', 'Three rows plus every row tied with the third on the ORDER BY value'],
    ],
    dialectSql: {
      mysql: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC LIMIT 5;`,
      postgres: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC LIMIT 5;\n-- ties: FETCH FIRST 5 ROWS WITH TIES`,
      sqlserver: `SELECT TOP 5 invoice_id, total_amount FROM invoices ORDER BY total_amount DESC;`,
      oracle: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC\nFETCH FIRST 5 ROWS ONLY;   -- or WITH TIES`,
      sqlite: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC LIMIT 5;`,
    },
    mistakes: [
      { wrong: `SELECT TOP 5 invoice_id, total_amount FROM invoices;`, why: 'No ORDER BY: SQL Server returns whichever five rows it reads first. The result can change after an index change or restart.', fix: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC, invoice_id LIMIT 5;` },
      { wrong: `SELECT invoice_id FROM invoices ORDER BY total_amount DESC LIMIT 5;  -- on SQL Server`, why: 'SQL Server has no LIMIT. Use TOP, or OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY.', fix: `SELECT invoice_id FROM invoices ORDER BY total_amount DESC LIMIT 5;` },
    ],
    rules: ['TOP without ORDER BY is a random sample, not a top list.', 'WITH TIES requires ORDER BY and can return more than n rows.', 'Add a unique tie-breaker (like the id) for stable results.', 'SQLite: LIMIT n; ties via RANK() <= n.'],
    compare: `<table><tr><th>Database</th><th>First 5</th><th>With ties</th></tr>
<tr><td>SQL Server</td><td><code>TOP 5</code></td><td><code>TOP 5 WITH TIES</code></td></tr>
<tr><td>PostgreSQL</td><td><code>LIMIT 5</code></td><td><code>FETCH FIRST 5 ROWS WITH TIES</code></td></tr>
<tr><td>Oracle</td><td><code>FETCH FIRST 5 ROWS ONLY</code></td><td><code>FETCH FIRST 5 ROWS WITH TIES</code></td></tr>
<tr><td>MySQL / SQLite</td><td><code>LIMIT 5</code></td><td><code>RANK() ... WHERE rnk &lt;= 5</code></td></tr></table>`,
    realWorld: 'Collections teams work "top 25 overdue balances" lists each morning. DBAs purge old audit rows with DELETE TOP (5000) in a loop to keep transactions small.',
    tips: ['Write TOP (n) with parentheses; it is required for variables: TOP (@n).', 'TOP n PERCENT rounds up.'],
    deep: `<p>With TOP and ORDER BY, SQL Server can use a <b>Top N Sort</b> operator that keeps only n rows in memory instead of sorting the whole input, or read an index in order and stop early (a row goal).</p>`,
    tryIt: { prompt: 'SQLite uses LIMIT. Show the 5 largest invoices, then change it to the 5 smallest non-void invoices.', starter: `SELECT invoice_id, patient_id, total_amount\nFROM invoices\nORDER BY total_amount DESC, invoice_id\nLIMIT 5;` },
    challenge: {
      level: 3,
      prompt: 'Emulate SELECT TOP 3 WITH TIES: find the CPT codes with the 3 highest usage counts in charges, including any codes tied with the third. Return cpt_code and usage count, sorted by count descending then cpt_code.',
      solution: `SELECT cpt_code, uses
FROM (
  SELECT cpt_code, COUNT(*) AS uses,
         RANK() OVER (ORDER BY COUNT(*) DESC) AS rnk
  FROM charges
  GROUP BY cpt_code
)
WHERE rnk <= 3
ORDER BY uses DESC, cpt_code;`,
      hints: ['First count charges per cpt_code with GROUP BY.', 'LIMIT 3 would cut off ties; you need a ranking.', 'RANK() OVER (ORDER BY COUNT(*) DESC) gives tied codes the same rank.', 'Wrap it in a subquery and keep WHERE rnk <= 3.'],
      ordered: true,
    },
    quiz: [
      { q: 'What does TOP 3 WITH TIES return if rows 3, 4 and 5 have the same value?', options: ['3 rows', '5 rows', '4 rows', 'An error'], answer: 1, why: 'All rows tied with the third are included.' },
      { q: 'What is the SQLite equivalent of TOP 10?', options: ['FIRST 10', 'LIMIT 10', 'ROWNUM <= 10', 'TOP 10'], answer: 1, why: 'SQLite uses LIMIT.' },
    ],
  },
  {
    id: 'dialects-16',
    goals: ['What APPLY does: run a table expression once per outer row', 'CROSS APPLY (inner) vs OUTER APPLY (left)', 'Top-N per group and calling table-valued functions', 'LATERAL in PostgreSQL and emulations in SQLite'],
    concept: `<p>A normal JOIN combines two independent tables. <b>APPLY</b> lets the right side <b>depend on the current left row</b>, like a correlated subquery that may return many rows and many columns.</p>
<ul>
<li><code>CROSS APPLY</code>: for each patient, run the inner query; if it returns nothing, drop the patient (like INNER JOIN).</li>
<li><code>OUTER APPLY</code>: keep the patient with NULLs when the inner query returns nothing (like LEFT JOIN).</li>
</ul>
<p>The classic use is <b>top-N per group</b>: "for each patient, their 2 most recent invoices" with <code>TOP 2 ... ORDER BY invoice_date DESC</code> inside the APPLY. It is also how you call a table-valued function per row, or split strings with <code>STRING_SPLIT</code>.</p>
<p>PostgreSQL and MySQL 8 call this <code>LATERAL</code>; Oracle supports both. SQLite has neither, so use window functions (ROW_NUMBER) or correlated subqueries.</p>`,
    why: 'Some questions are naturally "for each row, go find these related rows". APPLY expresses that directly and can use indexes very efficiently.',
    when: 'Latest N items per parent, calling table-valued functions per row, unpacking JSON or delimited strings per row.',
    analogy: 'CROSS APPLY is a clerk going through the patient list and, for each patient, pulling their two most recent statements from the file. Patients with no statements are skipped. OUTER APPLY writes the patient on the list anyway with "no statements".',
    syntax: `SELECT ...\nFROM outer_table o\nCROSS APPLY (SELECT TOP n ... WHERE x = o.key ORDER BY ...) a;\n-- OUTER APPLY keeps outer rows with no match`,
    dialect: 'sqlserver',
    sql: `-- Each patient's most recent invoice (patients without invoices kept)
SELECT p.patient_id, p.last_name, li.invoice_id, li.invoice_date, li.total_amount
FROM patients p
OUTER APPLY (
    SELECT TOP 1 i.invoice_id, i.invoice_date, i.total_amount
    FROM invoices i
    WHERE i.patient_id = p.patient_id
    ORDER BY i.invoice_date DESC, i.invoice_id DESC
) AS li;

-- Split a delimited allergy list into rows
SELECT p.patient_id, TRIM(s.value) AS allergy
FROM patients p
CROSS APPLY STRING_SPLIT(p.allergies, ',') AS s;`,
    breakdown: [
      ['FROM patients p', 'The outer rows'],
      ['OUTER APPLY ( ... )', 'Run the inner query for each patient; keep patients even with no result'],
      ['WHERE i.patient_id = p.patient_id', 'The inner query refers to the outer row: that is what APPLY allows'],
      ['SELECT TOP 1 ... ORDER BY ... DESC', 'The most recent invoice for this patient'],
      ['CROSS APPLY STRING_SPLIT(...)', 'Calls a table-valued function per row'],
    ],
    dialectSql: {
      mysql: `SELECT p.patient_id, li.invoice_id FROM patients p\nLEFT JOIN LATERAL (SELECT invoice_id FROM invoices i WHERE i.patient_id = p.patient_id\n                   ORDER BY invoice_date DESC LIMIT 1) li ON TRUE;`,
      postgres: `SELECT p.patient_id, li.invoice_id FROM patients p\nLEFT JOIN LATERAL (SELECT invoice_id FROM invoices i WHERE i.patient_id = p.patient_id\n                   ORDER BY invoice_date DESC LIMIT 1) li ON true;`,
      sqlserver: `SELECT p.patient_id, li.invoice_id FROM patients p\nOUTER APPLY (SELECT TOP 1 invoice_id FROM invoices i WHERE i.patient_id = p.patient_id\n             ORDER BY invoice_date DESC) li;`,
      oracle: `SELECT p.patient_id, li.invoice_id FROM patients p\nOUTER APPLY (SELECT invoice_id FROM invoices i WHERE i.patient_id = p.patient_id\n             ORDER BY invoice_date DESC FETCH FIRST 1 ROW ONLY) li;`,
      sqlite: `SELECT p.patient_id,\n       (SELECT invoice_id FROM invoices i WHERE i.patient_id = p.patient_id\n        ORDER BY invoice_date DESC LIMIT 1) AS invoice_id\nFROM patients p;`,
    },
    mistakes: [
      { wrong: `SELECT p.patient_id, li.invoice_id FROM patients p\nCROSS APPLY (SELECT TOP 1 invoice_id FROM invoices i WHERE i.patient_id = p.patient_id ORDER BY invoice_date DESC) li;`, why: 'CROSS APPLY drops patients with no invoices (9, 17, 22). If the report must list every patient, use OUTER APPLY.', fix: `SELECT p.patient_id, (SELECT invoice_id FROM invoices i WHERE i.patient_id = p.patient_id ORDER BY invoice_date DESC LIMIT 1) AS last_invoice FROM patients p;` },
      { wrong: `SELECT p.*, x.* FROM patients p JOIN (SELECT TOP 1 * FROM invoices WHERE patient_id = p.patient_id) x ON 1=1;`, why: 'A derived table in a normal JOIN cannot see p. That is exactly what APPLY / LATERAL is for.', fix: `SELECT patient_id, MAX(invoice_date) FROM invoices GROUP BY patient_id;` },
    ],
    rules: ['CROSS APPLY ~ inner join per row; OUTER APPLY ~ left join per row.', 'The inner query may reference outer columns.', 'Standard SQL name: LATERAL.', 'SQLite: use ROW_NUMBER() or a correlated scalar subquery.'],
    compare: `<table><tr><th></th><th>JOIN derived table</th><th>APPLY / LATERAL</th><th>Correlated subquery</th></tr>
<tr><td>Can see outer row</td><td>No</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Rows returned per outer row</td><td>n/a</td><td>Many</td><td>One</td></tr>
<tr><td>Columns returned</td><td>Many</td><td>Many</td><td>One</td></tr></table>`,
    realWorld: 'Patient-balance screens show each patient with their last two statements via OUTER APPLY. ETL jobs use CROSS APPLY OPENJSON to explode JSON remittance arrays into rows.',
    tips: ['An index on invoices(patient_id, invoice_date DESC) makes TOP 1 per patient a quick seek.', 'In SQLite, several correlated scalar subqueries can emulate an APPLY that returns several columns.'],
    deep: `<p>The optimizer often rewrites APPLY into a regular join when the inner query is simple, and APPLY with TOP 1 is often implemented as a nested-loops join with an index seek per outer row. That is ideal when there are few outer rows and a good index, and poor when there are millions of outer rows.</p>`,
    tryIt: { prompt: 'The SQLite emulation of OUTER APPLY TOP 2: rank invoices per patient, then LEFT JOIN so patients without invoices stay. Change it to keep only the most recent invoice.', starter: `WITH ranked AS (\n  SELECT i.*, ROW_NUMBER() OVER (PARTITION BY patient_id\n                                 ORDER BY invoice_date DESC, invoice_id DESC) AS rn\n  FROM invoices i\n)\nSELECT p.patient_id, p.last_name, r.invoice_id, r.invoice_date, r.total_amount\nFROM patients p\nLEFT JOIN ranked r ON r.patient_id = p.patient_id AND r.rn <= 2\nORDER BY p.patient_id, r.rn;` },
    challenge: {
      level: 3,
      prompt: 'Emulate OUTER APPLY TOP 1: list EVERY patient (including those with no invoices) with patient_id, last_name, and the invoice_id and total_amount of their largest invoice (ties: lower invoice_id). Patients without invoices show NULLs. Sort by patient_id.',
      solution: `WITH ranked AS (
  SELECT patient_id, invoice_id, total_amount,
         ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY total_amount DESC, invoice_id) AS rn
  FROM invoices
)
SELECT p.patient_id, p.last_name, r.invoice_id, r.total_amount
FROM patients p
LEFT JOIN ranked r ON r.patient_id = p.patient_id AND r.rn = 1
ORDER BY p.patient_id;`,
      hints: ['Rank each patient\'s invoices with ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY total_amount DESC, invoice_id).', 'Put that in a CTE.', 'LEFT JOIN patients to the CTE so patients with no invoices remain.', 'Put rn = 1 in the ON clause, not in WHERE, or the NULL rows disappear.'],
      ordered: true,
    },
    quiz: [
      { q: 'Which APPLY keeps outer rows that have no inner results?', options: ['CROSS APPLY', 'OUTER APPLY', 'INNER APPLY', 'Both'], answer: 1, why: 'OUTER APPLY behaves like a LEFT JOIN.' },
      { q: 'What is the standard SQL / PostgreSQL name for APPLY?', options: ['CORRELATED JOIN', 'LATERAL', 'NESTED JOIN', 'WITH'], answer: 1, why: 'LATERAL lets a subquery in FROM reference earlier FROM items.' },
    ],
  },
  {
    id: 'dialects-17',
    goals: ['Window functions in SQL Server: ROW_NUMBER, RANK, LAG/LEAD, running totals', 'The default frame trap: RANGE vs ROWS', 'Filtering window results (no QUALIFY in SQL Server)', 'SQL Server extras: PERCENTILE_CONT, FIRST_VALUE, STRING_AGG'],
    concept: `<p>SQL Server supports the standard window functions (since 2012 for full framing). The syntax is the same you already know: <code>function() OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN ...)</code>.</p>
<p>Things specific to SQL Server worth knowing:</p>
<ul>
<li><b>Default frame</b>: with ORDER BY and no frame, the frame is <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. RANGE treats ties as one "peer group" and uses a slower on-disk worktable. Write <code>ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code> for running totals.</li>
<li><b>No QUALIFY</b> and no <code>FILTER</code> clause: filter window results in a CTE or subquery; use <code>SUM(CASE ...)</code> for conditional aggregates.</li>
<li><code>PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x) OVER (PARTITION BY ...)</code> computes medians as a window function.</li>
<li>Batch mode on rowstore (2019+) makes window aggregates much faster.</li>
</ul>
<p>SQLite runs the same standard window functions, so you can practise everything here.</p>`,
    why: 'Running balances, rankings and period-over-period comparisons are daily needs in billing, and SQL Server has particular performance and default-frame traps.',
    when: 'Patient running balances, practitioner rankings, month-over-month revenue, and medians of payment turnaround.',
    analogy: 'A window function is the ledger\'s running-balance column: each line still stands on its own, but it also knows about the lines before it in the same account.',
    syntax: `fn() OVER (PARTITION BY p ORDER BY o\n          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`,
    dialect: 'sqlserver',
    sql: `SELECT invoice_id, transaction_date, transaction_type, amount,
       SUM(amount) OVER (PARTITION BY invoice_id
                         ORDER BY transaction_date, transaction_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance,
       LAG(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id) AS prev_amount,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount)
            OVER (PARTITION BY transaction_type) AS median_for_type
FROM transactions
WHERE invoice_id IN (2, 4);`,
    breakdown: [
      ['SUM(amount) OVER (PARTITION BY invoice_id ...)', 'Running total restarts for each invoice'],
      ['ORDER BY transaction_date, transaction_id', 'Order inside the partition, with a unique tie-breaker'],
      ['ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'Explicit ROWS frame: fast and tie-safe (the default would be RANGE)'],
      ['LAG(amount)', 'The previous line\'s amount in the same invoice'],
      ['PERCENTILE_CONT(0.5) WITHIN GROUP (...) OVER (...)', 'SQL Server windowed median'],
    ],
    visual: { type: 'window', source: `SELECT transaction_id, invoice_id, transaction_date, transaction_type, amount FROM transactions WHERE invoice_id IN (2, 4) ORDER BY invoice_id, transaction_date, transaction_id`, partition: 'invoice_id', order: 'transaction_date', value: 'amount', fn: 'RUNNING_SUM' },
    dialectSql: {
      mysql: `SELECT invoice_id, SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id\n  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM transactions;`,
      postgres: `SELECT invoice_id, SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id\n  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM transactions;`,
      sqlserver: `SELECT invoice_id, SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id\n  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM transactions;`,
      oracle: `SELECT invoice_id, SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id\n  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM transactions;`,
      sqlite: `SELECT invoice_id, SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id\n  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM transactions;`,
    },
    mistakes: [
      { wrong: `SELECT invoice_id, SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date) AS bal FROM transactions;`, why: 'The default RANGE frame adds all rows with the same date at once, so two same-day entries show the same balance. In SQL Server RANGE is also slower. Use ROWS and a unique tie-breaker.', fix: `SELECT invoice_id, transaction_date, amount, SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS bal FROM transactions WHERE invoice_id = 2;` },
      { wrong: `SELECT invoice_id, ROW_NUMBER() OVER (ORDER BY total_amount DESC) AS rn FROM invoices WHERE rn <= 5;`, why: 'WHERE runs before window functions, so rn does not exist yet. SQL Server has no QUALIFY: filter in an outer query.', fix: `SELECT * FROM (SELECT invoice_id, ROW_NUMBER() OVER (ORDER BY total_amount DESC) AS rn FROM invoices) WHERE rn <= 5;` },
    ],
    rules: ['Always write ROWS BETWEEN ... for running totals in SQL Server.', 'Add a unique tie-breaker to window ORDER BY.', 'Filter window results in a CTE/subquery (no QUALIFY).', 'Windows keep every row; GROUP BY collapses them.'],
    compare: `<table><tr><th>Feature</th><th>SQL Server</th><th>PostgreSQL</th><th>SQLite</th></tr>
<tr><td>QUALIFY</td><td>No</td><td>No</td><td>No</td></tr>
<tr><td>FILTER (WHERE)</td><td>No</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Windowed median</td><td><code>PERCENTILE_CONT ... OVER</code></td><td>Only as aggregate</td><td>No</td></tr>
<tr><td>GROUPS frame</td><td>No</td><td>Yes</td><td>Yes</td></tr></table>`,
    realWorld: 'Patient ledgers in SQL Server-based EHR billing modules compute running balances with SUM() OVER (ROWS ...); finance ranks locations by monthly collections with RANK().',
    tips: ['Check the execution plan for "Window Spool": an on-disk spool usually means a RANGE frame.', 'LAG(x, 1, 0) supplies a default instead of NULL for the first row.'],
    deep: `<p>With ROWS frames SQL Server can use an in-memory window spool; RANGE (the default) forces an on-disk worktable. On large ledgers, simply adding <code>ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code> can make a query many times faster, without changing results when the ORDER BY is unique.</p>`,
    tryIt: { prompt: 'Runs in SQLite. Compare the ROWS running balance with the default (RANGE) by adding a column that omits the frame and orders only by transaction_date.', starter: `SELECT invoice_id, transaction_id, transaction_date, transaction_type, amount,\n       SUM(amount) OVER (PARTITION BY invoice_id\n                         ORDER BY transaction_date, transaction_id\n                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance\nFROM transactions\nWHERE invoice_id IN (2, 4, 20)\nORDER BY invoice_id, transaction_date, transaction_id;` },
    challenge: {
      level: 3,
      prompt: 'For each practitioner, rank their charges by amount (highest first; ties broken by charge_id) and keep only their top 2. Show practitioner_id, charge_id, amount and the rank. Sort by practitioner_id, then rank. (No QUALIFY: filter in an outer query.)',
      solution: `SELECT practitioner_id, charge_id, amount, rn
FROM (
  SELECT practitioner_id, charge_id, amount,
         ROW_NUMBER() OVER (PARTITION BY practitioner_id ORDER BY amount DESC, charge_id) AS rn
  FROM charges
)
WHERE rn <= 2
ORDER BY practitioner_id, rn;`,
      hints: ['Partition by practitioner_id.', 'ROW_NUMBER() OVER (PARTITION BY practitioner_id ORDER BY amount DESC, charge_id).', 'You cannot use the window result in WHERE of the same query.', 'Wrap it in a subquery and filter WHERE rn <= 2.'],
      ordered: true,
    },
    quiz: [
      { q: 'What frame does SQL Server use for SUM() OVER (ORDER BY x) with no frame clause?', options: ['ROWS UNBOUNDED PRECEDING', 'RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'The whole partition', 'Only the current row'], answer: 1, why: 'The standard default with ORDER BY is RANGE ... CURRENT ROW.' },
      { q: 'How do you keep only rows with ROW_NUMBER() = 1 in SQL Server?', options: ['QUALIFY rn = 1', 'WHERE in the same SELECT', 'Filter in an outer query or CTE', 'HAVING rn = 1'], answer: 2, why: 'Window functions are computed after WHERE; SQL Server has no QUALIFY.' },
    ],
  },
  {
    id: 'dialects-18',
    goals: ['Paginate with ORDER BY ... OFFSET n ROWS FETCH NEXT m ROWS ONLY', 'Compute the offset from a page number', 'Why deep OFFSET pages are slow', 'Keyset (seek) pagination as the fast alternative'],
    concept: `<p>Apps show results a page at a time. SQL Server (2012+) uses the standard syntax:</p>
<pre>ORDER BY invoice_date DESC, invoice_id DESC
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;</pre>
<p>That means: sort, skip 20 rows, return the next 10 (page 3 with 10 per page). The formula is <code>OFFSET (page - 1) * page_size</code>.</p>
<ul>
<li>ORDER BY is <b>required</b> for OFFSET/FETCH in SQL Server.</li>
<li>The order must be <b>unique</b> (add the id) or rows can repeat or vanish between pages.</li>
<li>The database still reads and throws away all skipped rows, so page 5,000 is slow.</li>
</ul>
<p><b>Keyset pagination</b> remembers the last row shown and asks for rows "after" it: <code>WHERE (invoice_date, invoice_id) &lt; (@last_date, @last_id)</code>. It uses an index and stays fast on any page.</p>`,
    why: 'Every list screen (invoices, patients, work queues) needs paging, and doing it wrong causes duplicate rows, missing rows, and slow deep pages.',
    when: 'Paging UI lists, exporting in chunks, APIs with page/limit parameters.',
    analogy: 'OFFSET is like finding page 300 of a printed claim report by counting sheets from the top every time. Keyset is keeping a bookmark on the last claim you read and opening straight to it.',
    syntax: `ORDER BY col [, id]\nOFFSET (@page - 1) * @size ROWS\nFETCH NEXT @size ROWS ONLY;`,
    dialect: 'sqlserver',
    sql: `DECLARE @page int = 3, @size int = 10;

SELECT invoice_id, invoice_date, status, total_amount
FROM invoices
ORDER BY invoice_date DESC, invoice_id DESC
OFFSET (@page - 1) * @size ROWS
FETCH NEXT @size ROWS ONLY;

-- Keyset: next page after the last row seen (2025-11-03, id 31)
SELECT TOP (10) invoice_id, invoice_date, status, total_amount
FROM invoices
WHERE invoice_date < '2025-11-03'
   OR (invoice_date = '2025-11-03' AND invoice_id < 31)
ORDER BY invoice_date DESC, invoice_id DESC;`,
    breakdown: [
      ['ORDER BY invoice_date DESC, invoice_id DESC', 'Unique, stable order: required and tie-safe'],
      ['OFFSET (@page - 1) * @size ROWS', 'Skip the earlier pages'],
      ['FETCH NEXT @size ROWS ONLY', 'Return one page'],
      ['WHERE invoice_date < ... OR (= ... AND invoice_id < ...)', 'Keyset: only rows after the bookmark; an index seek, no skipping'],
    ],
    dialectSql: {
      mysql: `SELECT invoice_id FROM invoices ORDER BY invoice_date DESC, invoice_id DESC\nLIMIT 10 OFFSET 20;`,
      postgres: `SELECT invoice_id FROM invoices ORDER BY invoice_date DESC, invoice_id DESC\nOFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;   -- or LIMIT 10 OFFSET 20`,
      sqlserver: `SELECT invoice_id FROM invoices ORDER BY invoice_date DESC, invoice_id DESC\nOFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;`,
      oracle: `SELECT invoice_id FROM invoices ORDER BY invoice_date DESC, invoice_id DESC\nOFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;`,
      sqlite: `SELECT invoice_id FROM invoices ORDER BY invoice_date DESC, invoice_id DESC\nLIMIT 10 OFFSET 20;`,
    },
    mistakes: [
      { wrong: `SELECT invoice_id FROM invoices ORDER BY status OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY;`, why: 'status is not unique: rows with the same status can be returned in a different order on each page request, so some rows show twice and others never.', fix: `SELECT invoice_id, status FROM invoices ORDER BY status, invoice_id LIMIT 10 OFFSET 10;` },
      { wrong: `SELECT invoice_id FROM invoices OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY;`, why: 'SQL Server requires ORDER BY with OFFSET/FETCH (syntax error), and pages without an order are meaningless anyway.', fix: `SELECT invoice_id FROM invoices ORDER BY invoice_id LIMIT 10 OFFSET 10;` },
    ],
    rules: ['OFFSET = (page - 1) * page_size.', 'Always ORDER BY a unique combination.', 'Deep OFFSET pages read and discard all earlier rows.', 'Use keyset pagination for infinite scroll and big exports.'],
    compare: `<table><tr><th></th><th>OFFSET / FETCH</th><th>Keyset</th></tr>
<tr><td>Jump to page N</td><td>Yes</td><td>No (next/previous only)</td></tr>
<tr><td>Cost of deep pages</td><td>Grows with offset</td><td>Constant</td></tr>
<tr><td>Stable when rows are inserted</td><td>No (rows shift)</td><td>Yes</td></tr>
<tr><td>Needs index on sort columns</td><td>Helps</td><td>Essential</td></tr></table>`,
    realWorld: 'Work-queue screens for billing staff show 50 claims per page with OFFSET/FETCH; the nightly export to the data warehouse uses keyset pagination by transaction_id to move millions of rows in constant-time chunks.',
    tips: ['Also return the total count once (COUNT(*) OVER () or a separate query) to draw page numbers.', 'SQLite: LIMIT size OFFSET (page - 1) * size.'],
    deep: `<p>Row-value comparison <code>(invoice_date, invoice_id) &lt; ('2025-11-03', 31)</code> is supported in PostgreSQL, MySQL and SQLite (3.15+), but not in SQL Server, which needs the expanded OR form shown above.</p>`,
    tryIt: { prompt: 'SQLite pagination with LIMIT/OFFSET. Show page 2 with 5 per page, then rewrite as keyset using a row value: WHERE (invoice_date, invoice_id) < (\'...\', ...).', starter: `SELECT invoice_id, invoice_date, status, total_amount\nFROM invoices\nORDER BY invoice_date DESC, invoice_id DESC\nLIMIT 10 OFFSET 20;` },
    challenge: {
      level: 2,
      prompt: 'Return page 3 of Paid invoices with 5 rows per page, ordered by total_amount descending then invoice_id ascending. Show invoice_id, invoice_date and total_amount.',
      solution: `SELECT invoice_id, invoice_date, total_amount
FROM invoices
WHERE status = 'Paid'
ORDER BY total_amount DESC, invoice_id
LIMIT 5 OFFSET 10;`,
      hints: ['Filter status = \'Paid\'.', 'Order by total_amount DESC with invoice_id as tie-breaker.', 'Page 3 with 5 per page skips (3 - 1) * 5 rows.', 'LIMIT 5 OFFSET 10'],
      ordered: true,
    },
    quiz: [
      { q: 'With 25 rows per page, what OFFSET gives page 4?', options: ['100', '75', '4', '25'], answer: 1, why: '(4 - 1) * 25 = 75.' },
      { q: 'Why is keyset pagination faster on deep pages?', options: ['It caches pages', 'It seeks directly past the last seen key using an index', 'It skips sorting', 'It uses TOP'], answer: 1, why: 'It does not read and discard earlier rows.' },
    ],
  },
  {
    id: 'dialects-19',
    goals: ['Create a T-SQL stored procedure with input and OUTPUT parameters', 'Execute it with EXEC and named parameters', 'Transactions and TRY...CATCH inside procedures', 'How SQLite apps replace procedures'],
    concept: `<p>A <b>stored procedure</b> is a named, saved batch of T-SQL that runs on the server. You call it with <code>EXEC</code>.</p>
<ul>
<li><b>Parameters</b>: <code>@invoice_id int</code>, optional defaults (<code>@as_of date = NULL</code>), and <code>OUTPUT</code> parameters that return values to the caller.</li>
<li>Procedures can return <b>result sets</b> (any SELECT), a <b>return code</b> (<code>RETURN 0</code>), and OUTPUT values.</li>
<li>They usually wrap work in <code>BEGIN TRAN ... COMMIT</code> with <code>TRY...CATCH</code> and <code>ROLLBACK</code> on error.</li>
<li>Execution plans are cached and reused; permissions can be granted on the procedure without granting table access.</li>
</ul>
<p>SQLite has no stored procedures: the application runs the statements itself, often inside a transaction, with bound parameters.</p>`,
    why: 'Procedures centralize business rules (like "post a payment"), reduce network round trips, and tighten security.',
    when: 'Multi-step operations that must be atomic (post payment + ledger entry + status update), APIs for other teams, scheduled jobs.',
    analogy: 'A stored procedure is the office\'s written "payment posting procedure": any clerk (app) can call it by name with the check details, and it always performs the same steps in the same order, or none at all.',
    syntax: `CREATE OR ALTER PROCEDURE schema.name\n  @p1 type, @p2 type = default, @out type OUTPUT\nAS\nBEGIN\n  SET NOCOUNT ON;\n  ...\nEND;\nEXEC schema.name @p1 = ..., @out = @var OUTPUT;`,
    dialect: 'sqlserver',
    sql: `CREATE OR ALTER PROCEDURE billing.post_payment
    @invoice_id int,
    @payor_id   int = NULL,
    @amount     decimal(10,2),
    @method     varchar(20),
    @new_balance decimal(10,2) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRAN;
        INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)
        VALUES (@invoice_id, @payor_id, CAST(GETDATE() AS date), @amount, @method);

        INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, reference_id, posted_by)
        VALUES (@invoice_id, CAST(GETDATE() AS date), 'PAYMENT', -@amount, SCOPE_IDENTITY(), SUSER_SNAME());

        SELECT @new_balance = SUM(amount) FROM transactions WHERE invoice_id = @invoice_id;

        UPDATE invoices
        SET status = CASE WHEN @new_balance <= 0 THEN 'Paid' ELSE 'Partially Paid' END
        WHERE invoice_id = @invoice_id;
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END;

DECLARE @bal decimal(10,2);
EXEC billing.post_payment @invoice_id = 3, @amount = 60, @method = 'EFT', @new_balance = @bal OUTPUT;
SELECT @bal AS balance_after;`,
    breakdown: [
      ['CREATE OR ALTER PROCEDURE billing.post_payment', 'Creates or replaces the procedure (SQL Server 2016 SP1+)'],
      ['@payor_id int = NULL', 'Optional parameter with a default (NULL = patient paid)'],
      ['@new_balance ... OUTPUT', 'Value handed back to the caller'],
      ['BEGIN TRY / BEGIN TRAN ... COMMIT', 'All steps succeed together'],
      ['SCOPE_IDENTITY()', 'The identity value just generated for the payment in this scope'],
      ['BEGIN CATCH ... ROLLBACK; THROW;', 'Undo everything and re-raise the error'],
      ['EXEC ... @new_balance = @bal OUTPUT', 'Call with named parameters; OUTPUT must be repeated at the call'],
    ],
    dialectSql: {
      mysql: `CREATE PROCEDURE post_payment(IN p_invoice INT, IN p_amount DECIMAL(10,2), OUT p_balance DECIMAL(10,2))\nBEGIN ... END;\nCALL post_payment(3, 60, @bal);`,
      postgres: `CREATE PROCEDURE post_payment(p_invoice int, p_amount numeric, INOUT p_balance numeric DEFAULT NULL)\nLANGUAGE plpgsql AS $$ BEGIN ... END $$;\nCALL post_payment(3, 60);`,
      sqlserver: `EXEC billing.post_payment @invoice_id = 3, @amount = 60, @method = 'EFT', @new_balance = @bal OUTPUT;`,
      oracle: `BEGIN billing_pkg.post_payment(p_invoice => 3, p_amount => 60, p_balance => :bal); END;`,
      sqlite: `-- no procedures: the app runs these in one transaction\nBEGIN;\nINSERT INTO payments (...) VALUES (?, ?, ?, ?, ?);\nINSERT INTO transactions (...) VALUES (...);\nCOMMIT;`,
    },
    mistakes: [
      { wrong: `EXEC billing.post_payment 3, NULL, 60, 'EFT', @bal;`, why: 'Without the OUTPUT keyword at the call site, @bal is passed in but never receives the value; it stays NULL.', fix: `SELECT SUM(amount) AS balance FROM transactions WHERE invoice_id = 3;` },
      { wrong: `CREATE PROCEDURE sp_post_payment ...`, why: 'The sp_ prefix makes SQL Server look in the master database first (extra lookup, possible name clash). Use a schema and a normal name.', fix: `SELECT invoice_id, status FROM invoices WHERE invoice_id = 3;` },
    ],
    rules: ['Use SET NOCOUNT ON in procedures.', 'Wrap multi-step changes in a transaction with TRY...CATCH.', 'Mark OUTPUT both in the definition and in the EXEC call.', 'Avoid the sp_ prefix; use schemas.'],
    compare: `<table><tr><th></th><th>Procedure</th><th>Function</th><th>View</th></tr>
<tr><td>Can modify data</td><td>Yes</td><td>No (in SQL Server)</td><td>No (usually)</td></tr>
<tr><td>Usable inside SELECT</td><td>No</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Transactions</td><td>Yes</td><td>No</td><td>No</td></tr>
<tr><td>Returns</td><td>Result sets, OUTPUT, code</td><td>Scalar or table</td><td>Rows</td></tr></table>`,
    realWorld: 'Lockbox and EFT (835) payment posting in SQL Server shops is usually a procedure: insert the payment, write the ledger line, update invoice status, all atomically.',
    tips: ['sp_helptext \'billing.post_payment\' shows the source.', 'Parameter sniffing: a plan compiled for one value may be bad for another; OPTION (RECOMPILE) or OPTIMIZE FOR can help.'],
    deep: `<p>Procedure plans are cached on first execution using the first parameter values ("parameter sniffing"). If the first call posts to a tiny invoice and the next to a huge one, the cached plan may be poor. Query Store (2016+) lets you see and force good plans.</p>`,
    tryIt: { prompt: 'SQLite has no procedures, so the app runs the steps. Run this "post a $60 payment on invoice 3" script and see the ledger balance. Then try posting only $20.', starter: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)\nVALUES (3, NULL, '2026-09-01', 60, 'EFT');\n\nINSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, reference_id, posted_by)\nVALUES (3, '2026-09-01', 'PAYMENT', -60, last_insert_rowid(), 'demo');\n\nSELECT invoice_id, SUM(amount) AS balance\nFROM transactions\nWHERE invoice_id = 3\nGROUP BY invoice_id;` },
    challenge: {
      level: 2,
      prompt: 'Write the read-only query a "get_invoice_balance" procedure would run for EVERY invoice that is Partially Paid: invoice_id, total_amount, total paid (from payments, 0 if none) and balance (total minus paid). Sort by balance descending, then invoice_id.',
      solution: `SELECT i.invoice_id, i.total_amount,
       IFNULL(SUM(p.amount), 0) AS paid,
       i.total_amount - IFNULL(SUM(p.amount), 0) AS balance
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.invoice_id
WHERE i.status = 'Partially Paid'
GROUP BY i.invoice_id, i.total_amount
ORDER BY balance DESC, i.invoice_id;`,
      hints: ['Start from invoices filtered to status = \'Partially Paid\'.', 'LEFT JOIN payments so invoices without payments still appear.', 'IFNULL(SUM(p.amount), 0) handles no payments.', 'GROUP BY i.invoice_id, i.total_amount ORDER BY balance DESC, i.invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'How does a T-SQL procedure hand a value back through a parameter?', options: ['RETURNS', 'An OUTPUT parameter', 'PRINT', 'A global variable'], answer: 1, why: 'OUTPUT parameters return values; RETURN only returns an integer status code.' },
      { q: 'What should a CATCH block do in a procedure that opened a transaction?', options: ['COMMIT', 'Nothing', 'ROLLBACK if @@TRANCOUNT > 0, then THROW', 'Retry forever'], answer: 2, why: 'Undo partial work and re-raise so the caller knows it failed.' },
    ],
  },
  // ───────────────────────────── Oracle ─────────────────────────────
  {
    id: 'dialects-20',
    goals: ['Oracle SQL habits: DUAL, NVL, DECODE, || and TO_CHAR/TO_DATE', 'ROWNUM vs FETCH FIRST', 'Sequences and identity columns', 'The empty-string-is-NULL rule'],
    concept: `<p>Oracle Database is widely used in large hospital systems. Its SQL is standard at the core, with some famous differences:</p>
<ul>
<li><b>DUAL</b>: every SELECT needs a FROM, so <code>SELECT SYSDATE FROM dual</code> uses a one-row dummy table (Oracle 23ai finally allows SELECT without FROM).</li>
<li><code>NVL(a, b)</code> replaces NULLs; <code>NVL2(x, if_not_null, if_null)</code>; <code>DECODE(col, 'A', 1, 'B', 2, 0)</code> is an old compact CASE.</li>
<li><code>||</code> concatenates. <code>TO_CHAR(date, 'YYYY-MM')</code> formats; <code>TO_DATE('2026-09-01','YYYY-MM-DD')</code> parses.</li>
<li><b>ROWNUM</b> numbers rows <i>as they are fetched</i>, before ORDER BY. Since 12c, use <code>FETCH FIRST n ROWS ONLY</code>.</li>
<li><b>Sequences</b> (<code>invoice_seq.NEXTVAL</code>) or <code>GENERATED AS IDENTITY</code> generate ids.</li>
<li>Oracle's <b>DATE</b> includes a time part. And <b>'' is NULL</b>: an empty string is treated as NULL.</li>
</ul>`,
    why: 'Oracle code in the wild uses these idioms constantly; misunderstanding ROWNUM or empty-string NULLs creates subtle bugs.',
    when: 'Reading or writing SQL for Oracle-based EHR, ERP, or claims systems, and migrating to or from Oracle.',
    analogy: 'DUAL is the blank "scratch" form the clerk keeps on the desk: when you need to compute something that does not come from any real record, you still write it on a form because the office rules say every answer must be on a form.',
    syntax: `SELECT expr FROM dual;\nNVL(a, b)   DECODE(x, v1, r1, v2, r2, default)\nTO_CHAR(d, 'YYYY-MM')   TO_DATE(s, 'YYYY-MM-DD')\n... FETCH FIRST n ROWS ONLY;`,
    dialect: 'oracle',
    sql: `SELECT SYSDATE, TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI') AS now_text FROM dual;

SELECT payor_name,
       DECODE(payor_type, 'Commercial', 'COM', 'Medicare', 'MCR', 'Medicaid', 'MCD', 'OTH') AS type_code,
       NVL(phone, 'N/A')                                    AS phone,
       NVL2(phone, 'has phone', 'call via portal')          AS contact_note
FROM payors
ORDER BY payor_name
FETCH FIRST 5 ROWS ONLY;

CREATE SEQUENCE invoice_seq START WITH 1000;
INSERT INTO invoices (invoice_id, patient_id, location_id, invoice_date, due_date, status, total_amount)
VALUES (invoice_seq.NEXTVAL, 2, 1, TO_DATE('2026-09-01','YYYY-MM-DD'), DATE '2026-10-01', 'Open', 0);`,
    breakdown: [
      ['FROM dual', 'One-row dummy table for SELECTs that need no real table'],
      ['DECODE(payor_type, ...)', 'Compact CASE: compare to each value, return the matching result, else the default'],
      ['NVL(phone, \'N/A\')', 'Replace NULL'],
      ['NVL2(phone, a, b)', 'a when phone is not NULL, b when it is'],
      ['FETCH FIRST 5 ROWS ONLY', 'Row limit, applied after ORDER BY (12c+)'],
      ['invoice_seq.NEXTVAL', 'Next number from a sequence object'],
    ],
    dialectSql: {
      mysql: `SELECT IFNULL(phone, 'N/A'), CASE payor_type WHEN 'Commercial' THEN 'COM' ELSE 'OTH' END FROM payors LIMIT 5;`,
      postgres: `SELECT COALESCE(phone, 'N/A'), CASE payor_type WHEN 'Commercial' THEN 'COM' ELSE 'OTH' END FROM payors LIMIT 5;`,
      sqlserver: `SELECT TOP 5 ISNULL(phone, 'N/A'), CASE payor_type WHEN 'Commercial' THEN 'COM' ELSE 'OTH' END FROM payors;`,
      oracle: `SELECT NVL(phone, 'N/A'), DECODE(payor_type, 'Commercial', 'COM', 'OTH') FROM payors FETCH FIRST 5 ROWS ONLY;`,
      sqlite: `SELECT IFNULL(phone, 'N/A'), CASE payor_type WHEN 'Commercial' THEN 'COM' ELSE 'OTH' END FROM payors LIMIT 5;`,
    },
    mistakes: [
      { wrong: `SELECT * FROM invoices WHERE ROWNUM <= 5 ORDER BY total_amount DESC;`, why: 'ROWNUM is assigned before ORDER BY, so this takes 5 arbitrary rows and then sorts them. Use FETCH FIRST, or sort in a subquery first.', fix: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC LIMIT 5;` },
      { wrong: `SELECT * FROM patients WHERE email = '';`, why: 'In Oracle \'\' is NULL, and = NULL is never true: this returns nothing. Use IS NULL.', fix: `SELECT patient_id, email FROM patients WHERE email IS NULL;` },
    ],
    rules: ['Oracle SELECTs need FROM (use dual) before 23ai.', 'ROWNUM is applied before ORDER BY; prefer FETCH FIRST.', 'Empty string equals NULL in Oracle.', 'Oracle DATE has a time part: use TRUNC(d) to compare days.'],
    compare: `<table><tr><th>Oracle</th><th>Standard / SQLite</th></tr>
<tr><td><code>NVL(a,b)</code></td><td><code>COALESCE(a,b)</code> / <code>IFNULL</code></td></tr>
<tr><td><code>DECODE(x,...)</code></td><td><code>CASE x WHEN ... END</code></td></tr>
<tr><td><code>SELECT 1 FROM dual</code></td><td><code>SELECT 1</code></td></tr>
<tr><td><code>TO_CHAR(d,'YYYY-MM')</code></td><td><code>strftime('%Y-%m', d)</code></td></tr>
<tr><td><code>seq.NEXTVAL</code></td><td><code>INTEGER PRIMARY KEY</code> auto rowid</td></tr></table>`,
    realWorld: 'Large health systems run revenue-cycle platforms on Oracle; report writers use DECODE and NVL everywhere, and migrations to PostgreSQL rewrite them as CASE and COALESCE.',
    tips: ['COALESCE is standard and works in Oracle too; it can take many arguments.', 'Use DATE \'2026-09-01\' literals instead of relying on NLS_DATE_FORMAT.'],
    deep: `<p>Because '' is NULL, Oracle VARCHAR2 columns cannot store an empty string distinct from NULL. A NOT NULL constraint therefore rejects ''. Code ported from other databases that inserts '' for "no value" will fail there.</p>`,
    tryIt: { prompt: 'SQLite translation of the Oracle payor query: CASE for DECODE, IFNULL for NVL, iif for NVL2, LIMIT for FETCH FIRST. Add the contract_rate formatted as a percentage with printf(\'%d%%\', contract_rate * 100).', starter: `SELECT payor_name,\n       CASE payor_type WHEN 'Commercial' THEN 'COM' WHEN 'Medicare' THEN 'MCR'\n                       WHEN 'Medicaid' THEN 'MCD' ELSE 'OTH' END AS type_code,\n       IFNULL(phone, 'N/A') AS phone,\n       iif(phone IS NOT NULL, 'has phone', 'call via portal') AS contact_note\nFROM payors\nORDER BY payor_name\nLIMIT 5;` },
    challenge: {
      level: 2,
      prompt: 'Translate this Oracle query to SQLite: SELECT payor_id, payor_name, DECODE(is_active, 1, \'Active\', \'Inactive\'), NVL(phone, \'N/A\') FROM payors ORDER BY payor_id;',
      solution: `SELECT payor_id, payor_name,
       CASE is_active WHEN 1 THEN 'Active' ELSE 'Inactive' END AS active_label,
       IFNULL(phone, 'N/A') AS phone
FROM payors
ORDER BY payor_id;`,
      hints: ['DECODE(x, v, r, default) becomes CASE x WHEN v THEN r ELSE default END.', 'NVL becomes IFNULL (or COALESCE).', 'No dual and no FETCH FIRST needed here.', 'SELECT payor_id, payor_name, CASE is_active WHEN 1 THEN \'Active\' ELSE \'Inactive\' END, IFNULL(phone, \'N/A\') FROM payors ORDER BY payor_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'What is DUAL in Oracle?', options: ['A backup table', 'A one-row dummy table', 'A two-column system view', 'A replication feature'], answer: 1, why: 'DUAL has exactly one row and is used when a SELECT needs no real table.' },
      { q: 'In Oracle, what does \'\' IS NULL return?', options: ['FALSE', 'TRUE', 'UNKNOWN', 'Error'], answer: 1, why: 'Oracle treats the empty string as NULL.' },
      { q: 'Why is WHERE ROWNUM <= 5 ORDER BY x wrong for a top-5?', options: ['ROWNUM is not supported', 'ROWNUM is assigned before sorting', 'ROWNUM starts at 0', 'It returns 6 rows'], answer: 1, why: 'The filter happens before ORDER BY, so you sort 5 arbitrary rows.' },
    ],
  },
  {
    id: 'dialects-21',
    goals: ['The structure of a PL/SQL block: DECLARE, BEGIN, EXCEPTION, END', 'Variables with %TYPE and SELECT ... INTO', 'IF / CASE / loops and DBMS_OUTPUT', 'Handling NO_DATA_FOUND and TOO_MANY_ROWS'],
    concept: `<p><b>PL/SQL</b> is Oracle's procedural language. Code is organized in <b>blocks</b>:</p>
<pre>DECLARE      -- variables (optional)
BEGIN        -- statements (required)
EXCEPTION    -- error handlers (optional)
END;</pre>
<ul>
<li>Variables: <code>v_total NUMBER(12,2);</code>. Use <code>invoices.total_amount%TYPE</code> to copy a column's type automatically.</li>
<li><code>SELECT SUM(total_amount) INTO v_total FROM ...</code> stores a single-row result in variables.</li>
<li>Control flow: <code>IF ... ELSIF ... ELSE ... END IF;</code>, <code>FOR i IN 1..10 LOOP ... END LOOP;</code>, <code>WHILE</code>.</li>
<li>Output for debugging: <code>DBMS_OUTPUT.PUT_LINE('text');</code></li>
<li>Errors: <code>SELECT INTO</code> raises <code>NO_DATA_FOUND</code> (0 rows) or <code>TOO_MANY_ROWS</code> (2+ rows); catch them in EXCEPTION.</li>
</ul>
<p>SQLite has no procedural language; the logic lives in the application, and single-row "SELECT INTO" results are just one-row queries.</p>`,
    why: 'Oracle business logic (triggers, procedures, batch jobs) is written in PL/SQL; the block structure is the foundation of all of it.',
    when: 'Scripts and jobs that need variables, branching, loops or error handling around SQL in Oracle.',
    analogy: 'A PL/SQL block is a standard operating procedure card: a list of supplies you need (DECLARE), the steps (BEGIN), and "if something goes wrong, do this" (EXCEPTION).',
    syntax: `DECLARE\n  v_name table.col%TYPE;\nBEGIN\n  SELECT col INTO v_name FROM table WHERE ...;\n  IF v_name > 0 THEN ... END IF;\nEXCEPTION\n  WHEN NO_DATA_FOUND THEN ...\nEND;`,
    dialect: 'oracle',
    sql: `DECLARE
  v_as_of    DATE := DATE '2026-09-01';
  v_count    PLS_INTEGER;
  v_total    invoices.total_amount%TYPE;
  v_oldest   invoices.due_date%TYPE;
BEGIN
  SELECT COUNT(*), NVL(SUM(total_amount), 0), MIN(due_date)
  INTO   v_count, v_total, v_oldest
  FROM   invoices
  WHERE  status = 'Overdue';

  IF v_total > 2000 THEN
    DBMS_OUTPUT.PUT_LINE('ESCALATE: ' || v_count || ' overdue invoices, $' || v_total);
  ELSIF v_total > 0 THEN
    DBMS_OUTPUT.PUT_LINE('Monitor: oldest due ' || TO_CHAR(v_oldest, 'YYYY-MM-DD')
                         || ' (' || (v_as_of - v_oldest) || ' days)');
  ELSE
    DBMS_OUTPUT.PUT_LINE('No overdue invoices');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
    RAISE;
END;
/`,
    breakdown: [
      ['DECLARE ... %TYPE', 'Variables whose types follow the table columns'],
      ['SELECT ... INTO v_count, v_total, v_oldest', 'One-row result stored in three variables'],
      ['IF / ELSIF / ELSE / END IF', 'Branching (note ELSIF spelling)'],
      ['v_as_of - v_oldest', 'Oracle date subtraction gives days'],
      ['EXCEPTION WHEN OTHERS ... RAISE', 'Log and re-raise any error'],
      ['/', 'In SQL*Plus / SQLcl, runs the block'],
    ],
    dialectSql: {
      mysql: `-- inside a stored program\nDECLARE v_total DECIMAL(12,2);\nSELECT SUM(total_amount) INTO v_total FROM invoices WHERE status = 'Overdue';`,
      postgres: `DO $$ DECLARE v_total numeric;\nBEGIN SELECT SUM(total_amount) INTO v_total FROM invoices WHERE status = 'Overdue';\n  RAISE NOTICE 'total %', v_total; END $$;`,
      sqlserver: `DECLARE @total decimal(12,2);\nSELECT @total = SUM(total_amount) FROM invoices WHERE status = 'Overdue';\nPRINT @total;`,
      oracle: `DECLARE v_total NUMBER;\nBEGIN SELECT SUM(total_amount) INTO v_total FROM invoices WHERE status = 'Overdue';\n  DBMS_OUTPUT.PUT_LINE(v_total); END;`,
      sqlite: `SELECT SUM(total_amount) AS v_total FROM invoices WHERE status = 'Overdue';`,
    },
    mistakes: [
      { wrong: `SELECT invoice_id INTO v_id FROM invoices WHERE status = 'Overdue';`, why: 'Several rows match, so Oracle raises TOO_MANY_ROWS. SELECT INTO must return exactly one row: aggregate, filter by key, or use a cursor.', fix: `SELECT MIN(invoice_id) AS v_id FROM invoices WHERE status = 'Overdue';` },
      { wrong: `IF v_total > 0 THEN ... ELSE IF v_total = 0 THEN ... END IF;`, why: 'PL/SQL spells it ELSIF. "ELSE IF" opens a nested IF that needs its own END IF, a common compile error.', fix: `SELECT CASE WHEN SUM(total_amount) > 0 THEN 'has overdue' ELSE 'none' END FROM invoices WHERE status = 'Overdue';` },
    ],
    rules: ['A block is DECLARE / BEGIN / EXCEPTION / END.', 'SELECT INTO must return exactly one row.', 'Use %TYPE so variables follow column changes.', 'It is ELSIF, not ELSEIF or ELSE IF.'],
    compare: `<table><tr><th></th><th>PL/SQL</th><th>T-SQL</th><th>PL/pgSQL</th></tr>
<tr><td>Assign</td><td><code>v := 1;</code></td><td><code>SET @v = 1;</code></td><td><code>v := 1;</code></td></tr>
<tr><td>Query into var</td><td><code>SELECT x INTO v</code></td><td><code>SELECT @v = x</code></td><td><code>SELECT x INTO v</code></td></tr>
<tr><td>Print</td><td><code>DBMS_OUTPUT.PUT_LINE</code></td><td><code>PRINT</code></td><td><code>RAISE NOTICE</code></td></tr>
<tr><td>Errors</td><td><code>EXCEPTION WHEN</code></td><td><code>TRY/CATCH</code></td><td><code>EXCEPTION WHEN</code></td></tr></table>`,
    realWorld: 'Nightly Oracle jobs in hospital billing compute AR totals into variables, decide whether to escalate, and log results, all inside anonymous PL/SQL blocks scheduled by DBMS_SCHEDULER.',
    tips: ['SET SERVEROUTPUT ON in SQL*Plus to see DBMS_OUTPUT.', 'PL/pgSQL (PostgreSQL) was modeled on PL/SQL, so the skills transfer.'],
    deep: `<p>Each SQL statement inside PL/SQL causes a <b>context switch</b> between the PL/SQL engine and the SQL engine. One set-based SQL statement is nearly always faster than a loop issuing one statement per row.</p>`,
    tryIt: { prompt: 'In SQLite the "SELECT INTO variables" step is just a one-row query, and the IF becomes CASE. Change the escalation threshold to 1000.', starter: `SELECT COUNT(*)                      AS v_count,\n       IFNULL(SUM(total_amount), 0)  AS v_total,\n       MIN(due_date)                 AS v_oldest,\n       CASE WHEN SUM(total_amount) > 2000 THEN 'ESCALATE'\n            WHEN SUM(total_amount) > 0    THEN 'Monitor'\n            ELSE 'No overdue invoices' END AS action\nFROM invoices\nWHERE status = 'Overdue';` },
    challenge: {
      level: 2,
      prompt: 'Write the one-row query a PL/SQL block would SELECT INTO: for Overdue invoices return the count, the total amount, the oldest due_date, and the days between that oldest due_date and 2026-09-01 (whole days).',
      solution: `SELECT COUNT(*) AS v_count,
       SUM(total_amount) AS v_total,
       MIN(due_date) AS v_oldest,
       CAST(julianday('2026-09-01') - julianday(MIN(due_date)) AS INTEGER) AS days_old
FROM invoices
WHERE status = 'Overdue';`,
      hints: ['One row means aggregates only, no GROUP BY.', 'COUNT(*), SUM(total_amount), MIN(due_date).', 'Days: julianday(\'2026-09-01\') - julianday(MIN(due_date)).', 'CAST(... AS INTEGER) for whole days, with WHERE status = \'Overdue\'.'],
    },
    quiz: [
      { q: 'Which exception does SELECT INTO raise when no row matches?', options: ['TOO_MANY_ROWS', 'NO_DATA_FOUND', 'VALUE_ERROR', 'Nothing, it sets NULL'], answer: 1, why: 'Zero rows raises NO_DATA_FOUND.' },
      { q: 'What does invoices.total_amount%TYPE mean?', options: ['A comment', 'The data type of that column', 'The column value', 'A cursor'], answer: 1, why: '%TYPE anchors a variable to a column\'s type.' },
    ],
  },
  {
    id: 'dialects-22',
    goals: ['Explicit and implicit cursors, cursor FOR loops', 'Bulk processing with BULK COLLECT and FORALL', 'Custom errors with RAISE_APPLICATION_ERROR', 'When to replace a loop with one set-based statement'],
    concept: `<p>Beyond basic blocks, PL/SQL gives you tools for processing many rows:</p>
<ul>
<li><b>Cursor FOR loop</b>: <code>FOR r IN (SELECT ...) LOOP ... END LOOP;</code> fetches rows one at a time (Oracle quietly batches 100 at a time).</li>
<li><b>BULK COLLECT</b>: load many rows into a collection in one fetch; <b>FORALL</b>: send one DML statement for every element in one call. Together they cut context switches dramatically.</li>
<li><b>Collections</b>: associative arrays, nested tables, VARRAYs.</li>
<li><b>Errors</b>: <code>RAISE_APPLICATION_ERROR(-20001, 'message')</code> raises a custom error; <code>SAVE EXCEPTIONS</code> lets FORALL continue past bad rows.</li>
</ul>
<p>The golden rule: if one SQL statement can do the job, it beats any loop. The cursor loop below is shown mainly so you can recognize it and rewrite it.</p>`,
    why: 'Row-by-row PL/SQL ("slow-by-slow") is a top cause of slow Oracle batch jobs; knowing bulk and set-based alternatives fixes them.',
    when: 'Batch jobs over many rows: late fees, statement generation, archiving. Use cursors only when per-row logic truly cannot be expressed in SQL.',
    analogy: 'A cursor loop is a clerk walking to the file room once per claim. BULK COLLECT is wheeling back a whole cart of claims in one trip, and FORALL is stamping the whole cart at once. A single UPDATE is asking the file room to stamp every matching claim itself.',
    syntax: `FOR r IN (SELECT ...) LOOP ... END LOOP;\nSELECT ... BULK COLLECT INTO coll FROM ...;\nFORALL i IN 1..coll.COUNT UPDATE ... WHERE id = coll(i);\nRAISE_APPLICATION_ERROR(-20001, 'msg');`,
    dialect: 'oracle',
    sql: `DECLARE
  TYPE t_ids  IS TABLE OF invoices.invoice_id%TYPE;
  TYPE t_amts IS TABLE OF invoices.total_amount%TYPE;
  v_ids  t_ids;
  v_fees t_amts;
BEGIN
  -- 1) fetch all overdue invoices older than 60 days in one round trip
  SELECT invoice_id, ROUND(total_amount * 0.015, 2)
  BULK COLLECT INTO v_ids, v_fees
  FROM invoices
  WHERE status = 'Overdue' AND DATE '2026-09-01' - due_date > 60;

  IF v_ids.COUNT = 0 THEN
    RAISE_APPLICATION_ERROR(-20010, 'No invoices qualify for a late fee');
  END IF;

  -- 2) insert all ledger entries in one call
  FORALL i IN 1 .. v_ids.COUNT
    INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)
    VALUES (v_ids(i), DATE '2026-09-01', 'ADJUSTMENT', v_fees(i), 'late_fee_job');

  COMMIT;
END;
/`,
    breakdown: [
      ['TYPE t_ids IS TABLE OF ...', 'Declares a collection type'],
      ['BULK COLLECT INTO v_ids, v_fees', 'Fetch every qualifying row into collections at once'],
      ['RAISE_APPLICATION_ERROR(-20010, ...)', 'Custom error (codes -20000 to -20999)'],
      ['FORALL i IN 1 .. v_ids.COUNT', 'One bulk bind: the INSERT runs for every element in a single context switch'],
    ],
    dialectSql: {
      mysql: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nSELECT invoice_id, '2026-09-01', 'ADJUSTMENT', ROUND(total_amount * 0.015, 2), 'late_fee_job'\nFROM invoices WHERE status = 'Overdue' AND DATEDIFF('2026-09-01', due_date) > 60;`,
      postgres: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nSELECT invoice_id, DATE '2026-09-01', 'ADJUSTMENT', ROUND(total_amount * 0.015, 2), 'late_fee_job'\nFROM invoices WHERE status = 'Overdue' AND DATE '2026-09-01' - due_date > 60;`,
      sqlserver: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nSELECT invoice_id, '2026-09-01', 'ADJUSTMENT', ROUND(total_amount * 0.015, 2), 'late_fee_job'\nFROM invoices WHERE status = 'Overdue' AND DATEDIFF(day, due_date, '2026-09-01') > 60;`,
      oracle: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nSELECT invoice_id, DATE '2026-09-01', 'ADJUSTMENT', ROUND(total_amount * 0.015, 2), 'late_fee_job'\nFROM invoices WHERE status = 'Overdue' AND DATE '2026-09-01' - due_date > 60;`,
      sqlite: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nSELECT invoice_id, '2026-09-01', 'ADJUSTMENT', round(total_amount * 0.015, 2), 'late_fee_job'\nFROM invoices WHERE status = 'Overdue' AND julianday('2026-09-01') - julianday(due_date) > 60;`,
    },
    mistakes: [
      { wrong: `FOR r IN (SELECT invoice_id, total_amount FROM invoices WHERE status = 'Overdue') LOOP\n  INSERT INTO transactions (...) VALUES (r.invoice_id, ..., r.total_amount * 0.015, ...);\n  COMMIT;\nEND LOOP;`, why: 'One INSERT and one COMMIT per row: many context switches and log syncs, and a failure halfway leaves half the fees posted. One INSERT ... SELECT does it all atomically.', fix: `SELECT invoice_id, round(total_amount * 0.015, 2) AS fee FROM invoices WHERE status = 'Overdue';` },
      { wrong: `SELECT ... BULK COLLECT INTO v_ids FROM transactions;  -- 50 million rows`, why: 'BULK COLLECT without LIMIT loads everything into session memory (PGA). Fetch in chunks with a cursor and LIMIT 1000.', fix: `SELECT COUNT(*) FROM transactions;` },
    ],
    rules: ['Set-based SQL first; loops last.', 'If you must loop, use BULK COLLECT (with LIMIT) and FORALL.', 'Do not COMMIT inside loops.', 'Custom error codes are -20000 to -20999.'],
    compare: `<table><tr><th>Approach</th><th>Round trips for 10,000 rows</th><th>Atomic</th></tr>
<tr><td>Cursor loop + INSERT per row</td><td>~10,000</td><td>Only if committed once at end</td></tr>
<tr><td>BULK COLLECT + FORALL</td><td>A few</td><td>Yes</td></tr>
<tr><td>INSERT ... SELECT</td><td>1</td><td>Yes</td></tr></table>`,
    realWorld: 'Month-end late-fee and finance-charge jobs in Oracle billing systems were classic slow cursor loops; rewriting them as INSERT ... SELECT or FORALL often reduces hours to minutes.',
    tips: ['SQL%ROWCOUNT tells you how many rows the last statement touched.', 'Use LOG ERRORS INTO an error table to skip bad rows in a set-based INSERT.'],
    deep: `<p>FORALL ... SAVE EXCEPTIONS collects per-row errors in SQL%BULK_EXCEPTIONS and raises ORA-24381 at the end, so one bad invoice does not stop the whole batch. You then inspect the error index and code for each failed element.</p>`,
    tryIt: { prompt: 'The set-based replacement for the cursor loop, in SQLite: one INSERT ... SELECT posts every late fee. Run it and check the new ADJUSTMENT rows. Then change the fee to 2%.', starter: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nSELECT invoice_id, '2026-09-01', 'ADJUSTMENT', round(total_amount * 0.015, 2), 'late_fee_job'\nFROM invoices\nWHERE status = 'Overdue'\n  AND julianday('2026-09-01') - julianday(due_date) > 60;\n\nSELECT invoice_id, transaction_type, amount, posted_by\nFROM transactions\nWHERE posted_by = 'late_fee_job'\nORDER BY invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'Preview the late-fee batch set-based (no loop): for Overdue invoices more than 60 days past due as of 2026-09-01, return invoice_id, days past due (integer) and a fee of 1.5% of total_amount rounded to 2 decimals. Sort by days past due descending, then invoice_id.',
      solution: `SELECT invoice_id,
       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_past_due,
       round(total_amount * 0.015, 2) AS late_fee
FROM invoices
WHERE status = 'Overdue'
  AND julianday('2026-09-01') - julianday(due_date) > 60
ORDER BY days_past_due DESC, invoice_id;`,
      hints: ['One SELECT over invoices replaces the cursor.', 'Days past due: julianday(\'2026-09-01\') - julianday(due_date).', 'Filter status = \'Overdue\' AND days > 60.', 'Fee: round(total_amount * 0.015, 2); ORDER BY days_past_due DESC, invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'What does FORALL do?', options: ['Loops in PL/SQL one row at a time', 'Sends one DML for all collection elements in a single bulk call', 'Locks all rows', 'Commits after every row'], answer: 1, why: 'FORALL bulk-binds a collection to one DML statement.' },
      { q: 'Best replacement for "loop over overdue invoices and insert a fee row each"?', options: ['A trigger', 'INSERT ... SELECT', 'A view', 'A sequence'], answer: 1, why: 'A single set-based statement is fastest and atomic.' },
    ],
  },
  {
    id: 'dialects-23',
    goals: ['What a package is: specification + body', 'Public vs private members and package state', 'Why packages help dependency management and performance', 'Organizing SQL "APIs" in databases without packages'],
    concept: `<p>An Oracle <b>package</b> groups related procedures, functions, types, constants and variables under one name, like a module or class.</p>
<ul>
<li>The <b>specification</b> (<code>CREATE PACKAGE</code>) is the public contract: what callers can use.</li>
<li>The <b>body</b> (<code>CREATE PACKAGE BODY</code>) holds the implementation plus private helpers that are invisible outside.</li>
<li>Callers use dot notation: <code>billing_pkg.patient_balance(5)</code>.</li>
<li>Package-level variables keep <b>state for the session</b>.</li>
<li>You can recompile the body without invalidating code that depends only on the spec.</li>
</ul>
<p>PostgreSQL uses schemas to group functions; SQL Server uses schemas too. SQLite has neither: apps group their SQL in code, and <b>views</b> can act as a read-only "API".</p>`,
    why: 'Large billing systems have hundreds of routines; packages give them structure, encapsulation and stable interfaces.',
    when: 'Grouping all billing operations (post payment, apply adjustment, compute balance) into one well-defined unit in Oracle.',
    analogy: 'A package is a hospital department. The front desk menu (spec) lists the services patients can request. The back office (body) contains the internal steps and staff that patients never see, and can reorganize without reprinting the menu.',
    syntax: `CREATE OR REPLACE PACKAGE name AS\n  FUNCTION f(p NUMBER) RETURN NUMBER;\n  PROCEDURE p(...);\nEND name;\nCREATE OR REPLACE PACKAGE BODY name AS ... END name;`,
    dialect: 'oracle',
    sql: `CREATE OR REPLACE PACKAGE billing_pkg AS
  c_late_fee_rate CONSTANT NUMBER := 0.015;
  FUNCTION patient_balance(p_patient_id NUMBER) RETURN NUMBER;
  PROCEDURE apply_late_fees(p_as_of DATE);
END billing_pkg;
/
CREATE OR REPLACE PACKAGE BODY billing_pkg AS
  -- private helper: not in the spec, so not callable from outside
  FUNCTION days_late(p_due DATE, p_as_of DATE) RETURN NUMBER IS
  BEGIN
    RETURN GREATEST(p_as_of - p_due, 0);
  END;

  FUNCTION patient_balance(p_patient_id NUMBER) RETURN NUMBER IS
    v_bal NUMBER;
  BEGIN
    SELECT NVL(SUM(t.amount), 0) INTO v_bal
    FROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id
    WHERE i.patient_id = p_patient_id;
    RETURN v_bal;
  END;

  PROCEDURE apply_late_fees(p_as_of DATE) IS
  BEGIN
    INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)
    SELECT invoice_id, p_as_of, 'ADJUSTMENT', ROUND(total_amount * c_late_fee_rate, 2), 'billing_pkg'
    FROM invoices
    WHERE status = 'Overdue' AND days_late(due_date, p_as_of) > 60;
  END;
END billing_pkg;
/
SELECT patient_id, billing_pkg.patient_balance(patient_id) AS balance FROM patients;`,
    breakdown: [
      ['CREATE PACKAGE billing_pkg AS ... END', 'The spec: a public constant, one function, one procedure'],
      ['CREATE PACKAGE BODY', 'The implementation'],
      ['FUNCTION days_late ...', 'Private: declared only in the body'],
      ['c_late_fee_rate CONSTANT', 'Shared configuration used by the body'],
      ['billing_pkg.patient_balance(patient_id)', 'Public function called from SQL with dot notation'],
    ],
    dialectSql: {
      mysql: `-- no packages: name prefixes by convention\nCREATE FUNCTION billing_patient_balance(p_id INT) RETURNS DECIMAL(12,2) READS SQL DATA ...;`,
      postgres: `CREATE SCHEMA billing;\nCREATE FUNCTION billing.patient_balance(p_id int) RETURNS numeric LANGUAGE sql AS $$ ... $$;`,
      sqlserver: `CREATE SCHEMA billing;\nGO\nCREATE FUNCTION billing.patient_balance(@id int) RETURNS decimal(12,2) AS BEGIN ... END;`,
      oracle: `SELECT billing_pkg.patient_balance(5) FROM dual;`,
      sqlite: `-- no packages: a view acts as a read-only "API"\nCREATE VIEW billing_patient_balance AS\nSELECT i.patient_id, SUM(t.amount) AS balance\nFROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id GROUP BY i.patient_id;`,
    },
    mistakes: [
      { wrong: `-- Put everything in the spec "just in case"`, why: 'Everything in the spec is public and becomes a contract you cannot change without recompiling callers. Expose only what callers need; keep helpers private in the body.', fix: `SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name;` },
      { wrong: `-- Rely on package variables to share data between users`, why: 'Package state is per session. Another user (or another pooled connection) sees its own copy, so it is not a shared cache.', fix: `SELECT COUNT(*) AS invoices FROM invoices;` },
    ],
    rules: ['Spec = public interface; body = implementation.', 'Anything only in the body is private.', 'Package variables are per session.', 'Changing only the body does not invalidate dependents.'],
    compare: `<table><tr><th>Database</th><th>Grouping mechanism</th></tr>
<tr><td>Oracle</td><td>Packages (spec + body, private members, state)</td></tr>
<tr><td>PostgreSQL</td><td>Schemas (and extensions)</td></tr>
<tr><td>SQL Server</td><td>Schemas</td></tr>
<tr><td>MySQL</td><td>Databases + naming conventions</td></tr>
<tr><td>SQLite</td><td>None; views and application modules</td></tr></table>`,
    realWorld: 'Oracle-based patient accounting systems ship dozens of packages (billing_pkg, claims_pkg, collections_pkg). Upgrades replace package bodies while screens keep calling the same spec.',
    tips: ['Use ACCESSIBLE BY (12c+) to restrict which units can call a package.', 'Initialize package state in the optional BEGIN section at the end of the body.'],
    deep: `<p>The first call to a package loads the whole package into memory for the session, so related routines are ready together. Recompiling a package body in production resets session state (ORA-04068 "existing state of packages has been discarded") for active sessions, so plan deployments accordingly.</p>`,
    tryIt: { prompt: 'SQLite has no packages, but a view can be a stable read-only "API". Create the view, query it, then add a column for the number of invoices.', starter: `CREATE VIEW billing_patient_balance AS\nSELECT i.patient_id, SUM(t.amount) AS balance\nFROM transactions t\nJOIN invoices i ON i.invoice_id = t.invoice_id\nGROUP BY i.patient_id;\n\nSELECT * FROM billing_patient_balance WHERE balance > 0 ORDER BY balance DESC;` },
    challenge: {
      level: 3,
      prompt: 'Implement billing_pkg.patient_balance for all patients as one query: patient_id, last_name and the ledger balance (sum of transactions.amount over all their invoices). Only patients with a positive balance. Sort by balance descending, then patient_id.',
      solution: `SELECT p.patient_id, p.last_name, SUM(t.amount) AS balance
FROM patients p
JOIN invoices i ON i.patient_id = p.patient_id
JOIN transactions t ON t.invoice_id = i.invoice_id
GROUP BY p.patient_id, p.last_name
HAVING SUM(t.amount) > 0
ORDER BY balance DESC, p.patient_id;`,
      hints: ['The ledger lives in transactions; each row belongs to an invoice, and each invoice to a patient.', 'Join patients -> invoices -> transactions.', 'GROUP BY patient and SUM(t.amount).', 'HAVING SUM(t.amount) > 0 ORDER BY balance DESC, p.patient_id'],
      ordered: true,
    },
    quiz: [
      { q: 'Where do private package functions live?', options: ['In the spec', 'Only in the body', 'In a separate schema', 'In DUAL'], answer: 1, why: 'Only members declared in the spec are public.' },
      { q: 'Package variables are shared...', options: ['By all users', 'Within one session', 'Across the cluster', 'Never'], answer: 1, why: 'Each session has its own copy of package state.' },
    ],
  },
  {
    id: 'dialects-24',
    goals: ['Write an Oracle procedure with IN, OUT and IN OUT parameters', 'Call it with named notation', 'Transaction control and error handling inside procedures', 'AUTHID and privileges'],
    concept: `<p>An Oracle <b>procedure</b> is a named PL/SQL block stored in the database that performs an action.</p>
<ul>
<li>Parameter modes: <code>IN</code> (default, read-only input), <code>OUT</code> (returned to the caller), <code>IN OUT</code> (both).</li>
<li>Call it from a block: <code>billing.write_off_old(p_as_of => DATE '2026-09-01', p_count => v_n);</code> (named notation with <code>=></code>), or <code>EXEC</code> in SQL*Plus.</li>
<li>Procedures can COMMIT or ROLLBACK, but it is usually cleaner to let the caller control the transaction.</li>
<li><code>AUTHID DEFINER</code> (default) runs with the owner's privileges; <code>AUTHID CURRENT_USER</code> with the caller's.</li>
</ul>
<p>Procedures cannot be used inside a SELECT (that is what functions are for).</p>`,
    why: 'Procedures package multi-step business operations so they run the same way every time, with controlled privileges.',
    when: 'Write-off batches, payment posting, month-end close steps, or any operation other programs trigger by name.',
    analogy: 'IN parameters are the instructions on the work order, OUT parameters are the completion report the clerk hands back, and IN OUT is a form you give the clerk who fills in extra boxes and returns it.',
    syntax: `CREATE OR REPLACE PROCEDURE name (\n  p_in  IN  type,\n  p_out OUT type\n) AS\nBEGIN ... END name;`,
    dialect: 'oracle',
    sql: `CREATE OR REPLACE PROCEDURE write_off_old_balances (
  p_as_of      IN  DATE,
  p_min_days   IN  NUMBER DEFAULT 365,
  p_count      OUT NUMBER,
  p_amount     OUT NUMBER
) AUTHID DEFINER AS
BEGIN
  INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)
  SELECT t.invoice_id, p_as_of, 'WRITE_OFF', -SUM(t.amount), USER
  FROM transactions t JOIN invoices i ON i.invoice_id = t.invoice_id
  WHERE i.status IN ('Overdue', 'Partially Paid')
    AND p_as_of - i.due_date > p_min_days
  GROUP BY t.invoice_id
  HAVING SUM(t.amount) > 0;

  p_count  := SQL%ROWCOUNT;
  SELECT NVL(-SUM(amount), 0) INTO p_amount
  FROM transactions WHERE transaction_type = 'WRITE_OFF' AND transaction_date = p_as_of;
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END write_off_old_balances;
/
DECLARE v_n NUMBER; v_amt NUMBER;
BEGIN
  write_off_old_balances(p_as_of => DATE '2026-09-01', p_count => v_n, p_amount => v_amt);
  DBMS_OUTPUT.PUT_LINE(v_n || ' invoices written off, total ' || v_amt);
  COMMIT;
END;
/`,
    breakdown: [
      ['p_as_of IN DATE', 'Input parameter'],
      ['p_min_days IN NUMBER DEFAULT 365', 'Optional input with a default'],
      ['p_count OUT NUMBER', 'Output filled by the procedure'],
      ['INSERT ... SELECT ... HAVING SUM(t.amount) > 0', 'One write-off line per invoice with a remaining balance'],
      ['SQL%ROWCOUNT', 'Rows affected by the last statement'],
      ['p_count => v_n', 'Named notation when calling'],
      ['COMMIT in the caller', 'The caller decides when the work is final'],
    ],
    dialectSql: {
      mysql: `CREATE PROCEDURE write_off_old(IN p_as_of DATE, OUT p_count INT) BEGIN ... END;\nCALL write_off_old('2026-09-01', @n); SELECT @n;`,
      postgres: `CREATE PROCEDURE write_off_old(p_as_of date, INOUT p_count int DEFAULT NULL) LANGUAGE plpgsql AS $$ ... $$;\nCALL write_off_old('2026-09-01');`,
      sqlserver: `CREATE PROCEDURE dbo.write_off_old @as_of date, @count int OUTPUT AS BEGIN ... END;\nEXEC dbo.write_off_old @as_of = '2026-09-01', @count = @n OUTPUT;`,
      oracle: `BEGIN write_off_old_balances(p_as_of => DATE '2026-09-01', p_count => :n, p_amount => :amt); END;`,
      sqlite: `-- no procedures: the app runs the INSERT ... SELECT in a transaction\n-- and reads changes() for the row count`,
    },
    mistakes: [
      { wrong: `SELECT write_off_old_balances(DATE '2026-09-01') FROM dual;`, why: 'Procedures cannot be called from SQL. Call them in a PL/SQL block (or EXEC/CALL). If you need a value inside SELECT, write a function.', fix: `SELECT COUNT(*) FROM invoices WHERE status = 'Overdue';` },
      { wrong: `PROCEDURE p(p_count OUT NUMBER) IS BEGIN p_count := p_count + 1; END;`, why: 'An OUT parameter starts as NULL inside the procedure (the caller\'s value is not passed in), so NULL + 1 is NULL. Use IN OUT if you need the incoming value.', fix: `SELECT IFNULL(NULL, 0) + 1 AS counter;` },
    ],
    rules: ['IN = input, OUT = result, IN OUT = both.', 'Procedures act; functions return values usable in SQL.', 'Let the caller COMMIT when possible.', 'Use named notation (=>) for readability.'],
    compare: `<table><tr><th></th><th>Oracle</th><th>SQL Server</th><th>PostgreSQL</th></tr>
<tr><td>Output param</td><td><code>OUT</code></td><td><code>OUTPUT</code></td><td><code>INOUT</code></td></tr>
<tr><td>Call</td><td><code>BEGIN p(...); END;</code></td><td><code>EXEC p ...</code></td><td><code>CALL p(...)</code></td></tr>
<tr><td>Named args</td><td><code>p_x => 1</code></td><td><code>@x = 1</code></td><td><code>p_x => 1</code></td></tr></table>`,
    realWorld: 'Small-balance and aged-balance write-off procedures run at month end: anything over a year past due with a remaining balance is written off with a WRITE_OFF ledger line and reported to finance.',
    tips: ['USER_SOURCE shows procedure code; USER_ERRORS shows compile errors.', 'Use NOCOPY on large IN OUT collections to avoid copying.'],
    deep: `<p>With AUTHID DEFINER, a user needs only EXECUTE on the procedure, not INSERT on transactions. That is a powerful security pattern: grant the operation, not the underlying table access. Roles are not active inside definer-rights code, so grants must be direct.</p>`,
    tryIt: { prompt: 'SQLite: run the body of the procedure yourself, then check changes(). Try p_min_days = 180 by editing the number.', starter: `INSERT INTO transactions (invoice_id, transaction_date, transaction_type, amount, posted_by)\nSELECT t.invoice_id, '2026-09-01', 'WRITE_OFF', -SUM(t.amount), 'demo'\nFROM transactions t\nJOIN invoices i ON i.invoice_id = t.invoice_id\nWHERE i.status IN ('Overdue', 'Partially Paid')\n  AND julianday('2026-09-01') - julianday(i.due_date) > 365\nGROUP BY t.invoice_id\nHAVING SUM(t.amount) > 0;\n\nSELECT changes() AS p_count;` },
    challenge: {
      level: 3,
      prompt: 'Preview what the procedure would write off: invoices with status Overdue or Partially Paid, more than 365 days past due as of 2026-09-01, with a positive ledger balance (sum of transactions.amount). Show invoice_id, due_date and balance, sorted by invoice_id.',
      solution: `SELECT i.invoice_id, i.due_date, SUM(t.amount) AS balance
FROM invoices i
JOIN transactions t ON t.invoice_id = i.invoice_id
WHERE i.status IN ('Overdue', 'Partially Paid')
  AND julianday('2026-09-01') - julianday(i.due_date) > 365
GROUP BY i.invoice_id, i.due_date
HAVING SUM(t.amount) > 0
ORDER BY i.invoice_id;`,
      hints: ['Join invoices to transactions.', 'Filter status IN (\'Overdue\', \'Partially Paid\') and julianday difference > 365.', 'GROUP BY the invoice and SUM(t.amount) for the balance.', 'HAVING SUM(t.amount) > 0 ORDER BY i.invoice_id'],
      ordered: true,
    },
    quiz: [
      { q: 'Which parameter mode lets the procedure read the caller\'s value AND return a new one?', options: ['IN', 'OUT', 'IN OUT', 'RETURN'], answer: 2, why: 'IN OUT passes a value in and back out.' },
      { q: 'Can you call a procedure in a SELECT list?', options: ['Yes', 'No, use a function', 'Only with DUAL', 'Only if it has no parameters'], answer: 1, why: 'Only functions can be used in SQL expressions.' },
    ],
  },
  {
    id: 'dialects-25',
    goals: ['Create PL/SQL functions that return a value', 'Use functions inside SELECT, WHERE and ORDER BY', 'DETERMINISTIC, RESULT_CACHE and function-based indexes', 'The cost of calling functions per row, and inline SQL alternatives'],
    concept: `<p>A <b>function</b> takes parameters and <b>returns one value</b> (<code>RETURN</code>). Because it returns a value, you can use it directly in SQL:</p>
<pre>SELECT patient_id, age_on(date_of_birth, DATE '2026-09-01') FROM patients;</pre>
<ul>
<li><code>DETERMINISTIC</code> promises the same inputs always give the same output, which allows function-based indexes and caching.</li>
<li><code>RESULT_CACHE</code> caches results across sessions.</li>
<li>Functions called from SQL should not modify data.</li>
<li>Oracle 12c+ lets you declare a function inline: <code>WITH FUNCTION f ... SELECT f(x) FROM t</code>.</li>
</ul>
<p>Each call switches from SQL to PL/SQL, so a function called on millions of rows can be slow. Often the same logic written as a plain SQL expression is faster. SQLite has no user-defined SQL functions from SQL itself; you write the expression inline (or register a function from the host language).</p>`,
    why: 'Functions encapsulate reusable calculations (age, balance, expected payment) so every report computes them the same way.',
    when: 'Reusable business calculations used in many queries, especially small deterministic ones.',
    analogy: 'A function is a calculator on the billing desk with one fixed formula: punch in date of birth and today\'s date, it shows the age. Anyone can use it, and everyone gets the same answer.',
    syntax: `CREATE OR REPLACE FUNCTION name (p type) RETURN type\n  DETERMINISTIC\nIS\nBEGIN\n  RETURN expr;\nEND;`,
    dialect: 'oracle',
    sql: `CREATE OR REPLACE FUNCTION age_on (p_dob DATE, p_as_of DATE)
  RETURN NUMBER DETERMINISTIC
IS
BEGIN
  RETURN TRUNC(MONTHS_BETWEEN(p_as_of, p_dob) / 12);
END age_on;
/
CREATE OR REPLACE FUNCTION expected_payment (p_amount NUMBER, p_payor_id NUMBER)
  RETURN NUMBER RESULT_CACHE
IS
  v_rate payors.contract_rate%TYPE;
BEGIN
  SELECT contract_rate INTO v_rate FROM payors WHERE payor_id = p_payor_id;
  RETURN ROUND(p_amount * v_rate, 2);
EXCEPTION
  WHEN NO_DATA_FOUND THEN RETURN p_amount;   -- self-pay: full amount
END expected_payment;
/
SELECT p.patient_id, age_on(p.date_of_birth, DATE '2026-09-01') AS age
FROM patients p
WHERE age_on(p.date_of_birth, DATE '2026-09-01') >= 65;

SELECT invoice_id, expected_payment(total_amount, payor_id) FROM invoices;`,
    breakdown: [
      ['RETURN NUMBER DETERMINISTIC', 'Declares the result type and that it depends only on inputs'],
      ['MONTHS_BETWEEN(p_as_of, p_dob) / 12', 'Oracle date function; TRUNC keeps whole years'],
      ['RESULT_CACHE', 'Remembers results for repeated inputs'],
      ['EXCEPTION WHEN NO_DATA_FOUND THEN RETURN p_amount', 'NULL payor (self-pay) falls back to the full amount'],
      ['WHERE age_on(...) >= 65', 'Functions can be used in WHERE (a function-based index could support it)'],
    ],
    dialectSql: {
      mysql: `CREATE FUNCTION age_on(p_dob DATE, p_as_of DATE) RETURNS INT DETERMINISTIC\nRETURN TIMESTAMPDIFF(YEAR, p_dob, p_as_of);`,
      postgres: `CREATE FUNCTION age_on(p_dob date, p_as_of date) RETURNS int IMMUTABLE LANGUAGE sql\nAS $$ SELECT extract(year FROM age(p_as_of, p_dob))::int $$;`,
      sqlserver: `CREATE FUNCTION dbo.age_on(@dob date, @as_of date) RETURNS int AS BEGIN\n  RETURN DATEDIFF(year, @dob, @as_of) - IIF(FORMAT(@as_of,'MMdd') < FORMAT(@dob,'MMdd'), 1, 0); END;`,
      oracle: `CREATE FUNCTION age_on(p_dob DATE, p_as_of DATE) RETURN NUMBER DETERMINISTIC IS\nBEGIN RETURN TRUNC(MONTHS_BETWEEN(p_as_of, p_dob) / 12); END;`,
      sqlite: `-- inline expression instead of a function\nSELECT (strftime('%Y','2026-09-01') - strftime('%Y', date_of_birth))\n     - (strftime('%m-%d','2026-09-01') < strftime('%m-%d', date_of_birth)) AS age\nFROM patients;`,
    },
    mistakes: [
      { wrong: `SELECT invoice_id, expected_payment(total_amount, payor_id) FROM invoices;  -- on 20M rows`, why: 'The function runs a SELECT for every row: 20 million context switches and lookups. A join to payors does the same work in one set-based pass.', fix: `SELECT i.invoice_id, round(i.total_amount * IFNULL(p.contract_rate, 1), 2) AS expected FROM invoices i LEFT JOIN payors p ON p.payor_id = i.payor_id LIMIT 10;` },
      { wrong: `-- Marking a function DETERMINISTIC although it reads a table that changes`, why: 'Oracle trusts the keyword: indexes and caches may return stale values after contract_rate changes. Only mark truly deterministic logic.', fix: `SELECT payor_id, contract_rate FROM payors;` },
    ],
    rules: ['Functions return a value and can be used in SQL.', 'Keep functions called from SQL free of side effects.', 'Only use DETERMINISTIC when it is really true.', 'Per-row lookups in functions are slow; prefer joins.'],
    compare: `<table><tr><th></th><th>Function</th><th>Procedure</th></tr>
<tr><td>Returns</td><td>One value (RETURN)</td><td>OUT parameters</td></tr>
<tr><td>Use in SELECT/WHERE</td><td>Yes</td><td>No</td></tr>
<tr><td>Typical job</td><td>Calculate</td><td>Act / change data</td></tr></table>`,
    realWorld: 'Reports compute patient age for Medicare eligibility (65+) and expected reimbursement with shared functions so every department uses identical logic.',
    tips: ['Function-based index: CREATE INDEX ix ON patients (age_on(date_of_birth, DATE \'2026-09-01\')) requires DETERMINISTIC.', 'PRAGMA UDF (12c+) reduces the context-switch cost for SQL-called functions.'],
    deep: `<p>Oracle's scalar subquery caching also helps: wrapping a function call as <code>(SELECT f(x) FROM dual)</code> lets Oracle cache results for repeated input values within one query, often cutting calls from millions to a handful.</p>`,
    tryIt: { prompt: 'SQLite has no CREATE FUNCTION, so the "age_on" logic becomes an inline expression. Change the as-of date to 2025-01-01 and see ages shift.', starter: `SELECT patient_id, first_name, last_name, date_of_birth,\n       (strftime('%Y', '2026-09-01') - strftime('%Y', date_of_birth))\n     - (strftime('%m-%d', '2026-09-01') < strftime('%m-%d', date_of_birth)) AS age\nFROM patients\nORDER BY age DESC\nLIMIT 10;` },
    challenge: {
      level: 3,
      prompt: 'Inline the age_on function: list patients who are 65 or older on 2026-09-01 with patient_id, last_name and age in whole years (a birthday later in the year does not count yet). Sort by age descending, then patient_id.',
      solution: `SELECT patient_id, last_name,
       (strftime('%Y', '2026-09-01') - strftime('%Y', date_of_birth))
     - (strftime('%m-%d', '2026-09-01') < strftime('%m-%d', date_of_birth)) AS age
FROM patients
WHERE age >= 65
ORDER BY age DESC, patient_id;`,
      hints: ['Start with the difference of years: strftime(\'%Y\', \'2026-09-01\') - strftime(\'%Y\', date_of_birth).', 'Subtract 1 if the birthday (month-day) has not happened yet in 2026.', 'A comparison like strftime(\'%m-%d\', ...) < strftime(\'%m-%d\', ...) is 1 or 0 in SQLite.', 'Filter WHERE age >= 65 and ORDER BY age DESC, patient_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What must a PL/SQL function do?', options: ['COMMIT', 'RETURN a value', 'Have OUT parameters', 'Modify a table'], answer: 1, why: 'Functions always return a value.' },
      { q: 'Why can a function doing a SELECT per row be slow?', options: ['Functions are interpreted', 'It performs one lookup and context switch per row', 'Oracle forbids indexes', 'It locks the table'], answer: 1, why: 'Per-row work multiplies; a join does it set-based.' },
    ],
  },
  // ───────────────────────────── SQLite ─────────────────────────────
  {
    id: 'dialects-26',
    goals: ['What "embedded" means: the database is a library, not a server', 'Where SQLite is used (phones, browsers, devices, this app)', 'Single-file databases, transactions and WAL mode', 'Inspect the engine with sqlite_version() and PRAGMAs'],
    concept: `<p>Most databases are <b>servers</b>: a separate program you connect to over a network. <b>SQLite is a library</b> linked into your application. There is no server, no user accounts, no configuration: the whole database is <b>one ordinary file</b> (or, in this app, memory in your browser).</p>
<ul>
<li>Your app calls SQLite functions directly; queries run in your process, so there is no network round trip.</li>
<li>It is fully transactional (ACID) with a rollback journal or <b>WAL</b> (write-ahead log) mode.</li>
<li>Many readers can work at once, but only <b>one writer</b> at a time.</li>
<li>It is the most deployed database in the world: every phone, every browser, many cars, TVs and medical devices.</li>
</ul>
<p>This learning platform itself runs SQLite compiled to WebAssembly (sql.js) inside your browser tab.</p>`,
    why: 'Embedded databases give apps reliable SQL storage with zero administration, perfect for local, offline, or single-user data.',
    when: 'Mobile and desktop apps, offline-first clinic tablets, device logs, test databases, data files you ship around, and small websites.',
    analogy: 'A server database is the hospital\'s central records department: staff send requests and wait. SQLite is a locked filing cabinet built into each exam room: instant access for whoever is in the room, but only one person can write in it at a time.',
    syntax: `SELECT sqlite_version();\nPRAGMA journal_mode = WAL;\nPRAGMA table_info('table');`,
    sql: `SELECT sqlite_version() AS version,
       (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table') AS tables,
       (SELECT page_size FROM pragma_page_size)   AS page_size,
       (SELECT page_count FROM pragma_page_count) AS pages;`,
    breakdown: [
      ['sqlite_version()', 'The library version linked into this app (3.45 here)'],
      ['sqlite_master', 'The catalog table: one row per table, index, view and trigger'],
      ['pragma_page_size', 'PRAGMA as a table-valued function: size of each page in the file'],
      ['pragma_page_count', 'How many pages the database uses: size = page_size x page_count'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 250" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="13">
<text x="160" y="22" text-anchor="middle" fill="var(--text)" font-weight="bold">Client-server (PostgreSQL, MySQL...)</text>
<rect x="20" y="40" width="120" height="44" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="80" y="67" text-anchor="middle" fill="var(--text)">Billing app</text>
<line x1="140" y1="62" x2="190" y2="62" stroke="var(--muted)" stroke-dasharray="5"/><text x="165" y="55" text-anchor="middle" fill="var(--muted)" font-size="10">network</text>
<rect x="190" y="30" width="120" height="64" rx="6" fill="var(--panel2)" stroke="var(--blue)"/><text x="250" y="58" text-anchor="middle" fill="var(--text)">DB server</text><text x="250" y="76" text-anchor="middle" fill="var(--muted)" font-size="11">process, users</text>
<rect x="190" y="120" width="120" height="40" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="250" y="145" text-anchor="middle" fill="var(--text)">data files</text>
<line x1="250" y1="94" x2="250" y2="120" stroke="var(--muted)"/>
<text x="480" y="22" text-anchor="middle" fill="var(--text)" font-weight="bold">Embedded (SQLite)</text>
<rect x="370" y="36" width="220" height="130" rx="8" fill="none" stroke="var(--green)" stroke-width="2"/>
<text x="480" y="56" text-anchor="middle" fill="var(--green)">one application process</text>
<rect x="390" y="66" width="180" height="34" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="480" y="88" text-anchor="middle" fill="var(--text)">app code</text>
<rect x="390" y="112" width="180" height="40" rx="6" fill="var(--panel2)" stroke="var(--accent)"/><text x="480" y="137" text-anchor="middle" fill="var(--text)">SQLite library (function calls)</text>
<rect x="420" y="190" width="120" height="40" rx="6" fill="var(--panel2)" stroke="var(--yellow)"/><text x="480" y="215" text-anchor="middle" fill="var(--text)">billing.db (1 file)</text>
<line x1="480" y1="166" x2="480" y2="190" stroke="var(--muted)"/>
</svg>` },
    mistakes: [
      { wrong: `-- Put billing.db on a network share and let 40 workstations write to it`, why: 'SQLite relies on file locks, which are unreliable on many network file systems, and it allows only one writer at a time. Shared multi-user systems need a client-server database.', fix: `SELECT * FROM pragma_database_list;` },
      { wrong: `-- Hold a write transaction open while the user fills in a form`, why: 'Only one writer at a time: every other writer waits (SQLITE_BUSY). Keep write transactions short.', fix: `SELECT COUNT(*) FROM payments;` },
    ],
    rules: ['SQLite is a library + a file, not a server.', 'Many readers, one writer at a time.', 'Use WAL mode for better read/write concurrency.', 'Great for local data; not for many concurrent writers over a network.'],
    compare: `<table><tr><th></th><th>SQLite</th><th>Server databases</th></tr>
<tr><td>Setup</td><td>None</td><td>Install, configure, users</td></tr>
<tr><td>Access</td><td>Function calls in-process</td><td>Network protocol</td></tr>
<tr><td>Concurrency</td><td>One writer</td><td>Many writers</td></tr>
<tr><td>Security</td><td>File permissions</td><td>Users, roles, grants</td></tr>
<tr><td>Size limits</td><td>Up to ~281 TB</td><td>Practically unlimited</td></tr></table>`,
    realWorld: 'Clinic tablets capture charges offline in SQLite and sync to the central billing server later; medical devices keep local logs in SQLite; browsers store history and cookies in it.',
    tips: ['The .db file is portable across operating systems and CPU types.', 'Use PRAGMA foreign_keys = ON; foreign keys are off by default for backward compatibility (this app turns them on).'],
    deep: `<p>In WAL mode, writers append changes to a separate -wal file while readers keep reading the main file plus the parts of the WAL they are allowed to see. A checkpoint later copies WAL pages back. This lets readers and one writer proceed at the same time.</p>`,
    tryIt: { prompt: 'Explore the engine: PRAGMAs can be queried like tables. Try pragma_compile_options, pragma_foreign_keys, and pragma_journal_mode.', starter: `SELECT * FROM pragma_foreign_keys;\nSELECT * FROM pragma_journal_mode;\nSELECT compile_options FROM pragma_compile_options LIMIT 10;` },
    challenge: {
      level: 1,
      prompt: 'Summarize the catalog: from sqlite_master, show each object type (table, index, ...) and how many objects of that type exist, sorted by type.',
      solution: `SELECT type, COUNT(*) AS objects
FROM sqlite_master
GROUP BY type
ORDER BY type;`,
      hints: ['The catalog table is sqlite_master.', 'It has a type column.', 'GROUP BY type with COUNT(*).', 'SELECT type, COUNT(*) FROM sqlite_master GROUP BY type ORDER BY type;'],
      ordered: true,
    },
    quiz: [
      { q: 'What is SQLite?', options: ['A lightweight database server', 'A library that stores the database in one file', 'A cloud service', 'A MySQL fork'], answer: 1, why: 'SQLite is an embedded library; there is no server process.' },
      { q: 'How many writers can SQLite have at the same moment?', options: ['Unlimited', 'One', 'One per table', 'Two'], answer: 1, why: 'SQLite serializes writes at the database level.' },
    ],
  },
  {
    id: 'dialects-27',
    goals: ['Flexible typing and type affinity: what SQLite does NOT enforce', 'Limited ALTER TABLE and missing features (RIGHT(), ROLLUP, procedures)', 'Concurrency and access-control limits', 'Workarounds for each limitation'],
    concept: `<p>SQLite is small on purpose, so some things other databases do are missing or looser:</p>
<ul>
<li><b>Flexible types</b>: a column declared <code>INTEGER</code> will happily store <code>'abc'</code>. The declared type is only an <b>affinity</b> (a preference). Use <code>STRICT</code> tables or CHECK constraints to enforce types.</li>
<li><b>No date or decimal type</b>: dates are TEXT/REAL/INTEGER; money is REAL (binary floating point) unless you store cents as INTEGER.</li>
<li><b>ALTER TABLE</b>: can add, rename and drop columns, but not change a column's type or add a constraint to an existing column. The workaround is "create new table, copy, drop, rename".</li>
<li><b>Missing SQL</b>: no ROLLUP/CUBE, no stored procedures, no <code>RIGHT()</code>/<code>LEFT()</code> string functions, no REGEXP by default, no users or GRANT.</li>
<li><b>One writer</b> at a time.</li>
</ul>`,
    why: 'Knowing the limits avoids silent data problems (text in number columns) and tells you when SQLite is the wrong tool.',
    when: 'Before choosing SQLite for a project, when porting SQL to or from SQLite, and when designing schemas that must stay clean.',
    analogy: 'SQLite\'s flexible typing is like a paper form with no field validation: someone can write "unknown" in the amount box and the form accepts it. STRICT mode is switching to an electronic form that refuses letters in number fields.',
    syntax: `CREATE TABLE t (...) STRICT;\nSELECT typeof(col) FROM t;\nCHECK (typeof(col) = 'integer')`,
    sql: `CREATE TABLE loose_charges (charge_id INTEGER, amount INTEGER);
INSERT INTO loose_charges VALUES (1, 125), (2, '125.50'), (3, 'call payor'), (4, NULL);

SELECT charge_id, amount, typeof(amount) AS stored_as
FROM loose_charges;`,
    breakdown: [
      ['amount INTEGER', 'Declares an affinity, not a hard rule'],
      ['\'125.50\'', 'Text that looks numeric is converted: stored as REAL 125.5'],
      ['\'call payor\'', 'Not numeric: stored as TEXT in an INTEGER column, no error'],
      ['typeof(amount)', 'Shows the actual storage class of each value'],
    ],
    dialectSql: {
      mysql: `-- strict SQL mode: error "Incorrect integer value: 'call payor'"\nINSERT INTO charges_x (amount) VALUES ('call payor');`,
      postgres: `-- ERROR: invalid input syntax for type integer: "call payor"\nINSERT INTO charges_x (amount) VALUES ('call payor');`,
      sqlserver: `-- Conversion failed when converting the varchar value 'call payor' to data type int.\nINSERT INTO charges_x (amount) VALUES ('call payor');`,
      oracle: `-- ORA-01722: invalid number\nINSERT INTO charges_x (amount) VALUES ('call payor');`,
      sqlite: `-- accepted and stored as TEXT (unless the table is STRICT)\nINSERT INTO charges_x (amount) VALUES ('call payor');`,
    },
    mistakes: [
      { wrong: `ALTER TABLE invoices ALTER COLUMN total_amount TYPE NUMERIC(12,2);`, why: 'SQLite cannot change a column type or add constraints to existing columns. Create a new table with the right definition, copy the data, drop the old one, and rename.', fix: `CREATE TABLE invoices_new AS SELECT * FROM invoices;\nSELECT COUNT(*) FROM invoices_new;` },
      { wrong: `SELECT RIGHT(cpt_code, 2) FROM charges;`, why: 'SQLite has no RIGHT()/LEFT(). Use substr with a negative start.', fix: `SELECT cpt_code, substr(cpt_code, -2) AS last_two, substr(cpt_code, 1, 3) AS first_three FROM charges LIMIT 5;` },
    ],
    rules: ['Declared types are affinities; check with typeof().', 'Use STRICT tables or CHECK(typeof(...)) to enforce types.', 'Complex ALTERs = rebuild the table.', 'Emulate ROLLUP with UNION ALL; RIGHT(s,n) with substr(s,-n).'],
    compare: `<table><tr><th>Missing in SQLite</th><th>Workaround</th></tr>
<tr><td>ROLLUP / CUBE</td><td>UNION ALL of detail + totals</td></tr>
<tr><td>Stored procedures</td><td>Application code, triggers, views</td></tr>
<tr><td>RIGHT / LEFT</td><td><code>substr(s, -n)</code> / <code>substr(s, 1, n)</code></td></tr>
<tr><td>ALTER COLUMN TYPE</td><td>Create-copy-drop-rename</td></tr>
<tr><td>Users / GRANT</td><td>File-system permissions</td></tr>
<tr><td>DECIMAL</td><td>Integer cents</td></tr></table>`,
    realWorld: 'Apps that sync clinic data from SQLite to a server database often hit rejects because SQLite accepted "N/A" in a numeric column; teams add STRICT tables or CHECK constraints to stop it at the source.',
    tips: ['STRICT tables (3.37+) allow only INT, INTEGER, REAL, TEXT, BLOB, ANY.', 'PRAGMA integrity_check verifies the file.'],
    deep: `<p>Affinity rules: a column with INTEGER or NUMERIC affinity tries to convert text that looks like a number; if conversion is lossless it stores the number, otherwise the text. That is why '125.50' becomes REAL 125.5 but 'call payor' stays TEXT.</p>`,
    tryIt: { prompt: 'Try the STRICT version: the third INSERT now fails. Remove the bad row to make the script run, then query typeof(amount).', starter: `CREATE TABLE strict_charges (charge_id INTEGER, amount INTEGER) STRICT;\nINSERT INTO strict_charges VALUES (1, 125);\nINSERT INTO strict_charges VALUES (2, 300);\n-- INSERT INTO strict_charges VALUES (3, 'call payor');  -- uncomment: cannot store TEXT value in INTEGER column\nSELECT charge_id, amount, typeof(amount) FROM strict_charges;` },
    challenge: {
      level: 3,
      prompt: 'SQLite has no ROLLUP. Emulate GROUP BY ROLLUP(status): return each invoice status with its invoice count and total_amount sum, plus a final grand-total row labelled \'TOTAL\'. Sort so statuses come alphabetically and TOTAL is last.',
      solution: `SELECT status, invoices, billed
FROM (
  SELECT status, COUNT(*) AS invoices, SUM(total_amount) AS billed
  FROM invoices
  GROUP BY status
  UNION ALL
  SELECT 'TOTAL', COUNT(*), SUM(total_amount)
  FROM invoices
)
ORDER BY status = 'TOTAL', status;`,
      hints: ['Write the normal GROUP BY status query first.', 'Write a second query for the grand total with no GROUP BY, labelled \'TOTAL\'.', 'Combine them with UNION ALL inside a subquery.', 'Outside, ORDER BY status = \'TOTAL\', status (the comparison is 0 for details and 1 for the total row).'],
      ordered: true,
    },
    quiz: [
      { q: 'What happens when you insert \'abc\' into a non-STRICT INTEGER column in SQLite?', options: ['Error', 'Stored as 0', 'Stored as TEXT', 'Stored as NULL'], answer: 2, why: 'Affinity cannot convert it, so the text is stored as-is.' },
      { q: 'How do you get the last two characters of a string in SQLite?', options: ['RIGHT(s, 2)', 'substr(s, -2)', 'LAST(s, 2)', 's[-2:]'], answer: 1, why: 'A negative start in substr counts from the end.' },
    ],
  },
  {
    id: 'dialects-28',
    goals: ['Storage classes and typeof()', 'Dates with date(), julianday(), strftime() and modifiers', 'JSON functions, rowid, INSERT OR IGNORE/REPLACE', 'Schema introspection with PRAGMA table_info and pragma table-valued functions'],
    concept: `<p>SQLite has its own set of distinctive features, all runnable here:</p>
<ul>
<li><code>typeof(x)</code> returns the storage class: null, integer, real, text or blob.</li>
<li><b>Date functions</b> work on ISO text: <code>date('2026-09-01', '+1 month', 'start of month')</code>, <code>julianday()</code> for differences, <code>strftime('%Y-%m', d)</code> for formats.</li>
<li><b>JSON</b>: <code>json_object</code>, <code>json_extract</code>, <code>-></code>/<code>->></code>, <code>json_each</code>, <code>json_group_array</code>.</li>
<li>Every ordinary table has a hidden <code>rowid</code>; <code>INTEGER PRIMARY KEY</code> is an alias for it.</li>
<li>Conflict clauses: <code>INSERT OR IGNORE</code>, <code>INSERT OR REPLACE</code>, and UPSERT with <code>ON CONFLICT</code>.</li>
<li><b>PRAGMA functions</b>: <code>pragma_table_info('invoices')</code>, <code>pragma_foreign_key_list</code>, <code>pragma_index_list</code> can be queried with SELECT.</li>
<li>Also: <code>iif()</code>, <code>printf()/format()</code>, partial indexes, generated columns, <code>STRICT</code> and <code>WITHOUT ROWID</code> tables.</li>
</ul>`,
    why: 'These features make SQLite far more capable than its size suggests, and introspection lets you explore any schema with SQL alone.',
    when: 'Local analytics, schema exploration, date bucketing, lightweight JSON storage, and idempotent inserts.',
    analogy: 'PRAGMA table_info is like asking the records room for the blank template of a form: it tells you every field, its type, whether it is required, and its default.',
    syntax: `SELECT * FROM pragma_table_info('table');\ntypeof(x)\nstrftime('%Y-%m', d)  date(d, '+30 days')\nINSERT OR IGNORE INTO ...`,
    sql: `SELECT cid, name, type, "notnull", dflt_value, pk
FROM pragma_table_info('invoices');`,
    breakdown: [
      ['pragma_table_info(\'invoices\')', 'Table-valued PRAGMA: one row per column'],
      ['cid, name, type', 'Column position, name and declared type'],
      ['"notnull"', 'Quoted because NOTNULL is also a keyword: 1 if NOT NULL'],
      ['dflt_value', 'Default value expression, if any'],
      ['pk', 'Position in the primary key (0 if not part of it)'],
    ],
    mistakes: [
      { wrong: `SELECT invoice_id, strftime('%Y-%m', invoice_date) FROM invoices WHERE invoice_date > '2026-1-5';`, why: 'Dates are compared as text. \'2026-1-5\' is not ISO format, so comparisons and date functions misbehave. Always use zero-padded YYYY-MM-DD.', fix: `SELECT invoice_id, invoice_date FROM invoices WHERE invoice_date > '2026-01-05' ORDER BY invoice_date LIMIT 5;` },
      { wrong: `SELECT notnull FROM pragma_table_info('invoices');`, why: 'NOTNULL is a keyword in SQLite, so the bare column name is a syntax error. Quote it: "notnull".', fix: `SELECT name, "notnull" FROM pragma_table_info('invoices');` },
    ],
    rules: ['typeof() shows what is really stored.', 'Keep dates as ISO YYYY-MM-DD text.', 'pragma_* functions make metadata queryable with SELECT and joins.', 'INTEGER PRIMARY KEY = the rowid.'],
    compare: `<table><tr><th>Need</th><th>SQLite</th><th>Elsewhere</th></tr>
<tr><td>Describe table</td><td><code>pragma_table_info</code></td><td><code>information_schema.columns</code></td></tr>
<tr><td>Storage type of a value</td><td><code>typeof()</code></td><td><code>pg_typeof()</code> (PostgreSQL)</td></tr>
<tr><td>Ignore duplicates</td><td><code>INSERT OR IGNORE</code></td><td><code>INSERT IGNORE</code> (MySQL), <code>ON CONFLICT DO NOTHING</code></td></tr>
<tr><td>Month bucket</td><td><code>strftime('%Y-%m', d)</code></td><td><code>date_trunc</code>, <code>DATE_FORMAT</code></td></tr></table>`,
    realWorld: 'Mobile charge-capture apps use INSERT OR IGNORE for idempotent sync, strftime for monthly summaries, and pragma_table_info in migrations to check whether a column already exists before adding it.',
    tips: ['sqlite_schema is the newer name for sqlite_master.', 'Use PRAGMA table_xinfo to also see hidden/generated columns.'],
    deep: `<p>Table-valued PRAGMA functions can be joined: <code>SELECT m.name, p.name FROM sqlite_master m JOIN pragma_table_info(m.name) p</code> lists every column of every table, a full data dictionary in one query.</p>`,
    tryIt: { prompt: 'Mix of SQLite features. Run it, then change the modifier to \'start of year\' and add typeof(total_amount).', starter: `SELECT invoice_id,\n       invoice_date,\n       date(invoice_date, 'start of month', '+1 month', '-1 day') AS month_end,\n       strftime('%Y-%m', invoice_date)                            AS bill_month,\n       json_object('id', invoice_id, 'status', status)            AS doc,\n       typeof(invoice_date)                                       AS date_storage,\n       rowid\nFROM invoices\nORDER BY invoice_id\nLIMIT 6;` },
    challenge: {
      level: 2,
      prompt: 'Build a data dictionary: for every table in sqlite_master, list table name, column name and declared type for columns that are NOT NULL and are not part of the primary key. Sort by table name, then column position (cid).',
      solution: `SELECT m.name AS table_name, p.name AS column_name, p.type
FROM sqlite_master m
JOIN pragma_table_info(m.name) p
WHERE m.type = 'table'
  AND p."notnull" = 1
  AND p.pk = 0
ORDER BY m.name, p.cid;`,
      hints: ['Tables come from sqlite_master WHERE type = \'table\'.', 'Join each table to pragma_table_info(m.name).', 'Filter p."notnull" = 1 AND p.pk = 0 (quote notnull).', 'ORDER BY m.name, p.cid'],
      ordered: true,
    },
    quiz: [
      { q: 'What does typeof(\'2026-09-01\') return?', options: ['date', 'text', 'integer', 'datetime'], answer: 1, why: 'SQLite has no date type; ISO dates are text.' },
      { q: 'What is INTEGER PRIMARY KEY in SQLite?', options: ['A normal unique index', 'An alias for the rowid', 'A sequence', 'Not allowed'], answer: 1, why: 'It becomes the table\'s rowid, the clustered B-tree key.' },
    ],
  },
  // ───────────────────────── Cross-Database ─────────────────────────
  {
    id: 'dialects-29',
    goals: ['Write one business question in five dialects', 'Spot the parts that change: limits, dates, concatenation, null functions', 'Recognize the portable core of SQL', 'Translate a report from any dialect into SQLite'],
    concept: `<p>The business question: <b>"Top 5 payors by amount billed in 2025, with invoice count and average invoice."</b></p>
<p>The heart of the query (SELECT, JOIN, WHERE, GROUP BY, ORDER BY, SUM, COUNT, AVG) is the same everywhere. Only a few "edges" change:</p>
<ul>
<li><b>Row limit</b>: LIMIT (MySQL, PostgreSQL, SQLite), TOP (SQL Server), FETCH FIRST (Oracle, standard).</li>
<li><b>Dates</b>: date literals and year extraction differ (YEAR(), EXTRACT(), strftime()).</li>
<li><b>String concatenation</b>: CONCAT, ||, +.</li>
<li><b>Null functions</b>: IFNULL, ISNULL, NVL; COALESCE works everywhere.</li>
<li><b>Rounding and division</b>: ROUND is universal, integer division is not.</li>
</ul>
<p>A good habit: write the portable core first, then adapt the edges. A range filter on the raw date (<code>invoice_date &gt;= '2025-01-01' AND invoice_date &lt; '2026-01-01'</code>) is portable <i>and</i> index-friendly.</p>`,
    why: 'Real organizations run several databases. Being able to move a query between them is a core professional skill.',
    when: 'Migrations, multi-database reporting, reading vendor documentation, and interviews.',
    analogy: 'The same claim goes to five payors: the diagnosis and procedure codes (the SQL core) never change, but each payor wants its own form layout (the dialect edges).',
    syntax: `-- portable core\nSELECT ... FROM ... JOIN ... WHERE ... GROUP BY ... ORDER BY ...\n-- dialect edges: LIMIT / TOP / FETCH FIRST, date functions, concatenation`,
    sql: `SELECT p.payor_name,
       COUNT(*)                        AS invoices,
       SUM(i.total_amount)             AS billed,
       ROUND(AVG(i.total_amount), 2)   AS avg_invoice
FROM invoices i
JOIN payors p ON p.payor_id = i.payor_id
WHERE i.invoice_date >= '2025-01-01'
  AND i.invoice_date <  '2026-01-01'
GROUP BY p.payor_name
ORDER BY billed DESC
LIMIT 5;`,
    breakdown: [
      ['JOIN payors p ON ...', 'Portable in every database'],
      ['WHERE invoice_date >= \'2025-01-01\' AND < \'2026-01-01\'', 'Half-open date range: portable and can use an index'],
      ['ROUND(AVG(...), 2)', 'Universal functions'],
      ['LIMIT 5', 'The dialect edge: TOP 5 / FETCH FIRST 5 ROWS ONLY elsewhere'],
    ],
    dialectSql: {
      mysql: `SELECT p.payor_name, COUNT(*) AS invoices, SUM(i.total_amount) AS billed,\n       ROUND(AVG(i.total_amount), 2) AS avg_invoice\nFROM invoices i JOIN payors p ON p.payor_id = i.payor_id\nWHERE i.invoice_date >= '2025-01-01' AND i.invoice_date < '2026-01-01'\nGROUP BY p.payor_name\nORDER BY billed DESC\nLIMIT 5;`,
      postgres: `SELECT p.payor_name, COUNT(*) AS invoices, SUM(i.total_amount) AS billed,\n       ROUND(AVG(i.total_amount), 2) AS avg_invoice\nFROM invoices i JOIN payors p ON p.payor_id = i.payor_id\nWHERE i.invoice_date >= DATE '2025-01-01' AND i.invoice_date < DATE '2026-01-01'\nGROUP BY p.payor_name\nORDER BY billed DESC\nLIMIT 5;`,
      sqlserver: `SELECT TOP 5 p.payor_name, COUNT(*) AS invoices, SUM(i.total_amount) AS billed,\n       ROUND(AVG(i.total_amount), 2) AS avg_invoice\nFROM invoices i JOIN payors p ON p.payor_id = i.payor_id\nWHERE i.invoice_date >= '2025-01-01' AND i.invoice_date < '2026-01-01'\nGROUP BY p.payor_name\nORDER BY billed DESC;`,
      oracle: `SELECT p.payor_name, COUNT(*) AS invoices, SUM(i.total_amount) AS billed,\n       ROUND(AVG(i.total_amount), 2) AS avg_invoice\nFROM invoices i JOIN payors p ON p.payor_id = i.payor_id\nWHERE i.invoice_date >= DATE '2025-01-01' AND i.invoice_date < DATE '2026-01-01'\nGROUP BY p.payor_name\nORDER BY billed DESC\nFETCH FIRST 5 ROWS ONLY;`,
      sqlite: `SELECT p.payor_name, COUNT(*) AS invoices, SUM(i.total_amount) AS billed,\n       ROUND(AVG(i.total_amount), 2) AS avg_invoice\nFROM invoices i JOIN payors p ON p.payor_id = i.payor_id\nWHERE i.invoice_date >= '2025-01-01' AND i.invoice_date < '2026-01-01'\nGROUP BY p.payor_name\nORDER BY billed DESC\nLIMIT 5;`,
    },
    mistakes: [
      { wrong: `WHERE YEAR(i.invoice_date) = 2025`, why: 'YEAR() exists in MySQL and SQL Server but not PostgreSQL, Oracle or SQLite, and wrapping the column in a function usually prevents index use. A date range is portable and faster.', fix: `SELECT COUNT(*) FROM invoices WHERE invoice_date >= '2025-01-01' AND invoice_date < '2026-01-01';` },
      { wrong: `SELECT TOP 5 ... ORDER BY billed DESC LIMIT 5;`, why: 'Mixing limit styles from two dialects is invalid everywhere. Pick the one your database speaks.', fix: `SELECT invoice_id FROM invoices ORDER BY total_amount DESC LIMIT 5;` },
    ],
    rules: ['Write the portable core first; adapt the edges.', 'COALESCE, CASE, CAST, ROUND and standard joins work everywhere.', 'Filter dates with half-open ranges, not YEAR().', 'FETCH FIRST n ROWS ONLY is the standard limit (not in MySQL or SQLite).'],
    compare: `<table><tr><th>Edge</th><th>MySQL</th><th>PostgreSQL</th><th>SQL Server</th><th>Oracle</th><th>SQLite</th></tr>
<tr><td>Limit</td><td>LIMIT</td><td>LIMIT / FETCH</td><td>TOP / FETCH</td><td>FETCH</td><td>LIMIT</td></tr>
<tr><td>Year of date</td><td>YEAR(d)</td><td>EXTRACT(YEAR FROM d)</td><td>YEAR(d)</td><td>EXTRACT(YEAR FROM d)</td><td>strftime('%Y', d)</td></tr>
<tr><td>Concat</td><td>CONCAT</td><td>||</td><td>+ / CONCAT</td><td>||</td><td>||</td></tr>
<tr><td>Null fallback</td><td>IFNULL</td><td>COALESCE</td><td>ISNULL</td><td>NVL</td><td>IFNULL</td></tr></table>`,
    realWorld: 'A health network with Epic (on SQL Server/Oracle Clarity/Caboodle), a PostgreSQL data warehouse and MySQL-based portal needs the same payor-mix report on all three; analysts keep a portable core and swap the edges.',
    tips: ['Use explicit ANSI JOIN syntax; old comma joins with (+) or *= are dialect-specific.', 'Alias everything so ORDER BY can use the alias in every database.'],
    deep: `<p>Tools such as SQLGlot can transpile SQL between dialects automatically, but they still struggle with semantics that differ silently (integer division, empty-string NULLs in Oracle, collation). Always test translated queries against real data.</p>`,
    tryIt: { prompt: 'The SQLite version runs. Change the year to 2026 and add a column with the payor type.', starter: `SELECT p.payor_name,\n       COUNT(*)                      AS invoices,\n       SUM(i.total_amount)           AS billed,\n       ROUND(AVG(i.total_amount), 2) AS avg_invoice\nFROM invoices i\nJOIN payors p ON p.payor_id = i.payor_id\nWHERE i.invoice_date >= '2025-01-01'\n  AND i.invoice_date <  '2026-01-01'\nGROUP BY p.payor_name\nORDER BY billed DESC\nLIMIT 5;` },
    challenge: {
      level: 2,
      prompt: 'Translate this SQL Server query to SQLite: SELECT TOP 3 l.location_name, COUNT(*) AS invoices, SUM(i.total_amount) AS billed FROM invoices i JOIN treatment_locations l ON l.location_id = i.location_id WHERE YEAR(i.invoice_date) = 2025 GROUP BY l.location_name ORDER BY billed DESC;',
      solution: `SELECT l.location_name, COUNT(*) AS invoices, SUM(i.total_amount) AS billed
FROM invoices i
JOIN treatment_locations l ON l.location_id = i.location_id
WHERE i.invoice_date >= '2025-01-01' AND i.invoice_date < '2026-01-01'
GROUP BY l.location_name
ORDER BY billed DESC
LIMIT 3;`,
      hints: ['The joins, GROUP BY and aggregates stay the same.', 'SQLite has no YEAR(): use a date range (or strftime(\'%Y\', d) = \'2025\').', 'TOP 3 becomes LIMIT 3 at the end.', '... WHERE i.invoice_date >= \'2025-01-01\' AND i.invoice_date < \'2026-01-01\' GROUP BY l.location_name ORDER BY billed DESC LIMIT 3;'],
      ordered: true,
    },
    quiz: [
      { q: 'Which part of a query usually needs changing between dialects?', options: ['JOIN syntax', 'GROUP BY', 'Row limiting and date functions', 'SUM and COUNT'], answer: 2, why: 'The core is portable; limits, dates and string functions are the usual edges.' },
      { q: 'Which null-replacement function works in all five databases?', options: ['NVL', 'ISNULL', 'IFNULL', 'COALESCE'], answer: 3, why: 'COALESCE is standard SQL.' },
    ],
  },
  {
    id: 'dialects-30',
    goals: ['Paginate in every dialect: LIMIT/OFFSET, OFFSET/FETCH, TOP, ROWNUM', 'Legacy Oracle and SQL Server patterns you will still meet', 'Keyset pagination with row values', 'A deterministic order as the foundation of all paging'],
    concept: `<p>Pagination has two parts: a <b>stable, unique order</b>, and a way to <b>skip</b> and <b>take</b> rows.</p>
<ul>
<li><b>MySQL / PostgreSQL / SQLite</b>: <code>LIMIT 10 OFFSET 20</code> (MySQL also <code>LIMIT 20, 10</code>).</li>
<li><b>Standard, PostgreSQL, SQL Server 2012+, Oracle 12c+</b>: <code>OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY</code>.</li>
<li><b>Old Oracle</b>: nested ROWNUM subqueries. <b>Old SQL Server</b>: ROW_NUMBER() in a CTE with <code>WHERE rn BETWEEN 21 AND 30</code>.</li>
<li><b>Keyset (seek)</b>: <code>WHERE (invoice_date, invoice_id) &gt; (:last_date, :last_id) ORDER BY invoice_date, invoice_id LIMIT 10</code>. Fast on any page, stable during inserts.</li>
</ul>
<p>The ROW_NUMBER() approach works in <b>every</b> modern database, including SQLite, so it is the universal fallback.</p>`,
    why: 'Paging appears in every application and every dialect writes it differently; the ROW_NUMBER and keyset patterns work almost everywhere.',
    when: 'Building list screens and APIs, exporting large tables, porting paging code between databases.',
    analogy: 'OFFSET pagination is telling the file clerk "skip the first 200 folders and bring me 20". Keyset is "bring me the 20 folders right after folder #4412", which the clerk can find instantly.',
    syntax: `LIMIT n OFFSET m                      -- MySQL, PostgreSQL, SQLite\nOFFSET m ROWS FETCH NEXT n ROWS ONLY  -- standard\nWHERE rn BETWEEN m+1 AND m+n          -- ROW_NUMBER() anywhere`,
    sql: `WITH numbered AS (
  SELECT invoice_id, invoice_date, status, total_amount,
         ROW_NUMBER() OVER (ORDER BY invoice_date, invoice_id) AS rn
  FROM invoices
)
SELECT invoice_id, invoice_date, status, total_amount, rn
FROM numbered
WHERE rn BETWEEN 11 AND 20
ORDER BY rn;`,
    breakdown: [
      ['ROW_NUMBER() OVER (ORDER BY invoice_date, invoice_id)', 'Numbers every row in a unique order'],
      ['WITH numbered AS (...)', 'Name the numbered set'],
      ['WHERE rn BETWEEN 11 AND 20', 'Page 2 with 10 per page'],
    ],
    dialectSql: {
      mysql: `SELECT invoice_id, invoice_date FROM invoices\nORDER BY invoice_date, invoice_id\nLIMIT 10 OFFSET 10;          -- or LIMIT 10, 10`,
      postgres: `SELECT invoice_id, invoice_date FROM invoices\nORDER BY invoice_date, invoice_id\nOFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY;   -- or LIMIT 10 OFFSET 10`,
      sqlserver: `SELECT invoice_id, invoice_date FROM invoices\nORDER BY invoice_date, invoice_id\nOFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY;`,
      oracle: `-- 12c+\nSELECT invoice_id, invoice_date FROM invoices\nORDER BY invoice_date, invoice_id\nOFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY;\n-- 11g and older\nSELECT * FROM (SELECT t.*, ROWNUM rn FROM (\n  SELECT invoice_id, invoice_date FROM invoices ORDER BY invoice_date, invoice_id) t\n  WHERE ROWNUM <= 20) WHERE rn > 10;`,
      sqlite: `SELECT invoice_id, invoice_date FROM invoices\nORDER BY invoice_date, invoice_id\nLIMIT 10 OFFSET 10;`,
    },
    mistakes: [
      { wrong: `SELECT * FROM (SELECT invoice_id, ROWNUM rn FROM invoices ORDER BY invoice_date) WHERE rn BETWEEN 11 AND 20;  -- Oracle`, why: 'ROWNUM is assigned before the ORDER BY in the same query block, so the numbers follow arbitrary read order. Sort in an inner query first, then apply ROWNUM outside.', fix: `SELECT invoice_id FROM invoices ORDER BY invoice_date, invoice_id LIMIT 10 OFFSET 10;` },
      { wrong: `SELECT invoice_id FROM invoices ORDER BY invoice_date LIMIT 10 OFFSET 10;`, why: 'Many invoices share a date (several on 2026-08-28), so their order between requests is not guaranteed. Add invoice_id as a tie-breaker.', fix: `SELECT invoice_id, invoice_date FROM invoices ORDER BY invoice_date, invoice_id LIMIT 10 OFFSET 10;` },
    ],
    rules: ['Always order by something unique.', 'ROW_NUMBER() paging works in every modern database.', 'Keyset beats OFFSET for deep pages and exports.', 'Old Oracle: sort inside, ROWNUM outside.'],
    compare: `<table><tr><th>Method</th><th>MySQL</th><th>PostgreSQL</th><th>SQL Server</th><th>Oracle</th><th>SQLite</th></tr>
<tr><td>LIMIT/OFFSET</td><td>Yes</td><td>Yes</td><td>No</td><td>No</td><td>Yes</td></tr>
<tr><td>OFFSET/FETCH</td><td>No</td><td>Yes</td><td>2012+</td><td>12c+</td><td>No</td></tr>
<tr><td>ROW_NUMBER()</td><td>8.0+</td><td>Yes</td><td>Yes</td><td>Yes</td><td>3.25+</td></tr>
<tr><td>Row-value keyset</td><td>Yes</td><td>Yes</td><td>No (use OR form)</td><td>No (use OR form)</td><td>Yes</td></tr></table>`,
    realWorld: 'A billing API used by a portal returns /invoices?after=2025-11-03_31&limit=20 (keyset), while an internal admin grid on SQL Server uses OFFSET/FETCH page numbers.',
    tips: ['Return a "next cursor" (the last key) from APIs instead of page numbers.', 'Index the sort columns in the same order as ORDER BY.'],
    deep: `<p>For keyset pagination in databases without row-value comparison, expand <code>(a, b) &gt; (x, y)</code> to <code>a &gt; x OR (a = x AND b &gt; y)</code>. Adding the redundant <code>a &gt;= x AND (...)</code> helps some optimizers use the index range.</p>`,
    tryIt: { prompt: 'Keyset pagination in SQLite with a row value. The last row of the previous page was (2025-06-14, 24). Change the bookmark to get the page after this one.', starter: `SELECT invoice_id, invoice_date, status, total_amount\nFROM invoices\nWHERE (invoice_date, invoice_id) > ('2025-06-14', 24)\nORDER BY invoice_date, invoice_id\nLIMIT 5;` },
    challenge: {
      level: 3,
      prompt: 'Keyset page: invoices ordered by invoice_date then invoice_id ascending, returning the 5 rows that come right after the bookmark (invoice_date = \'2025-06-14\', invoice_id = 24). Write it WITHOUT row-value syntax (the portable OR form used by SQL Server and Oracle). Show invoice_id and invoice_date.',
      solution: `SELECT invoice_id, invoice_date
FROM invoices
WHERE invoice_date > '2025-06-14'
   OR (invoice_date = '2025-06-14' AND invoice_id > 24)
ORDER BY invoice_date, invoice_id
LIMIT 5;`,
      hints: ['"After the bookmark" means a later date, or the same date with a larger id.', 'invoice_date > \'2025-06-14\' OR (invoice_date = \'2025-06-14\' AND invoice_id > 24)', 'Order by the same two columns as the bookmark.', 'ORDER BY invoice_date, invoice_id LIMIT 5'],
      ordered: true,
    },
    quiz: [
      { q: 'Which paging method works in MySQL 8, PostgreSQL, SQL Server, Oracle and SQLite alike?', options: ['LIMIT/OFFSET', 'TOP', 'ROW_NUMBER() in a subquery/CTE', 'ROWNUM'], answer: 2, why: 'ROW_NUMBER() is supported by all of them.' },
      { q: 'Why add invoice_id to ORDER BY invoice_date for paging?', options: ['Speed only', 'To make the order unique so pages do not overlap or skip rows', 'It is required syntax', 'To sort descending'], answer: 1, why: 'Ties make the order non-deterministic across requests.' },
    ],
  },
  {
    id: 'dialects-31',
    goals: ['Date arithmetic across the five dialects', 'Formatting and truncating dates to months and quarters', 'String concatenation, substring, length and padding differences', 'NULL and empty-string behaviour differences'],
    concept: `<p>Dates and strings are where dialects differ the most. The same idea, "days between two dates", has five spellings:</p>
<ul>
<li>MySQL <code>DATEDIFF(a, b)</code>; SQL Server <code>DATEDIFF(day, b, a)</code>; PostgreSQL and Oracle <code>a - b</code>; SQLite <code>julianday(a) - julianday(b)</code>.</li>
</ul>
<p>Month buckets: <code>DATE_FORMAT(d,'%Y-%m')</code>, <code>to_char(d,'YYYY-MM')</code> / <code>date_trunc('month', d)</code>, <code>FORMAT(d,'yyyy-MM')</code> / <code>DATETRUNC(month, d)</code>, <code>TO_CHAR(d,'YYYY-MM')</code> / <code>TRUNC(d,'MM')</code>, <code>strftime('%Y-%m', d)</code>.</p>
<p>Strings:</p>
<ul>
<li>Concatenation: <code>CONCAT()</code> (MySQL), <code>||</code> (PostgreSQL, Oracle, SQLite), <code>+</code> (SQL Server).</li>
<li>Length: <code>LENGTH</code> vs <code>LEN</code> (SQL Server, which ignores trailing spaces).</li>
<li>Substring: <code>SUBSTRING</code> vs <code>SUBSTR</code>; position: <code>LOCATE</code>, <code>POSITION</code>, <code>CHARINDEX</code>, <code>INSTR</code>.</li>
<li>NULL: <code>'a' || NULL</code> is NULL in PostgreSQL and SQLite, but <code>'a'</code> in Oracle (where NULL behaves like ''). CONCAT() skips NULLs in PostgreSQL and SQL Server but not in MySQL.</li>
</ul>`,
    why: 'Most porting bugs are silent date or string differences: wrong sign on day counts, NULL labels, or off-by-one substrings.',
    when: 'Writing aging reports, month/quarter summaries, and formatted labels that must work on more than one database.',
    analogy: 'Each database writes dates like a different country: 09/01, 01.09, 2026-09-01. The day is the same; you just have to read and write the local format correctly.',
    syntax: `-- SQLite toolbox\njulianday(a) - julianday(b)\nstrftime('%Y-%m', d)   date(d, 'start of month')\na || b   substr(s, start, len)   instr(s, sub)   length(s)`,
    sql: `SELECT invoice_id,
       'INV-' || invoice_id || ' (' || status || ')'                    AS label,
       strftime('%Y-%m', invoice_date)                                   AS bill_month,
       'Q' || ((CAST(strftime('%m', invoice_date) AS INTEGER) + 2) / 3)
           || '-' || strftime('%Y', invoice_date)                        AS bill_quarter,
       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER)    AS days_past_due
FROM invoices
WHERE status IN ('Overdue', 'Partially Paid')
ORDER BY days_past_due DESC
LIMIT 8;`,
    breakdown: [
      ['\'INV-\' || invoice_id || ...', 'SQLite concatenation; numbers are converted to text automatically'],
      ['strftime(\'%Y-%m\', invoice_date)', 'Month bucket'],
      ['(month + 2) / 3', 'Integer division turns months 1-12 into quarters 1-4'],
      ['julianday(...) - julianday(due_date)', 'Days between dates'],
    ],
    dialectSql: {
      mysql: `SELECT CONCAT('INV-', invoice_id) AS label,\n       DATE_FORMAT(invoice_date, '%Y-%m') AS bill_month,\n       CONCAT('Q', QUARTER(invoice_date), '-', YEAR(invoice_date)) AS bill_quarter,\n       DATEDIFF('2026-09-01', due_date) AS days_past_due\nFROM invoices;`,
      postgres: `SELECT 'INV-' || invoice_id AS label,\n       to_char(invoice_date, 'YYYY-MM') AS bill_month,\n       to_char(invoice_date, '"Q"Q-YYYY') AS bill_quarter,\n       DATE '2026-09-01' - due_date AS days_past_due\nFROM invoices;`,
      sqlserver: `SELECT 'INV-' + CAST(invoice_id AS varchar(10)) AS label,\n       FORMAT(invoice_date, 'yyyy-MM') AS bill_month,\n       CONCAT('Q', DATEPART(quarter, invoice_date), '-', YEAR(invoice_date)) AS bill_quarter,\n       DATEDIFF(day, due_date, '2026-09-01') AS days_past_due\nFROM invoices;`,
      oracle: `SELECT 'INV-' || invoice_id AS label,\n       TO_CHAR(invoice_date, 'YYYY-MM') AS bill_month,\n       'Q' || TO_CHAR(invoice_date, 'Q-YYYY') AS bill_quarter,\n       DATE '2026-09-01' - due_date AS days_past_due\nFROM invoices;`,
      sqlite: `SELECT 'INV-' || invoice_id AS label,\n       strftime('%Y-%m', invoice_date) AS bill_month,\n       'Q' || ((CAST(strftime('%m', invoice_date) AS INTEGER) + 2) / 3) || '-' || strftime('%Y', invoice_date) AS bill_quarter,\n       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_past_due\nFROM invoices;`,
    },
    mistakes: [
      { wrong: `SELECT 'Patient: ' || first_name || ' ' || city FROM patients;`, why: 'In SQLite and PostgreSQL, anything || NULL is NULL, so patients without a city get a NULL label. (Oracle would not, which hides the bug until you migrate.) Wrap nullable parts in COALESCE.', fix: `SELECT 'Patient: ' || first_name || ' ' || COALESCE(city, '(unknown)') AS label FROM patients LIMIT 6;` },
      { wrong: `SELECT DATEDIFF(due_date, '2026-09-01') FROM invoices;  -- ported from SQL Server to MySQL`, why: 'SQL Server is DATEDIFF(unit, start, end); MySQL is DATEDIFF(end, start). Porting without swapping flips the sign of every aging bucket.', fix: `SELECT invoice_id, CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days FROM invoices LIMIT 5;` },
    ],
    rules: ['Days between: know the argument order of your dialect.', 'COALESCE nullable parts before concatenating.', 'Month bucket in SQLite: strftime(\'%Y-%m\', d); quarter: (month + 2) / 3.', 'Test string and date logic with NULLs and month-end dates.'],
    compare: `<table><tr><th>Task</th><th>MySQL</th><th>PostgreSQL</th><th>SQL Server</th><th>Oracle</th><th>SQLite</th></tr>
<tr><td>Today</td><td>CURDATE()</td><td>CURRENT_DATE</td><td>CAST(GETDATE() AS date)</td><td>TRUNC(SYSDATE)</td><td>date('now')</td></tr>
<tr><td>+30 days</td><td>DATE_ADD(d, INTERVAL 30 DAY)</td><td>d + 30</td><td>DATEADD(day,30,d)</td><td>d + 30</td><td>date(d,'+30 days')</td></tr>
<tr><td>Length</td><td>CHAR_LENGTH</td><td>LENGTH</td><td>LEN</td><td>LENGTH</td><td>length</td></tr>
<tr><td>Position</td><td>LOCATE(s, str)</td><td>POSITION(s IN str)</td><td>CHARINDEX(s, str)</td><td>INSTR(str, s)</td><td>instr(str, s)</td></tr>
<tr><td>'a' || NULL</td><td>(|| is OR)</td><td>NULL</td><td>(use +) NULL</td><td>'a'</td><td>NULL</td></tr></table>`,
    realWorld: 'Quarterly payor reports and AR aging buckets are recreated during every EHR data migration; most reconciliation differences trace back to date-difference sign errors and NULL concatenation.',
    tips: ['Store and compare dates in ISO format everywhere; it sorts correctly as text too.', 'MySQL LENGTH() counts bytes; use CHAR_LENGTH() for characters.'],
    deep: `<p>Month arithmetic differs at month ends: adding one month to Jan 31 gives Feb 28/29 in MySQL, PostgreSQL, SQL Server and Oracle (ADD_MONTHS), but SQLite's <code>date('2026-01-31', '+1 month')</code> normalizes Feb 31 to <b>March 3</b>. Use <code>'start of month'</code> modifiers for safe month math in SQLite.</p>`,
    tryIt: { prompt: 'See the SQLite month-end quirk: compare +1 month from Jan 31 with the "start of month" technique. Then try 2024-01-31 (a leap year).', starter: `SELECT date('2026-01-31', '+1 month')                                  AS naive_plus_month,\n       date('2026-01-31', 'start of month', '+2 months', '-1 day')    AS end_of_next_month,\n       'Q' || ((CAST(strftime('%m', '2026-08-15') AS INTEGER) + 2) / 3) AS quarter,\n       length('Penicillin, Latex')                                     AS len,\n       instr('maria.garcia@mail.com', '@')                             AS at_pos;` },
    challenge: {
      level: 3,
      prompt: 'Quarterly billing report for 2025: one row per quarter labelled like "Q1-2025", with the number of invoices and total billed. Sort by the label.',
      solution: `SELECT 'Q' || ((CAST(strftime('%m', invoice_date) AS INTEGER) + 2) / 3) || '-' || strftime('%Y', invoice_date) AS quarter_label,
       COUNT(*) AS invoices,
       SUM(total_amount) AS billed
FROM invoices
WHERE invoice_date >= '2025-01-01' AND invoice_date < '2026-01-01'
GROUP BY quarter_label
ORDER BY quarter_label;`,
      hints: ['Filter to 2025 with a date range.', 'Month number: CAST(strftime(\'%m\', invoice_date) AS INTEGER).', 'Quarter = (month + 2) / 3 using integer division; build the label with ||.', 'GROUP BY the label, then COUNT(*) and SUM(total_amount); ORDER BY the label.'],
      ordered: true,
    },
    quiz: [
      { q: 'In SQL Server, which is correct for days from due_date to 2026-09-01?', options: ["DATEDIFF('2026-09-01', due_date)", "DATEDIFF(day, due_date, '2026-09-01')", "'2026-09-01' - due_date", "julianday('2026-09-01') - julianday(due_date)"], answer: 1, why: 'SQL Server: DATEDIFF(unit, start, end).' },
      { q: 'What is \'a\' || NULL in SQLite?', options: ["'a'", "'aNULL'", 'NULL', 'Error'], answer: 2, why: 'Concatenating NULL yields NULL in SQLite and PostgreSQL.' },
      { q: 'Which function returns string length in SQL Server?', options: ['LENGTH', 'LEN', 'CHAR_LENGTH', 'SIZE'], answer: 1, why: 'SQL Server uses LEN (which ignores trailing spaces).' },
    ],
  },
]);
