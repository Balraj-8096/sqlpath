// Section 03: Advanced Filtering (filtering-01 .. filtering-13)
Lessons.add([
  // ---------------------------------------------------------------- 01
  {
    id: 'filtering-01',
    goals: [
      'How LIKE matches text patterns with % and _',
      'Starts-with, ends-with and contains searches',
      'How case-sensitivity works for LIKE in SQLite',
      'How to search for a literal % or _ with ESCAPE',
    ],
    concept: `<p><b>LIKE</b> checks whether text matches a <b>pattern</b>. It has two wildcards:</p>
<ul><li><code>%</code> means any number of characters (even zero).</li>
<li><code>_</code> means exactly one character.</li></ul>
<table><tr><th>Pattern</th><th>Means</th><th>Matches</th></tr>
<tr><td><code>'Ch%'</code></td><td>starts with Ch</td><td>Chen, Chest X-ray</td></tr>
<tr><td><code>'%therapy%'</code></td><td>contains therapy</td><td>Manual therapy (15 min)</td></tr>
<tr><td><code>'%.com'</code></td><td>ends with .com</td><td>maria.garcia@mail.com</td></tr>
<tr><td><code>'9921_'</code></td><td>9921 + one character</td><td>99213, 99214</td></tr></table>
<p>In SQLite, LIKE ignores upper/lower case for plain English letters, so <code>'%THERAPY%'</code> also matches.</p>`,
    why: 'People rarely know the exact text. They remember "it starts with Ch" or "something about therapy". LIKE finds those partial matches.',
    when: 'Name searches, finding procedure descriptions by keyword, filtering email domains, and codes that share a prefix.',
    analogy: 'Searching the patient index cards: "I know the last name starts with W", so you flip to the W section and read every card there. % is "and anything after that".',
    exampleSql: `SELECT DISTINCT cpt_code, description FROM charges ORDER BY cpt_code`,
    syntax: `WHERE col LIKE 'pattern'      -- % = any run of characters, _ = exactly one\nWHERE col NOT LIKE 'pattern'\nWHERE col LIKE '%50\\%%' ESCAPE '\\'   -- literal %`,
    sql: `SELECT DISTINCT cpt_code, description\nFROM charges\nWHERE description LIKE '%therapy%'\nORDER BY cpt_code;`,
    breakdown: [
      ['SELECT DISTINCT cpt_code, description', 'Each procedure once.'],
      ["WHERE description LIKE '%therapy%'", 'Keep descriptions containing "therapy" anywhere: Manual therapy, Psychotherapy, and so on.'],
      ['ORDER BY cpt_code', 'Sort by code.'],
    ],
    internals: `<p>LIKE is evaluated per row by a small pattern-matching routine. A pattern that <b>starts with a wildcard</b> (<code>'%therapy'</code>) forces a full scan, because an index is sorted by the first characters and cannot help. A pattern with a fixed prefix (<code>'Ch%'</code>) can sometimes use an index as a range scan ("everything from Ch up to Ci"). In SQLite that needs a NOCASE index or <code>PRAGMA case_sensitive_like</code>.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM charges WHERE description = '%therapy%';`, why: 'Wildcards only work with LIKE. With =, the % signs are literal characters, so nothing matches.', fix: `SELECT * FROM charges WHERE description LIKE '%therapy%';` },
      { wrong: `SELECT * FROM patients WHERE last_name LIKE 'W';`, why: 'Without a wildcard, LIKE is basically equality: it matches only a last name that is exactly "W". Add % for "starts with".', fix: `SELECT * FROM patients WHERE last_name LIKE 'W%';` },
      { wrong: `SELECT * FROM patients WHERE email NOT LIKE '%@mail.com';  -- "patients without a mail.com address"`, why: 'Patients with a NULL email are dropped too: NULL NOT LIKE ... is UNKNOWN. Add OR email IS NULL if you want them.', fix: `SELECT * FROM patients WHERE email NOT LIKE '%@mail.com' OR email IS NULL;` },
    ],
    rules: [
      '% = zero or more characters. _ = exactly one character.',
      'LIKE is case-insensitive for ASCII in SQLite, but case-sensitive in PostgreSQL (use ILIKE there).',
      'Leading % means no index help: fine for small tables, slow for huge ones.',
      'Use ESCAPE to search for a literal % or _.',
    ],
    compare: `<table><tr><th>Tool</th><th>Wildcards</th><th>Case</th></tr>
<tr><td>= </td><td>none</td><td>sensitive (SQLite)</td></tr>
<tr><td>LIKE</td><td>% and _</td><td>insensitive (SQLite, ASCII)</td></tr>
<tr><td>GLOB (SQLite)</td><td>* ? [a-z]</td><td>sensitive</td></tr>
<tr><td>REGEXP / ~</td><td>full regular expressions</td><td>configurable</td></tr></table>`,
    realWorld: 'Patient lookup boxes ("type part of a last name"), code families (all 97xxx PT codes: LIKE \'97%\'), and payer email-domain filters.',
    tips: ["Search a family of codes: cpt_code LIKE '992%' finds all 992xx E/M visit codes."],
    deep: `<p>For "contains" search on big tables, a leading wildcard can't use a B-tree index. Real systems use full-text search instead: SQLite FTS5, PostgreSQL <code>pg_trgm</code> trigram indexes, or a search engine. LIKE is the simple tool for moderate data sizes.</p>`,
    tryIt: { prompt: "Find patients whose last name ends in 'er' (like Walker, Baker, Carter). Then find first names that are exactly 4 letters with '____'.", starter: `SELECT patient_id, first_name, last_name\nFROM patients\nWHERE last_name LIKE '%er';` },
    challenge: {
      level: 1,
      prompt: "List each distinct cpt_code and description for procedures whose description contains the word 'visit', sorted by cpt_code.",
      solution: `SELECT DISTINCT cpt_code, description FROM charges WHERE description LIKE '%visit%' ORDER BY cpt_code;`,
      hints: ['Search the description column of charges.', '"Contains" means % on both sides.', "Use LIKE '%visit%' and DISTINCT.", "SELECT DISTINCT cpt_code, description FROM charges WHERE description LIKE '%visit%' ORDER BY cpt_code;"],
      ordered: true,
    },
    quiz: [
      { q: "Which pattern finds codes that start with 97 and have exactly 5 characters?", options: ["'97%'", "'97___'", "'%97%'", "'97_'"], answer: 1, why: 'Three _ wildcards add exactly three characters after 97.' },
      { q: "In SQLite, does 'CHEN' LIKE 'chen' return true?", options: ['Yes', 'No'], answer: 0, why: 'SQLite LIKE is case-insensitive for ASCII letters by default.' },
    ],
  },

  // ---------------------------------------------------------------- 02
  {
    id: 'filtering-02',
    goals: [
      'What regular expressions add beyond LIKE',
      'REGEXP / ~ syntax in MySQL and PostgreSQL',
      'Why SQLite has no built-in REGEXP, and how GLOB fills part of the gap',
      'Character classes like [0-9] for validating codes and phone numbers',
    ],
    concept: `<p>A <b>regular expression</b> (regex) is a much more powerful pattern than LIKE. It can say "exactly 5 digits", "starts with 99", "letters followed by a number" and more.</p>
<table><tr><th>Regex piece</th><th>Means</th></tr>
<tr><td><code>^</code> / <code>$</code></td><td>start / end of the text</td></tr>
<tr><td><code>[0-9]</code></td><td>one digit</td></tr>
<tr><td><code>{3}</code></td><td>exactly 3 of the previous item</td></tr>
<tr><td><code>.</code> / <code>.*</code></td><td>any character / anything</td></tr>
<tr><td><code>a|b</code></td><td>a or b</td></tr></table>
<p>MySQL uses <code>REGEXP</code> and PostgreSQL uses <code>~</code>. <b>SQLite has no built-in REGEXP</b>, but its <b>GLOB</b> operator supports <code>*</code>, <code>?</code> and character classes like <code>[0-9]</code>, which is enough for many checks. The runnable examples here use GLOB.</p>`,
    why: 'LIKE cannot say "digits only" or "exactly this shape". Data validation (CPT codes, NPIs, phone numbers) needs precise patterns.',
    when: 'Validating formats, finding malformed data, or matching families of codes with a precise structure.',
    analogy: 'LIKE is asking the clerk "any claim number starting with 99". A regex is handing them a stencil: "exactly five digits, the first two are 99, nothing else". Only cards that fit the stencil perfectly get pulled.',
    exampleSql: `SELECT payor_name, phone FROM payors`,
    syntax: `-- PostgreSQL\nWHERE col ~ '^99[0-9]{3}$'      -- ~* = case-insensitive\n-- MySQL\nWHERE col REGEXP '^99[0-9]{3}$'\n-- SQLite (GLOB: * ? [..], case-sensitive, whole-string match)\nWHERE col GLOB '99[0-9][0-9][0-9]'`,
    dialect: 'postgres',
    sql: `SELECT DISTINCT cpt_code, description\nFROM charges\nWHERE cpt_code ~ '^99[0-9]{3}$'\nORDER BY cpt_code;`,
    breakdown: [
      ["cpt_code ~ '^99[0-9]{3}$'", 'PostgreSQL regex match: start (^), the characters 99, exactly three digits, end ($).'],
      ['SELECT DISTINCT cpt_code, description', 'Each evaluation & management code once.'],
      ['ORDER BY cpt_code', 'Sorted.'],
    ],
    dialectSql: {
      postgres: `SELECT DISTINCT cpt_code, description FROM charges\nWHERE cpt_code ~ '^99[0-9]{3}$' ORDER BY cpt_code;`,
      mysql: `SELECT DISTINCT cpt_code, description FROM charges\nWHERE cpt_code REGEXP '^99[0-9]{3}$' ORDER BY cpt_code;`,
      sqlserver: `-- no native regex before SQL Server 2025; LIKE supports [0-9]\nSELECT DISTINCT cpt_code, description FROM charges\nWHERE cpt_code LIKE '99[0-9][0-9][0-9]' ORDER BY cpt_code;`,
      oracle: `SELECT DISTINCT cpt_code, description FROM charges\nWHERE REGEXP_LIKE(cpt_code, '^99[0-9]{3}$') ORDER BY cpt_code;`,
      sqlite: `SELECT DISTINCT cpt_code, description FROM charges\nWHERE cpt_code GLOB '99[0-9][0-9][0-9]' ORDER BY cpt_code;`,
    },
    visual: { type: 'html', html: `<svg viewBox="0 0 600 150" width="100%" font-family="monospace" font-size="15">
<text x="10" y="22" fill="var(--text)" font-family="sans-serif" font-weight="bold">Regex ^99[0-9]{3}$ vs. GLOB 99[0-9][0-9][0-9]</text>
<rect x="60" y="40" width="40" height="36" fill="var(--blue)" opacity="0.35"/><text x="80" y="64" text-anchor="middle" fill="var(--text)">9</text>
<rect x="104" y="40" width="40" height="36" fill="var(--blue)" opacity="0.35"/><text x="124" y="64" text-anchor="middle" fill="var(--text)">9</text>
<rect x="148" y="40" width="40" height="36" fill="var(--green)" opacity="0.4"/><text x="168" y="64" text-anchor="middle" fill="var(--text)">2</text>
<rect x="192" y="40" width="40" height="36" fill="var(--green)" opacity="0.4"/><text x="212" y="64" text-anchor="middle" fill="var(--text)">1</text>
<rect x="236" y="40" width="40" height="36" fill="var(--green)" opacity="0.4"/><text x="256" y="64" text-anchor="middle" fill="var(--text)">4</text>
<text x="102" y="98" text-anchor="middle" fill="var(--blue)" font-size="12">literal 99</text>
<text x="212" y="98" text-anchor="middle" fill="var(--green)" font-size="12">[0-9] x 3</text>
<text x="30" y="64" text-anchor="middle" fill="var(--muted)">^</text><text x="296" y="64" text-anchor="middle" fill="var(--muted)">$</text>
<text x="330" y="52" fill="var(--green)" font-size="13" font-family="sans-serif">99214 matches</text>
<text x="330" y="74" fill="var(--red)" font-size="13" font-family="sans-serif">9921 fails (too short)</text>
<text x="330" y="96" fill="var(--red)" font-size="13" font-family="sans-serif">99214A fails (extra char)</text>
<text x="10" y="135" fill="var(--muted)" font-size="12" font-family="sans-serif">GLOB always matches the whole string, so it needs no ^ or $ anchors.</text>
</svg>` },
    internals: `<p>Regex engines compile the pattern into a state machine and run it over each value. That costs more CPU than LIKE, and regexes almost never use an index, so expect a full scan. In SQLite, <code>X REGEXP Y</code> is only syntax: it calls a user function named <code>regexp()</code>, and no such function exists unless an application or extension registers one. That is why the lesson uses GLOB for runnable queries.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM charges WHERE cpt_code REGEXP '^99';  -- in SQLite`, why: 'SQLite parses REGEXP but has no regexp() function built in: "no such function: REGEXP". Use GLOB (or LIKE) in SQLite.', fix: `SELECT * FROM charges WHERE cpt_code GLOB '99*';` },
      { wrong: `SELECT * FROM charges WHERE description GLOB '*THERAPY*';`, why: 'GLOB is case-sensitive, unlike LIKE in SQLite. The data says "therapy" in lowercase.', fix: `SELECT * FROM charges WHERE description GLOB '*therapy*';` },
      { wrong: `-- PostgreSQL\nSELECT * FROM charges WHERE cpt_code ~ '99[0-9]{3}';`, why: 'Without ^ and $, a regex matches anywhere inside the text, so "1299123" would match too. Anchor the pattern for format validation.', fix: `SELECT * FROM charges WHERE cpt_code GLOB '99[0-9][0-9][0-9]';` },
    ],
    rules: [
      'Regex: MySQL REGEXP, PostgreSQL ~ (~* case-insensitive), Oracle REGEXP_LIKE.',
      'SQLite: no built-in REGEXP. Use GLOB with * ? [0-9] [^0-9].',
      'Anchor regex with ^ and $ for whole-value validation. GLOB is always whole-value.',
      'Pattern matching usually means a full scan.',
    ],
    compare: `<table><tr><th></th><th>LIKE</th><th>GLOB (SQLite)</th><th>Regex</th></tr>
<tr><td>any run</td><td>%</td><td>*</td><td>.*</td></tr>
<tr><td>one char</td><td>_</td><td>?</td><td>.</td></tr>
<tr><td>digit</td><td>no</td><td>[0-9]</td><td>[0-9] or \\d</td></tr>
<tr><td>repeat n times</td><td>no</td><td>no (repeat the class)</td><td>{n}</td></tr>
<tr><td>alternatives</td><td>no</td><td>no</td><td>a|b</td></tr></table>`,
    realWorld: 'Claim scrubbers validate formats before submission: 10-digit NPIs, 5-character CPT codes, ICD-10 codes (letter + digits), and phone and ZIP formats.',
    tips: ["Find non-digit characters in SQLite: col GLOB '*[^0-9]*'."],
    deep: `<p>PostgreSQL also offers <code>SIMILAR TO</code> (SQL-standard regex-lite), <code>regexp_replace</code>, <code>regexp_matches</code> and trigram indexes (pg_trgm) that can speed up some regex searches. MySQL 8 uses the ICU regex library. When SQLite is embedded in an app (Python, Node), the app can register a <code>regexp()</code> function to enable REGEXP.</p>`,
    tryIt: { prompt: "Using GLOB, find payors whose phone has the shape 800-555-01NN (two digits at the end). What happens to NULL phones?", starter: `SELECT payor_name, phone\nFROM payors\nWHERE phone GLOB '800-555-01[0-9][0-9]';` },
    challenge: {
      level: 2,
      prompt: "Physical-therapy codes are exactly five digits starting with 97. Using GLOB, list the distinct cpt_code and description of those codes, sorted by cpt_code.",
      solution: `SELECT DISTINCT cpt_code, description FROM charges WHERE cpt_code GLOB '97[0-9][0-9][0-9]' ORDER BY cpt_code;`,
      hints: ['SQLite has no REGEXP, so use GLOB.', 'GLOB matches the whole value and [0-9] means one digit.', "The pattern is '97' followed by three [0-9] classes.", "WHERE cpt_code GLOB '97[0-9][0-9][0-9]' ... ORDER BY cpt_code"],
      ordered: true,
    },
    quiz: [
      { q: 'Which operator does regex matching in PostgreSQL?', options: ['LIKE', '~', 'REGEXP', 'GLOB'], answer: 1, why: '~ is case-sensitive regex, ~* is case-insensitive.' },
      { q: 'In SQLite, what is GLOB\'s equivalent of LIKE\'s %?', options: ['?', '*', '.', '#'], answer: 1, why: 'GLOB uses Unix-style wildcards: * for any run, ? for one character.' },
      { q: "Why does ^99[0-9]{3}$ reject '99214A'?", options: ['It has letters inside', '$ requires the text to end after 3 digits', '{3} means at least 3', 'Regex is case-sensitive'], answer: 1, why: 'The $ anchor requires the end of the string right after the three digits.' },
    ],
  },

  // ---------------------------------------------------------------- 03
  {
    id: 'filtering-03',
    goals: [
      'How IN tests a value against a list',
      'Why IN is cleaner than many ORs',
      'IN with a subquery',
      'The NOT IN + NULL trap',
    ],
    concept: `<p><b>IN</b> asks "is this value one of these?": <code>status IN ('Overdue', 'Partially Paid')</code>.</p>
<p>It means exactly the same as <code>status = 'Overdue' OR status = 'Partially Paid'</code>, but it is shorter, clearer, and safe to combine with AND (no precedence surprises).</p>
<p>The list can also come from a <b>subquery</b>: <code>patient_id IN (SELECT patient_id FROM invoices WHERE status = 'Overdue')</code>.</p>`,
    why: 'Filtering to a set of allowed values is extremely common. IN expresses it in one readable condition.',
    when: 'Matching several statuses, several ids, several codes, or any list produced by another query.',
    analogy: 'The collections desk has a sticky note: "Call patients with invoices in these statuses: Overdue, Partially Paid." IN is checking each invoice against the sticky note.',
    exampleSql: `SELECT DISTINCT status FROM invoices`,
    syntax: `WHERE col IN (value1, value2, ...)\nWHERE col NOT IN (value1, value2)\nWHERE col IN (SELECT col FROM ...)`,
    sql: `SELECT invoice_id, location_id, status, total_amount\nFROM invoices\nWHERE status IN ('Overdue', 'Partially Paid')\n  AND location_id = 2;`,
    breakdown: [
      ["status IN ('Overdue', 'Partially Paid')", 'True when status is either value.'],
      ['AND location_id = 2', 'IN is a single condition, so AND applies to all of it. No parentheses needed.'],
    ],
    internals: `<p>For a literal list, SQLite builds a small temporary lookup structure (or, for a short list, runs a few equality tests). If the column is indexed, it does one index lookup per list value. For <code>IN (subquery)</code>, it usually runs the subquery once, stores the results in a temporary B-tree, and probes it for every outer row.</p>`,
    mistakes: [
      { wrong: `SELECT payor_id, payor_name FROM payors\nWHERE payor_id NOT IN (SELECT payor_id FROM invoices);`, why: 'invoices.payor_id contains NULLs. x NOT IN (..., NULL) is never TRUE (it is FALSE or UNKNOWN), so this returns zero rows, even though payors 5 and 6 have no invoices!', fix: `SELECT payor_id, payor_name FROM payors\nWHERE payor_id NOT IN (SELECT payor_id FROM invoices WHERE payor_id IS NOT NULL);` },
      { wrong: `SELECT * FROM invoices WHERE status IN 'Overdue', 'Open';`, why: 'The list must be in parentheses.', fix: `SELECT * FROM invoices WHERE status IN ('Overdue', 'Open');` },
    ],
    rules: [
      'IN (a, b, c) = (col = a OR col = b OR col = c).',
      'A NULL in the list never matches anything.',
      'NOT IN with a NULL anywhere in the list returns no rows. Filter NULLs out or use NOT EXISTS.',
      'The subquery in IN must return exactly one column.',
    ],
    compare: `<p><b>IN vs. OR:</b> same result, but IN is shorter and avoids AND/OR precedence mistakes. <b>IN (subquery) vs. EXISTS:</b> usually the same result and similar speed. The difference shows up with NOT and NULLs, where NOT EXISTS is the safe choice.</p>`,
    realWorld: 'Work queues by status list, reports for a chosen set of locations (the selected checkboxes become an IN list), and "patients who had any overdue invoice".',
    tips: ['An app with a multi-select filter builds WHERE col IN (?, ?, ?) with parameters, never by gluing strings together.'],
    deep: `<p>Very large literal IN lists (thousands of values) are better loaded into a temporary table and joined. For <code>NOT IN</code>, the SQL standard's NULL semantics make it hard to optimize into an anti-join, which is one more reason to prefer <code>NOT EXISTS</code>.</p>`,
    tryIt: { prompt: 'Find patients who have at least one Overdue invoice using IN with a subquery.', starter: `SELECT patient_id, first_name, last_name\nFROM patients\nWHERE patient_id IN (SELECT patient_id FROM invoices WHERE status = 'Overdue');` },
    challenge: {
      level: 1,
      prompt: 'List payments made by Check or Cash: payment_id, invoice_id, method and amount, sorted by payment_id.',
      solution: `SELECT payment_id, invoice_id, method, amount FROM payments WHERE method IN ('Check', 'Cash') ORDER BY payment_id;`,
      hints: ['Use the payments table.', 'Two allowed methods: a perfect case for IN.', "method IN ('Check', 'Cash')", 'Add ORDER BY payment_id.'],
      ordered: true,
    },
    quiz: [
      { q: "WHERE x IN (1, 2, NULL) for x = 3 evaluates to...", options: ['TRUE', 'FALSE', 'UNKNOWN', 'Error'], answer: 2, why: 'x is not 1 or 2, and 3 = NULL is UNKNOWN, so the OR chain is UNKNOWN (filtered out).' },
      { q: "WHERE x NOT IN (1, 2, NULL) for x = 3 returns the row?", options: ['Yes', 'No'], answer: 1, why: 'NOT UNKNOWN is still UNKNOWN, so the row is dropped. This is the NOT IN NULL trap.' },
    ],
  },

  // ---------------------------------------------------------------- 04
  {
    id: 'filtering-04',
    goals: [
      'How BETWEEN tests an inclusive range',
      'BETWEEN with numbers, text and ISO dates',
      'Why the low value must come first',
      'The end-of-range trap with timestamps',
    ],
    concept: `<p><b>BETWEEN low AND high</b> keeps values from low to high, <b>including both ends</b>.</p>
<p><code>total_amount BETWEEN 100 AND 200</code> is exactly <code>total_amount &gt;= 100 AND total_amount &lt;= 200</code>, so an invoice of exactly 100 or exactly 200 is kept.</p>
<p>It works with dates too: <code>invoice_date BETWEEN '2026-06-01' AND '2026-06-30'</code>.</p>`,
    why: 'Ranges are everywhere in billing: amount bands, date windows, id ranges. BETWEEN states them clearly in one condition.',
    when: 'Whenever you want a closed range with both ends included.',
    analogy: 'The auditor says: "Pull every invoice from $100 up to and including $200." Both the $100 and the $200 invoices go in the pile.',
    exampleSql: `SELECT invoice_id, invoice_date, total_amount FROM invoices ORDER BY total_amount LIMIT 12`,
    syntax: `WHERE col BETWEEN low AND high        -- low <= col <= high\nWHERE col NOT BETWEEN low AND high`,
    sql: `SELECT invoice_id, invoice_date, total_amount\nFROM invoices\nWHERE total_amount BETWEEN 100 AND 200\nORDER BY total_amount;`,
    breakdown: [
      ['WHERE total_amount BETWEEN 100 AND 200', 'Keep 100 ≤ total_amount ≤ 200. Invoices of exactly 100 and 200 are included.'],
      ['ORDER BY total_amount', 'Sorted so you can see the boundary values at both ends.'],
    ],
    internals: `<p>The engine rewrites BETWEEN as two comparisons (<code>&gt;= low AND &lt;= high</code>). With an index on the column, it becomes a <b>range scan</b>: seek to the first entry ≥ low and walk forward until an entry exceeds high. This is one of the most index-friendly filters.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM invoices WHERE total_amount BETWEEN 200 AND 100;`, why: 'BETWEEN does not swap the values. It becomes >= 200 AND <= 100, which nothing satisfies. Always put the low value first.', fix: `SELECT * FROM invoices WHERE total_amount BETWEEN 100 AND 200;` },
      { wrong: `-- with timestamps like '2026-06-30 14:20:00'\nSELECT * FROM invoices WHERE invoice_date BETWEEN '2026-06-01' AND '2026-06-30';`, why: "If the column holds date+time, '2026-06-30 14:20' is greater than '2026-06-30', so the last day's afternoon is lost. Use a half-open range: >= start AND < next day.", fix: `SELECT * FROM invoices WHERE invoice_date >= '2026-06-01' AND invoice_date < '2026-07-01';` },
    ],
    rules: [
      'BETWEEN includes both ends.',
      'Low value first, high value second.',
      'For timestamps and months, prefer >= start AND < next_start.',
      'NULL BETWEEN ... is UNKNOWN, so NULLs are excluded.',
    ],
    compare: `<p><b>BETWEEN vs. &gt;= / &lt;:</b> BETWEEN is always closed [a, b]. The half-open form [a, b) with <code>&gt;= a AND &lt; b</code> is safer for dates and for ranges that must tile together without overlap (see Range Filtering).</p>`,
    realWorld: 'Statement periods, claim date-of-service windows, amount thresholds for approval tiers, and id ranges for batch processing.',
    tips: ['Text works too: last_name BETWEEN \'A\' AND \'M\' (careful: \'Martins\' > \'M\', so it is excluded!).'],
    deep: `<p>Text BETWEEN follows the collation. <code>last_name BETWEEN 'A' AND 'M'</code> excludes every name starting with M except exactly "M", because 'Ma...' sorts after 'M'. Use <code>last_name &gt;= 'A' AND last_name &lt; 'N'</code> for "A through M".</p>`,
    tryIt: { prompt: "Find invoices dated between '2026-06-01' and '2026-06-30'. Then try NOT BETWEEN.", starter: `SELECT invoice_id, invoice_date, status\nFROM invoices\nWHERE invoice_date BETWEEN '2026-06-01' AND '2026-06-30'\nORDER BY invoice_date;` },
    challenge: {
      level: 2,
      prompt: "Find invoices dated in 2026 (between '2026-01-01' and '2026-12-31') whose total_amount is between 100 and 200 inclusive. Show invoice_id, invoice_date and total_amount, sorted by invoice_id.",
      solution: `SELECT invoice_id, invoice_date, total_amount FROM invoices WHERE invoice_date BETWEEN '2026-01-01' AND '2026-12-31' AND total_amount BETWEEN 100 AND 200 ORDER BY invoice_id;`,
      hints: ['You need two BETWEEN conditions joined by AND.', "Date range: invoice_date BETWEEN '2026-01-01' AND '2026-12-31'.", 'Amount range: total_amount BETWEEN 100 AND 200.', 'Sort with ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Does total_amount BETWEEN 100 AND 200 include 200?', options: ['Yes', 'No'], answer: 0, why: 'BETWEEN is inclusive on both ends.' },
      { q: 'x BETWEEN 50 AND 10 returns rows where...', options: ['x is from 10 to 50', 'nothing', 'x < 10 or x > 50', 'Error'], answer: 1, why: 'It means x >= 50 AND x <= 10, which is impossible.' },
    ],
  },

  // ---------------------------------------------------------------- 05
  {
    id: 'filtering-05',
    goals: [
      'What EXISTS checks: "is there at least one matching row?"',
      'How a correlated subquery links to the outer row',
      'Why SELECT 1 inside EXISTS is fine',
      'How EXISTS compares with IN and JOIN',
    ],
    concept: `<p><b>EXISTS (subquery)</b> is TRUE if the subquery returns <b>at least one row</b>, and FALSE if it returns none. It doesn't care what the rows contain, only whether any exist.</p>
<p>The subquery usually refers to the outer row. This is called a <b>correlated subquery</b>:</p>
<p><code>WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id AND i.status = 'Overdue')</code></p>
<p>For each patient p, the database asks: "does this patient have any overdue invoice?"</p>`,
    why: '"Find X that has at least one Y" is a very common question. EXISTS answers it directly without duplicating rows.',
    when: 'Patients with any overdue invoice, practitioners who performed a given procedure, payors with at least one payment.',
    analogy: 'For each patient folder, the clerk opens the invoice drawer and looks for any overdue invoice with that patient\'s name. As soon as one is found, they stop looking and flag the folder.',
    exampleSql: `SELECT invoice_id, patient_id, status FROM invoices WHERE status = 'Overdue'`,
    syntax: `SELECT ...\nFROM outer_table o\nWHERE EXISTS (\n  SELECT 1\n  FROM inner_table i\n  WHERE i.fk = o.pk        -- correlation\n    AND other_conditions\n);`,
    sql: `SELECT p.patient_id, p.first_name, p.last_name\nFROM patients AS p\nWHERE EXISTS (\n  SELECT 1\n  FROM invoices AS i\n  WHERE i.patient_id = p.patient_id\n    AND i.status = 'Overdue'\n)\nORDER BY p.patient_id;`,
    breakdown: [
      ['FROM patients AS p', 'The outer query: each patient is checked once.'],
      ['WHERE EXISTS ( SELECT 1 ...', 'Is there at least one row? SELECT 1 is a convention, since the values don\'t matter.'],
      ['WHERE i.patient_id = p.patient_id', 'The correlation: link the invoices to the current outer patient.'],
      ["AND i.status = 'Overdue'", 'Only overdue invoices count.'],
    ],
    visual: { type: 'flow', steps: [['FROM patients p', '25 patients, taken one at a time'], ['Patient 7 (Noah Taylor)', 'look in invoices WHERE patient_id = 7 AND Overdue'], ['found invoice 3', 'stop searching immediately: EXISTS = TRUE, keep'], ['Patient 9 (Liam Martin)', 'no invoices at all: EXISTS = FALSE, drop'], ['...repeat for every patient', 'each patient appears at most once'], ['Result', 'patients with at least one overdue invoice']] },
    internals: `<p>EXISTS <b>short-circuits</b>: the inner search stops at the first matching row. Modern optimizers (including SQLite's) often turn EXISTS into a <b>semi-join</b>, which is a join that emits each outer row at most once. An index on <code>invoices(patient_id)</code> makes each inner check a quick lookup instead of a scan.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id, first_name FROM patients p\nWHERE EXISTS (SELECT 1 FROM invoices WHERE status = 'Overdue');`, why: 'The subquery is not linked to p, so it is either TRUE for every patient or FALSE for every patient. Here it returns all 25 patients. Add the correlation condition.', fix: `SELECT patient_id, first_name FROM patients p\nWHERE EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id AND i.status = 'Overdue');` },
      { wrong: `SELECT p.patient_id, p.first_name FROM patients p\nJOIN invoices i ON i.patient_id = p.patient_id\nWHERE i.status = 'Overdue';`, why: 'A JOIN repeats the patient once per matching invoice (patient 7 appears twice). EXISTS returns each patient once.', fix: `SELECT p.patient_id, p.first_name FROM patients p\nWHERE EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id AND i.status = 'Overdue');` },
    ],
    rules: [
      'EXISTS is TRUE when the subquery returns one or more rows.',
      'Always correlate: inner.fk = outer.pk.',
      'The select list inside does not matter. SELECT 1 is the convention.',
      'EXISTS never returns UNKNOWN. It is only TRUE or FALSE.',
    ],
    compare: `<table><tr><th></th><th>Duplicates?</th><th>NULL-safe?</th><th>Can show inner columns?</th></tr>
<tr><td>EXISTS</td><td>no</td><td>yes</td><td>no</td></tr>
<tr><td>IN (subquery)</td><td>no</td><td>yes (NOT IN is not)</td><td>no</td></tr>
<tr><td>JOIN</td><td>yes, one row per match</td><td>n/a</td><td>yes</td></tr></table>`,
    realWorld: 'Collections lists ("patients with any overdue balance"), credentialing checks ("practitioners who billed a code they are not certified for"), and payor activity reports.',
    tips: ['Read EXISTS aloud as "has at least one ...". It makes queries easy to understand.'],
    deep: `<p>Because EXISTS only asks "any row?", it is often the fastest way to test for related data: the engine can stop after one index probe. <code>SELECT *</code> inside EXISTS costs nothing extra in most databases, since the columns are never fetched, but <code>SELECT 1</code> signals your intent.</p>`,
    tryIt: { prompt: "Find payors that have received at least one payment by 'EFT'.", starter: `SELECT py.payor_id, py.payor_name\nFROM payors py\nWHERE EXISTS (\n  SELECT 1 FROM payments pm\n  WHERE pm.payor_id = py.payor_id\n    AND pm.method = 'EFT'\n);` },
    challenge: {
      level: 2,
      prompt: "List practitioners (practitioner_id, first_name, last_name) who have performed at least one chest X-ray (cpt_code '71046'), sorted by practitioner_id. Use EXISTS.",
      solution: `SELECT p.practitioner_id, p.first_name, p.last_name FROM practitioners p WHERE EXISTS (SELECT 1 FROM charges c WHERE c.practitioner_id = p.practitioner_id AND c.cpt_code = '71046') ORDER BY p.practitioner_id;`,
      hints: ['The outer table is practitioners and the inner table is charges.', 'Correlate with c.practitioner_id = p.practitioner_id.', "Add AND c.cpt_code = '71046' inside the subquery.", 'WHERE EXISTS (SELECT 1 FROM charges c WHERE c.practitioner_id = p.practitioner_id AND c.cpt_code = \'71046\') ORDER BY p.practitioner_id'],
      ordered: true,
    },
    quiz: [
      { q: 'What does EXISTS return if the subquery returns 5 rows?', options: ['5', 'TRUE', 'The first row', 'UNKNOWN'], answer: 1, why: 'EXISTS only cares whether there is at least one row.' },
      { q: 'Why does EXISTS avoid the duplicates a JOIN can create?', options: ['It uses DISTINCT internally', 'It only tests each outer row once (a semi-join)', 'It removes NULLs', 'It sorts the result'], answer: 1, why: 'Each outer row is either kept once or dropped.' },
    ],
  },

  // ---------------------------------------------------------------- 06
  {
    id: 'filtering-06',
    goals: [
      'How NOT EXISTS finds rows with no related rows (anti-join)',
      'Why NOT EXISTS is safer than NOT IN',
      'How it compares with LEFT JOIN ... IS NULL',
      'Common "orphan" and "never" questions',
    ],
    concept: `<p><b>NOT EXISTS</b> is TRUE when the subquery finds <b>no</b> rows. It answers "which X has <b>no</b> Y?"</p>
<p><code>WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id)</code> finds patients who were never billed. In our data that is patients 9, 17 and 22.</p>
<p>This pattern is called an <b>anti-join</b>.</p>`,
    why: 'Finding what is missing is a key data-quality and business question: patients never billed, practitioners with no charges, payors never used.',
    when: 'Whenever the question contains "no", "never", "without" or "missing".',
    analogy: 'For each practitioner, the auditor searches the charge slips for their name. If the search comes back empty, the practitioner goes on the "no activity" list.',
    exampleSql: `SELECT patient_id, first_name, last_name FROM patients WHERE patient_id IN (9, 17, 22)`,
    syntax: `SELECT ...\nFROM parent p\nWHERE NOT EXISTS (\n  SELECT 1 FROM child c\n  WHERE c.parent_id = p.id\n);`,
    sql: `SELECT p.patient_id, p.first_name, p.last_name\nFROM patients AS p\nWHERE NOT EXISTS (\n  SELECT 1\n  FROM invoices AS i\n  WHERE i.patient_id = p.patient_id\n)\nORDER BY p.patient_id;`,
    breakdown: [
      ['FROM patients AS p', 'Check every patient.'],
      ['WHERE NOT EXISTS (SELECT 1 FROM invoices i', 'Keep the patient only if no invoice is found...'],
      ['WHERE i.patient_id = p.patient_id)', '...for this particular patient.'],
    ],
    visual: { type: 'flow', steps: [['FROM patients p', '25 patients'], ['for each patient: search invoices', 'WHERE i.patient_id = p.patient_id'], ['any invoice found?', 'yes: NOT EXISTS = FALSE, drop the patient'], ['no invoice found', 'NOT EXISTS = TRUE, keep the patient'], ['Result', 'patients 9, 17, 22: never billed']] },
    internals: `<p>SQLite runs the inner query per outer row (ideally as an index lookup on invoices.patient_id), and a single found row is enough to reject the patient. Because EXISTS never produces UNKNOWN, NULL values in <code>invoices.payor_id</code> or anywhere else cannot break the logic, which is unlike NOT IN.</p>`,
    mistakes: [
      { wrong: `SELECT payor_id, payor_name FROM payors\nWHERE payor_id NOT IN (SELECT payor_id FROM invoices);`, why: 'invoices.payor_id has NULLs (self-pay), so NOT IN returns zero rows. NOT EXISTS gives the right answer (payors 5 and 6).', fix: `SELECT payor_id, payor_name FROM payors py\nWHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.payor_id = py.payor_id);` },
      { wrong: `SELECT patient_id FROM patients p\nWHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = i.patient_id);`, why: 'The correlation compares the inner table with itself (i = i), which is always true when invoices exist. So NOT EXISTS is always FALSE and no rows come back. Compare with the OUTER alias.', fix: `SELECT patient_id FROM patients p\nWHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.patient_id = p.patient_id);` },
    ],
    rules: [
      'NOT EXISTS: keep the outer row when the subquery finds nothing.',
      'Prefer NOT EXISTS over NOT IN when NULLs are possible.',
      'Correlate with the outer alias.',
      'Extra conditions inside the subquery narrow what counts as a match.',
    ],
    compare: `<p>Three ways to write an anti-join:</p><ul>
<li><code>NOT EXISTS (...)</code>: clearest and NULL-safe. Recommended.</li>
<li><code>LEFT JOIN invoices i ON ... WHERE i.invoice_id IS NULL</code>: same result, and common in older code.</li>
<li><code>NOT IN (SELECT ...)</code>: breaks if the subquery returns a NULL.</li></ul>`,
    realWorld: 'Data-quality audits (patients with no invoices, locations with no activity, like Eastside Family Clinic), onboarding checks (a new hire with no charges yet), and cleanup of unused payors.',
    tips: ['Add conditions inside to ask "no Y of a certain kind": patients with no PAID invoice, and so on.'],
    deep: `<p>"No invoice in 2026" is different from "no invoice at all". Put the date condition <i>inside</i> the NOT EXISTS subquery. Putting it outside changes the question. This is the same subtlety as the ON vs. WHERE distinction in LEFT JOINs.</p>`,
    tryIt: { prompt: 'Find treatment locations that have no invoices. Then change it to locations with no invoices in 2026.', starter: `SELECT l.location_id, l.location_name\nFROM treatment_locations l\nWHERE NOT EXISTS (\n  SELECT 1 FROM invoices i\n  WHERE i.location_id = l.location_id\n);` },
    challenge: {
      level: 2,
      prompt: 'Find practitioners who have never recorded a charge. Show practitioner_id, first_name, last_name and hire_date.',
      solution: `SELECT p.practitioner_id, p.first_name, p.last_name, p.hire_date FROM practitioners p WHERE NOT EXISTS (SELECT 1 FROM charges c WHERE c.practitioner_id = p.practitioner_id);`,
      hints: ['"Never" means NOT EXISTS.', 'Outer table: practitioners. Inner table: charges.', 'Correlate with c.practitioner_id = p.practitioner_id.', 'SELECT ... FROM practitioners p WHERE NOT EXISTS (SELECT 1 FROM charges c WHERE c.practitioner_id = p.practitioner_id);'],
    },
    quiz: [
      { q: 'Which is NULL-safe for "payors with no invoices"?', options: ['NOT IN (SELECT payor_id FROM invoices)', 'NOT EXISTS (SELECT 1 FROM invoices i WHERE i.payor_id = p.payor_id)', 'payor_id <> ALL (...)', 'All of them'], answer: 1, why: 'NOT EXISTS only checks for row existence, so NULLs cannot turn it UNKNOWN.' },
      { q: 'An anti-join returns...', options: ['rows with matches', 'rows without matches', 'all combinations', 'only NULLs'], answer: 1, why: 'Anti-join = rows from the left side that have no match on the right.' },
    ],
  },

  // ---------------------------------------------------------------- 07
  {
    id: 'filtering-07',
    goals: [
      'How to build complex filters from simple pieces',
      'Grouping conditions with parentheses',
      'Mixing IN, BETWEEN, LIKE and IS NULL in one WHERE',
      'Reading and testing complex conditions step by step',
    ],
    concept: `<p>Real business rules combine many tests. The trick is to <b>build them from small, clear pieces</b> and group them with parentheses:</p>
<pre>WHERE (status = 'Overdue' OR (status = 'Partially Paid' AND due_date &lt; '2026-01-01'))
  AND location_id IN (1, 2)
  AND total_amount &gt;= 100</pre>
<p>Read it as: "(overdue, or an old partial payment) at locations 1 or 2, worth at least 100".</p>`,
    why: 'Work queues and reports encode policy: several statuses, special cases and thresholds. You must express that policy exactly, with no accidental extra or missing rows.',
    when: 'Collection queues, audit selections, eligibility rules, and any filter with "either ... or ..., but only if ...".',
    analogy: 'The collections policy memo: "Call about any overdue invoice, OR any partially paid invoice that is older than this year, but only for the downtown clinic and the hospital, and only if it is at least $100." Each clause of the memo becomes a piece of the WHERE.',
    exampleSql: `SELECT invoice_id, location_id, status, due_date, total_amount FROM invoices WHERE location_id IN (1, 2)`,
    syntax: `WHERE (A OR (B AND C))\n  AND D\n  AND E`,
    sql: `SELECT invoice_id, location_id, status, due_date, total_amount\nFROM invoices\nWHERE (status = 'Overdue'\n       OR (status = 'Partially Paid' AND due_date < '2026-01-01'))\n  AND location_id IN (1, 2, 4)\n  AND total_amount >= 100\nORDER BY location_id, invoice_id;`,
    breakdown: [
      ["(status = 'Overdue' OR (status = 'Partially Paid' AND due_date < '2026-01-01'))", 'The status rule: overdue, or partially paid with an old due date. The inner parentheses keep the date test attached to Partially Paid only.'],
      ['AND location_id IN (1, 2, 4)', 'Location rule, applied to both status cases.'],
      ['AND total_amount >= 100', 'Amount rule, applied to everything.'],
    ],
    internals: `<p>The optimizer converts the WHERE into a tree of AND/OR nodes. Top-level ANDed terms can be tested separately, and one of them may be answered by an index. OR branches can sometimes use several indexes (SQLite's "OR optimization" / multi-index OR), or the engine falls back to a scan. Simple, sargable pieces (<code>col op constant</code>) give the optimizer the most options.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM invoices\nWHERE status = 'Overdue' OR status = 'Partially Paid' AND due_date < '2026-01-01'\n  AND location_id IN (1, 2, 4);`, why: 'Without parentheses, AND binds first: every overdue invoice from ANY location slips in, because the location test only attaches to the Partially Paid branch.', fix: `SELECT * FROM invoices\nWHERE (status = 'Overdue' OR (status = 'Partially Paid' AND due_date < '2026-01-01'))\n  AND location_id IN (1, 2, 4);` },
      { wrong: `SELECT * FROM patients WHERE city = 'Dallas' OR 'Austin';`, why: "Each OR side must be a full condition. 'Austin' alone is a text value, which SQLite treats as 0 (false), so Austin patients are missing. Repeat the column or use IN.", fix: `SELECT * FROM patients WHERE city IN ('Dallas', 'Austin');` },
    ],
    rules: [
      'Build complex filters one piece at a time and test each piece.',
      'Parenthesize every OR group.',
      'Use IN instead of chains of OR on the same column.',
      'Put each top-level AND on its own line.',
    ],
    compare: `<p><b>Complex WHERE vs. CASE:</b> WHERE decides <i>which rows</i> appear. CASE decides <i>what value</i> each row shows. You can move a complex rule into a CASE label first to check which branch each row hits, then filter on it.</p>`,
    realWorld: 'Collections worklists, prior-authorization rules, and audit sampling ("high-dollar OR unusual code, at hospital locations, last 90 days").',
    tips: ['Debug trick: turn each condition into a SELECT column (for example, status = \'Overdue\' AS c1) to see which parts are true for each row.'],
    deep: `<p>Any boolean formula can be rewritten into a canonical form: an OR of ANDs (disjunctive normal form) or an AND of ORs (conjunctive normal form). Optimizers work mostly with CNF, a list of ANDed terms, because each term can be pushed down or indexed on its own. Writing your filter as clear ANDed terms helps both humans and optimizers.</p>`,
    tryIt: { prompt: 'Add each condition as a column (c1, c2, c3) to see which parts of the rule are true for each invoice.', starter: `SELECT invoice_id, status, location_id, total_amount,\n       status = 'Overdue' AS c1,\n       location_id IN (1, 2, 4) AS c2,\n       total_amount >= 100 AS c3\nFROM invoices\nORDER BY invoice_id;` },
    challenge: {
      level: 3,
      prompt: "Find patients who (live in Dallas or Austin) AND (have at least one allergy recorded OR have no primary payor) AND have an email. Show patient_id, first_name, city, allergies and primary_payor_id, sorted by patient_id.",
      solution: `SELECT patient_id, first_name, city, allergies, primary_payor_id FROM patients WHERE city IN ('Dallas', 'Austin') AND (allergies IS NOT NULL OR primary_payor_id IS NULL) AND email IS NOT NULL ORDER BY patient_id;`,
      hints: ["The city part: city IN ('Dallas', 'Austin').", 'The allergy/payor part is an OR, so wrap it in parentheses.', 'Use IS NOT NULL / IS NULL for the NULL checks.', "WHERE city IN ('Dallas','Austin') AND (allergies IS NOT NULL OR primary_payor_id IS NULL) AND email IS NOT NULL ORDER BY patient_id"],
      ordered: true,
    },
    quiz: [
      { q: "WHERE city = 'Dallas' OR 'Austin' in SQLite returns...", options: ['Dallas and Austin patients', 'Only Dallas patients', 'Only Austin patients', 'Error'], answer: 1, why: "'Austin' by itself is not a comparison. It evaluates to false (0)." },
      { q: 'What is the best first step when a complex WHERE returns unexpected rows?', options: ['Add DISTINCT', 'Test each condition separately', 'Remove all parentheses', 'Add ORDER BY'], answer: 1, why: 'Isolating each piece shows which one behaves differently from what you expected.' },
    ],
  },

  // ---------------------------------------------------------------- 08
  {
    id: 'filtering-08',
    goals: [
      'The precedence order of SQL operators',
      'Why NOT > AND > OR matters',
      'How arithmetic and comparison bind before logic',
      'How to use parentheses to remove all doubt',
    ],
    concept: `<p><b>Operator precedence</b> decides which parts of an expression are grouped first, just like school math where × comes before +.</p>
<p>From <b>strongest</b> (applied first) to <b>weakest</b>:</p>
<ol><li>Arithmetic: <code>* / %</code>, then <code>+ -</code> (and <code>||</code> for text)</li>
<li>Comparison: <code>= &lt;&gt; &lt; &gt; &lt;= &gt;=</code>, <code>IS</code>, <code>LIKE</code>, <code>IN</code>, <code>BETWEEN</code></li>
<li><code>NOT</code></li><li><code>AND</code></li><li><code>OR</code></li></ol>
<p>So <code>NOT a = 1 OR b = 2 AND c = 3</code> means <code>(NOT (a = 1)) OR ((b = 2) AND (c = 3))</code>.</p>`,
    why: 'If you do not know the grouping rules, SQL silently computes something different from what you meant, and there is no error to warn you.',
    when: 'Every time you mix AND with OR, use NOT, or combine arithmetic with comparisons.',
    analogy: 'An order written as "stat labs or imaging and a consult" is ambiguous at the nurses\' station. Does the consult go with imaging only, or with both? SQL has a fixed rule (AND first). Humans don\'t, so add brackets.',
    exampleSql: `SELECT invoice_id, status, payor_id, total_amount FROM invoices LIMIT 10`,
    syntax: `-- implicit grouping\nA OR B AND C        ==  A OR (B AND C)\nNOT A AND B         ==  (NOT A) AND B\nx + y * 2 > 100     ==  (x + (y * 2)) > 100`,
    sql: `SELECT invoice_id, status, payor_id, total_amount\nFROM invoices\nWHERE status = 'Overdue' OR status = 'Open' AND payor_id = 2\nORDER BY invoice_id;`,
    breakdown: [
      ["status = 'Overdue'", 'One branch: any overdue invoice, from any payor.'],
      ["OR status = 'Open' AND payor_id = 2", "AND binds first, so this is (Open AND payor 2). The payor filter does NOT apply to the Overdue branch."],
      ['Result', 'Overdue invoices from every payor, plus Open invoices from payor 2. Compare with the tryIt, which adds parentheses.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 600 220" width="100%" font-family="sans-serif" font-size="13">
<text x="10" y="20" fill="var(--text)" font-weight="bold">Precedence ladder (top binds first)</text>
<rect x="10" y="32" width="230" height="30" rx="5" fill="var(--purple)" opacity="0.35"/><text x="20" y="52" fill="var(--text)">1. * / %   then  + -  ||</text>
<rect x="10" y="68" width="230" height="30" rx="5" fill="var(--blue)" opacity="0.35"/><text x="20" y="88" fill="var(--text)">2. = &lt;&gt; &lt; &gt; IS LIKE IN BETWEEN</text>
<rect x="10" y="104" width="230" height="30" rx="5" fill="var(--yellow)" opacity="0.35"/><text x="20" y="124" fill="var(--text)">3. NOT</text>
<rect x="10" y="140" width="230" height="30" rx="5" fill="var(--green)" opacity="0.35"/><text x="20" y="160" fill="var(--text)">4. AND</text>
<rect x="10" y="176" width="230" height="30" rx="5" fill="var(--red)" opacity="0.3"/><text x="20" y="196" fill="var(--text)">5. OR (binds last)</text>
<text x="270" y="52" fill="var(--text)">A OR B AND C</text>
<line x1="330" y1="60" x2="330" y2="80" stroke="var(--muted)"/>
<rect x="265" y="82" width="40" height="26" rx="4" fill="none" stroke="var(--red)"/><text x="285" y="100" text-anchor="middle" fill="var(--text)">OR</text>
<line x1="275" y1="108" x2="265" y2="130" stroke="var(--muted)"/><line x1="295" y1="108" x2="345" y2="130" stroke="var(--muted)"/>
<text x="258" y="146" fill="var(--text)">A</text>
<rect x="325" y="130" width="46" height="26" rx="4" fill="none" stroke="var(--green)"/><text x="348" y="148" text-anchor="middle" fill="var(--text)">AND</text>
<line x1="335" y1="156" x2="320" y2="176" stroke="var(--muted)"/><line x1="360" y1="156" x2="378" y2="176" stroke="var(--muted)"/>
<text x="314" y="192" fill="var(--text)">B</text><text x="374" y="192" fill="var(--text)">C</text>
<text x="420" y="100" fill="var(--muted)">AND sits lower in the</text><text x="420" y="118" fill="var(--muted)">tree, so it is evaluated</text><text x="420" y="136" fill="var(--muted)">first: A OR (B AND C)</text>
</svg>` },
    internals: `<p>The SQL parser uses a grammar with precedence levels to build an <b>expression tree</b>. Higher-precedence operators end up deeper in the tree, so they are evaluated first. Parentheses simply force a subtree. After parsing, the optimizer only sees the tree, so it cannot guess what you meant.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM invoices\nWHERE status = 'Overdue' OR status = 'Open' AND payor_id = 2;  -- meant: payor 2 only`, why: 'AND binds tighter than OR, so the payor filter only applies to Open. Overdue invoices from every payor are returned.', fix: `SELECT * FROM invoices\nWHERE (status = 'Overdue' OR status = 'Open') AND payor_id = 2;` },
      { wrong: `SELECT * FROM invoices WHERE NOT status = 'Paid' OR status = 'Void';  -- meant: neither Paid nor Void`, why: "NOT only applies to the first comparison: (NOT Paid) OR Void. That includes Void invoices, the opposite of the intent.", fix: `SELECT * FROM invoices WHERE NOT (status = 'Paid' OR status = 'Void');` },
      { wrong: `SELECT charge_id FROM charges WHERE units + 1 * unit_price > 200;  -- meant (units + 1) * unit_price`, why: '* binds before +, so this computes units + unit_price.', fix: `SELECT charge_id FROM charges WHERE (units + 1) * unit_price > 200;` },
    ],
    rules: [
      'Arithmetic → comparison → NOT → AND → OR.',
      'NOT applies only to the condition right after it.',
      'When mixing AND/OR, always add parentheses, even if not strictly needed.',
      'Parentheses cost nothing and prevent silent bugs.',
    ],
    compare: `<p>This is the same idea as math: <b>AND is like ×, OR is like +</b>. <code>a + b × c</code> = <code>a + (b × c)</code>, and <code>A OR B AND C</code> = <code>A OR (B AND C)</code>.</p>`,
    realWorld: 'Precedence bugs are a classic cause of wrong reports and data leaks, such as a patient portal filter "WHERE patient_id = ? AND status = \'Open\' OR status = \'Overdue\'" that shows every patient\'s overdue bills!',
    tips: ['Code review rule: any WHERE with both AND and OR must have parentheses.'],
    deep: `<p>The portal example above is a real security pattern. When filters are combined, the security condition (patient_id = ?) must wrap everything: <code>WHERE patient_id = ? AND (user filters...)</code>. Many ORMs add the parentheses for you. Hand-written SQL must do it explicitly.</p>`,
    tryIt: { prompt: 'Add parentheses so the payor filter applies to both statuses. How many rows are removed?', starter: `SELECT invoice_id, status, payor_id, total_amount\nFROM invoices\nWHERE (status = 'Overdue' OR status = 'Open') AND payor_id = 2\nORDER BY invoice_id;` },
    challenge: {
      level: 2,
      prompt: "Find invoices billed to payor 3 or payor 4 whose status is NOT 'Paid'. Show invoice_id, payor_id and status, sorted by invoice_id. (Watch the precedence!)",
      solution: `SELECT invoice_id, payor_id, status FROM invoices WHERE (payor_id = 3 OR payor_id = 4) AND NOT status = 'Paid' ORDER BY invoice_id;`,
      hints: ['There are two parts: the payor test and the status test.', 'The payor test is an OR, so put it in parentheses (or use IN).', "Status: NOT status = 'Paid' or status <> 'Paid'.", "WHERE (payor_id = 3 OR payor_id = 4) AND status <> 'Paid' ORDER BY invoice_id"],
      ordered: true,
    },
    quiz: [
      { q: 'NOT A AND B means...', options: ['NOT (A AND B)', '(NOT A) AND B', 'A AND NOT B', 'Error'], answer: 1, why: 'NOT binds tighter than AND.' },
      { q: 'Which operator is evaluated last?', options: ['AND', 'NOT', 'OR', '='], answer: 2, why: 'OR has the lowest precedence.' },
      { q: 'A OR B AND C is the same as...', options: ['(A OR B) AND C', 'A OR (B AND C)', '(A AND C) OR B', 'A AND B OR C'], answer: 1, why: 'AND groups first.' },
    ],
  },

  // ---------------------------------------------------------------- 09
  {
    id: 'filtering-09',
    goals: [
      'Why <> and NOT IN silently drop NULL rows',
      'NULL-safe comparison: IS / IS NOT and IS [NOT] DISTINCT FROM',
      'How COALESCE can make a filter NULL-aware',
      'Writing filters that behave correctly on incomplete data',
    ],
    concept: `<p>Normal comparisons with NULL give UNKNOWN, and WHERE drops UNKNOWN rows. So <code>payor_id &lt;&gt; 7</code> ("not Self-Pay") also <b>quietly drops</b> invoices with a NULL payor_id. Usually that is not what you meant.</p>
<p><b>NULL-safe</b> operators treat NULL as a normal comparable value:</p>
<ul><li><code>a IS b</code> / <code>a IS NOT b</code> (SQLite)</li>
<li><code>a IS DISTINCT FROM b</code> / <code>IS NOT DISTINCT FROM</code> (ANSI: PostgreSQL, SQLite 3.39+)</li>
<li><code>a &lt;=&gt; b</code> (MySQL)</li></ul>
<p>With these, <code>NULL IS NULL</code> is TRUE and <code>NULL IS NOT 7</code> is TRUE.</p>`,
    why: 'Incomplete data is normal. A filter that forgets NULLs gives wrong counts and missing rows without any warning.',
    when: 'Any "not equal to" or "changed from" test on a nullable column, and comparing two nullable columns for equality.',
    analogy: 'The rule "flag every invoice not billed to Self-Pay" should also flag invoices where the payer box is blank. A plain <> skips the blank ones, because it cannot compare blank with Self-Pay. IS NOT treats "blank" as a real answer.',
    exampleSql: `SELECT invoice_id, patient_id, payor_id, status FROM invoices WHERE payor_id IS NULL OR payor_id = 7`,
    syntax: `a IS b                       -- SQLite NULL-safe equal\na IS NOT b                   -- SQLite NULL-safe not-equal\na IS DISTINCT FROM b         -- ANSI\na IS NOT DISTINCT FROM b\na <=> b                      -- MySQL NULL-safe equal`,
    sql: `SELECT invoice_id, patient_id, payor_id, status\nFROM invoices\nWHERE payor_id IS NOT 7\n  AND status = 'Overdue'\nORDER BY invoice_id;`,
    breakdown: [
      ['WHERE payor_id IS NOT 7', 'NULL-safe "not Self-Pay": rows with a NULL payor_id are kept (NULL IS NOT 7 is TRUE).'],
      ["AND status = 'Overdue'", 'Only overdue invoices.'],
      ['Compare', 'With payor_id <> 7 instead, invoice 25 (payor NULL, Overdue) would disappear.'],
    ],
    visual: { type: 'null' },
    dialectSql: {
      sqlite: `SELECT * FROM invoices WHERE payor_id IS NOT 7;`,
      postgres: `SELECT * FROM invoices WHERE payor_id IS DISTINCT FROM 7;`,
      mysql: `SELECT * FROM invoices WHERE NOT (payor_id <=> 7);`,
      sqlserver: `SELECT * FROM invoices WHERE payor_id IS DISTINCT FROM 7;  -- SQL Server 2022+\n-- older: WHERE payor_id <> 7 OR payor_id IS NULL`,
      oracle: `SELECT * FROM invoices WHERE payor_id <> 7 OR payor_id IS NULL;  -- DECODE trick also common`,
    },
    internals: `<p><code>IS</code> / <code>IS NOT</code> are special comparison opcodes that never return NULL. Internally they are "equal, where two NULLs count as equal". Like <code>=</code>, <code>IS</code> can use an index in SQLite. <code>IS NOT</code> and <code>&lt;&gt;</code> generally cannot, because "everything except one value" is not a narrow range.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, payor_id FROM invoices WHERE payor_id <> 7;  -- "all non-self-pay"`, why: 'The two invoices with a NULL payor_id vanish, because NULL <> 7 is UNKNOWN. 36 rows instead of 38.', fix: `SELECT invoice_id, payor_id FROM invoices WHERE payor_id IS NOT 7;` },
      { wrong: `SELECT p.patient_id FROM patients p JOIN invoices i ON i.patient_id = p.patient_id\nWHERE i.payor_id = p.primary_payor_id;  -- "billed to their own primary payor"`, why: 'When both are NULL (a self-pay patient billed with no payor), = gives UNKNOWN and the row is dropped. Use IS for a NULL-safe match if NULL-to-NULL should count.', fix: `SELECT p.patient_id FROM patients p JOIN invoices i ON i.patient_id = p.patient_id\nWHERE i.payor_id IS p.primary_payor_id;` },
    ],
    rules: [
      '<>, =, NOT IN and NOT LIKE all drop NULL rows.',
      'SQLite: IS / IS NOT are NULL-safe. ANSI: IS [NOT] DISTINCT FROM.',
      'Or be explicit: col <> x OR col IS NULL.',
      "COALESCE(col, 'sentinel') works but hides intent and blocks index use.",
    ],
    compare: `<table><tr><th>a</th><th>b</th><th>a = b</th><th>a IS b</th><th>a &lt;&gt; b</th><th>a IS NOT b</th></tr>
<tr><td>7</td><td>7</td><td>TRUE</td><td>TRUE</td><td>FALSE</td><td>FALSE</td></tr>
<tr><td>7</td><td>3</td><td>FALSE</td><td>FALSE</td><td>TRUE</td><td>TRUE</td></tr>
<tr><td>NULL</td><td>7</td><td>UNKNOWN</td><td>FALSE</td><td>UNKNOWN</td><td>TRUE</td></tr>
<tr><td>NULL</td><td>NULL</td><td>UNKNOWN</td><td>TRUE</td><td>UNKNOWN</td><td>FALSE</td></tr></table>`,
    realWorld: 'Change-detection in ETL ("did the email change?" when old or new can be NULL), payer reconciliation, and audit rules on optional fields.',
    tips: ['Count the rows both ways (<> vs IS NOT). If the numbers differ, NULLs are involved.'],
    deep: `<p>Change detection for a nullable column is a classic case: <code>WHERE old.email IS DISTINCT FROM new.email</code> catches NULL→value, value→NULL and value→value changes. <code>old.email &lt;&gt; new.email</code> misses the first two. UNIQUE constraints also treat NULLs as distinct in most databases, so several NULLs are allowed.</p>`,
    tryIt: { prompt: 'Compare the counts: payor_id <> 7 vs payor_id IS NOT 7 vs payor_id IS DISTINCT FROM 7.', starter: `SELECT\n  (SELECT COUNT(*) FROM invoices WHERE payor_id <> 7)                AS plain_not_equal,\n  (SELECT COUNT(*) FROM invoices WHERE payor_id IS NOT 7)            AS null_safe,\n  (SELECT COUNT(*) FROM invoices WHERE payor_id IS DISTINCT FROM 7)  AS ansi_null_safe;` },
    challenge: {
      level: 2,
      prompt: "List patients whose city is not 'Dallas', INCLUDING patients whose city is unknown (NULL). Show patient_id, first_name and city, sorted by patient_id.",
      solution: `SELECT patient_id, first_name, city FROM patients WHERE city IS NOT 'Dallas' ORDER BY patient_id;`,
      hints: ["city <> 'Dallas' would drop NULL cities.", 'Use a NULL-safe comparison.', "In SQLite: city IS NOT 'Dallas' (or <> ... OR city IS NULL).", "SELECT patient_id, first_name, city FROM patients WHERE city IS NOT 'Dallas' ORDER BY patient_id;"],
      ordered: true,
    },
    quiz: [
      { q: 'NULL IS NOT 7 evaluates to...', options: ['TRUE', 'FALSE', 'UNKNOWN', 'NULL'], answer: 0, why: 'IS NOT is NULL-safe: NULL is indeed different from 7.' },
      { q: 'NULL IS NULL evaluates to...', options: ['TRUE', 'FALSE', 'UNKNOWN'], answer: 0, why: 'IS treats two NULLs as equal.' },
    ],
  },

  // ---------------------------------------------------------------- 10
  {
    id: 'filtering-10',
    goals: [
      'Closed [a, b] vs. half-open [a, b) ranges',
      'Why half-open ranges are best for dates and time periods',
      'Combining and excluding several ranges',
      'How range filters use indexes',
    ],
    concept: `<p>A <b>range filter</b> keeps values inside some interval. There are two styles:</p>
<ul><li><b>Closed</b> <code>[a, b]</code>: <code>x &gt;= a AND x &lt;= b</code> (same as BETWEEN).</li>
<li><b>Half-open</b> <code>[a, b)</code>: <code>x &gt;= a AND x &lt; b</code>. It includes the start and excludes the end.</li></ul>
<p>Half-open ranges are ideal for periods. "July 2025" is <code>&gt;= '2025-07-01' AND &lt; '2025-08-01'</code>. You never need to know how many days the month has, and consecutive periods never overlap or leave gaps.</p>`,
    why: 'Reporting periods (months, quarters, aging buckets) must cover every row exactly once. Half-open ranges guarantee that.',
    when: 'Date periods, amount bands (0-100, 100-500, 500+), aging buckets, and anything that tiles a number line.',
    analogy: 'The billing month closes at midnight on the 1st. Everything from the 1st up to (but not including) the next 1st belongs to this month. Nothing falls into both months or into neither.',
    exampleSql: `SELECT payment_id, payment_date, amount FROM payments ORDER BY payment_date LIMIT 12`,
    syntax: `WHERE col >= start AND col < next_start      -- half-open\nWHERE (col >= a1 AND col < b1)\n   OR (col >= a2 AND col < b2)               -- several ranges`,
    sql: `SELECT payment_id, payment_date, method, amount\nFROM payments\nWHERE payment_date >= '2025-07-01'\n  AND payment_date <  '2025-10-01'     -- Q3 2025\nORDER BY payment_date;`,
    breakdown: [
      ["payment_date >= '2025-07-01'", 'Start of Q3, included.'],
      ["payment_date < '2025-10-01'", 'Start of Q4, excluded. Every Q3 date (even Sept 30 at 23:59) is inside.'],
      ['ORDER BY payment_date', 'Chronological.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 600 150" width="100%" font-family="sans-serif" font-size="12">
<line x1="20" y1="60" x2="580" y2="60" stroke="var(--muted)" stroke-width="2"/>
<rect x="60" y="45" width="160" height="30" fill="var(--blue)" opacity="0.35"/><rect x="220" y="45" width="160" height="30" fill="var(--green)" opacity="0.35"/><rect x="380" y="45" width="160" height="30" fill="var(--purple)" opacity="0.35"/>
<circle cx="60" cy="60" r="5" fill="var(--text)"/><circle cx="220" cy="60" r="5" fill="var(--text)"/><circle cx="380" cy="60" r="5" fill="var(--text)"/><circle cx="540" cy="60" r="5" fill="var(--panel2)" stroke="var(--text)"/>
<text x="140" y="38" text-anchor="middle" fill="var(--text)">July</text><text x="300" y="38" text-anchor="middle" fill="var(--text)">August</text><text x="460" y="38" text-anchor="middle" fill="var(--text)">September</text>
<text x="60" y="95" text-anchor="middle" fill="var(--muted)">07-01</text><text x="220" y="95" text-anchor="middle" fill="var(--muted)">08-01</text><text x="380" y="95" text-anchor="middle" fill="var(--muted)">09-01</text><text x="540" y="95" text-anchor="middle" fill="var(--muted)">10-01</text>
<text x="300" y="125" text-anchor="middle" fill="var(--text)">[07-01, 08-01) [08-01, 09-01) [09-01, 10-01): no overlap, no gap</text>
<text x="300" y="143" text-anchor="middle" fill="var(--muted)">filled dot = included (&gt;=), hollow dot = excluded (&lt;)</text>
</svg>` },
    internals: `<p>With an index on the column, <code>col &gt;= a AND col &lt; b</code> is a single <b>index range scan</b>: seek to a, read forward, stop at b. If you wrap the column in a function instead (<code>strftime('%Y-%m', payment_date) = '2025-07'</code>), the index cannot be used, and every row must be computed and checked. Keeping the column "bare" in the comparison is called writing a <b>sargable</b> predicate.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM payments WHERE payment_date BETWEEN '2025-07-01' AND '2025-07-31';\nSELECT * FROM payments WHERE payment_date BETWEEN '2025-07-31' AND '2025-08-31';`, why: 'Closed ranges that share an endpoint double-count: a payment on 07-31 appears in both "months". The second range is also wrong by design. Use half-open ranges that start where the previous one ends.', fix: `SELECT * FROM payments WHERE payment_date >= '2025-07-01' AND payment_date < '2025-08-01';` },
      { wrong: `SELECT * FROM invoices WHERE total_amount > 100 AND total_amount < 200;\n-- and a second bucket: total_amount > 200 AND total_amount < 500`, why: 'Exactly 100 and exactly 200 fall into no bucket at all. Use >= for the lower bound and < for the upper bound in every bucket.', fix: `SELECT * FROM invoices WHERE total_amount >= 100 AND total_amount < 200;` },
    ],
    rules: [
      'Periods: >= start AND < next_start.',
      'Buckets must share boundaries: [0,100) [100,200) [200,∞).',
      'Keep the column bare (no functions) so indexes work.',
      'Several ranges: OR them together, each one in parentheses.',
    ],
    compare: `<table><tr><th>Style</th><th>Form</th><th>Best for</th></tr>
<tr><td>Closed</td><td>BETWEEN a AND b</td><td>whole-number ids, inclusive thresholds</td></tr>
<tr><td>Half-open</td><td>&gt;= a AND &lt; b</td><td>dates, timestamps, money buckets, periods</td></tr>
<tr><td>Open-ended</td><td>&gt;= a</td><td>"since", "over"</td></tr></table>`,
    realWorld: 'Monthly revenue close, A/R aging buckets (0-30, 31-60 days...), payer contract effective dates (effective_from <= d < effective_to), and quarterly compliance reports.',
    tips: ["Compute the next start with date('2025-07-01', '+1 month') instead of hard-coding month ends."],
    deep: `<p>Temporal tables (valid-time ranges) use half-open intervals everywhere: a contract row is valid for <code>valid_from &lt;= d AND d &lt; valid_to</code>, and "current" rows have <code>valid_to = '9999-12-31'</code>. PostgreSQL even has range types (<code>daterange</code>) with the <code>[)</code> default, plus exclusion constraints that forbid overlaps.</p>`,
    tryIt: { prompt: 'Show invoices from two separate windows: Feb 2025 and June 2026 (use two half-open ranges joined by OR).', starter: `SELECT invoice_id, invoice_date, total_amount\nFROM invoices\nWHERE (invoice_date >= '2025-02-01' AND invoice_date < '2025-03-01')\n   OR (invoice_date >= '2026-06-01' AND invoice_date < '2026-07-01')\nORDER BY invoice_date;` },
    challenge: {
      level: 2,
      prompt: "Using a half-open range, list charges with a service_date in the first quarter of 2026 (January to March). Show charge_id, service_date, cpt_code and amount, sorted by service_date then charge_id.",
      solution: `SELECT charge_id, service_date, cpt_code, amount FROM charges WHERE service_date >= '2026-01-01' AND service_date < '2026-04-01' ORDER BY service_date, charge_id;`,
      hints: ['Q1 starts on 2026-01-01.', 'Q2 starts on 2026-04-01. That is your exclusive upper bound.', "service_date >= '2026-01-01' AND service_date < '2026-04-01'", 'ORDER BY service_date, charge_id'],
      ordered: true,
    },
    quiz: [
      { q: "Which filter selects exactly the month of February 2026?", options: ["BETWEEN '2026-02-01' AND '2026-02-30'", ">= '2026-02-01' AND < '2026-03-01'", "> '2026-02-01' AND < '2026-03-01'", "LIKE '2026-2%'"], answer: 1, why: 'Half-open: include Feb 1, exclude Mar 1. No need to know the month length.' },
      { q: 'Why is strftime(\'%Y\', d) = \'2026\' slower than d >= \'2026-01-01\' AND d < \'2027-01-01\'?', options: ['strftime is buggy', 'The function on the column prevents index use', 'Text comparison is slow', 'It is not slower'], answer: 1, why: 'Wrapping the column in a function makes the predicate non-sargable.' },
    ],
  },

  // ---------------------------------------------------------------- 11
  {
    id: 'filtering-11',
    goals: [
      'How to filter using a value computed by another query',
      'Scalar subqueries (one value) vs. list subqueries (IN)',
      'Correlated vs. non-correlated subqueries in WHERE',
      'What happens when a scalar subquery returns no row or several rows',
    ],
    concept: `<p>A <b>subquery</b> is a SELECT inside another query. In WHERE, it lets you filter by something you must calculate first.</p>
<ul><li><b>Scalar</b> (one value): <code>WHERE total_amount &gt; (SELECT AVG(total_amount) FROM invoices)</code> means "above the average invoice".</li>
<li><b>List</b>: <code>WHERE patient_id IN (SELECT patient_id FROM invoices WHERE status = 'Overdue')</code>.</li>
<li><b>Correlated</b>: the subquery uses the outer row, for example "above the average <i>of its own location</i>".</li></ul>
<p>The database runs the inner query and uses its answer in the outer filter.</p>`,
    why: 'Many filters depend on data, not on fixed numbers: "above average", "the latest date", "patients of inactive payors". Subqueries calculate those values on the fly.',
    when: 'When the threshold or list comes from the data itself and changes as the data changes.',
    analogy: 'The manager says: "Show me every invoice bigger than our average invoice." First someone computes the average on a calculator (the subquery), then they go through the invoices comparing each one (the outer query).',
    exampleSql: `SELECT ROUND(AVG(total_amount), 2) AS avg_invoice, MAX(invoice_date) AS latest_invoice FROM invoices`,
    syntax: `WHERE col > (SELECT AGG(x) FROM t)                 -- scalar\nWHERE col IN (SELECT key FROM t WHERE ...)         -- list\nWHERE col > (SELECT AGG(x) FROM t2 WHERE t2.k = t1.k)  -- correlated`,
    sql: `SELECT invoice_id, location_id, total_amount\nFROM invoices\nWHERE total_amount > (SELECT AVG(total_amount) FROM invoices)\nORDER BY total_amount DESC;`,
    breakdown: [
      ['(SELECT AVG(total_amount) FROM invoices)', 'Inner query: runs once and returns a single number (about 241.04).'],
      ['WHERE total_amount > (...)', 'Outer filter: keep invoices above that number.'],
      ['ORDER BY total_amount DESC', 'Largest first.'],
    ],
    visual: { type: 'correlated' },
    internals: `<p>A <b>non-correlated</b> scalar subquery is computed <b>once</b> and cached, so it is cheap. A <b>correlated</b> subquery logically runs once per outer row. SQLite may cache results for repeated outer values, or the optimizer may rewrite it as a join. If a scalar subquery returns no rows, its value is NULL (so the comparison is UNKNOWN). If it returns several rows, SQLite silently uses the first one, while PostgreSQL raises an error.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM invoices WHERE total_amount > AVG(total_amount);`, why: 'Aggregates cannot be used directly in WHERE, because WHERE works on one row at a time. Compute the average in a subquery.', fix: `SELECT * FROM invoices WHERE total_amount > (SELECT AVG(total_amount) FROM invoices);` },
      { wrong: `SELECT * FROM invoices WHERE patient_id = (SELECT patient_id FROM patients WHERE city = 'Dallas');`, why: 'The subquery returns many patients. = needs a single value (PostgreSQL errors, SQLite silently uses just the first row). Use IN for lists.', fix: `SELECT * FROM invoices WHERE patient_id IN (SELECT patient_id FROM patients WHERE city = 'Dallas');` },
    ],
    rules: [
      'Scalar subqueries must return one row and one column. Use = < > with them.',
      'List subqueries use IN / NOT IN / EXISTS.',
      'Aggregates go inside a subquery, never directly in WHERE.',
      'Correlated means it references the outer row, so it logically runs per row.',
    ],
    compare: `<p><b>Subquery vs. JOIN:</b> a JOIN combines columns from both tables. A WHERE subquery only filters and never duplicates rows. <b>Subquery vs. CTE:</b> a CTE (next lesson) is the same idea, but named and written up front, which is easier to read and reuse.</p>`,
    realWorld: 'Outlier detection (charges above the average for their CPT code), "latest" lookups (payments on the most recent date), and eligibility ("patients whose payor is inactive").',
    tips: ['Run the inner query by itself first to check what it returns.'],
    deep: `<p>Comparison operators can also take <code>ANY</code>/<code>ALL</code> with a subquery in PostgreSQL/SQL Server (<code>&gt; ALL (SELECT ...)</code>). SQLite lacks ANY/ALL: use MAX/MIN in a scalar subquery instead (<code>&gt; (SELECT MAX(...))</code>).</p>`,
    tryIt: { prompt: 'Find invoices above the average of their OWN location (a correlated subquery).', starter: `SELECT i.invoice_id, i.location_id, i.total_amount\nFROM invoices i\nWHERE i.total_amount > (\n  SELECT AVG(i2.total_amount)\n  FROM invoices i2\n  WHERE i2.location_id = i.location_id\n)\nORDER BY i.location_id, i.total_amount DESC;` },
    challenge: {
      level: 3,
      prompt: 'List invoices of patients whose primary payor is Medicare (payor_type = \'Medicare\'). Show invoice_id, patient_id and total_amount, sorted by invoice_id. Use nested IN subqueries (patients → payors).',
      solution: `SELECT invoice_id, patient_id, total_amount FROM invoices WHERE patient_id IN (SELECT patient_id FROM patients WHERE primary_payor_id IN (SELECT payor_id FROM payors WHERE payor_type = 'Medicare')) ORDER BY invoice_id;`,
      hints: ["Start from the inside: SELECT payor_id FROM payors WHERE payor_type = 'Medicare'.", 'Next: patients whose primary_payor_id IN (that list).', 'Outer: invoices whose patient_id IN (those patients).', 'Finish with ORDER BY invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'Why is WHERE total_amount > AVG(total_amount) invalid?', options: ['AVG does not exist', 'Aggregates cannot be used in WHERE', 'You need HAVING', 'It is valid'], answer: 1, why: 'WHERE works row by row. The aggregate must be computed separately, in a subquery.' },
      { q: 'A scalar subquery returns no rows. Its value is...', options: ['0', 'NULL', "''", 'Error'], answer: 1, why: 'An empty scalar subquery yields NULL.' },
    ],
  },

  // ---------------------------------------------------------------- 12
  {
    id: 'filtering-12',
    goals: [
      'What a CTE (WITH clause) is',
      'How to name an intermediate result and filter on it',
      'Using a CTE to filter on computed columns and aliases',
      'Chaining several CTEs step by step',
    ],
    concept: `<p>A <b>CTE</b> (Common Table Expression) is a <b>named, temporary result</b> defined at the top of a query with <code>WITH</code>:</p>
<pre>WITH overdue AS (
  SELECT ... FROM invoices WHERE status = 'Overdue'
)
SELECT ... FROM overdue WHERE ...</pre>
<p>Think of it as "first build this helper table, then query it". It only exists while the query runs.</p>
<p>A big benefit for filtering: inside the CTE you can compute columns with aliases (like <code>days_overdue</code>), and the outer query can then <b>filter on those aliases</b> normally.</p>`,
    why: 'Complex filters become readable when you break them into named steps. CTEs also solve the "alias not allowed in WHERE" problem.',
    when: 'When you want to filter on a calculated column, when a subquery is getting deeply nested, or when the same intermediate result is used more than once.',
    analogy: 'Preparing the collections call list in two steps: first print a worksheet of overdue invoices with "days overdue" written in (the CTE), then highlight only the lines over 60 days (the outer WHERE).',
    exampleSql: `SELECT invoice_id, due_date, status, total_amount FROM invoices WHERE status = 'Overdue'`,
    syntax: `WITH step1 AS (\n  SELECT ..., expr AS alias FROM ...\n),\nstep2 AS (\n  SELECT ... FROM step1 WHERE alias ...\n)\nSELECT ... FROM step2;`,
    sql: `WITH overdue AS (\n  SELECT invoice_id, patient_id, total_amount,\n         CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_overdue\n  FROM invoices\n  WHERE status = 'Overdue'\n)\nSELECT invoice_id, patient_id, total_amount, days_overdue\nFROM overdue\nWHERE days_overdue > 180\nORDER BY days_overdue DESC;`,
    breakdown: [
      ['WITH overdue AS ( ... )', 'Step 1: a named helper result of overdue invoices, with a computed days_overdue column.'],
      ["CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_overdue", 'The computation happens once, inside the CTE.'],
      ['FROM overdue WHERE days_overdue > 180', 'Step 2: the alias is now a normal column, so WHERE can use it.'],
      ['ORDER BY days_overdue DESC', 'Oldest debts first.'],
    ],
    visual: { type: 'flow', steps: [['FROM invoices', '48 invoices'], ["WHERE status = 'Overdue' (inside CTE)", 'overdue invoices only'], ['compute days_overdue', 'CTE "overdue" now has a named column'], ['FROM overdue WHERE days_overdue > 180', 'filter on the computed alias'], ['ORDER BY days_overdue DESC', 'oldest debts first']] },
    internals: `<p>SQLite usually <b>inlines</b> a CTE that is used once, treating it like a subquery in FROM (the optimizer may then push the outer WHERE inside). A CTE referenced several times may be <b>materialized</b>: computed once into a temporary table. You can force either behavior with <code>AS MATERIALIZED</code> / <code>AS NOT MATERIALIZED</code> (SQLite 3.35+, PostgreSQL 12+).</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id,\n       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_overdue\nFROM invoices\nWHERE days_overdue > 180;`, why: 'Standard SQL does not allow a SELECT alias in WHERE (WHERE runs first). SQLite tolerates it, but PostgreSQL fails. The CTE is the portable fix.', fix: `WITH x AS (\n  SELECT invoice_id, CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_overdue\n  FROM invoices\n)\nSELECT * FROM x WHERE days_overdue > 180;` },
      { wrong: `WITH overdue AS (SELECT * FROM invoices WHERE status = 'Overdue');\nSELECT * FROM overdue;`, why: 'A CTE is part of ONE statement. The semicolon ends the statement, so the second SELECT cannot see it.', fix: `WITH overdue AS (SELECT * FROM invoices WHERE status = 'Overdue')\nSELECT * FROM overdue;` },
    ],
    rules: [
      'WITH name AS (SELECT ...) comes before the main SELECT.',
      'Separate several CTEs with commas and write WITH only once.',
      'A CTE lives only for that one statement.',
      'Later CTEs can read earlier ones.',
    ],
    compare: `<table><tr><th></th><th>Readability</th><th>Reusable in the query</th><th>Lifetime</th></tr>
<tr><td>Subquery</td><td>nested, inside-out</td><td>no, it must be repeated</td><td>one query</td></tr>
<tr><td>CTE</td><td>top-down, named steps</td><td>yes</td><td>one query</td></tr>
<tr><td>View</td><td>named</td><td>yes, across queries</td><td>permanent</td></tr>
<tr><td>Temp table</td><td>named</td><td>yes</td><td>session</td></tr></table>`,
    realWorld: 'Collections and A/R reports are commonly built as chains of CTEs: base invoices → balances → aging bucket → final filtered list.',
    tips: ['Develop CTEs one at a time: write step 1, run SELECT * FROM step1, then add step 2.'],
    deep: `<p>CTEs can be <b>recursive</b> (<code>WITH RECURSIVE</code>), for example walking the practitioner supervisor tree. That is covered in the Advanced section. A CTE is also a clean place to put "parameters": <code>WITH params AS (SELECT '2026-09-01' AS today, 180 AS min_days)</code>.</p>`,
    tryIt: { prompt: 'Chain a second CTE that keeps only big overdue invoices (total_amount >= 150) from the first one.', starter: `WITH overdue AS (\n  SELECT invoice_id, total_amount,\n         CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_overdue\n  FROM invoices\n  WHERE status = 'Overdue'\n),\nbig_overdue AS (\n  SELECT * FROM overdue WHERE total_amount >= 150\n)\nSELECT * FROM big_overdue ORDER BY days_overdue DESC;` },
    challenge: {
      level: 3,
      prompt: "Using a CTE, compute for each charge its expected_amount = units * unit_price, then list only the charges where the stored amount differs from expected_amount OR where units > 3. Show charge_id, units, unit_price, amount and expected_amount, sorted by charge_id.",
      solution: `WITH c AS (SELECT charge_id, units, unit_price, amount, units * unit_price AS expected_amount FROM charges) SELECT charge_id, units, unit_price, amount, expected_amount FROM c WHERE amount <> expected_amount OR units > 3 ORDER BY charge_id;`,
      hints: ['Define WITH c AS (SELECT ..., units * unit_price AS expected_amount FROM charges).', 'In the outer query, expected_amount is a normal column.', 'Filter WHERE amount <> expected_amount OR units > 3.', 'Finish with ORDER BY charge_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'How long does a CTE exist?', options: ['Until the session ends', 'Only for the one statement it belongs to', 'Forever, like a view', 'Until COMMIT'], answer: 1, why: 'A CTE is scoped to a single statement.' },
      { q: 'How do you define two CTEs?', options: ['WITH a AS (...) WITH b AS (...)', 'WITH a AS (...), b AS (...)', 'WITH a, b AS (...)', 'Two separate statements'], answer: 1, why: 'Write WITH once and separate the CTEs with commas.' },
    ],
  },

  // ---------------------------------------------------------------- 13
  {
    id: 'filtering-13',
    goals: [
      "De Morgan's laws: how NOT distributes over AND/OR",
      'NOT IN, NOT LIKE, NOT BETWEEN and NOT EXISTS, and their NULL behavior',
      'Double negatives and how to simplify them',
      'Choosing the clearest negative form',
    ],
    concept: `<p>Negative filters ("everything <b>except</b> ...") are where most filtering bugs hide. Three key ideas:</p>
<ol><li><b>De Morgan's laws</b>:<br><code>NOT (A AND B)</code> = <code>NOT A OR NOT B</code><br><code>NOT (A OR B)</code> = <code>NOT A AND NOT B</code></li>
<li><b>NULLs never pass a negative test</b>: NOT LIKE, NOT IN, NOT BETWEEN and &lt;&gt; all drop NULL rows. NOT EXISTS is the exception.</li>
<li><b>Simplify double negatives</b>: <code>NOT (x &lt;&gt; 5)</code> is just <code>x = 5</code> (for non-NULL x).</li></ol>`,
    why: 'Exclusion rules ("not paid and not void", "no allergy other than...") are common and easy to get subtly wrong.',
    when: 'Whenever a filter describes what to leave out: exclusions, exceptions, "none of", "neither ... nor".',
    analogy: 'The rule "don\'t send a statement to patients who are paid up AND on Medicare" is not the same as "don\'t send to paid-up patients and don\'t send to Medicare patients". De Morgan tells you exactly how the "don\'t" spreads across the "and".',
    exampleSql: `SELECT DISTINCT status FROM invoices`,
    syntax: `NOT (A AND B)  ==  NOT A OR  NOT B\nNOT (A OR  B)  ==  NOT A AND NOT B\ncol NOT IN (...)   col NOT LIKE '...'   col NOT BETWEEN a AND b\nNOT EXISTS (subquery)`,
    sql: `SELECT invoice_id, status, total_amount\nFROM invoices\nWHERE NOT (status = 'Paid' OR status = 'Void')\n  AND total_amount NOT BETWEEN 0 AND 100\nORDER BY invoice_id;`,
    breakdown: [
      ["NOT (status = 'Paid' OR status = 'Void')", "By De Morgan, this is status <> 'Paid' AND status <> 'Void': invoices that still need work."],
      ['AND total_amount NOT BETWEEN 0 AND 100', 'Exclude small invoices (100 or less). NOT BETWEEN means < 0 OR > 100.'],
      ['ORDER BY invoice_id', 'Stable order.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 600 170" width="100%" font-family="sans-serif" font-size="13">
<text x="150" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">NOT (Paid OR Void)</text>
<rect x="30" y="35" width="240" height="100" rx="6" fill="var(--green)" opacity="0.4"/>
<circle cx="120" cy="85" r="36" fill="var(--panel2)" stroke="var(--blue)" stroke-width="2"/><circle cx="180" cy="85" r="36" fill="var(--panel2)" stroke="var(--purple)" stroke-width="2"/>
<text x="110" y="90" text-anchor="middle" fill="var(--text)">Paid</text><text x="192" y="90" text-anchor="middle" fill="var(--text)">Void</text>
<text x="150" y="155" text-anchor="middle" fill="var(--muted)">= NOT Paid AND NOT Void</text>
<text x="450" y="20" text-anchor="middle" fill="var(--text)" font-weight="bold">NOT (Paid AND Location 4)</text>
<rect x="330" y="35" width="240" height="100" rx="6" fill="var(--green)" opacity="0.4"/>
<circle cx="420" cy="85" r="36" fill="var(--green)" opacity="0.2" stroke="var(--blue)" stroke-width="2"/><circle cx="480" cy="85" r="36" fill="var(--green)" opacity="0.2" stroke="var(--purple)" stroke-width="2"/>
<path d="M450 65 A36 36 0 0 1 450 105 A36 36 0 0 1 450 65 Z" fill="var(--panel2)"/>
<text x="405" y="90" text-anchor="middle" fill="var(--text)">Paid</text><text x="497" y="90" text-anchor="middle" fill="var(--text)">Loc 4</text>
<text x="450" y="155" text-anchor="middle" fill="var(--muted)">= NOT Paid OR NOT Loc 4 (only the overlap is removed)</text>
</svg>` },
    internals: `<p>The optimizer often pushes NOT inward using De Morgan's laws and flips comparisons (<code>NOT x &gt; 5</code> → <code>x &lt;= 5</code>) so that simple, index-friendly terms remain. Negative predicates are generally poor index candidates: "everything except one value" is most of the table, so a scan is usually cheaper. NOT EXISTS is the exception, because it becomes an anti-join that can probe an index.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM invoices WHERE status <> 'Paid' OR status <> 'Void';  -- "neither Paid nor Void"`, why: "Every status differs from at least one of the two, so this OR is always true and returns all 48 invoices. 'Neither ... nor' becomes AND after De Morgan.", fix: `SELECT * FROM invoices WHERE status <> 'Paid' AND status <> 'Void';` },
      { wrong: `SELECT * FROM patients WHERE allergies NOT LIKE '%Penicillin%';  -- "patients safe for penicillin"`, why: 'Patients with NULL allergies (none recorded) are dropped, because NULL NOT LIKE ... is UNKNOWN. Decide explicitly how to treat NULL.', fix: `SELECT * FROM patients WHERE allergies NOT LIKE '%Penicillin%' OR allergies IS NULL;` },
      { wrong: `SELECT * FROM payors WHERE payor_id NOT IN (SELECT primary_payor_id FROM patients);`, why: 'patients.primary_payor_id contains NULLs, so NOT IN returns nothing. Use NOT EXISTS.', fix: `SELECT * FROM payors py WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.primary_payor_id = py.payor_id);` },
    ],
    rules: [
      'NOT (A OR B) = NOT A AND NOT B. NOT (A AND B) = NOT A OR NOT B.',
      '"Neither X nor Y" means col <> X AND col <> Y (or NOT IN (X, Y)).',
      'Negative tests drop NULLs. Add OR col IS NULL when needed.',
      'For "no related rows", use NOT EXISTS, not NOT IN.',
    ],
    compare: `<table><tr><th>Negative form</th><th>NULL column value</th><th>NULL in list/subquery</th></tr>
<tr><td>col &lt;&gt; x</td><td>row dropped</td><td>n/a</td></tr>
<tr><td>col NOT LIKE p</td><td>row dropped</td><td>n/a</td></tr>
<tr><td>col NOT BETWEEN a AND b</td><td>row dropped</td><td>n/a</td></tr>
<tr><td>col NOT IN (...)</td><td>row dropped</td><td>ALL rows dropped</td></tr>
<tr><td>NOT EXISTS (...)</td><td>works</td><td>works</td></tr></table>`,
    realWorld: 'Clinical safety filters (patients without a given allergy), exclusion lists for statements (not Void, not in collections), and "unused" master data cleanup.',
    tips: ['Rewrite a negative filter into its positive opposite and check that the two row counts add up to the total (remembering NULLs).'],
    deep: `<p>A good sanity check for any filter P: <code>COUNT(WHERE P) + COUNT(WHERE NOT P) + COUNT(WHERE P IS NULL)</code> should equal the total row count. If the third term is not zero, NULLs are affecting your logic. SQLite lets you test <code>(P) IS NULL</code> directly because boolean expressions are values.</p>`,
    tryIt: { prompt: 'Check the NULL gap: count patients where allergies LIKE \'%Penicillin%\', where NOT LIKE, and where allergies IS NULL. Do they add up to 25?', starter: `SELECT\n  (SELECT COUNT(*) FROM patients WHERE allergies LIKE '%Penicillin%')     AS has_pcn,\n  (SELECT COUNT(*) FROM patients WHERE allergies NOT LIKE '%Penicillin%') AS other_allergy,\n  (SELECT COUNT(*) FROM patients WHERE allergies IS NULL)                 AS none_recorded;` },
    challenge: {
      level: 3,
      prompt: "Find invoices that are neither 'Paid' nor 'Void' AND have no payment recorded at all. Show invoice_id, status and total_amount, sorted by invoice_id.",
      solution: `SELECT i.invoice_id, i.status, i.total_amount FROM invoices i WHERE i.status NOT IN ('Paid', 'Void') AND NOT EXISTS (SELECT 1 FROM payments pm WHERE pm.invoice_id = i.invoice_id) ORDER BY i.invoice_id;`,
      hints: ["'Neither Paid nor Void' is status NOT IN ('Paid', 'Void'), which is the same as <> 'Paid' AND <> 'Void'.", '"No payment recorded" means NOT EXISTS against the payments table.', 'Correlate with pm.invoice_id = i.invoice_id.', "SELECT i.invoice_id, i.status, i.total_amount FROM invoices i WHERE i.status NOT IN ('Paid','Void') AND NOT EXISTS (SELECT 1 FROM payments pm WHERE pm.invoice_id = i.invoice_id) ORDER BY i.invoice_id;"],
      ordered: true,
    },
    quiz: [
      { q: "NOT (status = 'Paid' OR status = 'Void') is equivalent to...", options: ["status <> 'Paid' OR status <> 'Void'", "status <> 'Paid' AND status <> 'Void'", "status = 'Paid' AND status = 'Void'", "status NOT LIKE 'Paid'"], answer: 1, why: "De Morgan: NOT (A OR B) = NOT A AND NOT B." },
      { q: "status <> 'Paid' OR status <> 'Void' returns...", options: ['Neither Paid nor Void', 'Every row with a status', 'Only Paid and Void', 'Nothing'], answer: 1, why: 'Every value differs from at least one of two different values, so the condition is always true.' },
      { q: 'Which negative form still works when the related data contains NULLs?', options: ['NOT IN', 'NOT LIKE', 'NOT EXISTS', '<>'], answer: 2, why: 'NOT EXISTS only checks whether rows exist, so it never becomes UNKNOWN.' },
    ],
  },
]);
