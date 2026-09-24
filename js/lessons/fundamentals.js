// Section 02: SQL Fundamentals (fundamentals-01 .. fundamentals-22)
Lessons.add([
  // ---------------------------------------------------------------- 01
  {
    id: 'fundamentals-01',
    goals: [
      'What a SELECT statement is and what it returns',
      'How to pick specific columns vs. all columns with *',
      'Why SELECT never changes the data it reads',
      'How to read a result set as a brand-new, temporary table',
    ],
    concept: `<p><b>SELECT</b> is how you ask a database a question. You name the <b>columns</b> you want to see, and the database hands back a <b>result set</b>: a small, temporary table built just for you.</p>
<p>Think of it as "show me". <code>SELECT first_name, last_name FROM patients</code> means "show me the first and last name of every patient".</p>
<ul>
<li><code>SELECT *</code> means "every column". It is handy for exploring, but in real code you should list the columns you need.</li>
<li>The column order in your SELECT list is the column order in the result.</li>
<li>SELECT is <b>read-only</b>. It never changes, moves, or deletes the stored rows.</li>
</ul>`,
    why: 'Databases hold millions of facts. SELECT lets you pull out exactly the facts you need, in the shape you need, without touching the originals.',
    when: 'Any time you need to look at data: building a report, checking a patient record, feeding a web page, or just exploring a new table.',
    analogy: 'A SELECT is like asking the records clerk for a photocopy of certain columns from the patient ledger. You get a copy to read. The original ledger stays in the cabinet, unchanged.',
    exampleSql: `SELECT * FROM patients LIMIT 6`,
    syntax: `SELECT column1, column2, ...\nFROM table_name;\n\n-- every column:\nSELECT * FROM table_name;`,
    sql: `SELECT patient_id, first_name, last_name, city\nFROM patients;`,
    breakdown: [
      ['SELECT patient_id, first_name, last_name, city', 'The columns to show, in this exact order. Every other column (email, allergies...) is left out of the result.'],
      ['FROM patients', 'Where the rows come from: the patients table. With no WHERE clause, all 25 patients are returned.'],
    ],
    internals: `<p>The engine first <b>parses</b> your text into a tree, checks that the table and columns exist, and then builds a small program (a <i>query plan</i>). With no filter, the plan is a <b>full table scan</b>: it walks through the table's storage pages row by row and copies the requested columns into the output.</p>
<p>Nothing is written to disk. The result set lives only in memory and disappears once you have read it.</p>`,
    mistakes: [
      { wrong: `SELECT first_name last_name FROM patients;`, why: 'A missing comma is not an error. SQL reads <code>last_name</code> as an alias for first_name, so you get ONE column called last_name that actually holds first names.', fix: `SELECT first_name, last_name FROM patients;` },
      { wrong: `SELECT patient_id, first_name, FROM patients;`, why: 'A trailing comma before FROM is a syntax error. The list must not end with a comma.', fix: `SELECT patient_id, first_name FROM patients;` },
    ],
    rules: [
      'Separate columns with commas and never leave a trailing comma.',
      'The result columns come out in the order you list them.',
      'SELECT reads data and never changes it.',
      'Prefer listing columns over SELECT * in real code.',
    ],
    compare: `<table><tr><th>Form</th><th>Returns</th><th>Use it for</th></tr>
<tr><td><code>SELECT *</code></td><td>every column, in table order</td><td>quick exploring</td></tr>
<tr><td><code>SELECT a, b</code></td><td>only a and b, in your order</td><td>reports, apps, anything real</td></tr></table>`,
    realWorld: 'Every screen in a billing system starts with a SELECT: the patient lookup page, the invoice list, and the payment history all run SELECT queries behind the scenes.',
    tips: ['Run SELECT * ... LIMIT 5 on a new table to see what its columns look like.', 'SQL keywords are case-insensitive: select and SELECT do the same thing. Uppercase keywords are simply easier to read.'],
    deep: `<p>Using <code>SELECT *</code> in application code is fragile. If someone later adds a column, the result shape changes and code that relies on column positions can break. It also moves more bytes over the network and can stop the engine from using a <i>covering index</i>, which is an index that already contains every column you asked for.</p>`,
    tryIt: { prompt: 'Add the email and allergies columns to the query. Then try SELECT * and compare.', starter: `SELECT patient_id, first_name, last_name, city\nFROM patients;` },
    challenge: {
      level: 1,
      prompt: 'List every insurance payor with its name, its type and its contract rate (in that column order).',
      solution: `SELECT payor_name, payor_type, contract_rate FROM payors;`,
      hints: ['Payor information lives in the payors table.', 'You need three columns: payor_name, payor_type, contract_rate.', 'Separate the columns with commas after SELECT.', 'SELECT payor_name, payor_type, contract_rate FROM payors;'],
    },
    quiz: [
      { q: 'What does SELECT * FROM invoices return?', options: ['Only the first column', 'Every column of every invoice', 'The number of invoices', 'Nothing, because * is invalid'], answer: 1, why: '* means all columns. With no WHERE, every row is returned.' },
      { q: 'What happens to the invoices table after you run a SELECT on it?', options: ['Rows are marked as read', 'Nothing, SELECT is read-only', 'The rows are copied into a new table', 'It is locked forever'], answer: 1, why: 'SELECT only reads. The result is a temporary copy.' },
      { q: 'SELECT first_name last_name FROM patients returns how many columns?', options: ['2', '1', '0 (error)', '25'], answer: 1, why: 'Without a comma, last_name becomes an alias for first_name, so there is one column.' },
    ],
  },

  // ---------------------------------------------------------------- 02
  {
    id: 'fundamentals-02',
    goals: [
      'What the FROM clause does',
      'Why FROM is logically the first step of a query',
      'How to give a table a short alias',
      'How to write a SELECT with no FROM at all (for quick calculations)',
    ],
    concept: `<p><b>FROM</b> tells the database <b>which table</b> to read. It is the source of every row in your result.</p>
<p>Even though you write SELECT first, the database actually <b>starts with FROM</b>: it first finds the table, then filters, then picks columns. Knowing this order explains many rules you will meet later.</p>
<p>You can give a table a short nickname, called a <b>table alias</b>: <code>FROM invoices AS i</code>. Then you can write <code>i.status</code> instead of <code>invoices.status</code>. This matters a lot once you join several tables.</p>`,
    why: 'A database has many tables. FROM names the one you mean, so the engine knows where to look.',
    when: 'In nearly every query. Leave it out only for quick calculations like SELECT 2 + 2 or SELECT date(\'now\').',
    analogy: 'FROM is like telling the clerk which filing cabinet to open: "the Payors cabinet", not "the Patients cabinet". Everything else in your request is about what to do once the drawer is open.',
    exampleTables: ['treatment_locations'],
    syntax: `SELECT columns\nFROM table_name;\n\nSELECT t.column\nFROM table_name AS t;   -- table alias`,
    sql: `SELECT l.location_id, l.location_name, l.city\nFROM treatment_locations AS l;`,
    breakdown: [
      ['SELECT l.location_id, l.location_name, l.city', 'Columns are written with the alias prefix l. This is optional with one table, but it is a good habit.'],
      ['FROM treatment_locations AS l', 'Read the treatment_locations table and call it l for the rest of the query.'],
    ],
    visual: { type: 'order' },
    internals: `<p>During name resolution the engine looks up <code>treatment_locations</code> in the schema catalog (in SQLite, the <code>sqlite_schema</code> table) to find its columns and where its data is stored. The alias only exists while the query runs. Nothing is renamed on disk.</p>
<p>Logical processing order: <b>FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT</b>. FROM comes first because nothing else can happen until there are rows to work with.</p>`,
    mistakes: [
      { wrong: `SELECT location_name FROM treatment_location;`, why: 'A misspelled table name gives "no such table". Table names must match exactly (this one is plural: treatment_locations).', fix: `SELECT location_name FROM treatment_locations;` },
      { wrong: `SELECT treatment_locations.city FROM treatment_locations AS l;`, why: 'Once you give a table an alias, you must use the alias. The original name is no longer visible in that query.', fix: `SELECT l.city FROM treatment_locations AS l;` },
    ],
    rules: [
      'FROM names the source table and runs first logically.',
      'After you alias a table, refer to it only by the alias.',
      'The AS keyword is optional for table aliases: FROM invoices i also works.',
      'SELECT without FROM is allowed in SQLite for quick calculations.',
    ],
    compare: `<p><b>FROM vs. SELECT:</b> FROM chooses the <i>rows' source</i> (which table). SELECT chooses the <i>columns</i> shown. Later you will see FROM can also name several tables (joins) or even a subquery.</p>`,
    realWorld: 'Reporting tools build queries as "FROM some_table" plus filters. Billing analysts often alias long names such as treatment_locations to l or loc to keep queries readable.',
    tips: ['Try SELECT 150 * 0.8; with no FROM. It works as a calculator.'],
    deep: `<p>FROM can hold more than a table name: a view, a subquery <code>(SELECT ...) AS x</code>, a table-valued function such as <code>json_each()</code> in SQLite, or several tables joined together. To the rest of the query they all look the same: a set of rows with named columns.</p>`,
    tryIt: { prompt: 'Change the query to read from the practitioners table, aliased as p, and show p.first_name, p.last_name and p.specialty.', starter: `SELECT l.location_id, l.location_name, l.city\nFROM treatment_locations AS l;` },
    challenge: {
      level: 1,
      prompt: 'Using the table alias p, show each practitioner\'s practitioner_id, last_name and specialty.',
      solution: `SELECT p.practitioner_id, p.last_name, p.specialty FROM practitioners AS p;`,
      hints: ['The data lives in the practitioners table.', 'Alias it: FROM practitioners AS p.', 'Prefix each column with p.', 'SELECT p.practitioner_id, p.last_name, p.specialty FROM practitioners AS p;'],
    },
    quiz: [
      { q: 'Which clause does the database process first, logically?', options: ['SELECT', 'FROM', 'WHERE', 'ORDER BY'], answer: 1, why: 'FROM supplies the rows. Everything else works on those rows.' },
      { q: 'After FROM payments AS pay, which reference is valid?', options: ['payments.amount', 'pay.amount', 'AS.amount', 'amount.pay'], answer: 1, why: 'Once aliased, the table is known only as pay.' },
    ],
  },

  // ---------------------------------------------------------------- 03
  {
    id: 'fundamentals-03',
    goals: [
      'How WHERE keeps some rows and throws others away',
      'How to filter text, numbers and dates',
      'Why text values need single quotes',
      'Where WHERE sits in the logical processing order',
    ],
    concept: `<p><b>WHERE</b> is a filter. For each row, the database checks a condition. If the condition is <b>true</b>, the row is kept. If it is <b>false</b> (or unknown because of NULL), the row is dropped.</p>
<p><code>WHERE status = 'Overdue'</code> keeps only the overdue invoices. The other rows are still in the table. They are just not in your result.</p>
<ul><li>Text goes in <b>single quotes</b>: <code>'Overdue'</code>.</li><li>Numbers have no quotes: <code>total_amount &gt; 200</code>.</li><li>Dates in this database are ISO text, so they are quoted too: <code>'2026-01-01'</code>.</li></ul>`,
    why: 'Tables contain far more rows than any single question needs. WHERE narrows the result to only the relevant rows.',
    when: 'Whenever you want a subset: one patient, overdue invoices, payments by check, charges after a certain date.',
    analogy: 'WHERE is the collections specialist flipping through every invoice in the drawer and pulling out only the ones stamped OVERDUE. The rest stay in the drawer.',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices LIMIT 10`,
    syntax: `SELECT columns\nFROM table_name\nWHERE condition;`,
    sql: `SELECT invoice_id, patient_id, status, total_amount\nFROM invoices\nWHERE status = 'Overdue';`,
    breakdown: [
      ['SELECT invoice_id, patient_id, status, total_amount', 'Columns shown for each kept row.'],
      ['FROM invoices', 'Start with all 48 invoices.'],
      ["WHERE status = 'Overdue'", 'Test every row. Only rows whose status is exactly the text Overdue survive.'],
    ],
    internals: `<p>With no index on <code>status</code>, SQLite performs a <b>full scan</b>: it reads each of the 48 rows, evaluates <code>status = 'Overdue'</code>, and emits the row only when the result is true. With an index, it could jump straight to the matching rows (see the Optimization section).</p>
<p>WHERE runs <b>before</b> SELECT, so it sees the raw table columns, not aliases or expressions you define in SELECT.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM invoices WHERE status = Overdue;`, why: 'Without quotes, Overdue is treated as a column name, which gives "no such column: Overdue". Text values need single quotes.', fix: `SELECT * FROM invoices WHERE status = 'Overdue';` },
      { wrong: `SELECT * FROM invoices WHERE status = "Overdue";`, why: 'In standard SQL, double quotes are for identifiers (column/table names), not text. SQLite quietly falls back to text, but PostgreSQL will fail. Use single quotes for values.', fix: `SELECT * FROM invoices WHERE status = 'Overdue';` },
      { wrong: `SELECT * FROM invoices WHERE status = 'overdue';`, why: 'The = comparison is case-sensitive in SQLite. The data says Overdue with a capital O, so this finds nothing.', fix: `SELECT * FROM invoices WHERE status = 'Overdue';` },
    ],
    rules: [
      'WHERE keeps a row only when the condition is TRUE.',
      'Single quotes for text and dates, no quotes for numbers.',
      'Text comparison with = is case-sensitive in SQLite.',
      'WHERE runs before SELECT, so it cannot see SELECT aliases.',
    ],
    compare: `<p><b>WHERE vs. HAVING</b> (coming in Aggregations): WHERE filters individual rows <i>before</i> grouping. HAVING filters groups <i>after</i> grouping.</p>`,
    realWorld: 'A collections dashboard runs WHERE status = \'Overdue\'. A patient portal runs WHERE patient_id = ? so each patient only sees their own bills.',
    tips: ['Build a query in steps: first SELECT * FROM table, then add WHERE and check the row count.'],
    deep: `<p>Formally, WHERE evaluates a <i>predicate</i> that can return TRUE, FALSE or UNKNOWN (when NULLs are involved). Only TRUE keeps the row. This three-valued logic is why <code>WHERE city = NULL</code> never matches anything. You will see this in the NULL Handling lesson.</p>`,
    tryIt: { prompt: "Change the filter to show invoices whose status is 'Open'. Then try 'Void'.", starter: `SELECT invoice_id, patient_id, status, total_amount\nFROM invoices\nWHERE status = 'Overdue';` },
    challenge: {
      level: 1,
      prompt: 'Show the patient_id, first_name and last_name of every patient who lives in Dallas.',
      solution: `SELECT patient_id, first_name, last_name FROM patients WHERE city = 'Dallas';`,
      hints: ['Patients are in the patients table.', 'The city column holds the city name.', "Text needs single quotes: 'Dallas'.", "SELECT patient_id, first_name, last_name FROM patients WHERE city = 'Dallas';"],
    },
    quiz: [
      { q: "What does WHERE status = 'Paid' do to unpaid invoices?", options: ['Deletes them', 'Leaves them out of the result only', 'Changes them to Paid', 'Moves them to the end'], answer: 1, why: 'WHERE only filters the result. The table is unchanged.' },
      { q: 'Which is the correct way to compare with a text value?', options: ["city = Dallas", "city = 'Dallas'", 'city = (Dallas)', 'city == [Dallas]'], answer: 1, why: 'Text literals use single quotes.' },
    ],
  },

  // ---------------------------------------------------------------- 04
  {
    id: 'fundamentals-04',
    goals: [
      'The six comparison operators: =, <> (!=), <, >, <=, >=',
      'How comparisons work on numbers, text and ISO dates',
      'The difference between > and >= at the boundary',
      'Why comparing numbers stored as text can surprise you',
    ],
    concept: `<p>A <b>comparison operator</b> compares two values and answers true or false.</p>
<table><tr><th>Operator</th><th>Meaning</th><th>Example</th></tr>
<tr><td><code>=</code></td><td>equal</td><td><code>status = 'Paid'</code></td></tr>
<tr><td><code>&lt;&gt;</code> or <code>!=</code></td><td>not equal</td><td><code>status &lt;&gt; 'Void'</code></td></tr>
<tr><td><code>&lt;</code> / <code>&gt;</code></td><td>less / greater than</td><td><code>total_amount &gt; 400</code></td></tr>
<tr><td><code>&lt;=</code> / <code>&gt;=</code></td><td>less / greater than or equal</td><td><code>invoice_date &gt;= '2026-01-01'</code></td></tr></table>
<p>Numbers compare by size. Text compares alphabetically, character by character. ISO dates like <code>'2026-03-09'</code> sort correctly as text because the year comes first.</p>`,
    why: 'Most business questions are comparisons: bills over $400, visits after a date, payors other than Self-Pay.',
    when: 'In WHERE (and later in HAVING, CASE and JOIN conditions) whenever you test a value against another value.',
    analogy: 'The billing manager says "flag every invoice of $400 or more for review". That is the comparison total_amount >= 400.',
    exampleSql: `SELECT invoice_id, invoice_date, total_amount FROM invoices ORDER BY total_amount DESC LIMIT 10`,
    syntax: `WHERE column = value\nWHERE column <> value     -- or !=\nWHERE column <  value\nWHERE column >= value`,
    sql: `SELECT invoice_id, invoice_date, status, total_amount\nFROM invoices\nWHERE total_amount >= 400;`,
    breakdown: [
      ['SELECT invoice_id, invoice_date, status, total_amount', 'Columns to display.'],
      ['FROM invoices', 'All 48 invoices.'],
      ['WHERE total_amount >= 400', 'Keep invoices of 400 or more. An invoice of exactly 400 would be kept. With > it would be dropped.'],
    ],
    internals: `<p>SQLite uses <b>type affinity</b>. Each value has a storage class (INTEGER, REAL, TEXT, BLOB, NULL). When you compare, SQLite may convert a value first. For example, comparing a numeric column with the text <code>'400'</code> converts the text to a number. When both sides are TEXT, it compares character codes, so <code>'100' &lt; '20'</code> is true, because '1' comes before '2'.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM invoices WHERE total_amount > 400;  -- meant "400 or more"`, why: '> excludes the boundary value. If you mean "at least 400", use >=. Off-by-one boundaries are the most common comparison bug.', fix: `SELECT * FROM invoices WHERE total_amount >= 400;` },
      { wrong: `SELECT * FROM charges WHERE cpt_code > 9000;`, why: 'cpt_code is stored as TEXT. Mixing text and number comparisons depends on affinity rules and can surprise you. Compare text with text (or CAST explicitly).', fix: `SELECT * FROM charges WHERE cpt_code >= '90000';` },
    ],
    rules: [
      '<> and != both mean "not equal". <> is the ANSI standard.',
      '>= and <= include the boundary. > and < do not.',
      'ISO dates (YYYY-MM-DD) compare correctly as text.',
      'Any comparison with NULL is unknown, never true.',
    ],
    compare: `<p>Comparison operators test one value at a time. Later, <b>BETWEEN</b> is a shortcut for <code>x &gt;= a AND x &lt;= b</code>, and <b>IN</b> is a shortcut for several <code>=</code> tests joined by OR.</p>`,
    realWorld: 'Claims review queues use thresholds ("charges over $500 need a second approval"). Aging reports compare due_date against today.',
    tips: ["To find invoices from 2026 onward: WHERE invoice_date >= '2026-01-01'."],
    deep: `<p>Comparison between different storage classes follows a fixed order in SQLite: NULL &lt; INTEGER/REAL &lt; TEXT &lt; BLOB. So a TEXT value is always "greater" than any number when no conversion happens. PostgreSQL would raise a type error instead, which is stricter but safer.</p>`,
    tryIt: { prompt: "Find payments that were NOT made by credit card (use <>). Then find payments made before '2025-06-01'.", starter: `SELECT payment_id, payment_date, amount, method\nFROM payments\nWHERE method <> 'Credit Card';` },
    challenge: {
      level: 1,
      prompt: 'List charges whose unit_price is greater than 150. Show charge_id, description and unit_price.',
      solution: `SELECT charge_id, description, unit_price FROM charges WHERE unit_price > 150;`,
      hints: ['Charges live in the charges table.', 'You want unit_price strictly above 150.', 'Use the > operator.', 'SELECT charge_id, description, unit_price FROM charges WHERE unit_price > 150;'],
    },
    quiz: [
      { q: 'Which operator keeps an invoice of exactly 100 when filtering total_amount ? 100?', options: ['>', '<', '>=', '<>'], answer: 2, why: '>= includes the boundary value.' },
      { q: "Is the text comparison '100' < '20' true or false?", options: ['True', 'False', 'Error', 'NULL'], answer: 0, why: 'Text compares character by character: "1" is before "2".' },
      { q: 'Which two operators mean "not equal"?', options: ['<> and !=', '=! and ~=', '!== and <>', 'NOT= and ><'], answer: 0, why: '<> is the standard. != is widely supported too.' },
    ],
  },

  // ---------------------------------------------------------------- 05
  {
    id: 'fundamentals-05',
    goals: [
      'How AND, OR and NOT combine conditions',
      'Why AND is evaluated before OR',
      'How parentheses make your intent clear',
      'How to read a combined condition row by row',
    ],
    concept: `<p><b>Logical operators</b> join several conditions into one.</p>
<ul>
<li><code>A AND B</code>: keep the row only when <b>both</b> are true.</li>
<li><code>A OR B</code>: keep the row when <b>at least one</b> is true.</li>
<li><code>NOT A</code>: flips true to false and false to true.</li>
</ul>
<p>AND is stronger than OR (it binds first), just like multiplication binds before addition. So <code>A OR B AND C</code> means <code>A OR (B AND C)</code>. When you mix them, <b>always use parentheses</b>.</p>`,
    why: 'Real questions rarely have a single condition: "overdue AND over $150", "Medicare OR Medicaid".',
    when: 'Whenever a filter needs more than one test.',
    analogy: 'A claims rule: "Send to review if the invoice is Overdue AND over $150." Both must be true. A coverage rule: "Government plan if Medicare OR Medicaid." Either one is enough.',
    exampleSql: `SELECT invoice_id, location_id, status, total_amount FROM invoices LIMIT 12`,
    syntax: `WHERE cond1 AND cond2\nWHERE cond1 OR cond2\nWHERE NOT cond1\nWHERE (cond1 OR cond2) AND cond3`,
    sql: `SELECT invoice_id, location_id, status, total_amount\nFROM invoices\nWHERE status = 'Overdue'\n  AND total_amount > 150;`,
    breakdown: [
      ['FROM invoices', 'All 48 invoices.'],
      ["WHERE status = 'Overdue'", 'First test: is it overdue?'],
      ['AND total_amount > 150', 'Second test: is it over 150? A row is kept only when both tests are true.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 560 170" width="100%" font-family="sans-serif" font-size="13">
<text x="90" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">A AND B</text>
<circle cx="70" cy="85" r="50" fill="none" stroke="var(--blue)" stroke-width="2"/><circle cx="110" cy="85" r="50" fill="none" stroke="var(--purple)" stroke-width="2"/>
<path d="M90 41 A50 50 0 0 1 90 129 A50 50 0 0 1 90 41 Z" fill="var(--green)" opacity="0.6"/>
<text x="90" y="160" text-anchor="middle" fill="var(--muted)">only the overlap</text>
<text x="280" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">A OR B</text>
<circle cx="260" cy="85" r="50" fill="var(--green)" opacity="0.45"/><circle cx="300" cy="85" r="50" fill="var(--green)" opacity="0.45"/>
<text x="280" y="160" text-anchor="middle" fill="var(--muted)">either circle</text>
<text x="470" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">NOT A</text>
<rect x="395" y="35" width="150" height="100" fill="var(--green)" opacity="0.45" rx="6"/>
<circle cx="470" cy="85" r="40" fill="var(--panel2)" stroke="var(--blue)" stroke-width="2"/>
<text x="470" y="90" text-anchor="middle" fill="var(--text)">A</text>
<text x="470" y="160" text-anchor="middle" fill="var(--muted)">everything outside A</text>
</svg>` },
    internals: `<p>SQLite evaluates conditions with <b>short-circuiting</b>: for <code>A AND B</code>, if A is false it does not need to evaluate B. The optimizer may also reorder the tests, or use an index for one of them, so do not rely on evaluation order for side effects.</p>
<p>Precedence (strongest first): comparison operators, then <code>NOT</code>, then <code>AND</code>, then <code>OR</code>.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM invoices\nWHERE status = 'Overdue' OR status = 'Partially Paid' AND total_amount > 300;`, why: 'AND binds first, so this means Overdue (any amount) OR (Partially Paid AND > 300). Small overdue invoices sneak in.', fix: `SELECT * FROM invoices\nWHERE (status = 'Overdue' OR status = 'Partially Paid') AND total_amount > 300;` },
      { wrong: `SELECT * FROM invoices WHERE status = 'Paid' AND status = 'Open';`, why: 'One row cannot have two statuses at the same time, so AND returns nothing. You meant "either one", which is OR.', fix: `SELECT * FROM invoices WHERE status = 'Paid' OR status = 'Open';` },
    ],
    rules: [
      'AND narrows the result (both must be true). OR widens it (either can be true).',
      'AND is evaluated before OR.',
      'Mixing AND with OR? Add parentheses every time.',
      'NOT flips a condition. NOT (A AND B) = NOT A OR NOT B.',
    ],
    compare: `<table><tr><th>A</th><th>B</th><th>A AND B</th><th>A OR B</th></tr>
<tr><td>T</td><td>T</td><td>T</td><td>T</td></tr><tr><td>T</td><td>F</td><td>F</td><td>T</td></tr>
<tr><td>F</td><td>T</td><td>F</td><td>T</td></tr><tr><td>F</td><td>F</td><td>F</td><td>F</td></tr></table>`,
    realWorld: 'Denial-management queues filter with combined rules: payer type AND age of claim AND amount, often with OR branches for special payers.',
    tips: ['Put each condition on its own line, starting with AND or OR. Queries become much easier to read.'],
    deep: `<p>With NULLs, logic has a third value, UNKNOWN. <code>FALSE AND UNKNOWN</code> is FALSE, but <code>TRUE AND UNKNOWN</code> is UNKNOWN. <code>TRUE OR UNKNOWN</code> is TRUE. The Advanced Filtering section covers this in depth.</p>`,
    tryIt: { prompt: "Change the query to find invoices at location 4 that are either 'Paid' or 'Overdue'. Remember the parentheses!", starter: `SELECT invoice_id, location_id, status, total_amount\nFROM invoices\nWHERE status = 'Overdue'\n  AND total_amount > 150;` },
    challenge: {
      level: 2,
      prompt: "Find invoices at location 2 whose status is 'Overdue' or 'Partially Paid'. Show invoice_id, status and total_amount.",
      solution: `SELECT invoice_id, status, total_amount FROM invoices WHERE location_id = 2 AND (status = 'Overdue' OR status = 'Partially Paid');`,
      hints: ['There are two parts: a location test and a status test.', 'The two status values are alternatives, so join them with OR.', 'The location test must apply to both statuses, so wrap the OR part in parentheses.', "WHERE location_id = 2 AND (status = 'Overdue' OR status = 'Partially Paid')"],
    },
    quiz: [
      { q: 'How is A OR B AND C evaluated?', options: ['(A OR B) AND C', 'A OR (B AND C)', 'Left to right', 'It is an error'], answer: 1, why: 'AND has higher precedence than OR.' },
      { q: "WHERE status = 'Paid' AND status = 'Void' returns...", options: ['Paid and Void invoices', 'No rows', 'All rows', 'An error'], answer: 1, why: 'A single value cannot equal two different things at once.' },
    ],
  },

  // ---------------------------------------------------------------- 06
  {
    id: 'fundamentals-06',
    goals: [
      'How to rename a result column with AS',
      'When an alias needs quotes',
      'Why a SELECT alias cannot be used in WHERE',
      'Where aliases can be used (ORDER BY)',
    ],
    concept: `<p>A <b>column alias</b> gives a result column a new, friendlier name: <code>total_amount AS billed</code>. The table is not changed. Only the header of your result changes.</p>
<p>Aliases are most useful for <b>calculated columns</b>, which otherwise get an ugly name like <code>total_amount * 0.8</code>.</p>
<p>Because SELECT runs <i>after</i> WHERE, the alias does not exist yet when WHERE runs. ORDER BY runs after SELECT, so it <b>can</b> use aliases.</p>`,
    why: 'Reports and apps need readable, stable column names, especially for computed values.',
    when: 'For any calculated column, for renaming confusing column names, and whenever a report header must look nice.',
    analogy: 'The database column is called payor_name, but the printed statement says "Insurance Company". The alias is the label on the printout. The ledger itself keeps its original heading.',
    exampleSql: `SELECT payor_name, contract_rate FROM payors`,
    syntax: `SELECT column AS alias_name,\n       expression AS "Alias With Spaces"\nFROM table_name;`,
    sql: `SELECT payor_name    AS insurer,\n       contract_rate AS pays_share,\n       contract_rate * 100 AS pays_percent\nFROM payors;`,
    breakdown: [
      ['payor_name AS insurer', 'Same data, new header: insurer.'],
      ['contract_rate AS pays_share', 'Renames the rate column.'],
      ['contract_rate * 100 AS pays_percent', 'A calculated column. Without an alias its header would be the raw expression text.'],
      ['FROM payors', 'All 7 payors.'],
    ],
    internals: `<p>An alias is only metadata on the output columns. The engine computes the expression and labels it. No storage changes. In the logical order (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY), aliases come into existence at the SELECT step.</p>
<p>SQLite is actually lenient and lets you use aliases in WHERE in many cases, but PostgreSQL, SQL Server and Oracle reject it. Write portable SQL and don't rely on it.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, total_amount * 0.8 AS expected\nFROM invoices\nWHERE expected > 300;`, why: 'WHERE runs before SELECT, so the alias does not exist yet in standard SQL (PostgreSQL: "column expected does not exist"). Repeat the expression, or use a subquery/CTE.', fix: `SELECT invoice_id, total_amount * 0.8 AS expected\nFROM invoices\nWHERE total_amount * 0.8 > 300;` },
      { wrong: `SELECT payor_name AS insurance company FROM payors;`, why: 'An alias with a space must be quoted. Otherwise SQL sees two words and fails.', fix: `SELECT payor_name AS "insurance company" FROM payors;` },
    ],
    rules: [
      'AS renames the result column only, never the table column.',
      'Quote aliases with spaces or special characters using double quotes.',
      'Aliases can be used in ORDER BY but not (portably) in WHERE.',
      'Always alias calculated columns.',
    ],
    compare: `<p><b>Column alias</b> (<code>total_amount AS billed</code>) renames an output column. <b>Table alias</b> (<code>FROM invoices AS i</code>) gives a table a short name inside the query. Both are temporary and only live in this one query.</p>`,
    realWorld: 'BI tools and CSV exports show the alias as the column header, so analysts alias every column: "Patient Name", "Amount Due", "Days Overdue".',
    tips: ['The AS keyword is optional (SELECT total_amount billed), but writing AS makes it obvious and avoids the missing-comma trap.'],
    deep: `<p>In ORDER BY, a bare name is first matched against output aliases, then against input columns. In GROUP BY, the rules differ by database: MySQL and PostgreSQL accept output aliases, SQL Server does not. The safe, portable choice is to repeat the expression or wrap the query in a CTE.</p>`,
    tryIt: { prompt: 'Give invoice columns friendly names: invoice_id AS "Invoice #", total_amount AS "Amount Billed", and sort by the alias "Amount Billed".', starter: `SELECT invoice_id AS "Invoice #",\n       total_amount AS "Amount Billed"\nFROM invoices\nORDER BY "Amount Billed" DESC;` },
    challenge: {
      level: 1,
      prompt: 'Show each charge as: charge_id AS id, cpt_code AS code, and amount AS billed_amount, for charges with an amount over 300.',
      solution: `SELECT charge_id AS id, cpt_code AS code, amount AS billed_amount FROM charges WHERE amount > 300;`,
      hints: ['Use the charges table.', 'Rename each column with AS.', 'Filter on the real column name (amount) in WHERE, not the alias.', 'SELECT charge_id AS id, cpt_code AS code, amount AS billed_amount FROM charges WHERE amount > 300;'],
    },
    quiz: [
      { q: 'Why is a SELECT alias not usable in WHERE in standard SQL?', options: ['Aliases are case-sensitive', 'WHERE is processed before SELECT', 'Aliases only work with numbers', 'WHERE cannot use expressions'], answer: 1, why: 'The alias is created at the SELECT step, after WHERE has already run.' },
      { q: 'Does SELECT payor_name AS insurer rename the payors column permanently?', options: ['Yes', 'No, only in this result'], answer: 1, why: 'Aliases never change the schema.' },
    ],
  },

  // ---------------------------------------------------------------- 07
  {
    id: 'fundamentals-07',
    goals: [
      'How to compute new values with + - * / and %',
      'Why integer division drops decimals',
      'How to combine columns in one expression',
      'How expressions behave with NULL',
    ],
    concept: `<p>An <b>expression</b> is any formula that produces a value: a column, a literal like <code>100</code>, or a calculation like <code>units * unit_price</code>.</p>
<p>You can put expressions in SELECT (to show a computed column), in WHERE (to filter on a computed value), and in ORDER BY.</p>
<ul>
<li>Arithmetic: <code>+ - * /</code> and <code>%</code> (remainder).</li>
<li>Text joining: <code>||</code>, for example <code>first_name || ' ' || last_name</code>.</li>
<li>Anything combined with NULL gives NULL: <code>100 + NULL</code> is NULL.</li>
</ul>`,
    why: 'Databases store raw facts (units, prices, rates). Expressions turn them into answers (line totals, expected reimbursement) on the fly, without storing extra columns.',
    when: 'Whenever the value you need is derived from stored columns: totals, percentages, differences, labels.',
    analogy: 'The charge slip lists units and unit price. The biller multiplies them to get the line amount. The expression is that multiplication, done by the database for every row.',
    exampleSql: `SELECT charge_id, description, units, unit_price, amount FROM charges LIMIT 8`,
    syntax: `SELECT col1 * col2 AS product,\n       col1 - col2 AS difference,\n       col1 / 2.0  AS half\nFROM table_name;`,
    sql: `SELECT charge_id, description, units, unit_price,\n       units * unit_price        AS computed_amount,\n       units * unit_price * 0.80 AS expected_insurer_pays\nFROM charges\nWHERE units > 1;`,
    breakdown: [
      ['units * unit_price AS computed_amount', 'Multiply two columns for every row. It should match the stored amount column.'],
      ['units * unit_price * 0.80 AS expected_insurer_pays', 'Chain operations: what an 80% payor would reimburse.'],
      ['WHERE units > 1', 'Only multi-unit charges, where the math is interesting.'],
    ],
    internals: `<p>Expressions are evaluated per row, after WHERE, at the SELECT step. SQLite picks the arithmetic type from the operands: <b>INTEGER op INTEGER gives an INTEGER</b> (so <code>7 / 2 = 3</code>). If either side is REAL, the result is REAL (<code>7 / 2.0 = 3.5</code>). Division by zero returns NULL in SQLite (other databases raise an error).</p>`,
    mistakes: [
      { wrong: `SELECT 45 / 60 AS hours;`, why: 'Both numbers are integers, so the division is integer division and returns 0, not 0.75.', fix: `SELECT 45 / 60.0 AS hours;` },
      { wrong: `SELECT first_name + ' ' + last_name FROM patients;`, why: '+ is arithmetic in SQLite and standard SQL. Text is converted to numbers (0), so you get 0. Use || to join text.', fix: `SELECT first_name || ' ' || last_name AS full_name FROM patients;` },
    ],
    rules: [
      'Integer / integer = integer. Add .0 to one side to keep decimals.',
      'Anything + NULL = NULL.',
      'Use || for text, + for numbers.',
      'Give every expression an alias.',
    ],
    compare: `<p>An <b>expression</b> computes a value per row. An <b>aggregate</b> (SUM, AVG, coming later) combines many rows into one value. <code>units * unit_price</code> gives 104 values. <code>SUM(amount)</code> gives 1.</p>`,
    realWorld: 'Claims engines compute allowed amounts, patient responsibility (billed minus insurer share), and late fees with expressions like these.',
    tips: ['Use parentheses to control order: (a + b) * c differs from a + b * c.'],
    deep: `<p>Storing derived values (like <code>amount</code>, which equals units * unit_price) is called <i>denormalization</i>. It speeds up reads but risks drift if one value changes without the other. A handy audit query: <code>WHERE amount &lt;&gt; units * unit_price</code>. SQLite also supports <i>generated columns</i> that compute this automatically.</p>`,
    tryIt: { prompt: 'Add a column showing what the patient owes if the insurer pays 75%: units * unit_price * 0.25.', starter: `SELECT charge_id, description, units, unit_price,\n       units * unit_price AS computed_amount\nFROM charges\nWHERE units > 1;` },
    challenge: {
      level: 2,
      prompt: 'For invoices billed to payor 1 (BlueShield, pays 80%), show invoice_id, total_amount, the insurer share (total_amount * 0.8) and the patient share (total_amount * 0.2).',
      solution: `SELECT invoice_id, total_amount, total_amount * 0.8 AS insurer_share, total_amount * 0.2 AS patient_share FROM invoices WHERE payor_id = 1;`,
      hints: ['Filter invoices with payor_id = 1.', 'Insurer share is total_amount multiplied by 0.8.', 'The patient share is the remaining 20%.', 'SELECT invoice_id, total_amount, total_amount * 0.8, total_amount * 0.2 FROM invoices WHERE payor_id = 1;'],
    },
    quiz: [
      { q: 'In SQLite, what does SELECT 7 / 2 return?', options: ['3.5', '3', '4', 'Error'], answer: 1, why: 'Integer divided by integer is integer division.' },
      { q: 'What is 150 + NULL?', options: ['150', '0', 'NULL', 'Error'], answer: 2, why: 'NULL means unknown, so any arithmetic with it is unknown.' },
    ],
  },

  // ---------------------------------------------------------------- 08
  {
    id: 'fundamentals-08',
    goals: [
      'How DISTINCT removes duplicate rows from a result',
      'Why DISTINCT applies to the whole row, not one column',
      'How DISTINCT treats NULL',
      'What DISTINCT costs internally',
    ],
    concept: `<p><b>DISTINCT</b> removes repeated rows from your result. <code>SELECT DISTINCT city FROM patients</code> lists each city once, even though many patients share a city.</p>
<p>Important: DISTINCT looks at the <b>whole selected row</b>. <code>SELECT DISTINCT city, gender</code> keeps each unique <i>pair</i> of city and gender.</p>
<p>All NULLs count as "the same" for DISTINCT, so you get at most one NULL row.</p>`,
    why: 'Tables often repeat values (many invoices per status, many patients per city). DISTINCT answers "which different values exist?"',
    when: 'To list categories: which cities we serve, which payment methods are used, which CPT codes were billed.',
    analogy: 'The front desk has a stack of 104 charge slips. DISTINCT is sorting them into piles and keeping one slip per procedure code, so you can see which procedures were done at all.',
    exampleSql: `SELECT patient_id, city FROM patients LIMIT 12`,
    syntax: `SELECT DISTINCT column1, column2\nFROM table_name;`,
    sql: `SELECT DISTINCT city\nFROM patients\nORDER BY city;`,
    breakdown: [
      ['SELECT DISTINCT city', 'Show each different city only once.'],
      ['FROM patients', '25 patients, many sharing cities (and some NULL).'],
      ['ORDER BY city', 'Sort alphabetically. NULL sorts first in SQLite.'],
    ],
    internals: `<p>To find duplicates, the engine must compare rows. SQLite either <b>sorts</b> the rows so duplicates are next to each other, or uses a temporary <b>B-tree</b> as a "seen" set and skips any row already present. That is extra memory and CPU, so avoid DISTINCT when you don't need it.</p>`,
    mistakes: [
      { wrong: `SELECT DISTINCT city, patient_id FROM patients;`, why: 'patient_id is unique, so every (city, patient_id) pair is unique and DISTINCT removes nothing. DISTINCT applies to the entire row.', fix: `SELECT DISTINCT city FROM patients;` },
      { wrong: `SELECT city, DISTINCT gender FROM patients;`, why: 'DISTINCT is not a per-column function. It must come right after SELECT and applies to all columns.', fix: `SELECT DISTINCT city, gender FROM patients;` },
    ],
    rules: [
      'DISTINCT goes right after SELECT.',
      'It deduplicates the whole row of selected columns.',
      'NULLs are grouped together: at most one NULL row.',
      'Using DISTINCT to "fix" duplicate rows often hides a bad join. Find the cause instead.',
    ],
    compare: `<p><b>DISTINCT vs. GROUP BY:</b> <code>SELECT DISTINCT status FROM invoices</code> and <code>SELECT status FROM invoices GROUP BY status</code> give the same list. Use GROUP BY when you also want counts or sums per value.</p>`,
    realWorld: 'Filter dropdowns in billing apps ("Select payment method") are filled with SELECT DISTINCT method FROM payments.',
    tips: ['COUNT(DISTINCT col) counts the different values. You will meet it in Aggregations.'],
    deep: `<p>DISTINCT also appears in window and aggregate contexts: <code>COUNT(DISTINCT patient_id)</code>. PostgreSQL has <code>DISTINCT ON (col)</code>, which keeps the first row per value. SQLite does not have it. Use ROW_NUMBER() instead.</p>`,
    tryIt: { prompt: 'List the distinct payment methods. Then list distinct (location_id, status) pairs from invoices.', starter: `SELECT DISTINCT method\nFROM payments;` },
    challenge: {
      level: 1,
      prompt: 'List each different CPT code with its description from the charges table, once each, sorted by cpt_code.',
      solution: `SELECT DISTINCT cpt_code, description FROM charges ORDER BY cpt_code;`,
      hints: ['Charges repeat the same procedure many times.', 'DISTINCT removes the repeats.', 'Select both cpt_code and description, then sort.', 'SELECT DISTINCT cpt_code, description FROM charges ORDER BY cpt_code;'],
      ordered: true,
    },
    quiz: [
      { q: 'SELECT DISTINCT city, gender returns unique...', options: ['cities only', 'genders only', 'city + gender combinations', 'rows with no NULLs'], answer: 2, why: 'DISTINCT applies to the whole selected row.' },
      { q: 'If 5 patients have a NULL city, how many NULL rows does SELECT DISTINCT city return?', options: ['0', '1', '5', 'Error'], answer: 1, why: 'DISTINCT treats NULLs as duplicates of each other.' },
    ],
  },

  // ---------------------------------------------------------------- 09
  {
    id: 'fundamentals-09',
    goals: [
      'How CAST converts a value from one type to another',
      'Implicit vs. explicit conversion',
      'How SQLite type affinity and typeof() work',
      'Why numbers stored as text sort "wrong"',
    ],
    concept: `<p>Every value has a <b>type</b>: integer, real (decimal), text, and so on. <b>Type conversion</b> changes a value to another type.</p>
<ul>
<li><b>Explicit</b>: you ask for it with <code>CAST(value AS type)</code>, for example <code>CAST('42' AS INTEGER)</code>.</li>
<li><b>Implicit</b>: the database converts on its own, for example when comparing a number column with <code>'400'</code>.</li>
</ul>
<p>In our data, <code>cpt_code</code> is TEXT (<code>'99214'</code>). If you want to treat it as a number, CAST it. <code>typeof(x)</code> tells you what SQLite actually stored.</p>`,
    why: 'Data often arrives with the wrong type: numbers inside text, dates as text, decimals that must become whole numbers. Conversion makes comparison, sorting and math behave correctly.',
    when: 'When sorting or comparing numeric text, when you need integer math, or when you need to format numbers as text.',
    analogy: 'A handwritten charge slip says "one hundred sixty-five". Before the biller can add it up, they rewrite it as 165. CAST is that rewrite from "words" to "number".',
    exampleSql: `SELECT charge_id, cpt_code, typeof(cpt_code) AS stored_as, unit_price, typeof(unit_price) AS price_type FROM charges LIMIT 6`,
    syntax: `CAST(expression AS INTEGER)\nCAST(expression AS REAL)\nCAST(expression AS TEXT)\ntypeof(expression)   -- SQLite: shows the storage class`,
    sql: `SELECT cpt_code,\n       typeof(cpt_code)                  AS original_type,\n       CAST(cpt_code AS INTEGER)         AS as_number,\n       CAST(cpt_code AS INTEGER) + 1     AS next_code,\n       CAST(unit_price AS INTEGER)       AS whole_dollars\nFROM charges\nWHERE charge_id <= 5;`,
    breakdown: [
      ['typeof(cpt_code)', "Shows 'text': CPT codes are stored as text."],
      ['CAST(cpt_code AS INTEGER)', 'Turns the text 99214 into the number 99214.'],
      ['CAST(cpt_code AS INTEGER) + 1', 'Now we can do real math on it.'],
      ['CAST(unit_price AS INTEGER)', 'Drops the decimal part (truncates, does not round).'],
    ],
    dialectSql: {
      sqlite: `SELECT CAST('42' AS INTEGER), CAST(165 AS TEXT);`,
      postgres: `SELECT CAST('42' AS INTEGER), 165::text;   -- :: shorthand`,
      mysql: `SELECT CAST('42' AS SIGNED), CAST(165 AS CHAR);`,
      sqlserver: `SELECT CAST('42' AS INT), CONVERT(VARCHAR(10), 165);`,
      oracle: `SELECT TO_NUMBER('42'), TO_CHAR(165) FROM dual;`,
    },
    internals: `<p>SQLite is <b>dynamically typed</b>: each value carries its own storage class (NULL, INTEGER, REAL, TEXT, BLOB), and a column's declared type is only an <i>affinity</i> (a preference). CAST to INTEGER reads leading digits and stops at the first non-digit, so <code>CAST('12abc' AS INTEGER)</code> is 12 and <code>CAST('abc' AS INTEGER)</code> is 0, with no error. Stricter databases (PostgreSQL, SQL Server) raise an error for bad input.</p>`,
    mistakes: [
      { wrong: `SELECT '100' < '20';   -- expecting 0 (false)`, why: 'Both are text, so they are compared character by character: "1" < "2", so the result is true (1). Cast to numbers for numeric comparison.', fix: `SELECT CAST('100' AS INTEGER) < CAST('20' AS INTEGER);` },
      { wrong: `SELECT CAST(152.99 AS INTEGER);  -- expecting 153`, why: 'CAST truncates toward zero. It does not round. Use ROUND() if you want rounding.', fix: `SELECT CAST(ROUND(152.99) AS INTEGER);` },
    ],
    rules: [
      'CAST(x AS type) is the portable, standard syntax.',
      'Text comparison is alphabetical, even for digits.',
      'CAST to INTEGER truncates. It does not round.',
      "SQLite never errors on a bad CAST. It quietly returns 0 or a partial number, so validate your data.",
    ],
    compare: `<p><b>Implicit conversion</b> is convenient but hidden. <b>Explicit CAST</b> documents your intent and behaves the same across databases. Prefer explicit.</p>`,
    realWorld: 'Imports from clearinghouse files (EDI 837/835) arrive as text. Billing ETL jobs CAST amounts to decimals and codes to the right types before loading.',
    tips: ['Use typeof(col) whenever a comparison behaves strangely in SQLite.'],
    deep: `<p>Money should use exact types in production (<code>DECIMAL(10,2)</code> in PostgreSQL/SQL Server, or integer cents). Floating-point REAL can produce results like 0.1 + 0.2 = 0.30000000000000004. SQLite has no true DECIMAL type, so many SQLite apps store cents as INTEGER.</p>`,
    tryIt: { prompt: "Try CAST('12abc' AS INTEGER), CAST('abc' AS INTEGER) and typeof(3.0). What does SQLite do with bad input?", starter: `SELECT CAST('12abc' AS INTEGER) AS a,\n       CAST('abc' AS INTEGER)   AS b,\n       typeof(3.0)              AS c,\n       CAST(165 AS TEXT) || ' USD' AS d;` },
    challenge: {
      level: 2,
      prompt: 'Evaluation & management CPT codes are numbers 99000 and above. Show distinct cpt_code and description for those codes by casting cpt_code to an integer, sorted by cpt_code.',
      solution: `SELECT DISTINCT cpt_code, description FROM charges WHERE CAST(cpt_code AS INTEGER) >= 99000 ORDER BY cpt_code;`,
      hints: ['cpt_code is text. Convert it with CAST(cpt_code AS INTEGER).', 'Compare the casted value with 99000.', 'Use DISTINCT to avoid repeats and ORDER BY to sort.', 'SELECT DISTINCT cpt_code, description FROM charges WHERE CAST(cpt_code AS INTEGER) >= 99000 ORDER BY cpt_code;'],
      ordered: true,
    },
    quiz: [
      { q: 'CAST(9.99 AS INTEGER) in SQLite returns...', options: ['10', '9', '9.99', 'Error'], answer: 1, why: 'CAST truncates the decimal part.' },
      { q: "In SQLite, CAST('abc' AS INTEGER) returns...", options: ['An error', 'NULL', '0', "'abc'"], answer: 2, why: 'SQLite reads no leading digits, so the result is 0. There is no error.' },
    ],
  },

  // ---------------------------------------------------------------- 10
  {
    id: 'fundamentals-10',
    goals: [
      'How CASE adds if/then/else logic to SQL',
      'Searched CASE vs. simple CASE',
      'Why the order of WHEN branches matters',
      'What happens when no branch matches and there is no ELSE',
    ],
    concept: `<p><b>CASE</b> is SQL's if/then/else. It checks conditions <b>from top to bottom</b> and returns the value of the <b>first</b> WHEN that is true. If nothing matches, it returns the ELSE value, or NULL if there is no ELSE.</p>
<p>Two forms:</p>
<ul><li><b>Searched</b>: <code>CASE WHEN total_amount &gt;= 400 THEN 'High' ... END</code>, where any condition is allowed.</li>
<li><b>Simple</b>: <code>CASE status WHEN 'Paid' THEN 'Closed' ... END</code>, which compares one value for equality.</li></ul>`,
    why: 'Raw data needs labels and categories: size buckets, friendly names, flags. CASE creates them without changing the table.',
    when: 'For bucketing amounts, translating codes to words, flagging rows, and (later) conditional aggregation.',
    analogy: 'A triage nurse: "If the balance is 400 or more, send it to the senior collector. Otherwise, if it is 150 or more, send it to the regular queue. Otherwise, send a reminder letter." The first rule that fits wins.',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices LIMIT 10`,
    syntax: `CASE\n  WHEN condition1 THEN result1\n  WHEN condition2 THEN result2\n  ELSE default_result\nEND\n\nCASE column\n  WHEN value1 THEN result1\n  ELSE default_result\nEND`,
    sql: `SELECT invoice_id, total_amount,\n       CASE\n         WHEN total_amount >= 400 THEN 'High'\n         WHEN total_amount >= 150 THEN 'Medium'\n         ELSE 'Low'\n       END AS balance_tier\nFROM invoices\nORDER BY total_amount DESC;`,
    breakdown: [
      ["WHEN total_amount >= 400 THEN 'High'", 'Checked first. 400+ becomes High and stops here.'],
      ["WHEN total_amount >= 150 THEN 'Medium'", 'Only reached if the first test failed, so this really means 150 to 399.99.'],
      ["ELSE 'Low'", 'Everything else (below 150).'],
      ['END AS balance_tier', 'Close the CASE and name the new column.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 600 230" width="100%" font-family="sans-serif" font-size="13">
<rect x="220" y="8" width="160" height="30" rx="6" fill="var(--panel2)" stroke="var(--border)"/><text x="300" y="28" text-anchor="middle" fill="var(--text)">each invoice row</text>
<line x1="300" y1="38" x2="300" y2="58" stroke="var(--muted)"/>
<rect x="190" y="58" width="220" height="30" rx="6" fill="none" stroke="var(--blue)"/><text x="300" y="78" text-anchor="middle" fill="var(--text)">total_amount &gt;= 400 ?</text>
<line x1="410" y1="73" x2="470" y2="73" stroke="var(--green)"/><text x="440" y="67" text-anchor="middle" fill="var(--green)">yes</text>
<rect x="470" y="58" width="100" height="30" rx="6" fill="var(--green)" opacity="0.25"/><text x="520" y="78" text-anchor="middle" fill="var(--text)">'High'</text>
<line x1="300" y1="88" x2="300" y2="110" stroke="var(--red)"/><text x="315" y="103" fill="var(--red)">no</text>
<rect x="190" y="110" width="220" height="30" rx="6" fill="none" stroke="var(--blue)"/><text x="300" y="130" text-anchor="middle" fill="var(--text)">total_amount &gt;= 150 ?</text>
<line x1="410" y1="125" x2="470" y2="125" stroke="var(--green)"/><text x="440" y="119" text-anchor="middle" fill="var(--green)">yes</text>
<rect x="470" y="110" width="100" height="30" rx="6" fill="var(--yellow)" opacity="0.3"/><text x="520" y="130" text-anchor="middle" fill="var(--text)">'Medium'</text>
<line x1="300" y1="140" x2="300" y2="162" stroke="var(--red)"/><text x="315" y="155" fill="var(--red)">no</text>
<rect x="250" y="162" width="100" height="30" rx="6" fill="var(--red)" opacity="0.25"/><text x="300" y="182" text-anchor="middle" fill="var(--text)">ELSE 'Low'</text>
<text x="300" y="220" text-anchor="middle" fill="var(--muted)">The first true branch wins. Later branches are never checked.</text>
</svg>` },
    internals: `<p>CASE is compiled into a chain of conditional jumps, like a small if/else-if program that runs once per row. As soon as one WHEN is true, the engine jumps to END, which is why order matters and why later branches can be cheap. The result type comes from the THEN/ELSE values, so try to return the same type from every branch.</p>`,
    mistakes: [
      { wrong: `SELECT total_amount,\n  CASE WHEN total_amount >= 150 THEN 'Medium'\n       WHEN total_amount >= 400 THEN 'High'\n       ELSE 'Low' END AS tier\nFROM invoices;`, why: 'Every amount of 400 or more is also >= 150, so it hits the first branch and becomes Medium. The High branch can never win. Put the most specific (highest) test first.', fix: `SELECT total_amount,\n  CASE WHEN total_amount >= 400 THEN 'High'\n       WHEN total_amount >= 150 THEN 'Medium'\n       ELSE 'Low' END AS tier\nFROM invoices;` },
      { wrong: `SELECT payor_id, CASE payor_id WHEN NULL THEN 'Self' ELSE 'Insured' END FROM invoices;`, why: 'Simple CASE uses =, and payor_id = NULL is never true. Use a searched CASE with IS NULL.', fix: `SELECT payor_id, CASE WHEN payor_id IS NULL THEN 'Self' ELSE 'Insured' END AS coverage FROM invoices;` },
    ],
    rules: [
      'Branches are checked top to bottom and the first true one wins.',
      'No match and no ELSE gives NULL.',
      'Always finish with END (and usually an alias).',
      'Test NULL with WHEN col IS NULL, not the simple form.',
    ],
    compare: `<p><b>CASE vs. IIF / COALESCE:</b> SQLite's <code>IIF(cond, a, b)</code> is a two-branch CASE. <code>COALESCE(a, b)</code> is a CASE that picks the first non-NULL value. CASE is the general, portable tool.</p>`,
    realWorld: 'Aging buckets (0-30, 31-60, 61-90, 90+ days), payer categories, and "needs follow-up" flags on billing dashboards are all CASE expressions.',
    tips: ['CASE also works inside WHERE and ORDER BY, for example to sort Overdue first.'],
    deep: `<p>CASE inside an aggregate is the classic pivot trick: <code>SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END)</code>. SQLite also supports the cleaner <code>SUM(total_amount) FILTER (WHERE status = 'Paid')</code>. See Conditional Aggregation.</p>`,
    tryIt: { prompt: "Use a simple CASE to translate status: 'Paid' → 'Closed', 'Void' → 'Cancelled', everything else → 'Needs action'.", starter: `SELECT invoice_id, status,\n       CASE status\n         WHEN 'Paid' THEN 'Closed'\n         WHEN 'Void' THEN 'Cancelled'\n         ELSE 'Needs action'\n       END AS work_queue\nFROM invoices;` },
    challenge: {
      level: 2,
      prompt: "Label each payor by contract_rate: 0.80 or more → 'Generous', 0.65 or more → 'Standard', otherwise 'Low'. Show payor_name, contract_rate and the label (as rate_band), sorted by contract_rate from highest to lowest.",
      solution: `SELECT payor_name, contract_rate, CASE WHEN contract_rate >= 0.80 THEN 'Generous' WHEN contract_rate >= 0.65 THEN 'Standard' ELSE 'Low' END AS rate_band FROM payors ORDER BY contract_rate DESC;`,
      hints: ['Use a searched CASE with WHEN conditions.', 'Check the highest threshold (0.80) first.', "Finish with ELSE 'Low' END AS rate_band.", 'Sort with ORDER BY contract_rate DESC.'],
      ordered: true,
    },
    quiz: [
      { q: 'A CASE has no ELSE and no WHEN matches. The result is...', options: ["''", '0', 'NULL', 'Error'], answer: 2, why: 'Missing ELSE means ELSE NULL.' },
      { q: 'If two WHEN conditions are both true, which result is returned?', options: ['The last one', 'The first one', 'Both', 'Error'], answer: 1, why: 'CASE stops at the first true WHEN.' },
    ],
  },

  // ---------------------------------------------------------------- 11
  {
    id: 'fundamentals-11',
    goals: [
      'How INSERT adds new rows to a table',
      'Why you should always list the columns',
      'How to insert several rows at once and how INSERT ... SELECT works',
      'How constraints (NOT NULL, UNIQUE, CHECK, FK) can reject an insert',
    ],
    concept: `<p><b>INSERT</b> adds new rows. You say which table, which columns, and the values.</p>
<p><code>INSERT INTO payors (payor_id, payor_name, ...) VALUES (8, 'Humana Gold', ...)</code></p>
<ul><li>Values are matched to columns <b>by position</b>: 1st value → 1st listed column.</li>
<li>Columns you leave out get their <b>DEFAULT</b> (or NULL).</li>
<li>The table's <b>constraints</b> act as gatekeepers. A duplicate payor_name, an invalid payor_type or a missing required value is rejected.</li></ul>`,
    why: 'Data has to get into the database somehow: new patients, new invoices, new payments all arrive through INSERT.',
    when: 'When registering a new patient, posting a new charge, recording a payment, or copying rows from another query.',
    analogy: 'Adding a new insurance company card to the payor Rolodex. The office manager checks it first: does it have a name? Is the type one we accept? Is it already in there?',
    exampleSql: `SELECT * FROM payors`,
    syntax: `INSERT INTO table_name (col1, col2, col3)\nVALUES (v1, v2, v3);\n\n-- several rows\nINSERT INTO t (col1, col2) VALUES (a, b), (c, d);\n\n-- from a query\nINSERT INTO t (col1, col2) SELECT x, y FROM other;`,
    sql: `INSERT INTO payors (payor_id, payor_name, payor_type, phone, contract_rate, is_active)\nVALUES (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.70, 1);\n\nSELECT * FROM payors;`,
    breakdown: [
      ['INSERT INTO payors (...)', 'The target table and the exact columns we are filling.'],
      ["VALUES (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.70, 1)", 'One value per listed column, in the same order.'],
      ['SELECT * FROM payors;', 'Check the result. Payor 8 is now at the bottom.'],
    ],
    visual: { type: 'dml', statement: `INSERT INTO payors (payor_id, payor_name, payor_type, phone, contract_rate, is_active) VALUES (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.70, 1)`, view: `SELECT payor_id, payor_name, payor_type, contract_rate FROM payors`, key: 'payor_id' },
    internals: `<p>For each new row the engine: (1) fills in defaults for missing columns, (2) checks NOT NULL, CHECK, UNIQUE and FOREIGN KEY constraints, (3) writes the row into the table's B-tree at the position of its primary key, and (4) adds an entry to every index on the table. If any check fails, the whole statement is undone. In SQLite an <code>INTEGER PRIMARY KEY</code> left out (or NULL) is auto-assigned as max(id)+1.</p>`,
    mistakes: [
      { wrong: `INSERT INTO payors VALUES ('Humana Gold', 'Medicare', 0.70);`, why: 'Without a column list you must supply every column in table order. Here the count and order are wrong, so it fails. It also breaks later if the table gains a column.', fix: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Humana Gold', 'Medicare', 0.70);` },
      { wrong: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Aetna Care', 'Commercial', 0.75);`, why: "payor_name is UNIQUE and 'Aetna Care' already exists, so the database rejects the insert with a UNIQUE constraint error. That is a good thing: it prevents duplicates.", fix: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Aetna Care Plus', 'Commercial', 0.75);` },
      { wrong: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Blue Plan', 'HMO', 0.8);`, why: "payor_type has a CHECK constraint that only allows 'Commercial', 'Medicare', 'Medicaid', 'Workers Comp' and 'Self-Pay'.", fix: `INSERT INTO payors (payor_name, payor_type, contract_rate) VALUES ('Blue Plan', 'Commercial', 0.8);` },
    ],
    rules: [
      'Always write the column list.',
      'Values match columns by position.',
      'Omitted columns get DEFAULT or NULL.',
      'Constraints reject bad rows, and the whole statement fails.',
    ],
    compare: `<table><tr><th>Form</th><th>Use</th></tr>
<tr><td>INSERT ... VALUES (...)</td><td>one row typed by hand</td></tr>
<tr><td>INSERT ... VALUES (...), (...)</td><td>several rows in one statement (faster)</td></tr>
<tr><td>INSERT ... SELECT</td><td>copy or transform rows from a query</td></tr>
<tr><td>INSERT ... ON CONFLICT DO UPDATE</td><td>"upsert": insert or update if it already exists</td></tr></table>`,
    realWorld: 'Every registration form, charge entry screen and payment posting (ERA/835 files) ends in an INSERT. Batch imports use multi-row INSERT or INSERT ... SELECT from a staging table.',
    tips: ['Write the SELECT first, check its rows, then put INSERT INTO ... in front of it.', 'In this sandbox, you can reset the database at any time.'],
    deep: `<p>Inserting many rows one statement at a time is slow because each statement is its own transaction (a disk sync each time). Wrap bulk inserts in <code>BEGIN ... COMMIT</code>, or use a single multi-row INSERT. <code>RETURNING</code> (SQLite 3.35+, PostgreSQL) gives back the generated id: <code>INSERT ... RETURNING payor_id</code>.</p>`,
    tryIt: { prompt: 'Insert a new patient (id 26) living in Plano, then SELECT her. Leave out email and allergies: what values do they get?', starter: `INSERT INTO patients (patient_id, first_name, last_name, date_of_birth, gender, city, primary_payor_id)\nVALUES (26, 'Rosa', 'Diaz', '1988-04-02', 'F', 'Plano', 2);\n\nSELECT * FROM patients WHERE patient_id = 26;` },
    challenge: {
      level: 2,
      prompt: 'Before an INSERT ... SELECT copies Houston patients into a mailing list, write the SELECT it would use: patient_id, first_name, last_name and email for patients in Houston who have an email.',
      solution: `SELECT patient_id, first_name, last_name, email FROM patients WHERE city = 'Houston' AND email IS NOT NULL;`,
      hints: ['An INSERT ... SELECT copies whatever the SELECT returns, so write the SELECT part.', "Filter city = 'Houston'.", 'Missing emails are NULL. Test with IS NOT NULL.', "SELECT patient_id, first_name, last_name, email FROM patients WHERE city = 'Houston' AND email IS NOT NULL;"],
    },
    quiz: [
      { q: 'You leave out a column that has DEFAULT 1. What value does it get?', options: ['NULL', '0', '1', 'Error'], answer: 2, why: 'Omitted columns get their DEFAULT.' },
      { q: 'An INSERT of 3 rows violates UNIQUE on the 3rd row. What happens?', options: ['2 rows are inserted', 'No rows are inserted', 'The 3rd row is renamed', 'All 3 are inserted'], answer: 1, why: 'A single statement is atomic. It fully succeeds or fully fails.' },
    ],
  },

  // ---------------------------------------------------------------- 12
  {
    id: 'fundamentals-12',
    goals: [
      'How UPDATE changes values in existing rows',
      'Why WHERE is critical in an UPDATE',
      'How to update several columns and use expressions',
      'How to preview an UPDATE safely with a SELECT',
    ],
    concept: `<p><b>UPDATE</b> changes values in rows that already exist.</p>
<p><code>UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3</code></p>
<ul><li><b>SET</b> lists the column(s) and new value(s).</li>
<li><b>WHERE</b> picks which rows change. <b>No WHERE means every row changes.</b></li>
<li>The new value can be an expression using the old value: <code>SET total_amount = total_amount * 1.05</code>.</li></ul>`,
    why: 'Facts change: an invoice gets paid, a patient moves, a contract rate is renegotiated. UPDATE keeps the data current.',
    when: 'Whenever existing records must change: status changes, corrections, bulk price adjustments.',
    analogy: 'Stamping PAID on an invoice that is already in the cabinet. You don\'t create a new invoice. You change the existing one. WHERE is making sure you stamp the right invoice and not the whole drawer.',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id BETWEEN 1 AND 6`,
    syntax: `UPDATE table_name\nSET col1 = value1,\n    col2 = value2\nWHERE condition;`,
    sql: `UPDATE invoices\nSET status = 'Paid'\nWHERE invoice_id = 3;\n\nSELECT invoice_id, status, total_amount\nFROM invoices\nWHERE invoice_id BETWEEN 1 AND 6;`,
    breakdown: [
      ['UPDATE invoices', 'The table to change.'],
      ["SET status = 'Paid'", 'The new value for the status column.'],
      ['WHERE invoice_id = 3', 'Only invoice 3 changes. Remove this and all 48 invoices become Paid!'],
      ['SELECT ...', 'Verify the change.'],
    ],
    visual: { type: 'dml', statement: `UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3`, view: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id BETWEEN 1 AND 6`, key: 'invoice_id' },
    internals: `<p>UPDATE works in two phases. First it <b>finds</b> the target rows exactly like a SELECT with the same WHERE (a scan or an index lookup). Then, for each row, it computes the new values from the <i>old</i> row, checks the constraints, rewrites the row, and updates any index containing a changed column. All SET expressions see the old values, so <code>SET a = b, b = a</code> swaps them.</p>`,
    mistakes: [
      { wrong: `UPDATE invoices SET status = 'Paid';`, why: 'No WHERE clause means EVERY invoice is marked Paid. This is the classic production disaster.', fix: `UPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;` },
      { wrong: `UPDATE invoices SET status = 'Paid' AND total_amount = 0 WHERE invoice_id = 3;`, why: "Separate SET assignments with commas, not AND. Here status becomes the result of the boolean expression 'Paid' AND (total_amount = 0), which is 0 or 1, not 'Paid'. The CHECK constraint then rejects it.", fix: `UPDATE invoices SET status = 'Paid', total_amount = 0 WHERE invoice_id = 3;` },
    ],
    rules: [
      'Always write the WHERE first, then the SET.',
      'Preview with SELECT ... WHERE (the same WHERE) before updating.',
      'Separate multiple assignments with commas.',
      'SET expressions use the old row values.',
    ],
    compare: `<p><b>UPDATE vs. DELETE + INSERT:</b> UPDATE keeps the row's identity (same primary key, child rows stay linked). Deleting and re-inserting breaks foreign keys and history. Prefer UPDATE.</p>`,
    realWorld: 'Payment posting updates invoice status; nightly jobs flip Open to Overdue when due_date passes; contract renegotiation updates payor rates.',
    tips: ['In real systems, run risky updates inside BEGIN ... and check the row count before COMMIT (see Basic Transactions).'],
    deep: `<p>SQLite supports <code>UPDATE ... FROM</code> (3.33+) to update using another table, and <code>RETURNING</code> to see the changed rows. Many teams never physically update financial amounts. Instead they append correcting entries (like our transactions table), which is called an <i>append-only ledger</i>, so history is never lost.</p>`,
    tryIt: { prompt: "Flip every 'Open' invoice dated before '2026-09-01' with due_date before '2026-09-01' to 'Overdue'. Preview with SELECT first.", starter: `-- preview first:\nSELECT invoice_id, status, due_date FROM invoices\nWHERE status = 'Open' AND due_date < '2026-09-01';\n\n-- then:\n-- UPDATE invoices SET status = 'Overdue'\n-- WHERE status = 'Open' AND due_date < '2026-09-01';` },
    challenge: {
      level: 2,
      prompt: "A clean-up job will run UPDATE invoices SET status = 'Overdue' WHERE ... for Open or Partially Paid invoices whose due_date is before '2026-08-01'. Write the preview SELECT: invoice_id, status, due_date for those rows.",
      solution: `SELECT invoice_id, status, due_date FROM invoices WHERE status IN ('Open', 'Partially Paid') AND due_date < '2026-08-01';`,
      hints: ['The preview uses exactly the WHERE the UPDATE will use.', "Two statuses: 'Open' or 'Partially Paid'. Use parentheses with OR, or IN (...).", "Add AND due_date < '2026-08-01'.", "WHERE (status = 'Open' OR status = 'Partially Paid') AND due_date < '2026-08-01'"],
    },
    quiz: [
      { q: 'What does UPDATE payors SET is_active = 0; do?', options: ['Deactivates one payor', 'Deactivates every payor', 'Fails without WHERE', 'Nothing'], answer: 1, why: 'No WHERE means all rows.' },
      { q: 'How do you change two columns in one UPDATE?', options: ['SET a = 1 AND b = 2', 'SET a = 1, b = 2', 'SET (a, b) = 1, 2', 'Two SET keywords'], answer: 1, why: 'Assignments are separated by commas.' },
    ],
  },

  // ---------------------------------------------------------------- 13
  {
    id: 'fundamentals-13',
    goals: [
      'How DELETE removes rows',
      'Why a DELETE without WHERE empties the table',
      'How foreign keys can block a delete',
      'Soft delete vs. hard delete',
    ],
    concept: `<p><b>DELETE</b> removes whole rows from a table: <code>DELETE FROM invoices WHERE invoice_id = 37</code>.</p>
<ul><li>It removes <b>entire rows</b>. To clear one value, use UPDATE ... SET col = NULL instead.</li>
<li><b>No WHERE = every row is deleted.</b> The table stays, but it is empty.</li>
<li><b>Foreign keys</b> protect related data. You cannot delete an invoice that still has charges or payments pointing to it.</li></ul>`,
    why: 'Mistaken or obsolete records need to be removed, such as test data, a voided empty invoice, or a duplicate entry.',
    when: 'Rarely in billing! Financial data is usually kept (soft-deleted or voided). Use DELETE for true mistakes and temporary data.',
    analogy: 'Shredding a document. It is gone from the cabinet, and the office policy forbids shredding an invoice while payment slips are still stapled to it (the foreign key).',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id BETWEEN 34 AND 40`,
    syntax: `DELETE FROM table_name\nWHERE condition;`,
    sql: `DELETE FROM invoices\nWHERE status = 'Void' AND total_amount = 0;\n\nSELECT invoice_id, status, total_amount\nFROM invoices\nWHERE invoice_id BETWEEN 34 AND 40;`,
    breakdown: [
      ['DELETE FROM invoices', 'Remove rows from invoices.'],
      ["WHERE status = 'Void' AND total_amount = 0", 'Only the empty voided invoice (37). It has no charges or payments, so the foreign keys allow it.'],
      ['SELECT ...', 'Invoice 37 is gone from the list.'],
    ],
    visual: { type: 'dml', statement: `DELETE FROM invoices WHERE status = 'Void' AND total_amount = 0`, view: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id BETWEEN 34 AND 40`, key: 'invoice_id' },
    internals: `<p>The engine finds the rows (like a SELECT), then for each one checks the foreign keys: are there child rows in charges, payments or transactions that reference it? If so, and the key has no ON DELETE CASCADE, the delete fails. Otherwise it removes the row from the table B-tree and from every index. SQLite marks the freed pages for reuse. The file does not shrink until you run <code>VACUUM</code>.</p>`,
    mistakes: [
      { wrong: `DELETE FROM payments;`, why: 'No WHERE: every payment is deleted. Always write WHERE, and preview with SELECT first.', fix: `DELETE FROM payments WHERE payment_id = 3;` },
      { wrong: `DELETE FROM invoices WHERE invoice_id = 3;`, why: 'Invoice 3 has charges and transactions pointing to it, so the FOREIGN KEY constraint blocks the delete. Delete or reassign the children first, or void the invoice instead.', fix: `UPDATE invoices SET status = 'Void' WHERE invoice_id = 3;` },
      { wrong: `DELETE email FROM patients WHERE patient_id = 5;`, why: 'DELETE removes whole rows and has no column list. To blank out one field, UPDATE it to NULL.', fix: `UPDATE patients SET email = NULL WHERE patient_id = 5;` },
    ],
    rules: [
      'Preview with SELECT using the same WHERE, then change SELECT * to DELETE.',
      'DELETE removes whole rows. It cannot remove single values.',
      'Foreign keys block deleting parents that still have children.',
      'In financial systems, prefer voiding (a status change) over deleting.',
    ],
    compare: `<table><tr><th></th><th>Removes</th><th>Undo?</th></tr>
<tr><td>DELETE ... WHERE</td><td>matching rows</td><td>ROLLBACK inside a transaction</td></tr>
<tr><td>DELETE (no WHERE)</td><td>all rows, table stays</td><td>ROLLBACK inside a transaction</td></tr>
<tr><td>TRUNCATE (not in SQLite)</td><td>all rows, fast</td><td>depends on the database</td></tr>
<tr><td>DROP TABLE</td><td>the table itself</td><td>usually no</td></tr>
<tr><td>Soft delete: UPDATE SET is_active = 0</td><td>nothing, just hides the row</td><td>yes, flip it back</td></tr></table>`,
    realWorld: 'Healthcare billing records must be retained for years (audits, HIPAA). Real systems void invoices and deactivate payors (like Cigna Select, is_active = 0) rather than deleting them.',
    tips: ['Habit: write DELETE FROM x WHERE ... with the WHERE first, before typing anything else.'],
    deep: `<p>ON DELETE CASCADE would automatically delete child rows too, which is convenient but dangerous for financial data. ON DELETE SET NULL orphans children on purpose. Our schema uses the default (RESTRICT-like), which is the safest choice for billing.</p>`,
    tryIt: { prompt: 'Try deleting payor 6 (Cigna Select). Does it work? Why? (Hint: check which patients reference it.)', starter: `SELECT patient_id, first_name, primary_payor_id FROM patients WHERE primary_payor_id = 6;\n\n-- DELETE FROM payors WHERE payor_id = 6;` },
    challenge: {
      level: 1,
      prompt: "Write the preview SELECT for a clean-up DELETE of empty voided invoices: show invoice_id, status and total_amount of invoices with status 'Void' and total_amount 0.",
      solution: `SELECT invoice_id, status, total_amount FROM invoices WHERE status = 'Void' AND total_amount = 0;`,
      hints: ['The preview is a SELECT with the same WHERE the DELETE would use.', 'You need two conditions joined with AND.', "status = 'Void' AND total_amount = 0", "SELECT invoice_id, status, total_amount FROM invoices WHERE status = 'Void' AND total_amount = 0;"],
    },
    quiz: [
      { q: 'What does DELETE FROM charges; do?', options: ['Drops the charges table', 'Removes all rows but keeps the table', 'Fails without WHERE', 'Deletes the first row'], answer: 1, why: 'DELETE without WHERE empties the table. DROP TABLE removes the table itself.' },
      { q: 'Why might DELETE FROM invoices WHERE invoice_id = 3 fail?', options: ['Invoice ids cannot be deleted', 'Child rows (charges, payments) reference it', 'DELETE needs a column list', 'It never fails'], answer: 1, why: 'The foreign key constraint protects related rows.' },
    ],
  },

  // ---------------------------------------------------------------- 14
  {
    id: 'fundamentals-14',
    goals: [
      'How ROUND, ABS, CEIL and FLOOR work',
      'How to use % (modulo) and power/sqrt',
      'How rounding differs from truncating',
      'Where math functions show up in billing',
    ],
    concept: `<p><b>Arithmetic functions</b> work on one number at a time and return a new number.</p>
<table><tr><th>Function</th><th>Does</th><th>Example → result</th></tr>
<tr><td><code>ROUND(x, d)</code></td><td>round to d decimals</td><td>ROUND(142.567, 2) → 142.57</td></tr>
<tr><td><code>ABS(x)</code></td><td>remove the minus sign</td><td>ABS(-87.5) → 87.5</td></tr>
<tr><td><code>CEIL(x)</code> / <code>FLOOR(x)</code></td><td>round up / down to a whole number</td><td>CEIL(2.1) → 3, FLOOR(2.9) → 2</td></tr>
<tr><td><code>x % y</code></td><td>remainder</td><td>50 % 15 → 5</td></tr>
<tr><td><code>POWER(x, y)</code>, <code>SQRT(x)</code></td><td>exponent, square root</td><td>POWER(1.05, 2) → 1.1025</td></tr></table>`,
    why: 'Money needs rounding to cents, refunds and adjustments are negative, and billing units are often rounded up (for example 15-minute therapy units).',
    when: 'For formatting amounts, computing interest or late fees, turning minutes into billing units, and treating negative ledger entries as sizes.',
    analogy: 'The billing calculator on the desk: ROUND for cents, ABS to read "87.50" off a red (negative) write-off line, CEIL to bill 38 minutes of therapy as 3 units of 15 minutes.',
    exampleSql: `SELECT transaction_id, transaction_type, amount FROM transactions WHERE amount < 0 LIMIT 8`,
    syntax: `ROUND(x [, digits])\nABS(x)\nCEIL(x), FLOOR(x)\nx % y\nPOWER(x, y), SQRT(x)`,
    sql: `SELECT transaction_id, transaction_type, amount,\n       ABS(amount)              AS size,\n       ROUND(ABS(amount) * 0.65, 2) AS at_65_percent,\n       CEIL(ABS(amount) / 50.0) AS fifty_dollar_blocks\nFROM transactions\nWHERE transaction_type <> 'CHARGE'\nLIMIT 10;`,
    breakdown: [
      ['ABS(amount)', 'Payments and write-offs are negative in the ledger. ABS gives their size.'],
      ['ROUND(ABS(amount) * 0.65, 2)', '65% of the size, rounded to cents.'],
      ['CEIL(ABS(amount) / 50.0)', 'How many 50-dollar blocks, rounded up. Note the 50.0 to avoid integer division.'],
      ["WHERE transaction_type <> 'CHARGE' LIMIT 10", 'Only non-charge entries, first 10.'],
    ],
    internals: `<p>These are <b>scalar functions</b>: called once per row, one value in, one value out. <code>ROUND</code>, <code>ABS</code> and <code>%</code> are core SQLite. <code>CEIL</code>, <code>FLOOR</code>, <code>POWER</code> and <code>SQRT</code> come from SQLite's optional math extension (enabled in this build). REAL values are IEEE-754 doubles, so <code>ROUND(2.675, 2)</code> can give 2.67 because 2.675 is actually stored as 2.67499999....</p>`,
    mistakes: [
      { wrong: `SELECT CEIL(38 / 15) AS units;   -- expecting 3`, why: 'The integer division 38 / 15 runs first and gives 2, then CEIL(2) = 2. Make one operand REAL.', fix: `SELECT CEIL(38 / 15.0) AS units;` },
      { wrong: `SELECT ROUND(amount) FROM payments;  -- expecting cents`, why: 'ROUND with no digits argument rounds to a whole number (142.5 → 143.0). Pass 2 for cents.', fix: `SELECT ROUND(amount, 2) FROM payments;` },
    ],
    rules: [
      'ROUND(x, 2) for money display. Keep full precision in calculations and round at the end.',
      'CEIL rounds up, FLOOR rounds down, CAST truncates toward zero.',
      'Watch integer division inside functions.',
      'ABS for sizes of negative ledger amounts.',
    ],
    compare: `<table><tr><th>x = -2.5</th><th>result</th></tr><tr><td>ROUND(x)</td><td>-3.0</td></tr><tr><td>CEIL(x)</td><td>-2</td></tr><tr><td>FLOOR(x)</td><td>-3</td></tr><tr><td>CAST(x AS INTEGER)</td><td>-2</td></tr><tr><td>ABS(x)</td><td>2.5</td></tr></table>`,
    realWorld: 'Therapy billing uses the CMS "8-minute rule" to turn minutes into units, contract reimbursement is rounded to cents, and variance reports use ABS(expected - paid).',
    tips: ['Test a function without a table: SELECT ROUND(2.675, 2), CEIL(-2.5), 50 % 15;'],
    deep: `<p>Different databases round halves differently. SQLite and PostgreSQL <code>round()</code> round half away from zero for numerics, and some systems offer banker's rounding (half to even). For money, store integer cents or DECIMAL, and do rounding in exactly one agreed place.</p>`,
    tryIt: { prompt: 'Compute each charge amount with a 7.5% late fee added, rounded to cents: ROUND(amount * 1.075, 2).', starter: `SELECT charge_id, amount,\n       ROUND(amount * 1.075, 2) AS with_late_fee\nFROM charges\nLIMIT 10;` },
    challenge: {
      level: 2,
      prompt: "For every WRITE_OFF, ADJUSTMENT or REFUND transaction, show transaction_id, transaction_type, and the absolute amount rounded to 2 decimals (as abs_amount), sorted by transaction_id.",
      solution: `SELECT transaction_id, transaction_type, ROUND(ABS(amount), 2) AS abs_amount FROM transactions WHERE transaction_type IN ('WRITE_OFF', 'ADJUSTMENT', 'REFUND') ORDER BY transaction_id;`,
      hints: ['Use the transactions table.', "Filter three types with OR, or IN ('WRITE_OFF','ADJUSTMENT','REFUND').", 'Wrap amount in ABS(), then ROUND(..., 2).', 'Finish with ORDER BY transaction_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'CEIL(2.01) returns...', options: ['2', '3', '2.01', '2.0'], answer: 1, why: 'CEIL always rounds up to the next whole number.' },
      { q: 'What is 50 % 15?', options: ['3', '5', '3.33', '0'], answer: 1, why: '15 goes into 50 three times (45), with 5 left over.' },
    ],
  },

  // ---------------------------------------------------------------- 15
  {
    id: 'fundamentals-15',
    goals: [
      'How to join text with ||',
      'UPPER, LOWER, LENGTH, TRIM, SUBSTR, REPLACE and INSTR',
      'How to build full names, initials and masked values',
      'How string functions differ between databases',
    ],
    concept: `<p><b>String functions</b> reshape text.</p>
<table><tr><th>Function</th><th>Example</th><th>Result</th></tr>
<tr><td><code>||</code></td><td><code>'Maria' || ' ' || 'Garcia'</code></td><td>Maria Garcia</td></tr>
<tr><td><code>UPPER / LOWER</code></td><td><code>UPPER('garcia')</code></td><td>GARCIA</td></tr>
<tr><td><code>LENGTH</code></td><td><code>LENGTH('Garcia')</code></td><td>6</td></tr>
<tr><td><code>SUBSTR(s, start, len)</code></td><td><code>SUBSTR('Garcia', 1, 1)</code></td><td>G (positions start at 1)</td></tr>
<tr><td><code>TRIM</code></td><td><code>TRIM('  Garcia ')</code></td><td>Garcia</td></tr>
<tr><td><code>REPLACE</code></td><td><code>REPLACE('800-555-0101', '-', '')</code></td><td>8005550101</td></tr>
<tr><td><code>INSTR(s, find)</code></td><td><code>INSTR('a@mail.com', '@')</code></td><td>2</td></tr></table>`,
    why: 'Stored text is rarely in the exact shape a statement, label or search needs. String functions format and clean it.',
    when: 'Building display names, extracting email domains, normalizing case for matching, cleaning phone numbers, masking data.',
    analogy: 'Preparing patient statements: the envelope needs "GARCIA, MARIA" in capitals, the portal needs a lowercase email, and the printout shows only the last 4 digits of a phone number.',
    exampleSql: `SELECT patient_id, first_name, last_name, email FROM patients LIMIT 6`,
    syntax: `a || b\nUPPER(s), LOWER(s), LENGTH(s), TRIM(s)\nSUBSTR(s, start [, length])\nREPLACE(s, find, replace_with)\nINSTR(s, find)`,
    sql: `SELECT patient_id,\n       UPPER(last_name) || ', ' || first_name   AS statement_name,\n       SUBSTR(first_name, 1, 1) || SUBSTR(last_name, 1, 1) AS initials,\n       LENGTH(last_name)                       AS name_length,\n       SUBSTR(email, INSTR(email, '@') + 1)    AS email_domain\nFROM patients\nWHERE patient_id <= 8;`,
    breakdown: [
      ["UPPER(last_name) || ', ' || first_name", 'Joins three pieces: GARCIA + ", " + Maria.'],
      ['SUBSTR(first_name, 1, 1) || SUBSTR(last_name, 1, 1)', 'The first letter of each name gives the initials.'],
      ['LENGTH(last_name)', 'Number of characters.'],
      ["SUBSTR(email, INSTR(email, '@') + 1)", 'Find the @, then take everything after it (no length means to the end).'],
    ],
    dialectSql: {
      sqlite: `SELECT first_name || ' ' || last_name, SUBSTR(last_name, 1, 3) FROM patients;`,
      postgres: `SELECT first_name || ' ' || last_name, LEFT(last_name, 3) FROM patients;`,
      mysql: `SELECT CONCAT(first_name, ' ', last_name), LEFT(last_name, 3) FROM patients;`,
      sqlserver: `SELECT first_name + ' ' + last_name, LEFT(last_name, 3) FROM patients;`,
      oracle: `SELECT first_name || ' ' || last_name, SUBSTR(last_name, 1, 3) FROM patients;`,
    },
    internals: `<p>Text in SQLite is stored as UTF-8. <code>LENGTH</code> counts characters, not bytes. The built-in <code>UPPER/LOWER</code> only handle ASCII letters (é stays é) unless the ICU extension is loaded. Every function returns a brand-new string; the stored value is untouched. Applying a function to a column in WHERE (like <code>UPPER(last_name) = 'GARCIA'</code>) usually prevents the use of an index on that column.</p>`,
    mistakes: [
      { wrong: `SELECT first_name + ' ' + last_name FROM patients;`, why: '+ is numeric addition in SQLite. Text becomes 0, so every row shows 0. Use ||.', fix: `SELECT first_name || ' ' || last_name AS full_name FROM patients;` },
      { wrong: `SELECT first_name || ' ' || email FROM patients;`, why: 'If email is NULL, the whole concatenation becomes NULL. Wrap nullable parts with COALESCE (or IFNULL).', fix: `SELECT first_name || ' ' || COALESCE(email, '(no email)') AS contact FROM patients;` },
      { wrong: `SELECT SUBSTR(last_name, 0, 3) FROM patients;`, why: 'SQL string positions start at 1, not 0. Starting at 0 returns one character fewer than expected.', fix: `SELECT SUBSTR(last_name, 1, 3) FROM patients;` },
    ],
    rules: [
      'Use || to join text. NULL anywhere makes the result NULL.',
      'String positions start at 1.',
      'Functions return new values. They never change stored data.',
      'Compare case-insensitively with LOWER(a) = LOWER(b) (or LIKE in SQLite).',
    ],
    compare: `<p>SQLite has no <code>LEFT()</code>/<code>RIGHT()</code>. Use <code>SUBSTR(s, 1, n)</code> and <code>SUBSTR(s, -n)</code> (a negative start counts from the end). MySQL uses <code>CONCAT()</code>, SQL Server uses <code>+</code>.</p>`,
    realWorld: 'Statement printing, patient search (case-insensitive), phone normalization before sending to a dialer, and masking identifiers on printed documents.',
    tips: ["Mask a phone: '***-***-' || SUBSTR(phone, -4)."],
    deep: `<p>For fast case-insensitive search at scale, store a normalized column (such as lowercase email) with an index, or use <code>COLLATE NOCASE</code> on the column or index in SQLite. <code>printf()</code> / <code>format()</code> in SQLite builds formatted strings like <code>printf('%08.2f', amount)</code>.</p>`,
    tryIt: { prompt: "Mask each payor phone so only the last 4 digits show: '***-***-' || SUBSTR(phone, -4). What happens for NULL phones?", starter: `SELECT payor_name, phone,\n       '***-***-' || SUBSTR(phone, -4) AS masked\nFROM payors;` },
    challenge: {
      level: 2,
      prompt: "Show each practitioner as a display name like 'Dr. E. Ramirez' (Dr. + first initial + period + space + last name) with their specialty, sorted by last_name.",
      solution: `SELECT 'Dr. ' || SUBSTR(first_name, 1, 1) || '. ' || last_name AS display_name, specialty FROM practitioners ORDER BY last_name;`,
      hints: ['Join text pieces with ||.', 'The first initial is SUBSTR(first_name, 1, 1).', "Pieces: 'Dr. ', the initial, '. ', last_name.", 'Add ORDER BY last_name.'],
      ordered: true,
    },
    quiz: [
      { q: "SUBSTR('Garcia', 2, 3) returns...", options: ['Gar', 'arc', 'rci', 'arci'], answer: 1, why: 'Start at position 2 (a) and take 3 characters.' },
      { q: "'Maria' || NULL returns...", options: ["'Maria'", "'MariaNULL'", 'NULL', 'Error'], answer: 2, why: 'Concatenating NULL gives NULL.' },
    ],
  },

  // ---------------------------------------------------------------- 16
  {
    id: 'fundamentals-16',
    goals: [
      "How SQLite stores dates (ISO text) and why 'YYYY-MM-DD' matters",
      'date(), strftime() and date modifiers like +30 days',
      'How to compute days between dates with julianday()',
      'How to filter by month and year',
    ],
    concept: `<p>In this database, dates are <b>ISO text</b>: <code>'2026-06-10'</code>. Because the year comes first, sorting and comparing the text works naturally.</p>
<ul>
<li><code>date('2026-09-01')</code>: a date. <code>date('2026-09-01', '+30 days')</code>: date math.</li>
<li><code>strftime('%Y-%m', invoice_date)</code>: extract parts (here year-month, like <code>2026-06</code>).</li>
<li><code>julianday(a) - julianday(b)</code>: number of days between two dates.</li>
</ul>
<p>Our "today" is <b>2026-09-01</b>, so we write <code>date('2026-09-01')</code> instead of <code>date('now')</code> to keep results stable.</p>`,
    why: 'Billing is all about time: due dates, days overdue, monthly revenue, aging buckets.',
    when: 'For aging reports, due-date math, monthly/yearly grouping, and date-range filters.',
    analogy: 'The wall calendar in the billing office: count the days since the due date circled in red, flip ahead 30 days to set the next due date, and file statements by month.',
    exampleSql: `SELECT invoice_id, invoice_date, due_date, status FROM invoices WHERE status = 'Overdue' LIMIT 8`,
    syntax: `date(value [, modifier ...])        -- 'YYYY-MM-DD'\nstrftime(format, value)             -- %Y %m %d %W ...\njulianday(value)                    -- days as a number\n-- modifiers: '+30 days', '-1 month', 'start of month'`,
    sql: `SELECT invoice_id, due_date,\n       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_overdue,\n       strftime('%Y-%m', invoice_date)          AS billing_month,\n       date(due_date, '+30 days')               AS final_notice_date\nFROM invoices\nWHERE status = 'Overdue'\nORDER BY days_overdue DESC;`,
    breakdown: [
      ["julianday('2026-09-01') - julianday(due_date)", 'Days between "today" and the due date. CAST makes it a whole number.'],
      ["strftime('%Y-%m', invoice_date)", 'Year and month only, handy for monthly reports.'],
      ["date(due_date, '+30 days')", 'Date math: 30 days after the due date.'],
      ['ORDER BY days_overdue DESC', 'Most overdue first (ORDER BY can use the alias).'],
    ],
    dialectSql: {
      sqlite: `SELECT julianday('2026-09-01') - julianday(due_date), date(due_date, '+30 days') FROM invoices;`,
      postgres: `SELECT DATE '2026-09-01' - due_date, due_date + INTERVAL '30 days' FROM invoices;`,
      mysql: `SELECT DATEDIFF('2026-09-01', due_date), DATE_ADD(due_date, INTERVAL 30 DAY) FROM invoices;`,
      sqlserver: `SELECT DATEDIFF(day, due_date, '2026-09-01'), DATEADD(day, 30, due_date) FROM invoices;`,
      oracle: `SELECT DATE '2026-09-01' - due_date, due_date + 30 FROM invoices;`,
    },
    internals: `<p>SQLite has <b>no DATE type</b>. It stores dates as TEXT, REAL (Julian day numbers) or INTEGER (Unix seconds), and its date functions convert between these. <code>julianday()</code> turns a date into a count of days since 4714 BC, so subtraction gives a day difference. Date functions return NULL for text they cannot parse, such as <code>'2026-9-1'</code> without zero padding.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM invoices WHERE invoice_date = '2026-06';`, why: 'An equality test against a partial date matches nothing, because no invoice_date is exactly the text 2026-06.', fix: `SELECT * FROM invoices WHERE strftime('%Y-%m', invoice_date) = '2026-06';` },
      { wrong: `SELECT due_date - invoice_date FROM invoices;`, why: "Subtracting ISO text converts each to a number (just the year, like 2026), so you get 0. Use julianday() for day differences.", fix: `SELECT julianday(due_date) - julianday(invoice_date) AS days_to_pay FROM invoices;` },
    ],
    rules: [
      "Always store dates as 'YYYY-MM-DD' (zero-padded).",
      'Days between dates: julianday(a) - julianday(b).',
      "Date math: date(d, '+N days' | '-N months' | 'start of month').",
      "Month filter: strftime('%Y-%m', d) = '2026-06', or a range >= '2026-06-01' AND < '2026-07-01' (faster).",
    ],
    compare: `<p>Date syntax is the <b>least portable</b> part of SQL: every database has its own functions (see the dialect tabs). The idea is the same everywhere: extract parts, add intervals, compute differences.</p>`,
    realWorld: 'A/R aging reports (0-30 / 31-60 / 61-90 / 90+ days), timely filing limits (claims must be filed within N days of service), and monthly revenue charts.',
    tips: ["Try SELECT date('2026-09-01', 'start of month', '-1 month'); to get the first day of last month."],
    deep: `<p>Wrapping a column in a function (<code>strftime(..., invoice_date) = ...</code>) prevents index use. A half-open range <code>invoice_date &gt;= '2026-06-01' AND invoice_date &lt; '2026-07-01'</code> gives the same answer and can use an index on invoice_date. With timestamps (not just dates), half-open ranges also avoid missing times like 23:59:59.5.</p>`,
    tryIt: { prompt: "Show each charge's service_date and the day of the week it happened: strftime('%w', service_date) (0 = Sunday).", starter: `SELECT charge_id, service_date,\n       strftime('%w', service_date) AS weekday_number\nFROM charges\nLIMIT 10;` },
    challenge: {
      level: 2,
      prompt: "List invoices dated in June 2026: invoice_id, invoice_date and days_to_due (julianday(due_date) - julianday(invoice_date), as an integer), sorted by invoice_date then invoice_id.",
      solution: `SELECT invoice_id, invoice_date, CAST(julianday(due_date) - julianday(invoice_date) AS INTEGER) AS days_to_due FROM invoices WHERE strftime('%Y-%m', invoice_date) = '2026-06' ORDER BY invoice_date, invoice_id;`,
      hints: ["Filter the month with strftime('%Y-%m', invoice_date) = '2026-06' (or a date range).", 'Days between: julianday(due_date) - julianday(invoice_date).', 'Wrap it in CAST(... AS INTEGER).', 'ORDER BY invoice_date, invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: "date('2026-01-31', '+1 month') in SQLite returns...", options: ["'2026-02-28'", "'2026-03-03'", 'NULL', "'2026-02-31'"], answer: 1, why: "SQLite normalizes Feb 31 by rolling over into March (2026-03-03). Use 'start of month' tricks when you need month ends." },
      { q: 'Why do ISO dates compare correctly as text?', options: ['SQLite has a DATE type', 'Year, month and day are ordered largest to smallest and zero-padded', 'Text is always sorted by date', 'They do not'], answer: 1, why: 'YYYY-MM-DD makes alphabetical order the same as chronological order.' },
    ],
  },

  // ---------------------------------------------------------------- 17
  {
    id: 'fundamentals-17',
    goals: [
      'How ORDER BY sorts results ASC or DESC',
      'How to sort by several columns (tie-breakers)',
      'Where NULLs go when sorting',
      'Why rows have no guaranteed order without ORDER BY',
    ],
    concept: `<p>A table has <b>no built-in order</b>. Without ORDER BY, the database returns rows in whatever order is convenient, and that can change. <b>ORDER BY</b> guarantees the order.</p>
<ul><li><code>ASC</code> (default): smallest first, A→Z, oldest date first.</li>
<li><code>DESC</code>: largest first, Z→A, newest first.</li>
<li>Several columns: <code>ORDER BY status, total_amount DESC</code> sorts by status, and within the same status by amount (highest first).</li>
<li>In SQLite, NULLs sort <b>first</b> in ASC. You can control this with <code>NULLS LAST</code>.</li></ul>`,
    why: 'People read lists top-down. Worklists, rankings and statements only make sense in a deliberate order.',
    when: 'Whenever order matters to the reader or to LIMIT (top N). Every report should have an ORDER BY.',
    analogy: 'Arranging the collections worklist: biggest balances on top, and when two balances are equal, the older invoice first.',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices LIMIT 8`,
    syntax: `SELECT ...\nFROM ...\nORDER BY col1 [ASC|DESC] [NULLS FIRST|LAST],\n         col2 [ASC|DESC];`,
    sql: `SELECT invoice_id, status, invoice_date, total_amount\nFROM invoices\nWHERE status IN ('Overdue', 'Partially Paid')\nORDER BY status, total_amount DESC, invoice_id;`,
    breakdown: [
      ["WHERE status IN ('Overdue', 'Partially Paid')", 'Keep only the collection-worthy invoices.'],
      ['ORDER BY status', 'Group them alphabetically: Overdue before Partially Paid.'],
      ['total_amount DESC', 'Inside each status, biggest balance first.'],
      ['invoice_id', 'Final tie-breaker so the order is fully predictable.'],
    ],
    visual: { type: 'flow', steps: [['FROM invoices', 'all 48 rows, in no guaranteed order'], ["WHERE status IN ('Overdue','Partially Paid')", 'keep collection rows'], ['SELECT columns', 'build the output rows'], ['ORDER BY status', '1st key: Overdue block, then Partially Paid block'], ['then total_amount DESC', '2nd key sorts inside each block'], ['then invoice_id', '3rd key breaks any remaining ties']] },
    internals: `<p>Sorting happens near the end, after SELECT. If an index already stores rows in the requested order, SQLite can read them in order with no sort step. Otherwise it builds a temporary sorter (an in-memory merge sort that spills to disk for big data). <code>EXPLAIN QUERY PLAN</code> shows "USE TEMP B-TREE FOR ORDER BY" when it has to sort.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount, invoice_id DESC;`, why: 'DESC applies only to the column it follows. Here total_amount is still ascending. Put DESC after each column that needs it.', fix: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC, invoice_id DESC;` },
      { wrong: `SELECT invoice_id, total_amount FROM invoices;  -- "it's already sorted by id"`, why: 'Without ORDER BY the order is not guaranteed. It may look sorted today and change after an index is added or data is updated.', fix: `SELECT invoice_id, total_amount FROM invoices ORDER BY invoice_id;` },
    ],
    rules: [
      'No ORDER BY means no guaranteed order.',
      'ASC is the default. DESC applies to one column only.',
      'Add a unique tie-breaker (like the id) for a stable order.',
      'ORDER BY can use SELECT aliases and even expressions.',
    ],
    compare: `<p>ORDER BY sorts <b>rows</b>. It does not group them (GROUP BY) or remove them (WHERE, LIMIT). It is the last step before LIMIT/OFFSET, which is why LIMIT without ORDER BY gives a random-looking "top N".</p>`,
    realWorld: 'Aging worklists (oldest due date first), top-paying payors, patient statements (newest charges first), audit logs (by timestamp).',
    tips: ["Custom order with CASE: ORDER BY CASE status WHEN 'Overdue' THEN 1 WHEN 'Open' THEN 2 ELSE 3 END."],
    deep: `<p>Text sorting follows a <b>collation</b>. SQLite's default BINARY collation sorts 'Z' before 'a' (uppercase codes come first). Use <code>ORDER BY last_name COLLATE NOCASE</code> for case-insensitive order. SQLite supports <code>NULLS FIRST/LAST</code> since 3.30.</p>`,
    tryIt: { prompt: 'Sort patients by city (NULL cities last), then by last_name.', starter: `SELECT patient_id, first_name, last_name, city\nFROM patients\nORDER BY city NULLS LAST, last_name;` },
    challenge: {
      level: 2,
      prompt: 'List all payments with payment_id, payment_date, method and amount, sorted by amount from highest to lowest, with ties broken by payment_date (oldest first) and then payment_id.',
      solution: `SELECT payment_id, payment_date, method, amount FROM payments ORDER BY amount DESC, payment_date, payment_id;`,
      hints: ['Use the payments table.', 'The first sort key is amount DESC.', 'Then payment_date ascending (the default).', 'ORDER BY amount DESC, payment_date, payment_id'],
      ordered: true,
    },
    quiz: [
      { q: 'ORDER BY a, b DESC sorts...', options: ['a DESC and b DESC', 'a ASC and b DESC', 'a DESC and b ASC', 'Only by b'], answer: 1, why: 'Each column has its own direction. The default is ASC.' },
      { q: 'In SQLite, where do NULLs appear with ORDER BY city ASC?', options: ['First', 'Last', 'Removed', 'Random'], answer: 0, why: 'SQLite treats NULL as smaller than any value. Use NULLS LAST to change this.' },
    ],
  },

  // ---------------------------------------------------------------- 18
  {
    id: 'fundamentals-18',
    goals: [
      'How LIMIT caps the number of rows returned',
      'How OFFSET skips rows for pagination',
      'Why LIMIT needs ORDER BY to be meaningful',
      'The page-number formula and why deep OFFSETs get slow',
    ],
    concept: `<p><b>LIMIT n</b> returns at most n rows. <b>OFFSET k</b> skips the first k rows. Together they cut out a "page" of results.</p>
<p>Page p (starting at 1) with page size s: <code>LIMIT s OFFSET (p - 1) * s</code>. So page 2 of 5 rows is <code>LIMIT 5 OFFSET 5</code>.</p>
<p>LIMIT happens <b>after</b> ORDER BY. Without ORDER BY, "the top 5" is just any 5 rows.</p>`,
    why: 'Screens show 10 or 25 rows at a time, and dashboards show a "top 5". Sending all rows would be slow and useless.',
    when: 'Top-N lists, paginated tables in apps, and quick previews (LIMIT 10) while exploring.',
    analogy: 'The statement printer holds 5 lines per page. Page 1 is lines 1-5, page 2 skips 5 lines and prints the next 5. The lines must be in a fixed order first, or pages would overlap and skip rows.',
    exampleSql: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC, invoice_id LIMIT 15`,
    syntax: `SELECT ...\nFROM ...\nORDER BY ...\nLIMIT page_size OFFSET rows_to_skip;`,
    sql: `SELECT invoice_id, patient_id, total_amount\nFROM invoices\nORDER BY total_amount DESC, invoice_id\nLIMIT 5 OFFSET 5;   -- page 2`,
    breakdown: [
      ['ORDER BY total_amount DESC, invoice_id', 'A fixed, fully determined order (the id breaks ties).'],
      ['LIMIT 5', 'Page size: at most 5 rows.'],
      ['OFFSET 5', 'Skip page 1 (rows 1-5), so we get rows 6-10.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 600 150" width="100%" font-family="sans-serif" font-size="12">
<text x="10" y="18" fill="var(--text)" font-weight="bold">48 invoices sorted by total_amount DESC</text>
<g>
<rect x="10" y="30" width="55" height="34" fill="var(--muted)" opacity="0.3"/><rect x="67" y="30" width="55" height="34" fill="var(--muted)" opacity="0.3"/><rect x="124" y="30" width="55" height="34" fill="var(--muted)" opacity="0.3"/><rect x="181" y="30" width="55" height="34" fill="var(--muted)" opacity="0.3"/><rect x="238" y="30" width="55" height="34" fill="var(--muted)" opacity="0.3"/>
<rect x="300" y="30" width="55" height="34" fill="var(--green)" opacity="0.6"/><rect x="357" y="30" width="55" height="34" fill="var(--green)" opacity="0.6"/><rect x="414" y="30" width="55" height="34" fill="var(--green)" opacity="0.6"/><rect x="471" y="30" width="55" height="34" fill="var(--green)" opacity="0.6"/><rect x="528" y="30" width="55" height="34" fill="var(--green)" opacity="0.6"/>
</g>
<text x="37" y="52" text-anchor="middle" fill="var(--text)">1</text><text x="94" y="52" text-anchor="middle" fill="var(--text)">2</text><text x="151" y="52" text-anchor="middle" fill="var(--text)">3</text><text x="208" y="52" text-anchor="middle" fill="var(--text)">4</text><text x="265" y="52" text-anchor="middle" fill="var(--text)">5</text>
<text x="327" y="52" text-anchor="middle" fill="var(--text)">6</text><text x="384" y="52" text-anchor="middle" fill="var(--text)">7</text><text x="441" y="52" text-anchor="middle" fill="var(--text)">8</text><text x="498" y="52" text-anchor="middle" fill="var(--text)">9</text><text x="555" y="52" text-anchor="middle" fill="var(--text)">10</text>
<path d="M10 72 H293" stroke="var(--red)" stroke-width="2"/><text x="150" y="90" text-anchor="middle" fill="var(--red)">OFFSET 5: read, then skipped</text>
<path d="M300 72 H583" stroke="var(--green)" stroke-width="2"/><text x="441" y="90" text-anchor="middle" fill="var(--green)">LIMIT 5: returned (page 2)</text>
<text x="300" y="125" text-anchor="middle" fill="var(--muted)">page p, size s: LIMIT s OFFSET (p - 1) * s. Rows 11-48 are never needed.</text>
</svg>` },
    internals: `<p>OFFSET does not magically jump ahead. The engine still <b>produces and throws away</b> the skipped rows, so <code>OFFSET 100000</code> computes 100,000 rows just to discard them. Once LIMIT is reached, the engine stops early. With ORDER BY and no helpful index, it must still sort everything, but it can keep only the top (offset + limit) rows in a small heap.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, total_amount FROM invoices LIMIT 5;  -- "top 5 invoices"`, why: 'Without ORDER BY, LIMIT returns an arbitrary 5 rows, not the biggest ones.', fix: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC LIMIT 5;` },
      { wrong: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC LIMIT 5 OFFSET 5;`, why: 'Many invoices share the same total_amount. With ties and no tie-breaker, a row can appear on both page 1 and page 2, or on neither. Add a unique column to ORDER BY.', fix: `SELECT invoice_id, total_amount FROM invoices ORDER BY total_amount DESC, invoice_id LIMIT 5 OFFSET 5;` },
      { wrong: `SELECT invoice_id FROM invoices ORDER BY invoice_id LIMIT 5 OFFSET 2 * 5 - 5 + 1;  -- page 2`, why: 'Off-by-one: the offset for page p is (p - 1) * size. Here it is 6, so row 6 is skipped.', fix: `SELECT invoice_id FROM invoices ORDER BY invoice_id LIMIT 5 OFFSET 5;` },
    ],
    rules: [
      'Always pair LIMIT with ORDER BY.',
      'Include a unique tie-breaker in ORDER BY for stable pages.',
      'OFFSET = (page - 1) * page_size.',
      'Deep OFFSETs are slow. Consider keyset pagination.',
    ],
    compare: `<table><tr><th>Database</th><th>Syntax</th></tr>
<tr><td>SQLite, PostgreSQL, MySQL</td><td>LIMIT 5 OFFSET 5</td></tr>
<tr><td>SQL Server</td><td>TOP 5, or OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY</td></tr>
<tr><td>Oracle / ANSI</td><td>OFFSET 5 ROWS FETCH FIRST 5 ROWS ONLY</td></tr></table>`,
    realWorld: 'Every paged table in a billing web app (invoices list, payment history) uses LIMIT/OFFSET or keyset pagination.',
    tips: ['Use LIMIT 10 when exploring a big table, so you don\'t flood your screen.'],
    deep: `<p><b>Keyset (seek) pagination</b> remembers the last row shown and asks for the next rows after it: <code>WHERE (total_amount, invoice_id) &lt; (:last_amt, :last_id) ORDER BY total_amount DESC, invoice_id DESC LIMIT 5</code>. With an index, this is equally fast on page 1 and page 10,000, and it does not shift when new rows are inserted.</p>`,
    tryIt: { prompt: 'Show page 3 (size 5) of the list, then page 10. What does a page beyond the end return?', starter: `SELECT invoice_id, patient_id, total_amount\nFROM invoices\nORDER BY total_amount DESC, invoice_id\nLIMIT 5 OFFSET 10;` },
    challenge: {
      level: 2,
      prompt: 'Show the 3 most expensive charges (by amount, ties broken by charge_id ascending), skipping the single most expensive one. In other words, ranks 2 to 4. Columns: charge_id, description, amount.',
      solution: `SELECT charge_id, description, amount FROM charges ORDER BY amount DESC, charge_id LIMIT 3 OFFSET 1;`,
      hints: ['Sort charges by amount DESC.', 'Add charge_id as a tie-breaker.', 'Skip one row with OFFSET 1.', 'ORDER BY amount DESC, charge_id LIMIT 3 OFFSET 1'],
      ordered: true,
    },
    quiz: [
      { q: 'Page 4 with 20 rows per page uses...', options: ['LIMIT 20 OFFSET 80', 'LIMIT 20 OFFSET 60', 'LIMIT 80 OFFSET 20', 'LIMIT 4 OFFSET 20'], answer: 1, why: '(4 - 1) * 20 = 60.' },
      { q: 'Why add invoice_id to ORDER BY total_amount before paginating?', options: ['It is faster', 'It makes the order unique so pages do not overlap', 'LIMIT requires two columns', 'It removes duplicates'], answer: 1, why: 'Ties make the order ambiguous between pages.' },
    ],
  },

  // ---------------------------------------------------------------- 19
  {
    id: 'fundamentals-19',
    goals: [
      'What NULL means: unknown or missing, not zero or empty',
      'Why = NULL never works and IS NULL does',
      'How COALESCE / IFNULL replace NULLs and NULLIF creates them',
      'How NULL spreads through expressions',
    ],
    concept: `<p><b>NULL</b> means "no value / unknown". A patient with a NULL email didn't give one. It is <b>not</b> the empty text <code>''</code> and <b>not</b> zero.</p>
<p>Because NULL is unknown, comparing with it gives <b>unknown</b>, not true. So <code>email = NULL</code> is never true, even for missing emails. Use:</p>
<ul><li><code>IS NULL</code> / <code>IS NOT NULL</code> to test for missing values.</li>
<li><code>COALESCE(a, b, ...)</code> returns the first non-NULL value (a fallback). <code>IFNULL(a, b)</code> is the two-argument version.</li>
<li><code>NULLIF(a, b)</code> returns NULL when a = b (handy to avoid dividing by zero).</li></ul>`,
    why: 'Real data is incomplete: missing emails, unknown cities, self-pay invoices with no payor. You must handle NULLs or your filters and math silently go wrong.',
    when: 'Any column that allows NULL: filters (IS NULL), display (COALESCE), math (NULLIF to avoid division errors).',
    analogy: 'On the intake form, the email box is left blank. You cannot say the email "equals blank". It is simply unknown. You can only ask "was the box left empty?" (IS NULL).',
    exampleSql: `SELECT patient_id, first_name, city, email, allergies, primary_payor_id FROM patients LIMIT 12`,
    syntax: `WHERE col IS NULL\nWHERE col IS NOT NULL\nCOALESCE(col, fallback1, fallback2)\nIFNULL(col, fallback)     -- SQLite/MySQL\nNULLIF(a, b)              -- NULL if a = b`,
    sql: `SELECT patient_id, first_name, last_name,\n       COALESCE(email, 'no email on file')  AS contact_email,\n       COALESCE(city, 'Unknown')            AS city,\n       COALESCE(allergies, 'None recorded') AS allergies\nFROM patients\nWHERE email IS NULL OR city IS NULL;`,
    breakdown: [
      ['WHERE email IS NULL OR city IS NULL', 'Patients missing an email or a city. IS NULL is the only correct test.'],
      ["COALESCE(email, 'no email on file')", 'Show the email, or a friendly fallback when it is missing.'],
      ["COALESCE(city, 'Unknown')", 'Same idea for city.'],
      ["COALESCE(allergies, 'None recorded')", 'NULL allergies means none were recorded, which is not the same as "no allergies".'],
    ],
    visual: { type: 'null' },
    internals: `<p>SQL uses <b>three-valued logic</b>: TRUE, FALSE, UNKNOWN. <code>NULL = NULL</code> is UNKNOWN. WHERE keeps only TRUE rows, so UNKNOWN rows vanish. <code>IS NULL</code> is a special operator that always returns TRUE or FALSE. Internally, NULL is a distinct storage class, and a NULL column costs almost no space in a SQLite record.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM patients WHERE email = NULL;`, why: 'Anything = NULL is UNKNOWN, never TRUE, so this returns zero rows even though some emails are missing.', fix: `SELECT * FROM patients WHERE email IS NULL;` },
      { wrong: `SELECT * FROM patients WHERE city <> 'Dallas';   -- "everyone not in Dallas"`, why: "Patients with a NULL city are also dropped, because NULL <> 'Dallas' is UNKNOWN. Include them explicitly if you want them.", fix: `SELECT * FROM patients WHERE city <> 'Dallas' OR city IS NULL;` },
      { wrong: `SELECT total_amount / 0 FROM invoices;  -- in PostgreSQL this errors`, why: 'Division by zero is an error in most databases (SQLite returns NULL). NULLIF turns a zero divisor into NULL, so the result is NULL instead of an error.', fix: `SELECT invoice_id, total_amount / NULLIF(total_amount, 0) AS ratio FROM invoices;` },
    ],
    rules: [
      'Test NULL with IS NULL / IS NOT NULL, never with = or <>.',
      "NULL is not 0 and not ''.",
      'Any arithmetic or || with NULL gives NULL.',
      'COALESCE picks the first non-NULL value. NULLIF(a, b) makes NULL when a = b.',
    ],
    compare: `<table><tr><th>Function</th><th>Portable?</th><th>Args</th></tr>
<tr><td>COALESCE</td><td>ANSI, everywhere</td><td>2 or more</td></tr>
<tr><td>IFNULL</td><td>SQLite, MySQL</td><td>2</td></tr>
<tr><td>ISNULL(a, b)</td><td>SQL Server</td><td>2</td></tr>
<tr><td>NVL</td><td>Oracle</td><td>2</td></tr></table>`,
    realWorld: 'Data-quality reports ("patients with no email"), statements that print "Self-Pay" when payor_id is NULL, and safe percentage math with NULLIF.',
    tips: ['COUNT(email) counts only non-NULL emails, while COUNT(*) counts rows. Very useful for data quality checks.'],
    deep: `<p>SQLite offers <code>a IS b</code> / <code>a IS NOT b</code> as NULL-safe equality (the ANSI form is <code>IS [NOT] DISTINCT FROM</code>, also supported). NULL handling in NOT IN is a famous trap: if the list contains a NULL, <code>x NOT IN (...)</code> is never TRUE. See Advanced Filtering.</p>`,
    tryIt: { prompt: "Show all invoices with payor_id NULL, and display COALESCE(payor_id, 'Self-pay') as payer.", starter: `SELECT invoice_id, patient_id, payor_id,\n       COALESCE(payor_id, 'Self-pay') AS payer\nFROM invoices\nWHERE payor_id IS NULL;` },
    challenge: {
      level: 2,
      prompt: "List patients who have NO primary payor (primary_payor_id is NULL). Show patient_id, first_name, last_name and COALESCE(city, 'Unknown') as city, sorted by patient_id.",
      solution: `SELECT patient_id, first_name, last_name, COALESCE(city, 'Unknown') AS city FROM patients WHERE primary_payor_id IS NULL ORDER BY patient_id;`,
      hints: ['Missing payor means primary_payor_id IS NULL, not = NULL.', 'Replace NULL cities with COALESCE(city, \'Unknown\').', 'Sort by patient_id.', "SELECT patient_id, first_name, last_name, COALESCE(city, 'Unknown') FROM patients WHERE primary_payor_id IS NULL ORDER BY patient_id;"],
      ordered: true,
    },
    quiz: [
      { q: 'What does WHERE email = NULL return?', options: ['Rows with missing email', 'All rows', 'No rows', 'Error'], answer: 2, why: '= NULL is UNKNOWN for every row.' },
      { q: "COALESCE(NULL, NULL, 'x', 'y') returns...", options: ['NULL', "'x'", "'y'", 'Error'], answer: 1, why: 'The first non-NULL argument wins.' },
      { q: 'NULLIF(0, 0) returns...', options: ['0', 'NULL', '1', 'Error'], answer: 1, why: 'NULLIF gives NULL when both arguments are equal.' },
    ],
  },

  // ---------------------------------------------------------------- 20
  {
    id: 'fundamentals-20',
    goals: [
      'What a transaction is: several statements that succeed or fail together',
      'BEGIN, COMMIT and ROLLBACK',
      'Why posting a payment needs a transaction',
      'What other sessions see before you commit',
    ],
    concept: `<p>A <b>transaction</b> groups several changes into <b>one all-or-nothing unit</b>.</p>
<ul><li><code>BEGIN</code> starts it.</li>
<li><code>COMMIT</code> makes all changes permanent and visible to others.</li>
<li><code>ROLLBACK</code> undoes everything since BEGIN, as if nothing happened.</li></ul>
<p>Posting a payment touches three tables: insert the payment, insert a ledger transaction, update the invoice status. If the computer crashes after step 1, the books would not balance. A transaction guarantees that either all three happen or none do.</p>`,
    why: 'Money must never be half-posted. Transactions keep related changes consistent even if an error, crash or power cut happens midway.',
    when: 'Whenever two or more changes belong together: payment posting, transfers, bulk corrections, anything where a partial result would be wrong.',
    analogy: 'A cashier posting a patient payment writes it in pencil on three forms (receipt, ledger, invoice). Only when all three are filled in correctly do they ink them (COMMIT). If anything goes wrong, they erase all three (ROLLBACK).',
    exampleSql: `SELECT invoice_id, status, total_amount FROM invoices WHERE invoice_id = 3`,
    syntax: `BEGIN;            -- or BEGIN TRANSACTION\n  statement 1;\n  statement 2;\nCOMMIT;           -- keep everything\n-- or\nROLLBACK;         -- undo everything`,
    sql: `BEGIN;\n\nINSERT INTO payments (payment_id, invoice_id, payor_id, payment_date, amount, method)\nVALUES (48, 3, 2, '2026-09-01', 60, 'EFT');\n\nINSERT INTO transactions (transaction_id, invoice_id, transaction_date, transaction_type, amount, reference_id, posted_by)\nVALUES (155, 3, '2026-09-01', 'PAYMENT', -60, 48, 'billing.amy');\n\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\n\nCOMMIT;\n\nSELECT invoice_id, status FROM invoices WHERE invoice_id = 3;`,
    breakdown: [
      ['BEGIN;', 'Start a unit of work. Nothing is permanent yet.'],
      ['INSERT INTO payments ...', 'Step 1: record the $60 EFT from Aetna.'],
      ['INSERT INTO transactions ...', 'Step 2: add the matching ledger line (negative, since it lowers the balance).'],
      ["UPDATE invoices SET status = 'Paid' ...", 'Step 3: mark the invoice paid.'],
      ['COMMIT;', 'All three become permanent together. With ROLLBACK instead, none would.'],
    ],
    visual: { type: 'txn', scenario: 'rollback' },
    internals: `<p>SQLite records the original content of every page it changes in a <b>rollback journal</b> (or appends new pages to a <b>write-ahead log</b> in WAL mode). ROLLBACK restores those pages. COMMIT is the moment the journal is finalized and synced to disk, which is what makes the change <b>durable</b>. Without an explicit BEGIN, every single statement runs in its own automatic transaction (autocommit).</p>
<p>While your transaction is open, other connections see the <b>old</b> data (isolation). SQLite allows only one writer at a time.</p>`,
    mistakes: [
      { wrong: `INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (3, 2, '2026-09-01', 60, 'EFT');\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 999;  -- oops, wrong id`, why: 'Without a transaction, the payment is already saved even though the invoice update hit the wrong row (0 rows changed). The books are now inconsistent.', fix: `BEGIN;\nINSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) VALUES (3, 2, '2026-09-01', 60, 'EFT');\nUPDATE invoices SET status = 'Paid' WHERE invoice_id = 3;\nCOMMIT;` },
      { wrong: `BEGIN;\nDELETE FROM payments WHERE payment_id = 3;\n-- ...forgot to COMMIT or ROLLBACK`, why: 'An open transaction holds locks and blocks other writers. In SQLite, closing the connection without COMMIT rolls the work back. Always finish with COMMIT or ROLLBACK.', fix: `BEGIN;\nDELETE FROM payments WHERE payment_id = 3;\nROLLBACK;` },
    ],
    rules: [
      'BEGIN ... COMMIT means all changes are kept together.',
      'ROLLBACK means every change since BEGIN is undone.',
      'Keep transactions short: lock, do the work, commit.',
      'Without BEGIN, each statement auto-commits on its own.',
    ],
    compare: `<p><b>Transaction vs. single statement:</b> one UPDATE is already atomic by itself. You need BEGIN/COMMIT when <i>several</i> statements must succeed together. <b>SAVEPOINT</b> (advanced) lets you roll back part of a transaction.</p>`,
    realWorld: 'Payment posting, ERA (835) auto-posting, month-end close adjustments, and patient merges (like our duplicate patient 25) all run inside transactions.',
    tips: ['Try it: run BEGIN; DELETE FROM payments; SELECT COUNT(*) FROM payments; ROLLBACK; SELECT COUNT(*) FROM payments;'],
    deep: `<p>Transactions deliver the <b>ACID</b> guarantees: Atomicity (all or nothing), Consistency (constraints hold), Isolation (concurrent transactions don't see each other's partial work) and Durability (committed data survives crashes). Isolation levels (READ COMMITTED, SERIALIZABLE...) trade safety against concurrency. See the Data Modification & Transactions section.</p>`,
    tryIt: { prompt: 'Run this: delete all payments inside a transaction, count them, then ROLLBACK and count again.', starter: `BEGIN;\nDELETE FROM payments;\nSELECT COUNT(*) AS during_txn FROM payments;\nROLLBACK;\nSELECT COUNT(*) AS after_rollback FROM payments;` },
    challenge: {
      level: 2,
      prompt: 'Before posting a new payment to invoice 13, a careful biller checks what is already posted. Show payment_id, payment_date, amount and method of the existing payments on invoice 13, oldest first.',
      solution: `SELECT payment_id, payment_date, amount, method FROM payments WHERE invoice_id = 13 ORDER BY payment_date, payment_id;`,
      hints: ['Payments are in the payments table.', 'Filter WHERE invoice_id = 13.', 'Oldest first means ORDER BY payment_date.', 'SELECT payment_id, payment_date, amount, method FROM payments WHERE invoice_id = 13 ORDER BY payment_date, payment_id;'],
      ordered: true,
    },
    quiz: [
      { q: 'You run BEGIN; UPDATE ...; UPDATE ...; ROLLBACK; How many updates are kept?', options: ['2', '1', '0', 'Depends'], answer: 2, why: 'ROLLBACK undoes everything since BEGIN.' },
      { q: 'Which ACID property means "all or nothing"?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 0, why: 'Atomicity: the transaction is one indivisible unit.' },
    ],
  },
  // ---------------------------------------------------------------- 21
  {
    id: 'fundamentals-21',
    goals: [
      'Format SQL so the structure is visible at a glance: one clause per line, indentation',
      'Choose meaningful table aliases and column names',
      'Use CTEs to break a long query into named, readable steps',
      'Write comments that explain WHY, and follow consistent naming conventions',
      'Apply a short style checklist before sharing a query',
    ],
    concept: `<p>SQL is read far more often than it is written: by teammates, auditors, and by you in six months. <b>Readable SQL</b> makes bugs visible. The database does not care about spaces and line breaks, so use them for humans.</p>
<ul>
<li><b>One clause per line</b>: SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY each start a line. Indent what belongs to them.</li>
<li><b>One column per line</b> in long SELECT lists (leading or trailing commas, just be consistent).</li>
<li><b>Meaningful aliases</b>: <code>invoices i</code>, <code>payors p</code>, not <code>a</code>, <code>b</code>, <code>t1</code>. Always prefix columns with the alias when more than one table is involved.</li>
<li><b>Name every computed column</b>: <code>SUM(total_amount) AS billed</code>.</li>
<li><b>CTEs</b> turn a nested query into a story of named steps: first <code>open_invoices</code>, then <code>payor_totals</code>, then the final SELECT.</li>
<li><b>Comments</b> (<code>-- ...</code> or <code>/* ... */</code>) explain business rules and "why", not what the syntax already says.</li>
<li><b>Consistent case</b>: keywords in UPPER CASE, names in snake_case lower case.</li>
</ul>`,
    why: 'Formatting is how you see the shape of a query. A join on the wrong column hides easily in a 300-character one-liner and jumps out when each ON condition sits on its own line.',
    when: 'Always, but especially for queries that are saved (reports, views, dashboards), reviewed by someone else, or longer than a few lines.',
    analogy: 'A claim form has labeled boxes in a fixed layout, so any biller can find the payor or the CPT code in a second. The same data scribbled on a sticky note is technically complete but slow to check and easy to misread.',
    exampleSql: `SELECT invoice_id, patient_id, payor_id, status, total_amount FROM invoices ORDER BY invoice_id LIMIT 6`,
    syntax: `-- Purpose: what this query answers (and for whom)
WITH step_one AS (
    SELECT ...
    FROM table_a AS a
    WHERE ...
)
SELECT
    a.column_one,
    b.column_two,
    SUM(a.amount) AS total_amount
FROM step_one AS a
JOIN table_b AS b
    ON b.id = a.b_id
WHERE a.status = 'Open'
GROUP BY a.column_one, b.column_two
ORDER BY total_amount DESC;`,
    sql: `-- Open A/R by payor type: what is still owed, excluding voided invoices.
-- "Open" here means any status other than Paid or Void.
WITH open_invoices AS (
    SELECT
        i.invoice_id,
        i.payor_id,
        i.total_amount
    FROM invoices AS i
    WHERE i.status NOT IN ('Paid', 'Void')
),
payments_per_invoice AS (
    SELECT
        pm.invoice_id,
        SUM(pm.amount) AS paid_amount
    FROM payments AS pm
    GROUP BY pm.invoice_id
)
SELECT
    COALESCE(py.payor_type, 'No payor') AS payor_type,
    COUNT(*)                            AS open_invoice_count,
    SUM(oi.total_amount - COALESCE(ppi.paid_amount, 0)) AS open_balance
FROM open_invoices AS oi
LEFT JOIN payments_per_invoice AS ppi
    ON ppi.invoice_id = oi.invoice_id
LEFT JOIN payors AS py
    ON py.payor_id = oi.payor_id      -- invoices without a payor are self-pay leftovers
GROUP BY COALESCE(py.payor_type, 'No payor')
ORDER BY open_balance DESC;`,
    breakdown: [
      ['-- Open A/R by payor type ...', 'A header comment: what the query answers and the business definition of "open".'],
      ['WITH open_invoices AS (...)', 'Step 1, named for what it holds: the invoices we care about.'],
      ['payments_per_invoice AS (...)', 'Step 2: payments pre-aggregated to one row per invoice (so the join cannot fan out).'],
      ['FROM open_invoices AS oi LEFT JOIN ... AS ppi', 'Short but meaningful aliases: oi = open invoices, ppi = payments per invoice, py = payor.'],
      ['ON ppi.invoice_id = oi.invoice_id', 'Each join condition on its own indented line: easy to check that the right keys are matched.'],
      ['AS open_invoice_count / AS open_balance', 'Every computed column gets a clear snake_case name.'],
      ['-- invoices without a payor ...', 'An inline comment explaining WHY a LEFT JOIN is needed.'],
    ],
    internals: `<p>The parser throws away whitespace, line breaks and comments before planning, so formatting has zero effect on speed. CTEs are also mostly free: SQLite (like PostgreSQL 12+) usually <b>inlines</b> a CTE referenced once, planning it exactly like the equivalent nested subquery. You can check with <code>EXPLAIN QUERY PLAN</code>: the formatted and the one-line versions give the same plan.</p>`,
    mistakes: [
      { wrong: `select a.payor_name,count(*),sum(b.total_amount) from payors a,invoices b where a.payor_id=b.payor_id and b.status<>'Void' group by a.payor_name`, why: 'One line, cryptic aliases (a, b), old comma-join syntax with the join condition mixed into WHERE, and unnamed computed columns. It works, but it is hard to review and the columns come out as "count(*)".', fix: `SELECT
    p.payor_name,
    COUNT(*)            AS invoice_count,
    SUM(i.total_amount) AS billed
FROM invoices AS i
JOIN payors AS p
    ON p.payor_id = i.payor_id
WHERE i.status <> 'Void'
GROUP BY p.payor_name;` },
      { wrong: `SELECT invoice_id, total_amount * 0.8 FROM invoices;  -- multiply by 0.8`, why: 'The comment repeats the code and the magic number 0.8 is unexplained. Comments should say why (whose rate, which rule), and the column needs a name.', fix: `SELECT invoice_id,
       total_amount * 0.8 AS expected_blueshield_payment   -- BlueShield pays 80% of billed (contract_rate)
FROM invoices
WHERE payor_id = 1;` },
      { wrong: `SELECT * FROM invoices i JOIN payors p ON p.payor_id = i.payor_id;`, why: 'SELECT * in a saved query returns columns you did not ask for (two payor_id columns), breaks when a column is added, and hides what the report actually uses.', fix: `SELECT i.invoice_id, i.invoice_date, p.payor_name, i.total_amount
FROM invoices AS i
JOIN payors AS p ON p.payor_id = i.payor_id;` },
    ],
    rules: [
      'One clause per line; indent what belongs to it.',
      'Meaningful aliases, and prefix every column when there is more than one table.',
      'Name every computed column with AS.',
      'Use CTEs for multi-step logic; name them for what they contain.',
      'Comment the why (business rules), not the what.',
    ],
    compare: `<table><tr><th>Checklist item</th><th>Avoid</th><th>Prefer</th></tr>
<tr><td>Keywords</td><td>select / Select / SELECT mixed</td><td>SELECT (one style everywhere)</td></tr>
<tr><td>Names</td><td>InvoiceTotal, "invoice total"</td><td>invoice_total (snake_case)</td></tr>
<tr><td>Aliases</td><td>a, b, t1</td><td>i (invoices), p (payors), pm (payments)</td></tr>
<tr><td>Joins</td><td>FROM a, b WHERE a.x = b.x</td><td>JOIN b ON b.x = a.x</td></tr>
<tr><td>Nesting</td><td>3 levels of subqueries</td><td>A chain of named CTEs</td></tr>
<tr><td>Columns</td><td>SELECT * in saved queries</td><td>Explicit column list</td></tr>
<tr><td>Sorting / grouping</td><td>ORDER BY 3, GROUP BY 1, 2 in saved code</td><td>Column names or aliases</td></tr></table>`,
    realWorld: 'Analytics teams enforce a style guide with linters such as SQLFluff in code review and CI. Saved report queries, dbt models and views are read and changed by many people for years; formatting and CTE structure are what make them maintainable.',
    tips: [
      'Put the join key of the new table on the left in ON (ON p.payor_id = i.payor_id) and keep it consistent.',
      'Let a formatter (SQLFluff, your editor) handle spacing so reviews focus on logic.',
      'Build and test each CTE on its own by temporarily selecting from it.',
    ],
    deep: `<p>Leading commas (<code>, column_two</code>) make it easy to comment out the last column and produce cleaner diffs; trailing commas read more naturally. Either is fine if the whole team uses one. Some teams also ban <code>ORDER BY 1</code> and <code>GROUP BY 1</code> in production code, because positional references break silently when someone reorders the SELECT list. Readable SQL is also safer SQL: a formatted query in a pull request is how a reviewer spots a missing join condition before it double-counts revenue.</p>`,
    tryIt: {
      prompt: 'Reformat this one-liner: one clause per line, meaningful aliases, named columns. Run it before and after; the result must not change.',
      starter: `select t.practitioner_id,x.last_name,count(*),sum(t.amount) from charges t join practitioners x on x.practitioner_id=t.practitioner_id group by t.practitioner_id,x.last_name order by 4 desc;`,
    },
    challenge: {
      level: 2,
      buggy: `select p.payor_name,count(*) n,sum(i.total_amount) billed from invoices i join payors p on p.payor_id=i.patient_id where i.status<>'Void' group by p.payor_name order by billed desc`,
      prompt: 'This unreadable query should report, per payor, the number of non-void invoices and the total billed, highest billed first (ties by payor_name). Rewrite it readably (one clause per line, named columns). While you do, you will spot the bug hiding in the one-liner. Fix it.',
      solution: `SELECT
    p.payor_name,
    COUNT(*)            AS invoice_count,
    SUM(i.total_amount) AS billed
FROM invoices AS i
JOIN payors AS p
    ON p.payor_id = i.payor_id
WHERE i.status <> 'Void'
GROUP BY p.payor_name
ORDER BY billed DESC, p.payor_name;`,
      hints: [
        'Put each clause on its own line first; then read the ON condition slowly.',
        'The join compares payors.payor_id with a column from invoices. Is it the right one?',
        'It should be ON p.payor_id = i.payor_id, not i.patient_id.',
        'Add a tie-breaker: ORDER BY billed DESC, p.payor_name.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Does formatting (line breaks, indentation) change how fast a query runs?', options: ['Yes, shorter queries run faster', 'No, the parser ignores whitespace and comments', 'Only in SQLite', 'Only for CTEs'], answer: 1, why: 'Formatting is purely for humans.' },
      { q: 'Which comment is most useful?', options: ['-- select invoices', '-- join payors', '-- Medicare pays 65% of billed per the 2026 contract', '-- end of query'], answer: 2, why: 'Good comments explain business rules and why, not the syntax.' },
      { q: 'What is the main readability benefit of CTEs?', options: ['They always run faster', 'They turn nested logic into named steps you can read top to bottom and test one at a time', 'They remove the need for JOINs', 'They cache results forever'], answer: 1, why: 'Named steps tell the story of the query.' },
    ],
  },

  // ---------------------------------------------------------------- 22
  {
    id: 'fundamentals-22',
    goals: [
      'Where NULLs go when you sort, and how it differs between databases',
      'Control it with NULLS FIRST / NULLS LAST (supported by SQLite 3.30+)',
      'Emulate NULLS LAST where it is not supported (CASE / IS NULL trick)',
      'Pick a random sample with ORDER BY RANDOM() LIMIT n',
      'Know TABLESAMPLE and repeatable (hash-based) sampling',
    ],
    concept: `<p><b>NULL ordering.</b> NULL is not a value, so where should it go in a sort? Each database picks a default:</p>
<ul>
<li><b>SQLite, MySQL, SQL Server</b>: NULLs are the <b>smallest</b>, so they come <b>first</b> in ASC and <b>last</b> in DESC.</li>
<li><b>PostgreSQL, Oracle</b>: NULLs are the <b>largest</b>, so they come <b>last</b> in ASC and <b>first</b> in DESC.</li>
</ul>
<p>To be explicit (and portable between SQLite, PostgreSQL and Oracle), add <code>NULLS FIRST</code> or <code>NULLS LAST</code> after the sort direction: <code>ORDER BY city ASC NULLS LAST</code>. Patients with no city on file then appear at the end of a mailing list instead of the top.</p>
<p><b>Random sampling.</b> <code>ORDER BY RANDOM() LIMIT 5</code> gives 5 random rows: each row gets a random number, rows are sorted by it, and the first 5 are kept. Every run gives a different sample, which is perfect for spot checks ("audit 5 random paid invoices"). PostgreSQL and SQL Server also have <code>TABLESAMPLE</code> for fast sampling of huge tables.</p>`,
    why: 'Default NULL placement differs between engines, so the same report can put blank cities at the top in one database and the bottom in another. Random samples are how auditors and analysts check data quality without reading every row.',
    when: 'Use NULLS FIRST/LAST whenever a sort column can be NULL and position matters (lists, "top N", pagination). Use random sampling for audits, QA spot checks, and quick previews of large tables.',
    analogy: 'Filing patient folders alphabetically by city: folders with no city written on them must go somewhere, at the very front or the very back. NULLS LAST is the rule "put unlabeled folders at the back". A random sample is the auditor closing their eyes and pulling five folders from the cabinet.',
    exampleSql: `SELECT patient_id, first_name, last_name, city, email FROM patients WHERE city IS NULL OR patient_id <= 4 ORDER BY patient_id`,
    syntax: `ORDER BY column [ASC | DESC] [NULLS FIRST | NULLS LAST]

-- random sample
ORDER BY RANDOM() LIMIT n

-- emulation where NULLS LAST is missing (MySQL, SQL Server)
ORDER BY CASE WHEN column IS NULL THEN 1 ELSE 0 END, column`,
    sql: `SELECT patient_id, first_name, last_name, city
FROM patients
ORDER BY city ASC NULLS LAST, last_name, first_name;`,
    breakdown: [
      ['SELECT patient_id, first_name, last_name, city', 'A simple mailing-list style projection.'],
      ['ORDER BY city ASC', 'Cities alphabetically: Austin, Dallas, Houston, Plano, Round Rock.'],
      ['NULLS LAST', 'Without it, SQLite would put the 6 patients with no city FIRST (NULL sorts as smallest).'],
      [', last_name, first_name', 'Tie-breakers inside each city (and inside the NULL group).'],
    ],
    dialectSql: {
      sqlite: `SELECT patient_id, city FROM patients ORDER BY city NULLS LAST;
SELECT patient_id FROM patients ORDER BY RANDOM() LIMIT 5;`,
      postgres: `SELECT patient_id, city FROM patients ORDER BY city NULLS LAST;   -- already the ASC default
SELECT patient_id FROM patients ORDER BY random() LIMIT 5;
SELECT patient_id FROM patients TABLESAMPLE BERNOULLI (20);          -- ~20% of rows
SELECT patient_id FROM patients TABLESAMPLE SYSTEM (20) REPEATABLE (42); -- page-level, repeatable`,
      mysql: `SELECT patient_id, city FROM patients ORDER BY city IS NULL, city;  -- no NULLS LAST
SELECT patient_id FROM patients ORDER BY RAND() LIMIT 5;`,
      sqlserver: `SELECT patient_id, city FROM patients ORDER BY CASE WHEN city IS NULL THEN 1 ELSE 0 END, city;
SELECT TOP 5 patient_id FROM patients ORDER BY NEWID();
SELECT patient_id FROM patients TABLESAMPLE (20 PERCENT);`,
      oracle: `SELECT patient_id, city FROM patients ORDER BY city NULLS LAST;
SELECT patient_id FROM patients ORDER BY DBMS_RANDOM.VALUE FETCH FIRST 5 ROWS ONLY;
SELECT patient_id FROM patients SAMPLE (20);`,
    },
    internals: `<p>NULLS FIRST/LAST is just an extra sort key: the engine sorts on "is this NULL?" before the value itself. That is why the CASE emulation gives the same result. An index on <code>city</code> stores NULLs at one end, so a sort that matches the index's NULL placement can read the index in order; a mismatched placement may need an extra sort step.</p>
<p><code>ORDER BY RANDOM() LIMIT n</code> must generate a random number for <b>every</b> row and then keep the n smallest (a top-N heap), so it reads the whole table: fine for thousands of rows, slow for hundreds of millions. <code>TABLESAMPLE SYSTEM</code> picks random <b>pages</b> (fast, but rows on one page come together); <code>BERNOULLI</code> flips a coin per row (more uniform, still scans).</p>`,
    mistakes: [
      { wrong: `SELECT patient_id, last_name, city FROM patients ORDER BY city;  -- "blank cities go to the bottom"`, why: 'In SQLite (and MySQL, SQL Server) NULL sorts first in ascending order, so the 6 patients without a city are at the TOP. In PostgreSQL the same query puts them at the bottom.', fix: `SELECT patient_id, last_name, city FROM patients ORDER BY city NULLS LAST;` },
      { wrong: `SELECT invoice_id, total_amount FROM invoices WHERE RANDOM() < 0.2;  -- "exactly 20% of invoices"`, why: 'RANDOM() in SQLite returns a 64-bit integer (about half negative), not a number between 0 and 1. This keeps about 50% of rows. And a per-row coin flip never gives an exact count.', fix: `SELECT invoice_id, total_amount FROM invoices ORDER BY RANDOM() LIMIT 10;   -- exactly 10 random rows` },
      { wrong: `SELECT invoice_id FROM invoices ORDER BY RANDOM() LIMIT 5;  -- then re-run for the auditor`, why: 'The auditor gets a DIFFERENT sample every run, so the sample cannot be reproduced. For a repeatable sample, sort by a deterministic hash of the key, or save the sample to a table.', fix: `SELECT invoice_id FROM invoices ORDER BY (invoice_id * 2654435761) % 1000003 LIMIT 5;   -- same "random-looking" 5 every time` },
    ],
    rules: [
      'SQLite/MySQL/SQL Server: NULL is smallest. PostgreSQL/Oracle: NULL is largest.',
      'Write NULLS FIRST / NULLS LAST explicitly when a sort column can be NULL.',
      'No NULLS LAST? Sort by (column IS NULL) first.',
      'ORDER BY RANDOM() LIMIT n: exact n rows, different every run, reads the whole table.',
      'Need a repeatable sample? Use a hash of the key or save the sample.',
    ],
    compare: `<table><tr><th>Database</th><th>NULLs in ASC</th><th>NULLS FIRST/LAST?</th><th>Random sample</th></tr>
<tr><td>SQLite</td><td>First</td><td>Yes (3.30+)</td><td>ORDER BY RANDOM() LIMIT n</td></tr>
<tr><td>PostgreSQL</td><td>Last</td><td>Yes</td><td>random(), TABLESAMPLE</td></tr>
<tr><td>MySQL</td><td>First</td><td>No (use col IS NULL)</td><td>ORDER BY RAND()</td></tr>
<tr><td>SQL Server</td><td>First</td><td>No (use CASE)</td><td>ORDER BY NEWID(), TABLESAMPLE</td></tr>
<tr><td>Oracle</td><td>Last</td><td>Yes</td><td>DBMS_RANDOM.VALUE, SAMPLE</td></tr></table>`,
    realWorld: 'Patient lists and worklists put "missing data" rows last (or first, to be fixed). Compliance teams audit a random sample of paid claims every month; data engineers preview a TABLESAMPLE of billions of claim lines before running a full job.',
    tips: [
      'For pagination, NULL placement must be identical on every page request, so always state it.',
      'Show the count of NULLs separately when they are important ("6 patients with no city").',
      'Store the seed or the sampled ids when a sample is part of an audit trail.',
    ],
    deep: `<p>A classic stratified sample ("2 random invoices per status") combines both ideas: <code>ROW_NUMBER() OVER (PARTITION BY status ORDER BY RANDOM())</code> in a CTE, then keep rows with <code>rn &lt;= 2</code>. For huge tables, a fast repeatable alternative is filtering on a hash bucket of the key (<code>WHERE (invoice_id * 2654435761) % 100 &lt; 5</code> for about 5%), which can also use an index on a stored hash column. Beware NULL ordering in window functions too: <code>ORDER BY</code> inside <code>OVER()</code> follows the same NULL rules and accepts NULLS FIRST/LAST.</p>`,
    tryIt: {
      prompt: 'Run this a few times: the stratified sample changes each run. Then change ORDER BY RANDOM() to ORDER BY invoice_id to make it repeatable.',
      starter: `WITH ranked AS (
  SELECT invoice_id, status, total_amount,
         ROW_NUMBER() OVER (PARTITION BY status ORDER BY RANDOM()) AS rn
  FROM invoices
)
SELECT status, invoice_id, total_amount
FROM ranked
WHERE rn <= 2
ORDER BY status NULLS LAST, invoice_id;`,
    },
    challenge: {
      level: 1,
      prompt: 'Build a patient contact list: patient_id, last_name, email, sorted by email ascending but with patients who have NO email at the end; break ties by patient_id.',
      solution: `SELECT patient_id, last_name, email
FROM patients
ORDER BY email ASC NULLS LAST, patient_id;`,
      hints: [
        'In SQLite, NULLs come first in an ascending sort by default.',
        'Add NULLS LAST after the sort direction.',
        'ORDER BY email ASC NULLS LAST, patient_id',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'In SQLite, where do NULLs appear in ORDER BY city ASC (no NULLS clause)?', options: ['First', 'Last', 'Random positions', 'They are excluded'], answer: 0, why: 'SQLite treats NULL as smaller than any value.' },
      { q: 'How do you emulate NULLS LAST in MySQL?', options: ['ORDER BY city NULLS LAST', 'ORDER BY city IS NULL, city', 'ORDER BY COALESCE(city)', 'It cannot be done'], answer: 1, why: 'city IS NULL is 0 for values and 1 for NULLs, so NULLs sort after.' },
      { q: 'What does SELECT invoice_id FROM invoices ORDER BY RANDOM() LIMIT 5 return?', options: ['The first 5 invoices', '5 random invoices, different each run', 'About 5% of invoices', 'An error in SQLite'], answer: 1, why: 'Each row gets a random sort key; the first 5 after sorting are kept.' },
    ],
  },
]);
