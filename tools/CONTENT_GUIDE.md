# Lesson content guide

Lesson content lives in `js/lessons/<section-key>.js`. Each file registers lessons with:

```js
Lessons.add([
  { id: 'joins-02', /* ...fields below... */ },
]);
```

Ids come from `js/curriculum.js`: `${section.key}-NN`, where NN is the 1-based position in that section's `lessons` array (for example `joins-02` = INNER JOIN).
Any lesson without content still renders with a generic fallback, but every lesson should have content.

## Sample database: Healthcare Billing (SQLite 3.45, runs in the browser via sql.js)

See `tools/seed.sql` for the full schema and data. Tables:

| table | columns |
|---|---|
| `payors` (7) | payor_id PK, payor_name, payor_type ('Commercial','Medicare','Medicaid','Workers Comp','Self-Pay'), phone (NULLs), contract_rate REAL (0.80 = pays 80%), is_active (0/1) |
| `sites` (6) | site_id PK, site_name UNIQUE, site_type ('Hospital Campus','Medical Office Building','Standalone Center'), address_line, city, state, zip_code, facility_npi UNIQUE (one NULL), tax_id (shared by several sites), default_pos_code, phone (NULLs), is_active. A physical facility/campus. Site 6 (Westlake Surgery Center) is planned: inactive, no locations |
| `treatment_locations` (6) | location_id PK, location_name, location_type ('Clinic','Hospital','Urgent Care','Telehealth'), city, state, opened_date, site_id FK→sites (NOT NULL). A care unit inside a site; site 4 has two locations |
| `practitioners` (12) | practitioner_id PK, first_name, last_name, specialty, npi (one NULL), location_id FK, supervisor_id FK→practitioners (NULL for the top boss, id 1), hire_date, hourly_rate |
| `patients` (25) | patient_id PK, first_name, last_name, date_of_birth, gender, city (NULLs), email (NULLs), allergies (NULLs), primary_payor_id FK→payors (NULLs) |
| `invoices` (48) | invoice_id PK, patient_id FK, payor_id FK (NULLs), location_id FK, invoice_date, due_date, status ('Open','Paid','Partially Paid','Overdue','Void'), total_amount |
| `charges` (104) | charge_id PK, invoice_id FK, practitioner_id FK, service_date, cpt_code, description, units, unit_price, amount |
| `payments` (47) | payment_id PK, invoice_id FK, payor_id FK (NULL = patient paid), payment_date, amount, method ('EFT','Check','Credit Card','Cash') |
| `transactions` (154) | transaction_id PK, invoice_id FK, transaction_date, transaction_type ('CHARGE','PAYMENT','ADJUSTMENT','REFUND','WRITE_OFF'), amount (+ raises balance, - lowers it), reference_id, posted_by |

Built-in teaching quirks in the data:
- Patients 8, 9, 17, 19, 22 have **no invoices** (anti-join / LEFT JOIN examples).
- Patient 25 is a **duplicate** of patient 1 (same name + date_of_birth), for de-duplication.
- Practitioner 12 (Leo Martins) is a new hire with **no charges** and a NULL npi. Location 6 (Eastside Family Clinic) has **no invoices**.
- Invoice 37 is `Void` with **no charges** and total 0.
- One invoice has a **duplicate patient payment** later reversed by a `REFUND` transaction. There's also one `WRITE_OFF` and one `ADJUSTMENT`.
- Payor 6 (Cigna Select) is inactive. Payor 5 has a NULL phone.
- Dates are ISO text ('YYYY-MM-DD'), from 2025-01 to 2026-09. Treat "today" as 2026-09-01. In SQLite use `date('2026-09-01')`, `julianday()`, `strftime('%Y-%m', col)`.
- Practitioners form a hierarchy through supervisor_id (recursive CTE examples).

SQLite supports: window functions, CTEs (including recursive), RIGHT/FULL OUTER JOIN, UPSERT (`ON CONFLICT`), `FILTER (WHERE ...)` on aggregates, `group_concat`, `IIF`, `EXPLAIN QUERY PLAN`, `CREATE INDEX`, views, triggers, SAVEPOINT.
SQLite does **not** support: ROLLUP/CUBE/GROUPING SETS, LATERAL, MERGE, stored procedures, REGEXP (not built in), `INTERSECT ALL`, `TRUNCATE`, `RIGHT()`/`LEFT()` string functions, STDDEV.
For features SQLite lacks, set `dialect` (see below) and give an SQLite emulation in `tryIt`/`challenge` where one exists.

## Lesson fields (all optional except `id`)

```js
{
  id: 'aggregates-07',
  goals: ['What GROUP BY does', 'How rows collapse into groups', '...'],         // 🎯 What You Will Learn (3-5 bullets)
  concept: `<p>Simple English first...</p>`,           // 🧠 Concept — HTML. Short paragraphs, <b>, <code>, <ul>. Simple English.
  why: 'Why it exists (1-2 sentences).',
  when: 'When to use it (1-2 sentences).',
  analogy: 'Real-world analogy in plain words (medical-billing office analogies welcome).',  // 🌎
  exampleTables: ['invoices'],                          // 📊 Example Data: shows these tables (first rows)
  exampleSql: `SELECT invoice_id, status, total_amount FROM invoices LIMIT 8`,  // OR a focused query for the example data (preferred: small and relevant)
  syntax: `SELECT column, AGG(column)\nFROM table\nGROUP BY column;`,          // 💻 generic syntax template
  sql: `SELECT status, COUNT(*) AS invoice_count\nFROM invoices\nGROUP BY status;`,  // main runnable example (Query Breakdown, Visual Execution, Result use it)
  breakdown: [['SELECT status, COUNT(*)', 'What we show: the group key and a count'], ['FROM invoices', '...'], ['GROUP BY status', '...']],  // 🔍 each part of `sql` explained
  visual: { type: 'groupby', /* params */ },           // 🎬 see "Visuals" below. If omitted, a SELECT `sql` gets the automatic step-by-step stage runner.
  internals: `<p>How it works internally...</p>`,       // HTML: what the engine does (hash/sort grouping, scans, etc.)
  // mistakes[].fixDialect: true when the fix is vendor-specific and should not be run in SQLite
  mistakes: [{ wrong: `SELECT status, patient_id, COUNT(*) FROM invoices GROUP BY status;`, why: 'Plain English explanation', fix: `SELECT status, COUNT(*) FROM invoices GROUP BY status;` }],  // ⚠️ 1-3
  rules: ['Short, memorable rule', '...'],              // 💡 Important Rules (2-5)
  compare: `<p>How it compares with related concepts</p>`,  // HTML; a small <table> is great
  realWorld: 'Where it is used in real applications (billing systems, dashboards...).',
  tips: ['Beginner tip'],
  deep: `<p>Advanced note for experienced learners</p>`,
  // challenge.starter (optional): code pre-filled in the challenge editor
  tryIt: { prompt: 'Change the query to count invoices per location instead.', starter: `SELECT ...` },  // 🧪 editable, runnable
  challenge: {                                          // 🎯 auto-graded: learner result is compared to the solution result
    level: 2,                                           // 1 Beginner, 2 Intermediate, 3 Advanced, 4 Expert
    prompt: 'Show each invoice status with the total billed amount, highest first.',
    solution: `SELECT status, SUM(total_amount) AS billed FROM invoices GROUP BY status ORDER BY billed DESC;`,
    hints: ['Which table has the data?', 'You need one row per status.', 'Use GROUP BY status and SUM().', 'Sort with ORDER BY ... DESC.'],  // 3-4 progressive hints, the last one nearly gives it away
    ordered: true,                                      // true = row order matters when grading
  },
  quiz: [{ q: 'Question?', options: ['A', 'B', 'C', 'D'], answer: 1, why: 'Explanation shown after answering' }],  // 📝 2-3 questions
  dialect: 'postgres',  // only if `sql` does NOT run in SQLite: 'mysql' | 'postgres' | 'sqlserver' | 'oracle' | 'ansi'. `sql` is then shown, not run.
  dialectSql: { mysql: `...`, postgres: `...`, sqlserver: `...`, oracle: `...`, sqlite: `...` },  // optional side-by-side comparison tabs
}
```

### Challenge grading modes

- **Result mode** (default): `solution` is a SELECT/WITH query. The learner's result is compared with the solution's result.
- **State mode**, for INSERT/UPDATE/DELETE/CREATE/ALTER practice: set `mode: 'state'` and `check`.
  ```js
  challenge: {
    mode: 'state', level: 2,
    prompt: 'Mark every Overdue invoice from before 2025-07-01 as Void.',
    solution: `UPDATE invoices SET status = 'Void' WHERE status = 'Overdue' AND invoice_date < '2025-07-01';`,
    check: `SELECT invoice_id, status FROM invoices WHERE invoice_date < '2025-07-01' ORDER BY invoice_id`,
    hints: [...],
  }
  ```
  The learner's statements run on a fresh copy of the DB, then `check` runs, and its result must equal `check` run after `solution` on another fresh copy.
  - `check` must include ORDER BY; order is compared by default.
  - The validator rejects a `check` whose result is the same before and after `solution`, because doing nothing would then pass.
  - For DDL, check the schema, e.g. `SELECT name, type, "notnull", pk FROM pragma_table_info('payors') ORDER BY cid`, or `SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'charges' ORDER BY name`.
- **Fix-the-query**: add `buggy: \`...\`` (works in either mode). The buggy SQL is shown and pre-filled in the editor. The validator rejects it if it already gives the correct result.

Grading compares result *values* (column names are ignored; column count and order matter). Keep challenge solutions deterministic: add ORDER BY and `ordered: true` when order matters. Challenge and tryIt SQL must run on SQLite.
Statements that modify data (INSERT/UPDATE/DELETE/CREATE) are fine in `sql`, `tryIt` and `mistakes`: every run happens in a sandbox that can be reset. A result-mode challenge `solution` must be a single SELECT (or WITH ... SELECT); use state mode to grade data or schema changes.

Use template literals (backticks) for SQL and HTML. Escape any backtick inside them. Keep HTML simple; don't use `<script>`.

## Visuals (`visual.type`)

- `join`: `{ type:'join', join:'inner'|'left'|'right'|'full'|'cross' }`. Interactive join explorer on small subsets of patients and invoices, with a Venn diagram and match lines. The learner can switch join type.
- `groupby`: `{ type:'groupby', source:`SELECT ... (≤ 14 rows)`, group:'col', value:'col', agg:'COUNT'|'SUM'|'AVG'|'MIN'|'MAX', having: 2 /* optional threshold on agg */ }`. Animated read → group → aggregate (→ HAVING).
- `setops`: `{ type:'setops', a:`SELECT city FROM ...`, b:`SELECT city FROM ...`, op:'UNION'|'UNION ALL'|'INTERSECT'|'EXCEPT' }`. Single-column queries. The learner can switch op; duplicates are highlighted.
- `window`: `{ type:'window', source:`SELECT ... (≤ 16 rows)`, partition:'col' /* or null */, order:'col', value:'col', fn:'ROW_NUMBER'|'RANK'|'DENSE_RANK'|'NTILE'|'LAG'|'LEAD'|'RUNNING_SUM'|'MOVING_AVG'|'FIRST_VALUE'|'LAST_VALUE' }`. Partitions are color-coded. Hovering a row shows its window frame.
- `null`: three-valued logic explorer (TRUE/FALSE/UNKNOWN truth tables, `= NULL` vs `IS NULL` on the patients table).
- `keys`: `{ type:'keys', parent:'patients', child:'invoices', pk:'patient_id', fk:'patient_id' }`. PK/FK explorer: hover a parent row to see its child rows.
- `order`: logical query processing order animation for the lesson `sql` (FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT), with row counts at each stage.
- `stages`: step-by-step execution of `sql` (automatic default for SELECT; rows kept/removed are highlighted).
- `index`: B-tree index lookup vs full table scan animation.
- `explain`: `{ type:'explain', index:`CREATE INDEX idx_charges_invoice ON charges(invoice_id)` }`. Shows a real SQLite `EXPLAIN QUERY PLAN` tree for `sql`, before and after creating the index.
- `txn`: `{ type:'txn', scenario:'commit'|'rollback'|'savepoint'|'dirty'|'nonrepeatable'|'phantom'|'deadlock'|'lostupdate' }`. Two-session transaction timeline stepper.
- `correlated`: correlated subquery iteration animation (each invoice compared with the average of its own location).
- `recursive`: recursive CTE animation that builds the practitioner supervisor tree level by level.
- `er`: `{ type:'er', tables:['patients','invoices','payments'], focus:'invoices', layers:{ rollup:true, nn:true, logical:false } }`. Interactive entity-relationship diagram. Omit `tables` for all tables. `focus` opens a table's details on load. `layers` sets which relationship layers start switched on (`fk`, `logical`, `rollup`, `nn`).
- `dml`: `{ type:'dml', statement:`UPDATE invoices SET status='Paid' WHERE invoice_id = 3`, view:`SELECT invoice_id, status FROM invoices WHERE invoice_id BETWEEN 1 AND 6`, key:'invoice_id' }`. Before/after tables with changed, inserted and deleted rows highlighted.
- `flow`: `{ type:'flow', steps:[['FROM invoices','48 rows'], ['WHERE ...','13 rows'], ...] }`. Vertical arrow flow diagram for a conceptual process.
- `html`: `{ type:'html', html:`<svg ...>` }`. A custom static diagram (inline SVG or HTML). Use colors `var(--accent)`, `var(--green)`, `var(--red)`, `var(--yellow)`, `var(--blue)`, `var(--purple)`, `var(--muted)`, `var(--text)`, `var(--panel2)`, `var(--border)`. For SVG text, use `fill="var(--text)"`. Use `viewBox` with `width="100%"`.

## Validate

`node tools/validate.js js/lessons/<file>.js` runs every SQL snippet against the sample DB and checks that ids and fields are valid. Fix every error it reports.
Use `node tools/sqlrun.js "SELECT ..."` to explore the data.
